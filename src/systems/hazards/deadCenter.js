/**
 * The Dead Center: the thick, concentrated core of the Guzzlegut Gust, which
 * (Story Phase 4 establishes) still wanders the ship. Engine-agnostic rules;
 * the world draws it through the ordinary fume system (fumes.js, FumeLayer).
 *
 * Where it is lives in story state as a text value (saved), so the story can
 * put it anywhere and later chapters can ask where it is:
 *
 *   { "deadCenter": "galley_table" }        script command: it is there now
 *   { "deadCenter": "none" }                gone from anywhere that matters
 *   { "if": { "deadCenter": "galley_table" } }   condition (a list = any of)
 *
 * The places it can be are data (data/hazards/dead_center.json):
 *
 *   "locations": {
 *     "galley_table": {
 *       "name": "the galley",                   // for "{deadCenter}" and alarms
 *       "map": "galley",
 *       "zones": [                              // fume zones, as a map's "fumes"
 *         { "level": "center", "x": 6, "y": 6, "w": 5, "h": 3 },
 *         { "level": "dense", "x": 4, "y": 5, "w": 9, "h": 5 }
 *       ],
 *       "enterFrom": [0, 4], "enterMs": 5000,   // rolls in from 4 tiles south
 *       "seals": true                           // nobody walks in while it's there
 *     }
 *   }
 *
 * Story Phase 6 (the Midnight Stenchmaster Catastrophe) makes a second,
 * stronger core: "generation 2". It is still one Dead Center (one value, one
 * place at a time); its locations carry "profile": "second", which the fume
 * layer draws in the garlic-and-onion palette, and "dead_center_profile" in
 * the data names each profile for the log and the crew.
 *
 * It is never a trap: rolling in takes seconds (the outer ring arrives
 * first), a sealed room's doors say why they won't open, and staying in it
 * only ever ends in a collapse the crew carry the captain out of.
 */
export const DEAD_CENTER_VALUE = 'dead_center';
export const DEAD_CENTER_NONE = 'none';

export function deadCenterData(content) {
  return content?.hazards?.get?.('dead_center') ?? { locations: {} };
}

export function deadCenterLocations(content) {
  return deadCenterData(content).locations ?? {};
}

/** Where the Dead Center is now (a location id), or null. */
export function deadCenterLocation(session) {
  return session?.story?.getValue?.(DEAD_CENTER_VALUE) ?? null;
}

export function setDeadCenterLocation(session, id) {
  session.story.setValue(DEAD_CENTER_VALUE, !id || id === DEAD_CENTER_NONE ? null : id);
}

export function clearDeadCenterLocation(session) {
  setDeadCenterLocation(session, null);
}

/** "the galley": the display name of where it is now (for "{deadCenter}"). */
export function deadCenterName(content, session) {
  const id = deadCenterLocation(session);
  if (!id) return 'nowhere in particular';
  return deadCenterLocations(content)[id]?.name ?? id;
}

/**
 * The fume zones a map gets from the Dead Center's locations on it. Each is
 * conditional on the Center being at that location, so the map's ordinary
 * story refresh brings it and takes it away.
 */
export function deadCenterZonesFor(content, mapId) {
  const out = [];
  for (const [id, loc] of Object.entries(deadCenterLocations(content))) {
    if (loc.map !== mapId) continue;
    (loc.zones ?? []).forEach((z, i) => {
      out.push({
        ...z,
        id: `dc_${id}_${i}`,
        if: z.if ? { all: [{ deadCenter: id }, z.if] } : { deadCenter: id },
        enterFrom: z.enterFrom ?? loc.enterFrom ?? null,
        enterMs: z.enterMs ?? loc.enterMs ?? 4000,
        deadCenter: id,
        // Story Phase 6: the second release's core ("profile": "second") draws in its own colours.
        palette: z.palette ?? loc.profile ?? null,
      });
    });
  }
  return out;
}

/** True when the Center is somewhere on `mapId` that keeps people out of it. */
export function deadCenterSeals(content, session, mapId) {
  const id = deadCenterLocation(session);
  if (!id || !mapId) return false;
  const loc = deadCenterLocations(content)[id];
  if (!loc?.seals) return false;
  return loc.seals === true ? loc.map === mapId : [].concat(loc.seals).includes(mapId);
}

/** Story Phase 6: the profile of the core where it is now ("first", "second"), or null. */
export function deadCenterProfile(content, session) {
  const id = deadCenterLocation(session);
  if (!id) return null;
  return deadCenterLocations(content)[id]?.profile ?? 'first';
}
