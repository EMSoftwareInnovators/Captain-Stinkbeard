import { canvas, box, groundShadow, WOOD, LWOOD, IRON, GOLD, INK, PAL } from './propKit.js';
import { PixelCanvas } from '../PixelCanvas.js';
import { SES_SCREEN_PAINTERS } from '../vista/sesArt.js';
import { PHASE4_PROPS } from './phase4Props.js';

/**
 * Props for Story Phase 5 (What Does the Grand Stenchmaster Actually Do?):
 * the Stenchmaster Entertainment System on deck (under its tarp, off, and on
 * each of its channels, with a tiny copy of the picture), the Grand
 * Stenchmaster's chair and his grog side table, the anonymous notes the crew
 * pin up near his station, a laundry line (before and after the Center),
 * fresh bread, and the starboard rail's new bites and patches.
 */

const BRASS = ['#5a4010', '#8a6418', '#c8a030', '#f0cc48'];
const SASHY = { m: '#c8982a', edge: '#5e1624', plush: '#74283a', plushD: '#521828', plushL: '#9a3a4a' };
const GROG = { d: '#3a4a1c', m: '#5a7a2a', l: '#a8c050', h: '#d0e070' };

/** A small copy of a channel picture (every few pixels of the close-up). */
export function miniScreen(src, w, h) {
  const c = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) c.set(x, y, src.get(Math.floor(((x + 0.5) * src.width) / w), Math.floor(((y + 0.5) * src.height) / h)));
  }
  return c;
}

/**
 * The set on deck: a junk-built crate TV on a barrel, tubes, a pan, a fork
 * aerial. Story Phase 6: tubes 'lit' / 'red' (dying) / 'dark'.
 */
export function sesTv(screen, { tubes = 'lit' } = {}) {
  const c = canvas(24, 34);
  groundShadow(c, 12, 32, 10, 2);
  // the barrel it stands on
  c.rect(5, 22, 14, 11, WOOD.m);
  c.vline(5, 22, 32, WOOD.l);
  c.vline(18, 22, 32, WOOD.d);
  c.hline(5, 18, 25, IRON.l);
  c.hline(5, 18, 30, IRON.l);
  // the cabinet
  box(c, 1, 6, 22, 3, 15, LWOOD, { planks: 2 });
  // the screen: dark surround, rounded glass
  c.rect(3, 10, 14, 10, IRON.d);
  if (screen) c.blit(screen, 4, 11);
  else c.rect(4, 11, 12, 8, '#1a2826');
  c.set(4, 11, IRON.d);
  c.set(15, 11, IRON.d);
  c.set(4, 18, IRON.d);
  c.set(15, 18, IRON.d);
  c.set(5, 12, '#ffffff40');
  // knobs and the compass
  c.ellipse(19.5, 12, 1.6, 1.6, BRASS[3]);
  c.ellipse(19.5, 16, 1.3, 1.3, BRASS[2]);
  c.set(19, 19, '#e8e0c8');
  // tubes on top, the pan, the fork aerial, a potato
  for (const [tx, lit] of [[7, true], [11, true], [15, false]]) {
    c.rect(tx, 2, 2, 4, '#c8e8e8a0');
    if (lit && tubes !== 'dark') c.vline(tx, 3, 5, tubes === 'red' ? '#c82a20' : '#ffb040');
  }
  c.ellipse(19, 4, 4, 1.5, IRON.m);
  c.line(22, 3, 23, 1, WOOD.m);
  c.line(3, 6, 1, 0, IRON.h);
  c.line(5, 6, 6, 0, IRON.l);
  c.ellipse(1, 15, 1.5, 2, '#c8a06a');
  // the fuse cord trailing off the back
  for (let k = 0; k < 5; k++) c.set(0, 20 + k, k % 2 ? '#d8c8a0' : '#a89870');
  c.outline(INK);
  return c;
}

function sesFrames(kind, n) {
  const frames = [];
  for (let f = 0; f < n; f++) frames.push(sesTv(miniScreen(SES_SCREEN_PAINTERS[kind](f), 12, 8)));
  return frames;
}

/** Before the reveal: a lump under an old sailcloth, wires poking out, faintly humming. */
function sesCovered() {
  const c = canvas(24, 34);
  groundShadow(c, 12, 32, 11, 2);
  c.poly([[2, 33], [3, 12], [8, 4], [16, 3], [21, 10], [22, 33]], '#c8bc9a');
  c.poly([[3, 33], [4, 14], [8, 6], [10, 6], [8, 33]], '#e0d6b8');
  c.poly([[16, 4], [21, 10], [22, 33], [17, 33]], '#a89c7c');
  c.line(6, 16, 18, 18, '#a89c7c');
  c.line(5, 26, 19, 27, '#a89c7c');
  // things sticking out of it that should not be
  c.line(9, 4, 7, 0, IRON.h);
  c.line(14, 3, 15, 0, IRON.l);
  c.line(22, 30, 23, 33, '#c83a30');
  c.line(21, 32, 23, 31, '#3a6ad0');
  c.ellipse(19, 2, 3, 1, IRON.m);
  c.outline(INK);
  return c;
}

/** The Grand Stenchmaster's chair: a barrel, a plush cushion, a hatch-cover back, a sash-coloured throw. */
function stenchChair() {
  const c = canvas(18, 24);
  groundShadow(c, 9, 22, 8, 2);
  // the back: a hatch cover, upholstered with a curtain
  c.rect(3, 1, 12, 12, WOOD.d);
  c.rect(4, 2, 10, 10, SASHY.plush);
  c.rect(4, 2, 10, 2, SASHY.plushL);
  for (const bx of [6, 9, 12]) c.set(bx, 7, BRASS[2]);
  // the seat: a barrel with a cushion, kept warm
  c.rect(3, 13, 12, 9, WOOD.m);
  c.vline(3, 13, 21, WOOD.l);
  c.hline(3, 14, 17, IRON.l);
  c.ellipse(9, 13, 7, 2.5, SASHY.plush);
  c.ellipse(8, 12.5, 4, 1.2, SASHY.plushL);
  // the throw over one arm, mustard with a burgundy edge
  c.rect(14, 8, 3, 10, SASHY.m);
  c.vline(16, 8, 17, SASHY.edge);
  c.outline(INK);
  return c;
}

/** A small barrel-table: his Frog Grog mug, crayons, a bell to ring for more. */
function grogSideTable() {
  const c = canvas(14, 18);
  groundShadow(c, 7, 16, 6, 2);
  c.rect(3, 6, 8, 10, WOOD.m);
  c.vline(3, 6, 15, WOOD.l);
  c.hline(3, 10, 9, IRON.l);
  c.ellipse(7, 6, 6, 2, LWOOD.l);
  // the mug, green to the brim
  c.rect(2, 1, 4, 5, '#c8c8d0');
  c.rect(2, 1, 4, 1, GROG.l);
  c.set(6, 3, '#c8c8d0');
  // crayons and a little bell
  c.line(7, 5, 10, 4, '#e8c020');
  c.line(7, 6, 10, 5, '#3a6ad0');
  c.ellipse(11, 3, 1.5, 1.5, BRASS[2]);
  c.outline(INK);
  return c;
}

/** Anonymous notes pinned up near the station (a decal on the mast). */
function notesInsults() {
  const c = canvas(16, 16);
  const notes = [[1, 2, 6, 5, '#f0e6c8'], [8, 1, 6, 6, '#e8e0b0'], [3, 8, 7, 5, '#f4ecd8'], [10, 8, 5, 6, '#f0e6c8']];
  for (const [x, y, w, h, col] of notes) {
    c.rect(x, y, w, h, col);
    c.hline(x + 1, x + w - 2, y + 2, '#3a3a48');
    if (h > 4) c.hline(x + 1, x + w - 3, y + 3, '#d03a2a');
    c.set(x + Math.floor(w / 2), y, IRON.h);
  }
  return c;
}

/** A washing line strung between two posts, shirts on it (clean, or after the Center). */
function laundryLine(yellow) {
  const c = canvas(48, 28);
  for (const px of [2, 45]) {
    c.rect(px, 4, 2, 24, WOOD.m);
    c.vline(px, 4, 27, WOOD.l);
  }
  for (let x = 3; x < 46; x++) c.set(x, 6 + Math.round(Math.sin(((x - 3) / 42) * Math.PI) * 3), '#cca660');
  const cloth = yellow ? ['#c8b048', '#e0cc60', '#a89030'] : ['#e8e4dc', '#c8d0d8', '#d8b8a8'];
  [[8, 9, 10], [20, 8, 9], [32, 7, 10]].forEach(([x, w, h], i) => {
    const top = 7 + Math.round(Math.sin(((x + w / 2 - 3) / 42) * Math.PI) * 3);
    c.rect(x, top, w, h, cloth[i]);
    c.rect(x - 2, top, 2, 4, cloth[i]);
    c.rect(x + w, top, 2, 4, cloth[i]);
    c.hline(x, x + w - 1, top, '#ffffff60');
    if (yellow) for (let k = 0; k < 3; k++) c.set(x + 2 + k * 3, top + h - 2, '#8a7a20');
  });
  c.outline(INK);
  return c;
}

/** Fresh bread on a board (it will not stay fresh). */
function breadLoaves() {
  const c = canvas(16, 12);
  c.rect(1, 7, 14, 4, LWOOD.m);
  c.hline(1, 14, 7, LWOOD.h);
  for (const [x, y] of [[5, 5], [11, 5]]) {
    c.ellipse(x, y, 4, 3, '#c88a40');
    c.ellipse(x - 1, y - 1, 2.5, 1.5, '#e8b060');
    c.line(x - 2, y, x + 2, y - 1, '#a86a28');
  }
  c.outline(INK);
  return c;
}

/** Mirror a painter left-to-right (the starboard rail is the port rail's mirror). */
function mirrored(painter) {
  return () => {
    const src = painter();
    const c = new PixelCanvas(src.width, src.height);
    c.blit(src, 0, 0, { flipX: true });
    return c;
  };
}

export const PHASE5_PROPS = {
  ses_tv_covered: sesCovered,
  ses_tv_off: () => sesTv(null),
  ses_tv_ch1: () => ({ frames: sesFrames('static', 4), ms: 90 }),
  ses_tv_ch2: () => ({ frames: sesFrames('weather', 2), ms: 500 }),
  ses_tv_ch3: () => ({ frames: sesFrames('potato', 3), ms: 420 }),
  ses_tv_ch4: () => ({ frames: sesFrames('fish', 2), ms: 600 }),
  ses_tv_ch5: () => ({ frames: sesFrames('theatre', 3), ms: 480 }),
  ses_tv_ch6: () => ({ frames: sesFrames('whisper', 4), ms: 110 }),
  stench_chair: stenchChair,
  grog_side_table: grogSideTable,
  notes_insults: notesInsults,
  laundry_line: () => laundryLine(false),
  laundry_line_yellow: () => laundryLine(true),
  bread_loaves: breadLoaves,
  rail_bitten_s: mirrored(PHASE4_PROPS.rail_bitten),
  rail_gap_s: mirrored(PHASE4_PROPS.rail_gap),
  patch_1_s: mirrored(PHASE4_PROPS.patch_1),
  patch_2_s: mirrored(PHASE4_PROPS.patch_2),
  brace_ropes_s: mirrored(PHASE4_PROPS.brace_ropes),
};

void GOLD;
void PAL;
