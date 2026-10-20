/**
 * The fixed-position reference index: every place in the content that names
 * a tile, grouped by room and source file, so a layout change starts from a
 * complete list of what it can break (docs/gameplay-overhaul/03-ship-layout-audit.md).
 *
 * Sources:
 *   maps (base files and phase patches)  objects (placements, inspects, triggers, warps, spawns,
 *                                        blocks, chests, enemies), props, fume zones and their drift
 *                                        paths, regions, decor spots, collision, lights...
 *   scripts (data/story/cutscenes, data/dialogue)  spawns, moves, flights, places, camera pans,
 *                                        transitions and anything else with a tile
 *   other data (hazards, story systems, debug presets)  anything with a tile
 *   quests                               objective targets named "room:object"
 *
 * A script names no room, so its room is inferred: from a transition earlier
 * in the same script (certain), from the map objects, onEnter hooks and story
 * triggers that run it (certain when they agree), or left "unknown".
 */

/** Script steps whose x/y (or to/path) are world tiles (src/world/worldServices.js multiplies them by the tile size). */
const TILE_STEPS = ['spawn', 'place', 'move', 'fly', 'camera', 'sharkEvent', 'burst', 'bark', 'sprite', 'moveSprite', 'token', 'tether', 'fumeCloud'];
/** Steps drawn in screen pixels (vistas, close-ups): not tile references. */
const SCREEN_STEPS = ['vistaMove', 'vistaFx', 'insert', 'vista'];
/** Reference kinds that must lie inside their room. */
const BOUNDED = new Set(['placement', 'inspect', 'trigger', 'warp', 'arrival point', 'block', 'chest', 'enemy', 'prop', 'fume', 'fume path', 'region', 'decor spot', 'collision', 'spawn', 'place', 'move', 'transition', 'preset position', 'objective target']);
const isTile = (v) => Array.isArray(v) && v.length === 2 && Number.isInteger(v[0]) && Number.isInteger(v[1]);
const condOf = (o) => {
  const c = o.if ?? o.when;
  if (!c) return null;
  const s = JSON.stringify(c);
  return s.length > 80 ? `${s.slice(0, 77)}...` : s;
};

/**
 * Which rooms each script runs in: from map objects (inspects, triggers,
 * warps' lock scripts, object dialogue), onEnter hooks, story triggers with
 * an onMap condition, transitions that name a follow-up ("then"), NPC
 * dialogue (the rooms that NPC has placement rows in), and then inherited
 * along call/goto/then references until nothing changes.
 */
function scriptRooms(files) {
  const out = new Map();
  const add = (script, room) => {
    if (typeof script !== 'string' || !room) return false;
    if (!out.has(script)) out.set(script, new Set());
    const had = out.get(script).has(room);
    out.get(script).add(room);
    return !had;
  };
  const npcRooms = new Map();
  for (const [path, json] of Object.entries(files)) {
    if (!path.startsWith('/data/maps/')) continue;
    const room = json.patch ?? json.id;
    for (const o of json.objects ?? []) {
      add(o.script, room);
      add(o.locked, room);
      for (const d of o.dialogue ?? []) add(d.script, room);
      if (o.type === 'npc' && !o.absent) {
        if (!npcRooms.has(o.npc)) npcRooms.set(o.npc, new Set());
        npcRooms.get(o.npc).add(room);
      }
    }
    for (const e of json.onEnter ?? []) add(e.script, room);
  }
  const scripts = {};
  for (const [path, json] of Object.entries(files)) {
    if (path.startsWith('/data/story/triggers/') && Array.isArray(json)) {
      for (const t of json) {
        const m = /"onMap":"([a-z_]+)"/.exec(JSON.stringify(t.if ?? null));
        if (m) add(t.script, m[1]);
      }
    }
    if (path.startsWith('/data/story/cutscenes/') || path.startsWith('/data/dialogue/')) Object.assign(scripts, json);
    if (path.startsWith('/data/npcs/') && Array.isArray(json)) {
      for (const n of json) {
        const id = n.id ?? n.extend;
        for (const d of n.dialogue ?? []) for (const room of npcRooms.get(id) ?? []) add(d.script, room);
      }
    }
  }
  // References between scripts: a transition's "then" runs in its room; call/goto/then inherit the caller's rooms.
  const calls = [];
  const visit = (v, from) => {
    if (Array.isArray(v)) v.forEach((x) => visit(x, from));
    else if (v && typeof v === 'object') {
      if (typeof v.transition === 'string' && typeof v.then === 'string') add(v.then, v.transition);
      else if (typeof v.then === 'string') calls.push([from, v.then]);
      for (const k of ['call', 'goto']) if (typeof v[k] === 'string') calls.push([from, v[k]]);
      Object.values(v).forEach((x) => visit(x, from));
    }
  };
  for (const [id, steps] of Object.entries(scripts)) visit(steps, id);
  for (let changed = true; changed;) {
    changed = false;
    for (const [from, to] of calls) for (const room of out.get(from) ?? []) changed = add(to, room) || changed;
  }
  return out;
}

/** Map-file references: every object, prop, zone, spot or rectangle with a tile. */
function mapRefs(path, json, out) {
  const room = json.patch ?? json.id;
  const isPatch = !!json.patch;
  const push = (section, o, extra = {}) => out.push({ room, file: path.slice(1), source: isPatch ? 'map patch' : 'map', section, ...extra, cond: condOf(o) });
  for (const [section, value] of Object.entries(json)) {
    if (!Array.isArray(value)) continue;
    value.forEach((o) => {
      if (typeof o === 'string' && section === 'props') {
        const [prop, x, y] = o.split(/\s+/);
        if (Number.isInteger(+x) && Number.isInteger(+y)) push('props', {}, { kind: 'prop', id: prop, x: +x, y: +y });
        return;
      }
      if (!o || typeof o !== 'object') return;
      if (Number.isInteger(o.x) && Number.isInteger(o.y)) {
        const kind = section === 'objects' ? ({ npc: 'placement', spawn: 'arrival point' }[o.type] ?? o.type ?? 'object') : section === 'props' ? 'prop' : section.replace(/s$/, '');
        push(section, o, { kind, id: o.id ?? o.npc ?? o.prop ?? null, x: o.x, y: o.y, w: o.w ?? 1, h: o.h ?? 1, ...(o.npc && o.type === 'npc' ? { npc: o.npc, absent: !!o.absent } : {}) });
      }
      for (const [k, v] of Object.entries(o)) {
        if (k === 'path' && Array.isArray(v)) v.filter(isTile).forEach(([x, y], i) => push(section, o, { kind: `${section.replace(/s$/, '')} path`, id: `${o.id ?? '?'}#${i}`, x, y }));
        if (k === 'spots' && v && typeof v === 'object') {
          for (const [spot, at] of Object.entries(v)) {
            const [x, y] = isTile(at) ? at : [at?.x, at?.y];
            if (Number.isInteger(x) && Number.isInteger(y)) push(section, o, { kind: 'decor spot', id: `${o.value ?? o.prop}:${spot}`, x, y });
          }
        }
      }
    });
  }
}

/** Script references: steps with a tile, with the room inferred. */
function scriptRefs(path, json, rooms, out) {
  for (const [script, steps] of Object.entries(json)) {
    if (script.startsWith('//')) continue;
    const known = rooms.get(script);
    const base = known && known.size === 1 ? { room: [...known][0], basis: 'run in that room' } : known && known.size > 1 ? { room: 'several', basis: `run in ${[...known].sort().join(', ')}` } : { room: 'unknown', basis: 'nothing found that runs it in a room' };
    let current = base;
    const visit = (step, where) => {
      if (Array.isArray(step)) {
        step.forEach((s, i) => visit(s, `${where}[${i}]`));
        return;
      }
      if (!step || typeof step !== 'object') return;
      // A transition moves the rest of the script to its room.
      if (typeof step.transition === 'string') {
        if (Number.isInteger(step.x) && Number.isInteger(step.y)) out.push({ room: step.transition, basis: 'its own target', file: path.slice(1), source: 'script', script, step: where, kind: 'transition', x: step.x, y: step.y });
        current = { room: step.transition, basis: 'after a transition in the same script' };
      }
      // Vistas and close-ups are drawn in screen pixels, not tiles.
      if (SCREEN_STEPS.some((k) => k in step)) return;
      const kind = TILE_STEPS.find((k) => k in step) ?? null;
      const tiles = [];
      if (Number.isInteger(step.x) && Number.isInteger(step.y) && typeof step.transition !== 'string') tiles.push([step.x, step.y]);
      if (isTile(step.to)) tiles.push(step.to);
      if (Array.isArray(step.path)) step.path.filter(isTile).forEach((t) => tiles.push(t));
      for (const [x, y] of tiles) out.push({ room: current.room, basis: current.basis, file: path.slice(1), source: 'script', script, step: where, kind: kind ?? 'coordinate', id: kind && typeof step[kind] === 'string' ? step[kind] : null, x, y });
      for (const [k, v] of Object.entries(step)) if (v && typeof v === 'object' && !['to', 'path'].includes(k)) visit(v, `${where}.${k}`);
    };
    current = base;
    visit(steps, '');
  }
}

/** Other data (hazards, story systems, presets): anything with a tile, room from the nearest "map". */
function dataRefs(path, json, out) {
  const visit = (v, room, where) => {
    if (Array.isArray(v)) {
      v.forEach((x, i) => visit(x, room, `${where}[${i}]`));
      return;
    }
    if (!v || typeof v !== 'object') return;
    const here = typeof v.map === 'string' ? v.map : room;
    if (Number.isInteger(v.x) && Number.isInteger(v.y)) {
      const preset = path.includes('/debug/');
      const kind = preset ? 'preset position' : `hazard ${path.split('/').pop().replace('.json', '')}`;
      out.push({ room: here ?? 'unknown', basis: here ? 'its "map"' : 'no map named', file: path.slice(1), source: preset ? 'debug preset' : 'data', step: where, kind, id: v.id ?? null, x: v.x, y: v.y });
    }
    for (const [k, x] of Object.entries(v)) if (x && typeof x === 'object') visit(x, here, `${where}.${k}`);
  };
  visit(json, null, '');
}

/** Quest objectives that name a room's object ("main_deck:helm"). */
function questRefs(path, json, out) {
  for (const q of Array.isArray(json) ? json : []) {
    for (const o of q.objectives ?? []) {
      const m = typeof o.target === 'string' && /^([a-z_]+):([a-z0-9_]+)$/.exec(o.target);
      if (m) out.push({ room: m[1], file: path.slice(1), source: 'quest', kind: 'objective target', id: `${q.id}.${o.id} -> ${m[2]}`, object: m[2] });
    }
  }
}

/**
 * The whole index. `files` maps "/data/..." paths to parsed JSON (the
 * Vite glob in tests, tools/lib/content.mjs in Node); `content` supplies room sizes.
 */
export function coordinateIndex(files, content) {
  const refs = [];
  const rooms = scriptRooms(files);
  for (const path of Object.keys(files).sort()) {
    const json = files[path];
    if (path.startsWith('/data/maps/')) mapRefs(path, json, refs);
    else if (path.startsWith('/data/story/cutscenes/') || path.startsWith('/data/dialogue/')) scriptRefs(path, json, rooms, refs);
    else if (path.startsWith('/data/quests/')) questRefs(path, json, refs);
    // (Vistas are drawn in screen pixels: not tile references.)
    else if (path.startsWith('/data/hazards/') || path.startsWith('/data/debug/') || (path.startsWith('/data/story/') && !path.startsWith('/data/story/vistas/'))) dataRefs(path, json, refs);
  }
  // Bounds: anything that stands, waits or is interacted with in a known room must be inside it.
  // (Sprites, flights, sharks, camera pans and effects may start or pass outside on purpose.)
  const size = (room) => {
    const def = content.maps.get(room);
    return def ? { w: def.tiles[0].length, h: def.tiles.length } : null;
  };
  for (const r of refs) {
    if (r.x === undefined || !BOUNDED.has(r.kind) && !r.kind.startsWith('hazard')) continue;
    const s = size(r.room);
    if (!s) continue;
    if (r.x < 0 || r.y < 0 || r.x + (r.w ?? 1) > s.w || r.y + (r.h ?? 1) > s.h) r.outOfBounds = true;
  }
  // Objective targets: does the named object exist in that room?
  for (const r of refs.filter((x) => x.kind === 'objective target')) {
    const obj = (content.maps.get(r.room)?.objects ?? []).find((o) => o.id === r.object);
    if (!obj) r.missingObject = true;
    else Object.assign(r, { x: obj.x, y: obj.y });
  }
  return refs;
}

/** Counts per room and kind, and per room and file: the part a baseline keeps. */
export function coordinateSummary(refs) {
  const byRoom = {};
  for (const r of refs) {
    const room = (byRoom[r.room] ??= { total: 0, kinds: {}, files: {} });
    room.total++;
    room.kinds[r.kind] = (room.kinds[r.kind] ?? 0) + 1;
    room.files[r.file] = (room.files[r.file] ?? 0) + 1;
  }
  const totals = {};
  for (const r of refs) totals[r.kind] = (totals[r.kind] ?? 0) + 1;
  return {
    total: refs.length,
    byKind: totals,
    byRoom,
    outOfBounds: refs.filter((r) => r.outOfBounds).map((r) => `${r.file} ${r.room} ${r.kind} ${r.id ?? r.script ?? ''} @${r.x},${r.y}`).sort(),
    missingObjectiveObjects: refs.filter((r) => r.missingObject).map((r) => `${r.file} ${r.id}`).sort(),
    unknownRoomScriptRefs: refs.filter((r) => r.source === 'script' && r.room === 'unknown').length,
  };
}

/** The human-readable report: by room, then by source file. */
export function formatCoordinateReport(refs, content) {
  const lines = ['# Fixed-position reference report', '',
    'Every content reference to a tile, by room and source file (generated by `npm run regress:coords`). Anything listed under a room needs review when that room\'s layout changes. Script references carry how their room was inferred.', ''];
  const rooms = [...new Set(refs.map((r) => r.room))].sort((a, b) => (a === 'unknown') - (b === 'unknown') || a.localeCompare(b));
  for (const room of rooms) {
    const rs = refs.filter((r) => r.room === room);
    const def = content.maps.get(room);
    lines.push(`## ${room}${def ? ` (${def.tiles[0].length}x${def.tiles.length})` : ''}: ${rs.length} references`, '');
    const kinds = {};
    for (const r of rs) kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
    lines.push(Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '), '');
    for (const file of [...new Set(rs.map((r) => r.file))].sort()) {
      const fs = rs.filter((r) => r.file === file);
      lines.push(`### ${file} (${fs.length})`, '');
      for (const r of fs) {
        const where = r.x !== undefined ? `@${r.x},${r.y}${(r.w ?? 1) > 1 || (r.h ?? 1) > 1 ? ` ${r.w}x${r.h}` : ''}` : '';
        const who = r.script ? `${r.script}${r.step}` : r.id ?? r.step ?? '';
        const flags = [r.outOfBounds ? 'OUT OF BOUNDS' : null, r.missingObject ? 'MISSING OBJECT' : null, r.absent ? 'absent row' : null].filter(Boolean).join(', ');
        lines.push(`- ${r.kind} ${who} ${where}${r.cond ? ` if ${r.cond}` : ''}${r.basis && r.source === 'script' ? ` (room: ${r.basis})` : ''}${flags ? ` **${flags}**` : ''}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}
