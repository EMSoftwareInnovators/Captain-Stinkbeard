import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';

/**
 * Art for Phase 2 effects: fume clouds (painted pale so the renderer can tint
 * them mustard, dark yellow or sickly green), particle bits (coins, gems,
 * splinters, feathers, odour lines, droplets, crockery) and the fume
 * vignette that closes in around the captain in thick air.
 */

// 4x4 ordered-dither matrix for soft pixel-art edges.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const dither = (x, y, t) => BAYER[y & 3][x & 3] / 16 < t;

/** A lumpy cloud: union of circles with a dithered, semi-transparent rim. */
function cloud(w, h, lumps, seed) {
  const c = new PixelCanvas(w, h);
  const inside = (x, y, grow = 0) => {
    let best = -Infinity;
    for (const [cx, cy, r] of lumps) {
      const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.15) / (r + grow);
      best = Math.max(best, 1 - d);
    }
    return best; // > 0 inside
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = inside(x, y);
      if (v <= -0.35) continue;
      if (v > 0.25) {
        // Body: lighter on top, a touch darker underneath.
        const low = y > h * 0.62;
        c.set(x, y, low ? '#dcd8d0e0' : '#f8f6f0e8');
      } else if (v > 0) {
        c.set(x, y, dither(x + seed, y, 0.8) ? '#f0ece4c0' : '#f0ece490');
      } else if (dither(x + seed, y + seed, (v + 0.35) / 0.35 * 0.6)) {
        c.set(x, y, '#f4f0e860');
      }
    }
  }
  // A few darker curls give the cloud a rolling shape.
  for (const [cx, cy, r] of lumps.slice(0, 3)) {
    for (let a = 0.3; a < 2.2; a += 0.08) {
      const x = Math.round(cx + Math.cos(a) * r * 0.6);
      const y = Math.round(cy + Math.sin(a) * r * 0.45);
      if (c.alphaAt(x, y) > 160) c.set(x, y, '#c8c2b8e0');
    }
  }
  return c;
}

function swirl(frame) {
  const c = new PixelCanvas(40, 12);
  for (let x = 2; x < 38; x++) {
    const t = x / 40;
    const y = 6 + Math.sin(t * Math.PI * 2 + frame * 1.2) * 3;
    const a = Math.sin(t * Math.PI); // tapered ends
    const alpha = Math.round(a * 200).toString(16).padStart(2, '0');
    c.set(x, Math.round(y), `#f0e8d0${alpha}`);
    if (a > 0.45) c.set(x, Math.round(y) + 1, `#d8d0b8${alpha}`);
  }
  return c;
}

function coin(frame) {
  const c = new PixelCanvas(5, 5);
  const w = [2.5, 1.6, 0.6, 1.6][frame];
  c.ellipse(2.5, 2.5, w, 2.5, PAL.gold3);
  if (frame !== 2) c.set(2, 1, PAL.gold5);
  c.set(2, 4, PAL.gold1);
  if (frame === 2) c.vline(2, 0, 4, PAL.gold2);
  return c;
}

function gem(color, light) {
  const c = new PixelCanvas(5, 5);
  c.poly([[2.5, 0], [5, 2.5], [2.5, 5], [0, 2.5]], color);
  c.set(2, 1, light);
  c.set(1, 2, light);
  return c;
}

function pearl() {
  const c = new PixelCanvas(3, 3);
  c.ellipse(1.5, 1.5, 1.5, 1.5, '#f0e8e4');
  c.set(1, 0, '#ffffff');
  c.set(2, 2, '#c8b8c0');
  return c;
}

function splinter(v) {
  const c = new PixelCanvas(7, 3);
  if (v === 0) {
    c.hline(0, 6, 1, PAL.wood3);
    c.hline(1, 5, 0, PAL.wood4);
    c.set(6, 2, PAL.wood2);
  } else {
    c.line(0, 2, 5, 0, PAL.wood3);
    c.line(1, 2, 6, 1, PAL.wood2);
  }
  return c;
}

function feather(col, dark) {
  const c = new PixelCanvas(7, 4);
  c.ellipse(3.5, 2, 3.5, 1.5, col);
  c.hline(0, 6, 2, dark);
  c.set(0, 3, dark);
  return c;
}

function puff(r) {
  const s = Math.ceil(r * 2) + 2;
  const c = new PixelCanvas(s, s);
  c.ellipse(s / 2, s / 2, r, r * 0.8, '#d8c050c0');
  c.ellipse(s / 2 - r * 0.25, s / 2 - r * 0.2, r * 0.55, r * 0.45, '#f0e080d0');
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) if (c.alphaAt(x, y) && dither(x, y, 0.2)) c.set(x, y, '#a8b83ab0');
  return c;
}

function odor(frame) {
  const c = new PixelCanvas(7, 14);
  for (let y = 1; y < 13; y++) {
    const x = 3 + Math.round(Math.sin(y * 0.8 + frame * 1.4) * 2);
    c.set(x, y, y < 4 || y > 10 ? '#b8c44a90' : '#c8d450e0');
  }
  return c;
}

function drop(v) {
  const c = new PixelCanvas(2, 3);
  c.set(0, 0, '#e6f5f8');
  c.set(1, 1, v ? '#9bd3e6' : '#e6f5f8');
  c.set(0, 1, '#9bd3e6');
  c.set(0, 2, '#5aa2cc');
  return c;
}

function dust(v) {
  const c = new PixelCanvas(7, 6);
  c.ellipse(3.5, 3, 3, 2.5, v ? '#9a9088c0' : '#b8b0a4c0');
  c.set(2, 2, '#d0c8bcc0');
  return c;
}

function dish(v) {
  const c = new PixelCanvas(7, 4);
  if (v === 0) {
    c.ellipse(3.5, 2, 3.5, 1.5, '#e8e4dc');
    c.hline(1, 5, 2, '#b8b0a4');
  } else {
    c.ellipse(3.5, 1.5, 3, 1.5, PAL.wood3);
    c.hline(1, 5, 3, PAL.wood2);
  }
  return c;
}

function fork() {
  const c = new PixelCanvas(3, 7);
  c.vline(1, 2, 6, PAL.iron4);
  c.set(0, 0, PAL.iron4);
  c.set(2, 0, PAL.iron4);
  c.hline(0, 2, 1, PAL.iron3);
  return c;
}

/** A tiny navy sailor for distant ships (arms up, mid-jump). */
function sailor(frame) {
  const c = new PixelCanvas(6, 9);
  c.rect(2, 0, 2, 2, '#e4a878');
  c.rect(1, 2, 4, 3, frame ? '#28366a' : '#f4e8cc');
  c.rect(1, 5, 4, 2, '#28366a');
  c.set(1, 7, '#1a1320');
  c.set(4, 7, '#1a1320');
  if (frame) {
    c.set(0, 0, '#e4a878');
    c.set(5, 0, '#e4a878');
    c.set(0, 1, '#28366a');
    c.set(5, 1, '#28366a');
  } else {
    c.set(0, 3, '#e4a878');
    c.set(5, 3, '#e4a878');
  }
  return c;
}

/** Adds every Phase 2 effect frame to an effects atlas. */
export function addFumeEffects(atlas) {
  atlas.add('fcloud_l0', cloud(64, 40, [[20, 22, 14], [36, 18, 16], [50, 24, 12], [30, 28, 12]], 1));
  atlas.add('fcloud_l1', cloud(64, 40, [[16, 24, 12], [30, 20, 15], [46, 18, 13], [52, 27, 10]], 3));
  atlas.add('fcloud_m0', cloud(40, 26, [[13, 14, 9], [24, 11, 10], [30, 16, 8]], 2));
  atlas.add('fcloud_m1', cloud(40, 26, [[11, 15, 8], [20, 12, 10], [31, 13, 8]], 5));
  atlas.add('fcloud_s0', cloud(24, 16, [[9, 9, 6], [15, 8, 6]], 4));
  for (let f = 0; f < 3; f++) atlas.add(`fswirl_${f}`, swirl(f));
  for (let f = 0; f < 4; f++) atlas.add(`coin_${f}`, coin(f));
  atlas.add('gem_r', gem('#d0283a', '#ff9aa0'));
  atlas.add('gem_b', gem('#2c6ad0', '#9ac4ff'));
  atlas.add('gem_g', gem('#28a050', '#9af0b0'));
  atlas.add('pearl', pearl());
  atlas.add('splinter_0', splinter(0));
  atlas.add('splinter_1', splinter(1));
  atlas.add('feather_r', feather(PAL.red3, PAL.red1));
  atlas.add('feather_b', feather('#2c58a8', '#1c3060'));
  atlas.add('feather_y', feather(PAL.gold3, PAL.gold1));
  [3, 4, 5].forEach((r, i) => atlas.add(`puff_${i}`, puff(r)));
  for (let f = 0; f < 3; f++) atlas.add(`odor_${f}`, odor(f));
  atlas.add('drop_0', drop(0));
  atlas.add('drop_1', drop(1));
  atlas.add('dust_0', dust(0));
  atlas.add('dust_1', dust(1));
  atlas.add('dish_0', dish(0));
  atlas.add('dish_1', dish(1));
  atlas.add('fork', fork());
  atlas.add('sailor_0', sailor(0));
  atlas.add('sailor_1', sailor(1));
}

export const FUME_FX_FRAMES = [
  'fcloud_l0', 'fcloud_l1', 'fcloud_m0', 'fcloud_m1', 'fcloud_s0', 'fswirl_0', 'fswirl_1', 'fswirl_2',
  'coin_0', 'coin_1', 'coin_2', 'coin_3', 'gem_r', 'gem_b', 'gem_g', 'pearl', 'splinter_0', 'splinter_1',
  'feather_r', 'feather_b', 'feather_y', 'puff_0', 'puff_1', 'puff_2', 'odor_0', 'odor_1', 'odor_2',
  'drop_0', 'drop_1', 'dust_0', 'dust_1', 'dish_0', 'dish_1', 'fork', 'sailor_0', 'sailor_1',
];

/**
 * Screen vignette for thick fumes: clear in the middle, mustard toward the
 * edges in dithered bands. Twice the screen size so it can be scaled down
 * (visibility shrinking) without ever showing its own edge.
 */
export function paintFumeVignette(W = 640, H = 448) {
  const c = new PixelCanvas(W, H);
  const cx = W / 2;
  const cy = H / 2;
  const clear = 92;
  const full = 250;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - cx, (y - cy) * 1.25);
      if (d < clear) continue;
      const t = Math.min(1, (d - clear) / (full - clear));
      // posterise into bands with dithered transitions
      const bands = [0, 0.25, 0.5, 0.72, 0.88];
      let level = 0;
      for (let i = 1; i < bands.length; i++) if (t >= i / (bands.length - 1) - 0.12 * (dither(x, y, 0.5) ? 1 : 0)) level = i;
      const alpha = Math.round(bands[level] * 255).toString(16).padStart(2, '0');
      const col = level >= 3 ? '#5a4a14' : level === 2 ? '#8a7420' : '#b89a30';
      if (level > 0) c.set(x, y, `${col}${alpha}`);
    }
  }
  return c;
}
