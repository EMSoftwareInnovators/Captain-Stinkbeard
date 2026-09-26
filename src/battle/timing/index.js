import { impactPress } from './impactPress.js';
import { guardPress } from './guardPress.js';

/**
 * Timed-input presenters, keyed by the `type` of a mechanic in
 * data/battle/timing.json. A presenter owns its cue graphics and input
 * reading and returns { grade, early }. To give a new character a different
 * mini-game (hold-and-release, rhythm presses, mashing...), add a presenter
 * here and reference its type from a timing entry; the battle rules stay
 * untouched because they only ever see the resulting grade.
 */
export const TIMING_PRESENTERS = { impactPress, guardPress };

export function getTimingPresenter(type) {
  const presenter = TIMING_PRESENTERS[type];
  if (!presenter) throw new Error(`No timing presenter for mechanic type "${type}"`);
  return presenter;
}
