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
  /** The captain is on this map (any of a list). */
  onMap: {
    evaluate: (v, s) => asArray(v).includes(s.location?.map),
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

  /**
   * A story text value (Story Phase 6): { "value": { "name": "ses_state", "eq": "shark_damaged" } },
   * also "in": [list], "ne", and "set": true|false. Unset reads as null.
   */
  value: {
    evaluate: (v, s) => {
      const at = s.story.getValue?.(v.name) ?? null;
      if ('eq' in v && at !== v.eq) return false;
      if ('ne' in v && at === v.ne) return false;
      if ('in' in v && !asArray(v.in).includes(at)) return false;
      if ('set' in v && (at !== null) !== !!v.set) return false;
      return true;
    },
    validate: (v, c) => {
      if (!isPlainObject(v) || typeof v.name !== 'string') c.error('value condition needs { name, eq|ne|in|set }');
      else if (!['eq', 'ne', 'in', 'set'].some((k) => k in v)) c.error('value condition needs eq, ne, in or set');
    },
  },

  /** Story Phase 6: which state the Great Sharkstorm is in (a list = any of; unset = "not_created"). */
  sharkstorm: {
    evaluate: (v, s) => asArray(v).includes(s.story.getValue?.('great_sharkstorm') ?? 'not_created'),
    validate: (v, c) => asArray(v).forEach((id) => c.sharkstorm?.(id)),
  },

  /** Where the Dead Center is today (a location id, a list of them, or "none"). */
  deadCenter: {
    evaluate: (v, s) => {
      const at = s.story.getValue?.('dead_center') ?? null;
      return asArray(v).some((id) => (id === 'none' ? at === null : at === id));
    },
    validate: (v, c) => asArray(v).forEach((id) => c.deadCenter?.(id)),
  },

  /**
   * Overhaul Prompt 5: the ship's condition (docs/gameplay-overhaul/09-ship-integrity.md).
   *   { "ship": { "section": "rigging", "operational": false } }
   *   { "ship": { "section": "hull_port", "state": ["critical", "disabled"] } }
   *   { "ship": { "section": "hull_port", "integrity": { "lt": 50 } } }   (percent)
   *   { "ship": { "overall": { "lt": 60 } } }   { "ship": { "destroyed": true } }
   * Every key given must hold. A session without a ship (old tools) reads as whole.
   */
  ship: {
    evaluate: (v, s) => {
      const ship = s.ship;
      if (!ship) return v.destroyed !== true && v.operational !== false;
      if ('destroyed' in v && ship.destroyed !== v.destroyed) return false;
      if ('overall' in v && !compare(ship.overall().pct, v.overall)) return false;
      if (v.section === undefined) return true;
      const sec = ship.section(v.section);
      if (!sec) return false;
      if ('operational' in v && sec.operational !== v.operational) return false;
      if ('state' in v && !asArray(v.state).includes(sec.state)) return false;
      if ('integrity' in v && !compare(sec.pct, v.integrity)) return false;
      return true;
    },
    validate: (v, c) => {
      if (!isPlainObject(v)) return c.error('ship condition needs { section, operational | state | integrity } or { overall } or { destroyed }');
      const data = c.ctx?.db?.ship;
      for (const k of Object.keys(v)) if (!['section', 'operational', 'state', 'integrity', 'overall', 'destroyed'].includes(k)) c.error(`ship condition: unknown key "${k}"`);
      if (v.section !== undefined && data && !data.sections?.[v.section]) c.error(`ship condition: unknown section "${v.section}"`);
      if (v.section === undefined && ['operational', 'state', 'integrity'].some((k) => k in v)) c.error('ship condition: "operational", "state" and "integrity" need a "section"');
      const states = (data?.thresholds ?? []).map((t) => t.id);
      for (const st of asArray(v.state ?? [])) if (states.length && !states.includes(st)) c.error(`ship condition: unknown state "${st}" (use: ${states.join(', ')})`);
      for (const k of ['integrity', 'overall']) if (k in v && !(typeof v[k] === 'number' || (isPlainObject(v[k]) && Object.keys(v[k]).every((op) => COMPARE_KEYS.includes(op))))) c.error(`ship condition: "${k}" needs a number or { lt, gte, ... }`);
      for (const k of ['operational', 'destroyed']) if (k in v && typeof v[k] !== 'boolean') c.error(`ship condition: "${k}" must be true or false`);
      return undefined;
    },
  },

  /**
   * Overhaul Prompt 6: the ship's emergencies (docs/gameplay-overhaul/10-flooding-and-fire.md).
   *   { "hazard": { "fire": "galley" } }   a fire there ("fire": true: anywhere; "stage": a fire stage or list)
   *   { "hazard": { "water": "cargo_hold", "pct": { "gte": 35 } } }   ("stage": a flood stage or list)
   *   { "hazard": { "leak": "hull_port" } }   an open leak in that section ("leak": true: any)
   *   { "hazard": { "any": true } }   any emergency at all ("any": false: none)
   *   { "hazard": { "stability": "foundering" } }   steady, listing or foundering
   * Every key given must hold. A session without hazards reads as all clear.
   */
  hazard: {
    evaluate: (v, s) => {
      const hz = s.ship?.hazards;
      if (!hz) return v.any === false || (v.any === undefined && !v.fire && !v.water && !v.leak && (v.stability ?? 'steady') === 'steady');
      if ('any' in v && hz.active !== v.any) return false;
      if ('stability' in v && !asArray(v.stability).includes(hz.stability().state)) return false;
      if (v.leak !== undefined && !hz.leaks.some((l) => l.state === 'open' && (v.leak === true || l.section === v.leak))) return false;
      if (v.fire !== undefined) {
        const fires = hz.fires.filter((f) => v.fire === true || f.room === v.fire);
        if (!fires.length) return false;
        if ('stage' in v && !fires.some((f) => asArray(v.stage).includes(hz.fireIn(f.room).stage.id))) return false;
      }
      if (v.water !== undefined) {
        const w = hz.waterIn(v.water);
        if ('pct' in v && !compare(w.pct, v.pct)) return false;
        if ('stage' in v && !asArray(v.stage).includes(w.stage.id)) return false;
        if (!('pct' in v) && !('stage' in v) && !(w.units > 0)) return false;
      }
      return true;
    },
    validate: (v, c) => {
      if (!isPlainObject(v)) return c.error('hazard condition needs { fire | water | leak | any | stability }');
      const data = c.ctx?.db?.shipHazards;
      for (const k of Object.keys(v)) if (!['fire', 'water', 'leak', 'stage', 'pct', 'any', 'stability'].includes(k)) c.error(`hazard condition: unknown key "${k}"`);
      if (typeof v.fire === 'string' && data && !data.fire?.rooms?.[v.fire]) c.error(`hazard condition: "${v.fire}" can't burn`);
      if (typeof v.water === 'string' && data && !data.compartments?.[v.water]) c.error(`hazard condition: "${v.water}" can't hold water`);
      if (typeof v.leak === 'string' && data && !data.leaks?.sections?.[v.leak]) c.error(`hazard condition: the ${v.leak} can't leak`);
      if ('stage' in v) {
        const known = v.fire !== undefined ? (data?.fire?.stages ?? []).map((st) => st.id) : (data?.floodStages ?? []).map((st) => st.id);
        if (v.fire === undefined && v.water === undefined) c.error('hazard condition: "stage" goes with "fire" or "water"');
        for (const st of asArray(v.stage)) if (known.length && !known.includes(st)) c.error(`hazard condition: unknown stage "${st}" (use: ${known.join(', ')})`);
      }
      if ('pct' in v && (v.water === undefined || !(typeof v.pct === 'number' || (isPlainObject(v.pct) && Object.keys(v.pct).every((op) => COMPARE_KEYS.includes(op)))))) c.error('hazard condition: "pct" goes with "water", as a number or { lt, gte, ... }');
      for (const st of asArray(v.stability ?? [])) if (!['steady', 'listing', 'foundering'].includes(st)) c.error(`hazard condition: unknown stability "${st}"`);
      if ('any' in v && typeof v.any !== 'boolean') c.error('hazard condition: "any" must be true or false');
      return undefined;
    },
  },

  /**
   * Prompt 7: the ship's air (docs/gameplay-overhaul/11-atmosphere-and-ventilation.md).
   *   { "air": { "room": "galley" } }   any gas there (not clean)
   *   { "air": { "room": "galley", "quality": ["toxic", "deadly"] } }
   *   { "air": { "room": "galley", "substance": "smoke", "pct": { "gte": 20 } } }   (no substance: all of it)
   *   { "air": { "room": "galley", "safe": true } }   nothing above its safe level: safe to go in
   *   { "air": { "exposure": { "gte": 35 } } }   the captain's lungs (percent); "exposureStage": a stage or list
   *   { "air": { "connection": "galley_door", "state": "closed" } }   ("damaged": true)
   *   { "air": { "source": "galley" } }   a source pouring there ("source": true: anywhere)
   *   { "air": { "any": true } }   anything in the air, a source, short breath ("any": false: none)
   * Every key given must hold. A session without air reads as clean.
   */
  air: {
    evaluate: (v, s) => {
      const air = s.ship?.air;
      if (!air?.enabled) return v.any === false || (v.safe === true && !('exposure' in v) && !('exposureStage' in v)) || ('quality' in v && asArray(v.quality).includes('clean'));
      if ('any' in v && air.active !== v.any) return false;
      if (v.room !== undefined) {
        const a = air.airIn(v.room);
        if ('safe' in v && (a.index <= 0) !== v.safe) return false;
        if ('quality' in v && !asArray(v.quality).includes(a.quality.id)) return false;
        const pct = v.substance ? a.subs.find((x) => x.id === v.substance)?.pct ?? 0 : a.total;
        if ('pct' in v && !compare(Math.round(pct), v.pct)) return false;
        if (!('safe' in v) && !('quality' in v) && !('pct' in v) && !(v.substance ? pct > 0 : a.quality.id !== 'clean')) return false;
      }
      if ('exposure' in v && !compare(air.exposureNow().pct, v.exposure)) return false;
      if ('exposureStage' in v && !asArray(v.exposureStage).includes(air.exposureNow().stage.id)) return false;
      if (v.connection !== undefined) {
        const c = air.connectionState(v.connection);
        if (!c) return false;
        if ('state' in v && !asArray(v.state).includes(c.state)) return false;
        if ('damaged' in v && c.damaged !== v.damaged) return false;
      }
      if (v.source !== undefined && !air.sources.some((x) => v.source === true || x.room === v.source)) return false;
      return true;
    },
    validate: (v, c) => {
      if (!isPlainObject(v)) return c.error('air condition needs { room | exposure | exposureStage | connection | source | any }');
      const data = c.ctx?.db?.shipAir;
      const keys = ['room', 'substance', 'pct', 'quality', 'safe', 'exposure', 'exposureStage', 'connection', 'state', 'damaged', 'source', 'any'];
      for (const k of Object.keys(v)) if (!keys.includes(k)) c.error(`air condition: unknown key "${k}"`);
      if (v.room !== undefined && data && !data.rooms?.[v.room]) c.error(`air condition: "${v.room}" has no ship air`);
      if (v.substance !== undefined && data && !data.substances?.[v.substance]) c.error(`air condition: unknown substance "${v.substance}"`);
      for (const k of ['substance', 'pct', 'quality', 'safe']) if (k in v && v.room === undefined) c.error(`air condition: "${k}" goes with "room"`);
      const levels = (data?.quality?.levels ?? []).map((l) => l.id);
      for (const q of asArray(v.quality ?? [])) if (levels.length && !levels.includes(q)) c.error(`air condition: unknown quality "${q}" (use: ${levels.join(', ')})`);
      const stages = (data?.exposure?.stages ?? []).map((st) => st.id);
      for (const st of asArray(v.exposureStage ?? [])) if (stages.length && !stages.includes(st)) c.error(`air condition: unknown exposure stage "${st}" (use: ${stages.join(', ')})`);
      for (const k of ['pct', 'exposure']) if (k in v && !(typeof v[k] === 'number' || (isPlainObject(v[k]) && Object.keys(v[k]).every((op) => COMPARE_KEYS.includes(op))))) c.error(`air condition: "${k}" is a number or { lt, gte, ... }`);
      if (v.connection !== undefined && data && !data.connections?.[v.connection]) c.error(`air condition: unknown opening "${v.connection}"`);
      for (const k of ['state', 'damaged']) if (k in v && v.connection === undefined) c.error(`air condition: "${k}" goes with "connection"`);
      for (const st of asArray(v.state ?? [])) if (!['open', 'closed', 'sealed'].includes(st)) c.error(`air condition: unknown state "${st}"`);
      if (v.source !== undefined && v.source !== true && data && !data.rooms?.[v.source]) c.error(`air condition: "${v.source}" has no ship air`);
      for (const k of ['safe', 'damaged', 'any']) if (k in v && typeof v[k] !== 'boolean') c.error(`air condition: "${k}" must be true or false`);
      return undefined;
    },
  },

  /**
   * Overhaul Prompt 8: a Grand Stenchmaster's pressure (docs/gameplay-overhaul/12-pressure-and-eruptions.md).
   *   { "pressure": { "subject": "garrick", "stage": ["critical", "imminent"] } }
   *   { "pressure": { "subject": "brogath", "pressure": { "gte": 40 } } }   his own units (Brogath's: his Stability)
   *   { "pressure": { "subject": "garrick", "phase": "cooldown" } }          idle, imminent or cooldown
   *   { "pressure": { "subject": "brogath", "held": true } }                 holding something in
   *   { "pressure": { "subject": "garrick", "erupted": { "gte": 1 } } }      eruptions so far
   *   { "pressure": { "subject": "garrick", "active": true } }               switched on ("available": aboard; "here": in the captain's room)
   */
  pressure: {
    evaluate: (v, s) => {
      const i = s.ship?.pressure?.info?.(v.subject);
      if (!i) return false;
      if ('active' in v && i.on !== v.active) return false;
      if ('available' in v && i.available !== v.available) return false;
      if ('here' in v && (i.available && i.room === s.location?.map) !== v.here) return false;
      if ('stage' in v && !asArray(v.stage).includes(i.stage)) return false;
      if ('pressure' in v && !compare(Math.round(i.pressure), v.pressure)) return false;
      if ('held' in v && (typeof v.held === 'boolean' ? i.held > 0 !== v.held : !compare(Math.round(i.held), v.held))) return false;
      if ('phase' in v && !asArray(v.phase).includes(i.phase)) return false;
      if ('erupted' in v && !compare(i.count, v.erupted)) return false;
      return true;
    },
    validate: (v, c) => {
      if (!isPlainObject(v)) return c.error('pressure condition needs { subject, ... }');
      const data = c.ctx?.db?.shipPressure;
      const keys = ['subject', 'active', 'available', 'here', 'stage', 'pressure', 'held', 'phase', 'erupted'];
      for (const k of Object.keys(v)) if (!keys.includes(k)) c.error(`pressure condition: unknown key "${k}"`);
      if (typeof v.subject !== 'string') c.error('pressure condition: "subject" is required');
      else if (data && !data.subjects?.[v.subject]) c.error(`pressure condition: unknown subject "${v.subject}"`);
      const stages = Object.keys(data?.stages ?? {}).filter((k) => !k.startsWith('//'));
      for (const st of asArray(v.stage ?? [])) if (stages.length && !stages.includes(st)) c.error(`pressure condition: unknown stage "${st}" (use: ${stages.join(', ')})`);
      for (const ph of asArray(v.phase ?? [])) if (!['idle', 'imminent', 'cooldown'].includes(ph)) c.error(`pressure condition: unknown phase "${ph}" (idle, imminent, cooldown)`);
      const cmp = (x) => typeof x === 'number' || (isPlainObject(x) && Object.keys(x).every((op) => COMPARE_KEYS.includes(op)));
      for (const k of ['pressure', 'erupted']) if (k in v && !cmp(v[k])) c.error(`pressure condition: "${k}" is a number or { lt, gte, ... }`);
      if ('held' in v && typeof v.held !== 'boolean' && !cmp(v.held)) c.error('pressure condition: "held" is true, false, a number or { lt, gte, ... }');
      for (const k of ['active', 'available', 'here']) if (k in v && typeof v[k] !== 'boolean') c.error(`pressure condition: "${k}" must be true or false`);
      return undefined;
    },
  },

  /**
   * Overhaul Prompt 9: the captain's Stink Beard (docs/gameplay-overhaul/13-beard-saturation.md).
   * Not the story's beard tags (those are flags: { "flag": "beard_SMOKE" }).
   *   { "beardSaturation": { "active": true } }                      the system switched on
   *   { "beardSaturation": { "stage": ["heavy", "critical"] } }      clean ... overloaded
   *   { "beardSaturation": { "pct": { "gte": 60 } } }                how full (percent of this difficulty's capacity)
   *   { "beardSaturation": { "contains": "smoke", "amount": { "gte": 10 } } }   a contaminant held (amount: units)
   *   { "beardSaturation": { "status": "gagging" } }                 a condition on now
   *   { "beardSaturation": { "phase": "overload" } }                 idle, overload or cooldown
   *   { "beardSaturation": { "wearing": "beard_wrap" } }             worn over it
   *   { "beardSaturation": { "purged": { "gte": 1 } } }              purges so far
   */
  beardSaturation: {
    evaluate: (v, s) => {
      const b = s.ship?.beard;
      if (!b) return false;
      if ('active' in v && b.on !== v.active) return false;
      if (!b.on && Object.keys(v).some((k) => k !== 'active')) return false;
      if ('stage' in v && !asArray(v.stage).includes(b.stage().id)) return false;
      if ('pct' in v && !compare(Math.floor(b.pct()), v.pct)) return false;
      if ('contains' in v && !(b.amount(v.contains) > 0)) return false;
      if ('amount' in v && !compare(Math.round(v.contains ? b.amount(v.contains) : b.total), v.amount)) return false;
      if ('status' in v && !asArray(v.status).some((id) => b.statusOn(id))) return false;
      if ('phase' in v && !asArray(v.phase).includes(b.phase)) return false;
      if ('wearing' in v && !b.wornItems().includes(v.wearing)) return false;
      if ('purged' in v && !compare(b.count, v.purged)) return false;
      return true;
    },
    validate: (v, c) => {
      if (!isPlainObject(v)) return c.error('beardSaturation condition needs { ... }');
      const data = c.ctx?.db?.shipBeard;
      const keys = ['active', 'stage', 'pct', 'contains', 'amount', 'status', 'phase', 'wearing', 'purged'];
      for (const k of Object.keys(v)) if (!keys.includes(k)) c.error(`beardSaturation condition: unknown key "${k}"`);
      const stages = (data?.stages ?? []).map((st) => st.id);
      for (const st of asArray(v.stage ?? [])) if (stages.length && !stages.includes(st)) c.error(`beardSaturation condition: unknown stage "${st}" (use: ${stages.join(', ')})`);
      for (const ph of asArray(v.phase ?? [])) if (!['idle', 'overload', 'cooldown'].includes(ph)) c.error(`beardSaturation condition: unknown phase "${ph}" (idle, overload, cooldown)`);
      if ('contains' in v && data && !data.contaminants?.[v.contains]) c.error(`beardSaturation condition: unknown contaminant "${v.contains}"`);
      if ('contains' in v && data?.contaminants?.[v.contains]?.debugOnly) c.error(`beardSaturation condition: "${v.contains}" is for the debug demo and tests only`);
      for (const st of asArray(v.status ?? [])) if (data && !data.statuses?.[st]) c.error(`beardSaturation condition: unknown status "${st}"`);
      if ('wearing' in v && data && !data.equipment?.[v.wearing]) c.error(`beardSaturation condition: "${v.wearing}" isn't worn over the beard`);
      const cmp = (x) => typeof x === 'number' || (isPlainObject(x) && Object.keys(x).every((op) => COMPARE_KEYS.includes(op)));
      for (const k of ['pct', 'amount', 'purged']) if (k in v && !cmp(v[k])) c.error(`beardSaturation condition: "${k}" is a number or { lt, gte, ... }`);
      if ('active' in v && typeof v.active !== 'boolean') c.error('beardSaturation condition: "active" must be true or false');
      return undefined;
    },
  },

  /**
   * Overhaul Prompt 10: the ship's supplies (docs/gameplay-overhaul/14-resources-and-cooking.md).
   *   { "supplies": { "active": true } }                                   the system switched on
   *   { "supplies": { "has": "planks", "count": { "gte": 2 } } }           in the pack (count: default 1 or more)
   *   { "supplies": { "stored": "planks", "store": "hold", "count": 3 } }  in a store (store: default any)
   *   { "supplies": { "reach": "beans", "count": 2 } }                     the pack and the stores the cook can draw on from here
   *   { "supplies": { "source": "hold_crates", "left": 0 } }               what a source has left (a recovery: always)
   *   { "supplies": { "source": "hold_bilge", "ready": true } }            can be taken from now
   *   { "supplies": { "wearing": "clay_pot_helmet" } }                     worn (and still carried)
   *   { "supplies": { "effect": "full_belly" } }                           a food or draught effect running
   *   { "supplies": { "cooking": true } } / { "cooking": "bean_stew" }      a pot on (any, or that one)
   *   { "supplies": { "ready": true } }                                    the pot is ready to serve
   *   { "supplies": { "canCook": "bean_stew" } }                           known, nothing on, nothing missing
   *   { "supplies": { "knows": "fish_chowder" } }                          a recipe known
   */
  supplies: {
    evaluate: (v, s) => {
      const u = s.ship?.supplies;
      if (!u) return false;
      if ('active' in v && u.on !== v.active) return false;
      const n = (x) => (v.count === undefined ? x >= 1 : compare(x, v.count));
      if ('has' in v && !n(s.inventory?.count(v.has) ?? 0)) return false;
      if ('stored' in v) {
        const stores = v.store ? [v.store] : Object.keys(u.stores);
        if (!n(stores.reduce((k, st) => k + u.storeCount(st, v.stored), 0))) return false;
      }
      if ('reach' in v && !n(u.reach('cook', s.location?.map).count(v.reach))) return false;
      if ('source' in v) {
        const st = u.sourceState(v.source);
        if (!st) return false;
        if ('left' in v && !(Number.isFinite(st.left) ? compare(st.left, v.left) : true)) return false;
        if ('ready' in v && u.available(v.source).ok !== v.ready) return false;
      }
      if ('wearing' in v && !u.wornGear().includes(v.wearing)) return false;
      if ('effect' in v && !u.effects[v.effect]) return false;
      if ('cooking' in v && (v.cooking === true ? !u.cooking : v.cooking === false ? !!u.cooking : u.cooking?.recipe !== v.cooking)) return false;
      if ('ready' in v && !('source' in v) && u.ready !== v.ready) return false;
      if ('knows' in v && !u.knows(v.knows)) return false;
      if ('canCook' in v) {
        const r = s.content?.shipSupplies?.recipes?.[v.canCook];
        if (!r || !u.on || u.cooking || !u.knows(v.canCook)) return false;
        const reach = u.reach('cook', s.location?.map);
        if (asArray(r.ingredients).some((c) => reach.count(c.item) < (c.count ?? 1))) return false;
      }
      return true;
    },
    validate: (v, c) => {
      if (!isPlainObject(v)) return c.error('supplies condition needs { ... }');
      const data = c.ctx?.db?.shipSupplies;
      const keys = ['active', 'has', 'stored', 'store', 'reach', 'count', 'source', 'left', 'ready', 'wearing', 'effect', 'cooking', 'canCook', 'knows'];
      for (const k of Object.keys(v)) if (!keys.includes(k)) c.error(`supplies condition: unknown key "${k}"`);
      const items = c.ctx?.db?.items;
      for (const k of ['has', 'stored', 'reach']) if (k in v && items && !items.get?.(v[k])) c.error(`supplies condition: unknown item "${v[k]}"`);
      if ('store' in v && data && !data.stores?.[v.store]) c.error(`supplies condition: unknown store "${v.store}"`);
      if ('source' in v && data && !data.sources?.[v.source]) c.error(`supplies condition: unknown source "${v.source}"`);
      if (('left' in v) && !('source' in v)) c.error('supplies condition: "left" goes with "source"');
      if ('wearing' in v && data && !data.gear?.items?.[v.wearing]) c.error(`supplies condition: "${v.wearing}" isn't gear`);
      if ('effect' in v && data && !data.effects?.[v.effect]) c.error(`supplies condition: unknown effect "${v.effect}"`);
      for (const k of ['canCook', 'knows']) if (k in v && data && !data.recipes?.[v[k]]) c.error(`supplies condition: unknown recipe "${v[k]}"`);
      if ('cooking' in v && typeof v.cooking !== 'boolean' && data && !data.recipes?.[v.cooking]) c.error(`supplies condition: "cooking" is true, false or a recipe`);
      const cmp = (x) => typeof x === 'number' || (isPlainObject(x) && Object.keys(x).every((op) => COMPARE_KEYS.includes(op)));
      for (const k of ['count', 'left']) if (k in v && !cmp(v[k])) c.error(`supplies condition: "${k}" is a number or { lt, gte, ... }`);
      for (const k of ['active', 'ready']) if (k in v && typeof v[k] !== 'boolean') c.error(`supplies condition: "${k}" must be true or false`);
      return undefined;
    },
  },

  /**
   * Overhaul Prompt 11: the consequence ledger (docs/gameplay-overhaul/15-consequences-and-recovery.md).
   * For costs, difficulty and dialogue variants, never on a mandatory objective's way (the validator refuses it there).
   *   { "consequence": { "id": "shaken", "active": true } }             in force now (a contained one isn't)
   *   { "consequence": { "id": "shaken", "held": true } }               held at all (in force or contained)
   *   { "consequence": { "id": "shaken", "severity": { "gte": 2 } } }   the level in force (0 when contained or not held)
   *   { "consequence": { "id": "shaken", "state": "recovered" } }       active, contained, recovered, resolved or none (the latest)
   *   { "consequence": { "id": "shaken", "resolved": true } }           it has ended before and isn't held now
   *   { "consequence": { "id": "shaken", "ever": true } }               it has ever happened
   *   { "consequence": { "id": "shaken", "times": { "gte": 3 } } }      how often it has been applied
   *   { "consequence": { "earned": "well_prepared" } }                  an advantage ever earned
   *   { "consequence": { "modifier": "zone", "lt": 0 } }                what the ledger does to the next challenge now (zone, work, repair, response, costAdd)
   *   { "consequence": { "category": "condition", "count": { "gte": 1 } } }   how many held in a category (count: default 1 or more)
   *   { "consequence": { "any": true } }                                anything held at all
   */
  consequence: {
    evaluate: (v, s) => {
      const L = s.consequences;
      if (!L) return false;
      if ('any' in v && L.entries.size > 0 !== v.any) return false;
      if ('earned' in v && !L.ever(v.earned)) return false;
      if ('modifier' in v) {
        const x = L.factor(v.modifier);
        for (const op of COMPARE_KEYS) if (op in v && !compare(x, { [op]: v[op] })) return false;
      }
      if ('category' in v) {
        const n = L.inCategory(v.category).length;
        if (!(v.count === undefined ? n >= 1 : compare(n, v.count))) return false;
      }
      if ('id' in v) {
        const e = L.held(v.id);
        if ('active' in v && (e?.state === 'active') !== v.active) return false;
        if ('held' in v && !!e !== v.held) return false;
        if ('severity' in v && !compare(L.level(v.id), v.severity)) return false;
        if ('state' in v && !asArray(v.state).includes(L.state(v.id))) return false;
        if ('resolved' in v && (!e && !!L.lastEnded(v.id)) !== v.resolved) return false;
        if ('ever' in v && L.ever(v.id) !== v.ever) return false;
        if ('times' in v && !compare(L.times(v.id), v.times)) return false;
      }
      return true;
    },
    validate: (v, c) => {
      if (!isPlainObject(v)) return c.error('consequence condition needs { ... }');
      // Prompt 11's rule: a consequence changes cost, difficulty and dialogue, never whether the story can go on.
      if (c.gate) c.error(`consequences never gate mandatory story (${c.gate}): use them for costs, difficulty and dialogue variants`);
      const data = c.ctx?.db?.consequences;
      const defs = data?.definitions ?? {};
      const keys = ['id', 'active', 'held', 'severity', 'state', 'resolved', 'ever', 'times', 'earned', 'modifier', 'category', 'count', 'any', ...COMPARE_KEYS];
      for (const k of Object.keys(v)) if (!keys.includes(k)) c.error(`consequence condition: unknown key "${k}"`);
      const def = 'id' in v ? defs[v.id] : null;
      if ('id' in v && (!def || String(v.id).startsWith('//'))) c.error(`consequence condition: unknown consequence "${v.id}"`);
      const perId = ['active', 'held', 'severity', 'state', 'resolved', 'ever', 'times'];
      for (const k of perId) if (k in v && !('id' in v)) c.error(`consequence condition: "${k}" goes with "id"`);
      for (const k of ['active', 'held', 'resolved', 'ever', 'any']) if (k in v && typeof v[k] !== 'boolean') c.error(`consequence condition: "${k}" must be true or false`);
      const cmp = (x) => typeof x === 'number' || (isPlainObject(x) && Object.keys(x).length > 0 && Object.keys(x).every((op) => COMPARE_KEYS.includes(op) && typeof x[op] === 'number'));
      for (const k of ['severity', 'times', 'count']) if (k in v && !cmp(v[k])) c.error(`consequence condition: "${k}" is a number or { lt, gte, ... }`);
      if (def && isPlainObject(v.severity)) {
        const levels = asArray(def.levels).length;
        for (const [op, n] of Object.entries(v.severity)) if (!(Number.isInteger(n) && n >= 0 && n <= levels)) c.error(`consequence condition: severity ${op} ${n} is outside "${v.id}"'s levels (0 to ${levels})`);
      }
      for (const st of asArray(v.state ?? [])) if (!['active', 'contained', 'recovered', 'resolved', 'none'].includes(st)) c.error(`consequence condition: unknown state "${st}" (active, contained, recovered, resolved, none)`);
      if ('earned' in v && defs[v.earned]?.kind !== 'positive') c.error(`consequence condition: "earned" names an advantage ("${v.earned}" isn't one)`);
      if ('modifier' in v && !['zone', 'work', 'repair', 'response', 'costAdd'].includes(v.modifier)) c.error(`consequence condition: unknown modifier "${v.modifier}" (zone, work, repair, response, costAdd)`);
      const ops = COMPARE_KEYS.filter((op) => op in v);
      if (ops.length && !('modifier' in v)) c.error('consequence condition: a comparison goes with "modifier"');
      if ('modifier' in v && !ops.length) c.error('consequence condition: "modifier" needs a comparison (lt, gte, ...)');
      for (const op of ops) if (typeof v[op] !== 'number') c.error(`consequence condition: "${op}" needs a number`);
      if ('category' in v && !data?.categories?.[v.category]) c.error(`consequence condition: unknown category "${v.category}"`);
      if ('count' in v && !('category' in v)) c.error('consequence condition: "count" goes with "category"');
      // Requirements that can never hold together.
      if (v.active === true && (v.held === false || v.resolved === true || v.ever === false)) c.error('consequence condition: can never hold (in force, yet not held, ended or never happened)');
      if (v.held === true && (v.resolved === true || v.ever === false)) c.error('consequence condition: can never hold (held, yet ended or never happened)');
      if (v.active === false && cmp(v.severity) && (typeof v.severity === 'number' ? v.severity >= 1 : (v.severity.gte ?? 0) >= 1 || (v.severity.gt ?? -1) >= 0 || (v.severity.eq ?? 0) >= 1)) c.error('consequence condition: can never hold (not in force, yet a severity of 1 or more)');
      return undefined;
    },
  },

  all: {
    evaluate: (v, s) => asArray(v).every((cond) => evaluateCondition(cond, s)),
    validate: (v, c) => {
      asArray(v).forEach((cond) => validateCondition(cond, c));
      opposedRequirements(asArray(v), c);
    },
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
/**
 * Prompt 11: requirements in one conjunction that can never hold together:
 * two consequences that oppose each other (applying one ends the other)
 * both required to be held.
 */
function opposedRequirements(list, check) {
  const defs = check.ctx?.db?.consequences?.definitions ?? {};
  const held = list.filter((c) => isPlainObject(c?.consequence) && (c.consequence.active === true || c.consequence.held === true)).map((c) => c.consequence.id);
  for (const a of held) {
    for (const b of asArray(defs[a]?.opposes)) if (held.includes(b) && a < b) check.error(`consequence conditions can never hold together: "${a}" and "${b}" oppose each other (one ends the other)`);
  }
}

export function validateCondition(cond, check) {
  if (cond === undefined || cond === null || typeof cond === 'boolean') return;
  if (Array.isArray(cond)) {
    cond.forEach((c) => validateCondition(c, check));
    opposedRequirements(cond, check);
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
