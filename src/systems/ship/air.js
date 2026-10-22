import { isPlainObject, asArray } from '../../core/util.js';
import { roomLinks } from './hazards.js';

/**
 * The ship's air, room by room: pure functions over data/ship/air.json
 * (docs/gameplay-overhaul/11-atmosphere-and-ventilation.md). AirState
 * (./AirState.js) holds what is in each room; this module says what it means.
 *
 *   substances   what can be in the air: safe level, potency, how it decays,
 *                vents and (heavy gas) sinks
 *   rooms        each room's volume and level (deck, between decks, hold)
 *   kinds        door, hatch, stairs, porthole, windows, open sky: how much
 *                air each passes in each state, and which states it has
 *   connections  every opening, by a stable id, between two rooms or a room
 *                and "outside", with its default state
 *   quality      what a room's air is called (clean, hazy, foul, toxic, deadly)
 *   exposure     the captain's lungs: stages and what each does to him
 *
 * Not the Phase 15 ship atmosphere (systems/atmosphere.js): that is an
 * authored story value. This is a simulation, and no chapter uses it.
 */

export const OUTSIDE = 'outside';
export const AIR_STATES = Object.freeze(['open', 'closed', 'sealed']);
export const AIR_KINDS = Object.freeze(['door', 'hatch', 'stairs', 'porthole', 'window', 'sky']);

export function airData(content) {
  return content?.shipAir ?? null;
}

const ids = (obj) => Object.keys(obj ?? {}).filter((k) => !k.startsWith('//'));

export function substanceIds(content) {
  return ids(airData(content)?.substances);
}

export function substance(content, id) {
  const s = airData(content)?.substances?.[id];
  return isPlainObject(s) && !String(id).startsWith('//') ? s : null;
}

export function airRoomIds(content) {
  return ids(airData(content)?.rooms);
}

export function airRoom(content, room) {
  const r = airData(content)?.rooms?.[room];
  return isPlainObject(r) && !String(room).startsWith('//') ? r : null;
}

export function connectionIds(content) {
  return ids(airData(content)?.connections);
}

export function connection(content, id) {
  const c = airData(content)?.connections?.[id];
  return isPlainObject(c) && !String(id).startsWith('//') ? c : null;
}

export function connectionKind(content, id) {
  const c = connection(content, id);
  return c ? airData(content)?.kinds?.[c.kind] ?? null : null;
}

/** The connections that touch a room, in data order. */
export function connectionsOf(content, room) {
  return connectionIds(content).filter((id) => connection(content, id).rooms.includes(room));
}

/** The other side of a connection from `room` (a room id or "outside"). */
export function otherSide(content, id, room) {
  const c = connection(content, id);
  if (!c) return null;
  return c.rooms[0] === room ? c.rooms[1] : c.rooms[0];
}

/** A room's air quality level by its index and total concentration. */
export function qualityFor(def, index, total) {
  const levels = def?.quality?.levels ?? [];
  const trace = def?.quality?.trace ?? 1;
  if (!(total >= trace)) return levels[0] ?? { id: 'clean', label: 'Clean', index: 0 };
  if (!(index > 0)) return levels[1] ?? levels[0];
  let out = levels[2] ?? levels[0];
  for (const l of levels.slice(2)) if (index >= l.index) out = l;
  return out;
}

export function qualityRank(def, id) {
  return (def?.quality?.levels ?? []).findIndex((l) => l.id === id);
}

/** The exposure stage for a lungs value (highest whose min it reaches). */
export function exposureStage(def, value) {
  const list = def?.exposure?.stages ?? [];
  let out = list[0] ?? { id: 'clear', label: 'Clear', min: 0, work: 1, walk: 1 };
  for (const s of list) if (value >= s.min) out = s;
  return out;
}

export function exposureRank(def, id) {
  return (def?.exposure?.stages ?? []).findIndex((s) => s.id === id);
}

/**
 * Problems in data/ship/air.json, for the content validator: unknown rooms,
 * substances or kinds, connections between rooms that don't open onto each
 * other (no warp between them: gas can't teleport), bad numbers, tiles.
 */
export function airDataProblems(content) {
  const out = [];
  const data = airData(content);
  const at = 'data/ship/air.json';
  if (!data) return [`${at}: missing`];
  const maps = content.maps;
  const links = roomLinks(content);
  const linked = (a, b) => links.get(a)?.has(b) ?? false;
  const known = ['substances', 'rooms', 'kinds', 'damagedLeak', 'connections', 'quality', 'exposure', 'fire', 'limits', 'actions'];
  for (const key of Object.keys(data)) if (!key.startsWith('//') && !known.includes(key)) out.push(`${at}: unknown field "${key}"`);
  const subs = substanceIds(content);
  if (!subs.length) out.push(`${at}: no substances`);
  for (const id of subs) {
    const s = data.substances[id];
    const sa = `${at} (substances.${id})`;
    if (!/^[a-z][a-z0-9_]*$/.test(id)) out.push(`${sa}: ids are lower_snake_case`);
    if (typeof s.label !== 'string' || typeof s.short !== 'string') out.push(`${sa}: needs a label and a short label`);
    if (!(s.safe >= 0 && s.safe < 100)) out.push(`${sa}: safe must be 0 to 99 (percent)`);
    if (!(s.potency > 0 && s.potency <= 2)) out.push(`${sa}: potency must be above 0, at most 2`);
    if (!(s.decay >= 0 && s.decay < 0.5)) out.push(`${sa}: decay must be 0 to 0.5 a second`);
    if (!(s.vent > 0 && s.vent <= 2)) out.push(`${sa}: vent must be above 0, at most 2`);
    if (s.heavy && !(s.sink >= 1 && s.rise > 0 && s.rise <= 1)) out.push(`${sa}: a heavy gas needs sink (1 or more) and rise (above 0, at most 1)`);
  }
  const rooms = airRoomIds(content);
  for (const room of rooms) {
    const r = data.rooms[room];
    const ra = `${at} (rooms.${room})`;
    if (maps && !maps.has(room)) out.push(`${ra}: unknown room`);
    if (room === OUTSIDE) out.push(`${ra}: "outside" is not a room`);
    if (!(Number.isFinite(r.volume) && r.volume >= 10 && r.volume <= 10000)) out.push(`${ra}: volume must be 10 to 10000`);
    if (![0, 1, 2].includes(r.level)) out.push(`${ra}: level must be 0 (deck), 1 (between decks) or 2 (hold)`);
    if ('x' in r || 'y' in r || 'tiles' in r) out.push(`${ra}: a room's air is the whole room, never tiles`);
  }
  for (const k of ids(data.kinds)) {
    const kd = data.kinds[k];
    const ka = `${at} (kinds.${k})`;
    if (!AIR_KINDS.includes(k)) out.push(`${ka}: unknown kind (use: ${AIR_KINDS.join(', ')})`);
    const states = asArray(kd.states);
    if (!states.length || states.some((s) => !AIR_STATES.includes(s))) out.push(`${ka}: states must be from ${AIR_STATES.join(', ')}`);
    for (const s of states) if (!(kd.rates?.[s] >= 0 && kd.rates[s] <= 1)) out.push(`${ka}: rates.${s} must be 0 to 1`);
    if (states.includes('sealed') && !states.includes('closed')) out.push(`${ka}: only something that closes can be sealed`);
    if (states.length > 1 && !(kd.seconds >= 1)) out.push(`${ka}: something that can be changed needs seconds (1 or more)`);
  }
  if (!(data.damagedLeak >= 0 && data.damagedLeak <= 1)) out.push(`${at}: damagedLeak must be 0 to 1`);
  const pairs = new Set();
  for (const id of connectionIds(content)) {
    const c = data.connections[id];
    const ca = `${at} (connections.${id})`;
    const kd = data.kinds?.[c.kind];
    if (!kd) out.push(`${ca}: unknown kind "${c.kind}"`);
    const rs = asArray(c.rooms);
    if (rs.length !== 2) {
      out.push(`${ca}: rooms must be two (a room and a room, or a room and "outside")`);
      continue;
    }
    if ('x' in c || 'y' in c || 'tiles' in c) out.push(`${ca}: a connection is an opening between rooms, never tiles`);
    if (typeof c.label !== 'string') out.push(`${ca}: needs a label`);
    if (rs[0] === OUTSIDE) out.push(`${ca}: put the room first ("outside" second)`);
    for (const r of rs) if (r !== OUTSIDE && !rooms.includes(r)) out.push(`${ca}: "${r}" has no air (not in rooms)`);
    if (rs[0] === rs[1]) out.push(`${ca}: a connection joins two different places`);
    else if (rs[1] !== OUTSIDE && maps && !linked(rs[0], rs[1])) out.push(`${ca}: ${rs[0]} and ${rs[1]} don't open onto each other (no warp between them): gas can't teleport`);
    const key = [...rs].sort().join('|');
    if (rs[1] !== OUTSIDE && pairs.has(key)) out.push(`${ca}: ${rs[0]} and ${rs[1]} are already connected`);
    pairs.add(key);
    if (kd && !asArray(kd.states).includes(c.state)) out.push(`${ca}: state "${c.state}" isn't one a ${c.kind} has (${asArray(kd.states).join(', ')})`);
    if (rs[1] !== OUTSIDE && ['porthole', 'window', 'sky'].includes(c.kind)) out.push(`${ca}: a ${c.kind} opens to "outside"`);
    if (rs[1] === OUTSIDE && ['door', 'hatch', 'stairs'].includes(c.kind)) out.push(`${ca}: a ${c.kind} joins two rooms (use a porthole, windows or open sky to the outside)`);
  }
  const levels = asArray(data.quality?.levels);
  if (levels.map((l) => l.id).join(',') !== 'clean,hazy,foul,toxic,deadly') out.push(`${at} (quality.levels): must be clean, hazy, foul, toxic, deadly in that order`);
  for (let i = 3; i < levels.length; i++) if (!(levels[i].index > levels[i - 1].index)) out.push(`${at} (quality.levels): ${levels[i].id} must start above ${levels[i - 1].id}`);
  const ex = data.exposure ?? {};
  if (!(ex.max > 0)) out.push(`${at} (exposure): max must be above 0`);
  if (!(ex.recover > 0 && ex.recoverHazy >= 0 && ex.recoverHazy <= ex.recover)) out.push(`${at} (exposure): recover must be above 0 and recoverHazy no more than it`);
  const stages = asArray(ex.stages);
  if (!stages.length || stages[0].min !== 0) out.push(`${at} (exposure.stages): the first stage starts at 0`);
  for (const [i, s] of stages.entries()) {
    const sa = `${at} (exposure stage "${s.id}")`;
    if (i > 0 && !(s.min > stages[i - 1].min)) out.push(`${sa}: stages must rise`);
    if (!(s.work >= 1 && s.work <= 3) || !(s.walk >= 1 && s.walk <= 3)) out.push(`${sa}: work and walk must be 1 to 3`);
    if (s.cough !== undefined && !(Number.isInteger(s.cough) && s.cough >= 2)) out.push(`${sa}: cough is every N seconds (2 or more)`);
    if (s.hurt !== undefined && !(Number.isInteger(s.hurt.every) && s.hurt.every >= 1 && Number.isInteger(s.hurt.hp) && s.hurt.hp >= 1 && s.hurt.floor > 0 && s.hurt.floor < 1)) out.push(`${sa}: hurt needs every (seconds), hp, and a floor between 0 and 1 (it never kills)`);
  }
  if (!(data.fire?.smokePerIntensity >= 0)) out.push(`${at} (fire): smokePerIntensity must be 0 or more`);
  const lim = data.limits ?? {};
  if (!(Number.isInteger(lim.sources) && lim.sources >= 1 && lim.sources <= 64)) out.push(`${at} (limits): sources must be 1 to 64`);
  if (!(lim.rate > 0) || !(lim.seconds > 0)) out.push(`${at} (limits): rate and seconds must be above 0`);
  // The seal, and (Prompt 8) mending a damaged opening: materials only, seconds of work.
  for (const key of ['seal', 'mend']) {
    const act = data.actions?.[key];
    if (!act) {
      out.push(`${at} (actions.${key}): missing`);
      continue;
    }
    for (const c of [...asArray(act.cost), ...asArray(act.waste)]) {
      const item = content.items?.get?.(c.item);
      if (!item) out.push(`${at} (actions.${key}): "${c.item}" is not an item`);
      else if (item.type !== 'material') out.push(`${at} (actions.${key}): "${c.item}" is not a material`);
    }
    if (!(act.seconds >= 1) || (key === 'seal' && !(act.unsealSeconds >= 1))) out.push(`${at} (actions.${key}): seconds${key === 'seal' ? ' and unsealSeconds' : ''} must be 1 or more`);
  }
  return out;
}
