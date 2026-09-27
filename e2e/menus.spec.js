import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * The pause menu and shops share one scene that Phaser reuses. Opening one
 * after the other must never leave pieces of the previous screen behind
 * (a stale shop once kept drawing over the inventory and swallowed input).
 */
const menuTexts = (page) =>
  page.evaluate(() => {
    const m = window.__GAME__.game.scene.getScene('Menu');
    return m.children.list.filter((o) => typeof o.text === 'string').map((o) => o.text);
  });

async function openShopFromMags(page, g) {
  await g.approach('mags');
  await g.tap('KeyZ', 50, 300);
  await g.waitFor(() => window.__GAME__.app.overlay.dialogue.resolveLine && !window.__GAME__.app.overlay.dialogue.typing);
  await g.tap('KeyZ', 50, 300);
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu);
  await g.keys('ArrowDown', 'KeyZ'); // "I need provisions"
  await g.waitFor(() => window.__GAME__.game.scene.isActive('Menu'));
  await g.wait(300);
}

test('shop and pause menu never bleed into each other', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const g = new GameDriver(page);
  await g.newGame();
  await g.skip();
  await page.evaluate(() => {
    window.__GAME__.app.session.story.set('galley_argument_seen');
    window.__GAME__.game.scene.getScene('World').transitionTo('galley', { spawn: 'ladder' });
  });
  await g.waitFor(() => window.__GAME__.game.scene.getScene('World')?.model?.id === 'galley');
  await g.wait(800);
  await g.idle();

  // Shop: buy one hardtack, then leave.
  const before = (await g.state()).items.hardtack;
  await openShopFromMags(page, g);
  expect(await menuTexts(page)).toContain('For sale');
  await g.keys('KeyZ', 'KeyZ', 'KeyZ'); // Buy → Hardtack → confirm ×1
  await g.wait(300);
  expect((await g.state()).items.hardtack).toBe(before + 1);
  await g.keys('KeyX', 'KeyX'); // back to commands, leave
  await g.wait(500);
  await g.skip();
  await g.idle();

  // Pause menu afterwards: nothing from the shop, and the cursor responds.
  await g.tap('KeyC', 50, 500);
  expect(await page.evaluate(() => window.__GAME__.game.scene.getScene('Menu').shopView)).toBeNull();
  let texts = await menuTexts(page);
  expect(texts).toContain('Status');
  expect(texts).not.toContain('For sale');
  expect(texts).not.toContain('Your goods');
  expect(texts.some((t) => t.includes('Galley Stores'))).toBe(false);
  await g.keys('ArrowDown');
  expect(await page.evaluate(() => window.__GAME__.game.scene.getScene('Menu').nav.index)).toBe(1);
  texts = await menuTexts(page);
  expect(texts).toContain('Supplies'); // the Items page, drawn cleanly
  expect(texts).not.toContain('Price');
  await g.keys('KeyX');
  await g.wait(400);
  expect(await page.evaluate(() => window.__GAME__.game.scene.isActive('Menu'))).toBe(false);

  // And the other way round: the shop again shows no pause-menu pieces.
  await g.idle();
  await openShopFromMags(page, g);
  texts = await menuTexts(page);
  expect(texts).toContain('For sale');
  expect(texts).not.toContain('Quit to Title');
  expect(texts).not.toContain('Supplies');
  await g.keys('KeyX');
  await g.wait(500);
  await g.skip();
  await g.idle();

  expect(errors).toEqual([]);
});
