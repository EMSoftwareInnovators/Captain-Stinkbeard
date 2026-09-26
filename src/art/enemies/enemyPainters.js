import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { resolveLook, paintCharacterFrame } from '../characters/characterPainter.js';

/**
 * Enemy art. Each enemy has:
 *   field  — small walking sprites for exploration (4 directions x 2 frames)
 *   battle — larger side-view frames facing right: idle0, idle1, attack, hurt
 */
const RAT = {
  bilge: { fur: ['#3a3038', '#5a4c50', '#7a6a68', '#9a8a84'], skin: ['#b86a6a', '#e8a0a0'], eye: '#e83a2a' },
  large: { fur: ['#2a2024', '#46383a', '#625050', '#806a66'], skin: ['#a05858', '#d08888'], eye: '#ffb020' },
};

/** Side-view rat facing right (battle). scale: 1 = bilge rat, 1.4 = large. */
function ratBattle(kind, frame, scale = 1) {
  const R = RAT[kind];
  const W = Math.round(52 * scale);
  const H = Math.round(34 * scale);
  const c = new PixelCanvas(W, H);
  const s = (v) => Math.round(v * scale);
  const lunge = frame === 'attack' ? s(6) : frame === 'hurt' ? -s(3) : 0;
  const breathe = frame === 'idle1' ? 1 : 0;
  const cx = s(24) + lunge;
  const cy = s(20) + breathe;
  // tail (curling behind)
  for (let i = 0; i < s(22); i++) {
    const x = cx - s(12) - i;
    const y = cy + s(4) + Math.round(Math.sin(i / s(5) + (frame === 'idle1' ? 1 : 0)) * s(3));
    c.set(x, y, R.skin[0]);
    if (i < s(12)) c.set(x, y - 1, R.skin[1]);
  }
  // back legs
  c.ellipse(cx - s(8), cy + s(8), s(4), s(3), R.fur[1]);
  c.rect(cx - s(9), cy + s(9), s(5), s(3), R.fur[0]);
  // body
  c.ellipse(cx, cy, s(14), s(9), R.fur[1]);
  c.ellipse(cx - s(1), cy - s(2), s(12), s(6.5), R.fur[2]);
  c.ellipse(cx - s(3), cy - s(4), s(7), s(3), R.fur[3]);
  // fur tufts along the back
  for (let x = -s(10); x < s(10); x += s(3)) c.set(cx + x, cy - s(9) + (x % 2 ? 1 : 0), R.fur[2]);
  // head
  const hx = cx + s(12);
  const hy = cy - s(2) + (frame === 'attack' ? s(2) : 0);
  c.ellipse(hx, hy, s(8), s(6), R.fur[1]);
  c.ellipse(hx + s(1), hy - s(1), s(6), s(4.5), R.fur[2]);
  c.poly([[hx + s(5), hy - s(3)], [hx + s(13), hy + s(1)], [hx + s(5), hy + s(4)]], R.fur[2]);
  c.set(hx + s(13), hy + s(1), R.skin[0]);
  c.set(hx + s(12), hy + s(1), R.skin[1]);
  // ear
  c.ellipse(hx - s(2), hy - s(6), s(3), s(3.5), R.fur[1]);
  c.ellipse(hx - s(2), hy - s(5.5), s(1.8), s(2.2), R.skin[1]);
  // eye
  c.rect(hx + s(3), hy - s(2), Math.max(1, s(2)), Math.max(1, s(2)), R.eye);
  c.set(hx + s(3), hy - s(2), '#ffffff');
  // teeth when attacking
  if (frame === 'attack') {
    c.set(hx + s(10), hy + s(4), '#f8f0d8');
    c.set(hx + s(11), hy + s(4), '#f8f0d8');
    c.set(hx + s(10), hy + s(5), '#f8f0d8');
  }
  // whiskers
  c.line(hx + s(9), hy + s(1), hx + s(15), hy - s(1), R.fur[3]);
  c.line(hx + s(9), hy + s(2), hx + s(15), hy + s(3), R.fur[3]);
  // front legs
  const step = frame === 'attack' ? s(3) : 0;
  c.rect(cx + s(6) + step, cy + s(6), s(3), s(5), R.fur[0]);
  c.rect(cx + s(9) + step, cy + s(10), s(3), s(1.5), R.skin[0]);
  c.rect(cx - s(3), cy + s(7), s(3), s(4), R.fur[0]);
  if (kind === 'large') {
    // scar and torn ear
    c.line(cx - s(4), cy - s(5), cx + s(2), cy - s(1), R.skin[0]);
    c.set(hx - s(3), hy - s(8), 'transparent');
  }
  c.outline(PAL.ink);
  if (frame === 'hurt') c.remap({ [R.fur[2]]: R.fur[3] });
  return c;
}

/** Top-down field rat, 4 directions x 2 frames. */
function ratField(kind, dir, frame, big = false) {
  const R = RAT[kind];
  const W = big ? 24 : 16;
  const c = new PixelCanvas(W, big ? 20 : 16);
  const k = big ? 1.4 : 1;
  const s = (v) => Math.round(v * k);
  const cx = W / 2;
  const cy = big ? 11 : 9;
  const wig = frame ? 1 : -1;
  if (dir === 'left' || dir === 'right') {
    const f = dir === 'right' ? 1 : -1;
    for (let i = 0; i < s(7); i++) c.set(Math.round(cx - f * (s(4) + i)), cy + 2 + (i % 3 === 0 ? wig : 0), R.skin[0]);
    c.ellipse(cx, cy + 1, s(5), s(3.2), R.fur[1]);
    c.ellipse(cx - f, cy, s(4), s(2.2), R.fur[2]);
    c.ellipse(cx + f * s(5), cy + 1, s(2.6), s(2.2), R.fur[1]);
    c.set(Math.round(cx + f * s(7.5)), cy + 1, R.skin[0]);
    c.set(Math.round(cx + f * s(5)), cy - 1, R.eye);
    c.set(Math.round(cx + f * s(3.5)), cy - 2, R.skin[1]);
    c.set(Math.round(cx + f * s(3) + wig), cy + s(4), R.fur[0]);
    c.set(Math.round(cx - f * s(2) - wig), cy + s(4), R.fur[0]);
  } else {
    const f = dir === 'down' ? 1 : -1;
    for (let i = 0; i < s(6); i++) c.set(cx + (i % 3 === 0 ? wig : 0), Math.round(cy - f * (s(4) + i)), R.skin[0]);
    c.ellipse(cx, cy, s(3.5), s(5), R.fur[1]);
    c.ellipse(cx - 1, cy - f, s(2.4), s(3.5), R.fur[2]);
    c.ellipse(cx, cy + f * s(4.5), s(2.5), s(2.5), R.fur[1]);
    if (dir === 'down') {
      c.set(cx - 2, cy + s(4), R.eye);
      c.set(cx + 1, cy + s(4), R.eye);
      c.set(cx, cy + s(7), R.skin[0]);
      c.set(cx - s(3), cy + s(3), R.skin[1]);
      c.set(cx + s(3), cy + s(3), R.skin[1]);
    }
    c.set(cx - s(3) + wig, cy + 1, R.fur[0]);
    c.set(cx + s(3) - wig, cy + 1, R.fur[0]);
  }
  c.outline(PAL.ink);
  return c;
}

const HUMAN_ENEMIES = {
  sparring_sailor: {
    id: 'sparring_sailor', build: 'medium', skin: 'olive', hair: { style: 'short', color: 'darkbrown' }, beard: { style: 'stubble', color: 'darkbrown' },
    hat: { style: 'bandana', color: 'teal' }, outfit: { style: 'striped', primary: 'red', secondary: 'white', pants: 'navy', rolledSleeves: true },
  },
  cutthroat: {
    id: 'cutthroat', build: 'large', skin: 'pale', hair: { style: 'long', color: 'brown' }, beard: { style: 'goatee', color: 'brown' },
    hat: { style: 'bandana', color: 'black' }, outfit: { style: 'vest', primary: 'black', secondary: 'grey', pants: 'brown' }, extras: ['eyepatch', 'earring'],
  },
};

function humanBattle(id, frame) {
  const L = resolveLook(HUMAN_ENEMIES[id]);
  const pose = {
    idle0: { legs: 'stand', arms: 'down' },
    idle1: { legs: 'stand', arms: 'down', bob: 1 },
    attack: { legs: 'stepA', arms: 'point' },
    hurt: { legs: 'stepB', arms: 'up', face: 'surprised' },
  }[frame];
  const base = paintCharacterFrame(L, 'left', pose);
  const c = new PixelCanvas(40, 48);
  c.blit(base, 4, 0, { flipX: true });
  if (frame === 'attack') {
    // belaying pin / club in the extended hand
    c.thickLine(31, 17, 38, 12, 2, PAL.wood3);
  }
  return c;
}

function humanField(id, dir, frame) {
  const L = resolveLook(HUMAN_ENEMIES[id]);
  const src = dir === 'right' ? 'left' : dir;
  const pose = frame ? { legs: 'stepA', arms: 'swingA' } : { legs: 'stand', arms: 'down' };
  const f = paintCharacterFrame(L, src, pose);
  if (dir !== 'right') return f;
  const m = new PixelCanvas(f.width, f.height);
  m.blit(f, 0, 0, { flipX: true });
  return m;
}

export const ENEMY_PAINTERS = {
  bilge_rat: {
    field: (dir, frame) => ratField('bilge', dir, frame),
    battle: (frame) => ratBattle('bilge', frame, 0.85),
  },
  large_bilge_rat: {
    field: (dir, frame) => ratField('large', dir, frame, true),
    battle: (frame) => ratBattle('large', frame, 1.25),
  },
  sparring_sailor: {
    field: (dir, frame) => humanField('sparring_sailor', dir, frame),
    battle: (frame) => humanBattle('sparring_sailor', frame),
  },
  cutthroat: {
    field: (dir, frame) => humanField('cutthroat', dir, frame),
    battle: (frame) => humanBattle('cutthroat', frame),
  },
};

export const ENEMY_BATTLE_FRAMES = ['idle0', 'idle1', 'attack', 'hurt'];
