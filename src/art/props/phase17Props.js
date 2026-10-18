import { canvas, groundShadow, WOOD, IRON, GOLD, INK } from './propKit.js';
import { PHASE14_PROPS } from './phase14Props.js';
import { PHASE16_PROPS } from './phase16Props.js';
import { paintCutoutProp } from '../characters/cardboardCrewPainter.js';

/**
 * Props for Story Phase 17 (THE RETURN OF THE ANCIENT CREW AND THE COFFIN SOCK CATASTROPHE):
 *   - Brogath's cut-outs of his old crew (Ledger Billiam, No-Nonsense Tilda, Old Jeb Rattleplank, Wobbly Ned leaning,
 *     Elsie Beanwright half coloured in): painted by the cardboard crew painter, standing still on their nameplates.
 *     Props, never animated: the three that stay cardboard can't move by accident;
 *   - the treasure-room door sealed a second time (two more planks across, a sixth sign: NOT EVEN FOR FRIENDS);
 *   - Pete's board (COFFIN SOCK EVENT: PENDING), and after the blast (blown flat, PENDING crossed out);
 *   - the Grand Currency Converter planked over (NO CONVERSIONS); Garrick's sash screen; papers everywhere;
 *   - Brogath's knotted sash on the Fart-Free Zone's wall; Ledger's books; the helm log on its post;
 *   - the Fart Zone's scorch marks and Agnes's feathers.
 * Calm frames only.
 */
const PAPER = '#f4ecd8';
const RED = '#a8241c';
const CHALK = '#e8e8d8';
const SLATE = { d: '#1e2a24', m: '#2e3e36' };
const SASH = { d: '#8a141c', m: '#c8242c', l: '#e8545a' };

function cutout(who, lean = 0) {
  return () => paintCutoutProp(who, { lean });
}

/** The treasure-room door after chapter 208: the five signs, every plank back, two more across them, and Pete's sixth. */
function doorReinforced() {
  const c = PHASE14_PROPS.treasure_signs_five().clone();
  // two planks corner to corner across everything
  c.thickLine(0, 4, 15, 26, 2, WOOD.l); c.line(0, 6, 15, 28, WOOD.d);
  c.thickLine(15, 4, 0, 26, 2, WOOD.l); c.line(15, 6, 0, 28, WOOD.d);
  for (const [x, y] of [[1, 5], [14, 5], [1, 25], [14, 25]]) c.set(x, y, IRON.h);
  // NOT EVEN FOR FRIENDS (Pete's hand, red, a plank of its own)
  c.rect(2, 14, 12, 4, PAPER); c.hline(3, 12, 15, RED); c.hline(4, 10, 16, RED);
  c.outline(INK);
  return c;
}

/** Pete's chalk board: COFFIN SOCK EVENT, PENDING (and, after, blown flat with PENDING crossed out). */
function pendingBoard(blown) {
  const c = canvas(16, 24);
  c.vline(3, 14, 23, WOOD.d); c.vline(12, 14, 23, WOOD.d);
  if (blown) {
    // knocked back against the wall, askew
    c.poly([[1, 4], [15, 2], [15, 15], [1, 17]], WOOD.m);
    c.poly([[2, 5], [14, 3], [14, 14], [2, 16]], SLATE.m);
    c.hline(4, 12, 7, CHALK); c.hline(4, 11, 9, CHALK); c.line(4, 12, 12, 10, '#e05030'); c.hline(4, 9, 13, CHALK);
  } else {
    c.rect(0, 2, 16, 14, WOOD.m); c.rect(1, 3, 14, 12, SLATE.m);
    c.hline(2, 13, 5, CHALK); c.hline(2, 11, 7, CHALK); // COFFIN SOCK EVENT
    c.hline(3, 12, 10, '#f4dc6c'); c.hline(3, 12, 12, '#f4dc6c'); // PENDING (underlined)
    c.set(14, 4, '#e05030');
  }
  c.outline(INK);
  return c;
}

/** The converter, planked over: NO CONVERSIONS. */
function converterPlanked() {
  const base = PHASE16_PROPS.currency_converter();
  const c = (base.frames ? base.frames[0] : base).clone();
  c.rect(0, 17, 16, 4, WOOD.l); c.hline(0, 15, 20, WOOD.d);
  c.rect(0, 24, 16, 4, WOOD.l); c.hline(0, 15, 27, WOOD.d);
  for (const [x, y] of [[1, 18], [14, 18], [1, 25], [14, 25]]) c.set(x, y, IRON.h);
  c.rect(3, 29, 10, 4, PAPER); c.hline(4, 11, 30, RED); c.hline(4, 9, 31, RED);
  c.outline(INK);
  return c;
}

/** Garrick's sash screen: a sash hung over a stool-and-mop frame, something behind it he'd rather you didn't see. */
function sashScreen() {
  const c = canvas(16, 26);
  groundShadow(c, 8, 24, 7, 2);
  c.vline(2, 4, 24, WOOD.d); c.vline(13, 4, 24, WOOD.d); c.hline(2, 13, 4, WOOD.m);
  for (let y = 5; y < 20; y++) for (let x = 3; x < 13; x++) c.set(x, y, (x + Math.floor(y / 3)) % 5 === 0 ? SASH.l : y % 4 === 0 ? SASH.d : SASH.m);
  c.hline(4, 11, 12, GOLD.l); // the gold stripe
  c.set(9, 2, '#9aa29a'); c.set(10, 1, '#b0b8b0'); c.set(8, 0, '#9aa29a'); // a thread of grey smoke over the top
  c.outline(INK);
  return c;
}

function papersScattered() {
  const c = canvas(16, 16);
  for (const [x, y, a] of [[2, 6, 0], [8, 3, 1], [11, 10, 0], [4, 11, 1], [9, 7, 0]]) {
    c.rect(x, y, 4, 3 + a, PAPER); c.hline(x + 1, x + 2, y + 1, '#8a7a6a');
  }
  return c;
}

/** Brogath's old sash on a nail: five knots, smoothed soft. */
function sashKnotted() {
  const c = canvas(16, 22);
  c.set(8, 1, IRON.h);
  for (let y = 2; y < 20; y++) { c.set(7, y, SASH.m); c.set(8, y, y % 3 ? SASH.l : SASH.d); }
  for (const y of [5, 8, 11, 14, 17]) { c.rect(6, y, 4, 2, SASH.d); c.set(7, y, GOLD.l); }
  c.outline(INK);
  return c;
}

/** Ledger's books, squared off on the mess table, a quill across them. */
function ledgerBooks() {
  const c = canvas(16, 16);
  c.rect(3, 7, 10, 3, '#8a3a1c'); c.hline(3, 12, 7, '#b05a2a'); c.vline(12, 7, 9, '#f0e6c8');
  c.rect(4, 4, 9, 3, '#5a2a6a'); c.hline(4, 12, 4, '#7a4a8a'); c.vline(12, 4, 6, '#f0e6c8');
  c.line(2, 3, 13, 1, '#f4f0e8'); c.set(13, 1, '#c8c0b0');
  c.outline(INK);
  return c;
}

/** The helm log, on its own post by the wheel. */
function helmLog() {
  const c = canvas(16, 24);
  groundShadow(c, 8, 22, 4, 1.5);
  c.vline(7, 10, 22, WOOD.d); c.vline(8, 10, 22, WOOD.m);
  c.rect(3, 4, 10, 7, '#3a2a1a'); c.rect(4, 5, 8, 5, PAPER); c.vline(8, 5, 9, '#8a7a6a');
  c.hline(5, 7, 6, '#2a2a3a'); c.hline(9, 11, 7, '#2a2a3a');
  c.outline(INK);
  return c;
}

/** Scorch marks round the release circle, licking up toward the portholes. 3x2, on the floor. */
function fzScorch() {
  const c = canvas(48, 32);
  for (let i = 0; i < 70; i++) {
    const a = (i * 2.399) % (Math.PI * 2);
    const r = 6 + ((i * 7) % 13);
    const x = Math.round(24 + Math.cos(a) * r * 1.4);
    const y = Math.round(18 + Math.sin(a) * r * 0.7);
    c.set(x, y, i % 3 ? '#2a1a12' : '#4a2a18');
  }
  c.ellipse(24, 18, 9, 4, '#3a2618');
  return c;
}

function feathersFloor() {
  const c = canvas(16, 16);
  for (const [x, y, col] of [[3, 10, '#9a5e2a'], [8, 6, '#c88a48'], [11, 11, '#6a3e1c'], [5, 4, '#c88a48'], [13, 7, '#9a5e2a']]) {
    c.line(x, y, x + 2, y - 1, col); c.set(x + 1, y + 1, col);
  }
  return c;
}

export const PHASE17_PROPS = {
  cutout_ledger: cutout('ledger'),
  cutout_tilda: cutout('tilda'),
  cutout_jeb: cutout('jeb'),
  cutout_ned: cutout('ned', 0.12),
  cutout_elsie: cutout('elsie'),
  treasure_door_reinforced: doorReinforced,
  coffin_sock_board: () => pendingBoard(false),
  coffin_sock_board_blown: () => pendingBoard(true),
  converter_planked: converterPlanked,
  sash_screen: sashScreen,
  papers_scattered: papersScattered,
  sash_knotted: sashKnotted,
  ledger_books: ledgerBooks,
  helm_log: helmLog,
  fz_scorch: fzScorch,
  feathers_floor: feathersFloor,
};

