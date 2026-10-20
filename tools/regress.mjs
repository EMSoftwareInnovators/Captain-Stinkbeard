#!/usr/bin/env node
// Regression harness command line (docs/gameplay-overhaul/06-regression-harness.md).
//
//   node tools/regress.mjs summary            everything: invariants, changes against the baselines, key numbers (npm run regress)
//   node tools/regress.mjs snapshot           write the 17 phase-end snapshots to tmp/regression/current/
//   node tools/regress.mjs compare            what changed against tests/regression/baselines/ (exit 1 if anything did)
//   node tools/regress.mjs approve --reason "..." [--dry-run]
//                                             accept the current state as the new baselines (refused while an invariant fails)
//   node tools/regress.mjs crew               crew placement per phase and lifecycle findings
//   node tools/regress.mjs rooms              room navigation and clutter per phase
//   node tools/regress.mjs coords [--room id] fixed-position references by room and file
//   node tools/regress.mjs challenges         the challenge outcome registry and where each challenge is used
//
// Reports go to tmp/regression/ (git-ignored). Exit codes: 0 fine, 1 differences or failing invariants, 2 usage error.
import { execSync } from 'node:child_process';
import { readDataFiles } from './lib/content.mjs';
import { ContentDB } from '../src/content/ContentDB.js';
import { runHarness } from '../tests/regression/harness.js';
import { compareToBaselines, approveBaselines, writeReports, keyMetrics, BASELINE_DIR } from '../tests/regression/report.js';
import { formatChanges } from '../tests/regression/compare.js';
import { formatCoordinateReport } from '../tests/regression/coords.js';

const [cmd = 'summary', ...rest] = process.argv.slice(2);
const opt = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? (rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[i + 1] : true) : null;
};

const t0 = Date.now();
const files = readDataFiles(process.cwd());
const content = new ContentDB(files);
if (content.loadErrors.length) {
  console.error(`content failed to load:\n${content.loadErrors.join('\n')}`);
  process.exit(1);
}
const result = runHarness(content, files);
const ms = () => `${((Date.now() - t0) / 1000).toFixed(1)} s`;
const changes = compareToBaselines(result);
const invariantsLine = result.invariants.length ? `Hard invariants: ${result.invariants.length} FAILING` : 'Hard invariants: all hold';

switch (cmd) {
  case 'summary': {
    const paths = writeReports(result, changes, content);
    console.log(invariantsLine);
    for (const v of result.invariants) console.log(`  ${v.check}${v.phase ? ` (P${v.phase})` : ''}: ${v.message}`);
    console.log('');
    console.log(formatChanges(changes, { limit: 12 }));
    console.log('');
    console.log('Phase | crew in hold | duplicates | deck chokes | quarters chokes | people on chokes | story props (main rooms) | unreachable scenery');
    for (const m of keyMetrics(result)) console.log(`P${String(m.phase).padEnd(4)} | ${String(m.crewInHold).padEnd(12)} | ${String(m.duplicates).padEnd(10)} | ${String(m.deckChokes).padEnd(11)} | ${String(m.quartersChokes).padEnd(15)} | ${String(m.peopleOnChokes).padEnd(16)} | ${String(m.storyPropsMainRooms).padEnd(24)} | ${m.unreachableScenery}`);
    console.log(`\nReports: ${Object.values(paths).join(', ')} (${ms()})`);
    process.exit(result.invariants.length || changes.length ? 1 : 0);
    break;
  }
  case 'snapshot': {
    writeReports(result, changes, content, ['summary']);
    console.log(`Wrote ${result.snapshots.length} phase snapshots and the summary records to tmp/regression/current/ (${ms()}). Baselines are untouched: compare with "npm run regress:compare".`);
    break;
  }
  case 'compare': {
    writeReports(result, changes, content, ['summary']);
    console.log(invariantsLine);
    for (const v of result.invariants) console.log(`  ${v.check}${v.phase ? ` (P${v.phase})` : ''}: ${v.message}`);
    console.log('');
    console.log(formatChanges(changes, { limit: opt('all') ? 100000 : 30 }));
    if (changes.length) console.log('\nFull list: tmp/regression/changes.md. If every change is intended: npm run regress:approve -- --reason "what changed and why"');
    process.exit(result.invariants.length || changes.length ? 1 : 0);
    break;
  }
  case 'approve': {
    const reason = opt('reason');
    let commit = null;
    try {
      commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      commit = null;
    }
    try {
      const r = approveBaselines(result, { reason: typeof reason === 'string' ? reason : '', commit, dryRun: !!opt('dry-run') });
      console.log(formatChanges(r.changes, { title: r.dryRun ? 'Would approve' : 'Approved', limit: 40 }));
      console.log(r.written.length ? `\n${r.dryRun ? 'Would write' : 'Wrote'} ${r.written.length} baseline file(s) in ${BASELINE_DIR}: ${r.written.join(', ')}${r.dryRun ? '' : '\nLogged in tests/regression/baselines/APPROVALS.md. Commit the baselines with the change that caused them.'}` : '\nNothing to approve: the baselines already match.');
    } catch (err) {
      console.error(err.message);
      process.exit(2);
    }
    break;
  }
  case 'crew': {
    const paths = writeReports(result, changes, content, ['crew']);
    const by = {};
    for (const f of result.lifecycle.findings) (by[f.status] ??= []).push(f);
    for (const status of ['new', 'known-defect', 'uncertain', 'intentional', 'observation']) {
      if (!by[status]) continue;
      console.log(`\n${status.toUpperCase()} (${by[status].length})`);
      for (const f of by[status]) console.log(`  ${f.type} ${f.npc} ${f.phases.map((p) => `P${p}`).join(',')}: ${f.detail}`);
    }
    if (result.lifecycle.resolved.length) console.log(`\nRESOLVED (remove from known-issues.json): ${result.lifecycle.resolved.map((k) => `${k.type} ${k.npc}`).join(', ')}`);
    console.log(`\nCrew in the cargo hold per phase: ${keyMetrics(result).map((m) => `P${m.phase} ${m.crewInHold}`).join(', ')}`);
    console.log(`Report: ${paths['crew.md']} (${ms()})`);
    break;
  }
  case 'rooms': {
    const paths = writeReports(result, changes, content, ['rooms']);
    const last = result.snapshots[result.snapshots.length - 1];
    console.log('Room                    size   reachable(P1->P17)  chokes(P1->P17)  people  story props  stacked  unreachable scenery');
    for (const room of Object.keys(last.rooms)) {
      const a = result.snapshots[0].rooms[room];
      const b = last.rooms[room];
      console.log(`${room.padEnd(23)} ${b.size.padEnd(6)} ${`${a.reachable} -> ${b.reachable}`.padEnd(19)} ${`${a.chokeTiles} -> ${b.chokeTiles}`.padEnd(16)} ${String(b.people.length).padEnd(7)} ${String(b.props.story).padEnd(12)} ${String(b.stackedProps.length).padEnd(8)} ${b.unreachableScenery.join(' ')}`);
    }
    console.log(`Report: ${paths['rooms.md']} (${ms()})`);
    break;
  }
  case 'coords': {
    const room = opt('room');
    const refs = typeof room === 'string' ? result.coordRefs.filter((r) => r.room === room) : result.coordRefs;
    const paths = writeReports(result, changes, content, ['coords']);
    if (typeof room === 'string') {
      const text = formatCoordinateReport(refs, content);
      console.log(text.split('\n').slice(0, 200).join('\n'));
      if (text.split('\n').length > 200) console.log('... (full report in tmp/regression/coords.md)');
    } else {
      console.log(`${result.coords.total} fixed-position references:`);
      console.log(Object.entries(result.coords.byKind).sort((a, b) => b[1] - a[1]).map(([k, n]) => `  ${k} ${n}`).join('\n'));
      console.log(`By room: ${Object.entries(result.coords.byRoom).sort((a, b) => b[1].total - a[1].total).map(([r, x]) => `${r} ${x.total}`).join(', ')}`);
      console.log(`Script references whose room couldn't be inferred: ${result.coords.unknownRoomScriptRefs}. Out of bounds: ${result.coords.outOfBounds.length}. Objective targets naming missing objects: ${result.coords.missingObjectiveObjects.length}.`);
    }
    console.log(`Report: ${paths['coords.md']} (${ms()})`);
    break;
  }
  case 'challenges': {
    const paths = writeReports(result, changes, content, ['challenges']);
    for (const [id, k] of Object.entries(result.challenges.kinds)) {
      const u = result.challenges.usage[id];
      console.log(`${id.padEnd(14)} input ${k.input.padEnd(9)} success ${k.support.success ? 'yes' : '-  '} partial ${k.support.partial ? 'yes' : '-  '} failure ${k.support.failure ? 'yes' : '-  '} uses ${u ? `${u.scripts} scripts, ${u.maps} maps` : 0}`);
    }
    console.log(`Report: ${paths['challenges.md']} (${ms()})`);
    break;
  }
  default:
    console.error(`unknown command "${cmd}" (summary, snapshot, compare, approve, crew, rooms, coords, challenges)`);
    process.exit(2);
}
