import { addPanel } from '../Panel.js';
import { addText, setText, centerText, UI_COLORS } from '../text.js';
import { InputManager } from '../../platform/input/InputManager.js';

/**
 * Controller setup: learns where a controller's buttons are by asking for
 * each one in turn, and saves that per controller (settings.padLayouts,
 * keyed by the id the browser reports).
 *
 * For browsers that hand a controller over unmapped or mis-mapped (Firefox on
 * macOS with an Xbox pad over Bluetooth): the game can't know that layout,
 * but the player can show it. While this is open, pads don't drive actions;
 * it reads raw buttons and axes, and shows them live, so it also tells the
 * player at a glance whether the browser is sending anything at all.
 *
 * Optional steps are skipped with the Confirm button just set up, the
 * keyboard's Space/Z/Enter, or by waiting. Esc/X cancels.
 */
const STEPS = [
  { key: 'south', label: 'Confirm / talk', hint: 'A: the bottom face button', required: true },
  { key: 'east', label: 'Cancel / back', hint: 'B: the right face button', required: true },
  { key: 'west', label: 'Secondary', hint: 'X: the left face button' },
  { key: 'north', label: 'Menu', hint: 'Y: the top face button' },
  { key: 'start', label: 'Pause', hint: 'Menu (or Start)' },
  { key: 'lb', label: 'Previous tab', hint: 'LB: the left bumper' },
  { key: 'rb', label: 'Next tab', hint: 'RB: the right bumper' },
  { key: 'up', label: 'D-pad up', dir: true },
  { key: 'down', label: 'D-pad down', dir: true },
  { key: 'left', label: 'D-pad left', dir: true },
  { key: 'right', label: 'D-pad right', dir: true },
];
const AUTO_SKIP_MS = 9000;

/** "045e-0b20-Xbox Wireless Controller" / "Xbox Wireless Controller (Vendor: …)" -> "Xbox Wireless Controller". */
export function padDisplayName(id) {
  return String(id ?? '').replace(/^[0-9a-f]{1,4}-[0-9a-f]{1,4}-/i, '').replace(/\s*\(.*\)\s*$/, '').trim() || 'Gamepad';
}

export class ControllerSetupPanel {
  /**
   * @param {object} opts
   * @param {string} [opts.padId] set up this pad (else the first one pressed)
   * @param {boolean} [opts.offered] opened by the game for an unrecognised pad:
   *   cancelling means "keep the automatic layout, don't ask again"
   */
  constructor(scene, { onClose, depth = 320, padId = null, offered = false } = {}) {
    this.scene = scene;
    this.app = scene.game.app;
    this.input = this.app.input;
    this.onClose = onClose;
    this.depth = depth;
    this.offered = offered;
    this.padId = padId;
    this.phase = padId ? 'release' : 'pick';
    this.step = 0;
    this.buttons = {};
    this.dirs = {};
    this.message = '';
    this.stepStart = this.input.now;
    this.input.suspendPads = true;
    this.build();
    this.render();
  }

  build() {
    const s = this.scene;
    const d = this.depth;
    const x = 20;
    const y = 12;
    const w = 280;
    const h = 200;
    this.box = { x, y, w, h };
    this.parts = [addPanel(s, x, y, w, h, { depth: d })];
    this.title = addText(s, 0, y + 7, 'CONTROLLER SETUP', { font: 'bold', color: UI_COLORS.heading, depth: d + 1 });
    centerText(this.title, x + w / 2);
    this.who = addText(s, x + 12, y + 22, '', { color: UI_COLORS.dim, depth: d + 1, maxWidth: w - 24 });
    this.prompt = addText(s, x + 12, y + 40, '', { depth: d + 1, maxWidth: w - 24 });
    this.list = addText(s, x + 12, y + 80, '', { depth: d + 1 });
    this.list2 = addText(s, x + 146, y + 80, '', { depth: d + 1 });
    this.live = addText(s, x + 12, y + h - 42, '', { color: UI_COLORS.dim, depth: d + 1, maxWidth: w - 24 });
    this.help = addText(s, x + 12, y + h - 16, '', { color: UI_COLORS.dim, depth: d + 1 });
    this.parts.push(this.title, this.who, this.prompt, this.list, this.list2, this.live, this.help);
  }

  entry() {
    return this.input.pads.find((e) => e.pad.id === this.padId) ?? null;
  }

  /** Everything on the pad is let go, and every axis is back where it rests. */
  settled(e) {
    if (!e) return false;
    const { pad, rest } = e;
    if (pad.buttons.some((_, i) => InputManager.buttonDown(pad, i))) return false;
    return Array.from(pad.axes ?? []).every((v, i) => Math.abs((v ?? 0) - (rest[i] ?? 0)) < 0.3);
  }

  assignedTo(button) {
    for (const [k, v] of Object.entries(this.buttons)) if (v === button) return k;
    for (const [k, v] of Object.entries(this.dirs)) if (v.button === button) return k;
    return null;
  }

  update(input) {
    const now = input.now;
    if (input.pressed('cancel')) {
      input.consume('cancel');
      this.close(false);
      return;
    }
    const e = this.padId ? this.entry() : null;
    if (this.phase === 'pick') {
      const press = input.padPresses[0];
      if (press) {
        this.padId = press.id;
        this.phase = 'release';
      }
    } else if (this.phase === 'release') {
      if (this.settled(e)) {
        this.phase = 'step';
        this.stepStart = now;
      }
    } else if (this.phase === 'step') {
      const step = STEPS[this.step];
      const skip = input.pressed('confirm') || (!step.required && now - this.stepStart > AUTO_SKIP_MS);
      input.consume('confirm');
      if (skip && !step.required) {
        this.message = `Skipped: ${step.label}.`;
        this.next();
      } else if (e) {
        this.capture(step, e, input);
      }
    } else if (this.phase === 'done') {
      // The new layout is live: its confirm (or the keyboard's) finishes.
      if (input.pressed('confirm')) {
        input.consume('confirm');
        this.close(true);
        return;
      }
    }
    this.render();
  }

  capture(step, e, input) {
    const press = input.padPresses.find((p) => p.id === this.padId);
    if (press && !step.required && press.button === this.buttons.south) {
      // The Confirm button just set up skips an optional step (no keyboard needed).
      this.message = `Skipped: ${step.label}.`;
      this.next();
      return;
    }
    if (press) {
      const used = this.assignedTo(press.button);
      if (used) {
        this.message = `<r>Button ${press.button} is already ${STEPS.find((s) => s.key === used).label}.</>`;
        return;
      }
      if (step.dir) this.dirs[step.key] = { button: press.button };
      else this.buttons[step.key] = press.button;
      this.message = `<g>${step.label}: button ${press.button}.</>`;
      this.next();
      return;
    }
    if (!step.dir) return;
    // A D-pad that arrives as a hat axis (or a stick pushed for the D-pad).
    const { pad, rest } = e;
    const axes = Array.from(pad.axes ?? []);
    // A hat rests outside -1..1, so any value inside that range is a direction
    // (its left position is only ~0.57 from centre); other axes must move well off rest.
    const moved = (v, r) => (Math.abs(r) > 1.05 ? Math.abs(v) <= 1.05 : Math.abs(v - r) > 0.6);
    const i = axes.findIndex((v, k) => moved(v ?? 0, rest[k] ?? 0));
    if (i < 0) return;
    const hat = Math.abs(rest[i] ?? 0) > 1.05;
    this.dirs[step.key] = hat ? { axis: i, value: Math.round(axes[i] * 1000) / 1000, hat: true } : { axis: i, value: Math.sign(axes[i]) };
    this.message = `<g>${step.label}: axis ${i}.</>`;
    this.next();
  }

  next() {
    this.step += 1;
    if (this.step >= STEPS.length) this.finish();
    else this.phase = 'release';
  }

  finish() {
    const layouts = { ...(this.app.settings.get('padLayouts') ?? {}) };
    const saved = { buttons: { ...this.buttons } };
    if (Object.keys(this.dirs).length) saved.dirs = { ...this.dirs };
    layouts[this.padId] = saved;
    this.app.settings.set('padLayouts', layouts);
    this.input.suspendPads = false;
    this.phase = 'done';
    this.app.audio.ui('confirm');
  }

  close(saved) {
    if (!saved && this.offered && this.padId && this.phase !== 'done') {
      // Declined when offered: keep the automatic layout and stop asking.
      const layouts = { ...(this.app.settings.get('padLayouts') ?? {}) };
      if (!layouts[this.padId]) {
        layouts[this.padId] = { auto: true };
        this.app.settings.set('padLayouts', layouts);
      }
    }
    this.input.suspendPads = false;
    this.input.consumeAll();
    this.app.audio.ui(saved ? 'confirm' : 'cancel');
    this.destroy();
    this.onClose?.(saved);
  }

  render() {
    const pad = this.padId ? this.entry()?.pad : null;
    const name = this.padId ? padDisplayName(this.padId) : null;
    setText(this.who, name
      ? `${name}  <k>(${pad?.mapping === 'standard' ? 'standard layout' : 'layout unknown to this browser'})</>`
      : 'Press any button on the controller to set up.');
    const step = STEPS[this.step];
    if (this.phase === 'pick') setText(this.prompt, 'Waiting for a controller...\n<k>If nothing happens, the browser is not sending this controller\'s buttons.</>');
    else if (this.phase === 'done') setText(this.prompt, '<g>Saved.</> Press your <y>Confirm</> button (A) to finish.');
    else {
      const wait = this.phase === 'release' ? '<k>(let go of everything)</>' : `<y>${step.hint ?? step.label}</>`;
      setText(this.prompt, `Press:  <y>${step.label}</>\n${wait}${this.message ? `\n${this.message}` : ''}`);
    }
    const line = (st, i) => {
      const v = st.dir ? this.dirs[st.key] : this.buttons[st.key];
      const val = v === undefined ? (i < this.step ? '<k>-</>' : '') : typeof v === 'number' ? `btn ${v}` : v.button !== undefined ? `btn ${v.button}` : `axis ${v.axis}`;
      const mark = i === this.step && this.phase !== 'done' && this.phase !== 'pick' ? '<y>></>' : ' ';
      return `${mark}${st.label.padEnd(15)}${val}`;
    };
    setText(this.list, STEPS.slice(0, 6).map((st, i) => line(st, i)).join('\n'));
    setText(this.list2, STEPS.slice(6).map((st, i) => line(st, i + 6)).join('\n'));
    // What the browser is sending right now, raw.
    if (pad) {
      const down = pad.buttons.map((_, i) => (InputManager.buttonDown(pad, i) ? i : -1)).filter((i) => i >= 0);
      const rest = this.entry()?.rest ?? [];
      const moved = Array.from(pad.axes ?? []).map((v, i) => [i, v]).filter(([i, v]) => Math.abs((v ?? 0) - (rest[i] ?? 0)) > 0.3);
      setText(this.live, `Browser sees: buttons [${down.join(' ')}]  axes [${moved.map(([i, v]) => `${i}:${v.toFixed(2)}`).join(' ')}]`);
    } else setText(this.live, '');
    const optional = this.phase === 'step' && !step?.required;
    const left = optional ? Math.max(0, Math.ceil((AUTO_SKIP_MS - (this.input.now - this.stepStart)) / 1000)) : 0;
    setText(this.help, this.phase === 'done' ? 'Keyboard: Z to finish' : `Esc: cancel${optional ? `   Skip: your A, or Space (${left}s)` : ''}`);
  }

  destroy() {
    this.parts.forEach((p) => p.destroy());
    this.parts = [];
  }
}
