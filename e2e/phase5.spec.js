import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Story Phase 5 (What Does the Grand Stenchmaster Actually Do?) in a real
 * browser with real key presses: the whole phase from the end of Phase 4
 * (through the bed in the captain's cabin), the second half from the suit
 * reveal preset, the Stenchmaster Entertainment System worked by hand, and
 * the optional shift where the Grand Stenchmaster does his one useful thing.
 *
 * Shark Duty is played properly: the driver walks to each shark, faces it and
 * strikes the timing bar in the green.
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

const deadCenter = (g) => g.eval(() => window.__GAME__.app.session.story.getValue('dead_center'));
const onMap = (g) => g.eval(() => window.__GAME__.game.scene.getScene('World').model.id);
const objectiveDone = (quest, obj) => `window.__GAME__.app.session.quests.isObjectiveDone('${quest}', '${obj}')`;
const tvVars = (g) => g.eval(() => {
  const st = window.__GAME__.app.session.story;
  return { power: st.getVar('ses_power'), channel: st.getVar('ses_channel') };
});

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

/** Chapter 20: the rounds (the Center follows the captain), the close call, Squawks. */
async function chapter20(g, s, has) {
  await g.travel(9, 11, 'captains_quarters');
  await g.goto(13, 6);
  await g.interact([14, 5], 0); // "Sleep until morning"
  await g.skip();
  expect(await has('p5_started')).toBe(true);
  expect(await onMap(g)).toBe('main_deck');
  await g.interact('pete'); // one bell, and he's gone
  expect(await has('p5_round_pete')).toBe(true);
  await g.travel(9, 24, 'galley');
  await g.skip(); // the stove, AGAIN
  expect(await deadCenter(g)).toBe('galley_stove');
  await g.travel(12, 10, 'cargo_hold');
  await g.skip(); // Forty-tw— NOPE.
  expect(await deadCenter(g)).toBe('storeroom');
  await g.travel(14, 3, 'galley');
  await g.travel(8, 12, 'crew_quarters');
  await g.skip(); // three bells: Dunstan, Bob and the pillow
  expect(await has('p5_round_bob')).toBe(true);
  await g.travel(13, 3, 'main_deck');
  await g.skip(); // three bells at the mainmast
  expect(await has('p5_close_call_started')).toBe(true);
  expect(await deadCenter(g)).toBe('midships');
  await g.interact('squawks'); // under the coat
  expect(await has('p5_carrying_squawks')).toBe(true);
  await g.goto(10, 13);
  await g.waitFor(() => window.__GAME__.app.session.story.has('p5_squawks_safe'), null, 10000);
  await g.skip();
  expect(await has('squawks_fully_bald')).toBe(true);
  await g.interact('squawks'); // the check-in
  expect(await has('p5_squawks_checked')).toBe(true);
  await g.interact('gristle');
  await g.interact('fennimore');
  await g.skip(); // CRUNCH: chapter 21
}

/** Chapter 21: the first watch, the duties, the S.E.S., "Back to work." */
async function chapter21(g, s, has) {
  expect(await has('p5_ch21_started')).toBe(true);
  expect(await g.sharkDuty(objectiveDone('what_do_you_do', 'repel'))).toBeGreaterThanOrEqual(2);
  await g.skip();
  await g.interact('garrick'); // seat readiness ... THE STENCHMASTER ENTERTAINMENT SYSTEM
  expect(await has('stenchmaster_entertainment_system_built')).toBe(true);
  await g.approach([14, 17]);
  await g.tap('KeyZ', 50, 250);
  await untilTv(g);
  const seen = await g.tv('next', 'wiring', 'source', 'leave');
  expect(seen).toBe(null);
  expect(await tvVars(g)).toEqual({ power: 1, channel: 6 });
  await g.skip(); // the reactions, the qualifications, the definition, CRAAACK
  for (const f of ['ses_examined', 'ses_wiring_seen', 'ses_power_source_seen', 'crew_confronted_garrick_duties', 'p5_back_to_work']) {
    expect(await has(f), f).toBe(true);
  }
  await g.skip();
}

/** Chapter 22: the office shift, the rudder, the log, the chair, complaints, the Center on the station. */
async function chapter22(g, s, has) {
  expect(await has('stenchmaster_station_unlocked')).toBe(true);
  expect(await g.sharkDuty(objectiveDone('stenchmaster_office', 'duty'))).toBeGreaterThanOrEqual(3);
  await g.skip();
  await g.interact([9, 6], 0); // the rudder: "Rook! Boathook, stern rail!"
  expect(await has('p5_rudder_checked')).toBe(true);
  await g.interact([12, 16]); // the drooled log; off he goes for grog
  expect(await has('p5_garrick_qa')).toBe(true);
  // The chair isn't solid (he sits in it): stand beside it, turn to it, Confirm.
  await g.goto(12, 18);
  await g.goto(13, 18); // arrives facing it
  await g.tap('KeyZ', 50, 250);
  await g.skip(0); // warm. Sit in it.
  expect(await has('p5_sat_in_chair')).toBe(true);
  await g.travel(9, 24, 'galley');
  await g.skip(); // the bread
  expect(await has('p5_bread_seen')).toBe(true);
  await g.interact('garrick'); // quality assurance
  await g.interact('mags');
  await g.travel(8, 12, 'crew_quarters');
  await g.skip(); // "I'll wait."
  await g.interact('brask');
  await g.travel(13, 3, 'main_deck');
  await g.interact('gristle'); // the third complaint, then three bells at the station
  await g.skip();
  expect(await deadCenter(g)).toBe('station');
  expect(await has('p5_laundry_yellow')).toBe(true);
  await g.goto(10, 13).catch(() => g.goto(10, 31));
  await g.waitFor(() => window.__GAME__.app.session.story.has('p5_station_clear'), null, 10000);
  await g.skip(); // Ned's long way round; "Pre-warmed."
  expect(await has('p5_station_reclaimed')).toBe(true);
  await g.skip();
}

/** Chapter 23: find him, THE SUIT, the medals, the refusal, the starboard rail. */
async function chapter23(g, s, has) {
  expect(await has('p5_ch23_started')).toBe(true);
  if ((await onMap(g)) !== 'main_deck') await g.travel(13, 3, 'main_deck');
  await g.travel(9, 24, 'galley');
  await g.travel(12, 10, 'cargo_hold');
  await g.skip(); // behind the crates
  expect(await has('p5_garrick_found')).toBe(true);
  await g.travel(14, 3, 'galley');
  await g.travel(14, 3, 'main_deck');
  await g.skip(0, 0, 0, 0, 0, 0); // the reveal, every medal, the tour, the tablecloth, the captain
  for (const f of ['stenchmaster_suit_created', 'p5_medals_seen', 'p5_suit_tour_done', 'p5_every_stenchmaster']) expect(await has(f), f).toBe(true);
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').actors.get('garrick')?.textureKey)).toMatch(/stenchmaster_suit/);
  await g.interact('garrick'); // HELP. It's formalwear.
  expect(await has('p5_suit_refusal')).toBe(true);
  await g.interact([3, 19]);
  await g.interact([3, 21]);
  await g.interact([3, 23]);
  expect(await has('p5_stbd_repaired')).toBe(true);
  await g.skip();
}

/** Chapter 24: everything at once, the rule, one useful thing, the night. */
async function chapter24(g, s, has) {
  expect(await has('p5_ch24_started')).toBe(true);
  expect(await deadCenter(g)).toBe('quarterdeck');
  await g.interact('squawks'); // off the quarterdeck
  expect(await has('p5_emergency_squawks')).toBe(true);
  expect(await g.sharkDuty(objectiveDone('one_useful_thing', 'duty'))).toBeGreaterThanOrEqual(2);
  await g.skip();
  await g.interact('garrick'); // the crew unload; the speech; "providing leadership?" "NO."
  expect(await has('garrick_emergency_labor_rule')).toBe(true);
  await g.interact([16, 21]); // "That's my one."
  expect(await has('p5_one_useful_thing')).toBe(true);
  await g.skip();
  await g.interact('squawks'); // "Still bald." "Still here."
  expect(await has('p5_night_squawks')).toBe(true);
  await g.interact([14, 17]); // "Programming."
  await g.skip();
}

async function expectPhase5Complete(g, s, errors) {
  const end = await s();
  const flags = flagsOf(end);
  for (const f of ['stenchmaster_entertainment_system_built', 'stenchmaster_suit_created', 'stenchmaster_station_unlocked', 'squawks_fully_bald',
    'crew_confronted_garrick_duties', 'garrick_emergency_labor_rule', 'p5_night_ses_seen', 'p5_complete']) {
    expect(flags.has(f), f).toBe(true);
  }
  for (const q of ['another_terrible_day', 'remember_squawks', 'what_do_you_do', 'stenchmaster_office', 'dressed_for_disaster', 'one_useful_thing']) {
    expect(end.quests[q].status, q).toBe('completed');
  }
  expect(end.captain).toBe('Captain Stinkbeard');
  expect(end.garrickTitle).toBe('Grand Stenchmaster');
  expect(end.sharks.level).toBe('swarm');
  expect(await deadCenter(g)).toBe('treasure_hold');
  expect(end.busy).toBe(false);
  expect(errors).toEqual([]);
}

test('Story Phase 5 plays from the end of Phase 4 to the S.E.S. at night', { tag: ['@phase5', '@story'] }, async ({ page }) => {
  test.setTimeout(45 * 60 * 1000);
  const { g, errors } = await open(page);
  const s = () => g.state();
  const has = async (flag) => flagsOf(await s()).has(flag);
  await g.preset('p4_complete');
  expect(await has('p5_started')).toBe(false); // Phase 5 waits for the bed
  await chapter20(g, s, has);
  await chapter21(g, s, has);
  await chapter22(g, s, has);
  await chapter23(g, s, has);
  await chapter24(g, s, has);
  await expectPhase5Complete(g, s, errors);
});

test('Phase 5 from the suit reveal to the end plays from its preset', { tag: ['@phase5', '@story'] }, async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  const { g, errors } = await open(page);
  const s = () => g.state();
  const has = async (flag) => flagsOf(await s()).has(flag);
  await g.preset('p5_suit_reveal');
  await g.skip(0, 0, 0, 0, 0, 0); // arriving on deck: the reveal plays
  expect(await has('stenchmaster_suit_created')).toBe(true);
  await g.interact('garrick');
  await g.interact([3, 19]);
  await g.interact([3, 21]);
  await g.interact([3, 23]);
  await g.skip();
  await chapter24(g, s, has);
  await expectPhase5Complete(g, s, errors);
});

test('the Stenchmaster Entertainment System: power, channels, wiring, power source, and the set on deck follows', { tag: ['@phase5', '@ui', '@smoke'] }, async ({ page }) => {
  const { g, errors } = await open(page);
  await g.preset('p5_complete');
  await g.interact([14, 17], 0); // (Garrick's line if any, then the set)
  if ((await g.uiState()) !== 'tv') {
    await g.approach([14, 17]);
    await g.tap('KeyZ', 50, 250);
  }
  await untilTv(g);
  const ch = (await tvVars(g)).channel;
  let seen = await g.tv('next');
  expect(seen.view).toBe('front');
  expect((await tvVars(g)).channel).toBe((ch % 6) + 1);
  seen = await g.tv('wiring');
  expect(seen.view).toBe('wiring');
  seen = await g.tv('source');
  expect(seen.view).toBe('source');
  seen = await g.tv('power');
  expect((await tvVars(g)).power).toBe(0);
  await g.tv('power', 'prev', 'leave');
  expect((await g.uiState())).not.toBe('tv');
  // The set on deck shows the channel it's on.
  const want = `ses_tv_ch${(await tvVars(g)).channel}`;
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').props
    .filter((r) => r.x === 14 && r.y === 17 && r.visible).map((r) => r.prop))).toEqual([want]);
  expect(errors).toEqual([]);
});

test('after Phase 5, the Grand Stenchmaster sees off one shark per shift', { tag: ['@phase5', '@world'] }, async ({ page }) => {
  test.setTimeout(8 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p5_complete');
  await g.interact('jory', 0); // "Take a shift"
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').sharkDuty.sessionId)).toBe('open_watch');
  await g.sharkDuty('window.__GAME__.game.scene.getScene("World").sharkDuty.assisted', { timeout: 240000 });
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').sharkDuty.assisted)).toBe(true);
  await g.interact('jory', 0); // "Stand down"
  expect(errors).toEqual([]);
});
