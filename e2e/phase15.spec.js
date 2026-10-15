import { test, expect } from '@playwright/test';
import { open, go, touch, everyPreset, onMap, value, variable, has, firstMissing, C, D, G, Q } from './storyKit.js';

/**
 * Story Phase 15 (THE GREAT MELLOWING, chapters 170-185) in a real browser
 * with real key presses: the ship's atmosphere (the haze colour follows the
 * story value), Brogath MELLOW, the Bashfulness Branch's relief teller window
 * and a save in the middle of it, the last two chapters played from their
 * preset to 'Not today.', and every Phase 15 preset.
 *
 * The full route is played headlessly (tests/phase15_story.test.js, twice);
 * here the walk covers chapters 184 and 185. At a reassurance prompt the
 * captain says the calming thing; at every other choice, the first option.
 */

/** Plays a scene out, picking the calming answer at a reassurance prompt. */
async function play(g) {
  const until = Date.now() + 150000;
  while (Date.now() < until) {
    const st = await g.uiState();
    if (st === 'idle') return;
    if (st === 'battle') throw new Error('Phase 15 never starts a battle');
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

const STEPS = [
  ['relief_grand_teller.serve', async (g) => { await to(g, Q); await look(g, 'p15_relief_bell'); }],
  ['relief_grand_teller.rating', async (g) => { await to(g, Q); await look(g, 'p15_rating'); }],
  ['sash_backed_loan.hear', async (g) => { await to(g, Q); await look(g, 'p15_loan_hear'); }],
  ['sash_backed_loan.forms', async (g) => { await to(g, Q); await look(g, 'p15_loan_forms'); }],
  ['sash_backed_loan.collateral', async (g) => { await to(g, Q); await look(g, 'p15_loan_collateral'); }],
  ['sash_backed_loan.close', async (g) => { await to(g, Q); await look(g, 'p15_loan_last'); }],
  ['the_fart_he_misses.peace', async (g) => {
    const next = await firstMissing(g, ['garrick', 'brogath', 'agnes'], 'p15_peace_');
    if (next === 'garrick') {
      await to(g, G);
      await speak(g, 'garrick');
    } else {
      await to(g, Q);
      await speak(g, next === 'agnes' ? 'agnes_second' : 'brogath');
    }
  }],
  ['the_fart_he_misses.pantry', async (g) => { await to(g, G); await look(g, 'p15_pantry'); }],
  ['the_fart_he_misses.vindicta', async (g) => { await to(g, D); await speak(g, 'vindicta'); }],
  ['the_fart_he_misses.agnes', async (g) => {
    const next = await firstMissing(g, ['perch', 'deck', 'rail'], 'p15_search_');
    await to(g, next === 'perch' ? Q : D);
    await look(g, `p15_search_${next}`);
  }],
  ['the_fart_he_misses.again', async (g) => { await to(g, D); await speak(g, 'brogath'); }],
  ['the_fart_he_misses.policy', async (g) => { await to(g, Q); await look(g, 'p15_rule_policy'); }],
  ['the_fart_he_misses.end', async (g) => { await to(g, D); await look(g, 'p15_end'); }],
];

/** Every open objective in turn (a step may come round many times on purpose: ten customers at the bell). */
async function walk15(g) {
  let last = null;
  let same = 0;
  const snapshot = () => g.eval(() => {
    const st = window.__GAME__.app.session.story.serialize();
    return JSON.stringify([st.flags.length, st.vars, st.values]);
  });
  for (let n = 0; n < 300 && !(await has(g, 'p15_complete')); n++) {
    const ref = await g.eval((list) => list.find((r) => {
      const [q, o] = r.split('.');
      return window.__GAME__.app.session.quests.isObjectiveAvailable(q, o);
    }), STEPS.map(([r]) => r));
    if (!ref) throw new Error(`stuck on ${await onMap(g)}: no open Phase 15 objective the player can act on`);
    const before = await snapshot();
    await STEPS.find(([r]) => r === ref)[1](g);
    same = ref === last && (await snapshot()) === before ? same + 1 : 0;
    last = ref;
    if (same >= 6) {
      const st = await g.state();
      throw new Error(`${ref} never gets done (on ${st.map} at ${st.x},${st.y}, facing ${st.facing})`);
    }
  }
}

const autoTiming = (g) => g.eval(() => { window.__GAME__.app.flags.autoTiming = 0; });
const haze = (g) => g.eval(() => {
  const f = window.__GAME__.game.scene.getScene('World').fumeLayer;
  return { level: f.hazeLevel, color: f.hazeColor };
});

test('Phase 15 from the sash-backed loan to "Not today." plays from its preset', { tag: ['@phase15', '@story'] }, async ({ page }) => {
  test.setTimeout(60 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p15_sash_loan');
  await autoTiming(g);
  await play(g);
  const gold = (await g.state()).gold;
  await walk15(g);
  expect(await has(g, 'p15_complete')).toBe(true);
  expect(await value(g, 'ship_atmosphere')).toBe('ORDINARY_STENCH');
  expect(await value(g, 'bashfulness_branch_state')).toBe('closed');
  expect(await has(g, 'bashfulness_branch_closed_for_good')).toBe(true);
  expect(await has(g, 'agnes_second_missing_in_sharkstorm')).toBe(true);
  expect(await variable(g, 'grand_currency_tokens')).toBe(0);
  expect((await g.state()).gold).toBe(gold); // the purse is never touched
  expect(errors).toEqual([]);
});

test('the ship\'s atmosphere: the haze follows the story value, and Brogath is MELLOW in the Great Mellowing', { tag: ['@phase15', '@world', '@smoke'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p15_untold_stories');
  await play(g);
  expect(await value(g, 'ship_atmosphere')).toBe('MELLOW_HAZE');
  expect(await value(g, 'brogath_state')).toBe('MELLOW');
  await g.waitFor(() => window.__GAME__.game.scene.getScene('World').fumeLayer.hazeLevel === 'light', null, 5000);
  expect(await haze(g)).toEqual({ level: 'light', color: 0x9cb860 });
  // A trigger counts for an eighth while he is mellow: nowhere near a release.
  const before = await variable(g, 'brogath_pressure');
  await g.eval(() => { window.__GAME__.game.scene.getScene('World').runScript([{ stability: 'trigger', id: 'flutter', quiet: true }]); });
  await play(g);
  expect((await variable(g, 'brogath_pressure')) - before).toBeLessThan(5);
  // The haze goes when the story says so.
  await g.eval(() => { window.__GAME__.game.scene.getScene('World').runScript([{ atmosphere: 'ORDINARY_STENCH' }]); });
  await play(g);
  await g.waitFor(() => window.__GAME__.game.scene.getScene('World').fumeLayer.hazeLevel !== 'light', null, 5000);
  expect(await value(g, 'brogath_state')).not.toBe('MELLOW');
  expect(errors).toEqual([]);
});

test('the relief teller\'s window: ring the branch bell, a customer comes, the queue moves on; it survives a save and Continue', { tag: ['@phase15', '@saves', '@smoke'] }, async ({ page }) => {
  test.setTimeout(12 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p15_relief_teller');
  await autoTiming(g);
  await play(g);
  await to(g, Q);
  expect(await value(g, 'bashfulness_branch_state')).toBe('open');
  const before = await variable(g, 'branch_relief_served');
  await touch(g, 'p15_relief_bell');
  await g.waitFor(() => !!window.__GAME__.app.overlay.tellerOpen, null, 30000).catch(() => {});
  await play(g);
  const served = await variable(g, 'branch_relief_served');
  expect(served).toBe(before + 1);
  await g.eval(() => window.__GAME__.game.scene.getScene('World').autosave());
  await page.reload();
  await g.waitFor(() => !!window.__GAME__?.app);
  await g.titleChoose('continue');
  await play(g);
  expect(await onMap(g)).toBe(Q);
  expect(await value(g, 'bashfulness_branch_state')).toBe('open');
  expect(await variable(g, 'branch_relief_served')).toBe(served);
  expect(errors).toEqual([]);
});

test('every Phase 15 preset loads and its scene plays without errors', { tag: ['@phase15', '@scenes'] }, async ({ page }) => {
  test.setTimeout(75 * 60 * 1000);
  const { g, errors } = await open(page);
  await autoTiming(g);
  await everyPreset(g, errors, 'p15_', 19);
});

test('the pause menu with every logbook open: it scrolls instead of running off the screen', { tag: ['@phase15', '@ui', '@smoke'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p15_economic_recovery');
  await play(g);
  // The floorboard by the bed opens one more logbook entry (the captain's emergency reserve).
  await to(g, C);
  await look(g, 'p15_floorboard');
  await g.tap('KeyC', 50, 600);
  const menu = () => g.eval(() => {
    const m = window.__GAME__.game.scene.getScene('Menu');
    return { entries: m.navList.length, rows: m.nav.rows, label: m.navList[m.nav.index].label, scroll: m.nav.scroll };
  });
  const first = await menu();
  expect(first.entries).toBeGreaterThan(12);
  expect(first.rows).toBe(12);
  for (let i = 0; i < first.entries - 1; i++) await g.tap('ArrowDown', 50, 150);
  const last = await menu();
  expect(last.label).toBe('Quit to Title');
  expect(last.scroll).toBe(first.entries - 12);
  await g.tap('KeyX', 50, 400);
  expect(errors).toEqual([]);
});

test('throwing the pillow overboard works from any rail (here the port rail, nowhere near the old spot)', { tag: ['@phase15', '@world', '@smoke'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p15_grand_nap');
  await play(g);
  await g.eval(() => {
    const q = window.__GAME__.app.session.quests;
    const st = window.__GAME__.app.session.story;
    for (const f of ['p15_strip_a', 'p15_strip_b', 'p15_strip_c', 'p15_sashes_fetched', 'p15_bed_port', 'p15_bed_stbd', 'p15_bed_grand', 'p15_beds_said', 'p15_settle_said', 'p15_pillow_caught']) st.set(f);
    for (const o of ['strip', 'sashes', 'beds', 'settle', 'pillow']) q.completeObjective('grand_stenchmaster_nap', o, { force: true });
  });
  await play(g);
  expect(await g.eval(() => window.__GAME__.app.session.quests.isObjectiveAvailable('grand_stenchmaster_nap', 'eject'))).toBe(true);
  await to(g, D);
  await g.goto(4, 25);
  await g.tap('ArrowLeft', 60, 200); // face the port rail
  await g.tap('KeyZ', 50, 300);
  await play(g);
  expect(await has(g, 'roaring_pillow_ejected')).toBe(true);
  expect(errors).toEqual([]);
});
