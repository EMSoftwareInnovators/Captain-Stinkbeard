import { PixelCanvas } from '../PixelCanvas.js';
import { ShelfAtlas } from '../atlas.js';
import { PAL, mix, rgba } from '../palette.js';
import { addPhase4VistaFrames, PHASE4_VISTA_FRAMES } from './vistaPhase4.js';
import { addSesVistaFrames, SES_VISTA_FRAMES } from './sesArt.js';
import { addPhase6VistaFrames, PHASE6_VISTA_FRAMES, garlicCloud } from './vistaPhase6.js';

/**
 * Side-view art for vistas (scenes/CinemaScene.js): skies and seas for each
 * time of day, ships, Garrick's bathtub in close-up, the rowboat, the great
 * yellow cloud, gulls, fish, the figurehead, and the telescope mask.
 * Screen is 320x224; skies are 320x132 and seas 320x92 (horizon at y=132).
 */
const INK = PAL.ink;
const W = 320;
const SKY_H = 132;
const SEA_H = 92;

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

export const SKIES = {
  morning: { top: '#6a9ad8', bottom: '#f8d8b0', sun: [250, 96, '#fff4d0'], clouds: '#ffffff' },
  day: { top: '#3a78c8', bottom: '#a8d8f0', sun: [60, 30, '#fffce8'], clouds: '#ffffff' },
  afternoon: { top: '#4a7ac0', bottom: '#f0d898', sun: [230, 52, '#fff0b8'], clouds: '#fff4e0' },
  evening: { top: '#2a3a78', bottom: '#f09860', sun: [220, 112, '#ffd070'], clouds: '#f8b088' },
  sunset: { top: '#3a1c48', bottom: '#fcc070', sun: [236, 126, '#fff0c8'], clouds: '#e87a48' },
  dusk: { top: '#141430', bottom: '#8a5a88', sun: null, clouds: '#6a4a78', stars: true },
  night: { top: '#07081a', bottom: '#2c2e52', sun: null, clouds: '#3a3a5c', stars: true },
  noon: { top: '#2e6cc0', bottom: '#b8e0f4', sun: [160, 22, '#fffef0'], clouds: '#ffffff' },
  // Story Phase 6: the night of the Great Sharkstorm (bruised, mustard-lit from below)
  storm: { top: '#0c0e10', bottom: '#5a5430', sun: null, clouds: '#2a2c24' },
};

const SEAS = {
  morning: ['#1c5288', '#2e6aa0', '#6aa8d0', '#f8e0c0'],
  day: ['#12447a', '#21598e', '#5aa2cc', '#e6f5f8'],
  afternoon: ['#16447a', '#28608e', '#70a8c0', '#f8ecc0'],
  evening: ['#1a2a58', '#2e3e70', '#c07a60', '#f8c890'],
  sunset: ['#1c1a40', '#3a2a58', '#e87a48', '#fff0c8'],
  dusk: ['#0c1028', '#1a2244', '#4a4a78', '#8a7aa8'],
  night: ['#060818', '#101430', '#2c3058', '#6a6a98'],
  noon: ['#10427a', '#1e5a90', '#58a8d4', '#f0fbff'],
  storm: ['#06100e', '#12201c', '#3a4a3a', '#c8c070'],
};

function paintSky(name) {
  const s = SKIES[name];
  const c = new PixelCanvas(W, SKY_H);
  for (let y = 0; y < SKY_H; y++) {
    const t = y / (SKY_H - 1);
    for (let x = 0; x < W; x++) {
      // posterised gradient in 6 bands with ordered dither at the edges
      const band = Math.min(5, Math.floor(t * 6 + BAYER[y & 3][x & 3] / 16 - 0.5 / 16));
      c.set(x, y, mix(s.top, s.bottom, band / 5));
    }
  }
  if (s.stars) for (let i = 0; i < 50; i++) c.set((i * 97 + 13) % W, (i * 37 + 5) % 70, i % 4 ? '#c8b8e0' : '#ffffff');
  if (s.sun) {
    const [sx, sy, col] = s.sun;
    c.ellipse(sx, sy, 16, 16, mix(col, s.bottom, 0.4));
    c.ellipse(sx, sy, 12, 12, col);
  }
  for (const [cx, cy, w] of [[70, 40, 80], [190, 26, 60], [280, 70, 50], [120, 84, 70]]) {
    for (let x = -w / 2; x < w / 2; x++) {
      const h = Math.max(1, Math.round(4 * Math.cos((x / w) * Math.PI)));
      for (let y = 0; y < h; y++) c.set(Math.round(cx + x), cy - y, y === 0 ? mix(s.clouds, s.bottom, 0.4) : s.clouds);
    }
  }
  return c;
}

function paintSea(name, frame) {
  const [deep, mid, light, glint] = SEAS[name];
  const c = new PixelCanvas(W, SEA_H);
  for (let y = 0; y < SEA_H; y++) {
    const base = y < 3 ? light : y < 22 ? mid : deep;
    for (let x = 0; x < W; x++) {
      let col = base;
      const wave = Math.sin(x * (0.06 + y * 0.004) + y * 0.9 + frame * 1.9) + Math.sin(x * 0.021 - y * 0.35);
      if (wave > 1.45) col = light;
      if (wave > 1.85 && y > 4) col = glint;
      c.set(x, y, col);
    }
  }
  return c;
}

/** The Revenge in daylight, sailing right. */
function revengeSide() {
  const c = new PixelCanvas(150, 112);
  const hull = PAL.hull3;
  c.poly([[10, 84], [132, 82], [146, 70], [140, 98], [22, 102]], hull);
  c.poly([[12, 84], [130, 82], [127, 88], [16, 90]], PAL.hull4);
  c.poly([[4, 70], [36, 72], [34, 86], [8, 86]], hull); // stern castle
  c.rect(8, 74, 22, 4, '#7a1826');
  for (let x = 38; x < 126; x += 11) c.rect(x, 92, 4, 3, '#1a1320');
  c.line(146, 70, 150, 60, PAL.hull2); // bowsprit
  for (const [x, top] of [[40, 12], [78, 2], [112, 18]]) c.rect(x, top, 3, 84 - top, PAL.hull1);
  const sail = (x, y, w, h) => {
    c.poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2 + 4, y + h], [x - w / 2 + 2, y + h]], PAL.cloth3);
    c.line(Math.round(x - w / 2), y, Math.round(x - w / 2 + 2), y + h, PAL.cloth1);
    c.hline(Math.round(x - w / 2), Math.round(x + w / 2), y, PAL.cloth4);
  };
  sail(41, 18, 34, 24); sail(41, 46, 40, 30);
  sail(79, 8, 38, 26); sail(79, 38, 46, 34);
  sail(113, 26, 28, 20); sail(113, 50, 32, 24);
  // the colours: a bearded skull
  c.rect(79, 0, 14, 8, '#1a1320');
  c.set(84, 3, '#f4e8cc'); c.set(86, 3, '#f4e8cc'); c.rect(84, 5, 4, 2, '#f4e8cc');
  c.outline(INK);
  return c;
}

function trail() {
  const c = new PixelCanvas(180, 26);
  for (let y = 0; y < 26; y++) {
    for (let x = 0; x < 180; x++) {
      const t = x / 180;
      const d = Math.abs(y - 13 - Math.sin(x * 0.05) * 3) / (4 + t * 9);
      if (d > 1) continue;
      if (BAYER[y & 3][x & 3] / 16 < (1 - d) * (1 - t) * 0.9) c.set(x, y, (x + y) % 5 ? '#e8d870c0' : '#c8b84ac0');
    }
  }
  return c;
}

function frigateSide({ broken = false } = {}) {
  const c = new PixelCanvas(150, 112);
  c.poly([[8, 72], [18, 84], [132, 84], [144, 70], [138, 100], [22, 102]], '#2a2230');
  c.poly([[18, 84], [132, 84], [128, 90], [22, 90]], '#28366a');
  c.hline(20, 130, 86, '#f4e8cc');
  for (let x = 28; x < 128; x += 9) c.rect(x, 93, 4, 3, '#0c0a10');
  c.poly([[112, 66], [144, 66], [142, 82], [112, 82]], '#2a2230'); // stern castle (facing left)
  c.rect(116, 70, 22, 4, '#28366a');
  c.line(8, 72, 0, 62, '#2a2230');
  const masts = [[38, 10], [74, 0]];
  if (!broken) masts.push([110, 14]);
  for (const [x, top] of masts) c.rect(x, top, 3, 84 - top, '#1a1418');
  const sail = (x, y, w, h) => {
    c.poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2 - 2, y + h], [x - w / 2 - 4, y + h]], '#f4ecd8');
    c.hline(Math.round(x - w / 2), Math.round(x + w / 2), y, '#ffffff');
  };
  sail(39, 16, 32, 24); sail(39, 44, 38, 30);
  sail(75, 6, 36, 26); sail(75, 36, 44, 34);
  if (!broken) {
    sail(111, 22, 28, 20); sail(111, 46, 30, 26);
  } else {
    // mizzen snapped, dragging its sail
    c.line(111, 60, 130, 44, '#1a1418');
    c.poly([[116, 50], [134, 42], [140, 62], [124, 70]], '#d8ccb0');
  }
  // navy pennant
  c.poly([[75, 0], [92, 2], [75, 5]], '#28366a');
  c.outline(INK);
  return c;
}

function frigateStern() {
  const c = new PixelCanvas(70, 100);
  c.poly([[8, 60], [62, 60], [56, 92], [14, 92]], '#2a2230');
  c.rect(14, 64, 42, 10, '#28366a');
  for (let x = 18; x < 54; x += 8) c.rect(x, 67, 5, 4, '#f8d078');
  c.rect(33, 0, 3, 60, '#1a1418');
  c.poly([[14, 12], [56, 12], [54, 36], [16, 36]], '#f4ecd8');
  c.poly([[10, 40], [60, 40], [58, 58], [12, 58]], '#f4ecd8');
  c.outline(INK);
  return c;
}

function sloopSide() {
  const c = new PixelCanvas(90, 72);
  c.poly([[6, 50], [80, 50], [88, 42], [82, 62], [14, 64]], PAL.wood2);
  c.hline(8, 80, 51, PAL.wood4);
  c.rect(44, 4, 3, 46, PAL.wood1);
  c.poly([[46, 6], [78, 44], [46, 44]], '#e8d8b0');
  c.poly([[43, 8], [14, 44], [43, 44]], '#d8c8a0');
  c.outline(INK);
  return c;
}

function tubClose(frame, { sag = false } = {}) {
  const c = new PixelCanvas(96, 64);
  const WOOD = [PAL.wood1, PAL.wood2, PAL.wood3, PAL.wood4];
  // the overturned tub riding low in the water, planks and hoops
  c.ellipse(48, 50, 34, 12, WOOD[2]);
  c.ellipse(46, 46, 30, 8, WOOD[3]);
  for (let x = 20; x < 80; x += 7) c.line(x, 40, x + 2, 60, WOOD[1]);
  c.hline(14, 82, 50, PAL.iron2);
  // Garrick, sitting on it: frock coat, big sideburns, monocle
  const cx = 48;
  c.ellipse(cx, 34, 12, 10, '#2a5f56');
  c.ellipse(cx - 4, 31, 6, 6, '#4a8a78');
  c.rect(cx - 12, 38, 24, 3, '#553220');
  c.rect(cx - 9, 38, 4, 4, '#774a2e');
  c.set(cx - 8, 37, PAL.gold4);
  c.ellipse(cx, 18, 8, 8, '#dc9c76');
  c.ellipse(cx - 2, 15, 4, 3, '#f6c8a0');
  c.line(cx - 6, 12, cx + 6, 10, '#962a22');
  c.line(cx - 5, 11, cx + 5, 9, '#c85236');
  // mutton chops
  c.ellipse(cx - 8, 21, 3, 6, '#962a22');
  c.ellipse(cx + 8, 21, 3, 6, '#5a1414');
  // eyes, monocle, a mouth open mid-shout
  c.set(cx - 3, 17, INK);
  c.ellipseOutline(cx + 3, 17, 2.5, 2.5, PAL.gold3);
  c.set(cx + 3, 17, INK);
  c.rect(cx - 2, 22, 4, 3, '#3a1418');
  c.set(cx - 1, 24, '#e46452');
  // arms and the two enormous sausage paddles
  const dip = frame ? 6 : -4;
  const paddle = (x0, y0, x1, y1, droop) => {
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * droop);
      c.ellipse(x, y, 2.6, 2.6, '#8a3a24');
      c.set(x - 1, y - 1, '#c46a44');
    }
  };
  c.line(cx - 11, 32, cx - 18, 28 + dip, '#2a5f56');
  c.line(cx + 11, 32, cx + 18, 28 - dip, '#2a5f56');
  if (sag) {
    paddle(cx - 18, 28, cx - 38, 50, 10);
    paddle(cx + 18, 28, cx + 38, 50, 10);
  } else {
    paddle(cx - 18, 28 + dip, cx - 42, 44 + dip * 1.5, 0);
    paddle(cx + 18, 28 - dip, cx + 42, 44 - dip * 1.5, 0);
  }
  c.outline(INK);
  // splash where the sausages meet the sea
  for (const sx of [cx - 40, cx + 40]) {
    c.set(sx, 54, '#e6f5f8'); c.set(sx - 2, 52, '#e6f5f8'); c.set(sx + 2, 51, '#9bd3e6');
  }
  return c;
}

function rowboatSide(frame, { happy = false } = {}) {
  const c = new PixelCanvas(64, 40);
  c.poly([[4, 26], [60, 26], [54, 36], [10, 36]], PAL.wood2);
  c.hline(4, 60, 26, PAL.wood4);
  const cx = 32;
  c.ellipse(cx, 20, 7, 6, '#2a5f56');
  c.ellipse(cx, 10, 5, 5, '#dc9c76');
  c.ellipse(cx - 5, 12, 2, 4, '#962a22');
  c.ellipse(cx + 5, 12, 2, 4, '#5a1414');
  c.set(cx - 2, 9, INK);
  c.ellipseOutline(cx + 2, 9, 1.8, 1.8, PAL.gold3);
  if (happy) {
    c.line(cx - 6, 17, cx - 11, 6, '#2a5f56');
    c.line(cx + 6, 17, cx + 11, 6, '#2a5f56');
    c.rect(cx - 3, 13, 5, 2, '#3a1418');
  } else {
    const k = frame ? 3 : -2;
    c.line(cx - 6, 20, cx - 22, 28 + k, PAL.wood4);
    c.line(cx + 6, 20, cx + 22, 28 - k, PAL.wood4);
    c.hline(cx - 2, cx + 1, 13, '#3a1418');
  }
  c.outline(INK);
  return c;
}

/**
 * The yellow cloud, in three stages of the same eruption. Every stage keeps
 * its base at the bottom centre of the frame (a low, wide skirt that hugs
 * whatever it came out of), so a vista grows it by swapping frames and
 * scaling from that anchor; the column runs unbroken from the base to the
 * head or cap, so it never reads as a stack of separate puffs.
 */
function cloudRise(stage) {
  const W = 150;
  const H = 130;
  const c = new PixelCanvas(W, H);
  const cx = 75;
  const baseY = 121;
  const S = [
    { skirt: [30, 9], top: 98, wTop: 9, wBase: 15, head: [[75, 94, 15, 12]] },
    { skirt: [35, 10], top: 72, wTop: 9, wBase: 17, head: [[75, 66, 21, 16], [62, 72, 11, 9], [88, 72, 11, 9]] },
    {
      skirt: [41, 11], top: 50, wTop: 9, wBase: 19,
      head: [[75, 40, 47, 21], [52, 28, 17, 14], [75, 20, 19, 15], [98, 28, 17, 14], [34, 42, 12, 10], [116, 42, 12, 10]],
      cap: [75, 40, 47, 21],
    },
  ][stage];
  const ell = (x, y, [ex, ey, rx, ry]) => 1 - Math.hypot((x - ex) / rx, (y - ey) / ry);
  const parts = (x, y) => {
    const out = { skirt: ell(x, y, [cx, baseY, ...S.skirt]), column: -Infinity, head: -Infinity };
    if (y >= S.top - 4 && y <= baseY + 2) {
      const t = Math.max(0, Math.min(1, (y - S.top) / (baseY - S.top)));
      // narrowest a little below the head, flaring into the skirt
      const w = S.wTop + (S.wBase - S.wTop) * t ** 2.2 + Math.sin(y * 0.33) * 1.4;
      out.column = 1 - Math.abs(x - cx - Math.sin(y * 0.11) * 1.5) / w;
    }
    for (const h of S.head) out.head = Math.max(out.head, ell(x, y, h));
    return out;
  };
  const field = (x, y) => {
    const p = parts(x, y);
    // billowy edges: a little noise only where the cloud is thin
    const n = 0.09 * Math.sin(x * 0.53 + y * 0.31) * Math.cos(y * 0.47 - x * 0.21);
    return Math.max(p.skirt, p.column, p.head) + n;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = field(x, y);
      if (v <= 0) continue;
      if (v < 0.1 && BAYER[y & 3][x & 3] / 16 > v * 8) continue;
      const lit = field(x - 3, y - 3) > v + 0.02;
      let col = v < 0.12 ? '#a89830' : lit ? '#f4e67a' : '#d8c048';
      if (!lit && field(x + 2, y + 2) < v - 0.05) col = '#b8a838';
      // the cap rolls over: its underside sits in shadow above the column
      if (S.cap && y > S.cap[1] + 4 && y < S.cap[1] + S.cap[3] + 2 && ell(x, y, S.cap) > 0 && Math.abs(x - cx) > 8) col = v < 0.25 ? '#a89830' : '#b8a838';
      // where the column meets the skirt, a darker collar ties them together
      if (y > baseY - 6 && y < baseY - 1 && Math.abs(x - cx) < S.wBase + 3 && !lit) col = '#b8a838';
      if ((x * 7 + y * 3) % 29 === 0 && v > 0.2) col = '#98b03a';
      c.set(x, y, col);
    }
  }
  return c;
}

function gull(frame) {
  const c = new PixelCanvas(12, 7);
  if (frame) {
    c.line(0, 1, 5, 4, '#f4f0e8'); c.line(11, 1, 6, 4, '#f4f0e8');
  } else {
    c.line(0, 5, 5, 3, '#f4f0e8'); c.line(11, 5, 6, 3, '#f4f0e8');
  }
  c.set(5, 3, '#c8c0b8');
  c.set(6, 3, '#c8c0b8');
  return c;
}

function fish(frame) {
  const c = new PixelCanvas(12, 12);
  const ang = [-0.6, 0.2, 1.1][frame];
  for (let i = -4; i <= 4; i++) {
    const x = Math.round(6 + Math.cos(ang) * i);
    const y = Math.round(6 + Math.sin(ang) * i);
    c.set(x, y, i > 2 ? '#3a78ad' : '#9bd3e6');
    c.set(x, y + 1, '#3278ad');
  }
  c.outline('#0f2b52');
  return c;
}

/** The ship's figurehead: an original carved sea-maiden with a laurel crown. */
function figurehead(disgusted) {
  const c = new PixelCanvas(100, 96);
  const wood = ['#6a4424', '#8e6034', '#b88048', '#d8a466'];
  // the bow timbers she's mounted on
  c.poly([[70, 0], [100, 0], [100, 96], [58, 96]], PAL.hull2);
  c.poly([[74, 0], [100, 0], [100, 12], [72, 14]], PAL.hull3);
  // body curving out from the bow
  c.poly([[64, 30], [80, 44], [74, 96], [40, 96], [44, 60]], wood[1]);
  c.poly([[62, 36], [72, 46], [66, 90], [48, 90], [50, 62]], wood[2]);
  // head
  c.ellipse(46, 30, 13, 15, wood[2]);
  c.ellipse(43, 26, 8, 9, wood[3]);
  // laurel crown and flowing hair
  for (let i = 0; i < 8; i++) c.ellipse(36 + i * 3.5, 16 + Math.abs(i - 3.5) * 0.8, 2.5, 1.6, '#5a7a34');
  c.poly([[56, 20], [70, 34], [66, 60], [58, 42]], wood[1]);
  if (!disgusted) {
    // serene: eyes gazing ahead, a calm mouth
    c.hline(37, 41, 28, wood[0]);
    c.hline(45, 49, 28, wood[0]);
    c.hline(40, 46, 38, wood[0]);
  } else {
    // appalled: eyes screwed shut, nose wrinkled, mouth turned down, one
    // carved hand now pinching her nose
    c.line(36, 27, 41, 29, wood[0]); c.line(36, 30, 41, 29, wood[0]);
    c.line(45, 29, 50, 27, wood[0]); c.line(45, 29, 50, 30, wood[0]);
    c.hline(42, 44, 32, wood[0]);
    c.line(39, 40, 42, 38, wood[0]); c.line(42, 38, 46, 38, wood[0]); c.line(46, 38, 49, 40, wood[0]);
    c.ellipse(44, 34, 4, 3, wood[3]);
    c.line(50, 60, 45, 36, wood[1]);
    c.line(51, 60, 46, 36, wood[2]);
    // the odour lines she's reacting to
    for (let y = 2; y < 20; y++) c.set(20 + Math.round(Math.sin(y * 0.6) * 2), y, '#c8d450');
    for (let y = 8; y < 26; y++) c.set(10 + Math.round(Math.sin(y * 0.6 + 1) * 2), y, '#b8c44a');
  }
  c.outline(INK);
  return c;
}

// ---------------------------------------------------------------------------
// Story Phase 3: sharks, the lure, a ship with swollen sails

const FIN = ['#2e3a4c', '#4a5a70', '#8a9ab0'];

/** A dorsal fin slicing the surface, side view (moving left). */
function finSide(frame) {
  const c = new PixelCanvas(20, 16);
  c.poly([[4, 13], [11, 1], [16, 13]], FIN[1]);
  c.line(5, 12, 11, 2, FIN[2]);
  c.poly([[13, 13], [11, 3], [16, 13]], FIN[0]);
  c.outline(INK);
  // bow wave
  const k = frame ? 1 : 0;
  for (let x = 0; x < 20; x++) if (!c.alphaAt(x, 14)) c.set(x, 14, x < 6 ? '#f0fbff' : '#9bd3e6');
  c.set(2 - k, 13, '#f0fbff');
  c.set(1, 12 - k, '#f0fbff');
  return c;
}

/** A shark breaking the surface in an arc. */
function sharkLeap() {
  const c = new PixelCanvas(40, 22);
  c.ellipse(20, 11, 15, 5, FIN[1]);
  c.ellipse(21, 13, 12, 2.5, '#d8dce4');
  c.poly([[20, 6], [16, 0], [24, 6]], FIN[0]);
  c.poly([[6, 11], [0, 5], [2, 11], [0, 17]], FIN[0]);
  c.poly([[33, 9], [39, 11], [33, 14]], FIN[1]);
  c.set(32, 10, INK);
  c.outline(INK);
  for (const [x, y] of [[4, 20], [8, 21], [30, 21], [35, 20]]) c.set(x, y, '#f0fbff');
  return c;
}

/** The rowboat heading off: Garrick with a pot of beans, and an oar or a frying pan. */
function rowboatBeans(frame, { pan = false } = {}) {
  const c = new PixelCanvas(64, 40);
  c.poly([[4, 26], [60, 26], [54, 36], [10, 36]], PAL.wood2);
  c.hline(4, 60, 26, PAL.wood4);
  if (pan) for (let a = 0; a < Math.PI; a += 0.5) c.set(Math.round(56 + Math.cos(a) * 3), Math.round(27 + Math.sin(a) * 3), INK);
  const cx = 32;
  c.ellipse(cx, 20, 7, 6, '#2a5f56');
  c.ellipse(cx, 10, 5, 5, '#dc9c76');
  c.ellipse(cx - 5, 12, 2, 4, '#962a22');
  c.ellipse(cx + 5, 12, 2, 4, '#5a1414');
  // the pot hat
  c.rect(cx - 5, 3, 10, 4, '#5a5a68');
  c.hline(cx - 6, cx + 5, 6, '#3a3a48');
  c.line(cx + 5, 4, cx + 9, 3, '#3a3a48');
  c.set(cx - 2, 9, INK);
  c.ellipseOutline(cx + 2, 9, 1.8, 1.8, PAL.gold3);
  // spoon to mouth / oar stroke, alternating (only two hands)
  if (frame) {
    c.line(cx - 6, 19, cx - 3, 14, '#2a5f56');
    c.set(cx - 2, 13, '#b86a3a');
    c.line(cx + 6, 20, cx + 22, 30, pan ? PAL.iron3 : PAL.wood4);
  } else {
    c.line(cx - 6, 20, cx - 22, 30, PAL.wood4);
    c.line(cx + 6, 19, cx + 3, 14, '#2a5f56');
  }
  if (pan && !frame) c.line(cx + 6, 20, cx + 16, 24, PAL.iron3);
  if (pan) c.ellipse(frame ? cx + 23 : cx + 18, frame ? 31 : 25, 3, 2, PAL.iron2);
  // the bean pot on his knees
  c.ellipse(cx, 25, 5, 3, PAL.iron2);
  c.hline(cx - 3, cx + 2, 23, '#b86a3a');
  c.outline(INK);
  return c;
}

/** The Revenge with her sails swollen and faintly yellow. */
function revengePuffed() {
  const c = revengeSide();
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const px = c.get(x, y);
      if (px === rgba(PAL.cloth3)) c.set(x, y, '#e8dca0');
      else if (px === rgba(PAL.cloth4)) c.set(x, y, '#f4eab8');
    }
  }
  return c;
}

/** A drunk shark floating belly-up, side view, with a bubble or two. */
function sharkBellySide(frame) {
  const c = new PixelCanvas(36, 16);
  c.ellipse(18, 10, 14, 4, '#d8dce4');
  c.ellipse(18, 8, 12, 2, '#eef0f4');
  c.poly([[4, 10], [0, 5], [0, 14]], FIN[1]);
  c.poly([[18, 13], [15, 16], [22, 13]], FIN[1]);
  c.set(29, 9, INK);
  c.set(30, 10, INK);
  c.outline(INK);
  const b = frame ? [[26, 3], [29, 0]] : [[27, 2], [24, 0]];
  for (const [x, y] of b) c.set(x, y, '#e8e070');
  return c;
}

/** Rings spreading on the water where something big went off. */
function ripple(frame) {
  const c = new PixelCanvas(90, 16);
  const r = 14 + frame * 14;
  for (let a = 0; a < Math.PI * 2; a += 0.03) {
    const x = Math.round(45 + Math.cos(a) * r);
    const y = Math.round(8 + Math.sin(a) * r * 0.16);
    c.set(x, y, frame > 1 ? '#c8e4f080' : '#e6f5f8');
  }
  return c;
}

/** Looking through a spyglass: black all round, a round view, a brass rim. */
function telescopeMask() {
  const c = new PixelCanvas(W, 224);
  const cx = 160;
  const cy = 108;
  const r = 92;
  for (let y = 0; y < 224; y++) {
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < r - 4) continue;
      if (d < r) c.set(x, y, d < r - 2 ? '#b57f22' : '#e0ad38');
      else if (d < r + 3) c.set(x, y, '#4a2e0c');
      else c.set(x, y, '#07060b');
    }
  }
  // lens glint
  c.line(96, 50, 104, 44, '#ffffff40');
  c.line(98, 53, 107, 46, '#ffffff30');
  return c;
}

export function buildVistaAtlas() {
  const atlas = new ShelfAtlas(1024, 1);
  for (const name of Object.keys(SKIES)) {
    atlas.add(`sky_${name}`, paintSky(name));
    atlas.add(`sea_${name}_0`, paintSea(name, 0));
    atlas.add(`sea_${name}_1`, paintSea(name, 1));
  }
  atlas.add('revenge_side', revengeSide());
  atlas.add('trail', trail());
  atlas.add('frigate_side', frigateSide());
  atlas.add('frigate_broken', frigateSide({ broken: true }));
  atlas.add('frigate_stern', frigateStern());
  atlas.add('sloop_side', sloopSide());
  atlas.add('tub_0', tubClose(0));
  atlas.add('tub_1', tubClose(1));
  atlas.add('tub_sag', tubClose(0, { sag: true }));
  atlas.add('rowboat_0', rowboatSide(0));
  atlas.add('rowboat_1', rowboatSide(1));
  atlas.add('rowboat_happy', rowboatSide(0, { happy: true }));
  for (let i = 0; i < 3; i++) atlas.add(`cloud_rise_${i}`, cloudRise(i));
  atlas.add('gull_0', gull(0));
  atlas.add('gull_1', gull(1));
  for (let i = 0; i < 3; i++) atlas.add(`fish_${i}`, fish(i));
  atlas.add('figurehead_ok', figurehead(false));
  atlas.add('figurehead_disgusted', figurehead(true));
  atlas.add('mask_telescope', telescopeMask());
  atlas.add('fin_side_0', finSide(0));
  atlas.add('fin_side_1', finSide(1));
  atlas.add('shark_leap', sharkLeap());
  atlas.add('rowboat_beans_0', rowboatBeans(0));
  atlas.add('rowboat_beans_1', rowboatBeans(1));
  atlas.add('rowboat_pan_0', rowboatBeans(0, { pan: true }));
  atlas.add('rowboat_pan_1', rowboatBeans(1, { pan: true }));
  atlas.add('revenge_puffed', revengePuffed());
  atlas.add('shark_belly_0', sharkBellySide(0));
  atlas.add('shark_belly_1', sharkBellySide(1));
  for (let i = 0; i < 3; i++) atlas.add(`ripple_${i}`, ripple(i));
  addPhase4VistaFrames(atlas);
  addSesVistaFrames(atlas);
  addPhase6VistaFrames(atlas);
  for (let i = 0; i < 3; i++) atlas.add(`cloud_garlic_${i}`, garlicCloud(cloudRise(i)));
  return atlas.build();
}

export const VISTA_SKIES = Object.keys(SKIES);
export const VISTA_FRAMES = [
  ...VISTA_SKIES.flatMap((n) => [`sky_${n}`, `sea_${n}_0`, `sea_${n}_1`]),
  'revenge_side', 'trail', 'frigate_side', 'frigate_broken', 'frigate_stern', 'sloop_side',
  'tub_0', 'tub_1', 'tub_sag', 'rowboat_0', 'rowboat_1', 'rowboat_happy',
  'cloud_rise_0', 'cloud_rise_1', 'cloud_rise_2', 'gull_0', 'gull_1', 'fish_0', 'fish_1', 'fish_2',
  'figurehead_ok', 'figurehead_disgusted', 'mask_telescope',
  'fin_side_0', 'fin_side_1', 'shark_leap', 'rowboat_beans_0', 'rowboat_beans_1', 'rowboat_pan_0', 'rowboat_pan_1',
  'revenge_puffed', 'shark_belly_0', 'shark_belly_1', 'ripple_0', 'ripple_1', 'ripple_2',
  ...PHASE4_VISTA_FRAMES,
  ...SES_VISTA_FRAMES,
  ...PHASE6_VISTA_FRAMES,
];
