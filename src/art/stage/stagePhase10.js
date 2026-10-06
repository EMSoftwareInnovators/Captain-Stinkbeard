import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { flyingShark } from './stagePhase6.js';

/**
 * Stage sprites for Story Phase 10: the Bling Bling King's prizes (cheap
 * plastic: fake gold with the paint missing in places, mould seams, a
 * crowned cartoon shark stamped off-centre), the luxury seafood's rubbish
 * dumped on the deck, the luxury pillows blowing about (and the one Garrick
 * caught), the tiara that got away twice, a can of Crying Beans and one of
 * Spicy Stench Sauce, a splat of Bean Smoothie, more of the storm's sharks
 * in their new jewellery, and the Bling Bling King himself going over low:
 * a megalodon in the Crimson King's Crown with an enormous gold chain and a
 * diamond pendant (an original design: a crowned shark's head on a plate of
 * ice, no letters at this size). Readable, silly, never cruel.
 */
const INK = PAL.ink;
const PLASTIC = { d: '#8a6a1c', m: '#d8b440', l: '#f4dc78', bare: '#e8e0cc' }; // fake gold, and where it's rubbed off
const GOLD = { d: '#9a6a10', m: '#e0b030', l: '#f8e070' };
const PINK = { d: '#a83a70', m: '#e868a8', l: '#f8a8d0' };
const TEAL = { d: '#2a7a70', m: '#48c0b0', l: '#98e8dc' };
const ICE = { d: '#7ab0d8', m: '#c8e8f8', l: '#ffffff' };
const RUBY = '#d02838';
const EMERALD = '#28a050';

/** The participation coin, lying on the deck: plastic gold, a crowned shark stamped off-centre, a mould seam. */
export function tokenCoin() {
  const c = new PixelCanvas(10, 9);
  c.ellipse(5, 4.5, 4.5, 4, PLASTIC.m);
  c.ellipse(5, 4.5, 3, 2.6, PLASTIC.l);
  // the stamp, off-centre: a shark's head and a three-point crown
  c.set(6, 3, PLASTIC.d);
  c.set(7, 4, PLASTIC.d);
  c.hline(5, 7, 5, PLASTIC.d);
  c.set(5, 2, PLASTIC.d);
  c.set(7, 2, PLASTIC.d);
  // the seam, and where the gold paint has come off
  c.vline(5, 0, 1, PLASTIC.bare);
  c.set(2, 6, PLASTIC.bare);
  c.set(3, 7, PLASTIC.bare);
  c.outline(INK);
  return c;
}

/** A cheap trophy: a gold plastic cup gone slightly crooked in the mould, on a black base with a plaque. */
function tokenTrophy() {
  const c = new PixelCanvas(12, 15);
  c.rect(2, 11, 8, 3, '#1e1a22');
  c.hline(3, 8, 11, '#3a3440');
  c.rect(4, 12, 4, 1, PLASTIC.l); // the plaque
  c.rect(5, 8, 2, 3, PLASTIC.m);
  c.poly([[1, 1], [10, 2], [8, 7], [3, 7]], PLASTIC.m);
  c.line(2, 2, 3, 6, PLASTIC.l);
  c.set(0, 2, PLASTIC.d); // handles
  c.set(0, 3, PLASTIC.d);
  c.set(11, 3, PLASTIC.d);
  c.set(11, 4, PLASTIC.d);
  c.set(6, 4, PLASTIC.d); // a tiny crowned shark, smudged
  c.set(7, 4, PLASTIC.d);
  c.set(6, 3, PLASTIC.bare);
  c.outline(INK);
  return c;
}

/** A ribbon rosette: pink and teal, a fake-gold button in the middle, two tails. */
export function tokenRosette() {
  const c = new PixelCanvas(12, 16);
  c.poly([[3, 9], [1, 15], [4, 13], [5, 9]], PINK.m);
  c.poly([[7, 9], [8, 13], [11, 15], [9, 9]], TEAL.m);
  c.ellipse(6, 5.5, 5.5, 5, PINK.m);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    c.set(Math.round(6 + Math.cos(a) * 5), Math.round(5.5 + Math.sin(a) * 4.5), i % 2 ? PINK.l : PINK.d);
  }
  c.ellipse(6, 5.5, 2.5, 2.5, PLASTIC.m);
  c.set(5, 4, PLASTIC.l);
  c.outline(INK);
  return c;
}

/** A medal on a short ribbon, the gold already flaking. */
export function tokenMedal() {
  const c = new PixelCanvas(9, 13);
  c.rect(2, 0, 2, 5, TEAL.m);
  c.rect(5, 0, 2, 5, PINK.m);
  c.ellipse(4.5, 8.5, 3.5, 3.5, PLASTIC.m);
  c.set(3, 7, PLASTIC.l);
  c.set(5, 10, PLASTIC.bare);
  c.outline(INK);
  return c;
}

/** A little printed card, a certificate of something. */
export function tokenCard() {
  const c = new PixelCanvas(12, 8);
  c.rect(0, 0, 12, 8, '#f4ecd8');
  c.rect(1, 1, 10, 1, PLASTIC.m);
  for (const y of [3, 5]) c.hline(2, 9, y, '#a89a80');
  c.set(10, 6, RUBY);
  c.outline(INK);
  return c;
}

/** The Grand Award Ribbon, pinned on: big, three tails, far too much glitter. */
function ribbonBig() {
  const c = new PixelCanvas(16, 22);
  c.poly([[4, 11], [1, 21], [5, 18], [7, 11]], PLASTIC.m);
  c.poly([[7, 11], [8, 21], [10, 11]], PINK.m);
  c.poly([[9, 11], [11, 18], [15, 21], [12, 11]], TEAL.m);
  c.ellipse(8, 7, 7.5, 7, PLASTIC.m);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    c.set(Math.round(8 + Math.cos(a) * 7), Math.round(7 + Math.sin(a) * 6.5), i % 2 ? PLASTIC.l : PLASTIC.d);
  }
  c.ellipse(8, 7, 3.5, 3.5, PINK.m);
  c.set(7, 6, '#ffffff');
  for (const [x, y] of [[3, 3], [12, 4], [5, 11], [11, 10]]) c.set(x, y, '#ffffff'); // glitter
  c.outline(INK);
  return c;
}

/** The Cowardice Award: an enormous rosette, ribbons everywhere, a crowned shark on the button. */
function awardBig() {
  const c = new PixelCanvas(22, 26);
  for (let i = 0; i < 5; i++) {
    const x = 3 + i * 4;
    const col = [PINK, TEAL, GOLD, PINK, TEAL][i];
    c.poly([[x, 13], [x - 1, 25 - (i % 2) * 2], [x + 2, 23], [x + 3, 13]], col.m);
  }
  c.ellipse(11, 9, 10.5, 9, TEAL.m);
  c.ellipse(11, 9, 8, 7, PINK.m);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    c.set(Math.round(11 + Math.cos(a) * 10), Math.round(9 + Math.sin(a) * 8.5), i % 2 ? TEAL.l : TEAL.d);
  }
  c.ellipse(11, 9, 4.5, 4.5, PLASTIC.m);
  c.hline(9, 13, 8, PLASTIC.d); // the shark on the button
  c.set(10, 6, PLASTIC.d);
  c.set(12, 6, PLASTIC.d);
  c.set(9, 7, PLASTIC.l);
  c.outline(INK);
  return c;
}

// --- the luxury seafood's rubbish ---

function lobsterShell() {
  const c = new PixelCanvas(13, 8);
  c.ellipse(6, 4, 4, 2.5, '#c83a2a');
  c.ellipse(6, 3.5, 3, 1.5, '#e86a4a');
  c.poly([[10, 3], [12, 1], [12, 6], [10, 5]], '#a82a1e'); // the tail fan
  c.line(2, 3, 0, 1, '#c83a2a');
  c.line(2, 5, 0, 7, '#c83a2a');
  c.outline(INK);
  return c;
}

function crabShell() {
  const c = new PixelCanvas(11, 8);
  c.ellipse(5.5, 4, 4.5, 3, '#d8743a');
  c.ellipse(5.5, 3.5, 3, 1.5, '#f0a060');
  for (const x of [1, 3, 8, 10]) c.set(x, 7, '#a84a1e');
  c.outline(INK);
  return c;
}

function oysterTray() {
  const c = new PixelCanvas(15, 8);
  c.rect(0, 2, 15, 5, '#b8bcc4');
  c.hline(1, 13, 2, '#e0e4ea');
  for (const x of [3, 7, 11]) {
    c.ellipse(x, 4.5, 1.8, 1.2, '#8a8a7a');
    c.set(x, 4, '#e8e4d8');
  }
  c.outline(INK);
  return c;
}

function caviarTin() {
  const c = new PixelCanvas(8, 6);
  c.ellipse(4, 3, 3.5, 2.5, '#2a3440');
  c.ellipse(4, 2.5, 2.5, 1.5, '#5a6a7a');
  c.set(3, 2, GOLD.l);
  c.outline(INK);
  return c;
}

function takeoutBox() {
  const c = new PixelCanvas(10, 9);
  c.poly([[1, 3], [9, 3], [8, 8], [2, 8]], '#f0ece4');
  c.poly([[1, 3], [3, 0], [7, 0], [9, 3]], '#d8d4cc');
  c.hline(3, 7, 5, '#c83a2a'); // a printed wave, no name
  c.outline(INK);
  return c;
}

function napkin() {
  const c = new PixelCanvas(7, 6);
  c.poly([[0, 1], [6, 0], [5, 5], [1, 5]], '#f4f0e8');
  c.line(1, 2, 4, 4, '#d8d0c0');
  c.set(4, 1, '#c83a2a');
  c.outline(INK);
  return c;
}

// --- bedding ---

/** A luxury pillow: satin, piped edges, gold tassels at the corners. `tilt` rolls it as it blows along. */
function pillow(tilt = 0) {
  const c = new PixelCanvas(17, 12);
  const k = tilt ? 1 : 0;
  c.poly([[2, 2 + k], [14, 1], [15, 9 - k], [3, 10]], '#e8e0f0');
  c.line(4, 3 + k, 12, 2, '#ffffff');
  c.line(3, 9, 14, 8 - k, '#b8a8d0');
  for (const [x, y] of [[1, 1 + k], [15, 0], [16, 10 - k], [2, 11]]) c.set(x, y, GOLD.m);
  c.set(8, 6, '#c8b8e0'); // a button
  c.outline(INK);
  return c;
}

// --- the tiara, beans, sauce, smoothie ---

export function tiaraGround() {
  const c = new PixelCanvas(10, 6);
  c.hline(1, 8, 4, GOLD.m);
  c.hline(2, 7, 5, GOLD.d);
  for (const [x, h] of [[2, 2], [5, 3], [8, 2]]) c.vline(x, 4 - h, 3, GOLD.m);
  c.set(5, 0, RUBY);
  c.set(2, 1, EMERALD);
  c.set(8, 1, EMERALD);
  c.outline(INK);
  return c;
}

/** A can of Crying Beans: absurdly yellow, a crying bean on the label. */
function beanCan() {
  const c = new PixelCanvas(8, 10);
  c.rect(0, 1, 8, 8, '#f0d020');
  c.hline(0, 7, 0, '#b8bcc4');
  c.hline(0, 7, 9, '#8a8e96');
  c.ellipse(4, 5, 2, 1.5, '#8a3a22'); // the bean
  c.set(3, 4, '#ffffff');
  c.set(3, 6, '#5ab0e8'); // its tear
  c.outline(INK);
  return c;
}

/** A can of Spicy Stench Sauce: red, a warning stripe, a bulging lid. */
function sauceCan() {
  const c = new PixelCanvas(8, 11);
  c.rect(0, 2, 8, 8, '#b8241c');
  c.ellipse(4, 1.5, 4, 1.5, '#c8ccd4'); // the lid, bulging
  c.hline(0, 7, 10, '#6a1410');
  c.rect(0, 5, 8, 2, '#f0d020'); // the warning stripe
  c.set(2, 5, '#1e1a22');
  c.set(5, 5, '#1e1a22');
  c.outline(INK);
  return c;
}

/** Bean Smoothie, splattered on a wall or the deckhead. */
function sludgeSplat() {
  const c = new PixelCanvas(14, 10);
  c.ellipse(7, 4, 5, 3.5, '#8a6a3a');
  c.ellipse(6, 3.5, 3, 2, '#a8864a');
  for (const [x, y, l] of [[3, 6, 3], [7, 7, 2], [10, 6, 3]]) c.vline(x, y, y + l, '#7a5a2a'); // drips
  c.set(2, 2, '#8a6a3a');
  c.set(12, 1, '#8a6a3a');
  c.set(5, 3, '#c83a2a'); // a bean
  return c;
}

// --- the storm's sharks, in their new jewellery ---

function jeweled(kind, frame) {
  const c = flyingShark(frame);
  if (kind === 'belt') {
    // a jewelled belt round its middle
    for (let x = 10; x <= 17; x++) c.set(x, 8 + (x % 2), x % 3 === 0 ? RUBY : GOLD.m);
    c.set(13, 9, EMERALD);
  } else if (kind === 'bigchain') {
    // a great white in two heavy gold chains
    for (let i = 0; i < 9; i++) c.set(6 + i, 10 + (i % 2), i % 2 ? GOLD.m : GOLD.l);
    for (let i = 0; i < 7; i++) c.set(8 + i, 12 - (i % 2), i % 2 ? GOLD.d : GOLD.m);
    c.set(9, 13, GOLD.l);
  }
  c.set(frame ? 14 : 12, 5, '#ffffff');
  return c;
}

/**
 * The Bling Bling King going over: the megalodon, huge, in the Crimson
 * King's Crown, an enormous gold chain round its neck and a diamond pendant
 * the size of a door (a crowned shark's head on a plate of ice). Tail
 * flicking between frames.
 */
function blingKing(frame) {
  const c = new PixelCanvas(72, 32);
  const k = frame ? 2 : -2;
  const S = { d: '#2e3846', m: '#4a5668', l: '#7a8aa0', belly: '#d0d6e0' };
  c.ellipse(32, 16, 26, 9, S.m);
  c.ellipse(30, 19, 21, 4, S.belly);
  c.poly([[28, 8], [38, 0], [40, 9]], S.d); // dorsal
  c.poly([[56, 15], [71, 4 + k], [64, 16], [71, 28 + k]], S.d); // tail
  c.poly([[22, 22], [16, 31], [30, 22]], S.d); // pectoral
  // the jaw, a few teeth, an unbothered eye
  c.poly([[6, 15], [16, 12], [16, 20]], '#5a1a20');
  for (const tx of [8, 11, 14]) c.set(tx, 14, '#f4f0e8');
  for (const tx of [9, 12, 15]) c.set(tx, 19, '#f4f0e8');
  c.hline(13, 16, 11, '#0a0a10');
  c.set(15, 10, '#ffffff');
  // the Crimson King's Crown, a little far back on the head
  c.rect(14, 4, 11, 4, GOLD.m);
  for (const x of [14, 18, 21, 24]) c.vline(x, 1, 4, GOLD.m);
  c.hline(14, 24, 7, GOLD.d);
  c.set(18, 1, RUBY);
  c.set(21, 0, RUBY);
  c.set(16, 5, EMERALD);
  c.set(22, 5, '#4a8ad8');
  // the chain, fat links round the neck, and the pendant hanging off it
  for (let i = 0; i < 18; i++) {
    const x = 15 + i;
    const y = 19 + Math.round(Math.sin((i / 17) * Math.PI) * 5);
    c.set(x, y - 1, GOLD.d);
    c.set(x, y, i % 2 ? GOLD.m : GOLD.l);
    c.set(x, y + 1, i % 2 ? GOLD.l : GOLD.m);
    c.set(x, y + 2, GOLD.d);
  }
  c.rect(20, 25, 9, 7, ICE.m);
  c.hline(20, 28, 25, ICE.l);
  c.vline(28, 25, 31, ICE.d);
  c.set(23, 27, GOLD.m); // the crowned shark's head on it
  c.set(25, 27, GOLD.m);
  c.hline(23, 26, 28, '#4a5668');
  c.set(22, 26, '#ffffff');
  c.outline(INK);
  for (const [x, y] of [[33, 30], [19, 24], [11, 3]]) if (!c.alphaAt(x, y)) c.set(x, y, '#ffffff'); // sparkle
  return c;
}

const TOKENS = {
  token_coin: tokenCoin, token_trophy: tokenTrophy, token_rosette: tokenRosette, token_medal: tokenMedal, token_card: tokenCard,
  ribbon_big: ribbonBig, award_big: awardBig,
  lobster_shell: lobsterShell, crab_shell: crabShell, oyster_tray: oysterTray, caviar_tin: caviarTin, takeout_box: takeoutBox, napkin,
  tiara_ground: tiaraGround, bean_can: beanCan, sauce_can: sauceCan, sludge_splat: sludgeSplat,
};

export const JEWELED = ['belt', 'bigchain'];

/**
 * Story Phase 11: Garrick's book (the homemade one: ledger paper, string,
 * stains) sliding across the galley floor on its back, pages fanning.
 */
function bookSliding() {
  const c = new PixelCanvas(16, 12);
  c.rect(1, 4, 13, 7, '#5a3a1a'); // the cover
  c.rect(2, 3, 12, 6, '#efe4c4'); // pages, fanned
  for (const x of [4, 7, 10]) c.vline(x, 3, 8, '#d8ccac');
  c.hline(3, 12, 5, '#8a5426'); // a crayon line, showing
  c.set(12, 7, '#d8c060');
  c.hline(0, 2, 9, '#c8c0a080'); // a smear behind it, sliding
  c.outline(PAL.ink);
  return c;
}

export function addPhase10StageFrames(atlas) {
  for (const [name, paint] of Object.entries(TOKENS)) atlas.add(name, paint());
  atlas.add('book_sliding', bookSliding());
  atlas.add('pillow_luxury', pillow(0));
  atlas.add('pillow_flying_0', pillow(0));
  atlas.add('pillow_flying_1', pillow(1));
  for (const kind of JEWELED) for (const f of [0, 1]) atlas.add(`flying_shark_${kind}_${f}`, jeweled(kind, f));
  for (const f of [0, 1]) atlas.add(`flying_bbk_${f}`, blingKing(f));
}

export const PHASE10_STAGE_FRAMES = [
  ...Object.keys(TOKENS), 'book_sliding',
  'pillow_luxury', 'pillow_flying_0', 'pillow_flying_1',
  ...JEWELED.flatMap((k) => [`flying_shark_${k}_0`, `flying_shark_${k}_1`]),
  'flying_bbk_0', 'flying_bbk_1',
];

/** The prizes the storm throws when it's bored (a state's "tokens.frames"). */
export const PHASE10_TOKEN_FRAMES = ['token_coin', 'token_trophy', 'token_rosette', 'token_medal', 'token_card', 'lobster_shell', 'oyster_tray', 'takeout_box'];
