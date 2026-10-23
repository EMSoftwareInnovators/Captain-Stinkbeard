import { asArray } from '../../core/util.js';
import { gearDef } from './supplies.js';
import { shipTuning, scaleCount } from './integrity.js';
import { airRoom } from './air.js';
import { beardData, careStation, careRooms, stageIndex } from './beard.js';

/**
 * What the captain can do about his beard (docs/gameplay-overhaul/13-beard-saturation.md,
 * "Purging", "Sniffing", "Beard care"). Pure: reads the session, changes
 * nothing. Respond, the beard commands and the Ship page all use it, so
 * what's offered is what can be done. Only while the system is switched on
 * (no chapter does), so nothing here is ever offered in the campaign.
 *
 *   inspect  a look: how full, what kind of stink (broad), conditions, what helps
 *   sniff    a close sniff: the detail, at the price of a whiff (and a gag); snaps him out of paranoia for a while
 *   wring    a controlled purge, here and now (seconds of work): its share into this room
 *   rinse    at a care station (the washroom tub or basin): water, seconds of work, a share out
 *   scrub    at a care station: a sailcloth rag on the timing bar; more out, and the hornets with it
 *   wear / remove   an item the data maps (the beard wrap, the wet cloth, the goggles), only one he carries
 * Care needs somewhere safe: not in deep water, not in foul air.
 */

const itemName = (content, id) => content.items?.get?.(id)?.name ?? id;
const itemList = (content, list) => list.map((c) => `${c.count} ${itemName(content, c.item)}`).join(', ');

/** A scrub's bill on a difficulty (rounded up, at least 1). */
export function scrubCost(content, difficulty) {
  const t = shipTuning(content, difficulty);
  return asArray(beardData(content)?.care?.scrub?.cost).map((c) => ({ item: c.item, count: scaleCount(c.count ?? 1, t.costScale) }));
}

/** Seconds of beard work: its own, longer in deep water, with bad lungs, or a heavy beard. */
export function beardSeconds(session, base) {
  const room = session.location?.map;
  const water = room ? session.ship.hazards.waterIn(room).stage.work ?? 1 : 1;
  const air = session.ship.air;
  const lungs = air.def ? (air.exposureNow().stage.work ?? 1) : 1;
  return Math.max(1, Math.round(base * water * lungs * session.ship.beard.factors().work));
}

/** Why care can't be done here and now (null when it can). */
function careBlocked(session) {
  const content = session.content;
  const room = session.location?.map;
  const st = careStation(content, session.location);
  if (!st) return `Beard care needs water and a basin: ${careRooms(content).map((r) => `the ${content.maps?.get?.(r)?.name?.replace(/^The /, '') ?? r}`).join(' or ')}.`;
  if (!st.near) return `Get to ${st.label}.`;
  if (session.ship.hazards.waterIn(room).stage.canWork === false) return 'Too deep in here: pump it down first.';
  if (airRoom(content, room) && session.ship.air.airIn(room).index > 0) return 'Not in this air: it would only soak up more. Clear it first.';
  if (session.ship.hazards.working) return 'Already at work.';
  return null;
}

/**
 * The beard actions open to the captain now: [{ action, label, ok, reason,
 * seconds, cost?, item? }]. Not-ok entries say why. Empty while the system
 * is off.
 */
export function beardOptions(session, { difficulty = 'captain' } = {}) {
  const b = session.ship.beard;
  const content = session.content;
  const data = beardData(content);
  if (!data || !b.on) return [];
  const t = shipTuning(content, difficulty);
  const i = b.info(t);
  const busy = session.ship.hazards.working ? 'Already at work.' : null;
  const out = [{ action: 'inspect', label: 'Look at your beard', ok: true, reason: null, seconds: 0 }];
  out.push({ action: 'sniff', label: 'Sniff your beard', ok: b.sniffLock <= 0, reason: b.sniffLock > 0 ? `Give your nose a moment (${b.sniffLock} s).` : null, seconds: 0 });
  // Wring it out: here, into this room.
  const wr = data.purge.controlled;
  const wrSecs = beardSeconds(session, wr.seconds);
  const room = session.location?.map;
  const deep = room && session.ship.hazards.waterIn(room).stage.canWork === false ? 'Too deep in here: pump it down first.' : null;
  const wrReason = busy ?? deep ?? (i.phase === 'cooldown' ? `Your beard has only just let go (${i.left} s).` : null) ?? (i.total < 1 ? 'Nothing in it to wring out.' : null);
  out.push({ action: 'wring', label: `Wring it out, here (${wrSecs} s)`, ok: !wrReason, reason: wrReason, seconds: wrSecs });
  // Care at a station.
  const blocked = careBlocked(session);
  const rinse = data.care.rinse;
  const rSecs = beardSeconds(session, rinse.seconds);
  const rReason = blocked ?? (i.total < 0.5 ? 'It is clean already.' : null);
  out.push({ action: 'rinse', label: `${rinse.label} (${rSecs} s)`, ok: !rReason, reason: rReason, seconds: rSecs });
  const scrub = data.care.scrub;
  const cost = scrubCost(content, difficulty);
  const missing = cost.filter((c) => session.inventory.count(c.item) < c.count);
  const hornets = i.statuses.some((s) => s.id === 'hornet_nested');
  const sReason = blocked ?? (i.total < 0.5 && !hornets ? 'It is clean already.' : null) ?? (missing.length ? `Not enough: ${missing.map((c) => `${itemName(content, c.item)} ${session.inventory.count(c.item)}/${c.count}`).join(', ')}.` : null);
  out.push({ action: 'scrub', label: `${scrub.label}: ${itemList(content, cost)}`, ok: !sReason, reason: sReason, seconds: beardSeconds(session, scrub.seconds), cost });
  // What can be worn over it (only what he carries).
  for (const [item, e] of Object.entries(data.equipment ?? {})) {
    if (item.startsWith('//') || session.inventory.count(item) <= 0) continue;
    // Prompt 10: with the supplies on, gear is put on under "Your gear" (slots, what goes with what): not twice.
    if (session.ship.supplies?.on && gearDef(content, item)) continue;
    const worn = b.worn.includes(item);
    out.push({ action: worn ? 'remove' : 'wear', item, label: `${worn ? 'Take off' : 'Wear'} ${e.label}`, ok: true, reason: null, seconds: 0 });
  }
  return out;
}

/** True while there is something to do about the beard (Respond is offered). */
export function beardHere(session) {
  return !!session.ship.beard.on && !!beardData(session.content);
}

/** The HUD's words for the beard ("BEARD 68% SATURATED", "BEARD OVERLOADED 6s", "BEARD 40% GAGGING"). */
export function beardWord(e) {
  const statuses = e.statuses.length ? ` <${e.tone === 'r' ? 'r' : 'o'}>${e.statuses.join(' ')}</>` : '';
  if (e.left !== null) return `<r>BEARD</> OVERLOADED <r>${e.left}s</>`;
  if (e.stage === 'critical') return `<r>BEARD</> CRITICAL <k>PURGE RISK</>`;
  return `<${e.tone}>BEARD</> ${e.pct}% ${e.label.toUpperCase()}${statuses}`;
}

/** What to do about the beard, in words (the Ship page, the report). */
export function beardAdvice(session, tuning = session.ship.beard.tuning) {
  const i = session.ship.beard.info(tuning);
  if (i.phase === 'overload') return `It purges in ${i.left} s: wring it out where it can go (a room you can clear), or wash it.`;
  if (i.phase === 'cooldown') return `Just purged: it takes nothing in for ${i.left} s. Clear the air.`;
  if (i.rank >= stageIndex(session.content, 'heavy')) return 'Wash it at the washroom tub, or wring it out where you can air the room.';
  if (i.rank >= stageIndex(session.content, 'saturated')) return 'It protects less now: wash it before the next bad air.';
  return 'It catches the worst of the air for you while it has room.';
}

/** Broad words for what it holds (an inspection: no figures). */
function broadly(contents) {
  if (!contents.length) return 'nothing much';
  const words = contents.filter((c) => c.share >= 0.1).map((c) => (c.supernatural ? 'something not of this world' : c.label.toLowerCase()));
  const uniq = [...new Set(words)];
  if (!uniq.length) return 'a little of everything';
  return uniq.length === 1 ? `mostly ${uniq[0]}` : `mostly ${uniq[0]}, with ${uniq.slice(1).join(' and ')}`;
}

/**
 * "Look at your beard": lines for the dialogue box. How full and how bad,
 * what it smells of (broadly), its conditions, how well it protects, the
 * purge risk, what is worn, where to clean it, and the trend. While
 * paranoid (and not snapped out of it), one extra line, marked "(?)".
 */
export function beardReport(session, tuning = session.ship.beard.tuning) {
  const b = session.ship.beard;
  const i = b.info(tuning);
  const lines = [];
  const trend = i.trend === 'rising' ? ', filling' : i.trend === 'falling' ? ', clearing' : '';
  lines.push(`Your beard: <${i.tone}>${i.label.toUpperCase()}</> (${i.shown}%)${trend}. It smells of ${broadly(i.contents)}.`);
  // Each condition on its own line (they would not fit the box together), the worst first.
  const st = i.statuses.filter((s) => s.id !== 'saturated');
  for (const s of st) lines.push(`<${s.tone}>${s.short}</>${s.left !== null ? ` (${s.left} s)` : ''}: <k>${s.note}</>`);
  lines.push(`<k>Protection:</> ${i.absorbing ? `it catches about ${Math.round(i.protection * 100)}% of the smoke you breathe.` : i.phase === 'cooldown' ? `none for ${i.left} s (just purged).` : 'none: it is full.'}${i.offgas > 0 ? ' <o>It gives off what it holds.</>' : ''}`);
  const risk = { purging: `<r>PURGE IN ${i.left} s.</>`, high: '<r>Close to purging.</>', some: '<y>Filling up.</>', none: '' }[i.risk];
  if (risk) lines.push(risk);
  if (i.worn.length) lines.push(`<k>Wearing:</> ${i.worn.map((it) => beardData(session.content).equipment[it].label).join(', ')}.`);
  lines.push(`<k>${beardAdvice(session, tuning)}</>`);
  if (st.some((s) => s.effects.perception && !s.suppressed)) lines.push('<p>(?) Something in it seems to be looking back at you.</>');
  return lines;
}

/** "Sniff your beard": the detail an inspection doesn't give (each contaminant and how much), then what the sniff did. */
export function sniffReport(session, r, tuning = session.ship.beard.tuning) {
  const i = session.ship.beard.info(tuning);
  const lines = [];
  lines.push(i.contents.length ? `*sniff* ${i.contents.map((c) => `${c.label} ${Math.round(c.pct)}%`).join(', ')}. <k>(${i.shown}% full.)</>` : '*sniff* Just beard.');
  const after = [r.gag ? '<o>*gag*</>' : '', r.dose > 0.05 ? `<y>That went straight to your lungs.</>` : '', r.cleared ? '<g>The reek snaps you out of it, for now.</>' : ''].filter(Boolean);
  if (after.length) lines.push(after.join(' '));
  return lines;
}
