import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { planksH, planksV, specks, rand } from '../tiles/tileHelpers.js';
import { barrel, crate } from '../props/deckProps.js';

/**
 * Battle backdrops (320x160, the area above the battle HUD). Side-on views of
 * ship locations with a floor plane for the combatants to stand on.
 */
const W = 320;
const H = 160;

function wallOfPlanks(c, y0, y1, ramp, seed) {
  for (let x = 0; x < W; x += 16) planksH(c, ramp, { seed: `${seed}${x}`, x0: x, y0, w: 16, h: y1 - y0, plank: 5 });
}

function floorPerspective(c, y0, ramp, seed) {
  // Planks converging slightly toward the horizon for depth.
  for (let y = y0; y < H; y++) {
    const t = (y - y0) / (H - y0);
    const band = Math.floor(t * 9);
    for (let x = 0; x < W; x++) {
      const u = (x - W / 2) / (W / 2);
      const seam = Math.abs(Math.round((u * (0.6 + t * 0.9)) * 7) - (u * (0.6 + t * 0.9)) * 7) < 0.05 + t * 0.02;
      let col = band % 2 ? ramp[2] : ramp[3];
      if (seam) col = ramp[0];
      if (rand(seed, x >> 2, y) < 0.03) col = ramp[1];
      c.set(x, y, col);
    }
  }
  for (let x = 0; x < W; x++) c.set(x, y0, ramp[4]);
}

function lanternGlow(c, x, y, r) {
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      const d = Math.sqrt(i * i + j * j) / r;
      if (d > 1) continue;
      const band = d < 0.35 ? 0.35 : d < 0.65 ? 0.2 : 0.1;
      if ((i + j) % 2 === 0 || d < 0.65) c.blend(x + i, y + j, PAL.fire3, band);
    }
  }
  c.rect(x - 3, y - 4, 6, 8, PAL.gold1);
  c.rect(x - 2, y - 3, 4, 6, PAL.fire3);
  c.vline(x, y - 12, y - 5, PAL.iron2);
}

function cargoHold() {
  const c = new PixelCanvas(W, H);
  const WALL = [PAL.hull0, PAL.hull1, PAL.hull2, PAL.hull2, PAL.hull3];
  wallOfPlanks(c, 0, 92, WALL, 'hw');
  // ribs
  for (let x = 12; x < W; x += 56) {
    c.rect(x, 0, 8, 92, PAL.hull2);
    c.vline(x, 0, 91, PAL.hull4);
    c.vline(x + 7, 0, 91, PAL.hull0);
  }
  // deck beams overhead
  c.rect(0, 0, W, 10, PAL.hull0);
  for (let x = 0; x < W; x += 40) c.rect(x, 0, 10, 14, PAL.hull1);
  // stacked cargo along the wall
  const b = barrel();
  const cr = crate({ stacked: true });
  for (const x of [30, 46, 250, 266]) c.blit(b, x, 70);
  for (const x of [80, 280, 296]) c.blit(cr, x, 57);
  c.blit(crate(), 96, 71);
  floorPerspective(c, 92, [PAL.hull0, PAL.hull1, PAL.hull2, PAL.hull3, PAL.hull4], 'hf');
  // puddles
  c.ellipse(90, 128, 22, 4, '#1c2a30');
  c.ellipse(86, 127, 10, 1.5, '#2e4450');
  c.ellipse(230, 146, 18, 3, '#1c2a30');
  lanternGlow(c, 160, 34, 34);
  lanternGlow(c, 40, 30, 22);
  // darken edges (vignette)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = Math.min(x, W - 1 - x, y * 2);
    if (e < 18 && (x + y) % 2 === 0) c.blend(x, y, '#000000', 0.35);
  }
  return c;
}

function mainDeck() {
  const c = new PixelCanvas(W, H);
  // sky gradient
  const sky = ['#6aa8d8', '#7ab4de', '#8ac0e4', '#9acae8', '#aad4ec', '#bcdcee'];
  for (let y = 0; y < 60; y++) {
    const i = Math.min(sky.length - 1, Math.floor(y / 10));
    for (let x = 0; x < W; x++) c.set(x, y, (y % 10 === 9 && x % 2) ? sky[Math.min(sky.length - 1, i + 1)] : sky[i]);
  }
  // clouds
  for (const [cx, cy, s] of [[60, 18, 1], [210, 12, 1.3], [290, 30, 0.8]]) {
    c.ellipse(cx, cy, 18 * s, 6 * s, '#f4f8fc');
    c.ellipse(cx + 10 * s, cy - 3, 12 * s, 5 * s, '#ffffff');
    c.ellipse(cx - 6, cy + 3, 14 * s, 3 * s, '#dce8f2');
  }
  // sea
  for (let y = 60; y < 78; y++) for (let x = 0; x < W; x++) {
    let col = y < 64 ? PAL.sea4 : y < 70 ? PAL.sea3 : PAL.sea2;
    if (rand('sea', x >> 1, y) < 0.06) col = PAL.sea5;
    c.set(x, y, col);
  }
  // bulwark (ship side) with rail
  c.rect(0, 70, W, 26, PAL.wood2);
  planksH(c, [PAL.wood1, PAL.wood2, PAL.wood3, PAL.wood3, PAL.wood4], { seed: 'bw', w: W, y0: 72, h: 24, plank: 6 });
  c.rect(0, 66, W, 6, PAL.wood4);
  c.hline(0, W - 1, 66, PAL.wood5);
  c.hline(0, W - 1, 71, PAL.wood1);
  for (let x = 6; x < W; x += 24) {
    c.rect(x, 72, 4, 24, PAL.wood3);
    c.vline(x, 72, 95, PAL.wood4);
  }
  // rigging lines
  for (let i = 0; i < 5; i++) c.line(40 + i * 60, 66, 150 + i * 5, 0, PAL.rope1);
  floorPerspective(c, 96, [PAL.deck1, PAL.deck2, PAL.deck3, PAL.deck4, PAL.deck5], 'df');
  return c;
}

function captainsQuarters() {
  const c = new PixelCanvas(W, H);
  const WALL = [PAL.wood1, PAL.wood2, PAL.wood3, PAL.wood3, PAL.wood4];
  for (let x = 0; x < W; x += 16) planksV(c, WALL, { seed: `cq${x}`, x0: x, y0: 0, w: 16, h: 96, plank: 4, joints: false });
  // stern windows
  for (let p = 0; p < 4; p++) {
    const x0 = 40 + p * 64;
    c.rect(x0 - 3, 14, 46, 52, PAL.hull2);
    for (let y = 16; y < 64; y++) for (let x = x0; x < x0 + 40; x++) c.set(x, y, y < 34 ? '#8cc4e0' : y < 40 ? '#b8dcec' : y < 52 ? '#3a78a8' : '#28588a');
    c.vline(x0 + 20, 16, 63, PAL.hull1);
    c.hline(x0, x0 + 39, 38, PAL.hull1);
  }
  c.rect(0, 88, W, 8, PAL.wood2);
  c.hline(0, W - 1, 88, PAL.wood5);
  floorPerspective(c, 96, [PAL.wood1, PAL.wood2, PAL.wood3, PAL.wood3, PAL.wood4], 'cf');
  // rug
  for (let y = 112; y < 150; y++) for (let x = 60; x < 260; x++) if ((x + y) % 1 === 0) c.set(x, y, y === 112 || y === 149 || x === 60 || x === 259 ? PAL.gold2 : PAL.red2);
  return c;
}

export const BACKDROP_PAINTERS = {
  cargo_hold: cargoHold,
  main_deck: mainDeck,
  captains_quarters: captainsQuarters,
};

export function paintBackdrop(name) {
  const painter = BACKDROP_PAINTERS[name];
  if (!painter) throw new Error(`No backdrop "${name}"`);
  const c = painter();
  specks(c, ['#00000020'], 0, 'none');
  return c;
}
