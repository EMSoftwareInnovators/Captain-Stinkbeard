import { isPlainObject, asArray } from '../../core/util.js';
import { difficultyPreset, DEFAULT_DIFFICULTY, DIFFICULTIES } from '../challenge/difficulty.js';

/**
 * Ship Integrity's rules (docs/gameplay-overhaul/09-ship-integrity.md):
 * pure functions over data/ship/integrity.json. ShipState
 * (./ShipState.js) holds the condition; this module says what it means.
 *
 *   sections    stable ids (hull_port, rigging, ...) with a name, a maximum,
 *               damage resistance per category, the rooms they are worked
 *               from (map ids, never tiles), and the repairs that fix them
 *   thresholds  condition by percentage: healthy, worn, damaged, critical,
 *               disabled, each with an efficiency and whether it still works
 *   categories  what can damage the ship (impact, shark, cannon, ...)
 *   repairs     a repair's materials, timing bar and results per outcome
 *
 * Difficulty (data/difficulty/presets.json, "ship") scales damage, repair
 * results and material counts, and decides whether one blow can take a
 * section that is still holding straight to nothing ("grace").
 */

/** The difficulty adjustments a preset may give the ship, with bounds. */
export const SHIP_TUNING = Object.freeze({
  damageScale: [0.5, 1.5],
  repairScale: [0.5, 1.5],
  costScale: [0.5, 2],
  // Prompt 6 hazards (docs/gameplay-overhaul/10-flooding-and-fire.md): leak inflow, fire growth and spread, what one pump, bail or douse achieves.
  leakScale: [0.5, 1.5],
  fireScale: [0.5, 1.5],
  responseScale: [0.5, 1.5],
});
export const SHIP_TUNING_DEFAULTS = Object.freeze({ damageScale: 1, repairScale: 1, costScale: 1, leakScale: 1, fireScale: 1, responseScale: 1, grace: true });

/** The outcomes a repair names results for. */
export const REPAIR_OUTCOMES = Object.freeze(['success', 'partial', 'failure']);

export function shipData(content) {
  return content?.ship ?? null;
}

export function sectionDef(content, id) {
  const def = shipData(content)?.sections?.[id];
  return isPlainObject(def) ? def : null;
}

export function sectionIds(content) {
  return Object.keys(shipData(content)?.sections ?? {}).filter((k) => !k.startsWith('//'));
}

export function categoryIds(content) {
  return Object.keys(shipData(content)?.categories ?? {}).filter((k) => !k.startsWith('//'));
}

/** Thresholds, highest first. */
export function thresholdList(content) {
  return [...(shipData(content)?.thresholds ?? [])].sort((a, b) => b.min - a.min);
}

/**
 * The threshold a condition falls in: 0 is always the bottom one (disabled);
 * anything above 0 is the highest whose "min" (percent) it reaches, never
 * the bottom one.
 */
export function thresholdFor(list, hp, max) {
  if (!list.length) return { id: hp > 0 ? 'healthy' : 'disabled', label: hp > 0 ? 'Healthy' : 'Disabled', min: 0, efficiency: hp > 0 ? 1 : 0, operational: hp > 0 };
  const bottom = list[list.length - 1];
  if (!(hp > 0)) return bottom;
  const pct = (hp / max) * 100;
  return list.find((t) => t !== bottom && pct >= t.min) ?? list[list.length - 2] ?? bottom;
}

/** A difficulty's ship tuning (the preset's "ship" block over the defaults). */
export function shipTuning(content, difficulty = DEFAULT_DIFFICULTY) {
  const t = difficultyPreset(content, DIFFICULTIES.includes(difficulty) ? difficulty : DEFAULT_DIFFICULTY)?.ship ?? {};
  const out = { ...SHIP_TUNING_DEFAULTS };
  for (const [k, [min, max]] of Object.entries(SHIP_TUNING)) if (Number.isFinite(t[k])) out[k] = Math.max(min, Math.min(max, t[k]));
  if (typeof t.grace === 'boolean') out.grace = t.grace;
  return out;
}

/** A material count on a difficulty: scaled, rounded up, never below 1. */
export function scaleCount(n, scale = 1) {
  return Math.max(1, Math.ceil(n * scale - 1e-9));
}

const scaleItems = (list, scale) => asArray(list).map((c) => ({ item: c.item, count: scaleCount(c.count ?? 1, scale) }));

/** Adds item lists together: [{ item, count }] with each item once. */
export function sumItems(...lists) {
  const m = new Map();
  for (const list of lists) for (const c of asArray(list)) m.set(c.item, (m.get(c.item) ?? 0) + (c.count ?? 1));
  return [...m].map(([item, count]) => ({ item, count }));
}

/**
 * A repair as it plays on a difficulty: its materials and its results per
 * outcome. "results" are Captain's numbers; another difficulty scales them
 * (restore × repairScale, counts × costScale, damage × damageScale) unless
 * the repair writes that outcome for the difficulty itself
 * ("difficulty": { "brutal": { "results": { "failure": {...} } } }), which
 * is then used as written.
 */
export function resolveRepair(content, repairId, difficulty = DEFAULT_DIFFICULTY) {
  const def = shipData(content)?.repairs?.[repairId];
  if (!isPlainObject(def)) return null;
  const t = shipTuning(content, difficulty);
  const own = def.difficulty?.[difficulty]?.results ?? {};
  const results = {};
  for (const o of REPAIR_OUTCOMES) {
    const base = def.results?.[o] ?? {};
    if (own[o]) {
      results[o] = { restore: own[o].restore ?? 0, extra: asArray(own[o].extra).map((c) => ({ item: c.item, count: c.count ?? 1 })), waste: asArray(own[o].waste).map((c) => ({ item: c.item, count: c.count ?? 1 })), damage: own[o].damage ?? 0 };
      continue;
    }
    results[o] = {
      restore: base.restore ? Math.max(1, Math.round(base.restore * t.repairScale)) : 0,
      extra: scaleItems(base.extra, t.costScale),
      waste: scaleItems(base.waste, t.costScale),
      damage: base.damage ? Math.max(1, Math.round(base.damage * t.damageScale)) : 0,
    };
  }
  const cost = scaleItems(def.cost, t.costScale);
  // The most one outcome can take (a partial: the cost and its extra; a failure: its waste): what a repair must have to start.
  const get = (list, item) => list.find((c) => c.item === item)?.count ?? 0;
  const named = [...new Set([...cost, ...results.partial.extra, ...results.failure.waste].map((c) => c.item))];
  const worst = named.map((item) => ({ item, count: Math.max(get(cost, item) + get(results.partial.extra, item), get(results.failure.waste, item)) }));
  return {
    id: repairId,
    label: def.label ?? repairId,
    title: def.title ?? null,
    kind: def.kind ?? 'hull',
    strikes: def.strikes ?? 3,
    cost,
    results,
    challenge: def.challenge ?? { profile: 'ship_repair' },
    difficulty,
    worst,
  };
}

/**
 * How many attempts a repair can afford with what's in the hold: every
 * failed attempt wastes its materials, and the last attempt must still be
 * able to pay for its worst outcome. 0: it can't start. Infinity: failures
 * waste nothing.
 */
export function affordableAttempts(repair, have) {
  for (const w of repair.worst) if (have(w.item) < w.count) return 0;
  let n = Infinity;
  for (const w of repair.results.failure.waste) {
    const worst = repair.worst.find((c) => c.item === w.item)?.count ?? 0;
    n = Math.min(n, 1 + Math.floor((have(w.item) - worst) / w.count));
  }
  return n;
}

/** The repair a section needs now: its rebuild when it's disabled, else its repair. */
export function repairIdFor(def, hp) {
  if (!def) return null;
  return hp <= 0 ? def.rebuild ?? def.repair ?? null : def.repair ?? null;
}

/** Everything wrong with data/ship/integrity.json (and the items it names). */
export function shipDataProblems(content) {
  const out = [];
  const data = shipData(content);
  const at = 'data/ship/integrity.json';
  if (!data) return [`${at}: missing`];
  for (const key of Object.keys(data)) if (!key.startsWith('//') && !['thresholds', 'categories', 'sections', 'repairs', 'onDestroyed'].includes(key)) out.push(`${at}: unknown field "${key}"`);
  // The hook for a future defeat: a script the world calls when a vital section reaches 0.
  if (data.onDestroyed?.script && !content.scripts?.has?.(data.onDestroyed.script)) out.push(`${at}: onDestroyed.script "${data.onDestroyed.script}" is not a script`);
  const list = thresholdList(content);
  if (list.length < 2) out.push(`${at}: needs at least two thresholds`);
  if (list.length && list[list.length - 1].min !== 0) out.push(`${at}: the lowest threshold must have "min": 0 (a section at 0 is out of action)`);
  if (list.length && list[list.length - 1].operational !== false) out.push(`${at}: the lowest threshold must be "operational": false`);
  const ids = new Set();
  for (const t of list) {
    if (!t.id || ids.has(t.id)) out.push(`${at}: thresholds need unique ids (got "${t.id}")`);
    ids.add(t.id);
    if (!(t.min >= 0 && t.min <= 100)) out.push(`${at}: threshold "${t.id}" min must be 0 to 100`);
    if (!(t.efficiency >= 0 && t.efficiency <= 1)) out.push(`${at}: threshold "${t.id}" efficiency must be 0 to 1`);
    if (typeof t.label !== 'string') out.push(`${at}: threshold "${t.id}" needs a label`);
  }
  for (let i = 1; i < list.length; i++) if (list[i].efficiency > list[i - 1].efficiency) out.push(`${at}: threshold "${list[i].id}" can't work better than "${list[i - 1].id}"`);
  const cats = new Set(categoryIds(content));
  if (!cats.size) out.push(`${at}: needs damage categories`);
  const maps = content.maps;
  const items = content.items;
  const repairs = data.repairs ?? {};
  for (const [id, s] of Object.entries(data.sections ?? {})) {
    if (id.startsWith('//')) continue;
    const sa = `${at} (sections.${id})`;
    if (!/^[a-z][a-z0-9_]*$/.test(id)) out.push(`${sa}: a section id is lower_snake_case`);
    for (const key of Object.keys(s)) if (!key.startsWith('//') && !['name', 'max', 'vital', 'function', 'functionLabel', 'rooms', 'resist', 'repair', 'rebuild', 'repairable'].includes(key)) out.push(`${sa}: unknown field "${key}"`);
    if (typeof s.name !== 'string' || !s.name) out.push(`${sa}: needs a name`);
    if (!(Number.isInteger(s.max) && s.max > 0 && s.max <= 1000)) out.push(`${sa}: "max" must be a whole number from 1 to 1000`);
    for (const room of asArray(s.rooms)) if (maps && !maps.has(room)) out.push(`${sa}: unknown room "${room}"`);
    if ('x' in s || 'y' in s || 'tiles' in s) out.push(`${sa}: a section is never placed by tile coordinates (map it to rooms and stations)`);
    for (const [cat, k] of Object.entries(s.resist ?? {})) {
      if (!cats.has(cat)) out.push(`${sa}: resist names unknown category "${cat}"`);
      if (!(k >= 0 && k <= 3)) out.push(`${sa}: resist.${cat} must be 0 (immune) to 3`);
    }
    if (s.repairable !== false) {
      if (!s.repair) out.push(`${sa}: a repairable section needs a "repair"`);
      for (const r of [s.repair, s.rebuild].filter(Boolean)) if (!repairs[r]) out.push(`${sa}: unknown repair "${r}"`);
    }
  }
  // Each difficulty's ship tuning (data/difficulty/presets.json "ship"), within bounds.
  for (const d of DIFFICULTIES) {
    const t = difficultyPreset(content, d)?.ship;
    if (t === undefined) continue;
    const pa = `data/difficulty/presets.json (${d}.ship)`;
    if (!isPlainObject(t)) {
      out.push(`${pa}: must be an object`);
      continue;
    }
    for (const [k, v] of Object.entries(t)) {
      if (k.startsWith('//')) continue;
      if (k === 'grace') {
        if (typeof v !== 'boolean') out.push(`${pa}: grace must be true or false`);
      } else if (!SHIP_TUNING[k]) out.push(`${pa}: unknown field "${k}" (use: ${Object.keys(SHIP_TUNING).join(', ')}, grace)`);
      else if (!(Number.isFinite(v) && v >= SHIP_TUNING[k][0] && v <= SHIP_TUNING[k][1])) out.push(`${pa}: ${k} must be from ${SHIP_TUNING[k][0]} to ${SHIP_TUNING[k][1]}`);
    }
  }
  for (const [id, r] of Object.entries(repairs)) {
    if (id.startsWith('//')) continue;
    const ra = `${at} (repairs.${id})`;
    for (const key of Object.keys(r)) if (!key.startsWith('//') && !['label', 'title', 'kind', 'strikes', 'cost', 'results', 'challenge', 'difficulty'].includes(key)) out.push(`${ra}: unknown field "${key}"`);
    if (!(Number.isInteger(r.strikes) && r.strikes >= 1 && r.strikes <= 8)) out.push(`${ra}: "strikes" must be 1 to 8`);
    if (!asArray(r.cost).length) out.push(`${ra}: a repair always costs materials`);
    const checkItems = (list, where, { positive = true } = {}) => {
      for (const c of asArray(list)) {
        if (items && !items.has(c.item)) out.push(`${ra}: ${where} names unknown item "${c.item}"`);
        if (positive && !(Number.isInteger(c.count ?? 1) && (c.count ?? 1) > 0)) out.push(`${ra}: ${where} counts must be whole numbers above 0`);
        const def = items?.get?.(c.item);
        if (def && def.type !== 'material') out.push(`${ra}: ${where} must name a material ("${c.item}" is ${def.type})`);
      }
    };
    checkItems(r.cost, 'cost');
    const checkResults = (results, where) => {
      for (const o of Object.keys(results ?? {})) if (!REPAIR_OUTCOMES.includes(o)) out.push(`${ra}: ${where} has unknown outcome "${o}"`);
      const s = results?.success;
      const p = results?.partial;
      const f = results?.failure;
      if (!(s?.restore > 0)) out.push(`${ra}: ${where}.success must restore something`);
      if (p && !(p.restore >= 0 && p.restore <= (s?.restore ?? 0))) out.push(`${ra}: ${where}.partial must restore 0 up to the success's amount`);
      if (f?.restore) out.push(`${ra}: ${where}.failure restores nothing`);
      if (f?.damage !== undefined && !(f.damage >= 0)) out.push(`${ra}: ${where}.failure.damage must be 0 or more`);
      checkItems(p?.extra, `${where}.partial.extra`);
      checkItems(f?.waste, `${where}.failure.waste`);
      for (const o of [s, p, f]) for (const k of Object.keys(o ?? {})) if (!['restore', 'extra', 'waste', 'damage'].includes(k)) out.push(`${ra}: ${where} has unknown field "${k}"`);
    };
    checkResults(r.results, 'results');
    for (const [d, block] of Object.entries(r.difficulty ?? {})) {
      if (!DIFFICULTIES.includes(d)) out.push(`${ra}: unknown difficulty "${d}"`);
      for (const k of Object.keys(block ?? {})) if (k !== 'results') out.push(`${ra}: difficulty.${d} can only change "results"`);
      if (block?.results) checkResults({ ...r.results, ...block.results }, `difficulty.${d}.results`);
    }
  }
  return out;
}
