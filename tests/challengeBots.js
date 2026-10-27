import { createTimingBar, stepTimingBar, pressTimingBar, inZone, timingBarResult, timingBarSettings, TIMING_DEFAULTS } from '../src/systems/timingBar.js';
import { createTension, stepTension, autoHold, tensionResult } from '../src/systems/tension.js';
import { REPAIR_KINDS } from '../src/systems/repairKinds.js';
import { seededRandom } from '../src/systems/challenge/rng.js';

/**
 * Simulated hands for the challenge mechanics (docs/gameplay-overhaul/07-challenge-outcomes.md):
 * they play the real rules (src/systems/timingBar.js, src/systems/tension.js)
 * frame by frame, so a test's "failure" is a failure the game itself
 * produces, not a number a mock made up. Deterministic: the bar's green
 * follows the attempt's seed, and the hands follow fixed rules.
 */
const FRAME = 1000 / 60;

/**
 * Timing-bar hands:
 *   'perfect'        presses only on the green
 *   'fumble'         presses only off the green (when the whole bar is green, it can't miss)
 *   { fumbles: n }   n deliberate fumbles, then perfect
 *   'idle'           never presses (a strict clock runs out; a legacy bar waits forever: don't)
 */
export function playTimingBar(cfg, hand = 'perfect', rnd = Math.random) {
  const st = createTimingBar(cfg, rnd);
  let toFumble = hand === 'fumble' ? Infinity : typeof hand === 'object' ? hand.fumbles ?? 0 : 0;
  for (let frame = 0; frame < 60 * 600 && st.phase === 'running'; frame++) {
    stepTimingBar(st, FRAME);
    if (st.phase !== 'running' || st.lock > 0 || hand === 'idle') continue;
    const onGreen = inZone(st);
    if (toFumble > 0) {
      // Trying to miss; a steadied (all-green) bar can't be missed.
      const allGreen = st.zoneWidth >= st.cfg.barW;
      if (!onGreen || allGreen) {
        pressTimingBar(st);
        if (!allGreen) toFumble -= 1;
      }
    } else if (onGreen) pressTimingBar(st);
  }
  return timingBarResult(st);
}

/**
 * The bar a repair step would show, with the game's numbers (timingBarSettings,
 * as the overlay uses it): the step's, the challenge's (difficulty included) and
 * the attempt's assist. `bonus` is the leader's stat (the harness has no leader: 0;
 * -0.25 is the weakest leader the validator allows for).
 */
export function repairBarConfig(opts, info = null, { bonus = 0, assist = info?.assist ?? null } = {}) {
  const K = REPAIR_KINDS[opts.kind] ?? REPAIR_KINDS.hull;
  return timingBarSettings({ baseSpeed: K.speed ?? 150, speed: opts.speed ?? 1, zone: opts.zone ?? 26, strikes: opts.strikes ?? 3, barW: TIMING_DEFAULTS.barW, challenge: info, bonus, condition: opts.condition ?? null, assist });
}

/**
 * Sash-tension hands:
 *   'perfect'    keeps the needle in the band, lets go on the cue
 *   'slack'      never pulls (the grip goes, in a strict trial)
 *   'tight'      always pulls (it tears, if the trial can tear)
 *   { early: s } perfect until s seconds, then lets go on purpose
 *   'noRelease'  perfect, but never presses on the cue (the hands slip)
 */
export function playTension(def, hand = 'perfect', rnd = seededRandom(1)) {
  const st = createTension(def);
  for (let frame = 0; frame < 60 * 600 && st.phase !== 'done'; frame++) {
    const input = { held: false, pressed: false, release: false };
    if (st.phase === 'hold') {
      if (typeof hand === 'object' && hand.early !== undefined && st.t >= hand.early) input.release = true;
      else if (hand === 'tight') input.held = true;
      else if (hand !== 'slack') input.held = autoHold(st);
    } else if (st.phase === 'release') {
      input.pressed = hand !== 'noRelease';
    }
    stepTension(st, FRAME / 1000, input, rnd);
  }
  return tensionResult(st);
}
