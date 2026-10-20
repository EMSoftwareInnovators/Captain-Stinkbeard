import { GameSession } from '../../src/systems/GameSession.js';
import { EventBus } from '../../src/core/EventBus.js';
import { resolvePreset, applyPresetPlan } from '../../src/debug/presets.js';
import { compileMap } from '../../src/maps/compileMap.js';
import { evaluateCondition } from '../../src/systems/conditions/conditions.js';

/**
 * The regression harness's view of the game world (see
 * docs/gameplay-overhaul/06-regression-harness.md): the 17 phase-end states
 * and the compiled rooms, read the way the game reads them. Everything here
 * is read-only and deterministic; nothing touches a scene.
 */

/**
 * The end of each story phase, as a debug preset. The phase-complete presets
 * are recorded from the story walkers (tests/zz_rec*.test.js and the
 * phase*Play.js walks), so they are real points in the story, not guesses.
 */
export const PHASES = [
  { n: 1, preset: 'prologue_done', label: 'Prologue' },
  { n: 2, preset: 'phase2_complete', label: 'Phase 2' },
  { n: 3, preset: 'phase3_complete', label: 'Phase 3' },
  { n: 4, preset: 'p4_complete', label: 'Phase 4' },
  { n: 5, preset: 'p5_complete', label: 'Phase 5' },
  { n: 6, preset: 'p6_complete', label: 'Phase 6' },
  { n: 7, preset: 'p7_complete', label: 'Phase 7' },
  { n: 8, preset: 'p8_complete', label: 'Phase 8' },
  { n: 9, preset: 'p9_complete', label: 'Phase 9' },
  { n: 10, preset: 'p10_complete', label: 'Phase 10' },
  { n: 11, preset: 'p11_complete', label: 'Phase 11' },
  { n: 12, preset: 'p12_complete', label: 'Phase 12' },
  { n: 13, preset: 'p13_complete', label: 'Phase 13' },
  { n: 14, preset: 'p14_complete', label: 'Phase 14' },
  { n: 15, preset: 'p15_complete', label: 'Phase 15' },
  { n: 16, preset: 'p16_complete', label: 'Phase 16' },
  { n: 17, preset: 'p17_complete', label: 'Phase 17' },
];

/** The story phase a data/game.json chapter id belongs to (prologue = 1, ch1-ch8 = 2, pNcM = N, phaseN_end = N). */
export function phaseOfChapter(id) {
  if (id === 'prologue') return 1;
  if (/^ch\d+$/.test(id)) return 2;
  const end = /^phase(\d+)_end$/.exec(id);
  if (end) return Number(end[1]);
  const m = /^p(\d+)c\d+$/.exec(id);
  return m ? Number(m[1]) : null;
}

/** A fresh session at a preset, with strict flags (an undeclared flag is an error, as in the story tests). */
export function sessionAt(content, preset) {
  const session = GameSession.newGame({ content, bus: new EventBus(), strictFlags: true });
  applyPresetPlan(session, resolvePreset(content, preset));
  return session;
}

/** Compiled rooms, cached per content set (compileMap is the same compiler the game and the validator use). */
const modelCache = new WeakMap();
export function roomModels(content) {
  let models = modelCache.get(content);
  if (!models) {
    models = new Map();
    for (const id of content.maps.ids()) {
      const def = content.maps.get(id);
      models.set(id, compileMap(def, content.tilesets.get(def.tileset), content.props));
    }
    modelCache.set(content, models);
  }
  return models;
}

/**
 * The room's collision right now, as WorldScene.isSolid sees it: the compiled
 * solid layer plus every conditional prop, block and chest whose condition holds.
 * @returns {Uint8Array} 1 = solid
 */
export function liveSolid(model, session) {
  const solid = Uint8Array.from(model.solid);
  for (const d of model.dynamicSolids) {
    if (!evaluateCondition(d.if, session)) continue;
    for (let j = 0; j < d.h; j++) {
      for (let i = 0; i < d.w; i++) {
        const x = d.x + i;
        const y = d.y + j;
        if (x >= 0 && y >= 0 && x < model.width && y < model.height) solid[y * model.width + x] = 1;
      }
    }
  }
  return solid;
}

/** Live: no condition, or its condition holds. */
export const live = (session, cond) => !cond || evaluateCondition(cond, session);

/** The warps that apply now: a warp's "when" says whether it exists (its "if" is a lock). */
export function activeWarps(model, session) {
  return model.objects.filter((o) => o.type === 'warp' && live(session, o.when));
}

/** Arrival points that exist now (a spawn can be conditional). */
export function activeSpawns(model, session) {
  return Object.entries(model.spawns).filter(([, sp]) => live(session, sp.if)).map(([id, sp]) => ({ id, x: sp.x, y: sp.y }));
}

/** Tiles of an object's rectangle. */
export function tilesOf(o) {
  const out = [];
  for (let j = 0; j < (o.h || 1); j++) for (let i = 0; i < (o.w || 1); i++) out.push([o.x + i, o.y + j]);
  return out;
}

/** Stable JSON: object keys sorted, so snapshots and diffs never depend on insertion order. */
export function stableStringify(value, indent = 1) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])]));
    return v;
  };
  return JSON.stringify(sort(value), null, indent);
}
