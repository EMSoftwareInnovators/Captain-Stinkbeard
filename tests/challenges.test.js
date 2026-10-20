import { describe, it, expect } from 'vitest';
import { loadContent } from '../src/content/loadContent.js';
import { ContentDB } from '../src/content/ContentDB.js';
import { validateContent } from '../src/content/validateContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION } from '../src/config/constants.js';
import { OUTCOMES, CHALLENGE_STATES, evaluateOutcome, ruleHolds, gradeFor, HISTORY_LIMIT } from '../src/systems/challenge/outcome.js';
import { captureCheckpoint, restoreCheckpoint, diffStates, isEmptyDiff } from '../src/systems/challenge/checkpoint.js';
import { challengeConfig, challengeProblems } from '../src/systems/challenge/config.js';
import { ChallengeRun, runChallenge, challengeLog } from '../src/systems/challenge/runner.js';
import { CHALLENGE_KINDS, supportedOutcomes } from '../src/systems/challenge/kinds.js';
import { seededRandom, attemptSeed } from '../src/systems/challenge/rng.js';
import { createTimingBar, stepTimingBar, pressTimingBar, timingBarProblems, LEGACY_ASSIST } from '../src/systems/timingBar.js';
import { createTension, stepTension } from '../src/systems/tension.js';
import { DutyPlan, DutyWatch } from '../src/systems/hazards/sharkDuty.js';
import { COMMAND_SCHEMAS } from '../src/systems/script/commandSchemas.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { makeStory, reloadStory, testChallenge } from './storyHarness.js';
import { playTimingBar, playTension } from './challengeBots.js';

/**
 * The challenge outcome contract, checkpoints and retries (docs/gameplay-overhaul/07-challenge-outcomes.md).
 * Everything is deterministic: the mechanics are the game's own rules played
 * frame by frame by simulated hands (tests/challengeBots.js), and every
 * random choice follows a seed.
 */
const content = loadContent();
const FILES = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' });

function session(preset = 'p17_complete') {
  const bus = new EventBus();
  const s = GameSession.newGame({ content, bus, strictFlags: true });
  applyPresetPlan(s, resolvePreset(content, preset));
  return s;
}

/** A strict repair config, as a chapter would write it inline. */
const STRICT_REPAIR = (over = {}) => ({
  failure: true,
  mechanics: { maxFumbles: 1 },
  outcomes: { failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' },
  score: 'accuracy',
  grades: [{ min: 100, grade: 'A' }, { min: 0, grade: 'C' }],
  ...over,
});

const LEGACY_BAR = { mode: 'legacy', strikes: 3, speed: 150, zone: 26 };

// ---------------------------------------------------------------------------------------------
describe('1. legacy challenges are unchanged', () => {
  it('the legacy timing bar widens after three fumbles, steadies after five, and so can never be failed', () => {
    expect(LEGACY_ASSIST).toEqual({ widenAfter: 3, widenScale: 1.6, steadyAfter: 5 });
    const st = createTimingBar(LEGACY_BAR, seededRandom(7));
    // Fumble on purpose: wait until the marker is off the green, press.
    const fumble = () => {
      for (let i = 0; i < 600; i++) {
        stepTimingBar(st, 1000 / 60);
        const m = Math.round(st.pos);
        if (st.lock <= 0 && (m < st.zoneX - 2 || m > st.zoneX + st.zoneWidth + 2)) return pressTimingBar(st);
      }
      return null;
    };
    for (let n = 1; n <= 2; n++) expect(fumble()[0]).toMatchObject({ type: 'fumble', assist: null });
    expect(fumble()[0]).toMatchObject({ type: 'fumble', misses: 3, assist: 'widened' });
    expect(st.zoneWidth).toBe(Math.round(26 * 1.6));
    fumble();
    expect(fumble()[0]).toMatchObject({ type: 'fumble', misses: 5, assist: 'steadied' });
    expect(st.zoneWidth).toBe(st.cfg.barW);
    // The worst hand there is still finishes.
    const worst = playTimingBar(LEGACY_BAR, 'fumble', seededRandom(3));
    expect(worst).toMatchObject({ completed: true, done: 3, assisted: true });
    expect(worst.fumbles).toBeGreaterThan(0);
  });

  it('a repair step without "challenge" takes the old path: no checkpoint, no record, no prompt, its var as before', async () => {
    const s = makeStory({ preset: 'p17_complete' });
    s.setRepairScore(2);
    await s.run([{ repair: 'hull', strikes: 3, var: 'legacy_clean' }]);
    expect(s.session.story.getVar('legacy_clean')).toBe(2);
    expect(s.challengeRecords).toEqual([]);
    expect(s.challengeAttempts).toEqual([]);
    expect(s.challengeDecisions).toEqual([]);
    expect(s.restores).toEqual([]);
    expect(challengeLog(s.session).active.size).toBe(0);
  });

  it('the legacy sash trial never fails: a slack hand is caught each time and still reaches the cue', () => {
    const def = content.tension.get('thirty_second_trial');
    const r = playTension(def, 'slack', seededRandom(5));
    expect(r.completed).toBe(true);
    expect(r.slips).toBeGreaterThan(0);
    expect(r.ceremony).toBe('completed');
  });

  it('a sash step without "challenge" reads the legacy result exactly as before', async () => {
    const s = makeStory({ preset: 'p12_trial' });
    s.setTensionResult({ slips: 3, released: 'slipped' });
    await s.enter(s.map, 'p12c4.trial');
    expect(s.session.story.getVar('trial_slips')).toBe(3);
    expect(s.session.story.getVar('trial_released')).toBe(0);
    expect(s.challengeRecords).toEqual([]);
  });

  it('a duty, a step or a profile with no spec (or "enabled": false) gets no config at all', () => {
    expect(challengeConfig(content, undefined, { kind: 'repair' })).toBe(null);
    expect(challengeConfig(content, null, { kind: 'sharkDuty' })).toBe(null);
    expect(challengeConfig(content, { profile: 'repair_strict', enabled: false }, { kind: 'repair' })).toBe(null);
    expect(supportedOutcomes('repair')).toEqual(['success']);
    expect(supportedOutcomes('sharkDuty')).toEqual(['success']);
  });
});

// ---------------------------------------------------------------------------------------------
describe('the contract', () => {
  it('has one vocabulary and four states; rules read metrics; grades read scores', () => {
    expect(OUTCOMES).toEqual(['success', 'partial', 'failure', 'unsupported']);
    expect(CHALLENGE_STATES).toEqual(['ready', 'running', 'awaiting', 'resolved']);
    expect(ruleHolds({ fumbles: { lte: 1 }, completed: true }, { fumbles: 1, completed: true })).toBe(true);
    expect(ruleHolds({ any: [{ bites: { gt: 3 } }, { missed: { gte: 2 } }] }, { bites: 0, missed: 2 })).toBe(true);
    expect(ruleHolds({ released: { in: ['lost', 'torn'] } }, { released: 'pressed' })).toBe(false);
    expect(gradeFor(70, [{ min: 100, grade: 'A' }, { min: 66, grade: 'B' }, { min: 0, grade: 'C' }])).toBe('B');
  });

  it('records carry every field the overhaul needs', async () => {
    const s = makeStory({ preset: 'p17_complete' });
    await s.run([{ repair: 'hull', strikes: 3, challenge: STRICT_REPAIR({ id: 'fixture_fields' }) }]);
    const r = s.challengeRecords[0];
    for (const key of ['id', 'kind', 'chapter', 'event', 'enabled', 'failureEnabled', 'attempt', 'maxAttempts', 'state', 'outcome', 'score', 'grade', 'reason', 'retryAvailable', 'checkpoint', 'consequences', 'transitions', 'narrative', 'intent', 'cause', 'history']) expect(r).toHaveProperty(key);
    expect(r).toMatchObject({ id: 'fixture_fields', kind: 'repair', enabled: true, failureEnabled: true, legacy: false, attempt: 1, state: 'resolved', outcome: 'success', score: 100, grade: 'A', checkpoint: 'fixture_fields' });
  });

  it('the profiles in data/challenges are valid, and nothing in the campaign uses them yet', () => {
    for (const id of content.challenges.ids()) expect(challengeProblems(content, id, { kind: content.challenges.get(id).kind }), id).toEqual([]);
    expect(content.challenges.ids().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------
describe('2-5. success, partial, real failure, and failure stays failure', () => {
  it('2. a challenge played well reports success, runs ifSuccess and stores the outcome', async () => {
    const s = makeStory({ preset: 'p17_complete' });
    await s.run([{ repair: 'hull', strikes: 3, challenge: STRICT_REPAIR({ id: 'fixture_success' }), outcomeValue: 'fixture_outcome', ifSuccess: [{ setVar: 'fixture_branch', value: 1 }], ifFailure: [{ setVar: 'fixture_branch', value: 3 }] }]);
    expect(s.challengeRecords[0].outcome).toBe('success');
    expect(s.session.story.getValue('fixture_outcome')).toBe('success');
    expect(s.session.story.getVar('fixture_branch')).toBe(1);
  });

  it('3. one fumble is a partial: the job is done, worse, and the partial consequences run', async () => {
    const s = makeStory({ preset: 'p17_complete', challenges: 'partial' });
    await s.run([{ repair: 'hull', strikes: 3, var: 'fixture_clean', challenge: STRICT_REPAIR({ id: 'fixture_partial', onPartial: { consequences: [{ addVar: 'fixture_planks_used', value: 2 }] } }), ifPartial: [{ setVar: 'fixture_branch', value: 2 }] }]);
    const r = s.challengeRecords[0];
    expect(r).toMatchObject({ outcome: 'partial', grade: 'C' });
    expect(r.metrics).toMatchObject({ completed: true, fumbles: 1 });
    expect(s.session.story.getVar('fixture_planks_used')).toBe(2);
    expect(s.session.story.getVar('fixture_branch')).toBe(2);
    expect(s.session.story.getVar('fixture_clean')).toBeLessThan(3);
  });

  it('4. too many fumbles is a real failure the game itself produces (the bar ends the attempt)', () => {
    const r = playTimingBar({ mode: 'strict', strikes: 3, speed: 150, zone: 26, maxFumbles: 1 }, 'fumble', seededRandom(1));
    expect(r).toMatchObject({ completed: false, reason: 'fumbles', fumbles: 2 });
    const clock = playTimingBar({ mode: 'strict', strikes: 3, speed: 150, zone: 26, timeLimit: 9000 }, 'idle', seededRandom(1));
    expect(clock).toMatchObject({ completed: false, reason: 'time' });
  });

  it('5. a failure is never turned into a success: no widening in strict mode, and carrying on keeps the outcome "failure"', async () => {
    // The same hand that the legacy bar forgives fails the strict bar, every seed.
    for (let seed = 1; seed <= 20; seed++) {
      expect(playTimingBar({ ...LEGACY_BAR }, 'fumble', seededRandom(seed)).completed).toBe(true);
      const strict = playTimingBar({ ...LEGACY_BAR, mode: 'strict', maxFumbles: 4 }, 'fumble', seededRandom(seed));
      expect(strict.completed).toBe(false);
      expect(strict.assisted).toBe(false);
    }
    const s = makeStory({ preset: 'p17_complete', challenges: 'failure' });
    await s.run([{ repair: 'hull', strikes: 3, challenge: STRICT_REPAIR({ id: 'fixture_fail', onFailure: { continue: true } }), outcomeValue: 'fixture_outcome', ifFailure: [{ setVar: 'fixture_branch', value: 3 }] }]);
    expect(s.challengeRecords[0]).toMatchObject({ outcome: 'failure', accepted: true, decision: 'continue' });
    expect(s.session.story.getValue('fixture_outcome')).toBe('failure');
    expect(s.session.story.getVar('fixture_branch')).toBe(3);
    // A rule can't make an outcome the challenge can't produce: it says "unsupported".
    expect(evaluateOutcome({ failure: { completed: false } }, { completed: false }, ['success']).outcome).toBe('unsupported');
  });

  it('the strict bar is never impossible: a perfect hand finishes every profile, every seed', () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const speed of [1, 1.4, 1.7]) {
        const r = playTimingBar({ mode: 'strict', strikes: 4, speed: 155 * speed, zone: 15, maxFumbles: 0, timeLimit: 15000 }, 'perfect', seededRandom(seed));
        expect(r, `seed ${seed} speed ${speed}`).toMatchObject({ completed: true, fumbles: 0 });
      }
    }
    expect(timingBarProblems({ zone: 4 })).toEqual([expect.stringMatching(/narrower than 8px/)]);
    expect(timingBarProblems({ zone: 8, speed: 400, strikes: 5 }).join()).toMatch(/crosses the green in \d+ ms/);
    expect(timingBarProblems({ timeLimit: 2000, strikes: 3 }).join()).toMatch(/shorter than a perfect hand may need/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('6. checkpoints', () => {
  it('restore puts back flags, values, quests, items, gold, the party and the captain\'s tile, and says so', () => {
    const s = session();
    const before = s.serialize();
    const cp = captureCheckpoint(s, { id: 'fixture_cp' });
    const heard = [];
    s.bus.on('session:restored', (e) => heard.push(e.checkpoint));
    const flag = content.flagIds ? [...content.flagIds].find((f) => !s.story.has(f)) : null;
    s.story.set(flag);
    s.story.setVar('fixture_var', 9);
    s.story.setValue('fixture_value', 'changed');
    s.inventory.add('hardtack', 2);
    s.inventory.addGold(50);
    s.party.leader().hp = 1;
    s.location = { ...s.location, x: 1, y: 1 };
    const undone = restoreCheckpoint(s, cp);
    expect(s.serialize()).toEqual({ ...before, playTime: s.serialize().playTime });
    expect(heard).toEqual(['fixture_cp']);
    expect(undone.flagsCleared).toContain(flag);
    expect(undone.items.hardtack).toBe(-2);
    expect(undone.gold).toBe(-50);
  });

  it('a checkpoint is frozen: later play never changes what it restores', () => {
    const s = session();
    const cp = captureCheckpoint(s, { id: 'fixture_frozen' });
    s.story.setVar('fixture_var', 1);
    expect(() => {
      cp.domains.story.vars.fixture_var = 5;
    }).not.toThrow(); // the domains' contents are plain data; the record itself is frozen
    expect(Object.isFrozen(cp)).toBe(true);
    expect(Object.isFrozen(cp.domains)).toBe(true);
  });

  it('a retry in the story harness restores the checkpoint between attempts (fail once, then win)', async () => {
    const s = makeStory({ preset: 'p17_complete', challenges: 'failOnce' });
    await s.run([{ repair: 'hull', strikes: 3, challenge: STRICT_REPAIR({ id: 'fixture_retry' }) }]);
    expect(s.challengeAttempts.map((a) => [a.attempt, a.completed])).toEqual([[1, false], [2, true]]);
    // Unlimited retries and no "continue": the prompt still comes, with the one way forward.
    expect(s.challengeDecisions).toEqual([{ id: 'fixture_retry', attempt: 1, options: ['retry'], choice: 'retry' }]);
    expect(s.restores).toEqual([{ id: 'fixture_retry', at: '' }]);
    expect(s.challengeRecords[0]).toMatchObject({ outcome: 'success', attempt: 2, history: [{ attempt: 1, outcome: 'failure', reason: 'fumbles' }, { attempt: 2, outcome: 'success' }] });
  });
});

// ---------------------------------------------------------------------------------------------
/** Runs a challenge directly: each attempt does `during` (state changes an attempt might make), then reports `outcomes[attempt-1]`'s metrics. */
async function direct(s, cfg, attempts, { during = () => {}, decisions = [] } = {}) {
  const run = new ChallengeRun({ session: s, config: challengeConfig(content, cfg, { kind: 'repair', id: cfg.id ?? 'fixture_direct' }) });
  const decided = [];
  const runner = { run: async () => {} };
  const runSteps = async (steps) => {
    for (const step of steps) {
      if (step.addVar) s.story.addVar(step.addVar, step.value);
      if (step.setFlag) s.story.set(step.setFlag);
      if (step.giveItem) s.inventory.add(step.giveItem, step.count ?? 1);
    }
  };
  const { record } = await runChallenge(run, {
    attempt: async (info) => {
      during(info);
      return attempts[Math.min(info.attempt, attempts.length) - 1];
    },
    decide: async (rec, options) => {
      const want = decisions.shift() ?? 'retry';
      decided.push([rec.attempt, options.map((o) => o.id), want]);
      return want;
    },
    runSteps,
  });
  void runner;
  return { record, decided };
}
const FAIL = { completed: false, fumbles: 2, clean: 0, strikes: 3, reason: 'fumbles' };
const WIN = { completed: true, fumbles: 0, clean: 3, strikes: 3, accuracy: 100 };

describe('7-11. retries never duplicate, corrupt or leak', () => {
  it('7. what an attempt gave is given once, however many attempts it took', async () => {
    const s = session();
    const gold = s.inventory.gold;
    const held = s.inventory.count('hardtack');
    const { record } = await direct(s, STRICT_REPAIR({ onFailure: { mustRetry: true } }), [FAIL, FAIL, FAIL, WIN], {
      during: () => {
        s.inventory.add('hardtack', 1);
        s.inventory.addGold(10);
      },
    });
    expect(record).toMatchObject({ outcome: 'success', attempt: 4 });
    expect(s.inventory.count('hardtack')).toBe(held + 1);
    expect(s.inventory.gold).toBe(gold + 10);
  });

  it('8. a retry never re-runs what came before the challenge (nobody spawned twice), and props an attempt showed are hidden again', async () => {
    const s = makeStory({ preset: 'p17_complete', challenges: 'failOnce' });
    const spawned = [];
    const spawn = s.staging.spawn.bind(s.staging);
    s.staging.spawn = (npc, opts) => {
      spawned.push(npc);
      return spawn(npc, opts);
    };
    await s.run([
      { spawn: 'pete', x: 9, y: 14 },
      { repair: 'hull', strikes: 2, challenge: STRICT_REPAIR({ id: 'fixture_stage', onFailure: { mustRetry: true } }) },
    ]);
    expect(s.challengeAttempts.length).toBe(2);
    expect(spawned).toEqual(['pete']);
    expect(s.staging.issues).toEqual([]);
    // A flag that shows a prop on the main deck and isn't set at the end of Phase 17, set by a failed attempt.
    const prop = content.maps.require('main_deck').props.find((p) => p.if?.flag && !s.session.story.has(p.if.flag));
    expect(prop, 'a flag-gated prop to test with').toBeTruthy();
    const t = session();
    await direct(t, STRICT_REPAIR({ id: 'fixture_prop' }), [FAIL, WIN], { during: (info) => info.attempt === 1 && t.story.set(prop.if.flag) });
    expect(t.story.has(prop.if.flag)).toBe(false);
  });

  it('9. quest progress made in a failed attempt is rolled back, never doubled', async () => {
    // A quest the prologue hasn't started yet, with a counted objective.
    const s = session('prologue_done');
    const q = 'repair_it_again';
    const o = 'repairs';
    expect(s.quests.start(q)).toBe(true);
    expect(s.quests.isObjectiveAvailable(q, o)).toBe(true);
    const before = s.quests.objState(q, o).progress;
    await direct(s, STRICT_REPAIR({ id: 'fixture_quest' }), [FAIL, FAIL, WIN], { during: () => s.quests.advanceObjective(q, o, 1) });
    expect(s.quests.objState(q, o).progress).toBe(before + 1);
    expect(s.quests.status(q)).toBe('active');
  });

  it('10. many failures in a row leave nothing behind: one active run at a time, bounded history, no leftovers', async () => {
    const s = session();
    const attempts = [...Array(15).fill(FAIL), WIN];
    const { record } = await direct(s, STRICT_REPAIR({ id: 'fixture_many', onFailure: { mustRetry: true } }), attempts);
    expect(record.attempt).toBe(16);
    expect(record.history.length).toBe(HISTORY_LIMIT);
    const log = challengeLog(s);
    expect(log.active.size).toBe(0);
    expect(log.records.length).toBe(1);
    // The same challenge can't run twice at once.
    const run = new ChallengeRun({ session: s, config: challengeConfig(content, STRICT_REPAIR({ id: 'fixture_twice' }), { kind: 'repair' }) }).begin();
    expect(() => new ChallengeRun({ session: s, config: challengeConfig(content, STRICT_REPAIR({ id: 'fixture_twice' }), { kind: 'repair' }) }).begin()).toThrow(/already running/);
    run.abandon();
    expect(log.active.size).toBe(0);
    for (let i = 0; i < 40; i++) await direct(s, STRICT_REPAIR({ id: `fixture_n${i}` }), [WIN]);
    expect(log.records.length).toBeLessThanOrEqual(log.limit.records);
    expect(JSON.stringify(s.serialize())).not.toMatch(/fixture_n|checkpoint/);
  });

  it('11. flags roll back on a retry, except what "keep" names; sticky costs survive every restore', async () => {
    const s = session();
    const [keep, lose] = [...content.flagIds].filter((f) => !s.story.has(f)).slice(0, 2);
    const cfg = STRICT_REPAIR({ id: 'fixture_keep', keep: { flags: [keep] }, onFailure: { mustRetry: true, costs: [{ addVar: 'fixture_planks_lost', value: 1 }] } });
    await direct(s, cfg, [FAIL, FAIL, WIN], {
      during: (info) => {
        if (info.attempt < 3) {
          s.story.set(keep);
          s.story.set(lose);
        }
      },
    });
    expect(s.story.has(keep)).toBe(true);
    expect(s.story.has(lose)).toBe(false);
    expect(s.story.getVar('fixture_planks_lost')).toBe(2);
    // Without a checkpoint nothing is restored (the attempt's changes stand).
    const t = session();
    await direct(t, STRICT_REPAIR({ id: 'fixture_nocp', checkpoint: false, retry: { policy: 'offer', restore: false } }), [FAIL, WIN], { during: (info) => info.attempt === 1 && t.story.set(lose) });
    expect(t.story.has(lose)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------
describe('12. carrying on with consequences', () => {
  it('the consequences run once, the story goes on to the next step, and the record says it was accepted', async () => {
    const s = makeStory({ preset: 'p17_complete', challenges: 'failure' });
    await s.run([
      { repair: 'hull', strikes: 3, challenge: STRICT_REPAIR({ id: 'fixture_carry', onFailure: { continue: true, consequences: [{ addVar: 'fixture_hull_damage', value: 3 }] } }) },
      { setVar: 'fixture_after', value: 1 },
    ]);
    expect(s.challengeRecords[0]).toMatchObject({ outcome: 'failure', accepted: true, consequences: { onFailure: 1, applied: ['onFailure'] } });
    expect(s.session.story.getVar('fixture_hull_damage')).toBe(3);
    expect(s.session.story.getVar('fixture_after')).toBe(1);
  });

  it('a limited challenge always leaves a way forward; a must-win one retries without limit', async () => {
    const s = session();
    const { record, decided } = await direct(s, STRICT_REPAIR({ id: 'fixture_limited', retry: { policy: 'offer', maxAttempts: 2 }, onFailure: { continue: true } }), [FAIL, FAIL, WIN], { decisions: ['retry', 'retry'] });
    expect(decided).toEqual([[1, ['retry', 'continue'], 'retry'], [2, ['continue'], 'retry']]);
    expect(record).toMatchObject({ outcome: 'failure', decision: 'continue', attempt: 2 });
    expect(challengeProblems(content, { kind: 'repair', ...STRICT_REPAIR(), retry: { maxAttempts: 2 } }, { kind: 'repair' }).join()).toMatch(/onFailure.continue must be true/);
    expect(challengeProblems(content, { ...STRICT_REPAIR(), retry: { maxAttempts: 2 }, onFailure: { mustRetry: true } }, { kind: 'repair' }).join()).toMatch(/mustRetry needs unlimited attempts/);
    expect(challengeProblems(content, { ...STRICT_REPAIR(), retry: { policy: 'none' } }, { kind: 'repair' }).join()).toMatch(/onFailure.continue must be true/);
    expect(challengeProblems(content, { ...STRICT_REPAIR(), outcomes: { failure: { bitez: 1 } } }, { kind: 'repair' }).join()).toMatch(/doesn't measure/);
  });

  it('"go back" to an earlier sequence checkpoint resumes the script there, with its state', async () => {
    const s = makeStory({ preset: 'p17_complete', challenges: 'failOnce' });
    s.decideChallenges('fallback');
    await s.run({
      start: [
        { setVar: 'fixture_before', value: 1 },
        { checkpoint: 'fixture_breach', resume: 'breach', label: 'the breach' },
        { goto: 'breach' },
      ],
      breach: [
        { addVar: 'fixture_entered', value: 1 },
        { repair: 'hull', strikes: 2, challenge: STRICT_REPAIR({ id: 'fixture_fallback', onFailure: { mustRetry: true, fallback: 'fixture_breach' } }) },
        { setVar: 'fixture_done', value: 1 },
      ],
    });
    expect(s.challengeDecisions[0]).toMatchObject({ options: ['retry', 'fallback'], choice: 'fallback' });
    // Back to the checkpoint (fixture_entered as it was there), then the node again from the top.
    expect(s.session.story.getVar('fixture_entered')).toBe(1);
    expect(s.session.story.getVar('fixture_done')).toBe(1);
    expect(s.challengeRecords.map((r) => [r.id, r.decision, r.outcome])).toEqual([['fixture_fallback', 'fallback', 'failure'], ['fixture_fallback', null, 'success']]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('13. no existing chapter has opted in', () => {
  it('no script step, map duty entry or duty session in the campaign carries "challenge"', () => {
    const found = [];
    const visit = (v, where) => {
      if (Array.isArray(v)) v.forEach((x) => visit(x, where));
      else if (v && typeof v === 'object') {
        if ('challenge' in v || 'ifSuccess' in v || 'ifFailure' in v || 'ifPartial' in v || 'checkpoint' in v) found.push(where);
        Object.values(v).forEach((x) => visit(x, where));
      }
    };
    for (const id of content.scripts.ids()) visit(content.scripts.get(id), id);
    for (const id of content.maps.ids()) for (const e of content.maps.get(id).sharkDuty ?? []) if (e.challenge) found.push(`${id} sharkDuty`);
    for (const [id, sess] of Object.entries(content.hazards.get('shark_duty').sessions)) if (sess.challenge) found.push(`session ${id}`);
    expect(found).toEqual([]);
  });

  it('every command a challenge needs is declared, so content validation knows it', () => {
    expect(COMMAND_SCHEMAS.repair.challenge).toBe('challenge?');
    expect(COMMAND_SCHEMAS.sashTension.challenge).toBe('challenge?');
    expect(COMMAND_SCHEMAS.checkpoint).toBeTruthy();
  });

  it('content validation rejects a step whose challenge could leave the story with no way forward', () => {
    const files = structuredClone(FILES);
    const scripts = files['/data/story/cutscenes/phase10/ch71_77.json'];
    const id = Object.keys(scripts).find((k) => JSON.stringify(scripts[k]).includes('"repair"'));
    const visit = (v) => {
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') {
        if ('repair' in v && !v.challenge) v.challenge = { failure: true, outcomes: { failure: { completed: false } }, retry: { maxAttempts: 2 } };
        Object.values(v).forEach(visit);
      }
    };
    visit(scripts[id]);
    const db = new ContentDB(files);
    const errors = validateContent(db).errors.join('\n');
    expect(errors).toMatch(/onFailure.continue must be true/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('15. controls: one press, one action', () => {
  it('a second press inside the lock is ignored, and a stale choice can only pick an offered option', async () => {
    const st = createTimingBar({ mode: 'strict', strikes: 3, speed: 150, zone: 26, maxFumbles: 3 }, seededRandom(2));
    stepTimingBar(st, 300);
    const first = pressTimingBar(st);
    expect(['fumble', 'hit']).toContain(first[0].type);
    expect(pressTimingBar(st)).toEqual([{ type: 'locked' }]);
    expect(st.fumbles + st.done).toBe(1);
    const s = session();
    const { record } = await direct(s, STRICT_REPAIR({ id: 'fixture_stale', onFailure: { mustRetry: true } }), [FAIL, WIN], { decisions: ['continue'] });
    // "continue" wasn't offered (must win): the only real option was taken.
    expect(record).toMatchObject({ outcome: 'success', attempt: 2 });
  });
});

// ---------------------------------------------------------------------------------------------
describe('16. saves stay version 17 and never hold a half-finished attempt', () => {
  it('the save format is unchanged; checkpoints and records are per-play only', async () => {
    expect(SAVE_VERSION).toBe(17);
    const s = makeStory({ preset: 'p17_complete', challenges: 'failOnce' });
    await s.run([{ repair: 'hull', strikes: 3, challenge: STRICT_REPAIR({ id: 'fixture_save' }) }]);
    const state = s.session.serialize();
    expect(Object.keys(state).sort()).toEqual(['createdAt', 'inventory', 'location', 'party', 'playTime', 'quests', 'story', 'world']);
    expect(JSON.stringify(state)).not.toMatch(/fixture_save|challengeLog|checkpoint/);
    const t = reloadStory(s);
    expect(t.challengePolicy).toBe('failOnce');
    expect(challengeLog(t.session).records).toEqual([]);
  });

  it('saving in the middle of an attempt saves the story as it is, and loading it starts clean', async () => {
    const s = session();
    const saves = new SaveManager({ storage: new MemoryStorage(), content });
    let saved = null;
    await direct(s, STRICT_REPAIR({ id: 'fixture_midsave' }), [FAIL, WIN], {
      during: (info) => {
        if (info.attempt === 1) {
          s.story.setVar('fixture_mid', 1);
          saved = saves.save(1, s);
        }
      },
    });
    expect(saved.ok).toBe(true);
    const read = saves.read(1);
    expect(read.ok).toBe(true);
    expect(read.state.story.vars.fixture_mid).toBe(1); // what was true when saved
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: read.state });
    expect(challengeLog(loaded).active.size).toBe(0);
    // After the retry the live session rolled fixture_mid back: the save didn't capture a rollback.
    expect(s.story.getVar('fixture_mid', null)).toBe(null);
  });
});

// ---------------------------------------------------------------------------------------------
describe('17. the sash tension tells the ceremony\'s result from the captain\'s intent', () => {
  const trial = content.tension.get('thirty_second_trial');
  const strict = (mechanics) => ({ ...trial, strict: mechanics });
  const judge = (intent, metrics) => evaluateOutcome(CHALLENGE_KINDS.sashTension.intents[intent], metrics, ['success', 'partial', 'failure']).outcome;

  it('letting go on purpose breaks the ceremony and is exactly what a saboteur wanted', () => {
    const r = playTension(strict({ earlyRelease: true }), { early: 12 }, seededRandom(4));
    expect(r).toMatchObject({ ceremony: 'broken', cause: 'deliberate', early: true, deliberate: true });
    expect(judge('sabotage', r)).toBe('success');
    expect(judge('complete', r)).toBe('failure');
  });

  it('an accidental flutter (the grip goes) is the same ceremony result for a different reason', () => {
    const r = playTension(strict({ maxSlips: 0 }), 'slack', seededRandom(4));
    expect(r).toMatchObject({ ceremony: 'broken', cause: 'accident', early: true, released: 'lost' });
    expect(judge('sabotage', r)).toBe('partial');
    expect(judge('complete', r)).toBe('failure');
  });

  it('holding to the cue and letting go completes the trial: a success for the trial, a failure for a saboteur', () => {
    const r = playTension(strict({ maxSlips: 2 }), 'perfect', seededRandom(4));
    expect(r).toMatchObject({ ceremony: 'completed', cause: 'deliberate', early: false, released: 'pressed' });
    expect(judge('complete', r)).toBe('success');
    expect(judge('sabotage', r)).toBe('failure');
    const slipped = playTension(strict({ maxSlips: 2 }), 'noRelease', seededRandom(4));
    expect(slipped).toMatchObject({ ceremony: 'completed', cause: 'accident', released: 'slipped' });
    expect(judge('complete', slipped)).toBe('partial');
  });

  it('pulled too tight for too long, the sash tears; tired hands give out', () => {
    expect(playTension(strict({ breakAt: { value: 97, seconds: 0.8 } }), 'tight', seededRandom(4))).toMatchObject({ ceremony: 'torn', torn: true, cause: 'accident' });
    const tired = playTension(strict({ grip: { max: 100, drain: 30, recover: 1 } }), 'tight', seededRandom(4));
    expect(tired).toMatchObject({ released: 'lost', ceremony: 'broken' });
    expect(tired.grip).toBe(0);
  });

  it('the profiles say so, and the story harness drives the real trial through them', async () => {
    expect(challengeConfig(content, 'sash_deliberate_flutter', { kind: 'sashTension' })).toMatchObject({ intent: 'sabotage', failure: true });
    const s = makeStory({ preset: 'p12_trial', challenges: 'failOnce' });
    await s.enter(s.map, 'p12c4.trial');
    const r = s.challengeRecords.find((x) => x.kind === 'sashTension');
    expect(r).toMatchObject({ outcome: 'success', attempt: 2, intent: 'complete', narrative: { ceremony: 'completed', early: false } });
    expect(r.history[0]).toMatchObject({ outcome: 'failure', reason: 'lost' });
    expect(s.has('sash_fluttered')).toBe(true);
    expect(s.session.story.getVar('trial_released')).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Shark Duty can be lost when a watch opts in', () => {
  /** A deterministic watch: sharks come on DutyPlan's schedule; the captain answers each after `respondMs`. */
  function simulate({ respondMs, limits, seconds = 120 }) {
    const def = content.hazards.get('shark_duty').sessions.first_watch;
    const plan = new DutyPlan(def);
    const watch = new DutyWatch(limits);
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
      if (watch.repelled >= 8) return { lost: null, metrics: watch.metrics({ completed: true }) };
    }
    return { lost: null, metrics: watch.metrics({ completed: false }) };
  }

  it('a quick captain holds the watch; a slow one loses it to bites', () => {
    const quick = simulate({ respondMs: 1500, limits: { maxBites: 3 } });
    expect(quick.lost).toBe(null);
    expect(quick.metrics).toMatchObject({ completed: true, bites: 0 });
    const slow = simulate({ respondMs: 60000, limits: { maxBites: 3 } });
    expect(slow.lost).toBe('bites');
    expect(slow.metrics.bites).toBe(4);
  });

  it('the profile judges the watch: no bites success, a few partial, a lost watch failure', () => {
    const cfg = challengeConfig(content, 'shark_duty_strict', { kind: 'sharkDuty', id: 'sharkDuty:first_watch' });
    const judge = (m) => evaluateOutcome(cfg.outcomes, m, supportedOutcomes('sharkDuty', { strict: true })).outcome;
    expect(judge({ completed: true, bites: 0, missed: 0 })).toBe('success');
    expect(judge({ completed: true, bites: 2, missed: 0 })).toBe('partial');
    expect(judge({ completed: false, bites: 4, missed: 0 })).toBe('failure');
    expect(new DutyWatch({ sectionBites: { port_mid: 1 } }).failure()).toBe(null);
    const w = new DutyWatch({ sectionBites: { port_mid: 1 }, maxMissed: 1 });
    w.bite('port_mid');
    w.bite('port_mid');
    expect(w.failure()).toBe('section:port_mid');
    expect(DutyWatch.fromState({}, w.state()).metrics()).toMatchObject({ bites: 2, worstSection: 2 });
  });
});

// ---------------------------------------------------------------------------------------------
describe('seeds make every attempt reproducible', () => {
  it('the same id and attempt give the same green, and the next attempt a different one', () => {
    const a = createTimingBar({ mode: 'strict', zone: 20 }, seededRandom(attemptSeed('fixture', 1)));
    const b = createTimingBar({ mode: 'strict', zone: 20 }, seededRandom(attemptSeed('fixture', 1)));
    const c = createTimingBar({ mode: 'strict', zone: 20 }, seededRandom(attemptSeed('fixture', 2)));
    expect(a.zoneX).toBe(b.zoneX);
    expect([a.zoneX, c.zoneX].length).toBe(2);
    expect(attemptSeed('fixture', 1)).not.toBe(attemptSeed('fixture', 2));
  });

  it('the test challenges a policy uses are valid configs', () => {
    for (const policy of ['success', 'partial', 'failure', 'failOnce', 'failThenContinue']) {
      for (const kind of ['repair', 'sashTension']) expect(challengeProblems(content, testChallenge(kind, policy), { kind }), `${policy} ${kind}`).toEqual([]);
    }
  });

  it('a legacy strict-free tension run is unchanged by the new code (same seed, same run)', () => {
    const def = content.tension.get('thirty_second_trial');
    const one = createTension(def);
    const two = createTension({ ...def });
    const rnd1 = seededRandom(9);
    const rnd2 = seededRandom(9);
    for (let i = 0; i < 2000; i++) {
      stepTension(one, 1 / 60, { held: i % 3 !== 0 }, rnd1);
      stepTension(two, 1 / 60, { held: i % 3 !== 0, release: true }, rnd2); // "release" means nothing to a legacy trial
    }
    expect(two.value).toBe(one.value);
    expect(two.phase).toBe(one.phase);
    expect(two.slips).toBe(one.slips);
  });
});

// ---------------------------------------------------------------------------------------------
describe('diffs', () => {
  it('report what an attempt changed in story terms', () => {
    const s = session();
    const before = s.serialize();
    s.story.setVar('fixture_var', 2);
    s.inventory.add('hardtack', 1);
    const d = diffStates(before, s.serialize());
    expect(d.vars.fixture_var).toEqual([null, 2]);
    expect(d.items.hardtack).toBe(1);
    expect(isEmptyDiff(diffStates(before, before))).toBe(true);
  });
});
