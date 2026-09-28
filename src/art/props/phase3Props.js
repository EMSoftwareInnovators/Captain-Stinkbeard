import { canvas, box, cylinder, outline, groundShadow, WOOD, LWOOD, IRON, INK, PAL } from './propKit.js';
import { drawText } from '../font/drawText.js';
import { barrel } from './deckProps.js';

/**
 * Props for Story Phase 3 (The Grand Stenchmaster): Garrick's soapbox and
 * Stench Log, the amendment nailed to the mainmast, mustard-yellow wood,
 * the grog barrel that became Frog Grog, sweating rope, the shark damage and
 * its patch, the bean pot, a bitten rowboat and its empty davits.
 */

const GROG = { d: '#3a4a1c', m: '#5a7a2a', b: '#7a9a38', l: '#a8c050', h: '#d0e070' };
const MUSTARD = ['#d8b02078', '#b0901880', '#e8c84060'];

// ---------------------------------------------------------------------------
// Garrick's office

function soapboxBarrel() {
  // A stout barrel stood on end with a plank across the top to stand on.
  const c = canvas(18, 22);
  groundShadow(c, 9, 20, 8, 2);
  cylinder(c, 9, 4, 20, 7, WOOD, { ry: 3, bands: [9, 16] });
  box(c, 0, 1, 18, 3, 3, LWOOD, { frame: false });
  c.hline(0, 17, 1, LWOOD.h);
  // chalked on the staves: a crown over a nose
  c.set(8, 12, '#f0e8d0'); c.set(10, 12, '#f0e8d0'); c.hline(8, 10, 11, '#f0e8d0');
  c.set(9, 14, '#f0e8d0'); c.set(9, 15, '#f0e8d0'); c.set(10, 15, '#f0e8d0');
  outline(c);
  return c;
}

function stenchLogStand() {
  // A crate for a lectern, the great ledger open on it, a quill in the ink,
  // and a clothes peg clipped to the corner (for the author's nose).
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const c = canvas(16, 24);
    groundShadow(c, 8, 22, 7, 2);
    box(c, 1, 10, 14, 4, 9, LWOOD, { planks: 3 });
    // ledger: dark cover, two pale pages with lines of cramped writing
    c.poly([[0, 9], [8, 5], [16, 9], [8, 12]], '#5a2a1a');
    c.poly([[1, 8], [8, 5], [8, 10]], '#f0e6c8');
    c.poly([[15, 8], [8, 5], [8, 10]], '#e4d8b8');
    for (let i = 0; i < 3; i++) {
      c.line(3, 8 - i + 1, 6, 7 - i, '#6a5a48');
      c.line(10, 7 - i, 13, 8 - i + 1, '#6a5a48');
    }
    c.vline(8, 5, 10, '#8a6a4a');
    // inkpot and quill
    c.rect(12, 3, 3, 3, INK);
    c.line(13, 3, 15 - f, 0, '#f4f0e8');
    // the clothes peg
    c.rect(1, 4, 2, 4, '#c8a878');
    c.set(1, 4, '#e8c898');
    // a faint whiff rising off the pages
    c.set(6 + f, 2, '#c8d45090');
    c.set(5 + f, 0, '#c8d45060');
    outline(c);
    frames.push(c);
  }
  return { frames, ms: 700 };
}

function noticeNailed() {
  // The "amendment", nailed to the mainmast at eye height.
  const c = canvas(14, 20);
  c.poly([[1, 4], [13, 3], [12, 17], [2, 18]], '#f0e6c8');
  c.hline(2, 12, 4, '#fff8e8');
  c.set(7, 4, IRON.h);
  c.set(7, 5, IRON.b);
  drawText(c, 'ST', 3, 7, PAL.red3, {});
  for (let y = 12; y < 17; y += 2) c.hline(3, 11, y, '#6a5a48');
  c.line(3, 8, 11, 8, '#2a2030');
  outline(c);
  return c;
}

// ---------------------------------------------------------------------------
// The ship, changing

function yellowStain(w, h, seed) {
  const c = canvas(w, h);
  const cx = w / 2;
  const cy = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot((x - cx) / (w / 2), (y - cy) / (h / 2)) + Math.sin(x * 0.7 + seed) * 0.1 + Math.cos(y * 1.1 + seed * 2) * 0.1;
      // Follows the planking: the grain soaks it up in stripes.
      const plank = y % 4 === 3 ? 1 : 0;
      if (d < 0.7) c.set(x, y, plank ? MUSTARD[1] : MUSTARD[0]);
      else if (d < 0.95 && (x + y + seed) % 3) c.set(x, y, MUSTARD[2]);
    }
  }
  return c;
}

function woodYellowWall() {
  // Hold planking gone mustard where the cloud came through the door.
  const c = canvas(32, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 32; x++) {
      const d = Math.abs(x - 16) / 16 + y / 40;
      if (d > 0.95) continue;
      c.set(x, y, (y % 5 === 4) ? '#8a7020a0' : (x * 3 + y) % 7 === 0 ? '#e0c85070' : '#c0a03080');
    }
  }
  return c;
}

function hullBreach() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const c = canvas(16, 18);
    // the rail bitten through: splintered stumps, a ragged hole, spray
    c.rect(2, 2, 12, 5, WOOD.b);
    c.hline(2, 13, 2, WOOD.h);
    c.poly([[4, 5], [7, 3], [9, 6], [12, 4], [12, 14], [4, 14]], '#1a1420');
    for (const [x, y] of [[4, 5], [7, 3], [9, 6], [12, 4]]) c.set(x, y, WOOD.l);
    c.line(3, 6, 1, 11, WOOD.m);
    c.line(13, 6, 15, 10, WOOD.m);
    // tooth marks
    for (const x of [5, 8, 11]) c.set(x, 7, '#f4f0e8');
    // sea spray coming through
    const spray = f ? [[6, 10], [9, 12], [7, 13], [10, 9]] : [[7, 11], [8, 9], [6, 13], [10, 12]];
    for (const [x, y] of spray) c.set(x, y, '#9bd3e6');
    c.set(8, 11 + f, '#e6f5f8');
    outline(c);
    frames.push(c);
  }
  return { frames, ms: 260 };
}

function hullPatch() {
  // Fresh planks nailed over the bite, pale against the old rail.
  const c = canvas(16, 18);
  c.rect(2, 2, 12, 5, WOOD.b);
  c.hline(2, 13, 2, WOOD.h);
  box(c, 1, 4, 14, 1, 4, LWOOD);
  box(c, 2, 9, 13, 1, 4, LWOOD);
  for (const [x, y] of [[2, 6], [13, 6], [3, 11], [13, 11]]) c.set(x, y, IRON.h);
  // one nail bent over, as nails will be
  c.set(8, 5, IRON.l);
  c.set(9, 4, IRON.l);
  c.set(6, 13, '#8a7020');
  outline(c);
  return c;
}

function plankPile() {
  const c = canvas(18, 16);
  groundShadow(c, 9, 14, 8, 2);
  for (let i = 0; i < 4; i++) box(c, 1 + (i % 2), 10 - i * 3, 16, 1, 2, i % 2 ? LWOOD : WOOD);
  // hammer and a scatter of nails on top
  c.rect(4, 0, 6, 2, IRON.b);
  c.line(7, 2, 12, 3, WOOD.m);
  c.set(14, 1, IRON.h);
  c.set(15, 2, IRON.h);
  outline(c);
  return c;
}

function grogBarrelSealed() {
  const c = barrel({ mark: 'rum' });
  // pitch-sealed bung, a wax seal, "GROG" chalked on
  c.rect(6, 1, 4, 2, '#1a1420');
  c.set(12, 9, PAL.red3);
  c.set(12, 10, PAL.red2);
  return c;
}

function grogBarrelTapped() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const c = barrel({ mark: 'rum' });
    // the head knocked in: greenish-yellow, bubbling
    c.ellipse(7.5, 3, 5, 2, GROG.m);
    c.ellipse(7, 2.5, 3.5, 1.2, GROG.l);
    const b = [[5, 3], [9, 2], [7, 4]][f];
    c.set(b[0], b[1], GROG.h);
    c.set(b[0] + 1, b[1] - 1, '#f0f8c0');
    // a tap with a drip
    c.rect(13, 12, 3, 2, GOLD_TAP);
    if (f === 1) c.set(14, 15, GROG.l);
    frames.push(c);
  }
  return { frames, ms: 380 };
}

const GOLD_TAP = '#b58a30';

function frogGrogCask() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const c = canvas(18, 26);
    groundShadow(c, 9, 24, 8, 2);
    cylinder(c, 9, 4, 23, 7.5, WOOD, { ry: 3, bands: [9, 18] });
    c.ellipse(9, 7, 5.5, 2.2, GROG.m);
    c.ellipse(8.5, 6.5, 4, 1.4, GROG.l);
    const b = [[7, 6], [11, 7], [9, 5]][f];
    c.set(b[0], b[1], GROG.h);
    // a painted frog on the staves, grinning, and the new name
    c.ellipse(9, 14, 3.5, 2.5, GROG.b);
    c.set(7, 12, '#f4f0e8'); c.set(11, 12, '#f4f0e8');
    c.set(7, 12, INK);
    c.set(11, 12, INK);
    c.hline(8, 10, 15, GROG.d);
    // a bubble rising off it
    c.set(9 + (f - 1), 1 + f, '#e0f09080');
    outline(c);
    frames.push(c);
  }
  return { frames, ms: 420 };
}

function grogLashings() {
  // Where the barrel stood: rope lashings, empty, and a green-yellow stain.
  const c = canvas(16, 14);
  c.ellipse(8, 9, 7, 4, '#a8c05060');
  c.ellipse(8, 9, 4, 2, '#7a9a3870');
  c.line(1, 4, 6, 10, PAL.rope2);
  c.line(15, 4, 10, 10, PAL.rope2);
  c.ellipseOutline(8, 9, 5, 3, PAL.rope3);
  return c;
}

function frogMugs() {
  // A crate turned into a bar: tankards of Frog Grog, one knocked over.
  const c = canvas(16, 22);
  groundShadow(c, 8, 20, 7, 2);
  box(c, 1, 9, 14, 4, 8, LWOOD, { planks: 4 });
  for (const x of [2, 7]) {
    c.rect(x, 3, 4, 6, '#8a8a98');
    c.rect(x + 1, 3, 2, 1, GROG.l);
    c.set(x + 4, 5, '#8a8a98');
  }
  c.rect(11, 7, 5, 3, '#8a8a98');
  c.set(10, 8, GROG.l);
  c.set(9, 9, GROG.m);
  outline(c);
  return c;
}

function ropeCoilDamp() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const c = canvas(16, 14);
    for (let r = 6; r > 1; r -= 1.5) c.ellipseOutline(8, 6, r + 0.5, r * 0.7, r % 3 < 1.5 ? '#b0a060' : '#8a7a40');
    c.ellipse(8, 6, 1.5, 1, PAL.rope1);
    c.line(13, 7, 15, 10, '#8a7a40');
    // beads of something that is not water
    const drip = [[4, 10], [11, 9], [8, 11]][f];
    c.set(drip[0], drip[1], '#d8d060');
    c.set(drip[0], drip[1] + 1, '#e8e890');
    c.set(3 + f * 3, 5, '#f0f0a0');
    outline(c);
    frames.push(c);
  }
  return { frames, ms: 520 };
}

function shavingMirror() {
  const c = canvas(14, 20);
  c.ellipse(7, 8, 6, 7, GOLD_TAP);
  c.ellipse(7, 8, 4.5, 5.5, '#9ab8c8');
  c.line(4, 5, 6, 3, '#e8f4ff');
  // a fogged patch that wasn't there before
  c.ellipse(8, 11, 2.5, 2, '#c8d45090');
  c.rect(6, 15, 2, 4, WOOD.m);
  c.rect(3, 18, 8, 2, WOOD.b);
  outline(c);
  return c;
}

function chartTable() {
  const c = canvas(18, 24);
  groundShadow(c, 9, 22, 8, 2);
  c.rect(3, 12, 2, 10, WOOD.b);
  c.rect(13, 12, 2, 10, WOOD.b);
  box(c, 0, 6, 18, 5, 3, WOOD);
  // the chart, weighted with a dagger and a mug; a yellow blot creeping in
  c.poly([[1, 6], [16, 5], [17, 10], [2, 11]], '#f0e6c8');
  c.line(4, 8, 13, 7, '#6a8ab8');
  c.line(6, 9, 9, 6, '#6a8ab8');
  c.ellipse(13, 8, 2.5, 1.5, '#d8b83a');
  c.set(14, 8, '#b8982a');
  c.set(3, 7, INK);
  c.rect(15, 3, 2, 3, '#8a8a98');
  outline(c);
  return c;
}

function beanPot() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const c = canvas(16, 18);
    groundShadow(c, 8, 16, 6, 2);
    c.ellipse(8, 11, 6, 5, IRON.m);
    c.ellipse(7, 10, 4, 3, IRON.b);
    c.ellipse(8, 7, 5.5, 2, '#6a3418');
    for (const [x, y] of [[6, 7], [9, 6], [8, 8], [11, 7]]) c.set(x, y, '#b86a3a');
    c.hline(1, 3, 9, IRON.l);
    c.hline(13, 15, 9, IRON.l);
    // steam
    c.set(6 + f, 3, '#e8e4dc80');
    c.set(9 - f, 1, '#e8e4dc60');
    outline(c);
    frames.push(c);
  }
  return { frames, ms: 600 };
}

function rowboatBitten() {
  const c = canvas(32, 20);
  groundShadow(c, 16, 18, 15, 2);
  c.poly([[1, 9], [31, 9], [27, 17], [5, 17]], WOOD.b);
  c.poly([[3, 9], [29, 9], [26, 14], [6, 14]], WOOD.d);
  c.hline(1, 31, 9, WOOD.h);
  c.rect(10, 9, 2, 6, WOOD.m);
  // one oar left, and a semicircle of tooth marks out of the stern
  c.line(4, 6, 12, 12, WOOD.l);
  for (let a = 0; a < Math.PI; a += 0.4) c.set(Math.round(28 + Math.cos(a) * 3), Math.round(11 + Math.sin(a) * 3), '#1a1420');
  c.set(26, 12, '#f4f0e8');
  c.set(29, 13, '#f4f0e8');
  drawText(c, 'GG', 15, 10, '#f4e8cc', { spacing: 1 });
  outline(c);
  return c;
}

function davitEmpty() {
  // The rowboat's davits with nothing hanging from them.
  const c = canvas(32, 22);
  for (const x of [5, 25]) {
    c.rect(x, 4, 2, 16, WOOD.b);
    c.line(x + 1, 4, x - 3, 0, WOOD.m);
    c.line(x - 3, 1, x - 3, 10, PAL.rope2);
  }
  c.ellipse(16, 16, 10, 3, '#9bd3e640');
  outline(c);
  return c;
}

function perchBlanket() {
  // Squawks's perch, now with a folded blanket nest on a crate beside it.
  const c = canvas(16, 26);
  groundShadow(c, 8, 24, 6, 2);
  c.rect(7, 6, 2, 18, WOOD.b);
  c.rect(4, 22, 8, 2, WOOD.m);
  c.hline(2, 13, 6, WOOD.l);
  c.hline(2, 13, 7, WOOD.d);
  c.ellipse(8, 18, 6, 3, '#6a4a8a');
  c.ellipse(7, 17, 4, 2, '#8a6aaa');
  for (let x = 3; x < 13; x += 3) c.set(x, 18, '#c8b8e0');
  outline(c);
  return c;
}

export const PHASE3_PROPS = {
  soapbox_barrel: soapboxBarrel,
  stench_log_stand: stenchLogStand,
  notice_nailed: noticeNailed,
  stain_yellow: () => yellowStain(16, 14, 3),
  stain_yellow_big: () => yellowStain(32, 26, 7),
  wood_yellow_wall: woodYellowWall,
  hull_breach: hullBreach,
  hull_patch_fresh: hullPatch,
  plank_pile: plankPile,
  grog_barrel_sealed: grogBarrelSealed,
  grog_barrel_tapped: grogBarrelTapped,
  frog_grog_cask: frogGrogCask,
  grog_lashings: grogLashings,
  frog_mugs: frogMugs,
  rope_coil_damp: ropeCoilDamp,
  shaving_mirror: shavingMirror,
  chart_table: chartTable,
  bean_pot: beanPot,
  rowboat_bitten: rowboatBitten,
  davit_empty: davitEmpty,
  perch_blanket: perchBlanket,
};
