import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Story Phase 2 (Garrick Guzzlegut and the Cursed Treasure) in a real
 * browser with real key presses. Chapter presets (data/debug/presets.json)
 * jump to the start of each set-piece; the long test plays the whole phase
 * from the end of the prologue.
 */

const flagsOf = (s) => new Set(s.flags);

async function open(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  const g = new GameDriver(page);
  await g.waitFor(() => !!window.__GAME__?.app);
  expect(await g.eval(() => window.__GAME__.app.validation.errors)).toEqual([]);
  return { g, errors };
}

test('every Phase 2 chapter preset starts cleanly', { tag: ['@phase2', '@smoke'] }, async ({ page }) => {
  const { g, errors } = await open(page);
  const presets = await g.eval(() => window.__GAME__.app.content.debugPresets.list().map((p) => ({ id: p.id, map: p.map })));
  expect(presets.length).toBeGreaterThanOrEqual(9);
  for (const p of presets) {
    await g.preset(p.id);
    await g.skip();
    const s = await g.state();
    expect(s.scenes, p.id).toContain('World');
    expect(s.busy, p.id).toBe(false);
  }
  expect(errors).toEqual([]);
});

test('the rescue: rope, cloth, Dead Center, collapse and the haul-out', { tag: ['@phase2', '@scenes'] }, async ({ page }) => {
  test.setTimeout(6 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('squawks_rescue');

  // Down the hatch without gear: the crew won't allow it.
  await g.goto(9, 23);
  await g.tap('ArrowDown', 60, 400);
  await g.skip();
  expect((await g.state()).map).toBe('main_deck');

  await g.interact('rook');
  await g.interact('fennimore');
  let s = await g.state();
  expect(flagsOf(s).has('rescue_gear_on')).toBe(true);

  await g.travel(9, 24, 'galley');
  await g.skip();
  await g.travel(12, 10, 'cargo_hold');
  await g.skip();

  // Stand in the Dead Center until the captain collapses: Rook hauls him back.
  await g.eval(() => { const w = window.__GAME__.game.scene.getScene('World'); w.services.world.place('player', 5, 5, 'left'); });
  await g.waitFor(() => window.__GAME__.test.state().exposure > 20, null, 10000);
  await g.waitFor(() => window.__GAME__.game.scene.getScene('World').isBusy(), null, 20000);
  await g.skip();
  s = await g.state();
  expect(s.map).toBe('cargo_hold');
  expect([s.x, s.y]).toEqual([14, 4]);
  expect(s.exposure).toBeLessThan(5);
  expect(flagsOf(s).has('squawks_rescued')).toBe(false);

  // Find him, grab him and get back to the stairs.
  await g.interact('squawks');
  expect(flagsOf(await g.state()).has('squawks_caught')).toBe(true);
  await g.goto(14, 5);
  await g.skip();
  s = await g.state();
  expect(s.map).toBe('main_deck');
  expect(flagsOf(s).has('squawks_rescued')).toBe(true);
  expect(flagsOf(s).has('squawks_bald')).toBe(true);
  expect(flagsOf(s).has('boots_stained')).toBe(true);
  expect(s.quests.save_squawks.status).toBe('completed');
  expect(errors).toEqual([]);
});

test('saving and continuing mid-Phase 2 keeps the story', { tag: ['@phase2', '@saves'] }, async ({ page }) => {
  const { g, errors } = await open(page);
  await g.preset('contaminated_treasure');
  await g.skip();
  await g.eval(() => window.__GAME__.game.scene.getScene('World').autosave());
  await page.reload();
  await g.waitFor(() => !!window.__GAME__?.app);
  await g.titleChoose('continue');
  await g.skip();
  const s = await g.state();
  expect(s.map).toBe('treasure_hold');
  const flags = flagsOf(s);
  for (const f of ['guzzlegut_gust', 'squawks_rescued', 'squawks_bald', 'boots_stained', 'treasure_contaminated', 'ruined_reveal_seen']) expect(flags.has(f), f).toBe(true);
  expect(s.quests.price_of_gold.status).toBe('active');
  // The ruined treasure is what's on display, and the captain's boots stayed stained.
  const look = await g.eval(() => {
    const w = window.__GAME__.game.scene.getScene('World');
    return {
      foul: w.props.filter((p) => p.visible && p.prop.endsWith('_foul')).length,
      clean: w.props.filter((p) => p.visible && p.prop === 'gold_pile').length,
      player: w.player.textureKey,
    };
  });
  expect(look.foul).toBeGreaterThan(10);
  expect(look.clean).toBe(0);
  expect(look.player).toBe('char_blackbeard_stained');
  expect(errors).toEqual([]);
});

test('a Phase 2 scene with choices plays with a gamepad', { tag: ['@phase2', '@input'] }, async ({ page }) => {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false }));
    const pad = { id: 'Test Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons, timestamp: 0 };
    window.__pad = pad;
    navigator.getGamepads = () => [pad, null, null, null];
  });
  const { g, errors } = await open(page);
  const press = async (button, ms = 60) => {
    await page.evaluate((b) => { window.__pad.buttons[b].pressed = true; window.__pad.buttons[b].value = 1; }, button);
    await page.waitForTimeout(ms);
    await page.evaluate((b) => { window.__pad.buttons[b].pressed = false; window.__pad.buttons[b].value = 0; }, button);
    await page.waitForTimeout(110);
  };
  await g.preset('garrick_arrival');
  // At the telescope: A to look, then A through every line and choice.
  await press(0);
  for (let i = 0; i < 600; i++) {
    const s = await g.state();
    if (s.quests.strange_cargo?.status === 'completed' && !s.busy) break;
    await press(0, 40);
  }
  const s = await g.state();
  expect(s.quests.strange_cargo.status).toBe('completed');
  expect(await g.eval(() => window.__GAME__.app.input.device)).toBe('gamepad');
  expect(errors).toEqual([]);
});

test('Story Phase 2 plays from the end of the prologue to Garrick\'s probation', { tag: ['@phase2', '@story'] }, async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  const { g, errors } = await open(page);
  const has = async (flag) => flagsOf(await g.state()).has(flag);
  await g.preset('prologue_done');

  // Chapter 1
  await g.interact([14, 5], 0);
  expect(await has('ch1_morning_started')).toBe(true);
  await g.travel(8, 11, 'main_deck');
  await g.skip();
  await g.goto(9, 26);
  await g.skip();
  expect((await g.state()).quests.strange_cargo.status).toBe('active');
  await g.interact([4, 28], 0, 0, 0, 0, 0, 0, 1);
  // Chapter 2 (the time skip leaves the captain in his cabin)
  await g.skip();
  expect((await g.state()).quests.new_recruit.status).toBe('active');
  await g.travel(8, 11, 'main_deck');
  await g.skip();
  await g.interact('garrick', 1);
  await g.interact('garrick', 2);
  expect(await has('garrick_scrub_seen')).toBe(true);
  await g.travel(9, 24, 'galley');
  await g.skip();
  expect(await has('galley_lunch_seen')).toBe(true);
  await g.interact('jim', 0);
  await g.travel(14, 3, 'main_deck');
  await g.skip();
  await g.goto(8, 22);
  await g.skip();
  expect(await has('rumble_sails_seen')).toBe(true);
  await g.interact('garrick', 0);
  // Chapter 3
  await g.skip(0);
  expect((await g.state()).quests.treasure_inspection.status).toBe('active');
  await g.travel(9, 24, 'galley');
  await g.travel(12, 10, 'cargo_hold');
  await g.interact('garrick');
  expect((await g.state()).map).toBe('treasure_hold');
  await g.interact([8, 7]);
  await g.interact([15, 10]);
  expect(await has('treasure_chest_moved')).toBe(true);
  // Chapter 4: the Gust, the cutaways, the escape
  await g.goto(9, 11);
  await g.skip();
  expect(await has('gust_aftermath_done')).toBe(true);
  expect((await g.state()).map).toBe('cargo_hold');
  // Chapter 5
  await g.travel(14, 3, 'galley');
  await g.travel(14, 3, 'main_deck');
  await g.skip();
  await g.interact('garrick');
  expect(await has('squawks_fell')).toBe(true);
  // Chapter 6
  await g.skip();
  await g.interact('rook');
  await g.interact('fennimore');
  await g.travel(9, 24, 'galley');
  await g.skip();
  await g.travel(12, 10, 'cargo_hold');
  await g.skip();
  await g.interact('squawks');
  await g.goto(14, 5);
  await g.skip();
  expect(await has('squawks_rescued')).toBe(true);
  // Chapter 7
  await g.skip();
  expect((await g.state()).quests.price_of_gold.status).toBe('active');
  await g.travel(9, 24, 'galley');
  await g.travel(12, 10, 'cargo_hold');
  await g.travel(4, 3, 'treasure_hold');
  await g.skip();
  for (const t of [[8, 7], [9, 8], [5, 4], [17, 6]]) await g.interact(t);
  await g.skip();
  expect(await has('merchant_test_started')).toBe(true);
  await g.travel(9, 13, 'cargo_hold');
  await g.travel(14, 3, 'galley');
  await g.travel(8, 12, 'crew_quarters');
  await g.interact('penhallow');
  expect(await has('merchant_test_done')).toBe(true);
  await g.travel(8, 3, 'galley');
  await g.travel(12, 10, 'cargo_hold');
  await g.travel(4, 3, 'treasure_hold');
  await g.interact('garrick');
  expect(await has('ship_permanently_contaminated')).toBe(true);
  await g.travel(9, 13, 'cargo_hold');
  await g.travel(14, 3, 'galley');
  await g.travel(14, 3, 'main_deck');
  // Chapter 8: the crew turns, the trial, the frigate
  await g.skip();
  await g.skip();
  expect(await has('frigate_plan_agreed')).toBe(true);
  await g.goto(9, 7);
  await g.tap('ArrowUp', 40, 150);
  await g.tap('KeyZ', 50, 250);
  await g.skip();
  expect(await has('ship_turned')).toBe(true);
  await g.interact([8, 30], 0);
  await g.skip();
  const s = await g.state();
  expect(flagsOf(s).has('garrick_on_probation')).toBe(true);
  expect(flagsOf(s).has('phase2_complete')).toBe(true);
  expect(s.quests.yellow_defense.status).toBe('completed');
  expect(errors).toEqual([]);
});
