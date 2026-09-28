import { findPath } from '../maps/pathfinding.js';
import { commandNameOf, isCommentKey } from '../systems/script/commandSchemas.js';

/**
 * Staging checks: where scripts put people, against the room they run in.
 *
 * This is the static half, run by content validation (no story flags):
 * nobody is spawned or placed on a wall or fixed furniture, walked
 * along a path through one, or sent somewhere they can't reach. Only walls,
 * tiles and props with no condition count; anything that depends on the
 * story is checked in the story tests instead (tests/storyStaging.js), which
 * replay the story in order with the real flags, people and props, and also
 * catch a captain left boxed in when a scene ends.
 */

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function selectorScripts(list) {
  return (list ?? []).flatMap((e) => [e.script, ...(e.cycle ?? [])]).filter((s) => typeof s === 'string');
}

/** The map an `onMap` condition pins a trigger to (top level or inside a top-level "all"). */
function onMapOf(cond) {
  if (!cond || typeof cond !== 'object') return null;
  if (typeof cond.onMap === 'string') return cond.onMap;
  for (const c of cond.all ?? []) {
    const m = onMapOf(c);
    if (m) return m;
  }
  return null;
}

/** Every step of a script (all labelled nodes), for scanning. */
function nodesOf(script) {
  if (Array.isArray(script)) return [script];
  if (script && typeof script === 'object') return Object.entries(script).filter(([k]) => !isCommentKey(k)).map(([, v]) => v).filter(Array.isArray);
  return [];
}

function forEachStep(steps, fn) {
  for (const step of steps ?? []) {
    if (!step || typeof step !== 'object') continue;
    fn(step);
    for (const k of ['then', 'else']) if (Array.isArray(step[k])) forEachStep(step[k], fn);
    if (Array.isArray(step.choice)) for (const o of step.choice) if (Array.isArray(o.then)) forEachStep(o.then, fn);
    if (Array.isArray(step.parallel)) for (const b of step.parallel) forEachStep(b, fn);
  }
}

/**
 * Which maps each script runs on, from where it is used: map objects and
 * onEnter lists, story triggers with `onMap`, a transition's `then`, `call`,
 * and conversations with people who appear on only one map.
 * @returns {Map<string, Set<string>>}
 */
export function scriptMaps(db) {
  const maps = new Map();
  let changed = false;
  const add = (script, map) => {
    if (typeof script !== 'string' || !map) return;
    if (!maps.has(script)) maps.set(script, new Set());
    if (!maps.get(script).has(map)) {
      maps.get(script).add(map);
      changed = true;
    }
  };
  const npcMaps = new Map();
  for (const def of db.maps.list()) {
    for (const o of def.objects ?? []) {
      if (o.script) add(o.script, def.id);
      if (o.locked) add(o.locked, def.id);
      selectorScripts(o.dialogue).forEach((s) => add(s, def.id));
      if (o.type === 'npc' && !o.absent) {
        if (!npcMaps.has(o.npc)) npcMaps.set(o.npc, new Set());
        npcMaps.get(o.npc).add(def.id);
      }
    }
    for (const e of def.onEnter ?? []) add(e.script, def.id);
    if (def.fumeCollapse) add(def.fumeCollapse, def.id);
  }
  for (const npc of db.npcs.list()) {
    const where = npcMaps.get(npc.id);
    if (where?.size === 1) selectorScripts(npc.dialogue).forEach((s) => add(s, [...where][0]));
  }
  for (const t of db.storyTriggers.list()) add(t.script, onMapOf(t.if));
  // A transition's follow-up runs on its target; a called script runs where its caller does.
  const edges = [];
  for (const id of db.scripts.ids()) {
    for (const steps of nodesOf(db.scripts.get(id))) {
      forEachStep(steps, (step) => {
        if (typeof step.transition === 'string' && typeof step.then === 'string') add(step.then, step.transition);
        if (typeof step.call === 'string') edges.push([id, step.call]);
      });
    }
  }
  do {
    changed = false;
    for (const [from, to] of edges) for (const m of maps.get(from) ?? []) add(to, m);
  } while (changed);
  return maps;
}

function solidAt(model, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (x < 0 || y < 0 || x >= model.width || y >= model.height) return true;
  return model.solid[y * model.width + x] === 1;
}

/**
 * Walks a script's staging on one map. `report(message)` is called for each
 * problem. Positions are only known once the script itself puts someone
 * somewhere (spawn, place, a landing, a move to a tile).
 */
function checkSteps(steps, model, pos, report) {
  for (const step of steps ?? []) {
    if (!step || typeof step !== 'object') continue;
    let name;
    try {
      name = commandNameOf(step);
    } catch {
      continue;
    }
    const at = (x, y) => `${x},${y}`;
    if (name === 'transition') return; // the scene carries on in another room
    if (name === 'restage') pos.clear(); // everyone goes where the placements say
    if (name === 'spawn' || name === 'place') {
      const who = name === 'spawn' ? step.id ?? step.spawn : step.place;
      if (solidAt(model, step.x, step.y)) report(`${name}s ${who} on a solid tile (${at(step.x, step.y)})`);
      pos.set(who, [step.x, step.y]);
    } else if (name === 'fly' && Array.isArray(step.to)) {
      // Landing on furniture is fair staging (onto a barrel); the story tests
      // catch anyone still standing there when the scene ends.
      if (step.land !== false) pos.set(step.fly, [...step.to]);
      else pos.delete(step.fly);
    } else if (name === 'despawn') {
      pos.delete(step.despawn);
    } else if (name === 'move') {
      const who = step.move;
      const from = pos.get(who);
      if (Array.isArray(step.to)) {
        const [tx, ty] = step.to;
        if (solidAt(model, tx, ty)) report(`sends ${who} to a solid tile (${at(tx, ty)})`);
        else if (from && !findPath(model.width, model.height, { x: from[0], y: from[1] }, { x: tx, y: ty }, (x, y) => solidAt(model, x, y))) {
          report(`sends ${who} from ${at(...from)} to ${at(tx, ty)}, which can't be reached`);
        }
        pos.set(who, [tx, ty]);
      } else if (Array.isArray(step.path)) {
        if (!from) continue;
        let [x, y] = from;
        for (let i = 0; i < step.path.length; i++) {
          const d = DIRS[step.path[i]];
          const n = typeof step.path[i + 1] === 'number' ? step.path[++i] : 1;
          if (!d) break;
          for (let k = 0; k < n; k++) {
            x += d[0];
            y += d[1];
            if (solidAt(model, x, y)) {
              report(`walks ${who} through a solid tile (${at(x, y)})`);
              k = n;
              i = step.path.length;
            }
          }
        }
        pos.set(who, [x, y]);
      }
    }
    for (const k of ['then', 'else']) if (Array.isArray(step[k])) checkSteps(step[k], model, new Map(pos), report);
    if (Array.isArray(step.choice)) for (const o of step.choice) if (Array.isArray(o.then)) checkSteps(o.then, model, new Map(pos), report);
    if (Array.isArray(step.parallel)) {
      const after = new Map(pos);
      for (const b of step.parallel) {
        const branch = new Map(pos);
        checkSteps(b, model, branch, report);
        for (const [k, v] of branch) after.set(k, v);
      }
      for (const [k, v] of after) pos.set(k, v);
    }
  }
}

/**
 * Static staging check over every script whose map is known.
 * @param {Map<string, object>} compiled map id -> compiled map model
 * @param {(scriptId: string, map: string, message: string) => void} report
 */
export function checkStaging(db, compiled, report) {
  const maps = scriptMaps(db);
  for (const id of db.scripts.ids()) {
    const where = maps.get(id);
    // A script used in several rooms (a shared inspect line) has no single stage.
    if (!where || where.size !== 1) continue;
    const map = [...where][0];
    const model = compiled.get(map);
    if (!model) continue;
    for (const steps of nodesOf(db.scripts.get(id))) checkSteps(steps, model, new Map(), (msg) => report(id, map, msg));
  }
}
