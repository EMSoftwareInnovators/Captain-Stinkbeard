/**
 * Story Phase 16: proceedings. One small engine for three kinds of Grand
 * Stenchmaster paperwork, all played as choices (the `proceeding` command;
 * data/story/proceedings/*.json):
 *
 *  - "form": a long application, compressed. Each question is a page (or a run
 *    of pages, "montage"); every answer is filed, some get a reaction. A
 *    question can be "required": an answer marked "invalid" is sent back and
 *    asked again (the clerk's job). Page numbers climb toward "pages".
 *  - "hearing": a council's questions. Answers carry points; the total must
 *    reach "pass". Falling short sends the applicant back to the start of the
 *    questions (a "retry" script first): nothing can be lost for good.
 *  - "pitch": persuading someone against a clock. Arguments carry points toward
 *    "goal"; every round the pressure climbs by "perRound". Reaching the goal
 *    first wins. Reaching "max" pressure runs the "fail" script and starts the
 *    pitch again from a checkpoint (the arguments already made still count
 *    for nothing; the pressure resets). Nothing here is random.
 *
 *   "ignition_application": {
 *     "kind": "form", "title": "...", "pages": 97, "pageVar": "ignition_page",
 *     "questions": [
 *       { "id": "name", "page": 1, "prompt": "puffchester: ...", "options": [{ "text": "...", "reply": ["line", ...], "points": 1, "invalid": false, "flag": "..." }] },
 *       { "id": "pages_12_30", "montage": [12, 30], "lines": ["..."] }
 *     ]
 *   }
 *
 * The rules here are engine-agnostic: they decide what an answer does; the
 * command plays it.
 */

export const PROCEEDING_KINDS = ['form', 'hearing', 'pitch'];

export function proceedingDef(content, id) {
  const d = content?.proceedings?.get?.(id);
  if (!d) throw new Error(`No proceeding "${id}" (data/story/proceedings)`);
  return d;
}

/** The questions a proceeding asks, in order (montages included). */
export function questionsOf(def) {
  return def.questions ?? [];
}

/** What an answer does: { points, again, reply, flag, lighter }. */
export function answerEffect(question, optionIndex) {
  const o = question.options?.[optionIndex];
  if (!o) throw new Error(`Proceeding: question "${question.id}" has no option ${optionIndex}`);
  return {
    points: o.points ?? 0,
    again: !!(question.required && o.invalid),
    reply: o.reply ?? [],
    flag: o.flag ?? null,
    lighter: o.lighter ?? null,
  };
}

/** Whether a hearing's total passes. */
export function hearingPassed(def, total) {
  return total >= (def.pass ?? 0);
}

/**
 * One round of a pitch: the argument's points and the pressure's climb.
 * Returns { convinced, pressure, won, lost }.
 */
export function pitchRound(def, convinced, pressure, points) {
  const c = convinced + points;
  const p = pressure + (def.perRound ?? 1);
  const won = c >= (def.goal ?? 1);
  return { convinced: c, pressure: p, won, lost: !won && p >= (def.max ?? Infinity) };
}
