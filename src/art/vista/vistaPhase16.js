import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { drawText } from '../font/drawText.js';
import { SES_SCREEN, SES_BEZEL, rng } from './sesArt.js';
import { CRT, crt, screen } from './vistaPhase6.js';
import { crown, brogath, rays } from './vistaPhase11.js';
import { page, cray, blob, label, figure, C } from './vistaLegend.js';

/**
 * Pictures for Story Phase 16 (THE GRAND LIGHTER), all original:
 *   - on the Mark II: CHEAP-O-RAMA's advert for THE GRAND STENCHMASTER'S GRAND LIGHTER OF GRAND SMOKES, with Cheapy the
 *     Cheapskate Clown (a lanky fellow in a purple and gold checked suit, a bowler with the price tag still on it, a
 *     coupon for a bow tie: his own design, nobody else's);
 *   - on the portable set: BEFORE THE GRAND LIGHTER, a documentary (the ceremonial Fire-Waft, the Bureau of Ceremonial
 *     Ignition and its 97 pages, Cheapy's 'invention');
 *   - the lore book (Garrick's crayon): the Great Search for Fire of long ago, the Emergency Light, the lighter's history;
 *   - the portable set's own cabinet (purple, crooked, a fork for an aerial, two tubes showing, stickers);
 *   - the Grand Ignition Council's chamber, and the pressure gauge Vindicta's patience is measured on.
 * Every screen frame comes in two. No flashing: the gauge climbs a notch at a time.
 */
const W = SES_SCREEN.w;
const H = SES_SCREEN.h;
const INK = PAL.ink;
const t = (c, s, x, y, col = CRT[7], opts = {}) => drawText(c, s, x, y, col, { center: true, ...opts });

/** Cheapy the Cheapskate Clown, on screen (green CRT shades). (x, y) is the top of his bowler. */
function cheapy(c, x, y, { wave = 0, grin = true } = {}) {
  c.rect(x - 6, y, 12, 6, CRT[2]); c.hline(x - 9, x + 9, y + 6, CRT[2]); // the bowler
  c.rect(x + 6, y + 1, 5, 3, CRT[7]); c.set(x + 8, y + 2, CRT[2]); // the price tag, still on
  c.ellipse(x, y + 13, 7, 7, CRT[6]); // the face
  c.set(x - 3, y + 11, CRT[0]); c.set(x + 3, y + 11, CRT[0]);
  if (grin) c.hline(x - 4, x + 4, y + 16, CRT[0]); else c.ellipse(x, y + 16, 2, 2, CRT[0]);
  c.rect(x - 5, y + 20, 10, 3, CRT[7]); // the coupon bow tie
  for (let k = -4; k < 5; k += 2) c.set(x + k, y + 21, CRT[3]);
  for (let j = 0; j < 22; j++) for (let i = -7; i < 7; i++) c.set(x + i, y + 24 + j, ((i >> 1) + (j >> 1)) % 2 ? CRT[4] : CRT[5]); // the checked suit
  c.line(x + 7, y + 26, x + 14, y + 18 - wave * 4, CRT[5]); // the waving arm
  c.line(x - 7, y + 26, x - 12, y + 36, CRT[5]);
  c.vline(x - 3, y + 46, y + 54, CRT[3]); c.vline(x + 3, y + 46, y + 54, CRT[3]);
  c.hline(x - 8, x - 2, y + 55, CRT[2]); c.hline(x + 2, x + 8, y + 55, CRT[2]); // long shoes
}
/** The lighter, big, on screen. */
function bigLighter(c, x, y, { flame = 0 } = {}) {
  c.rect(x, y + 8, 14, 22, CRT[3]); c.rect(x + 2, y + 10, 10, 18, CRT[4]);
  c.hline(x + 2, x + 11, y + 22, CRT[6]); c.hline(x + 2, x + 11, y + 25, CRT[6]);
  c.rect(x + 3, y + 4, 8, 4, CRT[5]);
  if (flame === 1) { c.ellipse(x + 7, y, 3, 4, CRT[7]); c.ellipse(x + 7, y + 1, 1, 2, CRT[5]); }
  if (flame === 2) for (let i = 0; i < 4; i++) c.ellipse(x + 7 + i * 3, y - i * 4, 2 + i, 2 + i * 0.6, CRT[3]); // a brown puff
}

function cheapyLogo(f) {
  const c = screen(CRT[2]);
  rays(c, W / 2, 40, 12, CRT[3], f);
  t(c, 'CHEAP-O-RAMA!', W / 2, 8, CRT[7]);
  cheapy(c, W / 2, 20, { wave: f });
  return crt(c, f);
}
function cheapyLighter(f) {
  const c = screen(CRT[1]);
  cheapy(c, 28, 14, { wave: 0 });
  bigLighter(c, 64, 28, { flame: 0 });
  t(c, 'NOW WITH', 74, 6, CRT[6]); t(c, 'GRANDNESS!', 74, 16, CRT[7]);
  if (f) for (const [x, y] of [[58, 30], [86, 34], [60, 56]]) c.set(x, y, CRT[7]);
  return crt(c, f);
}
function cheapyClick(f) {
  const c = screen(CRT[1]);
  cheapy(c, 28, 14, { grin: !f });
  bigLighter(c, 64, 28, { flame: f ? 2 : 0 });
  t(c, f ? '...PUFF.' : 'CLICK!', 74, 64, CRT[6]);
  return crt(c, f);
}
function cheapyGrand(f) {
  const c = screen(CRT[2]);
  bigLighter(c, W / 2 - 7, 22, { flame: 1 });
  t(c, 'WORKS SOMETIMES!', W / 2, 4, CRT[7]);
  t(c, f ? '*SOMETIMES' : 'ASK FOR CHEAPY', W / 2, 62, CRT[6]);
  return crt(c, f);
}

// --- the documentary: BEFORE THE GRAND LIGHTER ------------------------------------------------------------------------
function docTitle(f) {
  const c = screen(CRT[1]);
  rays(c, W / 2, 38, 10, CRT[2], f);
  c.rect(6, 22, W - 12, 28, CRT[0]);
  t(c, 'BEFORE THE', W / 2, 26); t(c, 'GRAND LIGHTER', W / 2, 38, CRT[6]);
  return crt(c, f);
}
function docFireWaft(f) {
  const c = screen(CRT[1]);
  c.rect(0, 60, W, H - 60, CRT[2]);
  brogath(c, 20, 18, { sash: 'none', blush: false });
  crown(c, 74, 10, 2, CRT[6]);
  // a very small, very ceremonial flame, a very long way from anybody
  for (let i = 0; i < 6; i++) c.ellipse(46 + i * 6, 44 - (i % 2) * 2 - f, 3, 2, CRT[4]);
  c.ellipse(86, 40, 2, 3 + f, CRT[7]);
  t(c, 'THE FIRE-WAFT', W / 2, 66, CRT[6]);
  return crt(c, f);
}
function docBureau(f) {
  const c = screen(CRT[1]);
  c.rect(0, 58, W, H - 58, CRT[2]);
  // a desk, and a stack of forms that goes off the top of the screen
  c.rect(30, 42, 44, 16, CRT[3]);
  for (let y = 0; y < 42; y += 3) c.rect(42 + ((y + f) % 4), y, 20, 2, y % 6 ? CRT[6] : CRT[7]);
  t(c, '97 PAGES', W / 2, 64, CRT[6]);
  return crt(c, f);
}
function docCheapy(f) {
  const c = screen(CRT[1]);
  cheapy(c, 30, 12, { wave: f });
  bigLighter(c, 66, 26, { flame: f });
  t(c, 'MECHANICAL!', 74, 6, CRT[7]);
  t(c, '(MOSTLY)', 74, 64, CRT[6]);
  return crt(c, f);
}

// --- the lore book (Garrick's crayon) -------------------------------------------------------------------------------------
function legFireSearch() {
  const c = page(161);
  // a whole crew turning a ship upside down for one match; the match is in the captain's hat
  for (let k = 0; k < 4; k++) figure(c, 24 + k * 34, 52, { body: [C.blue, C.red, C.green, C.purple][k], arms: 'up' });
  blob(c, 150, 40, 8, 4, C.brown, 2);
  cray(c, 150, 30, 152, 38, C.orange, 3);
  label(c, 'THE GREAT SEARCH FOR FIRE', 4, C.burg);
  label(c, '(IT WAS IN HIS HAT)');
  return c;
}
function legLight1() {
  const c = page(162);
  blob(c, 60, 66, 18, 16, C.mustard, 1); blob(c, 60, 44, 8, 8, C.pink, 2);
  for (let k = 0; k < 5; k++) blob(c, 88 + k * 10, 64 - k * 2, 4, 3, C.bile, k);
  blob(c, 142, 54, 3, 5, C.orange, 9);
  label(c, 'THE EMERGENCY LIGHT', 4, C.burg);
  label(c, 'VERY GRAND. VERY FAR AWAY.');
  return c;
}
function legLight2() {
  const c = page(163);
  for (let i = 0; i < 6; i++) c.rect(40 + i * 3, 20 + i * 8, 90, 7, i % 2 ? C.paperD : '#ffffff');
  for (let i = 0; i < 6; i++) cray(c, 46 + i * 3, 23 + i * 8, 120 + i * 3, 23 + i * 8, C.grey, i);
  label(c, 'THE BUREAU OF CEREMONIAL IGNITION', 4, C.burg);
  label(c, 'NINETY-SEVEN PAGES. PER CIGAR.');
  return c;
}
function legLight3() {
  const c = page(164);
  figure(c, 50, 50, { body: C.purple, hat: 'top' });
  c.rect(100, 46, 14, 26, C.purple); c.rect(102, 48, 10, 4, C.yellow);
  blob(c, 107, 40, 3, 4, C.orange, 5);
  label(c, 'CHEAPY INVENTS THE GRAND LIGHTER', 4, C.burg);
  label(c, 'IT WORKED ONCE. ON TELEVISION.');
  return c;
}

// --- the portable set ------------------------------------------------------------------------------------------------------
const { x: SX, y: SY, w: SW, h: SH } = SES_SCREEN;
function portableBezel() {
  const c = new PixelCanvas(SES_BEZEL.w, SES_BEZEL.h);
  // a small crooked purple cabinet: the whole thing leans a pixel every eight rows
  for (let y = 14; y < 136; y++) {
    const lean = Math.floor((y - 14) / 16);
    for (let x = 30 + lean; x < 178 + lean; x++) {
      let col = '#5a3278';
      if (y < 18 || x < 34 + lean) col = '#7a4a9a';
      if (y > 131 || x > 173 + lean) col = '#3a1e52';
      c.set(x, y, col);
    }
  }
  for (let y = SY - 4; y < SY + SH + 4; y++) for (let x = SX - 4; x < SX + SW + 4; x++) c.set(x, y, '#e0c050');
  for (let y = SY; y < SY + SH; y++) for (let x = SX; x < SX + SW; x++) c.set(x, y, '#00000000');
  // a fork for an aerial, slightly bent
  c.rect(102, 0, 3, 14, '#c8ccd4'); for (const dx of [-2, 0, 2]) c.vline(103 + dx, 0, 4, '#a8acb4');
  c.line(104, 0, 112, -2, '#c8ccd4');
  // two tubes showing out of the top, mismatched knobs, stickers
  c.ellipse(60, 13, 4, 5, '#e8a040'); c.ellipse(72, 13, 3, 5, '#c8c8a0');
  c.ellipse(166, 50, 6, 6, '#e0c050'); c.ellipse(164, 76, 4, 4, '#a8a8b0'); c.ellipse(167, 98, 5, 5, '#c84a3a');
  c.rect(38, 108, 50, 12, '#f4dc6c'); drawText(c, 'GRAND TRAVEL', 63, 111, '#3a1e52', { center: true });
  c.rect(96, 110, 40, 10, '#e8545a'); drawText(c, 'NO!', 116, 112, '#ffffff', { center: true });
  c.outline(INK);
  return c;
}

// --- the Grand Ignition Council ---------------------------------------------------------------------------------------------
function councilBg() {
  const c = new PixelCanvas(320, 224);
  c.fill('#140c18');
  const r = rng(1604);
  for (let i = 0; i < 160; i++) c.set(Math.floor(r() * 320), Math.floor(r() * 120), '#2a1e34');
  // pillars of old stone
  for (const x of [20, 280]) { c.rect(x, 20, 24, 170, '#4a4050'); c.rect(x + 3, 20, 4, 170, '#6a6070'); }
  // the bench, very high
  c.rect(60, 96, 200, 50, '#4a2a18'); c.rect(60, 96, 200, 6, '#7a4a28'); c.hline(60, 259, 145, '#2a160c');
  // three councillors: spectral, robed, each with a tiny ceremonial candle (unlit)
  for (const [x, col] of [[100, '#6a5a8a'], [160, '#7a3a5a'], [220, '#5a6a8a']]) {
    c.ellipse(x, 66, 10, 11, '#c8c0d8'); c.set(x - 4, 64, '#2a1e34'); c.set(x + 4, 64, '#2a1e34');
    c.rect(x - 16, 76, 32, 22, col);
    c.rect(x - 2, 46, 4, 6, '#e0d8b0');
  }
  crown(c, 148, 40, 3, '#e0c050');
  // the advocate's lectern, front and centre
  c.rect(140, 176, 40, 40, '#6a3a1c'); c.rect(136, 172, 48, 6, '#8a5228');
  drawText(c, 'THE GRAND IGNITION COUNCIL', 160, 152, '#e0c050', { center: true });
  c.outline(INK);
  return c;
}
/** Vindicta's pressure, on a brass gauge: n of 0..5. */
function vGauge(n) {
  const c = new PixelCanvas(64, 64);
  c.ellipse(32, 32, 30, 30, '#8a6418'); c.ellipse(32, 32, 26, 26, '#f4ecd8');
  for (let k = 0; k <= 5; k++) {
    const a = Math.PI * (0.8 + k * 0.28);
    c.line(32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20, 32 + Math.cos(a) * 25, 32 + Math.sin(a) * 25, k >= 4 ? '#c8242c' : '#3a2a1a');
  }
  const a = Math.PI * (0.8 + n * 0.28);
  c.thickLine(32, 32, 32 + Math.cos(a) * 21, 32 + Math.sin(a) * 21, 2, '#a8241c');
  c.ellipse(32, 32, 3, 3, '#3a2a1a');
  drawText(c, 'VINDICTA', 32, 44, n >= 4 ? '#a8241c' : '#3a2a1a', { center: true });
  c.outline(INK);
  return c;
}

const PAIRS = {
  cheapy_logo: cheapyLogo, cheapy_lighter: cheapyLighter, cheapy_click: cheapyClick, cheapy_grand: cheapyGrand,
  doc_title: docTitle, doc_firewaft: docFireWaft, doc_bureau: docBureau, doc_cheapy: docCheapy,
};
const SINGLE = {
  leg_fire_search: legFireSearch, leg_light_1: legLight1, leg_light_2: legLight2, leg_light_3: legLight3,
  portable_bezel: portableBezel, council_bg: councilBg,
  ...Object.fromEntries([0, 1, 2, 3, 4, 5].map((n) => [`vgauge_${n}`, () => vGauge(n)])),
};

export function addPhase16VistaFrames(atlas) {
  for (const [id, fn] of Object.entries(PAIRS)) for (const f of [0, 1]) atlas.add(`${id}_${f}`, fn(f));
  for (const [id, fn] of Object.entries(SINGLE)) atlas.add(id, fn());
}

export const PHASE16_VISTA_FRAMES = [...Object.keys(SINGLE), ...Object.keys(PAIRS).flatMap((n) => [`${n}_0`, `${n}_1`])];
