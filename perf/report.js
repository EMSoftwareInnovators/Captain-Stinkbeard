import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The markdown report of a performance run (perf/scenes.spec.js). Also runs
 * on its own to re-render tmp/perf/perf.md from tmp/perf/perf-results.json:
 *   node perf/report.js
 */

const median = (xs) => {
  const s = xs.filter((x) => typeof x === 'number').sort((a, b) => a - b);
  if (!s.length) return null;
  return s.length % 2 ? s[(s.length - 1) / 2] : Math.round(((s[s.length / 2 - 1] + s[s.length / 2]) / 2) * 100) / 100;
};
const spread = (xs) => {
  const s = xs.filter((x) => typeof x === 'number');
  return s.length > 1 ? `${median(s)} (${Math.min(...s)}–${Math.max(...s)})` : String(s[0] ?? '-');
};

/** Per scene and room, over every run: the median and the range of the numbers worth comparing. */
function acrossRuns(records) {
  const groups = new Map();
  for (const r of records) {
    const key = `${r.preset} ${r.room}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const lines = [
    '| Scene | Room | runs | build ms | still: work p95 | walk: work p95 | still: frame avg | walk: frame avg | long frames | display objects | heap MB |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const rs of groups.values()) {
    const pick = (f) => rs.map(f);
    lines.push(`| ${rs[0].preset} | ${rs[0].room} | ${rs.length} | ${spread(pick((r) => r.load.buildMs))} | ${spread(pick((r) => r.idle.workMs?.p95))} | ${spread(pick((r) => r.walk.workMs?.p95))} | ${spread(pick((r) => r.idle.frameMs.avg))} | ${spread(pick((r) => r.walk.frameMs.avg))} | ${spread(pick((r) => r.idle.frameMs.over33 + r.walk.frameMs.over33))} | ${spread(pick((r) => r.counts.displayObjects))} | ${spread(pick((r) => r.heap?.usedMB))} |`);
  }
  return lines;
}

export function formatReport(meta, records, scenes = meta.scenes ?? []) {
  const lines = [
    '# Performance baseline',
    '',
    `Generated ${meta.date} on ${meta.commit ?? 'unknown commit'}: ${meta.browser}, ${meta.cpus} CPUs, ${meta.renderer}. ${meta.runs} run(s), ${meta.idleMs} ms still and ${meta.walkMs} ms walking per room.`,
    '',
    'Diagnostic only: frame times on this machine are dominated by software rendering. Compare runs on the same machine; see docs/gameplay-overhaul/06-regression-harness.md.',
    '',
    `Boot (page load to the title menu): ${meta.bootMs} ms.`,
    '',
  ];
  if (meta.runs > 1) lines.push('## Across runs (median, with the range)', '', ...acrossRuns(records), '', '## Every run', '');
  lines.push(
    '| Scene | Room | build ms (again; total) | still: frame avg / p95 / p99 / max | still: work p95 | walk: frame avg / p95 / max | walk: work p95 | long frames (still+walk) | display objects | actors | props shown (built) | interactive | heap MB | flags |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  );
  for (const r of records) {
    const i = r.idle.frameMs;
    const w = r.walk.frameMs;
    lines.push(`| ${r.preset}${r.run > 1 ? ` #${r.run}` : ''} | ${r.room} | ${r.load.buildMs} (${r.loadAgain.buildMs}; ${r.load.totalMs}) | ${i.avg} / ${i.p95} / ${i.p99} / ${i.max} | ${r.idle.workMs?.p95 ?? '-'} | ${w.avg} / ${w.p95} / ${w.max} | ${r.walk.workMs?.p95 ?? '-'} | ${i.over33 + w.over33} | ${r.counts.displayObjects} | ${r.counts.actors} | ${r.counts.propsShown ?? '-'} (${r.counts.props}) | ${r.counts.interactive} | ${r.heap?.usedMB ?? '-'} | ${r.flags.join('; ') || '-'} |`);
  }
  if (scenes.length) {
    lines.push('', '## Scenes', '');
    for (const s of scenes) lines.push(`- ${s.preset}: ${s.rooms.join(', ')} (${s.why})`);
  }
  if (meta.diagnostic) lines.push('', '## Diagnostic limits', '', ...Object.entries(meta.diagnostic).map(([k, v]) => `- ${k}: ${v}`));
  return `${lines.join('\n')}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.resolve('tmp/perf');
  const { meta, records } = JSON.parse(fs.readFileSync(path.join(dir, 'perf-results.json'), 'utf8'));
  fs.writeFileSync(path.join(dir, 'perf.md'), formatReport(meta, records));
  console.log(`Wrote ${path.join(dir, 'perf.md')}`);
}
