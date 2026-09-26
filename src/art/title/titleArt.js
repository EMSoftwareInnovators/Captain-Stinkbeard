import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';

/** Title screen art: sunset sky, sea, the ship silhouette and the logo. */
export function paintTitleSky() {
  const W = 320;
  const H = 150;
  const c = new PixelCanvas(W, H);
  const bands = [PAL.sky0, PAL.sky1, PAL.sky2, PAL.sky3, PAL.sky4, PAL.sky5];
  for (let y = 0; y < H; y++) {
    const t = (y / H) * (bands.length - 1);
    const i = Math.floor(t);
    const f = t - i;
    for (let x = 0; x < W; x++) {
      let idx = i;
      if (f > 0.5 && ((x + y) % 2 === 0 || f > 0.8) && i < bands.length - 1) idx = i + 1;
      c.set(x, y, bands[idx]);
    }
  }
  // stars in the upper sky
  for (let i = 0; i < 40; i++) {
    const x = (i * 97 + 13) % W;
    const y = (i * 37 + 5) % 50;
    c.set(x, y, i % 5 === 0 ? '#ffffff' : '#c8b8e0');
  }
  // setting sun
  c.ellipse(236, 146, 26, 26, PAL.sky5);
  c.ellipse(236, 146, 22, 22, '#fde0a0');
  c.ellipse(236, 146, 18, 18, '#fff0c8');
  // long clouds lit from below
  for (const [cx, cy, w] of [[60, 70, 70], [180, 58, 90], [270, 96, 60], [110, 104, 80]]) {
    for (let x = -w / 2; x < w / 2; x++) {
      const h = Math.max(1, Math.round(3 * Math.cos((x / w) * Math.PI)));
      for (let y = 0; y < h; y++) c.set(Math.round(cx + x), cy + y, y === h - 1 ? PAL.sky5 : PAL.sky2);
    }
  }
  return c;
}

export function paintTitleSea(frames = 2) {
  const W = 320;
  const H = 74;
  const c = new PixelCanvas(W * frames, H);
  for (let f = 0; f < frames; f++) {
    for (let y = 0; y < H; y++) {
      const base = y < 6 ? PAL.sky3 : y < 16 ? PAL.sea3 : y < 34 ? PAL.sea2 : PAL.sea1;
      for (let x = 0; x < W; x++) {
        let col = base;
        const wave = Math.sin(x * 0.18 + y * 0.9 + f * 1.7) + Math.sin(x * 0.05 - y * 0.3);
        if (wave > 1.5) col = y < 16 ? PAL.sky4 : PAL.sea4;
        // sun glitter column
        const d = Math.abs(x - 236);
        if (d < 30 - y * 0.2 && ((x * 3 + y * 7 + f * 5) % 9 === 0)) col = y < 30 ? '#fff0c8' : PAL.sky4;
        c.set(f * W + x, y, col);
      }
    }
  }
  return c;
}

/** Ship silhouette sailing away into the sunset. */
export function paintTitleShip() {
  const W = 150;
  const H = 120;
  const c = new PixelCanvas(W, H);
  const hullCol = '#1c1020';
  const sailCol = '#2a1a2c';
  const rim = PAL.sky4;
  // hull
  c.poly([[8, 92], [142, 88], [130, 108], [22, 110]], hullCol);
  c.poly([[112, 78], [146, 76], [142, 90], [112, 90]], hullCol); // stern castle
  c.line(8, 92, 0, 82, hullCol); // bowsprit
  c.line(9, 92, 1, 83, hullCol);
  // masts
  for (const [x, top] of [[44, 10], [80, 0], [114, 18]]) {
    c.rect(x, top, 2, 92 - top, hullCol);
  }
  // sails (billowing)
  const sail = (x, y, w, h) => {
    c.poly([[x - w / 2, y], [x + w / 2, y], [x + w / 2 + 3, y + h], [x - w / 2 - 3, y + h]], sailCol);
    c.line(Math.round(x + w / 2), y, Math.round(x + w / 2 + 3), y + h, rim);
  };
  sail(45, 16, 34, 26); sail(45, 46, 40, 30);
  sail(81, 6, 38, 28); sail(81, 38, 46, 34);
  sail(115, 24, 28, 22); sail(115, 50, 32, 26);
  // flag
  c.rect(82, 0, 10, 6, hullCol);
  // rim light along the hull top
  c.line(8, 91, 112, 88, rim);
  c.line(112, 77, 146, 75, rim);
  // gun ports lit warm
  for (let x = 30; x < 110; x += 12) c.rect(x, 96, 3, 2, PAL.fire2);
  c.rect(124, 82, 4, 3, PAL.fire3);
  c.rect(132, 82, 4, 3, PAL.fire3);
  // rigging
  c.line(0, 82, 80, 2, '#1c102080');
  c.line(146, 76, 80, 2, '#1c102080');
  return c;
}

// ---------------------------------------------------------------------------
// Logo lettering (original display face)

const LOGO_GLYPHS = {
  C: ['..######..', '.########.', '###....###', '##......##', '##........', '##........', '##........', '##........', '##........', '##......##', '###....###', '.########.', '..######..'],
  A: ['....##....', '...####...', '...####...', '..##..##..', '..##..##..', '.##....##.', '.##....##.', '.########.', '##########', '##......##', '##......##', '##......##', '###....###'],
  P: ['########..', '#########.', '.##....###', '.##.....##', '.##.....##', '.##....###', '.########.', '.#######..', '.##.......', '.##.......', '.##.......', '.##.......', '####......'],
  T: ['##########', '##########', '#...##...#', '....##....', '....##....', '....##....', '....##....', '....##....', '....##....', '....##....', '....##....', '....##....', '...####...'],
  I: ['######', '######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..', '######', '######'],
  N: ['###....###', '####....##', '#####...##', '.##.##..##', '.##.##..##', '.##..##.##', '.##..##.##', '.##...####', '.##...####', '.##....###', '.##....###', '.##.....##', '####....##'],
  S: ['..#######.', '.#########', '###.....##', '##........', '###.......', '.######...', '..#######.', '.......###', '........##', '........##', '##.....###', '#########.', '.#######..'],
  K: ['####...###', '.##...###.', '.##..###..', '.##.###...', '.#####....', '.####.....', '.#####....', '.##.###...', '.##..###..', '.##...###.', '.##....###', '.##.....##', '####....##'],
  B: ['########..', '#########.', '.##....###', '.##.....##', '.##....###', '.########.', '.#########', '.##....###', '.##.....##', '.##.....##', '.##....###', '##########', '#########.'],
  E: ['##########', '##########', '.##.....##', '.##.......', '.##...#...', '.#######..', '.#######..', '.##...#...', '.##.......', '.##.......', '.##.....##', '##########', '##########'],
  R: ['########..', '#########.', '.##....###', '.##.....##', '.##....###', '.########.', '.#######..', '.##..###..', '.##...###.', '.##....###', '.##.....##', '.##.....##', '####....##'],
  D: ['#######...', '########..', '.##...###.', '.##....###', '.##.....##', '.##.....##', '.##.....##', '.##.....##', '.##.....##', '.##....###', '.##...###.', '########..', '#######...'],
};

function renderWord(word, scale, spacing) {
  const glyphs = [...word].map((ch) => LOGO_GLYPHS[ch]);
  const w = glyphs.reduce((s, g) => s + g[0].length * scale + spacing, -spacing);
  const h = 13 * scale;
  const ink = new PixelCanvas(w, h);
  let x = 0;
  for (const g of glyphs) {
    g.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') ink.rect(x + i * scale, j * scale, scale, scale, '#ffffff');
    });
    x += g[0].length * scale + spacing;
  }
  return ink;
}

/** Gold, extruded, outlined lettering. */
export function paintLogo() {
  const big = renderWord('STINKBEARD', 2, 2);
  const small = renderWord('CAPTAIN', 1, 2);
  const pad = 8;
  const W = big.width + pad * 2 + 6;
  const H = big.height + small.height + pad * 2 + 16;
  const c = new PixelCanvas(W, H);
  const bigX = pad;
  const bigY = pad + small.height + 10;
  const gold = [PAL.gold5, PAL.gold4, PAL.gold4, PAL.gold3, PAL.gold3, PAL.gold2, PAL.gold2, PAL.gold1];
  // extrusion (deep red-brown) offset down-right
  for (let d = 4; d >= 1; d--) {
    for (let y = 0; y < big.height; y++) for (let x = 0; x < big.width; x++) {
      if (big.alphaAt(x, y)) c.set(bigX + x + d, bigY + y + d, d > 2 ? '#2a0c0c' : '#5a1a14');
    }
  }
  // gold face with vertical gradient and bevel highlights
  for (let y = 0; y < big.height; y++) {
    for (let x = 0; x < big.width; x++) {
      if (!big.alphaAt(x, y)) continue;
      let col = gold[Math.min(gold.length - 1, Math.floor((y / big.height) * gold.length))];
      if (!big.alphaAt(x, y - 1)) col = '#fffbe0';
      else if (!big.alphaAt(x, y + 1)) col = PAL.gold0;
      else if (!big.alphaAt(x - 1, y)) col = PAL.gold4;
      c.set(bigX + x, bigY + y, col);
    }
  }
  // ribbon banner for CAPTAIN
  const rw = small.width + 24;
  const rx = Math.round((W - rw) / 2);
  const ry = pad - 2;
  const rh = small.height + 6;
  c.poly([[rx - 8, ry + 3], [rx, ry + 3], [rx, ry + rh + 3], [rx - 8, ry + rh + 3], [rx - 4, ry + rh / 2 + 3]], PAL.red1);
  c.poly([[rx + rw + 8, ry + 3], [rx + rw, ry + 3], [rx + rw, ry + rh + 3], [rx + rw + 8, ry + rh + 3], [rx + rw + 4, ry + rh / 2 + 3]], PAL.red1);
  c.rect(rx, ry, rw, rh, PAL.red2);
  c.hline(rx, rx + rw - 1, ry, PAL.red4);
  c.hline(rx, rx + rw - 1, ry + rh - 1, PAL.red0);
  for (let y = 0; y < small.height; y++) {
    for (let x = 0; x < small.width; x++) {
      if (small.alphaAt(x, y)) c.set(rx + 12 + x, ry + 3 + y, y < 3 ? '#ffffff' : PAL.cloth4);
    }
  }
  c.outline(PAL.ink, { diagonals: false });
  return c;
}
