import { canvas, groundShadow, box, cylinder, WOOD, LWOOD, IRON, GOLD, INK } from './propKit.js';

/**
 * Props for Story Phase 16 (THE GRAND LIGHTER):
 *   - the deck: the cargo grating, opened up (the ladder down into the old sail locker);
 *   - the Stenchmaster Fart Zone (the old sail locker): the junk that was in it (old sails, a spar, a coil of cable), the
 *     warning signs and the posted rules, the portholes (shut, open), the observation bench behind its rope, the queue
 *     rope, the chalk release circle, the door's dents;
 *   - the old quarters: Brogath's loose sash canopy, THE GRAND DISPENSARY's counter, the Grand Bank's counter again
 *     (Bankworth's), THE GRAND CURRENCY CONVERTER (purple, fake gold trim, three slots, a brass horn), the GRAND
 *     SASHBACK terminal, the speaking tube, the Sash Lounge's sign and bunting;
 *   - the hold: the bunker's sandbags; the Fart-Free Zone: its new sign, the portable set (purple, crooked, a fork).
 * Calm frames only.
 */
const PURPLE = { d: '#3a1e52', m: '#5a3278', b: '#74449a', l: '#9468b8', h: '#b48ad4' };
const SAIL = { d: '#9a9078', m: '#c8bc9c', l: '#e4dcc0' };
const SASH = { d: '#8a141c', m: '#c8242c', l: '#e8545a' };
const PAPER = '#f4ecd8';
const RED = '#a8241c';

// --- the deck ----------------------------------------------------------------------------------------------------------
/** The cargo grating, lifted off and propped: a dark square going down, a ladder's top rungs. 2x1. */
function hatchOpen() {
  const c = canvas(32, 16);
  c.rect(2, 1, 28, 14, '#0e0a08');
  c.rect(4, 3, 24, 10, '#1a120c');
  for (const y of [4, 8, 12]) c.hline(10, 21, y, LWOOD.m); // rungs
  c.vline(9, 3, 13, LWOOD.d); c.vline(22, 3, 13, LWOOD.d);
  c.strokeRect(1, 0, 30, 16, LWOOD.h);
  c.outline(INK);
  return c;
}

// --- the Fart Zone ------------------------------------------------------------------------------------------------------
function oldSails() {
  const c = canvas(32, 18);
  groundShadow(c, 16, 15, 14, 2);
  c.ellipse(12, 10, 11, 6, SAIL.m); c.ellipse(22, 11, 9, 5, SAIL.d); c.ellipse(10, 8, 6, 3, SAIL.l);
  c.line(4, 12, 26, 9, SAIL.d);
  c.outline(INK);
  return c;
}
function spar() {
  const c = canvas(32, 14);
  groundShadow(c, 16, 11, 14, 2);
  c.thickLine(2, 9, 30, 6, 3, WOOD.m); c.line(2, 8, 30, 5, WOOD.l);
  c.rect(14, 5, 3, 5, IRON.m);
  c.outline(INK);
  return c;
}
function cableCoil() {
  const c = canvas(16, 14);
  groundShadow(c, 8, 11, 7, 2);
  for (let r = 6; r > 1; r -= 2) c.ellipseOutline(8, 8, r, r * 0.55, r % 4 ? '#6a6a5a' : '#8a8a72');
  c.outline(INK);
  return c;
}
function fzSign() {
  const c = canvas(16, 20);
  c.rect(1, 4, 14, 12, '#e8c830'); c.strokeRect(1, 4, 14, 12, '#2a2a2a');
  for (let k = 0; k < 4; k++) c.line(2 + k * 4, 15, 5 + k * 4, 5, '#2a2a2a'); // hazard stripes
  c.rect(4, 7, 8, 5, PAPER); c.ellipse(8, 9, 2, 1.5, '#8a7a4a');
  c.outline(INK);
  return c;
}
function fzRulesBoard() {
  const c = canvas(16, 22);
  c.rect(1, 3, 14, 16, WOOD.m); c.rect(2, 4, 12, 14, PAPER);
  c.hline(3, 12, 5, RED);
  for (let i = 0; i < 6; i++) c.hline(3, 12 - (i % 3), 8 + i * 2, '#3a2a1a');
  c.outline(INK);
  return c;
}
function porthole(open) {
  const c = canvas(16, 16);
  c.ellipse(8, 8, 6, 6, IRON.l); c.ellipse(8, 8, 4, 4, open ? '#8ac8e8' : '#3a4a5a');
  if (open) { c.ellipse(13, 6, 3, 4, IRON.m); c.set(7, 6, '#ffffff'); } else c.line(5, 5, 11, 11, '#6a7a8a');
  c.outline(INK);
  return c;
}
function fzBench() {
  const c = canvas(32, 16);
  groundShadow(c, 16, 14, 14, 2);
  box(c, 2, 5, 28, 3, 5, WOOD, { planks: 0 });
  c.vline(5, 11, 14, WOOD.d); c.vline(26, 11, 14, WOOD.d);
  c.outline(INK);
  return c;
}
function ropePost() {
  const c = canvas(16, 24);
  groundShadow(c, 8, 22, 4, 1);
  cylinder(c, 8, 8, 21, 2, IRON);
  c.ellipse(8, 8, 3, 2, GOLD.l);
  c.line(8, 10, 15, 13, SASH.m); c.line(0, 13, 8, 10, SASH.m); // the rope, either side
  c.outline(INK);
  return c;
}
function queueRope() {
  const c = canvas(32, 20);
  for (const x of [3, 28]) { cylinder(c, x, 6, 17, 2, IRON); c.ellipse(x, 6, 3, 2, GOLD.l); }
  for (let x = 4; x < 28; x++) c.set(x, 8 + Math.round(Math.sin(((x - 4) / 24) * Math.PI) * 3), SASH.m);
  c.outline(INK);
  return c;
}
function releaseMark() {
  const c = canvas(48, 32);
  for (let a = 0; a < 48; a++) if (a % 4) c.set(Math.round(24 + 20 * Math.cos((a / 48) * Math.PI * 2)), Math.round(16 + 12 * Math.sin((a / 48) * Math.PI * 2)), '#f0ead4');
  for (let i = 0; i < 6; i++) { c.set(21 + i, 13 + i % 2, '#e8e0c8'); }
  c.rect(16, 15, 16, 2, '#00000018');
  return c;
}
function doorDents() {
  const c = canvas(32, 16);
  for (const [x, y] of [[6, 6], [14, 9], [24, 5]]) { c.ellipse(x, y, 3, 2, '#2a1a10'); c.set(x - 1, y - 1, WOOD.l); }
  return c;
}

// --- the old quarters ----------------------------------------------------------------------------------------------------
/** Brogath's canopy: clean sashes, LOOSE, on four poles over his Grand Pad. Not sealed. 3x1, rising. */
function fumeCanopy() {
  const frames = [0, 1].map((f) => {
    const c = canvas(48, 40);
    for (const x of [2, 45]) c.vline(x, 8, 38, LWOOD.d);
    c.rect(1, 6, 46, 4, SASH.m);
    for (let x = 2; x < 46; x += 6) c.vline(x + f, 10, 15 + ((x / 6) % 2) * 3, SASH.l); // the loose ends
    c.hline(2, 45, 7, GOLD.l);
    c.outline(INK);
    return c;
  });
  return { frames, ms: 1600 };
}
function counter(kind) {
  return () => {
    const c = canvas(48, 40);
    groundShadow(c, 24, 38, 23, 2);
    box(c, 0, 20, 48, 4, 14, PURPLE, { planks: 4 });
    c.hline(1, 46, 21, GOLD.l);
    c.rect(4, 2, 40, 12, PURPLE.d); c.rect(5, 3, 38, 10, GOLD.m);
    if (kind === 'dispensary') { c.hline(8, 39, 6, PURPLE.d); c.hline(12, 35, 9, PURPLE.d); for (const x of [8, 20, 32]) { c.rect(x, 14, 6, 6, '#c8e0b0'); c.rect(x + 1, 13, 4, 1, IRON.l); } }
    if (kind === 'bank') { c.hline(8, 39, 6, PURPLE.d); c.hline(10, 37, 9, PURPLE.d); for (let x = 3; x < 46; x += 5) if (x < 19 || x > 28) c.vline(x, 14, 20, GOLD.l); }
    if (kind === 'bureau') { c.hline(8, 39, 6, RED); c.hline(10, 37, 9, PURPLE.d); c.rect(30, 14, 12, 6, PAPER); c.rect(32, 12, 8, 2, PAPER); }
    c.outline(INK);
    return c;
  };
}
/** THE GRAND CURRENCY CONVERTER: purple, fake gold trim, a coin display, three slots, a brass output horn. Tall. */
function converter() {
  const frames = [0, 1].map((f) => {
    const c = canvas(16, 36);
    groundShadow(c, 8, 34, 7, 2);
    c.rect(2, 8, 12, 26, PURPLE.m); c.vline(2, 8, 33, PURPLE.l); c.vline(13, 8, 33, PURPLE.d);
    c.strokeRect(2, 8, 12, 26, GOLD.m);
    c.rect(4, 11, 8, 5, '#1a2a1a'); c.hline(5, 10, 13, f ? '#8af090' : '#4aa050'); // the coin display
    for (const y of [19, 23, 27]) c.hline(5, 10, y, '#14101a'); // three slots
    c.ellipse(8, 5, 5, 3, GOLD.l); c.ellipse(8, 5, 3, 2, '#2a1a10'); c.vline(8, 6, 8, GOLD.d); // the horn
    c.outline(INK);
    return c;
  });
  return { frames, ms: 900 };
}
function creditTerminal() {
  const c = canvas(16, 28);
  groundShadow(c, 8, 26, 6, 1.5);
  c.vline(8, 14, 25, IRON.m);
  c.rect(2, 4, 12, 10, PURPLE.d); c.rect(3, 5, 10, 6, '#c8e0f0');
  c.rect(4, 12, 8, 2, GOLD.m); // APPLY NOW
  c.outline(INK);
  return c;
}
function speakingTube() {
  const c = canvas(16, 24);
  c.thickLine(8, 23, 8, 8, 2, GOLD.m);
  c.ellipse(8, 7, 4, 3, GOLD.l); c.ellipse(8, 7, 2, 1.5, '#2a1a10');
  c.outline(INK);
  return c;
}
function loungeSign() {
  const c = canvas(32, 18);
  c.rect(1, 3, 30, 11, SASH.m); c.strokeRect(1, 3, 30, 11, GOLD.l);
  c.hline(5, 26, 7, GOLD.l); c.hline(8, 23, 10, GOLD.l);
  c.outline(INK);
  return c;
}
function loungeBunting() {
  const c = canvas(48, 14);
  for (let x = 0; x < 48; x++) c.set(x, 3 + Math.round(Math.sin((x / 48) * Math.PI) * 3), '#3a2a1a');
  for (let k = 0; k < 6; k++) {
    const x = 3 + k * 8;
    const y = 4 + Math.round(Math.sin((x / 48) * Math.PI) * 3);
    c.poly([[x, y], [x + 6, y], [x + 3, y + 6]], k % 2 ? SASH.m : GOLD.l);
  }
  return c;
}

// --- the hold and the bunker -------------------------------------------------------------------------------------------------
function sandbags() {
  const c = canvas(16, 16);
  groundShadow(c, 8, 14, 7, 2);
  for (const [x, y] of [[4, 12], [11, 12], [7, 8]]) c.ellipse(x, y, 4, 2.5, '#b8a478');
  c.outline(INK);
  return c;
}
function bunkerSign() {
  const c = canvas(16, 20);
  c.rect(1, 4, 14, 11, '#3a5a3a'); c.strokeRect(1, 4, 14, 11, '#e8e0c0');
  c.hline(3, 12, 8, '#e8e0c0'); c.hline(4, 11, 11, '#e8e0c0');
  c.outline(INK);
  return c;
}
/** The portable set: a tiny crooked purple CRT, a fork for an aerial. On when the story says so. */
function portableTv(on) {
  const frames = [0, 1].map((f) => {
    const c = canvas(16, 22);
    groundShadow(c, 8, 20, 6, 1.5);
    c.rect(2, 8, 12, 11, PURPLE.m); c.strokeRect(2, 8, 12, 11, PURPLE.d);
    c.rect(4, 10, 7, 6, on ? (f ? '#a8e090' : '#88c870') : '#1a1a20');
    c.ellipse(12, 12, 1, 1, GOLD.l); c.ellipse(12, 16, 1, 1, '#c84a3a');
    c.vline(8, 2, 8, IRON.l); c.line(8, 2, 11, 1, IRON.l); c.set(7, 2, IRON.l); c.set(9, 2, IRON.l);
    c.outline(INK);
    return c;
  });
  return on ? { frames, ms: 500 } : frames[0];
}

export const PHASE16_PROPS = {
  fz_hatch_open: hatchOpen,
  fz_old_sails: oldSails,
  fz_spar: spar,
  fz_cable: cableCoil,
  fz_sign: fzSign,
  fz_rules_board: fzRulesBoard,
  fz_porthole_shut: () => porthole(false),
  fz_porthole_open: () => porthole(true),
  fz_bench: fzBench,
  fz_rope_post: ropePost,
  fz_queue_rope: queueRope,
  fz_release_mark: releaseMark,
  fz_door_dents: doorDents,
  fume_canopy: fumeCanopy,
  dispensary_counter: counter('dispensary'),
  grand_bank_counter: counter('bank'),
  bureau_counter: counter('bureau'),
  currency_converter: converter,
  credit_terminal: creditTerminal,
  speaking_tube: speakingTube,
  sash_lounge_sign: loungeSign,
  sash_lounge_bunting: loungeBunting,
  bunker_sandbags: sandbags,
  bunker_sign: bunkerSign,
  portable_tv: () => portableTv(false),
  portable_tv_on: () => portableTv(true),
};
