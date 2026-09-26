import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Plays the whole Phase 1 prologue in a real browser, the way a player would:
 * opening cutscene, Captain's Rounds, Rats in the Hold (with real battles),
 * reporting back, saving to a slot, reloading and continuing.
 *
 * Timed hits use the debug "auto timing" aid so battles are deterministic
 * enough for CI; everything else is real key presses.
 */
test('the prologue can be played from New Game to free exploration', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const g = new GameDriver(page);

  // Content validation must be clean in the running game.
  await g.waitFor(() => !!window.__GAME__?.app);
  expect(await g.eval(() => window.__GAME__.app.validation.errors)).toEqual([]);

  await g.newGame({ autoTiming: 0 });
  await g.skip();
  let s = await g.state();
  expect(s.map).toBe('captains_quarters');
  expect(s.flags).toContain('opening_seen');
  expect(s.quests.captains_rounds.status).toBe('active');

  // The key is in the desk; the sea chest holds the lucky doubloon.
  await g.interact([8, 7]);
  await g.interact([1, 9]);
  s = await g.state();
  expect(s.items.treasure_key).toBe(1);
  expect(s.items.lucky_doubloon).toBe(1);

  // Main deck: the first mate and the helm.
  await g.travel(8, 11, 'main_deck');
  await g.idle();
  await g.interact('hale', 3);
  await g.interact([9, 6]);
  s = await g.state();
  expect(s.quests.captains_rounds.objectives.talk_first_mate.done).toBe(true);
  expect(s.quests.captains_rounds.objectives.inspect_deck.done).toBe(true);

  // Galley: the argument starts Rats in the Hold.
  await g.travel(9, 24, 'galley');
  await g.skip();
  s = await g.state();
  expect(s.quests.rats_in_the_hold.status).toBe('active');
  await g.interact('quill');

  // Cargo hold: Jory, the gunnery crate, and three nests of rats.
  await g.travel(12, 10, 'cargo_hold');
  await g.skip();
  await g.interact('jory');
  await g.interact([2, 15]);
  for (const id of ['rats_1', 'rats_2', 'rats_nest']) await g.fight(id);
  await g.idle();
  s = await g.state();
  expect(s.quests.rats_in_the_hold.objectives.clear_hold.done).toBe(true);
  expect(s.items.rusty_key).toBe(1);
  expect(s.level).toBeGreaterThan(1);

  // Treasure hold (the captain has the key).
  await g.travel(4, 3, 'treasure_hold');
  await g.idle();
  await g.interact([5, 4]);
  s = await g.state();
  expect(s.quests.captains_rounds.objectives.inspect_treasure.done).toBe(true);

  // Report to Quill, then to Hale.
  await g.travel(6, 9, 'cargo_hold');
  await g.idle();
  await g.travel(14, 3, 'galley');
  await g.idle();
  await g.interact('quill');
  await g.idle();
  s = await g.state();
  expect(s.quests.rats_in_the_hold.status).toBe('completed');
  expect(s.items.rat_catchers_charm).toBe(1);

  await g.travel(14, 3, 'main_deck');
  await g.idle();
  await g.interact('hale');
  await g.wait(1500);
  await g.skip();
  await g.idle();
  s = await g.state();
  expect(s.quests.captains_rounds.status).toBe('completed');
  expect(s.flags).toContain('tutorial_complete');

  // Save to slot 1 from the pause menu.
  await g.tap('KeyC', 45, 500);
  await g.keys('ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'KeyZ');
  await g.wait(300);
  await g.keys('KeyZ');
  await g.wait(400);
  const saved = await g.eval(() => window.__GAME__.app.saves.listSlots().find((i) => i.slot === 1));
  expect(saved.status).toBe('ok');
  await g.keys('KeyX');
  await g.wait(400);

  // Reload the page and continue from the title screen.
  const before = await g.state();
  await page.reload();
  await g.titleChoose('continue');
  await g.idle();
  const after = await g.state();
  expect(after.map).toBe(before.map);
  expect(after.level).toBe(before.level);
  expect(after.gold).toBe(before.gold);
  expect(after.quests).toEqual(before.quests);
  expect(after.flags).toEqual(before.flags);

  expect(errors).toEqual([]);
});
