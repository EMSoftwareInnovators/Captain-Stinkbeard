import { canvas, groundShadow, WOOD, LWOOD, IRON, INK } from './propKit.js';
import { drawText } from '../font/drawText.js';
import { miniScreen } from './phase5Props.js';
import { sesWrecked as sesWreckedProp } from './phase6Props.js';
import { PHASE6_SCREEN_PAINTERS } from '../vista/vistaPhase6.js';
import { PHASE7_SCREEN_PAINTERS } from '../vista/vistaPhase7.js';
import { staticFrame } from '../vista/sesArt.js';

/**
 * Props for Story Phase 7 (the Great Sharkstorm returns; the Song of the
 * Grand Stenchmaster):
 *
 *   - the original S.E.S. on deck, stripped for parts after the second shark
 *     (no glass, no tubes, no knobs; PARTS chalked on it);
 *   - the S.E.S. Mark II in the hold: a turnip crate with a salvaged tube, two
 *     mismatched tubes in tin cups, a horseshoe on top, a fork and a spoon:
 *     half-built, off, full of snow, and showing The Frog Tax Man (with a
 *     green-and-orange glow of its own);
 *   - the storm lantern by the cabin door (and where it ends up), the lucky
 *     horseshoe over the door (and the two nails left behind), the
 *     binnacle's empty socket with Garrick's note, the Grand Sharkmaster
 *     notice;
 *   - what everyone brought below: Pete's emergency supplies, Jim's food
 *     crate, Gristle's charts, a tray of small mugs of Frog Grog.
 */

const CRATE = { gap: '#24180e', d: '#9a7442', m: '#d0ae72', l: '#e6c88e' };
const PAPER = '#f0e6c8';

/** The original set, stripped: the wrecked set with its glass, tubes and knobs gone. */
function sesScrapped() {
  const c = sesWreckedProp();
  c.rect(4, 11, 12, 8, '#0a0808');
  c.set(5, 12, '#c8d8d8');
  for (const [x, y] of [[19, 12], [19, 16]]) c.set(x, y, '#1a1010');
  for (let x = 6; x < 17; x++) for (let y = 0; y < 6; y++) if (c.alphaAt(x, y)) c.set(x, y, 'transparent');
  c.line(8, 22, 14, 27, '#e8e0c8'); // chalked: PARTS (an X will do)
  c.line(14, 22, 8, 27, '#e8e0c8');
  c.outline(INK);
  return c;
}

/** Mark II, small: a crate with a tube in it. `screen` is a picture (or null for dark). */
function mk2Small(screen, { stage = 2, lit = false } = {}) {
  const c = canvas(26, 30);
  groundShadow(c, 13, 28, 12, 2);
  // the crate, slatted
  for (let y = 10; y < 28; y++) {
    const k = (y - 10) % 6;
    for (let x = 2; x < 24; x++) c.set(x, y, k === 5 ? CRATE.gap : k === 0 ? CRATE.l : CRATE.m);
  }
  c.vline(2, 10, 27, CRATE.d);
  c.vline(23, 10, 27, CRATE.d);
  // the tube in its rope ring
  c.rect(5, 12, 16, 12, '#cca660');
  c.rect(6, 13, 14, 10, '#1a2826');
  if (screen) c.blit(screen, 7, 14);
  c.set(7, 14, '#ffffff40');
  if (stage >= 1) {
    // tubes in tin cups, the horseshoe
    for (const [tx, glow] of [[6, '#ffb040'], [9, '#5aa8ff']]) {
      c.rect(tx, 5, 2, 4, '#c8e8e8a0');
      if (lit) c.vline(tx, 6, 8, glow);
      c.rect(tx - 1, 8, 4, 2, IRON.l);
    }
    c.ellipse(15, 6, 3, 3, IRON.m);
    c.ellipse(15, 6, 1.5, 1.5, 'transparent');
    c.rect(13, 3, 5, 3, 'transparent');
    c.rect(14, 8, 3, 2, '#c8b088');
    c.line(20, 9, 22, 3, IRON.h); // the fork
  }
  if (stage >= 2) {
    c.set(21, 18, '#2a2a34'); // the knob on its string
    c.set(21, 17, '#e8e0c8');
    c.set(4, 25, '#9ae060');
  }
  c.outline(INK);
  return c;
}

const small = (src) => miniScreen(src, 12, 8);

function mk2Building() {
  return mk2Small(null, { stage: 1 });
}

function mk2Off() {
  return mk2Small(null, { stage: 2 });
}

function mk2Static() {
  return { frames: [0, 1, 2].map((f) => mk2Small(small(staticFrame(707 + f * 13)), { stage: 2, lit: true })), ms: 90 };
}

function mk2Ftm() {
  const pics = [
    PHASE7_SCREEN_PAINTERS.ftm2(0), PHASE7_SCREEN_PAINTERS.ftm2(1), PHASE6_SCREEN_PAINTERS.ftm(1), PHASE7_SCREEN_PAINTERS.ftm2(2),
    PHASE6_SCREEN_PAINTERS.ftm(3), PHASE7_SCREEN_PAINTERS.ftm2(3),
  ];
  return { frames: pics.map((p) => mk2Small(small(p), { stage: 2, lit: true })), ms: 700 };
}

/** A storm lantern on a hook by the cabin door, on a wire that "isn't doing anything". */
function stormLantern() {
  const c = canvas(10, 20);
  c.vline(5, 0, 5, IRON.l);
  c.line(5, 0, 9, 2, '#c87a3a'); // the wire
  c.rect(2, 6, 7, 10, '#c8a040');
  c.rect(3, 7, 5, 8, '#ffe08a');
  c.hline(1, 9, 6, '#4a3a20');
  c.hline(1, 9, 16, '#4a3a20');
  c.outline(INK);
  return { frames: [c, (() => { const d = c.clone(); d.rect(3, 7, 5, 8, '#fff4c0'); d.outline(INK); return d; })()], ms: 300 };
}

/** The same lantern on the deck, on its side, out. */
function lanternFallen() {
  const c = canvas(16, 10);
  c.rect(2, 3, 11, 6, '#a88a3a');
  c.rect(3, 4, 9, 4, '#4a4030');
  c.vline(1, 2, 8, '#4a3a20');
  c.vline(13, 2, 8, '#4a3a20');
  c.line(13, 5, 15, 3, '#c87a3a');
  for (const [x, y] of [[5, 9], [9, 9], [11, 8]]) c.set(x, y, '#c8d8e8'); // glass
  c.outline(INK);
  return c;
}

/** The lucky horseshoe, nailed over the cabin door (open end up). */
function horseshoeNailed() {
  const c = canvas(12, 12);
  c.ellipse(6, 6, 5, 5, IRON.m);
  c.ellipse(6, 6, 3, 3, 'transparent');
  c.rect(3, 0, 7, 5, 'transparent');
  c.rect(1, 2, 2, 4, IRON.m);
  c.rect(9, 2, 2, 4, IRON.m);
  c.set(2, 7, IRON.h);
  c.set(6, 10, IRON.d);
  c.outline(INK);
  return c;
}

/** Two nails and a clean horseshoe-shaped patch where it used to be. */
function horseshoeGone() {
  const c = canvas(12, 12);
  for (let a = 0; a <= Math.PI; a += 0.15) c.set(Math.round(6 + Math.cos(a) * 4), Math.round(6 + Math.sin(a) * 4), '#b89a6a');
  c.set(2, 6, IRON.l);
  c.set(10, 6, IRON.l);
  return c;
}

/** The binnacle's socket, empty, with a note in green crayon stuck in it. */
function compassGone() {
  const c = canvas(12, 12);
  c.ellipse(6, 6, 4, 3, '#1a1410');
  c.ellipseOutline(6, 6, 5, 4, '#c8a030');
  c.rect(5, 1, 7, 6, PAPER);
  c.hline(6, 10, 3, '#3a9a3a');
  c.hline(6, 9, 5, '#3a9a3a');
  c.outline(INK);
  return c;
}

/** Garrick's notice: SITUATIONS VACANT, GRAND SHARKMASTER; the captain's ink across it. */
function sharkmasterNotice() {
  const c = canvas(12, 14);
  c.rect(1, 1, 10, 12, PAPER);
  for (const y of [3, 5, 7]) c.hline(2, 9, y, '#3a9a3a');
  c.line(1, 2, 10, 11, '#1a1a28');
  c.line(10, 2, 1, 11, '#1a1a28');
  c.set(6, 0, IRON.l);
  c.outline(INK);
  return c;
}

/** Pete's emergency supplies: a lumpy sack, a lantern, a coil of line, a tin of biscuit. */
function supplySack() {
  const c = canvas(18, 16);
  groundShadow(c, 9, 14, 8, 2);
  c.ellipse(8, 9, 7, 6, '#b8a070');
  c.ellipse(7, 7, 5, 4, '#d0bc8a');
  c.rect(6, 1, 4, 3, '#a89060');
  c.rect(13, 8, 4, 6, '#9a9aa8');
  c.hline(13, 16, 8, '#c8c8d8');
  drawText(c, '!', 8, 6, '#c83a30', { center: true });
  c.outline(INK);
  return c;
}

/** Salty Jim's food crate: bread, a ham, onions he will not let anyone near. */
function foodCrate() {
  const c = canvas(18, 16);
  groundShadow(c, 9, 14, 8, 2);
  c.rect(2, 6, 14, 8, WOOD.m);
  c.hline(2, 15, 6, WOOD.l);
  c.hline(2, 15, 10, WOOD.d);
  c.ellipse(6, 5, 3, 2, '#d8a858'); // bread
  c.ellipse(12, 4, 3, 3, '#c86a5a'); // ham
  c.set(13, 2, '#f0e8d8');
  drawText(c, 'JIM', 9, 8, '#3a2a18', { center: true });
  c.outline(INK);
  return c;
}

/** Gristle's charts, rolled, in a bundle under his arm and now on a barrel head. */
function chartRolls() {
  const c = canvas(16, 12);
  groundShadow(c, 8, 10, 7, 2);
  for (const [y, col] of [[3, '#f0e6c8'], [5, '#e6d8b0'], [7, '#f4ecd4']]) {
    c.rect(1, y, 14, 3, col);
    c.ellipse(1, y + 1, 1, 1, '#c8b890');
  }
  c.line(4, 2, 12, 10, '#a83a2a');
  c.outline(INK);
  return c;
}

/** A tray of small pewter mugs of Frog Grog, for the toast. */
function grogMugs() {
  const c = canvas(16, 10);
  c.rect(1, 6, 14, 3, LWOOD.m);
  for (const x of [2, 6, 10]) {
    c.rect(x, 2, 3, 4, '#8a8a9a');
    c.hline(x, x + 2, 2, '#8ab030');
  }
  c.outline(INK);
  return c;
}

export const PHASE7_PROPS = {
  ses_tv_scrapped: sesScrapped,
  ses2_building: mk2Building,
  ses2_off: mk2Off,
  ses2_static: mk2Static,
  ses2_ftm: mk2Ftm,
  storm_lantern: stormLantern,
  lantern_fallen: lanternFallen,
  horseshoe_nailed: horseshoeNailed,
  horseshoe_gone: horseshoeGone,
  compass_gone: compassGone,
  sharkmaster_notice: sharkmasterNotice,
  supply_sack: supplySack,
  food_crate: foodCrate,
  chart_rolls: chartRolls,
  grog_mugs: grogMugs,
};
