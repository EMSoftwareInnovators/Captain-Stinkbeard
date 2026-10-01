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
  for (const e of meta?.sharkDuty ?? []) {
    if (!e.if || evaluateCondition(e.if, session)) return e.session ?? null;
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
  constructor(def, state = null) {
    this.def = def;
    this.waves = def.waves ?? [];
    this.ramp = { ...DEFAULT_RAMP, ...(def.ramp ?? {}) };
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
    return { window: Math.round(base * lerp(this.ramp.window, t)), speed: lerp(this.ramp.speed, t), zone: Math.round(lerp(this.ramp.zone, t)), big, level: t };
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
