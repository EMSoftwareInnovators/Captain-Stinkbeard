import { DECK_PROPS } from './deckProps.js';
import { INTERIOR_PROPS } from './interiorProps.js';

/** Every prop painter by sprite name. */
export const PROP_PAINTERS = { ...DECK_PROPS, ...INTERIOR_PROPS };

/** Normalises a painter result to { frames: PixelCanvas[], ms }. */
export function paintProp(name) {
  const painter = PROP_PAINTERS[name];
  if (!painter) throw new Error(`No prop painter "${name}"`);
  const out = painter();
  return out.frames ? out : { frames: [out], ms: 0 };
}
