import { addPanel } from '../Panel.js';
import { addText, UI_COLORS } from '../text.js';
import { ListMenu } from '../ListMenu.js';
import { UiLayer } from './UiLayer.js';
import { TabBar } from './TabBar.js';
import { applyEffects, wouldAffect, itemUsableIn } from '../../systems/effects/effects.js';
import { resolveVariant } from '../../systems/story/progress.js';
import { classOf, storeIds, gearDef } from '../../systems/ship/supplies.js';
import { effectNote } from '../../systems/ship/supplyResponse.js';

const TABS = [
  // Repair materials (overhaul Prompt 5) are listed with the supplies, after them, and greyed: they're used up by repairs (Pause > Ship).
  { id: 'consumable', label: 'Supplies', also: ['material'] },
  { id: 'key', label: 'Key Items' },
  { id: 'equipment', label: 'Gear' },
];

/**
 * Inventory: supplies (usable in the field), key items and spare gear.
 * Confirm on a supply uses it on a party member.
 */
export class ItemsPage {
  constructor(scene, rect) {
    this.scene = scene;
    this.app = scene.game.app;
    this.rect = rect;
    this.layer = new UiLayer(scene);
    this.tabIndex = 0;
    this.index = 0;
    this.menu = null;
    this.tabs = null;
    this.focused = false;
    this.targetMenu = null;
  }

  get session() {
    return this.app.session;
  }

  entries() {
    const tab = TABS[this.tabIndex];
    const list = [tab.id, ...(tab.also ?? [])].flatMap((type) => this.session.inventory.entries({ type }));
    // Story Phase 11: an item can read differently as the story goes ("variants": a fragile booklet wearing out).
    return list.map((e) => (e.def?.variants ? { ...e, def: resolveVariant(e.def, this.session) } : e));
  }

  render() {
    this.layer.clear();
    this.menu?.destroy();
    this.menu = null;
    this.tabs?.destroy();
    const { scene, layer, rect } = this;
    const D = 20;
    this.tabs = new TabBar(scene, {
      x: rect.x + 4,
      y: rect.y + 8,
      width: rect.w - 8,
      tabs: TABS,
      index: this.tabIndex,
      depth: D + 1,
      onChange: (_t, i) => {
        this.tabIndex = i;
        this.index = 0;
        this.render();
      },
    });
    const entries = this.entries();
    const listTop = rect.y + 26;
    if (!entries.length) {
      layer.add(addText(scene, rect.x + 16, listTop + 4, '<k>Nothing here.</>', { depth: D + 1 }));
    }
    const items = entries.map((e) => {
      const usable = e.def.type === 'consumable' && itemUsableIn(e.def, 'field');
      return {
        label: e.def.name,
        value: e.id,
        icon: e.def.icon,
        right: e.def.type === 'key' ? '' : `×${e.count}`,
        color: (e.def.type === 'consumable' && !usable) || e.def.type === 'material' ? UI_COLORS.dim : undefined,
      };
    });
    this.menu = new ListMenu(scene, {
      x: rect.x + 26,
      y: listTop + 4,
      width: rect.w - 36,
      rows: 8,
      rowHeight: 14,
      iconOffset: 1,
      depth: D + 1,
      items,
      index: Math.min(this.index, Math.max(0, items.length - 1)),
      onChange: (_item, i) => {
        this.index = i;
        this.describe();
      },
      onSelect: (item) => this.select(item.value),
      onCancel: () => {
        this.exitRequested = true;
      },
    });
    this.menu.setFocused(this.focused);
    this.menu.setVisible(items.length > 0);
    // Description box: under the list, down to the bottom (five lines).
    const dy = listTop + 4 + 8 * 14 + 2;
    layer.add(addPanel(scene, rect.x + 4, dy, rect.w - 8, rect.y + rect.h - 4 - dy, { style: 'inset', depth: D }));
    this.descY = dy + 6;
    this.descLines = Math.floor((rect.y + rect.h - 10 - this.descY) / 11);
    this.descText = layer.add(addText(scene, rect.x + 12, this.descY, '', { maxWidth: rect.w - 24, depth: D + 1 }));
    this.describe();
  }

  describe() {
    const e = this.entries()[this.menu?.index ?? 0];
    if (!this.descText) return;
    let text = e ? e.def.description ?? '' : TABS[this.tabIndex].id === 'key' ? 'Important things you are carrying.' : '';
    // Prompt 10: with the supplies on, what the ship's stores hold of it, and whether a piece of gear is worn.
    const sup = this.session.ship?.supplies;
    if (e && sup?.on) {
      const stored = storeIds(this.app.content).reduce((n, st) => n + sup.storeCount(st, e.id), 0);
      if (classOf(this.app.content, e.id) && e.def.type !== 'key') text += `\n<k>In the ship's stores: ${stored}.</>`;
      if (gearDef(this.app.content, e.id)) text += sup.wornGear().includes(e.id) ? '\n<g>Worn.</>' : '\n<k>Not worn: put it on with Respond.</>';
    }
    this.descText.destroy();
    this.descText = this.layer.add(addText(this.scene, this.rect.x + 12, this.descY, text, { maxWidth: this.rect.w - 24, maxLines: this.descLines, depth: 21 }));
  }

  focus() {
    this.focused = true;
    this.exitRequested = false;
    this.menu?.setFocused(true);
    return true;
  }

  blur() {
    this.focused = false;
    this.menu?.setFocused(false);
  }

  async select(itemId) {
    const def = this.app.content.items.require(itemId);
    const audio = this.app.audio;
    if (def.type !== 'consumable' || !itemUsableIn(def, 'field')) {
      audio.ui('buzzer');
      return;
    }
    const members = this.session.party.members;
    const target = members.length === 1 ? members[0] : await this.pickMember(members);
    if (!target) return;
    if (!wouldAffect(def.use?.effects, target, this.session)) {
      audio.ui('buzzer');
      this.flash('It would have no effect right now.');
      return;
    }
    this.session.inventory.remove(itemId, 1);
    const results = applyEffects(def.use.effects, target, { session: this.session });
    const healed = results.filter((r) => r.type === 'heal').reduce((s, r) => s + r.amount, 0);
    audio.sfx(def.useSfx ?? 'heal');
    this.flash(healed ? `${target.name} recovers <g>${healed}</> HP.` : `${target.name} uses the ${def.name}.`);
    // Prompt 10: food and draughts say what they started (a line of their own, a moment later).
    const note = effectNote(this.app.content, results);
    if (note) this.scene.time.delayedCall(1300, () => this.flash(note));
    // A side effect (Frog Grog) gets its own line a moment later.
    const side = results.find((r) => r.type === 'sideEffect' && r.text);
    if (side) this.scene.time.delayedCall(1300, () => this.flash(side.text));
    this.render();
    this.scene.refreshSide?.();
  }

  pickMember(members) {
    return new Promise((resolve) => {
      const { scene, rect } = this;
      const panel = addPanel(scene, rect.x + rect.w - 110, rect.y + 30, 100, 14 + members.length * 12, { depth: 60 });
      this.menu.setFocused(false);
      this.targetMenu = new ListMenu(scene, {
        x: rect.x + rect.w - 90,
        y: rect.y + 37,
        width: 76,
        rows: members.length,
        depth: 61,
        items: members.map((m) => ({ label: m.name, value: m.id, right: `${m.hp}/${m.maxHp}` })),
        onSelect: (item) => done(members.find((m) => m.id === item.value)),
        onCancel: () => done(null),
      });
      const done = (m) => {
        this.targetMenu.destroy();
        this.targetMenu = null;
        panel.destroy();
        this.menu.setFocused(true);
        resolve(m);
      };
    });
  }

  flash(text) {
    this.note?.forEach((p) => p.destroy());
    const { scene, rect } = this;
    const t = addText(scene, 0, 0, text, { depth: 71 });
    const w = t.textWidth + 16;
    const x = Math.round(rect.x + (rect.w - w) / 2);
    const y = rect.y + rect.h - 72;
    const p = addPanel(scene, x, y, w, 18, { depth: 70 });
    t.setPosition(x + 8, y + 5);
    this.note = [p, t];
    scene.time.delayedCall(1600, () => {
      p.destroy();
      t.destroy();
    });
  }

  update(input) {
    if (this.targetMenu) {
      this.targetMenu.update(input);
      return null;
    }
    if (this.tabs.update(input, { useArrows: true })) return null;
    this.menu?.update(input);
    if (this.exitRequested || (!this.menu?.visible && input.pressed('cancel'))) {
      input.consume('cancel');
      this.exitRequested = false;
      return 'exit';
    }
    return null;
  }

  destroy() {
    this.layer.clear();
    this.menu?.destroy();
    this.tabs?.destroy();
    this.targetMenu?.destroy();
    this.note?.forEach((p) => p.destroy());
  }
}
