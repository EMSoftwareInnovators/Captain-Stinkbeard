/**
 * Story Phase 15: the Ship Atmosphere State. Not a gas simulation: one story
 * value says what the air aboard is like right now, and each state is an
 * authored set of consequences other systems read (data/story/atmosphere.json):
 *
 *   "ship": {
 *     "value": "ship_atmosphere",        // saved story value (unset = the default)
 *     "default": "NORMAL",
 *     "maps": ["main_deck", "galley", ...],  // where the ship's air applies
 *     "states": {
 *       "MELLOW_HAZE": {
 *         "label": "Mellow haze",
 *         "haze": { "level": "light", "color": "#9cb860" },  // a whole-room tint, when the room has none of its own
 *         "npcPace": 0.45,               // wanderers and routines take their time
 *         "music": "great_mellowing",    // optional overrides on the ship's maps
 *         "ambience": "mellow_ship",
 *         "notes": "..."
 *       }
 *     }
 *   }
 *
 * Dialogue, looks and placements read the value with ordinary conditions
 * ({ "value": { "name": "ship_atmosphere", "eq": "MELLOW_HAZE" } }); Brogath's
 * stability reads it through its own "mellow" entry (systems/stability.js).
 * The `atmosphere` script command changes it.
 */

export const ATMOSPHERE_STATES = ['NORMAL', 'ORDINARY_STENCH', 'BROGATH_SKUNK_HAZE', 'MELLOW_HAZE', 'BEARD_PARANOIA_HAZE', 'NOSE_FIRE_RESIDUE', 'BANK_FUMES', 'CLEARING'];

/** The ship's atmosphere definition (null if the data has none). */
export function atmosphereDef(content) {
  return content?.atmosphere?.get?.('ship') ?? null;
}

/** The current state's id. */
export function atmosphereId(content, session) {
  const def = atmosphereDef(content);
  if (!def) return 'NORMAL';
  return session.story.getValue(def.value ?? 'ship_atmosphere') ?? def.default ?? 'NORMAL';
}

/** The current state, with its id: { id, label, haze, npcPace, music, ambience, ... }. */
export function atmosphereNow(content, session) {
  const def = atmosphereDef(content);
  const id = atmosphereId(content, session);
  return { id, ...(def?.states?.[id] ?? {}) };
}

/** The state as it applies on one map (nothing off the ship's maps). */
export function atmosphereOn(content, session, map) {
  const def = atmosphereDef(content);
  if (!def || (def.maps && !def.maps.includes(map))) return { id: 'NORMAL' };
  return atmosphereNow(content, session);
}

/** Sets the state (unknown ids throw: the validator checks every one a script uses). */
export function setAtmosphere(content, session, id) {
  const def = atmosphereDef(content);
  if (!def) throw new Error('No ship atmosphere (data/story/atmosphere.json)');
  if (!def.states?.[id]) throw new Error(`No atmosphere state "${id}"`);
  session.story.setValue(def.value ?? 'ship_atmosphere', id);
  return id;
}

/** How thick each haze level is. */
const HAZE_RANK = { faint: 1, light: 2, dense: 3 };

/**
 * The haze a room shows: the ship's atmosphere (in its own colour) unless the
 * room's own haze is denser; a faint haze left over from an earlier chapter
 * gives way to it. `air` is what atmosphereOn returns.
 */
export function roomHaze(ownLevel, air) {
  const level = air?.haze?.level ?? null;
  if (level && (HAZE_RANK[level] ?? 0) >= (HAZE_RANK[ownLevel] ?? 0)) return { level, color: air.haze.color ?? null };
  return { level: ownLevel ?? null, color: null };
}
