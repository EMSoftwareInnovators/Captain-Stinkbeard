import { describe, it, expect, vi } from 'vitest';

// The Journal's words are measured with the game's own font (no Phaser in Node).
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
import { captureCheckpoint, restoreCheckpoint, diffStates, isEmptyDiff, CHECKPOINT_DOMAINS } from '../src/systems/challenge/checkpoint.js';
import { challengeConfig, challengeProblems, configRules } from '../src/systems/challenge/config.js';
import { ChallengeRun } from '../src/systems/challenge/runner.js';
import { COMMAND_SCHEMAS } from '../src/systems/script/commandSchemas.js';
import { ScriptRunner, CommandRegistry } from '../src/systems/script/ScriptRunner.js';
import { createCommandImplementations, repairPlan } from '../src/systems/script/commands.js';
import { shipTuning } from '../src/systems/ship/integrity.js';
import { timingBarSettings, MIN_ZONE } from '../src/systems/timingBar.js';
import { barZone, barCondition, barBase, effectNote } from '../src/systems/ship/supplyResponse.js';
import { responseOptions, actionSeconds, hasResponse } from '../src/systems/ship/response.js';
import { captainFactors } from '../src/systems/ship/airResponse.js';
import { logAvailable } from '../src/systems/logs/logbook.js';
import {
  ledgerDataProblems,
  consequenceTuning,
  consequenceIds,
  consequenceDef,
  methodIds,
  methodBill,
  ledgerLimits,
  levelModifiers,
  CATEGORIES,
  CONSEQUENCE_TUNING,
} from '../src/systems/consequences/ledger.js';
import { consequenceOptions, journalEntries, consequenceNotice, heldLines, clock } from '../src/systems/consequences/recovery.js';
import { barFeasibility, recoveryResources, ledgerReport, shipBars } from '../src/systems/consequences/safety.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { DEBUG_SHIP } from '../src/debug/shipDebug.js';
import { buildFonts } from '../src/art/font/buildFont.js';
import { wrap, parseMarkup, measure } from '../src/ui/text.js';
import { TOAST_TEXT_WIDTH } from '../src/ui/Toasts.js';
import { NON_CHALLENGE_COMMANDS } from './regression/harness.js';
import { CHALLENGE_KINDS as REGISTRY } from './regression/challenges.js';
import { makeStory, reloadStory } from './storyHarness.js';

/**
 * Persistent consequences, recovery and cross-chapter effects
 * (docs/gameplay-overhaul/15-consequences-and-recovery.md). Deterministic:
 * hazard time is ticked by hand or by the work actions; repairs are the
 * game's own timing bar played by simulated hands; failures go through the
 * real challenge runner, its checkpoints and its decisions. The real shared
 * systems throughout (the ship, the pack, the supplies, saves, the
 * Journal's words). The browser half is e2e/consequences.spec.js. No
 * chapter uses any of it.
 */
const content = loadContent();
const FILES = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' });
const DIFFS = ['deckhand', 'captain', 'brutal'];
const T = (d = 'captain') => consequenceTuning(content, d);
const ST = (d = 'captain') => shipTuning(content, d);

function session(preset = 'consequences_demo') {
  const s = GameSession.newGame({ content, bus: new EventBus(), strictFlags: true });
  applyPresetPlan(s, resolvePreset(content, preset));
  return s;
}
const demo = (opts = {}) => makeStory({ preset: 'consequences_demo', ...opts });
const ledger = (s) => (s.session ?? s).consequences;
const room = (s, map) => {
  const sess = s.session ?? s;
  sess.location = { ...sess.location, map };
};
const tick = (s, n = 1, d = 'captain') => {
  const sess = s.session ?? s;
  for (let i = 0; i < n; i++) sess.tickHazards(ST(d));
};
const scenario = (letter) => DEBUG_SHIP.consequences.find(([label]) => label.startsWith(`Consequences ${letter}:`))[1];
/** A ship repair carrying the debug-only demo outcome table (the demo's own repairs do). */
const demoRepair = (section, id, extra = {}) => ({ shipRepair: section, anywhere: true, challenge: { profile: 'ship_repair', id, consequences: 'demo_repair' }, ...extra });
const plain = (t) => parseMarkup(String(t).replace(/\{[^{}]+\}/g, 'XXXXXXXX')).text;
const held = (s) => Object.fromEntries(ledger(s).list().map((e) => [e.id, e.state === 'contained' ? 'contained' : e.level]));
const lastZone = (s) => s.challengeAttempts.at(-1).bar.zone;
const has = (s, id) => (s.session ?? s).inventory.count(id);

/** The loaded content with only the ledger's data changed (the rest read through; no rebuild per case). */
const withLedger = (change) => {
  const data = structuredClone(FILES['/data/consequences/ledger.json']);
  change(data);
  const db = Object.create(content);
  db.consequences = data;
  return db;
};
const dataProblems = (change) => ledgerDataProblems(withLedger(change)).join('\n');
/** A session on an overlay content (the ledger's data changed). */
const sessionOn = (db) => {
  const s = GameSession.newGame({ content: db, bus: new EventBus(), strictFlags: true });
  applyPresetPlan(s, resolvePreset(content, 'consequences_demo'));
  return s;
};

/** One content validation for many fixture scripts (and optional data changes): the errors of each script, by name. */
function fixtureErrors(scripts, { change = null, debug = false } = {}) {
  const files = structuredClone(FILES);
  files['/data/story/cutscenes/zz_consequence_fixtures.json'] = Object.fromEntries(Object.entries(scripts).map(([k, v]) => [`zz.cq_${k}`, v]));
  change?.(files);
  const errors = validateContent(new ContentDB(files), { debug }).errors;
  const out = { _all: errors };
  for (const k of Object.keys(scripts)) out[k] = errors.filter((e) => e.includes(`(zz.cq_${k})`)).join('\n');
  return out;
}

/** A headless script runner for the runner-level tests (no world, no dialogue). */
function headless(sess) {
  const runner = new ScriptRunner({ registry: new CommandRegistry().registerAll(createCommandImplementations()), getScript: (id) => content.scripts.get(id) });
  const notices = [];
  const ctx = { session: sess, bus: sess.bus, content, services: { ui: { notify: async (n) => notices.push(n) } }, wait: async () => {}, challengePrefs: () => ({ difficulty: 'captain' }) };
  ctx.runner = runner;
  return { runner, ctx, notices };
}

// ---------------------------------------------------------------------------------------------
describe('1. the data: definitions, methods, tables, the difficulty table', () => {
  it('validates; a small set of complete definitions: every penalty can be put right fairly or ends, every advantage ends, narratives may stand', () => {
    expect(ledgerDataProblems(content)).toEqual([]);
    expect(validateContent(content).errors.filter((e) => /consequence/i.test(e))).toEqual([]);
    const ids = consequenceIds(content);
    expect(ids).toEqual(['shaken', 'exhausted', 'poorly_prepared', 'fouled_pump', 'well_prepared', 'in_the_groove', 'crew_doubts', 'pressed_on']);
    const by = (k) => ids.filter((id) => consequenceDef(content, id).kind === k);
    expect([by('negative').length, by('positive').length, by('narrative').length]).toEqual([4, 2, 2]);
    // Seven categories are supported; six have a definition (resources: the stores own the counts, a chapter will add one).
    expect(CATEGORIES).toEqual(['condition', 'preparation', 'shipboard', 'resources', 'crew', 'tactical', 'narrative']);
    expect(new Set(ids.map((id) => consequenceDef(content, id).category)).size).toBe(6);
    // Every modifier the ledger knows has a real user.
    const used = new Set(ids.flatMap((id) => consequenceDef(content, id).levels.flatMap((l) => Object.keys(l).filter((k) => k !== 'label'))));
    expect([...used].sort()).toEqual(['costAdd', 'repair', 'response', 'work', 'zone']);
    expect(methodIds(content)).toEqual(['rest', 'meal', 'sort_kit', 'clear_pump', 'lay_out']);
    expect(content.consequences.tables.demo_repair.debugOnly).toBe(true);
  });

  it('the validator rejects what the brief lists: unknown ids, bad severities, unsupported effects, bad durations, contradictory stacking, missing or impossible recovery, bad references, unwinnable modifiers', () => {
    const cases = [
      [(d) => { d.definitions.shaken.category = 'mood'; }, /unknown category "mood"/],
      [(d) => { d.definitions.shaken.levels[0].luck = 2; }, /unsupported effect "luck"/],
      [(d) => { d.definitions.shaken.max = 4; }, /max must be a level it has/],
      [(d) => { d.definitions.shaken.expires = { seconds: -30 }; }, /expires.seconds must be a whole number/],
      [(d) => { d.definitions.in_the_groove.stacking = 'add'; }, /an advantage never adds up/],
      [(d) => { d.definitions.fouled_pump.stacking = 'refresh'; }, /has no clock to start again/],
      [(d) => { d.definitions.pressed_on.stacking = 'replace'; }, /needs more than one level/],
      [(d) => { d.definitions.fouled_pump.recovery = []; }, /missing recovery information/],
      [(d) => { d.definitions.exhausted.recovery = [{ method: 'sort_kit' }]; delete d.definitions.exhausted.expires; }, /recovery would be impossible/],
      [(d) => { d.methods.sort_kit.cost = [{ item: 'unicorn', count: 1 }]; }, /unknown item "unicorn"/],
      [(d) => { d.methods.rest.room = 'the_moon'; }, /unknown room "the_moon"/],
      [(d) => { d.methods.clear_pump.room = 'galley'; }, /the station "bilge_pump" is in cargo_hold, not galley/],
      [(d) => { d.definitions.shaken.levels[0].zone = 3; }, /is a bonus, but "shaken" is negative/],
      [(d) => { d.definitions.shaken.levels[2].zone = -9; }, /zone -9 is outside its bounds/],
      [(d) => { d.definitions.well_prepared.opposes = []; }, /opposes "well_prepared", but "well_prepared" doesn't oppose it/],
      [(d) => { d.definitions.shaken.visibility = 'hidden'; }, /must be shown/],
      [(d) => { d.definitions.exhausted.permanent = true; }, /only a narrative decision is permanent/],
      [(d) => { d.definitions.shaken.expires.uses = 2; }, /only an advantage is used up/],
      [(d) => { d.definitions.in_the_groove.expires = {}; }, /no indefinite advantage/],
      [(d) => { d.definitions.shaken.affectsChallenges = false; }, /affectsChallenges must be true/],
      [(d) => { d.tables.demo_repair.failure = [{ id: 'well_prepared' }]; }, /an advantage; a failure can't earn one/],
      [(d) => { d.tables.demo_repair.success = [{ id: 'ghost' }]; }, /unknown consequence "ghost"/],
      [(d) => { d.tables.demo_repair.retry = [{ id: 'shaken', severity: 5 }]; }, /severity must be a whole number 1 to 3/],
      [(d) => { d.tables.demo_repair.later = []; }, /unknown outcome "later"/],
      [(d) => { d.limits.condition = [2, 6]; }, /limits.condition/],
      [(d) => { d.journal.log = 'nowhere'; }, /unknown logbook "nowhere"/],
    ];
    for (const [change, msg] of cases) expect(dataProblems(change), String(msg)).toMatch(msg);
  });

  it('the difficulty table: one bounded block per preset, read in exactly two places (creation; offering a recovery)', () => {
    expect(DIFFS.map((d) => T(d))).toEqual([
      { strength: 0.6, duration: 0.6, cap: -1, actionCost: 0.5, actionTime: 0.75 },
      { strength: 1, duration: 1, cap: 0, actionCost: 1, actionTime: 1 },
      { strength: 1.35, duration: 1.5, cap: 1, actionCost: 1.5, actionTime: 1.25 },
    ]);
    expect(Object.keys(CONSEQUENCE_TUNING)).toEqual(['strength', 'duration', 'cap', 'actionCost', 'actionTime']);
    const db = Object.create(content);
    const presets = new Map(content.difficulties.map);
    presets.set('brutal', { ...presets.get('brutal'), consequences: { strength: 3, mood: 1, cap: 0.5 } });
    db.difficulties = { get: (id) => presets.get(id), ids: () => [...presets.keys()], map: presets };
    const msgs = ledgerDataProblems(db).join('\n');
    expect(msgs).toMatch(/strength must be from 0.5 to 1.5/);
    expect(msgs).toMatch(/"mood" is not a consequence tuning/);
    expect(msgs).toMatch(/cap is a whole number/);
    // Clamped when read anyway.
    expect(consequenceTuning(db, 'brutal').strength).toBe(1.5);
  });
});

// ---------------------------------------------------------------------------------------------
describe('2. the ledger itself', () => {
  it('starts empty and untouched: a new game, the demo preset, the end of the campaign', () => {
    for (const p of ['prologue_done', 'p9_complete', 'p17_complete', 'consequences_demo']) {
      const s = session(p);
      expect([p, s.consequences.untouched, s.consequences.entries.size, s.consequences.history.length, s.consequences.active]).toEqual([p, true, 0, 0, false]);
    }
    expect(session().serialize().consequences).toEqual({ on: false, serial: 0, entries: [], history: [], events: [], counts: {}, marks: {} });
  });

  it('creates, changes, ends and remembers: one entry per consequence, its severity within 1 and its cap, active apart from history', () => {
    const s = session();
    const L = s.consequences;
    const r = L.apply({ id: 'shaken', source: { kind: 'event', id: 'test' }, tuning: T() });
    expect(r).toMatchObject({ ok: true, op: 'applied', id: 'shaken', level: 1, from: 0, cap: 2 });
    expect(L.held('shaken')).toMatchObject({ id: 'shaken', n: 1, level: 1, state: 'active', k: 1, cap: 2, span: 300, left: 300, miles: null, uses: null, source: { kind: 'event', id: 'test' }, times: 1, peak: 1, noted: false });
    expect([L.state('shaken'), L.level('shaken'), L.ever('shaken'), L.times('shaken')]).toEqual(['active', 1, true, 1]);
    expect(L.setSeverity('shaken', { to: 2 })).toMatchObject({ ok: true, op: 'worsened', level: 2 });
    expect(L.setSeverity('shaken', { by: 5 })).toMatchObject({ ok: true, op: 'kept', level: 2 });
    expect(L.setSeverity('shaken', { to: 0 })).toMatchObject({ ok: false });
    expect(L.setSeverity('shaken', { by: -1 })).toMatchObject({ ok: true, op: 'eased', level: 1 });
    expect(L.setSeverity('ghost', { to: 1 })).toMatchObject({ ok: false, reason: 'not held' });
    expect(L.recover('shaken', 'rest')).toMatchObject({ ok: true, op: 'recovered', how: 'rest' });
    expect([L.held('shaken'), L.state('shaken'), L.level('shaken'), L.ever('shaken')]).toEqual([null, 'recovered', 0, true]);
    expect(L.history).toEqual([expect.objectContaining({ id: 'shaken', n: 1, level: 1, peak: 2, state: 'recovered', how: 'rest' })]);
    L.apply({ id: 'crew_doubts', tuning: T() });
    expect(L.resolve('crew_doubts')).toMatchObject({ ok: true, op: 'resolved', how: 'cleared' });
    expect([L.state('crew_doubts'), L.state('pressed_on')]).toEqual(['resolved', 'none']);
    expect(L.recover('crew_doubts')).toMatchObject({ ok: false, reason: 'not held' });
  });

  it('refuses unknown ids and bad severities, changing nothing', () => {
    const s = session();
    const before = JSON.stringify(s.consequences.serialize());
    for (const req of [{ id: 'ghost' }, { id: 'shaken', severity: 0 }, { id: 'shaken', severity: 4 }, { id: 'shaken', severity: 1.5 }, { id: 'pressed_on', severity: 2 }]) {
      expect(s.consequences.apply({ ...req, tuning: T() }).ok, JSON.stringify(req)).toBe(false);
    }
    expect(JSON.stringify(s.consequences.serialize())).toBe(before);
  });

  it('stacking: add to the cap (then capped), replace with greater, refresh, none (kept), reject (refused); a contained one flares', () => {
    const s = session();
    const L = s.consequences;
    const ops = [];
    for (let i = 0; i < 3; i++) ops.push(L.apply({ id: 'shaken', tuning: T() }).op);
    expect([ops, L.level('shaken')]).toEqual([['applied', 'worsened', 'capped'], 2]);
    tick(s, 100);
    L.apply({ id: 'shaken', tuning: T() });
    expect(L.held('shaken').left).toBe(300);
    // replace: Short of Kit (Captain's cap is 1, so the greater can't take hold here); Brutal's cap is 2.
    expect(L.apply({ id: 'poorly_prepared', tuning: T('brutal') }).level).toBe(1);
    expect(L.apply({ id: 'poorly_prepared', severity: 1, tuning: T() }).op).toBe('kept');
    expect(L.apply({ id: 'poorly_prepared', severity: 2, tuning: T() })).toMatchObject({ op: 'worsened', level: 2 });
    // refresh: the clock and the uses start again; the level stays.
    L.apply({ id: 'well_prepared', tuning: T() });
    L.useUp('zone');
    expect(L.held('well_prepared').uses).toBe(1);
    expect(L.apply({ id: 'well_prepared', tuning: T() }).op).toBe('refreshed');
    expect(L.held('well_prepared').uses).toBe(2);
    // none: a decision stands (kept); once: never again after it has ended.
    expect(L.apply({ id: 'pressed_on', tuning: T() }).op).toBe('applied');
    expect(L.apply({ id: 'pressed_on', tuning: T() }).op).toBe('kept');
    // reject and escalate, on definitions made for the test.
    const db = withLedger((d) => {
      d.definitions.test_reject = { ...structuredClone(d.definitions.in_the_groove), stacking: 'reject' };
      d.definitions.test_escalate = { ...structuredClone(d.definitions.shaken), recur: 'escalate' };
    });
    const t = sessionOn(db);
    expect(t.consequences.apply({ id: 'test_reject', tuning: T() }).op).toBe('applied');
    expect(t.consequences.apply({ id: 'test_reject', tuning: T() })).toMatchObject({ ok: false, reason: 'already held' });
    t.consequences.apply({ id: 'test_escalate', tuning: T() });
    t.consequences.recover('test_escalate');
    expect(t.consequences.apply({ id: 'test_escalate', tuning: T() }).level).toBe(2);
    // contained: no effect, still held; another blow brings it back.
    L.contain('shaken');
    L.contain('shaken');
    expect([L.held('shaken').state, L.level('shaken'), L.entryModifiers(L.held('shaken'))]).toEqual(['contained', 0, {}]);
    expect(L.apply({ id: 'shaken', tuning: T() })).toMatchObject({ op: 'flared', level: 1 });
  });

  it('opposites end each other; "once" never comes back; the difficulty is read only when an entry is created', () => {
    const s = session();
    const L = s.consequences;
    L.apply({ id: 'poorly_prepared', tuning: T() });
    const r = L.apply({ id: 'well_prepared', tuning: T() });
    expect([r.superseded, L.held('poorly_prepared'), L.lastEnded('poorly_prepared').how]).toEqual([['poorly_prepared'], null, 'superseded']);
    L.apply({ id: 'pressed_on', tuning: T() });
    L.resolve('pressed_on');
    expect(L.apply({ id: 'pressed_on', tuning: T() })).toMatchObject({ ok: false, reason: 'once' });
    // Created on Brutal: its strength, cap and full duration stay Brutal's when it stacks on Captain, and after a reload.
    L.apply({ id: 'shaken', tuning: T('brutal') });
    expect(L.held('shaken')).toMatchObject({ k: 1.35, cap: 3, span: 450, left: 450 });
    L.apply({ id: 'shaken', tuning: T('deckhand') });
    L.apply({ id: 'shaken', tuning: T() });
    expect(L.held('shaken')).toMatchObject({ level: 3, k: 1.35, cap: 3, span: 450 });
    expect(L.entryModifiers(L.held('shaken')).zone).toBe(-6);
  });

  it('event ids: an application lands once however often its callback fires; without one it lands every time; the memory is bounded', () => {
    const s = session();
    const L = s.consequences;
    expect(L.apply({ id: 'shaken', eventId: 'storm:1', tuning: T() }).ok).toBe(true);
    expect(L.apply({ id: 'shaken', eventId: 'storm:1', tuning: T() })).toMatchObject({ ok: false, reason: 'duplicate event' });
    expect(L.level('shaken')).toBe(1);
    L.apply({ id: 'shaken', tuning: T() });
    expect(L.level('shaken')).toBe(2);
    for (let i = 0; i < 200; i++) L.apply({ id: 'crew_doubts', eventId: `e${i}`, tuning: T() });
    expect(L.seen.size).toBe(ledgerLimits(content).events);
    expect(L.serialize().events.length).toBe(128);
  });

  it('what ended is remembered apart from what is held, and only so much (24)', () => {
    const s = session();
    const L = s.consequences;
    for (let i = 0; i < 40; i++) {
      L.apply({ id: 'crew_doubts', tuning: T() });
      L.resolve('crew_doubts', 'cleared');
    }
    L.apply({ id: 'shaken', tuning: T() });
    expect([L.history.length, L.entries.size, L.times('crew_doubts'), L.serial]).toEqual([24, 1, 40, 41]);
    expect(L.history.at(-1).n).toBe(40);
  });
});

// ---------------------------------------------------------------------------------------------
describe('3. real modifiers, through the paths the systems already resolve them', () => {
  it('a penalty and an advantage change the next ship bar\'s green measurably (Rattled -3, -4; Ready +3), flat, before any assist', async () => {
    const s = demo();
    await s.run([{ shipDamage: ['hull_port', 'hull_starboard', 'deck'], amount: 50, category: 'impact', scale: false, announce: false }]);
    s.playHands('perfect');
    await s.run([{ shipRepair: 'hull_port', anywhere: true }]);
    expect(lastZone(s)).toBe(26);
    await s.run([{ consequence: 'shaken' }]);
    s.playHands('perfect');
    await s.run([{ shipRepair: 'hull_starboard', anywhere: true }]);
    expect(lastZone(s)).toBe(23);
    await s.run([{ consequence: 'shaken' }]);
    expect(barCondition(s.session).zone).toBe(-4);
    await s.run([{ consequenceResolve: 'shaken', authorized: true, announce: false }, { consequence: 'well_prepared' }]);
    s.playHands('perfect');
    await s.run([{ shipRepair: 'deck', anywhere: true }]);
    expect(lastZone(s)).toBe(29);
  });

  it('an advantage is used up once per bar it helps (a Try again gives the use back with the checkpoint), then ends', async () => {
    const s = demo();
    await s.run([{ shipDamage: ['hull_port', 'hull_starboard', 'deck'], amount: 50, category: 'impact', scale: false, announce: false }, { consequence: 'well_prepared' }]);
    s.playHands('fumble', 'perfect');
    s.decideChallenges('retry');
    await s.run([{ shipRepair: 'hull_port', anywhere: true }]);
    expect(s.challengeAttempts.slice(-2).map((a) => a.bar.zone)).toEqual([29, 29]);
    expect(ledger(s).held('well_prepared').uses).toBe(1);
    s.playHands('perfect', 'perfect');
    await s.run([{ shipRepair: 'hull_starboard', anywhere: true }, { shipRepair: 'deck', anywhere: true }]);
    expect(s.challengeAttempts.slice(-2).map((a) => a.bar.zone)).toEqual([29, 26]);
    expect([ledger(s).held('well_prepared'), ledger(s).lastEnded('well_prepared').how]).toEqual([null, 'used up']);
  });

  it('work: Bone-Tired makes every job longer (one place: the captain\'s factors), In the Groove quicker; together they multiply', async () => {
    const s = session();
    room(s, 'cargo_hold');
    s.ship.hazards.addWater('cargo_hold', 30);
    const base = actionSeconds(s, 'cargo_hold', 'pump');
    s.consequences.apply({ id: 'exhausted', tuning: T() });
    expect([captainFactors(s).work, base, actionSeconds(s, 'cargo_hold', 'pump')]).toEqual([1.2, 6, 7]);
    s.consequences.apply({ id: 'in_the_groove', tuning: T() });
    expect(captainFactors(s).work).toBeCloseTo(1.02, 5);
    s.consequences.apply({ id: 'exhausted', tuning: T() });
    // Combined in hundredths (deterministic): 1.35 x 0.85.
    expect(captainFactors(s).work).toBe(1.15);
  });

  it('repairs: In the Groove restores more; Short of Kit adds to the bill (and, scattered on Brutal, restores less)', async () => {
    const run = async (setup, d = 'captain') => {
      const s = demo({ prefs: { difficulty: d } });
      await s.run([{ shipDamage: 'hull_port', amount: 60, category: 'impact', scale: false, announce: false }, ...setup]);
      const plan = repairPlan(s.session, 'hull_port', { difficulty: d, anywhere: true });
      const hp = s.session.ship.section('hull_port').hp;
      const planks = has(s, 'planks');
      s.playHands('perfect');
      await s.run([{ shipRepair: 'hull_port', anywhere: true }]);
      return { cost: plan.repair.cost, restored: s.session.ship.section('hull_port').hp - hp, planks: planks - has(s, 'planks') };
    };
    expect(await run([])).toEqual({ cost: [{ item: 'planks', count: 2 }, { item: 'nails', count: 2 }], restored: 35, planks: 2 });
    expect((await run([{ consequence: 'in_the_groove' }])).restored).toBe(39);
    expect(await run([{ consequence: 'poorly_prepared' }])).toEqual({ cost: [{ item: 'planks', count: 3 }, { item: 'nails', count: 2 }], restored: 35, planks: 3 });
    // Brutal: the bill is the difficulty's (3 planks), Short of Kit adds after it, never scaled again; scattered, it holds less.
    expect(await run([{ consequence: 'poorly_prepared', severity: 2 }], 'brutal')).toEqual({ cost: [{ item: 'planks', count: 5 }, { item: 'nails', count: 3 }], restored: 24, planks: 5 });
  });

  it('pumping: a Fouled Pump shifts less water per pump (the difficulty\'s response first, then the ledger, once)', async () => {
    // All the water the bilge pump drains (it draws from the deepest of them, and the water finds its level meanwhile).
    const total = (s) => ['cargo_hold', 'treasure_hold', 'fart_free_zone'].reduce((n, r) => n + s.session.ship.hazards.waterIn(r).units, 0);
    const pumped = async (setup) => {
      const s = demo();
      room(s, 'cargo_hold');
      await s.run([{ flood: 'cargo_hold', amount: 60 }, ...setup]);
      const before = total(s);
      await s.run([{ hazardAction: 'pump' }]);
      return Math.round(before - total(s));
    };
    const clean = await pumped([]);
    const fouled = await pumped([{ consequence: 'fouled_pump', announce: false }]);
    expect([clean, fouled]).toEqual([24, 18]);
  });

  it('precedence: base, difficulty, the challenge, the leader\'s stat (equipment), then the captain\'s condition (food and consequences together, bounded), then assists', () => {
    const challenge = { strict: true, mechanics: { zoneAdd: -6 } };
    const assist = { timing: { zoneAdd: 8, speedScale: 0.8 } };
    const base = timingBarSettings({ zone: 26, challenge, bonus: 0.3, assist: null });
    expect(base.zone).toBe(Math.round(20 * 1.3));
    // The condition is flat: never scaled by the stat; the assist comes after it, untouched by it.
    expect(timingBarSettings({ zone: 26, challenge, bonus: 0.3, condition: { zone: -4 }, assist: null }).zone).toBe(26 - 4);
    expect(timingBarSettings({ zone: 26, challenge, bonus: 0.3, condition: { zone: -4 }, assist }).zone).toBe(26 - 4 + 8);
    expect(timingBarSettings({ zone: 12, challenge, bonus: -0.25, condition: { zone: -6 }, assist: null }).zone).toBe(MIN_ZONE);
    // Food and the ledger are bounded together.
    const s = session();
    s.ship.supplies.on = true;
    s.ship.supplies.applyEffect('steady_hands');
    s.consequences.apply({ id: 'well_prepared', tuning: T() });
    expect([s.ship.supplies.factor('zone'), s.consequences.factor('zone'), barCondition(s).zone, barZone(s)]).toEqual([4, 3, 6, 32]);
    s.ship.supplies.removeEffect('steady_hands');
    s.ship.supplies.applyEffect('grog_ward');
    s.consequences.recover('well_prepared');
    s.consequences.apply({ id: 'shaken', tuning: T('brutal') });
    s.consequences.apply({ id: 'shaken', tuning: T('brutal') });
    expect([s.ship.supplies.factor('zone'), s.consequences.factor('zone'), barCondition(s).zone]).toEqual([-4, -5, -6]);
  });

  it('difficulty scales a penalty once: Deckhand milder and shorter, Brutal harsher and longer with a higher cap', () => {
    const rows = DIFFS.map((d) => {
      const s = session();
      const L = s.consequences;
      for (let i = 0; i < 3; i++) L.apply({ id: 'shaken', tuning: T(d) });
      L.apply({ id: 'exhausted', tuning: T(d) });
      return [d, L.level('shaken'), L.modifiers().zone, L.held('shaken').span, L.modifiers().work];
    });
    expect(rows).toEqual([['deckhand', 1, -2, 180, 1.12], ['captain', 2, -4, 300, 1.2], ['brutal', 3, -6, 450, 1.27]]);
    // An advantage is the same on every difficulty.
    for (const d of DIFFS) {
      const s = session();
      s.consequences.apply({ id: 'well_prepared', tuning: T(d) });
      expect([d, s.consequences.factor('zone'), s.consequences.held('well_prepared').span]).toEqual([d, 3, 360]);
    }
    // The bar on each difficulty: its own green, then the penalty, flat.
    expect(levelModifiers(consequenceDef(content, 'shaken'), 1, T('brutal').strength)).toEqual({ zone: -4 });
  });

  it('expiry runs on the shared hazard clock only: scripts, scenes and menus don\'t count; it ends by itself at 0', async () => {
    const s = demo();
    await s.run([{ consequence: 'shaken' }, { say: 'Not a second passes in a scene.' }]);
    expect([ledger(s).held('shaken').left, s.session.hazardsActive]).toEqual([300, true]);
    await s.run([{ hazardClock: 299 }]);
    expect(ledger(s).held('shaken').left).toBe(1);
    await s.run([{ hazardClock: 1 }]);
    expect([ledger(s).held('shaken'), ledger(s).lastEnded('shaken')]).toEqual([null, expect.objectContaining({ state: 'resolved', how: 'expired' })]);
    expect(s.session.hazardsActive).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------
describe('4. challenge outcomes: each way of ending leaves its own, once, and the record agrees', () => {
  const setup = async (d = 'captain') => {
    const s = demo({ prefs: { difficulty: d } });
    await s.run([{ shipDamage: ['hull_port', 'hull_starboard'], amount: 50, category: 'impact', scale: false, announce: false }]);
    return s;
  };

  it('success: an advantage earned (In the Groove), once; the record lists what the ledger did', async () => {
    const s = await setup();
    s.playHands('perfect');
    await s.run([demoRepair('hull_port', 'cq_win')]);
    const rec = s.challengeRecords.at(-1);
    expect(rec.outcome).toBe('success');
    expect(rec.consequences.ledger).toEqual([{ id: 'in_the_groove', op: 'applied', level: 1, scope: 'cq_win:onSuccess' }]);
    expect(rec.consequences.applied).toContain('onSuccess');
    expect(held(s)).toEqual({ in_the_groove: 1 });
    expect(ledger(s).held('in_the_groove').source).toEqual({ kind: 'challenge', id: 'cq_win', chapter: null, outcome: 'success' });
    expect(rec.transitions.consequences).toEqual({ in_the_groove: [null, 1] });
  });

  it('partial: Short of Kit', async () => {
    const s = await setup();
    s.playHands({ fumbles: 1 });
    await s.run([demoRepair('hull_port', 'cq_rough')]);
    expect([s.challengeRecords.at(-1).outcome, held(s)]).toEqual(['partial', { poorly_prepared: 1 }]);
  });

  it('a failure carried on: the failed attempt\'s Rattled Hands stays, and carrying on adds Crew Doubts', async () => {
    const s = await setup();
    s.playHands('fumble');
    s.decideChallenges('continue');
    await s.run([demoRepair('hull_port', 'cq_botch')]);
    const rec = s.challengeRecords.at(-1);
    expect([rec.outcome, rec.decision]).toEqual(['failure', 'continue']);
    expect(rec.consequences.ledger.map((x) => [x.id, x.op, x.scope])).toEqual([['shaken', 'applied', 'cq_botch:failed:1'], ['crew_doubts', 'applied', 'cq_botch:onFailure']]);
    expect(held(s)).toEqual({ shaken: 1, crew_doubts: 1 });
    expect(ledger(s).held('crew_doubts').source.outcome).toBe('accept');
  });

  it('fail, Try again, win: the failed attempt\'s penalty goes back with the checkpoint, Try again\'s own stays, the cost stays, the win\'s advantage lands', async () => {
    const s = await setup();
    const nails = has(s, 'nails');
    s.playHands('fumble', 'perfect');
    s.decideChallenges('retry');
    await s.run([demoRepair('hull_port', 'cq_retry')]);
    expect(held(s)).toEqual({ exhausted: 1, in_the_groove: 1 });
    expect(ledger(s).lastEnded('shaken')).toBe(null);
    // One failure's waste (a nail) is kept; the success's bill is paid.
    expect(nails - has(s, 'nails')).toBe(1 + 2);
    const rec = s.challengeRecords.at(-1);
    // The record agrees with the ledger: what the retry's restore undid is marked so.
    expect(rec.consequences.ledger.map((x) => `${x.id}:${x.op}:${x.scope}${x.undone ? ':undone' : ''}`)).toEqual(['shaken:applied:cq_retry:failed:1:undone', 'exhausted:applied:cq_retry:retry:1', 'in_the_groove:applied:cq_retry:onSuccess']);
  });

  it('repeated failure: Try again\'s penalty builds to its cap (Captain 2, Brutal 3), never a duplicate entry; the last failure\'s stays if carried on', async () => {
    for (const [d, cap] of [['captain', 2], ['brutal', 3]]) {
      const s = await setup(d);
      s.session.inventory.add('nails', 20);
      s.session.inventory.add('planks', 10);
      s.playHands('fumble', 'fumble', 'fumble', 'fumble');
      s.decideChallenges('retry', 'retry', 'retry', 'continue');
      await s.run([demoRepair('hull_port', `cq_again_${d}`)]);
      const L = ledger(s);
      expect([d, L.entries.size, L.level('exhausted'), L.level('shaken'), L.level('crew_doubts')]).toEqual([d, 3, cap, 1, 1]);
      expect([d, L.times('exhausted')]).toEqual([d, 3]);
      // A second botch stacks the penalty a failure leaves.
      s.playHands('fumble');
      s.decideChallenges('continue');
      await s.run([demoRepair('hull_starboard', `cq_again2_${d}`)]);
      expect([d, L.level('shaken'), L.entries.size]).toEqual([d, 2, 3]);
      // A rest still puts it all right.
      room(s, 'crew_quarters');
      await s.run([{ consequenceRecover: 'rest' }]);
      expect([d, L.level('shaken'), L.level('exhausted')]).toEqual([d, 0, 0]);
    }
  });

  it('a doubled callback can\'t apply anything twice: the same list run again in the same scope lands nothing', async () => {
    const sess = session();
    const { runner, ctx } = headless(sess);
    const cfg = challengeConfig(content, { profile: 'ship_repair', id: 'cq_dup', consequences: 'demo_repair' }, { kind: 'repair' });
    const run = new ChallengeRun({ session: sess, config: cfg, content });
    run.begin();
    const hooks = { runSteps: (steps, meta) => runner.run(steps, { ...ctx, challenge: run.record, eventScope: `${run.id}:${meta.scope}` }) };
    run.finish({ completed: true, fumbles: 0, accuracy: 100 });
    await run.settleSuccess(hooks);
    await run.settleSuccess(hooks);
    await run.accept(hooks);
    await run.accept(hooks);
    expect(run.record.consequences.ledger.map((x) => x.op)).toEqual(['applied', 'duplicate', 'applied', 'duplicate']);
    expect([sess.consequences.times('in_the_groove'), sess.consequences.times('crew_doubts')]).toEqual([1, 1]);
    run.close();
    // A run that has closed can't leave anything more behind (a stale callback).
    await runner.run([{ consequence: 'shaken' }], { ...ctx, challenge: run.record, eventScope: `${run.id}:late` });
    expect(sess.consequences.held('shaken')).toBe(null);
  });

  it('going back to an earlier checkpoint is a choice too: its own consequences, once (an explicitly chosen alternative)', async () => {
    const s = demo();
    s.playHands('fumble', 'perfect');
    s.decideChallenges('fallback');
    await s.run({
      start: [
        { checkpoint: 'cq_breach', resume: 'breach', label: 'the breach' },
        { goto: 'breach' },
      ],
      breach: [
        { repair: 'hull', strikes: 2, challenge: { failure: true, mechanics: { maxFumbles: 1 }, outcomes: { failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' }, id: 'cq_back', onFailure: { mustRetry: true, fallback: 'cq_breach' }, consequences: { fallback: [{ id: 'pressed_on' }], failure: [{ id: 'shaken' }] } } },
      ],
    });
    expect(s.challengeRecords.map((r) => [r.id, r.decision, r.outcome])).toEqual([['cq_back', 'fallback', 'failure'], ['cq_back', null, 'success']]);
    // The attempt's own penalty went back with the checkpoint; the choice stands.
    expect(held(s)).toEqual({ pressed_on: 1 });
  });

  it('without a table the runner is exactly as before: no lists, no record entries, no ledger change; legacy steps never touch the ledger', async () => {
    const cfg = challengeConfig(content, { profile: 'ship_repair' }, { kind: 'repair' });
    expect([cfg.onSuccess.consequences, cfg.onFailedAttempt.consequences, cfg.onRetry.consequences, cfg.onFallback.consequences, cfg.consequences]).toEqual([[], [], [], [], null]);
    expect(configRules(cfg).ledger).toEqual({ onSuccess: 0, onFailedAttempt: 0, onRetry: 0, onFallback: 0 });
    const s = demo();
    await s.run([{ shipDamage: 'hull_port', amount: 50, category: 'impact', scale: false, announce: false }]);
    s.playHands('fumble', 'perfect');
    s.decideChallenges('retry');
    await s.run([{ shipRepair: 'hull_port', anywhere: true }]);
    s.setRepairScore(1);
    await s.run([{ repair: 'hull', strikes: 3, var: 'cq_legacy' }]);
    expect([s.challengeRecords.at(-1).consequences.ledger, ledger(s).untouched]).toEqual([[], true]);
  });

  it('a completed recovery is not undone by a later retry; a difficulty block can\'t carry consequences (never scaled twice)', async () => {
    const s = await setup();
    await s.run([{ consequence: 'shaken' }]);
    room(s, 'crew_quarters');
    await s.run([{ consequenceRecover: 'rest' }]);
    s.playHands('fumble', 'perfect');
    s.decideChallenges('retry');
    await s.run([{ shipRepair: 'hull_port' }]);
    expect([ledger(s).held('shaken'), ledger(s).lastEnded('shaken').state]).toEqual([null, 'recovered']);
    expect(challengeProblems(content, { profile: 'ship_repair', difficulty: { brutal: { consequences: 'demo_repair' } } }, { kind: 'repair' }).join()).toMatch(/can't change "consequences": the ledger's own difficulty table scales them/);
    expect(challengeProblems(content, { profile: 'ship_repair', onFailure: { costs: [{ consequence: 'well_prepared' }] } }, { kind: 'repair' }).join()).toMatch(/is an advantage; a cost can only take/);
    expect(challengeProblems(content, { profile: 'ship_repair', consequences: 'ghost_table' }, { kind: 'repair' }).join()).toMatch(/unknown outcome table "ghost_table"/);
    expect(challengeProblems(content, { profile: 'ship_repair', consequences: { success: [{ id: 'shaken', severity: 9 }] } }, { kind: 'repair' }).join()).toMatch(/severity must be a whole number/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('5. recovery: real methods, a real cost, never needing what it impairs', () => {
  it('rest: only in the crew quarters, seconds of hazard time (the ship\'s emergencies go on), never slowed by being tired; ends Rattled and Bone-Tired', async () => {
    const s = demo();
    await s.run([{ consequence: 'shaken', severity: 2 }, { consequence: 'exhausted', severity: 2 }, { leak: 'hull_port', severity: 'leak', source: 'test' }]);
    room(s, 'cargo_hold');
    expect(consequenceOptions(s.session).map((o) => o.method)).toEqual([]);
    await s.run([{ consequenceRecover: 'rest', outcomeValue: 'cq_rest' }]);
    expect([s.session.story.getValue('cq_rest'), ledger(s).level('shaken')]).toEqual(['refused', 2]);
    room(s, 'crew_quarters');
    const [opt] = consequenceOptions(s.session);
    expect(opt).toMatchObject({ action: 'recover', method: 'rest', ok: true, seconds: 25, label: 'Rest in a hammock (25s)' });
    expect(hasResponse(s.session)).toBe(true);
    const water = s.session.ship.hazards.waterIn('cargo_hold').exact;
    await s.run([{ consequenceRecover: 'rest' }]);
    expect(s.session.ship.hazards.waterIn('cargo_hold').exact).toBeGreaterThan(water);
    expect(held(s)).toEqual({});
    expect(ledger(s).history.map((h) => [h.id, h.state, h.how])).toEqual([['shaken', 'recovered', 'rest'], ['exhausted', 'recovered', 'rest']]);
    // On Brutal it takes longer (and a fire in the room stops it).
    const b = demo({ prefs: { difficulty: 'brutal' } });
    await b.run([{ consequence: 'shaken' }]);
    room(b, 'crew_quarters');
    expect(consequenceOptions(b.session, { difficulty: 'brutal' })[0].seconds).toBe(19);
    await b.run([{ ignite: 'crew_quarters', intensity: 30, source: 'test' }]);
    expect(consequenceOptions(b.session, { difficulty: 'brutal' })[0]).toMatchObject({ ok: false, reason: 'Not with a fire in here.' });
  });

  it('a hot meal (through the item\'s own effect): eases a level, contains a first level; nothing while the supplies are off', async () => {
    const s = demo();
    await s.run([{ giveItem: 'bean_stew', count: 1, silent: true }, { consequence: 'shaken', severity: 2 }, { consequence: 'exhausted' }, { useSupply: 'bean_stew' }]);
    expect(held(s)).toEqual({ shaken: 2, exhausted: 1 });
    await s.run([{ suppliesSystem: true }, { useSupply: 'bean_stew' }]);
    expect(held(s)).toEqual({ shaken: 1, exhausted: 'contained' });
    expect(plain(s.notices.at(-1).text)).toMatch(/Rattled Hands, Bone-Tired eased\./);
    expect(effectNote(content, [{ type: 'shipEffect', applied: true, effect: 'full_belly', seconds: 240, eased: [{ id: 'shaken' }] }])).toMatch(/Rattled Hands eased/);
  });

  it('maintenance: sorting the kit (a rope and seconds of work, in the hold) ends Short of Kit; clearing the pump (sailcloth) ends a Fouled Pump; refused without the materials', async () => {
    const s = demo();
    await s.run([{ consequence: 'poorly_prepared' }, { consequence: 'fouled_pump' }]);
    room(s, 'crew_quarters');
    expect(consequenceOptions(s.session)).toEqual([]);
    room(s, 'cargo_hold');
    expect(consequenceOptions(s.session).map((o) => [o.method, o.label, o.ok])).toEqual([['sort_kit', 'Sort out the kit (15s, 1 Rope)', true], ['clear_pump', 'Clear the bilge pump (18s, 1 Sailcloth)', true]]);
    const rope = has(s, 'rope');
    await s.run([{ consequenceRecover: 'sort_kit' }]);
    expect([held(s), rope - has(s, 'rope')]).toEqual([{ fouled_pump: 1 }, 1]);
    s.session.inventory.remove('sailcloth', has(s, 'sailcloth'));
    expect(consequenceOptions(s.session)[0]).toMatchObject({ method: 'clear_pump', ok: false, reason: 'Not enough: Sailcloth 0/1.' });
    await s.run([{ consequenceRecover: 'clear_pump', outcomeValue: 'cq_pump' }]);
    expect([s.session.story.getValue('cq_pump'), ledger(s).level('fouled_pump')]).toEqual(['refused', 1]);
    s.session.inventory.add('sailcloth', 1);
    await s.run([{ consequenceRecover: 'clear_pump' }]);
    expect(held(s)).toEqual({});
    // Brutal: dearer and longer; Deckhand: cheaper and quicker. Bone-Tired slows the work (not a rest).
    expect(DIFFS.map((d) => [methodBill(content, 'sort_kit', T(d))[0].count])).toEqual([[1], [1], [2]]);
    await s.run([{ consequence: 'poorly_prepared' }, { consequence: 'exhausted', severity: 2 }]);
    expect(consequenceOptions(s.session)[0].seconds).toBe(Math.round(15 * 1.35));
  });

  it('preparation earns an advantage (only while the ledger\'s layer is on): laying out the tools costs a nail and seconds of work', async () => {
    const s = demo();
    room(s, 'cargo_hold');
    expect(consequenceOptions(s.session)).toEqual([]);
    await s.run([{ consequencePrepare: 'lay_out', outcomeValue: 'cq_prep' }]);
    expect([s.session.story.getValue('cq_prep'), ledger(s).held('well_prepared')]).toEqual(['refused', null]);
    await s.run([{ consequenceSystem: true }]);
    expect(consequenceOptions(s.session).map((o) => [o.action, o.label])).toEqual([['prepare', 'Lay out the tools (12s, 1 Nails)']]);
    const nails = has(s, 'nails');
    await s.run([{ consequencePrepare: 'lay_out' }]);
    expect([held(s), nails - has(s, 'nails')]).toEqual([{ well_prepared: 1 }, 1]);
  });

  it('nothing is cleared for free: a script clears one only when it says so (authorized), and every recovery material can be had again on every difficulty', async () => {
    const s = demo();
    await s.run([{ consequence: 'shaken' }, { consequenceResolve: 'shaken', outcomeValue: 'cq_clear' }]);
    expect([s.session.story.getValue('cq_clear'), ledger(s).level('shaken')]).toEqual(['refused', 1]);
    await s.run([{ consequenceResolve: 'shaken', authorized: true }]);
    expect(ledger(s).lastEnded('shaken').how).toBe('cleared');
    const res = recoveryResources(content);
    expect(res.problems).toEqual([]);
    expect(res.rows.every((r) => r.ways.length > 0)).toBe(true);
    const db = withLedger((d) => { d.methods.sort_kit.cost = [{ item: 'frog_grog', count: 1 }]; });
    expect(recoveryResources(db).problems.join('\n')).toMatch(/sort_kit: "frog_grog" has no way back from empty/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('6. cross-chapter persistence, saves, checkpoints', () => {
  it('rooms and story events change nothing; chapter milestones count it down; saved and loaded it goes on exactly the same', async () => {
    let s = demo();
    await s.run([{ consequence: 'poorly_prepared' }, { consequence: 'crew_doubts' }, { consequence: 'shaken', severity: 2 }]);
    const snap = JSON.stringify(ledger(s).serialize());
    room(s, 'main_deck');
    await s.run([{ setFlag: 'crownskull_discovered' }, { say: 'A scene.' }]);
    expect(JSON.stringify(ledger(s).serialize())).toBe(snap);
    await s.run([{ consequenceMilestone: 'chapter' }]);
    expect(ledger(s).held('poorly_prepared').miles).toBe(1);
    s = reloadStory(s);
    expect(s.record.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(24);
    expect(held(s)).toEqual({ shaken: 2, poorly_prepared: 1, crew_doubts: 1 });
    const t = reloadStory(s);
    tick(s, 45);
    tick(t, 45);
    expect(JSON.stringify(t.session.consequences.serialize())).toBe(JSON.stringify(s.session.consequences.serialize()));
    await s.run([{ consequenceMilestone: 'chapter' }]);
    expect(held(s)).toEqual({ shaken: 2 });
    expect(ledger(s).history.map((h) => `${h.id}:${h.how}`)).toEqual(['poorly_prepared:milestone', 'crew_doubts:milestone']);
    expect(ledger(s).marks).toEqual({ chapter: 2 });
  });

  it('versions 17 to 23 load with an empty ledger: nothing invented from the ship, the beard, the supplies or the story', () => {
    const s = session('p17_complete');
    s.ship.applyDamage({ section: 'hull_port', amount: 30, category: 'impact', tuning: ST() });
    s.ship.hazards.addWater('cargo_hold', 20);
    s.inventory.add('frog_grog', 1);
    const saves = new SaveManager({ storage: new MemoryStorage(), content });
    expect(saves.save(1, s).ok).toBe(true);
    const ship = JSON.stringify(s.ship.serialize());
    for (const v of [17, 18, 19, 20, 21, 22, 23]) {
      const raw = JSON.parse(JSON.stringify(saves.read(1).state));
      delete raw.consequences;
      if (v < 18) delete raw.ship;
      const t = GameSession.fromState({ content, bus: new EventBus(), state: raw, strictFlags: true, onWarning: (w) => { throw new Error(w); } });
      expect([v, t.consequences.untouched]).toEqual([v, true]);
      if (v >= 18) expect([v, JSON.stringify(t.ship.serialize())]).toEqual([v, ship]);
    }
  });

  it('damaged ledger data loads safely: unknown consequences dropped, levels and clocks clamped, duplicates kept once, history bounded', () => {
    const s = session();
    const w = [];
    s.consequences.load({
      on: 'yes',
      serial: -4,
      entries: [
        { id: 'shaken', n: 3, level: 9, cap: 7, k: 99, span: 1e9, left: -5, state: 'weird', source: 'nope', noted: 'x' },
        { id: 'shaken', n: 4, level: 1 },
        { id: 'unicorn_curse', level: 1 },
        { id: 'well_prepared', uses: 40, left: 1e6 },
        'garbage',
      ],
      history: [{ id: 'exhausted', state: 'fine', level: 9 }, { id: 'ghost' }, ...Array.from({ length: 40 }, (_, i) => ({ id: 'crew_doubts', n: 10 + i }))],
      events: ['a', 5, 'b'],
      counts: { shaken: 'many', ghost: 3, exhausted: 2.6 },
      marks: { chapter: 2, era: 5 },
    }, (x) => w.push(x));
    const L = s.consequences;
    expect(L.on).toBe(false);
    expect(L.held('shaken')).toMatchObject({ level: 3, cap: 3, k: 1.5, span: 1200, left: 1, state: 'active', source: { kind: 'script', id: null }, noted: false });
    expect(L.held('well_prepared')).toMatchObject({ uses: 2, span: 360, left: 360 });
    expect([L.entries.size, L.history.length, [...L.seen], L.counts.exhausted, L.counts.shaken, L.marks]).toEqual([2, 24, ['a', 'b'], 3, 1, { chapter: 2 }]);
    expect(L.serial).toBeGreaterThanOrEqual(49);
    for (const re of [/dropped unknown consequence "unicorn_curse"/, /"shaken" was held twice/, /dropped the history of unknown consequence "ghost"/]) expect(w.join('\n')).toMatch(re);
    const t = session();
    const w2 = [];
    t.consequences.load('nonsense', (x) => w2.push(x));
    expect([t.consequences.untouched, w2.join()]).toEqual([true, 'consequences: not a ledger; it starts empty']);
  });

  it('checkpoints capture the ledger; a restore puts it back; the diff names what changed and what ended', async () => {
    expect(CHECKPOINT_DOMAINS).toContain('consequences');
    const s = demo();
    await s.run([{ consequence: 'shaken' }, { consequence: 'crew_doubts' }]);
    const cp = captureCheckpoint(s.session, { id: 'cq_cp' });
    const before = s.session.serialize();
    await s.run([{ consequence: 'shaken' }, { consequence: 'exhausted' }, { consequenceResolve: 'crew_doubts', authorized: true }]);
    const d = diffStates(before, s.session.serialize());
    expect(d.consequences).toEqual({ shaken: [1, 2], crew_doubts: [1, null], exhausted: [null, 1], ended: ['crew_doubts:cleared'] });
    expect(isEmptyDiff(d)).toBe(false);
    restoreCheckpoint(s.session, cp);
    expect(held(s)).toEqual({ shaken: 1, crew_doubts: 1 });
    expect(isEmptyDiff(diffStates(before, s.session.serialize()))).toBe(true);
  });

  it('queries for later chapters: active, severity, resolved, ever, an advantage earned, the effect on the next challenge, a category', async () => {
    const s = demo();
    const q = (c) => evaluateCondition({ consequence: c }, s.session);
    expect([q({ any: true }), q({ id: 'shaken', ever: true }), q({ id: 'shaken', state: 'none' })]).toEqual([false, false, true]);
    await s.run([{ consequence: 'shaken', severity: 2 }, { consequence: 'well_prepared' }]);
    expect([q({ id: 'shaken', active: true }), q({ id: 'shaken', severity: { gte: 2 } }), q({ modifier: 'zone', lt: 0 }), q({ earned: 'well_prepared' }), q({ category: 'condition', count: 1 })]).toEqual([true, true, true, true, true]);
    await s.run([{ suppliesSystem: true }, { useSupply: 'bean_stew' }]);
    expect([q({ id: 'shaken', severity: 1 }), q({ id: 'shaken', severity: { gte: 2 } })]).toEqual([true, false]);
    room(s, 'crew_quarters');
    await s.run([{ consequenceRecover: 'rest' }, { consequenceCheck: 'shaken', value: 'cq_state' }]);
    expect([q({ id: 'shaken', resolved: true }), q({ id: 'shaken', state: 'recovered' }), q({ id: 'shaken', held: false }), s.session.story.getValue('cq_state')]).toEqual([true, true, true, 'recovered']);
    await s.run([{ consequenceSeverity: 'well_prepared', to: 1, outcomeValue: 'cq_sev' }]);
    expect(s.session.story.getValue('cq_sev')).toBe('kept');
  });
});

// ---------------------------------------------------------------------------------------------
describe('7. progression safety', () => {
  it('every ship bar stays winnable at the captain\'s worst condition, on every difficulty, with the weakest leader; a harsher bound is refused', () => {
    const { rows, problems } = barFeasibility(content);
    expect(problems).toEqual([]);
    expect(rows.length).toBe(shipBars(content).length * 3);
    expect(rows.every((r) => r.ok && r.windowMs >= 50)).toBe(true);
    const harsh = withLedger((d) => { d.limits.condition = [-10, 6]; });
    expect(barFeasibility(harsh).problems.join('\n')).toMatch(/\[brutal\] repair hull_rebuild: at the captain's worst condition \(-10 green, the weakest leader\)/);
    const report = ledgerReport(content);
    expect(report.problems).toEqual([]);
    expect(Object.keys(report.difficulties)).toEqual(DIFFS);
  });

  it('consequences never gate mandatory story: refused on a chapter start, a story trigger, a door, a step or a choice that moves the main story on; fine for dialogue', () => {
    const cond = { consequence: { id: 'shaken', active: true } };
    const progressFlag = content.game.chapters.find((c) => c.if?.flag)?.if.flag;
    expect(progressFlag).toBeTruthy();
    const errs = fixtureErrors({
      step: [{ if: cond, setFlag: progressFlag }],
      branch: [{ if: cond, then: [{ startQuest: content.quests.list().find((q) => q.category === 'main').id }] }],
      choice: [{ choice: [{ text: 'Go on', if: cond, then: [{ setFlag: progressFlag }] }, { text: 'Wait' }] }],
      dialogue: [{ if: cond, say: 'hale: Your hands are shaking, Captain.' }, { choice: [{ text: 'Steady now', if: cond, then: [{ narrate: 'You breathe.' }] }] }],
      opposed: [{ if: { all: [{ consequence: { id: 'well_prepared', active: true } }, { consequence: { id: 'poorly_prepared', held: true } }] }, narrate: 'Never.' }],
      contradiction: [{ if: { consequence: { id: 'shaken', active: true, resolved: true } }, narrate: 'Never.' }],
    }, {
      change: (files) => {
        const game = files['/data/game.json'];
        game.chapters[3] = { ...game.chapters[3], if: { all: [game.chapters[3].if ?? {}, cond].filter((c) => Object.keys(c).length) } };
        const trig = Object.keys(files).find((p) => p.startsWith('/data/story/triggers/'));
        const list = files[trig];
        if (Array.isArray(list)) list[0] = { ...list[0], if: cond };
        const map = files['/data/maps/ship/galley.json'];
        const warp = map.objects.find((o) => o.type === 'warp');
        warp.if = cond;
      },
    });
    expect(errs.step).toMatch(/consequences never gate mandatory story \(a step that moves the main story on\)/);
    expect(errs.branch).toMatch(/consequences never gate mandatory story/);
    expect(errs.choice).toMatch(/consequences never gate mandatory story \(a choice that moves the main story on\)/);
    expect(errs.dialogue).toBe('');
    expect(errs.opposed).toMatch(/can never hold together: "poorly_prepared" and "well_prepared" oppose each other/);
    expect(errs.contradiction).toMatch(/can never hold/);
    const all = errs._all.join('\n');
    expect(all).toMatch(/chapters\[3\].*consequences never gate mandatory story \(a chapter start\)/);
    expect(all).toMatch(/consequences never gate mandatory story \(a story trigger\)/);
    expect(all).toMatch(/galley.*consequences never gate mandatory story \(a warp\)/);
  });

  it('commands are validated: unknown ids and methods, bad severities, unauthorized clears, debug-only tables in content, the wrong kind of method, unknown milestones', () => {
    const errs = fixtureErrors({
      unknown: [{ consequence: 'ghost' }],
      severity: [{ consequence: 'pressed_on', severity: 2 }, { consequence: 'shaken', severity: 4 }],
      sev2: [{ consequenceSeverity: 'shaken', to: 2, by: 1 }],
      clear: [{ consequenceResolve: 'shaken' }],
      table: [{ consequenceOutcome: 'demo_repair', outcome: 'failure' }],
      outcome: [{ consequenceOutcome: 'demo_repair', outcome: 'later' }],
      method: [{ consequenceRecover: 'lay_out' }, { consequencePrepare: 'rest' }, { consequenceRecover: 'nap' }],
      milestone: [{ consequenceMilestone: 'era' }],
      spec: [{ shipRepair: 'hull_port', challenge: { profile: 'ship_repair', consequences: 'demo_repair' } }],
      ok: [{ consequence: 'shaken', severity: 2, eventId: 'storm' }, { consequenceSeverity: 'shaken', by: -1 }, { consequenceResolve: 'shaken', authorized: true }, { consequenceMilestone: 'chapter' }, { consequenceCheck: 'shaken', value: 'cq_v' }, { consequenceReport: true }],
    });
    expect(errs.unknown).toMatch(/unknown consequence "ghost"/);
    expect(errs.severity).toMatch(/"pressed_on" has 1 level/);
    expect(errs.severity).toMatch(/a severity is a whole level, 1 to 3/);
    expect(errs.sev2).toMatch(/give "to" or "by"/);
    expect(errs.clear).toMatch(/cleared outright only when the script says so/);
    expect(errs.table).toMatch(/"demo_repair" is for the debug demo and tests only/);
    expect(errs.outcome).toMatch(/an outcome is success, partial, failure, retry, accept, fallback/);
    expect(errs.method).toMatch(/"lay_out" prepares \(use consequencePrepare\)/);
    expect(errs.method).toMatch(/"rest" is a recovery \(use consequenceRecover\)/);
    expect(errs.method).toMatch(/unknown method "nap"/);
    expect(errs.milestone).toMatch(/a milestone is chapter/);
    expect(errs.spec).toMatch(/outcome table "demo_repair" is for the debug demo and tests only/);
    expect(errs.ok).toBe('');
    // The debug scenarios validate (debug-only tables allowed there).
    const dbg = fixtureErrors(Object.fromEntries(DEBUG_SHIP.consequences.map(([, steps], i) => [`scenario_${i}`, steps])), { debug: true });
    expect(dbg._all.filter((e) => e.includes('zz.cq_'))).toEqual([]);
  });

  it('the ledger never touches quests, story flags or the map: every scenario leaves them exactly as they were', async () => {
    for (const letter of ['A', 'B', 'C', 'D', 'E', 'F']) {
      const s = demo();
      const before = s.session.serialize();
      s.playHands('perfect', 'fumble', 'fumble', 'perfect', 'perfect');
      s.decideChallenges('continue', 'retry', 'continue');
      await s.run(scenario(letter));
      const d = diffStates(before, s.session.serialize());
      expect([letter, d.quests, d.flagsSet, d.flagsCleared, s.session.location.map]).toEqual([letter, {}, [], [], 'cargo_hold']);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('8. the Captain\'s Journal and the notices', () => {
  const { fonts } = buildFonts();
  const font = fonts.main;
  const PANEL_W = SCREEN_WIDTH - 100 - 24;

  it('the Journal keeps the ledger at the top: held first (in category order, penalties first), then what ended, newest first; NEW until read', async () => {
    const s = demo();
    await s.run([{ consequence: 'well_prepared' }, { consequence: 'crew_doubts' }, { consequence: 'shaken', severity: 2 }, { consequence: 'exhausted' }, { consequence: 'poorly_prepared' }]);
    room(s, 'crew_quarters');
    await s.run([{ consequenceRecover: 'rest' }]);
    const entries = journalEntries(s.session);
    expect(entries.map((e) => [e.title, e.held, e.unseen])).toEqual([['Short of Kit', true, true], ['Crew Doubts', true, true], ['Bone-Tired', false, false], ['Rattled Hands', false, false], ['Ready for Anything', false, false]]);
    // Opposites: Short of Kit, the later, ended Ready for Anything.
    expect(ledger(s).lastEnded('well_prepared').how).toBe('superseded');
    ledger(s).note('poorly_prepared');
    expect(journalEntries(s.session)[0].unseen).toBe(false);
  });

  it('each entry says its state, words, effect with numbers, how to put it right and whether that can be done here now, and how it ends', async () => {
    const s = demo();
    await s.run([{ consequence: 'shaken', severity: 2 }, { consequence: 'well_prepared' }, { consequence: 'pressed_on' }]);
    room(s, 'cargo_hold');
    const [shaken, ready, pressed] = journalEntries(s.session);
    expect(shaken.lines.map(plain)).toEqual([
      'State  Active: Rattled (2 of 2)',
      '"That last repair did your nerves no favors."',
      'Effect  Repair timing is less forgiving. Green -4.',
      'Recover  Rest in a hammock, in the crew quarters (25s): ends it. Go to the Crew Quarters.',
      'Or  Eat a hot meal, a galley meal, eaten from Items: eases it. No galley meals this voyage.',
      `Ends  By itself in ${clock(300)}.`,
    ]);
    expect(ready.lines.map(plain)).toContain('Ends  By itself in 6:00, or after 2 more repair bars.');
    expect(pressed.lines.map(plain)).toContain('Ends  Never. It stands.');
    room(s, 'crew_quarters');
    expect(plain(heldLines(s.session, ledger(s).held('shaken'))[3])).toMatch(/Here, now\.$/);
  });

  it('every line the ledger can show fits: the Journal\'s detail panel (a page at a time), the list, the toasts (two lines at most)', async () => {
    const s = demo();
    const all = [];
    for (const id of consequenceIds(content)) await s.run([{ consequence: id, announce: false }]);
    for (const e of journalEntries(s.session)) all.push(e);
    room(s, 'crew_quarters');
    await s.run([{ consequenceRecover: 'rest', announce: false }, { consequenceMilestone: 'chapter', announce: false }, { consequenceMilestone: 'chapter', announce: false }]);
    for (const e of journalEntries(s.session)) all.push(e);
    for (const e of all) {
      expect(measure(font, e.title), e.title).toBeLessThan(PANEL_W);
      for (const line of e.lines) {
        const lines = wrap(font, plain(line), PANEL_W).split('\n');
        expect(lines.length, line).toBeLessThanOrEqual(4);
      }
    }
    const notices = [];
    for (const id of consequenceIds(content)) {
      for (const op of ['applied', 'worsened', 'capped', 'refreshed', 'flared', 'eased', 'contained']) notices.push(consequenceNotice(content, { ok: true, op, id, level: 2 }));
      for (const how of ['rest', 'sort_kit', 'clear_pump', 'meal', 'expired', 'used up', 'milestone', 'superseded', 'cleared']) notices.push(consequenceNotice(content, { ok: true, op: 'resolved', id, how }));
    }
    for (const n of notices.filter(Boolean)) expect(wrap(font, plain(n), TOAST_TEXT_WIDTH).split('\n').length, n).toBeLessThanOrEqual(2);
  });

  it('the Journal opens for the ledger before its own first entry (and only then); other logs are unchanged', async () => {
    const s = makeStory({ preset: 'prologue_done' });
    const journal = content.logs.get('captains_journal');
    expect(logAvailable(journal, s.session, 'captains_journal')).toBe(false);
    await s.run([{ consequence: 'crew_doubts' }]);
    expect([logAvailable(journal, s.session, 'captains_journal'), logAvailable(journal, s.session)]).toEqual([true, false]);
    const other = content.logs.get('garrick_history');
    expect(logAvailable(other, s.session, 'garrick_history')).toBe(evaluateCondition(other.if, s.session));
  });

  it('notices: one short line each; a repeat keyed the same is let go by the overlay; quiet steps say nothing', async () => {
    const s = demo();
    await s.run([{ consequence: 'shaken' }, { consequence: 'shaken' }, { consequence: 'exhausted', announce: false }]);
    const mine = s.notices.filter((n) => n.kind === 'consequence');
    expect(mine.map((n) => [n.key, plain(n.text)])).toEqual([['cq:shaken:applied', 'RATTLED HANDS: repair timing is less forgiving.'], ['cq:shaken:worsened', 'RATTLED HANDS worse (Rattled).']]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('9. the campaign is unchanged', () => {
  it('no chapter, map, NPC, quest, trigger or preset uses the ledger: no command, condition or outcome table outside the debug demo', () => {
    const NAMES = new Set(Object.keys(COMMAND_SCHEMAS).filter((k) => k.startsWith('consequence')));
    expect(NAMES.size).toBe(10);
    const found = [];
    const visit = (v, at) => {
      if (Array.isArray(v)) v.forEach((x) => visit(x, at));
      else if (v && typeof v === 'object') {
        for (const k of Object.keys(v)) if (NAMES.has(k)) found.push(`${at}: ${k}`);
        if (v.challenge && typeof v.challenge === 'object' && 'consequences' in v.challenge) found.push(`${at}: challenge.consequences`);
        Object.values(v).forEach((x) => visit(x, at));
      }
    };
    for (const [p, v] of Object.entries(FILES)) if (!p.startsWith('/data/consequences/')) visit(v, p);
    expect(found).toEqual([]);
    // Every new command is registered with the regression harness, none is a challenge.
    for (const n of NAMES) expect(NON_CHALLENGE_COMMANDS.includes(n) && !Object.values(REGISTRY).some((k) => k.commands.includes(n)), n).toBe(true);
  });

  it('a legacy failure, a cutscene and the ship\'s own systems never create an entry', async () => {
    const s = makeStory({ preset: 'p17_complete', challenges: 'failThenContinue' });
    s.setRepairScore(0);
    await s.run([{ repair: 'hull', strikes: 3, var: 'cq_l1' }]);
    s.decideChallenges('continue');
    s.playHands('fumble');
    await s.run([{ repair: 'hull', strikes: 2, challenge: { failure: true, mechanics: { maxFumbles: 1 }, outcomes: { failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' }, onFailure: { continue: true } } }]);
    await s.run([{ shipDamage: 'hull_port', amount: 40, category: 'impact', scale: false }, { leak: 'hull_port', severity: 'leak', source: 'test' }, { hazardClock: 20 }]);
    expect(ledger(s).untouched).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
describe('10. the debug scenarios, played headless (the browser plays them too)', () => {
  it('A: a mistake: a clean repair (In the Groove), a botched one carried on (Rattled Hands, Crew Doubts); upstairs the deck\'s green is 3 tighter', async () => {
    const s = demo();
    s.playHands('perfect', 'fumble');
    s.decideChallenges('continue');
    await s.run(scenario('A'));
    expect(held(s)).toEqual({ shaken: 1, crew_doubts: 1, in_the_groove: 1 });
    room(s, 'main_deck');
    s.playHands('perfect');
    await s.run([{ shipRepair: 'deck' }]);
    expect(lastZone(s)).toBe(26 - 3);
    expect(journalEntries(s.session).map((e) => e.title)).toEqual(['Rattled Hands', 'Crew Doubts', 'In the Groove']);
  });

  it('B: recovery: read what it needs, rest in the crew quarters (or eat the stew), and the repair\'s green is back', async () => {
    for (const how of ['rest', 'meal']) {
      const s = demo();
      await s.run(scenario('B'));
      expect(held(s)).toEqual({ shaken: 2, exhausted: 1 });
      if (how === 'rest') {
        room(s, 'crew_quarters');
        await s.run([{ consequenceRecover: 'rest' }]);
        expect(held(s)).toEqual({});
      } else {
        await s.run([{ consequenceRecover: 'meal' }]);
        expect(held(s)).toEqual({ shaken: 1, exhausted: 'contained' });
      }
      s.playHands('perfect');
      room(s, 'cargo_hold');
      await s.run([{ shipRepair: 'hull_port' }]);
      expect([how, lastZone(s)]).toEqual([how, how === 'rest' ? 26 : 26 - 3 + 0]);
    }
  });

  it('C: an advantage: lay out the tools, two repairs with a wider green, then it is used up', async () => {
    const s = demo();
    await s.run(scenario('C'));
    room(s, 'cargo_hold');
    await s.run([{ consequencePrepare: 'lay_out' }]);
    s.playHands('perfect', 'perfect', 'perfect');
    await s.run([{ shipRepair: 'hull_port' }, { shipRepair: 'hull_starboard' }]);
    expect(s.challengeAttempts.map((a) => a.bar.zone)).toEqual([29, 29]);
    expect(ledger(s).lastEnded('well_prepared').how).toBe('used up');
  });

  it('D: repeated failure on Captain and Brutal: caps hold, a retry keeps the right penalties, no duplicates, a rest still works', async () => {
    for (const [d, cap] of [['captain', 2], ['brutal', 3]]) {
      const s = demo({ prefs: { difficulty: d } });
      s.playHands('fumble', 'fumble', 'fumble', 'fumble', 'fumble');
      s.decideChallenges('retry', 'retry', 'retry', 'continue', 'continue');
      await s.run(scenario('D'));
      const L = ledger(s);
      expect([d, L.level('exhausted'), L.level('shaken'), L.entries.size, new Set(L.list().map((e) => e.id)).size]).toEqual([d, cap, 2, 3, 3]);
      room(s, 'crew_quarters');
      await s.run([{ consequenceRecover: 'rest' }]);
      expect([d, held(s)]).toEqual([d, { crew_doubts: 1 }]);
    }
  });

  it('E: across chapters: a milestone, a save and a load, a dearer repair, then put right (or a second chapter ends it); the history stays', async () => {
    let s = demo();
    await s.run([...scenario('E'), { consequenceMilestone: 'chapter' }]);
    s = reloadStory(s);
    expect(held(s)).toEqual({ poorly_prepared: 1, crew_doubts: 1 });
    expect(repairPlan(s.session, 'hull_port', { anywhere: true }).repair.cost[0]).toEqual({ item: 'planks', count: 3 });
    room(s, 'cargo_hold');
    await s.run([{ consequenceRecover: 'sort_kit' }]);
    expect(repairPlan(s.session, 'hull_port', { anywhere: true }).repair.cost[0]).toEqual({ item: 'planks', count: 2 });
    await s.run([{ consequenceMilestone: 'chapter' }]);
    expect([held(s), ledger(s).history.map((h) => `${h.id}:${h.state}`)]).toEqual([{}, ['poorly_prepared:recovered', 'crew_doubts:resolved']]);
    expect(journalEntries(s.session).map((e) => [e.title, e.held])).toEqual([['Crew Doubts', false], ['Short of Kit', false]]);
  });

  it('F: a combined emergency: winnable on Captain (rest first, or press on), feasible on Brutal; pressing on is recorded', async () => {
    for (const [d, path] of [['captain', 'rest'], ['captain', 'press'], ['brutal', 'press']]) {
      const s = demo({ prefs: { difficulty: d }, pick: path === 'rest' ? 'first' : 'last' });
      await s.run(scenario('F'));
      expect([d, path, ledger(s).held('pressed_on') !== null]).toEqual([d, path, path === 'press']);
      if (path === 'rest') {
        room(s, 'crew_quarters');
        await s.run([{ consequenceRecover: 'rest' }]);
      }
      room(s, 'cargo_hold');
      await s.run([{ consequenceRecover: 'clear_pump' }]);
      s.playHands('perfect');
      await s.run([{ patchLeak: true }]);
      const hz = s.session.ship.hazards;
      for (let i = 0; i < 40 && hz.waterIn('cargo_hold').units > 0; i++) await s.run([{ hazardAction: 'pump' }]);
      expect([d, path, hz.leaks.filter((l) => l.state === 'open').length, hz.waterIn('cargo_hold').units]).toEqual([d, path, 0, 0]);
    }
  });
});
