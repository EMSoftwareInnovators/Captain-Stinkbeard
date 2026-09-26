/**
 * Timed-input grading, shared by the battle scene (which measures the press)
 * and the engine (which applies the result).
 *
 * Mechanic configs live in data/battle/timing.json. Each mechanic has a
 * `type` handled by a presenter in src/battle/timing/ — new characters can get
 * entirely different mini-mechanics by adding a new type there.
 */
export const TIMING_GRADES = ['perfect', 'great', 'good', 'none'];

/**
 * @param {object} mechanic - { windows: { perfect: ms, great: ms, good: ms } }
 * @param {number|null} deltaMs - press time minus impact time (null = no press)
 */
export function gradeTiming(mechanic, deltaMs) {
  if (deltaMs === null || deltaMs === undefined || !Number.isFinite(deltaMs)) return 'none';
  const d = Math.abs(deltaMs);
  const w = mechanic.windows || {};
  if (w.perfect !== undefined && d <= w.perfect) return 'perfect';
  if (w.great !== undefined && d <= w.great) return 'great';
  if (w.good !== undefined && d <= w.good) return 'good';
  return 'none';
}

export function timingMultiplier(mechanic, grade) {
  return mechanic?.multipliers?.[grade] ?? 1;
}
