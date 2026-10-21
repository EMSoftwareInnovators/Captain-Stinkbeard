import { evaluateCondition } from '../conditions/conditions.js';

/**
 * Shark Duty (Story Phase 4): the crew's most hated job. Sharks drawn by the
 * contaminated hull keep coming back to chew it, and whoever is on duty
 * walks the rail with a pole and discourages them. Engine-agnostic rules;
 * the world runs it with world/SharkDuty.js.
 *
 * A map turns duty on from the story (first matching entry runs):
 *
 *   "sharkDuty": [{ "if": { "objectiveActive": "shark_duty.repel" }, "session": "first_watch" }]
 *
 * Sessions and rail sections are data (data/hazards/shark_duty.json):
 *
 *   "sections": { "port_mid": { "x": 16, "y": 22 } },    // a rail tile, faced from the deck
 *   "sessions": {
 *     "first_watch": {
 *       "event": "shark_repelled",     // fired per shark driven off (quest "event" objectives)
 *       "counter": "shark_duty.repel", // shown on the duty board: progress of this objective
 *       "window": 8000,                // ms a shark gives you before it bites
 *       "maxActive": 2,                // most sharks at the rail at once
 *       "waves": [
 *         { "gap": 1500, "section": "port_mid" },
 *         { "gap": 5000, "section": "stbd_fore", "big": true },   // big: two shoves
 *         { "gap": 4000, "boarder": [10, 22] }                     // one flops aboard
 *       ],
 *       "barks": [{ "who": "brask", "text": "Get OFF it!" }]
 *     }
 *   }
 *
 * The waves repeat until the story moves on (the objective completes and
 * the map's entry stops matching). Time only passes while the captain has
 * control. Nothing can be lost: a shark that gets a bite in leaves damage
 * to patch; nobody is hurt and the duty simply carries on.
 */

export function dutyData(content) {
  return content?.hazards?.get?.('shark_duty') ?? { sections: {}, sessions: {} };
}

/** The duty session the map runs right now (its first matching entry), or null. */
export function dutySessionFor(meta, session) {
  return dutyEntryFor(meta, session)?.session ?? null;
}

/** The map's first matching duty entry ({ if, session, challenge? }), or null. */
export function dutyEntryFor(meta, session) {
  for (const e of meta?.sharkDuty ?? []) {
    if (!e.if || evaluateCondition(e.if, session)) return e;
  }
  return null;
}

/** A wave's key for "only one at a time here": its rail section, or the deck for boarders. */
export function waveSpot(wave) {
  return wave.boarder ? 'deck' : wave.section;
}

/**
 * The wave schedule: which sharks turn up when. Pure and deterministic, so
 * tests can run a duty without a screen.
 */
/**
 * How much harder each shark makes the next (a session's "ramp"; any field
 * left out keeps this default). `level` runs from 0 (the first shark) to 1
 * (after `over` sharks) and blends each pair [first, hardest]:
 *   window  ms a shark waits before it bites      (shorter)
 *   gap     scale on the time between arrivals     (sooner)
 *   speed   scale on the timing bar's marker       (faster)
 *   zone    width of the green zone, px            (narrower)
 *   bigFrom level from which every `bigEvery`th shark is a big one (two shoves)
 * The timing bar still widens after two misses in a row, so it can't be failed.
 */
export const DEFAULT_RAMP = Object.freeze({ over: 8, window: [1, 0.55], gap: [1, 0.6], speed: [1, 1.7], zone: [26, 15], bigFrom: 0.4, bigEvery: 3 });

const lerp = ([a, b], t) => a + (b - a) * t;

/**
 * The wave schedule: which sharks turn up when, and how hard each one is.
 * Pure and deterministic, so tests can run a duty without a screen, and its
 * state() can be put aside while the captain is off the deck.
 */
export class DutyPlan {
  /**
   * @param {object} def    the session (data/hazards/shark_duty.json)
   * @param {object} state  a plan put aside (state())
   * @param {object} opts   reactionScale: a watch that opted into a challenge, on its
   *                        difficulty (docs/gameplay-overhaul/08-difficulty-and-accessibility.md):
   *                        how long each shark waits before it bites. 1 for every legacy watch.
   */
  constructor(def, state = null, { reactionScale = 1 } = {}) {
    this.def = def;
    this.waves = def.waves ?? [];
    this.ramp = { ...DEFAULT_RAMP, ...(def.ramp ?? {}) };
    this.reactionScale = Number.isFinite(reactionScale) && reactionScale > 0 ? reactionScale : 1;
    this.index = 0;
    this.cycles = 0;
    this.served = 0;
    this.clock = this.waves[0]?.gap ?? 1200;
    if (state) Object.assign(this, { index: state.index, cycles: state.cycles, served: state.served, clock: state.clock });
  }

  state() {
    return { index: this.index, cycles: this.cycles, served: this.served, clock: this.clock };
  }

  /** 0 for the first shark of the watch, 1 once `ramp.over` have come. */
  level(n = this.served) {
    return Math.max(0, Math.min(1, n / Math.max(1, this.ramp.over)));
  }

  /** How hard the next shark is: { window, speed, zone, big }. */
  tuning(wave = {}, n = this.served) {
    const t = this.level(n);
    const base = wave.window ?? this.def.window ?? 8000;
    const big = !!wave.big || (t >= this.ramp.bigFrom && n % this.ramp.bigEvery === this.ramp.bigEvery - 1);
    return { window: Math.round(base * lerp(this.ramp.window, t) * this.reactionScale), speed: lerp(this.ramp.speed, t), zone: Math.round(lerp(this.ramp.zone, t)), big, level: t };
  }

  /**
   * Advances the schedule by dt (ms) and returns the waves that start now,
   * each with its tuning. A wave whose spot is still busy is skipped; when
   * the rail is full the next shark waits for room.
   * @param {Set<string>} busySpots sections (or "deck") with a shark there already
   */
  tick(dt, busySpots = new Set()) {
    if (!this.waves.length) return [];
    const due = [];
    const max = this.def.maxActive ?? 2;
    this.clock -= dt;
    let guard = 0;
    while (this.clock <= 0 && guard++ < this.waves.length * 2) {
      if (busySpots.size + due.length >= max) {
        this.clock = 400; // no room: try again shortly
        break;
      }
      const wave = this.waves[this.index % this.waves.length];
      const spot = waveSpot(wave);
      const taken = busySpots.has(spot) || due.some((w) => waveSpot(w) === spot);
      if (!taken) {
        due.push({ ...wave, tuning: this.tuning(wave) });
        this.served += 1;
      }
      this.index += 1;
      if (this.index % this.waves.length === 0) this.cycles += 1;
      this.clock += (this.waves[this.index % this.waves.length].gap ?? 4000) * lerp(this.ramp.gap, this.level());
    }
    return due;
  }
}

/**
 * The watch's score, for a duty opted into a challenge (docs/gameplay-overhaul/07-challenge-outcomes.md).
 * Pure: the world tells it what happened, it says how the watch is going
 * and whether it has been lost. A duty without a challenge never makes one,
 * and plays exactly as it always has (bites only leave patches).
 *
 * Limits (each optional; the challenge's "mechanics"):
 *   maxBites        more bites than this in one watch and it's lost
 *   sectionBites    { "port_mid": 2 } more than this at one rail section
 *   maxMissed       more failed shoves than this (a strict shove that didn't land)
 *   timeLimit       ms of the captain's time on watch before it's lost
 */
export class DutyWatch {
  constructor(limits = {}) {
    this.limits = limits;
    this.repelled = 0;
    this.bites = 0;
    this.missed = 0;
    this.patched = 0;
    this.elapsed = 0;
    this.bySection = {};
  }

  /** The captain's time on watch (only while he has control, like the duty's own clock). */
  tick(dt) {
    this.elapsed += dt;
  }

  repel() {
    this.repelled += 1;
  }

  bite(section = null) {
    this.bites += 1;
    if (section) this.bySection[section] = (this.bySection[section] ?? 0) + 1;
  }

  /** A shove that didn't land (a strict timing bar that failed): the shark is still there. */
  miss() {
    this.missed += 1;
  }

  patch() {
    this.patched += 1;
  }

  /** Why the watch is lost, or null. */
  failure() {
    const l = this.limits;
    if (l.maxBites !== undefined && this.bites > l.maxBites) return 'bites';
    for (const [section, max] of Object.entries(l.sectionBites ?? {})) if ((this.bySection[section] ?? 0) > max) return `section:${section}`;
    if (l.maxMissed !== undefined && this.missed > l.maxMissed) return 'missed';
    if (l.timeLimit && this.elapsed >= l.timeLimit) return 'time';
    return null;
  }

  /** The metrics a challenge's rules read. */
  metrics({ completed = false } = {}) {
    return {
      completed,
      repelled: this.repelled,
      bites: this.bites,
      missed: this.missed,
      patched: this.patched,
      elapsed: Math.round(this.elapsed),
      worstSection: Math.max(0, ...Object.values(this.bySection)),
    };
  }

  state() {
    return { repelled: this.repelled, bites: this.bites, missed: this.missed, patched: this.patched, elapsed: this.elapsed, bySection: { ...this.bySection } };
  }

  static fromState(limits, s) {
    const w = new DutyWatch(limits);
    if (s) Object.assign(w, { repelled: s.repelled, bites: s.bites, missed: s.missed, patched: s.patched, elapsed: s.elapsed, bySection: { ...s.bySection } });
    return w;
  }
}
