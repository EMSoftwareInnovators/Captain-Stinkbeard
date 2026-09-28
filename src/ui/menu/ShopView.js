import { addPanel } from '../Panel.js';
import { addText, UI_COLORS } from '../text.js';
import { ListMenu } from '../ListMenu.js';
import { UiLayer } from './UiLayer.js';
import { QuantityPrompt } from './Prompts.js';
import { previewEquip } from '../../systems/party/equipment.js';
import { evaluateCondition } from '../../systems/conditions/conditions.js';
import { STAT_KEYS, SCREEN_WIDTH } from '../../config/constants.js';

const STAT_SHORT = { maxHp: 'HP', attack: 'ATK', defense: 'DEF', speed: 'SPD', luck: 'LCK' };

/** Sell price for an item (half its value, rounded down). Key items can't be sold. */
export function sellPrice(def) {
  if (def.type === 'key' || !def.value) return 0;
  return Math.floor(def.value / 2);
}

/** Buy price: the shop's override, else the item's value. */
export function buyPrice(shop, def) {
  return shop.prices?.[def.id] ?? def.value ?? 0;
}

/**
 * Shop screen: keeper greeting, Buy / Sell / Leave, item lists with prices,
 * a quantity prompt and equipment stat comparisons. Resolves `onClose` when
 * the player leaves.
 */
export class ShopView {
  constructor(scene, shopId, { onClose }) {
    this.scene = scene;
    this.app = scene.game.app;
    this.shop = this.app.content.shops.require(shopId);
    this.onClose = onClose;
    this.layer = new UiLayer(scene);
    this.listLayer = new UiLayer(scene);
    this.mode = 'commands';
    this.list = null;
    this.prompt = null;
    this.build();
  }

  get session() {
    return this.app.session;
  }

  build() {
    const { scene, layer } = this;
    const D = 20;
    const content = this.app.content;
    const keeper = content.npcs.get(this.shop.keeper);
    // Header: keeper portrait and greeting
    layer.add(addPanel(scene, 4, 4, SCREEN_WIDTH - 8, 58, { depth: D }));
    const portrait = keeper?.portrait ?? this.shop.keeper;
    if (portrait && scene.textures.getFrame('portraits', `${portrait}_happy`)) {
      layer.add(scene.add.image(10, 9, 'portraits', `${portrait}_happy`).setOrigin(0).setDepth(D + 1));
    } else if (portrait && scene.textures.getFrame('portraits', `${portrait}_neutral`)) {
      layer.add(scene.add.image(10, 9, 'portraits', `${portrait}_neutral`).setOrigin(0).setDepth(D + 1));
    }
    layer.add(addText(scene, 66, 10, this.shop.name, { font: 'bold', color: UI_COLORS.heading, depth: D + 1 }));
    if (keeper) layer.add(addText(scene, 66, 23, `<k>${keeper.name}</>`, { depth: D + 1 }));
    this.greeting = layer.add(addText(scene, 66, 35, this.shop.greeting ?? '', { maxWidth: SCREEN_WIDTH - 82, depth: D + 1 }));
    // Commands
    layer.add(addPanel(scene, 4, 66, 76, 50, { depth: D }));
    this.commands = new ListMenu(scene, {
      x: 24,
      y: 73,
      width: 50,
      rows: 3,
      depth: D + 1,
      items: [
        { label: 'Buy', value: 'buy' },
        { label: 'Sell', value: 'sell' },
        { label: 'Leave', value: 'leave' },
      ],
      onSelect: (item) => this.command(item.value),
      onCancel: () => this.leave(),
      onChange: (item) => this.previewList(item.value),
    });
    // Gold
    layer.add(addPanel(scene, 4, 120, 76, 34, { depth: D }));
    layer.add(scene.add.image(10, 128, 'ui', 'icon_gold').setOrigin(0).setDepth(D + 1));
    this.goldText = layer.add(addText(scene, 30, 132, '', { depth: D + 1 }));
    // List + description frames
    layer.add(addPanel(scene, 84, 66, SCREEN_WIDTH - 88, 110, { depth: D }));
    layer.add(addPanel(scene, 4, 180, SCREEN_WIDTH - 8, 40, { style: 'inset', depth: D }));
    this.refreshGold();
    this.previewList('buy');
  }

  refreshGold() {
    this.goldText.destroy();
    this.goldText = this.layer.add(addText(this.scene, 30, 132, `<y>${this.session.inventory.gold}</>`, { depth: 21 }));
  }

  entries(mode) {
    const content = this.app.content;
    const inv = this.session.inventory;
    if (mode === 'buy') {
      // Stock can follow the story: { "id": "frog_grog", "if": { … } }.
      return this.shop.items
        .filter((it) => typeof it === 'string' || !it.if || evaluateCondition(it.if, this.session))
        .map((it) => {
          const id = typeof it === 'string' ? it : it.id;
          const def = content.items.require(id);
          return { def, price: buyPrice(this.shop, def), owned: inv.count(id) };
        });
    }
    return inv.entries().filter((e) => sellPrice(e.def) > 0).map((e) => ({ def: e.def, price: sellPrice(e.def), owned: e.count }));
  }

  /** Shows the buy/sell list without focus (while choosing a command). */
  previewList(mode) {
    this.openList(mode === 'leave' ? 'buy' : mode, false);
  }

  openList(mode, focus) {
    this.list?.destroy();
    this.listLayer.clear();
    this.listMode = mode;
    const { scene } = this;
    const entries = this.entries(mode);
    const gold = this.session.inventory.gold;
    const items = entries.map((e) => ({
      label: e.def.name,
      value: e.def.id,
      icon: e.def.icon,
      right: `${e.price}`,
      rightColor: mode === 'buy' && e.price > gold ? UI_COLORS.bad : UI_COLORS.gold,
      disabled: mode === 'buy' && e.price > gold,
    }));
    this.listLayer.add(addText(scene, 104, 72, mode === 'buy' ? 'For sale' : 'Your goods', { font: 'bold', color: UI_COLORS.heading, depth: 21 }));
    const priceHead = this.listLayer.add(addText(scene, 0, 73, mode === 'buy' ? 'Price' : 'Offer', { color: UI_COLORS.dim, depth: 21 }));
    priceHead.x = SCREEN_WIDTH - 14 - priceHead.textWidth;
    if (!items.length) this.listLayer.add(addText(scene, 104, 90, '<k>Nothing to sell.</>', { depth: 21 }));
    this.list = new ListMenu(scene, {
      x: 104,
      y: 88,
      width: SCREEN_WIDTH - 118,
      rows: 6,
      rowHeight: 14,
      iconOffset: 1,
      depth: 21,
      items,
      onChange: (item) => this.describe(item.value),
      onSelect: (item) => this.transact(item.value),
      onCancel: () => this.backToCommands(),
    });
    this.list.setFocused(focus);
    this.list.setVisible(items.length > 0);
    this.describe(items[0]?.value);
  }

  describe(itemId) {
    this.desc?.forEach((d) => d.destroy());
    this.desc = [];
    if (!itemId) return;
    const def = this.app.content.items.require(itemId);
    const owned = this.session.inventory.count(itemId);
    let extra = `<k>Owned</> ${owned}`;
    if (def.type === 'equipment') {
      const ch = this.session.party.leader();
      const equipped = ch.equipment[def.slot] === itemId;
      const { diff } = previewEquip(ch, def.slot, itemId, this.app.content.items);
      const parts = STAT_KEYS.filter((k) => diff[k]).map((k) => `${STAT_SHORT[k]} ${diff[k] > 0 ? `<g>+${diff[k]}</>` : `<r>${diff[k]}</>`}`);
      extra += equipped ? '  <k>(equipped)</>' : parts.length ? `  ${parts.join(' ')}` : '  <k>no change</>';
    }
    this.desc.push(addText(this.scene, 12, 186, def.description ?? '', { maxWidth: SCREEN_WIDTH - 24, depth: 21, color: 0xdcd4c4 }));
    const e = addText(this.scene, 0, 186, extra, { depth: 21 });
    e.x = SCREEN_WIDTH - 12 - e.textWidth;
    e.y = 207;
    this.desc.push(e);
  }

  command(value) {
    if (value === 'leave') {
      this.leave();
      return;
    }
    const entries = this.entries(value);
    if (!entries.length) {
      this.app.audio.ui('buzzer');
      return;
    }
    this.mode = 'list';
    this.commands.setFocused(false);
    this.openList(value, true);
  }

  backToCommands() {
    this.mode = 'commands';
    this.list.setFocused(false);
    this.commands.setFocused(true);
    this.previewList(this.commands.selected.value);
  }

  async transact(itemId) {
    const def = this.app.content.items.require(itemId);
    const inv = this.session.inventory;
    const audio = this.app.audio;
    this.list.setFocused(false);
    if (this.listMode === 'buy') {
      const price = buyPrice(this.shop, def);
      const room = inv.maxStack(def) - inv.count(itemId);
      const max = Math.min(Math.floor(inv.gold / Math.max(1, price)), room);
      if (max <= 0) {
        audio.ui('buzzer');
        this.say(room <= 0 ? "You can't carry any more of those." : "You're short of coin for that.");
        this.list.setFocused(true);
        return;
      }
      this.prompt = new QuantityPrompt(this.scene, { title: `Buy ${def.name}`, max, unitPrice: price, priceLabel: 'Cost', depth: 80 });
      const n = await this.prompt.promise;
      this.prompt = null;
      if (n > 0 && inv.spendGold(n * price)) {
        inv.add(itemId, n);
        audio.sfx('shop_buy');
        this.say(def.type === 'equipment' ? 'Good choice. Equip it from the menu.' : 'Pleasure doing business, Captain.');
      }
    } else {
      const price = sellPrice(def);
      this.prompt = new QuantityPrompt(this.scene, { title: `Sell ${def.name}`, max: inv.count(itemId), unitPrice: price, priceLabel: 'Offer', depth: 80 });
      const n = await this.prompt.promise;
      this.prompt = null;
      if (n > 0 && inv.remove(itemId, n)) {
        inv.addGold(n * price);
        audio.sfx('gold');
        this.say("I'll put it back on the shelf. Quill will want it in the ledger.");
      }
    }
    this.refreshGold();
    const index = this.list.index;
    this.openList(this.listMode, true);
    if (this.list.items.length) this.list.setItems(this.list.items, index);
    if (!this.list.items.length) this.backToCommands();
  }

  say(text) {
    this.greeting.destroy();
    this.greeting = this.layer.add(addText(this.scene, 66, 35, text, { maxWidth: SCREEN_WIDTH - 82, depth: 21 }));
  }

  leave() {
    this.app.audio.ui('cancel');
    this.onClose?.();
  }

  update(input) {
    if (this.prompt) {
      this.prompt.update(input);
      return;
    }
    if (this.mode === 'list') this.list.update(input);
    else this.commands.update(input);
  }

  destroy() {
    this.commands?.destroy();
    this.list?.destroy();
    this.layer.clear();
    this.listLayer.clear();
    this.desc?.forEach((d) => d.destroy());
  }
}
