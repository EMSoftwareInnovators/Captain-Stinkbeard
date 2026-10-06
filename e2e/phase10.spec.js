import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Story Phase 10 (the Bling Bling King's participation prize; the night in
 * the galley; Brogath and Rumpold, alleged; the Counter-Sharkstorm
 * Initiative; the Grand Feast; the cowardice crisis; the wrong-way blast;
 * inside the Great Sharkstorm) in a real browser with real key presses: from
 * the crater at the end of Phase 9, down the trail, home in the boats, the
 * deck, the galley and the hold, through the approach and into the storm, to
 * INSIDE THE GREAT SHARKSTORM (left open).
 *
 * The route is the headless one (tests/phase10Play.js): each turn, the first
 * open objective the player can act on, done the way a player would. Choices
 * take the first option unless a step says otherwise.
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
const has = async (g, flag) => flagsOf(await g.state()).has(flag);

/** Between the hold and the deck, by way of the galley. */
const ROUTE = { cargo_hold: { main_deck: 'galley' }, main_deck: { cargo_hold: 'galley' } };

async function go(g, map) {
  for (let hop = 0; hop < 4; hop++) {
    const here = await onMap(g);
    if (here === map) return;
    const next = ROUTE[here]?.[map] ?? map;
    const warp = await g.eval((to) => {
      const w = window.__GAME__.game.scene.getScene('World');
      const o = w.model.objects.find((x) => x.type === 'warp' && x.to?.map === to);
      return o && [o.x, o.y];
    }, next);
    if (!warp) throw new Error(`no way from ${here} to ${next}`);
    await g.travel(warp[0], warp[1], next);
    await g.skip();
  }
  throw new Error(`never reached ${map}`);
}

/** Where to stand to look at a map object (by id): the nearest open tile just outside it, and which way to face. */
async function standFor(g, id) {
  for (let tries = 0; tries < 20; tries++) {
    const at = await g.eval((oid) => {
      const w = window.__GAME__.game.scene.getScene('World');
      const o = w.model.objects.find((x) => x.id === oid);
      if (!o) return null;
      const inside = (x, y) => x >= o.x && x < o.x + (o.w || 1) && y >= o.y && y < o.y + (o.h || 1);
      const p = w.player;
      let best = null;
      for (let y = o.y; y < o.y + (o.h || 1); y++) {
        for (let x = o.x; x < o.x + (o.w || 1); x++) {
          for (const [face, dx, dy] of [['up', 0, 1], ['down', 0, -1], ['left', 1, 0], ['right', -1, 0]]) {
            const sx = x + dx;
            const sy = y + dy;
            if (inside(sx, sy) || w.warpAt(sx, sy)) continue;
            const here = p.tx === sx && p.ty === sy;
            if (!here && w.isBlocked(sx, sy, p)) continue;
            const path = here ? [] : window.__GAME__.test.pathTo(sx, sy);
            if (path && (!best || path.length < best.n)) best = { stand: [sx, sy], face, n: path.length };
          }
        }
      }
      return best;
    }, id);
    if (at) return at;
    await g.wait(300);
  }
  throw new Error(`nowhere to stand for ${id} on ${await onMap(g)}`);
}

async function inspect(g, id, ...picks) {
  const { stand, face } = await standFor(g, id);
  await g.goto(stand[0], stand[1]);
  await g.eval((dir) => window.__GAME__.game.scene.getScene('World').player.face(dir), face);
  await g.wait(60);
  await g.tap('KeyZ', 50, 250);
  await g.skip(...picks);
}

/** Steps onto a tile (a trigger, a stretch of trail) and lets whatever it starts play out. */
async function stepOn(g, x, y) {
  await g.goto(x, y);
  await g.skip();
}

/** Walks into a named place on the island: the nearest open tile of it. */
async function visit(g, region) {
  const at = await g.eval((rid) => {
    const w = window.__GAME__.game.scene.getScene('World');
    const r = w.model.meta.regions.find((x) => x.id === rid);
    let best = null;
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (w.isBlocked(x, y, w.player) || w.warpAt(x, y)) continue;
        const path = window.__GAME__.test.pathTo(x, y);
        if (path && (!best || path.length < best.n)) best = { x, y, n: path.length };
      }
    }
    return best && [best.x, best.y];
  }, region);
  if (!at) throw new Error(`no way into ${region}`);
  await stepOn(g, at[0], at[1]);
}

/** Opens something and plays its lines until the television close-up is up (skip would step away from it). */
async function untilTv(g) {
  for (let i = 0; i < 200; i++) {
    const st = await g.uiState();
    if (st === 'tv') return;
    if (st === 'line' || st === 'tutorial' || st === 'insert') await g.tap('KeyZ', 45, 60);
    await g.wait(100);
  }
  throw new Error('the television never opened');
}

/** The aerial: three tries at bending it back, then the can of sauce turns up (the close-up shuts itself). */
async function aerial(g) {
  const { stand, face } = await standFor(g, 'p10_tv_antenna');
  await g.goto(stand[0], stand[1]);
  await g.eval((dir) => window.__GAME__.game.scene.getScene('World').player.face(dir), face);
  await g.wait(60);
  await g.tap('KeyZ', 50, 250);
  await untilTv(g);
  await g.tv('knob:bend', 'knob:fork', 'knob:wire', 'knob:sauce');
  await g.waitFor(() => !window.__GAME__.app.overlay.tvOpen, null, 15000);
  await g.skip();
}

const firstMissing = async (g, ids, prefix) => {
  const flags = flagsOf(await g.state());
  return ids.find((id) => !flags.has(`${prefix}${id}`));
};

const I = 'crownskull_isle';
const D = 'main_deck';
const G = 'galley';
const H = 'cargo_hold';

const STEPS = [
  ['saddest_salvage.first', async (g) => { await inspect(g, `p10_salv_${await firstMissing(g, ['1', '2', '3', '4'], 'p10_salv_')}`); }],
  ['saddest_salvage.appraisal', async (g) => { await g.interact('garrick'); }],
  ['saddest_salvage.rest', async (g) => { await inspect(g, `p10_salv_${await firstMissing(g, ['5', '6', '7', '8'], 'p10_salv_')}`); }],
  ['saddest_salvage.tally', async (g) => { await g.interact('gristle'); }],
  ['wealthy_sharks.down', async (g) => {
    // Down the trail, over the statue, past the broken tooth and through the ford.
    await stepOn(g, 29, 31);
    await stepOn(g, 29, 36);
    await stepOn(g, 28, 43);
    await visit(g, 'isle_trail');
  }],
  ['wealthy_sharks.tiara', async (g) => { await stepOn(g, 29, 51); }],
  ['wealthy_sharks.boats', async (g) => { await inspect(g, 'p10_boats', 0); }], // "Row back to the Revenge"
  ['participation_prize.coin', async (g) => { await go(g, D); await inspect(g, 'p10_coin'); }],
  ['treasure_feast.pantry', async (g) => { await go(g, H); await g.interact('jim'); }],
  ['treasure_feast.casks', async (g) => { await go(g, H); await inspect(g, 'p10_casks_a'); }],
  ['treasure_feast.galley', async (g) => { await go(g, G); }],
  ['grand_galley.beans', async (g) => { await go(g, G); await inspect(g, 'p10_prep_beans'); }],
  ['grand_galley.pot', async (g) => { await go(g, G); await inspect(g, 'p10_stove_pot'); }],
  ['grand_galley.sauce', async (g) => { await go(g, G); await inspect(g, 'p10_table_sauce'); }],
  ['grand_galley.stop', async (g) => { await go(g, G); await inspect(g, 'p10_stove_stop'); }],
  ['shark_catering.sweep', async (g) => { await go(g, D); await inspect(g, `p10_heap_${await firstMissing(g, ['1', '2', '3'], 'p10_swept_')}`); }],
  ['release_moved_in.hold', async (g) => { await go(g, H); }],
  ['release_moved_in.where', async (g) => { await go(g, H); await g.interact('gristle'); }],
  ['release_moved_in.test', async (g) => { await go(g, G); await inspect(g, 'p10_quarters_test'); }],
  ['shark_suites.look', async (g) => { await go(g, D); await g.interact('ned'); }],
  ['shark_suites.pillows', async (g) => { await go(g, D); await inspect(g, `p10_pillow_${await firstMissing(g, ['1', '2'], 'p10_pillow_')}`); }],
  ['bad_hotel.sacks', async (g) => { await go(g, G); await inspect(g, 'p10_sacks'); }],
  ['bad_hotel.squawks', async (g) => { await go(g, G); await inspect(g, 'p10_basket'); }],
  ['bad_hotel.bunk', async (g) => { await go(g, G); await inspect(g, 'p10_bunk'); }],
  ['bedtime_television.tv', async (g) => { await go(g, G); await inspect(g, 'p10_tv_bedtime'); }],
  ['bedtime_television.lamp', async (g) => { await go(g, G); await inspect(g, 'p10_lamp', 0); }],
  ['brogath_the_bashful.story', async (g) => { await go(g, G); await inspect(g, 'p10_hammock_brogath'); }],
  ['sweet_dreams.tokens', async (g) => { await go(g, G); await inspect(g, `p10_btok_${await firstMissing(g, ['1', '2', '3'], 'p10_btok_')}`); }],
  ['sweet_dreams.deck', async (g) => { await go(g, D); await stepOn(g, 12, 4); }],
  ['meet_wind_with_wind.rumpold', async (g) => { await go(g, G); await inspect(g, 'p10_hammock_rumpold'); }],
  ['fart_man.trophy', async (g) => { await go(g, G); await inspect(g, 'p10_trophy'); }],
  ['fart_literature.book', async (g) => { await go(g, G); await inspect(g, 'p10_hammock_book'); }],
  ['fart_literature.research', async (g) => { await go(g, G); await inspect(g, 'p10_read', 0); }],
  ['fart_literature.notes', async (g) => { await go(g, G); await inspect(g, 'p10_notes'); }],
  ['counter_sharkstorm.muster', async (g) => { await go(g, D); await inspect(g, 'p10_board_brief'); }],
  ['counter_sharkstorm.alternatives', async (g) => { await go(g, D); await g.interact(await firstMissing(g, ['ned', 'bob', 'jim', 'gristle', 'hale', 'pete'], 'p10_alt_')); }],
  ['counter_sharkstorm.decide', async (g) => { await go(g, D); await inspect(g, 'p10_board_decide'); }],
  ['sash_holders.condition', async (g) => { await go(g, D); await g.interact('garrick'); }],
  ['sash_holders.volunteers', async (g) => { await go(g, D); await g.interact('pete'); }],
  ['sash_holders.lots', async (g) => { await go(g, D); await inspect(g, 'p10_board_lots'); }],
  ['grand_feast.crying', async (g) => { await go(g, G); await inspect(g, 'p10_feast_crying'); }],
  ['grand_feast.baked', async (g) => { await go(g, G); await inspect(g, 'p10_feast_baked', 0); }],
  ['grand_feast.burnt', async (g) => { await go(g, G); await inspect(g, 'p10_feast_burnt'); }],
  ['grand_feast.smoothie', async (g) => { await go(g, G); await inspect(g, 'p10_feast_blender'); }],
  ['grand_feast.sauce', async (g) => { await go(g, H); await inspect(g, 'p10_vats_feast'); }],
  ['grand_feast.plate', async (g) => { await go(g, G); await inspect(g, 'p10_feast_plate'); }],
  ['grand_feast.serve', async (g) => { await go(g, G); await g.interact('garrick'); }],
  ['the_approach.sails', async (g) => { await go(g, D); await inspect(g, (await has(g, 'p10_sail_port')) ? 'p10_sheet_star' : 'p10_sheet_port'); }],
  ['the_approach.cargo', async (g) => { await go(g, D); await inspect(g, 'p10_cargo'); }],
  ['the_approach.ropes', async (g) => { await go(g, D); await inspect(g, 'p10_ropes'); }],
  ['the_approach.helm', async (g) => { await go(g, D); await inspect(g, 'p10_helm_approach'); }],
  ['the_approach.galley', async (g) => { await go(g, G); await inspect(g, 'p10_secure_galley'); }],
  ['the_approach.holders', async (g) => { await go(g, D); await g.interact('rusty_tom'); }],
  ['the_approach.report', async (g) => { await go(g, D); await g.interact('pete'); }],
  ['the_one_time.position', async (g) => { await go(g, D); await g.interact('garrick'); }],
  ['the_one_time.persuade', async (g) => { await go(g, D); await g.interact('garrick'); }],
  ['wrong_way.align', async (g) => { await go(g, D); await inspect(g, 'p10_helm_align'); }],
  ['wrong_way.rail', async (g) => { await inspect(g, 'p10_rail_port'); }],
  ['wrong_way.squawks', async (g) => { await g.interact('squawks'); }],
  ['wrong_way.below', async (g) => { await g.travel(9, 24, G); await g.skip(); }],
  ['inside_the_spout.antenna', async (g) => { await aerial(g); }],
  ['the_impossible_audit.watch', async (g) => { await inspect(g, 'p10_tv_audit'); }],
  ['blackbeard.breathe', async (g) => { await inspect(g, 'p10_breathe'); }],
];

async function playToEnd(g) {
  let last = null;
  let repeats = 0;
  for (let n = 0; n < 300 && !(await has(g, 'p10_complete')); n++) {
    // Chapter 84 waits for the captain to come back down to the galley after his word with the storm.
    if ((await has(g, 'p10_storm_confronted')) && !(await has(g, 'p10_ch84_started'))) {
      await go(g, G);
      continue;
    }
    const ref = await g.eval((list) => list.find((r) => {
      const [q, o] = r.split('.');
      return window.__GAME__.app.session.quests.isObjectiveAvailable(q, o);
    }), STEPS.map(([r]) => r));
    if (!ref) throw new Error(`stuck on ${await onMap(g)}: no open Phase 10 objective the player can act on`);
    repeats = ref === last ? repeats + 1 : 0;
    last = ref;
    if (repeats >= 12) {
      const st = await g.state();
      throw new Error(`${ref} never gets done (on ${st.map} at ${st.x},${st.y}, facing ${st.facing})`);
    }
    await STEPS.find(([r]) => r === ref)[1](g);
  }
}

async function expectCanonicalEnd(g) {
  expect(await has(g, 'p10_complete')).toBe(true);
  expect(await value(g, 'queen_annes_revenge_location')).toBe('inside_great_sharkstorm');
  expect(await value(g, 'great_sharkstorm')).toBe('inside_ship');
  expect(await value(g, 'megalodon_alias')).toBe('Bling Bling King');
  expect(await value(g, 'crimson_crown_holder')).toBe('megalodon');
  expect(await value(g, 'ses_mark2_antenna')).toBe('spicy_stench_sauce_can');
  expect(await value(g, 'brogath_status')).toBe('alleged');
  expect((await g.state()).quests.inside_great_sharkstorm?.status).toBe('active');
}

test('Story Phase 10 plays from the end of Phase 9 to inside the Great Sharkstorm', { tag: ['@phase10', '@story'] }, async ({ page }) => {
  test.setTimeout(90 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p9_complete');
  await g.skip();
  expect(await has(g, 'p10_ready_hint')).toBe(true);
  expect(await has(g, 'p10_started')).toBe(false); // Phase 10 waits for Pete
  await g.interact('pete');
  expect(await has(g, 'p10_started')).toBe(true);
  await playToEnd(g);
  await expectCanonicalEnd(g);
  expect(await g.eval(() => window.__GAME__.app.session.party.leader().hp)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('Phase 10 from the approach to the end plays from its preset', { tag: ['@phase10', '@story'] }, async ({ page }) => {
  test.setTimeout(40 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p10_approach');
  await g.skip();
  expect(await onMap(g)).toBe(D);
  await playToEnd(g);
  await expectCanonicalEnd(g);
  expect(errors).toEqual([]);
});

test('the wrong way: the hatch stays shut until Squawks is safe, then everyone falls into the galley inside the storm', { tag: ['@phase10', '@scenes', '@smoke'] }, async ({ page }) => {
  test.setTimeout(12 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p10_entry');
  await g.skip();
  // The hatch first: it says to hold on, and stays shut.
  await g.goto(9, 23).catch(() => {});
  await g.tap('ArrowDown', 60, 400);
  await g.skip();
  expect(await onMap(g)).toBe(D);
  await inspect(g, 'p10_rail_port');
  await g.interact('squawks');
  expect(await has(g, 'p10_entry_squawks')).toBe(true);
  await g.travel(9, 24, G);
  await g.skip();
  expect(await has(g, 'p10_ch93_started')).toBe(true);
  expect(await value(g, 'queen_annes_revenge_location')).toBe('inside_great_sharkstorm');
  expect(errors).toEqual([]);
});

test('the aerial: bending it back gets glimpses, then the sauce can works', { tag: ['@phase10', '@ui', '@smoke'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p10_sauce_antenna');
  await g.skip();
  await aerial(g);
  expect(await has(g, 'p10_antenna_fixed')).toBe(true);
  expect(await value(g, 'ses_mark2_antenna')).toBe('spicy_stench_sauce_can');
  expect(errors).toEqual([]);
});

test('inside the storm: the deck shows the storm\'s wall, the rooms drift a little and never with shake off', { tag: ['@phase10', '@world'] }, async ({ page }) => {
  test.setTimeout(8 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p10_complete');
  await g.skip();
  await go(g, D);
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').background)).toBe('stormsky');
  await go(g, G);
  const drift = await g.eval(() => window.__GAME__.game.scene.getScene('World').sharkstorm?.swayOffset?.(16) ?? null);
  expect(drift === null || (Math.abs(drift.x) <= 3 && Math.abs(drift.y) <= 3)).toBe(true);
  expect(errors).toEqual([]);
});

test('every Phase 10 preset loads and its scene plays without errors', { tag: ['@phase10', '@scenes'] }, async ({ page }) => {
  test.setTimeout(60 * 60 * 1000);
  const { g, errors } = await open(page);
  const ids = await g.eval(() => window.__GAME__.app.content.debugPresets.list().map((p) => p.id).filter((id) => id.startsWith('p10_')));
  expect(ids.length).toBe(45);
  for (const id of ids) {
    await g.preset(id);
    await g.skip(0, 0, 0, 0);
    expect(errors, id).toEqual([]);
  }
});
