import { PixelCanvas } from '../PixelCanvas.js';
import { mix } from '../palette.js';
import { flyingShark } from './stagePhase6.js';

/**
 * Stage sprites for Story Phase 17: the Fire-Sharkstorm's sharks (the same
 * surprised flying shark, lit orange along its back by the burning vortex,
 * a little flame streaming off the tail). Scenery only, like every pass.
 */
const FIRE = ['#a8241c', '#e8642a', '#f4a83a', '#fce07a'];

function flyingSharkLit(frame) {
  const src = flyingShark(frame);
  const c = new PixelCanvas(36, 20);
  c.blit(src, 0, 4);
  // the glow: every pixel along the top of the shark takes the fire's colour
  for (let x = 0; x < 30; x++) {
    for (let y = 0; y < 20; y++) {
      if (!c.alphaAt(x, y)) continue;
      c.set(x, y, mix(c.get(x, y), FIRE[2], 0.55));
      if (c.alphaAt(x, y + 1)) c.set(x, y + 1, mix(c.get(x, y + 1), FIRE[1], 0.25));
      break;
    }
  }
  // flames off the dorsal fin and the tail, flickering between frames
  const k = frame ? 1 : 0;
  c.set(16, 3 - k, FIRE[1]); c.set(17, 2, FIRE[2]); c.set(15, 2 + k, FIRE[3]);
  for (const [x, y, i] of [[30, 11, 1], [31, 10 + k, 2], [32, 12, 1], [33, 11 - k, 3], [34, 12 + k, 2], [35, 11, 0]]) c.set(x, y, FIRE[i]);
  return c;
}

export function addPhase17StageFrames(atlas) {
  atlas.add('flying_shark_lit_0', flyingSharkLit(0));
  atlas.add('flying_shark_lit_1', flyingSharkLit(1));
}

export const PHASE17_STAGE_FRAMES = ['flying_shark_lit_0', 'flying_shark_lit_1'];
