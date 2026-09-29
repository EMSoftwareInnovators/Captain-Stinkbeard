/**
 * The bell protocol (Story Phase 4): the crew's warnings about the Dead
 * Center, rung on a bell that coughs. Engine-agnostic data lookups; the
 * overlay shows and plays them (OverlayScene.alarm).
 *
 * Levels live in data/hazards/alarms.json:
 *
 *   "levels": {
 *     "3": { "label": "THREE BELLS", "text": "DEAD CENTER SIGHTED. EVACUATE.",
 *            "sound": "KLANG-HACK-KOFF", "sfx": "alarm_bell_3", "color": "#e04030" }
 *   }
 *
 * Every alarm is shown as well as heard: the number of bells, what they
 * mean, where (when the script says), and the bell's sound written out, so
 * nobody has to rely on audio. Scripts ring them with { "alarm": 3 }; the
 * world never rings them on its own, so free exploration stays quiet.
 */
export const DEFAULT_ALARMS = Object.freeze({
  1: { label: 'ONE BELL', text: 'Outer cloud approaching', sound: 'KLANG-HACK', sfx: 'bell_cough', color: '#e8c848', bells: 1 },
  2: { label: 'TWO BELLS', text: 'Dense fumes', sound: 'KLANG-HACK-KOFF', sfx: 'bell_cough', color: '#e8943a', bells: 2 },
  3: { label: 'THREE BELLS', text: 'DEAD CENTER SIGHTED. EVACUATE.', sound: 'KLANG-HACK-KOFF-WHEEZE', sfx: 'bell_cough', color: '#e04030', bells: 3 },
  4: { label: 'FOUR BELLS', text: 'Garrick is drawing a forecast', sound: 'KLANG-HACK, FOUR TIMES', sfx: 'bell_cough', color: '#b070d0', bells: 4 },
});

export function alarmLevels(content) {
  const data = content?.hazards?.get?.('alarms')?.levels ?? {};
  const out = { ...DEFAULT_ALARMS };
  for (const [k, v] of Object.entries(data)) out[k] = { ...(out[k] ?? {}), ...v };
  return out;
}

/** The definition of one level (1-4), filled from the defaults. */
export function alarmLevel(content, level) {
  const levels = alarmLevels(content);
  const def = levels[String(level)];
  if (!def) return null;
  return { bells: Number(level), ...def };
}

/** "#e04030" -> 0xe04030 */
export function alarmColor(def) {
  const n = parseInt(String(def?.color ?? '#e8c848').replace('#', ''), 16);
  return Number.isFinite(n) ? n : 0xe8c848;
}
