/**
 * Story Phase 16: the hornet swarm (Brogath's Hornet Fart). Comic and
 * supernatural, never painful: hornets are a nuisance you can see and hear,
 * not enemies. Rules only; world/HornetSwarm.js draws them.
 *
 * Not thousands of insects: one story value says what the swarm is doing, and
 * each state says how many hornets each room shows (a pooled handful of small
 * sprites), whether some of them stay round the captain's beard, and where
 * the rest gather (data/hazards/hornets.json):
 *
 *   "hornets": {
 *     "value": "hornet_swarm", "default": "DORMANT", "max": 48,
 *     "states": {
 *       "SWARMING": { "maps": { "main_deck": 40, "crew_quarters": 16 }, "follow": 0, "anchors": { "crew_quarters": [12, 14] } },
 *       "BEARD_ATTRACTED": { "maps": { "main_deck": 12 }, "follow": 14 },
 *       "DISPERSING": { "maps": { "main_deck": 6 }, "leave": true }
 *     },
 *     "buzz": "hornet_buzz"
 *   }
 *
 * States: DORMANT SCATTERED ALERT SWARMING BEARD_ATTRACTED BANK_INVADING
 * BUNKER_SIEGE DISPERSING. DORMANT shows none anywhere. Nothing blocks the
 * way: the captain can always walk through them.
 */

export const HORNET_STATES = ['DORMANT', 'SCATTERED', 'ALERT', 'SWARMING', 'BEARD_ATTRACTED', 'BANK_INVADING', 'BUNKER_SIEGE', 'DISPERSING'];

export function hornetDef(content) {
  return content?.hazards?.get?.('hornets') ?? null;
}

export function hornetState(content, session) {
  const def = hornetDef(content);
  if (!def) return 'DORMANT';
  return session.story.getValue(def.value ?? 'hornet_swarm') ?? def.default ?? 'DORMANT';
}

/** What the swarm looks like on one map: { state, count, follow, anchor, leave }. */
export function hornetsOn(content, session, map) {
  const def = hornetDef(content);
  const state = hornetState(content, session);
  const st = def?.states?.[state] ?? {};
  const max = def?.max ?? 48;
  const count = Math.max(0, Math.min(max, st.maps?.[map] ?? 0));
  const follow = count > 0 || st.follow ? Math.min(max - count, st.follow ?? 0) : 0;
  return { state, count, follow: Math.max(0, follow), anchor: st.anchors?.[map] ?? null, leave: !!st.leave };
}

export function setHornets(content, session, state) {
  const def = hornetDef(content);
  if (!def) throw new Error('No hornet swarm (data/hazards/hornets.json)');
  if (!HORNET_STATES.includes(state) || !def.states?.[state]) throw new Error(`No hornet state "${state}"`);
  session.story.setValue(def.value ?? 'hornet_swarm', state);
}
