import { PixelCanvas } from '../PixelCanvas.js';
import { PAL, mix } from '../palette.js';
import { drawText, textWidth } from '../font/drawText.js';
import { rng } from './sesArt.js';
import { CRT, crt, screen, franklin, desk, stormColumn } from './vistaPhase6.js';
import { auditor } from './vistaPhase8.js';
import { mk2 } from './vistaPhase7.js';
import { C, page, cray, blob, label, figure } from './vistaLegend.js';
import { megalodon } from '../props/phase9Props.js';

/**
 * Vista art for Story Phase 10 (the Bling Bling King's prizes; the beans; the
 * Counter-Sharkstorm Initiative; the Great Sharkstorm spout catastrophe):
 *
 *   - The Bling Bling King: the crowned megalodon in an enormous gold chain
 *     with a diamond pendant (an original design: a plate of ice with a
 *     crowned shark's head and BLING BLING KING across it). Persistent.
 *   - The deliveries: a flying catering barge (a fictional outfit, THE GILDED
 *     GILL, under a great spinning rotor) bringing the sharks luxury seafood,
 *     and then luxury bedding; a ruby necklace going the other way as
 *     payment; a shark at dinner with a napkin; the storm nesting in pillows.
 *   - Garrick's bedtime legends, in his crayon, on the ledger page: Brogath
 *     the Bashful (alleged), and Grand Stenchmaster Rumpold Windbreaker the
 *     Resolute, who stopped a storm (also alleged), and the part after.
 *   - The captain's fantasy (everything gold, Squawks in full feather, the
 *     beard clean, the crown in his hands) and the crack that ends it.
 *   - The approach: the storm close enough to fill the sky, treasure going
 *     round in it. The wrong-way blast: the Revenge side-on, the jet going
 *     down off the bow into the sea, the sea erupting brown and green and
 *     yellow, huge bubbles, put-out fish, the stain spreading; speed lines.
 *   - Inside the Great Sharkstorm: the funnel's walls streaming round, the
 *     ship small in the middle, the storm's tokens floating by with banners.
 *   - The galley at night by the kerosene lamp, and the galley inside the
 *     storm (pots swinging, a porthole full of whirling cloud).
 *   - Television (green CRT): the Frog Tax Man's sleep deductions; the
 *     impossible audit of the storm; the Bling Bling King on the set, smooth,
 *     respecting the brand; the book cited as law (Chapter 47); PAID; and
 *     an advertisement for Bling Bling King Treasure Solutions.
 *   - S.E.S. Mark II with its horseshoe aerial knocked flat, and with a can
 *     of Spicy Stench Sauce jammed on it (which works).
 *   - The captain's glory days, in sepia, as the crew remember them.
 *
 * Nothing here is a real company, a real logo, or anyone else's character.
 */
const INK = PAL.ink;
const SW = 104;
const SH = 78;
const GOLD = { d: '#9a6a10', m: '#e0b030', l: '#f8e070', h: '#fff8c0' };
const ICE = { d: '#5a90c0', m: '#b8e0f8', l: '#e8f8ff', h: '#ffffff' };
const SHARK = { d: '#3a4658', m: '#5a6a80', l: '#8a9ab0', belly: '#d8dce4' };
const FUME = { d: '#7a7020', m: '#b8b030', l: '#d8d060', h: '#f0ec98' };
const SOUP = { d: '#3a3410', m: '#6a5a1c', l: '#8a7a2c', g: '#5a7a24', y: '#c8b440' }; // the sea, after
const STORMC = { d: '#141c18', m: '#24352e', l: '#3e584a', h: '#56705e', spray: '#9ab8b0' };
const RUBY = '#d02838';
const EMERALD = '#28a050';

// --- the Bling Bling King --------------------------------------------------------------

/** A link-by-link gold chain along a sagging curve, `w` pixels thick. */
function chain(c, x0, y0, x1, y1, sag, w = 3) {
  const n = Math.max(8, Math.round(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag);
    const link = Math.floor(i / 3) % 2;
    for (let k = 0; k < w; k++) c.set(x, y + k, k === 0 ? GOLD.l : k === w - 1 ? GOLD.d : link ? GOLD.m : GOLD.h);
  }
}

/** The pendant: a plate of ice, a crowned shark's head on it, BLING BLING KING across it. */
function pendant(c, cx, top, { big = false } = {}) {
  const w = big ? 112 : 44;
  const h = big ? 74 : 32;
  const x0 = Math.round(cx - w / 2);
  // the plate, bevelled
  c.rect(x0, top, w, h, ICE.m);
  c.hline(x0, x0 + w - 1, top, ICE.h);
  c.vline(x0, top, top + h - 1, ICE.l);
  c.hline(x0, x0 + w - 1, top + h - 1, ICE.d);
  c.vline(x0 + w - 1, top, top + h - 1, ICE.d);
  // the stones set round the edge
  for (let x = x0 + 2; x < x0 + w - 2; x += big ? 5 : 3) {
    c.set(x, top + 1, ICE.h);
    c.set(x + 1, top + h - 2, ICE.h);
  }
  // the crowned shark's head, gold, facing left: snout, a grin of teeth, an eye, gills, a crown on top
  const hx = Math.round(cx);
  const hy = top + (big ? 12 : 4);
  const s = big ? 2 : 1;
  const P = (dx, dy) => [hx + dx * s, hy + dy * s];
  c.poly([P(-8, 5), P(-3, 2), P(6, 2), P(8, 6), P(6, 10), P(-6, 9)], GOLD.m);
  c.poly([P(-8, 5), P(-2, 6), P(-6, 9)], GOLD.d); // the jaw
  for (let k = 0; k < 3; k++) c.set(hx + (-6 + k * 2) * s, hy + 6 * s, '#ffffff'); // teeth
  c.set(hx - 2 * s, hy + 4 * s, INK); // eye
  for (const gx of [2, 4]) c.vline(hx + gx * s, hy + 4 * s, hy + 8 * s, GOLD.d); // gills
  c.hline(hx - 4 * s, hx + 2 * s, hy + 1 * s, GOLD.l); // crown band
  for (const px of [-4, -1, 2]) c.vline(hx + px * s, hy - 2 * s, hy + 1 * s, GOLD.l); // crown points
  c.set(hx - 1 * s, hy - 2 * s, RUBY);
  if (big) {
    drawText(c, 'BLING BLING', cx, top + 34, GOLD.d, { center: true, scale: 1 });
    drawText(c, 'KING', cx, top + 48, GOLD.d, { center: true, scale: 2 });
  } else {
    drawText(c, 'BBK', cx, top + 20, GOLD.d, { center: true });
  }
  // glints
  for (const [dx, dy] of [[4, 3], [w - 6, h - 6], [w / 2, h - 4]]) {
    const gx = Math.round(x0 + dx);
    const gy = Math.round(top + dy);
    c.set(gx, gy, '#ffffff');
    c.set(gx - 1, gy, ICE.h);
    c.set(gx + 1, gy, ICE.h);
    c.set(gx, gy - 1, ICE.h);
    c.set(gx, gy + 1, ICE.h);
  }
}

/** The crowned megalodon, side-on, in its chain and pendant (the same fish as Phase 9's, now dressed). */
function megalodonBling(f) {
  const fish = megalodon({ crowned: true, water: false }).frames[f];
  const c = new PixelCanvas(fish.width, fish.height + 40);
  c.blit(fish, 0, 0);
  // the chain over the neck (just behind the head) and down under the jaw to the pendant
  chain(c, 38, 22, 70, 24, 40, 6);
  chain(c, 44, 24, 64, 26, 30, 3);
  pendant(c, 54, 66);
  c.outline(INK);
  return c;
}

/** The pendant close up, catching the light. */
function pendantClose() {
  const c = new PixelCanvas(150, 110);
  chain(c, 0, 4, 52, 20, 6, 5);
  chain(c, 98, 20, 149, 4, 6, 5);
  chain(c, 50, 18, 100, 18, 4, 5);
  pendant(c, 75, 26, { big: true });
  c.outline(INK);
  return c;
}

// --- the deliveries ----------------------------------------------------------------

/**
 * THE GILDED GILL: a flat gilded barge with a striped awning, held up by a
 * great two-bladed rotor on a mast (it should not fly; it does). `cargo`:
 * 'seafood' (towers of platters) or 'bedding' (pillows, quilts, a mattress
 * rolled up, an enormous foam cushion). Frame flips the rotor.
 */
function barge(f, cargo) {
  const c = new PixelCanvas(170, 110);
  // the rotor and its mast
  c.rect(84, 14, 3, 40, '#6a4a28');
  if (f) c.thickLine(14, 12, 156, 16, 2, '#4a4a58');
  else c.thickLine(40, 6, 130, 22, 2, '#4a4a58');
  c.ellipse(85, 14, 4, 3, GOLD.m);
  for (const [x, y] of f ? [[10, 11], [160, 17]] : [[36, 5], [134, 23]]) c.set(x, y, '#c8c8d8'); // blur tips
  // the awning, striped
  c.poly([[30, 52], [140, 52], [150, 64], [20, 64]], '#f0ece0');
  for (let x = 24; x < 148; x += 12) c.poly([[x, 64], [x + 6, 64], [x + 8, 52], [x + 2, 52]], '#2a6a8a');
  for (let x = 22; x < 150; x += 6) c.set(x, 65 + ((x / 6) % 2), '#f0ece0'); // scallops
  // the hull: gilded, a name board
  c.poly([[12, 84], [158, 84], [148, 100], [22, 100]], '#7a4a1c');
  c.hline(12, 157, 84, GOLD.l);
  c.hline(16, 153, 87, GOLD.m);
  c.rect(40, 89, 90, 9, '#1e2a3a');
  drawText(c, 'THE GILDED GILL', 85, 90, GOLD.l, { center: true });
  // the cargo under the awning
  if (cargo === 'seafood') {
    for (const [x, w] of [[30, 22], [56, 26], [86, 24], [114, 24]]) {
      c.ellipse(x + w / 2, 82, w / 2, 3, '#c8ccd4'); // platter
      c.hline(x + 2, x + w - 2, 79, '#e8ecf0');
    }
    c.ellipse(41, 76, 6, 3, '#d8443a'); // lobster
    c.line(35, 74, 31, 70, '#d8443a');
    c.line(47, 74, 51, 70, '#d8443a');
    for (let k = 0; k < 5; k++) c.line(60 + k * 4, 80, 62 + k * 4, 70, '#e8784a'); // crab legs
    for (const ox of [90, 96, 102, 108]) { c.ellipse(ox, 78, 2.5, 1.5, '#8a8a7a'); c.set(ox, 77, '#f0ece0'); } // oysters
    c.ellipse(126, 78, 5, 3, '#2a3440'); // caviar
    c.ellipse(126, 77, 3, 1.5, '#5a6a7a');
    c.rect(120, 70, 12, 5, '#c84a5a'); // tuna
    for (let k = 0; k < 4; k++) c.set(122 + k * 3, 72, '#f0a0a8');
    for (const [sx, sy] of [[70, 76], [76, 78], [82, 75]]) c.ellipse(sx, sy, 2, 1, '#f8a080'); // shrimp
  } else {
    for (const [x, y, col] of [[28, 72, '#e8e0f0'], [44, 70, '#f0d0e0'], [60, 74, '#d8e8f0'], [36, 64, '#f0e8c8']]) {
      c.ellipse(x, y, 9, 5, col);
      c.set(x - 8, y - 4, GOLD.m);
      c.set(x + 8, y + 4, GOLD.m);
    }
    c.rect(78, 62, 26, 20, '#8a5aa8'); // a quilt, folded
    for (let y = 64; y < 82; y += 4) c.hline(78, 103, y, '#b088c8');
    c.ellipse(130, 72, 16, 10, '#f0e070'); // the giant foam cushion
    c.ellipse(128, 70, 10, 5, '#fff4a0');
    c.rect(92, 26, 34, 10, '#f0ece0'); // a board hung off the mast
    c.line(87, 24, 92, 26, '#6a4a28');
    drawText(c, 'LINENS', 109, 28, '#2a6a8a', { center: true });
  }
  c.outline(INK);
  return c;
}

function rubyNecklace() {
  const c = new PixelCanvas(30, 20);
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    const x = Math.round(2 + t * 26);
    const y = Math.round(3 + Math.sin(t * Math.PI) * 10);
    c.set(x, y, GOLD.l);
    if (i % 3 === 1) c.ellipse(x, y + 1, 1.5, 1.5, RUBY);
  }
  c.ellipse(15, 16, 3, 3, RUBY);
  c.set(14, 15, '#ffa0a8');
  c.outline(INK);
  return c;
}

/** A shark at dinner: a napkin tied on, a lobster in its jaws, very pleased with itself. */
function sharkDiner(f) {
  const c = new PixelCanvas(64, 40);
  c.ellipse(32, 20, 26, 10, SHARK.m);
  c.ellipse(30, 24, 20, 5, SHARK.belly);
  c.poly([[28, 11], [36, 1], [40, 11]], SHARK.d);
  c.poly([[56, 18], [63, 8 + f * 2], [60, 20], [63, 32 - f * 2]], SHARK.d);
  c.poly([[10, 18], [16, 26], [22, 20]], '#f4f0f0'); // the napkin
  c.set(14, 19, '#d8d8e0');
  c.ellipse(5, 20, 6, 3, '#d8443a'); // lobster in its jaws
  c.line(0, 17, 2, 19, '#d8443a');
  c.set(12, 16, '#0a0a10');
  c.hline(10, 13, 15, SHARK.d); // eyes half shut with pleasure
  c.outline(INK);
  return c;
}

/** The storm with the bedding wound into it: pillows and quilts going round, a nest near the top. */
function stormNest(f) {
  const c = stormColumn(f);
  const r = rng(301 + f * 7);
  for (let i = 0; i < 26; i++) {
    const y = 20 + Math.floor(r() * 170);
    const t = 1 - y / 209;
    const half = 10 + t ** 1.6 * 58;
    const x = Math.round(70 + (r() - 0.5) * half * 1.6);
    const col = ['#e8e0f0', '#f0d0e0', '#d8e8f0', '#f0e8c8', '#8a5aa8'][i % 5];
    c.ellipse(x, y, 4, 2, col);
    c.set(x - 3, y - 2, GOLD.m);
  }
  // the nest: a ring of quilts round the head of it, a giant cushion in the middle
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    c.ellipse(70 + Math.cos(a) * 30, 22 + Math.sin(a) * 6, 6, 3, k % 2 ? '#8a5aa8' : '#f0d0e0');
  }
  c.ellipse(70, 20, 12, 5, '#f0e070');
  return c;
}

/** Pillows blown off the top of the nest, tumbling down the wind towards you. */
function pillowsTumble(f) {
  const c = new PixelCanvas(120, 70);
  const r = rng(51 + f);
  for (let i = 0; i < 7; i++) {
    const x = 12 + Math.floor(r() * 96);
    const y = 10 + Math.floor(r() * 50);
    const t = (i + f) % 2;
    c.poly([[x - 8, y - 4 + t], [x + 7, y - 5], [x + 8, y + 4 - t], [x - 7, y + 5]], ['#e8e0f0', '#f0d0e0', '#d8e8f0'][i % 3]);
    c.line(x - 6, y - 3, x + 5, y - 4, '#ffffff');
    for (const [dx, dy] of [[-9, -5], [8, -6], [9, 5], [-8, 6]]) c.set(x + dx, y + dy, GOLD.m);
  }
  c.outline(INK);
  return c;
}

// --- Garrick's legends (crayon) ------------------------------------------------------------

function brogathShy() {
  const c = page(41);
  // an enormous figure in a sash hiding behind a very small rock, blushing, a little yellow puff
  blob(c, 96, 74, 20, 18, C.mustard, 1);
  blob(c, 96, 50, 9, 9, C.pink, 2);
  for (const dx of [-5, 5]) blob(c, 96 + dx, 52, 2, 2, C.red, dx); // the blush
  cray(c, 80, 64, 112, 86, C.burg, 3); // the sash
  blob(c, 70, 88, 16, 8, C.grey, 4); // the rock
  for (let k = 0; k < 3; k++) cray(c, 120 + k * 5, 84, 126 + k * 5, 74, C.bile, k);
  label(c, 'BROGATH THE BASHFUL', 4, C.burg);
  label(c, 'VERY SHY ABOUT IT');
  return c;
}

function brogathTreasure() {
  const c = page(42);
  // a mountain of treasure, a tiny shovel, Brogath lying down after three minutes
  blob(c, 120, 74, 36, 22, C.yellow, 1);
  for (const [x, y] of [[104, 62], [126, 58], [140, 70], [112, 78]]) blob(c, x, y, 3, 3, C.red, x);
  cray(c, 60, 92, 60, 70, C.brown, 2);
  blob(c, 60, 68, 4, 3, C.grey, 3);
  blob(c, 34, 86, 16, 6, C.mustard, 4); // lying down
  blob(c, 18, 84, 5, 5, C.pink, 5);
  drawText(c, 'ZZZ', 30, 66, C.blue, { jitter: 1 });
  label(c, 'HE DUG FOR THREE MINUTES', 4, C.burg);
  label(c, '(EXHAUSTING)');
  return c;
}

function brogathBlast() {
  const c = page(43);
  // the mighty blast: the treasure going up into a whirl with sharks in it
  for (let k = 0; k < 8; k++) cray(c, 80 + k * 2, 96, 70 + k * 6, 40, C.bile, k);
  for (let a = 0; a < 18; a += 0.3) c.set(Math.round(120 + Math.cos(a) * a * 1.8), Math.round(34 + Math.sin(a) * a * 0.9), C.grey);
  for (const [x, y] of [[100, 30], [134, 40], [118, 20], [146, 26]]) blob(c, x, y, 3, 2, C.yellow, x);
  for (const [x, y] of [[108, 44], [140, 18]]) { blob(c, x, y, 6, 3, C.blue, y); cray(c, x + 6, y, x + 10, y - 3, C.blue, x); }
  label(c, 'THE MIGHTY BLAST', 4, C.burg);
  label(c, 'ALL OF IT. INTO THE SHARKS.');
  return c;
}

function brogathBlingus() {
  const c = page(44);
  // the biggest shark, wearing all of it: BLINGUS
  blob(c, 90, 62, 50, 16, C.blue, 1);
  cray(c, 140, 62, 162, 48, C.blue, 2);
  cray(c, 140, 62, 162, 76, C.blue, 3);
  for (const px of [60, 66, 72]) cray(c, px, 44, px, 36, C.yellow, px); // crown
  cray(c, 58, 44, 74, 44, C.yellow, 4);
  for (let x = 66; x < 116; x += 4) blob(c, x, 74 + Math.round(Math.sin(x * 0.2) * 2), 2, 2, C.yellow, x); // chain
  blob(c, 52, 60, 2, 2, C.black, 5);
  label(c, 'BLINGUS', 4, C.burg);
  label(c, 'THE FIRST BLING KING (PROBABLY)');
  return c;
}

function brogathLesson() {
  const c = page(45);
  // the moral: a stick figure in a blue sash, looking at sharks, very professional
  figure(c, 88, 40, { body: C.blue, arms: 'up' });
  cray(c, 82, 48, 94, 60, C.blue, 2);
  for (const [x, y] of [[40, 70], [140, 74], [120, 52]]) { blob(c, x, y, 7, 3, C.grey, x); cray(c, x + 7, y, x + 11, y - 3, C.grey, y); }
  label(c, 'THE LESSON:', 4, C.burg);
  label(c, 'ALWAYS HIRE A|GRAND SHARKMASTER');
  return c;
}

function rumpoldFaces() {
  const c = page(51);
  // a tornado on the right; on the left a Grand Stenchmaster, rear towards it, very brave
  for (let y = 16; y < 96; y += 3) {
    const w = 4 + (96 - y) * 0.35;
    cray(c, Math.round(130 - w), y, Math.round(130 + w), y + 1, C.grey, y);
  }
  blob(c, 60, 62, 15, 15, C.mustard, 2);
  blob(c, 60, 42, 7, 7, C.pink, 3);
  cray(c, 47, 53, 73, 74, C.burg, 4);
  blob(c, 74, 66, 6, 8, C.burg, 5); // the rear, aimed
  cray(c, 82, 62, 102, 58, C.red, 6);
  cray(c, 98, 54, 102, 58, C.red, 7);
  cray(c, 98, 62, 102, 58, C.red, 8);
  label(c, 'RUMPOLD WINDBREAKER|THE RESOLUTE', 4, C.burg);
  label(c, 'HE FACED IT REAR-FIRST');
  return c;
}

function rumpoldEye() {
  const c = page(52);
  // the funnel from above, a calm eye in the middle, a little figure waiting
  for (let a = 0; a < 26; a += 0.15) c.set(Math.round(88 + Math.cos(a) * (8 + a * 1.6)), Math.round(56 + Math.sin(a) * (5 + a * 1.1)), C.grey);
  blob(c, 88, 56, 6, 4, C.paper, 3);
  blob(c, 30, 88, 6, 6, C.mustard, 4);
  drawText(c, '...', 30, 72, C.brown, { center: true, jitter: 1 });
  label(c, 'HE WAITED FOR THE MIDDLE', 4, C.burg);
  label(c, '(PATIENTLY)');
  return c;
}

function rumpoldWind() {
  const c = page(53);
  // meet wind with wind: two great arrows, head to head, round ones and a straight one
  for (let a = 0; a < Math.PI * 1.6; a += 0.05) c.set(Math.round(110 + Math.cos(a) * 28), Math.round(56 + Math.sin(a) * 26), C.grey);
  cray(c, 20, 56, 96, 56, C.bile, 1);
  cray(c, 20, 52, 96, 52, C.bile, 2);
  cray(c, 88, 46, 100, 54, C.bile, 3);
  cray(c, 88, 62, 100, 54, C.bile, 4);
  label(c, 'MEET WIND WITH WIND', 4, C.burg);
  label(c, 'OPPOSING FLOW!|ROTATION: DISRUPTED');
  return c;
}

function rumpoldCollapse() {
  const c = page(54);
  // the funnel falling apart into a heap of clouds; the sky clear; Rumpold bowing
  for (let k = 0; k < 7; k++) blob(c, 70 + k * 12, 84 - (k % 2) * 6, 10, 6, C.grey, k);
  blob(c, 150, 26, 10, 10, C.yellow, 2);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; cray(c, 150 + Math.round(Math.cos(a) * 13), 26 + Math.round(Math.sin(a) * 13), 150 + Math.round(Math.cos(a) * 18), 26 + Math.round(Math.sin(a) * 18), C.yellow, k); }
  blob(c, 34, 76, 10, 12, C.mustard, 3);
  blob(c, 40, 62, 6, 6, C.pink, 4);
  label(c, 'THE FUNNEL COLLAPSED', 4, C.burg);
  label(c, 'HOORAY');
  return c;
}

function rumpoldAfter() {
  const c = page(55);
  // the part after: yellow rain over a town, a river, a bay, fish holding their noses, beards gone green
  for (let k = 0; k < 16; k++) cray(c, 12 + k * 10, 14, 8 + k * 10, 36, C.bile, k);
  for (const [x, w] of [[24, 18], [52, 14], [76, 20]]) { c.rect(x, 64, w, 16, C.brown); cray(c, x - 2, 64, x + w / 2, 56, C.red, x); cray(c, x + w / 2, 56, x + w + 2, 64, C.red, x + 1); }
  blob(c, 130, 76, 34, 12, C.bile, 5);
  for (const [x, y] of [[118, 74], [142, 78]]) { blob(c, x, y, 5, 3, C.orange, x); cray(c, x - 6, y - 4, x - 2, y - 1, C.pink, y); }
  blob(c, 40, 92, 8, 4, C.green, 6); // a beard
  drawText(c, '53 TIMES WORSE (PROBABLY)', 88, 42, C.burg, { center: true, jitter: 1, seed: 53 });
  label(c, 'AFTERWARDS: THE SEA');
  return c;
}

// --- the captain's fantasy ----------------------------------------------------------------

/** The captain as he was meant to be: black beard (clean), the Crimson King's Crown held up, Squawks in full feather. */
function fantasyCaptain() {
  const c = new PixelCanvas(120, 150);
  // coat
  c.poly([[30, 70], [90, 70], [104, 150], [16, 150]], '#7a1826');
  c.poly([[50, 70], [70, 70], [66, 150], [54, 150]], '#f0e6c8');
  c.hline(16, 104, 149, '#4a0e18');
  // arms up, holding the crown
  c.thickLine(34, 76, 22, 36, 6, '#7a1826');
  c.thickLine(86, 76, 98, 36, 6, '#7a1826');
  c.ellipse(22, 32, 5, 5, '#c07e50');
  c.ellipse(98, 32, 5, 5, '#c07e50');
  // the crown
  c.poly([[26, 30], [26, 14], [40, 24], [60, 4], [80, 24], [94, 14], [94, 30]], GOLD.l);
  c.hline(26, 94, 28, GOLD.d);
  for (const [x, col] of [[40, RUBY], [60, RUBY], [80, EMERALD]]) c.ellipse(x, 26, 2.5, 2.5, col);
  // head, hat, a great black beard (clean: glossy, no green in it)
  c.ellipse(60, 54, 13, 13, '#c07e50');
  c.poly([[40, 46], [60, 34], [80, 46], [60, 44]], '#1a1a24');
  c.poly([[46, 56], [74, 56], [70, 84], [60, 92], [50, 84]], '#141018');
  for (const [x, y] of [[54, 64], [62, 70], [58, 78], [66, 62]]) c.set(x, y, '#4a4a6a'); // the shine on it
  c.set(55, 52, '#141018');
  c.set(65, 52, '#141018');
  // Squawks on his shoulder, every feather back
  c.ellipse(92, 72, 7, 9, '#c83a2a');
  c.ellipse(92, 64, 5, 5, '#d8443a');
  c.poly([[96, 64], [101, 66], [96, 68]], '#e8c830');
  c.poly([[86, 76], [80, 92], [90, 80]], '#2c58a8');
  c.poly([[96, 76], [102, 92], [94, 80]], '#e8c830');
  c.set(93, 62, '#0a0a10');
  c.outline(INK);
  return c;
}

function fantasyCoins(f) {
  const c = new PixelCanvas(320, 170);
  const r = rng(91 + f);
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(r() * 320);
    const y = Math.floor(r() * 170);
    if (r() < 0.75) {
      c.ellipse(x, y, 2, 2, GOLD.m);
      c.set(x - 1, y - 1, GOLD.h);
    } else {
      c.ellipse(x, y, 1.5, 1.5, r() < 0.5 ? RUBY : EMERALD);
      c.set(x, y - 1, '#ffffff');
    }
  }
  return c;
}

/** The Bling Bling King, beaten: crown and chain gone, a participation token round its neck instead. Sulking. */
function fantasyBbk() {
  const fish = megalodon({ crowned: false, water: true }).frames[0];
  const c = fish.clone();
  c.ellipse(36, 32, 3, 1.5, '#5a6a80'); // eye half shut (sulking)
  c.hline(32, 40, 31, '#1a1a24');
  c.ellipse(50, 56, 4, 4, GOLD.m); // the token
  c.set(49, 55, GOLD.h);
  c.line(44, 46, 50, 52, '#e868a8');
  c.line(56, 46, 50, 52, '#e868a8');
  return c;
}

function fantasyCrew() {
  const c = new PixelCanvas(320, 60);
  for (let i = 0; i < 9; i++) {
    const x = 18 + i * 36;
    const h = 30 + (i * 7) % 14;
    c.rect(x - 7, 60 - h + 10, 14, h - 10, ['#4a2a1a', '#2a2a40', '#7a1826', '#3a4a2a'][i % 4]);
    c.ellipse(x, 60 - h + 6, 6, 6, '#c89870');
    c.thickLine(x - 6, 60 - h + 14, x - 12, 60 - h + 2, 2, '#c89870'); // arms up
    c.thickLine(x + 6, 60 - h + 14, x + 12, 60 - h + 2, 2, '#c89870');
    c.ellipse(x - 13, 60 - h, 2.5, 2.5, GOLD.m); // a fistful of gold each
  }
  return c;
}

/** The fantasy breaking: white cracks across the whole picture, from one point. */
function fantasyCrack() {
  const c = new PixelCanvas(320, 224);
  const r = rng(13);
  for (let k = 0; k < 11; k++) {
    let x = 160;
    let y = 100;
    const a = (k / 11) * Math.PI * 2 + r() * 0.3;
    for (let s = 0; s < 14; s++) {
      const nx = x + Math.cos(a + (r() - 0.5) * 0.8) * (10 + r() * 10);
      const ny = y + Math.sin(a + (r() - 0.5) * 0.8) * (10 + r() * 10);
      c.thickLine(Math.round(x), Math.round(y), Math.round(nx), Math.round(ny), 1, '#ffffff');
      x = nx;
      y = ny;
    }
  }
  return c;
}

// --- the approach, the wrong way, the spout ------------------------------------------------

/** The Great Sharkstorm close enough to fill the sky: a wall of grey-green going round, gold in it. */
function stormWall(f) {
  const W = 300;
  const H = 224;
  const c = new PixelCanvas(W, H);
  const r = rng(71 + f * 13);
  for (let y = 0; y < H; y++) {
    const half = 70 + (1 - y / H) * 80;
    const cx = 170 + Math.sin(y * 0.02 + f * 0.5) * 6;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      if (x < 0 || x >= W) continue;
      const u = (x - cx) / half;
      if (Math.abs(u) > 0.9 && ((x * 7 + y * 3) % 5) / 5 > (1 - Math.abs(u)) * 10) continue;
      const band = Math.sin(y * 0.11 + u * 4 + f * 1.9 + Math.sin(y * 0.05) * 2);
      let col = mix(STORMC.d, STORMC.l, (u + 1) / 2);
      if (band > 0.45) col = mix(STORMC.l, STORMC.spray, (u + 1) / 2);
      if (band > 0.85) col = '#d8eaf0';
      if (Math.sin(y * 0.08 - u * 5 + f) > 0.96 && Math.sin(x * 0.21 + y * 0.05 + f) > 0.3) col = FUME.m;
      c.set(x, y, col);
    }
  }
  // what's going round in it: sharks, gold, a pillow, a crown
  for (let i = 0; i < 26; i++) {
    const y = Math.floor(r() * (H - 20)) + 6;
    const x = Math.floor(100 + r() * 150);
    const k = r();
    if (k < 0.35) c.poly([[x, y + 3], [x + 6, y - 1], [x + 9, y + 3]], SHARK.l);
    else if (k < 0.7) { c.ellipse(x, y, 1.5, 1.5, GOLD.m); c.set(x, y - 1, GOLD.h); }
    else if (k < 0.85) c.ellipse(x, y, 3, 1.5, '#e8e0f0');
    else c.ellipse(x, y, 1.5, 1.5, RUBY);
  }
  return c;
}

/** The jet off the bow, down into the sea: yellow-brown, thick, with comic swirls in it. */
function blastDown(f) {
  const c = new PixelCanvas(70, 120);
  for (let y = 0; y < 120; y++) {
    const w = 6 + y * 0.18 + Math.sin(y * 0.3 + f * 2) * 2;
    const cx = 20 + y * 0.25;
    for (let x = Math.floor(cx - w); x <= cx + w; x++) {
      const u = (x - cx) / w;
      const band = Math.sin(y * 0.4 - f * 2.4 + u * 2);
      c.set(x, y, band > 0.5 ? FUME.h : band > -0.2 ? FUME.l : FUME.m);
    }
  }
  for (let k = 0; k < 4; k++) {
    const y = 20 + k * 24 + f * 6;
    c.ellipseOutline(26 + y * 0.25, y, 5, 3, '#8a6a2a');
  }
  return c;
}

/** The sea going up where it hit: a dome and a column, brown and green and yellow, bubbles, a fish or two. */
function oceanErupt(f) {
  const c = new PixelCanvas(190, 150);
  const r = rng(201 + f);
  for (let y = 0; y < 150; y++) {
    const t = y / 149;
    const w = 18 + t ** 2.5 * 78 + Math.sin(y * 0.2 + f) * 4;
    for (let x = Math.floor(95 - w); x <= 95 + w; x++) {
      const u = Math.abs(x - 95) / w;
      if (u > 0.92 && r() < 0.5) continue;
      const k = Math.sin(y * 0.15 + x * 0.06 + f * 1.7);
      c.set(x, y, k > 0.5 ? SOUP.y : k > 0 ? SOUP.g : k > -0.5 ? SOUP.l : SOUP.m);
    }
  }
  // spray at the top
  for (let i = 0; i < 40; i++) c.set(Math.floor(70 + r() * 50), Math.floor(r() * 10), r() < 0.5 ? SOUP.y : '#e8e8c0');
  // huge bubbles
  for (const [x, y, rr] of [[60, 70, 8], [128, 96, 10], [96, 40, 6], [140, 50, 5], [50, 120, 7]]) {
    c.ellipseOutline(x + f * 2, y - f * 3, rr, rr, '#f0f0c0');
    c.set(x + f * 2 - Math.floor(rr / 2), y - f * 3 - Math.floor(rr / 2), '#ffffff');
  }
  // a fish, put out, being lifted
  for (const [x, y] of [[40, 90], [150, 76]]) {
    c.ellipse(x, y - f * 4, 6, 3, '#d8a040');
    c.poly([[x + 6, y - f * 4], [x + 10, y - 3 - f * 4], [x + 10, y + 3 - f * 4]], '#d8a040');
    c.set(x - 3, y - 1 - f * 4, '#0a0a10');
    c.hline(x - 5, x - 2, y + 1 - f * 4, '#7a4a20'); // frown
  }
  return c;
}

/** The stain spreading across the sea: a band to lay over the water. */
function seaStain() {
  const c = new PixelCanvas(320, 70);
  for (let y = 0; y < 70; y++) for (let x = 0; x < 320; x++) {
    const k = Math.sin(x * 0.05 + y * 0.2) + Math.sin(x * 0.013 - y * 0.1) * 0.8;
    c.set(x, y, k > 0.6 ? SOUP.y : k > -0.2 ? SOUP.g : SOUP.m);
  }
  return c;
}

/** The plume coming up off the water: yellow-brown, rolling. */
function plume(f) {
  const c = new PixelCanvas(150, 110);
  for (let k = 0; k < 12; k++) {
    const x = 75 + Math.sin(k * 1.7 + f) * 40;
    const y = 100 - k * 8;
    c.ellipse(x, y, 16 + (k % 3) * 4, 10, k % 2 ? FUME.l : '#8a6a2a');
    c.ellipse(x - 4, y - 3, 8, 4, FUME.h);
  }
  return c;
}

function speedLines(f) {
  const c = new PixelCanvas(320, 224);
  const r = rng(17 + f * 5);
  for (let i = 0; i < 40; i++) {
    const y = Math.floor(r() * 224);
    const x = Math.floor(r() * 320);
    const l = 20 + Math.floor(r() * 60);
    c.hline(x, Math.min(319, x + l), y, i % 3 ? '#ffffff80' : '#e8f0f0c0');
  }
  return c;
}

/** Inside the funnel: walls of cloud and water streaming round past the ship, everything in them. */
function spoutWall(f) {
  const c = new PixelCanvas(320, 224);
  const r = rng(401 + f * 3);
  for (let y = 0; y < 224; y++) for (let x = 0; x < 320; x++) {
    const u = (x - 160) / 160;
    const curve = y + u * u * 60;
    const band = Math.sin(curve * 0.12 + x * 0.025 - f * 1.4) + Math.sin(curve * 0.05 + f * 0.7) * 0.6;
    let col = band > 1 ? STORMC.spray : band > 0.3 ? STORMC.h : band > -0.4 ? STORMC.l : STORMC.m;
    if (Math.abs(u) < 0.45 && y > 70 && y < 170) col = mix(col, '#7a9a88', 0.25 * (1 - Math.abs(u) / 0.45)); // the brighter middle
    c.set(x, y, col);
  }
  // everything going round: sharks (fins and tails), gold, pillows, tokens, a crab shell
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(r() * 320);
    const y = Math.floor(r() * 224);
    const k = r();
    if (k < 0.3) { c.ellipse(x, y, 5, 2, SHARK.m); c.poly([[x + 4, y], [x + 8, y - 3], [x + 8, y + 3]], SHARK.d); }
    else if (k < 0.55) { c.ellipse(x, y, 1.5, 1.5, GOLD.m); c.set(x, y - 1, GOLD.h); }
    else if (k < 0.7) c.ellipse(x, y, 3, 2, '#e8e0f0');
    else if (k < 0.85) { c.ellipse(x, y, 2, 2, '#d8b440'); c.set(x, y, '#8a6a1c'); }
    else c.ellipse(x, y, 2, 1.5, '#d8743a');
  }
  return c;
}

/** One of the storm's tokens, enormous, floating past with a banner on it. */
function tokenSign(text1, text2) {
  const w = Math.max(textWidth(text1), textWidth(text2)) + 26;
  const c = new PixelCanvas(w, 44);
  c.ellipse(16, 22, 14, 14, '#d8b440');
  c.ellipse(16, 22, 10, 10, '#f4dc78');
  c.hline(10, 22, 24, '#8a6a1c');
  c.set(12, 19, '#8a6a1c');
  c.set(18, 19, '#8a6a1c');
  c.rect(26, 10, w - 28, 24, '#e868a8');
  c.hline(26, w - 3, 10, '#f8a8d0');
  c.hline(26, w - 3, 33, '#a83a70');
  drawText(c, text1, 26 + (w - 28) / 2, 12, '#ffffff', { center: true, shadow: '#a83a70' });
  drawText(c, text2, 26 + (w - 28) / 2, 22, '#ffffff', { center: true, shadow: '#a83a70' });
  c.outline(INK);
  return c;
}

// --- the galley (backdrops for watching) -----------------------------------------------------

function galleyBase(c, { night = false, tilt = 0 } = {}) {
  c.fill(night ? '#0c0a08' : '#14100c');
  for (let k = 0; k < 7; k++) {
    const x = 10 + k * 50;
    c.thickLine(x, 0, x + tilt * 8, 224, 6, '#24180e');
  }
  for (const by of [6, 30]) {
    c.rect(0, by, 320, 10, '#2a1c10');
    c.hline(0, 319, by + 9, '#140c06');
  }
  // the stove and the shelves, the bean pot
  c.rect(14, 120, 70, 60, '#2a2420');
  c.rect(20, 126, 58, 20, '#1a1410');
  c.ellipse(48, 118, 18, 8, '#3a3430');
  for (const sy of [70, 92]) c.rect(232, sy, 80, 4, '#3a2a18');
  for (let i = 0; i < 9; i++) {
    const x = 236 + i * 8;
    c.rect(x, 60 + (i % 2) * 22, 6, 9, i % 3 ? '#e0c020' : '#a8241c'); // cans: Crying Beans, Spicy Stench Sauce
  }
  // bean sacks along the bottom
  for (const [x, y] of [[100, 200], [150, 206], [210, 198], [262, 204]]) {
    c.ellipse(x, y, 24, 12, '#5a4a2c');
    c.ellipse(x - 4, y - 4, 14, 5, '#6a5a38');
  }
}

/** The galley at night: the kerosene lamp's pool of light, a hammock slung high above everything. */
function galleyNight() {
  const c = new PixelCanvas(320, 224);
  galleyBase(c, { night: true });
  for (let y = 0; y < 224; y++) for (let x = 0; x < 320; x++) {
    const d = Math.hypot((x - 120) / 120, (y - 90) / 100);
    if (d < 1) c.blend(x, y, '#ffb050', (1 - d) * 0.18);
  }
  // the hammock, high, sagging, an outline of somebody large in it
  for (let x = 80; x < 240; x++) {
    const sag = Math.round(Math.sin(((x - 80) / 160) * Math.PI) * 14);
    c.vline(x, 34 + sag, 40 + sag, '#3a2c1c');
  }
  c.ellipse(160, 50, 40, 8, '#521828');
  c.ellipse(130, 46, 7, 6, '#c8a030'); // the crown, still on
  return c;
}

/** The galley inside the storm: tilted, pots swinging on their hooks, a porthole full of whirling cloud. */
function galleyBunker(f) {
  const c = new PixelCanvas(320, 224);
  galleyBase(c, { tilt: f ? 1 : -1 });
  c.ellipse(280, 140, 22, 22, '#5a4a2c');
  c.ellipse(280, 140, 18, 18, STORMC.l);
  for (let a = 0; a < 12; a += 0.4) c.set(Math.round(280 + Math.cos(a + f) * a * 1.3), Math.round(140 + Math.sin(a + f) * a * 1.3), STORMC.spray);
  for (const [x, d] of [[120, f ? 6 : -6], [150, f ? -4 : 4], [180, f ? 5 : -5]]) {
    c.line(x, 40, x + d, 60, '#6a6a78');
    c.ellipse(x + d, 64, 7, 5, '#4a4a58');
  }
  return c;
}

// --- the captain's glory days (sepia) ---------------------------------------------------------

function gloryDays() {
  const c = new PixelCanvas(220, 140);
  const S = ['#2a1e12', '#5a442a', '#8a6e48', '#b89a6c', '#e0caa0'];
  c.fill(S[3]);
  for (let y = 70; y < 140; y++) c.hline(0, 219, y, (y % 6 < 3) ? S[2] : S[3]); // the sea
  // a port with its flags coming down, white flags going up
  for (const [x, w, h] of [[140, 20, 30], [164, 16, 40], [184, 22, 26]]) {
    c.rect(x, 70 - h, w, h, S[1]);
    c.vline(x + w / 2, 70 - h - 14, 70 - h, S[0]);
    c.rect(x + w / 2 + 1, 70 - h - 14, 8, 5, S[4]);
  }
  // his ship, bow on, and him at the prow: tricorn, a great black beard, a sword up
  c.poly([[20, 100], [110, 100], [100, 124], [30, 124]], S[0]);
  for (const mx of [44, 70, 92]) c.vline(mx, 30, 100, S[0]);
  for (const [mx, w] of [[44, 18], [70, 22], [92, 16]]) c.poly([[mx - w / 2, 40], [mx + w / 2, 40], [mx + w / 2 + 3, 80], [mx - w / 2 + 2, 80]], S[4]);
  c.rect(100, 76, 10, 22, S[0]);
  c.ellipse(105, 72, 5, 5, S[2]);
  c.poly([[98, 70], [105, 64], [112, 70]], S[0]);
  c.poly([[100, 74], [110, 74], [106, 88], [104, 88]], S[0]); // the beard
  c.line(110, 80, 122, 58, S[4]); // the sword
  // edges burnt and creased
  c.strokeRect(0, 0, 220, 140, S[1]);
  for (let i = 0; i < 220; i += 7) { c.set(i, 1, S[0]); c.set(i + 3, 138, S[0]); }
  c.hline(0, 219, 52, S[2]);
  return c;
}

// --- television (green CRT) --------------------------------------------------------------------

function hammock(c, x0, x1, y, sag, col) {
  for (let x = x0; x <= x1; x++) c.set(x, y + Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * sag), col);
}

/** Franklin in a hammock slung over his desk: "I sleep here so I can work here." */
function ftmHammock(f) {
  const c = screen(CRT[1]);
  desk(c, 60, { papers: 2 });
  hammock(c, 14, 90, 22, 12, CRT[6]);
  hammock(c, 14, 90, 23, 12, CRT[4]);
  franklin(c, 52, 14 + f, { s: 0.6, mouth: 'shut' });
  drawText(c, 'BUSINESS?', SW / 2, 4, CRT[7], { center: true });
  return crt(c, f);
}

/** Twelve pillows on the desk. For posture. */
function ftmPillows(f) {
  const c = screen(CRT[1]);
  desk(c, 60, { papers: 0 });
  for (let i = 0; i < 12; i++) c.ellipse(16 + (i % 6) * 14, 54 - Math.floor(i / 6) * 8, 7, 4, i % 2 ? CRT[6] : CRT[5]);
  franklin(c, 86, 22, { s: 0.6, mouth: f ? 'open' : 'shut', sweat: true });
  drawText(c, 'POSTURE', 40, 6, CRT[7], { center: true });
  return crt(c, f);
}

/** Franklin's sleep, itemised: a receipt that keeps going. DISALLOWED. */
function ftmSleepReceipt(f) {
  const c = screen(CRT[0]);
  c.rect(30, 4, 44, 70, CRT[6]);
  for (let y = 10; y < 70; y += 6) c.hline(34, 66, y, CRT[3]);
  drawText(c, 'SLEEP', 52, 6, CRT[1], { center: true });
  if (f) {
    drawText(c, 'DISALLOWED', SW / 2, 34, '#d84a4a', { center: true, shadow: CRT[0] });
  }
  return crt(c, f);
}

/** SPECIAL BROADCAST card. */
function ftmBulletin(f) {
  const c = screen(CRT[0]);
  c.rect(8, 22, SW - 16, 34, CRT[2]);
  c.strokeRect(8, 22, SW - 16, 34, CRT[6]);
  drawText(c, 'SPECIAL', SW / 2, 28, CRT[7], { center: true });
  drawText(c, 'BROADCAST', SW / 2, 40, CRT[7], { center: true });
  if (f) for (let x = 10; x < SW - 10; x += 8) c.set(x, 60, CRT[6]);
  return crt(c, f);
}

/** Franklin with a chart behind him: a whirlwind, with treasure in it. */
function ftmStormChart(f) {
  const c = screen(CRT[1]);
  c.rect(52, 6, 46, 40, CRT[2]);
  c.strokeRect(52, 6, 46, 40, CRT[6]);
  for (let a = 0; a < 14; a += 0.2) c.set(Math.round(75 + Math.cos(a + f) * a * 1.3), Math.round(26 + Math.sin(a + f) * a), CRT[5]);
  for (const [x, y] of [[66, 18], [84, 30], [78, 14]]) c.set(x, y, CRT[7]);
  desk(c, 60, { papers: 2 });
  franklin(c, 26, 26, { s: 0.7, mouth: f ? 'open' : 'shut' });
  return crt(c, f);
}

/** The exhibits: chests, crowns, diamonds, emeralds, and one crown above the rest. */
function ftmExhibit(f) {
  const c = screen(CRT[1]);
  drawText(c, 'EXHIBIT A', SW / 2, 4, CRT[7], { center: true });
  for (const [x, y] of [[12, 52], [70, 54]]) {
    c.rect(x, y, 22, 14, CRT[3]);
    c.rect(x, y - 4, 22, 5, CRT[4]);
    for (let k = 0; k < 5; k++) c.set(x + 3 + k * 4, y - 6, CRT[7]);
  }
  // the crown in the middle (the Crimson King's)
  c.poly([[38, 46], [38, 30], [46, 38], [52, 24], [58, 38], [66, 30], [66, 46]], CRT[6]);
  c.hline(38, 66, 44, CRT[3]);
  for (const x of [44, 52, 60]) c.ellipse(x, 41, 1.5, 1.5, f ? CRT[7] : CRT[5]);
  for (const [x, y] of [[20, 20], [84, 24], [30, 34], [80, 40]]) c.set(x, y, CRT[7]);
  return crt(c, f);
}

/** A shark in a tie holding up a sign: FOUND PROPERTY. */
function ftmFound(f) {
  const c = screen(CRT[1]);
  c.ellipse(36, 44, 16, 22, CRT[4]);
  c.ellipse(38, 48, 10, 14, CRT[6]);
  c.poly([[28, 22], [36, 10], [42, 22]], CRT[3]);
  c.set(30, 32, CRT[0]);
  c.hline(26, 34, 38, CRT[0]);
  c.poly([[36, 42], [40, 42], [38, 54]], CRT[2]); // the tie
  c.rect(52, 18 + f, 51, 26, CRT[7]);
  drawText(c, 'FOUND', 78, 22 + f, CRT[1], { center: true });
  drawText(c, 'PROPERTY', 78, 32 + f, CRT[1], { center: true });
  c.line(48, 40, 52, 34 + f, CRT[4]);
  return crt(c, f);
}

/** The storm's answer, held up to the camera: a participation token. */
function ftmToken(f) {
  const c = screen(CRT[0]);
  c.ellipse(SW / 2, 36, 22, 22, CRT[5]);
  c.ellipse(SW / 2, 36, 17, 17, CRT[6]);
  c.hline(SW / 2 - 8, SW / 2 + 6, 40, CRT[2]);
  for (const dx of [-6, 0, 6]) c.vline(SW / 2 + dx, 26, 30, CRT[2]);
  drawText(c, 'JOURNEY!', SW / 2, 64, CRT[7], { center: true });
  if (f) c.set(SW / 2 - 12, 22, CRT[7]);
  return crt(c, f);
}

/** The Bling Bling King in the interview chair: crown, chain, pendant, very at ease. `shades` for the advertisement. */
function bbkTv(f, { shades = false, book = false } = {}) {
  const c = screen(CRT[1]);
  // an armchair
  c.rect(14, 40, 76, 38, CRT[2]);
  c.rect(10, 34, 10, 44, CRT[3]);
  c.rect(84, 34, 10, 44, CRT[3]);
  // the megalodon, head and shoulders, turned three-quarters to camera: a long snout, a grin, a fin behind
  c.poly([[70, 34], [82, 12], [88, 36]], CRT[3]); // dorsal fin
  c.ellipse(58, 50, 30, 20, CRT[4]);
  c.poly([[14, 48], [34, 34], [50, 42], [44, 60], [24, 58]], CRT[4]); // the snout
  c.ellipse(58, 60, 22, 9, CRT[6]); // pale belly
  c.poly([[18, 50], [58, 52], [54, 60], [28, 58]], CRT[0]); // the grin
  for (let x = 22; x < 56; x += 4) c.poly([[x, 51], [x + 2, 54], [x + 4, 51]], CRT[7]);
  for (const gx of [66, 70, 74]) c.vline(gx, 46, 56 + f, CRT[2]); // gills
  if (shades) {
    c.rect(34, 38, 22, 6, CRT[0]);
    c.hline(30, 34, 40, CRT[0]);
    c.set(37, 39, CRT[7]);
    c.set(38, 39, CRT[7]);
  } else {
    c.ellipse(42, 41, 3, 2, CRT[0]);
    c.set(43, 40, CRT[7]);
    c.hline(38, 46, 37, CRT[2]); // one brow, unbothered
  }
  // the crown, a little far back, and the chain and pendant
  c.poly([[46, 32], [46, 22], [52, 28], [58, 16], [64, 28], [70, 22], [70, 32]], CRT[6]);
  c.hline(46, 70, 31, CRT[3]);
  c.set(58, 26, CRT[7]);
  for (let x = 34; x < 80; x += 2) c.set(x, 64 + Math.round(Math.sin(((x - 34) / 46) * Math.PI) * 5), CRT[7]);
  c.rect(50, 67, 14, 10, CRT[7]);
  c.set(56, 70, CRT[3]);
  c.set(57, 70, CRT[3]);
  if (book) {
    c.rect(70, 50, 22, 16, CRT[5]);
    c.vline(81, 50, 65, CRT[2]);
    for (let y = 53; y < 64; y += 3) { c.hline(72, 79, y, CRT[3]); c.hline(83, 90, y, CRT[3]); }
  }
  return crt(c, f);
}

/** The doctrine on screen as if it were law: a page of crayon in a gilt frame. CHAPTER 47. */
function bbkDoctrine(f) {
  const c = screen(CRT[0]);
  c.rect(10, 6, SW - 20, 66, CRT[6]);
  c.strokeRect(10, 6, SW - 20, 66, CRT[3]);
  drawText(c, 'CHAPTER 47', SW / 2, 10, CRT[1], { center: true });
  drawText(c, 'FART IT,', SW / 2, 26, CRT[1], { center: true });
  drawText(c, 'LOSE IT', SW / 2, 36, CRT[1], { center: true });
  for (let y = 50; y < 66; y += 4) c.hline(18, SW - 20, y, CRT[4]);
  if (f) c.ellipseOutline(SW / 2, 31, 34, 12, CRT[2]);
  return crt(c, f);
}

/** Franklin at an adding machine, the tape going over the desk and off the screen. */
function ftmTaxCalc(f) {
  const c = screen(CRT[1]);
  desk(c, 56, { papers: 0 });
  c.rect(60, 44, 24, 12, CRT[3]);
  for (let k = 0; k < 3; k++) c.hline(63, 80, 47 + k * 3, CRT[6]);
  for (let y = 0; y < 44 + f * 4; y++) c.hline(68, 74, y, (y % 6) ? CRT[7] : CRT[5]); // the tape, up and over
  franklin(c, 30, 26, { s: 0.65, mouth: 'open', sweat: true });
  return crt(c, f);
}

/** A crown dropped on Franklin's desk, and the stamp coming down: PAID. */
function ftmPaid(f) {
  const c = screen(CRT[1]);
  desk(c, 56, { papers: 1 });
  c.poly([[20, 54], [20, 44], [26, 50], [32, 40], [38, 50], [44, 44], [44, 54]], CRT[6]); // the crown
  c.hline(20, 44, 53, CRT[3]);
  franklin(c, 76, 24, { s: 0.6, mouth: 'shut' });
  if (f) {
    c.rect(18, 20, 66, 22, '#d84a4a');
    c.strokeRect(18, 20, 66, 22, '#ff9a9a');
    drawText(c, 'PAID', 51, 24, '#ffffff', { center: true, scale: 2 });
  }
  return crt(c, f);
}

/** The commercial's montage: crowns, a diamond chain, a lobster, a pillow, cycling. */
function bbkMontage(f) {
  const c = screen(CRT[1]);
  if (f === 0) {
    c.poly([[20, 56], [20, 36], [32, 46], [44, 26], [56, 46], [68, 36], [68, 56]], CRT[6]);
    for (let x = 74; x < 100; x += 3) c.set(x, 40 + Math.round(Math.sin(x * 0.4) * 6), CRT[7]);
    drawText(c, 'CROWNS!', SW / 2, 64, CRT[7], { center: true });
  } else {
    c.ellipse(32, 40, 16, 8, CRT[5]); // a lobster
    c.line(16, 36, 10, 28, CRT[5]);
    c.line(48, 36, 54, 28, CRT[5]);
    c.ellipse(78, 40, 16, 10, CRT[7]); // a pillow
    c.set(64, 31, CRT[6]);
    c.set(92, 49, CRT[6]);
    drawText(c, 'LUXURY!', SW / 2, 64, CRT[7], { center: true });
  }
  return crt(c, f);
}

/** BLING BLING KING TREASURE SOLUTIONS: the logo (a crowned shark's head in a ring of diamonds). */
function bbkLogo(f) {
  const c = screen(CRT[0]);
  const cx = SW / 2;
  c.ellipseOutline(cx, 18, 14, 14, CRT[7]);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + f * 0.16;
    c.set(Math.round(cx + Math.cos(a) * 14), Math.round(18 + Math.sin(a) * 14), CRT[7]);
  }
  c.poly([[cx - 8, 21], [cx + 8, 19], [cx + 3, 26], [cx - 6, 26]], CRT[5]);
  for (const dx of [-5, -1, 3]) c.vline(cx + dx, 10, 14, CRT[6]);
  c.hline(cx - 5, cx + 3, 14, CRT[6]);
  drawText(c, 'BLING BLING KING', cx, 37, CRT[7], { center: true });
  drawText(c, 'TREASURE', cx, 52, CRT[6], { center: true });
  drawText(c, 'SOLUTIONS', cx, 62, CRT[6], { center: true });
  return crt(c, f);
}

/** Static with Franklin in it, barely: what the set gets inside the storm before the sauce can. */
function ftmGhost(f) {
  const c = screen(CRT[0]);
  const r = rng(77 + f * 19);
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (r() < 0.45) c.set(x, y, CRT[1 + Math.floor(r() * 6)]);
  franklin(c, SW / 2, 20, { s: 0.8, mouth: 'shut' });
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (r() < 0.3) c.set(x, y, CRT[Math.floor(r() * 5)]);
  return crt(c, f);
}

// --- S.E.S. Mark II's aerial ----------------------------------------------------------------

const IRON = { d: '#3a3a46', m: '#6a6a78', l: '#a8a8b8' };

/** Mark II with the horseshoe knocked flat in the spin and the wires hanging off it. */
function mk2Bent() {
  const c = mk2(2, { lit: true });
  for (let y = 0; y < 13; y++) for (let x = 92; x < 116; x++) c.set(x, y, 'transparent');
  // the horseshoe on its side, off its reel
  for (let a = -0.6; a <= Math.PI - 0.6; a += 0.08) {
    const x = Math.round(118 + Math.cos(a) * 6);
    const y = Math.round(8 + Math.sin(a) * 4);
    c.rect(x - 1, y - 1, 3, 2, IRON.m);
  }
  c.rect(100, 11, 8, 3, '#c8b088');
  // copper wire hanging off loose
  for (let k = 0; k < 14; k++) c.set(104 + Math.round(Math.sin(k * 0.6) * 3), 12 + k, '#c87a3a');
  c.outline(INK);
  return c;
}

/** Mark II with a can of Spicy Stench Sauce jammed on the horseshoe. It works. */
function mk2Sauce() {
  const c = mk2(2, { lit: true });
  const x = 98;
  const y = -1;
  c.rect(x, y + 2, 12, 12, '#b8241c');
  c.rect(x, y + 6, 12, 3, '#f0d020');
  c.set(x + 3, y + 7, '#1e1a22');
  c.set(x + 8, y + 7, '#1e1a22');
  c.hline(x, x + 11, y + 2, '#c8ccd4');
  c.hline(x + 1, x + 10, y + 1, '#c8ccd4'); // the lid, bulging
  c.vline(x + 1, y + 3, y + 12, '#d8443a');
  c.outline(INK);
  return c;
}

const SINGLE = {
  megalodon_bling_0: () => megalodonBling(0),
  megalodon_bling_1: () => megalodonBling(1),
  bling_pendant: pendantClose,
  ruby_necklace: rubyNecklace,
  leg_brogath_shy: brogathShy,
  leg_brogath_treasure: brogathTreasure,
  leg_brogath_blast: brogathBlast,
  leg_brogath_blingus: brogathBlingus,
  leg_brogath_lesson: brogathLesson,
  leg_rumpold_faces: rumpoldFaces,
  leg_rumpold_eye: rumpoldEye,
  leg_rumpold_wind: rumpoldWind,
  leg_rumpold_collapse: rumpoldCollapse,
  leg_rumpold_after: rumpoldAfter,
  fantasy_captain: fantasyCaptain,
  fantasy_bbk: fantasyBbk,
  fantasy_crew: fantasyCrew,
  fantasy_crack: fantasyCrack,
  sea_stain: seaStain,
  token_sign_welcome: () => tokenSign('WELCOME TO THE', 'BLING BLING EXPRESS!'),
  token_sign_congrats: () => tokenSign('CONGRATULATIONS!', 'YOU ENTERED THE STORM!'),
  galley_night: galleyNight,
  glory_days: gloryDays,
  mk2_bezel_bent: mk2Bent,
  mk2_bezel_sauce: mk2Sauce,
};

const PAIRS = {
  barge_seafood: (f) => barge(f, 'seafood'),
  barge_bedding: (f) => barge(f, 'bedding'),
  shark_diner: sharkDiner,
  pillows_tumble: pillowsTumble,
  storm_nest: stormNest,
  fantasy_coins: fantasyCoins,
  storm_wall: stormWall,
  ocean_erupt: oceanErupt,
  wrong_plume: plume,
  speed_lines: speedLines,
  galley_bunker: galleyBunker,
  ftm_hammock: ftmHammock,
  ftm_pillows: ftmPillows,
  ftm_sleep_receipt: ftmSleepReceipt,
  ftm_bulletin: ftmBulletin,
  ftm_stormchart: ftmStormChart,
  ftm_exhibit: ftmExhibit,
  ftm_found: ftmFound,
  ftm_token: ftmToken,
  bbk_tv: (f) => bbkTv(f),
  bbk_tv_book: (f) => bbkTv(f, { book: true }),
  bbk_ad: (f) => bbkTv(f, { shades: true }),
  bbk_doctrine: bbkDoctrine,
  ftm_taxcalc: ftmTaxCalc,
  ftm_paid: ftmPaid,
  bbk_montage: bbkMontage,
  bbk_logo: bbkLogo,
  ftm_ghost: ftmGhost,
};

const TRIPLES = { blast_down: blastDown, spout_wall: spoutWall };

export function addPhase10VistaFrames(atlas) {
  for (const [id, fn] of Object.entries(SINGLE)) atlas.add(id, fn());
  for (const [id, fn] of Object.entries(PAIRS)) for (const f of [0, 1]) atlas.add(`${id}_${f}`, fn(f));
  for (const [id, fn] of Object.entries(TRIPLES)) for (const f of [0, 1, 2]) atlas.add(`${id}_${f}`, fn(f));
}

export const PHASE10_VISTA_FRAMES = [
  ...Object.keys(SINGLE),
  ...Object.keys(PAIRS).flatMap((n) => [`${n}_0`, `${n}_1`]),
  ...Object.keys(TRIPLES).flatMap((n) => [`${n}_0`, `${n}_1`, `${n}_2`]),
];

/** Small versions of the new episodes, for the set in the galley (props). */
export const PHASE10_SCREEN_PAINTERS = {
  ftm5: (f) => [ftmHammock, ftmPillows][f % 2](f % 2),
  bbk: (f) => bbkTv(f % 2),
};
