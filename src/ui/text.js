import * as Phaser from 'phaser';

/**
 * Rich text for the pixel fonts.
 *
 * Markup:  <y>gold</>  <r>red</>  <g>green</>  <b>blue</>  <p>purple</>
 *          <c>cyan</>  <o>orange</>  <k>grey</>  <w>white</>
 * Tokens:  {ship} (game constants)  {player}  {gold}  {item:hardtack}
 *          {var:name}  {btn:confirm} (button glyph for the active device)
 *
 * Word wrap replaces spaces with newlines, so character indices never shift
 * and colour spans stay aligned for BitmapText.setCharacterTint.
 */
export const TEXT_COLORS = {
  y: 0xf8d86c,
  r: 0xf07860,
  g: 0x8cd46a,
  b: 0x8ab4f0,
  p: 0xd0a0e8,
  c: 0x90e0ec,
  o: 0xf8a040,
  k: 0xbab8cc,
  w: 0xffffff,
};

/** Darker equivalents for text on light surfaces (parchment tips). */
export const INK_COLORS = {
  y: 0x8a5200,
  r: 0x9a1a10,
  g: 0x2a6a18,
  b: 0x1a3a8a,
  p: 0x5a2478,
  c: 0x14666a,
  o: 0x9a4400,
  k: 0x5e4a38,
  w: 0x1e1008,
};

export const UI_COLORS = {
  text: 0xffffff,
  dim: 0xbcbad0,
  disabled: 0x807e96,
  gold: 0xf8d86c,
  heading: 0xf8d86c,
  good: 0x8cd46a,
  bad: 0xf07860,
  name: 0xf8d86c,
};

export function parseMarkup(str, palette = TEXT_COLORS) {
  let text = '';
  const spans = [];
  const stack = [];
  const re = /<([a-z])>|<\/>/g;
  let last = 0;
  let m;
  while ((m = re.exec(str))) {
    text += str.slice(last, m.index);
    last = re.lastIndex;
    if (m[1]) stack.push({ color: palette[m[1]] ?? 0xffffff, start: text.length });
    else {
      const open = stack.pop();
      if (open) spans.push({ start: open.start, end: text.length, color: open.color });
    }
  }
  text += str.slice(last);
  return { text, spans };
}

/** Replaces {tokens} using the running game state. */
export function formatTokens(str, { app = null, session = null } = {}) {
  return str.replace(/\{([^{}]+)\}/g, (whole, token) => {
    const idx = token.indexOf(':');
    const kind = idx < 0 ? token : token.slice(0, idx);
    const arg = idx < 0 ? null : token.slice(idx + 1);
    if (kind === 'btn') return app?.input?.glyph(arg) ?? '';
    if (kind === 'item') return app?.content?.items.get(arg)?.name ?? arg;
    if (kind === 'var') return String(session?.story.getVar(arg) ?? 0);
    if (kind === 'player' || kind === 'leader') return session?.party.leader()?.name ?? 'Captain';
    if (kind === 'gold') return String(session?.inventory.gold ?? 0);
    const constant = app?.content?.constant(kind);
    return constant !== undefined ? String(constant) : whole;
  });
}

export function measure(font, text) {
  let w = 0;
  for (const ch of text) {
    const g = font.glyphs[ch.codePointAt(0)];
    w += g ? g.advance : 6;
  }
  return w;
}

/** Wraps plain text to `maxWidth` pixels by turning spaces into newlines. */
export function wrap(font, text, maxWidth) {
  const chars = [...text];
  let lineStart = 0;
  let lastSpace = -1;
  let width = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === '\n') {
      lineStart = i + 1;
      lastSpace = -1;
      width = 0;
      continue;
    }
    if (ch === ' ') lastSpace = i;
    const g = font.glyphs[ch.codePointAt(0)];
    width += g ? g.advance : 6;
    if (width > maxWidth && lastSpace > lineStart) {
      chars[lastSpace] = '\n';
      lineStart = lastSpace + 1;
      lastSpace = -1;
      width = measure(font, chars.slice(lineStart, i + 1).join(''));
    }
  }
  return chars.join('');
}

/** Splits wrapped text into pages of `lines` lines, keeping absolute offsets. */
export function paginate(wrapped, lines) {
  const out = [];
  const all = wrapped.split('\n');
  let offset = 0;
  for (let i = 0; i < all.length; i += lines) {
    const pageLines = all.slice(i, i + lines);
    const text = pageLines.join('\n');
    out.push({ text, offset });
    offset += text.length + 1;
  }
  return out;
}

/**
 * Applies colour spans (absolute indices) to a BitmapText showing text[offset..].
 * Phaser numbers tintable characters without counting newlines, so raw string
 * indices are converted before tinting.
 */
export function applySpans(bt, spans, offset = 0, visibleLength = Infinity) {
  bt.setCharacterTint(0, -1, Phaser.TintModes.MULTIPLY, -1);
  const text = bt.text;
  const len = Math.min(text.length, visibleLength);
  if (!len) return;
  const glyphIndex = new Int32Array(text.length + 1);
  for (let i = 0, n = 0; i <= text.length; i++) {
    glyphIndex[i] = n;
    if (i < text.length && text[i] !== '\n') n++;
  }
  for (const s of spans) {
    const start = Math.max(0, s.start - offset);
    const end = Math.min(len, s.end - offset);
    if (end <= start) continue;
    const g0 = glyphIndex[start];
    const g1 = glyphIndex[end];
    if (g1 > g0) bt.setCharacterTint(g0, g1 - g0, Phaser.TintModes.MULTIPLY, s.color);
  }
  // Button prompts are little pictures with their own colours: never tint them.
  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xe000 && code <= 0xf8ff) bt.setCharacterTint(glyphIndex[i], 1, Phaser.TintModes.MULTIPLY, 0xffffff);
  }
}

/** Creates a BitmapText with markup support. */
export function addText(scene, x, y, str = '', { font = 'main', color = 0xffffff, align = 'left', maxWidth = 0, depth = 0, palette = null } = {}) {
  const app = scene.game.app;
  const metrics = app.fontMetrics[font];
  const bt = scene.add.bitmapText(x, y, font, '', metrics.size);
  bt.setOrigin(0, 0);
  bt.setDepth(depth);
  bt.maxTextWidth = maxWidth;
  bt.fontName = font;
  // The shadowless ink font is for light surfaces, so its highlights use dark inks.
  bt.palette = palette ?? (font === 'ink' ? INK_COLORS : TEXT_COLORS);
  setText(bt, str, { color, align });
  return bt;
}

export function setText(bt, str, { color = null, align = null } = {}) {
  const app = bt.scene.game.app;
  const metrics = app.fontMetrics[bt.fontName ?? 'main'];
  const formatted = formatTokens(String(str), { app, session: app.session });
  const { text, spans } = parseMarkup(formatted, bt.palette ?? TEXT_COLORS);
  const finalText = bt.maxTextWidth ? wrap(metrics, text, bt.maxTextWidth) : text;
  bt.setText(finalText);
  if (color !== null) bt.setTint(color);
  if (align) bt.setAlign?.(align);
  applySpans(bt, spans);
  bt.textWidth = Math.max(...finalText.split('\n').map((l) => measure(metrics, l)));
  return bt;
}

/** Positions a text so it is horizontally centred on cx. */
export function centerText(bt, cx) {
  bt.x = Math.round(cx - bt.textWidth / 2);
  return bt;
}
