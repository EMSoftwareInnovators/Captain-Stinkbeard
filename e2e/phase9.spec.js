import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Story Phase 9 (the "Completely Authentic" history; the Grand Sharkmaster;
 * Crownskull Isle; the Grand Treasure Catastrophe) in a real browser with
 * real key presses: from the captain's bunk at the end of Phase 8, through
 * the hold and the deck, rowing the reef passage, walking the island, the
 * seven floors (the right tool each time, struck on the green), the launch
 * sequence, the blast, the storm, the crown, the shanty, to RECOVER THE
 * CRIMSON FORTUNE (left open).
 *
 * The route is the headless one (tests/phase9_story.test.js): each turn, the
 * first open objective the player can act on, done the way a player would.
 * Topic menus take the first open topic; other choices are cancelled, which
 * takes the last option.
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
const dig = (g) => g.eval(() => window.__GAME__.app.session.story.getVar('dig_layer'));

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

const DIR_KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

/**
 * Where to stand to look at a map object (by id): the nearest open tile just
 * outside it, and which way to face. Some are floor you can walk on (the X
 * before anyone digs), so "next to it" has to mean outside it.
 */
async function standFor(g, id) {
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
  if (!at) throw new Error(`nowhere to stand for ${id} on ${await onMap(g)}`);
  return at;
}

async function inspect(g, id, ...picks) {
  const { stand, face } = await standFor(g, id);
  await g.goto(stand[0], stand[1]);
  await g.tap(DIR_KEYS[face], 40, 150);
  await g.tap('KeyZ', 50, 250);
  await g.skip(...picks);
}

/** Walks into a named place on the island: the nearest open tile of it. */
async function visit(g, region) {
  const at = await g.eval((rid) => {
    const w = window.__GAME__.game.scene.getScene('World');
    const r = w.model.meta.regions.find((x) => x.id === rid);
    let best = null;
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        // The path finder doesn't test the goal itself: skip walls and furniture.
        if (w.isBlocked(x, y, w.player) || w.warpAt(x, y)) continue;
        const path = window.__GAME__.test.pathTo(x, y);
        if (path && (!best || path.length < best.n)) best = { x, y, n: path.length };
      }
    }
    return best && [best.x, best.y];
  }, region);
  if (!at) throw new Error(`no way into ${region}`);
  await g.goto(at[0], at[1]);
  await g.skip();
}

/** A question menu: the first topic still open. */
const FIRST = 0;
/** The right tool for each floor (shovel, pick, crowbar). */
const RIGHT_TOOL = [0, 1, 1, 1, 0, 1, 2];
const H = 'cargo_hold';
const D = 'main_deck';
const I = 'crownskull_isle';

const firstMissing = async (g, ids, prefix) => {
  const flags = flagsOf(await g.state());
  return ids.find((id) => !flags.has(`${prefix}${id}`));
};

const STEPS = [
  ['morning_after.crew', async (g) => { await go(g, H); await g.interact(await firstMissing(g, ['pete', 'bob', 'gristle', 'jim'], 'p9_morning_')); }],
  ['morning_after.wake', async (g) => { await go(g, H); await inspect(g, 'p9_wake'); }],
  ['morning_after.talk', async (g) => { await go(g, H); await g.interact('garrick'); }],
  ...['sacred', 'first', 'treasures', 'masters', 'trap'].map((o) => [`completely_authentic.${o}`, async (g) => { await go(g, H); await g.interact('garrick', FIRST); }]),
  ['no_receipt.witnesses', async (g) => { await go(g, H); await g.interact(await firstMissing(g, ['pete', 'gristle', 'bob', 'squawks'], 'p9_witness_')); }],
  ['no_receipt.verdict', async (g) => { await go(g, H); await g.interact('garrick'); }],
  ['no_receipt.hat', async (g) => { await go(g, H); await inspect(g, 'p9_trunk'); }],
  ['sash_bureaucracy.assistant', async (g) => { await go(g, H); await g.interact('bob'); }],
  ['sash_bureaucracy.chart', async (g) => { await go(g, H); await inspect(g, 'p9_chart'); }],
  ['sash_bureaucracy.herald', async (g) => { await go(g, H); await g.interact('squawks'); }],
  ['sash_bureaucracy.plain', async (g) => { await go(g, H); await g.interact('garrick'); }],
  ['land_ho.look', async (g) => { await go(g, H); await inspect(g, 'p9_gap_look'); }],
  ['land_ho.map', async (g) => { await go(g, H); await inspect(g, 'p9_gap_map'); }],
  ['landing_problem.council', async (g) => { await go(g, H); await inspect(g, 'p9_council'); }],
  ['landing_problem.options', async (g) => { await go(g, H); await inspect(g, 'p9_options', FIRST); }],
  ['grand_sharkmaster.sash', async (g) => { await go(g, H); await g.interact('pete'); }],
  ['grand_sharkmaster.plan', async (g) => { await go(g, H); await g.interact('pete'); }],
  ['grand_sharkmaster.tv', async (g) => { await go(g, H); await inspect(g, 'p9_tv'); }],
  ['grand_sharkmaster.petes_plan', async (g) => { await go(g, H); await g.interact('pete'); }],
  ['lee_side_landing.helm', async (g) => { await go(g, D); await inspect(g, 'p9_helm', 0); }],
  ['lee_side_landing.lines', async (g) => { await go(g, D); await inspect(g, 'p9_lines'); }],
  ['lee_side_landing.decoy', async (g) => { await go(g, D); await inspect(g, 'p9_decoy'); }],
  ['lee_side_landing.window', async (g) => { await go(g, D); await g.interact('pete', 0, 0, 0); }], // "Now!" on a thin sea
  ['lee_side_landing.lure', async (g) => { await go(g, D); await inspect(g, 'p9_lure'); }],
  ['lee_side_landing.boats', async (g) => {
    if ((await onMap(g)) === 'reef_passage') await rowAshore(g);
    else { await go(g, D); await inspect(g, 'p9_boats'); }
  }],
  ['crownskull_isle.trail', async (g) => { await visit(g, 'isle_trail'); }],
  ['crownskull_isle.ford', async (g) => { await visit(g, 'isle_ford'); }],
  ['crownskull_isle.tooth', async (g) => { await visit(g, 'isle_fork'); }],
  ['crownskull_isle.statue', async (g) => { await visit(g, 'isle_statue'); }],
  ['crownskull_isle.x', async (g) => { await visit(g, 'isle_clearing'); }],
  ['crimson_fortune.vines', async (g) => { await inspect(g, 'p9_vines'); }],
  ['crimson_fortune.dreams', async (g) => { await g.interact(await firstMissing(g, ['pete', 'bob', 'jim', 'gristle', 'ned'], 'p9_dream_')); }],
  ['seven_floors.tools', async (g) => { await inspect(g, 'p9_tools_get'); }],
  ['seven_floors.first', async (g) => { await inspect(g, 'p9_dig', RIGHT_TOOL[await dig(g)]); }],
  ['seven_floors.garrick', async (g) => { await g.interact('garrick'); }],
  ['seven_floors.deeper', async (g) => { await inspect(g, 'p9_dig', RIGHT_TOOL[await dig(g)]); }],
  ['excavation_technology.proposal', async (g) => { await g.interact('garrick'); }],
  ['excavation_technology.listen', async (g) => { await g.interact('garrick'); }],
  ['run.west', async (g) => { await visit(g, 'isle_west_beach'); }],
  ['run.ruins', async (g) => { await visit(g, 'isle_ruins'); }],
  ...['stone', 'brace', 'beam', 'cloth', 'squawks', 'watch'].map((o) => [`run.${o}`, async (g) => { await inspect(g, `p9_job_${o}`); }]),
  ['fire_in_the_hole.survive', async (g) => { await g.interact('squawks'); }],
  ['vertical_relocation.crater', async (g) => { await inspect(g, 'p9_crater'); }],
  ['vertical_relocation.megalodon', async (g) => { await inspect(g, 'p9_megalodon'); }],
];

/** The reef passage: row up the zigzag to the beach (a wave now and then pushes the boat back). */
async function rowAshore(g) {
  for (let tries = 0; tries < 6 && (await onMap(g)) === 'reef_passage'; tries++) {
    await g.goto(10, 3).catch(() => {});
    await g.skip();
  }
  expect(await onMap(g)).toBe(I);
}

async function playToEnd(g) {
  const has = async (flag) => flagsOf(await g.state()).has(flag);
  for (let n = 0; n < 220 && !(await has('p9_complete')); n++) {
    // Chapter 70 has no objective of its own until the end: a word with Garrick.
    if ((await has('rage_shanty_seen')) && !(await has('p9_confronted'))) {
      await g.interact('garrick');
      continue;
    }
    const refs = STEPS.map(([ref]) => ref);
    const ref = await g.eval((list) => list.find((r) => {
      const [q, o] = r.split('.');
      return window.__GAME__.app.session.quests.isObjectiveAvailable(q, o);
    }), refs);
    if (!ref) throw new Error(`stuck on ${await onMap(g)}: no open Phase 9 objective the player can act on`);
    await STEPS.find(([r]) => r === ref)[1](g);
  }
}

test('Story Phase 9 plays from the end of Phase 8 to the Crimson Fortune scattered', { tag: ['@phase9', '@story'] }, async ({ page }) => {
  test.setTimeout(75 * 60 * 1000);
  const { g, errors } = await open(page);
  const has = async (flag) => flagsOf(await g.state()).has(flag);
  await g.preset('p8_complete');
  await g.skip();
  expect(await has('p9_ready_hint')).toBe(true);
  expect(await has('p9_started')).toBe(false); // Phase 9 waits for the bunk
  await inspect(g, 'p9_start', 0); // "Lie down and try to sleep till morning"
  await g.skip();
  expect(await has('p9_started')).toBe(true);
  await playToEnd(g);
  expect(await has('p9_complete')).toBe(true);
  expect(await has('pete_mock_title_grand_sharkmaster')).toBe(true);
  expect(await has('megalodon_crowned')).toBe(true);
  expect(await has('crater_treasure_contaminated')).toBe(true);
  expect(await value(g, 'megalodon_state')).toBe('stranded_crownskull');
  expect(await value(g, 'crimson_crown_holder')).toBe('megalodon');
  expect(await value(g, 'crimson_fortune_state')).toBe('scattered_into_sharkstorm');
  expect(await value(g, 'great_sharkstorm')).toBe('treasure_laden');
  expect((await g.state()).quests.recover_crimson_fortune?.status).toBe('active');
  expect(await g.eval(() => window.__GAME__.app.session.party.leader().hp)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('Phase 9 from the landing to the end plays from its preset', { tag: ['@phase9', '@story'] }, async ({ page }) => {
  test.setTimeout(40 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p9_crownskull_landing');
  await g.skip();
  expect(await onMap(g)).toBe('reef_passage');
  await playToEnd(g);
  expect(flagsOf(await g.state()).has('p9_complete')).toBe(true);
  expect(errors).toEqual([]);
});

test('the reef passage: row the zigzag to the beach, in the boat', { tag: ['@phase9', '@scenes', '@smoke'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p9_crownskull_landing');
  await g.skip();
  expect(await g.eval(() => !!window.__GAME__.game.scene.getScene('World').player.vehicle?.front)).toBe(true);
  await rowAshore(g);
  expect(flagsOf(await g.state()).has('p9_landed')).toBe(true);
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').player.vehicle)).toBe(null);
  expect(errors).toEqual([]);
});

test('the seven floors: the wrong tool only costs a line; the right one, struck on the green', { tag: ['@phase9', '@scenes'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p9_digging_start');
  await g.skip();
  await inspect(g, 'p9_dig', 1); // the pick, in sand
  expect(await dig(g)).toBe(0);
  await inspect(g, 'p9_dig', 0); // the shovel
  expect(await dig(g)).toBe(1);
  expect(await g.eval(() => window.__GAME__.app.overlay.repairOpen)).toBe(null);
  expect(errors).toEqual([]);
});

test('after Phase 9: the ship and the island, both ways, and the fortune still out there', { tag: ['@phase9', '@world'] }, async ({ page }) => {
  test.setTimeout(8 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p9_complete');
  await g.skip();
  expect(await onMap(g)).toBe(I);
  await inspect(g, 'p9_boats', 0); // "Row back to the Revenge"
  await g.skip();
  expect(await onMap(g)).toBe(D);
  await inspect(g, 'p9_boat_hub', 0); // "Row across to Crownskull Isle"
  await g.skip();
  expect(await onMap(g)).toBe(I);
  expect((await g.state()).quests.recover_crimson_fortune?.status).toBe('active');
  expect(errors).toEqual([]);
});
