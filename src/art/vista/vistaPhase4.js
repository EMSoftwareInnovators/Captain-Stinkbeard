import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';

/**
 * Vista art for Story Phase 4: the Revenge chewed a little more at each
 * look ("Ship smaller."), shark shadows under the surface, churning water
 * for the frenzy, a hammerhead ramming the hull, and the enormous yellow
 * wake the ship leaves all the way to the horizon (the advertising).
 *
 * Painted from the same shapes as the Phase 2 Revenge so the ship stays
 * recognisable; bites are cut out of the waterline and patched over.
 */
const INK = PAL.ink;
const FIN = ['#2e3a4c', '#4a5a70', '#8a9ab0'];
const FOAM = '#f0fbff';
const SPRAY = '#bfe6f2';
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

/** The Revenge from the side (sailing right), unoutlined so bites can be cut from it. */
function revengeBase() {
  const c = new PixelCanvas(150, 112);
  const hull = PAL.hull3;
  c.poly([[10, 84], [132, 82], [146, 70], [140, 98], [22, 102]], hull);
  c.poly([[12, 84], [130, 82], [127, 88], [16, 90]], PAL.hull4);
  c.poly([[4, 70], [36, 72], [34, 86], [8, 86]], hull);
  c.rect(8, 74, 22, 4, '#7a1826');
  for (let x = 38; x < 126; x += 11) c.rect(x, 92, 4, 3, '#1a1320');
  c.line(146, 70, 150, 60, PAL.hull2);
  for (const [x, top] of [[40, 12], [78, 2], [112, 18]]) c.rect(x, top, 3, 84 - top, PAL.hull1);
  const sail = (x, y, w, h) => {
    c.poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2 + 4, y + h], [x - w / 2 + 2, y + h]], PAL.cloth3);
    c.line(Math.round(x - w / 2), y, Math.round(x - w / 2 + 2), y + h, PAL.cloth1);
    c.hline(Math.round(x - w / 2), Math.round(x + w / 2), y, PAL.cloth4);
  };
  sail(41, 18, 34, 24); sail(41, 46, 40, 30);
  sail(79, 8, 38, 26); sail(79, 38, 46, 34);
  sail(113, 26, 28, 20); sail(113, 50, 32, 24);
  c.rect(79, 0, 14, 8, '#1a1320');
  c.set(84, 3, '#f4e8cc'); c.set(86, 3, '#f4e8cc'); c.rect(84, 5, 4, 2, '#f4e8cc');
  return c;
}

/** A bite out of the hull: a scalloped hole with tooth notches. */
function bite(c, cx, cy, r) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const d = Math.hypot((x - cx) / (r + 1), (y - cy) / r);
      const notch = (x + y) % 3 === 0 ? 0.12 : 0;
      if (d < 1 - notch) c.set(x, y, 'transparent');
    }
  }
}

/** A patch nailed over old damage: a pale board with nails. */
function patch(c, x, y, w, h, shade = '#9a6a44') {
  c.rect(x, y, w, h, shade);
  c.hline(x, x + w - 1, y, '#b88a5a');
  c.hline(x, x + w - 1, y + h - 1, PAL.hull2);
  c.set(x + 1, y + 1, '#c8c8d0');
  c.set(x + w - 2, y + 1, '#c8c8d0');
  c.set(x + 1, y + h - 2, '#c8c8d0');
  c.set(x + w - 2, y + h - 2, '#c8c8d0');
}

/** The Revenge after one, two or three rounds with the sharks. */
function revengeBitten(stage) {
  const c = revengeBase();
  // patches from before (and from before that)
  patch(c, 60, 90, 9, 6);
  if (stage >= 2) {
    patch(c, 96, 88, 10, 7, '#a87a50');
    patch(c, 99, 90, 6, 4, '#b88a5a');
  }
  const bites = [[48, 101, 4], [88, 100, 4]];
  if (stage >= 2) bites.push([70, 101, 5], [114, 97, 4], [30, 100, 3]);
  if (stage >= 3) bites.push([58, 99, 5], [100, 100, 5], [127, 98, 4], [40, 99, 4]);
  for (const [x, y, r] of bites) bite(c, x, y, r);
  if (stage >= 3) {
    // the stern rail is gone, and a chunk of the stern castle with it
    for (let x = 6; x < 20; x++) for (let y = 70; y < 74; y++) c.set(x, y, 'transparent');
    bite(c, 34, 80, 3);
    // a rope brace where the rail was
    c.line(8, 76, 22, 74, '#c8a870');
  }
  c.outline(INK);
  return c;
}

/** A shark's shadow under the surface, for the crowd below the fins. */
function sharkShadow(frame) {
  const c = new PixelCanvas(36, 12);
  const col = '#1c3448a0';
  c.ellipse(17, 6, 12, 3.5, col);
  const k = frame ? 1 : 0;
  c.poly([[5, 6], [0, 2 + k], [2, 6], [0, 10 - k]], col);
  c.poly([[16, 3], [20, 0], [22, 3]], col);
  c.poly([[14, 8], [18, 11], [20, 8]], col);
  return c;
}

/** Churning water where the frenzy is: foam, spray, thrashing. */
function churn(frame) {
  const c = new PixelCanvas(56, 20);
  const r = (n) => {
    const x = Math.sin((n + 1) * 12.9898 + frame * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 0; i < 26; i++) {
    const x = Math.round(r(i) * 52) + 2;
    const y = Math.round(10 + r(i + 40) * 8);
    const s = 1 + Math.round(r(i + 80) * 2);
    c.ellipse(x, y, s + 1, s * 0.6 + 0.5, i % 3 ? FOAM : SPRAY);
  }
  for (let i = 0; i < 8; i++) {
    const x = Math.round(r(i + 120) * 50) + 3;
    const top = Math.round(2 + r(i + 160) * 6);
    c.line(x, 12, x + (i % 2 ? 1 : -1), top, SPRAY);
    c.set(x, top - 1, FOAM);
  }
  // a tail and a fin in it all
  if (frame === 1) c.poly([[20, 12], [24, 4], [27, 12]], FIN[1]);
  if (frame === 2) c.poly([[34, 12], [30, 5], [32, 12], [30, 16]], FIN[0]);
  if (frame === 0) c.poly([[40, 12], [44, 6], [47, 12]], FIN[1]);
  return c;
}

/** A hammerhead rising to ram the hull (facing left, toward the ship). */
function hammerRam(frame) {
  const c = new PixelCanvas(48, 30);
  const y0 = frame ? 8 : 14;
  c.ellipse(26, y0 + 8, 14, 5, FIN[1]);
  c.ellipse(25, y0 + 10, 11, 2.5, '#d8dce4');
  c.poly([[26, y0 + 3], [30, y0 - 5], [32, y0 + 4]], FIN[0]);
  c.poly([[39, y0 + 8], [47, y0 + 2], [45, y0 + 8], [47, y0 + 15]], FIN[0]);
  // the hammer
  c.rect(8, y0 + 2, 5, 13, FIN[1]);
  c.rect(9, y0 + 3, 2, 11, FIN[2]);
  c.poly([[12, y0 + 6], [16, y0 + 5], [16, y0 + 11], [12, y0 + 10]], FIN[1]);
  c.set(8, y0 + 2, INK);
  c.set(8, y0 + 14, INK);
  c.outline(INK);
  for (let x = 0; x < 48; x += 3) if (!c.alphaAt(x, 27)) c.set(x, 27, x % 2 ? FOAM : SPRAY);
  if (frame) {
    for (const [x, y] of [[2, y0], [4, y0 + 5], [1, y0 + 10], [5, y0 - 3], [3, y0 + 14]]) c.set(x, y, FOAM);
  }
  return c;
}

/** The yellow wake, from the stern (bottom right) all the way to the horizon (top left). */
function yellowWake() {
  const w = 260;
  const h = 72;
  const c = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1); // 0 at the horizon, 1 at the stern
    const cx = 24 + t * (w - 70) + Math.sin(y * 0.22) * 3 * t;
    const half = 3 + t ** 1.4 * 42;
    for (let x = Math.floor(cx - half - 2); x <= cx + half + 2; x++) {
      const d = Math.abs(x - cx) / half;
      if (d > 1) continue;
      const density = (1 - d * d) * (0.6 + 0.4 * t);
      if (BAYER[y & 3][x & 3] / 16 >= density) continue;
      const curl = Math.sin(x * 0.3 + y * 0.5) > 0.7;
      c.set(x, y, curl ? '#f4e890c8' : (x + y) % 5 ? '#e8d060c0' : '#c8b048c0');
    }
  }
  return c;
}

export function addPhase4VistaFrames(atlas) {
  for (const s of [1, 2, 3]) atlas.add(`revenge_bitten_${s}`, revengeBitten(s));
  for (const f of [0, 1]) {
    atlas.add(`shark_shadow_${f}`, sharkShadow(f));
    atlas.add(`hammer_ram_${f}`, hammerRam(f));
  }
  for (const f of [0, 1, 2]) atlas.add(`churn_${f}`, churn(f));
  atlas.add('yellow_wake', yellowWake());
}

export const PHASE4_VISTA_FRAMES = [
  'revenge_bitten_1', 'revenge_bitten_2', 'revenge_bitten_3', 'shark_shadow_0', 'shark_shadow_1',
  'hammer_ram_0', 'hammer_ram_1', 'churn_0', 'churn_1', 'churn_2', 'yellow_wake',
];
