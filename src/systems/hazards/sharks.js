import { evaluateCondition } from '../conditions/conditions.js';

/**
 * The shark threat around the ship (engine-agnostic rules). The world draws
 * it with world/SharkLayer.js.
 *
 * A threat is a level:
 *
 *   none       open water
 *   curious    a fin or two, keeping their distance
 *   following  several fins pacing the ship
 *   attacking  circling close; now and then one hits the hull
 *   swarm      the water is full of them; hits come often
 *   frenzy     (Phase 4) the Dead Center reached the waterline: hundreds of
 *              them, all converging on the strongest scent, hitting constantly
 *
 * Beyond the fins that circle the hull, a level can bring a "crowd": many
 * small, distant fins filling the water around the ship (a crowd of 20 is
 * "a lot of sharks", 90 is "HUNDREDS"). Maps and scripts can set it.
 * Maps choose their level from the story (first matching entry wins, and it
 * changes the moment the flags do):
 *
 *   "sharks": [
 *     { "if": { "flag": "grog_spilled" }, "level": "swarm" },
 *     { "if": { "flag": "sharks_sighted" }, "level": "following" }
 *   ]
 *
 * Below decks the same entry with "below": true means no fins, only the
 * thump of the hull being hit. Scripts can hold a level for a scene
 * ({ "sharks": "attacking" }) and stage events: a bite at the hull, a ram
 * from beneath, a shark flopping on deck, the swarm being lured away.
 * Tuning lives in data/hazards/sharks.json.
 */
export const SHARK_LEVELS = ['none', 'curious', 'following', 'attacking', 'swarm', 'frenzy'];

export const SHARK_EVENTS = ['bite', 'ram', 'flop', 'lure', 'follow', 'unfollow', 'return', 'frenzy', 'calm', 'thrash', 'hammerhead'];

export const DEFAULT_SHARK_CONFIG = {
  levels: {
    none: { fins: 0 },
    // speed: tiles per second along the loop; margin: tiles out from the hull.
    curious: { fins: 2, speed: 0.9, margin: 0.95, submerge: 0.45 },
    following: { fins: 4, speed: 1.5, margin: 0.8, submerge: 0.2 },
    attacking: { fins: 6, speed: 2.1, margin: 0.55, submerge: 0.1, bumpEvery: [5500, 9500], shake: 1 },
    swarm: { fins: 10, speed: 2.8, margin: 0.5, submerge: 0.05, bumpEvery: [2600, 5200], shake: 2, crowd: 24 },
    frenzy: { fins: 14, speed: 3.6, margin: 0.4, submerge: 0.02, bumpEvery: [1100, 2300], shake: 2, crowd: 90, churn: true },
  },
  /** Most small crowd fins ever drawn at once (the rest is implied). */
  maxCrowd: 110,
};

export function sharkConfig(content) {
  const data = content?.hazards?.get?.('sharks') ?? {};
  const levels = { ...DEFAULT_SHARK_CONFIG.levels };
  for (const [k, v] of Object.entries(data.levels ?? {})) levels[k] = { ...(levels[k] ?? {}), ...v };
  return { ...DEFAULT_SHARK_CONFIG, ...data, levels };
}

export function sharkLevelIndex(level) {
  const i = SHARK_LEVELS.indexOf(level);
  return i < 0 ? 0 : i;
}

/** The map's shark level right now: { level, below, crowd } (crowd: null = the level's own). */
export function sharkLevelFor(meta, session) {
  for (const v of meta?.sharks ?? []) {
    if (!v.if || evaluateCondition(v.if, session)) return { level: v.level ?? 'none', below: !!v.below, crowd: Number.isFinite(v.crowd) ? v.crowd : null };
  }
  return { level: 'none', below: false, crowd: null };
}

/** How many crowd fins to draw: the explicit number, else the level's, capped. */
export function crowdSize(cfg, level, explicit = null) {
  const n = Number.isFinite(explicit) ? explicit : cfg.levels[level]?.crowd ?? 0;
  return Math.max(0, Math.min(cfg.maxCrowd ?? 110, Math.round(n)));
}

/**
 * Sea lanes for crowd fins on an ocean map: the water strip down each side of
 * the hull and the open water off the bow and stern, in tile units
 * ({ x0, x1, y0, y1 } rectangles of sea).
 */
export function seaLanes(def) {
  const rows = def.tiles ?? [];
  const legend = def.legend ?? {};
  const isSea = (ch) => legend[ch] === 'sea' || ch === undefined;
  const lanes = [];
  let sideTop = -1;
  let sideBottom = -1;
  let leftW = Infinity;
  let rightX = -Infinity;
  rows.forEach((row, y) => {
    let min = -1;
    let max = -1;
    for (let x = 0; x < row.length; x++) {
      if (isSea(row[x])) continue;
      if (min < 0) min = x;
      max = x;
    }
    if (min < 0) return;
    if (sideTop < 0) sideTop = y;
    sideBottom = y;
    leftW = Math.min(leftW, min);
    rightX = Math.max(rightX, max + 1);
  });
  const width = rows[0]?.length ?? 0;
  const height = rows.length;
  if (sideTop < 0) return [{ x0: 0, x1: width, y0: 0, y1: height }];
  if (leftW > 0.4) lanes.push({ x0: 0.15, x1: leftW - 0.1, y0: sideTop, y1: sideBottom + 1, side: 'starboard' });
  if (width - rightX > 0.4) lanes.push({ x0: rightX + 0.1, x1: width - 0.15, y0: sideTop, y1: sideBottom + 1, side: 'port' });
  if (sideTop > 0.6) lanes.push({ x0: 0.2, x1: width - 0.2, y0: 0.2, y1: sideTop - 0.1, side: 'stern' });
  if (height - sideBottom > 1.6) lanes.push({ x0: 0.2, x1: width - 0.2, y0: sideBottom + 1.2, y1: height - 0.2, side: 'bow' });
  return lanes;
}

/**
 * The course fins swim around a ship drawn on an ocean map: down one side,
 * round the bow, up the other side and round the stern, `margin` tiles out
 * from the hull. Returns points in tile units (closed loop).
 *
 * @param {{ tiles: string[], legend: object }} def raw map definition
 */
export function finLoop(def, margin = 0.6) {
  const rows = def.tiles ?? [];
  const legend = def.legend ?? {};
  const isSea = (ch) => legend[ch] === 'sea' || ch === undefined;
  const width = rows[0]?.length ?? 0;
  const spans = [];
  rows.forEach((row, y) => {
    let min = -1;
    let max = -1;
    for (let x = 0; x < row.length; x++) {
      if (isSea(row[x])) continue;
      if (min < 0) min = x;
      max = x;
    }
    if (min >= 0) spans.push({ y, min, max });
  });
  if (!spans.length) return [];
  const top = spans[0];
  const bottom = spans[spans.length - 1];
  const clampX = (x) => Math.max(0.35, Math.min(width - 0.35, x));
  const left = spans.map((s) => ({ x: clampX(s.min - margin), y: s.y + 0.5 }));
  const right = spans.map((s) => ({ x: clampX(s.max + 1 + margin), y: s.y + 0.5 })).reverse();
  const bowX = (bottom.min + bottom.max + 1) / 2;
  const sternX = (top.min + top.max + 1) / 2;
  return [
    ...left,
    { x: bowX, y: bottom.y + 1 + margin + 0.5 },
    ...right,
    { x: sternX, y: Math.max(0.4, top.y - margin - 0.2) },
  ];
}

/** Total length of a closed loop, in tiles. */
export function loopLength(points) {
  let len = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    len += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return len;
}

/** Point `d` tiles along a closed loop (wraps), with the travel direction. */
export function pointOnLoop(points, d) {
  const total = loopLength(points);
  if (!total) return { x: 0, y: 0, dx: 1, dy: 0 };
  let rest = ((d % total) + total) % total;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (rest <= seg || i === points.length - 1) {
      const t = seg ? Math.min(1, rest / seg) : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: seg ? (b.x - a.x) / seg : 1, dy: seg ? (b.y - a.y) / seg : 0 };
    }
    rest -= seg;
  }
  return { ...points[0], dx: 1, dy: 0 };
}

/**
 * Where along the hull a fin tracking the captain should be: the sea strip on
 * his side of the ship, level with him (the "beard bait" follower).
 */
export function followPoint(def, px, py, margin = 0.5) {
  const row = def.tiles?.[Math.max(0, Math.min((def.tiles?.length ?? 1) - 1, Math.floor(py)))] ?? '';
  const legend = def.legend ?? {};
  let min = -1;
  let max = -1;
  for (let x = 0; x < row.length; x++) {
    if (legend[row[x]] === 'sea') continue;
    if (min < 0) min = x;
    max = x;
  }
  if (min < 0) return null;
  const mid = (min + max + 1) / 2;
  const x = px < mid ? Math.max(0.35, min - margin) : Math.min(row.length - 0.35, max + 1 + margin);
  return { x, y: py, side: px < mid ? 'starboard' : 'port' };
}
