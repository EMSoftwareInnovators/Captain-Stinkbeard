import { PixelCanvas } from '../PixelCanvas.js';
import { PAL, rgba } from '../palette.js';
import { FRAME_W, FRAME_H } from './characterPainter.js';
import { BATTLE_W, BATTLE_H } from './battlePoses.js';

/**
 * Story Phase 17: Brogath's old crew, as he drew them on the Fan Mega-Pack's
 * carton: five promotional-style cut-outs, cheaply printed and badly
 * registered, each standing on a printed nameplate. Two of them came back
 * (Ledger Billiam and No-Nonsense Tilda: an escaped plume of the treasure
 * room's cloud went into them), three are still just cardboard (Old Jeb
 * Rattleplank, Wobbly Ned, Elsie Beanwright: props, never animated).
 *
 * Same 32x48 field frames as everyone else, 48x48 battle frames (party
 * members face left) and 48x48 portraits. They are FLAT, and the art leans
 * on it: edge-on they're a three-pixel strip; walking, the whole card
 * waddles on its nameplate; spinning, the print narrows to a strip and the
 * plain brown back comes round; lying down they're a squashed print; a gust
 * bends the top of the card over; hit in battle they go edge-on.
 *
 * Appearance data: { "id": "ledger", "painter": "cardboard_crew", "who": "ledger"|"tilda"|"jeb"|"ned"|"elsie",
 *   "singed": bool (Tilda's scorched corner and hat brim), "mellow": bool (green fume), "dormant": bool (no fume, ever) }
 *
 *   Ledger Billiam: an enormous black tricorn (far wider than the card), a square bewildered face,
 *     a faded blue coat, a ledger under one arm and a quill held up in the other hand. The colours
 *     are printed a pixel out of register (the gold trim misses the hat).
 *   No-Nonsense Tilda: a broad green hat, a severe double-breasted navy coat to the boots, arms
 *     folded, eyebrows Brogath spent far too long on. Cheap-O-Rama branding on the back.
 */
const INK = PAL.ink;
const GROUND = 45;
const CX = 16;

const CARD = { d: '#8a6a40', m: '#b8925e', l: '#d0aa74', h: '#e8c898', edge: '#f0e8d8', flute: '#a07a4a' };
const SKIN = { d: '#c08060', m: '#e8b48a', l: '#f4cca8' };
const PLATE = { m: '#f4ecd8', d: '#c8bc9c' };
const CHAR = { d: '#1e140e', m: '#3a2416', l: '#5a3a20', ember: '#e86a20' };
const FUMES = {
  normal: ['#c8d878a0', '#a8c85880', '#e0e8a060'],
  mellow: ['#9cc070a0', '#7aa85080', '#c0dc9060'],
};

// Ledger
const L_COAT = { d: '#2a4a6a', m: '#4a6a8a', l: '#6a8aaa', ghost: '#8aa8c8' };
const L_HAT = { d: '#141018', m: '#2a2430', l: '#443c4c' };
const GOLD = { d: '#a8801c', m: '#e8c850', l: '#fff0a0' };
const BOOK = { d: '#5a2010', m: '#8a3a1c', l: '#b05a2a', page: '#f0e6c8' };
const QUILL = { m: '#f4f0e8', d: '#c8c0b0' };
const STOCK = '#e8e4dc';
const SHOE = '#1e1418';
// Tilda
const T_COAT = { d: '#1a2032', m: '#2a3248', l: '#3a4462', h: '#4e5a7e', arm: '#5a6a96', armL: '#7484b0' };
const T_HAT = { d: '#24401e', m: '#3a6a3a', l: '#5a8a4a', band: '#1a2a14' };
const T_HAIR = { d: '#4a1a10', m: '#7a3018' };
const BOOT = { d: '#120e0c', m: '#2a201a', l: '#4a3a2a' };
// The dormant three
const JEB = { apron: '#8a6a3a', apronL: '#a8885a', shirt: '#c8b8a0', beard: '#c8c4c0', beardD: '#9a9690' };
const NED = { stripe: '#c83a3a', shirt: '#f0ece0', cap: '#3a5a8a', trouser: '#5a4a3a' };
const ELSIE = { dress: '#7a5a8a', apron: '#f0ece0', kerchief: '#d84a4a', pot: '#4a4a52', potL: '#7a7a84', bean: '#8a4a1a' };

export function crewLook(app) {
  return {
    who: app.who ?? 'ledger',
    singed: !!app.singed,
    mellow: !!app.mellow,
    dormant: !!app.dormant,
  };
}

// ---------------------------------------------------------------------------
// Little drawing helpers

function plate(fig, lift, ink, crooked = 0) {
  // The printed nameplate the figure stands on (text is a scribble at this size).
  const y = GROUND - 4 - lift;
  for (let x = 8; x <= 23; x++) {
    const dy = crooked ? Math.round(((x - 8) * crooked) / 15) : 0;
    for (let j = 0; j < 4; j++) fig.set(x, y + j + dy, j === 3 ? PLATE.d : PLATE.m);
  }
  for (let x = 10; x <= 21; x += 1) if (x % 3 !== 0) fig.set(x, y + 1 + (crooked ? Math.round(((x - 8) * crooked) / 15) : 0), ink);
  for (let x = 11; x <= 19; x += 2) fig.set(x, y + 2 + (crooked ? Math.round(((x - 8) * crooked) / 15) : 0), ink);
}

function eyes(fig, cx, y, kind, gap = 2, look = 0) {
  for (const x of [cx - gap, cx + gap]) {
    if (kind === 'shut') fig.hline(x - 1, x, y, INK);
    else if (kind === 'narrow') {
      fig.hline(x - 1, x, y, '#fbf6ec');
      fig.set(x - (look < 0 ? 1 : 0), y, INK);
    } else if (kind === 'wide') {
      fig.rect(x - 1, y - 1, 2, 3, '#fbf6ec');
      fig.set(x - 1 + (look > 0 ? 1 : 0), y, INK);
    } else if (kind === 'fixed') {
      fig.rect(x - 1, y - 1, 2, 2, '#fbf6ec');
      fig.set(x - 1, y - 1, INK);
    } else {
      fig.rect(x - 1, y - 1, 2, 2, '#fbf6ec');
      fig.set(x - 1 + (look > 0 ? 1 : 0), y, INK);
    }
  }
}

function mouth(fig, cx, y, kind, ink = '#7a2a2a') {
  if (kind === 'o') fig.rect(cx - 1, y - 1, 2, 2, '#5a1a1a');
  else if (kind === 'open') { fig.rect(cx - 2, y - 1, 4, 2, '#5a1a1a'); fig.hline(cx - 1, cx, y - 1, '#fbf6ec'); }
  else if (kind === 'flat') fig.hline(cx - 1, cx + 1, y, ink);
  else if (kind === 'grim') { fig.hline(cx - 2, cx + 1, y, ink); fig.set(cx - 2, y + 1, ink); fig.set(cx + 1, y + 1, ink); }
  else if (kind === 'wobble') { fig.set(cx - 2, y, ink); fig.set(cx - 1, y - 1, ink); fig.set(cx, y, ink); fig.set(cx + 1, y - 1, ink); }
  else if (kind === 'smile') { fig.set(cx - 2, y - 1, ink); fig.hline(cx - 1, cx, y, ink); fig.set(cx + 1, y - 1, ink); }
  else fig.hline(cx - 1, cx, y, ink);
}

// ---------------------------------------------------------------------------
// The prints (front). Each draws onto `fig` and returns { hy, hem } for the fumes.

/**
 * pose: { arms: 'quill'|'write'|'up'|'out'|'shield'|'swat_up'|'swat'|'point'|'down', eyes, mouth, lift, look,
 *         brows: 'up'|'worried'|'flat' }
 */
function printLedger(fig, pose) {
  const lift = pose.lift ?? 0;
  const top = 21 - lift;
  // Stockings and buckled shoes.
  for (const lx of [13, 17]) {
    fig.rect(lx, 34 - lift, 2, 6, STOCK);
    fig.rect(lx - (lx < CX ? 1 : 0), 40 - lift, 3, 1, SHOE);
    fig.set(lx + (lx < CX ? 0 : 1), 40 - lift, GOLD.m);
  }
  // A narrow coat with tails, a mustard waistcoat; the blue printed a pixel out of register.
  for (let j = 0; j < 14; j++) {
    const y = top + j;
    const half = 4 + (j > 8 ? 1 : 0);
    for (let x = CX - half; x <= CX + half - 1; x++) fig.set(x, y, x === CX - half ? L_COAT.l : x >= CX + half - 2 ? L_COAT.d : L_COAT.m);
    fig.set(CX + half, y, L_COAT.ghost); // misregistration ghost
  }
  fig.rect(CX - 1, top + 1, 2, 8, '#c8a03a');
  for (let k = 0; k < 4; k++) fig.set(CX - 1, top + 2 + k * 2, GOLD.l);
  fig.hline(CX - 1, CX, top, '#f0ece0'); // cravat
  // Arms (flaps): his left (our right) usually keeps the ledger tucked; his right holds the quill.
  const arms = pose.arms ?? 'quill';
  const shoulderL = [CX - 5, top + 1];
  const shoulderR = [CX + 4, top + 1];
  const book = (x, y, open = false) => {
    fig.rect(x, y, 6, 8, BOOK.m);
    fig.vline(x, y, y + 7, BOOK.d);
    fig.vline(x + 5, y + 1, y + 6, BOOK.page);
    if (open) { fig.rect(x + 1, y + 1, 4, 6, BOOK.page); fig.vline(x + 3, y + 1, y + 6, BOOK.d); }
    fig.set(x + 2, y + 3, GOLD.m);
  };
  const quill = (hx, hy, up = true) => {
    // a white feather from the hand, up and out
    for (let i = 0; i < 7; i++) fig.set(hx - Math.round(i / 3), hy - 1 - i * (up ? 1 : -1), i < 2 ? QUILL.d : QUILL.m);
    fig.set(hx - 1 - Math.round(4 / 3), hy - 4 * (up ? 1 : -1), QUILL.m);
    fig.set(hx - 2, hy - 6 * (up ? 1 : -1), QUILL.m);
    fig.rect(hx, hy, 2, 2, SKIN.m);
  };
  if (arms === 'swat_up') {
    // the ledger held up in both hands, ready to come down
    fig.rect(shoulderL[0] - 1, top - 7, 2, 8, L_COAT.m);
    fig.rect(shoulderR[0], top - 7, 2, 8, L_COAT.d);
    book(CX - 3, top - 13);
  } else if (arms === 'swat') {
    fig.rect(shoulderL[0] - 2, top + 2, 4, 2, L_COAT.l);
    book(shoulderL[0] - 8, top + 1);
    fig.rect(shoulderR[0], top + 1, 2, 9, L_COAT.d);
  } else if (arms === 'shield') {
    // hiding behind the ledger
    book(CX - 3, 12 - lift, true);
    fig.rect(CX - 5, 18 - lift, 2, 2, SKIN.m);
    fig.rect(CX + 3, 18 - lift, 2, 2, SKIN.m);
  } else {
    // his left: ledger tucked (or flung out)
    if (arms === 'up' || arms === 'out') {
      const up = arms === 'up';
      fig.rect(shoulderR[0], up ? top - 8 : top + 1, up ? 2 : 7, up ? 9 : 2, L_COAT.l);
      book(up ? shoulderR[0] - 1 : shoulderR[0] + 6, up ? top - 15 : top - 2);
    } else {
      book(CX + 3, top + 3);
      fig.rect(shoulderR[0], top + 1, 2, 3, L_COAT.d);
      fig.hline(CX + 3, CX + 8, top + 5, L_COAT.d);
    }
    // his right: the quill
    if (arms === 'write') {
      fig.line(shoulderL[0], top + 2, CX + 2, top + 6, L_COAT.l);
      quill(CX + 3, top + 6, false);
    } else if (arms === 'down') {
      fig.rect(shoulderL[0], top + 1, 2, 9, L_COAT.l);
      fig.rect(shoulderL[0], top + 10, 2, 2, SKIN.m);
    } else if (arms === 'point') {
      fig.rect(shoulderL[0] - 6, top + 1, 7, 2, L_COAT.l);
      quill(shoulderL[0] - 8, top + 1);
    } else if (arms === 'out' || arms === 'up') {
      fig.rect(shoulderL[0] - 1, top - 8, 2, 9, L_COAT.l);
      quill(shoulderL[0] - 1, top - 10);
    } else {
      // 'quill': held up by the shoulder, like a man about to make a point about money
      fig.line(shoulderL[0], top + 3, shoulderL[0] - 3, top - 1, L_COAT.l);
      fig.line(shoulderL[0] + 1, top + 3, shoulderL[0] - 2, top - 1, L_COAT.m);
      quill(shoulderL[0] - 4, top - 2);
    }
  }
  // The square face.
  const hy = 16 - lift;
  if (arms !== 'shield') {
    fig.rect(CX - 5, hy - 4, 10, 10, SKIN.m);
    fig.rect(CX - 4, hy - 3, 5, 5, SKIN.l);
    fig.vline(CX + 4, hy - 4, hy + 5, SKIN.d);
    fig.hline(CX - 5, CX + 4, hy + 5, SKIN.d);
    // grey-brown wisps under the hat
    fig.vline(CX - 6, hy - 3, hy, '#8a7a6a');
    fig.vline(CX + 5, hy - 3, hy, '#6a5a4a');
    eyes(fig, CX, hy, pose.eyes ?? 'wide', 2, pose.look ?? 0);
    const brows = pose.brows ?? 'up';
    if (brows === 'up') { fig.hline(CX - 3, CX - 1, hy - 3, '#5a4a3a'); fig.hline(CX + 1, CX + 3, hy - 3, '#5a4a3a'); }
    else if (brows === 'worried') { fig.line(CX - 3, hy - 2, CX - 1, hy - 3, '#5a4a3a'); fig.line(CX + 1, hy - 3, CX + 3, hy - 2, '#5a4a3a'); }
    else { fig.hline(CX - 3, CX - 1, hy - 2, '#5a4a3a'); fig.hline(CX + 1, CX + 3, hy - 2, '#5a4a3a'); }
    mouth(fig, CX, hy + 3, pose.mouth ?? 'o');
    fig.set(CX - 4, hy + 1, '#f0a0a8'); // a cheek, printed slightly off
  }
  // The hat: an enormous black tricorn, far wider than the card, gold trim a pixel off.
  const ty = hy - 5;
  for (let j = 0; j < 9; j++) {
    const half = Math.round(3 + j * 1.45);
    for (let x = CX - half; x <= CX + half - 1; x++) fig.set(x, ty - 8 + j, j === 8 ? L_HAT.d : x < CX - half + 2 ? L_HAT.l : L_HAT.m);
  }
  for (let j = 0; j < 9; j++) {
    const half = Math.round(3 + j * 1.45);
    fig.set(CX - half + 1, ty - 8 + j + 1, GOLD.m); // trim, out of register
    fig.set(CX + half, ty - 8 + j + 1, GOLD.d);
  }
  fig.rect(CX - 1, ty - 4, 2, 2, GOLD.l); // the coin badge: TREASURER
  plate(fig, lift, '#2a6a3a');
  return { hy, hem: top + 13 };
}

/** pose.arms: 'crossed'|'point'|'up'|'smoke'|'shove_back'|'shove'|'down' */
function printTilda(fig, pose) {
  const lift = pose.lift ?? 0;
  const top = 20 - lift;
  // Sensible boots.
  for (const lx of [12, 17]) {
    fig.rect(lx, 36 - lift, 3, 4, BOOT.m);
    fig.vline(lx, 36 - lift, 39 - lift, BOOT.l);
    fig.hline(lx - (lx < CX ? 1 : 0), lx + 2 + (lx < CX ? 0 : 1), 40 - lift, BOOT.d);
  }
  // A long severe coat, double-breasted, high collar.
  for (let j = 0; j < 17; j++) {
    const y = top + j;
    const half = 5 + Math.round(j / 9);
    for (let x = CX - half; x <= CX + half - 1; x++) fig.set(x, y, x === CX - half ? T_COAT.l : x >= CX + half - 2 ? T_COAT.d : T_COAT.m);
  }
  fig.vline(CX, top + 2, top + 16, T_COAT.d);
  for (let k = 0; k < 2; k++) { fig.set(CX - 3, top + 10 + k * 3, GOLD.m); fig.set(CX + 2, top + 10 + k * 3, GOLD.m); }
  fig.rect(CX - 4, top - 1, 8, 2, T_COAT.d); // collar
  fig.set(CX - 4, top - 1, T_COAT.h);
  const arms = pose.arms ?? 'crossed';
  const sh = top + 2;
  const hand = (x, y) => fig.rect(x, y, 2, 2, SKIN.m);
  const crossed = () => {
    // folded hard across the chest: two sleeves crossing, a hand on each arm
    fig.rect(CX - 7, sh + 3, 14, 4, T_COAT.arm);
    fig.hline(CX - 7, CX + 6, sh + 3, T_COAT.armL);
    fig.line(CX - 3, sh + 6, CX + 1, sh + 3, T_COAT.d);
    fig.hline(CX - 7, CX + 6, sh + 7, INK);
    hand(CX - 7, sh + 3);
    hand(CX + 5, sh + 4);
  };
  if (arms === 'crossed') crossed();
  else if (arms === 'point') {
    fig.rect(CX - 7, sh + 3, 8, 4, T_COAT.arm); fig.hline(CX - 7, CX, sh + 7, INK); hand(CX - 1, sh + 4); // one arm still folded
    fig.rect(CX + 5, sh, 8, 2, T_COAT.arm); hand(CX + 13, sh); fig.set(CX + 15, sh, SKIN.m);
  } else if (arms === 'up') {
    fig.rect(CX - 7, sh - 9, 2, 10, T_COAT.arm); hand(CX - 7, sh - 11);
    fig.rect(CX + 5, sh - 9, 2, 10, T_COAT.arm); hand(CX + 5, sh - 11);
  } else if (arms === 'smoke') {
    fig.rect(CX - 7, sh + 3, 8, 4, T_COAT.arm); hand(CX - 1, sh + 4);
    fig.line(CX + 5, sh + 1, CX + 3, sh - 4, T_COAT.arm);
    hand(CX + 2, sh - 5);
  } else if (arms === 'shove_back') {
    crossed();
    fig.rect(CX - 9, sh - 1, 4, 2, T_COAT.arm); hand(CX - 11, sh - 2);
  } else if (arms === 'shove') {
    fig.rect(CX - 7, sh + 3, 8, 4, T_COAT.arm); hand(CX - 1, sh + 4);
    fig.rect(CX - 14, sh + 1, 9, 2, T_COAT.arm); hand(CX - 16, sh); fig.set(CX - 17, sh + 1, SKIN.m);
  } else {
    fig.rect(CX - 7, sh, 2, 10, T_COAT.arm); hand(CX - 7, sh + 10);
    fig.rect(CX + 5, sh, 2, 10, T_COAT.l); hand(CX + 5, sh + 10);
  }
  // Face: angular; auburn hair tied back.
  const hy = 14 - lift;
  fig.rect(CX - 4, hy - 3, 8, 9, SKIN.m);
  fig.rect(CX - 3, hy - 2, 4, 4, SKIN.l);
  fig.set(CX - 4, hy + 5, 0); fig.set(CX + 3, hy + 5, 0); // the chin's corners off
  fig.vline(CX + 3, hy - 3, hy + 4, SKIN.d);
  fig.vline(CX - 5, hy - 2, hy + 2, T_HAIR.m);
  fig.vline(CX + 4, hy - 2, hy + 3, T_HAIR.d);
  eyes(fig, CX, hy + 1, pose.eyes ?? 'narrow', 2, pose.look ?? 0);
  // The eyebrows Brogath spent far too long on: thick, black, dramatically angled.
  const brows = pose.brows ?? 'angry';
  if (brows === 'angry') {
    fig.line(CX - 4, hy - 2, CX - 1, hy, INK); fig.line(CX - 4, hy - 1, CX - 2, hy, INK);
    fig.line(CX + 3, hy - 2, CX, hy, INK); fig.line(CX + 3, hy - 1, CX + 1, hy, INK);
  } else if (brows === 'up') {
    fig.hline(CX - 4, CX - 1, hy - 2, INK); fig.hline(CX, CX + 3, hy - 2, INK);
  } else {
    fig.line(CX - 4, hy, CX - 1, hy - 2, INK); fig.line(CX, hy - 2, CX + 3, hy, INK);
  }
  mouth(fig, CX, hy + 4, pose.mouth ?? 'grim', '#6a2a2a');
  if (arms === 'smoke') {
    // a cigarette, and its ember (only ever lit by the story)
    fig.hline(CX + 1, CX + 3, hy + 4, '#f4f0e8');
    fig.set(CX + 4, hy + 4, pose.lit ? CHAR.ember : '#c8c0b0');
  }
  // The broad green hat.
  const by = hy - 4;
  fig.rect(CX - 9, by, 18, 2, T_HAT.m);
  fig.hline(CX - 9, CX + 8, by + 1, T_HAT.d);
  fig.hline(CX - 8, CX + 7, by, T_HAT.l);
  fig.rect(CX - 5, by - 5, 10, 5, T_HAT.m);
  fig.rect(CX - 5, by - 5, 3, 5, T_HAT.l);
  fig.hline(CX - 5, CX + 4, by - 1, T_HAT.band);
  plate(fig, lift, '#a82424');
  return { hy, hem: top + 16 };
}

function printJeb(fig) {
  // Old Jeb Rattleplank: bald, a big grey beard, a carpenter's apron, a hammer, a tray of things that aren't his.
  for (const lx of [13, 17]) fig.rect(lx, 34, 2, 7, '#4a3a2a');
  fig.rect(CX - 5, 20, 10, 15, JEB.shirt);
  fig.rect(CX - 4, 23, 8, 12, JEB.apron);
  fig.vline(CX - 4, 23, 34, JEB.apronL);
  fig.rect(CX - 7, 24, 3, 2, JEB.shirt);
  fig.rect(CX - 9, 22, 2, 6, '#7a7a84'); fig.rect(CX - 10, 21, 4, 2, '#5a5a62'); // the hammer
  fig.rect(CX + 4, 27, 8, 2, '#8a6a3a'); // the tray
  for (const x of [CX + 5, CX + 7, CX + 9]) fig.set(x, 26, x === CX + 7 ? GOLD.m : '#a8a8b0');
  const hy = 14;
  fig.ellipse(CX, hy, 4, 5, SKIN.m);
  fig.hline(CX - 4, CX - 3, hy - 2, JEB.beard); fig.hline(CX + 2, CX + 3, hy - 2, JEB.beard);
  fig.ellipse(CX, hy + 5, 4, 3, JEB.beard);
  fig.hline(CX - 2, CX + 2, hy + 8, JEB.beardD);
  // Only one eye drawn: EYES T.B.C.
  fig.rect(CX - 3, hy - 1, 2, 2, '#fbf6ec'); fig.set(CX - 3, hy, INK);
  fig.hline(CX + 1, CX + 2, hy, '#c8a888'); // the pencil line where the other one goes
  plate(fig, 0, '#3a3a6a');
}

function printNed(fig) {
  // Wobbly Ned: striped shirt, knit cap. (The card leans: his stand's bent.)
  for (const lx of [13, 17]) fig.rect(lx, 33, 2, 8, NED.trouser);
  for (let j = 0; j < 13; j++) {
    const y = 20 + j;
    for (let x = CX - 5; x <= CX + 4; x++) fig.set(x, y, j % 3 === 0 ? NED.stripe : NED.shirt);
  }
  fig.rect(CX - 7, 21, 2, 9, NED.shirt); fig.rect(CX + 5, 21, 2, 9, NED.shirt);
  fig.rect(CX - 7, 30, 2, 2, SKIN.m); fig.rect(CX + 5, 30, 2, 2, SKIN.m);
  const hy = 14;
  fig.ellipse(CX, hy, 4, 5, SKIN.m);
  fig.rect(CX - 4, hy - 6, 8, 3, NED.cap); fig.set(CX, hy - 7, NED.cap);
  eyes(fig, CX, hy, 'look', 2, 1);
  mouth(fig, CX, hy + 3, 'wobble');
  plate(fig, 0, '#3a3a6a', 2);
}

function printElsie(fig) {
  // Elsie Beanwright: a kerchief, an apron, a big pot of beans. Only half coloured in.
  for (const lx of [13, 17]) fig.rect(lx, 35, 2, 6, '#3a2a2a');
  for (let j = 0; j < 15; j++) {
    const y = 20 + j;
    const half = 5 + Math.round(j / 5);
    for (let x = CX - half; x <= CX + half - 1; x++) fig.set(x, y, ELSIE.dress);
  }
  fig.rect(CX - 4, 23, 8, 11, ELSIE.apron);
  fig.ellipse(CX - 1, 28, 6, 3, ELSIE.pot); fig.hline(CX - 7, CX + 5, 26, ELSIE.potL);
  for (const x of [CX - 4, CX - 2, CX]) fig.set(x, 25, ELSIE.bean);
  fig.line(CX + 3, 22, CX + 7, 15, '#a8a8b0'); // the ladle
  const hy = 14;
  fig.ellipse(CX, hy, 4, 5, SKIN.m);
  fig.rect(CX - 5, hy - 6, 10, 3, ELSIE.kerchief); fig.set(CX + 5, hy - 4, ELSIE.kerchief);
  eyes(fig, CX, hy, 'look');
  mouth(fig, CX, hy + 3, 'smile');
  fig.set(CX - 3, hy + 2, '#f0a0a8'); fig.set(CX + 3, hy + 2, '#f0a0a8');
  plate(fig, 0, '#3a3a6a');
  // The right half never got its colour: plain card and the pencil lines.
  for (let y = 0; y < GROUND - 4; y++) {
    for (let x = CX + 1; x < FRAME_W; x++) {
      if (!fig.alphaAt(x, y)) continue;
      fig.set(x, y, (x + y) % 9 === 0 ? '#a89070' : CARD.l);
    }
  }
}

const PRINTS = { ledger: printLedger, tilda: printTilda, jeb: printJeb, ned: printNed, elsie: printElsie };

/** Tilda's scorched corner: the coat's hem and the nameplate burnt away on the left to a ragged black edge, and the hat brim's left tip. */
function singe(fig) {
  // burnt away (a ragged diagonal from the hem up the left side)
  for (let y = 30; y < FRAME_H; y++) {
    const edge = Math.round(6 + (y - 30) * 0.55 + ((y * 7) % 3) - 1);
    for (let x = 0; x <= edge && x < FRAME_W; x++) if (fig.alphaAt(x, y)) fig.set(x, y, 0);
    // charred just inside the edge
    for (let k = 1; k <= 3; k++) {
      const x = edge + k;
      if (fig.alphaAt(x, y)) fig.set(x, y, k === 1 ? CHAR.d : k === 2 ? CHAR.m : (x + y) % 2 ? CHAR.l : fig.get(x, y));
    }
  }
  // the hat brim's left tip
  for (let y = 0; y < 14; y++) for (let x = 0; x <= 9; x++) {
    if (!fig.alphaAt(x, y) || fig.get(x, y) === rgba(SKIN.m)) continue;
    fig.set(x, y, x <= 7 ? 0 : CHAR.d);
  }
}

function fumes(c, L, f, hy, hem) {
  if (L.dormant) return;
  const col = L.mellow ? FUMES.mellow : FUMES.normal;
  const spots = [[[CX - 10, hy + 5], [CX + 9, hy + 11], [CX - 8, hem - 2]], [[CX + 10, hy + 4], [CX - 9, hy + 12], [CX + 8, hem - 4]]][f % 2];
  spots.forEach(([x, y], i) => {
    if (!c.alphaAt(x, y)) c.set(x, y, col[i % col.length]);
    if (!c.alphaAt(x, y - 1)) c.set(x, y - 1, col[(i + 1) % col.length]);
  });
}

// ---------------------------------------------------------------------------
// Views: front, edge-on, back; and the transforms that make them move

function front(L, pose) {
  const fig = new PixelCanvas(FRAME_W, FRAME_H);
  const meta = PRINTS[L.who](fig, pose, L) ?? { hy: 14, hem: 34 };
  if (L.singed) singe(fig);
  const c = new PixelCanvas(FRAME_W, FRAME_H);
  for (let y = 0; y < FRAME_H; y++) for (let x = 0; x < FRAME_W; x++) if (fig.alphaAt(x, y)) c.set(x, y, fig.get(x, y));
  c.outline(CARD.edge);
  c.outline(INK);
  if (!pose.still) fumes(c, L, pose.fume ?? 0, meta.hy, meta.hem);
  if (L.singed && pose.smoking) {
    // a thread of smoke off the burnt corner
    for (const [x, y] of [[6, 38], [5, 35], [6, 32], [5, 29]]) if (!c.alphaAt(x, y)) c.set(x, y + ((pose.fume ?? 0) % 2), '#8a8a8a90');
  }
  return c;
}

function side(L, pose) {
  const c = new PixelCanvas(FRAME_W, FRAME_H);
  const lift = pose.lift ?? 0;
  const top = (L.who === 'ledger' ? 3 : 5) - lift;
  // the stand behind
  c.line(CX + 1, 30 - lift, CX + 5, GROUND - 1, CARD.flute);
  c.line(CX + 2, 30 - lift, CX + 6, GROUND - 1, CARD.l);
  for (let y = top; y < GROUND - lift; y++) {
    c.set(CX - 1, y, CARD.edge);
    c.set(CX, y, y % 2 ? CARD.flute : CARD.l);
    c.set(CX + 1, y, CARD.m);
  }
  // a sliver of hat, a sliver of nameplate
  const hat = L.who === 'ledger' ? L_HAT.m : L.who === 'tilda' ? T_HAT.m : CARD.d;
  c.vline(CX - 1, top, top + 6, hat);
  c.vline(CX - 1, GROUND - 4 - lift, GROUND - 1 - lift, PLATE.m);
  if (L.singed) { c.vline(CX - 1, GROUND - 8 - lift, GROUND - 1 - lift, CHAR.m); c.set(CX - 1, top, CHAR.d); }
  c.outline(INK);
  if (!L.dormant && !pose.still) {
    const col = L.mellow ? FUMES.mellow : FUMES.normal;
    const f = pose.fume ?? 0;
    const wisps = f % 2 ? [[CX - 3, 12], [CX + 3, 24], [CX - 2, 36]] : [[CX + 3, 10], [CX - 3, 22], [CX + 2, 38]];
    wisps.forEach(([x, y], i) => { if (!c.alphaAt(x, y - lift)) c.set(x, y - lift, col[i % col.length]); });
  }
  return c;
}

function back(L, pose) {
  const f = front({ ...L, dormant: true }, { ...pose, still: true });
  const c = new PixelCanvas(FRAME_W, FRAME_H);
  const inkV = rgba(INK);
  const edgeV = rgba(CARD.edge);
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      if (!f.alphaAt(x, y)) continue;
      const col = f.get(x, y);
      if (col === inkV || col === edgeV) c.set(x, y, col);
      else c.set(x, y, y % 4 === 0 ? CARD.flute : x % 7 === 0 ? CARD.l : CARD.m);
    }
  }
  const lift = pose.lift ?? 0;
  if (L.who === 'tilda') {
    // the Cheap-O-Rama branding Brogath didn't quite cover
    c.rect(CX - 5, 24 - lift, 10, 5, '#c8242c');
    for (let x = CX - 4; x <= CX + 3; x += 2) c.set(x, 26 - lift, '#f4dc6c');
    c.set(CX, 22 - lift, '#7a3a9a'); c.rect(CX - 1, 21 - lift, 3, 1, '#7a3a9a');
  } else {
    // FRAGILE
    c.rect(CX - 4, 25 - lift, 8, 4, '#f4ecd8');
    c.hline(CX - 3, CX + 2, 27 - lift, '#c8242c');
  }
  if (L.singed) for (const [x, y] of [[9, 38], [9, 39], [10, 40], [10, 41], [11, 41]]) if (c.alphaAt(x, y)) c.set(x, y, CHAR.m);
  // the fold-out stand
  c.line(CX - 1, 24 - lift, CX - 3, GROUND - 1, CARD.l);
  c.line(CX, 24 - lift, CX - 2, GROUND - 1, CARD.d);
  return c;
}

/**
 * Nearest-neighbour affine copy: scale about (ox, oy), shear x by y, then move.
 * Pixels that land outside the source stay clear.
 */
export function xform(src, { sx = 1, sy = 1, shear = 0, ox = CX, oy = GROUND, dx = 0, dy = 0, w = FRAME_W, h = FRAME_H } = {}) {
  const out = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ry = (y - dy - oy) / sy + oy;
      const rx = (x - dx - ox - shear * (y - dy - oy)) / sx + ox;
      const col = src.get(Math.round(rx), Math.round(ry));
      if (col >>> 24) out.px[y * w + x] = col;
    }
  }
  return out;
}

/** Spinning like a playing card: t in [0, 1) is one turn. */
function spinFrame(L, pose, t) {
  const a = t * Math.PI * 2;
  const s = Math.cos(a);
  if (Math.abs(s) < 0.2) return side(L, pose);
  const face = s > 0 ? front(L, pose) : back(L, pose);
  return xform(face, { sx: Math.abs(s), oy: GROUND });
}

/** Sitting: the card folded at the waist (the lower half squashed under it). */
function fold(c, waist = 33) {
  const out = new PixelCanvas(FRAME_W, FRAME_H);
  const low = GROUND - waist;
  const shift = Math.floor(low / 2);
  for (let y = 0; y < FRAME_H; y++) {
    const sy = y < GROUND - shift ? y - shift : waist + (y - (GROUND - shift)) * 2;
    for (let x = 0; x < FRAME_W; x++) {
      const col = c.get(x, sy);
      if (col >>> 24) out.px[y * FRAME_W + x] = col;
    }
  }
  return out;
}

function frame(L, dir, pose) {
  let c;
  if (pose.spin !== undefined) c = spinFrame(L, pose, pose.spin);
  else if (dir === 'up') c = back(L, pose);
  else if (dir === 'left' || pose.edge) c = side(L, pose);
  else c = front(L, pose);
  if (pose.flat) c = xform(c, { sy: 0.3, oy: GROUND });
  if (pose.bend) c = xform(c, { shear: pose.bend, oy: GROUND });
  if (pose.sit) c = fold(c);
  if (pose.dx) c = xform(c, { dx: pose.dx });
  return c;
}

function mirror(pc) {
  const m = new PixelCanvas(pc.width, pc.height);
  m.blit(pc, 0, 0, { flipX: true });
  return m;
}

/** Field animations. Their own arms (Ledger's quill / Tilda's folded arms) unless a pose says otherwise. */
function posesFor(who) {
  const ledger = who === 'ledger';
  const rest = ledger ? 'quill' : 'crossed';
  const busy = ledger ? 'write' : 'point';
  const wide = ledger ? 'wide' : 'narrow';
  return {
    idle: [{ fume: 0, arms: rest }, { fume: 1, arms: rest, look: 1 }],
    // The whole card waddles on its nameplate.
    walk: [{ arms: rest, lift: 1, dx: -1, fume: 0 }, { arms: rest, fume: 1 }, { arms: rest, lift: 1, dx: 1, fume: 0 }, { arms: rest, fume: 1, look: 1 }],
    work: [{ arms: busy, fume: 0, mouth: ledger ? 'flat' : 'open' }, { arms: busy, fume: 1, mouth: ledger ? 'smile' : 'grim', lift: ledger ? 0 : 1 }],
    sit: [{ sit: true, arms: rest, fume: 0 }],
    doze: [{ sit: true, arms: rest, eyes: 'shut', fume: 0 }],
    sleep: [{ arms: rest, eyes: 'shut', fume: 0 }],
    point: [{ arms: 'point', fume: 0, mouth: 'open' }],
    surprised: [{ arms: 'up', eyes: 'wide', mouth: 'o', brows: 'up', lift: 1, fume: 1 }],
    // An unoccupied cut-out (before the plume): no fume, the printed face.
    stiff: [{ still: true, arms: rest, eyes: 'fixed' }],
    // The first awkward movements.
    wake: [{ arms: rest, eyes: 'fixed', fume: 0 }, { arms: 'down', eyes: wide, fume: 1, lift: 1 }, { arms: rest, eyes: 'shut', fume: 0 }, { arms: 'up', eyes: 'wide', mouth: 'o', fume: 1 }],
    spin: [0, 1, 2, 3, 4, 5].map((k) => ({ spin: k / 6, arms: rest, fume: k % 2, eyes: 'wide', mouth: 'o' })),
    flat: [{ flat: true, arms: rest, eyes: 'wide', fume: 0 }, { flat: true, arms: rest, eyes: 'shut', fume: 1 }],
    flutter: [{ bend: -0.09, arms: rest, eyes: 'wide', fume: 0 }, { bend: -0.04, arms: rest, eyes: 'wide', fume: 1 }, { bend: 0.06, arms: rest, eyes: 'wide', fume: 0 }],
    lifted: [{ bend: 0.12, arms: 'up', eyes: 'wide', mouth: 'o', fume: 0 }, { bend: -0.12, arms: 'up', eyes: 'wide', mouth: 'o', fume: 1 }],
    proud: [{ arms: ledger ? 'up' : 'crossed', mouth: 'smile', brows: ledger ? 'up' : 'flat', fume: 0 }, { arms: ledger ? 'up' : 'crossed', mouth: 'smile', brows: ledger ? 'up' : 'flat', fume: 1 }],
    nervous: [{ arms: ledger ? 'shield' : 'down', mouth: 'wobble', brows: 'worried', fume: 0 }, { arms: ledger ? 'shield' : 'down', mouth: 'wobble', brows: 'worried', fume: 1, look: 1 }],
    panic: [{ arms: 'up', eyes: 'wide', mouth: 'open', brows: 'up', lift: 1, fume: 0, smoking: true }, { arms: 'up', eyes: 'wide', mouth: 'o', brows: 'up', fume: 1, smoking: true }],
    smoke: [{ arms: ledger ? rest : 'smoke', lit: true, eyes: 'shut', brows: 'flat', mouth: 'flat', fume: 0 }, { arms: ledger ? rest : 'smoke', lit: true, eyes: 'narrow', brows: 'flat', mouth: 'flat', fume: 1 }],
    order: [{ arms: ledger ? 'point' : 'point', mouth: 'open', fume: 0 }, { arms: ledger ? 'point' : 'point', mouth: 'grim', fume: 1, lift: 1 }],
  };
}
export const CREW_RATES = { idle: 1.4, walk: 6, work: 3, stiff: 0, wake: 3, spin: 10, flat: 1, flutter: 6, lifted: 5, proud: 1.4, nervous: 5, panic: 7, smoke: 1, order: 3 };

export function paintCrewSheet(appearance) {
  const L = crewLook(appearance);
  const frames = {};
  const anims = {};
  for (const [anim, poses] of Object.entries(posesFor(L.who))) {
    for (const dir of ['down', 'left', 'right', 'up']) {
      anims[`${anim}_${dir}`] = poses.map((pose, i) => {
        let f = frame(L, dir === 'right' ? 'left' : dir, pose);
        if (dir === 'right') f = mirror(f);
        const name = `${anim}_${dir}_${i}`;
        frames[name] = f;
        return name;
      });
    }
  }
  return { frames, anims };
}

// ---------------------------------------------------------------------------
// Props: the cut-outs before anybody's in them (and the three nobody is in)

/** A cut-out standing on the floor (still, no fume): 32x46 so its nameplate sits on the tile. */
export function paintCutoutProp(who, { lean = 0 } = {}) {
  const L = { who, singed: false, mellow: false, dormant: true };
  let c = front(L, { still: true, eyes: 'fixed' });
  if (lean) c = xform(c, { shear: lean, oy: GROUND });
  // the fold-out stand's foot, behind
  c.hline(CX + 2, CX + 6, GROUND - 1, CARD.d);
  return c.crop(0, 0, FRAME_W, GROUND + 1);
}

// ---------------------------------------------------------------------------
// Battle (48x48, facing left): the print, turned a little toward the enemy

const BATTLE_POSES = {
  ledger: {
    ready: { pose: { arms: 'quill', fume: 0 } },
    ready2: { pose: { arms: 'quill', fume: 1, look: -1 } },
    windup: { pose: { arms: 'swat_up', eyes: 'wide', mouth: 'o', fume: 0 }, shear: 0.08 },
    swing: { pose: { arms: 'swat', eyes: 'wide', mouth: 'open', fume: 1 }, shear: -0.16, dx: -3 },
    strike: { pose: { arms: 'swat', eyes: 'shut', mouth: 'open', fume: 0 }, shear: -0.22, dx: -4 },
    hurt: { pose: { edge: true, fume: 1 }, edge: true, dx: 2 },
    defend: { pose: { arms: 'shield', fume: 0 } },
    order: { pose: { arms: 'up', eyes: 'wide', mouth: 'open', brows: 'up', fume: 1 } },
    victory: { pose: { arms: 'up', mouth: 'smile', eyes: 'shut', fume: 0 } },
    victory2: { pose: { arms: 'up', mouth: 'smile', eyes: 'shut', fume: 1, lift: 1 } },
    item: { pose: { arms: 'point', mouth: 'flat', fume: 0 } },
    ko: { pose: { arms: 'quill', eyes: 'shut', fume: 0, still: true }, sy: 0.25 },
  },
  tilda: {
    ready: { pose: { arms: 'crossed', fume: 0 } },
    ready2: { pose: { arms: 'crossed', fume: 1, look: -1 } },
    windup: { pose: { arms: 'shove_back', mouth: 'grim', fume: 0 }, shear: 0.06 },
    swing: { pose: { arms: 'shove', mouth: 'open', fume: 1 }, shear: -0.14, dx: -3 },
    strike: { pose: { arms: 'shove', mouth: 'open', fume: 0 }, shear: -0.2, dx: -4 },
    hurt: { pose: { edge: true, fume: 1 }, edge: true, dx: 2 },
    defend: { pose: { arms: 'crossed', mouth: 'grim', fume: 0 }, sx: 0.95 },
    order: { pose: { arms: 'point', mouth: 'open', fume: 1 } },
    victory: { pose: { arms: 'crossed', mouth: 'flat', brows: 'flat', fume: 0 } },
    victory2: { pose: { arms: 'crossed', mouth: 'flat', brows: 'flat', fume: 1, lift: 1 } },
    item: { pose: { arms: 'point', mouth: 'flat', fume: 0 } },
    ko: { pose: { arms: 'crossed', eyes: 'shut', fume: 0, still: true }, sy: 0.25 },
  },
};

export function paintCrewBattleFrame(appearance, poseName) {
  const L = crewLook(appearance);
  const spec = (BATTLE_POSES[L.who] ?? BATTLE_POSES.ledger)[poseName] ?? BATTLE_POSES.ledger.ready;
  const src = spec.edge ? side(L, spec.pose) : front(L, spec.pose);
  // Turned toward the enemy (a slight squash and lean), feet on the battle frame's floor line.
  return xform(src, { sx: spec.sx ?? 0.86, sy: spec.sy ?? 1, shear: (spec.shear ?? 0) - 0.05, dx: 8 + (spec.dx ?? 0), dy: 1, w: BATTLE_W, h: BATTLE_H });
}

// ---------------------------------------------------------------------------
// Portraits (48x48): the printed bust, with its cut edge

export const CREW_EXPRESSIONS = {
  ledger: ['neutral', 'happy', 'delighted', 'confused', 'thoughtful', 'worried', 'alarmed', 'proud', 'sad', 'mellow', 'sorry', 'surprised', 'determined'],
  tilda: ['neutral', 'stern', 'furious', 'annoyed', 'alarmed', 'sad', 'proud', 'mellow', 'panicked', 'soft', 'smug', 'surprised', 'determined'],
};

const P_EXPR = {
  neutral: { eyes: 'look', brows: 'up', mouth: 'o' },
  happy: { eyes: 'happy', brows: 'up', mouth: 'grin' },
  delighted: { eyes: 'happy', brows: 'up', mouth: 'open', blush: true },
  confused: { eyes: 'aside', brows: 'tilt', mouth: 'flat' },
  thoughtful: { eyes: 'up', brows: 'flat', mouth: 'flat', quill: true },
  worried: { eyes: 'look', brows: 'worried', mouth: 'wobble', sweat: true },
  alarmed: { eyes: 'wide', brows: 'up', mouth: 'o', sweat: true },
  proud: { eyes: 'look', brows: 'up', mouth: 'grin', chin: true },
  sad: { eyes: 'down', brows: 'worried', mouth: 'frown' },
  mellow: { eyes: 'lidded', brows: 'flat', mouth: 'smile', mellow: true },
  sorry: { eyes: 'down', brows: 'worried', mouth: 'flat' },
  surprised: { eyes: 'wide', brows: 'up', mouth: 'open' },
  determined: { eyes: 'narrow', brows: 'flat', mouth: 'flat' },
  // Tilda's
  stern: { eyes: 'narrow', brows: 'angry', mouth: 'grim' },
  furious: { eyes: 'narrow', brows: 'angry', mouth: 'open', steam: true },
  annoyed: { eyes: 'aside', brows: 'angry', mouth: 'flat' },
  panicked: { eyes: 'wide', brows: 'up', mouth: 'open', sweat: true },
  soft: { eyes: 'down', brows: 'flat', mouth: 'smile' },
  smug: { eyes: 'lidded', brows: 'tilt', mouth: 'smirk' },
};
const TILDA_DEFAULTS = { neutral: { eyes: 'narrow', brows: 'angry', mouth: 'flat' } };

function portraitFace(fig, e, hx, hy, { gap = 5, eyeY = 0, mouthY = 7, browInk = '#5a4a3a', heavyBrows = false }) {
  for (const x of [hx - gap, hx + gap - 1]) {
    const y = hy + eyeY;
    if (e.eyes === 'happy') { fig.line(x - 2, y + 1, x, y - 1, INK); fig.line(x, y - 1, x + 2, y + 1, INK); continue; }
    if (e.eyes === 'lidded') { fig.rect(x - 2, y, 4, 2, '#fbf6ec'); fig.hline(x - 2, x + 1, y, SKIN.d); fig.rect(x - 1, y + 1, 2, 1, INK); continue; }
    if (e.eyes === 'narrow') { fig.rect(x - 2, y, 4, 2, '#fbf6ec'); fig.rect(x - 1, y, 2, 2, INK); fig.hline(x - 2, x + 1, y - 1, INK); continue; }
    const h = e.eyes === 'wide' ? 4 : 3;
    fig.rect(x - 2, y - 1, 4, h, '#fbf6ec');
    const px = e.eyes === 'aside' ? x - 2 : x - 1;
    const py = e.eyes === 'down' ? y + 1 : e.eyes === 'up' ? y - 1 : y;
    fig.rect(px, py, 2, 2, INK);
  }
  const brow = (x, left) => {
    const y = hy + eyeY - 4;
    const ink = heavyBrows ? INK : browInk;
    const thick = heavyBrows ? 2 : 1;
    for (let t = 0; t < thick; t++) {
      if (e.brows === 'angry') fig.line(x - 3, y - 1 + t + (left ? 0 : 2), x + 2, y + 1 + t + (left ? 0 : -2), ink);
      else if (e.brows === 'worried') fig.line(x - 3, y + 1 + t + (left ? 0 : -2), x + 2, y - 1 + t + (left ? 0 : 2), ink);
      else if (e.brows === 'up') fig.hline(x - 3, x + 2, y - 2 + t, ink);
      else if (e.brows === 'tilt') fig.line(x - 3, y + (left ? 1 : -1) + t, x + 2, y + t, ink);
      else fig.hline(x - 3, x + 2, y + t, ink);
    }
  };
  brow(hx - gap, true);
  brow(hx + gap - 1, false);
  const my = hy + mouthY;
  const ink = '#7a2a2a';
  if (e.mouth === 'o') fig.ellipse(hx, my, 1.5, 1.5, '#5a1a1a');
  else if (e.mouth === 'open') { fig.rect(hx - 3, my - 1, 6, 3, '#5a1a1a'); fig.hline(hx - 2, hx + 1, my - 1, '#fbf6ec'); }
  else if (e.mouth === 'grin') { fig.hline(hx - 3, hx + 3, my, ink); fig.set(hx - 4, my - 1, ink); fig.set(hx + 4, my - 1, ink); }
  else if (e.mouth === 'frown') { fig.hline(hx - 2, hx + 2, my, ink); fig.set(hx - 3, my + 1, ink); fig.set(hx + 3, my + 1, ink); }
  else if (e.mouth === 'wobble') { for (let i = -3; i <= 3; i++) fig.set(hx + i, my + (i % 2 ? 0 : 1), ink); }
  else if (e.mouth === 'grim') { fig.hline(hx - 3, hx + 3, my, ink); fig.set(hx - 4, my + 1, ink); fig.set(hx + 4, my + 1, ink); }
  else if (e.mouth === 'smirk') { fig.hline(hx - 1, hx + 3, my, ink); fig.set(hx + 4, my - 1, ink); }
  else if (e.mouth === 'smile') { fig.hline(hx - 2, hx + 2, my, ink); fig.set(hx - 3, my - 1, ink); fig.set(hx + 3, my - 1, ink); }
  else fig.hline(hx - 2, hx + 2, my, ink);
  if (e.sweat) { fig.set(hx + 11, hy - 3, '#a8d8f0'); fig.set(hx + 11, hy - 2, '#78b0d8'); }
  if (e.blush) { fig.rect(hx - 9, hy + 3, 3, 2, '#f0a0a8'); fig.rect(hx + 6, hy + 3, 3, 2, '#f0a0a8'); }
}

function ledgerPortrait(fig, e) {
  // coat and cravat, the ledger's corner at the bottom right
  fig.ellipse(24, 52, 18, 12, L_COAT.m);
  fig.ellipse(18, 49, 8, 6, L_COAT.l);
  fig.rect(42, 40, 6, 8, L_COAT.ghost); // out of register
  fig.rect(21, 38, 6, 5, '#f0ece0');
  fig.rect(33, 38, 12, 10, BOOK.m); fig.vline(44, 39, 47, BOOK.page); fig.vline(33, 38, 47, BOOK.d);
  // the square face
  const hx = 24;
  const hy = 26 + (e.chin ? -1 : 0);
  fig.rect(hx - 11, hy - 10, 22, 21, SKIN.m);
  fig.rect(hx - 9, hy - 8, 10, 9, SKIN.l);
  fig.vline(hx + 10, hy - 10, hy + 10, SKIN.d);
  fig.hline(hx - 11, hx + 10, hy + 10, SKIN.d);
  fig.rect(hx - 13, hy - 8, 2, 8, '#8a7a6a');
  fig.rect(hx + 11, hy - 8, 2, 8, '#6a5a4a');
  portraitFace(fig, e, hx, hy, { gap: 5, eyeY: -1, mouthY: 6 });
  fig.rect(hx - 8, hy + 3, 2, 1, '#f0a0a8'); // a cheek, off by a pixel
  // the hat: an enormous tricorn, far wider than he is
  const base = hy - 10;
  for (let j = 0; j < 14; j++) {
    const half = Math.round(4 + j * 1.55);
    for (let x = hx - half; x <= hx + half - 1; x++) fig.set(x, base - 13 + j, j >= 12 ? L_HAT.d : x < hx - half + 3 ? L_HAT.l : L_HAT.m);
    fig.set(hx - half + 1, base - 12 + j, GOLD.m);
    fig.set(hx + half, base - 12 + j, GOLD.d);
  }
  fig.ellipse(hx, base - 6, 2.5, 2.5, GOLD.m);
  fig.set(hx - 1, base - 7, GOLD.l);
  if (e.quill) {
    // the quill to his chin: thinking about money
    fig.line(hx - 4, hy + 9, hx - 14, hy - 4, QUILL.m);
    fig.line(hx - 5, hy + 9, hx - 15, hy - 4, QUILL.d);
    fig.rect(hx - 6, hy + 8, 3, 3, SKIN.m);
  }
}

function tildaPortrait(fig, e) {
  // the severe coat, high collar, arms folded across the bottom
  fig.ellipse(24, 52, 20, 13, T_COAT.m);
  fig.rect(14, 36, 20, 5, T_COAT.d);
  fig.rect(6, 42, 36, 6, T_COAT.l);
  fig.hline(6, 41, 42, T_COAT.h);
  fig.rect(6, 43, 4, 3, SKIN.m); fig.rect(38, 44, 4, 3, SKIN.m);
  for (const [x, y] of [[18, 40], [29, 40]]) fig.set(x, y, GOLD.m);
  const hx = 24;
  const hy = 25 + (e.chin ? -1 : 0);
  // auburn hair, tied back
  fig.rect(hx - 12, hy - 6, 3, 12, T_HAIR.m);
  fig.rect(hx + 9, hy - 6, 3, 13, T_HAIR.d);
  // an angular face
  fig.rect(hx - 9, hy - 8, 18, 18, SKIN.m);
  fig.rect(hx - 7, hy - 6, 8, 8, SKIN.l);
  for (let k = 0; k < 4; k++) { fig.set(hx - 9 + k, hy + 9 - k + 1, 0); fig.set(hx + 8 - k, hy + 9 - k + 1, 0); }
  fig.vline(hx + 8, hy - 8, hy + 6, SKIN.d);
  portraitFace(fig, e, hx, hy, { gap: 5, eyeY: 0, mouthY: 6, heavyBrows: true });
  // the broad green hat
  const by = hy - 9;
  fig.rect(hx - 22, by - 1, 44, 4, T_HAT.m);
  fig.hline(hx - 22, hx + 21, by + 2, T_HAT.d);
  fig.hline(hx - 20, hx + 19, by - 1, T_HAT.l);
  fig.rect(hx - 11, by - 11, 22, 10, T_HAT.m);
  fig.rect(hx - 11, by - 11, 5, 10, T_HAT.l);
  fig.rect(hx - 11, by - 4, 22, 2, T_HAT.band);
  if (e.steam) for (const [x, y] of [[4, 20], [5, 17], [43, 21], [42, 18]]) fig.set(x, y, '#e8e8e8');
}

export function paintCrewPortrait(portrait, expression = 'neutral') {
  const who = portrait.who ?? 'ledger';
  const e = (who === 'tilda' ? TILDA_DEFAULTS[expression] : null) ?? P_EXPR[expression] ?? P_EXPR.neutral;
  const c = new PixelCanvas(48, 48);
  const fig = new PixelCanvas(48, 48);
  if (who === 'tilda') tildaPortrait(fig, e);
  else ledgerPortrait(fig, e);
  if (portrait.singed) {
    // the hat brim's left end burnt off, soot on the cheek, the card's corner scorched
    for (let x = 0; x < 9; x++) for (let y = 0; y < 22; y++) if (fig.alphaAt(x, y)) fig.set(x, y, x < 4 ? 0 : (x + y) % 2 ? CHAR.m : CHAR.d);
    fig.rect(13, 30, 3, 2, '#6a6a6a');
    for (let y = 40; y < 48; y++) for (let x = 0; x < 48 - y; x++) if (fig.alphaAt(x, y)) fig.set(x, y, x + y > 44 ? CHAR.l : 0);
  }
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (fig.alphaAt(x, y)) c.set(x, y, fig.get(x, y));
  c.outline(CARD.edge);
  c.outline(INK);
  // the fume that holds them together
  const fm = e.mellow || portrait.mellow ? ['#9cc070c0', '#7aa850a0'] : ['#c8d878c0', '#a8c858a0'];
  for (const [x, y] of [[3, 34], [44, 30], [6, 24], [43, 40]]) if (!c.alphaAt(x, y)) c.set(x, y, fm[(x + y) % 2]);
  return c;
}
