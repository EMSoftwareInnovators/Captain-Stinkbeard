import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Story Phase 7 (The Great Sharkstorm returns; The Song of the Grand
 * Stenchmaster) in a real browser with real key presses: the whole phase
 * from the end of Phase 6 (through the bed in the captain's cabin), the
 * Mark II knob panel worked by hand, and the storm heard from below decks.
 *
 * The timing bars are played properly (the driver strikes on the green);
 * choices are cancelled, which takes the last option.
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
const tvOpen = (g) => g.eval(() => !!window.__GAME__.app.overlay.tvOpen);

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

/** The Mark II knob panel: FROG MAYBE until it takes (the close-up shuts itself). */
async function frogMaybe(g) {
  await g.approach([11, 11]);
  await g.tap('KeyZ', 50, 250);
  await untilTv(g);
  for (let i = 0; i < 5 && (await g.uiState()) === 'tv'; i++) {
    if (!(await g.eval(() => window.__GAME__.app.overlay.tvOpen?.knobsDone))) await g.tv('knob:frog');
    await g.wait(600);
  }
  await g.waitFor(() => !window.__GAME__.app.overlay.tvOpen, null, 15000);
  await g.skip();
}

/** Chapters 33 to 37: the storm comes back, the loophole, the job description, the parade. */
async function onDeck(g, has) {
  // 33: the Great Sharkstorm returns
  await g.interact([7, 20]); // the debris (a timing bar)
  await g.interact([9, 29]); // the foremast rigging
  await g.interact('ned');
  expect(await value(g, 'great_sharkstorm')).toBe('active_distant'); // still on the horizon
  await g.interact([4, 28]); // the telescope: it came back, THWACK, the Aura, and it attacks
  expect(await has('great_sharkstorm_returned')).toBe(true);
  expect(await value(g, 'great_sharkstorm')).toBe('attacking_ship');
  // 34: which way is away
  await g.skip();
  await g.interact([16, 19]);
  await g.interact([3, 29]);
  await g.interact([9, 19]); // reef the sail
  await g.interact('squawks');
  await g.interact([12, 25]); // the deck shark
  await g.interact([9, 6]); // the helm: AWAY
  await g.interact('garrick'); // the television complaint
  expect(await has('p7_tv_complaint')).toBe(true);
  // 35: not a duty
  await g.interact([9, 20]); // the labour rule
  await g.interact('garrick'); // Meteorological Shark Management; the Grand Sharkmaster
  expect(await has('grand_sharkmaster_invented')).toBe(true);
  // 36: the crew revolt, the cape
  for (const npc of ['gristle', 'pete', 'bob', 'hale']) await g.interact(npc);
  await g.interact('garrick'); // RIIIIP
  expect(await has('garrick_cape_torn')).toBe(true);
  // 37: the parade and the song
  await g.interact([12, 25]); // Pete's shark
  await g.interact('bob');
  await g.interact('jim');
  expect(await has('grand_stenchmaster_song_performed')).toBe(true);
}

/** Chapters 38 to 41: Mark I wrecked, everyone below, Mark II, a pleasant evening. */
async function belowDecks(g, has) {
  // 38: back to work; Mark I is wrecked; the salvage (compass, lantern, horseshoe)
  await g.skip();
  expect(await has('ses_mark1_wrecked')).toBe(true);
  for (let i = 0; i < 3 && !(await has('p7_salvage_horseshoe')); i++) await g.interact('garrick');
  expect(await has('p7_salvage_horseshoe')).toBe(true);
  // 39: everyone below
  await g.interact([9, 6]); // lash the wheel
  await g.travel(9, 24, 'galley');
  await g.skip();
  if ((await onMap(g)) === 'galley') {
    await g.travel(12, 10, 'cargo_hold');
    await g.skip();
  }
  expect(await onMap(g)).toBe('cargo_hold');
  expect(await has('p7_sheltered')).toBe(true);
  // 40: Mark II
  for (let i = 0; i < 4 && !(await has('ses_mark2_built')); i++) await g.interact([11, 11]);
  expect(await has('ses_mark2_built')).toBe(true);
  await g.interact('garrick'); // the switch, once
  await g.interact('garrick'); // and again: WARM-UP
  await frogMaybe(g);
  expect(await has('p7_franklin_found')).toBe(true);
  // 41: a pleasant evening
  await g.skip();
  await g.interact([10, 15]); // the bilge pump
  await g.interact([14, 9]); // the crates; the boom
  await g.interact([12, 14]); // sit down; the episode; the compromise; the toast
  await g.skip();
}

test('Story Phase 7 plays from the end of Phase 6 to the crew in the hold', { tag: ['@phase7', '@story'] }, async ({ page }) => {
  test.setTimeout(60 * 60 * 1000);
  const { g, errors } = await open(page);
  const has = async (flag) => flagsOf(await g.state()).has(flag);
  await g.preset('p6_complete');
  const grog = await g.eval(() => window.__GAME__.app.session.inventory.count('frog_grog'));
  expect(await has('p7_started')).toBe(false); // Phase 7 waits for the bed
  await g.travel(9, 11, 'captains_quarters');
  await g.interact([14, 4], 0); // "Sleep"
  await g.skip();
  expect(await has('p7_started')).toBe(true);
  expect(await onMap(g)).toBe('main_deck');
  await onDeck(g, has);
  await belowDecks(g, has);
  expect(await has('p7_complete')).toBe(true);
  expect(await value(g, 'great_sharkstorm')).toBe('active_near_ship');
  expect(await g.eval(() => window.__GAME__.app.session.story.getVar('bulk_frog_grog'))).toBe(0);
  expect(await g.eval(() => window.__GAME__.app.session.inventory.count('frog_grog'))).toBe(grog);
  expect(errors).toEqual([]);
});

test('Phase 7 from the retreat below to the end plays from its preset', { tag: ['@phase7', '@story'] }, async ({ page }) => {
  test.setTimeout(25 * 60 * 1000);
  const { g, errors } = await open(page);
  const has = async (flag) => flagsOf(await g.state()).has(flag);
  await g.preset('p7_retreat_below');
  await g.skip();
  await g.interact([9, 6]);
  await g.travel(9, 24, 'galley');
  await g.skip();
  if ((await onMap(g)) === 'galley') {
    await g.travel(12, 10, 'cargo_hold');
    await g.skip();
  }
  for (let i = 0; i < 4 && !(await has('ses_mark2_built')); i++) await g.interact([11, 11]);
  await g.interact('garrick');
  await g.interact('garrick');
  await frogMaybe(g);
  await g.skip();
  await g.interact([10, 15]);
  await g.interact([14, 9]);
  await g.interact([12, 14]);
  await g.skip();
  expect(await has('p7_complete')).toBe(true);
  expect(errors).toEqual([]);
});

test('the Mark II knob panel: wrong knobs do something, FROG MAYBE finds Franklin', { tag: ['@phase7', '@ui', '@smoke'] }, async ({ page }) => {
  const { g, errors } = await open(page);
  const has = async (flag) => flagsOf(await g.state()).has(flag);
  await g.preset('p7_franklin_returns');
  await g.approach([11, 11]);
  await g.tap('KeyZ', 50, 250);
  await untilTv(g);
  const labels = await g.eval(() => window.__GAME__.app.overlay.tvOpen.menu.items.map((i) => i.label));
  expect(labels).toEqual(['VOLUME?', 'UPSIDE', 'ROLLY', 'SHRIEK', 'COLOUR', 'SPOON', 'FROG MAYBE', 'Step away']);
  await g.tv('knob:upside', 'knob:rolly', 'knob:spoon');
  expect(await g.eval(() => window.__GAME__.app.overlay.tvOpen.knobState)).toMatchObject({ flip: true });
  await g.tv('knob:frog');
  expect(await has('p7_franklin_found')).toBe(false); // MAYBE
  await g.tv('knob:frog');
  await g.waitFor(() => !window.__GAME__.app.overlay.tvOpen, null, 15000);
  expect(await has('p7_franklin_found')).toBe(true);
  expect(await g.eval(() => window.__GAME__.app.session.story.getVar('ses_mk2_channel'))).toBe(7);
  await g.skip();
  expect(await has('p7_ch41_started')).toBe(true);
  expect(errors).toEqual([]);
});

test('after Phase 7: the Mark II works, and the hatch stays barred', { tag: ['@phase7', '@world'] }, async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p7_complete');
  await g.approach([11, 11]);
  await g.tap('KeyZ', 50, 250);
  await untilTv(g);
  const shown = await g.tv('next');
  expect(shown).toBeTruthy();
  await g.tv('leave');
  await g.waitFor(() => !window.__GAME__.app.overlay.tvOpen, null, 10000);
  expect(await tvOpen(g)).toBe(false);
  await g.skip();
  await g.travel(14, 3, 'galley');
  await g.skip();
  await g.interact([14, 3]); // barred from below
  expect(await onMap(g)).toBe('galley');
  // The storm is heard from below: a thud, some dust, nobody hurt.
  await g.waitFor(() => (window.__GAME__.game.scene.getScene('World').sharkstorm?.thuds ?? 0) > 0, null, 60000);
  expect(await g.eval(() => window.__GAME__.app.session.party.leader().hp)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
