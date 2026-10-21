import { isPlainObject } from '../../core/util.js';

/**
 * Difficulty and accessibility assists for challenges
 * (docs/gameplay-overhaul/08-difficulty-and-accessibility.md). Engine-agnostic.
 *
 * Two separate player choices, any combination allowed:
 *
 *   difficulty     deckhand | captain (default) | brutal: the rules a challenge
 *                  that opted in is played by (data/difficulty/presets.json, and
 *                  a profile's or challenge's own "difficulty" blocks)
 *   assists        "timingAssist" (off | light | strong) and "classicBar": how
 *                  much help the player's hands get (data/difficulty/assists.json).
 *                  An assist eases the timing; it never decides an outcome
 *
 * A challenge's config is resolved in layers, each later one winning
 * (src/systems/challenge/config.js):
 *
 *   1. engine defaults      the kind's defaults and the mechanic's own numbers
 *                           (the step's green and speed, the tension def's band)
 *   2. difficulty preset    data/difficulty/presets.json: each kind's feel on that
 *                           difficulty, as bounded adjustments (TUNING)
 *   3. shared profile       data/challenges, then its "difficulty.<id>" block
 *   4. the challenge        the step's (or duty entry's) spec, then its
 *                           "difficulty.<id>" block
 *   5. assists              applied to each attempt's final numbers (ASSIST_TUNING)
 *
 * Legacy steps (no challenge) never see layers 2-4: they play as they always
 * have. Timing assist, being the player's own accommodation, eases them too.
 */
export const DIFFICULTIES = Object.freeze(['deckhand', 'captain', 'brutal']);
export const DEFAULT_DIFFICULTY = 'captain';
export const TIMING_ASSIST_LEVELS = Object.freeze(['off', 'light', 'strong']);

/** What a player who never opened the options plays with. */
export const DEFAULT_PREFS = Object.freeze({ difficulty: DEFAULT_DIFFICULTY, timingAssist: 'off', classicBar: false });

/**
 * The "feel" a difficulty preset may give each kind: adjustments to the
 * mechanic's own numbers, never absolute replacements, each kept within
 * [min, max]. They change how a challenge feels; limits, retries and costs
 * per difficulty belong to profiles and challenges (their "difficulty" blocks).
 *
 *   repair        zoneAdd: px of green · speedScale: the marker's speed
 *   sashTension   tolerance: points either side of the band · graceAdd: seconds
 *                 out of the band before a slip · swayScale: the ship's sway
 *   sharkDuty     reactionScale: how long each shark waits before it bites
 */
export const TUNING = Object.freeze({
  repair: { zoneAdd: [-10, 12], speedScale: [0.7, 1.4] },
  sashTension: { tolerance: [-6, 10], graceAdd: [-0.8, 1.2], swayScale: [0.6, 1.4] },
  sharkDuty: { reactionScale: [0.6, 1.6] },
});

/**
 * What a timing-assist level may change, within [min, max]: only ever easier.
 *   repair        speedScale (slower) · zoneAdd (more green) · timeScale (a longer clock) · cues
 *   sashTension   tolerance (a wider band) · graceAdd (longer before a slip) · swayScale (calmer) · cues
 * "cues" adds readable shapes and words to the timing (not colour alone).
 */
export const ASSIST_TUNING = Object.freeze({
  repair: { speedScale: [0.5, 1], zoneAdd: [0, 16], timeScale: [1, 2] },
  sashTension: { tolerance: [0, 12], graceAdd: [0, 1.5], swayScale: [0.5, 1] },
});

/** The classic bar's assist (strict bars only), within these bounds. */
export const CLASSIC_BOUNDS = Object.freeze({ widenAfter: [1, 5], widenScale: [1, 2.5], steadyAfter: [1, 8] });

export function isDifficulty(id) {
  return DIFFICULTIES.includes(id);
}

/** Prefs from anything (settings, a test): unknown values fall back to the defaults. */
export function normalizePrefs(p = {}) {
  const src = p ?? {};
  return {
    difficulty: isDifficulty(src.difficulty) ? src.difficulty : DEFAULT_DIFFICULTY,
    timingAssist: TIMING_ASSIST_LEVELS.includes(src.timingAssist) ? src.timingAssist : 'off',
    classicBar: src.classicBar === true,
  };
}

/** A difficulty's preset (data/difficulty/presets.json), or null. */
export function difficultyPreset(content, id) {
  return content?.difficulties?.get?.(id) ?? null;
}

/** The presets in their menu order: [{ id, label, tagline, summary, default }]. */
export function difficultyList(content) {
  return DIFFICULTIES.map((id, i) => {
    const p = difficultyPreset(content, id) ?? {};
    return { id, order: p.order ?? i, label: p.label ?? id, tagline: p.tagline ?? '', summary: p.summary ?? '', default: id === DEFAULT_DIFFICULTY };
  }).sort((a, b) => a.order - b.order);
}

/** A preset's feel for one kind (layer 2), or {}. */
export function presetTuning(content, difficulty, kind) {
  const t = difficultyPreset(content, difficulty)?.challenges?.[kind];
  return isPlainObject(t) ? { ...t } : {};
}

/** The timing-assist level's definition, or null when off. */
export function timingAssistDef(content, level) {
  if (!level || level === 'off') return null;
  return content?.assists?.get?.('timingAssist')?.[level] ?? null;
}

export function classicBarDef(content) {
  return content?.assists?.get?.('classicBar') ?? null;
}

/**
 * The assists that help one attempt of a kind:
 *   { applied: ['timingAssist:light', 'classicBar'], timing, tension, classic, cues }
 *   timing    repair: { speedScale, zoneAdd, timeScale } or null
 *   tension   sashTension: { tolerance, graceAdd, swayScale } or null
 *   classic   repair, strict only: the bar's assist ({ widenAfter, widenScale, steadyAfter }) or null
 * Options:
 *   strict        the attempt can fail (classic only helps strict bars: a legacy bar is classic already)
 *   allowClassic  the challenge's "assists.classic" (true unless it says no)
 *   ownAssist     the challenge gives the bar its own assist (it stands; classic adds nothing)
 * Shark Duty's watch has no timing of its own: its shoves are timing bars, assisted there.
 */
export function resolveAssists(content, kind, prefs, { strict = false, allowClassic = true, ownAssist = false } = {}) {
  const p = normalizePrefs(prefs);
  const out = { applied: [], timing: null, tension: null, classic: null, cues: false };
  const level = timingAssistDef(content, p.timingAssist);
  if (level && kind === 'repair' && isPlainObject(level.repair)) {
    out.timing = boundedAssist('repair', level.repair);
    out.cues = level.repair.cues === true;
    out.applied.push(`timingAssist:${p.timingAssist}`);
  }
  if (level && kind === 'sashTension' && isPlainObject(level.sashTension)) {
    out.tension = boundedAssist('sashTension', level.sashTension);
    out.cues = level.sashTension.cues === true;
    out.applied.push(`timingAssist:${p.timingAssist}`);
  }
  if (p.classicBar && kind === 'repair' && strict && allowClassic && !ownAssist) {
    const a = classicBarDef(content)?.assist;
    if (isPlainObject(a)) {
      out.classic = { widenAfter: a.widenAfter ?? 1, widenScale: a.widenScale ?? 1.6, steadyAfter: a.steadyAfter ?? null };
      out.applied.push('classicBar');
    }
  }
  return out;
}

/** An assist's numbers, clamped to ASSIST_TUNING (so a bad data file can't make anything harder). */
function boundedAssist(kind, def) {
  const out = {};
  for (const [key, [min, max]] of Object.entries(ASSIST_TUNING[kind])) {
    const neutral = key.endsWith('Scale') ? 1 : 0;
    const v = Number.isFinite(def[key]) ? def[key] : neutral;
    out[key] = Math.max(min, Math.min(max, v));
  }
  return out;
}

/** Problems with a tuning block (a preset's, or a challenge's own tuning mechanics): unknown keys, out of bounds. */
export function tuningProblems(kind, tuning, { where = 'tuning', table = TUNING } = {}) {
  const out = [];
  const bounds = table[kind];
  if (!bounds) return out;
  for (const [key, v] of Object.entries(tuning ?? {})) {
    if (key.startsWith('//') || key.startsWith('_') || key === 'cues') continue;
    if (!bounds[key]) continue; // not a tuning key (a limit, checked by the kind)
    const [min, max] = bounds[key];
    if (!Number.isFinite(v) || v < min || v > max) out.push(`${where}.${key} must be a number from ${min} to ${max} (got ${JSON.stringify(v)})`);
  }
  return out;
}

/**
 * Everything wrong with data/difficulty: presets for exactly the known
 * difficulties, Captain the default, every tuning in bounds; assist levels
 * that only make timing easier (a slower marker always gets at least the
 * matching extra time, so a clock never becomes harder to beat).
 */
export function difficultyDataProblems(content) {
  const out = [];
  const presets = content?.difficulties;
  for (const id of presets?.ids?.() ?? []) if (!isDifficulty(id)) out.push(`data/difficulty/presets.json: unknown difficulty "${id}" (the game knows: ${DIFFICULTIES.join(', ')})`);
  for (const id of DIFFICULTIES) {
    const p = difficultyPreset(content, id);
    const at = `data/difficulty/presets.json (${id})`;
    if (!p) {
      out.push(`${at}: missing`);
      continue;
    }
    for (const key of ['label', 'tagline', 'summary']) if (typeof p[key] !== 'string' || !p[key]) out.push(`${at}: needs "${key}"`);
    if ((p.default === true) !== (id === DEFAULT_DIFFICULTY)) out.push(`${at}: only "${DEFAULT_DIFFICULTY}" is the default`);
    // "ship": the ship's damage, repairs and costs on this difficulty (checked with the ship's data, src/systems/ship/integrity.js).
    for (const key of Object.keys(p)) if (!key.startsWith('//') && !['order', 'default', 'label', 'tagline', 'summary', 'challenges', 'ship'].includes(key)) out.push(`${at}: unknown field "${key}"`);
    for (const [kind, t] of Object.entries(p.challenges ?? {})) {
      if (!TUNING[kind]) {
        out.push(`${at}: "${kind}" is not a challenge kind`);
        continue;
      }
      for (const key of Object.keys(t ?? {})) if (!key.startsWith('//') && !TUNING[kind][key]) out.push(`${at}: challenges.${kind}.${key} is not a difficulty tuning (use: ${Object.keys(TUNING[kind]).join(', ')})`);
      out.push(...tuningProblems(kind, t, { where: `${at}: challenges.${kind}` }));
    }
  }
  const levels = content?.assists?.get?.('timingAssist');
  if (!isPlainObject(levels)) out.push('data/difficulty/assists.json: needs "timingAssist"');
  else {
    for (const id of Object.keys(levels)) if (!id.startsWith('//') && !TIMING_ASSIST_LEVELS.includes(id)) out.push(`data/difficulty/assists.json: unknown timing assist level "${id}" (use: ${TIMING_ASSIST_LEVELS.join(', ')})`);
    for (const id of TIMING_ASSIST_LEVELS) {
      const lv = levels[id];
      const at = `data/difficulty/assists.json (timingAssist.${id})`;
      if (!isPlainObject(lv)) {
        out.push(`${at}: missing`);
        continue;
      }
      if (typeof lv.label !== 'string' || typeof lv.summary !== 'string') out.push(`${at}: needs "label" and "summary"`);
      if (id === 'off' && (lv.repair || lv.sashTension)) out.push(`${at}: "off" can't change anything`);
      for (const kind of Object.keys(ASSIST_TUNING)) {
        if (lv[kind] === undefined) continue;
        for (const key of Object.keys(lv[kind])) if (!key.startsWith('//') && key !== 'cues' && !ASSIST_TUNING[kind][key]) out.push(`${at}: ${kind}.${key} is not an assist setting (use: ${Object.keys(ASSIST_TUNING[kind]).join(', ')}, cues)`);
        out.push(...tuningProblems(kind, lv[kind], { where: `${at}: ${kind}`, table: ASSIST_TUNING }));
      }
      const r = lv.repair;
      if (r && Number.isFinite(r.speedScale) && (r.timeScale ?? 1) < 1 / r.speedScale - 1e-9) out.push(`${at}: repair.timeScale must be at least 1 / speedScale (${(1 / r.speedScale).toFixed(2)}), or a slower bar could run out of time`);
    }
  }
  const classic = classicBarDef(content);
  if (!isPlainObject(classic?.assist)) out.push('data/difficulty/assists.json: needs "classicBar.assist"');
  else {
    const a = classic.assist;
    for (const [key, [min, max]] of Object.entries(CLASSIC_BOUNDS)) {
      if (a[key] === null && key === 'steadyAfter') continue;
      if (!Number.isFinite(a[key]) || a[key] < min || a[key] > max) out.push(`data/difficulty/assists.json: classicBar.assist.${key} must be from ${min} to ${max}`);
    }
    if (Number.isFinite(a.steadyAfter) && a.steadyAfter < a.widenAfter) out.push('data/difficulty/assists.json: classicBar.assist.steadyAfter must not come before widenAfter');
    if (!isPlainObject(classic.summary) || typeof classic.summary.on !== 'string' || typeof classic.summary.off !== 'string') out.push('data/difficulty/assists.json: classicBar.summary needs "on" and "off"');
  }
  return out;
}
