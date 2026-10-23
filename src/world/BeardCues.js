import { substance } from '../systems/ship/air.js';

/** The label a vision puts over somebody nearby: never their name, never what talking to them does. */
const FALSE_LABEL = '<p>(?) Grand Stenchmaster?</>';

/**
 * Overhaul Prompt 9: the Stink Beard's cues in the world
 * (docs/gameplay-overhaul/13-beard-saturation.md). The rules are
 * systems/ship/BeardState.js; nothing here changes them.
 *
 *  - a gagging fit: he stops a moment (the cough's hold), "*gag*" over him;
 *  - a warning puff at critical and worse: "*pff*" at his chin and a wisp
 *    (no gas: the purge is the release);
 *  - a purge: its sound and a burst of the gas's colour;
 *  - a vision (paranoia): a toast in purple that always begins "(?)", never
 *    on the HUD line (the real warnings stay there), and the label "(?)
 *    Grand Stenchmaster?" over the nearest person on screen for a moment:
 *    their name, their sprite and what talking to them does never change;
 *  - the hornets: "*bzzz*" over him and the buzz (the hook a later system can take).
 * Reduced effects: no wisps or bursts; the words and sounds stay (a warning
 * is never hidden), and the simulation is untouched.
 */
export class BeardCues {
  constructor(scene) {
    this.scene = scene;
    this.app = scene.app;
    this.subs = [
      this.app.bus.on('beard:gag', () => this.onGag()),
      this.app.bus.on('beard:puff', () => this.onPuff()),
      this.app.bus.on('beard:purged', (e) => this.onPurged(e)),
      this.app.bus.on('beard:hallucinate', (e) => this.onVision(e)),
      this.app.bus.on('beard:hornets', () => this.onHornets()),
    ];
  }

  destroy() {
    this.subs.forEach((off) => off());
    this.subs = [];
  }

  get reduced() {
    return this.app.settings.reducedEffects();
  }

  /** True while a scene, a dialogue or a room change has him (cues wait for the world). */
  get away() {
    return this.scene.isBusy?.() || this.scene.leaving;
  }

  onGag() {
    if (this.away) return;
    this.scene.coughMs = Math.max(this.scene.coughMs ?? 0, 650);
    this.app.audio.sfx('gag', { volume: 0.6 });
    this.scene.barks.show(this.scene.player, '<o>*gag* *hurk*</>', { duration: 900 });
  }

  onPuff() {
    if (this.away) return;
    const p = this.scene.player;
    this.app.audio.sfx('puff_tiny', { volume: 0.35 });
    this.scene.barks.show(p, '<y>*pff*</>', { duration: 600 });
    if (!this.reduced) this.scene.fx.burst('fume', p.px, p.py - 4, { count: 2, tint: 0x9cc858, alpha: 0.35, depth: 70011 });
  }

  onPurged(e) {
    const p = this.scene.player;
    this.app.audio.sfx(e.profile === 'controlled' ? 'puff_tiny' : 'release_rumble', { volume: 0.7 });
    if (this.away || this.reduced) return;
    const sub = Object.keys(e.released ?? {})[0];
    const tint = substance(this.scene.content, sub)?.color ?? 0x9cc858;
    this.scene.fx.burst('fume', p.px, p.py - 6, { count: e.profile === 'controlled' ? 3 : 7, tint, alpha: 0.55, depth: 70011 });
  }

  onVision(e) {
    if (this.away) return;
    this.app.overlay?.toasts.push({ text: `<p>${e.text}</>`, hold: 2600 });
    const who = this.nearest();
    if (who) this.scene.barks.show(who, FALSE_LABEL, { duration: 1400 });
  }

  onHornets() {
    if (this.away) return;
    this.app.audio.sfx('hornet_buzz', { volume: 0.35 });
    this.scene.barks.show(this.scene.player, '<o>*bzzz*</>', { duration: 700 });
  }

  /** The nearest person on screen (within 8 tiles), or nobody. */
  nearest() {
    const p = this.scene.player;
    let best = null;
    let d0 = 8 * 16;
    for (const a of this.scene.actors?.values?.() ?? []) {
      if (!a || a === p || a.sprite?.visible === false || !Number.isFinite(a.px)) continue;
      const d = Math.hypot(a.px - p.px, a.py - p.py);
      if (d < d0) {
        d0 = d;
        best = a;
      }
    }
    return best;
  }
}
