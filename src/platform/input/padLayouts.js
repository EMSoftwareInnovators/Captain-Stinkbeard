/**
 * Where a controller's buttons actually are.
 *
 * The Gamepad API only promises the "standard" layout (A = 0, B = 1, X = 2,
 * Y = 3, d-pad = buttons 12-15) when the browser recognises the pad and
 * reports mapping === 'standard'. When it doesn't, it passes the device's raw
 * HID buttons through in whatever order the driver lists them, and a d-pad
 * usually arrives as a single "hat" axis instead of four buttons.
 *
 * The case that matters most: Firefox on macOS only remaps the Xbox product
 * ids it knows. Any other Xbox pad over Bluetooth (for example a One S or
 * Elite on the 2021+ Bluetooth LE firmware) arrives unmapped, with the face
 * buttons at 0, 1, 3, 4 and the d-pad on axis 9. This module names those
 * buttons so the input layer can ask for "south" rather than "button 0".
 *
 * Engine-agnostic; tested in tests/input.test.js.
 */

/** Logical buttons, by their position on the pad (south = Xbox A / Sony cross). */
export const PAD_BUTTONS = ['south', 'east', 'west', 'north', 'lb', 'rb', 'lt', 'rt', 'select', 'start', 'ls', 'rs', 'up', 'down', 'left', 'right', 'home'];

const STANDARD = {
  name: 'standard',
  buttons: { south: 0, east: 1, west: 2, north: 3, lb: 4, rb: 5, lt: 6, rt: 7, select: 8, start: 9, ls: 10, rs: 11, up: 12, down: 13, left: 14, right: 15, home: 16 },
  hat: null,
};

/**
 * An Xbox One / Series pad over Bluetooth with no browser remapping (Firefox
 * on macOS and Linux for product ids it doesn't list): the pad's HID report
 * skips a slot after B and after Y, and the d-pad is a hat switch.
 */
const XBOX_RAW = {
  name: 'xbox (raw)',
  buttons: { south: 0, east: 1, west: 3, north: 4, lb: 6, rb: 7, select: 10, start: 11, home: 12, ls: 13, rs: 14 },
  hat: 9,
};

/** An Xbox 360 pad with no remapping (macOS 360Controller driver order). */
const XBOX360_RAW = {
  name: 'xbox 360 (raw)',
  buttons: { south: 0, east: 1, west: 2, north: 3, lb: 4, rb: 5, ls: 6, rs: 7, start: 8, select: 9, home: 10, up: 11, down: 12, left: 13, right: 14 },
  hat: null,
};

/** Anything else we don't recognise: face buttons first (most pads), d-pad from buttons or a hat. */
const GENERIC = {
  name: 'generic',
  buttons: { south: 0, east: 1, west: 2, north: 3, lb: 4, rb: 5, lt: 6, rt: 7, select: 8, start: 9, ls: 10, rs: 11, up: 12, down: 13, left: 14, right: 15 },
  hat: 'auto',
};

const XBOX360_PRODUCTS = new Set(['028e', '028f', '0291', '02a1', '0719']);

/**
 * Vendor and product ids from a Gamepad id string, lower-case hex:
 *   Firefox        "045e-0b20-Xbox Wireless Controller"
 *   Chrome / Edge  "Xbox Wireless Controller (Vendor: 045e Product: 0b20)"
 */
export function padIds(id = '') {
  const chrome = /vendor:\s*([0-9a-f]{4}).*product:\s*([0-9a-f]{4})/i.exec(id);
  if (chrome) return { vendor: chrome[1].toLowerCase(), product: chrome[2].toLowerCase() };
  const firefox = /^([0-9a-f]{1,4})-([0-9a-f]{1,4})-/i.exec(id);
  if (firefox) return { vendor: firefox[1].toLowerCase().padStart(4, '0'), product: firefox[2].toLowerCase().padStart(4, '0') };
  return { vendor: null, product: null };
}

/** Picks the button layout for a connected pad. */
export function padLayout(pad) {
  if (!pad) return GENERIC;
  if (pad.mapping === 'standard') return STANDARD;
  const { vendor, product } = padIds(pad.id);
  const xbox = vendor === '045e' || /x-?box/i.test(pad.id ?? '');
  if (xbox && XBOX360_PRODUCTS.has(product)) return XBOX360_RAW;
  if (xbox && (pad.buttons?.length ?? 0) >= 12) return XBOX_RAW;
  return GENERIC;
}

/** A pad's d-pad hat axis, if it has one (null when the d-pad is plain buttons). */
export function hatAxis(layout, pad, rest) {
  if (layout.hat === null) return null;
  if (typeof layout.hat === 'number') return layout.hat < (pad.axes?.length ?? 0) ? layout.hat : null;
  // "auto": a hat rests outside -1..1 (its "centred" value is past the end of its range).
  const i = (rest ?? pad.axes ?? []).findIndex((v) => Math.abs(v) > 1.05);
  return i >= 0 ? i : null;
}

/**
 * Decodes a hat-switch axis. Browsers scale the hat's eight positions
 * (up, up-right, right ... up-left) evenly over -1..1; centred is outside
 * that range.
 */
export function hatDirections(value) {
  const none = { up: false, down: false, left: false, right: false };
  if (!Number.isFinite(value) || value > 1.05 || value < -1.05) return none;
  const pos = Math.round((value + 1) * 3.5);
  if (pos < 0 || pos > 7) return none;
  return {
    up: pos === 7 || pos === 0 || pos === 1,
    right: pos >= 1 && pos <= 3,
    down: pos >= 3 && pos <= 5,
    left: pos >= 5 && pos <= 7,
  };
}
