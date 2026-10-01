import { PixelCanvas } from '../PixelCanvas.js';
import { PAL, mix } from '../palette.js';

/**
 * Story Phase 5: the Stenchmaster Entertainment System (S.E.S.), close up.
 *
 * A crude, impossible CRT television that Garrick built out of ship junk: a
 * scrap-wood crate round an extremely thick, rounded glass screen, oversized
 * brass knobs, a cracked compass for a dial, vacuum tubes glowing on top, a
 * coil of copper, bent forks and spoons for an aerial, a frying pan for a
 * reflector, a lantern housing, a potato nailed to the side ("grounding"), a
 * cannon primer and fuse wired into the back ("signal amplification"), and a
 * piece of the ship's bell for a speaker. It looks a great deal more like a
 * bomb than a television. It is not meant to resemble any real console or
 * set: it is a junk-built cabinet TV.
 *
 * Also here: the back (far too many wires), the power source, the channels'
 * pictures (all original, all nonsense), and the glass's scanlines, glare,
 * sparks and smoke. Used by the television close-up (ui/TvView.js) and by
 * vistas.
 */

export const SES_BEZEL = { w: 208, h: 146 };
export const SES_SCREEN = { x: 52, y: 24, w: 104, h: 78 };

const W = SES_SCREEN.w;
const H = SES_SCREEN.h;

const WOOD = ['#3a2412', '#5a3a1c', '#7a5428', '#9a7038', '#b88c4c'];
const BRASS = ['#5a4010', '#8a6418', '#c8a030', '#f0cc48', '#fff0a0'];
const COPPER = ['#5a2410', '#8a4020', '#b8602c', '#e0905a'];
const IRON = ['#1e1e26', '#34343e', '#4c4c58', '#6c6c78', '#9a9aa6'];
const GLASS = ['#0e1614', '#1a2826', '#2a3a36'];
const ROPE = ['#7a5628', '#a67c3e', '#cca660'];
const GROG = ['#2a3a10', '#4a6a1c', '#7aa02c', '#b8e050', '#e8ff90'];

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** A plank-built box, nails at the ends. */
function planks(c, x, y, w, h, { vertical = false } = {}) {
  const r = rng(x * 31 + y * 7 + w);
  if (vertical) {
    for (let px = x; px < x + w; px += 6) {
      const tone = 1 + Math.floor(r() * 3);
      c.rect(px, y, Math.min(6, x + w - px), h, WOOD[tone]);
      c.vline(px, y, y + h - 1, WOOD[0]);
      c.set(px + 2, y + 2, IRON[3]);
      c.set(px + 2, y + h - 3, IRON[3]);
    }
    return;
  }
  for (let py = y; py < y + h; py += 7) {
    const tone = 1 + Math.floor(r() * 3);
    c.rect(x, py, w, Math.min(7, y + h - py), WOOD[tone]);
    c.hline(x, x + w - 1, py, WOOD[0]);
    for (let k = 0; k < 3; k++) c.hline(x + 4 + Math.floor(r() * (w - 12)), x + 8 + Math.floor(r() * (w - 12)), py + 3, WOOD[tone - 1]);
    c.set(x + 2, py + 3, IRON[3]);
    c.set(x + w - 3, py + 3, IRON[3]);
  }
}

function knob(c, cx, cy, r) {
  c.ellipse(cx + 1, cy + 2, r, r, BRASS[0]);
  c.ellipse(cx, cy, r, r, BRASS[2]);
  c.ellipse(cx - 1, cy - 1, r - 2, r - 2, BRASS[3]);
  c.ellipse(cx - 2, cy - 2, 1.5, 1.5, BRASS[4]);
  // ridges round the rim, and a pointer
  for (let a = 0; a < 12; a++) {
    const t = (a / 12) * Math.PI * 2;
    c.set(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), BRASS[1]);
  }
  c.line(cx, cy, cx + Math.round(r * 0.6), cy - Math.round(r * 0.6), BRASS[0]);
}

function tube(c, x, y, h, lit = true) {
  // a vacuum tube: glass envelope, a socket, a glowing filament
  c.rect(x - 3, y + h - 3, 7, 4, IRON[2]);
  c.hline(x - 3, x + 3, y + h - 3, IRON[3]);
  c.ellipse(x, y + h / 2 - 1, 3.5, h / 2, '#c8e8e870');
  c.vline(x - 3, y + 2, y + h - 4, '#e8f8f8a0');
  if (lit) {
    c.vline(x, y + 3, y + h - 4, '#ffb040');
    c.vline(x + 1, y + 4, y + h - 5, '#ff7a20');
    c.set(x, y + 3, '#fff0a0');
  }
  c.set(x, y - 1, '#c8e8e8a0');
}

/** The thick, rounded glass's surround: the hole is left clear except its curved corners. */
function screenSurround(c) {
  const { x, y, w, h } = SES_SCREEN;
  const R = 9;
  // a heavy dark surround, rounded
  for (let j = -8; j < h + 8; j++) {
    for (let i = -8; i < w + 8; i++) {
      const inside = i >= 0 && j >= 0 && i < w && j < h;
      const dx = Math.max(0, Math.max(-i + R - 1, i - (w - R)));
      const dy = Math.max(0, Math.max(-j + R - 1, j - (h - R)));
      const inCorner = Math.hypot(dx, dy) > R;
      if (inside && !inCorner) continue;
      const ox = Math.max(0, Math.max(-i - 8 + R + 2, i - (w + 8 - R - 2)));
      const oy = Math.max(0, Math.max(-j - 8 + R + 2, j - (h + 8 - R - 2)));
      if (Math.hypot(ox, oy) > R + 2) continue;
      let col = IRON[1];
      if (i < 0 || j < 0) col = IRON[2];
      if (j === -8 || i === -8) col = IRON[3];
      if (inside) col = IRON[0];
      c.set(x + i, y + j, col);
    }
  }
  // a thin bright rim where the glass meets the surround
  c.hline(x + R, x + w - R, y - 1, '#5a6a68');
  c.vline(x - 1, y + R, y + h - R, '#5a6a68');
}

function bezel() {
  const c = new PixelCanvas(SES_BEZEL.w, SES_BEZEL.h);
  // the brass tubing loop behind it all
  for (let t = 0; t < 1; t += 0.004) {
    const x = Math.round(26 + Math.sin(t * Math.PI) * -14);
    const y = Math.round(20 + t * 104);
    c.rect(x, y, 3, 2, BRASS[2]);
    c.set(x, y, BRASS[3]);
  }
  // the cabinet: a crate of scrap planks, a bigger front panel
  planks(c, 36, 12, 140, 118);
  c.strokeRect(36, 12, 140, 118, WOOD[0]);
  // corner rope lashings
  for (const [lx, ly] of [[36, 16], [168, 16], [36, 118], [168, 118]]) {
    for (let k = 0; k < 4; k++) c.rect(lx + k * 2, ly - 2 + k, 2, 6 - k, ROPE[k % 3]);
  }
  // cut the opening for the glass, then build the rounded surround round it
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) c.set(SES_SCREEN.x + i, SES_SCREEN.y + j, '#00000000');
  screenSurround(c);
  // right-hand control panel: two oversized knobs and a cracked compass
  c.rect(160, 26, 14, 92, WOOD[1]);
  knob(c, 167, 40, 8);
  knob(c, 167, 66, 6);
  c.ellipse(167, 94, 7, 7, BRASS[1]);
  c.ellipse(167, 94, 6, 6, '#e8e0c8');
  c.line(167, 89, 167, 99, '#c83a30');
  c.line(162, 91, 172, 97, '#3a3a48'); // the crack
  c.set(167, 94, '#2a2a30');
  // label strip under the screen: "S.E.S." punched into a brass plate
  c.rect(84, 106, 40, 8, BRASS[1]);
  c.rect(85, 107, 38, 6, BRASS[2]);
  const glyph = { S: ['111', '100', '111', '001', '111'], E: ['111', '100', '110', '100', '111'], '.': ['000', '000', '000', '000', '010'] };
  [...'S.E.S.'].forEach((ch, i) => {
    glyph[ch].forEach((row, gy) => [...row].forEach((v, gx) => { if (v === '1') c.set(88 + i * 5 + gx, 108 + gy, BRASS[0]); }));
  });
  // the bell-scrap speaker below
  c.ellipse(104, 122, 14, 6, BRASS[1]);
  c.ellipse(104, 121, 12, 4, BRASS[2]);
  for (let gx = 94; gx < 115; gx += 3) c.vline(gx, 119, 124, BRASS[0]);
  // vacuum tubes on top, glowing
  tube(c, 74, 0, 14);
  tube(c, 92, 2, 12);
  tube(c, 110, 0, 14, true);
  // copper coil
  for (let k = 0; k < 6; k++) c.ellipseOutline(132, 4 + k * 2, 4, 1.5, COPPER[k % 2 ? 2 : 3]);
  c.vline(132, 13, 14, COPPER[1]);
  // the frying pan reflector, tilted, handle out
  c.ellipse(158, 6, 13, 6, IRON[1]);
  c.ellipse(158, 5, 11, 4, IRON[2]);
  c.ellipse(155, 4, 4, 1.5, IRON[3]);
  c.thickLine(170, 4, 190, -2, 2, WOOD[1]);
  c.vline(152, 8, 13, IRON[2]);
  // bent forks and spoons for an aerial
  c.line(56, 12, 46, -2, IRON[4]);
  c.line(60, 12, 66, -2, IRON[3]);
  for (let k = 0; k < 4; k++) c.set(45 + k, -1 + (k % 2), IRON[4]); // fork tines
  c.ellipse(67, -1, 2, 3, IRON[4]); // spoon bowl
  c.set(66, -2, '#ffffff');
  // the lantern housing at top left
  c.rect(28, 4, 12, 16, BRASS[1]);
  c.strokeRect(28, 4, 12, 16, BRASS[0]);
  c.rect(30, 7, 8, 9, '#ffe08870');
  c.vline(34, 7, 15, BRASS[0]);
  c.rect(31, 1, 6, 3, BRASS[2]);
  // the potato nailed to the side ("grounding")
  c.ellipse(28, 70, 7, 5, '#a8804a');
  c.ellipse(27, 69, 5, 3, '#c8a06a');
  for (const [ex, ey] of [[24, 68], [30, 72], [26, 73]]) c.set(ex, ey, '#6a4a28');
  c.rect(28, 66, 1, 5, IRON[4]);
  c.set(28, 66, IRON[3]);
  // the cannon primer and its fuse, wired in at the back
  c.rect(14, 98, 18, 6, IRON[1]);
  c.rect(14, 99, 18, 2, IRON[3]);
  c.rect(10, 97, 5, 8, BRASS[1]);
  for (let k = 0; k < 14; k++) c.set(10 - k, 101 + Math.round(Math.sin(k * 0.8) * 3), k % 2 ? '#d8c8a0' : '#a89870');
  c.set(-4 + 1, 101, '#ff8a20');
  // a fistful of wires out of the bottom
  const r = rng(77);
  const wcols = ['#c83a30', '#3a6ad0', '#e8c020', '#3a9a3a', '#e8e0d0', COPPER[2]];
  for (let k = 0; k < 9; k++) {
    let x = 60 + Math.floor(r() * 90);
    const col = wcols[k % wcols.length];
    for (let y = 130; y < SES_BEZEL.h; y++) {
      x += Math.round((r() - 0.5) * 2);
      c.set(x, y, col);
    }
  }
  // a bottle wedged under one corner
  c.rect(160, 128, 6, 14, '#3a6a3a');
  c.rect(161, 124, 4, 4, '#3a6a3a');
  c.vline(161, 130, 140, '#7ab07a');
  c.outline(PAL.ink);
  return c;
}

/** The back of the set: far too many wires. */
function back() {
  const c = new PixelCanvas(SES_BEZEL.w, SES_BEZEL.h);
  planks(c, 36, 12, 140, 118, { vertical: true });
  c.strokeRect(36, 12, 140, 118, WOOD[0]);
  // a hole sawn in the back panel, tubes glowing through it
  c.rect(70, 30, 70, 50, '#1a1210');
  tube(c, 86, 40, 26);
  tube(c, 104, 36, 30);
  tube(c, 122, 40, 26);
  // coils
  for (let k = 0; k < 8; k++) c.ellipseOutline(56, 40 + k * 3, 6, 2, COPPER[k % 2 ? 2 : 3]);
  for (let k = 0; k < 6; k++) c.ellipseOutline(154, 90 + k * 3, 5, 2, COPPER[k % 2 ? 1 : 3]);
  // the wires
  const r = rng(4242);
  const wcols = ['#c83a30', '#3a6ad0', '#e8c020', '#3a9a3a', '#e8e0d0', COPPER[2], '#8a4ac8', '#1a1a20'];
  for (let k = 0; k < 46; k++) {
    const x0 = 38 + r() * 136;
    const y0 = 14 + r() * 112;
    const x1 = 38 + r() * 136;
    const y1 = 14 + r() * 112;
    const sag = 10 + r() * 30;
    const col = wcols[k % wcols.length];
    for (let t = 0; t <= 1; t += 0.01) {
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag;
      if (y < 128) c.set(Math.round(x), Math.round(y), col);
    }
  }
  // a spoon tied in with string, the primer and its fuse, the potato
  c.ellipse(60, 100, 3, 4, IRON[4]);
  c.line(60, 104, 64, 116, IRON[3]);
  c.line(58, 98, 66, 92, '#e8e0d0');
  c.rect(130, 104, 18, 6, IRON[1]);
  c.rect(146, 103, 5, 8, BRASS[1]);
  c.ellipse(80, 108, 7, 5, '#a8804a');
  c.ellipse(79, 107, 5, 3, '#c8a06a');
  c.rect(80, 104, 1, 5, IRON[4]);
  // a crayon label: DO NOT (and nothing after it)
  c.rect(100, 112, 26, 9, '#f0e6c8');
  const dn = ['1101110', '1011010', '1011010', '1101110'];
  dn.forEach((row, y) => [...row].forEach((v, x) => { if (v === '1') c.set(103 + x, 114 + y, '#d03a2a'); }));
  dn.forEach((row, y) => [...row].forEach((v, x) => { if (v === '1') c.set(112 + x, 114 + y, '#d03a2a'); }));
  c.outline(PAL.ink);
  return c;
}

/** The power source: a Frog Grog cask with copper rods in it, glowing. Nobody knows. */
function powerSource() {
  const c = new PixelCanvas(SES_BEZEL.w, SES_BEZEL.h);
  // the cask
  c.ellipse(104, 92, 40, 46, WOOD[2]);
  for (let x = 66; x < 144; x += 7) c.vline(x, 50, 134, WOOD[1]);
  for (const y of [56, 92, 128]) {
    for (let x = 64; x < 146; x++) if (c.alphaAt(x, y)) { c.set(x, y, IRON[2]); c.set(x, y + 1, IRON[1]); }
  }
  // green light leaking through the staves
  for (let x = 69; x < 144; x += 7) for (let y = 62; y < 124; y += 2) c.set(x, y, GROG[3]);
  // the lid, prised open, the grog glowing inside
  c.ellipse(104, 48, 38, 9, WOOD[3]);
  c.ellipse(104, 48, 33, 6, GROG[2]);
  c.ellipse(100, 47, 18, 3, GROG[3]);
  c.ellipse(96, 46, 6, 1.5, GROG[4]);
  // copper rods stuck in, wires up and out of the picture
  for (const [rx, lean] of [[86, -6], [104, 0], [122, 6]]) {
    c.thickLine(rx, 50, rx + lean, 6, 2, COPPER[2]);
    c.line(rx + lean, 6, rx + lean * 3, -2, '#c83a30');
    c.ellipse(rx + lean, 6, 2, 2, BRASS[3]);
  }
  // a jar of the stuff on either side, also glowing
  for (const jx of [34, 176]) {
    c.rect(jx - 9, 92, 18, 30, '#c8e8e840');
    c.rect(jx - 8, 100, 16, 21, GROG[2]);
    c.rect(jx - 8, 100, 16, 2, GROG[4]);
    c.rect(jx - 9, 88, 18, 4, IRON[2]);
    c.line(jx, 88, jx < 100 ? 70 : 138, 60, COPPER[3]);
  }
  // sparks where it shouldn't be possible
  for (const [sx, sy] of [[96, 30], [116, 22], [70, 70]]) {
    c.set(sx, sy, '#ffffff');
    c.set(sx - 1, sy, '#e8ff90');
    c.set(sx + 1, sy, '#e8ff90');
    c.set(sx, sy - 1, '#e8ff90');
    c.set(sx, sy + 1, '#e8ff90');
  }
  // the note nailed to it
  c.rect(84, 96, 40, 16, '#f0e6c8');
  c.hline(88, 120, 101, '#3a6ad0');
  c.hline(88, 112, 105, '#3a6ad0');
  c.hline(88, 116, 108, '#d03a2a');
  c.outline(PAL.ink);
  return c;
}

// ---------------------------------------------------------------------------
// The glass

function off() {
  const c = new PixelCanvas(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - W / 2) / W, (y - H / 2) / H);
    c.set(x, y, mix(GLASS[2], GLASS[0], Math.min(1, d * 1.6)));
  }
  // a curved reflection of the deck
  for (let x = 8; x < 60; x++) c.set(x, 10 + Math.round(((x - 34) / 26) ** 2 * 6), '#5a6a6860');
  return c;
}

function scanlines() {
  const c = new PixelCanvas(W, H);
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x++) c.set(x, y, '#00000040');
  // darker towards the corners: the glass bulges
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2));
    if (d > 0.82) c.blend(x, y, '#000000', Math.min(0.55, (d - 0.82) * 1.6));
  }
  return c;
}

function glare() {
  const c = new PixelCanvas(W, H);
  for (let y = 2; y < 30; y++) for (let x = 4; x < 50; x++) {
    const u = (x - 4) / 46;
    const v = (y - 2) / 28;
    if (v > 1 - u * 0.8 || v < 0.15 - u * 0.1) continue;
    c.set(x, y, '#ffffff14');
  }
  for (let x = 10; x < 40; x++) c.set(x, 6 + Math.round((x - 10) * 0.12), '#ffffff38');
  return c;
}

function staticFrame(seed, { dim = 1, ghost = null } = {}) {
  const c = new PixelCanvas(W, H);
  const r = rng(seed);
  let band = Math.floor(r() * H);
  for (let y = 0; y < H; y++) {
    const bright = Math.abs(y - band) < 3 ? 0.25 : 0;
    for (let x = 0; x < W; x++) {
      let v = (r() * 0.85 + bright) * dim;
      if (ghost) v += ghost(x, y) * (0.6 + r() * 0.4);
      const g = Math.round(Math.max(0, Math.min(1, v)) * 220 + 20);
      c.set(x, y, `#${g.toString(16).padStart(2, '0').repeat(3)}`);
    }
    if (r() < 0.02) band = Math.floor(r() * H);
  }
  return c;
}

/** Channel 2: a weather report from somewhere that isn't: three moons, a coast that loops. */
function weather(f) {
  const c = new PixelCanvas(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) c.set(x, y, mix('#2a3a8a', '#4a6ad0', y / H));
  // three moons
  for (const [mx, my, r] of [[70, 10, 4], [82, 8, 3], [92, 12, 2]]) c.ellipse(mx, my, r, r, '#f0f0d8');
  // the coastline: an island that goes round twice
  for (let t = 0; t < Math.PI * 4; t += 0.02) {
    const rr = 14 + t * 2.4 + Math.sin(t * 5) * 2;
    c.ellipse(Math.round(62 + Math.cos(t) * rr * 0.9), Math.round(44 + Math.sin(t) * rr * 0.55), 1.5, 1.5, '#5aa04a');
  }
  // spiral weather over it, turning
  for (let t = 0; t < 6; t += 0.05) {
    const a = t + f * 0.6;
    c.set(Math.round(64 + Math.cos(a) * t * 3), Math.round(40 + Math.sin(a) * t * 2), '#f0f0f0');
  }
  // the presenter: a silhouette with a long pointer, gesturing at nothing useful
  c.rect(6, 34, 14, 30, '#1a1a2a');
  c.ellipse(13, 28, 5, 6, '#1a1a2a');
  c.line(18, 40, f ? 46 : 52, f ? 24 : 34, '#e8e0c8');
  // numbers in no alphabet
  const marks = [[78, 50], [86, 58], [50, 62], [96, 36]];
  marks.forEach(([x, y], i) => {
    c.rect(x, y, 3, 5, '#ffe040');
    c.set(x + 1, y + 1 + ((i + f) % 3), '#2a3a8a');
    c.rect(x + 4, y, 2, 5, '#ffe040');
  });
  // colour bleed: the signal is coming from a long way off
  for (let y = 0; y < H; y += 9 + f) for (let x = 0; x < W; x++) c.blend(x, y, '#ff4060', 0.18);
  return c;
}

/** Channel 3: someone silently peeling potatoes. Just that. */
function potatoes(f) {
  const c = new PixelCanvas(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) c.set(x, y, y > 52 ? mix('#6a4a28', '#4a3018', (y - 52) / 26) : '#3a3230');
  // a bowl of done ones
  c.ellipse(84, 60, 14, 6, '#8a8a96');
  for (const [px, py] of [[78, 55], [86, 54], [92, 57]]) c.ellipse(px, py, 4, 3, '#e8d8a0');
  // the hands, the potato, the knife
  c.ellipse(36, 44, 9, 7, '#c8a06a');
  c.ellipse(36, 44, 6, 4, '#e8d8a0');
  c.rect(20, 46, 12, 8, '#d8a888');
  c.rect(42, 40, 14, 6, '#d8a888');
  c.line(44, 40 - f, 54, 32 - f, '#d8d8e0');
  c.rect(54, 30 - f, 6, 3, '#5a3a1c');
  // the peel, one long curl that gets longer
  for (let t = 0; t < 2 + f * 1.6; t += 0.05) c.set(Math.round(30 + Math.cos(t * 3) * 4 - t * 2), Math.round(52 + t * 4), '#a8804a');
  return c;
}

/** Channel 4: a fish. Then the same fish. Then that fish again. */
function fish(f) {
  const c = new PixelCanvas(W, H);
  c.fill('#1a5a7a');
  const one = (x, y) => {
    c.ellipse(x, y, 10, 5, '#e8a030');
    c.ellipse(x - 2, y - 1, 6, 2, '#f8d070');
    c.poly([[x + 9, y], [x + 16, y - 6], [x + 16, y + 6]], '#c87a20');
    c.set(x - 6, y - 1, '#1a1a20');
  };
  const off = f ? 13 : 0;
  for (let y = -6; y < H + 13; y += 26) for (let x = -14; x < W + 20; x += 34) one(x + off, y + (Math.floor((x + 14) / 34) % 2) * 13);
  return c;
}

/** Channel 5: a theatrical programme nobody understands. A man argues with a turnip. */
function theatre(f) {
  const c = new PixelCanvas(W, H);
  c.fill('#1a1018');
  // curtains and footlights
  for (let x = 0; x < 18; x++) c.vline(x, 0, H, x % 4 < 2 ? '#8a1c24' : '#a82a30');
  for (let x = W - 18; x < W; x++) c.vline(x, 0, H, x % 4 < 2 ? '#8a1c24' : '#a82a30');
  for (let x = 0; x < W; x++) c.set(x, 2 + Math.round(Math.sin(x * 0.3) * 2), '#c8a030');
  c.rect(0, 64, W, 14, '#5a3a1c');
  for (let x = 10; x < W; x += 14) c.ellipse(x, 66, 2, 1, '#ffe080');
  // the turnip on its stool
  c.rect(70, 50, 12, 3, '#6a4a28');
  c.vline(72, 53, 64, '#6a4a28');
  c.vline(80, 53, 64, '#6a4a28');
  c.ellipse(76, 45, 5, 5, '#e8d8e8');
  c.ellipse(76, 42, 5, 2, '#9a4ab8');
  c.line(76, 39, 74 - (f === 2 ? 2 : 0), 33, '#4a9a3a');
  c.line(76, 39, 79 + (f === 2 ? 2 : 0), 33, '#3a8a2a');
  if (f === 2) for (const [qx, qy] of [[84, 36], [88, 34], [86, 30]]) c.set(qx, qy, '#ffffff');
  // the actor in a ruff, declaiming at it
  c.rect(36, 34, 12, 24, '#2a2a48');
  c.ellipse(42, 32, 8, 3, '#f0f0f0');
  c.ellipse(42, 26, 5, 6, '#d8a888');
  c.rect(38, 58, 3, 6, '#1a1a2a');
  c.rect(44, 58, 3, 6, '#1a1a2a');
  if (f === 1) {
    c.line(36, 36, 28, 22, '#2a2a48');
    c.line(48, 36, 58, 24, '#2a2a48');
  } else {
    c.line(48, 38, 64, 42, '#2a2a48');
    c.line(36, 38, 32, 46, '#2a2a48');
  }
  if (f !== 2) c.set(45, 28, '#3a1418');
  return c;
}

const SHAPE = (x, y) => {
  // something tall and pale in the middle of the static, barely there
  const d = Math.hypot((x - 52) / 10, (y - 40) / 24);
  return d < 1 ? (1 - d) * 0.25 : 0;
};

const GLINT = (x, y) => {
  const d = Math.hypot((x - 50) / 18, (y - 34) / 14);
  const star = (Math.abs(x - 50) < 1 && Math.abs(y - 34) < 12) || (Math.abs(y - 34) < 1 && Math.abs(x - 50) < 16) ? 0.6 : 0;
  return (d < 1 ? (1 - d) * 0.7 : 0) + star;
};

function spark(f) {
  const c = new PixelCanvas(14, 14);
  const len = [3, 6, 4][f];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + f * 0.4;
    c.line(7, 7, Math.round(7 + Math.cos(a) * len), Math.round(7 + Math.sin(a) * len), k % 2 ? '#fff0a0' : '#80d0ff');
  }
  c.set(7, 7, '#ffffff');
  return c;
}

function smoke() {
  const c = new PixelCanvas(12, 12);
  c.ellipse(6, 6, 5, 5, '#8a8a8a');
  c.ellipse(4, 4, 3, 3, '#b8b8b8');
  return c;
}

/** A wall of deck planking behind the set, by day or by night. */
function deckWall(night) {
  const c = new PixelCanvas(320, 224);
  const tones = night ? ['#141428', '#1a1c34', '#20223c', '#262a46'] : ['#5a3a1c', '#7a5428', '#8a6430', '#9a7038'];
  for (let y = 0; y < 224; y += 9) {
    const t = tones[1 + (Math.floor(y / 9) % 3)];
    c.rect(0, y, 320, 9, t);
    c.hline(0, 319, y, tones[0]);
    for (let x = (y * 7) % 60; x < 320; x += 60) c.vline(x, y, y + 8, tones[0]);
  }
  // rigging lines, a lantern hook
  c.line(0, 30, 120, 0, night ? '#2a2c48' : '#6a4a28');
  c.line(320, 40, 220, 0, night ? '#2a2c48' : '#6a4a28');
  if (night) {
    // the only light is the screen's: a soft green-white pool in the middle
    for (let y = 0; y < 224; y++) for (let x = 0; x < 320; x++) {
      const d = Math.hypot((x - 160) / 150, (y - 70) / 110);
      if (d < 1) c.blend(x, y, '#9ab8b0', (1 - d) * 0.22);
    }
  }
  return c;
}

/** Garrick from behind, in his chair, in the suit: hat, epaulettes, collar, lit by the screen. */
function garrickBack() {
  const c = new PixelCanvas(96, 84);
  // chair back (the upholstered hatch cover)
  c.rect(14, 30, 68, 54, '#2e0c18');
  c.rect(16, 32, 64, 50, '#521828');
  for (const bx of [28, 48, 68]) c.set(bx, 54, '#c8a030');
  // shoulders and epaulettes rising above the chair back
  c.ellipse(48, 34, 30, 10, '#2e0c18');
  for (const [ex, dir] of [[18, 1], [78, -1]]) {
    for (let i = 0; i < 12; i++) c.set(ex + dir * i, 27, '#f0cc48');
    for (let i = 0; i < 12; i++) c.set(ex + dir * i, 28, '#a8801c');
    for (let i = 0; i < 12; i += 2) c.vline(ex + dir * i, 29, 31, '#d8b038');
  }
  // the collar standing up, the back of the head, the crooked hat
  c.rect(36, 16, 24, 14, '#c8a030');
  c.hline(36, 59, 16, '#5a8a2a');
  c.ellipse(48, 14, 10, 9, '#a8283a');
  c.ellipse(48, 10, 8, 4, '#7a1826');
  for (let y = -12; y < 6; y++) c.hline(40 + Math.round((6 - y) * 0.25), 55 + Math.round((6 - y) * 0.25), y + 12, '#521828');
  c.rect(40, 14, 16, 3, '#6a9a24');
  c.ellipse(46, 0, 5, 3, '#6a9a24');
  // the screen's light along every edge facing it
  for (let x = 16; x < 80; x++) if (c.alphaAt(x, 31)) c.set(x, 30, '#c8e0d880');
  c.outline(PAL.ink);
  return c;
}

export function addSesVistaFrames(atlas) {
  atlas.add('ses_bezel', bezel());
  atlas.add('ses_back', back());
  atlas.add('ses_power_source', powerSource());
  atlas.add('tv_off', off());
  atlas.add('tv_scan', scanlines());
  atlas.add('tv_glare', glare());
  for (let f = 0; f < 4; f++) atlas.add(`tv_static_${f}`, staticFrame(11 + f * 97));
  for (let f = 0; f < 2; f++) atlas.add(`tv_weather_${f}`, weather(f));
  for (let f = 0; f < 3; f++) atlas.add(`tv_potato_${f}`, potatoes(f));
  for (let f = 0; f < 2; f++) atlas.add(`tv_fish_${f}`, fish(f));
  for (let f = 0; f < 3; f++) atlas.add(`tv_theatre_${f}`, theatre(f));
  for (let f = 0; f < 4; f++) atlas.add(`tv_whisper_${f}`, staticFrame(503 + f * 31, { dim: 0.55, ghost: f % 2 ? SHAPE : null }));
  atlas.add('tv_almost', staticFrame(907, { dim: 0.5, ghost: GLINT }));
  for (let f = 0; f < 3; f++) atlas.add(`tv_spark_${f}`, spark(f));
  atlas.add('tv_smoke', smoke());
  atlas.add('ses_wall_day', deckWall(false));
  atlas.add('ses_wall_night', deckWall(true));
  atlas.add('garrick_back_suit', garrickBack());
}

export const SES_VISTA_FRAMES = [
  'ses_bezel', 'ses_back', 'ses_power_source', 'tv_off', 'tv_scan', 'tv_glare',
  'tv_static_0', 'tv_static_1', 'tv_static_2', 'tv_static_3', 'tv_weather_0', 'tv_weather_1',
  'tv_potato_0', 'tv_potato_1', 'tv_potato_2', 'tv_fish_0', 'tv_fish_1', 'tv_theatre_0', 'tv_theatre_1', 'tv_theatre_2',
  'tv_whisper_0', 'tv_whisper_1', 'tv_whisper_2', 'tv_whisper_3', 'tv_almost', 'tv_spark_0', 'tv_spark_1', 'tv_spark_2', 'tv_smoke',
  'ses_wall_day', 'ses_wall_night', 'garrick_back_suit',
];

/** The channel pictures, for painting small copies onto the set on deck. */
export const SES_SCREEN_PAINTERS = {
  static: (f) => staticFrame(11 + f * 97),
  weather: weather,
  potato: potatoes,
  fish: fish,
  theatre: theatre,
  whisper: (f) => staticFrame(503 + f * 31, { dim: 0.55, ghost: f % 2 ? SHAPE : null }),
  off: () => off(),
};
