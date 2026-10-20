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
    retryAvailable: false,
    options: [],
    checkpoint: null,
    decision: null,
    accepted: false,
    consequences: { costs: 0, onFailure: 0, applied: [] },
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
