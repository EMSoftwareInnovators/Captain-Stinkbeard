import { PixelCanvas } from '../PixelCanvas.js';
import { PAL, mix } from '../palette.js';
import { drawText } from '../font/drawText.js';
import { SES_BEZEL, SES_SCREEN, rng } from './sesArt.js';
import { CRT, crt, screen, franklin, accountant, desk, sesWrecked, stormDistant } from './vistaPhase6.js';

/**
 * Vista art for Story Phase 7 (the Great Sharkstorm returns; the Song of the
 * Grand Stenchmaster):
 *
 *   - The Stenchmaster Entertainment System Mark II, built below decks in a
 *     storm out of a turnip crate and whatever Garrick could prise off the
 *     ship: a salvaged picture tube in a rope-and-putty surround, two
 *     mismatched tubes in tin cups (one orange, one a suspicious blue), a
 *     horseshoe on top ("reception"), a bent fork and a spoon ("fine
 *     tuning"), a compass glued on as a dial, a patched speaker, the spare
 *     bell, and a knob tied on with string that isn't connected to anything
 *     ("looks professional"). Shown at each stage of building, off, and lit.
 *     Its back and its 'power source' are pure nonsense on purpose: crayon
 *     labels, string, a horseshoe, a lantern's glow. Nothing in them is a
 *     real circuit or a real procedure.
 *   - The original S.E.S. after the second shark: stripped for parts.
 *   - New Frog Tax Man pictures (season seventeen): 27,000 flies (business
 *     snacks or personal snacks?), Form RIB-40 and Schedule POND, the koi
 *     pond held as investment property, the dragonfly expense, a letter.
 *   - The Great Sharkstorm coming back over the horizon, through the
 *     telescope, bigger every time.
 *   - Garrick after the old aerial: hair, whiskers and plume straight up.
 *   - The shelter: the hold at night, lit only by the set, and the crew
 *     from behind, sitting on crates and barrels, leaning in.
 */
const INK = PAL.ink;
const BW = SES_BEZEL.w;
const BH = SES_BEZEL.h;
const { x: SX, y: SY, w: SW, h: SH } = SES_SCREEN;

const CRATE = { gap: '#24180e', d: '#9a7442', m: '#d0ae72', l: '#e6c88e', h: '#f4dcaa', grain: '#b8925a', post: '#a8804a', postD: '#7a5a30' };
const IRONC = { d: '#3a3a46', m: '#6a6a78', l: '#a8a8b8', h: '#d8d8e4' };
const BRASSC = { d: '#7a5a14', m: '#c8a030', l: '#f0cc48' };
const COPPER = '#c87a3a';
const COPPER_L = '#e8a060';
const ROPE = { d: '#8a6a3a', m: '#cca660', l: '#e8cc90' };
const TUBE_GLASS = '#c8e8e8a0';

// ---------------------------------------------------------------------------
// S.E.S. Mark II

function crateBody(c) {
  // slats, with dark gaps between them
  for (let y = 14; y < 140; y++) {
    const k = (y - 14) % 21;
    for (let x = 10; x < 198; x++) {
      let col = CRATE.m;
      if (k >= 18) col = CRATE.gap;
      else if (k === 0) col = CRATE.h;
      else if (k === 1) col = CRATE.l;
      else if (k === 17) col = CRATE.d;
      else if ((x * 7 + y * 13) % 29 === 0 || (x + Math.floor(y / 3) * 5) % 37 === 0) col = CRATE.grain;
      c.set(x, y, col);
    }
  }
  // corner posts, nailed
  for (const px of [10, 188]) {
    c.rect(px, 12, 10, 130, CRATE.post);
    c.vline(px, 12, 141, CRATE.l);
    c.vline(px + 9, 12, 141, CRATE.postD);
    for (let y = 18; y < 140; y += 21) {
      c.set(px + 3, y, IRONC.d);
      c.set(px + 6, y + 1, IRONC.d);
    }
  }
  // the stencil on the front slats, mostly worn off: FINEST TURNIPS, and a turnip
  drawText(c, 'FINEST TURNIPS', 104, 122, '#a8462a', { center: true, jitter: 1, seed: 7 });
  for (let i = 0; i < 40; i++) c.set(60 + ((i * 37) % 90), 120 + ((i * 11) % 12), CRATE.m);
  c.ellipse(32, 128, 6, 5, '#f0e8d8');
  c.ellipse(32, 124, 6, 2, '#b8423a');
  c.line(32, 119, 29, 114, '#4a8a2a');
  c.line(32, 119, 35, 113, '#4a8a2a');
  // hinges for feet
  for (const fx of [16, 180]) {
    c.rect(fx, 140, 12, 5, IRONC.m);
    c.hline(fx, fx + 11, 140, IRONC.l);
    c.set(fx + 3, 142, IRONC.d);
    c.set(fx + 8, 142, IRONC.d);
  }
}

/** The salvaged tube set into a ragged hole, a ring of rope and putty round it. The glass is the screen layer. */
function screenHole(c) {
  for (let y = SY - 6; y < SY + SH + 6; y++) {
    for (let x = SX - 6; x < SX + SW + 6; x++) {
      const inside = x >= SX && x < SX + SW && y >= SY && y < SY + SH;
      if (inside) continue;
      const edge = Math.min(Math.abs(x - SX), Math.abs(x - (SX + SW - 1)), Math.abs(y - SY), Math.abs(y - (SY + SH - 1)));
      if (edge <= 2) c.set(x, y, '#3a3226'); // putty
      else c.set(x, y, (x + y) % 4 < 2 ? ROPE.m : ROPE.d); // rope, wound round
    }
  }
  for (let x = SX - 6; x < SX + SW + 6; x += 4) c.set(x, SY - 6, ROPE.l);
  // the glass hole itself
  for (let y = SY; y < SY + SH; y++) for (let x = SX; x < SX + SW; x++) c.set(x, y, '#00000000');
  // rounded corners of the tube showing
  for (const [cx, cy] of [[SX, SY], [SX + SW - 1, SY], [SX, SY + SH - 1], [SX + SW - 1, SY + SH - 1]]) c.set(cx, cy, '#141a18');
}

function tinCup(c, x, y) {
  c.rect(x - 4, y, 9, 6, IRONC.m);
  c.hline(x - 4, x + 4, y, IRONC.h);
  c.vline(x - 4, y, y + 5, IRONC.l);
}

function tubes(c, lit) {
  // two mismatched tubes in tin cups on the top: one orange, one a suspicious blue
  for (const [tx, glow] of [[40, '#ffb040'], [62, '#5aa8ff']]) {
    c.rect(tx - 3, -1 + 2, 7, 13, TUBE_GLASS);
    c.ellipse(tx, 2, 3, 2, TUBE_GLASS);
    if (lit) {
      c.vline(tx, 4, 11, glow);
      c.vline(tx - 1, 6, 10, mix(glow, '#ffffff', 0.4));
      for (let y = 0; y < 14; y++) for (let x = tx - 6; x <= tx + 6; x++) if (!c.alphaAt(x, y) || (c.get(x, y) >>> 24) < 200) c.blend(x, y, glow, 0.18);
    } else {
      c.vline(tx, 5, 11, '#4a4a58');
    }
    tinCup(c, tx, 9);
  }
}

function antenna(c) {
  // the horseshoe, open end up (so the luck doesn't run out), on a cotton reel: "reception"
  c.rect(100, 11, 8, 4, '#c8b088');
  c.hline(99, 108, 11, '#a89068');
  for (let a = 0; a <= Math.PI; a += 0.08) {
    const x = Math.round(104 + Math.cos(a) * 7);
    const y = Math.round(2 + Math.sin(a) * 7);
    c.rect(x - 1, y - 1, 3, 3, IRONC.m);
    c.set(x, y - 1, IRONC.l);
  }
  for (const lx of [96, 111]) c.rect(lx, 0, 3, 3, IRONC.m);
  for (const [nx, ny] of [[99, 6], [109, 6], [104, 9]]) c.set(nx, ny, IRONC.d); // nail holes
  // a bent fork and a spoon on the right: "fine tuning"
  c.thickLine(150, 13, 156, 2, 1, IRONC.l);
  for (const dx of [0, 2, 4]) c.line(155 + dx, 2, 157 + dx, -2 + 2, IRONC.h);
  c.line(156, 2, 162, 4, IRONC.l); // bent prong
  c.thickLine(168, 13, 172, 4, 1, IRONC.l);
  c.ellipse(173, 3, 3, 2, IRONC.h);
  // copper wire looping everywhere ("signal routing"), and string
  for (let k = 0; k <= 20; k++) {
    const t = k / 20;
    c.set(Math.round(66 + t * 30), Math.round(12 - Math.sin(t * Math.PI) * 6), COPPER);
    c.set(Math.round(112 + t * 38), Math.round(12 - Math.sin(t * Math.PI * 2) * 4), COPPER);
  }
  for (let k = 0; k < 10; k++) c.set(118 + k * 2, 13 - (k % 3), COPPER_L);
}

function extras(c) {
  // a compass, glued on, as a dial (it points at the screen, mostly)
  c.ellipse(32, 42, 10, 10, BRASSC.m);
  c.ellipse(32, 42, 8, 8, '#f0e8d0');
  c.ellipseOutline(32, 42, 10, 10, BRASSC.d);
  c.line(32, 42, 38, 38, '#c83a30');
  c.line(32, 42, 27, 46, '#3a3a48');
  c.set(32, 42, INK);
  // the ship's spare bell, hung on a nail
  c.vline(32, 58, 61, IRONC.d);
  c.poly([[26, 72], [28, 64], [36, 64], [38, 72]], BRASSC.m);
  c.hline(25, 39, 72, BRASSC.d);
  c.vline(29, 65, 71, BRASSC.l);
  c.set(32, 74, BRASSC.d);
  // the patched speaker: a round grille with a sailcloth patch crayoned SPEEKER
  c.ellipse(174, 44, 12, 12, '#3a2a1c');
  for (let y = 34; y < 55; y += 3) c.hline(165, 183, y, '#5a4a38');
  c.ellipseOutline(174, 44, 12, 12, IRONC.d);
  c.rect(168, 46, 13, 9, '#e8dcc0');
  c.strokeRect(168, 46, 13, 9, '#b8a888');
  for (const [px, py] of [[169, 47], [180, 47], [169, 54], [180, 54]]) c.set(px, py, '#6a5a48');
  drawText(c, 'SPKR', 175, 47, '#3a64c0', { center: true });
  // the knob, tied on with string; not connected to anything. Looks professional.
  c.line(176, 62, 178, 76, '#e8e0c8');
  c.line(177, 62, 179, 76, '#b8b0a0');
  c.ellipse(178, 82, 6, 6, '#2a2a34');
  c.ellipse(178, 81, 5, 5, '#4a4a58');
  c.line(178, 81, 178, 77, '#e8e8f0');
  c.ellipseOutline(178, 82, 6, 6, INK);
  // a bent spoon as a latch on the corner post
  c.thickLine(190, 96, 196, 104, 1, IRONC.l);
  c.ellipse(197, 106, 2, 2, IRONC.h);
}

/**
 * Mark II at a stage of building (0 the crate and the tube; 1 + tubes, horseshoe, routing;
 * 2 finished, off; 3 finished and lit).
 */
function mk2(stage, { lit = false } = {}) {
  const c = new PixelCanvas(BW, BH);
  crateBody(c);
  screenHole(c);
  if (stage >= 1) {
    tubes(c, lit);
    antenna(c);
  }
  if (stage >= 2) extras(c);
  if (lit) {
    // a little pilot light: a lantern wick behind a bottle-glass lens, green
    c.ellipse(32, 92, 4, 4, '#2a3a1c');
    c.ellipse(32, 92, 3, 3, '#9ae060');
    c.set(31, 91, '#e8ffd0');
  }
  c.outline(INK);
  return c;
}

/** The back of Mark II: crayon labels, string, copper curls and a horseshoe. Nonsense on purpose. */
function mk2Back() {
  const c = new PixelCanvas(BW, BH);
  crateBody(c);
  c.rect(40, 26, 128, 92, '#1e140c');
  // curls of copper going round and round and nowhere
  const r = rng(77);
  for (let k = 0; k < 7; k++) {
    const cx = 56 + k * 16;
    const cy = 50 + Math.round(r() * 30);
    for (let a = 0; a < Math.PI * 4; a += 0.18) {
      const rr = 2 + a * 1.4;
      c.set(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.7), k % 2 ? COPPER : COPPER_L);
    }
  }
  // string, tied in bows
  c.line(44, 30, 164, 112, '#e8e0c8');
  c.line(44, 112, 164, 30, '#d8d0b8');
  // a horseshoe hung upside down in the middle ("so the luck runs into it")
  c.ellipse(104, 74, 9, 9, IRONC.m);
  c.ellipse(104, 74, 5, 5, '#1e140c');
  c.rect(98, 64, 13, 8, '#1e140c');
  // crayon labels
  drawText(c, 'SIGNAL (PROBABLY)', 104, 30, '#e8d050', { center: true, jitter: 1, seed: 3 });
  drawText(c, 'DO NOT LICK', 70, 100, '#f06050', { center: true, jitter: 1, seed: 5 });
  drawText(c, 'RECEPTION', 140, 86, '#60c060', { center: true, jitter: 1, seed: 9 });
  c.line(124, 90, 112, 80, '#60c060');
  drawText(c, 'GG', 160, 104, '#e8d050', { jitter: 1 });
  c.outline(INK);
  return c;
}

/** Mark II's 'power source': a lantern's glow, a bottle of Frog Grog and the spare bell, tied up in a garter. */
function mk2Power() {
  const c = new PixelCanvas(BW, BH);
  crateBody(c);
  c.rect(40, 26, 128, 92, '#1a120a');
  // the lantern's insides, glowing (it's been told to)
  for (let y = 30; y < 114; y++) for (let x = 44; x < 164; x++) {
    const d = Math.hypot((x - 80) / 30, (y - 76) / 34);
    if (d < 1) c.blend(x, y, '#ffd070', (1 - d) * 0.5);
  }
  c.rect(72, 60, 16, 30, '#c8a040');
  c.rect(75, 63, 10, 24, '#fff0b0');
  c.hline(70, 89, 59, '#4a3a20');
  c.hline(70, 89, 90, '#4a3a20');
  // a bottle of Frog Grog
  c.rect(112, 58, 14, 34, '#3a6a1c');
  c.rect(116, 48, 6, 10, '#3a6a1c');
  c.rect(114, 66, 10, 12, '#e8e0c0');
  drawText(c, 'FG', 119, 68, '#3a6a1c', { center: true });
  c.vline(114, 60, 90, '#7aa02c');
  // the spare bell, on its side
  c.poly([[136, 92], [140, 74], [154, 74], [158, 92]], BRASSC.m);
  c.vline(141, 76, 91, BRASSC.l);
  // the garter round all of it
  c.thickLine(60, 96, 160, 96, 2, '#c83a6a');
  c.set(110, 97, '#f0a0c0');
  drawText(c, 'POWER (PLEASE)', 104, 104, '#e8d050', { center: true, jitter: 1, seed: 4 });
  c.outline(INK);
  return c;
}

/** The original S.E.S., after the second shark and Garrick: stripped to the shell. */
function sesScrapped() {
  const c = sesWrecked();
  // the tubes gone from the top, the compass gone (a pale ring where it was), the knobs gone
  for (let y = 0; y < 14; y++) for (let x = 60; x < 140; x++) if (c.alphaAt(x, y)) c.set(x, y, 'transparent');
  for (const [hx, hy] of [[176, 46], [176, 70]]) {
    c.ellipse(hx, hy, 6, 6, '#1a1010');
    c.ellipseOutline(hx, hy, 7, 7, '#c8b08a');
  }
  // the glass taken out whole (Garrick needed it): a black hole and a few edge shards
  for (let y = SY; y < SY + SH; y++) for (let x = SX; x < SX + SW; x++) c.set(x, y, (x * 3 + y * 7) % 23 === 0 ? '#2a2420' : '#0c0a0a');
  for (const [kx, ky] of [[SX + 2, SY + 3], [SX + SW - 4, SY + 5], [SX + 6, SY + SH - 3]]) c.set(kx, ky, '#c8d8d8');
  drawText(c, 'PARTS', 104, 112, '#e8d050', { center: true, jitter: 1 });
  c.outline(INK);
  return c;
}

// ---------------------------------------------------------------------------
// The Frog Tax Man, season seventeen

const SW_ = SES_SCREEN.w;

function ftmSnacks(f) {
  const c = screen(CRT[1]);
  // an enormous jar: 27,000 FLIES; two signs, BUSINESS? PERSONAL?
  c.rect(60, 16, 40, 50, CRT[3]);
  c.strokeRect(60, 16, 40, 50, CRT[6]);
  c.rect(58, 12, 44, 5, CRT[2]);
  const r = rng(201 + f);
  for (let i = 0; i < 60; i++) c.set(62 + Math.floor(r() * 36), 19 + Math.floor(r() * 45), CRT[0]);
  c.rect(63, 34, 34, 10, CRT[7]);
  drawText(c, '27,000', 80, 35, CRT[1], { center: true });
  c.rect(2, 4, 54, 10, CRT[6]);
  drawText(c, 'BUSINESS?', 29, 5, CRT[0], { center: true });
  c.rect(2, 17, 54, 10, CRT[6]);
  drawText(c, 'PERSONAL?', 29, 18, CRT[0], { center: true });
  franklin(c, 24, 40, { mouth: f ? 'open' : 'shut', sweat: !!f });
  return crt(c, f);
}

function ftmForm(f) {
  const c = screen(CRT[1]);
  c.rect(10, 4, 84, 70, CRT[7]);
  drawText(c, f ? 'SCHEDULE POND' : 'FORM RIB-40', 52, 7, CRT[1], { center: true });
  c.hline(14, 90, 17, CRT[3]);
  for (let y = 22; y < 70; y += 6) {
    c.hline(16, 60, y, CRT[4]);
    c.rect(66, y - 3, 22, 5, CRT[5]);
  }
  drawText(c, f ? 'LINE 9: POND' : 'LINE 3: FLIES', 38, 58, CRT[2], { center: true });
  // the accountant's pencil, tapping
  c.thickLine(84, 70 - f * 3, 98, 54 - f * 3, 2, CRT[3]);
  return crt(c, f);
}

function ftmPond(f) {
  const c = screen(CRT[2]);
  // a koi pond with a sign: INVESTMENT PROPERTY
  c.ellipse(52, 54, 44, 16, CRT[3]);
  c.ellipse(52, 54, 40, 13, CRT[1]);
  for (const [kx, ky] of [[36 + f * 3, 52], [62 - f * 3, 58]]) {
    c.ellipse(kx, ky, 6, 2, CRT[6]);
    c.set(kx + 6, ky, CRT[5]);
  }
  c.vline(73, 24, 42, CRT[5]);
  c.rect(42, 4, 60, 21, CRT[7]);
  drawText(c, 'INVESTMENT', 72, 6, CRT[1], { center: true });
  drawText(c, 'PROPERTY', 72, 15, CRT[1], { center: true });
  franklin(c, 18, 22, { mouth: 'open' });
  return crt(c, f);
}

function ftmDragonfly(f) {
  const c = screen(CRT[1]);
  desk(c, 56, { papers: 2 });
  // a dragonfly, at a tiny desk of its own, with a receipt
  const dx = 74 + f * 2;
  c.thickLine(dx - 12, 30, dx + 12, 30, 2, CRT[5]);
  for (const s of [-1, 1]) {
    c.ellipse(dx + s * 7, 26 - f, 6, 2, CRT[7]);
    c.ellipse(dx + s * 7, 34 + f, 6, 2, CRT[6]);
  }
  c.ellipse(dx + 13, 30, 3, 3, CRT[5]);
  c.rect(56, 40, 46, 13, CRT[7]);
  drawText(c, 'EXPENSE', 79, 42, CRT[1], { center: true });
  franklin(c, 26, 26, { mouth: f ? 'tongue' : 'shut' });
  return crt(c, f);
}

function ftmLetter(f) {
  const c = screen(CRT[0]);
  // close on Franklin's hands and an envelope, a spotlight, the drama
  for (let y = 0; y < SES_SCREEN.h; y++) for (let x = 0; x < SW_; x++) {
    const d = Math.hypot((x - 52) / 46, (y - 44) / 40);
    if (d < 1) c.blend(x, y, CRT[3], (1 - d) * 0.8);
  }
  c.rect(30, 30 - f * 2, 44, 28, CRT[7]);
  c.line(30, 30 - f * 2, 52, 46 - f * 2, CRT[4]);
  c.line(73, 30 - f * 2, 52, 46 - f * 2, CRT[4]);
  c.rect(60, 48 - f * 2, 10, 6, CRT[2]);
  drawText(c, 'TAX', 52, 18 - f * 2, CRT[7], { center: true });
  c.ellipse(26, 52, 6, 4, CRT[5]);
  c.ellipse(78, 52, 6, 4, CRT[5]);
  return crt(c, f + 2);
}

function ftmSeason(f) {
  const c = screen(CRT[1]);
  franklin(c, 52, 22, { mouth: f ? 'open' : 'shut' });
  c.rect(6, 4, 92, 12, CRT[0]);
  drawText(c, 'THE FROG TAX MAN', 52, 5, CRT[7], { center: true, shadow: CRT[3] });
  c.rect(16, 60, 72, 12, CRT[6]);
  drawText(c, 'SEASON 17', 52, 62, CRT[0], { center: true });
  return crt(c, f);
}

/** "We'll be right back": a soap advert for frogs. */
function ftmBreak(f) {
  const c = screen(CRT[2]);
  c.rect(30, 20, 44, 30, CRT[6]);
  drawText(c, 'POND', 52, 26, CRT[1], { center: true });
  drawText(c, 'SOAP', 52, 36, CRT[1], { center: true });
  for (const [bx, by] of [[22, 16], [84, 24], [28, 56], [80, 58], [52, 12]]) c.ellipseOutline(bx + (f ? 2 : 0), by - (f ? 2 : 0), 4, 4, CRT[7]);
  drawText(c, 'BACK SOON', 52, 64, CRT[7], { center: true });
  return crt(c, f);
}

/** Mark II's startup: the flash (switch three), and the single bright line before the snow. */
function tvWhite() {
  const c = new PixelCanvas(SW, SH);
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const d = Math.hypot((x - SW / 2) / SW, (y - SH / 2) / SH);
    c.set(x, y, mix('#ffffff', '#c8f0ff', Math.min(1, d * 1.6)));
  }
  return c;
}

function tvHline() {
  const c = new PixelCanvas(SW, SH);
  c.fill('#020404');
  for (let x = 4; x < SW - 4; x++) {
    c.set(x, SH / 2, '#f4fff8');
    c.set(x, SH / 2 - 1, '#7ac8a0');
    c.set(x, SH / 2 + 1, '#7ac8a0');
  }
  return c;
}

// ---------------------------------------------------------------------------
// The storm, coming back

/** Through the telescope: the column, bigger, darker, fins in the air round it, a yellow tint to the spray. */
function stormReturning(f) {
  const base = stormDistant(f);
  const c = new PixelCanvas(88, 96);
  for (let y = 0; y < 96; y++) for (let x = 0; x < 88; x++) {
    const p = base.get(Math.floor(x / 2), Math.floor(y / 2));
    if (p >>> 24) c.set(x, y, p);
  }
  // fins and tails flung out round it
  const r = rng(301 + f * 7);
  for (let i = 0; i < 9; i++) {
    const x = 8 + Math.floor(r() * 72);
    const y = 6 + Math.floor(r() * 60);
    c.poly([[x, y + 3], [x + 2, y], [x + 4, y + 3]], '#2e3a4c');
    c.set(x + 5, y + 2, '#2e3a4c');
  }
  // yellow-tinged spray at the foot
  for (let i = 0; i < 40; i++) c.set(20 + Math.floor(r() * 48), 82 + Math.floor(r() * 12), i % 3 ? '#d8c870' : '#f4e67a');
  return c;
}

/** Garrick, just after touching the old aerial: hair, whiskers and plume straight up, monocle on its string. */
function garrickZapped(f) {
  const c = new PixelCanvas(72, 80);
  // the hair and the muttonchops, standing on end
  for (let k = 0; k < 14; k++) {
    const x = 16 + k * 3;
    c.thickLine(x, 28, x + (k % 2 ? 1 : -1), 4 + (k % 3) * 3 + f, 2, '#a8283a');
  }
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) c.thickLine(36 + s * 18, 50 + k * 3, 36 + s * (26 + k), 44 + k * 2 - f, 2, '#a8283a');
  // the face
  c.ellipse(36, 44, 18, 20, '#e8b890');
  c.ellipse(28, 40, 4, 4, '#ffffff');
  c.ellipse(44, 40, 4, 4, '#ffffff');
  c.set(28, 40, INK);
  c.set(44, 40, INK);
  c.ellipseOutline(44, 40, 5, 5, BRASSC.m);
  c.line(49, 41, 58, 60 + f, BRASSC.d);
  c.ellipse(36, 56, 6, 4, '#5a1a20');
  // the hat, knocked up into the air by it, with its plume
  c.rect(22, 0 - f, 28, 8, '#74283a');
  c.hline(22, 49, 6 - f, '#5a8a2a');
  // a little smoke
  for (const [px, py] of [[10, 10], [60, 8], [64, 20]]) c.ellipse(px, py - f, 4, 3, '#8a8a8a90');
  // cartoon zap marks
  for (const [x0, y0, x1, y1] of [[4, 30, 10, 36], [10, 36, 6, 40], [66, 30, 60, 36], [60, 36, 66, 42]]) c.line(x0, y0, x1, y1, '#fff070');
  c.outline(INK);
  return c;
}

/** A cartoon spark: the zigzag the old aerial throws when Garrick touches it. */
function zap(f) {
  const c = new PixelCanvas(40, 40);
  const pts = f ? [[20, 0], [14, 12], [24, 16], [10, 30], [22, 26], [16, 40]] : [[22, 0], [26, 10], [14, 18], [26, 24], [12, 40]];
  for (let i = 1; i < pts.length; i++) c.thickLine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 2, '#fff070');
  for (let i = 1; i < pts.length; i++) c.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], '#ffffff');
  for (const [sx, sy] of [[6, 8], [34, 12], [8, 26], [32, 30]]) c.set(sx, sy, '#fff070');
  return c;
}

// ---------------------------------------------------------------------------
// The shelter

/** The hold at night, lit only by the set: beams, crates, a lantern turned right down, dust in the light. */
function holdShelter() {
  const c = new PixelCanvas(320, 224);
  c.fill('#0a0806');
  // the hull's ribs curving round, the deck beams above
  for (let k = 0; k < 7; k++) {
    const x = 12 + k * 50;
    c.thickLine(x, 0, x + (k < 3 ? 14 : k > 3 ? -14 : 0), 224, 6, '#1e140c');
    c.thickLine(x + 2, 0, x + 2 + (k < 3 ? 14 : k > 3 ? -14 : 0), 224, 1, '#2e2012');
  }
  for (const by of [6, 30]) {
    c.rect(0, by, 320, 10, '#24180e');
    c.hline(0, 319, by + 9, '#140c06');
  }
  // crates and sacks stacked in the gloom
  for (const [x, y, w, h] of [[10, 120, 50, 40], [24, 90, 34, 30], [262, 112, 52, 48], [276, 84, 30, 28]]) {
    c.rect(x, y, w, h, '#2a1e12');
    c.strokeRect(x, y, w, h, '#1a120a');
    c.hline(x + 2, x + w - 3, y + Math.floor(h / 2), '#1a120a');
  }
  // the light from the set: a soft pool, with a green and an orange edge
  for (let y = 0; y < 224; y++) for (let x = 0; x < 320; x++) {
    const d = Math.hypot((x - 160) / 170, (y - 100) / 130);
    if (d < 1) c.blend(x, y, '#9ab890', (1 - d) * 0.24);
    const o = Math.hypot((x - 120) / 70, (y - 60) / 50);
    if (o < 1) c.blend(x, y, '#ffb040', (1 - o) * 0.06);
  }
  // dust sifting down in the light
  const r = rng(555);
  for (let i = 0; i < 70; i++) c.set(80 + Math.floor(r() * 160), Math.floor(r() * 160), '#c8c0a060');
  return c;
}

/**
 * The crew from behind, in a row, sitting on whatever there was: bandanas,
 * a tricorn, Bob's great shoulders, Hale's cap; the captain on the end with a
 * small bald head in a blanket on his shoulder. `lean` tips them all in.
 */
function crewBacks(lean) {
  const c = new PixelCanvas(320, 92);
  const L = lean ? 4 : 0;
  const lit = '#c8e0d8';
  const figure = (x, w, h, hat, col) => {
    const top = 92 - h;
    c.ellipse(x, 92, w, 12, '#1a120c'); // whatever they're sitting on
    c.rect(x - w + 2, top + 18 + L, (w - 2) * 2, h - 18, col);
    c.ellipse(x, top + 18 + L, w - 2, 7, col);
    c.ellipse(x, top + 10 + L, 8, 9, '#3a2418');
    if (hat === 'bandana') {
      c.ellipse(x, top + 6 + L, 8, 5, '#a8282a');
      c.line(x + 7, top + 8 + L, x + 11, top + 14 + L, '#a8282a');
    } else if (hat === 'tricorn') {
      c.poly([[x - 12, top + 6 + L], [x, top - 2 + L], [x + 12, top + 6 + L], [x, top + 4 + L]], '#1a1a24');
    } else if (hat === 'cap') {
      c.ellipse(x, top + 4 + L, 8, 4, '#2a3a6a');
    } else if (hat === 'bald') {
      c.ellipse(x, top + 6 + L, 7, 6, '#c89870');
    }
    for (let k = -w + 3; k < w - 3; k++) for (const dy of [17, 18]) if (c.alphaAt(x + k, top + dy + L)) c.blend(x + k, top + dy + L, lit, 0.35); // the screen's light on their shoulders
  };
  figure(28, 14, 60, 'cap', '#2a2a40');
  figure(70, 13, 56, 'bandana', '#4a2a1a');
  figure(112, 20, 66, 'bald', '#3a3020'); // Bob
  figure(208, 14, 58, 'bandana', '#2a3a2a');
  figure(248, 13, 54, 'tricorn', '#2a2018');
  // the captain on the end, with Squawks on his shoulder in a blanket
  figure(292, 15, 64, 'tricorn', '#4a1a1a');
  c.ellipse(280, 36 + L, 6, 6, '#8a7a6a');
  c.ellipse(279, 31 + L, 4, 4, '#d8b0a0');
  c.set(277, 30 + L, '#1a1a1a');
  // a mug of Frog Grog on a barrel
  c.rect(156, 74, 6, 8, '#8a8a9a');
  c.hline(156, 161, 74, '#8ab030');
  c.outline(INK);
  return c;
}

export function addPhase7VistaFrames(atlas) {
  atlas.add('mk2_build_0', mk2(0));
  atlas.add('mk2_build_1', mk2(1));
  atlas.add('mk2_bezel_off', mk2(2));
  atlas.add('mk2_bezel', mk2(2, { lit: true }));
  atlas.add('mk2_back', mk2Back());
  atlas.add('mk2_power', mk2Power());
  atlas.add('ses_bezel_scrapped', sesScrapped());
  for (const f of [0, 1]) {
    atlas.add(`ftm_snacks_${f}`, ftmSnacks(f));
    atlas.add(`ftm_form_${f}`, ftmForm(f));
    atlas.add(`ftm_pond_${f}`, ftmPond(f));
    atlas.add(`ftm_dragonfly_${f}`, ftmDragonfly(f));
    atlas.add(`ftm_letter_${f}`, ftmLetter(f));
    atlas.add(`ftm_season_${f}`, ftmSeason(f));
    atlas.add(`ftm_break_${f}`, ftmBreak(f));
    atlas.add(`storm_returning_${f}`, stormReturning(f));
    atlas.add(`garrick_zapped_${f}`, garrickZapped(f));
    atlas.add(`zap_${f}`, zap(f));
  }
  atlas.add('tv_white', tvWhite());
  atlas.add('tv_hline', tvHline());
  atlas.add('hold_shelter', holdShelter());
  atlas.add('crew_backs', crewBacks(false));
  atlas.add('crew_backs_lean', crewBacks(true));
}

export const PHASE7_VISTA_FRAMES = [
  'mk2_build_0', 'mk2_build_1', 'mk2_bezel_off', 'mk2_bezel', 'mk2_back', 'mk2_power', 'ses_bezel_scrapped',
  ...['ftm_snacks', 'ftm_form', 'ftm_pond', 'ftm_dragonfly', 'ftm_letter', 'ftm_season', 'ftm_break', 'storm_returning', 'garrick_zapped', 'zap']
    .flatMap((n) => [`${n}_0`, `${n}_1`]),
  'tv_white', 'tv_hline', 'hold_shelter', 'crew_backs', 'crew_backs_lean',
];

/** Small versions of the new pictures, for the set in the hold (props). */
export const PHASE7_SCREEN_PAINTERS = {
  ftm2: (f) => [ftmSeason, ftmSnacks, ftmForm, ftmLetter][f % 4](f % 2),
};
