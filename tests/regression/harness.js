import { COMMAND_SCHEMAS } from '../../src/systems/script/commandSchemas.js';
import { StagingTracker } from '../storyStaging.js';
import { PHASES, sessionAt, roomModels } from './world.js';
import { measureAll } from './snapshot.js';
import { lifecycleFindings, classify, LIFECYCLE_ERRORS } from './crew.js';
import { coordinateIndex, coordinateSummary } from './coords.js';
import { challengeSummary, CHALLENGE_KINDS } from './challenges.js';
import knownIssues from './known-issues.json' with { type: 'json' };

/**
 * One call that measures everything (docs/gameplay-overhaul/06-regression-harness.md):
 * the 17 phase-end snapshots, the classified crew lifecycle, the
 * fixed-position reference summary, the challenge registry summary, and the
 * hard invariants. Used by tests/regression.test.js and tools/regress.mjs.
 */

/**
 * Script commands that are not challenges (presentation, story bookkeeping,
 * movement). A command missing from both this list and the challenge registry
 * fails the invariants: a new interactive system must be registered.
 */
export const NON_CHALLENGE_COMMANDS = Object.freeze([
  'addVar', 'advanceObjective', 'ambience', 'anim', 'atmosphere', 'banner', 'bark', 'beard', 'beardPuff', 'burst', 'call', 'camera', 'channelEpisode', 'checkpoint',
  'choice', 'clearFlag', 'clearTokens', 'close', 'completeObjective', 'completeQuest', 'deadCenter', 'despawn', 'effect', 'emote', 'end', 'event', 'face',
  'fade', 'flash', 'fly', 'fumeCloud', 'giveGold', 'giveItem', 'giveXp', 'goto', 'grandCurrency', 'heal', 'hideObject', 'hop', 'hornets', 'insert',
  'joinParty', 'learnAbility', 'leaveParty', 'logbook', 'markObject', 'move', 'moveSprite', 'music', 'narrate', 'parallel', 'place', 'propFx',
  'removeSprite', 'respawn', 'restage', 'roll', 'save', 'say', 'setFlag', 'setValue', 'setVar', 'sfx', 'shake', 'sharkEvent', 'sharks', 'sharkstorm',
  'shipDamage', 'shipRestore', 'shop',
  // Prompt 6 hazards: starting and ending them, and the emergency work (a patch is a challenge: patchLeak in the registry).
  'leak', 'flood', 'drain', 'ignite', 'extinguish', 'sealLeak', 'hazardClock', 'hazardAction', 'emergency',
  'airSource', 'airStop', 'airAdd', 'airVent', 'airConnection', 'airCheck', 'airControl', 'showObject', 'spawn', 'sprite', 'spriteFrame', 'stability', 'startQuest', 'swapItem', 'takeGold', 'takeItem', 'tether', 'tint', 'token',
  'transition', 'tutorial', 'tvProgram', 'tvSet', 'vista', 'vistaEnd', 'vistaFrame', 'vistaFx', 'vistaMove', 'vistaShow', 'vistaSpin', 'wait', 'wear',
]);

/** Exits reachable past the people standing in each room, from every arrival point (the story tests' staging rule). */
function stagingIssues(content, phase) {
  const session = sessionAt(content, phase.preset);
  const tracker = new StagingTracker(content, session);
  for (const map of content.maps.ids()) tracker.checkRoom(map);
  return tracker.issues;
}

/** Hard invariants: things that must hold whatever the layout or the crew plan. Each violation explains itself. */
export function invariants(content, result) {
  const v = [];
  const add = (check, message, phase = null) => v.push({ check, phase, message });
  if (result.snapshots.length !== PHASES.length) add('coverage', `expected ${PHASES.length} phase snapshots, got ${result.snapshots.length}`);
  const allowedOpen = new Map(knownIssues.quests.map((q) => [q.quest, q]));
  for (const s of result.snapshots) {
    for (const c of s.story.chapterStarts.failing) add('story', `chapter ${c} has started by now, but its start condition no longer holds`, s.phase);
    for (const q of s.story.quests.unexpectedOpen) {
      const k = allowedOpen.get(q);
      if (!k || !k.phases.includes(s.phase)) add('story', `quest ${q} is still active at the end of the phase and isn't open by design or listed in known-issues.json`, s.phase);
    }
    for (const [room, r] of Object.entries(s.rooms)) {
      for (const t of r.unreachableObjectiveTargets) add('navigation', `${room}: ${t} is needed by an open objective and the captain can't reach it`, s.phase);
      for (const e of r.exits) if (!e.reachable && !e.shadowedBy) add('navigation', `${room}: exit ${e.id} (${e.at}) can't be reached from any arrival point`, s.phase);
    }
  }
  for (const phase of PHASES) for (const issue of stagingIssues(content, phase)) add('staging', issue, phase.n);
  for (const f of result.lifecycle.findings) {
    if (f.status === 'new' && LIFECYCLE_ERRORS.includes(f.type)) add('crew', `${f.type} ${f.npc} (${f.phases.map((p) => `P${p}`).join(', ')}): ${f.detail}. Fix it, or classify it in tests/regression/known-issues.json`);
  }
  for (const r of result.coords.outOfBounds) add('coordinates', `outside its room: ${r}`);
  for (const r of result.coords.missingObjectiveObjects) add('coordinates', `objective target names an object that doesn't exist: ${r}`);
  const registered = new Set(Object.values(CHALLENGE_KINDS).flatMap((k) => k.commands));
  for (const cmd of Object.keys(COMMAND_SCHEMAS)) {
    if (!registered.has(cmd) && !NON_CHALLENGE_COMMANDS.includes(cmd)) add('challenges', `script command "${cmd}" is neither a registered challenge (tests/regression/challenges.js) nor listed as non-challenge (harness.js)`);
  }
  return v;
}

/** Everything, measured once. `files` is the raw /data map (for the coordinate index). */
export function runHarness(content, files) {
  roomModels(content);
  const { snapshots, lifecycle } = measureAll(content);
  const raw = lifecycleFindings(content, lifecycle, { storageRooms: knownIssues.storageRooms, shelterPhases: knownIssues.shelterPhases });
  const classified = classify(raw, knownIssues.crew);
  const refs = coordinateIndex(files, content);
  const result = {
    snapshots,
    lifecycle: classified,
    coordRefs: refs,
    coords: coordinateSummary(refs),
    challenges: challengeSummary(content),
  };
  result.invariants = invariants(content, result);
  return result;
}

/** The lifecycle record a baseline keeps: findings with their status, sorted, and resolved known issues. */
export function lifecycleBaseline(lifecycle) {
  return {
    findings: lifecycle.findings.map((f) => `${f.status} ${f.type} ${f.npc} ${f.phases.map((p) => `P${p}`).join(',')}: ${f.detail}`),
    resolvedKnownIssues: lifecycle.resolved.map((k) => `${k.type} ${k.npc}${k.phases ? ` ${k.phases.map((p) => `P${p}`).join(',')}` : ''}`),
  };
}

export { knownIssues };
