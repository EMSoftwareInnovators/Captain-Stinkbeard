import { PixelCanvas } from '../PixelCanvas.js';
import { ShelfAtlas } from '../atlas.js';
import { PAL } from '../palette.js';
import { drawText } from '../font/drawText.js';
import { addForecastInserts, FORECAST_INSERT_NAMES } from './forecastArt.js';
import { addPhase5Inserts, PHASE5_INSERT_NAMES } from './phase5Inserts.js';
import { addPhase6Inserts, PHASE6_INSERT_NAMES } from './phase6Inserts.js';
import { addPhase7Inserts, PHASE7_INSERT_NAMES } from './phase7Inserts.js';
import { addPhase8Inserts, PHASE8_INSERT_NAMES } from './phase8Inserts.js';
import { addPhase9Inserts, PHASE9_INSERT_NAMES } from './phase9Inserts.js';
import { addPhase10Inserts, PHASE10_INSERT_NAMES } from './phase10Inserts.js';

/**
 * Close-up "inserts" shown full-size in a frame (CinemaScene.insert): a
 * warning label, a painted sign, a signed document. The lettering uses the
 * game's own pixel font so it is always legible.
 */
const INK = PAL.ink;

function parchment(w, h, seed = 3) {
  const c = new PixelCanvas(w, h);
  c.rect(0, 0, w, h, PAL.cloth4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if ((x * 13 + y * 7 + seed) % 29 === 0) c.set(x, y, PAL.cloth3);
    if (x < 2 || y < 2 || x > w - 3 || y > h - 3) c.set(x, y, PAL.cloth2);
  }
  return c;
}

/** The jar that must not be opened below deck. */
function eelJarLabel() {
  const c = new PixelCanvas(170, 124);
  // jar body: murky green glass, a cork, the label
  c.rect(20, 18, 130, 104, '#3e5a2a');
  c.rect(24, 22, 122, 96, '#5a7a3a');
  for (let y = 26; y < 116; y += 6) c.hline(26, 30, y, '#7a9a48');
  // something long and dark coiled inside
  for (let a = 0; a < 12; a += 0.05) {
    const x = Math.round(85 + Math.cos(a) * (10 + a * 3.2));
    const y = Math.round(96 + Math.sin(a) * (4 + a));
    if (y > 24 && y < 116) c.set(x, y, '#2a3a1a');
  }
  c.rect(42, 4, 86, 16, PAL.cloth1);
  c.rect(46, 6, 78, 10, PAL.cloth2);
  c.hline(42, 127, 19, PAL.cloth0);
  // the label
  c.rect(30, 34, 110, 56, PAL.cloth4);
  c.rect(30, 34, 110, 3, PAL.red3);
  c.rect(30, 87, 110, 3, PAL.red3);
  drawText(c, 'FERMENTED', 85, 42, INK, { center: true, scale: 1 });
  drawText(c, 'EEL PASTE', 85, 53, INK, { center: true, scale: 1 });
  c.hline(40, 130, 64, PAL.cloth1);
  drawText(c, 'DO NOT OPEN', 85, 68, PAL.red2, { center: true });
  drawText(c, 'BELOW DECK', 85, 78, PAL.red2, { center: true });
  // a skull and crossbones, for emphasis
  c.ellipse(133, 48, 4, 4, INK);
  c.set(131, 47, PAL.cloth4); c.set(134, 47, PAL.cloth4);
  c.line(128, 55, 138, 59, INK); c.line(138, 55, 128, 59, INK);
  c.outline(INK);
  return c;
}

/** Garrick's toll-deck sign, painted in haste on a cupboard door. */
function tollSignClose() {
  const c = new PixelCanvas(200, 116);
  c.poly([[4, 6], [196, 2], [194, 112], [8, 114]], PAL.deck4);
  for (let y = 10; y < 110; y += 12) c.line(8, y, 192, y - 3, PAL.deck3);
  c.rect(90, 20, 20, 3, PAL.deck3);
  const line = (t, y, col, j) => drawText(c, t, 100, y, col, { center: true, jitter: j, seed: y });
  line("GARRICK'S TOLL DECK", 12, PAL.red2, 1);
  line('CROSSING FEE REQUIRED', 34, INK, 1);
  line('PREMIUM RATES FOR', 52, INK, 1);
  line('LOITERING', 64, INK, 1);
  line('BURPING SURCHARGE', 84, PAL.red2, 1);
  line('APPLIES', 96, PAL.red2, 1);
  c.outline(INK);
  return c;
}

/** The terms of Garrick's probation, signed by both parties. */
function probationRules() {
  const c = parchment(226, 136, 5);
  drawText(c, 'TERMS OF PROBATION', 113, 8, PAL.red2, { center: true });
  drawText(c, 'G. GRUMBLEGUT, PIRATE (PROVISIONAL)', 113, 20, INK, { center: true });
  c.hline(14, 212, 31, PAL.cloth1);
  drawText(c, '1. NO MORE FERMENTED EEL PASTE.', 12, 38, INK);
  drawText(c, '2. NO ENTERING THE TREASURE ROOM', 12, 54, INK);
  drawText(c, '    AFTER MEALS.', 12, 64, INK);
  drawText(c, '3. ANY UNUSUAL STOMACH NOISE:', 12, 80, INK);
  drawText(c, '    ROWBOAT. HALF A MILE OFF.', 12, 90, INK);
  // signatures: the captain's bold X, Garrick's enormous flourish
  c.line(30, 110, 42, 122, INK); c.line(42, 110, 30, 122, INK);
  c.line(31, 110, 43, 122, INK);
  for (let x = 120; x < 210; x++) c.set(x, Math.round(116 + Math.sin(x * 0.25) * 5), PAL.navy2);
  c.line(118, 108, 126, 124, PAL.navy2);
  c.ellipse(200, 110, 6, 6, PAL.red3);
  c.outline(INK);
  return c;
}

/** Quill's charge sheet for the trial. */
function chargeSheet() {
  const c = parchment(216, 110, 9);
  drawText(c, 'THE SHIP V. G. GRUMBLEGUT', 108, 8, PAL.red2, { center: true });
  c.hline(14, 202, 19, PAL.cloth1);
  drawText(c, 'I.   RUINING THE TREASURE', 12, 26, INK);
  drawText(c, 'II.  POISONING THE AIR', 12, 40, INK);
  drawText(c, 'III. DAMAGING THE SHIP', 12, 54, INK);
  drawText(c, 'IV.  NEARLY FUMIGATING', 12, 68, INK);
  drawText(c, '     CAPTAIN SQUAWKS', 12, 78, INK);
  drawText(c, 'J. QUILL, CLERK', 150, 94, PAL.navy2, { center: true });
  c.outline(INK);
  return c;
}

/** Garrick's amendment to the ship's records, nailed to the mainmast. */
function amendmentNotice() {
  const c = parchment(220, 126, 11);
  drawText(c, "SHIP'S RECORDS", 110, 8, PAL.red2, { center: true });
  drawText(c, 'AMENDMENT NO. 1', 110, 19, INK, { center: true });
  c.hline(14, 206, 30, PAL.cloth1);
  drawText(c, 'VESSEL:  QUEEN ANNE\'S REVENGE', 12, 36, INK);
  const bx = drawText(c, 'CAPTAIN: ', 12, 60, INK);
  const ex = drawText(c, 'BLACK', bx, 60, INK);
  drawText(c, 'BEARD', ex + 1, 60, INK);
  // "BLACK" struck through, "STINK" written above it in a large, happy hand
  c.hline(bx - 1, ex, 63, PAL.red2);
  c.hline(bx - 1, ex, 64, PAL.red2);
  drawText(c, 'STINK', bx, 48, PAL.red2, { jitter: 1 });
  c.line(ex + 1, 56, ex + 3, 59, PAL.red2);
  drawText(c, 'BY ORDER OF THE', 110, 80, INK, { center: true });
  drawText(c, 'GRAND STENCHMASTER', 110, 92, PAL.navy2, { center: true });
  drawText(c, 'OF THE SEVEN SEAS', 110, 102, PAL.navy2, { center: true });
  // the Stenchmaster's seal: a nose inside a crown, in green wax
  c.ellipse(190, 110, 9, 8, '#5a7a2a');
  c.ellipse(189, 109, 6, 5, '#7a9a38');
  c.line(188, 106, 190, 112, '#2c3a14');
  c.outline(INK);
  return c;
}

/** Garrick's list of proposed new names for the ship, all struck out. */
function shipNames() {
  const c = parchment(206, 118, 13);
  drawText(c, 'PROPOSED NAMES', 103, 8, PAL.red2, { center: true });
  drawText(c, '(FOR THE REBRAND)', 103, 19, INK, { center: true });
  c.hline(14, 192, 30, PAL.cloth1);
  const names = ['THE STINKSHIP', 'THE GREAT GASSY GALLEON', 'THE FRAGRANT FORTUNE', 'THE FROG GROG FRIGATE', "THE QUEEN ANNE'S RELAPSE"];
  names.forEach((n, i) => {
    const y = 38 + i * 14;
    const end = drawText(c, n, 14, y, INK);
    // each one struck out, harder each time
    c.line(10, y + 4, end + 3, y + 3 - (i % 2), PAL.red2);
    if (i > 1) c.line(10, y + 5, end + 3, y + 4, PAL.red2);
  });
  c.outline(INK);
  return c;
}

export function buildInsertAtlas() {
  // 1024 wide since Story Phase 10: at 512 the stack grew past 4096 tall.
  const atlas = new ShelfAtlas(1024, 2);
  atlas.add('eel_jar_label', eelJarLabel());
  atlas.add('toll_sign_close', tollSignClose());
  atlas.add('probation_rules', probationRules());
  atlas.add('charge_sheet', chargeSheet());
  atlas.add('amendment_notice', amendmentNotice());
  atlas.add('ship_names', shipNames());
  addForecastInserts(atlas);
  addPhase5Inserts(atlas);
  addPhase6Inserts(atlas);
  addPhase7Inserts(atlas);
  addPhase8Inserts(atlas);
  addPhase9Inserts(atlas);
  addPhase10Inserts(atlas);
  return atlas.build();
}

export const INSERT_NAMES = ['eel_jar_label', 'toll_sign_close', 'probation_rules', 'charge_sheet', 'amendment_notice', 'ship_names', ...FORECAST_INSERT_NAMES, ...PHASE5_INSERT_NAMES, ...PHASE6_INSERT_NAMES, ...PHASE7_INSERT_NAMES, ...PHASE8_INSERT_NAMES, ...PHASE9_INSERT_NAMES, ...PHASE10_INSERT_NAMES];
