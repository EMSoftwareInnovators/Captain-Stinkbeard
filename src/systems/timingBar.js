/**
 * The timing bar (the repair prompt and its many kinds, src/systems/repairKinds.js):
 * rules only, no drawing (OverlayScene draws it). A marker swings along a
 * bar; Confirm as it crosses the green lands a strike. Pressing off the
 * green is a fumble: the bar locks for a moment, so hammering the button is
 * slower than waiting for the green. Positions are in pixels from the
 * bar's left end; times in ms.
 *
 * Two modes:
 *   legacy  (every existing story step) nothing can fail: three fumbles in a
 *           row and the green widens, five and it's steadied (the whole
 *           bar). The debug "auto timing" steadies it from the start.
 *   strict  (a step opted into a challenge, docs/gameplay-overhaul/07-challenge-outcomes.md)
 *           no widening or steadying unless the challenge asks for an assist;
 *           "maxFumbles" and "timeLimit" end the attempt as a real failure.
 *           The green is never narrower than MIN_ZONE and a challenge whose
 *           numbers can't be beaten by a perfect hand is rejected
 *           (timingBarProblems), so failure is possible but never certain.
 */
export const TIMING_DEFAULTS = Object.freeze({
  barW: 160, // px: OverlayScene's panel (208) less its ends
  strikes: 3,
  speed: 150, // px/s, already scaled by the kind, the step and the captain's stat
  zone: 26, // px, already scaled by the stat
  margin: 12, // the green never touches the bar's ends
  edge: 2, // px of grace either side of the green
  startLock: 250, // ms before the first press counts
  hitLock: 160, // ms after any counted press
  fumbleLock: 480, // ms the bar is locked after a fumble (the marker stops)
  speedStep: 22, // px/s faster after each strike
  luck: 0, // % chance a miss doesn't count (the captain's Luck)
});

/** The legacy assists, exactly as the game has always had them. */
export const LEGACY_ASSIST = Object.freeze({ widenAfter: 3, widenScale: 1.6, steadyAfter: 5 });

/** The green's narrowest width, and the shortest time a perfect hand gets to see it. */
export const MIN_ZONE = 8;
export const MIN_WINDOW_MS = 50;

/**
 * A fresh bar. `cfg`: TIMING_DEFAULTS overrides plus
 *   mode        'legacy' | 'strict'
 *   assist      strict only: { widenAfter, widenScale, steadyAfter } (each optional), or null
 *   maxFumbles  strict only: more fumbles than this in one attempt fails it
 *   timeLimit   strict only: ms; the attempt fails when it runs out
 *   auto        debug auto timing (legacy: steadied from the start)
 * `rnd` places the green (and rolls luck): Math.random for legacy, seeded for challenges.
 */
export function createTimingBar(cfg = {}, rnd = Math.random) {
  const c = { ...TIMING_DEFAULTS, ...cfg };
  const strict = c.mode === 'strict';
  const st = {
    cfg: c,
    strict,
    assist: strict ? (c.assist ?? null) : LEGACY_ASSIST,
    rnd,
    pos: 0,
    dir: 1,
    speed: c.speed,
    baseZone: Math.max(MIN_ZONE, Math.round(c.zone)),
    zoneX: 0,
    zoneWidth: 0,
    zoneAssist: null, // 'widened' | 'steadied' | null
    assisted: false,
    lock: c.startLock,
    fumbled: false,
    misses: 0, // fumbles since the last strike
    fumbles: 0, // in the whole attempt
    lucky: 0,
    done: 0,
    clean: 0,
    t: 0,
    phase: 'running', // 'running' | 'done' | 'failed'
    reason: null,
  };
  placeZone(st);
  return st;
}

/** Where the green goes next (and how wide): after a fumble, a strike, or at the start. */
export function placeZone(st) {
  const c = st.cfg;
  const a = st.assist;
  const steadied = (a?.steadyAfter !== undefined && a?.steadyAfter !== null && st.misses >= a.steadyAfter) || (!st.strict && !!c.auto);
  const widened = !steadied && a?.widenAfter !== undefined && a?.widenAfter !== null && st.misses >= a.widenAfter;
  const zw = steadied ? c.barW : Math.min(c.barW - c.margin * 2, Math.round(st.baseZone * (widened ? a.widenScale ?? 1.6 : 1)));
  st.zoneWidth = zw;
  st.zoneX = steadied ? 0 : c.margin + Math.floor(st.rnd() * (c.barW - zw - c.margin * 2));
  st.zoneAssist = steadied ? 'steadied' : widened ? 'widened' : null;
  if (st.zoneAssist) st.assisted = true;
}

/** The marker's pixel (the bar draws it rounded, and hits are judged on what is drawn). */
export function markerX(st) {
  return Math.round(st.pos);
}

export function inZone(st) {
  const m = markerX(st);
  return m >= st.zoneX - st.cfg.edge && m <= st.zoneX + st.zoneWidth + st.cfg.edge;
}

/** Advances the bar by dt ms. Returns events: { type: 'recovered' } · { type: 'failed', reason: 'time' }. */
export function stepTimingBar(st, dt) {
  const ev = [];
  if (st.phase !== 'running') return ev;
  st.t += dt;
  st.lock -= dt;
  if (st.lock <= 0 && st.fumbled) {
    st.fumbled = false;
    ev.push({ type: 'recovered' });
  }
  // The marker stands still while fumbled (the hammer's been dropped).
  if (!st.fumbled) {
    st.pos += st.dir * st.speed * (dt / 1000);
    if (st.pos >= st.cfg.barW) {
      st.pos = st.cfg.barW;
      st.dir = -1;
    }
    if (st.pos <= 0) {
      st.pos = 0;
      st.dir = 1;
    }
  }
  if (st.strict && st.cfg.timeLimit && st.t >= st.cfg.timeLimit) {
    st.phase = 'failed';
    st.reason = 'time';
    ev.push({ type: 'failed', reason: 'time' });
  }
  return ev;
}

/**
 * Confirm was pressed. Returns events:
 *   { type: 'ignored' }  the attempt is over      { type: 'locked' }  too soon after the last press
 *   { type: 'lucky' }    a miss that didn't count  { type: 'fumble', misses, assist }
 *   { type: 'hit', clean, done }                   { type: 'done' }    the last strike landed
 *   { type: 'failed', reason: 'fumbles' }          strict: too many fumbles
 */
export function pressTimingBar(st) {
  if (st.phase !== 'running') return [{ type: 'ignored' }];
  if (st.lock > 0) return [{ type: 'locked' }];
  const c = st.cfg;
  st.lock = c.hitLock;
  if (!inZone(st)) {
    if (c.luck > 0 && st.rnd() * 100 < c.luck) {
      st.lucky += 1;
      return [{ type: 'lucky' }];
    }
    st.misses += 1;
    st.fumbles += 1;
    st.lock = c.fumbleLock;
    st.fumbled = true;
    if (st.strict && c.maxFumbles !== undefined && c.maxFumbles !== null && st.fumbles > c.maxFumbles) {
      st.phase = 'failed';
      st.reason = 'fumbles';
      return [{ type: 'fumble', misses: st.misses, assist: null }, { type: 'failed', reason: 'fumbles' }];
    }
    placeZone(st);
    return [{ type: 'fumble', misses: st.misses, assist: st.zoneAssist }];
  }
  const clean = st.misses === 0;
  if (clean) st.clean += 1;
  st.done += 1;
  st.misses = 0;
  if (st.done < c.strikes) {
    st.speed += c.speedStep;
    placeZone(st);
    return [{ type: 'hit', clean, done: st.done }];
  }
  st.phase = 'done';
  return [{ type: 'hit', clean, done: st.done }, { type: 'done' }];
}

/** What the attempt came to: the metrics a challenge's rules read. */
export function timingBarResult(st) {
  const strikes = st.cfg.strikes;
  return {
    completed: st.phase === 'done',
    strikes,
    done: st.done,
    clean: st.clean,
    fumbles: st.fumbles,
    lucky: st.lucky,
    assisted: st.assisted,
    elapsed: Math.round(st.t),
    accuracy: strikes ? Math.round((st.clean / strikes) * 100) : 100,
    reason: st.reason,
  };
}

/**
 * Why a strict bar's numbers can't be beaten, if they can't: the green too
 * narrow, the marker too fast to see it, or not enough time for even a
 * perfect hand. An empty list means a perfect hand always finishes.
 */
export function timingBarProblems(cfg = {}) {
  const c = { ...TIMING_DEFAULTS, ...cfg };
  const out = [];
  if (!(c.strikes >= 1)) out.push('"strikes" must be at least 1');
  if (!(c.speed > 0)) out.push('"speed" must be positive');
  if (c.zone < MIN_ZONE) out.push(`the green ("zone" ${c.zone}px) is narrower than ${MIN_ZONE}px`);
  const fastest = c.speed + c.speedStep * Math.max(0, c.strikes - 1);
  const windowMs = ((Math.max(MIN_ZONE, c.zone) + c.edge * 2) / fastest) * 1000;
  if (windowMs < MIN_WINDOW_MS) out.push(`at its fastest the marker crosses the green in ${Math.round(windowMs)} ms (less than ${MIN_WINDOW_MS})`);
  if (c.maxFumbles !== undefined && c.maxFumbles !== null && !(c.maxFumbles >= 0)) out.push('"maxFumbles" must be 0 or more');
  if (c.timeLimit) {
    // A perfect hand's worst case: each strike waits up to a full sweep there and back, plus the locks.
    let need = c.startLock;
    for (let i = 0; i < c.strikes; i++) need += ((c.barW * 2) / (c.speed + c.speedStep * i)) * 1000 + c.hitLock;
    if (c.timeLimit < need) out.push(`"timeLimit" ${c.timeLimit} ms is shorter than a perfect hand may need (${Math.ceil(need)} ms)`);
  }
  return out;
}
