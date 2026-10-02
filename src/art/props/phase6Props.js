import { canvas, groundShadow, WOOD, LWOOD, IRON, INK } from './propKit.js';
import { drawText } from '../font/drawText.js';
import { sesTv, miniScreen } from './phase5Props.js';
import { PHASE6_SCREEN_PAINTERS } from '../vista/vistaPhase6.js';
import { barrel } from './deckProps.js';

/**
 * Props for Story Phase 6 (The Death Rattle of the Stenchmaster
 * Entertainment System; The Midnight Stenchmaster Catastrophe): the set on
 * deck showing the Frog Tax Man, then dying (red tubes, a blinking red
 * light), apparently dead, and finally hit by a shark; the small smoulders
 * that nearly became fires, the singed wire run through the furniture, the
 * fork the television threw into the wall and the warning card taped to it;
 * the rotten garlic jar and the onion basket; the Grand Stenchmaster's
 * enormous hammock; the bulk Frog Grog barrels (the reserve and the single
 * barrels rolled into the storm); storm debris; and the food ban.
 */

const GROG = { d: '#3a4a1c', m: '#5a7a2a', l: '#a8c050', h: '#d0e070' };
const SASHY = { m: '#c8982a', edge: '#5e1624', plush: '#74283a', plushD: '#521828', plushL: '#9a3a4a' };
const PAPER = '#f0e6c8';

const mini = (src) => miniScreen(src, 12, 8);

/** Paints the little red light on the set's side (on or off). */
function redDot(c, on) {
  c.set(20, 19, on ? '#ff3a2a' : '#4a1410');
}

/** The Frog Tax Man, playing on the set on deck. */
function sesFtm() {
  return { frames: [0, 1, 2, 3].map((f) => sesTv(mini(PHASE6_SCREEN_PAINTERS.ftm(f)))), ms: 650 };
}

/** Dying: no picture, tubes a sullen red, the red light blinking. */
function sesDying() {
  const frames = [true, false].map((on) => {
    const c = sesTv(mini(PHASE6_SCREEN_PAINTERS.dot()), { tubes: 'red' });
    redDot(c, on);
    return c;
  });
  return { frames, ms: 500 };
}

/** Apparently dead: black glass, dark tubes. (It still ticks.) */
function sesDead() {
  const c = sesTv(null, { tubes: 'dark' });
  c.rect(4, 11, 12, 8, '#06080a');
  return c;
}

/** After the shark: cracked glass, a bite out of the corner, soot, the aerial bent flat. */
function sesWrecked() {
  const c = sesDead();
  // the bite out of the top right corner
  for (const [bx, by, r] of [[21, 7, 3], [23, 10, 2]]) {
    for (let y = by - r; y <= by + r; y++) for (let x = bx - r; x <= bx + r; x++) if (Math.hypot(x - bx, y - by) < r && (x + y) % 3) c.set(x, y, 'transparent');
  }
  // the glass cracked from one point
  for (const [x1, y1] of [[4, 12], [8, 18], [15, 18], [14, 11], [5, 16]]) c.line(12, 13, x1, y1, '#c8d8d8');
  c.set(12, 13, '#ffffff');
  // soot on the front, the aerial knocked flat
  for (const [sx, sy] of [[3, 8], [6, 7], [9, 9], [17, 8], [18, 12], [2, 20]]) c.set(sx, sy, '#141010');
  for (let y = 0; y < 6; y++) for (let x = 0; x < 7; x++) if (c.alphaAt(x, y) && c.get(x, y) !== 0) c.set(x, y, 'transparent');
  c.line(2, 6, 0, 5, IRON.h);
  c.outline(INK);
  return c;
}

/** A smouldering spot: a scorch, an ember, a thread of smoke (it wants smothering). */
function smolder() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const c = canvas(14, 18);
    c.ellipse(7, 15, 5, 2, '#2a1a12');
    c.ellipse(7, 15, 3, 1.2, '#4a2a18');
    c.set(6 + (f % 2), 15, f === 1 ? '#ffd060' : '#ff6a20');
    c.set(8, 15 - (f === 2 ? 1 : 0), '#ff8a30');
    for (let k = 0; k < 8; k++) {
      const x = 7 + Math.round(Math.sin(k * 0.8 + f * 1.3) * 2);
      c.set(x, 13 - k, k < 3 ? '#8a8a8ac0' : '#b8b8b880');
      if (k > 3) c.set(x + 1, 13 - k, '#d8d8d860');
    }
    frames.push(c);
  }
  return { frames, ms: 220 };
}

/** What's left once smothered: a black ring, a wet patch. */
function smolderOut() {
  const c = canvas(14, 8);
  c.ellipse(7, 4, 5, 2, '#2a1a12');
  c.ellipse(7, 4, 3, 1, '#3a4a52');
  c.set(5, 3, '#6a7a8a');
  return c;
}

/** The wire the S.E.S. runs to everything (a floor decal), scorched, the odd spark. */
function wireRun() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const c = canvas(16, 8);
    for (let x = 0; x < 16; x++) c.set(x, 4 + Math.round(Math.sin(x * 0.7) * 1.5), x % 5 === 2 ? '#2a1a12' : '#c83a30');
    for (let x = 0; x < 16; x++) c.set(x, 5 + Math.round(Math.sin(x * 0.7 + 1) * 1.5), '#3a6ad0');
    if (f) {
      for (const [sx, sy] of [[9, 2], [10, 1], [8, 1], [11, 3]]) c.set(sx, sy, '#fff0a0');
      c.set(9, 3, '#80d0ff');
    }
    frames.push(c);
  }
  return { frames, ms: 380 };
}

/** The fork the television threw, still quivering in the wall (a wall decal). */
function forkInWall() {
  const c = canvas(12, 10);
  c.ellipse(9, 5, 2, 2, '#3a2412');
  c.line(9, 5, 2, 3, '#c8c8d0');
  c.line(9, 6, 2, 4, '#8a8a96');
  c.rect(1, 2, 2, 4, '#c8c8d0');
  for (const [cx, cy] of [[10, 2], [11, 8]]) c.set(cx, cy, '#e8e0c8');
  c.outline(INK);
  return c;
}

/** Garrick's warning card, taped to the side of the set (a decal). */
function warningCard() {
  const c = canvas(12, 11);
  c.rect(1, 1, 10, 9, PAPER);
  c.hline(0, 3, 0, '#e8e0b0c0');
  c.hline(8, 11, 0, '#e8e0b0c0');
  // a stick figure, a lightning bolt
  c.ellipse(3, 4, 1, 1, INK);
  c.vline(3, 5, 7, INK);
  c.line(3, 6, 5, 5, INK);
  c.line(9, 2, 7, 5, '#e8b020');
  c.line(7, 5, 8, 6, '#e8b020');
  c.line(8, 6, 6, 8, '#e8b020');
  c.hline(2, 9, 9, '#d03a2a');
  return c;
}

/** The jar of garlic that should have been thrown away weeks ago. */
function garlicJar({ open = false } = {}) {
  const c = canvas(12, 16);
  groundShadow(c, 6, 14, 5, 1.5);
  c.rect(2, 4, 8, 10, '#a8b8a0b0');
  c.vline(2, 4, 13, '#d8e8d0');
  for (const [gx, gy] of [[4, 9], [7, 10], [5, 12], [7, 7]]) {
    c.ellipse(gx, gy, 1.6, 1.4, '#c8c890');
    c.set(gx, gy - 1, '#8a8a48');
  }
  c.set(3, 11, '#6a7a28');
  c.set(8, 12, '#4a5a20');
  if (!open) c.rect(1, 2, 10, 2, IRON.m);
  else c.rect(8, 0, 4, 2, IRON.m);
  // the label: DO NOT EAT
  c.rect(3, 6, 6, 3, PAPER);
  c.hline(4, 7, 7, '#d03a2a');
  // a faint green haze over it
  for (const [hx, hy] of [[4, 1], [6, 0], [7, 2]]) c.set(hx, hy, '#a8c05080');
  c.outline(INK);
  return c;
}

function onionBasket() {
  const c = canvas(16, 12);
  groundShadow(c, 8, 10, 7, 1.5);
  c.rect(2, 5, 12, 5, '#a07a3a');
  for (let x = 2; x < 14; x += 2) c.vline(x, 5, 9, '#6a4a1c');
  for (const [ox, oy] of [[5, 4], [8, 3], [11, 4], [7, 5]]) {
    c.ellipse(ox, oy, 2, 1.7, '#c88a5a');
    c.set(ox - 1, oy - 1, '#e8b080');
    c.set(ox, oy - 2, '#8a6a3a');
  }
  c.outline(INK);
  return c;
}

/** The Grand Stenchmaster's enormous hammock, slung across a corner, sash-coloured blanket. */
function grandHammock() {
  const c = canvas(40, 20);
  for (const px of [1, 38]) c.rect(px, 2, 2, 16, WOOD.m);
  for (let x = 3; x < 38; x++) {
    const sag = Math.round(Math.sin(((x - 3) / 34) * Math.PI) * 8);
    c.vline(x, 4 + sag, 7 + sag, '#cca660');
    if (x > 8 && x < 33) c.vline(x, 5 + sag, 6 + sag, x % 4 < 2 ? SASHY.plush : SASHY.plushL);
  }
  c.line(3, 4, 0, 1, '#a67c3e');
  c.line(37, 4, 39, 1, '#a67c3e');
  // a mustard pillow embroidered GS
  c.ellipse(11, 9, 4, 2, SASHY.m);
  c.set(11, 9, SASHY.edge);
  c.outline(INK);
  return c;
}

/** The bulk Frog Grog reserve: barrels stacked and lashed, BULK painted on. */
function bulkGrog({ empty = false } = {}) {
  const c = canvas(32, 28);
  groundShadow(c, 16, 26, 15, 2);
  const one = (x, y) => {
    const b = barrel({ mark: null });
    c.blit(b, x, y);
  };
  one(0, 8);
  one(14, 8);
  if (!empty) one(7, -2);
  // the lashing and the paint
  c.hline(1, 30, 17, '#cca660');
  c.rect(6, 19, 20, 6, empty ? '#4a3a24' : GROG.m);
  drawText(c, 'BULK', 16, 18, empty ? '#8a7a5a' : GROG.h, { center: true });
  if (empty) c.line(4, 20, 28, 24, '#d03a2a');
  return c;
}

/** One barrel of concentrated Frog Grog, sealed and ready to be thrown at weather. */
function grogBarrelBulk() {
  const c = canvas(14, 18);
  groundShadow(c, 7, 16, 6, 2);
  c.ellipse(7, 9, 6, 7, WOOD.m);
  c.vline(3, 3, 15, WOOD.l);
  for (const y of [4, 9, 14]) c.hline(1, 12, y, IRON.l);
  c.ellipse(7, 3, 5, 1.6, WOOD.d);
  c.rect(4, 7, 6, 4, GROG.m);
  c.set(6, 8, GROG.h);
  c.set(7, 9, GROG.h);
  c.set(7, 2, GROG.l);
  c.outline(INK);
  return c;
}

/** Storm wreckage on deck: splintered planks, rope, seaweed, a tooth. */
function stormDebris() {
  const c = canvas(22, 12);
  c.thickLine(2, 9, 16, 4, 2, LWOOD.m);
  c.thickLine(6, 3, 19, 9, 2, WOOD.m);
  c.line(1, 6, 9, 10, '#cca660');
  c.line(12, 10, 20, 11, '#3a6a3a');
  c.line(13, 9, 18, 7, '#4a8a3a');
  c.poly([[10, 6], [12, 6], [11, 9]], '#f4f0e8');
  c.outline(INK);
  return c;
}

/** Where the shark came through the wall by the S.E.S.: a jagged hole, boards over it. */
function wallHole() {
  const c = canvas(18, 16);
  c.poly([[2, 3], [7, 1], [10, 4], [15, 2], [16, 9], [12, 14], [6, 13], [1, 9]], '#0c0a10');
  c.thickLine(0, 5, 17, 10, 2, LWOOD.l);
  c.thickLine(1, 12, 17, 4, 2, LWOOD.m);
  for (const [nx, ny] of [[1, 5], [16, 10], [2, 12], [16, 4]]) c.set(nx, ny, '#c8c8d0');
  c.outline(INK);
  return c;
}

/** The food ban, nailed up in the captain's hand. */
function foodBan() {
  const c = canvas(16, 18);
  c.rect(2, 1, 12, 15, PAPER);
  for (let y = 4; y < 14; y += 2) c.hline(4, 11, y, '#3a3a48');
  c.hline(3, 12, 2, '#d03a2a');
  c.line(4, 6, 11, 12, '#d03a2a');
  c.line(11, 6, 4, 12, '#d03a2a');
  c.set(8, 1, IRON.h);
  c.outline(INK);
  return c;
}

/** A splash of Frog Grog where a barrel burst (deck decal). */
function grogSplash() {
  const c = canvas(18, 10);
  c.ellipse(9, 5, 7, 3, '#7aa02c90');
  for (const [x, y] of [[2, 3], [16, 6], [4, 8], [14, 2]]) c.set(x, y, '#b8e05090');
  return c;
}

export const PHASE6_PROPS = {
  ses_tv_ftm: sesFtm,
  ses_tv_dying: sesDying,
  ses_tv_dead: sesDead,
  ses_tv_wrecked: sesWrecked,
  smolder,
  smolder_out: smolderOut,
  wire_run: wireRun,
  fork_in_wall: forkInWall,
  warning_card: warningCard,
  garlic_jar: () => garlicJar(),
  garlic_jar_open: () => garlicJar({ open: true }),
  onion_basket: onionBasket,
  grand_hammock: grandHammock,
  bulk_grog: () => bulkGrog(),
  bulk_grog_empty: () => bulkGrog({ empty: true }),
  grog_barrel_bulk: grogBarrelBulk,
  storm_debris: stormDebris,
  wall_hole: wallHole,
  food_ban: foodBan,
  grog_splash: grogSplash,
};

