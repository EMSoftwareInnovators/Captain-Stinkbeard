import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';

/**
 * Stage sprites for Story Phase 4: the crowd of distant fins, a hammerhead
 * ramming the hull, the Shark Duty markers, and the small things scenes
 * move around (a mug of Frog Grog, a crumpled forecast, garlic toast, a
 * yellow pillow, the Grand Stenchmaster's tray-clipboard).
 */
const INK = PAL.ink;
const SHARK = { d: '#3a4658', m: '#5a6a80', l: '#8a9ab0', belly: '#d8dce4' };
const FOAM = '#e6f5f8';
const RIPPLE = '#9bd3e6';

function ripples(c, pts) {
  for (const [x, y, col] of pts) if (!c.alphaAt(x, y)) c.set(x, y, col ?? RIPPLE);
}

/** A small, distant fin (the crowd): moving right; mirrored to go left. */
function finFar(frame) {
  const c = new PixelCanvas(12, 8);
  c.poly([[8, 4], [4, 1], [3, 5]], SHARK.d);
  c.set(5, 2, SHARK.l);
  c.set(6, 3, SHARK.l);
  c.outline(INK);
  const k = frame ? 1 : 0;
  ripples(c, [[9, 5, FOAM], [10, 5 - k], [2, 6], [1, 6 + k > 7 ? 7 : 6 + k], [0, 7 - k]]);
  ripples(c, [[4, 7], [7, 6 + k]]);
  return c;
}

/** A hammerhead rearing at the hull (facing right; flipped for port). */
function hammerhead(frame) {
  const c = new PixelCanvas(30, 22);
  c.ellipse(9, 13, 9, 5, SHARK.m);
  c.ellipse(8, 11, 6, 2.5, SHARK.l);
  c.poly([[2, 13], [0, 8], [4, 12]], SHARK.d);
  c.poly([[10, 8], [7, 1], [13, 8]], SHARK.d);
  const lunge = frame === 2 ? 3 : frame === 1 ? 1 : 0;
  // the hammer: a wide flat head, an eye at each end
  const hx = 18 + lunge;
  c.rect(hx, 8, 4, 10, SHARK.m);
  c.rect(hx + 1, 9, 2, 8, SHARK.l);
  c.poly([[hx - 2, 12], [hx, 10], [hx, 15]], SHARK.m);
  c.set(hx + 3, 8, INK);
  c.set(hx + 3, 17, INK);
  if (frame === 2) {
    // the impact: splinters of foam
    ripples(c, [[hx + 5, 7, FOAM], [hx + 6, 10, FOAM], [hx + 6, 14], [hx + 5, 18, FOAM], [hx + 7, 12, FOAM]]);
  }
  c.outline(INK);
  ripples(c, [[1, 17], [4, 19, FOAM], [9, 19], [14, 19, FOAM], [20, 19], [3, 16]]);
  return c;
}

/** Shark Duty's marker over a rail section: a red "!" bubble that blinks. */
function dutyMark(frame) {
  const c = new PixelCanvas(12, 14);
  const red = frame ? '#f06048' : '#c83a2a';
  c.ellipse(6, 5, 5, 5, red);
  c.poly([[4, 9], [8, 9], [6, 13]], red);
  c.rect(5, 2, 2, 5, '#fff4e0');
  c.rect(5, 8, 2, 1, '#fff4e0');
  c.outline(INK);
  return c;
}

/** Shark Duty's marker over a bite to patch: a hammer on a gold bubble. */
function dutyPatch(frame) {
  const c = new PixelCanvas(12, 14);
  const gold = frame ? '#f0c848' : '#c89a28';
  c.ellipse(6, 5, 5, 5, gold);
  c.poly([[4, 9], [8, 9], [6, 13]], gold);
  c.line(3, 8, 7, 4, '#6a4a2a');
  c.rect(6, 2, 4, 3, '#5a5a6a');
  c.outline(INK);
  return c;
}

/** An arrow pinned to the screen edge, pointing at a shark off-camera (points right). */
function dutyArrow() {
  const c = new PixelCanvas(14, 12);
  c.poly([[1, 3], [7, 3], [7, 0], [13, 6], [7, 12], [7, 9], [1, 9]], '#e04830');
  c.hline(2, 7, 4, '#f89070');
  c.outline(INK);
  return c;
}

/** A pewter mug of Frog Grog (for throwing overboard, or dropping forecasts into). */
function grogMug(withPaper = false) {
  const c = new PixelCanvas(10, 11);
  c.rect(1, 2, 6, 8, '#8a8a9a');
  c.vline(1, 2, 9, '#b8b8c8');
  c.hline(1, 6, 2, '#8ab030');
  c.set(3, 2, '#c8e060');
  c.rect(7, 4, 2, 1, '#6a6a7a');
  c.rect(8, 4, 1, 4, '#6a6a7a');
  c.rect(7, 7, 2, 1, '#6a6a7a');
  if (withPaper) {
    c.ellipse(4, 1, 3, 2, '#f0e6c8');
    c.set(3, 0, '#e8c020');
    c.set(5, 1, '#3a6ad0');
  }
  c.outline(INK);
  return c;
}

/** Garrick's crumpled forecast, a ball of crayoned paper. */
function paperBall() {
  const c = new PixelCanvas(8, 8);
  c.ellipse(4, 4, 3.5, 3.2, '#f0e6c8');
  c.set(2, 3, '#e8c020');
  c.set(3, 3, '#e8c020');
  c.set(5, 5, '#3a6ad0');
  c.set(4, 2, '#d8ccb0');
  c.set(5, 3, '#d8ccb0');
  c.outline(INK);
  return c;
}

/** A slice of garlic toast, dripping. */
function garlicToast() {
  const c = new PixelCanvas(10, 8);
  c.poly([[1, 3], [8, 1], [9, 5], [2, 7]], '#d8a050');
  c.poly([[2, 3], [7, 2], [8, 4], [3, 5]], '#f0d070');
  c.set(4, 3, '#fff8e0');
  c.set(6, 3, '#fff8e0');
  c.set(5, 4, '#6a9a2c');
  c.outline(INK);
  return c;
}

/** A pillow that has turned yellow. */
function pillowYellow() {
  const c = new PixelCanvas(14, 9);
  c.ellipse(7, 4, 6.5, 3.5, '#e8d060');
  c.ellipse(5, 3, 3, 1.5, '#f8ec98');
  c.ellipse(9, 5, 2.5, 1.5, '#c8a830');
  c.set(1, 1, '#e8d060');
  c.set(12, 7, '#e8d060');
  c.outline(INK);
  return c;
}

/** The Grand Stenchmaster's clipboard: a galley tray with a sheet pinned to it. */
function trayClipboard() {
  const c = new PixelCanvas(12, 10);
  c.rect(0, 1, 12, 9, '#8a8a9a');
  c.rect(1, 2, 10, 7, '#b8b8c8');
  c.rect(2, 1, 8, 8, '#f0e6c8');
  c.hline(3, 8, 3, '#6a5a48');
  c.hline(3, 7, 5, '#6a5a48');
  c.set(4, 7, '#e8c020');
  c.set(5, 7, '#e8c020');
  c.rect(5, 0, 2, 2, '#6a6a7a');
  c.outline(INK);
  return c;
}

export function addPhase4StageFrames(atlas) {
  for (const f of [0, 1]) {
    atlas.add(`fin_far_${f}`, finFar(f));
    atlas.add(`duty_mark_${f}`, dutyMark(f));
    atlas.add(`duty_patch_${f}`, dutyPatch(f));
  }
  for (const f of [0, 1, 2]) atlas.add(`hammerhead_${f}`, hammerhead(f));
  atlas.add('duty_arrow', dutyArrow());
  atlas.add('grog_mug', grogMug());
  atlas.add('grog_mug_paper', grogMug(true));
  atlas.add('paper_ball', paperBall());
  atlas.add('garlic_toast', garlicToast());
  atlas.add('pillow_yellow', pillowYellow());
  atlas.add('tray_clipboard', trayClipboard());
}

export const PHASE4_STAGE_FRAMES = [
  'fin_far_0', 'fin_far_1', 'duty_mark_0', 'duty_mark_1', 'duty_patch_0', 'duty_patch_1',
  'hammerhead_0', 'hammerhead_1', 'hammerhead_2', 'duty_arrow',
  'grog_mug', 'grog_mug_paper', 'paper_ball', 'garlic_toast', 'pillow_yellow', 'tray_clipboard',
];
