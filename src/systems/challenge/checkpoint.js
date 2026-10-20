import { deepClone, asArray } from '../../core/util.js';

/**
 * Checkpoints for challenges and sequences (docs/gameplay-overhaul/07-challenge-outcomes.md).
 *
 * A checkpoint is the session's persistent state, exactly what a save holds
 * (story flags, variables and values; quests; inventory and gold; the
 * party's levels, HP and equipment; world objects opened, beaten or marked;
 * the captain's map and tile), plus the per-play hazards a save leaves out
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
export const CHECKPOINT_DOMAINS = Object.freeze(['story', 'quests', 'inventory', 'party', 'world', 'location']);

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
 * objectives moved, items and gold gained or lost.
 */
export function diffStates(before, after) {
  const out = { flagsSet: [], flagsCleared: [], vars: {}, values: {}, quests: {}, items: {}, gold: 0 };
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
  return out;
}

/** True when a diff records no change at all. */
export function isEmptyDiff(d) {
  return !d.flagsSet.length && !d.flagsCleared.length && !Object.keys(d.vars).length && !Object.keys(d.values).length && !Object.keys(d.quests).length && !Object.keys(d.items).length && !d.gold;
}
