import { test, expect } from '@playwright/test';
import { open, go, touch, everyPreset, onMap, value, variable, has, D, H, Q } from './storyKit.js';

/**
 * Story Phase 17 (THE RETURN OF THE ANCIENT CREW AND THE COFFIN SOCK
 * CATASTROPHE, chapters 206-222) in a real browser with real key presses:
 * the forbidden door and the reunion (Ledger and Tilda join the party, once,
 * and are still there after a save and Continue), the Fire-Sharkstorm over
 * the deck and the Chicken-Town waft that puts it out, the rescue in the Fart
 * Zone, the last chapter from its preset to the end, and every Phase 17
 * preset.
 *
 * The full route is played headlessly (tests/phase17_story.test.js, twice).
 * At a reassurance prompt the captain says the calming thing; listening for
 * Agnes, he listens properly; at every other choice, the first option.
 */

const FZ = 'stenchmaster_fart_zone';
const Z = 'fart_free_zone';

/** Plays a scene out, picking the calming answer at a reassurance prompt (and the right porthole). */
async function play(g) {
  const until = Date.now() + 150000;
  while (Date.now() < until) {
    const st = await g.uiState();
    if (st === 'idle') return;
    if (st === 'battle') throw new Error('these Phase 17 scenes never start a battle');
    if (st === 'choice') {
      const k = await g.eval(() => {
        const app = window.__GAME__.app;
        const items = app.overlay.dialogue.choiceMenu.items.map((i) => String(i.label).replace(/<[^>]*>/g, ''));
        const right = items.findIndex((t) => /far porthole/i.test(t));
        if (right >= 0) return right;
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
const partyIds = (g) => g.eval(() => window.__GAME__.app.session.party.members.map((m) => m.id));

test('the forbidden door: the crack, the plume, two cut-outs come back, and they join the party once (kept across a save and Continue)', { tag: ['@phase17', '@saves', '@smoke'] }, async ({ page }) => {
  test.setTimeout(15 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p17_before_door');
  await autoTiming(g);
  await play(g);
  expect(await onMap(g)).toBe(H);
  await look(g, 'p17_door_stop');
  expect(await has(g, 'p17_door_cracked')).toBe(true);
  await look(g, 'p17_door_shut');
  expect(await value(g, 'treasure_room_state')).toBe('sealed_reinforced');
  await look(g, 'p17_plume_l');
  expect(await has(g, 'ledger_billiam_reincarnated')).toBe(true);
  expect(await has(g, 'tilda_reincarnated')).toBe(true);
  await speak(g, 'ledger');
  await speak(g, 'tilda');
  await speak(g, 'brogath');
  expect(await has(g, 'old_crew_reunion_completed')).toBe(true);
  expect(await partyIds(g)).toEqual(['blackbeard', 'ledger', 'tilda']);
  await g.eval(() => window.__GAME__.game.scene.getScene('World').autosave());
  await page.reload();
  await g.waitFor(() => !!window.__GAME__?.app);
  await g.titleChoose('continue');
  await play(g);
  expect(await partyIds(g)).toEqual(['blackbeard', 'ledger', 'tilda']);
  expect(await has(g, 'p17_door_resealed')).toBe(true);
  expect(errors).toEqual([]);
});

test('the Fire-Sharkstorm: the deck under a burning storm, Agnes carried across it, and the Chicken-Town waft puts it out', { tag: ['@phase17', '@world', '@smoke'] }, async ({ page }) => {
  test.setTimeout(15 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p17_fire_sharkstorm');
  await autoTiming(g);
  await play(g);
  expect(await value(g, 'great_sharkstorm_flare')).toBe('fire_sharkstorm');
  expect(await has(g, 'tilda_cardboard_singed')).toBe(true);
  await to(g, Z);
  await speak(g, 'agnes_second');
  expect(await has(g, 'p17_agnes_fetched')).toBe(true);
  await to(g, D);
  expect(await has(g, 'p17_fire_deck_seen')).toBe(true);
  expect(await value(g, 'great_sharkstorm_flare')).toBe('fire_sharkstorm');
  await to(g, FZ);
  expect(await has(g, 'chicken_town_second_mellowing')).toBe(true);
  expect(await value(g, 'great_sharkstorm_flare')).toBeFalsy();
  expect(await value(g, 'ship_atmosphere')).toBe('MELLOW_HAZE');
  expect(errors).toEqual([]);
});

test('the rescue: down the grating between the waves, listen for her, and out with Agnes', { tag: ['@phase17', '@world'] }, async ({ page }) => {
  test.setTimeout(12 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p17_agnes_fart_zone');
  await autoTiming(g);
  await play(g);
  await to(g, D);
  await look(g, 'p17_grating');
  expect(await has(g, 'agnes_thunderbottom_rescue_complete')).toBe(true);
  expect(await has(g, 'beard_thunderbottom_legendary')).toBe(true);
  expect(await onMap(g)).toBe(D);
  await speak(g, 'agnes_second');
  expect(await has(g, 'agnes_post_rescue_condition')).toBe(true);
  expect(await value(g, 'agnes_condition')).toBe('frazzled');
  expect(errors).toEqual([]);
});

test('Phase 17 from Princess Stenchalina to the end plays from its preset', { tag: ['@phase17', '@story'] }, async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p17_stenchalina');
  await autoTiming(g);
  await play(g);
  const gold = (await g.state()).gold;
  await to(g, Q);
  await speak(g, 'jim');
  expect(await has(g, 'princess_stenchalina_delusion')).toBe(true);
  await speak(g, 'brogath');
  expect(await has(g, 'major_coffin_sock_release_complete')).toBe(true);
  expect(await value(g, 'ship_atmosphere')).toBe('COFFIN_SOCK');
  for (const who of ['ledger', 'pete', 'brogath']) if (!(await has(g, 'p17_complete'))) await speak(g, who);
  expect(await has(g, 'p17_complete')).toBe(true);
  expect(await value(g, 'greyhook_expedition')).toBe('blocked');
  expect(await variable(g, 'coffin_sock_countdown')).toBe(0);
  expect((await g.state()).gold).toBe(gold); // the purse is never touched
  expect(errors).toEqual([]);
});

test('every Phase 17 preset loads and its scene plays without errors', { tag: ['@phase17', '@scenes'] }, async ({ page }) => {
  test.setTimeout(75 * 60 * 1000);
  const { g, errors } = await open(page);
  await autoTiming(g);
  await everyPreset(g, errors, 'p17_', 27);
});
