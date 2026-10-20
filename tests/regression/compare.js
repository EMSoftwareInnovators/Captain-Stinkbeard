import { stableStringify } from './world.js';

/**
 * Baseline comparison: what changed between an approved snapshot and the
 * current one, in words, with a severity and (where known) the files to look
 * at. Severities:
 *   regression   something that was reachable, present or consistent no longer is
 *   warning      worth a look, may be fine (e.g. a new unreachable piece of scenery)
 *   improvement  a measured problem got smaller (fewer choke tiles, fewer crew in storage)
 *   change       anything else that differs (a moved prop, a new flag)
 * The comparison never decides that a change is acceptable: approving a new
 * baseline is a separate, explicit step (tools/regress.mjs approve).
 */

/** Room metrics where a bigger number is better (+1) or worse (-1). */
const DIRECTION = {
  reachable: +1,
  reachableWithPeople: +1,
  chokeTiles: -1,
  overlappingFootprintTiles: -1,
  peopleOnNavTiles: -1,
};
const LIST_DIRECTION = {
  criticalChokeTiles: -1,
  peopleOnChokeTiles: -1,
  peopleOnCriticalChokeTiles: -1,
  stackedProps: -1,
  unreachableScenery: -1,
  blockedByPeople: -1,
  unreachableObjectiveTargets: -1,
};

const diffSets = (a = [], b = []) => {
  const A = new Set(a);
  const B = new Set(b);
  return { added: b.filter((x) => !A.has(x)), removed: a.filter((x) => !B.has(x)) };
};
const short = (list, n = 6) => (list.length > n ? `${list.slice(0, n).join(', ')} (+${list.length - n} more)` : list.join(', '));

/**
 * Compares two phase snapshots. `locate(kind, id)` may return source files
 * for an object or placement row id (the CLI builds it from the coordinate index).
 * @returns {{ phase: number, severity: string, area: string, message: string, sources?: string[] }[]}
 */
export function compareSnapshots(base, cur, { locate = () => [] } = {}) {
  // Key order never counts as a difference: compare the canonical (sorted) form.
  const canon = (x) => (x ? JSON.parse(stableStringify(x, 0)) : x);
  base = canon(base);
  cur = canon(cur);
  const out = [];
  const phase = cur?.phase ?? base?.phase;
  const add = (severity, area, message, sources = []) => out.push({ phase, severity, area, message, ...(sources.length ? { sources } : {}) });
  if (!base) {
    add('change', 'snapshot', 'no approved baseline for this phase yet');
    return out;
  }
  if (base.schema !== cur.schema) add('change', 'snapshot', `snapshot schema ${base.schema} -> ${cur.schema}: approve a new baseline after reviewing the format change`);

  // Story.
  if (base.story.chapter !== cur.story.chapter) add('regression', 'story', `the phase now ends in "${cur.story.chapter}" (was "${base.story.chapter}")`);
  if (base.preset !== cur.preset) add('change', 'story', `preset ${base.preset} -> ${cur.preset}`);
  const fa = diffSets(base.story.flags.added, cur.story.flags.added);
  if (fa.removed.length) add('regression', 'story.flags', `no longer set by this phase: ${short(fa.removed)}`);
  if (fa.added.length) add('change', 'story.flags', `newly set by this phase: ${short(fa.added)}`);
  const fr = diffSets(base.story.flags.removed, cur.story.flags.removed);
  if (fr.added.length) add('warning', 'story.flags', `now cleared during this phase: ${short(fr.added)}`);
  if (fr.removed.length) add('change', 'story.flags', `no longer cleared during this phase: ${short(fr.removed)}`);
  const failing = diffSets(base.story.chapterStarts.failing, cur.story.chapterStarts.failing);
  if (failing.added.length) add('regression', 'story.chapters', `chapter start conditions that no longer hold: ${failing.added.join(', ')}`);
  if (failing.removed.length) add('improvement', 'story.chapters', `chapter start conditions that hold again: ${failing.removed.join(', ')}`);
  const qc = diffSets(base.story.quests.completedIds, cur.story.quests.completedIds);
  if (qc.removed.length) add('regression', 'story.quests', `no longer completed by the end of this phase: ${short(qc.removed)}`);
  if (qc.added.length) add('change', 'story.quests', `newly completed: ${short(qc.added)}`);
  const qa = diffSets(base.story.quests.active, cur.story.quests.active);
  if (qa.added.length) add('warning', 'story.quests', `now left active at the end of the phase: ${qa.added.join(', ')}`);
  if (qa.removed.length) add('improvement', 'story.quests', `no longer left active: ${qa.removed.join(', ')}`);
  const qo = diffSets(base.story.quests.openObjectives, cur.story.quests.openObjectives);
  if (qo.added.length) add('warning', 'story.quests', `objectives left open: ${short(qo.added)}`);
  if (qo.removed.length) add('change', 'story.quests', `objectives no longer left open: ${short(qo.removed)}`);
  for (const kind of ['vars', 'values']) {
    const a = base.story.consequences[kind] ?? {};
    const b = cur.story.consequences[kind] ?? {};
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
    const changed = keys.filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map((k) => `${k}: ${JSON.stringify(a[k] ?? null)} -> ${JSON.stringify(b[k] ?? null)}`);
    if (changed.length) add('change', `story.${kind}`, short(changed, 8));
  }

  // Crew: per character, then per-room totals.
  for (const npc of [...new Set([...Object.keys(base.crew), ...Object.keys(cur.crew)])].sort()) {
    const a = base.crew[npc] ?? 'not defined';
    const b = cur.crew[npc] ?? 'not defined';
    if (a === b) continue;
    const bad = ['duplicate', 'on-solid-tile', 'out-of-bounds'].find((f) => b.includes(f) && !a.includes(f));
    const gone = /^present|^duplicate/.test(a) && !/^present|^duplicate/.test(b);
    const rows = [...b.matchAll(/([a-z_]+):([a-z0-9_]+)/g)].map((m) => m[2]);
    const sources = rows.flatMap((id) => locate('placement', id));
    add(bad ? 'regression' : gone ? 'warning' : 'change', `crew.${npc}`, `${a} -> ${b}${bad ? ` (now ${bad})` : gone ? ' (no longer placed anywhere)' : ''}`, [...new Set(sources)]);
  }
  for (const room of [...new Set([...Object.keys(base.crewSummary.byRoom), ...Object.keys(cur.crewSummary.byRoom)])].sort()) {
    const a = base.crewSummary.byRoom[room]?.length ?? 0;
    const b = cur.crewSummary.byRoom[room]?.length ?? 0;
    if (a !== b) add(room === 'cargo_hold' && b < a ? 'improvement' : 'change', 'crew.rooms', `crew in ${room}: ${a} -> ${b}`);
  }
  const req = diffSets(Object.keys(base.crewSummary.required), Object.keys(cur.crewSummary.required));
  if (req.added.length) add('change', 'crew.required', `now needed by an open objective: ${req.added.join(', ')}`);

  // Rooms.
  for (const room of [...new Set([...Object.keys(base.rooms), ...Object.keys(cur.rooms)])].sort()) {
    const a = base.rooms[room];
    const b = cur.rooms[room];
    if (!a || !b) {
      add(b ? 'change' : 'regression', `rooms.${room}`, b ? 'new room' : 'room no longer exists');
      continue;
    }
    const sources = locate('room', room);
    if (a.size !== b.size) add('change', `rooms.${room}`, `size ${a.size} -> ${b.size}`, sources);
    for (const [k, dir] of Object.entries(DIRECTION)) {
      if (a[k] === b[k]) continue;
      const better = (b[k] - a[k]) * dir > 0;
      add(better ? 'improvement' : 'change', `rooms.${room}`, `${k} ${a[k]} -> ${b[k]} (${better ? 'better' : 'worse'})`);
    }
    for (const k of ['walkable', 'blocked', 'interactables']) if (a[k] !== b[k]) add('change', `rooms.${room}`, `${k} ${a[k]} -> ${b[k]}`);
    for (const [k, dir] of Object.entries(LIST_DIRECTION)) {
      const d = diffSets(a[k], b[k]);
      if (!d.added.length && !d.removed.length) continue;
      if (d.added.length) {
        const severity = k === 'unreachableObjectiveTargets' ? 'regression' : ['unreachableScenery', 'blockedByPeople', 'peopleOnCriticalChokeTiles'].includes(k) ? 'warning' : 'change';
        const srcs = k.startsWith('unreachable') || k === 'blockedByPeople' ? d.added.flatMap((x) => locate('object', x.split('@')[0])) : [];
        add(severity, `rooms.${room}`, `${k}: new ${short(d.added)}${severity === 'regression' ? ' (an open objective needs it)' : ''}`, [...new Set(srcs)]);
      }
      if (d.removed.length) add(dir < 0 ? 'improvement' : 'change', `rooms.${room}`, `${k}: resolved ${short(d.removed)}`);
      if (a[k].length !== b[k].length && !['unreachableObjectiveTargets'].includes(k)) add('change', `rooms.${room}`, `${k} count ${a[k].length} -> ${b[k].length}`);
    }
    for (const k of ['fixtures', 'story']) if (a.props[k] !== b.props[k]) add(k === 'story' && b.props[k] < a.props[k] ? 'improvement' : 'change', `rooms.${room}`, `${k} props ${a.props[k]} -> ${b.props[k]}`);
    const ex = new Map(a.exits.map((e) => [e.id, e]));
    for (const e of b.exits) {
      const old = ex.get(e.id);
      const was = old ? old.reachable && !old.shadowedBy : false;
      const is = e.reachable && !e.shadowedBy;
      if (old && was && !is) add('regression', `rooms.${room}`, `exit ${e.id} (${e.at} -> ${e.to}) can no longer be reached from the arrival points${e.shadowedBy ? ` (shadowed by ${e.shadowedBy})` : ''}`, locate('object', e.id));
      if (old && old.reachableWithPeople && !e.reachableWithPeople && is) add('warning', `rooms.${room}`, `exit ${e.id} is now cut off by people standing in the way`);
      if (!old) add('change', `rooms.${room}`, `new exit ${e.id} (${e.at} -> ${e.to})`);
      ex.delete(e.id);
    }
    for (const e of ex.values()) add('change', `rooms.${room}`, `exit ${e.id} no longer exists`);
    const sp = diffSets(a.spawns, b.spawns);
    if (sp.added.length || sp.removed.length) add('change', `rooms.${room}`, `arrival points: +[${sp.added.join(', ')}] -[${sp.removed.join(', ')}]`);
    const fz = diffSets(a.fumeZones, b.fumeZones);
    if (fz.added.length || fz.removed.length) add('change', `rooms.${room}`, `fume zones: +[${fz.added.join(', ')}] -[${fz.removed.join(', ')}]`);
  }

  // Gameplay state.
  const g = (x) => JSON.stringify(x);
  if (g(base.gameplay.party) !== g(cur.gameplay.party)) {
    const who = (party) => party.map((p) => `${p.id} L${p.level}`).join(', ');
    // Same members and levels: say what did change (equipment, abilities, HP).
    const message = who(base.gameplay.party) !== who(cur.gameplay.party) ? `${who(base.gameplay.party)} -> ${who(cur.gameplay.party)}` : jsonDiff(base.gameplay.party, cur.gameplay.party, 'party').join('; ');
    add('change', 'gameplay.party', message);
  }
  if (base.gameplay.gold !== cur.gameplay.gold) add('change', 'gameplay.gold', `${base.gameplay.gold} -> ${cur.gameplay.gold}`);
  const items = [...new Set([...Object.keys(base.gameplay.items), ...Object.keys(cur.gameplay.items)])].filter((k) => base.gameplay.items[k] !== cur.gameplay.items[k]);
  if (items.length) add('change', 'gameplay.items', short(items.map((k) => `${k}: ${base.gameplay.items[k] ?? 0} -> ${cur.gameplay.items[k] ?? 0}`), 8));
  for (const k of [...new Set([...Object.keys(base.gameplay.systems), ...Object.keys(cur.gameplay.systems)])].sort()) {
    if (g(base.gameplay.systems[k]) !== g(cur.gameplay.systems[k])) add('change', `gameplay.systems.${k}`, `${g(base.gameplay.systems[k] ?? null)} -> ${g(cur.gameplay.systems[k] ?? null)}`);
  }
  const un = diffSets(Object.keys(base.gameplay.unsupported), Object.keys(cur.gameplay.unsupported));
  if (un.removed.length) add('improvement', 'gameplay.unsupported', `now supported: ${un.removed.join(', ')}`);
  return out;
}

/** Plain differences between two JSON-able values (for the summary baselines), as "path: a -> b" lines. */
export function jsonDiff(a, b, path = '') {
  if (stableStringify(a ?? null, 0) === stableStringify(b ?? null, 0)) return [];
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  if (isObj(a) && isObj(b)) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().flatMap((k) => jsonDiff(a[k], b[k], path ? `${path}.${k}` : k));
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const d = diffSets(a.map((x) => stableStringify(x, 0)), b.map((x) => stableStringify(x, 0)));
    return [`${path}: ${d.added.length ? `+${short(d.added)}` : ''}${d.added.length && d.removed.length ? ' ' : ''}${d.removed.length ? `-${short(d.removed)}` : ''}`];
  }
  return [`${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`];
}

const ORDER = ['regression', 'warning', 'improvement', 'change'];
const TAG = { regression: 'REGRESSION', warning: 'WARNING', improvement: 'IMPROVED', change: 'CHANGED' };

/** Readable report, grouped by phase, worst first. */
export function formatChanges(changes, { title = 'Changes against the approved baseline', limit = 40 } = {}) {
  if (!changes.length) return `${title}: none.`;
  const counts = Object.fromEntries(ORDER.map((s) => [s, changes.filter((c) => c.severity === s).length]));
  const lines = [`${title}: ${ORDER.filter((s) => counts[s]).map((s) => `${counts[s]} ${s}${counts[s] === 1 ? '' : 's'}`).join(', ')}`];
  const phases = [...new Set(changes.map((c) => c.phase ?? 'all'))];
  for (const p of phases) {
    const list = changes.filter((c) => (c.phase ?? 'all') === p).sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
    lines.push('', p === 'all' ? 'Across phases' : `Phase ${p}`);
    for (const c of list.slice(0, limit)) {
      lines.push(`  ${TAG[c.severity].padEnd(10)} ${c.area}: ${c.message}`);
      if (c.sources?.length) lines.push(`             source: ${short(c.sources, 3)}`);
    }
    if (list.length > limit) lines.push(`  ... ${list.length - limit} more (see the full report)`);
  }
  return lines.join('\n');
}
