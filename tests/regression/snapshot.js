import { currentChapter } from '../../src/systems/story/progress.js';
import { evaluateCondition } from '../../src/systems/conditions/conditions.js';
import { placementChoices, roomGuard } from '../../src/world/placements.js';
import { PHASES, phaseOfChapter, sessionAt, roomModels } from './world.js';
import { analyzeRoom } from './rooms.js';
import { crewAt, requiredNpcs, placementRooms, crewByRoom } from './crew.js';

/**
 * Phase-end snapshots: one deterministic, reviewable record per story phase
 * of the story, crew, rooms and existing gameplay state. No timestamps, no
 * random values, keys sorted on write (world.js stableStringify), lists
 * sorted. Flags are stored as what each phase added and removed, so a
 * snapshot reads as "what this phase changed".
 *
 * Planned systems that don't exist yet are listed under gameplay.unsupported
 * rather than invented.
 */
export const SNAPSHOT_SCHEMA = 1;

/** Planned systems (docs/gameplay-overhaul/04-gameplay-systems.md) with no state in the game yet. */
export const UNSUPPORTED = {
  roomAtmosphere: 'planned (Prompt 7): per-room air simulation (sources, ventilation, drift). What exists is recorded under systems: the ship-wide atmosphere, per-room overrides (Phase 16) and fume zones per room',
  beardSaturation: 'planned (Prompt 9); the beard keeps contamination tags only',
  crewConditions: 'planned (Prompt 22); crew have no condition or morale state',
  challengeOutcomes: 'planned (Prompt 3); no challenge records an outcome (see the challenge registry)',
  fieldCombat: 'planned (Prompt 27); battles are turn-based encounters only',
};

/** Values of the game's existing systems, found through their own data definitions. */
function systemsState(content, session) {
  const story = session.story;
  const out = {};
  const getValue = (name) => (name ? story.getValue(name, null) : null);
  const getVar = (name) => (name ? story.getVar(name, 0) : 0);
  const atmo = content.atmosphere?.get?.('ship');
  if (atmo?.value) out.atmosphere = getValue(atmo.value) ?? atmo.default ?? null;
  if (atmo) {
    const prefix = atmo.roomPrefix ?? 'room_atmosphere_';
    out.roomAtmospheres = Object.fromEntries(content.maps.ids().sort().map((m) => [m, getValue(`${prefix}${m}`)]).filter(([, v]) => v));
  }
  out.deadCenter = getValue('dead_center');
  for (const id of ['great_sharkstorm', 'hornets']) {
    const def = content.hazards?.get?.(id);
    if (def?.value) out[id] = getValue(def.value);
  }
  for (const id of content.stability?.ids?.() ?? []) {
    const s = content.stability.get(id);
    out[`stability.${id}`] = { pressure: getVar(s.pressureVar), state: getValue(s.stateValue) };
  }
  const fz = content.fartZone?.get?.('zone');
  if (fz) out.fartZone = { state: getValue(fz.stateValue), door: getValue(fz.doorValue), portholes: getValue(fz.portholesValue), damage: getVar(fz.damageVar), releases: getVar(fz.releasesVar) };
  const prefix = content.beard?.get?.('beard')?.flagPrefix;
  if (prefix) out.beardTags = story.allFlags().filter((f) => f.startsWith(prefix)).sort();
  out.tv = Object.fromEntries((content.tv?.ids?.() ?? []).sort().filter((id) => content.tv.get(id)?.stateValue).map((id) => [id, getValue(content.tv.get(id).stateValue)]));
  // Overhaul Prompt 5: each structural section's integrity (no chapter damages the ship, so every phase ends whole).
  if (session.ship) {
    const o = session.ship.overall();
    out.ship = { overall: o.pct, destroyed: o.destroyed, sections: session.ship.serialize().sections };
  }
  return out;
}

/**
 * Everything measured at one phase end: the snapshot, plus the full crew
 * records and required NPCs the lifecycle analysis needs. `prevFlags` (the
 * previous phase's flags) only serves the flag delta.
 */
export function measurePhase(content, phase, prevFlags = []) {
  const session = sessionAt(content, phase.preset);
  const models = roomModels(content);
  const story = session.story;
  const flags = story.allFlags().slice().sort();
  const prev = new Set(prevFlags);
  const now = new Set(flags);

  // Story: chapter, the chapter-start conditions that must hold by now, quests.
  const chapter = currentChapter(content.game, session);
  const due = content.game.chapters.filter((c) => c.if && phaseOfChapter(c.id) !== null && phaseOfChapter(c.id) <= phase.n);
  const failing = due.filter((c) => !evaluateCondition(c.if, session)).map((c) => c.id);
  const quests = session.quests;
  const completed = quests.completedQuests().map((q) => q.id ?? q).sort();
  const active = quests.activeQuests().map((q) => q.id ?? q).sort();
  const openObjectives = [];
  for (const qid of active) {
    for (const o of quests.def(qid)?.objectives ?? []) if (!quests.isObjectiveDone(qid, o.id)) openObjectives.push(`${qid}.${o.id}${quests.isObjectiveAvailable(qid, o.id) ? '' : ' (locked)'}`);
  }
  const openByDesign = active.filter((q) => quests.def(q)?.open);

  // Rooms, then crew (crew flags read the rooms' choke tiles).
  const rooms = {};
  const reports = new Map();
  for (const [map, model] of [...models].sort(([a], [b]) => a.localeCompare(b))) {
    const people = new Map([...placementChoices(model.objects, session, roomGuard(content.npcs, map))].filter(([, o]) => o));
    const r = analyzeRoom(content, model, session, people);
    rooms[map] = r;
    reports.set(map, r);
  }
  const crew = crewAt(content, session, models, reports, placementRooms(models));
  const required = requiredNpcs(content, session);

  const party = session.party.members.map((m) => {
    const s = m.serialize();
    return { id: s.id, level: s.level, hp: s.hp, equipment: s.equipment, abilities: s.abilities.slice().sort() };
  });
  const inv = session.inventory.serialize();
  const items = inv.items ?? {};

  const snapshot = {
    schema: SNAPSHOT_SCHEMA,
    phase: phase.n,
    label: phase.label,
    preset: phase.preset,
    story: {
      chapter: `${chapter.id}: ${chapter.name}`,
      location: session.location ? `${session.location.map}@${session.location.x ?? '-'},${session.location.y ?? '-'}` : null,
      flags: { count: flags.length, added: flags.filter((f) => !prev.has(f)), removed: [...prev].filter((f) => !now.has(f)).sort() },
      chapterStarts: { checked: due.length, failing },
      quests: { completed: completed.length, completedIds: completed, active, openByDesign, unexpectedOpen: active.filter((q) => !openByDesign.includes(q)), openObjectives: openObjectives.sort() },
      consequences: { vars: story.serialize().vars, values: story.serialize().values },
    },
    crew: Object.fromEntries(Object.entries(crew).map(([npc, rec]) => [npc, compactCrew(rec)])),
    crewSummary: {
      byRoom: Object.fromEntries(Object.entries(crewByRoom(crew)).map(([room, ids]) => [room, ids])),
      required: Object.fromEntries([...required].sort()),
    },
    rooms,
    gameplay: {
      party,
      gold: inv.gold,
      items,
      systems: systemsState(content, session),
      unsupported: UNSUPPORTED,
    },
  };
  return { snapshot, flags, crew, required };
}

/** The snapshot for one phase. */
export function buildSnapshot(content, phase, prevFlags = []) {
  return measurePhase(content, phase, prevFlags).snapshot;
}

/** One readable line per character: "present main_deck@9,6:sit [on-choke-tile]" or "away (cargo_hold:p9h_x)". */
function compactCrew(rec) {
  const party = rec.inParty ? ' {party}' : '';
  if (rec.at?.length) {
    const where = rec.at.map((a) => `${a.room}@${a.x},${a.y}${a.pose ? `:${a.pose}` : ''}${a.flags.length ? ` [${a.flags.join(' ')}]` : ''}`).join(' + ');
    return `${rec.state} ${where}${party}`;
  }
  if (rec.absentBy) return `${rec.state} (${rec.absentBy.slice(0, 2).join(', ')}${rec.absentBy.length > 2 ? `, +${rec.absentBy.length - 2}` : ''})${party}`;
  return `${rec.state}${rec.guardedOut ? ` guarded-out(${rec.guardedOut.join(', ')})` : ''}${party}`;
}

/**
 * All phase ends, in story order: { snapshots, lifecycle } where lifecycle is
 * the input for crew.js lifecycleFindings ([{ n, crew, required }]).
 */
export function measureAll(content, phases = PHASES) {
  const snapshots = [];
  const lifecycle = [];
  let prevFlags = [];
  for (const phase of phases) {
    const m = measurePhase(content, phase, prevFlags);
    snapshots.push(m.snapshot);
    lifecycle.push({ n: phase.n, crew: m.crew, required: m.required });
    prevFlags = m.flags;
  }
  return { snapshots, lifecycle };
}
