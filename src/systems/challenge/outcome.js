import { isPlainObject } from '../../core/util.js';

/**
 * The challenge outcome contract (docs/gameplay-overhaul/07-challenge-outcomes.md).
 * Engine-agnostic: a challenge (the timing bar, Shark Duty, the sash
 * tension...) measures what the player did as plain numbers and booleans
 * ("metrics"), and data rules turn those into one of four outcomes:
 *
 *   success      the job was done as asked
 *   partial      done, but worse: more supplies used, damage left, a lower grade
 *   failure      not done: retry, or carry on with consequences where allowed
 *   unsupported  the challenge can't produce that outcome (reported, never faked)
 *
 * A challenge without opt-in rules is "legacy": it plays exactly as it always
 * has and its completion is reported as success. Nothing old is ever read as
 * a failure just because it has no outcome field.
 */
export const OUTCOMES = Object.freeze(['success', 'partial', 'failure', 'unsupported']);

/**
 * Where a challenge run is:
 *   ready     configured, not started
 *   running   an attempt is under way
 *   awaiting  the attempt failed; waiting for the player's decision
 *   resolved  finished, with its final outcome
 */
export const CHALLENGE_STATES = Object.freeze(['ready', 'running', 'awaiting', 'resolved']);

/**
 * Comparisons a rule can make on a metric:
 *   { "fumbles": 0 }                    equal
 *   { "fumbles": { "lte": 2 } }         eq ne lt lte gt gte
 *   { "released": { "in": ["pressed"] } }
 * A rule holds when every metric it names holds; "any": [rule, ...] holds
 * when one of its rules does, "all": [rule, ...] when every one does.
 */
const OPS = {
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  in: (a, b) => Array.isArray(b) && b.includes(a),
};
export const RULE_OPS = Object.freeze(Object.keys(OPS));

export function ruleHolds(rule, metrics) {
  if (rule === true) return true;
  if (!isPlainObject(rule)) return false;
  for (const [key, want] of Object.entries(rule)) {
    if (key.startsWith('//')) continue;
    if (key === 'any') {
      if (!(want ?? []).some((r) => ruleHolds(r, metrics))) return false;
      continue;
    }
    if (key === 'all') {
      if (!(want ?? []).every((r) => ruleHolds(r, metrics))) return false;
      continue;
    }
    const value = metrics?.[key];
    if (isPlainObject(want)) {
      for (const [op, arg] of Object.entries(want)) {
        if (!OPS[op] || !OPS[op](value, arg)) return false;
      }
    } else if (value !== want) return false;
  }
  return true;
}

/**
 * The metric names a rule reads (for validation against what a kind measures).
 */
export function ruleMetrics(rule, out = new Set()) {
  if (!isPlainObject(rule)) return out;
  for (const [key, want] of Object.entries(rule)) {
    if (key.startsWith('//')) continue;
    if (key === 'any' || key === 'all') (want ?? []).forEach((r) => ruleMetrics(r, out));
    else out.add(key);
  }
  return out;
}

/** The comparisons a rule uses (for validation). */
export function ruleOps(rule, out = new Set()) {
  if (!isPlainObject(rule)) return out;
  for (const [key, want] of Object.entries(rule)) {
    if (key.startsWith('//')) continue;
    if (key === 'any' || key === 'all') (want ?? []).forEach((r) => ruleOps(r, out));
    else if (isPlainObject(want)) Object.keys(want).forEach((op) => out.add(op));
  }
  return out;
}

/*
 * Can an outcome happen at all? A kind describes the ways an attempt can end
 * ("endings", src/systems/challenge/kinds.js) as ranges of its metrics:
 * { values: [...] } for flags and words, { min, max } for numbers. These
 * answer, for one ending, whether a rule can hold (some value in range makes
 * it true) and whether it must (every value does). Both lean towards "can":
 * a rule called impossible really is, so the validator never rejects a
 * challenge that works.
 */
function numericSpan(dom, ops) {
  let lo = dom.min;
  let hi = dom.max;
  let loOpen = false;
  let hiOpen = false;
  for (const [op, arg] of ops) {
    if (!Number.isFinite(arg) && op !== 'ne' && op !== 'in') return null;
    if (op === 'eq') {
      if (arg > lo || (arg === lo && !loOpen)) [lo, loOpen] = [arg, false];
      if (arg < hi || (arg === hi && !hiOpen)) [hi, hiOpen] = [arg, false];
    } else if (op === 'gt' && arg >= lo) [lo, loOpen] = [arg, true];
    else if (op === 'gte' && arg > lo) [lo, loOpen] = [arg, false];
    else if (op === 'lt' && arg <= hi) [hi, hiOpen] = [arg, true];
    else if (op === 'lte' && arg < hi) [hi, hiOpen] = [arg, false];
  }
  return { lo, hi, loOpen, hiOpen };
}

function condCan(dom, want) {
  if (!dom) return true;
  const ops = isPlainObject(want) ? Object.entries(want) : [['eq', want]];
  if (dom.values) return dom.values.some((v) => ops.every(([op, arg]) => OPS[op]?.(v, arg)));
  const span = numericSpan(dom, ops);
  if (!span) return false;
  const { lo, hi, loOpen, hiOpen } = span;
  if (lo > hi || (lo === hi && (loOpen || hiOpen))) return false;
  for (const [op, arg] of ops) {
    if (op === 'ne' && lo === hi && lo === arg) return false;
    if (op === 'in' && !(Array.isArray(arg) && arg.some((v) => v >= lo && v <= hi))) return false;
  }
  return true;
}

function condMust(dom, want) {
  if (!dom) return false;
  const ops = isPlainObject(want) ? Object.entries(want) : [['eq', want]];
  if (dom.values) return dom.values.every((v) => ops.every(([op, arg]) => OPS[op]?.(v, arg)));
  return ops.every(([op, arg]) => {
    if (op === 'gte') return dom.min >= arg;
    if (op === 'gt') return dom.min > arg;
    if (op === 'lte') return dom.max <= arg;
    if (op === 'lt') return dom.max < arg;
    if (op === 'eq') return dom.min === arg && dom.max === arg;
    if (op === 'ne') return dom.max < arg || dom.min > arg;
    if (op === 'in') return dom.min === dom.max && Array.isArray(arg) && arg.includes(dom.min);
    return false;
  });
}

/** Can `rule` hold for some attempt ending in `ending` (metric -> range)? */
export function ruleCan(rule, ending) {
  if (rule === true) return true;
  if (!isPlainObject(rule)) return false;
  return Object.entries(rule).every(([key, want]) => {
    if (key.startsWith('//')) return true;
    if (key === 'any') return (want ?? []).some((r) => ruleCan(r, ending));
    if (key === 'all') return (want ?? []).every((r) => ruleCan(r, ending));
    return condCan(ending[key], want);
  });
}

/** Must `rule` hold for every attempt ending in `ending`? */
export function ruleMust(rule, ending) {
  if (rule === true) return true;
  if (!isPlainObject(rule)) return false;
  return Object.entries(rule).every(([key, want]) => {
    if (key.startsWith('//')) return true;
    if (key === 'any') return (want ?? []).some((r) => ruleMust(r, ending));
    if (key === 'all') return (want ?? []).every((r) => ruleMust(r, ending));
    return condMust(ending[key], want);
  });
}

/**
 * What a challenge's rules can produce over its endings (in the order the
 * rules are checked: failure, success, partial, then the fallback):
 * `outcomes` the outcomes an attempt can end in, `rules` the rules that can
 * be the one that decides (a partial reached only through the fallback means
 * the partial rule's own threshold is out of reach).
 * @returns {{ outcomes: Set<string>, rules: Set<string> }}
 */
export function reachableOutcomes(outcomes = {}, endings = [], supported = ['success', 'partial', 'failure']) {
  const out = new Set();
  const rules = new Set();
  const order = ['failure', 'success', 'partial'].filter((o) => outcomes[o] !== undefined && outcomes[o] !== null);
  for (const ending of endings) {
    let blocked = false;
    for (const o of order) {
      if (!blocked && ruleCan(outcomes[o], ending)) {
        out.add(supported.includes(o) ? o : 'unsupported');
        rules.add(o);
      }
      if (ruleMust(outcomes[o], ending)) blocked = true;
    }
    if (!blocked) {
      const fallback = outcomes.fallback ?? 'partial';
      out.add(supported.includes(fallback) ? fallback : supported.includes('success') ? 'success' : 'unsupported');
    }
  }
  return { outcomes: out, rules };
}

/**
 * The outcome for a set of metrics. Rules are checked failure first, then
 * success, then partial; when none holds, "fallback" decides (partial by
 * default). An outcome the challenge doesn't support is never produced:
 * a failure rule on a challenge that can't fail is reported as unsupported.
 * @returns {{ outcome: string, matched: string|null }}
 */
export function evaluateOutcome(outcomes = {}, metrics = {}, supported = ['success', 'partial', 'failure']) {
  for (const outcome of ['failure', 'success', 'partial']) {
    if (outcomes[outcome] === undefined || outcomes[outcome] === null) continue;
    if (!ruleHolds(outcomes[outcome], metrics)) continue;
    return { outcome: supported.includes(outcome) ? outcome : 'unsupported', matched: outcome };
  }
  const fallback = outcomes.fallback ?? 'partial';
  if (supported.includes(fallback)) return { outcome: fallback, matched: null };
  return { outcome: supported.includes('success') ? 'success' : 'unsupported', matched: null };
}

/**
 * A letter (or any label) for a score: grades are [{ "min": 90, "grade": "A" }, ...],
 * the first one whose "min" the score reaches, highest first.
 */
export function gradeFor(score, grades) {
  if (!Array.isArray(grades) || !Number.isFinite(score)) return null;
  const sorted = [...grades].sort((a, b) => b.min - a.min);
  return sorted.find((g) => score >= g.min)?.grade ?? null;
}

/**
 * A challenge record: everything a challenge reports, the same shape for
 * every kind. Plain data (it is logged, compared in tests and never saved).
 */
export function createRecord({ id, kind, chapter = null, event = null, script = null, enabled = false, failureEnabled = false, legacy = true, maxAttempts = null } = {}) {
  return {
    id,
    kind,
    chapter,
    event,
    script,
    enabled,
    failureEnabled,
    legacy,
    attempt: 0,
    maxAttempts,
    state: 'ready',
    outcome: null,
    score: null,
    grade: null,
    reason: null,
    metrics: null,
    // The story's view and the player's objective can differ (the sash tension: a
    // deliberate flutter breaks the ceremony's rules and is exactly what the player meant).
    narrative: null,
    intent: null,
    cause: null,
    // Which rules were in force (docs/gameplay-overhaul/08-difficulty-and-accessibility.md):
    // the difficulty the run started on, the assists that helped the latest attempt
    // (each attempt's are in its history line), and the resolved thresholds.
    difficulty: null,
    assists: [],
    rules: null,
    retried: false,
    retryAvailable: false,
    options: [],
    checkpoint: null,
    decision: null,
    accepted: false,
    // Prompt 11: "ledger" lists what each consequence step did to the consequence ledger ({ id, op, level, scope }), so the record and the ledger agree.
    consequences: { costs: 0, onFailure: 0, applied: [], ledger: [] },
    transitions: null,
    history: [],
  };
}

/** How many attempt summaries a record keeps (repeated failures never grow it without bound). */
export const HISTORY_LIMIT = 10;

export function pushHistory(record, entry) {
  record.history.push(entry);
  if (record.history.length > HISTORY_LIMIT) record.history.splice(0, record.history.length - HISTORY_LIMIT);
}
