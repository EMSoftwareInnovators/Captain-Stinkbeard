import { GLYPHS, SPACE_ADVANCE } from './glyphs.js';

/**
 * Paints text with the game's pixel font straight into a PixelCanvas: for
 * signs, labels and documents that are part of the art (a jar's warning
 * label, a crude painted sign). `jitter` wobbles each letter up and down for a
 * hand-painted look; `scale` enlarges pixels.
 */
function rows(ch) {
  const g = GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? GLYPHS['?'];
  return g ? g.split('/') : null;
}

export function textWidth(text, { scale = 1, spacing = 1 } = {}) {
  let w = 0;
  for (const ch of text) {
    if (ch === ' ') {
      w += SPACE_ADVANCE * scale;
      continue;
    }
    const r = rows(ch);
    if (!r) continue;
    w += (r[0].length + spacing) * scale;
  }
  return Math.max(0, w - spacing * scale);
}

export function drawText(c, text, x, y, color, opts = {}) {
  // Shadow first, then the letters, so a shadow never covers ink.
  if (opts.shadow) paintText(c, text, x + 1, y + 1, opts.shadow, opts);
  return paintText(c, text, x, y, color, opts);
}

function paintText(c, text, x, y, color, { scale = 1, spacing = 1, jitter = 0, seed = 7, center = false } = {}) {
  let cx = center ? Math.round(x - textWidth(text, { scale, spacing }) / 2) : x;
  let s = seed;
  for (const ch of text) {
    if (ch === ' ') {
      cx += SPACE_ADVANCE * scale;
      continue;
    }
    const r = rows(ch);
    if (!r) continue;
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const dy = jitter ? (s % (jitter * 2 + 1)) - jitter : 0;
    for (let j = 0; j < r.length; j++) {
      for (let i = 0; i < r[j].length; i++) {
        if (r[j][i] !== '#') continue;
        for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) c.set(cx + i * scale + sx, y + dy + j * scale + sy, color);
      }
    }
    cx += (r[0].length + spacing) * scale;
  }
  return cx;
}
