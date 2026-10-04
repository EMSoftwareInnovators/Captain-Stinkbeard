import { addText, setText, UI_COLORS } from './text.js';

/**
 * Vertical menu list navigated with up/down (auto-repeat), confirm and cancel.
 * Controller/keyboard only — no mouse required.
 *
 *   const menu = new ListMenu(scene, { x, y, width, rows: 6, items, onSelect, onCancel });
 *   // each frame while focused:
 *   menu.update(input);
 *
 * Items: { label, value?, disabled?, right?, icon?, color? }. A label too long
 * for its row is cut short with "…" (the item is marked `clipped`, so a
 * page can show it whole somewhere else).
 */
export class ListMenu {
  constructor(scene, opts) {
    this.scene = scene;
    this.x = opts.x;
    this.y = opts.y;
    this.width = opts.width ?? 100;
    this.rows = opts.rows ?? 8;
    this.rowHeight = opts.rowHeight ?? 12;
    this.depth = opts.depth ?? 10;
    this.onSelect = opts.onSelect ?? (() => {});
    this.onCancel = opts.onCancel ?? null;
    this.onChange = opts.onChange ?? null;
    this.wrapAround = opts.wrap ?? true;
    this.iconOffset = opts.iconOffset ?? 0;
    this.sound = opts.sound ?? true;
    this.index = 0;
    this.scroll = 0;
    this.focused = true;
    this.visible = true;
    this.rowObjects = [];
    this.cursor = scene.add.image(this.x - 14, this.y, 'ui', 'cursor').setOrigin(0, 0).setDepth(this.depth + 2);
    this.cursorTween = scene.tweens.add({ targets: this.cursor, x: '-=2', duration: 280, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.upArrow = scene.add.bitmapText(this.x + this.width - 8, this.y - 9, 'main', '▲', 11).setDepth(this.depth + 1).setTint(UI_COLORS.gold);
    this.downArrow = scene.add.bitmapText(this.x + this.width - 8, this.y + this.rows * this.rowHeight - 3, 'main', '▼', 11).setDepth(this.depth + 1).setTint(UI_COLORS.gold);
    this.setItems(opts.items ?? [], opts.index ?? 0);
  }

  setItems(items, index = this.index) {
    this.items = items;
    this.index = Math.max(0, Math.min(index, items.length - 1));
    this.ensureVisible();
    this.render();
  }

  get selected() {
    return this.items[this.index];
  }

  ensureVisible() {
    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + this.rows) this.scroll = this.index - this.rows + 1;
    this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, this.items.length - this.rows)));
  }

  clearRows() {
    for (const r of this.rowObjects) r.forEach((o) => o.destroy());
    this.rowObjects = [];
  }

  render() {
    this.clearRows();
    const end = Math.min(this.items.length, this.scroll + this.rows);
    for (let i = this.scroll; i < end; i++) {
      const item = this.items[i];
      const y = this.y + (i - this.scroll) * this.rowHeight;
      const objs = [];
      let x = this.x;
      if (item.icon) {
        objs.push(this.scene.add.image(x, y - 3 + this.iconOffset, 'ui', `icon_${item.icon}`).setOrigin(0, 0).setDepth(this.depth + 1).setVisible(this.visible));
        x += 18;
      }
      const color = item.disabled ? UI_COLORS.disabled : item.color ?? UI_COLORS.text;
      let rightW = 0;
      if (item.right !== undefined && item.right !== null && item.right !== '') {
        const r = addText(this.scene, 0, y, String(item.right), { color: item.disabled ? UI_COLORS.disabled : item.rightColor ?? UI_COLORS.text, depth: this.depth + 1 });
        r.x = this.x + this.width - r.textWidth - 2;
        r.setVisible(this.visible);
        objs.push(r);
        rightW = r.textWidth + 6;
      }
      // A label too long for the row ends in "…" (clear of the value on the right, and the scroll arrows if it scrolls).
      const arrows = this.items.length > this.rows ? 10 : 2;
      const room = this.x + this.width - x - Math.max(rightW, arrows);
      const label = addText(this.scene, x, y, item.label, { color, depth: this.depth + 1, clipWidth: room }).setVisible(this.visible);
      item.clipped = label.truncated;
      objs.push(label);
      this.rowObjects.push(objs);
    }
    this.updateCursor();
  }

  updateCursor() {
    const row = this.index - this.scroll;
    this.cursor.y = this.y + row * this.rowHeight - 1;
    this.cursor.setVisible(this.visible && this.items.length > 0);
    this.cursor.setAlpha(this.focused ? 1 : 0.45);
    if (this.focused) this.cursorTween.resume();
    else this.cursorTween.pause();
    this.upArrow.setVisible(this.visible && this.scroll > 0);
    this.downArrow.setVisible(this.visible && this.scroll + this.rows < this.items.length);
  }

  setFocused(f) {
    this.focused = f;
    this.updateCursor();
  }

  setVisible(v) {
    this.visible = v;
    this.rowObjects.forEach((r) => r.forEach((o) => o.setVisible(v)));
    this.updateCursor();
  }

  move(delta) {
    if (this.items.length === 0) return;
    let next = this.index + delta;
    if (this.wrapAround) next = (next + this.items.length) % this.items.length;
    else next = Math.max(0, Math.min(this.items.length - 1, next));
    if (next === this.index) return;
    this.index = next;
    const before = this.scroll;
    this.ensureVisible();
    if (before !== this.scroll) this.render();
    else this.updateCursor();
    if (this.sound) this.scene.game.app.audio.ui('cursor');
    this.onChange?.(this.selected, this.index);
  }

  /** Handles input for this frame. Returns true if it consumed something. */
  update(input) {
    if (!this.focused || !this.visible) return false;
    if (input.repeat('up')) {
      this.move(-1);
      return true;
    }
    if (input.repeat('down')) {
      this.move(1);
      return true;
    }
    if (input.pressed('confirm')) {
      input.consume('confirm');
      const item = this.selected;
      if (!item) return true;
      if (item.disabled) {
        this.scene.game.app.audio.ui('buzzer');
        return true;
      }
      if (this.sound) this.scene.game.app.audio.ui('confirm');
      this.onSelect(item, this.index);
      return true;
    }
    if (input.pressed('cancel') && this.onCancel) {
      input.consume('cancel');
      if (this.sound) this.scene.game.app.audio.ui('cancel');
      this.onCancel();
      return true;
    }
    return false;
  }

  refreshLabels() {
    this.render();
  }

  destroy() {
    this.clearRows();
    this.cursorTween.remove();
    this.cursor.destroy();
    this.upArrow.destroy();
    this.downArrow.destroy();
  }
}

export { setText };
