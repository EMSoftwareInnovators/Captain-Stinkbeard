import { describe, it, expect, vi } from 'vitest';

// The Ship page is drawn with stand-in game objects below (no Phaser in Node).
vi.mock('phaser', () => ({ TintModes: { MULTIPLY: 0 } }));

import { loadContent } from '../src/content/loadContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION, SCREEN_WIDTH, SCREEN_HEIGHT } from '../src/config/constants.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { captureCheckpoint, restoreCheckpoint, diffStates } from '../src/systems/challenge/checkpoint.js';
import { commandNameOf } from '../src/systems/script/commandSchemas.js';
import { shipTuning } from '../src/systems/ship/integrity.js';
import { readStability, stabilityDef, addPressure, promptOptions } from '../src/systems/stability.js';
import { pressureDataProblems, subjectIds, subjectDef, stageFor, levelFor, npcWhere, STAGE_IDS } from '../src/systems/ship/pressure.js';
import { subjectOptions, pressureGroups, pressureReport, pressureWord } from '../src/systems/ship/pressureResponse.js';
import { airOptions } from '../src/systems/ship/airResponse.js';
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
 * Grand Stenchmaster pressure (docs/gameplay-overhaul/12-pressure-and-eruptions.md).
 * Deterministic: hazard time is ticked by hand or by the work actions;
 * holds are the game's own timing bar played by simulated hands. The real
 * shared systems throughout (the ship, its air, its integrity, Brogath's
 * Stability, the challenge runner, saves). The browser half is
 * e2e/pressure.spec.js. No chapter uses any of it.
 */
const content = loadContent();
const DIFFS = ['deckhand', 'captain', 'brutal'];
const T = (d = 'captain') => shipTuning(content, d);
const tick = (ship, n = 1, d = 'captain') => {
  for (let i = 0; i < n; i++) ship.tick(T(d));
};
const BROGATH_DEF = stabilityDef({ id: 'brogath', ...content.stability.get('brogath') });

function session(preset = 'pressure_demo', room = 'crew_quarters') {
  const s = GameSession.newGame({ content, bus: new EventBus(), strictFlags: true });
  applyPresetPlan(s, resolvePreset(content, preset));
  s.location = { ...s.location, map: room };
  return s;
}
const demo = (opts = {}) => makeStory({ preset: 'pressure_demo', ...opts });
const noticesOf = (bus) => {
  const out = [];
  bus.on('hazard:notice', (n) => out.push(n));
  return out;
};
const scenario = (letter) => DEBUG_SHIP.pressure.find(([label]) => label.startsWith(`Pressure ${letter}:`))[1];
const accounted = (air, sub) => air.total(sub) + (air.vented[sub] ?? 0) + (air.decayed[sub] ?? 0);
const plain = (t) => parseMarkup(String(t).replace(/\{[^{}]+\}/g, 'XXXXXXXX')).text;

// ---------------------------------------------------------------------------------------------
describe('the pressure model and its data', () => {
  it('two subjects, keyed by character, both off and untouched until a script switches one on; Brogath\'s range is his Stability\'s', () => {
    expect(pressureDataProblems(content)).toEqual([]);
    expect(subjectIds(content)).toEqual(['brogath', 'garrick']);
    const b = subjectDef(content, 'brogath');
    const g = subjectDef(content, 'garrick');
    expect([b.npc, b.min, b.max, b.legacy.id, b.substance]).toEqual(['brogath', -20, 100, 'brogath', 'vapor']);
    expect([g.npc, g.min, g.max, g.legacy, g.substance]).toEqual(['garrick', 0, 100, null, 'heavy_gas']);
    // Brogath's triggers and calms are his Stability's, the same objects.
    expect(b.triggers).toBe(content.stability.get('brogath').triggers);
    expect(b.calms.reframe.pressure).toBe(-28);
    const s = session();
    const pr = s.ship.pressure;
    expect(pr.untouched).toBe(true);
    expect(pr.active).toBe(false);
    expect(s.ship.untouched).toBe(true);
    expect(pr.ready('garrick')).toEqual({ ok: false, reason: "Garrick's pressure isn't in play." });
    expect(pr.trigger('garrick', 'feast').ok).toBe(false);
    // Nothing moves: no subject, no tick.
    tick(s.ship, 30);
    expect(pr.pressureOf('garrick')).toBe(5);
    expect(pr.serialize()).toEqual({ subjects: {} });
  });

  it('stages are the same six for everyone, at each subject\'s own thresholds; imminent only while counting down', () => {
    const b = subjectDef(content, 'brogath');
    const g = subjectDef(content, 'garrick');
    expect(STAGE_IDS).toEqual(['stable', 'uneasy', 'building', 'dangerous', 'critical', 'imminent']);
    expect([0, 15, 40, 65, 85, 100].map((p) => stageFor(b, p))).toEqual(['stable', 'uneasy', 'building', 'dangerous', 'critical', 'critical']);
    expect([0, 20, 40, 60, 80, 100].map((p) => stageFor(g, p))).toEqual(['stable', 'uneasy', 'building', 'dangerous', 'critical', 'critical']);
    expect(stageFor(g, 100, true)).toBe('imminent');
    expect([10, 44, 45, 74, 75, 114, 115, 300].map((i) => levelFor(content, i).id)).toEqual(['minor', 'minor', 'moderate', 'moderate', 'major', 'major', 'catastrophic', 'catastrophic']);
  });

  it('bad data and bad steps are content errors, with reasons', () => {
    const broken = (patch) => {
      const data = JSON.parse(JSON.stringify(content.shipPressure));
      patch(data);
      return pressureDataProblems({ ...content, shipPressure: data, stability: content.stability, npcs: content.npcs, sfx: content.sfx });
    };
    expect(broken((d) => { d.subjects.garrick.npc = 'nobody'; })).toContainEqual(expect.stringMatching(/unknown character "nobody"/));
    expect(broken((d) => { d.subjects.garrick.substance = 'coffin_sock'; })).toContainEqual(expect.stringMatching(/unknown substance "coffin_sock"/));
    expect(broken((d) => { d.subjects.garrick.at.building = 10; })).toContainEqual(expect.stringMatching(/at.building must be above the stage before it/));
    expect(broken((d) => { d.subjects.garrick.restrain.holdFactor = 0.5; })).toContainEqual(expect.stringMatching(/holding it in never makes it smaller/));
    expect(broken((d) => { d.subjects.garrick.eruption.after = 90; })).toContainEqual(expect.stringMatching(/after must be in range and below "building"/));
    expect(broken((d) => { d.subjects.garrick.eruption.cancelBelow = 2; })).toContainEqual(expect.stringMatching(/cancelBelow must be above "after"/));
    expect(broken((d) => { d.subjects.garrick.eruption.cooldown = 0; })).toContainEqual(expect.stringMatching(/no eruption every tick/));
    expect(broken((d) => { d.subjects.garrick.eruption.warn = 2; d.limits.warn = [1, 30]; })).toContainEqual(expect.stringMatching(/under 2 seconds to act/));
    expect(broken((d) => { d.subjects.garrick.modifiers.digesting.seconds = 0; })).toContainEqual(expect.stringMatching(/a modifier always ends/));
    expect(broken((d) => { d.subjects.garrick.cues.critical = { sfx: 'stomach_howl' }; })).toContainEqual(expect.stringMatching(/never only a sound/));
    expect(broken((d) => { d.subjects.brogath.soothe.set = 'nope'; })).toContainEqual(expect.stringMatching(/prompt set "nope"/));
    expect(broken((d) => { d.profiles.major.damage[0].section = 'keel'; })).toContainEqual(expect.stringMatching(/section is "room", "room2" or a section/));
    expect(broken((d) => { d.profiles.minor.gas.rate = 50; })).toContainEqual(expect.stringMatching(/the air's limit/));
    expect(broken((d) => { d.profiles.catastrophic.openings.force = 9; })).toContainEqual(expect.stringMatching(/never the whole ship/));
    expect(broken((d) => { d.impact.galley = ['stern']; })).toContainEqual(expect.stringMatching(/the stern isn't one of this room's sections/));
    expect(broken((d) => { delete d.profiles.moderate; })).toContainEqual(expect.stringMatching(/no profile for level "moderate"/));
  });
});

// ---------------------------------------------------------------------------------------------
describe('buildup, warnings and bounds', () => {
  it('triggers and modifiers raise it by the data (times the difficulty); it never leaves its range; a modifier refreshes, never stacks', () => {
    for (const d of DIFFS) {
      const s = session();
      const pr = s.ship.pressure;
      pr.enable('garrick');
      expect(pr.trigger('garrick', 'feast', T(d))).toMatchObject({ ok: true, rose: 25 * T(d).pressureScale });
      expect(pr.info('garrick').mods).toMatchObject([{ id: 'digesting', left: 60 }]);
      tick(s.ship, 10, d);
      expect(pr.pressureOf('garrick')).toBeCloseTo(5 + 25 * T(d).pressureScale + 6 * T(d).pressureScale, 6);
      pr.trigger('garrick', 'beans', T(d));
      expect(pr.info('garrick').mods).toMatchObject([{ id: 'digesting', left: 60 }]);
      for (let i = 0; i < 20; i++) pr.trigger('garrick', 'ritual_failed', T(d));
      expect(pr.pressureOf('garrick')).toBe(100);
      pr.settle('garrick', 0);
      pr.add('garrick', -500);
      expect(pr.pressureOf('garrick')).toBe(0);
      expect(pr.addModifier('garrick', 'nope')).toMatchObject({ ok: false });
    }
  });

  it('warnings come one stage at a time, in words; at the top a countdown starts (longer on Deckhand, shorter on Brutal)', () => {
    const want = { deckhand: 15, captain: 10, brutal: 7 };
    for (const d of DIFFS) {
      const s = session();
      const pr = s.ship.pressure;
      const notes = noticesOf(s.bus);
      const stages = [];
      s.bus.on('pressure:stage', (e) => stages.push(e.stage));
      pr.enable('garrick');
      for (let i = 0; i < 6; i++) pr.add('garrick', 20 / T(d).pressureScale, T(d));
      expect(stages).toEqual(['uneasy', 'building', 'dangerous', 'critical', 'imminent']);
      expect(pr.info('garrick')).toMatchObject({ stage: 'imminent', phase: 'imminent', left: want[d] });
      const words = notes.map((n) => plain(n.text));
      expect(words).toEqual([
        'GARRICK: BUILDING Calm him, or get ready.',
        'GARRICK: DANGEROUS Act now: calm him, hold it, or let it out somewhere safe.',
        'GARRICK: CRITICAL Any moment now.',
        `GARRICK IS ABOUT TO BLOW! ${want[d]} s. Calm, hold, or clear out.`,
      ]);
      // The countdown runs on hazard time, then the eruption, once.
      tick(s.ship, want[d] - 1, d);
      expect(pr.info('garrick').count).toBe(0);
      tick(s.ship, 1, d);
      expect(pr.info('garrick')).toMatchObject({ count: 1, phase: 'cooldown', stage: 'stable' });
    }
  });

  it('calming near the top works less; an imminent release eases off only well below the top', () => {
    const s = session();
    const pr = s.ship.pressure;
    pr.enable('garrick');
    pr.add('garrick', 40);
    expect(pr.calm('garrick', 'settle', T())).toMatchObject({ ok: true, fell: 12 });
    pr.add('garrick', 100);
    expect(pr.info('garrick').phase).toBe('imminent');
    expect(pr.calm('garrick', 'rest', T())).toMatchObject({ ok: true, fell: 7 }); // 20 x 0.35
    expect(pr.info('garrick').phase).toBe('imminent');
    pr.calm('garrick', 'rest', T());
    pr.calm('garrick', 'rest', T());
    expect(pr.pressureOf('garrick')).toBeLessThan(80);
    expect(pr.info('garrick').phase).toBe('idle');
  });

  it('after an eruption: relief, a cooldown with no eruption and softer rises, then it can build again (no loop)', () => {
    const s = session();
    const pr = s.ship.pressure;
    pr.enable('garrick');
    pr.add('garrick', 100);
    tick(s.ship, 10);
    expect(pr.info('garrick')).toMatchObject({ count: 1, phase: 'cooldown', left: 30, pressure: 5, held: 0, strain: 0 });
    // Rises count half in the cooldown, and even at the top nothing erupts until it ends.
    pr.trigger('garrick', 'feast');
    expect(pr.pressureOf('garrick')).toBeCloseTo(17.5, 6);
    for (let i = 0; i < 10; i++) pr.trigger('garrick', 'ritual_failed');
    expect(pr.info('garrick')).toMatchObject({ pressure: 100, phase: 'cooldown' });
    const before = pr.info('garrick').count;
    tick(s.ship, 29);
    expect(pr.info('garrick').count).toBe(before);
    tick(s.ship, 1);
    expect(pr.info('garrick').phase).toBe('imminent');
    // Ten minutes of a modifier never erupts more than the cooldowns allow.
    for (let i = 0; i < 600; i++) {
      if (i % 50 === 0) pr.addModifier('garrick', 'ceremony');
      s.ship.tick(T());
    }
    expect(pr.info('garrick').count).toBeLessThanOrEqual(1 + Math.ceil(600 / 40));
    expect(s.ship.air.sources.length).toBeLessThanOrEqual(content.shipAir.limits.sources);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Brogath: embarrassment, on his Stability', () => {
  it('his rises are his Stability triggers, through his Stability (one number; mellow still softens them)', () => {
    const s = session();
    const pr = s.ship.pressure;
    pr.enable('brogath');
    pr.settle('brogath', 20);
    const changed = [];
    s.bus.on('stability:changed', (e) => changed.push(e));
    expect(pr.trigger('brogath', 'laughed_at')).toMatchObject({ ok: true, rose: 25, effect: { line: expect.stringContaining('LAUGHING') } });
    expect(readStability(BROGATH_DEF, s).pressure).toBe(45);
    expect(s.story.getValue('brogath_state')).toBe('EMBARRASSED');
    expect(changed.at(-1)).toMatchObject({ subject: 'brogath', from: 20, to: 45 });
    // The Great Mellowing: a rise counts an eighth, as the Stability's own triggers do.
    const t = session();
    t.story.setValue('ship_atmosphere', 'MELLOW_HAZE');
    t.ship.pressure.enable('brogath');
    t.ship.pressure.settle('brogath', 20);
    const legacy = session();
    legacy.story.setValue('ship_atmosphere', 'MELLOW_HAZE');
    addPressure(BROGATH_DEF, legacy, 0);
    legacy.story.setVar('brogath_pressure', 20);
    for (let i = 0; i < 8; i++) {
      t.ship.pressure.trigger('brogath', 'flutter');
      addPressure(BROGATH_DEF, legacy, 15);
    }
    // His integer Stability carries the fractions instead of losing them: never more than the old rounding, never less than one under it.
    const a = readStability(BROGATH_DEF, t).pressure;
    expect(a).toBe(35);
    expect(Math.abs(a - readStability(BROGATH_DEF, legacy).pressure)).toBeLessThanOrEqual(15);
  });

  it('a scene owns him while a Stability incident runs or he is ANGRY: no buildup, no eruption, no interventions', async () => {
    const s = demo();
    await s.run([...scenario('A'), { stability: 'incident', id: 'debug_flutter' }]);
    const pr = s.session.ship.pressure;
    expect(pr.legacyOwns('brogath')).toBe(true);
    expect(pr.trigger('brogath', 'tripped')).toMatchObject({ ok: false, reason: 'Brogath is in the middle of something.' });
    const p = pr.pressureOf('brogath');
    tick(s.session.ship, 20);
    expect(pr.pressureOf('brogath')).toBe(p);
    expect(pressureGroups(s.session)).toEqual([]);
    await s.run([{ stability: 'secure' }, { stability: 'anger' }]);
    expect(pr.legacyOwns('brogath')).toBe(true);
    await s.run([{ stability: 'anger', on: false }]);
    expect(pr.legacyOwns('brogath')).toBe(false);
  });

  it('reassuring him up close: the right words calm him, the wrong ones set him off; a lock follows either way', async () => {
    const s = demo();
    await s.run(scenario('A'));
    const pr = s.session.ship.pressure;
    expect(pr.pressureOf('brogath')).toBe(45);
    s.choices.push(0); // turn 0 offers "That was entirely intentional." first (the reframe)
    await s.run([{ pressureSoothe: 'brogath', outcomeValue: 'fx' }]);
    expect(s.session.story.getValue('fx')).toBe('calmed');
    expect(pr.pressureOf('brogath')).toBe(45 - 28);
    expect(subjectOptions(s.session, 'brogath').find((o) => o.action === 'soothe')).toMatchObject({ ok: false, reason: 'Brogath needs a moment (6 s).' });
    // His prompt rotates its options by turn (always one right answer, not always a wrong one): on until a wrong one is offered, and say it.
    let before = null;
    for (let i = 0; i < 4 && before === null; i++) {
      await s.run([{ hazardClock: 6 }, { pressureTrigger: 'brogath', trigger: 'laughed_at', quiet: true }]);
      const opts = promptOptions(BROGATH_DEF, 'general', pr.state('brogath').turn);
      const wrong = opts.findIndex((x) => !x.calm);
      if (wrong >= 0) before = pr.pressureOf('brogath');
      s.choices.push(wrong >= 0 ? wrong : opts.findIndex((x) => x.calm));
      await s.run([{ pressureSoothe: 'brogath', outcomeValue: 'fx' }]);
    }
    expect(s.session.story.getValue('fx')).toBe('worse');
    expect(pr.pressureOf('brogath')).toBeGreaterThan(before);
    // Too far away, or in another room: not offered, or says why.
    s.session.location = { ...s.session.location, x: 3, y: 4 };
    expect(subjectOptions(s.session, 'brogath').find((o) => o.action === 'soothe').reason).toBe('Get closer to Brogath.');
    s.session.location = { ...s.session.location, map: 'galley' };
    expect(pressureGroups(s.session)).toEqual([]);
  });

  it('holding it in: lower now, stored up (half again), and every hold makes the next embarrassment hit harder', async () => {
    const s = demo();
    await s.run(scenario('D'));
    const pr = s.session.ship.pressure;
    s.playHands('perfect', 'perfect');
    await s.run([{ pressureRestrain: 'brogath' }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ id: 'restrain:brogath', outcome: 'success' });
    expect(pr.info('brogath')).toMatchObject({ pressure: 25, held: 45, strain: 1, restrainLock: 12 });
    expect(pr.trigger('brogath', 'tripped').rose).toBe(18); // 15 x 1.25 (one strain), the quarter carried
    expect(subjectOptions(s.session, 'brogath').find((o) => o.action === 'restrain').reason).toMatch(/^(Not again yet \(\d+ s\)\.|Nothing to hold in yet\.)$/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Garrick: gas and ceremony', () => {
  it('food charges him (a digesting modifier), a ceremony is fast and deliberate, and he won\'t be settled mid-ceremony', async () => {
    const s = demo();
    await s.run(scenario('B'));
    const pr = s.session.ship.pressure;
    expect(pr.info('garrick')).toMatchObject({ pressure: 30, stage: 'uneasy', mods: [{ id: 'digesting', label: 'digesting' }] });
    await s.run([{ pressureTrigger: 'garrick', trigger: 'ritual' }]);
    expect(subjectOptions(s.session, 'garrick').find((o) => o.action === 'soothe')).toMatchObject({ ok: false, reason: "Garrick is mid-ceremony: he won't be settled." });
    await s.run([{ pressureModifier: 'garrick', modifier: 'ceremony', remove: true }]);
    const before = pr.pressureOf('garrick');
    await s.run([{ pressureSoothe: 'garrick' }]);
    // Three seconds of settling him (the digesting goes on), then the calm.
    expect(pr.pressureOf('garrick')).toBeCloseTo(before + 3 * 0.6 - 12, 6);
  });

  it('what he holds seeps back out a little every second (never past the top); his controlled release is half as big', () => {
    const s = session();
    const pr = s.ship.pressure;
    pr.enable('garrick');
    pr.add('garrick', 55);
    pr.restrained('garrick', T());
    expect(pr.info('garrick')).toMatchObject({ pressure: 35, held: 25 });
    tick(s.ship, 10);
    expect(pr.info('garrick')).toMatchObject({ pressure: 40, held: 20 });
    // Brogath's never seeps: it waits for the eruption.
    pr.enable('brogath');
    pr.settle('brogath', 60);
    pr.restrained('brogath', T());
    tick(s.ship, 10);
    expect(pr.info('brogath')).toMatchObject({ pressure: 30, held: 45 });
    const r = pr.erupt('garrick', { controlled: true, tuning: T() });
    expect(r).toMatchObject({ ok: true, controlled: true, intensity: Math.round((40 + 20 * 0.75) * 0.5), level: 'minor' });
  });

  it('none of his story values are touched', async () => {
    const s = demo();
    const before = ['garrick_release', 'garrick_charge'].map((k) => s.session.story.getValue(k));
    await s.run([...scenario('C'), { hazardClock: 30 }]);
    expect(['garrick_release', 'garrick_charge'].map((k) => s.session.story.getValue(k))).toEqual(before);
    expect(Object.keys(s.session.story.serialize().vars).filter((k) => k.startsWith('garrick_') && !(k in makeStory({ preset: 'pressure_demo' }).session.story.serialize().vars))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('eruptions', () => {
  it('the size follows the pressure and what was held: minor, moderate, major, catastrophic', () => {
    const got = [];
    for (const [p, held, controlled] of [[30, 0, false], [60, 0, false], [100, 0, false], [100, 40, false], [100, 0, true], [100, 60, true]]) {
      const s = session();
      const pr = s.ship.pressure;
      pr.enable('garrick');
      pr.settle('garrick', p);
      pr.state('garrick').held = held;
      got.push(pr.erupt('garrick', { controlled, tuning: T() }).level);
    }
    expect(got).toEqual(['minor', 'moderate', 'major', 'catastrophic', 'moderate', 'moderate']);
  });

  it('a catastrophe in the crew quarters: the bow and the port hull struck (never below a quarter), the room\'s doors blown and one damaged, a finite gas source', () => {
    const s = session();
    const pr = s.ship.pressure;
    const air = s.ship.air;
    air.setConnection('galley_door', 'closed');
    air.setConnection('washroom_door', 'closed');
    air.setConnection('washroom_door', 'sealed');
    pr.enable('garrick');
    pr.settle('garrick', 100);
    pr.state('garrick').held = 60;
    const r = pr.erupt('garrick', { tuning: T() });
    expect(r).toMatchObject({ ok: true, room: 'crew_quarters', level: 'catastrophic', eventId: 'erupt:garrick:1' });
    expect(r.damage.map((x) => [x.section, x.applied])).toEqual([['bow', 22], ['hull_port', 8]]);
    expect(s.ship.hp.get('bow')).toBe(58);
    // The seal torn (a torn seal is a damaged door), the shut door blown, and it damaged too (it leaks shut, and won't seal until mended).
    expect(r.openings.map((o) => [o.id, o.what])).toEqual([['washroom_door', 'seal torn open'], ['galley_door', 'blown open, damaged']]);
    expect(air.connectionState('washroom_door')).toMatchObject({ state: 'open', damaged: true });
    expect(air.connectionState('galley_door')).toMatchObject({ state: 'open', damaged: true });
    expect(air.connectionState('quarters_porthole').state).toBe('closed');
    expect(r.gas).toEqual({ source: 'erupt_garrick_1', substance: 'heavy_gas', amount: 240, rate: 20 });
    tick(s.ship, 60);
    expect(air.sources).toEqual([]);
    expect(accounted(air, 'heavy_gas')).toBeCloseTo(240, 4);
    // A second catastrophe can't take the bow below a quarter.
    pr.settle('garrick', 100);
    pr.state('garrick').held = 60;
    for (let i = 0; i < 4; i++) {
      pr.state('garrick').phase = 'idle';
      pr.settle('garrick', 100);
      pr.state('garrick').held = 60;
      pr.erupt('garrick', { tuning: T('brutal') });
    }
    expect(s.ship.hp.get('bow')).toBe(20);
    expect(s.ship.destroyed).toBe(false);
  });

  it('where it happens decides what it strikes; a room no section covers strikes nothing; leaks and fire only when a profile says so', () => {
    const s = session();
    const pr = s.ship.pressure;
    pr.enable('garrick');
    pr.settle('garrick', 100);
    const r = pr.erupt('garrick', { room: 'main_deck', tuning: T() });
    expect(r.damage.map((x) => x.section)).toEqual(['deck']);
    expect(s.ship.hazards.leaks).toEqual([]);
    expect(s.ship.hazards.fires).toEqual([]);
    pr.state('garrick').phase = 'idle';
    pr.settle('garrick', 100);
    expect(pr.erupt('garrick', { room: 'washroom', profile: 'catastrophic', tuning: T() }).damage).toEqual([]);
    expect(pr.erupt('garrick', { room: 'nowhere', tuning: T() })).toMatchObject({ ok: false });
  });

  it('applied once per event: a repeated callback adds nothing; named ids and the default ids both hold', async () => {
    const s = demo();
    await s.run([{ pressureSubject: 'garrick' }, { pressureSettle: 'garrick', pressure: 100 }, { pressureErupt: 'garrick', profile: 'major', eventId: 'fx_blast' }, { pressureErupt: 'garrick', profile: 'major', eventId: 'fx_blast' }]);
    const ship = s.session.ship;
    expect(ship.pressure.info('garrick').count).toBe(1);
    expect(ship.air.sources.length).toBe(1);
    expect(ship.hp.get('bow')).toBe(68);
    expect(ship.pressure.erupt('garrick', { eventId: 'fx_blast' })).toMatchObject({ ok: false, reason: 'duplicate event' });
    expect([...ship.seen]).toContain('fx_blast');
  });

  it('a blast-damaged door is mended with planks and nails on the repair bar, and can be sealed again', async () => {
    const s = demo();
    const air = s.session.ship.air;
    air.setConnection('galley_door', null, { damaged: true });
    expect(airOptions(s.session, 'crew_quarters', { always: true }).find((o) => o.action === 'seal')).toBeUndefined();
    air.setConnection('galley_door', 'closed');
    expect(airOptions(s.session, 'crew_quarters', { always: true }).find((o) => o.action === 'seal')).toMatchObject({ ok: false, reason: 'The galley door is damaged: mend it first.' });
    expect(airOptions(s.session, 'crew_quarters', { always: true }).find((o) => o.action === 'mend')).toMatchObject({ ok: true, label: 'Mend the galley door: 1 Planks, 1 Nails' });
    s.playHands('fumble', 'fumble', 'perfect', 'perfect');
    s.decideChallenges('retry');
    await s.run([{ airMend: 'galley_door' }]);
    expect(air.connectionState('galley_door')).toMatchObject({ state: 'closed', damaged: false });
    // Two failed tries (a nail each), then the mend (a plank and a nail).
    expect(s.challengeRecords.at(-1)).toMatchObject({ id: 'mend:galley_door', outcome: 'success', attempt: 3 });
    expect([s.session.inventory.count('planks'), s.session.inventory.count('nails')]).toEqual([7, 7]);
    expect(airOptions(s.session, 'crew_quarters', { always: true }).find((o) => o.action === 'seal').ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
describe('the captain\'s choices: suppression and its price', () => {
  const EMBARRASSMENTS = { 20: 'laughed_at', 40: 'tripped', 60: 'laughed_at', 80: 'tripped' };
  /**
   * Scenario D (Brogath building), one route, then two and a half minutes of
   * the crew keeping at him (the same four embarrassments for every route),
   * the captain doing his route's thing whenever it is offered.
   */
  async function route(name, d) {
    const s = demo({ prefs: { difficulty: d } });
    const notes = noticesOf(s.bus);
    await s.run(scenario('D'));
    const pr = s.session.ship.pressure;
    const offered = (a) => subjectOptions(s.session, 'brogath').find((o) => o.action === a).ok;
    if (name === 'relief') await s.run([{ pressureRelease: 'brogath' }]);
    s.playHands(...Array(20).fill('perfect'));
    for (let t = name === 'relief' ? 3 : 0; t < 150; t++) {
      if (EMBARRASSMENTS[t]) await s.run([{ pressureTrigger: 'brogath', trigger: EMBARRASSMENTS[t], quiet: true }]);
      if (name === 'calm' && offered('soothe')) {
        // The right words each time (his reassurance prompt rotates, so look for them).
        s.choices.push(promptOptions(BROGATH_DEF, 'general', pr.state('brogath').turn).findIndex((x) => x.calm));
        await s.run([{ pressureSoothe: 'brogath' }]);
      }
      if (name === 'hold' && offered('restrain')) await s.run([{ pressureRestrain: 'brogath' }]);
      await s.run([{ hazardClock: 1 }]);
    }
    const eruptions = () => notes.filter((n) => /:erupt:/.test(n.key)).map((n) => plain(n.text).replace(/ In the Crew Quarters\.$/, ''));
    return { s, pr, eruptions, info: pr.info('brogath'), bow: () => s.session.ship.hp.get('bow'), gas: () => Math.round(accounted(s.session.ship.air, 'vapor')) };
  }

  it('relieved early: a small controlled puff now; calmed: nothing at all; held in: nothing yet, but stored up to the limit; left alone: a major eruption', async () => {
    const relief = await route('relief', 'captain');
    expect(relief.eruptions()).toEqual(['BROGATH: a minor release (controlled)!']);
    expect([relief.bow(), relief.gas()]).toEqual([80, 30]);
    const calm = await route('calm', 'captain');
    expect([calm.eruptions(), calm.bow(), calm.gas(), calm.info.stage]).toEqual([[], 80, 0, 'stable']);
    const none = await route('none', 'captain');
    expect([none.eruptions(), none.bow()]).toEqual([['BROGATH: a MAJOR ERUPTION!'], 68]);
    const hold = await route('hold', 'captain');
    expect([hold.eruptions(), hold.bow(), hold.info.held, hold.info.strain]).toEqual([[], 80, 90, 3]);
    // The price: the next embarrassment hits him one and three quarters as hard, and all he held comes out with it.
    await hold.s.run([{ pressureTrigger: 'brogath', trigger: 'laughed_at', quiet: true }, { hazardClock: 10 }]);
    expect(hold.eruptions()).toEqual(['BROGATH: a CATASTROPHIC ERUPTION!']);
    expect(hold.bow()).toBeLessThan(none.bow());
    await hold.s.run([{ hazardClock: 30 }]);
    await none.s.run([{ hazardClock: 30 }]);
    expect(hold.gas()).toBeGreaterThan(none.gas());
    expect(none.gas()).toBeGreaterThan(relief.gas());
  });

  it('on every difficulty, steady calming keeps him from erupting at all; on Brutal, holding it in blows up within the same minutes', async () => {
    for (const d of DIFFS) expect([d, (await route('calm', d)).eruptions()]).toEqual([d, []]);
    expect((await route('hold', 'brutal')).eruptions()).toEqual(['BROGATH: a CATASTROPHIC ERUPTION!']);
  });
});

// ---------------------------------------------------------------------------------------------
describe('the demo, played headless', () => {
  it('A: Brogath laughed at and stared at; reassured, he settles', async () => {
    const s = demo();
    await s.run(scenario('A'));
    const pr = s.session.ship.pressure;
    expect(pr.info('brogath')).toMatchObject({ on: true, available: true, room: 'crew_quarters', stage: 'building', mods: [{ id: 'stared_at' }] });
    expect(pressureReport(s.session, 'brogath').map(plain)).toEqual([
      'Brogath: BUILDING (54%).',
      'Building him up: the crew staring at him (60 s).',
      'Openings here: fore hatch open, galley door open, washroom door open, porthole closed.',
      "Reassure him (the right words), or let it out where you've opened a porthole. Held in, it comes back bigger.",
    ]);
    s.choices.push(0);
    await s.run([{ pressureSoothe: 'brogath' }]);
    expect(pr.stage('brogath')).toBe('uneasy');
  });

  it('B: Garrick after a feast: the porthole opened, let out carefully: a finite puff the porthole clears, then a cooldown', async () => {
    for (const d of DIFFS) {
      const s = demo({ prefs: { difficulty: d } });
      await s.run([...scenario('B'), { hazardClock: 20 }, { airControl: 'quarters_porthole', state: 'open' }, { pressureRelease: 'garrick', outcomeValue: 'fx' }]);
      const pr = s.session.ship.pressure;
      expect([d, s.session.story.getValue('fx'), pr.info('garrick').phase]).toEqual([d, 'minor', 'cooldown']);
      await s.run([{ hazardClock: 60 }]);
      expect([d, s.session.ship.air.sources.length, s.session.ship.air.emergencies().length]).toEqual([d, 0, 0]);
      expect(pr.info('garrick').phase).toBe('idle');
    }
  });

  it('C: the catastrophe is survivable and repairable on Captain and Brutal: out, vent, mend, repair', async () => {
    for (const d of ['captain', 'brutal']) {
      const s = demo({ prefs: { difficulty: d } });
      await s.run([...scenario('C'), { hazardClock: 15 }]);
      const ship = s.session.ship;
      expect([d, ship.pressure.info('garrick').count]).toEqual([d, 1]);
      expect(ship.air.connectionState('fore_hatch').damaged).toBe(true);
      expect(ship.hp.get('bow')).toBeLessThan(80);
      expect(emergencySummary(s.session).items.join(' ')).toMatch(/AIR/);
      // He opens the porthole, gets out to the deck, comes back to mend the hatch and repair the bow.
      await s.run([{ airControl: 'quarters_porthole', state: 'open' }]);
      s.session.location = { ...s.session.location, map: 'main_deck' };
      await s.run([{ hazardClock: 90 }]);
      s.session.location = { ...s.session.location, map: 'crew_quarters' };
      s.playHands('perfect', 'perfect', 'perfect', 'perfect', 'perfect', 'perfect');
      await s.run([{ airMend: 'fore_hatch' }, { shipRepair: 'bow' }]);
      expect([d, ship.air.connectionState('fore_hatch').damaged, ship.hp.get('bow') > 60, ship.destroyed, s.session.party.members[0].hp > 0]).toEqual([d, false, true, false, true]);
    }
  });

  it('E: save mid-buildup, reload: the same pressure, modifiers and cooldown; a failed hold retried; then a release with nothing doubled', async () => {
    let s = demo();
    await s.run([...scenario('E'), { hazardClock: 5 }]);
    const before = JSON.stringify(s.session.ship.pressure.serialize());
    s = reloadStory(s);
    expect(s.record.version).toBe(SAVE_VERSION);
    expect(JSON.stringify(s.session.ship.pressure.serialize())).toBe(before);
    const pr = s.session.ship.pressure;
    const p0 = pr.pressureOf('garrick');
    // A failed hold, tried again: the attempt's own state back, the failure's price kept (worse by 8).
    s.playHands({ fumbles: 3 }, 'perfect', 'perfect');
    s.decideChallenges('retry');
    await s.run([{ pressureRestrain: 'garrick' }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ outcome: 'success', attempt: 2 });
    expect(pr.info('garrick')).toMatchObject({ held: 25, strain: 1 });
    expect(pr.pressureOf('garrick')).toBeCloseTo(p0 + 8 - 25, 6);
    // The release: one source, one eruption, however the save/reload falls.
    await s.run([{ pressureErupt: 'garrick', profile: 'moderate', eventId: 'fx_e' }]);
    s = reloadStory(s);
    await s.run([{ pressureErupt: 'garrick', profile: 'moderate', eventId: 'fx_e' }, { hazardClock: 30 }]);
    expect(s.session.ship.pressure.info('garrick').count).toBe(1);
    expect(Math.round(accounted(s.session.ship.air, 'heavy_gas'))).toBe(80);
  });
});

// ---------------------------------------------------------------------------------------------
describe('checkpoints and retry-safe eruptions', () => {
  const STRICT = (over = {}) => ({ failure: true, mechanics: { maxFumbles: 1 }, outcomes: { failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' }, ...over });

  it('a checkpoint holds the pressure, what is held, the phase, the gas, the openings and the damage; restoring puts them all back', () => {
    const s = session();
    const pr = s.ship.pressure;
    pr.enable('garrick');
    pr.enable('brogath');
    pr.settle('brogath', 50);
    pr.add('garrick', 60);
    pr.restrained('garrick', T());
    const cp = captureCheckpoint(s, { id: 'fx' });
    const before = JSON.stringify(s.serialize().ship);
    const bp = readStability(BROGATH_DEF, s).pressure;
    pr.trigger('brogath', 'insulted');
    pr.add('garrick', 100);
    tick(s.ship, 12);
    expect(pr.info('garrick').count).toBe(1);
    const d = diffStates({ ship: cp.domains.ship, story: cp.domains.story }, s.serialize());
    expect(d.pressure.garrick).toMatchObject({ count: [0, 1], phase: ['idle', 'cooldown'] });
    expect(d.vars.brogath_pressure).toBeDefined();
    expect(d.air.sources).toEqual([0, 1]);
    expect(d.ship.bow).toEqual([80, 58]); // what he held made it a catastrophe
    restoreCheckpoint(s, cp);
    expect(JSON.stringify(s.serialize().ship)).toBe(before);
    expect(readStability(BROGATH_DEF, s).pressure).toBe(bp);
  });

  it('an eruption in an attempt is rolled back with it, and lands again on the next; one in its costs lands once per failure', async () => {
    const s = demo();
    await s.run([{ pressureSubject: 'garrick' }]);
    const ship = s.session.ship;
    s.onAttempt((info) => {
      if (info.id !== 'fx_p') return;
      ship.pressure.settle('garrick', 100);
      ship.pressure.erupt('garrick', { profile: 'major', tuning: T() });
      ship.pressure.erupt('garrick', { profile: 'major', tuning: T(), eventId: `erupt:garrick:${ship.pressure.state('garrick').count}` });
    });
    s.playHands('fumble', 'fumble', 'perfect');
    await s.run([{
      repair: 'hull', strikes: 2,
      challenge: STRICT({ id: 'fx_p', onFailure: { mustRetry: true, costs: [
        { pressureErupt: 'garrick', profile: 'minor', room: 'main_deck', eventId: 'puff' },
        { pressureErupt: 'garrick', profile: 'minor', room: 'main_deck', eventId: 'puff' },
      ] } }),
    }]);
    expect(s.challengeRecords.at(-1)).toMatchObject({ outcome: 'success', attempt: 3 });
    // The attempt's own (the third): once, the damage once (bow 80 -> 68), its source once.
    expect(ship.hp.get('bow')).toBe(68);
    expect(ship.air.sources.filter((x) => x.room === 'crew_quarters').length).toBe(1);
    // Two failures: two puffs on deck, each once.
    expect([...ship.seen].filter((e) => e.startsWith('fx_p:'))).toEqual(['fx_p:cost:1:puff', 'fx_p:cost:2:puff']);
    expect(ship.air.sources.filter((x) => x.room === 'main_deck').length).toBe(2);
    // Three eruptions in the state: the two puffs and the attempt's own (the repeated call was refused).
    expect(ship.pressure.info('garrick').count).toBe(3);
  });
});

// ---------------------------------------------------------------------------------------------
describe('saves (version 21)', () => {
  it('versions 17 to 20 load with every subject off and nothing pending; Brogath\'s Stability as it was; nobody moved', () => {
    const s = session('p17_complete', 'crew_quarters');
    s.story.setVar('brogath_pressure', 33);
    const saves = new SaveManager({ storage: new MemoryStorage(), content });
    expect(saves.save(1, s).ok).toBe(true);
    for (const v of [17, 18, 19, 20]) {
      const raw = JSON.parse(JSON.stringify(saves.read(1).state));
      delete raw.ship?.pressure;
      if (v < 20) delete raw.ship?.air;
      const t = GameSession.fromState({ content, bus: new EventBus(), state: raw, strictFlags: true, onWarning: (w) => { throw new Error(w); } });
      expect([v, t.ship.pressure.untouched, readStability(BROGATH_DEF, t).pressure, npcWhere(content, t, 'brogath'), npcWhere(content, t, 'garrick')]).toEqual([v, true, 33, { room: 'crew_quarters', x: 10, y: 7 }, { room: 'crew_quarters', x: 13, y: 6 }]);
    }
  });

  it('damaged pressure data loads safely: unknown subjects, modifiers and phases dropped or reset, numbers clamped, nothing invented', () => {
    const s = session();
    const warnings = [];
    s.ship.pressure.load({ subjects: {
      garrick: { on: true, p: 900, held: -5, strain: 99, phase: 'exploding', left: 50, mods: [{ id: 'digesting', rate: 99, left: 9999 }, { id: 'coffin_sock', rate: 1, left: 5 }], count: -2 },
      thunderbottom: { on: true, p: 50 },
      brogath: 'nonsense',
    } }, (w) => warnings.push(w));
    expect(s.ship.pressure.info('garrick')).toMatchObject({ on: true, pressure: 100, held: 0, strain: 4, phase: 'idle', left: 0, count: 0, mods: [{ id: 'digesting', left: 60 }] });
    expect(s.ship.pressure.state('garrick').mods[0].rate).toBe(0.6);
    expect(warnings).toEqual(expect.arrayContaining([expect.stringMatching(/unknown subject "thunderbottom"/), expect.stringMatching(/unknown subject "brogath"/), expect.stringMatching(/unknown phase/), expect.stringMatching(/unknown modifier "coffin_sock"/)]));
  });

  it('a countdown saved mid-way resumes where it was; loading replays no warning and no eruption', async () => {
    let s = demo();
    await s.run([{ pressureSubject: 'garrick' }, { pressureAdd: 'garrick', amount: 95 }, { hazardClock: 4 }]);
    expect(s.session.ship.pressure.info('garrick')).toMatchObject({ phase: 'imminent', left: 6 });
    s = reloadStory(s);
    const notes = noticesOf(s.bus);
    expect(s.session.ship.pressure.info('garrick')).toMatchObject({ phase: 'imminent', left: 6, count: 0 });
    await s.run([{ hazardClock: 5 }]);
    expect(notes.filter((n) => n.key.startsWith('pressure:'))).toEqual([]);
    await s.run([{ hazardClock: 1 }]);
    expect(s.session.ship.pressure.info('garrick').count).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
describe('one clock, difficulty and accessibility', () => {
  it('pressure moves only on hazard ticks, before the air: an eruption\'s gas is in the room the same second', async () => {
    const s = demo();
    await s.run([{ pressureSubject: 'garrick' }, { pressureTrigger: 'garrick', trigger: 'feast' }]);
    const p = s.session.ship.pressure.pressureOf('garrick');
    // A scene, dialogue and waiting move nothing.
    await s.run([{ narrate: 'A long story about beans.' }, { wait: 3000 }]);
    expect(s.session.ship.pressure.pressureOf('garrick')).toBe(p);
    await s.run([{ pressureAdd: 'garrick', amount: 70 }, { hazardClock: 9 }]);
    expect(s.session.ship.air.quantity('crew_quarters', 'heavy_gas')).toBe(0);
    await s.run([{ hazardClock: 1 }]);
    expect(s.session.ship.pressure.info('garrick').count).toBe(1);
    expect(s.session.ship.air.quantity('crew_quarters', 'heavy_gas')).toBeGreaterThan(0);
  });

  it('difficulty scales the risk and the response (rises, warning, calming, the price of holding, the release), never the gas between rooms', () => {
    const t = Object.fromEntries(DIFFS.map((d) => [d, T(d)]));
    expect(DIFFS.map((d) => [t[d].pressureScale, t[d].warnScale, t[d].calmScale, t[d].holdScale, t[d].releaseScale])).toEqual([[0.75, 1.5, 1.3, 0.75, 0.75], [1, 1, 1, 1, 1], [1.25, 0.65, 0.8, 1.25, 1.25]]);
    const result = {};
    for (const d of DIFFS) {
      const s = session();
      const pr = s.ship.pressure;
      pr.enable('garrick');
      pr.settle('garrick', 100);
      result[d] = pr.erupt('garrick', { profile: 'catastrophic', tuning: t[d] }).gas.amount;
    }
    expect(result).toEqual({ deckhand: 180, captain: 240, brutal: 300 });
  });

  it('the restraint is the timing bar: the timing assist widens and slows it (an accessibility setting, apart from the difficulty)', async () => {
    const bars = {};
    for (const timingAssist of ['off', 'strong']) {
      const s = demo({ prefs: { difficulty: 'brutal', timingAssist } });
      await s.run(scenario('D'));
      s.playHands('perfect', 'perfect');
      await s.run([{ pressureRestrain: 'brogath' }]);
      bars[timingAssist] = s.challengeAttempts.at(-1);
    }
    expect(bars.off).toMatchObject({ kind: 'repair', id: 'restrain:brogath', assists: [] });
    expect(bars.strong.assists).toEqual(['timingAssist:strong']);
    expect(bars.strong.bar.zone).toBeGreaterThan(bars.off.bar.zone);
    expect(bars.strong.bar.speed).toBeLessThan(bars.off.bar.speed);
  });
});

// ---------------------------------------------------------------------------------------------
describe('the HUD, the Ship page, Respond and the words', () => {
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

  it('the emergency line names him and his stage (HELD, the countdown), Respond groups him with the air, and the condition reads it', async () => {
    const s = demo();
    await s.run([...scenario('C'), { hazardClock: 3 }]);
    const e = emergencySummary(s.session);
    expect(e.items[0]).toBe('<r>GARRICK</> IMMINENT <k>HELD</> <r>10s</>');
    expect(e.respond).toBe(true);
    expect(pressureGroups(s.session).map((g) => g.label)).toEqual(['Garrick (IMMINENT)']);
    s.choices.push(0, 0); // Garrick, then Check on Garrick
    const lines = s.log.length;
    await s.run([{ emergency: true }]);
    expect(s.log.length).toBe(lines + pressureReport(s.session, 'garrick').length);
    s.choices.push(1, 0); // Air and vents, then Check the air
    await s.run([{ emergency: true }]);
    expect(evaluateCondition({ pressure: { subject: 'garrick', stage: ['critical', 'imminent'] } }, s.session)).toBe(true);
    expect(evaluateCondition({ pressure: { subject: 'garrick', held: true, phase: 'imminent', here: true, active: true, available: true } }, s.session)).toBe(true);
    expect(evaluateCondition({ pressure: { subject: 'garrick', pressure: { gte: 100 }, erupted: 0 } }, s.session)).toBe(true);
    expect(evaluateCondition({ pressure: { subject: 'brogath', active: true } }, s.session)).toBe(false);
  });

  it('the Ship page lists him; Confirm (Z or pad A) on him here opens Respond, once; from another room it buzzes', async () => {
    const pads = [{ id: 'Test Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) }];
    Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true, writable: true });
    for (const device of ['keyboard', 'pad']) {
      for (const room of ['crew_quarters', 'main_deck']) {
        const s = demo();
        await s.run(scenario('D'));
        s.session.location = { ...s.session.location, map: room };
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
        const row = page.menu.items.findIndex((i) => i.value === 'hz:pressure:brogath');
        expect(page.menu.items[row]).toMatchObject({ label: 'Pressure: Brogath', right: 'BUILDING' });
        for (let i = 0; i < row; i++) press('ArrowDown', 13);
        const lines = page.detail.objects.map((o) => o.text.replace(/\n/g, ' ')).join(' | ');
        expect(lines).toMatch(room === 'crew_quarters' ? /Respond here/ : /Go to the Crew Quarters to deal with him\./);
        press('KeyZ', 0);
        press('KeyZ', 0);
        if (room === 'crew_quarters') {
          expect(scene.closed.length).toBe(1);
          const ran = [];
          scene.closed[0].then({ runScript: (steps) => ran.push(steps) });
          expect(ran).toEqual([[{ emergency: true }]]);
        } else {
          expect(scene.closed).toEqual([]);
          expect(sounds).toContain('buzzer');
        }
      }
    }
  });

  it('every pressure word fits: toasts, report lines, choices, reasons, work labels, the HUD line and the page', async () => {
    const bad = [];
    const s = demo({ prefs: { difficulty: 'brutal' } });
    const notes = noticesOf(s.bus);
    // The worst: both of them at once, held in, with modifiers, counting down, then the catastrophe.
    await s.run([...scenario('C'), ...scenario('A'), { pressureHold: 'brogath' }, { pressureAdd: 'brogath', amount: 100 }]);
    const DIALOGUE_W = 312 - 10 - 10;
    const CHOICE_W = SCREEN_WIDTH - 12 - 26 - 4;
    for (const id of ['garrick', 'brogath']) {
      for (const line of pressureReport(s.session, id)) if (wrap(fonts.main, plain(line), DIALOGUE_W).split('\n').length > 4) bad.push(`report: ${line}`);
      for (const o of subjectOptions(s.session, id)) {
        if (measure(fonts.main, plain(o.label)) > CHOICE_W) bad.push(`choice: ${o.label}`);
        if (o.reason && wrap(fonts.main, plain(o.reason), TOAST_TEXT_WIDTH).split('\n').length > 4) bad.push(`reason: ${o.reason}`);
      }
      for (const verb of ['Settling', 'Easing']) {
        const label = `${verb} ${subjectDef(content, id).name}`.toUpperCase();
        if (measure(fonts.bold, label) + 38 > SCREEN_WIDTH - 8) bad.push(`work: ${label}`);
      }
    }
    for (const g of pressureGroups(s.session)) if (measure(fonts.main, plain(g.label)) > CHOICE_W) bad.push(`group: ${g.label}`);
    const summary = emergencySummary(s.session);
    const HUD_W = SCREEN_WIDTH - 8;
    const line = emergencyLine(summary, (m) => measure(fonts.main, plain(m)) <= HUD_W);
    if (measure(fonts.main, plain(line)) > HUD_W) bad.push(`hud: ${line}`);
    await s.run([{ hazardClock: 15 }]);
    for (const n of notes) if (wrap(fonts.main, plain(n.text), TOAST_TEXT_WIDTH).split('\n').length > 4) bad.push(`toast: ${n.text}`);
    const input = new InputManager({ target: {} });
    const app = { session: s.session, content, input, fontMetrics: fonts, settings: { challengePrefs: () => ({ difficulty: 'brutal' }) }, audio: { ui: () => {}, sfx: () => {} } };
    const page = new ShipPage(stubScene(app), PANE);
    page.render();
    const DETAIL_W = PANE.w - 24;
    const DETAIL_ROOM = PANE.h - 4 - 6 - 117;
    for (const item of page.menu.items.filter((i) => String(i.value).startsWith('hz:pressure:'))) {
      page.detail.clear();
      page.renderHazard(item.value.slice(3));
      const height = page.detail.objects.reduce((n, o) => n + wrap(fonts.main, plain(o.text), DETAIL_W).split('\n').length * 11 + 2, -2);
      if (height > DETAIL_ROOM) bad.push(`page ${item.value}: ${height} px (room for ${DETAIL_ROOM})`);
    }
    expect(pressureWord({ tone: 'r', name: 'Brogath', label: 'imminent', held: true, left: 12 })).toBe('<r>BROGATH</> IMMINENT <k>HELD</> <r>12s</>');
    expect(bad).toEqual([]);
  });

  it('cheap to run: a thousand seconds with both of them in play stays bounded, and nothing accumulates', () => {
    const s = session();
    const pr = s.ship.pressure;
    pr.enable('garrick');
    pr.enable('brogath');
    const listeners = s.bus.listenerCount?.('hazard:notice') ?? null;
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      if (i % 30 === 0) {
        pr.trigger('garrick', 'beans');
        pr.trigger('brogath', 'flutter');
      }
      s.ship.tick(T());
    }
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(2000);
    expect(pr.state('garrick').mods.length).toBeLessThanOrEqual(content.shipPressure.limits.modifiers);
    expect(s.ship.air.sources.length).toBeLessThanOrEqual(content.shipAir.limits.sources);
    expect(s.ship.seen.size).toBeLessThanOrEqual(128);
    expect(JSON.stringify(pr.serialize()).length).toBeLessThan(600);
    if (listeners !== null) expect(s.bus.listenerCount('hazard:notice')).toBe(listeners);
  });
});

// ---------------------------------------------------------------------------------------------
describe('the campaign and Brogath\'s Stability are unchanged', () => {
  const PRESSURE_COMMANDS = Object.keys((() => ({ pressureSubject: 1, pressureTrigger: 1, pressureCalm: 1, pressureAdd: 1, pressureHold: 1, pressureModifier: 1, pressureErupt: 1, pressureSettle: 1, pressureSetback: 1, pressureCheck: 1, pressureSoothe: 1, pressureRestrain: 1, pressureRelease: 1, airMend: 1 }))());

  it('no chapter switches a subject on, triggers, releases, reads the pressure or mends; the demo is debug-only', () => {
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
        if (PRESSURE_COMMANDS.includes(name)) found.push(`${at}: ${name}`);
        if (v.pressure !== undefined && typeof v.pressure === 'object' && v.pressure?.subject) found.push(`${at}: pressure condition`);
        Object.values(v).forEach((x) => visit(x, at));
      }
    };
    for (const id of content.scripts.ids()) visit(content.scripts.get(id), id);
    for (const id of content.maps.ids()) visit(content.maps.get(id), id);
    for (const id of content.quests.ids()) visit(content.quests.get(id), id);
    expect(found).toEqual([]);
    expect(REGISTRY.pressureRestrain.commands).toEqual(['pressureRestrain']);
    expect(REGISTRY.airMend.commands).toEqual(['airMend']);
    expect(NON_CHALLENGE_COMMANDS).toEqual(expect.arrayContaining(PRESSURE_COMMANDS.filter((c) => c !== 'pressureRestrain' && c !== 'airMend')));
    expect(DEBUG_SHIP.pressure.filter(([l]) => /^Pressure [A-E]:/.test(l)).length).toBe(5);
    expect(session('pressure_demo').ship.untouched).toBe(true);
  });

  it('every phase\'s approved snapshot has no pressure in play', () => {
    const baselines = import.meta.glob('/tests/regression/baselines/phase-*.json', { eager: true, import: 'default' });
    expect(Object.keys(baselines).length).toBe(17);
    for (const [file, snap] of Object.entries(baselines)) expect([file, snap.gameplay.systems.ship.pressure]).toEqual([file, { subjects: [], on: [], pending: [] }]);
  });

  it('the Stability commands play exactly as before: same numbers, same state, no pressure state, no notices, no gas, no damage', async () => {
    const steps = [
      { stability: 'set', pressure: 10 }, { stability: 'trigger', id: 'laughed_at' }, { stability: 'trigger', id: 'flutter_big', quiet: true },
      { stability: 'calm', id: 'reframe' }, { stability: 'meter', show: 'show' }, { stability: 'incident', id: 'debug_flutter' }, { hazardClock: 30 },
      { stability: 'secure' }, { stability: 'anger' }, { stability: 'anger', on: false }, { stability: 'recover' }, { stability: 'trigger', id: 'insulted' },
      { stability: 'settle' }, { stability: 'set', pressure: 97 },
    ];
    const s = makeStory({ preset: 'p17_complete' });
    const notes = noticesOf(s.bus);
    const seen = [];
    s.bus.on('stability:changed', (e) => seen.push([e.kind, e.from ?? null, e.to ?? null, e.state ?? null]));
    await s.run(steps);
    // The same story path, by hand on a bare session through the Stability rules alone.
    expect(seen).toEqual([
      ['set', 0, 10, 'CALM'], ['trigger', 10, 35, 'BASHFUL'], ['trigger', 35, 60, 'EMBARRASSED'], ['calm', 60, 32, 'BASHFUL'], ['meter', null, null, null],
      ['incident', 32, 32, 'BASHFUL'], ['secure', null, null, null], ['anger', 32, 32, 'ANGRY'], ['anger', 32, 32, 'BASHFUL'], ['recover', 32, 32, 'RECOVERING'],
      ['trigger', 32, 55, 'RECOVERING'], ['settle', 55, 10, 'CALM'], ['set', 10, 97, 'CRITICAL'],
    ]);
    expect(s.session.ship.pressure.untouched).toBe(true);
    expect(s.session.ship.untouched).toBe(true);
    expect(notes.filter((n) => n.key.startsWith('pressure:'))).toEqual([]);
  });

  it('the legacy fume scenes and Garrick\'s own story steps produce no pressure, no gas and no damage', async () => {
    const s = makeStory({ preset: 'p17_complete' });
    await s.run([{ atmosphere: 'FIRE_WAFT' }, { fumeCloud: 'fx_cloud', level: 'dense', x: 4, y: 4, w: 3, h: 3 }, { fumeCloud: 'fx_cloud', remove: true }, { setValue: 'garrick_release', value: 'rumbling' }, { hazardClock: 10 }]);
    expect(s.session.ship.untouched).toBe(true);
    expect(s.session.ship.pressure.serialize()).toEqual({ subjects: {} });
  });
});
