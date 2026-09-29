import { asArray } from '../core/util.js';

/**
 * Story presets (data/debug/presets.json): jump to any point of the story
 * with the flags, quests, items and position a player would have there.
 *
 *   { "id", "name", "after": "<preset>",          // builds on another preset
 *     "flags": [...], "clearFlags": [...], "vars": { name: value },
 *     "values": { name: "text" | null },           // e.g. where the Dead Center is
 *     "quests": { "<quest>": "active" | "completed" | { "done": [objective, ...] } },
 *     "items": ["id" | { "id", "count" }],
 *     "map", "spawn" | "x"/"y"/"facing", "script" }
 *
 * Engine-agnostic: the debug overlay, the E2E hooks and unit tests share it.
 */

/** Flattens a preset and its `after` chain (oldest first) into one plan. */
export function resolvePreset(content, id) {
  const chain = [];
  const seen = new Set();
  let cur = content.debugPresets.get(id);
  if (!cur) throw new Error(`Unknown debug preset "${id}"`);
  while (cur) {
    if (seen.has(cur.id)) throw new Error(`Debug preset "${id}" has a cycle in "after"`);
    seen.add(cur.id);
    chain.unshift(cur);
    cur = cur.after ? content.debugPresets.get(cur.after) : null;
  }
  const plan = { id, name: chain[chain.length - 1].name, flags: [], clearFlags: [], vars: {}, values: {}, quests: [], items: [], location: null, script: null };
  for (const p of chain) {
    for (const f of p.flags ?? []) if (!plan.flags.includes(f)) plan.flags.push(f);
    for (const f of p.clearFlags ?? []) {
      plan.flags = plan.flags.filter((x) => x !== f);
      if (!plan.clearFlags.includes(f)) plan.clearFlags.push(f);
    }
    Object.assign(plan.vars, p.vars ?? {});
    Object.assign(plan.values, p.values ?? {});
    // Quest steps are applied in order: a later preset completes what an earlier one started.
    for (const [quest, state] of Object.entries(p.quests ?? {})) plan.quests.push([quest, state]);
    for (const it of p.items ?? []) plan.items.push(typeof it === 'string' ? { id: it, count: 1 } : { id: it.id, count: it.count ?? 1 });
    if (p.map) plan.location = { map: p.map, spawn: p.spawn ?? null, x: p.x, y: p.y, facing: p.facing ?? 'down' };
    plan.script = p.script ?? null;
  }
  return plan;
}

/** Applies a resolved plan to a (fresh) session. Returns the plan's location. */
export function applyPresetPlan(session, plan) {
  for (const it of plan.items) if (session.inventory.count(it.id) < it.count) session.inventory.add(it.id, it.count - session.inventory.count(it.id));
  for (const [name, value] of Object.entries(plan.vars)) session.story.setVar(name, value);
  for (const [name, value] of Object.entries(plan.values ?? {})) session.story.setValue(name, value);
  for (const f of plan.flags) session.story.set(f);
  for (const [quest, state] of plan.quests) {
    const q = session.quests;
    if (state === 'active') q.start(quest);
    else if (state === 'completed') {
      if (q.status(quest) !== 'completed') q.complete(quest);
    } else {
      if (q.status(quest) === 'inactive') q.start(quest);
      for (const o of asArray(state.done)) q.completeObjective(quest, o, { force: true });
    }
  }
  // Quest rewards may set flags a later chapter clears again.
  for (const f of plan.clearFlags) session.story.clear(f);
  if (plan.location) session.location = { ...plan.location };
  return plan.location;
}

/** World-scene entry data for a plan (starts at the preset's position). */
export function presetEntry(plan) {
  const loc = plan.location;
  return {
    map: loc.map,
    spawn: loc.spawn ?? undefined,
    x: loc.x,
    y: loc.y,
    facing: loc.facing,
    then: plan.script ?? undefined,
    noAutosave: true,
  };
}
