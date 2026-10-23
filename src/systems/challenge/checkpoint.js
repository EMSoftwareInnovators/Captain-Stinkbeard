import { deepClone, asArray } from '../../core/util.js';

/**
 * Checkpoints for challenges and sequences (docs/gameplay-overhaul/07-challenge-outcomes.md).
 *
 * A checkpoint is the session's persistent state, exactly what a save holds
 * (story flags, variables and values; quests; inventory and gold; the
 * party's levels, HP and equipment; world objects opened, beaten or marked;
 * the ship's condition, its leaks, water and fires; the captain's map and tile), plus the per-play hazards a save leaves out
 * (fume exposure). Restoring one is therefore never more inconsistent than
 * loading a save, and it is never written to a save: checkpoints live in the
 * session's per-play state only.
 *
 * Restoring puts every captured domain back as it was. What should survive
 * a retry is named in "keep" (flags, variables, values: a counter of tries,
 * something the captain learned), and sticky costs are applied again by the
 * challenge runner after the restore, so a retry is not a free undo.
 * NPC placements and story props follow the story, so the world restages
 * them when it hears "session:restored".
 */
export const CHECKPOINT_DOMAINS = Object.freeze(['story', 'quests', 'inventory', 'party', 'world', 'ship', 'location']);

/**
 * @param {import('../GameSession.js').GameSession} session
 * @param {object} opts
 * @param {string} opts.id        what this checkpoint is for (a challenge id, a sequence name)
 * @param {string[]} [opts.domains] the parts of the session to capture (all by default)
 * @param {object} [opts.extra]   anything else the owner needs back (challenge parameters, a seed, a resume label)
 */
export function captureCheckpoint(session, { id, label = null, domains = CHECKPOINT_DOMAINS, extra = null } = {}) {
  const state = session.serialize();
  const captured = {};
  for (const d of domains) {
    if (!CHECKPOINT_DOMAINS.includes(d)) throw new Error(`Unknown checkpoint domain "${d}" (use: ${CHECKPOINT_DOMAINS.join(', ')})`);
    captured[d] = deepClone(state[d]);
  }
  return Object.freeze({
    id,
    label,
    takenAt: session.playTime,
    map: state.location?.map ?? null,
    domains: Object.freeze(captured),
    transient: Object.freeze({ exposure: session.transient?.exposure?.value ?? null }),
    extra: extra === null ? null : Object.freeze(deepClone(extra)),
  });
}

/** What "keep" asks to survive a restore, read now (before the restore). */
function readKeep(session, keep = {}) {
  const st = session.story;
  return {
    flags: asArray(keep.flags).map((f) => [f, st.has(f)]),
    vars: asArray(keep.vars).map((v) => [v, st.vars.has(v), st.getVar(v)]),
    values: asArray(keep.values).map((v) => [v, st.getValue(v)]),
  };
}

function writeKeep(session, kept) {
  const st = session.story;
  for (const [f, on] of kept.flags) {
    if (on) st.set(f);
    else st.clear(f);
  }
  for (const [v, existed, n] of kept.vars) {
    if (existed) st.setVar(v, n);
    else st.vars.delete(v);
  }
  for (const [v, value] of kept.values) st.setValue(v, value ?? null);
}

/**
 * Puts the session back the way the checkpoint found it (only the captured
 * domains), keeps what "keep" names, and announces "session:restored" so
 * the world restages people and props. Returns what the restore undid.
 */
export function restoreCheckpoint(session, cp, { keep = {} } = {}) {
  if (!cp?.domains) throw new Error('restoreCheckpoint: not a checkpoint');
  const before = session.serialize();
  const kept = readKeep(session, keep);
  const warn = (w) => {
    throw new Error(`restoring checkpoint "${cp.id}": ${w}`);
  };
  const d = cp.domains;
  if (d.story) session.story.load(deepClone(d.story));
  if (d.quests) session.quests.load(deepClone(d.quests), warn);
  if (d.inventory) session.inventory.load(deepClone(d.inventory), warn);
  if (d.party) session.party.load(deepClone(d.party), warn);
  if (d.world) session.world.load(deepClone(d.world));
  if (d.ship && session.ship) session.ship.load(deepClone(d.ship), warn);
  if (d.location) session.location = { ...session.location, ...deepClone(d.location) };
  writeKeep(session, kept);
  const exposure = session.transient?.exposure;
  if (exposure && cp.transient?.exposure !== null && cp.transient?.exposure !== undefined) exposure.value = cp.transient.exposure;
  const undone = diffStates(before, session.serialize());
  session.bus?.emit('session:restored', { checkpoint: cp.id, undone });
  return undone;
}

/**
 * What changed between two serialized session states, in story terms:
 * flags set and cleared, variables and values changed, quests and
 * objectives moved, items and gold gained or lost, ship sections damaged
 * or repaired ([before, after] integrity).
 */
export function diffStates(before, after) {
  const out = { flagsSet: [], flagsCleared: [], vars: {}, values: {}, quests: {}, items: {}, gold: 0, ship: {}, hazards: {}, air: {}, pressure: {}, beard: {}, supplies: {} };
  if (!before || !after) return out;
  const fb = new Set(before.story?.flags ?? []);
  const fa = new Set(after.story?.flags ?? []);
  out.flagsSet = [...fa].filter((f) => !fb.has(f)).sort();
  out.flagsCleared = [...fb].filter((f) => !fa.has(f)).sort();
  for (const key of ['vars', 'values']) {
    const a = before.story?.[key] ?? {};
    const b = after.story?.[key] ?? {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) out[key][k] = [a[k] ?? null, b[k] ?? null];
  }
  const qa = before.quests ?? {};
  const qb = after.quests ?? {};
  for (const id of new Set([...Object.keys(qa), ...Object.keys(qb)])) {
    if (JSON.stringify(qa[id] ?? null) !== JSON.stringify(qb[id] ?? null)) out.quests[id] = [qa[id]?.status ?? null, qb[id]?.status ?? null];
  }
  const ia = before.inventory?.items ?? {};
  const ib = after.inventory?.items ?? {};
  for (const id of new Set([...Object.keys(ia), ...Object.keys(ib)])) {
    const delta = (ib[id] ?? 0) - (ia[id] ?? 0);
    if (delta) out.items[id] = delta;
  }
  out.gold = (after.inventory?.gold ?? 0) - (before.inventory?.gold ?? 0);
  const sa = before.ship?.sections ?? {};
  const sb = after.ship?.sections ?? {};
  for (const id of new Set([...Object.keys(sa), ...Object.keys(sb)])) if ((sa[id] ?? null) !== (sb[id] ?? null)) out.ship[id] = [sa[id] ?? null, sb[id] ?? null];
  // Prompt 6: water per compartment and fire per room ([before, after], rounded), and open leaks.
  const ha = before.ship?.hazards ?? {};
  const hb = after.ship?.hazards ?? {};
  const pairs = (a, b) => {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const x = Math.round(a[k] ?? 0);
      const y = Math.round(b[k] ?? 0);
      if (x !== y) o[k] = [x, y];
    }
    return o;
  };
  const fires = (h) => Object.fromEntries((h.fires ?? []).map((f) => [f.room, f.intensity]));
  const water = pairs(ha.water ?? {}, hb.water ?? {});
  const fire = pairs(fires(ha), fires(hb));
  const open = (h) => (h.leaks ?? []).filter((l) => l.state === 'open').map((l) => `${l.id}:${l.severity}${l.slowed ? ':slowed' : ''}`).sort().join(',');
  if (Object.keys(water).length) out.hazards.water = water;
  if (Object.keys(fire).length) out.hazards.fire = fire;
  if (open(ha) !== open(hb)) out.hazards.leaks = [(ha.leaks ?? []).filter((l) => l.state === 'open').length, (hb.leaks ?? []).filter((l) => l.state === 'open').length];
  // Prompt 7: the gas in each room (all substances, rounded quantity), openings changed, sources pouring, the captain's exposure.
  const aa = before.ship?.air ?? {};
  const ab = after.ship?.air ?? {};
  const roomGas = (a) => Object.fromEntries(Object.entries(a.gas ?? {}).map(([r, g]) => [r, Object.values(g).reduce((n, q) => n + q, 0)]));
  const gas = pairs(roomGas(aa), roomGas(ab));
  if (Object.keys(gas).length) out.air.gas = gas;
  const links = {};
  for (const k of new Set([...Object.keys(aa.links ?? {}), ...Object.keys(ab.links ?? {})])) {
    const x = aa.links?.[k]?.state ?? 'default';
    const y = ab.links?.[k]?.state ?? 'default';
    if (x !== y) links[k] = [x, y];
  }
  if (Object.keys(links).length) out.air.links = links;
  if ((aa.sources ?? []).length !== (ab.sources ?? []).length) out.air.sources = [(aa.sources ?? []).length, (ab.sources ?? []).length];
  if (Math.round(aa.exposure ?? 0) !== Math.round(ab.exposure ?? 0)) out.air.exposure = [Math.round(aa.exposure ?? 0), Math.round(ab.exposure ?? 0)];
  // Prompt 8: each Grand Stenchmaster's pressure (Garrick's here; Brogath's is his Stability variable, in vars), what he holds, his phase and eruptions.
  const pa = before.ship?.pressure?.subjects ?? {};
  const pb = after.ship?.pressure?.subjects ?? {};
  for (const id of new Set([...Object.keys(pa), ...Object.keys(pb)])) {
    const x = pa[id] ?? {};
    const y = pb[id] ?? {};
    const d = {};
    for (const k of ['on', 'phase', 'count', 'strain']) if ((x[k] ?? null) !== (y[k] ?? null)) d[k] = [x[k] ?? null, y[k] ?? null];
    for (const k of ['p', 'held']) if (Math.round(x[k] ?? 0) !== Math.round(y[k] ?? 0)) d[k] = [Math.round(x[k] ?? 0), Math.round(y[k] ?? 0)];
    if (Object.keys(d).length) out.pressure[id] = d;
  }
  // Prompt 9: the captain's beard: switched on, what it holds of each contaminant, its kept conditions, purges, what is worn.
  const ba = before.ship?.beard ?? {};
  const bb = after.ship?.beard ?? {};
  for (const k of ['on', 'phase', 'count']) if ((ba[k] ?? null) !== (bb[k] ?? null)) out.beard[k] = [ba[k] ?? null, bb[k] ?? null];
  const held = {};
  for (const id of new Set([...Object.keys(ba.held ?? {}), ...Object.keys(bb.held ?? {})])) {
    const x = Math.round(ba.held?.[id] ?? 0);
    const y = Math.round(bb.held?.[id] ?? 0);
    if (x !== y) held[id] = [x, y];
  }
  if (Object.keys(held).length) out.beard.held = held;
  const sa2 = Object.keys(ba.statuses ?? {}).sort().join(',');
  const sb2 = Object.keys(bb.statuses ?? {}).sort().join(',');
  if (sa2 !== sb2) out.beard.statuses = [sa2, sb2];
  if ((ba.worn ?? []).join(',') !== (bb.worn ?? []).join(',')) out.beard.worn = [ba.worn ?? [], bb.worn ?? []];
  // Prompt 10: the supplies: switched on, each store's stock, what each source has left, the pot, the effects running.
  const ua = before.ship?.supplies ?? {};
  const ub = after.ship?.supplies ?? {};
  if ((ua.on ?? null) !== (ub.on ?? null)) out.supplies.on = [ua.on ?? null, ub.on ?? null];
  const stock = {};
  for (const st of new Set([...Object.keys(ua.stores ?? {}), ...Object.keys(ub.stores ?? {})])) {
    for (const item of new Set([...Object.keys(ua.stores?.[st] ?? {}), ...Object.keys(ub.stores?.[st] ?? {})])) {
      const x = ua.stores?.[st]?.[item] ?? 0;
      const y = ub.stores?.[st]?.[item] ?? 0;
      if (x !== y) stock[`${st}:${item}`] = y - x;
    }
  }
  if (Object.keys(stock).length) out.supplies.stores = stock;
  const left = {};
  for (const id of new Set([...Object.keys(ua.sources ?? {}), ...Object.keys(ub.sources ?? {})])) {
    const x = ua.sources?.[id]?.taken ?? 0;
    const y = ub.sources?.[id]?.taken ?? 0;
    if (x !== y) left[id] = y - x;
  }
  if (Object.keys(left).length) out.supplies.taken = left;
  const pot = (u) => (u.cooking ? `${u.cooking.recipe}:${u.cooking.serves}` : null);
  if (pot(ua) !== pot(ub)) out.supplies.cooking = [pot(ua), pot(ub)];
  const fx = (u) => Object.keys(u.effects ?? {}).sort().join(',');
  if (fx(ua) !== fx(ub)) out.supplies.effects = [fx(ua), fx(ub)];
  return out;
}

/** True when a diff records no change at all. */
export function isEmptyDiff(d) {
  return !d.flagsSet.length && !d.flagsCleared.length && !Object.keys(d.vars).length && !Object.keys(d.values).length && !Object.keys(d.quests).length && !Object.keys(d.items).length && !d.gold && !Object.keys(d.ship ?? {}).length && !Object.keys(d.hazards ?? {}).length && !Object.keys(d.air ?? {}).length && !Object.keys(d.pressure ?? {}).length && !Object.keys(d.beard ?? {}).length && !Object.keys(d.supplies ?? {}).length;
}
