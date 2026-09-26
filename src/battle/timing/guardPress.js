import { gradeTiming } from '../../systems/battle/timing.js';
import { trackPress } from './pressTracker.js';

/**
 * "Press as the blow lands" on defence: a well-timed press reduces the
 * damage of an incoming attack. There is deliberately no on-screen cue
 * beyond the attacker's lunge; players learn to read the enemy.
 */
export const guardPress = {
  async run(scene, { mechanic, impactAt }) {
    const r = await trackPress(scene, {
      impactAt,
      lockoutMs: mechanic.earlyLockoutMs ?? 300,
      closeMs: mechanic.windows?.good ?? 130,
    });
    return { grade: r.early ? 'none' : gradeTiming(mechanic, r.delta), early: r.early };
  },
};
