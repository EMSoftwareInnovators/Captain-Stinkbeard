import { hash32 } from '../../core/Rng.js';

/** Deterministic pseudo-random in [0,1) for texture detail. */
export function rand(seed, ...k) {
  return hash32(seed, ...k) / 4294967296;
}

/**
 * Vertical planks (deck boards running fore–aft).
 * ramp: [seam, dark, base, light, highlight]
 */
export function planksV(c, ramp, { seed = 'v', plank = 4, x0 = 0, y0 = 0, w = 16, h = 16, joints = true } = {}) {
  const [seam, dark, base, light, hi] = ramp;
  for (let px = 0; px < w; px += plank) {
    const idx = Math.floor((x0 + px) / plank);
    const tone = rand(seed, 'tone', idx);
    const fill = tone < 0.3 ? dark : tone > 0.8 ? light : base;
    for (let y = 0; y < h; y++) {
      for (let i = 0; i < plank; i++) {
        let col = fill;
        if (i === 0) col = hi;
        if (i === plank - 1) col = seam;
        c.set(x0 + px + i, y0 + y, col);
      }
    }
    if (joints) {
      const jy = Math.floor(rand(seed, 'joint', idx) * h);
      if (rand(seed, 'has', idx) < 0.6) {
        for (let i = 0; i < plank - 1; i++) c.set(x0 + px + i, y0 + jy, seam);
        c.set(x0 + px + 1, y0 + ((jy + 1) % h), dark);
        if (plank >= 4) {
          c.set(x0 + px + 1, y0 + ((jy + h - 2) % h), seam);
          c.set(x0 + px + 1, y0 + ((jy + 2) % h), seam);
        }
      }
    }
  }
}

/** Horizontal planks (interior floors, wall boards). */
export function planksH(c, ramp, { seed = 'h', plank = 4, x0 = 0, y0 = 0, w = 16, h = 16, joints = true } = {}) {
  const [seam, dark, base, light, hi] = ramp;
  for (let py = 0; py < h; py += plank) {
    const idx = Math.floor((y0 + py) / plank);
    const tone = rand(seed, 'tone', idx);
    const fill = tone < 0.3 ? dark : tone > 0.8 ? light : base;
    for (let x = 0; x < w; x++) {
      for (let j = 0; j < plank; j++) {
        let col = fill;
        if (j === 0) col = hi;
        if (j === plank - 1) col = seam;
        c.set(x0 + x, y0 + py + j, col);
      }
    }
    if (joints && rand(seed, 'has', idx) < 0.7) {
      const jx = Math.floor(rand(seed, 'joint', idx) * w);
      for (let j = 0; j < plank - 1; j++) c.set(x0 + jx, y0 + py + j, seam);
      c.set(x0 + ((jx + 1) % w), y0 + py + 1, dark);
    }
  }
}

/** Sparse specks for grain/grime. */
export function specks(c, colors, density, seed, { x0 = 0, y0 = 0, w = 16, h = 16 } = {}) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = rand(seed, 'speck', x, y);
      if (r < density) c.set(x0 + x, y0 + y, colors[Math.floor(rand(seed, 'col', x, y) * colors.length)]);
    }
  }
}

/** Darkens pixels along an edge to fake a soft shadow (dithered falloff). */
export function edgeShadow(c, side, depth, color, { x0 = 0, y0 = 0, w = 16, h = 16 } = {}) {
  for (let d = 0; d < depth; d++) {
    for (let t = 0; t < (side === 'left' || side === 'right' ? h : w); t++) {
      if (d > 0 && (t + d) % (d + 1) !== 0) continue;
      let x;
      let y;
      if (side === 'left') { x = x0 + d; y = y0 + t; }
      if (side === 'right') { x = x0 + w - 1 - d; y = y0 + t; }
      if (side === 'top') { x = x0 + t; y = y0 + d; }
      if (side === 'bottom') { x = x0 + t; y = y0 + h - 1 - d; }
      c.set(x, y, color);
    }
  }
}
