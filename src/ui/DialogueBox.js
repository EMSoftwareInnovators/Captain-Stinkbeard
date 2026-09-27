import { addPanel } from './Panel.js';
import { addText, setText, parseMarkup, formatTokens, wrap, paginate, applySpans, measure, UI_COLORS } from './text.js';
import { ListMenu } from './ListMenu.js';
import { TEXT_SPEED_MS } from '../systems/settings/Settings.js';
import { resolveVariant } from '../systems/story/progress.js';

const BOX = { x: 4, y: 158, w: 312, h: 62 };
const LINES = 4;
const DEPTH = 500;

/**
 * The retro dialogue window: optional portrait, speaker name plate,
 * typewriter text with per-speaker voice blips, automatic pagination and
 * choice lists. Everything is driven by the keyboard/gamepad.
 *
 *   await box.say({ speaker: 'hale', expression: 'happy', text: '...' })
 *   const i = await box.choose({ prompt, options: [{ text }], cancelIndex })
 */
export class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    this.app = scene.game.app;
    this.open = false;
    this.objects = [];
    this.pending = null;
    this.choiceMenu = null;
  }

  get busy() {
    return this.open || !!this.choiceMenu;
  }

  ensureBox(hasPortrait) {
    if (this.open && this.hasPortrait === hasPortrait) return;
    this.destroyBox();
    const s = this.scene;
    this.hasPortrait = hasPortrait;
    this.panel = addPanel(s, BOX.x, BOX.y, BOX.w, BOX.h, { depth: DEPTH });
    this.objects.push(this.panel);
    if (hasPortrait) {
      this.portraitFrame = addPanel(s, 9, 163, 52, 52, { style: 'inset', depth: DEPTH + 1 });
      this.portrait = s.add.image(11, 165, 'portraits').setOrigin(0, 0).setDepth(DEPTH + 2);
      this.objects.push(this.portraitFrame, this.portrait);
    }
    this.textX = hasPortrait ? 68 : 14;
    this.textWidth = BOX.w - (this.textX - BOX.x) - 10;
    this.body = addText(s, this.textX, 166, '', { depth: DEPTH + 2 });
    this.next = s.add.image(BOX.x + BOX.w - 14, BOX.y + BOX.h - 10, 'ui', 'next_0').setOrigin(0, 0).setDepth(DEPTH + 3).setVisible(false);
    this.nextTween = s.tweens.add({ targets: this.next, y: '+=2', duration: 300, yoyo: true, repeat: -1 });
    this.objects.push(this.body, this.next);
    // Pop-in: the window grows from its centre line.
    this.panel.setScale(1, 0.2);
    this.panel.y = BOX.y + BOX.h * 0.4;
    s.tweens.add({ targets: this.panel, scaleY: 1, y: BOX.y, duration: 90, ease: 'Quad.Out' });
    this.open = true;
  }

  destroyBox() {
    this.nextTween?.remove();
    for (const o of this.objects) o.destroy();
    this.objects = [];
    this.destroyName();
    this.open = false;
  }

  destroyName() {
    this.namePanel?.destroy();
    this.nameText?.destroy();
    this.namePanel = null;
    this.nameText = null;
  }

  setSpeaker(line) {
    // A speaker's portrait and name can follow the story (see "variants").
    const sp = line.speaker ? resolveVariant(this.app.content.speaker(line.speaker), this.app.session) : null;
    if (line.speaker && !sp) console.warn(`Unknown speaker ${line.speaker}`);
    const name = line.name ?? sp?.name ?? null;
    const portraitId = sp?.portrait ?? null;
    this.ensureBox(!!portraitId);
    if (portraitId) {
      const expr = line.expression ?? 'neutral';
      const frame = `${portraitId}_${expr}`;
      this.portrait.setFrame(this.scene.textures.get('portraits').has(frame) ? frame : `${portraitId}_neutral`);
    }
    this.destroyName();
    if (name) {
      const w = measure(this.app.fontMetrics.main, name) + 16;
      this.namePanel = addPanel(this.scene, 8, BOX.y - 13, w, 16, { depth: DEPTH + 4 });
      this.nameText = addText(this.scene, 16, BOX.y - 9, name, { color: UI_COLORS.name, depth: DEPTH + 5 });
    }
    this.voice = sp?.voice?.pitch ?? 1;
  }

  /** Shows one line (possibly several pages). Resolves when the player dismisses it. */
  say(line) {
    this.setSpeaker(line);
    const formatted = formatTokens(line.text, { app: this.app, session: this.app.session });
    const { text, spans } = parseMarkup(formatted);
    const wrapped = wrap(this.app.fontMetrics.main, text, this.textWidth);
    this.pages = paginate(wrapped, LINES);
    this.spans = spans;
    this.pageIndex = 0;
    return new Promise((resolve) => {
      this.resolveLine = resolve;
      this.startPage();
    });
  }

  startPage() {
    const page = this.pages[this.pageIndex];
    this.pageText = page.text;
    this.pageOffset = page.offset;
    this.visible = 0;
    this.charTimer = 0;
    this.typing = true;
    this.next.setVisible(false);
    const speed = TEXT_SPEED_MS[this.app.settings.get('textSpeed')] ?? 26;
    this.msPerChar = speed;
    if (speed === 0) this.finishPage();
    else this.renderVisible();
  }

  renderVisible() {
    this.body.setText(this.pageText.slice(0, this.visible));
    this.body.setTint(0xffffff);
    applySpans(this.body, this.spans, this.pageOffset, this.visible);
  }

  finishPage() {
    this.visible = this.pageText.length;
    this.typing = false;
    this.renderVisible();
    this.next.setVisible(true);
  }

  blip(ch) {
    if (!this.app.settings.get('textSound') || ch === ' ' || ch === '\n') return;
    this.blipToggle = !this.blipToggle;
    if (this.blipToggle) this.app.audio.ui('text_blip', { rate: this.voice * (0.97 + Math.random() * 0.06), volume: 0.8 });
  }

  update(delta, input) {
    if (this.choiceMenu) {
      this.choiceMenu.update(input);
      return;
    }
    if (!this.open || !this.resolveLine) return;
    const skipHeld = input.isDown('cancel');
    if (this.typing) {
      if (input.pressed('confirm') || skipHeld) {
        input.consume('confirm');
        this.finishPage();
        return;
      }
      this.charTimer += delta;
      while (this.typing && this.charTimer >= this.msPerChar) {
        this.charTimer -= this.msPerChar;
        const ch = this.pageText[this.visible];
        this.visible += 1;
        this.blip(ch);
        if ('.!?'.includes(ch) && this.pageText[this.visible] === ' ') this.charTimer -= this.msPerChar * 6;
        else if (ch === ',' || ch === ';') this.charTimer -= this.msPerChar * 2;
        if (this.visible >= this.pageText.length) this.finishPage();
      }
      this.renderVisible();
      return;
    }
    if (input.pressed('confirm')) {
      input.consume('confirm');
      this.app.audio.ui('cursor', { volume: 0.6 });
      if (this.pageIndex < this.pages.length - 1) {
        this.pageIndex += 1;
        this.startPage();
      } else {
        const done = this.resolveLine;
        this.resolveLine = null;
        this.next.setVisible(false);
        done();
      }
    }
  }

  /** Shows a list of options (optionally after a prompt line). Resolves with the chosen index. */
  async choose({ prompt = null, options, cancelIndex = null }) {
    if (prompt) await this.sayPrompt(prompt);
    const s = this.scene;
    const metrics = this.app.fontMetrics.main;
    const texts = options.map((o) => formatTokens(o.text, { app: this.app, session: this.app.session }));
    const w = Math.min(220, Math.max(...texts.map((t) => measure(metrics, parseMarkup(t).text))) + 34);
    const h = options.length * 12 + 10;
    const x = 316 - w;
    const y = (this.open ? BOX.y - 15 : 200) - h;
    const panel = addPanel(s, x, y, w, h, { depth: DEPTH + 10 });
    return new Promise((resolve) => {
      const finish = (i) => {
        this.choiceMenu.destroy();
        panel.destroy();
        this.choiceMenu = null;
        resolve(i);
      };
      this.choiceMenu = new ListMenu(s, {
        x: x + 20,
        y: y + 6,
        width: w - 26,
        rows: options.length,
        depth: DEPTH + 11,
        items: texts.map((t) => ({ label: t })),
        onSelect: (_item, i) => finish(i),
        onCancel: cancelIndex === null ? null : () => finish(cancelIndex),
      });
    });
  }

  /** A prompt line stays on screen (no "next" wait) while the choice is shown. */
  async sayPrompt(line) {
    this.setSpeaker(line);
    const { text, spans } = parseMarkup(formatTokens(line.text, { app: this.app, session: this.app.session }));
    const wrapped = wrap(this.app.fontMetrics.main, text, this.textWidth);
    this.pages = paginate(wrapped, LINES);
    this.spans = spans;
    this.pageIndex = this.pages.length - 1;
    this.pageText = this.pages[this.pageIndex].text;
    this.pageOffset = this.pages[this.pageIndex].offset;
    this.finishPage();
    this.next.setVisible(false);
  }

  close() {
    if (!this.open) return Promise.resolve();
    const panel = this.panel;
    this.objects.filter((o) => o !== panel).forEach((o) => o.setVisible(false));
    this.destroyName();
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: panel,
        scaleY: 0.1,
        y: BOX.y + BOX.h * 0.45,
        duration: 70,
        onComplete: () => {
          this.destroyBox();
          resolve();
        },
      });
    });
  }

  forceClose() {
    this.choiceMenu?.destroy();
    this.choiceMenu = null;
    this.resolveLine = null;
    this.destroyBox();
  }
}

export { setText };
