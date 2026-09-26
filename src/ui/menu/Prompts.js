import { addPanel } from '../Panel.js';
import { addText, setText, centerText, UI_COLORS } from '../text.js';
import { ListMenu } from '../ListMenu.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../../config/constants.js';

/**
 * Small modal prompts used by the pause menu and shops. Each exposes
 * update(input) and resolves its promise when closed.
 */

/** Yes/No (or custom options) question. Resolves with the chosen value, or `cancelValue`. */
export class ConfirmPrompt {
  constructor(scene, { text, options = [{ label: 'Yes', value: true }, { label: 'No', value: false }], cancelValue = false, index = 1, depth = 600 }) {
    this.scene = scene;
    const body = addText(scene, 0, 0, text, { maxWidth: 200, depth: depth + 1 });
    const lines = body.text.split('\n').length;
    const w = Math.max(140, body.textWidth + 28);
    const h = 16 + lines * 11 + options.length * 12 + 10;
    const x = Math.round((SCREEN_WIDTH - w) / 2);
    const y = Math.round((SCREEN_HEIGHT - h) / 2);
    this.parts = [addPanel(scene, x, y, w, h, { depth }), body];
    body.setPosition(x + 14, y + 9);
    this.promise = new Promise((resolve) => {
      this.menu = new ListMenu(scene, {
        x: x + 30,
        y: y + 14 + lines * 11,
        width: w - 44,
        rows: options.length,
        depth: depth + 1,
        items: options,
        index,
        onSelect: (item) => this.close(resolve, item.value),
        onCancel: () => this.close(resolve, cancelValue),
      });
    });
  }

  close(resolve, value) {
    this.menu.destroy();
    this.parts.forEach((p) => p.destroy());
    this.closed = true;
    resolve(value);
  }

  update(input) {
    if (!this.closed) this.menu.update(input);
  }
}

/** Quantity picker: left/right ±1, up/down ±10. Resolves with a count, or 0 on cancel. */
export class QuantityPrompt {
  constructor(scene, { title, max, unitPrice = 0, priceLabel = 'Total', depth = 600, describe = null }) {
    this.scene = scene;
    this.app = scene.game.app;
    this.max = Math.max(1, max);
    this.count = 1;
    this.unitPrice = unitPrice;
    this.priceLabel = priceLabel;
    this.describe = describe;
    const w = 168;
    const h = 58;
    const x = Math.round((SCREEN_WIDTH - w) / 2);
    const y = Math.round((SCREEN_HEIGHT - h) / 2);
    this.parts = [addPanel(scene, x, y, w, h, { depth })];
    const head = addText(scene, 0, y + 7, title, { font: 'bold', color: UI_COLORS.heading, depth: depth + 1 });
    centerText(head, x + w / 2);
    this.countText = addText(scene, 0, y + 24, '', { font: 'bold', depth: depth + 1 });
    this.totalText = addText(scene, 0, y + 40, '', { depth: depth + 1 });
    this.parts.push(head, this.countText, this.totalText);
    this.cx = x + w / 2;
    this.render();
    this.promise = new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  render() {
    setText(this.countText, `◀  ×${this.count}  ▶`);
    centerText(this.countText, this.cx);
    const extra = this.describe ? this.describe(this.count) : `${this.priceLabel}: <y>${this.count * this.unitPrice}</> gold`;
    setText(this.totalText, extra);
    centerText(this.totalText, this.cx);
  }

  update(input) {
    if (this.closed) return;
    let d = 0;
    if (input.repeat('right')) d = 1;
    if (input.repeat('left')) d = -1;
    if (input.repeat('up')) d = 10;
    if (input.repeat('down')) d = -10;
    if (d) {
      const next = Math.max(1, Math.min(this.max, this.count + d));
      if (next !== this.count) {
        this.count = next;
        this.app.audio.ui('cursor');
        this.render();
      }
    }
    if (input.pressed('confirm')) {
      input.consume('confirm');
      this.finish(this.count);
    } else if (input.pressed('cancel')) {
      input.consume('cancel');
      this.app.audio.ui('cancel');
      this.finish(0);
    }
  }

  finish(value) {
    this.closed = true;
    this.parts.forEach((p) => p.destroy());
    this.resolve(value);
  }
}
