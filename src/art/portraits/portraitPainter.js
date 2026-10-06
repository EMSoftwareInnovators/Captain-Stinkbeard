import { PixelCanvas } from '../PixelCanvas.js';
import { PAL, rgba } from '../palette.js';
import { resolveLook, SASH, BLUE_SASH, TOY_SASH, REGALIA } from '../characters/characterPainter.js';

/**
 * 48x48 dialogue portraits built from the same appearance data as the field
 * sprites (colours, hair, beard, hat) plus portrait-only details (face shape,
 * eye colour). Expressions change brows, eyelids and mouth.
 */
export const PORTRAIT_SIZE = 48;
const CX = 24;
const OUT = PAL.ink;

/** Expression → facial feature settings. */
export const EXPRESSIONS = {
  neutral: { brow: 'flat', eye: 'normal', mouth: 'neutral' },
  annoyed: { brow: 'low', eye: 'half', mouth: 'tight' },
  angry: { brow: 'down', eye: 'narrow', mouth: 'shout' },
  surprised: { brow: 'raised', eye: 'wide', mouth: 'open' },
  concerned: { brow: 'up', eye: 'normal', mouth: 'frown' },
  happy: { brow: 'flat', eye: 'normal', mouth: 'smile' },
  laugh: { brow: 'raised', eye: 'closed', mouth: 'grin' },
  smug: { brow: 'cocked', eye: 'half', mouth: 'smirk' },
  sad: { brow: 'up', eye: 'down', mouth: 'frown' },
  determined: { brow: 'down', eye: 'normal', mouth: 'tight' },
  // Story phase 2 (Garrick and the crew's reactions to him)
  greedy: { brow: 'raised', eye: 'shine', mouth: 'grin', fx: ['sparkle'] },
  businesslike: { brow: 'cocked', eye: 'normal', mouth: 'tight' },
  delighted: { brow: 'raised', eye: 'closed', mouth: 'grin', fx: ['blush'] },
  nervous: { brow: 'up', eye: 'normal', mouth: 'wobble', fx: ['sweat'] },
  worried: { brow: 'up', eye: 'wide', mouth: 'frown', fx: ['sweat'] },
  gastro: { brow: 'up', eye: 'narrow', mouth: 'clench', fx: ['green', 'sweat', 'sweat2'] },
  terrified: { brow: 'raised', eye: 'tiny', mouth: 'open', fx: ['pale', 'sweat'] },
  relieved: { brow: 'up', eye: 'closed', mouth: 'smile', fx: ['blush'] },
  pretend: { brow: 'flat', eye: 'side', mouth: 'whistle', fx: ['sweat'] },
  offended: { brow: 'down', eye: 'half', mouth: 'pout' },
  alarmed: { brow: 'raised', eye: 'wide', mouth: 'shout' },
  disgusted: { brow: 'down', eye: 'narrow', mouth: 'wobble', fx: ['green'] },
  devastated: { brow: 'up', eye: 'down', mouth: 'frown', fx: ['tear'] },
  resigned: { brow: 'low', eye: 'half', mouth: 'neutral' },
  coughing: { brow: 'up', eye: 'closed', mouth: 'open', fx: ['green'] },
  // Story phase 3
  queasy: { brow: 'up', eye: 'tiny', mouth: 'wobble', fx: ['green', 'sweat', 'reek'] },
  puffed: { brow: 'up', eye: 'closed', mouth: 'puff', fx: ['flush'] },
  tender: { brow: 'up', eye: 'half', mouth: 'smile' },
  proud: { brow: 'raised', eye: 'closed', mouth: 'smirk', fx: ['sparkle'] },
  // Story phase 4 (a week of the Dead Center: nobody has slept)
  tired: { brow: 'low', eye: 'half', mouth: 'frown', fx: ['bags'] },
  // Story phase 8 (the Grand Nap: talking in his sleep)
  asleep: { brow: 'low', eye: 'closed', mouth: 'open', fx: ['zzz'] },
};

export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS);

const FACES = {
  square: { w: 22, jaw: 20, top: 11, chin: 36 },
  round: { w: 22, jaw: 16, top: 11, chin: 35 },
  long: { w: 19, jaw: 14, top: 10, chin: 37 },
  soft: { w: 21, jaw: 14, top: 12, chin: 35 },
  young: { w: 20, jaw: 13, top: 13, chin: 34 },
  broad: { w: 24, jaw: 21, top: 11, chin: 36 },
  jowly: { w: 25, jaw: 23, top: 12, chin: 37, jowls: true },
};

function faceShape(face) {
  // Returns [x0, x1] of the face at row y (inclusive), or null.
  return (y) => {
    if (y < face.top || y > face.chin) return null;
    const t = (y - face.top) / (face.chin - face.top);
    let half;
    if (t < 0.25) half = (face.w / 2) * Math.sqrt(1 - ((0.25 - t) / 0.25) ** 2 * 0.55);
    else if (t < 0.7) half = face.w / 2;
    else {
      const u = (t - 0.7) / 0.3;
      half = face.w / 2 - (face.w / 2 - face.jaw / 2) * u - u * u * (face.jaw / 2) * 0.55;
    }
    half = Math.max(2, half);
    return [Math.round(CX - half), Math.round(CX + half - 1)];
  };
}

function drawBust(c, L) {
  const b = L.build;
  const wide = { small: 30, medium: 36, thin: 32, stout: 40, large: 42, huge: 46 }[Object.keys({ ...b }).length ? buildName(L) : 'medium'] ?? 36;
  const coat = L.style === 'coat' || L.style === 'longcoat';
  const body = coat || L.style === 'vest' ? L.primary : L.secondary;
  const x0 = Math.round(CX - wide / 2);
  for (let y = 38; y < 48; y++) {
    const inset = Math.max(0, 41 - y);
    for (let x = x0 + inset; x < x0 + wide - inset; x++) {
      const u = (x - x0) / wide;
      let col = body[1];
      if (u < 0.12) col = body[2];
      if (u > 0.82) col = body[0];
      c.set(x, y, col);
    }
  }
  // shirt / collar opening
  const shirt = L.style === 'striped' ? L.secondary : L.secondary;
  if (coat || L.style === 'vest') {
    for (let y = 38; y < 48; y++) {
      const half = 2 + Math.floor((y - 38) / 2);
      for (let x = CX - half; x < CX + half; x++) c.set(x, y, shirt[y > 44 ? 1 : 2]);
    }
    // lapels
    for (let i = 0; i < 6; i++) {
      c.set(CX - 3 - i, 38 + i, body[2]);
      c.set(CX + 2 + i, 38 + i, body[2]);
    }
    if (L.style === 'longcoat' || L.style === 'coat') {
      c.set(CX - 6, 45, L.trim[2]);
      c.set(CX + 5, 45, L.trim[1]);
    }
  }
  if (L.style === 'striped') {
    for (let y = 40; y < 48; y += 3) for (let x = x0 + 2; x < x0 + wide - 2; x++) if (c.get(x, y)) c.set(x, y, L.primary[1]);
  }
  if (L.style === 'dress' || L.style === 'apron' || L.extras.has('apron')) {
    for (let y = 42; y < 48; y++) for (let x = CX - 8; x < CX + 8; x++) c.set(x, y, L.apron[y === 42 ? 2 : 1]);
  }
  if (L.extras.has('neckerchief')) {
    for (let y = 37; y < 42; y++) for (let x = CX - (42 - y); x < CX + (42 - y); x++) c.set(x, y, L.extraColor[1]);
  }
  if (L.extras.has('baldric')) {
    for (let i = 0; i < 12; i++) {
      c.set(CX + 10 - i, 38 + i, L.belt[1]);
      c.set(CX + 11 - i, 38 + i, L.belt[0]);
    }
    c.rect(CX + 2, 43, 3, 3, L.trim[2]);
  }
  if (L.extras.has('regalia')) drawRegaliaBust(c, L, wide);
  if (L.extras.has('stenchsash')) {
    // The Grand Stenchmaster's sash (Phase 4): mustard, burgundy edges,
    // fake-gold stitching, and the badge he embroidered himself.
    for (let i = 0; i < 12; i++) {
      const x = CX + 9 - i;
      const y = 37 + i;
      c.set(x - 1, y, SASH.edge);
      c.set(x, y, i % 3 === 0 ? SASH.gold : SASH.m);
      c.set(x + 1, y, SASH.l);
      c.set(x + 2, y, SASH.m);
      c.set(x + 3, y, SASH.d);
      c.set(x + 4, y, SASH.edge);
    }
    // the badge: a crown over a green nose
    c.hline(CX + 4, CX + 8, 39, SASH.gold);
    c.set(CX + 4, 38, SASH.gold);
    c.set(CX + 6, 38, SASH.gold);
    c.set(CX + 8, 38, SASH.gold);
    c.rect(CX + 5, 40, 3, 3, SASH.badge);
    c.set(CX + 7, 42, '#8aba40');
    c.set(CX + 5, 42, SASH.ink);
  }
  if (L.extras.has('toysash')) {
    // Story Phase 11: a Cheap-O-Rama toy sash, bright red, a little embroidered nose on it.
    for (let i = 0; i < 12; i++) {
      const x = CX + 9 - i;
      const y = 37 + i;
      c.set(x - 1, y, TOY_SASH.edge);
      c.set(x, y, i % 3 === 0 ? TOY_SASH.gold : TOY_SASH.m);
      c.set(x + 1, y, TOY_SASH.l);
      c.set(x + 2, y, TOY_SASH.m);
      c.set(x + 3, y, TOY_SASH.d);
      c.set(x + 4, y, TOY_SASH.edge);
    }
    c.rect(CX + 5, 40, 3, 2, TOY_SASH.badge);
  }
  if (L.extras.has('bluesash')) {
    // Story Phase 9: the other half of the two-pack. Sky blue, GRAND
    // SHARKMASTER daubed on it in white, the paint still a bit wet.
    for (let i = 0; i < 12; i++) {
      const x = CX + 9 - i;
      const y = 37 + i;
      c.set(x - 1, y, BLUE_SASH.edge);
      c.set(x, y, BLUE_SASH.m);
      c.set(x + 1, y, i % 2 ? BLUE_SASH.l : BLUE_SASH.badge);
      c.set(x + 2, y, i % 3 === 1 ? BLUE_SASH.badge : BLUE_SASH.m);
      c.set(x + 3, y, BLUE_SASH.d);
      c.set(x + 4, y, BLUE_SASH.edge);
    }
  }
}

/** Story Phase 5: the Grand Stenchmaster Suit at portrait scale. */
function drawRegaliaBust(c, L, wide) {
  const x0 = Math.round(CX - wide / 2);
  const x1 = x0 + wide - 1;
  // epaulettes, fringed
  for (const [ex, dir] of [[x0 + 1, 1], [x1 - 1, -1]]) {
    for (let i = 0; i < 7; i++) {
      c.set(ex + dir * i, 39, i < 2 ? REGALIA.goldL : REGALIA.gold);
      c.set(ex + dir * i, 40, REGALIA.gold);
      c.set(ex + dir * i, 41, REGALIA.goldD);
      if (i % 2 === 0) c.set(ex + dir * i, 42, REGALIA.fringe);
    }
  }
  // medals on his left breast; the last one is a bottle cap
  REGALIA.medals.forEach(([ribbon, disc], i) => {
    const mx = CX - 13 + i * 3;
    c.rect(mx, 43, 2, 2, ribbon);
    c.rect(mx, 45, 2, 2, disc);
  });
  c.rect(CX - 13, 47, 2, 1, '#c83a30');
}

/** The collar that stands up past his jowls, green-edged. */
function drawRegaliaCollar(c) {
  for (let y = 30; y <= 38; y++) {
    const k = 38 - y;
    for (const x of [CX - 11 + Math.floor(k / 3), CX - 10 + Math.floor(k / 3), CX + 9 - Math.floor(k / 3), CX + 8 - Math.floor(k / 3)]) {
      c.set(x, y, y === 30 ? REGALIA.collarEdge : (x === CX - 10 + Math.floor(k / 3) || x === CX + 8 - Math.floor(k / 3)) ? REGALIA.collarD : REGALIA.collar);
    }
  }
}

function buildName(L) {
  const w = L.build.shoulder;
  if (w <= 12) return L.build.torsoH <= 9 ? 'small' : 'thin';
  if (w <= 14) return 'medium';
  if (w <= 16) return 'stout';
  if (w <= 18) return 'large';
  return 'huge';
}

function drawNeck(c, L) {
  for (let y = 33; y < 40; y++) for (let x = CX - 5; x < CX + 5; x++) c.set(x, y, x > CX + 1 ? L.skin.d : L.skin.s);
  for (let x = CX - 5; x < CX + 5; x++) c.set(x, 34, L.skin.d);
}

function drawFace(c, L, face) {
  const row = faceShape(face);
  for (let y = face.top; y <= face.chin; y++) {
    const r = row(y);
    if (!r) continue;
    for (let x = r[0]; x <= r[1]; x++) {
      const u = (x - r[0]) / Math.max(1, r[1] - r[0]);
      let col = L.skin.s;
      if (u < 0.14 && y > face.top + 4) col = L.skin.S;
      if (u > 0.78) col = L.skin.d;
      if (y >= face.chin - 1) col = L.skin.d;
      c.set(x, y, col);
    }
  }
  // cheek highlight
  c.set(CX - 7, 27, L.skin.S);
  c.set(CX - 6, 28, L.skin.S);
  if (face.jowls) {
    // A generous double chin and heavy cheeks.
    c.hline(CX - 5, CX + 4, face.chin - 3, L.skin.d);
    c.hline(CX - 4, CX + 3, face.chin - 2, L.skin.s);
    c.set(CX - 10, 31, L.skin.d);
    c.set(CX + 9, 31, L.skin.D);
  }
  // ears
  for (const [ex, dir] of [[CX - face.w / 2 - 1, -1], [CX + face.w / 2, 1]]) {
    const x = Math.round(ex);
    c.rect(x - (dir < 0 ? 1 : 0), 22, 2, 6, dir < 0 ? L.skin.s : L.skin.d);
    c.set(x + (dir < 0 ? 0 : 0), 24, L.skin.D);
  }
}

function drawEye(c, L, x, y, kind, mirror, color) {
  const px = (dx) => (mirror ? x + 4 - dx : x + dx);
  const lid = L.skin.D;
  switch (kind) {
    case 'closed':
      c.set(px(0), y + 1, OUT);
      c.set(px(1), y, OUT); c.set(px(2), y, OUT); c.set(px(3), y, OUT);
      c.set(px(4), y + 1, OUT);
      return;
    case 'half':
      for (let i = 0; i < 5; i++) c.set(px(i), y, lid);
      for (let i = 0; i < 5; i++) c.set(px(i), y + 1, OUT);
      c.set(px(1), y + 2, '#f0ece6'); c.set(px(2), y + 2, color); c.set(px(3), y + 2, OUT); c.set(px(4), y + 2, '#f0ece6');
      return;
    case 'narrow':
      c.set(px(0), y, OUT); c.set(px(1), y, OUT);
      for (let i = 1; i < 5; i++) c.set(px(i), y + 1, OUT);
      c.set(px(1), y + 2, '#f0ece6'); c.set(px(2), y + 2, color); c.set(px(3), y + 2, OUT);
      c.set(px(4), y + 2, lid);
      return;
    case 'wide':
      for (let i = 0; i < 5; i++) c.set(px(i), y - 1, OUT);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) c.set(px(i), y + j, '#f4f0ea');
      c.set(px(2), y + 1, OUT);
      c.set(px(2), y + 2, color);
      c.set(px(0), y + 3, lid); c.set(px(4), y + 3, lid);
      return;
    case 'down':
      for (let i = 0; i < 5; i++) c.set(px(i), y, OUT);
      c.set(px(0), y + 1, '#f0ece6'); c.set(px(1), y + 1, '#f0ece6'); c.set(px(4), y + 1, '#f0ece6');
      c.set(px(2), y + 1, color); c.set(px(3), y + 1, color);
      c.set(px(2), y + 2, OUT); c.set(px(3), y + 2, OUT);
      return;
    case 'shine':
      // Wide eyes with treasure reflected in them.
      for (let i = 0; i < 5; i++) c.set(px(i), y - 1, OUT);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) c.set(px(i), y + j, '#f4f0ea');
      c.set(px(1), y + 1, color); c.set(px(2), y + 1, color); c.set(px(2), y + 2, color);
      c.set(px(1), y, PAL.gold4); c.set(px(3), y + 1, PAL.gold3); c.set(px(2), y, PAL.gold5);
      return;
    case 'tiny':
      for (let i = 0; i < 5; i++) c.set(px(i), y - 1, OUT);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) c.set(px(i), y + j, '#f8f6f0');
      c.set(px(2), y + 1, OUT);
      return;
    case 'side':
      // Looking very hard at something else.
      for (let i = 0; i < 5; i++) c.set(px(i), y, OUT);
      for (let i = 0; i < 5; i++) c.set(px(i), y + 1, '#f4f0ea');
      c.set(mirror ? px(0) : px(4), y + 1, color);
      c.set(mirror ? px(1) : px(3), y + 1, OUT);
      c.set(px(0), y + 2, lid); c.set(px(4), y + 2, lid);
      return;
    case 'normal':
    default:
      for (let i = 0; i < 5; i++) c.set(px(i), y, OUT);
      c.set(px(0), y + 1, OUT);
      c.set(px(1), y + 1, '#f4f0ea');
      c.set(px(2), y + 1, color);
      c.set(px(3), y + 1, OUT);
      c.set(px(4), y + 1, '#f4f0ea');
      c.set(px(1), y + 2, '#e0dad2');
      c.set(px(2), y + 2, color);
      c.set(px(3), y + 2, OUT);
      c.set(px(4), y + 2, lid);
      c.set(px(3), y + 1, '#ffffff');
  }
}

function drawBrow(c, x, y, kind, mirror, color, thick) {
  // Offsets per column from the outer end (0) to the inner end (5).
  const shapes = {
    flat: [0, 0, 0, 0, 0, 0],
    low: [1, 1, 1, 1, 1, 1],
    down: [-1, 0, 0, 1, 2, 2],
    up: [1, 1, 0, 0, -1, -2],
    raised: [-1, -2, -3, -3, -2, -2],
    cocked: [-2, -3, -3, -2, -1, -1],
  };
  let shape = shapes[kind] || shapes.flat;
  if (kind === 'cocked' && mirror) shape = shapes.flat;
  for (let i = 0; i < 6; i++) {
    const px = mirror ? x + 5 - i : x + i;
    const py = y + shape[i];
    c.set(px, py, color[1]);
    if (thick) c.set(px, py + 1, color[0]);
  }
}

function drawMouth(c, L, y, kind, hideLips = false) {
  const dark = L.skin.D;
  const lip = L.skin.d;
  const set = (dx, dy, col) => c.set(CX + dx, y + dy, col);
  switch (kind) {
    case 'smile':
      set(-4, -1, dark); set(3, -1, dark);
      for (let i = -3; i <= 2; i++) set(i, 0, dark);
      if (!hideLips) for (let i = -2; i <= 1; i++) set(i, 1, lip);
      break;
    case 'grin':
      for (let i = -4; i <= 3; i++) set(i, -1, dark);
      for (let i = -3; i <= 2; i++) set(i, 0, '#f8f4ec');
      for (let i = -3; i <= 2; i++) set(i, 1, dark);
      set(-4, 0, dark); set(3, 0, dark);
      for (let i = -2; i <= 1; i++) set(i, 2, PAL.red2);
      break;
    case 'open':
      for (let i = -2; i <= 1; i++) set(i, -1, dark);
      for (let j = 0; j <= 2; j++) { set(-2, j, dark); set(1, j, dark); set(-1, j, '#3a1418'); set(0, j, '#3a1418'); }
      set(-1, 2, PAL.red2); set(0, 2, PAL.red2);
      for (let i = -1; i <= 0; i++) set(i, 3, dark);
      break;
    case 'shout':
      for (let i = -4; i <= 3; i++) set(i, -1, dark);
      for (let i = -3; i <= 2; i++) set(i, 0, '#f8f4ec');
      for (let j = 1; j <= 2; j++) for (let i = -3; i <= 2; i++) set(i, j, '#3a1418');
      set(-4, 0, dark); set(3, 0, dark); set(-4, 1, dark); set(3, 1, dark);
      for (let i = -3; i <= 2; i++) set(i, 3, dark);
      break;
    case 'frown':
      set(-4, 1, dark); set(3, 1, dark);
      for (let i = -3; i <= 2; i++) set(i, 0, dark);
      break;
    case 'tight':
      for (let i = -2; i <= 1; i++) set(i, 0, dark);
      set(-3, 1, lip); set(2, 1, lip);
      break;
    case 'smirk':
      for (let i = -3; i <= 1; i++) set(i, 0, dark);
      set(2, -1, dark); set(3, -2, dark);
      break;
    case 'wobble':
      for (let i = -3; i <= 2; i++) set(i, (i + 3) % 2, dark);
      break;
    case 'clench':
      // Teeth gritted against the inevitable.
      for (let i = -4; i <= 3; i++) set(i, -1, dark);
      for (let i = -3; i <= 2; i++) set(i, 0, '#f8f4ec');
      for (let i = -3; i <= 2; i += 2) set(i, 0, '#b8b0a4');
      for (let i = -4; i <= 3; i++) set(i, 1, dark);
      break;
    case 'whistle':
      set(-1, -1, dark); set(0, -1, dark);
      set(-2, 0, dark); set(1, 0, dark); set(-1, 0, '#3a1418'); set(0, 0, '#3a1418');
      set(-1, 1, dark); set(0, 1, dark);
      break;
    case 'puff':
      // Cheeks blown out, lips pressed: holding a breath for dear life.
      for (let i = -1; i <= 0; i++) set(i, 0, dark);
      set(-2, 1, lip); set(1, 1, lip);
      for (const dx of [-8, 7]) {
        c.ellipse(CX + dx, y - 1, 3, 2.5, L.skin.S);
        c.set(CX + dx, y - 2, '#ffffff60');
      }
      break;
    case 'pout':
      for (let i = -2; i <= 1; i++) set(i, 0, dark);
      for (let i = -2; i <= 1; i++) set(i, 1, lip);
      set(-3, 1, dark); set(2, 1, dark);
      break;
    case 'neutral':
    default:
      for (let i = -3; i <= 2; i++) set(i, 0, dark);
      if (!hideLips) for (let i = -2; i <= 1; i++) set(i, 1, lip);
  }
}

/** Overlays that sell an expression: sweat, a green tinge, a blush, sparkle... */
function expressionFx(c, L, face, fx = []) {
  const row = faceShape(face);
  if (fx.includes('green') || fx.includes('pale')) {
    // A wash over the skin that deepens toward the chin (queasy / drained).
    const green = fx.includes('green');
    const tint = green ? '#8ab83a' : '#eceae4';
    const skins = [rgba(L.skin.s), rgba(L.skin.d), rgba(L.skin.S), rgba(L.skin.D)];
    for (let y = face.top; y <= face.chin; y++) {
      const r = row(y);
      if (!r) continue;
      const k = (green ? 0.12 : 0.2) + ((y - face.top) / (face.chin - face.top)) * (green ? 0.32 : 0.3);
      for (let x = r[0]; x <= r[1]; x++) if (skins.includes(c.get(x, y))) c.blend(x, y, tint, k);
    }
  }
  if (fx.includes('flush')) {
    // Red to the ears (not breathing).
    const r2 = faceShape(face);
    for (let y = face.top + 4; y <= face.chin - 4; y++) {
      const r = r2(y);
      if (!r) continue;
      for (let x = r[0]; x <= r[1]; x++) if ((x + y) % 2 === 0) c.blend(x, y, '#d84a3a', 0.25);
    }
  }
  if (fx.includes('reek')) {
    // Wavy smell lines rising off the beard.
    for (let y = 30; y < 46; y++) {
      c.set(CX - 16 + Math.round(Math.sin(y * 0.7) * 1.5), y, '#b8c84a');
      c.set(CX + 16 + Math.round(Math.sin(y * 0.7 + 2) * 1.5), y - 6, '#c8d45a');
    }
  }
  if (fx.includes('blush')) {
    c.blend(CX - 9, 29, '#e46452', 0.6); c.blend(CX - 8, 29, '#e46452', 0.6);
    c.blend(CX + 7, 29, '#e46452', 0.6); c.blend(CX + 8, 29, '#e46452', 0.6);
  }
  if (fx.includes('sweat')) {
    const x = Math.round(CX + face.w / 2) - 2;
    c.set(x, 16, '#dff4ff'); c.set(x, 17, '#9ad0f0'); c.set(x - 1, 17, '#9ad0f0'); c.set(x, 18, '#5a9ac8');
  }
  if (fx.includes('sweat2')) {
    const x = Math.round(CX - face.w / 2) + 2;
    c.set(x, 19, '#dff4ff'); c.set(x, 20, '#9ad0f0'); c.set(x, 21, '#5a9ac8');
  }
  if (fx.includes('tear')) {
    c.set(CX - 8, 26, '#9ad0f0'); c.set(CX - 8, 27, '#9ad0f0'); c.set(CX - 8, 28, '#5a9ac8');
  }
  if (fx.includes('bags')) {
    // dark rings under both eyes
    for (let i = 0; i < 4; i++) {
      c.blend(CX - 8 + i, 27, '#4a2a4a', 0.45);
      c.blend(CX + 4 + i, 27, '#4a2a4a', 0.45);
    }
    c.blend(CX - 7, 28, '#4a2a4a', 0.3);
    c.blend(CX + 5, 28, '#4a2a4a', 0.3);
  }
  if (fx.includes('zzz')) {
    // Two little Zs drifting off the top corner.
    const z = (x, y, n) => {
      c.hline(x, x + n - 1, y, '#c8d4f0');
      for (let i = 1; i < n - 1; i++) c.set(x + n - 1 - i, y + i, '#c8d4f0');
      c.hline(x, x + n - 1, y + n - 1, '#c8d4f0');
    };
    z(CX + 13, 9, 4);
    z(CX + 18, 3, 3);
  }
  if (fx.includes('sparkle')) {
    for (const [x, y] of [[CX - 15, 14], [CX + 14, 12]]) {
      c.set(x, y, PAL.gold5); c.set(x - 1, y, PAL.gold3); c.set(x + 1, y, PAL.gold3); c.set(x, y - 1, PAL.gold3); c.set(x, y + 1, PAL.gold3);
    }
  }
}


function drawNose(c, L, face, style) {
  const y0 = 24;
  if (style === 'broad') {
    c.set(CX + 1, y0, L.skin.d);
    c.set(CX + 1, y0 + 1, L.skin.d);
    c.set(CX + 2, y0 + 2, L.skin.d);
    c.set(CX - 2, y0 + 4, L.skin.D); c.set(CX + 2, y0 + 4, L.skin.D);
    c.hline(CX - 1, CX + 1, y0 + 4, L.skin.d);
    c.set(CX - 1, y0 + 3, L.skin.S);
  } else if (style === 'pointed') {
    c.vline(CX + 1, y0, y0 + 3, L.skin.d);
    c.set(CX + 2, y0 + 4, L.skin.D);
    c.set(CX, y0 + 5, L.skin.D);
    c.set(CX, y0 + 2, L.skin.S);
  } else {
    c.vline(CX + 1, y0 + 1, y0 + 3, L.skin.d);
    c.set(CX - 1, y0 + 4, L.skin.D);
    c.set(CX + 1, y0 + 4, L.skin.D);
    c.set(CX, y0 + 4, L.skin.d);
  }
}

// ---- hair, beards and hats at portrait scale -----------------------------

function hairMass(c, L, face, style) {
  const [dk, md, lt] = L.hair;
  const top = face.top - 3;
  const fill = (x, y, col) => c.set(x, y, col);
  if (style === 'combover') {
    // A shining dome crossed by three determined strands; a short fringe of
    // hair only above the ears.
    c.set(CX - 7, 14, L.skin.S); c.set(CX - 6, 13, L.skin.S); c.set(CX - 5, 13, L.skin.S);
    c.set(CX - 4, 14, '#ffffff');
    for (let i = 0; i < 3; i++) {
      const y = face.top + 1 + i * 2;
      for (let x = CX - 8 + i; x < CX + 7 - i; x++) if ((x + i) % 5 !== 0) c.set(x, y + Math.round((x - CX) * 0.12), i === 1 ? lt : md);
    }
    for (let y = face.top + 5; y < face.top + 9; y++) {
      fill(Math.round(CX - face.w / 2) - 1, y, md); fill(Math.round(CX - face.w / 2), y, lt);
      fill(Math.round(CX + face.w / 2), y, dk); fill(Math.round(CX + face.w / 2) - 1, y, md);
    }
    return;
  }
  if (style === 'bald') {
    c.set(CX - 7, 14, L.skin.S); c.set(CX - 6, 13, L.skin.S); c.set(CX - 5, 13, L.skin.S);
    // fringe of hair around the sides
    for (let y = 18; y < 25; y++) {
      fill(CX - 12, y, md); fill(CX - 11, y, dk);
      fill(CX + 11, y, dk); fill(CX + 10, y, md);
    }
    return;
  }
  const volume = { wild: 4, curly: 3, long: 2, short: 1, ponytail: 1, bun: 1, cropped: 0 }[style] ?? 1;
  // cap of hair over the skull
  for (let y = top - volume; y < face.top + 8; y++) {
    const t = (y - (top - volume)) / (face.top + 8 - (top - volume));
    const half = Math.round((face.w / 2 + volume) * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2)));
    for (let x = CX - half; x < CX + half; x++) {
      const u = (x - (CX - half)) / Math.max(1, 2 * half);
      let col = md;
      if (u < 0.25 && y < face.top + 3) col = lt;
      if (u > 0.75) col = dk;
      // leave the forehead: hairline
      if (y > face.top + 2 && Math.abs(x - CX) < face.w / 2 - 2 && style !== 'wild') continue;
      fill(x, y, col);
    }
  }
  // strand texture
  for (let x = CX - face.w / 2; x < CX + face.w / 2; x += 3) c.set(Math.round(x), face.top + 1, dk);
  if (style === 'wild' || style === 'curly') {
    for (let i = 0; i < 9; i++) {
      const x = CX - 13 + i * 3;
      const y = top - volume - 1 + (i % 2);
      c.rect(x, y, 2, 2, i % 2 ? md : lt);
    }
    for (let y = face.top + 4; y < face.top + 16; y += 3) {
      c.rect(CX - face.w / 2 - 3, y, 3, 3, md);
      c.rect(Math.round(CX + face.w / 2), y, 3, 3, dk);
    }
  }
  if (style === 'long' || style === 'ponytail') {
    const len = style === 'long' ? 20 : 8;
    for (let y = face.top + 6; y < face.top + 6 + len; y++) {
      for (let i = 0; i < 3; i++) {
        c.set(Math.round(CX - face.w / 2 - 2 + i), y, i === 0 ? lt : md);
        c.set(Math.round(CX + face.w / 2 - 1 + i), y, i === 2 ? dk : md);
      }
    }
  }
  if (style === 'bun') {
    c.ellipse(CX, top - 4, 6, 4, md);
    c.ellipse(CX - 1, top - 5, 4, 2.5, lt);
    c.ellipseOutline(CX, top - 4, 6, 4, dk);
  }
  if (style === 'cropped') {
    for (let x = CX - face.w / 2 + 1; x < CX + face.w / 2 - 1; x++) c.set(Math.round(x), face.top + 2, md);
  }
}

function beardMass(c, L, face, style, expression) {
  const [dk, md, lt] = L.beard;
  const row = faceShape(face);
  if (style === 'none') return;
  if (style === 'stubble') {
    for (let y = 27; y <= face.chin; y++) {
      const r = row(y);
      if (!r) continue;
      for (let x = r[0]; x <= r[1]; x++) if ((x + y) % 2 === 0 && (y > 31 || Math.abs(x - CX) > 5)) c.set(x, y, dk);
    }
    return;
  }
  if (style === 'mustache' || style === 'full' || style === 'great' || style === 'goatee') {
    if (style !== 'goatee') {
      // mustache
      for (let i = -6; i <= 5; i++) {
        const droop = Math.abs(i) > 3 ? 1 : 0;
        c.set(CX + i, 29 + droop, md);
        c.set(CX + i, 30 + droop, i > 2 ? dk : md);
      }
      c.hline(CX - 4, CX + 3, 29, lt);
    }
  }
  if (style === 'goatee') {
    for (let y = 32; y <= face.chin + 3; y++) for (let x = CX - 3; x < CX + 3; x++) c.set(x, y, x > CX ? dk : md);
    c.hline(CX - 4, CX + 3, 30, md);
  }
  if (style === 'full' || style === 'great') {
    const extra = style === 'great' ? 9 : 3;
    for (let y = 22; y <= face.chin + extra; y++) {
      const r = row(Math.min(y, face.chin)) || [CX - 6, CX + 5];
      let x0 = r[0] - (style === 'great' ? 2 : 0);
      let x1 = r[1] + (style === 'great' ? 2 : 0);
      if (y > face.chin) {
        const t = (y - face.chin) / extra;
        x0 = Math.round(CX - (CX - x0) * (1 - t * 0.55));
        x1 = Math.round(CX + (x1 - CX) * (1 - t * 0.55));
      }
      for (let x = x0; x <= x1; x++) {
        const side = x < r[0] + 5 || x > r[1] - 5;
        if (y < 30 && !side) continue; // cheeks stay clear above the mouth
        if (y >= 30 && y <= 33 && Math.abs(x - CX) <= 3) continue; // mouth window
        const u = (x - x0) / Math.max(1, x1 - x0);
        let col = md;
        if (u > 0.75) col = dk;
        if (u < 0.2 && y > 28) col = lt;
        if ((x * 3 + y) % 7 === 0) col = dk;
        c.set(x, y, col);
      }
    }
    if (style === 'great') {
      // braids with red ribbons
      for (const bx of [CX - 6, CX + 4]) {
        for (let y = face.chin + extra; y < face.chin + extra + 6 && y < 48; y++) {
          c.set(bx, y, md);
          c.set(bx + 1, y, (y % 2) ? dk : md);
        }
        c.rect(bx, face.chin + extra + 1, 2, 2, PAL.red3);
        c.set(bx, face.chin + extra + 1, PAL.red4);
      }
    }
  }
  if (style === 'muttonchops') {
    // Leg-of-mutton chops: thin under the ear, bushy and flaring at the jaw,
    // stopping short of the chin, which stays bare. No moustache.
    for (let y = 26; y <= 37; y++) {
      const r = row(Math.min(y, face.chin)) ?? [CX - 8, CX + 7];
      const t = (y - 26) / 11;
      const width = Math.max(2, Math.round(2 + 6 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62)));
      const flare = Math.round(t < 0.85 ? t * 4 : (1 - t) * 20);
      for (let i = 0; i < width; i++) {
        const lx = r[0] - flare + i;
        const rx = r[1] + flare - i;
        c.set(lx, y, i === 0 ? lt : x3(y, i) ? dk : md);
        c.set(rx, y, i === 0 ? dk : x3(y, i + 2) ? dk : md);
      }
    }
  }
  if (style === 'sideburns') {
    for (let y = 20; y < 31; y++) {
      const r = row(y);
      if (!r) continue;
      c.set(r[0], y, md); c.set(r[0] + 1, y, md);
      c.set(r[1], y, dk); c.set(r[1] - 1, y, md);
    }
  }
  void expression;
}

function x3(y, i) {
  return (y * 3 + i * 5) % 7 === 0;
}

function hatMass(c, L, face, style) {
  const [q, a, A] = L.hat;
  const [t, , T] = L.hatTrim;
  const top = face.top - 4;
  if (style === 'none') return;
  if (style === 'tricorn') {
    // crown
    c.ellipse(CX, top + 1, 11, 6, a);
    c.ellipse(CX - 2, top - 1, 7, 3, A);
    // brim sweeping to three corners with a gold edge
    for (let x = -18; x <= 18; x++) {
      const upturn = Math.round((Math.abs(x) / 18) ** 2 * 7);
      const frontDip = Math.round(Math.max(0, 5 - Math.abs(x) * 0.6));
      const y0 = top + 5 - upturn;
      const y1 = top + 8 - upturn + frontDip;
      for (let y = y0; y <= y1; y++) c.set(CX + x, y, y === y1 ? T : y === y1 - 1 ? t : x > 8 ? q : a);
    }
    // the characteristic skull badge (tiny)
    c.set(CX - 1, top + 2, '#f0ece0'); c.set(CX, top + 2, '#f0ece0'); c.set(CX - 1, top + 3, '#f0ece0'); c.set(CX, top + 3, '#f0ece0');
    return;
  }
  if (style === 'bandana' || style === 'kerchief') {
    const deep = style === 'kerchief' ? 3 : 0;
    for (let y = top - 1; y < face.top + 6 + deep; y++) {
      const tt = (y - (top - 1)) / (face.top + 6 + deep - (top - 1));
      const half = Math.round((face.w / 2 + 2) * Math.sqrt(Math.max(0.05, 1 - (1 - tt) ** 2)));
      for (let x = CX - half; x < CX + half; x++) {
        const u = (x - (CX - half)) / Math.max(1, 2 * half);
        let col = u < 0.3 && y < face.top ? A : u > 0.72 ? q : a;
        if ((x + y * 2) % 7 === 0 && style === 'bandana') col = '#f0e8d8';
        c.set(x, y, col);
      }
    }
    // knot on the side
    const kx = Math.round(CX + face.w / 2 + 1);
    c.rect(kx, face.top + 1, 3, 3, a);
    c.line(kx + 2, face.top + 3, kx + 5, face.top + 8, a);
    c.line(kx + 1, face.top + 4, kx + 3, face.top + 10, q);
    return;
  }
  if (style === 'knitcap') {
    for (let y = top - 4; y < face.top + 5; y++) {
      const tt = (y - (top - 4)) / (face.top + 5 - (top - 4));
      const half = Math.round((face.w / 2 + 1) * Math.sqrt(Math.max(0.05, 1 - (1 - tt) ** 2)));
      for (let x = CX - half; x < CX + half; x++) c.set(x, y, x < CX - 3 && y < face.top ? A : x > CX + 5 ? q : a);
    }
    for (let x = CX - face.w / 2 - 1; x < CX + face.w / 2 + 1; x++) {
      c.set(Math.round(x), face.top + 3, (Math.round(x) % 2) ? T : t);
      c.set(Math.round(x), face.top + 4, (Math.round(x) % 2) ? t : T);
    }
    return;
  }
  if (style === 'nightcap') {
    // A striped stocking cap flopped over to one side, with a bobble.
    for (let y = top - 3; y < face.top + 5; y++) {
      const tt = (y - (top - 3)) / (face.top + 5 - (top - 3));
      const half = Math.round((face.w / 2 + 1) * Math.sqrt(Math.max(0.05, 1 - (1 - tt) ** 2)));
      for (let x = CX - half; x < CX + half; x++) c.set(x, y, (y % 4 < 2) ? (x < CX - 3 ? A : a) : T);
    }
    // the tail flopping over the right ear, and the bobble on the end
    for (let i = 0; i < 12; i++) c.rect(CX + 6 + Math.round(i * 0.8), top - 2 + i, 4 - Math.floor(i / 5), 2, i % 4 < 2 ? a : T);
    c.ellipse(CX + 16, top + 12, 3, 3, T);
    c.ellipse(CX + 15, top + 11, 1.5, 1.5, '#ffffff');
    for (let x = CX - face.w / 2 - 1; x < CX + face.w / 2 + 1; x++) {
      c.set(Math.round(x), face.top + 3, (Math.round(x) % 2) ? T : t);
      c.set(Math.round(x), face.top + 4, (Math.round(x) % 2) ? t : T);
    }
    return;
  }
  if (style === 'pot') {
    // An iron cooking pot, upside down on the head, handle out to one side.
    const dent = L.battered;
    c.ellipse(CX, top - 1, 12, 9, a);
    c.ellipse(CX - 4, top - 4, 5, 3, A);
    if (dent) c.ellipse(CX + 4, top - 6, 3, 2, q);
    for (let x = -14; x <= 14; x++) {
      c.set(CX + x, top + 6, T);
      c.set(CX + x, top + 7, t);
    }
    c.rect(CX + 14, top, 7, 2, t);
    c.rect(CX + 19, top - 2, 2, 4, t);
    c.set(CX - 6, top - 5, '#ffffff50');
    return;
  }
  if (style === 'stenchhat') {
    // The Grand Stenchmaster's ceremonial hat (Phase 5): a tall crooked
    // burgundy crown, a band of that green, a cream badge, a limp green puff.
    for (let y = top - 7; y <= top + 3; y++) {
      const lean = Math.round((top + 3 - y) * 0.3);
      const x0 = CX - 7 + lean;
      for (let x = x0; x < x0 + 14; x++) c.set(x, y, x === x0 ? A : x >= x0 + 12 ? q : a);
    }
    c.rect(CX - 7, top - 1, 14, 3, T);
    c.hline(CX - 7, CX + 6, top + 1, t);
    c.ellipse(CX + 2, top - 4, 3, 2, '#f0e8d8');
    c.set(CX + 2, top - 4, '#c8a030');
    c.ellipse(CX + 1, top - 8, 4, 2, T);
    c.ellipse(CX - 2, top - 8, 3, 2, T);
    c.set(CX, top - 10, t);
    c.rect(CX - 14, top + 3, 28, 3, a);
    c.hline(CX - 14, CX + 13, top + 5, q);
    return;
  }
  if (style === 'grandcrown') {
    // Story Phase 8: the Grand Stenchmaster's Grand Crown, made from whatever
    // was in reach: fake-gold points with bilious jewels, a band of bottle
    // caps and painted onions, a fork and a spoon jammed in the sides, a
    // tiny saucepan on top, a tassel. No letters anywhere.
    const silver = '#c8ccd4';
    const silverD = '#7a7e88';
    const t0 = Math.max(5, top);
    c.rect(CX - 12, t0 - 1, 24, 5, a);
    c.hline(CX - 12, CX + 11, t0 - 1, A);
    c.hline(CX - 12, CX + 11, t0 + 3, q);
    for (const i of [-9, -3, 3, 9]) {
      c.ellipse(CX + i, t0 + 1, 1.6, 1.6, silver);
      c.set(CX + i, t0 + 1, i % 2 ? '#c83a2a' : '#3a6ad0');
    }
    for (const i of [-6, 6]) c.set(CX + i, t0 + 1, '#8a4ac8');
    for (const [px, h] of [[-9, 4], [-4, 5], [4, 5], [9, 4]]) {
      for (let y = 0; y < h; y++) {
        const w = y < 2 ? 1 : 0;
        c.hline(CX + px - w, CX + px + w, t0 - 2 - y, y % 2 ? a : A);
      }
      c.set(CX + px, t0 - 2 - h, T);
    }
    // the saucepan
    c.rect(CX - 3, t0 - 6, 6, 3, silverD);
    c.hline(CX - 3, CX + 2, t0 - 6, silver);
    c.hline(CX + 3, CX + 6, t0 - 5, '#5a3a20');
    // fork (left) and spoon (right) jammed into the band
    for (const dx of [0, 2, 4]) c.vline(CX - 16 + dx, t0 - 6, t0 - 2, silver);
    c.hline(CX - 16, CX - 12, t0 - 1, silverD);
    c.ellipse(CX + 15, t0 - 4, 2, 3, silver);
    c.vline(CX + 15, t0 - 1, t0 + 2, silverD);
    // a tassel off the left side
    c.vline(CX - 13, t0 + 3, t0 + 8, T);
    c.set(CX - 14, t0 + 8, t);
    c.set(CX - 12, t0 + 8, t);
    return;
  }
  if (style === 'explorer') {
    // Story Phase 8: a dented cork sun-helmet out of the costume trunk, with a
    // patch on it and a cloth band (a dome, not a brimmed felt hat).
    c.ellipse(CX, top - 1, 11, 8, a);
    c.ellipse(CX - 4, top - 4, 5, 3, A);
    c.ellipse(CX + 3, top - 7, 2, 1, q); // the dent
    c.rect(CX + 4, top - 3, 4, 3, '#b8a070'); // the patch
    c.set(CX + 4, top - 3, q);
    c.set(CX + 7, top - 1, q);
    c.rect(CX - 11, top + 2, 22, 2, T);
    c.hline(CX - 11, CX + 10, top + 3, t);
    c.ellipse(CX, top + 5, 16, 2, a);
    c.hline(CX - 15, CX + 14, top + 6, q);
    return;
  }
  if (style === 'tophat') {
    c.rect(CX - 8, top - 10, 16, 14, a);
    c.vline(CX - 8, top - 10, top + 3, A);
    c.vline(CX + 7, top - 10, top + 3, q);
    c.rect(CX - 8, top, 16, 2, T);
    c.rect(CX - 14, top + 4, 28, 3, a);
    c.hline(CX - 14, CX + 13, top + 6, q);
  }
}

function accessories(c, L, face, expression) {
  if (L.extras.has('spectacles')) {
    const g = PAL.gold3;
    c.strokeRect(CX - 10, 21, 7, 6, g);
    c.strokeRect(CX + 3, 21, 7, 6, g);
    c.hline(CX - 3, CX + 2, 22, g);
    c.set(CX - 9, 22, '#ffffff80');
    c.set(CX + 4, 22, '#ffffff80');
  }
  if (L.extras.has('eyepatch')) {
    c.rect(CX + 3, 21, 6, 5, OUT);
    c.line(CX - 12, 16, CX + 12, 20, OUT);
  }
  if (L.extras.has('earring')) c.set(Math.round(CX + face.w / 2 + 1), 28, PAL.gold4);
  if (L.extras.has('monocle')) {
    // Brass appraiser's monocle over the right eye, chain down to the coat.
    c.ellipseOutline(CX + 7, 23, 5, 5, PAL.gold3);
    c.set(CX + 4, 20, '#ffffff90');
    c.set(CX + 5, 20, '#ffffff60');
    c.set(CX + 11, 26, PAL.gold2);
    c.line(CX + 11, 27, CX + 13, 40, PAL.gold3);
    c.line(CX + 13, 40, CX + 10, 46, PAL.gold2);
  }
  if (L.extras.has('goggles')) {
    // Story Phase 12: bottle-bottom goggles on a leather strap.
    c.hline(CX - 16, CX + 15, 22, PAL.lea2);
    for (const gx of [CX - 7, CX + 7]) {
      c.ellipse(gx, 23, 5, 5, '#2a6a3a');
      c.ellipse(gx, 23, 3.5, 3.5, '#6ac868');
      c.set(gx - 2, 21, '#e8fff0');
      c.set(gx - 1, 21, '#e8fff0');
    }
  }
  if (L.extras.has('beardwrap')) {
    // Story Phase 12: a clean cloth wrapped round the beard (so it can't come up under the nose).
    for (let y = 35; y <= 44; y++) for (let x = CX - 10; x <= CX + 9; x++) if (c.alphaAt(x, y)) c.set(x, y, y % 4 === 0 ? '#a8b0b8' : (x + y) % 5 === 0 ? '#f4f8fa' : '#d8dee4');
  }
  if (L.extras.has('blush')) {
    // Story Phase 13: blushing (Brogath the Bashful, in the captain's eyes).
    c.rect(CX - 13, 27, 4, 2, '#f08a9a');
    c.rect(CX + 9, 27, 4, 2, '#f08a9a');
  }
  if (L.extras.has('crownstack')) {
    // Story Phase 13: a crown made of crowns (the Grand Stenchmaster Prime, in the captain's eyes).
    for (const [y, w] of [[2, 18], [-2, 14], [-5, 10]]) {
      c.rect(CX - w / 2, y, w, 4, PAL.gold3);
      c.hline(CX - w / 2, CX + w / 2 - 1, y + 3, PAL.gold1);
      for (let x = CX - w / 2; x < CX + w / 2; x += 3) c.set(x, y - 1, PAL.gold4);
    }
  }
  if (L.extras.has('facecloth')) {
    for (let y = 27; y <= 36; y++) for (let x = CX - 11; x <= CX + 10; x++) c.set(x, y, y === 27 ? '#c8d6dc' : x > CX + 5 ? '#6a7c86' : '#9aaab2');
    c.hline(CX - 12, CX + 11, 27, '#c8d6dc');
    for (let x = CX - 9; x < CX + 8; x += 4) c.set(x, 31, '#dfeef4');
  }
  if (L.extras.has('sockmask')) {
    for (let y = 26; y <= 33; y++) for (let x = CX - 11; x <= CX + 10; x++) c.set(x, y, (x + y) % 4 === 0 ? '#c83a30' : y === 26 ? '#f4ece0' : '#e0d8c8');
    // the toe, flopping
    c.ellipse(CX + 12, 36, 3, 4, '#e0d8c8');
    c.set(CX + 12, 38, '#c83a30');
  }
  if (L.extras.has('bottlemask')) {
    c.rect(CX - 7, 26, 14, 9, '#4a7a3a');
    c.rect(CX - 5, 27, 4, 6, '#8ab870');
    c.rect(CX - 2, 35, 4, 5, '#3a6a2a');
    c.rect(CX - 3, 39, 6, 2, '#6a4a2a');
    c.hline(CX - 13, CX - 8, 29, PAL.lea2);
    c.hline(CX + 7, CX + 12, 29, PAL.lea2);
  }
  if (L.extras.has('waxnose')) {
    c.rect(CX - 2, 28, 2, 2, '#f4ecc8');
    c.rect(CX + 1, 28, 2, 2, '#f4ecc8');
  }
  if (L.cloak) {
    // The curtain over his shoulders, the tie-back cord across the chest.
    for (let y = 38; y < 48; y++) {
      for (let x = 0; x < 48; x++) {
        const edge = Math.abs(x - CX);
        if (edge > 13 - Math.max(0, 41 - y) && edge < 24) c.set(x, y, (x % 4 === 1) ? L.cloak[0] : L.cloak[1]);
      }
    }
    c.hline(CX - 8, CX + 7, 41, PAL.gold3);
    c.set(CX + 7, 42, PAL.gold4);
    c.set(CX + 7, 43, PAL.gold2);
  }
  if (L.battered) {
    for (const [x, y] of [[CX - 9, 18], [CX + 12, 24], [CX - 13, 30]]) {
      c.set(x, y, '#9bd3e6');
      c.set(x, y + 1, '#5a9ac8');
    }
  }
  if (L.extras.has('pipe')) {
    c.line(CX + 3, 32, CX + 9, 35, PAL.lea2);
    c.rect(CX + 9, 32, 3, 4, PAL.lea3);
    c.set(CX + 10, 31, '#ffffff60');
    void expression;
  }
}

/**
 * @param {object} appearance - data/appearances entry
 * @param {object} portrait   - data/portraits entry (face, nose, eyeColor, brows)
 * @param {string} expression - key of EXPRESSIONS
 */
export function paintPortrait(appearance, portrait, expression = 'neutral') {
  const L = resolveLook(appearance);
  const face = FACES[portrait.face || 'square'];
  const feat = EXPRESSIONS[expression] || EXPRESSIONS.neutral;
  const c = new PixelCanvas(PORTRAIT_SIZE, PORTRAIT_SIZE);
  const eyeColor = portrait.eyeColor || '#3a2a1c';

  drawBust(c, L);
  drawNeck(c, L);
  if (L.extras.has('regalia')) drawRegaliaCollar(c);
  drawFace(c, L, face);
  if (L.hairStyle === 'long' || L.hairStyle === 'wild') hairMass(c, L, face, L.hairStyle);
  drawNose(c, L, face, portrait.nose);
  const eyeY = 22 + (portrait.eyeDy || 0);
  drawEye(c, L, CX - 10, eyeY, feat.eye, false, eyeColor);
  drawEye(c, L, CX + 5, eyeY, feat.eye, true, eyeColor);
  const browColor = [L.hair[0], portrait.browColor || L.hair[1]];
  const thick = portrait.brows === 'heavy';
  drawBrow(c, CX - 11, eyeY - 4, feat.brow, false, browColor, thick);
  drawBrow(c, CX + 5, eyeY - 4, feat.brow, true, browColor, thick);
  const mouthY = 32 + (portrait.mouthDy || 0);
  const bushy = L.beardStyle === 'great' || L.beardStyle === 'full';
  if (!bushy) drawMouth(c, L, mouthY, feat.mouth);
  beardMass(c, L, face, L.beardStyle, expression);
  if (bushy) drawMouth(c, L, mouthY, feat.mouth, true);
  if (L.hairStyle !== 'long' && L.hairStyle !== 'wild') hairMass(c, L, face, L.hatStyle !== 'none' && L.hairStyle !== 'bald' && L.hairStyle !== 'combover' ? 'cropped' : L.hairStyle);
  else if (L.hatStyle === 'none') hairMass(c, L, face, L.hairStyle);
  hatMass(c, L, face, L.hatStyle);
  accessories(c, L, face, expression);
  expressionFx(c, L, face, feat.fx);
  if (portrait.age === 'old') {
    c.set(CX - 12, 25, L.skin.d); c.set(CX + 11, 25, L.skin.d);
    c.hline(CX - 4, CX - 2, 18, L.skin.d);
  }
  if (portrait.scar) {
    c.line(CX + 5, 17, CX + 9, 27, L.skin.D);
  }
  c.outline(OUT);
  return c;
}
