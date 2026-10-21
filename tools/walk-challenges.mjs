#!/usr/bin/env node
// Plays every story walker (tests/phase*_story.test.js, Phases 2 to 17) under a
// challenge policy and reports, phase by phase, which challenges ran and how
// (docs/gameplay-overhaul/07-challenge-outcomes.md, "Testing outcomes").
//
//   node tools/walk-challenges.mjs                 fail once, then succeed (the default)
//   node tools/walk-challenges.mjs partial         any policy the story harness knows
//   node tools/walk-challenges.mjs failOnce brutal on a difficulty (deckhand, captain, brutal;
//                                                  docs/gameplay-overhaul/08-difficulty-and-accessibility.md)
//
// The walkers' own assertions run as usual, so a pass means every phase is
// still traversable with that policy. Writes tmp/challenges/<policy>.jsonl and
// tmp/challenges/<policy>.md (<policy>-<difficulty> off Captain). Exit code: the walkers'.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const policy = process.argv[2] ?? 'failOnce';
const difficulty = process.argv[3] ?? 'captain';
const name = difficulty === 'captain' ? policy : `${policy}-${difficulty}`;
const dir = path.resolve('tmp/challenges');
const jsonl = path.join(dir, `${name}.jsonl`);
fs.mkdirSync(dir, { recursive: true });
fs.rmSync(jsonl, { force: true });

const run = spawnSync('npx', ['vitest', 'run', '_story'], { stdio: 'inherit', env: { ...process.env, STORY_CHALLENGE_POLICY: policy, STORY_DIFFICULTY: difficulty, STORY_CHALLENGE_REPORT: jsonl } });

const lines = fs.existsSync(jsonl) ? fs.readFileSync(jsonl, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const phaseOf = (file) => Number(/phase(\d+)_story/.exec(file ?? '')?.[1] ?? 0);
const byPhase = new Map();
for (const l of lines) {
  const p = phaseOf(l.file);
  if (!byPhase.has(p)) byPhase.set(p, []);
  byPhase.get(p).push(l);
}
const out = [
  `# Story walkers under the "${policy}" challenge policy, on ${difficulty[0].toUpperCase()}${difficulty.slice(1)}`,
  '',
  `Difficulty recorded on every run: ${[...new Set(lines.map((l) => l.difficulty ?? '?'))].join(', ') || '-'}.`,
  '',
  `Walkers: ${run.status === 0 ? 'all passed' : `FAILED (exit ${run.status})`}. Every repair and sash-tension step met in a walk ran as a test challenge (the content is unchanged); Shark Duty runs in the world and the prologue's challenges are map battles, so neither is walked here.`,
  '',
  '| Phase | Challenge runs | Scripts | Kinds | Failed attempts | Retries | Outcomes |',
  '|---|---|---|---|---|---|---|',
];
for (let p = 1; p <= 17; p++) {
  const ls = byPhase.get(p) ?? [];
  if (!ls.length) {
    out.push(`| ${p} | 0 | 0 | - | - | - | ${p === 1 ? 'no headless walker (the prologue is walked in tests/questorder.test.js and the browser)' : 'no repair or sash-tension step in this phase\'s walks'} |`);
    continue;
  }
  const kinds = {};
  const outcomes = {};
  let failed = 0;
  let retries = 0;
  for (const l of ls) {
    kinds[l.kind] = (kinds[l.kind] ?? 0) + 1;
    outcomes[l.outcome] = (outcomes[l.outcome] ?? 0) + 1;
    failed += l.history.filter((h) => h === 'failure').length;
    retries += Math.max(0, l.attempts - 1);
  }
  const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(', ');
  out.push(`| ${p} | ${ls.length} | ${new Set(ls.map((l) => l.id)).size} | ${fmt(kinds)} | ${failed} | ${retries} | ${fmt(outcomes)} |`);
}
out.push('', `${lines.length} challenge runs in all.`);
fs.writeFileSync(path.join(dir, `${name}.md`), `${out.join('\n')}\n`);
console.log(`\n${out.join('\n')}\n\nWrote ${path.join(dir, `${name}.md`)}`);
process.exit(run.status ?? 1);
