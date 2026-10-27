import { asArray, isPlainObject, deepClone } from '../../core/util.js';
import { CHECKPOINT_DOMAINS } from './checkpoint.js';
import { kindDef } from './kinds.js';
import { ruleMetrics, ruleOps, RULE_OPS, reachableOutcomes } from './outcome.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY, presetTuning } from './difficulty.js';
import { tableLists, tableDef, tableProblems, consequenceDef } from '../consequences/ledger.js';

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
 *     "mechanics": { "maxFumbles": 2 },     // the kind's limits and feel
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
 *     "announce": false,       // show a short result toast on success / partial
 *     "assists": { "classic": true },   // false: the player's classic bar doesn't apply here
 *     "consequences": "demo_repair",  // Prompt 11: an outcome table (data/consequences/ledger.json "tables"), or the lists themselves:
 *                                     // { success, partial, failure, retry, accept, fallback } of { id, severity }. Never per difficulty:
 *                                     // the ledger's own difficulty table scales them (docs/gameplay-overhaul/15-consequences-and-recovery.md)
 *     "difficulty": {          // per difficulty (docs/gameplay-overhaul/08-difficulty-and-accessibility.md)
 *       "deckhand": { "mechanics": { "maxFumbles": 4 } },
 *       "brutal": { "mechanics": { "maxFumbles": 1 }, "onFailure": { "costs": [...] } }
 *     }
 *   }
 *
 * Resolution, each layer winning over the one before (deterministic; see
 * ./difficulty.js): engine defaults, the difficulty preset's feel, the
 * profile then its block for the difficulty, the challenge then its block.
 * Accessibility assists come last, per attempt (ChallengeRun).
 */
const TOP_KEYS = ['profile', 'id', 'kind', 'label', 'enabled', 'failure', 'mechanics', 'intent', 'outcomes', 'score', 'grades', 'retry', 'onFailure', 'onPartial', 'keep', 'checkpoint', 'announce', 'assists', 'consequences', 'difficulty'];
export const PROFILE_KEYS = TOP_KEYS.filter((k) => !['profile', 'id', 'enabled'].includes(k));
const RETRY_KEYS = ['policy', 'maxAttempts', 'restore'];
const FAILURE_KEYS = ['mustRetry', 'continue', 'prompt', 'costs', 'consequences', 'fallback'];
/**
 * What a difficulty block may change: the stakes (limits, thresholds,
 * retries, costs, consequences). Never what the challenge is (its id, kind,
 * intent) or what a retry restores (keep, checkpoint): the objective is the
 * same on every difficulty.
 */
export const DIFFICULTY_KEYS = Object.freeze(['failure', 'mechanics', 'outcomes', 'score', 'grades', 'retry', 'onFailure', 'onPartial']);
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

/** One layer over the ones below. In "mechanics" an absolute number drops a lower layer's adjustment to it. */
function layer(acc, over, pairs = {}) {
  if (!isPlainObject(over)) return acc;
  const { mechanics, difficulty, ...rest } = over;
  const out = merge(acc, rest);
  if (isPlainObject(mechanics)) {
    const m = { ...(acc.mechanics ?? {}) };
    for (const [k, v] of Object.entries(mechanics)) {
      if (isComment(k)) continue;
      m[k] = isPlainObject(v) && isPlainObject(m[k]) ? merge(m[k], v) : deepClone(v);
      const adjust = pairs[k];
      if (adjust && !(adjust in mechanics)) delete m[adjust];
    }
    out.mechanics = m;
  }
  return out;
}

/**
 * Prompt 11: an outcome table as the steps the runner runs, one consequence
 * step per application, each list in its own event scope (so a repeated
 * callback lands once, and a retried attempt can land again):
 *   success, partial   once, after that outcome (onSuccess, onPartial)
 *   failure            when an attempt fails; undone by Try again (the checkpoint), kept if he carries on (onFailedAttempt)
 *   retry              each time he chooses Try again, and kept through every later retry (onRetry)
 *   accept             once, when he carries on after a failure (with onFailure's consequences)
 *   fallback           once, when he chooses Go back (onFallback)
 */
export function consequenceSteps(content, spec) {
  const lists = tableLists(spec, content);
  const steps = (list) => list.map((a) => ({ consequence: a.id, severity: a.severity, eventId: a.id }));
  return Object.fromEntries(Object.entries(lists).map(([o, list]) => [o, steps(list)]));
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
 * @param {object} ctx { kind, id, difficulty }  the kind the step is (repair, sashTension, sharkDuty),
 *   its default id, and the difficulty to resolve for (the player's; Captain by default)
 */
export function challengeConfig(content, spec, { kind, id = null, difficulty = DEFAULT_DIFFICULTY } = {}) {
  if (spec === undefined || spec === null || spec === false) return null;
  const raw = typeof spec === 'string' ? { profile: spec } : spec;
  if (!isPlainObject(raw)) throw new Error(`a "challenge" must be a profile id or an object, got ${JSON.stringify(spec)}`);
  const profile = raw.profile ? challengeProfile(content, raw.profile) : {};
  if (raw.profile && !profile) throw new Error(`No challenge profile "${raw.profile}" (data/challenges)`);
  const k = kindDef(kind ?? raw.kind ?? profile.kind);
  if (!k) throw new Error(`"${kind ?? raw.kind ?? profile.kind}" is not a challenge kind`);
  if (profile.kind && kind && profile.kind !== kind) throw new Error(`challenge profile "${raw.profile}" is for ${profile.kind}, not ${kind}`);
  const kindId = kind ?? raw.kind ?? profile.kind;
  const diff = DIFFICULTIES.includes(difficulty) ? difficulty : DEFAULT_DIFFICULTY;
  const pairs = k.pairs ?? {};
  // 1. engine defaults · 2. the difficulty's feel · 3. the profile · 4. the challenge (each then its difficulty block)
  let m = layer({}, k.defaults ?? {}, pairs);
  m = layer(m, { mechanics: presetTuning(content, diff, kindId) }, pairs);
  m = layer(m, profile, pairs);
  m = layer(m, profile.difficulty?.[diff], pairs);
  m = layer(m, raw, pairs);
  m = layer(m, raw.difficulty?.[diff], pairs);
  if (m.enabled === false) return null;
  const intent = m.intent ?? null;
  const outcomes = m.outcomes ?? (intent && k.intents?.[intent]) ?? {};
  const onFailure = { mustRetry: false, continue: false, prompt: true, costs: [], consequences: [], fallback: null, ...(m.onFailure ?? {}) };
  const ledger = consequenceSteps(content, m.consequences ?? null);
  return {
    id: m.id ?? id,
    kind: kindId,
    label: m.label ?? k.label,
    profile: raw.profile ?? null,
    difficulty: diff,
    failure: m.failure === true,
    mechanics: m.mechanics ?? {},
    intent,
    outcomes,
    score: m.score ?? null,
    grades: m.grades ?? null,
    retry: { policy: 'offer', maxAttempts: null, restore: true, ...(m.retry ?? {}) },
    onFailure: { ...onFailure, costs: asArray(onFailure.costs), consequences: [...asArray(onFailure.consequences), ...ledger.accept] },
    onPartial: { consequences: [...asArray(m.onPartial?.consequences), ...ledger.partial] },
    // Prompt 11: the outcome table's other lists (empty without one: the runner then behaves exactly as before).
    onSuccess: { consequences: ledger.success },
    onFailedAttempt: { consequences: ledger.failure },
    onRetry: { consequences: ledger.retry },
    onFallback: { consequences: ledger.fallback },
    consequences: typeof m.consequences === 'string' ? m.consequences : m.consequences ? 'inline' : null,
    keep: { flags: asArray(m.keep?.flags), vars: asArray(m.keep?.vars), values: asArray(m.keep?.values) },
    checkpoint: m.checkpoint === false ? false : { domains: m.checkpoint?.domains ?? CHECKPOINT_DOMAINS },
    announce: m.announce === true,
    assists: { classic: m.assists?.classic !== false },
  };
}

/**
 * The thresholds a config was resolved to, small enough for every record
 * (what a balance pass needs to reproduce an attempt).
 */
export function configRules(cfg) {
  return {
    difficulty: cfg.difficulty,
    failure: cfg.failure,
    mechanics: deepClone(cfg.mechanics),
    outcomes: deepClone(cfg.outcomes),
    retry: { ...cfg.retry },
    onFailure: { mustRetry: cfg.onFailure.mustRetry, continue: cfg.onFailure.continue, costs: cfg.onFailure.costs.length, consequences: cfg.onFailure.consequences.length, fallback: cfg.onFailure.fallback },
    onPartial: cfg.onPartial.consequences.length,
    // Prompt 11: the outcome table a run carries (its id, "inline", or null), and how many consequences each way of ending applies.
    consequences: cfg.consequences ?? null,
    ledger: Object.fromEntries(['onSuccess', 'onFailedAttempt', 'onRetry', 'onFallback'].map((k) => [k, cfg[k]?.consequences.length ?? 0])),
  };
}

/** Steps that give rather than take: never a cost. */
const GIVING = ['giveItem', 'giveGold', 'grantRewards', 'giveXp'];

/** A failure cost that isn't one: something given, or a negative amount taken. */
function costProblems(costs, content = null) {
  const out = [];
  for (const step of asArray(costs)) {
    if (!isPlainObject(step)) continue;
    for (const g of GIVING) if (g in step) out.push(`onFailure.costs: "${g}" gives something; a cost can only take (use onPartial / consequences for rewards)`);
    // Prompt 11: an advantage is never a cost.
    if ('consequence' in step && consequenceDef(content, step.consequence)?.kind === 'positive') out.push(`onFailure.costs: "${step.consequence}" is an advantage; a cost can only take`);
    if ('takeItem' in step && step.count !== undefined && !(step.count > 0)) out.push('onFailure.costs: takeItem "count" must be positive');
    if ('takeGold' in step && !(step.takeGold > 0)) out.push('onFailure.costs: takeGold must be positive');
  }
  return out;
}

/** Unknown keys in a raw spec, a profile or a difficulty block. */
function keyProblems(raw, k, where = '', kind = '') {
  const out = [];
  for (const key of Object.keys(raw.retry ?? {})) if (!isComment(key) && !RETRY_KEYS.includes(key)) out.push(`${where}unknown retry field "${key}"`);
  for (const key of Object.keys(raw.onFailure ?? {})) if (!isComment(key) && !FAILURE_KEYS.includes(key)) out.push(`${where}unknown onFailure field "${key}"`);
  for (const key of Object.keys(raw.mechanics ?? {})) if (!isComment(key) && !k.mechanics.includes(key)) out.push(`${where}${kind} has no mechanic "${key}" (has: ${k.mechanics.join(', ')})`);
  for (const key of Object.keys(raw.assists ?? {})) if (!isComment(key) && key !== 'classic') out.push(`${where}unknown assists field "${key}" (only "classic")`);
  if (raw.assists?.classic !== undefined && typeof raw.assists.classic !== 'boolean') out.push(`${where}assists.classic must be true or false`);
  return out;
}

/** The difficulty blocks of a spec or profile: known difficulties, and only the stakes. */
function difficultyBlockProblems(blocks, k, where = '', kind = '') {
  const out = [];
  if (blocks === undefined) return out;
  if (!isPlainObject(blocks)) return [`${where}"difficulty" must be an object of { ${DIFFICULTIES.join(' | ')}: { ... } }`];
  for (const [d, block] of Object.entries(blocks)) {
    if (isComment(d)) continue;
    if (!DIFFICULTIES.includes(d)) {
      out.push(`${where}unknown difficulty "${d}" (use: ${DIFFICULTIES.join(', ')})`);
      continue;
    }
    if (!isPlainObject(block)) {
      out.push(`${where}difficulty.${d} must be an object`);
      continue;
    }
    for (const key of Object.keys(block)) {
      if (isComment(key)) continue;
      if (key === 'consequences') out.push(`${where}difficulty.${d} can't change "consequences": the ledger's own difficulty table scales them (never twice)`);
      else if (!DIFFICULTY_KEYS.includes(key)) out.push(`${where}difficulty.${d} can't change "${key}" (a difficulty changes only the stakes: ${DIFFICULTY_KEYS.join(', ')}; the objective stays the same)`);
    }
    out.push(...keyProblems(block, k, `${where}difficulty.${d}: `, kind));
  }
  return out;
}

/** Everything wrong with one resolved config (one difficulty). */
function resolvedProblems(cfg, k, step, content = null) {
  const out = [];
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
  if (limited && !(Number.isInteger(cfg.retry.maxAttempts) && cfg.retry.maxAttempts >= 1)) out.push('retry.maxAttempts must be a whole number, 1 or more (or null for unlimited)');
  if (cfg.failure) {
    if (!cfg.outcomes.failure) out.push('failure is enabled but there is no outcomes.failure rule');
    // The softlock rules: after any failure there must be a way forward.
    if (f.mustRetry && f.continue) out.push('onFailure: "mustRetry" and "continue" contradict each other');
    if (f.mustRetry && limited) out.push('onFailure.mustRetry needs unlimited attempts (retry.maxAttempts null): a must-win challenge with a limit could end the campaign');
    if (f.mustRetry && cfg.retry.policy === 'none') out.push('onFailure.mustRetry needs retries');
    if (!f.mustRetry && !f.continue && (limited || cfg.retry.policy === 'none')) out.push('when attempts can run out, onFailure.continue must be true (or the story has no way forward)');
    if (cfg.retry.restore && cfg.checkpoint === false) out.push('retry.restore needs a checkpoint ("checkpoint": false turns it off)');
    out.push(...costProblems(f.costs, content));
  }
  if (k.problems) out.push(...k.problems(cfg.mechanics, step));
  // Every outcome the rules name must be one an attempt can really end in.
  if (k.endings && !out.length) {
    const supported = ['success', 'partial', 'failure'].filter((o) => cfg.failure || o !== 'failure');
    const reach = reachableOutcomes(cfg.outcomes, k.endings(cfg, step), supported);
    if (!reach.outcomes.has('success')) out.push('no attempt can end in success: the rules (or this difficulty\'s limits) leave no way to win');
    if (cfg.outcomes.partial && !reach.rules.has('partial')) out.push('outcomes.partial can never be reached (its threshold lies outside what an attempt can do, or an earlier rule always holds first)');
    if (cfg.failure && !reach.outcomes.has('failure')) out.push(`failure is enabled, but nothing can end an attempt as a failure (give it a limit: ${k.limits.join(', ')})`);
    if (reach.outcomes.has('unsupported')) out.push('a rule asks for an outcome this challenge can\'t produce (failure is off, so it would be reported as unsupported)');
  }
  return out;
}

/**
 * Everything wrong with a raw spec or a profile, as messages, on every
 * difficulty: each one must resolve to a challenge that can be won and that
 * never leaves the story without a way forward. A problem on only some
 * difficulties is prefixed with them ("[brutal] ...").
 */
export function challengeProblems(content, spec, { kind = null, step = {} } = {}) {
  const out = [];
  let base;
  try {
    base = challengeConfig(content, spec, { kind, id: 'check' });
  } catch (err) {
    return [err.message];
  }
  if (!base) return out;
  const raw = typeof spec === 'string' ? {} : spec;
  const k = kindDef(base.kind);
  for (const key of Object.keys(raw)) if (!isComment(key) && !TOP_KEYS.includes(key)) out.push(`unknown challenge field "${key}"`);
  out.push(...specKeyProblems(raw, base.kind));
  out.push(...consequenceSpecProblems(content, raw.consequences));
  if (!base.failure && (raw.onFailure || raw.retry) && !Object.values(raw.difficulty ?? {}).some((b) => b?.failure === true)) {
    out.push('onFailure / retry are set but failure is not enabled ("failure": true)');
  }
  // Every difficulty resolves on its own.
  const byMessage = new Map();
  for (const d of DIFFICULTIES) {
    let cfg;
    try {
      cfg = challengeConfig(content, spec, { kind, id: 'check', difficulty: d });
    } catch (err) {
      out.push(`[${d}] ${err.message}`);
      continue;
    }
    if (!cfg) continue;
    for (const msg of new Set(resolvedProblems(cfg, k, step, content))) {
      if (!byMessage.has(msg)) byMessage.set(msg, []);
      byMessage.get(msg).push(d);
    }
  }
  for (const [msg, ds] of byMessage) out.push(ds.length === DIFFICULTIES.length ? msg : `[${ds.join(', ')}] ${msg}`);
  return out;
}

/** Prompt 11: a challenge's "consequences": a known outcome table, or valid lists of known consequences. */
export function consequenceSpecProblems(content, spec) {
  if (spec === undefined || spec === null) return [];
  if (typeof spec === 'string') return tableDef(content, spec) ? [] : [`consequences: unknown outcome table "${spec}" (data/consequences/ledger.json tables)`];
  if (!isPlainObject(spec)) return ['consequences: an outcome table id, or { success, partial, failure, retry, accept, fallback } lists'];
  return tableProblems(content, spec, 'consequences');
}

/**
 * Unknown or misplaced keys in a spec or a profile (its retry, onFailure,
 * mechanics and assists, and its difficulty blocks). The profile loop in
 * validateContent runs this once per profile; challengeProblems on each spec.
 */
export function specKeyProblems(raw, kind) {
  const k = kindDef(kind);
  if (!k || !isPlainObject(raw)) return [];
  return [...keyProblems(raw, k, '', kind), ...difficultyBlockProblems(raw.difficulty, k, '', kind)];
}
