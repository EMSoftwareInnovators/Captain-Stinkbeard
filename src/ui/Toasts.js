import { addPanel } from './Panel.js';
import { addText, measure, parseMarkup, formatTokens } from './text.js';

/**
 * Small notifications that slide in at the top-left: items received, gold,
 * quest updates, level ups. Queued so they never overlap.
 */
export class Toasts {
  constructor(scene) {
    this.scene = scene;
    this.app = scene.game.app;
    this.queue = [];
    this.active = [];
  }

  push({ text, icon = null, sound = null, hold = 2200 }) {
    this.queue.push({ text, icon, sound, hold });
    this.pump();
  }

  pump() {
    while (this.queue.length && this.active.length < 3) this.show(this.queue.shift());
  }

  show(t) {
    const s = this.scene;
    const formatted = formatTokens(t.text, { app: this.app, session: this.app.session });
    const w = measure(this.app.fontMetrics.main, parseMarkup(formatted).text) + (t.icon ? 30 : 14);
    const h = 20;
    const slot = this.active.length;
    const y = 6 + slot * 23;
    const x = 6;
    const panel = addPanel(s, x, y, w, h, { depth: 600 });
    const parts = [panel];
    let tx = x + 7;
    if (t.icon) {
      parts.push(s.add.image(x + 4, y + 2, 'ui', `icon_${t.icon}`).setOrigin(0, 0).setDepth(601));
      tx = x + 23;
    }
    parts.push(addText(s, tx, y + 5, formatted, { depth: 601 }));
    const entry = { parts, slot };
    this.active.push(entry);
    for (const p of parts) p.x -= w + 10;
    s.tweens.add({ targets: parts, x: `+=${w + 10}`, duration: 180, ease: 'Back.Out' });
    if (t.sound) this.app.audio.ui(t.sound);
    s.time.delayedCall(t.hold, () => {
      s.tweens.add({
        targets: parts,
        alpha: 0,
        duration: 250,
        onComplete: () => {
          parts.forEach((p) => p.destroy());
          this.active = this.active.filter((e) => e !== entry);
          // Slide the remaining toasts up.
          this.active.forEach((e, i) => {
            if (e.slot !== i) {
              s.tweens.add({ targets: e.parts, y: `-=${(e.slot - i) * 23}`, duration: 150 });
              e.slot = i;
            }
          });
          this.pump();
        },
      });
    });
  }

  clear() {
    this.queue = [];
    for (const e of this.active) e.parts.forEach((p) => p.destroy());
    this.active = [];
  }
}
