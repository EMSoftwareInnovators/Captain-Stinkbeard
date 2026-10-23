#!/usr/bin/env node
/**
 * Overhaul Prompt 10: the supplies economy on every difficulty
 * (docs/gameplay-overhaul/14-resources-and-cooking.md, "Recoverability"):
 * for each functional resource, where it comes from, the most the finite
 * sources give, its renewable paths and what uses it, then any problem (a
 * repair material with no way back from empty). Nothing is invented: what
 * chapters require is listed as it is (none: no chapter opts in).
 *
 *   node tools/economy.mjs [deckhand|captain|brutal]
 */
import { loadContentFromDisk } from './lib/content.mjs';
import { economyReport } from '../src/systems/ship/supplies.js';

const only = process.argv[2] ?? null;
const report = economyReport(loadContentFromDisk());
for (const [d, { rows, mandatory }] of Object.entries(report.difficulties)) {
  if (only && d !== only) continue;
  console.log(`\n== ${d} ==`);
  console.log(`${'item'.padEnd(16)}${'class'.padEnd(12)}${'finite'.padStart(6)}  renewable / shops / recipes  | used by`);
  for (const r of Object.values(rows)) {
    const ways = [...r.renewable, ...r.shops.map((s) => `shop ${s}`), ...r.recipes.map((x) => `cooked: ${x}`)];
    console.log(`${r.item.padEnd(16)}${(r.class ?? '-').padEnd(12)}${String(r.finiteMax).padStart(6)}  ${ways.join('; ') || '-'}  | ${r.usedBy.length ? `${r.usedBy.length} (${r.usedBy.slice(0, 3).join(', ')}${r.usedBy.length > 3 ? ', ...' : ''})` : '-'}`);
  }
  console.log(`mandatory (what a chapter requires): ${mandatory.length ? mandatory.join(', ') : 'none (no chapter opts in)'}`);
}
console.log(report.problems.length ? `\nPROBLEMS:\n${report.problems.join('\n')}` : '\nNo problems: every repair material can be recovered on every difficulty.');
process.exit(report.problems.length ? 1 : 0);
