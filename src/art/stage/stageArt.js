import { PixelCanvas } from '../PixelCanvas.js';
import { ShelfAtlas } from '../atlas.js';
import { PAL } from '../palette.js';

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
  const built = atlas.build();
  return {
    ...built,
    anims: {
      bathtub_paddle: ['bathtub_top_0', 'bathtub_top_1'],
      rowboat_row: ['rowboat_top_0', 'rowboat_top_1'],
    },
    rates: { bathtub: 3, rowboat: 2.5 },
  };
}

export const STAGE_FRAMES = [
  'bathtub_top_0', 'bathtub_top_1', 'bathtub_top_sag', 'bathtub_top_empty', 'frigate_top', 'frigate_top_broken',
  'rowboat_top_0', 'rowboat_top_1', 'rowboat_top_cheer',
  'meal_onions', 'meal_garlic', 'meal_stew', 'meal_cheese', 'meal_eggs', 'meal_beans', 'meal_sausages', 'meal_jar_open',
  'loot_coins', 'loot_ruby', 'loot_necklace', 'loot_fork', 'loot_statue', 'chest_carried', 'squawks_bundle',
];
