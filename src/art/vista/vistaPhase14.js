import { drawText } from '../font/drawText.js';
import { SES_SCREEN } from './sesArt.js';
import { CRT, crt, screen } from './vistaPhase6.js';
import { tvSash, crown, brogath, rays } from './vistaPhase11.js';

/**
 * Television for Story Phase 14 (the same green CRT as every set on the ship):
 *   - the Bling Bling King's sash commercials: a clean white backdrop, one
 *     Stenchmaster sash fluttering in slow motion, then two, then six, then a
 *     promise of a thousand; the sponsor's card;
 *   - the Stenchmaster Channel's BROGATH THE BASHFUL: THE FART-PEDDLING
 *     BEGGAR: the title, the market, the sign (WILL FART FOR FOOD), Ledger
 *     Billiam and his quill, BROGATH'S GRAND GUST EXCHANGE, and the customers
 *     paying him, chiefly, to go away.
 * The Frog Tax Man's 'ribbit' episode reuses the programme's own pictures.
 */
const W = SES_SCREEN.w;
const H = SES_SCREEN.h;
const t = (c, s, x, y, col = CRT[7], opts = {}) => drawText(c, s, x, y, col, { center: true, ...opts });

// --- the commercials --------------------------------------------------------------------------------------

function backdrop(f) {
  const c = screen(CRT[6]);
  for (let y = 0; y < H; y++) if ((y + f) % 7 === 0) c.hline(0, W - 1, y, CRT[7]);
  return c;
}

function adWhite(f) {
  return crt(backdrop(f), f);
}

/** n sashes, fluttering, in slow motion. */
function adSashes(n) {
  return (f) => {
    const c = backdrop(f);
    const rows = n <= 2 ? [[0]] : n <= 6 ? [[0, 1, 2], [0, 1, 2]] : [[0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5]];
    if (n === 1) tvSash(c, 16, 34, 26, { angle: 0, wave: 5, f, col: CRT[3] });
    else if (n === 2) { tvSash(c, 8, 22, 26, { angle: 0, wave: 4, f, col: CRT[3] }); tvSash(c, 20, 48, 26, { angle: 0, wave: 4, f: f + 1, col: CRT[2] }); }
    else {
      const cols = rows[0].length;
      rows.forEach((row, r) => row.forEach((k) => {
        const x = 4 + k * Math.floor((W - 8) / cols);
        const y = 10 + r * Math.floor((H - 20) / rows.length);
        tvSash(c, x, y, n > 6 ? 5 : 9, { angle: 0, wave: n > 6 ? 2 : 3, f: f + k + r, col: (k + r) % 2 ? CRT[3] : CRT[2] });
      }));
    }
    if (n > 6) t(c, 'COMING SOON: 1,000', W / 2, H - 12, CRT[1]);
    return crt(c, f);
  };
}

function adLogo(f) {
  const c = screen(CRT[1]);
  rays(c, W / 2, 30, 14, CRT[2], f);
  crown(c, W / 2 - 18, 8, 3, CRT[6]);
  t(c, 'THE BLING BLING KING', W / 2, 44);
  t(c, f ? 'WEAR IT WELL.' : 'A WORD FROM OUR SPONSOR', W / 2, 58, CRT[6]);
  return crt(c, f);
}

// --- the Fart-Peddling Beggar ------------------------------------------------------------------------------

function begTitle(f) {
  const c = screen(CRT[1]);
  brogath(c, W / 2, 18 + f, { sash: 'hide' });
  for (const [x, y] of [[30, 54], [74, 52]]) c.rect(x, y, 4, 4, CRT[3]); // patches on him, printed
  t(c, 'BROGATH THE BASHFUL', W / 2, 56);
  t(c, 'THE FART-PEDDLING BEGGAR', W / 2, 66, CRT[6]);
  return crt(c, f);
}

function stall(c, x, y, w) {
  c.rect(x, y, w, 14, CRT[3]);
  for (let k = 0; k < w; k += 6) c.rect(x + k, y - 8, 3, 8, k % 12 ? CRT[5] : CRT[6]); // the awning
}

function begMarket(f) {
  const c = screen(CRT[1]);
  c.rect(0, 60, W, 18, CRT[2]);
  stall(c, 4, 40, 34);
  stall(c, 66, 40, 34);
  c.ellipse(18, 36, 6, 3, CRT[6]); // loaves
  brogath(c, W / 2, 22, { sash: 'hide' });
  for (const [x, y] of [[34, 30], [70, 26], [64, 34]]) c.ellipse(x + (f ? 2 : 0), y, 3, 2, CRT[5]); // a whiff, going out
  if (f) { c.line(4, 20, 14, 30, CRT[7]); c.line(98, 20, 88, 30, CRT[7]); } // the bakers, ducking
  return crt(c, f);
}

function begSign(f) {
  const c = screen(CRT[1]);
  c.rect(0, 56, W, 22, CRT[2]); // the harbour wall
  for (let x = 0; x < W; x += 10) c.vline(x, 56, H - 1, CRT[1]);
  brogath(c, 36, 26 + f, { sash: 'none' });
  c.rect(56, 22, 44, 26, CRT[7]); // the sign
  c.rect(58, 24, 40, 22, CRT[6]);
  t(c, 'WILL FART', 78, 27, CRT[0]);
  t(c, 'FOR FOOD', 78, 37, CRT[0]);
  c.vline(78, 48, 56, CRT[3]);
  return crt(c, f);
}

function begLedger(f) {
  const c = screen(CRT[1]);
  c.ellipse(W / 2, 30, 8, 9, CRT[6]); // Ledger Billiam: a little narrow man
  c.rect(W / 2 - 7, 38, 14, 22, CRT[4]);
  c.set(W / 2 - 3, 28, CRT[0]); c.set(W / 2 + 3, 28, CRT[0]);
  c.hline(W / 2 - 3, W / 2 + 3, 34, CRT[0]); // a thin smile
  c.line(W / 2 + 10, 30 - f * 2, W / 2 + 18, 44, CRT[7]); // the quill
  c.rect(W / 2 + 14, 44, 16, 12, CRT[7]); // the sign he's painting
  t(c, 'LEDGER BILLIAM', W / 2, 64);
  return crt(c, f);
}

function begExchange(f) {
  const c = screen(CRT[1]);
  c.rect(6, 6, W - 12, 20, CRT[6]);
  t(c, "BROGATH'S GRAND", W / 2, 8, CRT[0]);
  t(c, 'GUST EXCHANGE', W / 2, 17, CRT[0]);
  stall(c, 14, 50, W - 28);
  t(c, 'BOUGHT, SOLD & TRADED', W / 2, 66, CRT[7]);
  brogath(c, W / 2, 30 + f, { sash: 'none', blush: !f });
  return crt(c, f);
}

function begCustomers(f) {
  const c = screen(CRT[1]);
  brogath(c, 22, 24, { sash: 'none' });
  for (let i = 0; i < 3; i++) {
    const x = 56 + i * 16 + (f ? 4 : 0);
    c.ellipse(x, 30, 5, 5, CRT[6]); // a customer, holding his nose
    c.rect(x - 4, 35, 8, 16, CRT[3]);
    c.set(x + 3, 30, CRT[0]);
    c.ellipse(x - 6, 42, 2, 1.5, CRT[7]); // a coin, held out, at arm's length
  }
  t(c, 'SALE', 22, 64, CRT[7]);
  return crt(c, f);
}

const PAIRS = {
  ad_white: adWhite, ad_logo: adLogo, ad_sash1: adSashes(1), ad_sash2: adSashes(2), ad_sash6: adSashes(6), ad_sash_many: adSashes(12),
  beg_title: begTitle, beg_market: begMarket, beg_sign: begSign, beg_ledger: begLedger, beg_exchange: begExchange, beg_customers: begCustomers,
};

export function addPhase14VistaFrames(atlas) {
  for (const [id, fn] of Object.entries(PAIRS)) for (const f of [0, 1]) atlas.add(`${id}_${f}`, fn(f));
}

export const PHASE14_VISTA_FRAMES = Object.keys(PAIRS).flatMap((n) => [`${n}_0`, `${n}_1`]);
