import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';

/**
 * Drawing kit for 3/4-view props: boxes (top + front face), cylinders
 * (barrels, masts), planks and bands. Light comes from the upper left.
 */
export const WOOD = { d: PAL.wood1, m: PAL.wood2, b: PAL.wood3, l: PAL.wood4, h: PAL.wood5 };
export const DWOOD = { d: PAL.hull1, m: PAL.hull2, b: PAL.hull3, l: PAL.hull4, h: '#8e664a' };
export const LWOOD = { d: PAL.deck1, m: PAL.deck2, b: PAL.deck3, l: PAL.deck4, h: PAL.deck5 };
export const IRON = { d: PAL.iron0, m: PAL.iron1, b: PAL.iron2, l: PAL.iron3, h: PAL.iron4 };
export const GOLD = { d: PAL.gold0, m: PAL.gold1, b: PAL.gold2, l: PAL.gold3, h: PAL.gold4 };
export const INK = PAL.ink;

export function canvas(w, h) {
  return new PixelCanvas(w, h);
}

/**
 * Box seen in 3/4 view. (x, y) is the top-left of the top face; `depth` is
 * the top face height, `h` the front face height.
 */
export function box(c, x, y, w, depth, h, r, { planks = 0, frame = true } = {}) {
  // top face
  for (let j = 0; j < depth; j++) {
    for (let i = 0; i < w; i++) {
      let col = r.l;
      if (j === 0 || i === 0) col = r.h;
      if (i === w - 1) col = r.b;
      c.set(x + i, y + j, col);
    }
  }
  // front face
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let col = r.b;
      if (i === 0) col = r.l;
      if (i >= w - 2) col = r.m;
      if (j === h - 1) col = r.d;
      if (planks && j % planks === planks - 1 && j < h - 1) col = r.m;
      c.set(x + i, y + depth + j, col);
    }
  }
  if (frame) {
    c.hline(x, x + w - 1, y + depth, r.d);
    c.hline(x, x + w - 1, y + depth + 1, r.h);
  }
}

/** Upright cylinder: elliptical top, shaded body. */
export function cylinder(c, cx, top, bottom, rx, r, { ry = 3, bands = [], bandColor = null, topColor = null } = {}) {
  for (let y = top + ry; y <= bottom; y++) {
    for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) {
      const u = (x - (cx - rx)) / (2 * rx);
      let col = r.b;
      if (u < 0.18) col = r.l;
      if (u < 0.08) col = r.h;
      if (u > 0.7) col = r.m;
      if (u > 0.88) col = r.d;
      c.set(x, y, col);
    }
  }
  // bottom curve shadow
  for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) c.set(x, bottom, r.d);
  for (const by of bands) {
    for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) {
      const u = (x - (cx - rx)) / (2 * rx);
      c.set(x, by, u < 0.2 ? (bandColor?.l ?? IRON.l) : u > 0.75 ? (bandColor?.d ?? IRON.d) : (bandColor?.b ?? IRON.b));
      c.set(x, by + 1, bandColor?.d ?? IRON.m);
    }
  }
  c.ellipse(cx, top + ry, rx, ry, topColor ?? r.l);
  c.ellipseOutline(cx, top + ry, rx, ry, r.m);
}

export function outline(c, color = INK) {
  c.outline(color);
  return c;
}

/** Soft contact shadow painted under props (semi-transparent). */
export function groundShadow(c, cx, cy, rx, ry) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1 && !c.alphaAt(x, y)) c.set(x, y, '#0c0a1060');
    }
  }
}

export { PAL };
