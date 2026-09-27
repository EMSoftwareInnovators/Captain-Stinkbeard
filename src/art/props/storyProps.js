import { canvas, box, cylinder, outline, groundShadow, WOOD, DWOOD, LWOOD, IRON, GOLD, INK, PAL } from './propKit.js';
import { unpack, pack, rgba } from '../palette.js';
import { drawText } from '../font/drawText.js';

/**
 * Props for Story Phase 2 (Garrick Guzzlegut and the Cursed Treasure):
 * the richer treasure room, its contaminated twins, Garrick's toll deck,
 * the galley's eel paste, the rescue debris and the ship's new "features".
 */

// ---------------------------------------------------------------------------
// Contamination: every treasure prop has a "_foul" twin painted from it.

/** Recolours a painted canvas: tarnished, greasy, yellowed; keeps the outline. */
export function foulify(src, seed = 1) {
  const c = src.clone();
  const ink = rgba(INK);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const px = c.get(x, y);
      const a = px >>> 24;
      if (!a || px === ink) continue;
      const { r, g, b } = unpack(px);
      const lum = (r * 0.3 + g * 0.55 + b * 0.15) / 255;
      // Ramp from dark olive to a sickly mustard highlight.
      const tr = Math.round(58 + lum * 150);
      const tg = Math.round(52 + lum * 140);
      const tb = Math.round(18 + lum * 40);
      const k = 0.55;
      let nr = Math.round(r * (1 - k) + tr * k);
      let ng = Math.round(g * (1 - k) + tg * k);
      let nb = Math.round(b * (1 - k) + tb * k);
      // a greasy sheen on the lit parts, and grime in the darks
      if (lum > 0.55 && (x * 3 + y * 5 + seed) % 11 === 0) {
        nr = 226; ng = 222; nb = 120;
      } else if (lum < 0.35 && (x + y * 2 + seed) % 7 === 0) {
        nr = Math.round(nr * 0.7); ng = Math.round(ng * 0.72); nb = Math.round(nb * 0.6);
      }
      c.px[y * c.width + x] = pack(nr, ng, nb, a);
    }
  }
  return c;
}

function foulProp(painter, seed) {
  return () => {
    const out = painter();
    if (out.frames) return { frames: out.frames.map((f, i) => foulify(f, seed + i)), ms: out.ms * 1.8 };
    return foulify(out, seed);
  };
}

// ---------------------------------------------------------------------------
// Treasure room (before)

function jewelPile() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const c = canvas(16, 12);
    c.ellipse(8, 8, 7.5, 3.5, GOLD.m);
    c.ellipse(7, 7, 5, 2.5, GOLD.b);
    const gems = [[3, 7, PAL.red3], [6, 5, PAL.sea4], [9, 6, PAL.green4], [12, 8, PAL.red4], [8, 8, PAL.plum4], [5, 9, PAL.sea5], [11, 5, '#e8e0f8']];
    for (const [x, y, col] of gems) {
      c.set(x, y, col);
      c.set(x + 1, y, col);
      c.set(x, y - 1, '#ffffff');
    }
    const [sx, sy] = [[6, 4], [11, 4], [3, 6]][f];
    c.set(sx, sy, '#ffffff');
    c.set(sx - 1, sy, GOLD.h);
    c.set(sx + 1, sy, GOLD.h);
    outline(c, GOLD.d);
    frames.push(c);
  }
  return { frames, ms: 320 };
}

function pearlBowl() {
  const c = canvas(16, 14);
  groundShadow(c, 8, 12, 7, 2);
  c.ellipse(8, 8, 7, 4, IRON.l);
  c.ellipse(8, 7, 6, 2.5, IRON.m);
  c.rect(6, 11, 4, 2, IRON.b);
  for (const [x, y] of [[4, 6], [6, 5], [8, 6], [10, 5], [12, 6], [7, 4], [9, 4], [5, 7], [11, 7]]) {
    c.set(x, y, '#f4ece8');
    c.set(x + 1, y, '#d8c8d0');
  }
  c.set(8, 3, '#ffffff');
  c.line(12, 7, 15, 12, '#f0e8ec');
  c.line(13, 7, 15, 10, '#d0c0c8');
  outline(c);
  return c;
}

function necklaceStand() {
  const c = canvas(16, 26);
  groundShadow(c, 8, 24, 6, 2);
  c.rect(6, 14, 4, 10, DWOOD.b);
  c.rect(3, 22, 10, 3, DWOOD.m);
  // velvet bust
  c.ellipse(8, 9, 6, 7, PAL.plum2);
  c.ellipse(7, 8, 4, 5, PAL.plum3);
  // necklaces draped in loops
  for (let x = 3; x <= 13; x++) {
    c.set(x, 8 + Math.round(Math.sin(((x - 3) / 10) * Math.PI) * 3), GOLD.l);
    c.set(x, 11 + Math.round(Math.sin(((x - 3) / 10) * Math.PI) * 3), x % 2 ? '#f0e8ec' : '#d8c8d0');
  }
  c.set(8, 11, PAL.red3);
  c.set(8, 14, PAL.sea4);
  outline(c);
  return c;
}

function goldStatue() {
  const c = canvas(18, 32);
  groundShadow(c, 9, 30, 7, 2);
  box(c, 3, 22, 12, 3, 6, DWOOD);
  // An original figure: a sea-captain with an outsized spyglass.
  c.ellipse(9, 6, 3, 3, GOLD.b);
  c.ellipse(8, 5, 2, 2, GOLD.l);
  c.poly([[5, 3], [13, 3], [11, 1], [7, 1]], GOLD.m);
  c.rect(6, 9, 6, 9, GOLD.b);
  c.vline(6, 9, 17, GOLD.l);
  c.rect(5, 17, 3, 5, GOLD.m);
  c.rect(10, 17, 3, 5, GOLD.m);
  c.line(12, 10, 17, 6, GOLD.l);
  c.line(12, 11, 17, 7, GOLD.m);
  c.set(7, 5, GOLD.d);
  c.set(9, 5, GOLD.d);
  c.set(5, 12, GOLD.h);
  outline(c);
  return c;
}

function silverPile() {
  const c = canvas(16, 12);
  c.ellipse(8, 9, 7, 2.5, IRON.m);
  // plates, a goblet and a jug
  c.ellipse(5, 8, 4, 1.5, IRON.h);
  c.ellipse(11, 9, 3.5, 1.5, IRON.l);
  c.rect(8, 3, 3, 4, IRON.l);
  c.set(9, 7, IRON.b);
  c.hline(7, 11, 8, IRON.b);
  c.rect(2, 4, 3, 4, IRON.l);
  c.set(5, 5, IRON.b);
  c.set(2, 4, '#ffffff');
  c.set(8, 3, '#ffffff');
  outline(c);
  return c;
}

function artifactMirror() {
  const c = canvas(16, 30);
  groundShadow(c, 8, 28, 6, 2);
  c.rect(3, 26, 10, 2, GOLD.m);
  c.rect(7, 20, 2, 7, GOLD.b);
  c.ellipse(8, 11, 7, 10, GOLD.b);
  c.ellipse(8, 11, 5, 8, '#8ab4c8');
  c.ellipse(6, 8, 2, 4, '#c8e4f0');
  for (const [x, y] of [[8, 1], [1, 11], [15, 11], [3, 4], [13, 4]]) c.set(x, y, PAL.red3);
  outline(c);
  return c;
}

function swordTrophy() {
  const c = canvas(32, 22);
  c.ellipse(16, 11, 7, 8, PAL.navy2);
  c.ellipseOutline(16, 11, 7, 8, GOLD.l);
  c.line(3, 20, 28, 2, IRON.h);
  c.line(4, 20, 29, 2, IRON.l);
  c.line(28, 20, 3, 2, IRON.h);
  c.line(27, 20, 2, 2, IRON.l);
  c.rect(2, 18, 4, 3, GOLD.l);
  c.rect(26, 18, 4, 3, GOLD.l);
  c.ellipse(16, 11, 2.5, 2.5, GOLD.h);
  outline(c);
  return c;
}

function coinScatter() {
  const c = canvas(32, 16);
  const coins = [[3, 4], [8, 9], [13, 3], [19, 11], [24, 6], [28, 12], [6, 13], [16, 8], [22, 2], [11, 12]];
  coins.forEach(([x, y], i) => {
    c.ellipse(x, y, 1.6, 1, i % 3 ? GOLD.l : GOLD.b);
    c.set(x, y - 1, GOLD.h);
  });
  return c;
}

function treasureChestOpen() {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const c = canvas(32, 26);
    groundShadow(c, 16, 24, 14, 2);
    box(c, 3, 12, 26, 3, 10, WOOD, { planks: 4 });
    for (const x of [3, 15, 28]) c.vline(x, 12, 24, GOLD.b);
    c.hline(3, 28, 16, GOLD.b);
    // lid thrown back
    c.poly([[3, 12], [29, 12], [27, 3], [5, 3]], WOOD.b);
    c.hline(5, 27, 3, GOLD.l);
    c.hline(4, 28, 8, GOLD.b);
    // overflowing gold
    c.ellipse(16, 12, 12, 4, GOLD.b);
    c.ellipse(15, 11, 9, 3, GOLD.l);
    c.set(10, 10, PAL.red3); c.set(20, 11, PAL.sea4); c.set(14, 9, '#f0e8ec'); c.set(17, 9, '#f0e8ec');
    c.line(26, 13, 30, 22, '#f0e8ec');
    const [sx, sy] = [[12, 9], [19, 10], [23, 12]][f];
    c.set(sx, sy, '#ffffff');
    c.set(sx - 1, sy, GOLD.h); c.set(sx + 1, sy, GOLD.h);
    outline(c);
    frames.push(c);
  }
  return { frames, ms: 300 };
}

function chestFallen() {
  const c = canvas(32, 18);
  groundShadow(c, 16, 16, 14, 2);
  // a chest on its side, lid sprung, coins spilled
  box(c, 6, 5, 18, 3, 9, WOOD, { planks: 3 });
  c.vline(6, 5, 16, GOLD.b);
  c.vline(23, 5, 16, GOLD.b);
  c.poly([[24, 8], [30, 6], [30, 15], [24, 16]], WOOD.m);
  c.ellipse(28, 16, 4, 1.5, GOLD.b);
  c.set(27, 15, GOLD.h);
  outline(c);
  return c;
}

function chestBroken() {
  const c = canvas(32, 22);
  groundShadow(c, 16, 20, 15, 2);
  // splintered staves and a caved-in lid
  c.poly([[3, 20], [7, 9], [10, 20]], WOOD.b);
  c.poly([[12, 20], [15, 8], [19, 20]], WOOD.m);
  c.poly([[21, 20], [26, 11], [29, 20]], WOOD.b);
  c.line(5, 12, 12, 6, WOOD.l);
  c.line(18, 7, 27, 12, WOOD.l);
  c.hline(3, 29, 19, GOLD.d);
  c.ellipse(16, 19, 10, 2, GOLD.b);
  for (const [x, y] of [[4, 15], [14, 12], [24, 16], [9, 18]]) c.set(x, y, GOLD.h);
  outline(c);
  return c;
}

function crownLoose() {
  const c = canvas(16, 12);
  c.rect(2, 7, 12, 4, DWOOD.b);
  c.hline(2, 13, 7, DWOOD.l);
  c.rect(4, 2, 8, 5, GOLD.b);
  for (const x of [4, 8, 11]) c.vline(x, 0, 2, GOLD.l);
  c.set(8, 4, PAL.red3);
  c.set(5, 4, PAL.sea4);
  outline(c);
  return c;
}

function tapestry() {
  const c = canvas(32, 34);
  c.rect(2, 0, 28, 2, GOLD.m);
  c.rect(3, 2, 26, 28, PAL.red2);
  c.rect(5, 4, 22, 24, PAL.red3);
  // a stitched map with a golden X
  c.ellipse(16, 16, 8, 6, PAL.gold2);
  c.line(12, 12, 20, 20, PAL.red1);
  c.line(20, 12, 12, 20, PAL.red1);
  for (let x = 4; x < 28; x += 3) c.set(x, 29, GOLD.l);
  for (let x = 4; x < 28; x += 3) c.vline(x, 30, 32, GOLD.b);
  outline(c);
  return c;
}

function candelabra() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const c = canvas(16, 30);
    groundShadow(c, 8, 28, 5, 2);
    c.rect(5, 26, 6, 2, GOLD.m);
    c.vline(8, 9, 26, GOLD.b);
    c.hline(3, 13, 12, GOLD.b);
    for (const x of [3, 8, 13]) {
      c.rect(x - 1, 8, 2, 4, PAL.cloth4);
      c.set(x - 1, 6 - (f ^ (x === 8 ? 1 : 0)), PAL.fire3);
      c.set(x - 1, 7, PAL.fire2);
    }
    outline(c);
    frames.push(c);
  }
  return { frames, ms: 200 };
}

// ---------------------------------------------------------------------------
// After the Gust

function fumeWisp() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const c = canvas(16, 26);
    for (let k = 0; k < 2; k++) {
      for (let y = 4; y < 24; y++) {
        const x = 5 + k * 5 + Math.round(Math.sin((y + f * 3 + k * 5) * 0.45) * 2);
        const alpha = Math.round((y / 24) * 200).toString(16).padStart(2, '0');
        c.set(x, y, `#d8c850${alpha}`);
        if (y % 3 === 0) c.set(x + 1, y, `#a8b83a${alpha}`);
      }
    }
    frames.push(c);
  }
  return { frames, ms: 220 };
}

function stain(w, h, seed) {
  const c = canvas(w, h);
  const cx = w / 2;
  const cy = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot((x - cx) / (w / 2), (y - cy) / (h / 2)) + Math.sin(x * 0.9 + seed) * 0.08 + Math.cos(y * 1.3 + seed) * 0.08;
      if (d < 0.75) c.set(x, y, '#b8a03080');
      else if (d < 0.95) c.set(x, y, (x + y) % 2 ? '#8a7a2070' : '#b8a03040');
    }
  }
  return c;
}

function doorMarks() {
  const c = canvas(16, 30);
  // planks nailed across a blasted door, scorch marks around the frame
  for (let y = 0; y < 30; y++) for (let x = 0; x < 16; x++) if ((x * 7 + y * 3) % 9 === 0 && (x < 3 || x > 12 || y < 4)) c.set(x, y, '#6a5a2090');
  box(c, 0, 10, 16, 1, 3, LWOOD);
  box(c, 0, 18, 16, 1, 3, LWOOD);
  for (const [x, y] of [[1, 12], [14, 12], [1, 20], [14, 20]]) c.set(x, y, IRON.h);
  return c;
}

function doorCrab() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const c = canvas(16, 14);
    c.ellipse(8, 9, 5, 3.5, PAL.red3);
    c.ellipse(7, 8, 3, 2, PAL.red4);
    c.set(6, 6, INK); c.set(10, 6, INK);
    c.vline(6, 4, 5, PAL.red2); c.vline(10, 4, 5, PAL.red2);
    // claws: one clamped shut on the handle, one snapping
    c.ellipse(2, 7 - f, 2, 2, PAL.red3);
    c.set(1, 6 - f, INK);
    c.ellipse(14, 6, 2.5, 2, PAL.red3);
    c.set(14, 5, f ? PAL.red1 : PAL.red4);
    for (const x of [4, 6, 10, 12]) c.set(x, 12, PAL.red2);
    outline(c);
    frames.push(c);
  }
  return { frames, ms: 240 };
}

function debrisCrate() {
  const c = canvas(16, 16);
  groundShadow(c, 8, 14, 7, 2);
  c.poly([[2, 14], [4, 5], [9, 7], [8, 14]], WOOD.b);
  c.poly([[8, 14], [10, 6], [15, 8], [14, 14]], WOOD.m);
  c.line(3, 9, 14, 12, WOOD.l);
  c.set(6, 13, GOLD.l);
  c.set(12, 13, GOLD.h);
  outline(c);
  return c;
}

function debrisBarrel() {
  const c = canvas(20, 14);
  groundShadow(c, 10, 12, 9, 2);
  c.ellipse(9, 8, 8, 5, WOOD.b);
  c.ellipse(16, 8, 3, 5, WOOD.l);
  c.ellipse(16, 8, 2, 3.5, WOOD.d);
  for (const x of [5, 11]) c.vline(x, 4, 12, IRON.b);
  c.ellipse(4, 12, 3, 1.5, '#b8a030a0');
  outline(c);
  return c;
}

// ---------------------------------------------------------------------------
// Deck, galley and crew quarters

function telescope() {
  const c = canvas(16, 28);
  groundShadow(c, 8, 26, 6, 2);
  // tripod
  c.line(8, 12, 3, 26, WOOD.b);
  c.line(8, 12, 13, 26, WOOD.m);
  c.line(8, 12, 8, 26, WOOD.d);
  // brass tube angled out to starboard
  c.thickLine(13, 11, 1, 7, 3, GOLD.b);
  c.line(13, 10, 2, 6, GOLD.h);
  c.rect(0, 5, 3, 4, GOLD.l);
  c.rect(12, 10, 3, 3, GOLD.m);
  c.set(0, 6, '#c8e4f0');
  outline(c);
  return c;
}

function tollRope() {
  const c = canvas(16, 20);
  groundShadow(c, 8, 18, 3, 1);
  c.rect(7, 6, 2, 12, WOOD.b);
  c.set(7, 6, WOOD.h);
  // sagging rope to both sides
  for (let x = 0; x < 16; x++) {
    const y = 9 + Math.round(Math.sin((x / 16) * Math.PI) * -2 + (x < 8 ? x / 4 : (16 - x) / 4));
    c.set(x, y, PAL.rope2);
    c.set(x, y + 1, PAL.rope1);
  }
  outline(c);
  return c;
}

function tollSign() {
  const c = canvas(20, 30);
  groundShadow(c, 10, 28, 5, 2);
  c.rect(9, 14, 2, 14, WOOD.b);
  // a door off a cupboard, hastily painted
  c.poly([[1, 1], [19, 2], [18, 15], [2, 14]], LWOOD.l);
  c.hline(2, 18, 2, LWOOD.h);
  c.hline(2, 17, 14, LWOOD.b);
  for (let y = 4; y < 13; y += 3) for (let x = 3; x < 17; x++) if ((x * 5 + y) % 4 !== 0) c.set(x, y, y === 4 ? PAL.red3 : INK);
  c.set(4, 13, PAL.red2);
  c.set(4, 14, PAL.red2);
  outline(c);
  return c;
}

function bathtubDeck() {
  const c = canvas(32, 20);
  groundShadow(c, 16, 18, 15, 2);
  // the overturned tub, drying on deck
  c.ellipse(16, 12, 14, 6, LWOOD.b);
  c.ellipse(15, 10, 12, 4, LWOOD.l);
  for (let x = 4; x < 29; x += 4) c.vline(x, 8, 17, LWOOD.m);
  c.hline(3, 29, 13, IRON.b);
  // two enormous sausages leaning against it
  c.thickLine(2, 18, 9, 2, 3, '#8a3a24');
  c.line(3, 16, 9, 3, '#b4583a');
  c.thickLine(28, 18, 23, 3, 3, '#7a3220');
  c.line(27, 16, 23, 4, '#a84c30');
  outline(c);
  return c;
}

function rowboat() {
  const c = canvas(32, 20);
  groundShadow(c, 16, 18, 15, 2);
  c.poly([[1, 9], [31, 9], [27, 17], [5, 17]], WOOD.b);
  c.poly([[3, 9], [29, 9], [26, 14], [6, 14]], WOOD.d);
  c.hline(1, 31, 9, WOOD.h);
  c.rect(10, 9, 2, 6, WOOD.m);
  c.rect(20, 9, 2, 6, WOOD.m);
  c.line(4, 6, 12, 12, WOOD.l);
  c.line(28, 6, 20, 12, WOOD.l);
  // "G.G." in white paint on the bow
  drawText(c, 'GG', 15, 10, '#f4e8cc', { spacing: 1 });
  outline(c);
  return c;
}

function fumeSail() {
  const frames = [];
  for (let f = 0; f < 2; f++) {
    const c = canvas(56, 36);
    // a foresail bellied out with trapped yellow cloud
    c.poly([[2, 2], [54, 2], [50 + f, 30], [6 - f, 30]], PAL.cloth3);
    c.ellipse(28, 16, 22 + f, 12, '#e8d870');
    c.ellipse(26, 14, 16, 8, '#f4e894');
    for (let x = 10; x < 46; x += 5) c.set(x, 20 + (x % 3), '#b8a838');
    c.hline(2, 54, 2, WOOD.b);
    c.hline(1, 55, 1, WOOD.m);
    outline(c);
    frames.push(c);
  }
  return { frames, ms: 500 };
}

function sailCleat() {
  const c = canvas(16, 16);
  c.rect(3, 8, 10, 3, IRON.b);
  c.hline(3, 12, 8, IRON.h);
  // line belayed round it, with a bright rag tied on so it can be found
  c.line(2, 6, 14, 12, PAL.rope2);
  c.line(2, 12, 14, 6, PAL.rope3);
  c.rect(12, 2, 3, 4, PAL.red3);
  outline(c);
  return c;
}

function tiedRopes() {
  const c = canvas(28, 30);
  // ropes lashed round someone standing against the mast
  for (const y of [10, 15, 20]) {
    for (let x = 1; x < 27; x++) {
      c.set(x, y + Math.round(Math.sin(x * 0.4) * 0.5), PAL.rope2);
      c.set(x, y + 1 + Math.round(Math.sin(x * 0.4) * 0.5), PAL.rope1);
    }
  }
  c.rect(12, 21, 4, 3, PAL.rope3);
  return c;
}

function pickleBarrel() {
  const c = canvas(16, 24);
  groundShadow(c, 8, 22, 7, 2);
  cylinder(c, 8, 6, 22, 6, WOOD, { ry: 3, bands: [11, 18] });
  c.ellipse(8, 9, 5, 2.5, '#6a7a2a');
  for (const [x, y] of [[5, 8], [8, 9], [10, 8], [7, 10]]) c.set(x, y, '#c8d060');
  c.rect(10, 1, 4, 5, '#e8e0cc');
  c.set(11, 3, '#c8d060');
  outline(c);
  return c;
}

function brineCrock() {
  const c = canvas(16, 18);
  groundShadow(c, 8, 16, 6, 2);
  c.ellipse(8, 10, 6, 6, '#8a7a64');
  c.ellipse(7, 9, 4, 4, '#b0a088');
  c.rect(5, 2, 6, 3, '#6a5a48');
  c.set(6, 7, '#f4f0e8');
  outline(c);
  return c;
}

function eelJar() {
  const c = canvas(10, 14);
  c.rect(1, 3, 8, 10, '#5a7a3a');
  c.rect(2, 4, 6, 8, '#7a9a48');
  c.rect(1, 1, 8, 2, PAL.cloth1);
  c.rect(2, 6, 6, 4, PAL.cloth4);
  c.hline(3, 6, 7, PAL.red3);
  c.hline(3, 5, 9, INK);
  outline(c);
  return c;
}

function noteNoEel() {
  const c = canvas(16, 18);
  c.poly([[2, 2], [14, 1], [15, 15], [1, 16]], PAL.cloth4);
  c.set(8, 2, IRON.h);
  drawText(c, 'NO', 4, 4, PAL.red3, {});
  c.line(3, 13, 12, 12, INK);
  c.line(3, 12, 12, 13, INK);
  c.hline(4, 11, 11, INK);
  outline(c);
  return c;
}

function signNoGarrick() {
  const c = canvas(16, 26);
  groundShadow(c, 8, 24, 4, 2);
  c.rect(7, 12, 2, 12, WOOD.b);
  c.rect(1, 2, 14, 11, LWOOD.l);
  c.hline(1, 14, 2, LWOOD.h);
  // a stick figure with a round belly, crossed out
  c.ellipse(8, 6, 1.5, 1.5, INK);
  c.ellipse(8, 9, 2.5, 2, INK);
  c.line(2, 3, 14, 12, PAL.red3);
  c.line(14, 3, 2, 12, PAL.red3);
  outline(c);
  return c;
}

function ragHooks() {
  const c = canvas(16, 16);
  c.rect(1, 2, 14, 2, WOOD.m);
  for (const [x, col] of [[3, '#9aaab2'], [8, PAL.cloth3], [12, '#c8d6dc']]) {
    c.set(x, 4, IRON.h);
    c.rect(x - 1, 5, 3, 7, col);
    c.set(x + 1, 11, '#6a7c86');
  }
  outline(c);
  return c;
}

function shackleChain() {
  const c = canvas(32, 12);
  for (let x = 1; x < 30; x += 3) {
    const y = 6 + Math.round(Math.sin(x * 0.2) * 2);
    c.ellipse(x, y, 1.5, 1, IRON.l);
    c.set(x, y, IRON.b);
  }
  c.rect(27, 4, 4, 4, IRON.b);
  return c;
}

function perch() {
  const c = canvas(16, 26);
  groundShadow(c, 8, 24, 5, 2);
  c.rect(7, 6, 2, 18, WOOD.b);
  c.rect(4, 22, 8, 2, WOOD.m);
  c.hline(2, 13, 6, WOOD.l);
  c.hline(2, 13, 7, WOOD.d);
  c.rect(11, 8, 3, 3, IRON.l);
  c.set(12, 9, '#c8a030');
  outline(c);
  return c;
}

function knittingBasket() {
  const c = canvas(16, 12);
  c.ellipse(8, 8, 7, 4, PAL.rope2);
  c.ellipse(8, 6, 6, 2, PAL.rope1);
  c.ellipse(5, 5, 2.5, 2, '#b4483a');
  c.ellipse(10, 5, 2.5, 2, '#f0e4c8');
  c.line(10, 3, 15, 0, IRON.h);
  c.line(9, 3, 13, 0, IRON.h);
  outline(c);
  return c;
}

export const STORY_PROPS = {
  jewel_pile: jewelPile,
  pearl_bowl: pearlBowl,
  necklace_stand: necklaceStand,
  gold_statue: goldStatue,
  silver_pile: silverPile,
  artifact_mirror: artifactMirror,
  sword_trophy: swordTrophy,
  coin_scatter: coinScatter,
  treasure_chest_open: treasureChestOpen,
  chest_fallen: chestFallen,
  chest_broken: chestBroken,
  crown_loose: crownLoose,
  tapestry,
  candelabra,
  fume_wisp: fumeWisp,
  stain_floor: () => stain(32, 16, 2),
  stain_small: () => stain(16, 12, 5),
  door_marks: doorMarks,
  door_crab: doorCrab,
  debris_crate: debrisCrate,
  debris_barrel: debrisBarrel,
  telescope,
  toll_rope: tollRope,
  toll_sign: tollSign,
  bathtub_deck: bathtubDeck,
  rowboat,
  fume_sail: fumeSail,
  sail_cleat: sailCleat,
  tied_ropes: tiedRopes,
  pickle_barrel: pickleBarrel,
  brine_crock: brineCrock,
  eel_jar: eelJar,
  note_no_eel: noteNoEel,
  sign_no_garrick: signNoGarrick,
  rag_hooks: ragHooks,
  shackle_chain: shackleChain,
  perch,
  knitting_basket: knittingBasket,
};

/** Treasure props that get a contaminated "_foul" twin. */
export const FOUL_SOURCES = [
  'gold_pile', 'coin_pile', 'gold_bars', 'goblet_stand', 'idol', 'crown_cushion', 'treasure_chest', 'treasure_chest_small',
  'strongbox', 'shield_wall', 'jewel_pile', 'pearl_bowl', 'necklace_stand', 'gold_statue', 'silver_pile', 'artifact_mirror',
  'sword_trophy', 'coin_scatter', 'treasure_chest_open', 'crown_loose', 'tapestry', 'chest_broken', 'candelabra',
];

/** Adds "<id>_foul" painters for every source found in `painters`. */
export function withFoulTwins(painters) {
  const out = { ...painters };
  FOUL_SOURCES.forEach((id, i) => {
    if (painters[id]) out[`${id}_foul`] = foulProp(painters[id], i * 13 + 3);
  });
  return out;
}
