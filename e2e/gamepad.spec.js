import { test, expect } from '@playwright/test';

/**
 * Controller-first check: a simulated standard-mapping gamepad (the browser
 * Gamepad API is stubbed) starts a new game, skips the opening, walks with the
 * stick and D-pad, and opens/closes the pause menu. Prompts must switch to
 * gamepad glyphs.
 */
test('the game is fully playable with a gamepad', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false }));
    const pad = { id: 'Test Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons, timestamp: 0 };
    window.__pad = pad;
    navigator.getGamepads = () => [pad, null, null, null];
  });
  const A = 0;
  const B = 1;
  const Y = 3;
  const DPAD_RIGHT = 15;
  const press = async (button, ms = 70) => {
    await page.evaluate((b) => { window.__pad.buttons[b].pressed = true; window.__pad.buttons[b].value = 1; }, button);
    await page.waitForTimeout(ms);
    await page.evaluate((b) => { window.__pad.buttons[b].pressed = false; window.__pad.buttons[b].value = 0; }, button);
    await page.waitForTimeout(140);
  };
  const stick = async (x, y, ms) => {
    await page.evaluate(([ax, ay]) => { window.__pad.axes[0] = ax; window.__pad.axes[1] = ay; }, [x, y]);
    await page.waitForTimeout(ms);
    await page.evaluate(() => { window.__pad.axes[0] = 0; window.__pad.axes[1] = 0; });
    await page.waitForTimeout(300);
  };
  const state = () => page.evaluate(() => window.__GAME__.test.state());

  await page.goto('/');
  await page.waitForFunction(() => window.__GAME__?.game.scene.isActive('Title'), null, { timeout: 30000 });
  await page.evaluate(() => window.__GAME__.app.settings.set('textSpeed', 'instant'));
  await page.waitForTimeout(800);
  while ((await page.evaluate(() => window.__GAME__.game.scene.getScene('Title').state)) !== 'menu') await press(A);
  await press(A); // New Game (first entry when there is no save)
  await page.waitForFunction(() => window.__GAME__.game.scene.isActive('World'), null, { timeout: 15000 });

  // Read through the opening with the A button.
  for (let i = 0; i < 300; i++) {
    const busy = await page.evaluate(() => window.__GAME__.game.scene.getScene('World').isBusy());
    if (!busy) break;
    await press(A, 50);
  }
  expect(await page.evaluate(() => window.__GAME__.app.input.device)).toBe('gamepad');
  expect(await page.evaluate(() => window.__GAME__.app.input.glyph('confirm'))).not.toBe(
    await page.evaluate(() => { const i = window.__GAME__.app.input; const d = i.device; i.device = 'keyboard'; const g = i.glyph('confirm'); i.device = d; return g; }),
  );

  const start = await state();
  await stick(-1, 0, 480);
  const afterStick = await state();
  expect(afterStick.facing).toBe('left');
  expect(afterStick.x).toBeLessThan(start.x);

  await press(DPAD_RIGHT, 480);
  const afterPad = await state();
  expect(afterPad.facing).toBe('right');
  expect(afterPad.x).toBeGreaterThan(afterStick.x);

  await press(Y);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__GAME__.game.scene.isActive('Menu'))).toBe(true);
  await press(B);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__GAME__.game.scene.isActive('Menu'))).toBe(false);

  expect(errors).toEqual([]);
});
