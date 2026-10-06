/**
 * The Sash Tension interaction (Story Phase 12: THE THIRTY-SECOND TRIAL):
 * rules only, no drawing (ui/SashTensionView.js draws it). A hold-and-ease
 * timing game: keep a needle inside a band for a fixed, real number of
 * seconds while the ship sways and the thing you are holding surges; then,
 * at the end, deliberately let go.
 *
 * A definition is data (data/story/tension/*.json):
 *
 *   "thirty_second_trial": {
 *     "title": "THE THIRTY-SECOND TRIAL",
 *     "seconds": 30,                       // canonical, real time
 *     "band": [38, 68],                    // the target band (0..100)
 *     "pull": 60, "slack": 44,             // tension per second held / let off
 *     "sway": { "amp": 14, "period": 4.6 },// the ship: a slow push and pull
 *     "grace": 1.6,                        // seconds out of the band before it's caught
 *     "surges": [{ "at": 20, "kick": -34 }, ...],
 *     "milestones": [{ "at": 5, "text": "...", "sfx": "...", "shake": 0.004, "haze": 0.1,
 *                      "band": [42, 64], "sway": 1.4, "gusts": true }],
 *     "count": { "speaker": "pete", "sfx": "count_tick" },   // a voice counting every second
 *     "release": { "cue": "LET IT FLUTTER!", "auto": 4000, "sfx": "sash_release" }
 *   }
 *
 * Nothing can fail. Out of the band too long, the moment is caught for you
 * (the needle goes back to the middle; it counts as a slip) and the clock
 * keeps running. At the end the cue asks for one deliberate press; if it
 * doesn't come, the captain's hands slip after "release.auto" ms anyway.
 */

export const TENSION_DEFAULTS = Object.freeze({
  seconds: 30,
  band: [38, 68],
  pull: 60,
  slack: 44,
  sway: { amp: 14, period: 4.6 },
  grace: 1.6,
  release: { cue: 'LET GO!', auto: 4000 },
});

export function tensionDef(def = {}) {
  return {
    ...TENSION_DEFAULTS,
    ...def,
    sway: { ...TENSION_DEFAULTS.sway, ...(def.sway ?? {}) },
    release: { ...TENSION_DEFAULTS.release, ...(def.release ?? {}) },
    milestones: [...(def.milestones ?? [])].sort((a, b) => a.at - b.at),
    surges: [...(def.surges ?? [])].sort((a, b) => a.at - b.at),
  };
}

/** A fresh run: the needle starts in the middle of the band. */
export function createTension(def) {
  const d = tensionDef(def);
  return {
    def: d,
    t: 0,
    value: (d.band[0] + d.band[1]) / 2,
    band: [...d.band],
    swayScale: 1,
    gusts: false,
    out: 0,
    slips: 0,
    second: 0,
    nextMilestone: 0,
    nextSurge: 0,
    phase: 'hold', // 'hold' -> 'release' -> 'done'
    releaseT: 0,
    released: null, // 'pressed' | 'slipped'
    caughtT: 0,
    gustT: 3,
  };
}

/** Where the needle is: 'low' (slack), 'ok', 'high' (too tight). */
export function tensionZone(st) {
  if (st.value < st.band[0]) return 'low';
  if (st.value > st.band[1]) return 'high';
  return 'ok';
}

/**
 * Advances the run by dt seconds. `input`: { held, pressed } (pull, and a
 * fresh press for the release). `rnd` makes gusts testable. Returns the
 * events that happened (for the view to show and play):
 *   { type: 'second', n } · { type: 'milestone', m } · { type: 'surge', kick } · { type: 'gust', kick }
 *   { type: 'caught', zone } · { type: 'cue' } · { type: 'released', how }
 */
export function stepTension(st, dt, input = {}, rnd = Math.random) {
  const ev = [];
  const d = st.def;
  if (st.phase === 'done') return ev;
  if (st.phase === 'release') {
    st.releaseT += dt * 1000;
    if (input.pressed) {
      st.phase = 'done';
      st.released = 'pressed';
      ev.push({ type: 'released', how: 'pressed' });
    } else if (st.releaseT >= d.release.auto) {
      st.phase = 'done';
      st.released = 'slipped';
      ev.push({ type: 'released', how: 'slipped' });
    }
    return ev;
  }
  st.t += dt;
  // The count: one event a whole second.
  while (st.second < Math.min(d.seconds, Math.floor(st.t))) {
    st.second += 1;
    ev.push({ type: 'second', n: st.second });
  }
  // Milestones change the conditions from then on.
  while (st.nextMilestone < d.milestones.length && st.t >= d.milestones[st.nextMilestone].at) {
    const m = d.milestones[st.nextMilestone++];
    if (m.band) st.band = [...m.band];
    if (m.sway) st.swayScale = m.sway;
    if (m.gusts !== undefined) st.gusts = !!m.gusts;
    ev.push({ type: 'milestone', m });
  }
  while (st.nextSurge < d.surges.length && st.t >= d.surges[st.nextSurge].at) {
    const sg = d.surges[st.nextSurge++];
    st.value += sg.kick;
    ev.push({ type: 'surge', kick: sg.kick });
  }
  if (st.gusts) {
    st.gustT -= dt;
    if (st.gustT <= 0) {
      st.gustT = 1.6 + rnd() * 1.8;
      const kick = (rnd() < 0.6 ? -1 : 1) * (8 + rnd() * 10);
      st.value += kick;
      ev.push({ type: 'gust', kick });
    }
  }
  if (st.caughtT > 0) {
    // Just caught: a beat to get a grip again.
    st.caughtT -= dt;
  } else {
    st.value += (input.held ? d.pull : -d.slack) * dt;
    const period = Math.max(0.5, d.sway.period);
    st.value += Math.cos((st.t / period) * Math.PI * 2) * d.sway.amp * st.swayScale * dt;
  }
  st.value = Math.max(0, Math.min(100, st.value));
  const zone = tensionZone(st);
  st.out = zone === 'ok' ? 0 : st.out + dt;
  if (st.out >= d.grace) {
    // Fail-soft: somebody grabs the end ("NOT YET!") and it starts again from the middle.
    st.slips += 1;
    st.out = 0;
    st.value = (st.band[0] + st.band[1]) / 2;
    st.caughtT = 0.45;
    ev.push({ type: 'caught', zone });
  }
  if (st.t >= d.seconds) {
    st.phase = 'release';
    st.releaseT = 0;
    ev.push({ type: 'cue' });
  }
  return ev;
}

/** A perfect hand (debug "auto timing", tests): hold when below the middle of the band. */
export function autoHold(st) {
  return st.value < (st.band[0] + st.band[1]) / 2;
}
