import fs from 'node:fs';
import path from 'node:path';

// Some content files are shared between story phases (the logbooks, the
// television programmes): a later phase adds entries, variants and episodes
// to them. A phase's "stays inside its brief" test reads them without the
// parts a later phase unlocks (Story Phase 10).

/** Every story phase after `n` that has flags. */
export function phasesAfter(n) {
  return fs.readdirSync(path.resolve('data/story/flags'))
    .map((f) => /^phase(\d+)\.json$/.exec(f))
    .filter((m) => m && Number(m[1]) > n)
    .map((m) => `phase${m[1]}`);
}

/** The flags that belong to the story phases after `n`. */
export function laterPhaseFlags(n) {
  return new Set(phasesAfter(n).flatMap((phase) => JSON.parse(fs.readFileSync(path.resolve(`data/story/flags/${phase}.json`), 'utf8')).map((f) => f.id)));
}

/** The flags a condition needs to be set (not the ones it needs clear). */
function needs(cond, out = []) {
  if (Array.isArray(cond)) cond.forEach((c) => needs(c, out));
  else if (cond && typeof cond === 'object') {
    if (typeof cond.flag === 'string') out.push(cond.flag);
    for (const [k, v] of Object.entries(cond)) if (k !== 'not') needs(v, out);
  }
  return out;
}

const later = (x, flags) => !!(x && typeof x === 'object' && !Array.isArray(x) && x.if && needs(x.if).some((f) => flags.has(f)));

/** A logbook extension with nothing of its own left (every entry and variant a later phase's) is all a later phase's. */
const emptyExtension = (x) => !!(x && typeof x.extend === 'string' && Array.isArray(x.entries)
  && x.entries.every((e) => Object.keys(e).every((k) => k === 'id' || (k === 'variants' && !e.variants.length))));

/** A shared JSON file as text, leaving out anything (a logbook, an entry, a variant, an episode) a later phase unlocks. */
export function sharedText(file, flags) {
  const prune = (x) => {
    if (Array.isArray(x)) return x.filter((e) => !later(e, flags)).map(prune);
    if (x && typeof x === 'object') {
      return Object.fromEntries(Object.entries(x).filter(([, v]) => !later(v, flags)).map(([k, v]) => [k, prune(v)]).filter(([, v]) => !emptyExtension(v)));
    }
    return x;
  };
  return JSON.stringify(prune(JSON.parse(fs.readFileSync(file, 'utf8'))), null, 1);
}

/** True for the files `sharedText` should read. */
export const isShared = (file) => /[\\/](logs|tv[\\/]programs)[\\/]/.test(file);
