import { PixelCanvas } from '../PixelCanvas.js';
import { PAL, rgba } from '../palette.js';
import { HEAD, FACE_VARIANTS } from './heads.js';
import { HAIR_STYLES } from './hair.js';
import { BEARD_STYLES } from './beards.js';
import { HAT_STYLES } from './hats.js';
import { skinRamp, hairRamp, clothRamp } from './ramps.js';

/**
 * Paper-doll character painter.
 *
 * Bodies are parametric (a "build" sets shoulder width, torso and leg
 * lengths) so a cabin boy and a giant deckhand share one code path; heads,
 * hair, beards and hats are hand-authored templates. Everything is composed
 * in flat shaded colours and finished with an automatic dark outline.
 *
 * Frames are 32x48 with the feet on row 45 (sprite origin: 0.5, 46/48).
 */
export const FRAME_W = 32;
export const FRAME_H = 48;
export const FOOT_Y = 46;
const CX = 16;
const GROUND = 45;
const OUTLINE = PAL.ink;

/**
 * The Grand Stenchmaster's sash (Story Phase 4): made by Garrick, for
 * Garrick, after he invented the office. Mustard silk edged in burgundy,
 * fake-gold trim, a crude embroidered nose-under-a-crown on the chest and a
 * fringe at the hip. He considers it extremely prestigious.
 */
export const SASH = { d: '#9a6e14', m: '#c8982a', l: '#ecc450', edge: '#5e1624', gold: '#f4dc6c', badge: '#6a9a2c', ink: '#2a1a0e' };
/** Story Phase 9: the other half of the two-pack, sky blue, GRAND SHARKMASTER painted on it in white (badly). */
export const BLUE_SASH = { d: '#2a5a9a', m: '#4a86c8', l: '#7ab0e8', edge: '#16284a', gold: '#f0f4f8', badge: '#f0f4f8', ink: '#16284a' };

export const BUILDS = {
  small: { shoulder: 12, waist: 10, torsoH: 9, legH: 9, legW: 4, legGap: 0, armW: 3, bootH: 3 },
  medium: { shoulder: 14, waist: 12, torsoH: 11, legH: 11, legW: 5, legGap: 0, armW: 3, bootH: 4 },
  thin: { shoulder: 12, waist: 10, torsoH: 12, legH: 12, legW: 4, legGap: 0, armW: 3, bootH: 4 },
  stout: { shoulder: 16, waist: 16, torsoH: 11, legH: 9, legW: 5, legGap: 2, armW: 4, bootH: 3, belly: 2 },
  large: { shoulder: 18, waist: 14, torsoH: 12, legH: 12, legW: 5, legGap: 2, armW: 4, bootH: 5 },
  huge: { shoulder: 20, waist: 16, torsoH: 13, legH: 12, legW: 6, legGap: 2, armW: 5, bootH: 4 },
  // Broad through the middle, short in the leg: a man built around lunch.
  portly: { shoulder: 17, waist: 19, torsoH: 13, legH: 9, legW: 5, legGap: 2, armW: 4, bootH: 5, belly: 4 },
};

/** Turns appearance data into concrete colours and parameters. */
export function resolveLook(app) {
  const outfit = app.outfit || {};
  const skin = skinRamp(app.skin);
  return {
    id: app.id,
    build: { ...BUILDS[app.build || 'medium'] },
    skin,
    hair: hairRamp(app.hair?.color || 'brown'),
    hairStyle: app.hair?.style || 'short',
    beard: hairRamp(app.beard?.color || app.hair?.color || 'brown'),
    beardStyle: app.beard?.style || 'none',
    hatStyle: app.hat?.style || 'none',
    hat: clothRamp(app.hat?.color || 'black'),
    hatTrim: clothRamp(app.hat?.trim || 'gold'),
    style: outfit.style || 'shirt',
    primary: clothRamp(outfit.primary || 'navy'),
    secondary: clothRamp(outfit.secondary || 'cloth'),
    pants: clothRamp(outfit.pants || 'brown'),
    boots: clothRamp(outfit.boots || 'black'),
    pantsStripe: outfit.pantsStripe ? clothRamp(outfit.pantsStripe) : null,
    bigBoots: !!outfit.bigBoots,
    belt: clothRamp(outfit.belt || 'leather'),
    trim: clothRamp(outfit.trim || 'gold'),
    apron: clothRamp(outfit.apron || 'white'),
    rolledSleeves: !!outfit.rolledSleeves,
    barefoot: !!outfit.barefoot,
    extras: new Set(app.extras || []),
    extraColor: clothRamp(app.extraColor || 'red'),
    sashColors: (app.extras ?? []).includes('bluesash') ? BLUE_SASH : SASH,
    // Story Phase 3: an improvised ceremonial cloak (a torn curtain) and
    // whether it has since been through an hour with sharks.
    cloak: app.cloak ? clothRamp(app.cloak) : null,
    battered: !!app.battered,
  };
}

// ---------------------------------------------------------------------------
// Shading helpers (light comes from the upper left)

function rowSpan(c, x0, x1, y, ramp, { hiLeft = true, shade = 1 } = {}) {
  for (let x = x0; x <= x1; x++) {
    let col = ramp[1];
    if (hiLeft && x === x0) col = ramp[2];
    if (x > x1 - shade) col = ramp[0];
    c.set(x, y, col);
  }
}

function shadedRect(c, x, y, w, h, ramp, { bottomShade = true } = {}) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let col = ramp[1];
      if (i === 0) col = ramp[2];
      if (i === w - 1 && w > 2) col = ramp[0];
      if (bottomShade && j === h - 1 && h > 2) col = ramp[0];
      c.set(x + i, y + j, col);
    }
  }
}

// ---------------------------------------------------------------------------
// Legs

function drawBoot(c, L, x, y, w, h, toe) {
  const r = L.barefoot ? [L.skin.d, L.skin.s, L.skin.S] : L.boots;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let col = r[1];
      if (j === 0 && !L.barefoot) col = r[2];
      if (j === h - 1) col = r[0];
      if (i === w - 1 && j < h - 1) col = r[0];
      c.set(x + i, y + j, col);
    }
  }
  if (toe) {
    // Toe cap sticks out one pixel in the facing direction on the sole row.
    c.set(toe < 0 ? x - 1 : x + w, y + h - 1, r[0]);
    c.set(toe < 0 ? x - 1 : x + w, y + h - 2, r[1]);
  }
}

function drawLegColumn(c, L, x, top, bottom, w, { far = false, toe = 0, peg = false } = {}) {
  const b = L.build;
  if (peg) {
    // A wooden peg from the knee down (Peg-Leg Pete), the trouser leg rolled to it.
    const knee = top + Math.round((bottom - top) * 0.5);
    for (let y = top; y <= knee; y++) rowSpan(c, x, x + w - 1, y, far ? [L.pants[0], L.pants[0], L.pants[1]] : L.pants);
    c.hline(x, x + w - 1, knee + 1, far ? L.pants[0] : L.pants[2]);
    const px = x + Math.floor(w / 2) - 1;
    for (let y = knee + 2; y <= bottom; y++) {
      c.set(px, y, far ? '#6a4424' : '#b88048');
      c.set(px + 1, y, far ? '#4a2c14' : '#8e6034');
    }
    c.set(px, bottom, '#3a2414');
    c.set(px + 1, bottom, '#3a2414');
    return;
  }
  const bootH = Math.min(b.bootH, bottom - top + 1);
  const pants = far ? [L.pants[0], L.pants[0], L.pants[1]] : L.pants;
  for (let y = top; y <= bottom - bootH; y++) {
    rowSpan(c, x, x + w - 1, y, pants);
    // Vertical pinstripes (a merchant's trousers, much abused).
    if (L.pantsStripe) for (let i = 1; i < w; i += 2) c.set(x + i, y, far ? L.pantsStripe[0] : L.pantsStripe[1]);
  }
  if (L.bigBoots) {
    // Oversized boots: a wider shaft with a flared, turned-down top.
    drawBoot(c, L, x - 1, bottom - bootH + 1, w + 1, bootH, toe);
    c.set(x - 1, bottom - bootH + 1, L.boots[2]);
    c.set(x + w - 1, bottom - bootH + 1, L.boots[2]);
    if (!toe) {
      c.set(x - 2, bottom, L.boots[0]);
      c.set(x + w, bottom, L.boots[0]);
    }
  } else drawBoot(c, L, x, bottom - bootH + 1, w, bootH, toe);
  if (far) for (let y = bottom - bootH + 1; y <= bottom; y++) for (let i = 0; i < w; i++) if (c.get(x + i, y)) c.set(x + i, y, L.boots[0]);
}

function legsFront(c, L, mode, legTop) {
  const b = L.build;
  const lx = CX - Math.ceil(b.legGap / 2) - b.legW;
  const rx = CX + Math.floor(b.legGap / 2);
  let lb = GROUND;
  let rb = GROUND;
  if (mode === 'stepA') rb = GROUND - 2;
  if (mode === 'stepB') lb = GROUND - 2;
  drawLegColumn(c, L, lx, legTop, lb, b.legW);
  drawLegColumn(c, L, rx, legTop, rb, b.legW, { peg: L.extras.has('pegleg') });
  // crotch shadow line between legs
  if (b.legGap === 0) for (let y = legTop + 1; y < Math.min(lb, rb) - b.bootH + 1; y++) c.set(CX, y, L.pants[0]);
}

function legsSide(c, L, mode, legTop) {
  const b = L.build;
  const w = b.legW;
  const base = CX - Math.floor(w / 2) - 1;
  let near = base;
  let far = base + 2;
  let nearB = GROUND;
  let farB = GROUND;
  if (mode === 'stepA') {
    near = base - 3;
    far = base + 3;
    farB = GROUND - 1;
  } else if (mode === 'stepB') {
    near = base + 3;
    far = base - 3;
    nearB = GROUND - 1;
  }
  drawLegColumn(c, L, far, legTop, farB, w, { far: true, toe: -1, peg: L.extras.has('pegleg') });
  drawLegColumn(c, L, near, legTop, nearB, w, { toe: -1 });
}

// ---------------------------------------------------------------------------
// Torso & outfits

function torsoWidthAt(b, t) {
  let w = Math.round(b.shoulder + (b.waist - b.shoulder) * t);
  if (b.belly && t > 0.35 && t < 0.95) w += b.belly;
  return w;
}

function torsoFront(c, L, top, bottom, { back = false } = {}) {
  const b = L.build;
  const H = bottom - top;
  for (let y = top; y <= bottom; y++) {
    const t = H ? (y - top) / H : 0;
    let w = torsoWidthAt(b, t);
    if (y === top) w -= 4;
    else if (y === top + 1) w -= 2;
    const x0 = CX - Math.floor(w / 2);
    const x1 = x0 + w - 1;
    const style = L.style;
    const coatLike = style === 'coat' || style === 'longcoat';
    const openW = coatLike && !back ? Math.max(2, Math.floor(b.shoulder / 4)) : 0;
    for (let x = x0; x <= x1; x++) {
      const rel = x - CX;
      let ramp = L.secondary;
      if (coatLike) ramp = back || Math.abs(rel + 0.5) > openW / 2 + 0.5 ? L.primary : L.secondary;
      if (style === 'vest') ramp = Math.abs(rel + 0.5) > Math.max(1.5, w / 5) ? L.primary : L.secondary;
      if (style === 'striped' && (y - top) % 3 === 1) ramp = L.primary;
      let col = ramp[1];
      if (x === x0 || y === top) col = ramp[2];
      if (x >= x1 - 1) col = ramp[0];
      c.set(x, y, col);
    }
    if (back && (coatLike || style === 'vest') && y > top + 2) c.set(CX, y, L.primary[0]);
  }
  // Neckline: skin V at the collar (front only, shirts and coats).
  if (!back && L.style !== 'dress') {
    c.set(CX - 1, top + 1, L.skin.s);
    c.set(CX, top + 1, L.skin.d);
    c.set(CX - 1, top + 2, L.skin.d);
  }
  if (!back && (L.style === 'coat' || L.style === 'longcoat')) {
    // Lapels and buttons.
    const edge = Math.max(2, Math.floor(b.shoulder / 4));
    for (let i = 0; i < 3; i++) {
      c.set(CX - Math.ceil(edge / 2) - 1 - i, top + 1 + i, L.primary[2]);
      c.set(CX + Math.floor(edge / 2) + i, top + 1 + i, L.primary[2]);
    }
    for (let y = top + 3; y < bottom - 1; y += 3) {
      c.set(CX - Math.ceil(edge / 2) - 1, y, L.trim[2]);
      c.set(CX + Math.floor(edge / 2), y, L.trim[1]);
    }
  }
  // Belt across the waist.
  if (L.style !== 'dress') {
    const w = torsoWidthAt(b, 1);
    const x0 = CX - Math.floor(w / 2);
    for (let x = x0; x < x0 + w; x++) {
      c.set(x, bottom - 1, L.belt[1]);
      c.set(x, bottom, L.belt[0]);
    }
    if (!back) {
      c.set(CX - 1, bottom - 1, L.trim[2]);
      c.set(CX, bottom - 1, L.trim[1]);
      c.set(CX - 1, bottom, L.trim[1]);
      c.set(CX, bottom, L.trim[0]);
    }
  }
  if (!back && L.extras.has('sash')) {
    const w = torsoWidthAt(b, 1);
    const x0 = CX - Math.floor(w / 2);
    for (let x = x0; x < x0 + w; x++) c.set(x, bottom - 2, L.extraColor[1]);
    c.set(x0 + 1, bottom + 1, L.extraColor[1]);
    c.set(x0 + 1, bottom + 2, L.extraColor[0]);
  }
  if (!back && L.extras.has('baldric')) {
    const w = b.shoulder;
    for (let i = 0; i < H - 1; i++) {
      const x = CX + Math.floor(w / 2) - 2 - Math.round((i * (w - 3)) / H);
      c.set(x, top + 1 + i, L.belt[1]);
      c.set(x + 1, top + 1 + i, L.belt[0]);
    }
    c.set(CX - 1, top + Math.floor(H / 2), L.trim[2]);
  }
  if (L.extras.has('stenchsash') || L.extras.has('bluesash')) stenchSashFront(c, L, top, H, back);
  if (L.extras.has('patches') && (L.style === 'coat' || L.style === 'longcoat')) {
    // Sun-faded repairs on a battered coat.
    const w = b.shoulder;
    c.rect(CX - Math.floor(w / 2) + 1, top + 4, 2, 2, L.pants[1]);
    c.set(CX - Math.floor(w / 2) + 1, top + 4, L.pants[2]);
    c.rect(CX + Math.floor(w / 2) - 3, top + 7, 2, 2, L.secondary[0]);
  }
  if (!back && L.extras.has('rope')) {
    // A rescue line tied round the waist.
    const w = torsoWidthAt(b, 1);
    const x0 = CX - Math.floor(w / 2);
    for (let x = x0; x < x0 + w; x++) c.set(x, bottom - 2, (x % 2) ? '#cca660' : '#a67c3e');
    c.rect(CX - 1, bottom - 3, 3, 2, '#e8cc8c');
    c.set(CX, bottom - 1, '#7a5628');
  }
  if (!back && L.extras.has('monocle')) {
    // The appraiser's monocle hangs from a chain pinned to the coat.
    c.set(CX + 3, top + 1, PAL.gold4);
    c.set(CX + 3, top + 2, PAL.gold3);
    c.set(CX + 4, top + 3, PAL.gold3);
    c.set(CX + 4, top + 4, PAL.gold2);
  }
  if (!back && L.extras.has('pouches')) {
    // Coin pouches on the belt, one of them never quite closed.
    const w = torsoWidthAt(b, 1);
    const x0 = CX - Math.floor(w / 2);
    for (const px of [x0 + 1, x0 + w - 5]) {
      c.rect(px, bottom, 4, 3, L.belt[1]);
      c.hline(px, px + 3, bottom + 2, L.belt[0]);
      c.set(px, bottom, L.belt[2]);
      c.set(px + 1, bottom - 1, PAL.gold4);
      c.set(px + 2, bottom - 1, PAL.gold3);
    }
  }
  if (!back && L.extras.has('toolbelt')) {
    // A salvager's pry bar and mallet at the hip.
    const w = torsoWidthAt(b, 1);
    const x1 = CX + Math.floor(w / 2);
    c.vline(x1, bottom - 1, bottom + 4, PAL.iron3);
    c.set(x1, bottom + 5, PAL.iron2);
    c.hline(x1 - 2, x1, bottom + 5, PAL.iron2);
  }
  if (L.extras.has('parrotpouch')) parrotPouch(c, L, top, back);
  if (!back && L.extras.has('neckerchief')) {
    c.set(CX - 2, top, L.extraColor[1]);
    c.set(CX + 1, top, L.extraColor[1]);
    c.set(CX - 1, top + 1, L.extraColor[2]);
    c.set(CX, top + 1, L.extraColor[1]);
    c.set(CX - 1, top + 2, L.extraColor[0]);
  }
}

/** Coat tails (long coats) and skirts hang below the waist over/around the legs. */
/** Over the left shoulder, down to the right hip (front); mirrored behind. */
function stenchSashFront(c, L, top, H, back, SASH = L.sashColors) {
  const w = L.build.shoulder;
  const at = (i) => (back ? CX - Math.floor(w / 2) + 1 + Math.round((i * (w - 4)) / H) : CX + Math.floor(w / 2) - 3 - Math.round((i * (w - 4)) / H));
  for (let i = 0; i < H; i++) {
    const x = at(i);
    const y = top + 1 + i;
    c.set(x - 1, y, SASH.edge);
    c.set(x, y, i % 4 === 1 ? SASH.l : SASH.m);
    c.set(x + 1, y, SASH.m);
    c.set(x + 2, y, SASH.d);
    c.set(x + 3, y, SASH.edge);
    if (i % 3 === 0) c.set(x + 1, y, SASH.gold); // the fake-gold trim, stitched on
  }
  if (back) return;
  // The badge: a green nose under a gold crown, embroidered with more
  // enthusiasm than skill.
  const bx = at(3);
  const by = top + 3;
  c.set(bx, by - 1, SASH.gold);
  c.set(bx + 2, by - 1, SASH.gold);
  c.set(bx + 1, by - 1, SASH.gold);
  c.set(bx + 1, by, SASH.badge);
  c.set(bx + 1, by + 1, SASH.badge);
  c.set(bx + 2, by + 1, SASH.badge);
  // A fringe where it ends at the hip.
  const fx = at(H - 1);
  for (let k = 0; k < 4; k++) c.set(fx - 1 + k, top + H + 1 + (k % 2), SASH.gold);
}

/**
 * Story Phase 9: a padded leather pouch slung across the captain's chest on
 * a strap, and in it, Squawks: a bald pink head and a yellow beak poking out
 * of the top, looking where they're going. From behind, just the strap.
 */
function parrotPouch(c, L, top, back) {
  const w = L.build.shoulder;
  // the strap, shoulder to hip (the pouch itself goes on last, over the beard: parrotPouchOver)
  for (let i = 0; i < 7; i++) c.set(CX + Math.floor(w / 2) - 2 - i, top + 1 + i, back ? '#6e4626' : '#4a2e1a');
}

/**
 * The pouch and its passenger, painted after the head so the captain's great
 * beard doesn't swallow them: at his left hip from the front, out in front of
 * him from the side. Nothing from behind but the strap.
 */
function parrotPouchOver(c, L, dir, torsoTop) {
  if (dir === 'up') return;
  const LEATHER = ['#4a2e1a', '#6e4626', '#8e5e34'];
  const HEAD = ['#c87a78', '#e8a4a0', '#f6c4c0'];
  const BEAK = ['#c8901c', '#f0c040'];
  const side = dir !== 'down';
  const sw = Math.max(8, Math.round(L.build.shoulder * 0.62));
  const px = side ? CX - Math.floor(sw / 2) - 4 : CX - Math.floor(L.build.shoulder / 2) - 1;
  const py = torsoTop + (side ? 7 : 8);
  c.rect(px, py, 6, 5, LEATHER[1]);
  c.hline(px, px + 5, py, LEATHER[2]);
  c.hline(px, px + 5, py + 4, LEATHER[0]);
  c.set(px, py + 1, LEATHER[0]);
  c.set(px + 5, py + 1, LEATHER[0]);
  c.set(px + 3, py + 2, LEATHER[2]);
  // Squawks: a bald pink head over the rim, one eye, the beak
  c.rect(px + 1, py - 3, 4, 3, HEAD[1]);
  c.hline(px + 2, px + 3, py - 4, HEAD[1]);
  c.set(px + 2, py - 3, HEAD[2]);
  c.set(px + 4, py - 1, HEAD[0]);
  c.set(px + 2, py - 2, '#1a1418');
  c.set(px, py - 2, BEAK[1]);
  c.set(px - 1, py - 2, BEAK[0]);
  c.set(px, py - 1, BEAK[0]);
}

/** Side view: the sash crosses his chest as a bright band. */
function stenchSashSide(c, L, top, bottom, SASH = L.sashColors) {
  const sw = Math.max(8, Math.round(L.build.shoulder * 0.62));
  const x0 = CX - Math.floor(sw / 2);
  for (let y = top + 1; y < bottom - 1; y++) {
    const x = x0 + 1 + Math.floor(((y - top) * (sw - 3)) / (bottom - top));
    c.set(x, y, SASH.edge);
    c.set(x + 1, y, SASH.m);
    c.set(x + 2, y, (y % 3) ? SASH.m : SASH.gold);
    c.set(x + 3, y, SASH.edge);
  }
  c.set(x0 + 2, top + 3, SASH.badge);
  c.set(x0 + 2, top + 2, SASH.gold);
}

function lowerGarmentFront(c, L, waistY, legTop, { back = false } = {}) {
  const b = L.build;
  if (L.style === 'longcoat') {
    const len = Math.floor(b.legH * 0.65);
    const w = torsoWidthAt(b, 1);
    const x0 = CX - Math.floor(w / 2) - 1;
    const x1 = CX + Math.ceil(w / 2);
    for (let j = 1; j <= len; j++) {
      const y = waistY + j;
      const panelW = Math.max(3, Math.floor(w / 2) - 1 + Math.floor(j / 4));
      if (back) {
        for (let x = x0 - Math.floor(j / 5); x <= x1 + Math.floor(j / 5); x++) {
          let col = L.primary[1];
          if (x === CX || x === CX - 1) col = L.primary[0];
          if (x >= x1 + Math.floor(j / 5) - 1) col = L.primary[0];
          c.set(x, y, col);
        }
      } else {
        for (let i = 0; i < panelW; i++) {
          c.set(x0 - Math.floor(j / 5) + i, y, i === 0 ? L.primary[2] : L.primary[1]);
          c.set(x1 + Math.floor(j / 5) - i, y, i === 0 ? L.primary[0] : L.primary[1]);
        }
      }
      if (j === len) for (let x = x0 - Math.floor(j / 5); x <= x1 + Math.floor(j / 5); x++) if (c.get(x, y)) c.set(x, y, L.primary[0]);
    }
  }
  if (L.style === 'dress') {
    const bottom = GROUND - 2;
    const w0 = torsoWidthAt(b, 1);
    for (let y = waistY; y <= bottom; y++) {
      const t = (y - waistY) / Math.max(1, bottom - waistY);
      const w = w0 + Math.round(t * 6);
      const x0 = CX - Math.floor(w / 2);
      rowSpan(c, x0, x0 + w - 1, y, L.primary, { shade: 2 });
      if ((y - waistY) % 4 === 3) for (let x = x0 + 2; x < x0 + w - 2; x += 3) c.set(x, y, L.primary[0]);
    }
  }
  if ((L.style === 'apron' || L.extras.has('apron')) && !back) {
    const bottom = legTop + Math.floor(b.legH * 0.7);
    const w = Math.max(6, torsoWidthAt(b, 1) - 4);
    for (let y = waistY - Math.floor(b.torsoH * 0.55); y <= bottom; y++) {
      const x0 = CX - Math.floor(w / 2);
      rowSpan(c, x0, x0 + w - 1, y, L.apron);
    }
  }
}

// ---------------------------------------------------------------------------
// Arms

function sleeveRamp(L) {
  if (L.style === 'coat' || L.style === 'longcoat') return L.primary;
  if (L.style === 'striped') return L.secondary;
  return L.secondary;
}

/** Draws one straight-hanging arm from shoulder (x, y) with the hand at handY. */
function armColumn(c, L, x, y, handY, w, { inner = 'right', cuff = false } = {}) {
  const ramp = sleeveRamp(L);
  const rolled = L.rolledSleeves;
  const sleeveEnd = rolled ? y + Math.floor((handY - y) * 0.5) : handY - 1;
  for (let j = y; j <= sleeveEnd; j++) {
    for (let i = 0; i < w; i++) {
      let col = ramp[1];
      if ((inner === 'right' && i === w - 1) || (inner === 'left' && i === 0)) col = ramp[0];
      if ((inner === 'right' && i === 0) || (inner === 'left' && i === w - 1)) col = ramp[2];
      c.set(x + i, j, col);
    }
  }
  for (let j = sleeveEnd + 1; j < handY; j++) {
    for (let i = 0; i < w; i++) c.set(x + i, j, i === (inner === 'right' ? w - 1 : 0) ? L.skin.d : L.skin.s);
  }
  if (cuff && !rolled) for (let i = 0; i < w; i++) c.set(x + i, sleeveEnd, L.trim[1]);
  // hand
  for (let j = 0; j < 3; j++) for (let i = 0; i < w; i++) c.set(x + i, handY + j, j === 2 || i === (inner === 'right' ? w - 1 : 0) ? L.skin.d : L.skin.s);
}

function armsFront(c, L, mode, torsoTop, { back = false } = {}) {
  const b = L.build;
  const w = b.armW;
  const shoulderY = torsoTop + 2;
  const hang = shoulderY + b.torsoH - 2;
  const lx = CX - Math.floor(b.shoulder / 2) - w + 1;
  const rx = CX + Math.ceil(b.shoulder / 2) - 1;
  const cuff = L.style === 'longcoat';
  let lh = hang;
  let rh = hang;
  if (mode === 'swingA') { lh -= 1; rh += 1; }
  if (mode === 'swingB') { lh += 1; rh -= 1; }
  if (mode === 'up') {
    // Surprised: both hands thrown up beside the head.
    armColumn(c, L, lx - 1, shoulderY - 7, shoulderY - 7, w, { inner: 'right' });
    armColumn(c, L, rx + 1, shoulderY - 7, shoulderY - 7, w, { inner: 'left' });
    for (let j = shoulderY - 5; j <= shoulderY + 1; j++) {
      for (let i = 0; i < w; i++) {
        c.set(lx - 1 + i, j, sleeveRamp(L)[i === 0 ? 2 : 1]);
        c.set(rx + 1 + i, j, sleeveRamp(L)[i === w - 1 ? 0 : 1]);
      }
    }
    return;
  }
  if (mode === 'work0' || mode === 'work1') {
    // Upper arms hang, forearms reach toward the middle (scrubbing, stirring, hammering).
    const elbowY = shoulderY + Math.floor(b.torsoH / 2);
    armColumn(c, L, lx, shoulderY, elbowY, w, { inner: 'right' });
    armColumn(c, L, rx, shoulderY, elbowY, w, { inner: 'left' });
    const off = mode === 'work0' ? 0 : 2;
    const hy1 = elbowY + 1 + off;
    const hy2 = elbowY + 3 - off;
    c.thickLine(lx + 1, elbowY + 1, CX - 3, hy1, 2, sleeveRamp(L)[1]);
    c.thickLine(rx + 1, elbowY + 1, CX + 2, hy2, 2, sleeveRamp(L)[0]);
    c.rect(CX - 4, hy1, 3, 3, L.skin.s);
    c.rect(CX + 1, hy2, 3, 3, L.skin.d);
    return;
  }
  if (EXTRA_ARMS_FRONT[mode]) {
    EXTRA_ARMS_FRONT[mode](c, L, { lx, rx, w, shoulderY, hang, torsoTop, back });
    return;
  }
  if (mode === 'point') {
    armColumn(c, L, lx, shoulderY, hang, w, { inner: 'right', cuff });
    // Right arm raised and pointing outward.
    for (let i = 0; i < 7; i++) for (let j = 0; j < w; j++) c.set(rx + i, shoulderY + j - Math.floor(i / 2), sleeveRamp(L)[j === 0 ? 2 : 1]);
    c.rect(rx + 7, shoulderY - 4, 3, 3, L.skin.s);
    return;
  }
  armColumn(c, L, lx, shoulderY, lh, w, { inner: back ? 'left' : 'right', cuff });
  armColumn(c, L, rx, shoulderY, rh, w, { inner: back ? 'right' : 'left', cuff });
}

function armsSide(c, L, mode, torsoTop, layer) {
  const b = L.build;
  const w = b.armW;
  const shoulderY = torsoTop + 2;
  const hang = shoulderY + b.torsoH - 2;
  const baseX = CX - Math.floor(w / 2);
  let nearDx = 0;
  let farDx = 0;
  if (mode === 'swingA') { nearDx = 2; farDx = -2; }
  if (mode === 'swingB') { nearDx = -2; farDx = 2; }
  const cuff = L.style === 'longcoat';
  if (layer === 'far') {
    // The far arm peeks out from behind the torso, darker.
    const x = baseX + 1 + farDx;
    armColumn(c, L, x, shoulderY + 1, hang, w, { inner: 'left', cuff });
    for (let j = shoulderY + 1; j < hang + 3; j++) for (let i = 0; i < w; i++) if (c.get(x + i, j)) c.set(x + i, j, c.get(x + i, j) === 0 ? 0 : darker(c.get(x + i, j)));
    return;
  }
  if (EXTRA_ARMS_SIDE[mode]) {
    EXTRA_ARMS_SIDE[mode](c, L, { baseX, w, shoulderY, hang, torsoTop });
    return;
  }
  if (mode === 'work0' || mode === 'work1') {
    const elbowY = shoulderY + Math.floor(b.torsoH / 2);
    armColumn(c, L, baseX, shoulderY, elbowY, w, { inner: 'left' });
    const hy = elbowY + (mode === 'work0' ? 0 : 2);
    c.thickLine(baseX, elbowY + 1, baseX - 5, hy + 1, 2, sleeveRamp(L)[1]);
    c.rect(baseX - 7, hy, 3, 3, L.skin.s);
    return;
  }
  if (mode === 'point') {
    for (let i = 0; i < 8; i++) for (let j = 0; j < w; j++) c.set(baseX - i, shoulderY + j - Math.floor(i / 3), sleeveRamp(L)[j === 0 ? 2 : 1]);
    c.rect(baseX - 10, shoulderY - 3, 3, 3, L.skin.s);
    return;
  }
  if (mode === 'up') {
    for (let j = shoulderY - 8; j <= shoulderY + 1; j++) for (let i = 0; i < w; i++) c.set(baseX + i, j, sleeveRamp(L)[i === 0 ? 2 : 1]);
    c.rect(baseX, shoulderY - 11, w, 3, L.skin.s);
    return;
  }
  // Near arm: slight diagonal swing.
  const handX = baseX - nearDx;
  for (let j = shoulderY; j < hang; j++) {
    const t = (j - shoulderY) / Math.max(1, hang - shoulderY);
    const x = Math.round(baseX + (handX - baseX) * t);
    const ramp = sleeveRamp(L);
    const rolled = L.rolledSleeves && t > 0.5;
    for (let i = 0; i < w; i++) {
      let col = rolled ? L.skin.s : ramp[1];
      if (i === 0) col = rolled ? L.skin.S : ramp[2];
      if (i === w - 1) col = rolled ? L.skin.d : ramp[0];
      c.set(x + i, j, col);
    }
    if (cuff && j === hang - 1) for (let i = 0; i < w; i++) c.set(x + i, j, L.trim[1]);
  }
  c.rect(handX, hang, w, 3, L.skin.s);
  c.set(handX + w - 1, hang + 2, L.skin.d);
}

// ---------------------------------------------------------------------------
// Extra arm poses (opt-in per appearance, see EXTRA_POSES)

/** A pewter mug of Frog Grog (4x5), tipped toward the mouth when drinking. */
function mug(c, x, y, full) {
  c.rect(x, y, 4, 5, '#8a8a9a');
  c.vline(x, y, y + 4, '#b8b8c8');
  c.hline(x, x + 3, y, full ? '#8ab030' : '#5a7a2a');
  c.set(x + 4, y + 1, '#6a6a7a');
  c.set(x + 4, y + 3, '#6a6a7a');
}

function hand(c, L, x, y, w = 2, h = 2) {
  // Story Phase 5: the Grand Stenchmaster's ornate cuffed gloves.
  const g = L.extras.has('gloves');
  c.rect(x, y, w, h, g ? REGALIA.glove : L.skin.s);
  c.set(x + w - 1, y + h - 1, g ? REGALIA.gloveD : L.skin.d);
}

function limb(c, L, x0, y0, x1, y1, w, shade = 1) {
  c.thickLine(x0, y0, x1, y1, Math.max(2, w - 1), sleeveRamp(L)[shade]);
}

/** Front/back view arm poses: (c, L, geometry) → draws both arms. */
const EXTRA_ARMS_FRONT = {
  // Story Phase 7: a salute (one glove at the brow), the other arm swinging: marching on parade.
  salute(c, L, g) {
    const elbowY = g.shoulderY + 3;
    limb(c, L, g.lx + 1, g.shoulderY, g.lx - 2, elbowY, g.w, 2);
    limb(c, L, g.lx - 2, elbowY, CX - 4, g.torsoTop - 8, g.w, 1);
    if (!g.back) hand(c, L, CX - 5, g.torsoTop - 10, 3, 2);
    armColumn(c, L, g.rx, g.shoulderY, g.hang, g.w, { inner: 'left' });
  },
  // Story Phase 7: both arms flung wide (singing, badly, at the storm).
  wide(c, L, g) {
    limb(c, L, g.lx + 1, g.shoulderY, g.lx - 5, g.shoulderY - 4, g.w, 2);
    limb(c, L, g.rx + 1, g.shoulderY, g.rx + g.w + 4, g.shoulderY - 4, g.w, 0);
    hand(c, L, g.lx - 7, g.shoulderY - 7, 3, 3);
    hand(c, L, g.rx + g.w + 4, g.shoulderY - 7, 3, 3);
  },
  // Hands on hips, elbows out: pleased with himself.
  hips(c, L, g) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2) - 1;
    const hipY = g.hang - 1;
    limb(c, L, g.lx + 1, g.shoulderY, g.lx - 2, elbowY, g.w, 2);
    limb(c, L, g.lx - 2, elbowY, g.lx + 2, hipY, g.w, 1);
    limb(c, L, g.rx + 1, g.shoulderY, g.rx + 4, elbowY, g.w, 1);
    limb(c, L, g.rx + 4, elbowY, g.rx, hipY, g.w, 0);
    if (!g.back) {
      hand(c, L, g.lx + 2, hipY - 1);
      hand(c, L, g.rx - 1, hipY - 1);
    }
  },
  // Rubbing hands together: greed.
  rub0(c, L, g) { EXTRA_ARMS_FRONT.rubAt(c, L, g, 0); },
  rub1(c, L, g) { EXTRA_ARMS_FRONT.rubAt(c, L, g, 1); },
  rubAt(c, L, g, k) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2);
    armColumn(c, L, g.lx, g.shoulderY, elbowY, g.w, { inner: 'right' });
    armColumn(c, L, g.rx, g.shoulderY, elbowY, g.w, { inner: 'left' });
    const hy = g.shoulderY + 4;
    limb(c, L, g.lx + 1, elbowY, CX - 2 - k, hy + 1, g.w, 1);
    limb(c, L, g.rx + 1, elbowY, CX + 1 - k, hy + 1, g.w, 0);
    hand(c, L, CX - 3 + k, hy, 3, 3);
    hand(c, L, CX - k, hy + 1, 2, 2);
  },
  // Forearms out in front, carrying something heavy.
  carry(c, L, g) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2);
    armColumn(c, L, g.lx - 1, g.shoulderY, elbowY, g.w, { inner: 'right' });
    armColumn(c, L, g.rx + 1, g.shoulderY, elbowY, g.w, { inner: 'left' });
    if (!g.back) {
      hand(c, L, g.lx, elbowY + 1, 3, 2);
      hand(c, L, g.rx, elbowY + 1, 3, 2);
    }
  },
  // Eating: one hand at the mouth, the other holding the next mouthful.
  eat0(c, L, g) { EXTRA_ARMS_FRONT.eatAt(c, L, g, 0); },
  eat1(c, L, g) { EXTRA_ARMS_FRONT.eatAt(c, L, g, 2); },
  eatAt(c, L, g, k) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2);
    armColumn(c, L, g.lx, g.shoulderY, elbowY, g.w, { inner: 'right' });
    limb(c, L, g.lx + 1, elbowY, CX - 5, elbowY + 1, g.w, 1);
    hand(c, L, CX - 7, elbowY, 3, 3);
    c.set(CX - 7, elbowY - 1, '#c89060');
    limb(c, L, g.rx + 1, g.shoulderY, g.rx + 2, g.shoulderY + 4, g.w, 0);
    limb(c, L, g.rx + 2, g.shoulderY + 4, CX + 2, g.torsoTop - 1 + k, g.w, 0);
    hand(c, L, CX + 1, g.torsoTop - 2 + k, 3, 3);
  },
  // Both hands on the belly: something is wrong in there.
  clutch(c, L, g) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2) - 1;
    const bellyY = g.hang - 3;
    limb(c, L, g.lx + 1, g.shoulderY, g.lx - 1, elbowY, g.w, 2);
    limb(c, L, g.lx - 1, elbowY, CX - 4, bellyY, g.w, 1);
    limb(c, L, g.rx + 1, g.shoulderY, g.rx + 3, elbowY, g.w, 1);
    limb(c, L, g.rx + 3, elbowY, CX + 2, bellyY + 1, g.w, 0);
    if (!g.back) {
      hand(c, L, CX - 5, bellyY - 1, 3, 3);
      hand(c, L, CX + 1, bellyY, 3, 3);
    }
  },
  // Wringing hands at the chest: nervous.
  clasp(c, L, g) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2);
    armColumn(c, L, g.lx, g.shoulderY, elbowY, g.w, { inner: 'right' });
    armColumn(c, L, g.rx, g.shoulderY, elbowY, g.w, { inner: 'left' });
    limb(c, L, g.lx + 1, elbowY, CX - 1, g.shoulderY + 3, g.w, 1);
    limb(c, L, g.rx + 1, elbowY, CX, g.shoulderY + 3, g.w, 0);
    if (!g.back) hand(c, L, CX - 2, g.shoulderY + 2, 4, 3);
  },
  // One hand raised high (proclaiming), the other down at his side.
  raise(c, L, g) {
    limb(c, L, g.lx + 1, g.shoulderY, g.lx - 1, g.shoulderY - 8, g.w, 2);
    hand(c, L, g.lx - 2, g.shoulderY - 11, 3, 3);
    armColumn(c, L, g.rx, g.shoulderY, g.hang, g.w, { inner: 'left' });
  },
  // Story Phase 4: a mug raised to the mouth (the other hand on the hip).
  drink0(c, L, g) { EXTRA_ARMS_FRONT.drinkAt(c, L, g, 0); },
  drink1(c, L, g) { EXTRA_ARMS_FRONT.drinkAt(c, L, g, 2); },
  drinkAt(c, L, g, k) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2);
    limb(c, L, g.lx + 1, g.shoulderY, g.lx - 2, elbowY, g.w, 2);
    limb(c, L, g.lx - 2, elbowY, g.lx + 2, g.hang - 1, g.w, 1);
    limb(c, L, g.rx + 1, g.shoulderY, g.rx + 2, g.shoulderY + 4, g.w, 0);
    limb(c, L, g.rx + 2, g.shoulderY + 4, CX + 3, g.torsoTop - 1 + k, g.w, 0);
    mug(c, CX + 1, g.torsoTop - 5 + k, k === 0);
    hand(c, L, CX + 3, g.torsoTop - 2 + k, 2, 3);
  },
  // Shark Duty: both hands on a long pole, jabbing down over the rail.
  poke0(c, L, g) { EXTRA_ARMS_FRONT.pokeAt(c, L, g, 0); },
  poke1(c, L, g) { EXTRA_ARMS_FRONT.pokeAt(c, L, g, 3); },
  pokeAt(c, L, g, k) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2);
    armColumn(c, L, g.lx, g.shoulderY, elbowY, g.w, { inner: 'right' });
    armColumn(c, L, g.rx, g.shoulderY, elbowY, g.w, { inner: 'left' });
    c.thickLine(CX - 9, g.shoulderY - 6 + k, CX + 6, g.hang + 6 + k, 1, '#8a6a3a');
    hand(c, L, CX - 5, g.shoulderY + 1 + k, 3, 3);
    hand(c, L, CX + 1, elbowY + 3 + k, 3, 3);
  },
  // Palms up: "what can one do?"
  shrug(c, L, g) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2);
    armColumn(c, L, g.lx, g.shoulderY, elbowY, g.w, { inner: 'right' });
    armColumn(c, L, g.rx, g.shoulderY, elbowY, g.w, { inner: 'left' });
    limb(c, L, g.lx, elbowY, g.lx - 4, elbowY - 3, g.w, 2);
    limb(c, L, g.rx + g.w - 1, elbowY, g.rx + g.w + 3, elbowY - 3, g.w, 0);
    hand(c, L, g.lx - 6, elbowY - 5, 3, 2);
    hand(c, L, g.rx + g.w + 3, elbowY - 5, 3, 2);
  },
};

/** Side view (facing left) arm poses: draws the near arm. */
const EXTRA_ARMS_SIDE = {
  salute(c, L, g) {
    const elbowY = g.shoulderY + 3;
    limb(c, L, g.baseX + 1, g.shoulderY, g.baseX - 3, elbowY, g.w, 1);
    limb(c, L, g.baseX - 3, elbowY, g.baseX - 2, g.torsoTop - 8, g.w, 1);
    hand(c, L, g.baseX - 4, g.torsoTop - 10, 3, 2);
  },
  wide(c, L, g) {
    limb(c, L, g.baseX + 1, g.shoulderY, g.baseX - 6, g.shoulderY - 5, g.w, 1);
    hand(c, L, g.baseX - 9, g.shoulderY - 8, 3, 3);
  },
  hips(c, L, g) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2) - 1;
    limb(c, L, g.baseX + 1, g.shoulderY, g.baseX + 4, elbowY, g.w, 1);
    limb(c, L, g.baseX + 4, elbowY, g.baseX + 1, g.hang - 1, g.w, 1);
    hand(c, L, g.baseX, g.hang - 2);
  },
  rub0(c, L, g) { EXTRA_ARMS_SIDE.forward(c, L, g, 4, 0); },
  rub1(c, L, g) { EXTRA_ARMS_SIDE.forward(c, L, g, 5, 1); },
  carry(c, L, g) { EXTRA_ARMS_SIDE.forward(c, L, g, 6, 1); },
  clasp(c, L, g) { EXTRA_ARMS_SIDE.forward(c, L, g, 4, -1); },
  forward(c, L, g, reach, dy) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2);
    armColumn(c, L, g.baseX, g.shoulderY, elbowY, g.w, { inner: 'left' });
    limb(c, L, g.baseX, elbowY, g.baseX - reach, elbowY - 1 + dy, g.w, 1);
    hand(c, L, g.baseX - reach - 2, elbowY - 2 + dy, 3, 3);
  },
  eat0(c, L, g) { EXTRA_ARMS_SIDE.toMouth(c, L, g, 0); },
  eat1(c, L, g) { EXTRA_ARMS_SIDE.toMouth(c, L, g, 2); },
  toMouth(c, L, g, k) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2);
    armColumn(c, L, g.baseX, g.shoulderY, elbowY - 2, g.w, { inner: 'left' });
    limb(c, L, g.baseX, elbowY - 2, g.baseX - 5, g.torsoTop - 1 + k, g.w, 1);
    hand(c, L, g.baseX - 7, g.torsoTop - 3 + k, 3, 3);
  },
  clutch(c, L, g) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2);
    armColumn(c, L, g.baseX, g.shoulderY, elbowY - 1, g.w, { inner: 'left' });
    limb(c, L, g.baseX, elbowY - 1, g.baseX - 4, g.hang - 3, g.w, 1);
    hand(c, L, g.baseX - 6, g.hang - 4, 3, 3);
  },
  shrug(c, L, g) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2);
    armColumn(c, L, g.baseX, g.shoulderY, elbowY, g.w, { inner: 'left' });
    limb(c, L, g.baseX, elbowY, g.baseX - 5, elbowY - 3, g.w, 1);
    hand(c, L, g.baseX - 7, elbowY - 5, 3, 2);
  },
  drink0(c, L, g) { EXTRA_ARMS_SIDE.drinkAt(c, L, g, 0); },
  drink1(c, L, g) { EXTRA_ARMS_SIDE.drinkAt(c, L, g, 2); },
  drinkAt(c, L, g, k) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2);
    armColumn(c, L, g.baseX, g.shoulderY, elbowY - 2, g.w, { inner: 'left' });
    limb(c, L, g.baseX, elbowY - 2, g.baseX - 5, g.torsoTop - 2 + k, g.w, 1);
    mug(c, g.baseX - 9, g.torsoTop - 6 + k, k === 0);
    hand(c, L, g.baseX - 7, g.torsoTop - 3 + k, 3, 3);
  },
  poke0(c, L, g) { EXTRA_ARMS_SIDE.pokeAt(c, L, g, 0); },
  poke1(c, L, g) { EXTRA_ARMS_SIDE.pokeAt(c, L, g, 3); },
  pokeAt(c, L, g, k) {
    const elbowY = g.shoulderY + Math.floor(L.build.torsoH / 2);
    armColumn(c, L, g.baseX, g.shoulderY, elbowY, g.w, { inner: 'left' });
    // The pole runs out in front of him and down toward the water.
    c.thickLine(g.baseX + 4, g.shoulderY - 2, g.baseX - 13 - k, g.hang + 5 + k, 1, '#8a6a3a');
    c.set(g.baseX - 13 - k, g.hang + 5 + k, PAL.iron3);
    limb(c, L, g.baseX, elbowY, g.baseX - 5 - k, elbowY + 1 + k, g.w, 1);
    hand(c, L, g.baseX - 7 - k, elbowY + k, 3, 3);
  },
  raise(c, L, g) {
    limb(c, L, g.baseX + 1, g.shoulderY, g.baseX - 1, g.shoulderY - 9, g.w, 1);
    hand(c, L, g.baseX - 2, g.shoulderY - 12, 3, 3);
  },
};

function darker(px) {
  // Darken a packed colour by ~30% (used for far-side limbs).
  const r = px & 255;
  const g = (px >>> 8) & 255;
  const b = (px >>> 16) & 255;
  const a = px >>> 24;
  const f = 0.7;
  return ((a << 24) | (Math.floor(b * f) << 16) | (Math.floor(g * f) << 8) | Math.floor(r * f)) >>> 0;
}

// ---------------------------------------------------------------------------
// Head

function headCanvas(L, dir, face) {
  const c = new PixelCanvas(16, 24);
  const skin = L.skin;
  const eyeWhite = '#ece6e0';
  const headRows = [...HEAD[dir]];
  const variant = face && FACE_VARIANTS[face]?.[dir];
  if (variant) for (const [row, str] of Object.entries(variant.rows)) headRows[row] = str;
  c.stamp(headRows, 0, 0, {
    s: skin.s, S: skin.S, d: skin.d, D: skin.D, n: skin.d, m: skin.D, e: PAL.ink, E: eyeWhite, b: L.hair[0],
  });
  if (L.extras.has('eyepatch') && dir !== 'up') {
    if (dir === 'down') {
      c.rect(10, 9, 2, 2, PAL.ink);
      c.hline(2, 13, 7, PAL.ink);
    } else {
      c.hline(3, 12, 7, PAL.ink);
    }
  }
  if (L.extras.has('spectacles') && dir !== 'up') {
    const g = PAL.gold3;
    if (dir === 'down') {
      c.strokeRect(3, 8, 4, 4, g);
      c.strokeRect(9, 8, 4, 4, g);
      c.set(4, 9, '#cfe8f040');
      c.hline(7, 8, 9, g);
    } else {
      c.strokeRect(0, 8, 4, 4, g);
      c.hline(4, 9, 9, g);
    }
  }
  if (L.extras.has('earring') && dir !== 'up') c.set(dir === 'down' ? 13 : 9, 12, PAL.gold4);
  if (L.extras.has('monocle') && dir !== 'up') {
    const g = PAL.gold3;
    if (dir === 'down') {
      c.strokeRect(9, 8, 4, 4, g);
      c.set(10, 9, '#e8f4ff');
      c.set(12, 12, PAL.gold2);
    } else {
      c.strokeRect(0, 8, 3, 4, g);
      c.set(1, 9, '#e8f4ff');
      c.set(2, 12, PAL.gold2);
    }
  }
  const hair = HAIR_STYLES[L.hairStyle] || HAIR_STYLES.short;
  c.stamp(hair[dir] || [], 0, 0, { h: L.hair[1], H: L.hair[2], j: L.hair[0] });
  const beard = BEARD_STYLES[L.beardStyle] || BEARD_STYLES.none;
  c.stamp(beard[dir] || [], 0, 0, { b: L.beard[1], B: L.beard[2], v: L.beard[0], R: PAL.red3, m: skin.D });
  const hat = HAT_STYLES[L.hatStyle] || HAT_STYLES.none;
  c.stamp(hat[dir] || [], 0, 0, { a: L.hat[1], A: L.hat[2], q: L.hat[0], T: L.hatTrim[2], t: L.hatTrim[0], s: '#f0e8d8' });
  if (L.extras.has('torn') && L.hatStyle === 'stenchhat') crookedHat(c, L, dir);
  if (L.extras.has('facecloth') && dir !== 'up') {
    // A wet cloth tied over nose and mouth.
    const cloth = ['#6a7c86', '#9aaab2', '#c8d6dc'];
    if (dir === 'down') {
      for (let y = 11; y <= 14; y++) for (let x = 3; x <= 12; x++) c.set(x, y, y === 11 ? cloth[2] : x > 9 ? cloth[0] : cloth[1]);
      c.set(2, 11, cloth[0]);
      c.set(13, 11, cloth[0]);
      c.set(4, 13, '#dfeef4');
    } else {
      for (let y = 11; y <= 14; y++) for (let x = 0; x <= 7; x++) c.set(x, y, y === 11 ? cloth[2] : cloth[1]);
      c.hline(8, 11, 11, cloth[0]);
    }
  }
  if (L.extras.has('sockmask') && dir !== 'up') {
    // A wet sock tied over the nose, striped, toe flopping to one side.
    if (dir === 'down') {
      for (let y = 11; y <= 13; y++) for (let x = 3; x <= 12; x++) c.set(x, y, (x + y) % 3 === 0 ? '#c83a30' : '#e8e0d0');
      c.rect(12, 13, 2, 3, '#e8e0d0');
      c.set(13, 15, '#c83a30');
    } else {
      for (let y = 11; y <= 13; y++) for (let x = 0; x <= 7; x++) c.set(x, y, (x + y) % 3 === 0 ? '#c83a30' : '#e8e0d0');
      c.rect(-1, 12, 1, 4, '#e8e0d0');
    }
  }
  if (L.extras.has('bottlemask') && dir !== 'up') {
    // An empty bottle strapped over nose and mouth, neck poking forward.
    if (dir === 'down') {
      c.rect(5, 10, 6, 5, '#4a7a3a');
      c.rect(6, 11, 2, 3, '#8ab870');
      c.rect(7, 15, 2, 2, '#4a7a3a');
      c.hline(1, 4, 11, PAL.lea2);
      c.hline(11, 14, 11, PAL.lea2);
    } else {
      c.rect(-2, 10, 6, 4, '#4a7a3a');
      c.set(-1, 11, '#8ab870');
      c.hline(4, 9, 11, PAL.lea2);
    }
  }
  if (L.extras.has('waxnose') && dir !== 'up') {
    // Two plugs of candle wax up the nostrils.
    if (dir === 'down') {
      c.set(7, 11, '#f4ecc8');
      c.set(9, 11, '#f4ecc8');
    } else c.set(1, 11, '#f4ecc8');
  }
  if (L.extras.has('pipe') && dir !== 'up') {
    if (dir === 'down') {
      c.set(10, 14, PAL.lea2);
      c.set(11, 15, PAL.lea2);
      c.rect(11, 15, 2, 2, PAL.lea3);
    } else {
      c.hline(0, 1, 14, PAL.lea2);
      c.rect(-1, 13, 1, 2, PAL.lea3);
    }
  }
  return c;
}

// ---------------------------------------------------------------------------
// Frame composition

/**
 * @param {object} L resolved look
 * @param {'down'|'left'|'up'} dir
 * @param {{legs?:string, arms?:string, bob?:number, face?:string, sit?:boolean, prop?:string}} pose
 */
export function paintCharacterFrame(L, dir, pose = {}, { outline = true } = {}) {
  const c = new PixelCanvas(FRAME_W, FRAME_H);
  const b = L.build;
  const bob = pose.bob || 0;
  const sitDrop = pose.sit ? Math.floor(b.legH * 0.55) : 0;
  const legTop = GROUND - b.legH + 1;
  const torsoBottom = legTop + 1 + bob + sitDrop;
  const torsoTop = torsoBottom - b.torsoH + 1;

  if (L.cloak && dir !== 'up') cloakBehind(c, L, dir, torsoTop, torsoBottom);
  if (L.extras.has('mop') && dir === 'left') mopStaff(c, L, dir, torsoTop, pose);
  if (dir === 'left') {
    armsSide(c, L, pose.arms || 'down', torsoTop, 'far');
    if (pose.sit) {
      // Seated: thighs forward, shins down.
      const y = torsoBottom - 1;
      for (let i = 0; i < 7; i++) for (let j = 0; j < b.legW - 1; j++) c.set(CX - 4 - i, y + j, L.pants[j === 0 ? 2 : 1]);
      drawBoot(c, L, CX - 11, y + b.legW - 1, 3, Math.max(3, GROUND - y - b.legW + 1), -1);
    } else if (L.style === 'dress') {
      lowerGarmentFront(c, L, torsoBottom, legTop);
      drawBoot(c, L, CX - 3, GROUND - 1, 4, 2, -1);
    } else {
      legsSide(c, L, pose.legs || 'stand', legTop + bob * 0);
    }
    if (L.style === 'longcoat') {
      // Tail flares behind the legs.
      const len = Math.floor(b.legH * 0.65);
      const sw = Math.max(8, Math.round(b.shoulder * 0.62));
      for (let j = 1; j <= len; j++) {
        const x0 = CX - Math.floor(sw / 2) + 1;
        const x1 = CX + Math.ceil(sw / 2) + Math.floor(j / 3) - (pose.legs === 'stepA' ? 0 : 1);
        for (let x = x0 + Math.floor(sw / 2); x <= x1; x++) c.set(x, torsoBottom + j, x === x1 || j === len ? L.primary[0] : L.primary[1]);
      }
    }
    torsoSide(c, L, torsoTop, torsoBottom);
    if (pose.arms !== 'none') armsSide(c, L, pose.arms || 'down', torsoTop, 'near');
    const head = headCanvas(L, 'left', pose.face);
    c.blit(head, CX - 9 + (pose.headDx || 0), torsoTop - 15 + (pose.headDy || 0));
  } else {
    const back = dir === 'up';
    if (pose.sit) {
      const y = torsoBottom;
      drawBoot(c, L, CX - 6, y + 1, 4, 3, 0);
      drawBoot(c, L, CX + 2, y + 1, 4, 3, 0);
    } else if (L.style === 'dress') {
      lowerGarmentFront(c, L, torsoBottom, legTop, { back });
      drawBoot(c, L, CX - 5, GROUND - 1, 4, 2, 0);
      drawBoot(c, L, CX + 1, GROUND - 1, 4, 2, 0);
    } else {
      legsFront(c, L, pose.legs || 'stand', legTop);
    }
    if (L.style !== 'dress') lowerGarmentFront(c, L, torsoBottom, legTop, { back });
    if (back) {
      const head = headCanvas(L, 'up', pose.face);
      torsoFront(c, L, torsoTop, torsoBottom, { back: true });
      armsFront(c, L, pose.arms || 'down', torsoTop, { back: true });
      c.blit(head, CX - 8, torsoTop - 15 + (pose.headDy || 0));
    } else {
      torsoFront(c, L, torsoTop, torsoBottom);
      if (L.extras.has('cutlass')) {
        // Hilt at the left hip.
        const hx = CX - Math.floor(b.shoulder / 2) + 1;
        c.set(hx, torsoBottom, PAL.gold3);
        c.set(hx - 1, torsoBottom + 1, PAL.iron4);
        c.set(hx - 1, torsoBottom + 2, PAL.iron3);
      }
      const head = headCanvas(L, 'down', pose.face);
      const eatsOverHead = pose.arms === 'eat0' || pose.arms === 'eat1';
      if (!eatsOverHead) armsFront(c, L, pose.arms || 'down', torsoTop);
      c.blit(head, CX - 8, torsoTop - 15 + (pose.headDy || 0));
      if (eatsOverHead) armsFront(c, L, pose.arms, torsoTop);
    }
  }
  if (L.cloak && dir === 'up') cloakBack(c, L, torsoTop, torsoBottom);
  if (L.cloak && dir === 'down') cloakFront(c, L, torsoTop);
  if (L.extras.has('mop') && dir !== 'left') mopStaff(c, L, dir, torsoTop, pose);
  if (L.battered) soaked(c, L, torsoTop);
  if (L.extras.has('regalia')) regalia(c, L, dir, torsoTop, torsoBottom);
  if (L.extras.has('brassboots')) brassBoots(c, L, dir);
  if (L.extras.has('gaudy')) gaudy(c, L, dir, torsoTop, torsoBottom);
  if (L.extras.has('singed')) singed(c, L, dir, torsoTop);
  if (L.extras.has('torn')) torn(c, L, dir, torsoTop, torsoBottom);
  if (L.extras.has('dusty')) dusty(c);
  if (L.extras.has('parrotpouch')) parrotPouchOver(c, L, dir, torsoTop);
  if (outline) c.outline(OUTLINE);
  c.torsoTop = torsoTop;
  return c;
}

/**
 * Story Phase 9: caked in the excavation. Sand and dried mud speckled over
 * everything he's wearing (heavier lower down, where the crater got him),
 * the same specks every frame so they don't crawl as he walks.
 */
function dusty(c) {
  const SAND = ['#c8b080', '#b09460', '#8a6e44'];
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (c.alphaAt(x, y) === 0) continue;
      // clumps: decided per 2x2 cell, so it reads as dirt, not noise
      const cx = x >> 1;
      const cy = y >> 1;
      const h = (cx * 73 + cy * 151 + ((cx * cy) % 7) * 31) % 97;
      const p = 8 + Math.round((y / c.height) * 30);
      if (h < p) c.set(x, y, SAND[(h + x + y) % 3]);
    }
  }
}

// ---------------------------------------------------------------------------
// Story Phase 3: the Grand Stenchmaster's regalia (a curtain, a pot, a mop)

function raggedHem(x, y, i, battered) {
  // A torn curtain's hem: uneven, and much worse after the sharks.
  const tear = ((x * 7 + i * 3) % 5) - 2;
  return y + Math.max(0, tear) + (battered && (x % 3 === 0) ? -2 : 0);
}

/** The cloak hanging behind the body (front and side views). */
function cloakBehind(c, L, dir, top, bottom) {
  const b = L.build;
  const w = dir === 'left' ? Math.round(b.shoulder * 0.7) + 4 : b.shoulder + 6;
  const x0 = CX - Math.floor(w / 2) + (dir === 'left' ? 3 : 0);
  const hem = GROUND - 3;
  for (let x = x0; x < x0 + w; x++) {
    const yEnd = raggedHem(x, hem, 1, L.battered);
    for (let y = top + 1; y <= yEnd; y++) {
      const u = (x - x0) / w;
      let col = L.cloak[1];
      if (u < 0.15) col = L.cloak[2];
      if (u > 0.8 || y === yEnd) col = L.cloak[0];
      if ((x - x0) % 4 === 2 && y > top + 4) col = L.cloak[0]; // curtain pleats
      c.set(x, y, col);
    }
  }
}

/** The front of the cloak: shoulders, a gold curtain-cord tied across the chest. */
function cloakFront(c, L, top) {
  const b = L.build;
  const half = Math.ceil(b.shoulder / 2) + 1;
  for (let i = 0; i < 4; i++) {
    c.hline(CX - half - 1 + i, CX - half + 2, top + i, L.cloak[i === 0 ? 2 : 1]);
    c.hline(CX + half - 3, CX + half - i, top + i, L.cloak[1]);
  }
  // the curtain tie-back, pressed into service as a clasp, tassel dangling
  c.hline(CX - 3, CX + 2, top + 3, PAL.gold3);
  c.set(CX - 1, top + 4, PAL.gold4);
  c.vline(CX + 2, top + 4, top + 7, PAL.gold2);
  c.set(CX + 2, top + 8, PAL.gold4);
}

/** Back view: the whole curtain hangs down his back, curtain rings along the top. */
function cloakBack(c, L, top) {
  const b = L.build;
  const w = b.shoulder + 6;
  const x0 = CX - Math.floor(w / 2);
  const hem = GROUND - 3;
  for (let x = x0; x < x0 + w; x++) {
    const yEnd = raggedHem(x, hem, 2, L.battered);
    for (let y = top; y <= yEnd; y++) c.set(x, y, (x - x0) % 4 === 1 ? L.cloak[0] : y === yEnd ? L.cloak[0] : L.cloak[1]);
  }
  for (let x = x0 + 1; x < x0 + w - 1; x += 3) c.set(x, top, PAL.gold3);
}

/** A mop carried upright like a sceptre (in his right hand, at his side). */
function mopStaff(c, L, dir, top, pose) {
  const x = dir === 'left' ? CX - 7 : dir === 'up' ? CX - Math.ceil(L.build.shoulder / 2) - 3 : CX + Math.ceil(L.build.shoulder / 2) + 3;
  const raised = pose.arms === 'raise' ? -6 : 0;
  const y0 = top - 16 + raised;
  c.vline(x, y0 + 5, GROUND - 1 + raised, PAL.wood3);
  c.vline(x + 1, y0 + 5, GROUND - 1 + raised, PAL.wood2);
  // the mop head worn proudly at the top: a grey clump, strands hanging
  c.ellipse(x + 0.5, y0 + 2, 3.5, 2.5, '#d0ccb8');
  for (let i = 0; i < 7; i++) c.vline(x - 3 + i, y0 + 3, y0 + 6 + (i % 3), i % 2 ? '#a8a490' : '#d0ccb8');
  c.set(x - 1, y0 + 1, '#f0ecdc');
  c.rect(x - 1, y0 + 5, 4, 1, PAL.rope2);
}

/** Dripping wet and much bitten about (after the first rowboat trip). */
function soaked(c, L, top) {
  for (const [x, y] of [[CX - 6, top + 6], [CX + 5, top + 10], [CX - 3, GROUND - 6], [CX + 7, GROUND - 9]]) {
    if (!c.alphaAt(x, y)) continue;
    c.set(x, y + 1, '#9bd3e6');
    c.set(x, y + 2, '#5a9ac8');
  }
  // a bite taken out of the coat tail
  c.set(CX + 5, GROUND - 7, 0);
  c.set(CX + 6, GROUND - 7, 0);
  c.set(CX + 6, GROUND - 8, 0);
}

function torsoSide(c, L, top, bottom) {
  const b = L.build;
  const sw = Math.max(8, Math.round(b.shoulder * 0.62));
  const H = bottom - top;
  for (let y = top; y <= bottom; y++) {
    const t = H ? (y - top) / H : 0;
    let w = sw + (b.belly && t > 0.35 && t < 0.95 ? b.belly : 0);
    if (y === top) w -= 3;
    const x0 = CX - Math.floor(sw / 2) + (y === top ? 1 : 0) - (b.belly && t > 0.35 && t < 0.95 ? b.belly : 0);
    const coatLike = L.style === 'coat' || L.style === 'longcoat';
    for (let x = x0; x < x0 + w; x++) {
      let ramp = L.secondary;
      if (coatLike || L.style === 'vest') ramp = x < x0 + 2 && !coatLike ? L.secondary : L.primary;
      if (coatLike && x === x0) ramp = L.secondary;
      if (L.style === 'striped' && (y - top) % 3 === 1) ramp = L.primary;
      let col = ramp[1];
      if (x === x0 || y === top) col = ramp[2];
      if (x >= x0 + w - 2) col = ramp[0];
      c.set(x, y, col);
    }
  }
  if (L.style !== 'dress') {
    for (let x = CX - Math.floor(sw / 2); x < CX + Math.ceil(sw / 2); x++) {
      c.set(x, bottom - 1, L.belt[1]);
      c.set(x, bottom, L.belt[0]);
    }
    c.set(CX - Math.floor(sw / 2), bottom - 1, L.trim[2]);
  }
  if (L.style === 'apron' || L.extras.has('apron')) {
    for (let y = top + Math.floor(b.torsoH * 0.45); y <= bottom + Math.floor(b.legH * 0.6); y++) {
      c.set(CX - Math.floor(sw / 2) - 1, y, L.apron[2]);
      c.set(CX - Math.floor(sw / 2), y, L.apron[1]);
    }
  }
  if (L.extras.has('pouches')) {
    const x = CX - Math.floor(sw / 2) + 1;
    c.rect(x, bottom, 3, 3, L.belt[1]);
    c.set(x + 1, bottom - 1, PAL.gold4);
  }
  if (L.extras.has('rope')) {
    for (let x = CX - Math.floor(sw / 2); x < CX + Math.ceil(sw / 2); x++) c.set(x, bottom - 2, (x % 2) ? '#cca660' : '#a67c3e');
    // The line trails away behind him.
    c.line(CX + Math.ceil(sw / 2), bottom - 2, CX + Math.ceil(sw / 2) + 5, bottom + 6, '#a67c3e');
  }
  if (L.extras.has('toolbelt')) {
    c.vline(CX + Math.ceil(sw / 2) - 2, bottom - 1, bottom + 3, PAL.iron3);
  }
  if (L.extras.has('cutlass')) {
    const x = CX + 1;
    c.set(x, bottom + 1, PAL.gold3);
    c.set(x + 1, bottom + 2, PAL.iron4);
    c.set(x + 2, bottom + 3, PAL.iron4);
    c.set(x + 3, bottom + 4, PAL.iron3);
  }
  if (L.extras.has('stenchsash') || L.extras.has('bluesash')) stenchSashSide(c, L, top, bottom);
}

// ---------------------------------------------------------------------------
// Sheet definition

/** Field animation frames every character sheet contains (down/left/up; right mirrors left). */
export const FIELD_POSES = {
  idle: [{ legs: 'stand', arms: 'down' }, { legs: 'stand', arms: 'down', bob: 1 }],
  walk: [
    { legs: 'stand', arms: 'down' },
    { legs: 'stepA', arms: 'swingA' },
    { legs: 'stand', arms: 'down', bob: 1 },
    { legs: 'stepB', arms: 'swingB' },
  ],
  work: [{ legs: 'stand', arms: 'work0' }, { legs: 'stand', arms: 'work1', bob: 1 }],
  sit: [{ sit: true, arms: 'down' }],
  // Story Phase 8: asleep sitting up (the crew, the night nobody slept), head on chest.
  doze: [{ sit: true, arms: 'down', headDy: 2 }],
  // Asleep lying down (Actor turns it on its side in a hammock or a bedroll), eyes shut.
  sleep: [{ legs: 'stand', arms: 'down', face: 'asleep' }],
  point: [{ legs: 'stand', arms: 'point' }],
  surprised: [{ legs: 'stand', arms: 'up', face: 'surprised' }],
};

export const FIELD_DIRS = ['down', 'left', 'right', 'up'];

/**
 * Extra field animations an appearance can opt into with "poses": [...]
 * (they cost sheet space, so only characters who act them get them).
 * "carrywalk" replaces the walk cycle while a character is carrying.
 */
export const EXTRA_POSES = {
  excited: [{ legs: 'stand', arms: 'up', face: 'surprised' }, { legs: 'stand', arms: 'hips', bob: 1 }],
  smug: [{ legs: 'stand', arms: 'hips' }, { legs: 'stand', arms: 'hips', bob: 1 }],
  greedy: [{ legs: 'stand', arms: 'rub0', bob: 1 }, { legs: 'stand', arms: 'rub1' }],
  carry: [{ legs: 'stand', arms: 'carry' }, { legs: 'stand', arms: 'carry', bob: 1 }],
  carrywalk: [
    { legs: 'stand', arms: 'carry' },
    { legs: 'stepA', arms: 'carry' },
    { legs: 'stand', arms: 'carry', bob: 1 },
    { legs: 'stepB', arms: 'carry' },
  ],
  slouch: [{ legs: 'stand', arms: 'down', bob: 2, headDy: 1 }, { legs: 'stand', arms: 'down', bob: 2 }],
  eat: [{ legs: 'stand', arms: 'eat0' }, { legs: 'stand', arms: 'eat1', bob: 1 }],
  nervous: [{ legs: 'stand', arms: 'clasp' }, { legs: 'stand', arms: 'clasp', bob: 1 }],
  clutch: [{ legs: 'stand', arms: 'clutch', bob: 1, headDy: 1 }, { legs: 'stand', arms: 'clutch', bob: 2, headDy: 1 }],
  panic: [{ legs: 'stepA', arms: 'up', face: 'surprised' }, { legs: 'stepB', arms: 'up', face: 'surprised', bob: 1 }],
  relief: [{ legs: 'stand', arms: 'shrug', bob: 1 }, { legs: 'stand', arms: 'down', bob: 2 }],
  hips: [{ legs: 'stand', arms: 'hips' }],
  shrug: [{ legs: 'stand', arms: 'shrug' }],
  // Story Phase 3
  proclaim: [{ legs: 'stand', arms: 'raise' }, { legs: 'stand', arms: 'raise', bob: 1 }],
  brace: [{ legs: 'stepA', arms: 'work0', bob: 1 }, { legs: 'stepA', arms: 'work1', bob: 2 }],
  // Story Phase 4
  drink: [{ legs: 'stand', arms: 'drink0' }, { legs: 'stand', arms: 'drink1', bob: 1 }],
  poke: [{ legs: 'stepA', arms: 'poke0' }, { legs: 'stepA', arms: 'poke1', bob: 1 }],
  // Story Phase 7: on parade, and in song
  march: [
    { legs: 'stepA', arms: 'salute' },
    { legs: 'stand', arms: 'salute', bob: 1 },
    { legs: 'stepB', arms: 'salute' },
    { legs: 'stand', arms: 'salute', bob: 1 },
  ],
  sing: [{ legs: 'stand', arms: 'wide', face: 'surprised' }, { legs: 'stand', arms: 'wide', bob: 1 }],
};

/** Frames per second of the extra animations (0 = hold one frame). */
export const EXTRA_POSE_RATES = {
  excited: 5, smug: 1.5, greedy: 6, carry: 1.5, carrywalk: 8, slouch: 0.8, eat: 4, nervous: 5, clutch: 3, panic: 7, relief: 1.2, hips: 0, shrug: 0,
  proclaim: 1.4, brace: 6, drink: 2.5, poke: 5, march: 6, sing: 3,
};

// ---------------------------------------------------------------------------
// Story Phase 5: the Grand Stenchmaster Suit. Garrick made it himself:
// burgundy, mustard and a green that should not be on clothes, too many
// epaulettes, medals he awarded himself (one is a bottle cap), a collar that
// stands up past his ears, a stink-cloud crest on the back, gloves, and
// ordinary boots with brass glued on. The sash is part of the suit now.

export const REGALIA = {
  gold: '#f0cc48', goldD: '#a8801c', goldL: '#fff0a0', fringe: '#d8b038',
  collar: '#c8a030', collarD: '#7a5a14', collarEdge: '#5a8a2a',
  cloud: '#8ab83a', cloudD: '#4e7a1e', cloudL: '#c8e070',
  glove: '#e8dcb0', gloveD: '#b8a878',
  medals: [['#3a6ad0', '#f0cc48'], ['#d03a2a', '#d8d8e0'], ['#5a8a2a', '#c87a2a'], ['#8a4ac8', '#e8e0d0']],
};

function regalia(c, L, dir, top, bottom) {
  const b = L.build;
  const R = REGALIA;
  const w = b.shoulder;
  const x0 = CX - Math.floor(w / 2);
  const x1 = x0 + w - 1;
  const epaulette = (ex, ey, flip) => {
    // A gold pad with a fringe hanging off the shoulder (atmospheric command).
    for (let i = 0; i < 4; i++) {
      c.set(ex + (flip ? -i : i), ey, i === 0 ? R.goldL : R.gold);
      c.set(ex + (flip ? -i : i), ey + 1, R.goldD);
    }
    for (let i = 0; i < 4; i += 1) c.set(ex + (flip ? -i : i), ey + 2 + (i % 2), R.fringe);
  };
  if (dir === 'left') {
    const sw = Math.max(8, Math.round(b.shoulder * 0.62));
    epaulette(CX - Math.floor(sw / 2) + 1, top, false);
    // the collar stands up behind the jaw
    for (let y = top - 4; y <= top; y++) {
      c.set(CX + 2, y, y === top - 4 ? R.collarEdge : R.collar);
      c.set(CX + 3, y, R.collarD);
    }
    return;
  }
  epaulette(x0 - 1, top + 1, false);
  epaulette(x1 + 1, top + 1, true);
  // The collar: stiff wings either side of the jaw, an edge of that green.
  for (let y = top - 4; y <= top; y++) {
    const k = top - y;
    c.set(CX - 5 - (k > 2 ? 1 : 0), y, k === 4 ? R.collarEdge : R.collar);
    c.set(CX - 4 - (k > 2 ? 1 : 0), y, R.collarD);
    c.set(CX + 3 + (k > 2 ? 1 : 0), y, R.collarD);
    c.set(CX + 4 + (k > 2 ? 1 : 0), y, k === 4 ? R.collarEdge : R.collar);
  }
  if (dir === 'up') {
    // The stink-cloud crest embroidered across the back.
    const cy = top + 4;
    const blob = [[0, 1], [1, 0], [2, 0], [3, 1], [4, 1], [5, 0], [1, 1], [2, 1], [3, 0], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [2, 3], [3, 3]];
    for (const [dx, dy] of blob) c.set(CX - 3 + dx, cy + dy, dy === 0 ? R.cloudL : dy === 3 ? R.cloudD : R.cloud);
    return;
  }
  // Medals on the left breast (his left): ribbon over disc, four of them.
  R.medals.forEach(([ribbon, disc], i) => {
    const mx = CX - 6 + (i % 2) * 2;
    const my = top + 4 + Math.floor(i / 2) * 3;
    c.set(mx, my, ribbon);
    c.set(mx, my + 1, disc);
  });
  // The bottle cap, crimped, pinned lowest.
  c.set(CX - 5, top + 10, '#c83a30');
  c.set(CX - 6, top + 10, '#e8e0d0');
}

/**
 * Story Phase 6: the suit gets worse every time. A saucepan lid (Salty Jim's)
 * worn as a great medal, bottle caps sewn round the hem, mismatched brass
 * buttons, and a tassel off each epaulette, drooping, soaked in Frog Grog.
 * Same burgundy, mustard and green; just more of it.
 */
function gaudy(c, L, dir, top, bottom) {
  const R = REGALIA;
  const half = Math.ceil(L.build.shoulder / 2);
  const tassel = (x) => {
    c.vline(x, top + 3, top + 6, R.fringe);
    c.set(x, top + 7, '#7aa02c');
    c.set(x, top + 8, '#4a6a1c');
  };
  if (dir === 'left') {
    tassel(CX - 2);
    c.set(CX - 4, top + 6, '#c8c8d0');
    return;
  }
  tassel(CX - half - 1);
  if (!L.extras.has('torn')) tassel(CX + half); // Story Phase 7: a shark has the other one
  // bottle caps round the hem, red and white, alternating
  for (let x = CX - half + 1; x < CX + half; x += 2) c.setIfOpaque(x, bottom, x % 4 === 1 ? '#c83a30' : '#e8e0d0');
  if (dir === 'up') return;
  // the saucepan lid: a big tin disc with a knob, on the right breast
  const mx = CX + 3;
  const my = top + 6;
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 5) c.set(mx + x, my + y, x + y < 0 ? '#e8e8f0' : '#a8a8b4');
  c.set(mx, my, '#5a5a68');
  c.set(mx, my - 3, '#c83a30');
  if (L.extras.has('torn')) {
    // dented: a crease across the lid where it met a shark
    c.set(mx + 1, my - 1, '#5a5a68');
    c.set(mx + 2, my, '#5a5a68');
    c.set(mx - 1, my + 1, '#e8e8f0');
  }
  // mismatched buttons down the front
  for (const [k, col] of [[0, R.gold], [1, '#c8c8d0'], [2, R.goldD], [3, '#c87a2a']]) c.setIfOpaque(CX - 1, top + 3 + k * 3, col);
}

/** After the night: a singed cape hem, soot, grog stains. He thinks it looks magnificent. */
function singed(c, L, dir, top) {
  for (let y = GROUND - 7; y <= GROUND; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      if (!c.alphaAt(x, y)) continue;
      if ((x * 5 + y * 3) % 7 === 0) c.set(x, y, '#2a1a12');
    }
  }
  if (dir === 'down') {
    c.setIfOpaque(CX - 4, top + 9, '#5a7a2a');
    c.setIfOpaque(CX + 2, top + 12, '#5a7a2a');
  }
}

/**
 * Story Phase 7: after the cape shark. A big ragged piece of the cape gone
 * (the shark took it), a seawater tide line round the coat, fresh Frog Grog
 * stains. The missing tassel and the dented lid are in gaudy(); the crooked
 * hat and the bent plume in crookedHat(). Same colours. He thinks it looks
 * magnificent.
 */
function torn(c, L, dir, top, bottom) {
  const cloak = L.cloak ? L.cloak.map((k) => rgba(k)) : [];
  const isCloak = (x, y) => cloak.includes(c.get(x, y));
  const half = Math.ceil(L.build.shoulder / 2);
  if (dir === 'up') {
    // The whole back is cape: a bite out of its lower right, the coat showing through, frayed edge.
    for (let y = top + 4; y <= GROUND - 2; y++) {
      const edge = CX + 2 - Math.floor((y - top - 4) * 0.9) + ((y * 3) % 3) - 1;
      for (let x = edge; x < FRAME_W; x++) {
        if (!isCloak(x, y)) continue;
        if (y > bottom) c.set(x, y, '#00000000');
        else c.set(x, y, (x + y) % 4 === 0 ? '#3a1418' : L.primary[0]);
      }
      if (isCloak(edge - 1, y)) c.set(edge - 1, y, (y % 2) ? '#e8d8b0' : L.cloak[2]);
    }
  } else {
    // Front and side: the cape hanging behind is short a great piece on one side.
    const side = dir === 'left' ? 1 : 1;
    for (let y = top + 7; y <= GROUND; y++) {
      for (let x = 0; x < FRAME_W; x++) {
        const outside = side > 0 ? x > CX + half - (dir === 'left' ? 4 : 0) : x < CX - half;
        if (outside && isCloak(x, y) && (y > top + 7 + ((x * 5) % 4))) c.set(x, y, '#00000000');
      }
    }
  }
  // the tide line: a dotted crust of salt round the lower coat
  for (let x = 0; x < FRAME_W; x++) if (x % 2 === 0) c.setIfOpaque(x, bottom - 1, '#c8ccd0');
  // fresh grog stains
  if (dir === 'down') {
    c.setIfOpaque(CX + 1, top + 5, '#7aa02c');
    c.setIfOpaque(CX - 3, top + 11, '#7aa02c');
    c.setIfOpaque(CX - 2, top + 11, '#4a6a1c');
  } else if (dir === 'left') {
    c.setIfOpaque(CX - 1, top + 8, '#7aa02c');
  }
}

/** The ceremonial hat, knocked crooked: the crown leans right, the green puff bent over and half gone. */
function crookedHat(c, L, dir) {
  // lean: the top rows of the crown shift a pixel right
  for (let y = 0; y <= 2; y++) {
    for (let x = 15; x > 0; x--) c.set(x, y, c.get(x - 1, y));
    c.set(0, y, '#00000000');
  }
  // the puff: most of it gone, one limp green stub hanging over the brim
  for (let x = 0; x < 16; x++) if (c.get(x, 0) === rgba(L.hatTrim[2])) c.set(x, 0, '#00000000');
  const sx = dir === 'up' ? 6 : 7;
  c.set(sx, 1, L.hatTrim[0]);
  c.set(sx - 1, 2, L.hatTrim[2]);
}

/** Ordinary boots with brass glued on: toe caps and a band. */
function brassBoots(c, L, dir) {
  const R = REGALIA;
  const hi = rgba(L.boots[2]);
  const lo = rgba(L.boots[0]);
  for (let y = GROUND - 6; y <= GROUND; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const px = c.get(x, y);
      if (!px) continue;
      if (px === hi && (x + y) % 2 === 0) c.set(x, y, R.gold);
      else if (px === lo && y === GROUND) c.set(x, y, R.goldD);
    }
  }
}
