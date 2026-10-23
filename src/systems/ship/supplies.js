import { isPlainObject, asArray } from '../../core/util.js';
import { REPAIR_KINDS } from '../repairKinds.js';
import { DIFFICULTIES } from '../challenge/difficulty.js';
import { shipTuning } from './integrity.js';

/**
 * Shipboard resources: the data and the rules that need no state
 * (docs/gameplay-overhaul/14-resources-and-cooking.md). The state is
 * ./SupplyState.js (`ship.supplies`), the captain's part ./supplyResponse.js.
 *
 * One inventory: the items are data/items' and the pack is the session's
 * Inventory. This adds what they are for (classes), the ship's shared
 * stores, the places in the rooms they come from (sources), what can be
 * worn (gear), timed effects of food and draughts, and the galley's recipes.
 */

export const SUPPLY_CLASSES = Object.freeze(['repair', 'emergency', 'ingredient', 'food', 'consumable', 'equipment']);
export const SOURCE_TYPES = Object.freeze(['cache', 'salvage', 'recovery']);
export const SOURCE_OPS = Object.freeze(['open', 'deplete', 'restock']);
export const EFFECT_KEYS = Object.freeze(['work', 'hurt', 'zone', 'lungs']);
/** The bar's green zone (pixels) every ship repair starts from. */
export const BASE_ZONE = 26;

const ids = (obj) => Object.keys(obj ?? {}).filter((k) => !k.startsWith('//'));
const entry = (obj, id) => (isPlainObject(obj?.[id]) && !String(id).startsWith('//') ? obj[id] : null);

export function supplyData(content) {
  const d = content?.shipSupplies;
  return isPlainObject(d) ? d : null;
}

/** The class an item belongs to (repair, ingredient, ...), or null: a story item this system never takes. */
export function classOf(content, item) {
  const classes = supplyData(content)?.classes ?? {};
  for (const id of ids(classes)) if (asArray(classes[id].items).includes(item)) return id;
  return null;
}

export function classItems(content, cls) {
  return asArray(supplyData(content)?.classes?.[cls]?.items);
}

export const storeIds = (content) => ids(supplyData(content)?.stores);
export const storeDef = (content, id) => entry(supplyData(content)?.stores, id);
export const sourceIds = (content) => ids(supplyData(content)?.sources);
export const sourceDef = (content, id) => entry(supplyData(content)?.sources, id);
export const recipeIds = (content) => ids(supplyData(content)?.recipes);
export const recipeDef = (content, id) => entry(supplyData(content)?.recipes, id);
export const effectIds = (content) => ids(supplyData(content)?.effects);
export const effectDef = (content, id) => entry(supplyData(content)?.effects, id);
export const stationDef = (content, id) => entry(supplyData(content)?.stations, id);
export const gearIds = (content) => ids(supplyData(content)?.gear?.items);
export const gearDef = (content, item) => entry(supplyData(content)?.gear?.items, item);
export const gearSlots = (content) => ids(supplyData(content)?.gear?.slots);
export const supplyLimits = (content) => ({ work: 0.8, hurt: 0.5, lungs: 0.35, zone: 6, seconds: 600, recover: 30, give: 99, ...(supplyData(content)?.limits ?? {}) });

/** Standing within reach of one of a place's tiles, in its room. */
export function within(location, place) {
  if (!place || location?.map !== place.room) return false;
  return asArray(place.at).some(([x, y]) => Math.max(Math.abs((location.x ?? 0) - x), Math.abs((location.y ?? 0) - y)) <= (place.reach ?? 1));
}

export const sourcesHere = (content, location) => sourceIds(content).filter((id) => within(location, sourceDef(content, id)));
export const storesHere = (content, location) => storeIds(content).filter((id) => within(location, storeDef(content, id)));
export const stationHere = (content, location) => ids(supplyData(content)?.stations).find((id) => within(location, stationDef(content, id))) ?? null;
export const waterHere = (content, location) => asArray(supplyData(content)?.gear?.water).find((w) => within(location, w)) ?? null;

/** The stores an action ("cook") may draw on from a room: their own room, or one the data lets it spend from. */
export function storesFor(content, action, room) {
  return storeIds(content).filter((id) => {
    const s = storeDef(content, id);
    return s.room === room || (asArray(s.spend?.for).includes(action) && asArray(s.spend?.in).includes(room));
  });
}

/** A yield on a difficulty: more on an easier one, fewer on a harder one, never below one. */
export function scaleYield(n, scale = 1) {
  const v = n * scale;
  return Math.max(1, scale >= 1 ? Math.ceil(v - 1e-9) : Math.floor(v + 1e-9));
}

/** What a source gives on a difficulty, and for an outcome's share (a partial salvage: half, rounded down, the first always at least one). */
export function sourceYields(content, id, difficulty, share = 1) {
  const def = sourceDef(content, id);
  if (!def) return [];
  const t = shipTuning(content, difficulty);
  return asArray(def.yields)
    .map((y, i) => {
      const full = scaleYield(y.count ?? 1, t.supplyYieldScale);
      const n = share >= 1 ? full : Math.floor(full * share + 1e-9);
      return { item: y.item, count: i === 0 ? Math.max(1, n) : n };
    })
    .filter((y) => y.count > 0);
}

/** Seconds of hazard time between restocks, and a recovery's cooldown, on a difficulty. */
export const restockSeconds = (def, t) => Math.max(10, Math.round((def?.restock?.every ?? 0) * (t?.restockScale ?? 1)));
export const cooldownSeconds = (def, t) => Math.max(10, Math.round((def?.cooldown ?? 0) * (t?.restockScale ?? 1)));

/** A recipe is one the captain knows: every one, unless the data says a script teaches it. */
export function recipeKnown(content, id, learned = []) {
  const r = recipeDef(content, id);
  return !!r && (r.known !== false || learned.includes(id));
}

/** The repairs' and responses' bills, by where they are written (for the economy check and the docs). */
export function materialUses(content) {
  const out = [];
  const add = (where, list) => {
    for (const c of asArray(list)) if (c?.item) out.push({ where, item: c.item, count: c.count ?? 1 });
  };
  for (const [id, r] of Object.entries(content?.ship?.repairs ?? {})) {
    if (id.startsWith('//')) continue;
    add(`repair ${id}`, r.cost);
    add(`repair ${id} (failure)`, r.results?.failure?.waste);
    add(`repair ${id} (partial)`, r.results?.partial?.extra);
  }
  const hz = content?.shipHazards?.actions ?? {};
  for (const [a, def] of Object.entries(hz)) {
    if (a.startsWith('//') || !isPlainObject(def)) continue;
    if (isPlainObject(def.cost) && !Array.isArray(def.cost)) for (const [sev, list] of Object.entries(def.cost)) add(`hazards ${a} (${sev})`, list);
    else add(`hazards ${a}`, def.cost);
    add(`hazards ${a} (failure)`, def.waste);
  }
  for (const [a, def] of Object.entries(content?.shipAir?.actions ?? {})) {
    if (a.startsWith('//') || !isPlainObject(def)) continue;
    add(`air ${a}`, def.cost);
    add(`air ${a} (failure)`, def.waste);
  }
  add('beard scrub', content?.shipBeard?.care?.scrub?.cost);
  return out;
}

/**
 * The economy on every difficulty, for the validator and `npm run economy`:
 * for each functional resource, where it comes from (sources, recipes,
 * shops), the most the finite sources give, whether a renewable path
 * exists (a restock or a recovery), and what uses it. Nothing is invented:
 * "mandatory" lists only what a chapter actually requires (none: no
 * chapter opts in), and every repair bill is reported per action.
 */
export function economyReport(content) {
  const data = supplyData(content);
  if (!data) return { difficulties: {}, problems: [] };
  const uses = materialUses(content);
  const shops = [];
  for (const shop of content?.shops?.list?.() ?? []) for (const s of asArray(shop.stock ?? shop.items)) shops.push({ shop: shop.id, item: s.id ?? s.item ?? s });
  const items = new Set([...SUPPLY_CLASSES.flatMap((c) => classItems(content, c)), ...uses.map((u) => u.item)]);
  const problems = [];
  const difficulties = {};
  for (const d of DIFFICULTIES) {
    const t = shipTuning(content, d);
    const rows = {};
    for (const item of [...items].sort()) {
      const row = { item, class: classOf(content, item), sources: [], finiteMax: 0, renewable: [], recipes: [], shops: shops.filter((s) => s.item === item).map((s) => s.shop), usedBy: [] };
      for (const id of sourceIds(content)) {
        const def = sourceDef(content, id);
        const y = sourceYields(content, id, d).find((x) => x.item === item);
        if (!y) continue;
        row.sources.push(id);
        if (def.type === 'recovery') row.renewable.push(`${id}: ${y.count} every ${cooldownSeconds(def, t) + (def.action?.seconds ?? 0)}s`);
        else {
          row.finiteMax += y.count * (def.uses ?? 1);
          if (def.restock) row.renewable.push(`${id}: ${y.count} every ${restockSeconds(def, t)}s`);
        }
      }
      for (const rid of recipeIds(content)) if (recipeDef(content, rid).product === item) row.recipes.push(rid);
      for (const u of uses) if (u.item === item) row.usedBy.push(u.where);
      for (const rid of recipeIds(content)) if (asArray(recipeDef(content, rid).ingredients).some((x) => x.item === item)) row.usedBy.push(`recipe ${rid}`);
      rows[item] = row;
      // A repair or response material with no way back from empty would be a softlock waiting for the first chapter that opts in.
      if (row.class === 'repair' && uses.some((u) => u.item === item) && !row.renewable.length && !row.shops.length) problems.push(`[${d}] "${item}" is a repair material with no renewable source (a restock, a recovery or a shop)`);
      if (row.class === 'ingredient' && !row.sources.length && !row.shops.length) problems.push(`[${d}] ingredient "${item}" has no source`);
    }
    difficulties[d] = { rows, mandatory: [] };
  }
  return { difficulties, problems };
}

// --- validation ---------------------------------------------------------------

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const tile = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger);

function placeProblems(content, p, at, out) {
  if (!content.maps?.get?.(p.room)) out.push(`${at}: unknown room "${p.room}"`);
  if (!asArray(p.at).length || asArray(p.at).some((x) => !tile(x))) out.push(`${at}: at is a list of [x, y] tiles`);
  if (!(Number.isInteger(p.reach ?? 1) && (p.reach ?? 1) >= 1 && (p.reach ?? 1) <= 3)) out.push(`${at}: reach must be 1 to 3 tiles`);
  if (typeof p.label !== 'string') out.push(`${at}: needs a label`);
}

function billProblems(content, list, at, out, { allowKey = false, positive = true } = {}) {
  const seen = new Set();
  for (const c of asArray(list)) {
    const item = content.items?.get?.(c?.item);
    if (!item) out.push(`${at}: unknown item "${c?.item}"`);
    else if (item.type === 'key' && !allowKey) out.push(`${at}: "${c.item}" is a story key item (never taken, given or stored by supplies)`);
    if (!(Number.isInteger(c?.count ?? 1) && (c?.count ?? 1) >= (positive ? 1 : 0) && (c?.count ?? 1) <= 20)) out.push(`${at}: "${c?.item}" count must be a whole number 1 to 20`);
    if (seen.has(c?.item)) out.push(`${at}: "${c?.item}" twice (one entry per item)`);
    seen.add(c?.item);
  }
}

/** Problems in data/ship/supplies.json (a list of messages). */
export function suppliesDataProblems(content) {
  const data = supplyData(content);
  const at = 'data/ship/supplies.json';
  if (!data) return [];
  const out = [];
  const known = ['classes', 'stores', 'sources', 'gear', 'effects', 'limits', 'stations', 'recipes'];
  for (const key of Object.keys(data)) if (!key.startsWith('//') && !known.includes(key)) out.push(`${at}: unknown field "${key}"`);
  const lim = supplyLimits(content);

  // Classes: every item once, a real item, never a key item (but gear: story key items given a use, never taken).
  const owner = new Map();
  for (const cls of ids(data.classes)) {
    const ca = `${at} (classes.${cls})`;
    if (!SUPPLY_CLASSES.includes(cls)) out.push(`${ca}: unknown class (use: ${SUPPLY_CLASSES.join(', ')})`);
    if (typeof data.classes[cls].label !== 'string') out.push(`${ca}: needs a label`);
    for (const item of asArray(data.classes[cls].items)) {
      const def = content.items?.get?.(item);
      if (!def) out.push(`${ca}: unknown item "${item}"`);
      else if (cls === 'equipment' ? !gearDef(content, item) : def.type === 'key') out.push(cls === 'equipment' ? `${ca}: "${item}" isn't in gear.items` : `${ca}: "${item}" is a story key item`);
      if (owner.has(item)) out.push(`${ca}: "${item}" is already in ${owner.get(item)} (one class each)`);
      owner.set(item, cls);
    }
  }
  if (classOf(content, 'frog_grog')) out.push(`${at} (classes): frog_grog is the story's (never classed: nothing here takes it)`);

  // Stores.
  for (const id of storeIds(content)) {
    const s = storeDef(content, id);
    const sa = `${at} (stores.${id})`;
    placeProblems(content, s, sa, out);
    if (!(Number.isInteger(s.capacity) && s.capacity >= 1 && s.capacity <= 999)) out.push(`${sa}: capacity must be 1 to 999 units`);
    if (!asArray(s.accepts).length) out.push(`${sa}: accepts at least one class`);
    for (const c of asArray(s.accepts)) if (!SUPPLY_CLASSES.includes(c) || c === 'equipment') out.push(`${sa}: accepts "${c}"? (a class, never equipment: gear is worn, not stored)`);
    for (const a of asArray(s.spend?.for)) if (a !== 'cook') out.push(`${sa}: spend.for "${a}"? (cook: repairs pay from the pack)`);
    for (const r of asArray(s.spend?.in)) if (!content.maps?.get?.(r)) out.push(`${sa}: spend.in: unknown room "${r}"`);
  }

  // Sources: real places, real items, finite unless a recovery, a recovery small and slow.
  for (const id of sourceIds(content)) {
    const s = sourceDef(content, id);
    const sa = `${at} (sources.${id})`;
    for (const key of Object.keys(s)) if (!key.startsWith('//') && !['type', 'label', 'room', 'at', 'reach', 'action', 'yields', 'results', 'knock', 'uses', 'restock', 'cooldown', 'when', 'closed'].includes(key)) out.push(`${sa}: unknown field "${key}"`);
    if (!/^[a-z][a-z0-9_]*$/.test(id)) out.push(`${sa}: ids are lower_snake_case`);
    if (!SOURCE_TYPES.includes(s.type)) out.push(`${sa}: type is ${SOURCE_TYPES.join(', ')}`);
    placeProblems(content, s, sa, out);
    if (!asArray(s.yields).length) out.push(`${sa}: yields nothing`);
    billProblems(content, s.yields, `${sa} yields`, out);
    const a = s.action ?? {};
    if (typeof a.label !== 'string') out.push(`${sa}: action needs a label`);
    if (!(Number.isInteger(a.seconds) && a.seconds >= 1 && a.seconds <= 30)) out.push(`${sa}: action.seconds must be 1 to 30`);
    if (s.type === 'salvage') {
      if (!REPAIR_KINDS[a.kind]) out.push(`${sa}: action.kind "${a.kind}" isn't a timing bar kind`);
      if (!(Number.isInteger(a.strikes) && a.strikes >= 1 && a.strikes <= 8)) out.push(`${sa}: action.strikes must be 1 to 8`);
      const r = s.results ?? {};
      if (!(num(r.success) && num(r.partial) && r.success === 1 && r.partial > 0 && r.partial < 1)) out.push(`${sa}: results: success 1, partial above 0 and below 1`);
      if (s.knock !== undefined && !(num(s.knock.hp) && s.knock.hp > 0 && s.knock.hp <= 20 && num(s.knock.floor) && s.knock.floor >= 0.1 && s.knock.floor < 1)) out.push(`${sa}: knock: hp 1 to 20 and a floor 0.1 to 1 (it never kills)`);
    } else {
      if (a.kind !== undefined || a.challenge !== undefined || s.results !== undefined || s.knock !== undefined) out.push(`${sa}: only a salvage is on the timing bar`);
    }
    if (s.type === 'recovery') {
      if (s.uses !== undefined) out.push(`${sa}: a recovery never runs out (no "uses")`);
      if (!(Number.isInteger(s.cooldown) && s.cooldown >= 20 && s.cooldown <= 600)) out.push(`${sa}: a recovery needs a cooldown of 20 to 600 seconds (it is the way back from empty, not a fountain)`);
      if (s.restock !== undefined || s.closed) out.push(`${sa}: a recovery is always there: no restock, never closed`);
      for (const y of asArray(s.yields)) if ((y.count ?? 1) > 2) out.push(`${sa}: a recovery gives a little: at most 2 of each`);
      if (s.when !== undefined) out.push(`${sa}: a recovery has no condition (it must always be there)`);
    } else {
      if (!(Number.isInteger(s.uses) && s.uses >= 1 && s.uses <= 9)) out.push(`${sa}: uses must be 1 to 9 (a recovery is the only unlimited source)`);
      if (s.cooldown !== undefined) out.push(`${sa}: only a recovery has a cooldown`);
    }
    if (s.restock !== undefined) {
      const r = s.restock;
      if (!(Number.isInteger(r.every) && r.every >= 30 && r.every <= 3600 && Number.isInteger(r.add) && r.add >= 1 && Number.isInteger(r.max) && r.max >= r.add && r.max <= (s.uses ?? 1))) out.push(`${sa}: restock: every 30 to 3600 seconds, add 1 or more, max from add to uses`);
    }
  }

  // Gear: real items, real slots, restrictions that name gear.
  const slots = gearSlots(content);
  for (const item of gearIds(content)) {
    const g = gearDef(content, item);
    const ga = `${at} (gear.items.${item})`;
    if (!content.items?.get?.(item)) out.push(`${ga}: unknown item`);
    if (!slots.includes(g.slot)) out.push(`${ga}: slot "${g.slot}"? (${slots.join(', ')})`);
    if (typeof g.note !== 'string') out.push(`${ga}: needs a note (what it does, in words)`);
    for (const key of Object.keys(g)) if (!key.startsWith('//') && !['slot', 'note', 'knock', 'charges', 'notWith', 'notWithReason', 'when'].includes(key)) out.push(`${ga}: unknown field "${key}"`);
    if (g.knock !== undefined && !(num(g.knock) && g.knock >= 0.25 && g.knock < 1)) out.push(`${ga}: knock must be 0.25 to under 1 (a share of a knock; never immunity)`);
    for (const o of asArray(g.notWith)) if (!gearDef(content, o) || o === item) out.push(`${ga}: notWith "${o}" isn't other gear`);
    if (g.notWith !== undefined && typeof g.notWithReason !== 'string') out.push(`${ga}: notWith needs a notWithReason (said when refused)`);
    if (g.charges !== undefined && !(Number.isInteger(g.charges.max) && g.charges.max >= 10 && g.charges.max <= 600 && typeof g.charges.label === 'string' && typeof g.charges.empty === 'string')) out.push(`${ga}: charges: max 10 to 600 seconds, a label and an empty word`);
    // Something to do: a beard effect, a knock, or charges (no slot without a function).
    if (!content.shipBeard?.equipment?.[item] && g.knock === undefined) out.push(`${ga}: does nothing (no beard effect, no knock)`);
  }
  for (const s of slots) if (typeof data.gear.slots[s] !== 'string') out.push(`${at} (gear.slots.${s}): needs a label`);
  for (const s of slots) if (!gearIds(content).some((i) => gearDef(content, i).slot === s)) out.push(`${at} (gear.slots.${s}): nothing is worn there (no slot without a function)`);
  for (const [i, w] of asArray(data.gear?.water).entries()) placeProblems(content, w, `${at} (gear.water[${i}])`, out);

  // Effects: bounded.
  for (const id of effectIds(content)) {
    const e = effectDef(content, id);
    const ea = `${at} (effects.${id})`;
    for (const key of Object.keys(e)) if (!key.startsWith('//') && !['label', 'short', 'group', 'seconds', 'note', ...EFFECT_KEYS].includes(key)) out.push(`${ea}: unknown field "${key}"`);
    if (typeof e.label !== 'string' || typeof e.short !== 'string' || typeof e.note !== 'string') out.push(`${ea}: needs a label, a short label and a note`);
    if (!['meal', 'draught'].includes(e.group)) out.push(`${ea}: group is meal or draught`);
    if (!(Number.isInteger(e.seconds) && e.seconds >= 10 && e.seconds <= lim.seconds)) out.push(`${ea}: seconds must be 10 to ${lim.seconds} (an effect always ends)`);
    if (!EFFECT_KEYS.some((k) => e[k] !== undefined)) out.push(`${ea}: does nothing`);
    if (e.work !== undefined && !(num(e.work) && e.work >= lim.work && e.work < 1)) out.push(`${ea}: work must be ${lim.work} to under 1`);
    if (e.hurt !== undefined && !(num(e.hurt) && e.hurt >= lim.hurt && e.hurt < 1)) out.push(`${ea}: hurt must be ${lim.hurt} to under 1`);
    if (e.lungs !== undefined && !(num(e.lungs) && e.lungs >= lim.lungs && e.lungs < 1)) out.push(`${ea}: lungs must be ${lim.lungs} to under 1 (never better than the best Frog Grog ward)`);
    if (e.lungs !== undefined && e.group !== 'draught') out.push(`${ea}: lungs is a draught's (taken with the Frog Grog ward, the smaller)`);
    if (e.zone !== undefined && !(Number.isInteger(e.zone) && e.zone !== 0 && Math.abs(e.zone) <= lim.zone)) out.push(`${ea}: zone must be a whole number, not 0, at most ${lim.zone} either way`);
  }

  // Stations and recipes: a stove somewhere, real ingredients, a real bar, a product that is food.
  for (const id of ids(data.stations)) placeProblems(content, stationDef(content, id), `${at} (stations.${id})`, out);
  for (const id of recipeIds(content)) {
    const r = recipeDef(content, id);
    const ra = `${at} (recipes.${id})`;
    for (const key of Object.keys(r)) if (!key.startsWith('//') && !['name', 'ingredients', 'station', 'product', 'serves', 'waste', 'seconds', 'simmer', 'action', 'known'].includes(key)) out.push(`${ra}: unknown field "${key}"`);
    if (typeof r.name !== 'string') out.push(`${ra}: needs a name`);
    if (!stationDef(content, r.station)) out.push(`${ra}: unknown station "${r.station}"`);
    if (!asArray(r.ingredients).length) out.push(`${ra}: no ingredients`);
    billProblems(content, r.ingredients, `${ra} ingredients`, out);
    for (const c of asArray(r.ingredients)) {
      const cls = classOf(content, c.item);
      if (cls && cls !== 'ingredient') out.push(`${ra}: "${c.item}" is ${cls}, not an ingredient`);
      if (!sourceIds(content).some((s) => asArray(sourceDef(content, s).yields).some((y) => y.item === c.item))) out.push(`${ra}: "${c.item}" comes from no source (it could never be cooked)`);
      const most = Math.max(0, ...storeIds(content).map((s) => storeDef(content, s).capacity ?? 0), content.items?.get?.(c.item)?.maxStack ?? 99);
      if ((c.count ?? 1) > most) out.push(`${ra}: needs more "${c.item}" than can ever be held`);
    }
    billProblems(content, r.waste, `${ra} waste`, out);
    for (const w of asArray(r.waste)) {
      const need = asArray(r.ingredients).find((x) => x.item === w.item);
      if (!need || (w.count ?? 1) > (need.count ?? 1)) out.push(`${ra}: waste "${w.item}" must be one of its ingredients, never more than the recipe takes`);
    }
    const prod = content.items?.get?.(r.product);
    if (!prod) out.push(`${ra}: unknown product "${r.product}"`);
    else if (classOf(content, r.product) !== 'food') out.push(`${ra}: product "${r.product}" isn't food`);
    const sv = r.serves ?? {};
    if (!(Number.isInteger(sv.success) && Number.isInteger(sv.partial) && sv.success > sv.partial && sv.partial >= 1 && sv.success <= 4)) out.push(`${ra}: serves: success above partial, partial at least 1, at most 4`);
    if (sv.failure !== undefined) out.push(`${ra}: a failure serves nothing (scorched): no serves.failure`);
    if (!(Number.isInteger(r.seconds) && r.seconds >= 1 && r.seconds <= 20)) out.push(`${ra}: seconds must be 1 to 20`);
    if (!(Number.isInteger(r.simmer) && r.simmer >= 0 && r.simmer <= 300)) out.push(`${ra}: simmer must be 0 to 300 seconds`);
    if (!REPAIR_KINDS[r.action?.kind]) out.push(`${ra}: action.kind "${r.action?.kind}" isn't a timing bar kind`);
    if (!(Number.isInteger(r.action?.strikes) && r.action.strikes >= 1 && r.action.strikes <= 8)) out.push(`${ra}: action.strikes must be 1 to 8`);
    if (r.known !== undefined && typeof r.known !== 'boolean') out.push(`${ra}: known is true or false`);
  }
  // Food the galley serves: each effect it names is defined, and each item gives one meal effect at most.
  for (const item of classItems(content, 'food').concat(classItems(content, 'consumable'))) {
    const def = content.items?.get?.(item);
    const fx = asArray(def?.use?.effects).filter((e) => e.type === 'shipEffect');
    if (fx.length > 1) out.push(`${at} (classes): "${item}" gives two supply effects (one each: they would contradict)`);
  }
  if (!(num(lim.work) && lim.work >= 0.5 && lim.work < 1 && num(lim.hurt) && lim.hurt >= 0.25 && lim.hurt < 1 && num(lim.lungs) && lim.lungs >= 0.25 && lim.lungs < 1)) out.push(`${at} (limits): work 0.5 to 1, hurt and lungs 0.25 to 1`);
  for (const p of economyReport(content).problems) out.push(`${at} (economy): ${p}`);
  return out;
}

/** Problems in one { "type": "shipEffect", ... } item effect. */
export function shipEffectProblems(content, e) {
  const out = [];
  const lim = supplyLimits(content);
  if (e.effect === undefined && e.recover === undefined) out.push('shipEffect needs "effect" (data/ship/supplies.json effects) or "recover"');
  if (e.effect !== undefined && supplyData(content) && !effectDef(content, e.effect)) out.push(`shipEffect: unknown effect "${e.effect}"`);
  if (e.recover !== undefined && !(Number.isInteger(e.recover) && e.recover >= 1 && e.recover <= lim.recover)) out.push(`shipEffect: recover must be 1 to ${lim.recover} (minor recovery, never a cure)`);
  for (const k of Object.keys(e)) if (!['type', 'effect', 'recover'].includes(k)) out.push(`shipEffect: unknown field "${k}"`);
  return out;
}

/** Every difficulty can still reach every repair material (for the tests and the report). */
export function recoverable(content) {
  return economyReport(content).problems.length === 0;
}

export { DIFFICULTIES as SUPPLY_DIFFICULTIES };
