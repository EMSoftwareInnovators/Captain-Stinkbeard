import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { drawText, textWidth } from '../font/drawText.js';

/**
 * Story Phase 10 close-ups:
 *   - the Bling Bling King's participation coin, both sides (cheap plastic,
 *     fake gold coming off, a mould seam, printing a little off-centre);
 *   - the labels: CRYING BEANS (absurdly yellow, a crying bean), SPICY STENCH
 *     SAUCE (its warnings; the same CLEARANCE sticker as the sash: the same
 *     discount shop), and a can of baked beans Garrick has relabelled;
 *   - the storm's mocking prizes: bedtime tokens, the Grand Award Ribbon, a
 *     leadership trophy, organisational advice, good-luck tokens, the
 *     Cowardice Award (an absurdly long title, and a sash fluttering
 *     improperly in the artwork), the last token of the night;
 *   - the book, "The Grand Expedition for the Lost Fart", its cover and the
 *     Rumpold chapter (Garrick's hand; not a reliable source), the captain's
 *     research notes and plan (the fifty-three clause: Garrick's claim);
 *   - the Grand Feast, plated; Hale's tally of the crater salvage.
 */
const INK = PAL.ink;
const PLASTIC = { d: '#8a6a1c', m: '#d8b440', l: '#f4dc78', bare: '#e8e0cc', seam: '#b89a50' };
const PINK = { d: '#a83a70', m: '#e868a8', l: '#f8a8d0' };
const TEAL = { d: '#2a7a70', m: '#48c0b0', l: '#98e8dc' };
const CRAY = { paper: '#efe4c4', paperD: '#dccfa8', brown: '#8a5426', red: '#d8322a', blue: '#2f64d0', green: '#3a9a3a', burg: '#7a1826', grey: '#7a7a86' };
const LEDGER = { page: '#e6dab8', rule: '#d0c4a0', margin: '#d8a0a0', stain: '#c8b070', grease: '#d8c060' };

function lines(c, list, x, y, color, { gap = 10, center = true, shadow = null } = {}) {
  list.forEach((t, i) => drawText(c, t, x, y + i * gap, color, { center, shadow }));
}

// --- the participation coin --------------------------------------------------------

function coinBase() {
  const c = new PixelCanvas(150, 150);
  c.ellipse(75, 75, 72, 72, PLASTIC.d);
  c.ellipse(75, 74, 68, 68, PLASTIC.m);
  c.ellipse(75, 74, 58, 58, PLASTIC.l);
  c.ellipse(75, 74, 56, 56, PLASTIC.m);
  // the mould seam, straight across, and where the gold has rubbed off
  c.hline(4, 146, 75, PLASTIC.seam);
  for (const [x, y, r] of [[30, 112, 6], [118, 40, 4], [100, 120, 3]]) c.ellipse(x, y, r, r - 1, PLASTIC.bare);
  return c;
}

/** Side one: a cartoon crowned shark, off-centre, and TREASURE IS ABOUT THE JOURNEY! */
function coinFront() {
  const c = coinBase();
  // the shark, grinning, stamped a few pixels too far right
  const X = 82;
  c.poly([[X - 26, 70], [X - 6, 54], [X + 20, 58], [X + 28, 72], [X + 18, 86], [X - 20, 84]], PLASTIC.d);
  c.poly([[X - 24, 70], [X - 6, 56], [X + 18, 60], [X + 26, 72], [X + 16, 84], [X - 18, 82]], PLASTIC.l);
  c.poly([[X - 24, 70], [X + 4, 74], [X - 16, 82]], PLASTIC.d);
  for (let k = 0; k < 5; k++) c.set(X - 20 + k * 4, 73, '#ffffff');
  c.ellipse(X - 6, 64, 2, 2, PLASTIC.d);
  for (const px of [-12, -4, 4]) c.vline(X + px, 42, 52, PLASTIC.d); // crown
  c.hline(X - 12, X + 4, 52, PLASTIC.d);
  drawText(c, 'TREASURE IS ABOUT', 77, 96, PLASTIC.d, { center: true });
  drawText(c, 'THE JOURNEY!', 77, 106, PLASTIC.d, { center: true });
  c.outline(INK);
  return c;
}

/** Side two: OFFICIAL PARTICIPATION TREASURE. */
function coinBack() {
  const c = coinBase();
  lines(c, ['OFFICIAL', 'PARTICIPATION', 'TREASURE'], 76, 34, PLASTIC.d);
  c.hline(36, 114, 66, PLASTIC.d);
  lines(c, ['CONGRATULATIONS -', 'YOU FOUND IT!'], 76, 70, PLASTIC.d);
  lines(c, ['VALUE:', 'GREAT MEMORIES'], 76, 94, PLASTIC.d);
  drawText(c, 'NO CASH VALUE', 76, 118, PLASTIC.d, { center: true });
  c.outline(INK);
  return c;
}

// --- the labels ---------------------------------------------------------------------

/** The CLEARANCE sticker the sash came with: the same shop. */
function clearance(c, x, y) {
  c.ellipse(x, y, 16, 16, '#e83a2a');
  c.ellipse(x, y, 13, 13, '#f8e040');
  drawText(c, '70%', x, y - 8, '#c8281a', { center: true });
  drawText(c, 'OFF', x, y + 1, '#c8281a', { center: true });
}

function cryingBeans() {
  const W = 236;
  const H = 150;
  const c = new PixelCanvas(W, H);
  c.fill('#f8e020'); // absurdly yellow
  c.rect(0, 0, W, 6, '#c8a010');
  c.rect(0, H - 6, W, 6, '#c8a010');
  // printed a little off: a pink ghost of the title, out of register
  drawText(c, 'CRYING BEANS', W / 2 + 2, 12, '#f080a0', { center: true, scale: 2 });
  drawText(c, 'CRYING BEANS', W / 2, 10, '#a8241c', { center: true, scale: 2 });
  // the crying bean: a fat brown bean with a sad face and a fountain of tears
  c.ellipse(46, 66, 26, 20, '#8a3a22');
  c.ellipse(40, 60, 14, 8, '#b05a3a');
  for (const ex of [36, 54]) { c.ellipse(ex, 62, 4, 4, '#ffffff'); c.set(ex, 63, INK); }
  c.line(38, 76, 52, 74, INK);
  c.set(37, 77, INK);
  c.set(53, 75, INK);
  for (const [tx, d] of [[32, -1], [58, 1]]) for (let k = 0; k < 6; k++) c.ellipse(tx + d * k * 3, 66 + k * 4, 2, 2, '#5ab0e8');
  drawText(c, 'SO SAD THEY', 160, 40, '#2a2a32', { center: true });
  drawText(c, 'SEASON THEMSELVES!', 160, 50, '#2a2a32', { center: true });
  lines(c, ['INGREDIENTS: BEANS, ONIONS, GARLIC,', 'EXTRA GARLIC, FERMENTED CABBAGE,', 'NATURAL TEAR ESSENCE, ARTIFICIAL', 'SMOKE FLAVOR, ARTIFICIAL OLD-SOCK', 'FLAVOR.'], W / 2 + 4, 94, '#5a4a10', { gap: 9 });
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

function sauceLabel() {
  const W = 236;
  const H = 150;
  const c = new PixelCanvas(W, H);
  c.fill('#b8241c');
  c.rect(0, 30, W, 8, '#f0d020');
  for (let x = 0; x < W; x += 8) c.poly([[x, 30], [x + 4, 30], [x, 38]], '#1e1a22'); // hazard stripes
  drawText(c, 'SPICY STENCH SAUCE', W / 2 - 14, 8, '#f8e8c0', { center: true, scale: 1, shadow: '#5a0e0a' });
  drawText(c, 'EXTRA STRENGTH', W / 2 - 14, 18, '#f0d020', { center: true });
  c.rect(8, 44, W - 16, 98, '#f4ecd8');
  drawText(c, 'WARNING', W / 2, 48, '#b8241c', { center: true });
  lines(c, ['CONTENTS MAY PRESSURIZE AFTER OPENING.', 'DO NOT EXPOSE TO FLAME.', 'DO NOT INHALE DIRECTLY.', 'ENCLOSED-VESSEL USE DISCOURAGED.', 'MANUFACTURER NOT RESPONSIBLE FOR', 'LINGERING FABRIC ODOR.'], W / 2, 62, '#2a2a32', { gap: 12 });
  clearance(c, W - 22, 20);
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

/** A can of baked beans with the label crossed out and Garrick's own written over it. */
function bakedBeans() {
  const W = 200;
  const H = 130;
  const c = new PixelCanvas(W, H);
  c.fill('#3a6a9a');
  c.rect(0, 0, W, 6, '#c8ccd4');
  c.rect(0, H - 6, W, 6, '#8a8e96');
  drawText(c, 'BAKED BEANS', W / 2, 14, '#f4ecd8', { center: true, scale: 2 });
  c.line(20, 22, 180, 18, '#e8c830'); // crossed out in crayon
  c.line(20, 26, 180, 22, '#e8c830');
  c.rect(16, 42, W - 32, 74, CRAY.paper);
  drawText(c, 'GARRICK-APPROVED', W / 2, 46, CRAY.burg, { center: true, jitter: 1, seed: 4 });
  drawText(c, 'BAKED BEANS', W / 2, 56, CRAY.burg, { center: true, jitter: 1, seed: 5 });
  lines(c, ['* EXTRA MOLASSES', '* EXTRA ONION', '* QUESTIONABLE GARLIC'], W / 2, 74, CRAY.brown, { gap: 11 });
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

// --- the storm's prizes ----------------------------------------------------------------

/** A token: plastic coin, a ribbon across it, the message printed slightly crooked. */
export function token(text, { picture = null } = {}) {
  const parts = text.split('|');
  const tw = Math.max(...parts.map((t) => textWidth(t)));
  const W = Math.max(150, tw + 40);
  const H = 70 + parts.length * 10 + (picture ? 34 : 0);
  const c = new PixelCanvas(W, H);
  const cx = W / 2;
  c.ellipse(cx, 30, 26, 26, PLASTIC.d);
  c.ellipse(cx, 29, 23, 23, PLASTIC.m);
  c.ellipse(cx, 29, 17, 17, PLASTIC.l);
  c.hline(cx - 26, cx + 26, 30, PLASTIC.seam);
  c.poly([[cx - 12, 30], [cx + 10, 27], [cx + 6, 36], [cx - 10, 36]], PLASTIC.d); // the crowned shark, again
  for (const dx of [-8, -2, 4]) c.vline(cx + dx, 18, 24, PLASTIC.d);
  c.hline(cx - 8, cx + 4, 24, PLASTIC.d);
  const by = 58;
  const bh = parts.length * 10 + 6;
  c.rect(6, by, W - 12, bh, PINK.m);
  c.hline(6, W - 7, by, PINK.l);
  c.hline(6, W - 7, by + bh - 1, PINK.d);
  c.poly([[6, by], [0, by + bh / 2], [6, by + bh]], PINK.d);
  c.poly([[W - 7, by], [W - 1, by + bh / 2], [W - 7, by + bh]], PINK.d);
  parts.forEach((t, i) => drawText(c, t, cx + (i % 2 ? 1 : 0), by + 4 + i * 10, '#ffffff', { center: true, shadow: PINK.d }));
  if (picture) picture(c, cx, by + bh + 4);
  c.outline(INK);
  return c;
}

/** The token's little picture: a hammock with a large suit in it, and under it, a captain. */
function hammockPicture(c, cx, y) {
  for (let x = cx - 30; x <= cx + 30; x++) c.set(x, y + 6 + Math.round(Math.sin(((x - cx + 30) / 60) * Math.PI) * 6), '#6a4a28');
  c.ellipse(cx, y + 10, 18, 5, '#521828');
  c.ellipse(cx - 12, y + 7, 4, 3, PLASTIC.m); // a crown
  c.ellipse(cx, y + 26, 10, 3, '#7a1826'); // the captain, flat
  c.poly([[cx - 12, y + 24], [cx - 4, y + 20], [cx + 2, y + 24]], '#1a1a24');
}

/** The Grand Award Ribbon: a huge rosette, three tails, a long citation on a card hanging off it. */
function grandRibbon() {
  const W = 230;
  const H = 150;
  const c = new PixelCanvas(W, H);
  const cx = 52;
  for (const [x, col] of [[cx - 10, PLASTIC], [cx, PINK], [cx + 10, TEAL]]) c.poly([[x - 4, 60], [x - 8, 140], [x + 2, 128], [x + 6, 60]], col.m);
  c.ellipse(cx, 42, 40, 38, PLASTIC.m);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    c.ellipse(cx + Math.cos(a) * 38, 42 + Math.sin(a) * 36, 4, 4, i % 2 ? PLASTIC.l : PLASTIC.d);
  }
  c.ellipse(cx, 42, 22, 22, PINK.m);
  drawText(c, 'GRAND', cx, 32, '#ffffff', { center: true });
  drawText(c, 'PRIZE', cx, 44, '#ffffff', { center: true });
  for (const [x, y] of [[20, 14], [86, 20], [30, 76], [78, 70], [52, 8]]) c.set(x, y, '#ffffff'); // glitter
  c.rect(100, 10, 124, 132, '#f4ecd8');
  c.strokeRect(100, 10, 124, 132, PLASTIC.d);
  lines(c, ['GRAND PRIZE FOR', 'FINDING TREASURE', 'FOR SOMEBODY ELSE', '', 'EXCELLENCE IN', 'ACCIDENTAL SHARK', 'ENRICHMENT', '', 'SPECIAL MENTION:', 'MANAGING ONE (1)', 'GRAND STENCHMASTER', '(SORT OF)'], 162, 16, '#2a2a32', { gap: 10 });
  c.outline(INK);
  return c;
}

/** A cheap trophy for the captain, with a plaque that goes on for a while. */
function leadershipTrophy() {
  const W = 220;
  const H = 150;
  const c = new PixelCanvas(W, H);
  c.rect(50, 112, 120, 30, '#1e1a22');
  c.rect(54, 116, 112, 22, PLASTIC.l);
  drawText(c, "WORLD'S OKAYEST", 110, 118, PLASTIC.d, { center: true });
  drawText(c, 'CAPTAIN', 110, 128, PLASTIC.d, { center: true });
  c.rect(102, 86, 16, 26, PLASTIC.m);
  c.poly([[64, 20], [156, 24], [140, 84], [80, 82]], PLASTIC.m); // the cup, crooked in the mould
  c.line(70, 26, 82, 78, PLASTIC.l);
  c.ellipseOutline(56, 44, 10, 14, PLASTIC.d);
  c.ellipseOutline(164, 46, 10, 14, PLASTIC.d);
  lines(c, ['FOR HIRING', 'A FART MAN'], 110, 32, PLASTIC.d);
  lines(c, ['DUTIES:', 'EAT, SLEEP,', 'TV, FARTS'], 110, 52, '#5a4a10', { gap: 9 });
  drawText(c, 'TIP: HIRE SOMEONE USEFUL', 110, 4, '#f8f0e0', { center: true, shadow: INK });
  c.outline(INK);
  return c;
}

/** The Cowardice Award: the biggest rosette yet, a title that does not end, and in the artwork, a sash fluttering improperly. */
function cowardiceAward() {
  const W = 240;
  const H = 156;
  const c = new PixelCanvas(W, H);
  const cx = 56;
  for (let i = 0; i < 5; i++) {
    const x = cx - 20 + i * 10;
    const col = [PINK, TEAL, PLASTIC, PINK, TEAL][i];
    c.poly([[x - 4, 70], [x - 7, 152 - (i % 2) * 10], [x + 3, 140], [x + 6, 70]], col.m);
  }
  c.ellipse(cx, 48, 46, 44, TEAL.m);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    c.ellipse(cx + Math.cos(a) * 44, 48 + Math.sin(a) * 42, 4, 4, i % 2 ? TEAL.l : TEAL.d);
  }
  c.ellipse(cx, 48, 30, 30, '#f4ecd8');
  // the artwork: a portly figure in a crown running away, the sash streaming off him flapping loose, the holders flat
  c.ellipse(cx + 4, 52, 9, 11, '#521828');
  c.ellipse(cx + 4, 38, 5, 5, '#dc9c76');
  for (const px of [-2, 4, 10]) c.vline(cx + px, 30, 33, PLASTIC.m);
  for (let k = 0; k < 24; k++) {
    const y = 46 + Math.round(Math.sin(k * 0.8) * 5);
    c.set(cx - 2 - k, y, k % 2 ? '#c8982a' : '#e8c048'); // the sash, FLUTTERING
    c.set(cx - 2 - k, y + 1, '#9a6e14');
  }
  c.line(cx + 8, 60, cx + 14, 70, '#521828');
  c.line(cx, 60, cx - 4, 70, '#521828');
  c.hline(cx - 26, cx - 16, 70, '#7a7a86');
  c.hline(cx + 18, cx + 26, 70, '#7a7a86'); // the holders, flat on the deck
  c.rect(110, 6, 124, 144, '#f4ecd8');
  c.strokeRect(110, 6, 124, 144, TEAL.d);
  lines(c, ['THE GRAND', 'STENCHMASTER GRAND', 'CERTIFICATE OF', 'GRAND COWARDICE,', 'GRAND HONOURABLE', 'MENTION, GRAND', 'COMMITTEE FOR', 'GRANDLY NOT', 'DOING IT', '(TOO GRAND)'], 172, 10, '#2a2a32', { gap: 9 });
  lines(c, ['ALSO: LEADERSHIP.', 'ALSO: "FART MAN".', 'ALSO: THE OCEAN.'], 172, 108, TEAL.d, { gap: 10 });
  c.outline(INK);
  return c;
}

// --- the book ----------------------------------------------------------------------------

function ledgerPage(W, H, seed = 3) {
  const c = new PixelCanvas(W, H);
  c.fill(LEDGER.page);
  for (let y = 12; y < H; y += 9) c.hline(4, W - 5, y, LEDGER.rule);
  c.vline(18, 0, H - 1, LEDGER.margin);
  // stains: grease, something yellow, a ring where a mug stood
  c.ellipse(W - 40, H - 30, 18, 12, LEDGER.stain);
  c.ellipseOutline(40 + seed * 7, 30, 10, 8, '#b89a60');
  for (let i = 0; i < 40; i++) c.set((i * 53 + seed * 17) % W, (i * 29 + seed * 11) % H, LEDGER.grease);
  return c;
}

function bookCover() {
  const W = 220;
  const H = 156;
  const c = new PixelCanvas(W, H);
  c.fill('#5a3a1a');
  c.rect(0, 0, 14, H, '#3a2410'); // the spine, string-bound
  for (let y = 10; y < H; y += 24) c.hline(0, 14, y, '#e8e0c8');
  // pages of every kind sticking out the side: ledger, notebook, a scrap of chart
  for (const [y, col] of [[12, '#e6dab8'], [40, '#f4f0e8'], [76, '#d8c890'], [110, '#e6dab8']]) c.rect(W - 6, y, 6, 18, col);
  c.ellipse(150, 110, 30, 20, '#7a5a2a'); // a grease stain
  c.rect(26, 14, 180, 112, '#efe4c4');
  lines(c, ['THE GRAND EXPEDITION', 'FOR THE LOST FART'], 116, 22, CRAY.burg, { gap: 11 });
  c.hline(40, 192, 46, CRAY.brown);
  lines(c, ['COMPLETE GRAND', 'STENCHMASTER LEGENDS'], 116, 52, CRAY.brown, { gap: 10 });
  lines(c, ['VOLUME ONE', 'OF PROBABLY MANY'], 116, 78, CRAY.blue, { gap: 10 });
  drawText(c, 'BY G. GRUMBLEGUT, G.S.', 116, 108, CRAY.green, { center: true });
  // little yellow lines coming off it
  for (const [x, y] of [[30, 134], [80, 140], [180, 136]]) { c.line(x, y, x + 4, y + 10, '#d8d060'); c.line(x + 6, y, x + 10, y + 10, '#d8d060'); }
  c.outline(INK);
  return c;
}

/** The Rumpold chapter, the phrases that matter underlined (by the captain, in pencil, very small). */
function bookRumpold() {
  const W = 230;
  const H = 156;
  const c = ledgerPage(W, H, 5);
  drawText(c, 'RUMPOLD WINDBREAKER THE RESOLUTE', W / 2 + 6, 4, CRAY.burg, { center: true });
  const phrases = ['HE FACED THE TORNADO REAR-FIRST', 'AND WAITED FOR THE EYE OF IT,', 'THE VERY CENTER, AND THERE HE MET', 'WIND WITH OPPOSING WIND, AND THE', 'ROTATION WAS DISRUPTED, AND THE', 'FUNNEL COLLAPSED. HOORAY.', '', 'AFTERWARDS: THE RAIN, THE RIVERS,', 'THE BAY, THE SEA. 53 TIMES WORSE.', '(ROUGHLY.) (I WAS NOT THERE.)'];
  lines(c, phrases, W / 2 + 8, 18, CRAY.brown, { gap: 12 });
  for (const [y, x0, x1] of [[27, 40, 196], [39, 110, 200], [51, 128, 210], [63, 40, 200], [75, 40, 150]]) c.hline(x0, x1, y, '#5a5a6a');
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

/** The captain's notes on it: ORIENTATION, and a drawing of Garrick. `fat`: after Squawks corrected the belly. */
function researchNotes(fat) {
  const W = 220;
  const H = 150;
  const c = new PixelCanvas(W, H);
  c.fill('#f4f0e0');
  for (let y = 14; y < H; y += 10) c.hline(0, W - 1, y, '#d8d4c4');
  drawText(c, 'ORIENTATION:', 70, 6, '#2a2a3a', { center: true });
  lines(c, ['GARRICK REAR', 'TOWARD VORTEX'], 70, 20, '#2a2a3a');
  // the drawing: a stick Garrick, rear to a spiral, an arrow
  for (let a = 0; a < 16; a += 0.2) c.set(Math.round(176 + Math.cos(a) * a * 2), Math.round(70 + Math.sin(a) * a * 1.8), '#5a5a6a');
  const gx = 90;
  if (fat) {
    c.ellipse(gx, 92, 26, 22, '#5a5a6a');
    c.ellipse(gx, 92, 24, 20, '#f4f0e0');
    c.line(gx + 26, 96, gx + 40, 84, '#d8322a'); // Squawks' correction, in red
    drawText(c, 'BIGGER', gx + 46, 76, '#d8322a', { center: true });
  } else {
    c.ellipse(gx, 92, 9, 14, '#5a5a6a');
    c.ellipse(gx, 92, 7, 12, '#f4f0e0');
  }
  c.ellipseOutline(gx, 64, 7, 7, '#5a5a6a');
  for (const px of [-5, 0, 5]) c.vline(gx + px, 52, 57, '#5a5a6a');
  c.line(gx, 112, gx - 8, 130, '#5a5a6a');
  c.line(gx, 112, gx + 8, 130, '#5a5a6a');
  c.line(gx + 14, 98, gx + 50, 80, '#5a5a6a');
  c.line(gx + 46, 78, gx + 50, 80, '#5a5a6a');
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

/** The plan. And at the bottom, the clause. `considering`: what he wrote under it. */
function planNotes(considering) {
  const W = 236;
  const H = 156;
  const c = new PixelCanvas(W, H);
  c.fill('#f4f0e0');
  for (let y = 14; y < H; y += 9) c.hline(0, W - 1, y, '#d8d4c4');
  drawText(c, 'COUNTER-SHARKSTORM', W / 2, 3, '#7a1826', { center: true });
  const steps = ['1 POSITION SHIP NEAR VORTEX', '2 AIM GARRICK AT CENTER', '3 SECURE WITH ROPES', '4 NED WATCHES ALIGNMENT', '5 GRISTLE HOLDS COURSE', '6 PETE MONITORS SHARKS', '7 BOB SURVIVES SOMEHOW', '8 CREW BRACES', '9 COLLAPSE STORM', '10 RECOVER TREASURE, CROWN', '11 RECOVER DIGNITY'];
  steps.forEach((t, i) => drawText(c, t, 8, 14 + i * 9, '#2a2a3a'));
  drawText(c, '(HARDEST)', 150, 104, '#d8322a', { center: false });
  c.rect(4, 116, W - 8, 22, '#f8e0d0');
  lines(c, ['POSSIBLE CONSEQUENCE: LOCAL SEA MAY', 'REEK 50-53 TIMES WORSE (HE SAYS)'], W / 2, 118, '#a8241c', { gap: 9 });
  if (considering) drawText(c, 'STILL CONSIDERING IT.', W / 2, 142, '#2a2a3a', { center: true });
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

// --- the feast; the salvage ----------------------------------------------------------------

/** The Grand Feast, plated (formally). */
function feastPlate() {
  const W = 236;
  const H = 150;
  const c = new PixelCanvas(W, H);
  c.fill('#3a2418');
  c.ellipse(110, 80, 100, 56, '#e8e4dc');
  c.ellipse(110, 80, 86, 46, '#f8f6f0');
  // a sauce spiral
  for (let a = 0; a < 18; a += 0.12) c.set(Math.round(110 + Math.cos(a) * a * 3.4), Math.round(82 + Math.sin(a) * a * 1.8), '#b8241c');
  // molded Crying Beans (a dome), the baked-bean curve, the Burnt Bean pyramid
  c.ellipse(70, 74, 18, 12, '#8a3a22');
  c.ellipse(66, 70, 8, 4, '#b05a3a');
  for (let k = 0; k < 14; k++) c.ellipse(118 + Math.cos(k * 0.24) * 30, 58 + Math.sin(k * 0.24) * 12, 3, 2, '#a0602a');
  for (let row = 0; row < 4; row++) for (let k = 0; k <= row; k++) c.ellipse(150 + (k - row / 2) * 7, 78 + row * 6, 3, 2.5, '#2a1e16');
  // onion garnish, and the one parsley leaf
  c.ellipseOutline(96, 104, 6, 3, '#e8d8f0');
  c.poly([[118, 100], [124, 94], [128, 100], [122, 104]], '#3a9a3a');
  // the goblet of Bean Smoothie
  c.rect(200, 40, 18, 22, '#c8ccd4');
  c.rect(202, 42, 14, 16, '#8a6a3a');
  c.rect(207, 62, 4, 16, '#c8ccd4');
  c.rect(201, 78, 16, 3, '#c8ccd4');
  drawText(c, 'THE GRAND FEAST', W / 2, 4, '#f4dc78', { center: true });
  c.outline(INK);
  return c;
}

/** Hale's tally of what came out of the crater. */
function salvageTally() {
  const W = 220;
  const H = 150;
  const c = ledgerPage(W, H, 2);
  drawText(c, 'SALVAGE: THE CRATER', W / 2 + 6, 3, CRAY.burg, { center: true });
  const rows = ['GOLD COINS ............ 27', 'SILVER COINS .......... A FEW', 'SMALL EMERALDS ........ 4', 'RUBY .................. 1', 'NECKLACE .............. HALF', 'GOBLET ................ CRACKED', 'CEREMONIAL SPOON ...... BENT', 'PEARLS ................ 6', 'BRASS BUTTON .......... SUSPICIOUS', '', 'SMELL: ALL OF IT. (HIM)'];
  rows.forEach((t, i) => drawText(c, t, 24, 16 + i * 11, '#4a3420'));
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

const TOKENS = {
  token_sweet_dreams: 'SWEET DREAMS!|WE KEPT THE GOOD PILLOWS!',
  token_rest_easy: 'REST EASY!|YOUR GOLD IS COMFORTABLE!',
  token_enjoy_floor: 'ENJOY THE FLOOR!|SHARK SUITES ARE SOLD OUT!',
  token_advice: 'FREE ADVICE:|FEWER GRAND TITLES,|MORE JOB DESCRIPTIONS',
  token_good_luck: 'GOOD LUCK WITH|YOUR FART PLAN!',
  token_bad_decisions: 'WE LOVE|BAD DECISIONS.',
  token_bravery: 'BRAVERY OR|TERRIBLE JUDGMENT?',
  token_good_night: 'GOOD NIGHT, FART MAN!|THANKS FOR THE RIDE!',
};

export function addPhase10Inserts(atlas) {
  atlas.add('participation_coin_front', coinFront());
  atlas.add('participation_coin_back', coinBack());
  atlas.add('crying_beans_label', cryingBeans());
  atlas.add('spicy_sauce_label', sauceLabel());
  atlas.add('baked_beans_label', bakedBeans());
  for (const [id, text] of Object.entries(TOKENS)) atlas.add(id, token(text));
  atlas.add('token_captain_under', token('CAPTAIN|UNDER FART SUIT', { picture: hammockPicture }));
  atlas.add('grand_award_ribbon', grandRibbon());
  atlas.add('leadership_trophy', leadershipTrophy());
  atlas.add('cowardice_award', cowardiceAward());
  atlas.add('book_cover', bookCover());
  atlas.add('book_rumpold', bookRumpold());
  atlas.add('research_notes', researchNotes(false));
  atlas.add('research_notes_fat', researchNotes(true));
  atlas.add('plan_notes', planNotes(false));
  atlas.add('plan_notes_considering', planNotes(true));
  atlas.add('feast_plate', feastPlate());
  atlas.add('salvage_tally', salvageTally());
}

export const PHASE10_INSERT_NAMES = [
  'participation_coin_front', 'participation_coin_back', 'crying_beans_label', 'spicy_sauce_label', 'baked_beans_label',
  ...Object.keys(TOKENS), 'token_captain_under', 'grand_award_ribbon', 'leadership_trophy', 'cowardice_award',
  'book_cover', 'book_rumpold', 'research_notes', 'research_notes_fat', 'plan_notes', 'plan_notes_considering',
  'feast_plate', 'salvage_tally',
];
