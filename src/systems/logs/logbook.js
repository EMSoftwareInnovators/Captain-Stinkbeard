import { evaluateCondition } from '../conditions/conditions.js';
import { resolveVariant } from '../story/progress.js';

/**
 * Logbooks (data/logs/*.json): in-world records that fill in as the story
 * goes, such as the Grand Stenchmaster's Stench Log. Engine-agnostic.
 *
 *   "stench_log": {
 *     "title": "The Stench Log", "menuLabel": "Stench Log", "keeper": "garrick",
 *     "if": { "flag": "stench_log_seen" },            // when it shows in the menu
 *     "fields": [{ "id": "location", "label": "Location" }, ...],
 *     "severities": { "Mild": "g", "Severe": "o", "Catastrophic": "r" },
 *     "entries": [
 *       { "id": "treasure_room", "title": "Treasure Room", "if": { … },
 *         "location": "…", "severity": "Catastrophic", "source": "…", "notes": "…",
 *         "variants": [{ "if": { … }, "notes": "a later note" }] }
 *     ]
 *   }
 *
 * Which entries exist is a pure function of the story flags (so nothing new
 * is saved for them). Only "have I read it" and "has it been announced" are
 * remembered, in world state under "log:<id>".
 */

export const LOG_STATE_PREFIX = 'log:';

function stateKey(logId) {
  return `${LOG_STATE_PREFIX}${logId}`;
}

/** The log can be opened (from the menu or its in-world object). */
export function logAvailable(log, session) {
  return !log.if || evaluateCondition(log.if, session);
}

/** Entries unlocked right now, in data order, with their story variants applied. */
export function logEntries(log, session) {
  return (log.entries ?? [])
    .filter((e) => !e.if || evaluateCondition(e.if, session))
    .map((e) => resolveVariant(e, session));
}

function idList(session, logId, prop) {
  const v = session.world.get(stateKey(logId), prop, []);
  return Array.isArray(v) ? v : [];
}

/** Entries the player has not looked at yet ("NEW" in the log). */
export function unseenEntryIds(log, logId, session) {
  const seen = new Set(idList(session, logId, 'seen'));
  return logEntries(log, session).filter((e) => !seen.has(e.id)).map((e) => e.id);
}

export function markEntrySeen(session, logId, entryId) {
  const seen = idList(session, logId, 'seen');
  if (!seen.includes(entryId)) session.world.set(stateKey(logId), 'seen', [...seen, entryId]);
}

/**
 * Newly unlocked entries nobody has announced yet; marks them announced.
 * The world calls this when the story changes to post "Stench Log updated".
 * Entries unlocked before the log itself is available are announced
 * silently (the first look at the log shows them all).
 */
export function takeNewEntries(log, logId, session) {
  const entries = logEntries(log, session);
  const announced = idList(session, logId, 'announced');
  const fresh = entries.filter((e) => !announced.includes(e.id));
  if (!fresh.length) return [];
  session.world.set(stateKey(logId), 'announced', [...announced, ...fresh.map((e) => e.id)]);
  return logAvailable(log, session) && announced.length > 0 ? fresh : [];
}

/** Colour markup for a severity ("Catastrophic" → "<r>Catastrophic</>"). */
export function severityMarkup(log, severity) {
  if (!severity) return '';
  const col = log.severities?.[severity];
  return col ? `<${col}>${severity}</>` : severity;
}
