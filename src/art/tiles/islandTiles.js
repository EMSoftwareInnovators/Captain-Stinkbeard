import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { specks, rand } from './tileHelpers.js';

/**
 * Painters for the "island" tileset (Story Phase 9: Crownskull Isle, and the
 * reef passage). 16x16 frames, named in data/tilesets/island.json.
 *
 * Terrain that meets other terrain uses edge masks (compileMap's "mask"
 * rule): frame `<name>_<n>`, where n has a bit for each side that touches
 * something else (1 north, 2 east, 4 south, 8 west). So sand shows surf on
 * the sides that meet the sea, grass frays into sand, the jungle canopy has
 * a rounded, shadowed edge, and the river has banks.
 */
const N = 1;
const E = 2;
const S = 4;
const W = 8;

const SAND = { d: '#c9b47e', m: '#e2d3a2', l: '#f2e8c4', wet: '#b9a676', wet2: '#a8956a', foam: '#f6f4ea', foam2: '#d8e8ec' };
const GRASS = { d: '#2f6a2c', m: '#3f8436', l: '#5ca447', h: '#7cc05a' };
const JUNGLE = { ink: '#0d2214', d: '#163a20', m: '#22552a', l: '#2f7234', h: '#4a9440', shadow: '#1a3a1c' };
const RIVER = { d: '#1f4f7a', m: '#2c6c98', l: '#4a8cb8', h: '#9ccce4', bank: '#6b5634', bank2: '#86703f' };
const PATH = { d: '#86643a', m: '#a07a48', l: '#b8925c', peb: '#cdb88c' };
const ROCK = { ink: '#2a2420', d: '#5a544a', m: '#787264', l: '#9a9484', h: '#bcb6a4', moss: '#4f7a3a' };
const RUIN = { ink: '#262a22', d: '#5c6252', m: '#7a826c', l: '#9aa288', h: '#bcc4a8', moss: '#4c7a3a', crack: '#3e4436' };
const MUD = { d: '#5a4128', m: '#74553a', l: '#8c6a48' };

const edges = (n) => ({ n: !!(n & N), e: !!(n & E), s: !!(n & S), w: !!(n & W) });

/** Distance in px from the tile's edged sides (Infinity when none): for soft borders. */
function edgeDist(x, y, n) {
  const e = edges(n);
  let d = Infinity;
  if (e.n) d = Math.min(d, y);
  if (e.s) d = Math.min(d, 15 - y);
  if (e.w) d = Math.min(d, x);
  if (e.e) d = Math.min(d, 15 - x);
  return d;
}

function sandBase(c, seed) {
  c.fill(SAND.m);
  specks(c, [SAND.d, SAND.l, SAND.l], 0.12, `${seed}s`);
  // ripples left by the wind
  for (let i = 0; i < 2; i++) {
    const y = 3 + Math.floor(rand(seed, 'rip', i) * 10);
    const x = Math.floor(rand(seed, 'rx', i) * 8);
    c.hline(x, x + 4 + Math.floor(rand(seed, 'rl', i) * 4), y, SAND.l);
  }
}

/** Sand; on the sides that meet the sea, wet sand and a line of surf (wavy, so tiles don't line up too neatly). */
function sand(n, seed = 'sand') {
  return (c) => {
    sandBase(c, `${seed}${n}`);
    if (!n) return;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const wob = Math.round(Math.sin((x + y) * 0.9 + n) * 0.8);
        const d = edgeDist(x, y, n) + wob;
        if (d <= 0) c.set(x, y, (x + y) % 3 ? SAND.foam : SAND.foam2);
        else if (d === 1) c.set(x, y, SAND.foam2);
        else if (d <= 3) c.set(x, y, SAND.wet2);
        else if (d <= 5) c.set(x, y, SAND.wet);
      }
    }
  };
}

function grassBase(c, seed) {
  c.fill(GRASS.m);
  specks(c, [GRASS.d, GRASS.l], 0.16, `${seed}g`);
  // a few blades
  for (let i = 0; i < 5; i++) {
    const x = 1 + Math.floor(rand(seed, 'bx', i) * 14);
    const y = 2 + Math.floor(rand(seed, 'by', i) * 12);
    c.set(x, y, GRASS.h);
    c.set(x, y + 1, GRASS.l);
  }
}

/** Jungle floor: grass and leaf litter. Where it meets sand or a path, it frays into it. */
function grass(n, seed = 'grass') {
  return (c) => {
    grassBase(c, `${seed}${n}`);
    if (!n) return;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const fray = Math.floor(rand(seed, 'fray', x, y, n) * 3);
        const d = edgeDist(x, y, n);
        if (d + fray < 3) c.set(x, y, rand(seed, 'sd', x, y) < 0.7 ? SAND.m : SAND.d);
        else if (d + fray === 3) c.set(x, y, GRASS.d);
      }
    }
  };
}

/** A clump of leaves (for the canopy). */
function leaves(c, cx, cy, r, seed) {
  c.ellipse(cx, cy, r, r * 0.8, JUNGLE.m);
  c.ellipse(cx - r * 0.3, cy - r * 0.3, r * 0.6, r * 0.45, JUNGLE.l);
  c.set(Math.round(cx - r * 0.4), Math.round(cy - r * 0.45), JUNGLE.h);
  if (rand(seed, 'hi') < 0.5) c.set(Math.round(cx + r * 0.2), Math.round(cy - r * 0.5), JUNGLE.h);
}

/**
 * Dense jungle (solid): a canopy of leaf clumps. On sides that meet open
 * ground the leaves round off, with an ink edge and a shadow below.
 */
function jungle(n, seed = 'jungle') {
  return (c) => {
    const e = edges(n);
    c.fill(JUNGLE.d);
    const s = `${seed}${n}`;
    for (let i = 0; i < 7; i++) {
      leaves(c, 2 + rand(s, 'lx', i) * 12, 2 + rand(s, 'ly', i) * 12, 3 + rand(s, 'lr', i) * 2, `${s}${i}`);
    }
    specks(c, [JUNGLE.ink, JUNGLE.h], 0.04, `${s}k`);
    if (!n) return;
    // Rounded edge: cut away the corners on open sides, leaving transparency the ground shows through.
    const out = (x, y) => {
      const r = 4;
      if (e.n && y < 2 + Math.round(Math.sin(x * 0.8) * 1)) return true;
      if (e.s && y > 12 + Math.round(Math.sin(x * 0.7 + 1) * 1)) return true;
      if (e.w && x < 1 + Math.round(Math.sin(y * 0.9) * 1)) return true;
      if (e.e && x > 14 + Math.round(Math.sin(y * 0.8 + 2) * 1)) return true;
      if (e.n && e.w && (r - x) ** 2 + (r - y) ** 2 > r * r && x < r && y < r) return true;
      if (e.n && e.e && (x - (15 - r)) ** 2 + (r - y) ** 2 > r * r && x > 15 - r && y < r) return true;
      if (e.s && e.w && (r - x) ** 2 + (y - (15 - r)) ** 2 > r * r && x < r && y > 15 - r) return true;
      if (e.s && e.e && (x - (15 - r)) ** 2 + (y - (15 - r)) ** 2 > r * r && x > 15 - r && y > 15 - r) return true;
      return false;
    };
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (out(x, y)) c.set(x, y, null);
    // The ground under an open edge: grass (so the canopy sits on the jungle floor), shadowed on the south.
    const under = new PixelCanvas(16, 16);
    grassBase(under, s);
    if (e.s) for (let x = 0; x < 16; x++) for (let y = 12; y < 16; y++) if ((x + y) % 2 === 0) under.set(x, y, JUNGLE.shadow);
    under.blit(c, 0, 0);
    // ink along the canopy's open rim
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (c.alphaAt(x, y) === 0) continue;
        const nb = [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => {
          const xx = x + dx;
          const yy = y + dy;
          return xx >= 0 && yy >= 0 && xx < 16 && yy < 16 && c.alphaAt(xx, yy) === 0;
        });
        if (nb) under.set(x, y, JUNGLE.ink);
      }
    }
    c.fill(null);
    c.blit(under, 0, 0);
  };
}

/** River water (solid); banks of mud on the sides that meet land. */
function river(n, seed = 'river') {
  return (c) => {
    const s = `${seed}${n}`;
    c.fill(RIVER.m);
    for (let i = 0; i < 4; i++) {
      const y = 1 + Math.floor(rand(s, 'wy', i) * 14);
      const x = Math.floor(rand(s, 'wx', i) * 10);
      c.hline(x, x + 3 + Math.floor(rand(s, 'wl', i) * 3), y, RIVER.l);
      if (rand(s, 'wh', i) < 0.4) c.set(x + 1, y, RIVER.h);
    }
    specks(c, [RIVER.d], 0.06, `${s}d`);
    if (!n) return;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const d = edgeDist(x, y, n) + Math.round(Math.sin((x * 1.3 + y) * 0.7) * 0.7);
        if (d <= 1) c.set(x, y, RIVER.bank2);
        else if (d === 2) c.set(x, y, RIVER.bank);
        else if (d === 3) c.set(x, y, RIVER.d);
      }
    }
  };
}

/** The shallow ford: pale water over pebbles, with stepping stones. */
function ford(seed) {
  return (c) => {
    c.fill('#5c9cc0');
    specks(c, ['#78b4d4', '#4a86aa', '#9a9078'], 0.14, `${seed}f`);
    const stones = [[4, 4], [11, 6], [6, 11], [12, 13]];
    for (const [x, y] of stones) {
      c.ellipse(x, y, 2.6, 1.8, ROCK.m);
      c.hline(x - 1, x + 1, y - 1, ROCK.h);
      c.ellipseOutline(x, y + 0.4, 2.8, 2, ROCK.d);
    }
  };
}

function path(seed) {
  return (c) => {
    c.fill(PATH.m);
    specks(c, [PATH.d, PATH.l], 0.18, `${seed}p`);
    for (let i = 0; i < 3; i++) c.set(Math.floor(rand(seed, 'px', i) * 16), Math.floor(rand(seed, 'py', i) * 16), PATH.peb);
  };
}

/** Rocky ground: the ridge path and the slope up to it. */
function rockFloor(seed) {
  return (c) => {
    c.fill(ROCK.m);
    specks(c, [ROCK.d, ROCK.l], 0.2, `${seed}r`);
    // a crack and a few pebbles
    const x = 2 + Math.floor(rand(seed, 'cx') * 10);
    c.line(x, 3, x + 3, 7, ROCK.d);
    c.set(Math.floor(rand(seed, 'p1') * 16), Math.floor(rand(seed, 'p2') * 16), ROCK.h);
  };
}

/** Cliff: grass lip on top, a striated face, a dark base. Solid. */
function cliff(part) {
  return (c) => {
    c.fill(ROCK.m);
    for (let x = 0; x < 16; x += 3) c.vline(x + (part === 'mid' ? 1 : 0), 0, 15, ROCK.d);
    for (let x = 1; x < 16; x += 3) c.vline(x, 0, 15, ROCK.l);
    specks(c, [ROCK.h, ROCK.d], 0.06, `cliff${part}`);
    if (part === 'top') {
      c.rect(0, 0, 16, 4, GRASS.m);
      for (let x = 0; x < 16; x++) c.set(x, 4 + (x % 3 === 0 ? 1 : 0), GRASS.d);
      c.hline(0, 15, 6, ROCK.h);
    }
    if (part === 'bottom') {
      c.rect(0, 12, 16, 4, ROCK.d);
      for (let x = 0; x < 16; x += 2) c.set(x, 11, ROCK.ink);
      c.hline(0, 15, 15, ROCK.ink);
    }
  };
}

/** Big grey rock (solid): boulders and the ridge's flank. Rounded on the sides that meet open ground. */
function rock(n, seed = 'rock') {
  return (c) => {
    const s = `${seed}${n}`;
    c.fill(ROCK.m);
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(rand(s, 'bx', i) * 12);
      const y = Math.floor(rand(s, 'by', i) * 12);
      c.ellipse(x + 2, y + 2, 3, 2, ROCK.l);
      c.hline(x + 1, x + 3, y + 1, ROCK.h);
      c.line(x, y + 4, x + 4, y + 4, ROCK.d);
    }
    if (!n) return;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const d = edgeDist(x, y, n);
        if (d === 0) c.set(x, y, ROCK.ink);
        else if (d === 1 && (n & S) && y > 12) c.set(x, y, ROCK.d);
      }
    }
  };
}

/** The ruins' floor: big worn flagstones, moss in the joints. */
function ruinFloor(seed) {
  return (c) => {
    c.fill(RUIN.m);
    const off = Math.floor(rand(seed, 'off') * 8);
    c.hline(0, 15, 7, RUIN.d);
    c.hline(0, 15, 15, RUIN.d);
    c.vline((off + 2) % 16, 0, 6, RUIN.d);
    c.vline((off + 10) % 16, 8, 14, RUIN.d);
    specks(c, [RUIN.l, RUIN.crack], 0.07, `${seed}rf`);
    for (let i = 0; i < 4; i++) c.set(Math.floor(rand(seed, 'mx', i) * 16), rand(seed, 'my', i) < 0.5 ? 7 : 15, RUIN.moss);
    if (rand(seed, 'crk') < 0.5) c.line(3, 2, 6, 5, RUIN.crack);
  };
}

/** The ruins' walls (solid, a column rule): capstones, blocks, a mossy base. */
function ruinWall(part) {
  return (c) => {
    c.fill(RUIN.m);
    for (let y = 0; y < 16; y += 5) {
      c.hline(0, 15, y, RUIN.d);
      const o = (y / 5) % 2 ? 4 : 0;
      for (let x = o; x < 16; x += 8) c.vline(x, y, Math.min(15, y + 4), RUIN.d);
    }
    specks(c, [RUIN.l, RUIN.crack], 0.06, `wall${part}`);
    if (part === 'top') {
      c.rect(0, 0, 16, 3, RUIN.h);
      c.hline(0, 15, 3, RUIN.ink);
      for (let x = 0; x < 16; x += 5) c.set(x + 2, 1, RUIN.moss);
    }
    if (part === 'bottom') {
      c.rect(0, 13, 16, 3, RUIN.d);
      for (let x = 0; x < 16; x++) if (x % 3) c.set(x, 13, RUIN.moss);
      c.hline(0, 15, 15, RUIN.ink);
    }
  };
}

/** The clearing's ground: trampled earth and old leaves. */
function clearing(seed) {
  return (c) => {
    c.fill(MUD.l);
    specks(c, [MUD.m, PATH.l, GRASS.d], 0.2, `${seed}c`);
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(rand(seed, 'lx', i) * 14);
      const y = Math.floor(rand(seed, 'ly', i) * 14);
      c.set(x, y, '#9a7a3a');
      c.set(x + 1, y, '#7a5a2a');
    }
  };
}

/** Coral and rock breaking the surface (solid), with surf round it; the sea shows between. */
function reef(n, seed = 'reef') {
  return (c) => {
    const s = `${seed}${n}`;
    for (let i = 0; i < 5; i++) {
      const x = 3 + rand(s, 'x', i) * 10;
      const y = 3 + rand(s, 'y', i) * 10;
      const r = 2 + rand(s, 'r', i) * 2.5;
      c.ellipse(x, y + 1, r + 1, r * 0.7 + 1, SAND.foam2);
      c.ellipse(x, y, r, r * 0.7, i % 2 ? '#b0644e' : ROCK.m);
      c.set(Math.round(x - 1), Math.round(y - 1), i % 2 ? '#e09078' : ROCK.h);
    }
    // Reef all round: solid rock and coral, no sea showing.
    if (n === 0) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (c.alphaAt(x, y) === 0) c.set(x, y, (x * 7 + y * 3) % 5 ? ROCK.m : '#b0644e');
  };
}

const MASKS = [...Array(16).keys()];

export const ISLAND_TILE_PAINTERS = {
  sand_a: sand(0, 'sa'),
  sand_b: sand(0, 'sb'),
  sand_c: sand(0, 'sc'),
  ...Object.fromEntries(MASKS.slice(1).map((n) => [`sand_${n}`, sand(n)])),
  grass_a: grass(0, 'ga'),
  grass_b: grass(0, 'gb'),
  grass_c: grass(0, 'gc'),
  ...Object.fromEntries(MASKS.slice(1).map((n) => [`grass_${n}`, grass(n)])),
  jungle_a: jungle(0, 'ja'),
  jungle_b: jungle(0, 'jb'),
  ...Object.fromEntries(MASKS.slice(1).map((n) => [`jungle_${n}`, jungle(n)])),
  river_a: river(0, 'ra'),
  river_b: river(0, 'rb'),
  ...Object.fromEntries(MASKS.slice(1).map((n) => [`river_${n}`, river(n)])),
  rock_a: rock(0, 'ka'),
  ...Object.fromEntries(MASKS.slice(1).map((n) => [`rock_${n}`, rock(n)])),
  reef_a: reef(0, 'fa'),
  ...Object.fromEntries(MASKS.slice(1).map((n) => [`reef_${n}`, reef(n)])),
  ford_a: ford('fa'),
  ford_b: ford('fb'),
  path_a: path('pa'),
  path_b: path('pb'),
  path_c: path('pc'),
  rockfloor_a: rockFloor('ra'),
  rockfloor_b: rockFloor('rb'),
  cliff_top: cliff('top'),
  cliff_mid: cliff('mid'),
  cliff_bot: cliff('bottom'),
  ruin_floor_a: ruinFloor('ua'),
  ruin_floor_b: ruinFloor('ub'),
  ruin_floor_c: ruinFloor('uc'),
  ruin_wall_top: ruinWall('top'),
  ruin_wall_mid: ruinWall('mid'),
  ruin_wall_bot: ruinWall('bottom'),
  clearing_a: clearing('ca'),
  clearing_b: clearing('cb'),
  island_void: (c) => c.fill('#07060b'),
};

export const ISLAND_COLORS = { SAND, GRASS, JUNGLE, RIVER, PATH, ROCK, RUIN, MUD, PAL };
