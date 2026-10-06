#!/usr/bin/env node
/**
 * Prints a map's walkable grid with its props, NPC placements and objects,
 * for placing things in map patches:  node tools/mapgrid.mjs main_deck [flag ...]
 *
 *   #  solid tile         .  open floor        P  prop (footprint)
 *   N  NPC placement      o  object (inspect/trigger/warp)
 *
 * Flags given on the command line are treated as set (conditions on props,
 * NPCs and objects are evaluated against them).
 */
import { loadContentFromDisk } from './lib/content.mjs';
import { compileMap } from '../src/maps/compileMap.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';

const [mapId, ...flags] = process.argv.slice(2);
if (!mapId) {
  console.error('usage: node tools/mapgrid.mjs <mapId> [flag ...]');
  process.exit(1);
}
const db = loadContentFromDisk();
const def = db.maps.require(mapId);
const model = compileMap(def, db.tilesets.get(def.tileset), db.props);
const set = new Set(flags);
const session = {
  story: { has: (f) => set.has(f), getVar: () => 0 },
  quests: { status: () => 'inactive', isActive: () => false, isCompleted: () => false, isObjectiveDone: () => false, isObjectiveAvailable: () => false },
  inventory: { count: () => 0, has: () => false, gold: 0 },
  world: { hasVisited: () => false, get: () => undefined },
  party: { has: () => true, leader: () => ({ level: 1 }) },
  location: { map: mapId },
};
const ok = (cond) => {
  if (!cond) return true;
  try {
    return evaluateCondition(cond, session);
  } catch {
    return false;
  }
};
const grid = [];
for (let y = 0; y < model.height; y++) {
  const row = [];
  for (let x = 0; x < model.width; x++) row.push(model.solid[y * model.width + x] ? '#' : '.');
  grid.push(row);
}
for (const p of model.props) {
  if (!ok(p.if)) continue;
  const pd = db.props.get(p.prop);
  const [w, h] = pd?.footprint ?? [1, 1];
  const layer = pd?.layer ?? 'object';
  if (layer === 'overhead' || layer === 'floor') continue;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (grid[p.y + j]?.[p.x + i] !== undefined) grid[p.y + j][p.x + i] = 'P';
}
const placed = new Set();
for (const o of model.objects) {
  if (o.type === 'npc') {
    if (placed.has(o.npc) || !ok(o.if)) continue;
    placed.add(o.npc);
    if (!o.absent && grid[o.y]?.[o.x]) grid[o.y][o.x] = 'N';
  } else if (['inspect', 'trigger', 'warp'].includes(o.type) && ok(o.if) && (!o.when || ok(o.when))) {
    for (let j = 0; j < (o.h ?? 1); j++) for (let i = 0; i < (o.w ?? 1); i++) if (grid[o.y + j]?.[o.x + i] === '.') grid[o.y + j][o.x + i] = 'o';
  }
}
console.log(`   ${[...Array(model.width).keys()].map((x) => x % 10).join('')}`);
grid.forEach((row, y) => console.log(`${String(y).padStart(2)} ${row.join('')}`));
console.log('NPCs:', [...placed].join(', '));
