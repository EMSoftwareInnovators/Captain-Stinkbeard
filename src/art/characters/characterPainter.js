import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
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

export const BUILDS = {
  small: { shoulder: 12, waist: 10, torsoH: 9, legH: 9, legW: 4, legGap: 0, armW: 3, bootH: 3 },
  medium: { shoulder: 14, waist: 12, torsoH: 11, legH: 11, legW: 5, legGap: 0, armW: 3, bootH: 4 },
  thin: { shoulder: 12, waist: 10, torsoH: 12, legH: 12, legW: 4, legGap: 0, armW: 3, bootH: 4 },
  stout: { shoulder: 16, waist: 16, torsoH: 11, legH: 9, legW: 5, legGap: 2, armW: 4, bootH: 3, belly: 2 },
  large: { shoulder: 18, waist: 14, torsoH: 12, legH: 12, legW: 5, legGap: 2, armW: 4, bootH: 5 },
  huge: { shoulder: 20, waist: 16, torsoH: 13, legH: 12, legW: 6, legGap: 2, armW: 5, bootH: 4 },
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
    belt: clothRamp(outfit.belt || 'leather'),
    trim: clothRamp(outfit.trim || 'gold'),
    apron: clothRamp(outfit.apron || 'white'),
    rolledSleeves: !!outfit.rolledSleeves,
    barefoot: !!outfit.barefoot,
    extras: new Set(app.extras || []),
    extraColor: clothRamp(app.extraColor || 'red'),
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

function drawLegColumn(c, L, x, top, bottom, w, { far = false, toe = 0 } = {}) {
  const b = L.build;
  const bootH = Math.min(b.bootH, bottom - top + 1);
  const pants = far ? [L.pants[0], L.pants[0], L.pants[1]] : L.pants;
  for (let y = top; y <= bottom - bootH; y++) rowSpan(c, x, x + w - 1, y, pants);
  drawBoot(c, L, x, bottom - bootH + 1, w, bootH, toe);
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
  drawLegColumn(c, L, rx, legTop, rb, b.legW);
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
  drawLegColumn(c, L, far, legTop, farB, w, { far: true, toe: -1 });
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
  if (!back && L.extras.has('neckerchief')) {
    c.set(CX - 2, top, L.extraColor[1]);
    c.set(CX + 1, top, L.extraColor[1]);
    c.set(CX - 1, top + 1, L.extraColor[2]);
    c.set(CX, top + 1, L.extraColor[1]);
    c.set(CX - 1, top + 2, L.extraColor[0]);
  }
}

/** Coat tails (long coats) and skirts hang below the waist over/around the legs. */
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
  const hair = HAIR_STYLES[L.hairStyle] || HAIR_STYLES.short;
  c.stamp(hair[dir] || [], 0, 0, { h: L.hair[1], H: L.hair[2], j: L.hair[0] });
  const beard = BEARD_STYLES[L.beardStyle] || BEARD_STYLES.none;
  c.stamp(beard[dir] || [], 0, 0, { b: L.beard[1], B: L.beard[2], v: L.beard[0], R: PAL.red3, m: skin.D });
  const hat = HAT_STYLES[L.hatStyle] || HAT_STYLES.none;
  c.stamp(hat[dir] || [], 0, 0, { a: L.hat[1], A: L.hat[2], q: L.hat[0], T: L.hatTrim[2], t: L.hatTrim[0], s: '#f0e8d8' });
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
      c.blit(head, CX - 8, torsoTop - 15);
    } else {
      torsoFront(c, L, torsoTop, torsoBottom);
      if (L.extras.has('cutlass')) {
        // Hilt at the left hip.
        const hx = CX - Math.floor(b.shoulder / 2) + 1;
        c.set(hx, torsoBottom, PAL.gold3);
        c.set(hx - 1, torsoBottom + 1, PAL.iron4);
        c.set(hx - 1, torsoBottom + 2, PAL.iron3);
      }
      armsFront(c, L, pose.arms || 'down', torsoTop);
      const head = headCanvas(L, 'down', pose.face);
      c.blit(head, CX - 8, torsoTop - 15);
    }
  }
  if (outline) c.outline(OUTLINE);
  c.torsoTop = torsoTop;
  return c;
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
  if (L.extras.has('cutlass')) {
    const x = CX + 1;
    c.set(x, bottom + 1, PAL.gold3);
    c.set(x + 1, bottom + 2, PAL.iron4);
    c.set(x + 2, bottom + 3, PAL.iron4);
    c.set(x + 3, bottom + 4, PAL.iron3);
  }
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
  point: [{ legs: 'stand', arms: 'point' }],
  surprised: [{ legs: 'stand', arms: 'up', face: 'surprised' }],
};

export const FIELD_DIRS = ['down', 'left', 'right', 'up'];
