import { isPlainObject, asArray } from '../../core/util.js';
import { shipTuning } from './integrity.js';

/**
 * Ship hazards' rules (docs/gameplay-overhaul/10-flooding-and-fire.md): pure
 * functions over data/ship/hazards.json. HazardState (./HazardState.js)
 * holds the leaks, the water and the fires; this module says what they mean.
 *
 *   compartments  rooms that can hold water: capacity, and their deck (the
 *                 hold is the bilge, where water ends up)
 *   flow          how water moves between compartments: "drain" (down a
 *                 stair, while there is room below) and "spill" (over a door
 *                 sill, both ways, once the level is above the sill)
 *   leaks         which sections can leak, where by default, the severity a
 *                 section's condition allows, and when a repair seals them
 *   fire          stages, growth, fuel, which sections a room's fire burns
 *                 (and from what stage), where it can spread
 *   stations      response equipment by room (the bilge pump)
 *   actions       pump, bail, fetch water, douse, smother, patch
 *
 * Everything is keyed by room (map id) and section id, never by tile.
 */

/** Fire stages below the first one: out. */
export const FIRE_OUT = Object.freeze({ id: 'out', label: 'Out', min: 0 });
export const HAZARD_ACTIONS = Object.freeze(['pump', 'bail', 'fetch', 'douse', 'smother', 'patch']);

export function hazardData(content) {
  return content?.shipHazards ?? null;
}

const ids = (obj) => Object.keys(obj ?? {}).filter((k) => !k.startsWith('//'));

export function compartmentIds(content) {
  return ids(hazardData(content)?.compartments);
}

export function compartment(content, room) {
  const c = hazardData(content)?.compartments?.[room];
  return isPlainObject(c) && !room.startsWith('//') ? c : null;
}

export function flammableRooms(content) {
  return ids(hazardData(content)?.fire?.rooms);
}

export function fireRoom(content, room) {
  const r = hazardData(content)?.fire?.rooms?.[room];
  return isPlainObject(r) && !room.startsWith('//') ? r : null;
}

export function leakSections(content) {
  return ids(hazardData(content)?.leaks?.sections);
}

/** A flood stage by percentage (highest whose min it reaches). */
export function floodStage(def, pct) {
  const list = def?.floodStages ?? [];
  let out = list[0] ?? { id: 'dry', label: 'Dry', min: 0, work: 1, repair: 1, wade: 1, canWork: true };
  for (const s of list) if (pct >= s.min) out = s;
  return out;
}

/** A fire stage by intensity (0 or less: out). */
export function fireStage(def, intensity) {
  if (!(intensity > 0)) return FIRE_OUT;
  const list = def?.fire?.stages ?? [];
  let out = list[0] ?? FIRE_OUT;
  for (const s of list) if (intensity >= s.min) out = s;
  return out;
}

/** The rank of a fire stage id (out 0, then each stage in order), to compare "from" rules. */
export function fireRank(def, id) {
  if (id === 'out') return 0;
  const i = (def?.fire?.stages ?? []).findIndex((s) => s.id === id);
  return i < 0 ? Infinity : i + 1;
}

/** The leak severity a section's condition allows (null: none). Severities run mild to severe. */
export function leakSeverityFor(def, pct) {
  let out = null;
  for (const s of def?.leaks?.severities ?? []) if (pct < s.below) out = s;
  return out;
}

export function leakSeverity(def, id) {
  return (def?.leaks?.severities ?? []).find((s) => s.id === id) ?? null;
}

export function severityRank(def, id) {
  return (def?.leaks?.severities ?? []).findIndex((s) => s.id === id);
}

/** The hazards' side of a difficulty: the ship's tuning (data/difficulty/presets.json "ship"). */
export function hazardTuning(content, difficulty) {
  return shipTuning(content, difficulty);
}

/**
 * Which rooms open onto which (from the maps' warps, any phase's): water
 * and fire only cross where the captain could walk.
 */
export function roomLinks(content) {
  const links = new Map();
  const add = (a, b) => {
    if (!links.has(a)) links.set(a, new Set());
    links.get(a).add(b);
  };
  for (const id of content.maps?.ids?.() ?? []) {
    for (const o of content.maps.get(id).objects ?? []) {
      if (o.type !== 'warp' || !o.to?.map || o.to.map === id) continue;
      add(id, o.to.map);
      add(o.to.map, id);
    }
  }
  return links;
}

/** The water source in a room ("the sea", "the water cask"), if any. */
export function waterSource(content, room) {
  return hazardData(content)?.waterSources?.[room] ?? null;
}

/** The pump stations worked from a room. */
export function stationsIn(content, room, kind = null) {
  const out = [];
  for (const [id, s] of Object.entries(hazardData(content)?.stations ?? {})) {
    if (id.startsWith('//') || s.room !== room || (kind && s.kind !== kind)) continue;
    out.push({ id, ...s });
  }
  return out;
}

/** Everything wrong with data/ship/hazards.json, its rooms, sections and items. */
export function hazardDataProblems(content) {
  const out = [];
  const data = hazardData(content);
  const at = 'data/ship/hazards.json';
  if (!data) return [`${at}: missing`];
  const maps = content.maps;
  const sections = content.ship?.sections ?? {};
  const links = roomLinks(content);
  const linked = (a, b) => links.get(a)?.has(b) ?? false;
  const known = ['tickMs', 'compartments', 'flow', 'floodStages', 'stability', 'leaks', 'fire', 'stations', 'waterSources', 'actions'];
  for (const key of Object.keys(data)) if (!key.startsWith('//') && !known.includes(key)) out.push(`${at}: unknown field "${key}"`);
  if (!(Number.isInteger(data.tickMs) && data.tickMs >= 250 && data.tickMs <= 5000)) out.push(`${at}: tickMs must be 250 to 5000`);
  const comps = compartmentIds(content);
  for (const room of comps) {
    const c = data.compartments[room];
    if (maps && !maps.has(room)) out.push(`${at} (compartments.${room}): unknown room`);
    if (!(Number.isFinite(c.capacity) && c.capacity > 0)) out.push(`${at} (compartments.${room}): capacity must be above 0`);
    if (!['hold', 'tween'].includes(c.deck)) out.push(`${at} (compartments.${room}): deck must be "hold" or "tween"`);
    if ('x' in c || 'y' in c || 'tiles' in c) out.push(`${at} (compartments.${room}): a compartment is a room, never tiles`);
  }
  for (const [i, f] of asArray(data.flow).entries()) {
    const fa = `${at} (flow[${i}])`;
    for (const r of [f.from, f.to]) if (!comps.includes(r)) out.push(`${fa}: "${r}" is not a compartment`);
    if (f.from === f.to) out.push(`${fa}: water can't flow into the same room`);
    else if (maps && !linked(f.from, f.to)) out.push(`${fa}: ${f.from} and ${f.to} don't open onto each other (no warp between them): water can't teleport`);
    if (!['drain', 'spill'].includes(f.kind)) out.push(`${fa}: kind must be "drain" or "spill"`);
    if (f.kind === 'drain' && data.compartments?.[f.from]?.deck === 'hold' && data.compartments?.[f.to]?.deck === 'tween') out.push(`${fa}: water doesn't drain upwards`);
    if (!(f.rate > 0)) out.push(`${fa}: rate must be above 0`);
    if (f.kind === 'spill' && !(f.sill >= 0 && f.sill < 100)) out.push(`${fa}: a spill needs a sill from 0 to 99 (percent)`);
  }
  const stages = asArray(data.floodStages);
  if (!stages.length || stages[0].min !== 0) out.push(`${at}: the first flood stage must start at 0`);
  for (let i = 1; i < stages.length; i++) if (!(stages[i].min > stages[i - 1].min)) out.push(`${at}: flood stages must rise ("${stages[i].id}")`);
  for (const s of stages) {
    if (!s.id || typeof s.label !== 'string') out.push(`${at}: flood stage needs an id and a label`);
    for (const k of ['work', 'wade']) if (!(s[k] >= 1 && s[k] <= 3)) out.push(`${at}: flood stage "${s.id}" ${k} must be 1 to 3 (water never speeds anything up)`);
    if (!(s.repair >= 0 && s.repair <= 1)) out.push(`${at}: flood stage "${s.id}" repair must be 0 to 1`);
    if (typeof s.canWork !== 'boolean') out.push(`${at}: flood stage "${s.id}" canWork must be true or false`);
  }
  const st = data.stability ?? {};
  if (!(st.listing > 0 && st.foundering > st.listing && st.foundering <= 100)) out.push(`${at}: stability needs 0 < listing < foundering <= 100`);
  for (const s of asArray(st.strain?.sections)) if (!sections[s]) out.push(`${at} (stability.strain): unknown section "${s}"`);
  if (!(st.strain?.every >= 1 && st.strain?.amount > 0)) out.push(`${at} (stability.strain): needs every >= 1 and amount > 0`);
  // Leaks.
  const sevs = asArray(data.leaks?.severities);
  if (!sevs.length) out.push(`${at}: leaks need severities`);
  for (let i = 0; i < sevs.length; i++) {
    if (!(sevs[i].rate > 0)) out.push(`${at}: leak "${sevs[i].id}" rate must be above 0`);
    if (i && !(sevs[i].below < sevs[i - 1].below && sevs[i].rate > sevs[i - 1].rate)) out.push(`${at}: leak severities run mild to severe ("${sevs[i].id}": lower "below", higher rate)`);
  }
  if (!(data.leaks?.sealAt > 0 && data.leaks.sealAt <= 100)) out.push(`${at}: leaks.sealAt must be 1 to 100`);
  for (const id of leakSections(content)) {
    const l = data.leaks.sections[id];
    if (!sections[id]) out.push(`${at} (leaks.${id}): unknown section`);
    else if (!comps.includes(l.room)) out.push(`${at} (leaks.${id}): "${l.room}" is not a compartment`);
    else if (!asArray(sections[id].rooms).includes(l.room)) out.push(`${at} (leaks.${id}): the ${id} isn't worked from "${l.room}" (data/ship/integrity.json rooms)`);
  }
  // Fire.
  const fire = data.fire ?? {};
  for (const k of ['ignite', 'growth', 'decay', 'burnRate', 'damagePerIntensity', 'spreadAt', 'spreadAfter', 'spreadStart']) if (!(fire[k] > 0)) out.push(`${at}: fire.${k} must be above 0`);
  if (!(fire.water?.slows > 0 && fire.water.drowns > fire.water.slows && fire.water.slowBy > 0)) out.push(`${at}: fire.water needs 0 < slows < drowns and slowBy > 0`);
  const fstages = asArray(fire.stages);
  for (let i = 1; i < fstages.length; i++) if (!(fstages[i].min > fstages[i - 1].min)) out.push(`${at}: fire stages must rise`);
  for (const room of flammableRooms(content)) {
    const r = fire.rooms[room];
    const ra = `${at} (fire.rooms.${room})`;
    if (maps && !maps.has(room)) out.push(`${ra}: unknown room`);
    if (!(r.fuel > 0)) out.push(`${ra}: fuel must be above 0`);
    for (const b of asArray(r.burns)) {
      if (!sections[b.section]) out.push(`${ra}: burns unknown section "${b.section}"`);
      else if (!asArray(sections[b.section].rooms).includes(room)) out.push(`${ra}: a fire here can't reach the ${b.section} (not one of its rooms in data/ship/integrity.json)`);
      if (b.from !== undefined && !fstages.some((s) => s.id === b.from)) out.push(`${ra}: unknown fire stage "${b.from}"`);
    }
    for (const to of asArray(r.spread)) {
      if (!fire.rooms[to]) out.push(`${ra}: spreads to "${to}", which can't burn`);
      else if (maps && !linked(room, to)) out.push(`${ra}: spreads to "${to}" with no way between them`);
    }
  }
  for (const [id, s] of Object.entries(data.stations ?? {})) {
    if (id.startsWith('//')) continue;
    if (s.kind !== 'pump') out.push(`${at} (stations.${id}): kind must be "pump"`);
    if (maps && !maps.has(s.room)) out.push(`${at} (stations.${id}): unknown room "${s.room}"`);
    if (!asArray(s.drains).length) out.push(`${at} (stations.${id}): drains nothing`);
    for (const d of asArray(s.drains)) if (!comps.includes(d)) out.push(`${at} (stations.${id}): drains "${d}", not a compartment`);
    if ('x' in s || 'y' in s) out.push(`${at} (stations.${id}): a station is placed by room; a tile anchor belongs in presentation`);
  }
  for (const room of Object.keys(data.waterSources ?? {})) if (!room.startsWith('//') && maps && !maps.has(room)) out.push(`${at} (waterSources): unknown room "${room}"`);
  const actions = data.actions ?? {};
  for (const a of HAZARD_ACTIONS) if (!isPlainObject(actions[a])) out.push(`${at}: actions.${a} is missing`);
  for (const a of ['pump', 'bail', 'douse', 'smother']) if (!(actions[a]?.amount > 0)) out.push(`${at}: actions.${a}.amount must be above 0`);
  for (const a of HAZARD_ACTIONS) if (!(actions[a]?.seconds >= 1 && actions[a]?.seconds <= 20)) out.push(`${at}: actions.${a}.seconds must be 1 to 20 (work takes time)`);
  if (!(Number.isInteger(actions.fetch?.buckets) && actions.fetch.buckets >= 1)) out.push(`${at}: actions.fetch.buckets must be a whole number of 1 or more`);
  const items = content.items;
  const checkItems = (list, where) => {
    for (const c of asArray(list)) {
      const def = items?.get?.(c.item);
      if (!def) out.push(`${at} (${where}): unknown item "${c.item}"`);
      else if (def.type !== 'material') out.push(`${at} (${where}): "${c.item}" is not a material`);
      if (!(Number.isInteger(c.count ?? 1) && (c.count ?? 1) > 0)) out.push(`${at} (${where}): counts must be whole numbers above 0`);
    }
  };
  checkItems(actions.smother?.cost, 'actions.smother.cost');
  for (const s of sevs) {
    if (!asArray(actions.patch?.cost?.[s.id]).length) out.push(`${at}: actions.patch.cost.${s.id} is missing (every leak can be patched)`);
    checkItems(actions.patch?.cost?.[s.id], `actions.patch.cost.${s.id}`);
  }
  checkItems(actions.patch?.waste, 'actions.patch.waste');
  if (!(Number.isInteger(actions.patch?.strikes) && actions.patch.strikes >= 1 && actions.patch.strikes <= 8)) out.push(`${at}: actions.patch.strikes must be 1 to 8`);
  return out;
}
