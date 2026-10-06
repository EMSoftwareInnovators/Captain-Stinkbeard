import { evaluateCondition } from '../conditions/conditions.js';
import { resolveVariant } from './progress.js';

/**
 * Temporary actor aliases (Story Phase 13): who somebody *appears* to be,
 * for a while, without changing who they are. A dream, a disguise, a case of
 * mistaken identity, or a captain who has breathed through his own beard
 * once too often and now sees Ancient Stenchmasters everywhere.
 *
 * Sets are data (data/story/aliases/*.json), each live while its "if" holds:
 *
 *   "stinkbeard_delirium": {
 *     "if": { "flag": "stinkbeard_delirium" },
 *     "overlay": { "tint": "#e8d0ff", "wobble": 1 },      // optional: the world through his eyes
 *     "actors": {
 *       "pete": { "name": "BROGATH THE BASHFUL", "portrait": "delirium_brogath",
 *                 "appearance": "pete_brogath", "flicker": true }
 *     }
 *   }
 *
 * The dialogue box shows the alias's name and portrait (and, with "flicker",
 * the real ones for a blink now and then); the world draws the alias's
 * appearance. Nothing is stored: ids, saves, quests, dialogue selectors and
 * story flags all keep using the real ids, and the alias goes when its
 * condition does.
 */

/** Alias sets live now, in data order. */
export function activeAliasSets(content, session) {
  const reg = content?.aliases;
  if (!reg?.list || !session) return [];
  return reg.list().filter((set) => evaluateCondition(set.if, session));
}

/** The alias somebody wears now (first live set that names them), or null. */
export function actorAlias(content, session, id) {
  if (!id) return null;
  for (const set of activeAliasSets(content, session)) {
    const a = set.actors?.[id];
    if (a) return a;
  }
  return null;
}

/**
 * A speaker as the dialogue box should show them: their story variant, then
 * the alias on top ({ name, portrait, realName, realPortrait, flicker }).
 */
export function resolveSpeaker(content, session, id) {
  const sp = resolveVariant(content?.speaker?.(id) ?? null, session);
  if (!sp) return null;
  const alias = actorAlias(content, session, sp.id ?? id) ?? actorAlias(content, session, id);
  if (!alias) return sp;
  return {
    ...sp,
    name: alias.name ?? sp.name,
    portrait: alias.portrait ?? sp.portrait,
    realName: sp.name,
    realPortrait: sp.portrait,
    flicker: !!alias.flicker,
    alias: true,
  };
}

/** The appearance an NPC is drawn with now: its variant's, or its alias's. */
export function resolveActorLook(content, session, def) {
  const look = resolveVariant(def, session);
  const alias = actorAlias(content, session, def?.id);
  return alias?.appearance ? { ...look, appearance: alias.appearance } : look;
}

/** The first live set's world overlay ({ tint, wobble }), or null. */
export function aliasOverlay(content, session) {
  return activeAliasSets(content, session).find((s) => s.overlay)?.overlay ?? null;
}
