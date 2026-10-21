/**
 * When hazard time passes (docs/gameplay-overhaul/10-flooding-and-fire.md,
 * "Timing and pause"): the world feeds it frame time, and it runs one hazard
 * tick for each full "tickMs" of eligible time, so the frame rate decides
 * only when a tick lands, never how many there are. Time that isn't
 * eligible (a scene, dialogue, a timing bar, a room change, the F2 panel;
 * the pause menu and battles stop the world altogether) doesn't count, and
 * nothing is owed for it afterwards. At most `max` ticks run in one frame,
 * so a long stall can't dump a burst of damage at once.
 */
export class HazardClock {
  constructor(tickMs = 1000) {
    this.tickMs = tickMs;
    this.ms = 0;
  }

  /** Adds `dt` ms; runs `tick()` per full tick. `active: false` (nothing happening) resets the part-tick. Returns ticks run. */
  advance(dt, { eligible = true, active = true, tick, max = 3 } = {}) {
    if (!active) {
      this.ms = 0;
      return 0;
    }
    if (!eligible || !(dt > 0)) return 0;
    this.ms += dt;
    let n = 0;
    while (this.ms >= this.tickMs && n < max) {
      this.ms -= this.tickMs;
      tick();
      n += 1;
    }
    // Behind by more than the frame allows: drop the excess rather than catch up later.
    if (this.ms >= this.tickMs) this.ms = this.tickMs - 1;
    return n;
  }
}
