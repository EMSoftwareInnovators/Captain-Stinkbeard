import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { drawText } from '../font/drawText.js';
import { token } from './phase10Inserts.js';
import { lines, widest, pocketPage, noteCard, sign } from './phase11Inserts.js';

/**
 * Story Phase 15 close-ups (THE GREAT MELLOWING):
 *   - the pocket edition (the established Cheap-O-Rama pocket edition of the COMPLETE GRAND STENCHMASTER LEGENDS):
 *     Appendix Nine, the crew of Brogath the Bashful (four pages), and the SASH-BACKED LOAN;
 *   - Brogath's Economic Recovery Report; the label on STINKBEARD'S SELECT SCENT OF SKUNK (he did not approve it);
 *   - the Bling Bling King's messages out of the Sharkstorm (POTENTIAL CUSTOMER ACQUISITION; ACCEPTS GOLD, DOES NOT
 *     ACCEPT FARTS; the beard review; no predatory pillows, twice; DUDE. HOLD MY SASH. BUT LIKE... LATER.);
 *   - the safe corner's sign; the Grand Stenchmaster Threat Levels (the chart, and one card per level: no flashing);
 *   - the Bashfulness Branch (its sign, OPEN and CLOSING; the relief teller's badge; 2.3 / 5; the AFTER-HOURS EXPRESS
 *     WINDOW), Lady Whifflebottom's expenses, forms 1A, 12C, 61L and 97Q, the cancelled loan;
 *   - THE CAPTAIN'S RULES.
 */
const INK = PAL.ink;
const PAPER = '#f4ecd8';
const TEXT = '#3a2a1a';
const PURPLE = { d: '#3a1e52', m: '#5a3278', l: '#9468b8' };
const GOLDC = { d: '#9a7418', m: '#d8b032', l: '#f4dc6c' };

export function framed(rows, { bg = PAPER, fg = TEXT, border = '#8a6a3a', title = null, titleBg = null, pad = 14 } = {}) {
  const all = title ? [title, ...rows] : rows;
  const W = Math.max(120, widest(all) + pad * 2);
  const H = 20 + rows.length * 11 + (title ? 16 : 0);
  const c = new PixelCanvas(W, H);
  c.fill(border);
  c.rect(2, 2, W - 4, H - 4, bg);
  let y = 8;
  if (title) {
    if (titleBg) c.rect(4, 4, W - 8, 14, titleBg);
    lines(c, [title], W / 2, 7, titleBg ? '#f4ecd8' : fg, { gap: 11 });
    y += 16;
  }
  lines(c, rows, W / 2, y, fg, { gap: 11 });
  c.outline(INK);
  return c;
}

/** The Grand Stenchmaster Threat Levels: the chart, or one level's card (n). Calm colours: no flashing. */
const LEVELS = ['SUSPICIOUS RUMBLE', 'POSSIBLE SASH EVENT', 'LIKELY RELEASE', 'STRUCTURAL THREAT', 'REGIONAL STENCHMASTER EVENT', 'EVACUATE REALITY'];
const LEVEL_COL = ['#7a9a5a', '#9aa04a', '#c8a03a', '#c8783a', '#b8503a', '#8a3a6a'];
function threatChart() {
  const rows = LEVELS.map((l, i) => `${i + 1}. ${l}`);
  const W = widest(rows) + 40;
  const H = 30 + rows.length * 12;
  const c = new PixelCanvas(W, H);
  c.fill('#2a2438');
  lines(c, ['GRAND STENCHMASTER THREAT LEVELS'], W / 2, 6, '#e8dcf4', { gap: 12 });
  rows.forEach((r, i) => {
    c.rect(8, 22 + i * 12, 8, 8, LEVEL_COL[i]);
    drawText(c, r, 22, 22 + i * 12, '#e8dcf4');
  });
  c.outline(INK);
  return c;
}
function threatCard(n) {
  const rows = [`LEVEL ${n}`, LEVELS[n - 1]];
  const W = Math.max(130, widest(rows) + 40);
  const c = new PixelCanvas(W, 46);
  c.fill('#2a2438');
  c.rect(4, 4, W - 8, 38, LEVEL_COL[n - 1]);
  for (let i = 0; i < n; i++) c.rect(8 + i * 7, 8, 5, 5, '#f4ecd8');
  lines(c, rows, W / 2, 16, '#f4ecd8', { gap: 12 });
  c.outline(INK);
  return c;
}

/** The branch's sign: OPEN SO LONG AS BROGATH REMAINS BASHFUL (or CLOSING). */
function branchSign(closing = false) {
  const rows = closing ? ['THE BASHFULNESS BRANCH', 'CLOSING'] : ['THE GRAND STENCHMASTER\'S GRAND BANK', 'AND GRAND TRUST', 'THE BASHFULNESS BRANCH', 'OPEN SO LONG AS', 'BROGATH REMAINS BASHFUL'];
  return framed(rows, { bg: closing ? '#6a1e2a' : PURPLE.m, fg: GOLDC.l, border: GOLDC.m });
}

/** A form from the stack, with a stamp box. */
export function form(code, title, questions) {
  const rows = [title, '', ...questions, '', '[ STAMP HERE ]'];
  const c = framed(rows, { title: `FORM ${code}`, titleBg: PURPLE.m });
  return c;
}

export function addPhase15Inserts(atlas) {
  // the pocket edition
  atlas.add('pocket_crew_ledger', pocketPage('LEDGER BILLIAM: TWO LEDGERS.|ONE FOR MONEY. ONE FOR THE OTHER THING.||NO-NONSENSE TILDA: SENSIBLE BOOTS,|SENSIBLE HAT (GREEN), A COMPASS|SHE DREW HERSELF.', { title: 'APPENDIX NINE: THE CREW' }));
  atlas.add('pocket_crew_harold', pocketPage('WOBBLY NED GUARDED THE ANCHOR.|NOBODY COULD USE THE ANCHOR.||HALF-MAST HAROLD RAISED EVERYTHING.|INCLUDING LEDGER BILLIAM.'));
  atlas.add('pocket_crew_lost', pocketPage('CAPTAIN-SOMETIMES CLEM.|OLD JEB RATTLEPLANK.|BLIND-EYE MARGERY.||LOST INSIDE THEIR OWN SHIP:|TWO DAYS. CORRIDOR 41.'));
  atlas.add('pocket_crew_elsie', pocketPage('ELSIE BEANWRIGHT, COOK.|NEARLY EVERY PROBLEM REQUIRES BEANS.||SEE: THE MORNING OF MANY WINDS|(VOL. IV, PP. 1-340).'));
  atlas.add('pocket_sash_loan', pocketPage('THE SASH-BACKED LOAN.|THE SASH IS THE COLLATERAL.|THE TELLER MUST HOLD IT, IN BOTH HANDS,|WHILE A GRAND STENCHMASTER RELEASE|IS PERFORMED UPON IT.', { title: 'GRAND FINANCIAL INSTRUMENTS' }));
  // the economy
  atlas.add('recovery_report', framed(['ASSETS BEFORE: 20,000 TOKENS', 'WORTH: NOTHING', '', 'ASSETS AFTER: 40 LOTS', 'WORTH: SOMETHING', '', 'A CREATIVE CONVERSION.'], { title: 'GRAND ECONOMIC RECOVERY REPORT', titleBg: PURPLE.m }));
  atlas.add('select_label', framed(["STINKBEARD'S", 'SELECT SCENT OF SKUNK', '', 'GRANDLY SKUNKY!', 'MYSTERIOUS PIRATE AFTERTASTE!', '', '(NOT APPROVED BY THE CAPTAIN)'], { bg: '#3a4a1e', fg: '#e8f0c0', border: GOLDC.m }));
  atlas.add('bbk_acquisition', token('THE BLING BLING KING|POTENTIAL CUSTOMER|ACQUISITION IN PROGRESS'));
  atlas.add('bbk_no_farts', token('INTERESTED IN WHOLESALE.|THE BLING BLING KING|ACCEPTS GOLD.|DOES NOT ACCEPT FARTS.'));
  atlas.add('bbk_beard_review', token('BEARD RESERVE:|* * * * *|MOST INNOVATIVE PRODUCT|WILL NOT BE STOCKING IT'));
  atlas.add('bbk_no_pillows', token('THE SHARKSTORM|DOES NOT ACCEPT|PREDATORY PILLOWS'));
  atlas.add('bbk_no_pillows_2', token('THE SHARKSTORM STILL|DOES NOT ACCEPT|PREDATORY PILLOWS.|THIS ONE EITHER.'));
  atlas.add('bbk_dude', token('DUDE.|HOLD MY SASH.|BUT LIKE... LATER.'));
  // the visitors
  atlas.add('sign_safe_corner', sign(['SAFE CORNER.', 'NO FLAME WITHIN FORTY FEET', 'OF ANYTHING GRAND.', 'THIS MEANS THE CARDBOARD ONE.', 'AND THE TREASURE ROOM.', 'AND GARRICK.']));
  // the paranoia
  atlas.add('threat_chart', threatChart());
  for (let n = 1; n <= 6; n++) atlas.add(`threat_level_${n}`, threatCard(n));
  // the branch
  atlas.add('branch_sign_open', branchSign(false));
  atlas.add('branch_sign_closing', branchSign(true));
  atlas.add('relief_badge', framed(['THE BASHFULNESS BRANCH', 'CAPTAIN STINKBEARD', 'RELIEF GRAND TELLER'], { bg: GOLDC.m, fg: TEXT, border: GOLDC.d }));
  atlas.add('teller_rating', noteCard(['THE BASHFULNESS BRANCH', 'RELIEF TELLER: CAPT. STINKBEARD', '', 'CUSTOMER RATING: 2.3 / 5', 'CUSTOMERS FOUND TELLER', 'HOSTILE']));
  atlas.add('branch_express_window', framed(['AFTER-HOURS', 'EXPRESS WINDOW'], { bg: PURPLE.d, fg: GOLDC.l, border: GOLDC.m }));
  atlas.add('loan_expenses', framed(['CEREMONIAL SOCKS', 'EMERGENCY SASH-FRINGE DETANGLING', 'UNAUTHORISED GOAT-PARKING CITATION', 'PUDDING-CART DAMAGES', 'REPLACEMENT WEATHER VANE', 'CEREMONIAL SPOONS', 'TAX PENALTY (ATMOSPHERIC ASSETS)', 'NEW DOOR (OLD DOOR BECAME A WINDOW)', '', 'TOTAL: 47 SILVER'], { title: 'EXPENSES', titleBg: '#6a3a2a' }));
  atlas.add('form_1a', form('1A', 'TITLE COMPLETENESS', ['STATE YOUR FULL TITLE:', '(CONTINUED OVERLEAF)', '(CONTINUED ON SHEET 2)']));
  atlas.add('form_12c', form('12C', 'SASH INTEGRITY & CREDIT HISTORY', ['STRUCTURAL INCIDENTS? YES', '(SEVERAL)']));
  atlas.add('form_61l', form('61L', 'FART-BACKED COLLATERAL', ['ACTIVATED BY RELEASE? YES', 'BORROWER UNDERSTANDS? YES', 'DOES THE TELLER? ...']));
  atlas.add('form_97q', form('97Q', 'GOAT-RELATED LIABILITIES', ['LOCATION OF GOAT: CATHEDRAL', 'CONTENTS OF GOAT:', 'ONE (1) SPOON, CEREMONIAL']));
  atlas.add('loan_cancelled', noteCard(['SASH-BACKED LOAN: 47 SILVER', '', 'COLLATERAL: DESTROYED', 'LOAN: AUTOMATICALLY CANCELLED', 'FEES: NONREFUNDABLE']));
  // the rules
  atlas.add('captains_rules', framed(['NO BEARD JOINTS.', 'NO GRAND BANK.', 'NO EXPERIMENTAL ANGER WAFTS.', 'NO DELIBERATE STENCHMASTER FART TESTING.', '', 'IF GARRICK FORMS COMMITTEES OR', 'BROGATH PANICS ABOUT SASH FLUTTER,', 'THE CAPTAIN MAY AUTHORISE THE', 'EMERGENCY MELLOWING SUPPLY.', '(GROWN-UPS ONLY.)'], { title: "THE CAPTAIN'S RULES", titleBg: '#7a1a1a' }));
}

export const PHASE15_INSERT_NAMES = [
  'pocket_crew_ledger', 'pocket_crew_harold', 'pocket_crew_lost', 'pocket_crew_elsie', 'pocket_sash_loan',
  'recovery_report', 'select_label', 'bbk_acquisition', 'bbk_no_farts', 'bbk_beard_review', 'bbk_no_pillows', 'bbk_no_pillows_2', 'bbk_dude',
  'sign_safe_corner', 'threat_chart', 'threat_level_1', 'threat_level_2', 'threat_level_3', 'threat_level_4', 'threat_level_5', 'threat_level_6',
  'branch_sign_open', 'branch_sign_closing', 'relief_badge', 'teller_rating', 'branch_express_window',
  'loan_expenses', 'form_1a', 'form_12c', 'form_61l', 'form_97q', 'loan_cancelled', 'captains_rules',
];
