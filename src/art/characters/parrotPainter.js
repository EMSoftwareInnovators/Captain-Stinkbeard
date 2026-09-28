import { PixelCanvas } from '../PixelCanvas.js';
import { PAL, mix } from '../palette.js';
import { FRAME_W, FRAME_H } from './characterPainter.js';

/**
 * Captain Squawks: a red-and-blue parrot, painted for the same 32x48 field
 * frames and 48x48 portraits as everyone else, in four plumage states:
 *
 *   normal   full scarlet plumage, blue wings with a gold band
 *   exposed  puffed, sooty, feathers coming loose, eyes streaming
 *   bald     almost featherless and pink: a crest of three feathers and a
 *            two-feather tail are all that is left
 *   sweater  bald, in a hand-knitted jumper and bobble cap
 *
 * Story Phase 3 adds a blanket he stays bundled in ("blanket": true) and the
 * first feather to grow back, which is yellow ("yellowFeather": true).
 *
 * Appearance data: { "id": "squawks", "painter": "parrot", "plumage": "normal", "sweater": false }
 */
const INK = PAL.ink;
const GROUND = 45;
const CX = 16;

export function parrotLook(app) {
  const plumage = app.plumage ?? 'normal';
  const bald = plumage === 'bald';
  const exposed = plumage === 'exposed';
  const sooty = (c) => (exposed ? mix(c, '#7a6c28', 0.32) : c);
  const skin = { d: '#b85a64', m: '#e08a8e', l: '#f6b8b4' };
  const red = { d: sooty(PAL.red1), m: sooty(PAL.red3), l: sooty(PAL.red4) };
  const blue = { d: sooty('#1c3060'), m: sooty('#2c58a8'), l: sooty('#5a88d0') };
  return {
    plumage,
    bald,
    exposed,
    sweater: !!app.sweater,
    blanket: !!app.blanket,
    yellowFeather: !!app.yellowFeather,
    plaid: ['#4a3a6a', '#6a5a8a', '#c8b8e0', '#8a2a2a'],
    body: bald ? skin : red,
    wing: bald ? { d: skin.d, m: skin.m, l: skin.l } : blue,
    band: bald ? skin.l : sooty(PAL.gold3),
    crest: red,
    tail: bald ? [red.m, blue.m] : [red.m, blue.m, red.l, blue.l],
    beak: { l: '#efe6d4', m: '#c8bca8', d: '#4a4450' },
    patch: exposed ? '#e8dcc0' : '#f6f0e4',
    wool: ['#7a2a24', '#b4483a', '#dc7456'],
    woolStripe: '#f0e4c8',
    feet: '#6a6a80',
  };
}

// ---------------------------------------------------------------------------
// Field sprites

function feet(c, L, x0, x1, y = GROUND) {
  for (const x of [x0, x1]) {
    c.set(x, y, L.feet);
    c.set(x + 1, y, L.feet);
    c.set(x, y - 1, L.feet);
  }
}

function wool(c, L, x, y) {
  // Knitted stripes every third row.
  c.set(x, y, (y % 3 === 0) ? L.woolStripe : ((x + y) % 2 ? L.wool[1] : L.wool[2]));
}

function sweaterOver(c, L, cx, cy, rx, ry) {
  for (let y = Math.round(cy - ry); y <= Math.round(cy + ry); y++) {
    for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1 && c.alphaAt(x, y)) wool(c, L, x, y);
    }
  }
}

/** A tartan blanket wrapped round him from the shoulders down. */
function blanketOver(c, L, cx, cy, rx, ry, shift = 0) {
  for (let y = Math.round(cy - ry * 0.35); y <= Math.round(cy + ry + 1); y++) {
    for (let x = Math.round(cx - rx - 1); x <= Math.round(cx + rx + 1); x++) {
      const nx = (x - cx) / (rx + 1);
      const ny = (y - cy) / (ry + 1);
      if (nx * nx + ny * ny > 1.05) continue;
      let col = L.plaid[1];
      if ((x + shift) % 4 === 0) col = L.plaid[0];
      if (y % 4 === 0) col = L.plaid[3];
      if ((x + shift) % 4 === 0 && y % 4 === 0) col = L.plaid[2];
      c.set(x, y, col);
    }
  }
}

/** The first feather to grow back: small, proud and unmistakably yellow. */
function newFeather(c, x, y, lean = 1) {
  c.line(x, y, x + lean, y - 4, '#e8d040');
  c.set(x + lean, y - 5, '#f8f080');
  c.set(x, y - 1, '#c8a820');
}

function cap(c, L, cx, top, w) {
  for (let y = top; y < top + 4; y++) {
    for (let x = cx - w; x <= cx + w; x++) c.set(x, y, y === top + 3 ? L.woolStripe : (x + y) % 2 ? L.wool[1] : L.wool[2]);
  }
  c.rect(cx - 1, top - 2, 3, 2, L.woolStripe);
  c.set(cx, top - 3, L.woolStripe);
}

function crest(c, L, x, y, dir = 0) {
  // The last three feathers, standing proud.
  c.line(x, y, x - 1 + dir, y - 4, L.crest.m);
  c.line(x + 1, y, x + 1 + dir, y - 5, L.crest.l);
  c.line(x + 2, y, x + 3 + dir, y - 3, L.crest.m);
}

function ruffle(c, L, n, seed) {
  // Loose feathers poking out (exposed plumage).
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const x = 8 + (s % 16);
    const y = 28 + ((s >> 8) % 16);
    if (c.alphaAt(x, y) && !c.alphaAt(x + 1, y)) c.set(x + 1, y, L.body.l);
    if (c.alphaAt(x, y) && !c.alphaAt(x, y - 1)) c.set(x, y - 1, L.body.d);
  }
}

/** Front view (facing down). */
function front(c, L, { bob = 0, wings = 'folded', beakOpen = false, blink = false } = {}) {
  const by = 38 + bob;
  // tail feathers peeking out below
  L.tail.forEach((col, i) => c.line(CX - 2 + i, by + 5, CX - 3 + i * 2, GROUND + 1, col));
  c.ellipse(CX, by, 5.5, 6.5, L.body.m);
  c.ellipse(CX - 1, by + 1, 3, 4, L.body.l);
  if (wings === 'up') {
    c.poly([[CX - 5, by - 2], [CX - 12, by - 12], [CX - 8, by - 1]], L.wing.m);
    c.poly([[CX + 5, by - 2], [CX + 12, by - 12], [CX + 8, by - 1]], L.wing.d);
    c.line(CX - 6, by - 4, CX - 11, by - 11, L.band);
    c.line(CX + 6, by - 4, CX + 11, by - 11, L.band);
  } else if (wings === 'spread') {
    c.poly([[CX - 5, by - 3], [CX - 14, by - 1], [CX - 5, by + 3]], L.wing.m);
    c.poly([[CX + 5, by - 3], [CX + 14, by - 1], [CX + 5, by + 3]], L.wing.d);
    c.hline(CX - 12, CX - 6, by - 1, L.band);
    c.hline(CX + 6, CX + 12, by - 1, L.band);
  } else {
    c.ellipse(CX - 5, by, 2, 5, L.wing.m);
    c.ellipse(CX + 5, by, 2, 5, L.wing.d);
    c.set(CX - 5, by - 3, L.band);
    c.set(CX + 5, by - 3, L.band);
  }
  if (L.sweater) sweaterOver(c, L, CX, by, 5.5, 6.5);
  if (L.blanket) blanketOver(c, L, CX, by + 1, 6, 6);
  // head
  const hy = by - 9;
  c.ellipse(CX, hy, 4.5, 4.5, L.body.m);
  c.ellipse(CX - 1, hy - 1, 2.5, 2.5, L.body.l);
  // white face patches and eyes
  for (const ex of [CX - 3, CX + 2]) {
    c.rect(ex, hy - 1, 2, 3, L.patch);
    if (blink) c.hline(ex, ex + 1, hy + 1, INK);
    else c.set(ex + (ex < CX ? 1 : 0), hy, INK);
    if (L.exposed) c.set(ex, hy + 2, '#8ac8f0');
  }
  // beak
  c.rect(CX - 1, hy + 1, 3, 2, L.beak.l);
  c.set(CX + 1, hy + 1, L.beak.m);
  c.set(CX, hy + 3, L.beak.l);
  if (beakOpen) {
    c.hline(CX - 1, CX + 1, hy + 3, '#3a1418');
    c.hline(CX - 1, CX + 1, hy + 4, L.beak.d);
  } else c.set(CX, hy + 4, L.beak.d);
  if (L.sweater) cap(c, L, CX, hy - 5, 4);
  else if (L.bald) crest(c, L, CX - 1, hy - 4);
  else {
    c.set(CX - 1, hy - 5, L.body.l);
    c.set(CX, hy - 5, L.body.m);
  }
  if (L.yellowFeather) newFeather(c, CX + 3, hy - 5);
  feet(c, L, CX - 3, CX + 2, GROUND);
}

/** Side view facing left. */
function side(c, L, { bob = 0, wing = 'folded', beakOpen = false, hop = 0, blink = false, preen = false } = {}) {
  const by = 38 + bob - hop;
  // tail sweeping back and down
  L.tail.forEach((col, i) => c.line(CX + 3, by + 2 + i, CX + 13 - (L.bald ? 4 : 0), GROUND - 3 + i - hop, col));
  c.ellipse(CX + 1, by, 6, 6, L.body.m);
  c.ellipse(CX - 1, by + 1, 3, 4, L.body.l);
  if (wing === 'up') {
    c.poly([[CX, by - 2], [CX + 8, by - 13], [CX + 7, by]], L.wing.m);
    c.line(CX + 2, by - 4, CX + 7, by - 11, L.band);
  } else if (wing === 'mid') {
    c.poly([[CX - 1, by - 3], [CX + 12, by - 5], [CX + 6, by + 1]], L.wing.m);
    c.hline(CX + 2, CX + 9, by - 4, L.band);
  } else if (wing === 'down') {
    c.poly([[CX, by], [CX + 9, by + 8], [CX + 6, by - 1]], L.wing.d);
    c.line(CX + 2, by + 1, CX + 7, by + 6, L.band);
  } else {
    c.ellipse(CX + 3, by, 4.5, 3.5, L.wing.m);
    c.hline(CX, CX + 5, by - 3, L.band);
    c.set(CX + 7, by + 1, L.wing.d);
  }
  if (L.sweater) sweaterOver(c, L, CX + 1, by, 6, 6);
  if (L.blanket) blanketOver(c, L, CX + 1, by + 1, 6.5, 6, 1);
  const hx = CX - 3;
  const hy = by - 8 + (preen ? 3 : 0);
  c.ellipse(hx, hy, 4.5, 4.5, L.body.m);
  c.ellipse(hx - 1, hy - 1, 2.5, 2, L.body.l);
  c.rect(hx - 3, hy - 1, 3, 3, L.patch);
  if (blink) c.hline(hx - 3, hx - 1, hy + 1, INK);
  else c.set(hx - 2, hy, INK);
  if (L.exposed) c.set(hx - 3, hy + 2, '#8ac8f0');
  // hooked beak
  const bx = hx - 5;
  c.rect(bx, hy + 1, 3, 2, L.beak.l);
  c.set(bx - 1, hy + 2, L.beak.l);
  c.set(bx - 1, hy + 3, L.beak.m);
  if (beakOpen) {
    c.set(bx, hy + 3, '#3a1418');
    c.hline(bx, bx + 2, hy + 4, L.beak.d);
  } else c.hline(bx, bx + 1, hy + 3, L.beak.d);
  if (L.sweater) cap(c, L, hx, hy - 6, 4);
  else if (L.bald) crest(c, L, hx, hy - 4, 1);
  else c.line(hx + 1, hy - 5, hx + 4, hy - 7, L.body.m);
  if (L.yellowFeather) newFeather(c, hx + 3, hy - 6, 2);
  if (hop < 3) feet(c, L, CX - 1, CX + 2, GROUND - hop);
}

/** Back view (facing up). */
function back(c, L, { bob = 0, wings = 'folded' } = {}) {
  const by = 38 + bob;
  L.tail.forEach((col, i) => c.line(CX - 1 + i, by + 3, CX - 2 + i * 2, GROUND + 1, col));
  c.ellipse(CX, by, 5.5, 6.5, L.body.d);
  if (wings === 'up' || wings === 'spread') {
    c.poly([[CX - 4, by - 3], [CX - 13, by - 11], [CX - 3, by + 2]], L.wing.m);
    c.poly([[CX + 4, by - 3], [CX + 13, by - 11], [CX + 3, by + 2]], L.wing.m);
  } else {
    c.ellipse(CX - 2, by, 3, 5.5, L.wing.m);
    c.ellipse(CX + 2, by, 3, 5.5, L.wing.d);
    c.hline(CX - 4, CX + 4, by - 3, L.band);
  }
  if (L.sweater) sweaterOver(c, L, CX, by, 5.5, 6.5);
  if (L.blanket) blanketOver(c, L, CX, by + 1, 6, 6, 2);
  const hy = by - 9;
  c.ellipse(CX, hy, 4.5, 4.5, L.body.m);
  if (L.sweater) cap(c, L, CX, hy - 5, 4);
  else if (L.bald) crest(c, L, CX - 1, hy - 4);
  if (L.yellowFeather) newFeather(c, CX + 2, hy - 5);
  feet(c, L, CX - 3, CX + 2, GROUND);
}

function frame(L, dir, pose) {
  const c = new PixelCanvas(FRAME_W, FRAME_H);
  if (dir === 'left') side(c, L, pose);
  else if (dir === 'up') back(c, L, { bob: pose.bob, wings: pose.wing === 'up' ? 'up' : pose.wings });
  else front(c, L, pose);
  if (L.exposed) ruffle(c, L, 7, dir.length * 97 + (pose.bob || 0) * 13 + (pose.hop || 0) * 7);
  c.outline(INK);
  return c;
}

/** Pose → per-direction drawing options. */
const PARROT_POSES = {
  idle: [{ bob: 0 }, { bob: 1, blink: true }],
  walk: [{ hop: 0 }, { hop: 3, bob: 0 }, { hop: 1 }, { hop: 3, bob: 0 }],
  work: [{ preen: true }, { preen: true, bob: 1 }],
  sit: [{ bob: 1, blink: true }],
  point: [{ wing: 'mid', wings: 'spread', beakOpen: true }],
  surprised: [{ wing: 'up', wings: 'up', beakOpen: true }],
  fly: [
    { wing: 'up', wings: 'up', hop: 4 },
    { wing: 'mid', wings: 'spread', hop: 5 },
    { wing: 'down', wings: 'folded', hop: 4 },
    { wing: 'mid', wings: 'spread', hop: 3 },
  ],
  squawk: [{ beakOpen: true, wing: 'mid', wings: 'spread' }, { beakOpen: false, bob: 1 }],
  furious: [{ beakOpen: true, wing: 'up', wings: 'up', hop: 2 }, { beakOpen: true, wing: 'mid', wings: 'spread', hop: 4 }],
  shiver: [{ bob: 1, blink: false }, { bob: 2, blink: true }],
};

export const PARROT_RATES = { idle: 1.4, walk: 10, work: 3, sit: 0, point: 0, surprised: 0, fly: 12, squawk: 5, furious: 9, shiver: 9 };

function mirror(pc) {
  const m = new PixelCanvas(pc.width, pc.height);
  m.blit(pc, 0, 0, { flipX: true });
  return m;
}

/** Frames for a parrot sheet: { name: PixelCanvas } plus anims { anim_dir: [names] }. */
export function paintParrotSheet(appearance) {
  const L = parrotLook(appearance);
  const frames = {};
  const anims = {};
  for (const [anim, poses] of Object.entries(PARROT_POSES)) {
    for (const dir of ['down', 'left', 'right', 'up']) {
      const names = poses.map((pose, i) => {
        let f = frame(L, dir === 'right' ? 'left' : dir, pose);
        if (dir === 'right') f = mirror(f);
        const name = `${anim}_${dir}_${i}`;
        frames[name] = f;
        return name;
      });
      anims[`${anim}_${dir}`] = names;
    }
  }
  return { frames, anims };
}

// ---------------------------------------------------------------------------
// Portraits (48x48)

export const PARROT_EXPRESSIONS = ['neutral', 'smug', 'insulting', 'worried', 'horrified', 'furious', 'exhausted', 'outraged', 'surprised', 'squawk'];

/**
 * @param {object} portrait - data/portraits entry with "plumage" and "sweater"
 * @param {string} expression
 */
export function paintParrotPortrait(portrait, expression = 'neutral') {
  const L = parrotLook({ plumage: portrait.plumage, sweater: portrait.sweater, blanket: portrait.blanket, yellowFeather: portrait.yellowFeather });
  const c = new PixelCanvas(48, 48);
  const e = expression;
  const puffed = e === 'horrified' || e === 'furious' || e === 'outraged' || L.exposed;
  const hx = 25;
  const hy = 24;
  // chest and shoulders
  c.ellipse(24, 48, 17, 11, L.body.m);
  c.ellipse(20, 47, 8, 6, L.body.l);
  if (!L.bald) {
    c.ellipse(8, 44, 6, 8, L.wing.m);
    c.ellipse(40, 44, 6, 8, L.wing.d);
    c.line(5, 38, 11, 38, L.band);
    c.line(37, 38, 43, 38, L.band);
  } else {
    c.ellipse(8, 45, 5, 7, L.wing.d);
    c.ellipse(40, 45, 5, 7, L.wing.d);
    c.set(6, 40, '#2c58a8');
    c.set(7, 41, '#2c58a8');
  }
  if (L.sweater) {
    for (let y = 37; y < 48; y++) for (let x = 6; x < 43; x++) if (c.alphaAt(x, y)) wool(c, L, x, y);
    // ribbed collar
    for (let x = 14; x < 35; x++) c.set(x, 37, x % 2 ? L.wool[0] : L.woolStripe);
  }
  if (L.blanket) {
    // bundled up to the chin in a tartan blanket
    for (let y = 39; y < 48; y++) {
      for (let x = 2; x < 46; x++) {
        if (!c.alphaAt(x, y) && Math.abs(x - 24) > 18 - (y - 39)) continue;
        let col = L.plaid[1];
        if (x % 5 === 0) col = L.plaid[0];
        if (y % 5 === 0) col = L.plaid[3];
        if (x % 5 === 0 && y % 5 === 0) col = L.plaid[2];
        c.set(x, y, col);
      }
    }
  }
  // head
  const r = puffed ? 14 : 13;
  c.ellipse(hx, hy, r, r - 1, L.body.m);
  c.ellipse(hx - 4, hy - 4, r - 7, r - 8, L.body.l);
  if (L.exposed) {
    // sooty smudges and a missing patch
    c.ellipse(hx + 6, hy + 5, 3, 2, '#8a7a48');
    c.ellipse(hx - 8, hy + 8, 2, 2, '#e08a8e');
  }
  // crest / cap
  if (L.sweater) {
    for (let y = hy - 16; y < hy - 7; y++) {
      const half = Math.round(12 * Math.sqrt(Math.max(0, 1 - ((y - (hy - 7)) / 9) ** 2)));
      for (let x = hx - half; x <= hx + half; x++) c.set(x, y, (y % 3 === 0) ? L.woolStripe : (x + y) % 2 ? L.wool[1] : L.wool[2]);
    }
    for (let x = hx - 12; x <= hx + 12; x++) c.set(x, hy - 7, x % 2 ? L.woolStripe : L.wool[0]);
    c.ellipse(hx, hy - 18, 3, 3, L.woolStripe);
  } else if (L.bald) {
    const tremble = e === 'outraged' || e === 'furious' ? 1 : 0;
    c.line(hx - 3, hy - 12, hx - 6 - tremble, hy - 20, L.crest.m);
    c.line(hx, hy - 13, hx + tremble, hy - 22, L.crest.l);
    c.line(hx + 3, hy - 12, hx + 6, hy - 19 + tremble, L.crest.m);
  } else {
    for (let i = 0; i < 4; i++) c.line(hx - 4 + i * 3, hy - 12, hx - 6 + i * 4, hy - 18 - (i % 2) * 2 - (puffed ? 3 : 0), i % 2 ? L.body.l : L.body.m);
  }
  if (L.yellowFeather) {
    // one new feather, poking up out of the cap: yellow
    c.line(hx + 7, hy - 14, hx + 10, hy - 24, '#e8d040');
    c.line(hx + 8, hy - 14, hx + 11, hy - 23, '#c8a820');
    c.set(hx + 10, hy - 25, '#f8f080');
    c.set(hx + 11, hy - 25, '#f8f080');
  }
  if (e === 'furious' || e === 'horrified') {
    // hackles up
    for (let i = 0; i < 5; i++) c.line(hx - 13 + i, hy + 2 - i * 2, hx - 17 + i, hy - i * 2, L.body.d);
  }
  // eye patch
  const ex = hx - 3;
  const ey = hy - 2;
  c.ellipse(ex, ey, 6, 5, L.patch);
  for (let i = 0; i < 4; i++) c.set(ex - 5 + i * 3, ey + 4, '#c8c0b0');
  // eye by expression
  const pupil = (x, y, rr = 1.6) => c.ellipse(x, y, rr, rr, INK);
  switch (e) {
    case 'smug':
    case 'insulting':
      c.hline(ex - 3, ex + 3, ey - 1, L.body.d);
      c.hline(ex - 3, ex + 3, ey, INK);
      pupil(ex + 1, ey + 1, 1.2);
      if (e === 'insulting') c.line(ex - 4, ey - 4, ex + 4, ey - 2, L.body.d);
      break;
    case 'worried':
      pupil(ex, ey + 1, 1.8);
      c.set(ex + 1, ey, '#ffffff');
      c.line(ex - 4, ey - 3, ex + 3, ey - 5, L.body.d);
      break;
    case 'horrified':
    case 'surprised':
      c.ellipse(ex, ey, 4.5, 4.5, '#ffffff');
      c.ellipseOutline(ex, ey, 4.5, 4.5, INK);
      c.set(ex, ey, INK);
      break;
    case 'furious':
    case 'outraged':
      pupil(ex + 1, ey + 1, 1.8);
      c.line(ex - 5, ey - 5, ex + 4, ey - 1, INK);
      c.line(ex - 5, ey - 4, ex + 4, ey, L.body.d);
      break;
    case 'exhausted':
      c.hline(ex - 3, ex + 3, ey, L.body.d);
      c.hline(ex - 3, ex + 3, ey + 1, INK);
      pupil(ex, ey + 2, 1.1);
      c.hline(ex - 3, ex + 3, ey + 3, L.body.d);
      break;
    default:
      pupil(ex, ey, 1.8);
      c.set(ex + 1, ey - 1, '#ffffff');
  }
  if (L.exposed || e === 'exhausted') {
    c.set(ex - 2, ey + 4, '#8ac8f0');
    c.set(ex - 2, ey + 5, '#8ac8f0');
  }
  // the beak: big and hooked
  const open = ['insulting', 'horrified', 'furious', 'outraged', 'surprised', 'squawk'].includes(e);
  const bx = hx - 14;
  const by = hy + 2;
  c.poly([[bx + 9, by - 5], [bx, by - 3], [bx - 3, by + 2], [bx - 1, by + 6], [bx + 3, by + 2], [bx + 10, by + 1]], L.beak.l);
  c.line(bx, by - 3, bx - 3, by + 2, L.beak.m);
  c.set(bx - 1, by + 6, L.beak.m);
  if (open) {
    c.poly([[bx + 9, by + 2], [bx + 2, by + 3], [bx + 3, by + 9], [bx + 10, by + 6]], '#3a1418');
    c.poly([[bx + 9, by + 7], [bx + 2, by + 9], [bx + 4, by + 12], [bx + 10, by + 10]], L.beak.d);
    if (e === 'insulting') c.ellipse(bx + 5, by + 6, 2, 1.5, '#e46452');
  } else {
    c.poly([[bx + 10, by + 2], [bx + 3, by + 3], [bx + 4, by + 6], [bx + 10, by + 5]], L.beak.d);
    if (e === 'smug') c.line(bx + 4, by + 3, bx + 9, by + 1, INK);
  }
  if (e === 'squawk' || e === 'furious' || e === 'outraged') {
    // shout lines
    c.line(2, hy - 6, 6, hy - 4, '#fff4e0');
    c.line(1, hy + 1, 5, hy + 1, '#fff4e0');
    c.line(2, hy + 8, 6, hy + 6, '#fff4e0');
  }
  if (e === 'exhausted') {
    // a single feather drifting past
    c.line(40, 8, 43, 12, L.bald ? L.crest.m : L.body.l);
    c.set(41, 9, L.body.d);
  }
  c.outline(INK);
  return c;
}
