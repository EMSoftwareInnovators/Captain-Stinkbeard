import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadContent } from '../src/content/loadContent.js';
import { ContentDB } from '../src/content/ContentDB.js';
import { runHarness } from './regression/harness.js';
import { compareToBaselines, readBaselines, baselineRecords, approveBaselines, BASELINE_DIR } from './regression/report.js';
import { compareSnapshots, formatChanges } from './regression/compare.js';
import { measurePhase } from './regression/snapshot.js';
import { PHASES, sessionAt, roomModels } from './regression/world.js';
import { lifecycleFindings, classify } from './regression/crew.js';
import { checkPoints } from './regression/rooms.js';
import { OUTCOMES, CHALLENGE_KINDS, outcomeSupport, applyChallengePolicy, normaliseOutcome } from './regression/challenges.js';
import { makeStory } from './storyHarness.js';

/**
 * The regression harness (docs/gameplay-overhaul/06-regression-harness.md):
 *   - hard invariants that must always hold (story continuity, navigation,
 *     crew lifecycle errors nobody has classified, coordinate sanity, every
 *     interactive system registered);
 *   - the approved baselines (tests/regression/baselines/): any difference
 *     fails, with a readable report, until it is approved on purpose
 *     (npm run regress:approve -- --reason "...");
 *   - the tools themselves, against deliberate differences.
 */
const FILES = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' });
const content = loadContent();
const result = runHarness(content, FILES);

describe('regression harness: hard invariants', () => {
  it('measures the end of all 17 story phases', () => {
    expect(result.snapshots.map((s) => s.preset)).toEqual(PHASES.map((p) => p.preset));
    expect(result.snapshots[0].story.chapter.startsWith('prologue')).toBe(true);
    for (const s of result.snapshots.slice(1)) expect(s.story.chapter.startsWith(`phase${s.phase}_end`), `P${s.phase} ends in ${s.story.chapter}`).toBe(true);
  });

  it('every hard invariant holds', () => {
    const lines = result.invariants.map((v) => `${v.check}${v.phase ? ` (P${v.phase})` : ''}: ${v.message}`);
    expect(lines, `Hard invariants failing (fix them; approving baselines can't hide these):\n${lines.join('\n')}`).toEqual([]);
  });

  it('every known crew issue still describes something real (fixed ones come out of known-issues.json)', () => {
    const stale = result.lifecycle.resolved.map((k) => `${k.type} ${k.npc}${k.phases ? ` P${k.phases.join(',P')}` : ''} (${k.status})`);
    expect(stale, `These known issues are no longer found: remove them from tests/regression/known-issues.json:\n${stale.join('\n')}`).toEqual([]);
  });
});

describe('regression harness: the approved baselines', () => {
  it('has a baseline for every phase and summary', () => {
    const have = Object.keys(readBaselines());
    expect(have.sort()).toEqual(Object.keys(baselineRecords(result)).sort());
  });

  it('the game still measures exactly as approved', () => {
    const changes = compareToBaselines(result);
    expect(changes.length, `${formatChanges(changes, { limit: 20 })}\n\nReview with "npm run regress:compare". If every change is intended, approve it with\nnpm run regress:approve -- --reason "what changed and why"`).toBe(0);
  });
});

describe('regression harness: the tools catch deliberate differences', () => {
  const p14 = result.snapshots.find((s) => s.phase === 14);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const severities = (changes, area) => changes.filter((c) => !area || c.area.startsWith(area)).map((c) => c.severity);

  it('an identical snapshot has no changes, whatever order its keys are in', () => {
    expect(compareSnapshots(p14, clone(p14))).toEqual([]);
    const reversed = (v) => (Array.isArray(v) ? v.map(reversed) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).reverse().map(([k, x]) => [k, reversed(x)])) : v);
    expect(compareSnapshots(p14, reversed(p14))).toEqual([]);
  });

  it('a character who stops being placed is a warning; one placed twice, or on a wall, is a regression', () => {
    const cur = clone(p14);
    cur.crew.pete = 'away (galley:fixture_row)';
    expect(severities(compareSnapshots(p14, cur), 'crew.pete')).toEqual(['warning']);
    cur.crew.pete = 'duplicate galley@10,7 + main_deck@9,6';
    expect(severities(compareSnapshots(p14, cur), 'crew.pete')).toEqual(['regression']);
    cur.crew.pete = 'present galley@0,0 [on-solid-tile]';
    expect(severities(compareSnapshots(p14, cur), 'crew.pete')).toEqual(['regression']);
  });

  it('fewer crew in the hold and fewer choke tiles read as improvements; a lost exit or objective target as regressions', () => {
    const cur = clone(p14);
    cur.crewSummary.byRoom.cargo_hold = cur.crewSummary.byRoom.cargo_hold.slice(0, 4);
    cur.rooms.main_deck.chokeTiles -= 10;
    cur.rooms.galley.unreachableObjectiveTargets = ['p99_fixture@3,3'];
    const exit = cur.rooms.galley.exits.find((e) => !e.shadowedBy);
    exit.reachable = false;
    const changes = compareSnapshots(p14, cur);
    const text = formatChanges(changes);
    expect(text).toMatch(/IMPROVED\s+crew\.rooms: crew in cargo_hold: 11 -> 4/);
    expect(text).toMatch(/IMPROVED\s+rooms\.main_deck: chokeTiles \d+ -> \d+ \(better\)/);
    expect(text).toMatch(/REGRESSION\s+rooms\.galley: unreachableObjectiveTargets: new p99_fixture@3,3/);
    expect(text).toMatch(new RegExp(`REGRESSION\\s+rooms\\.galley: exit ${exit.id}`));
  });

  it('a flag a phase stops setting, or a quest it stops completing, is a regression', () => {
    const cur = clone(p14);
    const flag = cur.story.flags.added.pop();
    cur.story.quests.completedIds = cur.story.quests.completedIds.slice(1);
    const text = formatChanges(compareSnapshots(p14, cur));
    expect(text).toContain(`REGRESSION story.flags: no longer set by this phase: ${flag}`);
    expect(text).toMatch(/REGRESSION story\.quests: no longer completed/);
  });

  it('a content change that places someone in two rooms is caught as a NEW lifecycle error', () => {
    const files = structuredClone(FILES);
    const deck = Object.keys(files).find((f) => f.endsWith('/phase17/main_deck.patch.json'));
    files[deck].objects.unshift({ id: 'fixture_dup_pete', type: 'npc', npc: 'pete', x: 9, y: 14, if: { flag: 'p17_complete' } });
    const mutated = new ContentDB(files);
    const phases = PHASES.slice(-2);
    const byPhase = phases.map((ph) => {
      const m = measurePhase(mutated, ph);
      return { n: ph.n, crew: m.crew, required: m.required };
    });
    expect(byPhase[1].crew.pete.state).toBe('duplicate');
    const { findings } = classify(lifecycleFindings(mutated, byPhase), []);
    expect(findings.find((f) => f.type === 'duplicate' && f.npc === 'pete')).toMatchObject({ status: 'new', phases: [17] });
  });

  it('the navigation check answers for points a layout change must keep reachable', () => {
    const session = sessionAt(content, 'p17_complete');
    const deck = roomModels(content).get('main_deck');
    const [helm, sea, door] = checkPoints(content, deck, session, [
      { kind: 'station', id: 'helm', x: 9, y: 6 },
      { kind: 'fixture', id: 'open sea', x: 0, y: 0 },
      { kind: 'exit', id: 'to_cabin', x: 9, y: 11 },
    ]);
    expect(helm.reachable).toBe(true);
    expect(sea.reachable).toBe(false);
    expect(door.reachable).toBe(true);
  });

  it('approving needs a reason, refuses while an invariant fails, and writes only where it is told', () => {
    expect(() => approveBaselines(result, { reason: '' })).toThrow(/needs a reason/);
    expect(() => approveBaselines({ ...result, invariants: [{ check: 'crew', message: 'fixture' }] }, { reason: 'fixture' })).toThrow(/refusing to approve/);
    const before = fs.readdirSync(BASELINE_DIR).map((f) => [f, fs.statSync(path.join(BASELINE_DIR, f)).mtimeMs]);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'regress-'));
    try {
      const dry = approveBaselines(result, { reason: 'fixture', dir, dryRun: true });
      expect(dry.written.length).toBe(Object.keys(baselineRecords(result)).length);
      expect(fs.readdirSync(dir)).toEqual([]);
      approveBaselines(result, { reason: 'fixture approval', dir, date: '2000-01-01' });
      expect(compareToBaselines(result, readBaselines(dir))).toEqual([]);
      expect(fs.readFileSync(path.join(dir, 'APPROVALS.md'), 'utf8')).toContain('Reason: fixture approval');
      expect(approveBaselines(result, { reason: 'again', dir }).written).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    // Comparing never touches the approved baselines.
    compareToBaselines(result);
    expect(fs.readdirSync(BASELINE_DIR).map((f) => [f, fs.statSync(path.join(BASELINE_DIR, f)).mtimeMs])).toEqual(before);
  });
});

describe('challenge outcome contract', () => {
  it('has one vocabulary and an honest registry', () => {
    expect(OUTCOMES).toEqual(['success', 'partial', 'failure', 'unsupported']);
    // What the game can't do today is recorded as unsupported, not invented.
    expect(outcomeSupport('repair')).toEqual({ success: true, partial: true, failure: false });
    expect(outcomeSupport('sashTension').failure).toBe(false);
    expect(outcomeSupport('sharkDuty').failure).toBe(false);
    expect(outcomeSupport('battle')).toEqual({ success: true, partial: true, failure: true });
    expect(outcomeSupport('course')).toEqual({ success: false, partial: false, failure: false });
    // Prompt 3: three kinds can fail for real once a step opts in; none has yet.
    for (const kind of ['repair', 'sharkDuty', 'sashTension']) {
      expect(outcomeSupport(kind, { optIn: true }), kind).toEqual({ success: true, partial: true, failure: true });
      expect(result.challenges.usage[kind].optedIn, `${kind} steps opted in`).toBe(0);
    }
    expect(outcomeSupport('course', { optIn: true })).toEqual(outcomeSupport('course'));
    for (const k of Object.values(CHALLENGE_KINDS)) expect(typeof k.blocksProgression).toBe('boolean');
    expect(result.challenges.usage.repair.scripts).toBeGreaterThan(100);
  });

  it('drives the story harness and reads outcomes back in the shared vocabulary', async () => {
    const s = makeStory({ preset: 'p17_complete' });
    expect(applyChallengePolicy(s, 'success')).toMatchObject({ repair: 'success', teller: 'success', battle: 'success' });
    expect(applyChallengePolicy(s, 'partial')).toMatchObject({ repair: 'partial', sashTension: 'partial' });
    await s.run([{ repair: 'hull', strikes: 3, var: 'regress_fixture_strikes' }]);
    expect(normaliseOutcome('repair', s.session.story.getVar('regress_fixture_strikes'), { strikes: 3 })).toBe('partial');
    // The timing bar can't fail today: the policy says so instead of faking it.
    expect(applyChallengePolicy(s, 'failure')).toMatchObject({ repair: 'unsupported', sashTension: 'unsupported', teller: 'failure', battle: 'failure' });
  });
});
