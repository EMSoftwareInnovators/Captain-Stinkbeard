import { timingBarProblems, TIMING_DEFAULTS } from '../timingBar.js';
import { TUNING, tuningProblems } from './difficulty.js';

/**
 * The challenges wired into the outcome contract, and what each can do
 * (docs/gameplay-overhaul/07-challenge-outcomes.md). For every kind:
 *
 *   legacy     outcomes it reports with no challenge config (its old fail-soft self)
 *   strict     outcomes it can report once a step opts in
 *   metrics    the numbers and flags its rules can read
 *   mechanics  the difficulty settings a challenge may give it: its limits, and
 *              its feel (TUNING in ./difficulty.js, which the presets also use)
 *   pairs      an absolute mechanic and the adjustment to the same number: a
 *              layer that sets the absolute one drops a lower layer's adjustment
 *   defaults   the rules a challenge starts from (a profile or the step can change any of them)
 *   endings    the ways an attempt can end, as ranges of its metrics (to check
 *              that every outcome a challenge names can really happen)
 *
 * Other interactive systems are still legacy only; tests/regression/challenges.js
 * keeps the full registry, built on this one.
 */

/** The leader's stat at its weakest (OverlayScene.skillFor: -0.25): the green narrower, the marker faster. */
const WEAKEST_LEADER = -0.25;

const set = (...values) => ({ values });
const range = (min, max = Infinity) => ({ min, max });
const limit = (v) => (v === undefined || v === null ? Infinity : v);

export const CHALLENGE_KINDS = Object.freeze({
  repair: {
    label: 'Timing bar',
    legacy: ['success'],
    strict: ['success', 'partial', 'failure'],
    metrics: ['completed', 'strikes', 'done', 'clean', 'fumbles', 'lucky', 'assisted', 'elapsed', 'accuracy'],
    mechanics: ['maxFumbles', 'timeLimit', 'assist', 'zone', 'speed', ...Object.keys(TUNING.repair)],
    pairs: { zone: 'zoneAdd', speed: 'speedScale' },
    defaults: {
      outcomes: { failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' },
      score: 'accuracy',
    },
    /**
     * Why these mechanics can't be beaten by a perfect hand (step: the repair
     * step's own numbers), even with the weakest leader and the fastest kind.
     */
    problems(mechanics = {}, step = {}) {
      const out = tuningProblems('repair', mechanics, { where: 'mechanics' });
      const zone = (mechanics.zone ?? (step.zone ?? TIMING_DEFAULTS.zone) + (mechanics.zoneAdd ?? 0)) * (1 + WEAKEST_LEADER);
      const mult = mechanics.speed ?? (step.speed ?? 1) * (mechanics.speedScale ?? 1);
      const speed = mult * TIMING_DEFAULTS.speed * 1.2 * (1 - WEAKEST_LEADER * 0.25); // the fastest kind runs ~1.2x
      out.push(...timingBarProblems({ strikes: step.strikes ?? 3, zone: Math.round(zone), speed, timeLimit: mechanics.timeLimit, maxFumbles: mechanics.maxFumbles }));
      return out;
    },
    endings(cfg, step = {}) {
      const m = cfg.mechanics ?? {};
      const strict = cfg.failure;
      const S = Number.isFinite(step.strikes) ? range(step.strikes, step.strikes) : range(1, 12);
      const maxF = strict ? limit(m.maxFumbles) : Infinity;
      const time = strict ? limit(m.timeLimit) : Infinity;
      // Legacy bars (failure off) widen and steady after misses; a strict one only with an assist (its own, or the classic bar).
      const assisted = !strict || m.assist || cfg.assists?.classic !== false ? set(false, true) : set(false);
      const base = { strikes: S, lucky: range(0), assisted, accuracy: range(0, 100) };
      const out = [{ ...base, completed: set(true), done: S, clean: range(0, S.max), fumbles: range(0, maxF), elapsed: range(0, time) }];
      if (strict && Number.isFinite(maxF)) out.push({ ...base, completed: set(false), done: range(0, S.max - 1), clean: range(0, S.max - 1), fumbles: range(maxF + 1, maxF + 1), elapsed: range(0, time) });
      if (strict && Number.isFinite(time)) out.push({ ...base, completed: set(false), done: range(0, S.max - 1), clean: range(0, S.max - 1), fumbles: range(0, maxF), elapsed: range(time, time) });
      return out;
    },
    /** What can end an attempt as a failure, for the message when nothing can. */
    limits: ['maxFumbles', 'timeLimit'],
  },
  sashTension: {
    label: 'Sash tension',
    legacy: ['success'],
    strict: ['success', 'partial', 'failure'],
    metrics: ['completed', 'early', 'released', 'deliberate', 'accidental', 'torn', 'fluttered', 'ceremony', 'cause', 'slips', 'seconds', 'grip'],
    mechanics: ['maxSlips', 'grip', 'breakAt', 'earlyRelease', ...Object.keys(TUNING.sashTension)],
    /**
     * The rules start from the captain's intent, because the ceremony's result
     * and the player's objective are different things:
     *   complete  hold to the cue, then let go (the trial as the story runs it)
     *   sabotage  make it flutter early, on purpose (breaking the ceremony is the point)
     * No difficulty changes the intent: a sabotage is a sabotage on every difficulty.
     */
    intents: {
      complete: { failure: { completed: false }, success: { completed: true, deliberate: true, slips: 0 }, fallback: 'partial' },
      sabotage: { failure: { fluttered: false }, success: { early: true, deliberate: true }, fallback: 'partial' },
    },
    defaults: { intent: 'complete', score: 'seconds' },
    problems(mechanics = {}) {
      const out = tuningProblems('sashTension', mechanics, { where: 'mechanics' });
      if (mechanics.maxSlips !== undefined && !(mechanics.maxSlips >= 0)) out.push('"maxSlips" must be 0 or more');
      const g = mechanics.grip;
      if (g && !((g.recover ?? 10) > 0)) out.push('"grip.recover" must be positive, or the hands can never recover');
      if (mechanics.breakAt && !(mechanics.breakAt.value > 70)) out.push('"breakAt.value" must be above any band (over 70)');
      return out;
    },
    endings(cfg, step = {}) {
      const m = cfg.mechanics ?? {};
      const strict = cfg.failure;
      const secs = Number.isFinite(step.seconds) ? range(step.seconds, step.seconds) : range(1, 120);
      const slips = range(0, strict ? limit(m.maxSlips) : Infinity);
      const grip = range(0, 100);
      const held = { completed: set(true), early: set(false), torn: set(false), fluttered: set(false), ceremony: set('completed'), slips, seconds: secs, grip };
      const out = [
        { ...held, released: set('pressed'), deliberate: set(true), accidental: set(false), cause: set('deliberate') },
        { ...held, released: set('slipped'), deliberate: set(false), accidental: set(true), cause: set('accident') },
      ];
      if (!strict) return out;
      const early = { completed: set(false), early: set(true), seconds: range(0, secs.max), grip };
      if (m.earlyRelease) out.push({ ...early, released: set('deliberate'), deliberate: set(true), accidental: set(false), torn: set(false), fluttered: set(true), ceremony: set('broken'), cause: set('deliberate'), slips });
      if (m.maxSlips !== undefined || m.grip) out.push({ ...early, released: set('lost'), deliberate: set(false), accidental: set(true), torn: set(false), fluttered: set(true), ceremony: set('broken'), cause: set('accident'), slips: range(0, limit(m.maxSlips) + 1) });
      if (m.breakAt) out.push({ ...early, released: set('torn'), deliberate: set(false), accidental: set(true), torn: set(true), fluttered: set(false), ceremony: set('torn'), cause: set('accident'), slips });
      return out;
    },
    limits: ['maxSlips', 'grip', 'breakAt', 'earlyRelease'],
  },
  sharkDuty: {
    label: 'Shark Duty',
    legacy: ['success'],
    strict: ['success', 'partial', 'failure'],
    metrics: ['completed', 'repelled', 'bites', 'missed', 'patched', 'elapsed', 'worstSection'],
    mechanics: ['maxBites', 'sectionBites', 'maxMissed', 'timeLimit', 'shove', ...Object.keys(TUNING.sharkDuty)],
    defaults: {
      outcomes: { failure: { completed: false }, success: { bites: 0, missed: 0 }, fallback: 'partial' },
      score: 'repelled',
    },
    problems(mechanics = {}) {
      const out = tuningProblems('sharkDuty', mechanics, { where: 'mechanics' });
      for (const k of ['maxBites', 'maxMissed']) if (mechanics[k] !== undefined && !(mechanics[k] >= 0)) out.push(`"${k}" must be 0 or more`);
      if (mechanics.timeLimit !== undefined && !(mechanics.timeLimit >= 30000)) out.push('"timeLimit" under 30 s leaves no time to walk the rail');
      return out;
    },
    endings(cfg) {
      const m = cfg.mechanics ?? {};
      const strict = cfg.failure;
      const sections = Object.values(m.sectionBites ?? {});
      const worst = strict && sections.length ? Math.max(...sections) : Infinity;
      const done = { completed: set(true), repelled: range(0), bites: range(0, strict ? limit(m.maxBites) : Infinity), missed: range(0, strict ? limit(m.maxMissed) : Infinity), patched: range(0), elapsed: range(0, strict ? limit(m.timeLimit) : Infinity), worstSection: range(0, worst) };
      const out = [done];
      const can = strict && (m.maxBites !== undefined || m.maxMissed !== undefined || m.timeLimit || sections.length);
      if (can) out.push({ ...done, completed: set(false), bites: range(0), missed: range(0), elapsed: range(0), worstSection: range(0) });
      return out;
    },
    limits: ['maxBites', 'sectionBites', 'maxMissed', 'timeLimit'],
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
