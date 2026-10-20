import fs from 'node:fs';
import path from 'node:path';
import { PHASES, stableStringify } from './world.js';
import { compareSnapshots, jsonDiff, formatChanges } from './compare.js';
import { lifecycleBaseline } from './harness.js';
import { formatCoordinateReport } from './coords.js';
import { CHALLENGE_KINDS } from './challenges.js';

/**
 * Baselines on disk (tests/regression/baselines/), comparison of a harness
 * run against them, and the readable reports tools/regress.mjs writes to
 * tmp/regression/. Baselines are only ever written by approveBaselines(),
 * which needs a reason and refuses while a hard invariant is broken.
 */
export const BASELINE_DIR = path.resolve('tests/regression/baselines');
export const REPORT_DIR = path.resolve('tmp/regression');

const phaseFile = (n) => `phase-${String(n).padStart(2, '0')}.json`;

/** The records a run produces, keyed by baseline file name (stable JSON text). */
export function baselineRecords(result) {
  const out = {};
  for (const s of result.snapshots) out[phaseFile(s.phase)] = `${stableStringify(s)}\n`;
  out['lifecycle.json'] = `${stableStringify(lifecycleBaseline(result.lifecycle))}\n`;
  out['coords.json'] = `${stableStringify(result.coords)}\n`;
  out['challenges.json'] = `${stableStringify(result.challenges)}\n`;
  return out;
}

/** Reads every baseline file there is ({} if none). */
export function readBaselines(dir = BASELINE_DIR) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) out[f] = fs.readFileSync(path.join(dir, f), 'utf8');
  return out;
}

/** Where objects, placement rows and rooms are defined (for pointing a change at its files). */
export function makeLocator(result) {
  const byId = new Map();
  const byRoom = new Map();
  for (const r of result.coordRefs ?? []) {
    if (r.source === 'map' || r.source === 'map patch') {
      if (r.id) {
        if (!byId.has(r.id)) byId.set(r.id, new Set());
        byId.get(r.id).add(r.file);
      }
      if (!byRoom.has(r.room)) byRoom.set(r.room, new Set());
      byRoom.get(r.room).add(r.file);
    }
  }
  return (kind, id) => [...((kind === 'room' ? byRoom : byId).get(id) ?? [])].sort();
}

/**
 * Every difference between a run and the approved baselines, as compare.js
 * change records. Missing baselines are reported, never invented.
 */
export function compareToBaselines(result, baselines = readBaselines()) {
  const locate = makeLocator(result);
  const changes = [];
  const current = baselineRecords(result);
  for (const s of result.snapshots) {
    const text = baselines[phaseFile(s.phase)];
    if (text === current[phaseFile(s.phase)]) continue;
    changes.push(...compareSnapshots(text ? JSON.parse(text) : null, s, { locate }));
  }
  for (const f of ['lifecycle.json', 'coords.json', 'challenges.json']) {
    const text = baselines[f];
    if (text === current[f]) continue;
    if (!text) {
      changes.push({ phase: null, severity: 'change', area: f, message: 'no approved baseline yet' });
      continue;
    }
    const a = JSON.parse(text);
    const b = JSON.parse(current[f]);
    if (f === 'lifecycle.json') {
      const gone = a.findings.filter((x) => !b.findings.includes(x));
      const came = b.findings.filter((x) => !a.findings.includes(x));
      for (const x of gone) changes.push({ phase: null, severity: x.startsWith('known-defect') ? 'improvement' : 'change', area: 'crew.lifecycle', message: `no longer found: ${x}` });
      for (const x of came) changes.push({ phase: null, severity: x.startsWith('new') ? 'regression' : 'change', area: 'crew.lifecycle', message: `now found: ${x}` });
      for (const line of jsonDiff(a.resolvedKnownIssues, b.resolvedKnownIssues, 'resolvedKnownIssues')) changes.push({ phase: null, severity: 'change', area: 'crew.lifecycle', message: line });
    } else {
      for (const line of jsonDiff(a, b)) changes.push({ phase: null, severity: 'change', area: f.replace('.json', ''), message: line });
    }
  }
  // Stray baseline files (a phase that no longer exists).
  for (const f of Object.keys(baselines)) if (!(f in current)) changes.push({ phase: null, severity: 'change', area: f, message: 'baseline file with no current counterpart' });
  return changes;
}

/**
 * Writes the current records as the approved baselines. Needs a reason;
 * refuses while any hard invariant fails (approving can't hide a broken
 * invariant: those are checked on every run regardless of the baselines).
 * Appends the reason and a summary of what changed to APPROVALS.md.
 */
export function approveBaselines(result, { reason, dir = BASELINE_DIR, commit = null, date = null, dryRun = false } = {}) {
  if (!reason || !String(reason).trim()) throw new Error('approving new baselines needs a reason (--reason "...")');
  if (result.invariants.length) throw new Error(`refusing to approve: ${result.invariants.length} hard invariant(s) fail; fix them first (npm run regress).\n${result.invariants.slice(0, 10).map((v) => `  ${v.check}: ${v.message}`).join('\n')}`);
  const before = readBaselines(dir);
  const changes = compareToBaselines(result, before);
  const records = baselineRecords(result);
  const written = Object.keys(records).filter((f) => before[f] !== records[f]);
  if (dryRun) return { changes, written, dryRun: true };
  if (!written.length) return { changes, written };
  fs.mkdirSync(dir, { recursive: true });
  for (const f of written) fs.writeFileSync(path.join(dir, f), records[f]);
  const counts = ['regression', 'warning', 'improvement', 'change'].map((s) => `${changes.filter((c) => c.severity === s).length} ${s}`).join(', ');
  const entry = [`## ${date ?? new Date().toISOString().slice(0, 10)}${commit ? ` (on ${commit})` : ''}`, '', `Reason: ${String(reason).trim()}`, '', `Files: ${written.join(', ')}`, '', `Changes: ${counts}`, '',
    '```', formatChanges(changes, { title: 'Approved changes', limit: 15 }), '```', ''].join('\n');
  const log = path.join(dir, 'APPROVALS.md');
  const head = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '# Regression baseline approvals\n\nEvery approval of new baselines, newest last: the reason given and what changed. Written by `npm run regress:approve`; never edit a baseline file by hand.\n\n';
  fs.writeFileSync(log, `${head}${entry}\n`);
  return { changes, written };
}

// --- readable reports ----------------------------------------------------------

const cell = (v) => String(v ?? '').replace(/\|/g, '\\|');

/** Per-phase key numbers, the table that shows a prompt's effect at a glance. */
export function keyMetrics(result) {
  return result.snapshots.map((s) => {
    const r = s.rooms;
    const crew = s.crewSummary.byRoom;
    const sumRooms = (f) => ['main_deck', 'galley', 'crew_quarters', 'cargo_hold'].reduce((n, m) => n + (r[m] ? f(r[m]) : 0), 0);
    return {
      phase: s.phase,
      crewInHold: (crew.cargo_hold ?? []).length,
      crewPlaced: Object.values(s.crew).filter((c) => /^(present|duplicate)/.test(c)).length,
      duplicates: Object.values(s.crew).filter((c) => c.startsWith('duplicate')).length,
      deckChokes: r.main_deck?.chokeTiles,
      quartersChokes: r.crew_quarters?.chokeTiles,
      peopleOnChokes: Object.values(r).reduce((n, x) => n + x.peopleOnChokeTiles.length, 0),
      storyPropsMainRooms: sumRooms((x) => x.props.story),
      stackedMainRooms: sumRooms((x) => x.stackedProps.length),
      unreachableScenery: Object.values(r).reduce((n, x) => n + x.unreachableScenery.length, 0),
      unreachableObjectives: Object.values(r).reduce((n, x) => n + x.unreachableObjectiveTargets.length, 0),
    };
  });
}

export function formatSummary(result, changes) {
  const lines = ['# Regression summary', '', 'Generated by `npm run regress` (tools/regress.mjs). Read docs/gameplay-overhaul/06-regression-harness.md for what each number means.', ''];
  lines.push('## Hard invariants', '', result.invariants.length ? `**${result.invariants.length} failing**` : 'All hold.', '');
  for (const v of result.invariants) lines.push(`- ${v.check}${v.phase ? ` (P${v.phase})` : ''}: ${v.message}`);
  lines.push('', '## Against the approved baselines', '', '```', formatChanges(changes, { limit: 25 }), '```', '');
  lines.push('## Key measurements per phase end', '', '| Phase | Crew in hold | Crew placed | Duplicates | Deck choke tiles | Quarters choke tiles | People on choke tiles | Story props (4 main rooms) | Stacked anchors (4 main rooms) | Unreachable scenery | Unreachable objective targets |', '|---|---|---|---|---|---|---|---|---|---|---|');
  for (const m of keyMetrics(result)) lines.push(`| P${m.phase} | ${m.crewInHold} | ${m.crewPlaced} | ${m.duplicates} | ${m.deckChokes} | ${m.quartersChokes} | ${m.peopleOnChokes} | ${m.storyPropsMainRooms} | ${m.stackedMainRooms} | ${m.unreachableScenery} | ${m.unreachableObjectives} |`);
  const byStatus = {};
  for (const f of result.lifecycle.findings) byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;
  lines.push('', '## Crew lifecycle', '', Object.entries(byStatus).map(([k, n]) => `${k}: ${n}`).join(' · '), '', `Resolved known issues (remove them from known-issues.json): ${result.lifecycle.resolved.length ? result.lifecycle.resolved.map((k) => `${k.type} ${k.npc}`).join(', ') : 'none'}`, '');
  lines.push('## Fixed-position references', '', `${result.coords.total} references; script references with no known room: ${result.coords.unknownRoomScriptRefs}. Full list: tmp/regression/coords.md.`, '');
  lines.push('## Challenges', '', Object.entries(result.challenges.usage).map(([k, u]) => `${k} ${u.total}`).join(' · '), '');
  return lines.join('\n');
}

export function formatCrewReport(result) {
  const lines = ['# Crew placement and lifecycle', '', 'Per phase end: who stands where (from the placement rows, as the game reads them), then every lifecycle finding with its status from tests/regression/known-issues.json.', ''];
  for (const s of result.snapshots) {
    lines.push(`## P${s.phase} (${s.preset})`, '');
    for (const [room, ids] of Object.entries(s.crewSummary.byRoom).sort()) lines.push(`- **${room}** (${ids.length}): ${ids.join(', ')}`);
    const flagged = Object.entries(s.crew).filter(([, c]) => /\[/.test(c));
    if (flagged.length) lines.push('', 'Flags:', ...flagged.map(([npc, c]) => `- ${npc}: ${c}`));
    const req = Object.entries(s.crewSummary.required);
    if (req.length) lines.push('', `Needed by open objectives: ${req.map(([n, o]) => `${n} (${o})`).join(', ')}`);
    lines.push('');
  }
  lines.push('## Lifecycle findings', '');
  for (const status of ['new', 'known-defect', 'uncertain', 'intentional', 'observation']) {
    const fs_ = result.lifecycle.findings.filter((f) => f.status === status);
    if (!fs_.length) continue;
    lines.push(`### ${status} (${fs_.length})`, '');
    for (const f of fs_) lines.push(`- **${f.type}** ${f.npc} (${f.phases.map((p) => `P${p}`).join(', ')}): ${f.detail}${f.note ? ` *${f.note}*` : ''}`);
    lines.push('');
  }
  if (result.lifecycle.resolved.length) lines.push('### resolved', '', ...result.lifecycle.resolved.map((k) => `- ${k.type} ${k.npc}: listed as ${k.status} but no longer found. Remove the entry.`), '');
  return lines.join('\n');
}

export function formatRoomsReport(result) {
  const lines = ['# Room navigation and clutter', '', 'Measured with the game\'s movement rules (tests/regression/rooms.js): reachable = floor the captain can walk to from the room\'s arrival points; with people = standing people block (sleepers aloft and deliberate gates don\'t); choke tiles = floor tiles that would cut the reachable area in two; critical = cut an arrival point off from an exit.', ''];
  const rooms = Object.keys(result.snapshots[0].rooms);
  for (const room of rooms) {
    lines.push(`## ${room} (${result.snapshots[0].rooms[room].size})`, '', '| Phase | Walkable | Blocked | Reachable | With people | Choke | Critical choke | People | On choke | Fixtures | Story props | Stacked | Overlap tiles | Interactables | Unreachable scenery | Unreachable objective targets | Exits (unreachable) |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const s of result.snapshots) {
      const r = s.rooms[room];
      const bad = r.exits.filter((e) => !e.reachable && !e.shadowedBy).map((e) => e.id);
      lines.push(`| P${s.phase} | ${r.walkable} | ${r.blocked} | ${r.reachable} | ${r.reachableWithPeople} | ${r.chokeTiles} | ${r.criticalChokeTiles.length} | ${r.people.length} | ${r.peopleOnChokeTiles.length} | ${r.props.fixtures} | ${r.props.story} | ${r.stackedProps.length} | ${r.overlappingFootprintTiles} | ${r.interactables} | ${cell(r.unreachableScenery.join(' '))} | ${cell(r.unreachableObjectiveTargets.join(' '))} | ${r.exits.length} (${bad.length}) |`);
    }
    const last = result.snapshots[result.snapshots.length - 1].rooms[room];
    lines.push('', `At the end of Phase 17: exits ${last.exits.map((e) => `${e.id}@${e.at}${e.shadowedBy ? ` (shadowed by ${e.shadowedBy})` : ''}${e.locked ? ' (locked)' : ''}`).join(', ') || 'none'}; arrival points ${last.spawns.join(', ') || 'none'}; critical choke tiles ${last.criticalChokeTiles.join(' ') || 'none'}; stacked props ${last.stackedProps.join('; ') || 'none'}; people on choke tiles ${last.peopleOnChokeTiles.join(', ') || 'none'}.`, '');
  }
  return lines.join('\n');
}

export function formatChallengesReport(result) {
  const lines = ['# Challenge outcome registry', '', `Vocabulary: ${result.challenges.vocabulary.join(', ')}. Registry: tests/regression/challenges.js.`, '', '| Kind | Input | Success | Partial | Failure | Retry | Can block progression | Softlock risk | Uses (scripts / maps) | Result stored / read | Source |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const [id, k] of Object.entries(CHALLENGE_KINDS)) {
    const u = result.challenges.usage[id] ?? { scripts: 0, maps: 0, storingResult: 0, resultRead: 0 };
    lines.push(`| ${id} | ${k.input} | ${cell(k.outcomes.success ?? 'unsupported')} | ${cell(k.outcomes.partial ?? 'unsupported')} | ${cell(k.outcomes.failure ?? 'unsupported')} | ${cell(k.retry)} | ${k.blocksProgression ? 'yes' : 'no'} | ${cell(k.softlockRisk)} | ${u.scripts} / ${u.maps} | ${u.storingResult} / ${u.resultRead} | ${cell(k.source)} |`);
  }
  lines.push('', '## Opted in (src/systems/challenge, docs/gameplay-overhaul/07-challenge-outcomes.md)', '', 'What a step that opts into a challenge can report. The table above is the campaign as it plays: no chapter has opted in while every "opted in" count is 0.', '', '| Kind | Success | Partial | Failure | Retry | Opted-in uses | Source |', '|---|---|---|---|---|---|---|');
  for (const [id, k] of Object.entries(CHALLENGE_KINDS)) {
    if (!k.optIn) continue;
    const o = k.optIn.outcomes;
    lines.push(`| ${id} | ${cell(o.success ?? 'unsupported')} | ${cell(o.partial ?? 'unsupported')} | ${cell(o.failure ?? 'unsupported')} | ${cell(k.optIn.retry)} | ${result.challenges.usage[id]?.optedIn ?? 0} | ${cell(k.optIn.source)} |`);
  }
  lines.push('', '## Uses per phase', '');
  for (const [id, u] of Object.entries(result.challenges.usage)) lines.push(`- ${id}: ${Object.entries(u.byPhase).map(([p, n]) => `${p} ${n}`).join(', ') || 'maps only'}`);
  return lines.join('\n');
}

/** Writes every report into tmp/regression/ (git-ignored). Returns the paths. */
export function writeReports(result, changes, content, which = ['summary', 'crew', 'rooms', 'coords', 'challenges']) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const out = {};
  const write = (name, text) => {
    const p = path.join(REPORT_DIR, name);
    fs.writeFileSync(p, text);
    out[name] = p;
  };
  if (which.includes('summary')) write('summary.md', formatSummary(result, changes));
  if (which.includes('crew')) write('crew.md', formatCrewReport(result));
  if (which.includes('rooms')) write('rooms.md', formatRoomsReport(result));
  if (which.includes('coords')) write('coords.md', formatCoordinateReport(result.coordRefs, content));
  if (which.includes('challenges')) write('challenges.md', formatChallengesReport(result));
  if (which.includes('summary')) {
    write('changes.md', `# Changes against the approved baselines\n\n\`\`\`\n${formatChanges(changes, { limit: 1000 })}\n\`\`\`\n`);
    fs.mkdirSync(path.join(REPORT_DIR, 'current'), { recursive: true });
    for (const [f, text] of Object.entries(baselineRecords(result))) fs.writeFileSync(path.join(REPORT_DIR, 'current', f), text);
  }
  return out;
}

export { PHASES };
