import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { FRAME_W, FRAME_H } from './characterPainter.js';

/**
 * Story Phase 15: Agnes the Second, a small brown hen who came down out of
 * the Sharkstorm on a parachute. Painted for the same 32x48 field frames as
 * everyone else (she stands at the bottom of hers, knee-high to the crew)
 * and a 48x48 portrait for the dialogue box ("Bawk.").
 *
 * Appearance data: { "id": "agnes_second", "painter": "chicken", "plumage": "brown" }
 * Animations: idle (a head-tilt), walk (a strut), work (pecking), sit (settled
 * in, a nest of herself), doze (head tucked).
 */
const INK = PAL.ink;
const GROUND = 45;
const CX = 16;

const PLUMAGE = {
  brown: { d: '#6a3e1c', m: '#9a5e2a', l: '#c88a48', h: '#e8b070' },
  white: { d: '#a8a49a', m: '#d8d4c8', l: '#f0ece0', h: '#ffffff' },
};
const COMB = '#d83a2a';
const BEAK = { m: '#e8a428', d: '#b07018' };
const LEG = '#e8a428';

export const CHICKEN_POSES = {
  idle: [{ head: 0 }, { head: 1, tilt: 1 }],
  walk: [{ head: 0, step: 0 }, { head: 1, step: 1 }, { head: 0, step: 0, bob: 1 }, { head: 1, step: 2 }],
  work: [{ peck: 0 }, { peck: 1 }],
  sit: [{ sit: true }],
  doze: [{ sit: true, tuck: true }],
  // Story Phase 17: panic (wings out, a hop), and dazed (the head going round, after Thunderbottom).
  flap: [{ wings: true, bob: -2 }, { wings: true, tilt: 1 }],
  dazed: [{ tilt: 1 }, { head: 1 }, { tilt: 1, bob: 1 }, { head: 0 }],
};
export const CHICKEN_RATES = { idle: 1.4, walk: 8, work: 4, sit: 1, doze: 1, flap: 9, dazed: 3 };

/**
 * Story Phase 17: after Lord Thunderbottom's release (chapter 219) Agnes is
 * "frazzled": fewer feathers (bald pink patches), the rest standing up every
 * which way, the comb knocked sideways. Appearance "frazzled": true.
 */
function frazzle(c, P, by, side) {
  const SKINP = '#e8a0a0';
  for (const [x, y] of side ? [[CX + 3, by], [CX - 1, by + 2], [CX + 5, by - 2]] : [[CX - 3, by], [CX + 2, by + 2], [CX + 4, by - 1]]) {
    if (c.alphaAt(x, y)) c.set(x, y, SKINP);
    if (c.alphaAt(x + 1, y)) c.set(x + 1, y, SKINP);
  }
  // feathers sticking out
  for (const [x, y] of [[CX - 7, by - 3], [CX + 7, by - 4], [CX - 6, by + 4], [CX + 1, by - 6], [CX + 8, by + 1]]) c.set(x, y, P.l);
}

function body(c, P, dir, pose, app = {}) {
  const by = GROUND - (pose.sit ? 5 : 8) + (pose.bob ?? 0);
  const side = dir === 'left';
  const back = dir === 'up';
  // legs
  if (!pose.sit) {
    const s = pose.step ?? 0;
    const lx = side ? CX : CX - 2;
    c.vline(lx - (s === 1 ? 1 : 0), by + 4, GROUND, LEG);
    c.vline(lx + 3 + (s === 2 ? 1 : 0), by + 4, GROUND, LEG);
    c.hline(lx - 2, lx, GROUND, LEG);
    c.hline(lx + 2, lx + 4, GROUND, LEG);
  }
  // body and tail
  c.ellipse(CX + (side ? 1 : 0), by + 1, side ? 7 : 6, 5, P.m);
  c.ellipse(CX + (side ? 2 : 0), by + 2, side ? 5 : 4, 3, P.l);
  if (pose.wings) {
    // wings out, flapping
    c.poly([[CX - 5, by - 1], [CX - 11, by - 5], [CX - 9, by + 2]], P.d);
    c.poly([[CX + 5, by - 1], [CX + 11, by - 5], [CX + 9, by + 2]], P.d);
  }
  if (side) {
    c.poly([[CX + 6, by - 4], [CX + 9, by - 6], [CX + 8, by + 1]], P.d);
    c.ellipse(CX + 2, by, 3, 2, P.d); // the wing
  } else if (back) {
    c.poly([[CX - 3, by - 5], [CX, by - 8], [CX + 3, by - 5]], P.d);
  } else {
    c.ellipse(CX - 5, by + 1, 2, 3, P.d);
    c.ellipse(CX + 5, by + 1, 2, 3, P.d);
  }
  // head
  const peck = pose.peck ?? -1;
  const hx = side ? CX - 5 - (peck === 1 ? 1 : 0) : CX + (pose.tilt ? 1 : 0);
  const hy = by - 6 + (peck === 1 ? 6 : peck === 0 ? 2 : 0) + (pose.tuck ? 4 : 0) + (pose.head ? 0 : 0);
  if (!back || true) {
    c.ellipse(hx, hy, 3, 3, P.m);
    c.ellipse(hx, hy - 1, 2, 2, P.l);
    // comb and wattle (knocked sideways when she's frazzled)
    if (app.frazzled) {
      c.rect(hx, hy - 4, 3, 1, COMB);
      c.set(hx + 2, hy - 3, COMB);
    } else c.rect(hx - 1, hy - 4, 3, 2, COMB);
    if (!back) {
      c.set(hx + (side ? -1 : 0), hy + 3, COMB);
      // beak and eye
      if (side) {
        c.rect(hx - 4, hy, 2, 1, BEAK.m);
        c.set(hx - 4, hy + 1, BEAK.d);
        if (!pose.tuck) c.set(hx - 1, hy - 1, INK);
      } else {
        c.rect(hx, hy + 1, 1, 2, BEAK.m);
        if (!pose.tuck) {
          c.set(hx - 2, hy - 1, INK);
          c.set(hx + 2, hy - 1, INK);
        }
      }
    }
  }
}

function frame(app, dir, pose) {
  const P = PLUMAGE[app.plumage ?? 'brown'] ?? PLUMAGE.brown;
  const c = new PixelCanvas(FRAME_W, FRAME_H);
  body(c, P, dir, pose, app);
  if (app.frazzled) frazzle(c, P, GROUND - (pose.sit ? 5 : 8) + (pose.bob ?? 0), dir === 'left');
  c.outline(INK);
  return c;
}

function mirror(pc) {
  const out = new PixelCanvas(pc.width, pc.height);
  out.blit(pc, 0, 0, { flipX: true });
  return out;
}

export function paintChickenSheet(appearance) {
  const frames = {};
  const anims = {};
  for (const [anim, poses] of Object.entries(CHICKEN_POSES)) {
    for (const dir of ['down', 'left', 'right', 'up']) {
      anims[`${anim}_${dir}`] = poses.map((pose, i) => {
        let f = frame(appearance, dir === 'right' ? 'left' : dir, pose);
        if (dir === 'right') f = mirror(f);
        const name = `${anim}_${dir}_${i}`;
        frames[name] = f;
        return name;
      });
    }
  }
  return { frames, anims };
}

export const CHICKEN_EXPRESSIONS = ['neutral', 'curious', 'alarmed', 'content', 'dazed', 'mellow'];

/** 48x48: a hen, close up, with a look. */
export function paintChickenPortrait(portrait, expression = 'neutral') {
  const P = PLUMAGE[portrait.plumage ?? 'brown'] ?? PLUMAGE.brown;
  const c = new PixelCanvas(48, 48);
  c.rect(0, 0, 48, 48, '#3a5a6a');
  c.ellipse(26, 40, 16, 12, P.m);
  c.ellipse(26, 42, 11, 7, P.l);
  const tilt = expression === 'curious' ? 3 : 0;
  c.ellipse(22 + tilt, 22, 9, 9, P.m);
  c.ellipse(22 + tilt, 20, 7, 6, P.l);
  c.rect(17 + tilt, 9, 9, 4, COMB);
  c.rect(19 + tilt, 7, 3, 2, COMB);
  c.poly([[12 + tilt, 22], [7 + tilt, 24], [12 + tilt, 26]], BEAK.m);
  c.rect(14 + tilt, 28, 3, 4, COMB);
  const eyeY = expression === 'alarmed' ? 18 : 19;
  if (expression === 'content' || expression === 'mellow') c.hline(17 + tilt, 19 + tilt, eyeY, INK);
  else if (expression === 'dazed') {
    // a little spiral of an eye
    c.rect(16 + tilt, eyeY - 1, 4, 4, '#ffffff');
    c.set(17 + tilt, eyeY, INK); c.set(18 + tilt, eyeY, INK); c.set(18 + tilt, eyeY + 1, INK); c.set(16 + tilt, eyeY + 2, INK); c.set(19 + tilt, eyeY - 1, INK);
  } else {
    c.rect(17 + tilt, eyeY, 2, expression === 'alarmed' ? 3 : 2, INK);
    c.set(17 + tilt, eyeY, '#ffffff');
  }
  if (expression === 'alarmed') for (const [x, y] of [[34, 8], [38, 12], [40, 6]]) c.set(x, y, '#ffffff');
  if (expression === 'mellow') for (const [x, y] of [[36, 10], [39, 7]]) c.set(x, y, '#9cc070');
  if (portrait.frazzled) {
    // bald patches, the rest of her feathers standing up, the comb knocked over
    for (const [x, y, w] of [[30, 34, 4], [20, 42, 3], [26, 30, 2]]) c.rect(x, y, w, 2, '#e8a0a0');
    for (const [x, y] of [[12, 32], [10, 36], [40, 30], [43, 34], [24, 12], [30, 14], [36, 27]]) c.line(x, y, x + (x < 24 ? -2 : 2), y - 3, P.l);
  }
  c.outline(INK);
  return c;
}
