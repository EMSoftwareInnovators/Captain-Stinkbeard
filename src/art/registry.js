import { ICON_NAMES } from './ui/itemIcons.js';
import { STATUS_ICON_NAMES } from './ui/statusIconNames.js';
import { PROP_NAMES } from './props/propNames.js';
import { ENEMY_ART_NAMES } from './enemies/enemyNames.js';
import { BACKDROP_NAMES } from './backdrops/backdropNames.js';
import { TIMING_TYPES } from '../systems/battle/timingTypes.js';

/**
 * Names of art that exists in code, so content validation can check that
 * data only refers to things that can actually be drawn.
 */
export const ART_REGISTRY = {
  icons: new Set(ICON_NAMES),
  statusIcons: new Set(STATUS_ICON_NAMES),
  props: new Set(PROP_NAMES),
  enemies: new Set(ENEMY_ART_NAMES),
  backdrops: new Set(BACKDROP_NAMES),
  timingTypes: new Set(TIMING_TYPES),
};
