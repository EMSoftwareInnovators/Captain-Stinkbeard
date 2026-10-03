import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Story Phase 6 (The Death Rattle of the S.E.S.; The Midnight Stenchmaster
 * Catastrophe) in a real browser with real key presses: the whole phase from
 * the end of Phase 5 (through the bed in the captain's cabin), the knob
 * panel worked by hand, and the Great Sharkstorm on deck (telegraphed
 * landings that never hurt).
 *
 * Shark Duty and the timing bars are played properly (the driver strikes on
 * the green).
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

const onMap = (g) => g.eval(() => window.__GAME__.game.scene.getScene('World').model.id);
const value = (g, name) => g.eval((n) => window.__GAME__.app.session.story.getValue(n), name);
const objectiveDone = (quest, obj) => `window.__GAME__.app.session.quests.isObjectiveDone('${quest}', '${obj}')`;

/** Reads lines until the television close-up is up. */
async function untilTv(g) {
  for (let i = 0; i < 200; i++) {
    const st = await g.uiState();
    if (st === 'tv') return;
    if (st === 'line' || st === 'tutorial' || st === 'insert') await g.tap('KeyZ', 45, 60);
    await g.wait(100);
  }
  throw new Error('the television never opened');
}

/** The knob panel: OFF MAYBE until it takes (the close-up shuts itself). */
async function offMaybe(g) {
  await g.approach([14, 17]);
  await g.tap('KeyZ', 50, 250);
  await untilTv(g);
  for (let i = 0; i < 5 && (await g.uiState()) === 'tv'; i++) {
    if (!(await g.eval(() => window.__GAME__.app.overlay.tvOpen?.knobsDone))) await g.tv('knob:off_maybe');
    await g.wait(600);
  }
  await g.waitFor(() => !window.__GAME__.app.overlay.tvOpen, null, 15000);
  await g.skip();
}

async function partOne(g, has) {
  // 25: the supper
  await g.travel(9, 11, 'captains_quarters');
  await g.goto(13, 6);
  await g.interact([14, 5], 0); // "Sleep"
  await g.skip();
  expect(await has('p6_started')).toBe(true);
  await g.interact('squawks'); // the galley cut, Pete runs
  expect(await has('p6_squawks_checked')).toBe(true);
  await g.travel(9, 24, 'galley');
  await g.skip(0); // YOUR WORKPLACE IS YOUR TROUSERS
  expect(await has('rotten_garlic_supper_eaten')).toBe(true);
  await g.travel(14, 3, 'main_deck');
  await g.skip(); // supper outdoors, then BWAAAAAH
  // 26: the Frog Tax Man
  expect(await has('frog_tax_man_unlocked')).toBe(true);
  await g.interact([14, 17]); // watch the episode; to bed; Bob
  expect(await onMap(g)).toBe('captains_quarters');
  await g.travel(8, 11, 'main_deck');
  await g.skip();
  await g.interact('garrick'); // five more minutes
  await offMaybe(g);
  // 27: the machine refuses to die
  expect(await has('ses_off_maybe')).toBe(true);
  await g.interact('rook');
  await g.interact('sully');
  await g.interact([12, 18]);
  await g.interact([12, 17]);
  await g.interact([11, 19]);
  await g.interact([8, 18]);
  await g.interact([14, 17]); // the death rattle: fork, APRIL FIFTEENTH, POP
  expect(await value(g, 'ses_state')).toBe('apparently_dead');
  await g.interact('garrick', 0); // the cape
  expect(await has('garrick_cape_singed')).toBe(true);
  // 28: the worst morning
  await g.interact('garrick');
  await g.sharkDuty(objectiveDone('worst_morning', 'duty'));
  await g.skip();
  await g.interact('garrick', 0); // the weasel; ROWBOAT; "Throw it overboard" (not done)
  expect(await has('p6_overboard_ordered')).toBe(true);
}

async function partTwo(g, has) {
  // 29: the burning warning
  await g.skip();
  expect(await onMap(g)).toBe('crew_quarters');
  await g.interact('squawks');
  await g.interact('bob');
  await g.interact('wick');
  await g.interact('brask');
  await g.goto(13, 4).catch(() => {}); // the way to the ladder: "Pressure shift."
  await g.skip();
  expect(await onMap(g)).toBe('main_deck');
  await g.interact('hale');
  await g.interact('rook');
  await g.interact('sully'); // nowhere; the countdown; BRACE; the blast; the smell
  expect(await has('second_major_release')).toBe(true);
  expect(await value(g, 'dead_center')).toBe('second_forward_deck');
  // 30: the second yellow apocalypse
  await g.goto(10, 13);
  await g.skip();
  await g.interact('squawks');
  await g.interact([16, 20]); // the frenzy, the column, the name
  expect(await value(g, 'great_sharkstorm')).toBe('attacking_ship');
  // 31: the Great Sharkstorm
  await g.interact([3, 16]);
  await g.interact([16, 16]);
  await g.interact([3, 7]);
  await g.interact('squawks');
  await g.interact([12, 21]); // HEAVE; the S.E.S. is hit
  expect(await value(g, 'ses_state')).toBe('shark_damaged');
  await g.interact([9, 6]); // the helm; "No."
  // 32: another ocean
  for (let i = 0; i < 5; i++) {
    await g.interact([5, 25]);
    await g.interact([16, 24]);
  }
  expect(await has('bulk_frog_grog_depleted')).toBe(true);
  await g.interact([4, 28]); // the telescope: still there
  expect(await value(g, 'great_sharkstorm')).toBe('active_distant');
  await g.interact('garrick'); // the sniff, the ban, the rowboat
  await g.skip();
}

test('Story Phase 6 plays from the end of Phase 5 to the rowboat', { tag: ['@phase6', '@story'] }, async ({ page }) => {
  test.setTimeout(60 * 60 * 1000);
  const { g, errors } = await open(page);
  const has = async (flag) => flagsOf(await g.state()).has(flag);
  await g.preset('p5_complete');
  expect(await has('p6_started')).toBe(false); // Phase 6 waits for the bed
  await partOne(g, has);
  await partTwo(g, has);
  expect(await has('p6_complete')).toBe(true);
  expect(await has('great_sharkstorm_active')).toBe(true);
  expect(await value(g, 'dead_center')).toBe('second_sleeping_quarters');
  expect(errors).toEqual([]);
});

test('Phase 6 from the Great Sharkstorm attack to the end plays from its preset', { tag: ['@phase6', '@story'] }, async ({ page }) => {
  test.setTimeout(25 * 60 * 1000);
  const { g, errors } = await open(page);
  const has = async (flag) => flagsOf(await g.state()).has(flag);
  await g.preset('p6_sharkstorm_attack');
  await g.skip();
  await g.interact([3, 16]);
  await g.interact([16, 16]);
  await g.interact([3, 7]);
  await g.interact('squawks');
  await g.interact([12, 21]);
  await g.interact([9, 6]);
  for (let i = 0; i < 5; i++) {
    await g.interact([5, 25]);
    await g.interact([16, 24]);
  }
  await g.interact([4, 28]);
  await g.interact('garrick');
  await g.skip();
  expect(await has('p6_complete')).toBe(true);
  expect(errors).toEqual([]);
});

test('the knob panel: wrong knobs do something, OFF MAYBE eventually works', { tag: ['@phase6', '@ui', '@smoke'] }, async ({ page }) => {
  const { g, errors } = await open(page);
  const has = async (flag) => flagsOf(await g.state()).has(flag);
  await g.preset('p6_ses_shutdown');
  await g.approach([14, 17]);
  await g.tap('KeyZ', 50, 250);
  await untilTv(g);
  const labels = await g.eval(() => window.__GAME__.app.overlay.tvOpen.menu.items.map((i) => i.label));
  expect(labels).toEqual(['LOUD', 'MORE LOUD', 'PICTURE MAYBE', 'DO NOT TOUCH', 'FROG', '???', 'OFF MAYBE', 'Step away']);
  await g.tv('knob:loud', 'knob:picture', 'knob:frog');
  expect(await g.eval(() => window.__GAME__.app.overlay.tvOpen.knobState)).toMatchObject({ vol: 1, flip: true, frog: true });
  await g.tv('knob:off_maybe');
  expect(await has('ses_off_maybe')).toBe(false); // MAYBE
  await g.tv('knob:off_maybe');
  await g.tv('knob:off_maybe');
  await g.waitFor(() => !window.__GAME__.app.overlay.tvOpen, null, 15000);
  expect(await has('ses_off_maybe')).toBe(true);
  await g.skip();
  expect(await has('p6_ch27_started')).toBe(true);
  expect(errors).toEqual([]);
});

test('the Great Sharkstorm marks every landing first, and a hit only knocks the captain down', { tag: ['@phase6', '@world'] }, async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p6_sharkstorm_attack');
  await g.skip();
  // Wait for a landing to be marked, then check it was marked before it landed.
  await g.waitFor(() => window.__GAME__.game.scene.getScene('World').sharkstorm.impact?.phase === 'warn', null, 60000);
  const warn = await g.eval(() => {
    const im = window.__GAME__.game.scene.getScene('World').sharkstorm.impact;
    return { x: im.x, y: im.y, warn: im.warn };
  });
  expect(warn.warn).toBeGreaterThanOrEqual(1200);
  await g.waitFor(() => window.__GAME__.game.scene.getScene('World').sharkstorm.impact?.phase !== 'warn', null, 10000);
  const hp = await g.eval(() => window.__GAME__.app.session.party.leader().hp);
  expect(hp).toBeGreaterThan(0);
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').sharkstorm.passes.length)).toBeLessThanOrEqual(3);
  expect(errors).toEqual([]);
});
