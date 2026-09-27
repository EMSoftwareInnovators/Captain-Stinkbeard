import { ICON_NAMES } from './ui/itemIcons.js';
import { STATUS_ICON_NAMES } from './ui/statusIconNames.js';
import { PROP_NAMES } from './props/propNames.js';
import { ENEMY_ART_NAMES } from './enemies/enemyNames.js';
import { BACKDROP_NAMES } from './backdrops/backdropNames.js';
import { TIMING_TYPES } from '../systems/battle/timingTypes.js';
import { STAGE_FRAMES } from './stage/stageArt.js';
import { VISTA_FRAMES, VISTA_SKIES } from './vista/vistaArt.js';
import { INSERT_NAMES } from './inserts/insertArt.js';
import { FUME_FX_FRAMES } from './effects/fumeArt.js';
import { EXPRESSION_NAMES } from './portraits/portraitPainter.js';
import { EXTRA_POSES } from './characters/characterPainter.js';

const BASE_FX_FRAMES = ['sparkle_0', 'smoke_0', 'impact_0', 'shadow_s', 'shadow_m', 'shadow_l', 'shadow_xs'];

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
  stage: new Set(STAGE_FRAMES),
  vista: new Set(VISTA_FRAMES),
  vistaSkies: new Set(VISTA_SKIES),
  inserts: new Set(INSERT_NAMES),
  fx: new Set([...FUME_FX_FRAMES, ...BASE_FX_FRAMES]),
  expressions: new Set(EXPRESSION_NAMES),
  extraPoses: new Set(Object.keys(EXTRA_POSES)),
  portraitPainters: new Set(['parrot']),
  characterPainters: new Set(['parrot']),
};
