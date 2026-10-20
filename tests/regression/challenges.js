import { commandNameOf } from '../../src/systems/script/commandSchemas.js';
import { phaseOfChapter } from './world.js';

/**
 * The challenge-outcome contract (docs/gameplay-overhaul/04-gameplay-systems.md, S0),
 * at test level only: a shared vocabulary, a registry of what each existing
 * challenge can actually do today, an inventory of where each one is used,
 * and a way to drive the headless story harness's existing mock results.
 * Nothing here changes how the game plays.
 */

/** The outcome vocabulary. `unsupported` = the game has no way to produce that outcome for this challenge. */
export const OUTCOMES = Object.freeze(['success', 'partial', 'failure', 'unsupported']);

/**
 * Every existing interactive system, with what it supports today (verified
 * against the source named in `source`). `input`: timed | choice | real-time |
 * none (presentation only). `blocksProgression`: can an outcome stop the
 * chapter from being finished? `retry`: how a failed attempt comes back.
 */
export const CHALLENGE_KINDS = Object.freeze({
  repair: {
    label: 'Timing bar (repair and its 38 variants)', commands: ['repair'], input: 'timed',
    outcomes: { success: 'always, eventually: the green zone widens after 3 misses and fills the bar after 5', partial: 'clean-strike count, only when the step stores it in "var"', failure: null },
    retry: 'not needed (cannot fail)', blocksProgression: false, softlockRisk: 'none known', source: 'src/systems/timingBar.js (legacy mode), src/scenes/OverlayScene.js, src/systems/script/commands.js (repair)',
    optIn: { outcomes: { success: 'the profile\'s success rule (e.g. no fumbles)', partial: 'done, with fumbles (or the profile\'s partial rule)', failure: 'strict mode: past "maxFumbles", or out of "timeLimit"' }, retry: 'from the challenge checkpoint, as the config allows', source: 'src/systems/timingBar.js (strict mode), src/systems/challenge/' },
  },
  sharkDuty: {
    label: 'Shark Duty', commands: ['sharkDuty'], mapKey: 'sharkDuty', input: 'real-time',
    outcomes: { success: 'always: the session ends when its waves are done', partial: 'bites leave hull patches and add to "duty_bites"', failure: null },
    retry: 'not needed (its bar "can\'t be failed")', blocksProgression: false, softlockRisk: 'none known', source: 'src/systems/hazards/sharkDuty.js, src/world/SharkDuty.js',
    optIn: { outcomes: { success: 'the watch ends with no bites (or the profile\'s rule)', partial: 'the watch ends with some bites', failure: 'DutyWatch limits: bites, a section overrun, failed shoves, the clock' }, retry: 'from the start of the watch', source: 'src/systems/hazards/sharkDuty.js (DutyWatch), src/world/SharkDuty.js, src/systems/challenge/' },
  },
  sashTension: {
    label: 'Sash tension hold', commands: ['sashTension'], input: 'timed',
    outcomes: { success: 'always ("never fails")', partial: 'slips stored in "var"; whether the release was pressed in "releasedVar"', failure: null },
    retry: 'not needed', blocksProgression: false, softlockRisk: 'none known', source: 'src/systems/tension.js, src/systems/script/commands.js (sashTension)',
    optIn: { outcomes: { success: 'by intent: the trial completed (complete) or a deliberate early flutter (sabotage)', partial: 'by intent: completed but slipped, or an accidental flutter', failure: 'strict: the grip lost, the sash torn, or the wrong outcome for the intent' }, retry: 'from the challenge checkpoint', source: 'src/systems/tension.js (strict), src/systems/challenge/' },
  },
  teller: {
    label: 'Teller window (bank, branch, dispensary, credit)', commands: ['bank', 'bankDeposit'], input: 'timed',
    outcomes: { success: 'a clean deposit (grade 2)', partial: 'rocked (grade 1)', failure: 'blown back (grade 0), recorded in the bank\'s gradeVar; the queue moves on' },
    retry: 'none: the next customer comes', blocksProgression: false, softlockRisk: 'none known', source: 'src/systems/bank.js, src/systems/script/commands.js (bank, bankDeposit)',
  },
  proceeding: {
    label: 'Proceedings (form, hearing, pitch)', commands: ['proceeding'], input: 'choice',
    outcomes: { success: 'form filed / hearing passed / pitch convinced', partial: 'points short of the goal while rounds remain', failure: 'hearing short of "pass" or pitch at "max" pressure' },
    retry: 'built in: back to the first question (hearing) or a checkpoint (pitch)', blocksProgression: false, softlockRisk: 'none known ("nothing can be lost for good")', source: 'src/systems/proceedings.js',
  },
  reassure: {
    label: 'Brogath reassurance prompt', commands: ['reassure'], input: 'choice',
    outcomes: { success: 'a calming answer (pressure falls)', partial: null, failure: 'a triggering answer (pressure rises; an incident may follow)' },
    retry: 'script-dependent', blocksProgression: false, softlockRisk: 'none known', source: 'src/systems/stability.js, src/systems/script/commands.js (reassure)',
  },
  appraise: {
    label: 'Appraisal (credit underwriting)', commands: ['appraise'], input: 'choice',
    outcomes: { success: 'picks scored into the bonus variable', partial: 'a lower score', failure: null },
    retry: 'not needed', blocksProgression: false, softlockRisk: 'none known', source: 'src/systems/credit.js',
  },
  tvKnobs: {
    label: 'TV knob panel', commands: ['tv'], when: (step) => step.mode === 'knobs', input: 'choice',
    outcomes: { success: 'the panel ends on its working knob', partial: 'wrong knobs do something, then the panel goes on', failure: null },
    retry: 'built in', blocksProgression: false, softlockRisk: 'none known', source: 'src/systems/tv/tv.js, src/ui/TvView.js',
  },
  tvCloseUp: {
    label: 'TV close-up (power, channels, wiring)', commands: ['tv'], when: (step) => step.mode !== 'knobs', input: 'choice',
    outcomes: { success: 'the set is left as the scene then checks it (on, or on a channel)', partial: null, failure: null },
    retry: 'step away and work the set again', blocksProgression: false, softlockRisk: 'none known', source: 'src/systems/tv/tv.js, src/ui/TvView.js',
  },
  battle: {
    label: 'Turn-based battle', commands: ['battle'], mapKey: 'enemy', input: 'timed',
    outcomes: { success: 'win', partial: 'flee (where allowed)', failure: 'lose: Game Over and a retry from the autosave, or the loseText for a nonLethal encounter' },
    retry: 'Game Over offers the autosave; nonLethal encounters can be repeated', blocksProgression: false, softlockRisk: 'none known', source: 'src/scenes/BattleScene.js, src/scenes/GameOverScene.js',
  },
  fumeExposure: {
    label: 'Fume exposure', commands: [], mapKey: 'fumes', input: 'real-time',
    outcomes: { success: 'get out before exposure fills', partial: 'exposure taken', failure: 'collapse: the fumeCollapse script carries the captain out (non-fatal)' },
    retry: 'walk back in', blocksProgression: false, softlockRisk: 'none known', source: 'src/systems/hazards/fumes.js, src/scenes/WorldScene.js',
  },
  dice: {
    label: 'Grand Dice', commands: ['dice'], input: 'none',
    outcomes: { success: null, partial: null, failure: null },
    retry: '-', blocksProgression: false, softlockRisk: 'none', note: 'presentation: the script decides the result', source: 'src/systems/script/commands.js (dice)',
  },
  course: {
    label: 'Course dial', commands: ['course'], input: 'none',
    outcomes: { success: null, partial: null, failure: null },
    retry: '-', blocksProgression: false, softlockRisk: 'none', note: 'presentation: the heading drifts on its own', source: 'src/scenes/OverlayScene.js (course)',
  },
  alarm: {
    label: 'Bell alarm', commands: ['alarm'], input: 'none',
    outcomes: { success: null, partial: null, failure: null },
    retry: '-', blocksProgression: false, softlockRisk: 'none', note: 'presentation', source: 'src/systems/hazards/alarms.js',
  },
  lighter: {
    label: 'The Grand Lighter', commands: ['lighter'], input: 'none',
    outcomes: { success: null, partial: null, failure: null },
    retry: '-', blocksProgression: false, softlockRisk: 'none', note: 'presentation: attempts follow the novelty data', source: 'src/systems/novelty.js',
  },
  fartZone: {
    label: 'Fart Zone procedure', commands: ['fartZone'], input: 'none',
    outcomes: { success: null, partial: null, failure: null },
    retry: '-', blocksProgression: false, softlockRisk: 'none known', note: 'rules: a release waits until the door is shut and the portholes open; the player does the steps by inspecting', source: 'src/systems/fartZone.js',
  },
  conversion: {
    label: 'Currency conversion', commands: ['convert', 'currencyConverter'], input: 'none',
    outcomes: { success: null, partial: null, failure: null },
    retry: '-', blocksProgression: false, softlockRisk: 'none', note: 'presentation', source: 'src/systems/credit.js',
  },
});

/** What a challenge kind can produce today: { success, partial, failure } as booleans. */
/**
 * What a kind can report: as the campaign plays it (legacy), or, with
 * `optIn`, once a step opts into a challenge (src/systems/challenge/,
 * docs/gameplay-overhaul/07-challenge-outcomes.md). Kinds without an opt-in
 * report their legacy support either way.
 */
export function outcomeSupport(kind, { optIn = false } = {}) {
  const k = CHALLENGE_KINDS[kind];
  if (!k) throw new Error(`unknown challenge kind "${kind}"`);
  const o = optIn && k.optIn ? k.optIn.outcomes : k.outcomes;
  return { success: !!o.success, partial: !!o.partial, failure: !!o.failure };
}

/** Which registry entry a script step belongs to, or null. */
export function kindOfStep(step) {
  if (!step || typeof step !== 'object' || Array.isArray(step)) return null;
  // The game's own rule for which key is the command: "tv" is also a
  // parameter of tvProgram and channelEpisode.
  let name;
  try {
    name = commandNameOf(step);
  } catch {
    return null;
  }
  for (const [id, k] of Object.entries(CHALLENGE_KINDS)) {
    if (k.commands.includes(name) && (!k.when || k.when(step))) return id;
  }
  return null;
}

/** Story flags a script sets (anywhere in it). */
function flagsSetIn(steps) {
  const out = new Set();
  const visit = (v) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') {
      for (const f of [].concat(v.setFlag ?? [])) out.add(f);
      Object.values(v).forEach(visit);
    }
  };
  visit(steps);
  return [...out].sort();
}

/**
 * Every challenge step in the scripts, plus the maps that run Shark Duty,
 * fight battles or have fume zones. One record per step:
 * { kind, script, chapter, phase, storesResult, resultRead, flagsAfter }.
 * `flagsAfter`: flags the same script sets (what completing it leads to).
 */
export function challengeInventory(content) {
  const instances = [];
  const readNames = new Set();
  const allScripts = content.scripts.ids();
  for (const id of allScripts) {
    const s = JSON.stringify(content.scripts.get(id));
    for (const m of s.matchAll(/"name":"([a-z0-9_]+)"/g)) readNames.add(m[1]);
  }
  for (const id of allScripts) {
    const steps = content.scripts.get(id);
    const prefix = id.split('.')[0];
    const chapter = id.startsWith('cutscene.') ? 'prologue' : phaseOfChapter(prefix) ? prefix : null;
    const flags = flagsSetIn(steps);
    const visit = (v) => {
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') {
        const kind = kindOfStep(v);
        if (kind) {
          const stored = [v.var, v.releasedVar, v.bonusVar].filter(Boolean);
          instances.push({ kind, script: id, chapter, phase: chapter ? phaseOfChapter(chapter === 'prologue' ? 'prologue' : chapter) : null, storesResult: stored, resultRead: stored.some((n) => readNames.has(n)), flagsAfter: flags.length, optedIn: v.challenge !== undefined });
        }
        Object.values(v).forEach(visit);
      }
    };
    visit(steps);
  }
  for (const map of content.maps.ids()) {
    const def = content.maps.get(map);
    for (const e of def.sharkDuty ?? []) instances.push({ kind: 'sharkDuty', map, session: e.session ?? null, phase: null, optedIn: e.challenge !== undefined });
    for (const o of def.objects ?? []) if (o.type === 'enemy') instances.push({ kind: 'battle', map, encounter: o.encounter, phase: null });
    for (const f of def.fumes ?? []) instances.push({ kind: 'fumeExposure', map, zone: f.id ?? null, phase: null });
  }
  return instances;
}

/** Counts per kind (and per phase for script steps): what the baseline keeps. */
export function challengeSummary(content) {
  const inv = challengeInventory(content);
  const byKind = {};
  for (const i of inv) {
    const k = (byKind[i.kind] ??= { total: 0, scripts: 0, maps: 0, storingResult: 0, resultRead: 0, optedIn: 0, byPhase: {} });
    k.total++;
    if (i.optedIn) k.optedIn++;
    if (i.script) {
      k.scripts++;
      if (i.storesResult?.length) k.storingResult++;
      if (i.resultRead) k.resultRead++;
      if (i.phase) k.byPhase[`P${i.phase}`] = (k.byPhase[`P${i.phase}`] ?? 0) + 1;
    } else k.maps++;
  }
  const commands = new Set();
  for (const id of content.scripts.ids()) {
    const visit = (v) => {
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') {
        for (const key of Object.keys(v)) commands.add(key);
        Object.values(v).forEach(visit);
      }
    };
    visit(content.scripts.get(id));
  }
  return {
    vocabulary: OUTCOMES,
    kinds: Object.fromEntries(Object.entries(CHALLENGE_KINDS).map(([id, k]) => [id, { label: k.label, input: k.input, support: outcomeSupport(id), ...(k.optIn ? { optIn: outcomeSupport(id, { optIn: true }) } : {}), retry: k.retry, blocksProgression: k.blocksProgression, softlockRisk: k.softlockRisk }])),
    usage: byKind,
    commandsSeen: [...commands].filter((c) => Object.values(CHALLENGE_KINDS).some((k) => k.commands.includes(c))).sort(),
  };
}

/**
 * Drives the headless story harness's existing mock results
 * (tests/storyHarness.js) for one outcome. Returns, per kind, what the policy
 * set, or "unsupported" where the game can't produce that outcome. Never
 * invents an outcome the game can't reach.
 */
export function applyChallengePolicy(story, outcome) {
  if (!OUTCOMES.includes(outcome) || outcome === 'unsupported') throw new Error(`no policy for outcome "${outcome}"`);
  const applied = {};
  const set = (kind, fn) => {
    if (!outcomeSupport(kind)[outcome]) {
      applied[kind] = 'unsupported';
      return;
    }
    fn();
    applied[kind] = outcome;
  };
  set('repair', () => story.setRepairScore(outcome === 'success' ? null : 1));
  set('sashTension', () => story.setTensionResult(outcome === 'success' ? { slips: 0, released: 'pressed' } : { slips: 3, released: 'pressed' }));
  set('teller', () => story.setTellerResult({ grades: [{ success: 'perfect', partial: 'good', failure: 'miss' }[outcome]], slips: outcome === 'success' ? 0 : 1 }));
  if (typeof story.setBattleResult === 'function') set('battle', () => story.setBattleResult({ success: 'win', partial: 'flee', failure: 'lose' }[outcome]));
  return applied;
}

/** Normalises a harness or game result to the vocabulary: repair clean strikes, tension slips, teller grades, battle results. */
export function normaliseOutcome(kind, result, extra = {}) {
  switch (kind) {
    case 'repair': return result >= (extra.strikes ?? 3) ? 'success' : 'partial';
    case 'sashTension': return (result?.slips ?? 0) === 0 ? 'success' : 'partial';
    case 'teller': return { 2: 'success', 1: 'partial', 0: 'failure' }[result] ?? 'unsupported';
    case 'battle': return { win: 'success', flee: 'partial', lose: 'failure' }[result] ?? 'unsupported';
    default: return outcomeSupport(kind).success ? 'success' : 'unsupported';
  }
}
