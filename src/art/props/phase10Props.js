import { canvas, groundShadow, box, WOOD, LWOOD, IRON, INK } from './propKit.js';
import { miniScreen } from './phase5Props.js';
import { mk2Small } from './phase7Props.js';
import { staticFrame } from '../vista/sesArt.js';
import { PHASE10_SCREEN_PAINTERS } from '../vista/vistaPhase10.js';

/**
 * Props for Story Phase 10 (the Bling Bling King's prizes; the beans; the
 * Counter-Sharkstorm Initiative; inside the Great Sharkstorm):
 *
 *   - the hold: Jim's padlocked pantry (beans, beans, beans; a can of
 *     Spicy Stench Sauce where the salt should be), Garrick's sauce vats
 *     (sealed; then vented, the lid gone, red everywhere);
 *   - the galley: the homemade blender (a jar, a crank, a vacuum tube, and
 *     a fork, wired in), a kerosene lamp, bean sacks laid out as beds, the
 *     one luxury pillow (communal), cans rolling
 *     loose once the ship is spinning;
 *   - the deck: the luxury seafood's leftovers, dumped; the stern's firing
 *     position, chalked; treasure and junk landing on the planks inside the
 *     storm;
 *   - Crownskull Isle: something glinting in the crater rubble (salvage);
 *   - S.E.S. Mark II with its aerial knocked flat, and with a can of Spicy
 *     Stench Sauce jammed on it, showing the impossible broadcast.
 */
const CAN = { yellow: '#f0d020', yellowD: '#b8a010', red: '#b8241c', redD: '#7a1410', blue: '#3a6a9a', blueD: '#24486a', tin: '#c8ccd4', tinD: '#8a8e96' };
const SAUCE = { d: '#6a1410', m: '#a8241c', l: '#d8443a', h: '#f08a70' };

function can(c, x, y, body, dark, { tall = 6 } = {}) {
  c.rect(x, y, 4, tall, body);
  c.vline(x + 3, y, y + tall - 1, dark);
  c.hline(x, x + 3, y, CAN.tin);
}

/** Jim's pantry: a cupboard of shelves, every one of them beans. `open`: the padlock off, the doors back. */
function beanPantry({ open = false } = {}) {
  const c = canvas(32, 40);
  groundShadow(c, 16, 38, 15, 2);
  box(c, 1, 2, 30, 4, 34, WOOD, { planks: 6 });
  c.rect(4, 8, 24, 28, '#2a1a10');
  const rows = [[10, CAN.yellow, CAN.yellowD], [19, CAN.blue, CAN.blueD], [28, CAN.yellow, CAN.yellowD]];
  for (const [y, body, dark] of rows) {
    c.hline(4, 27, y + 6, WOOD.l);
    for (let x = 5; x < 26; x += 5) can(c, x, y, x === 15 && y === 19 ? CAN.red : body, x === 15 && y === 19 ? CAN.redD : dark);
  }
  if (!open) {
    // the doors shut, a padlock on the hasp
    c.rect(4, 8, 12, 28, WOOD.b);
    c.rect(16, 8, 12, 28, WOOD.m);
    c.vline(16, 8, 35, WOOD.d);
    c.rect(14, 20, 5, 5, IRON.l);
    c.ellipseOutline(16, 19, 2, 2, IRON.h);
  }
  c.outline(INK);
  return c;
}

/** One of Garrick's vats of Spicy Stench Sauce. Sealed: the lid bulging, a little hiss. Vented: lid gone, red up the wall. */
function sauceVat({ vented = false } = {}) {
  const make = (f) => {
    const c = canvas(22, 28);
    groundShadow(c, 11, 26, 10, 2);
    c.rect(2, 8, 18, 17, SAUCE.m);
    c.vline(2, 8, 24, SAUCE.l);
    c.vline(19, 8, 24, SAUCE.d);
    c.rect(2, 13, 18, 4, CAN.yellow); // the warning band
    for (let x = 3; x < 19; x += 4) c.set(x, 14, '#1e1a22');
    if (!vented) {
      c.ellipse(11, 7 - f, 9, 3 + f, '#c8ccd4'); // the lid, pushing up
      c.ellipse(10, 6 - f, 5, 1, '#e8ecf0');
      if (f) for (const [x, y] of [[3, 2], [19, 1]]) c.set(x, y, '#f0e8e0');
    } else {
      c.ellipse(11, 8, 9, 2, SAUCE.d); // open, crusted
      for (const [x, y, l] of [[3, 8, 6], [8, 8, 9], [16, 8, 5]]) c.vline(x, y, y + l, SAUCE.l); // runs down the side
      for (const [x, y] of [[0, 3], [21, 5], [5, 0], [17, 1]]) c.set(x, y, SAUCE.l);
    }
    c.outline(INK);
    return c;
  };
  return vented ? make(0) : { frames: [make(0), make(1)], ms: 700 };
}

/** The red stain round a vented vat, on the planks (floor). */
function sauceStain() {
  const c = canvas(32, 16);
  c.ellipse(16, 8, 15, 7, SAUCE.d);
  c.ellipse(14, 7, 10, 4, SAUCE.m);
  for (const [x, y] of [[3, 3], [28, 12], [24, 2]]) c.ellipse(x, y, 2, 1.5, SAUCE.m);
  return c;
}

/**
 * The blender: a jar of brown on a crate, a crank on the side, a vacuum tube
 * glowing on top for no reason, and a fork wired in where the blades should
 * be. Two frames: the fork going round.
 */
function blender() {
  const make = (f) => {
    const c = canvas(18, 26);
    groundShadow(c, 9, 24, 8, 2);
    box(c, 2, 16, 14, 3, 7, LWOOD);
    c.rect(4, 4, 10, 12, '#c8e8e8a0');
    c.rect(5, 8, 8, 8, '#8a6a3a'); // smoothie
    c.hline(5, 12, 8, '#a8864a');
    c.vline(9, 5, 14, IRON.h); // the fork's handle
    for (const dx of f ? [-2, 0, 2] : [-1, 1, 3]) c.set(9 + dx, 14, IRON.h);
    c.rect(7, 1, 4, 3, '#c8e8e8a0'); // the tube
    c.vline(9, 1, 3, '#ffb040');
    c.line(15, 10, 17, f ? 6 : 14, IRON.l); // the crank
    c.line(10, 2, 15, 0, '#c87a3a'); // wire
    c.outline(INK);
    return c;
  };
  return { frames: [make(0), make(1)], ms: 160 };
}

/** A kerosene lamp on a hook, burning (too high). */
function keroseneLamp() {
  const make = (f) => {
    const c = canvas(10, 18);
    c.vline(5, 0, 3, IRON.l);
    c.ellipse(5, 13, 4, 3, '#a87830');
    c.rect(3, 5, 5, 7, '#f8f0c8a0');
    c.ellipse(5, 9 - f, 1.5, 2 + f, f ? '#fff4c0' : '#ffd070');
    c.hline(2, 8, 4, IRON.m);
    c.outline(INK);
    return c;
  };
  return { frames: [make(0), make(1)], ms: 220 };
}

/** Bean sacks laid end to end with a blanket on them: a bed (of sorts). */
function beanSackBed() {
  const c = canvas(32, 14);
  for (const x of [8, 22]) {
    c.ellipse(x, 8, 8, 5, '#6a5a38');
    c.ellipse(x - 2, 6, 5, 2, '#8a7a4a');
    c.set(x + 5, 9, '#8a3a22'); // a bean, escaping
  }
  c.ellipse(18, 9, 10, 3, '#6a6a8a'); // the blanket, not quite long enough
  c.outline(INK);
  return c;
}

/** The one luxury pillow (communal), on a sack. */
function communalPillow() {
  const c = canvas(16, 10);
  c.poly([[1, 2], [14, 1], [15, 8], [2, 9]], '#e8e0f0');
  c.line(3, 3, 12, 2, '#ffffff');
  for (const [x, y] of [[0, 1], [15, 0], [15, 9], [1, 9]]) c.set(x, y, '#e0b030');
  c.outline(INK);
  return c;
}

/** Cans rolling loose on the galley floor (the ship is going round). */
function cansSpilled() {
  const c = canvas(24, 10);
  for (const [x, y, b, d] of [[2, 4, CAN.yellow, CAN.yellowD], [10, 2, CAN.red, CAN.redD], [16, 5, CAN.blue, CAN.blueD]]) {
    c.rect(x, y, 6, 4, b);
    c.hline(x, x + 5, y + 3, d);
    c.vline(x, y, y + 3, CAN.tin);
  }
  c.outline(INK);
  return c;
}

/** The luxury seafood's leftovers, tipped onto the deck: shells, trays, a tin, a box, napkins, a little fork. */
function leftoverHeap() {
  const c = canvas(32, 18);
  groundShadow(c, 16, 15, 15, 2);
  c.ellipse(9, 10, 6, 3, '#c83a2a'); // lobster shell
  c.ellipse(8, 9, 4, 1.5, '#e86a4a');
  c.ellipse(20, 12, 5, 3, '#d8743a'); // crab
  c.rect(14, 4, 12, 4, '#b8bcc4'); // oyster tray
  c.set(17, 5, '#e8e4d8');
  c.set(22, 5, '#e8e4d8');
  c.ellipse(27, 12, 3, 2, '#2a3440'); // caviar tin
  c.rect(3, 3, 7, 5, '#f0ece4'); // takeout box
  c.poly([[22, 14], [29, 15], [26, 17]], '#f4f0e8'); // napkin
  c.line(12, 15, 16, 13, IRON.h); // a little fork
  c.outline(INK);
  return c;
}

/** The firing position at the stern rail: a chalk X and an arrow, and what's written next to it. */
function firingMark() {
  const c = canvas(32, 16);
  c.line(4, 2, 14, 12, '#e8e8e0');
  c.line(14, 2, 4, 12, '#e8e8e0');
  c.line(18, 7, 30, 7, '#e8e8e0');
  c.line(26, 3, 30, 7, '#e8e8e0');
  c.line(26, 11, 30, 7, '#e8e8e0');
  return c;
}

/** Inside the storm: things that came down on the deck (a coin or two, a jewel, a plastic token, a shell). */
function stormLoot() {
  const c = canvas(28, 14);
  for (const [x, y] of [[4, 8], [8, 10], [20, 6]]) {
    c.ellipse(x, y, 2, 1.5, '#e0b030');
    c.set(x, y - 1, '#f8e070');
  }
  c.ellipse(14, 6, 1.5, 1.5, '#d02838');
  c.ellipse(24, 10, 3, 3, '#d8b440'); // a token
  c.set(23, 9, '#f4dc78');
  c.ellipse(12, 11, 3, 1.5, '#c83a2a');
  c.outline(INK);
  return c;
}

/** Something in the crater rubble catching the light. */
function salvageGlint() {
  const make = (f) => {
    const c = canvas(16, 12);
    c.ellipse(8, 8, 7, 3, '#7a6a50');
    c.ellipse(6, 7, 3, 1.5, '#9a8a6a');
    c.ellipse(10, 7, 2, 1.5, '#e0b030');
    if (f) {
      c.set(11, 3, '#ffffff');
      c.hline(10, 12, 4, '#fff8c0');
      c.vline(11, 3, 5, '#fff8c0');
    }
    c.outline(INK);
    return c;
  };
  return { frames: [make(0), make(1), make(0)], ms: 400 };
}

// --- S.E.S. Mark II's aerial ------------------------------------------------------------

const small = (src) => miniScreen(src, 12, 8);

/** Mark II with its aerial bent over, snow on the glass. */
function mk2Bent() {
  const frames = [0, 1, 2].map((f) => {
    const c = mk2Small(small(staticFrame(911 + f * 7)), { stage: 2, lit: true });
    for (let y = 0; y < 10; y++) for (let x = 12; x < 19; x++) c.set(x, y, 'transparent');
    c.line(14, 9, 19, 6, IRON.m); // the horseshoe, knocked flat
    c.outline(INK);
    return c;
  });
  return { frames, ms: 90 };
}

function sauceOnTop(c) {
  c.rect(12, 0, 6, 7, CAN.red);
  c.rect(12, 3, 6, 2, CAN.yellow);
  c.hline(12, 17, 0, CAN.tin);
  c.outline(INK);
  return c;
}

/** Mark II with the can of Spicy Stench Sauce on the aerial, showing the impossible broadcast. */
function mk2Sauce() {
  const frames = [0, 1, 2, 3].map((f) => sauceOnTop(mk2Small(small(f % 2 ? PHASE10_SCREEN_PAINTERS.bbk(f) : PHASE10_SCREEN_PAINTERS.ftm5(f)), { stage: 2, lit: true })));
  return { frames, ms: 700 };
}

function mk2SauceOff() {
  return sauceOnTop(mk2Small(null, { stage: 2 }));
}

export const PHASE10_PROPS = {
  bean_pantry: () => beanPantry(),
  bean_pantry_open: () => beanPantry({ open: true }),
  sauce_vat: () => sauceVat(),
  sauce_vat_vented: () => sauceVat({ vented: true }),
  sauce_stain: sauceStain,
  blender_fork: blender,
  kerosene_lamp: keroseneLamp,
  bean_sack_bed: beanSackBed,
  communal_pillow: communalPillow,
  cans_spilled: cansSpilled,
  leftover_heap: leftoverHeap,
  firing_mark: firingMark,
  storm_loot: stormLoot,
  salvage_glint: salvageGlint,
  ses2_bent: mk2Bent,
  ses2_sauce: mk2Sauce,
  ses2_sauce_off: mk2SauceOff,
};
