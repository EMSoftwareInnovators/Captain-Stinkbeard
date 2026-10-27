import { asArray } from '../../core/util.js';
import { challengeConfig } from '../challenge/config.js';
import { DIFFICULTIES } from '../challenge/difficulty.js';
import { timingBarSettings, timingBarProblems, TIMING_DEFAULTS } from '../timingBar.js';
import { REPAIR_KINDS } from '../repairKinds.js';
import { shipTuning } from '../ship/integrity.js';
import { BASE_ZONE, sourceIds, sourceDef, recipeIds, recipeDef, economyReport } from '../ship/supplies.js';
import {
  ledgerDataProblems,
  ledgerLimits,
  consequenceIds,
  consequenceDef,
  consequenceTuning,
  capFor,
  strengthFor,
  secondsFor,
  boundedModifiers,
  methodIds,
  methodDef,
  methodBill,
  methodSeconds,
} from './ledger.js';

/**
 * Progression safety for the consequence ledger (overhaul Prompt 11,
 * docs/gameplay-overhaul/15-consequences-and-recovery.md, "Progression
 * safety"), modelled on the economy report (`npm run economy`): every ship
 * bar the captain's condition reaches must stay winnable at the worst the
 * condition allows, on every difficulty, with the weakest leader; and every
 * material a recovery or preparation bills must have a way back from empty.
 * `npm run consequences` prints it; the validator enforces its problems.
 * These are heuristics over the data, not a proof (see the doc's limits).
 */

/** The weakest leader a bar allows for (OverlayScene.skillFor: -0.25): less green, a faster marker. */
const WEAKEST_LEADER = -0.25;

/** Every timing bar that carries the captain's condition: [{ bar, kind, strikes, spec, supply }]. */
export function shipBars(content) {
  const out = [];
  const add = (bar, a, supply = false) => {
    if (a) out.push({ bar, kind: a.kind ?? 'hull', strikes: a.strikes ?? 3, spec: a.challenge ?? { profile: 'ship_repair' }, supply });
  };
  for (const [id, r] of Object.entries(content?.ship?.repairs ?? {})) if (!id.startsWith('//')) add(`repair ${id}`, r);
  add('patch a leak', content?.shipHazards?.actions?.patch);
  add('seal an opening', content?.shipAir?.actions?.seal);
  add('mend an opening', content?.shipAir?.actions?.mend);
  add('coach a Grand Stenchmaster', content?.shipPressure?.actions?.restrain);
  add('scrub the beard', content?.shipBeard?.care?.scrub);
  for (const id of sourceIds(content)) if (sourceDef(content, id).type === 'salvage') add(`salvage ${id}`, sourceDef(content, id).action, true);
  for (const id of recipeIds(content)) add(`cook ${id}`, recipeDef(content, id).action, true);
  return out;
}

/**
 * Each ship bar on each difficulty at the captain's worst condition (the
 * ledger's condition bound), with the weakest leader and no assist: the
 * green, the time a perfect hand gets to see it at its fastest, and why it
 * couldn't be won if it couldn't.
 */
export function barFeasibility(content) {
  const worst = ledgerLimits(content).condition[0];
  const rows = [];
  const problems = [];
  for (const b of shipBars(content)) {
    for (const d of DIFFICULTIES) {
      let cfg = null;
      try {
        cfg = challengeConfig(content, b.spec, { kind: 'repair', id: 'check', difficulty: d });
      } catch {
        continue;
      }
      if (!cfg) continue;
      const t = shipTuning(content, d);
      const K = REPAIR_KINDS[b.kind] ?? REPAIR_KINDS.hull;
      const base = BASE_ZONE + (b.supply ? t.supplyZone ?? 0 : 0);
      const s = timingBarSettings({ baseSpeed: K.speed ?? TIMING_DEFAULTS.speed, speed: 1, zone: base, strikes: b.strikes, challenge: { strict: cfg.failure, mechanics: cfg.mechanics }, bonus: WEAKEST_LEADER, condition: { zone: worst }, assist: null });
      const issues = timingBarProblems({ strikes: b.strikes, zone: s.zone, speed: s.speed, timeLimit: s.timeLimit, maxFumbles: s.maxFumbles });
      const fastest = s.speed + TIMING_DEFAULTS.speedStep * Math.max(0, b.strikes - 1);
      rows.push({ bar: b.bar, difficulty: d, zone: s.zone, windowMs: Math.round(((s.zone + TIMING_DEFAULTS.edge * 2) / fastest) * 1000), ok: !issues.length });
      for (const i of issues) problems.push(`[${d}] ${b.bar}: at the captain's worst condition (${worst} green, the weakest leader) ${i}: a consequence could make it unwinnable`);
    }
  }
  return { rows, problems };
}

/** Every material a recovery or preparation bills, on every difficulty, and its ways back from empty (the economy report's). */
export function recoveryResources(content) {
  const econ = economyReport(content);
  const rows = [];
  const problems = [];
  for (const id of methodIds(content)) {
    for (const d of DIFFICULTIES) {
      for (const c of methodBill(content, id, consequenceTuning(content, d))) {
        const row = econ.difficulties[d]?.rows?.[c.item];
        const ways = row ? [...row.renewable, ...row.shops.map((s) => `shop ${s}`)] : [];
        rows.push({ method: id, difficulty: d, item: c.item, count: c.count, ways });
        if (!ways.length) problems.push(`[${d}] ${id}: "${c.item}" has no way back from empty (no restock, recovery or shop): putting it right could become impossible`);
      }
    }
  }
  return { rows, problems };
}

/**
 * Everything `npm run consequences` prints: per difficulty, each
 * consequence as it would be created (cap, seconds, each level's modifiers
 * at that difficulty's strength) and each method's seconds and bill; the
 * bars at the worst condition; the recovery materials; and the problems
 * (the data's, the bars', the materials').
 */
export function ledgerReport(content) {
  const difficulties = {};
  for (const d of DIFFICULTIES) {
    const t = consequenceTuning(content, d);
    const lim = ledgerLimits(content);
    const definitions = consequenceIds(content).map((id) => {
      const def = consequenceDef(content, id);
      const k = strengthFor(def, t);
      return { id, kind: def.kind, category: def.category, cap: capFor(def, t), seconds: secondsFor(def, t, lim), milestones: def.expires?.milestones ?? null, uses: def.expires?.uses ?? null, levels: asArray(def.levels).map((row, i) => ({ label: row.label, mods: boundedModifiers(def, i + 1, k, lim) })) };
    });
    const methods = methodIds(content).map((id) => ({ id, kind: methodDef(content, id).kind, seconds: methodSeconds(content, id, 1, t), bill: methodBill(content, id, t) }));
    difficulties[d] = { tuning: t, definitions, methods };
  }
  const bars = barFeasibility(content);
  const resources = recoveryResources(content);
  return { difficulties, bars: bars.rows, resources: resources.rows, problems: [...ledgerDataProblems(content), ...bars.problems, ...resources.problems] };
}
