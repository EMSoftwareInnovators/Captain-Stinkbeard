import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';

/**
 * Stage sprites for Story Phase 6: the sharks the Great Sharkstorm flings
 * across the deck (seen from above, tumbling, mouths open, very surprised),
 * the shadow each one throws on the deck, and a barrel of concentrated Frog
 * Grog in flight.
 */
const INK = PAL.ink;
const SHARK = { d: '#3a4658', m: '#5a6a80', l: '#8a9ab0', belly: '#d8dce4' };

/** A flying shark, top-down-ish and three-quarter, tail flicking. */
function flyingShark(frame) {
  const c = new PixelCanvas(30, 16);
  const k = frame ? 1 : -1;
  c.ellipse(13, 8, 10, 4, SHARK.m);
  c.ellipse(12, 9, 8, 2, SHARK.belly);
  c.poly([[12, 4], [16, 0], [17, 5]], SHARK.d); // dorsal fin
  c.poly([[22, 8], [29, 3 + k], [26, 8], [29, 13 + k]], SHARK.d); // tail
  c.poly([[9, 11], [6, 15], [13, 11]], SHARK.d); // pectoral
  // the face: an open mouth and an alarmed eye
  c.poly([[3, 8], [7, 6], [7, 10]], '#5a1a20');
  for (const tx of [4, 6]) c.set(tx, 7, '#f4f0e8');
  c.set(6, 10, '#f4f0e8');
  c.set(7, 6, '#ffffff');
  c.set(8, 6, '#0a0a10');
  c.outline(INK);
  // a trail of spray behind it
  for (const [x, y] of [[29, 8], [28, 10]]) if (!c.alphaAt(x, y)) c.set(x, y, '#bfe6f2');
  return c;
}

function flyingShadow() {
  const c = new PixelCanvas(26, 8);
  c.ellipse(12, 4, 11, 3, '#0a0c18');
  c.poly([[20, 4], [25, 1], [25, 7]], '#0a0c18');
  return c;
}

function barrelThrown(frame) {
  const c = new PixelCanvas(16, 16);
  // a barrel tumbling end over end
  if (frame) {
    c.ellipse(8, 8, 7, 5, '#7a5428');
    for (const x of [3, 8, 13]) c.vline(x, 4, 12, '#4c4c58');
    c.ellipse(1, 8, 1.5, 4, '#5a3a1c');
  } else {
    c.ellipse(8, 8, 5, 7, '#7a5428');
    for (const y of [3, 8, 13]) c.hline(4, 12, y, '#4c4c58');
    c.ellipse(8, 1, 4, 1.5, '#5a3a1c');
  }
  c.rect(6, 6, 4, 4, '#7aa02c');
  c.outline(INK);
  return c;
}

export function addPhase6StageFrames(atlas) {
  atlas.add('flying_shark_0', flyingShark(0));
  atlas.add('flying_shark_1', flyingShark(1));
  atlas.add('flying_shark_shadow', flyingShadow());
  atlas.add('barrel_thrown_0', barrelThrown(0));
  atlas.add('barrel_thrown_1', barrelThrown(1));
}

export const PHASE6_STAGE_FRAMES = ['flying_shark_0', 'flying_shark_1', 'flying_shark_shadow', 'barrel_thrown_0', 'barrel_thrown_1'];
