import { PixelCanvas } from '../PixelCanvas.js';
import { PAL, rgba } from '../palette.js';
import { drawText, textWidth } from '../font/drawText.js';

/**
 * Story Phase 4 close-ups: the Grand Stenchmaster's Stench Forecasts, drawn
 * in crayon on pages torn from the galley order book (they are meant to look
 * like a child made them), the Frog Grog after a week of "developing
 * complexity", the captain's list of beard remedies, the bell protocol by
 * the bell and the patch labels on the hull.
 *
 * Crayon strokes are two pixels wide with waxy gaps; the lettering is the
 * game's own pixel font with a wobble, so it always stays legible.
 */
const INK = PAL.ink;
const C = {
  yellow: '#f2c81e', yellowD: '#d8a410', blue: '#2f64d0', blueL: '#6a96ea', red: '#d8322a', green: '#3a9a3a',
  black: '#2c2a34', brown: '#8a5426', tan: '#e2bc7e', orange: '#f0822a', purple: '#8a48b8', pink: '#e87aa8',
  grey: '#7a8494', greyL: '#b4bcc8', white: '#fbf8f0', cream: '#f0e2b8',
};
const PAPER = '#f7efdc';
const PAPER_D = '#eadfc4';
const RULE = '#d4dcee';
const MARGIN = '#f0b8b8';

function rng(seed) {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

/** A page torn from the galley's order book: ruled lines, a red margin, a ragged top. */
function orderPage(w, h, seed) {
  const c = new PixelCanvas(w, h);
  const r = rng(seed);
  const left = (y) => 1 + (r() < 0.2 ? 1 : 0) + (y % 37 < 2 ? 1 : 0);
  for (let y = 2; y < h - 1; y++) {
    const x0 = left(y);
    const x1 = w - 2 - (r() < 0.15 ? 1 : 0);
    c.hline(x0, x1, y, PAPER);
  }
  // the torn perforation along the top
  for (let x = 2; x < w - 2; x++) c.set(x, x % 5 < 3 ? 1 : 2, PAPER);
  for (let y = 16; y < h - 4; y += 12) c.hline(3, w - 4, y, RULE);
  c.vline(14, 4, h - 3, MARGIN);
  for (let i = 0; i < (w * h) / 70; i++) {
    const x = Math.floor(r() * w);
    const y = Math.floor(r() * h);
    if (c.alphaAt(x, y)) c.set(x, y, PAPER_D);
  }
  // a folded corner, bottom right
  c.poly([[w - 12, h], [w, h - 12], [w, h]], 'transparent');
  c.poly([[w - 12, h - 2], [w - 2, h - 12], [w - 12, h - 12]], PAPER_D);
  c.line(w - 12, h - 2, w - 2, h - 12, '#c8bc9e');
  return c;
}

/** A crayon: waxy strokes that skip a little, and wobbly lettering. */
class Crayon {
  constructor(c, seed = 1) {
    this.c = c;
    this.r = rng(seed);
  }

  dot(x, y, col, w = 2) {
    const px = Math.round(x);
    const py = Math.round(y);
    for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) if (this.r() < 0.84) this.c.set(px + i, py + j, col);
  }

  line(x0, y0, x1, y1, col, w = 2) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let k = 0; k <= n; k++) this.dot(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, col, w);
  }

  path(pts, col, w = 2) {
    for (let i = 1; i < pts.length; i++) this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col, w);
  }

  loop(pts, col, w = 2) {
    this.path([...pts, pts[0]], col, w);
  }

  /** A hand-drawn ring that overshoots its start, like a real scribbled circle. */
  ring(cx, cy, rx, ry, col, w = 2, turns = 1.1) {
    const n = Math.max(14, Math.round((rx + ry) * 1.8));
    const a0 = this.r() * 6.283;
    const pts = [];
    for (let k = 0; k <= n * turns; k++) {
      const a = a0 + (k / n) * 6.283;
      const wob = 1 + (this.r() - 0.5) * 0.1;
      pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]);
    }
    this.path(pts, col, w);
  }

  /** Back-and-forth colouring-in over an ellipse (the Center, as Garrick sees it). */
  scribble(cx, cy, rx, ry, col, { step = 3, w = 2, slant = 0.3, rough = 0.25 } = {}) {
    let prev = null;
    let flip = false;
    for (let dy = -ry; dy <= ry; dy += step) {
      const t = dy / ry;
      const half = rx * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - rough / 2 + this.r() * rough);
      const y = cy + dy;
      const a = [cx - half, y + slant * half * 0.4];
      const b = [cx + half, y - slant * half * 0.4];
      const [p, q] = flip ? [b, a] : [a, b];
      if (prev) this.line(prev[0], prev[1], p[0], p[1], col, w);
      this.line(p[0], p[1], q[0], q[1], col, w);
      prev = q;
      flip = !flip;
    }
  }

  arrow(x0, y0, x1, y1, col, w = 2) {
    this.line(x0, y0, x1, y1, col, w);
    const a = Math.atan2(y1 - y0, x1 - x0);
    for (const s of [-1, 1]) this.line(x1, y1, x1 - Math.cos(a + s * 0.6) * 6, y1 - Math.sin(a + s * 0.6) * 6, col, w);
  }

  /** A circular arrow going round (cx, cy). */
  roundArrow(cx, cy, r, col, { from = 0.4, to = 5.6, w = 2 } = {}) {
    const pts = [];
    for (let a = from; a <= to; a += 0.12) pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8]);
    this.path(pts, col, w);
    const [x1, y1] = pts[pts.length - 1];
    const [x0, y0] = pts[pts.length - 3];
    this.arrow(x0, y0, x1, y1, col, w);
  }

  zigzag(x0, x1, y, col = C.blue, { amp = 2, period = 6, w = 1 } = {}) {
    const pts = [];
    for (let x = x0, up = true; x <= x1; x += period / 2, up = !up) pts.push([x, y + (up ? -amp : amp)]);
    this.path(pts, col, w);
  }

  /** Crayon lettering; `bold` goes over it twice. Returns the right edge. */
  text(s, x, y, col, { center = false, scale = 1, bold = false, jitter = 1, seed = 5 } = {}) {
    const spacing = bold ? 2 : 1;
    const opts = { center, scale, spacing, jitter, seed };
    const end = drawText(this.c, s, x, y, col, opts);
    if (bold) drawText(this.c, s, x + 1, y, col, opts);
    return end + (bold ? 1 : 0);
  }

  /** Lettering over the sea: the waves stop where the words are. */
  label(s, x, y, col, opts = {}) {
    const w = this.width(s, opts);
    const x0 = opts.center ? Math.round(x - w / 2) : x;
    const h = 9 * (opts.scale ?? 1);
    const wave = rgba(C.blue);
    for (let yy = y - 3; yy < y + h + 1; yy++) {
      for (let xx = x0 - 2; xx < x0 + w + 2; xx++) {
        if (this.c.get(xx, yy) === wave) this.c.set(xx, yy, yy >= 16 && (yy - 16) % 12 === 0 ? RULE : PAPER);
      }
    }
    return this.text(s, x, y, col, opts);
  }

  width(s, { scale = 1, bold = false } = {}) {
    return textWidth(s, { scale, spacing: bold ? 2 : 1 }) + (bold ? 1 : 0);
  }

  x(cx, cy, s, col) {
    this.line(cx - s, cy - s, cx + s, cy + s, col, 2);
    this.line(cx + s, cy - s, cx - s, cy + s, col, 2);
  }

  spiral(cx, cy, r, col) {
    const pts = [];
    for (let a = 0; a < 6.283 * 2.6; a += 0.2) pts.push([cx + Math.cos(a) * (a / 16) * r, cy + Math.sin(a) * (a / 16) * r]);
    this.path(pts, col, 1);
  }
}

// --- doodles ------------------------------------------------------------------

/** The Queen Anne's Revenge from above, as Garrick imagines it. Returns handy points. */
function shipFromAbove(k, x, y, w, h, { fill = C.tan } = {}) {
  const pts = [
    [x, y + h * 0.18], [x + w * 0.6, y], [x + w * 0.84, y + h * 0.14], [x + w, y + h / 2],
    [x + w * 0.84, y + h * 0.86], [x + w * 0.6, y + h], [x, y + h * 0.82],
  ];
  k.c.poly(pts, fill);
  // colouring-in that misses the edges
  for (let yy = y + 6; yy < y + h - 4; yy += 5) k.line(x + 6, yy, x + w * 0.8, yy - 2, '#d0a468', 1);
  k.loop(pts, C.brown, 2);
  // three masts: circles with a crossbar
  for (const f of [0.34, 0.56, 0.76]) {
    const mx = x + w * f;
    const my = y + h / 2;
    k.ring(mx, my, 3, 3, C.brown, 1, 1);
    k.line(mx, my - 9, mx, my + 9, C.brown, 1);
  }
  return { bow: [x + w, y + h / 2], stern: [x, y + h / 2] };
}

/** Garrick's weather symbol: a garlic bulb that has, by accident, become a chicken. */
function garlicChicken(k, cx, cy, { rays = true } = {}) {
  if (rays) {
    for (let a = 0; a < 6.28; a += 0.785) k.line(cx + Math.cos(a) * 12, cy + Math.sin(a) * 11, cx + Math.cos(a) * 16, cy + Math.sin(a) * 15, C.yellow, 1);
  }
  k.c.ellipse(cx, cy + 1, 8, 7, C.white);
  k.c.poly([[cx - 3, cy - 5], [cx, cy - 11], [cx + 3, cy - 5]], C.white);
  k.ring(cx, cy + 1, 8, 7, C.black, 1, 1);
  k.line(cx - 3, cy - 5, cx, cy - 11, C.black, 1);
  k.line(cx, cy - 11, cx + 3, cy - 5, C.black, 1);
  // cloves
  k.line(cx - 3, cy - 3, cx - 4, cy + 6, C.purple, 1);
  k.line(cx + 2, cy - 3, cx + 3, cy + 6, C.purple, 1);
  // ...and the chicken: comb, beak, eye, legs
  k.c.set(cx - 1, cy - 12, C.red); k.c.set(cx, cy - 13, C.red); k.c.set(cx + 1, cy - 12, C.red); k.c.set(cx + 2, cy - 13, C.red);
  k.c.poly([[cx + 8, cy - 1], [cx + 12, cy + 1], [cx + 8, cy + 2]], C.orange);
  k.c.set(cx + 5, cy - 1, C.black);
  k.line(cx - 2, cy + 8, cx - 3, cy + 12, C.orange, 1);
  k.line(cx + 3, cy + 8, cx + 4, cy + 12, C.orange, 1);
}

function shark(k, x, y, { crown = false, flip = false, s = 1 } = {}) {
  const f = (dx) => x + (flip ? -dx : dx) * s;
  const g = (dy) => y + dy * s;
  const body = [[f(0), g(4)], [f(8), g(0)], [f(20), g(1)], [f(28), g(5)], [f(20), g(9)], [f(8), g(9)]];
  k.c.poly(body, C.greyL);
  k.loop(body, C.grey, 1);
  k.c.poly([[f(12), g(0)], [f(15), g(-6)], [f(17), g(1)]], C.grey);
  k.c.poly([[f(0), g(4)], [f(-6), g(-1)], [f(-4), g(5)], [f(-6), g(10)]], C.grey);
  k.c.set(f(23), g(3), C.black);
  // a grin full of teeth
  for (let i = 0; i < 4; i++) {
    k.c.set(f(18 + i * 2), g(6), C.black);
    k.c.set(f(19 + i * 2), g(7), C.white);
  }
  if (crown) {
    const cx = f(22);
    const pts = [[cx - 5, g(-1)], [cx - 5, g(-6)], [cx - 3, g(-3)], [cx, g(-7)], [cx + 3, g(-3)], [cx + 5, g(-6)], [cx + 5, g(-1)]];
    k.c.poly(pts, C.yellow);
    k.loop(pts, C.yellowD, 1);
    k.c.set(cx, g(-3), C.red);
  }
}

function fin(k, x, y, col = C.grey) {
  k.c.poly([[x, y], [x + 4, y - 7], [x + 7, y]], col);
  k.line(x - 3, y + 1, x + 10, y + 1, C.blueL, 1);
}

function pot(k, x, y) {
  k.c.poly([[x, y], [x + 12, y], [x + 10, y + 8], [x + 2, y + 8]], C.black);
  k.line(x - 2, y + 1, x + 14, y + 1, C.black, 1);
  for (const dx of [3, 7]) k.path([[x + dx, y - 2], [x + dx - 1, y - 4], [x + dx + 1, y - 6], [x + dx, y - 8]], C.greyL, 1);
}

function cannon(k, x, y) {
  k.c.ellipse(x, y, 3, 3, C.black);
  k.line(x + 2, y - 1, x + 8, y - 3, C.black, 2);
}

function bed(k, x, y) {
  k.c.rect(x, y, 14, 7, C.blueL);
  k.c.rect(x + 1, y + 1, 4, 5, C.white);
  k.loop([[x, y], [x + 14, y], [x + 14, y + 7], [x, y + 7]], C.blue, 1);
  k.text('z', x + 15, y - 7, C.blue, { jitter: 0 });
  k.text('z', x + 19, y - 11, C.blue, { jitter: 0 });
}

function tub(k, x, y) {
  k.c.ellipse(x + 7, y + 4, 8, 4, C.white);
  k.ring(x + 7, y + 4, 8, 4, C.blue, 1, 1);
  k.line(x + 1, y + 8, x, y + 11, C.black, 1);
  k.line(x + 13, y + 8, x + 14, y + 11, C.black, 1);
}

function clock(k, cx, cy) {
  k.c.ellipse(cx, cy, 6, 6, C.white);
  k.ring(cx, cy, 6, 6, C.black, 1, 1);
  k.line(cx, cy, cx, cy - 4, C.black, 1);
  k.line(cx, cy, cx + 3, cy + 1, C.black, 1);
}

function wheel(k, cx, cy) {
  k.ring(cx, cy, 7, 7, C.brown, 2, 1);
  for (let a = 0; a < 3.14; a += 0.785) k.line(cx - Math.cos(a) * 10, cy - Math.sin(a) * 10, cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, C.brown, 1);
}

function sausage(k, x, y, w = 30) {
  const pts = [];
  for (let a = 1.57; a <= 4.72; a += 0.3) pts.push([x + 5 + Math.cos(a) * 5, y + 5 + Math.sin(a) * 5]);
  for (let a = -1.57; a <= 1.57; a += 0.3) pts.push([x + w - 5 + Math.cos(a) * 5, y + 5 + Math.sin(a) * 5]);
  k.c.poly(pts, '#c8704a');
  k.loop(pts, '#7a3a22', 1);
  k.line(x + 6, y + 3, x + w - 8, y + 3, '#e89a70', 1);
  k.line(x - 3, y + 5, x, y + 5, '#7a3a22', 1);
  k.line(x + w, y + 5, x + w + 3, y + 5, '#7a3a22', 1);
  // it smells, apparently
  for (const dx of [6, 14, 22]) k.path([[x + dx, y - 2], [x + dx - 2, y - 5], [x + dx, y - 8], [x + dx - 2, y - 11]], C.green, 1);
}

function skull(k, cx, cy) {
  k.c.ellipse(cx, cy, 5, 4.5, C.white);
  k.c.rect(cx - 3, cy + 3, 7, 3, C.white);
  k.ring(cx, cy, 5, 4.5, C.black, 1, 1);
  k.c.rect(cx - 3, cy - 1, 2, 2, C.black);
  k.c.rect(cx + 2, cy - 1, 2, 2, C.black);
  k.c.set(cx, cy + 2, C.black);
  for (let i = -2; i <= 3; i += 2) k.c.set(cx + i, cy + 5, C.black);
}

function sandwich(k, x, y) {
  k.c.poly([[x, y + 6], [x + 9, y], [x + 18, y + 6]], '#e0a860');
  k.path([[x, y + 7], [x + 3, y + 9], [x + 6, y + 7], [x + 9, y + 9], [x + 12, y + 7], [x + 15, y + 9], [x + 18, y + 7]], C.green, 1);
  k.c.rect(x + 1, y + 9, 17, 2, C.red);
  k.c.rect(x, y + 11, 19, 3, '#e0a860');
  k.loop([[x, y + 6], [x + 9, y], [x + 18, y + 6]], C.brown, 1);
  k.loop([[x, y + 11], [x + 18, y + 11], [x + 18, y + 14], [x, y + 14]], C.brown, 1);
}

function house(k, x, y) {
  k.c.rect(x, y + 8, 18, 12, '#b0703a');
  k.c.poly([[x - 3, y + 9], [x + 9, y], [x + 21, y + 9]], C.red);
  k.c.rect(x + 7, y + 13, 4, 7, C.black);
  k.c.rect(x + 13, y + 11, 3, 3, C.yellow);
  k.loop([[x, y + 8], [x + 18, y + 8], [x + 18, y + 20], [x, y + 20]], C.brown, 1);
  // stink lines from the chimney, which is really the beard
  for (const dx of [4, 10, 16]) k.path([[x + dx, y - 2], [x + dx + 2, y - 5], [x + dx, y - 8], [x + dx + 2, y - 11]], C.green, 1);
}

function stickFolk(k, x, y, n, cols = [C.black, C.red, C.blue]) {
  for (let i = 0; i < n; i++) {
    const px = x + i * 6;
    const col = cols[i % cols.length];
    k.c.ellipse(px, y, 1.5, 1.5, col);
    k.line(px, y + 2, px, y + 6, col, 1);
    k.line(px - 2, y + 3, px + 2, y + 3, col, 1);
    k.line(px, y + 6, px - 2, y + 9, col, 1);
    k.line(px, y + 6, px + 2, y + 9, col, 1);
  }
}

function tally(k, x, y, n, col = C.black) {
  for (let i = 0; i < n; i++) {
    const g = Math.floor(i / 5);
    const j = i % 5;
    const gx = x + g * 12;
    if (j < 4) k.line(gx + j * 2, y, gx + j * 2, y + 7, col, 1);
    else k.line(gx - 1, y + 6, gx + 8, y + 1, col, 1);
  }
}

/** The "(correction)" joke: strike out a word and write another above it. */
function amend(k, before, word, after, cx, y, { col = C.black, fix, fixCol = C.purple, bold = true } = {}) {
  const full = `${before}${word}${after}`;
  const w = k.width(full, { bold });
  const x0 = Math.round(cx - w / 2);
  const wx = x0 + (before ? k.width(before, { bold }) + (bold ? 1 : 2) : 0);
  const ww = k.width(word, { bold });
  k.text(full, x0, y, col, { bold });
  k.line(wx - 1, y + 4, wx + ww + 1, y + 3, C.red, 1);
  k.line(wx - 1, y + 5, wx + ww + 1, y + 4, C.red, 1);
  if (fix) k.text(fix, wx + ww / 2, y - 9, fixCol, { center: true, bold: false });
}

function heading(k, text, cx, y, col = C.black) {
  k.text(text, cx, y, col, { center: true, bold: true });
}

// --- the forecasts ----------------------------------------------------------

const FW = 240;
const FH = 150;

function seaBands(k, rows, { from = 18, to = FW - 6 } = {}) {
  for (const y of rows) k.zigzag(from, to, y, C.blue, { amp: 2, period: 8 });
}

/** Day 1: the first one. Wrong almost immediately. */
function forecastDay1() {
  const c = orderPage(FW, FH, 21);
  const k = new Crayon(c, 101);
  amend(k, "TODAY'S ", 'FART', ' FORECAST', 116, 14, { fix: 'STENCH' });
  seaBands(k, [30, 116, 126, 136, 144]);
  shipFromAbove(k, 34, 40, 164, 66);
  // the enormous yellow thing behind the breakfast table, unlabelled
  k.scribble(58, 74, 34, 27, C.yellow, { step: 3 });
  k.scribble(56, 73, 26, 20, C.yellowD, { step: 5, slant: -0.4 });
  k.ring(58, 74, 35, 28, C.yellowD, 1, 1.05);
  // breakfast: a table, some folk, "US"
  k.c.rect(98, 74, 18, 5, C.brown);
  stickFolk(k, 100, 64, 3);
  k.text('US', 107, 53, C.black, { center: true });
  // the rooms, with percentages that should not be trusted
  pot(k, 140, 56);
  k.text('GALLEY', 147, 67, C.black, { center: true });
  k.text('40%', 158, 52, C.red, { bold: true });
  cannon(k, 118, 96);
  cannon(k, 140, 98);
  k.label('CANNONS 60%', 100, 110, C.black);
  k.label('(NOON)', 172, 110, C.red);
  bed(k, 170, 70);
  k.label('LATER?', 200, 99, C.blue);
  k.label('BEDS', 204, 89, C.blue);
  k.arrow(206, 88, 188, 78, C.blue);
  // the headline
  k.label('BAD HERE', 18, 121, C.red, { bold: true });
  k.label('probably', 22, 131, C.black, { jitter: 0 });
  k.arrow(56, 118, 76, 106, C.red);
  // far too many arrows, disagreeing
  k.arrow(118, 44, 140, 32, C.green);
  k.arrow(96, 34, 70, 38, C.orange);
  k.arrow(222, 66, 222, 44, C.purple);
  k.arrow(230, 42, 230, 64, C.green);
  k.arrow(92, 144, 118, 132, C.orange);
  // and a danger X somewhere in the sea, a spiral, a shark
  k.x(18, 104, 4, C.red);
  k.spiral(222, 118, 9, C.purple);
  shark(k, 130, 126, { flip: false });
  garlicChicken(k, 218, 20);
  return outlined(c);
}

/** Day 2: the galley or the quarters. Or both. The washroom: fifteen minutes. */
function forecastDay2() {
  const c = orderPage(FW, FH, 33);
  const k = new Crayon(c, 202);
  heading(k, "TODAY'S STENCH FORECAST", 116, 12);
  k.text('DAY 2', 24, 26, C.purple, { bold: true });
  k.ring(38, 29, 20, 8, C.purple, 1);
  seaBands(k, [116, 128, 140]);
  shipFromAbove(k, 30, 40, 170, 66);
  // two blobs, joined by arrows going both ways
  k.scribble(140, 62, 20, 15, C.yellow);
  k.scribble(176, 80, 16, 13, C.yellow, { slant: -0.3 });
  pot(k, 134, 58);
  bed(k, 168, 78);
  k.text('GALLEY 50%', 110, 28, C.black);
  k.arrow(130, 37, 136, 47, C.black);
  k.label('BEDS 50%', 170, 108, C.black);
  k.label('(OR BOTH)', 178, 118, C.red);
  k.arrow(156, 66, 166, 74, C.orange);
  k.arrow(164, 86, 152, 76, C.green);
  k.text('LUNCH?', 168, 46, C.brown);
  // the washroom, with a clock
  tub(k, 60, 60);
  k.text('WASHROOM', 58, 76, C.black);
  clock(k, 90, 58);
  k.text('15 MINS', 58, 86, C.red, { bold: true });
  k.arrow(56, 118, 70, 100, C.blue);
  k.label('NOT HERE', 22, 122, C.blue);
  k.x(212, 132, 3, C.red);
  shark(k, 108, 132, { s: 0.8 });
  garlicChicken(k, 218, 22, { rays: false });
  return outlined(c);
}

/** Day 3: variable atmospheric sausage. */
function forecastDay3() {
  const c = orderPage(FW, FH, 45);
  const k = new Crayon(c, 303);
  heading(k, "TODAY'S STENCH FORECAST", 116, 12);
  k.text('DAY 3', 24, 26, C.purple, { bold: true });
  seaBands(k, [118, 130, 142]);
  shipFromAbove(k, 30, 46, 164, 62);
  // the helm, and a Center that goes round and round it
  k.scribble(66, 77, 22, 17, C.yellow);
  wheel(k, 64, 77);
  k.roundArrow(66, 77, 28, C.purple);
  k.label('WHEEL: NO', 40, 111, C.black);
  // the atmospheric sausage, which is science
  sausage(k, 92, 30, 32);
  k.text('ATMOSPHERIC', 132, 25, C.brown);
  k.text('SAUSAGE', 132, 34, C.brown);
  k.text('(VARIABLE)', 132, 43, C.red);
  k.arrow(104, 42, 88, 62, C.orange);
  k.label('WILL MOVE SOON', 112, 121, C.black);
  k.label('(I SAID SO HOURS AGO)', 100, 131, C.red);
  // a compass that has opinions
  k.ring(214, 116, 9, 9, C.black, 1);
  k.label('N', 212, 101, C.black, { jitter: 0 });
  k.label('N?', 226, 113, C.black, { jitter: 0 });
  k.label('S', 212, 127, C.black, { jitter: 0 });
  k.label('W', 197, 113, C.black, { jitter: 0 });
  k.arrow(214, 116, 208, 110, C.red, 1);
  k.spiral(24, 128, 8, C.purple);
  garlicChicken(k, 218, 22, { rays: true });
  return outlined(c);
}

/** Day 7: sharks. Updated in a different crayon during the sharks. */
function forecastDay4() {
  const c = orderPage(FW, FH, 57);
  const k = new Crayon(c, 404);
  heading(k, "TODAY'S STENCH FORECAST", 116, 12);
  k.text('DAY 7', 24, 26, C.purple, { bold: true });
  seaBands(k, [34, 116, 128, 140]);
  shipFromAbove(k, 44, 44, 150, 60);
  // the morning's prediction
  k.label('SHARKS', 120, 112, C.grey, { bold: true, scale: 2, center: true });
  // then, in a hurry, the updates
  const fins = [[26, 50], [22, 76], [30, 96], [204, 52], [212, 70], [206, 92], [220, 104], [16, 110], [88, 30], [60, 40], [150, 40], [178, 36], [44, 112], [172, 110], [36, 132], [204, 136]];
  for (const [x, y] of fins) fin(k, x, y);
  // the Center at the waterline, and the crunching
  k.scribble(104, 100, 26, 10, C.yellow, { slant: 0.1 });
  for (const [x, y] of [[84, 106], [98, 108], [112, 108], [126, 106]]) {
    k.path([[x - 3, y], [x, y + 4], [x + 3, y], [x + 6, y + 4]], C.red, 1);
  }
  k.text('CRUNCH', 138, 92, C.red);
  k.label('UPDATE: MORE', 98, 25, C.orange);
  k.label('UPDATE:', 22, 136, C.orange);
  k.label('HUNDREDS?', 68, 136, C.red, { bold: true });
  tally(k, 154, 134, 14, C.black);
  k.text('EXCELLENT RESPONSE', 66, 58, C.green);
  k.text('★', 176, 58, C.yellowD, { jitter: 0 });
  garlicChicken(k, 218, 20, { rays: false });
  return outlined(c);
}

/** The worst one yet: six skulls, a crowned shark, a sandwich, Stinkbeard House. */
function forecastWorst() {
  const c = orderPage(FW, FH, 69);
  const k = new Crayon(c, 505);
  heading(k, 'FORECAST (REVISED)', 116, 12);
  seaBands(k, [30, 118, 130, 142]);
  shipFromAbove(k, 34, 40, 166, 68);
  // a massive yellow blob
  k.scribble(124, 74, 56, 30, C.yellow);
  k.scribble(126, 72, 42, 20, C.yellowD, { step: 4, slant: -0.4 });
  k.ring(124, 74, 57, 31, C.yellowD, 1, 1.05);
  // the captain's cabin, the galley (a sandwich), and six skulls
  house(k, 42, 62);
  k.label('STINKBEARD', 18, 114, C.black);
  k.label('HOUSE', 28, 124, C.black);
  k.arrow(40, 112, 48, 88, C.black, 1);
  sandwich(k, 150, 58);
  for (const [x, y] of [[92, 56], [110, 90], [130, 50], [176, 86], [194, 60], [214, 124]]) skull(k, x, y);
  // the king of the sharks
  shark(k, 112, 126, { crown: true });
  shark(k, 186, 108, { flip: true, s: 0.7 });
  // arrows everywhere, some pointing at each other
  k.arrow(18, 44, 36, 58, C.red);
  k.arrow(214, 36, 196, 48, C.green);
  k.arrow(150, 26, 128, 36, C.orange);
  k.arrow(98, 34, 124, 38, C.purple);
  k.arrow(170, 142, 150, 132, C.red);
  k.arrow(214, 96, 214, 78, C.orange);
  k.arrow(214, 60, 214, 76, C.green);
  k.label('?', 76, 110, C.red, { bold: true, scale: 2 });
  k.text('!!', 138, 94, C.red, { bold: true });
  k.x(64, 140, 4, C.red);
  k.spiral(226, 138, 7, C.purple);
  garlicChicken(k, 222, 18, { rays: false });
  return outlined(c);
}

/** Tomorrow: one giant yellow scribble, "VERY BAD", 70% (or, after a moment's thought, 700%). */
function forecastTomorrow(extraZero = false) {
  const c = orderPage(FW, FH, 81);
  const k = new Crayon(c, 606);
  heading(k, "TOMORROW'S FORECAST", 116, 12);
  seaBands(k, [30, 124, 136]);
  shipFromAbove(k, 30, 44, 150, 60);
  // the scribble covers the ship, the sea next to it, and nearly everything else
  k.scribble(100, 74, 84, 38, C.yellow, { step: 3, rough: 0.3 });
  k.scribble(98, 72, 66, 28, C.yellowD, { step: 5, slant: -0.5 });
  // (the bow and a mast poke out of it)
  k.line(176, 74, 181, 74, C.brown, 2);
  k.line(122, 30, 122, 38, C.brown, 1);
  // the number, with room to squeeze in another zero
  const x = 176;
  const y = 50;
  k.text('70', x, y, C.black, { bold: true, scale: 3, jitter: 0 });
  k.text('%', x + 44, y, C.black, { bold: true, scale: 3, jitter: 0 });
  if (extraZero) {
    k.text('0', x + 36, y - 6, C.red, { bold: true, scale: 2, jitter: 0 });
    k.path([[x + 34, y + 24], [x + 38, y + 20], [x + 42, y + 24]], C.red, 1);
  }
  k.text('CHANCE', 204, 78, C.black, { center: true });
  k.text('OF STINK', 204, 88, C.black, { center: true });
  const vb = k.width('VERY BAD', { bold: true });
  k.label('VERY BAD', 224 - vb, 128, C.red, { bold: true, jitter: 0 });
  garlicChicken(k, 28, 128, { rays: true });
  return outlined(c);
}

function outlined(c) {
  c.outline(INK);
  return c;
}

// --- other close-ups ------------------------------------------------------------

/** A mug of Frog Grog, a week on: a greasy film, a bubble, lumps. Optionally with a forecast in it. */
function grogClose(withForecast = false) {
  const c = new PixelCanvas(160, 118);
  // table
  c.rect(0, 92, 160, 26, '#6a4428');
  for (let x = 0; x < 160; x += 23) c.vline(x, 92, 117, '#54341e');
  c.hline(0, 159, 92, '#8a5c38');
  // the mug: pewter, seen from a little above
  c.rect(34, 30, 84, 70, '#8a8a9a');
  c.rect(34, 30, 8, 70, '#b0b0c0');
  c.rect(108, 30, 10, 70, '#6a6a7a');
  c.ellipse(76, 100, 42, 8, '#6a6a7a');
  c.rect(118, 44, 18, 8, '#6a6a7a');
  c.rect(130, 44, 8, 38, '#6a6a7a');
  c.rect(118, 74, 18, 8, '#6a6a7a');
  // the grog
  c.ellipse(76, 30, 42, 12, '#9a9aaa');
  c.ellipse(76, 31, 38, 10, '#5a7a26');
  c.ellipse(76, 32, 34, 8, '#6e8e30');
  // a greasy film with a rainbow in it
  const film = ['#a8c050', '#c8b860', '#a890c0', '#80b0b0'];
  for (let i = 0; i < 4; i++) {
    for (let a = 0; a < 3.2; a += 0.08) {
      const x = 70 + Math.cos(a + i * 0.6) * (10 + i * 5);
      const y = 32 + Math.sin(a + i * 0.6) * (3 + i * 1.2);
      c.set(Math.round(x), Math.round(y), film[i]);
    }
  }
  // lumps
  c.ellipse(52, 34, 3.5, 2, '#44601a');
  c.set(51, 33, '#8aa840');
  c.ellipse(90, 36, 3, 1.6, '#44601a');
  c.set(89, 35, '#8aa840');
  c.ellipse(100, 29, 2.5, 1.4, '#44601a');
  // a bubble, rising (maturity)
  c.ellipse(100, 33, 5, 4, '#b8d870');
  c.ellipse(100, 33, 4, 3, '#8aac40');
  c.set(98, 31, '#f0f8d0');
  c.set(99, 31, '#f0f8d0');
  if (withForecast) {
    // a crumpled forecast, bobbing
    c.ellipse(62, 28, 11, 7, '#f0e6c8');
    c.ellipse(60, 27, 7, 4, '#f8f0dc');
    for (const [x, y, col] of [[56, 26, C.yellow], [57, 27, C.yellow], [58, 26, C.yellow], [66, 30, C.blue], [67, 29, C.blue], [63, 24, C.red], [54, 30, '#d8ccb0'], [68, 26, '#d8ccb0']]) c.set(x, y, col);
    c.line(52, 32, 58, 34, '#8aa840');
    c.line(66, 34, 72, 33, '#8aa840');
  }
  c.outline(INK);
  return c;
}

/** The captain's list of beard remedies, with a note added in crayon. */
function beardRemedies() {
  const c = new PixelCanvas(210, 142);
  c.rect(1, 1, 208, 140, PAL.cloth4);
  for (let y = 1; y < 141; y++) for (let x = 1; x < 209; x++) if ((x * 11 + y * 17) % 31 === 0) c.set(x, y, PAL.cloth3);
  drawText(c, 'BEARD REMEDIES', 105, 7, PAL.red2, { center: true });
  drawText(c, '(TRIED)', 105, 17, INK, { center: true });
  c.hline(12, 198, 27, PAL.cloth1);
  const rows = [
    ['SEAWATER', 'NO'], ['SOAP', 'NO'], ['LEMONS', 'NO. EYES.'], ['VINEGAR', 'NO. WORSE.'],
    ['SAND', 'NO. OW.'], ['SMOKE', 'NO. SMOKY AND WORSE.'], ['HERBS', 'NO. HERBAL AND WORSE.'],
  ];
  rows.forEach(([what, res], i) => {
    const y = 32 + i * 11;
    const end = drawText(c, what, 14, y, INK);
    c.line(12, y + 4, end + 2, y + 3, INK);
    drawText(c, res, 84, y, PAL.red2);
  });
  const k = new Crayon(c, 77);
  k.text('MOLECULAR BEARD LEVEL', 105, 114, C.purple, { center: true });
  k.text('- G.G., G.S.', 150, 126, C.purple);
  c.outline(INK);
  return c;
}

/** The bell protocol, nailed up beside the bell (neatly, by Quill). */
function bellProtocol() {
  const c = new PixelCanvas(232, 146);
  c.rect(1, 1, 230, 144, PAL.cloth4);
  for (let y = 1; y < 145; y++) for (let x = 1; x < 231; x++) if ((x * 7 + y * 13) % 37 === 0) c.set(x, y, PAL.cloth3);
  drawText(c, 'BELL PROTOCOL', 116, 7, PAL.red2, { center: true });
  drawText(c, 'BY ORDER OF THE CAPTAIN', 116, 18, INK, { center: true });
  c.hline(12, 220, 28, PAL.cloth1);
  const levels = [
    ['KLANG-HACK', 'OUTER CLOUD. WALK AWAY.', '#c89a18'],
    ['KLANG-HACK-KOFF', 'DENSE FUMES. HURRY.', '#d8742a'],
    ['KLANG-HACK-KOFF-WHEEZE', 'DEAD CENTER. RUN.', '#d03a2a'],
    ['KLANG-HACK, FOUR TIMES', 'GARRICK IS DRAWING A FORECAST.', '#9050b8'],
  ];
  levels.forEach(([sound, meaning, col], i) => {
    const y = 34 + i * 26;
    // one bell per level, drawn
    for (let b = 0; b <= i; b++) {
      const bx = 12 + b * 9;
      c.poly([[bx + 1, y + 8], [bx + 2, y + 3], [bx + 3, y + 1], [bx + 5, y + 1], [bx + 6, y + 3], [bx + 7, y + 8]], col);
      c.rect(bx, y + 7, 8, 1, col);
      c.set(bx + 4, y, INK);
      c.set(bx + 4, y + 8, INK);
    }
    drawText(c, sound, 52, y, INK);
    drawText(c, meaning, 52, y + 10, col);
  });
  drawText(c, 'FOUR: PRAY.', 222 - textWidth('FOUR: PRAY.'), 134, PAL.navy2);
  c.outline(INK);
  return c;
}

/** Three patches on one hole, each labelled in chalk by whoever nailed it on. */
function patchLabels() {
  const c = new PixelCanvas(200, 124);
  // hull planks
  for (let y = 0; y < 124; y += 12) {
    c.rect(0, y, 200, 11, y % 24 ? '#7a4a26' : '#6a3e20');
    c.hline(0, 199, y + 11, '#3e2412');
  }
  for (const [x, y] of [[20, 8], [160, 32], [40, 92], [180, 104]]) c.rect(x, y, 2, 2, '#2a1a0e');
  // bite marks round the edge of it all
  for (let i = 0; i < 9; i++) {
    const x = 26 + i * 18;
    c.poly([[x, 10], [x + 4, 18], [x + 8, 10]], '#2a1a0e');
    c.poly([[x, 114], [x + 4, 106], [x + 8, 114]], '#2a1a0e');
  }
  const board = (x, y, w, h, col, dark) => {
    c.rect(x, y, w, h, col);
    c.hline(x, x + w - 1, y, dark);
    c.hline(x, x + w - 1, y + h - 1, dark);
    for (const [nx, ny] of [[x + 2, y + 2], [x + w - 4, y + 2], [x + 2, y + h - 4], [x + w - 4, y + h - 4]]) c.rect(nx, ny, 2, 2, '#b0b0c0');
  };
  board(22, 22, 156, 80, '#a07040', '#5a3a1e');
  board(52, 36, 118, 56, '#b88a52', '#6a4a26');
  board(84, 50, 80, 32, '#caa068', '#7a5a30');
  const chalk = '#f4f0e8';
  drawText(c, 'PATCH', 30, 26, chalk);
  drawText(c, 'PATCH FOR PATCH', 58, 40, chalk);
  drawText(c, 'PATCH FOR', 94, 56, chalk);
  drawText(c, 'PATCH FOR', 94, 64, chalk);
  drawText(c, 'PATCH', 94, 72, chalk);
  c.outline(INK);
  return c;
}

export function addForecastInserts(atlas) {
  atlas.add('forecast_day1', forecastDay1());
  atlas.add('forecast_day2', forecastDay2());
  atlas.add('forecast_day3', forecastDay3());
  atlas.add('forecast_sharks', forecastDay4());
  const worst = forecastWorst();
  atlas.add('forecast_worst', worst);
  atlas.add('forecast_worst_flipped', upsideDown(worst));
  atlas.add('forecast_tomorrow_70', forecastTomorrow(false));
  atlas.add('forecast_tomorrow_700', forecastTomorrow(true));
  atlas.add('grog_close', grogClose(false));
  atlas.add('grog_forecast', grogClose(true));
  atlas.add('beard_remedies', beardRemedies());
  atlas.add('bell_protocol', bellProtocol());
  atlas.add('patch_labels', patchLabels());
}

function upsideDown(src) {
  const c = new PixelCanvas(src.width, src.height);
  c.blit(src, 0, 0, { flipX: true, flipY: true });
  return c;
}

export const FORECAST_INSERT_NAMES = [
  'forecast_day1', 'forecast_day2', 'forecast_day3', 'forecast_sharks', 'forecast_worst', 'forecast_worst_flipped',
  'forecast_tomorrow_70', 'forecast_tomorrow_700', 'grog_close', 'grog_forecast', 'beard_remedies', 'bell_protocol', 'patch_labels',
];
