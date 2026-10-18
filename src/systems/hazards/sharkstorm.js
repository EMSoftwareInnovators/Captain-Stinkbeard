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
 *   { "sharkstorm": "fire_sharkstorm", "flare": true }   Story Phase 17: a temporary flare
 *   { "sharkstorm": "end_flare" }                  ...and its end (it also burns out by itself)
 *   { "if": { "sharkstorm": ["forming", "attacking_ship"] } }   condition
 *
 * Unset reads as "not_created". The deck layer that throws sharks about is
 * world/SharkstormLayer.js; the big pictures are vistas.
 */
export const SHARKSTORM_ID = 'great_sharkstorm';
export const SHARKSTORM_NONE = 'not_created';

export function sharkstormData(content) {
  return content?.hazards?.get?.(SHARKSTORM_ID) ?? { states: {} };
}

export function sharkstormStates(content) {
  return sharkstormData(content).states ?? {};
}

const valueName = (content) => sharkstormData(content).value ?? SHARKSTORM_ID;

const flareName = (content) => sharkstormData(content).flareValue ?? `${SHARKSTORM_ID}_flare`;
const flareRoomsName = (content) => `${flareName(content)}_rooms`;

/**
 * The state it's in now ("not_created" until the story makes it). Story
 * Phase 17: a temporary flare (a state marked "temporary", e.g. the
 * Fire-Sharkstorm) wins over the saved state while it lasts; the state
 * underneath is untouched and comes back when the flare ends.
 */
export function sharkstormState(content, session) {
  const flare = session?.story?.getValue?.(flareName(content));
  if (flare && sharkstormStates(content)[flare]?.temporary) return flare;
  return sharkstormBaseState(content, session);
}

/** The saved state under any flare. */
export function sharkstormBaseState(content, session) {
  return session?.story?.getValue?.(valueName(content)) ?? SHARKSTORM_NONE;
}

/**
 * Story Phase 17: starts a temporary flare. It ends when the story says
 * ("end_flare"), or by itself after "expiresAfterRooms" room changes (so
 * nothing can leave the storm burning for good).
 */
export function setSharkstormFlare(content, session, id) {
  const state = sharkstormStates(content)[id];
  if (!state?.temporary) throw new Error(`The Great Sharkstorm state "${id}" isn't a temporary flare`);
  session.story.setValue(flareName(content), id);
  session.story.setVar(flareRoomsName(content), state.temporary.expiresAfterRooms ?? 6);
}

export function endSharkstormFlare(content, session) {
  session.story.setValue(flareName(content), null);
  session.story.setVar(flareRoomsName(content), 0);
}

/** A room change: a flare's countdown ticks, and it goes out at zero. Returns true when it ended. */
export function tickSharkstormFlare(content, session) {
  const story = session?.story;
  if (!story?.getValue?.(flareName(content))) return false;
  const left = story.getVar(flareRoomsName(content), 0) - 1;
  if (left > 0) {
    story.setVar(flareRoomsName(content), left);
    return false;
  }
  endSharkstormFlare(content, session);
  return true;
}

/** Is a flare burning now? */
export function sharkstormFlare(content, session) {
  const flare = session?.story?.getValue?.(flareName(content));
  return flare && sharkstormStates(content)[flare]?.temporary ? flare : null;
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
