import { PixelCanvas } from '../PixelCanvas.js';

/**
 * Particle frames for Story Phase 10: beans (the Bean Smoothie gets loose and
 * it rains beans in the galley; a pot boils over) and cheap plastic confetti
 * (the Bling Bling King's prizes come with it: fake gold, pink, teal, a
 * little foil star).
 */
function bean(base, light, dark) {
  const c = new PixelCanvas(4, 3);
  c.hline(1, 2, 0, base);
  c.hline(0, 3, 1, base);
  c.hline(1, 2, 2, dark);
  c.set(1, 0, light);
  return c;
}

function confetti(color, shade, v) {
  const c = new PixelCanvas(3, 3);
  if (v === 0) {
    c.hline(0, 2, 1, color);
    c.set(2, 1, shade);
  } else if (v === 1) {
    c.set(0, 0, color);
    c.set(1, 1, color);
    c.set(2, 2, shade);
  } else {
    // a little foil star
    c.set(1, 0, color);
    c.hline(0, 2, 1, color);
    c.set(1, 2, shade);
  }
  return c;
}

export function addPhase10Effects(atlas) {
  atlas.add('bean_0', bean('#8a3a22', '#c0644a', '#5a2414')); // red beans
  atlas.add('bean_1', bean('#a0602a', '#d08a48', '#6a3c18')); // baked, in sauce
  atlas.add('bean_2', bean('#3a2a20', '#5e4636', '#1e140e')); // burnt
  atlas.add('confetti_0', confetti('#e8c040', '#9a7a20', 0)); // fake gold
  atlas.add('confetti_1', confetti('#e868a8', '#a83a70', 1)); // pink
  atlas.add('confetti_2', confetti('#48c0b0', '#2a7a70', 0)); // teal
  atlas.add('confetti_3', confetti('#f0e070', '#b0a040', 2)); // foil star
}

export const PHASE10_FX_FRAMES = ['bean_0', 'bean_1', 'bean_2', 'confetti_0', 'confetti_1', 'confetti_2', 'confetti_3'];
