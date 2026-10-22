import { describe, it, expect } from 'vitest';
import { loadContent } from '../src/content/loadContent.js';
import { ContentDB } from '../src/content/ContentDB.js';
import { validateContent } from '../src/content/validateContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION } from '../src/config/constants.js';
import { Settings, DEFAULT_SETTINGS } from '../src/systems/settings/Settings.js';
import {
  DIFFICULTIES, DEFAULT_DIFFICULTY, DEFAULT_PREFS, TIMING_ASSIST_LEVELS, TUNING, ASSIST_TUNING,
  difficultyList, presetTuning, resolveAssists, normalizePrefs, difficultyDataProblems,
} from '../src/systems/challenge/difficulty.js';
import { challengeConfig, challengeProblems, configRules, DIFFICULTY_KEYS } from '../src/systems/challenge/config.js';
import { ChallengeRun, runChallenge, challengeLog } from '../src/systems/challenge/runner.js';
import { evaluateOutcome, reachableOutcomes } from '../src/systems/challenge/outcome.js';
import { CHALLENGE_KINDS, supportedOutcomes } from '../src/systems/challenge/kinds.js';
import { captureCheckpoint } from '../src/systems/challenge/checkpoint.js';
import { seededRandom, attemptSeed } from '../src/systems/challenge/rng.js';
import { createTimingBar, timingBarSettings, LEGACY_ASSIST, TIMING_DEFAULTS } from '../src/systems/timingBar.js';
import { tunedTensionDef, createTension, MIN_BAND } from '../src/systems/tension.js';
import { DutyPlan, DutyWatch } from '../src/systems/hazards/sharkDuty.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { makeStory, reloadStory } from './storyHarness.js';
import { playTimingBar, playTension, repairBarConfig } from './challengeBots.js';

/**
 * Difficulty modes and accessibility assists (docs/gameplay-overhaul/08-difficulty-and-accessibility.md).
 * Deterministic: the mechanics are the game's own rules played frame by frame
 * by simulated hands (tests/challengeBots.js) on fixed seeds. The numbered
 * blocks follow the twenty checks Prompt 4 asked for; 20 (phase snapshots) is
 * tests/regression.test.js against the approved baseline.
 */
const content = loadContent();
const FILES = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' });

function session(preset = 'p17_complete') {
  const s = GameSession.newGame({ content, bus: new EventBus(), strictFlags: true });
  applyPresetPlan(s, resolvePreset(content, preset));
  return s;
}

const cfgFor = (spec, kind, difficulty) => challengeConfig(content, spec, { kind, id: typeof spec === 'string' ? spec : spec.id ?? 'fixture', difficulty });
/** What an attempt's mechanic is given (as ChallengeRun.attemptInfo builds it). */
const infoFor = (cfg, prefs = {}, attempt = 1) => ({
  id: cfg.id, attempt, seed: attemptSeed(cfg.id, attempt), strict: cfg.failure, mechanics: cfg.mechanics, intent: cfg.intent, difficulty: cfg.difficulty,
  assist: resolveAssists(content, cfg.kind, normalizePrefs({ difficulty: cfg.difficulty, ...prefs }), { strict: cfg.failure, allowClassic: cfg.assists.classic, ownAssist: !!cfg.mechanics.assist }),
});
const judge = (cfg, metrics) => evaluateOutcome(cfg.outcomes, metrics, supportedOutcomes(cfg.kind, { strict: true }).filter((o) => cfg.failure || o !== 'failure')).outcome;
/** Plays a repair challenge's attempt with a hand, the weakest leader by default (the validator's worst case). */
function playBar(cfg, hand, { prefs = {}, strikes = 3, bonus = -0.25, seed = null } = {}) {
  const info = infoFor(cfg, prefs);
  const bar = repairBarConfig({ kind: 'hull', strikes, speed: 1, zone: 26 }, info, { bonus });
  const metrics = playTimingBar(bar, hand, seededRandom(seed ?? info.seed));
  return { bar, metrics, outcome: judge(cfg, metrics) };
}
/** Plays a sash challenge's attempt as the step command would (difficulty feel and assist applied). */
function playSash(cfg, hand, { prefs = {}, seed = 5 } = {}) {
  const info = infoFor(cfg, prefs);
  const strict = info.strict ? { ...info.mechanics } : null;
  const def = tunedTensionDef({ ...content.tension.get('thirty_second_trial'), strict }, { tuning: info.mechanics, assist: info.assist.tension, cues: info.assist.cues });
  const metrics = playTension(def, hand, seededRandom(seed));
  return { def, metrics, outcome: judge(cfg, metrics) };
}

const PROFILES = () => content.challenges.ids().map((id) => ({ id, kind: content.challenges.get(id).kind }));

// ---------------------------------------------------------------------------------------------
describe('1. the difficulty presets', () => {
  it('loads three presets in order, Captain the default, every tuning within its bounds', () => {
    const list = difficultyList(content);
    expect(list.map((d) => d.id)).toEqual(['deckhand', 'captain', 'brutal']);
    expect(list.map((d) => [d.label, d.tagline])).toEqual([['Deckhand', 'Forgiving'], ['Captain', 'Challenging'], ['Brutal', 'Expert']]);
    expect(list.filter((d) => d.default).map((d) => d.id)).toEqual(['captain']);
    expect(DIFFICULTIES).toEqual(['deckhand', 'captain', 'brutal']);
    expect(difficultyDataProblems(content)).toEqual([]);
    // Captain is the rules as written; the others ease or tighten the feel, within bounds.
    for (const kind of Object.keys(TUNING)) expect(presetTuning(content, 'captain', kind)).toEqual({});
    const easy = presetTuning(content, 'deckhand', 'repair');
    const hard = presetTuning(content, 'brutal', 'repair');
    expect(easy.zoneAdd).toBeGreaterThan(0);
    expect(easy.speedScale).toBeLessThan(1);
    expect(hard.zoneAdd).toBeLessThan(0);
    expect(hard.speedScale).toBeGreaterThan(1);
    expect(presetTuning(content, 'deckhand', 'sashTension').tolerance).toBeGreaterThan(0);
    expect(presetTuning(content, 'brutal', 'sashTension').tolerance).toBeLessThan(0);
    expect(presetTuning(content, 'deckhand', 'sharkDuty').reactionScale).toBeGreaterThan(1);
    expect(presetTuning(content, 'brutal', 'sharkDuty').reactionScale).toBeLessThan(1);
    for (const d of DIFFICULTIES) {
      for (const [kind, bounds] of Object.entries(TUNING)) {
        for (const [key, v] of Object.entries(presetTuning(content, d, kind))) {
          expect(v).toBeGreaterThanOrEqual(bounds[key][0]);
          expect(v).toBeLessThanOrEqual(bounds[key][1]);
        }
      }
    }
  });

  it('timing assist levels load: "off" changes nothing, "light" and "strong" only ever ease', () => {
    expect(TIMING_ASSIST_LEVELS).toEqual(['off', 'light', 'strong']);
    expect(resolveAssists(content, 'repair', { timingAssist: 'off' }).applied).toEqual([]);
    const light = resolveAssists(content, 'repair', { timingAssist: 'light' });
    const strong = resolveAssists(content, 'repair', { timingAssist: 'strong' });
    expect(light.applied).toEqual(['timingAssist:light']);
    expect(strong.timing.speedScale).toBeLessThan(light.timing.speedScale);
    expect(strong.timing.zoneAdd).toBeGreaterThan(light.timing.zoneAdd);
    for (const a of [light, strong]) {
      expect(a.timing.speedScale).toBeLessThanOrEqual(1);
      expect(a.timing.zoneAdd).toBeGreaterThanOrEqual(0);
      // A slower marker always gets at least the time it needs.
      expect(a.timing.timeScale).toBeGreaterThanOrEqual(1 / a.timing.speedScale - 1e-9);
      expect(a.cues).toBe(true);
    }
    const sash = resolveAssists(content, 'sashTension', { timingAssist: 'strong' });
    expect(sash.tension.tolerance).toBeGreaterThan(0);
    expect(sash.tension.swayScale).toBeLessThanOrEqual(1);
    for (const [k, [min, max]] of Object.entries(ASSIST_TUNING.sashTension)) expect(sash.tension[k]).toBeGreaterThanOrEqual(min) && expect(sash.tension[k]).toBeLessThanOrEqual(max);
    // Shark Duty's watch has no timing of its own (its shoves are timing bars, assisted there).
    expect(resolveAssists(content, 'sharkDuty', { timingAssist: 'strong', classicBar: true }).applied).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('2. Captain is the default for new games', () => {
  it('a fresh device, and stored options from before difficulty existed, both mean Captain with no assists', () => {
    expect(DEFAULT_DIFFICULTY).toBe('captain');
    expect(DEFAULT_SETTINGS).toMatchObject({ difficulty: 'captain', timingAssist: 'off', classicBar: false });
    expect(new Settings({ storage: new MemoryStorage() }).challengePrefs()).toEqual({ difficulty: 'captain', timingAssist: 'off', classicBar: false });
    const storage = new MemoryStorage();
    storage.setItem('captain-stinkbeard.settings', JSON.stringify({ musicVolume: 0.3, textSpeed: 'fast', screenShake: 'reduced' }));
    const old = new Settings({ storage });
    expect(old.get('musicVolume')).toBe(0.3);
    expect(old.challengePrefs()).toEqual(DEFAULT_PREFS);
    expect(normalizePrefs(undefined)).toEqual(DEFAULT_PREFS);
  });

  it('a new game played without touching anything resolves every challenge on Captain', async () => {
    const s = makeStory({ preset: 'p17_complete' });
    expect(s.prefs).toEqual(DEFAULT_PREFS);
    await s.run([{ repair: 'hull', strikes: 3, challenge: { profile: 'repair_strict', id: 'fx_default' } }]);
    expect(s.challengeRecords[0]).toMatchObject({ difficulty: 'captain', assists: [], outcome: 'success' });
  });
});

// ---------------------------------------------------------------------------------------------
describe('3. the choice persists', () => {
  it('difficulty and assists survive closing and reopening; anything unknown falls back to the defaults', () => {
    const storage = new MemoryStorage();
    const s = new Settings({ storage, bus: new EventBus() });
    s.set('difficulty', 'brutal');
    s.set('timingAssist', 'strong');
    s.set('classicBar', true);
    const again = new Settings({ storage });
    expect(again.challengePrefs()).toEqual({ difficulty: 'brutal', timingAssist: 'strong', classicBar: true });
    expect(() => s.set('difficulty', 'nightmare')).toThrow();
    expect(() => s.set('timingAssist', 'max')).toThrow();
    expect(() => s.set('classicBar', 'yes')).toThrow();
    storage.setItem('captain-stinkbeard.settings', JSON.stringify({ difficulty: 'nightmare', timingAssist: 'max', classicBar: 'yes', sfxVolume: 0.2 }));
    const garbage = new Settings({ storage });
    expect(garbage.challengePrefs()).toEqual(DEFAULT_PREFS);
    expect(garbage.get('sfxVolume')).toBe(0.2);
  });

  it('every change is announced once (the menus and the overlay redraw from it)', () => {
    const bus = new EventBus();
    const seen = [];
    bus.on('settings:changed', (e) => seen.push(e));
    const s = new Settings({ storage: new MemoryStorage(), bus });
    s.set('difficulty', 'deckhand');
    s.set('difficulty', 'deckhand');
    s.set('timingAssist', 'light');
    expect(seen).toEqual([{ key: 'difficulty', value: 'deckhand' }, { key: 'timingAssist', value: 'light' }]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('4. a save holds no difficulty', () => {
  it('saves (version 21 since Prompts 5 to 8 added the ship, its hazards, its air and its pressure) load as they are, on the device\'s difficulty', async () => {
    expect(SAVE_VERSION).toBe(21);
    const live = session();
    const storage = new MemoryStorage();
    const saves = new SaveManager({ storage, content });
    expect(saves.save(2, live).ok).toBe(true);
    const raw = JSON.parse(storage.getItem(saves.key(2)));
    expect(raw.version).toBe(21);
    expect(Object.keys(raw.state).sort()).toEqual(['createdAt', 'inventory', 'location', 'party', 'playTime', 'quests', 'ship', 'story', 'world']);
    expect(JSON.stringify(raw)).not.toMatch(/difficulty|timingAssist|classicBar/);
    const read = saves.read(2);
    expect(read.ok).toBe(true);
    // The same save on two devices: each plays it on its own difficulty.
    for (const difficulty of ['deckhand', 'brutal']) {
      const t = makeStory({ state: read.state, prefs: { difficulty } });
      await t.run([{ repair: 'hull', strikes: 3, challenge: { profile: 'repair_strict', id: `fx_load_${difficulty}` } }]);
      expect(t.challengeRecords[0].difficulty).toBe(difficulty);
    }
  });

  it('changing preferences never rewrites story progress or a checkpoint', () => {
    const live = session();
    const settings = new Settings({ storage: new MemoryStorage(), bus: live.bus });
    const before = JSON.stringify(live.serialize());
    const cp = captureCheckpoint(live, { id: 'fx_prefs' });
    const cpBefore = JSON.stringify(cp);
    settings.set('difficulty', 'brutal');
    settings.set('timingAssist', 'strong');
    settings.set('classicBar', true);
    expect(JSON.stringify(live.serialize())).toBe(before);
    expect(JSON.stringify(cp)).toBe(cpBefore);
    expect(cpBefore).not.toMatch(/difficulty|timingAssist/);
  });

  it('a story reloaded from a save keeps the player\'s preferences (they are the device\'s, not the save\'s)', async () => {
    const s = makeStory({ preset: 'p17_complete', prefs: { difficulty: 'deckhand', timingAssist: 'light' } });
    const t = reloadStory(s);
    expect(t.prefs).toEqual({ difficulty: 'deckhand', timingAssist: 'light', classicBar: false });
  });
});

// ---------------------------------------------------------------------------------------------
describe('5. configuration resolution and precedence', () => {
  it('engine defaults, then the preset, then the profile and its block, then the challenge and its block', () => {
    expect(cfgFor('repair_strict', 'repair', 'captain').mechanics).toEqual({ maxFumbles: 2 });
    expect(cfgFor('repair_strict', 'repair', 'deckhand').mechanics).toEqual({ zoneAdd: 8, speedScale: 0.85, maxFumbles: 4 });
    expect(cfgFor('repair_strict', 'repair', 'brutal').mechanics).toEqual({ zoneAdd: -6, speedScale: 1.15, maxFumbles: 1 });
    // The challenge's own value beats the profile's block for that difficulty...
    expect(cfgFor({ profile: 'repair_strict', mechanics: { maxFumbles: 3 } }, 'repair', 'brutal').mechanics.maxFumbles).toBe(3);
    // ...and the challenge's own block for a difficulty beats everything.
    expect(cfgFor({ profile: 'repair_strict', mechanics: { maxFumbles: 3 }, difficulty: { brutal: { mechanics: { maxFumbles: 0 } } } }, 'repair', 'brutal').mechanics.maxFumbles).toBe(0);
    // An absolute number drops a lower layer's adjustment to it; an adjustment replaces an adjustment.
    expect(cfgFor({ profile: 'repair_strict', mechanics: { zone: 30 } }, 'repair', 'brutal').mechanics).toEqual({ speedScale: 1.15, maxFumbles: 1, zone: 30 });
    expect(cfgFor({ profile: 'repair_strict', mechanics: { zoneAdd: 2 } }, 'repair', 'brutal').mechanics.zoneAdd).toBe(2);
    // Outcomes are replaced whole by a block, never mixed.
    expect(cfgFor('repair_strict', 'repair', 'deckhand').outcomes).toEqual({ failure: { completed: false }, success: { fumbles: { lte: 1 } }, fallback: 'partial' });
    expect(cfgFor('repair_strict', 'repair', 'brutal').outcomes).toEqual({ failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' });
    // Deterministic, and an unknown difficulty is Captain.
    expect(cfgFor('repair_hard_choice', 'repair', 'brutal')).toEqual(cfgFor('repair_hard_choice', 'repair', 'brutal'));
    expect(cfgFor('repair_strict', 'repair', 'nightmare')).toEqual(cfgFor('repair_strict', 'repair', 'captain'));
    expect(cfgFor('repair_strict', 'repair', 'brutal').difficulty).toBe('brutal');
  });

  it('a difficulty never changes what the challenge is: its id, intent, what a retry keeps', () => {
    for (const d of DIFFICULTIES) {
      const sab = cfgFor('sash_deliberate_flutter', 'sashTension', d);
      expect(sab.intent).toBe('sabotage');
      expect(sab.outcomes).toEqual(CHALLENGE_KINDS.sashTension.intents.sabotage);
      expect(sab.id).toBe('sash_deliberate_flutter');
      expect(cfgFor('sash_trial_strict', 'sashTension', d).intent).toBe('complete');
    }
    expect(DIFFICULTY_KEYS).not.toContain('intent');
    expect(DIFFICULTY_KEYS).not.toContain('keep');
    expect(challengeProblems(content, { profile: 'sash_trial_strict', difficulty: { brutal: { intent: 'sabotage' } } }, { kind: 'sashTension' }).join('\n')).toMatch(/difficulty.brutal can't change "intent"/);
  });

  it('a timing bar\'s numbers: the step, the difficulty, the leader, then the assist', () => {
    const base = { baseSpeed: 150, speed: 1.2, zone: 22, strikes: 3 };
    const captain = timingBarSettings({ ...base, challenge: infoFor(cfgFor('repair_strict', 'repair', 'captain')) });
    const brutal = timingBarSettings({ ...base, challenge: infoFor(cfgFor('repair_strict', 'repair', 'brutal')) });
    const deck = timingBarSettings({ ...base, challenge: infoFor(cfgFor('repair_strict', 'repair', 'deckhand')) });
    expect(captain).toMatchObject({ mode: 'strict', speed: 150 * 1.2, zone: 22, maxFumbles: 2 });
    expect(brutal).toMatchObject({ speed: 150 * 1.2 * 1.15, zone: 16, maxFumbles: 1 });
    expect(deck).toMatchObject({ speed: 150 * 1.2 * 0.85, zone: 30, maxFumbles: 4 });
    const assisted = timingBarSettings({ ...base, challenge: infoFor(cfgFor('repair_hard_choice', 'repair', 'brutal'), { timingAssist: 'strong' }) });
    expect(assisted.speed).toBeCloseTo(150 * 1.2 * 1.15 * 0.7);
    expect(assisted.zone).toBe(16 + 8);
    expect(assisted.timeLimit).toBe(12000 * 1.5);
    expect(assisted.cues).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
describe('6. timing on each difficulty', () => {
  it('the same strict bar is wider and slower on Deckhand, narrower and faster on Brutal, and a perfect hand wins on all', async () => {
    const seen = {};
    for (const difficulty of DIFFICULTIES) {
      const s = makeStory({ preset: 'p17_complete', prefs: { difficulty } });
      s.playHands('perfect');
      await s.run([{ repair: 'hull', strikes: 3, challenge: { profile: 'repair_strict', id: 'fx_feel' } }]);
      seen[difficulty] = s.challengeAttempts[0].bar;
      expect(s.challengeRecords[0]).toMatchObject({ difficulty, outcome: 'success', attempt: 1 });
    }
    expect(seen.deckhand.zone).toBeGreaterThan(seen.captain.zone);
    expect(seen.captain.zone).toBeGreaterThan(seen.brutal.zone);
    expect(seen.deckhand.speed).toBeLessThan(seen.captain.speed);
    expect(seen.captain.speed).toBeLessThan(seen.brutal.speed);
    expect([seen.deckhand.maxFumbles, seen.captain.maxFumbles, seen.brutal.maxFumbles]).toEqual([4, 2, 1]);
  });

  it('two fumbles: a partial on Deckhand and Captain, a failure on Brutal (then retried and won)', async () => {
    const out = {};
    for (const difficulty of DIFFICULTIES) {
      const s = makeStory({ preset: 'p17_complete', prefs: { difficulty } });
      s.playHands({ fumbles: 2 }, 'perfect');
      s.decideChallenges('retry');
      await s.run([{ repair: 'hull', strikes: 3, challenge: { profile: 'repair_strict', id: 'fx_two' } }]);
      out[difficulty] = s.challengeRecords[0].history.map((h) => h.outcome);
    }
    expect(out).toEqual({ deckhand: ['partial'], captain: ['partial'], brutal: ['failure', 'success'] });
  });
});

// ---------------------------------------------------------------------------------------------
describe('7. Shark Duty thresholds on each difficulty', () => {
  /** A deterministic watch: sharks on DutyPlan's schedule (at the difficulty's pace); the captain answers each after `respondMs`. */
  function simulate(cfg, { respondMs, seconds = 180, repelGoal = 10 }) {
    const def = content.hazards.get('shark_duty').sessions.first_watch;
    const plan = new DutyPlan(def, null, { reactionScale: cfg.mechanics.reactionScale });
    const watch = new DutyWatch(cfg.mechanics);
    let rail = [];
    const dt = 50;
    for (let t = 0; t < seconds * 1000; t += dt) {
      watch.tick(dt);
      for (const w of plan.tick(dt, new Set(rail.map((r) => r.spot)))) rail.push({ spot: w.boarder ? 'deck' : w.section, section: w.section, age: 0, window: w.tuning.window, boarder: !!w.boarder });
      for (const r of rail) r.age += dt;
      for (const r of rail) {
        if (!r.boarder && r.age >= r.window) {
          watch.bite(r.section);
          r.done = true;
        } else if (r.age >= respondMs) {
          watch.repel();
          r.done = true;
        }
      }
      rail = rail.filter((r) => !r.done);
      if (watch.failure()) return { lost: watch.failure(), metrics: watch.metrics({ completed: false }) };
      if (watch.repelled >= repelGoal) return { lost: null, metrics: watch.metrics({ completed: true }) };
    }
    return { lost: null, metrics: watch.metrics({ completed: true }) };
  }

  it('the watch allows six bites on Deckhand, three on Captain, one on Brutal; sharks wait longer or shorter', () => {
    const cfg = Object.fromEntries(DIFFICULTIES.map((d) => [d, cfgFor('shark_duty_strict', 'sharkDuty', d)]));
    expect(DIFFICULTIES.map((d) => cfg[d].mechanics.maxBites)).toEqual([6, 3, 1]);
    const def = content.hazards.get('shark_duty').sessions.first_watch;
    const windowOn = (d) => new DutyPlan(def, null, { reactionScale: cfg[d].mechanics.reactionScale }).tuning({}, 0).window;
    expect(windowOn('deckhand')).toBeGreaterThan(windowOn('captain'));
    expect(windowOn('captain')).toBeGreaterThan(windowOn('brutal'));
    // A captain who never comes: the watch is lost after one bite more than the difficulty allows.
    for (const d of DIFFICULTIES) {
      const slow = simulate(cfg[d], { respondMs: 600000 });
      expect(slow.lost).toBe('bites');
      expect(slow.metrics.bites).toBe(cfg[d].mechanics.maxBites + 1);
    }
  });

  it('Brutal is hard, never impossible: a quick captain holds the watch on every difficulty, and is judged by its rules', () => {
    for (const d of DIFFICULTIES) {
      const cfg = cfgFor('shark_duty_strict', 'sharkDuty', d);
      const quick = simulate(cfg, { respondMs: 1500 });
      expect(quick.lost).toBe(null);
      expect(judge(cfg, quick.metrics)).toBe('success');
      expect(judge(cfg, { ...quick.metrics, bites: 1 })).toBe('partial');
      expect(judge(cfg, { ...quick.metrics, completed: false })).toBe('failure');
    }
    // The validator's floor: even the hardest shark on Brutal leaves time to reach the rail.
    const def = content.hazards.get('shark_duty').sessions.first_watch;
    const plan = new DutyPlan(def, null, { reactionScale: cfgFor('shark_duty_strict', 'sharkDuty', 'brutal').mechanics.reactionScale });
    expect(plan.tuning({}, plan.ramp.over).window).toBeGreaterThanOrEqual(3000);
  });
});

// ---------------------------------------------------------------------------------------------
describe('8. the sash tension on each difficulty', () => {
  it('the band is wider and the grace longer on Deckhand, tighter on Brutal, and a perfect hand completes all three', () => {
    const r = Object.fromEntries(DIFFICULTIES.map((d) => [d, playSash(cfgFor('sash_trial_strict', 'sashTension', d), 'perfect')]));
    const width = (d) => r[d].def.band[1] - r[d].def.band[0];
    expect(width('deckhand')).toBeGreaterThan(width('captain'));
    expect(width('captain')).toBeGreaterThan(width('brutal'));
    expect(r.deckhand.def.grace).toBeGreaterThan(r.captain.def.grace);
    expect(r.brutal.def.grace).toBeLessThan(r.captain.def.grace);
    for (const d of DIFFICULTIES) expect(r[d].outcome).toBe('success');
    // Captain is the trial as written.
    expect(r.captain.def.band).toEqual(content.tension.get('thirty_second_trial').band);
  });

  it('pulled too hard, it tears on every difficulty, soonest on Brutal; a dropped grip loses it', () => {
    const torn = Object.fromEntries(DIFFICULTIES.map((d) => [d, playSash(cfgFor('sash_trial_strict', 'sashTension', d), 'tight')]));
    for (const d of DIFFICULTIES) expect(torn[d]).toMatchObject({ outcome: 'failure', metrics: { torn: true, ceremony: 'torn' } });
    expect(torn.brutal.metrics.seconds).toBeLessThanOrEqual(torn.captain.metrics.seconds);
    expect(torn.captain.metrics.seconds).toBeLessThanOrEqual(torn.deckhand.metrics.seconds);
    for (const d of DIFFICULTIES) expect(playSash(cfgFor('sash_trial_strict', 'sashTension', d), 'slack')).toMatchObject({ outcome: 'failure', metrics: { released: 'lost', cause: 'accident' } });
  });

  it('the objective holds on every difficulty: a deliberate flutter is a saboteur\'s success, an accident only partial', () => {
    for (const d of DIFFICULTIES) {
      const cfg = cfgFor('sash_deliberate_flutter', 'sashTension', d);
      expect(playSash(cfg, { early: 3 })).toMatchObject({ outcome: 'success', metrics: { ceremony: 'broken', cause: 'deliberate' } });
      expect(playSash(cfg, 'slack').outcome).toBe('partial');
      expect(playSash(cfg, 'perfect').outcome).toBe('failure');
      // The trial's own objective is the reverse, on the same difficulty.
      expect(playSash(cfgFor('sash_trial_strict', 'sashTension', d), 'perfect').outcome).toBe('success');
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('9-11. accessibility assists', () => {
  it('9. Timing Assist goes with any difficulty, Brutal included, and the record says it helped', async () => {
    const s = makeStory({ preset: 'p17_complete', prefs: { difficulty: 'brutal', timingAssist: 'strong' } });
    s.playHands('perfect');
    await s.run([{ repair: 'hull', strikes: 3, challenge: { profile: 'repair_strict', id: 'fx_brutal_assist' } }]);
    const a = s.challengeAttempts[0];
    expect(a.assists).toEqual(['timingAssist:strong']);
    expect(a.bar.zone).toBe(26 - 6 + 8);
    expect(a.bar.speed).toBeCloseTo(TIMING_DEFAULTS.speed * 1.15 * 0.7, 6);
    expect(s.challengeRecords[0]).toMatchObject({ difficulty: 'brutal', assists: ['timingAssist:strong'], outcome: 'success' });
    expect(s.challengeRecords[0].history[0]).toMatchObject({ difficulty: 'brutal', assists: ['timingAssist:strong'] });
    // Every combination is allowed.
    const settings = new Settings({ storage: new MemoryStorage() });
    for (const d of DIFFICULTIES) for (const lv of TIMING_ASSIST_LEVELS) for (const classic of [false, true]) {
      settings.set('difficulty', d);
      settings.set('timingAssist', lv);
      settings.set('classicBar', classic);
      expect(settings.challengePrefs()).toEqual({ difficulty: d, timingAssist: lv, classicBar: classic });
    }
  });

  it('9b. it eases a legacy bar and a legacy trial too, without making either a challenge', () => {
    const light = resolveAssists(content, 'repair', { timingAssist: 'light', classicBar: true });
    expect(light.applied).toEqual(['timingAssist:light']); // classic: a legacy bar is classic already
    const plain = timingBarSettings({ baseSpeed: 150, speed: 1, zone: 26, strikes: 3 });
    const eased = timingBarSettings({ baseSpeed: 150, speed: 1, zone: 26, strikes: 3, assist: light });
    expect(eased).toMatchObject({ mode: 'legacy', zone: plain.zone + light.timing.zoneAdd, assist: null, cues: true });
    expect(eased.speed).toBeCloseTo(plain.speed * light.timing.speedScale);
    expect(createTimingBar(eased).assist).toEqual(LEGACY_ASSIST);
    const trial = content.tension.get('thirty_second_trial');
    const t = tunedTensionDef(trial, { assist: resolveAssists(content, 'sashTension', { timingAssist: 'light' }).tension, cues: true });
    expect(t.band[1] - t.band[0]).toBeGreaterThan(trial.band[1] - trial.band[0]);
    expect(createTension(t).strict).toBe(null);
    expect(playTension(t, 'slack', seededRandom(5))).toMatchObject({ completed: true, ceremony: 'completed' });
  });

  it('10. the classic bar on a strict bar: it widens after a miss and steadies after two; fumbles still count; never a free success', () => {
    const cfg = cfgFor('repair_strict', 'repair', 'captain');
    const plain = playBar(cfg, { fumbles: 2 }, { bonus: 0 });
    const classic = playBar(cfg, { fumbles: 2 }, { bonus: 0, prefs: { classicBar: true } });
    expect(plain.metrics).toMatchObject({ completed: true, fumbles: 2, assisted: false });
    expect(classic.bar.assist).toEqual({ widenAfter: 1, widenScale: 1.6, steadyAfter: 2 });
    expect(classic.metrics).toMatchObject({ completed: true, fumbles: 2, assisted: true });
    expect(classic.outcome).toBe('partial');
    // It never lifts a limit: the fumbling hand still fails, with or without it.
    expect(playBar(cfg, 'fumble', { prefs: { classicBar: true } }).outcome).toBe('failure');
    expect(playBar(cfgFor('repair_strict', 'repair', 'brutal'), { fumbles: 2 }, { prefs: { classicBar: true } }).outcome).toBe('failure');
    // A challenge may refuse it, and its own assist stands.
    const refused = cfgFor({ profile: 'repair_strict', assists: { classic: false } }, 'repair', 'captain');
    expect(infoFor(refused, { classicBar: true }).assist.applied).toEqual([]);
    const own = cfgFor({ profile: 'repair_strict', mechanics: { assist: { widenAfter: 2 } } }, 'repair', 'captain');
    expect(infoFor(own, { classicBar: true }).assist.classic).toBe(null);
    // Legacy and graded (failure off) bars aren't strict: classic adds nothing there.
    expect(infoFor(cfgFor('repair_graded', 'repair', 'captain'), { classicBar: true }).assist.applied).toEqual([]);
  });

  it('11. changing the difficulty keeps the assists, and changing an assist keeps the difficulty', () => {
    const storage = new MemoryStorage();
    const s = new Settings({ storage });
    s.set('timingAssist', 'strong');
    s.set('classicBar', true);
    for (const d of ['brutal', 'deckhand', 'captain']) {
      s.set('difficulty', d);
      expect(s.challengePrefs()).toEqual({ difficulty: d, timingAssist: 'strong', classicBar: true });
    }
    s.set('difficulty', 'brutal');
    s.set('timingAssist', 'off');
    expect(new Settings({ storage }).challengePrefs()).toEqual({ difficulty: 'brutal', timingAssist: 'off', classicBar: true });
  });
});

// ---------------------------------------------------------------------------------------------
describe('12. changing the difficulty during a challenge', () => {
  it('the difficulty is fixed when a challenge starts; a change applies from the next one, an assist from the next try', async () => {
    const s = session();
    const prefs = { difficulty: 'brutal', timingAssist: 'off', classicBar: false };
    const spec = { profile: 'repair_hard_choice', id: 'fx_midchange', onFailure: { costs: [{ addVar: 'fx_mid_cost', value: 1 }] } };
    const cfg = challengeConfig(content, spec, { kind: 'repair', id: 'fx_midchange', difficulty: prefs.difficulty });
    const run = new ChallengeRun({ session: s, config: cfg, prefs: () => prefs, content });
    const infos = [];
    const { record } = await runChallenge(run, {
      attempt: async (info) => {
        infos.push(info);
        const bar = repairBarConfig({ kind: 'hull', strikes: 3 }, info);
        return playTimingBar(bar, info.attempt === 1 ? 'fumble' : 'perfect', seededRandom(info.seed));
      },
      // While the failure prompt is up, the player switches to Deckhand and turns the assist on.
      decide: async (rec, options) => {
        Object.assign(prefs, { difficulty: 'deckhand', timingAssist: 'strong' });
        expect(options.map((o) => o.id)).toEqual(['retry', 'continue']);
        return 'retry';
      },
      runSteps: async (steps) => steps.forEach((st) => st.addVar && s.story.addVar(st.addVar, st.value)),
    });
    // The retry kept Brutal's rules (two tries, its limits and clock)...
    expect(infos[1].mechanics).toEqual(infos[0].mechanics);
    expect(infos[1].mechanics).toMatchObject({ maxFumbles: 2, timeLimit: 12000, zoneAdd: -6 });
    expect(record.maxAttempts).toBe(2);
    expect(record.difficulty).toBe('brutal');
    // ...but the assist helped the next try at once.
    expect(record.history.map((h) => [h.outcome, h.difficulty, h.assists])).toEqual([['failure', 'brutal', []], ['success', 'brutal', ['timingAssist:strong']]]);
    expect(s.story.getVar('fx_mid_cost')).toBe(1);
    // The next challenge is resolved on the new difficulty.
    expect(challengeConfig(content, spec, { kind: 'repair', id: 'fx_next', difficulty: prefs.difficulty }).retry.maxAttempts).toBe(null);
    expect(challengeLog(s).active.size).toBe(0);
  });

  it('in the story harness: a mid-run change never bypasses the pending retry or changes its costs', async () => {
    const s = makeStory({ preset: 'p17_complete', prefs: { difficulty: 'brutal' } });
    s.playHands('fumble', 'perfect');
    const realDecide = s.decideChallenges;
    realDecide('retry');
    s.setPrefs({ difficulty: 'deckhand' }); // before it starts: this one is on Deckhand
    await s.run([{ repair: 'hull', strikes: 3, challenge: { profile: 'repair_strict', id: 'fx_harness_change' } }]);
    expect(s.challengeRecords[0]).toMatchObject({ difficulty: 'deckhand', outcome: 'success', attempt: 2 });
    expect(s.challengeAttempts.map((a) => a.bar.maxFumbles)).toEqual([4, 4]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('13-15. outcomes on every difficulty', () => {
  const STRIKES = [1, 3, 5];
  const SEEDS = [1, 7, 42];

  it('13. a well-played challenge succeeds on every difficulty, with any assist, the weakest leader, any seed', () => {
    for (const { id, kind } of PROFILES()) {
      for (const d of DIFFICULTIES) {
        const cfg = cfgFor(id, kind, d);
        for (const lv of TIMING_ASSIST_LEVELS) for (const classicBar of [false, true]) {
          const prefs = { timingAssist: lv, classicBar };
          if (kind === 'repair') for (const strikes of STRIKES) for (const seed of SEEDS) expect([id, d, lv, strikes, seed, playBar(cfg, 'perfect', { prefs, strikes, seed }).outcome]).toEqual([id, d, lv, strikes, seed, 'success']);
          if (kind === 'sashTension') expect([id, d, lv, playSash(cfg, cfg.intent === 'sabotage' ? { early: 4 } : 'perfect', { prefs }).outcome]).toEqual([id, d, lv, 'success']);
        }
      }
    }
  });

  it('14. a partial exists on every difficulty wherever the rules name one', () => {
    for (const d of DIFFICULTIES) {
      const strict = cfgFor('repair_strict', 'repair', d);
      const hand = d === 'deckhand' ? { fumbles: 2 } : { fumbles: 1 };
      expect([d, playBar(strict, hand, { bonus: 0 }).outcome]).toEqual([d, 'partial']);
      expect([d, playSash(cfgFor('sash_trial_strict', 'sashTension', d), 'noRelease').outcome]).toEqual([d, 'partial']);
      expect([d, playBar(cfgFor('repair_graded', 'repair', d), { fumbles: 3 }, { bonus: 0 }).outcome]).toEqual([d, 'partial']);
      const duty = cfgFor('shark_duty_strict', 'sharkDuty', d);
      expect(judge(duty, { completed: true, bites: 1, missed: 0 })).toBe('partial');
    }
  });

  it('15. a genuine failure on every difficulty where failure is on, assists or not; never on a graded challenge', () => {
    for (const d of DIFFICULTIES) {
      for (const prefs of [{}, { timingAssist: 'strong', classicBar: true }]) {
        expect([d, prefs.timingAssist ?? 'off', playBar(cfgFor('repair_strict', 'repair', d), 'fumble', { prefs }).outcome]).toEqual([d, prefs.timingAssist ?? 'off', 'failure']);
        expect([d, playBar(cfgFor('repair_hard_choice', 'repair', d), 'idle', { prefs }).metrics.reason]).toEqual([d, 'time']);
        expect(playSash(cfgFor('sash_trial_strict', 'sashTension', d), 'slack', { prefs }).outcome).toBe('failure');
        expect(playBar(cfgFor('repair_graded', 'repair', d), 'fumble', { prefs }).outcome).not.toBe('failure');
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('16. retries use the same rules', () => {
  it('a retry from the checkpoint plays by the same resolved rules, with a fresh seed', async () => {
    const s = makeStory({ preset: 'p17_complete', prefs: { difficulty: 'brutal', timingAssist: 'light' } });
    s.playHands('fumble', 'perfect');
    s.decideChallenges('retry');
    await s.run([{ repair: 'hull', strikes: 3, challenge: { profile: 'repair_strict', id: 'fx_same_rules' } }]);
    const [a, b] = s.challengeAttempts;
    expect(b.bar).toEqual(a.bar);
    expect([a.assists, b.assists]).toEqual([['timingAssist:light'], ['timingAssist:light']]);
    expect(s.restores).toHaveLength(1);
    const rec = s.challengeRecords[0];
    expect(rec.history.map((h) => h.difficulty)).toEqual(['brutal', 'brutal']);
    expect(rec.rules).toEqual(configRules(cfgFor({ profile: 'repair_strict', id: 'fx_same_rules' }, 'repair', 'brutal')));
    expect(attemptSeed('fx_same_rules', 1)).not.toBe(attemptSeed('fx_same_rules', 2));
  });
});

// ---------------------------------------------------------------------------------------------
describe('17. the record says which rules were in force', () => {
  const SPEC = {
    id: 'fx_record',
    failure: true,
    mechanics: { maxFumbles: 1 },
    outcomes: { failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' },
    retry: { policy: 'offer', maxAttempts: 2, restore: true },
    onFailure: { continue: true, costs: [{ addVar: 'fx_cost', value: 1 }], consequences: [{ addVar: 'fx_damage', value: 1 }] },
    difficulty: {
      deckhand: { onFailure: { costs: [], consequences: [{ addVar: 'fx_damage', value: 1 }] } },
      brutal: { onFailure: { costs: [{ addVar: 'fx_cost', value: 2 }], consequences: [{ addVar: 'fx_damage', value: 3 }] } },
    },
  };

  it('difficulty, assists per attempt, the resolved thresholds, the outcome, the retry, the consequence', async () => {
    const result = {};
    for (const difficulty of DIFFICULTIES) {
      const s = makeStory({ preset: 'p17_complete', prefs: { difficulty, timingAssist: 'light' } });
      s.playHands('fumble', 'fumble');
      s.decideChallenges('retry', 'continue');
      await s.run([{ repair: 'hull', strikes: 3, challenge: SPEC, outcomeValue: 'fx_record_outcome' }]);
      const r = s.challengeRecords[0];
      expect(r).toMatchObject({ difficulty, assists: ['timingAssist:light'], outcome: 'failure', attempt: 2, retried: true, decision: 'continue', accepted: true });
      expect(r.rules).toMatchObject({ difficulty, failure: true, retry: { maxAttempts: 2 }, onFailure: { continue: true } });
      expect(r.rules.mechanics.maxFumbles).toBe(1);
      expect(r.history.map((h) => [h.outcome, h.assists])).toEqual([['failure', ['timingAssist:light']], ['failure', ['timingAssist:light']]]);
      expect(s.session.story.getValue('fx_record_outcome')).toBe('failure');
      result[difficulty] = { cost: s.session.story.getVar('fx_cost', 0), damage: s.session.story.getVar('fx_damage', 0), costs: r.consequences.costs, applied: r.consequences.applied };
    }
    // Costs are paid on every failure and survive the restore; consequences once, at their difficulty's severity.
    expect(result).toEqual({
      deckhand: { cost: 0, damage: 1, costs: 0, applied: ['onFailure'] },
      captain: { cost: 2, damage: 1, costs: 2, applied: ['onFailure'] },
      brutal: { cost: 4, damage: 3, costs: 2, applied: ['onFailure'] },
    });
  });

  it('records stay small: rules are a summary, history is bounded, nothing is saved', async () => {
    const s = makeStory({ preset: 'p17_complete', prefs: { difficulty: 'brutal' } });
    s.playHands(...Array(12).fill('fumble'), 'perfect');
    await s.run([{ repair: 'hull', strikes: 3, challenge: { profile: 'repair_strict', id: 'fx_small' } }]);
    const r = s.challengeRecords[0];
    expect(r.history).toHaveLength(10);
    expect(JSON.stringify(r.rules).length).toBeLessThan(600);
    expect(JSON.stringify(s.session.serialize())).not.toMatch(/fx_small|timingAssist|brutal/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('18. invalid difficulty configurations are rejected', () => {
  const base = { failure: true, mechanics: { maxFumbles: 2 }, outcomes: { failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' }, onFailure: { mustRetry: true } };
  const problems = (spec, kind = 'repair', step = {}) => challengeProblems(content, spec, { kind, step }).join('\n');

  it('unknown difficulties, misplaced keys, impossible numbers, contradictions and unreachable outcomes', () => {
    expect(problems({ ...base, difficulty: { nightmare: {} } })).toMatch(/unknown difficulty "nightmare"/);
    expect(problems({ ...base, difficulty: { brutal: { id: 'other' } } })).toMatch(/difficulty.brutal can't change "id"/);
    expect(problems({ ...base, difficulty: { brutal: { mechanics: { zone: 4 } } } })).toMatch(/\[brutal\] the green \("zone" 3px\) is narrower than 8px/);
    expect(problems({ ...base, difficulty: { brutal: { mechanics: { timeLimit: 2000 } } } })).toMatch(/\[brutal\] "timeLimit" 2000 ms is shorter than a perfect hand may need/);
    expect(problems({ ...base, difficulty: { brutal: { retry: { maxAttempts: 2 } } } })).toMatch(/\[brutal\] onFailure.mustRetry needs unlimited attempts/);
    expect(problems({ ...base, onFailure: { continue: true }, difficulty: { brutal: { onFailure: { mustRetry: true } } } })).toMatch(/\[brutal\] onFailure: "mustRetry" and "continue" contradict/);
    expect(problems({ ...base, difficulty: { brutal: { onFailure: { costs: [{ giveGold: 5 }] } } } })).toMatch(/\[brutal\] onFailure.costs: "giveGold" gives something/);
    expect(problems({ ...base, onFailure: { mustRetry: true, costs: [{ takeGold: -5 }] } })).toMatch(/takeGold must be positive/);
    expect(problems({ ...base, mechanics: { maxFumbles: 2, zoneAdd: 40 } })).toMatch(/mechanics.zoneAdd must be a number from -10 to 12/);
    expect(problems({ ...base, outcomes: { ...base.outcomes, partial: { fumbles: { gte: 3 } } } })).toMatch(/outcomes.partial can never be reached/);
    expect(problems({ ...base, difficulty: { brutal: { outcomes: { failure: { completed: false }, success: { fumbles: { lt: 0 } } } } } })).toMatch(/\[brutal\] no attempt can end in success/);
    expect(problems({ ...base, mechanics: {} })).toMatch(/nothing can end an attempt as a failure \(give it a limit: maxFumbles, timeLimit\)/);
    expect(problems({ ...base, assists: { classic: 'yes', timing: false } })).toMatch(/assists.classic must be true or false/);
    expect(problems({ ...base, assists: { timing: false } })).toMatch(/unknown assists field "timing"/);
    // Each objective separately: a sabotage that can't let go early can never succeed; a trial that can't fail can't be strict.
    expect(problems({ profile: 'sash_deliberate_flutter', mechanics: { earlyRelease: false } }, 'sashTension')).toMatch(/no attempt can end in success/);
    expect(problems({ failure: true, intent: 'complete', onFailure: { mustRetry: true } }, 'sashTension')).toMatch(/nothing can end an attempt as a failure/);
    // A difficulty may make a challenge graded only (it can't fail there): that is allowed, and still winnable.
    expect(problems({ ...base, difficulty: { deckhand: { failure: false } } })).toBe('');
    // But a rule that asks for a failure where none can be produced is caught.
    expect(problems({ failure: false, outcomes: { failure: { fumbles: { gte: 0 } }, success: { fumbles: 0 } } })).toMatch(/a rule asks for an outcome this challenge can't produce/);
  });

  it('bad difficulty data and bad assist data are content errors', () => {
    const files = structuredClone(FILES);
    const presets = files['/data/difficulty/presets.json'];
    presets.nightmare = { label: 'Nightmare', tagline: 'No', summary: 'No' };
    presets.captain.default = false;
    presets.brutal.challenges.repair.zoneAdd = -50;
    presets.brutal.challenges.repair.wobble = 2;
    const assists = files['/data/difficulty/assists.json'];
    assists.timingAssist.light.repair.timeScale = 1;
    assists.timingAssist.strong.repair.speedScale = 1.4;
    assists.classicBar.assist.steadyAfter = 0;
    const errors = validateContent(new ContentDB(files)).errors.join('\n');
    expect(errors).toMatch(/unknown difficulty "nightmare"/);
    expect(errors).toMatch(/\(captain\): only "captain" is the default/);
    expect(errors).toMatch(/challenges.repair.zoneAdd must be a number from -10 to 12/);
    expect(errors).toMatch(/challenges.repair.wobble is not a difficulty tuning/);
    expect(errors).toMatch(/timingAssist.light\): repair.timeScale must be at least 1 \/ speedScale/);
    expect(errors).toMatch(/timingAssist.strong\): repair.speedScale must be a number from 0.5 to 1/);
    expect(errors).toMatch(/classicBar.assist.steadyAfter must be from 1 to 8/);
  });

  it('every shipped profile is valid and winnable on every difficulty, each objective on its own', () => {
    for (const { id, kind } of PROFILES()) {
      expect([id, challengeProblems(content, id, { kind })]).toEqual([id, []]);
      for (const d of DIFFICULTIES) {
        const cfg = cfgFor(id, kind, d);
        const reach = reachableOutcomes(cfg.outcomes, CHALLENGE_KINDS[kind].endings(cfg, {}), supportedOutcomes(kind, { strict: true }).filter((o) => cfg.failure || o !== 'failure'));
        expect([id, d, reach.outcomes.has('success')]).toEqual([id, d, true]);
        if (cfg.failure) expect([id, d, reach.outcomes.has('failure')]).toEqual([id, d, true]);
        if (cfg.outcomes.partial) expect([id, d, reach.rules.has('partial')]).toEqual([id, d, true]);
      }
    }
    expect(validateContent(content).errors).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('19. existing chapters keep their legacy behaviour on every difficulty', () => {
  it('nothing in the campaign opted in, so no difficulty reaches it', () => {
    const found = [];
    const visit = (v, where) => {
      if (Array.isArray(v)) v.forEach((x) => visit(x, where));
      else if (v && typeof v === 'object') {
        if ('challenge' in v) found.push(where);
        Object.values(v).forEach((x) => visit(x, where));
      }
    };
    for (const id of content.scripts.ids()) visit(content.scripts.get(id), id);
    for (const id of content.maps.ids()) for (const e of content.maps.get(id).sharkDuty ?? []) if (e.challenge) found.push(`${id} sharkDuty`);
    for (const [id, sess] of Object.entries(content.hazards.get('shark_duty').sessions)) if (sess.challenge) found.push(`session ${id}`);
    expect(found).toEqual([]);
  });

  it('a legacy repair or sash step on Brutal with every assist on still takes the old path: no record, its vars as before', async () => {
    const s = makeStory({ preset: 'p12_trial', prefs: { difficulty: 'brutal', timingAssist: 'strong', classicBar: true } });
    s.setRepairScore(2);
    await s.run([{ repair: 'hull', strikes: 3, var: 'legacy_clean' }]);
    expect(s.session.story.getVar('legacy_clean')).toBe(2);
    s.setTensionResult({ slips: 3, released: 'slipped' });
    await s.enter(s.map, 'p12c4.trial');
    expect(s.session.story.getVar('trial_slips')).toBe(3);
    expect(s.session.story.getVar('trial_released')).toBe(0);
    expect(s.challengeRecords).toEqual([]);
    expect(s.challengeAttempts).toEqual([]);
  });

  it('with no assist, a legacy bar, trial and watch are exactly what they always were', () => {
    // The overlay's old formula, for a spread of steps and leaders.
    for (const speed of [0.8, 1, 1.4]) for (const zone of [14, 26, 40]) for (const bonus of [-0.25, 0, 0.3, 0.6]) {
      const now = timingBarSettings({ baseSpeed: 160, speed, zone, strikes: 4, bonus, luck: 5, fumbleLock: 480 });
      expect(now).toMatchObject({ mode: 'legacy', speed: 160 * speed * (1 - bonus * 0.25), zone: Math.max(8, Math.round(zone * (1 + bonus))), assist: null, cues: false, luck: 5, strikes: 4 });
      expect(now.maxFumbles).toBeUndefined();
      expect(now.timeLimit).toBeUndefined();
    }
    const trial = content.tension.get('thirty_second_trial');
    expect(tunedTensionDef(trial)).toBe(trial);
    expect(tunedTensionDef(trial, { assist: resolveAssists(content, 'sashTension', { timingAssist: 'off' }).tension })).toBe(trial);
    const def = content.hazards.get('shark_duty').sessions.first_watch;
    const legacy = new DutyPlan(def);
    for (const n of [0, 3, 8]) expect(legacy.tuning({}, n)).toEqual(new DutyPlan(def, null, { reactionScale: 1 }).tuning({}, n));
    expect(legacy.reactionScale).toBe(1);
  });

  it('a tolerance never closes the band below a holdable width, nor lets it reach a tear', () => {
    const trial = content.tension.get('thirty_second_trial');
    const narrow = tunedTensionDef(trial, { tuning: { tolerance: -30 } });
    for (const band of [narrow.band, ...narrow.milestones.filter((m) => m.band).map((m) => m.band)]) expect(band[1] - band[0]).toBeGreaterThanOrEqual(MIN_BAND);
    const wide = tunedTensionDef({ ...trial, strict: { breakAt: { value: 80, seconds: 1 } } }, { tuning: { tolerance: 10 }, assist: { tolerance: 12 } });
    for (const band of [wide.band, ...wide.milestones.filter((m) => m.band).map((m) => m.band)]) expect(band[1]).toBeLessThanOrEqual(74);
  });
});
