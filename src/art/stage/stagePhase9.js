import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { flyingShark } from './stagePhase6.js';

/**
 * Stage sprites for Story Phase 9: the rowboat the captain rows through the
 * reef to Crownskull Isle (seen from above, Pete on the oars, Squawks in the
 * bow, facing each way), and the Great Sharkstorm's sharks once it has the
 * Crimson Fortune: a pearl necklace on one, a gold chain on a hammerhead,
 * a tiara, rings round the teeth. Readable, silly, never cruel.
 */
const INK = PAL.ink;
const WOOD = { d: '#5a3818', m: '#7c5226', l: '#a07038', h: '#c09050' };
const GOLD = { d: '#9a6a10', m: '#e0b030', l: '#f8e070' };
const PEARL = '#f4f0e8';
const RUBY = '#d02838';
const EMERALD = '#28a050';

/** The rowboat from above, bow towards `dir`. Pete rows in the stern; Squawks rides in the bow in his pouch. */
function rowboat(dir) {
  const vertical = dir === 'up' || dir === 'down';
  const L = 42;
  const B = 18;
  const c = new PixelCanvas(vertical ? B + 12 : L, vertical ? L : B + 12);
  // Draw pointing up, then turn it.
  const up = new PixelCanvas(B + 12, L);
  const cx = (B + 12) / 2;
  for (let y = 0; y < L; y++) {
    const t = y / (L - 1);
    const half = Math.round((B / 2) * Math.min(1, Math.sin(Math.min(1, t * 1.6) * Math.PI / 2) * (t > 0.85 ? 1 - (t - 0.85) * 1.6 : 1)));
    if (half <= 0) continue;
    up.hline(Math.round(cx - half), Math.round(cx + half - 1), y, WOOD.m);
    up.set(Math.round(cx - half), y, WOOD.l);
    up.set(Math.round(cx + half - 1), y, WOOD.d);
  }
  // inside, a little darker; the thwarts across it
  for (let y = 4; y < L - 4; y++) {
    const row = [...Array(B + 12).keys()].filter((x) => up.alphaAt(x, y));
    if (row.length > 6) up.hline(row[0] + 2, row[row.length - 1] - 2, y, WOOD.d);
  }
  for (const ty of [13, 24]) up.hline(cx - 7, cx + 6, ty, WOOD.h);
  // Pete at the oars (stern), oars out to each side
  up.ellipse(cx, 28, 3, 3, '#e8b088');
  up.rect(cx - 3, 30, 6, 4, '#7a5a3a');
  up.thickLine(cx - 4, 30, 0, 26, 1, WOOD.h);
  up.thickLine(cx + 3, 30, B + 11, 26, 1, WOOD.h);
  up.rect(0, 24, 3, 4, WOOD.l);
  up.rect(B + 9, 24, 3, 4, WOOD.l);
  // Squawks in the bow, bald and grim, in his padded pouch
  up.ellipse(cx, 7, 3, 2, '#c09060');
  up.ellipse(cx, 5, 2, 2, '#e8c8b0');
  up.set(cx - 1, 4, INK);
  up.outline(INK);
  const rot = { up: 0, right: 1, down: 2, left: 3 }[dir];
  for (let y = 0; y < up.height; y++) {
    for (let x = 0; x < up.width; x++) {
      const p = up.get(x, y);
      if (!p) continue;
      let nx = x;
      let ny = y;
      if (rot === 1) { nx = up.height - 1 - y; ny = x; }
      if (rot === 2) { nx = up.width - 1 - x; ny = up.height - 1 - y; }
      if (rot === 3) { nx = y; ny = up.width - 1 - x; }
      c.set(nx, ny, p);
    }
  }
  return c;
}

/** The storm's sharks, wearing the Crimson Fortune. */
function blinged(kind, frame) {
  const c = flyingShark(frame);
  if (kind === 'pearls') {
    // a pearl necklace round the gills
    for (let i = 0; i < 6; i++) c.set(8 + i, 11 + (i % 2), PEARL);
  } else if (kind === 'chain') {
    // a hammerhead's head, and a fat gold chain
    c.rect(1, 3, 3, 10, '#5a6a80');
    c.set(1, 3, '#0a0a10');
    c.set(1, 12, '#0a0a10');
    for (let i = 0; i < 7; i++) c.set(7 + i, 10 + (i % 2), i % 2 ? GOLD.m : GOLD.l);
    c.set(10, 12, GOLD.d);
  } else if (kind === 'tiara') {
    // a tiara on top, slightly crooked
    for (let i = 0; i < 6; i++) c.set(6 + i, 3 - (i % 2), GOLD.m);
    c.set(8, 1, RUBY);
    c.set(10, 1, EMERALD);
  } else if (kind === 'rings') {
    // rings round the teeth, bracelets on the fins
    c.set(4, 7, GOLD.l);
    c.set(6, 7, GOLD.l);
    c.set(6, 10, GOLD.m);
    c.set(8, 13, GOLD.m);
    c.set(9, 13, GOLD.l);
  }
  // a glint
  c.set(frame ? 14 : 12, 5, '#ffffff');
  return c;
}

export const BLING = ['pearls', 'chain', 'tiara', 'rings'];

export function addPhase9StageFrames(atlas) {
  for (const dir of ['up', 'down', 'left', 'right']) atlas.add(`rowboat_top_${dir}`, rowboat(dir));
  for (const kind of BLING) for (const f of [0, 1]) atlas.add(`flying_shark_${kind}_${f}`, blinged(kind, f));
}

export const PHASE9_STAGE_FRAMES = [
  ...['up', 'down', 'left', 'right'].map((d) => `rowboat_top_${d}`),
  ...BLING.flatMap((k) => [`flying_shark_${k}_0`, `flying_shark_${k}_1`]),
];
