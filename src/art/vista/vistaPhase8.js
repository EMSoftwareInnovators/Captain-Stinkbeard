import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { drawText } from '../font/drawText.js';
import { SES_SCREEN, rng } from './sesArt.js';
import { CRT, crt, screen, franklin, desk } from './vistaPhase6.js';
import { SASH } from '../characters/characterPainter.js';
import { addLegendFrames, LEGEND_FRAMES } from './vistaLegend.js';

/**
 * Vista art for Story Phase 8 (trapped below with Franklin; the Grand Nap):
 *
 *   - New Frog Tax Man pictures: the Auditor (a stern old toad with a
 *     magnifying glass), a jar of flies filed as OFFICE REFRESHMENTS, the
 *     flies in little name tags (NETWORKING EXPENSES), receipts written on
 *     lily leaves, tadpole subcontractors in hard hats, a lily pad SOLD for
 *     more than it cost, and the one word that frightens everyone: BASIS?
 *   - The old sleeping quarters, through the crack of the door: hammocks
 *     you can only half see, blankets gone the colour of mustard, the walls
 *     sweating, vapour rising out of the floorboards. Nobody goes in.
 *   - The captain's bunk at night, from his pillow: the Grand Stenchmaster's
 *     enormous hammock sagging directly overhead (crowned, or not), the sash
 *     tucked in, then hanging, then in his face; the crown, its fork, its
 *     spoon and its saucepan as separate pieces so they can fall; Squawks in
 *     his little cradle; the captain's face, awake and appalled.
 *   - The bedtime story's pictures are in vistaLegend.js.
 */
const W = SES_SCREEN.w;
const H = SES_SCREEN.h;
const INK = PAL.ink;

// --- The Frog Tax Man, this week ------------------------------------------------

/** The Auditor: a big stern toad in a bow tie, magnifying glass up. */
function auditor(c, x, y, { glass = true, mouth = 'shut' } = {}) {
  c.rect(x - 12, y + 14, 24, 20, CRT[2]);
  c.poly([[x - 3, y + 14], [x + 3, y + 14], [x, y + 18]], CRT[7]);
  c.rect(x - 4, y + 15, 8, 2, CRT[0]); // the bow tie
  c.ellipse(x, y + 6, 15, 9, CRT[3]);
  c.ellipse(x, y + 8, 12, 5, CRT[4]);
  for (const [wx, wy] of [[-9, 2], [7, 4], [-3, 10], [10, 9]]) c.set(x + wx, y + wy, CRT[1]); // warts
  for (const ex of [-7, 7]) {
    c.ellipse(x + ex, y - 1, 4, 4, CRT[3]);
    c.ellipse(x + ex, y, 2, 2, CRT[7]);
    c.set(x + ex, y, CRT[0]);
    c.hline(x + ex - 4, x + ex + 3, y - 4, CRT[0]); // heavy brows
  }
  if (mouth === 'shut') c.hline(x - 8, x + 8, y + 10, CRT[0]);
  else c.ellipse(x, y + 10, 6, 2, CRT[0]);
  if (glass) {
    c.thickLine(x + 14, y + 20, x + 20, y + 8, 2, CRT[5]);
    c.ellipseOutline(x + 21, y + 4, 6, 6, CRT[7]);
    c.ellipse(x + 21, y + 4, 4, 4, CRT[2]);
    c.ellipse(x + 20, y + 3, 1, 1, CRT[7]);
  }
}

function ftmAudit(f) {
  const c = screen(CRT[1]);
  desk(c, 58, { papers: 3 });
  auditor(c, 30, 18 - f, { mouth: f ? 'open' : 'shut' });
  c.rect(58, 8, 42, 12, CRT[7]);
  drawText(c, 'AUDIT', 79, 10, CRT[1], { center: true });
  franklin(c, 80, 30, { s: 0.75, mouth: 'shut', sweat: true });
  return crt(c, f);
}

function ftmRefresh(f) {
  const c = screen(CRT[1]);
  // the jar, the flies, and what Franklin has written on the label
  c.rect(12, 8, 34, 42, CRT[3]);
  c.strokeRect(12, 8, 34, 42, CRT[6]);
  c.rect(10, 4, 38, 5, CRT[2]);
  const r = rng(808 + f);
  for (let i = 0; i < 60; i++) c.set(14 + Math.floor(r() * 30), 11 + Math.floor(r() * 37), CRT[0]);
  c.rect(4, 53, 96, 22, CRT[7]);
  drawText(c, 'OFFICE', 52, 54, CRT[1], { center: true });
  drawText(c, 'REFRESHMENTS', 52, 64, CRT[1], { center: true });
  franklin(c, 76, 12, { s: 0.8, mouth: f ? 'open' : 'shut', sweat: !!f });
  return crt(c, f);
}

function ftmNetwork(f) {
  const c = screen(CRT[2]);
  // flies at a reception, in name tags; Franklin shaking hands with one
  const r = rng(909);
  for (let i = 0; i < 9; i++) {
    const fx = 8 + Math.floor(r() * 88);
    const fy = 30 + Math.floor(r() * 30) + (i % 2 ? f : -f);
    c.ellipse(fx, fy, 2, 1, CRT[0]);
    c.set(fx - 1, fy - 2, CRT[6]);
    c.set(fx + 1, fy - 2, CRT[6]);
    c.rect(fx - 2, fy + 2, 5, 2, CRT[7]); // a name tag
  }
  c.rect(18, 2, 68, 22, CRT[7]);
  drawText(c, 'NETWORKING', 52, 3, CRT[1], { center: true });
  drawText(c, 'EXPENSES', 52, 13, CRT[1], { center: true });
  franklin(c, 52, 42, { s: 0.7, mouth: 'open' });
  return crt(c, f);
}

function ftmLeaves(f) {
  const c = screen(CRT[1]);
  // receipts written on lily leaves; tadpole subcontractors in hard hats
  for (const [lx, ly] of [[22, 22], [52, 16], [80, 26]]) {
    c.ellipse(lx, ly, 13, 9, CRT[4]);
    c.line(lx, ly, lx + 9, ly - 6, CRT[2]);
    for (let k = -1; k <= 1; k++) c.hline(lx - 7, lx + 5, ly + k * 3, CRT[6]);
  }
  for (let i = 0; i < 4; i++) {
    const tx = 16 + i * 24 + (i % 2 ? f * 2 : -f * 2);
    c.ellipse(tx, 58, 4, 3, CRT[5]);
    c.thickLine(tx + 3, 58, tx + 11, 60 + (i % 2), 2, CRT[5]);
    c.rect(tx - 4, 52, 8, 3, CRT[7]); // the hard hat
    c.set(tx - 1, 57, CRT[0]);
  }
  drawText(c, 'SUBCONTRACTORS', 52, 68, CRT[7], { center: true });
  return crt(c, f);
}

function ftmLilypad(f) {
  const c = screen(CRT[2]);
  c.ellipse(52, 56, 34, 10, CRT[4]);
  c.line(52, 56, 74, 50, CRT[2]);
  c.rect(30, 10, 44, 14, CRT[7]);
  drawText(c, 'SOLD!', 52, 13, CRT[1], { center: true });
  c.vline(52, 24, 50, CRT[5]);
  // bought for 3, sold for 9, an arrow going up
  drawText(c, '3', 14, 30, CRT[6], { center: true });
  drawText(c, '9', 90, 18 - f, CRT[7], { center: true });
  c.thickLine(20, 36, 84, 26 - f, 2, CRT[6]);
  c.poly([[84, 22 - f], [90, 27 - f], [82, 30 - f]], CRT[6]);
  franklin(c, 22, 44, { s: 0.55, mouth: 'open' });
  return crt(c, f);
}

function ftmBasis(f) {
  const c = screen(CRT[0]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - 52) / 50, (y - 40) / 40);
    if (d < 1) c.blend(x, y, CRT[2], (1 - d) * 0.9);
  }
  drawText(c, 'BASIS?', 52, 8 + f, CRT[7], { center: true, scale: 2, shadow: CRT[3] });
  franklin(c, 52, 34, { s: 0.9, mouth: 'open', sweat: true });
  return crt(c, f + 3);
}

// --- The old sleeping quarters, through the crack of the door ---------------------

/** The galley side: the door, boarded later, and the light coming round it now. */
function quartersDoor() {
  const c = new PixelCanvas(320, 224);
  c.fill('#140c06');
  for (let y = 0; y < 224; y += 8) {
    c.rect(0, y, 320, 7, y % 16 ? '#2a1c10' : '#2e2012');
    c.hline(0, 319, y + 7, '#120a04');
  }
  // the frame
  c.rect(108, 18, 104, 196, '#3a2814');
  c.rect(116, 26, 88, 188, '#0a0604');
  // a yellow glow round the edges of the door, from inside
  for (let y = 26; y < 214; y++) {
    c.blend(116, y, '#e8d870', 0.5);
    c.blend(203, y, '#e8d870', 0.5);
  }
  c.hline(116, 203, 213, '#f0e080');
  // the warning on the lintel, in Garrick's crayon
  drawText(c, 'QUARTERS', 160, 6, '#c8a030', { center: true, jitter: 1 });
  return c;
}

/** The door panel itself (it opens a crack: the layer slides). */
function quartersPanel() {
  const c = new PixelCanvas(88, 188);
  c.fill('#5a3a1e');
  for (const x of [0, 22, 44, 66]) {
    c.vline(x, 0, 187, '#3a2412');
    c.vline(x + 1, 0, 187, '#7a5230');
  }
  for (const y of [30, 150]) c.rect(4, y, 80, 6, '#3a2412');
  c.ellipse(78, 98, 3, 3, '#c8a030');
  c.strokeRect(0, 0, 88, 188, INK);
  return c;
}

/** Inside: the second cloud took up residence. */
function quartersInside(f) {
  const c = new PixelCanvas(320, 224);
  c.fill('#3a3410');
  // the walls, sweating
  for (let y = 0; y < 224; y += 9) c.hline(0, 319, y, '#2a2608');
  const r = rng(4242);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(r() * 320);
    const y0 = Math.floor(r() * 120);
    c.vline(x, y0, y0 + 4 + Math.floor(r() * 10), '#8a8a30');
  }
  // hammocks, half seen; blankets the colour of mustard, hanging off them
  for (const [hx, hy] of [[40, 70], [150, 54], [250, 76], [96, 120], [210, 126]]) {
    for (let x = hx - 36; x < hx + 36; x++) {
      const sag = Math.round(Math.sin(((x - hx + 36) / 72) * Math.PI) * 10);
      c.vline(x, hy + sag, hy + sag + 4, '#8a7a30');
    }
    c.rect(hx - 10, hy + 10, 18, 18 + ((hx * 7) % 12), '#b8a030');
    c.vline(hx - 10, hy + 10, hy + 30, '#6a5a18');
  }
  // the floorboards, and the vapour coming up out of them
  c.rect(0, 180, 320, 44, '#4a3e14');
  for (let x = 0; x < 320; x += 20) c.vline(x, 180, 223, '#2a2408');
  for (let i = 0; i < 9; i++) {
    const vx = 20 + i * 36 + (f ? 4 : 0);
    for (let k = 0; k < 40; k++) c.blend(vx + Math.round(Math.sin((k + f * 3) * 0.3) * 4), 180 - k, '#f0e070', 0.35 - k * 0.008);
  }
  // the haze over all of it
  for (let y = 0; y < 224; y++) for (let x = 0; x < 320; x++) if ((x + y + f) % 3 === 0) c.blend(x, y, '#e8d860', 0.18);
  return c;
}

// --- The captain's bunk at night ---------------------------------------------------

/** The view from the captain's pillow: beams, a lantern turned low, other hammocks in the dark. */
function bunkBg() {
  const c = new PixelCanvas(320, 224);
  c.fill('#0c0a10');
  for (const by of [0, 22]) {
    c.rect(0, by, 320, 12, '#1e1610');
    c.hline(0, 319, by + 11, '#0e0a06');
  }
  for (let k = 0; k < 5; k++) c.thickLine(30 + k * 66, 34, 40 + k * 66, 224, 5, '#161008');
  // other people's hammocks in the gloom, someone's foot over the edge
  for (const [hx, hy] of [[40, 120], [270, 110]]) {
    for (let x = hx - 30; x < hx + 30; x++) {
      const sag = Math.round(Math.sin(((x - hx + 30) / 60) * Math.PI) * 8);
      c.vline(x, hy + sag, hy + sag + 5, '#2a2430');
    }
  }
  c.ellipse(292, 124, 3, 2, '#3a2a28');
  // the lantern, turned right down
  c.rect(152, 36, 10, 14, '#3a3020');
  c.rect(154, 39, 6, 8, '#a87830');
  for (let y = 30; y < 140; y++) for (let x = 90; x < 230; x++) {
    const d = Math.hypot((x - 157) / 70, (y - 44) / 60);
    if (d < 1) c.blend(x, y, '#ffb050', (1 - d) * 0.12);
  }
  // the captain's own hammock edge, across the bottom of the picture
  for (let x = 0; x < 320; x++) {
    const lift = Math.round(Math.sin((x / 320) * Math.PI) * -10);
    c.vline(x, 198 + lift, 223, '#4a4a58');
    c.set(x, 198 + lift, '#6a6a7a');
  }
  // the blanket, the captain's tricorn hung on the post
  c.poly([[20, 190], [300, 186], [320, 224], [0, 224]], '#3a3448');
  c.poly([[292, 70], [312, 64], [318, 76], [296, 80]], '#1a1a24');
  return c;
}

/** The Grand Stenchmaster's hammock overhead, sagging. `crown`: whether he's still wearing it. */
function bunkGarrick(f, { crown = true } = {}) {
  const c = new PixelCanvas(300, 120);
  const breathe = f ? 3 : 0;
  // ropes up into the dark; the spreader plank
  for (const [x0, x1] of [[10, 0], [290, 299], [60, 20], [240, 280]]) c.thickLine(x0, 26, x1, 0, 2, '#a67c3e');
  c.thickLine(10, 24, 290, 24, 3, '#6a4a2a');
  // the canvas, sagging under him
  for (let x = 10; x < 290; x++) {
    const sag = Math.round(Math.sin(((x - 10) / 280) * Math.PI) * (46 + breathe));
    c.vline(x, 26 + sag, 34 + sag, '#521828');
    c.set(x, 26 + sag, '#74283a');
    c.set(x, 34 + sag, '#2e0c18');
  }
  // what bulges through: him (seen from below), the epaulette fringe hanging over the edge
  c.ellipse(150, 70 + breathe, 70, 14, '#3a1020');
  for (let x = 92; x < 112; x += 2) c.vline(x, 64, 70 + (x % 4), '#c8982a');
  // one boot over the far end, one glove over the near edge
  c.rect(266, 46, 14, 10, '#3a2a18');
  c.ellipse(44, 44, 7, 5, '#e8dcb0');
  // his face, over the near edge, upside down to us, asleep: sideburns, open mouth
  c.ellipse(70, 46, 16, 12, '#dc9c76');
  c.ellipse(70, 50, 13, 6, '#c85236');
  c.ellipse(70, 44, 4, 3 + (f ? 1 : 0), '#3a1418');
  c.hline(62, 66, 38, INK);
  c.hline(74, 78, 38, INK);
  if (crown) {
    c.rect(56, 22, 28, 9, '#c8a030');
    for (const px of [58, 66, 74, 82]) c.poly([[px - 3, 22], [px, 14], [px + 3, 22]], '#c8a030');
    for (const [jx, jc] of [[60, '#6a9a24'], [70, '#c83a2a'], [80, '#3a6ad0']]) c.ellipse(jx, 26, 2, 2, jc);
  }
  c.outline(INK);
  return c;
}

/** The sash: tucked in (0), slipping and hanging (1), in his face (2). */
function bunkSash(stage) {
  const c = new PixelCanvas(40, 120);
  const len = [14, 70, 108][stage];
  const sway = stage === 1 ? 3 : 0;
  for (let y = 0; y < len; y++) {
    const x = 14 + Math.round(Math.sin(y * 0.06) * sway);
    c.hline(x, x + 10, y, SASH.m);
    c.set(x, y, SASH.edge);
    c.set(x + 11, y, SASH.edge);
    if (y % 9 === 4) c.hline(x + 2, x + 8, y, SASH.l);
  }
  c.hline(14, 26, len, SASH.gold);
  for (let x = 15; x < 26; x += 2) c.vline(x, len, len + 4, SASH.gold); // the fringe
  c.outline(INK);
  return c;
}

/** The pieces of the Grand Crown that come down (each can fall on its own). */
function crownPiece(kind) {
  if (kind === 'crown') {
    const c = new PixelCanvas(40, 26);
    c.rect(4, 12, 32, 10, '#c8a030');
    for (const px of [8, 16, 24, 32]) c.poly([[px - 4, 12], [px, 2], [px + 4, 12]], '#c8a030');
    for (const [jx, jc] of [[10, '#6a9a24'], [20, '#c83a2a'], [30, '#3a6ad0']]) c.ellipse(jx, 17, 2, 2, jc);
    for (const bx of [6, 15, 25, 34]) c.set(bx, 21, '#c8ccd4');
    c.outline(INK);
    return c;
  }
  if (kind === 'fork') {
    const c = new PixelCanvas(12, 34);
    c.rect(5, 12, 2, 22, '#a8acb8');
    for (const tx of [3, 5, 7]) c.vline(tx + (tx === 7 ? 1 : 0), 0, 12, '#d8dce4');
    c.hline(3, 8, 12, '#a8acb8');
    c.outline(INK);
    return c;
  }
  if (kind === 'spoon') {
    const c = new PixelCanvas(12, 30);
    c.ellipse(6, 6, 4, 6, '#d8dce4');
    c.ellipse(5, 5, 1, 2, '#ffffff');
    c.rect(5, 12, 2, 18, '#a8acb8');
    c.outline(INK);
    return c;
  }
  // the little saucepan off the top
  const c = new PixelCanvas(30, 16);
  c.rect(4, 4, 16, 9, '#8a8e98');
  c.hline(4, 19, 4, '#c8ccd4');
  c.rect(20, 6, 9, 2, '#5a3a20');
  c.outline(INK);
  return c;
}

/** The captain, from his own pillow: just the top of his face and beard, and how he feels. */
function captainFace(mood) {
  const c = new PixelCanvas(90, 50);
  c.ellipse(45, 40, 34, 16, '#121018'); // the beard (it reeks)
  c.ellipse(45, 26, 24, 16, '#c08060');
  const eyes = { open: 4, glare: 2, wide: 6, shut: 0 }[mood] ?? 4;
  for (const ex of [33, 57]) {
    if (eyes) {
      c.ellipse(ex, 24, 5, Math.max(1, eyes / 2), '#f0ece6');
      c.ellipse(ex, 24, 2, Math.max(1, eyes / 2), '#2a1a10');
    } else c.hline(ex - 4, ex + 4, 24, INK);
    if (mood === 'glare') c.line(ex - 6, 18 + (ex < 45 ? 0 : 2), ex + 6, 18 + (ex < 45 ? 2 : 0), INK);
  }
  if (mood === 'wide') c.ellipse(45, 36, 5, 4, '#3a1418');
  c.poly([[16, 14], [74, 14], [84, 4], [6, 4]], '#1a1a24'); // his hat brim: he sleeps in it
  for (let i = 0; i < 6; i++) c.set(20 + i * 10, 46 + (i % 2), '#8a9a40'); // the beard's reek
  c.outline(INK);
  return c;
}

/** Squawks in his cradle, bald head out of the blankets, eyes open or shut. */
function bunkSquawks(f) {
  const c = new PixelCanvas(60, 50);
  for (let x = 4; x < 56; x++) {
    const sag = Math.round(Math.sin(((x - 4) / 52) * Math.PI) * 8);
    c.vline(x, 22 + sag, 30 + sag, x % 4 < 2 ? '#b4583a' : '#dc8456');
  }
  c.line(4, 22, 0, 0, '#a67c3e');
  c.line(55, 22, 59, 0, '#a67c3e');
  c.ellipse(30, 22, 9, 8, '#e8b4a4'); // the bald pink head
  c.ellipse(36, 24, 4, 3, '#f0d070'); // the beak
  if (f) c.hline(25, 29, 19, INK);
  else {
    c.ellipse(27, 19, 2, 2, '#f0f0f0');
    c.set(27, 19, INK);
  }
  c.outline(INK);
  return c;
}

/** A trapped puff of the suit's contents, drifting down. */
function suitPuff(f) {
  const c = new PixelCanvas(70, 50);
  for (const [px, py, r] of [[20, 26, 14], [36, 20, 16], [50, 30, 12], [32, 34, 12]]) c.ellipse(px, py + f * 2, r, r * 0.8, '#d8cc6a70');
  for (const [px, py] of [[24, 22], [44, 26]]) c.ellipse(px, py + f * 2, 5, 3, '#e8e090a0');
  return c;
}

export function addPhase8VistaFrames(atlas) {
  for (const f of [0, 1]) {
    atlas.add(`ftm_audit_${f}`, ftmAudit(f));
    atlas.add(`ftm_refresh_${f}`, ftmRefresh(f));
    atlas.add(`ftm_network_${f}`, ftmNetwork(f));
    atlas.add(`ftm_leaves_${f}`, ftmLeaves(f));
    atlas.add(`ftm_lilypad_${f}`, ftmLilypad(f));
    atlas.add(`ftm_basis_${f}`, ftmBasis(f));
    atlas.add(`quarters_inside_${f}`, quartersInside(f));
    atlas.add(`bunk_garrick_${f}`, bunkGarrick(f));
    atlas.add(`bunk_garrick_bare_${f}`, bunkGarrick(f, { crown: false }));
    atlas.add(`bunk_squawks_${f}`, bunkSquawks(f));
    atlas.add(`suit_puff_${f}`, suitPuff(f));
  }
  atlas.add('quarters_door', quartersDoor());
  atlas.add('quarters_panel', quartersPanel());
  atlas.add('bunk_bg', bunkBg());
  for (const s of [0, 1, 2]) atlas.add(`bunk_sash_${s}`, bunkSash(s));
  for (const k of ['crown', 'fork', 'spoon', 'lid']) atlas.add(`bunk_${k}`, crownPiece(k));
  for (const m of ['open', 'glare', 'wide', 'shut']) atlas.add(`cap_face_${m}`, captainFace(m));
  addLegendFrames(atlas);
}

export const PHASE8_VISTA_FRAMES = [
  ...['ftm_audit', 'ftm_refresh', 'ftm_network', 'ftm_leaves', 'ftm_lilypad', 'ftm_basis', 'quarters_inside', 'bunk_garrick', 'bunk_garrick_bare',
    'bunk_squawks', 'suit_puff'].flatMap((n) => [`${n}_0`, `${n}_1`]),
  'quarters_door', 'quarters_panel', 'bunk_bg', 'bunk_sash_0', 'bunk_sash_1', 'bunk_sash_2', 'bunk_crown', 'bunk_fork', 'bunk_spoon', 'bunk_lid',
  'cap_face_open', 'cap_face_glare', 'cap_face_wide', 'cap_face_shut',
  ...LEGEND_FRAMES,
];

/** Small versions of the new pictures, for the set in the hold (props). */
export const PHASE8_SCREEN_PAINTERS = {
  ftm3: (f) => [ftmAudit, ftmRefresh, ftmNetwork, ftmLilypad, ftmBasis][f % 5](f % 2),
};
