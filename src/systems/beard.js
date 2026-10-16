/**
 * Story Phase 16: the Beard Contamination Profile. Not a chemistry system: the
 * captain's beard keeps a record of what it has been through, as story tags
 * (data/story/beard.json), each one a flag ("beard_" + the tag in lower case):
 *
 *   "beard": {
 *     "flagPrefix": "beard_",
 *     "tags": {
 *       "COFFIN_SOCK": { "label": "Coffin Sock", "note": "Ancient, musty, beans.", "permanent": true },
 *       "HORNET_ATTRACTED": { "label": "Hornets", "note": "...", "permanent": false }
 *     }
 *   }
 *
 * Dialogue, looks and the hornets read the flags with ordinary conditions;
 * the `beard` script command adds a tag (or removes a temporary one). The
 * logbook "The Captain's Beard" lists them. Permanent tags are never removed:
 * the beard is a record of the campaign.
 */

export function beardDef(content) {
  return content?.beard?.get?.('beard') ?? null;
}

export function beardFlag(def, tag) {
  return `${def?.flagPrefix ?? 'beard_'}${String(tag).toLowerCase()}`;
}

/** The tags the beard carries now, in the data's order. */
export function beardTags(content, session) {
  const def = beardDef(content);
  if (!def) return [];
  return Object.keys(def.tags ?? {}).filter((t) => session.story.has(beardFlag(def, t)));
}

export function hasBeardTag(content, session, tag) {
  const def = beardDef(content);
  return !!def && session.story.has(beardFlag(def, tag));
}

/** Adds a tag (true if it's new). Unknown tags throw: the validator checks every one a script uses. */
export function addBeardTag(content, session, tag) {
  const def = beardDef(content);
  if (!def?.tags?.[tag]) throw new Error(`No beard tag "${tag}" (data/story/beard.json)`);
  const f = beardFlag(def, tag);
  if (session.story.has(f)) return false;
  session.story.set(f);
  return true;
}

/** Removes a temporary tag (a permanent one stays: true if it was removed). */
export function removeBeardTag(content, session, tag) {
  const def = beardDef(content);
  const t = def?.tags?.[tag];
  if (!t) throw new Error(`No beard tag "${tag}" (data/story/beard.json)`);
  if (t.permanent !== false) return false;
  const f = beardFlag(def, tag);
  if (!session.story.has(f)) return false;
  session.story.clear(f);
  return true;
}
