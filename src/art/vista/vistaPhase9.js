import { PixelCanvas } from '../PixelCanvas.js';
import { PAL, mix } from '../palette.js';
import { drawText, textWidth } from '../font/drawText.js';
import { rng } from './sesArt.js';
import { CRT, crt, screen, franklin, desk, stormColumn } from './vistaPhase6.js';
import { auditor } from './vistaPhase8.js';
import { C, page, cray, blob, label, figure } from './vistaLegend.js';
import { paintProp } from '../props/index.js';

/**
 * Vista art for Story Phase 9 (the Completely Authentic History; Crownskull
 * Isle; the Grand Excavation; the Grand Treasure Catastrophe):
 *
 *   - Garrick's "Completely Authentic" history, in his crayon: Princess
 *     Stenchalina the First and the ribbon that fluttered, the first Sash
 *     Bearers, the Five Grand Treasures (all of them things on this ship),
 *     the Grand Stenchmasters of old (made up this morning), and Admiral
 *     Rumpus Thunderpants at the Battle of the Seven Winds.
 *   - The Frog Tax Man: Franklin's records eaten by a shark; then a shark
 *     storm, on the television, the very morning there's one outside. The
 *     Auditor is unmoved.
 *   - Crownskull Isle from the hull's broken planks: pale beach, reefs,
 *     jungle, cliffs and the great crowned skull of the ridge, and the storm
 *     behind; then from close in on the lee side (the empty decoy boat).
 *   - The excavation: the clearing from the ruins, Garrick bent over his
 *     hole taking aim, the plume (dirt, clay, stone, a palm tree, yellow),
 *     the odour wave; the storm come inland; the megalodon's shadow, then
 *     the megalodon; the Crimson Fortune exposed, then going up in the
 *     plume into the storm, the Crimson King's Crown last.
 *   - The rage shanty: a stage in the captain's furious imagination (red
 *     curtains, a spotlight, a vignette), sharks on their tails in the
 *     captain's treasure, a hammerhead soloist, a shark with an accordion,
 *     and the crowned megalodon at the back. They are not really singing.
 */
const INK = PAL.ink;
const SW = 104;
const SH = 78;
const SHARK = { d: '#3a4658', m: '#5a6a80', l: '#8a9ab0', belly: '#d8dce4' };
const GOLD = { d: '#9a6a10', m: '#e0b030', l: '#f8e070', h: '#fff8c0' };
const FUME = { d: '#7a7020', m: '#b8b030', l: '#d8d060', h: '#f0ec98' };
const JUNGLE = { d: '#163a20', m: '#22552a', l: '#2f7234', h: '#4a9440' };
const STONE = { d: '#4e4a42', m: '#6e6a5e', l: '#8e897a', h: '#b2ad9a' };
const SAND = { m: '#e2d3a2', l: '#f2e8c4' };
const GARRICK = { suit: '#521828', suitL: '#74283a', sash: '#c8982a', cape: '#2e0c18', skin: '#e8b088', crown: '#c8a030' };

// --- Garrick's history, in crayon ----------------------------------------------------

function stenchalina() {
  const c = page(21);
  // the royal nursery: a crib with a crown on it, a baby, a yellow cloud, little trousers flying
  cray(c, 40, 86, 120, 86, C.brown, 1);
  for (let x = 44; x < 120; x += 8) cray(c, x, 86, x, 64, C.brown, x);
  cray(c, 40, 64, 120, 64, C.brown, 2);
  for (const px of [72, 80, 88]) cray(c, px, 56, px, 50, C.yellow, px);
  cray(c, 70, 56, 90, 56, C.yellow, 3);
  blob(c, 80, 70, 7, 6, C.pink, 4);
  blob(c, 80, 78, 9, 5, '#f0f0f0', 5); // the royal nappy
  for (let k = 0; k < 6; k++) cray(c, 96 + k * 8, 74 - k * 3, 100 + k * 8, 60 - k * 4, C.bile, k);
  blob(c, 146, 34, 8, 5, C.blue, 6); // the little royal trousers, airborne
  cray(c, 140, 38, 136, 44, C.blue, 7);
  cray(c, 152, 38, 156, 44, C.blue, 8);
  label(c, 'PRINCESS STENCHALINA', 4, C.burg);
  label(c, 'THE FIRST');
  return c;
}

function ribbon() {
  const c = page(22);
  // the ceremonial ribbon, fluttering: the disaster
  for (let i = 0; i < 60; i++) {
    const x = 30 + i * 2;
    const y = 56 + Math.round(Math.sin(i * 0.35) * 12);
    blob(c, x, y, 2, 3, C.red, i);
  }
  for (let k = 0; k < 5; k++) cray(c, 20, 40 + k * 10, 34, 44 + k * 10, C.bile, k); // the wind that did it
  label(c, 'THE RIBBON FLUTTERED', 4, C.burg);
  label(c, '(A DISASTER)');
  return c;
}

function sashBearers() {
  const c = page(23);
  figure(c, 88, 30, { body: C.burg, hat: 'crown', big: true });
  // the sash held flat, an attendant at each end
  cray(c, 60, 54, 116, 54, C.mustard, 1);
  cray(c, 60, 56, 116, 56, C.mustard, 2);
  figure(c, 44, 42, { body: C.green, arms: 'up' });
  figure(c, 132, 42, { body: C.green, arms: 'up' });
  for (let k = 0; k < 4; k++) cray(c, 84 + k * 4, 80, 80 + k * 6, 94, C.bile, k);
  label(c, 'THE SACRED SASH BEARERS', 4, C.burg);
  label(c, 'NO FLUTTERING');
  return c;
}

function fiveTreasures() {
  const c = page(24);
  // I the crown (a saucepan), II the seat (a chair), III the bowl (Jim's), IV the entertainment system (a television), V the sash
  for (const px of [12, 18, 24]) cray(c, px, 34, px, 26, C.yellow, px);
  cray(c, 10, 34, 26, 34, C.yellow, 1);
  blob(c, 18, 40, 6, 4, C.grey, 2);
  cray(c, 46, 30, 46, 50, C.brown, 3);
  cray(c, 46, 42, 62, 42, C.brown, 4);
  cray(c, 62, 42, 62, 52, C.brown, 5);
  blob(c, 90, 44, 12, 6, C.grey, 6);
  c.rect(114, 28, 22, 18, C.black);
  c.rect(117, 31, 16, 12, C.green);
  cray(c, 118, 28, 112, 20, C.black, 7);
  cray(c, 132, 28, 138, 20, C.black, 8);
  cray(c, 146, 28, 168, 52, C.mustard, 9);
  cray(c, 148, 28, 170, 52, C.mustard, 10);
  drawText(c, 'I', 18, 54, C.brown, { center: true });
  drawText(c, 'II', 54, 58, C.brown, { center: true });
  drawText(c, 'III', 90, 54, C.brown, { center: true });
  drawText(c, 'IV', 125, 54, C.brown, { center: true });
  drawText(c, 'V', 158, 58, C.brown, { center: true });
  label(c, 'THE FIVE GRAND TREASURES', 4, C.burg);
  label(c, 'OF STENCHMASTER HISTORY');
  return c;
}

function stenchmasters() {
  const c = page(25);
  // four portraits in frames, all of them him with a different moustache; names beside them, outward
  const people = [['SIR', 'STENCHALOT'], ['LADY', 'WINDBOTTOM'], ['ADMIRAL', 'THUNDERPANTS'], ['DUKE', 'GASSIUS']];
  people.forEach(([a, b], i) => {
    const right = i % 2 === 1;
    const y0 = 20 + Math.floor(i / 2) * 40;
    const x = right ? 164 : 12;
    cray(c, x - 9, y0, x + 9, y0, C.brown, i);
    cray(c, x - 9, y0 + 34, x + 9, y0 + 34, C.brown, i + 1);
    cray(c, x - 9, y0, x - 9, y0 + 34, C.brown, i + 2);
    cray(c, x + 9, y0, x + 9, y0 + 34, C.brown, i + 3);
    blob(c, x, y0 + 11, 5, 6, C.pink, i + 9);
    for (const dx of [-6, 6]) blob(c, x + dx, y0 + 13, 1, 3, C.red, i + 12);
    cray(c, x - 4, y0 + 15, x + 4, y0 + 15, [C.black, C.orange, C.black, C.brown][i], i);
    if (i === 1) for (const dx of [-4, 0, 4]) cray(c, x + dx, y0 + 5, x + dx, y0 + 2, C.yellow, dx);
    if (i === 2) cray(c, x - 6, y0 + 5, x + 6, y0 + 3, C.blue, 4);
    blob(c, x, y0 + 27, 6, 5, [C.burg, C.purple, C.blue, C.green][i], i + 20);
    const tx = right ? x - 13 - textWidth(b) : x + 13;
    const ax = right ? x - 13 - textWidth(a) : x + 13;
    drawText(c, a, ax, y0 + 8, C.brown, { jitter: 1, seed: i });
    drawText(c, b, tx, y0 + 19, C.burg, { jitter: 1, seed: i + 4 });
  });
  label(c, 'THE GRAND STENCHMASTERS OF OLD', 4, C.burg);
  return c;
}

function sevenWinds() {
  const c = page(26);
  // six ships blown round, the seventh sinking, blushing
  for (let i = 0; i < 6; i++) {
    const x = 18 + (i % 3) * 30 + (i > 2 ? 14 : 0);
    const y = 34 + (i > 2 ? 26 : 0);
    cray(c, x - 8, y, x + 8, y, C.brown, i);
    cray(c, x, y, x, y - 12, C.brown, i + 1);
    blob(c, x - (i % 2 ? 3 : -3), y - 7, 4, 4, '#f0f0f0', i);
    cray(c, x + 10, y - 4, x + 16, y - 10, C.grey, i);
  }
  // the seventh, going down, pink in the face
  cray(c, 138, 70, 158, 62, C.brown, 9);
  cray(c, 148, 66, 152, 52, C.brown, 10);
  blob(c, 150, 60, 3, 2, C.pink, 11);
  for (let x = 120; x < 174; x += 6) cray(c, x, 76, x + 3, 74, C.blue, x);
  // the admiral's wind, from the left
  for (let k = 0; k < 5; k++) cray(c, 2, 30 + k * 10, 12, 34 + k * 10, C.bile, k);
  label(c, 'THE BATTLE OF THE SEVEN WINDS', 4, C.burg);
  label(c, 'NO. 7: SANK FROM EMBARRASSMENT');
  return c;
}

// --- The Frog Tax Man, this week ---------------------------------------------------------

/** Franklin at his desk, his records going off in a shark's mouth. */
function ftmEaten(f) {
  const c = screen(CRT[1]);
  desk(c, 56, { papers: 1 });
  franklin(c, 30, 30, { s: 0.7, mouth: 'open', sweat: true });
  // the fin going off with the papers in its teeth
  const fx = 70 + f * 4;
  c.poly([[fx, 54], [fx + 8, 40], [fx + 14, 54]], CRT[5]);
  c.rect(fx - 6, 50, 10, 6, CRT[7]);
  c.hline(fx - 5, fx + 2, 52, CRT[3]);
  for (let x = 54; x < SW; x += 6) c.set(x + f, 58, CRT[4]);
  drawText(c, 'RECORDS?', SW / 2, 6, CRT[7], { center: true });
  return crt(c, f);
}

/** On the television, a shark storm. The Auditor: not a valid excuse. */
function ftmStorm(f) {
  const c = screen(CRT[0]);
  for (let k = 0; k < 50; k++) {
    const a = k * 0.5 + f;
    c.set(Math.round(30 + Math.cos(a) * (k * 0.45)), Math.round(38 + Math.sin(a) * (k * 0.5)), CRT[5]);
  }
  for (const [x, y] of [[22, 24], [40, 50], [16, 46]]) c.poly([[x, y + 3], [x + 3, y], [x + 6, y + 3]], CRT[6]);
  auditor(c, 76, 22, { glass: false, mouth: f ? 'open' : 'shut' });
  drawText(c, 'NOT VALID', 76, 64, CRT[7], { center: true });
  return crt(c, f + 1);
}

// --- Crownskull Isle ------------------------------------------------------------------

/** The island from a mile off: reefs, pale beach, jungle, cliffs, and the crowned skull of the ridge. */
function crownskullFar() {
  const w = 300;
  const h = 100;
  const c = new PixelCanvas(w, h);
  const r = rng(9);
  // the ridge and its skull (behind): a dome of rock with two dark sockets, a nose and a jaw of teeth, crowned in spires
  c.ellipse(200, 44, 44, 26, STONE.d);
  c.ellipse(200, 38, 30, 24, STONE.m);
  c.ellipse(196, 34, 22, 16, STONE.l);
  for (const [x, ht] of [[180, 14], [190, 20], [200, 24], [210, 20], [220, 14]]) {
    c.poly([[x - 5, 22], [x, 22 - ht], [x + 5, 22]], STONE.l);
    c.line(x, 22 - ht, x + 4, 21, STONE.m);
  }
  c.ellipse(189, 38, 6, 6, '#24221e');
  c.ellipse(211, 38, 6, 6, '#24221e');
  c.poly([[197, 50], [200, 44], [203, 50]], '#24221e');
  c.rect(186, 54, 29, 6, STONE.l);
  for (let x = 189; x < 214; x += 4) c.vline(x, 54, 59, STONE.d);
  c.hline(186, 214, 57, STONE.d);
  // cliffs on the right, jungle across the middle
  c.poly([[230, 92], [244, 50], [270, 46], [292, 92]], STONE.m);
  for (let x = 236; x < 290; x += 5) c.vline(x, 56, 90, STONE.d);
  for (let i = 0; i < 70; i++) {
    const x = 20 + r() * 230;
    const y = 64 + r() * 20 - Math.max(0, (x - 220) / 8);
    c.ellipse(x, y, 8 + r() * 6, 6 + r() * 3, r() < 0.5 ? JUNGLE.m : JUNGLE.l);
    if (r() < 0.3) c.set(Math.round(x - 2), Math.round(y - 3), JUNGLE.h);
  }
  // palms poking up along the beach
  for (const x of [40, 64, 98, 132, 168]) {
    c.vline(x, 72, 86, '#6e4a26');
    for (const dx of [-5, -2, 2, 5]) c.line(x, 72, x + dx, 69 + Math.abs(dx) / 2, JUNGLE.l);
  }
  // the beach, pale
  for (let x = 10; x < 290; x++) {
    const top = 86 + Math.round(Math.sin(x * 0.05) * 1.5);
    for (let y = top; y < 93; y++) c.set(x, y, y === top ? SAND.l : SAND.m);
  }
  // the reef: white surf breaking in front
  for (let x = 4; x < 296; x += 3) if (Math.sin(x * 0.17) > -0.3) c.set(x, 97 + (x % 2), '#f4f8fa');
  return c;
}

/** The hold's damaged planking, close, with a ragged hole the daylight comes through. */
function hullBreach() {
  const c = new PixelCanvas(320, 224);
  const r = rng(31);
  for (let y = 0; y < 224; y++) {
    for (let x = 0; x < 320; x++) {
      const dx = (x - 160) / 118;
      const dy = (y - 104) / 70;
      const edge = 1 + 0.12 * Math.sin(Math.atan2(dy, dx) * 7) + 0.05 * Math.sin(Math.atan2(dy, dx) * 19);
      if (dx * dx + dy * dy < edge * edge) continue;
      const plank = Math.floor(y / 14);
      const col = plank % 2 ? '#3a2418' : '#4a2e1c';
      c.set(x, y, y % 14 === 0 ? '#20140c' : col);
    }
  }
  // splinters round the hole
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const x = Math.round(160 + Math.cos(a) * 118 * (1 + r() * 0.1));
    const y = Math.round(104 + Math.sin(a) * 70 * (1 + r() * 0.1));
    c.line(x, y, Math.round(x - Math.cos(a) * 8), Math.round(y - Math.sin(a) * 6), '#7a5230');
  }
  return c;
}

/** The storm on the horizon, small, turning. */
function stormFar(f) {
  const src = stormColumn(f);
  const c = new PixelCanvas(70, 105);
  for (let y = 0; y < 105; y++) for (let x = 0; x < 70; x++) {
    const p = src.get(x * 2, y * 2);
    if (p) c.set(x, y, p);
  }
  return c;
}

/** Close in on the lee side: cliffs, the beach under them, the reef breaking off to the right. */
function islandCliffs() {
  const c = new PixelCanvas(320, 120);
  const r = rng(12);
  c.poly([[0, 120], [0, 30], [60, 14], [130, 24], [170, 6], [240, 20], [320, 34], [320, 120]], STONE.m);
  for (let x = 4; x < 320; x += 6) c.line(x, 30 - (x % 4), x + 2, 96, STONE.d);
  for (let i = 0; i < 60; i++) {
    const x = r() * 320;
    const y = 4 + r() * 22 + (x > 150 && x < 190 ? -6 : 0);
    c.ellipse(x, y + 10, 10, 7, r() < 0.5 ? JUNGLE.m : JUNGLE.l);
  }
  for (let x = 0; x < 320; x++) for (let y = 98; y < 112; y++) c.set(x, y, y < 100 ? SAND.l : SAND.m);
  return c;
}

function decoySide() {
  const c = new PixelCanvas(48, 30);
  c.poly([[2, 18], [8, 26], [40, 26], [46, 16]], '#7c5226');
  c.hline(4, 44, 18, '#a07038');
  c.vline(24, 4, 18, '#a07038');
  c.rect(19, 4, 11, 8, '#d8c8a0'); // a shirt on a stick, to look busy
  c.set(23, 6, '#3a3a46');
  c.outline(INK);
  return c;
}

// --- The excavation -------------------------------------------------------------------

/** The clearing from the ruins: the ridge behind, jungle round the edge, the dig in the middle, tools dropped. */
function clearingBg() {
  const c = new PixelCanvas(320, 150);
  const r = rng(41);
  // the ridge
  c.ellipse(250, 30, 56, 34, STONE.m);
  for (const [x, ht] of [[220, 14], [236, 20], [252, 24], [268, 20], [284, 14]]) c.poly([[x - 6, 16], [x, 16 - ht], [x + 6, 16]], STONE.l);
  // jungle all round
  for (let i = 0; i < 110; i++) {
    const x = r() * 320;
    const y = 30 + r() * 50;
    c.ellipse(x, y, 12 + r() * 8, 8 + r() * 4, r() < 0.4 ? JUNGLE.d : r() < 0.7 ? JUNGLE.m : JUNGLE.l);
  }
  // the clearing floor
  for (let y = 70; y < 150; y++) for (let x = 0; x < 320; x++) c.set(x, y, mix('#8c6a48', '#74553a', ((x * 7 + y * 3) % 13) / 13));
  // the dig, its spoil heap, tools dropped where they were
  c.ellipse(160, 108, 40, 14, '#4a3220');
  c.ellipse(160, 110, 32, 10, '#3a342c');
  c.ellipse(212, 102, 20, 10, '#a0603a');
  c.line(110, 124, 130, 110, '#a07038');
  c.line(196, 126, 220, 118, '#a07038');
  return c;
}

/** The ruins' wall in front (where the crew peer over it), as a frame along the bottom. */
function ruinsFg() {
  const c = new PixelCanvas(320, 70);
  const r = rng(43);
  const tops = [];
  for (let x = 0; x < 320; x++) {
    const top = 22 + Math.round(Math.sin(x * 0.07) * 4 + (x > 120 && x < 200 ? 10 : 0));
    tops.push(top);
    for (let y = top; y < 70; y++) {
      const row = Math.floor(y / 9);
      const seam = y % 9 === 0 || (x + (row % 2) * 9) % 18 === 0;
      c.set(x, y, seam ? STONE.d : (x * 3 + y * 5 + row) % 11 === 0 ? STONE.l : STONE.m);
    }
    c.set(x, top, STONE.h);
    if (top + 1 < 70) c.set(x, top + 1, STONE.l);
  }
  // cracks, moss and creepers
  for (let i = 0; i < 14; i++) {
    const x = Math.round(r() * 316);
    let y = tops[x] + 2;
    for (let k = 0; k < 6 && y < 69; k++) { c.set(x + (k % 3 === 2 ? 1 : 0), y, STONE.d); y++; }
  }
  for (let x = 0; x < 320; x++) if (r() < 0.45) c.set(x, tops[x], r() < 0.5 ? JUNGLE.l : JUNGLE.h);
  for (let i = 0; i < 9; i++) {
    const x = Math.round(10 + r() * 300);
    const len = 8 + Math.round(r() * 20);
    for (let k = 0; k < len; k++) c.set(x + Math.round(Math.sin(k * 0.6) * 1.5), tops[x] + k, k % 4 === 0 ? JUNGLE.l : JUNGLE.m);
  }
  return c;
}

/** The Grand Stenchmaster from behind, bent over his hole, crown on, sash and cape stirring: taking aim. */
function garrickAim(f) {
  const c = new PixelCanvas(64, 80);
  c.ellipse(32, 74, 22, 5, '#3a342c');
  // legs apart, braced
  c.rect(20, 52, 8, 22, GARRICK.suit);
  c.rect(36, 52, 8, 22, GARRICK.suit);
  // the great seat of the suit, aimed down
  c.ellipse(32, 46, 18, 14, GARRICK.suit);
  c.ellipse(28, 42, 10, 8, GARRICK.suitL);
  // cape and sash, lifting
  c.poly([[14, 20], [50, 20], [54 + f * 2, 48], [10 - f * 2, 48]], GARRICK.cape);
  c.thickLine(18, 22, 46 + f * 3, 40, 3, GARRICK.sash);
  // the head, bowed, the crown on it
  c.ellipse(32, 16, 7, 6, '#7a2a1a');
  for (const x of [26, 32, 38]) c.poly([[x - 2, 10], [x, 4 - (x === 32 ? 2 : 0)], [x + 2, 10]], GARRICK.crown);
  c.hline(25, 39, 10, GARRICK.crown);
  c.outline(INK);
  // a first wisp
  if (f) for (const [x, y] of [[30, 64], [36, 68], [26, 70]]) c.set(x, y, FUME.l);
  return c;
}

/** The plume: dirt, clay, stone and yellow, going straight up out of the clearing. Three frames. */
function blastColumn(f) {
  const cw = 130;
  const ch = 210;
  const c = new PixelCanvas(cw, ch);
  const r = rng(51 + f * 7);
  const LAYERS = ['#d6c48e', '#a0603a', '#6e6a5e', '#7a4426', '#8a8070', '#4e4a42'];
  for (let y = 0; y < ch; y++) {
    const t = 1 - y / (ch - 1);
    const cx = cw / 2 + Math.sin(y * 0.05 + f) * 4;
    const half = 12 + t * 50 + Math.sin(y * 0.2 + f * 2) * 3;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      const u = (x - cx) / half;
      if (Math.abs(u) > 1) continue;
      const k = Math.sin(y * 0.15 + u * 2 + f * 1.7);
      let col = k > 0.5 ? FUME.l : k > -0.2 ? FUME.m : '#8a6a44';
      if (Math.abs(u) > 0.8) col = FUME.d;
      c.set(x, y, col);
    }
    // chunks of every layer in it
    if (r() < 0.3) {
      const x = Math.round(cx + (r() - 0.5) * half * 1.8);
      c.ellipse(x, y, 2 + r() * 2, 1.5 + r(), LAYERS[Math.floor(r() * LAYERS.length)]);
    }
  }
  return c;
}

/** A palm tree going end over end. */
function palmFlying(f) {
  const c = new PixelCanvas(40, 40);
  const a = f * 0.8 + 0.4;
  const ex = Math.cos(a) * 16;
  const ey = Math.sin(a) * 16;
  c.thickLine(Math.round(20 - ex), Math.round(20 - ey), Math.round(20 + ex), Math.round(20 + ey), 2, '#6e4a26');
  for (let k = 0; k < 5; k++) {
    const b = a + (k - 2) * 0.5;
    c.line(Math.round(20 + ex), Math.round(20 + ey), Math.round(20 + ex + Math.cos(b) * 9), Math.round(20 + ey + Math.sin(b) * 9), JUNGLE.l);
  }
  c.outline(INK);
  return c;
}

/** The smell arriving: a yellow wave rolling in over the ruins. */
function odorWave(f) {
  const c = new PixelCanvas(320, 70);
  for (let x = 0; x < 320; x++) {
    const top = 18 + Math.round(Math.sin(x * 0.05 + f) * 8 + Math.sin(x * 0.13) * 3);
    for (let y = top; y < 70; y++) if ((x + y + f) % 3 || y > top + 10) c.set(x, y, y < top + 3 ? FUME.h : y < top + 14 ? FUME.l : FUME.m);
  }
  return c;
}

// --- The storm inland, and the megalodon -------------------------------------------------

function megalodonShadow() {
  const c = new PixelCanvas(170, 34);
  for (let y = 0; y < 34; y++) for (let x = 0; x < 170; x++) {
    const d = ((x - 80) / 80) ** 2 + ((y - 17) / 15) ** 2;
    if (d < 1 && (x + y) % 2 === 0) c.set(x, y, '#0a0c18');
  }
  return c;
}

/** The megalodon (and crowned), from the props: the same fish in a picture. */
const megaFrame = (crowned) => paintProp(crowned ? 'megalodon_crowned' : 'megalodon').frames[0];

function impactDust() {
  const c = new PixelCanvas(220, 80);
  const r = rng(61);
  for (let i = 0; i < 90; i++) {
    const x = 20 + r() * 180;
    const y = 30 + r() * 44;
    c.ellipse(x, y, 8 + r() * 10, 5 + r() * 6, r() < 0.5 ? '#c8b890' : '#a89870');
  }
  return c;
}

// --- The Crimson Fortune --------------------------------------------------------------

/** The hoard in the bottom of the hole, for one moment: chests, crowns, coins, a crimson crown on top. */
function hoard(f) {
  const c = new PixelCanvas(170, 70);
  const r = rng(71);
  c.ellipse(85, 50, 80, 18, '#3a342c');
  for (let i = 0; i < 120; i++) {
    const x = 20 + r() * 130;
    const y = 36 + r() * 24;
    c.ellipse(x, y, 2, 1.5, r() < 0.7 ? GOLD.m : GOLD.l);
  }
  for (const [x, y] of [[40, 36], [120, 34], [80, 40]]) {
    c.rect(x - 12, y - 6, 24, 14, '#6a3a18');
    c.rect(x - 12, y - 10, 24, 5, '#8a4a20');
    c.hline(x - 12, x + 11, y - 2, GOLD.d);
    c.rect(x - 2, y - 3, 4, 4, GOLD.l);
  }
  for (const [x, y] of [[60, 30], [104, 28], [140, 40]]) {
    for (const px of [-4, 0, 4]) c.poly([[x + px - 2, y], [x + px, y - 5], [x + px + 2, y]], GOLD.l);
    c.hline(x - 6, x + 6, y, GOLD.d);
  }
  crimsonCrown(c, 85, 22);
  for (let i = 0; i < 8; i++) c.set(Math.round(20 + r() * 130), Math.round(26 + r() * 30), (i + f) % 2 ? '#ffffff' : GOLD.h);
  return c;
}

/** The Crimson King's Crown: gold, rubies, big. */
function crimsonCrown(c, x, y, s = 1) {
  c.poly([[x - 14 * s, y + 8 * s], [x - 14 * s, y - 6 * s], [x - 7 * s, y], [x, y - 12 * s], [x + 7 * s, y], [x + 14 * s, y - 6 * s], [x + 14 * s, y + 8 * s]], GOLD.l);
  c.hline(x - 14 * s, x + 14 * s, y + 5 * s, GOLD.d);
  c.hline(x - 14 * s, x + 14 * s, y + 8 * s, GOLD.d);
  for (const [dx, col] of [[-9, '#d02838'], [0, '#c01828'], [9, '#28a050']]) c.ellipse(x + dx * s, y + 2 * s, 2 * s, 2 * s, col);
  for (const [dx, dy] of [[-14, -6], [0, -12], [14, -6]]) c.set(x + dx * s, y + dy * s - 1, '#ffffff');
}

function crimsonCrownBig() {
  const c = new PixelCanvas(44, 34);
  crimsonCrown(c, 22, 18, 1.4);
  c.outline(INK);
  return c;
}

/** The fortune going up the plume: coins, chains, crowns, a chest, gems. */
function treasureColumn(f) {
  const c = blastColumn(f + 1);
  const r = rng(81 + f * 13);
  for (let i = 0; i < 160; i++) {
    const y = Math.floor(r() * 200);
    const t = 1 - y / 200;
    const x = Math.round(65 + (r() - 0.5) * (24 + t * 90));
    const k = r();
    if (k < 0.6) c.ellipse(x, y, 1.5, 1, k < 0.3 ? GOLD.l : GOLD.m);
    else if (k < 0.75) c.set(x, y, ['#d02838', '#28a050', '#3a6ad0', '#ffffff'][Math.floor(r() * 4)]);
    else if (k < 0.8) for (const px of [-2, 0, 2]) c.set(x + px, y - (px === 0 ? 2 : 1), GOLD.l);
  }
  c.rect(52, 120 - f * 10, 14, 9, '#6a3a18');
  c.hline(52, 65, 123 - f * 10, GOLD.d);
  return c;
}

// --- The rage shanty (imagination) -----------------------------------------------------------

function shantyStage() {
  const c = new PixelCanvas(320, 224);
  for (let y = 0; y < 224; y++) for (let x = 0; x < 320; x++) {
    const v = Math.hypot((x - 160) / 190, (y - 120) / 150);
    c.set(x, y, mix('#3a0c14', '#0a0206', Math.min(1, v)));
  }
  // curtains each side, a pelmet
  for (const side of [0, 1]) {
    for (let x = 0; x < 54; x++) {
      const cx = side ? 319 - x : x;
      for (let y = 0; y < 224; y++) c.set(cx, y, (x + Math.floor(y / 30)) % 8 < 4 ? '#8a1424' : '#6a0c1a');
    }
  }
  for (let x = 0; x < 320; x++) for (let y = 0; y < 22; y++) c.set(x, y, (x + y) % 10 < 5 ? '#9a1c2a' : '#7a1220');
  for (let x = 0; x < 320; x += 8) c.ellipse(x + 4, 22, 4, 3, '#c89a30');
  // the boards
  for (let y = 176; y < 224; y++) for (let x = 0; x < 320; x++) c.set(x, y, y % 8 === 0 ? '#3a2410' : '#6a4420');
  // spotlights
  for (const sx of [110, 210]) {
    for (let y = 22; y < 190; y++) {
      const half = (y - 22) * 0.3;
      for (let x = Math.round(sx - half); x <= sx + half; x++) if ((x + y) % 2 === 0) c.blend(x, y, '#fff4c0', 0.12);
    }
  }
  return c;
}

/** A shark standing on its tail in the captain's treasure, swaying. `kind`: pearls | tiara | rings. */
function shantyShark(kind, f) {
  const c = new PixelCanvas(40, 70);
  const sway = f ? 1 : -1;
  c.ellipse(20 + sway, 30, 10, 24, SHARK.m);
  c.ellipse(22 + sway, 32, 6, 18, SHARK.belly);
  c.poly([[10 + sway, 28], [2 + sway, 22], [10 + sway, 36]], SHARK.d); // fin, conducting
  c.poly([[30 + sway, 28], [38 + sway, 20 + f * 4], [30 + sway, 36]], SHARK.d);
  c.poly([[14, 52], [20, 68], [26, 52]], SHARK.d); // the tail it stands on
  c.poly([[14 + sway, 12], [26 + sway, 12], [20 + sway, 22]], '#5a1a20'); // mouth open, singing
  for (let x = 15; x < 26; x += 3) c.set(x + sway, 13, '#f4f0e8');
  c.set(16 + sway, 8, '#0a0a10');
  c.set(24 + sway, 8, '#0a0a10');
  if (kind === 'pearls') for (let i = 0; i < 8; i++) c.ellipse(13 + i * 2 + sway, 24 + (i % 2), 1, 1, '#f4f0e8');
  if (kind === 'tiara') { for (let i = 0; i < 7; i++) c.set(14 + i * 2 + sway, 3 - (i % 2), GOLD.l); c.set(20 + sway, 1, '#d02838'); }
  if (kind === 'rings') for (const y of [30, 36]) c.hline(8 + sway, 11 + sway, y, GOLD.l);
  // a bit of somebody's hat
  if (kind === 'tiara') c.poly([[22 + sway, 4], [30 + sway, 0], [28 + sway, 6]], '#2a2a32');
  c.outline(INK);
  return c;
}

/** The hammerhead soloist, gold chain, a scrap of a pirate's coat. */
function shantyHammer(f) {
  const c = new PixelCanvas(48, 72);
  c.ellipse(24, 34, 10, 24, SHARK.m);
  c.ellipse(26, 36, 6, 18, SHARK.belly);
  c.rect(6, 8 + f, 36, 6, SHARK.d); // the hammer
  c.set(7, 10 + f, '#0a0a10');
  c.set(40, 10 + f, '#0a0a10');
  c.poly([[18, 16], [30, 16], [24, 24]], '#5a1a20');
  for (let i = 0; i < 10; i++) c.ellipse(15 + i * 2, 28 + (i % 2), 1.2, 1.2, i % 2 ? GOLD.m : GOLD.l);
  c.rect(14, 40, 20, 8, '#7a1826'); // a scrap of red coat
  c.poly([[18, 56], [24, 72], [30, 56]], SHARK.d);
  c.poly([[14, 30], [4, 20 - f * 4], [14, 38]], SHARK.d);
  c.outline(INK);
  return c;
}

function shantyAccordion(f) {
  const c = shantyShark('rings', f);
  // an accordion across its middle
  for (let x = 6; x < 34; x++) c.vline(x, 32, 44, x % 4 < 2 ? '#c02a2a' : '#f4e8d0');
  c.rect(4 - f, 30, 4, 16, '#2a2a32');
  c.rect(32 + f, 30, 4, 16, '#2a2a32');
  c.outline(INK);
  return c;
}

export function addPhase9VistaFrames(atlas) {
  atlas.add('hist_stenchalina', stenchalina());
  atlas.add('hist_ribbon', ribbon());
  atlas.add('hist_bearers', sashBearers());
  atlas.add('hist_treasures', fiveTreasures());
  atlas.add('hist_stenchmasters', stenchmasters());
  atlas.add('hist_seven_winds', sevenWinds());
  atlas.add('crownskull_far', crownskullFar());
  atlas.add('hull_breach', hullBreach());
  atlas.add('island_cliffs', islandCliffs());
  atlas.add('decoy_side', decoySide());
  atlas.add('clearing_bg', clearingBg());
  atlas.add('ruins_fg', ruinsFg());
  atlas.add('megalodon_shadow', megalodonShadow());
  atlas.add('megalodon_side', megaFrame(false));
  atlas.add('megalodon_side_crowned', megaFrame(true));
  atlas.add('impact_dust', impactDust());
  atlas.add('crimson_crown_big', crimsonCrownBig());
  atlas.add('shanty_stage', shantyStage());
  for (const f of [0, 1]) {
    atlas.add(`ftm_eaten_${f}`, ftmEaten(f));
    atlas.add(`ftm_storm_${f}`, ftmStorm(f));
    atlas.add(`storm_far_${f}`, stormFar(f));
    atlas.add(`garrick_aim_${f}`, garrickAim(f));
    atlas.add(`palm_flying_${f}`, palmFlying(f));
    atlas.add(`odor_wave_${f}`, odorWave(f));
    atlas.add(`hoard_${f}`, hoard(f));
    atlas.add(`treasure_column_${f}`, treasureColumn(f));
    atlas.add(`shanty_pearls_${f}`, shantyShark('pearls', f));
    atlas.add(`shanty_tiara_${f}`, shantyShark('tiara', f));
    atlas.add(`shanty_hammer_${f}`, shantyHammer(f));
    atlas.add(`shanty_accordion_${f}`, shantyAccordion(f));
  }
  for (const f of [0, 1, 2]) atlas.add(`blast_column_${f}`, blastColumn(f));
}

export const PHASE9_VISTA_FRAMES = [
  'hist_stenchalina', 'hist_ribbon', 'hist_bearers', 'hist_treasures', 'hist_stenchmasters', 'hist_seven_winds',
  'crownskull_far', 'hull_breach', 'island_cliffs', 'decoy_side', 'clearing_bg', 'ruins_fg', 'megalodon_shadow',
  'megalodon_side', 'megalodon_side_crowned', 'impact_dust', 'crimson_crown_big', 'shanty_stage',
  ...['ftm_eaten', 'ftm_storm', 'storm_far', 'garrick_aim', 'palm_flying', 'odor_wave', 'hoard', 'treasure_column',
    'shanty_pearls', 'shanty_tiara', 'shanty_hammer', 'shanty_accordion'].flatMap((n) => [`${n}_0`, `${n}_1`]),
  'blast_column_0', 'blast_column_1', 'blast_column_2',
];

/** Small versions of the new episodes, for the set in the hold (props). */
export const PHASE9_SCREEN_PAINTERS = {
  ftm4: (f) => [ftmEaten, ftmStorm][f % 2](f % 2),
};
