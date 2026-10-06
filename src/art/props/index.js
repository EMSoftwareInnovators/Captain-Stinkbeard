import { DECK_PROPS } from './deckProps.js';
import { INTERIOR_PROPS } from './interiorProps.js';
import { STORY_PROPS, withFoulTwins } from './storyProps.js';
import { PHASE3_PROPS } from './phase3Props.js';
import { PHASE4_PROPS } from './phase4Props.js';
import { PHASE5_PROPS } from './phase5Props.js';
import { PHASE6_PROPS } from './phase6Props.js';
import { PHASE7_PROPS } from './phase7Props.js';
import { PHASE8_PROPS } from './phase8Props.js';
import { PHASE9_PROPS } from './phase9Props.js';
import { PHASE10_PROPS } from './phase10Props.js';
import { PHASE11_PROPS } from './phase11Props.js';

/** Every prop painter by sprite name (treasure also comes in a contaminated "_foul" twin). */
export const PROP_PAINTERS = withFoulTwins({ ...DECK_PROPS, ...INTERIOR_PROPS, ...STORY_PROPS, ...PHASE3_PROPS, ...PHASE4_PROPS, ...PHASE5_PROPS, ...PHASE6_PROPS, ...PHASE7_PROPS, ...PHASE8_PROPS, ...PHASE9_PROPS, ...PHASE10_PROPS, ...PHASE11_PROPS });

/** Normalises a painter result to { frames: PixelCanvas[], ms }. */
export function paintProp(name) {
  const painter = PROP_PAINTERS[name];
  if (!painter) throw new Error(`No prop painter "${name}"`);
  const out = painter();
  return out.frames ? out : { frames: [out], ms: 0 };
}
