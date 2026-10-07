import { test, expect } from '@playwright/test';
import { open, go, inspect, talk, walk, everyPreset, onMap, value, variable, has, firstMissing, FIRST, D, G, H, C } from './storyKit.js';

/**
 * Story Phase 12 (the Thirty-Second Sash Trial, chapters 112-126) in a real
 * browser with real key presses: Garrick wakes up loaded, the gear, the
 * volunteer, the pre-waft, the thirty-second hold (held and let go with real
 * key presses), the flutter, the humiliation blast, the dice, the ceremony's
 * six, the jumping beans' three, ONE DAY, the suspension, the authenticity
 * whiff, the wardrobe, breakfast and the finger.
 *
 * The route is the headless one (tests/phase12Play.js), first option at
 * every choice.
 */

const GEAR = { wet_cloth: [G, 'p12_bucket'], goggles: [H, 'p12_goggles'], waist_rope: [G, 'p12_rope'], beard_wrap: [C, 'p12_wardrobe_wrap'] };
const BREAKFAST = ['eggs', 'bacon', 'potatoes', 'fruit', 'toast', 'tea'];

const STEPS = [
  ['he_woke_up_loaded.gear', async (g) => {
    const [map, id] = GEAR[await firstMissing(g, Object.keys(GEAR), 'gear_')];
    await go(g, map);
    await inspect(g, id);
  }],
  ['volunteer.deck', async (g) => { await go(g, D); }],
  ['volunteer.take', async (g) => { await go(g, D); await talk(g, 'garrick'); }],
  // The trial: the driver holds the sash with real key presses (see driver.holdTension).
  ['the_trial.hold', async (g) => { await go(g, D); await talk(g, 'garrick'); }],
  ['the_flutter.complaints', async (g) => { await go(g, D); await inspect(g, `p12_complaint_${await firstMissing(g, ['1', '2', '3', '4'], 'p12_complaint_')}`); }],
  ['find_the_dice.follow', async (g) => { await go(g, G); await talk(g, 'garrick'); }],
  ['find_the_dice.crate', async (g) => { await go(g, G); await inspect(g, 'p12_crate_dice'); }],
  ['no_escape.read', async (g) => { await go(g, G); await inspect(g, 'p12_fine_print'); }],
  ['six_dice.open', async (g) => { await go(g, G); await inspect(g, 'p12_shipment'); }],
  ['grand_dice_ceremony.inspect', async (g) => { await go(g, G); await inspect(g, 'p12_die_inspect'); }],
  ['grand_dice_ceremony.witness', async (g) => { await go(g, G); await inspect(g, 'p12_die_witness'); }],
  ['grand_dice_ceremony.roll', async (g) => { await go(g, G); await talk(g, 'garrick'); }],
  ['grand_dice_ceremony.celebrate', async (g) => { await go(g, G); await talk(g, await firstMissing(g, ['pete', 'jim', 'bob', 'gristle', 'ned'], 'p12_cheer_')); }],
  ['jumping_beans.catch', async (g) => { await go(g, G); await inspect(g, `p12_die_${await firstMissing(g, ['1', '2', '3'], 'p12_hop_')}`); }],
  ['not_grand.rules', async (g) => { await go(g, G); await talk(g, 'garrick'); }],
  ['authenticity_whiff.exam', async (g) => { await go(g, G); await inspect(g, 'p12_sash_exam'); }],
  ['authenticity_whiff.whiff', async (g) => { await go(g, G); await inspect(g, 'p12_sash_whiff'); }],
  ['authenticity_whiff.wardrobe', async (g) => { await go(g, C); await inspect(g, 'p12_wardrobe_sash'); }],
  ['normal_breakfast.parts', async (g) => { await go(g, G); await inspect(g, `p12_bf_${await firstMissing(g, BREAKFAST, 'p12_bf_')}`); }],
  ['normal_breakfast.eat', async (g) => { await go(g, G); await inspect(g, 'p12_bf_eat'); }],
  ['pull_my_finger.intervene', async (g) => { await go(g, G); await talk(g, 'garrick'); }],
];

const done = (g) => has(g, 'p12_complete');

async function expectCanonicalEnd(g) {
  expect(await has(g, 'p12_complete')).toBe(true);
  expect(await has(g, 'thirty_seconds_held')).toBe(true);
  expect(await has(g, 'sash_fluttered')).toBe(true);
  expect(await value(g, 'grand_dice_apparent_result')).toBe('six_three_months');
  expect(await value(g, 'grand_dice_final_result')).toBe('three_one_day');
  expect(await has(g, 'stenchmaster_suspension_active')).toBe(true);
  expect(await value(g, 'stenchmaster_sash_custody')).toBe('captains_wardrobe');
  expect((await g.state()).garrickTitle).toBe('Garrick (suspended)');
  expect(await value(g, 'queen_annes_revenge_location')).toBe('inside_great_sharkstorm');
  expect(await has(g, 'p13_started')).toBe(false);
}

test('Story Phase 12 plays from the morning after the conspiracy to one day of Garrick', { tag: ['@phase12', '@story'] }, async ({ page }) => {
  test.setTimeout(90 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p11_complete');
  await g.skip(...FIRST);
  await go(g, G);
  expect(await has(g, 'p12_ready_hint')).toBe(true);
  expect(await has(g, 'p12_started')).toBe(false); // Phase 12 waits for the morning
  await inspect(g, 'p12_start_bed');
  expect(await has(g, 'p12_started')).toBe(true);
  await walk(g, STEPS, done, 'Phase 12');
  await expectCanonicalEnd(g);
  expect(errors).toEqual([]);
});

test('Phase 12 from the dice ceremony to the end plays from its preset', { tag: ['@phase12', '@story'] }, async ({ page }) => {
  test.setTimeout(40 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p12_dice_ceremony');
  await g.skip(...FIRST);
  await walk(g, STEPS, done, 'Phase 12');
  await expectCanonicalEnd(g);
  expect(errors).toEqual([]);
});

test('the thirty-second trial: a real hold, thirty counted seconds, then the captain lets it flutter', { tag: ['@phase12', '@ui', '@smoke'] }, async ({ page }) => {
  test.setTimeout(12 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p12_trial');
  // The scene opens with a few lines ("Sash holder... READY?"), then the hold.
  for (let i = 0; i < 400 && (await g.uiState()) !== 'tension'; i++) {
    if (['line', 'tutorial', 'insert', 'choice'].includes(await g.uiState())) await g.tap('KeyZ', 45, 60);
    await g.wait(100);
  }
  expect(await g.uiState()).toBe('tension');
  expect(await g.eval(() => window.__GAME__.app.flags.autoTiming)).toBe(null);
  const trial = await g.holdTension();
  expect(trial.seconds).toBeGreaterThanOrEqual(29);
  await g.skip(...FIRST);
  expect(await has(g, 'thirty_seconds_held')).toBe(true);
  expect(await has(g, 'sash_fluttered')).toBe(true);
  expect(await variable(g, 'trial_released')).toBe(1);
  expect(errors).toEqual([]);
});

test('the Grand Dice: it shows six, THREE MONTHS; the beans move it to three, ONE DAY', { tag: ['@phase12', '@scenes', '@smoke'] }, async ({ page }) => {
  test.setTimeout(15 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p12_three_months');
  await g.skip(...FIRST);
  expect(await value(g, 'grand_dice_apparent_result')).toBe('six_three_months');
  for (let i = 0; i < 5 && !(await has(g, 'p12_ch122_started')); i++) {
    await talk(g, await firstMissing(g, ['pete', 'jim', 'bob', 'gristle', 'ned'], 'p12_cheer_'));
  }
  expect(await has(g, 'p12_ch122_started')).toBe(true);
  for (const n of ['1', '2', '3']) await inspect(g, `p12_die_${n}`);
  expect(await value(g, 'grand_dice_final_result')).toBe('three_one_day');
  expect(await has(g, 'stenchmaster_suspension_active')).toBe(true);
  expect(errors).toEqual([]);
});

test('suspended: the dialogue box and the world call him Garrick; the sash goes into the wardrobe', { tag: ['@phase12', '@ui', '@smoke'] }, async ({ page }) => {
  test.setTimeout(12 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p12_sash_wardrobe');
  await g.skip(...FIRST);
  expect((await g.state()).garrickTitle).toBe('Garrick (suspended)');
  expect(await onMap(g)).toBe(C);
  await inspect(g, 'p12_wardrobe_sash');
  expect(await has(g, 'sash_in_wardrobe')).toBe(true);
  expect(await g.eval(() => window.__GAME__.app.session.inventory.count('stenchmaster_sash'))).toBe(0);
  await go(g, G);
  await g.approach('garrick');
  await g.tap('KeyZ', 50, 400);
  const name = await g.eval(() => window.__GAME__.app.overlay.dialogue.nameText?.text ?? null);
  expect(name).toBe('Garrick');
  await g.skip(...FIRST);
  expect(errors).toEqual([]);
});

test('every Phase 12 preset loads and its scene plays without errors', { tag: ['@phase12', '@scenes'] }, async ({ page }) => {
  test.setTimeout(60 * 60 * 1000);
  const { g, errors } = await open(page);
  await everyPreset(g, errors, 'p12_', 21);
});
