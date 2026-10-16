/**
 * Story Phase 16: the STENCHMASTER FART ZONE. Rules only (the room is a map,
 * stenchmaster_fart_zone; its door, portholes, damage and smell are props and
 * hazes that read these values). Not a gas simulation and not a crowd: one
 * occupant at a time, a short queue, and authored releases.
 *
 * data/story/fart_zone.json:
 *
 *   "zone": {
 *     "map": "stenchmaster_fart_zone",
 *     "stateValue": "fz_state",        // IDLE QUEUED ENTERING PREPARING RELEASING VENTILATING COMPLETE
 *     "occupantValue": "fz_occupant",  // who is inside (an NPC id), or unset
 *     "queueValue": "fz_queue",        // "brogath,vindicta" (story values are strings)
 *     "doorValue": "fz_door",          // "open" | "closed"
 *     "portholesValue": "fz_portholes",// "open" | "closed"
 *     "damageVar": "fz_damage",        // 0.. (the door bends, the frame splits)
 *     "releasesVar": "fz_releases",    // how many releases the room has taken
 *     "doneFlagPrefix": "fz_done_",    // a release id is processed exactly once
 *     "releases": { "vindicta_legendary": { "damage": 2, "odor": "VINDICTA_RELEASE" }, ... },
 *     "rules": [ "If a Grand Stenchmaster feels a major release coming, enter the room.", ... ]
 *   }
 *
 * A release is only processed with the door shut and the portholes open (the
 * posted procedure); `releaseProblems` says what's wrong otherwise, so scripts
 * can have the captain enforce it. Releasing marks the id done: running it
 * again (a reload, a debug jump) does nothing.
 */

export const FART_ZONE_STATES = ['IDLE', 'QUEUED', 'ENTERING', 'PREPARING', 'RELEASING', 'VENTILATING', 'COMPLETE'];

export function fartZoneDef(content) {
  return content?.fartZone?.get?.('zone') ?? null;
}

const V = (def, k, d) => def?.[k] ?? d;

export function readFartZone(def, session) {
  const s = session.story;
  const q = s.getValue(V(def, 'queueValue', 'fz_queue'));
  return {
    state: s.getValue(V(def, 'stateValue', 'fz_state')) ?? 'IDLE',
    occupant: s.getValue(V(def, 'occupantValue', 'fz_occupant')) ?? null,
    queue: q ? String(q).split(',').filter(Boolean) : [],
    door: s.getValue(V(def, 'doorValue', 'fz_door')) ?? 'open',
    portholes: s.getValue(V(def, 'portholesValue', 'fz_portholes')) ?? 'closed',
    damage: s.getVar(V(def, 'damageVar', 'fz_damage'), 0),
    releases: s.getVar(V(def, 'releasesVar', 'fz_releases'), 0),
  };
}

function setState(def, session, st) {
  if (!FART_ZONE_STATES.includes(st)) throw new Error(`Fart Zone: no state "${st}"`);
  session.story.setValue(V(def, 'stateValue', 'fz_state'), st);
}

function setQueue(def, session, list) {
  session.story.setValue(V(def, 'queueValue', 'fz_queue'), list.length ? list.join(',') : null);
}

/** Joins the queue (once: someone already queued or inside isn't added again). */
export function enqueue(def, session, who) {
  const z = readFartZone(def, session);
  if (z.queue.includes(who) || z.occupant === who) return z;
  setQueue(def, session, [...z.queue, who]);
  if (z.state === 'IDLE' || z.state === 'COMPLETE') setState(def, session, 'QUEUED');
  return readFartZone(def, session);
}

/** The next in the queue goes in (or a named one, out of turn for the story). Null if nobody's waiting. */
export function enter(def, session, who = null) {
  const z = readFartZone(def, session);
  const next = who ?? z.queue[0] ?? null;
  if (!next) return null;
  if (z.occupant && z.occupant !== next) throw new Error(`Fart Zone: ${z.occupant} is still inside (one Stenchmaster at a time)`);
  setQueue(def, session, z.queue.filter((q) => q !== next));
  session.story.setValue(V(def, 'occupantValue', 'fz_occupant'), next);
  setState(def, session, 'ENTERING');
  return next;
}

export function setDoor(def, session, v) {
  if (!['open', 'closed'].includes(v)) throw new Error(`Fart Zone: door is "open" or "closed" (got "${v}")`);
  session.story.setValue(V(def, 'doorValue', 'fz_door'), v);
}

export function setPortholes(def, session, v) {
  if (!['open', 'closed'].includes(v)) throw new Error(`Fart Zone: portholes are "open" or "closed" (got "${v}")`);
  session.story.setValue(V(def, 'portholesValue', 'fz_portholes'), v);
}

/** What the posted procedure says is wrong before a release (an empty list: go ahead). */
export function releaseProblems(def, session) {
  const z = readFartZone(def, session);
  const out = [];
  if (!z.occupant) out.push('nobody inside');
  if (z.door !== 'closed') out.push('door open');
  if (z.portholes !== 'open') out.push('portholes shut');
  return out;
}

export function releaseDone(def, session, id) {
  return session.story.has(`${V(def, 'doneFlagPrefix', 'fz_done_')}${id}`);
}

/**
 * Processes a release, once. Returns { done: false } if this release already
 * happened (nothing changes), else { done: true, damage, odor }.
 */
export function release(def, session, id) {
  const r = def?.releases?.[id];
  if (!r) throw new Error(`Fart Zone: no release "${id}"`);
  if (releaseDone(def, session, id)) return { done: false };
  const s = session.story;
  s.set(`${V(def, 'doneFlagPrefix', 'fz_done_')}${id}`);
  setState(def, session, 'RELEASING');
  if (r.damage) s.addVar(V(def, 'damageVar', 'fz_damage'), r.damage);
  s.addVar(V(def, 'releasesVar', 'fz_releases'), 1);
  return { done: true, damage: r.damage ?? 0, odor: r.odor ?? null };
}

/** Portholes open, the room airs: VENTILATING. */
export function ventilate(def, session) {
  setPortholes(def, session, 'open');
  setState(def, session, 'VENTILATING');
}

/** The occupant comes out; the door opens; QUEUED if anyone's waiting, else COMPLETE. */
export function complete(def, session) {
  const z = readFartZone(def, session);
  session.story.setValue(V(def, 'occupantValue', 'fz_occupant'), null);
  setDoor(def, session, 'open');
  setState(def, session, z.queue.length ? 'QUEUED' : 'COMPLETE');
}

/** Back to an empty room (repairs aside: damage stays). */
export function resetZone(def, session) {
  session.story.setValue(V(def, 'occupantValue', 'fz_occupant'), null);
  setQueue(def, session, []);
  setState(def, session, 'IDLE');
}
