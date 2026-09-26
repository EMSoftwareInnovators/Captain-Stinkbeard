/**
 * Dialogue line shorthand used throughout data/dialogue:
 *
 *   "hale: Morning, Captain."            speaker "hale", default expression
 *   "captain[annoyed]: What now?"         speaker "captain", expression "annoyed"
 *   "The barrel smells of rum."           narration (no speaker)
 *
 * Speaker ids are lowercase identifiers; anything else is narration. Content
 * validation rejects unknown speaker ids, so a line that accidentally looks
 * like "word: text" fails loudly instead of rendering with a bogus name.
 */
const LINE_RE = /^([a-z][a-z0-9_]*)(?:\[([a-z0-9_]+)\])?:\s+([\s\S]*)$/;

export function parseLine(str) {
  const m = LINE_RE.exec(str);
  if (m) return { speaker: m[1], expression: m[2] || null, text: m[3] };
  return { speaker: null, expression: null, text: str };
}
