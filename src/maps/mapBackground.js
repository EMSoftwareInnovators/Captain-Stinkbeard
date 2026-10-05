import { evaluateCondition } from '../systems/conditions/conditions.js';

/** What a map can show outside its walls and rails. */
export const BACKGROUNDS = ['void', 'ocean', 'stormsky'];

/**
 * What's outside the rails right now (Story Phase 10: the open sea, until
 * the Revenge is carried up into the Great Sharkstorm and it's the inside of
 * the storm going round). A map (or a patch) may change it with
 * "backgroundVariants": [{ "if": ..., "background": "stormsky" }], first
 * match wins (patches' variants come first). Works on a compiled map.
 */
export function mapBackground(model, session) {
  const meta = model?.meta ?? {};
  const v = (meta.backgroundVariants ?? []).find((b) => evaluateCondition(b.if, session));
  return v?.background ?? meta.background ?? 'void';
}
