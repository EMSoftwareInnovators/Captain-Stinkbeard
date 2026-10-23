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
import { commandNameOf } from '../src/systems/script/commandSchemas.js';
import { shipTuning } from '../src/systems/ship/integrity.js';
import { roomLinks } from '../src/systems/ship/hazards.js';
import { airDataProblems, airRoomIds, connectionIds, connection, substanceIds, exposureStage } from '../src/systems/ship/air.js';
import { airOptions, airReport, exposureFactors, airSeconds } from '../src/systems/ship/airResponse.js';
import { workFactor, emergencySummary } from '../src/systems/ship/response.js';
import { HazardClock } from '../src/systems/ship/hazardClock.js';
import { DEFAULT_FUME_CONFIG, Exposure } from '../src/systems/hazards/fumes.js';
import { fartZoneDef, setPortholes } from '../src/systems/fartZone.js';
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
 * The ship's air, room by room (docs/gameplay-overhaul/11-atmosphere-and-ventilation.md).
 * Deterministic: hazard time is ticked by hand (or by the work actions, tick
 * by tick), seals are the game's own timing bar played by simulated hands on
 * fixed seeds. The browser half (the HUD, Respond, the meter, the Ship page
 * with keyboard and pad, save and Continue) is e2e/atmosphere.spec.js. No
 * chapter uses any of it.
 */
const content = loadContent();
const FILES = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' });
const DIFFS = ['deckhand', 'captain', 'brutal'];
const T = (d = 'captain') => shipTuning(content, d);
const tick = (ship, n = 1, d = 'captain') => {
  for (let i = 0; i < n; i++) ship.tick(T(d));
};

function session(preset = 'p17_complete', room = 'captains_quarters') {
  const s = GameSession.newGame({ content, bus: new EventBus(), strictFlags: true });
  applyPresetPlan(s, resolvePreset(content, preset));
  s.location.map = room;
  return s;
}
/** The air demo: the end of Phase 17 in the crew quarters, with sealing supplies. */
const demo = (opts = {}) => makeStory({ preset: 'air_demo', ...opts });
const pct = (air, room, sub) => air.airIn(room).subs.find((x) => x.id === sub)?.pct ?? 0;
/** Everything of a substance there has ever been: still aboard, vented, decayed. */
const accounted = (air, sub) => air.total(sub) + (air.vented[sub] ?? 0) + (air.decayed[sub] ?? 0);
const shut = (air, ...ids) => ids.forEach((id) => air.setConnection(id, 'closed'));
const seal = (air, ...ids) => ids.forEach((id) => {
  air.setConnection(id, 'closed');
  air.setConnection(id, 'sealed');
});
const noticesOf = (bus) => {
  const out = [];
  bus.on('hazard:notice', (n) => out.push(n));
  return out;
};

// ---------------------------------------------------------------------------------------------
describe('the air model and its data', () => {
  it('is keyed by rooms and openings (real doorways only), never tiles, and starts clean with every opening at its default', () => {
    expect(airDataProblems(content)).toEqual([]);
    expect(validateContent(content).errors).toEqual([]);
    expect(airRoomIds(content)).toEqual(['main_deck', 'captains_quarters', 'crew_quarters', 'galley', 'washroom', 'stenchmaster_fart_zone', 'cargo_hold', 'treasure_hold', 'fart_free_zone']);
    expect(substanceIds(content)).toEqual(['smoke', 'vapor', 'heavy_gas']);
    const links = roomLinks(content);
    for (const id of connectionIds(content)) {
      const [a, b] = connection(content, id).rooms;
      if (b !== 'outside') expect([id, links.get(a)?.has(b)]).toEqual([id, true]);
    }
    expect(JSON.stringify(content.shipAir)).not.toMatch(/"(x|y|tiles?)":/);
    const s = session();
    const air = s.ship.air;
    expect(air.active).toBe(false);
    for (const room of airRoomIds(content)) expect([room, air.airIn(room).quality.id]).toEqual([room, 'clean']);
    for (const id of connectionIds(content)) expect([id, air.connectionState(id).byDefault]).toEqual([id, true]);
    expect(air.exposureNow()).toMatchObject({ value: 0, stage: { id: 'clear' } });
    expect(s.ship.untouched).toBe(true);
  });

  it('bad air data and bad steps are content errors', () => {
    const files = structuredClone(FILES);
    const air = files['/data/ship/air.json'];
    air.connections.bad_link = { label: 'a hole', kind: 'door', rooms: ['washroom', 'cargo_hold'], state: 'open' };
    air.rooms.galley.x = 3;
    air.substances.vapor.potency = 5;
    air.connections.bad_porthole = { label: 'a porthole', kind: 'porthole', rooms: ['fart_free_zone', 'cargo_hold'], state: 'closed' };
    air.connections.hold_stairs.state = 'closed';
    air.actions.seal.cost = [{ item: 'hardtack', count: 1 }];
    air.exposure.stages[4].hurt.floor = 0;
    files['/data/story/cutscenes/zz_air_fixture.json'] = {
      'zz.air_bad': [
        { airSource: 'crew_quarters', substance: 'vapor', rate: 2 },
        { airSource: 'crew_quarters', substance: 'vapor', rate: 50, seconds: 5 },
        { airSource: 'bilge', substance: 'vapor', rate: 2, seconds: 5 },
        { airAdd: 'galley', substance: 'sulfur', pct: 10 },
        { airAdd: 'galley', substance: 'smoke', pct: 150 },
        { airConnection: 'galley_door' },
        { airControl: 'galley_door', state: 'sealed' },
        { airSeal: 'galley_porthole' },
        { airStop: true },
        { if: { air: { room: 'crew_quarters', quality: 'smelly' } }, then: [{ wait: 1 }] },
        { if: { air: { pct: 5 } }, then: [{ wait: 1 }] },
        { if: { air: { connection: 'galley_door', state: 'ajar' } }, then: [{ wait: 1 }] },
      ],
    };
    const errors = validateContent(new ContentDB(files)).errors.join('\n');
    expect(errors).toMatch(/washroom and cargo_hold don't open onto each other \(no warp between them\): gas can't teleport/);
    expect(errors).toMatch(/rooms.galley\): a room's air is the whole room, never tiles/);
    expect(errors).toMatch(/substances.vapor\): potency must be above 0, at most 2/);
    expect(errors).toMatch(/connections.bad_porthole\): a porthole opens to "outside"/);
    expect(errors).toMatch(/connections.hold_stairs\): state "closed" isn't one a stairs has/);
    expect(errors).toMatch(/actions.seal\): "hardtack" is not a material/);
    expect(errors).toMatch(/hurt needs every \(seconds\), hp, and a floor between 0 and 1 \(it never kills\)/);
    expect(errors).toMatch(/airSource: a source must end: give it "amount" or "seconds"/);
    expect(errors).toMatch(/airSource: "rate" must be above 0, at most 20 a second/);
    expect(errors).toMatch(/"bilge" has no ship air/);
    expect(errors).toMatch(/unknown substance "sulfur"/);
    expect(errors).toMatch(/airAdd: "pct" must be above 0, at most 100/);
    expect(errors).toMatch(/airConnection: give a "state" or "damaged"/);
    expect(errors).toMatch(/airControl: sealing is airSeal/);
    expect(errors).toMatch(/airSeal: the galley porthole can't be sealed/);
    expect(errors).toMatch(/airStop: a source id, or true with a "room"/);
    expect(errors).toMatch(/air condition: unknown quality "smelly"/);
    expect(errors).toMatch(/air condition: "pct" goes with "room"/);
    expect(errors).toMatch(/air condition: unknown state "ajar"/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('rooms, substances and sources', () => {
  it('several substances share a room without overwriting each other; a room never holds more than all air, nor less than none', () => {
    const s = session();
    const air = s.ship.air;
    air.addGas('galley', 'smoke', 32); // 20% of 160
    air.addGas('galley', 'vapor', 8); // 5%
    const a = air.airIn('galley');
    expect(a.subs.map((x) => [x.id, Math.round(x.pct)])).toEqual([['smoke', 20], ['vapor', 5]]);
    // Smoke 5 points over its safe 15 (x0.06), vapor under its safe 8: foul.
    expect(a.index).toBeCloseTo(0.3, 6);
    expect(a.quality.id).toBe('foul');
    expect(a.worst.id).toBe('smoke');
    expect(air.addGas('galley', 'heavy_gas', 1000)).toBeCloseTo(160 - 40, 6);
    expect(air.airIn('galley').total).toBeCloseTo(100, 6);
    expect(air.addGas('galley', 'smoke', 10)).toBe(0);
    for (const bad of [0, -5, Number.NaN, 'lots']) expect(air.addGas('washroom', 'smoke', bad)).toBe(0);
    expect(air.addGas('washroom', 'sulfur', 5)).toBe(0);
    expect(air.addGas('outside', 'smoke', 5)).toBe(0);
    expect(air.airIn('nowhere')).toMatchObject({ known: false, total: 0, quality: { id: 'clean' } });
    // Gas under every safe level is hazy, not harmless-and-clean.
    air.addGas('washroom', 'vapor', 3);
    expect(air.airIn('washroom')).toMatchObject({ quality: { id: 'hazy' }, index: 0 });
    tick(s.ship, 50);
    for (const room of airRoomIds(content)) {
      const r = air.airIn(room);
      expect(r.total).toBeLessThanOrEqual(100 + 1e-9);
      for (const sub of r.subs) expect(sub.pct).toBeGreaterThanOrEqual(0);
    }
  });

  it('a source pours at its rate until its amount or its seconds run out; it must end, and the limits hold', () => {
    const s = session();
    const air = s.ship.air;
    expect(air.startSource({ room: 'galley', substance: 'smoke', rate: 2 })).toMatchObject({ ok: false, reason: 'a source must end: give it an amount or seconds' });
    expect(air.startSource({ room: 'galley', substance: 'smoke', rate: 25, seconds: 5 })).toMatchObject({ ok: false });
    expect(air.startSource({ room: 'galley', substance: 'smoke', rate: 2, seconds: 601 })).toMatchObject({ ok: false });
    expect(air.startSource({ room: 'bilge', substance: 'smoke', rate: 2, seconds: 5 })).toMatchObject({ ok: false, reason: 'no air there' });
    expect(air.startSource({ room: 'galley', substance: 'sulfur', rate: 2, seconds: 5 })).toMatchObject({ ok: false, reason: 'unknown substance' });
    expect(air.startSource({ room: 'galley', substance: 'smoke', rate: 2, amount: 5 })).toMatchObject({ ok: true });
    expect(air.startSource({ room: 'washroom', substance: 'vapor', rate: 1, seconds: 4 })).toMatchObject({ ok: true });
    tick(s.ship, 3);
    expect(accounted(air, 'smoke')).toBeCloseTo(5, 6); // 2 + 2 + 1, then done
    expect(air.sources.map((x) => x.room)).toEqual(['washroom']);
    tick(s.ship, 5);
    expect(accounted(air, 'vapor')).toBeCloseTo(4, 6);
    expect(air.sources).toEqual([]);
    // A fixed number at once; one id once; a stopped source adds nothing more.
    for (let i = 0; i < 12; i++) expect(air.startSource({ room: 'cargo_hold', substance: 'heavy_gas', rate: 0.1, seconds: 100 }).ok).toBe(true);
    expect(air.startSource({ room: 'cargo_hold', substance: 'heavy_gas', rate: 0.1, seconds: 100 })).toMatchObject({ ok: false, reason: 'too many sources' });
    expect(air.stopSource(null, 'cargo_hold')).toBe(12);
    expect(air.startSource({ id: 'cask', room: 'galley', substance: 'vapor', rate: 1, seconds: 100 }).ok).toBe(true);
    expect(air.startSource({ id: 'cask', room: 'galley', substance: 'vapor', rate: 1, seconds: 100 })).toMatchObject({ ok: false, reason: 'already pouring' });
    expect(air.stopSource('cask')).toBe(1);
    const before = accounted(air, 'vapor');
    tick(s.ship, 5);
    expect(accounted(air, 'vapor')).toBeCloseTo(before, 6);
  });

  it('a source into a full room waits instead of pouring past full', () => {
    const s = session();
    const air = s.ship.air;
    seal(air, 'washroom_door');
    air.addGas('washroom', 'heavy_gas', 60);
    air.startSource({ room: 'washroom', substance: 'vapor', rate: 5, amount: 20 });
    tick(s.ship, 3);
    expect(air.airIn('washroom').total).toBeCloseTo(100, 6);
    expect(air.sources[0].left).toBeCloseTo(20, 6);
  });
});

// ---------------------------------------------------------------------------------------------
describe('how gas moves', () => {
  it('passes through open connections, a little through closed ones, none through sealed ones; a damaged one leaks and won\'t seal', () => {
    const run = (state, damaged = false) => {
      const s = session();
      const air = s.ship.air;
      // The quarters reach the galley only by the galley door (the hatches shut tight).
      seal(air, 'main_hatch', 'fore_hatch');
      if (state !== 'open') air.setConnection('galley_door', 'closed');
      if (state === 'sealed') air.setConnection('galley_door', 'sealed');
      if (damaged) air.setConnection('galley_door', null, { damaged: true });
      air.addGas('galley', 'vapor', 80);
      tick(s.ship, 20);
      return pct(air, 'crew_quarters', 'vapor') + pct(air, 'washroom', 'vapor');
    };
    const open = run('open');
    const closed = run('closed');
    const sealed = run('sealed');
    const broken = run('closed', true);
    expect(sealed).toBe(0);
    expect(closed).toBeGreaterThan(0);
    expect(open).toBeGreaterThan(closed * 5);
    expect(broken).toBeGreaterThan(closed * 3);
    // Damage tears a seal; a damaged opening can't be sealed until it is mended.
    const s = session();
    const air = s.ship.air;
    seal(air, 'galley_door');
    expect(air.setConnection('galley_door', null, { damaged: true })).toMatchObject({ ok: true, to: 'closed', damaged: true });
    expect(air.setConnection('galley_door', 'sealed')).toMatchObject({ ok: false, reason: "the galley door is damaged: it won't seal" });
    expect(air.setConnection('galley_door', 'closed', { damaged: false })).toMatchObject({ ok: true, damaged: false });
    // Only the states a kind has; sealing only from shut.
    expect(air.setConnection('hold_stairs', 'closed')).toMatchObject({ ok: false });
    expect(air.setConnection('galley_porthole', 'sealed')).toMatchObject({ ok: false });
    expect(air.setConnection('fore_hatch', 'sealed')).toMatchObject({ ok: false, reason: 'close the fore hatch first' });
    expect(air.setConnection('no_such', 'open')).toMatchObject({ ok: false, reason: 'unknown connection' });
  });

  it('a room shut off from the rest stays as it is: none in, none out (only the gas\'s own decay)', () => {
    const s = session();
    const air = s.ship.air;
    seal(air, 'washroom_door');
    air.addGas('washroom', 'heavy_gas', 30); // 50%, and heavy gas doesn't decay
    air.addGas('crew_quarters', 'vapor', 100);
    tick(s.ship, 120);
    expect(pct(air, 'washroom', 'heavy_gas')).toBeCloseTo(50, 9);
    expect(pct(air, 'washroom', 'vapor')).toBe(0);
    for (const room of airRoomIds(content).filter((r) => r !== 'washroom')) expect([room, pct(air, room, 'heavy_gas')]).toEqual([room, 0]);
    // Vapor decays slowly on its own: a shut room stays dangerous for minutes.
    const t = session();
    seal(t.ship.air, 'washroom_door');
    t.ship.air.addGas('washroom', 'vapor', 30);
    tick(t.ship, 60);
    expect(pct(t.ship.air, 'washroom', 'vapor')).toBeGreaterThan(50 * 0.9);
  });

  it('an opening to the outside takes gas off the ship for good; the rest of the ship isn\'t touched', () => {
    const s = session();
    const air = s.ship.air;
    seal(air, 'washroom_door');
    air.addGas('washroom', 'heavy_gas', 30);
    air.setConnection('washroom_porthole', 'open');
    tick(s.ship, 60);
    expect(pct(air, 'washroom', 'heavy_gas')).toBeLessThan(50 / 2);
    expect(air.vented.heavy_gas).toBeGreaterThan(15);
    expect(pct(air, 'crew_quarters', 'heavy_gas')).toBe(0);
    expect(accounted(air, 'heavy_gas')).toBeCloseTo(30, 6);
    // Shut again: what's left stays.
    air.setConnection('washroom_porthole', 'closed');
    const left = air.total('heavy_gas');
    tick(s.ship, 30);
    expect(air.total('heavy_gas')).toBeCloseTo(left, 9);
  });

  it('conserves every substance (aboard + vented + decayed = poured), never duplicates, never goes negative, and settles to exactly clean', () => {
    const s = session();
    const air = s.ship.air;
    const poured = { smoke: 0, vapor: 0, heavy_gas: 0 };
    const pour = (room, sub, units) => {
      poured[sub] += air.addGas(room, sub, units);
    };
    pour('galley', 'smoke', 60);
    pour('crew_quarters', 'vapor', 50);
    pour('cargo_hold', 'heavy_gas', 40);
    air.startSource({ room: 'washroom', substance: 'vapor', rate: 2, amount: 30 });
    poured.vapor += 30;
    const toggles = ['galley_door', 'fore_hatch', 'treasure_door', 'quarters_porthole', 'galley_porthole', 'cabin_door'];
    for (let t = 1; t <= 400; t++) {
      if (t % 37 === 0) {
        const id = toggles[(t / 37) % toggles.length];
        const c = air.connectionState(id);
        air.setConnection(id, c.state === 'open' ? 'closed' : 'open');
      }
      tick(s.ship, 1);
      for (const room of airRoomIds(content)) {
        for (const q of Object.values(air.gas[room] ?? {})) expect(q).toBeGreaterThan(0);
        expect(air.loadOf(room)).toBeLessThanOrEqual(air.volume(room) + 1e-9);
      }
    }
    for (const sub of Object.keys(poured)) expect([sub, accounted(air, sub)]).toEqual([sub, expect.closeTo(poured[sub], 6)]);
    // Aired out to the end: exactly clean (no residue left to raise alerts forever).
    const t = session();
    const ta = t.ship.air;
    ta.addGas('crew_quarters', 'vapor', 40);
    ta.setConnection('quarters_porthole', 'open');
    const notices = noticesOf(t.bus);
    let n = 0;
    while (ta.active && n < 5000) {
      tick(t.ship, 1);
      n += 1;
    }
    expect(ta.active).toBe(false);
    expect(ta.gas).toEqual({});
    const quiet = notices.length;
    tick(t.ship, 100);
    expect(notices.length).toBe(quiet);
  });

  it('heavy gas sinks: down the stairs faster than up them', () => {
    const down = session();
    seal(down.ship.air, 'main_hatch', 'galley_door');
    down.ship.air.addGas('galley', 'heavy_gas', 32);
    tick(down.ship, 5);
    const up = session();
    seal(up.ship.air, 'treasure_door', 'ffz_door');
    up.ship.air.addGas('cargo_hold', 'heavy_gas', 52);
    tick(up.ship, 5);
    // The same 20% difference to start with, the same stairs: downhill moves more.
    expect(down.ship.air.total('heavy_gas') - down.ship.air.quantity('galley', 'heavy_gas')).toBeGreaterThan(3 * (up.ship.air.total('heavy_gas') - up.ship.air.quantity('cargo_hold', 'heavy_gas')));
  });

  it('runs the same whatever the frame rate: the clock gives whole ticks, and whole ticks give the same air', () => {
    const results = [];
    for (const frame of [1000 / 60, 1000 / 30, 1000 / 144, 50]) {
      const s = session();
      s.ship.air.startSource({ room: 'crew_quarters', substance: 'vapor', rate: 3, amount: 90 });
      s.ship.air.addGas('galley', 'smoke', 40);
      const clock = new HazardClock(1000);
      for (let t = 0; t < 20500; t += frame) clock.advance(frame, { active: s.ship.envActive, tick: () => s.ship.tick(T()) });
      results.push(JSON.stringify(s.ship.air.serialize()));
    }
    const direct = session();
    direct.ship.air.startSource({ room: 'crew_quarters', substance: 'vapor', rate: 3, amount: 90 });
    direct.ship.air.addGas('galley', 'smoke', 40);
    tick(direct.ship, 20);
    results.push(JSON.stringify(direct.ship.air.serialize()));
    expect(new Set(results).size).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
describe('the captain\'s exposure', () => {
  /** The captain shut in the quarters with vapor (30%: toxic), the doors closed. */
  const gassed = (opts = {}) => {
    const s = session('p17_complete', 'crew_quarters');
    shut(s.ship.air, 'fore_hatch', 'galley_door', 'washroom_door');
    s.ship.air.addGas('crew_quarters', 'vapor', 60);
    Object.assign(s.ship.air, opts);
    return s;
  };

  it('builds with the air he breathes, is not the air itself, and clears slowly once he\'s out', () => {
    const s = gassed();
    const air = s.ship.air;
    tick(s.ship, 1);
    expect(air.exposure).toBeCloseTo((pct(air, 'crew_quarters', 'vapor') - 8) * 0.12, 1);
    tick(s.ship, 9);
    const built = air.exposure;
    expect(built).toBeGreaterThan(20);
    // Airing the room out doesn't clear his lungs.
    air.ventRoom('crew_quarters', 1);
    expect(air.exposure).toBe(built);
    expect(air.airIn('crew_quarters').quality.id).toBe('clean');
    tick(s.ship, 1);
    expect(air.exposure).toBeCloseTo(built - 5, 6);
    // Out on deck: no more builds, it falls a few points a second, to zero.
    s.location.map = 'main_deck';
    let n = 0;
    while (air.exposure > 0 && n < 100) {
      tick(s.ship, 1);
      n += 1;
    }
    expect(n).toBeGreaterThan(2);
    expect(air.exposure).toBe(0);
  });

  it('has stages with real effects: slower work and walking, coughing fits that stop him, HP lost at the worst (never below a quarter)', () => {
    const s = gassed();
    const air = s.ship.air;
    const coughs = [];
    s.bus.on('air:cough', (e) => coughs.push(e.stage));
    const leader = s.party.members[0];
    const hp = leader.hp;
    const seen = new Map();
    for (let t = 1; t <= 60; t++) {
      tick(s.ship, 1);
      const st = air.exposureNow().stage.id;
      if (!seen.has(st)) seen.set(st, { t, work: exposureFactors(s).work, walk: exposureFactors(s).walk, pump: workFactor(s, 'crew_quarters'), close: airSeconds(s, 'crew_quarters', 2) });
    }
    expect([...seen.keys()]).toEqual(['clear', 'mild', 'impaired', 'dangerous', 'critical']);
    expect(seen.get('mild')).toMatchObject({ work: 1, walk: 1 });
    expect(seen.get('impaired')).toMatchObject({ work: 1.25, walk: 1.2, pump: 1.25, close: 3 });
    expect(seen.get('dangerous')).toMatchObject({ work: 1.5, walk: 1.4, close: 3 });
    expect(seen.get('critical')).toMatchObject({ work: 1.75, walk: 1.6, close: 4 });
    expect(coughs.length).toBeGreaterThanOrEqual(3);
    expect(coughs[0]).toBe('dangerous');
    expect(leader.hp).toBeLessThan(hp);
    // However long, never below a quarter of his HP (shut in tight with the gas still coming).
    seal(air, 'fore_hatch', 'galley_door', 'washroom_door');
    air.startSource({ room: 'crew_quarters', substance: 'vapor', rate: 5, seconds: 600 });
    tick(s.ship, 1100);
    expect(leader.hp).toBe(Math.ceil(leader.maxHp * 0.25));
    // Out in clean air: no more fits, no more HP lost, while the lungs clear.
    s.location.map = 'main_deck';
    const fits = coughs.length;
    const left = leader.hp;
    tick(s.ship, 3);
    expect(air.exposureNow().stage.id).toBe('critical');
    tick(s.ship, 60);
    expect(leader.hp).toBe(left);
    expect(air.exposure).toBe(0);
    expect(coughs.length - fits).toBeLessThanOrEqual(2);
  });

  it('honours protection and the fume hazard option (Gentle halves it, Off stops it), and never adds to a legacy fume zone\'s exposure', () => {
    const full = gassed();
    const gentle = gassed({ access: 0.5 });
    const off = gassed({ access: 0 });
    const legacy = gassed({ legacyOwns: true });
    for (const s of [full, gentle, off, legacy]) tick(s.ship, 5);
    expect(gentle.ship.air.exposure).toBeCloseTo(full.ship.air.exposure / 2, 6);
    expect(off.ship.air.exposure).toBe(0);
    expect(legacy.ship.air.exposure).toBe(0);
    // The air itself is the same either way: only what reaches his lungs changes.
    expect(off.ship.air.serialize().gas).toEqual(full.ship.air.serialize().gas);
  });
});

// ---------------------------------------------------------------------------------------------
describe('difficulty and accessibility', () => {
  it('scales the captain\'s risk and his ventilation, never how gas moves between rooms', () => {
    expect(DIFFS.map((d) => [T(d).exposureScale, T(d).recoveryScale, T(d).ventScale])).toEqual([[0.6, 1.4, 1.25], [1, 1, 1], [1.35, 0.75, 0.85]]);
    const one = DIFFS.map((d) => {
      const s = session();
      s.ship.air.addGas('cargo_hold', 'heavy_gas', 60);
      tick(s.ship, 1, d);
      return JSON.stringify(s.ship.air.serialize().gas);
    });
    expect(new Set(one).size).toBe(1);
    const vented = DIFFS.map((d) => {
      const s = session();
      s.ship.air.addGas('crew_quarters', 'vapor', 40);
      shut(s.ship.air, 'fore_hatch', 'galley_door', 'washroom_door');
      s.ship.air.setConnection('quarters_porthole', 'open');
      tick(s.ship, 10, d);
      return s.ship.air.vented.vapor;
    });
    expect(vented[0]).toBeGreaterThan(vented[1]);
    expect(vented[1]).toBeGreaterThan(vented[2]);
    const lungs = DIFFS.map((d) => {
      const s = session('p17_complete', 'crew_quarters');
      shut(s.ship.air, 'fore_hatch', 'galley_door', 'washroom_door');
      s.ship.air.addGas('crew_quarters', 'vapor', 60);
      tick(s.ship, 1, d);
      return s.ship.air.exposure;
    });
    expect(lungs[0] / lungs[1]).toBeCloseTo(0.6, 2);
    expect(lungs[2] / lungs[1]).toBeCloseTo(1.35, 2);
  });
});

// ---------------------------------------------------------------------------------------------
describe('what the captain can do about it', () => {
  it('offers only the openings of the room he is in, with their times, costs and why not', async () => {
    const s = demo();
    const air = s.session.ship.air;
    expect(airOptions(s.session)).toEqual([]);
    await s.run([{ airSource: 'crew_quarters', substance: 'vapor', rate: 4, amount: 240, label: 'a cracked cask' }]);
    expect(airOptions(s.session).map((o) => o.label)).toEqual(['Check the air', 'Close the fore hatch (2 s)', 'Close the galley door (1 s)', 'Close the washroom door (1 s)', 'Open the quarters porthole (2 s)']);
    s.session.location.map = 'galley';
    expect(airOptions(s.session).map((o) => `${o.action}:${o.connection ?? ''}`)).toEqual(['check:', 'close:main_hatch', 'close:galley_door', 'open:galley_porthole']);
    s.session.location.map = 'crew_quarters';
    air.setConnection('galley_door', 'closed');
    expect(airOptions(s.session).find((o) => o.action === 'seal')).toMatchObject({ connection: 'galley_door', ok: true, label: 'Seal the galley door: 1 Sailcloth, 1 Nails' });
    // Why not: at work already; damaged; nothing to seal with; too deep to work.
    s.session.ship.hazards.working = true;
    expect(airOptions(s.session).filter((o) => o.action !== 'check').every((o) => !o.ok && o.reason === 'Already at work.')).toBe(true);
    s.session.ship.hazards.working = false;
    air.setConnection('galley_door', null, { damaged: true });
    // Prompt 8: a damaged door is mended first (planks and nails), then it seals.
    expect(airOptions(s.session).find((o) => o.action === 'seal')).toMatchObject({ ok: false, reason: 'The galley door is damaged: mend it first.' });
    air.setConnection('galley_door', null, { damaged: false });
    s.session.inventory.remove('sailcloth', s.session.inventory.count('sailcloth'));
    expect(airOptions(s.session).find((o) => o.action === 'seal')).toMatchObject({ ok: false, reason: 'Not enough: Sailcloth 0/1.' });
    s.session.ship.hazards.addWater('crew_quarters', 1000);
    expect(airOptions(s.session).find((o) => o.action === 'open')).toMatchObject({ ok: false, reason: 'Too deep to work in the Crew Quarters: pump it down first.' });
  });

  it('shutting, opening and unsealing take their seconds (the gas goes on meanwhile), from his room only', async () => {
    const s = demo();
    const air = s.session.ship.air;
    await s.run([{ airSource: 'crew_quarters', substance: 'vapor', rate: 4, amount: 240, label: 'a cracked cask' }]);
    const t0 = accounted(air, 'vapor');
    await s.run([{ airControl: 'fore_hatch', state: 'closed' }]);
    expect(air.connectionState('fore_hatch').state).toBe('closed');
    expect(accounted(air, 'vapor') - t0).toBeCloseTo(8, 6); // two seconds of the cask
    expect(s.notices.at(-1).text).toBe('Closed the fore hatch.');
    // Not from here: the galley's porthole is worked from the galley.
    await s.run([{ airControl: 'galley_porthole', state: 'open', outcomeValue: 'fx_p' }]);
    expect(s.session.story.getValue('fx_p')).toBe('refused');
    expect(air.connectionState('galley_porthole').state).toBe('closed');
    // Sealed by a scene, unsealed by him (back to shut).
    await s.run([{ airConnection: 'washroom_door', state: 'sealed' }, { airControl: 'washroom_door', state: 'closed' }]);
    expect(air.connectionState('washroom_door').state).toBe('closed');
    expect(s.notices.at(-1).text).toBe('Unsealed the washroom door.');
  });

  it('Check the air reads this room, its source and openings, the rest of the ship and his lungs', async () => {
    const s = demo();
    await s.run([{ airSource: 'crew_quarters', substance: 'vapor', rate: 4, amount: 240, label: 'a cracked cask' }, { airAdd: 'galley', substance: 'smoke', pct: 40 }, { hazardClock: 15 }, { airCheck: true }]);
    const lines = s.log.slice(-5).map((l) => parseMarkup(l.replace(/^-: /, '')).text);
    expect(lines[0]).toMatch(/^Crew Quarters: (FOUL|TOXIC), getting worse\. (SMOKE \d+%, )?VAPOR \d+%\. Not safe to stay\.$/);
    expect(lines[1]).toBe('Source: a cracked cask (still pouring).');
    expect(lines[2]).toBe('Openings: fore hatch open, galley door open, washroom door open, quarters porthole closed.');
    expect(lines[3]).toMatch(/^Elsewhere: /);
    expect(lines[4]).toMatch(/^You: exposure \d+% (CLEAR|MILD|IMPAIRED)\./);
    expect(parseMarkup(airReport(s.session, 'treasure_hold')[0]).text).toMatch(/^Treasure Hold: (CLEAN|HAZY)/);
  });

  it('Respond asks which first when both kinds of trouble are here, then runs the choice', async () => {
    const s = demo();
    const air = s.session.ship.air;
    await s.run([{ airSource: 'crew_quarters', substance: 'vapor', rate: 4, amount: 240 }, { ignite: 'crew_quarters', intensity: 20, spread: false }]);
    s.choices.push(1, 2); // Air and vents, then Close the galley door
    await s.run([{ emergency: true }]);
    expect(air.connectionState('galley_door').state).toBe('closed');
    s.choices.push(2); // Leave it
    await s.run([{ emergency: true }]);
    s.session.location.map = 'treasure_hold';
    s.choices.push(0); // only air here: straight to the air list; Check the air
    const lines = s.log.length;
    await s.run([{ emergency: true }]);
    expect(s.log.length).toBe(lines + airReport(s.session, 'treasure_hold').length);
  });

  it('sealing is a challenge on the repair bar: materials on success, a nail per failed try, Try again', async () => {
    const s = demo();
    const air = s.session.ship.air;
    const inv = s.session.inventory;
    await s.run([{ airAdd: 'washroom', substance: 'vapor', pct: 30 }, { airControl: 'washroom_door', state: 'closed' }]);
    s.playHands({ fumbles: 3 }, 'perfect');
    s.decideChallenges('retry');
    await s.run([{ airSeal: 'washroom_door' }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ id: 'seal:washroom_door', outcome: 'success', attempt: 2 });
    expect(air.connectionState('washroom_door').state).toBe('sealed');
    expect([inv.count('sailcloth'), inv.count('nails')]).toEqual([5, 10 - 1 - 1]);
    // Already sealed: nothing to seal.
    await s.run([{ airSeal: 'washroom_door', outcomeValue: 'fx_s' }]);
    expect(s.session.story.getValue('fx_s')).toBe('refused');
  });
});

// ---------------------------------------------------------------------------------------------
describe('the demo scenarios, played headless', () => {
  it('A. containment: shutting the doors keeps the vapor out of the galley and the washroom', async () => {
    const play = async (contain) => {
      const s = demo();
      await s.run([...DEBUG_SHIP.air[0][1], { hazardClock: 3 }]);
      if (contain) await s.run([{ airControl: 'galley_door', state: 'closed' }, { airControl: 'washroom_door', state: 'closed' }]);
      let worst = 0;
      for (let t = 0; t < 80; t++) {
        tick(s.session.ship, 1);
        worst = Math.max(worst, pct(s.session.ship.air, 'washroom', 'vapor'), pct(s.session.ship.air, 'galley', 'vapor'));
      }
      return worst;
    };
    const open = await play(false);
    const contained = await play(true);
    expect(contained).toBeLessThan(open / 2);
  });

  it('B. ventilation: the sealed washroom aired out through its porthole, without a breath of it in the quarters', async () => {
    const s = demo();
    const air = s.session.ship.air;
    await s.run(DEBUG_SHIP.air[1][1]);
    expect(air.connectionState('washroom_door').state).toBe('sealed');
    const start = pct(air, 'washroom', 'heavy_gas');
    s.session.location.map = 'washroom';
    await s.run([{ airControl: 'washroom_porthole', state: 'open' }]);
    s.session.location.map = 'crew_quarters';
    tick(s.session.ship, 120);
    expect(pct(air, 'washroom', 'heavy_gas')).toBeLessThan(start / 5);
    expect(pct(air, 'crew_quarters', 'heavy_gas')).toBe(0);
    // He held his breath for two seconds in there, and it shows; it clears.
    tick(s.session.ship, 30);
    expect(air.exposure).toBe(0);
  });

  it('C. exposure: into the smoky galley, impaired, out again, clear; nothing hurts him once he\'s out', async () => {
    const s = demo();
    const air = s.session.ship.air;
    await s.run(DEBUG_SHIP.air[2][1]);
    s.session.location.map = 'galley';
    let t = 0;
    while (air.exposureNow().stage.id !== 'impaired' && t < 45) {
      tick(s.session.ship, 1);
      t += 1;
    }
    expect(exposureFactors(s.session).walk).toBe(1.2);
    const hp = s.session.party.members[0].hp;
    s.session.location.map = 'crew_quarters';
    tick(s.session.ship, 40);
    expect(air.exposure).toBe(0);
    expect(s.session.party.members[0].hp).toBe(hp);
  });

  it('D. everything at once is solvable on Captain and Brutal: the breach first, the fire, then the vapor and the pump', async () => {
    for (const d of ['captain', 'brutal']) {
      const s = demo({ prefs: { difficulty: d } });
      const ship = s.session.ship;
      await s.run([...DEBUG_SHIP.air[3][1], { hazardClock: 3 }]);
      s.session.location.map = 'cargo_hold';
      await s.run([{ patchLeak: true }]);
      s.session.location.map = 'galley';
      for (let i = 0; i < 6 && ship.hazards.fireIn('galley'); i++) await s.run([{ hazardAction: 'douse' }]);
      s.session.location.map = 'crew_quarters';
      await s.run([{ airControl: 'galley_door', state: 'closed' }, { airControl: 'quarters_porthole', state: 'open' }]);
      s.session.location.map = 'cargo_hold';
      for (let i = 0; i < 20 && ship.hazards.active; i++) await s.run([{ hazardAction: 'pump' }]);
      s.session.location.map = 'main_deck';
      tick(ship, 120, d);
      expect([d, ship.hazards.fires.length, ship.hazards.leaks.filter((l) => l.state === 'open').length, ship.destroyed]).toEqual([d, 0, 0, false]);
      expect([d, ship.air.emergencies().length, ship.air.exposure]).toEqual([d, 0, 0]);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('checkpoints and retry-safe gas events', () => {
  const STRICT = (over = {}) => ({ failure: true, mechanics: { maxFumbles: 1 }, outcomes: { failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' }, ...over });

  it('a checkpoint holds the air, the sources, the openings and his lungs; restoring puts them all back', () => {
    const s = session('p17_complete', 'crew_quarters');
    const air = s.ship.air;
    air.addGas('galley', 'smoke', 30);
    const cp = captureCheckpoint(s, { id: 'fx' });
    const before = JSON.stringify(air.serialize());
    air.startSource({ room: 'crew_quarters', substance: 'vapor', rate: 3, seconds: 30 });
    air.setConnection('fore_hatch', 'closed');
    tick(s.ship, 20);
    expect(air.exposure).toBeGreaterThan(0);
    const d = diffStates({ ship: cp.domains.ship }, s.serialize());
    expect(d.air).toMatchObject({ links: { fore_hatch: ['default', 'closed'] }, sources: [0, 1] });
    expect(d.air.gas.crew_quarters[1]).toBeGreaterThan(0);
    expect(d.air.exposure[1]).toBeGreaterThan(0);
    restoreCheckpoint(s, cp);
    expect(JSON.stringify(air.serialize())).toBe(before);
  });

  it('an attempt\'s own release is rolled back; a release in its costs lands once per failure, however often its callback fires; the same release lands again on a new attempt', async () => {
    const s = demo();
    const air = s.session.ship.air;
    // In the attempt (gas and breath while the bar is up): gone with the retry.
    s.onAttempt((info) => {
      if (info.id === 'fx_air' && info.attempt === 1) {
        air.addGas('galley', 'smoke', 60);
        air.exposure = 30;
      }
    });
    s.playHands('fumble', 'fumble', 'perfect');
    await s.run([{
      repair: 'hull', strikes: 2,
      challenge: STRICT({ id: 'fx_air', onFailure: { mustRetry: true, costs: [
        { airAdd: 'washroom', substance: 'vapor', pct: 10, eventId: 'puff' },
        { airAdd: 'washroom', substance: 'vapor', pct: 10, eventId: 'puff' },
        { airSource: 'treasure_hold', substance: 'heavy_gas', rate: 1, seconds: 5, eventId: 'seep' },
      ] } }),
    }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ outcome: 'success', attempt: 3 });
    expect(air.quantity('galley', 'smoke')).toBe(0);
    expect(air.exposure).toBe(0);
    // Two failures: two puffs (the repeated callback within each charge added nothing) and two seeps.
    expect(pct(air, 'washroom', 'vapor')).toBeCloseTo(20, 6);
    expect(air.sources.filter((x) => x.room === 'treasure_hold').length).toBe(2);
    expect([...s.session.ship.seen].filter((e) => e.startsWith('fx_air:'))).toEqual(['fx_air:cost:1:puff', 'fx_air:cost:1:seep', 'fx_air:cost:2:puff', 'fx_air:cost:2:seep']);
  });

  it('a failed seal tried again: the air and his lungs as they were when the bar went up, the wasted nail gone', async () => {
    const s = demo();
    const air = s.session.ship.air;
    await s.run([{ airAdd: 'crew_quarters', substance: 'vapor', pct: 25 }, { airControl: 'galley_door', state: 'closed' }, { hazardClock: 5 }]);
    let snap = null;
    s.onAttempt((info) => {
      if (info.attempt === 1) {
        snap = JSON.stringify(air.serialize());
        air.addGas('crew_quarters', 'smoke', 20);
      }
    });
    s.playHands({ fumbles: 3 }, 'perfect');
    s.decideChallenges('retry');
    await s.run([{ airSeal: 'galley_door' }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ outcome: 'success', attempt: 2 });
    const now = air.serialize();
    expect(now.links.galley_door).toEqual({ state: 'sealed' });
    expect(now.gas.crew_quarters.smoke).toBeUndefined();
    expect(JSON.parse(snap).exposure).toBeLessThanOrEqual(now.exposure + 1e-9);
    expect(s.session.inventory.count('nails')).toBe(10 - 1 - 1);
  });
});

// ---------------------------------------------------------------------------------------------
describe('saves (version 20, since Prompt 8 21, Prompt 9 22)', () => {
  it('the air saves and loads exactly, and goes on the same way afterwards', async () => {
    expect(SAVE_VERSION).toBe(22);
    const s = demo();
    const air = s.session.ship.air;
    await s.run([...DEBUG_SHIP.air[4][1], { airControl: 'galley_door', state: 'closed' }, { hazardClock: 12 }]);
    expect(air.exposure).toBeGreaterThan(0);
    const t = reloadStory(s);
    expect(t.record.version).toBe(22);
    expect(t.session.ship.air.serialize()).toEqual(air.serialize());
    tick(s.session.ship, 30);
    tick(t.session.ship, 30);
    expect(JSON.stringify(t.session.ship.air.serialize())).toBe(JSON.stringify(air.serialize()));
  });

  it('version 17, 18 and 19 saves load with clean air, every opening at its default, clear lungs; everything else as it was', () => {
    const s = session();
    s.ship.applyDamage({ section: 'hull_port', amount: 40 });
    s.ship.hazards.addWater('cargo_hold', 30);
    for (const version of [17, 18, 19]) {
      const storage = new MemoryStorage();
      const old = new SaveManager({ storage, content, version });
      const serialize = s.serialize.bind(s);
      s.serialize = () => {
        const st = serialize();
        if (version === 17) delete st.ship;
        else if (version === 18) st.ship = { sections: st.ship.sections };
        else delete st.ship.air;
        return st;
      };
      expect(old.save(1, s).ok).toBe(true);
      s.serialize = serialize;
      const read = new SaveManager({ storage, content }).read(1);
      expect([version, read.ok]).toEqual([version, true]);
      const loaded = GameSession.fromState({ content, bus: new EventBus(), state: read.state });
      expect([version, loaded.ship.air.active, Object.keys(loaded.ship.air.links)]).toEqual([version, false, []]);
      expect(loaded.ship.section('hull_port').hp).toBe(version === 17 ? 100 : 60);
      expect(loaded.ship.hazards.water.cargo_hold ?? 0).toBe(version === 19 ? 30 : 0);
      expect(loaded.inventory.serialize()).toEqual(s.inventory.serialize());
      expect(loaded.story.serialize()).toEqual(s.story.serialize());
    }
  });

  it('damaged air data loads safely: what doesn\'t fit is dropped or clamped, nothing invented', () => {
    const s = session();
    const warnings = [];
    s.ship.load({
      sections: {},
      air: {
        gas: { galley: { smoke: 300, sulfur: 5, vapor: 'lots' }, bilge: { smoke: 5 }, washroom: { vapor: -3, heavy_gas: 12 } },
        sources: [
          { id: 'src_4', room: 'galley', substance: 'smoke', rate: 99, left: 10, ticks: null },
          { id: 'src_5', room: 'galley', substance: 'smoke', rate: 1, left: null, ticks: null },
          { id: 'src_6', room: 'bilge', substance: 'smoke', rate: 1, left: 5, ticks: null },
          'junk',
        ],
        links: { galley_door: { state: 'sealed', damaged: true }, hold_stairs: { state: 'closed' }, nope: { state: 'open' } },
        exposure: 500,
        next: 'x',
      },
    }, (w) => warnings.push(w));
    const air = s.ship.air;
    expect(air.airIn('galley').total).toBeCloseTo(100, 6); // 300 into a room of 160: scaled down
    expect(Object.keys(air.gas).sort()).toEqual(['galley', 'washroom']);
    expect(air.quantity('washroom', 'vapor')).toBe(0);
    expect(air.sources.map((x) => [x.id, x.rate])).toEqual([['src_4', 20]]);
    expect(air.links).toEqual({ galley_door: { state: 'closed', damaged: true } });
    expect(air.exposure).toBe(100);
    expect(air.next).toBe(5);
    expect(warnings.length).toBe(9);
  });

  it('loading replays nothing: no notices, no breath taken, the next second goes on from where it was', () => {
    const s = session('p17_complete', 'crew_quarters');
    s.ship.air.addGas('crew_quarters', 'vapor', 60);
    tick(s.ship, 8);
    const state = s.serialize();
    const bus = new EventBus();
    const notices = noticesOf(bus);
    const loaded = GameSession.fromState({ content, bus, state });
    expect(notices).toEqual([]);
    expect(loaded.ship.air.exposure).toBe(s.ship.air.exposure);
    loaded.location.map = 'crew_quarters';
    tick(loaded.ship, 1);
    tick(s.ship, 1);
    expect(notices.filter((n) => /toxic|foul|deadly/i.test(n.key))).toEqual([]);
    expect(loaded.ship.air.exposure).toBeCloseTo(s.ship.air.exposure, 9);
  });

  it('saving in the middle of shutting a door holds the moment: the door as it was, no work under way', async () => {
    const s = demo();
    await s.run([{ airAdd: 'crew_quarters', substance: 'vapor', pct: 20 }]);
    const storage = new MemoryStorage();
    const saves = new SaveManager({ storage, content });
    const off = s.bus.on('hazard:changed', () => {
      if (s.session.ship.hazards.working && !saves.read(1).ok) saves.save(1, s.session);
    });
    await s.run([{ airControl: 'fore_hatch', state: 'closed' }]);
    off?.();
    const mid = GameSession.fromState({ content, bus: new EventBus(), state: saves.read(1).state });
    expect(mid.ship.hazards.working).toBe(false);
    expect(mid.ship.air.connectionState('fore_hatch').state).toBe('open');
    expect(s.session.ship.air.connectionState('fore_hatch').state).toBe('closed');
  });
});

// ---------------------------------------------------------------------------------------------
describe('time: the one clock', () => {
  it('the air moves only on hazard ticks: scenes and dialogue never; work and an authored clock exactly', async () => {
    const s = demo();
    const air = s.session.ship.air;
    await s.run([{ airAdd: 'crew_quarters', substance: 'vapor', pct: 30 }]);
    const still = JSON.stringify(air.serialize());
    await s.run([{ narrate: 'The cask hisses.' }, { wait: 2 }, { airCheck: true }]);
    expect(JSON.stringify(air.serialize())).toBe(still);
    const ref = session('p17_complete', 'crew_quarters');
    ref.ship.air.addGas('crew_quarters', 'vapor', 60);
    await s.run([{ hazardClock: 4 }]);
    tick(ref.ship, 4);
    expect(air.serialize().gas).toEqual(ref.ship.air.serialize().gas);
    // Not eligible (a scene, a menu, the F2 panel): the clock runs no tick at all.
    const clock = new HazardClock(1000);
    let n = 0;
    for (let i = 0; i < 600; i++) clock.advance(16, { eligible: false, active: true, tick: () => n++ });
    expect(n).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
describe('flooding and fire', () => {
  it('smoke only from a fire that is asked to make it (and what it spreads to); the flooding and fire are the same with or without the air', () => {
    const plain = session();
    plain.ship.hazards.ignite({ room: 'galley', intensity: 60 });
    tick(plain.ship, 20);
    expect(plain.ship.air.total('smoke')).toBe(0);
    const smoky = session();
    smoky.ship.hazards.ignite({ room: 'galley', intensity: 60, smoke: true });
    tick(smoky.ship, 20);
    expect(smoky.ship.air.total('smoke') + (smoky.ship.air.vented.smoke ?? 0)).toBeGreaterThan(20);
    expect(smoky.ship.hazards.serialize().fires.map((f) => f.room)).toEqual(plain.ship.hazards.serialize().fires.map((f) => f.room));
    expect(smoky.ship.hazards.fires.every((f) => f.smoke === true)).toBe(true);
    // The same leaks, water and fires whatever is in the air.
    const a = session();
    const b = session();
    for (const t of [a, b]) {
      t.ship.hazards.openLeak({ section: 'hull_port', severity: 'breach' });
      t.ship.hazards.ignite({ room: 'crew_quarters', intensity: 40 });
    }
    b.ship.air.addGas('cargo_hold', 'heavy_gas', 100);
    b.ship.air.startSource({ room: 'galley', substance: 'vapor', rate: 3, seconds: 60 });
    tick(a.ship, 60);
    tick(b.ship, 60);
    expect(b.ship.hazards.serialize()).toEqual(a.ship.hazards.serialize());
    expect(b.ship.serialize().sections).toEqual(a.ship.serialize().sections);
  });
});

// ---------------------------------------------------------------------------------------------
describe('the legacy fumes are as they were', () => {
  it('the fume zones\' exposure is untouched, never doubled, and the Phase 15 atmosphere and the Fart Zone\'s portholes stay story values', async () => {
    // The legacy rules, as they always were (data/hazards/fumes.json unchanged).
    expect(content.hazards.get('fumes').levels).toMatchObject({ light: { exposure: 0 }, dense: { exposure: 11 }, center: { exposure: 32 } });
    const e = new Exposure(DEFAULT_FUME_CONFIG);
    e.update(1000, 'dense', 1);
    expect(e.value).toBe(11);
    // The air never touches the legacy meter (per play, never saved), and while a zone holds him the air adds nothing.
    const s = demo();
    await s.run([{ airAdd: 'crew_quarters', substance: 'vapor', pct: 40 }, { hazardClock: 5 }]);
    expect(s.session.transient.exposure).toBeUndefined();
    const before = s.session.ship.air.exposure;
    s.session.ship.air.legacyOwns = true;
    await s.run([{ hazardClock: 5 }]);
    expect(s.session.ship.air.exposure).toBe(before);
    // The story's atmosphere (Phase 15) and the Fart Zone's procedure are their own: no gas, no opening changed.
    const t = demo();
    await t.run([{ atmosphere: 'COFFIN_SOCK' }]);
    setPortholes(fartZoneDef(content), t.session, 'open');
    expect(t.session.ship.air.active).toBe(false);
    expect(t.session.ship.air.connectionState('fz_portholes').state).toBe('closed');
  });
});

// ---------------------------------------------------------------------------------------------
describe('the HUD, the Ship page and the words', () => {
  /** Stand-in game objects (as tests/hazards.test.js): every call chains; text keeps what it's given. */
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
  const plain = (t) => parseMarkup(String(t).replace(/\{[^{}]+\}/g, 'XXXXXXXX')).text;

  it('the emergency line names bad air with the rest, and the condition reads it', async () => {
    const s = demo();
    await s.run([{ airAdd: 'galley', substance: 'smoke', pct: 60 }, { airSource: 'crew_quarters', substance: 'vapor', rate: 2, seconds: 20 }]);
    const e = emergencySummary(s.session);
    expect(e.items).toEqual(['<o>AIR</> Galley TOXIC']);
    expect(e.respond).toBe(true);
    const air = { room: 'galley' };
    expect(evaluateCondition({ air }, s.session)).toBe(true);
    expect(evaluateCondition({ air: { room: 'galley', quality: ['toxic', 'deadly'] } }, s.session)).toBe(true);
    expect(evaluateCondition({ air: { room: 'galley', substance: 'smoke', pct: { gte: 50 } } }, s.session)).toBe(true);
    expect(evaluateCondition({ air: { room: 'galley', safe: true } }, s.session)).toBe(false);
    expect(evaluateCondition({ air: { room: 'treasure_hold', safe: true } }, s.session)).toBe(true);
    expect(evaluateCondition({ air: { source: 'crew_quarters' } }, s.session)).toBe(true);
    expect(evaluateCondition({ air: { connection: 'galley_door', state: 'open' } }, s.session)).toBe(true);
    expect(evaluateCondition({ air: { any: true } }, s.session)).toBe(true);
    s.session.location.map = 'galley';
    await s.run([{ hazardClock: 3 }]);
    expect(evaluateCondition({ air: { exposure: { gte: 1 } } }, s.session)).toBe(true);
    expect(evaluateCondition({ air: { exposureStage: ['mild', 'impaired'] } }, s.session)).toBe(false);
  });

  it('the Ship page lists bad air and the captain\'s lungs; Confirm (Z or pad A) on the air here opens Respond, once; elsewhere it buzzes', async () => {
    const pads = [{ id: 'Test Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) }];
    Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true, writable: true });
    for (const device of ['keyboard', 'pad']) {
      const s = demo();
      await s.run([{ airAdd: 'crew_quarters', substance: 'vapor', pct: 30 }, { airAdd: 'galley', substance: 'smoke', pct: 40 }, { hazardClock: 3 }]);
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
      const rows = page.menu.items.slice(6).map((i) => [i.label, i.right]);
      expect(rows.map((r) => r[0])).toEqual(['Air: Crew Quarters', 'Air: Galley', 'Your lungs']);
      expect(rows[0][1]).toMatch(/^VAPOR \d+% (TOXIC|FOUL)$/);
      expect(rows[2][1]).toMatch(/^\d+% (MILD|CLEAR)$/);
      const lines = () => page.detail.objects.map((o) => o.text.replace(/\n/g, ' ')).join(' | ');
      for (let i = 0; i < 7; i++) press('ArrowDown', 13);
      expect(page.menu.selected.value).toBe('hz:air:galley');
      expect(lines()).toMatch(/Go there to deal with it\./);
      press('KeyZ', 0);
      expect(scene.closed).toEqual([]);
      expect(sounds).toContain('buzzer');
      press('ArrowUp', 12);
      expect(page.menu.selected.value).toBe('hz:air:crew_quarters');
      expect(lines()).toMatch(/Open: fore hatch, galley door, washroom door\. Shut: porthole\./);
      expect(lines()).toMatch(/Respond here/);
      press('KeyZ', 0);
      press('KeyZ', 0);
      expect(scene.closed.length).toBe(1);
      const ran = [];
      scene.closed[0].then({ runScript: (steps) => ran.push(steps) });
      expect(ran).toEqual([[{ emergency: true }]]);
    }
  });

  it('every air word fits: toasts in four lines, report lines on one page, choices, work labels, page details', async () => {
    const bad = [];
    const s = demo({ prefs: { difficulty: 'brutal' } });
    const notices = noticesOf(s.bus);
    s.session.inventory.add('sailcloth', 10);
    // The worst everywhere: every substance in every room, sources, damaged openings, his lungs at the worst.
    for (const room of airRoomIds(content)) s.session.ship.air.startSource({ room, substance: 'heavy_gas', rate: 5, seconds: 30, label: 'a cracked cask of pickling vinegar from the Grand Bank' });
    await s.run([{ hazardClock: 40 }]);
    for (const n of [...notices, ...s.notices]) if (wrap(fonts.main, plain(n.text), TOAST_TEXT_WIDTH).split('\n').length > 4) bad.push(`toast: ${n.text}`);
    const DIALOGUE_W = 312 - 10 - 10;
    const CHOICE_W = SCREEN_WIDTH - 12 - 26 - 4;
    for (const room of airRoomIds(content)) {
      s.session.location.map = room;
      for (const c of s.session.ship.air.connectionsIn(room)) if (c.changeable && c.states.includes('sealed')) s.session.ship.air.setConnection(c.id, 'closed');
      for (const line of airReport(s.session, room)) if (wrap(fonts.main, plain(line), DIALOGUE_W).split('\n').length > 4) bad.push(`report: ${line}`);
      for (const o of airOptions(s.session, room, { difficulty: 'brutal' })) {
        if (measure(fonts.main, plain(o.label)) > CHOICE_W) bad.push(`choice: ${o.label}`);
        if (o.reason && wrap(fonts.main, plain(o.reason), TOAST_TEXT_WIDTH).split('\n').length > 4) bad.push(`reason: ${o.reason}`);
      }
      for (const c of s.session.ship.air.connectionsIn(room)) {
        for (const verb of ['Opening', 'Closing', 'Unsealing', 'Sealing']) {
          const label = `${verb} ${c.label}`.toUpperCase();
          if (measure(fonts.bold, label) + 38 > SCREEN_WIDTH - 8) bad.push(`work: ${label}`);
        }
      }
    }
    // The page's detail for each bad room and the lungs, in the detail panel's space.
    const input = new InputManager({ target: {} });
    const app = { session: s.session, content, input, fontMetrics: fonts, settings: { challengePrefs: () => ({ difficulty: 'brutal' }) }, audio: { ui: () => {}, sfx: () => {} } };
    const page = new ShipPage(stubScene(app), PANE);
    page.render();
    const DETAIL_W = PANE.w - 24;
    // The detail panel: text from 117 down to 6 above its bottom edge, 11 px a line and 2 between entries.
    const DETAIL_ROOM = PANE.h - 4 - 6 - 117;
    for (const item of page.menu.items.filter((i) => String(i.value).startsWith('hz:'))) {
      page.detail.clear();
      page.renderHazard(item.value.slice(3));
      const height = page.detail.objects.reduce((n, o) => n + wrap(fonts.main, plain(o.text), DETAIL_W).split('\n').length * 11 + 2, -2);
      if (height > DETAIL_ROOM) bad.push(`page ${item.value}: ${height} px (room for ${DETAIL_ROOM})`);
    }
    expect(bad).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('the campaign is unchanged', () => {
  const AIR_COMMANDS = ['airSource', 'airStop', 'airAdd', 'airVent', 'airConnection', 'airCheck', 'airControl', 'airSeal'];

  it('no chapter starts gas, opens or seals an opening, or reads the air; no fire of the story smokes', () => {
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
        if (AIR_COMMANDS.includes(name)) found.push(`${at}: ${name}`);
        if (v.air !== undefined && typeof v.air === 'object') found.push(`${at}: air condition`);
        if (v.ignite !== undefined && v.smoke) found.push(`${at}: smoke`);
        Object.values(v).forEach((x) => visit(x, at));
      }
    };
    for (const id of content.scripts.ids()) visit(content.scripts.get(id), id);
    for (const id of content.maps.ids()) visit(content.maps.get(id), id);
    for (const id of content.quests.ids()) visit(content.quests.get(id), id);
    expect(found).toEqual([]);
    expect(REGISTRY.airSeal.commands).toEqual(['airSeal']);
    expect(NON_CHALLENGE_COMMANDS).toEqual(expect.arrayContaining(AIR_COMMANDS.filter((c) => c !== 'airSeal')));
  });

  it('every phase\'s approved snapshot breathes clean air; the demo is debug-only', () => {
    const baselines = import.meta.glob('/tests/regression/baselines/phase-*.json', { eager: true, import: 'default' });
    expect(Object.keys(baselines).length).toBe(17);
    for (const [file, snap] of Object.entries(baselines)) expect([file, snap.gameplay.systems.ship.air]).toEqual([file, { rooms: [], sources: 0, links: [], exposure: 0 }]);
    expect(DEBUG_SHIP.air.length).toBe(5);
    expect(content.debugPresets.has('air_demo')).toBe(true);
    expect(session('air_demo').ship.untouched).toBe(true);
  });

  it('the legacy fume scenes play as they did: their steps start no gas and no exposure in the new system', async () => {
    const s = makeStory({ preset: 'p17_complete' });
    await s.run([{ atmosphere: 'FIRE_WAFT' }, { fumeCloud: 'fx_cloud', level: 'dense', x: 4, y: 4, w: 3, h: 3 }, { fumeCloud: 'fx_cloud', remove: true }, { hazardClock: 10 }]);
    expect(s.session.ship.air.active).toBe(false);
    expect(s.session.ship.untouched).toBe(true);
  });
});
