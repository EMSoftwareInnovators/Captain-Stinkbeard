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
import { SAVE_VERSION, SCREEN_WIDTH, SCREEN_HEIGHT } from '../src/config/constants.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { captureCheckpoint, restoreCheckpoint, diffStates } from '../src/systems/challenge/checkpoint.js';
import { challengeLog } from '../src/systems/challenge/runner.js';
import { commandNameOf } from '../src/systems/script/commandSchemas.js';
import { scopedEventId, createCommandImplementations } from '../src/systems/script/commands.js';
import { shipTuning } from '../src/systems/ship/integrity.js';
import { hazardDataProblems, floodStage, fireStage, leakSeverityFor, roomLinks, compartmentIds, flammableRooms } from '../src/systems/ship/hazards.js';
import { responseOptions, emergencySummary, emergencyLine, patchCost } from '../src/systems/ship/response.js';
import { HazardClock } from '../src/systems/ship/hazardClock.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { DEBUG_SHIP } from '../src/debug/shipDebug.js';
import { InputManager } from '../src/platform/input/InputManager.js';
import { buildFonts } from '../src/art/font/buildFont.js';
import { ShipPage } from '../src/ui/menu/ShipPage.js';
import { wrap, parseMarkup, measure } from '../src/ui/text.js';
import { TOAST_TEXT_WIDTH } from '../src/ui/Toasts.js';
import { NON_CHALLENGE_COMMANDS } from './regression/harness.js';
import { CHALLENGE_KINDS as REGISTRY } from './regression/challenges.js';
import { makeStory, reloadStory } from './storyHarness.js';

/**
 * Leaks, flooding, fire and the emergency response
 * (docs/gameplay-overhaul/10-flooding-and-fire.md). Deterministic: hazard time
 * is ticked by hand (or by the work actions, tick by tick), repairs and
 * patches are the game's own timing bar played by simulated hands on fixed
 * seeds. The browser half (the HUD, Respond, the Ship page with keyboard and
 * pad, save and Continue) is e2e/hazards.spec.js. No chapter uses any of it.
 */
const content = loadContent();
const FILES = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' });
const DIFFS = ['deckhand', 'captain', 'brutal'];
const T = (d = 'captain') => shipTuning(content, d);
const tick = (hz, n = 1, d = 'captain') => {
  for (let i = 0; i < n; i++) hz.tick(T(d));
};

function session(preset = 'p17_complete') {
  const s = GameSession.newGame({ content, bus: new EventBus(), strictFlags: true });
  applyPresetPlan(s, resolvePreset(content, preset));
  return s;
}
/** The emergency demo: the end of Phase 17, in the cargo hold by the bilge pump, with supplies. */
const demo = (opts = {}) => makeStory({ preset: 'hazard_demo', ...opts });
const units = (hz, room) => hz.waterIn(room).units;
const holdWater = (hz) => ['cargo_hold', 'treasure_hold', 'fart_free_zone'].reduce((n, r) => n + units(hz, r), 0);
const held = (s) => Object.fromEntries(['planks', 'nails', 'rope', 'sailcloth'].map((m) => [m, s.inventory.count(m)]));
/** A breach in a hull: two hits that hole it, the same on every difficulty (the demo's scenario A). */
const BREACH = (section = 'hull_port') => [
  { shipDamage: section, amount: 60, category: 'cannon', breach: true, scale: false },
  { shipDamage: section, amount: 10, category: 'cannon', breach: true, scale: false },
];
const noticesOf = (bus) => {
  const out = [];
  bus.on('hazard:notice', (n) => out.push(n));
  return out;
};

// ---------------------------------------------------------------------------------------------
describe('the hazard model and its data', () => {
  it('is keyed by rooms and sections, with water and fire moving only where the captain could walk', () => {
    expect(hazardDataProblems(content)).toEqual([]);
    expect(validateContent(content).errors).toEqual([]);
    const links = roomLinks(content);
    for (const f of content.shipHazards.flow) expect([f.from, f.to, links.get(f.from)?.has(f.to)]).toEqual([f.from, f.to, true]);
    for (const room of flammableRooms(content)) for (const to of content.shipHazards.fire.rooms[room].spread) expect([room, to, links.get(room).has(to)]).toEqual([room, to, true]);
    expect(compartmentIds(content)).toEqual(['cargo_hold', 'treasure_hold', 'fart_free_zone', 'galley', 'crew_quarters', 'washroom']);
    expect(flammableRooms(content)).toEqual(['main_deck', 'captains_quarters', 'galley', 'crew_quarters', 'cargo_hold', 'treasure_hold']);
    // Nothing in the hazard data is a tile.
    expect(JSON.stringify(content.shipHazards)).not.toMatch(/"(x|y|tiles?)":/);
  });

  it('bad hazard data and bad steps are content errors', () => {
    const files = structuredClone(FILES);
    const hz = files['/data/ship/hazards.json'];
    hz.flow.push({ from: 'galley', to: 'washroom', kind: 'spill', sill: 10, rate: 2 });
    hz.compartments.washroom.x = 3;
    hz.fire.rooms.galley.burns.push({ section: 'deck' });
    hz.fire.rooms.galley.spread.push('washroom');
    hz.stations.bilge_pump.drains = ['main_deck'];
    hz.actions.patch.cost.seep = [{ item: 'hardtack', count: 1 }];
    hz.floodStages[3].work = 0.5;
    hz.leaks.sections.stern = { room: 'cargo_hold' };
    files['/data/story/cutscenes/zz_hazard_fixture.json'] = {
      'zz.hazard_bad': [
        { leak: 'deck' },
        { flood: 'main_deck', amount: 5 },
        { ignite: 'washroom' },
        { ignite: 'galley', intensity: 150 },
        { shipDamage: 'hull_port', amount: 5, breach: true, room: 'washroom' },
        { shipDamage: 'hull_port', amount: 5, room: 'galley' },
        { hazardAction: 'teleport' },
        { patchLeak: 5 },
        { if: { hazard: { fire: 'washroom' } }, then: [{ wait: 1 }] },
        { if: { hazard: { water: 'cargo_hold', stage: 'boiling' } }, then: [{ wait: 1 }] },
        { if: { hazard: { colour: 'red' } }, then: [{ wait: 1 }] },
      ],
    };
    const errors = validateContent(new ContentDB(files)).errors.join('\n');
    expect(errors).toMatch(/galley and washroom don't open onto each other \(no warp between them\): water can't teleport/);
    expect(errors).toMatch(/compartments.washroom\): a compartment is a room, never tiles/);
    expect(errors).toMatch(/fire.rooms.galley\): a fire here can't reach the deck/);
    expect(errors).toMatch(/fire.rooms.galley\): spreads to "washroom", which can't burn/);
    expect(errors).toMatch(/stations.bilge_pump\): drains "main_deck", not a compartment/);
    expect(errors).toMatch(/actions.patch.cost.seep\): "hardtack" is not a material/);
    expect(errors).toMatch(/flood stage "serious" work must be 1 to 3/);
    expect(errors).toMatch(/leaks.stern\): the stern isn't worked from "cargo_hold"/);
    expect(errors).toMatch(/the deck can't leak/);
    expect(errors).toMatch(/"main_deck" can't hold water/);
    expect(errors).toMatch(/"washroom" can't burn/);
    expect(errors).toMatch(/ignite: "intensity" must be 1 to 100/);
    expect(errors).toMatch(/shipDamage: "washroom" isn't one of the hull_port's rooms/);
    expect(errors).toMatch(/shipDamage: "room" only matters with "breach": true/);
    expect(errors).toMatch(/unknown emergency action "teleport"/);
    expect(errors).toMatch(/patchLeak: true \(the worst leak here\) or a leak id/);
    expect(errors).toMatch(/hazard condition: "washroom" can't burn/);
    expect(errors).toMatch(/hazard condition: unknown stage "boiling"/);
    expect(errors).toMatch(/hazard condition: unknown key "colour"/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('leaks', () => {
  it('open only from damage that says so, as bad as the hull now is, into the section\'s room', () => {
    const s = session();
    const hz = s.ship.hazards;
    // An ordinary blow (every story's shipDamage) never holes the hull, however hard.
    s.ship.applyDamage({ section: 'hull_port', amount: 95, tuning: { grace: true } });
    expect(hz.leaks).toEqual([]);
    const t = session();
    const h = t.ship.hazards;
    const hit = (amount) => t.ship.applyDamage({ section: 'hull_starboard', amount, breach: true });
    hit(20); // 80%: a scratch
    expect(h.leaks).toEqual([]);
    hit(30); // 50%: a seep
    expect(h.leaks).toMatchObject([{ section: 'hull_starboard', room: 'cargo_hold', severity: 'seep', state: 'open' }]);
    hit(25); // 25%: the same leak, worse
    expect(h.leaks).toMatchObject([{ id: 'leak_1', severity: 'leak' }]);
    hit(15); // 10%: a breach
    expect(h.leaks).toMatchObject([{ id: 'leak_1', severity: 'breach' }]);
    expect(t.ship.destroyed).toBe(false);
    // A blow can land in another of the section's floodable rooms; a room it doesn't have is refused.
    expect(t.ship.applyDamage({ section: 'hull_starboard', amount: 1, breach: true, room: 'galley' }).leak).toMatchObject({ ok: true, opened: true, leak: { room: 'galley' } });
    expect(h.openLeak({ section: 'hull_starboard', room: 'washroom', severity: 'leak' })).toMatchObject({ ok: false, reason: 'room not on that section' });
    expect(h.openLeak({ section: 'deck', severity: 'leak' })).toMatchObject({ ok: false, reason: 'section cannot leak' });
    expect(h.openLeak({ section: 'hull_port', room: 'main_deck', severity: 'leak' })).toMatchObject({ ok: false, reason: 'not a compartment' });
    expect(h.openLeak({ section: 'hull_port', severity: 'gushing' })).toMatchObject({ ok: false, reason: 'unknown severity' });
    expect(h.leaks.length).toBe(2);
  });

  it('pour in at their severity\'s rate; several at once add up', () => {
    const s = session();
    const hz = s.ship.hazards;
    expect(leakSeverityFor(content.shipHazards, 59).id).toBe('seep');
    expect(leakSeverityFor(content.shipHazards, 29).id).toBe('leak');
    expect(leakSeverityFor(content.shipHazards, 14).id).toBe('breach');
    expect(leakSeverityFor(content.shipHazards, 60)).toBe(null);
    hz.openLeak({ section: 'hull_port', severity: 'seep' });
    tick(hz, 10);
    expect(units(hz, 'cargo_hold')).toBeCloseTo(6, 5);
    hz.openLeak({ section: 'hull_starboard', severity: 'breach' });
    hz.openLeak({ section: 'bow', severity: 'leak' }); // into the crew quarters
    tick(hz, 4);
    expect(units(hz, 'cargo_hold')).toBeCloseTo(6 + 4 * (0.6 + 3), 5);
    expect(units(hz, 'crew_quarters')).toBeCloseTo(6, 5);
    expect(hz.leaks.map((l) => [l.section, l.room, l.severity])).toEqual([['hull_port', 'cargo_hold', 'seep'], ['hull_starboard', 'cargo_hold', 'breach'], ['bow', 'crew_quarters', 'leak']]);
  });

  it('follow the hull: a repair eases them and, once the section is sound, seals them; the water stays', () => {
    const s = session();
    const hz = s.ship.hazards;
    s.ship.applyDamage({ section: 'hull_port', amount: 90, breach: true }); // 10%: breach
    tick(hz, 10);
    const water = units(hz, 'cargo_hold');
    s.ship.restore('hull_port', 30); // 40%: a seep now
    expect(hz.leaks).toMatchObject([{ severity: 'seep', state: 'open' }]);
    s.ship.restore('hull_port', 20); // 60%: sealed
    expect(hz.leaks).toEqual([]);
    expect(units(hz, 'cargo_hold')).toBe(water); // a repair doesn't bail
  });

  it('a patch closes a leak without restoring the hull or removing water; a new hole tears it open', () => {
    const s = session();
    const hz = s.ship.hazards;
    s.ship.applyDamage({ section: 'hull_port', amount: 75, breach: true }); // 25%: leak
    tick(hz, 5);
    const hp = s.ship.section('hull_port').hp;
    const water = units(hz, 'cargo_hold');
    expect(hz.patchLeak('leak_1', 'success')).toMatchObject({ ok: true });
    expect([s.ship.section('hull_port').hp, units(hz, 'cargo_hold')]).toEqual([hp, water]);
    tick(hz, 5);
    expect(units(hz, 'cargo_hold')).toBe(water); // closed: no more coming in (and the hold is below its sills)
    s.ship.applyDamage({ section: 'hull_port', amount: 5 }); // an ordinary blow doesn't tear it
    expect(hz.leaks[0].state).toBe('patched');
    s.ship.applyDamage({ section: 'hull_port', amount: 5, breach: true });
    expect(hz.leaks[0].state).toBe('open');
    // A rough patch halves it.
    hz.patchLeak('leak_1', 'partial');
    expect(hz.leakRate(hz.leaks[0])).toBeCloseTo(0.75, 5);
  });
});

// ---------------------------------------------------------------------------------------------
describe('flooding', () => {
  it('has stages by percentage of a compartment, and never goes past full or below dry', () => {
    const d = content.shipHazards;
    expect([0, 0.9, 1, 10, 35, 65, 95, 100].map((p) => floodStage(d, p).id)).toEqual(['dry', 'dry', 'damp', 'shallow', 'serious', 'critical', 'flooded', 'flooded']);
    const s = session();
    const hz = s.ship.hazards;
    expect(hz.addWater('cargo_hold', 1000)).toBe(240);
    expect(hz.waterIn('cargo_hold')).toMatchObject({ pct: 100, stage: { id: 'flooded', canWork: false } });
    expect(hz.removeWater('cargo_hold', 1000)).toBe(240);
    expect(units(hz, 'cargo_hold')).toBe(0);
    for (const bad of [0, -5, Number.NaN, 'lots']) expect(hz.addWater('cargo_hold', bad)).toBe(0);
    expect(hz.addWater('main_deck', 10)).toBe(0); // the deck sheds water over the side
    expect(hz.any).toBe(false);
  });

  it('runs downhill and over door sills along the data\'s links only, and none is lost on the way', () => {
    const s = session();
    const hz = s.ship.hazards;
    // Into the galley below its door sill (15%): it all runs down the hold stairs, 4 a tick.
    hz.addWater('galley', 20);
    tick(hz, 5);
    expect([units(hz, 'galley'), units(hz, 'cargo_hold'), units(hz, 'crew_quarters')]).toEqual([0, 20, 0]);
    // Above the sill, some spills through the door into the crew quarters before the rest runs down (and stays there: a bucket's job).
    hz.addWater('galley', 40);
    tick(hz, 10);
    expect(units(hz, 'galley')).toBe(0);
    expect(units(hz, 'crew_quarters')).toBeGreaterThan(0);
    expect(units(hz, 'cargo_hold') + units(hz, 'crew_quarters')).toBeCloseTo(60, 5);
    // Below the door sills (25%) the side rooms stay dry; above, the hold spills into them, both ways, till level.
    expect([units(hz, 'treasure_hold'), units(hz, 'fart_free_zone')]).toEqual([0, 0]);
    hz.addWater('cargo_hold', 80); // 50%
    const before = holdWater(hz);
    tick(hz, 60);
    expect(units(hz, 'treasure_hold')).toBeGreaterThan(0);
    expect(holdWater(hz)).toBeCloseTo(before, 5);
    expect(hz.waterIn('cargo_hold').exact).toBeGreaterThanOrEqual(25);
    // The washroom reaches the hold only by way of the crew quarters and the galley: never straight.
    const t = session();
    const h = t.ship.hazards;
    h.addWater('washroom', 50);
    tick(h, 1);
    expect([units(h, 'treasure_hold'), units(h, 'cargo_hold'), units(h, 'galley')]).toEqual([0, 0, 0]);
    expect(units(h, 'crew_quarters')).toBeGreaterThan(0);
  });

  it('has real effects: slower work and poorer repairs in deep water, none at all when it\'s too deep, a slower walk, a listing ship that strains its hull', () => {
    const s = demo();
    const hz = s.session.ship.hazards;
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    hz.addWater('cargo_hold', 100); // 42%: serious
    expect(responseOptions(s.session).find((o) => o.action === 'pump').seconds).toBe(8); // 6 x 1.25
    expect(hz.waterIn('cargo_hold').stage.wade).toBe(1.25);
    const before = s.session.ship.section('hull_port').hp;
    s.session.inventory.add('nails', 5);
    // A repair from the hold restores 75% of what it would.
    return s.run([{ shipRepair: 'hull_port' }]).then(async () => {
      expect(s.session.ship.section('hull_port').hp).toBe(before + Math.round(35 * 0.75));
      hz.addWater('cargo_hold', 1000);
      expect(responseOptions(s.session).find((o) => o.action === 'pump').ok).toBe(true);
      expect(s.session.ship.hazards.waterIn('cargo_hold').stage.id).toBe('flooded');
      hz.openLeak({ section: 'hull_port', severity: 'leak' });
      const patch = responseOptions(s.session).find((o) => o.action === 'patch');
      expect(patch).toMatchObject({ ok: false, reason: 'Too deep to work in the Cargo Hold: pump it down first.' });
      // The hold is full: listing; past 70% of the hold deck, foundering, and the hulls strain (no new leak).
      hz.addWater('treasure_hold', 1000);
      expect(hz.stability().state).toBe('foundering');
      expect(evaluateCondition({ hazard: { stability: 'foundering' } }, s.session)).toBe(true);
      const leaks = hz.leaks.length;
      const hulls = [s.session.ship.section('hull_port').hp, s.session.ship.section('hull_starboard').hp];
      tick(hz, 10);
      expect([s.session.ship.section('hull_port').hp, s.session.ship.section('hull_starboard').hp]).toEqual([hulls[0] - 1, hulls[1] - 1]);
      expect(hz.leaks.length).toBe(leaks);
    });
  });
});

// ---------------------------------------------------------------------------------------------
describe('pumping and bailing', () => {
  it('pumping works the whole bilge, deepest first, over its seconds; the hold\'s water drops by exactly what it moved', async () => {
    const s = demo();
    const hz = s.session.ship.hazards;
    hz.addWater('cargo_hold', 120);
    const t0 = hz.time;
    const before = holdWater(hz);
    await s.run([{ hazardAction: 'pump' }]);
    expect(hz.time - t0).toBe(8); // 6 s, x1.25 in serious water: the rest of the ship had its 8 seconds too
    expect(holdWater(hz)).toBeCloseTo(before - 24, 5);
    expect(s.notices.at(-1).text).toMatch(/^Pumped 24: Cargo Hold water \d+% (SHALLOW|SERIOUS)\.$/);
  });

  it('bailing is slower than the pump, and a breach outpaces it: water still rises while he bails', async () => {
    const s = demo();
    const hz = s.session.ship.hazards;
    await s.run(BREACH());
    expect(hz.leaks).toMatchObject([{ severity: 'breach' }]);
    tick(hz, 5);
    const w = units(hz, 'cargo_hold');
    await s.run([{ hazardAction: 'bail' }]);
    expect(units(hz, 'cargo_hold')).toBeGreaterThan(w); // 4 s: +12 in, -8 out
    expect(units(hz, 'cargo_hold')).toBeCloseTo(w + 4 * 3 - 8, 5);
    // The pump just keeps ahead of a breach on Captain; on Brutal it can't: patch it.
    const pumped = (d) => {
      const t = demo({ prefs: { difficulty: d } });
      const h = t.session.ship.hazards;
      h.openLeak({ section: 'hull_port', severity: 'breach' });
      h.addWater('cargo_hold', 50);
      return t.run([{ hazardAction: 'pump' }]).then(() => units(h, 'cargo_hold') - 50);
    };
    expect(await pumped('captain')).toBeLessThan(0);
    expect(await pumped('brutal')).toBeGreaterThan(0);
  });

  it('can\'t be spammed: one action at a time, each costing its time; refused where it can\'t be done, and said why', async () => {
    const s = demo();
    const hz = s.session.ship.hazards;
    hz.addWater('cargo_hold', 60);
    const t0 = hz.time;
    await Promise.all([s.run([{ hazardAction: 'pump' }]), s.run([{ hazardAction: 'pump' }])]);
    expect(hz.time - t0).toBe(6);
    expect(units(hz, 'cargo_hold')).toBeCloseTo(36, 5);
    expect(s.notices.some((n) => /Already at work/.test(n.text))).toBe(true);
    expect(hz.working).toBe(false);
    // Nothing to pump; bailing a dry room isn't offered; no pump anywhere but the hold.
    hz.removeWater('cargo_hold', 1000);
    const pump = () => responseOptions(s.session).find((o) => o.action === 'pump');
    expect(pump()).toMatchObject({ ok: false, reason: 'The bilge is dry: nothing to pump.' });
    expect(responseOptions(s.session).find((o) => o.action === 'bail')).toBeUndefined();
    // Water in the galley is out of the pump's reach until it has run down to the bilge.
    hz.addWater('galley', 20);
    expect(pump()).toMatchObject({ ok: false });
    tick(hz, 5);
    expect(pump()).toMatchObject({ ok: true, reason: null });
    hz.removeWater('cargo_hold', 1000);
    s.session.location.map = 'galley';
    hz.addWater('galley', 30);
    expect(responseOptions(s.session).map((o) => o.action)).toEqual(['bail']);
    await s.run([{ hazardAction: 'pump', outcomeValue: 'fx_out' }]);
    expect(s.session.story.getValue('fx_out')).toBe('refused');
  });
});

// ---------------------------------------------------------------------------------------------
describe('patching a leak (a challenge)', () => {
  it('success: the materials, the timing bar, the patching time with the leak still pouring, then closed; hull and water untouched', async () => {
    const s = demo();
    const hz = s.session.ship.hazards;
    await s.run(BREACH());
    tick(hz, 5);
    const hp = s.session.ship.section('hull_port').hp;
    const w = units(hz, 'cargo_hold');
    const before = held(s.session);
    expect(patchCost(content, 'breach', 'captain')).toEqual([{ item: 'planks', count: 2 }, { item: 'nails', count: 2 }, { item: 'sailcloth', count: 1 }]);
    await s.run([{ patchLeak: true, outcomeValue: 'fx_patch' }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ id: 'leak:leak_1', kind: 'repair', outcome: 'success' });
    expect(s.session.story.getValue('fx_patch')).toBe('success');
    expect(hz.leaks).toMatchObject([{ id: 'leak_1', state: 'patched' }]);
    expect(held(s.session)).toEqual({ ...before, planks: before.planks - 2, nails: before.nails - 2, sailcloth: before.sailcloth - 1 });
    expect(s.session.ship.section('hull_port').hp).toBe(hp);
    expect(units(hz, 'cargo_hold')).toBeCloseTo(w + 4 * 3, 5); // four seconds of work, the breach still open
    expect(s.challengeRecords.at(-1).transitions.hazards).toMatchObject({ leaks: [1, 0] });
  });

  it('partial halves it; failure wastes a nail per try, the tries end with the materials, and the leak stays open', async () => {
    const s = demo();
    const hz = s.session.ship.hazards;
    await s.run(BREACH());
    s.playHands({ fumbles: 1 });
    await s.run([{ patchLeak: true }]);
    expect(s.challengeRecords.at(-1).outcome).toBe('partial');
    expect(hz.leaks).toMatchObject([{ state: 'open', slowed: true }]);
    const t = demo();
    const h = t.session.ship.hazards;
    await t.run(BREACH());
    for (const m of ['planks', 'nails', 'sailcloth']) t.session.inventory.remove(m, t.session.inventory.count(m));
    t.session.inventory.add('planks', 2);
    t.session.inventory.add('nails', 3);
    t.session.inventory.add('sailcloth', 1);
    t.playHands('fumble', 'fumble');
    await t.run([{ patchLeak: true }]);
    expect(t.challengeRecords.at(-1)).toMatchObject({ outcome: 'failure', attempt: 2, maxAttempts: 2 });
    expect(held(t.session)).toMatchObject({ planks: 2, nails: 1, sailcloth: 1 });
    expect(h.leaks).toMatchObject([{ state: 'open', slowed: false }]);
    expect(t.notices.at(-1).text).toBe('<r>The patch failed.</> <k>Wasted 2 Nails.</>');
    // Short of materials: refused, nothing taken, no bar.
    const bars = t.challengeAttempts.length;
    await t.run([{ patchLeak: true }]);
    expect(t.challengeAttempts.length).toBe(bars);
    expect(t.notices.at(-1).text).toBe('<r>Not enough: Nails 1/2.</>');
  });
});

// ---------------------------------------------------------------------------------------------
describe('fire', () => {
  it('starts only where something can burn and isn\'t awash, and grows while it has fuel', () => {
    const s = session();
    const hz = s.ship.hazards;
    expect(hz.ignite({ room: 'washroom' })).toMatchObject({ ok: false, reason: 'room cannot burn' });
    expect(hz.ignite({ room: 'nowhere' })).toMatchObject({ ok: false, reason: 'room cannot burn' });
    hz.addWater('cargo_hold', 100);
    expect(hz.ignite({ room: 'cargo_hold' })).toMatchObject({ ok: false, reason: 'too wet to burn' });
    expect(hz.ignite({ room: 'main_deck', intensity: 20 })).toMatchObject({ ok: true, started: true });
    tick(hz, 10);
    expect(hz.fireIn('main_deck').intensity).toBeCloseTo(26, 5);
    expect([0, 1, 25, 60, 90].map((i) => fireStage(content.shipHazards, i).id)).toEqual(['out', 'smouldering', 'burning', 'blazing', 'inferno']);
  });

  it('damages only the sections its room\'s data names, from the stage named, and nothing once it\'s out', () => {
    const s = session();
    const hz = s.ship.hazards;
    hz.ignite({ room: 'main_deck', intensity: 40, spread: false });
    tick(hz, 20);
    const after = s.ship.serialize().sections;
    expect(after.deck).toBeLessThan(60);
    expect([after.rigging, after.hull_port, after.hull_starboard, after.bow, after.stern]).toEqual([60, 100, 100, 80, 80]);
    hz.fireIn('main_deck');
    hz.fires[0].intensity = 70; // blazing: the rigging catches too
    tick(hz, 5);
    expect(s.ship.section('rigging').hp).toBeLessThan(60);
    expect(hz.extinguish('main_deck')).toBe(true);
    const out = s.ship.serialize().sections;
    tick(hz, 30);
    expect(s.ship.serialize().sections).toEqual(out);
    // A galley fire doesn't touch the hull until it blazes.
    const t = session();
    t.ship.hazards.ignite({ room: 'galley', intensity: 30, spread: false });
    tick(t.ship.hazards, 20);
    expect(t.ship.section('hull_port').hp).toBe(100);
  });

  it('left alone it burns out: bounded fuel, bounded damage', () => {
    const s = session();
    const hz = s.ship.hazards;
    hz.ignite({ room: 'captains_quarters', intensity: 10, spread: false });
    let n = 0;
    while (hz.fires.length && n < 1000) {
      tick(hz, 1);
      n += 1;
    }
    expect(hz.fires).toEqual([]);
    expect(n).toBeLessThan(400);
    expect(s.ship.section('stern').hp).toBeGreaterThan(0);
    // What burned is gone: the room can't catch again, and the save remembers it.
    expect(hz.fuelLeft('captains_quarters')).toBe(0);
    expect(hz.ignite({ room: 'captains_quarters', intensity: 50 })).toMatchObject({ ok: false, reason: 'nothing left to burn' });
    expect(hz.serialize().fuel).toEqual({ captains_quarters: 0 });
  });

  it('a fire put out early keeps its room\'s unburnt fuel for next time; left alone on Brutal, every fire on the ship still ends', () => {
    const s = session();
    const hz = s.ship.hazards;
    hz.ignite({ room: 'galley', intensity: 30, spread: false });
    tick(hz, 10);
    const left = hz.fireIn('galley').fuel;
    hz.extinguish('galley');
    expect(hz.fuelLeft('galley')).toBe(left);
    hz.ignite({ room: 'galley', intensity: 10 });
    expect(hz.fireIn('galley').fuel).toBe(left);
    // The worst case: a galley fire nobody answers, on Brutal. It spreads, but each room burns its fuel once.
    const t = session();
    const h = t.ship.hazards;
    const total = flammableRooms(content).reduce((n, r) => n + content.shipHazards.fire.rooms[r].fuel, 0);
    h.ignite({ room: 'galley', intensity: 10 });
    let n = 0;
    while (h.fires.length && n < 2000) {
      tick(h, 1, 'brutal');
      n += 1;
    }
    expect(h.fires).toEqual([]);
    expect(n).toBeLessThan(900);
    const burned = flammableRooms(content).reduce((m, r) => m + (content.shipHazards.fire.rooms[r].fuel - h.fuelLeft(r)), 0);
    expect(burned).toBeLessThanOrEqual(total);
  });

  it('spreads only after blazing a while, one room at a time, along its data, never into a flooded room or when told not to', () => {
    const s = session();
    const hz = s.ship.hazards;
    const notices = noticesOf(s.bus);
    hz.ignite({ room: 'galley', intensity: 60 });
    tick(hz, 19);
    expect(hz.fires.map((f) => f.room)).toEqual(['galley']);
    tick(hz, 1);
    expect(hz.fires.map((f) => f.room)).toEqual(['galley', 'cargo_hold']); // the first of its spread list
    expect(hz.fireIn('cargo_hold').intensity).toBe(10);
    expect(notices.some((n) => /spread<\/> from the Galley to the Cargo Hold!/.test(n.text))).toBe(true);
    // A flooded room doesn't catch: the next in the list does.
    const t = session();
    const h = t.ship.hazards;
    h.addWater('cargo_hold', 200); // 83%: still 45% after it spills into the side rooms (too wet to catch from 35%)
    h.ignite({ room: 'galley', intensity: 60 });
    tick(h, 20);
    expect(h.fires.map((f) => f.room)).toEqual(['galley', 'main_deck']);
    // spread: false keeps it home.
    const u = session();
    u.ship.hazards.ignite({ room: 'galley', intensity: 60, spread: false });
    tick(u.ship.hazards, 60);
    expect(u.ship.hazards.fires.map((f) => f.room)).toEqual(['galley']);
    // However long, no more fires than rooms that can burn.
    const v = session();
    v.ship.hazards.ignite({ room: 'main_deck', intensity: 90 });
    for (let i = 0; i < 300; i++) {
      tick(v.ship.hazards, 1);
      for (const f of v.ship.hazards.fires) if (f.intensity < 61) f.intensity = 80; // keep them all blazing
    }
    expect(v.ship.hazards.fires.length).toBeLessThanOrEqual(flammableRooms(content).length);
  });

  it('water in the same room slows or drowns it; water anywhere else changes nothing', () => {
    const s = session();
    const hz = s.ship.hazards;
    hz.ignite({ room: 'galley', intensity: 50, spread: false });
    hz.addWater('cargo_hold', 240); // the hold full: not the galley
    tick(hz, 5);
    expect(hz.fireIn('galley').intensity).toBeCloseTo(53, 5);
    hz.removeWater('cargo_hold', 1000);
    hz.addWater('crew_quarters', 0); // nothing
    // Water into the galley itself (with the hold full so it can't drain away): slowed, then drowned.
    hz.addWater('cargo_hold', 240);
    hz.addWater('galley', 60); // 37%: slows
    tick(hz, 1);
    expect(hz.fireIn('galley').intensity).toBeCloseTo(50, 5);
    hz.addWater('galley', 60); // 75%: drowns
    tick(hz, 1);
    expect(hz.fireIn('galley')).toBe(null);
  });

  it('dousing needs water to hand: the sea, the cask, the flood, or buckets carried; smothering costs sailcloth', async () => {
    const s = demo();
    const hz = s.session.ship.hazards;
    s.session.location.map = 'crew_quarters';
    await s.run([{ ignite: 'crew_quarters', intensity: 40, spread: false }]);
    expect(responseOptions(s.session).find((o) => o.action === 'douse')).toMatchObject({ ok: false, reason: 'No water to hand: fill the buckets first.' });
    // To the galley's water cask, fill up, back, douse.
    s.session.location.map = 'galley';
    expect(responseOptions(s.session).map((o) => o.action)).toEqual(['fetch']);
    await s.run([{ hazardAction: 'fetch' }]);
    expect(hz.buckets).toBe(3);
    s.session.location.map = 'crew_quarters';
    const before = hz.fireIn('crew_quarters').intensity;
    await s.run([{ hazardAction: 'douse' }]);
    expect(hz.buckets).toBe(2);
    expect(hz.fireIn('crew_quarters').intensity).toBeCloseTo(before + 3 * 0.6 - 25, 5);
    const sail = s.session.inventory.count('sailcloth');
    await s.run([{ hazardAction: 'smother' }]);
    expect(s.session.inventory.count('sailcloth')).toBe(sail - 1);
    expect(hz.fireIn('crew_quarters')).toBe(null);
    // The flood itself is water to hand (and scooping it lowers it).
    const t = demo();
    const h = t.session.ship.hazards;
    h.addWater('cargo_hold', 40);
    await t.run([{ ignite: 'treasure_hold', intensity: 30 }]);
    await t.run([{ hazardAction: 'fetch' }]);
    expect(h.buckets).toBe(3);
    expect(units(h, 'cargo_hold')).toBeCloseTo(40 - 18, 5);
  });

  it('a fire blocks the pump in its room and the repair of what it burns until it\'s out', async () => {
    const s = demo();
    const hz = s.session.ship.hazards;
    hz.addWater('cargo_hold', 40);
    s.session.ship.applyDamage({ section: 'hull_port', amount: 40 });
    await s.run([{ ignite: 'cargo_hold', intensity: 30, spread: false }]);
    expect(responseOptions(s.session).find((o) => o.action === 'pump')).toMatchObject({ ok: false, reason: 'The pump is in the fire: put it out first.' });
    await s.run([{ shipRepair: 'hull_port', outcomeValue: 'fx_rep' }]);
    expect(s.session.story.getValue('fx_rep')).toBe('refused');
    expect(s.notices.at(-1).text).toBe('<r>Put out the fire in the Cargo Hold first.</>');
    await s.run([{ hazardAction: 'douse' }, { hazardAction: 'douse' }]);
    expect(hz.fireIn('cargo_hold')).toBe(null);
    expect(responseOptions(s.session).find((o) => o.action === 'pump').ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
describe('difficulty and fairness', () => {
  it('scales leaks, fire and the response from the ship\'s own difficulty tuning; assists don\'t touch it', () => {
    expect(DIFFS.map((d) => [T(d).leakScale, T(d).fireScale, T(d).responseScale])).toEqual([[0.6, 0.6, 1.3], [1, 1, 1], [1.3, 1.3, 0.85]]);
    for (const d of DIFFS) {
      const s = session();
      const hz = s.ship.hazards;
      hz.openLeak({ section: 'hull_port', severity: 'breach' });
      hz.ignite({ room: 'main_deck', intensity: 20, spread: false });
      tick(hz, 10, d);
      expect([d, units(hz, 'cargo_hold')]).toEqual([d, Math.round(10 * 3 * T(d).leakScale * 100) / 100]);
      expect(hz.fireIn('main_deck').intensity).toBeCloseTo(20 + 10 * 0.6 * T(d).fireScale, 4);
    }
    // The assists are per-attempt timing help; the hazards never read them.
    expect(JSON.stringify(Object.keys(T('captain')))).not.toMatch(/assist|classic/i);
  });

  it('every difficulty can recover: a breach, a fire, and both at once, handled the way a player would', async () => {
    for (const d of DIFFS) {
      // A. A breach in the hold: a moment to notice, patch it, pump the bilge dry.
      const a = demo({ prefs: { difficulty: d } });
      const ha = a.session.ship.hazards;
      await a.run(BREACH());
      await a.run([{ hazardClock: 10 }, { patchLeak: true }]);
      for (let i = 0; i < 20 && holdWater(ha) > 0; i++) await a.run([{ hazardAction: 'pump' }]);
      expect([d, 'A', ha.active, a.session.ship.destroyed, ha.time <= 150]).toEqual([d, 'A', false, false, true]);
      // B. A fire in the crew quarters: to the galley's cask, back, douse it out.
      const b = demo({ prefs: { difficulty: d } });
      const hb = b.session.ship.hazards;
      b.session.location.map = 'crew_quarters';
      await b.run([{ ignite: 'crew_quarters', intensity: 35 }, { hazardClock: 10 }]);
      b.session.location.map = 'galley';
      await b.run([{ hazardAction: 'fetch' }, { hazardClock: 4 }]);
      b.session.location.map = 'crew_quarters';
      for (let i = 0; i < 6 && hb.fireIn('crew_quarters'); i++) await b.run([{ hazardAction: 'douse' }]);
      expect([d, 'B', hb.fires.length, b.session.ship.section('bow').hp > 50]).toEqual([d, 'B', 0, true]);
      // C. The galley burning and the hold breached: patch first, then the fire before it reaches the pump, then pump.
      const c = demo({ prefs: { difficulty: d } });
      const hc = c.session.ship.hazards;
      await c.run([{ ignite: 'galley', intensity: 40 }, ...BREACH('hull_starboard'), { hazardClock: 8 }, { patchLeak: true }, { hazardClock: 3 }]);
      c.session.location.map = 'galley';
      for (let i = 0; i < 6 && hc.fireIn('galley'); i++) await c.run([{ hazardAction: 'douse' }]);
      await c.run([{ hazardClock: 3 }]);
      c.session.location.map = 'cargo_hold';
      for (let i = 0; i < 6 && hc.fires.length; i++) await c.run([{ hazardAction: 'douse' }]);
      for (let i = 0; i < 25 && holdWater(hc) > 0; i++) await c.run([{ hazardAction: 'pump' }]);
      expect([d, 'C', hc.active, c.session.ship.destroyed]).toEqual([d, 'C', false, false]);
    }
  });

  it('a single breach gives at least half a minute before the hold is critical, on every difficulty', () => {
    for (const d of DIFFS) {
      const s = session();
      const hz = s.ship.hazards;
      hz.openLeak({ section: 'hull_port', severity: 'breach' });
      let n = 0;
      while (hz.waterIn('cargo_hold').stage.id !== 'critical' && n < 1000) {
        tick(hz, 1, d);
        n += 1;
      }
      expect([d, n >= 30]).toEqual([d, true]);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('retry-safe damage events', () => {
  const STRICT = (over = {}) => ({ failure: true, mechanics: { maxFumbles: 1 }, outcomes: { failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' }, ...over });

  it('1. one callback firing twice in one charge lands once; 4. separate hits each land', async () => {
    const s = demo();
    s.playHands('fumble', 'perfect');
    await s.run([{
      repair: 'hull', strikes: 2,
      challenge: STRICT({ id: 'fx_ev1', onFailure: { mustRetry: true, costs: [
        { shipDamage: 'bow', amount: 5, scale: false, announce: false, eventId: 'hit' },
        { shipDamage: 'bow', amount: 5, scale: false, announce: false, eventId: 'hit' },
        { shipDamage: 'bow', amount: 3, scale: false, announce: false, eventId: 'other_hit' },
      ] } }),
    }]);
    expect(s.session.ship.section('bow').hp).toBe(80 - 5 - 3);
  });

  it('2. a failed attempt\'s damage is rolled back; 3. the same hit lands again on the next attempt; 5. a lasting cost survives, once per failure', async () => {
    const s = demo();
    // In-attempt damage (a hazard while the bar is up): gone with the retry.
    s.onAttempt((info) => info.id === 'fx_ev2' && info.attempt === 1 && s.session.ship.applyDamage({ section: 'deck', amount: 20 }));
    s.playHands('fumble', 'fumble', 'perfect');
    await s.run([{
      repair: 'hull', strikes: 2,
      challenge: STRICT({ id: 'fx_ev2', onFailure: { mustRetry: true, costs: [{ shipDamage: 'stern', amount: 10, scale: false, announce: false, eventId: 'burn' }] } }),
    }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ outcome: 'success', attempt: 3 });
    expect(s.session.ship.section('deck').hp).toBe(60);
    // Two failures, the same event id each time: charged twice (cost:1, cost:2), replayed after each restore, never doubled.
    expect(s.session.ship.section('stern').hp).toBe(80 - 2 * 10);
    // The ids as recorded: one per charge.
    expect([...s.session.ship.seen].filter((e) => e.startsWith('fx_ev2:'))).toEqual(['fx_ev2:cost:1:burn', 'fx_ev2:cost:2:burn']);
    expect(scopedEventId({ challenge: { id: 'c', attempt: 2 } }, 'x')).toBe('c#2:x');
    expect(scopedEventId({}, 'x')).toBe('x');
    expect(scopedEventId({}, null)).toBe(null);
  });

  it('a callback after its challenge has closed is refused', async () => {
    const s = demo();
    await s.run([{ repair: 'hull', strikes: 2, challenge: STRICT({ id: 'fx_late' }) }]);
    const cmd = createCommandImplementations();
    const late = { session: s.session, content, challenge: s.challengeRecords.at(-1), challengePrefs: () => ({ difficulty: 'captain' }) };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await cmd.shipDamage({ shipDamage: 'bow', amount: 10, scale: false, announce: false }, late);
    cmd.ignite({ ignite: 'galley' }, late);
    cmd.leak({ leak: 'hull_port' }, late);
    warn.mockRestore();
    expect(s.session.ship.section('bow').hp).toBe(80);
    expect(s.session.ship.hazards.any).toBe(false);
    expect(challengeLog(s.session).active.size).toBe(0);
  });

  it('6. the ids applied are saved: a callback repeated after a reload still lands once', async () => {
    const s = demo();
    await s.run([{ shipDamage: 'bow', amount: 10, scale: false, eventId: 'p99_cannon_1' }, { leak: 'hull_port', severity: 'seep', eventId: 'p99_hole' }]);
    const t = reloadStory(s);
    await t.run([{ shipDamage: 'bow', amount: 10, scale: false, eventId: 'p99_cannon_1' }, { leak: 'hull_port', severity: 'breach', eventId: 'p99_hole' }]);
    expect(t.session.ship.section('bow').hp).toBe(70);
    expect(t.session.ship.hazards.leaks).toMatchObject([{ severity: 'seep' }]);
  });

  it('7. fire and flood damage, tick by tick: each tick once; a restored checkpoint replays nothing twice', () => {
    const s = session();
    const hz = s.ship.hazards;
    hz.ignite({ room: 'main_deck', intensity: 40, spread: false });
    const cp = captureCheckpoint(s, { id: 'fx' });
    tick(hz, 15);
    const once = s.ship.section('deck').hp;
    restoreCheckpoint(s, cp);
    expect(s.ship.section('deck').hp).toBe(60);
    tick(hz, 15);
    expect(s.ship.section('deck').hp).toBe(once);
    expect(s.ship.seen.size).toBe(0); // ticks carry no ids: nothing to forget or to fill the list with
  });
});

// ---------------------------------------------------------------------------------------------
describe('checkpoints and challenge outcomes', () => {
  it('a checkpoint holds the whole emergency and the hold; restoring it puts both back and tells the world to redraw', () => {
    const s = session();
    const hz = s.ship.hazards;
    s.inventory.add('sailcloth', 2);
    hz.openLeak({ section: 'hull_port', severity: 'leak' });
    hz.ignite({ room: 'galley', intensity: 30 });
    hz.addWater('crew_quarters', 20);
    tick(hz, 3);
    const cp = captureCheckpoint(s, { id: 'fx' });
    const snap = JSON.stringify(s.ship.serialize());
    tick(hz, 25);
    hz.patchLeak('leak_1', 'success');
    hz.extinguish('galley');
    s.inventory.remove('sailcloth', 2);
    let redraw = 0;
    s.bus.on('hazard:changed', () => {
      redraw += 1;
    });
    restoreCheckpoint(s, cp);
    expect(JSON.stringify(s.ship.serialize())).toBe(snap);
    expect(s.inventory.count('sailcloth')).toBe(2);
    expect(redraw).toBeGreaterThan(0);
    expect(diffStates(JSON.parse(JSON.stringify({ ship: JSON.parse(snap) })), { ship: s.ship.serialize() }).hazards).toEqual({});
  });

  it('a challenge can start, worsen and end emergencies as its costs and consequences', async () => {
    const s = demo();
    const hz = s.session.ship.hazards;
    s.playHands('fumble');
    s.decideChallenges('continue');
    await s.run([{
      repair: 'hull', strikes: 2,
      challenge: { failure: true, id: 'fx_cons', mechanics: { maxFumbles: 1 }, outcomes: { failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' },
        onFailure: { continue: true, consequences: [
          { shipDamage: 'hull_port', amount: 80, scale: false, breach: true, announce: false },
          { flood: 'cargo_hold', amount: 30 },
          { ignite: 'main_deck', intensity: 20 },
        ] } },
    }]);
    expect(hz.leaks).toMatchObject([{ section: 'hull_port', severity: 'leak' }]);
    expect(units(hz, 'cargo_hold')).toBe(30);
    expect(hz.fireIn('main_deck').intensity).toBe(20);
    expect(s.challengeRecords.at(-1).transitions.hazards).toMatchObject({ water: { cargo_hold: [0, 30] }, fire: { main_deck: [0, 20] }, leaks: [0, 1] });
    await s.run([{ extinguish: 'main_deck' }, { sealLeak: 'hull_port' }, { drain: 'cargo_hold', amount: 30 }]);
    expect(hz.any).toBe(false);
  });

  it('a failed patch retried from its checkpoint: the emergency as it was, the wasted nail gone, then patched', async () => {
    const s = demo();
    const hz = s.session.ship.hazards;
    await s.run(BREACH());
    tick(hz, 4);
    const water = units(hz, 'cargo_hold');
    const nails = s.session.inventory.count('nails');
    s.onAttempt((info) => {
      if (info.attempt === 2) expect([units(hz, 'cargo_hold'), hz.leaks[0].state, s.session.inventory.count('nails')]).toEqual([water, 'open', nails - 1]);
    });
    s.playHands('fumble', 'perfect');
    await s.run([{ patchLeak: true }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ outcome: 'success', attempt: 2 });
    expect(s.session.inventory.count('nails')).toBe(nails - 1 - 2);
    expect(hz.leaks[0].state).toBe('patched');
  });
});

// ---------------------------------------------------------------------------------------------
describe('saves (version 19, since Prompt 7 20, Prompt 8 21, Prompt 9 22, Prompt 10 23, Prompt 11 24)', () => {
  it('an emergency saves and loads exactly, and goes on the same way afterwards', async () => {
    expect(SAVE_VERSION).toBe(24);
    const s = demo();
    const hz = s.session.ship.hazards;
    await s.run([...BREACH(), { ignite: 'galley', intensity: 45 }, { hazardAction: 'fetch' }]);
    tick(hz, 7);
    const t = reloadStory(s);
    expect(t.record.version).toBe(24);
    expect(t.session.ship.serialize()).toEqual(s.session.ship.serialize());
    expect(t.session.ship.hazards.buckets).toBe(hz.buckets);
    tick(hz, 30);
    tick(t.session.ship.hazards, 30);
    expect(t.session.ship.serialize()).toEqual(s.session.ship.serialize());
  });

  it('a version 18 save loads dry and unburnt with its hull as it was; a version 17 one too', () => {
    const s = session();
    s.ship.applyDamage({ section: 'hull_port', amount: 40 });
    for (const version of [17, 18]) {
      const storage = new MemoryStorage();
      const old = new SaveManager({ storage, content, version });
      const serialize = s.serialize.bind(s);
      s.serialize = () => {
        const st = serialize();
        if (version === 17) delete st.ship;
        else st.ship = { sections: st.ship.sections };
        return st;
      };
      expect(old.save(1, s).ok).toBe(true);
      s.serialize = serialize;
      const read = new SaveManager({ storage, content }).read(1);
      expect([version, read.ok]).toEqual([version, true]);
      const loaded = GameSession.fromState({ content, bus: new EventBus(), state: read.state });
      expect(loaded.ship.hazards.any).toBe(false);
      expect(loaded.ship.seen.size).toBe(0);
      expect(loaded.ship.section('hull_port').hp).toBe(version === 17 ? 100 : 60);
      expect(loaded.story.serialize()).toEqual(s.story.serialize());
      expect(loaded.inventory.serialize()).toEqual(s.inventory.serialize());
    }
  });

  it('damaged hazard data loads safely: what doesn\'t fit is dropped or clamped, nothing invented', () => {
    const s = session();
    const warnings = [];
    s.ship.load({
      sections: {},
      hazards: {
        leaks: [{ id: 'leak_3', section: 'hull_port', room: 'cargo_hold', severity: 'breach', state: 'patched' }, { id: 'leak_3', section: 'hull_port', room: 'cargo_hold', severity: 'leak' }, { id: 'leak_4', section: 'deck', room: 'cargo_hold', severity: 'leak' }, { id: 'leak_5', section: 'hull_port', room: 'cargo_hold', severity: 'gushing' }, 'junk'],
        water: { cargo_hold: 999, galley: -4, main_deck: 30, crew_quarters: 'deep' },
        fires: [{ id: 'fire_9', room: 'galley', intensity: 400, fuel: 9999 }, { id: 'fire_10', room: 'washroom', intensity: 50 }, { id: 'fire_11', room: 'galley', intensity: 20 }, { id: 'fire_12', room: 'main_deck', intensity: 0 }],
        buckets: 99, time: -3, next: 'x',
      },
      events: ['a', 7, 'b'],
    }, (w) => warnings.push(w));
    const hz = s.ship.hazards;
    expect(hz.leaks).toEqual([{ id: 'leak_3', section: 'hull_port', room: 'cargo_hold', severity: 'breach', state: 'patched', slowed: false, source: null, since: 0 }]);
    expect(hz.water).toEqual({ cargo_hold: 240 });
    expect(hz.fires.map((f) => [f.id, f.room, f.intensity, f.fuel])).toEqual([['fire_9', 'galley', 100, 120]]);
    expect([hz.buckets, hz.time, hz.next]).toEqual([3, 0, 10]);
    expect([...s.ship.seen]).toEqual(['a', 'b']);
    // Three leaks and the junk, two rooms' water (a negative amount is clamped to dry, silently), three fires.
    expect(warnings.length).toBe(9);
  });

  it('saving in the middle of emergency work can\'t duplicate anything: the save holds the moment, the work is not under way', async () => {
    const s = demo();
    const hz = s.session.ship.hazards;
    await s.run(BREACH());
    tick(hz, 10);
    const t0 = hz.time;
    const storage = new MemoryStorage();
    const saves = new SaveManager({ storage, content });
    let n = 0;
    const off = s.bus.on('hazard:changed', () => {
      n += 1;
      if (n === 6 && hz.working) saves.save(1, s.session);
    });
    await s.run([{ hazardAction: 'pump' }]);
    off?.();
    const mid = GameSession.fromState({ content, bus: new EventBus(), state: saves.read(1).state });
    expect(saves.read(1).ok).toBe(true);
    expect(mid.ship.hazards.working).toBe(false);
    expect(mid.ship.hazards.time).toBeGreaterThan(t0);
    expect(mid.ship.hazards.time).toBeLessThan(hz.time);
    expect(mid.ship.hazards.leaks).toMatchObject([{ state: 'open' }]);
    expect(holdWater(mid.ship.hazards)).toBeGreaterThan(holdWater(hz) - 30);
    // A patch saved as its bar starts: the materials and the leak as they were.
    const t = demo();
    await t.run(BREACH());
    t.onAttempt(() => saves.save(2, t.session));
    const nails = t.session.inventory.count('nails');
    await t.run([{ patchLeak: true }]);
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: saves.read(2).state });
    expect([loaded.inventory.count('nails'), loaded.ship.hazards.leaks[0].state, challengeLog(loaded).active.size]).toEqual([nails, 'open', 0]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('time: when hazards move', () => {
  it('ticks per second of free world time, whatever the frame rate; none while busy; never a burst after a stall', () => {
    for (const frame of [1000 / 60, 1000 / 30, 50, 1000 / 144]) {
      const clock = new HazardClock(1000);
      let n = 0;
      // 10.5 s of free time (half a second spare, so float frame sums can't land a hair short).
      for (let t = 0; t < 10500; t += frame) clock.advance(frame, { tick: () => n++ });
      expect([Math.round(frame), n]).toEqual([Math.round(frame), 10]);
    }
    const c = new HazardClock(1000);
    let n = 0;
    for (let i = 0; i < 600; i++) c.advance(16, { eligible: false, tick: () => n++ });
    expect(n).toBe(0);
    c.advance(10000, { tick: () => n++ });
    expect(n).toBe(3);
    c.advance(900, { active: false, tick: () => n++ });
    expect(c.ms).toBe(0);
  });

  it('scripts and dialogue don\'t move hazard time; work and an authored clock do, exactly', async () => {
    const s = demo();
    const hz = s.session.ship.hazards;
    hz.openLeak({ section: 'hull_port', severity: 'leak' });
    await s.run([{ say: 'Steady, lads.' }, { narrate: 'The sea knocks.' }, { wait: 5000 }, { setVar: 'fx_t', value: 1 }]);
    expect(hz.time).toBe(0);
    await s.run([{ hazardClock: 7 }]);
    expect(hz.time).toBe(7);
    await s.run([{ hazardAction: 'bail' }]);
    expect(hz.time).toBe(11);
  });
});

// ---------------------------------------------------------------------------------------------
describe('the HUD, the Respond choice and the Ship page', () => {
  it('the emergency line names the worst two in words, how many more, and whether he can respond here', async () => {
    const s = demo();
    expect(emergencySummary(s.session)).toBe(null);
    await s.run([...BREACH(), { ignite: 'galley', intensity: 65 }]);
    tick(s.session.ship.hazards, 12);
    const e = emergencySummary(s.session);
    expect(e.items).toEqual(['<o>FIRE</> Galley BLAZING', '<y>WATER</> Cargo Hold 15%']);
    expect(e).toMatchObject({ more: 1, stability: 'steady', here: true, respond: true });
    s.session.location.map = 'captains_quarters';
    expect(emergencySummary(s.session)).toMatchObject({ here: false, respond: false });
  });

  it('Respond offers what can be done here and runs the choice (or explains, or leaves it)', async () => {
    const s = demo();
    const hz = s.session.ship.hazards;
    await s.run(BREACH());
    // Just holed: nothing to bail yet, and the pump says the bilge is dry (offered, not hidden).
    expect(responseOptions(s.session).map((o) => [o.action, o.ok])).toEqual([['patch', true], ['pump', false]]);
    tick(hz, 3);
    expect(responseOptions(s.session).map((o) => o.action)).toEqual(['patch', 'pump', 'bail']);
    s.choices.push(1); // Pump
    await s.run([{ emergency: true }]);
    expect(hz.time).toBe(9);
    s.choices.push(responseOptions(s.session).length); // Leave it (the last)
    await s.run([{ emergency: true }]);
    expect(hz.time).toBe(9);
    s.session.location.map = 'washroom';
    await s.run([{ emergency: true }]);
    expect(s.notices.at(-1).text).toBe('<k>Nothing to do about an emergency here.</>');
  });

  it('the conditions read the emergencies', async () => {
    const s = demo();
    const hz = s.session.ship.hazards;
    expect(evaluateCondition({ hazard: { any: false } }, s.session)).toBe(true);
    await s.run([...BREACH(), { ignite: 'galley', intensity: 70 }]);
    tick(hz, 20);
    expect(evaluateCondition({ hazard: { any: true } }, s.session)).toBe(true);
    expect(evaluateCondition({ hazard: { leak: 'hull_port' } }, s.session)).toBe(true);
    expect(evaluateCondition({ hazard: { leak: 'bow' } }, s.session)).toBe(false);
    expect(evaluateCondition({ hazard: { fire: 'galley', stage: ['blazing', 'inferno'] } }, s.session)).toBe(true);
    expect(evaluateCondition({ hazard: { water: 'cargo_hold', pct: { gte: 10 } } }, s.session)).toBe(true);
    expect(evaluateCondition({ hazard: { water: 'galley' } }, s.session)).toBe(false);
  });

  /** Stand-in game objects (as tests/ship.test.js): every call chains; text keeps what it's given. */
  function stubScene(app) {
    const make = ([x = 0, y = 0] = []) => {
      const store = {
        x, y, visible: true, text: '', textWidth: 30, width: 30, height: 10,
        destroy() {},
        setText(v) {
          this.text = v;
          return this;
        },
      };
      const p = new Proxy(store, { get: (t, k) => (k in t ? t[k] : k === 'then' ? undefined : () => p), set: (t, k, v) => { t[k] = v; return true; } });
      store.scene = scene;
      return p;
    };
    const scene = {
      game: { app },
      add: new Proxy({}, { get: () => (...args) => make(args) }),
      tweens: new Proxy({}, { get: () => () => make() }),
      time: new Proxy({}, { get: () => () => make() }),
      textures: { exists: () => true },
      closed: [],
      close(opts) {
        this.closed.push(opts);
      },
    };
    return scene;
  }
  const PANE = { x: 96, y: 4, w: SCREEN_WIDTH - 100, h: SCREEN_HEIGHT - 8 };
  const { fonts } = buildFonts();

  it('the Ship page lists every emergency in words; Confirm (Z or pad A) on one here opens Respond in the world, once', async () => {
    const pads = [{ id: 'Test Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) }];
    Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true, writable: true });
    for (const device of ['keyboard', 'pad']) {
      const s = demo();
      await s.run([...BREACH(), { ignite: 'galley', intensity: 30 }]);
      tick(s.session.ship.hazards, 5);
      const input = new InputManager({ target: {} });
      const sounds = [];
      const app = { session: s.session, content, input, fontMetrics: fonts, settings: { challengePrefs: () => ({ difficulty: 'captain' }) }, audio: { ui: (n) => sounds.push(n), sfx: () => {} } };
      const scene = stubScene(app);
      const page = new ShipPage(scene, PANE);
      page.render();
      page.focus();
      let now = 0;
      const frame = () => {
        now += 16;
        input.update(now);
        return page.update(input);
      };
      frame();
      const press = (code, button) => {
        if (device === 'keyboard') input.onKeyDown({ code, preventDefault() {} });
        else pads[0].buttons[button].pressed = true;
        frame();
        if (device === 'keyboard') input.onKeyUp({ code });
        else pads[0].buttons[button].pressed = false;
        frame();
      };
      expect(page.menu.items.slice(6).map((i) => [i.label, i.right])).toEqual([['Fire: Galley', '33% BURNING'], ['Water: Cargo Hold', '6% DAMP'], ['Leak: Cargo Hold', 'BREACH']]);
      for (let i = 0; i < 6; i++) press('ArrowDown', 13);
      expect(page.menu.selected.value).toBe(`hz:${s.session.ship.hazards.fires[0].id}`);
      const lines = () => page.detail.objects.map((o) => o.text.replace(/\n/g, ' ')).join(' | ');
      expect(lines()).toMatch(/Go to the Galley to deal with it\./);
      press('KeyZ', 0); // not here: a buzzer
      expect(scene.closed).toEqual([]);
      expect(sounds).toContain('buzzer');
      press('ArrowDown', 13); // the water, here
      expect(lines()).toMatch(/Respond here/);
      press('KeyZ', 0);
      press('KeyZ', 0);
      expect(scene.closed.length).toBe(1);
      const ran = [];
      scene.closed[0].then({ runScript: (steps) => ran.push(steps) });
      expect(ran).toEqual([[{ emergency: true }]]);
    }
  });

  it('every hazard word fits: toasts in four lines, the HUD line on the screen, Respond choices and the page detail in their space', async () => {
    const plain = (t) => parseMarkup(String(t).replace(/\{[^{}]+\}/g, 'XXXXXXXX')).text;
    const bad = [];
    const s = demo({ prefs: { difficulty: 'brutal' } });
    const notices = noticesOf(s.bus);
    s.session.inventory.add('sailcloth', 10);
    // The worst names and stages everywhere.
    await s.run([{ leak: 'hull_port', severity: 'breach' }, { leak: 'bow', severity: 'breach' }, { leak: 'hull_starboard', room: 'treasure_hold', severity: 'breach' }]);
    for (const r of flammableRooms(content)) s.session.ship.hazards.ignite({ room: r, intensity: 95 });
    for (const r of compartmentIds(content)) s.session.ship.hazards.addWater(r, 1000);
    s.session.ship.hazards.fires = [];
    tick(s.session.ship.hazards, 30, 'brutal');
    for (const r of compartmentIds(content)) s.session.ship.hazards.removeWater(r, 1000);
    tick(s.session.ship.hazards, 1, 'brutal');
    for (const n of notices) if (wrap(fonts.main, plain(n.text), TOAST_TEXT_WIDTH).split('\n').length > 4) bad.push(`toast: ${n.text}`);
    // The HUD line: the longest two names with a count and FOUNDERING don't fit, so it shows the worst and a count; a short pair stays whole.
    const fits = (m) => measure(fonts.main, plain(m)) <= SCREEN_WIDTH - 12;
    const worst = { items: ["<o>FIRE</> Captain's Quarters INFERNO", '<r>WATER</> Fart-Free Zone 100%'], more: 9, stability: 'foundering' };
    const hud = emergencyLine(worst, fits);
    expect(plain(hud)).toBe("FOUNDERING! FIRE Captain's Quarters INFERNO +10");
    if (!fits(hud)) bad.push(`hud: ${hud}`);
    expect(plain(emergencyLine({ items: ['<o>FIRE</> Galley BURNING', '<y>WATER</> Cargo Hold 15%'], more: 0, stability: 'steady' }, fits))).toBe('! FIRE Galley BURNING  WATER Cargo Hold 15%');
    // Respond choices in every room with everything going on.
    const t = demo();
    t.session.inventory.add('sailcloth', 5);
    await t.run([{ leak: 'hull_port', severity: 'breach' }, { leak: 'hull_port', room: 'galley', severity: 'breach' }, { leak: 'bow', severity: 'breach' }]);
    const CHOICE_W = SCREEN_WIDTH - 12 - 26 - 4;
    for (const room of ['cargo_hold', 'galley', 'crew_quarters', 'main_deck', 'treasure_hold', 'captains_quarters']) {
      t.session.location.map = room;
      t.session.ship.hazards.addWater(room, 30);
      t.session.ship.hazards.ignite({ room, intensity: 50 });
      for (const o of responseOptions(t.session, room)) {
        if (measure(fonts.main, plain(o.label)) > CHOICE_W) bad.push(`choice: ${o.label}`);
        if (o.reason && wrap(fonts.main, plain(o.reason), TOAST_TEXT_WIDTH).split('\n').length > 4) bad.push(`reason: ${o.reason}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('the campaign is unchanged', () => {
  const HAZARD_COMMANDS = ['leak', 'flood', 'drain', 'ignite', 'extinguish', 'sealLeak', 'hazardClock', 'hazardAction', 'patchLeak', 'emergency'];

  it('no chapter starts, checks or responds to a hazard; no story blow can hole the hull', () => {
    const found = [];
    const visit = (v, at) => {
      if (Array.isArray(v)) v.forEach((x) => visit(x, at));
      else if (v && typeof v === 'object') {
        let name = null;
        try {
          name = commandNameOf(v);
        } catch {
          name = null;
        }
        if (HAZARD_COMMANDS.includes(name)) found.push(`${at}: ${name}`);
        if (v.shipDamage !== undefined && v.breach) found.push(`${at}: breach`);
        if (v.hazard !== undefined && typeof v.hazard === 'object') found.push(`${at}: hazard condition`);
        Object.values(v).forEach((x) => visit(x, at));
      }
    };
    for (const id of content.scripts.ids()) visit(content.scripts.get(id), id);
    for (const id of content.maps.ids()) visit(content.maps.get(id), id);
    for (const id of content.quests.ids()) visit(content.quests.get(id), id);
    expect(found).toEqual([]);
    // The registry knows the new commands: a patch is a challenge (0 uses), the rest are not.
    expect(REGISTRY.patchLeak.commands).toEqual(['patchLeak']);
    expect(NON_CHALLENGE_COMMANDS).toEqual(expect.arrayContaining(HAZARD_COMMANDS.filter((c) => c !== 'patchLeak')));
  });

  it('every phase\'s approved snapshot has no emergency; the demo scenes are debug-only', () => {
    const baselines = import.meta.glob('/tests/regression/baselines/phase-*.json', { eager: true, import: 'default' });
    expect(Object.keys(baselines).length).toBe(17);
    for (const [file, snap] of Object.entries(baselines)) expect([file, snap.gameplay.systems.ship.hazards]).toEqual([file, { leaks: 0, fires: [], water: [], stability: 'steady', buckets: 0 }]);
    expect(DEBUG_SHIP.hazards.length).toBeGreaterThanOrEqual(3);
    expect(content.debugPresets.has('hazard_demo')).toBe(true);
    const s = session('hazard_demo');
    expect(s.ship.untouched).toBe(true);
  });

  it('a legacy shipDamage and a legacy repair step start no emergency', async () => {
    const s = makeStory({ preset: 'p17_complete' });
    s.setRepairScore(2);
    await s.run([{ shipDamage: ['hull_port', 'hull_starboard', 'bow'], amount: 200, category: 'cannon', scale: false }, { repair: 'hull', strikes: 3, var: 'fx_legacy' }]);
    expect(s.session.ship.hazards.any).toBe(false);
  });
});
