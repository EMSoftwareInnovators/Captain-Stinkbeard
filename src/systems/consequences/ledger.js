import { asArray, isPlainObject } from '../../core/util.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from '../challenge/difficulty.js';

/**
 * The consequence ledger's data (overhaul Prompt 11,
 * docs/gameplay-overhaul/15-consequences-and-recovery.md): the definitions
 * in data/consequences/ledger.json, the difficulty's consequence tuning
 * (data/difficulty/presets.json, each preset's "consequences"), the math
 * that turns a severity level into modifiers, and the data's validation.
 * Pure: reads content, changes nothing. The state is ConsequenceLedger.js.
 */

export const CATEGORIES = Object.freeze(['condition', 'preparation', 'shipboard', 'resources', 'crew', 'tactical', 'narrative']);
export const KINDS = Object.freeze(['negative', 'positive', 'narrative']);
/**
 * What applying a consequence that is already held does:
 *   none     nothing (the repeat is noted, the entry stays as it is)
 *   refresh  its clocks start again (duration, uses); the level stays
 *   replace  a greater severity takes over (and its clocks start again)
 *   add      the severities add up, to its cap (and its clocks start again)
 *   reject   refused while held
 */
export const STACKING = Object.freeze(['none', 'refresh', 'replace', 'add', 'reject']);
/** Once it has ended: may it happen again (fresh), never again (once), or come back a level worse (escalate)? */
export const RECUR = Object.freeze(['fresh', 'once', 'escalate']);
export const VISIBILITY = Object.freeze(['shown', 'hidden']);
/** What a recovery method does to what it recovers: ends it (recover), or eases it a level (contain). */
export const RESULTS = Object.freeze(['recover', 'contain']);
/** How a method is carried out: resting in a room, eating a meal, work and a bill in a room (maintenance, preparation). */
export const METHOD_KINDS = Object.freeze(['rest', 'provision', 'maintain', 'prepare']);
/** The clocks a script can mark (consequenceMilestone). */
export const MILESTONES = Object.freeze(['chapter']);

/**
 * What a severity level may change, through the systems that already
 * resolve it (one place each):
 *   zone      pixels of a ship bar's green (the captain's condition layer, src/systems/ship/supplyResponse.js barCondition)
 *   work      seconds of work (captainFactors, src/systems/ship/airResponse.js)
 *   repair    integrity a ship repair restores (repairPlan's efficiency)
 *   response  water one pump or bail shifts (hazardAction)
 *   costAdd   extra of a ship repair's main material (repairPlan's bill)
 * "add" ones sum, "mul" ones multiply. `worse` is the direction a penalty
 * points; `capability` is what it impairs (a recovery must not need it).
 */
export const MODIFIERS = Object.freeze({
  zone: { kind: 'add', worse: -1, capability: 'timing', label: 'green' },
  work: { kind: 'mul', worse: 1, capability: 'work', label: 'work' },
  repair: { kind: 'mul', worse: -1, capability: 'repair', label: 'repairs' },
  response: { kind: 'mul', worse: -1, capability: 'pumping', label: 'pumping' },
  costAdd: { kind: 'add', worse: 1, capability: 'materials', label: 'materials' },
});
export const MODIFIER_KEYS = Object.freeze(Object.keys(MODIFIERS));
/** The neutral value of each modifier (no effect). */
export const NEUTRAL = Object.freeze({ zone: 0, work: 1, repair: 1, response: 1, costAdd: 0 });

/** What each method kind needs of the captain (a recovery must not need what its consequence impairs). */
export const METHOD_NEEDS = Object.freeze({ rest: [], provision: [], maintain: ['work'], prepare: ['work'] });

/**
 * The difficulty's hold on consequences, in exactly two places
 * (docs/gameplay-overhaul/15-consequences-and-recovery.md, "Difficulty"):
 *   strength, duration, cap  read once when a negative consequence is created and kept
 *                            in its entry: how far its modifiers go from no effect, how
 *                            long it lasts, and its highest severity (max + cap)
 *   actionCost, actionTime   read when a recovery or preparation is offered: its bill
 *                            (rounded up) and its seconds
 * Positive and narrative consequences are the same on every difficulty.
 */
export const CONSEQUENCE_TUNING = Object.freeze({
  strength: [0.5, 1.5],
  duration: [0.5, 2],
  cap: [-1, 1],
  actionCost: [0.5, 2],
  actionTime: [0.5, 2],
});
export const CONSEQUENCE_TUNING_DEFAULTS = Object.freeze({ strength: 1, duration: 1, cap: 0, actionCost: 1, actionTime: 1 });

/** The bounds a definition's numbers are held to when the data leaves them out. */
export const LIMIT_DEFAULTS = Object.freeze({
  zone: [-6, 4],
  work: [0.85, 1.5],
  repair: [0.75, 1.15],
  response: [0.6, 1.15],
  costAdd: [-1, 2],
  condition: [-6, 6],
  seconds: 1200,
  milestones: 5,
  uses: 3,
  levels: 3,
  history: 24,
  events: 128,
});

const isComment = (k) => typeof k === 'string' && (k.startsWith('//') || k.startsWith('_'));
const ids = (obj) => Object.keys(isPlainObject(obj) ? obj : {}).filter((k) => !isComment(k));

export function ledgerData(content) {
  return isPlainObject(content?.consequences) ? content.consequences : null;
}

export function consequenceDef(content, id) {
  const def = ledgerData(content)?.definitions?.[id];
  return typeof id === 'string' && !isComment(id) && isPlainObject(def) ? def : null;
}

export function consequenceIds(content) {
  return ids(ledgerData(content)?.definitions);
}

export function methodDef(content, id) {
  const def = ledgerData(content)?.methods?.[id];
  return typeof id === 'string' && !isComment(id) && isPlainObject(def) ? def : null;
}

export function methodIds(content) {
  return ids(ledgerData(content)?.methods);
}

export function tableDef(content, id) {
  const def = ledgerData(content)?.tables?.[id];
  return typeof id === 'string' && !isComment(id) && isPlainObject(def) ? def : null;
}

export function tableIds(content) {
  return ids(ledgerData(content)?.tables);
}

export function categoryDef(content, id) {
  return ledgerData(content)?.categories?.[id] ?? null;
}

/** The ledger's bounds: the data's over the defaults. */
export function ledgerLimits(content) {
  const lim = ledgerData(content)?.limits;
  return { ...LIMIT_DEFAULTS, ...(isPlainObject(lim) ? lim : {}) };
}

/** A difficulty's consequence tuning (the preset's "consequences" block over the defaults, each within its bounds). */
export function consequenceTuning(content, difficulty = DEFAULT_DIFFICULTY) {
  const preset = content?.difficulties?.get?.(difficulty) ?? null;
  const t = isPlainObject(preset?.consequences) ? preset.consequences : {};
  const out = { ...CONSEQUENCE_TUNING_DEFAULTS };
  for (const [k, [min, max]] of Object.entries(CONSEQUENCE_TUNING)) if (Number.isFinite(t[k])) out[k] = Math.max(min, Math.min(max, k === 'cap' ? Math.round(t[k]) : t[k]));
  return out;
}

/** The highest level a consequence reaches on a difficulty: its max, moved by the difficulty's cap (negatives only), within its levels. */
export function capFor(def, tuning = CONSEQUENCE_TUNING_DEFAULTS) {
  const levels = asArray(def?.levels).length || 1;
  const shift = def?.kind === 'negative' ? tuning.cap ?? 0 : 0;
  return Math.max(1, Math.min(levels, (def?.max ?? 1) + shift));
}

/** The strength a new entry keeps: the difficulty's for a negative, 1 otherwise. */
export function strengthFor(def, tuning = CONSEQUENCE_TUNING_DEFAULTS) {
  return def?.kind === 'negative' ? tuning.strength ?? 1 : 1;
}

/** Seconds a new entry lasts on the hazard clock (null: no clock), the difficulty's duration for a negative. */
export function secondsFor(def, tuning = CONSEQUENCE_TUNING_DEFAULTS, limits = LIMIT_DEFAULTS) {
  const s = def?.expires?.seconds;
  if (!Number.isFinite(s)) return null;
  const scale = def.kind === 'negative' ? tuning.duration ?? 1 : 1;
  return Math.max(1, Math.min(limits.seconds, Math.round(s * scale)));
}

const round2 = (x) => Math.round(x * 100) / 100;

/**
 * The modifiers one level gives at a strength: each one's distance from no
 * effect times the strength (rounded: whole pixels and materials, hundredths
 * for multipliers). A level of 0 (contained) gives nothing.
 */
export function levelModifiers(def, level, strength = 1) {
  const out = {};
  if (!(level >= 1)) return out;
  const row = asArray(def?.levels)[Math.min(level, asArray(def?.levels).length) - 1];
  if (!isPlainObject(row)) return out;
  for (const key of MODIFIER_KEYS) {
    const v = row[key];
    if (!Number.isFinite(v)) continue;
    if (MODIFIERS[key].kind === 'add') {
      const n = v * strength;
      // A penalty or a bonus never rounds away to nothing.
      out[key] = n === 0 ? 0 : Math.sign(n) * Math.max(1, Math.round(Math.abs(n)));
    } else {
      out[key] = round2(1 + (v - 1) * strength);
    }
  }
  return out;
}

/** One level's modifiers as they act alone: within the ledger's limits, only those that change something (what the Journal and the report show). */
export function boundedModifiers(def, level, strength = 1, limits = LIMIT_DEFAULTS) {
  const all = combineModifiers([levelModifiers(def, level, strength)], limits);
  return Object.fromEntries(Object.entries(all).filter(([k, v]) => v !== NEUTRAL[k]));
}

/** Combines several entries' modifiers within the limits: sums for "add", products for "mul". */
export function combineModifiers(list, limits = LIMIT_DEFAULTS) {
  const out = { ...NEUTRAL };
  for (const m of list) {
    for (const [key, v] of Object.entries(m)) {
      if (!(key in MODIFIERS)) continue;
      out[key] = MODIFIERS[key].kind === 'add' ? out[key] + v : out[key] * v;
    }
  }
  for (const key of MODIFIER_KEYS) {
    const [lo, hi] = limits[key] ?? [-Infinity, Infinity];
    out[key] = Math.max(lo, Math.min(hi, MODIFIERS[key].kind === 'add' ? out[key] : round2(out[key])));
  }
  return out;
}

/** A recovery's or preparation's bill on a difficulty (each count scaled and rounded up, at least 1). */
export function methodBill(content, methodId, tuning = CONSEQUENCE_TUNING_DEFAULTS) {
  const m = methodDef(content, methodId);
  return asArray(m?.cost).map((c) => ({ item: c.item, count: Math.max(1, Math.ceil((c.count ?? 1) * (tuning.actionCost ?? 1) - 1e-9)) }));
}

/** A method's base seconds for a level (before water and the captain's condition, for work), on a difficulty. */
export function methodSeconds(content, methodId, level = 1, tuning = CONSEQUENCE_TUNING_DEFAULTS) {
  const m = methodDef(content, methodId);
  if (!m || !Number.isFinite(m.seconds)) return 0;
  return Math.max(1, Math.round((m.seconds + (m.perLevel ?? 0) * Math.max(0, level - 1)) * (tuning.actionTime ?? 1)));
}

/** The recovery methods of a definition that end it or ease it, as [{ method, result, def }]. */
export function recoveriesOf(content, id) {
  return asArray(consequenceDef(content, id)?.recovery).map((r) => ({ method: r.method, result: r.result ?? 'recover', def: methodDef(content, r.method) })).filter((r) => r.def);
}

/** The definitions a method acts on: [{ id, result }] (recoveries), or the positives it earns (preparation). */
export function methodTargets(content, methodId) {
  const out = [];
  for (const id of consequenceIds(content)) {
    const def = consequenceDef(content, id);
    for (const r of asArray(def.recovery)) if (r.method === methodId) out.push({ id, result: r.result ?? 'recover' });
    for (const e of asArray(def.earn)) if (e.method === methodId) out.push({ id, result: 'earn' });
  }
  return out;
}

/** An outcome table's lists, normalised: { success, partial, failure, retry, accept, fallback } of [{ id, severity }]. */
export const TABLE_OUTCOMES = Object.freeze(['success', 'partial', 'failure', 'retry', 'accept', 'fallback']);

export function tableLists(spec, content) {
  const t = typeof spec === 'string' ? tableDef(content, spec) : isPlainObject(spec) ? spec : null;
  const out = {};
  for (const o of TABLE_OUTCOMES) out[o] = asArray(t?.[o]).filter(isPlainObject).map((a) => ({ id: a.id, severity: a.severity ?? 1 }));
  return out;
}

// --- validation ------------------------------------------------------------

const num = (v) => typeof v === 'number' && Number.isFinite(v);

/** Problems in one application ({ id, severity }) of a table or a step. */
export function applicationProblems(content, a, at) {
  const out = [];
  const def = consequenceDef(content, a?.id);
  if (!def) return [`${at}: unknown consequence "${a?.id}"`];
  const levels = asArray(def.levels).length;
  if (a.severity !== undefined && !(Number.isInteger(a.severity) && a.severity >= 1 && a.severity <= levels)) out.push(`${at}: "${a.id}" severity must be a whole number 1 to ${levels}`);
  for (const k of Object.keys(a)) if (!isComment(k) && !['id', 'severity'].includes(k)) out.push(`${at}: unknown field "${k}"`);
  return out;
}

/** Problems in one outcome table (data or a challenge's own "consequences"). */
export function tableProblems(content, t, at) {
  const out = [];
  if (!isPlainObject(t)) return [`${at}: an outcome table is { success, partial, failure, retry, accept, fallback } lists`];
  for (const k of Object.keys(t)) if (!isComment(k) && ![...TABLE_OUTCOMES, 'label', 'debugOnly'].includes(k)) out.push(`${at}: unknown outcome "${k}" (use: ${TABLE_OUTCOMES.join(', ')})`);
  for (const o of TABLE_OUTCOMES) {
    if (t[o] === undefined) continue;
    if (!Array.isArray(t[o])) {
      out.push(`${at}.${o}: a list of { id, severity }`);
      continue;
    }
    const seen = new Set();
    t[o].forEach((a, i) => {
      out.push(...applicationProblems(content, a, `${at}.${o}[${i}]`));
      if (seen.has(a?.id)) out.push(`${at}.${o}: "${a?.id}" twice (one application per consequence and outcome)`);
      seen.add(a?.id);
      const def = consequenceDef(content, a?.id);
      // What a failure or a retry leaves (charged again and again) can only take: an advantage belongs to success.
      if (def?.kind === 'positive' && ['failure', 'retry', 'accept'].includes(o)) out.push(`${at}.${o}: "${a.id}" is an advantage; a failure can't earn one`);
    });
  }
  if (t.debugOnly !== undefined && typeof t.debugOnly !== 'boolean') out.push(`${at}: debugOnly must be true or false`);
  return out;
}

function boundProblems(key, value, limits, at) {
  const [lo, hi] = limits[key] ?? [-Infinity, Infinity];
  return value < lo || value > hi ? [`${at}: ${key} ${value} is outside its bounds (${lo} to ${hi})`] : [];
}

/** Problems in one definition. */
function definitionProblems(content, id, def, limits) {
  const at = `data/consequences/ledger.json (definitions.${id})`;
  const out = [];
  const known = ['title', 'short', 'category', 'kind', 'description', 'effect', 'visibility', 'levels', 'max', 'stacking', 'expires', 'recur', 'opposes', 'recovery', 'earn', 'affectsChallenges', 'permanent'];
  for (const k of Object.keys(def)) if (!isComment(k) && !known.includes(k)) out.push(`${at}: unknown field "${k}"`);
  for (const k of ['title', 'short', 'description', 'effect']) if (typeof def[k] !== 'string' || !def[k]) out.push(`${at}: needs "${k}"`);
  if (typeof def.short === 'string' && def.short.length > 8) out.push(`${at}: "short" is a tag of 8 letters at most`);
  if (!CATEGORIES.includes(def.category) || !ledgerData(content)?.categories?.[def.category]) out.push(`${at}: unknown category "${def.category}" (use: ${CATEGORIES.join(', ')})`);
  if (!KINDS.includes(def.kind)) out.push(`${at}: kind must be one of ${KINDS.join(', ')}`);
  if (!VISIBILITY.includes(def.visibility ?? 'shown')) out.push(`${at}: visibility must be shown or hidden`);
  if (!STACKING.includes(def.stacking)) out.push(`${at}: stacking must be one of ${STACKING.join(', ')}`);
  if (!RECUR.includes(def.recur ?? 'fresh')) out.push(`${at}: recur must be one of ${RECUR.join(', ')}`);

  // Levels and their modifiers: each within its bounds, pointing the way its kind says.
  const levels = asArray(def.levels);
  if (!levels.length || levels.length > limits.levels) out.push(`${at}: 1 to ${limits.levels} severity levels`);
  let mechanical = false;
  levels.forEach((row, i) => {
    const la = `${at}: levels[${i}]`;
    if (!isPlainObject(row)) return out.push(`${la} must be { label, ...modifiers }`);
    if (typeof row.label !== 'string' || !row.label) out.push(`${la} needs a label`);
    for (const k of Object.keys(row)) if (!isComment(k) && k !== 'label' && !MODIFIER_KEYS.includes(k)) out.push(`${la}: unsupported effect "${k}" (use: ${MODIFIER_KEYS.join(', ')})`);
    for (const key of MODIFIER_KEYS) {
      if (row[key] === undefined) continue;
      const v = row[key];
      if (!num(v)) {
        out.push(`${la}: ${key} must be a number`);
        continue;
      }
      if (MODIFIERS[key].kind === 'add' && !Number.isInteger(v)) out.push(`${la}: ${key} is a whole number`);
      if (v === NEUTRAL[key]) out.push(`${la}: ${key} ${v} changes nothing (leave it out)`);
      mechanical = true;
      const dir = Math.sign(v - NEUTRAL[key]) === MODIFIERS[key].worse ? 'negative' : 'positive';
      if (def.kind === 'narrative') out.push(`${la}: a narrative consequence has no modifiers ("${key}")`);
      else if (dir !== def.kind) out.push(`${la}: ${key} ${v} is a ${dir === 'negative' ? 'penalty' : 'bonus'}, but "${id}" is ${def.kind}`);
      // Each level within the ledger's bounds (the combined total is held to them too, whatever the difficulty).
      out.push(...boundProblems(key, v, limits, la));
    }
    // A worse level never has a smaller effect than the one before it.
    if (i > 0 && isPlainObject(levels[i - 1])) {
      for (const key of MODIFIER_KEYS) {
        const a = levels[i - 1][key] ?? NEUTRAL[key];
        const b = row[key] ?? NEUTRAL[key];
        if (Math.abs(b - NEUTRAL[key]) < Math.abs(a - NEUTRAL[key])) out.push(`${la}: ${key} is milder than the level before it`);
      }
    }
  });
  if (!(Number.isInteger(def.max) && def.max >= 1 && def.max <= levels.length)) out.push(`${at}: max must be a level it has (1 to ${levels.length})`);
  const affects = levels.some((r) => isPlainObject(r) && r.zone !== undefined);
  if (typeof def.affectsChallenges !== 'boolean') out.push(`${at}: affectsChallenges must be true or false`);
  else if (def.affectsChallenges !== affects) out.push(`${at}: affectsChallenges must be ${affects} (${affects ? 'it changes a ship bar\'s green' : 'it has no zone modifier'})`);

  // Stacking that contradicts the levels.
  if (def.stacking === 'add' && (def.max ?? 1) <= 1 && levels.length <= 1) out.push(`${at}: stacking "add" with one level can never add (use refresh, none or reject)`);
  if (def.stacking === 'replace' && levels.length <= 1) out.push(`${at}: stacking "replace" needs more than one level to replace with`);
  if (def.stacking === 'refresh' && !def.expires) out.push(`${at}: stacking "refresh" has no clock to start again (it never expires)`);
  if (def.kind === 'positive' && def.stacking === 'add') out.push(`${at}: an advantage never adds up (use refresh, none or reject)`);

  // Clocks.
  const ex = def.expires;
  if (ex !== undefined) {
    if (!isPlainObject(ex)) out.push(`${at}: expires is { seconds, milestones, uses }`);
    else {
      for (const k of Object.keys(ex)) if (!isComment(k) && !['seconds', 'milestones', 'uses'].includes(k)) out.push(`${at}: expires.${k}? (use seconds, milestones, uses)`);
      if (ex.seconds !== undefined && !(Number.isInteger(ex.seconds) && ex.seconds >= 1 && ex.seconds <= limits.seconds)) out.push(`${at}: expires.seconds must be a whole number 1 to ${limits.seconds}`);
      if (ex.milestones !== undefined && !(Number.isInteger(ex.milestones) && ex.milestones >= 1 && ex.milestones <= limits.milestones)) out.push(`${at}: expires.milestones must be 1 to ${limits.milestones}`);
      if (ex.uses !== undefined && !(Number.isInteger(ex.uses) && ex.uses >= 1 && ex.uses <= limits.uses)) out.push(`${at}: expires.uses must be 1 to ${limits.uses}`);
      if (ex.uses !== undefined && def.kind !== 'positive') out.push(`${at}: only an advantage is used up (expires.uses)`);
      if (ex.uses !== undefined && !levels.some((r) => isPlainObject(r) && r.zone !== undefined)) out.push(`${at}: expires.uses counts ship bars helped: it needs a zone bonus`);
    }
  }
  const ends = isPlainObject(ex) && (ex.seconds || ex.milestones || ex.uses);
  if (def.permanent !== undefined && typeof def.permanent !== 'boolean') out.push(`${at}: permanent must be true or false`);
  if (def.permanent && def.kind !== 'narrative') out.push(`${at}: only a narrative decision is permanent (a mechanical one must end or be put right)`);
  if (def.permanent && ends) out.push(`${at}: permanent, yet it expires`);

  // Recovery: every penalty can be put right, by a method that doesn't need what it impairs; an advantage always ends.
  const recov = asArray(def.recovery);
  const impaired = new Set();
  for (const row of levels) for (const key of MODIFIER_KEYS) if (isPlainObject(row) && row[key] !== undefined && Math.sign(row[key] - NEUTRAL[key]) === MODIFIERS[key].worse) impaired.add(MODIFIERS[key].capability);
  recov.forEach((r, i) => {
    const ra = `${at}: recovery[${i}]`;
    if (!isPlainObject(r)) return out.push(`${ra} is { method, result }`);
    const m = methodDef(content, r.method);
    if (!m) out.push(`${ra}: unknown method "${r.method}"`);
    else if (m.kind === 'prepare') out.push(`${ra}: "${r.method}" prepares (earn), it doesn't recover`);
    if (!RESULTS.includes(r.result ?? 'recover')) out.push(`${ra}: result must be recover or contain`);
    for (const k of Object.keys(r)) if (!isComment(k) && !['method', 'result'].includes(k)) out.push(`${ra}: unknown field "${k}"`);
  });
  if (def.kind === 'positive' && recov.length) out.push(`${at}: an advantage has no recovery (it expires or is used up)`);
  if (def.kind === 'negative') {
    const fair = recov.filter((r) => r.result !== 'contain' && methodDef(content, r.method) && !asArray(METHOD_NEEDS[methodDef(content, r.method).kind]).some((n) => impaired.has(n)));
    if (!recov.length && !ends) out.push(`${at}: a penalty needs a recovery or an end (expires): missing recovery information`);
    else if (!fair.length && !ends) out.push(`${at}: every recovery that ends it needs what it impairs (${[...impaired].join(', ')}): recovery would be impossible`);
  }
  if (def.kind === 'positive' && !ends) out.push(`${at}: an advantage must end (expires seconds, milestones or uses): no indefinite advantage`);
  if (def.kind === 'narrative' && !def.permanent && !ends && !recov.length) out.push(`${at}: a narrative consequence that is not permanent must end (expires) or be put right`);

  // Earning (positives only) and opposites (symmetric, not itself).
  asArray(def.earn).forEach((e, i) => {
    const m = methodDef(content, e?.method);
    if (!m) out.push(`${at}: earn[${i}]: unknown method "${e?.method}"`);
    else if (m.kind !== 'prepare') out.push(`${at}: earn[${i}]: "${e.method}" is not a preparation`);
  });
  if (def.earn !== undefined && def.kind !== 'positive') out.push(`${at}: only an advantage is earned by preparation`);
  for (const o of asArray(def.opposes)) {
    const other = consequenceDef(content, o);
    if (o === id) out.push(`${at}: opposes itself`);
    else if (!other) out.push(`${at}: opposes unknown consequence "${o}"`);
    else if (!asArray(other.opposes).includes(id)) out.push(`${at}: opposes "${o}", but "${o}" doesn't oppose it (opposites go both ways)`);
  }
  // A mechanical consequence the player can't see would be unfair.
  if (mechanical && def.visibility === 'hidden') out.push(`${at}: a consequence with modifiers must be shown (the player must be able to see what affects them)`);
  return out;
}

/** Problems in one method. */
function methodProblems(content, id, m) {
  const at = `data/consequences/ledger.json (methods.${id})`;
  const out = [];
  const known = ['kind', 'label', 'verb', 'done', 'room', 'station', 'seconds', 'perLevel', 'cost', 'group', 'where'];
  for (const k of Object.keys(m)) if (!isComment(k) && !known.includes(k)) out.push(`${at}: unknown field "${k}"`);
  if (!METHOD_KINDS.includes(m.kind)) out.push(`${at}: kind must be one of ${METHOD_KINDS.join(', ')}`);
  for (const k of ['label', 'where', 'done']) if (typeof m[k] !== 'string' || !m[k]) out.push(`${at}: needs "${k}"`);
  if (m.kind === 'provision') {
    const groups = new Set(Object.values(content?.shipSupplies?.effects ?? {}).filter(isPlainObject).map((e) => e.group));
    if (!groups.has(m.group)) out.push(`${at}: no supplies effect is in group "${m.group}" (data/ship/supplies.json effects)`);
    for (const k of ['room', 'seconds', 'cost', 'station']) if (m[k] !== undefined) out.push(`${at}: a provision is eaten from Items ("${k}" doesn't apply)`);
    return out;
  }
  if (typeof m.verb !== 'string' || !m.verb) out.push(`${at}: needs "verb"`);
  if (!content?.maps?.get?.(m.room)) out.push(`${at}: unknown room "${m.room}" (a room id: never tiles)`);
  if (m.station !== undefined) {
    const st = content?.shipHazards?.stations?.[m.station];
    if (!st) out.push(`${at}: unknown station "${m.station}" (data/ship/hazards.json stations)`);
    else if (st.room !== m.room) out.push(`${at}: the station "${m.station}" is in ${st.room}, not ${m.room}`);
  }
  if (!(Number.isInteger(m.seconds) && m.seconds >= 1 && m.seconds <= 120)) out.push(`${at}: seconds must be 1 to 120`);
  if (m.perLevel !== undefined && !(Number.isInteger(m.perLevel) && m.perLevel >= 0 && m.perLevel <= 60)) out.push(`${at}: perLevel must be 0 to 60`);
  if (m.kind === 'rest' && m.cost !== undefined) out.push(`${at}: a rest costs time, not materials`);
  if ((m.kind === 'maintain' || m.kind === 'prepare') && !asArray(m.cost).length) out.push(`${at}: ${m.kind} work needs a bill (a meaningful cost)`);
  const seen = new Set();
  asArray(m.cost).forEach((c, i) => {
    const item = content?.items?.get?.(c?.item);
    if (!item) out.push(`${at}: cost[${i}]: unknown item "${c?.item}"`);
    else if (item.type === 'key') out.push(`${at}: cost[${i}]: "${c.item}" is a story key item (never taken)`);
    if (!(Number.isInteger(c?.count ?? 1) && (c?.count ?? 1) >= 1 && (c?.count ?? 1) <= 5)) out.push(`${at}: cost[${i}]: count must be 1 to 5`);
    if (seen.has(c?.item)) out.push(`${at}: cost: "${c?.item}" twice`);
    seen.add(c?.item);
  });
  return out;
}

/** Problems in data/consequences/ledger.json and the presets' "consequences" blocks (a list of messages). */
export function ledgerDataProblems(content) {
  const data = ledgerData(content);
  const out = [];
  for (const id of DIFFICULTIES) {
    const p = content?.difficulties?.get?.(id);
    const t = p?.consequences;
    if (t === undefined) continue;
    const at = `data/difficulty/presets.json (${id}.consequences)`;
    if (!isPlainObject(t)) {
      out.push(`${at}: must be an object`);
      continue;
    }
    for (const [k, v] of Object.entries(t)) {
      if (isComment(k)) continue;
      if (!CONSEQUENCE_TUNING[k]) out.push(`${at}: "${k}" is not a consequence tuning (use: ${Object.keys(CONSEQUENCE_TUNING).join(', ')})`);
      else if (!num(v) || v < CONSEQUENCE_TUNING[k][0] || v > CONSEQUENCE_TUNING[k][1]) out.push(`${at}: ${k} must be from ${CONSEQUENCE_TUNING[k][0]} to ${CONSEQUENCE_TUNING[k][1]}`);
      else if (k === 'cap' && !Number.isInteger(v)) out.push(`${at}: cap is a whole number of levels`);
    }
  }
  if (!data) return out;
  const at = 'data/consequences/ledger.json';
  for (const k of Object.keys(data)) if (!isComment(k) && !['categories', 'limits', 'definitions', 'methods', 'tables', 'milestones', 'journal'].includes(k)) out.push(`${at}: unknown field "${k}"`);
  for (const c of ids(data.categories)) {
    if (!CATEGORIES.includes(c)) out.push(`${at} (categories.${c}): unknown category (use: ${CATEGORIES.join(', ')})`);
    if (typeof data.categories[c]?.label !== 'string') out.push(`${at} (categories.${c}): needs a label`);
  }
  const limits = ledgerLimits(content);
  for (const key of [...MODIFIER_KEYS, 'condition']) {
    const b = limits[key];
    if (!(Array.isArray(b) && b.length === 2 && num(b[0]) && num(b[1]) && b[0] <= NEUTRAL[key === 'condition' ? 'zone' : key] && b[1] >= NEUTRAL[key === 'condition' ? 'zone' : key])) out.push(`${at} (limits.${key}): [lowest, highest] around ${NEUTRAL[key === 'condition' ? 'zone' : key]}`);
  }
  for (const key of ['seconds', 'milestones', 'uses', 'levels', 'history', 'events']) if (!(Number.isInteger(limits[key]) && limits[key] >= 1)) out.push(`${at} (limits.${key}): a whole number, 1 or more`);
  if (limits.levels > 3) out.push(`${at} (limits.levels): at most 3 severity levels`);
  for (const id of consequenceIds(content)) out.push(...definitionProblems(content, id, consequenceDef(content, id), limits));
  for (const id of methodIds(content)) out.push(...methodProblems(content, id, methodDef(content, id)));
  for (const id of methodIds(content)) if (!methodTargets(content, id).length) out.push(`${at} (methods.${id}): nothing uses it`);
  for (const id of tableIds(content)) out.push(...tableProblems(content, tableDef(content, id), `${at} (tables.${id})`));
  for (const m of asArray(data.milestones)) if (!MILESTONES.includes(m)) out.push(`${at} (milestones): unknown milestone "${m}" (use: ${MILESTONES.join(', ')})`);
  const host = data.journal?.log;
  if (host !== undefined && !content?.logs?.get?.(host)) out.push(`${at} (journal.log): unknown logbook "${host}"`);
  return out;
}
