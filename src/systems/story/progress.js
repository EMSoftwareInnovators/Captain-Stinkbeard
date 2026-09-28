import { evaluateCondition } from '../conditions/conditions.js';

/**
 * Story-driven lookups shared by the world, the dialogue box, saves and the
 * debug tools. All of them are pure functions of content + session, so the
 * current chapter, a character's look or the time of day always follow the
 * saved story flags and never need saving themselves.
 */

/**
 * An NPC, character, speaker or log entry with "variants": each field
 * (appearance, portrait, name, title, voice...) comes from the first variant
 * whose `if` holds and that sets it. So a look and a name can follow
 * different flags without every combination being spelled out:
 *
 *   "variants": [
 *     { "if": { "flag": "captain_named_stinkbeard" }, "name": "Stinkbeard" },
 *     { "if": { "flag": "squawks_sweater" }, "appearance": "squawks_sweater", "portrait": "squawks_sweater" },
 *     { "if": { "flag": "squawks_bald" }, "appearance": "squawks_bald", "portrait": "squawks_bald" }
 *   ]
 */
export function resolveVariant(def, session) {
  if (!def?.variants || !session) return def;
  let out = null;
  const taken = new Set();
  for (const v of def.variants) {
    if (!evaluateCondition(v.if, session)) continue;
    out ??= { ...def };
    for (const [key, value] of Object.entries(v)) {
      if (key === 'if' || key.startsWith('//') || taken.has(key)) continue;
      out[key] = value;
      taken.add(key);
    }
  }
  return out ?? def;
}

/**
 * Current chapter from data/game.json "chapters" (the last entry whose `if`
 * holds). Falls back to "chapterName".
 */
export function currentChapter(game, session) {
  const list = game?.chapters;
  if (!Array.isArray(list) || list.length === 0) return { id: 'default', name: game?.chapterName ?? '' };
  let found = null;
  for (const ch of list) if (!ch.if || (session && evaluateCondition(ch.if, session))) found = ch;
  return found ?? { id: 'default', name: game?.chapterName ?? '' };
}

/**
 * Time of day from data/game.json "timeOfDay" (the last entry whose `if`
 * holds): { id, grade, interior } where grade is a colour multiplied over the
 * world ("#ffffff" = none) and interior how strongly it reaches below decks.
 */
export function currentTimeOfDay(game, session) {
  const list = game?.timeOfDay;
  let found = { id: 'day', grade: null, interior: 0.35 };
  if (!Array.isArray(list)) return found;
  for (const t of list) if (!t.if || (session && evaluateCondition(t.if, session))) found = { interior: 0.35, ...t };
  return found;
}

/**
 * Story triggers (data/story/triggers/*.json) that should run now:
 *   { "id", "if": <condition>, "script": "…", "once": true (default) }
 * `fired(id)` reports triggers that already ran.
 */
export function dueStoryTriggers(triggers, session, fired) {
  const out = [];
  for (const t of triggers) {
    if (t.once !== false && fired(t.id)) continue;
    if (!evaluateCondition(t.if, session)) continue;
    out.push(t);
  }
  return out;
}

/** World-state key used to remember a story trigger has fired. */
export function triggerKey(id) {
  return `story:trigger_${id}`;
}
