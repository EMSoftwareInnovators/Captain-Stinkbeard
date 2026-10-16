import { test, expect } from '@playwright/test';
import { open, go, touch, everyPreset, onMap, value, variable, has, firstMissing, D, Q } from './storyKit.js';

/**
 * Story Phase 16 (THE GRAND LIGHTER, chapters 186-205) in a real browser
 * with real key presses: down the ladder under the cargo grating into the
 * Stenchmaster Fart Zone, the rescue (and a save in the middle of the story
 * after it), the Hornet Fart and the swarm on deck, the portable set's
 * documentary, the last chapter played from its preset to COMMON SENSE IS
 * WINNING, and every Phase 16 preset.
 *
 * The full route is played headlessly (tests/phase16_story.test.js, twice).
 * At a reassurance prompt the captain says the calming thing; at every other
 * choice, the first option.
 */

const FZ = 'stenchmaster_fart_zone';

/** Plays a scene out, picking the calming answer at a reassurance prompt. */
async function play(g) {
  const until = Date.now() + 150000;
  while (Date.now() < until) {
    const st = await g.uiState();
    if (st === 'idle') return;
    if (st === 'battle') throw new Error('Phase 16 never starts a battle');
    if (st === 'choice') {
      const k = await g.eval(() => {
        const app = window.__GAME__.app;
        const items = app.overlay.dialogue.choiceMenu.items.map((i) => String(i.label).replace(/<[^>]*>/g, ''));
        const prompts = app.content.stability.get('brogath').prompts;
        const calm = new Set(Object.values(prompts).flatMap((p) => p.options.filter((o) => o.calm).map((o) => o.text)));
        return Math.max(0, items.findIndex((t) => calm.has(t)));
      });
      for (let i = 0; i < k; i++) await g.tap('ArrowDown', 40, 90);
      await g.tap('KeyZ', 45, 120);
      continue;
    }
    if (st === 'book' || st === 'tv') {
      await g.wait(250);
      await g.tap('KeyX', 45, 250);
      continue;
    }
    if (st === 'repair') {
      await g.repairTick();
      continue;
    }
    if (st === 'teller') {
      await g.wait(200);
      continue;
    }
    if (st === 'line' || st === 'tutorial' || st === 'insert') await g.tap('KeyZ', 45, 60);
    await g.wait(90);
  }
  throw new Error('the scene never finished');
}

async function to(g, map) {
  if ((await onMap(g)) === map) return;
  for (let tries = 0; ; tries++) {
    try {
      await go(g, map);
      break;
    } catch (err) {
      if (tries >= 10 || !/no way from/.test(err.message)) throw err;
      await g.wait(800);
    }
  }
  await play(g);
}

async function look(g, id) {
  await touch(g, id);
  await play(g);
}

async function speak(g, who) {
  await g.approach(who);
  await g.tap('KeyZ', 50, 250);
  await play(g);
}

const autoTiming = (g) => g.eval(() => { window.__GAME__.app.flags.autoTiming = 0; });
const hornetCount = (g) => g.eval(() => window.__GAME__.game.scene.getScene('World').hornets?.count ?? 0);

test('Phase 16 from the lighter pitch to COMMON SENSE IS WINNING plays from its preset', { tag: ['@phase16', '@story'] }, async ({ page }) => {
  test.setTimeout(30 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p16_lighter_pitch');
  await autoTiming(g);
  await play(g);
  const gold = (await g.state()).gold;
  await to(g, Q);
  await look(g, 'p16_pitch');
  expect(await has(g, 'puffchester_convinced')).toBe(true);
  await look(g, 'p16_next');
  expect(await has(g, 'mechanical_ignition_victory')).toBe(true);
  await look(g, 'p16_end');
  expect(await has(g, 'p16_complete')).toBe(true);
  expect(await value(g, 'counter_department')).toBe('BUREAU');
  expect((await g.state()).gold).toBe(gold); // the purse is never touched
  expect(errors).toEqual([]);
});

test('the rescue: down the grating into the Fart Zone, Agnes out before Vindicta goes; it survives a save and Continue', { tag: ['@phase16', '@saves', '@smoke'] }, async ({ page }) => {
  test.setTimeout(15 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p16_vindicta_emergency');
  await autoTiming(g);
  await play(g);
  // The search: the grating last, walking there for real.
  for (let n = 0; n < 6 && !(await has(g, 'p16_hen_search_said')); n++) {
    const next = await firstMissing(g, ['bunks', 'sashes', 'grating', 'barrels', 'hold'], 'p16_hen_');
    const where = { bunks: Q, sashes: Q, grating: D, barrels: 'galley', hold: 'cargo_hold' }[next];
    await to(g, where);
    await look(g, `p16_hen_${next}`);
  }
  await to(g, D);
  await speak(g, 'vindicta');
  await to(g, FZ);
  expect(await onMap(g)).toBe(FZ);
  await look(g, 'p16_v_portholes');
  await look(g, 'p16_v_door');
  await look(g, 'p16_v_rescue');
  expect(await has(g, 'vindicta_chicken_rescue_complete')).toBe(true);
  expect(await variable(g, 'agnes_returns')).toBe(1);
  expect(await has(g, 'fz_done_vindicta_legendary')).toBe(true);
  await g.eval(() => window.__GAME__.game.scene.getScene('World').autosave());
  await page.reload();
  await g.waitFor(() => !!window.__GAME__?.app);
  await g.titleChoose('continue');
  await play(g);
  expect(await has(g, 'agnes_second_returned')).toBe(true);
  expect(await variable(g, 'agnes_returns')).toBe(1);
  expect(await has(g, 'fz_done_vindicta_legendary')).toBe(true); // processed once, and remembered
  expect(errors).toEqual([]);
});

test('the Hornet Fart: by the procedure, from behind the rope; the swarm is on deck, and the captain can still get about', { tag: ['@phase16', '@world', '@smoke'] }, async ({ page }) => {
  test.setTimeout(12 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p16_hornet_release');
  await autoTiming(g);
  await play(g);
  await to(g, FZ);
  await look(g, 'p16_h_release');
  expect(await has(g, 'hornet_fart_occurred')).toBe(true);
  await to(g, D);
  expect(await has(g, 'hornet_swarm_active')).toBe(true);
  await g.waitFor(() => (window.__GAME__.game.scene.getScene('World').hornets?.count ?? 0) > 0, null, 8000);
  expect(await hornetCount(g)).toBeGreaterThan(0);
  expect(await hornetCount(g)).toBeLessThanOrEqual(48);
  await speak(g, 'brogath');
  expect(await has(g, 'p16_hornet_praised')).toBe(true);
  // the swarm never blocks the way: the wheel and the rail are still reachable
  await look(g, 'p16_shoo_wheel');
  expect(await has(g, 'p16_shoo_wheel')).toBe(true);
  expect(errors).toEqual([]);
});

test('the portable set: out of Garrick\'s coat, the documentary, and Agnes switches it off', { tag: ['@phase16', '@ui'] }, async ({ page }) => {
  test.setTimeout(12 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p16_portable_tv');
  await autoTiming(g);
  await play(g);
  await speak(g, 'garrick');
  await look(g, 'p16_aerial');
  expect(await variable(g, 'ses_portable_power')).toBe(1);
  await look(g, 'p16_watch');
  expect(await has(g, 'ignition_documentary_viewed')).toBe(true);
  await look(g, 'p16_tv_off_1');
  await look(g, 'p16_tv_off_2');
  expect(await variable(g, 'ses_portable_power')).toBe(0);
  expect(await has(g, 'p16_ch203_started')).toBe(true);
  expect(errors).toEqual([]);
});

test('every Phase 16 preset loads and its scene plays without errors', { tag: ['@phase16', '@scenes'] }, async ({ page }) => {
  test.setTimeout(75 * 60 * 1000);
  const { g, errors } = await open(page);
  await autoTiming(g);
  await everyPreset(g, errors, 'p16_', 24);
});
