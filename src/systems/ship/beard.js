import { isPlainObject, asArray } from '../../core/util.js';
import { REPAIR_KINDS } from '../repairKinds.js';
import { airRoom, substance } from './air.js';

/**
 * Stink Beard Saturation: the data and the rules that need no state
 * (docs/gameplay-overhaul/13-beard-saturation.md). The state is
 * ./BeardState.js, the captain's part ./beardResponse.js. Not the Story
 * Phase 16 contamination tags (systems/beard.js): those stay the story's.
 */

export const BEARD_PHASES = Object.freeze(['idle', 'overload', 'cooldown']);
export const STATUS_KINDS = Object.freeze(['derived', 'contaminant', 'applied']);
export const CARE_ACTIONS = Object.freeze(['rinse', 'scrub']);
export const PURGE_PROFILES = Object.freeze(['overload', 'controlled', 'catastrophic']);

const ids = (obj) => Object.keys(obj ?? {}).filter((k) => !k.startsWith('//'));

export function beardData(content) {
  const d = content?.shipBeard;
  return isPlainObject(d) ? d : null;
}

export function contaminantIds(content) {
  return ids(beardData(content)?.contaminants);
}

export function contaminant(content, id) {
  const c = beardData(content)?.contaminants?.[id];
  return isPlainObject(c) && !String(id).startsWith('//') ? c : null;
}

/** The contaminant the beard takes from an air substance (null if it takes none). */
export function contaminantFromAir(content, sub) {
  return contaminantIds(content).find((id) => contaminant(content, id).air === sub) ?? null;
}

export function beardStatusIds(content) {
  return ids(beardData(content)?.statuses);
}

export function beardStatus(content, id) {
  const s = beardData(content)?.statuses?.[id];
  return isPlainObject(s) && !String(id).startsWith('//') ? s : null;
}

export function beardStages(content) {
  return asArray(beardData(content)?.stages);
}

/** The stage for a fill (percent of capacity): the first whose "below" it is under; the last takes the rest. */
export function stageForPct(content, pct) {
  const stages = beardStages(content);
  return stages.find((s) => s.below !== undefined && pct < s.below) ?? stages[stages.length - 1] ?? { id: 'clean', label: 'clean', tone: 'g', absorb: 0 };
}

export function stageIndex(content, id) {
  return beardStages(content).findIndex((s) => s.id === id);
}

/** The station the captain is at (in its room, within reach of one of its spots), or null. */
export function careStation(content, location) {
  for (const st of asArray(beardData(content)?.care?.stations)) {
    if (location?.map !== st.room) continue;
    const near = asArray(st.at).some(([x, y]) => Math.max(Math.abs((location.x ?? 0) - x), Math.abs((location.y ?? 0) - y)) <= (st.reach ?? 2));
    return { ...st, near };
  }
  return null;
}

/** The stations' rooms (where care can be done). */
export function careRooms(content) {
  return asArray(beardData(content)?.care?.stations).map((s) => s.room);
}

// --- validation ---------------------------------------------------------------

const num = (v) => typeof v === 'number' && Number.isFinite(v);

/** Problems in data/ship/beard.json (a list of messages). */
export function beardDataProblems(content) {
  const data = beardData(content);
  const at = 'data/ship/beard.json';
  if (!data) return [];
  const out = [];
  const known = ['capacity', 'breath', 'contaminants', 'stages', 'statuses', 'purge', 'sniff', 'care', 'equipment', 'limits'];
  for (const key of Object.keys(data)) if (!key.startsWith('//') && !known.includes(key)) out.push(`${at}: unknown field "${key}"`);
  if (!(num(data.capacity) && data.capacity >= 10 && data.capacity <= 1000)) out.push(`${at}: capacity must be 10 to 1000`);
  if (!(num(data.breath) && data.breath > 0 && data.breath <= 20)) out.push(`${at}: breath must be above 0, at most 20 (units of air through the beard a second, at full concentration)`);

  // Contaminants.
  const cids = contaminantIds(content);
  if (!cids.length) out.push(`${at}: no contaminants`);
  const airTaken = new Set();
  for (const id of cids) {
    const c = data.contaminants[id];
    const ca = `${at} (contaminants.${id})`;
    for (const key of Object.keys(c)) if (!key.startsWith('//') && !['label', 'short', 'air', 'absorb', 'potency', 'cleans', 'release', 'irritant', 'paranoia', 'supernatural', 'debugOnly'].includes(key)) out.push(`${ca}: unknown field "${key}"`);
    if (!/^[a-z][a-z0-9_]*$/.test(id)) out.push(`${ca}: ids are lower_snake_case`);
    if (typeof c.label !== 'string' || typeof c.short !== 'string') out.push(`${ca}: needs a label and a short label`);
    if (c.air !== undefined) {
      if (!substance(content, c.air)) out.push(`${ca}: air must be a substance of data/ship/air.json`);
      else if (airTaken.has(c.air)) out.push(`${ca}: another contaminant already comes from "${c.air}"`);
      airTaken.add(c.air);
      if (c.supernatural) out.push(`${ca}: a supernatural contaminant is deposited by events, never drawn from the air`);
      if (!(num(c.absorb) && c.absorb > 0 && c.absorb <= 1)) out.push(`${ca}: absorb must be above 0, at most 1`);
    } else {
      if (!c.supernatural) out.push(`${ca}: a contaminant that doesn't come from the air must be supernatural (deposited by an event)`);
      if (c.absorb !== undefined) out.push(`${ca}: absorb is only for a contaminant that comes from the air`);
    }
    if (!(num(c.potency) && c.potency >= 0 && c.potency <= 0.5)) out.push(`${ca}: potency must be 0 to 0.5`);
    if (!(num(c.cleans) && c.cleans > 0 && c.cleans <= 1)) out.push(`${ca}: cleans must be above 0, at most 1 (it can always be washed out)`);
    if (!substance(content, c.release)) out.push(`${ca}: release must be a substance of data/ship/air.json (what a purge pours)`);
    for (const k of ['irritant', 'paranoia', 'supernatural', 'debugOnly']) if (c[k] !== undefined && typeof c[k] !== 'boolean') out.push(`${ca}: ${k} is true or false`);
  }

  // Stages: rising thresholds, the last without one; overload only on the last.
  const stages = beardStages(content);
  if (stages.length < 3) out.push(`${at} (stages): at least three`);
  let prev = 0;
  stages.forEach((s, i) => {
    const sa = `${at} (stages[${i}])`;
    const last = i === stages.length - 1;
    if (typeof s.id !== 'string' || typeof s.label !== 'string') out.push(`${sa}: needs an id and a label`);
    if (last && s.below !== undefined) out.push(`${sa}: the last stage has no "below" (it is full)`);
    if (!last && !(num(s.below) && s.below > prev && s.below <= 100)) out.push(`${sa}: below must rise, at most 100 (percent of capacity)`);
    if (num(s.below)) prev = s.below;
    if (!(num(s.absorb) && s.absorb >= 0 && s.absorb <= 0.9)) out.push(`${sa}: absorb must be 0 to 0.9 (never a perfect filter)`);
    if (last && s.absorb !== 0) out.push(`${sa}: a full beard catches nothing (absorb 0)`);
    if (s.offgas !== undefined && !(num(s.offgas) && s.offgas >= 0 && s.offgas <= 1)) out.push(`${sa}: offgas must be 0 to 1`);
    for (const k of ['work', 'walk']) if (s[k] !== undefined && !(num(s[k]) && s[k] >= 1 && s[k] <= 2)) out.push(`${sa}: ${k} must be 1 to 2`);
    if (s.puffs !== undefined && !(num(s.puffs) && s.puffs >= 2)) out.push(`${sa}: puffs must be 2 seconds or more`);
    if (!['g', 'w', 'y', 'o', 'r'].includes(s.tone)) out.push(`${sa}: tone is one of g, w, y, o, r`);
  });

  // Statuses.
  const lim = data.limits ?? {};
  for (const id of beardStatusIds(content)) {
    const s = data.statuses[id];
    const sa = `${at} (statuses.${id})`;
    for (const key of Object.keys(s)) if (!key.startsWith('//') && !['label', 'short', 'tone', 'kind', 'atStage', 'irritant', 'paranoia', 'linger', 'seconds', 'effects', 'clearedBy', 'note', 'visions'].includes(key)) out.push(`${sa}: unknown field "${key}"`);
    if (!STATUS_KINDS.includes(s.kind)) out.push(`${sa}: kind is ${STATUS_KINDS.join(', ')}`);
    if (typeof s.label !== 'string' || typeof s.short !== 'string' || typeof s.note !== 'string') out.push(`${sa}: needs a label, a short label and a note (what it means, in words)`);
    if (s.kind === 'derived' && !(s.atStage !== undefined ? stages.some((x) => x.id === s.atStage) : num(s.irritant) && s.irritant > 0)) out.push(`${sa}: a derived status needs atStage (a stage) or irritant (an amount above 0)`);
    if (s.kind === 'contaminant') {
      if (!(num(s.paranoia) && s.paranoia > 0)) out.push(`${sa}: a contaminant status needs paranoia (an amount of paranoia-capable contaminants above 0)`);
      if (!cids.some((c) => data.contaminants[c].paranoia)) out.push(`${sa}: no contaminant can cause it`);
      if (!(num(s.linger) && s.linger >= 0 && s.linger <= 120)) out.push(`${sa}: linger must be 0 to 120 seconds`);
    }
    if (s.kind === 'applied' && !(Number.isInteger(s.seconds) && s.seconds >= 1 && s.seconds <= (lim.statusSeconds ?? 600))) out.push(`${sa}: an applied status always ends: seconds 1 to ${lim.statusSeconds ?? 600}`);
    const e = s.effects ?? {};
    for (const key of Object.keys(e)) if (!['work', 'walk', 'gagEvery', 'perception', 'alertEvery', 'buzzEvery', 'hook'].includes(key)) out.push(`${sa}: effects: unknown field "${key}"`);
    for (const k of ['work', 'walk']) if (e[k] !== undefined && !(num(e[k]) && e[k] >= 1 && e[k] <= 2)) out.push(`${sa}: effects.${k} must be 1 to 2`);
    for (const k of ['gagEvery', 'alertEvery', 'buzzEvery']) if (e[k] !== undefined && !(num(e[k]) && e[k] >= 3)) out.push(`${sa}: effects.${k} must be 3 seconds or more (never a constant interruption)`);
    if (!['g', 'w', 'y', 'o', 'r', 'p'].includes(s.tone)) out.push(`${sa}: tone is one of g, w, y, o, r, p`);
    if (e.perception && !num(e.alertEvery)) out.push(`${sa}: perception needs alertEvery`);
    // Paranoia's fairness: every vision says it may not be real, the same way, and it needs some to show.
    if (e.perception && !asArray(s.visions).length) out.push(`${sa}: perception needs visions (the false alerts)`);
    for (const v of asArray(s.visions)) if (typeof v !== 'string' || !v.startsWith('(?) ')) out.push(`${sa}: every vision starts "(?) " (the clue that it may not be real)`);
    if (s.visions !== undefined && !e.perception) out.push(`${sa}: visions are for a status with perception`);
    if (e.hook !== undefined && !/^beard:[a-z]+$/.test(e.hook)) out.push(`${sa}: effects.hook is an event name "beard:..."`);
    if (s.clearedBy?.smoke !== undefined && !(num(s.clearedBy.smoke) && s.clearedBy.smoke > 0)) out.push(`${sa}: clearedBy.smoke must be above 0`);
  }

  // Purges: never more out than in.
  for (const p of PURGE_PROFILES) {
    const pd = data.purge?.[p];
    const pa = `${at} (purge.${p})`;
    if (!isPlainObject(pd)) {
      out.push(`${pa}: missing`);
      continue;
    }
    if (!(num(pd.share) && pd.share > 0 && pd.share <= 1)) out.push(`${pa}: share must be above 0, at most 1 (a purge never releases more than the beard holds)`);
    if (!(num(pd.rate) && pd.rate > 0 && pd.rate <= 20)) out.push(`${pa}: rate must be above 0, at most 20 a second`);
    if (!(num(pd.cooldown) && pd.cooldown >= 5 && pd.cooldown <= 300)) out.push(`${pa}: cooldown must be 5 to 300 seconds (no release-and-reabsorb loop)`);
    if (p === 'overload' && !(num(pd.warn) && pd.warn >= 4 && pd.warn <= 30)) out.push(`${pa}: warn must be 4 to 30 seconds (time to act, even on the harshest difficulty)`);
    if (p === 'controlled' && !(Number.isInteger(pd.seconds) && pd.seconds >= 1 && pd.seconds <= 10)) out.push(`${pa}: seconds must be 1 to 10`);
  }
  if (!(num(data.sniff?.lock) && data.sniff.lock >= 3)) out.push(`${at} (sniff): lock must be 3 seconds or more`);
  if (!(num(data.sniff?.exposure) && data.sniff.exposure >= 0 && data.sniff.exposure <= 2)) out.push(`${at} (sniff): exposure must be 0 to 2`);
  if (!(num(data.sniff?.interrupt) && data.sniff.interrupt >= 0 && data.sniff.interrupt <= 60)) out.push(`${at} (sniff): interrupt must be 0 to 60 seconds`);

  // Care: a real place, real materials, a real bar.
  const care = data.care ?? {};
  const stations = asArray(care.stations);
  if (!stations.length) out.push(`${at} (care): no station (a beard must be cleanable somewhere)`);
  for (const [i, st] of stations.entries()) {
    const sa = `${at} (care.stations[${i}])`;
    if (!airRoom(content, st.room)) out.push(`${sa}: room must have ship air`);
    if (!asArray(st.at).length || asArray(st.at).some((p) => !(Array.isArray(p) && p.length === 2 && p.every(Number.isInteger)))) out.push(`${sa}: at is a list of [x, y] tiles`);
    if (!(Number.isInteger(st.reach) && st.reach >= 1 && st.reach <= 4)) out.push(`${sa}: reach must be 1 to 4 tiles`);
    if (typeof st.label !== 'string') out.push(`${sa}: needs a label`);
  }
  const r = care.rinse;
  if (!(r && Number.isInteger(r.seconds) && r.seconds >= 1 && r.seconds <= 20 && num(r.share) && r.share > 0 && r.share < 1)) out.push(`${at} (care.rinse): seconds 1 to 20 and a share above 0, below 1`);
  const sc = care.scrub;
  if (!sc) out.push(`${at} (care.scrub): missing`);
  else {
    if (!REPAIR_KINDS[sc.kind]) out.push(`${at} (care.scrub): unknown timing bar kind "${sc.kind}"`);
    if (!(Number.isInteger(sc.strikes) && sc.strikes >= 1 && sc.strikes <= 8)) out.push(`${at} (care.scrub): strikes must be 1 to 8`);
    if (!asArray(sc.cost).length) out.push(`${at} (care.scrub): a scrub always costs materials`);
    for (const c of asArray(sc.cost)) {
      const item = content.items?.get?.(c.item);
      if (!item) out.push(`${at} (care.scrub): "${c.item}" is not an item`);
      else if (item.type !== 'material') out.push(`${at} (care.scrub): "${c.item}" is not a material`);
    }
    const res = sc.results ?? {};
    if (!(num(res.success) && num(res.partial) && num(res.failure) && res.success > res.partial && res.partial > res.failure && res.failure >= 0 && res.success <= 1)) out.push(`${at} (care.scrub): results success > partial > failure, 0 to 1`);
  }
  // Equipment: real items, sensible effects.
  for (const [item, e] of Object.entries(data.equipment ?? {})) {
    if (item.startsWith('//')) continue;
    const ea = `${at} (equipment.${item})`;
    if (content.items?.get && !content.items.get(item)) out.push(`${ea}: unknown item`);
    for (const key of Object.keys(e)) if (!['label', 'absorb', 'lungs', 'irritant'].includes(key)) out.push(`${ea}: unknown field "${key}"`);
    if (e.absorb !== undefined && !(num(e.absorb) && e.absorb >= 0 && e.absorb <= 1)) out.push(`${ea}: absorb must be 0 to 1`);
    if (e.lungs !== undefined && !(num(e.lungs) && e.lungs > 0 && e.lungs <= 1)) out.push(`${ea}: lungs must be above 0, at most 1`);
    if (e.irritant !== undefined && !(num(e.irritant) && e.irritant >= 0 && e.irritant <= 1)) out.push(`${ea}: irritant must be 0 to 1`);
    if (e.absorb === undefined && e.lungs === undefined && e.irritant === undefined) out.push(`${ea}: needs absorb, lungs or irritant`);
    if (content.items?.get?.(item) && typeof e.label !== 'string') out.push(`${ea}: needs a label`);
  }
  if (!(num(lim.addAmount) && lim.addAmount > 0)) out.push(`${at} (limits): addAmount must be above 0`);
  return out;
}
