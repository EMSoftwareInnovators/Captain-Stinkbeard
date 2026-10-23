import { asArray } from '../../core/util.js';
import { shipTuning } from './integrity.js';
import { captainFactors } from './airResponse.js';
import {
  supplyData,
  classOf,
  storeDef,
  storesHere,
  sourceDef,
  sourcesHere,
  sourceYields,
  stationHere,
  stationDef,
  waterHere,
  recipeDef,
  recipeIds,
  effectDef,
  gearDef,
  gearIds,
  BASE_ZONE,
} from './supplies.js';

/**
 * The captain's side of the supplies (overhaul Prompt 10,
 * docs/gameplay-overhaul/14-resources-and-cooking.md): what Respond offers
 * where he stands (a source, the stores, the stove, water), his gear, the
 * reports, and the helpers the work shares (seconds, the bar's zone).
 */

const itemName = (content, id) => content.items?.get?.(id)?.name ?? id;
export const itemList = (content, list) => list.map((c) => `${c.count} ${itemName(content, c.item)}`).join(', ');
const cap = (s) => String(s).replace(/^./, (c) => c.toUpperCase());

/** Seconds of supply work where he stands: its own, longer in deep water, with bad lungs, a heavy beard (shorter on a full belly). */
export function supplySeconds(session, base) {
  const room = session.location?.map;
  const water = room ? session.ship.hazards.waterIn(room).stage.work ?? 1 : 1;
  return Math.max(1, Math.round(base * water * captainFactors(session).work));
}

/**
 * A timing bar's green zone (pixels): the base every ship repair has, plus
 * a meal's steady hands or a draught's wobble (only while the supplies are
 * on), plus, for salvage and cooking, the difficulty's supplyZone.
 */
export function barZone(session, { supply = false, difficulty = 'captain' } = {}) {
  const t = supply ? shipTuning(session.content, difficulty) : null;
  return Math.max(10, BASE_ZONE + (session.ship.supplies?.factor('zone') ?? 0) + (supply ? t.supplyZone ?? 0 : 0));
}

/** Why work can't be done here now (null when it can). */
function blockedHere(session) {
  if (session.ship.hazards.working) return 'Already at work.';
  const room = session.location?.map;
  if (room && session.ship.hazards.waterIn(room).stage.canWork === false) return 'Too deep in here: pump it down first.';
  return null;
}

/** What a recipe still needs from what he can reach (the pack and the stores the cook may draw on from here). */
export function missingFor(session, recipe, room = session.location?.map) {
  const r = recipeDef(session.content, recipe);
  if (!r) return [];
  const { count } = session.ship.supplies.reach('cook', room);
  return asArray(r.ingredients)
    .map((c) => ({ item: c.item, need: c.count ?? 1, have: count(c.item) }))
    .filter((c) => c.have < c.need);
}

/**
 * The supply actions where he stands, in groups for the Respond choice:
 * [{ label, ok, list: [{ action, label, ok, reason, ... }] }]. Empty while
 * the system is off.
 */
export function supplyGroups(session, { difficulty = 'captain' } = {}) {
  const sup = session.ship.supplies;
  const content = session.content;
  if (!sup?.on || !supplyData(content)) return [];
  const loc = session.location;
  const groups = [];
  const blocked = blockedHere(session);
  // Sources in reach.
  const srcs = sourcesHere(content, loc).map((id) => {
    const def = sourceDef(content, id);
    const a = sup.available(id);
    const secs = supplySeconds(session, def.action.seconds);
    const st = sup.sourceState(id);
    const left = def.type !== 'recovery' ? ` [${st.left} left]` : st.cooldown > 0 ? ` [${st.cooldown}s]` : '';
    const reason = blocked ?? (a.ok ? null : a.reason);
    return { action: 'source', source: id, label: `${def.action.label} (${secs}s)${left}`, ok: !reason, reason, seconds: secs, type: def.type };
  });
  if (srcs.length) groups.push({ label: srcs.length === 1 ? cap(sourceDef(content, srcs[0].source).label) : 'Search and salvage', ok: true, list: srcs });
  // The stores.
  for (const store of storesHere(content, loc)) {
    const s = storeDef(content, store);
    const total = sup.storeTotal(store);
    const putable = session.inventory.entries().filter((e) => !sup.storeRefusal(store, e.id, 1));
    const list = [
      { action: 'storeCheck', store, label: `Check the stores (${total}/${s.capacity})`, ok: true, reason: null },
      { action: 'deposit', store, label: 'Put supplies away', ok: putable.length > 0 && total < s.capacity, reason: total >= s.capacity ? 'The stores are full.' : 'Nothing you carry goes in the stores.' },
      { action: 'withdraw', store, label: 'Take supplies out', ok: total > 0, reason: 'The stores are empty.' },
    ];
    groups.push({ label: cap(s.label), ok: true, list });
  }
  // The stove.
  const station = stationHere(content, loc);
  if (station) {
    const list = [];
    if (sup.cooking) {
      const r = recipeDef(content, sup.cooking.recipe);
      list.push({ action: 'serve', label: sup.ready ? `Serve the ${r?.name ?? 'pot'} (${sup.cooking.serves})` : `${r?.name ?? 'The pot'}: ${sup.cooking.left}s to go`, ok: sup.ready, reason: sup.ready ? null : `Not ready: ${sup.cooking.left}s more.` });
    }
    for (const id of recipeIds(content)) {
      const r = recipeDef(content, id);
      if (r.station !== station || !sup.knows(id)) continue;
      const missing = missingFor(session, id);
      const reason = blocked ?? (sup.cooking ? 'Something is already on the stove.' : null) ?? (missing.length ? `Missing: ${missing.map((m) => `${itemName(content, m.item)} ${m.have}/${m.need}`).join(', ')}.` : null);
      list.push({ action: 'cook', recipe: id, label: `Cook ${r.name}`, ok: !reason, reason });
    }
    list.push({ action: 'recipes', label: 'What can I cook?', ok: true, reason: null });
    groups.push({ label: cap(stationDef(content, station).label), ok: true, list });
  }
  // His gear: what he carries can be put on or taken off anywhere; the cloth wetted at water.
  const gear = [];
  const water = waterHere(content, loc);
  for (const item of gearIds(content)) {
    if (session.inventory.count(item) <= 0) continue;
    const worn = sup.wornGear().includes(item);
    gear.push({ action: worn ? 'unequip' : 'equip', item, label: `${worn ? 'Take off' : 'Wear'} ${itemName(content, item)}`, ok: true, reason: null });
    const c = gearDef(content, item).charges;
    if (c && water && sup.charge(item) < c.max) gear.push({ action: 'recharge', item, label: `Wet ${itemName(content, item)} (${water.label})`, ok: !blocked, reason: blocked });
  }
  if (gear.length) groups.push({ label: 'Your gear', ok: true, list: gear });
  return groups;
}

/** True when there is something supply-related to do where he stands (the world shows Respond). */
export function suppliesHere(session) {
  return supplyGroups(session).length > 0;
}

/** "Check the stores": lines for the dialogue box, by class. */
export function storeReport(session, store) {
  const sup = session.ship.supplies;
  const content = session.content;
  const s = storeDef(content, store);
  const items = sup.storeItems(store);
  const lines = [`${cap(s.label)}: ${sup.storeTotal(store)} of ${s.capacity}.`];
  if (!items.length) lines.push('<k>Empty.</>');
  const byClass = {};
  for (const i of items) (byClass[i.cls ?? 'other'] ??= []).push(i);
  for (const [cls, list] of Object.entries(byClass)) lines.push(`<k>${supplyData(content).classes?.[cls]?.label ?? cls}:</> ${itemList(content, list)}.`);
  const spend = asArray(s.spend?.in).filter((r) => r !== s.room);
  if (spend.length) lines.push(`<k>The cook draws on them from the ${spend.map((r) => (content.maps.get(r)?.name ?? r).replace(/^The /, '')).join(', ')}. Repairs use what you carry.</>`);
  return lines;
}

/** "What can I cook?": each known recipe, what it needs, what's missing, how long, what it makes. */
export function recipeReport(session) {
  const sup = session.ship.supplies;
  const content = session.content;
  const lines = [];
  for (const id of recipeIds(content)) {
    if (!sup.knows(id)) continue;
    const r = recipeDef(content, id);
    const missing = missingFor(session, id);
    const fx = asArray(content.items.get(r.product)?.use?.effects).find((e) => e.type === 'shipEffect');
    const what = fx?.effect ? effectDef(content, fx.effect)?.label : fx?.recover ? 'clears the lungs' : null;
    lines.push(`<y>${r.name}</>: ${itemList(content, r.ingredients)}. <k>${r.simmer}s; serves ${r.serves.success}${what ? `; ${what}` : ''}.</>${missing.length ? ` <r>Missing ${missing.map((m) => itemName(content, m.item)).join(', ')}.</>` : ''}`);
  }
  if (!lines.length) lines.push('<k>You know no recipes.</>');
  return lines;
}

/** What a source would give (for the Ship page and the report), on a difficulty. */
export function sourcePreview(session, id, difficulty = 'captain') {
  return itemList(session.content, sourceYields(session.content, id, difficulty));
}

/** What eating or drinking one started (a food or draught effect, lungs cleared), in words; '' if nothing. */
export function effectNote(content, results) {
  const fx = asArray(results).find((r) => r.type === 'shipEffect' && r.applied);
  if (!fx) return '';
  if (fx.effect) return `<k>${effectDef(content, fx.effect)?.label} ${fx.seconds}s.</>`;
  return fx.recovered ? `<k>Lungs clearer (-${fx.recovered}).</>` : '';
}

/** The class of an item, in words (the Items page). */
export function classLabel(content, item) {
  const cls = classOf(content, item);
  return cls ? supplyData(content).classes[cls].label : null;
}
