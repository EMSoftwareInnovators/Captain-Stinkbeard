import { canvas, box, cylinder, outline, groundShadow, WOOD, DWOOD, LWOOD, IRON, GOLD, INK, PAL } from './propKit.js';

/** Main-deck props. Each painter returns a PixelCanvas or { frames, ms }. */

function mastBase(poleW, height, { big = true } = {}) {
  const w = 32;
  const c = canvas(w, height);
  const cx = 16;
  const baseY = height - 1;
  // fife rail: a square rail frame around the mast, seen from above-front
  const top = baseY - 24;
  box(c, 2, top, 28, 8, 8, WOOD);
  // belaying pins on the rail
  for (let x = 5; x < 28; x += 4) {
    c.set(x, top + 1, WOOD.h);
    c.set(x, top - 1, WOOD.l);
    c.set(x, top - 2, WOOD.h);
  }
  // rope coils hanging from the pins
  for (let x = 4; x < 28; x += 8) {
    c.ellipse(x + 2, top + 12, 3, 2.5, PAL.rope2);
    c.ellipseOutline(x + 2, top + 12, 3, 2.5, PAL.rope1);
    c.set(x + 1, top + 11, PAL.rope3);
  }
  // mast pole
  const pr = poleW / 2;
  for (let y = 0; y < top + 8; y++) {
    for (let x = Math.round(cx - pr); x < Math.round(cx + pr); x++) {
      const u = (x - (cx - pr)) / poleW;
      let col = u < 0.25 ? LWOOD.h : u < 0.55 ? LWOOD.l : u < 0.8 ? LWOOD.b : LWOOD.m;
      c.set(x, y, col);
    }
  }
  // iron hoops
  for (let y = top - 6; y > 0; y -= big ? 22 : 26) {
    for (let x = Math.round(cx - pr) - 1; x <= Math.round(cx + pr); x++) c.set(x, y, x < cx ? IRON.l : IRON.m);
    for (let x = Math.round(cx - pr) - 1; x <= Math.round(cx + pr); x++) c.set(x, y + 1, IRON.d);
  }
  // mast partners (collar at the deck)
  c.ellipse(cx, top + 4, pr + 3, 3, WOOD.m);
  c.ellipse(cx, top + 3, pr + 2, 2, WOOD.l);
  for (let y = top + 3; y < top + 8; y++) for (let x = Math.round(cx - pr); x < Math.round(cx + pr); x++) c.set(x, y, x < cx - 1 ? LWOOD.l : LWOOD.b);
  outline(c);
  return c;
}

/** Upper mast + yard with furled sail and rigging; drawn in the overhead layer. */
function mastTop(poleW, height, yardY, yardHalf) {
  const w = yardHalf * 2 + 16;
  const c = canvas(w, height);
  const cx = w / 2;
  const pr = poleW / 2;
  // shrouds (rigging) converging on the masthead
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const x0 = cx + side * (yardHalf - 4 - k * 5);
      c.line(Math.round(x0), height - 1, Math.round(cx + side * (pr + 1)), 2, PAL.rope1);
    }
    // ratlines
    for (let y = height - 10; y > 30; y -= 7) {
      const t = (height - 1 - y) / (height - 3);
      const xa = cx + side * ((yardHalf - 4) * (1 - t) + (pr + 1) * t);
      const xb = cx + side * ((yardHalf - 14) * (1 - t) + (pr + 1) * t);
      c.line(Math.round(xa), y, Math.round(xb), y, '#5a4020c0');
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = Math.round(cx - pr); x < Math.round(cx + pr); x++) {
      const u = (x - (cx - pr)) / poleW;
      c.set(x, y, u < 0.25 ? LWOOD.h : u < 0.55 ? LWOOD.l : u < 0.8 ? LWOOD.b : LWOOD.m);
    }
  }
  // yard (spar)
  for (let x = Math.round(cx - yardHalf); x <= Math.round(cx + yardHalf); x++) {
    c.set(x, yardY, WOOD.h);
    c.set(x, yardY + 1, WOOD.l);
    c.set(x, yardY + 2, WOOD.b);
    c.set(x, yardY + 3, WOOD.d);
  }
  // furled sail bundle with gaskets
  for (let x = Math.round(cx - yardHalf + 4); x <= Math.round(cx + yardHalf - 4); x++) {
    const bulge = Math.round(2 + Math.sin(x * 0.7) * 1);
    for (let y = yardY + 4; y < yardY + 7 + bulge; y++) c.set(x, y, y === yardY + 4 ? PAL.cloth4 : y > yardY + 5 + bulge ? PAL.cloth1 : PAL.cloth3);
    if (x % 12 === 0) for (let y = yardY + 3; y < yardY + 9 + bulge; y++) c.set(x, y, PAL.rope1);
  }
  c.outline(INK);
  return c;
}

function helm() {
  const c = canvas(32, 36);
  // pedestal
  box(c, 12, 22, 8, 3, 10, WOOD);
  // wheel
  const cx = 16;
  const cy = 15;
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4;
    const x2 = Math.round(cx + Math.cos(ang) * 14);
    const y2 = Math.round(cy + Math.sin(ang) * 12);
    c.line(cx, cy, x2, y2, WOOD.b);
    // handles
    c.set(x2, y2, WOOD.h);
    c.set(Math.round(cx + Math.cos(ang) * 15), Math.round(cy + Math.sin(ang) * 13), WOOD.l);
  }
  c.ellipseOutline(cx, cy, 10, 8.6, WOOD.l);
  c.ellipseOutline(cx, cy, 9, 7.6, WOOD.m);
  c.ellipse(cx, cy, 3, 2.6, GOLD.l);
  c.set(cx - 1, cy - 1, GOLD.h);
  outline(c);
  return c;
}

function binnacle() {
  const c = canvas(16, 26);
  box(c, 3, 10, 10, 3, 13, WOOD, { planks: 4 });
  c.ellipse(8, 7, 6, 5, GOLD.l);
  c.ellipse(8, 6, 5, 4, GOLD.h);
  c.ellipse(8, 8, 4, 2, '#20304a');
  c.set(7, 8, PAL.red3);
  c.set(9, 8, PAL.white);
  outline(c);
  return c;
}

function cannon(dir) {
  const c = canvas(32, 22);
  // carriage
  box(c, 8, 8, 18, 4, 7, DWOOD);
  // wheels
  for (const wx of [11, 22]) {
    c.ellipse(wx, 17, 3, 3, DWOOD.m);
    c.ellipse(wx, 17, 1.5, 1.5, DWOOD.b);
    c.set(wx - 1, 16, DWOOD.l);
  }
  // barrel (points left by default)
  for (let x = 1; x < 24; x++) {
    const r = x < 6 ? 2.5 : x < 20 ? 3 : 4;
    for (let y = Math.round(7 - r); y <= Math.round(7 + r); y++) {
      const u = (y - (7 - r)) / (2 * r);
      c.set(x, y, u < 0.25 ? IRON.h : u < 0.5 ? IRON.l : u < 0.8 ? IRON.b : IRON.m);
    }
  }
  c.rect(0, 4, 2, 7, IRON.m); // muzzle swell
  c.vline(0, 5, 9, IRON.b);
  c.set(0, 7, INK);
  c.set(1, 7, INK);
  c.vline(24, 4, 10, IRON.l); // cascabel
  c.set(26, 7, IRON.b);
  c.set(25, 7, IRON.l);
  // breeching rope
  c.hline(20, 30, 12, PAL.rope2);
  c.hline(20, 30, 13, PAL.rope1);
  outline(c);
  if (dir === 'r') {
    const f = canvas(32, 22);
    f.blit(c, 0, 0, { flipX: true });
    return f;
  }
  return c;
}

function capstan() {
  const c = canvas(32, 30);
  groundShadow(c, 16, 26, 13, 3);
  cylinder(c, 16, 6, 25, 7, WOOD, { ry: 3, bands: [12, 20] });
  // bars sticking out (star)
  for (let a = 0; a < 6; a++) {
    const ang = (a * Math.PI) / 3 + 0.3;
    const x2 = Math.round(16 + Math.cos(ang) * 15);
    const y2 = Math.round(9 + Math.sin(ang) * 5);
    c.line(16, 9, x2, y2, LWOOD.l);
    c.line(16, 10, x2, y2 + 1, LWOOD.m);
  }
  c.ellipse(16, 9, 3, 1.5, GOLD.l);
  outline(c);
  return c;
}

export function barrel({ mark = null, tall = false } = {}) {
  const h = tall ? 24 : 20;
  const c = canvas(16, h);
  cylinder(c, 7.5, 0, h - 1, 7, WOOD, { ry: 3, bands: tall ? [7, 14, 20] : [6, 14] });
  // staves
  for (let x = 2; x < 14; x += 3) for (let y = 7; y < h - 2; y++) if (!(y % 8 === 6 || y % 8 === 7)) c.set(x, y, c.get(x, y) === 0 ? 0 : WOOD.m);
  c.ellipse(7.5, 3, 5, 2, WOOD.b);
  c.set(5, 2, WOOD.h);
  if (mark === 'rum') {
    c.set(6, 10, INK); c.set(8, 10, INK); c.set(7, 11, INK); c.set(6, 12, INK); c.set(8, 12, INK);
  }
  if (mark === 'powder') {
    c.set(6, 9, PAL.red2); c.set(9, 9, PAL.red2); c.set(7, 10, PAL.red2); c.set(8, 10, PAL.red2);
    c.set(7, 11, PAL.red2); c.set(8, 11, PAL.red2); c.set(6, 12, PAL.red2); c.set(9, 12, PAL.red2);
  }
  if (mark === 'water') c.ellipse(7.5, 3, 4, 1.5, PAL.sea3);
  outline(c);
  return c;
}

export function crate({ stacked = false, variant = 0 } = {}) {
  const h = stacked ? 34 : 20;
  const c = canvas(16, h);
  const drawCrate = (y) => {
    box(c, 1, y, 14, 5, 12, LWOOD, { planks: 4 });
    // cross brace
    c.line(2, y + 6, 13, y + 15, LWOOD.m);
    c.line(2, y + 15, 13, y + 6, LWOOD.m);
    c.rect(1, y + 5, 14, 1, LWOOD.d);
    if (variant === 1) {
      c.set(4, y + 9, INK); c.set(5, y + 9, INK); c.set(10, y + 12, INK);
    }
  };
  if (stacked) {
    drawCrate(14);
    drawCrate(0);
  } else drawCrate(2);
  outline(c);
  return c;
}

function crateWide() {
  const c = canvas(32, 22);
  box(c, 1, 2, 30, 6, 13, LWOOD, { planks: 4 });
  c.vline(16, 9, 20, LWOOD.m);
  c.hline(2, 29, 14, LWOOD.m);
  c.set(6, 12, INK); c.set(7, 12, INK); c.set(8, 11, INK); c.set(24, 16, INK);
  outline(c);
  return c;
}

function crateBig() {
  const c = canvas(32, 36);
  box(c, 1, 2, 30, 8, 25, LWOOD, { planks: 5 });
  c.line(2, 11, 29, 33, LWOOD.m);
  c.line(2, 33, 29, 11, LWOOD.m);
  c.rect(1, 10, 30, 1, LWOOD.d);
  c.strokeRect(1, 10, 30, 25, LWOOD.d);
  outline(c);
  return c;
}

function sacks() {
  const c = canvas(16, 18);
  const sack = (x, y, w, h) => {
    c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, PAL.cloth1);
    c.ellipse(x + w / 2 - 1, y + h / 2 - 1, w / 2 - 1.5, h / 2 - 1.5, PAL.cloth2);
    c.set(Math.round(x + w / 2 - 2), Math.round(y + 2), PAL.cloth3);
    c.hline(Math.round(x + 2), Math.round(x + w - 3), Math.round(y + 3), PAL.cloth0);
  };
  sack(1, 6, 9, 11);
  sack(6, 7, 9, 10);
  sack(3, 1, 9, 9);
  outline(c);
  return c;
}

function ropeCoil() {
  const c = canvas(16, 12);
  for (let r = 6; r > 1; r -= 1.5) {
    c.ellipseOutline(8, 6, r + 0.5, r * 0.7, r % 3 < 1.5 ? PAL.rope3 : PAL.rope2);
  }
  c.ellipse(8, 6, 1.5, 1, PAL.rope1);
  c.line(13, 7, 15, 10, PAL.rope2);
  outline(c);
  return c;
}

function bucketMop() {
  const c = canvas(16, 26);
  cylinder(c, 5, 16, 25, 4, WOOD, { ry: 2, bands: [18, 23] });
  c.ellipse(5, 18, 3, 1.5, PAL.sea2);
  // mop leaning
  c.line(13, 1, 9, 22, WOOD.l);
  c.line(14, 1, 10, 22, WOOD.m);
  for (let i = 0; i < 6; i++) c.line(8 + i, 21, 7 + i + (i % 2), 25, PAL.cloth2);
  outline(c);
  return c;
}

function stovepipe() {
  const c = canvas(16, 30);
  cylinder(c, 8, 4, 28, 3, IRON, { ry: 1, bands: [14, 22] });
  // cowl
  c.rect(3, 1, 10, 4, IRON.b);
  c.hline(3, 12, 1, IRON.l);
  c.rect(5, 3, 6, 2, INK);
  c.ellipse(8, 27, 6, 2, WOOD.m);
  outline(c);
  return c;
}

function shipBell() {
  const c = canvas(16, 32);
  // belfry frame
  c.rect(2, 4, 2, 27, WOOD.b);
  c.rect(12, 4, 2, 27, WOOD.b);
  c.vline(2, 4, 30, WOOD.l);
  c.vline(12, 4, 30, WOOD.l);
  c.rect(1, 2, 14, 3, WOOD.l);
  c.hline(1, 14, 2, WOOD.h);
  // bell
  c.poly([[5, 8], [11, 8], [12, 17], [4, 17]], GOLD.b);
  c.ellipse(8, 8, 3, 2, GOLD.l);
  c.hline(3, 12, 17, GOLD.m);
  c.vline(5, 9, 16, GOLD.h);
  c.set(8, 18, IRON.b);
  c.line(8, 19, 9, 24, PAL.rope2);
  outline(c);
  return c;
}

/** Jolly Roger on the stern flagstaff: 4 waving frames. Original design. */
function flagstaff() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(34, 48);
    c.rect(2, 2, 2, 46, WOOD.l);
    c.vline(3, 2, 47, WOOD.m);
    c.set(2, 1, GOLD.h); c.set(3, 1, GOLD.l);
    // flag cloth with a travelling wave
    for (let x = 0; x < 28; x++) {
      const wave = Math.round(Math.sin(x * 0.35 - f * (Math.PI / 2)) * (1 + x / 14));
      for (let y = 0; y < 18; y++) {
        const shade = Math.sin(x * 0.35 - f * (Math.PI / 2) + 0.9) > 0.3 ? '#2a2430' : '#141018';
        c.set(4 + x, 4 + y + wave, y === 0 || y === 17 ? '#0a0810' : shade);
      }
    }
    // skull with a beard and crossed cutlasses (drawn in flag space)
    const wv = (x) => Math.round(Math.sin(x * 0.35 - f * (Math.PI / 2)) * (1 + x / 14));
    const px = (x, y, col) => c.set(4 + x, 4 + y + wv(x), col);
    const skull = ['..####..', '.######.', '##.##.##', '########', '.##..##.', '.#.##.#.', '..####..', '.#.##.#.', '#......#'];
    skull.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') px(10 + i, 2 + j, '#f0ece0');
    });
    for (let i = 0; i < 12; i++) {
      px(8 + i, 11 + Math.floor(i / 2), '#c8c8d8');
      px(19 - i, 11 + Math.floor(i / 2), '#c8c8d8');
    }
    frames.push(c);
  }
  return { frames, ms: 150 };
}

function sternLantern() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const c = canvas(16, 36);
    c.rect(7, 12, 2, 24, WOOD.b);
    c.vline(7, 12, 35, WOOD.l);
    c.rect(3, 2, 10, 12, GOLD.m);
    c.rect(4, 4, 8, 8, f === 0 ? PAL.fire2 : PAL.fire3);
    c.rect(6, 6, 4, 5, PAL.fire4);
    c.vline(8, 4, 11, GOLD.b);
    c.rect(2, 1, 12, 2, GOLD.l);
    c.rect(5, 0, 6, 1, GOLD.b);
    c.rect(2, 13, 12, 2, GOLD.b);
    outline(c);
    frames.push(c);
  }
  return { frames, ms: 380 };
}

function bowsprit() {
  const c = canvas(24, 64);
  for (let y = 0; y < 60; y++) {
    const r = 3 - Math.floor(y / 30);
    for (let x = 12 - r; x < 12 + r; x++) c.set(x, y, x < 11 ? LWOOD.l : LWOOD.b);
  }
  // figurehead: a carved gilded albatross with spread wings
  c.poly([[12, 8], [2, 2], [4, 7], [9, 11], [12, 16], [15, 11], [20, 7], [22, 2]], GOLD.b);
  c.line(2, 2, 10, 9, GOLD.h);
  c.line(22, 2, 14, 9, GOLD.l);
  c.rect(11, 12, 3, 6, GOLD.l);
  c.set(12, 19, GOLD.d);
  // stays (ropes)
  c.line(12, 30, 2, 0, PAL.rope1);
  c.line(12, 30, 22, 0, PAL.rope1);
  outline(c);
  return c;
}

export const DECK_PROPS = {
  mast: () => mastBase(12, 88),
  mast_top: () => mastTop(12, 250, 120, 104),
  foremast: () => mastBase(10, 80, { big: false }),
  foremast_top: () => mastTop(10, 250, 132, 96),
  helm,
  binnacle,
  cannon_l: () => cannon('l'),
  cannon_r: () => cannon('r'),
  capstan,
  barrel: () => barrel(),
  barrel_rum: () => barrel({ mark: 'rum' }),
  barrel_water: () => barrel({ mark: 'water', tall: true }),
  powder_keg: () => barrel({ mark: 'powder' }),
  crate: () => crate(),
  crate_marked: () => crate({ variant: 1 }),
  crate_stack: () => crate({ stacked: true }),
  crate_wide: crateWide,
  crate_big: crateBig,
  sacks,
  rope_coil: ropeCoil,
  bucket_mop: bucketMop,
  stovepipe,
  ship_bell: shipBell,
  flagstaff,
  stern_lantern: sternLantern,
  bowsprit,
};
