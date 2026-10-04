import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { drawText } from '../font/drawText.js';
import { rng } from './sesArt.js';

/**
 * Story Phase 8: the Grand Stenchmaster's Grand Bedtime Story, "The Grand
 * Expedition for the Lost Fart", as he tells it with a blank ledger and a
 * lantern. The pictures are what the crew can't help imagining, in the
 * crayon Garrick uses for everything: none of it is real, and all of it is
 * made out of the last month. The Lost Realm of Reekhollow and its Temple
 * of the Grand Stenchmaster (which looks like a belly), the seven chambers,
 * the Golden Bottle of Wind, Sir Garrick the First (who looks exactly like
 * him), the forbidden cheese, Professor Barnacle Bob in a sun-helmet, a
 * giant rolling onion, the bottle opening because nobody read the label,
 * sharks in a jungle, and emotional support.
 *
 * All original drawings: a dented sun-helmet, not a brimmed felt hat; no
 * whips, no idols, no boulders (an onion), no lettering but Garrick's own.
 */
const PW = 176;
const PH = 112;
const INK = PAL.ink;
const C = {
  paper: '#efe4c4', paperD: '#dccfa8', brown: '#8a5426', red: '#d8322a', blue: '#2f64d0', green: '#3a9a3a', yellow: '#e8c830',
  bile: '#8ab030', burg: '#7a1826', mustard: '#c8a030', grey: '#7a7a86', pink: '#e8a8a0', purple: '#7a3a9a', black: '#2a2a32', orange: '#e07a2a',
};

function page(seed) {
  const c = new PixelCanvas(PW, PH);
  c.fill(C.paper);
  const r = rng(seed);
  for (let i = 0; i < 90; i++) c.set(Math.floor(r() * PW), Math.floor(r() * PH), C.paperD);
  return c;
}

/** A crayon line: a little wobble, two pixels of waxy colour. */
function cray(c, x0, y0, x1, y1, col, seed = 1) {
  const r = rng(seed * 31 + x0 * 7 + y0);
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = Math.round(x0 + (x1 - x0) * t + (r() < 0.2 ? (r() < 0.5 ? -1 : 1) : 0));
    const y = Math.round(y0 + (y1 - y0) * t + (r() < 0.2 ? (r() < 0.5 ? -1 : 1) : 0));
    c.set(x, y, col);
    if (r() < 0.6) c.set(x + 1, y, col);
  }
}

/** Crayon scribble fill inside an ellipse. */
function blob(c, cx, cy, rx, ry, col, seed = 3) {
  const r = rng(seed);
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
    if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 1) continue;
    if (r() < 0.82) c.set(cx + x, cy + y, col);
  }
}

/** A caption in Garrick's crayon; a "|" breaks it onto a second line (upwards at the bottom, downwards at the top). */
function label(c, text, y = 98, col = C.brown) {
  const parts = text.split('|');
  const top = y < PH / 2 ? y : y - (parts.length - 1) * 10;
  parts.forEach((t, i) => drawText(c, t, PW / 2, top + i * 10, col, { center: true, jitter: 1, seed: t.length + i }));
}

/** A stick figure in Garrick's style. `body` colour; `hat`: 'helmet' | 'crown' | null. */
function figure(c, x, y, { body = C.blue, hat = null, big = false, arms = 'down' } = {}) {
  const s = big ? 1.5 : 1;
  blob(c, x, y, Math.round(5 * s), Math.round(5 * s), C.pink, x + y);
  if (big) for (const dx of [-7, 7]) blob(c, x + dx, y + 3, 3, 4, C.red, x); // sideburns
  cray(c, x, y + 5 * s, x, y + 18 * s, body, 2);
  if (big) blob(c, x, y + 13, 7, 7, body, 9);
  const ay = y + 9 * s;
  if (arms === 'up') {
    cray(c, x, ay, x - 7, ay - 8, body, 3);
    cray(c, x, ay, x + 7, ay - 8, body, 4);
  } else {
    cray(c, x, ay, x - 7, ay + 5, body, 3);
    cray(c, x, ay, x + 7, ay + 5, body, 4);
  }
  cray(c, x, y + 18 * s, x - 5, y + 27 * s, body, 5);
  cray(c, x, y + 18 * s, x + 5, y + 27 * s, body, 6);
  if (hat === 'helmet') {
    blob(c, x, y - 4, 7, 4, '#b89058', 11);
    cray(c, x - 9, y - 1, x + 9, y - 1, C.brown, 12);
  } else if (hat === 'crown') {
    for (const px of [-5, 0, 5]) cray(c, x + px, y - 5 * s, x + px, y - 10 * s, C.yellow, 13);
    cray(c, x - 6 * s, y - 5 * s, x + 6 * s, y - 5 * s, C.yellow, 14);
  }
}

// --- the pictures -------------------------------------------------------------------

function reekhollow() {
  const c = page(1);
  // jungle, and in it the Temple of the Grand Stenchmaster: a dome like a belly, two round windows, sideburn vines
  for (let i = 0; i < 14; i++) cray(c, 6 + i * 12, 92, 10 + i * 12, 40 + ((i * 17) % 20), C.green, i);
  blob(c, 88, 64, 44, 30, C.mustard, 5);
  blob(c, 88, 70, 30, 14, C.burg, 6);
  for (const wx of [72, 104]) blob(c, wx, 54, 6, 6, C.black, wx);
  cray(c, 44, 60, 40, 90, C.red, 7);
  cray(c, 132, 60, 136, 90, C.red, 8);
  for (let k = 0; k < 5; k++) cray(c, 70 + k * 9, 32, 66 + k * 9, 20, C.bile, k); // fumes
  label(c, 'THE LOST REALM OF REEKHOLLOW', 4, C.burg);
  label(c, 'TEMPLE OF THE|GRAND STENCHMASTER');
  return c;
}

function garlicHall() {
  const c = page(2);
  for (let i = 0; i < 6; i++) {
    const gx = 22 + i * 26;
    blob(c, gx, 70, 9, 11, '#f0f0e0', gx);
    for (const d of [-4, 0, 4]) cray(c, gx + d, 62, gx + d, 78, C.grey, gx + d);
    cray(c, gx, 59, gx + 2, 52, C.green, gx);
  }
  for (let k = 0; k < 12; k++) cray(c, 10 + k * 14, 46, 18 + k * 14, 20 + (k % 3) * 4, C.bile, k);
  label(c, 'I. THE HALL OF GARLIC BREATH', 4, C.burg);
  return c;
}

function grogPit() {
  const c = page(3);
  blob(c, 88, 70, 70, 22, C.bile, 4);
  blob(c, 88, 72, 60, 16, C.yellow, 5);
  for (const [bx, by] of [[50, 66], [92, 74], [120, 64], [70, 80]]) c.ellipseOutline(bx, by, 4, 3, '#f8f0a0');
  cray(c, 20, 52, 156, 52, C.brown, 6); // a plank
  label(c, 'II. THE PIT OF FROG GROG', 4, C.burg);
  label(c, '(BUBBLING) (GREEN) (YELLOW)', 98, C.green);
  return c;
}

function frogOracle() {
  const c = page(4);
  // a glowing box on a crate, a frog in glasses on the screen, lightning
  c.rect(52, 30, 72, 52, '#b08850');
  c.rect(60, 36, 56, 36, '#1c4422');
  blob(c, 88, 56, 14, 10, '#7ac860', 6);
  for (const ex of [82, 94]) c.ellipseOutline(ex, 50, 3, 3, INK);
  for (const [x0, y0, x1, y1] of [[40, 24, 50, 40], [136, 24, 126, 42], [88, 14, 88, 28]]) cray(c, x0, y0, x1, y1, C.yellow, x0);
  label(c, 'III. THE ELECTRIC FROG ORACLE', 4, C.burg);
  label(c, 'IT SPEAKS OF TAXES');
  return c;
}

function forecastCorridor() {
  const c = page(5);
  cray(c, 10, 20, 70, 50, C.brown, 1);
  cray(c, 166, 20, 106, 50, C.brown, 2);
  cray(c, 10, 92, 70, 70, C.brown, 3);
  cray(c, 166, 92, 106, 70, C.brown, 4);
  for (const [mx, my] of [[20, 40], [40, 54], [138, 40], [118, 54], [30, 70], [130, 70]]) {
    c.rect(mx, my, 16, 12, '#f8f0d8');
    cray(c, mx + 2, my + 2, mx + 14, my + 10, C.red, mx);
    cray(c, mx + 14, my + 2, mx + 2, my + 10, C.red, my);
  }
  for (const a of [0, 1, 2, 3]) cray(c, 88, 60, 88 + Math.round(Math.cos(a * 1.7) * 18), 60 + Math.round(Math.sin(a * 1.7) * 14), C.blue, a);
  label(c, 'IV. THE CORRIDOR OF|A THOUSAND FORECASTS', 4, C.burg);
  label(c, 'NONE OF THEM WORKED');
  return c;
}

function sashBridge() {
  const c = page(6);
  for (let x = 10; x < 166; x++) {
    const sag = Math.round(Math.sin(((x - 10) / 156) * Math.PI) * 10);
    c.set(x, 52 + sag, C.brown);
    if (x % 8 === 0) cray(c, x, 52 + sag, x, 60 + sag, C.brown, x);
  }
  cray(c, 10, 92, 166, 92, C.black, 1); // the ravine, a long way down
  figure(c, 88, 30, { hat: 'helmet', arms: 'up', body: '#c83a3a' });
  for (let x = 80; x < 120; x++) c.set(x, 26 + Math.round(Math.sin(x * 0.3) * 2), C.mustard); // the sash, held off the ground
  label(c, 'V. THE BRIDGE OF THE SACRED SASH', 4, C.burg);
  label(c, 'NEVER LET IT TOUCH THE GROUND');
  return c;
}

function throne() {
  const c = page(7);
  c.rect(66, 30, 44, 60, C.grey);
  c.rect(60, 64, 56, 12, C.grey);
  for (let k = 0; k < 8; k++) c.set(70 + k * 5, 34 + (k % 2) * 4, '#c8e8f8'); // frost
  figure(c, 88, 40, { big: true, hat: 'crown', body: C.burg });
  for (const a of [-1, 0, 1]) cray(c, 88 + a * 20, 30, 88 + a * 34, 18, C.orange, a + 5);
  label(c, 'VI. THE THRONE OF|ETERNAL SEAT WARMING', 4, C.burg);
  label(c, 'WITH DESTINY');
  return c;
}

function vault() {
  const c = page(8);
  c.ellipse(88, 58, 50, 36, '#6a6a78');
  c.ellipse(88, 58, 42, 30, '#3a3a46');
  // the Golden Bottle of Wind on its pedestal
  c.rect(80, 70, 16, 14, C.grey);
  blob(c, 88, 54, 8, 13, C.yellow, 9);
  c.rect(86, 38, 4, 5, C.yellow);
  for (let k = 0; k < 8; k++) cray(c, 88, 54, 88 + Math.round(Math.cos(k * 0.8) * 28), 54 + Math.round(Math.sin(k * 0.8) * 22), '#fff0a0', k);
  label(c, 'VII. THE VAULT OF THE LOST FART', 4, C.burg);
  label(c, 'THE GOLDEN BOTTLE OF WIND');
  return c;
}

function sirGarrick() {
  const c = page(9);
  c.rect(48, 14, 80, 80, C.mustard);
  c.rect(54, 20, 68, 68, '#3a2a40');
  figure(c, 88, 40, { big: true, hat: 'crown', body: C.burg });
  cray(c, 76, 52, 100, 66, C.mustard, 3); // the sash
  label(c, 'SIR GARRICK THE FIRST', 98, C.burg);
  label(c, '(NO RELATION) (SOME RELATION)', 4, C.brown);
  return c;
}

function feast() {
  const c = page(10);
  cray(c, 10, 70, 166, 70, C.brown, 1);
  for (const [ox, col] of [[24, C.purple], [44, C.purple], [64, '#f0f0e0']]) blob(c, ox, 62, 8, 8, col, ox);
  for (let i = 0; i < 8; i++) blob(c, 84 + i * 4, 64 - (i % 2) * 3, 2, 2, C.brown, i); // beans
  // the forbidden cheese: wedge, holes, flies, a sign
  c.poly([[118, 66], [160, 66], [160, 44]], C.yellow);
  for (const [hx, hy] of [[140, 60], [150, 54], [152, 62]]) c.ellipse(hx, hy, 2, 2, '#c8a030');
  for (const [fx, fy] of [[132, 36], [146, 30], [158, 38]]) {
    c.set(fx, fy, INK);
    c.set(fx - 1, fy - 1, C.grey);
    c.set(fx + 1, fy - 1, C.grey);
  }
  c.rect(120, 76, 44, 12, '#f8f0d8');
  drawText(c, 'FORBIDDEN', 142, 77, C.red, { center: true });
  label(c, 'THE ANCIENT MEAL', 4, C.burg);
  return c;
}

function feats() {
  const c = page(11);
  // the moon shoved over, a mountain sinking, frogs filing early
  blob(c, 140, 28, 14, 14, '#f0f0d0', 2);
  cray(c, 112, 28, 124, 28, C.blue, 3);
  cray(c, 118, 24, 124, 28, C.blue, 4);
  cray(c, 118, 32, 124, 28, C.blue, 5);
  c.poly([[20, 80], [50, 40], [80, 80]], C.grey);
  cray(c, 14, 72, 86, 72, C.blue, 6);
  cray(c, 14, 76, 86, 76, C.blue, 7);
  for (const fx of [100, 124, 148]) {
    blob(c, fx, 80, 7, 5, C.green, fx);
    c.rect(fx - 4, 68, 8, 8, '#f8f0d8');
  }
  label(c, 'IT MOVED THE MOON.|IT SANK MOUNTAINS.', 4, C.burg);
  label(c, 'FROGS FILED THEIR|TAXES EARLY');
  return c;
}

function professorBob() {
  const c = page(12);
  for (let i = 0; i < 12; i++) cray(c, 8 + i * 14, 92, 14 + i * 14, 30 + ((i * 13) % 24), C.green, i);
  figure(c, 88, 38, { hat: 'helmet', body: '#c83a3a' });
  c.hline(76, 100, 52, '#f0f0f0'); // stripes
  cray(c, 96, 50, 108, 44, C.brown, 4); // a lantern
  blob(c, 110, 42, 3, 3, C.yellow, 5);
  label(c, 'PROFESSOR BARNACLE BOB', 4, C.burg);
  label(c, 'EXPLORER OF|GASTROINTESTINAL MYSTERIES', 98, C.brown);
  return c;
}

function rollingOnion(f = 0) {
  const c = page(13);
  cray(c, 0, 86, 176, 86, C.brown, 1);
  blob(c, 120 - f * 4, 56, 30, 30, C.purple, 2);
  for (const d of [-14, 0, 14]) cray(c, 120 - f * 4 + d, 28, 120 - f * 4 + d * 0.6, 84, '#b878c8', d + 3);
  cray(c, 120 - f * 4, 26, 124 - f * 4, 14, C.green, 4);
  figure(c, 44, 52, { hat: 'helmet', arms: 'up', body: '#c83a3a' });
  for (const k of [0, 1, 2]) cray(c, 60 + k * 8, 50 + k * 6, 70 + k * 8, 50 + k * 6, C.grey, k); // speed lines
  label(c, 'THE GIANT ROLLING ONION', 4, C.burg);
  return c;
}

function bottleOpens() {
  const c = page(14);
  figure(c, 56, 40, { hat: 'helmet', arms: 'up', body: '#c83a3a' });
  blob(c, 108, 58, 9, 14, C.yellow, 2);
  c.rect(104, 40, 8, 4, C.yellow);
  c.rect(98, 54, 20, 10, '#f8f0d8'); // the label
  drawText(c, 'DO NOT', 108, 54, C.red, { center: true });
  for (let k = 0; k < 9; k++) cray(c, 108, 38, 108 + Math.round(Math.cos(-k * 0.35) * 50), 38 - Math.round(Math.abs(Math.sin(k * 0.35)) * 32), C.bile, k);
  label(c, 'HE DID NOT READ THE LABEL', 4, C.burg);
  return c;
}

function templeSharks() {
  const c = page(15);
  blob(c, 88, 70, 40, 22, C.yellow, 3);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const sx = 88 + Math.round(Math.cos(a) * 62);
    const sy = 52 + Math.round(Math.sin(a) * 30);
    c.poly([[sx - 7, sy], [sx + 7, sy], [sx, sy - 6]], '#7a8aa0');
    c.set(sx + 4, sy - 1, INK);
  }
  for (let i = 0; i < 8; i++) cray(c, 6 + i * 22, 96, 10 + i * 22, 74, C.green, i);
  label(c, 'THEN CAME THE SHARKS', 4, C.burg);
  label(c, '(VERY COMMITTED SHARKS)');
  return c;
}

function support() {
  const c = page(16);
  blob(c, 88, 80, 70, 14, C.yellow, 2);
  for (let i = 0; i < 5; i++) {
    const sx = 30 + i * 30;
    c.poly([[sx - 6, 40], [sx + 6, 40], [sx, 34]], '#7a8aa0');
  }
  figure(c, 88, 34, { big: true, hat: 'crown', body: C.burg, arms: 'up' });
  for (const hx of [40, 136]) blob(c, hx, 66, 4, 4, C.red, hx); // little hearts
  label(c, 'SIR GARRICK GAVE|EMOTIONAL SUPPORT', 4, C.burg);
  return c;
}

function moral() {
  const c = page(17);
  c.strokeRect(6, 6, PW - 12, PH - 12, C.burg);
  c.strokeRect(9, 9, PW - 18, PH - 18, C.mustard);
  drawText(c, 'THE MORAL', 88, 16, C.burg, { center: true, scale: 2, jitter: 1 });
  const lines = ['ALWAYS HOLD THE', 'GRAND STENCHMASTER SASH', 'WHEN THE GRAND STENCHMASTER', 'MIGHT FART.'];
  lines.forEach((t, i) => drawText(c, t, 88, 44 + i * 12, C.brown, { center: true, jitter: 1, seed: i + 3 }));
  return c;
}

/** The hold, lantern turned low; Garrick standing in it with his ledger; the hammocks. */
function legendBg() {
  const c = new PixelCanvas(320, 224);
  c.fill('#0c0a10');
  for (const by of [0, 20]) {
    c.rect(0, by, 320, 10, '#1e1610');
    c.hline(0, 319, by + 9, '#0e0a06');
  }
  // hammocks in silhouette along the bottom, a foot here, a hat there
  for (const [hx, hy] of [[60, 196], [160, 204], [262, 194]]) {
    for (let x = hx - 46; x < hx + 46; x++) {
      const sag = Math.round(Math.sin(((x - hx + 46) / 92) * Math.PI) * 10);
      c.vline(x, hy + sag, hy + sag + 6, '#24202c');
    }
  }
  c.ellipse(118, 206, 4, 3, '#2a2028');
  // Garrick, lit from below by the lantern he's holding: the suit, the crown, the ledger
  for (let y = 60; y < 224; y++) for (let x = 0; x < 120; x++) {
    const d = Math.hypot((x - 46) / 70, (y - 150) / 90);
    if (d < 1) c.blend(x, y, '#ffb050', (1 - d) * 0.16);
  }
  c.ellipse(46, 160, 26, 44, '#521828');
  c.ellipse(46, 160, 18, 38, '#74283a');
  c.ellipse(46, 100, 15, 15, '#dc9c76');
  c.ellipse(46, 108, 13, 8, '#c85236');
  for (const px of [36, 46, 56]) c.poly([[px - 4, 86], [px, 76], [px + 4, 86]], '#c8a030');
  c.rect(31, 84, 30, 6, '#c8a030');
  c.rect(52, 128, 22, 28, '#f0e6c8'); // the ledger (blank)
  c.vline(63, 128, 155, '#c8b890');
  c.rect(22, 168, 8, 10, '#a87830'); // the lantern
  c.outline(INK);
  return c;
}

/** The page the pictures sit on: a ledger's ruled sheet, Garrick's crayon round the edge. */
function legendPage() {
  const c = new PixelCanvas(196, 132);
  c.fill('#e6dab8');
  for (let y = 10; y < 132; y += 8) c.hline(4, 191, y, '#d0c4a0');
  c.vline(16, 0, 131, '#d8a0a0');
  c.strokeRect(0, 0, 196, 132, '#7a1826');
  c.strokeRect(2, 2, 192, 128, '#c8a030');
  return c;
}

export function addLegendFrames(atlas) {
  atlas.add('legend_bg', legendBg());
  atlas.add('legend_page', legendPage());
  for (const [id, fn] of Object.entries(PANELS)) atlas.add(id, fn());
}

const PANELS = {
  leg_reekhollow: reekhollow,
  leg_garlic: garlicHall,
  leg_grog: grogPit,
  leg_oracle: frogOracle,
  leg_forecasts: forecastCorridor,
  leg_bridge: sashBridge,
  leg_throne: throne,
  leg_vault: vault,
  leg_sir_garrick: sirGarrick,
  leg_feast: feast,
  leg_feats: feats,
  leg_prof_bob: professorBob,
  leg_onion: () => rollingOnion(0),
  leg_bottle: bottleOpens,
  leg_sharks: templeSharks,
  leg_support: support,
  leg_moral: moral,
};

export const LEGEND_FRAMES = ['legend_bg', 'legend_page', ...Object.keys(PANELS)];
