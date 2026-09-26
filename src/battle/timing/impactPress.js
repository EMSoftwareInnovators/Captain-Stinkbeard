import { gradeTiming } from '../../systems/battle/timing.js';
import { trackPress } from './pressTracker.js';

const RING_START = 26;
const RING_END = 6;

/**
 * "Press as the blow lands" — Blackbeard's cutlass.
 *
 * A white ring closes on the target and meets the gold ring at the moment of
 * impact. `hooks.impact()` fires on that moment so the attacker can swing.
 */
export const impactPress = {
  async run(scene, { mechanic, target, hooks = {} }) {
    const windup = mechanic.windupMs ?? 420;
    const start = scene.time.now;
    const impactAt = start + windup;
    const press = trackPress(scene, {
      impactAt,
      lockoutMs: mechanic.earlyLockoutMs ?? 250,
      closeMs: mechanic.windows?.good ?? 150,
    });
    const cue = mechanic.cue === false ? null : new RingCue(scene, target.hitX, target.hitY, start, impactAt);
    press.then((r) => {
      if (r.early) cue?.whiff();
    });
    await scene.waitUntil(impactAt);
    hooks.impact?.();
    cue?.impact();
    const r = await press;
    const grade = r.early ? 'none' : gradeTiming(mechanic, r.delta);
    cue?.finish(grade);
    return { grade, early: r.early };
  },
};

class RingCue {
  constructor(scene, x, y, start, impactAt) {
    this.scene = scene;
    this.start = start;
    this.impactAt = impactAt;
    this.target = scene.add.image(x, y, 'fx', 'ring_target').setDepth(950).setAlpha(0.9);
    this.ring = scene.add.image(x, y, 'fx', `ring_${RING_START}`).setDepth(951);
    this.hook = () => {
      const t = Math.min(1, (scene.time.now - this.start) / (this.impactAt - this.start));
      const r = Math.round(RING_START + (RING_END - RING_START) * t * t);
      this.ring.setFrame(`ring_${Math.max(3, r)}`);
    };
    scene.addFrameHook(this.hook);
  }

  whiff() {
    this.stop();
    this.ring.setAlpha(0.25);
    this.target.setAlpha(0.35);
  }

  impact() {
    this.stop();
    this.ring.setVisible(false);
  }

  finish(grade) {
    this.stop();
    const parts = [this.ring, this.target];
    if (grade !== 'none') {
      this.target.setFrame('ring_target_hit').setAlpha(1);
      this.scene.tweens.add({ targets: this.target, scale: 2, alpha: 0, duration: 260, onComplete: () => parts.forEach((p) => p.destroy()) });
    } else {
      this.scene.tweens.add({ targets: parts, alpha: 0, duration: 160, onComplete: () => parts.forEach((p) => p.destroy()) });
    }
  }

  stop() {
    this.scene.removeFrameHook(this.hook);
  }
}
