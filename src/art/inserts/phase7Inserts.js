import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { drawText } from '../font/drawText.js';

/**
 * Story Phase 7 close-ups: the slate the crew chalked up during the
 * argument (what the Grand Stenchmaster does, and what he isn't allowed to
 * say he does), the notice Garrick nailed up for a Grand Sharkmaster (with
 * the captain's correction), and the lyric sheet of the Song of the Grand
 * Stenchmaster, in Garrick's crayon.
 */
const INK = PAL.ink;
const PAPER = '#f7efdc';
const PAPER_D = '#eadfc4';
const CHALK = '#e8ecef';
const CRAYON = { blue: '#2f64d0', red: '#d8322a', green: '#3a9a3a', brown: '#8a5426', burgundy: '#7a1826' };

function sheet(w, h, col = PAPER) {
  const c = new PixelCanvas(w, h);
  c.rect(1, 1, w - 2, h - 2, col);
  for (let i = 0; i < (w * h) / 80; i++) c.set(2 + ((i * 37) % (w - 4)), 2 + ((i * 53) % (h - 4)), PAPER_D);
  return c;
}

/** Hale's slate, chalked up during the argument: the question, and the answers the crew won't accept. */
function jobSlate() {
  const W = 224;
  const H = 150;
  const c = new PixelCanvas(W, H);
  c.rect(0, 0, W, H, '#6a4a28');
  c.rect(6, 6, W - 12, H - 12, '#26302c');
  for (let i = 0; i < 220; i++) c.set(8 + ((i * 41) % (W - 16)), 8 + ((i * 29) % (H - 16)), '#34403a');
  drawText(c, 'THE GRAND STENCHMASTER', W / 2, 14, CHALK, { center: true, jitter: 1 });
  drawText(c, 'WHAT DOES HE DO?', W / 2, 28, CHALK, { center: true, scale: 1, jitter: 1, seed: 4 });
  c.line(40, 40, 184, 41, CHALK);
  drawText(c, 'NOT ALLOWED:', 20, 50, '#f0a0a0', { jitter: 1, seed: 2 });
  const no = ['WEAR THE SUIT', 'FART', 'WATCH TELEVISION', 'BE LAZY'];
  no.forEach((t, i) => {
    const y = 64 + i * 14;
    drawText(c, t, 34, y, CHALK, { jitter: 1, seed: 7 + i });
    c.line(30, y + 3, 30 + t.length * 6 + 6, y + 4, '#f0a0a0');
  });
  drawText(c, 'ANSWERS SO FAR:', 20, 124, '#f0a0a0', { jitter: 1, seed: 9 });
  drawText(c, '0', 120, 124, CHALK, { scale: 2, jitter: 1 });
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

/** Garrick's notice for a Grand Sharkmaster, nailed up beside the rule; the captain has added to it. */
function sharkmasterNotice() {
  const c = sheet(216, 150);
  drawText(c, 'SITUATIONS VACANT', 108, 8, CRAYON.burgundy, { center: true, jitter: 1 });
  drawText(c, 'GRAND SHARKMASTER', 108, 22, CRAYON.green, { center: true, scale: 2, jitter: 1, seed: 3 });
  const body = [
    'DEPARTMENT: SHARKS (ALL).',
    'STATUS: VACANT.',
    'DUTIES: THE SHARKS.',
    'NOT THE STENCH. THAT IS',
    'A DIFFERENT OFFICE.',
    'APPLY: THE PIRATE',
    'EMPLOYMENT MARKET.',
  ];
  body.forEach((t, i) => drawText(c, t, 108, 46 + i * 11, CRAYON.brown, { center: true, jitter: 1, seed: 10 + i }));
  drawText(c, '- THE GRAND STENCHMASTER', 120, 124, CRAYON.burgundy, { center: true, jitter: 1, seed: 5 });
  // the captain's correction, across the whole thing, in ink
  for (let k = 0; k < 3; k++) c.line(24 + k, 40, 196 + k, 112, '#1a1a28');
  drawText(c, 'NOT REAL.', 150, 136, '#1a1a28', { center: true, scale: 2 });
  for (const [nx, ny] of [[6, 6], [208, 6], [6, 142], [208, 142]]) c.rect(nx, ny, 3, 3, '#6a6a78');
  c.strokeRect(0, 0, 216, 150, INK);
  return c;
}

/** The lyric sheet, in crayon, with the parts the crew shouted written in by somebody else. */
function songSheet() {
  const c = sheet(232, 156, '#efe4c4');
  drawText(c, 'THE SONG OF THE', 116, 6, CRAYON.burgundy, { center: true, jitter: 1 });
  drawText(c, 'GRAND STENCHMASTER', 116, 18, CRAYON.burgundy, { center: true, scale: 1, jitter: 1, seed: 6 });
  drawText(c, '(WORDS & MUSIC: G.G.)', 116, 30, CRAYON.brown, { center: true, jitter: 1, seed: 8 });
  const lines = [
    ['OH, I WARM THE CHAIR THE CAPTAIN LEFT!', CRAYON.blue],
    ['I DINE ON ONION, GARLIC, CHEESE!', CRAYON.blue],
    ['   (BANNED)', CRAYON.red],
    ['MY REGAL SUIT OF BURGUNDY!', CRAYON.blue],
    ['   (UGLY)', CRAYON.red],
    ["SO IT'S YO-HO! THE STENCHMASTER-O!", CRAYON.green],
    ['HE STINKS FOR YOU, AND HE STINKS FOR ME!', CRAYON.green],
    ["AND IF IT'S SHARKS, WELL, DON'T ASK ME...", CRAYON.blue],
    ['(VERSE 2 NOT FINISHED. CAPTAIN.)', CRAYON.red],
  ];
  lines.forEach(([t, col], i) => drawText(c, t, 10, 44 + i * 12, col, { jitter: 1, seed: 20 + i }));
  // a grog ring and a little drawing of himself, with a halo
  c.ellipseOutline(200, 132, 12, 8, '#9ab040');
  c.ellipse(204, 52, 6, 6, CRAYON.burgundy);
  c.ellipseOutline(204, 44, 7, 2, '#e0b030');
  c.strokeRect(0, 0, 232, 156, INK);
  return c;
}

export function addPhase7Inserts(atlas) {
  atlas.add('job_slate', jobSlate());
  atlas.add('sharkmaster_notice_close', sharkmasterNotice());
  atlas.add('song_sheet', songSheet());
}

export const PHASE7_INSERT_NAMES = ['job_slate', 'sharkmaster_notice_close', 'song_sheet'];
