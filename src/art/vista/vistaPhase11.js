import { PixelCanvas } from '../PixelCanvas.js';
import { PAL, mix } from '../palette.js';
import { drawText } from '../font/drawText.js';
import { rng, SES_BEZEL, SES_SCREEN } from './sesArt.js';
import { CRT, crt, screen } from './vistaPhase6.js';

/**
 * Vista art for Story Phases 11-13:
 *
 *   - Television (the green CRT, like every set on this ship): the Bling
 *     Bling King's late-night programme (at a desk; the chart; the hammock
 *     over the captain; the Grand Court; HOLD MY SASH; a Cheap-O-Rama
 *     advertisement and its logo), its daytime special (the dice, a drawing
 *     of the captain's face, the finger, a normal breakfast, the
 *     reconstruction, tonight's teaser), the trash song (a sash fired from a
 *     cannon, tied to an anchor, burnt, buried, handed to the garbage crew,
 *     thrown into a storm that throws it back; a chorus line of sharks), and
 *     the Stenchmaster Channel (its logo, Princess Stenchalina's First Grand
 *     Disaster in a castle of onions with a runtime clock that never stops,
 *     the Brogath special, its sponsor, and a smell test card).
 *   - The Build-Your-Own S.E.S. (bedroom edition) close up: a cabinet from a
 *     kit, three forks and a horseshoe for an aerial, a grille with a dial on
 *     the side (Stench-O-Vision); its back, and its power (a transformer that
 *     hums).
 *   - The old quarters remade in toy sashes, seen over the crew's shoulders.
 *   - The Grand Dice of Grandness (a big purple foam die) for the ceremony.
 *   - The Cheap-O-Rama flying machine coming down through the storm with a
 *     crate on a winch, and its shipping label; the sash fluttering at the
 *     mainmast in front of everybody.
 *
 * Nothing here is a real company, a real logo, or anyone else's character.
 */
const INK = PAL.ink;
const W = SES_SCREEN.w;
const H = SES_SCREEN.h;
const SASH = { d: '#8a141c', m: '#c8242c', l: '#e8545a', gold: '#f4dc6c' };
const STORMC = { d: '#141c18', m: '#24352e', l: '#3e584a', h: '#56705e', spray: '#9ab8b0' };
const t = (c, s, x, y, col = CRT[7], opts = {}) => drawText(c, s, x, y, col, { center: true, ...opts });

// --- shared TV pieces ------------------------------------------------------------------------

/** The Bling Bling King behind the late-night desk: head and shoulders, crown, chain, a little smug. */
function host(c, f, { y = 0, hat = 'crown', sash = false, mouth = 'grin', x = 0 } = {}) {
  const X = (dx) => 52 + x + dx;
  c.poly([[X(14), 28 + y], [X(22), 10 + y], [X(26), 30 + y]], CRT[3]); // the fin
  c.ellipse(X(4), 42 + y, 26, 16, CRT[4]);
  c.poly([[X(-30), 40 + y], [X(-12), 30 + y], [X(0), 36 + y], [X(-6), 50 + y], [X(-24), 48 + y]], CRT[4]); // snout
  c.ellipse(X(4), 50 + y, 18, 7, CRT[6]);
  if (mouth === 'grin') {
    c.poly([[X(-26), 42 + y], [X(4), 44 + y], [X(0), 50 + y], [X(-20), 48 + y]], CRT[0]);
    for (let k = X(-22); k < X(0); k += 4) c.poly([[k, 43 + y], [k + 2, 46 + y], [k + 4, 43 + y]], CRT[7]);
  } else {
    c.ellipse(X(-14), 46 + y, 6, 4 + (f ? 1 : 0), CRT[0]); // singing
    c.set(X(-14), 44 + y, CRT[6]);
  }
  c.ellipse(X(-10), 35 + y, 3, 2, CRT[0]);
  c.set(X(-9), 34 + y, CRT[7]);
  if (hat === 'crown') {
    c.poly([[X(-4), 26 + y], [X(-4), 18 + y], [X(2), 23 + y], [X(7), 13 + y], [X(12), 23 + y], [X(17), 18 + y], [X(17), 26 + y]], CRT[6]);
    c.hline(X(-4), X(17), 25 + y, CRT[3]);
  } else if (hat === 'captain') {
    c.poly([[X(-6), 24 + y], [X(5), 17 + y], [X(16), 24 + y], [X(5), 22 + y]], CRT[1]); // a very small captain's hat
    c.set(X(5), 20 + y, CRT[7]);
  }
  for (let k = X(-12); k < X(22); k += 2) c.set(k, 56 + y + Math.round(Math.sin(((k - X(-12)) / 34) * Math.PI) * 4), CRT[7]); // the chain
  if (sash) for (let k = 0; k < 18; k++) c.rect(X(-10) + k * 2, 36 + y + k, 3, 2, k % 3 ? CRT[5] : CRT[7]);
}

function deskFront(c, y = 58) {
  c.rect(0, y, W, H - y, CRT[2]);
  c.hline(0, W - 1, y, CRT[5]);
  c.rect(8, y + 6, 22, 10, CRT[3]); // a mug
  c.vline(76, y - 10, y, CRT[5]); // a microphone
  c.ellipse(76, y - 12, 3, 3, CRT[6]);
}

function rays(c, cx, cy, n, col, f) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + f * 0.1;
    c.line(cx, cy, Math.round(cx + Math.cos(a) * 80), Math.round(cy + Math.sin(a) * 80), col);
  }
}

/** A tiny cartoon sash, `pts` its path. */
function tvSash(c, x, y, len, { col = CRT[6], angle = 0.5, wave = 0, f = 0 } = {}) {
  for (let k = 0; k < len; k++) {
    const px = Math.round(x + k * Math.cos(angle));
    const py = Math.round(y + k * Math.sin(angle) + Math.sin(k * 0.6 + f * 2) * wave);
    c.rect(px, py, 3, 3, k % 4 === 0 ? CRT[7] : col);
  }
}

function notes(c, f) {
  for (const [x, y] of [[10, 14], [88, 10], [20, 30], [92, 30]]) {
    const yy = y + (f ? -2 : 0);
    c.ellipse(x, yy + 6, 2, 1.5, CRT[7]);
    c.vline(x + 2, yy, yy + 6, CRT[7]);
    c.hline(x + 2, x + 4, yy, CRT[7]);
  }
}

function crown(c, x, y, s = 1, col = CRT[6]) {
  c.poly([[x, y + 6 * s], [x, y], [x + 3 * s, y + 3 * s], [x + 6 * s, y - 2 * s], [x + 9 * s, y + 3 * s], [x + 12 * s, y], [x + 12 * s, y + 6 * s]], col);
}

/** A little cartoon shark (for the song and the storm). */
function sharkie(c, x, y, { flip = false, broom = false, kick = 0 } = {}) {
  const d = flip ? -1 : 1;
  c.ellipse(x, y, 9, 5, CRT[4]);
  c.poly([[x, y - 4], [x + 3 * d, y - 11], [x + 5 * d, y - 4]], CRT[3]);
  c.poly([[x - 9 * d, y], [x - 14 * d, y - 4], [x - 14 * d, y + 4]], CRT[3]);
  c.set(x + 5 * d, y - 1, CRT[0]);
  c.hline(x + 2 * d, x + 7 * d, y + 2, CRT[7]);
  if (broom) { c.line(x - 2, y + 4, x - 8, y + 16, CRT[5]); c.rect(x - 11, y + 15, 6, 3, CRT[6]); }
  if (kick) { c.line(x - 2, y + 5, x - 2 + kick * 4, y + 13, CRT[4]); c.line(x + 2, y + 5, x + 2, y + 14, CRT[4]); }
}

// --- the late-night programme (Phase 11) -------------------------------------------------------

function bbkLate(f) {
  const c = screen(CRT[1]);
  for (let x = 0; x < W; x += 9) c.rect(x, 18 + ((x * 7) % 13), 7, 40, CRT[2]); // a city of storms, behind
  c.ellipse(84, 12, 7, 7, CRT[6]); // the moon
  host(c, f, { y: 2 });
  deskFront(c);
  return crt(c, f);
}

function bbkLateTitle(f) {
  const c = screen(CRT[0]);
  rays(c, W / 2, H / 2, 16, CRT[2], f);
  crown(c, W / 2 - 12, 10, 2);
  t(c, 'BLING BLING KING', W / 2, 36);
  t(c, 'LATE!', W / 2, 50, f ? CRT[7] : CRT[6], { scale: 2 });
  return crt(c, f);
}

function bbkLateChart(f) {
  const c = screen(CRT[1]);
  host(c, f, { x: 20, y: 4 });
  // the easel: a chart of boxes, one on top, a hand with one finger pointing out at the bottom
  c.rect(4, 6, 38, 46, CRT[6]);
  c.rect(16, 9, 14, 7, CRT[3]);
  for (const x of [7, 19, 31]) c.rect(x, 24, 8, 6, CRT[4]);
  c.rect(17, 38, 12, 8, CRT[2]);
  c.vline(23, 16, 24, CRT[2]);
  c.hline(11, 35, 22, CRT[2]);
  c.set(23, 37, CRT[2]);
  c.line(20, 52, 12, 76, CRT[5]);
  c.line(26, 52, 34, 76, CRT[5]);
  deskFront(c, 66);
  return crt(c, f);
}

function bbkLateHammock(f) {
  const c = screen(CRT[1]);
  // a cartoon cabin: a little captain asleep on his bed, a huge hammock slung directly over him
  c.rect(10, 56, 84, 10, CRT[3]); // the bed
  c.ellipse(30, 54, 7, 6, CRT[6]); // the captain's head
  c.poly([[22, 50], [30, 44], [38, 50]], CRT[0]); // his hat
  c.rect(36, 52, 46, 6, CRT[5]); // blanket
  for (let x = 6; x < 98; x++) c.set(x, 16 + Math.round(Math.sin(((x - 6) / 92) * Math.PI) * (16 + f)), CRT[7]); // the hammock
  c.ellipse(52, 30 + f, 26, 7, CRT[4]); // somebody large in it
  crown(c, 30, 20 + f, 1);
  for (const [x, y] of [[60, 42], [64, 46], [58, 48]]) c.set(x, y + f, CRT[6]); // z
  return crt(c, f);
}

function bbkCourt(f) {
  const c = screen(CRT[1]);
  c.rect(0, 50, W, 28, CRT[2]); // the bench
  c.hline(0, W - 1, 50, CRT[5]);
  c.ellipse(52, 30, 18, 14, CRT[7]); // the great wig
  c.ellipse(52, 34, 10, 10, CRT[5]);
  c.ellipse(48, 32, 1.5, 1.5, CRT[0]);
  c.ellipse(56, 32, 1.5, 1.5, CRT[0]);
  c.rect(72, 14 - f * 3, 4, 16, CRT[6]); // one finger, raised
  c.rect(70, 28 - f * 3, 8, 8, CRT[6]);
  c.rect(14, 42, 16, 5, CRT[4]); // the gavel
  c.rect(20, 34, 4, 9, CRT[4]);
  t(c, 'VALID?', W / 2, 62);
  return crt(c, f);
}

function holdMySash(f) {
  const c = screen(CRT[0]);
  // a cartoon sash, puffing itself up, then off it goes: PRRBBT
  const y = f ? 20 : 34;
  c.ellipse(52 + f * 8, y + 10, 18 - f * 4, 10 + f * 2, CRT[5]);
  tvSash(c, 28 + f * 8, y + 4, 24, { col: CRT[6], angle: 0.25, wave: 2, f });
  if (f) for (const [x, yy] of [[20, 46], [14, 52], [26, 54]]) c.ellipse(x, yy, 4, 3, CRT[3]); // the trail
  t(c, 'HOLD MY SASH!', W / 2, 62, CRT[7]);
  return crt(c, f);
}

function cheapoAd(f) {
  const c = screen(CRT[2]);
  rays(c, 70, 30, 12, CRT[3], f);
  // a kid holding up a playset box with two smiling sash holders on it
  c.ellipse(26, 30, 9, 9, CRT[6]);
  c.set(23, 29, CRT[0]); c.set(29, 29, CRT[0]);
  c.hline(23, 29, 33, CRT[0]);
  c.rect(18, 40, 16, 22, CRT[4]);
  c.rect(42, 22 - f * 2, 40, 30, CRT[7]);
  c.rect(46, 26 - f * 2, 8, 10, CRT[3]);
  c.rect(70, 26 - f * 2, 8, 10, CRT[3]);
  tvSash(c, 52, 40 - f * 2, 10, { angle: 0, col: CRT[5] });
  t(c, 'AGES 6 AND UP', W / 2, 64, CRT[7]);
  return crt(c, f);
}

function cheapoLogo(f) {
  const c = screen(CRT[0]);
  rays(c, W / 2, 30, 20, f ? CRT[3] : CRT[2], f);
  c.ellipse(W / 2, 30, 20, 14, CRT[6]);
  c.ellipse(W / 2, 30, 16, 10, CRT[1]);
  t(c, 'CHEAP', W / 2, 26, CRT[7]);
  t(c, 'CHEAP-O-RAMA', W / 2, 52, CRT[7]);
  t(c, 'WE DELIVER', W / 2, 64, CRT[5]);
  return crt(c, f);
}

// --- the daytime special (Phase 12) ------------------------------------------------------------

function bbkDayTitle(f) {
  const c = screen(CRT[2]);
  c.ellipse(W / 2, 24, 14, 14, CRT[7]); // the sun, with a face
  rays(c, W / 2, 24, 12, CRT[4], f);
  c.ellipse(W / 2, 24, 12, 12, CRT[6]);
  c.set(W / 2 - 4, 22, CRT[1]); c.set(W / 2 + 4, 22, CRT[1]);
  c.hline(W / 2 - 4, W / 2 + 4, 28, CRT[1]);
  t(c, 'DAYTIME!', W / 2, 46, CRT[7], { scale: 2 });
  return crt(c, f);
}

function bbkDayDice(f) {
  const c = screen(CRT[1]);
  c.rect(32, 14, 40, 40, CRT[5]);
  c.rect(32, 14, 40, 6, CRT[6]);
  const pips = f ? [[44, 34], [60, 34], [52, 42]] : [[42, 26], [52, 26], [62, 26], [42, 44], [52, 44], [62, 44]];
  for (const [x, y] of pips) c.ellipse(x, y, 3, 3, CRT[7]);
  if (f) for (const [x, y] of [[20, 30], [86, 24], [80, 50], [24, 52]]) { c.ellipse(x, y, 4, 2, CRT[4]); c.set(x, y, CRT[7]); } // beans!
  t(c, f ? 'BEANS!' : '6!', W / 2, 62);
  return crt(c, f);
}

function bbkDayFace(f) {
  const c = screen(CRT[6]);
  // a crayon drawing of the captain's face, collapsing: a beard, two eyes going down, a mouth like a wobbly line
  c.ellipse(W / 2, 34, 24, 26, CRT[7]);
  for (let y = 42; y < 66; y++) for (let x = W / 2 - 22; x < W / 2 + 22; x++) if ((x * 3 + y) % 5 < 3 && Math.hypot(x - W / 2, (y - 40) * 1.2) < 26) c.set(x, y, CRT[1]);
  c.poly([[W / 2 - 22, 16], [W / 2, 2], [W / 2 + 22, 16], [W / 2, 12]], CRT[1]); // the hat
  c.line(W / 2 - 12, 26, W / 2 - 6, 30 + f, CRT[1]);
  c.line(W / 2 + 12, 26, W / 2 + 6, 30 + f, CRT[1]);
  for (let x = W / 2 - 8; x < W / 2 + 8; x++) c.set(x, 40 + Math.round(Math.sin(x * 0.9) * 2), CRT[0]);
  if (f) c.ellipse(W / 2 + 14, 34, 1.5, 3, CRT[3]); // a tear
  return crt(c, f);
}

function bbkDayFinger(f) {
  const c = screen(CRT[1]);
  c.rect(12, 34, 24, 20, CRT[6]); // a hand, one finger out
  c.rect(34 + f * 3, 38, 20, 6, CRT[6]);
  c.rect(70, 12, 6, 38, CRT[5]); // a ladle, coming down
  c.ellipse(73, 52, 10, 6, CRT[5]);
  t(c, 'PULL IT?', W / 2, 62);
  return crt(c, f);
}

function bbkDayBreakfast(f) {
  const c = screen(CRT[1]);
  c.ellipse(W / 2, 40, 36, 18, CRT[7]); // the plate
  c.ellipse(W / 2, 40, 30, 14, CRT[6]);
  c.ellipse(36, 36, 7, 5, CRT[7]); c.ellipse(36, 36, 3, 2, CRT[4]); // an egg
  c.rect(52, 32, 16, 3, CRT[3]); c.rect(52, 38, 16, 3, CRT[3]); // bacon
  c.rect(70, 40, 10, 8, CRT[5]); // toast
  t(c, f ? 'NO BEANS?!' : 'NORMAL', W / 2, 62);
  return crt(c, f);
}

function bbkDayReenact(f) {
  const c = screen(CRT[1]);
  host(c, f, { hat: 'captain', sash: true, x: 10 });
  c.rect(2, 4, 26, 20, CRT[0]);
  t(c, f ? '29' : '30', 15, 9, CRT[7], { scale: 1 });
  return crt(c, f);
}

function bbkDayTeaser(f) {
  const c = screen(CRT[0]);
  notes(c, f);
  t(c, 'TONIGHT!', W / 2, 10, CRT[7]);
  t(c, "DON'T THROW", W / 2, 30, CRT[6]);
  t(c, 'MY SASH IN', W / 2, 40, CRT[6]);
  t(c, 'THE TRASH', W / 2, 50, f ? CRT[7] : CRT[6]);
  return crt(c, f);
}

// --- the trash song (Phase 13) -----------------------------------------------------------------

function trashSongA(f) {
  const c = screen(CRT[1]);
  host(c, f, { mouth: 'sing', x: 14 });
  // a trash bin, with a sash being snatched back out of it
  c.rect(6, 44, 22, 24, CRT[3]);
  c.hline(4, 29, 43, CRT[5]);
  tvSash(c, 14, 40, 12, { angle: -1.2, wave: 1, f });
  notes(c, f);
  return crt(c, f);
}

function trashSongCannon(f) {
  const c = screen(CRT[1]);
  c.rect(10, 48, 34, 12, CRT[3]); // the cannon
  c.ellipse(44, 54, 6, 7, CRT[2]);
  c.ellipse(20, 62, 7, 7, CRT[4]);
  if (f) { c.ellipse(52, 52, 8, 6, CRT[6]); tvSash(c, 60, 46, 20, { angle: -0.6, wave: 2, f }); } else tvSash(c, 30, 46, 8, { angle: 0 });
  t(c, 'NOT THE CANNON', W / 2, 6);
  return crt(c, f);
}

function trashSongAnchor(f) {
  const c = screen(CRT[2]);
  for (let y = 30; y < H; y += 6) c.hline(0, W - 1, y, CRT[1]); // the sea
  const ay = 46 + f * 8;
  c.vline(52, 0, ay, CRT[5]); // the rope (it comes back)
  c.rect(48, ay, 8, 14, CRT[6]); // the anchor
  c.hline(40, 64, ay + 12, CRT[6]);
  tvSash(c, 56, ay + 2, 8, { angle: 0.2 });
  t(c, 'BACK TO ME!', W / 2, 8, CRT[7]);
  return crt(c, f);
}

function trashSongFire(f) {
  const c = screen(CRT[1]);
  // a stove, a sandy hole, a chest with a lock: all crossed out
  c.rect(6, 36, 26, 26, CRT[3]);
  c.poly([[10, 36], [14, 24 - f * 2], [19, 34], [24, 22 + f * 2], [28, 36]], CRT[6]);
  c.ellipse(52, 58, 14, 5, CRT[4]);
  c.rect(74, 40, 24, 18, CRT[4]);
  c.rect(84, 48, 4, 5, CRT[7]);
  for (const x0 of [6, 38, 74]) { c.line(x0, 32, x0 + 26, 64, CRT[7]); c.line(x0 + 26, 32, x0, 64, CRT[7]); }
  return crt(c, f);
}

function trashSongCrew(f) {
  const c = screen(CRT[1]);
  c.rect(0, 62, W, 16, CRT[2]);
  for (const [x, k] of [[22, 0], [52, 1], [82, 0]]) sharkie(c, x, 46 + ((k + f) % 2), { broom: true });
  t(c, 'GARBAGE CREW', W / 2, 6);
  return crt(c, f);
}

function trashSongStorm(f) {
  const c = screen(CRT[0]);
  for (let a = 0; a < 18; a += 0.15) c.set(Math.round(W / 2 + Math.cos(a + f) * a * 2.2), Math.round(38 + Math.sin(a + f) * a * 1.6), CRT[4]);
  sharkie(c, 30, 24 + f * 2, { flip: true });
  // the sash, going in... and coming out the other side, aimed straight back
  tvSash(c, f ? 66 : 20, f ? 54 : 60, 16, { angle: f ? 0.5 : -0.5, wave: 2, f, col: CRT[7] });
  return crt(c, f);
}

function trashSongKick(f) {
  const c = screen(CRT[1]);
  rays(c, W / 2, 0, 10, CRT[2], f);
  for (let k = 0; k < 4; k++) sharkie(c, 16 + k * 24, 40, { kick: (k + f) % 2 ? 2 : -1 });
  t(c, 'BACK TO YOU!', W / 2, 64);
  return crt(c, f);
}

// --- the Stenchmaster Channel (Phase 13) -------------------------------------------------------

function scLogo(f) {
  const c = screen(CRT[0]);
  rays(c, W / 2, 26, 12, CRT[1], f);
  crown(c, W / 2 - 12, 6, 2);
  tvSash(c, W / 2 - 22, 24, 30, { angle: 0.1, col: CRT[5] });
  c.ellipse(W / 2, 34, 5, 6, CRT[6]); // the nose
  c.set(W / 2 - 2, 38, CRT[1]); c.set(W / 2 + 2, 38, CRT[1]);
  t(c, 'THE STENCHMASTER', W / 2, 50);
  t(c, 'CHANNEL', W / 2, 60, f ? CRT[7] : CRT[6]);
  return crt(c, f);
}

function onionDomes(c, y0, droop = 0) {
  for (const [x, w, h] of [[14, 10, 34], [36, 14, 46], [62, 14, 40], [86, 10, 30]]) {
    c.rect(x - w / 2, H - h, w, h, CRT[4]);
    c.ellipse(x, H - h - 6 + droop, w / 2 + 3, 8 - droop / 2, CRT[6]); // the onion dome
    c.vline(x, H - h - 18 + droop * 2, H - h - 12 + droop, CRT[6]); // its sprout
  }
  void y0;
}

function scCradle(f) {
  const c = screen(CRT[1]);
  c.ellipse(W / 2, 54, 30, 12, CRT[3]); // the royal cradle
  c.ellipse(W / 2, 44, 10, 10, CRT[6]); // the princess
  crown(c, W / 2 - 6, 30, 1, CRT[7]);
  c.set(W / 2 - 3, 44, CRT[0]); c.set(W / 2 + 3, 44, CRT[0]);
  c.rect(W / 2 + 12, 30 - f * 3, 6, 10, CRT[6]); // a tiny fist, raised
  tvSash(c, W / 2 - 14, 50, 12, { angle: 0, col: CRT[7] });
  return crt(c, f);
}

function scCastle(f) {
  const c = screen(CRT[1]);
  onionDomes(c, 0);
  for (let x = 0; x < W; x += 3) c.set(x, H - 2, CRT[5]); // the onion moat
  if (f) for (const [x, y] of [[20, 20], [70, 16], [50, 10]]) c.ellipse(x, y, 4, 2, CRT[3]); // a whiff
  return crt(c, f);
}

function scWaft(f) {
  const c = screen(CRT[1]);
  const shake = f ? 2 : -2;
  c.ellipse(W / 2, 40, 40 + f * 4, 26 + f * 3, CRT[5]); // the yellow cloud (green, on this set)
  onionDomes(c, 0, 4);
  c.rect(10 + shake, 20, 10, 8, CRT[7]); // the royal trousers, leaving by the window
  c.rect(12 + shake, 28, 3, 5, CRT[7]);
  c.rect(17 + shake, 28, 3, 5, CRT[7]);
  return crt(c, f);
}

function scFlutter(f) {
  const c = screen(CRT[1]);
  // the ribbon, fluttering; the court, gasping, in a row of round faces with O mouths
  tvSash(c, 20, 20, 30, { angle: 0, wave: 4, f, col: CRT[7] });
  for (let x = 10; x < W; x += 16) {
    c.ellipse(x, 56, 6, 7, CRT[5]);
    c.ellipse(x, 59, 2, 2 + f, CRT[0]);
  }
  return crt(c, f);
}

function scRuntime(f) {
  const c = screen(CRT[0]);
  t(c, 'RUNTIME OF THE', W / 2, 12, CRT[6]);
  t(c, 'GRAND DISASTER', W / 2, 22, CRT[6]);
  t(c, f ? '3:41:10' : '3:41:09', W / 2, 40, CRT[7], { scale: 2 });
  c.ellipse(W / 2, 66, 30, 4, CRT[3]); // still going, somewhere
  return crt(c, f);
}

/** Brogath, as the Channel draws him: a big shy man in a crown, half behind his own sash, blushing. */
function brogath(c, x, y, { blush = true, sash = 'hide' } = {}) {
  c.ellipse(x, y + 26, 16, 16, CRT[4]); // body
  c.ellipse(x, y, 10, 10, CRT[6]); // head
  crown(c, x - 6, y - 16, 1, CRT[7]);
  c.set(x - 4, y - 1, CRT[0]); c.set(x + 4, y - 1, CRT[0]);
  if (blush) { c.rect(x - 8, y + 3, 3, 2, CRT[3]); c.rect(x + 5, y + 3, 3, 2, CRT[3]); }
  if (sash === 'hide') for (let k = 0; k < 16; k++) c.rect(x - 14 + k, y + 4 + k, 4, 3, k % 4 ? CRT[5] : CRT[7]);
  if (sash === 'hold') { tvSash(c, x - 26, y + 18, 12, { angle: 0 }); tvSash(c, x + 14, y + 18, 12, { angle: 0 }); }
}

function scBrogath(f) {
  const c = screen(CRT[1]);
  brogath(c, W / 2, 22 + f);
  t(c, 'BROGATH', W / 2, 64);
  return crt(c, f);
}

function scTreasure(f) {
  const c = screen(CRT[1]);
  c.ellipse(W / 2, 64, 46, 14, CRT[5]); // the pile
  for (let i = 0; i < 24; i++) c.ellipse(10 + ((i * 37) % 84), 56 + ((i * 13) % 12), 2, 1.5, CRT[7]);
  c.rect(20, 46, 14, 10, CRT[4]); // a chest
  crown(c, 64, 40, 1, CRT[7]);
  brogath(c, 84, 22, { sash: 'none' }); // a golden statue of himself, blushing
  if (f) c.set(16, 40, CRT[7]);
  return crt(c, f);
}

function scDig(f) {
  const c = screen(CRT[1]);
  c.rect(0, 54, W, 24, CRT[3]);
  c.ellipse(60, 58, 18, 8, CRT[0]); // the hole
  brogath(c, 32, 26 + (f ? 2 : 0), { sash: 'none' });
  c.line(44, 30, 58 + f * 4, 54, CRT[5]); // the spade
  c.rect(4, 4, 24, 10, CRT[0]);
  t(c, f ? '3:00' : '2:59', 16, 5, CRT[7]);
  return crt(c, f);
}

function scBrogathSash(f) {
  const c = screen(CRT[1]);
  c.rect(0, 58, W, 20, CRT[3]);
  c.ellipse(W / 2, 62, 16, 6, CRT[0]);
  brogath(c, W / 2, 18 - f, { sash: 'hold' });
  return crt(c, f);
}

function scBlast(f) {
  const c = screen(CRT[1]);
  c.rect(0, 62, W, 16, CRT[3]);
  for (let i = 0; i < 20; i++) {
    const x = W / 2 + Math.round(Math.sin(i * 2.3) * (10 + i * 2));
    const y = 60 - i * 3 - f * 6;
    c.ellipse(x, y, 6 - i / 5, 4 - i / 8, i % 2 ? CRT[5] : CRT[4]);
  }
  for (const [x, y] of [[30, 20], [70, 14], [50, 6], [84, 30]]) { c.ellipse(x, y - f * 4, 2, 2, CRT[7]); } // treasure, going up
  crown(c, 58, 4 - f * 3, 1, CRT[7]);
  return crt(c, f);
}

function scSharks(f) {
  const c = screen(CRT[0]);
  for (let a = 0; a < 16; a += 0.2) c.set(Math.round(W / 2 + Math.cos(a - f) * a * 2.6), Math.round(40 + Math.sin(a - f) * a * 1.8), CRT[2]);
  sharkie(c, 24, 20 + f);
  sharkie(c, 80, 56 - f, { flip: true });
  crown(c, 70, 26, 1, CRT[7]); // the biggest wears the crown,
  for (let x = 60; x < 90; x += 2) c.set(x, 40 + Math.round(Math.sin(((x - 60) / 30) * Math.PI) * 4), CRT[7]); // on a chain
  c.ellipse(78, 36, 12, 6, CRT[5]);
  return crt(c, f);
}

function scSob(f) {
  const c = screen(CRT[1]);
  c.rect(0, 40, W, 38, CRT[3]);
  c.ellipse(W / 2, 46, 30, 10, CRT[0]); // the hole
  brogath(c, W / 2, 30 + f, { blush: false, sash: 'hide' });
  c.ellipse(W / 2 - 3, 31 + f, 1.5, 3, CRT[7]); // tears
  c.ellipse(W / 2 + 5, 31 - f, 1.5, 3, CRT[7]);
  t(c, 'POOR IN GOLD', W / 2, 58, CRT[7]);
  t(c, 'RICH IN GAS', W / 2, 68, CRT[6]);
  return crt(c, f);
}

function scSponsor(f) {
  const c = screen(CRT[0]);
  t(c, 'BROUGHT TO YOU', W / 2, 6, CRT[6]);
  t(c, 'BY', W / 2, 16, CRT[6]);
  c.ellipseOutline(W / 2, 38, 12, 12, CRT[7]);
  c.poly([[W / 2 - 8, 40], [W / 2 + 8, 38], [W / 2 + 3, 46], [W / 2 - 6, 46]], CRT[5]);
  crown(c, W / 2 - 6, 26 + f, 1, CRT[7]);
  t(c, 'BLING BLING KING', W / 2, 58, CRT[7]);
  return crt(c, f);
}

function scNoseTest(f) {
  const c = screen(CRT[2]);
  for (let x = 0; x < W; x += 13) c.rect(x, 0, 12, 18, [CRT[3], CRT[4], CRT[5], CRT[6], CRT[7]][(x / 13) % 5]); // colour bars
  c.ellipse(W / 2, 42, 14, 16, CRT[6]); // a big painted nose
  c.ellipse(W / 2 - 5, 52, 3, 2, CRT[1]);
  c.ellipse(W / 2 + 5, 52, 3, 2, CRT[1]);
  t(c, 'SMELL TEST', W / 2, 64, f ? CRT[7] : CRT[6]);
  return crt(c, f);
}

// --- the bedroom set close up (Phase 13) ---------------------------------------------------------

const { x: SX, y: SY, w: SW, h: SH } = SES_SCREEN;
const BW = SES_BEZEL.w;
const BH = SES_BEZEL.h;
const KIT = { d: '#3a2010', m: '#6a3a1c', l: '#8a5228', h: '#a86a38' };

function kitCabinet(c) {
  // a cabinet from a kit for ages eight and up: thin ply, a decal that's peeling, too many screws
  for (let y = 10; y < 140; y++) for (let x = 14; x < 194; x++) {
    let col = (x * 3 + y * 7) % 41 === 0 ? KIT.l : KIT.m;
    if (y < 14 || x < 18) col = KIT.h;
    if (y > 135 || x > 189) col = KIT.d;
    c.set(x, y, col);
  }
  for (const [x, y] of [[20, 14], [186, 14], [20, 132], [186, 132], [104, 14], [104, 132]]) c.rect(x, y, 2, 2, '#c8ccd4'); // screws
  // the screen hole, with a cardboard surround
  for (let y = SY - 5; y < SY + SH + 5; y++) for (let x = SX - 5; x < SX + SW + 5; x++) c.set(x, y, '#d8b47a');
  for (let y = SY; y < SY + SH; y++) for (let x = SX; x < SX + SW; x++) c.set(x, y, '#00000000');
  // the decal: STENCHMASTER ENTERTAINMENT SYSTEM (BUILD-YOUR-OWN), peeling at one corner
  c.rect(30, 112, 148, 16, '#c8242c');
  drawText(c, 'BUILD-YOUR-OWN S.E.S.', 104, 116, '#f4dc6c', { center: true });
  c.poly([[170, 112], [178, 112], [178, 120]], KIT.m);
}

function kitBezel() {
  const c = new PixelCanvas(BW, BH);
  kitCabinet(c);
  // three of Jim's forks for an aerial, a horseshoe across them
  for (const x of [90, 104, 118]) {
    c.rect(x, 0, 3, 12, '#c8ccd4');
    for (const dx of [-1, 1, 3]) c.vline(x + dx, 0, 4, '#a8acb4');
  }
  c.thickLine(84, 6, 126, 6, 2, '#8a8e96');
  // the knobs down the right, the grille with its dial on the side (Stench-O-Vision)
  for (const y of [34, 54, 74]) {
    c.ellipse(176, y, 7, 7, '#2a1a10');
    c.ellipse(176, y, 5, 5, '#e8c850');
    c.vline(176, y - 4, y, '#2a1a10');
  }
  c.rect(166, 88, 20, 18, '#2a2a2a');
  for (let y = 90; y < 104; y += 3) c.hline(168, 183, y, '#6a6a6a');
  c.ellipse(176, 82, 3, 3, '#c890e0'); // the dial
  c.outline(INK);
  return c;
}

function kitBack() {
  const c = new PixelCanvas(BW, BH);
  kitCabinet(c);
  c.rect(30, 22, 148, 86, '#1e140c');
  const r = rng(913);
  for (let k = 0; k < 6; k++) {
    const cx = 48 + k * 22;
    const cy = 48 + Math.round(r() * 30);
    for (let a = 0; a < Math.PI * 4; a += 0.2) c.set(Math.round(cx + Math.cos(a) * (2 + a * 1.2)), Math.round(cy + Math.sin(a) * (2 + a)), k % 2 ? '#d8803a' : '#a85020'); // the coil
  }
  drawText(c, 'INSERT ANTENNA HERE', 104, 26, '#e8dcc0', { center: true });
  drawText(c, '(FORKS NOT INCLUDED)', 104, 36, '#a89878', { center: true });
  c.outline(INK);
  return c;
}

function kitPower() {
  const c = new PixelCanvas(BW, BH);
  kitCabinet(c);
  c.rect(60, 36, 88, 70, '#2a2e36'); // the transformer, humming
  for (let y = 40; y < 102; y += 6) c.hline(64, 143, y, '#5a5e66');
  c.rect(92, 20, 24, 16, '#8a8e96');
  c.ellipse(104, 70, 10, 10, '#e8c850');
  drawText(c, 'HUMS', 104, 66, '#2a1a10', { center: true });
  c.outline(INK);
  return c;
}

// --- the old quarters in toy sashes (Phase 13) -------------------------------------------------

function quartersRed(f) {
  const c = new PixelCanvas(320, 224);
  c.fill('#140608');
  for (let k = 0; k < 7; k++) c.thickLine(12 + k * 50, 0, 12 + k * 50, 224, 6, '#2a0c10'); // the ribs
  for (const by of [6, 30]) { c.rect(0, by, 320, 10, '#2e1012'); c.hline(0, 319, by + 9, '#140608'); }
  // red sash hammocks, slung everywhere, pennants across the beams
  for (const [x0, x1, y] of [[10, 110, 60], [200, 310, 52], [40, 150, 120], [180, 300, 130]]) {
    for (let x = x0; x < x1; x++) {
      const s = Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 14);
      c.vline(x, y + s, y + s + 5, (x >> 3) % 2 ? SASH.m : SASH.d);
      if (x % 9 === 0) c.set(x, y + s, SASH.gold);
    }
  }
  for (let x = 0; x < 320; x += 12) c.poly([[x, 44], [x + 8, 44], [x + 4, 54]], x % 24 ? SASH.m : SASH.gold);
  // cardboard Stenchmasters at the edges of the light
  for (const [x, h] of [[24, 70], [292, 74]]) { c.rect(x - 8, 224 - h - 40, 16, h, '#3a2a20'); c.ellipse(x, 224 - h - 46, 7, 8, '#4a3a2a'); }
  // the set's light: purple at the middle
  for (let y = 0; y < 224; y++) for (let x = 0; x < 320; x++) {
    const d = Math.hypot((x - 160) / 170, (y - 100) / 130);
    if (d < 1) c.blend(x, y, '#c890e0', (1 - d) * (0.2 + f * 0.04));
  }
  return c;
}

/** The crew from behind, in the red room: sashes over their shoulders now, every one. */
function crewBacksSash() {
  const c = new PixelCanvas(320, 92);
  const figure = (x, w, h, hat, col) => {
    const top = 92 - h;
    c.ellipse(x, 92, w, 12, '#2a0c10');
    c.rect(x - w + 2, top + 18, (w - 2) * 2, h - 18, col);
    c.ellipse(x, top + 18, w - 2, 7, col);
    c.ellipse(x, top + 10, 8, 9, '#3a2418');
    for (let k = 0; k < (w - 2) * 2; k += 2) c.rect(x - w + 2 + k, top + 20 + k / 2, 2, 3, SASH.m); // a sash blanket over the shoulder
    if (hat === 'nightcap') c.poly([[x - 8, top + 6], [x + 8, top + 6], [x + 14, top - 2]], '#d8d0c0');
    if (hat === 'tricorn') c.poly([[x - 12, top + 6], [x, top - 2], [x + 12, top + 6], [x, top + 4]], '#1a1a24');
    if (hat === 'bald') c.ellipse(x, top + 6, 7, 6, '#c89870');
    if (hat === 'kerchief') c.ellipse(x, top + 5, 8, 5, '#e8e0d0');
  };
  figure(40, 14, 60, 'nightcap', '#4a4a3a'); // Pete
  figure(86, 15, 56, 'bald', '#2a4a4a'); // Gristle
  figure(140, 20, 64, 'kerchief', '#3a3a50'); // Jim
  figure(206, 16, 58, 'bald', '#5a1a24'); // Garrick, in front, enraptured
  figure(290, 15, 64, 'tricorn', '#4a1a1a'); // the captain, on the end, standing
  c.outline(INK);
  return c;
}

// --- the Grand Dice (Phase 12) -----------------------------------------------------------------

const DIE = { top: '#b884e8', front: '#7a48b0', side: '#5a3088', edge: '#d0a8f8', pip: '#f8f0ff' };
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };

function gdie(face) {
  const c = new PixelCanvas(56, 56);
  c.poly([[6, 14], [36, 6], [50, 14], [20, 22]], DIE.top); // the top
  c.poly([[6, 14], [20, 22], [20, 52], [6, 44]], DIE.side);
  c.poly([[20, 22], [50, 14], [50, 44], [20, 52]], DIE.front);
  c.line(20, 22, 50, 14, DIE.edge);
  for (const [dx, dy] of PIPS[face]) {
    const x = 35 + dx * 8;
    const y = 33 + dy * 8 - Math.round(dx * 2);
    c.ellipse(x, y, 3, 3, DIE.pip);
  }
  if (face === 3) { c.rect(26, 44, 18, 4, '#f0e080'); c.hline(28, 41, 45, '#8a6a1c'); } // ONE DAY, on the sticker
  c.outline(INK);
  return c;
}

function gdieTumble(k) {
  const c = new PixelCanvas(56, 56);
  const a = (k / 4) * Math.PI / 2 + 0.3;
  const pts = [0, 1, 2, 3].map((i) => [28 + Math.cos(a + (i * Math.PI) / 2) * 22, 28 + Math.sin(a + (i * Math.PI) / 2) * 22]);
  c.poly(pts, k % 2 ? DIE.front : DIE.top);
  c.poly([pts[0], pts[1], [pts[1][0] + 4, pts[1][1] + 6], [pts[0][0] + 4, pts[0][1] + 6]], DIE.side);
  for (let i = 0; i < 3; i++) c.ellipse(28 + Math.cos(a * 2 + i * 2) * 8, 28 + Math.sin(a * 2 + i * 2) * 8, 2.5, 2.5, DIE.pip);
  c.outline(INK);
  return c;
}

function gdieShadow() {
  const c = new PixelCanvas(56, 14);
  c.ellipse(28, 7, 24, 5, '#00000060');
  return c;
}

// --- the Cheap-O-Rama drop; the flutter (Phases 11-12) -------------------------------------------

function cheapoCopter(f) {
  const c = new PixelCanvas(140, 120);
  // a box with a whirling blade on top, orange and white, lights blinking
  c.hline(10 + f * 20, 130 - f * 20, 6, '#c8ccd4');
  c.rect(68, 6, 4, 10, '#5a5e66');
  c.rect(30, 16, 80, 36, '#e87a2a');
  c.rect(30, 34, 80, 8, '#f8f4ec');
  c.rect(36, 20, 20, 12, '#8ab8d8'); // the window
  c.rect(110, 28, 26, 6, '#e87a2a'); // the tail
  c.set(134, 26, f ? '#ff4040' : '#401010');
  c.set(32, 50, f ? '#40ff40' : '#104010');
  // the winch line and the crate, swinging
  const sx = 70 + (f ? 4 : -4);
  c.line(70, 52, sx, 96, '#2a2a2a');
  c.rect(sx - 14, 96, 28, 20, '#b89058');
  c.rect(sx - 12, 104, 24, 4, '#c8242c');
  c.outline(INK);
  return c;
}

function cheapoLabel() {
  const c = new PixelCanvas(120, 60);
  c.rect(0, 0, 120, 60, '#f4ecd8');
  c.strokeRect(0, 0, 120, 60, '#c8242c');
  drawText(c, 'DELIVER TO:', 6, 4, '#3a2a1a');
  drawText(c, 'THE FART MAN', 6, 14, '#3a2a1a');
  drawText(c, 'C/O THE STORM', 6, 24, '#3a2a1a');
  drawText(c, 'PRIORITY:', 6, 38, '#c8242c');
  drawText(c, 'EMERGENCY', 6, 48, '#c8242c');
  c.outline(INK);
  return c;
}

/** The mainmast in the storm's light: the deck, the mast, the crew pointing (in silhouette). */
function flutterDeck(f) {
  const c = new PixelCanvas(320, 224);
  const r = rng(77 + f);
  for (let y = 0; y < 224; y++) for (let x = 0; x < 320; x++) {
    const band = Math.sin(y * 0.09 + x * 0.03 - f * 1.3) + Math.sin(y * 0.04 + f * 0.6) * 0.6;
    c.set(x, y, band > 1 ? STORMC.spray : band > 0.3 ? STORMC.h : band > -0.4 ? STORMC.l : STORMC.m);
  }
  for (let i = 0; i < 20; i++) c.ellipse(Math.floor(r() * 320), Math.floor(r() * 120), 4, 2, '#5a6a80');
  c.rect(0, 150, 320, 74, '#5a3e24'); // the deck
  for (let y = 154; y < 224; y += 8) c.hline(0, 319, y, '#4a321c');
  c.rect(150, 0, 20, 160, '#6a4a2a'); // the mainmast
  c.vline(152, 0, 159, '#8a6a3a');
  for (const [x, flip] of [[40, 1], [74, 1], [250, -1], [284, -1]]) {
    c.ellipse(x, 186, 10, 22, '#1a120c'); // a crew silhouette,
    c.ellipse(x, 158, 8, 9, '#1a120c');
    c.line(x + flip * 6, 176, x + flip * 26, 160, '#1a120c'); // pointing
  }
  return c;
}

/** The Grand Stenchmaster from behind at the mast, braced, crown on. */
function flutterGarrick() {
  const c = new PixelCanvas(80, 110);
  c.ellipse(40, 72, 28, 34, '#5a1424'); // the burgundy back
  c.rect(20, 92, 16, 18, '#7a8a2a'); // bilious trousers
  c.rect(44, 92, 16, 18, '#7a8a2a');
  c.ellipse(40, 30, 16, 16, '#c87a50'); // head (back of)
  c.ellipse(40, 26, 14, 10, '#8a2a1a'); // the combover
  crownBig(c, 26, 4);
  c.outline(INK);
  return c;
}

function crownBig(c, x, y) {
  c.poly([[x, y + 14], [x, y + 2], [x + 7, y + 8], [x + 14, y], [x + 21, y + 8], [x + 28, y + 2], [x + 28, y + 14]], '#e0b030');
  c.hline(x, x + 28, y + 13, '#9a6a10');
}

/** The sash at his shoulders: hanging, a lift, two flaps, and FULL FLUTTER (out sideways, like a flag). */
function sashFlap(stage) {
  const c = new PixelCanvas(160, 80);
  const cx = 80;
  const lift = [0, 6, 12, 22][stage];
  for (const side of [-1, 1]) {
    const len = 30 + stage * 10;
    for (let k = 0; k < len; k++) {
      const x = cx + side * (12 + k);
      const droop = stage === 3 ? Math.round(Math.sin(k * 0.5) * 4) : Math.round(k * (1 - lift / 30));
      const y = 20 + droop - (stage === 3 ? 0 : Math.round(lift * Math.sin((k / len) * Math.PI)));
      c.rect(x, y, 2, 7, k % 6 === 0 ? '#f4dc6c' : k % 2 ? '#c8982a' : '#ecc450');
      c.set(x, y + 7, '#5e1624');
    }
  }
  c.rect(cx - 12, 18, 24, 10, '#c8982a'); // across his shoulders
  c.rect(cx - 3, 20, 6, 5, '#6a9a2c'); // the badge
  c.outline(INK);
  return c;
}

/** The Mark II on by itself (Phase 12, the surge): the Bling Bling King on screen, holding its nose with a fin. */
export function sharkHoldsNose(f = 0) {
  const c = screen(CRT[1]);
  host(c, f, { y: 4 });
  c.poly([[22, 40], [34, 30], [40, 44], [30, 50]], CRT[5]); // the fin, over its snout
  for (const [x, y] of [[10, 20], [16, 14], [8, 30]]) c.set(x, y, CRT[6]); // wavy lines: the smell
  return crt(c, f);
}

// --- registration -----------------------------------------------------------------------------

const PAIRS = {
  bbk_late: bbkLate, bbk_late_title: bbkLateTitle, bbk_late_chart: bbkLateChart, bbk_late_hammock: bbkLateHammock,
  bbk_court: bbkCourt, hold_my_sash: holdMySash, cheapo_ad: cheapoAd, cheapo_logo: cheapoLogo,
  bbk_day_title: bbkDayTitle, bbk_day_dice: bbkDayDice, bbk_day_face: bbkDayFace, bbk_day_finger: bbkDayFinger,
  bbk_day_breakfast: bbkDayBreakfast, bbk_day_reenact: bbkDayReenact, bbk_day_teaser: bbkDayTeaser,
  trash_song_a: trashSongA, trash_song_cannon: trashSongCannon, trash_song_anchor: trashSongAnchor, trash_song_fire: trashSongFire,
  trash_song_crew: trashSongCrew, trash_song_storm: trashSongStorm, trash_song_kick: trashSongKick,
  sc_logo: scLogo, sc_cradle: scCradle, sc_castle: scCastle, sc_waft: scWaft, sc_flutter: scFlutter, sc_runtime: scRuntime,
  sc_brogath: scBrogath, sc_treasure: scTreasure, sc_dig: scDig, sc_brogath_sash: scBrogathSash, sc_blast: scBlast,
  sc_sharks: scSharks, sc_sob: scSob, sc_sponsor: scSponsor, sc_nose_test: scNoseTest,
  quarters_red: quartersRed, cheapo_copter: cheapoCopter, flutter_deck: flutterDeck,
};

const SINGLE = {
  kit_bezel: kitBezel, kit_back: kitBack, kit_power: kitPower,
  crew_backs_sash: crewBacksSash,
  gdie_shadow: gdieShadow,
  cheapo_label: cheapoLabel,
  flutter_garrick: flutterGarrick,
  sash_flap_0: () => sashFlap(0), sash_flap_1: () => sashFlap(1), sash_flap_2: () => sashFlap(2), sash_flap_full: () => sashFlap(3),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`gdie_${n}`, () => gdie(n)])),
  ...Object.fromEntries([0, 1, 2, 3].map((k) => [`gdie_tumble_${k}`, () => gdieTumble(k)])),
};

export function addPhase11VistaFrames(atlas) {
  for (const [id, fn] of Object.entries(SINGLE)) atlas.add(id, fn());
  for (const [id, fn] of Object.entries(PAIRS)) for (const f of [0, 1]) atlas.add(`${id}_${f}`, fn(f));
}

export const PHASE11_VISTA_FRAMES = [...Object.keys(SINGLE), ...Object.keys(PAIRS).flatMap((n) => [`${n}_0`, `${n}_1`])];

void mix;
