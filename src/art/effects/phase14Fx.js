import { PixelCanvas } from '../PixelCanvas.js';

/**
 * Particle frames for Story Phase 14: bank forms and deposit slips (the
 * Grand Bank's counter after a deposit), ordinary playing cards (thrown in
 * the air in the Fart-Free Zone, because paper is allowed to flutter in
 * there), oats (the Grand Temporary Ancient Oat Security Officer's last
 * shift), cheap plastic Grand Currency tokens, and the little red-and-gold
 * peppery embers of an Anger Waft.
 */
function paper(lines, tint) {
  const c = new PixelCanvas(5, 6);
  c.rect(0, 0, 5, 6, tint);
  c.hline(0, 4, 0, '#fffaf0');
  for (const y of lines) c.hline(1, 3, y, '#8a8070');
  c.set(4, 5, '#c8bca0');
  return c;
}

function card(suit) {
  const c = new PixelCanvas(4, 5);
  c.rect(0, 0, 4, 5, '#f8f4ec');
  c.set(0, 0, '#c8c0b0');
  c.set(3, 4, '#c8c0b0');
  c.set(1, 2, suit);
  c.set(2, 2, suit);
  c.set(2, 1, suit);
  return c;
}

function oat(light, dark) {
  const c = new PixelCanvas(3, 2);
  c.hline(0, 2, 0, light);
  c.set(1, 1, dark);
  return c;
}

function token(face, rim) {
  const c = new PixelCanvas(4, 4);
  c.rect(1, 0, 2, 4, face);
  c.rect(0, 1, 4, 2, face);
  c.set(0, 1, rim);
  c.set(3, 2, rim);
  c.set(1, 1, '#ffffff');
  return c;
}

function ember(core, edge) {
  const c = new PixelCanvas(3, 4);
  c.set(1, 0, edge);
  c.hline(0, 2, 1, edge);
  c.set(1, 1, core);
  c.hline(0, 2, 2, core);
  c.set(1, 3, edge);
  return c;
}

export function addPhase14Effects(atlas) {
  atlas.add('paper_0', paper([2, 4], '#efe6d0')); // a Grand Deposit form
  atlas.add('paper_1', paper([2, 3], '#e8dcc0')); // a withdrawal slip (never used)
  atlas.add('paper_2', paper([1, 3, 4], '#f0d8c8')); // a fart-backed financial disclosure (pink)
  atlas.add('card_0', card('#c82020'));
  atlas.add('card_1', card('#1a1a24'));
  atlas.add('card_2', card('#c82020'));
  atlas.add('oat_0', oat('#e8d8a0', '#b8a060'));
  atlas.add('oat_1', oat('#d8c488', '#a08a50'));
  atlas.add('oat_2', oat('#f0e4b8', '#c0aa70'));
  atlas.add('gtoken_0', token('#e8c040', '#9a7a20')); // GRAND gold plastic
  atlas.add('gtoken_1', token('#c0a8e0', '#7a60a0')); // GRAND lilac plastic
  atlas.add('gtoken_2', token('#e8a8c0', '#a06078')); // GRAND pink plastic
  atlas.add('ember_0', ember('#ffe060', '#e04018'));
  atlas.add('ember_1', ember('#fff0a0', '#f07020'));
}

export const PHASE14_FX_FRAMES = ['paper_0', 'paper_1', 'paper_2', 'card_0', 'card_1', 'card_2', 'oat_0', 'oat_1', 'oat_2', 'gtoken_0', 'gtoken_1', 'gtoken_2', 'ember_0', 'ember_1'];
