import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';

/**
 * Stage sprites for Story Phase 14 (RETURN OF BROGATH): the plume of the old
 * treasure-room cloud that got out through the crack (yellow-brown, holding
 * itself together, three frames of slow churn: "plume"), the captain's
 * tricorn leaving his head in the first eruption, and a sack of oats on its
 * way out of the porthole into the Sharkstorm.
 */
const INK = PAL.ink;

function plume(f) {
  const c = new PixelCanvas(24, 24);
  const blobs = [[12, 14, 7, 6], [8, 11, 5, 4], [16, 10, 5, 5], [12, 7, 4, 4]];
  const cols = ['#8a7a3a', '#b0a050', '#cabc6a', '#e0d488'];
  blobs.forEach(([x, y, rx, ry], i) => {
    const dx = Math.round(Math.sin((f + i) * 2.1) * 1.2);
    const dy = Math.round(Math.cos((f + i) * 1.7));
    c.ellipse(x + dx, y + dy, rx, ry, cols[i % 2]);
  });
  for (const [x, y] of [[9, 10], [14, 8], [12, 13], [17, 12]]) c.set(x + (f % 2), y, cols[3]);
  // a wisp trailing, which way depends on the frame
  c.line(12, 20, 12 + (f - 1) * 3, 23, cols[1]);
  return c;
}

function hatTricorn() {
  const c = new PixelCanvas(16, 10);
  c.poly([[1, 6], [8, 1], [15, 6], [8, 8]], '#1e1a22');
  c.hline(3, 13, 6, '#c8982a');
  c.set(8, 2, '#3a3440');
  c.outline(INK);
  return c;
}

function oatSackItem() {
  const c = new PixelCanvas(14, 14);
  c.ellipse(7, 8, 5, 5, '#a8844e');
  c.rect(5, 1, 4, 3, '#7a5a32');
  c.hline(4, 9, 4, PAL.rope2);
  for (const [x, y] of [[1, 12], [12, 11], [3, 13]]) c.set(x, y, '#e8d8a0');
  c.outline(INK);
  return c;
}

export function addPhase14StageFrames(atlas) {
  for (const f of [0, 1, 2]) atlas.add(`plume_${f}`, plume(f));
  atlas.add('hat_tricorn', hatTricorn());
  atlas.add('oat_sack_item', oatSackItem());
}

export const PHASE14_STAGE_FRAMES = ['plume_0', 'plume_1', 'plume_2', 'hat_tricorn', 'oat_sack_item'];
export const PHASE14_STAGE_ANIMS = { plume: ['plume_0', 'plume_1', 'plume_2', 'plume_1'] };
