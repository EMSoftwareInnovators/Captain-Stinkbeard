import { evaluateCondition } from '../systems/conditions/conditions.js';

/** An inspect spot that exists for an open objective (its condition names one). */
export function isObjectiveJob(obj) {
  return obj.type === 'inspect' && !!obj.if && JSON.stringify(obj.if).includes('objectiveActive');
}

/**
 * Which inspect (or chest) object Confirm reaches on a tile: the first live
 * one in the room's order, except that a live spot for an open objective
 * beats scenery on the same tile (Story Phase 14: the barricade's shield is
 * the cardboard Sir Rumpus, whose own look-at spot comes first in the room).
 */
export function inspectAt(objects, x, y, session) {
  let first = null;
  for (const obj of objects ?? []) {
    if (obj.type !== 'inspect' && obj.type !== 'chest') continue;
    if (x < obj.x || x >= obj.x + (obj.w ?? 1) || y < obj.y || y >= obj.y + (obj.h ?? 1)) continue;
    if (obj.type === 'inspect' && obj.if && !evaluateCondition(obj.if, session)) continue;
    if (isObjectiveJob(obj)) return obj;
    first ??= obj;
  }
  return first;
}
