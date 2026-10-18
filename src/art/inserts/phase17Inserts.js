import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { drawText } from '../font/drawText.js';
import { pocketPage, noteCard, sign } from './phase11Inserts.js';
import { framed, form } from './phase15Inserts.js';
import { paintCutoutProp, xform } from '../characters/cardboardCrewPainter.js';

/**
 * Story Phase 17 close-ups (THE RETURN OF THE ANCIENT CREW AND THE COFFIN SOCK CATASTROPHE):
 *   - the pocket edition's page on Brogath's crew; Ledger's and Tilda's cut-outs, close up, with their nameplates
 *     (LEDGER BILLIAM. TREASURER. KNOWS MONEY. / NO-NONSENSE TILDA. FIRST MATE. BROGATH, STOP.);
 *   - Ledger's review of the ship's finances (SHIP ASSETS: A LOT), the MAYBE column, the crew roster he 'corrected';
 *   - the helm log; the converter's five minutes (four clock faces), its receipt, the CAPTAIN MINUTES exchange rate,
 *     the ban;
 *   - THE GRAND STENCHMASTER'S GRAND RESTRAINT: the readings, three times (stability, pressure, flutter, Tilda's position,
 *     the portholes, the fire risk, the chicken);
 *   - Tilda's application (page 31: PREFERRED PROVIDER: BROGATH THE BASHFUL); Lord Thunderbottom's (pages 2-97: blank);
 *   - Pete's board: COFFIN SOCK EVENT, PENDING.
 * Nothing on any of them is a real procedure.
 */
const INK = PAL.ink;
const CARD = { m: '#b8925e', l: '#d0aa74', d: '#8a6a40' };
const PURPLE = '#5a3278';
const RED = '#a8241c';

/** A cut-out, close up (twice size) on its card, with its nameplate written out underneath. */
function cutoutCard(who, rows) {
  const W = 168;
  const H = 128 + rows.length * 11;
  const c = new PixelCanvas(W, H);
  c.fill(CARD.d);
  c.rect(2, 2, W - 4, H - 4, CARD.l);
  for (let y = 4; y < H - 4; y += 4) c.hline(4, W - 5, y, CARD.m);
  const fig = xform(paintCutoutProp(who), { sx: 2, sy: 2, ox: 0, oy: 0, dx: W / 2 - 32, dy: 6, w: W, h: 104 });
  for (let y = 0; y < 104; y++) for (let x = 0; x < W; x++) if (fig.alphaAt(x, y)) c.set(x, y, fig.get(x, y));
  c.rect(10, 108, W - 20, rows.length * 11 + 10, '#f4ecd8');
  rows.forEach((r, i) => drawText(c, r, W / 2, 113 + i * 11, i === rows.length - 1 ? RED : '#2a1a10', { center: true }));
  c.outline(INK);
  return c;
}

function clock(minutes, caption) {
  return framed([`${minutes}:00`, '', caption], { title: 'CONVERSION IN PROGRESS', titleBg: PURPLE, bg: '#2a1a3a', fg: '#f4dc6c', border: '#d8b032' });
}

function restraint(n) {
  const R = [
   ['STABILITY: FALLING', 'PRESSURE: ###.......', 'SASH: FLUTTERING (ONE CORNER)', 'TILDA: AT THE ROPE', 'PORTHOLES: OPEN', 'FIRE RISK: ONE CIGARETTE (UNLIT)', 'CHICKEN: FAR AWAY (SAFE)'],
   ['STABILITY: LOW', 'PRESSURE: ######....', 'SASH: FLUTTERING (EVERYWHERE)', 'TILDA: TOO CLOSE', 'PORTHOLES: OPEN', 'FIRE RISK: CIGARETTE, SMOULDERING SEAMS', 'CHICKEN: FAR AWAY (STILL)'],
   ['STABILITY: CRITICAL', 'PRESSURE: #########.', 'SASH: STRAIGHT OUT', 'TILDA: CREEPING FORWARD', 'PORTHOLES: OPEN (THANK GOODNESS)', 'FIRE RISK: YES', 'CHICKEN: FAR AWAY (THE ONLY GOOD NEWS)'],
  ][n - 1];
  return framed(R, { title: `THE GRAND RESTRAINT (READING ${n})`, titleBg: n === 3 ? RED : '#7a4a1a' });
}

export function addPhase17Inserts(atlas) {
  atlas.add('pocket_old_crew', pocketPage('THE CREW OF BROGATH THE BASHFUL.||LEDGER BILLIAM (TREASURER).|NO-NONSENSE TILDA (FIRST MATE).|OLD JEB RATTLEPLANK (CARPENTER, SALESMAN).|WOBBLY NED (SAILOR, MOSTLY).|ELSIE BEANWRIGHT (COOK. BEANS.)||FIVE LITTLE HEARTS, IN PURPLE CRAYON.', { title: 'APPENDIX NINE (CONTINUED)' }));
  atlas.add('cutout_ledger_card', cutoutCard('ledger', ['LEDGER BILLIAM', 'TREASURER', 'KNOWS MONEY']));
  atlas.add('cutout_tilda_card', cutoutCard('tilda', ['NO-NONSENSE TILDA', 'FIRST MATE', 'BROGATH, STOP']));
  atlas.add('ledger_review', framed(['SHIP ASSETS: A LOT', 'SHIP LIABILITIES: PROBABLY LESS', '', 'THE SHARKSTORM (NEARBY): ASSET', 'GRAND CURRENCY: 20,000 (RICH)', '', 'MAYBE: SEE OVER'], { title: 'THE SHIP: A FINANCIAL REVIEW', titleBg: '#2a4a6a' }));
  atlas.add('ledger_maybe', framed(['THE SHARKSTORM', 'THE TREASURE IN IT', 'A GOOD FEELING ABOUT TUESDAY', 'BROGATH (PRICELESS?)', 'THE CHICKEN (DO NOT PRICE)'], { title: 'MAYBE', titleBg: '#6a5a2a' }));
  atlas.add('ledger_roster', framed(['CAPTAIN: STINKBEARD (LIABILITY)', 'FIRST MATE: TILDA', 'TREASURER: LEDGER', 'GRAND STENCHMASTER: GARRICK (DISPUTED)', 'ANCIENT G.S.: BROGATH (ASSET, PRICELESS)', 'CHICKEN: AGNES (OPERATIONALLY IMPORTANT)', 'EVERYBODY ELSE: MAYBE'], { title: "THE SHIP'S COMPANY (CORRECTED)", titleBg: '#2a4a6a' }));
  atlas.add('helm_log', noteCard(['THE HELM LOG', '', 'HELM TAKEN BY FIRST MATE TILDA.', 'COURSE: GREYHOOK COVE.', 'CAPTAIN: INFORMED (LATER).', '', 'HELM RETURNED TO HALE,', "ON THE CAPTAIN'S ORDER.", 'COURSE: ROUND AND ROUND.'], { crown: false }));
  atlas.add('converter_clock_0', clock(0, 'INITIAL SURPRISE'));
  atlas.add('converter_clock_1', clock(1, 'OUTPUT: STEADY'));
  atlas.add('converter_clock_3', clock(3, 'OUTPUT: STILL STEADY'));
  atlas.add('converter_clock_4', clock(4, 'OUTPUT: VALUED'));
  atlas.add('converter_receipt_captain_minutes', noteCard(['GRAND CURRENCY CONVERSION', '', 'INPUT: 1 GRAND TOKEN', 'OUTPUT: COFFIN SOCK (5 MINUTES)', 'DELIVERED TO: THE CAPTAIN', 'FEE: 1 GRAND TOKEN', '', 'THANK YOU FOR CONVERTING'], { crown: false }));
  atlas.add('captain_minutes_rate', framed(['1 GRAND TOKEN = 1 FAILED PURCHASE', '1 FAILED PURCHASE = 5 CAPTAIN MINUTES', '5 CAPTAIN MINUTES = 1 ATMOSPHERIC ASSET', '(DELIVERED)', '', 'BACKED BY: THE CAPTAIN', 'NOT LEGAL TENDER. NOT MONEY.'], { title: 'CAPTAIN MINUTES: THE EXCHANGE RATE', titleBg: '#2a4a6a' }));
  atlas.add('converter_banned', sign(['NO CONVERSIONS.', 'NONE.', 'EVER.', 'BY ORDER OF THE CAPTAIN', '(5 MINUTES)']));
  atlas.add('restraint_panel_1', restraint(1));
  atlas.add('restraint_panel_2', restraint(2));
  atlas.add('restraint_panel_3', restraint(3));
  atlas.add('tilda_application_p31', form('31', 'PREFERRED GRAND STENCHMASTER', ['APPLICANT: NO-NONSENSE TILDA', 'PREFERRED PROVIDER:', 'BROGATH THE BASHFUL', '(DO NOT ARGUE WITH THE APPLICANT)']));
  atlas.add('thunderbottom_form', form('97Q', 'APPLICATION FOR CEREMONIAL IGNITION', ['PAGE 1: LORD VAPORIOUS THUNDERBOTTOM', 'THE SEVENTH, HEREDITARY VAPOUR OF', 'THE NORTHERN... (CONTINUED OVER)', 'PAGES 2 TO 97: (BLANK)']));
  atlas.add('coffin_sock_pending_board', framed(['COFFIN SOCK EVENT:', 'PENDING', '', 'DO NOT EMBARRASS BROGATH', '(UNLESS FOR SCIENCE)', '(RUBBED OUT)'], { title: "PETE'S BOARD", titleBg: '#1e2a24', bg: '#2e3e36', fg: '#e8e8d8', border: '#5a4028' }));
}

export const PHASE17_INSERT_NAMES = [
  'pocket_old_crew', 'cutout_ledger_card', 'cutout_tilda_card', 'ledger_review', 'ledger_maybe', 'ledger_roster', 'helm_log',
  'converter_clock_0', 'converter_clock_1', 'converter_clock_3', 'converter_clock_4', 'converter_receipt_captain_minutes', 'captain_minutes_rate',
  'converter_banned', 'restraint_panel_1', 'restraint_panel_2', 'restraint_panel_3', 'tilda_application_p31', 'thunderbottom_form', 'coffin_sock_pending_board',
];
