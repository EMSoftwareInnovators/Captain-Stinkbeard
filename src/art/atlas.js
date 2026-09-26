import { PixelCanvas } from './PixelCanvas.js';

/**
 * Packs named frames into one texture.
 * - GridSheet: equal-sized frames in a grid (character sheets, tiles).
 * - ShelfAtlas: mixed-size frames packed in rows (props, UI pieces).
 * Both produce { canvas, frames: { name: {x, y, w, h, ...meta} } }.
 */
export class GridSheet {
  constructor(frameWidth, frameHeight, columns = 16) {
    this.fw = frameWidth;
    this.fh = frameHeight;
    this.columns = columns;
    this.items = [];
  }

  add(name, canvas, meta = {}) {
    if (canvas.width !== this.fw || canvas.height !== this.fh) {
      throw new Error(`Frame "${name}" is ${canvas.width}x${canvas.height}, expected ${this.fw}x${this.fh}`);
    }
    this.items.push({ name, canvas, meta });
    return this;
  }

  build() {
    const cols = Math.min(this.columns, Math.max(1, this.items.length));
    const rows = Math.ceil(this.items.length / cols) || 1;
    const out = new PixelCanvas(cols * this.fw, rows * this.fh);
    const frames = {};
    this.items.forEach((it, i) => {
      const x = (i % cols) * this.fw;
      const y = Math.floor(i / cols) * this.fh;
      out.blit(it.canvas, x, y);
      frames[it.name] = { x, y, w: this.fw, h: this.fh, index: i, ...it.meta };
    });
    return { canvas: out, frames, frameWidth: this.fw, frameHeight: this.fh, columns: cols };
  }
}

export class ShelfAtlas {
  constructor(maxWidth = 1024, padding = 1) {
    this.maxWidth = maxWidth;
    this.padding = padding;
    this.items = [];
  }

  add(name, canvas, meta = {}) {
    this.items.push({ name, canvas, meta });
    return this;
  }

  build() {
    const pad = this.padding;
    // Tallest first gives tighter shelves.
    const sorted = [...this.items].sort((a, b) => b.canvas.height - a.canvas.height || a.name.localeCompare(b.name));
    let x = 0;
    let y = 0;
    let shelf = 0;
    let usedW = 0;
    const placed = [];
    for (const it of sorted) {
      const w = it.canvas.width;
      const h = it.canvas.height;
      if (x > 0 && x + w > this.maxWidth) {
        x = 0;
        y += shelf + pad;
        shelf = 0;
      }
      placed.push({ it, x, y });
      x += w + pad;
      usedW = Math.max(usedW, x);
      shelf = Math.max(shelf, h);
    }
    const out = new PixelCanvas(Math.max(1, usedW), Math.max(1, y + shelf));
    const frames = {};
    for (const { it, x: px, y: py } of placed) {
      out.blit(it.canvas, px, py);
      frames[it.name] = { x: px, y: py, w: it.canvas.width, h: it.canvas.height, ...it.meta };
    }
    return { canvas: out, frames };
  }
}
