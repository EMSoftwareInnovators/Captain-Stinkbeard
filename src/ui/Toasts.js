import { addPanel } from './Panel.js';
import { addText, formatTokens } from './text.js';

/** The widest a toast's text gets before it wraps: clear of the location title at the top right. */
export const TOAST_TEXT_WIDTH = 164;
const LINE_H = 11;
const GAP = 3;

/**
 * Small notifications that slide in at the top-left: items received, gold,
 * quest updates, level ups. Queued so they never overlap; long ones wrap
 * (TOAST_TEXT_WIDTH) and stack by their height.
 *
 * `top()` gives the y of the first slot; the overlay moves it below the
 * dialogue window while that is docked along the top, and `relayout()`
 * (called every frame) shifts toasts already showing when it changes.
 */
export class Toasts {
  constructor(scene, { top = () => 6 } = {}) {
    this.scene = scene;
    this.app = scene.game.app;
    this.queue = [];
    this.active = [];
    this.top = top;
    this.base = top();
  }

  relayout() {
    const base = this.top();
    if (base === this.base) return;
    const dy = base - this.base;
    this.base = base;
    for (const e of this.active) {
      e.y += dy;
      for (const p of e.parts) p.y += dy;
    }
  }

  push({ text, icon = null, sound = null, hold = 2200, urgent = false }) {
    this.queue.push({ text, icon, sound, hold, urgent });
    this.pump();
  }

  pump() {
    // While held (the pause menu is open) only urgent ones show: the menu's own notices.
    while (this.queue.length && this.active.length < 3) {
      const i = this.held ? this.queue.findIndex((t) => t.urgent) : 0;
      if (i < 0) return;
      this.show(this.queue.splice(i, 1)[0]);
    }
  }

  /** Puts what's showing away (back at the front of the queue) until release(): nothing covers the menu. */
  hold() {
    if (this.held) return;
    this.held = true;
    const showing = this.active.filter((e) => !e.t.urgent);
    for (const e of showing) {
      e.parts.forEach((p) => p.destroy());
      e.gone = true;
    }
    this.active = this.active.filter((e) => !e.gone);
    this.queue.unshift(...showing.map((e) => ({ ...e.t, hold: Math.max(1200, e.t.hold / 2) })));
  }

  release() {
    this.held = false;
    this.pump();
  }

  show(t) {
    const s = this.scene;
    this.relayout(); // under whatever is at the top of the screen right now
    const formatted = formatTokens(t.text, { app: this.app, session: this.app.session });
    const x = 6;
    const y = this.base + this.active.reduce((n, e) => n + e.h + GAP, 0);
    const tx = x + (t.icon ? 23 : 7);
    const text = addText(s, tx, y + 5, formatted, { depth: 601, maxWidth: TOAST_TEXT_WIDTH - (t.icon ? 16 : 0) });
    const lines = text.text.split('\n').length;
    const w = text.textWidth + (t.icon ? 30 : 14);
    const h = 9 + lines * LINE_H;
    const panel = addPanel(s, x, y, w, h, { depth: 600 });
    const parts = [panel];
    if (t.icon) parts.push(s.add.image(x + 4, y + 2, 'ui', `icon_${t.icon}`).setOrigin(0, 0).setDepth(601));
    parts.push(text);
    const entry = { parts, h, y, t };
    this.active.push(entry);
    for (const p of parts) p.x -= w + 10;
    s.tweens.add({ targets: parts, x: `+=${w + 10}`, duration: 180, ease: 'Back.Out' });
    if (t.sound) this.app.audio.ui(t.sound);
    s.time.delayedCall(t.hold, () => {
      if (entry.gone) return;
      s.tweens.add({
        targets: parts,
        alpha: 0,
        duration: 250,
        onComplete: () => {
          parts.forEach((p) => p.destroy());
          this.active = this.active.filter((e) => e !== entry);
          // Slide the remaining toasts up.
          let top = this.base;
          for (const e of this.active) {
            if (e.y !== top) s.tweens.add({ targets: e.parts, y: `-=${e.y - top}`, duration: 150 });
            e.y = top;
            top += e.h + GAP;
          }
          this.pump();
        },
      });
    });
  }

  /** The bottom of the toasts showing (for things that sit under them). */
  bottom() {
    return this.active.reduce((n, e) => Math.max(n, e.y + e.h), this.base);
  }

  clear() {
    this.queue = [];
    for (const e of this.active) e.parts.forEach((p) => p.destroy());
    this.active = [];
  }
}
