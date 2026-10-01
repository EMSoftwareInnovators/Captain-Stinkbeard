import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { drawText } from '../font/drawText.js';

/**
 * Story Phase 5 close-ups: the medals Garrick awarded himself (on their
 * velvet tray, each one labelled), his crayon list of the Grand
 * Stenchmaster's noble duties, the anonymous notes pinned up near his
 * station, the Stench Log page he drooled on, and the captain's emergency
 * labour rule nailed to the mast.
 */
const INK = PAL.ink;
const PAPER = '#f7efdc';
const PAPER_D = '#eadfc4';
const CRAYON = { yellow: '#f2c81e', blue: '#2f64d0', red: '#d8322a', green: '#3a9a3a', purple: '#8a48b8', brown: '#8a5426' };

function sheet(w, h, col = PAPER) {
  const c = new PixelCanvas(w, h);
  c.rect(1, 1, w - 2, h - 2, col);
  for (let i = 0; i < (w * h) / 80; i++) {
    const x = 2 + Math.floor(((i * 37) % 97) / 97 * (w - 4));
    const y = 2 + Math.floor(((i * 53) % 89) / 89 * (h - 4));
    c.set(x, y, PAPER_D);
  }
  return c;
}

/** The velvet medal tray: five medals, one of them a bottle cap. */
function medals() {
  const W = 292;
  const c = new PixelCanvas(W, 128);
  c.rect(0, 0, W, 128, '#3a1420');
  c.rect(4, 4, W - 8, 120, '#5a1c2c');
  for (let y = 6; y < 122; y += 3) c.hline(6, W - 7, y, '#621f30');
  drawText(c, 'MEDALS OF THE GRAND STENCHMASTER', W / 2, 8, '#f0cc48', { center: true });
  drawText(c, '(AWARDED BY THE GRAND STENCHMASTER)', W / 2, 19, '#c8a030', { center: true });
  const list = [
    ['#3a6ad0', '#f0cc48', ['SURVIVED', 'FIRST', 'RELEASE']],
    ['#d03a2a', '#d8d8e0', ['FOUNDED', 'FROG', 'GROG']],
    ['#5a8a2a', '#c87a2a', ['FIRST', 'SHARK', 'DIVERSION']],
    ['#8a4ac8', '#e8e0d0', ['FOUNDED', 'STENCH', 'FORECASTS']],
    [null, null, ['A VERY', 'DIFFICULT', 'NAP']],
  ];
  list.forEach(([ribbon, disc, label], i) => {
    const cx = 32 + i * 57;
    if (ribbon) {
      c.rect(cx - 5, 32, 10, 14, ribbon);
      c.vline(cx - 1, 32, 45, '#ffffff40');
      c.ellipse(cx, 54, 9, 9, disc);
      c.ellipse(cx - 2, 52, 4, 4, '#ffffff50');
      c.ellipseOutline(cx, 54, 9, 9, INK);
    } else {
      // the bottle cap, crimped, on a bit of string
      c.line(cx, 32, cx, 44, '#c8b890');
      for (let a = 0; a < 20; a++) {
        const t = (a / 20) * Math.PI * 2;
        const r = a % 2 ? 9 : 7;
        c.line(cx, 54, Math.round(cx + Math.cos(t) * r), Math.round(54 + Math.sin(t) * r), '#c83a30');
      }
      c.ellipse(cx, 54, 6, 6, '#e8e0d0');
      c.ellipse(cx, 54, 3, 2, '#7aa02c');
    }
    label.forEach((t, k) => drawText(c, t, cx, 72 + k * 10, '#f4e8c8', { center: true }));
  });
  drawText(c, 'ALL EARNED.', W / 2, 108, '#c8a030', { center: true });
  c.strokeRect(0, 0, W, 128, INK);
  return c;
}

/** His list of noble duties, in crayon, on the galley tray he uses as a clipboard. */
function duties() {
  const c = new PixelCanvas(220, 150);
  c.rect(0, 0, 220, 150, '#8a8a96');
  c.rect(3, 3, 214, 144, '#a8a8b4');
  const p = sheet(196, 132);
  c.blit(p, 12, 10);
  drawText(c, 'NOBLE DUTIES OF THE', 110, 16, CRAYON.purple, { center: true });
  drawText(c, 'GRAND STENCHMASTER', 110, 26, CRAYON.purple, { center: true });
  const lines = [
    [CRAYON.red, '1. SEAT READINESS'],
    [CRAYON.green, '2. FROG GROG (QUALITY)'],
    [CRAYON.brown, '3. STRATEGIC RELEASES'],
    [CRAYON.blue, '4. EXECUTIVE READINESS'],
    [CRAYON.purple, '5. S.E.S. MONITORING'],
    [CRAYON.red, '6. FORECASTS (SOMETIMES)'],
    [CRAYON.green, '7. CEREMONY'],
    [CRAYON.blue, '8. REST (BETWEEN)'],
  ];
  lines.forEach(([col, t], i) => drawText(c, t, 26, 42 + i * 11, col));
  // a crossed-out line at the bottom
  drawText(c, '9. LIFTING THINGS', 26, 130, '#9a9aa6');
  c.thickLine(24, 133, 120, 132, 2, CRAYON.red);
  c.strokeRect(0, 0, 220, 150, INK);
  return c;
}

/** The anonymous notes. Nobody wrote them. Everybody wrote them. */
function notes() {
  const c = new PixelCanvas(220, 130);
  c.rect(0, 0, 220, 130, '#6a4a2a');
  for (let x = 0; x < 220; x += 9) c.vline(x, 0, 129, '#5a3a1c');
  const list = [
    [8, 8, 92, 34, 'GET A HAMMER', CRAYON.red],
    [110, 6, 100, 30, 'SEAT WARMER', CRAYON.blue],
    [14, 50, 96, 30, 'NICE COSTUME', CRAYON.green],
    [118, 44, 92, 34, 'THE SHARKS', CRAYON.brown, 'SAY HELLO'],
    [24, 90, 104, 30, 'WE KNOW IT', CRAYON.purple, "WAS YOU"],
    [140, 88, 70, 30, 'NO.', CRAYON.red],
  ];
  list.forEach(([x, y, w, h, t, col, t2]) => {
    c.blit(sheet(w, h, '#f4ecd8'), x, y);
    drawText(c, t, x + w / 2, y + 7, col, { center: true });
    if (t2) drawText(c, t2, x + w / 2, y + 17, col, { center: true });
    c.ellipse(x + w / 2, y + 2, 1.5, 1.5, '#9a9aa6');
  });
  c.strokeRect(0, 0, 220, 130, INK);
  return c;
}

/** The Stench Log, open at today's page, with a large damp patch. */
function logDrool() {
  const c = new PixelCanvas(220, 130);
  c.rect(0, 0, 220, 130, '#3a2414');
  c.blit(sheet(102, 120), 6, 5);
  c.blit(sheet(102, 120), 112, 5);
  c.vline(110, 4, 126, '#2a1a0e');
  drawText(c, 'STENCH LOG', 57, 12, INK, { center: true });
  for (let i = 0; i < 7; i++) c.hline(14, 98, 28 + i * 12, '#c8bca0');
  drawText(c, 'MORNING:', 14, 30, INK);
  drawText(c, 'MONITORED', 14, 42, INK);
  drawText(c, 'READINESS.', 14, 54, INK);
  // the damp patch, spreading over the right-hand page
  c.ellipse(160, 62, 34, 26, '#dfe6d8');
  c.ellipse(156, 58, 22, 16, '#d0dcc8');
  c.ellipse(150, 52, 8, 5, '#e8f0e0');
  drawText(c, 'ADMINISTRATIVE', 162, 98, '#8a7a5a', { center: true });
  drawText(c, 'MOISTURE', 162, 108, '#8a7a5a', { center: true });
  c.strokeRect(0, 0, 220, 130, INK);
  return c;
}

/** The captain's rule, nailed to the mainmast. */
function emergencyRule() {
  const c = sheet(216, 140, '#efe4c4');
  drawText(c, 'BY ORDER OF THE CAPTAIN', 108, 8, PAL.red2, { center: true });
  const body = [
    'IN ANY GENUINE SHIP EMERGENCY',
    '(SHARKS, THE CENTER, FIRE,',
    'SINKING, ALL OF THE ABOVE)',
    'THE GRAND STENCHMASTER WILL',
    'DO AT LEAST ONE USEFUL THING.',
    '',
    '"LEADERSHIP" IS NOT A',
    'USEFUL THING.',
  ];
  body.forEach((t, i) => drawText(c, t, 108, 26 + i * 11, INK, { center: true }));
  drawText(c, 'CPT. STINKBEARD', 150, 120, '#3a3a48', { center: true });
  c.line(110, 129, 190, 128, '#3a3a48');
  for (const [nx, ny] of [[6, 6], [208, 6], [6, 132], [208, 132]]) c.rect(nx, ny, 3, 3, '#6a6a78');
  c.strokeRect(0, 0, 216, 140, INK);
  return c;
}

export function addPhase5Inserts(atlas) {
  atlas.add('stenchmaster_medals', medals());
  atlas.add('noble_duties', duties());
  atlas.add('insult_notes', notes());
  atlas.add('log_drool', logDrool());
  atlas.add('emergency_rule', emergencyRule());
}

export const PHASE5_INSERT_NAMES = ['stenchmaster_medals', 'noble_duties', 'insult_notes', 'log_drool', 'emergency_rule'];
