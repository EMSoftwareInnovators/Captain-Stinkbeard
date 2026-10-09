import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { drawText, textWidth } from '../font/drawText.js';
import { token } from './phase10Inserts.js';
import { CHEAP, lines, widest, pocketPage, flapDrawing, noteCard, sign } from './phase11Inserts.js';

/**
 * Story Phase 14 close-ups (RETURN OF BROGATH):
 *   - the treasure-room door's newer signs (DANGEROUS CLOUD INSIDE; CAPTAIN:
 *     THIS MEANS YOU) and Gristle's original, and the one at the foot of the
 *     hold stairs: BROGATH NEVER GOES NEAR THE TREASURE ROOM;
 *   - the pocket edition (the established Cheap-O-Rama pocket edition of the
 *     COMPLETE GRAND STENCHMASTER LEGENDS): the second treasure catastrophe,
 *     the Grand Economy of Farts (an exchange table, the bakery, the rope
 *     merchant's bucket, the undertaker), WHEN BROGATH CEASETH TO BE BASHFUL
 *     (no pictures: they didn't dare), dispersal, steel, and the armour;
 *   - Pete's slate (the five ingredients; the sums);
 *   - the Bling Bling King's catalogue, Brogath's receipt, one Grand Token,
 *     the teller's badge, Grandmother Gustilda's rating, the HOLIDAY BRANCH;
 *   - the clock: 0:00, and 10:47.
 */
const INK = PAL.ink;
const SLATE = { bg: '#2a2e32', frame: '#8a6a3a', chalk: '#e8e8e0', dim: '#a8aca8' };

function hazardSign(rows) {
  const W = widest(rows) + 40;
  const H = 34 + rows.length * 14;
  const c = new PixelCanvas(W, H);
  c.fill('#f4dc6c');
  for (let x = -H; x < W; x += 12) c.line(x, H - 1, x + 6, H - 7, '#2a2a2a');
  c.poly([[14, 8], [24, 26], [4, 26]], '#2a2a2a');
  c.poly([[14, 12], [20, 23], [8, 23]], '#f4dc6c');
  c.vline(14, 15, 19, '#2a2a2a');
  c.set(14, 21, '#2a2a2a');
  lines(c, rows, W / 2 + 10, 10, '#2a2a2a', { gap: 14 });
  c.outline(INK);
  return c;
}

/** A coin heap, a beam, a cabin boy pointing: 'OOH. FLAPPY.' */
function coinsDrawing(c, cx, y) {
  c.rect(cx - 50, y + 4, 100, 5, '#6a4a28'); // the beam
  for (let i = 0; i < 26; i++) {
    const x = cx - 40 + ((i * 37) % 80);
    const yy = y + 34 + ((i * 13) % 14);
    c.ellipse(x, yy, 3, 1.5, i % 3 ? '#e8c850' : '#b8962c');
  }
  c.ellipse(cx, y + 22, 7, 7, '#e8b48a'); // Brogath, bowing to the beam
  c.rect(cx - 7, y + 28, 14, 14, '#6a4a8a');
  c.set(cx - 3, y + 21, '#f08a9a');
  c.set(cx + 3, y + 21, '#f08a9a');
  drawText(c, 'SORRY.', cx + 14, y + 12, CHEAP.red);
}

function blastDrawing(c, cx, y) {
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    c.line(cx, y + 26, cx + Math.round(Math.cos(a) * 44), y + 26 + Math.round(Math.sin(a) * 22), i % 2 ? '#c8a83a' : '#8a7a3a');
  }
  c.ellipse(cx, y + 26, 10, 8, '#e0d488');
  for (const [dx, dy] of [[-40, 4], [36, 8], [-30, 44], [42, 40], [0, 2]]) c.ellipse(cx + dx, y + dy, 3, 2, '#e8c850');
  drawText(c, 'BEYOND BROKE.', cx - textWidth('BEYOND BROKE.') / 2, y + 48, CHEAP.red);
}

function economyTable() {
  const rows = [
    '10 GUST PIECES  =  1 WIND CROWN',
    '12 WIND CROWNS  =  1 ATMOSPHERIC DOUBLOON',
    '1 GRAND GUST  =  PRICELESS (NOT FOR SALE)',
    '',
    'BACKED BY THE INTERNAL ATMOSPHERIC RESERVES',
    'HELD IN THE BEAN TREASURY',
  ];
  return pocketPage(rows.join('|'), { title: 'THE GRAND ECONOMY OF FARTS' });
}

function breadDrawing(c, cx, y) {
  c.rect(cx - 30, y + 10, 60, 32, '#c8a070'); // the bakery
  c.poly([[cx - 34, y + 10], [cx, y - 4], [cx + 34, y + 10]], '#8a3a2a');
  c.rect(cx - 8, y + 24, 16, 18, '#3a2a1a');
  for (const [dx, dy] of [[40, 20], [46, 28], [38, 34]]) c.ellipse(cx + dx, y + dy, 5, 3, '#d8a050'); // loaves, flying
  drawText(c, 'TRANSACTION: SUCCESSFUL', cx - textWidth('TRANSACTION: SUCCESSFUL') / 2, y + 46, CHEAP.red);
}

function bucketDrawing(c, cx, y) {
  for (const x of [cx - 30, cx, cx + 30]) {
    c.rect(x - 8, y + 6, 16, 16, '#5a7aa8');
    c.strokeRect(x - 8, y + 6, 16, 16, '#3a2a1a');
    c.line(x - 8, y + 6, x + 8, y + 22, '#f0f4f8');
  }
  c.rect(cx + 40, y + 10, 8, 8, '#8a6a3a'); // the bucket, still going
  c.hline(cx + 26, cx + 38, y + 14, '#3a2a1a');
  drawText(c, 'FIRST FORMAL ATMOSPHERIC TRANSACTION', cx - textWidth('FIRST FORMAL ATMOSPHERIC TRANSACTION') / 2, y + 34, CHEAP.red);
}

function coffinDrawing(c, cx, y) {
  c.poly([[cx - 10, y + 2], [cx + 10, y + 2], [cx + 14, y + 12], [cx + 8, y + 40], [cx - 8, y + 40], [cx - 14, y + 12]], '#5a3a1a');
  for (const [dx, dy] of [[-26, 10], [24, 16], [-22, 30], [28, 34]]) c.hline(cx + dx, cx + dx + 8, y + dy, '#8a7a3a');
  drawText(c, 'PAID IN FULL.', cx - textWidth('PAID IN FULL.') / 2, y + 46, CHEAP.red);
}

function steelDrawing(c, cx, y) {
  const mats = [['WOOD', '#8a5a2a'], ['STONE', '#8a8a8a'], ['IRON', '#5a5e66'], ['STEEL', '#b4bcc8']];
  mats.forEach(([name, col], i) => {
    const x = cx - 66 + i * 44;
    c.rect(x, y + 6, 20, 30, col);
    c.ellipse(x + 10, y + 4, 6, 5, col);
    if (name === 'STEEL') { c.strokeRect(x - 1, y + 5, 22, 32, '#d83a2a'); c.hline(x + 2, x + 17, y + 18, '#f4f8ff'); }
    drawText(c, name, x + 10 - textWidth(name) / 2, y + 40, name === 'STEEL' ? CHEAP.red : CHEAP.ink);
  });
}

function slate(rows, { title = null } = {}) {
  const W = Math.max(200, widest(rows) + 40);
  const H = 30 + rows.length * 12 + (title ? 12 : 0);
  const c = new PixelCanvas(W, H);
  c.fill(SLATE.frame);
  c.rect(5, 5, W - 10, H - 10, SLATE.bg);
  for (let i = 0; i < 40; i++) c.set(8 + ((i * 53) % (W - 16)), 8 + ((i * 29) % (H - 16)), '#3a3e42'); // old chalk dust
  if (title) drawText(c, title, W / 2, 10, SLATE.dim, { center: true });
  lines(c, rows, W / 2, title ? 24 : 14, SLATE.chalk, { gap: 12 });
  c.outline(INK);
  return c;
}

function tellerBadge() {
  const rows = ['CAPTAIN STINKBEARD', 'ACTING GRAND TELLER', 'OF GRAND ATMOSPHERIC ASSETS'];
  const W = widest(rows) + 40;
  const H = 76;
  const c = new PixelCanvas(W, H);
  c.fill('#00000000');
  c.rect(4, 6, W - 8, H - 18, '#e0b84a');
  c.rect(7, 9, W - 14, H - 24, '#c8a038');
  c.strokeRect(7, 9, W - 14, H - 24, '#8a6a20');
  lines(c, rows, W / 2, 14, '#3a2a10', { gap: 11 });
  drawText(c, 'YOUR GAS IS OUR BUSINESS!', W / 2, 50, '#6a4a10', { center: true });
  c.rect(W / 2 - 3, H - 12, 6, 10, '#8a8e96'); // the pin (bent)
  c.set(W / 2 + 3, H - 3, '#8a8e96');
  c.outline(INK);
  return c;
}

function ornament() {
  const W = 200;
  const H = 150;
  const c = new PixelCanvas(W, H);
  c.fill('#1a2a1e');
  c.vline(W / 2, 0, 20, '#c8242c');
  c.ellipse(W / 2, 22, 5, 3, '#e0b84a');
  c.ellipse(W / 2, 72, 46, 46, '#cfe0d8a0'); // the glass
  c.rect(W / 2 - 28, 56, 56, 34, '#2e6a3a'); // the little bank
  c.poly([[W / 2 - 32, 56], [W / 2, 40], [W / 2 + 32, 56]], '#e0b84a');
  for (let x = W / 2 - 24; x < W / 2 + 24; x += 5) c.vline(x, 62, 86, '#f4dc6c');
  c.ellipse(W / 2 + 18, 80, 6, 6, '#8a8e9a'); // the vault door
  for (let i = 0; i < 20; i++) c.set(W / 2 - 40 + ((i * 37) % 80), 34 + ((i * 23) % 70), '#ffffff'); // snow inside it, somehow
  c.ellipseOutline(W / 2, 72, 46, 46, '#e8f0ec');
  drawText(c, 'HOLIDAY BRANCH', W / 2, 124, '#f4dc6c', { center: true });
  drawText(c, 'NO TELLER REQUIRED!', W / 2, 136, '#e8e4d8', { center: true });
  c.outline(INK);
  return c;
}

function clock(text, { sub = null } = {}) {
  const W = 160;
  const H = sub ? 122 : 108;
  const c = new PixelCanvas(W, H);
  c.fill('#1a1416');
  c.ellipse(W / 2, 50, 40, 40, '#e8e0cc');
  c.ellipseOutline(W / 2, 50, 40, 40, '#8a6a3a');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    c.set(Math.round(W / 2 + Math.sin(a) * 34), Math.round(50 - Math.cos(a) * 34), '#3a2a1a');
  }
  const [m, s] = text.split(':').map(Number);
  const ma = (m / 60) * Math.PI * 2 * 5; // ten minutes is a long way round, on this clock
  const sa = (s / 60) * Math.PI * 2;
  c.line(W / 2, 50, Math.round(W / 2 + Math.sin(ma) * 22), Math.round(50 - Math.cos(ma) * 22), '#3a2a1a');
  c.line(W / 2, 50, Math.round(W / 2 + Math.sin(sa) * 32), Math.round(50 - Math.cos(sa) * 32), '#c83a2a');
  drawText(c, text, W / 2, 96, '#f4dc6c', { center: true });
  if (sub) drawText(c, sub, W / 2, 108, '#e8e0cc', { center: true });
  c.outline(INK);
  return c;
}

export function addPhase14Inserts(atlas) {
  atlas.add('sign_do_not_open', sign(['DO NOT OPEN.', 'YES, SERIOUSLY.']));
  atlas.add('sign_dangerous_cloud', hazardSign(['DANGEROUS', 'CLOUD INSIDE.']));
  atlas.add('sign_this_means_you', sign(['CAPTAIN:', 'THIS MEANS YOU.'], { crate: true }));
  atlas.add('sign_brogath_never', sign(['BROGATH NEVER GOES', 'NEAR THE TREASURE ROOM.', '(THIS IS FOR HIS OWN GOOD.)']));
  atlas.add('codex_second_catastrophe', pocketPage("NOT THE EXCAVATION.|A SECOND DISASTER, WHICH BROGATH|ASKED THE CHRONICLERS NOT TO|WRITE DOWN. THEY WROTE IT DOWN.", { title: 'THE SECOND TREASURE CATASTROPHE', drawing: flapDrawing }));
  atlas.add('codex_coins_beam', pocketPage('HE TRIPPED. HE SLIPPED ON A DOUBLOON.|HE HIT HIS HEAD ON A BEAM.|HE APOLOGISED TO THE BEAM.', { drawing: coinsDrawing }));
  atlas.add('codex_annihilation', pocketPage('THE TREASURE-ANNIHILATION FART.|SMASHED. SCATTERED. BLASTED THROUGH|THREE DECKS AND INTO A SHARKSTORM.', { drawing: blastDrawing }));
  atlas.add('codex_economy', economyTable());
  atlas.add('codex_bakery', pocketPage('FOUR GUST PIECES FOR A LOAF.|THE BAKER DECLINED.|THE BAKERY DID NOT.', { title: 'BROGATH ATTEMPTS TO BUY BREAD', drawing: breadDrawing }));
  atlas.add('codex_rope_bucket', pocketPage('ONE COIL OF ROPE, FOR ONE FART|STRONG ENOUGH TO MOVE A BUCKET.', { drawing: bucketDrawing }));
  atlas.add('codex_undertaker', pocketPage('HIS FUNERAL, TO BE PAID FOR|WITH HIS FINAL FART.|THE UNDERTAKER REFUSED.|THE FART HAPPENED ANYWAY.', { drawing: coffinDrawing }));
  atlas.add('codex_ceaseth', pocketPage('LET ALL PRESENT STAND WELL BACK.|FOR THE WRATH OF A BASHFUL MAN|IS THE WRATH OF ALL THE YEARS|HE DID NOT HAVE IT.||(NO PICTURES. THEY DID NOT DARE.)', { title: 'WHEN BROGATH CEASETH TO BE BASHFUL' }));
  atlas.add('codex_dispersal', pocketPage('SOAK THE CARD UNTIL IT COLLAPSES.|SPREAD THE FRAGMENTS WIDE.|FAN THE ESSENCE, DAY AND NIGHT.|THIS MAY TAKE SOME MONTHS.', { title: 'ON THE DISPERSAL OF A CARDBOARD STENCHMASTER' }));
  atlas.add('codex_steel_brogath', pocketPage('SHOULD WEAKENED CARD NOT BE TO HAND,|THE ESSENCE WILL TAKE WHATEVER|IS NEAREST.', { drawing: steelDrawing }));
  atlas.add('codex_no_armor', pocketPage('UNDER NO CIRCUMSTANCES|SHOULD A GRAND STENCHMASTER|UNDERGOING DISPERSAL|BE PERMITTED ACCESS|TO A SUIT OF ARMOR.', { title: 'WARNING' }));
  atlas.add('slate_ingredients', slate(['BROGATH.', 'TREASURE.', 'SHARKSTORM.', 'BEANS.', 'FLUTTER.', '', 'ALL FIVE.']));
  atlas.add('slate_sums', slate(['DISPERSAL: 3-6 MONTHS', 'GARRICK FARTS ALLOWED: 0', "GARRICK'S RECORD: 1 DAY", '(LOOKING FOR LOOPHOLES)', '', 'THE SAFE DISPOSAL PLAN', 'IS IMPOSSIBLE.'], { title: "PETE'S SUMS" }));
  atlas.add('bbk_catalogue', token('GRAND CURRENCY!|BE WEALTHY TODAY!|20,000 GRAND TOKENS:|ONE PREMIUM FART|+ 10 SMALL GOLD COINS'));
  atlas.add('receipt_brogath', noteCard(['RECEIVED WITH THANKS:', 'TEN (10) SMALL GOLD COINS', 'AND ONE (1) PREMIUM FART.', 'PAID IN FULL.', '', '— BROGATH THE BASHFUL,', 'BEAN TREASURY']));
  atlas.add('grand_token', token('ONE (1) GRAND TOKEN|OF GRAND CURRENCY|NOT LEGAL TENDER'));
  atlas.add('teller_badge', tellerBadge());
  atlas.add('bank_rating_gustilda', noteCard(['THE GRAND BANK AND GRAND TRUST', 'DEPOSITOR: GRANDMOTHER GUSTILDA', '', 'VALUE: UNMEASURABLE', 'INTENSITY: 10+', 'ABSOLUTELY NOT']));
  atlas.add('holiday_ornament', ornament());
  atlas.add('catastrophe_clock', clock('0:00'));
  atlas.add('catastrophe_clock_end', clock('10:47', { sub: 'AND STILL GOING' }));
}

export const PHASE14_INSERT_NAMES = [
  'sign_do_not_open', 'sign_dangerous_cloud', 'sign_this_means_you', 'sign_brogath_never',
  'codex_second_catastrophe', 'codex_coins_beam', 'codex_annihilation', 'codex_economy', 'codex_bakery', 'codex_rope_bucket',
  'codex_undertaker', 'codex_ceaseth', 'codex_dispersal', 'codex_steel_brogath', 'codex_no_armor',
  'slate_ingredients', 'slate_sums', 'bbk_catalogue', 'receipt_brogath', 'grand_token', 'teller_badge',
  'bank_rating_gustilda', 'holiday_ornament', 'catastrophe_clock', 'catastrophe_clock_end',
];
