import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InputManager } from '../src/platform/input/InputManager.js';
import { padIds, padLayout, hatDirections } from '../src/platform/input/padLayouts.js';
import { EventBus } from '../src/core/EventBus.js';

/**
 * Gamepads as different browsers really report them. The one that matters:
 * Firefox on macOS passes an Xbox pad it has no remapper for straight
 * through (mapping ""), face buttons at 0/1/3/4, d-pad on hat axis 9 and
 * triggers resting at -1 (dom/gamepad/cocoa/CocoaGamepad.cpp,
 * dom/gamepad/GamepadRemapping.cpp).
 */
const HAT_CENTRED = 8 / 3.5 - 1; // 1.2857: a hat's "no direction", past the end of -1..1
const hat = (pos) => (pos * 2) / 7 - 1; // 0 = up, 2 = right, 4 = down, 6 = left

function makePad({ id, index = 0, mapping = '', buttons = 17, axes = [0, 0, 0, 0] } = {}) {
  return {
    id, index, mapping, connected: true, timestamp: 0,
    axes: [...axes],
    buttons: Array.from({ length: buttons }, () => ({ pressed: false, touched: false, value: 0 })),
  };
}

const standardPad = (index = 0) => makePad({ id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', index, mapping: 'standard' });
const firefoxMacXbox = (index = 0) => makePad({
  id: '045e-0b20-Xbox Wireless Controller', index, buttons: 16,
  axes: [0, 0, -1, 0, 0, -1, 0, 0, 0, HAT_CENTRED],
});

let pads = [];
let savedNavigator;
beforeEach(() => {
  pads = [];
  savedNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true, writable: true });
});
afterEach(() => {
  if (savedNavigator) Object.defineProperty(globalThis, 'navigator', savedNavigator);
  else delete globalThis.navigator;
});

function frames(input, n = 1) {
  for (let i = 0; i < n; i++) input.update((input.now ?? 0) + 16);
}

function press(input, pad, button) {
  pad.buttons[button].pressed = true;
  pad.buttons[button].value = 1;
  frames(input);
  const out = Object.fromEntries(['confirm', 'cancel', 'menu', 'secondary', 'run', 'pageLeft', 'pageRight'].map((a) => [a, input.pressed(a)]));
  pad.buttons[button].pressed = false;
  pad.buttons[button].value = 0;
  frames(input);
  return out;
}

describe('gamepad layouts', () => {
  it('reads vendor and product ids from Firefox and Chrome id strings', () => {
    expect(padIds('045e-0b20-Xbox Wireless Controller')).toEqual({ vendor: '045e', product: '0b20' });
    expect(padIds('45e-2e0-Xbox Wireless Controller')).toEqual({ vendor: '045e', product: '02e0' });
    expect(padIds('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)')).toEqual({ vendor: '045e', product: '0b13' });
    expect(padIds('Some Pad')).toEqual({ vendor: null, product: null });
  });

  it('picks a layout per pad', () => {
    expect(padLayout(standardPad()).name).toBe('standard');
    expect(padLayout(firefoxMacXbox()).name).toBe('xbox (raw)');
    expect(padLayout(makePad({ id: 'Xbox Wireless Controller (Vendor: 045e Product: 0b20)', buttons: 16 })).name).toBe('xbox (raw)');
    expect(padLayout(makePad({ id: '45e-28e-Xbox 360 Wired Controller', buttons: 15 })).name).toBe('xbox 360 (raw)');
    expect(padLayout(makePad({ id: '0f0d-00c1-Generic USB Pad', buttons: 12 })).name).toBe('generic');
  });

  it('decodes all eight hat positions, and centred as nothing', () => {
    expect(hatDirections(HAT_CENTRED)).toEqual({ up: false, down: false, left: false, right: false });
    expect(hatDirections(-HAT_CENTRED)).toEqual({ up: false, down: false, left: false, right: false });
    const dirs = [0, 1, 2, 3, 4, 5, 6, 7].map((p) => Object.entries(hatDirections(hat(p))).filter(([, v]) => v).map(([k]) => k).sort().join('+'));
    expect(dirs).toEqual(['up', 'right+up', 'right', 'down+right', 'down', 'down+left', 'left', 'left+up']);
  });
});

describe('InputManager with real-world pads', () => {
  it('standard pad: A confirms, B cancels, X is secondary, Y opens the menu', () => {
    const input = new InputManager({ target: {} });
    const pad = standardPad();
    pads = [pad];
    frames(input);
    expect(press(input, pad, 0).confirm).toBe(true);
    expect(press(input, pad, 1).cancel).toBe(true);
    expect(press(input, pad, 2).secondary).toBe(true);
    expect(press(input, pad, 3).menu).toBe(true);
    expect(press(input, pad, 9).menu).toBe(true);
  });

  it('Firefox on macOS, unmapped Xbox pad over Bluetooth: every face button does its job', () => {
    const input = new InputManager({ target: {} });
    const pad = firefoxMacXbox();
    pads = [pad];
    frames(input);
    const a = press(input, pad, 0);
    expect(a.confirm).toBe(true);
    expect(a.pageRight).toBe(false);
    expect(press(input, pad, 1).cancel).toBe(true);
    const x = press(input, pad, 3);
    expect(x.secondary).toBe(true);
    expect(x.menu).toBe(false); // raw 3 is X here, not Y
    const y = press(input, pad, 4);
    expect(y.menu).toBe(true);
    expect(y.pageLeft).toBe(false); // raw 4 is Y here, not LB
    expect(press(input, pad, 6).pageLeft).toBe(true); // LB
    expect(press(input, pad, 7).pageRight).toBe(true); // RB
    expect(press(input, pad, 11).menu).toBe(true); // Menu (start)
  });

  it('Firefox on macOS: the d-pad hat moves, and resting triggers never hold a direction', () => {
    const input = new InputManager({ target: {} });
    const pad = firefoxMacXbox();
    pads = [pad];
    frames(input, 3);
    expect(input.heldDirection()).toBe(null);
    for (const [pos, dir] of [[0, 'up'], [2, 'right'], [4, 'down'], [6, 'left']]) {
      pad.axes[9] = hat(pos);
      frames(input);
      expect(input.isDown(dir), dir).toBe(true);
      pad.axes[9] = HAT_CENTRED;
      frames(input);
      expect(input.isDown(dir)).toBe(false);
    }
    // The stick still works.
    pad.axes[0] = -0.9;
    frames(input);
    expect(input.isDown('left')).toBe(true);
  });

  it('a second HID device listed before the controller cannot hide it', () => {
    const bus = new EventBus();
    const seen = [];
    bus.on('input:pad', (e) => seen.push(e.layout));
    const input = new InputManager({ bus, target: {} });
    // Index 0: something that isn't the controller, with an axis resting off-centre.
    const phantom = makePad({ id: '05ac-0000-Some HID Device', index: 0, buttons: 2, axes: [0, -1] });
    const pad = firefoxMacXbox(1);
    pads = [phantom, pad];
    frames(input, 2);
    expect(input.heldDirection()).toBe(null);
    expect(input.device).toBe('keyboard');
    expect(press(input, pad, 0).confirm).toBe(true);
    expect(input.device).toBe('gamepad');
    expect(seen).toEqual(['generic', 'xbox (raw)']);
  });

  it('ignores disconnected pads and follows a pad that reconnects at a new index', () => {
    const input = new InputManager({ target: {} });
    const old = standardPad(0);
    old.connected = false;
    const pad = standardPad(1);
    pads = [old, pad];
    frames(input);
    expect(press(input, pad, 0).confirm).toBe(true);
    pads = [null, null, standardPad(2)];
    frames(input);
    expect(press(input, pads[2], 1).cancel).toBe(true);
  });

  it('switches prompts to the pad on a press, and back on a key', () => {
    const listeners = {};
    const target = { addEventListener: (t, fn) => { listeners[t] = fn; }, removeEventListener: () => {} };
    const input = new InputManager({ target });
    const pad = firefoxMacXbox();
    pads = [pad];
    frames(input);
    expect(input.device).toBe('keyboard');
    press(input, pad, 0);
    expect(input.device).toBe('gamepad');
    expect(input.glyph('confirm')).not.toBe('?');
    listeners.keydown({ code: 'KeyZ', repeat: false, preventDefault() {} });
    frames(input);
    expect(input.device).toBe('keyboard');
  });

  it('describes each pad for the debug overlay', () => {
    const input = new InputManager({ target: {} });
    const pad = firefoxMacXbox();
    pads = [pad];
    pad.buttons[3].pressed = true;
    const [info] = input.padInfo();
    expect(info).toMatchObject({ index: 0, mapping: '(none)', layout: 'xbox (raw)', down: [3], hat: 9 });
  });
});
