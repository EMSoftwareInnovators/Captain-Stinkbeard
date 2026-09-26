import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { paintCharacterFrame } from './characterPainter.js';
import { clothRamp } from './ramps.js';

/**
 * Side-view battle poses for party members (facing left toward the enemy).
 * Frames are 48x48; the body is the field side-view with a custom sword arm.
 */
export const BATTLE_W = 48;
export const BATTLE_H = 48;
const OFF = 8; // field frame (32 wide) is centred in the 48-wide battle frame

const DEG = Math.PI / 180;

function drawArm(c, L, sx, sy, ex, ey, hx, hy) {
  const ramp = L.style === 'coat' || L.style === 'longcoat' ? L.primary : L.secondary;
  const w = Math.max(3, L.build.armW);
  c.thickLine(sx, sy, ex, ey, w, ramp[1]);
  c.thickLine(ex, ey, hx, hy, w - 1, ramp[1]);
  c.thickLine(sx - 1, sy - 1, ex - 1, ey - 1, 1, ramp[2]);
  if (L.style === 'longcoat') c.thickLine(hx + Math.sign(ex - hx), hy + Math.sign(ey - hy), hx + 2 * Math.sign(ex - hx), hy + 2 * Math.sign(ey - hy), 2, L.trim[1]);
  c.rect(hx - 1, hy - 1, 3, 3, L.skin.s);
  c.set(hx + 1, hy + 1, L.skin.d);
}

/** Cutlass from the hand at an angle (0° = right, 90° = down). */
export function drawCutlass(c, hx, hy, angle, len = 14, { glint = false } = {}) {
  const dx = Math.cos(angle * DEG);
  const dy = Math.sin(angle * DEG);
  const px = -dy;
  const py = dx;
  // grip behind the hand
  for (let i = 1; i <= 2; i++) c.set(Math.round(hx - dx * i), Math.round(hy - dy * i), PAL.lea2);
  // guard
  c.set(Math.round(hx + px * 2), Math.round(hy + py * 2), PAL.gold3);
  c.set(Math.round(hx + px), Math.round(hy + py), PAL.gold4);
  c.set(Math.round(hx - px), Math.round(hy - py), PAL.gold2);
  for (let i = 1; i <= len; i++) {
    const curve = (i / len) ** 2 * 1.6;
    const x = hx + dx * i + px * curve;
    const y = hy + dy * i + py * curve;
    c.set(Math.round(x), Math.round(y), PAL.iron5);
    c.set(Math.round(x + px), Math.round(y + py), i > len - 2 ? PAL.iron4 : PAL.iron3);
  }
  if (glint) {
    const x = Math.round(hx + dx * (len - 3));
    const y = Math.round(hy + dy * (len - 3));
    c.set(x, y - 2, '#ffffff');
    c.set(x, y + 2, '#ffffff');
    c.set(x - 2, y, '#ffffff');
    c.set(x + 2, y, '#ffffff');
    c.set(x, y, '#ffffff');
  }
}

/**
 * Pose table: body offsets, leg mode, elbow/hand offsets from the shoulder,
 * sword angle. Offsets are in pixels relative to the shoulder.
 */
const POSES = {
  ready: { legs: 'stepA', elbow: [-2, 5], hand: [-6, 7], sword: 200 },
  ready2: { legs: 'stepA', elbow: [-2, 6], hand: [-6, 8], sword: 204, bob: 1 },
  windup: { legs: 'stepA', elbow: [2, -4], hand: [3, -9], sword: 300 },
  swing: { legs: 'stepA', dx: -3, elbow: [-4, 0], hand: [-9, 1], sword: 182 },
  strike: { legs: 'stepA', dx: -4, elbow: [-4, 3], hand: [-8, 7], sword: 150 },
  hurt: { legs: 'stepB', dx: 2, elbow: [3, 3], hand: [6, 6], sword: 70, face: 'surprised', headDx: 1 },
  defend: { legs: 'stand', elbow: [-3, 4], hand: [-5, 2], sword: 268 },
  order: { legs: 'stepA', elbow: [-3, -4], hand: [-6, -9], sword: 235, face: 'surprised' },
  victory: { legs: 'stand', elbow: [0, -5], hand: [0, -11], sword: 272 },
  victory2: { legs: 'stand', elbow: [0, -5], hand: [0, -11], sword: 272, glint: true },
  item: { legs: 'stand', elbow: [-3, 2], hand: [-6, -1], sword: 120, item: true },
  ko: { ko: true },
};

export const BATTLE_POSE_NAMES = Object.keys(POSES);

export function paintBattleFrame(L, poseName) {
  const p = POSES[poseName];
  const c = new PixelCanvas(BATTLE_W, BATTLE_H);
  if (p.ko) {
    const base = paintCharacterFrame(L, 'left', { sit: true, arms: 'down', headDy: 3 }, { outline: false });
    c.blit(base, OFF + 2, 2);
    drawCutlass(c, 10, 44, 175, 13);
    c.outline(PAL.ink);
    return c;
  }
  const base = paintCharacterFrame(L, 'left', { legs: p.legs, arms: 'none', bob: p.bob || 0, face: p.face, headDx: p.headDx || 0 }, { outline: false });
  const bx = OFF + (p.dx || 0);
  c.blit(base, bx, 0);
  const sx = bx + 15;
  const sy = base.torsoTop + 2;
  const [ex, ey] = [sx + p.elbow[0], sy + p.elbow[1]];
  const [hx, hy] = [sx + p.hand[0], sy + p.hand[1]];
  const behind = p.sword > 250 && p.sword < 320 && p.hand[0] >= 0;
  if (behind) drawCutlass(c, hx, hy, p.sword, 14, { glint: p.glint });
  drawArm(c, L, sx, sy, ex, ey, hx, hy);
  if (!behind) drawCutlass(c, hx, hy, p.sword, 14, { glint: p.glint });
  if (p.item) {
    c.rect(hx - 2, hy - 6, 3, 5, PAL.red3);
    c.set(hx - 1, hy - 7, PAL.lea3);
  }
  c.outline(PAL.ink);
  if (p.glint) {
    const x = hx;
    const y = hy - 12;
    for (const [gx, gy] of [[0, -2], [0, 2], [-2, 0], [2, 0], [0, 0]]) c.set(x + gx, y + gy, '#ffffff');
  }
  return c;
}

export { clothRamp };
