import { canvas, box, cylinder, outline, groundShadow, WOOD, DWOOD, LWOOD, IRON, GOLD, INK, PAL } from './propKit.js';

/** Interior furniture and clutter for the cabins, galley and holds. */

function sternWindows() {
  // 8 tiles wide, 2 tall: leaded glass looking out over the wake.
  const c = canvas(128, 32);
  c.rect(0, 0, 128, 32, DWOOD.m);
  for (let p = 0; p < 5; p++) {
    const x0 = 6 + p * 24;
    c.rect(x0 - 2, 1, 22, 30, DWOOD.b);
    c.rect(x0, 3, 18, 26, '#1d3a5c');
    // sky and sea gradient
    for (let y = 3; y < 29; y++) {
      const col = y < 10 ? '#8cc4e0' : y < 13 ? '#b8dcec' : y < 18 ? '#3a78a8' : y < 24 ? '#28588a' : '#1d4470';
      for (let x = x0; x < x0 + 18; x++) c.set(x, y, col);
    }
    // wake foam and glints
    for (let x = x0; x < x0 + 18; x++) if ((x * 7 + p) % 5 === 0) c.set(x, 19 + ((x + p) % 3), '#dff2fa');
    c.set(x0 + 3, 5, '#ffffff');
    c.set(x0 + 4, 6, '#e8f6fc');
    // lead cames
    c.vline(x0 + 6, 3, 28, DWOOD.d);
    c.vline(x0 + 12, 3, 28, DWOOD.d);
    c.hline(x0, x0 + 17, 11, DWOOD.d);
    c.hline(x0, x0 + 17, 20, DWOOD.d);
    // arched top
    c.hline(x0, x0 + 17, 3, DWOOD.l);
  }
  c.hline(0, 127, 0, DWOOD.l);
  c.hline(0, 127, 31, DWOOD.d);
  // curtains at the ends
  for (const [x0, dir] of [[0, 1], [122, -1]]) {
    for (let y = 0; y < 32; y++) {
      for (let i = 0; i < 6; i++) {
        const fold = (i + (y >> 2)) % 3 === 0 ? PAL.red1 : PAL.red2;
        c.set(x0 + i, y, i === (dir > 0 ? 5 : 0) ? PAL.red1 : fold);
      }
    }
    c.hline(x0, x0 + 5, 14, GOLD.l);
  }
  return c;
}

function captainDesk() {
  const c = canvas(48, 40);
  groundShadow(c, 24, 36, 22, 4);
  // legs
  for (const x of [3, 42]) c.rect(x, 20, 3, 16, WOOD.m);
  box(c, 1, 8, 46, 12, 12, WOOD, { planks: 0 });
  // drawers
  c.strokeRect(4, 23, 16, 7, WOOD.d);
  c.strokeRect(28, 23, 16, 7, WOOD.d);
  c.set(12, 26, GOLD.h); c.set(36, 26, GOLD.h);
  // chart unrolled on the desk
  c.rect(8, 9, 24, 10, PAL.cloth3);
  c.rect(8, 9, 24, 1, PAL.cloth4);
  c.hline(8, 31, 18, PAL.cloth1);
  c.line(11, 16, 17, 12, PAL.navy3);
  c.line(17, 12, 22, 15, PAL.navy3);
  c.line(22, 15, 28, 11, PAL.red3);
  c.set(28, 11, PAL.red2);
  c.ellipse(13, 12, 2, 1.5, PAL.green3);
  // compass rose
  c.set(26, 16, PAL.ink); c.set(25, 16, PAL.navy2); c.set(27, 16, PAL.navy2); c.set(26, 15, PAL.navy2); c.set(26, 17, PAL.navy2);
  // candle
  c.rect(37, 4, 3, 7, PAL.cloth4);
  c.set(38, 2, PAL.fire3); c.set(38, 3, PAL.fire2);
  c.rect(35, 10, 7, 2, GOLD.l);
  // inkwell and quill
  c.rect(4, 12, 3, 3, INK);
  c.line(6, 12, 3, 5, PAL.cloth4);
  c.set(3, 5, PAL.cloth3);
  // coins
  c.set(43, 14, GOLD.h); c.set(44, 15, GOLD.l); c.set(42, 16, GOLD.l);
  outline(c);
  return c;
}

function chair({ color = PAL.red2 } = {}) {
  const c = canvas(16, 24);
  c.rect(3, 0, 10, 12, WOOD.b);
  c.rect(4, 1, 8, 9, color);
  c.rect(5, 2, 3, 2, PAL.red3);
  c.hline(3, 12, 0, WOOD.h);
  box(c, 2, 11, 12, 4, 3, WOOD);
  c.rect(3, 12, 10, 2, color);
  c.rect(3, 17, 2, 7, WOOD.m);
  c.rect(11, 17, 2, 7, WOOD.m);
  outline(c);
  return c;
}

function captainBed() {
  const c = canvas(32, 52);
  groundShadow(c, 16, 49, 15, 3);
  // posts
  for (const x of [1, 29]) {
    c.rect(x, 2, 2, 48, WOOD.b);
    c.vline(x, 2, 49, WOOD.l);
  }
  // canopy
  c.rect(0, 0, 32, 6, PAL.red1);
  c.hline(0, 31, 0, PAL.red3);
  for (let x = 0; x < 32; x += 3) c.vline(x, 5, 7, GOLD.l);
  // frame + mattress
  box(c, 2, 14, 28, 26, 8, WOOD);
  c.rect(3, 15, 26, 24, PAL.cloth3);
  // pillow
  c.rect(6, 16, 20, 6, PAL.cloth4);
  c.hline(6, 25, 21, PAL.cloth2);
  // blanket
  c.rect(3, 24, 26, 15, PAL.red2);
  c.hline(3, 28, 24, PAL.red3);
  for (let y = 27; y < 39; y += 4) c.hline(4, 27, y, PAL.red1);
  c.rect(3, 24, 26, 2, GOLD.l);
  outline(c);
  return c;
}

function bookshelf() {
  const c = canvas(32, 40);
  c.rect(0, 0, 32, 40, WOOD.m);
  c.rect(2, 2, 28, 36, WOOD.d);
  const colors = [PAL.red2, PAL.navy3, PAL.green2, PAL.gold1, PAL.plum2, PAL.teal2, PAL.rust ?? PAL.red1, PAL.cloth1];
  for (let shelf = 0; shelf < 3; shelf++) {
    const y0 = 3 + shelf * 12;
    let x = 3;
    let i = shelf * 3;
    while (x < 28) {
      const w = 2 + ((i * 7) % 3);
      const h = 8 - ((i * 5) % 3);
      c.rect(x, y0 + 10 - h, w, h, colors[i % colors.length]);
      c.vline(x, y0 + 10 - h, y0 + 9, '#ffffff30');
      x += w + (i % 4 === 3 ? 2 : 0);
      i++;
    }
    c.rect(1, y0 + 10, 30, 2, WOOD.l);
    c.hline(1, 30, y0 + 10, WOOD.h);
  }
  c.hline(0, 31, 0, WOOD.h);
  outline(c);
  return c;
}

function globe() {
  const c = canvas(16, 28);
  groundShadow(c, 8, 26, 6, 2);
  c.rect(7, 16, 2, 9, WOOD.b);
  c.rect(4, 24, 8, 3, WOOD.m);
  c.hline(4, 11, 24, WOOD.l);
  c.ellipse(8, 9, 6, 6, PAL.sea3);
  c.ellipse(7, 8, 3, 2.5, PAL.green3);
  c.ellipse(10, 12, 2, 1.5, PAL.green3);
  c.set(5, 6, PAL.sea5);
  c.ellipseOutline(8, 9, 7, 7, GOLD.l);
  outline(c);
  return c;
}

export function chest({ big = false, fancy = false, open = false } = {}) {
  const w = big ? 32 : 16;
  const h = big ? 26 : 18;
  const c = canvas(w, h);
  const ramp = fancy ? DWOOD : WOOD;
  const trim = fancy ? GOLD : IRON;
  // lid (rounded top) and body
  const lidH = big ? 9 : 6;
  if (open) {
    c.rect(1, 0, w - 2, lidH, ramp.m);
    c.rect(2, 1, w - 4, lidH - 2, ramp.d);
  } else {
    for (let y = 0; y < lidH; y++) {
      const inset = y === 0 ? 2 : y === 1 ? 1 : 0;
      for (let x = 1 + inset; x < w - 1 - inset; x++) c.set(x, y, y < 2 ? ramp.h : y < lidH - 2 ? ramp.l : ramp.b);
    }
  }
  box(c, 1, lidH, w - 2, 0, h - lidH, ramp, { planks: 0, frame: false });
  if (open) {
    c.rect(3, lidH, w - 6, 3, GOLD.l);
    c.set(5, lidH, GOLD.h);
  }
  // bands and lock
  for (const x of big ? [5, w - 7] : [3, w - 5]) {
    c.vline(x, 1, h - 2, trim.l);
    c.vline(x + 1, 1, h - 2, trim.m);
  }
  c.hline(1, w - 2, lidH, trim.m);
  const lx = Math.floor(w / 2) - 2;
  c.rect(lx, lidH - 2, 4, 5, trim.l);
  c.rect(lx + 1, lidH, 2, 2, INK);
  if (fancy) for (let x = 3; x < w - 3; x += 4) c.set(x, lidH + 3, GOLD.h);
  outline(c);
  return c;
}

function weaponRack() {
  const c = canvas(32, 28);
  c.rect(0, 2, 32, 4, WOOD.b);
  c.hline(0, 31, 2, WOOD.h);
  c.rect(0, 20, 32, 4, WOOD.b);
  c.hline(0, 31, 20, WOOD.h);
  // crossed cutlasses and a musket
  c.line(4, 24, 14, 1, IRON.h);
  c.line(5, 24, 15, 1, IRON.l);
  c.line(27, 24, 17, 1, IRON.h);
  c.line(26, 24, 16, 1, IRON.l);
  c.rect(3, 22, 4, 2, GOLD.l);
  c.rect(25, 22, 4, 2, GOLD.l);
  c.line(9, 26, 23, 26, WOOD.l);
  c.line(9, 27, 23, 27, WOOD.m);
  c.rect(20, 25, 5, 3, IRON.b);
  outline(c);
  return c;
}

function portraitCaptain() {
  const c = canvas(22, 28);
  c.rect(0, 0, 22, 28, GOLD.b);
  c.strokeRect(0, 0, 22, 28, GOLD.l);
  c.strokeRect(1, 1, 20, 26, GOLD.m);
  c.rect(3, 3, 16, 22, '#2a1c30');
  // a flattering portrait of the captain (tricorn, beard, red coat)
  c.rect(6, 6, 10, 3, INK);
  c.rect(4, 8, 14, 2, INK);
  c.hline(4, 17, 9, GOLD.l);
  c.rect(7, 10, 8, 5, PAL.skin?.s ?? '#c07e50');
  c.rect(7, 10, 8, 5, '#c07e50');
  c.set(9, 11, INK); c.set(13, 11, INK);
  c.rect(6, 13, 10, 7, '#141018');
  c.rect(4, 20, 14, 5, PAL.red2);
  c.set(11, 21, GOLD.h);
  return c;
}

function wardrobe() {
  const c = canvas(32, 44);
  groundShadow(c, 16, 42, 15, 2);
  box(c, 1, 0, 30, 4, 39, WOOD, { planks: 0 });
  c.vline(16, 5, 41, WOOD.d);
  c.strokeRect(3, 7, 11, 30, WOOD.m);
  c.strokeRect(18, 7, 11, 30, WOOD.m);
  c.set(14, 22, GOLD.h); c.set(18, 22, GOLD.h);
  outline(c);
  return c;
}

function rug() {
  const c = canvas(64, 48);
  c.rect(0, 0, 64, 48, PAL.red1);
  c.rect(2, 2, 60, 44, PAL.red2);
  c.strokeRect(4, 4, 56, 40, GOLD.b);
  c.strokeRect(6, 6, 52, 36, PAL.red0);
  // central medallion
  c.ellipse(32, 24, 14, 10, PAL.navy2);
  c.ellipse(32, 24, 11, 7.5, PAL.red3);
  c.ellipse(32, 24, 6, 4, GOLD.b);
  c.ellipse(32, 24, 3, 2, PAL.navy3);
  for (const [x, y] of [[12, 12], [52, 12], [12, 36], [52, 36]]) {
    c.rect(x - 2, y - 2, 4, 4, GOLD.l);
    c.set(x, y, PAL.navy3);
  }
  // fringe
  for (let y = 1; y < 47; y += 2) {
    c.set(0, y, PAL.cloth3);
    c.set(63, y, PAL.cloth3);
  }
  return c;
}

function rumCabinet() {
  const c = canvas(16, 30);
  groundShadow(c, 8, 28, 7, 2);
  box(c, 1, 0, 14, 3, 26, WOOD);
  c.rect(3, 5, 10, 18, WOOD.d);
  for (let s = 0; s < 2; s++) {
    for (let i = 0; i < 3; i++) {
      const x = 4 + i * 3;
      const y = 6 + s * 9;
      c.rect(x, y + 2, 2, 5, [PAL.green1, PAL.red1, '#3a2a10'][(i + s) % 3]);
      c.set(x, y + 1, PAL.cloth2);
      c.set(x, y + 3, '#ffffff50');
    }
    c.hline(3, 12, 13 + s * 9, WOOD.l);
  }
  outline(c);
  return c;
}

function hangingLantern() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const c = canvas(16, 26);
    c.vline(8, 0, 9, IRON.m);
    c.rect(4, 9, 8, 2, IRON.l);
    c.rect(4, 11, 8, 10, IRON.b);
    const glow = [PAL.fire2, PAL.fire3, PAL.fire3][f];
    c.rect(5, 12, 6, 8, glow);
    c.rect(6, 13 + (f === 1 ? 1 : 0), 4, 5, PAL.fire4);
    c.vline(8, 12, 19, IRON.b);
    c.rect(4, 21, 8, 2, IRON.l);
    c.set(7, 23, IRON.m); c.set(8, 24, IRON.m);
    outline(c);
    frames.push(c);
  }
  return { frames, ms: 220 };
}

function hammock({ sleeper = false } = {}) {
  const c = canvas(48, 26);
  // ropes to the beams
  c.line(1, 0, 6, 12, PAL.rope2);
  c.line(46, 0, 41, 12, PAL.rope2);
  // canvas sling
  for (let x = 6; x <= 41; x++) {
    const sag = Math.round(Math.sin(((x - 6) / 35) * Math.PI) * 6);
    for (let y = 9 + sag; y < 16 + sag; y++) c.set(x, y, y === 9 + sag ? PAL.cloth4 : y > 13 + sag ? PAL.cloth1 : PAL.cloth2);
  }
  if (sleeper) {
    // a snoozing sailor: head, bandana, blanket bump
    c.ellipse(13, 12, 4, 3.5, '#c07e50');
    c.rect(9, 8, 8, 3, PAL.navy3);
    c.set(12, 12, INK); c.set(14, 12, INK);
    c.set(13, 14, '#5a321f');
    for (let x = 17; x < 38; x++) {
      const sag = Math.round(Math.sin(((x - 6) / 35) * Math.PI) * 6);
      for (let y = 8 + sag; y < 12 + sag; y++) c.set(x, y, y === 8 + sag ? PAL.navy3 : PAL.navy2);
    }
    c.rect(38, 13, 3, 3, '#c07e50');
  }
  outline(c);
  return c;
}

function footlocker(variant = 0) {
  const c = canvas(16, 16);
  const ramp = variant === 1 ? LWOOD : variant === 2 ? DWOOD : WOOD;
  box(c, 1, 2, 14, 5, 8, ramp);
  c.vline(4, 3, 14, IRON.b);
  c.vline(11, 3, 14, IRON.b);
  c.rect(7, 6, 2, 3, IRON.l);
  outline(c);
  return c;
}

function cardTable() {
  const c = canvas(32, 24);
  groundShadow(c, 16, 21, 14, 2);
  c.rect(4, 12, 2, 10, WOOD.m);
  c.rect(26, 12, 2, 10, WOOD.m);
  box(c, 1, 3, 30, 9, 4, WOOD);
  // cards, dice, coins, mug
  c.rect(5, 5, 3, 4, PAL.white); c.set(6, 6, PAL.red3);
  c.rect(9, 6, 3, 4, PAL.white); c.set(10, 7, INK);
  c.rect(15, 5, 2, 2, PAL.white); c.set(15, 5, INK);
  c.rect(18, 7, 2, 2, PAL.white); c.set(19, 8, INK);
  c.set(22, 6, GOLD.h); c.set(23, 7, GOLD.l); c.set(22, 8, GOLD.l);
  c.rect(26, 4, 3, 5, PAL.cloth1);
  c.hline(26, 28, 4, PAL.cloth3);
  outline(c);
  return c;
}

function stool() {
  const c = canvas(16, 14);
  cylinder(c, 8, 1, 6, 5, WOOD, { ry: 2 });
  c.rect(4, 7, 2, 7, WOOD.m);
  c.rect(10, 7, 2, 7, WOOD.m);
  outline(c);
  return c;
}

function clothesline() {
  const c = canvas(64, 20);
  for (let x = 0; x < 64; x++) c.set(x, 2 + Math.round(Math.sin((x / 63) * Math.PI) * 3), PAL.rope2);
  const items = [
    [6, 9, PAL.cloth3], [18, 7, PAL.navy3], [30, 10, '#d8d0c0'], [44, 7, PAL.red2], [54, 5, PAL.cloth2],
  ];
  for (const [x, w, col] of items) {
    const y0 = 3 + Math.round(Math.sin(((x + w / 2) / 63) * Math.PI) * 3);
    c.rect(x, y0, w, w === 5 ? 8 : 11, col);
    c.hline(x, x + w - 1, y0, '#ffffff40');
    if (w > 7) {
      c.rect(x - 2, y0 + 1, 2, 4, col);
      c.rect(x + w, y0 + 1, 2, 4, col);
    }
  }
  c.outline(INK);
  return c;
}

function medicineCabinet() {
  const c = canvas(32, 30);
  box(c, 1, 0, 30, 3, 26, WOOD);
  c.rect(3, 5, 26, 21, WOOD.d);
  const cols = [PAL.green3, PAL.sea4, PAL.red3, PAL.gold3, PAL.plum3, '#9ad0a8'];
  for (let s = 0; s < 2; s++) {
    for (let i = 0; i < 7; i++) {
      const x = 4 + i * 3 + (s ? 1 : 0);
      const y = 6 + s * 10;
      c.rect(x, y + 3, 2, 5, cols[(i + s * 2) % cols.length]);
      c.set(x, y + 2, PAL.cloth3);
    }
    c.hline(3, 28, 14 + s * 10, WOOD.l);
  }
  // red cross sign
  c.rect(13, 0, 6, 3, PAL.white);
  c.set(15, 0, PAL.red3); c.set(16, 0, PAL.red3); c.rect(14, 1, 4, 1, PAL.red3); c.set(15, 2, PAL.red3); c.set(16, 2, PAL.red3);
  outline(c);
  return c;
}

function cot() {
  const c = canvas(16, 34);
  groundShadow(c, 8, 31, 7, 2);
  box(c, 1, 2, 14, 26, 4, WOOD);
  c.rect(2, 3, 12, 24, PAL.cloth4);
  c.rect(3, 4, 10, 5, PAL.white);
  c.rect(2, 12, 12, 15, PAL.cloth3);
  c.hline(2, 13, 12, PAL.cloth4);
  outline(c);
  return c;
}

function post() {
  const c = canvas(16, 44);
  c.rect(5, 0, 6, 44, WOOD.b);
  c.vline(5, 0, 43, WOOD.l);
  c.vline(10, 0, 43, WOOD.m);
  c.rect(3, 38, 10, 6, WOOD.m);
  c.hline(3, 12, 38, WOOD.l);
  c.rect(6, 12, 4, 2, IRON.b); // hook
  outline(c);
  return c;
}

function mastPillar() {
  const c = canvas(32, 60);
  groundShadow(c, 16, 56, 12, 3);
  for (let y = 0; y < 54; y++) {
    for (let x = 10; x < 22; x++) {
      const u = (x - 10) / 12;
      c.set(x, y, u < 0.25 ? LWOOD.h : u < 0.55 ? LWOOD.l : u < 0.8 ? LWOOD.b : LWOOD.m);
    }
  }
  for (const y of [8, 30]) {
    c.hline(9, 22, y, IRON.l);
    c.hline(9, 22, y + 1, IRON.m);
  }
  c.ellipse(16, 54, 12, 4, WOOD.m);
  c.ellipse(16, 53, 10, 3, WOOD.l);
  for (let y = 48; y < 54; y++) for (let x = 10; x < 22; x++) c.set(x, y, x < 15 ? LWOOD.l : LWOOD.b);
  outline(c);
  return c;
}

function stove() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const c = canvas(32, 52);
    // chimney pipe
    c.rect(20, 0, 6, 22, IRON.b);
    c.vline(20, 0, 21, IRON.l);
    c.vline(25, 0, 21, IRON.m);
    // brick hearth
    c.rect(0, 30, 32, 22, PAL.red1);
    for (let y = 30; y < 52; y += 4) {
      c.hline(0, 31, y, '#2a1410');
      for (let x = (y / 4) % 2 ? 0 : 4; x < 32; x += 8) c.vline(x, y, y + 3, '#2a1410');
    }
    c.hline(0, 31, 30, '#c86848');
    // iron stove body
    box(c, 3, 18, 26, 6, 20, IRON);
    c.rect(8, 28, 16, 9, INK);
    // fire through the grate
    const flame = [PAL.fire1, PAL.fire2, PAL.fire3];
    for (let x = 9; x < 23; x++) {
      const h = 3 + ((x * 3 + f * 5) % 5);
      for (let y = 36 - h; y < 36; y++) c.set(x, y, flame[Math.min(2, Math.floor((36 - y) / 2 + ((x + f) % 2)))]);
    }
    for (let x = 9; x < 23; x += 2) c.vline(x, 29, 35, IRON.b);
    // pot on top with steam
    cylinder(c, 11, 11, 20, 6, IRON, { ry: 2, topColor: '#6a5a3a' });
    c.ellipse(11, 13, 4, 1.2, '#8a7040');
    c.set(10 + f, 9, '#ffffff70');
    c.set(12 - f, 7, '#ffffff50');
    outline(c);
    frames.push(c);
  }
  return { frames, ms: 140 };
}

function galleyShelf() {
  const c = canvas(32, 30);
  for (const y of [9, 20]) {
    c.rect(0, y, 32, 3, WOOD.l);
    c.hline(0, 31, y, WOOD.h);
    c.hline(0, 31, y + 2, WOOD.d);
  }
  // jars, plates, cups
  const jar = (x, y, col) => {
    c.rect(x, y, 4, 6, col);
    c.rect(x, y - 1, 4, 1, PAL.cloth2);
    c.set(x, y + 1, '#ffffff40');
  };
  jar(2, 3, PAL.green2); jar(8, 3, PAL.gold1); jar(14, 3, PAL.red1);
  for (let x = 20; x < 30; x += 3) c.ellipse(x + 1, 6, 2, 3, PAL.cloth3);
  jar(3, 14, '#6a4a2a'); jar(9, 14, PAL.plum2);
  c.rect(16, 15, 6, 5, IRON.b); c.hline(16, 21, 15, IRON.l);
  c.rect(24, 16, 5, 4, PAL.cloth2);
  outline(c);
  return c;
}

function hangingPots() {
  const c = canvas(32, 22);
  c.rect(0, 0, 32, 2, WOOD.b);
  c.hline(0, 31, 0, WOOD.l);
  const pan = (x, r, len) => {
    c.vline(x, 2, 2 + len, IRON.m);
    c.ellipse(x, 4 + len + r, r, r, IRON.b);
    c.ellipse(x - 1, 3 + len + r, r - 1.5, r - 1.5, IRON.l);
  };
  pan(5, 4, 3); pan(15, 3, 6); pan(24, 5, 2);
  c.rect(28, 2, 2, 10, PAL.rope2);
  outline(c);
  return c;
}

function prepTable() {
  const c = canvas(32, 26);
  groundShadow(c, 16, 23, 14, 2);
  c.rect(3, 13, 2, 11, WOOD.m);
  c.rect(27, 13, 2, 11, WOOD.m);
  box(c, 1, 4, 30, 9, 5, LWOOD);
  // chopping board, fish, knife, onions
  c.rect(4, 6, 11, 6, WOOD.l);
  c.hline(4, 14, 6, WOOD.h);
  c.ellipse(9, 9, 4, 1.5, '#8aa8b8');
  c.set(5, 9, '#5a7888'); c.set(12, 8, INK);
  c.line(17, 6, 22, 10, IRON.h);
  c.rect(16, 5, 2, 2, WOOD.d);
  c.ellipse(25, 8, 1.8, 1.8, PAL.gold2);
  c.ellipse(28, 9, 1.8, 1.8, '#b8a070');
  c.ellipse(26, 11, 1.8, 1.5, PAL.gold2);
  outline(c);
  return c;
}

function flourSacks() {
  const c = canvas(16, 18);
  c.ellipse(8, 11, 7, 6.5, PAL.cloth3);
  c.ellipse(7, 10, 5, 5, PAL.cloth4);
  c.rect(5, 2, 6, 4, PAL.cloth3);
  c.hline(5, 10, 5, PAL.rope2);
  c.set(6, 12, PAL.cloth1);
  c.set(9, 11, PAL.cloth1);
  outline(c);
  return c;
}

function messTable() {
  const c = canvas(48, 26);
  groundShadow(c, 24, 23, 22, 2);
  for (const x of [3, 43]) c.rect(x, 12, 3, 12, WOOD.m);
  box(c, 1, 3, 46, 9, 4, WOOD);
  // plates, mugs, bread
  for (const x of [6, 18, 30, 40]) {
    c.ellipse(x, 7, 3, 1.5, PAL.cloth3);
    c.set(x, 7, PAL.cloth1);
  }
  c.rect(12, 5, 2, 3, IRON.l);
  c.rect(35, 5, 2, 3, IRON.l);
  c.ellipse(24, 7, 3, 1.5, PAL.rope3);
  outline(c);
  return c;
}

function bench() {
  const c = canvas(48, 12);
  box(c, 1, 1, 46, 3, 3, WOOD);
  for (const x of [4, 42]) c.rect(x, 7, 2, 5, WOOD.m);
  outline(c);
  return c;
}

function hangingHerbs() {
  const c = canvas(32, 18);
  c.rect(0, 0, 32, 2, WOOD.b);
  for (let x = 3; x < 30; x += 5) {
    c.vline(x, 2, 5, PAL.rope2);
    if ((x / 5) % 2 < 1) {
      c.ellipse(x, 9, 2, 3, '#e8e0c8');
      c.set(x, 6, PAL.green3);
    } else {
      c.rect(x - 1, 6, 3, 9, PAL.red1);
      c.vline(x - 1, 6, 14, PAL.red2);
    }
  }
  outline(c);
  return c;
}

function cannonballs() {
  const c = canvas(16, 14);
  const ball = (x, y) => {
    c.ellipse(x, y, 2.6, 2.6, IRON.b);
    c.set(Math.round(x - 1), Math.round(y - 1), IRON.l);
  };
  for (const [x, y] of [[3, 10], [8, 10], [13, 10], [5.5, 7], [10.5, 7], [8, 4]]) ball(x, y);
  outline(c);
  return c;
}

function ratHole() {
  const c = canvas(16, 12);
  c.ellipse(8, 8, 5, 4, INK);
  c.ellipse(8, 9, 4, 3, '#000000');
  // gnawed splinters
  for (const [x, y] of [[3, 6], [4, 4], [12, 5], [13, 7], [6, 3], [10, 3]]) c.set(x, y, PAL.wood4);
  c.set(7, 11, PAL.cloth3);
  return c;
}

function hullPatch() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(24, 32);
    c.rect(2, 4, 20, 10, PAL.deck4);
    c.hline(2, 21, 4, PAL.deck5);
    c.hline(2, 21, 13, PAL.deck2);
    for (const x of [4, 19]) {
      c.set(x, 6, IRON.l);
      c.set(x, 11, IRON.l);
    }
    // tar seam and a drip
    c.hline(1, 22, 14, INK);
    c.set(12, 15, '#2e4450');
    const dy = 16 + f * 4;
    if (f < 3) {
      c.set(12, dy, '#6a9ab0');
      c.set(12, dy + 1, '#3e6478');
    }
    frames.push(c);
  }
  return { frames, ms: 350 };
}

function bilgePump() {
  const c = canvas(16, 30);
  cylinder(c, 8, 8, 28, 4, WOOD, { ry: 2, bands: [14, 22] });
  c.line(8, 9, 14, 2, IRON.l);
  c.line(9, 9, 15, 3, IRON.m);
  c.rect(13, 1, 3, 2, WOOD.l);
  c.rect(1, 20, 4, 2, WOOD.m);
  outline(c);
  return c;
}

function goldPile() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(32, 18);
    c.ellipse(16, 12, 15, 6, GOLD.m);
    c.ellipse(15, 10, 12, 5, GOLD.b);
    c.ellipse(14, 9, 8, 3.5, GOLD.l);
    c.ellipse(13, 8, 4, 1.5, GOLD.h);
    for (let i = 0; i < 18; i++) {
      const x = 3 + ((i * 7) % 26);
      const y = 8 + ((i * 5) % 8);
      c.set(x, y, i % 3 ? GOLD.h : GOLD.d);
    }
    // a jewel and a goblet peeking out
    c.set(22, 9, PAL.red3); c.set(23, 9, PAL.red4);
    c.rect(7, 4, 3, 4, GOLD.l); c.set(8, 8, GOLD.b); c.hline(6, 10, 4, GOLD.h);
    // sparkle
    const spots = [[11, 7], [20, 10], [16, 5], [25, 12]];
    const [sx, sy] = spots[f];
    c.set(sx, sy, '#ffffff');
    c.set(sx - 1, sy, GOLD.h); c.set(sx + 1, sy, GOLD.h); c.set(sx, sy - 1, GOLD.h); c.set(sx, sy + 1, GOLD.h);
    outline(c, GOLD.d);
    frames.push(c);
  }
  return { frames, ms: 260 };
}

function coinPile() {
  const c = canvas(16, 10);
  c.ellipse(8, 6, 7, 3.5, GOLD.b);
  c.ellipse(7, 5, 4, 2, GOLD.l);
  c.set(6, 4, GOLD.h);
  c.set(11, 6, GOLD.h);
  outline(c, GOLD.d);
  return c;
}

function goldBars() {
  const c = canvas(16, 14);
  const bar = (x, y) => {
    c.poly([[x + 1, y], [x + 6, y], [x + 7, y + 3], [x, y + 3]], GOLD.b);
    c.hline(x + 1, x + 5, y, GOLD.h);
    c.hline(x, x + 7, y + 3, GOLD.d);
  };
  bar(1, 10); bar(8, 10); bar(4, 6); bar(1, 2);
  outline(c);
  return c;
}

function gobletStand() {
  const c = canvas(16, 24);
  groundShadow(c, 8, 22, 7, 2);
  c.rect(3, 12, 2, 11, WOOD.m);
  c.rect(11, 12, 2, 11, WOOD.m);
  box(c, 1, 9, 14, 3, 3, DWOOD);
  // two goblets and a candelabra
  c.rect(3, 5, 3, 3, GOLD.l); c.set(4, 8, GOLD.b); c.hline(3, 5, 9, GOLD.b);
  c.vline(11, 1, 9, GOLD.b);
  c.hline(9, 13, 4, GOLD.b);
  c.set(9, 3, PAL.cloth4); c.set(11, 0, PAL.cloth4); c.set(13, 3, PAL.cloth4);
  outline(c);
  return c;
}

function idol() {
  const c = canvas(16, 30);
  groundShadow(c, 8, 28, 7, 2);
  box(c, 2, 20, 12, 3, 6, DWOOD);
  // squat golden figure with emerald eyes (an original design)
  c.ellipse(8, 8, 5, 5, GOLD.b);
  c.ellipse(7, 7, 3.5, 3.5, GOLD.l);
  c.set(6, 8, PAL.green4); c.set(10, 8, PAL.green4);
  c.hline(6, 10, 11, GOLD.d);
  c.rect(4, 12, 8, 8, GOLD.b);
  c.vline(4, 12, 19, GOLD.l);
  c.rect(2, 14, 2, 4, GOLD.m);
  c.rect(12, 14, 2, 4, GOLD.m);
  c.set(5, 3, GOLD.h); c.set(8, 2, GOLD.h); c.set(11, 3, GOLD.h);
  outline(c);
  return c;
}

function crownCushion() {
  const c = canvas(16, 16);
  c.ellipse(8, 11, 7, 4, PAL.plum2);
  c.ellipse(7, 10, 5, 2.5, PAL.plum3);
  c.set(1, 12, GOLD.l); c.set(15, 12, GOLD.l);
  c.rect(4, 4, 8, 5, GOLD.b);
  c.hline(4, 11, 8, GOLD.d);
  for (const x of [4, 8, 11]) c.vline(x, 2, 4, GOLD.l);
  c.set(8, 6, PAL.red3); c.set(5, 6, PAL.sea4); c.set(11, 6, PAL.green4);
  outline(c);
  return c;
}

function ledgerStand() {
  const c = canvas(16, 28);
  groundShadow(c, 8, 26, 6, 2);
  c.rect(7, 12, 2, 13, WOOD.m);
  c.rect(4, 24, 8, 3, WOOD.m);
  c.poly([[1, 6], [15, 6], [14, 12], [2, 12]], WOOD.b);
  c.rect(2, 4, 12, 6, PAL.cloth4);
  c.vline(8, 4, 9, PAL.cloth1);
  for (let y = 5; y < 9; y += 2) {
    c.hline(3, 6, y, PAL.cloth1);
    c.hline(10, 13, y, PAL.cloth1);
  }
  c.rect(2, 10, 12, 2, PAL.green2);
  outline(c);
  return c;
}

function strongbox() {
  const c = canvas(16, 16);
  box(c, 1, 3, 14, 4, 8, IRON);
  c.rect(6, 8, 4, 4, GOLD.l);
  c.set(7, 10, INK);
  c.set(8, 10, INK);
  outline(c);
  return c;
}

function shieldWall() {
  const c = canvas(32, 26);
  c.line(2, 24, 29, 2, IRON.h);
  c.line(3, 24, 30, 2, IRON.l);
  c.line(29, 24, 2, 2, IRON.h);
  c.line(28, 24, 1, 2, IRON.l);
  c.ellipse(16, 13, 8, 9, PAL.red2);
  c.ellipse(16, 13, 6, 7, PAL.red3);
  c.ellipse(16, 13, 2.5, 2.5, GOLD.l);
  c.ellipseOutline(16, 13, 8, 9, GOLD.b);
  outline(c);
  return c;
}

function barrelTable() {
  const c = canvas(16, 24);
  cylinder(c, 8, 4, 23, 6, WOOD, { ry: 3, bands: [10, 18] });
  // candle stub and cards on top
  c.rect(4, 5, 3, 2, PAL.white);
  c.rect(9, 3, 2, 4, PAL.cloth4);
  c.set(9, 2, PAL.fire3);
  outline(c);
  return c;
}

function wallHooks() {
  const c = canvas(32, 24);
  c.rect(0, 1, 32, 3, WOOD.b);
  c.hline(0, 31, 1, WOOD.l);
  // a coat and a hat on hooks
  c.rect(4, 4, 10, 16, PAL.navy2);
  c.vline(4, 4, 19, PAL.navy3);
  c.rect(6, 4, 6, 3, PAL.navy1);
  c.ellipse(24, 8, 6, 3, '#3a3020');
  c.rect(21, 4, 6, 4, '#4a4030');
  outline(c);
  return c;
}

function fiddle() {
  const c = canvas(12, 26);
  c.ellipse(6, 18, 5, 6, WOOD.l);
  c.ellipse(6, 11, 4, 4, WOOD.l);
  c.ellipse(6, 14, 3, 1.5, WOOD.l);
  c.rect(5, 1, 2, 10, WOOD.d);
  c.set(4, 16, INK); c.set(8, 16, INK);
  c.vline(6, 8, 22, PAL.cloth3);
  outline(c);
  return c;
}

export const INTERIOR_PROPS = {
  stern_windows: sternWindows,
  captain_desk: captainDesk,
  captain_chair: () => chair(),
  chair: () => chair({ color: PAL.navy2 }),
  captain_bed: captainBed,
  bookshelf,
  globe,
  sea_chest: () => chest({ big: true }),
  chest: () => chest(),
  chest_open: () => chest({ open: true }),
  treasure_chest: () => chest({ big: true, fancy: true }),
  treasure_chest_small: () => chest({ fancy: true }),
  weapon_rack: weaponRack,
  captain_portrait: portraitCaptain,
  wardrobe,
  rug_red: rug,
  rum_cabinet: rumCabinet,
  lantern_hanging: hangingLantern,
  hammock: () => hammock(),
  hammock_sleeper: () => hammock({ sleeper: true }),
  footlocker: () => footlocker(0),
  footlocker_b: () => footlocker(1),
  footlocker_c: () => footlocker(2),
  card_table: cardTable,
  stool,
  clothesline,
  medicine_cabinet: medicineCabinet,
  cot,
  post,
  mast_pillar: mastPillar,
  stove,
  galley_shelf: galleyShelf,
  hanging_pots: hangingPots,
  prep_table: prepTable,
  flour_sacks: flourSacks,
  mess_table: messTable,
  bench,
  hanging_herbs: hangingHerbs,
  cannonballs,
  rat_hole: ratHole,
  hull_patch: hullPatch,
  bilge_pump: bilgePump,
  gold_pile: goldPile,
  coin_pile: coinPile,
  gold_bars: goldBars,
  goblet_stand: gobletStand,
  idol,
  crown_cushion: crownCushion,
  ledger_stand: ledgerStand,
  strongbox,
  shield_wall: shieldWall,
  barrel_table: barrelTable,
  wall_hooks: wallHooks,
  fiddle,
};
