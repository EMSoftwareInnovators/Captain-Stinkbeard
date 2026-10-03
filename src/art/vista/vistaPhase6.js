import { PixelCanvas } from '../PixelCanvas.js';
import { PAL, mix } from '../palette.js';
import { drawText } from '../font/drawText.js';
import { SES_SCREEN, rng, bezel, back, staticFrame, garrickBack } from './sesArt.js';
import { revengeBitten } from './vistaPhase4.js';

/**
 * Vista art for Story Phase 6 (The Death Rattle of the Stenchmaster
 * Entertainment System; The Midnight Stenchmaster Catastrophe):
 *
 *   - The Frog Tax Man: the S.E.S.'s first recurring programme, all original.
 *     Franklin (a frog in a tie and glasses) in trouble with his taxes, his
 *     accountant (green visor, sleeve garters), a judge (a frog in a wig).
 *     Painted the way the S.E.S. shows everything: crude green CRT, a rolling
 *     bar, colour bleeding off the edges.
 *   - The set dying: dark tubes, a sullen red glow, the red light, the fork
 *     it throws; then after the shark: cracked glass, bites, soot, a bent
 *     aerial. The glass is only ever cracked from outside; nothing inside it
 *     is ever shown open.
 *   - The night of the catastrophe: the Revenge at night, inflated, venting
 *     yellow from every seam, firing a broadside into empty sea; the second,
 *     garlic-sharp cloud.
 *   - The Great Sharkstorm: a whirlpool base, a turning column of sea,
 *     sharks, timber and yellow fume (sharks orbit it as vista orbit layers),
 *     lightning, the barrels of concentrated Frog Grog thrown into it and
 *     what they do; and the same storm, small, far off on the horizon.
 */
const INK = PAL.ink;
const W = SES_SCREEN.w;
const H = SES_SCREEN.h;
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// The S.E.S. shows everything in a sickly CRT green.
export const CRT = ['#06140a', '#0e2a14', '#1c4422', '#2e6a32', '#4a9a44', '#7ac860', '#b8f090', '#e8ffd0'];
const SHARK = ['#2e3a4c', '#4a5a70', '#7a8aa0', '#c8d0dc'];
const FUME = ['#8a7a20', '#b8a838', '#d8c048', '#f4e67a'];
const GARLIC = ['#7a8a28', '#a8b040', '#d0d468', '#f4f4b0'];
const GROGC = ['#2a3a10', '#4a6a1c', '#7aa02c', '#b8e050', '#e8ff90'];

// ---------------------------------------------------------------------------
// The Frog Tax Man

/** Paints the green CRT treatment over a finished picture: rolling bar, bleed, vignette. */
export function crt(c, f) {
  const bar = (f * 31 + 17) % H;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - W / 2) / (W * 0.62), (y - H / 2) / (H * 0.62));
      if (d > 0.8) c.blend(x, y, '#000000', Math.min(0.6, (d - 0.8) * 2.5));
    }
    if (Math.abs(y - bar) < 3) for (let x = 0; x < W; x++) c.blend(x, y, CRT[7], 0.18);
    if (y % 2) for (let x = 0; x < W; x++) c.blend(x, y, '#000000', 0.12);
  }
  // colour bleeding off the left edge (the picture is never quite in register)
  for (let y = 0; y < H; y += 3) c.blend(1, y, '#ff5aa0', 0.5);
  return c;
}

export function screen(bg = CRT[1]) {
  const c = new PixelCanvas(W, H);
  c.fill(bg);
  return c;
}

/**
 * Franklin the frog, sitting up. (x, y) is the top of his head; `s` 1 or 2.
 * mouth: 'shut' | 'open' | 'tongue'; sweat adds drops; glasses always.
 */
export function franklin(c, x, y, { s = 1, mouth = 'shut', sweat = false, flip = false } = {}) {
  const X = (dx) => x + (flip ? -dx : dx) * s;
  const Y = (dy) => y + dy * s;
  const e = (dx, dy, rx, ry, col) => c.ellipse(X(dx), Y(dy), rx * s, ry * s, col);
  // body and arms
  e(0, 20, 11, 9, CRT[4]);
  e(0, 22, 7, 6, CRT[5]);
  // the white collar and the tie
  c.poly([[X(-4), Y(13)], [X(4), Y(13)], [X(0), Y(17)]], CRT[7]);
  c.poly([[X(-1), Y(15)], [X(1), Y(15)], [X(2), Y(24)], [X(0), Y(26)], [X(-2), Y(24)]], CRT[2]);
  // head
  e(0, 8, 12, 7, CRT[4]);
  e(0, 10, 9, 4, CRT[5]);
  // the eye bumps with glasses on them
  for (const ex of [-6, 6]) {
    e(ex, 2, 4, 4, CRT[4]);
    c.ellipseOutline(X(ex), Y(3), 3.5 * s, 3 * s, CRT[0]);
    e(ex, 3, 2, 2, CRT[7]);
    c.set(X(ex + 1), Y(3), CRT[0]);
  }
  c.hline(Math.min(X(-3), X(3)), Math.max(X(-3), X(3)), Y(3), CRT[0]);
  // mouth
  if (mouth === 'shut') c.hline(Math.min(X(-6), X(6)), Math.max(X(-6), X(6)), Y(11), CRT[1]);
  else e(0, 11, 6, mouth === 'open' ? 3 : 2, CRT[0]);
  if (mouth === 'tongue') c.thickLine(X(0), Y(11), X(18), Y(4), Math.max(1, s), '#d86a8a');
  if (sweat) for (const [dx, dy] of [[-12, 2], [12, 0], [13, 6]]) e(dx, dy, 1, 1.5, CRT[7]);
  // hands on the desk
  e(-9, 27, 3, 2, CRT[5]);
  e(9, 27, 3, 2, CRT[5]);
}

/** The accountant: a person in a green visor and sleeve garters, a ledger. */
export function accountant(c, x, y, { point = false } = {}) {
  c.rect(x - 8, y + 10, 16, 18, CRT[2]);
  c.rect(x - 2, y + 10, 4, 10, CRT[7]);
  c.vline(x, y + 11, y + 19, CRT[1]);
  c.ellipse(x, y + 4, 6, 7, CRT[5]);
  c.rect(x - 7, y - 2, 14, 3, CRT[6]); // the visor
  c.hline(x - 9, x + 4, y + 1, CRT[6]);
  c.set(x - 3, y + 4, CRT[0]);
  c.set(x + 2, y + 4, CRT[0]);
  c.hline(x - 2, x + 2, y + 8, CRT[1]);
  // garters on the sleeves
  c.rect(x - 11, y + 14, 3, 8, CRT[3]);
  c.hline(x - 11, x - 9, y + 17, CRT[6]);
  if (point) c.thickLine(x + 8, y + 14, x + 20, y + 8, 2, CRT[3]);
  else c.rect(x + 8, y + 14, 3, 8, CRT[3]);
  c.hline(x + 8, x + 10, y + 17, CRT[6]);
}

/** A desk across the bottom, with paper on it. */
export function desk(c, y, { papers = 3 } = {}) {
  c.rect(0, y, W, H - y, CRT[2]);
  c.hline(0, W - 1, y, CRT[5]);
  for (let i = 0; i < papers; i++) {
    const px = 10 + i * 30;
    c.rect(px, y - 3 - (i % 2), 14, 5, CRT[7]);
    for (let k = 0; k < 3; k++) c.hline(px + 2, px + 10, y - 2 + k - (i % 2), CRT[4]);
  }
}

function ftmTitle(f) {
  const c = screen(CRT[1]);
  // a burst of rays from behind the title
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 + f * 0.2;
    c.thickLine(52, 40, Math.round(52 + Math.cos(a) * 80), Math.round(40 + Math.sin(a) * 80), 3, k % 2 ? CRT[2] : CRT[1]);
  }
  franklin(c, 52, 18, { mouth: f ? 'open' : 'shut' });
  c.rect(6, 4, 92, 12, CRT[0]);
  drawText(c, 'THE FROG TAX MAN', 52, 5, CRT[7], { center: true, shadow: CRT[3] });
  // the rubber stamp, coming down
  c.rect(70, 58 + (f ? 0 : -4), 26, 12, CRT[0]);
  drawText(c, 'DUE', 83, 60 + (f ? 0 : -4), CRT[6], { center: true });
  return crt(c, f);
}

function ftmOffice(f) {
  const c = screen(CRT[1]);
  // a pond-side office: a window onto reeds, a filing cabinet
  c.rect(6, 6, 30, 22, CRT[3]);
  c.strokeRect(6, 6, 30, 22, CRT[0]);
  for (let x = 9; x < 34; x += 4) c.line(x, 27, x + (x % 3) - 1, 14, CRT[5]);
  c.rect(80, 14, 18, 36, CRT[2]);
  for (const dy of [18, 30, 42]) c.hline(82, 95, dy, CRT[0]);
  franklin(c, 30, 26, { mouth: f ? 'open' : 'shut', sweat: f === 1 });
  accountant(c, 74, 18, { point: f === 1 });
  desk(c, 58, { papers: 3 });
  return crt(c, f);
}

function ftmFlies(f) {
  const c = screen(CRT[1]);
  // a ledger page: 4700 FLIES, a very long column of ticks
  c.rect(8, 6, 50, 64, CRT[6]);
  for (let y = 18; y < 68; y += 4) {
    c.hline(10, 56, y, CRT[4]);
    for (let k = 0; k < 6; k++) c.set(40 + k * 2, y - 2, CRT[1]);
  }
  drawText(c, '4700', 10, 7, CRT[1]);
  drawText(c, 'FLIES', 10, 16 - 8 + 8, CRT[2]);
  // the jar of evidence
  c.rect(66, 30, 24, 34, CRT[3]);
  c.strokeRect(66, 30, 24, 34, CRT[6]);
  c.rect(64, 26, 28, 5, CRT[2]);
  const r = rng(41 + f);
  for (let i = 0; i < 26; i++) c.set(68 + Math.floor(r() * 20), 33 + Math.floor(r() * 28), CRT[0]);
  if (f) franklin(c, 84, 50, { mouth: 'tongue', s: 1, flip: true });
  return crt(c, f);
}

/** The judge: a large frog in a curly wig behind a bench, gavel up or down. */
export function ftmCourt(f) {
  const c = screen(CRT[0]);
  c.rect(0, 0, W, 34, CRT[1]);
  for (let x = 8; x < W; x += 16) c.rect(x, 0, 6, 34, CRT[2]); // columns
  // the judge
  c.ellipse(52, 26, 18, 10, CRT[4]);
  for (const [wx, wy] of [[36, 24], [34, 30], [68, 24], [70, 30], [40, 18], [64, 18], [52, 15]]) c.ellipse(wx, wy, 4, 4, CRT[7]);
  for (const ex of [45, 59]) {
    c.ellipse(ex, 22, 3, 3, CRT[7]);
    c.set(ex, 22, CRT[0]);
  }
  c.hline(44, 60, 30, CRT[1]);
  // the bench
  c.rect(14, 38, 76, 40, CRT[2]);
  c.hline(14, 89, 38, CRT[5]);
  c.rect(42, 46, 20, 10, CRT[3]);
  drawText(c, 'TAX', 52, 47, CRT[6], { center: true });
  // the gavel
  if (f) {
    c.thickLine(70, 36, 80, 30, 2, CRT[5]);
    c.rect(66, 32, 8, 5, CRT[6]);
    for (const [sx, sy] of [[62, 30], [64, 26], [76, 38]]) c.set(sx, sy, CRT[7]);
  } else {
    c.thickLine(74, 24, 82, 34, 2, CRT[5]);
    c.rect(70, 18, 8, 6, CRT[6]);
  }
  // Franklin, small, at the bottom of the bench, looking up
  franklin(c, 18, 56, { mouth: 'open', sweat: true });
  return crt(c, f);
}

function ftmClose(f) {
  const c = screen(CRT[2]);
  franklin(c, 52, 6, { s: 2, mouth: f ? 'open' : 'shut', sweat: true });
  return crt(c, f);
}

function ftmLilypad() {
  const c = screen(CRT[2]);
  for (let y = 40; y < H; y += 3) for (let x = (y * 5) % 9; x < W; x += 9) c.hline(x, x + 4, y, CRT[3]);
  c.ellipse(52, 52, 34, 12, CRT[5]);
  c.poly([[52, 52], [86, 46], [86, 56]], CRT[2]);
  c.ellipse(52, 50, 28, 8, CRT[6]);
  // the tag tied to it
  c.rect(14, 10, 76, 14, CRT[7]);
  drawText(c, 'DEPRECIATED', 52, 12, CRT[1], { center: true });
  c.line(52, 24, 52, 44, CRT[7]);
  return crt(c, 0);
}

function ftmCanoe(f) {
  const c = screen(CRT[2]);
  for (let y = 44; y < H; y += 3) for (let x = (y * 3 + f * 4) % 11; x < W; x += 11) c.hline(x, x + 5, y, CRT[3]);
  c.poly([[10, 46], [94, 46], [84, 56], [20, 56]], CRT[1]);
  c.hline(12, 92, 46, CRT[5]);
  // a desk lamp and an in-tray in the canoe: the mobile office
  c.rect(26, 38, 12, 8, CRT[6]);
  c.line(70, 46, 74, 34, CRT[6]);
  c.ellipse(76, 33, 4, 2, CRT[7]);
  franklin(c, 50, 18 + f, {});
  c.rect(16, 4, 72, 11, CRT[0]);
  drawText(c, 'MOBILE OFFICE', 52, 5, CRT[7], { center: true });
  return crt(c, f);
}

function ftmApril() {
  const c = screen(CRT[0]);
  franklin(c, 52, 2, { mouth: 'open' });
  c.rect(2, 34, 100, 40, CRT[6]);
  drawText(c, 'REMEMBER TO FILE', 52, 38, CRT[0], { center: true });
  drawText(c, 'BY APRIL', 52, 49, CRT[0], { center: true });
  drawText(c, 'FIFTEENTH!', 52, 60, CRT[0], { center: true });
  return crt(c, 3);
}

/** The picture tearing: Franklin smeared sideways, rows slipping. */
function ftmGarble(f) {
  const src = ftmClose(f);
  const c = new PixelCanvas(W, H);
  const r = rng(91 + f * 13);
  let shift = 0;
  for (let y = 0; y < H; y++) {
    if (r() < 0.12) shift = Math.round((r() - 0.5) * 30);
    for (let x = 0; x < W; x++) c.set(x, y, src.get((x + shift + W) % W, y));
  }
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x++) if (r() < 0.2) c.set(x, y, CRT[Math.floor(r() * 8)]);
  return c;
}

/** The set "off": black glass and one tiny white dot that won't go out. */
function tvDot() {
  const c = new PixelCanvas(W, H);
  c.fill('#06080a');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - W / 2, y - H / 2);
    if (d < 6) c.blend(x, y, '#e8f0ff', Math.max(0, 1 - d / 6) * 0.6);
  }
  c.rect(W / 2 - 1, H / 2 - 1, 2, 2, '#ffffff');
  return c;
}

// ---------------------------------------------------------------------------
// The set, dying and wrecked

/** Soot: dark, uneven, only on what is already painted. */
function soot(c, cx, cy, rx, ry, seed, k = 0.7) {
  const r = rng(seed);
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d < 1 && c.alphaAt(x, y) && r() < (1 - d) * 1.4) c.blend(x, y, '#141010', k * (1 - d * 0.6));
    }
  }
}

/** A tooth-row bite out of an edge (cut clean through). */
function bite(c, cx, cy, rx) {
  for (let y = cy - rx; y <= cy + rx; y++) {
    for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
      const d = Math.hypot((x - cx) / (rx + 1), (y - cy) / rx);
      const notch = (x + y) % 3 === 0 ? 0.15 : 0;
      if (d < 1 - notch) c.set(x, y, 'transparent');
    }
  }
}

export function sesWrecked() {
  const c = bezel({ tubes: 'dark' });
  // the shark came in at the top right: a great bite out of the cabinet's corner
  bite(c, 178, 20, 9);
  bite(c, 172, 8, 6);
  // more teeth marks down the side
  for (let y = 30; y < 70; y += 6) c.set(175, y, '#1a1010');
  // the frying-pan reflector knocked flat, the fork aerial bent right over
  for (let y = -2; y < 12; y++) for (let x = 140; x < 196; x++) if (y < 10 && c.alphaAt(x, y)) c.set(x, y, 'transparent');
  c.ellipse(150, 9, 12, 3, '#34343e');
  c.ellipse(150, 8, 10, 2, '#4c4c58');
  for (let y = -2; y < 13; y++) for (let x = 42; x < 70; x++) if (c.alphaAt(x, y) && y < 11) c.set(x, y, 'transparent');
  c.line(56, 12, 52, 6, '#9a9aa6');
  c.line(52, 6, 36, 8, '#9a9aa6');
  for (let k = 0; k < 4; k++) c.set(34 - k, 7 + (k % 2), '#9a9aa6');
  c.line(60, 12, 64, 8, '#6c6c78');
  c.line(64, 8, 72, 12, '#6c6c78');
  // soot from the discharge, round the glass and up the front
  soot(c, 104, 24, 46, 14, 3, 0.65);
  soot(c, 150, 30, 20, 18, 5, 0.55);
  soot(c, 60, 104, 18, 10, 9, 0.4);
  // a plank stove in, nailed back with a cross-brace
  c.rect(40, 80, 10, 30, '#3a2412');
  c.line(38, 82, 52, 108, '#b88c4c');
  c.line(38, 108, 52, 82, '#b88c4c');
  c.outline(INK);
  return c;
}

/** Cracks across the glass from a point at upper right (an overlay over the screen). */
function tvCracked() {
  const c = new PixelCanvas(W, H);
  const ox = 82;
  const oy = 14;
  const r = rng(1234);
  const crack = (x, y, a, len, depth) => {
    let px = x;
    let py = y;
    for (let i = 0; i < len; i++) {
      a += (r() - 0.5) * 0.5;
      const nx = px + Math.cos(a) * 2;
      const ny = py + Math.sin(a) * 2;
      c.line(Math.round(px), Math.round(py), Math.round(nx), Math.round(ny), '#e8f4f0d0');
      c.set(Math.round(nx) + 1, Math.round(ny) + 1, '#00000080');
      px = nx;
      py = ny;
      if (depth < 2 && r() < 0.08) crack(px, py, a + (r() - 0.5) * 1.6, Math.floor(len / 2), depth + 1);
    }
  };
  for (let k = 0; k < 9; k++) crack(ox, oy, (k / 9) * Math.PI * 2 + r() * 0.3, 12 + Math.floor(r() * 30), 0);
  // the star where it hit, and a ring round it
  c.ellipseOutline(ox, oy, 5, 4, '#e8f4f0c0');
  c.ellipse(ox, oy, 2, 2, '#ffffffe0');
  // a scrape of grey shark-skin left on the glass
  for (let i = 0; i < 6; i++) c.hline(ox - 10 + i, ox + 2 + i, oy + 8 + i, '#7a8aa060');
  return c;
}

function backSinged() {
  const c = back();
  soot(c, 110, 60, 50, 40, 11, 0.6);
  soot(c, 70, 100, 30, 18, 13, 0.5);
  return c;
}

function redLight(on) {
  const c = new PixelCanvas(10, 10);
  c.ellipse(5, 5, 4, 4, '#3a3a40');
  c.ellipse(5, 5, 3, 3, on ? '#ff3a2a' : '#4a1410');
  if (on) {
    c.set(4, 4, '#ffd0c0');
    c.ellipseOutline(5, 5, 4.5, 4.5, '#ff3a2a60');
  }
  return c;
}

function forkFly() {
  const c = new PixelCanvas(18, 6);
  c.hline(0, 10, 3, '#c8c8d0');
  c.hline(0, 10, 2, '#9a9aa6');
  c.rect(10, 1, 2, 4, '#c8c8d0');
  for (const ty of [0, 2, 4]) c.hline(12, 17, ty + (ty === 4 ? 1 : 0), '#e8e8f0');
  c.outline(INK);
  return c;
}

// ---------------------------------------------------------------------------
// The night of the catastrophe

/** The battered Revenge in moonlight (yellow sails gone grey-ochre in the dark). */
function revengeNight({ puffed = false } = {}) {
  // the sails went yellow in the first catastrophe and never came back
  let c = revengeBitten(3).remap({ [PAL.cloth1]: '#8a7a30', [PAL.cloth3]: '#c8b048', [PAL.cloth4]: '#e8d470' });
  if (puffed) c = inflate(c);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (c.alphaAt(x, y) > 0) c.blend(x, y, '#0a0c24', 0.32);
  // lamplight in the ports
  for (let x = 38; x < 126; x += 11) c.rect(x + 1, puffed ? 93 : 92, 2, 2, '#f0b84a');
  return c;
}

/** The ship swelling: the hull rows bulge outward from the middle. */
function inflate(src) {
  const c = new PixelCanvas(src.width + 16, src.height + 6);
  const cx = src.width / 2;
  for (let y = 0; y < c.height; y++) {
    const sy = y - 3;
    const hull = sy > 62 ? Math.min(1, (sy - 62) / 20) : 0;
    const k = 1 + 0.12 * hull * Math.sin(Math.min(1, Math.max(0, (sy - 62) / 44)) * Math.PI);
    for (let x = 0; x < c.width; x++) {
      const sx = cx + (x - 8 - cx) / k;
      const syy = sy + (hull ? Math.round(Math.sin(((x - 8) / src.width) * Math.PI) * -2 * hull) : 0);
      const v = src.get(Math.round(sx), syy);
      if (v) c.px[y * c.width + x] = v;
    }
  }
  return c;
}

/** A jet of yellow gas forced out of a seam (pointing right; flip for left). */
function gasJet(f) {
  const c = new PixelCanvas(44, 16);
  for (let x = 0; x < 44; x++) {
    const half = 1.5 + (x / 44) * 6 + Math.sin(x * 0.6 + f * 2) * 0.8;
    for (let y = Math.floor(8 - half); y <= 8 + half; y++) {
      const d = Math.abs(y - 8) / half;
      if (BAYER[y & 3][x & 3] / 16 > (1 - d) * (1 - x / 52) * 1.4) continue;
      c.set(x, y, d < 0.35 && x < 20 ? GARLIC[3] : d < 0.7 ? FUME[3] : FUME[2]);
    }
  }
  return c;
}

function muzzleFlash(f) {
  const c = new PixelCanvas(26, 20);
  const n = f ? 9 : 7;
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + ((k / (n - 1)) - 0.5) * 2.2;
    const len = (k % 2 ? 10 : 14) + f * 3;
    c.thickLine(4, 10, Math.round(4 + Math.cos(a + Math.PI / 2) * len), Math.round(10 + Math.sin(a + Math.PI / 2) * len * 0.6), 2, k % 2 ? '#ff8a20' : '#ffd060');
  }
  c.ellipse(5, 10, 4, 4, '#fff8d0');
  return c;
}

function cannonSmoke() {
  const c = new PixelCanvas(30, 20);
  for (const [x, y, r, col] of [[8, 12, 7, '#7a7a70'], [16, 9, 8, '#9a9888'], [23, 12, 6, '#8a8a6a'], [14, 13, 5, FUME[1]]]) c.ellipse(x, y, r, r * 0.8, col);
  c.ellipse(14, 7, 4, 3, '#c8c6b0');
  return c;
}

/** The second cloud: the old cloud's shape, garlic-sharp (paler, greener, hotter at the core). */
export function garlicCloud(src) {
  return src.clone().remap({
    '#f4e67a': GARLIC[3],
    '#d8c048': GARLIC[2],
    '#b8a838': GARLIC[1],
    '#a89830': GARLIC[0],
    '#98b03a': '#f8f8e0',
  });
}

// ---------------------------------------------------------------------------
// The Great Sharkstorm

/** The whirlpool at the base: foam spirals turning, yellow in the spray. */
function stormBase(f) {
  const c = new PixelCanvas(220, 44);
  for (let y = 0; y < 44; y++) {
    for (let x = 0; x < 220; x++) {
      const dx = (x - 110) / 108;
      const dy = (y - 24) / 18;
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const a = Math.atan2(dy, dx);
      const swirl = Math.sin(a * 3 + d * 14 - f * 1.4);
      let col = d < 0.25 ? '#0c1a16' : '#1e3a32';
      if (swirl > 0.55) col = d < 0.6 ? '#c8e0d8' : '#8ab0a8';
      if (swirl > 0.85 && d > 0.3) col = (x + y) % 3 ? FUME[2] : '#f0fbff';
      if (d > 0.88 && BAYER[y & 3][x & 3] / 16 > (1 - d) * 8) continue;
      c.set(x, y, col);
    }
  }
  return c;
}

/**
 * The column: narrow at the sea, flaring up into the cloud, banded with
 * spray, streaked with yellow fume, flecked with timber and fins. Three
 * frames so the bands crawl round it.
 */
export function stormColumn(f) {
  const cw = 140;
  const ch = 210;
  const c = new PixelCanvas(cw, ch);
  const r = rng(7 + f * 101);
  for (let y = 0; y < ch; y++) {
    const t = 1 - y / (ch - 1); // 0 at the sea, 1 at the top
    const cx = cw / 2 + Math.sin(y * 0.03 + f * 0.4) * 6 * (1 - t) + Math.sin(y * 0.011) * 8;
    const half = 10 + t ** 1.6 * 58;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      const u = (x - cx) / half; // -1..1 across the column
      if (Math.abs(u) > 1) continue;
      if (Math.abs(u) > 0.86 && BAYER[y & 3][x & 3] / 16 > (1 - Math.abs(u)) * 7) continue;
      // bands slanting round the column, moving per frame
      const wob = Math.sin(y * 0.07 + f * 0.9) * 1.6 + Math.sin(y * 0.31 + u * 1.7) * 0.5;
      const band = Math.sin(y * 0.19 + u * 3.2 + f * 2.1 + wob);
      let col = mix('#1a2a2a', '#3a4a42', (u + 1) / 2);
      if (band > 0.4) col = mix('#4a6a62', '#9ab8b0', (u + 1) / 2);
      if (band > 0.8) col = u > 0.2 ? '#d8eaf0' : '#a8c0c0';
      // yellow fume threaded through it, thicker high up
      if (Math.sin(y * 0.09 - u * 5 + f * 1.3 + wob * 0.7) > 0.93 - t * 0.25) col = u > 0 ? FUME[3] : FUME[1];
      c.set(x, y, col);
    }
    // timber and fins in it
    if (r() < 0.12) {
      const x = Math.round(cx + (r() - 0.5) * half * 1.6);
      if (r() < 0.5) c.hline(x, x + 3, y, '#6a4a28');
      else c.poly([[x, y + 3], [x + 2, y - 1], [x + 4, y + 3]], SHARK[1]);
    }
  }
  // the head of it: low cloud spreading out at the top
  for (let y = 0; y < 26; y++) for (let x = 0; x < cw; x++) {
    const d = Math.hypot((x - cw / 2) / 70, (y - 8) / 18);
    if (d >= 1 || BAYER[y & 3][x & 3] / 16 > (1 - d) * 3) continue;
    const lump = Math.sin(x * 0.09 + f * 0.7 + y * 0.12);
    c.set(x, y, y > 16 && lump > 0.7 ? FUME[0] : lump > 0.2 ? '#2e3529' : '#22281f');
  }
  return c;
}

/** One shark caught in the storm (for the orbit layers): a tumbling side view. */
function stormShark(f) {
  const c = new PixelCanvas(24, 12);
  const tail = f ? 1 : -1;
  c.ellipse(11, 6, 8, 3, SHARK[1]);
  c.ellipse(11, 7, 6, 1.5, SHARK[3]);
  c.poly([[10, 3], [13, -1], [14, 4]], SHARK[0]);
  c.poly([[18, 6], [23, 2 + tail], [21, 6], [23, 10 + tail]], SHARK[0]);
  c.poly([[8, 8], [6, 11], [11, 8]], SHARK[0]);
  c.set(5, 5, '#0a0a10');
  c.hline(3, 6, 7, '#e8e8f0');
  c.outline(INK);
  return c;
}

function stormDebris(f) {
  const c = new PixelCanvas(12, 8);
  if (f) {
    c.thickLine(1, 6, 10, 2, 2, '#7a5428');
    c.set(5, 4, '#c8c8d0');
  } else {
    c.rect(2, 2, 7, 4, '#9a7038');
    c.hline(2, 8, 2, '#b88c4c');
    c.set(3, 3, '#c8c8d0');
  }
  c.outline(INK);
  return c;
}

function lightning(f) {
  const c = new PixelCanvas(40, 120);
  const r = rng(300 + f * 17);
  let x = 20;
  for (let y = 0; y < 120; y += 4) {
    const nx = Math.max(3, Math.min(36, x + Math.round((r() - 0.5) * 12)));
    c.thickLine(x, y, nx, y + 4, 2, '#f8f4ff');
    c.line(x + 1, y, nx + 1, y + 4, '#b8a8ff');
    if (r() < 0.15) c.line(nx, y + 4, nx + (r() < 0.5 ? -8 : 8), y + 12, '#d8d0ff');
    x = nx;
  }
  return c;
}

/** The storm far off: a small mustard funnel on the horizon, turning, still there. */
export function stormDistant(f) {
  const c = new PixelCanvas(44, 48);
  for (let y = 0; y < 48; y++) {
    const t = 1 - y / 47;
    const cx = 22 + Math.sin(y * 0.2 + f) * 1.2;
    const half = 2 + t ** 1.5 * 18;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      const u = (x - cx) / half;
      if (Math.abs(u) > 1) continue;
      if (Math.abs(u) > 0.7 && BAYER[y & 3][x & 3] / 16 > (1 - Math.abs(u)) * 3) continue;
      const band = Math.sin(y * 0.5 + u * 2 + f * 2) > 0.5;
      c.set(x, y, band ? '#9a8a40' : y < 10 ? '#4a4a3a' : '#6a6440');
    }
  }
  // two specks going round it
  c.set(f ? 8 : 34, 12, SHARK[0]);
  c.set(f ? 30 : 14, 22, SHARK[0]);
  return c;
}

function barrelFly() {
  const c = new PixelCanvas(16, 18);
  c.ellipse(8, 9, 6, 8, '#7a5428');
  for (const y of [3, 9, 15]) c.hline(2, 13, y, '#4c4c58');
  c.vline(5, 2, 16, '#9a7038');
  c.ellipse(8, 2, 4, 1.5, '#5a3a1c');
  // concentrated grog, slopping out of the bung
  c.set(9, 1, GROGC[3]);
  c.set(10, 0, GROGC[4]);
  c.rect(6, 8, 4, 3, GROGC[2]);
  c.outline(INK);
  return c;
}

function grogBurst(f) {
  const c = new PixelCanvas(48, 34);
  const r = rng(55 + f);
  const reach = f ? 22 : 14;
  for (let k = 0; k < 18; k++) {
    const a = r() * Math.PI * 2;
    const len = reach * (0.5 + r() * 0.5);
    c.thickLine(24, 17, Math.round(24 + Math.cos(a) * len), Math.round(17 + Math.sin(a) * len * 0.7), 2, k % 3 ? GROGC[3] : GROGC[2]);
  }
  c.ellipse(24, 17, 7 + f * 3, 5 + f * 2, GROGC[4]);
  for (let k = 0; k < 10; k++) c.set(Math.floor(r() * 48), Math.floor(r() * 34), GROGC[4]);
  return c;
}

export function addPhase6VistaFrames(atlas) {
  for (const f of [0, 1]) {
    atlas.add(`ftm_title_${f}`, ftmTitle(f));
    atlas.add(`ftm_office_${f}`, ftmOffice(f));
    atlas.add(`ftm_flies_${f}`, ftmFlies(f));
    atlas.add(`ftm_court_${f}`, ftmCourt(f));
    atlas.add(`ftm_close_${f}`, ftmClose(f));
    atlas.add(`ftm_canoe_${f}`, ftmCanoe(f));
    atlas.add(`ftm_garble_${f}`, ftmGarble(f));
  }
  atlas.add('ftm_lilypad', ftmLilypad());
  atlas.add('ftm_april', ftmApril());
  atlas.add('tv_dot', tvDot());
  atlas.add('tv_snow_dim', staticFrame(4242, { dim: 0.35 }));
  atlas.add('ses_bezel_dead', bezel({ tubes: 'dark' }));
  atlas.add('ses_bezel_dying', bezel({ tubes: 'red' }));
  atlas.add('ses_bezel_wrecked', sesWrecked());
  atlas.add('tv_cracked', tvCracked());
  atlas.add('ses_back_singed', backSinged());
  atlas.add('tv_redlight_on', redLight(true));
  atlas.add('tv_redlight_off', redLight(false));
  atlas.add('fork_fly', forkFly());
  atlas.add('garrick_back_asleep', garrickBack({ asleep: true }));
  atlas.add('revenge_night', revengeNight());
  atlas.add('revenge_night_puffed', revengeNight({ puffed: true }));
  for (const f of [0, 1]) {
    atlas.add(`gas_jet_${f}`, gasJet(f));
    atlas.add(`muzzle_flash_${f}`, muzzleFlash(f));
    atlas.add(`storm_base_${f}`, stormBase(f));
    atlas.add(`storm_shark_${f}`, stormShark(f));
    atlas.add(`storm_debris_${f}`, stormDebris(f));
    atlas.add(`storm_lightning_${f}`, lightning(f));
    atlas.add(`storm_distant_${f}`, stormDistant(f));
    atlas.add(`grog_burst_${f}`, grogBurst(f));
  }
  for (const f of [0, 1, 2]) atlas.add(`storm_column_${f}`, stormColumn(f));
  atlas.add('cannon_smoke', cannonSmoke());
  atlas.add('barrel_fly', barrelFly());
}

export const PHASE6_VISTA_FRAMES = [
  ...['title', 'office', 'flies', 'court', 'close', 'canoe', 'garble'].flatMap((n) => [`ftm_${n}_0`, `ftm_${n}_1`]),
  'ftm_lilypad', 'ftm_april', 'tv_dot', 'tv_snow_dim',
  'ses_bezel_dead', 'ses_bezel_dying', 'ses_bezel_wrecked', 'tv_cracked', 'ses_back_singed',
  'tv_redlight_on', 'tv_redlight_off', 'fork_fly', 'garrick_back_asleep',
  'revenge_night', 'revenge_night_puffed',
  ...['gas_jet', 'muzzle_flash', 'storm_base', 'storm_shark', 'storm_debris', 'storm_lightning', 'storm_distant', 'grog_burst'].flatMap((n) => [`${n}_0`, `${n}_1`]),
  'storm_column_0', 'storm_column_1', 'storm_column_2', 'cannon_smoke', 'barrel_fly',
  'cloud_garlic_0', 'cloud_garlic_1', 'cloud_garlic_2',
];

/** The Frog Tax Man's pictures, small, for the set on deck. */
export const PHASE6_SCREEN_PAINTERS = {
  ftm: (f) => [ftmTitle, ftmOffice, ftmCourt, ftmClose][f % 4](f % 2),
  dot: () => tvDot(),
  snow: () => staticFrame(4242, { dim: 0.35 }),
};

