import { drawText } from '../font/drawText.js';
import { SES_SCREEN } from './sesArt.js';
import { CRT, crt, screen } from './vistaPhase6.js';
import { tvSash, crown, brogath, rays } from './vistaPhase11.js';

/**
 * Television for Story Phase 15 (the same green CRT as every set aboard; cartoon reenactments, Stenchmaster Channel
 * style, all original):
 *   - BROGATH THE BASHFUL AND THE AGE OF FART COMMERCE: actually rich (a chandelier, on a ship); Ledger Billiam's two
 *     ledgers; No-Nonsense Tilda and her (green) hat; the bakery, the cobbler, the rope merchant's bucket leaving town,
 *     the farmer's fence and shed, the forge that is still lit, the boat going backwards, the funeral (the hearse four
 *     feet off its mark, wreaths leaving the county);
 *   - THE TOP TEN MOST EMBARRASSING SASH FLUTTERS: the countdown cards, and the Goat Incident (the goat, over; the goat,
 *     leaving);
 *   - THE WRATH OF BROGATH (the bank; the mountain of weeds), BROGATH AND THE CHICKEN (Agnes, the coop, the green one,
 *     the mellow town), THE UNTOLD STORIES (the cannon, the wishing well, the chicken-coop bank);
 *   - the commercials: slow motion, the unsupported sash, mass synchronized flutter, the mellow one, the Grand Bank's.
 * Every frame comes in two (the set animates between them). No flashing.
 */
const W = SES_SCREEN.w;
const H = SES_SCREEN.h;
const t = (c, s, x, y, col = CRT[7], opts = {}) => drawText(c, s, x, y, col, { center: true, ...opts });

export function card(title, sub, f) {
  const c = screen(CRT[1]);
  rays(c, W / 2, 34, 12, CRT[2], f);
  c.rect(6, 24, W - 12, 26, CRT[0]);
  t(c, title, W / 2, 28);
  if (sub) t(c, sub, W / 2, 39, CRT[6]);
  return c;
}
export function ground(c, y = 60, col = CRT[2]) { c.rect(0, y, W, H - y, col); }
function stallFront(c, x, y, w, col = CRT[3]) {
  c.rect(x, y, w, 14, col);
  for (let k = 0; k < w; k += 6) c.rect(x + k, y - 8, 3, 8, k % 12 ? CRT[5] : CRT[6]);
}
function whiff(c, x, y, f, n = 3) {
  for (let i = 0; i < n; i++) c.ellipse(x + i * 7 + (f ? 3 : 0), y - i * 2, 3, 2, CRT[5]);
}
/** A little cartoon person (a baker, a merchant): head, body, an arm. */
export function person(c, x, y, { col = CRT[3], hat = null, flee = 0 } = {}) {
  c.ellipse(x, y, 5, 5, CRT[6]);
  c.rect(x - 4, y + 5, 8, 14, col);
  if (hat === 'tall') c.rect(x - 4, y - 10, 8, 6, CRT[7]);
  if (hat === 'brim') { c.hline(x - 7, x + 7, y - 4, CRT[4]); c.rect(x - 4, y - 8, 8, 4, CRT[4]); }
  c.set(x + 2, y - 1, CRT[0]);
  if (flee) c.line(x + 4, y + 8, x + 4 + flee * 6, y + 2, CRT[6]);
}
function goat(c, x, y, { down = false, flip = false } = {}) {
  const d = flip ? -1 : 1;
  if (down) {
    c.ellipse(x, y + 6, 10, 5, CRT[6]);
    for (const k of [-6, -2, 3, 7]) c.line(x + k, y + 3, x + k + 2, y - 3, CRT[5]); // legs, in the air
    c.ellipse(x + 10 * d, y + 6, 4, 3, CRT[7]);
    return;
  }
  c.ellipse(x, y, 10, 6, CRT[6]);
  for (const k of [-6, -2, 3, 7]) c.vline(x + k, y + 5, y + 11, CRT[5]);
  c.ellipse(x + 11 * d, y - 4, 4, 4, CRT[7]);
  c.line(x + 10 * d, y - 8, x + 8 * d, y - 12, CRT[5]); c.line(x + 13 * d, y - 8, x + 15 * d, y - 12, CRT[5]); // horns
  c.set(x + 12 * d, y - 5, CRT[0]);
  c.vline(x + 12 * d, y, y + 3, CRT[6]); // beard
}
export function hen(c, x, y, { flip = false, s = 1 } = {}) {
  const d = flip ? -1 : 1;
  c.ellipse(x, y, 7 * s, 5 * s, CRT[6]);
  c.ellipse(x + 6 * d * s, y - 5 * s, 3 * s, 3 * s, CRT[7]);
  c.rect(x + 5 * d * s, y - 9 * s, 2 * s, 2 * s, CRT[4]); // comb
  c.set(x + 9 * d * s, y - 5 * s, CRT[5]); // beak
  c.set(x + 6 * d * s, y - 6 * s, CRT[0]);
  c.poly([[x - 6 * d * s, y - 2 * s], [x - 10 * d * s, y - 7 * s], [x - 9 * d * s, y + 1 * s]], CRT[5]); // tail
  c.vline(x - 2, y + 5 * s, y + 8 * s, CRT[5]); c.vline(x + 2, y + 5 * s, y + 8 * s, CRT[5]);
}
function boatShape(c, x, y, w = 30) {
  c.poly([[x, y], [x + w, y], [x + w - 5, y + 8], [x + 5, y + 8]], CRT[4]);
  c.hline(x, x + w, y, CRT[6]);
}

// --- the Age of Fart Commerce ----------------------------------------------------------------------------------

function aofcRich(f) {
  const c = screen(CRT[1]);
  c.rect(0, 58, W, 20, CRT[2]); // the deck
  // a chandelier, on a ship
  c.vline(W / 2, 0, 8, CRT[5]); c.hline(W / 2 - 14, W / 2 + 14, 9, CRT[6]);
  for (const x of [-14, -7, 0, 7, 14]) { c.vline(W / 2 + x, 9, 13, CRT[5]); c.set(W / 2 + x, 14 - (f && x % 14 === 0 ? 1 : 0), CRT[7]); }
  // gold: real gold
  c.ellipse(24, 56, 16, 6, CRT[6]);
  for (let i = 0; i < 14; i++) c.ellipse(12 + ((i * 7) % 26), 50 + ((i * 3) % 6), 2, 1, CRT[7]);
  brogath(c, 72, 24, { sash: 'none', blush: false });
  t(c, 'ACTUALLY RICH', W / 2, 66, f ? CRT[7] : CRT[6]);
  return crt(c, f);
}
function aofcLedgers(f) {
  const c = screen(CRT[1]);
  c.ellipse(W / 2, 26, 8, 9, CRT[6]); // Ledger Billiam
  c.rect(W / 2 - 7, 34, 14, 22, CRT[4]);
  c.set(W / 2 - 3, 24, CRT[0]); c.set(W / 2 + 3, 24, CRT[0]);
  c.hline(W / 2 - 3, W / 2 + 3, 30, CRT[0]);
  // a ledger in each hand
  c.rect(W / 2 - 28, 38 - f, 14, 18, CRT[3]); c.rect(W / 2 - 26, 40 - f, 10, 2, CRT[6]); t(c, '$', W / 2 - 21, 44 - f);
  c.rect(W / 2 + 14, 38 + f, 14, 18, CRT[3]); c.rect(W / 2 + 16, 40 + f, 10, 2, CRT[6]);
  whiff(c, W / 2 + 18, 52 + f, f, 2);
  t(c, 'TWO LEDGERS', W / 2, 64);
  return crt(c, f);
}
function aofcTilda(f) {
  const c = screen(CRT[1]);
  ground(c, 62);
  // No-Nonsense Tilda: tall, straight, sensible boots, a sensible hat, arms folded, a hand-drawn compass
  const x = 40;
  c.ellipse(x, 22, 7, 7, CRT[6]);
  c.hline(x - 10, x + 10, 15, CRT[4]); c.rect(x - 6, 9, 12, 6, CRT[4]); // the hat (blue, the programme says)
  c.rect(x - 6, 29, 12, 26, CRT[3]);
  c.hline(x - 6, x + 5, 38, CRT[5]); // arms, folded
  c.rect(x - 6, 55, 5, 6, CRT[0]); c.rect(x + 1, 55, 5, 6, CRT[0]); // boots
  c.set(x - 3, 21, CRT[0]); c.set(x + 3, 21, CRT[0]); c.hline(x - 2, x + 2, 26, CRT[0]);
  // the compass she drew, its needle pointing two ways
  c.ellipseOutline(76, 34, 12, 12, CRT[6]);
  c.line(76, 34, 76 + (f ? 8 : -8), 26, CRT[7]); c.line(76, 34, 70, 44, CRT[7]);
  t(c, 'NO-NONSENSE', W / 2, 66);
  return crt(c, f);
}
function aofcBakery(f) {
  const c = screen(CRT[1]);
  ground(c);
  stallFront(c, 54, 44, 44);
  person(c, 76, 22, { hat: 'tall', flee: f });
  // loaves leaving the shelf
  for (let i = 0; i < 4; i++) c.ellipse(60 + i * 9 + (f ? 10 : 0), 38 - (f ? i * 3 : 0), 4, 2, CRT[6]);
  brogath(c, 24, 26, { sash: 'none' });
  whiff(c, 36, 50, f);
  return crt(c, f);
}
function aofcCobbler(f) {
  const c = screen(CRT[1]);
  ground(c);
  stallFront(c, 6, 44, 40);
  stallFront(c, 58, 44, 40, CRT[4]);
  for (let i = 0; i < 3; i++) { c.rect(10 + i * 10, 38 - (f ? 6 : 0), 6, 4, CRT[5]); } // boots, airborne
  for (let i = 0; i < 3; i++) c.rect(62 + i * 11, 34 - (f ? 4 : 0), 8, 6, CRT[6]); // bolts of cloth
  brogath(c, W / 2, 18, { sash: 'none' });
  t(c, 'IT WORKS!', W / 2, 66, CRT[7]);
  return crt(c, f);
}
function aofcRope(f) {
  const c = screen(CRT[1]);
  ground(c);
  c.rect(4, 30, 30, 30, CRT[3]); // the rope shop
  for (let y = 34; y < 56; y += 6) c.ellipse(19, y, 10, 2, CRT[5]); // coils of rope
  brogath(c, 50, 26, { sash: 'none' });
  // the bucket, leaving
  const bx = f ? 92 : 70;
  const by = f ? 8 : 40;
  c.poly([[bx - 5, by], [bx + 5, by], [bx + 4, by + 8], [bx - 4, by + 8]], CRT[6]);
  if (f) for (let i = 0; i < 4; i++) c.set(bx - 10 - i * 4, by + 6 + i * 4, CRT[5]);
  whiff(c, 62, 46, f);
  return crt(c, f);
}
function aofcFarmer(f) {
  const c = screen(CRT[1]);
  ground(c, 58, CRT[3]);
  // the shed, a third of it gone
  c.rect(70, 30, 26, 28, CRT[4]);
  c.poly([[66, 30], [83, 18], [100, 30]], CRT[2]);
  if (f) c.rect(88, 26, 10, 18, CRT[1]);
  // the fence, going
  for (let i = 0; i < 6; i++) c.rect(8 + i * 8 + (f ? i * 3 : 0), 48 - (f ? i * 2 : 0), 3, 10, CRT[5]);
  // leaves
  for (let i = 0; i < 8; i++) c.set(12 + i * 9 + (f ? 6 : 0), 20 + (i % 3) * 6, CRT[7]);
  brogath(c, 40, 20, { sash: 'none' });
  return crt(c, f);
}
function aofcForge(f) {
  const c = screen(CRT[1]);
  ground(c, 62);
  c.rect(56, 36, 34, 26, CRT[3]); // the forge
  c.ellipse(73, 36, 14, 5, CRT[0]);
  for (let i = 0; i < 6; i++) c.line(66 + i * 3, 36, 64 + i * 3 + (f ? 2 : 0), 14 - (i % 3) * 4, i % 2 ? CRT[7] : CRT[6]); // flames, a lot of them
  person(c, 92, 30, { col: CRT[4], flee: f ? 1 : 0 });
  brogath(c, 26, 26, { sash: 'none' });
  whiff(c, 38, 48, f);
  t(c, 'STILL LIT', 30, 4, CRT[6]);
  return crt(c, f);
}
function aofcBoat(f) {
  const c = screen(CRT[1]);
  for (let y = 44; y < H; y += 4) c.hline(0, W - 1, y + (f ? 1 : 0), y % 8 ? CRT[2] : CRT[3]); // the harbour
  c.rect(84, 24, 16, 20, CRT[4]); // the harbourmaster's hut
  const x = f ? 52 : 30; // going backwards
  boatShape(c, x, 40);
  brogath(c, x + 15, 14, { sash: 'none' });
  whiff(c, x + 34, 38, f, 2);
  if (f) person(c, 92, 18, { hat: 'brim' });
  return crt(c, f);
}
function aofcFuneral(f) {
  const c = screen(CRT[1]);
  ground(c);
  // the hearse, four feet off its mark
  const hx = f ? 50 : 36;
  c.rect(hx, 34, 36, 18, CRT[3]); c.rect(hx + 4, 38, 12, 8, CRT[1]);
  c.ellipse(hx + 7, 54, 4, 4, CRT[5]); c.ellipse(hx + 29, 54, 4, 4, CRT[5]);
  // wreaths, leaving the county
  for (let i = 0; i < 3; i++) c.ellipseOutline(14 + i * 12 + (f ? i * 10 : 0), 30 - (f ? i * 6 : 0), 4, 4, CRT[6]);
  person(c, 92, 26, { hat: 'tall', col: CRT[0] }); // the undertaker
  t(c, 'SETTLED', W / 2, 64, f ? CRT[7] : CRT[5]);
  return crt(c, f);
}

// --- the Top Ten --------------------------------------------------------------------------------------------------

function ttTitle(f) { return crt(card('TOP TEN', 'SASH FLUTTERS', f), f); }
function ttNumber(n, label) {
  return (f) => {
    const c = screen(CRT[1]);
    c.rect(4, 4, 30, 30, CRT[3]);
    t(c, `#${n}`, 19, 13, CRT[7]);
    brogath(c, 68, 22, { sash: 'none', blush: true });
    tvSash(c, 52, 44, 14, { angle: -0.2, wave: 3, f, col: CRT[6] });
    t(c, label, W / 2, 64, CRT[6]);
    return crt(c, f);
  };
}
function ttGoat(f) {
  const c = screen(CRT[1]);
  ground(c, 56, CRT[3]);
  brogath(c, 30, 18, { sash: 'none' });
  tvSash(c, 40, 34, 12, { angle: 0, wave: 3, f, col: CRT[6] });
  goat(c, 72, 46);
  person(c, 96, 36, { col: CRT[4] }); // a child, pointing
  c.line(92, 44, 86, 40, CRT[6]);
  t(c, '#1', 10, 4, CRT[7]);
  return crt(c, f);
}
function ttGoatDown(f) {
  const c = screen(CRT[1]);
  ground(c, 56, CRT[3]);
  brogath(c, 30, 18, { sash: 'none' });
  whiff(c, 44, 44, f, 3);
  goat(c, 72, 46, { down: true });
  return crt(c, f);
}
function ttGoatRun(f) {
  const c = screen(CRT[1]);
  ground(c, 56, CRT[3]);
  brogath(c, 30, 18, { sash: 'none' });
  goat(c, f ? 98 : 84, 46, { flip: false });
  for (let i = 0; i < 3; i++) c.hline(60 + i * 6 - (f ? 0 : 6), 66 + i * 6 - (f ? 0 : 6), 44 + i * 3, CRT[5]); // speed lines
  return crt(c, f);
}

// --- the Wrath of Brogath ----------------------------------------------------------------------------------------------

function wrathTitle(f) { return crt(card('THE WRATH', 'OF BROGATH', f), f); }
function wrathBank(f) {
  const c = screen(CRT[1]);
  ground(c);
  c.rect(52, 28, 46, 32, CRT[4]); // a bank, out of nothing
  for (let x = 56; x < 96; x += 8) c.rect(x, 34, 3, 26, CRT[6]);
  c.poly([[48, 28], [75, 14], [102, 28]], CRT[5]);
  brogath(c, 24, 22, { sash: 'none' });
  rays(c, 24, 30, 8, CRT[2], f);
  return crt(c, f);
}
function wrathWeed(f) {
  const c = screen(CRT[1]);
  ground(c);
  c.poly([[24, 60], [52, 22], [80, 60]], CRT[4]); // the mountain
  for (let i = 0; i < 18; i++) c.line(30 + ((i * 13) % 44), 30 + ((i * 7) % 28), 32 + ((i * 13) % 44), 26 + ((i * 7) % 28), i % 3 ? CRT[5] : CRT[6]);
  brogath(c, 52, 6 + f, { sash: 'none' });
  t(c, 'TUESDAY', W / 2, 66, CRT[6]);
  return crt(c, f);
}

// --- Brogath and the Chicken ---------------------------------------------------------------------------------------------

function agnesTitle(f) {
  const c = card('BROGATH AND', 'THE CHICKEN', f);
  hen(c, W / 2, 62, { s: 1 });
  return crt(c, f);
}
function agnesCoop(f) {
  const c = screen(CRT[1]);
  ground(c, 58, CRT[3]);
  c.rect(66, 32, 30, 26, CRT[4]); c.poly([[62, 32], [81, 20], [100, 32]], CRT[5]); // the coop
  hen(c, 44, 50 - f);
  brogath(c, 20, 18, { sash: 'none', blush: !!f });
  t(c, 'AGNES', 44, 4, CRT[7]);
  return crt(c, f);
}
function agnesWaft(f) {
  const c = screen(CRT[1]);
  ground(c, 58, CRT[3]);
  for (let i = 0; i < 9; i++) c.ellipse(20 + i * 9, 40 - (i % 3) * 6 - (f ? 2 : 0), 7, 5, i % 2 ? CRT[5] : CRT[4]); // green
  brogath(c, 20, 18, { sash: 'none' });
  hen(c, 50, 52);
  return crt(c, f);
}
function agnesTown(f) {
  const c = screen(CRT[1]);
  ground(c, 56);
  for (const x of [6, 40, 74]) { c.rect(x, 26, 24, 30, CRT[3]); c.poly([[x - 2, 26], [x + 12, 16], [x + 26, 26]], CRT[4]); }
  // everybody sitting down, smiling
  for (const x of [18, 52, 86]) { c.ellipse(x, 60, 4, 4, CRT[6]); c.rect(x - 4, 64, 9, 5, CRT[5]); c.hline(x - 2, x + 2, 61 + f, CRT[0]); }
  t(c, 'MELLOW', W / 2, 4, CRT[6]);
  return crt(c, f);
}

// --- the Untold Stories ------------------------------------------------------------------------------------------------------

function untoldTitle(f) { return crt(card('THE UNTOLD', 'STORIES', f), f); }
function untoldCannon(f) {
  const c = screen(CRT[1]);
  ground(c, 62);
  c.rect(8, 46, 26, 10, CRT[3]); c.ellipse(14, 58, 5, 5, CRT[4]); c.ellipse(28, 58, 5, 5, CRT[4]); // the cannon (small)
  const x = f ? 80 : 46;
  const y = f ? 20 : 34;
  brogath(c, x, y, { sash: 'none' });
  for (let i = 0; i < 4; i++) c.ellipse(36 + i * 6, 44 - i * 4, 3, 2, CRT[5]); // smoke
  return crt(c, f);
}
function untoldWell(f) {
  const c = screen(CRT[1]);
  ground(c, 60);
  c.rect(56, 40, 30, 20, CRT[3]); c.ellipse(71, 40, 15, 4, CRT[0]); // the well
  c.vline(58, 18, 40, CRT[5]); c.vline(84, 18, 40, CRT[5]); c.hline(56, 86, 18, CRT[5]);
  brogath(c, 26, 22, { sash: 'none' });
  c.ellipse(46 + (f ? 18 : 0), 34 + (f ? 6 : 0), 2, 1.5, CRT[7]); // the coin
  t(c, 'STATEMENT?', 26, 4, CRT[6]);
  return crt(c, f);
}
function untoldCoop(f) {
  const c = screen(CRT[1]);
  ground(c, 58, CRT[3]);
  c.rect(30, 26, 44, 32, CRT[4]); c.poly([[26, 26], [52, 12], [78, 26]], CRT[5]);
  c.rect(34, 30, 36, 6, CRT[0]); t(c, 'BANK', 52, 31, CRT[7]);
  hen(c, 20, 50, { s: 1 }); hen(c, 86, 50 - f, { s: 1, flip: true });
  for (const [x, y] of [[44, 50], [58, 52]]) c.ellipse(x, y, 2, 1, CRT[7]); // coins, being spent
  return crt(c, f);
}

// --- the commercials ------------------------------------------------------------------------------------------------------------

function backdrop(f) {
  const c = screen(CRT[6]);
  for (let y = 0; y < H; y++) if ((y + f) % 7 === 0) c.hline(0, W - 1, y, CRT[7]);
  return c;
}
function adSlowmo(f) {
  const c = backdrop(0);
  tvSash(c, 16, 34, 26, { angle: 0, wave: 3 + f, f: f * 0.3, col: CRT[3] });
  t(c, 'SLOW MOTION', W / 2, 62, CRT[2]);
  return crt(c, f);
}
function adUnsupported(f) {
  const c = backdrop(f);
  // a sash, standing up on its own, nobody in it
  tvSash(c, 40, 10 + f, 18, { angle: 1.2, wave: 2, f, col: CRT[3] });
  tvSash(c, 56, 10 - f, 18, { angle: 1.9, wave: 2, f: f + 1, col: CRT[3] });
  t(c, 'NO WEARER', W / 2, 62, CRT[2]);
  return crt(c, f);
}
function adMass(f) {
  const c = backdrop(f);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) tvSash(c, 4 + k * 16, 6 + r * 15, 5, { angle: 0, wave: 2, f, col: (k + r) % 2 ? CRT[3] : CRT[2] }); // all in time
  return crt(c, f);
}
function adMellow(f) {
  const c = screen(CRT[3]);
  crown(c, W / 2 - 18, 8, 3, CRT[6]);
  t(c, 'DUDE.', W / 2, 36, CRT[7]);
  t(c, 'HOLD MY SASH.', W / 2, 48, CRT[7]);
  t(c, f ? 'BUT LIKE... LATER' : 'BUT LIKE...', W / 2, 60, CRT[6]);
  return crt(c, f);
}
function adGbank(f) {
  const c = screen(CRT[1]);
  rays(c, W / 2, 30, 14, CRT[2], f);
  c.rect(28, 20, 48, 30, CRT[4]); c.poly([[24, 20], [52, 6], [80, 20]], CRT[5]);
  for (let x = 32; x < 74; x += 7) c.rect(x, 26, 3, 24, CRT[6]);
  t(c, 'YOUR GAS IS', W / 2, 54, CRT[7]);
  t(c, 'OUR BUSINESS!', W / 2, 64, CRT[7]);
  return crt(c, f);
}

const PAIRS = {
  aofc_rich: aofcRich, aofc_ledgers: aofcLedgers, aofc_tilda: aofcTilda, aofc_bakery: aofcBakery, aofc_cobbler: aofcCobbler,
  aofc_rope: aofcRope, aofc_farmer: aofcFarmer, aofc_forge: aofcForge, aofc_boat: aofcBoat, aofc_funeral: aofcFuneral,
  tt_title: ttTitle, tt_ten: ttNumber(10, 'THE GALA'), tt_seven: ttNumber(7, 'THE WEDDING'), tt_four: ttNumber(4, 'A CORONATION'),
  tt_two: ttNumber(2, 'THE MIRROR'), tt_goat: ttGoat, tt_goat_down: ttGoatDown, tt_goat_run: ttGoatRun,
  wrath_title: wrathTitle, wrath_bank: wrathBank, wrath_weed: wrathWeed,
  agnes_title: agnesTitle, agnes_coop: agnesCoop, agnes_waft: agnesWaft, agnes_town: agnesTown,
  untold_title: untoldTitle, untold_cannon: untoldCannon, untold_well: untoldWell, untold_coop: untoldCoop,
  ad_slowmo: adSlowmo, ad_unsupported: adUnsupported, ad_mass: adMass, ad_mellow: adMellow, ad_gbank: adGbank,
};

export function addPhase15VistaFrames(atlas) {
  for (const [id, fn] of Object.entries(PAIRS)) for (const f of [0, 1]) atlas.add(`${id}_${f}`, fn(f));
}

export const PHASE15_VISTA_FRAMES = Object.keys(PAIRS).flatMap((n) => [`${n}_0`, `${n}_1`]);
