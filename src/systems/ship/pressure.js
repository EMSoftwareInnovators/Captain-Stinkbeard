import { isPlainObject, asArray } from '../../core/util.js';
import { placementChoices, roomGuard } from '../../world/placements.js';
import { stabilityDef } from '../stability.js';
import { REPAIR_KINDS } from '../repairKinds.js';
import { airRoomIds, airRoom, substance, airData } from './air.js';

/**
 * Grand Stenchmaster pressure: the data and the rules that need no state
 * (docs/gameplay-overhaul/12-pressure-and-eruptions.md). The state is
 * ./PressureState.js, the captain's part ./pressureResponse.js.
 *
 * A subject is a character (a stable npc id) who builds pressure and
 * releases it into the ship. Stages are fixed ids; each subject says where
 * its own begin. Brogath is "legacy": his pressure is his Phase 14
 * Stability (systems/stability.js), so his range, his triggers and calms
 * and his reassurance prompts are that data's.
 */

export const STAGE_IDS = Object.freeze(['stable', 'uneasy', 'building', 'dangerous', 'critical', 'imminent']);
/** The thresholds a subject sets ("at"): imminent is its maximum, stable its bottom. */
export const THRESHOLD_STAGES = Object.freeze(['uneasy', 'building', 'dangerous', 'critical']);
export const SOOTHE_KINDS = Object.freeze(['prompt', 'work']);

export function pressureData(content) {
  const d = content?.shipPressure;
  return isPlainObject(d) ? d : null;
}

export function subjectIds(content) {
  return Object.keys(pressureData(content)?.subjects ?? {}).filter((k) => !k.startsWith('//'));
}

const defCache = new WeakMap();

/**
 * A subject's definition, ready to use: range, thresholds, triggers, calms
 * and modifiers (a legacy subject's from its Stability data), and every
 * block with its defaults. Null for an unknown id.
 */
export function subjectDef(content, id) {
  const data = pressureData(content);
  const raw = data?.subjects?.[id];
  if (!isPlainObject(raw) || id.startsWith('//')) return null;
  let byContent = defCache.get(content);
  if (!byContent) defCache.set(content, (byContent = new Map()));
  if (byContent.has(id)) return byContent.get(id);
  const legacyRaw = raw.legacy ? content.stability?.get?.(raw.legacy) : null;
  const legacy = legacyRaw ? stabilityDef({ id: raw.legacy, ...legacyRaw }) : null;
  const min = legacy ? legacy.min : raw.min ?? 0;
  const max = legacy ? legacy.max : raw.max ?? 100;
  const def = {
    id,
    name: raw.name ?? id,
    npc: raw.npc ?? id,
    legacy,
    available: raw.available ?? null,
    min,
    max,
    start: legacy ? legacy.settleTo ?? 0 : raw.start ?? min,
    at: { ...raw.at },
    substance: raw.substance,
    triggers: raw.triggers === 'legacy' ? legacy?.triggers ?? {} : raw.triggers ?? {},
    calms: raw.calms === 'legacy' ? legacy?.calms ?? {} : raw.calms ?? {},
    strain: raw.strain ?? 0,
    modifiers: raw.modifiers ?? {},
    soothe: { lock: 6, ...raw.soothe },
    restrain: { amount: 25, holdFactor: 1, bleed: 0, maxStrain: 3, lock: 10, failRise: 10, minStage: 'building', ...raw.restrain },
    release: { controlScale: 0.6, seconds: 2, minStage: 'uneasy', ...raw.release },
    eruption: { warn: 8, cooldown: 30, after: min, heldWeight: 1, cancelBelow: max, ...raw.eruption },
    reach: raw.reach ?? 3,
    cues: raw.cues ?? null,
    puff: raw.puff ?? null,
  };
  byContent.set(id, def);
  return def;
}

/** A stage's data: { id, label, tone, weight, calm }. */
export function stageInfo(content, id) {
  const s = pressureData(content)?.stages?.[id] ?? {};
  return { id, label: s.label ?? id, tone: s.tone ?? 'w', weight: s.weight ?? 0, calm: s.calm ?? 1 };
}

export function stageRank(id) {
  return STAGE_IDS.indexOf(id);
}

/** The stage for a pressure (imminent only while a release is counting down: `imminent`). */
export function stageFor(def, pressure, imminent = false) {
  if (imminent) return 'imminent';
  let out = 'stable';
  for (const s of THRESHOLD_STAGES) if (pressure >= (def.at[s] ?? Infinity)) out = s;
  return out;
}

/** The level a release of this intensity reaches (the last level has no "below"). */
export function levelFor(content, intensity) {
  const levels = asArray(pressureData(content)?.levels);
  return levels.find((l) => !(l.below !== undefined && intensity >= l.below)) ?? levels[levels.length - 1] ?? null;
}

export function levelInfo(content, id) {
  return asArray(pressureData(content)?.levels).find((l) => l.id === id) ?? null;
}

export function profileDef(content, id) {
  const p = pressureData(content)?.profiles?.[id];
  return isPlainObject(p) && !id.startsWith('//') ? p : null;
}

export function profileIds(content) {
  return Object.keys(pressureData(content)?.profiles ?? {}).filter((k) => !k.startsWith('//'));
}

/** The sections a release in `room` strikes, in order. */
export function impactSections(content, room) {
  return asArray(pressureData(content)?.impact?.[room]);
}

/** A damage entry's section: "room" / "room2" (the room's impact list) or a section id. */
export function damageTarget(content, entry, room) {
  const list = impactSections(content, room);
  if (entry.section === 'room') return list[0] ?? null;
  if (entry.section === 'room2') return list[1] ?? null;
  return entry.section ?? null;
}

// --- where a subject is -----------------------------------------------------

const npcRows = new WeakMap();

/** The npc's placement rows in each ship room with air (built once per content). */
function rowsFor(content, npc) {
  let byNpc = npcRows.get(content);
  if (!byNpc) npcRows.set(content, (byNpc = new Map()));
  if (byNpc.has(npc)) return byNpc.get(npc);
  const out = [];
  for (const room of airRoomIds(content)) {
    const objects = asArray(content.maps?.get?.(room)?.objects).filter((o) => o.type === 'npc' && o.npc === npc);
    if (objects.length) out.push({ room, objects });
  }
  byNpc.set(npc, out);
  return out;
}

/**
 * Where the story has a character right now: { room, x, y } in the first
 * ship room (with air) whose placements pick them, or null when they are
 * elsewhere (not yet aboard, away, on an island). The same rules the world
 * stages them by (world/placements.js), so it never invents a character.
 */
export function npcWhere(content, session, npc) {
  for (const { room, objects } of rowsFor(content, npc)) {
    const pick = placementChoices(objects, session, roomGuard(content.npcs, room)).get(npc);
    if (pick) return { room, x: pick.x, y: pick.y };
  }
  return null;
}

// --- validation ---------------------------------------------------------------

const num = (v) => typeof v === 'number' && Number.isFinite(v);

/** Problems in data/ship/pressure.json (a list of messages). */
export function pressureDataProblems(content) {
  const data = pressureData(content);
  const at = 'data/ship/pressure.json';
  if (!data) return [];
  const out = [];
  const known = ['stages', 'levels', 'profiles', 'impact', 'damage', 'limits', 'actions', 'subjects'];
  for (const key of Object.keys(data)) if (!key.startsWith('//') && !known.includes(key)) out.push(`${at}: unknown field "${key}"`);
  const sfxOk = (id) => !content.sfx?.has || content.sfx.has(id);
  const ship = content.ship;
  const lim = data.limits ?? {};
  const airLim = airData(content)?.limits ?? {};

  // Stages.
  for (const id of STAGE_IDS) {
    const s = data.stages?.[id];
    if (!isPlainObject(s)) {
      out.push(`${at} (stages): missing "${id}"`);
      continue;
    }
    if (typeof s.label !== 'string') out.push(`${at} (stages.${id}): needs a label`);
    if (!['g', 'w', 'y', 'o', 'r'].includes(s.tone)) out.push(`${at} (stages.${id}): tone is one of g, w, y, o, r`);
    if (!(num(s.weight) && s.weight >= 0)) out.push(`${at} (stages.${id}): weight must be 0 or more`);
    if (!(num(s.calm) && s.calm > 0 && s.calm <= 1)) out.push(`${at} (stages.${id}): calm must be above 0, at most 1 (how well calming works at this stage)`);
  }
  for (const id of Object.keys(data.stages ?? {})) if (!id.startsWith('//') && !STAGE_IDS.includes(id)) out.push(`${at} (stages): unknown stage "${id}" (use: ${STAGE_IDS.join(', ')})`);

  // Levels.
  const levels = asArray(data.levels);
  if (!levels.length) out.push(`${at} (levels): none`);
  let prev = -Infinity;
  levels.forEach((l, i) => {
    const la = `${at} (levels[${i}])`;
    if (typeof l.id !== 'string' || typeof l.label !== 'string') out.push(`${la}: needs an id and a label`);
    const last = i === levels.length - 1;
    if (last && l.below !== undefined) out.push(`${la}: the last level has no "below" (it takes everything above)`);
    if (!last && !(num(l.below) && l.below > prev)) out.push(`${la}: "below" must be a number above the level before`);
    if (num(l.below)) prev = l.below;
    if (l.sfx && !sfxOk(l.sfx)) out.push(`${la}: unknown sound "${l.sfx}"`);
  });
  const levelIds = levels.map((l) => l.id);

  // Profiles.
  for (const id of profileIds(content)) {
    const p = data.profiles[id];
    const pa = `${at} (profiles.${id})`;
    for (const key of Object.keys(p)) if (!key.startsWith('//') && !['level', 'gas', 'openings', 'damage', 'ignite', 'substance'].includes(key)) out.push(`${pa}: unknown field "${key}"`);
    if (!levelIds.includes(p.level)) out.push(`${pa}: level must be one of ${levelIds.join(', ')}`);
    if (p.substance !== undefined && !substance(content, p.substance)) out.push(`${pa}: unknown substance "${p.substance}"`);
    if (p.gas !== undefined) {
      if (!(num(p.gas.amount) && p.gas.amount > 0 && p.gas.amount <= 1000)) out.push(`${pa}: gas.amount must be above 0, at most 1000 (a release is finite)`);
      if (!(num(p.gas.rate) && p.gas.rate > 0 && p.gas.rate <= (airLim.rate ?? 20))) out.push(`${pa}: gas.rate must be above 0, at most ${airLim.rate ?? 20} a second (the air's limit)`);
    }
    if (p.openings !== undefined) {
      for (const k of Object.keys(p.openings)) if (!['force', 'damage', 'breakSeals', 'outside'].includes(k)) out.push(`${pa}: openings: unknown field "${k}"`);
      for (const k of ['force', 'damage']) if (p.openings[k] !== undefined && !(Number.isInteger(p.openings[k]) && p.openings[k] >= 0 && p.openings[k] <= 4)) out.push(`${pa}: openings.${k} must be a whole number 0 to 4 (a blast reaches a few openings, never the whole ship)`);
    }
    for (const [i, d] of asArray(p.damage).entries()) {
      const da = `${pa} (damage[${i}])`;
      if (!(d.section === 'room' || d.section === 'room2' || ship?.sections?.[d.section])) out.push(`${da}: section is "room", "room2" or a section of data/ship/integrity.json`);
      if (!(num(d.amount) && d.amount >= 1 && d.amount <= 60)) out.push(`${da}: amount must be 1 to 60`);
      if (d.breach !== undefined && typeof d.breach !== 'boolean') out.push(`${da}: breach is true or false`);
    }
    if (p.ignite !== undefined && !(num(p.ignite.intensity) && p.ignite.intensity >= 1 && p.ignite.intensity <= 100)) out.push(`${pa}: ignite.intensity must be 1 to 100`);
  }
  for (const l of levelIds) if (!profileDef(content, l)) out.push(`${at} (profiles): no profile for level "${l}" (each level's release needs one)`);

  // Impact.
  for (const room of Object.keys(data.impact ?? {})) {
    if (room.startsWith('//')) continue;
    if (!airRoom(content, room)) out.push(`${at} (impact.${room}): not a room with ship air`);
    for (const sec of asArray(data.impact[room])) {
      const s = ship?.sections?.[sec];
      if (!s) out.push(`${at} (impact.${room}): unknown section "${sec}"`);
      else if (!asArray(s.rooms).includes(room)) out.push(`${at} (impact.${room}): the ${sec} isn't one of this room's sections (its rooms: ${asArray(s.rooms).join(', ')})`);
    }
  }
  // A room some section covers must say what a release there strikes (a room no section covers strikes nothing).
  for (const room of airRoomIds(content)) {
    const covering = Object.keys(ship?.sections ?? {}).filter((sec) => asArray(ship.sections[sec]?.rooms).includes(room));
    if (covering.length && !asArray(data.impact?.[room]).length) out.push(`${at} (impact): no sections for "${room}" (it is part of the ${covering.join(', ')})`);
  }
  if (data.damage !== undefined) {
    if (ship?.categories && !ship.categories[data.damage.category]) out.push(`${at} (damage): unknown category "${data.damage.category}"`);
    if (!(num(data.damage.floor) && data.damage.floor >= 0.1 && data.damage.floor < 1)) out.push(`${at} (damage): floor must be 0.1 to 0.9 (a release never takes a section below it)`);
  }
  if (!(Number.isInteger(lim.modifiers) && lim.modifiers >= 1 && lim.modifiers <= 8)) out.push(`${at} (limits): modifiers must be 1 to 8`);
  if (!(num(lim.rate) && lim.rate > 0 && lim.rate <= 10)) out.push(`${at} (limits): rate must be above 0, at most 10 a second`);
  if (!(Number.isInteger(lim.seconds) && lim.seconds >= 1 && lim.seconds <= 600)) out.push(`${at} (limits): seconds must be 1 to 600`);
  if (!(num(lim.held) && lim.held > 0)) out.push(`${at} (limits): held must be above 0`);
  for (const k of ['warn', 'cooldown']) if (!(Array.isArray(lim[k]) && lim[k].length === 2 && lim[k][0] >= 1 && lim[k][1] > lim[k][0])) out.push(`${at} (limits): ${k} is [least, most] seconds`);

  // The restraint's challenge.
  const r = data.actions?.restrain;
  if (!r) out.push(`${at} (actions.restrain): missing`);
  else {
    if (!REPAIR_KINDS[r.kind]) out.push(`${at} (actions.restrain): unknown timing bar kind "${r.kind}"`);
    if (!(Number.isInteger(r.strikes) && r.strikes >= 1 && r.strikes <= 8)) out.push(`${at} (actions.restrain): strikes must be 1 to 8`);
  }

  // Subjects.
  for (const id of subjectIds(content)) out.push(...subjectProblems(content, id, `${at} (subjects.${id})`, { lim, sfxOk }));
  return out;
}

function subjectProblems(content, id, sa, { lim, sfxOk }) {
  const out = [];
  const raw = pressureData(content).subjects[id];
  const knownKeys = ['name', 'npc', 'legacy', 'available', 'min', 'max', 'start', 'at', 'substance', 'triggers', 'calms', 'strain', 'modifiers', 'soothe', 'restrain', 'release', 'eruption', 'reach', 'cues', 'puff'];
  for (const key of Object.keys(raw)) if (!key.startsWith('//') && !knownKeys.includes(key)) out.push(`${sa}: unknown field "${key}"`);
  if (!/^[a-z][a-z0-9_]*$/.test(id)) out.push(`${sa}: ids are lower_snake_case`);
  if (content.npcs?.get && !content.npcs.get(raw.npc ?? id)) out.push(`${sa}: unknown character "${raw.npc ?? id}" (a subject is a character who is really aboard)`);
  if (raw.legacy !== undefined) {
    if (!content.stability?.get?.(raw.legacy)) out.push(`${sa}: legacy names unknown stability subject "${raw.legacy}" (data/story/stability)`);
    for (const k of ['min', 'max', 'start']) if (raw[k] !== undefined) out.push(`${sa}: a legacy subject's ${k} is its Stability's`);
  } else {
    if (!(num(raw.min) && num(raw.max) && raw.max > raw.min && raw.max - raw.min >= 20 && raw.max - raw.min <= 1000)) out.push(`${sa}: min and max must be numbers, max above min (a range of 20 to 1000)`);
    if (raw.start !== undefined && !(num(raw.start) && raw.start >= raw.min && raw.start <= raw.max)) out.push(`${sa}: start must be within min and max`);
    if (raw.triggers === 'legacy' || raw.calms === 'legacy') out.push(`${sa}: "legacy" triggers or calms need a "legacy" subject`);
  }
  const def = subjectDef(content, id);
  if (!def) return out;
  if (!substance(content, raw.substance)) out.push(`${sa}: unknown substance "${raw.substance}" (data/ship/air.json)`);
  // Thresholds: every one, rising, inside the range.
  let prev = def.min;
  for (const s of THRESHOLD_STAGES) {
    const v = raw.at?.[s];
    if (!(num(v) && v > prev && v < def.max)) out.push(`${sa}: at.${s} must be above the stage before it and below the maximum (${def.max})`);
    else prev = v;
  }
  for (const k of Object.keys(raw.at ?? {})) if (!THRESHOLD_STAGES.includes(k)) out.push(`${sa}: at: unknown stage "${k}" (use: ${THRESHOLD_STAGES.join(', ')}; imminent is the maximum)`);
  const span = def.max - def.min;
  // Modifiers.
  for (const [mid, m] of Object.entries(def.modifiers)) {
    if (mid.startsWith('//')) continue;
    const ma = `${sa} (modifiers.${mid})`;
    if (!(num(m.rate) && m.rate > 0 && m.rate <= lim.rate)) out.push(`${ma}: rate must be above 0, at most ${lim.rate} a second (bounded)`);
    if (!(Number.isInteger(m.seconds) && m.seconds >= 1 && m.seconds <= lim.seconds)) out.push(`${ma}: seconds must be whole, 1 to ${lim.seconds} (a modifier always ends)`);
    if (typeof m.label !== 'string') out.push(`${ma}: needs a label (the player is told what is building him up)`);
  }
  // Triggers and calms.
  if (raw.triggers !== 'legacy') {
    for (const [tid, t] of Object.entries(def.triggers)) {
      if (tid.startsWith('//')) continue;
      if (!(num(t.pressure) && t.pressure > 0 && t.pressure <= span)) out.push(`${sa} (triggers.${tid}): pressure must be above 0, at most the range (${span})`);
      if (t.modifier !== undefined && !def.modifiers[t.modifier]) out.push(`${sa} (triggers.${tid}): unknown modifier "${t.modifier}"`);
    }
  }
  if (raw.calms !== 'legacy') {
    for (const [cid, c] of Object.entries(def.calms)) {
      if (cid.startsWith('//')) continue;
      if (!(num(c.pressure) && c.pressure < 0 && -c.pressure <= span)) out.push(`${sa} (calms.${cid}): pressure must be below 0 (a calm lowers it)`);
    }
  }
  if (!(num(def.strain) && def.strain >= 0 && def.strain <= 1)) out.push(`${sa}: strain must be 0 to 1 (how much harder each hold makes the next trigger hit)`);
  // The captain's interventions.
  const so = def.soothe;
  if (!SOOTHE_KINDS.includes(so.kind)) out.push(`${sa} (soothe): kind is ${SOOTHE_KINDS.join(' or ')}`);
  if (so.kind === 'prompt' && !def.legacy?.prompts?.[so.set]) out.push(`${sa} (soothe): prompt set "${so.set}" isn't one of the Stability's prompts`);
  if (so.kind === 'work') {
    if (!def.calms[so.calm]) out.push(`${sa} (soothe): unknown calm "${so.calm}"`);
    if (!(Number.isInteger(so.seconds) && so.seconds >= 1 && so.seconds <= 10)) out.push(`${sa} (soothe): seconds must be 1 to 10`);
  }
  if (so.refuseWhile !== undefined && !Object.values(def.modifiers).some((m) => m[so.refuseWhile] === true)) out.push(`${sa} (soothe): refuseWhile "${so.refuseWhile}" isn't a flag any of its modifiers has`);
  if (!(num(so.lock) && so.lock >= 1 && so.lock <= 60)) out.push(`${sa} (soothe): lock must be 1 to 60 seconds (no calming on every press)`);
  const re = def.restrain;
  if (!(num(re.amount) && re.amount > 0 && re.amount <= span / 2)) out.push(`${sa} (restrain): amount must be above 0, at most half the range`);
  if (!(num(re.holdFactor) && re.holdFactor >= 1 && re.holdFactor <= 3)) out.push(`${sa} (restrain): holdFactor must be 1 to 3 (holding it in never makes it smaller)`);
  if (!(num(re.bleed) && re.bleed >= 0 && re.bleed <= re.amount)) out.push(`${sa} (restrain): bleed must be 0 to the amount held a time`);
  if (!(Number.isInteger(re.maxStrain) && re.maxStrain >= 1 && re.maxStrain <= 10)) out.push(`${sa} (restrain): maxStrain must be 1 to 10`);
  if (!(num(re.failRise) && re.failRise >= 0 && re.failRise < span / 2)) out.push(`${sa} (restrain): failRise must be 0 or more, below half the range`);
  if (!(num(re.lock) && re.lock >= 1 && re.lock <= 120)) out.push(`${sa} (restrain): lock must be 1 to 120 seconds`);
  if (re.amount * re.holdFactor * re.maxStrain > lim.held * 3) out.push(`${sa} (restrain): amount x holdFactor x maxStrain is far past limits.held (contradictory: most of every hold would be lost)`);
  const rel = def.release;
  if (!(num(rel.controlScale) && rel.controlScale > 0 && rel.controlScale <= 1)) out.push(`${sa} (release): controlScale must be above 0, at most 1 (a controlled release is never bigger)`);
  if (!(Number.isInteger(rel.seconds) && rel.seconds >= 1 && rel.seconds <= 10)) out.push(`${sa} (release): seconds must be 1 to 10`);
  for (const [k, v] of [['restrain', re.minStage], ['release', rel.minStage]]) if (!STAGE_IDS.includes(v) || v === 'imminent') out.push(`${sa} (${k}): minStage must be a stage below imminent`);
  const er = def.eruption;
  if (!(num(er.warn) && er.warn >= lim.warn[0] && er.warn <= lim.warn[1])) out.push(`${sa} (eruption): warn must be ${lim.warn[0]} to ${lim.warn[1]} seconds`);
  // On the harshest difficulty (warnScale 0.5 at most) there must still be time to act.
  else if (Math.round(er.warn * 0.5) < 2) out.push(`${sa} (eruption): warn is too short: on the harshest difficulty there would be under 2 seconds to act`);
  if (!(num(er.cooldown) && er.cooldown >= lim.cooldown[0] && er.cooldown <= lim.cooldown[1])) out.push(`${sa} (eruption): cooldown must be ${lim.cooldown[0]} to ${lim.cooldown[1]} seconds (no eruption every tick)`);
  if (!(num(er.after) && er.after >= def.min && er.after < (raw.at?.building ?? def.max))) out.push(`${sa} (eruption): after must be in range and below "building" (a release relieves him)`);
  if (!(num(er.cancelBelow) && er.cancelBelow > er.after && er.cancelBelow <= def.max)) out.push(`${sa} (eruption): cancelBelow must be above "after", at most the maximum (contradictory otherwise)`);
  if (!(num(er.heldWeight) && er.heldWeight > 0 && er.heldWeight <= 2)) out.push(`${sa} (eruption): heldWeight must be above 0, at most 2`);
  if (!(Number.isInteger(def.reach) && def.reach >= 1 && def.reach <= 8)) out.push(`${sa}: reach must be 1 to 8 tiles (calming is done up close)`);
  // Cues.
  for (const [st, c] of Object.entries(def.cues ?? {})) {
    if (!STAGE_IDS.includes(st)) out.push(`${sa} (cues): unknown stage "${st}"`);
    if (c.sfx && !sfxOk(c.sfx)) out.push(`${sa} (cues.${st}): unknown sound "${c.sfx}"`);
    if (typeof c.bark !== 'string') out.push(`${sa} (cues.${st}): a cue needs words (a bark), never only a sound`);
  }
  if (!def.legacy && !def.cues) out.push(`${sa}: needs cues (a legacy subject uses its Stability's)`);
  if (def.puff) {
    if (!(num(def.puff.every) && def.puff.every >= 2)) out.push(`${sa} (puff): every must be 2 seconds or more`);
    if (def.puff.sfx && !sfxOk(def.puff.sfx)) out.push(`${sa} (puff): unknown sound "${def.puff.sfx}"`);
  }
  return out;
}
