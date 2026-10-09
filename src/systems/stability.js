/**
 * Story Phase 14: Brogath Stability. Rules only, no drawing (the meter is
 * OverlayScene.setStability, the live incidents and the cardboard's shivers
 * are world/StabilityRunner.js).
 *
 * Brogath the Bashful is dangerous because he is embarrassed, not because he
 * is angry, and he is meant to be learnable: pressure only moves when
 * something happens to him (a trigger), when somebody steadies him (a calm),
 * or while an incident is running (a fluttering napkin, an advert), and it
 * moves by the amounts in the data. Nothing here is random.
 *
 * A subject is data (data/story/stability/*.json):
 *
 *   "brogath": {
 *     "name": "BROGATH",
 *     "label": "BASHFULNESS", "angryLabel": "WRATH",
 *     "pressureVar": "brogath_pressure",   // saved story variable
 *     "stateValue": "brogath_state",       // saved story value (derived; dialogue and looks read it)
 *     "angerFlag": "brogath_angry",        // set only by scripts: ANGRY suppresses bashfulness
 *     "meterValue": "brogath_meter",       // "show" | "hide" | unset (automatic)
 *     "incidentValue": "brogath_incident", // the running incident's id, while pressure is rising
 *     "min": -20, "max": 100, "reveal": 30, "afterErupt": 55, "settleTo": 10,
 *     "bands": [{ "state": "PLEASED", "below": 0 }, { "state": "CALM", "below": 15 }, ...],
 *     "stages": [{ "at": 15, "id": "rumble", "label": "small rumble", "sfx": "...", "cooldownMs": 9000 }, ...],
 *     "triggers": { "flutter": { "pressure": 18, "line": "brogath[embarrassed]: ...", "sfx": "..." } },
 *     "calms": { "praise": { "pressure": -20, "line": "..." } },
 *     "prompts": { "general": { "show": 3, "options": [{ "text", "calm" | "trigger", "reply"? }] } },
 *     "incidents": { "napkin": { "start": 35, "rate": 3, "erupt": "<script>", "afterErupt"?: 55 } }
 *   }
 *
 * States, from low to high pressure: PLEASED (confidence to spare), CALM,
 * BASHFUL, EMBARRASSED, PRESSURIZED, CRITICAL. ANGRY is separate: while the
 * anger flag is set the subject is ANGRY whatever the pressure (a scripted
 * state: the Anger Waft).
 */

export const STABILITY_STATES = ['PLEASED', 'CALM', 'BASHFUL', 'EMBARRASSED', 'PRESSURIZED', 'CRITICAL', 'ANGRY'];

export const STABILITY_DEFAULTS = Object.freeze({
  min: -20,
  max: 100,
  reveal: 30,
  afterErupt: 55,
  settleTo: 10,
  bands: [
    { state: 'PLEASED', below: 0 },
    { state: 'CALM', below: 15 },
    { state: 'BASHFUL', below: 40 },
    { state: 'EMBARRASSED', below: 65 },
    { state: 'PRESSURIZED', below: 85 },
    { state: 'CRITICAL', below: Infinity },
  ],
  stages: [],
  triggers: {},
  calms: {},
  prompts: {},
  incidents: {},
});

/** A subject's definition with the defaults filled in (bands and stages sorted). */
export function stabilityDef(def = {}) {
  const bands = (def.bands ?? STABILITY_DEFAULTS.bands).map((b) => ({ ...b, below: b.below ?? Infinity })).sort((a, b) => a.below - b.below);
  return {
    ...STABILITY_DEFAULTS,
    ...def,
    bands,
    stages: [...(def.stages ?? [])].sort((a, b) => a.at - b.at),
    triggers: def.triggers ?? {},
    calms: def.calms ?? {},
    prompts: def.prompts ?? {},
    incidents: def.incidents ?? {},
  };
}

export function clampPressure(def, p) {
  return Math.max(def.min, Math.min(def.max, p));
}

/** The state for a pressure (and anger). */
export function stateFor(def, pressure, angry = false) {
  if (angry) return 'ANGRY';
  for (const b of def.bands) if (pressure < b.below) return b.state;
  return def.bands[def.bands.length - 1]?.state ?? 'CALM';
}

/** The highest warning stage reached (-1 below the first). */
export function stageIndex(def, pressure) {
  let i = -1;
  def.stages.forEach((s, k) => {
    if (pressure >= s.at) i = k;
  });
  return i;
}

/** Reads a subject's saved state from the session. */
export function readStability(def, session) {
  const story = session.story;
  const pressure = clampPressure(def, story.getVar(def.pressureVar, def.settleTo ?? 0));
  const angry = !!(def.angerFlag && story.has(def.angerFlag));
  return {
    pressure,
    angry,
    state: stateFor(def, pressure, angry),
    stage: stageIndex(def, pressure),
    incident: def.incidentValue ? story.getValue(def.incidentValue) : null,
    meter: def.meterValue ? story.getValue(def.meterValue) : null,
  };
}

/**
 * Writes a pressure (rounded, clamped) and the derived state value. Returns
 * { from, to, state, stageFrom, stageTo }.
 */
export function writePressure(def, session, pressure) {
  const story = session.story;
  const from = clampPressure(def, story.getVar(def.pressureVar, def.settleTo ?? 0));
  const to = clampPressure(def, Math.round(pressure));
  story.setVar(def.pressureVar, to);
  const angry = !!(def.angerFlag && story.has(def.angerFlag));
  const state = stateFor(def, to, angry);
  if (def.stateValue) story.setValue(def.stateValue, state);
  return { from, to, state, stageFrom: stageIndex(def, from), stageTo: stageIndex(def, to) };
}

/** Adds to the pressure. */
export function addPressure(def, session, delta) {
  const cur = clampPressure(def, session.story.getVar(def.pressureVar, def.settleTo ?? 0));
  return writePressure(def, session, cur + delta);
}

/** A trigger or calm by id: { pressure, line, sfx } or throws (the validator checks every id used). */
export function effectOf(def, kind, id) {
  const table = kind === 'calm' ? def.calms : def.triggers;
  const e = table[id];
  if (!e) throw new Error(`Stability: no ${kind} "${id}"`);
  return e;
}

/**
 * The options a reassurance prompt offers (data "prompts"): `show` of them,
 * always at least one that calms. Which ones, and in what order, follows the
 * turn number, so the same moment always offers the same choice; over a run
 * the player sees every option and can learn which kind of thing works.
 */
export function promptOptions(def, setId, turn = 0) {
  const set = def.prompts[setId];
  if (!set) throw new Error(`Stability: no prompt set "${setId}"`);
  const all = set.options ?? [];
  const show = Math.min(all.length, set.show ?? 3);
  const good = all.filter((o) => o.calm);
  const bad = all.filter((o) => !o.calm);
  if (!good.length) return all.slice(0, show);
  const pickGood = good[turn % good.length];
  const others = [...good.filter((o) => o !== pickGood), ...bad];
  // Rotate the rest by the turn too, then interleave so the calming answer isn't always first.
  const rot = others.length ? turn % others.length : 0;
  const rest = [...others.slice(rot), ...others.slice(0, rot)].slice(0, show - 1);
  const slot = turn % show;
  const out = [...rest];
  out.splice(Math.min(slot, out.length), 0, pickGood);
  return out;
}

/** What an incident does: { start, rate, erupt } (rate in pressure per second of the captain's time). */
export function incidentDef(def, id) {
  const inc = def.incidents[id];
  if (!inc) throw new Error(`Stability: no incident "${id}"`);
  return { start: null, rate: 3, erupt: null, ...inc };
}

/**
 * One step of a running incident (engine-agnostic; the world calls it each
 * frame the captain has control). `live` is the unrounded pressure. Returns
 * { live, erupt } where `erupt` says the pressure reached the top this step.
 */
export function stepIncident(def, inc, live, dt) {
  const next = Math.min(def.max, live + inc.rate * dt);
  return { live: next, erupt: next >= def.max && live < def.max };
}
