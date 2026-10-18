import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { drawText } from '../font/drawText.js';
import { SES_SCREEN, rng } from './sesArt.js';
import { CRT, crt, screen } from './vistaPhase6.js';
import { spoutWall } from './vistaPhase10.js';
import { crown, brogath, rays, host, deskFront } from './vistaPhase11.js';
import { card, ground, person, hen } from './vistaPhase15.js';
import { paintCutoutProp, paintCrewSheet } from '../characters/cardboardCrewPainter.js';

/**
 * Pictures for Story Phase 17 (THE RETURN OF THE ANCIENT CREW AND THE COFFIN SOCK CATASTROPHE), all original:
 *   - on the Mark II: THE CREW HE LEFT BEHIND, a Stenchmaster Channel documentary told in stills (the books, the orders,
 *     the empty chair on deck, the years after, the last of them, and, at the end, the set noticing who's watching);
 *   - on the Mark II: the Bling Bling King's LATE-NIGHT SHARKSTORM SPECIAL (a set of treasure chests, a hammerhead
 *     band, cartoon cut-outs, the MAYBE column, the CAPTAIN MINUTES exchange rate, the chicken, an audience of fins, two
 *     correspondents live from the galley in the corner);
 *   - the reincarnation, big: each cut-out with the plume going round it, then into it, then the arms unfolding;
 *   - the Fire-Sharkstorm from the Fart Zone (rings of flame round the vortex, lit sharks) and the second Chicken-Town
 *     waft putting it out;
 *   - the old quarters (the Sash Lounge) a moment before the Coffin Sock and a moment after.
 * Every screen frame comes in two. Nothing flashes: the fire flickers a few pixels at a time.
 */
const INK = PAL.ink;
const W = SES_SCREEN.w;
const H = SES_SCREEN.h;
const t = (c, s, x, y, col = CRT[7], opts = {}) => drawText(c, s, x, y, col, { center: true, ...opts });
const FIRE = ['#6a1a10', '#a8241c', '#e8642a', '#f4a83a', '#fce07a'];
const PLUME = ['#8a7a3a', '#b0a050', '#cabc6a', '#e0d488'];

// --- shared TV pieces ------------------------------------------------------------------------------------------------

/** One of the old crew as the Channel draws them. (x, y) is the top of the head. plate: stood on a cut-out's nameplate. */
function tvCrew(c, x, y, who, { arms = 'rest', plate = false, old = false } = {}) {
  c.ellipse(x, y + 6, 5, 5, CRT[6]);
  c.set(x - 2, y + 5, CRT[0]); c.set(x + 2, y + 5, CRT[0]);
  if (who === 'ledger') {
    c.poly([[x - 12, y + 1], [x, y - 6], [x + 12, y + 1], [x, y + 3]], CRT[0]); // the enormous tricorn
    c.hline(x - 10, x + 10, y + 1, CRT[5]);
    c.hline(x - 1, x + 1, y + 8, CRT[0]);
  } else {
    c.hline(x - 9, x + 9, y + 1, CRT[4]); c.rect(x - 5, y - 4, 10, 5, CRT[4]); // the broad hat
    c.line(x - 4, y + 3, x - 1, y + 4, CRT[0]); c.line(x + 4, y + 3, x + 1, y + 4, CRT[0]); // the eyebrows
    c.hline(x - 2, x + 2, y + 9, CRT[0]);
  }
  if (old) for (const dx of [-3, 3]) c.set(x + dx, y + 8, CRT[4]);
  c.rect(x - 6, y + 11, 12, 20, who === 'ledger' ? CRT[4] : CRT[3]);
  if (who === 'ledger') {
    c.rect(x + 5, y + 15, 6, 9, CRT[2]); c.vline(x + 10, y + 16, y + 22, CRT[7]); // the book under his arm
    if (arms !== 'down') c.line(x - 6, y + 14, x - 10, y + 6, CRT[7]); // the quill, held up
  } else if (arms === 'point') {
    c.line(x + 6, y + 14, x + 16, y + 10, CRT[5]); c.set(x + 17, y + 10, CRT[6]);
  } else {
    c.hline(x - 6, x + 5, y + 18, CRT[5]); c.hline(x - 6, x + 5, y + 19, CRT[5]); // arms folded
  }
  c.rect(x - 5, y + 31, 4, 3, CRT[0]); c.rect(x + 1, y + 31, 4, 3, CRT[0]);
  if (plate) { c.rect(x - 9, y + 33, 18, 4, CRT[7]); c.hline(x - 6, x + 6, y + 35, CRT[3]); }
}

/** A cardboard cut-out shape, cartoon style: flat card, a face, a hat (crown | tricorn | broad). */
function cartoonCard(c, x, y, hat, f, { big = false } = {}) {
  const w = big ? 18 : 14;
  const h = big ? 38 : 32;
  c.rect(x - w / 2, y, w, h, CRT[5]);
  c.rect(x - w / 2 + 1, y + 1, w - 2, h - 2, CRT[4]);
  c.ellipse(x, y + 8, 4, 4, CRT[6]);
  c.set(x - 2, y + 7 - f, CRT[0]); c.set(x + 2, y + 7 - f, CRT[0]);
  c.hline(x - 2, x + 2, y + 11, CRT[0]);
  if (hat === 'crown') crown(c, x - 6, y - 7, 1, CRT[7]);
  if (hat === 'tricorn') { c.poly([[x - 10, y + 2], [x, y - 5], [x + 10, y + 2]], CRT[0]); c.hline(x - 8, x + 8, y + 2, CRT[6]); }
  if (hat === 'broad') { c.hline(x - 8, x + 8, y + 2, CRT[3]); c.rect(x - 4, y - 3, 8, 5, CRT[3]); }
  c.rect(x - w / 2 - 2, y + h, w + 4, 3, CRT[7]); // the nameplate
  // flat: seen a little from the side, it's a line
  c.vline(x + w / 2, y + 1, y + h - 1, CRT[2]);
}

function chest(c, x, y, w = 18) {
  c.rect(x, y, w, 10, CRT[3]); c.rect(x, y - 4, w, 4, CRT[4]);
  c.hline(x, x + w - 1, y, CRT[6]); c.rect(x + w / 2 - 1, y - 1, 3, 3, CRT[7]);
}

function hammerhead(c, x, y, f) {
  c.ellipse(x, y + 10, 5, 9, CRT[4]);
  c.rect(x - 9, y, 18, 3, CRT[5]); c.set(x - 9, y + 1, CRT[0]); c.set(x + 8, y + 1, CRT[0]);
  // a trumpet, raised and lowered in time
  c.line(x + 2, y + 5, x + 12, y + 2 - f * 2, CRT[7]);
  c.ellipse(x + 13, y + 1 - f * 2, 2, 3, CRT[7]);
}

function note(c, x, y) {
  c.ellipse(x, y + 4, 2, 1.5, CRT[7]); c.vline(x + 2, y, y + 4, CRT[7]); c.set(x + 3, y, CRT[7]);
}

// --- THE CREW HE LEFT BEHIND -------------------------------------------------------------------------------------------

function docTitle(f) {
  const c = card('THE CREW HE', 'LEFT BEHIND', f);
  c.rect(0, 62, W, H - 62, CRT[2]);
  c.poly([[34, 62], [70, 62], [64, 70], [40, 70]], CRT[4]); c.vline(52, 46, 62, CRT[5]); // a little ship, a long way off
  c.rect(53, 47, 7, 4, CRT[6]);
  return crt(c, f);
}

function docAfter(f) {
  const c = screen(CRT[1]);
  c.rect(0, 52, W, H - 52, CRT[2]);
  for (let x = 0; x < W; x += 6) c.set(x + (f ? 3 : 0), 56, CRT[3]);
  c.poly([[14, 42], [90, 42], [82, 54], [22, 54]], CRT[4]); c.hline(14, 90, 42, CRT[6]);
  c.vline(52, 8, 42, CRT[5]);
  c.rect(53, 22, 10, 6, CRT[6]); // the flag, at half-mast
  for (let k = 0; k < 5; k++) { c.ellipse(26 + k * 12, 35, 2, 2, CRT[6]); c.rect(25 + k * 12, 37, 3, 5, CRT[5]); }
  t(c, 'AFTERWARDS', W / 2, 64, CRT[6]);
  return crt(c, f);
}

function docLedger(f) {
  const c = screen(CRT[1]);
  c.rect(0, 52, W, H - 52, CRT[2]); c.hline(0, W - 1, 52, CRT[5]);
  tvCrew(c, 26, 14, 'ledger');
  // two books open on the desk: the money in one, his captain's wind in the other
  c.rect(46, 44, 22, 10, CRT[6]); c.vline(57, 44, 53, CRT[3]); t(c, '$', 51, 46, CRT[2]);
  c.rect(72, 44, 22, 10, CRT[6]); c.vline(83, 44, 53, CRT[3]);
  for (let i = 0; i < 3; i++) c.ellipse(76 + i * 5 + f, 40 - i * 3, 2, 1.5, CRT[5]);
  c.line(60, 36, 64 + f * 2, 44, CRT[7]); // the quill, going
  t(c, 'LEDGER BILLIAM', W / 2, 64, CRT[6]);
  return crt(c, f);
}

function docTilda(f) {
  const c = screen(CRT[1]);
  ground(c, 56);
  tvCrew(c, 24, 14, 'tilda', { arms: 'point' });
  person(c, 66, 36, { col: CRT[4] });
  person(c, 84, 38, { col: CRT[3], hat: 'brim' });
  if (f) { t(c, '!', 50, 8, CRT[7]); t(c, '!', 58, 4, CRT[7]); } else t(c, '!', 54, 6, CRT[7]);
  t(c, 'NO-NONSENSE TILDA', W / 2, 66, CRT[6]);
  return crt(c, f);
}

function docChair(f) {
  const c = screen(CRT[0]);
  c.rect(0, 30, W, 22, CRT[1]); // the evening sea
  c.hline(0, W - 1, 30, CRT[3]);
  c.rect(0, 52, W, H - 52, CRT[2]); c.hline(0, W - 1, 52, CRT[4]); // the deck
  for (let x = 4; x < W; x += 12) c.vline(x, 44, 52, CRT[3]); c.hline(0, W - 1, 44, CRT[4]); // the rail
  // his chair: big, high-backed, empty
  c.rect(52, 22, 22, 26, CRT[3]); c.rect(54, 24, 18, 20, CRT[2]);
  c.rect(50, 40, 26, 6, CRT[4]); c.vline(52, 46, 56, CRT[4]); c.vline(73, 46, 56, CRT[4]);
  crown(c, 57, 14, 1, CRT[5]);
  // Tilda on a stool beside it, talking to it
  c.ellipse(34, 34, 4, 4, CRT[6]); c.hline(27, 41, 30, CRT[4]); c.rect(31, 26, 6, 4, CRT[4]);
  c.rect(30, 38, 9, 10, CRT[3]); c.rect(30, 48, 9, 2, CRT[5]); c.vline(31, 50, 56, CRT[5]); c.vline(38, 50, 56, CRT[5]);
  c.hline(39, 46, 41 - f, CRT[5]); // a finger, wagging
  // the lantern
  c.vline(88, 26, 34, CRT[4]); c.ellipse(88, 37, 3, 4, f ? CRT[7] : CRT[6]);
  return crt(c, f);
}

function docYears(f) {
  const c = screen(CRT[1]);
  for (const x of [34, 69]) c.vline(x, 0, H - 1, CRT[0]);
  // Old Jeb: a plank with SOLD on it, and another plank with SOLD on it
  person(c, 12, 30, { col: CRT[3] }); c.rect(17, 30, 2, 8, CRT[6]); c.vline(10, 38, 44, CRT[6]);
  c.rect(13, 17, 21, 9, CRT[6]); t(c, 'SOLD', 23, 18, CRT[1]);
  c.rect(3, 50, 28, 4, CRT[4]); t(c, 'SOLD', 17, 56, CRT[6]);
  // Wobbly Ned: the end of a quay, the water, his cap, floating
  c.rect(35, 40, 18, 6, CRT[4]); for (const x of [38, 48]) c.vline(x, 46, 60, CRT[3]);
  c.rect(35, 54, 34, H - 54, CRT[2]);
  c.ellipse(60, 54 + f, 4, 2, CRT[5]); c.set(63, 53 + f, CRT[6]);
  // Elsie and her pot of beans, steaming
  person(c, 82, 26, { col: CRT[4] });
  c.rect(84, 44, 16, 10, CRT[3]); c.hline(84, 99, 44, CRT[6]);
  for (let i = 0; i < 3; i++) c.ellipse(88 + i * 4, 38 - i * 3 - f, 2, 2, CRT[5]);
  t(c, 'THE YEARS', W / 2, 68, CRT[6]);
  return crt(c, f);
}

function docLedgerEnd(f) {
  const c = screen(CRT[0]);
  c.rect(0, 50, W, H - 50, CRT[1]);
  // a bed, an old man in it, his hat on the bedpost
  c.rect(8, 40, 56, 14, CRT[3]); c.rect(8, 36, 14, 8, CRT[6]); c.vline(8, 30, 56, CRT[4]); c.vline(63, 36, 56, CRT[4]);
  c.ellipse(16, 36, 4, 4, CRT[5]); c.set(15, 35, CRT[0]); c.set(18, 35, CRT[0]);
  c.poly([[2, 30], [8, 25], [14, 30]], CRT[2]);
  // a hand holding his
  c.ellipse(30, 40, 3, 2, CRT[6]); c.ellipse(34, 41, 3, 2, CRT[5]); c.line(36, 41, 46, 30, CRT[4]);
  // a candle
  c.rect(72, 42, 3, 8, CRT[6]); c.ellipse(73, 39 - f, 1, 2, CRT[7]);
  // what he's thinking about: a sea chest, and where it is
  for (const [x, y, r] of [[30, 24, 1], [36, 18, 2]]) c.ellipse(x, y, r, r, CRT[4]);
  c.ellipse(70, 14, 28, 12, CRT[3]);
  c.rect(58, 10, 18, 9, CRT[5]); c.rect(58, 7, 18, 3, CRT[6]); c.rect(66, 9, 3, 3, CRT[7]);
  t(c, 'GREYHOOK', 70, 19, CRT[7]);
  return crt(c, f);
}

function docWatching(f) {
  const c = screen(CRT[1]);
  rays(c, W / 2, 34, 8, CRT[2], 0);
  // the studio's own picture: an empty armchair, a lamp
  c.rect(36, 30, 32, 26, CRT[3]); c.rect(32, 44, 40, 12, CRT[4]); c.rect(38, 32, 28, 12, CRT[2]);
  c.vline(84, 20, 56, CRT[4]); c.poly([[78, 20], [90, 20], [87, 14], [81, 14]], CRT[6]);
  // and over it, in the glass, the three of them watching: a crown, a tricorn, a broad hat
  const ghost = (x, hat) => {
    for (let y = 0; y < 30; y++) for (let k = -7; k <= 7; k++) if ((y + k) % 3 === 0) c.blend(x + k, 40 + y, CRT[7], 0.18);
    c.ellipse(x, 34, 6, 6, CRT[5]);
    if (hat === 'crown') crown(c, x - 6, 22, 1, CRT[6]);
    if (hat === 'tricorn') { c.poly([[x - 12, 30], [x, 23], [x + 12, 30]], CRT[2]); c.hline(x - 10, x + 10, 30, CRT[5]); }
    if (hat === 'broad') { c.hline(x - 9, x + 9, 29, CRT[4]); c.rect(x - 5, 24, 10, 5, CRT[4]); }
  };
  ghost(18, 'tricorn'); ghost(52, 'crown'); ghost(86, 'broad');
  if (f) { c.rect(74, 2, 26, 12, CRT[0]); t(c, '...?', 87, 4, CRT[7]); }
  return crt(c, f);
}

function docEnd(f) {
  const c = card('THANK YOU', 'FOR WATCHING', f);
  t(c, 'ALL THREE OF YOU', W / 2, 60, CRT[6]);
  return crt(c, f);
}

// --- THE LATE-NIGHT SHARKSTORM SPECIAL ---------------------------------------------------------------------------------------

function bbkTitle(f) {
  const c = screen(CRT[2]);
  rays(c, W / 2, 40, 14, CRT[3], f);
  crown(c, W / 2 - 12, 2, 2, CRT[7]);
  c.rect(4, 24, W - 8, 34, CRT[0]);
  t(c, 'LATE-NIGHT', W / 2, 27, CRT[6]);
  t(c, 'SHARKSTORM', W / 2, 37, CRT[7]);
  t(c, 'SPECIAL!', W / 2, 47, f ? CRT[7] : CRT[6]);
  for (let x = 4; x < W; x += 16) chest(c, x, 68, 12);
  return crt(c, f);
}

function bbkBand(f) {
  const c = screen(CRT[1]);
  ground(c, 60, CRT[2]);
  for (const [k, x] of [10, 34, 58, 82].entries()) hammerhead(c, x, 26 + ((k + f) % 2) * 2, (k + f) % 2);
  for (const [x, y] of [[24, 10], [50, 6], [74, 12]]) note(c, x + f * 2, y - f);
  t(c, 'THE HAMMERHEADS', W / 2, 64, CRT[6]);
  return crt(c, f);
}

function bbkDesk(f) {
  const c = screen(CRT[1]);
  // the set: treasure chests, stacked to the ceiling
  for (let row = 0; row < 3; row++) for (let k = 0; k < 6; k++) chest(c, k * 18 - (row % 2) * 9, 14 + row * 14, 16);
  host(c, f, { y: -2 });
  deskFront(c, 58);
  return crt(c, f);
}

function bbkCartoon(f) {
  const c = screen(CRT[1]);
  ground(c, 62, CRT[2]);
  cartoonCard(c, 24, 22, 'tricorn', f);
  cartoonCard(c, 52, 16, 'crown', f, { big: true });
  cartoonCard(c, 80, 22, 'broad', f);
  t(c, f ? 'THREE!' : 'CARDBOARD', W / 2, 2, CRT[7]);
  return crt(c, f);
}

function bbkMaybe(f) {
  const c = screen(CRT[1]);
  c.rect(10, 4, 84, 62, CRT[6]); c.rect(12, 6, 80, 58, CRT[7]);
  c.rect(12, 6, 80, 10, CRT[3]); t(c, 'MAYBE', W / 2, 8, CRT[7]);
  // in the column: a storm (a swirl, with a crown on it), a question mark
  for (let a = 0; a < 18; a += 0.4) c.set(Math.round(40 + Math.cos(a) * a * 0.9), Math.round(40 + Math.sin(a) * a * 0.6), CRT[2]);
  crown(c, 34, 22, 1, CRT[3]);
  t(c, '?', 74, 34, CRT[2]);
  // the host's fin, poking in at the side
  c.poly([[96, 78], [100, 54 - f * 2], [104, 78]], CRT[4]);
  return crt(c, f);
}

function bbkMinutes(f) {
  const c = screen(CRT[1]);
  c.rect(4, 4, W - 8, 12, CRT[0]); t(c, 'CAPTAIN MINUTES', W / 2, 6, CRT[7]);
  for (let y = 22; y < 70; y += 8) c.hline(10, W - 10, y, CRT[2]);
  c.vline(10, 20, 70, CRT[5]); c.hline(10, W - 10, 70, CRT[5]);
  const pts = [[12, 66], [28, 60], [40, 62], [54, 48], [66, 50], [80, 34], [92, f ? 18 : 24]];
  for (let i = 1; i < pts.length; i++) c.thickLine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 2, CRT[7]);
  c.poly([[88, pts[6][1] - 2], [96, pts[6][1] - 6], [94, pts[6][1] + 3]], CRT[7]);
  return crt(c, f);
}

function bbkChicken(f) {
  const c = screen(CRT[0]);
  c.poly([[46, 0], [58, 0], [86, 70], [18, 70]], CRT[2]); // the spotlight
  c.ellipse(W / 2, 70, 34, 5, CRT[3]);
  hen(c, W / 2, 56 - f, { s: 2 });
  for (const [x, y] of [[20, 14], [84, 10], [16, 44], [90, 40]]) { c.set(x, y + f, CRT[7]); c.set(x - 1, y + 1 + f, CRT[5]); c.set(x + 1, y + 1 + f, CRT[5]); }
  return crt(c, f);
}

function bbkAudience(f) {
  const c = screen(CRT[0]);
  for (let row = 0; row < 4; row++) {
    for (let k = 0; k < 9; k++) {
      const x = k * 12 + (row % 2) * 6 + 2;
      const y = 22 + row * 14 + ((k + row + f) % 2) * 2;
      c.poly([[x, y + 10], [x + 4, y], [x + 8, y + 10]], row % 2 ? CRT[3] : CRT[4]);
      if ((k + f) % 3 === 0) { c.set(x + 9, y + 1, CRT[7]); c.set(x - 1, y + 1, CRT[7]); } // clapping
    }
  }
  t(c, 'APPLAUSE', W / 2, 4, f ? CRT[7] : CRT[5]);
  return crt(c, f);
}

function bbkCorrespondents(f) {
  const c = screen(CRT[1]);
  // the galley, as the King's cameras imagine it: a stove, a pot, a shelf
  c.rect(0, 50, W, H - 50, CRT[2]);
  c.rect(8, 30, 30, 20, CRT[3]); c.rect(12, 34, 22, 8, CRT[0]); c.ellipse(22, 26, 8, 4, CRT[4]);
  c.hline(46, 98, 20, CRT[4]); for (const x of [50, 62, 74, 86]) c.rect(x, 12, 6, 8, CRT[5]);
  // the corner: LIVE, two of them waving, a ladle and a spoon for microphones
  c.rect(50, 30, 52, 40, CRT[7]); c.rect(52, 32, 48, 36, CRT[1]);
  c.rect(52, 32, 18, 8, CRT[0]); t(c, 'LIVE', 61, 33, CRT[7]);
  person(c, 64, 44, { col: CRT[4], flee: f ? 1 : -1 });
  person(c, 86, 44, { col: CRT[3], hat: 'brim', flee: f ? -1 : 1 });
  c.line(60, 50, 56, 46, CRT[6]); c.ellipse(55, 45, 2, 2, CRT[6]); // the ladle
  c.line(90, 50, 94, 47, CRT[6]); c.ellipse(95, 46, 1, 1, CRT[6]); // the spoon
  return crt(c, f);
}

// --- the reincarnation (full size, in the hold's corridor) ------------------------------------------------------------------

const RW = 120;
const RH = 160;

/** Nearest-neighbour scale. */
function scaled(src, k) {
  const out = new PixelCanvas(src.width * k, src.height * k);
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    const v = src.get(Math.floor(x / k), Math.floor(y / k));
    if (v >>> 24) out.set(x, y, v);
  }
  return out;
}

function wisp(c, cx, cy, rx, ry, a0, len, col, alpha) {
  for (let a = a0; a < a0 + len; a += 0.05) {
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    for (let k = -2; k <= 2; k++) c.blend(x, y + k, col, alpha * (1 - Math.abs(k) / 3));
  }
}

function reinc(who, stage) {
  const c = new PixelCanvas(RW, RH);
  const r = rng(who === 'ledger' ? 1701 : 1702);
  let fig;
  if (stage < 2) fig = scaled(paintCutoutProp(who), 3);
  else {
    const sheet = paintCrewSheet({ who });
    fig = scaled(sheet.frames.wake_down_3 ?? sheet.frames.idle_down_0, 3);
  }
  const fx = Math.round(RW / 2 - fig.width / 2);
  const fy = RH - 2 - fig.height;
  if (stage === 0) {
    // the plume going round the card, reading the nameplate
    wisp(c, RW / 2, RH - 70, 54, 22, Math.PI * 1.0, Math.PI * 0.9, PLUME[1], 0.55);
  }
  c.blit(fig, fx, fy);
  if (stage === 0) {
    wisp(c, RW / 2, RH - 70, 54, 22, 0, Math.PI * 0.9, PLUME[2], 0.6);
    wisp(c, RW / 2, RH - 30, 46, 10, 0.4, Math.PI * 0.8, PLUME[0], 0.5);
  }
  if (stage === 1) {
    // the plume pouring into the card: the print glows, streaks run in from the edges
    for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) if (c.alphaAt(x, y)) c.blend(x, y, PLUME[3], 0.22);
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2;
      const d0 = 50 + r() * 10;
      const d1 = 18 + r() * 10;
      const cx = RW / 2;
      const cy = RH - 76;
      for (let s = 0; s < 1; s += 0.08) {
        const d = d0 + (d1 - d0) * s;
        c.blend(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, PLUME[i % 4], 0.5 * s + 0.2);
      }
    }
  }
  if (stage === 2) {
    // what's left of it, curling off the edges of the card
    for (let i = 0; i < 6; i++) {
      const x = fx + 8 + Math.floor(r() * (fig.width - 16));
      const y = fy + 10 + Math.floor(r() * 40);
      c.blend(x, y, PLUME[2], 0.45); c.blend(x + 1, y - 1, PLUME[3], 0.35); c.blend(x + 2, y - 3, PLUME[2], 0.25);
    }
  }
  return c;
}

// --- the Fire-Sharkstorm, and the second Chicken-Town ---------------------------------------------------------------------

function fireStorm(f) {
  const c = spoutWall(f % 3).clone();
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) c.blend(x, y, FIRE[2], 0.1 + (y / c.height) * 0.08);
  // rings of flame going round the vortex: a glowing band, and tongues of fire along it, flickering between frames
  for (const [rr, k] of [[46, 0], [84, 1], [124, 2], [166, 3]]) {
    const turn = f * 0.09 * (k % 2 ? -1 : 1);
    for (let a = 0; a < Math.PI * 2; a += 0.004) {
      const x = 160 + Math.cos(a + turn) * rr * 1.25;
      const y = 112 + Math.sin(a + turn) * rr * 0.5;
      for (let j = -3; j <= 3; j++) c.blend(x, y + j, FIRE[2], 0.3 * (1 - Math.abs(j) / 4));
    }
    for (let a = 0; a < Math.PI * 2; a += 0.01) {
      const x = Math.round(160 + Math.cos(a + turn) * rr * 1.25);
      const y = Math.round(112 + Math.sin(a + turn) * rr * 0.5);
      const flick = Math.sin(a * 31 + f * 2.1 + k) * 0.6 + Math.sin(a * 9 - f * 1.3) * 0.6 + 0.3;
      if (flick <= 0) continue;
      const h = 1 + Math.round(flick * 4);
      for (let j = 0; j < h; j++) c.set(x, y - j, FIRE[Math.max(1, Math.min(4, h - j))]);
    }
  }
  // the sharks going round in it, lit gold from underneath, very surprised
  const r = rng(1717 + f);
  for (let i = 0; i < 9; i++) {
    const x = 30 + Math.floor(r() * 260);
    const y = 30 + Math.floor(r() * 160);
    c.ellipse(x, y, 9, 3, '#5a6a80'); c.ellipse(x, y + 2, 7, 1.5, FIRE[3]);
    c.poly([[x + 7, y], [x + 13, y - 4], [x + 13, y + 4]], '#3a4658');
    c.poly([[x - 1, y - 2], [x + 2, y - 6], [x + 4, y - 2]], '#3a4658');
    c.set(x - 6, y - 1, '#ffffff'); c.set(x - 5, y - 1, '#0a0a10');
  }
  return c;
}

function chickenTown2(f) {
  const c = fireStorm(f);
  const r = rng(1730);
  // green, soft and enormous, rolling in from below and putting the rings out
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * 340) - 10;
    const y = 130 + Math.floor(r() * 110) - f * 10;
    const rx = 18 + Math.floor(r() * 26);
    for (let yy = -rx; yy <= rx; yy++) for (let xx = -rx; xx <= rx; xx++) {
      const d = (xx * xx) / (rx * rx) + (yy * yy) / (rx * rx * 0.45);
      if (d <= 1) c.blend(x + xx, y + yy * 0.6, i % 3 ? '#9cc070' : '#c0dc90', 0.32 * (1 - d * 0.6));
    }
  }
  // the flames that are left going green at the edges and out
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const v = c.get(x, y);
    const red = v & 0xff;
    const green = (v >> 8) & 0xff;
    if (red > 200 && green < 190) c.blend(x, y, f ? '#7aa850' : '#d8c060', 0.6);
  }
  return c;
}

// --- the old quarters, before and after the Coffin Sock --------------------------------------------------------------------

function quarters(after) {
  const c = new PixelCanvas(320, 224);
  c.fill('#2a1c12');
  for (let x = 0; x < 320; x += 16) { c.vline(x, 0, 150, '#1e140c'); c.vline(x + 1, 0, 150, '#3a2818'); }
  c.rect(0, 150, 320, 74, '#4a3220');
  for (let y = 156; y < 224; y += 9) c.hline(0, 319, y, '#3a2618');
  c.rect(0, 10, 320, 8, '#1e140c');
  // the porthole
  c.ellipse(160, 60, 22, 22, '#8a6418'); c.ellipse(160, 60, 17, 17, after ? '#3a3420' : '#24352e');
  // sashes hung from the beam: soft and down before, snapped out flat after
  const SC = ['#c8242c', '#e8545a', '#8a141c', '#f4dc6c'];
  for (let k = 0; k < 12; k++) {
    const x0 = 12 + k * 26;
    if (x0 > 130 && x0 < 190) continue;
    const col = SC[k % 4];
    if (!after) {
      for (let y = 18; y < 110; y++) { const x = Math.round(x0 + Math.sin(y * 0.08 + k) * 3); c.hline(x, x + 4, y, col); }
    } else {
      for (let x = 0; x < 34; x++) { const y = Math.round(20 + Math.sin(x * 0.5) * 1.5); c.vline(x0 + x, y, y + 4, col); }
    }
  }
  // cushions on the floor; the crew on them (backs to us)
  const crew = [[50, 'tricorn'], [94, 'crown'], [140, 'tricorn'], [186, 'broad'], [230, 'none'], [272, 'hat']];
  for (const [i, [x, hat]] of crew.entries()) {
    const lean = after ? (i % 2 ? -8 : 8) : 0;
    c.ellipse(x, 196, 22, 8, i % 2 ? '#7a3a5a' : '#3a5a7a');
    c.rect(x - 10 + lean, 156, 20, 36, '#1e1820');
    c.ellipse(x + lean * 1.4, 148, 10, 10, '#2a2228');
    if (hat === 'tricorn') c.poly([[x - 16 + lean, 142], [x + lean, 132], [x + 16 + lean, 142]], '#141018');
    if (hat === 'crown') for (const dx of [-6, 0, 6]) c.poly([[x + dx - 3 + lean, 140], [x + dx + lean, 130], [x + dx + 3 + lean, 140]], '#e0b030');
    if (hat === 'broad') { c.rect(x - 13 + lean, 138, 26, 3, '#3a6a3a'); c.rect(x - 7 + lean, 132, 14, 6, '#3a6a3a'); }
    if (hat === 'hat') c.rect(x - 8 + lean, 134, 16, 8, '#5a3a20');
    if (after) for (const s of [-1, 1]) c.line(x + lean + s * 10, 160, x + lean + s * 22, 146, '#1e1820'); // arms up
  }
  // a chicken, asleep on a cushion, three decks down (a small drawing on the wall: Brogath's, of her)
  c.rect(250, 70, 30, 24, '#e8dcc0'); c.ellipse(265, 84, 7, 5, '#c88a48'); c.ellipse(270, 79, 3, 3, '#c88a48'); c.set(272, 76, '#d84a4a');
  if (after) { c.line(250, 70, 280, 94, '#5a4a2a'); }
  // the air
  const haze = after ? '#7a6c4a' : '#9cc070';
  for (let y = 0; y < 224; y++) for (let x = 0; x < 320; x++) {
    const wave = Math.sin(x * 0.03 + y * 0.05) + Math.sin(x * 0.011 - y * 0.02);
    c.blend(x, y, haze, (after ? 0.5 : 0.22) + wave * (after ? 0.08 : 0.04));
  }
  if (after) {
    const r = rng(1799);
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(r() * 320);
      const y = Math.floor(r() * 200);
      c.rect(x, y, 6, 4, '#f4ecd8'); c.hline(x + 1, x + 4, y + 1, '#8a7a6a'); // papers, flying
    }
    for (let i = 0; i < 24; i++) c.ellipse(Math.floor(r() * 320), Math.floor(r() * 224), 14, 6, '#4a3e26');
  }
  c.outline(INK);
  return c;
}

const PAIRS = {
  doc17_title: docTitle, doc17_after: docAfter, doc17_ledger: docLedger, doc17_tilda: docTilda, doc17_chair: docChair,
  doc17_years: docYears, doc17_ledger_end: docLedgerEnd, doc17_watching: docWatching, doc17_end: docEnd,
  bbk17_title: bbkTitle, bbk17_band: bbkBand, bbk17_desk: bbkDesk, bbk17_cartoon: bbkCartoon, bbk17_maybe: bbkMaybe,
  bbk17_minutes: bbkMinutes, bbk17_chicken: bbkChicken, bbk17_audience: bbkAudience, bbk17_correspondents: bbkCorrespondents,
};
const SINGLE = {
  ...Object.fromEntries([0, 1, 2].flatMap((s) => [[`reinc_ledger_${s}`, () => reinc('ledger', s)], [`reinc_tilda_${s}`, () => reinc('tilda', s)]])),
  ...Object.fromEntries([0, 1, 2].map((f) => [`fire_storm_${f}`, () => fireStorm(f)])),
  ct2_0: () => chickenTown2(0), ct2_1: () => chickenTown2(1),
  cs_before_0: () => quarters(false), cs_after_0: () => quarters(true),
};

export function addPhase17VistaFrames(atlas) {
  for (const [id, fn] of Object.entries(PAIRS)) for (const f of [0, 1]) atlas.add(`${id}_${f}`, fn(f));
  for (const [id, fn] of Object.entries(SINGLE)) atlas.add(id, fn());
}

export const PHASE17_VISTA_FRAMES = [...Object.keys(SINGLE), ...Object.keys(PAIRS).flatMap((n) => [`${n}_0`, `${n}_1`])];

void brogath;
