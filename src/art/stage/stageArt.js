import { PixelCanvas } from '../PixelCanvas.js';
import { ShelfAtlas } from '../atlas.js';
import { PAL } from '../palette.js';
import { addPhase4StageFrames, PHASE4_STAGE_FRAMES } from './stagePhase4.js';
import { addPhase6StageFrames, PHASE6_STAGE_FRAMES } from './stagePhase6.js';

/**
 * "Stage" sprites: free-moving pieces that scripts place in the world (see
 * world/Stage.js): things on the sea around the ship seen from above, the
 * food Garrick piles on the mess table, the loot that comes out of his coat.
 */
const INK = PAL.ink;
const WOOD = { d: PAL.wood1, m: PAL.wood2, b: PAL.wood3, l: PAL.wood4, h: PAL.wood5 };
const SKIN = { s: '#dc9c76', d: '#a86a50', S: '#f6c8a0' };
const CHOPS = ['#5a1414', '#962a22', '#c85236'];
const COAT = ['#173a36', '#2a5f56', '#4a8a78'];

function ripple(c, cx, cy, rx, ry) {
  for (let a = 0; a < Math.PI * 2; a += 0.12) {
    const x = Math.round(cx + Math.cos(a) * rx);
    const y = Math.round(cy + Math.sin(a) * ry);
    if (!c.alphaAt(x, y)) c.set(x, y, (Math.round(a * 10) % 3) ? '#9bd3e6' : '#e6f5f8');
  }
}

/** Garrick seen from above, sitting on something, a paddle in each hand. */
function garrickFromAbove(c, cx, cy, arms) {
  // coat and shoulders
  c.ellipse(cx, cy + 2, 6, 4, COAT[1]);
  c.ellipse(cx - 1, cy + 1, 4, 2.5, COAT[2]);
  // head: shiny dome with a combover, great red mutton chops
  c.ellipse(cx, cy - 3, 3.5, 3, SKIN.s);
  c.set(cx - 1, cy - 4, SKIN.S);
  c.line(cx - 2, cy - 4, cx + 2, cy - 5, CHOPS[1]);
  c.rect(cx - 4, cy - 3, 2, 3, CHOPS[1]);
  c.rect(cx + 3, cy - 3, 2, 3, CHOPS[0]);
  c.set(cx + 2, cy - 2, PAL.gold4); // monocle glint
  // arms reaching for the paddles
  c.line(cx - 5, cy + 1, cx - 8, cy + arms, COAT[1]);
  c.line(cx + 5, cy + 1, cx + 8, cy - arms, COAT[1]);
}

function sausage(c, x0, y0, x1, y1, sag = 0) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag);
    c.rect(x - 1, y - 1, 3, 3, '#8a3a24');
    c.set(x - 1, y - 1, '#c46a44');
  }
}

function bathtubTop(frame, { sag = false, empty = false } = {}) {
  const c = new PixelCanvas(40, 28);
  // the overturned tub: a wooden hull, planks, iron hoops
  c.ellipse(20, 16, 13, 7, WOOD.b);
  c.ellipse(19, 15, 11, 5, WOOD.l);
  for (let x = 9; x <= 31; x += 4) c.vline(x, 11, 21, WOOD.m);
  c.hline(8, 32, 16, PAL.iron2);
  c.set(33, 15, WOOD.d);
  c.set(33, 16, WOOD.d);
  if (!empty) {
    const arms = frame ? 3 : -2;
    garrickFromAbove(c, 20, 12, arms);
    if (sag) {
      sausage(c, 11, 13, 2, 24, 4);
      sausage(c, 29, 13, 38, 24, 4);
    } else {
      sausage(c, 12, 13 + arms, 1, 13 + arms * 3, 0);
      sausage(c, 28, 13 - arms, 39, 13 - arms * 3, 0);
    }
  }
  c.outline(INK);
  ripple(c, 20, 17, 17, 9);
  return c;
}

function frigateTop({ broken = false } = {}) {
  const W = 64;
  const H = 150;
  const c = new PixelCanvas(W, H);
  const hull = [[32, 2], [46, 22], [52, 60], [52, 118], [46, 144], [18, 144], [12, 118], [12, 60], [18, 22]];
  c.poly(hull, '#2a1a14');
  c.poly([[32, 6], [43, 24], [48, 60], [48, 116], [43, 140], [21, 140], [16, 116], [16, 60], [21, 24]], PAL.deck3);
  for (let y = 26; y < 138; y += 3) c.hline(19, 45, y, PAL.deck2);
  // navy blue gunwale stripe with gun ports
  for (let y = 24; y < 142; y++) {
    const r = y < 60 ? 12 + (60 - y) * 0.12 : y > 118 ? 12 + (y - 118) * 0.24 : 12;
    c.set(Math.round(r), y, '#28366a');
    c.set(Math.round(W - r - 1), y, '#28366a');
  }
  for (let y = 44; y < 134; y += 9) {
    c.set(12, y, '#0c0a10');
    c.set(51, y, '#0c0a10');
  }
  // quarterdeck and captain's cabin roof at the stern
  c.rect(20, 118, 24, 20, PAL.deck4);
  c.rect(24, 124, 16, 10, '#28366a');
  // masts and furled/unfurled sails seen from above
  const masts = broken ? [[32, 40], [32, 84]] : [[32, 40], [32, 84], [32, 110]];
  for (const [x, y] of masts) {
    c.rect(x - 22, y - 3, 44, 6, '#f4e8cc');
    c.hline(x - 22, x + 21, y - 3, '#ffffff');
    c.hline(x - 22, x + 21, y + 2, '#c8b894');
    c.ellipse(x, y, 2.5, 2.5, WOOD.d);
  }
  if (broken) {
    // the mizzen snapped and hanging over the side
    c.ellipse(32, 110, 2.5, 2.5, WOOD.d);
    c.poly([[34, 108], [60, 96], [62, 102], [36, 113]], '#d8c8a4');
    c.line(34, 110, 60, 99, WOOD.m);
  }
  // pennant at the bow
  c.rect(30, 2, 4, 6, '#f4e8cc');
  c.rect(31, 3, 2, 4, '#28366a');
  c.outline(INK);
  return c;
}

function rowboatTop(frame, { cheer = false } = {}) {
  const c = new PixelCanvas(32, 20);
  c.poly([[3, 10], [9, 4], [26, 5], [30, 10], [26, 15], [9, 16]], WOOD.b);
  c.poly([[6, 10], [10, 6], [25, 7], [27, 10], [25, 13], [10, 14]], WOOD.d);
  garrickFromAbove(c, 16, 10, cheer ? -4 : frame ? 2 : -1);
  if (!cheer) {
    c.line(8, 10 + (frame ? 2 : -1), 1, 14 + (frame ? 3 : -3), WOOD.l);
    c.line(24, 10 - (frame ? 2 : -1), 31, 6 - (frame ? 3 : -3), WOOD.l);
  }
  c.outline(INK);
  ripple(c, 16, 11, 15, 8);
  return c;
}

function bowl(c, cx, cy, col, food) {
  c.ellipse(cx, cy + 1, 5, 2.5, col);
  c.ellipse(cx, cy, 4, 1.8, food);
}

function mealItem(kind) {
  const c = new PixelCanvas(14, 12);
  switch (kind) {
    case 'onions':
      bowl(c, 7, 7, '#e8e4dc', '#c8d060');
      for (const [x, y] of [[4, 5], [6, 4], [8, 5], [10, 4], [5, 6], [9, 6]]) {
        c.ellipse(x, y, 1.5, 1.4, '#f4f0d8');
        c.set(x, y - 1, '#b8c060');
      }
      break;
    case 'garlic':
      for (const [x, y] of [[4, 7], [8, 6], [10, 8]]) {
        c.ellipse(x, y, 2.5, 2.5, '#e8dcc0');
        c.set(x, y - 2, '#a88a50');
        c.set(x - 1, y, '#c8a060');
      }
      break;
    case 'stew':
      bowl(c, 7, 7, '#8a6a48', '#6a7a3a');
      c.set(5, 6, '#c8d060');
      c.set(8, 6, '#a8b848');
      c.set(6, 3, '#e8e4dc60');
      c.set(8, 2, '#e8e4dc40');
      break;
    case 'cheese':
      c.poly([[2, 9], [12, 9], [12, 5], [2, 7]], '#e8c850');
      c.hline(2, 12, 9, '#b89a30');
      c.set(5, 7, '#8a9a3a');
      c.set(9, 6, '#8a9a3a');
      c.set(10, 8, '#6a7a2a');
      break;
    case 'eggs':
      c.ellipse(7, 8, 6, 2.5, '#e8e4dc');
      for (const x of [3, 7, 11]) {
        c.ellipse(x, 7, 1.8, 1.2, '#f4f0e8');
        c.set(x, 6, '#e8b830');
      }
      break;
    case 'beans':
      c.ellipse(7, 7, 5, 4, '#3a3440');
      c.ellipse(7, 5, 4, 1.8, '#8a4a28');
      c.set(5, 5, '#b86a3a');
      c.set(8, 4, '#b86a3a');
      break;
    case 'sausages':
      c.ellipse(7, 8, 6, 2.5, '#e8e4dc');
      c.line(2, 7, 11, 6, '#6a6a4a');
      c.line(3, 8, 12, 8, '#7a7a52');
      c.set(6, 6, '#8a9a3a');
      c.set(10, 7, '#5a6a2a');
      break;
    case 'jar_open':
      c.rect(4, 4, 6, 7, '#5a7a3a');
      c.rect(5, 5, 4, 5, '#7a9a48');
      c.ellipse(7, 4, 3, 1, '#2a3a1a');
      c.set(6, 1, '#b8c84a');
      c.set(8, 0, '#b8c84a');
      c.set(7, 2, '#c8d860');
      break;
    default:
      break;
  }
  c.outline(INK);
  return c;
}

function loot(kind) {
  const c = new PixelCanvas(14, 14);
  switch (kind) {
    case 'coins':
      for (const [x, y] of [[4, 9], [8, 10], [6, 6], [10, 7]]) {
        c.ellipse(x, y, 2.5, 1.6, PAL.gold3);
        c.set(x, y - 1, PAL.gold5);
      }
      break;
    case 'ruby':
      c.poly([[7, 2], [12, 7], [7, 12], [2, 7]], '#c0283a');
      c.poly([[7, 3], [10, 7], [7, 7], [4, 7]], '#f06070');
      c.set(6, 4, '#ffffff');
      break;
    case 'necklace':
      for (let a = 0; a < Math.PI; a += 0.15) {
        const x = Math.round(7 + Math.cos(a) * 5);
        const y = Math.round(4 + Math.sin(a) * 6);
        c.set(x, y, PAL.gold3);
      }
      c.ellipse(7, 11, 2, 2, PAL.sea4);
      c.set(6, 10, '#ffffff');
      break;
    case 'fork':
      c.vline(7, 5, 13, '#d4d4e2');
      c.vline(8, 5, 13, '#9898ac');
      for (const x of [5, 7, 9]) c.vline(x, 1, 4, '#d4d4e2');
      c.hline(5, 9, 4, '#d4d4e2');
      break;
    case 'statue':
      c.ellipse(7, 3, 2, 2, PAL.gold3);
      c.rect(5, 5, 5, 6, PAL.gold2);
      c.vline(5, 5, 10, PAL.gold4);
      c.rect(4, 11, 7, 2, PAL.gold1);
      c.set(10, 6, PAL.gold3);
      break;
    default:
      break;
  }
  c.outline(INK);
  return c;
}

function chestCarried() {
  const c = new PixelCanvas(28, 18);
  c.rect(1, 4, 26, 12, WOOD.b);
  c.rect(1, 1, 26, 4, WOOD.l);
  c.hline(1, 26, 1, WOOD.h);
  for (const x of [1, 13, 26]) c.vline(x, 1, 15, PAL.gold2);
  c.hline(1, 26, 8, PAL.gold2);
  c.rect(12, 7, 4, 4, PAL.gold3);
  c.set(13, 9, INK);
  c.outline(INK);
  return c;
}

function squawksBundle() {
  const c = new PixelCanvas(16, 12);
  // a limp, sooty, half-plucked parrot, draped over two arms
  c.ellipse(8, 7, 6, 3.5, '#a86a50');
  c.ellipse(7, 6, 4, 2, '#e08a8e');
  c.ellipse(3, 5, 2.5, 2.5, '#9a3a32');
  c.set(2, 5, INK);
  c.rect(0, 6, 2, 1, '#efe6d4');
  c.line(12, 8, 15, 11, '#7a2a24');
  c.line(11, 8, 14, 11, '#2c58a8');
  c.set(8, 4, '#8a7a48');
  c.set(10, 5, '#2c58a8');
  c.outline(INK);
  return c;
}

// ---------------------------------------------------------------------------
// Story Phase 3: sharks, a rat in a nose-cloth, the rowboat's second trip

const SHARK = { d: '#3a4658', m: '#5a6a80', l: '#8a9ab0', belly: '#d8dce4' };

function ripples(c, pts) {
  for (const [x, y, col] of pts) if (!c.alphaAt(x, y)) c.set(x, y, col ?? '#9bd3e6');
}

/** A dorsal fin seen from above, cutting the water: moving right (h) or up (v). */
function finTop(dir, frame) {
  if (dir === 'h') {
    const c = new PixelCanvas(20, 12);
    // the fin: a thin dark blade with a pale leading edge
    c.poly([[14, 6], [6, 4], [4, 6], [6, 8]], SHARK.d);
    c.line(6, 5, 13, 6, SHARK.l);
    c.outline(INK);
    // V wake trailing behind, spray at the tip
    const k = frame ? 1 : 0;
    ripples(c, [[15, 6, '#e6f5f8'], [16, 5 + k, '#e6f5f8'], [16, 7 - k]]);
    for (let i = 0; i < 5; i++) ripples(c, [[3 - i, 4 - Math.floor(i / 2) - k], [3 - i, 8 + Math.floor(i / 2) + k]]);
    return c;
  }
  const c = new PixelCanvas(12, 20);
  c.poly([[6, 4], [4, 12], [6, 14], [8, 12]], SHARK.d);
  c.line(5, 12, 6, 5, SHARK.l);
  c.outline(INK);
  const k = frame ? 1 : 0;
  ripples(c, [[6, 3, '#e6f5f8'], [5 + k, 2, '#e6f5f8'], [7 - k, 2]]);
  for (let i = 0; i < 5; i++) ripples(c, [[4 - Math.floor(i / 2) - k, 15 + i], [8 + Math.floor(i / 2) + k, 15 + i]]);
  return c;
}

/** A shark rearing at the hull, facing right (toward the ship's starboard side). */
function sharkBite(frame) {
  const c = new PixelCanvas(28, 22);
  // body sliding under the surface, head up, jaws by frame
  c.ellipse(9, 13, 9, 5, SHARK.m);
  c.ellipse(8, 11, 6, 2.5, SHARK.l);
  c.poly([[2, 13], [0, 8], [4, 12]], SHARK.d); // tail fluke
  c.poly([[10, 8], [7, 2], [13, 8]], SHARK.d); // dorsal fin
  const open = frame === 1;
  if (frame === 0) {
    c.ellipse(19, 13, 6, 4, SHARK.m);
  } else {
    // upper jaw
    c.poly([[14, 10], [25, open ? 6 : 10], [26, open ? 8 : 12], [15, 13]], SHARK.m);
    // lower jaw, pale
    c.poly([[14, 14], [25, open ? 19 : 14], [24, open ? 20 : 15], [15, 16]], SHARK.belly);
    // teeth
    for (let x = 17; x < 25; x += 2) {
      c.set(x, open ? 9 + Math.floor((x - 17) / 3) : 12, '#ffffff');
      c.set(x, open ? 17 - Math.floor((x - 17) / 4) : 14, '#ffffff');
    }
    if (open) c.poly([[16, 12], [24, 9], [24, 17], [16, 15]], '#5a1420');
  }
  c.set(16, 10, INK); // eye
  c.set(15, 10, '#ffffff');
  c.outline(INK);
  ripples(c, [[1, 17], [4, 19, '#e6f5f8'], [9, 19], [14, 19, '#e6f5f8'], [20, 18], [3, 16]]);
  return c;
}

/** A shark flopping on the deck (seen from above, lying on its side). */
function sharkDeck(pose) {
  const c = new PixelCanvas(40, 24);
  for (let y = 18; y < 22; y++) for (let x = 6; x < 34; x++) if ((x + y) % 2) c.set(x, y, '#0c0a1050');
  const lift = pose === 'flop1' ? -3 : 0;
  // body
  c.ellipse(20, 13, 13, 6, SHARK.m);
  c.ellipse(20, 15, 11, 3, SHARK.belly);
  c.ellipse(19, 11, 9, 2.5, SHARK.l);
  // tail, flipping up on the second frame
  c.poly([[8, 13], [1, 6 + lift], [4, 13], [1, 20 - lift]], SHARK.d);
  // dorsal and pectoral fins
  c.poly([[20, 8], [16, 2], [24, 8]], SHARK.d);
  c.poly([[22, 17], [18, 22], [26, 18]], SHARK.m);
  // head: nose up when sniffing, screwed-up face when disgusted
  const nose = pose === 'sniff' ? -3 : 0;
  c.poly([[30, 9 + nose], [39, 11 + nose], [37, 15], [30, 17]], SHARK.m);
  c.set(33, 11 + nose, INK);
  if (pose === 'disgust') {
    // eye squeezed shut, tongue out, a whiff line above
    c.hline(32, 34, 11, INK);
    c.rect(36, 15, 2, 2, '#e46452');
    c.line(33, 6, 35, 3, '#c8d450');
    c.line(36, 6, 38, 2, '#c8d450');
  } else {
    c.set(32, 11 + nose, '#ffffff');
    c.hline(33, 37, 15, INK);
  }
  if (pose === 'sniff') {
    c.set(38, 6, '#c8d45090');
    c.set(37, 4, '#c8d45070');
  }
  c.outline(INK);
  return c;
}

/** Garrick in the rowboat from above: a bean pot on his lap, one oar and a frying pan. */
function rowboatLure(frame, { pan = false, beans = true, bitten = false } = {}) {
  const c = new PixelCanvas(34, 22);
  c.poly([[3, 11], [9, 5], [27, 6], [31, 11], [27, 16], [9, 17]], WOOD.b);
  c.poly([[6, 11], [10, 7], [26, 8], [28, 11], [26, 14], [10, 15]], WOOD.d);
  if (bitten) for (let a = 0; a < Math.PI; a += 0.5) c.set(Math.round(29 + Math.cos(a + Math.PI / 2) * 2), Math.round(11 + Math.sin(a + Math.PI / 2) * 3), INK);
  garrickFromAbove(c, 17, 11, frame ? 2 : -1);
  if (beans) {
    c.ellipse(17, 15, 2.5, 1.5, PAL.iron2);
    c.set(17, 14, '#b86a3a');
  }
  // an oar on one side...
  c.line(9, 11 + (frame ? 2 : -1), 1, 15 + (frame ? 3 : -3), WOOD.l);
  // ...and on the other, an oar or a frying pan
  if (pan) {
    c.line(25, 11 - (frame ? 2 : -1), 30, 7 - (frame ? 3 : -3), PAL.iron3);
    c.ellipse(32, 6 - (frame ? 3 : -3), 2.5, 2, PAL.iron2);
  } else c.line(25, 11 - (frame ? 2 : -1), 33, 7 - (frame ? 3 : -3), WOOD.l);
  c.outline(INK);
  ripple(c, 17, 12, 16, 9);
  return c;
}

/** A small shark hanging on by its teeth to the stern of the returning rowboat. */
function rowboatHitchhiker(frame) {
  const c = rowboatLure(frame, { pan: false, beans: false, bitten: true });
  const k = frame ? 1 : 0;
  const s = new PixelCanvas(40, 22);
  s.blit(c, 0, 0);
  s.ellipse(35, 11 + k, 4, 2, SHARK.m);
  s.poly([[39, 11 + k], [40, 8], [40, 14]], SHARK.d);
  s.set(32, 10 + k, INK);
  s.set(31, 11 + k, '#ffffff');
  return s;
}

/** A shark that got into the Frog Grog, floating belly-up, blowing yellow bubbles. */
function sharkBelly(frame) {
  const c = new PixelCanvas(26, 16);
  c.ellipse(13, 9, 10, 4, SHARK.belly);
  c.ellipse(13, 10, 9, 2, '#b8bcc8');
  c.poly([[3, 9], [0, 5], [0, 13]], SHARK.m);
  c.poly([[13, 5], [11, 1], [16, 5]], SHARK.m);
  c.set(21, 8, INK);
  c.set(22, 9, INK);
  c.hline(20, 23, 11, '#5a1420');
  c.outline(INK);
  const b = frame ? [[20, 3], [23, 1]] : [[21, 2], [19, 0]];
  for (const [x, y] of b) c.set(x, y, '#e8e070');
  ripple(c, 13, 10, 12, 5);
  return c;
}

/** The ship's rat, peeking out with a scrap of cloth tied over its nose. */
function ratMask(frame) {
  const c = new PixelCanvas(16, 12);
  c.ellipse(8, 9, 5, 3, '#6a5a58');
  c.ellipse(8, 6, 4, 3, '#7a6a66');
  c.ellipse(5, 3, 1.5, 1.5, '#8a6a70');
  c.ellipse(11, 3, 1.5, 1.5, '#8a6a70');
  c.set(6, 5, INK);
  c.set(10, 5, INK);
  // the nose-cloth, knotted behind the ears
  c.rect(5, 7, 7, 2, '#c8d6dc');
  c.set(12, 6, '#9aaab2');
  if (frame === 1) {
    // sniffing: whiskers twitch
    c.line(2, 7, 4, 8, '#d8d0c8');
    c.line(12, 8, 14, 7, '#d8d0c8');
  }
  if (frame === 2) {
    // regretting it: eyes shut
    c.set(6, 5, '#7a6a66');
    c.set(10, 5, '#7a6a66');
    c.hline(5, 6, 5, INK);
    c.hline(10, 11, 5, INK);
  }
  c.outline(INK);
  return c;
}

export function buildStageAtlas() {
  const atlas = new ShelfAtlas(512, 1);
  atlas.add('bathtub_top_0', bathtubTop(0));
  atlas.add('bathtub_top_1', bathtubTop(1));
  atlas.add('bathtub_top_sag', bathtubTop(0, { sag: true }));
  atlas.add('bathtub_top_empty', bathtubTop(0, { empty: true }));
  atlas.add('frigate_top', frigateTop());
  atlas.add('frigate_top_broken', frigateTop({ broken: true }));
  atlas.add('rowboat_top_0', rowboatTop(0));
  atlas.add('rowboat_top_1', rowboatTop(1));
  atlas.add('rowboat_top_cheer', rowboatTop(0, { cheer: true }));
  for (const k of ['onions', 'garlic', 'stew', 'cheese', 'eggs', 'beans', 'sausages', 'jar_open']) atlas.add(`meal_${k}`, mealItem(k));
  for (const k of ['coins', 'ruby', 'necklace', 'fork', 'statue']) atlas.add(`loot_${k}`, loot(k));
  atlas.add('chest_carried', chestCarried());
  atlas.add('squawks_bundle', squawksBundle());
  for (const f of [0, 1]) {
    atlas.add(`fin_h_${f}`, finTop('h', f));
    atlas.add(`fin_v_${f}`, finTop('v', f));
    atlas.add(`rowboat_beans_${f}`, rowboatLure(f));
    atlas.add(`rowboat_pan_${f}`, rowboatLure(f, { pan: true, bitten: true }));
    atlas.add(`rowboat_hitch_${f}`, rowboatHitchhiker(f));
    atlas.add(`shark_belly_${f}`, sharkBelly(f));
  }
  for (const f of [0, 1, 2]) {
    atlas.add(`shark_bite_${f}`, sharkBite(f));
    atlas.add(`rat_mask_${f}`, ratMask(f));
  }
  atlas.add('shark_deck_0', sharkDeck('flop0'));
  atlas.add('shark_deck_1', sharkDeck('flop1'));
  atlas.add('shark_deck_sniff', sharkDeck('sniff'));
  atlas.add('shark_deck_disgust', sharkDeck('disgust'));
  addPhase4StageFrames(atlas);
  addPhase6StageFrames(atlas);
  const built = atlas.build();
  return {
    ...built,
    anims: {
      bathtub_paddle: ['bathtub_top_0', 'bathtub_top_1'],
      rowboat_row: ['rowboat_top_0', 'rowboat_top_1'],
      rowboat_beans: ['rowboat_beans_0', 'rowboat_beans_1'],
      rowboat_pan: ['rowboat_pan_0', 'rowboat_pan_1'],
      rowboat_hitch: ['rowboat_hitch_0', 'rowboat_hitch_1'],
      shark_flop: ['shark_deck_0', 'shark_deck_1'],
      shark_belly: ['shark_belly_0', 'shark_belly_1'],
      barrel_tumble: ['barrel_thrown_0', 'barrel_thrown_1'],
    },
    rates: { bathtub: 3, rowboat: 2.5, shark: 6, shark_belly: 2 },
  };
}

export const STAGE_FRAMES = [
  'bathtub_top_0', 'bathtub_top_1', 'bathtub_top_sag', 'bathtub_top_empty', 'frigate_top', 'frigate_top_broken',
  'rowboat_top_0', 'rowboat_top_1', 'rowboat_top_cheer',
  'meal_onions', 'meal_garlic', 'meal_stew', 'meal_cheese', 'meal_eggs', 'meal_beans', 'meal_sausages', 'meal_jar_open',
  'loot_coins', 'loot_ruby', 'loot_necklace', 'loot_fork', 'loot_statue', 'chest_carried', 'squawks_bundle',
  'fin_h_0', 'fin_h_1', 'fin_v_0', 'fin_v_1', 'shark_bite_0', 'shark_bite_1', 'shark_bite_2',
  'shark_deck_0', 'shark_deck_1', 'shark_deck_sniff', 'shark_deck_disgust',
  'rowboat_beans_0', 'rowboat_beans_1', 'rowboat_pan_0', 'rowboat_pan_1', 'rowboat_hitch_0', 'rowboat_hitch_1',
  'shark_belly_0', 'shark_belly_1', 'rat_mask_0', 'rat_mask_1', 'rat_mask_2',
  ...PHASE4_STAGE_FRAMES,
  ...PHASE6_STAGE_FRAMES,
];
