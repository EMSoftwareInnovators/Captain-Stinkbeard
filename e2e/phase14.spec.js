import { test, expect } from '@playwright/test';
import { open, go, touch, untilTv, everyPreset, onMap, value, variable, has, firstMissing, D, G, H, C, Q } from './storyKit.js';

/**
 * Story Phase 14 (RETURN OF BROGATH, chapters 146-169) in a real browser
 * with real key presses: the treasure-room door, the plume, Brogath the
 * Bashful in his cardboard, the containment corner and the Brogath Rules,
 * the flutter incidents and the Apology Eruption, Garrick back in office,
 * breakfast, the Fart-Free Zone, the Grand Currency, oat security, the Frog
 * Tax Man, the sash commercial, the Anger Waft and the Grand Bank (the
 * teller's window), the catastrophe, and Mandatory History Night.
 *
 * The route is the headless one (tests/phase14Play.js). At a reassurance
 * prompt the captain says the calming thing (the data marks which); at
 * every other choice, the first option. The teller's window plays itself
 * with the debug auto timing.
 */

const Z = 'fart_free_zone';

/** Like the driver's skip, but at a reassurance prompt it picks the calming answer. */
async function play(g) {
  const until = Date.now() + 150000;
  while (Date.now() < until) {
    const st = await g.uiState();
    if (st === 'idle') return;
    if (st === 'battle') {
      await g.settleBattle();
      continue;
    }
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
    if (st === 'tension') {
      await g.holdTension();
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

/** The kit's walk between rooms, waiting out people who are still walking off a doorway (the crew leaving the hold stairs). */
async function goWait(g, map) {
  for (let tries = 0; ; tries++) {
    try {
      await go(g, map);
      return;
    } catch (err) {
      if (tries >= 10 || !/no way from/.test(err.message)) throw err;
      await g.wait(800);
    }
  }
}

/** Rooms, with the Fart-Free Zone (through the little door under the hold stairs). */
async function go14(g, map) {
  const here = await onMap(g);
  if (here === map) return;
  if (here === Z) await goWait(g, H);
  if (map === Z) {
    await goWait(g, H);
    await goWait(g, Z);
  } else await goWait(g, map);
  await play(g);
}

/**
 * The kit's objective walk, but a step may come round many times on purpose
 * (sixteen depositors at the bell): stuck means nothing in the story changed.
 */
async function walk14(g, steps, label) {
  let last = null;
  let same = 0;
  const snapshot = () => g.eval(() => {
    const st = window.__GAME__.app.session.story.serialize();
    return JSON.stringify([st.flags.length, st.vars, st.values]);
  });
  for (let n = 0; n < 600 && !(await done(g)); n++) {
    const ref = await g.eval((list) => list.find((r) => {
      const [q, o] = r.split('.');
      return window.__GAME__.app.session.quests.isObjectiveAvailable(q, o);
    }), steps.map(([r]) => r));
    if (!ref) throw new Error(`stuck on ${await onMap(g)}: no open ${label} objective the player can act on`);
    const before = await snapshot();
    await steps.find(([r]) => r === ref)[1](g);
    same = ref === last && (await snapshot()) === before ? same + 1 : 0;
    last = ref;
    if (same >= 6) {
      const st = await g.state();
      throw new Error(`${ref} never gets done (on ${st.map} at ${st.x},${st.y}, facing ${st.facing})`);
    }
  }
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

/** Walks onto a trigger: a tile inside it the captain isn't already on. */
async function stepOn(g, id) {
  const at = await g.eval((oid) => {
    const w = window.__GAME__.game.scene.getScene('World');
    const o = w.model.objects.find((x) => x.id === oid);
    for (let y = o.y; y < o.y + (o.h || 1); y++) {
      for (let x = o.x; x < o.x + (o.w || 1); x++) {
        if ((x !== w.player.tx || y !== w.player.ty) && !w.isBlocked(x, y, w.player) && !w.warpAt(x, y)) return [x, y];
      }
    }
    return null;
  }, id);
  await g.goto(at[0], at[1]);
  await play(g);
}

/** A knob panel: these knobs in order, then what follows. */
async function knobs14(g, id, list) {
  await touch(g, id);
  await untilTv(g);
  await g.tv(...list.map((k) => `knob:${k}`));
  await g.waitFor(() => !window.__GAME__.app.overlay.tvOpen, null, 20000);
  await play(g);
}

const FLUTTER = { shirt: ['talk', 'bob'], label: ['look', 'p14_fl_label'], napkin: ['look', 'p14_fl_napkin'], page: ['talk', 'garrick'], squawks: ['talk', 'squawks'], flag: ['look', 'p14_fl_flag'] };
const BARRICADE = { table: 'p14_bar_table', cask: 'p14_bar_cask', blankets: 'p14_bar_blankets', shield: 'p14_bar_shield' };
const SUPPLIES = { blankets: [Q, 'p14_ffz_blankets'], pillows: [Q, 'p14_ffz_pillows'], mattress: [H, 'p14_ffz_mattress'], sashes: [G, 'p14_ffz_sashes'], barrels: [H, 'p14_ffz_barrels'], rags: [Q, 'p14_ffz_rags'], hardtack: [H, 'p14_ffz_hardtack'], cards: [Q, 'p14_ffz_cards'], grog: [G, 'p14_ffz_grog'] };
const DISHES = { beans: 'p14_stove_dish', onions: 'p14_stove_dish', garlic: 'p14_garlic', cabbage: 'p14_cabbage', grog: 'p14_grog_dish', sauce: 'p14_sauce' };
const PROPOSALS = { storm: 'jim', burn: 'gristle', treasure: 'bob', confident: 'ned' };

const STEPS = [
  ['the_door_opens.below', async (g) => { await go14(g, H); await stepOn(g, 'p14_below'); }],
  ['the_door_opens.signs', async (g) => { await go14(g, H); await look(g, 'p14_signs'); }],
  ['the_door_opens.planks', async (g) => { await go14(g, H); await look(g, 'p14_planks'); }],
  ['the_door_opens.crack', async (g) => { await go14(g, H); await look(g, 'p14_crack'); }],
  ['follow_the_plume.galley', async (g) => { await go14(g, G); }],
  ['follow_the_plume.quarters', async (g) => { await go14(g, Q); }],
  ['return_of_brogath.speak', async (g) => { await go14(g, Q); await speak(g, 'brogath'); }],
  ['containment_corner.barricade', async (g) => {
    await go14(g, Q);
    const next = await firstMissing(g, Object.keys(BARRICADE), 'p14_bar_');
    await look(g, next === 'shield' && (await value(g, 'standee_rumpus')) === 'door' ? 'p14_bar_shield_door' : BARRICADE[next]);
  }],
  ['containment_corner.rules', async (g) => { await go14(g, Q); await look(g, 'p14_rules_first'); }],
  ['containment_corner.garrick', async (g) => { await go14(g, Q); await speak(g, 'garrick'); }],
  ['keep_brogath_confident.theory', async (g) => { await go14(g, Q); await speak(g, 'pete'); }],
  ['keep_brogath_confident.flutters', async (g) => {
    await go14(g, Q);
    const n = await value(g, 'p14_flutter_current');
    if (await has(g, `p14_fl_${n}_secured`)) return speak(g, 'brogath');
    const [how, what] = FLUTTER[n];
    return how === 'talk' ? speak(g, what) : look(g, what);
  }],
  ['keep_brogath_confident.rules', async (g) => { await go14(g, Q); await look(g, 'p14_rules_flutter'); }],
  ['apology_eruption.brace', async (g) => { await go14(g, Q); await look(g, 'p14_ae_brace'); }],
  ['apology_eruption.sashes', async (g) => { await go14(g, Q); await look(g, `p14_ae_sash_${await firstMissing(g, ['a', 'b', 'c'], 'p14_ae_sash_')}`); }],
  ['apology_eruption.objects', async (g) => { await go14(g, Q); await look(g, (await has(g, 'p14_ae_obj_set')) ? 'p14_ae_pack' : 'p14_ae_set'); }],
  ['apology_eruption.lantern', async (g) => { await go14(g, Q); await look(g, 'p14_ae_lantern'); }],
  ['apology_eruption.reach', async (g) => { await go14(g, Q); await speak(g, 'brogath'); }],
  ['back_in_office.tongs', async (g) => { await go14(g, G); await look(g, 'p14_tongs'); }],
  ['back_in_office.sash', async (g) => { await go14(g, C); await look(g, 'p14_wardrobe'); }],
  ['back_in_office.return', async (g) => { await go14(g, G); await speak(g, 'garrick'); }],
  ['back_in_office.decrees', async (g) => {
    await go14(g, G);
    const started = await has(g, 'p14_gs_started');
    if (started && (await has(g, 'p14_gs_secured')) && !(await has(g, 'p14_gs_done'))) await speak(g, 'brogath');
    else await speak(g, 'garrick');
  }],
  ['two_grand_stenchmasters.rounds', async (g) => { await go14(g, G); await speak(g, (await variable(g, 'p14_rounds')) % 2 ? 'brogath' : 'garrick'); }],
  ['beans_of_precedent.compliments', async (g) => { await go14(g, G); await speak(g, (await variable(g, 'p14_comp_turn')) ? 'brogath' : 'garrick'); }],
  ['beans_of_precedent.dishes', async (g) => { await go14(g, G); await look(g, DISHES[await firstMissing(g, Object.keys(DISHES), 'p14_dish_')]); }],
  ['beans_of_precedent.meeting', async (g) => { await go14(g, H); await look(g, 'p14_nook'); }],
  ['fart_free_zone.declare', async (g) => { await go14(g, Z); await speak(g, 'pete'); }],
  ['fart_free_zone.supplies', async (g) => {
    const [map, id] = SUPPLIES[await firstMissing(g, Object.keys(SUPPLIES), 'p14_ffz_')];
    await go14(g, map);
    await look(g, id);
  }],
  ['fart_free_zone.cards', async (g) => { await go14(g, Z); await look(g, 'p14z_cards'); }],
  ['getting_rid_of_brogath.proposals', async (g) => { await go14(g, Z); await speak(g, PROPOSALS[await firstMissing(g, Object.keys(PROPOSALS), 'p14_prop_')]); }],
  ['getting_rid_of_brogath.mission', async (g) => { await go14(g, Z); await speak(g, 'pete'); }],
  ['beyond_broke.read', async (g) => { await go14(g, Z); await look(g, 'p14z_read_psg'); }],
  ['beyond_broke.ingredients', async (g) => { await go14(g, Z); await look(g, 'p14z_slate_ingredients'); }],
  ['beyond_broke.sign', async (g) => { await go14(g, H); await look(g, 'p14_exclusion_sign'); }],
  ['grand_economy.read', async (g) => { await go14(g, Z); await look(g, 'p14z_read_econ'); }],
  ['grand_economy.sleep', async (g) => { await go14(g, Z); await look(g, 'p14z_sleep_econ'); }],
  ['bad_money.see', async (g) => { await go14(g, Q); await speak(g, 'brogath'); }],
  ['bad_money.purse', async (g) => { await go14(g, C); await look(g, 'p14_purse'); }],
  ['bad_money.crate', async (g) => { await go14(g, D); await look(g, 'p14_crate_deck'); }],
  ['bad_money.open', async (g) => { await go14(g, G); await look(g, 'p14_crate_open'); }],
  ['oat_security.job', async (g) => { await go14(g, Q); await speak(g, 'brogath'); }],
  ['oat_security.sacks', async (g) => { await go14(g, G); await look(g, (await has(g, 'p14_oat_sack_b')) ? 'p14_oat_sack_stores' : 'p14_oat_sack_flour'); }],
  ['oat_security.check', async (g) => { await go14(g, G); await look(g, 'p14_oat_post'); }],
  ['oat_security.sweep', async (g) => { await go14(g, G); await look(g, 'p14_oat_sweep'); }],
  ['television_duty.machinery', async (g) => { await go14(g, Q); await look(g, 'p14_tv_machinery'); }],
  ['television_duty.channel', async (g) => {
    await go14(g, Q);
    // The close-up: on, and round the dial to channel 7 (the Frog Tax Man), then step away.
    await touch(g, 'p14_tv_channel');
    await untilTv(g);
    if ((await variable(g, 'ses_mk2_power')) !== 1) await g.tv('power');
    for (let i = 0; i < 6 && (await variable(g, 'ses_mk2_channel')) !== 7; i++) await g.tv('next');
    expect(await variable(g, 'ses_mk2_channel')).toBe(7);
    await g.tv('leave');
    await play(g);
  }],
  ['television_duty.watch', async (g) => { await go14(g, Q); await speak(g, 'brogath'); }],
  ['sash_commercial.eyes', async (g) => { await go14(g, Q); await speak(g, 'brogath'); }],
  ['sash_commercial.channel', async (g) => { await go14(g, Q); await knobs14(g, 'p14_ad_channel', ['off', 'plug', 'valve', 'channel']); }],
  ['sash_commercial.sashes', async (g) => { await go14(g, Q); await look(g, `p14_ad_sash_${await firstMissing(g, ['a', 'b'], 'p14_ad_sash_')}`); }],
  ['sash_commercial.doors', async (g) => { await go14(g, Q); await look(g, `p14_ad_door_${await firstMissing(g, ['a', 'b'], 'p14_ad_door_')}`); }],
  ['sash_commercial.talk', async (g) => { await go14(g, Q); await speak(g, 'brogath'); }],
  ['the_grand_bank.questions', async (g) => { await go14(g, D); await speak(g, 'brogath'); }],
  ['the_grand_bank.badge', async (g) => { await go14(g, D); await speak(g, 'brogath'); }],
  ['teller_shift.serve', async (g) => { await go14(g, D); await look(g, 'p14_bank_bell'); }],
  ['legendary_depositors.serve', async (g) => { await go14(g, D); await look(g, 'p14_bank_bell'); }],
  ['branch_concludes.redeem', async (g) => { await go14(g, D); await look(g, 'p14_vault'); }],
  ['branch_concludes.ask', async (g) => { await go14(g, D); await speak(g, 'brogath'); }],
  ['branch_concludes.ornament', async (g) => { await go14(g, D); await speak(g, 'brogath'); }],
  ['distinguishedly_furious.console', async (g) => { await go14(g, Q); await speak(g, 'brogath'); }],
  ['brogath_problem.research', async (g) => { await go14(g, Z); await look(g, 'p14z_research'); }],
  ['brogath_problem.sums', async (g) => { await go14(g, Z); await look(g, 'p14z_slate_sums'); }],
  ['brogath_problem.tell', async (g) => { await go14(g, Q); await speak(g, 'brogath'); }],
  ['history_night.sleep', async (g) => { await go14(g, Z); await look(g, 'p14z_sleep_night'); }],
  ['history_night.investigate', async (g) => { await go14(g, G); await look(g, 'p14_mk2_found'); }],
  ['history_night.unplug', async (g) => { await go14(g, G); await knobs14(g, 'p14_mk2_unplug', ['off', 'plug', 'ch3', 'master']); }],
  ['history_night.watch', async (g) => { await go14(g, G); await speak(g, 'brogath'); }],
  ['history_night.ads', async (g) => {
    await go14(g, G);
    if (!(await has(g, 'p14_nj_eyes'))) await speak(g, 'brogath');
    else if (!(await has(g, 'p14_nj_sash'))) await look(g, 'p14_nj_sash');
    else await look(g, 'p14_mk2_channel');
  }],
  ['history_night.license', async (g) => { await go14(g, G); await speak(g, 'brogath'); }],
];

const done = (g) => has(g, 'p14_complete');
const autoTiming = (g) => g.eval(() => { window.__GAME__.app.flags.autoTiming = 0; });

async function expectCanonicalEnd(g) {
  expect(await has(g, 'p14_complete')).toBe(true);
  expect(await has(g, 'brogath_permanent')).toBe(true);
  expect(await has(g, 'fart_free_zone_established')).toBe(true);
  expect(await has(g, 'grand_bank_open')).toBe(false);
  expect(await has(g, 'grand_bank_dissolved')).toBe(true);
  expect(await variable(g, 'grand_currency_gold_paid')).toBe(10);
  expect(await variable(g, 'grand_currency_tokens')).toBe(20000);
  expect(await has(g, 'brogath_angry')).toBe(false);
  expect(await value(g, 'queen_annes_revenge_location')).toBe('inside_great_sharkstorm');
  expect(await has(g, 'treasure_room_sealed')).toBe(true);
}

test('Story Phase 14 plays from the treasure-room door to "He lives here now"', { tag: ['@phase14', '@story'] }, async ({ page }) => {
  test.setTimeout(150 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p13_complete');
  await play(g);
  await autoTiming(g);
  const gold = (await g.state()).gold;
  await go14(g, D);
  expect(await has(g, 'p14_started')).toBe(false); // Phase 14 waits for the captain
  await speak(g, 'pete');
  expect(await has(g, 'p14_started')).toBe(true);
  const rooms = new Set();
  await walk14(g, STEPS.map(([r, f]) => [r, async (x) => { await f(x); rooms.add(await onMap(x)); }]), 'Phase 14');
  await expectCanonicalEnd(g);
  expect((await g.state()).gold).toBe(gold - 10);
  expect(rooms.has('treasure_hold')).toBe(false);
  expect(errors).toEqual([]);
});

test('Phase 14 from the Grand Bank to the end plays from its preset', { tag: ['@phase14', '@story'] }, async ({ page }) => {
  test.setTimeout(75 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p14_grand_bank');
  await autoTiming(g);
  await play(g);
  await walk14(g, STEPS, 'Phase 14');
  await expectCanonicalEnd(g);
  expect(errors).toEqual([]);
});

test('the BASHFULNESS meter: hidden when he is calm, shown with his state when it matters, WRATH when angry', { tag: ['@phase14', '@ui', '@smoke'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p14_flutter_lessons');
  await play(g);
  expect(await onMap(g)).toBe(Q);
  const meter = () => g.eval(() => {
    const m = window.__GAME__.app.overlay.stabilityMeter;
    return m && !m.hiding ? { label: m.label.text, word: m.word.text } : null;
  });
  const setP = (p) => g.eval((v) => window.__GAME__.app.session.story.setVar('brogath_pressure', v), p);
  await setP(5);
  await g.wait(600);
  expect(await meter()).toBe(null);
  await setP(50);
  await g.waitFor(() => !!window.__GAME__.app.overlay.stabilityMeter, null, 5000);
  expect(await meter()).toMatchObject({ label: 'BASHFULNESS' });
  expect((await meter()).word).toContain('EMBARRASSED');
  await g.eval(() => window.__GAME__.app.session.story.set('brogath_angry'));
  await g.wait(300);
  expect(await meter()).toMatchObject({ label: 'WRATH' });
  await g.eval(() => window.__GAME__.app.session.story.clear('brogath_angry'));
  await setP(5);
  await g.wait(800);
  expect(await meter()).toBe(null);
  expect(errors).toEqual([]);
});

test('the teller\'s window: ring the bell, a depositor comes, the deposit is banked and the queue moves on', { tag: ['@phase14', '@ui', '@smoke'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p14_teller_shift');
  await autoTiming(g);
  await play(g);
  expect(await onMap(g)).toBe(D);
  expect(await has(g, 'grand_bank_open')).toBe(true);
  const before = await variable(g, 'bank_served');
  await touch(g, 'p14_bank_bell');
  await g.waitFor(() => !!window.__GAME__.app.overlay.tellerOpen, null, 30000).catch(() => {});
  await play(g);
  expect(await variable(g, 'bank_served')).toBe(before + 1);
  expect(await variable(g, 'bank_last_grade')).toBe(2);
  expect(errors).toEqual([]);
});

test('the Grand Bank survives a save and Continue; Brogath is never in the hold', { tag: ['@phase14', '@saves', '@smoke'] }, async ({ page }) => {
  test.setTimeout(12 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p14_teller_shift');
  await play(g);
  const shown = () => g.eval(() => window.__GAME__.game.scene.getScene('World').props.filter((p) => p.visible && String(p.id ?? '').startsWith('p14_bank_')).map((p) => p.id).sort());
  const before = await shown();
  expect(before.length).toBeGreaterThanOrEqual(5);
  await g.eval(() => window.__GAME__.game.scene.getScene('World').autosave());
  await page.reload();
  await g.waitFor(() => !!window.__GAME__?.app);
  await g.titleChoose('continue');
  await play(g);
  expect(await onMap(g)).toBe(D);
  expect(await has(g, 'grand_bank_open')).toBe(true);
  expect(await shown()).toEqual(before);
  await go14(g, H);
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').actors.has('brogath'))).toBe(false);
  expect(errors).toEqual([]);
});

test('every Phase 14 preset loads and its scene plays without errors', { tag: ['@phase14', '@scenes'] }, async ({ page }) => {
  test.setTimeout(75 * 60 * 1000);
  const { g, errors } = await open(page);
  await autoTiming(g);
  await everyPreset(g, errors, 'p14_', 25);
});
