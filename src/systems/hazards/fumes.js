import { evaluateCondition } from '../conditions/conditions.js';

/**
 * Stench / fume hazards: rules only, no rendering (see world/FumeLayer.js).
 *
 * A map lists fume zones in its "fumes" array (tile rectangles):
 *
 *   { "id": "hold_core", "level": "dense", "x": 2, "y": 4, "w": 5, "h": 4,
 *     "if": { "flag": "fumes_spread" },
 *     "path": [[2, 4], [6, 8]], "periodMs": 9000 }      // optional: drifts
 *
 * Levels (data/hazards/fumes.json):
 *   light   visual discomfort, no exposure
 *   dense   reduced visibility, exposure builds
 *   center  the Dead Center: exposure builds fast; staying means collapse
 *
 * `haze` on a map is a whole-map tint ([{ "if", "level" }], first match) that
 * never hurts: it is how a room "remembers" what happened.
 *
 * Exposure rises while standing in dense or center fumes, falls elsewhere,
 * and at the maximum the player collapses. Collapse is never fatal: the map's
 * "fumeCollapse" script (or a default) carries the captain out.
 */
export const FUME_LEVELS = ['light', 'dense', 'center'];
export const HAZE_LEVELS = ['faint', 'light', 'dense'];

export const DEFAULT_FUME_CONFIG = Object.freeze({
  levels: {
    light: { rank: 1, exposure: 0, visibility: 0.9 },
    dense: { rank: 2, exposure: 11, visibility: 0.6 },
    center: { rank: 3, exposure: 32, visibility: 0.36 },
  },
  recoverPerSec: 20,
  lightRecoverPerSec: 8,
  max: 100,
  warnAt: 65,
});

export function fumeRank(level, config = DEFAULT_FUME_CONFIG) {
  return level ? config.levels[level]?.rank ?? 0 : 0;
}

/**
 * Position of a zone at time t (ms): its rect, moved along its path if it has
 * one, and still rolling in if it arrived moments ago ("enterFrom": the
 * offset in tiles it starts at, "enterMs": how long it takes to settle).
 */
export function zoneRect(zone, t = 0) {
  const r = baseRect(zone, t);
  if (Array.isArray(zone.enterFrom) && Number.isFinite(zone.activeSince)) {
    const k = (t - zone.activeSince) / (zone.enterMs ?? 4000);
    if (k < 1) {
      const u = Math.max(0, k);
      const rest = 1 - u * u * (3 - 2 * u); // eased: slow start, slow settle
      r.x += zone.enterFrom[0] * rest;
      r.y += zone.enterFrom[1] * rest;
    }
  }
  return r;
}

function baseRect(zone, t) {
  if (!Array.isArray(zone.path) || zone.path.length < 2) return { x: zone.x, y: zone.y, w: zone.w ?? 1, h: zone.h ?? 1 };
  const pts = zone.path;
  // Ping-pong along the waypoints over periodMs (there and back).
  const period = zone.periodMs ?? 8000;
  const legs = pts.length - 1;
  let u = ((t % period) + period) % period / period; // 0..1
  u = u < 0.5 ? u * 2 : (1 - u) * 2; // 0..1..0
  const pos = u * legs;
  const i = Math.min(legs - 1, Math.floor(pos));
  const f = pos - i;
  // Ease each leg so pockets linger at the ends like real drifting smoke.
  const e = f * f * (3 - 2 * f);
  const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * e;
  const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * e;
  return { x, y, w: zone.w ?? 1, h: zone.h ?? 1 };
}

/**
 * The fume zones of one map, filtered by story state. Scripts can add
 * temporary zones (a cloud growing after a blast) that are not saved.
 */
export class FumeField {
  constructor(zones = [], config = DEFAULT_FUME_CONFIG) {
    this.zones = zones;
    this.config = config;
    this.transient = new Map();
    this.activeZones = [];
  }

  /**
   * Re-evaluates which authored zones exist for the current story state. A
   * zone that has just appeared remembers when (`t`, the fume clock) so it
   * can roll in; `immediate` (a map loading) puts everything straight in place.
   */
  refresh(session, t = 0, { immediate = false } = {}) {
    const live = new Map();
    for (const z of this.zones) {
      if (!evaluateCondition(z.if, session)) continue;
      const prev = this.live?.get(z);
      live.set(z, prev ?? { ...z, activeSince: immediate ? -Infinity : t });
    }
    this.live = live;
    this.activeZones = [...live.values()];
    return this.all();
  }

  all() {
    return [...this.activeZones, ...this.transient.values()];
  }

  addTransient(zone) {
    this.transient.set(zone.id, { ...zone, transient: true });
  }

  updateTransient(id, patch) {
    const z = this.transient.get(id);
    if (z) Object.assign(z, patch);
  }

  removeTransient(id) {
    this.transient.delete(id);
  }

  clearTransient() {
    this.transient.clear();
  }

  /** Strongest level covering the tile (x, y) at time t, or null. Tile centres are tested. */
  levelAt(x, y, t = 0) {
    return this.zoneAt(x, y, t)?.level ?? null;
  }

  /**
   * The strongest zone covering the tile (x, y) at time t, or null. Story
   * Phase 13: a zone can carry a "severity" (0..1, default 1), a multiplier
   * on the exposure it builds: a small low-severity source (a television's
   * smell vent) is unpleasant without being the Dead Center.
   */
  zoneAt(x, y, t = 0) {
    let best = null;
    let bestRank = 0;
    const cx = x + 0.5;
    const cy = y + 0.5;
    for (const z of this.all()) {
      const r = zoneRect(z, t);
      if (cx < r.x || cy < r.y || cx >= r.x + r.w || cy >= r.y + r.h) continue;
      const rank = fumeRank(z.level, this.config);
      if (rank > bestRank || (rank === bestRank && (z.severity ?? 1) > (best?.severity ?? 1))) {
        bestRank = rank;
        best = z;
      }
    }
    return best;
  }

  /** Exposure multiplier where the captain stands (a zone's "severity"; 1 elsewhere). */
  severityAt(x, y, t = 0) {
    return this.zoneAt(x, y, t)?.severity ?? 1;
  }

  /** True when no zone of `level` or stronger covers (x, y) at time t. */
  isSafe(x, y, t = 0, level = 'dense') {
    return fumeRank(this.levelAt(x, y, t), this.config) < fumeRank(level, this.config);
  }
}

/** First matching haze entry of a map ({ if, level }), or null. */
export function hazeFor(list, session) {
  for (const h of list ?? []) if (evaluateCondition(h.if, session)) return h.level ?? null;
  return null;
}

/**
 * Accumulated fume exposure (0..max). Lives on the session but is not saved:
 * loading a game always starts with clean lungs.
 */
export class Exposure {
  constructor(config = DEFAULT_FUME_CONFIG) {
    this.config = config;
    this.value = 0;
    this.warned = false;
  }

  /**
   * Advances by dtMs while standing in `level` (null = clean air). `scale`
   * slows the build-up (a wet cloth, the Gentle hazard option; 0 = none).
   * Returns { value, collapsed, warn } — warn is true on the frame the
   * warning threshold is crossed upward.
   */
  update(dtMs, level, scale = 1) {
    const c = this.config;
    const sec = dtMs / 1000;
    const rate = (level ? c.levels[level]?.exposure ?? 0 : 0) * scale;
    if (rate > 0) this.value += rate * sec;
    else this.value -= (level === 'light' ? c.lightRecoverPerSec : c.recoverPerSec) * sec;
    this.value = Math.max(0, Math.min(c.max, this.value));
    let warn = false;
    if (!this.warned && this.value >= c.warnAt) {
      this.warned = true;
      warn = true;
    }
    if (this.value < c.warnAt * 0.6) this.warned = false;
    return { value: this.value, collapsed: this.value >= c.max, warn };
  }

  get fraction() {
    return this.value / this.config.max;
  }

  reset() {
    this.value = 0;
    this.warned = false;
  }
}

/** Merges data/hazards/fumes.json over the defaults. */
export function fumeConfig(content) {
  const data = content?.hazards?.get?.('fumes');
  if (!data) return DEFAULT_FUME_CONFIG;
  return {
    ...DEFAULT_FUME_CONFIG,
    ...data,
    levels: { ...DEFAULT_FUME_CONFIG.levels, ...(data.levels ?? {}) },
  };
}
