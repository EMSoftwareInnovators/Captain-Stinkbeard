import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { flyingShark } from './stagePhase6.js';

/**
 * Stage sprites for Story Phase 9: the rowboat the captain rows through the
 * reef to Crownskull Isle (seen from above, Squawks in the bow, facing each
 * way, in two layers so he sits inside it), and the Great Sharkstorm's
 * sharks once it has the Crimson Fortune: a pearl necklace on one, a gold
 * chain on a hammerhead, a tiara, rings round the teeth. Readable, silly,
 * never cruel.
 */
const INK = PAL.ink;
const WOOD = { d: '#5a3818', m: '#7c5226', l: '#a07038', h: '#c09050' };
const GOLD = { d: '#9a6a10', m: '#e0b030', l: '#f8e070' };
const PEARL = '#f4f0e8';
const RUBY = '#d02838';
const EMERALD = '#28a050';

// The rowboat round the captain. Both layers share one canvas with the seat
// (his hips) at its exact centre, so the actor draws them at one point.
const BOAT_HALF = { w: 34, h: 34 };
const SEAT = { x: BOAT_HALF.w, y: BOAT_HALF.h };
const PLANK = '#4a2e14';

/** Half the beam at t (0 = stern, 1 = bow): a square-ish transom, a pointed bow. */
function beamAt(t) {
  if (t < 0.08) return 0.8 + t * 2.5;
  if (t < 0.55) return 1;
  return Math.max(0, Math.cos(((t - 0.55) / 0.45) * Math.PI / 2)) ** 0.75;
}

/**
 * The captain's rowboat, seen from above at the game's slant, bow towards
 * `dir`. He sits a little aft of the middle with an oar out each side;
 * Squawks rides in the bow in his padded pouch, bald and grim. The near
 * side shows its planks. Returns { back, front }: the front layer is the
 * part of the boat nearer the camera than his seat, drawn over him so he
 * sits in it rather than on it.
 */
function rowboat(dir) {
  const vertical = dir === 'up' || dir === 'down';
  const len = vertical ? 50 : 56;
  const beam = vertical ? 30 : 20; // across, as the camera sees it
  const wall = vertical ? 3 : 5; // the near side's planks
  const seatT = 0.36;
  const sign = dir === 'up' || dir === 'left' ? -1 : 1; // the bow is this way along the axis
  const c = new PixelCanvas(BOAT_HALF.w * 2, BOAT_HALF.h * 2);
  // boat coordinates (t along, u across, -1..1) to canvas pixels
  const at = (t, u) => {
    const a = SEAT[vertical ? 'y' : 'x'] + sign * (t - seatT) * len;
    const b = SEAT[vertical ? 'x' : 'y'] + u * (beam / 2);
    return vertical ? [Math.round(b), Math.round(a)] : [Math.round(a), Math.round(b)];
  };
  // the hull from above
  const hull = new PixelCanvas(c.width, c.height);
  for (let i = 0; i <= len; i++) {
    const t = i / len;
    const half = beamAt(t);
    if (half <= 0) continue;
    const [x0, y0] = at(t, -half);
    const [x1, y1] = at(t, half);
    if (vertical) hull.hline(x0, x1, y0, WOOD.m);
    else hull.vline(x0, y0, y1, WOOD.m);
  }
  // the near side: the planks below the lowest edge of each column
  for (let x = 0; x < c.width; x++) {
    let low = -1;
    for (let y = c.height - 1; y >= 0; y--) if (hull.alphaAt(x, y)) { low = y; break; }
    if (low < 0) continue;
    for (let k = 1; k <= wall; k++) c.set(x, low + k, k === wall ? WOOD.d : k === 1 ? WOOD.l : PLANK);
  }
  c.blit(hull, 0, 0);
  // the floor inside, darker, with a light gunwale round it
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (!hull.alphaAt(x, y)) continue;
      const inner = hull.alphaAt(x - 2, y) && hull.alphaAt(x + 2, y) && hull.alphaAt(x, y - 2) && hull.alphaAt(x, y + 2);
      c.set(x, y, inner ? ((vertical ? x : y) % 4 === 0 ? PLANK : WOOD.d) : y < SEAT.y ? WOOD.h : WOOD.l);
    }
  }
  // thwarts: his seat, and one forward
  for (const t of [seatT - 0.05, 0.66]) {
    const half = beamAt(t) * 0.86;
    const [x0, y0] = at(t, -half);
    const [x1, y1] = at(t, half);
    if (vertical) c.rect(x0, y0 - 1, x1 - x0 + 1, 3, WOOD.h);
    else c.rect(x0 - 1, y0, 3, y1 - y0 + 1, WOOD.h);
  }
  // the oars, out over each side from his hands
  for (const u of [-1, 1]) {
    const [hx, hy] = at(seatT + 0.04, u * 0.55);
    const [bx, by] = at(seatT - 0.12, u * 1.75);
    c.thickLine(hx, hy, bx, by, 1, WOOD.h);
    if (vertical) c.rect(bx - 2, by - 3, 4, 6, WOOD.l);
    else c.rect(bx - 3, by - 1, 6, 3, WOOD.l);
  }
  // Squawks in the bow, in his padded pouch
  const [sx, sy] = at(0.84, 0);
  c.ellipse(sx, sy + 1, 3, 2, '#c09060');
  c.ellipse(sx, sy - 1, 2, 2, '#e8c8b0');
  c.set(sx + (dir === 'left' ? -1 : 1), sy - 2, INK);
  c.set(sx + (dir === 'left' ? -2 : 2), sy - 1, '#e8a020');
  c.outline(INK);
  // the front layer: everything nearer the camera than his seat
  const front = c.clone();
  for (let y = 0; y <= SEAT.y + (vertical ? 1 : 0); y++) for (let x = 0; x < c.width; x++) front.set(x, y, null);
  return { back: c, front };
}

/** The storm's sharks, wearing the Crimson Fortune. */
function blinged(kind, frame) {
  const c = flyingShark(frame);
  if (kind === 'pearls') {
    // a pearl necklace round the gills
    for (let i = 0; i < 6; i++) c.set(8 + i, 11 + (i % 2), PEARL);
  } else if (kind === 'chain') {
    // a hammerhead's head, and a fat gold chain
    c.rect(1, 3, 3, 10, '#5a6a80');
    c.set(1, 3, '#0a0a10');
    c.set(1, 12, '#0a0a10');
    for (let i = 0; i < 7; i++) c.set(7 + i, 10 + (i % 2), i % 2 ? GOLD.m : GOLD.l);
    c.set(10, 12, GOLD.d);
  } else if (kind === 'tiara') {
    // a tiara on top, slightly crooked
    for (let i = 0; i < 6; i++) c.set(6 + i, 3 - (i % 2), GOLD.m);
    c.set(8, 1, RUBY);
    c.set(10, 1, EMERALD);
  } else if (kind === 'rings') {
    // rings round the teeth, bracelets on the fins
    c.set(4, 7, GOLD.l);
    c.set(6, 7, GOLD.l);
    c.set(6, 10, GOLD.m);
    c.set(8, 13, GOLD.m);
    c.set(9, 13, GOLD.l);
  }
  // a glint
  c.set(frame ? 14 : 12, 5, '#ffffff');
  return c;
}

export const BLING = ['pearls', 'chain', 'tiara', 'rings'];

export function addPhase9StageFrames(atlas) {
  for (const dir of ['up', 'down', 'left', 'right']) {
    const boat = rowboat(dir);
    atlas.add(`rowboat_top_${dir}`, boat.back);
    atlas.add(`rowboat_top_${dir}_front`, boat.front);
  }
  for (const kind of BLING) for (const f of [0, 1]) atlas.add(`flying_shark_${kind}_${f}`, blinged(kind, f));
}

export const PHASE9_STAGE_FRAMES = [
  ...['up', 'down', 'left', 'right'].flatMap((d) => [`rowboat_top_${d}`, `rowboat_top_${d}_front`]),
  ...BLING.flatMap((k) => [`flying_shark_${k}_0`, `flying_shark_${k}_1`]),
];
