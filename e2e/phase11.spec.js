import { test, expect } from '@playwright/test';
import { open, go, inspect, talk, knobs, walk, everyPreset, onMap, value, has, firstMissing, FIRST, D, G, H } from './storyKit.js';

/**
 * Story Phase 11 (the Grand Bedtime Argument, chapters 96-111) in a real
 * browser with real key presses: from bedtime inside the Great Sharkstorm
 * (the end of Phase 10) through the six-rope lamp, Brogath, every sash
 * incident, the Grand Finger-Puller, the storm's tokens, the hammocks, the
 * lost book, the Cheap-O-Rama delivery and its pocket edition, bed sashes,
 * Sir Rumpus, the late-night show, the First Great Sash Flutter and the
 * secret research, to the anti-dice conspiracy.
 *
 * The route is the headless one (tests/phase11Play.js), first option at
 * every choice.
 */

const STEPS = [
  ['bedtime_in_the_storm.book', async (g) => { await go(g, G); await talk(g, 'garrick'); }],
  ['bedtime_in_the_storm.hammocks', async (g) => { await go(g, G); await talk(g, 'gristle'); }],
  ['bedtime_in_the_storm.bed', async (g) => { await go(g, G); await inspect(g, 'p11_bed'); }],
  ['grand_illumination.ties', async (g) => { await inspect(g, `p11_tie_${await firstMissing(g, ['rope', 'leather'], 'p11_tie_')}`); }],
  ['grand_illumination.rig', async (g) => { await inspect(g, 'p11_lamp_rig'); }],
  ['grand_illumination.test', async (g) => { await inspect(g, 'p11_lamp_test'); }],
  ['grand_illumination.six', async (g) => { await inspect(g, 'p11_lamp_six'); }],
  ['poor_in_gold.story', async (g) => { await talk(g, 'garrick'); }],
  ['every_sash_incident.review', async (g) => {
    const next = await firstMissing(g, ['peg', 'chart', 'holders', 'book'], 'p11_sash_ex_');
    if (next === 'peg') await inspect(g, 'p11_sash_peg');
    else if (next === 'chart') await inspect(g, 'p11_org_chart');
    else if (next === 'holders') await talk(g, 'rusty_tom');
    else await talk(g, 'garrick');
  }],
  ['grand_finger_puller.vote', async (g) => { await talk(g, await firstMissing(g, ['pete', 'bob', 'jim', 'gristle'], 'p11_vote_')); }],
  ['storm_listening.tokens', async (g) => { await inspect(g, `p11_tok_${await firstMissing(g, ['1', '2', '3', '4'], 'p11_tok_')}`); }],
  ['hammocks_die.up', async (g) => { await talk(g, await firstMissing(g, ['pete', 'bob', 'jim'], 'p11_up_')); }],
  ['hammocks_die.table', async (g) => { await inspect(g, 'p11_table'); }],
  ['hammocks_die.rags', async (g) => { await inspect(g, 'p11_rags_pete'); }],
  ['the_lost_book.brace', async (g) => { await inspect(g, 'p11_brace'); }],
  ['the_lost_book.console', async (g) => { await talk(g, 'garrick'); }],
  ['cheap_o_rama_delivery.deck', async (g) => { await go(g, D); }],
  ['cheap_o_rama_delivery.carry', async (g) => { await go(g, D); await inspect(g, 'p11_crate_deck'); }],
  ['cheap_o_rama_delivery.open', async (g) => { await go(g, G); await inspect(g, 'p11_crate_open'); }],
  ['pocket_sacred_text.find', async (g) => { await go(g, G); await inspect(g, 'p11_crate_find'); }],
  ['pocket_sacred_text.crew', async (g) => { await go(g, G); await talk(g, await firstMissing(g, ['ned', 'gristle', 'pete'], 'p11_pt_')); }],
  ['bed_sashes.take', async (g) => { await go(g, G); await inspect(g, 'p11_crate_take'); }],
  ['bed_sashes.hang', async (g) => { await go(g, G); await inspect(g, `p11_hang_${await firstMissing(g, ['pete', 'bob', 'jim'], 'p11_hung_')}`); }],
  ['bed_sashes.own', async (g) => { await go(g, G); await inspect(g, 'p11_own_bed'); }],
  ['grand_resumption.story', async (g) => { await go(g, G); await talk(g, 'garrick'); }],
  // The Mark II won't go off: four knobs, then the master switch turns up.
  ['late_night_bling.off', async (g) => { await go(g, G); await knobs(g, 'p11_tv_late', ['flip', 'stretch', 'worse', 'mute', 'master']); }],
  ['first_great_flutter.story', async (g) => { await go(g, G); await talk(g, 'garrick'); }],
  ['anti_dice_conspiracy.borrow', async (g) => { await go(g, G); await inspect(g, 'p11_borrow'); }],
  ['anti_dice_conspiracy.read', async (g) => { await go(g, G); await inspect(g, 'p11_lamp_read'); }],
  ['anti_dice_conspiracy.plan', async (g) => { await go(g, G); await inspect(g, 'p11_plan'); }],
  ['anti_dice_conspiracy.return', async (g) => { await go(g, G); await inspect(g, 'p11_return'); }],
  ['anti_dice_conspiracy.wake', async (g) => { await go(g, G); await talk(g, await firstMissing(g, ['pete', 'gristle', 'bob', 'jim'], 'p11_woken_')); }],
  ['anti_dice_conspiracy.meet', async (g) => { await go(g, G); await inspect(g, 'p11_meeting'); }],
];

const done = (g) => has(g, 'p11_complete');

async function expectCanonicalEnd(g) {
  expect(await has(g, 'p11_complete')).toBe(true);
  expect(await has(g, 'conspiracy_ready')).toBe(true);
  expect(await value(g, 'galley_lamp_state')).toBe('six_rope_suspension');
  expect(await value(g, 'garrick_book_location')).toBe('great_sharkstorm');
  expect(await value(g, 'pocket_legend_book_condition')).toBe('page_tear');
  expect(await value(g, 'great_sharkstorm')).toBe('inside_bedtime');
  expect(await value(g, 'queen_annes_revenge_location')).toBe('inside_great_sharkstorm');
  expect(await has(g, 'treasure_room_sealed')).toBe(true);
  expect(await has(g, 'p12_started')).toBe(false);
}

test('Story Phase 11 plays from bedtime inside the storm to the anti-dice conspiracy', { tag: ['@phase11', '@story'] }, async ({ page }) => {
  test.setTimeout(90 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p10_complete');
  await g.skip();
  expect(await onMap(g)).toBe(G);
  expect(await has(g, 'p11_ready_hint')).toBe(true);
  expect(await has(g, 'p11_started')).toBe(false); // Phase 11 waits for bedtime
  await inspect(g, 'p11_start_bed');
  expect(await has(g, 'p11_started')).toBe(true);
  await walk(g, STEPS, done, 'Phase 11');
  await expectCanonicalEnd(g);
  expect(errors).toEqual([]);
});

test('Phase 11 from the Cheap-O-Rama delivery to the end plays from its preset', { tag: ['@phase11', '@story'] }, async ({ page }) => {
  test.setTimeout(40 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p11_cheap_o_rama');
  await g.skip(...FIRST);
  await walk(g, STEPS, done, 'Phase 11');
  await expectCanonicalEnd(g);
  expect(errors).toEqual([]);
});

test('the lamp: two ties, the rig, a test that fails, six ropes that hold', { tag: ['@phase11', '@scenes', '@smoke'] }, async ({ page }) => {
  test.setTimeout(12 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p11_lamp_engineering');
  await g.skip(...FIRST);
  for (const tie of ['rope', 'leather']) await inspect(g, `p11_tie_${tie}`);
  await inspect(g, 'p11_lamp_rig');
  await inspect(g, 'p11_lamp_test');
  expect(await has(g, 'lamp_test_failed')).toBe(true);
  await inspect(g, 'p11_lamp_six');
  expect(await value(g, 'galley_lamp_state')).toBe('six_rope_suspension');
  expect(errors).toEqual([]);
});

test('the late-night show: four wrong knobs, then the master switch', { tag: ['@phase11', '@ui', '@smoke'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p11_bling_late_night');
  await g.skip(...FIRST);
  await knobs(g, 'p11_tv_late', ['flip', 'stretch', 'worse', 'mute', 'master']);
  expect(await has(g, 'p11_late_night_off')).toBe(true);
  expect(errors).toEqual([]);
});

test('the treasure-room door is sealed: the old key doesn\'t open it, and the captain stays in the hold', { tag: ['@phase11', '@world', '@smoke'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p11_complete');
  await g.skip(...FIRST);
  await g.eval(() => window.__GAME__.app.session.inventory.add('treasure_key'));
  await go(g, H);
  await g.goto(4, 4);
  await g.tap('ArrowUp', 60, 600);
  await g.skip(...FIRST);
  expect(await onMap(g)).toBe(H);
  expect(errors).toEqual([]);
});

test('every Phase 11 preset loads and its scene plays without errors', { tag: ['@phase11', '@scenes'] }, async ({ page }) => {
  test.setTimeout(45 * 60 * 1000);
  const { g, errors } = await open(page);
  await everyPreset(g, errors, 'p11_', 18);
});
