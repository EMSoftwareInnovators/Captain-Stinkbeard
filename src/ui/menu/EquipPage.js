import { addPanel } from '../Panel.js';
import { addText, UI_COLORS } from '../text.js';
import { ListMenu } from '../ListMenu.js';
import { UiLayer } from './UiLayer.js';
import { STAT_NAMES, SLOT_NAMES } from './StatusPage.js';
import { EQUIPMENT_SLOTS, STAT_KEYS } from '../../config/constants.js';
import { equip, unequip, previewEquip, equippableItems } from '../../systems/party/equipment.js';

/**
 * Equipment: pick a slot, then an item from the inventory (or "Remove").
 * The stat column previews the change before confirming.
 */
export class EquipPage {
  constructor(scene, rect) {
    this.scene = scene;
    this.app = scene.game.app;
    this.rect = rect;
    this.layer = new UiLayer(scene);
    this.statLayer = new UiLayer(scene);
    this.slotMenu = null;
    this.itemMenu = null;
    this.itemPanel = null;
    this.memberIndex = 0;
    this.slotIndex = 0;
    this.focused = false;
  }

  get member() {
    return this.app.session.party.members[this.memberIndex];
  }

  render() {
    this.layer.clear();
    this.slotMenu?.destroy();
    const { scene, layer, rect } = this;
    const D = 20;
    const ch = this.member;
    const content = this.app.content;
    layer.add(addText(scene, rect.x + 10, rect.y + 8, ch.name, { font: 'bold', depth: D + 1 }));
    layer.add(addText(scene, rect.x + 90, rect.y + 9, `<k>Level</> ${ch.level}`, { depth: D + 1 }));
    const items = EQUIPMENT_SLOTS.map((slot) => {
      const id = ch.equipment[slot];
      const def = id ? content.items.get(id) : null;
      return { label: `<k>${SLOT_NAMES[slot]}</>`, value: slot, right: def ? def.name : '—' };
    });
    this.slotMenu = new ListMenu(scene, {
      x: rect.x + 24,
      y: rect.y + 28,
      width: rect.w - 34,
      rows: 4,
      rowHeight: 13,
      depth: D + 1,
      items,
      index: this.slotIndex,
      onChange: (_i, idx) => {
        this.slotIndex = idx;
        this.renderStats(null);
      },
      onSelect: (item) => this.openSlot(item.value),
      onCancel: () => {
        this.exitRequested = true;
      },
    });
    this.slotMenu.setFocused(this.focused);
    layer.add(addPanel(scene, rect.x + 4, rect.y + 86, rect.w - 8, rect.h - 90, { style: 'inset', depth: D }));
    this.renderStats(null);
  }

  /** Stat table; `candidate` (item id, or '' for remove) shows before → after. */
  renderStats(candidate) {
    this.statLayer.clear();
    const { scene, rect } = this;
    const D = 21;
    const ch = this.member;
    const slot = EQUIPMENT_SLOTS[this.slotIndex];
    const x = rect.x + 14;
    const y = rect.y + 94;
    const preview = candidate === null ? null : previewEquip(ch, slot, candidate || null, this.app.content.items);
    const stats = ch.stats();
    STAT_KEYS.forEach((k, i) => {
      const ry = y + i * 12;
      this.statLayer.add(addText(scene, x, ry, STAT_NAMES[k], { color: UI_COLORS.dim, depth: D }));
      const v = this.statLayer.add(addText(scene, 0, ry, String(stats[k]), { depth: D }));
      v.x = x + 86 - v.textWidth;
      if (preview) {
        const after = preview.after[k];
        const diff = preview.diff[k];
        const color = diff > 0 ? '<g>' : diff < 0 ? '<r>' : '<w>';
        this.statLayer.add(addText(scene, x + 94, ry, `▶ ${color}${after}</>`, { depth: D }));
      }
    });
    const current = ch.equipment[slot];
    const shown = candidate === null ? current : candidate;
    const def = shown ? this.app.content.items.get(shown) : null;
    const desc = def?.description ?? (candidate === '' ? 'Leave this slot empty.' : '');
    this.statLayer.add(addText(scene, x, y + 64, desc, { maxWidth: rect.w - 28, depth: D, color: 0xdcd4c4 }));
  }

  openSlot(slot) {
    const { scene, rect } = this;
    const ch = this.member;
    const inv = this.app.session.inventory;
    const options = equippableItems(ch, slot, inv).map((e) => ({ label: e.def.name, value: e.id, icon: e.def.icon, right: `×${e.count}` }));
    if (ch.equipment[slot]) options.push({ label: '<k>Remove</>', value: '' });
    if (!options.length) {
      this.app.audio.ui('buzzer');
      return;
    }
    this.slotMenu.setFocused(false);
    const rows = Math.min(5, options.length);
    const h = 12 + rows * 14;
    const panel = addPanel(scene, rect.x + 60, rect.y + 30, rect.w - 64, h, { depth: 60 });
    this.itemPanel = panel;
    this.itemMenu = new ListMenu(scene, {
      x: rect.x + 82,
      y: rect.y + 37,
      width: rect.w - 94,
      rows,
      rowHeight: 14,
      iconOffset: 1,
      depth: 61,
      items: options,
      onChange: (item) => this.renderStats(item.value),
      onSelect: (item) => this.apply(slot, item.value),
      onCancel: () => this.closeItems(),
    });
    this.renderStats(options[0].value);
  }

  apply(slot, itemId) {
    const ch = this.member;
    const inv = this.app.session.inventory;
    if (itemId) equip(ch, itemId, inv);
    else unequip(ch, slot, inv);
    this.app.audio.sfx('equip');
    this.closeItems();
    this.render();
    this.scene.refreshSide?.();
  }

  closeItems() {
    this.itemMenu?.destroy();
    this.itemMenu = null;
    this.itemPanel?.destroy();
    this.itemPanel = null;
    this.slotMenu?.setFocused(true);
    this.renderStats(null);
  }

  focus() {
    this.focused = true;
    this.exitRequested = false;
    this.slotMenu?.setFocused(true);
    return true;
  }

  blur() {
    this.focused = false;
    this.slotMenu?.setFocused(false);
  }

  update(input) {
    if (this.itemMenu) {
      this.itemMenu.update(input);
      return null;
    }
    const members = this.app.session.party.members;
    if (members.length > 1 && (input.pressed('pageLeft') || input.pressed('pageRight'))) {
      const d = input.pressed('pageRight') ? 1 : -1;
      input.consume('pageLeft');
      input.consume('pageRight');
      this.memberIndex = (this.memberIndex + d + members.length) % members.length;
      this.render();
      return null;
    }
    this.slotMenu?.update(input);
    if (this.exitRequested) {
      this.exitRequested = false;
      return 'exit';
    }
    return null;
  }

  destroy() {
    this.closeItems();
    this.layer.clear();
    this.statLayer.clear();
    this.slotMenu?.destroy();
  }
}
