import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';

/**
 * Stage sprites for Story Phase 7 (the Great Sharkstorm returns; the Song of
 * the Grand Stenchmaster): more kinds of shark in the air (a hammerhead, a
 * small one stained yellow by the cloud, and the one with the piece of the
 * Grand Stenchmaster's cape in its teeth), the piece of cape itself, a
 * lantern falling off its hook, a horseshoe and a spoon (salvage), and the
 * half-built S.E.S. Mark II being carried below.
 */
const INK = PAL.ink;
const SHARK = { d: '#3a4658', m: '#5a6a80', l: '#8a9ab0', belly: '#d8dce4' };
const STAINED = { d: '#4a4a30', m: '#7a7a48', l: '#a8a060', belly: '#e0dca0' };
const CAPE = { d: '#4a1420', m: '#74283a', l: '#9a3a4a', paint: '#c8982a' };

function sharkBody(c, k, col, { mouthOpen = true } = {}) {
  c.ellipse(13, 8, 10, 4, col.m);
  c.ellipse(12, 9, 8, 2, col.belly);
  c.poly([[12, 4], [16, 0], [17, 5]], col.d);
  c.poly([[22, 8], [29, 3 + k], [26, 8], [29, 13 + k]], col.d);
  c.poly([[9, 11], [6, 15], [13, 11]], col.d);
  if (mouthOpen) {
    c.poly([[3, 8], [7, 6], [7, 10]], '#5a1a20');
    for (const tx of [4, 6]) c.set(tx, 7, '#f4f0e8');
  }
  c.set(7, 6, '#ffffff');
  c.set(8, 6, '#0a0a10');
}

/** A hammerhead, tumbling, looking (with both eyes, far apart) extremely put out. */
function flyingHammer(frame) {
  const c = new PixelCanvas(30, 18);
  const k = frame ? 1 : -1;
  c.ellipse(14, 9, 10, 4, SHARK.m);
  c.ellipse(13, 10, 8, 2, SHARK.belly);
  c.poly([[13, 5], [17, 1], [18, 6]], SHARK.d);
  c.poly([[23, 9], [29, 4 + k], [27, 9], [29, 14 + k]], SHARK.d);
  // the hammer: a crossbar of head, an eye at each end
  c.rect(1, 3, 4, 12, SHARK.m);
  c.vline(1, 3, 14, SHARK.d);
  c.set(2, 3, '#ffffff');
  c.set(2, 14, '#ffffff');
  c.set(3, 3, '#0a0a10');
  c.set(3, 14, '#0a0a10');
  c.hline(4, 6, 9, '#5a1a20');
  c.outline(INK);
  for (const [x, y] of [[29, 9], [28, 11]]) if (!c.alphaAt(x, y)) c.set(x, y, '#bfe6f2');
  return c;
}

/** A small shark, stained mustard by the cloud it was flung through. */
function flyingSmall(frame) {
  const big = new PixelCanvas(30, 16);
  sharkBody(big, frame ? 1 : -1, STAINED);
  big.outline(INK);
  // scaled down to two thirds by sampling (it's a small one)
  const c = new PixelCanvas(20, 11);
  for (let y = 0; y < 11; y++) for (let x = 0; x < 20; x++) c.set(x, y, big.get(Math.floor(x * 1.5), Math.floor(y * 1.5)));
  return c;
}

/** THE shark: a great piece of burgundy painted cape in its teeth, flapping. */
function flyingCape(frame) {
  const c = new PixelCanvas(36, 20);
  const k = frame ? 1 : -1;
  const s = new PixelCanvas(30, 16);
  sharkBody(s, k, SHARK, { mouthOpen: false });
  s.outline(INK);
  c.blit(s, 6, 2);
  // the cape piece trailing from the jaws, flapping
  const flap = frame ? 2 : 0;
  c.poly([[9, 10], [0, 6 + flap], [2, 14 + flap], [8, 18 - flap], [11, 12]], CAPE.m);
  c.line(9, 10, 0, 6 + flap, CAPE.l);
  c.line(2, 14 + flap, 8, 18 - flap, CAPE.d);
  // a bit of the painted 'historic releases' and the frayed edge
  c.set(4, 11 + flap, CAPE.paint);
  c.set(5, 12 + flap, CAPE.paint);
  for (const [x, y] of [[1, 8 + flap], [3, 15 + flap], [6, 17 - flap]]) c.set(x, y, '#e8d8b0');
  // a smug eye
  c.set(13, 8, '#ffffff');
  c.set(14, 8, '#0a0a10');
  c.hline(12, 14, 7, SHARK.d);
  return c;
}

/** The piece of cape on its own (left on deck for a moment, or held up in horror). */
function capePiece() {
  const c = new PixelCanvas(14, 12);
  c.poly([[1, 1], [12, 0], [13, 6], [9, 11], [4, 9], [0, 10]], CAPE.m);
  c.line(1, 1, 12, 0, CAPE.l);
  c.set(5, 4, CAPE.paint);
  c.set(6, 5, CAPE.paint);
  c.set(7, 4, CAPE.paint);
  for (const [x, y] of [[0, 10], [4, 9], [9, 11], [13, 6]]) c.set(x, y, '#e8d8b0');
  c.outline(INK);
  return c;
}

/** A lantern coming off its hook (its wire 'wasn't doing anything'). */
function lanternFall(frame) {
  const c = new PixelCanvas(10, 14);
  const tilt = frame ? 1 : 0;
  c.rect(2 + tilt, 3, 6, 8, '#c8a040');
  c.rect(3 + tilt, 4, 4, 6, frame ? '#ffe08a' : '#fff4c0');
  c.hline(1 + tilt, 8 + tilt, 2, '#4a3a20');
  c.hline(1 + tilt, 8 + tilt, 11, '#4a3a20');
  c.ellipse(5 + tilt, 1, 2, 1, '#4a3a20');
  c.outline(INK);
  return c;
}

/** Salvage: a horseshoe (reception) and a spoon (fine tuning). */
function horseshoe() {
  const c = new PixelCanvas(10, 10);
  c.ellipse(5, 5, 4, 4, '#8a8a9a');
  c.ellipse(5, 5, 2, 2, '#00000000');
  c.rect(3, 6, 4, 4, '#00000000');
  c.rect(1, 6, 2, 3, '#8a8a9a');
  c.rect(7, 6, 2, 3, '#8a8a9a');
  c.set(2, 3, '#c8c8d8');
  c.outline(INK);
  return c;
}

function spoon() {
  const c = new PixelCanvas(6, 12);
  c.ellipse(3, 2, 2, 2, '#c8c8d8');
  c.vline(3, 4, 11, '#a8a8b8');
  c.set(2, 1, '#ffffff');
  c.outline(INK);
  return c;
}

/** The half-built S.E.S. Mark II being carried: a fruit crate, a tube, a horseshoe, wire everywhere. */
function mk2Carried() {
  const c = new PixelCanvas(20, 18);
  c.rect(1, 5, 18, 12, '#c8a468');
  for (const y of [8, 11, 14]) c.hline(1, 18, y, '#8a6438');
  c.vline(1, 5, 16, '#8a6438');
  c.vline(18, 5, 16, '#8a6438');
  c.rect(5, 7, 9, 7, '#1a2826');
  c.set(6, 8, '#ffffff40');
  // the horseshoe on top, a tube, a dangling wire and a fork
  c.ellipse(10, 3, 3, 3, '#8a8a9a');
  c.ellipse(10, 3, 1.5, 1.5, '#00000000');
  c.rect(8, 4, 5, 2, '#00000000');
  c.rect(15, 1, 2, 4, '#c8e8e8a0');
  c.line(2, 16, 0, 17, '#c87a3a');
  c.line(4, 4, 2, 0, '#a8a8b8');
  c.outline(INK);
  return c;
}

export function addPhase7StageFrames(atlas) {
  for (const f of [0, 1]) {
    atlas.add(`flying_hammer_${f}`, flyingHammer(f));
    atlas.add(`flying_small_${f}`, flyingSmall(f));
    atlas.add(`flying_cape_${f}`, flyingCape(f));
    atlas.add(`lantern_fall_${f}`, lanternFall(f));
  }
  atlas.add('cape_piece', capePiece());
  atlas.add('horseshoe', horseshoe());
  atlas.add('spoon', spoon());
  atlas.add('mk2_carried', mk2Carried());
}

export const PHASE7_STAGE_FRAMES = [
  ...['flying_hammer', 'flying_small', 'flying_cape', 'lantern_fall'].flatMap((n) => [`${n}_0`, `${n}_1`]),
  'cape_piece', 'horseshoe', 'spoon', 'mk2_carried',
];
