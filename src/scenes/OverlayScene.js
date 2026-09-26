import { BaseScene } from './BaseScene.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { Toasts } from '../ui/Toasts.js';
import { addPanel } from '../ui/Panel.js';
import { addText, centerText, UI_COLORS } from '../ui/text.js';
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
    on('party:levelUp', ({ levelUps }) => {
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
      const bodyW = w - 24;
      const body = addText(this, 0, 0, text, { color: 0x3a2410, maxWidth: bodyW, depth: 702 });
      const lines = body.text.split('\n').length;
      const h = 34 + lines * 11 + 10;
      const x = Math.round((SCREEN_WIDTH - w) / 2);
      const y = Math.round((SCREEN_HEIGHT - h) / 2) - 16;
      const panel = addPanel(this, x, y, w, h, { style: 'parchment', depth: 700 });
      const head = addText(this, 0, y + 9, title.toUpperCase(), { font: 'bold', color: 0x7a2418, depth: 702 });
      centerText(head, SCREEN_WIDTH / 2);
      body.x = x + 12;
      body.y = y + 26;
      const hint = addText(this, 0, y + h - 14, '{btn:confirm}', { depth: 702 });
      hint.x = x + w - hint.textWidth - 10;
      const parts = [panel, head, body, hint];
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

  /** Small location title shown when entering a map. */
  locationTitle(name) {
    this.locationParts?.forEach((p) => p.destroy());
    const t = addText(this, 0, 10, name, { font: 'bold', color: 0xfff4e0, depth: 850 });
    const w = t.textWidth + 24;
    const x = Math.round((SCREEN_WIDTH - w) / 2);
    const panel = addPanel(this, x, 5, w, 20, { depth: 849 });
    centerText(t, SCREEN_WIDTH / 2);
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
    if (this.tutorialOpen) {
      this.tutorialOpen.parts.forEach((p) => p.destroy());
      this.tutorialOpen = null;
    }
  }
}
