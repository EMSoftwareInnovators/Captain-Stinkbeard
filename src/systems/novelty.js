/**
 * Story Phase 16: novelty devices (THE GRAND STENCHMASTER'S GRAND LIGHTER OF
 * GRAND SMOKES, Cheap-O-Rama). A device has a malfunction profile: what can
 * happen when you try it, and a fixed sequence it works through, so it is
 * unreliable without being random (data/story/novelty.json):
 *
 *   "grand_smokes": {
 *     "item": "grand_stenchmaster_lighter",
 *     "counterVar": "lighter_clicks",          // every attempt ever, saved
 *     "outcomes": { "click": { "text": "Click.", "sfx": "lighter_click" }, "flame": { "text": "...", "sfx": "...", "lit": true }, ... },
 *     "sequence": ["click", "nothing", "spark", "brown_puff", ...]   // attempt n gets sequence[n % length]
 *   }
 *
 * A scene that needs a particular result says so ("until": "flame"): the
 * attempts play out as the sequence says and the last one is the forced
 * outcome. Nothing here can be failed or farmed: the device gives nothing.
 */

export function noveltyDef(content, id) {
  const d = content?.novelty?.get?.(id);
  if (!d) throw new Error(`No novelty device "${id}" (data/story/novelty.json)`);
  return d;
}

/** The outcome the device's next attempt will have (without making it). */
export function peekOutcome(def, session) {
  const n = session.story.getVar(def.counterVar ?? 'novelty_attempts', 0);
  const seq = def.sequence ?? [];
  return seq.length ? seq[n % seq.length] : null;
}

/**
 * Makes `attempts` attempts (the last forced to `until` if given). Returns the
 * outcome ids in order and moves the saved counter on.
 */
export function attempt(def, session, attempts = 1, until = null) {
  const out = [];
  const v = def.counterVar ?? 'novelty_attempts';
  for (let i = 0; i < attempts; i++) {
    let o = peekOutcome(def, session);
    if (until && i === attempts - 1) o = until;
    if (!def.outcomes?.[o]) throw new Error(`Novelty: no outcome "${o}"`);
    out.push(o);
    session.story.addVar(v, 1);
  }
  return out;
}
