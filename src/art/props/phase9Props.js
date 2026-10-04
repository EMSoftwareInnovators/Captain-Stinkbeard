import { canvas, groundShadow, WOOD, IRON, GOLD, INK } from './propKit.js';

/**
 * Props for Story Phase 9 (Crownskull Isle; the Grand Excavation; the Grand
 * Treasure Catastrophe):
 *
 *   - the island: palms (straight and leaning), jungle bushes, ferns and
 *     flowers, boulders, the Broken Tooth (a split boulder at the fork), an
 *     ancient statue with a crowned skull for a face, the ridge's great
 *     crowned skull of rock, a spyglass post at the viewpoint;
 *   - the ruins: pillars whole and broken, a fallen column, rubble, carved
 *     blocks, and what the crew rig for shelter (a braced wall, a hung cloth,
 *     a dragged beam);
 *   - the Crimson Fortune's marker (swallowed by vines; then cut clear, the
 *     crowned skull and crossed swords carved on it), the dig in seven layers,
 *     the tools, the boats on the beach;
 *   - after the blast: the crater (and the stink in it), an uprooted palm,
 *     debris, contaminated coins; and the megalodon, stranded in the lagoon,
 *     then wearing the Crimson King's Crown.
 */

const LEAF = { d: '#1c4a22', m: '#2c6a2c', l: '#46923a', h: '#78c058' };
const BARK = { d: '#4a3018', m: '#6e4a26', l: '#946a3a', h: '#b8905a' };
const STONE = { d: '#4e4a42', m: '#6e6a5e', l: '#8e897a', h: '#b2ad9a', moss: '#4e7a36' };
const RUIN = { d: '#4c5244', m: '#6c7462', l: '#8e9680', h: '#b0b89e', moss: '#4c7a3a' };
const SAND = { d: '#b8a272', m: '#d6c48e', l: '#ecdcac' };
const DIRT = { d: '#4a3220', m: '#6a4a30', l: '#8a6644', clay: '#a0603a', clayD: '#7a4426' };
const SHARKC = { d: '#3a4658', m: '#5a6a80', l: '#8a9ab0', belly: '#d8dce4' };
const FUME = { m: '#b8b030', l: '#d8d060' };
const RED = '#c02a2a';

// --- the island ----------------------------------------------------------------

/** A palm: a curved, ringed trunk and a crown of fronds (and a few coconuts). */
function palm({ lean = 0, seed = 1 } = {}) {
  const c = canvas(48, 60);
  groundShadow(c, 24, 57, 9, 3);
  const top = [24 + lean * 12, 14];
  const base = [24, 58];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = Math.round(base[0] + (top[0] - base[0]) * t + Math.sin(t * Math.PI) * lean * 4);
    const y = Math.round(base[1] + (top[1] - base[1]) * t);
    const w = Math.round(3 - t * 1.2);
    for (let dx = -w; dx <= w; dx++) c.set(x + dx, y, dx < 0 ? BARK.l : dx > 0 ? BARK.d : BARK.m);
    if (i % 5 === 0) c.hline(x - w, x + w, y, BARK.d);
  }
  const [tx, ty] = top;
  // fronds: long drooping leaves in five directions
  const fronds = [[-20, 4], [-12, -8], [0, -12], [12, -8], [20, 5], [-16, 10], [16, 11]];
  fronds.forEach(([dx, dy], k) => {
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      const x = Math.round(tx + dx * t);
      const y = Math.round(ty + dy * t + Math.sin(t * Math.PI) * -3 + t * t * 6);
      c.set(x, y, LEAF.m);
      c.set(x, y + 1, LEAF.d);
      if (i % 2 === 0 && i > 3) {
        c.set(x + (dx > 0 ? -1 : 1), y + 2, LEAF.l);
        c.set(x, y + 2, LEAF.m);
      }
      if (k % 2 === 0 && i === 9) c.set(x, y - 1, LEAF.h);
    }
  });
  c.ellipse(tx, ty + 1, 4, 3, LEAF.d);
  for (const [cx, cy] of [[tx - 2, ty + 3], [tx + 2, ty + 4], [tx, ty + 5]]) {
    c.ellipse(cx, cy, 1.5, 1.5, '#6a4a1c');
    c.set(cx - 1, cy - 1, '#9a7a3a');
  }
  if (seed % 2) c.set(tx + 1, ty - 2, LEAF.h);
  c.outline(INK);
  return c;
}

/** A jungle bush: a mound of broad leaves. */
function bush(seed = 1, { flowers = false } = {}) {
  const c = canvas(22, 18);
  groundShadow(c, 11, 15, 9, 2.5);
  c.ellipse(11, 10, 9, 6, LEAF.d);
  for (let i = 0; i < 7; i++) {
    const x = 4 + ((i * 7 + seed * 3) % 14);
    const y = 6 + ((i * 5 + seed) % 7);
    c.ellipse(x, y, 3, 2, i % 2 ? LEAF.m : LEAF.l);
    c.set(x - 1, y - 1, LEAF.h);
  }
  if (flowers) for (const [x, y] of [[6, 7], [14, 6], [11, 11]]) { c.set(x, y, '#e84a6a'); c.set(x + 1, y, '#f8d040'); }
  c.outline(INK);
  return c;
}

/** Ferns and flowers on the ground (not in the way). */
function fern(seed = 1) {
  const c = canvas(16, 12);
  for (let k = 0; k < 4; k++) {
    const ang = -2.6 + k * 0.6 + (seed % 3) * 0.1;
    for (let i = 0; i < 7; i++) {
      const x = Math.round(8 + Math.cos(ang) * i);
      const y = Math.round(11 + Math.sin(ang) * i * 0.9);
      c.set(x, y, i % 2 ? LEAF.l : LEAF.m);
    }
  }
  if (seed % 2) { c.set(4, 6, '#f0d048'); c.set(12, 5, '#e85a7a'); }
  return c;
}

function boulder({ big = false, seed = 1 } = {}) {
  const w = big ? 34 : 18;
  const h = big ? 30 : 16;
  const c = canvas(w, h);
  groundShadow(c, w / 2, h - 2, w / 2 - 1, 2.5);
  c.ellipse(w / 2, h / 2 + 1, w / 2 - 2, h / 2 - 2, STONE.m);
  c.ellipse(w / 2 - 2, h / 2 - 1, w / 2 - 5, h / 2 - 5, STONE.l);
  c.ellipse(w / 2 - 4, h / 2 - 3, w / 5, h / 6, STONE.h);
  c.line(w / 2 + 2, h / 2 - 1, w / 2 + 5, h / 2 + 4, STONE.d);
  if (seed % 2 || big) for (let x = 3; x < w - 3; x += 3) c.set(x, h - 4, STONE.moss);
  c.outline(INK);
  return c;
}

/** The Broken Tooth: a tall boulder split down the middle, one half leaning off. */
function brokenTooth() {
  const c = canvas(36, 48);
  groundShadow(c, 18, 45, 16, 3);
  c.poly([[4, 46], [6, 18], [12, 6], [17, 10], [17, 46]], STONE.m);
  c.poly([[19, 46], [20, 14], [27, 4], [33, 16], [32, 46]], STONE.l);
  c.poly([[7, 44], [8, 20], [12, 9], [14, 12], [13, 44]], STONE.l);
  c.poly([[23, 44], [23, 16], [27, 8], [30, 18], [29, 44]], STONE.h);
  c.line(18, 46, 18, 10, INK); // the crack
  for (let x = 4; x < 33; x += 2) c.set(x, 44 - (x % 4), STONE.moss);
  c.outline(INK);
  return c;
}

/** An ancient statue: a stone figure with a crown on its head and a skull for a face. Mossy. One arm points. */
function ancientStatue() {
  const c = canvas(26, 50);
  groundShadow(c, 13, 47, 10, 3);
  c.rect(5, 38, 16, 10, STONE.d); // plinth
  c.rect(6, 38, 14, 2, STONE.l);
  c.rect(8, 20, 10, 19, STONE.m); // robe
  c.rect(9, 20, 3, 19, STONE.l);
  c.line(18, 24, 24, 18, STONE.m); // the pointing arm
  c.line(18, 25, 24, 19, STONE.d);
  c.ellipse(13, 14, 6, 6, STONE.h); // the skull
  c.rect(10, 13, 2, 2, INK);
  c.rect(14, 13, 2, 2, INK);
  c.set(12, 16, INK);
  c.hline(10, 15, 18, STONE.d);
  for (const x of [8, 13, 18]) c.poly([[x - 2, 9], [x, 3], [x + 2, 9]], STONE.l); // the crown
  c.hline(7, 19, 9, STONE.d);
  for (const [x, y] of [[8, 30], [16, 34], [12, 41], [6, 44]]) { c.set(x, y, STONE.moss); c.set(x + 1, y, STONE.moss); }
  c.outline(INK);
  return c;
}

/**
 * The ridge's crowned skull of rock: the shape the island's named for, a
 * cliff worn into a skull with a broken crown of pinnacles on top.
 */
function crownskullRock() {
  const c = canvas(96, 92);
  groundShadow(c, 48, 88, 44, 4);
  c.ellipse(48, 52, 40, 34, STONE.m);
  c.rect(20, 60, 56, 28, STONE.m);
  c.ellipse(44, 46, 32, 26, STONE.l);
  // the crown: five pinnacles
  for (const [x, h] of [[18, 16], [32, 24], [48, 30], [64, 24], [78, 16]]) c.poly([[x - 7, 26], [x, 26 - h], [x + 7, 26]], STONE.l);
  for (const [x, h] of [[32, 24], [48, 30], [64, 24]]) c.poly([[x - 2, 24], [x, 28 - h], [x + 2, 24]], STONE.h);
  c.hline(10, 86, 26, STONE.d);
  // the eye sockets, the nose, the teeth
  c.ellipse(32, 50, 9, 8, '#1a1814');
  c.ellipse(64, 50, 9, 8, '#1a1814');
  c.poly([[44, 66], [48, 58], [52, 66]], '#1a1814');
  for (let x = 28; x < 70; x += 7) {
    c.rect(x, 74, 5, 9, STONE.h);
    c.rect(x + 5, 74, 2, 9, '#1a1814');
  }
  for (let i = 0; i < 14; i++) c.set(12 + i * 6, 86 - (i % 3), STONE.moss);
  c.outline(INK);
  return c;
}

/** A spyglass on a post at the ridge's viewpoint. */
function spyglassPost() {
  const c = canvas(14, 30);
  groundShadow(c, 7, 28, 5, 2);
  c.rect(6, 10, 2, 18, WOOD.m);
  c.rect(1, 7, 12, 3, IRON.l);
  c.rect(10, 6, 3, 5, IRON.m);
  c.outline(INK);
  return c;
}

// --- the ruins -------------------------------------------------------------------

function pillar({ broken = false } = {}) {
  const h = broken ? 26 : 44;
  const c = canvas(18, h);
  groundShadow(c, 9, h - 2, 8, 2);
  c.rect(2, h - 6, 14, 5, RUIN.d); // base
  c.rect(4, broken ? 6 : 8, 10, h - 14 - (broken ? 0 : 2), RUIN.m);
  c.rect(5, broken ? 6 : 8, 3, h - 14, RUIN.l);
  for (let y = (broken ? 8 : 12); y < h - 8; y += 6) c.hline(4, 13, y, RUIN.d);
  if (broken) {
    c.poly([[4, 6], [7, 2], [10, 5], [14, 1], [14, 6]], RUIN.l);
  } else {
    c.rect(2, 3, 14, 5, RUIN.l); // capital
    c.hline(2, 15, 3, RUIN.h);
  }
  for (const [x, y] of [[5, h - 10], [12, h - 16], [7, 14]]) c.set(x, y, RUIN.moss);
  c.outline(INK);
  return c;
}

function fallenColumn() {
  const c = canvas(48, 16);
  groundShadow(c, 24, 13, 22, 3);
  c.rect(3, 4, 40, 9, RUIN.m);
  c.hline(3, 42, 5, RUIN.l);
  for (let x = 10; x < 42; x += 8) c.vline(x, 4, 12, RUIN.d);
  c.ellipse(43, 8, 3, 5, RUIN.l);
  c.ellipse(43, 8, 1.5, 3, RUIN.d);
  for (const x of [8, 20, 33]) c.set(x, 12, RUIN.moss);
  c.outline(INK);
  return c;
}

function rubble(seed = 1) {
  const c = canvas(16, 12);
  for (let i = 0; i < 5; i++) {
    const x = 3 + ((i * 5 + seed * 2) % 10);
    const y = 5 + ((i * 3 + seed) % 5);
    c.ellipse(x, y, 2.5, 2, i % 2 ? RUIN.l : RUIN.m);
    c.set(x - 1, y - 1, RUIN.h);
  }
  c.outline(INK);
  return c;
}

/** A carved block from the old walls (one of the stones the crew move to make the shelter). */
function stoneBlock({ carved = false } = {}) {
  const c = canvas(16, 18);
  groundShadow(c, 8, 16, 7, 2);
  c.rect(1, 5, 14, 11, RUIN.m);
  c.rect(1, 2, 14, 4, RUIN.l);
  c.hline(1, 14, 2, RUIN.h);
  if (carved) {
    c.ellipse(8, 10, 3, 3, RUIN.d);
    c.set(7, 10, RUIN.h);
    c.set(9, 10, RUIN.h);
  }
  c.set(3, 14, RUIN.moss);
  c.outline(INK);
  return c;
}

/** The shelter's braced wall: planks and a stone wedged against the gap. */
function bracedWall() {
  const c = canvas(32, 28);
  groundShadow(c, 16, 25, 14, 2);
  for (let i = 0; i < 4; i++) c.rect(3 + i * 7, 4, 6, 21, i % 2 ? WOOD.m : WOOD.b);
  c.line(2, 24, 29, 6, WOOD.d);
  c.line(3, 24, 30, 6, WOOD.l);
  c.rect(10, 18, 12, 8, RUIN.m);
  c.hline(10, 21, 18, RUIN.h);
  c.outline(INK);
  return c;
}

/** A sail hung across the shelter's doorway on a line. */
function shelterCloth() {
  const frames = [0, 1].map((f) => {
    const c = canvas(34, 30);
    c.hline(1, 32, 2, '#a67c3e');
    for (let x = 3; x < 31; x++) {
      const sway = Math.round(Math.sin(x * 0.4 + f * 2) * 1.5);
      c.vline(x, 3, 26 + sway, x % 6 < 3 ? '#d8c8a0' : '#c8b890');
    }
    c.outline(INK);
    return c;
  });
  return { frames, ms: 700 };
}

/** A beam dragged in to prop the roof. */
function beam() {
  const c = canvas(48, 12);
  c.rect(2, 3, 44, 6, WOOD.m);
  c.hline(2, 45, 3, WOOD.l);
  c.hline(2, 45, 8, WOOD.d);
  for (const x of [12, 30]) c.set(x, 5, WOOD.d);
  c.outline(INK);
  return c;
}

// --- the Crimson Fortune ----------------------------------------------------------

/** The marker: a standing stone, swallowed by vines (or cut clear, its carving showing). */
function crimsonMarker({ clear = false } = {}) {
  const c = canvas(24, 38);
  groundShadow(c, 12, 35, 10, 2.5);
  c.rect(4, 6, 16, 30, STONE.m);
  c.ellipse(12, 7, 8, 4, STONE.m);
  c.rect(5, 6, 4, 30, STONE.l);
  if (clear) {
    // a crowned skull, crossed swords under it, worn red paint in the grooves
    c.ellipse(12, 15, 4, 4, STONE.h);
    c.set(10, 15, INK);
    c.set(14, 15, INK);
    for (const x of [9, 12, 15]) c.poly([[x - 1, 11], [x, 8], [x + 1, 11]], RED);
    c.line(6, 22, 18, 31, STONE.d);
    c.line(18, 22, 6, 31, STONE.d);
    c.set(6, 22, RED);
    c.set(18, 22, RED);
    // cut vines at its foot
    for (const x of [3, 8, 16, 21]) c.line(x, 36, x + 2, 33, LEAF.m);
  } else {
    for (let i = 0; i < 9; i++) {
      const x0 = 3 + ((i * 7) % 18);
      for (let y = 4; y < 36; y++) {
        const x = Math.round(x0 + Math.sin(y * 0.35 + i) * 2);
        c.set(x, y, i % 2 ? LEAF.m : LEAF.d);
        if (y % 5 === i % 5) c.ellipse(x + 1, y, 1.5, 1, LEAF.l);
      }
    }
  }
  c.outline(INK);
  return c;
}

/**
 * The dig, three tiles across, as it goes down through seven layers: loose
 * sand, packed clay, stone, more clay, gravel, more stone, and the Miser's
 * Floor of fitted slabs. `depth` 0..7 (0: a ring of pegs and string).
 */
function digPit(depth) {
  const c = canvas(48, 40);
  const LAYERS = [SAND.m, DIRT.clay, STONE.m, DIRT.clayD, '#8a8070', STONE.d, '#5a5248'];
  if (depth === 0) {
    for (const [x, y] of [[4, 6], [44, 6], [4, 36], [44, 36]]) c.rect(x - 1, y - 3, 2, 5, WOOD.l);
    c.hline(4, 44, 5, '#e8e0c0');
    c.hline(4, 44, 35, '#e8e0c0');
    c.vline(4, 5, 35, '#e8e0c0');
    c.vline(44, 5, 35, '#e8e0c0');
    return c;
  }
  // spoil heap at the side, the pit's banded walls (each layer reached shows), the floor of the last
  c.ellipse(41, 30, 7, 6, SAND.d);
  c.ellipse(40, 28, 5, 4, depth > 1 ? DIRT.clay : SAND.m);
  const rx = 18;
  const ry = 14;
  c.ellipse(22, 20, rx, ry, DIRT.d);
  for (let i = 0; i < depth; i++) {
    const k = i / 7;
    c.ellipse(22, 20 + i, rx - i * 1.4, ry - i * 1.2, LAYERS[i]);
    c.ellipse(22, 21 + i, rx - i * 1.4 - 1, ry - i * 1.2 - 1, i === depth - 1 ? LAYERS[i] : DIRT.d);
    if (k > 0.5) c.ellipse(22, 22 + i, rx - i * 1.4 - 2, ry - i * 1.2 - 2, LAYERS[i]);
  }
  if (depth === 7) {
    // the Miser's Floor: fitted slabs
    for (let x = 14; x < 31; x += 5) c.vline(x, 22, 30, '#3a342c');
    c.hline(12, 32, 26, '#3a342c');
  }
  c.ellipseOutline(22, 20, rx, ry, INK);
  return c;
}

function toolPile() {
  const c = canvas(32, 20);
  groundShadow(c, 16, 17, 14, 2.5);
  c.line(3, 16, 28, 4, WOOD.l); // shovel handle
  c.poly([[26, 2], [31, 1], [30, 7], [25, 7]], IRON.l);
  c.line(4, 6, 27, 16, WOOD.m); // pick handle
  c.poly([[2, 3], [9, 7], [8, 9], [1, 6]], IRON.m);
  c.line(6, 14, 22, 15, IRON.d); // pry bar
  c.outline(INK);
  return c;
}

function shovelStuck() {
  const c = canvas(12, 26);
  c.line(6, 2, 6, 20, WOOD.l);
  c.hline(4, 8, 2, WOOD.m);
  c.poly([[3, 18], [9, 18], [8, 24], [4, 24]], IRON.l);
  c.ellipse(6, 24, 5, 1.5, SAND.d);
  c.outline(INK);
  return c;
}

/** A boat pulled up on the sand, oars across it. */
function boatBeached({ decoy = false } = {}) {
  const c = canvas(50, 24);
  groundShadow(c, 25, 20, 23, 3);
  c.poly([[2, 10], [8, 18], [42, 18], [48, 9], [44, 7], [6, 7]], WOOD.m);
  c.poly([[6, 8], [10, 15], [40, 15], [44, 8]], WOOD.d);
  c.hline(6, 44, 7, WOOD.l);
  for (const x of [17, 31]) c.rect(x, 9, 2, 7, WOOD.b);
  if (!decoy) {
    c.line(8, 12, 42, 9, WOOD.h);
    c.line(8, 14, 42, 12, WOOD.h);
  } else {
    // the decoy: empty, a lantern and a shirt on a stick to look busy
    c.rect(22, 4, 1, 10, WOOD.l);
    c.rect(19, 4, 7, 5, '#c8b890');
  }
  c.outline(INK);
  return c;
}

/** The lure: a length of timber soaked in the Grand Stenchmaster's worst, yellow and dripping. */
function lureTimber() {
  const frames = [0, 1].map((f) => {
    const c = canvas(34, 14);
    groundShadow(c, 17, 11, 15, 2);
    c.rect(2, 4, 30, 6, WOOD.m);
    c.hline(2, 31, 4, WOOD.l);
    for (let x = 4; x < 30; x += 3) c.set(x, 6 + (x % 2), FUME.m);
    c.ellipse(8 + f * 12, 2, 3, 2, FUME.l);
    c.outline(INK);
    return c;
  });
  return { frames, ms: 600 };
}

// --- after the blast ---------------------------------------------------------------

/**
 * The crater (a floor prop nine tiles across): a great raw bowl down through
 * the layers, scorched rim, a little yellow fog lying in it, and a few
 * coins and a chain left behind (contaminated).
 */
function crater() {
  const W = 144;
  const H = 104;
  const c = canvas(W, H);
  const cx = W / 2;
  const cy = H / 2;
  // Torn ground: ragged rings, not neat ones (the layers it blew through), lower towards the bottom.
  const ragged = (rx, ry, oy, col, seed) => {
    for (let y = -ry - 3; y <= ry + 3; y++) {
      for (let x = -rx - 3; x <= rx + 3; x++) {
        const a = Math.atan2(y / ry, x / rx);
        const wob = 1 + 0.07 * Math.sin(a * 5 + seed) + 0.05 * Math.sin(a * 11 + seed * 2) + 0.03 * Math.sin(a * 23 + seed);
        if ((x / rx) ** 2 + (y / ry) ** 2 < wob * wob) c.set(Math.round(cx + x), Math.round(cy + oy + y), col);
      }
    }
  };
  ragged(70, 50, 0, '#5a4630', 1); // the scorched rim
  const bands = ['#8a6a44', DIRT.clay, '#7a7064', DIRT.clayD, '#8a8070', '#5a5248', '#3a342c'];
  bands.forEach((col, i) => ragged(64 - i * 7, 45 - i * 5.5, i * 2, col, i * 3 + 2));
  // chunks of each layer flung onto the rim
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * Math.PI * 2 + 0.3;
    const r = 0.92 + (k % 3) * 0.04;
    c.ellipse(Math.round(cx + Math.cos(a) * 66 * r), Math.round(cy + Math.sin(a) * 47 * r), 2.5, 1.8, bands[k % 6]);
  }
  // yellow fog lying in the bottom
  for (let i = 0; i < 40; i++) {
    const x = cx - 18 + ((i * 13) % 36);
    const y = cy + 10 + ((i * 7) % 10);
    c.set(x, y, i % 3 ? FUME.m : FUME.l);
  }
  // what's left: a few coins and a chain, gone green-yellow
  for (const [x, y] of [[cx - 10, cy + 6], [cx + 8, cy + 9], [cx + 2, cy + 14], [cx - 4, cy + 16]]) {
    c.ellipse(x, y, 2, 1.5, '#b8a830');
    c.set(x - 1, y, '#e0d860');
  }
  c.line(cx + 12, cy + 2, cx + 20, cy + 5, '#a89a30');
  // scorch streaks thrown outward
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    c.line(Math.round(cx + Math.cos(a) * 62), Math.round(cy + Math.sin(a) * 44), Math.round(cx + Math.cos(a) * 70), Math.round(cy + Math.sin(a) * 50), '#3a2c1c');
  }
  return c;
}

function uprootedPalm() {
  const c = canvas(48, 26);
  groundShadow(c, 24, 22, 22, 3);
  c.rect(10, 12, 30, 6, BARK.m);
  for (let x = 12; x < 40; x += 5) c.vline(x, 12, 17, BARK.d);
  // roots at one end, fronds at the other, flattened
  for (let i = 0; i < 7; i++) c.line(40, 15, 46, 6 + i * 3, BARK.d);
  c.ellipse(44, 15, 3, 4, DIRT.m);
  for (let k = 0; k < 6; k++) c.line(10, 14, 0 + k, 4 + k * 3, LEAF.m);
  c.ellipse(8, 14, 6, 5, LEAF.d);
  c.outline(INK);
  return c;
}

function debris(seed = 1) {
  const c = canvas(16, 12);
  c.rect(2, 6, 9, 3, WOOD.m);
  c.hline(2, 10, 6, WOOD.l);
  c.ellipse(11 + (seed % 2), 8, 3, 2, STONE.m);
  c.ellipse(5, 9, 2, 1.5, DIRT.clay);
  c.outline(INK);
  return c;
}

/** Contaminated treasure: a few coins and a ring in the dirt, the colour of old mustard. */
function foulCoins() {
  const c = canvas(16, 10);
  for (const [x, y] of [[4, 5], [8, 6], [12, 4], [7, 3]]) {
    c.ellipse(x, y, 2, 1.5, '#b0a428');
    c.set(x - 1, y, '#d8d050');
  }
  c.ellipseOutline(10, 7, 2, 1.5, '#8a8020');
  for (const x of [3, 9, 13]) c.set(x, 1, FUME.l);
  return c;
}

// --- the megalodon -----------------------------------------------------------------

/**
 * The megalodon, stranded in the lagoon's shallows, the size of the ship's
 * longboat three times over: enormous, put out, breathing heavily. Crowned:
 * the Crimson King's Crown jammed on at an angle, as if it had been made for
 * it. Two frames (the gills going).
 */
export function megalodon({ crowned = false, water = true } = {}) {
  const frames = [0, 1].map((f) => {
    const W = 168;
    const H = 72;
    const c = canvas(W, H);
    // the shallows round it (not when it's in the air)
    if (water) {
      c.ellipse(84, 58, 82, 12, '#5aa2c4');
      c.ellipse(84, 58, 74, 9, '#7ab8d4');
    }
    // body
    c.ellipse(80, 40, 66, 20, SHARKC.m);
    c.ellipse(80, 46, 58, 12, SHARKC.belly);
    c.ellipse(70, 33, 50, 10, SHARKC.l);
    // tail
    c.poly([[140, 38], [166, 14 + f * 2], [156, 40], [166, 62 - f * 2]], SHARKC.d);
    // dorsal fin
    c.poly([[72, 22], [88, 2], [96, 22]], SHARKC.d);
    // pectoral fin flat on the sand
    c.poly([[60, 52], [48, 68], [76, 56]], SHARKC.d);
    // gills
    for (let i = 0; i < 4; i++) c.line(44 + i * 5, 32 + f, 46 + i * 5, 46 + f, SHARKC.d);
    // the head: a long grin of teeth, an unimpressed eye
    c.poly([[14, 40], [36, 38], [36, 48], [16, 46]], '#5a1a20');
    for (let x = 16; x < 36; x += 3) {
      c.poly([[x, 40], [x + 1, 43], [x + 2, 40]], '#f4f0e8');
      c.poly([[x, 46], [x + 1, 43], [x + 2, 46]], '#f4f0e8');
    }
    c.ellipse(36, 32, 3, 2.5, '#0a0a10');
    c.hline(33, 39, 30, SHARKC.d); // the brow: put out
    c.set(35, 31, '#ffffff');
    if (crowned) {
      // the Crimson King's Crown: gold, rubies, crooked, a perfect fit
      const cx = 40;
      const cy = 24;
      c.poly([[cx - 12, cy + 6], [cx - 12, cy - 6], [cx - 6, cy], [cx, cy - 10], [cx + 6, cy], [cx + 12, cy - 6], [cx + 12, cy + 6]], GOLD.l);
      c.hline(cx - 12, cx + 12, cy + 4, GOLD.b);
      c.hline(cx - 12, cx + 12, cy + 6, GOLD.d);
      for (const [x, col] of [[cx - 8, RED], [cx, '#d02838'], [cx + 8, '#28a050']]) c.ellipse(x, cy + 2, 1.5, 1.5, col);
      for (const [x, y] of [[cx - 12, cy - 6], [cx, cy - 10], [cx + 12, cy - 6]]) c.set(x, y - 1, '#ffffff');
    }
    c.outline(INK);
    return c;
  });
  return { frames, ms: 900 };
}

// --- on the ship -----------------------------------------------------------------

/** Pete's landing plan, chalked on a hatch cover propped against the bulkhead. */
function planBoard() {
  const c = canvas(32, 28);
  groundShadow(c, 16, 26, 14, 2);
  c.rect(2, 2, 28, 22, '#2e3a32');
  c.strokeRect(1, 1, 30, 24, WOOD.m);
  c.ellipse(18, 12, 8, 6, '#c8c0a8'); // the island in chalk
  c.ellipse(18, 12, 6, 4, '#2e3a32');
  for (let x = 4; x < 12; x += 2) c.set(x, 19, '#c8c0a8'); // the reef
  c.line(6, 6, 10, 16, '#e8e0c8'); // the route round the lee side
  c.line(10, 16, 16, 19, '#e8e0c8');
  c.set(16, 19, '#e04040');
  c.outline(INK);
  return c;
}

/** The crayon paper Garrick pins up: GRAND SHARKMASTER = PETE, and a shark. */
function crayonPaper({ torn = false } = {}) {
  const c = canvas(16, 16);
  c.rect(1, 1, 14, 13, '#efe4c4');
  c.set(8, 1, '#c02a2a'); // the pin
  for (let x = 3; x < 13; x += 2) c.set(x, 4, '#2f64d0');
  c.ellipse(8, 9, 4, 2, '#7a7a86');
  c.set(12, 8, '#7a7a86');
  if (torn) {
    c.line(9, 1, 6, 14, null);
    c.line(10, 1, 7, 14, null);
  }
  c.outline(INK);
  return c;
}

export const PHASE9_PROPS = {
  palm: () => palm({ seed: 1 }),
  palm_lean_l: () => palm({ lean: -1, seed: 2 }),
  palm_lean_r: () => palm({ lean: 1, seed: 3 }),
  jungle_bush: () => bush(1),
  jungle_bush_b: () => bush(4),
  flower_bush: () => bush(2, { flowers: true }),
  fern: () => fern(1),
  fern_flowers: () => fern(2),
  boulder: () => boulder({ seed: 1 }),
  boulder_mossy: () => boulder({ seed: 2 }),
  boulder_big: () => boulder({ big: true }),
  broken_tooth: brokenTooth,
  ancient_statue: ancientStatue,
  crownskull_rock: crownskullRock,
  spyglass_post: spyglassPost,
  ruin_pillar: () => pillar(),
  ruin_pillar_broken: () => pillar({ broken: true }),
  fallen_column: fallenColumn,
  rubble: () => rubble(1),
  rubble_b: () => rubble(3),
  stone_block: () => stoneBlock(),
  stone_block_carved: () => stoneBlock({ carved: true }),
  braced_wall: bracedWall,
  shelter_cloth: shelterCloth,
  beam,
  crimson_marker: () => crimsonMarker(),
  crimson_marker_clear: () => crimsonMarker({ clear: true }),
  ...Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7].map((d) => [`dig_pit_${d}`, () => digPit(d)])),
  tool_pile: toolPile,
  shovel_stuck: shovelStuck,
  boat_beached: () => boatBeached(),
  decoy_boat: () => boatBeached({ decoy: true }),
  lure_timber: lureTimber,
  crater,
  uprooted_palm: uprootedPalm,
  debris_island: () => debris(1),
  debris_island_b: () => debris(2),
  foul_coins: foulCoins,
  megalodon: () => megalodon(),
  megalodon_crowned: () => megalodon({ crowned: true }),
  plan_board: planBoard,
  crayon_paper: () => crayonPaper(),
  crayon_paper_torn: () => crayonPaper({ torn: true }),
};
