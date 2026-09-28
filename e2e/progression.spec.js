import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Playing "out of order" must never break things:
 * - the treasure door says it's locked without the key, and opens as soon as
 *   the captain has it (without leaving the room first),
 * - holding a direction through a ladder or hatch never bounces the captain
 *   straight back through it,
 * - clearing the rats before speaking to Quill still completes the quest.
 */
const where = (g) => g.eval(() => { const w = window.__GAME__.game.scene.getScene('World'); return { map: w.model.id, x: w.player.tx, y: w.player.ty }; });

async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(250);
}

test('doors, ladders and quest order hold up to unusual play', { tag: ['@prologue', '@world'] }, async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const g = new GameDriver(page);
  await g.newGame({ autoTiming: 0 });
  await g.skip();
  // Leave WITHOUT the Captain's Key from the desk.
  await g.travel(8, 11, 'main_deck');
  await g.idle();

  // Down the main hatch; the galley argument starts Rats in the Hold.
  await g.travel(9, 24, 'galley');
  await g.skip();
  await g.idle();
  expect((await g.state()).quests.rats_in_the_hold.status).toBe('active');

  // Climb the ladder holding Up: arrive on deck and keep walking away from the hatch.
  await g.goto(14, 4);
  await holdKey(page, 'ArrowUp', 900);
  await g.idle();
  let at = await where(g);
  expect(at.map).toBe('main_deck');
  expect(at.y).toBeLessThan(23);

  // Enter the hatch from its south side holding Up: arrive at the galley ladder
  // and stay there (no bounce back up) until Up is pressed again.
  await g.goto(9, 25);
  await holdKey(page, 'ArrowUp', 1000);
  await g.idle();
  at = await where(g);
  expect(at.map).toBe('galley');
  await holdKey(page, 'ArrowUp', 300);
  await g.waitFor(() => window.__GAME__.game.scene.getScene('World').model.id === 'main_deck', null, 8000);
  await g.idle();
  await g.travel(9, 24, 'galley');
  await g.idle();

  // Cargo hold. The treasure door is locked without the key and says so.
  await g.travel(12, 10, 'cargo_hold');
  await g.skip();
  await g.idle();
  await g.goto(4, 4);
  await page.keyboard.down('ArrowUp');
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.resolveLine, null, 5000);
  await page.keyboard.up('ArrowUp');
  await g.skip();
  at = await where(g);
  expect(at).toEqual({ map: 'cargo_hold', x: 4, y: 4 });
  // Confirm on the door gives the same message.
  await g.tap('ArrowUp', 30, 200);
  await g.tap('KeyZ', 50, 300);
  expect(await g.eval(() => !!window.__GAME__.app.overlay.dialogue.resolveLine)).toBe(true);
  await g.skip();

  // Clear the hold before ever speaking to Quill.
  for (const id of ['rats_1', 'rats_2', 'rats_nest']) await g.fight(id);
  await g.idle();
  let s = await g.state();
  expect(s.quests.rats_in_the_hold.objectives.clear_hold.done).toBe(true);
  expect(s.quests.rats_in_the_hold.objectives.talk_quartermaster.done).toBe(false);

  // With the key, the same door opens at once (no need to leave the room).
  await g.eval(() => window.__GAME__.app.session.inventory.add('treasure_key', 1));
  await g.travel(4, 3, 'treasure_hold');
  await g.idle();
  await g.travel(9, 13, 'cargo_hold');
  await g.idle();

  // Quill hears it's already done, and the quest completes in one conversation.
  await g.travel(14, 3, 'galley');
  await g.idle();
  await g.interact('quill');
  await g.idle();
  s = await g.state();
  expect(s.quests.rats_in_the_hold.status).toBe('completed');
  expect(s.items.rat_catchers_charm).toBe(1);

  expect(errors).toEqual([]);
});
