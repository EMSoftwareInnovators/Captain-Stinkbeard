import { canvas, box, cylinder, outline, groundShadow, WOOD, LWOOD, DWOOD, IRON, INK, PAL } from './propKit.js';
import { drawText } from '../font/drawText.js';

/**
 * Props for Story Phase 4 (The Stench Forecast): the Grand Stenchmaster's
 * forecast board and crayons, Squawks's padded basket, the breakfast that
 * the Dead Center ate, the washroom, bedding moved up on deck, the Shark
 * Duty tools, and the hull's worsening state: bites, gaps, patches, patches
 * on patches, and emergency lashings.
 */

const GROG = { d: '#3a4a1c', m: '#5a7a2a', b: '#7a9a38', l: '#a8c050', h: '#d0e070' };
const CRAYON = ['#e8c020', '#3a6ad0', '#d03a2a', '#3a9a3a', '#8a4ac8'];
const PAPER = { m: '#f0e6c8', d: '#d8ccb0', l: '#fff8e8' };
const WICKER = { d: '#6a4a1c', m: '#a07a3a', l: '#c8a060', h: '#e0c080' };
const PLAID = ['#4a3a6a', '#6a5a8a', '#c8b8e0', '#8a2a2a'];

// ---------------------------------------------------------------------------
// The Grand Stenchmaster's station

/** An easel with the day's crayon forecast pinned to it (the sheet stirs). */
function forecastBoard() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const c = canvas(18, 30);
    groundShadow(c, 9, 28, 7, 2);
    // legs
    c.line(3, 28, 6, 10, WOOD.m);
    c.line(15, 28, 12, 10, WOOD.m);
    c.line(9, 29, 9, 12, WOOD.d);
    // the board
    box(c, 1, 3, 16, 1, 14, LWOOD, { frame: false });
    // the sheet (lifts at one corner in the breeze)
    c.rect(3, 4, 12, 11, PAPER.m);
    c.hline(3, 14, 4, PAPER.l);
    if (f) c.set(14, 14, PAPER.d);
    // a tiny crayon map: a blue zigzag sea, a yellow scribble, a red X
    for (let x = 3; x < 15; x++) c.set(x, 13 - (x % 2), CRAYON[1]);
    c.ellipse(8, 8, 3, 2, CRAYON[0]);
    c.set(11, 6, CRAYON[2]); c.set(12, 7, CRAYON[2]); c.set(11, 7, CRAYON[2]); c.set(12, 6, CRAYON[2]);
    c.line(4, 6, 6, 9, CRAYON[4]);
    // pins
    c.set(3, 4, PAL.red3);
    c.set(14, 4 + f, PAL.red3);
    outline(c);
    frames.push(c);
  }
  return { frames, ms: 900 };
}

/** A box of fat crayons on an upturned crate. "Professional crayons." */
function crayonBox() {
  const c = canvas(16, 18);
  groundShadow(c, 8, 16, 7, 2);
  box(c, 1, 7, 14, 3, 7, WOOD, { planks: 3 });
  // the tin, lid open
  c.rect(3, 4, 10, 4, '#c83a2a');
  c.hline(3, 12, 4, '#e86050');
  c.rect(3, 1, 10, 3, '#a02a1c');
  // crayons standing up in it, one of each colour, all worn blunt
  CRAYON.forEach((col, i) => {
    c.vline(4 + i * 2, 2 + (i % 2), 5, col);
    c.set(4 + i * 2, 1 + (i % 2), col);
  });
  // a scribble on the crate lid, testing the yellow
  c.line(3, 12, 7, 11, CRAYON[0]);
  c.line(7, 11, 10, 13, CRAYON[0]);
  outline(c);
  return c;
}

// ---------------------------------------------------------------------------
// Squawks

/** Squawks's padded basket: wicker, a tartan cushion. Drawn in front of him. */
function squawksBasket() {
  const c = canvas(16, 12);
  groundShadow(c, 8, 10, 7, 2);
  // the front half of the basket (he sits inside, behind this rim)
  c.ellipse(8, 7, 7, 4, WICKER.m);
  for (let x = 1; x < 16; x++) {
    for (let y = 4; y < 11; y++) {
      if (!c.alphaAt(x, y)) continue;
      if ((x + y) % 3 === 0) c.set(x, y, WICKER.d);
      else if ((x - y) % 4 === 0) c.set(x, y, WICKER.l);
    }
  }
  c.hline(2, 13, 4, WICKER.h);
  // the cushion's tartan edge peeking over the rim
  for (let x = 3; x < 13; x++) c.set(x, 3, x % 3 === 0 ? PLAID[3] : PLAID[1]);
  outline(c);
  return c;
}

// ---------------------------------------------------------------------------
// Breakfast (Frog Grog rations) and the list of failed beard remedies

/** Laid over the mess table: plates, hardtack and mugs of Frog Grog that bubble. */
function breakfastSpread() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const c = canvas(48, 14);
    // plates of hardtack
    for (const px of [5, 22, 39]) {
      c.ellipse(px, 9, 4, 2, '#e8e0d0');
      c.rect(px - 2, 7, 4, 2, '#d8b070');
    }
    // mugs of grog: a greasy film, and now and then a bubble
    for (const [i, mx] of [12, 29, 44].entries()) {
      c.rect(mx - 2, 3, 5, 6, '#8a8a9a');
      c.vline(mx - 2, 3, 8, '#b8b8c8');
      c.hline(mx - 2, mx + 2, 3, GROG.l);
      c.set(mx - 1, 3, '#d8c8f0'); // the film catches the light
      if ((i + f) % 2 === 0) {
        c.set(mx, 1, GROG.h);
        c.set(mx, 2, GROG.l);
      }
    }
    // a loaf, somewhat defeated
    c.ellipse(18, 5, 3, 2, '#c89050');
    outline(c);
    frames.push(c);
  }
  return { frames, ms: 650 };
}

/** The captain's list of remedies, every one crossed out. */
function remediesList() {
  const c = canvas(14, 18);
  c.rect(1, 1, 12, 16, PAPER.m);
  c.hline(1, 12, 1, PAPER.l);
  for (let i = 0; i < 7; i++) {
    const y = 3 + i * 2;
    c.hline(3, 10, y, '#6a5a48');
    c.line(2, y + 1, 11, y - 1, PAL.red3); // crossed out
  }
  c.set(6, 0, PAL.red3); // the nail
  outline(c);
  return c;
}

// ---------------------------------------------------------------------------
// The washroom

/** A half-barrel washtub full of grey water and hope. */
function washTub() {
  const c = canvas(32, 20);
  groundShadow(c, 16, 18, 15, 2);
  c.ellipse(16, 10, 14, 7, WOOD.b);
  c.ellipse(16, 9, 12, 5, '#7a9aa0');
  c.ellipse(13, 8, 5, 2, '#a8c8cc');
  c.hline(4, 28, 13, IRON.m);
  c.hline(5, 27, 15, IRON.d);
  // a scum ring, and a floating lemon half
  c.ellipseOutline(16, 9, 12, 5, '#b8b08a');
  c.ellipse(20, 9, 2, 1.5, '#e8d040');
  outline(c);
  return c;
}

/** A barrel basin with a polished tin "mirror" nailed above it. */
function washBasin() {
  const c = canvas(16, 30);
  groundShadow(c, 8, 28, 7, 2);
  cylinder(c, 8, 12, 28, 7, WOOD, { ry: 3, bands: [16, 23] });
  c.ellipse(8, 15, 5, 2, '#7a9aa0');
  // the tin mirror, dented, a warped reflection
  c.rect(3, 0, 10, 9, '#b8bcc8');
  c.rect(4, 1, 8, 7, '#d8dce8');
  c.line(5, 2, 8, 6, '#ffffff');
  c.set(10, 4, '#9a9aa8');
  outline(c);
  return c;
}

/** A shelf of everything that didn't work: soap, a vinegar jug, sand, herbs. */
function remedyShelf() {
  const c = canvas(32, 16);
  box(c, 0, 9, 32, 2, 3, LWOOD, { frame: false });
  // soap (worn to a sliver), vinegar jug, a pot of sand, herbs, a lemon
  c.rect(2, 7, 4, 2, '#e8e0c0');
  c.rect(9, 2, 5, 7, '#6a7a3a');
  c.rect(10, 1, 3, 1, '#8a6a4a');
  drawText(c, 'V', 10, 4, '#e8e0c0');
  c.rect(17, 5, 5, 4, '#b89a60');
  c.hline(17, 21, 5, '#d8c090');
  c.line(25, 8, 27, 2, '#4a7a2a');
  c.line(27, 8, 29, 3, '#6a9a3a');
  c.ellipse(30, 7, 1.5, 1.5, '#e8d040');
  outline(c);
  return c;
}

/** A crate of lemons, bought for the beard. The beard won. */
function lemonCrate() {
  const c = canvas(16, 16);
  groundShadow(c, 8, 14, 7, 2);
  box(c, 1, 5, 14, 3, 7, WOOD, { planks: 3 });
  for (let i = 0; i < 5; i++) c.ellipse(3 + i * 2.6, 5 + (i % 2), 1.6, 1.4, i === 3 ? '#b8a030' : '#e8d040');
  outline(c);
  return c;
}

/** A towel on a rail, grey where it used to be white. */
function towelRail() {
  const c = canvas(16, 16);
  c.hline(1, 14, 3, WOOD.d);
  c.rect(3, 3, 10, 10, '#c8c4b0');
  c.vline(3, 3, 12, '#e0dcc8');
  c.hline(3, 12, 8, '#a8a488');
  c.set(10, 11, '#d8c850');
  outline(c);
  return c;
}

/** A vent grate high in the washroom wall (the only other way out). */
function ventGrate() {
  const c = canvas(16, 14);
  c.rect(2, 2, 12, 10, '#2a2a34');
  for (let x = 3; x < 14; x += 2) c.vline(x, 2, 11, IRON.l);
  c.rect(2, 2, 12, 1, IRON.h);
  c.set(7, 1, IRON.d);
  outline(c);
  return c;
}

/** The washroom door from the crew quarters, with a plank sign. */
function doorWashroom() {
  const c = canvas(16, 32);
  c.rect(1, 6, 14, 26, DWOOD.b);
  for (let x = 3; x < 15; x += 4) c.vline(x, 6, 31, DWOOD.m);
  c.rect(1, 6, 14, 1, DWOOD.l);
  c.rect(11, 18, 2, 2, PAL.gold3);
  // the sign: WASH, and underneath, scratched in later: (MAYBE)
  c.rect(2, 9, 12, 7, LWOOD.l);
  drawText(c, 'WASH', 8, 10, INK, { center: true });
  outline(c);
  return c;
}

// ---------------------------------------------------------------------------
// On deck: the scuttle over the washroom, bedding, duty tools

/** A small deck scuttle over the washroom: a grating, or hauled open. */
function airScuttle(open) {
  const c = canvas(16, 16);
  c.rect(1, 3, 14, 11, DWOOD.d);
  if (open) {
    c.rect(3, 5, 10, 7, '#0e0c12');
    c.poly([[1, 3], [15, 3], [13, 0], [3, 0]], LWOOD.l); // the lid, thrown back
  } else {
    for (let y = 4; y < 13; y += 2) c.hline(2, 13, y, IRON.m);
    for (let x = 3; x < 14; x += 3) c.vline(x, 4, 12, IRON.d);
  }
  outline(c);
  return c;
}

/** A bedroll laid out on the deck, rumpled. */
function bedroll() {
  const c = canvas(16, 12);
  c.ellipse(8, 6, 7, 4, '#6a6a8a');
  c.ellipse(7, 5, 5, 2, '#8a8aaa');
  c.ellipse(3, 5, 2.5, 2, '#e8e0d0'); // the pillow end
  outline(c);
  return c;
}

/** A sleeper under a blanket on deck: one lump, one foot, one nightcap. */
function bedrollSleeper() {
  const c = canvas(32, 14);
  groundShadow(c, 16, 11, 14, 2);
  c.ellipse(17, 7, 13, 5, PLAID[1]);
  for (let x = 5; x < 30; x += 4) c.vline(x, 3, 11, PLAID[0]);
  c.ellipse(15, 5, 7, 2, PLAID[2]);
  c.ellipse(4, 7, 3.5, 3, '#e8e0d0');
  c.ellipse(4, 5, 2, 2, '#dc9c76');
  c.set(29, 6, '#dc9c76');
  outline(c);
  return c;
}

/** A pillow, gone yellow. Do not smell it. */
function pillowYellowProp() {
  const c = canvas(16, 10);
  c.ellipse(8, 5, 6.5, 3.5, '#e8d060');
  c.ellipse(6, 4, 3, 1.5, '#f8ec98');
  c.ellipse(10, 6, 2.5, 1.2, '#c8a830');
  outline(c);
  return c;
}

/** A water barrel full of Shark Duty tools: poles, paddles, a mop, a broom. */
function dutyTools() {
  const c = canvas(16, 30);
  groundShadow(c, 8, 28, 7, 2);
  cylinder(c, 8, 15, 28, 6, WOOD, { ry: 2, bands: [19, 25] });
  // handles sticking up at angles
  c.line(5, 16, 2, 0, '#8a6a3a');
  c.line(7, 16, 7, 2, '#a07a3a');
  c.rect(5, 0, 5, 3, '#8a6a3a'); // a paddle blade
  c.line(10, 16, 13, 3, '#8a6a3a');
  c.rect(12, 1, 4, 3, '#d8d0c0'); // a mop head
  c.line(9, 16, 11, 5, '#6a5a3a');
  c.hline(9, 13, 5, '#c8a860'); // a broom
  outline(c);
  return c;
}

/** A bucket, knocked over. */
function bucketOver() {
  const c = canvas(16, 12);
  c.poly([[3, 4], [11, 3], [12, 9], [4, 10]], WOOD.b);
  c.ellipse(12, 6, 2, 3, WOOD.d);
  c.hline(3, 11, 6, IRON.m);
  c.ellipse(6, 11, 4, 1, '#9bd3e680');
  outline(c);
  return c;
}

/** Garlic toast on a plate, on a crate, for the Grand Stenchmaster's energy. */
function toastCrate() {
  const c = canvas(16, 18);
  groundShadow(c, 8, 16, 7, 2);
  box(c, 1, 7, 14, 3, 7, WOOD, { planks: 3 });
  c.ellipse(8, 6, 6, 2, '#e8e0d0');
  c.poly([[4, 5], [9, 3], [11, 5], [6, 7]], '#d8a050');
  c.poly([[7, 5], [12, 4], [13, 6], [8, 7]], '#e8b860');
  c.set(8, 5, '#fff8e0');
  c.set(11, 5, '#6a9a2c');
  outline(c);
  return c;
}

// ---------------------------------------------------------------------------
// The hull, getting worse (port side rail overlays)

/** Bite marks in the rail: a scalloped chunk gone. */
function railBitten() {
  const c = canvas(16, 16);
  for (let i = 0; i < 4; i++) c.ellipse(4 + i * 3, 3, 1.6, 2.2, '#2a1a10');
  for (let i = 0; i < 4; i++) c.set(3 + i * 3, 6, '#c8b090');
  c.line(2, 10, 5, 12, '#6a4a2a');
  return c;
}

/** A gap where the rail used to be, with a rope strung across it. */
function railGap() {
  const c = canvas(16, 16);
  c.rect(3, 0, 10, 14, '#0e0c14c0');
  c.line(0, 4, 15, 6, '#c8a860');
  c.line(0, 5, 15, 7, '#8a6a3a');
  c.line(0, 10, 15, 11, '#c8a860');
  // splintered ends
  c.poly([[1, 0], [3, 0], [3, 5], [2, 3]], LWOOD.m);
  c.poly([[13, 0], [15, 0], [14, 4], [13, 6]], LWOOD.m);
  return c;
}

/** A patch labelled in chalk (PATCH, PATCH FOR PATCH, ...). */
function patchLabelled(n) {
  const c = canvas(16, 16);
  const w = 12 - (n - 1) * 1;
  for (let i = 0; i < n; i++) {
    const x = 2 + i * 2;
    const y = 2 + i * 2;
    c.rect(x, y, w - i * 2, 9 - i, i % 2 ? LWOOD.b : LWOOD.l);
    c.set(x, y, IRON.l);
    c.set(x + w - i * 2 - 1, y, IRON.l);
  }
  // chalk marks, one tally per layer
  for (let i = 0; i < n; i++) c.vline(3 + i * 2, 12, 14, '#f0ece0');
  outline(c);
  return c;
}

/** Emergency lashings: ropes braced across a weak stretch. */
function braceRopes() {
  const c = canvas(16, 16);
  c.line(0, 2, 15, 12, '#c8a860');
  c.line(0, 12, 15, 2, '#c8a860');
  c.line(1, 2, 15, 13, '#8a6a3a');
  c.rect(6, 5, 4, 4, '#8a6a3a');
  c.rect(7, 6, 2, 2, '#c8a860');
  return c;
}

/** Where the fresh repair was, a moment before the shark. */
function patchTorn() {
  const c = canvas(16, 16);
  c.rect(4, 3, 8, 9, '#0e0c14c0');
  c.poly([[3, 2], [7, 3], [5, 7]], LWOOD.l);
  c.poly([[12, 2], [13, 7], [10, 5]], LWOOD.l);
  c.poly([[5, 12], [9, 11], [7, 14]], LWOOD.b);
  c.set(6, 6, IRON.l);
  c.set(11, 9, IRON.l);
  outline(c);
  return c;
}

/** A board freshly nailed across the damage (post-frenzy repairs). */
function repairBoard() {
  const c = canvas(16, 16);
  c.rect(1, 4, 14, 6, LWOOD.h);
  c.hline(1, 14, 4, '#fff4e0');
  c.hline(1, 14, 9, LWOOD.b);
  for (const x of [2, 13]) {
    c.set(x, 5, IRON.l);
    c.set(x, 8, IRON.l);
  }
  outline(c);
  return c;
}

/** A crate of ship's biscuit in the hold: the last edible thing aboard. */
function biscuitCrate() {
  const c = canvas(16, 18);
  groundShadow(c, 8, 16, 7, 2);
  box(c, 1, 5, 14, 3, 9, WOOD, { planks: 3 });
  drawText(c, 'BISC', 8, 10, '#3a2a18', { center: true });
  outline(c);
  return c;
}

export const PHASE4_PROPS = {
  forecast_board: forecastBoard,
  crayon_box: crayonBox,
  squawks_basket: squawksBasket,
  breakfast_spread: breakfastSpread,
  remedies_list: remediesList,
  wash_tub: washTub,
  wash_basin: washBasin,
  remedy_shelf: remedyShelf,
  lemon_crate: lemonCrate,
  towel_rail: towelRail,
  vent_grate: ventGrate,
  door_washroom: doorWashroom,
  air_scuttle: () => airScuttle(false),
  air_scuttle_open: () => airScuttle(true),
  bedroll,
  bedroll_sleeper: bedrollSleeper,
  pillow_yellow: pillowYellowProp,
  duty_tools: dutyTools,
  bucket_over: bucketOver,
  toast_crate: toastCrate,
  rail_bitten: railBitten,
  rail_gap: railGap,
  patch_1: () => patchLabelled(1),
  patch_2: () => patchLabelled(2),
  patch_3: () => patchLabelled(3),
  brace_ropes: braceRopes,
  patch_torn: patchTorn,
  repair_board: repairBoard,
  biscuit_crate: biscuitCrate,
};
