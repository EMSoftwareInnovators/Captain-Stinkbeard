import { asArray } from '../../core/util.js';

/**
 * The Great Sharkstorm (Story Phase 6): a rotating column of sea, sharks,
 * timber and yellow fume, born the night of the Midnight Stenchmaster
 * Catastrophe. It is not a weather simulation. It is one saved story value
 * naming which state it is in, and data saying what each state looks like
 * and does to the deck; the story moves it from state to state.
 *
 *   data/hazards/sharkstorm.json:
 *   "great_sharkstorm": {
 *     "name": "The Great Sharkstorm",
 *     "value": "great_sharkstorm",                 // the saved story value
 *     "distanceValue": "great_sharkstorm_distance",
 *     "states": {
 *       "not_created":    { "intensity": 0 },
 *       "forming":        { "intensity": 1, "distance": "near" },
 *       "attacking_ship": { "intensity": 3, "distance": "near",
 *                           "flying": { "passEvery": [2200, 4200],
 *                                       "impactEvery": [6000, 9000], "warnMs": 1500,
 *                                       "area": [4, 13, 12, 19] } },
 *       "dispersed_near_ship": { "intensity": 0.5, "distance": "near" },
 *       "active_distant": { "intensity": 2, "distance": "distant",
 *                           "rumble": { "every": [26000, 52000], "sfx": "storm_distant" } }
 *     }
 *   }
 *
 *   { "sharkstorm": "attacking_ship" }             script command (also sets the distance value)
 *   { "if": { "sharkstorm": ["forming", "attacking_ship"] } }   condition
 *
 * Unset reads as "not_created". The deck layer that throws sharks about is
 * world/SharkstormLayer.js; the big pictures are vistas.
 */
export const SHARKSTORM_ID = 'great_sharkstorm';
export const SHARKSTORM_NONE = 'not_created';

export function sharkstormData(content) {
  return content?.hazards?.get?.('sharkstorm')?.[SHARKSTORM_ID] ?? { states: {} };
}

export function sharkstormStates(content) {
  return sharkstormData(content).states ?? {};
}

const valueName = (content) => sharkstormData(content).value ?? SHARKSTORM_ID;

/** The state it's in now ("not_created" until the story makes it). */
export function sharkstormState(content, session) {
  return session?.story?.getValue?.(valueName(content)) ?? SHARKSTORM_NONE;
}

/** The state with its data: { id, intensity, distance, flying, rumble }. */
export function sharkstormNow(content, session) {
  const id = sharkstormState(content, session);
  return { id, ...(sharkstormStates(content)[id] ?? {}) };
}

export function setSharkstormState(content, session, id) {
  const d = sharkstormData(content);
  const state = d.states?.[id];
  if (!state) throw new Error(`The Great Sharkstorm has no state "${id}"`);
  session.story.setValue(valueName(content), id === SHARKSTORM_NONE ? null : id);
  session.story.setValue(d.distanceValue ?? `${SHARKSTORM_ID}_distance`, state.distance ?? null);
}

/** Condition: is it in any of these states? */
export function sharkstormIs(content, session, ids) {
  const at = sharkstormState(content, session);
  return asArray(ids).includes(at);
}

/** Uniform pick between [a, b]. */
export function between([a, b], rnd = Math.random) {
  return a + rnd() * (b - a);
}
