import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { planksV, planksH, specks, edgeShadow, rand } from './tileHelpers.js';
import { ISLAND_TILE_PAINTERS } from './islandTiles.js';

/**
 * Painters for every frame of the "ship" tileset (16x16 each).
 * Frame names are referenced by data/tilesets/ship.json; the atlas order is
 * the order listed there.
 */
const VOID = '#07060b';
const DECK = [PAL.deck1, PAL.deck2, PAL.deck3, PAL.deck4, PAL.deck5];
const QDECK = [PAL.deck1, PAL.deck3, PAL.deck4, PAL.deck4, PAL.deck5];
const FLOOR = [PAL.wood1, PAL.wood2, PAL.wood3, PAL.wood3, PAL.wood4];
const HOLD = [PAL.hull0, PAL.hull1, PAL.hull2, PAL.hull2, PAL.hull3];
const PANEL = [PAL.wood1, PAL.wood2, PAL.wood3, PAL.wood3, PAL.wood4];
const HULLP = [PAL.hull0, PAL.hull1, PAL.hull2, PAL.hull3, PAL.hull4];

function deck(seed, ramp = DECK) {
  return (c) => {
    planksV(c, ramp, { seed });
    specks(c, [ramp[1], ramp[3]], 0.05, `${seed}g`);
    // nail heads near plank ends
    for (let px = 0; px < 16; px += 4) if (rand(seed, 'nail', px) < 0.35) c.set(px + 2, Math.floor(rand(seed, 'ny', px) * 14) + 1, ramp[0]);
  };
}

function floor(seed, ramp = FLOOR) {
  return (c) => {
    planksH(c, ramp, { seed });
    specks(c, [ramp[1], ramp[3]], 0.04, `${seed}g`);
  };
}

function hold(seed) {
  return (c) => {
    planksH(c, HOLD, { seed, plank: 4 });
    specks(c, [PAL.hull0, PAL.hull3, '#2a2a22'], 0.07, `${seed}g`);
  };
}

function panelWall(c, ramp = PANEL, seed = 'panel') {
  planksV(c, ramp, { seed, plank: 4, joints: false });
  // grain streaks
  for (let x = 1; x < 16; x += 4) if (rand(seed, 'streak', x) < 0.5) c.vline(x + 1, 3, 9, ramp[1]);
}

function wallTop(c, ramp = PANEL) {
  panelWall(c, ramp);
  c.rect(0, 0, 16, 4, PAL.hull1); // ceiling beam underside
  c.hline(0, 15, 0, PAL.hull0);
  c.hline(0, 15, 3, PAL.hull3);
  c.rect(0, 4, 16, 2, ramp[3]); // crown moulding
  c.hline(0, 15, 4, ramp[4]);
  c.hline(0, 15, 6, ramp[0]);
  edgeShadow(c, 'top', 2, PAL.hull1, { y0: 7, h: 9 });
}

function wallBottom(c, ramp = PANEL) {
  panelWall(c, ramp);
  c.rect(0, 10, 16, 5, ramp[1]); // baseboard
  c.hline(0, 15, 10, ramp[4]);
  c.hline(0, 15, 11, ramp[2]);
  c.hline(0, 15, 14, ramp[0]);
  c.hline(0, 15, 15, VOID);
}

function sideEdge(c, mirror) {
  c.fill(VOID);
  for (let y = 0; y < 16; y++) {
    for (let i = 0; i < 6; i++) {
      const x = mirror ? 5 - i : 10 + i;
      let col = PAL.hull3;
      if (i === 0) col = PAL.hull4;
      if (i === 5) col = PAL.hull1;
      if (y % 8 === 0) col = PAL.hull2;
      c.set(x, y, col);
    }
  }
}

function cap(c, { left = false, right = false } = {}) {
  c.fill(VOID);
  c.hline(0, 15, 0, PAL.hull0);
  c.rect(0, 1, 16, 4, PAL.hull3);
  c.hline(0, 15, 1, PAL.hull4);
  c.hline(0, 15, 5, PAL.hull1);
  if (left) {
    c.rect(0, 0, 10, 16, VOID);
    c.rect(10, 0, 6, 6, PAL.hull3);
    c.vline(10, 0, 5, PAL.hull4);
    c.hline(10, 15, 5, PAL.hull1);
  }
  if (right) {
    c.rect(6, 0, 10, 16, VOID);
    c.rect(0, 0, 6, 6, PAL.hull3);
    c.vline(5, 0, 5, PAL.hull1);
    c.hline(0, 5, 1, PAL.hull4);
  }
}

function capDoor(c) {
  planksH(c, FLOOR, { seed: 'capdoor' });
  for (let y = 6; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 2 === 0 || y > 11) c.set(x, y, y > 13 ? VOID : PAL.hull0);
  c.rect(0, 0, 2, 16, PAL.hull3);
  c.rect(14, 0, 2, 16, PAL.hull3);
  c.vline(0, 0, 15, PAL.hull4);
  c.vline(15, 0, 15, PAL.hull1);
}

function door(c, part, { heavy = false } = {}) {
  const planks = heavy ? [PAL.hull0, PAL.hull2, PAL.hull3, PAL.hull3, PAL.hull4] : [PAL.wood1, PAL.wood2, PAL.wood3, PAL.wood4, PAL.wood4];
  panelWall(c);
  c.rect(1, 0, 14, 16, PAL.hull1); // frame
  planksV(c, planks, { seed: heavy ? 'hd' : 'd', plank: 3, x0: 3, w: 10, joints: false });
  c.vline(2, 0, 15, PAL.hull3);
  c.vline(13, 0, 15, PAL.hull0);
  if (part === 'top') {
    c.rect(1, 0, 14, 3, PAL.hull2);
    c.hline(1, 14, 0, PAL.hull3);
    c.hline(3, 12, 3, PAL.hull0);
    c.rect(3, 6, 10, 2, heavy ? PAL.iron2 : PAL.iron1);
    c.hline(3, 12, 6, PAL.iron3);
    if (heavy) for (let x = 4; x < 13; x += 3) c.set(x, 7, PAL.iron4);
  } else {
    c.rect(3, 8, 10, 2, heavy ? PAL.iron2 : PAL.iron1);
    c.hline(3, 12, 8, PAL.iron3);
    if (heavy) {
      for (let x = 4; x < 13; x += 3) c.set(x, 9, PAL.iron4);
      c.rect(6, 2, 4, 4, PAL.gold2); // padlock
      c.strokeRect(6, 2, 4, 4, PAL.gold0);
      c.set(7, 1, PAL.gold1); c.set(8, 1, PAL.gold1); c.set(8, 4, PAL.gold0);
    } else {
      c.set(11, 4, PAL.gold3); c.set(11, 5, PAL.gold1); c.set(10, 5, PAL.gold2);
    }
    c.rect(1, 14, 14, 2, VOID);
    c.hline(2, 13, 13, PAL.hull0);
  }
}

function cabinDoor(c, part) {
  // Double doors in the break of the quarterdeck: painted panels, brass trim, glazing.
  const left = part.endsWith('l');
  const top = part.startsWith('t');
  c.fill(PAL.red1);
  const ramp = [PAL.red0, PAL.red1, PAL.red2, PAL.red3];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) c.set(x, y, ramp[1 + ((x + (left ? 0 : 1)) % 5 === 0 ? -1 : 0)]);
  const inner = left ? 15 : 0;
  c.vline(inner, 0, 15, PAL.gold1);
  c.vline(left ? 0 : 15, 0, 15, PAL.hull2);
  c.vline(left ? 1 : 14, 0, 15, PAL.hull3);
  if (top) {
    c.rect(0, 0, 16, 3, PAL.hull2);
    c.hline(0, 15, 0, PAL.hull3);
    c.hline(0, 15, 2, PAL.gold2);
    // window panes
    const wx = left ? 4 : 3;
    c.rect(wx, 5, 9, 9, PAL.gold1);
    c.rect(wx + 1, 6, 7, 7, '#2a4c6c');
    c.rect(wx + 1, 6, 3, 3, '#6aa0c0');
    c.set(wx + 1, 6, '#b8e0f0');
    c.vline(wx + 4, 6, 12, PAL.gold1);
    c.hline(wx + 1, wx + 7, 9, PAL.gold1);
  } else {
    const px = left ? 4 : 3;
    c.strokeRect(px, 1, 9, 9, PAL.red3);
    c.strokeRect(px + 1, 2, 7, 7, PAL.red0);
    c.set(left ? 13 : 2, 7, PAL.gold4);
    c.set(left ? 13 : 2, 8, PAL.gold1);
    c.rect(0, 13, 16, 3, VOID);
    c.hline(0, 15, 12, PAL.hull1);
  }
}

function ladder(c, part) {
  if (part === 'top') {
    c.fill(VOID);
    c.rect(2, 0, 12, 16, '#3a4a56');
    for (let y = 0; y < 16; y++) for (let x = 3; x < 13; x++) if ((x + y) % 2 === 0 && y < 8) c.set(x, y, '#6a8494');
    c.rect(2, 0, 12, 2, '#a8c8d4');
    c.vline(1, 0, 15, PAL.hull2);
    c.vline(14, 0, 15, PAL.hull2);
  } else {
    panelWall(c);
    if (part === 'bottom') {
      c.rect(0, 12, 16, 4, PAL.wood1);
      c.hline(0, 15, 12, PAL.wood4);
    }
  }
  for (const x of [3, 12]) {
    c.vline(x, 0, 15, PAL.rope2);
    c.vline(x + 1, 0, 15, PAL.rope1);
  }
  for (let y = 2; y < 16; y += 4) {
    c.hline(4, 11, y, PAL.rope3);
    c.hline(4, 11, y + 1, PAL.rope1);
  }
}

function wallStairs(c, part) {
  // Stairs climbing up the wall face toward an opening (light from above).
  const [row, side] = part.split('');
  const col = side === 'l' ? 0 : 1;
  const depth = { t: 0, m: 1, b: 2 }[row];
  c.fill(VOID);
  for (let y = 0; y < 16; y += 4) {
    const shade = depth * 16 + y;
    const tread = shade < 12 ? '#8aa4b0' : shade < 24 ? PAL.wood4 : PAL.wood3;
    const riser = shade < 12 ? '#50646e' : shade < 24 ? PAL.wood2 : PAL.wood1;
    c.rect(0, y, 16, 2, tread);
    c.rect(0, y + 2, 16, 2, riser);
  }
  if (col === 0) c.rect(0, 0, 2, 16, PAL.hull2);
  else c.rect(14, 0, 2, 16, PAL.hull2);
  if (row === 't') c.rect(0, 0, 16, 3, '#c0dce4');
}

function stairwell(c, part) {
  planksH(c, FLOOR, { seed: 'sw' });
  const left = part.endsWith('l');
  const top = part.startsWith('t');
  const x0 = left ? 3 : 0;
  const x1 = left ? 15 : 12;
  const y0 = top ? 3 : 0;
  const y1 = top ? 15 : 12;
  for (let y = y0; y <= y1; y++) {
    const band = Math.floor(((top ? 0 : 16) + y) / 4);
    const col = [VOID, PAL.hull0, PAL.hull1, PAL.hull2, PAL.hull2, PAL.hull3, PAL.hull3, PAL.hull4][Math.min(7, band)];
    for (let x = x0; x <= x1; x++) c.set(x, y, (((top ? 0 : 16) + y) % 4 === 3) ? PAL.hull0 : col);
  }
  // coaming frame
  if (top) c.hline(x0 - 1 < 0 ? 0 : x0 - 1, x1, y0 - 1, PAL.wood4);
  if (!top) c.hline(x0, x1, y1 + 1, PAL.wood1);
  if (left) c.vline(x0 - 1, y0, y1, PAL.wood4);
  else c.vline(x1 + 1, y0, y1, PAL.wood1);
}

function hatch(c, side) {
  planksV(c, DECK, { seed: `hatch${side}` });
  const left = side === 'l';
  const x0 = left ? 3 : 0;
  const x1 = left ? 15 : 12;
  c.rect(x0, 3, x1 - x0 + 1, 10, VOID);
  c.rect(x0, 3, x1 - x0 + 1, 3, PAL.hull0);
  // coaming (raised frame)
  c.hline(left ? 1 : 0, left ? 15 : 14, 1, PAL.deck5);
  c.hline(left ? 1 : 0, left ? 15 : 14, 2, PAL.deck3);
  c.hline(left ? 1 : 0, left ? 15 : 14, 13, PAL.deck2);
  c.hline(left ? 1 : 0, left ? 15 : 14, 14, PAL.deck1);
  if (left) {
    c.vline(1, 1, 14, PAL.deck5);
    c.vline(2, 1, 14, PAL.deck3);
  } else {
    c.vline(13, 1, 14, PAL.deck2);
    c.vline(14, 1, 14, PAL.deck1);
  }
  // ladder top rungs
  const lx = left ? 9 : 2;
  c.vline(lx, 3, 12, PAL.rope2);
  c.vline(lx + 6, 3, 12, PAL.rope2);
  for (let y = 5; y < 13; y += 3) c.hline(lx, lx + 6, y, PAL.rope3);
}

function grate(c, part) {
  planksV(c, DECK, { seed: `gr${part}` });
  const left = part.endsWith('l');
  const top = part.startsWith('t');
  const x0 = left ? 2 : 0;
  const x1 = left ? 15 : 13;
  const y0 = top ? 2 : 0;
  const y1 = top ? 15 : 13;
  c.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, PAL.hull0);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x % 4 === 1 || y % 4 === 1) c.set(x, y, (x % 4 === 1) ? PAL.deck3 : PAL.deck4);
  if (top) c.hline(x0 - (left ? 1 : 0), x1, y0 - 1, PAL.deck5);
  if (!top) c.hline(x0, x1, y1 + 1, PAL.deck1);
  if (left) c.vline(x0 - 1, y0, y1, PAL.deck5);
  else c.vline(x1 + 1, y0, y1, PAL.deck1);
}

function rail(c, side, variant = null) {
  const mirror = side === 'r';
  const px = (x) => (mirror ? 15 - x : x);
  planksV(c, DECK, { seed: `rail${side}` });
  for (let y = 0; y < 16; y++) {
    // hull outer strip, cap, inner edge, then cast shadow on deck
    c.set(px(0), y, PAL.hull1);
    c.set(px(1), y, PAL.hull2);
    for (let x = 2; x <= 6; x++) c.set(px(x), y, x === 2 ? PAL.wood5 : x === 6 ? PAL.wood2 : PAL.wood4);
    c.set(px(7), y, PAL.hull1);
    if ((y % 2 === 0)) c.set(px(8), y, PAL.deck1);
    if (y % 4 === 0) c.set(px(9), y, PAL.deck2);
  }
  // rail cap joints
  c.hline(px(2), px(6), 7, PAL.wood3);
  if (variant === 'port') {
    c.rect(mirror ? 15 - 7 : 0, 4, 8, 8, VOID);
    for (let x = 0; x <= 7; x++) c.set(px(x), 3, PAL.wood2);
    for (let x = 0; x <= 7; x++) c.set(px(x), 12, PAL.wood5);
  }
  if (variant === 'chain') {
    for (const y of [3, 11]) {
      c.set(px(0), y, PAL.iron3);
      c.set(px(0), y + 1, PAL.iron2);
      c.set(px(1), y, PAL.iron4);
      c.set(px(3), y, PAL.lea2);
      c.set(px(4), y, PAL.lea3);
      c.set(px(3), y + 1, PAL.lea1);
      c.set(px(4), y + 1, PAL.lea2);
    }
  }
}

function taffrail(c, part) {
  // Stern rail seen from inside: cap on top, planked bulwark face, shadow on deck.
  planksV(c, DECK, { seed: `taff${part}` });
  c.rect(0, 0, 16, 4, PAL.wood4);
  c.hline(0, 15, 0, PAL.wood5);
  c.hline(0, 15, 3, PAL.wood2);
  planksV(c, PANEL, { seed: 'taffp', plank: 4, y0: 4, h: 9, joints: false });
  c.hline(0, 15, 12, PAL.wood1);
  c.hline(0, 15, 13, PAL.deck1);
  for (let x = 0; x < 16; x += 2) c.set(x, 14, PAL.deck1);
  if (part === 'l') {
    c.rect(0, 0, 8, 16, 'transparent');
    rail(c, 'l');
    c.rect(0, 0, 16, 4, PAL.wood4);
    c.hline(0, 15, 0, PAL.wood5);
    c.hline(0, 15, 3, PAL.wood2);
    c.rect(0, 0, 2, 4, PAL.hull2);
  }
  if (part === 'r') {
    rail(c, 'r');
    c.rect(0, 0, 16, 4, PAL.wood4);
    c.hline(0, 15, 0, PAL.wood5);
    c.hline(0, 15, 3, PAL.wood2);
    c.rect(14, 0, 2, 4, PAL.hull2);
  }
}

function balustrade(c, part) {
  planksV(c, QDECK, { seed: `bal${part}` });
  c.rect(0, 13, 16, 3, PAL.wood1); // deck edge
  c.hline(0, 15, 13, PAL.wood4);
  c.rect(0, 5, 16, 3, PAL.wood4); // hand rail
  c.hline(0, 15, 5, PAL.wood5);
  c.hline(0, 15, 7, PAL.wood2);
  for (let x = 1; x < 16; x += 4) {
    c.vline(x, 8, 12, PAL.wood4);
    c.vline(x + 1, 8, 12, PAL.wood2);
    c.set(x, 10, PAL.wood5);
  }
  if (part === 'l' || part === 'r') {
    const x = part === 'l' ? 12 : 0;
    c.rect(x, 2, 4, 12, PAL.wood3);
    c.vline(x, 2, 13, PAL.wood5);
    c.vline(x + 3, 2, 13, PAL.wood1);
    c.rect(x - 1, 1, 6, 2, PAL.wood4);
    c.hline(x - 1, x + 4, 1, PAL.gold3);
    if (part === 'l') c.rect(0, 0, 12, 16, 'transparent');
    else c.rect(4, 0, 12, 16, 'transparent');
  }
}

function breakWall(c, part) {
  // Front of the quarterdeck: panelled, painted trim.
  panelWall(c, [PAL.wood1, PAL.wood2, PAL.wood3, PAL.wood3, PAL.wood4], 'bw');
  if (part === 'top' || part === 'win') {
    c.rect(0, 0, 16, 3, PAL.wood4);
    c.hline(0, 15, 0, PAL.gold3);
    c.hline(0, 15, 2, PAL.wood1);
  }
  if (part === 'win') {
    c.rect(3, 5, 10, 8, PAL.hull1);
    c.rect(4, 6, 8, 6, '#2a4c6c');
    c.rect(4, 6, 3, 3, '#6aa0c0');
    c.vline(8, 6, 11, PAL.hull1);
    c.hline(4, 11, 9, PAL.hull1);
    c.hline(2, 13, 13, PAL.wood4);
  }
  if (part === 'bot') {
    c.rect(0, 10, 16, 5, PAL.wood2);
    c.hline(0, 15, 10, PAL.wood4);
    c.hline(0, 15, 14, PAL.wood1);
    c.hline(0, 15, 15, PAL.deck1);
  }
}

function deckStep(c, side) {
  c.fill(PAL.deck2);
  for (let y = 0; y < 16; y += 4) {
    c.rect(0, y, 16, 2, PAL.deck4);
    c.hline(0, 15, y, PAL.deck5);
    c.rect(0, y + 2, 16, 2, PAL.deck2);
    c.hline(0, 15, y + 3, PAL.deck1);
  }
  const x = side === 'l' ? 0 : 13;
  c.rect(x, 0, 3, 16, PAL.wood3);
  c.vline(x, 0, 15, side === 'l' ? PAL.wood5 : PAL.wood2);
  c.vline(x + 2, 0, 15, PAL.wood1);
}

function railDiagonal(c, side) {
  // Bow rail running diagonally; outside the hull stays transparent (ocean shows).
  planksV(c, DECK, { seed: `diag${side}` });
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const u = side === 'l' ? x - y : 15 - x - y;
      if (u < -7) c.set(x, y, 'transparent');
      else if (u < -5) c.set(x, y, (x + y) % 3 === 0 ? PAL.foam : PAL.sea5);
      else if (u < -2) c.set(x, y, u === -5 ? PAL.hull1 : PAL.hull2);
      else if (u < 3) c.set(x, y, u === -2 ? PAL.wood5 : u === 2 ? PAL.wood2 : PAL.wood4);
      else if (u === 3) c.set(x, y, PAL.hull1);
      else if (u === 4 && (x + y) % 2 === 0) c.set(x, y, PAL.deck1);
    }
  }
}

function hullSide(c, side, frame) {
  const mirror = side === 'r';
  const px = (x) => (mirror ? 15 - x : x);
  for (let y = 0; y < 16; y++) {
    c.set(px(15), y, PAL.hull2);
    c.set(px(14), y, y % 5 === 0 ? PAL.hull1 : PAL.hull3);
    c.set(px(13), y, PAL.hull1);
    const wave = Math.round(Math.sin((y + frame * 5) * 0.9) * 1.2);
    const fx = 12 + Math.min(0, wave);
    c.set(px(fx), y, PAL.foam);
    c.set(px(fx - 1), y, (y + frame) % 3 === 0 ? PAL.foam : PAL.sea6);
    if ((y + frame * 2) % 4 === 0) c.set(px(fx - 2), y, PAL.sea5);
  }
}

function brick(c) {
  c.fill(PAL.red1);
  for (let y = 0; y < 16; y += 4) {
    const off = (y / 4) % 2 === 0 ? 0 : 4;
    c.hline(0, 15, y + 3, '#2a1410');
    for (let x = off; x < 16 + 8; x += 8) {
      c.vline((x + 7) % 16, y, y + 2, '#2a1410');
      c.hline(x % 16, Math.min(15, (x % 16) + 5), y, '#b85a3a');
    }
  }
  specks(c, ['#5a2418', '#c86848'], 0.06, 'brick');
}

function hullWall(c, part) {
  // Hold walls: rough hull planking with heavy ribs.
  planksH(c, HULLP, { seed: `hw${part}`, plank: 4 });
  for (const x of [0, 1, 14, 15]) c.vline(x, 0, 15, x === 0 || x === 15 ? PAL.hull1 : PAL.hull3);
  c.vline(1, 0, 15, PAL.hull4);
  if (part === 'top') {
    c.rect(0, 0, 16, 4, PAL.hull0);
    c.hline(0, 15, 3, PAL.hull2);
    c.rect(0, 4, 16, 2, PAL.hull3);
    c.hline(0, 15, 4, PAL.hull4);
  }
  if (part === 'bot') {
    c.rect(0, 12, 16, 4, PAL.hull1);
    c.hline(0, 15, 12, PAL.hull3);
    c.hline(0, 15, 15, VOID);
    specks(c, ['#3a4a3a', PAL.hull0], 0.15, 'hwbot', { y0: 12, h: 4 });
  }
}

function diagFloor(c, side, base) {
  base(c);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const u = side === 'l' ? x - y : 15 - x - y;
      if (u < -3) c.set(x, y, VOID);
      else if (u < 3) c.set(x, y, u === -3 ? PAL.hull1 : u === 2 ? PAL.hull1 : u === -2 ? PAL.hull4 : PAL.hull3);
    }
  }
}

export const SHIP_TILE_PAINTERS = {
  void: (c) => c.fill(VOID),
  deck_a: deck('da'),
  deck_b: deck('db'),
  deck_c: deck('dc'),
  deck_d: deck('dd'),
  qdeck_a: deck('qa', QDECK),
  qdeck_b: deck('qb', QDECK),
  qdeck_c: deck('qc', QDECK),
  floor_a: floor('fa'),
  floor_b: floor('fb'),
  floor_c: floor('fc'),
  hold_a: hold('ha'),
  hold_b: hold('hb'),
  hold_c: hold('hc'),
  hold_wet: (c) => {
    hold('hw')(c);
    c.ellipse(8, 9, 6, 3.5, '#1c2a34');
    c.ellipse(7, 8, 3, 1.5, '#34506a');
    c.hline(5, 7, 8, '#8ab0c8');
    c.set(10, 10, '#4a6a82');
  },
  brick: brick,
  wall_top: (c) => wallTop(c),
  wall_mid: (c) => panelWall(c),
  wall_bot: (c) => wallBottom(c),
  wall_single: (c) => {
    wallTop(c);
    c.rect(0, 11, 16, 5, PAL.wood1);
    c.hline(0, 15, 11, PAL.wood4);
    c.hline(0, 15, 15, VOID);
  },
  wall_port: (c) => {
    panelWall(c);
    c.ellipse(8, 8, 6, 6, PAL.gold1);
    c.ellipse(8, 8, 5, 5, PAL.gold3);
    c.ellipse(8, 8, 4, 4, '#1e4466');
    c.ellipse(8, 9, 3, 2, '#2c6088');
    c.set(6, 6, '#bfe4f4');
    c.set(7, 6, '#7ab8d8');
    c.set(6, 7, '#7ab8d8');
    c.set(12, 8, PAL.gold4);
  },
  hwall_top: (c) => hullWall(c, 'top'),
  hwall_mid: (c) => hullWall(c, 'mid'),
  hwall_bot: (c) => hullWall(c, 'bot'),
  side_l: (c) => sideEdge(c, false),
  side_r: (c) => sideEdge(c, true),
  cap: (c) => cap(c),
  cap_l: (c) => cap(c, { left: true }),
  cap_r: (c) => cap(c, { right: true }),
  cap_door: capDoor,
  diag_l: (c) => diagFloor(c, 'l', floor('dgl')),
  diag_r: (c) => diagFloor(c, 'r', floor('dgr')),
  hdiag_l: (c) => diagFloor(c, 'l', hold('hdl')),
  hdiag_r: (c) => diagFloor(c, 'r', hold('hdr')),
  door_top: (c) => door(c, 'top'),
  door_bot: (c) => door(c, 'bot'),
  tdoor_top: (c) => door(c, 'top', { heavy: true }),
  tdoor_bot: (c) => door(c, 'bot', { heavy: true }),
  cdoor_tl: (c) => cabinDoor(c, 'tl'),
  cdoor_tr: (c) => cabinDoor(c, 'tr'),
  cdoor_bl: (c) => cabinDoor(c, 'bl'),
  cdoor_br: (c) => cabinDoor(c, 'br'),
  ladder_top: (c) => ladder(c, 'top'),
  ladder_mid: (c) => ladder(c, 'mid'),
  ladder_bot: (c) => ladder(c, 'bottom'),
  wstair_tl: (c) => wallStairs(c, 'tl'),
  wstair_tr: (c) => wallStairs(c, 'tr'),
  wstair_ml: (c) => wallStairs(c, 'ml'),
  wstair_mr: (c) => wallStairs(c, 'mr'),
  wstair_bl: (c) => wallStairs(c, 'bl'),
  wstair_br: (c) => wallStairs(c, 'br'),
  stairwell_tl: (c) => stairwell(c, 'tl'),
  stairwell_tr: (c) => stairwell(c, 'tr'),
  stairwell_bl: (c) => stairwell(c, 'bl'),
  stairwell_br: (c) => stairwell(c, 'br'),
  hatch_l: (c) => hatch(c, 'l'),
  hatch_r: (c) => hatch(c, 'r'),
  grate_tl: (c) => grate(c, 'tl'),
  grate_tr: (c) => grate(c, 'tr'),
  grate_bl: (c) => grate(c, 'bl'),
  grate_br: (c) => grate(c, 'br'),
  rail_l: (c) => rail(c, 'l'),
  rail_r: (c) => rail(c, 'r'),
  rail_l_port: (c) => rail(c, 'l', 'port'),
  rail_r_port: (c) => rail(c, 'r', 'port'),
  rail_l_chain: (c) => rail(c, 'l', 'chain'),
  rail_r_chain: (c) => rail(c, 'r', 'chain'),
  rail_dl: (c) => railDiagonal(c, 'l'),
  rail_dr: (c) => railDiagonal(c, 'r'),
  taffrail_l: (c) => taffrail(c, 'l'),
  taffrail_m: (c) => taffrail(c, 'm'),
  taffrail_r: (c) => taffrail(c, 'r'),
  qrail_l: (c) => balustrade(c, 'l'),
  qrail_m: (c) => balustrade(c, 'm'),
  qrail_r: (c) => balustrade(c, 'r'),
  bwall_top: (c) => breakWall(c, 'top'),
  bwall_win: (c) => breakWall(c, 'win'),
  bwall_bot: (c) => breakWall(c, 'bot'),
  dstep_l: (c) => deckStep(c, 'l'),
  dstep_r: (c) => deckStep(c, 'r'),
  hullside_l_0: (c) => hullSide(c, 'l', 0),
  hullside_l_1: (c) => hullSide(c, 'l', 1),
  hullside_l_2: (c) => hullSide(c, 'l', 2),
  hullside_r_0: (c) => hullSide(c, 'r', 0),
  hullside_r_1: (c) => hullSide(c, 'r', 1),
  hullside_r_2: (c) => hullSide(c, 'r', 2),
};

/** Paints the frames listed in a tileset definition into a GridSheet-compatible list. */
export function paintTile(name) {
  const painter = SHIP_TILE_PAINTERS[name] ?? ISLAND_TILE_PAINTERS[name];
  if (!painter) throw new Error(`No painter for tile frame "${name}"`);
  const c = new PixelCanvas(16, 16);
  painter(c);
  return c;
}
