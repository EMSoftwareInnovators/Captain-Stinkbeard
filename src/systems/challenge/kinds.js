import { timingBarProblems, TIMING_DEFAULTS } from '../timingBar.js';

/**
 * The challenges wired into the outcome contract, and what each can do
 * (docs/gameplay-overhaul/07-challenge-outcomes.md). For every kind:
 *
 *   legacy     outcomes it reports with no challenge config (its old fail-soft self)
 *   strict     outcomes it can report once a step opts in
 *   metrics    the numbers and flags its rules can read
 *   mechanics  the difficulty settings a challenge may give it
 *   defaults   the rules a challenge starts from (a profile or the step can change any of them)
 *
 * Other interactive systems are still legacy only; tests/regression/challenges.js
 * keeps the full registry, built on this one.
 */
export const CHALLENGE_KINDS = Object.freeze({
  repair: {
    label: 'Timing bar',
    legacy: ['success'],
    strict: ['success', 'partial', 'failure'],
    metrics: ['completed', 'strikes', 'done', 'clean', 'fumbles', 'lucky', 'assisted', 'elapsed', 'accuracy'],
    mechanics: ['maxFumbles', 'timeLimit', 'assist', 'zone', 'speed'],
    defaults: {
      outcomes: { failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' },
      score: 'accuracy',
    },
    /** Why these mechanics can't be beaten by a perfect hand (step: the repair step's own numbers). */
    problems(mechanics = {}, step = {}) {
      const zone = mechanics.zone ?? step.zone ?? TIMING_DEFAULTS.zone;
      const speed = (mechanics.speed ?? step.speed ?? 1) * TIMING_DEFAULTS.speed * 1.2; // the fastest kind runs ~1.2x
      return timingBarProblems({ strikes: step.strikes ?? 3, zone, speed, timeLimit: mechanics.timeLimit, maxFumbles: mechanics.maxFumbles });
    },
  },
  sashTension: {
    label: 'Sash tension',
    legacy: ['success'],
    strict: ['success', 'partial', 'failure'],
    metrics: ['completed', 'early', 'released', 'deliberate', 'accidental', 'torn', 'fluttered', 'ceremony', 'cause', 'slips', 'seconds', 'grip'],
    mechanics: ['maxSlips', 'grip', 'breakAt', 'earlyRelease'],
    /**
     * The rules start from the captain's intent, because the ceremony's result
     * and the player's objective are different things:
     *   complete  hold to the cue, then let go (the trial as the story runs it)
     *   sabotage  make it flutter early, on purpose (breaking the ceremony is the point)
     */
    intents: {
      complete: { failure: { completed: false }, success: { completed: true, deliberate: true, slips: 0 }, fallback: 'partial' },
      sabotage: { failure: { fluttered: false }, success: { early: true, deliberate: true }, fallback: 'partial' },
    },
    defaults: { intent: 'complete', score: 'seconds' },
    problems(mechanics = {}) {
      const out = [];
      if (mechanics.maxSlips !== undefined && !(mechanics.maxSlips >= 0)) out.push('"maxSlips" must be 0 or more');
      const g = mechanics.grip;
      if (g && !((g.recover ?? 10) > 0)) out.push('"grip.recover" must be positive, or the hands can never recover');
      if (mechanics.breakAt && !(mechanics.breakAt.value > 70)) out.push('"breakAt.value" must be above any band (over 70)');
      return out;
    },
  },
  sharkDuty: {
    label: 'Shark Duty',
    legacy: ['success'],
    strict: ['success', 'partial', 'failure'],
    metrics: ['completed', 'repelled', 'bites', 'missed', 'patched', 'elapsed', 'worstSection'],
    mechanics: ['maxBites', 'sectionBites', 'maxMissed', 'timeLimit', 'shove'],
    defaults: {
      outcomes: { failure: { completed: false }, success: { bites: 0, missed: 0 }, fallback: 'partial' },
      score: 'repelled',
    },
    problems(mechanics = {}) {
      const out = [];
      for (const k of ['maxBites', 'maxMissed']) if (mechanics[k] !== undefined && !(mechanics[k] >= 0)) out.push(`"${k}" must be 0 or more`);
      if (mechanics.timeLimit !== undefined && !(mechanics.timeLimit >= 30000)) out.push('"timeLimit" under 30 s leaves no time to walk the rail');
      return out;
    },
  },
});

export function kindDef(kind) {
  return CHALLENGE_KINDS[kind] ?? null;
}

/** Which outcomes a kind can report, legacy or opted in. */
export function supportedOutcomes(kind, { strict = false } = {}) {
  const k = kindDef(kind);
  if (!k) return [];
  return strict ? k.strict : k.legacy;
}
