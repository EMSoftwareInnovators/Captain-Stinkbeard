import { asArray } from '../../core/util.js';
import { shipTuning, scaleCount } from './integrity.js';
import { airData, airRoom, OUTSIDE, exposureStage } from './air.js';

/**
 * What the captain can do about the air where he stands
 * (docs/gameplay-overhaul/11-atmosphere-and-ventilation.md, "Ventilation and
 * containment"). Pure: reads the session, changes nothing. The Respond
 * choice, the air commands and the Ship page all use it, so what's offered
 * is what can actually be done.
 *
 * Only the openings of the room he is in: no hatch is worked from across the
 * ship. Each takes seconds of hazard time (longer in deep water or with bad
 * lungs), one thing at a time:
 *   check    read the air: this room, its openings, the rest of the ship, his lungs
 *   open / close  a door, hatch, porthole or windows
 *   seal     a closed door or hatch: sailcloth and nails, on the repair bar
 *   unseal   back to closed (the cloth is spoiled)
 */

const itemName = (content, id) => content.items?.get?.(id)?.name ?? id;
const itemList = (content, list) => list.map((c) => `${c.count} ${itemName(content, c.item)}`).join(', ');
const roomLabel = (session, room) => `the ${session.content.maps?.get?.(room)?.name ?? room}`.replace(/^the the /i, 'the ');
const placeName = (session, room) => (room === OUTSIDE ? 'outside' : session.content.maps?.get?.(room)?.name?.replace(/^The /, '') ?? room);

/** The captain's lungs' effect on work and walking (1 when clear). */
export function exposureFactors(session) {
  const air = session.ship.air;
  const st = exposureStage(air.def, air.exposure);
  return { work: st.work ?? 1, walk: st.walk ?? 1, stage: st };
}

/** Seconds an air action takes in a room: its own, longer in deep water and with bad lungs. */
export function airSeconds(session, room, base) {
  const water = session.ship.hazards.waterIn(room).stage.work ?? 1;
  return Math.max(1, Math.round(base * water * exposureFactors(session).work));
}

/** A seal's bill and a failed try's waste on a difficulty. */
export function sealCost(content, difficulty) {
  const t = shipTuning(content, difficulty);
  return asArray(airData(content)?.actions?.seal?.cost).map((c) => ({ item: c.item, count: scaleCount(c.count ?? 1, t.costScale) }));
}

export function sealWaste(content, difficulty) {
  const t = shipTuning(content, difficulty);
  return asArray(airData(content)?.actions?.seal?.waste).map((c) => ({ item: c.item, count: scaleCount(c.count ?? 1, t.costScale) }));
}

/** An opening's short name, for tight spaces ("the quarters porthole" -> "porthole"; it's the room's own). */
export function shortName(label) {
  return label.replace(/^the /, '').replace(/^(quarters|galley|washroom|Fart Zone) (porthole|portholes)$/, '$2').replace(/^stern windows$/, 'windows');
}

/** Short words for an opening's state ("open", "SEALED", "closed, damaged"). */
export function stateWords(c) {
  const s = c.state === 'sealed' ? 'SEALED' : c.state;
  return c.damaged ? `${s}, damaged` : s;
}

/**
 * The air actions open to the captain in `room` (default: where he is):
 * [{ action, connection, to, label, ok, reason, seconds, cost }]. Offered
 * while there is anything in the ship's air (nothing to do otherwise).
 * Not-ok entries say why.
 */
export function airOptions(session, room = session.location?.map, { difficulty = 'captain', always = false } = {}) {
  const content = session.content;
  const data = airData(content);
  const air = session.ship.air;
  if (!data || !room || !airRoom(content, room) || !(always || air.active)) return [];
  const hz = session.ship.hazards;
  const inv = session.inventory;
  const deep = hz.waterIn(room).stage.canWork === false ? `Too deep to work in ${roomLabel(session, room)}: pump it down first.` : null;
  const busy = hz.working ? 'Already at work.' : null;
  const out = [{ action: 'check', label: 'Check the air', ok: true, reason: null, seconds: 0 }];
  for (const c of air.connectionsIn(room)) {
    if (!c.changeable) continue;
    const name = c.label.replace(/^the /, '');
    const secs = (base) => airSeconds(session, room, base);
    if (c.state === 'open') {
      const seconds = secs(c.seconds);
      out.push({ action: 'close', connection: c.id, to: 'closed', ok: !deep && !busy, reason: deep ?? busy, seconds, label: `Close the ${name} (${seconds} s)` });
    } else if (c.state === 'closed') {
      const seconds = secs(c.seconds);
      out.push({ action: 'open', connection: c.id, to: 'open', ok: !deep && !busy, reason: deep ?? busy, seconds, label: `Open the ${name} (${seconds} s)` });
      if (c.states.includes('sealed')) {
        const cost = sealCost(content, difficulty);
        const waste = sealWaste(content, difficulty);
        const get = (list, item) => list.find((x) => x.item === item)?.count ?? 0;
        const worst = [...new Set([...cost, ...waste].map((x) => x.item))].map((item) => ({ item, count: Math.max(get(cost, item), get(waste, item)) }));
        const missing = worst.filter((x) => inv.count(x.item) < x.count);
        const reason = c.damaged ? `The ${name} is damaged: it won't seal.` : deep ?? busy ?? (missing.length ? `Not enough: ${missing.map((x) => `${itemName(content, x.item)} ${inv.count(x.item)}/${x.count}`).join(', ')}.` : null);
        out.push({ action: 'seal', connection: c.id, to: 'sealed', cost, ok: !reason, reason, seconds: secs(data.actions.seal.seconds), label: `Seal the ${name}: ${itemList(content, cost)}` });
      }
    } else if (c.state === 'sealed') {
      const seconds = secs(data.actions.seal.unsealSeconds);
      out.push({ action: 'unseal', connection: c.id, to: 'closed', ok: !deep && !busy, reason: deep ?? busy, seconds, label: `Unseal the ${name} (${seconds} s)` });
    }
  }
  return out;
}

/** Is a room safe to be in: no substance above its safe level. */
export function airSafe(session, room) {
  return !(session.ship.air.airIn(room).index > 0);
}

/**
 * "Check the air": lines for the dialogue box. This room (quality, trend,
 * what's in it, what pours into it), its openings, the rest of the ship, and
 * the captain's lungs.
 */
export function airReport(session, room = session.location?.map) {
  const air = session.ship.air;
  const content = session.content;
  const lines = [];
  const a = air.airIn(room);
  const tone = (q) => ({ clean: 'g', hazy: 'w', foul: 'y', toxic: 'o', deadly: 'r' })[q] ?? 'w';
  const trend = a.trend === 'rising' ? ', getting worse' : a.trend === 'falling' ? ', clearing' : '';
  const what = a.subs.length ? ` ${a.subs.map((s) => `${s.short} ${s.shown}%`).join(', ')}.` : '';
  lines.push(`${placeName(session, room)}: <${tone(a.quality.id)}>${a.quality.label.toUpperCase()}</>${trend}.${what}${a.index > 0 ? ' <r>Not safe to stay.</>' : ''}`);
  for (const s of a.sources) {
    const left = s.ticks !== null ? `${s.ticks} s left` : s.left !== null ? 'still pouring' : '';
    lines.push(`<y>Source:</> ${s.label ?? 'a leak of gas'}${left ? ` (${left})` : ''}.`);
  }
  const ops = air.connectionsIn(room).map((c) => `${c.label.replace(/^the /, '')} ${stateWords(c)}`);
  if (ops.length) lines.push(`<k>Openings:</> ${ops.join(', ')}.`);
  const elsewhere = air.emergencies().filter((e) => e.room !== room).map((e) => `${placeName(session, e.room)} <${tone(e.stage)}>${e.label.toUpperCase()}</> (${e.substance} ${e.pct}%)`);
  lines.push(elsewhere.length ? `<k>Elsewhere:</> ${elsewhere.slice(0, 3).join(', ')}${elsewhere.length > 3 ? ` and ${elsewhere.length - 3} more` : ''}.` : '<k>Elsewhere:</> the rest of the ship breathes easy.');
  const ex = air.exposureNow();
  lines.push(ex.value > 0 ? `<k>You:</> exposure ${ex.pct}% ${ex.stage.label.toUpperCase()}.${ex.rank >= 2 ? ' Get to clean air.' : ''}` : '<k>You:</> breathing easy.');
  return lines;
}

/** What to do about a room's air, in words (the Ship page). */
export function airAdvice(session, room) {
  const vents = session.ship.air.connectionsIn(room).filter((c) => c.outside && c.changeable);
  return vents.length ? `Air it out (${shortName(vents[0].label)}) or shut it in.` : 'No porthole: open a way up, or shut it in.';
}
