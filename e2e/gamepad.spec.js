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
 */
const HAT_CENTRED = 8 / 3.5 - 1;
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
    A: 0, B: 1, Y: 4, dpadRight: { axis: 9, value: (2 * 2) / 7 - 1, rest: HAT_CENTRED },
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

    await page.goto('/');
    await page.waitForFunction(() => window.__GAME__?.game.scene.isActive('Title'), null, { timeout: 30000 });
    await page.evaluate(() => window.__GAME__.app.settings.set('textSpeed', 'instant'));
    await page.waitForTimeout(800);
    // Nothing is pressed yet: the extra device's resting axis must not count as input.
    expect(await page.evaluate(() => window.__GAME__.app.input.device)).toBe('keyboard');
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
