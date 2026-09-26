import { ACTIONS, KEY_BINDINGS, PAD_BINDINGS, PREVENT_DEFAULT, PROMPT_GLYPHS, STICK_DEADZONE } from './bindings.js';
import { BUTTON_GLYPHS } from '../../art/font/glyphs.js';

const REPEAT_DELAY = 280; // ms before a held direction starts repeating in menus
const REPEAT_RATE = 85; // ms between repeats

/**
 * Unified keyboard + gamepad input, polled once per frame.
 *
 *   input.isDown('run')        held this frame
 *   input.pressed('confirm')   went down this frame (and not consumed)
 *   input.repeat('down')       pressed, or held long enough to auto-repeat (menus)
 *   input.consume('confirm')   stop other listeners seeing this press
 *
 * Taps shorter than a frame still register for one frame. The last-used
 * device drives on-screen button prompts.
 */
export class InputManager {
  constructor({ bus = null, target = globalThis.window } = {}) {
    this.bus = bus;
    this.target = target;
    this.codesDown = new Set();
    this.codesTapped = new Set();
    this.state = Object.fromEntries(ACTIONS.map((a) => [a, { down: false, prev: false, since: 0, lastRepeat: 0, consumed: false }]));
    this.device = 'keyboard';
    this.now = 0;
    this.enabled = true;
    this.padIndex = null;
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onBlur = this.onBlur.bind(this);
    if (target?.addEventListener) {
      target.addEventListener('keydown', this.onKeyDown);
      target.addEventListener('keyup', this.onKeyUp);
      target.addEventListener('blur', this.onBlur);
    }
  }

  destroy() {
    this.target?.removeEventListener?.('keydown', this.onKeyDown);
    this.target?.removeEventListener?.('keyup', this.onKeyUp);
    this.target?.removeEventListener?.('blur', this.onBlur);
  }

  onKeyDown(e) {
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.codesDown.add(e.code);
    this.codesTapped.add(e.code);
    this.setDevice('keyboard');
  }

  onKeyUp(e) {
    this.codesDown.delete(e.code);
  }

  onBlur() {
    this.codesDown.clear();
  }

  setDevice(device) {
    if (this.device === device) return;
    this.device = device;
    this.bus?.emit('input:device', { device });
  }

  readPad() {
    const pads = globalThis.navigator?.getGamepads?.() || [];
    let pad = this.padIndex !== null ? pads[this.padIndex] : null;
    if (!pad) {
      pad = [...pads].find((p) => p && p.connected) || null;
      this.padIndex = pad ? pad.index : null;
    }
    return pad;
  }

  padActionDown(pad, action) {
    if (!pad) return false;
    const pressed = (i) => !!pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5);
    if (PAD_BINDINGS[action].some(pressed)) return true;
    const ax = pad.axes[0] || 0;
    const ay = pad.axes[1] || 0;
    if (action === 'left') return ax < -STICK_DEADZONE && Math.abs(ax) >= Math.abs(ay);
    if (action === 'right') return ax > STICK_DEADZONE && Math.abs(ax) >= Math.abs(ay);
    if (action === 'up') return ay < -STICK_DEADZONE && Math.abs(ay) > Math.abs(ax);
    if (action === 'down') return ay > STICK_DEADZONE && Math.abs(ay) > Math.abs(ax);
    return false;
  }

  /** Call once per frame before any scene reads input. */
  update(now) {
    this.now = now;
    const pad = this.readPad();
    let padActive = false;
    for (const action of ACTIONS) {
      const st = this.state[action];
      st.prev = st.down;
      st.consumed = false;
      const key = KEY_BINDINGS[action].some((c) => this.codesDown.has(c) || this.codesTapped.has(c));
      const padDown = this.padActionDown(pad, action);
      if (padDown && !st.prev) padActive = true;
      st.down = this.enabled && (key || padDown);
      if (st.down && !st.prev) {
        st.since = now;
        st.lastRepeat = now;
      }
    }
    this.codesTapped.clear();
    if (padActive) this.setDevice('gamepad');
  }

  isDown(action) {
    return this.state[action].down;
  }

  pressed(action) {
    const st = this.state[action];
    return st.down && !st.prev && !st.consumed;
  }

  released(action) {
    const st = this.state[action];
    return !st.down && st.prev;
  }

  /** Menu-style auto-repeat for held directions. */
  repeat(action) {
    const st = this.state[action];
    if (st.consumed || !st.down) return false;
    if (!st.prev) return true;
    if (this.now - st.since < REPEAT_DELAY) return false;
    if (this.now - st.lastRepeat >= REPEAT_RATE) {
      st.lastRepeat = this.now;
      return true;
    }
    return false;
  }

  consume(action) {
    this.state[action].consumed = true;
  }

  consumeAll() {
    for (const a of ACTIONS) this.state[a].consumed = true;
  }

  /** Currently held direction for movement, preferring the most recent press. */
  heldDirection() {
    let best = null;
    for (const dir of ['up', 'down', 'left', 'right']) {
      const st = this.state[dir];
      if (st.down && (!best || st.since > this.state[best].since)) best = dir;
    }
    return best;
  }

  /** Private-use glyph character for an action on the current device. */
  glyph(action) {
    const id = PROMPT_GLYPHS[this.device][action] ?? PROMPT_GLYPHS.keyboard[action];
    return id ? String.fromCodePoint(BUTTON_GLYPHS[id]) : '?';
  }
}
