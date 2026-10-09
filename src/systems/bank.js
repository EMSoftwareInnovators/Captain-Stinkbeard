import { createTension, stepTension, tensionZone, autoHold } from './tension.js';

/**
 * Story Phase 14: THE GRAND STENCHMASTER'S GRAND BANK AND GRAND TRUST. Rules
 * only (ui/TellerView.js draws the teller's window; the `bankDeposit` and
 * `bank` commands run a customer from arrival to receipt).
 *
 * A bank is data (data/story/bank/*.json):
 *
 *   "grand_bank": {
 *     "name", "slogan",
 *     "openFlag": "grand_bank_open",           // the branch exists only while this is set
 *     "ledgerVar": "bank_ledger_right",        // classifications the teller got right
 *     "gradeVar": "bank_last_grade",           // the last deposit: 2 clean, 1 rocked, 0 blown back
 *     "scale": [{ "n": 1, "name": "Gentle" }, ..., { "n": 10, "name": "Please Notify Authorities" }],
 *     "beyond": { "n": "10+", "name": "ABSOLUTELY NOT" },
 *     "queues": { "regular": { "customers": ["windabella", ...], "servedVar": "bank_served", "event": "p14_deposit" } },
 *     "classifyRight": "<line>", "classifyWrong": "<line>"   // {name} {class}
 *   }
 *
 * A customer (data/story/bank/customers*.json) is just as plain, so adding
 * another depositor is one entry and (if they need words) two scripts:
 *
 *   "windabella": {
 *     "bank": "grand_bank", "npc": "bank_windabella",
 *     "name": "Grand Duchess Windabella the Imperious", "title": "...",
 *     "intensity": 4,                       // 1..10, or "10+"
 *     "classify": [3, 4, 5],                // what the ledger offers (includes the right one)
 *     "telegraph": "A slow, imperious swell.",
 *     "pattern": [ { "take": true },
 *                  { "hold": 5, "band": [34, 70], "pull": 58, "slack": 40, "sway": { "amp": 10, "period": 3 }, "text": "..." },
 *                  { "wait": 800, "text": "..." },
 *                  { "brace": "BRACE!", "ring": 1100, "window": 170, "power": 4 } ],
 *     "intro": "<script>", "after": "<script>", "notes": "..."
 *   }
 *
 * Nothing can be failed. A late or missed brace is a deposit that blows the
 * teller back (a grade of 0): the world shows it (papers, the counter
 * shifting, the captain on his back) and the scripts can say so; the shift
 * goes on. An unanswered "take" puts the sash in his hands after a while.
 */

export const TELLER_GRADES = ['miss', 'good', 'perfect'];
export const GRADE_SCORE = { miss: 0, good: 1, perfect: 2 };
const TAKE_AUTO_MS = 6000;
const BRACE_EARLY_LOCK = 380;

export function bankScale(bank) {
  return [...(bank.scale ?? []), ...(bank.beyond ? [bank.beyond] : [])];
}

/** The scale entry for an intensity (1..10 or "10+"). */
export function scaleEntry(bank, n) {
  return bankScale(bank).find((s) => String(s.n) === String(n)) ?? null;
}

/** "4 — FURNITURE-MOVING" */
export function scaleLabel(bank, n) {
  const e = scaleEntry(bank, n);
  return e ? `${e.n} — ${e.name.toUpperCase()}` : String(n);
}

/** Intensity as a number for gauges and shakes ("10+" counts as 11). */
export function intensityValue(n) {
  if (n === '10+') return 11;
  return Math.max(1, Math.min(11, Number(n) || 1));
}

/** The next unserved customer in a queue (null when the queue is done). */
export function nextCustomer(bank, queueId, session) {
  const q = bank.queues?.[queueId];
  if (!q) throw new Error(`Bank: no queue "${queueId}"`);
  const served = session.story.getVar(q.servedVar, 0);
  return q.customers[served] ?? null;
}

/** A fresh teller run for one customer. */
export function createTeller(customer) {
  const beats = (customer.pattern ?? []).map((b) => ({ ...b }));
  if (!beats.some((b) => b.brace)) beats.push({ brace: 'BRACE!', ring: 1000, window: 170 });
  return {
    customer,
    beats,
    at: -1,
    beat: null,
    t: 0,
    tension: null,
    grades: [],
    slips: 0,
    pressed: false,
    lock: 0,
    fill: 0, // the intensity telegraph, 0..1 of the customer's class
    done: false,
  };
}

function holdDef(b) {
  return {
    seconds: b.hold,
    band: b.band ?? [34, 70],
    pull: b.pull ?? 56,
    slack: b.slack ?? 40,
    sway: b.sway ?? { amp: 10, period: 3.6 },
    grace: b.grace ?? 1.8,
    surges: b.surges ?? [],
    milestones: b.milestones ?? [],
    release: { cue: '', auto: 1 },
  };
}

function enter(st, i, ev) {
  st.at = i;
  st.t = 0;
  st.beat = st.beats[i] ?? null;
  st.tension = null;
  st.pressed = false;
  st.lock = 0;
  if (!st.beat) {
    st.done = true;
    ev.push({ type: 'done', grades: st.grades, slips: st.slips });
    return;
  }
  if (st.beat.hold) st.tension = createTension(holdDef(st.beat));
  ev.push({ type: 'beat', beat: st.beat, index: i });
}

/**
 * Advances a teller run by dt seconds. `input`: { held, pressed }. Returns
 * events for the view: beat · take · second · caught · ring · wave (with a
 * grade) · early · done.
 */
export function stepTeller(st, dt, input = {}) {
  const ev = [];
  if (st.done) return ev;
  if (st.at < 0) {
    enter(st, 0, ev);
    return ev;
  }
  const b = st.beat;
  const ms = dt * 1000;
  st.t += ms;
  st.lock = Math.max(0, st.lock - ms);
  const holdBeats = st.beats.filter((x) => x.hold);
  if (b.take) {
    if (input.pressed || st.t >= (b.auto ?? TAKE_AUTO_MS)) {
      ev.push({ type: 'take', auto: !input.pressed });
      enter(st, st.at + 1, ev);
    }
    return ev;
  }
  if (b.hold) {
    const tev = stepTension(st.tension, dt, { held: !!input.held, pressed: false });
    for (const e of tev) {
      if (e.type === 'caught') {
        st.slips += 1;
        ev.push({ type: 'caught', zone: e.zone });
      } else if (e.type === 'second') ev.push({ type: 'second', n: e.n });
      else if (e.type === 'milestone') ev.push({ type: 'milestone', m: e.m });
      else if (e.type === 'surge') ev.push({ type: 'surge', kick: e.kick });
    }
    // The telegraph climbs through the holds toward the customer's class.
    const before = st.beats.slice(0, st.at).filter((x) => x.hold).length;
    st.fill = Math.min(1, (before + Math.min(1, st.tension.t / b.hold)) / Math.max(1, holdBeats.length));
    if (st.tension.phase !== 'hold') enter(st, st.at + 1, ev);
    return ev;
  }
  if (b.wait) {
    if (st.t >= b.wait) enter(st, st.at + 1, ev);
    return ev;
  }
  if (b.puff) {
    // A harmless little one (it is never the real one).
    if (!st.pressed) {
      st.pressed = true;
      ev.push({ type: 'puff', beat: b });
    }
    if (st.t >= (b.ms ?? 900)) enter(st, st.at + 1, ev);
    return ev;
  }
  if (b.brace) {
    const ring = b.ring ?? 1000;
    const win = b.window ?? 170;
    if (!holdBeats.length) st.fill = Math.min(1, st.t / ring);
    if (input.pressed && !st.pressed) {
      const off = st.t - ring;
      if (off < -win) {
        // Too early: the ring isn't there yet. A short lock, no grade (no mashing).
        if (st.lock <= 0) {
          st.lock = BRACE_EARLY_LOCK;
          ev.push({ type: 'early' });
        }
      } else if (st.lock <= 0) {
        st.pressed = true;
        const grade = Math.abs(off) <= win / 2 ? 'perfect' : 'good';
        st.grades.push(grade);
        ev.push({ type: 'wave', beat: b, grade });
        st.t = ring + win + 1;
      }
    }
    if (!st.pressed && st.t > ring + win) {
      st.pressed = true;
      st.grades.push('miss');
      ev.push({ type: 'wave', beat: b, grade: 'miss' });
    }
    if (st.pressed && st.t > ring + win + (b.after ?? 650)) enter(st, st.at + 1, ev);
    return ev;
  }
  // Unknown beat: skip it.
  enter(st, st.at + 1, ev);
  return ev;
}

/** The worst brace of a run, as a score (2 clean, 1 rocked, 0 blown back). */
export function tellerScore(grades) {
  if (!grades.length) return 2;
  return Math.min(...grades.map((g) => GRADE_SCORE[g] ?? 0));
}

/** A perfect teller (debug auto timing, tests): hold in the band; press each ring as it meets. */
export function autoTeller(st) {
  const b = st.beat;
  if (!b) return { held: false, pressed: false };
  if (b.take) return { held: false, pressed: st.t > 200 };
  if (b.hold) return { held: autoHold(st.tension), pressed: false };
  if (b.brace) return { held: false, pressed: !st.pressed && st.t >= (b.ring ?? 1000) - 10 };
  return { held: false, pressed: false };
}

export { tensionZone };
