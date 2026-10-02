import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { drawText } from '../font/drawText.js';

/**
 * Story Phase 6 close-ups: the label on the rotten garlic, the warning card
 * Garrick taped to the S.E.S. (his most responsible piece of engineering),
 * the cape he painted with his "historic releases", and the captain's food
 * ban.
 */
const INK = PAL.ink;
const PAPER = '#f7efdc';
const PAPER_D = '#eadfc4';
const CRAYON = { yellow: '#f2c81e', blue: '#2f64d0', red: '#d8322a', green: '#3a9a3a', brown: '#8a5426' };

function sheet(w, h, col = PAPER) {
  const c = new PixelCanvas(w, h);
  c.rect(1, 1, w - 2, h - 2, col);
  for (let i = 0; i < (w * h) / 80; i++) c.set(2 + ((i * 37) % (w - 4)), 2 + ((i * 53) % (h - 4)), PAPER_D);
  return c;
}

/** Jim's label on the jar, in three increasingly upset hands. */
function garlicLabel() {
  const c = sheet(200, 96, '#e8e0c0');
  c.rect(0, 0, 200, 6, '#8a8a7a');
  drawText(c, 'GARLIC', 100, 14, INK, { center: true, scale: 2 });
  drawText(c, 'DO NOT EAT', 100, 40, CRAYON.red, { center: true, scale: 2 });
  drawText(c, 'BADLY SPOILED', 100, 66, CRAYON.brown, { center: true, jitter: 1 });
  drawText(c, '- JIM', 168, 80, '#3a3a48');
  for (let i = 0; i < 9; i++) c.set(20 + i * 18, 88 - (i % 3), '#6a7a28');
  c.strokeRect(0, 0, 200, 96, INK);
  return c;
}

/** The card taped to the S.E.S.: a stick figure touches it; lightning. */
function warningCardClose() {
  const c = sheet(200, 132);
  for (const [tx, ty] of [[4, 2], [176, 2]]) c.rect(tx, ty, 20, 7, '#e8e0b0c0');
  // the drawing
  c.rect(110, 26, 40, 34, CRAYON.brown);
  c.rect(116, 32, 28, 20, '#2a3a36');
  c.ellipse(60, 30, 6, 6, INK);
  c.thickLine(60, 36, 60, 56, 2, INK);
  c.thickLine(60, 42, 108, 40, 2, INK);
  c.thickLine(60, 56, 52, 68, 2, INK);
  c.thickLine(60, 56, 68, 68, 2, INK);
  for (const [x0, y0, x1, y1] of [[96, 10, 80, 30], [80, 30, 92, 32], [92, 32, 72, 56]]) c.thickLine(x0, y0, x1, y1, 3, CRAYON.yellow);
  for (const [sx, sy] of [[46, 24], [74, 22], [48, 40], [72, 46]]) c.thickLine(sx, sy, sx + (sx < 60 ? -5 : 5), sy - 4, 1, CRAYON.yellow);
  drawText(c, 'WAIT BEFORE POKING', 100, 86, CRAYON.red, { center: true, jitter: 1 });
  drawText(c, 'VERY ZAPPY', 100, 104, CRAYON.red, { center: true, scale: 2, jitter: 1 });
  c.strokeRect(0, 0, 200, 132, INK);
  return c;
}

/** The back of the cape: the Grand Stenchmaster's historic releases, painted on in house paint. */
function paintedCape() {
  const W = 236;
  const H = 150;
  const c = new PixelCanvas(W, H);
  c.poly([[30, 0], [206, 0], [234, H - 1], [2, H - 1]], '#7a1826');
  c.poly([[34, 0], [100, 0], [80, H - 1], [8, H - 1]], '#8a2030');
  for (let x = 2; x < 234; x += 6) c.rect(x, H - 4, 3, 4, '#c8982a'); // tassel fringe
  c.hline(30, 205, 1, '#c8982a');
  drawText(c, 'HISTORIC RELEASES', W / 2, 8, '#f0cc48', { center: true, jitter: 1 });
  const list = ['THE FIRST ONE', 'THE BATHTUB', 'THE FORECAST ONE', 'THE MEDAL ONE', 'THE GREAT ONE (MAYBE)'];
  list.forEach((t, i) => {
    const y = 28 + i * 20;
    c.ellipse(52 + i * 6, y + 4, 6, 5, '#d8c048');
    c.ellipse(50 + i * 6, y + 2, 3, 2, '#f4e67a');
    drawText(c, t, 66 + i * 6, y, '#f0e0b0', { jitter: 1, seed: i + 3 });
  });
  // drips of paint, a scorch at the hem
  for (const dx of [70, 130, 180]) c.vline(dx, 18, 22, '#f0cc48');
  for (let x = 150; x < 200; x++) for (let y = H - 14; y < H - 4; y++) if ((x * 7 + y * 3) % 5 < 3 && c.alphaAt(x, y)) c.blend(x, y, '#141010', 0.55 + ((x - 150) % 7) * 0.04);
  c.outline(INK);
  return c;
}

/** The captain's food ban, nailed to the galley door. */
function foodBanClose() {
  const c = sheet(216, 140);
  drawText(c, 'BY ORDER OF THE CAPTAIN', 108, 8, INK, { center: true });
  c.hline(30, 186, 19, INK);
  const body = [
    ['NO MORE ROTTEN GARLIC.', CRAYON.red],
    ['EVER.', CRAYON.red],
    ['', INK],
    ['FOR GARRICK, ALSO BANNED:', INK],
    ['ONIONS. BEANS. CABBAGE.', INK],
    ['CHEESE. ANYTHING THAT', INK],
    ['HAS "EVER BEEN NEAR"', INK],
    ['A CHEESE.', INK],
  ];
  body.forEach(([t, col], i) => drawText(c, t, 108, 26 + i * 11, col, { center: true }));
  drawText(c, 'CPT. STINKBEARD', 150, 120, '#3a3a48', { center: true });
  c.line(110, 129, 190, 128, '#3a3a48');
  for (const [nx, ny] of [[6, 6], [208, 6], [6, 132], [208, 132]]) c.rect(nx, ny, 3, 3, '#6a6a78');
  c.strokeRect(0, 0, 216, 140, INK);
  return c;
}

export function addPhase6Inserts(atlas) {
  atlas.add('garlic_label', garlicLabel());
  atlas.add('warning_card_close', warningCardClose());
  atlas.add('painted_cape', paintedCape());
  atlas.add('food_ban_close', foodBanClose());
}

export const PHASE6_INSERT_NAMES = ['garlic_label', 'warning_card_close', 'painted_cape', 'food_ban_close'];
