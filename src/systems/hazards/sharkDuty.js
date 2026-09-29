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
export class DutyPlan {
  constructor(def) {
    this.def = def;
    this.waves = def.waves ?? [];
    this.index = 0;
    this.cycles = 0;
    this.clock = this.waves[0]?.gap ?? 1200;
  }

  /**
   * Advances the schedule by dt (ms) and returns the waves that start now.
   * A wave whose spot is still busy is skipped; when the rail is full the
   * next shark waits for room.
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
      if (!taken) due.push(wave);
      this.index += 1;
      if (this.index % this.waves.length === 0) this.cycles += 1;
      this.clock += this.waves[this.index % this.waves.length].gap ?? 4000;
    }
    return due;
  }
}
