import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { drawText, textWidth } from '../font/drawText.js';
import { token } from './phase10Inserts.js';
import { paintPortrait } from '../portraits/portraitPainter.js';
import { sharkHoldsNose } from '../vista/vistaPhase11.js';

/**
 * Story Phases 11-13 close-ups:
 *   - the storm's tokens (the designated fart man, the budget, the titles,
 *     the butts, the Finger-Puller, the meeting; the complaints; the odds;
 *     the campaign and the debate) and the returned pillow's medal;
 *   - Cheap-O-Rama: the toy sash playset box (ages six and up), the
 *     clearance tag, the pocket edition's cover and its pages (Lord
 *     Gustavio's flutter, the thirty seconds, the flutter clause, the Silence,
 *     Tables A and B), the Grand Dice box and its faces, the note that came
 *     with six more, the Fan Mega-Pack and the Build-Your-Own S.E.S. kit;
 *   - Garrick's org chart (crayon, on a Frog Grog label), the captain's plan
 *     (on the back of a box), the suspension rules, the old sash under
 *     review, DO NOT OPEN. IT GROWLS.;
 *   - the captain's face, collapsing; the Mark II, the shark holding its nose.
 */
const INK = PAL.ink;
const CARD = { d: '#8a6a3a', m: '#b89058', l: '#d8b47a', h: '#ecd0a0' };
export const CHEAP = { red: '#c8242c', redD: '#8a141c', gold: '#f4dc6c', paper: '#f4ecd8', paperD: '#d8ccb0', ink: '#3a2a1a' };
const CRAY = { paper: '#efe4c4', brown: '#8a5426', red: '#d8322a', blue: '#2f64d0', green: '#3a9a3a', burg: '#7a1826' };

export function lines(c, list, x, y, color, { gap = 10, center = true, shadow = null } = {}) {
  list.forEach((t, i) => drawText(c, t, x, y + i * gap, color, { center, shadow }));
}
export const widest = (list) => Math.max(...list.map((t) => textWidth(t)));

/** A cheap printed page from the pocket edition: thin paper, a staple, ink a bit off register. */
export function pocketPage(text, { title = null, drawing = null, torn = false } = {}) {
  const rows = text.split('|');
  const W = Math.max(180, widest(rows) + 30);
  const H = 40 + rows.length * 10 + (drawing ? 56 : 0);
  const c = new PixelCanvas(W, H);
  c.fill(CHEAP.paper);
  for (let y = 0; y < H; y += 3) c.hline(0, W - 1, y, '#efe6d0');
  c.rect(4, 4, 3, 8, '#a8acb4'); // the staple
  if (title) drawText(c, title, W / 2, 8, CHEAP.red, { center: true });
  lines(c, rows, W / 2, title ? 22 : 12, CHEAP.ink);
  if (drawing) drawing(c, Math.round(W / 2), H - 58);
  drawText(c, 'CHEAP-O-RAMA POCKET EDITION', W - 4 - textWidth('CHEAP-O-RAMA POCKET EDITION'), H - 10, CHEAP.paperD);
  if (torn) c.poly([[W - 24, 0], [W, 0], [W, 18]], '#00000000');
  c.strokeRect(0, 0, W, H, INK);
  return c;
}

/** A printed figure in a sash, the sash lifting: flap, flap. */
export function flapDrawing(c, cx, y) {
  c.ellipse(cx, y + 10, 8, 8, '#e8b48a');
  c.set(cx - 3, y + 9, CHEAP.ink);
  c.set(cx + 3, y + 9, CHEAP.ink);
  c.ellipse(cx, y + 14, 2, 2, CHEAP.ink); // an O of horror
  c.rect(cx - 9, y + 18, 18, 24, '#3a6a3a');
  for (let k = 0; k < 40; k++) {
    const x = cx - 20 + k;
    const yy = y + 24 + Math.round(Math.sin(k * 0.45) * 4) - (k > 26 ? Math.round((k - 26) * 0.8) : 0);
    c.rect(x, yy, 1, 3, k % 6 === 0 ? CHEAP.gold : CHEAP.red);
  }
  for (const [dx, dy] of [[-30, 20], [26, 14], [30, 22]]) c.hline(cx + dx, cx + dx + 4, y + dy, CHEAP.ink); // motion lines
  drawText(c, 'FLAP.', cx - 50, y + 4, CHEAP.red);
  drawText(c, 'FLAP.', cx + 26, y + 32, CHEAP.red);
}

function diceDrawing(c, cx, y) {
  c.rect(cx - 14, y + 8, 28, 28, '#a874d8');
  c.rect(cx - 14, y + 8, 28, 4, '#c8a0f0');
  for (const [dx, dy] of [[-7, 16], [7, 16], [0, 22], [-7, 28], [7, 28]]) c.ellipse(cx + dx, y + dy, 2, 2, '#f8f0ff');
}

function cover() {
  const W = 180;
  const H = 150;
  const c = new PixelCanvas(W, H);
  c.fill(CHEAP.red);
  c.rect(8, 8, W - 16, H - 16, CHEAP.redD);
  c.rect(12, 12, W - 24, H - 24, CHEAP.red);
  lines(c, ['COMPLETE GRAND', 'STENCHMASTER', 'LEGENDS'], W / 2, 22, CHEAP.gold, { shadow: CHEAP.redD });
  // a crown over a nose, printed slightly off
  c.poly([[70, 92], [70, 70], [80, 80], [90, 64], [100, 80], [110, 70], [110, 92]], CHEAP.gold);
  c.ellipse(91, 104, 8, 10, '#f0c0a0');
  lines(c, ['POCKET EDITION', 'FREE WITH EVERY SASH!'], W / 2, 122, CHEAP.gold);
  c.outline(INK);
  return c;
}

/** The toy sash playset box: two smiling cardboard sash holders on the front, AGES SIX AND UP. */
function toySashBox() {
  const W = 220;
  const H = 140;
  const c = new PixelCanvas(W, H);
  c.fill(CHEAP.red);
  c.rect(6, 6, W - 12, H - 12, CHEAP.gold);
  c.rect(10, 10, W - 20, H - 20, '#f8f0d8');
  lines(c, ['GRAND STENCHMASTER', 'CEREMONIAL SASH PLAYSET!'], W / 2, 16, CHEAP.red);
  for (const x of [56, 164]) {
    c.ellipse(x, 66, 12, 12, '#e8b48a'); // a smiling sash holder
    c.set(x - 4, 64, INK); c.set(x + 4, 64, INK);
    for (let k = -5; k <= 5; k++) c.set(x + k, 70 + Math.round(k * k / 10), INK);
    c.rect(x - 12, 80, 24, 30, '#3a5a8a');
  }
  for (let k = 0; k < 80; k++) c.rect(70 + k, 82 + Math.round(Math.sin(k * 0.2) * 4), 2, 6, k % 8 === 0 ? CHEAP.gold : CHEAP.red); // the sash between them
  lines(c, ['AGES SIX AND UP', 'NO REAL FLATULENCE REQUIRED'], W / 2, 114, CHEAP.ink);
  c.outline(INK);
  return c;
}

function clearanceTag() {
  const W = 170;
  const H = 70;
  const c = new PixelCanvas(W, H);
  c.poly([[20, 0], [W, 0], [W, H], [20, H], [0, H / 2]], '#f8f0c8');
  c.ellipseOutline(14, H / 2, 4, 4, CHEAP.ink);
  c.line(0, H / 2, -10, H / 2 - 20, '#c8b080');
  lines(c, ['SASH, CEREMONIAL.', 'NOVELTY ITEM.'], 96, 10, CHEAP.ink);
  lines(c, ['CLEARANCE.', 'FINAL SALE.'], 96, 36, CHEAP.red);
  c.outline(INK);
  return c;
}

/** Garrick's org chart: crayon on the back of a Frog Grog label. */
function orgChart() {
  const W = 230;
  const H = 150;
  const c = new PixelCanvas(W, H);
  c.fill(CRAY.paper);
  c.rect(0, 0, W, 8, '#4a7a2a'); // the label's green edge, showing round the back
  const box = (x, y, w, text, col) => {
    c.strokeRect(x - w / 2, y, w, 14, col);
    drawText(c, text, x, y + 4, col, { center: true });
  };
  box(W / 2, 14, 130, 'GRAND STENCHMASTER', CRAY.burg);
  c.vline(W / 2, 28, 40, CRAY.brown);
  box(W / 2, 40, 110, 'GRAND STEWARD', CRAY.blue);
  box(W / 2, 62, 120, 'ASSISTANT STEWARD', CRAY.blue);
  c.vline(W / 2, 54, 62, CRAY.brown);
  c.hline(46, W - 46, 84, CRAY.brown);
  box(56, 90, 90, 'SASH (LEFT)', CRAY.green);
  box(W - 56, 90, 90, 'SASH (RIGHT)', CRAY.green);
  box(W / 2, 112, 150, 'FLUTTER OBSERVERS', CRAY.brown);
  drawText(c, 'GRAND FINGER-PULLER: VACANT', W / 2, 134, CRAY.red, { center: true });
  c.outline(INK);
  return c;
}

/** The plan, in the captain's hand, on the back of a sash playset box. */
function antiDicePlan() {
  const rows = ['THE PLAN', '1. HOLD SASH 30 SECONDS (ME)', '2. LET IT FLUTTER', '3. HE MUST NOTICE', '4. CREW GASP AND POINT', '5. 21 DAYS', '6. NO DICE. NO DICE. NO DICE.'];
  const W = widest(rows) + 40;
  const H = 120;
  const c = new PixelCanvas(W, H);
  c.fill(CARD.l);
  for (let x = 0; x < W; x += 5) c.vline(x, 0, H - 1, CARD.h); // corrugation, through the print
  rows.forEach((t, i) => drawText(c, t, 16, 10 + i * 14, i === 0 ? '#a8241c' : '#1a1a2a'));
  c.line(14, 110, W - 20, 104, '#a8241c'); // underlined, hard
  c.outline(INK);
  return c;
}

export function noteCard(rows, { crown = true, w = 0 } = {}) {
  const W = Math.max(w, widest(rows) + 30);
  const H = 30 + rows.length * 11 + (crown ? 22 : 0);
  const c = new PixelCanvas(W, H);
  c.fill('#f8f4ec');
  c.strokeRect(3, 3, W - 6, H - 6, '#d8b440');
  if (crown) c.poly([[W / 2 - 12, 22], [W / 2 - 12, 10], [W / 2 - 6, 16], [W / 2, 6], [W / 2 + 6, 16], [W / 2 + 12, 10], [W / 2 + 12, 22]], '#d8b440');
  lines(c, rows, W / 2, crown ? 30 : 12, '#3a2a1a', { gap: 11 });
  c.outline(INK);
  return c;
}

function grandDiceBox() {
  const W = 200;
  const H = 130;
  const c = new PixelCanvas(W, H);
  c.fill('#5a3088');
  c.rect(6, 6, W - 12, H - 12, '#7a48b0');
  lines(c, ['THE GRAND DICE', 'OF GRANDNESS'], W / 2, 14, '#f4dc6c', { shadow: '#3a1868' });
  diceDrawing(c, W / 2, 40);
  lines(c, ['DISPLAY MODEL', 'NOT FOR SALE'], W / 2, 98, '#e8d8f8');
  c.outline(INK);
  return c;
}

function grandDiceFaces() {
  const rows = ['1: 30 MINUTES', '2: 1 HOUR', '3: ONE DAY', '4: 3 DAYS', '5: 1 WEEK', '6: 3 MONTHS'];
  const W = 220;
  const H = 120;
  const c = new PixelCanvas(W, H);
  c.fill('#efe6f8');
  rows.forEach((t, i) => {
    const x = i < 3 ? 14 : 116;
    const y = 12 + (i % 3) * 34;
    c.rect(x, y, 24, 24, '#a874d8');
    for (let k = 0; k <= i; k++) c.ellipse(x + 5 + (k % 3) * 7, y + 6 + Math.floor(k / 3) * 10, 2, 2, '#f8f0ff');
    drawText(c, t.slice(3), x + 30, y + 8, i === 2 ? '#c8242c' : '#3a1868');
  });
  c.rect(14 + 0, 12 + 2 * 34 + 26, 24, 4, '#f0e080'); // the sticker under the three: ONE DAY
  c.outline(INK);
  return c;
}

function rulesPage() {
  const rows = ['DURING A STENCH SILENCE', 'THE STENCHMASTER IS SUSPENDED.', '', 'NO TITLE.', 'NO DECREES.', 'NO GRAND FEASTS.', 'NO GRAND NAPS.', 'NO REGALIA.', 'NO RELEASES.'];
  return pocketPage(rows.join('|'), { title: 'THE STENCH SILENCE' });
}

/** The old sash, laid out flat under review: labelled. */
function oldSashFoul() {
  const W = 240;
  const H = 110;
  const c = new PixelCanvas(W, H);
  c.fill('#3a2418');
  for (let x = 20; x < 220; x++) {
    const y = 46 + Math.round(Math.sin(x * 0.05) * 4);
    c.rect(x, y, 1, 14, x % 7 === 0 ? '#9a6e14' : '#c8a83a');
    c.set(x, y, '#5e1624');
    c.set(x, y + 13, '#5e1624');
  }
  for (const [x, y, r] of [[60, 52, 5], [130, 54, 7], [180, 50, 4]]) c.ellipse(x, y, r, r - 1, '#8a8a3a'); // stains
  c.rect(110, 48, 10, 8, '#6a9a2c'); // the nose
  drawText(c, 'MUSTARD (FORMERLY)', 14, 10, '#f0e8d0');
  drawText(c, 'BURGUNDY (STILL)', 140, 24, '#f0e8d0');
  drawText(c, 'A NOSE (EMBROIDERED)', 70, 76, '#f0e8d0');
  drawText(c, 'STAINS (MANY)', 130, 92, '#f0e8d0');
  c.outline(INK);
  return c;
}

export function sign(rows, { crate = false } = {}) {
  const W = widest(rows) + 34;
  const H = 30 + rows.length * 14;
  const c = new PixelCanvas(W, H);
  c.fill(crate ? CARD.m : '#a8784a');
  for (let y = 0; y < H; y += 9) c.hline(0, W - 1, y, crate ? CARD.d : '#7a522a');
  for (const [x, y] of [[4, 4], [W - 6, 4], [4, H - 6], [W - 6, H - 6]]) c.rect(x, y, 2, 2, '#c8ccd4');
  lines(c, rows, W / 2, 14, '#1a1a1a', { gap: 14 });
  c.outline(INK);
  return c;
}

export function bigBox(rows, { color = CHEAP.red, dark = CHEAP.redD, logo = null } = {}) {
  const W = Math.max(220, widest(rows) + 40);
  const H = 64 + rows.length * 11;
  const c = new PixelCanvas(W, H);
  c.fill(color);
  c.rect(6, 6, W - 12, H - 12, dark);
  c.rect(10, 10, W - 20, H - 20, color);
  if (logo) logo(c, Math.round(W / 2), 16);
  lines(c, rows, W / 2, 50, CHEAP.gold, { gap: 11, shadow: dark });
  c.outline(INK);
  return c;
}

function crownNose(c, cx, y) {
  c.poly([[cx - 14, y + 16], [cx - 14, y + 4], [cx - 7, y + 10], [cx, y], [cx + 7, y + 10], [cx + 14, y + 4], [cx + 14, y + 16]], CHEAP.gold);
  c.ellipse(cx, y + 24, 5, 6, '#f0c0a0');
}

function forksTv(c, cx, y) {
  c.rect(cx - 16, y + 8, 32, 22, '#6a3a1c');
  c.rect(cx - 12, y + 12, 20, 14, '#2a1a3a');
  for (const dx of [-6, 0, 6]) c.vline(cx + dx, y, y + 8, '#c8ccd4');
}

/** The captain's face, collapsing (his own portrait, in the trial gear, close). */
function captainFace() {
  const app = {
    build: 'large', skin: 'tan', hair: { style: 'long', color: 'black' }, beard: { style: 'great', color: 'stinkblack' },
    hat: { style: 'tricorn', color: 'black', trim: 'gold' },
    outfit: { style: 'longcoat', primary: 'crimson', secondary: 'white', pants: 'black', boots: 'stained', trim: 'gold' },
    extras: ['baldric', 'goggles', 'rope'],
  };
  const p = paintPortrait(app, { face: 'broad', nose: 'broad', brows: 'heavy', eyeColor: '#2a1a10' }, 'devastated');
  const s = 3;
  const c = new PixelCanvas(p.width * s + 8, p.height * s + 8);
  c.fill('#1a1414');
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    const px = p.get(x, y);
    if (px >>> 24) c.rect(4 + x * s, 4 + y * s, s, s, px);
  }
  c.strokeRect(0, 0, c.width, c.height, INK);
  return c;
}

/** The Mark II, on by itself: the shark on the screen, holding its nose. */
function mk2Nose() {
  const scr = sharkHoldsNose();
  const s = 2;
  const c = new PixelCanvas(scr.width * s + 24, scr.height * s + 24);
  c.fill('#6a4a2a');
  c.rect(8, 8, c.width - 16, c.height - 16, '#2a1a10');
  for (let y = 0; y < scr.height; y++) for (let x = 0; x < scr.width; x++) c.rect(12 + x * s, 12 + y * s, s, s, scr.get(x, y));
  c.outline(INK);
  return c;
}

/** The returned pillow's participation medal, pinned through it. */
function pillowTag() {
  return token('NO THANKS.|RETURN TO SENDER.|TOO STINKY.', {
    picture: (c, cx0, y) => {
      const cx = Math.round(cx0);
      c.rect(cx - 26, y + 4, 52, 22, '#e8dca0');
      c.set(cx - 10, y + 12, INK);
      c.set(cx + 10, y + 12, INK);
      c.hline(cx - 3, cx + 3, y + 18, '#a86a5a');
    },
  });
}

const TOKENS = {
  token_fart_man: 'WHY DOES A PIRATE SHIP|HAVE A DESIGNATED|FART MAN?',
  token_budget: 'STENCHMASTER DEPARTMENT|BUDGET: 100%.|EVERYTHING ELSE: 0%.',
  token_titles: 'UNNECESSARY JOB TITLES|OF THE MONTH!',
  token_butts: 'WHY HIRE A FART MAN|WHEN THE CREW|ALREADY HAS BUTTS?',
  token_finger_puller: 'NOW HIRING:|GRAND FINGER-PULLER.|NO EXPERIENCE NECESSARY.|ASK YOUR CAPTAIN!',
  token_meeting: 'WE KNOW ABOUT YOUR|LITTLE MEETING.|GOOD LUCK, CAPTAIN!',
  token_buttquake: 'COMPLAINT:|EXCESSIVE BUTTQUAKE.',
  token_noise: 'NOISE COMPLAINT:|SOME OF US ARE TRYING|TO ROTATE.',
  token_weather: 'WEATHER CONTAMINATION|NOTICE.',
  token_standards: 'LUXURY STANDARDS|HAVE NOT BEEN MET.|1 STAR.',
  token_odds: "SHARK BOOK: TODAY'S ODDS|ROLLS BADLY 3 TO 1|ROLLS WELL 1 TO 3",
  token_return: 'NO THANKS (AGAIN).|THE MANAGEMENT.',
  token_smell: 'SMELL COMPLAINT:|WHATEVER THAT IS,|TURN IT OFF.',
  token_noise_2: 'NOISE COMPLAINT (AGAIN):|WE CAN HEAR|THE HUMMING.',
  token_vote_brogath: 'VOTE CAPTAIN BROGATH|FOR CAPTAIN!|(TREASURE NOT GUARANTEED.)',
  token_vote_stinkbeard: 'STINKBEARD FOR CAPTAIN!|NO FARTS! NO BROGATHS!|NO FUN!',
  token_hold_my_sash: 'HOLD MY SASH:|A HOSTILE TAKEOVER.',
  token_debate: 'TONIGHT: THE GREAT|BROGATH DEBATE.|CAPTAIN v. BROGATH|v. BROGATH v. BROGATH',
};

const PAGES = {
  pocket_page_gustavio: ['THE FIRST GREAT SASH FLUTTER|LORD GUSTAVIO BOTTOMSWORTH|FLAP. FLAP. THREE WEEKS.', { drawing: flapDrawing }],
  pocket_page_thirty: ['THE SASH MUST FIRST BE|PROPERLY HELD FOR THIRTY (30)|SECONDS BY THE HIGHEST-|RANKING OFFICER PRESENT.', {}],
  pocket_page_clause: ['AFTER THIRTY SECONDS, THE|HIGHEST OFFICER MAY ALLOW|THE SASH TO FLUTTER. THE|STENCHMASTER MUST NOTICE IT.|OBSERVERS MAY GASP.', { drawing: flapDrawing }],
  pocket_page_silence: ['PENALTY: THE TRADITIONAL|STENCH SILENCE OF|TWENTY-ONE (21) DAYS.|NO RELEASES. NO TOOTS.|NO EXCEPTIONS.', {}],
  pocket_page_table_a: ["OR, AT THE STENCHMASTER'S|REQUEST: ROLL THE|GRAND DICE OF GRANDNESS.|(SEE TABLE B.)", { drawing: diceDrawing }],
  pocket_page_table_b: ['TABLE B (REVISED)|1: 30 MIN  2: 1 HOUR|3: 6 HOURS  4: 3 DAYS|5: 1 WEEK  6: 3 MONTHS', { torn: true }],
};

export function addPhase11Inserts(atlas) {
  for (const [id, text] of Object.entries(TOKENS)) atlas.add(id, token(text));
  atlas.add('pillow_tag', pillowTag());
  for (const [id, [text, opts]] of Object.entries(PAGES)) atlas.add(id, pocketPage(text, opts));
  atlas.add('pocket_book_new', cover());
  atlas.add('toy_sash_box', toySashBox());
  atlas.add('sash_clearance_tag', clearanceTag());
  atlas.add('stenchmaster_org_chart', orgChart());
  atlas.add('anti_dice_plan', antiDicePlan());
  atlas.add('bbk_dice_note', noteCard(['ENOUGH THAT NOBODY CAN CLAIM', 'THEY MYSTERIOUSLY WENT MISSING.', 'ENJOY THE CEREMONY!', '- B.B.K.']));
  atlas.add('grand_dice_box', grandDiceBox());
  atlas.add('grand_dice_faces', grandDiceFaces());
  atlas.add('suspension_rules', rulesPage());
  atlas.add('old_sash_foul', oldSashFoul());
  atlas.add('sign_it_growls', sign(['DO NOT OPEN.', 'IT GROWLS.']));
  atlas.add('megapack_box', bigBox(['GRAND STENCHMASTER', 'FAN MEGA-PACK!', 'COLLECT THEM ALL!', '(ALL INCLUDED.)'], { logo: crownNose }));
  atlas.add('ses_kit_box', bigBox(['BUILD-YOUR-OWN STENCHMASTER', 'ENTERTAINMENT SYSTEM KIT', 'AGES EIGHT AND UP', 'ADULT SUPERVISION', 'STRONGLY RECOMMENDED'], { color: '#3a6a9a', dark: '#1e3a5a', logo: forksTv }));
  atlas.add('captain_face_collapse', captainFace());
  atlas.add('mk2_glitch_nose', mk2Nose());
}

export const PHASE11_INSERT_NAMES = [
  ...Object.keys(TOKENS), 'pillow_tag', ...Object.keys(PAGES), 'pocket_book_new', 'toy_sash_box', 'sash_clearance_tag',
  'stenchmaster_org_chart', 'anti_dice_plan', 'bbk_dice_note', 'grand_dice_box', 'grand_dice_faces', 'suspension_rules',
  'old_sash_foul', 'sign_it_growls', 'megapack_box', 'ses_kit_box', 'captain_face_collapse', 'mk2_glitch_nose',
];
