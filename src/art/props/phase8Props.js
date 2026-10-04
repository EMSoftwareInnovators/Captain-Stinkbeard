import { canvas, groundShadow, box, WOOD, LWOOD, IRON, INK } from './propKit.js';
import { drawText } from '../font/drawText.js';
import { SASH } from '../characters/characterPainter.js';

/**
 * Props for Story Phase 8 (trapped below with Franklin; the Grand Nap):
 *
 *   - the hold as everyone's everything: Pete's overturned bucket, the
 *     pulley block that keeps hitting Gristle, Salty Jim's biscuit tin,
 *     Garrick's ceremonial rug and the ship's costume trunk;
 *   - the barracks the crew rig in it: hammocks slung over the crates, Bob's
 *     cargo net, Gristle's contraption of belts, sail scrap and fishing net,
 *     Pete's rope-coil pillow, Jim's padlocked pantry, a sailcloth screen;
 *   - the captain's bunk, with the Grand Stenchmaster's enormous reinforced
 *     hammock slung directly above it (empty; with him in it, crowned; with
 *     him in it after the crown was confiscated, the sash hanging down);
 *     Squawks's tiny cradle beside it; the crate the crown is locked in;
 *   - the old sleeping quarters' door in the galley, boarded and signed.
 */

const SAIL = { d: '#8a7a5a', m: '#c8b890', l: '#e6dab8' };
const BURG = { d: '#2e0c18', m: '#521828', l: '#74283a' };
const MUST = { d: '#6a5010', m: '#9a7a1c', l: '#c8a030' };
const BILE = { d: '#3a5a14', m: '#6a9a24', l: '#a8cc48' };
const ROPE = { d: '#7a5a2a', m: '#a67c3e', l: '#cca660' };

/** Pete's seat: a wooden bucket turned upside down. */
function bucketSeat() {
  const c = canvas(14, 14);
  groundShadow(c, 7, 12, 6, 2);
  for (let y = 3; y < 12; y++) {
    const half = 4 + Math.floor((y - 3) / 4);
    for (let x = 7 - half; x <= 7 + half; x++) c.set(x, y, x < 7 - half + 2 ? WOOD.l : x > 7 + half - 2 ? WOOD.d : WOOD.b);
  }
  c.ellipse(7, 3, 4, 1.5, WOOD.l);
  for (const y of [5, 10]) c.hline(7 - 4 - Math.floor((y - 3) / 4), 7 + 4 + Math.floor((y - 3) / 4), y, IRON.m);
  c.outline(INK);
  return c;
}

/** A pulley block hanging from the deckhead on its rope; it swings when she rolls. */
function hangingPulley() {
  const frames = [];
  for (const sway of [-1, 0, 1, 0]) {
    const c = canvas(16, 30);
    for (let y = 0; y < 18; y++) c.set(8 + Math.round((sway * y) / 18), y, ROPE.l);
    const bx = 8 + sway;
    c.ellipse(bx, 21, 3, 4, WOOD.m);
    c.ellipse(bx - 1, 20, 1, 2, WOOD.l);
    c.ellipse(bx, 21, 1, 1, IRON.l);
    c.vline(bx, 25, 28, ROPE.m);
    c.set(bx - 1, 28, IRON.m);
    c.set(bx + 1, 28, IRON.m);
    c.outline(INK);
    frames.push(c);
  }
  return { frames, ms: 480 };
}

/** Salty Jim's emergency biscuits, in a tin, with a sign. Several are already missing. */
function biscuitTin() {
  const c = canvas(16, 16);
  groundShadow(c, 8, 14, 7, 2);
  box(c, 2, 5, 12, 3, 6, { d: '#3a4a5a', m: '#5a6a7a', b: '#7a8a9a', l: '#9aaaba', h: '#c8d4e0' });
  c.rect(4, 9, 8, 2, '#e8dcb0');
  c.set(5, 9, '#7a1826'); c.set(7, 9, '#7a1826'); c.set(9, 9, '#7a1826');
  c.rect(10, 0, 5, 5, '#f0e6c8');
  c.hline(11, 13, 2, '#7a1826');
  c.set(12, 4, WOOD.d);
  for (const [x, y] of [[1, 13], [3, 14]]) c.set(x, y, '#d8b070'); // crumbs
  c.outline(INK);
  return c;
}

/** The Grand Stenchmaster's ceremonial rug: burgundy, mustard fringe, a bilious cloud. */
function garrickRug() {
  const c = canvas(48, 32);
  for (let y = 4; y < 30; y++) for (let x = 2; x < 46; x++) c.set(x, y, (x + y) % 7 === 0 ? BURG.d : BURG.m);
  c.strokeRect(4, 6, 40, 22, MUST.m);
  c.strokeRect(5, 7, 38, 20, MUST.d);
  for (let x = 2; x < 46; x += 2) {
    c.set(x, 3, MUST.l);
    c.set(x, 30, MUST.l);
  }
  // the stink-cloud crest
  for (const [ex, ey, rx] of [[20, 17, 5], [27, 15, 6], [33, 18, 4]]) c.ellipse(ex, ey, rx, 4, BILE.m);
  c.ellipse(25, 14, 3, 2, BILE.l);
  c.hline(18, 35, 21, BILE.d);
  // a grog ring and a crumb trail (from the biscuit tin)
  c.ellipseOutline(39, 23, 3, 2, '#8ab030');
  for (const [x, y] of [[8, 25], [10, 26], [12, 24]]) c.set(x, y, '#d8b070');
  return c;
}

/** The ship's costume trunk: theatre stickers, a broken clasp. Open: feathers and a scarf. */
function costumeTrunk({ open = false } = {}) {
  const c = canvas(20, 20);
  groundShadow(c, 10, 18, 9, 2);
  box(c, 2, 8, 16, 3, 7, { d: '#3a1e12', m: '#5a321e', b: '#7a4a2a', l: '#9a6a3e', h: '#b8885a' });
  for (const x of [3, 16]) c.vline(x, 11, 17, IRON.l);
  c.rect(9, 12, 2, 2, IRON.h);
  c.rect(5, 13, 3, 2, '#d8c860'); // a sticker
  c.rect(12, 14, 3, 2, '#5a9ad0');
  if (open) {
    c.rect(2, 1, 16, 7, '#3a1e12');
    c.rect(3, 2, 14, 5, '#7a4a2a');
    c.line(5, 7, 8, 2, '#e8d8c0'); // a feather
    c.line(6, 7, 9, 3, '#f8ecd8');
    c.rect(10, 5, 6, 3, '#c83a3a'); // a scarf
    c.set(15, 7, '#f0c040');
  } else {
    box(c, 2, 5, 16, 3, 3, { d: '#3a1e12', m: '#5a321e', b: '#7a4a2a', l: '#9a6a3e', h: '#b8885a' });
  }
  c.outline(INK);
  return c;
}

/** A canvas hammock slung high over the crates. `cloth` is the blanket colour. */
function hammock(cloth = SAIL, { patched = false } = {}) {
  const c = canvas(48, 28);
  for (let x = 4; x < 44; x++) {
    const sag = Math.round(Math.sin(((x - 4) / 39) * Math.PI) * 6);
    c.vline(x, 5 + sag, 8 + sag, x % 5 === 0 ? cloth.d : cloth.m);
    c.set(x, 5 + sag, cloth.l);
  }
  c.line(4, 6, 0, 0, ROPE.m);
  c.line(43, 6, 47, 0, ROPE.m);
  c.line(4, 7, 1, 0, ROPE.d);
  c.line(43, 7, 46, 0, ROPE.d);
  // a rolled blanket and a bundle
  c.ellipse(13, 9, 4, 2, cloth.d);
  if (patched) c.rect(26, 10, 4, 3, '#8a5a3a');
  c.outline(INK);
  return c;
}

/** Barnacle Bob's bunk: a cargo net slung over the powder kegs. */
function hammockNet() {
  const c = canvas(32, 26);
  for (let x = 3; x < 29; x++) {
    const sag = Math.round(Math.sin(((x - 3) / 25) * Math.PI) * 6);
    for (let y = 4 + sag; y <= 9 + sag; y++) if ((x + y) % 3 === 0 || (x - y + 30) % 3 === 0) c.set(x, y, ROPE.l);
    c.set(x, 4 + sag, ROPE.m);
  }
  c.line(3, 5, 0, 0, ROPE.m);
  c.line(28, 5, 31, 0, ROPE.m);
  c.ellipse(16, 11, 3, 1, '#2e6a3a'); // his knitted cap, left in it
  c.outline(INK);
  return c;
}

/** Gristle's arrangement: belts buckled end to end, a scrap of sail, a fishing net. It holds. */
function gristleRig() {
  const c = canvas(32, 26);
  for (let x = 3; x < 29; x++) {
    const sag = Math.round(Math.sin(((x - 3) / 25) * Math.PI) * 5);
    c.set(x, 4 + sag, x % 6 < 3 ? '#4a2a14' : '#6a3a1a');
    if (x > 6 && x < 22) c.vline(x, 5 + sag, 7 + sag, SAIL.m);
    if (x >= 20) for (let y = 5 + sag; y <= 8 + sag; y++) if ((x + y) % 2 === 0) c.set(x, y, '#5a7a8a');
    if (x % 6 === 2) c.set(x, 4 + sag, IRON.h); // buckles
  }
  c.line(3, 5, 0, 0, '#4a2a14');
  c.line(28, 5, 31, 0, '#4a2a14');
  c.outline(INK);
  return c;
}

/** Peg-Leg Pete's pillow: a coil of rope with a head-shaped dent in it. */
function ropePillow() {
  const c = canvas(16, 12);
  c.ellipse(8, 7, 6, 3, ROPE.m);
  c.ellipseOutline(8, 7, 4, 2, ROPE.d);
  c.ellipseOutline(8, 7, 2, 1, ROPE.l);
  c.ellipse(7, 6, 2, 1, ROPE.d); // the dent
  c.outline(INK);
  return c;
}

/** Salty Jim's pantry: crates stacked, a padlock, a sign. */
function jimPantry() {
  const c = canvas(16, 30);
  groundShadow(c, 8, 28, 7, 2);
  box(c, 1, 15, 14, 3, 10, WOOD, { planks: 3 });
  box(c, 2, 5, 12, 3, 9, LWOOD, { planks: 3 });
  c.rect(7, 19, 3, 3, IRON.l);
  c.set(8, 18, IRON.h);
  c.rect(3, 8, 9, 4, '#f0e6c8');
  drawText(c, 'JIM', 8, 8, '#7a1826', { center: true });
  c.outline(INK);
  return c;
}

/** A length of old sailcloth hung from the deckhead as a screen against the drips. */
function sailcloth() {
  const frames = [];
  for (const f of [0, 1]) {
    const c = canvas(48, 24);
    c.hline(0, 47, 1, ROPE.m);
    for (let x = 2; x < 46; x++) {
      const len = 12 + Math.round(Math.sin(x * 0.5 + f) * 1.5);
      c.vline(x, 2, len, x % 6 === 0 ? SAIL.d : SAIL.m);
      c.set(x, 2, SAIL.l);
    }
    for (const [x, y] of [[10, 6], [30, 8], [38, 5]]) c.set(x, y, '#c8b048'); // stains
    c.outline(INK);
    frames.push(c);
  }
  return { frames, ms: 900 };
}

/** The Grand Stenchmaster's sash, hanging over an edge (n pixels long). */
function sashDrop(c, x, y, n) {
  for (let i = 0; i < n; i++) {
    c.hline(x, x + 2, y + i, SASH.m);
    c.set(x, y + i, SASH.edge);
    c.set(x + 3, y + i, SASH.edge);
  }
  c.hline(x, x + 3, y + n, SASH.gold);
}

/**
 * The captain's bunk: a low hammock between two posts, and, directly above
 * it, the Grand Stenchmaster's enormous reinforced hammock (extra ropes, a
 * spreader plank, the mustard pillow). `who`: null (empty), 'crowned'
 * (him, asleep, in the crown), 'bare' (him, asleep, crown confiscated, sash
 * hanging down past the captain's pillow).
 */
function bunkDouble(who = null, frame = 0) {
  const c = canvas(36, 48);
  groundShadow(c, 18, 46, 16, 2);
  for (const px of [1, 33]) {
    c.rect(px, 4, 2, 42, WOOD.m);
    c.vline(px, 4, 45, WOOD.l);
  }
  // the captain's hammock, low
  for (let x = 3; x < 33; x++) {
    const sag = Math.round(Math.sin(((x - 3) / 29) * Math.PI) * 4);
    c.vline(x, 34 + sag, 36 + sag, '#6a6a7a');
    c.set(x, 34 + sag, '#8a8a9a');
  }
  c.ellipse(8, 35, 3, 1, '#d8d0c0'); // his pillow
  // the Grand Stenchmaster's hammock, high, sagging, reinforced
  const sagTop = who ? 10 : 7;
  for (let x = 3; x < 33; x++) {
    const sag = Math.round(Math.sin(((x - 3) / 29) * Math.PI) * sagTop);
    c.vline(x, 8 + sag, 11 + sag, BURG.m);
    c.set(x, 8 + sag, BURG.l);
    c.set(x, 11 + sag, BURG.d);
  }
  c.hline(3, 32, 6, WOOD.l); // the spreader plank
  for (const [x0, x1] of [[3, 0], [32, 35], [10, 2], [25, 34]]) c.line(x0, 7, x1, 0, ROPE.m); // so many ropes
  c.ellipse(8, 11, 4, 2, MUST.m); // the mustard pillow
  c.set(8, 11, BURG.d);
  if (who) {
    // him: a great burgundy mound, gloves folded on the belly, boots at the far end
    const breathe = frame % 2;
    c.ellipse(19, 13 - breathe, 10, 5 + breathe, '#521828');
    c.ellipse(17, 11 - breathe, 6, 2, '#74283a');
    c.rect(15, 13 - breathe, 3, 2, '#e8dcb0');
    c.rect(28, 13, 3, 3, '#3a2a18');
    c.ellipse(8, 9, 3, 3, '#dc9c76'); // his face, asleep
    c.set(7, 9, INK);
    c.set(9, 9, INK);
    c.ellipse(8, 11, 2, 1, '#c85236'); // the sideburns
    if (who === 'crowned') {
      c.rect(5, 4, 7, 3, MUST.l);
      c.set(5, 3, '#c8ccd4'); c.set(8, 2, MUST.l); c.set(11, 3, '#c8ccd4');
      c.set(8, 1, BILE.l);
    }
    // the sash: tucked in (crowned) or hanging down over the edge (bare)
    if (who === 'bare') sashDrop(c, 11, 15, 12 + breathe);
    else sashDrop(c, 21, 15, 3);
  }
  c.outline(INK);
  return c;
}

/** Squawks's bed: a tiny hammock cradle on a crate, blankets heaped in it. */
function squawksCradle() {
  const c = canvas(16, 16);
  groundShadow(c, 8, 14, 7, 2);
  c.rect(2, 9, 12, 5, WOOD.m);
  c.hline(2, 13, 9, WOOD.l);
  for (let x = 2; x < 14; x++) {
    const sag = Math.round(Math.sin(((x - 2) / 11) * Math.PI) * 3);
    c.vline(x, 3 + sag, 5 + sag, x % 3 ? '#b4583a' : '#dc8456');
  }
  c.line(2, 4, 1, 1, ROPE.m);
  c.line(13, 4, 14, 1, ROPE.m);
  c.outline(INK);
  return c;
}

/** The crate the Grand Crown was confiscated into, lid nailed, a fork tine poking out. */
function crownCrate() {
  const c = canvas(16, 18);
  groundShadow(c, 8, 16, 7, 2);
  box(c, 1, 3, 14, 3, 10, WOOD, { planks: 3 });
  c.vline(12, 0, 4, '#c8ccd4');
  c.vline(14, 1, 4, '#c8ccd4');
  c.set(3, 2, MUST.l);
  c.hline(3, 12, 9, '#e8e0c8'); // chalked: NOT IN BED
  c.hline(4, 9, 11, '#e8e0c8');
  c.outline(INK);
  return c;
}

/** Boards nailed across the old sleeping quarters' door, a haze leaking under them. */
function condemnedBoards() {
  const c = canvas(16, 18);
  c.rect(2, 2, 12, 15, '#3a2a1a');
  for (const [y0, y1] of [[3, 13], [12, 4]]) c.line(1, y0, 14, y1, WOOD.l);
  c.line(1, 4, 14, 14, WOOD.m);
  c.hline(1, 14, 8, WOOD.b);
  for (const [x, y] of [[2, 3], [13, 13], [2, 12], [13, 4], [2, 8], [13, 8]]) c.set(x, y, IRON.h);
  for (let x = 2; x < 14; x++) c.set(x, 16, x % 3 ? '#c8c060a0' : '#e0d870c0');
  c.outline(INK);
  return c;
}

/** The sign Garrick nailed up beside it. The captain hates the wording. */
function condemnedSign() {
  const c = canvas(16, 16);
  c.rect(1, 2, 14, 11, '#f0e6c8');
  c.hline(2, 13, 4, '#c83a2a');
  c.hline(3, 12, 7, '#3a9a3a');
  c.hline(3, 11, 9, '#3a9a3a');
  c.line(2, 11, 13, 5, '#1a1a28'); // the captain's pen through ENTER AT OWN RISK
  c.set(8, 1, IRON.l);
  c.outline(INK);
  return c;
}

export const PHASE8_PROPS = {
  bucket_seat: bucketSeat,
  hanging_pulley: hangingPulley,
  biscuit_tin: biscuitTin,
  garrick_rug: garrickRug,
  costume_trunk: () => costumeTrunk(),
  costume_trunk_open: () => costumeTrunk({ open: true }),
  hammock_sail: () => hammock(SAIL),
  hammock_blue: () => hammock({ d: '#1c3060', m: '#2c4c8c', l: '#4a70b4' }),
  hammock_patched: () => hammock({ d: '#5a4a3a', m: '#8a7050', l: '#b09070' }, { patched: true }),
  hammock_net: hammockNet,
  gristle_rig: gristleRig,
  rope_pillow: ropePillow,
  jim_pantry: jimPantry,
  sailcloth_screen: sailcloth,
  bunk_double: () => bunkDouble(null),
  bunk_double_crowned: () => ({ frames: [bunkDouble('crowned', 0), bunkDouble('crowned', 1)], ms: 1400 }),
  bunk_double_bare: () => ({ frames: [bunkDouble('bare', 0), bunkDouble('bare', 1)], ms: 1400 }),
  squawks_cradle: squawksCradle,
  crown_crate: crownCrate,
  condemned_boards: condemnedBoards,
  condemned_sign: condemnedSign,
};
