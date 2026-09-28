import { test, expect } from '@playwright/test';

/**
 * Controller-first check, run with pads as different browsers really report
 * them (the Gamepad API is stubbed): start a new game, read the opening with
 * A, walk with the stick and the D-pad, open the pause menu with Y and close
 * it with B. Prompts must switch to gamepad glyphs.
 *
 * "firefox-mac" is an Xbox pad the way Firefox on macOS hands over one it
 * has no remapper for (mapping "", face buttons at 0/1/3/4, D-pad on hat axis
 * 9, triggers resting at -1), listed after another HID device at index 0.
 * "firefox-shifted" is the same pad with its buttons somewhere the game can't
 * guess (Mozilla bug 1707400: Bluetooth Xbox pads on Apple Silicon Macs).
 * Pads the browser doesn't map are offered the controller setup on the title
 * screen: both go through it, then play with what it learned.
 */
const HAT_CENTRED = 8 / 3.5 - 1;
const hat = (pos) => (pos * 2) / 7 - 1; // 0 up, 2 right, 4 down, 6 left
const HAT_DIRS = { up: hat(0), down: hat(4), left: hat(6), right: hat(2) };
const SETUPS = {
  standard: {
    pads: [{ id: 'Test Pad (STANDARD GAMEPAD)', mapping: 'standard', buttons: 17, axes: [0, 0, 0, 0] }],
    controller: 0,
    A: 0, B: 1, Y: 3, dpadRight: { button: 15 },
  },
  'firefox-mac': {
    pads: [
      { id: '05ac-0000-Some HID Device', mapping: '', buttons: 2, axes: [0, -1] },
      { id: '045e-0b20-Xbox Wireless Controller', mapping: '', buttons: 16, axes: [0, 0, -1, 0, 0, -1, 0, 0, 0, HAT_CENTRED] },
    ],
    controller: 1,
    A: 0, B: 1, Y: 4, dpadRight: { axis: 9, value: HAT_DIRS.right, rest: HAT_CENTRED },
    // south, east, west, north, start, lb, rb; then the D-pad on the hat
    setup: [0, 1, 3, 4, 11, 6, 7],
  },
  'firefox-shifted': {
    pads: [
      { id: '05ac-0000-Some HID Device', mapping: '', buttons: 2, axes: [0, -1] },
      { id: '045e-0b22-Xbox Wireless Controller', mapping: '', buttons: 17, axes: [0, 0, -1, 0, 0, -1, 0, 0, 0, HAT_CENTRED] },
    ],
    controller: 1,
    A: 1, B: 2, Y: 5, dpadRight: { axis: 9, value: HAT_DIRS.right, rest: HAT_CENTRED },
    setup: [1, 2, 4, 5, 12, 7, 8],
  },
};

for (const [name, setup] of Object.entries(SETUPS)) {
  test(`the game is fully playable with a gamepad (${name})`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript((pads) => {
      const list = pads.map((p, index) => ({
        id: p.id, index, connected: true, mapping: p.mapping, timestamp: 0, axes: [...p.axes],
        buttons: Array.from({ length: p.buttons }, () => ({ pressed: false, value: 0, touched: false })),
      }));
      window.__pads = list;
      navigator.getGamepads = () => [...list, null, null].slice(0, 4);
    }, setup.pads);
    const pad = setup.controller;
    const press = async (button, ms = 70) => {
      await page.evaluate(([p, b]) => { window.__pads[p].buttons[b].pressed = true; window.__pads[p].buttons[b].value = 1; }, [pad, button]);
      await page.waitForTimeout(ms);
      await page.evaluate(([p, b]) => { window.__pads[p].buttons[b].pressed = false; window.__pads[p].buttons[b].value = 0; }, [pad, button]);
      await page.waitForTimeout(140);
    };
    const axis = (i, v) => page.evaluate(([p, a, val]) => { window.__pads[p].axes[a] = val; }, [pad, i, v]);
    const stick = async (x, y, ms) => {
      await axis(0, x);
      await axis(1, y);
      await page.waitForTimeout(ms);
      await axis(0, 0);
      await axis(1, 0);
      await page.waitForTimeout(300);
    };
    const dpadRight = async (ms) => {
      const d = setup.dpadRight;
      if (d.button !== undefined) return press(d.button, ms);
      await axis(d.axis, d.value);
      await page.waitForTimeout(ms);
      await axis(d.axis, d.rest);
      await page.waitForTimeout(140);
      return null;
    };
    const state = () => page.evaluate(() => window.__GAME__.test.state());

    const setupPanel = () => page.evaluate(() => {
      const p = window.__GAME__.game.scene.getScene('Title').panel;
      return p && p.phase !== undefined ? { phase: p.phase, step: p.step } : null;
    });

    await page.goto('/');
    await page.waitForFunction(() => window.__GAME__?.game.scene.isActive('Title'), null, { timeout: 30000 });
    await page.evaluate(() => window.__GAME__.app.settings.set('textSpeed', 'instant'));
    await page.waitForTimeout(800);
    // Nothing is pressed yet: the extra device's resting axis must not count as input.
    expect(await page.evaluate(() => window.__GAME__.app.input.device)).toBe('keyboard');
    if (setup.setup) {
      // Before any setup, the pad's own A can't be relied on; its first press offers the setup.
      await press(setup.A);
      expect((await setupPanel())?.phase).toBeTruthy();
      // Each step waits for "let go of everything" to pass, as a person would.
      const ready = (k) => page.waitForFunction((n) => {
        const p = window.__GAME__.game.scene.getScene('Title').panel;
        return p && p.step === n && p.phase === 'step';
      }, k, { timeout: 5000 });
      let k = 0;
      for (const button of setup.setup) {
        await ready(k++);
        await press(button, 90);
      }
      for (const dir of ['up', 'down', 'left', 'right']) {
        await ready(k++);
        await axis(9, HAT_DIRS[dir]);
        await page.waitForTimeout(150);
        await axis(9, HAT_CENTRED);
      }
      await page.waitForFunction(() => window.__GAME__.game.scene.getScene('Title').panel?.phase === 'done', null, { timeout: 5000 });
      expect((await setupPanel())?.phase).toBe('done');
      const saved = await page.evaluate((id) => window.__GAME__.app.settings.get('padLayouts')[id], setup.pads[setup.controller].id);
      expect(saved.buttons).toMatchObject({ south: setup.setup[0], east: setup.setup[1], west: setup.setup[2], north: setup.setup[3] });
      expect(saved.dirs.up).toMatchObject({ axis: 9, hat: true });
      await press(setup.A); // the learned Confirm finishes
      expect(await setupPanel()).toBe(null);
    }
    for (let i = 0; i < 20 && (await page.evaluate(() => window.__GAME__.game.scene.getScene('Title').state)) !== 'menu'; i++) await press(setup.A);
    expect(await page.evaluate(() => window.__GAME__.game.scene.getScene('Title').state)).toBe('menu');
    await press(setup.A); // New Game (first entry when there is no save)
    await page.waitForFunction(() => window.__GAME__.game.scene.isActive('World'), null, { timeout: 15000 });

    // Read through the opening with the A button.
    for (let i = 0; i < 300; i++) {
      const busy = await page.evaluate(() => window.__GAME__.game.scene.getScene('World').isBusy());
      if (!busy) break;
      await press(setup.A, 50);
    }
    expect(await page.evaluate(() => window.__GAME__.game.scene.getScene('World').isBusy())).toBe(false);
    expect(await page.evaluate(() => window.__GAME__.app.input.device)).toBe('gamepad');
    expect(await page.evaluate(() => window.__GAME__.app.input.glyph('confirm'))).not.toBe(
      await page.evaluate(() => { const i = window.__GAME__.app.input; const d = i.device; i.device = 'keyboard'; const g = i.glyph('confirm'); i.device = d; return g; }),
    );

    const start = await state();
    await stick(-1, 0, 480);
    const afterStick = await state();
    expect(afterStick.facing).toBe('left');
    expect(afterStick.x).toBeLessThan(start.x);

    await dpadRight(480);
    const afterPad = await state();
    expect(afterPad.facing).toBe('right');
    expect(afterPad.x).toBeGreaterThan(afterStick.x);

    await press(setup.Y);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__GAME__.game.scene.isActive('Menu'))).toBe(true);
    await press(setup.B);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__GAME__.game.scene.isActive('Menu'))).toBe(false);

    expect(errors).toEqual([]);
  });
}
