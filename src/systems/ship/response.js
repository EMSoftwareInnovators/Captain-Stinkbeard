import { asArray } from '../../core/util.js';
import { shipTuning, scaleCount, sumItems } from './integrity.js';
import { hazardData, stationsIn, fireStage, fireRank, leakSeverity, severityRank } from './hazards.js';
import { airOptions, captainFactors } from './airResponse.js';
import { pressureHere, pressureWord } from './pressureResponse.js';
import { beardHere, beardWord } from './beardResponse.js';
import { suppliesHere } from './supplyResponse.js';
import { consequencesHere } from '../consequences/recovery.js';

/**
 * What the captain can do about an emergency where he stands
 * (docs/gameplay-overhaul/10-flooding-and-fire.md, "Response actions").
 * Pure: reads the session, changes nothing. The script commands
 * (hazardAction, patchLeak, emergency) and the Ship page both use it, so
 * what's offered is what can actually be done.
 *
 * Every action happens in a room and takes time (seconds of hazard time,
 * longer in deep water); while it takes, the rest of the ship's emergencies
 * go on. Nothing is free and nothing is instant:
 *   patch    the worst open leak here: materials and a timing bar (the leak
 *            closes; the hull and the water stay)
 *   pump     at a pump station: water out of its compartment, steadily
 *   bail     anywhere with water: slowly, by hand
 *   fetch    fill the carried buckets at a source (the sea, the cask) or
 *            from the flood itself (which lowers it)
 *   douse    a bucket on the fire (or water to hand here)
 *   smother  sailcloth on the fire: more at once, but it costs the cloth
 */

const itemName = (content, id) => content.items?.get?.(id)?.name ?? id;
const itemList = (content, list) => list.map((c) => `${c.count} ${itemName(content, c.item)}`).join(', ');

/** How much longer work takes in a room: its flood stage (1 when dry) times the captain's lungs (Prompt 7: 1 when clear) and beard (Prompt 9: 1 when off). */
export function workFactor(session, room) {
  return (session.ship.hazards.waterIn(room).stage.work ?? 1) * captainFactors(session).work;
}

/** Seconds an action takes in a room: its own, longer in deep water. */
export function actionSeconds(session, room, action) {
  const a = hazardData(session.content)?.actions?.[action];
  return Math.max(1, Math.round((a?.seconds ?? 1) * workFactor(session, room)));
}

/** A patch's bill for a leak's severity on a difficulty (rounded up, at least 1 of each). */
export function patchCost(content, severity, difficulty) {
  const t = shipTuning(content, difficulty);
  return asArray(hazardData(content)?.actions?.patch?.cost?.[severity]).map((c) => ({ item: c.item, count: scaleCount(c.count ?? 1, t.costScale) }));
}

export function patchWaste(content, difficulty) {
  const t = shipTuning(content, difficulty);
  return asArray(hazardData(content)?.actions?.patch?.waste).map((c) => ({ item: c.item, count: scaleCount(c.count ?? 1, t.costScale) }));
}

/** What a room blocks: no work in a flooded compartment; no pumping where the pump is burning. */
function canWorkIn(session, room) {
  const w = session.ship.hazards.waterIn(room);
  return w.stage.canWork !== false ? null : `Too deep to work in ${roomLabel(session, room)}: pump it down first.`;
}

export function roomLabel(session, room) {
  const n = session.content.maps?.get?.(room)?.name ?? room;
  return `the ${n}`.replace(/^the the /i, 'the ');
}

/**
 * The actions open to the captain in `room` (default: where he is), each
 * { action, label, ok, reason, seconds, cost, leak, station, target }.
 * Not-ok entries say why, so a menu can explain instead of hiding.
 */
export function responseOptions(session, room = session.location?.map, { difficulty = 'captain' } = {}) {
  const content = session.content;
  const data = hazardData(content);
  if (!data || !room) return [];
  const hz = session.ship.hazards;
  const inv = session.inventory;
  const out = [];
  const have = (list) => list.filter((c) => inv.count(c.item) < c.count).map((c) => ({ ...c, have: inv.count(c.item) }));
  const short = (missing) => `Not enough: ${missing.map((c) => `${itemName(content, c.item)} ${c.have}/${c.count}`).join(', ')}.`;
  const t = shipTuning(content, difficulty);
  const fire = hz.fireIn(room);
  const water = hz.waterIn(room);
  // Patch: the worst open leak here.
  const leak = hz.leaksIn(room).filter((l) => l.state === 'open').sort((a, b) => severityRank(hz.def, b.severity) - severityRank(hz.def, a.severity))[0];
  if (leak) {
    const cost = patchCost(content, leak.severity, difficulty);
    const waste = patchWaste(content, difficulty);
    const get = (list, item) => list.find((c) => c.item === item)?.count ?? 0;
    const worst = [...new Set([...cost, ...waste].map((c) => c.item))].map((item) => ({ item, count: Math.max(get(cost, item), get(waste, item)) }));
    const missing = have(worst);
    const blocked = canWorkIn(session, room) ?? (hz.working ? 'Already at work.' : null);
    const sev = leakSeverity(hz.def, leak.severity)?.label ?? leak.severity;
    out.push({ action: 'patch', leak: leak.id, cost, ok: !blocked && !missing.length, reason: blocked ?? (missing.length ? short(missing) : null), seconds: actionSeconds(session, room, 'patch'), label: `${data.actions.patch.label} (${sev.toLowerCase()}): ${itemList(content, cost)}` });
  }
  // Pump: a station here, its compartment wet, not burning here.
  // Pump: a station here, water in what it drains (the bilge runs under the whole hold), not burning here.
  for (const st of stationsIn(content, room, 'pump')) {
    const drains = asArray(st.drains);
    const wet = drains.some((d) => hz.waterIn(d).units > 0);
    const inFire = fire && fireRank(hz.def, fireStage(hz.def, fire.intensity).id) >= fireRank(hz.def, 'burning');
    const reason = inFire ? `The pump is in the fire: put it out first.` : !wet ? 'The bilge is dry: nothing to pump.' : hz.working ? 'Already at work.' : null;
    const seconds = actionSeconds(session, room, 'pump');
    out.push({ action: 'pump', station: st.id, target: drains, ok: !reason, reason, seconds, label: `${data.actions.pump.label} (${seconds} s)` });
  }
  // Bail: water here.
  if (water.floodable && water.units > 0) {
    const seconds = actionSeconds(session, room, 'bail');
    out.push({ action: 'bail', target: room, ok: !hz.working, reason: hz.working ? 'Already at work.' : null, seconds, label: `${data.actions.bail.label} (${seconds} s)` });
  }
  // Buckets: fill them where there's water to hand, while a fire burns somewhere.
  const cap = data.actions.fetch.buckets;
  const atHand = hz.waterAtHand(room);
  if (atHand && hz.fires.length && hz.buckets < cap) {
    const seconds = actionSeconds(session, room, 'fetch');
    out.push({ action: 'fetch', target: room, ok: !hz.working, reason: hz.working ? 'Already at work.' : null, seconds, label: `${data.actions.fetch.label} (${hz.buckets}/${cap}, ${seconds} s)` });
  }
  if (fire) {
    const seconds = actionSeconds(session, room, 'douse');
    const water4 = atHand ? (atHand === 'source' ? 'water to hand' : 'flood water') : hz.buckets > 0 ? `bucket ${hz.buckets}/${cap}` : null;
    const reason = !water4 ? 'No water to hand: fill the buckets first.' : hz.working ? 'Already at work.' : null;
    out.push({ action: 'douse', target: room, ok: !reason, reason, seconds, usesBucket: !atHand, label: `${data.actions.douse.label} (${water4 ?? 'no water'}, ${seconds} s)` });
    const cost = asArray(data.actions.smother.cost).map((c) => ({ item: c.item, count: scaleCount(c.count ?? 1, t.costScale) }));
    const missing = have(cost);
    out.push({ action: 'smother', target: room, cost, ok: !missing.length && !hz.working, reason: missing.length ? short(missing) : hz.working ? 'Already at work.' : null, seconds: actionSeconds(session, room, 'smother'), label: `${data.actions.smother.label} (${itemList(content, cost)})` });
  }
  return out;
}

/**
 * The emergency line on the HUD: the worst two emergencies in words
 * ("FIRE Galley BLAZING", "WATER Cargo Hold 42%", "LEAK Cargo Hold"), how
 * many more, the ship's stability, and whether anything can be done where
 * the captain stands (the Respond button). Null when all is clear.
 */
export function emergencySummary(session, room = session.location?.map, { difficulty = 'captain' } = {}) {
  const hz = session.ship.hazards;
  // Prompt 7: bad air (foul or worse) is an emergency too, weighed with the rest; Prompt 8: so is a Grand Stenchmaster building up;
  // Prompt 9: so is the captain's beard, saturated or worse (only while that system is on).
  const tuning = shipTuning(session.content, difficulty);
  const list = [...hz.emergencies().filter((e) => e.kind !== 'leak' || e.open), ...session.ship.air.emergencies(), ...session.ship.pressure.emergencies(), ...session.ship.beard.emergencies(tuning)].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
  // Prompt 11: a recovery or preparation here (rest in the crew quarters, sort the kit) shows Respond too.
  const respond = (hz.any && responseOptions(session, room, { difficulty }).length > 0) || airOptions(session, room, { difficulty }).length > 0 || pressureHere(session, room) || beardHere(session) || suppliesHere(session) || consequencesHere(session);
  if (!list.length) return respond ? { items: [], more: 0, stability: 'steady', here: false, respond } : null;
  const name = (r) => session.content.maps?.get?.(r)?.name?.replace(/^The /, '') ?? r;
  const airTone = (e) => (e.stage === 'deadly' ? 'r' : e.stage === 'toxic' ? 'o' : 'y');
  const word = (e) => (e.kind === 'fire' ? `<o>FIRE</> ${name(e.room)} ${e.label.toUpperCase()}` : e.kind === 'flood' ? `<${e.pct >= 65 ? 'r' : 'y'}>WATER</> ${name(e.room)} ${e.pct}%` : e.kind === 'air' ? `<${airTone(e)}>AIR</> ${name(e.room)} ${e.label.toUpperCase()}` : e.kind === 'pressure' ? pressureWord(e) : e.kind === 'beard' ? beardWord(e) : `<r>LEAK</> ${name(e.room)}`);
  // Prompt 9: the beard is his own, always where he is: when it is listed it takes the first place, the worst of the rest after it.
  const shown = [...list.filter((e) => e.kind === 'beard'), ...list.filter((e) => e.kind !== 'beard')].slice(0, 2);
  return { items: shown.map(word), more: Math.max(0, list.length - shown.length), stability: hz.stability().state, here: list.some((e) => e.room === room), respond };
}

/**
 * The HUD line's markup for a summary: the stability lead, the worst two
 * and a count; when that doesn't fit (`fits(markup)`: two long room names),
 * the worst one and a count of the rest.
 */
export function emergencyLine(state, fits = () => true) {
  const lead = state.stability === 'foundering' ? '<r>FOUNDERING!</> ' : state.stability === 'listing' ? '<y>LISTING</> ' : '<r>!</> ';
  const more = (n) => (n > 0 ? ` <k>+${n}</>` : '');
  const full = `${lead}${state.items.join('  ')}${more(state.more)}`;
  if (state.items.length < 2 || fits(full)) return full;
  return `${lead}${state.items[0]}${more(state.more + state.items.length - 1)}`;
}

/** True if anything can be done (or explained) here: the world shows "Respond". */
export function hasResponse(session, room = session.location?.map) {
  const hz = session.ship.hazards;
  if (airOptions(session, room).length > 0 || pressureHere(session, room) || beardHere(session) || suppliesHere(session) || consequencesHere(session)) return true;
  if (!hz.any) return false;
  return responseOptions(session, room).length > 0;
}

/** What to do about an emergency, in words (the Ship page's advice). */
export function advice(session, e) {
  const where = roomLabel(session, e.room);
  if (e.kind === 'fire') return `Douse it (buckets, or water to hand) or smother it with sailcloth, in ${where}.`;
  if (e.kind === 'leak') return e.open ? `Patch it in ${where}, or repair the hull. Then pump.` : `Patched for now: repair the hull to seal it.`;
  if (e.kind === 'flood') {
    const data = hazardData(session.content);
    const pump = Object.values(data?.stations ?? {}).find((s) => s.kind === 'pump' && asArray(s.drains).includes(e.room));
    const drains = asArray(data?.flow).some((f) => f.kind === 'drain' && f.from === e.room);
    const leaks = session.ship.hazards.leaksIn(e.room).some((l) => l.state === 'open');
    const how = pump ? `Pump it (${pump.label}, ${roomLabel(session, pump.room)}) or bail.` : drains ? 'Bail it, or let it run down to the hold and pump it there.' : 'Bail it out.';
    return `${leaks ? 'Close the leak first. ' : ''}${how}`;
  }
  return '';
}

export { sumItems };
