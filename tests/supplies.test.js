import { describe, it, expect, vi } from 'vitest';

// The Ship page is drawn with stand-in game objects below (no Phaser in Node).
vi.mock('phaser', () => ({ TintModes: { MULTIPLY: 0 } }));

import { loadContent } from '../src/content/loadContent.js';
import { ContentDB } from '../src/content/ContentDB.js';
import { validateContent } from '../src/content/validateContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION, SCREEN_WIDTH } from '../src/config/constants.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { captureCheckpoint, restoreCheckpoint, diffStates, isEmptyDiff } from '../src/systems/challenge/checkpoint.js';
import { commandNameOf } from '../src/systems/script/commandSchemas.js';
import { shipTuning, SHIP_TUNING } from '../src/systems/ship/integrity.js';
import { applyEffects, wouldAffect } from '../src/systems/effects/effects.js';
import {
  suppliesDataProblems,
  economyReport,
  classOf,
  sourceIds,
  sourceDef,
  sourceYields,
  scaleYield,
  recipeIds,
  recipeDef,
  storeDef,
  SUPPLY_CLASSES,
  supplyLimits,
  materialUses,
  BASE_ZONE,
} from '../src/systems/ship/supplies.js';
import { supplyGroups, recipeReport, storeReport, barZone, missingFor } from '../src/systems/ship/supplyResponse.js';
import { responseOptions } from '../src/systems/ship/response.js';
import { captainFactors } from '../src/systems/ship/airResponse.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { DEBUG_SHIP } from '../src/debug/shipDebug.js';
import { buildFonts } from '../src/art/font/buildFont.js';
import { wrap, parseMarkup, measure } from '../src/ui/text.js';
import { TOAST_TEXT_WIDTH } from '../src/ui/Toasts.js';
import { NON_CHALLENGE_COMMANDS } from './regression/harness.js';
import { CHALLENGE_KINDS as REGISTRY } from './regression/challenges.js';
import { makeStory, reloadStory } from './storyHarness.js';

/**
 * Shipboard resources, supply acquisition, equipment, consumables and
 * cooking (docs/gameplay-overhaul/14-resources-and-cooking.md).
 * Deterministic: hazard time is ticked by hand or by the work actions; a
 * salvage and a stir are the game's own timing bar played by simulated
 * hands. The real shared systems throughout (the ship, the pack, the air,
 * the beard, the challenge runner, saves). The browser half is
 * e2e/supplies.spec.js. No chapter uses any of it.
 */
const content = loadContent();
const FILES = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' });
/** Content errors with a fixture script added (the content itself is not changed). */
const fixtureErrors = (steps) => {
  const files = structuredClone(FILES);
  files['/data/story/cutscenes/zz_supplies_fixture.json'] = { 'zz.supplies_fixture': steps };
  return validateContent(new ContentDB(files)).errors.join('\n');
};
/** The data problems with data/ship/supplies.json changed (the content itself is not changed). */
const dataProblems = (change) => {
  const files = structuredClone(FILES);
  change(files['/data/ship/supplies.json'], files);
  return suppliesDataProblems(new ContentDB(files)).join('\n');
};
const DIFFS = ['deckhand', 'captain', 'brutal'];
const T = (d = 'captain') => shipTuning(content, d);
const tick = (ship, n = 1, d = 'captain') => {
  for (let i = 0; i < n; i++) ship.tick(T(d));
};
/** Places to stand (a walkable tile within reach of each). */
const AT = {
  stores: { map: 'cargo_hold', x: 2, y: 8 },
  crates: { map: 'cargo_hold', x: 5, y: 8 },
  wreckage: { map: 'cargo_hold', x: 15, y: 9 },
  barrels: { map: 'cargo_hold', x: 17, y: 4 },
  bilge: { map: 'cargo_hold', x: 10, y: 14 },
  sacking: { map: 'cargo_hold', x: 17, y: 11 },
  holdWater: { map: 'cargo_hold', x: 17, y: 6 },
  stove: { map: 'galley', x: 3, y: 4 },
  sacks: { map: 'galley', x: 8, y: 5 },
  jugs: { map: 'galley', x: 15, y: 7 },
  galleyWater: { map: 'galley', x: 15, y: 4 },
  nowhere: { map: 'cargo_hold', x: 9, y: 11 },
};
const goTo = (s, where) => {
  const sess = s.session ?? s;
  sess.location = { ...sess.location, ...AT[where], facing: 'up' };
};

function session(preset = 'supplies_demo') {
  const s = GameSession.newGame({ content, bus: new EventBus(), strictFlags: true });
  applyPresetPlan(s, resolvePreset(content, preset));
  return s;
}
const on = (s, d = 'captain') => {
  s.ship.supplies.on = true;
  s.ship.supplies.tuning = T(d);
  return s.ship.supplies;
};
const demo = (opts = {}) => makeStory({ preset: 'supplies_demo', ...opts });
const scenario = (letter) => DEBUG_SHIP.supplies.find(([label]) => label.startsWith(`Supplies ${letter}:`))[1];
const has = (s, id) => (s.session ?? s).inventory.count(id);
const plain = (t) => parseMarkup(String(t).replace(/\{[^{}]+\}/g, 'XXXXXXXX')).text;
const lastNotice = (s) => plain(s.notices.filter((n) => n.kind === 'ship').at(-1)?.text ?? '');

// ---------------------------------------------------------------------------------------------
describe('the data: classes, sources, stores, gear, effects and recipes', () => {
  it('validates; every functional resource has one class, a use and a documented way to get it; Frog Grog and the key items are never classed (gear aside, worn not taken)', () => {
    expect(suppliesDataProblems(content)).toEqual([]);
    expect(validateContent(content).errors.filter((e) => /supplies|shipEffect/.test(e))).toEqual([]);
    const data = content.shipSupplies;
    const all = SUPPLY_CLASSES.flatMap((c) => data.classes[c].items);
    expect(new Set(all).size).toBe(all.length);
    expect(classOf(content, 'frog_grog')).toBe(null);
    for (const item of all) {
      const def = content.items.get(item);
      expect(def, item).toBeTruthy();
      if (def.type === 'key') expect(classOf(content, item), item).toBe('equipment');
    }
    // A way to get each: a source, a recipe or a shop (the story's own gear excepted: it comes from the story).
    const eco = economyReport(content).difficulties.captain.rows;
    for (const item of all.filter((i) => classOf(content, i) !== 'equipment')) {
      const r = eco[item];
      expect(r.sources.length + r.recipes.length + r.shops.length, item).toBeGreaterThan(0);
    }
    // A use for each: a bill, a recipe, eating it, or wearing it.
    for (const item of all) {
      const r = eco[item];
      const eaten = content.items.get(item).type === 'consumable';
      expect(r.usedBy.length > 0 || eaten || classOf(content, item) === 'equipment', item).toBe(true);
    }
  });

  it('the economy: on every difficulty every repair material has a renewable path (a restock or a recovery), the finite total and what uses it are reported, and nothing mandatory is invented', () => {
    const r = economyReport(content);
    expect(r.problems).toEqual([]);
    for (const d of DIFFS) {
      const rows = r.difficulties[d].rows;
      for (const item of ['planks', 'nails', 'rope', 'sailcloth']) {
        expect(rows[item].renewable.length, `${d} ${item}`).toBeGreaterThan(0);
        expect(rows[item].usedBy.length, `${d} ${item}`).toBeGreaterThan(0);
      }
      expect(r.difficulties[d].mandatory).toEqual([]);
    }
    // Scarcer on Brutal, more generous on Deckhand.
    expect(r.difficulties.brutal.rows.planks.finiteMax).toBeLessThan(r.difficulties.captain.rows.planks.finiteMax);
    expect(r.difficulties.deckhand.rows.planks.finiteMax).toBeGreaterThan(r.difficulties.captain.rows.planks.finiteMax);
    expect(materialUses(content).length).toBeGreaterThan(10);
  });

  it('the validator rejects: unknown items, negative and impossible quantities, invalid stores, sources and recipes, slots, duplicate rewards, contradictory and unbounded effects, unrecoverable repair materials', () => {
    const cases = [
      [(d) => { d.sources.hold_crates.yields.push({ item: 'gold_bars', count: 1 }); }, /unknown item "gold_bars"/],
      [(d) => { d.sources.hold_crates.yields[0].count = -2; }, /count must be a whole number 1 to 20/],
      [(d) => { d.sources.hold_crates.yields.push({ item: 'planks', count: 1 }); }, /"planks" twice/],
      [(d) => { d.sources.hold_crates.yields.push({ item: 'treasure_key', count: 1 }); }, /story key item/],
      [(d) => { d.stores.hold.room = 'the_moon'; }, /unknown room "the_moon"/],
      [(d) => { d.stores.hold.accepts.push('equipment'); }, /never equipment/],
      [(d) => { d.stores.hold.spend.for.push('repair'); }, /repairs pay from the pack/],
      [(d) => { d.sources.hold_bilge.uses = 3; }, /a recovery never runs out/],
      [(d) => { d.sources.hold_bilge.cooldown = 1; }, /cooldown of 20 to 600/],
      [(d) => { d.sources.hold_bilge.yields[0].count = 9; }, /at most 2 of each/],
      [(d) => { d.sources.hold_crates.type = 'magic'; }, /type is cache, salvage, recovery/],
      [(d) => { d.recipes.bean_stew.ingredients[0].item = 'nails'; }, /"nails" is repair, not an ingredient/],
      [(d) => { d.recipes.bean_stew.ingredients[0].count = 999; }, /count must be a whole number 1 to 20/],
      [(d) => { d.recipes.bean_stew.waste = [{ item: 'garlic', count: 1 }]; }, /waste "garlic" must be one of its ingredients/],
      [(d) => { d.recipes.bean_stew.product = 'beans'; }, /isn't food/],
      [(d) => { d.recipes.bean_stew.serves = { success: 1, partial: 2 }; }, /success above partial/],
      [(d) => { d.recipes.bean_stew.station = 'campfire'; }, /unknown station "campfire"/],
      [(d) => { d.gear.items.clay_pot_helmet.slot = 'tail'; }, /slot "tail"/],
      [(d) => { d.gear.items.clay_pot_helmet.knock = 0; }, /never immunity/],
      [(d) => { d.effects.full_belly.work = 0.1; }, /work must be 0.8 to under 1/],
      [(d) => { d.effects.grog_ward.lungs = 0.05; }, /never better than the best Frog Grog ward/],
      [(d) => { d.effects.full_belly.lungs = 0.6; }, /lungs is a draught's/],
      [(d) => { d.effects.full_belly.seconds = 99999; }, /an effect always ends/],
      [(d) => { d.effects.steady_hands.zone = 40; }, /zone must be a whole number/],
      [(d) => { delete d.sources.hold_sacking; }, /"rope" is a repair material with no renewable source/],
      [(d) => { d.classes.consumable.items.push('frog_grog'); }, /frog_grog is the story's/],
      [(d) => { d.classes.food.items.push('planks'); }, /"planks" is already in repair/],
    ];
    for (const [change, re] of cases) expect(dataProblems(change), String(re)).toMatch(re);
    // An item that gives two supply effects contradicts itself.
    const files = structuredClone(FILES);
    const items = files['/data/items/supplies.json'];
    items.find((i) => i.id === 'bean_stew').use.effects.push({ type: 'shipEffect', effect: 'steady_hands' });
    expect(suppliesDataProblems(new ContentDB(files)).join('\n')).toMatch(/gives two supply effects/);
    // A difficulty override out of bounds is refused (the ship tuning's own check).
    const files2 = structuredClone(FILES);
    files2['/data/difficulty/presets.json'].brutal.ship.supplyYieldScale = 9;
    expect(validateContent(new ContentDB(files2)).errors.join('\n')).toMatch(/supplyYieldScale must be from 0.5 to 1.5/);
  });

  it('commands and conditions are validated: unknown stores, sources, recipes, effects, gear and items, key items, negative counts, bad ops', () => {
    const errs = fixtureErrors([
      { supplyTransfer: 'attic', item: 'planks', count: 1, to: 'store' },
      { supplyTransfer: 'hold', item: 'treasure_key', count: 1, to: 'store' },
      { supplyTransfer: 'hold', item: 'planks', count: -3, to: 'store' },
      { supplyTransfer: 'hold', item: 'planks', count: 1, to: 'sideways' },
      { supplyStore: 'hold', give: [{ item: 'planks', count: 0 }] },
      { supplySource: 'the_sea', op: 'restock' },
      { supplySource: 'hold_crates', op: 'explode' },
      { supplyTake: 'hold_bilge', challenge: { profile: 'ship_repair' } },
      { cook: 'cake' },
      { gearEquip: 'cutlass' },
      { useSupply: 'treasure_key' },
      { supplyEffect: 'invincible' },
      { learnRecipe: 'cake' },
      { suppliesSystem: 'yes' },
      { if: { supplies: { has: 'gold_bars' } }, then: ['x'] },
      { if: { supplies: { source: 'the_sea' } }, then: ['x'] },
      { if: { supplies: { cooking: 'cake' } }, then: ['x'] },
      { if: { supplies: { flying: true } }, then: ['x'] },
    ]);
    for (const re of [/unknown store "attic"/, /"treasure_key" is a story key item/, /"count" must be a whole number 1 to 99/, /"to" is store or pack/, /"planks": count must be a whole number 1 to 99/, /unknown supply source "the_sea"/, /a source op is open, deplete, restock/, /only a salvage is a challenge/, /unknown recipe "cake"/, /"cutlass" isn't gear/, /unknown supply effect "invincible"/, /suppliesSystem: true or false|expected boolean/, /supplies condition: unknown item "gold_bars"/, /supplies condition: unknown source "the_sea"/, /"cooking" is true, false or a recipe/, /supplies condition: unknown key "flying"/]) expect(errs).toMatch(re);
    // The demo scenarios validate.
    for (const [label, steps] of DEBUG_SHIP.supplies) expect(fixtureErrors(steps), label).toBe('');
  });

  it('every new command is classed for the regression harness: a challenge (salvage, cooking) or not', () => {
    for (const name of ['suppliesSystem', 'supplyStore', 'supplyTransfer', 'supplyMenu', 'supplyCheck', 'supplySource', 'supplySetback', 'gearEquip', 'gearRecharge', 'useSupply', 'supplyEffect', 'learnRecipe', 'serve', 'cookReport']) expect(NON_CHALLENGE_COMMANDS.has?.(name) ?? NON_CHALLENGE_COMMANDS.includes(name), name).toBe(true);
    expect(REGISTRY.supplyTake.commands).toEqual(['supplyTake']);
    expect(REGISTRY.cook.commands).toEqual(['cook']);
    expect(commandNameOf({ cook: 'bean_stew', anywhere: true })).toBe('cook');
    expect(commandNameOf({ serve: true })).toBe('serve');
  });
});

// ---------------------------------------------------------------------------------------------
describe('acquisition: sources in the rooms, depletion, restocking, recovery', () => {
  it('a cache gives its yields once, by hand where it is (seconds of work on the hazard clock); away from it, refused; leaving the room or reloading never refills it', async () => {
    let s = demo();
    await s.run(scenario('A'));
    goTo(s, 'nowhere');
    await s.run([{ supplyTake: 'hold_crates', outcomeValue: 'fx_t' }]);
    expect(s.session.story.getValue('fx_t')).toBe('refused');
    expect(supplyGroups(s.session).some((g) => g.list.some((o) => o.source === 'hold_crates'))).toBe(false);
    goTo(s, 'crates');
    const before = { planks: has(s, 'planks'), nails: has(s, 'nails'), beans: has(s, 'beans') };
    const ticks = [];
    const orig = s.session.ship.tick.bind(s.session.ship);
    s.session.ship.tick = (t) => {
      ticks.push(1);
      return orig(t);
    };
    await s.run([{ supplyTake: 'hold_crates', outcomeValue: 'fx_t' }]);
    expect(s.session.story.getValue('fx_t')).toBe('found');
    expect(ticks.length).toBe(sourceDef(content, 'hold_crates').action.seconds);
    expect([has(s, 'planks') - before.planks, has(s, 'nails') - before.nails, has(s, 'beans') - before.beans]).toEqual([2, 3, 2]);
    expect(lastNotice(s)).toMatch(/Found 2 Planks, 3 Nails, 2 Beans/);
    // Again: nothing left; the room left and come back to; a reload.
    await s.run([{ supplyTake: 'hold_crates', outcomeValue: 'fx_t' }]);
    expect(s.session.story.getValue('fx_t')).toBe('refused');
    s.session.location = { map: 'galley', x: 8, y: 5, facing: 'up' };
    goTo(s, 'crates');
    s = reloadStory(s);
    goTo(s, 'crates');
    expect(s.session.ship.supplies.available('hold_crates')).toMatchObject({ ok: false, empty: true });
    await s.run([{ supplyTake: 'hold_crates', outcomeValue: 'fx_t' }]);
    expect(s.session.story.getValue('fx_t')).toBe('refused');
    expect(has(s, 'planks')).toBe(before.planks + 2);
  });

  it('a pack that can\'t hold it all refuses the whole take: nothing lost, the source untouched', () => {
    const s = session();
    const sup = on(s);
    s.inventory.add('nails', 99);
    goTo(s, 'crates');
    const r = sup.take('hold_crates');
    expect(r).toMatchObject({ ok: false, full: true });
    expect(sup.sourceState('hold_crates').left).toBe(1);
    expect(s.inventory.count('planks')).toBe(1);
  });

  it('restocking runs on the hazard clock only (event-driven, never by frames or room visits), up to its max; a recovery comes back after its cooldown, on every difficulty', () => {
    for (const d of DIFFS) {
      const s = session();
      const sup = on(s, d);
      const t = T(d);
      sup.take('galley_jugs', { difficulty: d });
      sup.take('galley_jugs', { difficulty: d });
      expect(sup.available('galley_jugs').ok).toBe(false);
      const every = Math.round(180 * t.restockScale);
      tick(s.ship, every - 1, d);
      expect(sup.sourceState('galley_jugs').left).toBe(0);
      tick(s.ship, 1, d);
      expect(sup.sourceState('galley_jugs').left).toBe(1);
      tick(s.ship, every * 3, d);
      expect(sup.sourceState('galley_jugs').left).toBe(2);
      expect(sup.sourceState('galley_jugs').restockIn).toBe(0);
      // The bilge: always there, a cooldown after each.
      sup.take('hold_bilge', { difficulty: d });
      const cd = Math.round(60 * t.restockScale);
      expect(sup.available('hold_bilge')).toMatchObject({ ok: false, wait: cd });
      tick(s.ship, cd, d);
      expect(sup.available('hold_bilge').ok).toBe(true);
    }
  });

  it('yields follow the difficulty (more on Deckhand, fewer on Brutal, never below one); a partial salvage gives its share', () => {
    expect(scaleYield(2, 1.25)).toBe(3);
    expect(scaleYield(2, 0.75)).toBe(1);
    expect(scaleYield(1, 0.5)).toBe(1);
    expect(sourceYields(content, 'hold_wreckage', 'captain')).toEqual([{ item: 'planks', count: 2 }, { item: 'nails', count: 2 }, { item: 'sailcloth', count: 1 }]);
    expect(sourceYields(content, 'hold_wreckage', 'captain', 0.5)).toEqual([{ item: 'planks', count: 1 }, { item: 'nails', count: 1 }]);
    expect(sourceYields(content, 'hold_wreckage', 'brutal')).toEqual([{ item: 'planks', count: 1 }, { item: 'nails', count: 1 }, { item: 'sailcloth', count: 1 }]);
    expect(sourceYields(content, 'hold_wreckage', 'deckhand')).toEqual([{ item: 'planks', count: 3 }, { item: 'nails', count: 3 }, { item: 'sailcloth', count: 2 }]);
  });

  it('a salvage is the timing bar: success gives all, partial its share, a failure a knock (halved by Bob\'s Pot) and leaves the source as it was', async () => {
    const results = {};
    for (const [hands, outcome] of [[['perfect'], 'success'], [[{ fumbles: 1 }], 'partial'], [[{ fumbles: 3 }], 'failure']]) {
      const s = demo();
      await s.run(scenario('A'));
      goTo(s, 'wreckage');
      const hp = s.session.party.members[0].hp;
      const planks = has(s, 'planks');
      s.playHands(...hands);
      if (outcome === 'failure') s.decideChallenges('continue');
      await s.run([{ supplyTake: 'hold_wreckage', outcomeValue: 'fx_t' }]);
      expect(s.challengeRecords.at(-1)).toMatchObject({ id: 'supply:hold_wreckage', outcome });
      results[outcome] = [has(s, 'planks') - planks, s.session.ship.supplies.sourceState('hold_wreckage').left, hp - s.session.party.members[0].hp];
    }
    expect(results).toEqual({ success: [2, 2, 0], partial: [1, 2, 0], failure: [0, 3, 6] });
    // Wearing the pot: half the knock.
    const s = demo();
    await s.run([...scenario('A'), { gearEquip: 'clay_pot_helmet' }]);
    goTo(s, 'wreckage');
    const hp = s.session.party.members[0].hp;
    s.playHands({ fumbles: 3 });
    s.decideChallenges('continue');
    await s.run([{ supplyTake: 'hold_wreckage' }]);
    expect(hp - s.session.party.members[0].hp).toBe(3);
  });

  it('the bar for a salvage or a stir follows the difficulty (supplyZone) and a meal or a draught; repairs only the meal or draught; Timing Assist and the Classic Bar never change an amount', () => {
    const s = session();
    const sup = on(s);
    expect(barZone(s)).toBe(BASE_ZONE);
    expect([barZone(s, { supply: true, difficulty: 'deckhand' }), barZone(s, { supply: true, difficulty: 'captain' }), barZone(s, { supply: true, difficulty: 'brutal' })]).toEqual([30, 26, 22]);
    sup.applyEffect('steady_hands');
    expect(barZone(s)).toBe(30);
    sup.applyEffect('grog_ward');
    expect(barZone(s)).toBe(26);
    sup.on = false;
    expect(barZone(s)).toBe(BASE_ZONE);
    // No assist field anywhere in the supplies tuning: what a source gives and a bill costs is the difficulty's alone.
    for (const k of ['supplyYieldScale', 'restockScale', 'supplyZone', 'effectScale']) expect(SHIP_TUNING[k]).toBeTruthy();
    expect(JSON.stringify(content.shipSupplies)).not.toMatch(/assist|classic/i);
  });
});

// ---------------------------------------------------------------------------------------------
describe('the ship\'s stores', () => {
  it('deposit and withdraw: whole or nothing; never a key item; never past capacity; only the classes it takes; never a negative or zero count', () => {
    const s = session();
    const sup = on(s);
    s.inventory.add('planks', 9);
    expect(sup.deposit('hold', 'planks', 4)).toMatchObject({ ok: true });
    expect([s.inventory.count('planks'), sup.storeCount('hold', 'planks')]).toEqual([6, 4]);
    expect(sup.deposit('hold', 'planks', 7).ok).toBe(false);
    expect([s.inventory.count('planks'), sup.storeCount('hold', 'planks')]).toEqual([6, 4]);
    expect(sup.deposit('hold', 'clay_pot_helmet', 1)).toMatchObject({ ok: false, reason: expect.stringMatching(/stays with you/) });
    expect(sup.deposit('hold', 'grog_tot', 1).ok).toBe(false);
    expect(sup.deposit('hold', 'cutlass', 1).ok).toBe(false);
    for (const n of [0, -2, 1.5]) expect(sup.deposit('hold', 'planks', n).ok).toBe(false);
    expect(sup.withdraw('hold', 'planks', 5).ok).toBe(false);
    expect(sup.withdraw('hold', 'planks', -1).ok).toBe(false);
    expect(sup.withdraw('hold', 'planks', 4).ok).toBe(true);
    expect([s.inventory.count('planks'), sup.storeTotal('hold')]).toEqual([10, 0]);
    expect(sup.stores).toEqual({});
    // Capacity.
    expect(sup.stock('hold', 'nails', 58).ok).toBe(true);
    expect(sup.deposit('hold', 'planks', 3)).toMatchObject({ ok: false, reason: expect.stringMatching(/room for 2 more/) });
    expect(sup.deposit('hold', 'planks', 2).ok).toBe(true);
    expect(sup.deposit('hold', 'planks', 1)).toMatchObject({ ok: false, reason: expect.stringMatching(/full/) });
  });

  it('only at the stores (a script may say "anywhere"); the Respond choice there checks, puts away and takes out by item and amount', async () => {
    const s = demo();
    await s.run(scenario('A'));
    goTo(s, 'nowhere');
    await s.run([{ supplyTransfer: 'hold', item: 'planks', count: 1, to: 'store', outcomeValue: 'fx_x' }]);
    expect(s.session.story.getValue('fx_x')).toBe('refused');
    goTo(s, 'stores');
    const groups = supplyGroups(s.session);
    const g = groups.find((x) => x.list.some((o) => o.action === 'deposit'));
    expect(g.list.map((o) => o.action)).toEqual(['storeCheck', 'deposit', 'withdraw']);
    // Respond > the stores > put away > planks (the menu lists what the stores take, in pack order) > 1.
    const storable = s.session.inventory.entries().filter((e) => !s.session.ship.supplies.storeRefusal('hold', e.id, 1)).map((e) => e.id);
    // The hold's bilge pump is always offered first ("Fight the emergency"), then the supplies' groups.
    const lead = responseOptions(s.session, 'cargo_hold').length ? 1 : 0;
    s.choices.push(lead + groups.indexOf(g), 1, storable.indexOf('planks'), 0);
    await s.run([{ emergency: true }]);
    expect(s.session.ship.supplies.storeCount('hold', 'planks')).toBe(1);
    expect(has(s, 'planks')).toBe(0);
    expect(lastNotice(s)).toMatch(/Put 1 Planks in the stores/);
    // Take it back out.
    s.choices.push(lead + supplyGroups(s.session).findIndex((x) => x.list.some((o) => o.action === 'withdraw')), 2, 0, 0);
    await s.run([{ emergency: true }]);
    expect([has(s, 'planks'), s.session.ship.supplies.storeTotal('hold')]).toEqual([1, 0]);
    expect(storeReport(s.session, 'hold')[0]).toMatch(/0 of 60/);
  });

  it('who pays: repairs pay from what the captain carries, never from the stores (he fetches); the cook draws on the stores from the galley', async () => {
    const s = demo();
    await s.run(scenario('B'));
    goTo(s, 'stores');
    const leak = s.session.ship.hazards.leaks[0];
    const patch = () => responseOptions(s.session, 'cargo_hold').find((o) => o.action === 'patch');
    expect(patch()).toMatchObject({ ok: false });
    expect(patch().reason).toMatch(/Not enough|Planks/);
    // Fetch from the stores, then patch.
    await s.run([{ supplyTransfer: 'hold', item: 'planks', count: 1, to: 'pack' }, { supplyTransfer: 'hold', item: 'nails', count: 2, to: 'pack' }]);
    expect(patch().ok).toBe(true);
    s.playHands('perfect');
    await s.run([{ patchLeak: leak.id }]);
    expect(s.session.ship.hazards.leaks.find((l) => l.id === leak.id).state).not.toBe('open');
    // The galley: beans and onions only in the stores, cooked from there.
    const t = demo();
    await t.run(scenario('D'));
    goTo(t, 'stove');
    expect(missingFor(t.session, 'bean_stew')).toEqual([]);
    goTo(t, 'nowhere');
    t.session.location.map = 'crew_quarters';
    expect(missingFor(t.session, 'bean_stew', 'crew_quarters').map((m) => m.item)).toEqual(['beans', 'onions']);
  });
});

// ---------------------------------------------------------------------------------------------
describe('gear: put on by hand, one to a slot, never by itself', () => {
  it('never auto-equipped; only what he carries; a slot takes one (the last comes off); Bob\'s Pot and the goggles don\'t go together; the key item stays in the pack (the story still finds it)', async () => {
    const s = demo();
    await s.run([{ suppliesSystem: true }]);
    const sup = s.session.ship.supplies;
    expect(sup.wornGear()).toEqual([]);
    s.session.inventory.add('beard_wrap', 1);
    expect(sup.wornGear()).toEqual([]);
    await s.run([{ gearEquip: 'clay_pot_helmet' }, { gearEquip: 'bottle_goggles', outcomeValue: 'fx_g' }]);
    expect(s.session.story.getValue('fx_g')).toBe('refused');
    expect(lastNotice(s)).toMatch(/Bob's Pot comes down over the goggles/);
    await s.run([{ gearEquip: 'clay_pot_helmet', remove: true }, { gearEquip: 'bottle_goggles' }, { gearEquip: 'wet_cloth' }, { gearEquip: 'wet_cloth' }]);
    expect(sup.wornGear().sort()).toEqual(['bottle_goggles', 'wet_cloth']);
    expect(s.session.ship.beard.worn.filter((x) => x === 'wet_cloth').length).toBe(1);
    expect(has(s, 'wet_cloth')).toBe(1);
    expect(evaluateCondition({ hasItem: 'wet_cloth' }, s.session)).toBe(true);
    expect(evaluateCondition({ supplies: { wearing: 'wet_cloth' } }, s.session)).toBe(true);
    // Not his: refused.
    s.session.inventory.remove('beard_wrap', 1);
    expect(sup.equip('beard_wrap')).toMatchObject({ ok: false });
    // Taken away by the story: it no longer counts as worn (nothing is lost; nothing re-equips by itself when it comes back).
    s.session.inventory.remove('wet_cloth', 1);
    expect(sup.wornGear()).toEqual(['bottle_goggles']);
  });

  it('the wet cloth dries while he breathes bad air through it (only with the supplies on), stops protecting when dry, and is wetted again at water; off, it never dries (Prompt 9 as it was)', async () => {
    const s = demo();
    await s.run([...scenario('C'), { gearEquip: 'wet_cloth' }]);
    goTo(s, 'stores');
    const sup = s.session.ship.supplies;
    const b = s.session.ship.beard;
    expect(b.lungFactor).toBe(0.7);
    // One charge for each second of bad air breathed through it (the bale keeps the hold bad).
    let bad = 0;
    for (let i = 0; i < 400 && !sup.spent('wet_cloth'); i++) {
      if (s.session.ship.air.airIn('cargo_hold').index > 0) bad += 1;
      expect(b.lungFactor).toBe(0.7);
      tick(s.session.ship, 1);
    }
    expect(bad).toBe(120);
    expect(sup.spent('wet_cloth')).toBe(true);
    expect(b.lungFactor).toBe(1);
    await s.run([{ gearRecharge: 'wet_cloth', outcomeValue: 'fx_w' }]);
    expect(sup.spent('wet_cloth')).toBe(true);
    goTo(s, 'holdWater');
    await s.run([{ gearRecharge: 'wet_cloth' }]);
    expect(sup.charge('wet_cloth')).toBeGreaterThan(110);
    expect(b.lungFactor).toBe(0.7);
    // The supplies off: the beard's cloth as Prompt 9 left it.
    sup.on = false;
    tick(s.session.ship, 300);
    expect(b.lungFactor).toBe(0.7);
  });

  it('the beard\'s wear option still works, and with the supplies on goes by the gear\'s rules (no duplicate in the Respond choice)', async () => {
    const s = demo();
    await s.run([{ beardSaturation: true }, { beardWear: 'beard_wrap' }]);
    expect(s.session.ship.beard.wornItems()).toEqual(['beard_wrap']);
    await s.run([{ suppliesSystem: true }]);
    const labels = supplyGroups(s.session).flatMap((g) => g.list.map((o) => o.label));
    expect(labels.filter((l) => /beard wrap/i.test(l)).length).toBe(1);
    const all = [...labels, ...(await import('../src/systems/ship/beardResponse.js')).beardOptions(s.session).map((o) => o.label)];
    expect(all.filter((l) => /Wear|Take off/.test(l) && /wrap/i.test(l)).length).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
describe('consumables and food effects', () => {
  it('eating: one taken, its effects applied once (HP and a timed effect), a line that says so; refused (nothing taken) when it would do nothing', async () => {
    const s = demo();
    await s.run([{ suppliesSystem: true }, { giveItem: 'bean_stew', count: 2, silent: true }]);
    const cap = s.session.party.members[0];
    cap.hp = cap.maxHp - 40;
    await s.run([{ useSupply: 'bean_stew', outcomeValue: 'fx_u' }]);
    expect([has(s, 'bean_stew'), cap.maxHp - cap.hp, s.session.ship.supplies.effects.full_belly?.left]).toEqual([1, 15, 240]);
    expect(lastNotice(s)).toMatch(/recovers 25 HP\. Full belly 240s\./);
    // Off: full HP and the system off, nothing to gain: refused, nothing taken.
    await s.run([{ suppliesSystem: false }]);
    cap.hp = cap.maxHp;
    await s.run([{ useSupply: 'bean_stew', outcomeValue: 'fx_u' }]);
    expect([s.session.story.getValue('fx_u'), has(s, 'bean_stew')]).toEqual(['refused', 1]);
    expect(wouldAffect(content.items.get('bean_stew').use.effects, cap, s.session)).toBe(false);
  });

  it('bounded: one effect per group (a new meal replaces the last), the same one again restarts its clock (never stacks), every effect ends, and the combined factors keep their floors', () => {
    const s = session();
    const sup = on(s);
    sup.applyEffect('full_belly');
    expect(sup.applyEffect('steady_hands')).toMatchObject({ ok: true, replaced: 'full_belly' });
    expect(Object.keys(sup.effects)).toEqual(['steady_hands']);
    tick(s.ship, 100);
    expect(sup.applyEffect('steady_hands')).toMatchObject({ refreshed: true, seconds: 180 });
    sup.applyEffect('grog_ward');
    expect(Object.keys(sup.effects).sort()).toEqual(['grog_ward', 'steady_hands']);
    expect(sup.factor('zone')).toBe(0);
    tick(s.ship, 600);
    expect(sup.effects).toEqual({});
    // Floors (even from damaged data: the limits clamp what the combination gives).
    sup.effects = { full_belly: { left: 10 } };
    expect(sup.factor('work')).toBe(0.85);
    expect(captainFactors(s).work).toBeCloseTo(0.85, 6);
    const lim = supplyLimits(content);
    sup.effects = { full_belly: { left: 10 }, steady_hands: { left: 10 }, grog_ward: { left: 10 }, warm_belly: { left: 10 } };
    expect(sup.factor('work')).toBeGreaterThanOrEqual(lim.work);
    expect(sup.factor('hurt')).toBeGreaterThanOrEqual(lim.hurt);
    expect(Math.abs(sup.factor('zone'))).toBeLessThanOrEqual(lim.zone);
    expect(sup.factor('lungs')).toBeGreaterThanOrEqual(lim.lungs);
  });

  it('effect strength follows the difficulty (effectScale); a warm belly halves bad air\'s harm; garlic broth clears a little of the lungs, never a cure; nothing clears the beard\'s gas or a Grand Stenchmaster', () => {
    const secs = DIFFS.map((d) => {
      const s = session();
      const sup = on(s, d);
      return sup.applyEffect('full_belly', { tuning: T(d) }).seconds;
    });
    expect(secs).toEqual([300, 240, 192]);
    const s = session();
    const sup = on(s);
    const cap = s.party.members[0];
    sup.applyEffect('warm_belly');
    const hp = cap.hp;
    s.ship.air.hurt(10, 0.1);
    expect(hp - cap.hp).toBe(5);
    s.ship.air.exposure = 80;
    const r = applyEffects(content.items.get('garlic_broth').use.effects, cap, { session: s });
    expect(r.find((x) => x.type === 'shipEffect')).toMatchObject({ applied: true, recovered: 25 });
    expect(s.ship.air.exposure).toBe(55);
    for (const id of ['bean_stew', 'oat_porridge', 'fish_chowder', 'garlic_broth', 'grog_tot']) {
      const fx = content.items.get(id).use.effects.map((e) => e.type);
      expect(fx.every((t) => ['heal', 'shipEffect'].includes(t)), id).toBe(true);
    }
  });

  it('Frog Grog: the story item is exactly as it was (its own ward, side effects, never taken by the supplies); a grog tot is a separate portion whose ward is taken with Frog Grog\'s, the smaller, never past the best', () => {
    const fg = content.items.get('frog_grog');
    expect(fg.type).toBe('consumable');
    expect(fg.use.effects.map((e) => e.type)).toEqual(['heal', 'fumeWard', 'sideEffect']);
    expect(classOf(content, 'frog_grog')).toBe(null);
    for (const r of recipeIds(content)) expect(recipeDef(content, r).ingredients.some((c) => c.item === 'frog_grog')).toBe(false);
    for (const id of sourceIds(content)) expect(sourceDef(content, id).yields.some((y) => y.item === 'frog_grog')).toBe(false);
    // The ward combination the world uses (WorldScene.updateHazards): masks by min, draughts by min, multiplied.
    const lim = supplyLimits(content);
    const protect = (rescue, cloth, legacyWard, draught) => Math.min(rescue ? 0.7 : 1, cloth) * (draught < 1 ? Math.max(lim.lungs, Math.min(legacyWard, draught)) : legacyWard);
    expect(protect(false, 1, 0.5, 1)).toBe(0.5); // Frog Grog alone, as before
    expect(protect(false, 1, 1, 0.6)).toBe(0.6); // a tot alone
    expect(protect(false, 1, 0.5, 0.6)).toBe(0.5); // both: the smaller, never 0.3
    expect(protect(true, 0.7, 0.35, 0.6)).toBeCloseTo(0.245, 6); // the best there ever was, unchanged
    // Drinking Frog Grog with the supplies on: its legacy ward, and no supplies effect.
    const s = session();
    on(s);
    const out = applyEffects(fg.use.effects, s.party.members[0], { session: s, rng: { next: () => 0.1, chance: () => true } });
    expect(out.some((r) => r.type === 'shipEffect')).toBe(false);
    expect(s.transient.fumeWard).toMatchObject({ ms: 90000 });
    expect(s.ship.supplies.effects).toEqual({});
  });
});

// ---------------------------------------------------------------------------------------------
describe('cooking at the galley stove', () => {
  it('success, partial and failure: the stir decides it; then it simmers on the hazard clock and is served once (two, one, or scorched: nothing)', async () => {
    const results = {};
    for (const [hands, outcome] of [[['perfect'], 'success'], [[{ fumbles: 1 }], 'partial'], [[{ fumbles: 3 }], 'failure']]) {
      const s = demo();
      await s.run(scenario('D'));
      goTo(s, 'stove');
      s.playHands(...hands);
      if (outcome === 'failure') s.decideChallenges('continue');
      await s.run([{ cook: 'bean_stew', outcomeValue: 'fx_c' }]);
      expect(s.challengeRecords.at(-1)).toMatchObject({ id: 'cook:bean_stew', outcome });
      const sup = s.session.ship.supplies;
      const pot = sup.cooking ? { ...sup.cooking } : null;
      await s.run([{ serve: true, outcomeValue: 'fx_s' }]);
      const early = s.session.story.getValue('fx_s');
      tick(s.session.ship, 30);
      await s.run([{ serve: true, outcomeValue: 'fx_s' }, { serve: true, outcomeValue: 'fx_s2' }]);
      results[outcome] = [pot?.serves ?? 0, early, s.session.story.getValue('fx_s'), s.session.story.getValue('fx_s2'), has(s, 'bean_stew'), sup.storeCount('hold', 'beans'), sup.storeCount('hold', 'onions')];
    }
    expect(results).toEqual({
      success: [2, 'refused', 'served', 'refused', 2, 2, 1],
      partial: [1, 'refused', 'served', 'refused', 1, 2, 1],
      failure: [0, 'refused', 'refused', 'refused', 0, 3, 2],
    });
  });

  it('refused (and costing nothing) away from the stove, with something on, missing an ingredient, or a recipe not known; "What can I cook?" says what each needs and lacks', async () => {
    const s = demo();
    await s.run(scenario('D'));
    goTo(s, 'sacks');
    await s.run([{ cook: 'bean_stew', outcomeValue: 'fx_c' }]);
    expect(s.session.story.getValue('fx_c')).toBe('refused');
    goTo(s, 'stove');
    await s.run([{ cook: 'fish_chowder', outcomeValue: 'fx_c' }]);
    expect([s.session.story.getValue('fx_c'), lastNotice(s)]).toEqual(['refused', 'Missing: Salt Fish 0/1.']);
    s.playHands('perfect');
    await s.run([{ cook: 'oat_porridge' }]);
    await s.run([{ cook: 'bean_stew', outcomeValue: 'fx_c' }]);
    expect(lastNotice(s)).toMatch(/already on the stove/);
    const lines = recipeReport(s.session).map(plain);
    expect(lines.find((l) => l.startsWith('Fish Chowder'))).toMatch(/Missing Salt Fish/);
    expect(lines.find((l) => l.startsWith('Bean Stew'))).not.toMatch(/Missing/);
    expect(evaluateCondition({ supplies: { cooking: 'oat_porridge' } }, s.session)).toBe(true);
  });

  it('a failed stir, retried: each try\'s waste is paid (a cost a retry keeps), the ingredients once, and never more tries than can be paid for', async () => {
    const s = demo();
    await s.run(scenario('D'));
    goTo(s, 'stove');
    const sup = s.session.ship.supplies;
    s.playHands({ fumbles: 3 }, 'perfect');
    s.decideChallenges('retry');
    await s.run([{ cook: 'bean_stew' }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ outcome: 'success', attempt: 2 });
    expect([sup.storeCount('hold', 'beans'), sup.storeCount('hold', 'onions'), sup.cooking.serves]).toEqual([1, 1, 2]);
    // One bean left and one onion: no attempt can be paid for.
    sup.clearCooking();
    await s.run([{ cook: 'bean_stew', outcomeValue: 'fx_c' }]);
    expect(s.session.story.getValue('fx_c')).toBe('refused');
  });
});

// ---------------------------------------------------------------------------------------------
describe('checkpoints and retries: ten checks', () => {
  it('1-3. a salvage awards its supplies; a later challenge fails; a retry restores that challenge\'s state, and the salvage stays', async () => {
    const s = demo();
    await s.run(scenario('A'));
    goTo(s, 'wreckage');
    s.playHands('perfect');
    await s.run([{ supplyTake: 'hold_wreckage' }]);
    const after = { planks: has(s, 'planks'), left: s.session.ship.supplies.sourceState('hold_wreckage').left };
    expect(after.left).toBe(2);
    goTo(s, 'stove');
    await s.run([{ supplyStore: 'hold', give: [{ item: 'oats', count: 6 }] }]);
    s.playHands({ fumbles: 3 }, 'perfect');
    s.decideChallenges('retry');
    await s.run([{ cook: 'oat_porridge' }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ outcome: 'success', attempt: 2 });
    expect({ planks: has(s, 'planks'), left: s.session.ship.supplies.sourceState('hold_wreckage').left }).toEqual(after);
  });

  it('4. rewards can\'t be collected twice: a salvage retried after a failure gives once; a restored checkpoint takes back what came after it', async () => {
    const s = demo();
    await s.run(scenario('A'));
    goTo(s, 'wreckage');
    s.playHands({ fumbles: 3 }, { fumbles: 3 }, 'perfect');
    s.decideChallenges('retry', 'retry');
    const planks = has(s, 'planks');
    await s.run([{ supplyTake: 'hold_wreckage' }]);
    expect([has(s, 'planks') - planks, s.session.ship.supplies.sourceState('hold_wreckage').left]).toEqual([2, 2]);
    const cp = captureCheckpoint(s.session, { id: 'before' });
    goTo(s, 'crates');
    await s.run([{ supplyTake: 'hold_crates' }]);
    restoreCheckpoint(s.session, cp);
    expect(s.session.ship.supplies.sourceState('hold_crates').left).toBe(1);
    expect(has(s, 'planks') - planks).toBe(2);
  });

  it('5-6. costs: each failed salvage is a knock and each failed stir its waste, kept through the retries (charged once per failure, never again on the restore)', async () => {
    const s = demo();
    await s.run(scenario('A'));
    goTo(s, 'wreckage');
    // (A restore loads the party afresh: read the captain after it.)
    const hp = s.session.party.members[0].hp;
    s.playHands({ fumbles: 3 }, { fumbles: 3 }, 'perfect');
    s.decideChallenges('retry', 'retry');
    await s.run([{ supplyTake: 'hold_wreckage' }]);
    expect(hp - s.session.party.members[0].hp).toBe(12);
    const t = demo();
    await t.run(scenario('D'));
    goTo(t, 'stove');
    t.playHands({ fumbles: 3 }, { fumbles: 3 });
    t.decideChallenges('retry', 'continue');
    await t.run([{ cook: 'oat_porridge' }]);
    expect(t.challengeRecords.at(-1)).toMatchObject({ outcome: 'failure', attempt: 2 });
    expect(t.session.ship.supplies.storeCount('hold', 'oats')).toBe(2);
    expect(t.session.ship.supplies.cooking).toBe(null);
  });

  it('7. cooking can\'t duplicate ingredients or meals: a checkpoint around a cook and a serve puts both back exactly; serving twice serves once', async () => {
    const s = demo();
    await s.run(scenario('D'));
    goTo(s, 'stove');
    const sup = s.session.ship.supplies;
    const cp = captureCheckpoint(s.session, { id: 'pot' });
    const before = JSON.stringify([s.session.inventory.serialize(), sup.serialize()]);
    s.playHands('perfect');
    await s.run([{ cook: 'bean_stew' }]);
    tick(s.session.ship, 30);
    await s.run([{ serve: true }, { serve: true }]);
    expect([has(s, 'bean_stew'), sup.cooking]).toEqual([2, null]);
    const d = diffStates(cp.domains, s.session.serialize());
    expect(d.supplies.stores).toEqual({ 'hold:beans': -2, 'hold:onions': -1 });
    expect(d.items).toEqual({ bean_stew: 2 });
    restoreCheckpoint(s.session, cp);
    expect(JSON.stringify([s.session.inventory.serialize(), s.session.ship.supplies.serialize()])).toBe(before);
  });

  it('8. equipping can\'t duplicate items: wearing is a mark on a held item (never a copy); restored, the mark goes with it', async () => {
    const s = demo();
    await s.run([{ suppliesSystem: true }]);
    const inv = JSON.stringify(s.session.inventory.serialize());
    const cp = captureCheckpoint(s.session, { id: 'gear' });
    await s.run([{ gearEquip: 'clay_pot_helmet' }, { gearEquip: 'clay_pot_helmet' }, { gearEquip: 'wet_cloth' }]);
    expect(JSON.stringify(s.session.inventory.serialize())).toBe(inv);
    expect(s.session.ship.beard.worn).toEqual(['clay_pot_helmet', 'wet_cloth']);
    restoreCheckpoint(s.session, cp);
    expect([s.session.ship.beard.worn, JSON.stringify(s.session.inventory.serialize())]).toEqual([[], inv]);
  });

  it('9. a consumable can\'t be used after it is gone: the last one used, the next is refused and nothing changes', async () => {
    const s = demo();
    await s.run([{ suppliesSystem: true }, { giveItem: 'grog_tot', count: 1, silent: true }, { useSupply: 'grog_tot' }]);
    const sup = s.session.ship.supplies;
    const left = sup.effects.grog_ward.left;
    await s.run([{ useSupply: 'grog_tot', outcomeValue: 'fx_u' }]);
    expect([s.session.story.getValue('fx_u'), has(s, 'grog_tot'), sup.effects.grog_ward.left]).toEqual(['refused', 0, left]);
  });

  it('10. saving in the middle (the pot on, a restock and a cooldown counting, an effect running, mid-salvage): the save is whole and consistent, and goes on the same way', async () => {
    let s = demo();
    await s.run(scenario('D'));
    goTo(s, 'stove');
    s.playHands('perfect');
    await s.run([{ cook: 'bean_stew' }, { giveItem: 'oat_porridge', count: 1, silent: true }, { useSupply: 'oat_porridge' }]);
    goTo(s, 'jugs');
    await s.run([{ supplyTake: 'galley_jugs' }, { hazardClock: 7 }]);
    // Mid-salvage: a save taken as the bar starts holds nothing of it (no half transaction).
    goTo(s, 'wreckage');
    let saved = null;
    s.onAttempt(() => {
      if (!saved) saved = JSON.stringify(s.session.serialize());
    });
    s.playHands('perfect');
    await s.run([{ supplyTake: 'hold_wreckage' }]);
    const mid = JSON.parse(saved);
    expect(mid.ship.supplies.sources.hold_wreckage).toBeUndefined();
    s = reloadStory(s);
    expect(s.record.version).toBe(SAVE_VERSION);
    const ref = JSON.stringify(s.session.ship.serialize());
    const t = reloadStory(s);
    tick(s.session.ship, 45);
    tick(t.session.ship, 45);
    expect(JSON.stringify(t.session.ship.serialize())).toBe(JSON.stringify(s.session.ship.serialize()));
    expect(JSON.parse(ref).supplies).toMatchObject({ on: true, cooking: { recipe: 'bean_stew', serves: 2 } });
  });
});

// ---------------------------------------------------------------------------------------------
describe('saves (version 23)', () => {
  it('versions 17 to 22 load with the supplies off and empty: nothing given retroactively, the pack, its key items and Frog Grog exactly as they were', () => {
    const s = session('p17_complete');
    s.inventory.add('frog_grog', 1);
    const saves = new SaveManager({ storage: new MemoryStorage(), content });
    expect(saves.save(1, s).ok).toBe(true);
    const inv = JSON.stringify(s.inventory.serialize());
    for (const v of [17, 18, 19, 20, 21, 22]) {
      const raw = JSON.parse(JSON.stringify(saves.read(1).state));
      delete raw.ship?.supplies;
      if (v < 18) delete raw.ship;
      const t = GameSession.fromState({ content, bus: new EventBus(), state: raw, strictFlags: true, onWarning: (w) => { throw new Error(w); } });
      expect([v, t.ship.supplies.untouched, t.ship.supplies.on, t.ship.supplies.stores]).toEqual([v, true, false, {}]);
      expect([v, JSON.stringify(t.inventory.serialize())]).toEqual([v, inv]);
    }
  });

  it('damaged supplies data loads safely: unknown stores, items, sources, effects and recipes dropped, key items never stored, numbers clamped, one effect per group', () => {
    const s = session();
    const w = [];
    s.ship.supplies.load({
      on: true,
      stores: { hold: { planks: 7.6, nails: -4, treasure_key: 1, unicorn: 3 }, attic: { planks: 1 } },
      sources: { hold_crates: { left: 99, restockIn: 'x' }, hold_bilge: { cooldown: 1e9 }, the_sea: { left: 1 } },
      effects: { full_belly: { left: 1e6 }, steady_hands: { left: 30 }, invincible: { left: 9 } },
      cooking: { recipe: 'bean_stew', serves: 50, left: -9 },
      charges: { wet_cloth: 999, planks: 3 },
      learned: ['bean_stew', 'cake'],
    }, (x) => w.push(x));
    const u = s.ship.supplies;
    expect(u.on).toBe(true);
    expect(u.stores).toEqual({ hold: { planks: 8 } });
    expect(u.sourceState('hold_crates').left).toBe(1);
    expect(u.sourceState('hold_bilge').cooldown).toBe(120);
    expect(Object.keys(u.effects)).toEqual(['full_belly']);
    expect(u.effects.full_belly.left).toBe(600);
    expect(u.cooking).toEqual({ recipe: 'bean_stew', serves: 2, left: 0 });
    expect(u.charges).toEqual({});
    expect(u.learned).toEqual(['bean_stew']);
    for (const re of [/dropped "treasure_key"/, /dropped "unicorn"/, /dropped store "attic"/, /dropped source "the_sea"/, /dropped effect "invincible"/, /one per group/, /dropped charges for "planks"/, /dropped recipe "cake"/]) expect(w.join('\n')).toMatch(re);
    for (const junk of [null, 7, 'stores', [1, 2]]) {
      s.ship.supplies.load(junk);
      expect(s.ship.supplies.untouched).toBe(true);
    }
  });

  it('what is saved is the state, never a derived value (no totals, no factors, no "ready")', () => {
    const s = session();
    const u = on(s);
    u.stock('hold', 'planks', 3);
    u.applyEffect('full_belly');
    u.take('hold_bilge');
    const keys = JSON.stringify(u.serialize());
    for (const derived of ['total', 'factor', 'ready', 'worn', 'available', 'capacity']) expect(keys).not.toContain(derived);
  });
});

// ---------------------------------------------------------------------------------------------
describe('legacy protection: no chapter opts in', () => {
  it('no chapter script uses a supplies command or condition, gives or takes a supplies-only item, and new games start with the system off', () => {
    const cmds = ['suppliesSystem', 'supplyStore', 'supplyTransfer', 'supplyMenu', 'supplyCheck', 'supplySource', 'supplyTake', 'supplySetback', 'gearEquip', 'gearRecharge', 'useSupply', 'supplyEffect', 'learnRecipe', 'cook', 'serve', 'cookReport'];
    const newItems = ['beans', 'onions', 'oats', 'garlic', 'salt_fish', 'bean_stew', 'oat_porridge', 'fish_chowder', 'garlic_broth', 'grog_tot'];
    for (const [path, json] of Object.entries(FILES)) {
      if (!path.startsWith('/data/story') && !path.startsWith('/data/npcs') && !path.startsWith('/data/maps') && !path.startsWith('/data/quests') && !path.startsWith('/data/dialogue') && !path.startsWith('/data/shops')) continue;
      const text = JSON.stringify(json);
      for (const c of cmds) expect(text.includes(`"${c}":`), `${path} uses ${c}`).toBe(false);
      expect(text.includes('"supplies":'), `${path} uses the supplies condition`).toBe(false);
      for (const item of newItems) expect(new RegExp(`"(giveItem|takeItem|swapItem|hasItem|lacksItem|item)":"${item}"`).test(text), `${path} gives, takes or checks ${item}`).toBe(false);
    }
    const s = GameSession.newGame({ content, bus: new EventBus() });
    expect([s.ship.supplies.on, s.ship.supplies.untouched]).toEqual([false, true]);
    for (const p of content.debugPresets.list()) {
      const t = GameSession.newGame({ content, bus: new EventBus() });
      applyPresetPlan(t, resolvePreset(content, p.id));
      expect(t.ship.supplies.on, p.id).toBe(false);
    }
  });

  it('off, the clock changes nothing, every factor is neutral, the beard\'s cloth and the repair bars are as before, and Respond offers no supplies', () => {
    const s = session();
    const u = s.ship.supplies;
    u.effects = { full_belly: { left: 50 } };
    expect([u.factor('work'), u.factor('hurt'), u.factor('zone'), u.factor('lungs'), barZone(s)]).toEqual([1, 1, 0, 1, BASE_ZONE]);
    const before = JSON.stringify(u.serialize());
    tick(s.ship, 100);
    expect(JSON.stringify(u.serialize())).toBe(before);
    goTo(s, 'crates');
    expect(supplyGroups(s)).toEqual([]);
    expect(u.active).toBe(false);
  });

  it('the checkpoint diff records the supplies, and is empty when nothing changed', () => {
    const s = session();
    const a = s.serialize();
    expect(isEmptyDiff(diffStates(a, s.serialize()))).toBe(true);
    on(s).stock('hold', 'planks', 2);
    const d = diffStates(a, s.serialize());
    expect(d.supplies).toEqual({ on: [null, true], stores: { 'hold:planks': 2 } });
  });
});

// ---------------------------------------------------------------------------------------------
describe('words that fit (320x224)', () => {
  const { fonts } = buildFonts();
  const width = (t) => measure(fonts.main, plain(t));
  it('every Respond label fits the choice box; notices fit a toast in three lines; reports wrap in the dialogue box', async () => {
    const s = demo();
    await s.run([...scenario('D'), { giveItem: 'beans', count: 9 }]);
    const labels = [];
    for (const where of Object.keys(AT)) {
      goTo(s, where);
      for (const g of supplyGroups(s.session)) labels.push(g.label, ...g.list.map((o) => o.label), ...g.list.map((o) => o.reason ?? ''));
    }
    for (const l of labels) expect(width(l), l).toBeLessThanOrEqual(SCREEN_WIDTH - 40);
    const texts = [...recipeReport(s.session), ...storeReport(s.session, 'hold')];
    for (const t of texts) expect(wrap(fonts.main, plain(t), SCREEN_WIDTH - 40).split('\n').length, t).toBeLessThanOrEqual(3);
    goTo(s, 'stove');
    s.playHands('perfect');
    await s.run([{ cook: 'bean_stew' }]);
    for (const n of s.notices.filter((x) => x.kind === 'ship')) expect(wrap(fonts.main, plain(n.text), TOAST_TEXT_WIDTH).split('\n').length, n.text).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------------------------
describe('performance', () => {
  it('a busy minute (effects, restocks, cooldowns, a pot, a drying cloth) costs well under a millisecond a tick', () => {
    const s = session();
    const u = on(s);
    u.applyEffect('full_belly');
    u.applyEffect('grog_ward');
    for (const id of ['galley_jugs', 'galley_sacks', 'hold_bilge', 'hold_sacking']) u.take(id);
    u.startCooking('bean_stew', 2);
    const t0 = performance.now();
    tick(s.ship, 600);
    const per = (performance.now() - t0) / 600;
    expect(per).toBeLessThan(1);
  });

  it('nothing in the store or a source state is kept that isn\'t needed (sparse: a used-then-restocked source drops out)', () => {
    const s = session();
    const u = on(s);
    u.take('galley_sacks');
    tick(s.ship, 240);
    expect(u.sources.galley_sacks).toEqual({ taken: 1 });
    expect(storeDef(content, 'hold').capacity).toBe(60);
  });
});
