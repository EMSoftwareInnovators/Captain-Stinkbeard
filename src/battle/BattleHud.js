import { addPanel } from '../ui/Panel.js';
import { addText, setText, centerText, UI_COLORS } from '../ui/text.js';
import { ListMenu } from '../ui/ListMenu.js';
import { SCREEN_WIDTH } from '../config/constants.js';

export const HUD_Y = 160;
const LEFT_W = 104;
const DEPTH = 1000;

const GRADE_STYLE = {
  good: { text: 'GOOD!', font: 'bold', color: 0x90e0ec },
  great: { text: 'GREAT!', font: 'bold', color: 0x8cd46a },
  perfect: { text: 'PERFECT!', font: 'big', color: 0xf8d86c },
};

/**
 * Battle interface: party status, enemy list / command menu, sub-menus,
 * the top message plate, turn order and floating numbers. Knows how to draw
 * things; the BattleScene decides when.
 */
export class BattleHud {
  constructor(scene, engine) {
    this.scene = scene;
    this.engine = engine;
    this.app = scene.game.app;
    this.leftPanel = addPanel(scene, 0, HUD_Y, LEFT_W, 64, { depth: DEPTH });
    this.rightPanel = addPanel(scene, LEFT_W, HUD_Y, SCREEN_WIDTH - LEFT_W, 64, { depth: DEPTH });
    this.enemyTexts = [];
    this.rows = new Map();
    this.plate = null;
    this.chips = [];
    this.menu = null;
    this.sub = null;
    this.cropCache = new Map();
    this.buildPartyRows();
    this.refreshEnemies();
  }

  // ---------------------------------------------------------------------------
  // Party status (bottom right)

  buildPartyRows() {
    const members = this.engine.party;
    const compact = members.length > 2;
    const rowH = compact ? 19 : 27;
    const top = HUD_Y + (compact ? 5 : members.length === 1 ? 12 : 6);
    members.forEach((c, i) => {
      const y = top + i * rowH;
      const x = LEFT_W + 10;
      const row = { c, y, compact };
      row.band = this.scene.add.rectangle(LEFT_W + 4, y - 3, SCREEN_WIDTH - LEFT_W - 8, rowH - 2, 0xf8d86c, 0.1).setOrigin(0).setDepth(DEPTH + 1).setVisible(false);
      row.name = addText(this.scene, x, y, c.name, { font: 'bold', depth: DEPTH + 2 });
      row.hpLabel = addText(this.scene, 0, y + 1, 'HP', { color: UI_COLORS.dim, depth: DEPTH + 2 });
      row.hpText = addText(this.scene, 0, y + 1, '', { depth: DEPTH + 2 });
      const gx = compact ? x + 64 : x;
      const gy = compact ? y + 3 : y + 14;
      const gw = compact ? 50 : 96;
      row.gauge = { x: gx, y: gy, w: gw };
      row.gaugeBg = this.scene.add.rectangle(gx - 1, gy - 1, gw + 2, 6, 0x0a0810).setOrigin(0).setDepth(DEPTH + 2);
      row.gaugeFill = this.scene.add.rectangle(gx, gy, gw, 4, 0x6cc050).setOrigin(0).setDepth(DEPTH + 3);
      row.gaugeShine = this.scene.add.rectangle(gx, gy, gw, 1, 0xffffff, 0.35).setOrigin(0).setDepth(DEPTH + 4);
      row.pips = [];
      if (c.resource) {
        const px = compact ? SCREEN_WIDTH - 8 - c.resource.max * 8 : gx + gw + 30;
        const py = compact ? y + 1 : gy - 2;
        if (!compact) row.cmdLabel = addText(this.scene, gx + gw + 8, gy - 2, 'CMD', { color: UI_COLORS.dim, depth: DEPTH + 2 });
        for (let k = 0; k < c.resource.max; k++) row.pips.push(this.scene.add.image(px + k * 8, py, 'ui', 'pip_off').setOrigin(0).setDepth(DEPTH + 2));
      }
      this.rows.set(c.uid, row);
      this.updateRow(row, false);
    });
  }

  updateRow(row, animate = true) {
    const { c } = row;
    const right = row.compact ? row.gauge.x - 6 : SCREEN_WIDTH - 12;
    setText(row.hpText, `${c.hp}/${c.maxHp}`, { color: c.hp === 0 ? UI_COLORS.bad : c.hp <= c.maxHp / 4 ? 0xf8d86c : UI_COLORS.text });
    row.hpText.x = right - row.hpText.textWidth;
    row.hpLabel.x = row.hpText.x - 14;
    if (row.compact) {
      row.hpLabel.setVisible(false);
      row.hpText.x = row.gauge.x + row.gauge.w + 6;
    }
    const pct = c.maxHp ? c.hp / c.maxHp : 0;
    const w = Math.max(c.hp > 0 ? 1 : 0, Math.round(row.gauge.w * pct));
    const color = pct > 0.5 ? 0x6cc050 : pct > 0.25 ? 0xe8b830 : 0xe05040;
    row.gaugeFill.fillColor = color;
    this.scene.tweens.killTweensOf(row.gaugeFill);
    if (animate) this.scene.tweens.add({ targets: [row.gaugeFill, row.gaugeShine], width: w, duration: 280, ease: 'Quad.Out' });
    else {
      row.gaugeFill.width = w;
      row.gaugeShine.width = w;
    }
    if (c.resource) row.pips.forEach((p, k) => p.setFrame(k < c.resource.current ? 'pip_on' : 'pip_off'));
    row.name.setTint(c.isAlive() ? 0xffffff : UI_COLORS.bad);
  }

  updateParty(animate = true) {
    for (const row of this.rows.values()) this.updateRow(row, animate);
  }

  setActive(uid) {
    for (const [id, row] of this.rows) {
      const on = id === uid;
      row.band.setVisible(on);
      row.name.setTint(on ? UI_COLORS.gold : row.c.isAlive() ? 0xffffff : UI_COLORS.bad);
    }
  }

  /** Pulses a command pip that was just earned. */
  flashPips(uid) {
    const row = this.rows.get(uid);
    if (!row) return;
    this.updateRow(row);
    const lit = row.pips.filter((p) => p.frame.name === 'pip_on');
    const last = lit[lit.length - 1];
    if (last) this.scene.tweens.add({ targets: last, scale: { from: 1.8, to: 1 }, duration: 260, ease: 'Back.Out' });
  }

  // ---------------------------------------------------------------------------
  // Enemy list (bottom left, when no menu is open)

  refreshEnemies(highlightUid = null) {
    this.enemyTexts.forEach((t) => t.destroy());
    this.enemyTexts = [];
    if (this.menu) return;
    const alive = this.engine.enemies.filter((e) => e.isAlive()).slice(0, 5);
    alive.forEach((e, i) => {
      const color = e.uid === highlightUid ? UI_COLORS.gold : UI_COLORS.text;
      this.enemyTexts.push(addText(this.scene, 10, HUD_Y + 6 + i * 11, e.name, { color, depth: DEPTH + 2 }));
    });
  }

  // ---------------------------------------------------------------------------
  // Command menu

  /** Shows the command list for `actor`. Resolves with the chosen command id or null. */
  openCommands(actor, { canFlee, hasItems, hasOrders, index = 0 }) {
    this.closeCommands();
    this.enemyTexts.forEach((t) => t.destroy());
    this.enemyTexts = [];
    const items = [
      { label: 'Attack', value: 'attack' },
      { label: 'Orders', value: 'orders', disabled: !hasOrders },
      { label: 'Items', value: 'items', disabled: !hasItems },
      { label: 'Defend', value: 'defend' },
      { label: 'Flee', value: 'flee', disabled: !canFlee },
    ];
    return new Promise((resolve) => {
      this.menu = new ListMenu(this.scene, {
        x: 24,
        y: HUD_Y + 6,
        width: 74,
        rows: 5,
        rowHeight: 11,
        depth: DEPTH + 2,
        items,
        index,
        onSelect: (item) => resolve(item.value),
        onChange: (item) => this.describeCommand(item.value, actor),
      });
      this.describeCommand(items[this.menu.index].value, actor);
    });
  }

  describeCommand(cmd, actor) {
    const text = {
      attack: `Strike with the ${actor.def.battle?.attackName ?? 'cutlass'}. Time {btn:confirm} on impact!`,
      orders: "Captain's Orders. Spend Command to rally or target.",
      items: 'Use something from your pockets.',
      defend: 'Guard until your next turn. Earns 1 Command.',
      flee: this.engine.encounter.canFlee === false ? "There's no running from this one." : 'Try to escape.',
    }[cmd];
    this.message(text, { small: true });
  }

  closeCommands() {
    this.menu?.destroy();
    this.menu = null;
  }

  /** Orders / Items list above the HUD. Resolves with the picked entry's value or null on cancel. */
  openSubmenu({ title, entries, describe }) {
    this.closeSubmenu();
    const rows = Math.min(4, Math.max(1, entries.length));
    const w = 172;
    const h = 14 + rows * 12 + 6;
    const x = 4;
    const y = HUD_Y - h - 2;
    const panel = addPanel(this.scene, x, y, w, h, { depth: DEPTH + 10 });
    const head = addText(this.scene, x + 8, y + 4, title, { font: 'bold', color: UI_COLORS.heading, depth: DEPTH + 11 });
    return new Promise((resolve) => {
      const menu = new ListMenu(this.scene, {
        x: x + 22,
        y: y + 18,
        width: w - 30,
        rows,
        rowHeight: 12,
        depth: DEPTH + 11,
        iconOffset: 1,
        items: entries,
        onSelect: (item) => resolve(item.value),
        onCancel: () => resolve(null),
        onChange: (item) => describe?.(item),
      });
      describe?.(entries[0]);
      this.sub = { panel, head, menu };
    });
  }

  closeSubmenu() {
    if (!this.sub) return;
    this.sub.panel.destroy();
    this.sub.head.destroy();
    this.sub.menu.destroy();
    this.sub = null;
  }

  /** Routes input to whichever menu is focused. */
  update(input) {
    if (this.sub) this.sub.menu.update(input);
    else if (this.menu) this.menu.update(input);
  }

  // ---------------------------------------------------------------------------
  // Top message plate

  /** Top plate: action names, prompts and descriptions (wraps to two lines). */
  message(text, { small = false } = {}) {
    this.clearMessage();
    if (!text) return;
    const maxWidth = SCREEN_WIDTH - 60;
    const t = addText(this.scene, 0, 0, text, { font: small ? 'main' : 'bold', depth: DEPTH + 21, maxWidth });
    const lines = t.text.split('\n').length;
    const lineH = small ? 11 : 12;
    const w = Math.min(SCREEN_WIDTH - 8, t.textWidth + 20);
    const h = 8 + lines * lineH;
    const x = Math.round((SCREEN_WIDTH - w) / 2);
    const panel = addPanel(this.scene, x, 4, w, h + (small ? 0 : 1), { depth: DEPTH + 20 });
    t.setPosition(x + 10, small ? 9 : 8);
    if (lines === 1) centerText(t, SCREEN_WIDTH / 2);
    this.plate = [panel, t];
  }

  clearMessage() {
    this.plate?.forEach((p) => p.destroy());
    this.plate = null;
  }

  // ---------------------------------------------------------------------------
  // Turn order (right edge)

  setTurnOrder(current, upcoming) {
    this.chips.forEach((c) => c.destroy());
    this.chips = [];
    const list = [current, ...upcoming.filter((c) => c !== current)].filter(Boolean).slice(0, 6);
    list.forEach((c, i) => {
      const x = SCREEN_WIDTH - 20;
      const y = 26 + i * 18;
      const border = i === 0 ? 0xf8d86c : c.side === 'party' ? 0x8ab4f0 : 0xb05048;
      this.chips.push(this.scene.add.rectangle(x - 1, y - 1, 18, 18, border).setOrigin(0).setDepth(DEPTH + 30));
      this.chips.push(this.scene.add.rectangle(x, y, 16, 16, i === 0 ? 0x3a2c18 : 0x141020).setOrigin(0).setDepth(DEPTH + 31));
      this.chips.push(this.headChip(c, x + 1, y + 1));
    });
    if (list.length) {
      const label = addText(this.scene, 0, 14, 'TURN', { color: UI_COLORS.dim, depth: DEPTH + 30 });
      label.x = SCREEN_WIDTH - 3 - label.textWidth;
      this.chips.push(label);
    }
  }

  /** A 14x14 crop of a combatant's head for the turn-order column. */
  headChip(c, x, y) {
    const view = this.scene.views.get(c.uid);
    const tex = view.texture;
    const frame = c.side === 'party' ? 'ready' : 'battle_idle0';
    const key = `${tex}/${frame}`;
    if (!this.cropCache.has(key)) this.cropCache.set(key, this.findHead(tex, frame, c.side));
    const box = this.cropCache.get(key);
    const img = this.scene.add.image(0, 0, tex, frame).setOrigin(0).setDepth(DEPTH + 32);
    img.setCrop(box.x, box.y, 14, 14);
    img.setPosition(x - box.x, y - box.y);
    return img;
  }

  findHead(tex, frame, side) {
    const f = this.scene.textures.getFrame(tex, frame);
    const W = f.width;
    const H = f.height;
    const alpha = (x, y) => this.scene.textures.getPixelAlpha(x, y, tex, frame) > 0;
    let left = W;
    let right = -1;
    let top = H;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!alpha(x, y)) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
      }
    }
    if (right < 0) return { x: 0, y: 0 };
    if (side === 'party') {
      return { x: Math.round((left + right) / 2) - 7, y: Math.max(0, top - 1) };
    }
    // Enemies face right: take the rightmost columns and the highest pixel there.
    const x0 = Math.max(0, right - 13);
    let t = H;
    for (let y = 0; y < H && t === H; y++) for (let x = x0; x <= right; x++) if (alpha(x, y)) t = y;
    return { x: x0, y: Math.max(0, t - 1) };
  }

  // ---------------------------------------------------------------------------
  // Floating text

  /** Pops a number or word above a battler. kind: damage | crit | heal | miss | status | info */
  popup(view, text, kind = 'damage', { dy = 0 } = {}) {
    const style = {
      damage: { font: 'bold', color: 0xffffff },
      crit: { font: 'big', color: 0xf8d86c },
      heal: { font: 'bold', color: 0x8cd46a },
      miss: { font: 'bold', color: 0x9a98a8 },
      buff: { font: 'main', color: 0xf8d86c },
      debuff: { font: 'main', color: 0xd0a0e8 },
      info: { font: 'main', color: 0xffffff },
      tick: { font: 'bold', color: 0xc080e0 },
    }[kind] ?? { font: 'bold', color: 0xffffff };
    const t = addText(this.scene, 0, 0, String(text), { font: style.font, color: style.color, depth: DEPTH - 10 });
    const x = Math.round(view.hitX - t.textWidth / 2);
    const y = Math.round(view.headY + 2 + dy - (style.font === 'big' ? 8 : 0));
    t.setPosition(x, y);
    const rise = kind === 'buff' || kind === 'debuff' || kind === 'info' ? 8 : 12;
    this.scene.tweens.add({ targets: t, y: y - rise, duration: 320, ease: 'Back.Out' });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 250, onComplete: () => t.destroy() });
    return t;
  }

  /** GOOD! / GREAT! / PERFECT! */
  grade(view, grade) {
    const s = GRADE_STYLE[grade];
    if (!s) return;
    const t = addText(this.scene, 0, 0, s.text, { font: s.font, color: s.color, depth: DEPTH - 5 });
    const x = Math.round(view.hitX - t.textWidth / 2);
    const y = Math.round(view.headY - (s.font === 'big' ? 34 : 26));
    t.setPosition(x, y);
    t.setScale(1, 0.2);
    this.scene.tweens.add({ targets: t, scaleY: 1, duration: 140, ease: 'Back.Out' });
    this.scene.tweens.add({ targets: t, y: y - 6, alpha: 0, delay: 700, duration: 300, onComplete: () => t.destroy() });
  }

  /** Big shout for Captain's Orders ("BRACE!"). */
  shout(view, text) {
    const t = addText(this.scene, 0, 0, text, { font: 'big', color: 0xfff4e0, depth: DEPTH - 4 });
    const w = t.textWidth + 16;
    const x = Math.round(Math.min(SCREEN_WIDTH - w - 4, Math.max(4, view.x - w / 2 - 10)));
    const y = Math.max(28, view.headY - 40);
    const panel = addPanel(this.scene, x, y, w, 28, { style: 'alert', depth: DEPTH - 5 });
    t.setPosition(x + 8, y + 4);
    const parts = [panel, t];
    parts.forEach((p) => p.setScale(0.6));
    this.scene.tweens.add({ targets: parts, scale: 1, duration: 160, ease: 'Back.Out' });
    this.scene.tweens.add({ targets: parts, alpha: 0, delay: 850, duration: 200, onComplete: () => parts.forEach((p) => p.destroy()) });
  }

  // ---------------------------------------------------------------------------
  // Results

  /** Victory window. Resolves once the player confirms. */
  showResults({ xp, gold, items, levelUps }, content, nameOf = (id) => content.characters.get(id)?.name ?? id) {
    const lines = [];
    lines.push(`<k>EXP</>  <w>${xp}</>`);
    if (gold) lines.push(`<k>Gold</>  <y>${gold}</>`);
    for (const it of items) lines.push(`<k>Found</>  ${content.items.get(it.id)?.name ?? it.id}${it.count > 1 ? ` ×${it.count}` : ''}`);
    for (const lv of levelUps) {
      const name = nameOf(lv.character);
      lines.push(`<g>${name} reached level ${lv.level}!</>`);
      const gains = Object.entries(lv.gains || {}).filter(([, v]) => v > 0).map(([k, v]) => `${STAT_SHORT[k] ?? k} +${v}`);
      if (gains.length) lines.push(`  ${gains.join('  ')}`);
      for (const ab of lv.learned || []) lines.push(`  Learned <c>${content.abilities.get(ab)?.name ?? ab}</>`);
    }
    const w = 200;
    const h = 36 + lines.length * 11 + 16;
    const x = Math.round((SCREEN_WIDTH - w) / 2);
    const y = Math.max(8, Math.round((HUD_Y - h) / 2) - 2);
    const panel = addPanel(this.scene, x, y, w, h, { depth: DEPTH + 40 });
    const head = addText(this.scene, 0, y + 6, 'VICTORY!', { font: 'big', color: UI_COLORS.gold, depth: DEPTH + 41 });
    centerText(head, SCREEN_WIDTH / 2);
    const parts = [panel, head];
    lines.forEach((line, i) => parts.push(addText(this.scene, x + 14, y + 32 + i * 11, line, { depth: DEPTH + 41 })));
    const hint = addText(this.scene, 0, y + h - 14, '{btn:confirm}', { depth: DEPTH + 41 });
    hint.x = x + w - hint.textWidth - 8;
    parts.push(hint);
    parts.forEach((p) => p.setAlpha(0));
    this.scene.tweens.add({ targets: parts, alpha: 1, duration: 200 });
    return { parts };
  }
}

const STAT_SHORT = { maxHp: 'HP', attack: 'ATK', defense: 'DEF', speed: 'SPD', luck: 'LCK' };

