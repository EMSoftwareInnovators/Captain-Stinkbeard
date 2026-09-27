import { BaseScene } from './BaseScene.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { Toasts } from '../ui/Toasts.js';
import { addPanel } from '../ui/Panel.js';
import { addText, centerText, setText, UI_COLORS } from '../ui/text.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';

/**
 * Always-on-top scene for UI shared by every other scene: dialogue,
 * tutorials, toasts, banners, context hints and full-screen fades. It also
 * turns game events (items, quests, level ups) into notifications.
 */
export class OverlayScene extends BaseScene {
  constructor() {
    super('Overlay');
  }

  create() {
    this.app.overlay = this;
    this.dialogue = new DialogueBox(this);
    this.toasts = new Toasts(this);
    this.fader = this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000).setOrigin(0).setDepth(50).setAlpha(0);
    this.tutorialOpen = null;
    this.hint = null;
    this.subscriptions = [];
    const on = (ev, fn) => this.subscriptions.push(this.app.bus.on(ev, fn, this));
    on('quest:started', ({ quest }) => this.toasts.push({ text: `New quest: <y>${quest.title}</>`, icon: 'ledger', sound: 'quest_new', hold: 2800 }));
    on('quest:objectiveCompleted', ({ quest, objective }) => {
      if (quest.objectives.filter((o) => !o.optional).every((o) => this.app.session?.quests.isObjectiveDone(quest.id, o.id))) return;
      this.toasts.push({ text: `★ ${objective.text}`, sound: 'quest_objective' });
    });
    on('quest:objectiveProgress', ({ objective, progress, count }) => {
      if (count > 1 && progress < count) this.toasts.push({ text: `${objective.text} (${progress}/${count})`, sound: 'quest_objective', hold: 1600 });
    });
    on('quest:completed', ({ quest, rewards }) => {
      this.toasts.push({ text: `Quest complete: <y>${quest.title}</>`, icon: 'ledger', sound: 'quest_complete', hold: 3200 });
      if (rewards) this.rewardToasts(rewards);
    });
    on('party:levelUp', ({ levelUps, source }) => {
      if (source === 'battle') return; // the battle results screen announces these itself
      for (const lv of levelUps) {
        const name = this.app.content.characters.get(lv.character)?.name ?? lv.character;
        this.toasts.push({ text: `<y>${name}</> reached level ${lv.level}!`, sound: 'level_up', hold: 2600 });
        for (const ab of lv.learned) {
          this.toasts.push({ text: `Learned <c>${this.app.content.abilities.get(ab)?.name ?? ab}</>`, hold: 2600 });
        }
      }
    });
    this.events.on('shutdown', () => this.subscriptions.forEach((off) => off()));
  }

  rewardToasts(r) {
    const parts = [];
    if (r.xp) parts.push(`${r.xp} XP`);
    if (r.gold) parts.push(`${r.gold} gold`);
    if (parts.length) this.toasts.push({ text: `+ ${parts.join(', ')}`, icon: 'gold', hold: 2600 });
    for (const it of r.items || []) {
      const def = this.app.content.items.get(it.id);
      this.toasts.push({ text: `Received <y>${def.name}</>${it.count > 1 ? ` ×${it.count}` : ''}`, icon: def.icon, hold: 2600 });
    }
  }

  /** Script/UI notification entry point (see systems/script/commands.js). */
  notify(n) {
    const items = this.app.content.items;
    switch (n.kind) {
      case 'itemGained': {
        const def = items.get(n.id);
        if (n.count <= 0) {
          this.toasts.push({ text: `No room for more ${def.name}.`, icon: def.icon, sound: 'buzzer' });
          break;
        }
        this.toasts.push({ text: `Received <y>${def.name}</>${n.count > 1 ? ` ×${n.count}` : ''}`, icon: def.icon, sound: 'item_get' });
        break;
      }
      case 'itemLost': {
        const def = items.get(n.id);
        this.toasts.push({ text: `Handed over <y>${def.name}</>${n.count > 1 ? ` ×${n.count}` : ''}`, icon: def.icon });
        break;
      }
      case 'goldGained':
        this.toasts.push({ text: `Received <y>${n.amount}</> gold`, icon: 'gold', sound: 'gold' });
        break;
      case 'goldLost':
        this.toasts.push({ text: `Paid <y>${n.amount}</> gold`, icon: 'gold' });
        break;
      default:
        this.toasts.push({ text: String(n.text ?? n.kind) });
    }
  }

  get busy() {
    return this.dialogue.busy || !!this.tutorialOpen;
  }

  update(time, delta) {
    const input = this.controls;
    if (this.tutorialOpen) {
      if (input.pressed('confirm') || input.pressed('cancel')) {
        input.consume('confirm');
        input.consume('cancel');
        this.app.audio.ui('confirm');
        const t = this.tutorialOpen;
        this.tutorialOpen = null;
        t.parts.forEach((p) => p.destroy());
        t.resolve();
      }
      return;
    }
    this.dialogue.update(delta, input);
  }

  /** Parchment tip box; resolves when dismissed. */
  tutorial({ title = 'Tip', text }) {
    return new Promise((resolve) => {
      const w = 264;
      const bodyW = w - 28;
      // Dark ink without a drop shadow: crisp on the light parchment.
      const body = addText(this, 0, 0, text, { font: 'ink', color: 0x1e1008, maxWidth: bodyW, depth: 702 });
      const lines = body.text.split('\n').length;
      const lineH = 12;
      body.setLineSpacing?.(lineH - 11);
      const h = 36 + lines * lineH + 12;
      const x = Math.round((SCREEN_WIDTH - w) / 2);
      const y = Math.round((SCREEN_HEIGHT - h) / 2) - 16;
      const panel = addPanel(this, x, y, w, h, { style: 'parchment', depth: 700 });
      const head = addText(this, 0, y + 10, title.toUpperCase(), { font: 'ink', color: 0x8a1c10, depth: 702 });
      centerText(head, SCREEN_WIDTH / 2);
      const rule = this.add.rectangle(Math.round(SCREEN_WIDTH / 2 - head.textWidth / 2 - 6), y + 21, head.textWidth + 12, 1, 0x8a1c10, 0.6).setOrigin(0).setDepth(702);
      body.x = x + 14;
      body.y = y + 28;
      const hint = addText(this, 0, y + h - 15, '{btn:confirm}', { depth: 702 });
      hint.x = x + w - hint.textWidth - 10;
      const parts = [panel, head, rule, body, hint];
      parts.forEach((p) => (p.alpha = 0));
      this.tweens.add({ targets: parts, alpha: 1, duration: 150 });
      this.app.audio.ui('menu_open');
      this.tutorialOpen = { parts, resolve };
    });
  }

  /** Chapter / notice banner across the middle of the screen. */
  banner(text, sub = null, { hold = 1900 } = {}) {
    return new Promise((resolve) => {
      const y = 78;
      const band = this.add.rectangle(0, y, SCREEN_WIDTH, sub ? 48 : 34, 0x07060c, 0.82).setOrigin(0).setDepth(900);
      const line1 = this.add.rectangle(0, y, SCREEN_WIDTH, 1, 0xb57f22).setOrigin(0).setDepth(901);
      const line2 = this.add.rectangle(0, y + (sub ? 47 : 33), SCREEN_WIDTH, 1, 0xb57f22).setOrigin(0).setDepth(901);
      const big = addText(this, 0, y + 7, text, { font: 'big', color: UI_COLORS.gold, depth: 902 });
      centerText(big, SCREEN_WIDTH / 2);
      const parts = [band, line1, line2, big];
      if (sub) {
        const small = addText(this, 0, y + 33, sub, { color: 0xdccca8, depth: 902 });
        centerText(small, SCREEN_WIDTH / 2);
        parts.push(small);
      }
      parts.forEach((p) => (p.alpha = 0));
      this.tweens.add({
        targets: parts,
        alpha: { from: 0, to: (t) => (t === band ? 0.82 : 1) },
        duration: 400,
        hold,
        yoyo: true,
        onComplete: () => {
          parts.forEach((p) => p.destroy());
          resolve();
        },
      });
    });
  }

  /** Small location title shown when entering a map (top-right, clear of toasts). */
  locationTitle(name) {
    this.locationParts?.forEach((p) => p.destroy());
    const t = addText(this, 0, 10, name, { font: 'bold', color: 0xfff4e0, depth: 850 });
    const w = t.textWidth + 24;
    const x = SCREEN_WIDTH - w - 6;
    const panel = addPanel(this, x, 5, w, 20, { depth: 849 });
    t.x = x + 12;
    t.y = 10;
    const parts = [panel, t];
    this.locationParts = parts;
    parts.forEach((p) => (p.alpha = 0));
    this.tweens.add({
      targets: parts,
      alpha: 1,
      duration: 250,
      hold: 1500,
      yoyo: true,
      onComplete: () => parts.forEach((p) => p.destroy()),
    });
  }

  /** Context hint at the bottom-right, e.g. "{btn:confirm} Talk". Null hides it. */
  setHint(text) {
    if (this.hintText === text) return;
    this.hintText = text;
    this.hint?.forEach((p) => p.destroy());
    this.hint = null;
    if (!text) return;
    const t = addText(this, 0, SCREEN_HEIGHT - 15, text, { depth: 400 });
    t.x = SCREEN_WIDTH - t.textWidth - 7;
    const bg = this.add.rectangle(t.x - 4, SCREEN_HEIGHT - 17, t.textWidth + 8, 14, 0x07060c, 0.6).setOrigin(0).setDepth(399);
    this.hint = [bg, t];
  }

  /**
   * The FUMES meter (top centre). `state` is { value: 0..1, level } or null
   * to hide it. It appears only when exposure matters.
   */
  setExposure(state) {
    if (!state) {
      if (this.meter && !this.meter.hiding) {
        this.meter.hiding = true;
        const m = this.meter;
        this.tweens.add({ targets: m.parts, alpha: 0, duration: 300, onComplete: () => {
          m.parts.forEach((p) => p.destroy());
          if (this.meter === m) this.meter = null;
        } });
      }
      return;
    }
    if (!this.meter || this.meter.hiding) {
      if (this.meter) this.meter.parts.forEach((p) => p.destroy());
      const w = 96;
      const x = Math.round((SCREEN_WIDTH - w) / 2);
      const y = 5;
      const panel = addPanel(this, x, y, w, 26, { depth: 420 });
      const label = addText(this, x + 7, y + 4, 'FUMES', { font: 'bold', color: 0xf0d860, depth: 421 });
      const barBack = this.add.rectangle(x + 8, y + 17, w - 16, 4, 0x1a1320).setOrigin(0).setDepth(421);
      const bar = this.add.rectangle(x + 8, y + 17, 1, 4, 0x7cb45a).setOrigin(0).setDepth(422);
      const tag = addText(this, x + 48, y + 5, '', { color: 0xdccca8, depth: 421 });
      const parts = [panel, label, barBack, bar, tag];
      parts.forEach((p) => p.setAlpha(0));
      this.tweens.add({ targets: parts, alpha: 1, duration: 200 });
      this.meter = { parts, bar, tag, barW: w - 16, level: undefined, t: 0 };
    }
    const m = this.meter;
    const v = Math.max(0, Math.min(1, state.value));
    m.bar.width = Math.max(1, Math.round(m.barW * v));
    const col = v < 0.35 ? 0x7cb45a : v < 0.6 ? 0xe0ad38 : v < 0.8 ? 0xe07a28 : 0xe43c3a;
    m.bar.setFillStyle(col);
    if (m.level !== state.level) {
      m.level = state.level;
      const names = { light: '<k>light</>', dense: '<o>DENSE</>', center: '<r>DEAD CENTER</>' };
      setText(m.tag, names[state.level] ?? '');
    }
    // Pulse when close to collapsing.
    m.t += 16;
    const pulse = v > 0.7 ? 0.55 + 0.45 * Math.abs(Math.sin(m.t / 140)) : 1;
    m.bar.setAlpha(pulse);
  }

  refreshHint() {
    const text = this.hintText;
    this.hintText = null;
    this.setHint(text);
  }

  fadeOut(duration = 300, color = 0x000000) {
    this.fader.setFillStyle(color);
    this.tweens.killTweensOf(this.fader);
    if (duration <= 0) {
      this.fader.setAlpha(1);
      return Promise.resolve();
    }
    return this.tweenAsync({ targets: this.fader, alpha: 1, duration });
  }

  fadeIn(duration = 300) {
    this.tweens.killTweensOf(this.fader);
    if (duration <= 0) {
      this.fader.setAlpha(0);
      return Promise.resolve();
    }
    return this.tweenAsync({ targets: this.fader, alpha: 0, duration });
  }

  /** Clears anything left on screen (used when returning to the title). */
  reset() {
    this.dialogue.forceClose();
    this.toasts.clear();
    this.setHint(null);
    this.setExposure(null);
    this.app.cinema?.reset();
    if (this.tutorialOpen) {
      this.tutorialOpen.parts.forEach((p) => p.destroy());
      this.tutorialOpen = null;
    }
  }
}
