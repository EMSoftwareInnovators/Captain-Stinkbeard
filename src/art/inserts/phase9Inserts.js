import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { drawText } from '../font/drawText.js';

/**
 * Story Phase 9 close-ups: the CLEARANCE sticker still on the front of the
 * Grand Stenchmaster Sash; Garrick's organisation chart for the sash (in
 * crayon); the paper he pins on Pete (GRAND SHARKMASTER = PETE); Pete's
 * landing plan, chalked on a hatch cover; the captain's old treasure map of
 * Crownskull Isle; and the carving on the Crimson Fortune's marker.
 */
const INK = PAL.ink;
const CRAY = { paper: '#efe4c4', paperD: '#dccfa8', brown: '#8a5426', red: '#d8322a', blue: '#2f64d0', green: '#3a9a3a', grey: '#7a7a86', burg: '#7a1826' };
const PARCH = { l: '#ecdcb0', m: '#d8c490', d: '#b09a68', ink: '#4a3420', faded: '#8a7450' };

function crayon(c, x0, y0, x1, y1, col, seed = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const j = ((i * 7 + seed) % 5 === 0) ? 1 : 0;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t) + j;
    c.set(x, y, col);
    c.set(x + 1, y, col);
  }
}

function paper(W, H, color = CRAY.paper, speck = CRAY.paperD) {
  const c = new PixelCanvas(W, H);
  c.fill(color);
  for (let i = 0; i < W * H / 60; i++) c.set((i * 97 + 13) % W, (i * 37 + 11) % H, speck);
  return c;
}

/** The front of the sash, close: mustard, burgundy edges, and a round CLEARANCE sticker nobody peeled off. */
function sashClearance() {
  const W = 224;
  const H = 140;
  const c = new PixelCanvas(W, H);
  c.fill('#1a1018');
  for (let y = 0; y < H; y++) {
    const x0 = Math.round(40 + y * 0.5);
    for (let x = x0; x < x0 + 110; x++) {
      if (x < 0 || x >= W) continue;
      const e = x - x0;
      c.set(x, y, e < 6 || e > 103 ? '#5e1624' : (x * 3 + y) % 11 === 0 ? '#e8d878' : '#c8982a');
    }
  }
  // the sticker: bright, round, slightly peeling at one edge
  c.ellipse(120, 70, 34, 34, '#e83a2a');
  c.ellipse(120, 70, 30, 30, '#f8e040');
  c.poly([[146, 52], [154, 44], [152, 58]], '#d8d0b8');
  drawText(c, 'CLEARANCE', 120, 58, '#c8281a', { center: true });
  drawText(c, '70%', 120, 68, '#c8281a', { center: true, scale: 2 });
  drawText(c, 'OFF', 120, 86, '#c8281a', { center: true });
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

/** Garrick's organisation chart for the Grand Stenchmaster Sash, in crayon. Boxes, arrows, a person very far away. */
function orgChart() {
  const W = 232;
  const H = 156;
  const c = paper(W, H);
  const box = (x, y, w, lines, col) => {
    const h = lines.length * 10 + 6;
    crayon(c, x, y, x + w, y, col, x);
    crayon(c, x, y + h, x + w, y + h, col, y);
    crayon(c, x, y, x, y + h, col, x + y);
    crayon(c, x + w, y, x + w, y + h, col, w);
    lines.forEach((t, i) => drawText(c, t, x + w / 2, y + 4 + i * 10, col, { center: true, jitter: 1, seed: i + x }));
    return y + h;
  };
  let b = box(70, 6, 92, ['GRAND', 'STENCHMASTER'], CRAY.burg);
  crayon(c, 116, b, 116, b + 8, CRAY.brown);
  b = box(52, b + 8, 128, ['DEPUTY GRAND SASH STEWARD'], CRAY.blue);
  crayon(c, 116, b, 116, b + 6, CRAY.brown);
  b = box(18, b + 6, 196, ['ACTING ASSISTANT DEPUTY GRAND', 'STEWARD OF STENCHMASTER TEXTILES'], CRAY.green);
  crayon(c, 70, b, 60, b + 8, CRAY.brown);
  box(14, b + 8, 92, ['EMERGENCY SASH', 'TECHNICIAN'], CRAY.red);
  // the Senior Flutter Observer, fifteen feet away, off to the side with an arrow
  crayon(c, 150, b + 4, 176, b + 18, CRAY.brown);
  drawText(c, 'SENIOR FLUTTER', 180, b + 22, CRAY.grey, { center: true, jitter: 1, seed: 3 });
  drawText(c, 'OBSERVER', 180, b + 32, CRAY.grey, { center: true, jitter: 1, seed: 4 });
  drawText(c, '(15 FT AWAY)', 180, b + 42, CRAY.grey, { center: true, jitter: 1, seed: 5 });
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

/** GRAND SHARKMASTER = PETE, and a shark, in crayon, pinned to a beam. */
function sharkmasterPaper() {
  const W = 200;
  const H = 140;
  const c = paper(W, H);
  drawText(c, 'GRAND SHARKMASTER', W / 2, 14, CRAY.burg, { center: true, jitter: 1, seed: 7 });
  drawText(c, '= PETE', W / 2, 30, CRAY.blue, { center: true, jitter: 1, seed: 8, scale: 2 });
  // the shark: a lumpy oval, a triangle, teeth, a happy eye
  for (let y = -14; y <= 14; y++) for (let x = -44; x <= 44; x++) if ((x / 44) ** 2 + (y / 14) ** 2 < 1 && (x + y) % 3) c.set(100 + x, 92 + y, CRAY.grey);
  crayon(c, 92, 78, 104, 60, CRAY.grey, 2);
  crayon(c, 104, 60, 112, 79, CRAY.grey, 3);
  crayon(c, 140, 92, 160, 76, CRAY.grey, 4);
  crayon(c, 140, 92, 160, 108, CRAY.grey, 5);
  for (let x = 62; x < 84; x += 4) crayon(c, x, 96, x + 2, 100, '#ffffff', x);
  c.ellipse(70, 87, 2, 2, '#2a2a32');
  // a pin at the top
  c.ellipse(W / 2, 4, 3, 3, CRAY.red);
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

/** Pete's plan, chalked on a hatch cover: the island, the reef, the lee side, and eight numbered steps. */
function petesPlan() {
  const W = 232;
  const H = 156;
  const c = new PixelCanvas(W, H);
  c.fill('#2c3830');
  for (let i = 0; i < 300; i++) c.set((i * 53 + 7) % W, (i * 29 + 3) % H, '#34423a');
  const chalk = '#e8e2d0';
  // the island (top right), its south side, the reef (dots), the storm (a spiral, left)
  for (let y = -26; y <= 26; y++) for (let x = -40; x <= 40; x++) {
    const d = (x / 40) ** 2 + (y / 26) ** 2;
    if (d < 1 && d > 0.86) c.set(150 + x, 52 + y, chalk);
  }
  drawText(c, 'CROWNSKULL', 150, 48, chalk, { center: true, jitter: 1, seed: 2 });
  for (let x = 96; x < 200; x += 5) c.set(x, 90 + Math.round(Math.sin(x * 0.3) * 2), chalk);
  drawText(c, 'REEF', 214, 86, chalk, { center: true });
  for (let k = 0; k < 40; k++) {
    const a = k * 0.45;
    c.set(Math.round(34 + Math.cos(a) * k * 0.6), Math.round(40 + Math.sin(a) * k * 0.6), '#c8c070');
  }
  drawText(c, 'STORM', 34, 70, '#c8c070', { center: true });
  // the route: round to the lee side, the decoy one way, the boats the other
  const route = [[132, 146], [142, 126], [152, 108], [160, 98]];
  for (let i = 0; i < route.length - 1; i++) crayon(c, ...route[i], ...route[i + 1], chalk, i);
  crayon(c, 160, 98, 196, 116, '#e07a6a', 9); // the decoy, off east
  crayon(c, 160, 98, 150, 80, chalk, 10); // the boats, in under the cliffs
  // the steps, numbered down the left
  const steps = ['1 LEE SIDE', '2 CLIFFS', '3 CLOSE IN', '4 DECOY', '5 WATCH', '6 LURE', '7 BOATS', '8 BEACH'];
  steps.forEach((t, i) => drawText(c, t, 6 + (i < 4 ? 0 : 60), 88 + (i % 4) * 11, chalk, { jitter: 1, seed: i }));
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

/** The captain's old treasure map: the crowned skull of an island, its reefs, and an X. Creased, stained, his for years. */
function treasureMap() {
  const W = 232;
  const H = 156;
  const c = paper(W, H, PARCH.l, PARCH.m);
  // creases and a stain
  c.vline(W / 2, 2, H - 3, PARCH.d);
  c.hline(2, W - 3, H / 2, PARCH.d);
  c.ellipse(190, 120, 16, 10, PARCH.m);
  // the island: a crowned skull's outline from above
  for (let y = -40; y <= 40; y++) for (let x = -52; x <= 52; x++) {
    const d = (x / 52) ** 2 + (y / 40) ** 2;
    if (d < 1 && d > 0.9) c.set(110 + x, 80 + y, PARCH.ink);
  }
  for (const [x, h] of [[80, 14], [96, 20], [110, 24], [124, 20], [140, 14]]) crayon(c, x, 42, x, 42 - h, PARCH.ink, x);
  c.ellipse(94, 72, 8, 7, PARCH.faded);
  c.ellipse(126, 72, 8, 7, PARCH.faded);
  // the X, in red, where the eye of the skull would be... no: in the middle, under the crown
  crayon(c, 104, 82, 116, 94, '#a02020', 1);
  crayon(c, 116, 82, 104, 94, '#a02020', 2);
  // the reef along the south, a compass
  for (let x = 60; x < 160; x += 6) c.set(x, 128 + Math.round(Math.sin(x) * 2), PARCH.ink);
  c.ellipse(28, 30, 14, 14, PARCH.m);
  crayon(c, 28, 16, 28, 44, PARCH.ink, 3);
  crayon(c, 14, 30, 42, 30, PARCH.ink, 4);
  drawText(c, 'N', 28, 6, PARCH.ink, { center: true });
  drawText(c, 'CROWNSKULL', 110, 138, PARCH.ink, { center: true, jitter: 1, seed: 9 });
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

/** The carving on the marker, cut clear of vines: a crowned skull over crossed swords, and the words. */
function inscription() {
  const W = 232;
  const H = 156;
  const c = new PixelCanvas(W, H);
  c.fill('#6e6a5e');
  for (let i = 0; i < 500; i++) c.set((i * 61 + 5) % W, (i * 43 + 9) % H, i % 3 ? '#625e54' : '#7e7a6c');
  // moss at the edges
  for (let x = 0; x < W; x += 3) for (let y = 0; y < 6 - (x % 5); y++) c.set(x, H - 1 - y, '#4e7a36');
  const groove = '#3e3a32';
  const paint = '#9a2a24';
  // the skull
  c.ellipse(116, 52, 22, 20, '#8e897a');
  c.ellipse(108, 50, 5, 5, groove);
  c.ellipse(124, 50, 5, 5, groove);
  c.poly([[113, 62], [116, 57], [119, 62]], groove);
  for (let x = 104; x < 130; x += 5) c.rect(x, 66, 3, 5, '#a8a294');
  // the crown, with old red paint in the grooves
  for (const [x, h] of [[100, 12], [116, 18], [132, 12]]) c.poly([[x - 6, 34], [x, 34 - h], [x + 6, 34]], paint);
  c.hline(94, 138, 34, groove);
  // crossed swords
  for (const s of [-1, 1]) {
    c.thickLine(116 - 40 * s, 104, 116 + 30 * s, 76, 2, groove);
    c.thickLine(116 + 30 * s - 4, 82, 116 + 30 * s + 4, 86, 2, groove);
  }
  drawText(c, 'THE FORTUNE OF THE', W / 2, 116, '#2e2a24', { center: true });
  drawText(c, 'CRIMSON KINGS', W / 2, 130, paint, { center: true, scale: 1 });
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

export function addPhase9Inserts(atlas) {
  atlas.add('sash_clearance_close', sashClearance());
  atlas.add('sash_org_chart', orgChart());
  atlas.add('sharkmaster_paper', sharkmasterPaper());
  atlas.add('petes_plan', petesPlan());
  atlas.add('crownskull_treasure_map', treasureMap());
  atlas.add('crimson_inscription', inscription());
}

export const PHASE9_INSERT_NAMES = ['sash_clearance_close', 'sash_org_chart', 'sharkmaster_paper', 'petes_plan', 'crownskull_treasure_map', 'crimson_inscription'];
