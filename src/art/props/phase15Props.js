import { canvas, groundShadow, box, cylinder, WOOD, LWOOD, IRON, GOLD, INK } from './propKit.js';

/**
 * Props for Story Phase 15 (THE GREAT MELLOWING):
 *
 *   - the deck: the Skunk Weed mountain the Economic Anger Waft made of the
 *     Grand Tokens (stems, seeds, dust, the odd embarrassed leaf), then the
 *     same stock sorted into labelled crates (the ESPECIALLY SKUNKY one with
 *     its lid nailed down); the visitors' little boat (SECOND THOUGHTS), the
 *     safe corner at the bow (a sand bucket, water barrels, the sign, two
 *     folding chairs); a Bling Bling King token; Agnes's feathers;
 *   - the galley: the Mark II's valve, wire and horseshoe on the floor (it
 *     runs without them), the anti-commercial blanket ready, the Television
 *     Safety Protocol on the wall, snack wreckage after the munchies;
 *   - the old quarters: clean Cheap-O-Rama sash bedding laid on the floor as
 *     pads (HOLD MY SASH!), the Grand Pad, the old pillow that growls, the
 *     pillow that learned to roar (squash and stretch, a fold like a mouth),
 *     THE BASHFULNESS BRANCH (a compact purple and gold counter with a brass
 *     window, a tiny bell, and its sign: OPEN / flickering / CLOSING), the
 *     marks it leaves, Agnes the Second's perch, the captain's rules sheet;
 *   - the zone: NO BEARD JOINTS; the cabin: the loose floorboard (and what
 *     the waft left under it).
 * No flashing: the flicker is two calm frames.
 */
const SKUNK = { d: '#3a4a1e', m: '#5a6e2a', l: '#7a9038', h: '#a0b858', brown: '#6a5230', dust: '#9a9a5a' };
const SASH = { d: '#8a141c', m: '#c8242c', l: '#e8545a' };
const CRATE = { d: '#6a4a24', m: '#946a36', b: '#b0844a', l: '#c89c5e', h: '#dcb478' };
const BRANCH = { d: '#3a1e52', m: '#5a3278', b: '#74449a', l: '#9468b8', h: '#b48ad4' };
const PARCH = { d: '#b8a478', m: '#e0d0a4', l: '#f4ead0' };
const HEN = { d: '#6a3e1c', m: '#9a5e2a', l: '#c88a48' };
const BOAT = { d: '#9aa4ac', m: '#d0d8de', l: '#eef2f4', h: '#ffffff' };
const TEXT = '#3a2a1a';

// --- the deck -------------------------------------------------------------------------------------------------

/** The mountain: green and brown, mostly stems, seeds running down the sides. 3x2. */
function skunkMountain() {
  const c = canvas(48, 48);
  groundShadow(c, 24, 44, 23, 3);
  c.poly([[2, 44], [12, 18], [22, 8], [30, 12], [38, 22], [46, 44]], SKUNK.m);
  c.poly([[6, 44], [14, 24], [22, 14], [26, 20], [18, 44]], SKUNK.l);
  c.poly([[30, 30], [38, 24], [44, 44], [32, 44]], SKUNK.d);
  // stems, lots of stems
  for (let i = 0; i < 26; i++) {
    const x = 6 + ((i * 37) % 36);
    const y = 16 + ((i * 23) % 26);
    c.line(x, y, x + ((i % 3) - 1) * 3, y - 3, i % 4 ? SKUNK.brown : SKUNK.h);
  }
  // the odd embarrassed leaf
  for (const [x, y] of [[20, 12], [33, 26], [12, 32]]) { c.set(x, y, SKUNK.h); c.set(x + 1, y - 1, SKUNK.h); c.set(x - 1, y - 1, SKUNK.h); }
  // seeds running down the sides, and dust
  for (let i = 0; i < 18; i++) c.set(3 + ((i * 11) % 42), 40 + (i % 4), i % 2 ? '#c8b070' : SKUNK.dust);
  c.outline(INK);
  return c;
}

/** The same stock, sorted: STEMS, SEEDS, LEAF, DUST, and one crate with the lid nailed on. 3x2. */
function skunkCrates() {
  const c = canvas(48, 44);
  groundShadow(c, 24, 41, 23, 2);
  const crate = (x, y, w, h, label, lid = false) => {
    box(c, x, y, w, 3, h, CRATE, { planks: 3 });
    if (!lid) for (let i = 1; i < w - 1; i += 2) c.set(x + i, y + 1, i % 4 ? SKUNK.l : SKUNK.brown);
    else { c.hline(x, x + w - 1, y + 1, CRATE.d); c.set(x + 2, y + 1, IRON.h); c.set(x + w - 3, y + 1, IRON.h); }
    c.rect(x + 2, y + 5, w - 4, 3, PARCH.l);
    c.hline(x + 3, x + 2 + Math.min(w - 6, label), y + 6, TEXT);
  };
  crate(1, 6, 14, 12, 5); crate(17, 4, 14, 14, 5); crate(33, 8, 14, 10, 4);
  crate(4, 24, 13, 13, 4); crate(20, 22, 18, 16, 9, true); // ESPECIALLY SKUNKY
  for (const [x, y] of [[40, 30], [42, 34], [44, 28]]) c.set(x, y, SKUNK.dust);
  c.outline(INK);
  return c;
}

/** The visitors' little modern boat, SECOND THOUGHTS: white hull, a canvas canopy, two folding chairs, a cool box. 3x2. */
function leisureBoat() {
  // From above, beached across the deck at a slight angle: a little white motorboat, bow to the left.
  const c = canvas(48, 40);
  groundShadow(c, 25, 33, 23, 3);
  const hull = [[1, 20], [10, 9], [40, 7], [46, 10], [46, 28], [40, 31], [10, 30]];
  c.poly(hull, BOAT.m);
  c.poly([[4, 20], [12, 11], [39, 10], [43, 12], [43, 26], [39, 28], [12, 28]], BOAT.l); // the gunwale
  c.poly([[8, 20], [14, 14], [38, 13], [41, 15], [41, 24], [38, 26], [14, 26]], '#c8b890'); // the deck boards inside
  c.line(2, 20, 10, 10, BOAT.h); c.line(10, 10, 39, 8, BOAT.h);
  c.line(3, 21, 11, 29, '#4a7aa8'); c.line(11, 29, 40, 30, '#4a7aa8'); // the blue stripe (SECOND THOUGHTS)
  c.line(17, 14, 15, 26, '#9ad0f0'); c.line(18, 14, 16, 26, '#d8f0ff'); // windscreen
  c.rect(21, 15, 5, 4, '#c84a3a'); c.rect(21, 21, 5, 4, '#c84a3a'); // two seats
  c.rect(22, 16, 3, 2, '#e06a5a'); c.rect(22, 22, 3, 2, '#e06a5a');
  c.rect(30, 17, 5, 6, '#3a8ac8'); c.rect(30, 17, 5, 2, '#f0f0f0'); // the cool box
  c.rect(44, 15, 4, 9, IRON.d); c.rect(45, 16, 2, 7, IRON.m); // the outboard, which will not be going anywhere again
  c.line(38, 24, 41, 27, '#e8c050'); // a folding chair, folded
  c.outline(INK);
  return c;
}

function sandBucket() {
  const c = canvas(16, 18);
  groundShadow(c, 8, 16, 6, 1.5);
  cylinder(c, 8, 5, 15, 5, { d: '#7a2a1a', m: '#a83a24', b: '#c84a2e', l: '#e0644a', h: '#f08a6a' }, { ry: 2 });
  c.ellipse(8, 6, 4, 1.5, '#e0c890'); // sand
  c.hline(5, 11, 4, IRON.l); // handle
  c.outline(INK);
  return c;
}

/** SAFE CORNER. NO FLAME WITHIN FORTY FEET OF ANYTHING GRAND. */
function signSafeCorner() {
  const c = canvas(16, 30);
  c.vline(8, 14, 29, WOOD.d);
  c.rect(1, 2, 14, 13, '#f4ecd8');
  c.rect(1, 2, 14, 3, '#3a8a4a');
  for (const y of [7, 9, 11, 13]) c.hline(3, 12, y, TEXT);
  c.outline(INK);
  return c;
}

/** Two folding chairs, side by side, facing the sea. 2x1, walkable. */
function visitorChairs() {
  const c = canvas(32, 22);
  for (const x of [4, 20]) {
    c.rect(x, 9, 8, 2, '#e8c050'); c.rect(x, 3, 8, 5, '#e8c050');
    for (let i = 0; i < 8; i += 2) { c.set(x + i, 4, '#c84a3a'); c.set(x + i + 1, 6, '#c84a3a'); }
    c.line(x, 11, x + 7, 19, '#a8a8a8'); c.line(x + 7, 11, x, 19, '#a8a8a8');
  }
  c.outline(INK);
  return c;
}

/** A Bling Bling King token on the deck, a little message rolled up in it. */
function bbkToken() {
  const c = canvas(16, 10);
  c.ellipse(8, 6, 4, 2.5, GOLD.l);
  c.ellipse(8, 6, 2, 1.2, GOLD.d);
  c.rect(11, 3, 4, 2, '#f4ecd8');
  c.outline(INK);
  return c;
}

/** Brown feathers, in a line. */
function feathers() {
  const c = canvas(16, 10);
  for (const [x, y] of [[3, 6], [8, 4], [13, 7]]) { c.line(x - 2, y + 1, x + 2, y - 1, HEN.m); c.set(x, y, HEN.l); }
  c.outline(INK);
  return c;
}

// --- the galley -----------------------------------------------------------------------------------------------

/** The Mark II's valve, wire and Ned's lucky horseshoe, on the floor. The set runs without them. */
function mk2Parts() {
  const c = canvas(16, 10);
  c.ellipse(4, 6, 2, 3, '#d8d0c0'); c.set(4, 4, '#f0a040'); // the valve
  c.line(6, 7, 11, 5, '#3a3a3a'); c.line(11, 5, 13, 7, '#3a3a3a'); // the wire
  c.ellipseOutline(12, 4, 2, 2, IRON.l); c.set(12, 6, '#00000000'); // the horseshoe
  c.outline(INK);
  return c;
}

/** The anti-commercial blanket, folded, ready. */
function blanketReady() {
  const c = canvas(16, 12);
  box(c, 2, 4, 12, 3, 4, { d: '#2a4a6a', m: '#3a5a7a', b: '#4a6a8a', l: '#6a8aa8', h: '#8aa8c4' }, { frame: false });
  c.outline(INK);
  return c;
}

/** THE BROGATH TELEVISION SAFETY PROTOCOL, nailed to the galley wall. */
function tvProtocolSign() {
  const c = canvas(16, 22);
  c.rect(1, 3, 14, 16, PARCH.m);
  c.rect(1, 3, 14, 3, '#7a3a8a');
  for (let i = 0; i < 5; i++) c.hline(3, 10 + (i % 3), 8 + i * 2, TEXT);
  c.set(8, 3, IRON.h);
  c.outline(INK);
  return c;
}

/** Snack wreckage: cracker crumbs, a cheese rind, an empty pickle jar on its side. */
function snackWreckage() {
  const c = canvas(16, 10);
  for (const [x, y] of [[2, 7], [5, 8], [8, 6], [3, 5]]) c.set(x, y, '#e0c88a');
  c.ellipse(11, 6, 3, 1.5, '#e8c860');
  c.rect(6, 3, 3, 2, '#9ab868');
  c.outline(INK);
  return c;
}

// --- the old quarters ---------------------------------------------------------------------------------------------

/** Clean Cheap-O-Rama sashes, folded four deep for pads, with sash blankets and a rolled sash pillow. w tiles wide. */
function sashPad(w, { grand = false } = {}) {
  return () => {
    const c = canvas(w * 16, 14);
    const col = grand ? { d: '#9a7418', m: '#d8b032', l: '#f4dc6c' } : SASH;
    for (let i = 0; i < w; i++) {
      const x = i * 16;
      c.rect(x + 1, 4, 14, 8, col.m);
      c.hline(x + 1, x + 14, 4, col.l);
      c.hline(x + 3, x + 12, 8, grand ? '#7a3a8a' : GOLD.l); // HOLD MY SASH! (gold lettering)
      c.ellipse(x + 4, 4, 3, 2, col.l); // a sash pillow
    }
    c.outline(INK);
    return c;
  };
}

/** The last of the old pillows: yellowish, grey, growling. A fold like a mouth. (Two frames: it breathes.) */
function oldPillow() {
  const frames = [0, 1].map((f) => {
    const c = canvas(16, 12);
    c.ellipse(8, 7 - f, 6, 3 + f, '#c8c0a0');
    c.ellipse(6, 6 - f, 3, 1.5, '#dcd4b4');
    c.hline(5, 10, 8, '#6a6040'); // the mouth-fold
    c.outline(INK);
    return c;
  });
  return { frames, ms: 1400 };
}

/** The pillow that learned to roar: inflated, squashing and stretching, its fold opening. Never grotesque. */
function roaringPillow() {
  const frames = [0, 1, 2].map((f) => {
    const c = canvas(16, 18);
    groundShadow(c, 8, 16, 6, 1.5);
    const w = [7, 6, 7.5][f];
    const h = [4, 5.5, 3.5][f];
    c.ellipse(8, 14 - h, w, h, SASH.m);
    c.ellipse(6, 13 - h, w / 2, h / 2, SASH.l);
    c.hline(4, 11, 14 - h + 1, GOLD.l);
    const open = [1, 3, 2][f];
    c.rect(6, 14 - h + 2, 5, open, '#4a0e14'); // the fold, opening
    c.set(7, 14 - h + 2, '#f4f0e4'); c.set(9, 14 - h + 2, '#f4f0e4');
    c.outline(INK);
    return c;
  });
  return { frames, ms: 260 };
}

/**
 * THE BASHFULNESS BRANCH: a compact purple and gold counter (3 wide), a brass window in the middle, a tiny bell, and
 * its sign above. state: open | flicker | closing.
 */
function branchCounter(state) {
  const paint = (f) => {
    const c = canvas(48, 48);
    groundShadow(c, 24, 46, 23, 2);
    box(c, 0, 28, 48, 4, 12, BRANCH, { planks: 4 });
    c.hline(1, 46, 29, GOLD.l);
    // the brass window
    for (let x = 2; x < 47; x += 4) if (x < 18 || x > 29) c.vline(x, 16, 28, GOLD.l);
    c.hline(0, 17, 16, GOLD.h); c.hline(30, 47, 16, GOLD.h);
    c.vline(18, 16, 28, GOLD.d); c.vline(29, 16, 28, GOLD.d);
    // the sign, hanging from nothing
    const lit = state === 'open' || (state === 'flicker' && f === 0);
    c.rect(4, 2, 40, 11, state === 'closing' ? '#6a1e2a' : BRANCH.d);
    c.rect(5, 3, 38, 9, lit ? GOLD.m : state === 'closing' ? '#c84a3a' : '#7a6a3a');
    c.hline(8, 39, 6, lit ? '#3a1e52' : '#5a4a3a');
    c.hline(10, state === 'closing' ? 26 : 37, 9, lit ? '#3a1e52' : '#5a4a3a');
    if (state === 'flicker' && f === 1) for (let x = 6; x < 42; x += 5) c.set(x, 7, '#a89a6a');
    c.outline(INK);
    return c;
  };
  if (state === 'open') return paint(0);
  return { frames: [paint(0), paint(1)], ms: state === 'flicker' ? 700 : 1200 };
}

/** The tiny bell (DING). */
function branchBell() {
  const c = canvas(16, 30);
  c.ellipse(8, 15, 3, 2, GOLD.l);
  c.rect(5, 15, 7, 1, GOLD.d);
  c.set(8, 12, GOLD.h);
  c.outline(INK);
  return c;
}

/** Where the branch was: six little scorch marks, a dent, the smell of coins. */
function branchMarks() {
  const c = canvas(48, 12);
  c.rect(3, 4, 42, 5, '#00000030');
  for (const x of [5, 12, 19, 28, 35, 42]) { c.ellipse(x, 6, 2, 1.2, '#3a2a1a'); c.set(x, 5, '#6a4a2a'); }
  c.set(24, 7, GOLD.l);
  return c;
}

/** A chalk X on the deck: where something is meant to go (the safe corner, chapter 175). */
function chalkX() {
  const c = canvas(16, 16);
  c.ellipse(8, 8, 7, 7, '#00000022');
  for (let i = 0; i < 11; i++) {
    for (const d of [0, 1]) {
      c.set(3 + i + d, 3 + i, '#fbf8ec');
      c.set(13 - i - d, 3 + i, '#fbf8ec');
    }
    if (i % 3 === 1) { c.set(3 + i, 4 + i, '#d8d2c0'); c.set(13 - i, 4 + i, '#d8d2c0'); }
  }
  // a chalk ring round it
  for (let a = 0; a < 24; a++) if (a % 3) c.set(Math.round(8 + 7 * Math.cos((a / 24) * Math.PI * 2)), Math.round(8 + 7 * Math.sin((a / 24) * Math.PI * 2)), '#ece6d2');
  return c;
}

/** A chalk outline on the floor, the size of a sash pad: where the bedding goes (the Grand Nap, chapter 178). */
function chalkPad() {
  const c = canvas(48, 16);
  c.rect(2, 3, 44, 10, '#00000014');
  for (let x = 2; x < 46; x++) if (x % 4 !== 3) { c.set(x, 3, '#f6f2e4'); c.set(x, 12, '#f6f2e4'); }
  for (let y = 3; y < 13; y++) if (y % 4 !== 2) { c.set(2, y, '#f6f2e4'); c.set(45, y, '#f6f2e4'); }
  for (let i = 0; i < 5; i++) { c.set(22 + i, 6 + i, '#ece6d2'); c.set(26 - i, 6 + i, '#ece6d2'); } // a little X in the middle
  return c;
}

/** Agnes the Second's perch: a sash folded in a little crate, a feather or two. */
function agnesPerch() {
  const c = canvas(16, 16);
  groundShadow(c, 8, 14, 6, 1.5);
  box(c, 2, 5, 12, 3, 6, CRATE);
  c.rect(3, 5, 10, 3, SASH.m);
  c.set(5, 4, HEN.m); c.set(11, 6, HEN.l);
  c.outline(INK);
  return c;
}

/** THE CAPTAIN'S RULES, on a sheet of its own, in his capitals, under Pete's. */
function captainsRules() {
  const c = canvas(16, 24);
  c.rect(3, 6, 11, 14, '#f4ecd8');
  for (let i = 0; i < 6; i++) c.hline(5, 11 - (i % 2), 8 + i * 2, '#7a1a1a');
  c.set(8, 6, IRON.h);
  c.outline(INK);
  return c;
}

/** In the zone: NO BEARD JOINTS. (Signed.) */
function signNoBeard() {
  const c = canvas(16, 20);
  c.rect(2, 4, 12, 11, '#f4ecd8');
  c.ellipse(8, 10, 4, 4, '#7a5a3a'); // a beard
  c.line(3, 15, 13, 5, '#c83a2a'); c.line(3, 14, 13, 4, '#c83a2a'); // crossed out
  c.outline(INK);
  return c;
}

// --- the captain's cabin ----------------------------------------------------------------------------------------------

function looseFloorboard({ weed = false } = {}) {
  const c = canvas(16, 8);
  c.rect(1, 3, 14, 3, LWOOD.l);
  c.hline(1, 14, 3, LWOOD.h);
  c.hline(1, 14, 5, LWOOD.d);
  c.set(2, 4, IRON.h); c.set(13, 4, IRON.h);
  if (weed) for (const [x, y] of [[5, 2], [7, 1], [9, 2], [11, 1]]) { c.set(x, y, SKUNK.l); c.set(x, y + 1, SKUNK.brown); }
  c.outline(INK);
  return c;
}

export const PHASE15_PROPS = {
  skunk_mountain: skunkMountain,
  skunk_crates: skunkCrates,
  leisure_boat: leisureBoat,
  sand_bucket: sandBucket,
  sign_safe_corner: signSafeCorner,
  visitor_chairs: visitorChairs,
  bbk_token: bbkToken,
  hen_feathers: feathers,
  mk2_parts: mk2Parts,
  blanket_ready: blanketReady,
  tv_protocol_sign: tvProtocolSign,
  snack_wreckage: snackWreckage,
  sash_pad: sashPad(3),
  sash_pad_small: sashPad(2),
  sash_pad_grand: sashPad(3, { grand: true }),
  old_pillow: oldPillow,
  roaring_pillow: roaringPillow,
  branch_counter_open: () => branchCounter('open'),
  branch_counter_flicker: () => branchCounter('flicker'),
  branch_counter_closing: () => branchCounter('closing'),
  branch_bell: branchBell,
  branch_marks: branchMarks,
  chalk_x: chalkX,
  chalk_pad: chalkPad,
  agnes_perch: agnesPerch,
  captains_rules_sheet: captainsRules,
  sign_no_beard: signNoBeard,
  loose_floorboard: () => looseFloorboard(),
  loose_floorboard_weed: () => looseFloorboard({ weed: true }),
};
