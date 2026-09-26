import { PixelCanvas } from '../PixelCanvas.js';
import { ShelfAtlas } from '../atlas.js';
import { GLYPHS, GLYPH_ROWS, SPACE_ADVANCE, BUTTON_GLYPHS, MINI_LETTERS } from './glyphs.js';

/**
 * Rasterises the pixel font into three styles sharing one atlas:
 *   main  — white ink + 1px drop shadow (dialogue, menus); tint to recolour
 *   bold  — double-width strokes + outline (numbers, headings)
 *   big   — 2x scale + outline + shadow + subtle vertical shading (banners)
 */
const WHITE = '#ffffff';
const SHADOW = '#0b0914';
const OUTLINE = '#0b0914';

function parse(str) {
  const rows = str.split('/');
  const w = Math.max(...rows.map((r) => r.length));
  const ink = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') ink.push([x, y]);
  });
  return { w, ink };
}

function renderMain(g) {
  const c = new PixelCanvas(g.w + 1, GLYPH_ROWS + 1);
  for (const [x, y] of g.ink) c.set(x + 1, y + 1, SHADOW);
  for (const [x, y] of g.ink) c.set(x, y, WHITE);
  return { canvas: c, advance: g.w + 1 };
}

function renderBold(g) {
  const c = new PixelCanvas(g.w + 3, GLYPH_ROWS + 2);
  for (const [x, y] of g.ink) {
    c.set(x + 1, y + 1, WHITE);
    c.set(x + 2, y + 1, WHITE);
  }
  c.outline(OUTLINE);
  return { canvas: c, advance: g.w + 2 };
}

const BIG_SHADES = ['#ffffff', '#ffffff', '#f4f4f4', '#ececec', '#e0e0e0', '#d4d4d4', '#c8c8c8'];

function renderBig(g) {
  const c = new PixelCanvas(g.w * 2 + 3, GLYPH_ROWS * 2 + 3);
  for (const [x, y] of g.ink) {
    const shade = BIG_SHADES[Math.min(BIG_SHADES.length - 1, y)];
    c.rect(x * 2 + 1, y * 2 + 1, 2, 2, shade);
  }
  c.outline(OUTLINE, { diagonals: true });
  // drop shadow one pixel down-right, behind existing pixels
  const shadow = new PixelCanvas(c.width, c.height);
  for (let y = 0; y < c.height - 1; y++) {
    for (let x = 0; x < c.width - 1; x++) if (c.alphaAt(x, y)) shadow.set(x + 1, y + 1, SHADOW);
  }
  shadow.blit(c, 0, 0);
  return { canvas: shadow, advance: g.w * 2 + 2 };
}

function miniText(canvas, text, x, y, color) {
  let cx = x;
  for (const ch of text) {
    const rows = MINI_LETTERS[ch].split('/');
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') canvas.set(cx + i, y + j, color);
    });
    cx += 4;
  }
}

function keycap(width, draw) {
  const c = new PixelCanvas(width, 10);
  c.rect(1, 0, width - 2, 9, '#2a2838');
  c.rect(0, 1, width, 7, '#2a2838');
  c.rect(1, 1, width - 2, 6, '#e6e4ee');
  c.rect(1, 7, width - 2, 1, '#9896ac');
  c.rect(1, 9, width - 2, 1, SHADOW);
  draw(c, '#262436');
  return c;
}

function padButton(fill, letter) {
  const c = new PixelCanvas(10, 10);
  c.ellipse(4.5, 4.5, 4.5, 4.5, '#1a1824');
  c.ellipse(4.5, 4.5, 3.6, 3.6, fill);
  c.set(3, 2, '#ffffff80');
  miniText(c, letter, 3, 2, '#ffffff');
  return c;
}

function buildButtonGlyphs() {
  const out = {};
  out.key_z = keycap(9, (c, col) => miniText(c, 'Z', 3, 1, col));
  out.key_x = keycap(9, (c, col) => miniText(c, 'X', 3, 1, col));
  out.key_c = keycap(9, (c, col) => miniText(c, 'C', 3, 1, col));
  out.key_q = keycap(9, (c, col) => miniText(c, 'Q', 3, 1, col));
  out.key_e = keycap(9, (c, col) => miniText(c, 'E', 3, 1, col));
  out.key_esc = keycap(15, (c, col) => miniText(c, 'ESC', 2, 1, col));
  out.key_f2 = keycap(11, (c, col) => miniText(c, 'F2', 2, 1, col));
  out.key_enter = keycap(11, (c, col) => {
    c.vline(7, 1, 4, col);
    c.hline(3, 7, 4, col);
    c.set(4, 3, col);
    c.set(4, 5, col);
  });
  out.key_shift = keycap(9, (c, col) => {
    c.set(4, 1, col);
    c.hline(3, 5, 2, col);
    c.hline(2, 6, 3, col);
    c.rect(3, 4, 3, 2, col);
  });
  out.key_arrows = keycap(11, (c, col) => {
    c.set(5, 1, col); c.hline(4, 6, 2, col);
    c.hline(2, 3, 4, col); c.set(3, 3, col); c.set(3, 5, col);
    c.hline(7, 8, 4, col); c.set(7, 3, col); c.set(7, 5, col);
    c.hline(4, 6, 5, col); c.set(5, 6, col);
  });
  out.pad_a = padButton('#3e9a3c', 'A');
  out.pad_b = padButton('#c0383a', 'B');
  out.pad_x = padButton('#3a64c0', 'X');
  out.pad_y = padButton('#c89a24', 'Y');
  const pill = (w, draw) => {
    const c = new PixelCanvas(w, 10);
    c.rect(1, 1, w - 2, 8, '#1a1824');
    c.rect(0, 2, w, 6, '#1a1824');
    c.rect(1, 2, w - 2, 6, '#5a5870');
    draw(c);
    return c;
  };
  out.pad_start = pill(11, (c) => {
    c.hline(3, 7, 3, '#ffffff');
    c.hline(3, 7, 5, '#ffffff');
    c.hline(3, 7, 7, '#ffffff');
  });
  out.pad_lb = pill(11, (c) => miniText(c, 'LB', 2, 3, '#ffffff'));
  out.pad_rb = pill(11, (c) => miniText(c, 'RB', 2, 3, '#ffffff'));
  out.pad_dpad = (() => {
    const c = new PixelCanvas(10, 10);
    c.rect(3, 0, 4, 10, '#1a1824');
    c.rect(0, 3, 10, 4, '#1a1824');
    c.rect(4, 1, 2, 8, '#8a88a0');
    c.rect(1, 4, 8, 2, '#8a88a0');
    c.set(4, 4, '#5a5870'); c.set(5, 5, '#5a5870');
    return c;
  })();
  return out;
}

/**
 * @returns {{ canvas: PixelCanvas, fonts: Object<string, {lineHeight:number, size:number, glyphs:Object}> }}
 */
export function buildFonts() {
  const atlas = new ShelfAtlas(512, 1);
  const styles = { main: renderMain, bold: renderBold, big: renderBig };
  const meta = { main: {}, bold: {}, big: {} };

  for (const [ch, def] of Object.entries(GLYPHS)) {
    const g = parse(def);
    const code = ch.codePointAt(0);
    for (const [style, render] of Object.entries(styles)) {
      const { canvas, advance } = render(g);
      const name = `${style}_${code}`;
      atlas.add(name, canvas);
      meta[style][code] = { name, advance };
    }
  }
  // Button glyphs belong to the main style (they appear inside dialogue and prompts).
  const buttons = buildButtonGlyphs();
  for (const [id, canvas] of Object.entries(buttons)) {
    const code = BUTTON_GLYPHS[id];
    const name = `btn_${id}`;
    atlas.add(name, canvas);
    meta.main[code] = { name, advance: canvas.width + 1, yOffset: -1 };
    meta.bold[code] = { name, advance: canvas.width + 1, yOffset: 0 };
  }

  const { canvas, frames } = atlas.build();
  const fonts = {};
  const lineHeights = { main: 11, bold: 12, big: 22 };
  const spaces = { main: SPACE_ADVANCE, bold: SPACE_ADVANCE + 1, big: SPACE_ADVANCE * 2 };
  for (const style of Object.keys(meta)) {
    const glyphs = {};
    for (const [code, m] of Object.entries(meta[style])) {
      const f = frames[m.name];
      glyphs[code] = { x: f.x, y: f.y, w: f.w, h: f.h, advance: m.advance, yOffset: m.yOffset ?? 0 };
    }
    glyphs[32] = { x: 0, y: 0, w: 0, h: 0, advance: spaces[style], yOffset: 0 };
    fonts[style] = { lineHeight: lineHeights[style], size: lineHeights[style], glyphs };
  }
  return { canvas, fonts };
}

/** Pixel width of a string in a font (ignores markup; callers strip it first). */
export function measureText(font, text) {
  let w = 0;
  for (const ch of text) {
    const g = font.glyphs[ch.codePointAt(0)];
    w += g ? g.advance : font.glyphs[63]?.advance ?? 6;
  }
  return w;
}
