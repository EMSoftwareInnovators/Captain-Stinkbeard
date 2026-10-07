import { canvas, groundShadow, box, cylinder, WOOD, LWOOD, IRON, GOLD, INK, PAL } from './propKit.js';
import { staticFrame } from '../vista/sesArt.js';
import { tokenRosette, tokenMedal, tokenCard } from '../stage/stagePhase10.js';

/**
 * Props for Story Phases 11-13 (bedtime inside the Great Sharkstorm; the
 * thirty-second trial and the Grand Dice; the Ancient Stenchmaster
 * delirium):
 *
 *   - the galley: hammocks of spare sailcloth (then rags), re-hung in
 *     Cheap-O-Rama toy sashes; the kerosene lamp on two ropes, then six (the
 *     Grand Bedside Illumination System); the sash on its peg; Garrick's org
 *     chart; Jim's apron hooks; the Cheap-O-Rama crate (shut and open) and
 *     the flattened sash boxes; the porthole's latch; tokens on the floor;
 *     the Grand Dice on the long table, then on the floor (where it stopped),
 *     its six siblings in a crate; the regalia laid aside, the sash on the
 *     table, a normal breakfast;
 *   - the hold: Gristle's DO NOT OPEN on the treasure-room door (later, three
 *     signs), the salvage crate;
 *   - the captain's cabin: the wardrobe, with the sash in it, leaking;
 *   - the old sleeping quarters: the bedding, condemned (yellowed, growling),
 *     stripped and remade in toy sashes; the kitten-roar pillow; the pile;
 *     the linen locker (stuffed; nailed shut: DO NOT OPEN. IT GROWLS.); the
 *     Fan Mega-Pack, pennants and merchandise; five cardboard Ancient
 *     Stenchmasters (life-size, flat, fold-out stands, CHEAP-O-RAMA on the
 *     back); the bedroom set (in its box, on, with its smell vent open); the
 *     little shelf; the deck's bean spill; the cable round the cannon.
 */
const SASH = { d: '#8a141c', m: '#c8242c', l: '#e8545a', h: '#f4888a', gold: '#f4dc6c', goldD: '#b8962c' };
const SAILCLOTH = { d: '#7a7466', m: '#a8a290', l: '#cec8b4' };
const GRIME = { d: '#7a7a2a', m: '#a8a048', l: '#cec070', y: '#d8c850' };
const ROPE = { d: PAL.rope1, m: PAL.rope2, l: PAL.rope3 };
const CARD = { d: '#8a6a3a', m: '#b89058', l: '#d8b47a', h: '#ecd0a0' };
const TIN = { d: '#5a5e66', m: '#8a8e96', l: '#c8ccd4' };

const sag = (x, x0, len, depth) => Math.round(Math.sin(((x - x0) / len) * Math.PI) * depth);

// --- hammocks and beds -------------------------------------------------------------------------------

/** A hammock strung off the beams (galley, Phase 11): `cloth` the canvas, `torn` rags, `sash` re-hung in toy sashes. */
function slungHammock({ cloth = SAILCLOTH, torn = false, sash = false } = {}) {
  const c = canvas(48, 28);
  for (let x = 4; x < 44; x++) {
    const s = sag(x, 4, 39, 6);
    if (torn && x > 12 && x < 36 && (x % 7 < 3)) continue;
    const top = 5 + s;
    const bot = torn ? top + 1 + (x % 3) : top + 3;
    for (let y = top; y <= bot; y++) {
      let col = x % 5 === 0 ? cloth.d : cloth.m;
      if (sash) col = (x >> 2) % 2 ? SASH.m : SASH.d;
      if (y === top) col = sash ? (x % 6 === 0 ? SASH.gold : SASH.l) : cloth.l;
      c.set(x, y, col);
    }
  }
  c.line(4, 6, 0, 0, ROPE.m);
  c.line(43, 6, 47, 0, ROPE.m);
  c.line(4, 7, 1, 0, ROPE.d);
  c.line(43, 7, 46, 0, ROPE.d);
  if (torn) for (const x of [14, 22, 30]) c.vline(x, 9, 14, cloth.d); // hanging shreds
  if (sash) c.rect(20, 9, 3, 2, '#f0c0a0'); // the little embroidered nose
  c.outline(INK);
  return c;
}

/** The old quarters' hammocks (frame posts, on the floor): `state` grimy | stripped | sash. */
function bunkHammock(state) {
  const make = (f) => {
    const c = canvas(48, 26);
    c.line(1, 0, 6, 12, PAL.rope2);
    c.line(46, 0, 41, 12, PAL.rope2);
    for (let x = 6; x <= 41; x++) {
      const s = sag(x, 6, 35, 6);
      if (state === 'stripped') {
        if (x % 3 === 0) c.set(x, 11 + s, PAL.rope1); // just the rings and a cord
        continue;
      }
      for (let y = 9 + s; y < 16 + s; y++) {
        let col;
        if (state === 'grimy') col = y === 9 + s ? GRIME.l : y > 13 + s ? GRIME.d : (x + y) % 5 === 0 ? GRIME.y : GRIME.m;
        else col = y === 9 + s ? (x % 6 === 0 ? SASH.gold : SASH.l) : y > 13 + s ? SASH.d : (x >> 2) % 2 ? SASH.m : SASH.d;
        c.set(x, y + (state === 'grimy' && f && x > 14 && x < 32 ? -1 : 0), col);
      }
    }
    if (state === 'grimy') {
      c.ellipse(14, 12, 4, 2, GRIME.d); // a tumbled blanket
      for (const [x, y] of [[20, 4], [28, 3]]) c.set(x, y - f, '#d8c85080'); // a faint curl coming off it
    }
    if (state === 'sash') {
      c.ellipse(13, 12, 4, 2, SASH.l); // a folded-sash pillow, with a little nose
      c.set(13, 11, '#f0c0a0');
      for (let x = 18; x < 38; x += 4) c.set(x, 18 + sag(x, 6, 35, 6) - 3, SASH.gold); // AGES SIX AND UP, round the edge
    }
    c.outline(INK);
    return c;
  };
  return state === 'grimy' ? { frames: [make(0), make(1)], ms: 900 } : make(0);
}

/** A sick-bay cot in the old quarters: `state` grimy | stripped | sash. */
function quartersCot(state) {
  const make = (f) => {
    const c = canvas(16, 34);
    groundShadow(c, 8, 31, 7, 2);
    box(c, 1, 2, 14, 26, 4, WOOD);
    if (state === 'stripped') {
      for (let y = 4; y < 27; y += 3) c.hline(2, 13, y, PAL.rope1); // webbing
      c.vline(5, 3, 27, PAL.rope2);
      c.vline(10, 3, 27, PAL.rope2);
    } else if (state === 'grimy') {
      c.rect(2, 3, 12, 24, GRIME.m);
      c.rect(3, 4 - f, 10, 5, GRIME.l);
      c.rect(2, 12, 12, 15, GRIME.d);
      for (const [x, y] of [[4, 15], [9, 19], [6, 23]]) c.set(x, y, GRIME.y);
    } else {
      c.rect(2, 3, 12, 24, SASH.m);
      c.rect(3, 4, 10, 5, SASH.l); // the sash pillow
      c.set(8, 5, '#f0c0a0');
      c.rect(2, 12, 12, 15, SASH.d); // the sash blanket
      for (let y = 13; y < 27; y += 3) c.set(3, y, SASH.gold);
      c.hline(2, 13, 12, SASH.gold);
    }
    c.outline(INK);
    return c;
  };
  return state === 'grimy' ? { frames: [make(0), make(1)], ms: 1100 } : make(0);
}

/** The Grand Stenchmaster's grand hammock, remade: red and gold sashes, a GRAND NAP pillowcase. */
function grandHammockSash() {
  const c = canvas(40, 20);
  for (const px of [1, 38]) c.rect(px, 2, 2, 16, WOOD.m);
  for (let x = 3; x < 38; x++) {
    const s = sag(x, 3, 34, 8);
    c.vline(x, 4 + s, 7 + s, (x >> 2) % 2 ? SASH.m : SASH.gold);
    c.set(x, 4 + s, SASH.l);
  }
  c.line(3, 4, 0, 1, ROPE.m);
  c.line(37, 4, 39, 1, ROPE.m);
  c.ellipse(11, 9, 4, 2, '#f0e8d0'); // GRAND NAP
  c.hline(9, 13, 9, SASH.d);
  c.outline(INK);
  return c;
}

/** Bean sacks made up with a bed sash (Phase 11): the captain's own spot. */
function bedSashSacks() {
  const c = canvas(32, 16);
  groundShadow(c, 16, 13, 15, 2);
  c.ellipse(9, 9, 8, 5, '#a8865a');
  c.ellipse(23, 9, 8, 5, '#9a7a50');
  for (let x = 2; x < 30; x++) c.set(x, 7 + (x % 2), SASH.m); // the sash, laid across
  c.hline(2, 29, 6, SASH.l);
  c.set(16, 7, '#f0c0a0');
  c.outline(INK);
  return c;
}

/** The kitten-roar pillow on its cot: it twitches. */
function kittenPillow({ floor = false } = {}) {
  const make = (f) => {
    const c = canvas(16, floor ? 12 : 20);
    const y = floor ? 6 : 6 - f;
    if (floor) groundShadow(c, 8, 10, 6, 1.5);
    c.rect(2, y, 12, 6, GRIME.l);
    c.hline(2, 13, y, '#e8dca0');
    c.set(5, y + 2, INK); // two eyes, one stitched
    c.set(10, y + 2, INK);
    c.set(7, y + 4, '#a86a5a');
    c.set(8, y + 4, '#a86a5a');
    for (const [x, yy] of [[1, y], [14, y], [1, y + 5], [14, y + 5]]) c.set(x, yy, GRIME.d); // corner tufts
    if (f) c.set(12, y - 2, '#d8c850a0');
    c.outline(INK);
    return c;
  };
  return { frames: [make(0), make(1), make(0), make(0)], ms: 500 };
}

/**
 * A yellowed pillowcase caught under the lid of a footlocker (the quarters' middle port one), hanging down
 * its front: drawn over the footlocker, on the same 16x16 frame, so the one with bedding in it stands out.
 */
function footlockerPillowcase() {
  const c = canvas(16, 16);
  const PALE = '#f0e6b8';
  c.rect(3, 4, 9, 3, PALE); // bunched up under the lid
  c.hline(3, 11, 4, '#fff8dc');
  c.rect(4, 7, 7, 2, PALE); // and hanging down the front
  c.rect(5, 9, 5, 2, PALE);
  c.rect(6, 11, 3, 2, GRIME.l);
  c.set(7, 13, GRIME.m);
  c.set(10, 8, GRIME.l);
  c.set(6, 8, GRIME.y); // stains
  c.set(8, 10, GRIME.y);
  c.set(2, 5, GRIME.d); // a corner tuft
  c.outline(INK);
  return c;
}

/** Every bit of the old bedding in one heap, growling all together. */
function beddingPile() {
  const make = (f) => {
    const c = canvas(32, 24);
    groundShadow(c, 16, 22, 15, 2);
    c.ellipse(16, 16 - f, 14, 7, GRIME.m);
    c.ellipse(10, 13 - f, 7, 4, GRIME.l);
    c.ellipse(22, 12 - f, 6, 4, GRIME.d);
    c.rect(5, 15 - f, 9, 3, '#8a8a4a'); // a hammock cloth corner
    for (const [x, y] of [[8, 18], [19, 17], [25, 15], [13, 11]]) c.set(x, y - f, GRIME.y);
    c.rect(13, 6 - f, 8, 5, '#e8dca0'); // the kitten-roar pillow on top, with its medal
    c.ellipse(20, 9 - f, 2, 2, '#e8c850');
    c.set(20, 11 - f, SASH.m);
    c.outline(INK);
    return c;
  };
  return { frames: [make(0), make(1)], ms: 650 };
}

// --- the linen locker, the shelf, the treasure door's signs --------------------------------------------

function linenLocker(state) {
  const make = (f) => {
    const c = canvas(16, 26);
    c.rect(1, 2, 14, 22, WOOD.d);
    c.rect(2, 3, 12, 20, state === 'stuffed' ? GRIME.m : WOOD.b);
    if (state !== 'stuffed') {
      c.vline(8, 3, 22, WOOD.d);
      c.set(6, 12, IRON.h);
      c.set(10, 12, IRON.h);
    } else {
      c.rect(2, 3, 6, 20, WOOD.b); // a door that won't shut, Bob's weight on it
      c.ellipse(11, 8, 3, 2, GRIME.l);
      c.ellipse(12, 16, 3, 3, GRIME.d);
      c.rect(9, 20, 5, 2, '#8a8a4a');
    }
    if (state === 'sealed') {
      const dx = f ? 1 : 0;
      for (const [y0, y1] of [[5, 18], [18, 6]]) c.line(0 + dx, y0, 15 + dx, y1, WOOD.l);
      for (const [x, y] of [[1, 5], [14, 18], [1, 18], [14, 6]]) c.set(x + dx, y, IRON.h);
      c.rect(3, 10, 10, 6, '#f0e6c8'); // DO NOT OPEN. IT GROWLS.
      c.hline(4, 11, 11, '#c83a2a');
      c.hline(4, 9, 13, '#3a2a1a');
      c.hline(4, 10, 14, '#3a2a1a');
    }
    c.outline(INK);
    return c;
  };
  return state === 'sealed' ? { frames: [make(0), make(0), make(0), make(1), make(0)], ms: 260 } : make(0);
}

/** The little shelf on the north wall: a candle stub, a book called KNOTS, (a can of Spicy Stench Sauce). */
function quartersShelf({ sauce = false } = {}) {
  const c = canvas(16, 18);
  c.rect(1, 12, 14, 2, WOOD.l);
  c.hline(1, 14, 14, WOOD.d);
  c.rect(3, 7, 2, 5, '#f0ecd8'); // candle
  c.set(3, 6, '#f8c040');
  c.rect(7, 5, 3, 7, '#3a5a8a'); // KNOTS
  c.vline(8, 6, 10, '#c8b878');
  if (sauce) {
    c.rect(11, 6, 3, 6, '#b8241c');
    c.rect(11, 8, 3, 2, '#f0d020');
  }
  c.outline(INK);
  return c;
}

/** One sign: DO NOT OPEN (Gristle's, Phase 11). */
function treasureSign() {
  const c = canvas(16, 16);
  c.rect(1, 3, 14, 8, '#f0e6c8');
  c.hline(2, 13, 5, '#c83a2a');
  c.hline(3, 12, 8, '#c83a2a');
  c.set(1, 3, IRON.h);
  c.set(14, 3, IRON.h);
  c.outline(INK);
  return c;
}

/** Three signs, one under another: DO NOT OPEN / YES, SERIOUSLY / BAD CLOUD (in clawprint, on a bit of crate). */
function treasureSignsThree() {
  const c = canvas(16, 22);
  c.rect(1, 1, 14, 6, '#f0e6c8');
  c.hline(2, 13, 3, '#c83a2a');
  c.hline(3, 12, 5, '#c83a2a');
  c.rect(2, 8, 12, 5, '#e8e0d0');
  c.hline(3, 12, 10, '#2a2a3a');
  c.rect(3, 14, 10, 6, CARD.m); // a bit of crate
  for (const [x, y] of [[4, 16], [6, 15], [8, 17], [10, 16], [11, 18]]) c.set(x, y, '#3a1a10'); // clawprint letters
  for (const [x, y] of [[1, 1], [14, 1], [2, 8], [13, 8], [3, 14], [12, 14]]) c.set(x, y, IRON.h);
  c.outline(INK);
  return c;
}

// --- the galley (Phase 11) -----------------------------------------------------------------------------

/** The kerosene lamp tied to the beams: two ropes (swinging), then six (the Grand Bedside Illumination System). */
function lampRope(n) {
  const make = (f) => {
    const c = canvas(32, 32);
    const sway = n === 2 ? [-2, 0, 2, 0][f] : [0, 0, 1, 0][f];
    const lx = 16 + sway;
    const ly = 20;
    const anchors = n === 2 ? [[4, 0], [28, 0]] : [[2, 0], [9, 0], [16, 0], [23, 0], [30, 0], [16, 4]];
    for (const [ax, ay] of anchors) c.line(ax, ay, lx, ly - 4, n === 6 && ax === 16 && ay === 4 ? ROPE.l : ROPE.m);
    c.rect(lx - 3, ly - 4, 6, 2, IRON.m);
    c.ellipse(lx, ly + 2, 4, 4, '#f8d070');
    c.ellipse(lx, ly + 2, 2, 3, '#fff4c0');
    c.rect(lx - 3, ly + 6, 6, 2, IRON.m);
    c.outline(INK);
    return c;
  };
  return { frames: [0, 1, 2, 3].map(make), ms: n === 2 ? 380 : 700 };
}

/** The Grand Stenchmaster's sash on its peg by the ladder. */
function sashPeg() {
  const c = canvas(16, 24);
  c.rect(7, 2, 3, 2, WOOD.m);
  for (let i = 0; i < 16; i++) {
    c.set(6 - (i > 8 ? i - 8 : 0) + 2, 4 + i, i % 3 === 0 ? '#f4dc6c' : '#c8982a');
    c.set(9 + (i > 8 ? i - 8 : 0) - 1, 4 + i, '#9a6e14');
  }
  c.rect(6, 10, 4, 3, '#6a9a2c'); // the badge
  c.outline(INK);
  return c;
}

/** Garrick's org chart, crayon on the back of a Frog Grog label. */
function orgChart() {
  const c = canvas(16, 18);
  c.rect(1, 2, 14, 14, '#e8dcb8');
  c.rect(6, 3, 4, 2, '#c83a2a'); // HIM
  for (const x of [3, 7, 11]) c.rect(x, 8, 3, 2, '#3a7aa8');
  c.rect(6, 12, 4, 2, '#3a9a3a'); // VACANT, TEMPORARILY
  c.vline(8, 5, 7, '#2a2a2a');
  c.hline(4, 12, 7, '#2a2a2a');
  c.set(8, 11, '#2a2a2a');
  c.set(8, 1, IRON.l);
  c.outline(INK);
  return c;
}

function apronHooks() {
  const c = canvas(16, 22);
  c.rect(1, 3, 14, 2, WOOD.m);
  c.rect(2, 5, 5, 12, '#e8e0d0'); // an apron
  c.hline(2, 6, 9, '#c8c0b0');
  c.rect(9, 5, 4, 10, '#d8d0c0'); // the spare
  c.vline(13, 5, 15, IRON.l); // the ladle
  c.ellipse(13, 16, 2, 1.5, IRON.m);
  c.outline(INK);
  return c;
}

/** A Cheap-O-Rama crate: cardboard over thin pine, THIS WAY UP (it isn't). */
function cheapoCrate({ open = false } = {}) {
  const c = canvas(32, 26);
  groundShadow(c, 16, 24, 15, 2);
  box(c, 1, 4, 30, 6, 14, { d: CARD.d, m: CARD.m, b: CARD.l, l: CARD.h, h: '#f4e0b8' });
  // the CHEAP-O-RAMA band: a red stripe with a gold star-burst and a row of tiny gold letters
  c.rect(4, 13, 24, 6, '#c8242c');
  c.rect(6, 14, 4, 4, '#f4dc6c');
  c.set(8, 13, '#f4dc6c'); c.set(8, 18, '#f4dc6c'); c.set(5, 15, '#f4dc6c'); c.set(10, 16, '#f4dc6c');
  for (let x = 12; x < 26; x += 2) c.set(x, 15, '#f4dc6c');
  for (let x = 13; x < 25; x += 3) c.set(x, 16, '#f4dc6c');
  if (open) {
    c.rect(2, 4, 28, 6, '#5a3a1a');
    for (let x = 4; x < 28; x += 3) c.rect(x, 3 - (x % 2), 2, 5, x % 2 ? SASH.m : SASH.gold); // sashes, packed in boxes
    c.line(1, 4, -1, 0, CARD.l);
    c.line(30, 4, 32, 0, CARD.l);
  } else {
    c.line(6, 6, 9, 8, '#3a2a1a'); // an arrow (pointing down)
    c.line(9, 8, 12, 6, '#3a2a1a');
  }
  c.outline(INK);
  return c;
}

/** Empty sash playset boxes, flattened: two smiling cardboard sash holders on each. */
function sashBoxes() {
  const c = canvas(16, 12);
  for (const [x, y, col] of [[1, 6, CARD.l], [3, 4, CARD.h], [5, 2, CARD.l]]) {
    c.rect(x, y, 10, 5, col);
    c.rect(x + 2, y + 1, 2, 2, '#c8242c');
    c.rect(x + 6, y + 1, 2, 2, '#c8242c');
  }
  c.outline(INK);
  return c;
}

/** The porthole's latch, taped over with a toy sash after the book went out of it. */
function portholeLatch() {
  const c = canvas(16, 16);
  c.ellipseOutline(8, 8, 6, 6, IRON.l);
  c.line(3, 12, 13, 4, SASH.m);
  c.line(3, 13, 13, 5, SASH.d);
  c.rect(12, 7, 3, 2, IRON.h);
  c.outline(INK);
  return c;
}

// --- the trial, the dice, breakfast (Phase 12) --------------------------------------------------------

function washBucket() {
  const c = canvas(16, 18);
  groundShadow(c, 8, 16, 6, 1.5);
  cylinder(c, 8, 4, 15, 6, WOOD, { ry: 2, bands: [7, 12], topColor: '#7ab0d0' });
  c.rect(6, 3, 6, 2, '#e8e0d0'); // the good cloth, over the rim
  c.outline(INK);
  return c;
}

/** The Grand Dice of Grandness: a big purple foam die. `pips` the face up; `tilt` it's on the floor, on its edge a bit. */
function grandDie(pips, { table = false } = {}) {
  const c = canvas(16, table ? 20 : 16);
  const y0 = table ? 2 : 3;
  if (!table) groundShadow(c, 8, 14, 7, 1.5);
  c.rect(2, y0, 12, 4, '#a874d8'); // top face
  c.rect(2, y0 + 4, 12, 8, '#7a48b0'); // front face
  c.vline(13, y0 + 4, y0 + 11, '#5a3088');
  c.hline(2, 13, y0, '#c8a0f0');
  const P = { 1: [[8, 2]], 2: [[5, 1], [11, 3]], 3: [[5, 1], [8, 2], [11, 3]], 4: [[5, 1], [11, 1], [5, 3], [11, 3]], 5: [[5, 1], [11, 1], [8, 2], [5, 3], [11, 3]], 6: [[5, 1], [8, 1], [11, 1], [5, 3], [8, 3], [11, 3]] };
  for (const [x, y] of P[pips]) c.set(x, y0 + y, '#f4ecf8');
  if (pips === 3) c.rect(4, y0 + 7, 8, 3, '#f0e080'); // the sticker under the pips: ONE DAY
  c.outline(INK);
  return c;
}

function diceSixPack({ shut = false } = {}) {
  const c = canvas(16, 18);
  groundShadow(c, 8, 16, 7, 1.5);
  box(c, 1, 5, 14, 3, 9, { d: CARD.d, m: CARD.m, b: CARD.l, l: CARD.h, h: '#f4e0b8' });
  if (shut) {
    // still shut, as it came down the hatch: a purple die stencilled on the front, string tied round it
    c.rect(5, 10, 6, 5, '#a874d8');
    for (const [x, y] of [[6, 11], [9, 11], [6, 13], [9, 13]]) c.set(x, y, '#f4ecf8');
    c.vline(8, 5, 16, ROPE.m);
    c.hline(1, 14, 6, ROPE.m);
    c.rect(7, 4, 3, 2, ROPE.l); // the knot
  } else {
    for (const [x, y] of [[2, 2], [6, 1], [10, 2]]) {
      c.rect(x, y, 4, 4, '#a874d8');
      c.set(x + 1, y + 1, '#f4ecf8');
    }
    c.rect(3, 6, 10, 2, '#e8dcc0'); // shredded paper
  }
  c.outline(INK);
  return c;
}

/** The regalia laid aside on the bench end: the Grand Crown (fork, spoon, tiny saucepan), the cape, the medal. */
function regaliaHeap() {
  const c = canvas(16, 14);
  c.ellipse(8, 10, 7, 3, '#7a1e2a'); // the cape, folded
  c.rect(4, 4, 8, 4, GOLD.l); // the crown
  c.vline(5, 1, 4, IRON.l);
  c.vline(10, 1, 4, IRON.l);
  c.ellipse(10, 1, 1.5, 1, IRON.l);
  c.ellipse(13, 9, 2, 2, IRON.h); // the saucepan-lid medal
  c.outline(INK);
  return c;
}

/** The old sash, laid along the long table (yellowed, a little crusted). */
function oldSashTable() {
  const c = canvas(48, 12);
  for (let x = 4; x < 44; x++) c.vline(x, 5 + (x % 9 === 0 ? 1 : 0), 7, x % 5 === 0 ? '#9a6e14' : '#c8a83a');
  c.hline(4, 43, 4, '#e0c860');
  for (const x of [12, 25, 37]) c.set(x, 6, GRIME.y);
  c.rect(22, 4, 4, 3, '#6a9a2c');
  c.outline(INK);
  return c;
}

/** A normal breakfast on the long table: eggs, bacon, potatoes, fruit, toast, tea. No beans. */
function breakfastNormal() {
  const c = canvas(48, 14);
  for (const [x, food] of [[4, 'eggs'], [14, 'bacon'], [24, 'toast'], [34, 'fruit']]) {
    c.ellipse(x + 4, 8, 5, 3, '#e8e8f0');
    if (food === 'eggs') { c.ellipse(x + 3, 7, 2, 1.5, '#ffffff'); c.set(x + 3, 7, '#f0c020'); c.ellipse(x + 6, 8, 2, 1.5, '#ffffff'); c.set(x + 6, 8, '#f0c020'); }
    if (food === 'bacon') { c.hline(x + 1, x + 7, 7, '#b8443a'); c.hline(x + 1, x + 7, 9, '#c8543a'); }
    if (food === 'toast') { c.rect(x + 2, 6, 5, 4, '#d8a050'); c.hline(x + 2, x + 6, 6, '#a86a28'); }
    if (food === 'fruit') { c.ellipse(x + 4, 7, 2, 2, '#f08a20'); c.set(x + 6, 8, '#d8203a'); }
  }
  c.rect(44, 4, 3, 5, '#e8e0d0'); // the tea
  c.set(44, 3, '#c8b08a');
  c.outline(INK);
  return c;
}

function salvageCrate() {
  const c = canvas(16, 20);
  groundShadow(c, 8, 18, 7, 1.5);
  box(c, 1, 5, 14, 4, 10, LWOOD, { planks: 3 });
  c.vline(4, 2, 6, '#5a3a1a'); // a boot
  c.rect(3, 1, 3, 2, '#5a3a1a');
  c.line(9, 6, 13, 2, IRON.l); // a bent sextant arm
  c.outline(INK);
  return c;
}

/** The captain's wardrobe with the sash in it: the door shut, a yellow curl leaking out underneath. */
function wardrobeSashLeak() {
  const make = (f) => {
    const c = canvas(32, 12);
    for (let x = 4; x < 28; x++) if ((x + f) % 4 < 2) c.set(x, 9 - ((x + f) % 3 === 0 ? 1 : 0), '#d8c85090');
    c.set(10 + f * 4, 6, '#d8c85060');
    c.set(20 - f * 3, 5, '#d8c85060');
    return c;
  };
  return { frames: [make(0), make(1), make(2)], ms: 600 };
}

// --- the quarters' merchandise (Phase 13) --------------------------------------------------------------

function megapackBox({ open = false } = {}) {
  const c = canvas(32, 40);
  groundShadow(c, 16, 38, 15, 2);
  box(c, 1, 4, 30, 6, 28, { d: '#8a141c', m: '#b8242c', b: '#d8343a', l: '#e8545a', h: '#f4888a' });
  // the label: a crown over a nose, FAN MEGA-PACK in tiny letters, COLLECT THEM ALL
  c.rect(4, 13, 24, 13, '#f4dc6c');
  c.rect(12, 15, 8, 3, '#b8962c');
  for (const x of [12, 15, 19]) c.set(x, 14, '#b8962c');
  c.rect(15, 19, 2, 3, '#f0b090');
  c.set(14, 21, '#f0b090');
  for (let x = 6; x < 26; x += 2) c.set(x, 24, '#8a141c');
  if (open) {
    c.rect(2, 4, 28, 6, '#3a1a10');
    for (let x = 4; x < 28; x += 4) c.vline(x, 2, 7, '#d8b878'); // straw
    c.rect(20, 0, 6, 6, '#a874d8'); // a foam die, poking out
  }
  c.outline(INK);
  return c;
}

/** Pennants on a string: GRAND STENCHMASTER, GRAND STENCHMASTER... */
function merchBunting() {
  const c = canvas(48, 12);
  for (let x = 0; x < 48; x++) c.set(x, 2 + sag(x, 0, 47, 3), ROPE.m);
  for (let i = 0; i < 7; i++) {
    const x = 3 + i * 6;
    const y = 3 + sag(x, 0, 47, 3);
    const col = i % 2 ? SASH.m : '#f4dc6c';
    c.poly([[x, y], [x + 4, y], [x + 2, y + 6]], col);
  }
  c.outline(INK);
  return c;
}

/** Merchandise on the floor: a mug (WORLD'S GRANDEST), foam dice, a medal, a badge, a crown. */
function merchClutter() {
  const c = canvas(16, 12);
  c.rect(1, 5, 4, 5, '#f0ecd8');
  c.vline(5, 6, 8, '#f0ecd8');
  c.set(2, 7, SASH.m);
  c.rect(7, 6, 3, 3, '#a874d8');
  c.set(8, 7, '#f4ecf8');
  c.ellipse(12, 8, 2, 2, IRON.h);
  c.rect(9, 2, 5, 3, '#e8c850'); // a cheap crown
  for (const x of [9, 11, 13]) c.set(x, 1, '#e8c850');
  c.outline(INK);
  return c;
}

/** A life-size cardboard Ancient Stenchmaster on a fold-out stand. Flat, printed, CHEAP-O-RAMA on the back. */
function standee(who) {
  const c = canvas(20, 44);
  groundShadow(c, 10, 42, 6, 1.5);
  c.line(14, 41, 17, 30, CARD.d); // the fold-out stand, behind
  // the printed figure, a cut-out silhouette with a white cardboard edge
  const fig = canvas(20, 44);
  const skin = '#e8b48a';
  const body = { stenchalina: '#f0c8d8', brogath: '#6a4a8a', rumpold: '#2a4a6a', rumpus: '#1e1a22', gustavio: '#3a6a3a' }[who];
  const tall = who === 'stenchalina' ? 18 : 0; // the princess is a baby (life-size)
  fig.rect(5, 18 + tall, 10, 16 - tall / 2, body); // body
  fig.rect(6, 34 + tall / 2, 3, 8 - tall / 2, '#3a2a1a'); // legs
  fig.rect(11, 34 + tall / 2, 3, 8 - tall / 2, '#3a2a1a');
  fig.ellipse(10, 13 + tall, 4, 5, skin); // head
  for (let i = 0; i < 10; i++) fig.set(6 + i, 19 + tall + i, i % 3 === 0 ? '#f4dc6c' : SASH.m); // every one of them in a sash
  if (who === 'stenchalina') {
    fig.rect(7, 26, 6, 3, '#e8c850'); // crown
    fig.rect(14, 22, 2, 6, skin); // the fist, raised
    fig.rect(13, 20, 4, 3, skin);
  }
  if (who === 'brogath') {
    fig.rect(7, 7, 6, 3, '#e8c850');
    fig.set(7, 14, '#f08a9a'); fig.set(13, 14, '#f08a9a'); // blushing
    fig.rect(3, 18, 4, 10, SASH.l); // half-hidden behind his own sash
  }
  if (who === 'rumpold') {
    // printed from BEHIND: the back of his head and his coat-tails
    fig.ellipse(10, 13, 4, 5, '#5a3a1a');
    fig.rect(5, 30, 10, 4, '#1e3a5a');
    fig.vline(10, 30, 33, '#122a44');
  }
  if (who === 'rumpus') {
    fig.ellipse(10, 11, 6, 5, '#f0ecd8'); // the great wig
    fig.ellipse(10, 14, 4, 4, skin);
    fig.rect(15, 10, 2, 6, skin); // one finger, raised
    fig.set(15, 9, skin);
  }
  if (who === 'gustavio') {
    fig.rect(6, 4, 8, 6, '#1e1a22'); // top hat
    fig.hline(5, 14, 9, '#1e1a22');
    fig.rect(8, 13, 4, 3, '#2a1a10'); // mouth, a horrified O
    fig.set(9, 14, '#d84a4a');
  }
  if (who !== 'rumpold') { fig.set(8, 12 + tall, INK); fig.set(12, 12 + tall, INK); }
  // the cardboard edge
  for (let y = 0; y < 44; y++) for (let x = 0; x < 20; x++) {
    if (!fig.alphaAt(x, y)) continue;
    c.set(x, y, fig.get(x, y));
  }
  c.outline('#f0e8d8');
  c.outline(INK);
  return c;
}

/** The bedroom set on the barrel table: in its box, built (snow), on (the Channel), and on with the vent open. */
function sesKit(state) {
  const tv = (screen) => {
    const c = canvas(16, 30);
    c.rect(2, 4, 12, 11, '#3a2a1a'); // a little cabinet
    c.rect(3, 5, 8, 8, '#1a1a22');
    if (screen) c.blit(screen, 3, 5);
    c.rect(12, 6, 1, 1, '#e8c850'); // knobs
    c.rect(12, 9, 1, 1, '#e8c850');
    for (const x of [5, 8, 11]) c.vline(x, 0, 3, IRON.l); // three of Jim's forks for an aerial
    c.line(6, 1, 10, 1, IRON.h); // the horseshoe across them
    c.rect(13, 11, 2, 3, IRON.d); // the grille (Stench-O-Vision)
    c.outline(INK);
    return c;
  };
  if (state === 'box') {
    const c = canvas(16, 30);
    box(c, 2, 4, 12, 3, 9, { d: CARD.d, m: CARD.m, b: CARD.l, l: CARD.h, h: '#f4e0b8' });
    c.rect(4, 9, 8, 3, '#c8242c');
    c.outline(INK);
    return c;
  }
  const scr = (i) => {
    const s = canvas(8, 8);
    if (state === 'static') {
      const st = staticFrame(731 + i * 13);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) s.set(x, y, st.get(Math.floor(x * st.width / 8), Math.floor(y * st.height / 8)) ?? '#808080');
    } else {
      s.rect(0, 0, 8, 8, '#2a1a3a');
      s.rect(2, 2, 4, 2, '#e8c850'); // the logo: a crown,
      s.rect(1, 4, 6, 1, SASH.m); // a sash,
      s.set(4, 6, '#f0c0a0'); // and a nose
      if (i % 2) s.set(1, 1, '#f8f0ff');
    }
    return s;
  };
  const frames = [0, 1, 2, 3].map((i) => {
    const c = tv(scr(i));
    if (state === 'vent') {
      c.rect(13, 11, 2, 3, '#8a4a8a'); // the grille, open
      for (const [x, y] of [[15, 9 - (i % 2)], [14, 7 - i], [15, 5 - (i % 3)]]) c.set(x, y, '#c890e0a0');
    }
    return c;
  });
  return { frames, ms: state === 'static' ? 90 : 450 };
}

/** A spill of Crying Beans by the main hatch. */
function beansSpilled() {
  const c = canvas(16, 10);
  for (const [x, y] of [[2, 5], [4, 7], [6, 4], [7, 6], [9, 5], [11, 7], [12, 4], [5, 2], [10, 2], [13, 6]]) {
    c.rect(x, y, 2, 1, '#8a4a2a');
    c.set(x, y, '#b8704a');
  }
  c.outline(INK);
  return c;
}

/** Three turns of television cable round the starboard cannon. */
function cableCannon() {
  const c = canvas(32, 20);
  for (const x of [10, 14, 18]) {
    c.line(x, 6, x + 2, 16, '#2a2a2a');
    c.line(x + 1, 6, x + 3, 16, '#4a4a4a');
  }
  c.line(20, 16, 31, 18, '#2a2a2a');
  return c;
}

const floorToken = (painter) => () => {
  const src = painter();
  const t = src.frames ? src.frames[0] : src;
  const c = canvas(16, 12);
  c.blit(t, Math.floor((16 - t.width) / 2), Math.max(0, 12 - t.height));
  return c;
};

export const PHASE11_PROPS = {
  // Phase 11
  hammock_sailcloth: () => slungHammock(),
  hammock_rags: () => slungHammock({ torn: true }),
  hammock_sash: () => slungHammock({ sash: true }),
  bed_sash_sacks: bedSashSacks,
  lamp_two_rope: () => lampRope(2),
  lamp_six_rope: () => lampRope(6),
  sash_peg: sashPeg,
  org_chart_wall: orgChart,
  apron_hooks: apronHooks,
  token_card_floor: floorToken(tokenCard),
  token_rosette_floor: floorToken(tokenRosette),
  token_medal_floor: floorToken(tokenMedal),
  cheap_o_rama_crate: () => cheapoCrate(),
  cheap_o_rama_crate_open: () => cheapoCrate({ open: true }),
  sash_boxes: sashBoxes,
  porthole_latch: portholeLatch,
  treasure_sign_do_not_open: treasureSign,
  // Phase 12
  wash_bucket: washBucket,
  grand_dice_table: () => grandDie(6, { table: true }),
  grand_dice_floor_2: () => grandDie(2),
  grand_dice_floor_3: () => grandDie(3),
  grand_dice_floor_4: () => grandDie(4),
  grand_dice_floor_5: () => grandDie(5),
  dice_six_pack: () => diceSixPack(),
  dice_shipment_crate: () => diceSixPack({ shut: true }),
  regalia_heap: regaliaHeap,
  old_sash_table: oldSashTable,
  breakfast_normal: breakfastNormal,
  salvage_crate: salvageCrate,
  wardrobe_sash_leak: wardrobeSashLeak,
  // Phase 13
  hammock_grimy: () => bunkHammock('grimy'),
  hammock_stripped: () => bunkHammock('stripped'),
  hammock_sash_bunk: () => bunkHammock('sash'),
  cot_grimy: () => quartersCot('grimy'),
  cot_stripped: () => quartersCot('stripped'),
  cot_sash: () => quartersCot('sash'),
  grand_hammock_sash: grandHammockSash,
  kitten_pillow: () => kittenPillow(),
  kitten_pillow_floor: () => kittenPillow({ floor: true }),
  footlocker_pillowcase: footlockerPillowcase,
  bedding_pile: beddingPile,
  linen_locker: () => linenLocker('plain'),
  linen_locker_stuffed: () => linenLocker('stuffed'),
  linen_locker_sealed: () => linenLocker('sealed'),
  megapack_box: () => megapackBox(),
  megapack_open: () => megapackBox({ open: true }),
  merch_bunting: merchBunting,
  merch_clutter: merchClutter,
  standee_stenchalina: () => standee('stenchalina'),
  standee_brogath: () => standee('brogath'),
  standee_rumpold: () => standee('rumpold'),
  standee_rumpus: () => standee('rumpus'),
  standee_gustavio: () => standee('gustavio'),
  ses_kit_box: () => sesKit('box'),
  ses_kit_static: () => sesKit('static'),
  ses_kit_on: () => sesKit('on'),
  ses_kit_vent: () => sesKit('vent'),
  quarters_shelf: () => quartersShelf(),
  quarters_shelf_sauce: () => quartersShelf({ sauce: true }),
  beans_spilled: beansSpilled,
  cable_cannon: cableCannon,
  treasure_signs_three: treasureSignsThree,
};
