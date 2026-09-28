import { evaluateCondition } from '../systems/conditions/conditions.js';

/**
 * NPC placements: where the story has each character in a room.
 *
 * A room lists placements for a character in priority order; the first whose
 * `if` holds wins, and an `"absent": true` placement (or none matching) means
 * the character is elsewhere. The room is built from these, and when the
 * story changes a character's pick while the room is open, the world restages
 * them live (WorldScene.restage): they walk to their new spot, walk in
 * through a door, or walk out of one.
 */

/**
 * @returns {Map<string, object|null>} npc id -> the placement the story picks
 *   now, or null when the character isn't in this room
 */
export function placementChoices(objects, session) {
  const out = new Map();
  for (const o of objects ?? []) {
    if (o.type !== 'npc' || out.has(o.npc)) continue;
    if (o.if && !evaluateCondition(o.if, session)) continue;
    out.set(o.npc, o.absent ? null : o);
  }
  for (const o of objects ?? []) if (o.type === 'npc' && !out.has(o.npc)) out.set(o.npc, null);
  return out;
}

/**
 * Characters whose pick changed between two `placementChoices` results.
 * Moving from one "elsewhere" to another is no change.
 * @returns {{ npc: string, from: object|null, to: object|null }[]}
 */
export function placementChanges(before, after) {
  const out = [];
  for (const [npc, to] of after) {
    const from = before.get(npc) ?? null;
    if (from !== to) out.push({ npc, from, to });
  }
  return out;
}
