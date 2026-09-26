import { asArray, isPlainObject } from '../../core/util.js';

/**
 * Data-driven condition language used by dialogue, NPC placement, quests,
 * interactables, warps and encounters.
 *
 * A condition is an object whose keys are all required to pass (implicit AND):
 *
 *   { "flag": "met_first_mate", "questActive": "rats_in_the_hold" }
 *   { "any": [ { "hasItem": "rusty_key" }, { "flag": "finch_chest_open" } ] }
 *   { "not": { "questCompleted": "captains_rounds" } }
 *   { "gold": { "gte": 50 } }
 *   { "var": { "name": "rats_seen", "gte": 3 } }
 *
 * `null`/`undefined` means "always true". An array means "all of these".
 * Each operator below also has a validator so content validation can reject
 * unknown keys and dangling references before the game ever runs.
 */

function compare(actual, spec) {
  if (typeof spec === 'number') return actual >= spec;
  if (!isPlainObject(spec)) return false;
  if ('eq' in spec && !(actual === spec.eq)) return false;
  if ('ne' in spec && !(actual !== spec.ne)) return false;
  if ('gt' in spec && !(actual > spec.gt)) return false;
  if ('gte' in spec && !(actual >= spec.gte)) return false;
  if ('lt' in spec && !(actual < spec.lt)) return false;
  if ('lte' in spec && !(actual <= spec.lte)) return false;
  return true;
}

const COMPARE_KEYS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'];

function splitObjectiveRef(ref) {
  const idx = String(ref).indexOf('.');
  return idx < 0 ? [ref, null] : [ref.slice(0, idx), ref.slice(idx + 1)];
}

function itemSpecs(value) {
  return asArray(value).map((v) => (typeof v === 'string' ? { id: v, count: 1 } : { id: v.id, count: v.count ?? 1 }));
}

/** Operator table: evaluate(value, session) and validate(value, check). */
export const CONDITION_OPERATORS = {
  always: { evaluate: () => true, validate: () => {} },
  never: { evaluate: () => false, validate: () => {} },

  flag: {
    evaluate: (v, s) => asArray(v).every((f) => s.story.has(f)),
    validate: (v, c) => asArray(v).forEach((f) => c.flag(f)),
  },
  notFlag: {
    evaluate: (v, s) => asArray(v).every((f) => !s.story.has(f)),
    validate: (v, c) => asArray(v).forEach((f) => c.flag(f)),
  },
  anyFlag: {
    evaluate: (v, s) => asArray(v).some((f) => s.story.has(f)),
    validate: (v, c) => asArray(v).forEach((f) => c.flag(f)),
  },

  questActive: {
    evaluate: (v, s) => asArray(v).every((q) => s.quests.status(q) === 'active'),
    validate: (v, c) => asArray(v).forEach((q) => c.quest(q)),
  },
  questCompleted: {
    evaluate: (v, s) => asArray(v).every((q) => s.quests.status(q) === 'completed'),
    validate: (v, c) => asArray(v).forEach((q) => c.quest(q)),
  },
  questNotStarted: {
    evaluate: (v, s) => asArray(v).every((q) => s.quests.status(q) === 'inactive'),
    validate: (v, c) => asArray(v).forEach((q) => c.quest(q)),
  },
  questStarted: {
    evaluate: (v, s) => asArray(v).every((q) => s.quests.status(q) !== 'inactive'),
    validate: (v, c) => asArray(v).forEach((q) => c.quest(q)),
  },
  questNotCompleted: {
    evaluate: (v, s) => asArray(v).every((q) => s.quests.status(q) !== 'completed'),
    validate: (v, c) => asArray(v).forEach((q) => c.quest(q)),
  },

  /** "quest.objective": objective finished. */
  objectiveDone: {
    evaluate: (v, s) => asArray(v).every((r) => s.quests.isObjectiveDone(...splitObjectiveRef(r))),
    validate: (v, c) => asArray(v).forEach((r) => c.objective(r)),
  },
  objectiveNotDone: {
    evaluate: (v, s) => asArray(v).every((r) => !s.quests.isObjectiveDone(...splitObjectiveRef(r))),
    validate: (v, c) => asArray(v).forEach((r) => c.objective(r)),
  },
  /** Quest active, prerequisites met, objective not yet finished. */
  objectiveActive: {
    evaluate: (v, s) => asArray(v).every((r) => s.quests.isObjectiveAvailable(...splitObjectiveRef(r))),
    validate: (v, c) => asArray(v).forEach((r) => c.objective(r)),
  },

  hasItem: {
    evaluate: (v, s) => itemSpecs(v).every(({ id, count }) => s.inventory.count(id) >= count),
    validate: (v, c) => itemSpecs(v).forEach(({ id }) => c.item(id)),
  },
  lacksItem: {
    evaluate: (v, s) => itemSpecs(v).every(({ id }) => s.inventory.count(id) === 0),
    validate: (v, c) => itemSpecs(v).forEach(({ id }) => c.item(id)),
  },
  gold: {
    evaluate: (v, s) => compare(s.inventory.gold, v),
    validate: (v, c) => c.comparison(v),
  },

  var: {
    evaluate: (v, s) => compare(s.story.getVar(v.name), v),
    validate: (v, c) => {
      if (!isPlainObject(v) || typeof v.name !== 'string') c.error('var condition needs { name, eq|gte|... }');
      else c.comparison(Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'name')));
    },
  },

  partyHas: {
    evaluate: (v, s) => asArray(v).every((id) => s.party.has(id)),
    validate: (v, c) => asArray(v).forEach((id) => c.character(id)),
  },
  partyLacks: {
    evaluate: (v, s) => asArray(v).every((id) => !s.party.has(id)),
    validate: (v, c) => asArray(v).forEach((id) => c.character(id)),
  },
  level: {
    evaluate: (v, s) => compare(s.party.leader()?.level ?? 0, v),
    validate: (v, c) => c.comparison(v),
  },

  visited: {
    evaluate: (v, s) => asArray(v).every((m) => s.world.hasVisited(m)),
    validate: (v, c) => asArray(v).forEach((m) => c.map(m)),
  },
  notVisited: {
    evaluate: (v, s) => asArray(v).every((m) => !s.world.hasVisited(m)),
    validate: (v, c) => asArray(v).forEach((m) => c.map(m)),
  },
  /** World-object state, e.g. { "objectState": { "key": "cargo_hold:crate_1", "opened": true } } */
  objectState: {
    evaluate: (v, s) =>
      Object.entries(v)
        .filter(([k]) => k !== 'key')
        .every(([prop, expected]) => (s.world.get(v.key, prop, false) ?? false) === expected),
    validate: (v, c) => {
      if (!isPlainObject(v) || typeof v.key !== 'string') c.error('objectState needs { key: "map:object", prop: value }');
    },
  },

  all: {
    evaluate: (v, s) => asArray(v).every((cond) => evaluateCondition(cond, s)),
    validate: (v, c) => asArray(v).forEach((cond) => validateCondition(cond, c)),
  },
  any: {
    evaluate: (v, s) => asArray(v).some((cond) => evaluateCondition(cond, s)),
    validate: (v, c) => asArray(v).forEach((cond) => validateCondition(cond, c)),
  },
  not: {
    evaluate: (v, s) => !evaluateCondition(v, s),
    validate: (v, c) => validateCondition(v, c),
  },
};

export function evaluateCondition(cond, session) {
  if (cond === undefined || cond === null || cond === true) return true;
  if (cond === false) return false;
  if (Array.isArray(cond)) return cond.every((c) => evaluateCondition(c, session));
  if (!isPlainObject(cond)) throw new Error(`Invalid condition: ${JSON.stringify(cond)}`);
  for (const [key, value] of Object.entries(cond)) {
    const op = CONDITION_OPERATORS[key];
    if (!op) throw new Error(`Unknown condition operator "${key}"`);
    if (!op.evaluate(value, session)) return false;
  }
  return true;
}

/**
 * Validates a condition. `check` is a ReferenceChecker (see content/validateContent.js)
 * providing flag(), quest(), objective(), item(), character(), map(), comparison(), error().
 */
export function validateCondition(cond, check) {
  if (cond === undefined || cond === null || typeof cond === 'boolean') return;
  if (Array.isArray(cond)) {
    cond.forEach((c) => validateCondition(c, check));
    return;
  }
  if (!isPlainObject(cond)) {
    check.error(`condition must be an object, got ${JSON.stringify(cond)}`);
    return;
  }
  for (const [key, value] of Object.entries(cond)) {
    const op = CONDITION_OPERATORS[key];
    if (!op) {
      check.error(`unknown condition operator "${key}"`);
      continue;
    }
    op.validate(value, check);
  }
}

export { compare as compareNumber, COMPARE_KEYS, splitObjectiveRef };
