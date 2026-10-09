import { PixelCanvas } from '../PixelCanvas.js';
import { PAL, rgba } from '../palette.js';
import { FRAME_W, FRAME_H } from './characterPainter.js';

/**
 * Story Phase 14: Brogath the Bashful, returned. Not a resurrected pirate: an
 * Ancient Grand Stenchmaster's essence inside a cheap cardboard promotional
 * cut-out (the Fan Mega-Pack's), held together by a little yellow-green
 * fume. Painted for the same 32x48 field frames and 48x48 portraits as
 * everyone else:
 *
 *   front ("down")   the print: purple robe, gold sash he's half hidden
 *                    behind, a crown, a face that is ink on card (the eyes and
 *                    mouth move anyway), a white cut edge and an ink line;
 *   sides            edge-on: a three-pixel strip of corrugated card with a
 *                    sliver of crown on top and the fold-out stand behind.
 *                    He is very nearly not there;
 *   back ("up")      plain brown card, corrugation, a Cheap-O-Rama sticker,
 *                    the stand.
 *
 * His limbs are flaps cut out of the print: they swing stiffly from a hinge.
 * He walks by rocking from one printed boot to the other.
 *
 * Appearance data: { "id": "brogath", "painter": "cardboard",
 *   "blush": 0..3, "bow": 0..2 (pressure bowing him out), "angry": bool,
 *   "loaded": bool (a stomach where cardboard has no business having one),
 *   "ornament": bool, "worn": 0..2 (dents, a taped corner) }
 */
const INK = PAL.ink;
const GROUND = 45;
const CX = 16;

const CARD = { d: '#8a6a40', m: '#b8925e', l: '#d0aa74', h: '#e8c898', edge: '#f0e8d8', flute: '#a07a4a' };
const ROBE = { d: '#4a2a6a', m: '#6a4a8a', l: '#8a6aaa', h: '#a88ac8' };
const SASH = { d: '#9a6e14', m: '#c8982a', l: '#ecc450', dot: '#f4dc6c' };
const SKIN = { d: '#c08060', m: '#e8b48a', l: '#f4cca8' };
const GOLD = { d: '#a8801c', m: '#e8c850', l: '#fff0a0' };
const BOOT = { d: '#1e140c', m: '#3a2a1a', l: '#5a4028' };
const HAIR = { d: '#6a6070', m: '#9a90a0', l: '#c8c0cc' };

export function cardboardLook(app) {
  return {
    blush: Math.max(0, Math.min(3, app.blush ?? 1)),
    bow: Math.max(0, Math.min(2, app.bow ?? 0)),
    angry: !!app.angry,
    loaded: !!app.loaded,
    ornament: !!app.ornament,
    worn: Math.max(0, Math.min(2, app.worn ?? 0)),
    fume: app.angry ? ['#f0a040a0', '#e8602880', '#ffd06060'] : ['#c8d878a0', '#a8c85880', '#e0e8a060'],
  };
}

const BLUSH = [null, '#f0a0a8', '#e86070', '#d02838'];

// ---------------------------------------------------------------------------
// The print (front)

/**
 * pose: { arms: [left, right] each 'down'|'out'|'up'|'mouth'|'limp'|'torn',
 *         fold: 0 (standing) | 1 (a bow) | 2 (bent double) | 3 (sitting),
 *         step: -1|0|1 (which boot is lifted), eyes: 'look'|'fixed'|'aside'|'shut'|'wide', mouth: 'smile'|'o'|'wobble'|'flat'|'chew'|'grim',
 *         lift: px (a stiff little hop), fume: frame index }
 */
function paintFront(L, pose) {
  const c = new PixelCanvas(FRAME_W, FRAME_H);
  const fig = new PixelCanvas(FRAME_W, FRAME_H);
  const lift = pose.lift ?? 0;
  const fold = pose.fold ?? 0;
  // How far the top half comes down (a bow, bent double, sitting).
  const drop = [0, 5, 13, 7][fold];
  const squash = [0, 3, 8, 0][fold]; // the folded-over torso, foreshortened
  const legTop = fold === 3 ? 40 : 36;
  // Legs (printed), the lifted boot a pixel up.
  const legs = [[12, pose.step === -1 ? 1 : 0], [17, pose.step === 1 ? 1 : 0]];
  for (const [lx, up] of legs) {
    const top = legTop - lift;
    const bot = GROUND - 1 - up - lift;
    if (fold === 3) {
      // sitting: shins forward, feet toward us
      fig.rect(lx, top, 3, 3, ROBE.d);
      fig.rect(lx, top + 3, 3, 2, BOOT.m);
      continue;
    }
    fig.rect(lx, top, 3, bot - top - 1, BOOT.l);
    fig.vline(lx + 2, top, bot - 2, BOOT.m);
    fig.rect(lx - (lx < CX ? 1 : 0), bot - 1, 4, 2, BOOT.m);
    fig.hline(lx - (lx < CX ? 1 : 0), lx + 2 + (lx < CX ? 0 : 1), bot, BOOT.d);
  }
  // Robe (a trapezoid), bowed out by pressure (or loaded).
  const top = 19 + drop - lift;
  const hem = (fold === 3 ? 40 : 36) - lift;
  const body = fold === 2 ? Math.max(4, 17 - squash) : hem - top;
  for (let j = 0; j < body; j++) {
    const y = top + j;
    const k = j / Math.max(1, body - 1);
    let half = Math.round(5 + k * 1.6);
    const mid = Math.abs(k - 0.5) < 0.3;
    if (L.bow && mid) half += L.bow;
    if (L.loaded && k > 0.45 && k < 0.9) half += 2;
    for (let x = CX - half; x <= CX + half - 1; x++) {
      let col = ROBE.m;
      if (x === CX - half) col = ROBE.l;
      if (x >= CX + half - 2) col = ROBE.d;
      if ((L.bow || L.loaded) && mid && x > CX - 2 && x < CX + 1) col = ROBE.h; // the bulge catching the light
      fig.set(x, y, col);
    }
  }
  if (L.bow === 2) {
    // tension creases across the bulge
    fig.line(CX - 5, top + Math.round(body * 0.35), CX - 2, top + Math.round(body * 0.45), ROBE.d);
    fig.line(CX + 4, top + Math.round(body * 0.6), CX + 1, top + Math.round(body * 0.5), ROBE.d);
  }
  // The sash he's half hidden behind: right shoulder to left hip, and a fold hanging at his left.
  if (fold < 2) {
    for (let i = 0; i < 12; i++) {
      const sx = CX + 4 - i;
      const sy = top + 1 + i;
      fig.set(sx, sy, i % 3 === 0 ? SASH.dot : SASH.m);
      fig.set(sx, sy + 1, SASH.d);
    }
    fig.rect(CX - 7, top + 3, 2, 9, SASH.l);
    fig.vline(CX - 7, top + 3, top + 11, SASH.m);
  }
  // Arms: flaps, hinged at the shoulder.
  const shoulderY = top + 1;
  const arm = (side, kind) => {
    const sx = side < 0 ? CX - 7 : CX + 6;
    const hand = (x, y) => fig.rect(x, y, 2, 2, SKIN.m);
    if (kind === 'up') {
      fig.rect(sx + (side < 0 ? -1 : 0), shoulderY - 9, 2, 10, ROBE.m);
      hand(sx + (side < 0 ? -1 : 0), shoulderY - 11);
    } else if (kind === 'out') {
      fig.rect(side < 0 ? sx - 7 : sx, shoulderY + 1, 8, 2, ROBE.l);
      hand(side < 0 ? sx - 9 : sx + 8, shoulderY + 1);
    } else if (kind === 'mouth') {
      fig.line(sx, shoulderY + 2, CX + side * 2, 16 + drop - lift, ROBE.l);
      hand(CX + side * 2 - (side < 0 ? 1 : 0), 15 + drop - lift);
    } else if (kind === 'limp' || fold === 2) {
      fig.rect(sx, shoulderY + 1, 2, fold === 2 ? 14 : 11, ROBE.d);
      hand(sx, shoulderY + (fold === 2 ? 15 : 12));
    } else {
      fig.rect(sx, shoulderY + 1, 2, 10, ROBE.m);
      fig.vline(sx + (side < 0 ? 0 : 1), shoulderY + 1, shoulderY + 10, side < 0 ? ROBE.l : ROBE.d);
      hand(sx, shoulderY + 11);
    }
  };
  const [la, ra] = pose.arms ?? ['down', 'down'];
  arm(-1, la);
  arm(1, ra);
  if (la === 'torn' || ra === 'torn') {
    // Where the printed arm was: a ghost of it, plain card, with a ragged edge.
    const sx = la === 'torn' ? CX - 7 : CX + 6;
    fig.rect(sx, shoulderY + 1, 2, 10, CARD.l);
    fig.vline(sx + 1, shoulderY + 2, shoulderY + 9, CARD.flute);
  }
  // Head.
  const hy = 12 + drop - lift + (fold === 2 ? 2 : 0);
  fig.ellipse(CX, hy, 5, 6, SKIN.m);
  fig.ellipse(CX - 1, hy - 1, 3, 4, SKIN.l);
  fig.vline(CX + 4, hy - 2, hy + 3, SKIN.d);
  // hair at the sides, a short printed beard
  fig.rect(CX - 6, hy - 3, 1, 5, HAIR.m);
  fig.rect(CX + 5, hy - 3, 1, 5, HAIR.d);
  fig.rect(CX - 3, hy + 4, 6, 2, HAIR.m);
  fig.hline(CX - 2, CX + 1, hy + 6, HAIR.l);
  // Crown: three points.
  const cy = hy - 7;
  fig.rect(CX - 4, cy + 2, 8, 2, GOLD.m);
  for (const px of [CX - 4, CX - 1, CX + 2]) fig.rect(px, cy, 2, 2, GOLD.m);
  fig.hline(CX - 4, CX + 3, cy + 3, GOLD.d);
  fig.set(CX - 1, cy + 2, '#c83a4a'); // a glass ruby
  if (L.ornament) {
    // the HOLIDAY BRANCH ornament, hung from a point of somebody else's crown? No: his own. (Garrick wears it.)
  }
  // Face: ink on card. The eyes move anyway.
  const eyes = pose.eyes ?? 'look';
  const ex = pose.pupil ?? 0;
  for (const x of [CX - 2, CX + 2]) {
    if (eyes === 'shut') fig.hline(x - 1, x, hy, INK);
    else {
      fig.rect(x - 1, hy - 1, 2, eyes === 'wide' ? 3 : 2, '#fbf6ec');
      if (L.angry) fig.hline(x - 1, x, hy - 1, INK);
      fig.set(x - (eyes === 'aside' ? 1 : 0) + (ex > 0 ? 0 : ex < 0 ? -1 : 0), hy, INK);
    }
  }
  // brows
  if (L.angry) {
    fig.line(CX - 4, hy - 3, CX - 1, hy - 2, INK);
    fig.line(CX + 3, hy - 3, CX + 1, hy - 2, INK);
  } else {
    fig.line(CX - 3, hy - 3, CX - 1, hy - 4, HAIR.d); // worried, always a little
    fig.line(CX + 2, hy - 4, CX + 3, hy - 3, HAIR.d);
  }
  const mouth = pose.mouth ?? 'smile';
  const my = hy + 3;
  if (mouth === 'o') fig.rect(CX - 1, my - 1, 2, 2, '#6a2a2a');
  else if (mouth === 'wobble') {
    fig.set(CX - 2, my, '#8a3a3a'); fig.set(CX - 1, my - 1, '#8a3a3a'); fig.set(CX, my, '#8a3a3a'); fig.set(CX + 1, my - 1, '#8a3a3a');
  } else if (mouth === 'flat') fig.hline(CX - 1, CX + 1, my, '#8a3a3a');
  else if (mouth === 'chew') fig.rect(CX - 1, my - 1, 3, 2, '#6a2a2a');
  else if (mouth === 'grim') {
    fig.hline(CX - 2, CX + 2, my, '#6a2a2a');
    fig.hline(CX - 1, CX + 1, my - 1, '#fbf6ec');
  } else {
    fig.set(CX - 2, my - 1, '#8a3a3a');
    fig.hline(CX - 1, CX + 1, my, '#8a3a3a');
    fig.set(CX + 2, my - 1, '#8a3a3a');
  }
  // Blush (printed cheeks, redder by the state).
  const b = BLUSH[L.blush];
  if (b) {
    const w = L.blush >= 2 ? 2 : 1;
    fig.rect(CX - 4, hy + 1, w + 1, L.blush >= 3 ? 2 : 1, b);
    fig.rect(CX + 3 - (w - 1), hy + 1, w + 1, L.blush >= 3 ? 2 : 1, b);
  }
  // Wear: a dent, a taped corner.
  if (L.worn >= 1) fig.set(CX + 5, top + 6, ROBE.d);
  if (L.worn >= 2) fig.rect(CX - 7, hem - 3, 3, 2, '#e8e0b0');
  // Cut out: the white card edge, then the ink line.
  for (let y = 0; y < FRAME_H; y++) for (let x = 0; x < FRAME_W; x++) if (fig.alphaAt(x, y)) c.set(x, y, fig.get(x, y));
  c.outline(CARD.edge);
  c.outline(INK);
  fumes(c, L, pose.fume ?? 0, hy, hem);
  return c;
}

/** The little yellow-green fume holding him together: a few wisps at the edges, moving between frames. */
function fumes(c, L, f, hy, hem) {
  const spots = [[[CX - 9, hy + 6], [CX + 8, hy + 10], [CX - 7, hem - 2]], [[CX + 9, hy + 5], [CX - 8, hy + 12], [CX + 7, hem - 4]]][f % 2];
  spots.forEach(([x, y], i) => {
    if (!c.alphaAt(x, y)) c.set(x, y, L.fume[i % L.fume.length]);
    if (!c.alphaAt(x, y - 1)) c.set(x, y - 1, L.fume[(i + 1) % L.fume.length]);
  });
}

// ---------------------------------------------------------------------------
// Edge-on (left / right) and the back

function paintSide(L, pose) {
  const c = new PixelCanvas(FRAME_W, FRAME_H);
  const lift = pose.lift ?? 0;
  const lean = pose.lean ?? 0;
  const fold = pose.fold ?? 0;
  // The stand, behind (to the right when he faces left).
  c.line(CX + 1, 30 - lift, CX + 5, GROUND - 1, CARD.flute);
  c.line(CX + 2, 30 - lift, CX + 6, GROUND - 1, CARD.l);
  // The strip of card: three pixels of edge, top to toe.
  const top = 4 + (fold ? [0, 5, 13, 7][fold] : 0) - lift;
  for (let y = top; y < GROUND - lift; y++) {
    const dx = Math.round((lean * (GROUND - y)) / 40);
    c.set(CX - 1 + dx, y, CARD.edge);
    c.set(CX + dx, y, y % 2 ? CARD.flute : CARD.l);
    c.set(CX + 1 + dx, y, CARD.m);
  }
  // A sliver of crown, a sliver of boot.
  c.hline(CX - 1, CX + 1, top, GOLD.m);
  c.set(CX, top - 1, GOLD.l);
  c.hline(CX - 2, CX + 1, GROUND - 1 - lift, BOOT.m);
  // Arm flaps sticking out, edge-on too.
  if ((pose.arms ?? [])[0] === 'out' || (pose.arms ?? [])[1] === 'out') c.hline(CX - 6, CX - 2, 21 - lift, CARD.m);
  if ((pose.arms ?? [])[0] === 'up' || (pose.arms ?? [])[1] === 'up') c.vline(CX - 1, top - 6, top - 1, CARD.m);
  c.outline(INK);
  const f = pose.fume ?? 0;
  const wisps = f % 2 ? [[CX - 3, 12], [CX + 3, 24], [CX - 2, 36]] : [[CX + 3, 10], [CX - 3, 22], [CX + 2, 38]];
  wisps.forEach(([x, y], i) => { if (!c.alphaAt(x, y - lift)) c.set(x, y - lift, L.fume[i % L.fume.length]); });
  return c;
}

function paintBack(L, pose) {
  // The same silhouette as the print, in plain brown card.
  const front = paintFront({ ...L, blush: 0, angry: false }, { ...pose, eyes: 'look', mouth: 'smile' });
  const c = new PixelCanvas(FRAME_W, FRAME_H);
  const inkV = rgba(INK);
  const edgeV = rgba(CARD.edge);
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const col = front.get(x, y);
      if (!front.alphaAt(x, y)) continue;
      if (col === inkV || col === edgeV) c.set(x, y, col);
      else if (front.alphaAt(x, y) < 255) continue; // no fume on the back pass
      else c.set(x, y, y % 4 === 0 ? CARD.flute : x % 7 === 0 ? CARD.l : CARD.m);
    }
  }
  const lift = pose.lift ?? 0;
  // A Cheap-O-Rama sticker, and the fold-out stand.
  c.rect(CX - 3, 26 - lift, 6, 3, '#c8242c');
  c.hline(CX - 2, CX + 1, 27 - lift, '#f4dc6c');
  c.line(CX - 1, 24 - lift, CX - 3, GROUND - 1, CARD.l);
  c.line(CX, 24 - lift, CX - 2, GROUND - 1, CARD.d);
  fumes(c, L, pose.fume ?? 0, 12 - lift, 36 - lift);
  return c;
}

function frame(L, dir, pose) {
  if (pose.sideways && dir === 'down') return paintSide(L, pose);
  if (dir === 'down') return paintFront(L, pose);
  if (dir === 'up') return paintBack(L, pose);
  return paintSide(L, pose);
}

function mirror(pc) {
  const m = new PixelCanvas(pc.width, pc.height);
  m.blit(pc, 0, 0, { flipX: true });
  return m;
}

/** Every animation the cut-out can do (the field's usual ones, then his own). */
const CARDBOARD_POSES = {
  idle: [{ fume: 0 }, { fume: 1, pupil: 1 }],
  walk: [{ step: -1, lift: 1, fume: 0, lean: -1 }, { step: 0, fume: 1 }, { step: 1, lift: 1, fume: 0, lean: 1 }, { step: 0, fume: 1, pupil: -1 }],
  work: [{ arms: ['down', 'out'], fume: 0 }, { arms: ['down', 'down'], fume: 1 }],
  sit: [{ fold: 3, fume: 0 }],
  doze: [{ fold: 3, eyes: 'shut', fume: 0 }],
  sleep: [{ eyes: 'shut', fume: 0 }],
  point: [{ arms: ['down', 'out'], fume: 0 }],
  surprised: [{ arms: ['up', 'up'], mouth: 'o', eyes: 'wide', fume: 1 }],
  // His own.
  stiff: [{ fume: 9, eyes: 'fixed' }],
  tear: [{ arms: ['torn', 'down'], fume: 0, eyes: 'wide' }, { arms: ['up', 'down'], fume: 1, eyes: 'wide', mouth: 'o' }],
  flail: [{ arms: ['up', 'out'], mouth: 'o', eyes: 'wide', fume: 0, lift: 1 }, { arms: ['out', 'up'], mouth: 'o', eyes: 'wide', fume: 1 }],
  bow: [{ fold: 1, fume: 0, eyes: 'shut' }],
  bend: [{ fold: 2, fume: 0, arms: ['limp', 'limp'] }, { fold: 2, fume: 1, arms: ['limp', 'out'] }],
  slump: [{ fold: 1, arms: ['limp', 'limp'], mouth: 'wobble', eyes: 'aside', fume: 0 }],
  watch: [{ fold: 3, eyes: 'fixed', mouth: 'flat', fume: 0 }, { fold: 3, eyes: 'fixed', mouth: 'flat', fume: 1 }],
  eat: [{ arms: ['down', 'mouth'], mouth: 'chew', fume: 0 }, { arms: ['down', 'down'], mouth: 'smile', fume: 1 }],
  sideways: [{ sideways: true, fume: 0 }, { sideways: true, fume: 1 }],
  proud: [{ arms: ['out', 'out'], fume: 0 }, { arms: ['out', 'out'], fume: 1, pupil: 1 }],
  nervous: [{ arms: ['mouth', 'down'], mouth: 'wobble', fume: 0 }, { arms: ['mouth', 'down'], mouth: 'wobble', fume: 1, pupil: -1 }],
};
export const CARDBOARD_RATES = { idle: 1.6, walk: 6, work: 3, stiff: 0, tear: 2.5, flail: 7, bow: 0, bend: 3, slump: 0, watch: 0.8, eat: 3, sideways: 3, proud: 1.4, nervous: 5 };

export function paintCardboardSheet(appearance) {
  const L = cardboardLook(appearance);
  const frames = {};
  const anims = {};
  for (const [anim, poses] of Object.entries(CARDBOARD_POSES)) {
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
// Portraits (48x48): the printed bust, with its cut edge

export const CARDBOARD_EXPRESSIONS = ['neutral', 'bashful', 'embarrassed', 'mortified', 'pleased', 'proud', 'confused', 'sorry', 'furious', 'alarmed', 'delighted', 'devastated', 'thoughtful', 'loaded'];

const EXPR = {
  neutral: { blush: 1, mouth: 'smile', eyes: 'look', brows: 'worried' },
  bashful: { blush: 2, mouth: 'smile', eyes: 'aside', brows: 'worried' },
  embarrassed: { blush: 2, mouth: 'wobble', eyes: 'aside', brows: 'worried', sweat: true },
  mortified: { blush: 3, mouth: 'wobble', eyes: 'wide', brows: 'worried', sweat: true, bow: true },
  pleased: { blush: 1, mouth: 'grin', eyes: 'happy', brows: 'up' },
  proud: { blush: 0, mouth: 'grin', eyes: 'look', brows: 'up', chin: true },
  confused: { blush: 1, mouth: 'flat', eyes: 'aside', brows: 'tilt' },
  sorry: { blush: 2, mouth: 'frown', eyes: 'down', brows: 'worried' },
  furious: { blush: 3, mouth: 'grim', eyes: 'narrow', brows: 'angry', angry: true },
  alarmed: { blush: 1, mouth: 'o', eyes: 'wide', brows: 'up' },
  delighted: { blush: 1, mouth: 'open', eyes: 'happy', brows: 'up' },
  devastated: { blush: 3, mouth: 'wobble', eyes: 'down', brows: 'worried', tears: true },
  thoughtful: { blush: 0, mouth: 'flat', eyes: 'up', brows: 'flat' },
  loaded: { blush: 2, mouth: 'flat', eyes: 'look', brows: 'worried', sweat: true, bow: true },
};

export function paintCardboardPortrait(portrait, expression = 'neutral') {
  const e = EXPR[expression] ?? EXPR.neutral;
  const angry = e.angry || portrait.angry;
  const c = new PixelCanvas(48, 48);
  const fig = new PixelCanvas(48, 48);
  // shoulders: the robe, the sash across, a bowed middle when he's straining
  fig.ellipse(24, 50, 19, 13, ROBE.m);
  fig.ellipse(18, 47, 9, 7, ROBE.l);
  if (e.bow) fig.ellipse(24, 47, 8, 4, ROBE.h);
  for (let i = 0; i < 22; i++) {
    fig.set(34 - i, 38 + Math.round(i * 0.5), i % 3 === 0 ? SASH.dot : SASH.m);
    fig.set(34 - i, 39 + Math.round(i * 0.5), SASH.d);
  }
  // head
  const hx = 24;
  const hy = 22 + (e.chin ? -1 : 0);
  fig.ellipse(hx, hy, 10, 12, SKIN.m);
  fig.ellipse(hx - 2, hy - 2, 6, 7, SKIN.l);
  fig.vline(hx + 9, hy - 4, hy + 5, SKIN.d);
  // hair and a short printed beard
  fig.rect(hx - 11, hy - 6, 2, 9, HAIR.m);
  fig.rect(hx + 10, hy - 6, 2, 9, HAIR.d);
  fig.ellipse(hx, hy + 10, 6, 3, HAIR.m);
  fig.hline(hx - 3, hx + 3, hy + 12, HAIR.l);
  // crown
  const cy = hy - 15;
  fig.rect(hx - 8, cy + 4, 16, 4, GOLD.m);
  for (const px of [hx - 8, hx - 2, hx + 4]) fig.rect(px, cy, 4, 4, GOLD.m);
  fig.hline(hx - 8, hx + 7, cy + 7, GOLD.d);
  fig.hline(hx - 7, hx + 6, cy + 4, GOLD.l);
  fig.rect(hx - 1, cy + 5, 2, 2, '#c83a4a');
  if (portrait.ornament) {
    // the HOLIDAY BRANCH ornament hangs off the right-hand point
    fig.vline(hx + 6, cy + 1, cy + 4, GOLD.l);
  }
  // eyes (ink, on card, moving anyway)
  for (const x of [hx - 5, hx + 4]) {
    if (e.eyes === 'happy') {
      fig.line(x - 2, hy - 1, x, hy - 3, INK);
      fig.line(x, hy - 3, x + 2, hy - 1, INK);
      continue;
    }
    const h = e.eyes === 'wide' ? 4 : e.eyes === 'narrow' ? 2 : 3;
    fig.rect(x - 2, hy - 2, 4, h, '#fbf6ec');
    const px = e.eyes === 'aside' ? x - 2 : e.eyes === 'down' ? x - 1 : x - 1;
    const py = e.eyes === 'down' ? hy : e.eyes === 'up' ? hy - 2 : hy - 1;
    fig.rect(px, py, 2, 2, INK);
  }
  // brows
  const brow = (x, dir) => {
    if (e.brows === 'angry') fig.line(x - 2, hy - 5 - dir, x + 2, hy - 4 + dir, INK);
    else if (e.brows === 'worried') fig.line(x - 2, hy - 4 + dir, x + 2, hy - 5 - dir, HAIR.d);
    else if (e.brows === 'up') fig.hline(x - 2, x + 2, hy - 6, HAIR.d);
    else if (e.brows === 'tilt') fig.line(x - 2, hy - 5 + (x < hx ? 1 : -1), x + 2, hy - 5, HAIR.d);
    else fig.hline(x - 2, x + 2, hy - 5, HAIR.d);
  };
  brow(hx - 5, 0);
  brow(hx + 4, 0);
  // mouth
  const my = hy + 6;
  const ink = '#7a2a2a';
  if (e.mouth === 'o') fig.ellipse(hx, my, 2, 2, '#5a1a1a');
  else if (e.mouth === 'open') { fig.rect(hx - 3, my - 1, 6, 3, '#5a1a1a'); fig.hline(hx - 2, hx + 1, my - 1, '#fbf6ec'); }
  else if (e.mouth === 'grin') { fig.hline(hx - 3, hx + 3, my, ink); fig.set(hx - 4, my - 1, ink); fig.set(hx + 4, my - 1, ink); }
  else if (e.mouth === 'frown') { fig.hline(hx - 2, hx + 2, my, ink); fig.set(hx - 3, my + 1, ink); fig.set(hx + 3, my + 1, ink); }
  else if (e.mouth === 'wobble') { for (let i = -3; i <= 3; i++) fig.set(hx + i, my + (i % 2 ? 0 : 1), ink); }
  else if (e.mouth === 'grim') { fig.rect(hx - 3, my - 1, 7, 2, '#fbf6ec'); fig.hline(hx - 3, hx + 3, my + 1, ink); fig.vline(hx, my - 1, my, ink); }
  else if (e.mouth === 'flat') fig.hline(hx - 2, hx + 2, my, ink);
  else { fig.hline(hx - 2, hx + 2, my, ink); fig.set(hx - 3, my - 1, ink); fig.set(hx + 3, my - 1, ink); }
  // cheeks
  const b = BLUSH[e.blush];
  if (b) {
    const w = 2 + e.blush;
    fig.rect(hx - 9, hy + 2, w, e.blush >= 3 ? 3 : 2, b);
    fig.rect(hx + 8 - w, hy + 2, w, e.blush >= 3 ? 3 : 2, b);
  }
  if (e.sweat) { fig.set(hx + 11, hy - 3, '#a8d8f0'); fig.set(hx + 11, hy - 2, '#78b0d8'); }
  if (e.tears) { fig.vline(hx - 7, hy + 1, hy + 4, '#a8d8f0'); fig.vline(hx + 6, hy + 1, hy + 4, '#a8d8f0'); }
  if (angry) for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (fig.alphaAt(x, y)) fig.blend(x, y, '#ff4010', 0.2);
  // cut out of card: white edge, a corrugated tear at the bottom left, ink
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (fig.alphaAt(x, y)) c.set(x, y, fig.get(x, y));
  c.outline(CARD.edge);
  c.outline(INK);
  for (let x = 4; x < 12; x++) c.set(x, 45 + (x % 2), x % 2 ? CARD.flute : CARD.l);
  // the fume that holds him together
  const fm = angry ? ['#f0a040c0', '#e86028a0'] : ['#c8d878c0', '#a8c858a0'];
  for (const [x, y] of [[6, 30], [41, 26], [9, 18], [40, 38]]) if (!c.alphaAt(x, y)) c.set(x, y, fm[(x + y) % 2]);
  return c;
}
