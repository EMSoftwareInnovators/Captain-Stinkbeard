import { addText, UI_COLORS } from '../text.js';

/**
 * Horizontal tabs switched with left/right or the page buttons (Q/E, LB/RB).
 * Renders "‹ Supplies  Key Items  Gear ›" with the active tab highlighted.
 */
export class TabBar {
  constructor(scene, { x, y, width, tabs, index = 0, depth = 10, onChange }) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.tabs = tabs;
    this.index = index;
    this.depth = depth;
    this.onChange = onChange;
    this.parts = [];
    this.render();
  }

  render() {
    this.parts.forEach((p) => p.destroy());
    this.parts = [];
    const gap = 12;
    const labels = this.tabs.map((t) => t.label);
    const widths = labels.map((l) => {
      const t = addText(this.scene, 0, 0, l, { depth: this.depth });
      const w = t.textWidth;
      t.destroy();
      return w;
    });
    const total = widths.reduce((a, b) => a + b, 0) + gap * (labels.length - 1);
    let x = Math.round(this.x + (this.width - total) / 2);
    const left = addText(this.scene, this.x + 2, this.y, '{btn:pageLeft}', { depth: this.depth });
    const right = addText(this.scene, 0, this.y, '{btn:pageRight}', { depth: this.depth });
    right.x = this.x + this.width - right.textWidth - 2;
    this.parts.push(left, right);
    labels.forEach((l, i) => {
      const active = i === this.index;
      const t = addText(this.scene, x, this.y, l, { color: active ? UI_COLORS.gold : UI_COLORS.dim, depth: this.depth });
      this.parts.push(t);
      if (active) this.parts.push(this.scene.add.rectangle(x, this.y + 10, widths[i], 1, UI_COLORS.gold).setOrigin(0).setDepth(this.depth));
      x += widths[i] + gap;
    });
  }

  get current() {
    return this.tabs[this.index];
  }

  /** Handles tab switching. Returns true if the tab changed. */
  update(input, { useArrows = false } = {}) {
    let d = 0;
    if (input.pressed('pageLeft') || (useArrows && input.repeat('left'))) d = -1;
    if (input.pressed('pageRight') || (useArrows && input.repeat('right'))) d = 1;
    if (!d) return false;
    input.consume('pageLeft');
    input.consume('pageRight');
    this.index = (this.index + d + this.tabs.length) % this.tabs.length;
    this.scene.game.app.audio.ui('cursor');
    this.render();
    this.onChange?.(this.current, this.index);
    return true;
  }

  destroy() {
    this.parts.forEach((p) => p.destroy());
    this.parts = [];
  }
}
