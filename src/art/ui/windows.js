import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';

/**
 * Menu / dialogue window skins. Windows are painted at their exact size (no
 * 9-slice stretching), so borders stay pixel-perfect at any dimension.
 */
const STYLES = {
  // Navy lacquer with a brass frame: the default for menus and dialogue.
  default: {
    fill: [PAL.ui4, PAL.ui3, PAL.ui2, PAL.ui2, PAL.ui1, PAL.ui1],
    outer: PAL.black,
    hi: PAL.gold4,
    mid: PAL.gold2,
    lo: PAL.gold0,
    inner: PAL.ui0,
    rivet: true,
  },
  // Plain darker panel for sub-sections inside a window.
  inset: {
    fill: [PAL.ui1, PAL.ui1, PAL.ui0],
    outer: PAL.ui0,
    hi: PAL.ui3,
    mid: PAL.ui2,
    lo: PAL.ui0,
    inner: PAL.ui0,
    rivet: false,
    thin: true,
  },
  // Aged parchment for the quest log and notes.
  parchment: {
    fill: [PAL.cloth4, PAL.cloth3, PAL.cloth3, PAL.cloth2],
    outer: PAL.black,
    hi: PAL.wood4,
    mid: PAL.wood3,
    lo: PAL.wood1,
    inner: PAL.cloth1,
    rivet: false,
  },
  // Red-trimmed variant for warnings / battle alerts.
  alert: {
    fill: [PAL.red2, PAL.red1, PAL.red1, PAL.red0],
    outer: PAL.black,
    hi: PAL.gold4,
    mid: PAL.gold2,
    lo: PAL.gold0,
    inner: PAL.red0,
    rivet: true,
  },
};

export function windowStyles() {
  return Object.keys(STYLES);
}

export function paintWindow(w, h, styleName = 'default') {
  const s = STYLES[styleName] || STYLES.default;
  const c = new PixelCanvas(w, h);
  const b = s.thin ? 2 : 4;

  // Banded vertical gradient with a dithered seam between bands.
  const bands = s.fill.length;
  for (let y = 0; y < h; y++) {
    const t = (y / Math.max(1, h - 1)) * (bands - 1);
    const i = Math.floor(t);
    const frac = t - i;
    for (let x = 0; x < w; x++) {
      let idx = i;
      if (i < bands - 1 && frac > 0.6 && (x + y) % 2 === 0) idx = i + 1;
      c.set(x, y, s.fill[Math.min(bands - 1, idx)]);
    }
  }

  // Frame: outer dark line, bevelled brass, inner dark line.
  c.strokeRect(0, 0, w, h, s.outer);
  if (s.thin) {
    c.hline(1, w - 2, 1, s.hi);
    c.vline(1, 1, h - 2, s.hi);
    c.hline(1, w - 2, h - 2, s.lo);
    c.vline(w - 2, 1, h - 2, s.lo);
  } else {
    c.hline(1, w - 2, 1, s.hi);
    c.vline(1, 1, h - 2, s.hi);
    c.hline(1, w - 2, h - 2, s.lo);
    c.vline(w - 2, 1, h - 2, s.lo);
    c.strokeRect(2, 2, w - 4, h - 4, s.mid);
    c.strokeRect(3, 3, w - 6, h - 6, s.inner);
  }
  // Rounded outer corners.
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) c.set(x, y, 'transparent');

  if (s.rivet && w >= 24 && h >= 20) {
    for (const [x, y] of [[4, 4], [w - 7, 4], [4, h - 7], [w - 7, h - 7]]) {
      c.set(x + 1, y, s.hi);
      c.set(x, y + 1, s.hi);
      c.set(x + 1, y + 1, s.mid);
      c.set(x + 2, y + 1, s.lo);
      c.set(x + 1, y + 2, s.lo);
    }
  }
  void b;
  return c;
}

/** Soft dark rectangle used behind text on busy backgrounds. */
export function paintShade(w, h, alphaHex = 'b0') {
  const c = new PixelCanvas(w, h);
  c.rect(0, 0, w, h, `#07060c${alphaHex}`);
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) c.set(x, y, 'transparent');
  return c;
}
