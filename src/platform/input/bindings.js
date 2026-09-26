/**
 * Abstract input actions and their default keyboard / gamepad bindings.
 * Gameplay code only ever asks about actions, never about physical keys, so
 * rebinding or porting to a console pad touches this file alone.
 */
export const ACTIONS = [
  'up', 'down', 'left', 'right',
  'confirm', 'cancel', 'menu', 'run', 'secondary',
  'pageLeft', 'pageRight', 'debug',
];

export const KEY_BINDINGS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  confirm: ['KeyZ', 'Enter', 'NumpadEnter', 'Space'],
  cancel: ['KeyX', 'Escape', 'Backspace'],
  menu: ['KeyC', 'Escape'],
  run: ['ShiftLeft', 'ShiftRight', 'KeyX'],
  secondary: ['KeyV'],
  pageLeft: ['KeyQ', 'PageUp'],
  pageRight: ['KeyE', 'PageDown'],
  debug: ['F2'],
};

/** Standard Gamepad API button indices. */
export const PAD = {
  south: 0, east: 1, west: 2, north: 3, lb: 4, rb: 5, lt: 6, rt: 7,
  select: 8, start: 9, ls: 10, rs: 11, up: 12, down: 13, left: 14, right: 15,
};

export const PAD_BINDINGS = {
  up: [PAD.up],
  down: [PAD.down],
  left: [PAD.left],
  right: [PAD.right],
  confirm: [PAD.south],
  cancel: [PAD.east],
  menu: [PAD.north, PAD.start],
  run: [PAD.east, PAD.west],
  secondary: [PAD.west],
  pageLeft: [PAD.lb, PAD.lt],
  pageRight: [PAD.rb, PAD.rt],
  debug: [],
};

export const STICK_DEADZONE = 0.5;

/** Keys whose browser default (scrolling, focus changes) must be suppressed. */
export const PREVENT_DEFAULT = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace', 'PageUp', 'PageDown', 'F2',
]);

/** Which glyph (see art/font/glyphs.js BUTTON_GLYPHS) represents an action per device. */
export const PROMPT_GLYPHS = {
  keyboard: {
    confirm: 'key_z', cancel: 'key_x', menu: 'key_c', run: 'key_shift', secondary: 'key_c',
    pageLeft: 'key_q', pageRight: 'key_e', move: 'key_arrows', start: 'key_esc', debug: 'key_f2', enter: 'key_enter',
  },
  gamepad: {
    confirm: 'pad_a', cancel: 'pad_b', menu: 'pad_y', run: 'pad_b', secondary: 'pad_x',
    pageLeft: 'pad_lb', pageRight: 'pad_rb', move: 'pad_dpad', start: 'pad_start', debug: 'pad_start', enter: 'pad_a',
  },
};
