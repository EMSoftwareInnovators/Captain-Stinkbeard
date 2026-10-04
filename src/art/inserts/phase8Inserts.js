import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { drawText } from '../font/drawText.js';

/**
 * Story Phase 8 close-ups: the Grand Stenchmaster's Grand Crown (in all its
 * glory, and with Salty Jim's cutlery in it), the sign on the old sleeping
 * quarters (in Garrick's wording, with the captain's correction), and the
 * tag on the back of the Grand Stenchmaster Sash.
 */
const INK = PAL.ink;
const GOLD = { d: '#7a5a14', m: '#c8a030', l: '#f0cc48', h: '#fff0a0' };
const BURG = { d: '#2e0c18', m: '#521828', l: '#74283a', h: '#9a3a4a' };
const BILE = { d: '#3a5a14', m: '#6a9a24', l: '#a8cc48' };
const SILVER = { d: '#6a6e78', m: '#a8acb8', l: '#d8dce4', h: '#f4f6fa' };

/** The crest on the front: a stink-cloud rising over an onion, two spoons crossed under it. No letters. */
function crest(c, cx, cy) {
  c.ellipse(cx, cy + 1, 15, 15, GOLD.d);
  c.ellipse(cx, cy, 14, 14, GOLD.m);
  c.ellipse(cx - 3, cy - 4, 8, 6, GOLD.l);
  // the spoons, crossed
  for (const s of [-1, 1]) {
    c.thickLine(cx - 10 * s, cy + 10, cx + 7 * s, cy - 4, 2, SILVER.m);
    c.ellipse(cx + 8 * s, cy - 6, 3, 4, SILVER.l);
  }
  // the onion
  c.ellipse(cx, cy + 4, 6, 6, '#8a4ac8');
  c.ellipse(cx - 2, cy + 2, 2, 3, '#b878e0');
  c.vline(cx, cy - 4, cy - 2, BILE.m);
  // the cloud over it
  for (const [dx, dy, r] of [[-5, -9, 4], [0, -11, 5], [5, -9, 4]]) c.ellipse(cx + dx, cy + dy, r, r - 1, BILE.l);
  c.ellipseOutline(cx, cy, 14, 14, INK);
}

/** The Grand Stenchmaster's Grand Crown, up close. */
function grandCrown() {
  const W = 232;
  const H = 156;
  const c = new PixelCanvas(W, H);
  c.fill('#1a1220');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - 116) / 130, (y - 90) / 90);
    if (d < 1) c.blend(x, y, '#5a4a30', (1 - d) * 0.5);
  }
  // the cap inside it: mismatched curtain panels, burgundy and a green that should not be on hats
  for (let x = 46; x < 186; x++) {
    const top = 50 + Math.round(((x - 116) / 70) ** 2 * 20);
    for (let y = top; y < 112; y++) c.set(x, y, Math.floor((x - 46) / 20) % 2 ? BURG.m : x > 150 ? BILE.d : BURG.l);
  }
  // the points: fake gold, crooked, one bent right over; brass spoons between them
  const points = [[56, 70, 0], [86, 46, -3], [116, 34, 0], [146, 46, 4], [176, 66, 9]];
  for (const [px, top, lean] of points) {
    for (let y = top; y < 108; y++) {
      const t = (y - top) / (108 - top);
      const half = 2 + Math.round(t * 9);
      const x0 = px + Math.round(lean * (1 - t));
      for (let x = x0 - half; x <= x0 + half; x++) c.set(x, y, x < x0 - half + 3 ? GOLD.l : x > x0 + half - 3 ? GOLD.d : GOLD.m);
    }
    c.ellipse(px + lean, top + 2, 4, 4, BILE.l); // a fake jewel on each tip
    c.set(px + lean - 1, top + 1, '#ffffff');
  }
  for (const sx of [71, 101, 131, 161]) {
    c.rect(sx - 1, 66, 3, 40, SILVER.d);
    c.ellipse(sx, 62, 5, 8, SILVER.m);
    c.ellipse(sx - 1, 60, 2, 4, SILVER.h);
  }
  // forks jammed in at each side
  for (const [fx, dir] of [[40, -1], [192, 1]]) {
    c.thickLine(fx, 110, fx + dir * 10, 70, 3, SILVER.m);
    for (const t of [-4, 0, 4]) c.thickLine(fx + dir * 10 + t, 70, fx + dir * 12 + t, 52, 1, SILVER.l);
  }
  // the band: bottle caps, fake jewels, little painted onions
  c.rect(40, 104, 152, 24, GOLD.m);
  c.hline(40, 191, 104, GOLD.h);
  c.hline(40, 191, 127, GOLD.d);
  for (let i = 0; i < 9; i++) {
    const bx = 50 + i * 17;
    if (i === 4) continue;
    if (i % 3 === 0) {
      c.ellipse(bx, 116, 5, 5, SILVER.l);
      for (let k = 0; k < 8; k++) c.set(bx + Math.round(Math.cos(k * 0.8) * 5), 116 + Math.round(Math.sin(k * 0.8) * 5), SILVER.d);
      c.ellipse(bx, 116, 2, 2, i % 2 ? '#c83a2a' : '#3a6ad0');
    } else if (i % 3 === 1) {
      c.ellipse(bx, 116, 4, 5, ['#c83a2a', '#3a6ad0', BILE.l][i % 3]);
      c.set(bx - 1, 114, '#ffffff');
    } else {
      c.ellipse(bx, 117, 4, 4, '#8a4ac8');
      c.vline(bx, 110, 113, BILE.m);
    }
  }
  crest(c, 116, 114);
  // a tiny saucepan on top, with a lid, and a tassel hanging off the bent point
  c.rect(104, 22, 24, 12, SILVER.m);
  c.hline(104, 127, 22, SILVER.h);
  c.hline(104, 127, 33, SILVER.d);
  c.rect(128, 25, 16, 3, '#5a3a20');
  c.ellipse(116, 20, 11, 3, SILVER.l);
  c.rect(114, 14, 4, 4, SILVER.d);
  for (let y = 70; y < 96; y++) c.set(186 + Math.round(Math.sin(y * 0.3)), y, GOLD.l);
  c.ellipse(186, 98, 4, 3, GOLD.m);
  for (let x = 183; x < 190; x += 2) c.vline(x, 100, 106, GOLD.l);
  c.strokeRect(0, 0, W, H, INK);
  drawText(c, 'THE GRAND STENCHMASTER\'S GRAND CROWN', W / 2, 140, '#e8dcb0', { center: true });
  return c;
}

/** The sign on the old sleeping quarters, in Garrick's crayon; the captain has been at it with a pen. */
function condemnedSign() {
  const W = 216;
  const H = 140;
  const c = new PixelCanvas(W, H);
  c.rect(2, 2, W - 4, H - 4, '#f0e6c8');
  for (let i = 0; i < 160; i++) c.set(4 + ((i * 37) % (W - 8)), 4 + ((i * 53) % (H - 8)), '#e0d4b0');
  drawText(c, 'CONDEMNED', W / 2, 10, '#c83a2a', { center: true, scale: 2, jitter: 1 });
  const body = [['GRAND STENCHMASTER', '#3a9a3a'], ['ATMOSPHERIC EVENT', '#3a9a3a'], ['(ONGOING)', '#8a5426'], ['ENTER AT OWN RISK', '#3a9a3a']];
  body.forEach(([t, col], i) => drawText(c, t, W / 2, 40 + i * 13, col, { center: true, jitter: 1, seed: 4 + i }));
  // the captain: ENTER AT OWN RISK struck through, DO NOT ENTER written over it, and "EVENT" ringed with a ?
  for (let k = 0; k < 2; k++) c.line(40, 83 + k, 176, 82 + k, '#1a1a28');
  drawText(c, 'DO NOT ENTER.', W / 2, 98, '#1a1a28', { center: true, scale: 2 });
  c.ellipseOutline(150, 57, 26, 7, '#1a1a28');
  drawText(c, '?', 182, 50, '#1a1a28', { scale: 2 });
  for (const [nx, ny] of [[6, 6], [W - 9, 6], [6, H - 9], [W - 9, H - 9]]) c.rect(nx, ny, 3, 3, '#6a6a78');
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

/** The back of the sash, where the tag still is. */
function sashTag() {
  const W = 224;
  const H = 140;
  const c = new PixelCanvas(W, H);
  c.fill('#1a1018');
  // the sash, diagonally across: mustard, burgundy edges, a fringe; the back is shinier than it should be
  for (let y = 0; y < H; y++) {
    const x0 = Math.round(-30 + y * 0.9);
    for (let x = x0; x < x0 + 120; x++) {
      if (x < 0 || x >= W) continue;
      const e = x - x0;
      c.set(x, y, e < 6 || e > 113 ? '#5e1624' : (x + y) % 9 === 0 ? '#e8d878' : '#c8982a');
    }
  }
  // the tag, safety-pinned on
  c.rect(76, 30, 120, 86, '#f8f4ea');
  c.strokeRect(76, 30, 120, 86, '#8a8a94');
  c.ellipse(90, 40, 3, 3, '#c8ccd4');
  drawText(c, 'CEREMONIAL SASH', 136, 38, '#3a3a46', { center: true });
  drawText(c, 'WAS 10', 120, 52, '#3a3a46', { center: true });
  c.line(102, 56, 138, 54, '#c83a2a');
  drawText(c, 'NOW 3', 160, 52, '#c83a2a', { center: true });
  drawText(c, '70% OFF', 136, 66, '#c83a2a', { center: true, scale: 2 });
  drawText(c, 'FINAL SALE', 136, 86, '#3a3a46', { center: true });
  drawText(c, 'NO REFUNDS.', 136, 96, '#3a3a46', { center: true });
  drawText(c, 'CASH ONLY.', 136, 105, '#3a3a46', { center: true });
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

export function addPhase8Inserts(atlas) {
  atlas.add('grand_crown_close', grandCrown());
  atlas.add('condemned_sign_close', condemnedSign());
  atlas.add('sash_tag_close', sashTag());
}

export const PHASE8_INSERT_NAMES = ['grand_crown_close', 'condemned_sign_close', 'sash_tag_close'];
