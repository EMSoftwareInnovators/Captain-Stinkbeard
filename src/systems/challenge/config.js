import { asArray, isPlainObject, deepClone } from '../../core/util.js';
import { CHECKPOINT_DOMAINS } from './checkpoint.js';
import { kindDef } from './kinds.js';
import { ruleMetrics, ruleOps, RULE_OPS } from './outcome.js';

/**
 * A challenge's configuration (docs/gameplay-overhaul/07-challenge-outcomes.md):
 * how a step that opted in is judged, retried and followed up. A step opts
 * in with "challenge": a profile id from data/challenges, or an object (with
 * an optional "profile" to start from). A step without it is legacy and
 * never gets a config.
 *
 *   {
 *     "profile": "repair_strict",           // start from a shared profile
 *     "id": "p99_patch_breach",             // stable id (records, seeds); defaults to the script and step
 *     "failure": true,                      // real failure enabled (false: graded, can't fail)
 *     "mechanics": { "maxFumbles": 2 },     // the kind's difficulty settings
 *     "intent": "complete",                 // the sash tension: complete | sabotage
 *     "outcomes": { "failure": {...}, "success": {...}, "partial": {...}, "fallback": "partial" },
 *     "score": "accuracy", "grades": [{ "min": 100, "grade": "A" }, ...],
 *     "retry": { "policy": "offer" | "auto" | "none", "maxAttempts": null, "restore": true },
 *     "onFailure": {
 *       "mustRetry": false,     // the story can't go on until it's won (no "continue")
 *       "continue": false,      // offer "carry on" with the consequences below
 *       "prompt": true,         // false: decide without asking (auto retry, or carry on)
 *       "costs": [steps],       // paid on every failure, and NOT undone by a retry
 *       "consequences": [steps],// run when the captain carries on after a failure
 *       "fallback": "name"      // offer going back to an earlier sequence checkpoint
 *     },
 *     "onPartial": { "consequences": [steps] },
 *     "keep": { "flags": [], "vars": [], "values": [] },   // survives a restore
 *     "checkpoint": true,      // false: retries don't restore anything
 *     "announce": false        // show a short result toast on success / partial
 *   }
 */
const TOP_KEYS = ['profile', 'id', 'kind', 'label', 'enabled', 'failure', 'mechanics', 'intent', 'outcomes', 'score', 'grades', 'retry', 'onFailure', 'onPartial', 'keep', 'checkpoint', 'announce'];
const RETRY_KEYS = ['policy', 'maxAttempts', 'restore'];
const FAILURE_KEYS = ['mustRetry', 'continue', 'prompt', 'costs', 'consequences', 'fallback'];
export const RETRY_POLICIES = Object.freeze(['offer', 'auto', 'none']);

const isComment = (k) => k.startsWith('//') || k.startsWith('_');

function merge(base, over) {
  if (!isPlainObject(base) || !isPlainObject(over)) return over === undefined ? deepClone(base) : deepClone(over);
  const out = deepClone(base);
  for (const [k, v] of Object.entries(over)) {
    if (isComment(k)) continue;
    // Rules replace each other whole (merging two "success" rules would mean neither).
    out[k] = k === 'outcomes' || !isPlainObject(v) ? deepClone(v) : merge(out[k], v);
  }
  return out;
}

/** The profile a spec names, if any (data/challenges). */
export function challengeProfile(content, id) {
  return content?.challenges?.get?.(id) ?? null;
}

/**
 * The full config for a step's "challenge" spec, or null when the step is
 * legacy (no spec, or "enabled": false).
 * @param {object} content
 * @param {string|object|null|undefined} spec
 * @param {object} ctx { kind, id }  the kind the step is (repair, sashTension, sharkDuty) and its default id
 */
export function challengeConfig(content, spec, { kind, id = null } = {}) {
  if (spec === undefined || spec === null || spec === false) return null;
  const raw = typeof spec === 'string' ? { profile: spec } : spec;
  if (!isPlainObject(raw)) throw new Error(`a "challenge" must be a profile id or an object, got ${JSON.stringify(spec)}`);
  const profile = raw.profile ? challengeProfile(content, raw.profile) : {};
  if (raw.profile && !profile) throw new Error(`No challenge profile "${raw.profile}" (data/challenges)`);
  const k = kindDef(kind ?? raw.kind ?? profile.kind);
  if (!k) throw new Error(`"${kind ?? raw.kind ?? profile.kind}" is not a challenge kind`);
  if (profile.kind && kind && profile.kind !== kind) throw new Error(`challenge profile "${raw.profile}" is for ${profile.kind}, not ${kind}`);
  const m = merge(merge(k.defaults ?? {}, profile), raw);
  if (m.enabled === false) return null;
  const intent = m.intent ?? null;
  const outcomes = m.outcomes ?? (intent && k.intents?.[intent]) ?? {};
  const onFailure = { mustRetry: false, continue: false, prompt: true, costs: [], consequences: [], fallback: null, ...(m.onFailure ?? {}) };
  return {
    id: m.id ?? id,
    kind: kind ?? m.kind,
    label: m.label ?? k.label,
    profile: raw.profile ?? null,
    failure: m.failure === true,
    mechanics: m.mechanics ?? {},
    intent,
    outcomes,
    score: m.score ?? null,
    grades: m.grades ?? null,
    retry: { policy: 'offer', maxAttempts: null, restore: true, ...(m.retry ?? {}) },
    onFailure: { ...onFailure, costs: asArray(onFailure.costs), consequences: asArray(onFailure.consequences) },
    onPartial: { consequences: asArray(m.onPartial?.consequences) },
    keep: { flags: asArray(m.keep?.flags), vars: asArray(m.keep?.vars), values: asArray(m.keep?.values) },
    checkpoint: m.checkpoint === false ? false : { domains: m.checkpoint?.domains ?? CHECKPOINT_DOMAINS },
    announce: m.announce === true,
  };
}

/**
 * Everything wrong with a raw spec or a profile, as messages. Most of these
 * protect the campaign: a challenge that could leave the story with no way
 * forward is rejected before it ever runs.
 */
export function challengeProblems(content, spec, { kind = null, step = {} } = {}) {
  const out = [];
  let cfg;
  try {
    cfg = challengeConfig(content, spec, { kind, id: 'check' });
  } catch (err) {
    return [err.message];
  }
  if (!cfg) return out;
  const raw = typeof spec === 'string' ? {} : spec;
  for (const key of Object.keys(raw)) if (!isComment(key) && !TOP_KEYS.includes(key)) out.push(`unknown challenge field "${key}"`);
  for (const key of Object.keys(raw.retry ?? {})) if (!isComment(key) && !RETRY_KEYS.includes(key)) out.push(`unknown retry field "${key}"`);
  for (const key of Object.keys(raw.onFailure ?? {})) if (!isComment(key) && !FAILURE_KEYS.includes(key)) out.push(`unknown onFailure field "${key}"`);
  const k = kindDef(cfg.kind);
  for (const key of Object.keys(cfg.mechanics)) if (!isComment(key) && !k.mechanics.includes(key)) out.push(`${cfg.kind} has no mechanic "${key}" (has: ${k.mechanics.join(', ')})`);
  if (cfg.intent && !k.intents?.[cfg.intent]) out.push(`${cfg.kind} has no intent "${cfg.intent}"`);
  for (const [name, rule] of Object.entries(cfg.outcomes)) {
    if (name === 'fallback') {
      if (!['success', 'partial', 'failure'].includes(rule)) out.push(`outcomes.fallback must be success, partial or failure (got "${rule}")`);
      continue;
    }
    if (isComment(name)) continue;
    if (!['success', 'partial', 'failure'].includes(name)) {
      out.push(`unknown outcome "${name}"`);
      continue;
    }
    for (const metric of ruleMetrics(rule)) if (!k.metrics.includes(metric)) out.push(`outcomes.${name} reads "${metric}", which ${cfg.kind} doesn't measure (it measures: ${k.metrics.join(', ')})`);
    for (const op of ruleOps(rule)) if (!RULE_OPS.includes(op)) out.push(`outcomes.${name}: unknown comparison "${op}" (use: ${RULE_OPS.join(', ')})`);
  }
  if (cfg.score && !k.metrics.includes(cfg.score)) out.push(`score "${cfg.score}" is not a ${cfg.kind} metric`);
  if (!RETRY_POLICIES.includes(cfg.retry.policy)) out.push(`retry.policy must be one of ${RETRY_POLICIES.join(', ')}`);
  const f = cfg.onFailure;
  const limited = cfg.retry.maxAttempts !== null && cfg.retry.maxAttempts !== undefined;
  if (limited && !(cfg.retry.maxAttempts >= 1)) out.push('retry.maxAttempts must be 1 or more (or null for unlimited)');
  if (cfg.failure) {
    if (!cfg.outcomes.failure) out.push('failure is enabled but there is no outcomes.failure rule');
    // The softlock rules: after any failure there must be a way forward.
    if (f.mustRetry && f.continue) out.push('onFailure: "mustRetry" and "continue" contradict each other');
    if (f.mustRetry && limited) out.push('onFailure.mustRetry needs unlimited attempts (retry.maxAttempts null): a must-win challenge with a limit could end the campaign');
    if (f.mustRetry && cfg.retry.policy === 'none') out.push('onFailure.mustRetry needs retries');
    if (!f.mustRetry && !f.continue && (limited || cfg.retry.policy === 'none')) out.push('when attempts can run out, onFailure.continue must be true (or the story has no way forward)');
    if (cfg.retry.restore && cfg.checkpoint === false) out.push('retry.restore needs a checkpoint ("checkpoint": false turns it off)');
  } else if (spec && typeof spec === 'object' && (spec.onFailure || spec.retry)) {
    out.push('onFailure / retry are set but failure is not enabled ("failure": true)');
  }
  if (k.problems) out.push(...k.problems(cfg.mechanics, step));
  return out;
}
