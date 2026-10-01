import { DECK_PROPS } from './deckProps.js';
import { INTERIOR_PROPS } from './interiorProps.js';
import { STORY_PROPS, withFoulTwins } from './storyProps.js';
import { PHASE3_PROPS } from './phase3Props.js';
import { PHASE4_PROPS } from './phase4Props.js';
import { PHASE5_PROPS } from './phase5Props.js';

/** Every prop painter by sprite name (treasure also comes in a contaminated "_foul" twin). */
export const PROP_PAINTERS = withFoulTwins({ ...DECK_PROPS, ...INTERIOR_PROPS, ...STORY_PROPS, ...PHASE3_PROPS, ...PHASE4_PROPS, ...PHASE5_PROPS });

/** Normalises a painter result to { frames: PixelCanvas[], ms }. */
export function paintProp(name) {
  const painter = PROP_PAINTERS[name];
  if (!painter) throw new Error(`No prop painter "${name}"`);
  const out = painter();
  return out.frames ? out : { frames: [out], ms: 0 };
}
