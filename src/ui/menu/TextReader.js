import { addPanel } from '../Panel.js';
import { addText, centerText, UI_COLORS } from '../text.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../../config/constants.js';

const LINE = 11;

/**
 * The whole of something too long for its corner of a menu page (a log
 * entry's notes, an item's description, a quest's story so far), over the
 * menu, a page at a time: left and right turn pages, Confirm or Cancel
 * closes. `paragraphs` are markup strings; one that's taller than a page is
 * cut to fit it.
 */
export class TextReader {
  constructor(scene, { title, paragraphs, depth = 880, closeLabel = null }) {
    this.scene = scene;
    this.app = scene.game.app;
    this.depth = depth;
    this.title = title;
    this.closeLabel = closeLabel;
    this.box = { x: 16, y: 10, w: SCREEN_WIDTH - 32, h: SCREEN_HEIGHT - 20 };
    this.frame = [];
    this.parts = [];
    this.lock = 180;
    const { x, y, w, h } = this.box;
    this.frame.push(scene.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x05040a, 0.75).setOrigin(0).setDepth(depth));
    this.frame.push(addPanel(scene, x, y, w, h, { depth: depth + 1 }));
    this.frame.push(addText(scene, x + 12, y + 8, title, { font: 'bold', color: UI_COLORS.heading, depth: depth + 2, clipWidth: w - 24 }));
    this.top = y + 24;
    this.bottom = y + h - 18;
    this.pages = this.paginate(paragraphs);
    this.page = 0;
    this.render();
    this.app.audio.ui('menu_open');
  }

  /** Splits the paragraphs into pages that fit between the title and the footer. */
  paginate(paragraphs) {
    const width = this.box.w - 24;
    const maxLines = Math.floor((this.bottom - this.top) / LINE);
    const pages = [[]];
    let used = 0;
    for (const p of paragraphs) {
      if (!p) continue;
      const probe = addText(this.scene, -1000, -1000, p, { maxWidth: width });
      const lines = probe.text.split('\n').length;
      probe.destroy();
      const need = Math.min(lines, maxLines) + (used ? 0.5 : 0);
      if (used && used + need > maxLines) {
        pages.push([]);
        used = 0;
      }
      pages[pages.length - 1].push({ text: p, lines: Math.min(lines, maxLines) });
      used += Math.min(lines, maxLines) + 0.5;
    }
    return pages;
  }

  render() {
    this.parts.forEach((p) => p.destroy());
    this.parts = [];
    const { x, w } = this.box;
    let y = this.top;
    for (const p of this.pages[this.page]) {
      const t = addText(this.scene, x + 12, y, p.text, { maxWidth: w - 24, maxLines: p.lines, depth: this.depth + 2 });
      this.parts.push(t);
      y += p.lines * LINE + Math.round(LINE / 2);
    }
    // The footer: which page, and how to leave.
    const n = this.pages.length;
    const turn = n > 1 ? `{btn:left}{btn:right} Page ${this.page + 1}/${n}    ` : '';
    const footer = addText(this.scene, 0, this.box.y + this.box.h - 14, `${turn}{btn:confirm} ${this.closeLabel ?? 'Close'}`, { depth: this.depth + 2, color: UI_COLORS.dim });
    centerText(footer, SCREEN_WIDTH / 2);
    this.parts.push(footer);
  }

  /** Returns 'close' when the reader is done (Confirm or Cancel). */
  update(input, delta = 16) {
    this.lock -= delta;
    if (this.lock > 0) return null;
    const n = this.pages.length;
    if (n > 1 && (input.repeat('right') || input.repeat('down') || input.pressed('pageRight'))) {
      input.consume('pageRight');
      if (this.page < n - 1) {
        this.page += 1;
        this.app.audio.ui('cursor');
        this.render();
      }
      return null;
    }
    if (n > 1 && (input.repeat('left') || input.repeat('up') || input.pressed('pageLeft'))) {
      input.consume('pageLeft');
      if (this.page > 0) {
        this.page -= 1;
        this.app.audio.ui('cursor');
        this.render();
      }
      return null;
    }
    if (input.pressed('confirm') || input.pressed('cancel')) {
      const how = input.pressed('confirm') ? 'confirm' : 'cancel';
      input.consume('confirm');
      input.consume('cancel');
      this.app.audio.ui('cancel');
      return how;
    }
    return null;
  }

  destroy() {
    this.parts.forEach((p) => p.destroy());
    this.frame.forEach((p) => p.destroy());
    this.parts = [];
    this.frame = [];
  }
}
