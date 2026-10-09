import { test, expect } from '@playwright/test';
import { open, go, inspect, talk, knobs, walk, everyPreset, onMap, value, has, firstMissing, FIRST, D, G, H, C, Q } from './storyKit.js';

/**
 * Story Phase 13 (the Ancient Stenchmaster Delirium, chapters 127-145) in a
 * real browser with real key presses: the finger loopholes, the sash-in-the-
 * trash song, the growling bedding and the pillow the storm sends back, the
 * linen locker, sash bedding, the Fan Mega-Pack and its cardboard legends,
 * the second S.E.S., the cable, the Stenchmaster Channel, Stench-O-Vision
 * (its knobs), the Brogath special, the rant, the beard, the delirium, the
 * deck orders, two Brogaths, the sealed treasure room, and the Brogath
 * Command Crisis at the helm.
 *
 * The route is the headless one (tests/phase13Play.js), first option at
 * every choice.
 */

const PARTS = { forks: [G, 'p13_forks'], horseshoe: [H, 'p13_horseshoe'], coils: [H, 'p13_coils'], transformer: [G, 'p13_transformer'] };
const JUDGE = ['sheets', 'blankets', 'pillows', 'pillowcases', 'mattress', 'hammock'];
const BEDDING = ['hammocks', 'pads', 'pillows', 'blankets', 'corners'];
const RANT = ['standees', 'bedding', 'tv', 'locker', 'megapack'];
const MET = { brogath: 'pete', rumpold: 'gristle', rumpus: 'bob', gustavio: 'jim', stenchalina: 'squawks', prime: 'garrick' };
const DISARM = { beans: 'p13_dis_beans', grog: 'p13_dis_grog', sauce: 'p13_dis_sauce', fabric: 'p13_dis_fabric', fingers: 'bob', still: 'garrick', rear: 'gristle' };
const ORDERS = ['sail', 'hull', 'cannons', 'helm', 'beans'];
const VENT_KNOBS = ['more', 'nose', 'pine', 'shut'];

const STEPS = [
  ['finger_breakdown.loopholes', async (g) => { await go(g, G); await talk(g, 'garrick'); }],
  ['sash_in_the_trash.wardrobe', async (g) => { await go(g, C); await inspect(g, 'p13_wardrobe'); }],
  ['sash_in_the_trash.watch', async (g) => { await go(g, G); await inspect(g, 'p13_trash_watch'); }],
  ['quarters_alive.unboard', async (g) => { await go(g, G); await inspect(g, 'p13_unboard'); }],
  ['quarters_alive.inside', async (g) => { await go(g, Q); }],
  ['quarters_alive.pillow', async (g) => { await go(g, Q); await inspect(g, 'p13_pillow'); }],
  ['quarters_alive.throw', async (g) => { await go(g, D); await inspect(g, 'p13_throw_1'); }],
  ['quarters_alive.again', async (g) => { await go(g, D); await inspect(g, (await has(g, 'pillow_picked_up')) ? 'p13_throw_2' : 'p13_pickup'); }],
  ['condemn_bedding.judge', async (g) => { await go(g, Q); await inspect(g, `p13_judge_${await firstMissing(g, JUDGE, 'p13_judged_')}`); }],
  ['condemn_bedding.discard', async (g) => { await go(g, Q); await inspect(g, 'p13_pile'); }],
  ['condemn_bedding.stuff', async (g) => { await go(g, Q); await inspect(g, 'p13_locker_stuff'); }],
  ['condemn_bedding.nail', async (g) => { await go(g, Q); await inspect(g, 'p13_locker_nail'); }],
  ['grand_bedding.bedding', async (g) => { await go(g, Q); await inspect(g, `p13_bed_${await firstMissing(g, BEDDING, 'p13_bedding_')}`); }],
  ['fan_megapack.open', async (g) => { await go(g, Q); await inspect(g, 'p13_megapack_open'); }],
  ['fan_megapack.place', async (g) => { await go(g, Q); await inspect(g, 'p13_megapack_place'); }],
  ['build_your_own_ses.parts', async (g) => {
    const [map, id] = PARTS[await firstMissing(g, Object.keys(PARTS), 'ses_part_')];
    await go(g, map);
    await inspect(g, id);
  }],
  ['build_your_own_ses.build', async (g) => { await go(g, Q); await inspect(g, 'p13_kit_build'); }],
  ['wire_the_systems.brogath', async (g) => { await go(g, Q); await inspect(g, `p13_cable_brogath_${(await value(g, 'standee_brogath')) ?? 'port'}`); }],
  ['wire_the_systems.deck', async (g) => { await go(g, D); await inspect(g, 'p13_deck_path'); }],
  ['wire_the_systems.cannon', async (g) => { await go(g, D); await inspect(g, 'p13_cannon'); }],
  ['wire_the_systems.tape', async (g) => { await go(g, G); await inspect(g, 'p13_tape'); }],
  ['wire_the_systems.connect', async (g) => { await go(g, G); await inspect(g, 'p13_connect'); }],
  ['stenchmaster_channel.watch', async (g) => { await go(g, Q); await inspect(g, 'p13_channel_watch'); }],
  ['stench_o_vision.vent', async (g) => { await go(g, Q); await knobs(g, 'p13_vent_knobs', VENT_KNOBS); }],
  ['brogath_special.watch', async (g) => { await go(g, Q); await inspect(g, 'p13_special_watch'); }],
  ['the_limit.rant', async (g) => {
    await go(g, Q);
    const next = await firstMissing(g, RANT, 'p13_rant_');
    if (next !== 'standees') return inspect(g, `p13_rant_${next}`);
    return inspect(g, `p13_rant_stenchalina_${(await value(g, 'standee_stenchalina')) ?? 'cots'}`);
  }],
  ...Object.entries(MET).map(([o, who]) => [`ancient_stenchmasters.${o}`, async (g) => { await go(g, Q); await talk(g, who); }]),
  ...Object.entries(DISARM).map(([o, what]) => [`disarm_stenchmasters.${o}`, async (g) => {
    await go(g, Q);
    if (what.startsWith('p13_')) await inspect(g, what);
    else await talk(g, what);
  }]),
  ...ORDERS.map((o) => [`stenchmaster_apocalypse.${o}`, async (g) => { await go(g, D); await inspect(g, `p13_ord_${o}`); }]),
  ['two_brogaths.look', async (g) => {
    await go(g, D);
    if ((await firstMissing(g, ['cardboard', 'pete'], 'p13_looked_')) === 'pete') await talk(g, 'pete');
    else await inspect(g, 'p13_look_cardboard');
  }],
  ['treasure_room_brogath.door', async (g) => { await go(g, H); await inspect(g, 'p13_treasure_door'); }],
  ['treasure_room_brogath.pete', async (g) => { await go(g, H); await talk(g, 'pete'); }],
  ['command_crisis.helm', async (g) => { await go(g, D); await inspect(g, `p13_helm_${await firstMissing(g, ['1', '2', '3'], 'p13_helm_')}`); }],
];

const done = (g) => has(g, 'p13_complete');

async function expectCanonicalEnd(g) {
  expect(await has(g, 'p13_complete')).toBe(true);
  expect(await has(g, 'brogath_command_crisis')).toBe(true);
  expect(await has(g, 'stinkbeard_delirium')).toBe(true);
  expect(await value(g, 'brogath_status')).toBe('alleged_still_none');
  expect(await value(g, 'treasure_room_state')).toBe('sealed_brogath_alleged');
  expect(await value(g, 'great_sharkstorm')).toBe('command_crisis');
  expect(await value(g, 'queen_annes_revenge_location')).toBe('inside_great_sharkstorm');
  expect(await value(g, 'stenchmaster_sash_custody')).toBe('captains_wardrobe');
  expect(await has(g, 'stenchmaster_suspension_active')).toBe(true);
}

test('Story Phase 13 plays from the finger loopholes to the Brogath Command Crisis', { tag: ['@phase13', '@story'] }, async ({ page }) => {
  test.setTimeout(120 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p12_complete');
  await g.skip(...FIRST);
  await go(g, G);
  expect(await has(g, 'p13_ready_hint')).toBe(true);
  expect(await has(g, 'p13_started')).toBe(false); // Phase 13 waits for the captain
  await talk(g, 'garrick');
  expect(await has(g, 'p13_started')).toBe(true);
  await walk(g, STEPS, done, 'Phase 13');
  await expectCanonicalEnd(g);
  expect(errors).toEqual([]);
});

test('Phase 13 from the beard to the end plays from its preset', { tag: ['@phase13', '@story'] }, async ({ page }) => {
  test.setTimeout(60 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p13_beard_delirium');
  await g.skip(...FIRST);
  await walk(g, STEPS, done, 'Phase 13');
  await expectCanonicalEnd(g);
  expect(errors).toEqual([]);
});

test('Stench-O-Vision: the vent puffs, the fumes are mild and follow the Fume Hazard option, and the knobs shut it', { tag: ['@phase13', '@ui', '@smoke'] }, async ({ page }) => {
  test.setTimeout(12 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.eval(() => window.__GAME__.app.settings.set('fumeHazard', 'off'));
  await g.preset('p13_stench_o_vision');
  await g.skip(...FIRST);
  expect(await has(g, 'stench_o_vision_on')).toBe(true);
  expect(await onMap(g)).toBe(Q);
  const zone = await g.eval(() => {
    const w = window.__GAME__.game.scene.getScene('World');
    const z = w.fumeField?.zoneAt(10, 6, w.fumeClock);
    return z ? { id: z.id, level: z.level, severity: z.severity } : null;
  });
  expect(zone).toEqual({ id: 'p13_stench_o_vision', level: 'dense', severity: 0.35 });
  // Off: standing in it builds nothing up, but it is still there to see.
  await g.goto(10, 7);
  await g.wait(2500);
  expect((await g.state()).exposure).toBe(0);
  await knobs(g, 'p13_vent_knobs', VENT_KNOBS);
  expect(await has(g, 'stench_o_vision_disabled')).toBe(true);
  expect(await value(g, 'stench_o_vision')).toBe('off');
  await g.eval(() => window.__GAME__.app.settings.set('fumeHazard', 'normal'));
  expect(errors).toEqual([]);
});

test('the delirium: the dialogue box says BROGATH (?) (Pete blinks through), the world draws him, and he is still Pete underneath', { tag: ['@phase13', '@ui', '@smoke'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p13_complete');
  await g.skip(...FIRST);
  expect(await onMap(g)).toBe(D);
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').actors.get('pete')?.textureKey)).toBe('char_pete_brogath');
  await g.approach('pete');
  // At the end of Phase 13, talking to Pete starts Phase 14 (chapter 146): play his Phase 13 line itself.
  await g.eval(() => { window.__GAME__.game.scene.getScene('World').runScript('pete.p13_crisis_1'); });
  const names = new Set();
  for (let i = 0; i < 30; i++) {
    const n = await g.eval(() => window.__GAME__.app.overlay.dialogue.nameText?.text ?? null);
    if (n) names.add(n);
    await g.wait(100);
  }
  expect(names.has('BROGATH (?)')).toBe(true);
  for (const n of names) expect(['BROGATH (?)', 'Peg-Leg Pete']).toContain(n);
  await g.skip(...FIRST);
  // Nothing about him changed: same id, same quests, never confirmed.
  expect(await g.eval(() => window.__GAME__.app.content.npcs.get('pete').name)).toBe('Peg-Leg Pete');
  expect(await has(g, 'brogath_verified')).toBe(false);
  expect(errors).toEqual([]);
});

test('the cardboard legends: placed in the quarters, still there after a save and Continue', { tag: ['@phase13', '@saves', '@smoke'] }, async ({ page }) => {
  test.setTimeout(12 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p13_cardboard_legends');
  await g.skip(...FIRST);
  await inspect(g, 'p13_megapack_place');
  expect(await has(g, 'standees_placed')).toBe(true);
  const spots = () => g.eval(() => ['stenchalina', 'brogath', 'rumpold', 'rumpus', 'gustavio'].map((id) => window.__GAME__.app.session.story.getValue(`standee_${id}`)));
  const shown = () => g.eval(() => window.__GAME__.game.scene.getScene('World').props.filter((p) => p.visible && String(p.id ?? '').startsWith('decor_')).map((p) => p.id).sort());
  const before = { spots: await spots(), shown: await shown() };
  expect(before.shown.length).toBe(5);
  await g.eval(() => window.__GAME__.game.scene.getScene('World').autosave());
  await page.reload();
  await g.waitFor(() => !!window.__GAME__?.app);
  await g.titleChoose('continue');
  await g.skip(...FIRST);
  expect(await onMap(g)).toBe(Q);
  expect(await spots()).toEqual(before.spots);
  expect(await shown()).toEqual(before.shown);
  expect(errors).toEqual([]);
});

test('every Phase 13 preset loads and its scene plays without errors', { tag: ['@phase13', '@scenes'] }, async ({ page }) => {
  test.setTimeout(75 * 60 * 1000);
  const { g, errors } = await open(page);
  await everyPreset(g, errors, 'p13_', 24);
});
