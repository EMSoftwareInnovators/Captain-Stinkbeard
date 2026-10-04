import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Story Phase 8 (the Lost Fart; the Grand Nap) in a real browser with real
 * key presses: the whole phase from the end of Phase 7 (the crate next to
 * Squawks), through the false alarm, the sash bearers, the Lost Fart
 * nonsense, the condemned quarters, the barracks, the bedtime story, the
 * crown and the sash, to three in the morning.
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
const RELEASE_STATES = ['calm', 'rumbling', 'false_alarm', 'possibly_building', 'unknown'];

/** Chapters 42 to 47: the hold, the false alarm, the sash bearers, the Lost Fart nonsense. */
async function theDay(g, has) {
  // 42: settle in; the audit
  for (const npc of ['pete', 'bob', 'gristle', 'jim']) await g.interact(npc);
  await g.interact([16, 16]); // your corner; the episode; GLOOOORP
  expect(await has('p8_ftm_started')).toBe(true);
  // 43: the false alarm
  await g.interact('garrick'); // "I don't know." "Oh." "Ohhhh."
  expect(RELEASE_STATES).toContain(await value(g, 'garrick_release'));
  await g.interact('squawks'); // into the coat
  await g.interact([14, 3]); // the stairs (nobody opens the hatch)
  expect(await has('garrick_possible_release_survived')).toBe(true);
  expect(await onMap(g)).toBe('cargo_hold');
  // 44: sash bearers
  await g.interact('garrick');
  for (const npc of ['gristle', 'pete', 'bob', 'jim', 'ned']) await g.interact(npc);
  await g.interact('garrick'); // FART SASH
  expect(await has('fart_sash_nickname')).toBe(true);
  // 45 to 47: the Lost Fart
  await g.interact([12, 12]); // the costume trunk: Professor Barnacle Bob
  await g.interact('garrick'); // the Grand Crown
  await g.interact('garrick'); // the premise
  await g.interact([5, 12]); // the Chamber of Frog Grog
  await g.interact([11, 11]); // the Electric Frog Oracle
  await g.goto(11, 14); // the Bottomless Ravine (it's floor: step over it)
  await g.skip();
  expect(await has('p8_lm_ravine')).toBe(true);
  await g.interact('gristle'); // hand him Squawks; the captain lets rip
  await g.interact('gristle'); // take Squawks back; the fart blanket; the big rumble
  expect(await has('p8_nap_banned')).toBe(true);
  expect(await value(g, 'great_sharkstorm')).toBe('easing_near_ship');
}

/** Chapters 48 to 50: the old quarters, the decree, the barracks. */
async function theBarracks(g, has) {
  await g.travel(14, 3, 'galley');
  await g.skip(); // he's in front of the door
  expect(await has('p8_quarters_blocked')).toBe(true);
  await g.interact('pete'); // "Stand aside." Centuries.
  await g.interact([8, 12]); // nail up the sign
  expect(await has('crew_quarters_condemned')).toBe(true);
  await g.travel(12, 10, 'cargo_hold');
  await g.skip(); // the Grand Decree
  expect(await has('p8_decree_heard')).toBe(true);
  await g.interact([3, 7]); // sling the hammocks
  await g.interact([15, 16]); // the sailcloth
  await g.interact([9, 15]); // the clutter
  await g.interact('squawks'); // his cradle
  for (const npc of ['pete', 'bob', 'gristle', 'jim']) await g.interact(npc);
  await g.interact([15, 16]); // your bunk; and over it
  expect(await has('garrick_top_hammock')).toBe(true);
}

/** Chapters 51 to 54: the bedtime story, the Grand Nap, the crown, the sash, three in the morning. */
async function theNight(g, has) {
  await g.interact([15, 16]); // into the bunk: the legend, the outfit, the crown
  expect(await has('lost_fart_legend_told')).toBe(true);
  expect(await has('p8_crown_fell')).toBe(true);
  await g.interact([17, 14]); // the crown into the crate
  expect(await has('grand_crown_banned_for_sleep')).toBe(true);
  await g.interact([15, 16]); // back to bed: the sash descends
  expect(await has('p8_sash_in_hand')).toBe(true);
  for (const npc of ['pete', 'gristle', 'bob']) await g.interact(npc); // the evidence
  await g.skip();
}

test('Story Phase 8 plays from the end of Phase 7 to three in the morning', { tag: ['@phase8', '@story'] }, async ({ page }) => {
  test.setTimeout(60 * 60 * 1000);
  const { g, errors } = await open(page);
  const has = async (flag) => flagsOf(await g.state()).has(flag);
  await g.preset('p7_complete');
  expect(await has('p8_started')).toBe(false); // Phase 8 waits for the crate
  await g.interact([12, 14], 0); // "Get some sleep, sitting up"
  await g.skip();
  expect(await has('p8_started')).toBe(true);
  await theDay(g, has);
  await theBarracks(g, has);
  await theNight(g, has);
  expect(await has('p8_complete')).toBe(true);
  expect(await has('sash_origin_revealed')).toBe(true);
  expect(await value(g, 'garrick_release')).toBe('unknown');
  expect(await value(g, 'great_sharkstorm')).toBe('easing_near_ship');
  expect(await g.eval(() => window.__GAME__.app.session.party.leader().hp)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('Phase 8 from the barracks to the end plays from its preset', { tag: ['@phase8', '@story'] }, async ({ page }) => {
  test.setTimeout(25 * 60 * 1000);
  const { g, errors } = await open(page);
  const has = async (flag) => flagsOf(await g.state()).has(flag);
  await g.preset('p8_barracks_complete');
  await g.skip();
  await g.interact([15, 16]); // your bunk
  await theNight(g, has);
  expect(await has('p8_complete')).toBe(true);
  expect(errors).toEqual([]);
});

test('the discount-store reveal: wake the crew with the evidence', { tag: ['@phase8', '@scenes', '@smoke'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const { g, errors } = await open(page);
  const has = async (flag) => flagsOf(await g.state()).has(flag);
  await g.preset('p8_discount_store_reveal');
  await g.skip();
  for (const npc of ['pete', 'gristle', 'bob']) await g.interact(npc);
  await g.skip();
  expect(await has('sash_origin_revealed')).toBe(true);
  expect(await has('p8_complete')).toBe(true);
  expect(await value(g, 'garrick_release')).toBe('unknown');
  expect(errors).toEqual([]);
});

test('after Phase 8: the barracks, the condemned door, and nobody goes in', { tag: ['@phase8', '@world'] }, async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p8_complete');
  await g.skip();
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').model.name)).toBeTruthy();
  await g.interact([15, 16]); // the bunk: he talks in his sleep
  await g.interact('squawks');
  await g.travel(14, 3, 'galley');
  await g.skip();
  await g.interact([8, 12]); // the door: (cancelled) leave it
  expect(await onMap(g)).toBe('galley');
  await g.interact([7, 12]); // the sign
  expect(await onMap(g)).toBe('galley');
  expect(errors).toEqual([]);
});
