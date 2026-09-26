import { addPanel } from '../Panel.js';
import { addText, centerText, UI_COLORS } from '../text.js';
import { ListMenu } from '../ListMenu.js';
import { formatPlayTime } from '../../core/util.js';
import { AUTOSAVE_SLOT } from '../../config/constants.js';

/**
 * Save-slot browser. mode 'load' lists the autosave and three manual slots;
 * mode 'save' lists the manual slots only and confirms overwrites.
 */
export class SaveLoadPanel {
  constructor(scene, { mode, onPick, onClose, depth = 300 }) {
    this.scene = scene;
    this.app = scene.game.app;
    this.mode = mode;
    this.onPick = onPick;
    this.onClose = onClose;
    this.depth = depth;
    this.parts = [];
    this.build();
  }

  slotLabel(info) {
    const name = info.slot === AUTOSAVE_SLOT ? 'Autosave' : `Slot ${info.slot}`;
    if (info.status === 'empty') return { label: `${name}  <k>- empty -</>`, disabled: this.mode === 'load' };
    if (info.status !== 'ok') return { label: `${name}  <r>${info.status === 'incompatible' ? 'Incompatible' : 'Damaged'}</>`, disabled: this.mode === 'load' };
    const s = info.summary;
    return { label: `${name}  <y>${s.location}</>`, right: `Lv${s.level} ${formatPlayTime(s.playTime)}` };
  }

  build() {
    const s = this.scene;
    const slots = this.app.saves.listSlots().filter((i) => this.mode === 'load' || i.slot !== AUTOSAVE_SLOT);
    const x = 28;
    const y = 40;
    const w = 264;
    const h = 30 + slots.length * 16 + 24;
    this.parts.push(addPanel(s, x, y, w, h, { depth: this.depth }));
    const title = addText(s, 0, y + 8, this.mode === 'load' ? 'LOAD GAME' : 'SAVE GAME', { font: 'bold', color: UI_COLORS.heading, depth: this.depth + 1 });
    centerText(title, x + w / 2);
    this.parts.push(title);
    this.detail = addText(s, x + 12, y + h - 16, '', { color: UI_COLORS.dim, depth: this.depth + 1 });
    this.parts.push(this.detail);
    this.slots = slots;
    this.menu = new ListMenu(s, {
      x: x + 22,
      y: y + 28,
      width: w - 34,
      rows: slots.length,
      rowHeight: 16,
      depth: this.depth + 1,
      items: slots.map((info) => ({ ...this.slotLabel(info), value: info })),
      onSelect: (item) => this.pick(item.value),
      onCancel: () => this.close(),
      onChange: (item) => this.describe(item.value),
    });
    this.describe(slots[0]);
  }

  describe(info) {
    let text = '';
    if (info.status === 'ok') {
      const d = info.savedAt ? new Date(info.savedAt) : null;
      text = `${info.summary.chapter}  ${d ? d.toLocaleDateString() + ' ' + d.toLocaleTimeString().slice(0, 5) : ''}`;
    } else if (info.status !== 'empty') text = info.reason ?? '';
    this.detail.setText(text);
  }

  pick(info) {
    if (this.mode === 'save' && info.status !== 'empty') {
      this.confirmOverwrite(info);
      return;
    }
    this.onPick(info.slot);
  }

  confirmOverwrite(info) {
    const s = this.scene;
    this.menu.setFocused(false);
    const panel = addPanel(s, 96, 150, 128, 44, { depth: this.depth + 5 });
    const q = addText(s, 106, 156, 'Overwrite this save?', { depth: this.depth + 6 });
    this.confirm = new ListMenu(s, {
      x: 124,
      y: 170,
      width: 80,
      rows: 2,
      rowHeight: 10,
      depth: this.depth + 6,
      items: [{ label: 'Yes' }, { label: 'No' }],
      onSelect: (_i, idx) => {
        this.closeConfirm([panel, q]);
        if (idx === 0) this.onPick(info.slot);
      },
      onCancel: () => this.closeConfirm([panel, q]),
    });
  }

  closeConfirm(parts) {
    this.confirm.destroy();
    this.confirm = null;
    parts.forEach((p) => p.destroy());
    this.menu.setFocused(true);
  }

  update(input) {
    if (this.confirm) this.confirm.update(input);
    else this.menu.update(input);
  }

  refresh() {
    const idx = this.menu.index;
    this.destroy();
    this.parts = [];
    this.build();
    this.menu.setItems(this.menu.items, idx);
  }

  close() {
    this.destroy();
    this.onClose?.();
  }

  destroy() {
    this.menu?.destroy();
    this.confirm?.destroy();
    this.parts.forEach((p) => p.destroy());
  }
}
