import { asArray, isPlainObject } from '../../core/util.js';
import {
  consequenceDef,
  consequenceIds,
  methodIds,
  methodDef,
  methodTargets,
  categoryDef,
  ledgerLimits,
  capFor,
  strengthFor,
  secondsFor,
  levelModifiers,
  boundedModifiers,
  combineModifiers,
  NEUTRAL,
  MILESTONES,
  CONSEQUENCE_TUNING,
  CONSEQUENCE_TUNING_DEFAULTS,
} from './ledger.js';

/**
 * The consequence ledger (overhaul Prompt 11,
 * docs/gameplay-overhaul/15-consequences-and-recovery.md): what a mistake,
 * a hard choice or good preparation leaves the captain with, carried from
 * room to room, chapter to chapter and save to save until it ends or is put
 * right. Saved with the game (save version 24) and captured by challenge
 * checkpoints (the "consequences" domain). Engine-agnostic and event-driven:
 * nothing here runs every frame.
 *
 * It holds implications only, never what another system owns: the hull is
 * Ship Integrity's, water the flooding's, fire the hazards', gas the air's,
 * the beard its own, materials the inventory's and the stores', Brogath's
 * Stability the story's. A consequence changes how those systems treat the
 * captain (a narrower green, slower work, a dearer repair), through the one
 * place each already resolves it.
 *
 * What it guarantees:
 *   - one entry per consequence: a repeat stacks, refreshes, replaces, is
 *     kept or refused, as its definition's stacking says, never a duplicate
 *   - a severity is a whole level from 1 to the entry's cap, always
 *   - an application with an event id lands once, however often its
 *     callback fires; the ids are saved and checkpointed with the ledger, so
 *     a retried attempt can apply it again and a stale callback can't
 *   - the difficulty is read once, when an entry is created: its strength,
 *     its full duration and its cap stay in the entry (a repeat or a reload
 *     on another difficulty never rescales it)
 *   - its modifiers are derived (never saved), recomputed only when
 *     something changes, and held to the ledger's limits together
 *   - timed entries run down on the shared hazard clock only (tick()), so
 *     nothing expires while paused, in a scene, a menu or a battle
 *   - what has ended is remembered apart from what is held, and only so much
 *
 * Events on the bus: consequence:changed { id, op }, consequence:ended
 * { id, state, how }, consequence:loaded.
 */
export const HELD_STATES = Object.freeze(['active', 'contained']);
export const ENDED_STATES = Object.freeze(['recovered', 'resolved']);

const str = (v) => (typeof v === 'string' && v ? v : null);
const int = (v, lo, hi) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.round(Number(v)))) : null);

/** Where a consequence came from, kept small: { kind, id, chapter, outcome }. */
function normSource(src) {
  if (!isPlainObject(src)) return { kind: 'script', id: null, chapter: null, outcome: null };
  return { kind: str(src.kind) ?? 'script', id: str(src.id), chapter: str(src.chapter), outcome: str(src.outcome) };
}

export class ConsequenceLedger {
  constructor({ bus = null } = {}) {
    this.bus = bus;
    // The session it belongs to (content, play time); set by GameSession.
    this.session = null;
    this.reset();
  }

  reset() {
    // The ledger's interactive layer (preparations offered where the captain stands): off until a script switches it on.
    this.on = false;
    this.entries = new Map();
    this.history = [];
    this.seen = new Set();
    this.counts = {};
    this.serial = 0;
    this.marks = {};
    this.cache = null;
  }

  get content() {
    return this.session?.content ?? null;
  }

  get limits() {
    return ledgerLimits(this.content);
  }

  /** Something running on the hazard clock: an entry with seconds left. */
  get active() {
    for (const e of this.entries.values()) if (e.left !== null && e.left > 0) return true;
    return false;
  }

  /** Never used at all (every campaign chapter): nothing held, nothing remembered, never switched on. */
  get untouched() {
    return !this.on && !this.entries.size && !this.history.length && !this.seen.size && !this.serial && !Object.keys(this.marks).length;
  }

  // --- queries ---------------------------------------------------------------

  /** The entry held for a consequence (active or contained), or null. */
  held(id) {
    return this.entries.get(id) ?? null;
  }

  /** Its level in force: 0 when contained or not held. */
  level(id) {
    const e = this.entries.get(id);
    return e && e.state === 'active' ? e.level : 0;
  }

  /** Where it stands: active, contained, recovered or resolved (the latest ending), or none (never happened). */
  state(id) {
    const e = this.entries.get(id);
    if (e) return e.state;
    const last = this.lastEnded(id);
    return last ? last.state : 'none';
  }

  /** The most recent ending of a consequence, or null. */
  lastEnded(id) {
    for (let i = this.history.length - 1; i >= 0; i--) if (this.history[i].id === id) return this.history[i];
    return null;
  }

  /** How many times it has been applied, ever (stacks included). */
  times(id) {
    return this.counts[id] ?? 0;
  }

  ever(id) {
    return this.times(id) > 0;
  }

  /** What is held, in the Journal's order: category, then advantages after penalties, then the order applied. */
  list() {
    const content = this.content;
    const order = (e) => categoryDef(content, consequenceDef(content, e.id)?.category)?.order ?? 99;
    const kind = (e) => ({ negative: 0, narrative: 1, positive: 2 })[consequenceDef(content, e.id)?.kind] ?? 3;
    return [...this.entries.values()].sort((a, b) => order(a) - order(b) || kind(a) - kind(b) || a.n - b.n);
  }

  /** Everything held in a category. */
  inCategory(category) {
    return this.list().filter((e) => consequenceDef(this.content, e.id)?.category === category);
  }

  /** The modifiers in force, combined and bounded (derived, cached until something changes). */
  modifiers() {
    if (!this.cache) {
      const list = [];
      for (const e of this.entries.values()) {
        if (e.state !== 'active') continue;
        const def = consequenceDef(this.content, e.id);
        if (def) list.push(levelModifiers(def, e.level, e.k));
      }
      this.cache = combineModifiers(list, this.limits);
    }
    return this.cache;
  }

  /** One modifier in force (its neutral value when nothing changes it). */
  factor(key) {
    return this.modifiers()[key] ?? NEUTRAL[key];
  }

  /** One entry's own modifiers, at the level in force, within the limits (the Journal's numbers). */
  entryModifiers(e) {
    const def = consequenceDef(this.content, e?.id);
    return def && e.state === 'active' ? boundedModifiers(def, e.level, e.k, this.limits) : {};
  }

  // --- changes ---------------------------------------------------------------

  /**
   * Applies a consequence: { id, severity (1 by default), source, eventId,
   * tuning (the difficulty's consequence tuning: read only if it creates an
   * entry) }. Returns { ok, op, id, level, from, cap, superseded } where op
   * is applied (new), worsened, capped (at its cap: the clocks start again),
   * refreshed, flared (a contained one back in force), kept (no change), or
   * ok: false with a reason (unknown consequence, invalid severity,
   * duplicate event, already held, once).
   */
  apply({ id, severity = 1, source = null, eventId = null, tuning = CONSEQUENCE_TUNING_DEFAULTS } = {}) {
    const fail = (reason) => ({ ok: false, op: 'refused', reason, id, level: this.level(id) });
    const def = consequenceDef(this.content, id);
    if (!def) return fail('unknown consequence');
    const levels = asArray(def.levels).length;
    if (!(Number.isInteger(severity) && severity >= 1 && severity <= levels)) return fail('invalid severity');
    if (eventId !== null && eventId !== undefined && this.seen.has(eventId)) return fail('duplicate event');
    const held = this.entries.get(id);
    let r;
    if (held) r = this.stack(def, held, severity);
    else if ((def.recur ?? 'fresh') === 'once' && this.ever(id)) return fail('once');
    else r = this.create(def, id, severity, source, eventId, tuning);
    if (!r.ok) return r;
    this.claim(eventId);
    this.counts[id] = (this.counts[id] ?? 0) + 1;
    // Opposites can't both be held: the new one ends the other (Ready for Anything tidies away Short of Kit).
    r.superseded = [];
    for (const o of asArray(def.opposes)) {
      if (!this.entries.has(o)) continue;
      this.end(o, 'resolved', 'superseded');
      r.superseded.push(o);
    }
    this.changed(id, r.op);
    return r;
  }

  create(def, id, severity, source, eventId, tuning) {
    const cap = capFor(def, tuning);
    let level = Math.min(cap, severity);
    // A consequence that comes back worse: one level up on every recurrence (within its cap).
    if ((def.recur ?? 'fresh') === 'escalate' && this.ever(id)) level = Math.min(cap, level + 1);
    const span = secondsFor(def, tuning, this.limits);
    const e = {
      id,
      n: ++this.serial,
      level,
      state: 'active',
      k: strengthFor(def, tuning),
      cap,
      span,
      left: span,
      miles: def.expires?.milestones ?? null,
      uses: def.expires?.uses ?? null,
      source: normSource(source),
      event: eventId ?? null,
      at: Math.floor(this.session?.playTime ?? 0),
      times: 1,
      peak: level,
      noted: false,
    };
    this.entries.set(id, e);
    return { ok: true, op: 'applied', id, level, from: 0, cap };
  }

  stack(def, e, severity) {
    const from = e.state === 'active' ? e.level : 0;
    let op;
    if (e.state === 'contained') {
      // Contained but not gone: another blow brings it back.
      e.state = 'active';
      e.level = Math.min(e.cap, severity);
      this.restart(def, e);
      op = 'flared';
    } else {
      switch (def.stacking) {
        case 'reject':
          return { ok: false, op: 'refused', reason: 'already held', id: e.id, level: e.level };
        case 'refresh':
          this.restart(def, e);
          op = 'refreshed';
          break;
        case 'replace':
          if (severity > e.level) {
            e.level = Math.min(e.cap, severity);
            this.restart(def, e);
            op = 'worsened';
          } else op = 'kept';
          break;
        case 'add': {
          const to = Math.min(e.cap, e.level + severity);
          op = to > e.level ? 'worsened' : 'capped';
          e.level = to;
          this.restart(def, e);
          break;
        }
        default:
          op = 'kept';
      }
    }
    e.times += 1;
    e.peak = Math.max(e.peak, e.level);
    if (op !== 'kept') e.noted = false;
    return { ok: true, op, id: e.id, level: e.level, from, cap: e.cap };
  }

  /** Its clocks start again: the full duration it was given, its milestones and uses. */
  restart(def, e) {
    e.left = e.span;
    e.miles = def.expires?.milestones ?? null;
    e.uses = def.expires?.uses ?? null;
  }

  /**
   * A script changes a held consequence's severity: { to } or { by } (a
   * whole number of levels), within 1 and its cap. Raising a contained one
   * brings it back. It can't go below 1: ending it is a recovery's job, or
   * an authorized consequenceResolve.
   */
  setSeverity(id, { to = null, by = null } = {}) {
    const e = this.entries.get(id);
    if (!e) return { ok: false, op: 'refused', reason: 'not held', id, level: 0 };
    const from = e.state === 'active' ? e.level : 0;
    const want = Number.isInteger(to) ? to : Number.isInteger(by) ? from + by : NaN;
    if (!Number.isInteger(want)) return { ok: false, op: 'refused', reason: 'invalid severity', id, level: from };
    if (want < 1) return { ok: false, op: 'refused', reason: 'below 1 (recover or resolve it instead)', id, level: from };
    const next = Math.min(e.cap, want);
    if (next === from) return { ok: true, op: 'kept', id, level: from, from, cap: e.cap };
    e.level = next;
    e.state = 'active';
    e.peak = Math.max(e.peak, next);
    e.noted = false;
    const op = next > from ? 'worsened' : 'eased';
    this.changed(id, op);
    return { ok: true, op, id, level: next, from, cap: e.cap };
  }

  /** Eases a held consequence one level (a meal for frayed nerves); at the first level it is contained: no effect, still held. */
  contain(id, how = 'eased') {
    const e = this.entries.get(id);
    if (!e) return { ok: false, op: 'refused', reason: 'not held', id };
    if (e.state === 'contained') return { ok: false, op: 'refused', reason: 'already contained', id };
    const from = e.level;
    let op;
    if (e.level > 1) {
      e.level -= 1;
      op = 'eased';
    } else {
      e.state = 'contained';
      op = 'contained';
    }
    this.changed(id, op, how);
    return { ok: true, op, id, level: e.state === 'active' ? e.level : 0, from, how };
  }

  /** Put right by the captain (a rest, sorting the kit): ended, and remembered as recovered. */
  recover(id, how = 'recovered') {
    return this.end(id, 'recovered', how);
  }

  /** Ended otherwise: expired, used up, a milestone, superseded, or cleared by an authorized script. */
  resolve(id, how = 'cleared') {
    return this.end(id, 'resolved', how);
  }

  end(id, state, how) {
    const e = this.entries.get(id);
    if (!e) return { ok: false, op: 'refused', reason: 'not held', id };
    this.entries.delete(id);
    this.history.push({ id, n: e.n, level: e.level, peak: e.peak, state, how, source: { ...e.source }, at: e.at, ended: Math.floor(this.session?.playTime ?? 0) });
    const max = this.limits.history;
    if (this.history.length > max) this.history.splice(0, this.history.length - max);
    this.cache = null;
    this.bus?.emit('consequence:ended', { id, state, how });
    this.bus?.emit('consequence:changed', { id, op: state });
    return { ok: true, op: state, id, how, level: e.level };
  }

  /**
   * A ship bar a held advantage helped: each one whose bonus changes `key`
   * and counts uses has one fewer; the last one used ends it ("used up").
   * Returns the ids used.
   */
  useUp(key) {
    const used = [];
    for (const e of [...this.entries.values()]) {
      if (e.state !== 'active' || e.uses === null) continue;
      const def = consequenceDef(this.content, e.id);
      if (def?.kind !== 'positive') continue;
      const v = levelModifiers(def, e.level, e.k)[key];
      if (v === undefined || v === NEUTRAL[key]) continue;
      e.uses -= 1;
      used.push(e.id);
      if (e.uses <= 0) this.end(e.id, 'resolved', 'used up');
    }
    if (used.length) this.changed(null, 'used');
    return used;
  }

  /**
   * A meal eaten (the item's supplies effect started: the effect path,
   * src/systems/effects/effects.js): whatever a provision method of that
   * effect's group eases or ends, once per meal. Returns the changes.
   */
  provision(effectId) {
    const content = this.content;
    const group = content?.shipSupplies?.effects?.[effectId]?.group;
    if (!group) return [];
    const out = [];
    for (const mid of methodIds(content)) {
      const m = methodDef(content, mid);
      if (m.kind !== 'provision' || m.group !== group) continue;
      for (const t of methodTargets(content, mid)) {
        if (t.result === 'earn' || !this.entries.has(t.id)) continue;
        const r = t.result === 'contain' ? this.contain(t.id, mid) : this.recover(t.id, mid);
        if (r.ok) out.push(r);
      }
    }
    return out;
  }

  /** A milestone a script marks (a chapter passed): what counts milestones runs down, and ends at 0. */
  milestone(kind = 'chapter') {
    if (!MILESTONES.includes(kind)) return { ok: false, reason: 'unknown milestone', ended: [] };
    this.marks[kind] = (this.marks[kind] ?? 0) + 1;
    const ended = [];
    for (const e of [...this.entries.values()]) {
      if (e.miles === null) continue;
      e.miles -= 1;
      if (e.miles <= 0) {
        this.end(e.id, 'resolved', 'milestone');
        ended.push(e.id);
      }
    }
    this.changed(null, 'milestone');
    return { ok: true, ended, marks: this.marks[kind] };
  }

  /**
   * One second of hazard time (the shared clock: the world while the
   * captain is free, work tick by tick, hazardClock on purpose): timed
   * entries run down, and end at 0 ("expired"). Returns true if anything ran.
   */
  tick() {
    let moved = false;
    for (const e of [...this.entries.values()]) {
      if (e.left === null) continue;
      e.left -= 1;
      moved = true;
      if (e.left <= 0) this.end(e.id, 'resolved', 'expired');
    }
    return moved;
  }

  /** Records an event id; false if it was already applied. No id: always new. */
  claim(id) {
    if (id === null || id === undefined) return true;
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    const max = this.limits.events;
    while (this.seen.size > max) this.seen.delete(this.seen.values().next().value);
    return true;
  }

  /** The Journal has shown it: its NEW mark goes. */
  note(id) {
    const e = this.entries.get(id);
    if (e) e.noted = true;
  }

  changed(id, op, how = null) {
    this.cache = null;
    this.bus?.emit('consequence:changed', { id, op, how });
  }

  // --- saving ----------------------------------------------------------------

  serialize() {
    return {
      on: this.on,
      serial: this.serial,
      entries: [...this.entries.values()].map((e) => ({ ...e, source: { ...e.source } })),
      history: this.history.map((h) => ({ ...h, source: { ...h.source } })),
      events: [...this.seen].slice(-this.limits.events),
      counts: { ...this.counts },
      marks: { ...this.marks },
    };
  }

  /**
   * From a save (or a checkpoint). A missing ledger (a save from before
   * version 24) is empty: nothing invented. Unknown consequences are dropped
   * with a warning; levels, clocks and counts are clamped to what the data
   * allows; a duplicate entry keeps the first.
   */
  load(state, onWarning = () => {}) {
    this.reset();
    if (state !== undefined && state !== null && !isPlainObject(state)) onWarning('consequences: not a ledger; it starts empty');
    const s = isPlainObject(state) ? state : {};
    const content = this.content;
    const lim = this.limits;
    this.on = s.on === true;
    let maxN = 0;
    for (const raw of asArray(s.entries)) {
      if (!isPlainObject(raw)) continue;
      const def = consequenceDef(content, raw.id);
      if (!def) {
        onWarning(`consequences: dropped unknown consequence "${raw.id}"`);
        continue;
      }
      if (this.entries.has(raw.id)) {
        onWarning(`consequences: "${raw.id}" was held twice; the first is kept`);
        continue;
      }
      const levels = asArray(def.levels).length || 1;
      const cap = int(raw.cap, 1, levels) ?? capFor(def);
      const level = int(raw.level, 1, cap) ?? 1;
      const [kLo, kHi] = CONSEQUENCE_TUNING.strength;
      const k = def.kind === 'negative' ? Math.max(kLo, Math.min(kHi, Number.isFinite(raw.k) ? raw.k : 1)) : 1;
      const span = def.expires?.seconds ? int(raw.span, 1, lim.seconds) ?? secondsFor(def, CONSEQUENCE_TUNING_DEFAULTS, lim) : null;
      const left = span === null ? null : int(raw.left, 1, span) ?? span;
      const miles = def.expires?.milestones ? int(raw.miles, 1, Math.min(lim.milestones, def.expires.milestones)) ?? def.expires.milestones : null;
      const uses = def.expires?.uses ? int(raw.uses, 1, Math.min(lim.uses, def.expires.uses)) ?? def.expires.uses : null;
      const n = int(raw.n, 1, Number.MAX_SAFE_INTEGER) ?? maxN + 1;
      maxN = Math.max(maxN, n);
      this.entries.set(raw.id, {
        id: raw.id,
        n,
        level,
        state: raw.state === 'contained' ? 'contained' : 'active',
        k,
        cap,
        span,
        left,
        miles,
        uses,
        source: normSource(raw.source),
        event: str(raw.event),
        at: int(raw.at, 0, Number.MAX_SAFE_INTEGER) ?? 0,
        times: int(raw.times, 1, 9999) ?? 1,
        peak: Math.max(level, int(raw.peak, 1, cap) ?? level),
        noted: raw.noted === true,
      });
    }
    for (const raw of asArray(s.history)) {
      if (!isPlainObject(raw)) continue;
      const def = consequenceDef(content, raw.id);
      if (!def) {
        onWarning(`consequences: dropped the history of unknown consequence "${raw.id}"`);
        continue;
      }
      const levels = asArray(def.levels).length || 1;
      const n = int(raw.n, 1, Number.MAX_SAFE_INTEGER) ?? 0;
      maxN = Math.max(maxN, n);
      const level = int(raw.level, 1, levels) ?? 1;
      this.history.push({
        id: raw.id,
        n,
        level,
        peak: Math.max(level, int(raw.peak, 1, levels) ?? level),
        state: raw.state === 'recovered' ? 'recovered' : 'resolved',
        how: str(raw.how) ?? 'ended',
        source: normSource(raw.source),
        at: int(raw.at, 0, Number.MAX_SAFE_INTEGER) ?? 0,
        ended: int(raw.ended, 0, Number.MAX_SAFE_INTEGER) ?? 0,
      });
    }
    if (this.history.length > lim.history) this.history.splice(0, this.history.length - lim.history);
    this.seen = new Set(asArray(s.events).filter((e) => typeof e === 'string').slice(-lim.events));
    const known = new Set(consequenceIds(content));
    for (const [id, v] of Object.entries(isPlainObject(s.counts) ? s.counts : {})) {
      if (!known.has(id)) continue;
      const n = int(v, 0, 1e6);
      if (n) this.counts[id] = n;
    }
    // Whatever is held or remembered happened at least once.
    for (const id of [...this.entries.keys(), ...this.history.map((h) => h.id)]) if (!this.counts[id]) this.counts[id] = 1;
    for (const [kind, v] of Object.entries(isPlainObject(s.marks) ? s.marks : {})) {
      if (!MILESTONES.includes(kind)) continue;
      const n = int(v, 0, 1e6);
      if (n) this.marks[kind] = n;
    }
    this.serial = Math.max(maxN, int(s.serial, 0, Number.MAX_SAFE_INTEGER) ?? 0);
    this.cache = null;
    this.bus?.emit('consequence:loaded', {});
    this.bus?.emit('consequence:changed', { id: null, op: 'loaded' });
  }
}
