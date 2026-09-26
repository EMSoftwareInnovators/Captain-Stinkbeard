import { rgba, unpack, pack } from './palette.js';

/**
 * A plain RGBA pixel buffer with pixel-art drawing helpers.
 *
 * Deliberately independent of the DOM and Phaser: the same painters run in
 * the browser (converted to textures at boot) and in Node (exported to PNG by
 * tools/export-assets.mjs).
 */
export class PixelCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
    this.px = new Uint32Array(this.data.buffer);
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x, y) {
    x |= 0;
    y |= 0;
    return this.inBounds(x, y) ? this.px[y * this.width + x] : 0;
  }

  alphaAt(x, y) {
    return this.get(x, y) >>> 24;
  }

  /** Sets a pixel. `c` may be a palette string or packed uint32. Transparent writes clear. */
  set(x, y, c) {
    x |= 0;
    y |= 0;
    if (!this.inBounds(x, y)) return;
    this.px[y * this.width + x] = rgba(c);
  }

  /** Sets a pixel only where it is currently opaque (paint inside a shape). */
  setIfOpaque(x, y, c) {
    if (this.alphaAt(x, y) > 0) this.set(x, y, c);
  }

  /** Alpha-blends a colour over the pixel (for soft shadows/glows). */
  blend(x, y, c, alpha = 1) {
    x |= 0;
    y |= 0;
    if (!this.inBounds(x, y)) return;
    const src = unpack(rgba(c));
    const a = (src.a / 255) * alpha;
    if (a <= 0) return;
    const i = y * this.width + x;
    const dst = unpack(this.px[i]);
    const outA = a + (dst.a / 255) * (1 - a);
    if (outA <= 0) return;
    const ch = (s, d) => Math.round((s * a + d * (dst.a / 255) * (1 - a)) / outA);
    this.px[i] = pack(ch(src.r, dst.r), ch(src.g, dst.g), ch(src.b, dst.b), Math.round(outA * 255));
  }

  fill(c) {
    this.px.fill(rgba(c));
    return this;
  }

  rect(x, y, w, h, c) {
    const v = rgba(c);
    for (let j = Math.max(0, y); j < Math.min(this.height, y + h); j++) {
      for (let i = Math.max(0, x); i < Math.min(this.width, x + w); i++) this.px[j * this.width + i] = v;
    }
    return this;
  }

  strokeRect(x, y, w, h, c) {
    this.hline(x, x + w - 1, y, c);
    this.hline(x, x + w - 1, y + h - 1, c);
    this.vline(x, y, y + h - 1, c);
    this.vline(x + w - 1, y, y + h - 1, c);
    return this;
  }

  hline(x1, x2, y, c) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) this.set(x, y, c);
    return this;
  }

  vline(x, y1, y2, c) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) this.set(x, y, c);
    return this;
  }

  /** Bresenham line. */
  line(x0, y0, x1, y1, c) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  /** Thick line made of square brushes. */
  thickLine(x0, y0, x1, y1, size, c) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    const off = Math.floor(size / 2);
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps);
      this.rect(x - off, y - off, size, size, c);
    }
    return this;
  }

  /** Filled ellipse using a pixel-centre test (clean, symmetric pixel-art edges). */
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / (rx + 0.01);
        const ny = (y + 0.5 - cy) / (ry + 0.01);
        if (nx * nx + ny * ny <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Ellipse outline, one pixel thick. */
  ellipseOutline(cx, cy, rx, ry, c) {
    const inside = (x, y) => {
      const nx = (x + 0.5 - cx) / (rx + 0.01);
      const ny = (y + 0.5 - cy) / (ry + 0.01);
      return nx * nx + ny * ny <= 1;
    };
    for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++) {
      for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++) {
        if (inside(x, y) && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1))) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Scanline polygon fill; points = [[x,y], ...]. */
  poly(points, c) {
    const ys = points.map((p) => p[1]);
    const minY = Math.floor(Math.min(...ys));
    const maxY = Math.ceil(Math.max(...ys));
    for (let y = minY; y <= maxY; y++) {
      const sy = y + 0.5;
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        if ((y1 <= sy && y2 > sy) || (y2 <= sy && y1 > sy)) xs.push(x1 + ((sy - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Copies another canvas onto this one (transparent source pixels are skipped). */
  blit(src, dx, dy, { flipX = false, flipY = false, alpha = 1 } = {}) {
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const sx = flipX ? src.width - 1 - x : x;
        const sy = flipY ? src.height - 1 - y : y;
        const c = src.px[sy * src.width + sx];
        const a = c >>> 24;
        if (a === 0) continue;
        if (a === 255 && alpha === 1) this.set(dx + x, dy + y, c);
        else this.blend(dx + x, dy + y, c, alpha);
      }
    }
    return this;
  }

  /**
   * Draws an ASCII template: each character maps to a colour through `colors`
   * ('.' and ' ' are transparent unless mapped).
   */
  stamp(rows, dx, dy, colors, { flipX = false } = {}) {
    const width = Math.max(...rows.map((r) => r.length));
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        const c = colors[ch];
        if (c === undefined || c === null) continue;
        const px = flipX ? dx + (width - 1 - x) : dx + x;
        this.set(px, dy + y, c);
      }
    }
    return this;
  }

  /**
   * Adds a 1px outline around opaque pixels. With `inner: true` the outline is
   * drawn on the shape's own edge pixels instead of outside it.
   */
  outline(c, { diagonals = false, inner = false } = {}) {
    const w = this.width;
    const h = this.height;
    const src = new Uint32Array(this.px);
    const opaque = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] >>> 24 > 0;
    const color = rgba(c);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const self = opaque(x, y);
        if (inner ? !self : self) continue;
        const test = inner ? (a, b) => !opaque(a, b) : (a, b) => opaque(a, b);
        let edge = test(x - 1, y) || test(x + 1, y) || test(x, y - 1) || test(x, y + 1);
        if (!edge && diagonals) edge = test(x - 1, y - 1) || test(x + 1, y - 1) || test(x - 1, y + 1) || test(x + 1, y + 1);
        if (edge) this.px[y * w + x] = color;
      }
    }
    return this;
  }

  /** Replaces one exact colour with another. */
  replace(from, to) {
    const a = rgba(from);
    const b = rgba(to);
    for (let i = 0; i < this.px.length; i++) if (this.px[i] === a) this.px[i] = b;
    return this;
  }

  /** Remaps colours via a { fromColor: toColor } table (palette swap). */
  remap(table) {
    const map = new Map(Object.entries(table).map(([k, v]) => [rgba(k), rgba(v)]));
    for (let i = 0; i < this.px.length; i++) {
      const m = map.get(this.px[i]);
      if (m !== undefined) this.px[i] = m;
    }
    return this;
  }

  /** Ordered 2x2 checker dither between two colours inside a rect. */
  dither(x, y, w, h, c1, c2, phase = 0) {
    for (let j = y; j < y + h; j++) {
      for (let i = x; i < x + w; i++) this.set(i, j, (i + j + phase) % 2 === 0 ? c1 : c2);
    }
    return this;
  }

  clone() {
    const c = new PixelCanvas(this.width, this.height);
    c.px.set(this.px);
    return c;
  }

  crop(x, y, w, h) {
    const c = new PixelCanvas(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) c.px[j * w + i] = this.get(x + i, y + j);
    return c;
  }

  /** Bounding box of opaque pixels (or null when empty). */
  bounds() {
    let minX = this.width, minY = this.height, maxX = -1, maxY = -1;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.px[y * this.width + x] >>> 24) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  /** Number of distinct opaque colours (for retro palette budgeting). */
  colorCount() {
    const set = new Set();
    for (const c of this.px) if (c >>> 24) set.add(c);
    return set.size;
  }
}
