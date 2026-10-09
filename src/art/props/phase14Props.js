import { canvas, groundShadow, box, cylinder, WOOD, LWOOD, IRON, GOLD, INK, PAL } from './propKit.js';

/**
 * Props for Story Phase 14 (RETURN OF BROGATH):
 *
 *   - the hold: the treasure-room door with five signs (and with its planks
 *     coming off), the little cupboard door under the stairs, BROGATH NEVER
 *     GOES NEAR THE TREASURE ROOM at the foot of them;
 *   - the old quarters: the scorch ring and the cracked porthole from the
 *     first eruption, the containment corner's barricade (the card table
 *     tipped on its side, sash blankets hung as a wall), the Brogath Rules
 *     pinned to it, one sheet more each stage, and a napkin on the floor;
 *   - the galley: the bean breakfast (one modular bowl, six fillings), the
 *     Grand Currency crate (wrapped, then open and spilling), oat sacks,
 *     spilt oats and the oats left in the cracks for good;
 *   - the deck: THE GRAND STENCHMASTER'S GRAND BANK AND GRAND TRUST (counter
 *     with brass bars, bell, forms, velvet rope, sign, and a vault door set
 *     in thin air), and Grand Tokens in the scuppers;
 *   - the Fart-Free Zone: mops and a bucket at first, then a mattress,
 *     blankets, clean sashes and rags on the walls, pillows, hardtack, a jug
 *     of Frog Grog, a candle on a little table, the cards, and the sign.
 */
const SASH = { d: '#8a141c', m: '#c8242c', l: '#e8545a', h: '#f4888a' };
const TOKEN = { d: '#9a7418', m: '#d8b032', l: '#f4dc6c', h: '#fff4b0' };
const PARCH = { d: '#b8a478', m: '#e0d0a4', l: '#f4ead0' };
const BURLAP = { d: '#7a5a32', m: '#a8844e', l: '#c8a86c', h: '#dcc28a' };
const OAT = ['#e8d8a0', '#d8c080', '#f4ecc4'];
const FELT = { d: '#1e4a2a', m: '#2e6a3a', l: '#4a8a52' };
const VAULT = { d: '#3a3e48', m: '#6a6e7a', b: '#8a8e9a', l: '#b4b8c4', h: '#dce0e8' };
const VELVET = { d: '#5a0e18', m: '#8a1a28', l: '#b83040' };
const CARD = { d: '#8a6a3a', m: '#b89058', l: '#d8b47a', h: '#ecd0a0' };

// --- the hold ---------------------------------------------------------------------------------------------

/** The treasure-room door's signs: DO NOT OPEN / YES, SERIOUSLY / BAD CLOUD / DANGEROUS CLOUD INSIDE / CAPTAIN: THIS MEANS YOU, over two planks (planks: how many are still on). */
function treasureSignsFive(planks = 2) {
  const c = canvas(16, 30);
  // the planks across the door, under the signs
  if (planks >= 1) { c.rect(0, 9, 16, 3, WOOD.l); c.hline(0, 15, 11, WOOD.d); c.set(2, 10, IRON.h); c.set(13, 10, IRON.h); }
  if (planks >= 2) { c.rect(0, 19, 16, 3, WOOD.l); c.hline(0, 15, 21, WOOD.d); c.set(2, 20, IRON.h); c.set(13, 20, IRON.h); }
  if (planks < 2) for (const [x, y] of [[2, 20], [13, 20], [7, 19]]) c.set(x, y, IRON.m); // nail holes
  c.rect(1, 1, 14, 5, '#f0e6c8'); c.hline(2, 13, 3, '#c83a2a'); // DO NOT OPEN
  c.rect(2, 7, 12, 4, '#e8e0d0'); c.hline(3, 12, 9, '#2a2a3a'); // YES, SERIOUSLY
  c.rect(0, 13, 8, 5, CARD.m); for (const [x, y] of [[1, 15], [3, 14], [5, 16], [6, 15]]) c.set(x, y, '#3a1a10'); // BAD CLOUD (clawprint)
  c.rect(8, 12, 8, 6, '#f4dc6c'); c.poly([[12, 13], [14, 16], [10, 16]], '#2a2a2a'); c.set(12, 15, '#f4dc6c'); // DANGEROUS CLOUD INSIDE (a hazard triangle)
  c.rect(1, 23, 14, 5, '#f4ecd8'); c.hline(2, 12, 25, '#c83a2a'); c.hline(2, 12, 27, '#c83a2a'); // CAPTAIN: THIS MEANS YOU (underlined)
  for (const [x, y] of [[1, 1], [14, 1], [2, 7], [13, 7], [8, 12], [15, 12], [1, 23], [14, 23]]) c.set(x, y, IRON.h);
  c.outline(INK);
  return c;
}

/** The little cupboard door under the hold stairs, half the height of a man. A knob. A crack of candlelight, later. */
function nookDoor() {
  const c = canvas(16, 22);
  c.rect(2, 8, 12, 14, WOOD.m);
  for (let x = 3; x < 13; x += 3) c.vline(x, 9, 20, WOOD.d);
  c.hline(2, 13, 8, WOOD.h);
  c.rect(1, 7, 14, 1, LWOOD.d); // the lintel (the underside of a stair)
  c.set(11, 15, GOLD.l); c.set(11, 16, GOLD.d); // knob
  c.hline(3, 12, 21, '#ffc070'); // a line of light under it
  c.outline(INK);
  return c;
}

/** BROGATH NEVER GOES NEAR THE TREASURE ROOM. (THIS IS FOR HIS OWN GOOD.) On a board, on the stair rail. */
function signBrogathNever() {
  const c = canvas(16, 22);
  c.vline(7, 10, 21, WOOD.d); c.vline(8, 10, 21, WOOD.m);
  c.rect(0, 1, 16, 10, '#f0e6c8');
  c.hline(1, 14, 3, '#c83a2a'); c.hline(1, 12, 5, '#c83a2a'); c.hline(2, 14, 7, '#2a2a3a');
  c.hline(4, 11, 9, '#7a6a5a'); // (this is for his own good)
  c.ellipse(13, 7, 1.5, 1.5, '#6a4a8a'); c.line(11, 9, 15, 5, '#c83a2a'); // a little cardboard Brogath, crossed out
  c.outline(INK);
  return c;
}

// --- the old quarters -------------------------------------------------------------------------------------

/** Scorched floorboards in a ring where he stood the night he came back. */
function scorchRing() {
  const c = canvas(48, 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 48; x++) {
    const nx = (x - 24) / 22;
    const ny = (y - 18) / 12;
    const r = Math.sqrt(nx * nx + ny * ny);
    if (r > 0.62 && r < 1) c.set(x, y, (x * 7 + y * 3) % 5 === 0 ? '#2a1c12a0' : '#4a3018a0');
    else if (r > 0.5 && r < 0.62 && (x + y) % 3 === 0) c.set(x, y, '#c8b04070');
  }
  return c;
}

/** The porthole cracked in the first eruption, a sash pillow stuffed in it (red, with an embroidered nose). */
function portholeCracked() {
  const c = canvas(16, 16);
  c.ellipse(8, 8, 6, 6, IRON.m);
  c.ellipse(8, 8, 4.5, 4.5, '#3a4a5e');
  c.line(5, 5, 11, 10, '#dce8f0'); c.line(8, 8, 6, 12, '#dce8f0');
  c.ellipse(9, 9, 3, 2.5, SASH.m); c.set(9, 9, '#f0b090'); // the pillow, and its nose
  c.outline(INK);
  return c;
}

/** The card table, tipped on its side across the corner, legs out toward Brogath. */
function barricadeTable() {
  const c = canvas(32, 24);
  groundShadow(c, 16, 22, 15, 2);
  c.rect(1, 6, 30, 16, WOOD.m); // the top, standing on edge, seen from underneath
  c.hline(1, 30, 6, WOOD.h); c.hline(1, 30, 21, WOOD.d);
  for (let x = 4; x < 30; x += 6) c.vline(x, 7, 20, WOOD.b);
  c.rect(3, 2, 2, 5, WOOD.d); c.rect(27, 2, 2, 5, WOOD.d); // legs, pointing up and out
  c.rect(3, 0, 2, 2, WOOD.l); c.rect(27, 0, 2, 2, WOOD.l);
  for (const [x, y] of [[8, 16], [20, 12], [24, 18]]) c.set(x, y, '#e8e0d0'); // a playing card, stuck
  c.outline(INK);
  return c;
}

/** Sash blankets hung from a line across the corner: a curtain is not a wall, it's a feeling of a wall. */
function blanketWall() {
  const c = canvas(48, 30);
  c.hline(0, 47, 1, PAL.rope2);
  for (let i = 0; i < 3; i++) {
    const x0 = 1 + i * 16;
    const col = i === 1 ? { ...SASH, m: '#b81e28' } : SASH;
    c.rect(x0, 2, 14, 27, col.m);
    for (let y = 4; y < 28; y += 4) c.hline(x0, x0 + 13, y, col.d);
    c.vline(x0, 2, 28, col.l);
    c.hline(x0 + 2, x0 + 11, 22, '#f4dc6c'); // AGES SIX AND UP
    for (const x of [x0 + 2, x0 + 7, x0 + 12]) c.set(x, 2, IRON.h); // pegs
  }
  c.outline(INK);
  return c;
}

/** The Brogath Rules on the underside of the tipped table: one sheet, then two, three, four down to the floor (a ribbon, nailed). */
function rulesSheet(n) {
  const h = 8 + n * 5;
  const c = canvas(16, 24);
  const top = 24 - h - 2;
  for (let i = 0; i < n; i++) {
    const y = top + i * 5;
    c.rect(2 + (i % 2), y, 12, 6, i % 2 ? PARCH.l : PARCH.m);
    c.hline(4, 12, y + 2, '#3a2a1a');
    c.hline(4, 10 + (i % 2) * 2, y + 4, '#3a2a1a');
  }
  c.set(8, top, IRON.h);
  if (n >= 4) c.rect(6, 22, 4, 2, SASH.m); // the ribbon at the bottom, nailed down
  c.outline(INK);
  return c;
}

/** A napkin on the floor, corners lifting. */
function napkinFloor() {
  const c = canvas(16, 10);
  c.poly([[3, 6], [10, 4], [13, 7], [6, 9]], '#f4f0e4');
  c.set(10, 3, '#f4f0e4'); c.set(3, 5, '#f4f0e4'); // the corners, lifting
  c.line(5, 7, 10, 6, '#d8d0c0');
  c.outline(INK);
  return c;
}

// --- the galley: breakfast, the crate, the oats ----------------------------------------------------------

const FILLINGS = {
  beans: ['#8a3a1a', '#b8562a', '#d88a4a'],
  onions: ['#c8a050', '#e8c870', '#f4e0a0'],
  garlic: ['#e8e0cc', '#f4f0e0', '#c8bea8'],
  cabbage: ['#6a8a2a', '#9ab84a', '#c8d880'],
  grog: ['#3a7a2a', '#5aa83a', '#a8e870'],
  sauce: ['#8a1a0a', '#c8341a', '#f07040'],
};
/** One modular bowl (or jug, or tin) of the bean breakfast. */
function feast(kind) {
  const [d, m, l] = FILLINGS[kind];
  const c = canvas(16, 14);
  if (kind === 'grog') {
    cylinder(c, 8, 1, 12, 4, { d: '#4a5a3a', m: '#6a7a5a', b: '#8a9a7a', l: '#aabaa0', h: '#c8d8c0' }, { topColor: m });
    c.set(8, 4, l); c.set(7, 3, l); // bubbling
  } else if (kind === 'sauce') {
    c.rect(4, 3, 8, 9, IRON.l); c.rect(4, 5, 8, 4, m); c.hline(5, 10, 6, '#f4dc6c'); // a warm tin: EXTRA
    c.ellipse(8, 3, 4, 1.5, IRON.h);
  } else {
    c.ellipse(8, 9, 7, 3, '#e8e4d8'); // the bowl
    c.ellipse(8, 8, 6, 2.5, m);
    for (const [x, y] of [[5, 8], [8, 7], [10, 8], [7, 9], [11, 7]]) c.set(x, y, (x + y) % 2 ? d : l);
    if (kind === 'beans') { c.set(6, 6, l); c.set(9, 5, m); }
    if (kind === 'garlic') { c.ellipse(8, 6, 2, 2, '#f4f0e0'); c.set(8, 4, '#c8bea8'); }
  }
  c.outline(INK);
  // Up on the table top, not on the floor in front of it.
  const out = canvas(16, 24);
  out.blit(c, 0, 0);
  return out;
}

/** The Grand Currency crate: plastic-wrapped, stamped with a crown and a nose, THIS WAY UP, NOT LEGAL TENDER. */
function currencyCrate({ open = false } = {}) {
  const c = canvas(16, 22);
  groundShadow(c, 8, 20, 7, 1.5);
  box(c, 1, 4, 14, 4, 13, { d: '#7a4a1a', m: '#a8702a', b: '#c8903a', l: '#e0b058', h: '#f0c870' });
  c.rect(4, 11, 8, 5, TOKEN.l); // the stamp
  c.rect(6, 11, 4, 2, TOKEN.d);
  c.set(8, 14, '#e8a080');
  if (open) {
    c.rect(2, 4, 12, 4, TOKEN.m);
    for (const [x, y] of [[3, 3], [6, 2], [9, 3], [12, 2], [5, 5], [10, 5], [7, 4]]) { c.set(x, y, TOKEN.l); c.set(x + 1, y, TOKEN.d); }
    for (const [x, y] of [[0, 19], [14, 20], [2, 21]]) { c.set(x, y, TOKEN.l); c.set(x + 1, y, TOKEN.d); } // spilling
  } else {
    for (let y = 5; y < 21; y += 3) c.hline(1, 14, y, '#ffffff40'); // the plastic wrap
    c.line(1, 5, 14, 20, '#ffffff50');
  }
  c.outline(INK);
  return c;
}

/** Grand Tokens on the floor: plastic, gold-coloured the way a toy is gold-coloured. */
function tokenSpill() {
  const c = canvas(16, 10);
  for (const [x, y] of [[3, 6], [7, 4], [10, 7], [12, 5], [5, 8]]) {
    c.ellipse(x, y, 2, 1.2, TOKEN.m);
    c.set(x - 1, y, TOKEN.l);
    c.set(x + 1, y, TOKEN.d);
  }
  c.outline(INK);
  return c;
}

/** A sack of oats (OATS, in Jim's writing, and underneath: WHY?). */
function oatSack({ empty = false } = {}) {
  const c = canvas(16, 18);
  groundShadow(c, 8, 16, 6, 1.5);
  if (empty) {
    c.ellipse(8, 14, 7, 3, BURLAP.m);
    c.ellipse(6, 13, 3, 1.5, BURLAP.l);
    for (const [x, y] of [[12, 15], [13, 13], [3, 15]]) c.set(x, y, OAT[0]);
  } else {
    c.ellipse(8, 11, 6, 6, BURLAP.m);
    c.rect(3, 8, 10, 8, BURLAP.m);
    c.ellipse(6, 9, 2, 3, BURLAP.l);
    c.rect(6, 2, 4, 3, BURLAP.d); // the tied neck
    c.hline(5, 10, 5, PAL.rope2);
    c.hline(5, 10, 10, '#3a2a1a'); c.hline(6, 9, 13, '#3a2a1a');
  }
  c.outline(INK);
  return c;
}

/** Oats, everywhere (spilt), or in the cracks for good (remnants). */
function oats({ few = false } = {}) {
  const c = canvas(16, 12);
  const pts = few ? [[3, 9], [9, 10], [13, 8]] : [[2, 9], [4, 7], [6, 10], [8, 8], [9, 6], [11, 9], [13, 7], [5, 5], [12, 11], [7, 11], [3, 4], [14, 10]];
  pts.forEach(([x, y], i) => { c.set(x, y, OAT[i % 3]); c.set(x + 1, y, OAT[(i + 1) % 3]); });
  if (few) c.hline(1, 14, 10, '#00000030'); // a crack in the planks, oats in it
  return c;
}

// --- the deck: the Grand Bank ------------------------------------------------------------------------------

/** The teller's counter: six tiles of polished wood, green felt, brass bars along the back. */
function bankCounter() {
  const c = canvas(96, 30);
  groundShadow(c, 48, 28, 46, 2);
  box(c, 0, 12, 96, 5, 12, { d: '#4a2a12', m: '#6a3e1a', b: '#8a5226', l: '#a8683a', h: '#c88a52' }, { planks: 4 });
  c.rect(1, 13, 94, 3, FELT.m);
  c.hline(1, 94, 13, FELT.l);
  // brass bars along the back, with the teller's window left open in the middle
  for (let x = 2; x < 95; x += 4) if (x < 42 || x > 53) c.vline(x, 1, 12, x % 12 === 2 ? GOLD.h : GOLD.l);
  c.hline(0, 41, 1, GOLD.h); c.hline(0, 41, 2, GOLD.d);
  c.hline(54, 95, 1, GOLD.h); c.hline(54, 95, 2, GOLD.d);
  c.vline(41, 1, 12, GOLD.d); c.vline(54, 1, 12, GOLD.d);
  c.rect(40, 19, 16, 4, GOLD.l); c.hline(42, 53, 21, '#3a2a10'); // TELLER (a brass plate)
  c.outline(INK);
  return c;
}
/** The teller bell, on the counter. */
function bankBell() {
  const c = canvas(16, 30);
  c.ellipse(8, 14, 4, 3, GOLD.l);
  c.rect(4, 14, 9, 2, GOLD.d);
  c.set(8, 10, GOLD.h); c.set(7, 13, GOLD.h);
  c.outline(INK);
  return c;
}
/** A rack of forms: GRAND DEPOSIT, GRAND WITHDRAWAL, ATMOSPHERIC ASSET TRANSFER, DISCLOSURES. */
function bankForms() {
  const c = canvas(16, 30);
  groundShadow(c, 8, 28, 6, 1.5);
  c.rect(3, 4, 10, 24, '#4a2a12');
  for (let i = 0; i < 4; i++) {
    const y = 6 + i * 5;
    c.rect(4, y, 8, 4, ['#f4ecd8', '#e8f0d8', '#f0d8d8', '#e0e4f4'][i]);
    c.hline(5, 10, y + 1, '#5a4a3a');
  }
  c.outline(INK);
  return c;
}
/** Brass posts and a red velvet rope (the queue goes this way). */
function bankRope() {
  const c = canvas(48, 20);
  for (const x of [3, 24, 45]) {
    c.rect(x - 1, 6, 3, 13, GOLD.m); c.vline(x - 1, 6, 18, GOLD.h);
    c.ellipse(x, 5, 2, 1.5, GOLD.h);
    c.rect(x - 2, 18, 5, 2, GOLD.d);
  }
  for (let x = 4; x < 44; x++) { const y = 8 + Math.round(Math.sin(((x % 21) / 21) * Math.PI) * 3); c.set(x, y, VELVET.m); c.set(x, y + 1, VELVET.d); }
  c.outline(INK);
  return c;
}
/** THE GRAND STENCHMASTER'S GRAND BANK AND GRAND TRUST, gold leaf on green, hanging from nothing. */
function bankSign() {
  const c = canvas(64, 22);
  c.rect(1, 2, 62, 16, FELT.m);
  c.strokeRect(1, 2, 62, 16, GOLD.l);
  c.strokeRect(3, 4, 58, 12, GOLD.d);
  for (let x = 6; x < 58; x += 3) { c.vline(x, 7, 9, GOLD.h); if (x % 2) c.set(x + 1, 8, GOLD.l); } // the lettering
  c.hline(14, 50, 12, GOLD.l); // YOUR GAS IS OUR BUSINESS!
  c.ellipse(32, 1, 3, 1.5, GOLD.h); // a crown at the top
  c.outline(INK);
  return c;
}
/** The vault door: round steel, spokes, set into thin air in a ring of haze. */
function bankVault() {
  const frames = [0, 1].map((f) => {
    const c = canvas(32, 40);
    for (let y = 0; y < 40; y++) for (let x = 0; x < 32; x++) {
      const r = Math.hypot(x - 16, y - 18);
      if (r > 14 && r < 16.5 && (x + y + f) % 3 === 0) c.set(x, y, '#d8d0a060'); // haze
    }
    c.ellipse(16, 18, 13, 13, VAULT.m);
    c.ellipse(16, 18, 11, 11, VAULT.b);
    c.ellipseOutline(16, 18, 13, 13, VAULT.d);
    c.ellipseOutline(16, 18, 9, 9, VAULT.l);
    for (let a = 0; a < 6; a++) {
      const t = (a / 6) * Math.PI * 2 + f * 0.26;
      c.line(16, 18, Math.round(16 + Math.cos(t) * 7), Math.round(18 + Math.sin(t) * 7), VAULT.h);
    }
    c.ellipse(16, 18, 2, 2, GOLD.l);
    for (const [x, y] of [[5, 18], [27, 18], [16, 7], [16, 29]]) c.set(x, y, VAULT.h); // bolts
    c.outline(INK);
    return c;
  });
  return { frames, ms: 900 };
}

// --- the Fart-Free Zone ------------------------------------------------------------------------------------

function mops() {
  const c = canvas(16, 30);
  for (const [x, lean] of [[4, -1], [8, 0], [11, 1]]) {
    c.line(x, 6, x + lean * 3, 24, WOOD.l);
    c.rect(x + lean * 3 - 2, 23, 5, 5, x === 8 ? '#9a9a8a' : '#c8c0a8');
  }
  c.outline(INK);
  return c;
}
function bucket() {
  const c = canvas(16, 14);
  cylinder(c, 8, 2, 12, 5, IRON, { bands: [6], topColor: '#3a4a5a' });
  c.outline(INK);
  return c;
}
/** The double bunk's mattress, folded against the back wall (bare: just the mops' old sacking). */
function zoneMattress({ bare = false } = {}) {
  const c = canvas(32, 18);
  groundShadow(c, 16, 16, 15, 2);
  if (bare) {
    c.rect(2, 10, 28, 5, BURLAP.m); c.hline(2, 29, 10, BURLAP.l);
  } else {
    box(c, 1, 3, 30, 5, 8, { d: '#7a6a5a', m: '#a8987a', b: '#c8b896', l: '#e0d4b4', h: '#f0e8d0' });
    for (let x = 5; x < 30; x += 6) c.set(x, 6, '#a8987a');
    c.rect(3, 1, 8, 4, SASH.m); // a sash pillow
    c.set(7, 2, '#f0b090');
  }
  c.outline(INK);
  return c;
}
/** The little table with one candle on it (its light). */
function zoneTable() {
  const c = canvas(16, 26);
  groundShadow(c, 8, 24, 6, 1.5);
  box(c, 2, 10, 12, 4, 10, WOOD);
  c.rect(7, 4, 2, 6, '#f4ecd8'); // the candle
  c.set(7, 2, '#ffd070'); c.set(7, 3, '#ffb040'); c.set(8, 3, '#ffd070');
  c.outline(INK);
  return c;
}
function zoneSlate() {
  const c = canvas(16, 20);
  c.rect(1, 2, 14, 11, '#2a2e32');
  c.strokeRect(1, 2, 14, 11, WOOD.l);
  for (let i = 0; i < 4; i++) c.hline(3, 9 + (i % 2) * 3, 4 + i * 2, '#e8e8e0');
  c.outline(INK);
  return c;
}
/** Soft things nailed to the walls: blankets, clean sashes (insulation, three deep), rags in the cracks. */
function zoneWall(kind) {
  const c = canvas(16, 24);
  if (kind === 'blankets') {
    c.rect(1, 2, 14, 18, '#6a5a8a'); for (let y = 5; y < 20; y += 4) c.hline(1, 14, y, '#4a3e6a');
    c.rect(6, 4, 9, 16, '#8a6a4a');
  } else if (kind === 'sashes') {
    for (let i = 0; i < 4; i++) c.rect(1 + i * 4, 2, 3, 20, i % 2 ? SASH.m : SASH.l);
    c.hline(1, 15, 12, '#f4dc6c');
  } else {
    for (const [x, y, col] of [[3, 6, '#c8c0a8'], [9, 10, '#d8d0b8'], [5, 15, '#b8b098'], [12, 4, '#e0d8c4']]) c.rect(x, y, 3, 2, col);
  }
  c.outline(INK);
  return c;
}
function zonePillows() {
  const c = canvas(16, 10);
  c.ellipse(5, 6, 4, 2.5, SASH.m); c.set(5, 6, '#f0b090');
  c.ellipse(11, 7, 4, 2.5, SASH.l); c.set(11, 7, '#f0b090');
  c.outline(INK);
  return c;
}
function zoneHardtack() {
  const c = canvas(16, 16);
  groundShadow(c, 8, 14, 6, 1.5);
  c.ellipse(8, 10, 6, 5, BURLAP.m);
  c.rect(5, 3, 6, 4, '#e0c88a'); // biscuits poking out
  c.set(6, 4, '#a8844e'); c.set(9, 5, '#a8844e');
  c.outline(INK);
  return c;
}
function zoneGrog() {
  const c = canvas(16, 12);
  cylinder(c, 8, 2, 10, 3, { d: '#3a5a2a', m: '#5a7a3a', b: '#6a8a4a', l: '#8aaa6a', h: '#aacc8a' }, { topColor: '#a8e870' });
  c.rect(5, 1, 6, 1, '#e8e4d8'); // a plate over it
  c.outline(INK);
  return c;
}
/** The cards, on the table (and fluttering down onto the floor, where they're allowed to). */
function cards({ floor = false } = {}) {
  const c = canvas(16, floor ? 10 : 26);
  const base = floor ? 6 : 10;
  for (const [x, y, tilt] of [[3, 0, 0], [7, 1, 1], [10, -1, 0], [12, 2, 1]]) {
    if (floor || x < 11) {
      c.rect(x, base + y, 3, 2 + tilt, '#f4f0e4');
      c.set(x + 1, base + y, x % 2 ? '#c83a2a' : '#2a2a3a');
    }
  }
  c.outline(INK);
  return c;
}
/** FART-FREE ZONE. THIS MEANS GARRICK. AND HIM. In Bob's paint. */
function zoneSign() {
  const c = canvas(16, 16);
  c.rect(2, 1, 12, 9, '#f0e6c8');
  c.hline(3, 12, 3, '#2a7a3a'); c.hline(3, 10, 5, '#c83a2a'); c.hline(5, 9, 7, '#7a6a5a');
  c.outline(INK);
  return c;
}

export const PHASE14_PROPS = {
  treasure_signs_five: () => treasureSignsFive(2),
  treasure_planks_one_off: () => treasureSignsFive(1),
  treasure_planks_off: () => treasureSignsFive(0),
  nook_door: nookDoor,
  sign_brogath_never: signBrogathNever,
  scorch_ring: scorchRing,
  porthole_cracked: portholeCracked,
  barricade_table: barricadeTable,
  blanket_wall: blanketWall,
  rules_sheet_1: () => rulesSheet(1),
  rules_sheet_2: () => rulesSheet(2),
  rules_sheet_3: () => rulesSheet(3),
  rules_sheet_4: () => rulesSheet(4),
  napkin_floor: napkinFloor,
  feast_beans: () => feast('beans'),
  feast_onions: () => feast('onions'),
  feast_garlic: () => feast('garlic'),
  feast_cabbage: () => feast('cabbage'),
  feast_grog: () => feast('grog'),
  feast_sauce: () => feast('sauce'),
  grand_currency_crate: () => currencyCrate(),
  grand_currency_crate_open: () => currencyCrate({ open: true }),
  gtoken_spill: tokenSpill,
  oat_sack: () => oatSack(),
  oat_sack_empty: () => oatSack({ empty: true }),
  oat_spill: () => oats(),
  oat_remnants: () => oats({ few: true }),
  bank_counter: bankCounter,
  bank_bell: bankBell,
  bank_forms: bankForms,
  bank_rope: bankRope,
  bank_sign: bankSign,
  bank_vault: bankVault,
  zone_mops: mops,
  zone_bucket: bucket,
  zone_mattress: () => zoneMattress(),
  zone_mattress_bare: () => zoneMattress({ bare: true }),
  zone_table: zoneTable,
  zone_slate: zoneSlate,
  zone_blankets: () => zoneWall('blankets'),
  zone_sashes: () => zoneWall('sashes'),
  zone_rags: () => zoneWall('rags'),
  zone_pillows: zonePillows,
  zone_hardtack: zoneHardtack,
  zone_grog: zoneGrog,
  zone_cards: () => cards(),
  cards_floor: () => cards({ floor: true }),
  zone_sign: zoneSign,
};
