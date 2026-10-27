#!/usr/bin/env node
/**
 * Overhaul Prompt 11: the consequence ledger on every difficulty
 * (docs/gameplay-overhaul/15-consequences-and-recovery.md, "Progression
 * safety"), modelled on `npm run economy`: each consequence as it would be
 * created (its cap, seconds, each level's modifiers at the difficulty's
 * strength), each recovery's and preparation's seconds and bill, every ship
 * bar at the captain's worst condition with the weakest leader, each
 * recovery material's way back from empty, and what gates the main story
 * (nothing may: the validator's rule). Exits 1 on any problem.
 *
 *   node tools/consequences.mjs [deckhand|captain|brutal]
 */
import { loadContentFromDisk } from './lib/content.mjs';
import { ledgerReport } from '../src/systems/consequences/safety.js';
import { validateContent } from '../src/content/validateContent.js';
import { modifierWords } from '../src/systems/consequences/recovery.js';

const only = process.argv[2] ?? null;
const content = loadContentFromDisk();
const report = ledgerReport(content);
const plain = (s) => s.replace(/<[a-z]>|<\/>/g, '');
const items = (list) => list.map((c) => `${c.count} ${c.item}`).join(', ') || '-';
for (const [d, { tuning, definitions, methods }] of Object.entries(report.difficulties)) {
  if (only && d !== only) continue;
  console.log(`\n== ${d} == strength ${tuning.strength}, duration ${tuning.duration}, cap ${tuning.cap >= 0 ? '+' : ''}${tuning.cap}, action cost ${tuning.actionCost}, action time ${tuning.actionTime}`);
  for (const c of definitions) {
    const ends = [c.seconds ? `${c.seconds}s` : null, c.milestones ? `${c.milestones} chapters` : null, c.uses ? `${c.uses} bars` : null].filter(Boolean).join(' / ') || 'never by itself';
    const levels = c.levels.map((l, i) => `${i + 1} ${l.label}${Object.keys(l.mods).length ? ` (${plain(modifierWords(l.mods))})` : ''}${i + 1 === c.cap ? ' [cap]' : ''}`).join('; ');
    console.log(`${c.id.padEnd(16)}${c.kind.padEnd(10)}${c.category.padEnd(12)}ends ${ends.padEnd(18)} ${levels}`);
  }
  for (const m of methods) console.log(`  method ${m.id.padEnd(12)}${m.kind.padEnd(10)}${m.seconds ? `${m.seconds}s` : '(eaten)'}  ${items(m.bill)}`);
  const bars = report.bars.filter((b) => b.difficulty === d);
  const tight = bars.reduce((a, b) => (b.windowMs < a.windowMs ? b : a), bars[0]);
  console.log(`  ship bars at the worst condition: ${bars.filter((b) => b.ok).length}/${bars.length} winnable; tightest ${tight?.bar} (${tight?.zone}px green, ${tight?.windowMs} ms at its fastest)`);
  for (const r of report.resources.filter((x) => x.difficulty === d)) console.log(`  ${r.method}: ${r.count} ${r.item} <- ${r.ways.join('; ') || 'NONE'}`);
}
const gates = validateContent(content).errors.filter((e) => /consequence/i.test(e));
console.log(`\nmandatory story gated by a consequence: ${gates.length ? gates.join('\n') : 'none (no chapter uses the ledger)'}`);
const problems = [...report.problems, ...gates];
console.log(problems.length ? `\nPROBLEMS:\n${problems.join('\n')}` : '\nNo problems: every consequence can end or be put right, every ship bar stays winnable, every recovery material can be had again, and nothing gates the story.');
process.exit(problems.length ? 1 : 0);
