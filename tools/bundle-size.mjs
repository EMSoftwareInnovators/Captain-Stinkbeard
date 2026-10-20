#!/usr/bin/env node
// The production bundle's size (docs/gameplay-overhaul/06-regression-harness.md, "Performance").
//
//   npm run build && npm run perf:bundle
//
// Lists every file in dist/ with its raw, gzip and brotli size, and how much
// of the source is story content (data/**/*.json, bundled into the main
// chunk). Writes tmp/perf/bundle.json and tmp/perf/bundle.md. Measures only;
// it doesn't fail on a size.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';

const root = process.cwd();
const dist = path.join(root, 'dist');
if (!fs.existsSync(dist)) {
  console.error('dist/ is missing: run "npm run build" first.');
  process.exit(2);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const kb = (n) => Math.round((n / 1024) * 10) / 10;
const files = walk(dist).map((p) => {
  const buf = fs.readFileSync(p);
  return {
    file: path.relative(dist, p),
    raw: buf.length,
    gzip: zlib.gzipSync(buf, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(buf).length,
  };
});
const total = files.reduce((t, f) => ({ raw: t.raw + f.raw, gzip: t.gzip + f.gzip, brotli: t.brotli + f.brotli }), { raw: 0, gzip: 0, brotli: 0 });
const js = files.filter((f) => f.file.endsWith('.js'));
const jsTotal = js.reduce((t, f) => ({ raw: t.raw + f.raw, gzip: t.gzip + f.gzip }), { raw: 0, gzip: 0 });

const content = walk(path.join(root, 'data')).filter((p) => p.endsWith('.json'));
const contentRaw = content.reduce((n, p) => n + fs.statSync(p).size, 0);
const contentMin = content.reduce((n, p) => n + JSON.stringify(JSON.parse(fs.readFileSync(p, 'utf8'))).length, 0);

let commit = null;
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {
  commit = null;
}

const report = {
  date: new Date().toISOString(),
  commit,
  distBuilt: fs.statSync(dist).mtime.toISOString(),
  total,
  javascript: jsTotal,
  files,
  content: { files: content.length, rawBytes: contentRaw, minifiedBytes: contentMin },
};

const lines = [
  '# Bundle size',
  '',
  `Measured ${report.date} on ${commit ?? 'unknown commit'} (dist/ built ${report.distBuilt}).`,
  '',
  '| File | raw kB | gzip kB | brotli kB |',
  '|---|---|---|---|',
  ...files.map((f) => `| ${f.file} | ${kb(f.raw)} | ${kb(f.gzip)} | ${kb(f.brotli)} |`),
  `| **total** | ${kb(total.raw)} | ${kb(total.gzip)} | ${kb(total.brotli)} |`,
  '',
  `JavaScript: ${kb(jsTotal.raw)} kB raw, ${kb(jsTotal.gzip)} kB gzip.`,
  `Story content: ${content.length} JSON files, ${kb(contentRaw)} kB as written, ${kb(contentMin)} kB minified (bundled into the main chunk).`,
];
fs.mkdirSync(path.join(root, 'tmp/perf'), { recursive: true });
fs.writeFileSync(path.join(root, 'tmp/perf/bundle.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'tmp/perf/bundle.md'), `${lines.join('\n')}\n`);
console.log(lines.slice(4).join('\n'));
console.log('\nWrote tmp/perf/bundle.json and tmp/perf/bundle.md');
