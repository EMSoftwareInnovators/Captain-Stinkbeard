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
import { shipTuning, SHIP_TUNING, shipDataProblems } from '../src/systems/ship/integrity.js';
import { beardDataProblems, contaminantIds, beardStages, stageForPct, contaminant } from '../src/systems/ship/beard.js';
import { beardOptions, beardReport, sniffReport, beardWord, scrubCost } from '../src/systems/ship/beardResponse.js';
import { captainFactors } from '../src/systems/ship/airResponse.js';
import { emergencySummary, emergencyLine } from '../src/systems/ship/response.js';
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
 * Stink Beard Saturation (docs/gameplay-overhaul/13-beard-saturation.md).
 * Deterministic: hazard time is ticked by hand or by the work actions; a
 * scrub is the game's own timing bar played by simulated hands. The real
 * shared systems throughout (the ship, its air, the pressure, the challenge
 * runner, saves). The browser half is e2e/beard.spec.js. No chapter uses
 * any of it.
 */
const content = loadContent();
const FILES = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' });
/** Content errors with a fixture script added (the content itself is not changed). */
const fixtureErrors = (steps) => {
  const files = structuredClone(FILES);
  files['/data/story/cutscenes/zz_beard_fixture.json'] = { 'zz.beard_fixture': steps };
  return validateContent(new ContentDB(files)).errors.join('\n');
};
const DIFFS = ['deckhand', 'captain', 'brutal'];
const T = (d = 'captain') => shipTuning(content, d);
const tick = (ship, n = 1, d = 'captain') => {
  for (let i = 0; i < n; i++) ship.tick(T(d));
};

function session(preset = 'beard_demo', room = 'crew_quarters', at = { x: 12, y: 7 }) {
  const s = GameSession.newGame({ content, bus: new EventBus(), strictFlags: true });
  applyPresetPlan(s, resolvePreset(content, preset));
  s.location = { ...s.location, map: room, ...at };
  return s;
}
const on = (s, d = 'captain') => {
  s.ship.beard.enable(true);
  s.ship.beard.tuning = T(d);
  return s.ship.beard;
};
const demo = (opts = {}) => makeStory({ preset: 'beard_demo', ...opts });
const scenario = (letter) => DEBUG_SHIP.beard.find(([label]) => label.startsWith(`Beard ${letter}:`))[1];
const noticesOf = (bus) => {
  const out = [];
  bus.on('hazard:notice', (n) => out.push(n));
  return out;
};
const eventsOf = (bus, type) => {
  const out = [];
  bus.on(type, (e) => out.push(e));
  return out;
};
const plain = (t) => parseMarkup(String(t).replace(/\{[^{}]+\}/g, 'XXXXXXXX')).text;
/** Where every unit of an air substance is: in a room, out of the ship, or in the beard (minus what the beard gave back). */
const ledger = (ship, sub) => ship.air.total(sub) + (ship.air.vented[sub] ?? 0) + (ship.air.decayed[sub] ?? 0) + (ship.air.absorbed[sub] ?? 0) - (ship.beard.released[sub] ?? 0);
const toWashroom = (s, x = 7, y = 6) => {
  s.session.location = { ...s.session.location, map: 'washroom', x, y };
};

// ---------------------------------------------------------------------------------------------
describe('the beard model and its data', () => {
  it('a compact registry: the three air gases and two event residues (one debug-only), seven stages, four statuses; off and untouched until a script switches it on', () => {
    expect(beardDataProblems(content)).toEqual([]);
    expect(contaminantIds(content)).toEqual(['smoke', 'vapor', 'heavy_gas', 'stench_residue', 'test_musk']);
    expect(beardStages(content).map((st) => st.id)).toEqual(['clean', 'trace', 'noticeable', 'saturated', 'heavy', 'critical', 'overloaded']);
    expect(Object.keys(content.shipBeard.statuses).filter((k) => !k.startsWith('//'))).toEqual(['saturated', 'gagging', 'paranoid', 'hornet_nested']);
    expect(contaminant(content, 'test_musk')).toMatchObject({ debugOnly: true, paranoia: true, supernatural: true });
    // Only the musk can make him paranoid; smoke never.
    expect(contaminantIds(content).filter((id) => contaminant(content, id).paranoia)).toEqual(['test_musk']);
    const s = session();
    const b = s.ship.beard;
    expect([b.on, b.untouched, b.active, b.total, s.ship.untouched]).toEqual([false, true, false, 0, true]);
    expect(b.serialize()).toEqual({});
    expect(b.info()).toMatchObject({ stage: 'clean', pct: 0, statuses: [], phase: 'idle' });
    // Off: it catches nothing, gives off nothing and slows nothing.
    expect([b.absorbing, b.offgas(), b.factors()]).toEqual([false, 0, { work: 1, walk: 1 }]);
  });

  it('bad beard data is a content error: rising stages, a full beard catches nothing, purges never release more than they hold, care costs real materials', () => {
    const bad = structuredClone(content.shipBeard);
    bad.contaminants.smoke.air = 'brimstone';
    bad.contaminants.vapor.cleans = 0;
    bad.contaminants.stench_residue.supernatural = false;
    bad.stages[3].below = 10;
    bad.stages[6].absorb = 0.2;
    bad.purge.controlled.share = 1.5;
    bad.purge.overload.cooldown = 1;
    bad.purge.overload.warn = 1;
    bad.statuses.paranoid.visions = ['GRAND STENCHMASTER ALERT'];
    bad.statuses.hornet_nested.seconds = 0;
    bad.statuses.gagging.effects.gagEvery = 1;
    bad.care.scrub.cost = [{ item: 'beard_wrap', count: 1 }];
    bad.care.stations[0].room = 'nowhere';
    bad.equipment.wet_cloth.lungs = 0;
    const c2 = Object.create(content);
    c2.shipBeard = bad;
    const problems = beardDataProblems(c2).join('\n');
    for (const m of [/smoke.*air must be a substance/, /vapor.*cleans must be above 0/, /stench_residue.*must be supernatural/, /stages\[3\].*below must rise/, /stages\[6\].*a full beard catches nothing/,
      /purge.controlled.*share must be above 0, at most 1/, /purge.overload.*cooldown must be 5 to 300/, /purge.overload.*warn must be 4 to 30/, /paranoid.*every vision starts "\(\?\) "/, /hornet_nested.*an applied status always ends/,
      /gagging.*gagEvery must be 3 seconds or more/, /care.scrub.*"beard_wrap" is not a material/, /care.stations\[0\].*room must have ship air/, /equipment.wet_cloth.*lungs must be above 0/]) expect(problems).toMatch(m);
  });

  it('capacity: the total is the sum of what it holds, never negative, never past capacity; unknown contaminants and bad amounts are refused and change nothing', () => {
    const s = session();
    const b = on(s);
    expect(b.deposit('smoke', 30).added).toBe(30);
    expect(b.deposit('vapor', 50).added).toBe(50);
    expect(b.deposit('heavy_gas', 40)).toMatchObject({ ok: true, added: 20, refused: 20 });
    expect(b.total).toBe(100);
    expect(b.total).toBe(Object.values(b.held).reduce((n, q) => n + q, 0));
    for (const [id, n] of [['brimstone', 5], ['smoke', -5], ['smoke', 0], ['smoke', NaN], ['smoke', 1000]]) expect([id, n, b.deposit(id, n).ok]).toEqual([id, n, false]);
    expect(b.total).toBe(100);
    b.clean({ share: 1 });
    expect([b.total, Object.keys(b.held)]).toEqual([0, []]);
    expect(b.clean({ contaminant: 'brimstone' }).ok).toBe(false);
    // Off: nothing goes in.
    b.enable(false);
    expect(b.deposit('smoke', 5)).toMatchObject({ ok: false, reason: 'off' });
  });

  it('stages by how full it is, on each difficulty\'s capacity (Deckhand holds more, Brutal less)', () => {
    expect([[0, 'clean'], [1.9, 'clean'], [2, 'trace'], [14.9, 'trace'], [15, 'noticeable'], [35, 'saturated'], [60, 'heavy'], [80, 'critical'], [99.9, 'critical'], [100, 'overloaded']]
      .map(([pct]) => stageForPct(content, pct).id)).toEqual(['clean', 'clean', 'trace', 'trace', 'noticeable', 'saturated', 'heavy', 'critical', 'critical', 'overloaded']);
    const caps = {};
    const at50 = {};
    for (const d of DIFFS) {
      const s = session();
      const b = on(s, d);
      caps[d] = b.capacity(T(d));
      b.deposit('smoke', 50, T(d));
      at50[d] = b.stage(T(d)).id;
    }
    expect(caps).toEqual({ deckhand: 140, captain: 100, brutal: 70 });
    expect(at50).toEqual({ deckhand: 'saturated', captain: 'saturated', brutal: 'heavy' });
  });
});

// ---------------------------------------------------------------------------------------------
describe('absorption from the room\'s air', () => {
  it('what the beard takes leaves the room: every unit poured is in a room, out of the ship, or in the beard (and what it gave back)', () => {
    const s = session();
    const b = on(s);
    s.ship.air.startSource({ room: 'crew_quarters', substance: 'smoke', rate: 6, amount: 300 });
    s.ship.air.startSource({ room: 'crew_quarters', substance: 'vapor', rate: 3, amount: 90 });
    for (let i = 0; i < 400; i++) {
      tick(s.ship);
      if (i === 150) b.purge('controlled');
    }
    expect(ledger(s.ship, 'smoke')).toBeCloseTo(300, 6);
    expect(ledger(s.ship, 'vapor')).toBeCloseTo(90, 6);
    // The beard holds what it took, less what it gave back and what was washed out.
    for (const [cid, sub] of [['smoke', 'smoke'], ['vapor', 'vapor']]) expect(b.amount(cid) + (b.cleaned[cid] ?? 0)).toBeCloseTo((s.ship.air.absorbed[sub] ?? 0) - (b.released[sub] ?? 0), 6);
    expect(s.ship.air.absorbed.smoke).toBeGreaterThan(10);
  });

  it('it protects his lungs while it has room, less as it fills, and not at all when full: the same smoke, beard off and on', () => {
    const run = (withBeard, start = 0) => {
      const s = session();
      if (withBeard) {
        const b = on(s);
        if (start) b.deposit('smoke', start);
      }
      s.ship.air.startSource({ room: 'crew_quarters', substance: 'smoke', rate: 8, seconds: 60 });
      tick(s.ship, 60);
      return s.ship.air.exposure;
    };
    const none = run(false);
    const clean = run(true);
    const half = run(true, 50);
    const full = run(true, 100);
    expect(none).toBeGreaterThan(0);
    expect(clean).toBeLessThan(none * 0.5);
    expect(half).toBeGreaterThan(clean);
    expect(full).toBeGreaterThanOrEqual(none); // full: no protection (and it gives off what it holds)
    // The share of a breath it catches, by stage and by gas.
    const s = session();
    const b = on(s);
    const shares = [];
    for (const add of [0, 40, 25, 20, 15]) {
      if (add) b.deposit('smoke', add);
      shares.push([b.stage().id, b.catchShare('smoke'), b.catchShare('vapor'), b.catchShare('heavy_gas')]);
    }
    expect(shares).toEqual([['clean', 0.55, 0.44000000000000006, 0.275], ['saturated', 0.35, 0.27999999999999997, 0.175], ['heavy', 0.2, 0.16000000000000003, 0.1], ['critical', 0.1, 0.08000000000000002, 0.05], ['overloaded', 0, 0, 0]]);
  });

  it('deterministic: two identical runs end identical, beard and air alike', () => {
    const run = () => {
      const s = session();
      on(s);
      s.ship.air.startSource({ room: 'crew_quarters', substance: 'vapor', rate: 5, amount: 400 });
      s.ship.air.addGas('crew_quarters', 'heavy_gas', 20);
      tick(s.ship, 300);
      return JSON.stringify(s.ship.serialize());
    };
    expect(run()).toBe(run());
  });

  it('one exposure, never two: a legacy fume zone owns his lungs (the beard still takes the ship\'s air); the fume hazard option keeps it out of his lungs, not out of his beard', () => {
    const s = session();
    const b = on(s);
    s.ship.air.addGas('crew_quarters', 'smoke', 80);
    s.ship.air.legacyOwns = true;
    tick(s.ship, 5);
    expect(s.ship.air.exposure).toBe(0);
    expect(b.amount('smoke')).toBeGreaterThan(0);
    const t = session();
    const c = on(t);
    t.ship.air.access = 0; // the fume hazard option off (or immunity)
    c.fume = 0;
    const gags = eventsOf(t.bus, 'beard:gag');
    c.deposit('vapor', 60);
    t.ship.air.addGas('crew_quarters', 'smoke', 80);
    tick(t.ship, 30);
    expect(t.ship.air.exposure).toBe(0);
    expect(c.amount('smoke')).toBeGreaterThan(0);
    expect(c.sniff().dose).toBe(0);
    expect(gags).toEqual([]);
  });

  it('a heavy beard gives off what it holds: recovery is slower in clean air, but never reversed there on any difficulty', () => {
    for (const d of DIFFS) {
      const s = session();
      const b = on(s, d);
      b.deposit('heavy_gas', 100, T(d));
      b.enable(true);
      // The worst it can give off: full of the most potent air gas, purges disabled for the test.
      b.phase = 'cooldown';
      b.left = 9999;
      const off = b.offgas(T(d)) * T(d).exposureScale;
      expect([d, off < 5 * T(d).recoveryScale]).toEqual([d, true]);
      s.ship.air.exposure = 0;
      tick(s.ship, 20, d);
      expect([d, s.ship.air.exposure]).toEqual([d, 0]);
      // From exposure 40 in clean air, slower than with a clean beard.
      s.ship.air.exposure = 40;
      tick(s.ship, 3, d);
      const heavy = s.ship.air.exposure;
      const t = session();
      t.ship.air.exposure = 40;
      tick(t.ship, 3, d);
      expect([d, heavy > t.ship.air.exposure]).toEqual([d, true]);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('Grand Stenchmaster eruptions', () => {
  it('an eruption leaves its residue in the beard only if he is in the room and close, once per eruption; its gas reaches the beard only as he breathes it', () => {
    const s = session('beard_demo', 'crew_quarters', { x: 12, y: 7 });
    const b = on(s);
    const pr = s.ship.pressure;
    pr.enable('garrick');
    pr.settle('garrick', 100);
    const r = pr.erupt('garrick', { profile: 'moderate', tuning: T() });
    expect(r.beard).toMatchObject({ ok: true, added: 12, source: 'pressure:garrick' });
    expect(b.amount('stench_residue')).toBe(12);
    // Its gas is in the room, not in the beard (until he breathes it).
    expect(b.amount(content.shipPressure.subjects.garrick.substance)).toBe(0);
    expect(s.ship.air.sources.some((x) => x.id === 'erupt_garrick_1')).toBe(true);
    // The same eruption again: refused (one event id), nothing more.
    expect(pr.erupt('garrick', { profile: 'moderate', tuning: T(), eventId: r.eventId }).ok).toBe(false);
    expect(b.amount('stench_residue')).toBe(12);
    // Away from it: nothing. Off: nothing, and no beard in the result.
    const t = session('beard_demo', 'main_deck', { x: 5, y: 5 });
    on(t);
    t.ship.pressure.enable('garrick');
    t.ship.pressure.settle('garrick', 100);
    expect(t.ship.pressure.erupt('garrick', { profile: 'moderate', room: 'crew_quarters', tuning: T() }).beard).toMatchObject({ added: 0, reason: 'not there' });
    const u = session();
    u.ship.pressure.enable('garrick');
    u.ship.pressure.settle('garrick', 100);
    expect(u.ship.pressure.erupt('garrick', { profile: 'moderate', tuning: T() }).beard).toBeUndefined();
    expect(u.ship.beard.untouched).toBe(true);
  });

  it('the residue is no air gas (never counted twice), and the eruptions data says so', () => {
    for (const id of ['brogath', 'garrick']) {
      const bd = content.shipPressure.subjects[id].beard;
      expect(contaminant(content, bd.contaminant)).toMatchObject({ supernatural: true });
      expect(contaminant(content, bd.contaminant).air).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('statuses', () => {
  it('Saturated comes from how full it is; Gagging from the irritants in it (the goggles halve them), with a fit every 8 s and none with the fume hazard option off', () => {
    const s = session();
    const b = on(s);
    const gags = eventsOf(s.bus, 'beard:gag');
    b.deposit('smoke', 34);
    expect(b.statusOn('saturated')).toBe(false);
    b.deposit('smoke', 1);
    expect(b.statusOn('saturated')).toBe(true);
    b.deposit('vapor', 29);
    expect(b.statusOn('gagging')).toBe(false);
    b.deposit('vapor', 1);
    expect(b.statusOn('gagging')).toBe(true);
    expect(b.factors().work).toBeCloseTo(1.1 * 1.15, 6); // heavy (64%) and gagging
    tick(s.ship, 24);
    expect(gags.length).toBe(3);
    b.fume = 0;
    tick(s.ship, 24);
    expect(gags.length).toBe(3);
    // The goggles keep the sting out: half the irritant counts.
    s.inventory.add('bottle_goggles', 1);
    b.wear('bottle_goggles');
    expect(b.statusOn('gagging')).toBe(false);
    b.deposit('heavy_gas', 30);
    expect(b.statusOn('gagging')).toBe(true);
  });

  it('Hornet-nested is applied, buzzes on its hook, runs out, and smoke drives it out; a derived status can\'t be applied; times are bounded', () => {
    const s = session();
    const b = on(s);
    const buzz = eventsOf(s.bus, 'beard:hornets');
    expect(b.applyStatus('hornet_nested').left).toBe(300);
    expect(b.factors().work).toBeCloseTo(1.1, 6);
    tick(s.ship, 27);
    expect(buzz.length).toBe(3);
    expect(b.statuses.hornet_nested.left).toBe(273);
    b.deposit('smoke', 12);
    expect(b.statusOn('hornet_nested')).toBe(false);
    expect(b.applyStatus('hornet_nested', 5).ok).toBe(true);
    b.clean({ share: 1 });
    tick(s.ship, 5);
    expect(b.statusOn('hornet_nested')).toBe(false);
    expect(b.applyStatus('saturated')).toMatchObject({ ok: false });
    expect(b.applyStatus('gagging')).toMatchObject({ ok: false });
    expect(b.applyStatus('hornet_nested', 601)).toMatchObject({ ok: false });
    expect(b.applyStatus('hornet_nested', 0)).toMatchObject({ ok: false });
  });

  it('paranoia only from the musk (a full beard of smoke never), lingers, shows visions marked (?), never touches a name or the HUD line, and a sniff snaps him out of it for a while', () => {
    const s = session();
    const b = on(s);
    b.deposit('smoke', 100);
    tick(s.ship, 5);
    expect(b.statusOn('paranoid')).toBe(false);
    b.clean({ share: 1 });
    b.phase = 'idle';
    b.left = 0;
    const visions = eventsOf(s.bus, 'beard:hallucinate');
    const notes = noticesOf(s.bus);
    const names = content.npcs.ids().map((id) => content.npcs.get(id).name);
    const story = JSON.stringify(s.story.serialize());
    b.deposit('test_musk', 8);
    expect(b.statusOn('paranoid')).toBe(true);
    tick(s.ship, 36);
    expect(visions.length).toBe(3);
    expect(visions.every((v) => v.text.startsWith('(?) '))).toBe(true);
    expect(notes.some((n) => /GRAND STENCHMASTER ALERT|Was that/.test(n.text))).toBe(false);
    expect(emergencySummary(s.session ?? s).items.join(' ')).not.toMatch(/\(\?\)/);
    // A sniff: no visions for 15 s, the paranoia itself stays.
    expect(b.sniff().cleared).toBe(true);
    tick(s.ship, 15);
    expect(visions.length).toBe(3);
    expect(b.statusOn('paranoid')).toBe(true);
    tick(s.ship, 12);
    expect(visions.length).toBe(4);
    // Washed out: it lingers 20 s, then it's gone.
    b.clean({ share: 1 });
    tick(s.ship, 19);
    expect(b.statusOn('paranoid')).toBe(true);
    tick(s.ship, 1);
    expect(b.statusOn('paranoid')).toBe(false);
    // Nothing about anybody changed.
    expect(content.npcs.ids().map((id) => content.npcs.get(id).name)).toEqual(names);
    expect(JSON.stringify(s.story.serialize())).toBe(story);
  });

  it('the debug-only musk can\'t be used by story content, by command or condition', () => {
    const errors = fixtureErrors([{ beardSaturation: true }, { beardAdd: 'test_musk', amount: 10 }, { if: { beardSaturation: { contains: 'test_musk' } }, then: [{ narrate: 'x' }] }, { beardStatus: 'gagging' }, { beardAdd: 'smoke', amount: 500 }]);
    expect(errors).toMatch(/beard contaminant "test_musk" is for the debug demo and tests only/);
    expect(errors).toMatch(/"test_musk" is for the debug demo and tests only/);
    expect(errors).toMatch(/Gagging comes from what the beard holds/);
    expect(errors).toMatch(/beardAdd: "amount" must be above 0, at most 100/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('overload and purging', () => {
  it('full, it warns (longer on Deckhand, never under 4 s), then purges half into his room as finite sources, no more than left it; then it takes nothing in for a while', () => {
    const warn = {};
    for (const d of DIFFS) {
      const s = session();
      const b = on(s, d);
      b.deposit('smoke', 60, T(d));
      b.deposit('vapor', 80, T(d));
      warn[d] = b.left;
      expect([d, b.phase]).toEqual([d, 'overload']);
    }
    expect(warn).toEqual({ deckhand: 15, captain: 10, brutal: 7 });
    const s = session();
    const b = on(s);
    const purged = eventsOf(s.bus, 'beard:purged');
    b.deposit('smoke', 40);
    b.deposit('vapor', 60);
    tick(s.ship, 9);
    expect([b.phase, b.left, purged.length]).toEqual(['overload', 1, 0]);
    tick(s.ship, 1);
    expect(purged.length).toBe(1);
    expect(purged[0].released).toEqual({ smoke: 20, vapor: 30 });
    expect(b.held).toEqual({ smoke: 20, vapor: 30 });
    expect(s.ship.air.sources.filter((x) => x.source === 'beard').map((x) => [x.substance, x.left])).toEqual([['smoke', 20], ['vapor', 30]]);
    expect([b.phase, b.left, b.absorbing]).toEqual(['cooldown', 30, false]);
    const before = b.total;
    tick(s.ship, 29);
    expect(b.total).toBe(before); // the gas it poured is all around him: none of it back in
    tick(s.ship, 2);
    expect([b.phase, b.absorbing]).toEqual(['idle', true]);
    // The 20 it poured (deposited, not from the air) are all accounted for: in the air, out of the ship, or breathed back in.
    const air = s.ship.air;
    expect(air.total('smoke') + (air.vented.smoke ?? 0) + (air.decayed.smoke ?? 0) + (air.absorbed.smoke ?? 0)).toBeCloseTo(b.released.smoke, 6);
  });

  it('no release-and-reabsorb loop: overloaded in a sealed room with nothing pouring, it purges once in ten minutes, and the stink in room and beard only ever falls', () => {
    const s = session('beard_demo', 'washroom', { x: 5, y: 5 });
    const b = on(s);
    s.ship.air.setConnection('washroom_door', 'closed');
    s.ship.air.setConnection('washroom_door', 'sealed');
    b.deposit('smoke', 50);
    b.deposit('vapor', 50);
    let last = Infinity;
    let rose = 0;
    for (let i = 0; i < 600; i++) {
      tick(s.ship);
      const now = s.ship.air.loadOf('washroom') + b.total + s.ship.air.sources.reduce((n, x) => n + (x.left ?? 0), 0);
      if (now > last + 1e-6) rose++;
      last = now;
    }
    expect(b.count).toBe(1);
    expect(rose).toBe(0);
  });

  it('wringing it out: seconds of work, its share into this room, refused with nothing in it or just after a purge; it beats the countdown', async () => {
    const s = demo();
    await s.run([{ beardSaturation: true }, { beardWring: true, outcomeValue: 'fx_w' }]);
    expect(s.session.story.getValue('fx_w')).toBe('refused');
    await s.run([{ beardAdd: 'smoke', amount: 60 }, { beardAdd: 'vapor', amount: 40 }]);
    const b = s.session.ship.beard;
    expect(b.phase).toBe('overload');
    await s.run([{ beardWring: true, outcomeValue: 'fx_w' }]);
    expect(s.session.story.getValue('fx_w')).toBe('wrung');
    expect(b.count).toBe(1);
    expect(b.phase).toBe('cooldown');
    expect(Math.round(b.total)).toBe(60);
    await s.run([{ beardWring: true, outcomeValue: 'fx_w' }]);
    expect(s.session.story.getValue('fx_w')).toBe('refused');
    expect(b.count).toBe(1);
  });

  it('a purge where there is no ship air goes into the open (counted as vented); a catastrophic one takes everything; one per event id; off or empty: refused', () => {
    const s = session('beard_demo', 'reef_passage', { x: 3, y: 3 });
    const b = on(s);
    b.deposit('smoke', 30);
    const r = b.purge('controlled');
    expect(r.ok).toBe(true);
    expect(s.ship.air.vented.smoke).toBeCloseTo(12, 6);
    const t = session();
    const c = on(t);
    c.deposit('vapor', 40);
    expect(c.purge('catastrophic', T(), { eventId: 'fx_p' }).released).toEqual({ vapor: 40 });
    expect(c.total).toBe(0);
    c.deposit('vapor', 10);
    c.phase = 'idle';
    expect(c.purge('catastrophic', T(), { eventId: 'fx_p' })).toMatchObject({ ok: false, reason: 'duplicate event' });
    expect(c.purge('volcanic').ok).toBe(false);
    c.clean({ share: 1 });
    expect(c.purge('controlled')).toMatchObject({ ok: false, reason: 'nothing to purge' });
    c.enable(false);
    expect(c.purge('controlled')).toMatchObject({ ok: false, reason: 'off' });
  });
});

// ---------------------------------------------------------------------------------------------
describe('inspecting and sniffing', () => {
  it('a look is broad (what kind of stink, no figures for it); a sniff is the detail, at a price: a whiff into his lungs, a gag, and a lock', async () => {
    const s = demo();
    await s.run(scenario('B'));
    const look = beardReport(s.session).join(' ');
    expect(look).toMatch(/Your beard: .*SATURATED.*\(38%\)/);
    expect(look).toMatch(/smells of mostly irritating vapor, with smoke and something not of this world/);
    expect(look).not.toMatch(/VAPOR \d|Smoke \d/);
    const before = s.session.ship.air.exposure;
    const gags = eventsOf(s.bus, 'beard:gag');
    const lines = s.log.length;
    await s.run([{ beardSniff: true, outcomeValue: 'fx_s' }]);
    expect(s.log.slice(lines).join(' ')).toMatch(/Irritating vapor 16%, Smoke 14%, Stenchmaster residue 8%/);
    expect(s.session.ship.air.exposure).toBeGreaterThan(before);
    expect(gags.length).toBe(1);
    expect(s.session.story.getValue('fx_s')).toBe('gagged');
    await s.run([{ beardSniff: true, outcomeValue: 'fx_s' }]);
    expect(s.session.story.getValue('fx_s')).toBe('refused');
    expect(s.notices.at(-1).text).toMatch(/Give your nose a moment \(10 s\)/);
    await s.run([{ hazardClock: 10 }, { beardSniff: true, outcomeValue: 'fx_s' }]);
    expect(s.session.story.getValue('fx_s')).toBe('gagged');
    // The report's own words for it.
    expect(sniffReport(s.session, { gag: false, dose: 0, cleared: false })[0]).toMatch(/^\*sniff\* Irritating vapor/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('beard care', () => {
  it('only at the washroom tub or basin, somewhere safe: away, in foul air or in deep water it says why', async () => {
    const s = demo();
    await s.run(scenario('D'));
    const why = (a) => beardOptions(s.session).find((o) => o.action === a).reason;
    expect(why('rinse')).toMatch(/needs water and a basin: the Washroom/);
    toWashroom(s, 2, 5);
    expect(why('rinse')).toBeNull();
    toWashroom(s, 5, 6);
    expect(why('rinse')).toMatch(/Get to the washroom tub/);
    toWashroom(s);
    s.session.ship.air.addGas('washroom', 'vapor', 12);
    expect(why('rinse')).toMatch(/Not in this air/);
    expect(why('scrub')).toMatch(/Not in this air/);
    s.session.ship.air.ventRoom('washroom', 1);
    s.session.ship.hazards.water.washroom = 999;
    if (s.session.ship.hazards.waterIn('washroom').stage.canWork === false) expect(why('rinse')).toMatch(/Too deep/);
  });

  it('a rinse is water and seconds of hazard time (the rest goes on), and takes a share of each by how readily it washes out and the difficulty', async () => {
    const out = {};
    for (const d of DIFFS) {
      const s = demo({ prefs: { difficulty: d } });
      await s.run(scenario('D'));
      toWashroom(s);
      const b = s.session.ship.beard;
      const before = { ...b.held };
      const ticks = [];
      const orig = s.session.ship.tick.bind(s.session.ship);
      s.session.ship.tick = (t) => {
        ticks.push(1);
        return orig(t);
      };
      await s.run([{ beardCare: 'rinse', outcomeValue: 'fx_r' }]);
      expect([d, s.session.story.getValue('fx_r'), ticks.length >= 6]).toEqual([d, 'rinsed', true]);
      const k = 0.3 * T(d).cleanScale;
      out[d] = Object.fromEntries(Object.keys(before).map((id) => [id, +(1 - b.amount(id) / before[id]).toFixed(3)]));
      expect([d, out[d].vapor]).toEqual([d, +Math.min(1, k).toFixed(3)]);
      expect([d, out[d].heavy_gas]).toEqual([d, +Math.min(1, k * 0.8).toFixed(3)]);
      expect([d, out[d].stench_residue]).toEqual([d, +Math.min(1, k * 0.4).toFixed(3)]);
    }
    expect(out.deckhand.vapor).toBeGreaterThan(out.brutal.vapor);
  });

  it('a scrub is the timing bar with a sailcloth rag: success, partial and failure each take their share; a failure wastes the rag and stirs it up; a retry costs a rag a try, never more', async () => {
    const results = {};
    for (const [hands, outcome] of [[['perfect'], 'success'], [[{ fumbles: 1 }], 'partial'], [[{ fumbles: 3 }], 'failure']]) {
      const s = demo();
      await s.run(scenario('D'));
      toWashroom(s);
      const b = s.session.ship.beard;
      const before = b.amount('vapor');
      const gags = eventsOf(s.bus, 'beard:gag');
      s.playHands(...hands);
      if (outcome === 'failure') s.decideChallenges('continue');
      await s.run([{ beardCare: 'scrub', outcomeValue: 'fx_c' }]);
      expect(s.challengeRecords.at(-1)).toMatchObject({ id: 'beard:scrub', outcome });
      results[outcome] = [+(1 - b.amount('vapor') / before).toFixed(2), s.session.inventory.count('sailcloth'), b.statusOn('hornet_nested'), gags.filter((g) => g.cause === 'scrub').length];
    }
    expect(results).toEqual({ success: [0.8, 3, false, 0], partial: [0.5, 3, false, 0], failure: [0.1, 3, true, 1] });
    // Fail twice, retry, win: three rags.
    const s = demo();
    await s.run(scenario('D'));
    toWashroom(s);
    s.playHands({ fumbles: 3 }, { fumbles: 3 }, 'perfect');
    s.decideChallenges('retry', 'retry');
    await s.run([{ beardCare: 'scrub' }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ outcome: 'success', attempt: 3 });
    expect(s.session.inventory.count('sailcloth')).toBe(1);
  });

  it('no free materials: with no sailcloth a scrub is refused (and says what\'s missing), but a rinse needs only water, so a beard can always be cleaned', async () => {
    const s = demo();
    await s.run(scenario('D'));
    s.session.inventory.remove('sailcloth', s.session.inventory.count('sailcloth'));
    toWashroom(s);
    const opts = beardOptions(s.session);
    expect(opts.find((o) => o.action === 'scrub')).toMatchObject({ ok: false, reason: 'Not enough: Sailcloth 0/1.' });
    expect(opts.find((o) => o.action === 'rinse').ok).toBe(true);
    expect(scrubCost(content, 'brutal')).toEqual([{ item: 'sailcloth', count: 2 }]);
    expect(scrubCost(content, 'deckhand')).toEqual([{ item: 'sailcloth', count: 1 }]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('what he wears over it', () => {
  it('nothing is worn by itself; only an item he carries; the wrap keeps it from soaking (more reaches his lungs), the wet cloth protects his lungs, the goggles his eyes', () => {
    const s = session();
    const b = on(s);
    expect(b.worn).toEqual([]);
    expect(content.items.get('beard_wrap').type).toBe('key');
    s.inventory.remove('beard_wrap', 1);
    expect(b.wear('beard_wrap')).toMatchObject({ ok: false });
    s.inventory.add('beard_wrap', 1);
    expect(b.wear('beard_wrap').ok).toBe(true);
    expect(b.catchShare('smoke')).toBeCloseTo(0.55 * 0.35, 6);
    expect(b.lungFactor).toBe(1);
    expect(b.wear('wet_cloth').ok).toBe(true);
    expect(b.lungFactor).toBe(0.7);
    expect(b.wear('planks')).toMatchObject({ ok: false });
    // Taken off, or no longer carried: no effect.
    b.wear('beard_wrap', false);
    expect(b.catchShare('smoke')).toBe(0.55);
    s.inventory.remove('wet_cloth', 1);
    expect(b.lungFactor).toBe(1);
    // Off: nothing worn counts.
    s.inventory.add('wet_cloth', 1);
    b.enable(false);
    expect(b.lungFactor).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
describe('difficulty and accessibility', () => {
  it('Deckhand forgiving, Captain as meant, Brutal harsh, within validated bounds: a smaller beard, less from washing, a shorter warning; the same smoke saturates Brutal first', () => {
    expect(DIFFS.map((d) => [T(d).beardCapacityScale, T(d).cleanScale, T(d).warnScale])).toEqual([[1.4, 1.3, 1.5], [1, 1, 1], [0.7, 0.75, 0.65]]);
    expect(SHIP_TUNING.beardCapacityScale).toEqual([0.5, 1.5]);
    expect(SHIP_TUNING.cleanScale).toEqual([0.5, 1.5]);
    const bad = structuredClone(content.difficulty ?? {});
    void bad;
    const firstSat = {};
    for (const d of DIFFS) {
      const s = session();
      const b = on(s, d);
      s.ship.air.startSource({ room: 'crew_quarters', substance: 'smoke', rate: 8, seconds: 200 });
      for (let i = 1; i <= 200 && !firstSat[d]; i++) {
        tick(s.ship, 1, d);
        if (b.statusOn('saturated', T(d))) firstSat[d] = i;
      }
    }
    expect(firstSat.brutal).toBeLessThan(firstSat.captain);
    expect(firstSat.captain).toBeLessThan(firstSat.deckhand);
    expect(shipDataProblems).toBeTypeOf('function');
  });

  it('the scrub is the timing bar: the timing assist widens and slows it (an accessibility setting, apart from the difficulty)', async () => {
    const bars = {};
    for (const timingAssist of ['off', 'strong']) {
      const s = demo({ prefs: { difficulty: 'brutal', timingAssist } });
      await s.run(scenario('D'));
      toWashroom(s);
      s.playHands('perfect');
      await s.run([{ beardCare: 'scrub' }]);
      bars[timingAssist] = s.challengeAttempts.at(-1);
    }
    expect(bars.off).toMatchObject({ kind: 'repair', id: 'beard:scrub', assists: [] });
    expect(bars.strong.assists).toEqual(['timingAssist:strong']);
    expect(bars.strong.bar.zone).toBeGreaterThan(bars.off.bar.zone);
    expect(bars.strong.bar.speed).toBeLessThan(bars.off.bar.speed);
  });
});

// ---------------------------------------------------------------------------------------------
describe('one clock', () => {
  it('the beard moves only on hazard ticks: it breathes with the air, then its own second; a purge pours from the next second', async () => {
    const s = demo();
    await s.run([{ beardSaturation: true }, { airAdd: 'crew_quarters', substance: 'smoke', pct: 30 }]);
    const b = s.session.ship.beard;
    await s.run([{ narrate: 'A long story about a beard.' }, { wait: 3000 }]);
    expect(b.total).toBe(0);
    await s.run([{ hazardClock: 1 }]);
    expect(b.total).toBeGreaterThan(0);
    // A purge in the beard's second: its source pours from the air's next second.
    await s.run([{ beardClean: true }, { beardAdd: 'vapor', amount: 100 }, { hazardClock: 9 }]);
    const q = s.session.ship.air.quantity('crew_quarters', 'vapor');
    await s.run([{ hazardClock: 1 }]);
    expect(b.count).toBe(1);
    expect(s.session.ship.air.quantity('crew_quarters', 'vapor')).toBeCloseTo(q, 6);
    await s.run([{ hazardClock: 1 }]);
    expect(s.session.ship.air.quantity('crew_quarters', 'vapor')).toBeGreaterThan(q);
  });
});

// ---------------------------------------------------------------------------------------------
describe('saves and checkpoints (version 22)', () => {
  it('the beard saves and loads exactly, and goes on the same way afterwards', async () => {
    let s = demo();
    await s.run([...scenario('B'), { beardStatus: 'hornet_nested' }, { beardAdd: 'test_musk', amount: 9 }, { beardWear: 'beard_wrap' }, { hazardClock: 7 }]);
    const ref = demo();
    await ref.run([...scenario('B'), { beardStatus: 'hornet_nested' }, { beardAdd: 'test_musk', amount: 9 }, { beardWear: 'beard_wrap' }, { hazardClock: 7 }]);
    expect(SAVE_VERSION).toBe(22);
    s = reloadStory(s);
    expect(s.record.version).toBe(22);
    expect(s.session.ship.beard.serialize()).toEqual(ref.session.ship.beard.serialize());
    const notes = noticesOf(s.bus);
    tick(s.session.ship, 60);
    tick(ref.session.ship, 60);
    expect(JSON.stringify(s.session.ship.serialize())).toBe(JSON.stringify(ref.session.ship.serialize()));
    // Loading announced nothing.
    expect(notes.filter((n) => n.key.startsWith('beard:stage') || n.key.startsWith('beard:status'))).toEqual([]);
  });

  it('versions 17 to 21 load with the beard off and clean, the story\'s beard tags exactly as they were and never turned into contamination', () => {
    const s = session('p17_complete', 'crew_quarters');
    const tags = s.story.allFlags().filter((f) => f.startsWith('beard_'));
    expect(tags.length).toBeGreaterThan(3);
    const saves = new SaveManager({ storage: new MemoryStorage(), content });
    expect(saves.save(1, s).ok).toBe(true);
    for (const v of [17, 18, 19, 20, 21]) {
      const raw = JSON.parse(JSON.stringify(saves.read(1).state));
      delete raw.ship?.beard;
      if (v < 21) delete raw.ship?.pressure;
      if (v < 20) delete raw.ship?.air;
      if (v < 18) delete raw.ship;
      const t = GameSession.fromState({ content, bus: new EventBus(), state: raw, strictFlags: true, onWarning: (w) => { throw new Error(w); } });
      expect([v, t.ship.beard.untouched, t.ship.beard.on, t.ship.beard.total, t.ship.beard.statusList()]).toEqual([v, true, false, 0, []]);
      expect([v, t.story.allFlags().filter((f) => f.startsWith('beard_'))]).toEqual([v, tags]);
    }
  });

  it('damaged beard data loads safely: unknown contaminants, statuses, items and phases dropped or reset, numbers clamped, nothing invented', () => {
    const s = session();
    const warnings = [];
    s.ship.beard.load({ on: true, held: { smoke: 400, brimstone: 5, vapor: 'lots' }, phase: 'exploding', left: 900, statuses: { hornet_nested: { left: 9999 }, saturated: { left: 5 }, fleas: {} }, timers: { hornet_nested: -4, puff: 1e9, bogus: 2 }, sniffLock: -1, worn: ['beard_wrap', 'cannon'], count: -3, visions: 'x' }, (w) => warnings.push(w));
    const b = s.ship.beard;
    expect(b.on).toBe(true);
    expect(b.total).toBeCloseTo(150, 6); // the largest any difficulty holds
    expect([b.phase, b.left, b.statuses, b.sniffLock, b.worn, b.count, b.visions]).toEqual(['idle', 0, { hornet_nested: { left: 600 } }, 0, ['beard_wrap'], 0, 0]);
    expect(b.timers).toEqual({ hornet_nested: 1, puff: 60 });
    expect(warnings).toEqual(expect.arrayContaining([expect.stringMatching(/dropped "brimstone"/), expect.stringMatching(/dropped "vapor"/), expect.stringMatching(/scaled down/), expect.stringMatching(/unknown phase/), expect.stringMatching(/dropped status "saturated"/), expect.stringMatching(/dropped status "fleas"/), expect.stringMatching(/dropped worn "cannon"/)]));
    for (const junk of [null, 7, 'beard', [1, 2]]) {
      s.ship.beard.load(junk);
      expect(s.ship.beard.untouched).toBe(true);
    }
  });

  it('a checkpoint holds what it holds, its conditions, its cycle, the air it poured and the events; restoring puts it all back', () => {
    const s = session();
    const b = on(s);
    b.deposit('smoke', 30);
    b.applyStatus('hornet_nested', 100);
    const cp = captureCheckpoint(s, { id: 'fx' });
    const before = JSON.stringify(s.serialize().ship);
    b.deposit('vapor', 70, T(), { eventId: 'fx_d' });
    tick(s.ship, 11);
    expect(b.count).toBe(1);
    const d = diffStates({ ship: cp.domains.ship }, s.serialize());
    expect(d.beard).toMatchObject({ count: [0, 1], phase: ['idle', 'cooldown'], held: { smoke: [30, 15], vapor: [0, 35] } });
    restoreCheckpoint(s, cp);
    expect(JSON.stringify(s.serialize().ship)).toBe(before);
    // The deposit's event id is free again after the restore (it was the attempt's), but not twice in a row.
    expect(b.deposit('vapor', 70, T(), { eventId: 'fx_d' }).added).toBe(70);
    expect(b.deposit('vapor', 5, T(), { eventId: 'fx_d' })).toMatchObject({ ok: false, reason: 'duplicate event' });
  });

  it('inside a challenge: absorption, a deposit and a purge in an attempt roll back with it; a retry is no free wash: the rags spent stay spent; nothing doubles', async () => {
    const STRICT = { failure: true, mechanics: { maxFumbles: 1 }, outcomes: { failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' } };
    const s = demo();
    await s.run([{ beardSaturation: true }, { airAdd: 'crew_quarters', substance: 'smoke', pct: 40 }]);
    const ship = s.session.ship;
    const b = ship.beard;
    s.onAttempt((info) => {
      if (info.id !== 'fx_b') return;
      // Every attempt: some time in the smoke, a duplicate-called deposit, and a purge.
      for (let i = 0; i < 5; i++) ship.tick(T());
      b.deposit('vapor', 50, T(), { eventId: 'fx_b:splash' });
      b.deposit('vapor', 50, T(), { eventId: 'fx_b:splash' });
      b.purge('controlled', T());
    });
    s.playHands('fumble', 'fumble', 'perfect');
    await s.run([{ repair: 'hull', strikes: 2, challenge: { id: 'fx_b', ...STRICT, onFailure: { mustRetry: true, costs: [{ beardAdd: 'stench_residue', amount: 5, eventId: 'mud' }] } } }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ outcome: 'success', attempt: 3 });
    // The third attempt's own: one splash, one purge; the two failures' costs once each.
    expect(b.count).toBe(1);
    expect(b.amount('stench_residue')).toBeCloseTo(10 * 0.6, 6);
    expect(ship.air.sources.filter((x) => x.source === 'beard').length).toBeGreaterThan(0);
    expect(new Set(ship.air.sources.map((x) => x.id)).size).toBe(ship.air.sources.length);
    expect([...ship.seen].filter((e) => e.startsWith('fx_b:'))).toEqual(['fx_b:cost:1:mud', 'fx_b:cost:2:mud', 'fx_b:splash']);
  });

  it('saving in the middle of a scrub keeps the rag and the beard as they were before it; the loaded game can scrub again', async () => {
    const s = demo();
    await s.run(scenario('D'));
    toWashroom(s);
    const held = { ...s.session.ship.beard.held };
    let mid = null;
    s.onAttempt(() => {
      if (!mid) mid = reloadStory(s);
    });
    s.playHands('perfect');
    await s.run([{ beardCare: 'scrub' }]);
    expect(s.session.inventory.count('sailcloth')).toBe(3);
    expect(mid.session.inventory.count('sailcloth')).toBe(4);
    expect(mid.session.ship.beard.held).toEqual(held);
    expect(mid.session.ship.hazards.working).toBe(false);
    toWashroom(mid);
    mid.playHands('perfect');
    await mid.run([{ beardCare: 'scrub' }]);
    expect(mid.challengeRecords.at(-1)).toMatchObject({ outcome: 'success' });
    expect(mid.session.inventory.count('sailcloth')).toBe(3);
  });
});

// ---------------------------------------------------------------------------------------------
describe('commands, conditions, Respond, the HUD and the Ship page', () => {
  function stubScene(app) {
    const make = ([x = 0, y = 0] = []) => {
      const store = { x, y, visible: true, text: '', textWidth: 30, width: 30, height: 10, destroy() {}, setText(v) { this.text = v; return this; } };
      const p = new Proxy(store, { get: (t, k) => (k in t ? t[k] : k === 'then' ? undefined : () => p), set: (t, k, v) => { t[k] = v; return true; } });
      store.scene = scene;
      return p;
    };
    const scene = { game: { app }, add: new Proxy({}, { get: () => (...args) => make(args) }), tweens: new Proxy({}, { get: () => () => make() }), time: new Proxy({}, { get: () => () => make() }), textures: { exists: () => true }, closed: [], close(opts) { this.closed.push(opts); } };
    return scene;
  }
  const PANE = { x: 96, y: 4, w: SCREEN_WIDTH - 100, h: SCREEN_HEIGHT - 8 };
  const { fonts } = buildFonts();

  it('the condition reads the switch, stage, fill, contents, statuses, phase, what is worn and purges', async () => {
    const s = demo();
    const ev = (v) => evaluateCondition({ beardSaturation: v }, s.session);
    expect([ev({ active: false }), ev({ stage: 'clean' }), ev({ pct: 0 })]).toEqual([true, false, false]);
    await s.run([...scenario('D'), { beardWear: 'bottle_goggles' }]);
    expect(ev({ active: true, stage: ['saturated', 'heavy'], pct: { gte: 50 }, contains: 'vapor', amount: { gte: 20 }, status: 'hornet_nested', phase: 'idle', wearing: 'bottle_goggles', purged: 0 })).toBe(true);
    expect([ev({ contains: 'smoke' }), ev({ status: 'paranoid' }), ev({ stage: 'clean' })]).toEqual([false, false, false]);
  });

  it('script steps are validated: unknown contaminants, statuses, purges, care and items; amounts and seconds bounded; a rinse is no challenge', () => {
    const errors = fixtureErrors([
      { beardAdd: 'brimstone', amount: 5 }, { beardStatus: 'fleas' }, { beardPurge: 'volcanic' }, { beardCare: 'shave' }, { beardWear: 'planks' },
      { beardStatus: 'hornet_nested', seconds: 900 }, { beardClean: 'brimstone' }, { beardClean: true, share: 2 }, { beardCare: 'rinse', challenge: 'ship_repair' },
      { if: { beardSaturation: { stage: 'soggy', phase: 'boiling', bogus: 1 } }, then: [] },
    ]);
    for (const m of [/unknown beard contaminant "brimstone"/, /unknown beard status "fleas"/, /a beard purge is overload, controlled, catastrophic/, /beard care is rinse or scrub/, /"planks" isn't mapped to wear over the beard/,
      /beardStatus: "seconds" must be whole, 1 to 600/, /beardClean: true \(everything\) or a contaminant/, /beardClean: "share" must be above 0, at most 1/, /only a scrub is a challenge/, /unknown stage "soggy"/, /unknown phase "boiling"/, /unknown key "bogus"/]) expect(errors).toMatch(m);
  });

  it('the HUD line names the beard (saturated or worse, its conditions, the countdown); Respond groups "Your beard" and runs what is picked', async () => {
    const s = demo();
    await s.run(scenario('D'));
    let e = emergencySummary(s.session);
    expect(e.items).toEqual(['<y>BEARD</> 52% SATURATED <o>GAGGING HORNETS</>']);
    expect(e.respond).toBe(true);
    await s.run([{ beardAdd: 'vapor', amount: 50 }]);
    e = emergencySummary(s.session);
    expect(e.items).toEqual(['<r>BEARD</> OVERLOADED <r>10s</>']);
    expect(beardWord({ stage: 'critical', tone: 'r', pct: 85, label: 'critical', left: null, statuses: [] })).toBe('<r>BEARD</> CRITICAL <k>PURGE RISK</>');
    // Respond: the beard's own list (no other trouble here), and what is picked runs.
    const opts = beardOptions(s.session);
    expect(opts.map((o) => o.action)).toEqual(['inspect', 'sniff', 'wring', 'rinse', 'scrub', 'wear', 'wear', 'wear']);
    s.choices.push(2); // Wring it out, here
    await s.run([{ emergency: true }]);
    expect(s.session.ship.beard.count).toBe(1);
    // The purge's gas is in the room now: Respond offers the air too ("Air and vents" first, then "Your beard").
    s.choices.push(1, 0); // Your beard, then Look at your beard
    const lines = s.log.length;
    await s.run([{ emergency: true }]);
    expect(s.log.length).toBe(lines + beardReport(s.session).length);
    // With the system off, Respond doesn't offer it at all.
    await s.run([{ beardSaturation: false }]);
    expect(beardOptions(s.session)).toEqual([]);
    expect((emergencySummary(s.session)?.items ?? []).some((x) => /BEARD/.test(x))).toBe(false);
  });

  it('the Ship page lists "Your beard" while the system is on; Confirm (Z or pad A) opens Respond, once', async () => {
    const pads = [{ id: 'Test Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) }];
    Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true, writable: true });
    for (const device of ['keyboard', 'pad']) {
      const s = demo();
      await s.run(scenario('D'));
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
      const row = page.menu.items.findIndex((i) => i.value === 'hz:beard');
      expect(page.menu.items[row]).toMatchObject({ label: 'Your beard', right: '52% SATURATED' });
      for (let i = 0; i < row; i++) press('ArrowDown', 13);
      const lines = page.detail.objects.map((o) => o.text.replace(/\n/g, ' ')).join(' | ');
      expect(lines).toMatch(/SATURATED.*52%.*Holds: VAPOR, HEAVY, RESIDUE/);
      expect(lines).toMatch(/GAGGING, HORNETS/);
      expect(lines).toMatch(/Wash it at the Washroom tub: rinse, or scrub \(1 Sailcloth \(4\)\)/);
      press('KeyZ', 0);
      press('KeyZ', 0);
      expect(scene.closed.length).toBe(1);
      const ran = [];
      scene.closed[0].then({ runScript: (steps) => ran.push(steps) });
      expect(ran).toEqual([[{ emergency: true }]]);
    }
    // Off: no row.
    const t = demo();
    const app = { session: t.session, content, input: new InputManager({ target: {} }), fontMetrics: fonts, settings: { challengePrefs: () => ({ difficulty: 'captain' }) }, audio: { ui: () => {}, sfx: () => {} } };
    const page = new ShipPage(stubScene(app), PANE);
    page.render();
    expect(page.menu.items.some((i) => i.value === 'hz:beard')).toBe(false);
  });

  it('every beard word fits: toasts, report lines, choices, reasons, work labels, the HUD line and the page', async () => {
    const bad = [];
    const s = demo({ prefs: { difficulty: 'brutal' } });
    const notes = noticesOf(s.bus);
    // The worst: everything at once, with fires and air around it.
    await s.run([...scenario('D'), { beardAdd: 'test_musk', amount: 10 }, { beardAdd: 'stench_residue', amount: 10 }, { beardWear: 'beard_wrap' }, { beardWear: 'wet_cloth' }, { beardWear: 'bottle_goggles' }, { airAdd: 'crew_quarters', substance: 'vapor', pct: 30 }, { hazardClock: 3 }]);
    const DIALOGUE_W = 312 - 10 - 10;
    const CHOICE_W = SCREEN_WIDTH - 12 - 26 - 4;
    for (const line of beardReport(s.session)) if (wrap(fonts.main, plain(line), DIALOGUE_W).split('\n').length > 4) bad.push(`report: ${line}`);
    for (const line of sniffReport(s.session, { gag: true, dose: 1, cleared: true })) if (wrap(fonts.main, plain(line), DIALOGUE_W).split('\n').length > 4) bad.push(`sniff: ${line}`);
    for (const o of beardOptions(s.session, { difficulty: 'brutal' })) {
      if (measure(fonts.main, plain(o.label)) > CHOICE_W) bad.push(`choice: ${o.label}`);
      if (o.reason && wrap(fonts.main, plain(o.reason), TOAST_TEXT_WIDTH).split('\n').length > 4) bad.push(`reason: ${o.reason}`);
    }
    for (const label of ['Wringing out your beard', 'Rinsing your beard', 'Scrubbing your beard'].map((x) => x.toUpperCase())) if (measure(fonts.bold, label) + 38 > SCREEN_WIDTH - 8) bad.push(`work: ${label}`);
    for (const v of content.shipBeard.statuses.paranoid.visions) if (wrap(fonts.main, v, TOAST_TEXT_WIDTH).split('\n').length > 4) bad.push(`vision: ${v}`);
    const HUD_W = SCREEN_WIDTH - 8;
    const summary = emergencySummary(s.session, undefined, { difficulty: 'brutal' });
    const line = emergencyLine(summary, (m) => measure(fonts.main, plain(m)) <= HUD_W);
    if (measure(fonts.main, plain(line)) > HUD_W) bad.push(`hud: ${line}`);
    await s.run([{ hazardClock: 40 }]);
    for (const n of notes) if (wrap(fonts.main, plain(n.text), TOAST_TEXT_WIDTH).split('\n').length > 4) bad.push(`toast: ${n.text}`);
    const input = new InputManager({ target: {} });
    const app = { session: s.session, content, input, fontMetrics: fonts, settings: { challengePrefs: () => ({ difficulty: 'brutal' }) }, audio: { ui: () => {}, sfx: () => {} } };
    const page = new ShipPage(stubScene(app), PANE);
    page.render();
    const DETAIL_W = PANE.w - 24;
    const DETAIL_ROOM = PANE.h - 4 - 6 - 117;
    page.detail.clear();
    page.renderHazard('beard');
    const height = page.detail.objects.reduce((n, o) => n + wrap(fonts.main, plain(o.text), DETAIL_W).split('\n').length * 11 + 2, -2);
    if (height > DETAIL_ROOM) bad.push(`page: ${height} px (room for ${DETAIL_ROOM})`);
    expect(bad.join('\n')).toBe('');
  });

  it('cheap to run: a thousand seconds of smoke with the beard on stays bounded, and nothing accumulates', () => {
    const s = session();
    const b = on(s);
    b.applyStatus('hornet_nested', 600);
    b.deposit('test_musk', 9);
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      if (i % 100 === 0) s.ship.air.startSource({ room: 'crew_quarters', substance: 'smoke', rate: 8, seconds: 60 });
      s.ship.tick(T());
    }
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(2500);
    expect(s.ship.air.sources.length).toBeLessThanOrEqual(content.shipAir.limits.sources);
    expect(s.ship.seen.size).toBeLessThanOrEqual(128);
    expect(JSON.stringify(b.serialize()).length).toBeLessThan(500);
    expect(Object.keys(b.timers).length).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------------------------
describe('the debug demo, scenarios A to F', () => {
  it('A: smoke pours in; the beard fills while his lungs stay clear, then protects less; he walks out and it stops', async () => {
    const s = demo();
    await s.run([...scenario('A'), { hazardClock: 30 }]);
    const b = s.session.ship.beard;
    expect(b.amount('smoke')).toBeGreaterThan(10);
    expect(s.session.ship.air.exposure).toBeLessThan(15);
    const share = b.catchShare('smoke');
    await s.run([{ hazardClock: 40 }]);
    expect(b.catchShare('smoke')).toBeLessThan(share);
    s.session.location = { ...s.session.location, map: 'reef_passage' };
    const held = b.total;
    await s.run([{ hazardClock: 10 }]);
    expect(b.total).toBeCloseTo(held, 6);
  });

  it('B: mixed contamination; save and load: every contaminant, the air and the trend as they were', async () => {
    let s = demo();
    await s.run(scenario('B'));
    const before = JSON.stringify(s.session.ship.serialize());
    s = reloadStory(s);
    expect(JSON.stringify(s.session.ship.serialize())).toBe(before);
    expect(s.session.ship.beard.contents().map((c) => c.id)).toEqual(['vapor', 'smoke', 'stench_residue']);
  });

  it('C: overloaded: left alone it purges once into the room; wrung out in time, it doesn\'t; no loop either way', async () => {
    const s = demo();
    await s.run([...scenario('C'), { hazardClock: 120 }]);
    expect(s.session.ship.beard.count).toBe(1);
    const t = demo();
    await t.run([...scenario('C'), { hazardClock: 3 }, { beardWring: true }, { hazardClock: 120 }]);
    expect(t.session.ship.beard.count).toBe(1);
    expect(t.session.ship.beard.phase).not.toBe('overload');
  });

  it('D: grooming at the tub: a rinse, then a scrub that fails once and is retried; time passes, rags are spent, the hornets go; no notice repeats', async () => {
    const s = demo();
    const notes = noticesOf(s.bus);
    await s.run(scenario('D'));
    toWashroom(s);
    const pct0 = s.session.ship.beard.pct();
    await s.run([{ beardCare: 'rinse' }]);
    const pct1 = s.session.ship.beard.pct();
    s.playHands({ fumbles: 3 }, 'perfect');
    s.decideChallenges('retry');
    await s.run([{ beardCare: 'scrub' }]);
    const b = s.session.ship.beard;
    expect(pct1).toBeLessThan(pct0);
    expect(b.pct()).toBeLessThan(pct1 * 0.5);
    expect(b.statusOn('hornet_nested')).toBe(false);
    expect(s.session.inventory.count('sailcloth')).toBe(2);
    // No spam: each change said once; the retry put the beard back as it was before the try and the failed try's
    // cost (a little out) was applied again, so that one change ("no longer gagging") is the only one said twice.
    const keys = notes.map((n) => n.key);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual(['beard:status:gagging:off']);
  });

  it('E: paranoia from the test musk: visions marked (?), names unchanged, a sniff interrupts it, washing it out ends it', async () => {
    const s = demo();
    const visions = eventsOf(s.bus, 'beard:hallucinate');
    await s.run([...scenario('E'), { hazardClock: 24 }]);
    expect(visions.length).toBe(2);
    expect(visions.every((v) => v.text.startsWith('(?) '))).toBe(true);
    await s.run([{ beardSniff: true }, { hazardClock: 14 }]);
    expect(visions.length).toBe(2);
    await s.run([{ beardClean: true }, { hazardClock: 25 }]);
    expect(s.session.ship.beard.statusOn('paranoid')).toBe(false);
  });

  it('F: heavy with vapor; save; a scrub fails and is retried from the checkpoint; reload: identical; nothing doubled', async () => {
    let s = demo();
    await s.run(scenario('F'));
    toWashroom(s);
    const saved = reloadStory(s);
    s.playHands({ fumbles: 3 }, 'perfect');
    s.decideChallenges('retry');
    await s.run([{ beardCare: 'scrub' }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ outcome: 'success', attempt: 2 });
    // The same from the save: the same result.
    toWashroom(saved);
    saved.playHands({ fumbles: 3 }, 'perfect');
    saved.decideChallenges('retry');
    await saved.run([{ beardCare: 'scrub' }]);
    expect(JSON.stringify(saved.session.ship.beard.serialize())).toBe(JSON.stringify(s.session.ship.beard.serialize()));
    expect(saved.session.inventory.count('sailcloth')).toBe(s.session.inventory.count('sailcloth'));
    expect(s.session.inventory.count('sailcloth')).toBe(2);
  });
});

// ---------------------------------------------------------------------------------------------
describe('the campaign and the story\'s beard are unchanged', () => {
  const BEARD_COMMANDS = ['beardSaturation', 'beardAdd', 'beardClean', 'beardStatus', 'beardPurge', 'beardInspect', 'beardSniff', 'beardWring', 'beardCare', 'beardSetback', 'beardWear'];

  it('no chapter switches the system on, deposits, washes, purges, applies a status or reads it; the demo is debug-only', () => {
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
        if (BEARD_COMMANDS.includes(name)) found.push(`${at}: ${name}`);
        if (v.beardSaturation !== undefined && typeof v.beardSaturation === 'object') found.push(`${at}: beardSaturation condition`);
        Object.values(v).forEach((x) => visit(x, at));
      }
    };
    for (const id of content.scripts.ids()) visit(content.scripts.get(id), id);
    for (const id of content.maps.ids()) visit(content.maps.get(id), id);
    for (const id of content.quests.ids()) visit(content.quests.get(id), id);
    expect(found).toEqual([]);
    expect(REGISTRY.beardCare.commands).toEqual(['beardCare']);
    expect(NON_CHALLENGE_COMMANDS).toEqual(expect.arrayContaining(BEARD_COMMANDS.filter((c) => c !== 'beardCare')));
    expect(DEBUG_SHIP.beard.filter(([l]) => /^Beard [A-F]:/.test(l)).length).toBe(6);
    expect(session('beard_demo').ship.untouched).toBe(true);
  });

  it('every phase\'s approved snapshot has the beard system off, holding nothing', () => {
    const baselines = import.meta.glob('/tests/regression/baselines/phase-*.json', { eager: true, import: 'default' });
    expect(Object.keys(baselines).length).toBe(17);
    for (const [file, snap] of Object.entries(baselines)) expect([file, snap.gameplay.systems.ship.beard]).toEqual([file, { on: false, held: [], statuses: [], worn: [], purges: 0 }]);
  });

  it('the story\'s beard tags and puffs play exactly as before: same flags, same puffs, no saturation, no gas, no notices', async () => {
    const s = makeStory({ preset: 'p17_complete' });
    const notes = noticesOf(s.bus);
    const puffs = [];
    s.session.services = null;
    const world = { beardPuff: (id, line) => puffs.push([id, line]) };
    const flags = s.session.story.allFlags().filter((f) => f.startsWith('beard_'));
    await s.run([{ beard: 'add', tag: 'SKUNK_HAZE' }, { beard: 'remove', tag: 'HORNET_ATTRACTED' }, { hazardClock: 10 }]);
    expect(s.session.story.has('beard_skunk_haze')).toBe(true);
    expect(s.session.story.has('beard_hornet_attracted')).toBe(false);
    expect(s.session.story.allFlags().filter((f) => f.startsWith('beard_')).sort()).toEqual([...new Set([...flags.filter((f) => f !== 'beard_hornet_attracted'), 'beard_skunk_haze'])].sort());
    // The Phase 17 puffs are the world's (systems/beard.js puffs, world/BeardPuffs.js): the command only hands them over.
    const impl = (await import('../src/systems/script/commands.js')).createCommandImplementations();
    impl.beardPuff({ beardPuff: 'small' }, { services: { world } });
    expect(puffs).toEqual([['small', null]]);
    expect(s.session.ship.beard.untouched).toBe(true);
    expect(s.session.ship.untouched).toBe(true);
    expect(notes.filter((n) => n.key.startsWith('beard:'))).toEqual([]);
  });

  it('the legacy fume scenes and the washroom\'s own story objects produce no saturation', async () => {
    const s = makeStory({ preset: 'p17_complete' });
    await s.run([{ atmosphere: 'FIRE_WAFT' }, { fumeCloud: 'fx_cloud', level: 'dense', x: 4, y: 4, w: 3, h: 3 }, { fumeCloud: 'fx_cloud', remove: true }, { hazardClock: 10 }]);
    expect(s.session.ship.beard.serialize()).toEqual({});
    expect(s.session.ship.untouched).toBe(true);
  });
});
