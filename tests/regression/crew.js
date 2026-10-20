import { BED_POSES, ALOFT_POSES, bedsAt } from '../../src/maps/compileMap.js';
import { roomGuard } from '../../src/world/placements.js';
import { evaluateCondition } from '../../src/systems/conditions/conditions.js';
import { liveSolid, live, activeWarps, activeSpawns, tilesOf, phaseOfChapter } from './world.js';

/**
 * Crew placement and lifecycle (docs/gameplay-overhaul/02-crew-audit.md).
 *
 * Where someone is comes from the rooms' placement rows, exactly as the game
 * reads them (src/world/placements.js): per room, the first row whose "if"
 * holds wins; "absent": true means "not in this room"; a room guard keeps
 * people out of rooms their definition doesn't allow. Per phase end, every
 * NPC gets one state:
 *   present     placed in exactly one room
 *   duplicate   placed in more than one room at once (a lifecycle error)
 *   away        no room places them, and some room's matching row says
 *               "absent" (the story deliberately has them elsewhere)
 *   unmatched   they have placement rows, but none matches anywhere
 *   scene-only  no placement rows at all: scripts spawn them for scenes
 */

/** The first placement row for `npc` in a room whose condition holds (the game's rule), or null. */
export function firstMatch(objects, npc, session) {
  for (const o of objects ?? []) {
    if (o.type !== 'npc' || o.npc !== npc) continue;
    if (o.if && !evaluateCondition(o.if, session)) continue;
    return o;
  }
  return null;
}

/** Which NPCs have placement rows in which rooms (static, from the merged maps). */
export function placementRooms(models) {
  const out = new Map();
  for (const [map, m] of models) {
    for (const o of m.objects) {
      if (o.type !== 'npc') continue;
      if (!out.has(o.npc)) out.set(o.npc, new Set());
      out.get(o.npc).add(map);
    }
  }
  return out;
}

/** The first story phase each NPC speaks a line in a chapter script ("id: ..." / "id[mood]: ..."), or null. */
export function firstLinePhases(content) {
  const out = new Map();
  const visit = (x, phase) => {
    if (typeof x === 'string') {
      const m = /^([a-z_0-9]+)(\[[a-z_]+\])?:\s/.exec(x);
      if (m && (!out.has(m[1]) || out.get(m[1]) > phase)) out.set(m[1], phase);
    } else if (Array.isArray(x)) x.forEach((v) => visit(v, phase));
    else if (x && typeof x === 'object') Object.values(x).forEach((v) => visit(v, phase));
  };
  for (const id of content.scripts.ids()) {
    const prefix = id.split('.')[0];
    const phase = id.startsWith('cutscene.') ? 1 : phaseOfChapter(prefix);
    if (phase) visit(content.scripts.get(id), phase);
  }
  return out;
}

/**
 * Every NPC's state at one point in the story.
 * @param {Map<string, object>} roomReports map id -> analyzeRoom() result (for choke tiles)
 */
export function crewAt(content, session, models, roomReports = new Map(), rowsByNpc = placementRooms(models)) {
  const guards = new Map([...models.keys()].map((map) => [map, roomGuard(content.npcs, map)]));
  const solids = new Map();
  const solidOf = (map) => {
    if (!solids.has(map)) solids.set(map, liveSolid(models.get(map), session));
    return solids.get(map);
  };
  const out = {};
  for (const npc of content.npcs.list().map((n) => n.id).sort()) {
    const placed = [];
    const absentRows = [];
    const guarded = [];
    for (const map of [...(rowsByNpc.get(npc) ?? [])].sort()) {
      const row = firstMatch(models.get(map).objects, npc, session);
      if (!row) continue;
      if (row.absent) absentRows.push(`${map}:${row.id ?? '?'}`);
      else if (!guards.get(map)(npc)) guarded.push(`${map}:${row.id ?? '?'}`);
      else placed.push([map, row]);
    }
    const rec = { state: null };
    if (!rowsByNpc.has(npc)) rec.state = 'scene-only';
    else if (placed.length > 1) rec.state = 'duplicate';
    else if (placed.length === 1) rec.state = 'present';
    else if (absentRows.length) rec.state = 'away';
    else rec.state = 'unmatched';
    if (placed.length) {
      rec.at = placed.map(([map, row]) => {
        const m = models.get(map);
        const inBounds = row.x >= 0 && row.y >= 0 && row.x < m.width && row.y < m.height;
        const k = row.y * m.width + row.x;
        const inBed = BED_POSES.includes(row.pose) && bedsAt(m, row.x, row.y, (c) => evaluateCondition(c, session)).length > 0;
        const onSolid = inBounds && solidOf(map)[k] === 1 && !inBed;
        const onWarp = activeWarps(m, session).some((w) => tilesOf(w).some(([x, y]) => x === row.x && y === row.y));
        const onSpawn = activeSpawns(m, session).some((s) => s.x === row.x && s.y === row.y);
        const report = roomReports.get(map);
        const xy = `${row.x},${row.y}`;
        const flags = [];
        if (!inBounds) flags.push('out-of-bounds');
        if (onSolid) flags.push('on-solid-tile');
        if (onWarp) flags.push('on-door');
        if (onSpawn) flags.push('on-arrival-point');
        if (!ALOFT_POSES.includes(row.pose) && !row.blocks && report?.peopleOnChokeTiles?.includes(`${npc}@${xy}`)) flags.push('on-choke-tile');
        if (!ALOFT_POSES.includes(row.pose) && !row.blocks && report?.peopleOnCriticalChokeTiles?.includes(`${npc}@${xy}`)) flags.push('on-critical-choke-tile');
        if (row.blocks) flags.push('deliberate-gate');
        return { room: map, x: row.x, y: row.y, pose: row.pose ?? null, row: row.id ?? null, flags };
      });
    }
    if (!placed.length && absentRows.length) rec.absentBy = absentRows;
    if (guarded.length) rec.guardedOut = guarded;
    if (session.party?.has?.(npc)) rec.inParty = true;
    out[npc] = rec;
  }
  return out;
}

/**
 * NPCs an open objective needs right now: talk targets, and people whose
 * dialogue is keyed to the objective (objectiveActive). Each must be placed
 * somewhere, or the objective can't be reached.
 */
export function requiredNpcs(content, session) {
  const q = session.quests;
  const open = [];
  for (const quest of q.activeQuests()) {
    const qid = quest.id ?? quest;
    for (const o of q.def(qid)?.objectives ?? []) {
      if (q.isObjectiveDone(qid, o.id) || !q.isObjectiveAvailable(qid, o.id)) continue;
      open.push([qid, o]);
    }
  }
  const need = new Map();
  for (const [qid, o] of open) if (o.type === 'talk' && o.target) need.set(o.target, `${qid}.${o.id}`);
  for (const n of content.npcs.list()) {
    const s = JSON.stringify(n.dialogue ?? []);
    for (const [qid, o] of open) if (s.includes(`"objectiveActive":"${qid}.${o.id}"`)) { if (!need.has(n.id)) need.set(n.id, `${qid}.${o.id}`); }
  }
  return need;
}

/** Unbroken runs of consecutive phases: [1,2,3,10,11] -> [[1,2,3],[10,11]]. */
const runs = (phases) => {
  const out = [];
  for (const p of phases.slice().sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && p === last[last.length - 1] + 1) last.push(p);
    else out.push([p]);
  }
  return out;
};

const ranges = (phases) => {
  const out = [];
  for (const p of phases.slice().sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && p === last[1] + 1) last[1] = p;
    else out.push([p, p]);
  }
  return out.map(([a, b]) => (a === b ? `P${a}` : `P${a}-P${b}`)).join(', ');
};

/**
 * Lifecycle findings across the phase ends. `byPhase` is [{ n, crew: crewAt(...), required: requiredNpcs(...) }].
 * Every finding is { type, npc, phases, detail }; `classify` attaches the known-issues status.
 */
export function lifecycleFindings(content, byPhase, { storageRooms = ['cargo_hold'], shelterPhases = {} } = {}) {
  const findings = [];
  const firstLine = firstLinePhases(content);
  const npcs = Object.keys(byPhase[0].crew);
  for (const npc of npcs) {
    const present = byPhase.filter((p) => ['present', 'duplicate'].includes(p.crew[npc].state)).map((p) => p.n);
    const rec = (n) => byPhase.find((p) => p.n === n).crew[npc];
    // Duplicates, illegal tiles.
    const dup = byPhase.filter((p) => p.crew[npc].state === 'duplicate').map((p) => p.n);
    if (dup.length) findings.push({ type: 'duplicate', npc, phases: dup, detail: `placed in two rooms at once (${dup.map((n) => `P${n}: ${rec(n).at.map((a) => a.room).join(' + ')}`).join('; ')})` });
    for (const flag of ['out-of-bounds', 'on-solid-tile']) {
      const bad = byPhase.filter((p) => (p.crew[npc].at ?? []).some((a) => a.flags.includes(flag))).map((p) => p.n);
      if (bad.length) findings.push({ type: flag, npc, phases: bad, detail: bad.map((n) => rec(n).at.filter((a) => a.flags.includes(flag)).map((a) => `P${n} ${a.room}@${a.x},${a.y} (row ${a.row})`).join('; ')).join('; ') });
    }
    const guardedOut = byPhase.filter((p) => p.crew[npc].guardedOut).map((p) => p.n);
    if (guardedOut.length) findings.push({ type: 'guarded-out', npc, phases: guardedOut, detail: `a matching row places them in a room their definition doesn't allow (${rec(guardedOut[0]).guardedOut.join(', ')})` });
    // Required by an open objective but placed nowhere.
    const missing = byPhase.filter((p) => p.required.has(npc) && !['present', 'duplicate'].includes(p.crew[npc].state)).map((p) => p.n);
    if (missing.length) findings.push({ type: 'missing-required', npc, phases: missing, detail: missing.map((n) => `P${n}: needed by ${byPhase.find((p) => p.n === n).required.get(npc)}`).join('; ') });
    if (!present.length) continue;
    const first = present[0];
    const last = present[present.length - 1];
    // Gone for good before the end, with no placement after.
    if (last < byPhase[byPhase.length - 1].n) {
      const after = rec(last + 1);
      findings.push({ type: 'vanished', npc, phases: [last], detail: `last placed at the end of P${last} (${rec(last).at.map((a) => a.room).join(', ')}); from P${last + 1} on: ${after.state}${after.absentBy ? ` by ${after.absentBy.slice(0, 3).join(', ')}` : ''}` });
    }
    // Absent between appearances (one finding per phase: each can have its own reason).
    for (const n of byPhase.filter((p) => p.n > first && p.n < last && !present.includes(p.n)).map((p) => p.n)) {
      findings.push({ type: 'temporary-absence', npc, phases: [n], detail: `P${n}: ${rec(n).state}${rec(n).absentBy ? ` (${rec(n).absentBy.slice(0, 2).join(', ')})` : ''}` });
    }
    // Standing in storage outside the story's own sheltering phases (one finding per unbroken run of phases).
    const stranded = byPhase.filter((p) => (p.crew[npc].at ?? []).some((a) => storageRooms.includes(a.room) && !(shelterPhases[a.room] ?? []).includes(p.n))).map((p) => p.n);
    for (const run of runs(stranded)) findings.push({ type: 'stranded-in-storage', npc, phases: run, detail: `in ${storageRooms.join('/')} at ${ranges(run)}` });
    // In the world before their first line in a chapter.
    const line = firstLine.get(npc) ?? null;
    if (line !== null && first < line) findings.push({ type: 'placed-before-first-line', npc, phases: [first], detail: `placed from P${first}; first chapter line in P${line}` });
    if (line !== null && first === line) findings.push({ type: 'first-presence-with-first-line', npc, phases: [first], detail: `not in the world before P${first}, the phase of their first chapter line` });
  }
  return findings.sort((a, b) => a.type.localeCompare(b.type) || a.npc.localeCompare(b.npc) || a.phases[0] - b.phases[0]);
}

/**
 * Attaches a status from the known-issues list (tests/regression/known-issues.json):
 *   known-defect   an established problem a later prompt will fix
 *   intentional    the story means it
 *   uncertain      needs a human decision
 *   observation    recorded for reference (not a problem in itself)
 *   new            not classified: a regression until someone classifies or fixes it
 * Known entries that no longer match anything come back as `resolved`.
 */
export function classify(findings, known = []) {
  const used = new Set();
  const out = findings.map((f) => {
    const i = known.findIndex((k) => k.type === f.type && k.npc === f.npc && (!k.phases || f.phases.every((p) => k.phases.includes(p))));
    if (i < 0) return { ...f, status: 'new' };
    used.add(i);
    return { ...f, status: known[i].status, note: known[i].note };
  });
  const resolved = known.filter((_, i) => !used.has(i));
  return { findings: out, resolved };
}

/** Lifecycle types that are errors (anything 'new' of these fails the regression test). Others are observations. */
export const LIFECYCLE_ERRORS = ['duplicate', 'out-of-bounds', 'on-solid-tile', 'guarded-out', 'missing-required', 'vanished', 'temporary-absence', 'stranded-in-storage', 'placed-before-first-line'];

/** Rows for a per-phase crew table: who is where. */
export function crewByRoom(crew) {
  const rooms = {};
  for (const [npc, rec] of Object.entries(crew)) for (const a of rec.at ?? []) (rooms[a.room] ??= []).push(npc);
  for (const r of Object.values(rooms)) r.sort();
  return rooms;
}


