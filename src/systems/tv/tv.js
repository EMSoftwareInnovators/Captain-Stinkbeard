import { evaluateCondition } from '../conditions/conditions.js';
import { parseLine } from '../script/parseLine.js';

/**
 * Televisions (Story Phase 5: the Stenchmaster Entertainment System, a CRT
 * Garrick built out of ship junk that should not work and does). Engine-
 * agnostic rules; the close-up you operate is ui/TvView.js and the set on
 * deck is ordinary animated props chosen by the same state.
 *
 * A set is data (data/tv/*.json):
 *
 *   "ses": {
 *     "name": "The Stenchmaster Entertainment System",
 *     "channelVar": "ses_channel", "powerVar": "ses_power",   // saved story variables
 *     "flags": { "open": "ses_examined", "wiring": "...", "power": "..." },
 *     "channels": [
 *       { "id": 1, "title": "Static", "frames": ["tv_static_0", "..."], "frameMs": 60,
 *         "glow": "#c8d0d8", "hum": "tv_static", "if": { ... },
 *         "comments": [["captain: Static.", "garrick: Live static."], ["..."]] } ],
 *     "wiring": [[lines]], "powerSource": [[lines]], "slap": [[lines]],
 *     "failures": { "every": [9000, 16000], "kinds": ["roll", "spark", "buzz", "smoke"],
 *                   "lines": [[lines]] }
 *   }
 *
 * Comments are lists of lines, one list per look, in turn. A line spoken by
 * someone who isn't in the room is skipped, so Garrick only answers when he's
 * there to answer ("And yet.").
 */

export function tvDef(content, id) {
  const def = content?.tv?.get?.(id);
  return def ? { id, ...def } : null;
}

// --- Story Phase 6: what condition the set is in -----------------------------------
//
//   "stateValue": "ses_state",                 // a saved story text value (unset = working)
//   "states": {
//     "apparently_dead": { "dead": true, "bezel": "ses_bezel_dead", "lookComments": [[lines]] },
//     "shark_damaged":   { "dead": true, "bezel": "ses_bezel_wrecked", "glass": "tv_cracked",
//                          "flicker": { "every": [7000, 14000], "frames": ["..."], "sfx": "...", "lines": [[...]] } }
//   }
//
// A dead set can't be switched on; the close-up still opens (to look at it).

export const TV_WORKING = 'working';

const stateValue = (def) => def.stateValue ?? `${def.id}_state`;

/** The set's condition id ("working" unless the story has said otherwise). */
export function tvStateId(def, session) {
  return session.story.getValue?.(stateValue(def)) ?? TV_WORKING;
}

/** The condition with its data: { id, dead, bezel, glass, flicker, lookComments }. */
export function tvCondition(def, session) {
  const id = tvStateId(def, session);
  return { id, ...(def.states?.[id] ?? {}) };
}

/** Puts the set into a condition; a dead set is also switched off. */
export function setTvCondition(def, session, id) {
  session.story.setValue(stateValue(def), !id || id === TV_WORKING ? null : id);
  if (tvCondition(def, session).dead) session.story.setVar(def.powerVar ?? `${def.id}_power`, 0);
}

// --- Story Phase 6: programmes ------------------------------------------------------
//
// A programme (data/tv/programs/*.json) is a show a channel can carry, made of
// episodes, each a list of beats: frames to cycle on the screen, a line for
// the cast (ordinary script lines; the cast are extra speakers), a sound cue,
// how long it stays up, and whether the laugh track goes. A channel carries
// one with "program": "<id>"; a cutscene plays an episode on a vista's screen
// with { "tvProgram": "<id>", "episode": "<id>" }. New episodes are data.

export function programDef(content, id) {
  const def = content?.tvPrograms?.get?.(id);
  return def ? { id, ...def } : null;
}

/** The episode to show: by id, or the last one whose "if" holds (the newest). */
export function programEpisode(program, session, id = null) {
  const list = program?.episodes ?? [];
  if (id) return list.find((e) => e.id === id) ?? null;
  const open = list.filter((e) => !e.if || evaluateCondition(e.if, session));
  return open[open.length - 1] ?? list[0] ?? null;
}

const channelVar = (def) => def.channelVar ?? `${def.id}_channel`;
const powerVar = (def) => def.powerVar ?? `${def.id}_power`;

/** Channels that exist now (each may carry an `if`). */
export function availableChannels(def, session) {
  return (def.channels ?? []).filter((c) => !c.if || evaluateCondition(c.if, session));
}

/** { power, channel } — the channel object currently tuned (falls back to the first). */
export function tvState(def, session) {
  const list = availableChannels(def, session);
  const id = session.story.getVar(channelVar(def)) || list[0]?.id || 1;
  const channel = list.find((c) => c.id === id) ?? list[0] ?? null;
  const dead = !!def.states?.[tvStateId(def, session)]?.dead;
  return { power: !dead && !!session.story.getVar(powerVar(def)), channel, dead };
}

export function setPower(def, session, on) {
  if (on && tvState(def, session).dead) return;
  session.story.setVar(powerVar(def), on ? 1 : 0);
  // Variables read 0 until set: no channel tuned yet means the first one.
  if (!session.story.getVar(channelVar(def))) session.story.setVar(channelVar(def), availableChannels(def, session)[0]?.id ?? 1);
}

export function setChannel(def, session, id) {
  session.story.setVar(channelVar(def), id);
}

/** Turns the knob one click (dir +1 / -1), wrapping round the available channels. */
export function stepChannel(def, session, dir) {
  const list = availableChannels(def, session);
  if (!list.length) return null;
  const cur = tvState(def, session).channel;
  const i = Math.max(0, list.indexOf(cur));
  const next = list[(i + dir + list.length) % list.length];
  setChannel(def, session, next.id);
  return next;
}

/**
 * The next set of lines from a list of looks, cycling with a counter kept in
 * world counters (`tv:<id>:<key>`), with absent speakers filtered out.
 * `present(id)` says whether someone is in the room ("captain" always is).
 */
export function nextLines(def, session, key, looks, present = () => true) {
  if (!Array.isArray(looks) || !looks.length) return [];
  const lists = Array.isArray(looks[0]) ? looks : [looks];
  const n = (session.world?.incrementCounter?.(`tv:${def.id}:${key}`) ?? 1) - 1;
  const lines = lists[n % lists.length];
  return lines.map((l) => parseLine(l)).filter((l) => !l.speaker || l.speaker === 'captain' || l.speaker === 'player' || present(l.speaker));
}
