import { isPlainObject, asArray } from '../../core/util.js';
import { evaluateCondition } from '../conditions/conditions.js';
import { readStability, writePressure, triggerScale } from '../stability.js';
import { SHIP_TUNING_DEFAULTS } from './integrity.js';
import { airRoom, airData, connectionsOf, otherSide, OUTSIDE } from './air.js';
import { fireRoom } from './hazards.js';
import { pressureData, subjectIds, subjectDef, stageFor, stageInfo, stageRank, levelFor, levelInfo, profileDef, damageTarget, npcWhere } from './pressure.js';

/**
 * Grand Stenchmaster pressure, aboard (docs/gameplay-overhaul/12-pressure-and-eruptions.md):
 * each subject's pressure, what it has held in, its modifiers, and where it
 * is in the release cycle. Part of the ship's state (`ship.pressure`):
 * saved and checkpointed with it and moved by the same clock (`ship.tick()`
 * ticks it first, then the leaks and fire, then the air its eruptions pour
 * into). Engine-agnostic and event-driven.
 *
 * Opt-in: a subject does nothing until it is switched on (pressureSubject),
 * and no chapter does that. Switched on, it moves only while the story has
 * the character aboard in a room with ship air, and never while a Phase 14
 * Stability incident or the scripted ANGRY state owns Brogath.
 *
 * The cycle: buildup (triggers, modifiers, what was held seeping back) ->
 * stages with warnings -> at the maximum, IMMINENT: a countdown the
 * captain can still act in -> the eruption (structure struck, openings
 * blown, a finite gas source) -> relief (down to "after", nothing held) ->
 * cooldown (rises count for less, no eruption) -> stable again. One
 * eruption per countdown; a new one needs new pressure.
 *
 * Brogath's pressure is his Stability variable (one number, written through
 * systems/stability.js, so his state value, meter and dialogue follow it).
 * Garrick's is `p` here. Fractions of a rise on an integer Stability are
 * carried, never lost or invented.
 *
 * Events: hazard:notice (keys "pressure:..."), hazard:changed,
 * pressure:stage { subject, npc, stage, from, rising }, pressure:erupted
 * (what happened), stability:changed (Brogath's legacy listeners).
 */
const PHASES = Object.freeze(['idle', 'imminent', 'cooldown']);
const LOCK_MAX = 180;

export class PressureState {
  constructor({ ship = null, def = null, bus = null } = {}) {
    this.ship = ship;
    this.def = def;
    this.bus = bus;
    // The session (set by GameSession): the content, the story (Brogath's Stability), where the captain is.
    this.session = null;
    this.subjects = {};
    // Per play: the world's live tile for a character, notices held back, the stage last announced, where the story has them.
    this.npcAt = null;
    this.quiet = false;
    this.seenStage = {};
    this.whereCache = new Map();
  }

  get content() {
    return this.session?.content ?? null;
  }

  get ids() {
    return this.def && this.content ? subjectIds(this.content) : [];
  }

  /** A subject's definition (null if unknown). */
  subject(id) {
    return this.content ? subjectDef(this.content, id) : null;
  }

  /** A subject's saved state, made on first change (reading never makes one: see peek). */
  state(id) {
    this.subjects[id] ??= this.blank(id);
    return this.subjects[id];
  }

  blank(id) {
    const def = this.subject(id);
    return { on: false, p: def?.legacy ? null : def?.start ?? 0, carry: 0, held: 0, strain: 0, phase: 'idle', left: 0, calmLock: 0, restrainLock: 0, mods: [], count: 0, turn: 0 };
  }

  /** A subject's state for reading: its own, or what it would start as (nothing is stored). */
  peek(id) {
    return this.subjects[id] ?? this.blank(id);
  }

  /** Something to move on the hazard clock: a switched-on subject, aboard, with a modifier, a hold seeping back, a countdown, a cooldown or a lock. */
  get active() {
    for (const [id, st] of Object.entries(this.subjects)) {
      if (!st.on) continue;
      const def = this.subject(id);
      if (!def) continue;
      if (!(st.mods.length || (def.restrain.bleed > 0 && st.held > 0) || st.phase !== 'idle' || st.calmLock > 0 || st.restrainLock > 0)) continue;
      if (this.availability(id).ok && !this.legacyOwns(id)) return true;
    }
    return false;
  }

  /** Nothing has ever been asked of the system (every subject off and untouched). */
  get untouched() {
    return !Object.keys(this.subjects).length;
  }

  // --- reading ---------------------------------------------------------------

  /** Where the story has a character (cached until the story or the captain's room changes). */
  where(npc) {
    const s = this.session;
    if (!s) return null;
    const key = `${s.story.rev ?? 0}|${s.location?.map ?? ''}`;
    const hit = this.whereCache.get(npc);
    if (hit && hit.key === key) return hit.where;
    const where = npcWhere(this.content, s, npc);
    this.whereCache.set(npc, { key, where });
    return where;
  }

  /** Whether a subject can take part now: its condition holds and the story has it aboard in a room with air. { ok, reason, where }. */
  availability(id) {
    const def = this.subject(id);
    if (!def || !this.session) return { ok: false, reason: 'unknown', where: null };
    if (def.available && !evaluateCondition(def.available, this.session)) return { ok: false, reason: `${def.name} isn't aboard yet.`, where: null };
    const where = this.where(def.npc);
    if (!where) return { ok: false, reason: `${def.name} isn't anywhere aboard right now.`, where: null };
    return { ok: true, reason: null, where };
  }

  /** A scene owns Brogath: a Stability incident is running, or he is (scripted) ANGRY. This system waits. */
  legacyOwns(id) {
    const def = this.subject(id);
    if (!def?.legacy || !this.session) return false;
    const st = readStability(def.legacy, this.session);
    return !!st.incident || st.angry;
  }

  pressureOf(id) {
    const def = this.subject(id);
    if (!def) return 0;
    if (def.legacy) return this.session ? readStability(def.legacy, this.session).pressure : def.start;
    return this.peek(id).p ?? def.start;
  }

  stage(id) {
    const def = this.subject(id);
    if (!def) return 'stable';
    return stageFor(def, this.pressureOf(id), this.subjects[id]?.phase === 'imminent');
  }

  /** Everything the HUD, the Ship page and the report need about a subject. */
  info(id) {
    const def = this.subject(id);
    if (!def) return null;
    const st = this.peek(id);
    const av = this.availability(id);
    const p = this.pressureOf(id);
    const stage = this.stage(id);
    const si = stageInfo(this.content, stage);
    const lim = pressureData(this.content)?.limits ?? {};
    return {
      id,
      name: def.name,
      npc: def.npc,
      on: st.on,
      available: av.ok,
      reason: av.reason,
      room: av.where?.room ?? null,
      legacyOwned: this.legacyOwns(id),
      pressure: p,
      shown: Math.round(p),
      min: def.min,
      max: def.max,
      pct: Math.round(((p - def.min) / (def.max - def.min)) * 100),
      stage,
      label: si.label,
      tone: si.tone,
      weight: si.weight,
      held: st.held,
      heldPct: Math.round((st.held / (lim.held ?? 90)) * 100),
      strain: st.strain,
      maxStrain: def.restrain.maxStrain,
      phase: st.phase,
      left: st.left,
      calmLock: st.calmLock,
      restrainLock: st.restrainLock,
      mods: st.mods.map((m) => ({ id: m.id, label: def.modifiers[m.id]?.label ?? m.id, left: m.left, deliberate: !!def.modifiers[m.id]?.deliberate })),
      count: st.count,
    };
  }

  /** The subjects worth a warning (building or worse, switched on, aboard): for the HUD line and the Ship page. */
  emergencies() {
    const out = [];
    for (const [id, st] of Object.entries(this.subjects)) {
      if (!st.on) continue;
      const i = this.info(id);
      if (!i?.available || i.legacyOwned || !(i.weight > 0)) continue;
      out.push({ kind: 'pressure', id: `pressure:${id}`, subject: id, name: i.name, room: i.room, stage: i.stage, label: i.label, tone: i.tone, held: i.held > 0, left: i.phase === 'imminent' ? i.left : null, weight: i.weight + (i.held > 0 ? 10 : 0) });
    }
    return out.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
  }

  /** Whether the captain is close enough to a subject to work with them: { ok, reason }. */
  nearCaptain(id) {
    const def = this.subject(id);
    const av = this.availability(id);
    if (!av.ok) return { ok: false, reason: av.reason };
    const loc = this.session.location ?? {};
    if (loc.map !== av.where.room) return { ok: false, reason: `${def.name} is in ${this.roomName(av.where.room)}.` };
    const at = this.npcAt?.(def.npc) ?? av.where;
    const d = Math.max(Math.abs((loc.x ?? 0) - at.x), Math.abs((loc.y ?? 0) - at.y));
    if (d > def.reach) return { ok: false, reason: `Get closer to ${def.name}.` };
    return { ok: true, reason: null };
  }

  // --- changing ----------------------------------------------------------------

  /** Switches a subject's simulation on or off. Off: it stops, keeps its numbers, and no countdown is left pending. */
  enable(id, on = true) {
    if (!this.subject(id)) return { ok: false, reason: 'unknown subject' };
    const st = this.state(id);
    st.on = !!on;
    if (!on && st.phase === 'imminent') {
      st.phase = 'idle';
      st.left = 0;
    }
    this.seenStage[id] = this.stage(id);
    this.changed();
    return { ok: true };
  }

  /** Writes a subject's pressure (clamped; Brogath's through his Stability, whose listeners hear of it). */
  writeP(id, value) {
    const def = this.subject(id);
    if (def.legacy) {
      const r = writePressure(def.legacy, this.session, value);
      this.bus?.emit('stability:changed', { subject: def.legacy.id, kind: 'pressure', ...r });
      return r.to;
    }
    const st = this.state(id);
    st.p = Math.max(def.min, Math.min(def.max, value));
    return st.p;
  }

  /**
   * Raises a subject's pressure by `amount` (already scaled for the
   * difficulty). Brogath's rises still count for less while he is mellow or
   * recovering (his Stability's rule), and fractions are carried.
   */
  raise(id, amount, tuning = SHIP_TUNING_DEFAULTS) {
    if (!(amount > 0)) return this.pressureOf(id);
    const def = this.subject(id);
    const st = this.state(id);
    const before = this.pressureOf(id);
    if (def.legacy) {
      const total = st.carry + amount * triggerScale(def.legacy, this.session);
      const whole = Math.floor(total + 1e-9);
      st.carry = Math.max(0, total - whole);
      if (whole > 0) this.writeP(id, before + whole);
    } else this.writeP(id, before + amount);
    this.settleCheck(id, tuning);
    return this.pressureOf(id);
  }

  /** Lowers a subject's pressure by `amount`. */
  lower(id, amount, tuning = SHIP_TUNING_DEFAULTS) {
    if (!(amount > 0)) return this.pressureOf(id);
    const def = this.subject(id);
    this.writeP(id, this.pressureOf(id) - (def.legacy ? Math.round(amount) : amount));
    this.settleCheck(id, tuning);
    return this.pressureOf(id);
  }

  /** After any change: at the top with nothing pending, the countdown starts; eased off far enough, it stops. */
  settleCheck(id, tuning = SHIP_TUNING_DEFAULTS) {
    const def = this.subject(id);
    const st = this.state(id);
    const p = this.pressureOf(id);
    if (st.phase === 'idle' && st.on && p >= def.max && !this.legacyOwns(id)) {
      st.phase = 'imminent';
      st.left = this.warnSeconds(id, tuning);
      this.notice(`pressure:${id}:imminent:${st.count}`, `<r>${def.name.toUpperCase()} IS ABOUT TO BLOW!</> <k>${st.left} s. Calm, hold, or clear out.</>`, 'r');
    } else if (st.phase === 'imminent' && p < def.eruption.cancelBelow) {
      st.phase = 'idle';
      st.left = 0;
      this.notice(`pressure:${id}:eased:${st.count}`, `<g>${def.name} eases off.</> <k>Not now. Not yet.</>`, 'g');
    }
    this.announce(id);
    this.changed();
  }

  /** Seconds of warning before an eruption on this difficulty (never under 2). */
  warnSeconds(id, tuning = SHIP_TUNING_DEFAULTS) {
    const lim = pressureData(this.content)?.limits?.warn ?? [3, 30];
    return Math.max(2, Math.min(lim[1], Math.round(this.subject(id).eruption.warn * (tuning.warnScale ?? 1))));
  }

  /** Refuses when the subject is off, away, or a scene owns it: { ok, reason }. */
  ready(id) {
    const def = this.subject(id);
    if (!def) return { ok: false, reason: 'unknown subject' };
    if (!this.subjects[id]?.on) return { ok: false, reason: `${def.name}'s pressure isn't in play.` };
    const av = this.availability(id);
    if (!av.ok) return { ok: false, reason: av.reason };
    if (this.legacyOwns(id)) return { ok: false, reason: `${def.name} is in the middle of something.` };
    return { ok: true, reason: null };
  }

  /**
   * A named trigger (the subject's table; Brogath's are his Stability's):
   * its pressure, times the difficulty and how much he has strained to hold
   * things in, plus its modifier if it has one. Returns { ok, reason?, rose, effect }.
   */
  trigger(id, triggerId, tuning = SHIP_TUNING_DEFAULTS) {
    const r = this.ready(id);
    if (!r.ok) return r;
    const def = this.subject(id);
    const t = def.triggers[triggerId];
    if (!t) return { ok: false, reason: `unknown trigger "${triggerId}"` };
    const st = this.state(id);
    const before = this.pressureOf(id);
    const amount = (t.pressure ?? 0) * (tuning.pressureScale ?? 1) * (1 + st.strain * def.strain) * (st.phase === 'cooldown' ? def.eruption.recover ?? 0.5 : 1);
    this.raise(id, amount, tuning);
    if (t.modifier) this.addModifier(id, t.modifier);
    return { ok: true, rose: this.pressureOf(id) - before, effect: t };
  }

  /** A named calm, scaled by the difficulty and by how far gone he is (calming works less near the top). */
  calm(id, calmId, tuning = SHIP_TUNING_DEFAULTS, { factor = 1 } = {}) {
    const r = this.ready(id);
    if (!r.ok) return r;
    const def = this.subject(id);
    const c = def.calms[calmId];
    if (!c) return { ok: false, reason: `unknown calm "${calmId}"` };
    const before = this.pressureOf(id);
    const amount = -(c.pressure ?? 0) * (tuning.calmScale ?? 1) * stageInfo(this.content, this.stage(id)).calm * factor;
    this.lower(id, amount, tuning);
    return { ok: true, fell: before - this.pressureOf(id), effect: c };
  }

  /** Adds a scripted amount (positive: a rise, scaled like any; negative: a fall). */
  add(id, amount, tuning = SHIP_TUNING_DEFAULTS) {
    const r = this.ready(id);
    if (!r.ok) return r;
    if (amount > 0) this.raise(id, amount * (tuning.pressureScale ?? 1), tuning);
    else this.lower(id, -amount, tuning);
    return { ok: true, pressure: this.pressureOf(id) };
  }

  /** A temporary modifier from the subject's table. The same one again refreshes it (never stacks); at most limits.modifiers at once. */
  addModifier(id, modId) {
    const def = this.subject(id);
    const m = def?.modifiers?.[modId];
    if (!m) return { ok: false, reason: `unknown modifier "${modId}"` };
    const st = this.state(id);
    const lim = pressureData(this.content)?.limits ?? {};
    const have = st.mods.find((x) => x.id === modId);
    if (have) have.left = Math.max(have.left, m.seconds);
    else {
      if (st.mods.length >= (lim.modifiers ?? 4)) return { ok: false, reason: 'too many modifiers' };
      st.mods.push({ id: modId, rate: Math.min(m.rate, lim.rate ?? 5), left: m.seconds });
      this.notice(`pressure:${id}:mod:${modId}`, `<y>${def.name}:</> ${m.label}. <k>Building up.</>`, 'y');
    }
    this.changed();
    return { ok: true };
  }

  removeModifier(id, modId) {
    const st = this.state(id);
    const n = st.mods.length;
    st.mods = st.mods.filter((m) => m.id !== modId);
    if (st.mods.length !== n) this.changed();
    return { ok: true };
  }

  /**
   * He holds it in (the captain got him to, or a scene says so): the
   * pressure falls by the hold's amount, and that amount (times holdFactor
   * and the difficulty) goes into what is held, to come out later, bigger.
   * Each hold strains him; the captain's has a lock after it.
   */
  restrained(id, tuning = SHIP_TUNING_DEFAULTS, { amount: want = null, lock = true } = {}) {
    const def = this.subject(id);
    const st = this.state(id);
    const re = def.restrain;
    const lim = pressureData(this.content)?.limits ?? {};
    const amount = Math.max(0, Math.min(want ?? re.amount, this.pressureOf(id) - def.min));
    st.held = Math.min(lim.held ?? 90, st.held + amount * re.holdFactor * (tuning.holdScale ?? 1));
    st.strain = Math.min(re.maxStrain, st.strain + 1);
    if (lock) st.restrainLock = re.lock;
    this.lower(id, amount, tuning);
    this.notice(`pressure:${id}:held:${st.strain}`, `<y>${def.name} holds it in.</> <k>For now. Held: ${Math.round(st.held)}.</>`, 'y');
    return { ok: true, held: st.held };
  }

  /** A failed hold (a challenge cost, kept through a retry): worse, and no new try for a while. */
  setback(id, action = 'restrain', tuning = SHIP_TUNING_DEFAULTS) {
    const def = this.subject(id);
    if (!def) return { ok: false, reason: 'unknown subject' };
    const st = this.state(id);
    if (action === 'restrain') {
      st.restrainLock = Math.min(LOCK_MAX, Math.round(def.restrain.lock * 1.5));
      this.raise(id, def.restrain.failRise * (tuning.pressureScale ?? 1), tuning);
    }
    return { ok: true };
  }

  /** Back to calm after a scene: pressure to `pressure` (or its start), nothing held or pending. */
  settle(id, pressure = null) {
    const def = this.subject(id);
    if (!def) return { ok: false, reason: 'unknown subject' };
    const st = this.state(id);
    Object.assign(st, { carry: 0, held: 0, strain: 0, phase: 'idle', left: 0, calmLock: 0, restrainLock: 0, mods: [] });
    this.writeP(id, pressure ?? def.start);
    this.seenStage[id] = this.stage(id);
    this.changed();
    return { ok: true };
  }

  // --- time ------------------------------------------------------------------

  /**
   * One step of hazard time, before the leaks, fire and air: locks run
   * down; modifiers raise the pressure (scaled for the difficulty, less in
   * cooldown); what was held seeps back (Garrick); a cooldown ends; a
   * countdown runs and, at zero, the eruption happens. Returns true if
   * anything was in play.
   */
  tick(tuning = SHIP_TUNING_DEFAULTS) {
    if (!this.def || !this.session) return false;
    let moved = false;
    for (const id of Object.keys(this.subjects)) {
      const st = this.subjects[id];
      const def = this.subject(id);
      if (!st.on || !def) continue;
      if (!this.availability(id).ok || this.legacyOwns(id)) continue;
      moved = true;
      // A countdown or cooldown that begins during this second starts counting next second.
      const was = st.phase;
      if (st.calmLock > 0) st.calmLock -= 1;
      if (st.restrainLock > 0) st.restrainLock -= 1;
      let rise = 0;
      for (const m of st.mods) {
        rise += m.rate;
        m.left -= 1;
      }
      const ended = st.mods.filter((m) => m.left <= 0);
      st.mods = st.mods.filter((m) => m.left > 0);
      for (const m of ended) this.notice(`pressure:${id}:mod:${m.id}:end`, `<k>${def.name}: ${def.modifiers[m.id]?.label ?? m.id}, over.</>`, 'w');
      rise *= tuning.pressureScale ?? 1;
      // What he holds seeps back out (Garrick), never past the top: at the top it stays held.
      if (def.restrain.bleed > 0 && st.held > 0) {
        const b = Math.min(st.held, def.restrain.bleed, Math.max(0, def.max - this.pressureOf(id) - rise));
        st.held -= b;
        rise += b;
      }
      if (st.phase === 'cooldown') rise *= def.eruption.recover ?? 0.5;
      if (rise > 0) this.raise(id, rise, tuning);
      if (st.phase === 'cooldown' && was === 'cooldown') {
        st.left -= 1;
        if (st.left <= 0) {
          st.phase = 'idle';
          st.left = 0;
          this.notice(`pressure:${id}:recovered:${st.count}`, `<k>${def.name} has recovered.</>`, 'w');
          this.settleCheck(id, tuning);
        }
      } else if (st.phase === 'imminent' && was === 'imminent') {
        st.left -= 1;
        if (st.left <= 0) this.erupt(id, { tuning });
      }
      this.changed();
    }
    return moved;
  }

  // --- eruptions ---------------------------------------------------------------

  /**
   * A release. Its size comes from the pressure and what was held
   * (controlled: controlScale as much), unless a profile is named. In order:
   * the structure is struck, the room's openings take the blast, a finite
   * gas source starts in the room, a fire if the profile says so; then the
   * relief and the cooldown. Applied once per event id (default: the
   * subject's next eruption, saved and checkpointed), so a repeated callback
   * can't double it and a retried attempt can erupt again.
   * Returns { ok, reason?, ...what happened }.
   */
  erupt(id, { controlled = false, profile = null, room = null, eventId = null, tuning = SHIP_TUNING_DEFAULTS } = {}) {
    const def = this.subject(id);
    const fail = (reason) => ({ ok: false, reason, subject: id });
    if (!def) return fail('unknown subject');
    const content = this.content;
    const st = this.state(id);
    const where = room ?? this.availability(id).where?.room ?? null;
    if (!where || !airRoom(content, where)) return fail(`${def.name} isn't in a room with ship air`);
    if (profile && !profileDef(content, profile)) return fail(`unknown release profile "${profile}"`);
    const eid = eventId ?? `erupt:${id}:${st.count + 1}`;
    if (!this.ship.claimEvent(eid)) return fail('duplicate event');
    st.count += 1;
    const p = this.pressureOf(id);
    const intensity = Math.round((Math.max(0, p) + st.held * def.eruption.heldWeight) * (controlled ? def.release.controlScale : 1));
    const prof = profileDef(content, profile ?? levelFor(content, intensity).id);
    const level = levelInfo(content, prof.level);
    const out = { ok: true, subject: id, name: def.name, npc: def.npc, room: where, controlled, intensity, level: level.id, label: level.label, sfx: level.sfx ?? null, shake: level.shake ?? 0, eventId: eid, damage: [], openings: [], gas: null, fire: null };
    // 1. The structure.
    for (const d of asArray(prof.damage)) {
      const r = this.strike(damageTarget(content, d, where), d, tuning, where, eid, id);
      if (r) out.damage.push(r);
    }
    // 2. The openings.
    out.openings = this.blast(where, prof.openings ?? null);
    // 3. The gas.
    if (prof.gas) out.gas = this.emit(id, def, prof, where, tuning, st.count);
    // 4. Fire, only when the profile asks for it.
    if (prof.ignite && fireRoom(content, where)) out.fire = this.ship.hazards.ignite({ room: where, intensity: prof.ignite.intensity, source: `pressure:${id}` });
    // 4b. Prompt 9: the residue it leaves in the captain's beard, if he is close and that system is on (the subject's "beard";
    // a deposit, once per eruption: the gas itself reaches his beard only as he breathes it, like any other).
    if (def.beard && this.ship.beard?.on) {
      const at = this.npcAt?.(def.npc) ?? this.availability(id).where ?? null;
      out.beard = this.ship.beard.contaminate({ source: `pressure:${id}`, room: where, at, reach: def.beard.reach ?? null, intensity: intensity / 100, contaminant: def.beard.contaminant, amount: def.beard.amount, eventId: `${eid}:beard` }, tuning);
    }
    // 5. Relief, then the cooldown (longer on a gentler difficulty).
    st.held = 0;
    st.strain = 0;
    st.carry = 0;
    st.phase = 'cooldown';
    st.left = Math.max(1, Math.round(def.eruption.cooldown * (controlled ? 0.5 : 1) * (tuning.warnScale ?? 1)));
    this.writeP(id, def.eruption.after);
    // 6. In words: what it was, then what it did.
    const bad = level.id === 'major' || level.id === 'catastrophic';
    this.notice(`pressure:${id}:erupt:${st.count}`, `${bad ? '<r>' : '<y>'}${def.name.toUpperCase()}: ${level.label}${controlled ? ' (controlled)' : ''}!</> <k>In ${this.roomName(where)}.</>`, bad ? 'r' : 'y');
    const ops = out.openings.map((o) => `${o.label.replace(/^the /, '')} ${o.what}`);
    if (ops.length) this.notice(`pressure:${id}:blast:${st.count}`, `<o>The blast:</> ${ops.join(', ')}.`, 'o');
    // The relief is the eruption's own news: the stage moves without a "settled" notice.
    this.announce(id, { silent: true });
    this.bus?.emit('pressure:erupted', out);
    this.changed();
    return out;
  }

  /** One section struck: scaled (release and damage), resisted, never below the floor. */
  strike(section, entry, tuning, room, eid, id) {
    const ship = this.ship;
    if (!section || !ship.has(section)) return null;
    const data = pressureData(this.content);
    const cat = data?.damage?.category ?? 'supernatural';
    const sdef = ship.def.sections[section];
    const resist = sdef.resist?.[cat] ?? 1;
    const floor = Math.ceil(sdef.max * (data?.damage?.floor ?? 0.25));
    const want = Math.round(entry.amount * (tuning.releaseScale ?? 1) * (tuning.damageScale ?? 1) * resist);
    const amount = Math.min(want, ship.hp.get(section) - floor);
    if (!(amount >= 1)) return { ok: true, section, applied: 0, held: true };
    const r = ship.applyDamage({ section, amount, category: cat, source: `pressure:${id}`, event: eid, exact: true, breach: entry.breach === true, room });
    return r.ok ? r : null;
  }

  /** The blast at the room's openings to other rooms (and the outside if the profile says): seals torn, closed ones blown open, some damaged. */
  blast(room, op) {
    if (!op) return [];
    const content = this.content;
    const air = this.ship.air;
    const out = [];
    const all = connectionsOf(content, room);
    const reach = all.filter((cid) => op.outside || otherSide(content, cid, room) !== OUTSIDE);
    const touched = [];
    if (op.breakSeals) {
      for (const cid of reach) {
        const c = air.connectionState(cid);
        if (c.state !== 'sealed') continue;
        if (air.setConnection(cid, 'open', { damaged: true }).ok) {
          out.push({ id: cid, label: c.label, what: 'seal torn open' });
          touched.push(cid);
        }
      }
    }
    let force = op.force ?? 0;
    for (const cid of reach) {
      if (force <= 0) break;
      const c = air.connectionState(cid);
      if (c.state !== 'closed') continue;
      if (air.setConnection(cid, 'open').ok) {
        out.push({ id: cid, label: c.label, what: 'blown open' });
        touched.push(cid);
        force--;
      }
    }
    let dmg = op.damage ?? 0;
    for (const cid of [...touched, ...reach.filter((x) => !touched.includes(x))]) {
      if (dmg <= 0) break;
      const c = air.connectionState(cid);
      if (c.damaged || !c.changeable) continue;
      if (air.setConnection(cid, null, { damaged: true }).ok) {
        const had = out.find((o) => o.id === cid);
        if (had) had.what += ', damaged';
        else out.push({ id: cid, label: c.label, what: 'damaged' });
        dmg--;
      }
    }
    return out;
  }

  /** The release's gas: a finite source in the room (or, with every source slot taken, all of it at once, never past full). */
  emit(id, def, prof, room, tuning, n) {
    const air = this.ship.air;
    const sub = prof.substance ?? def.substance;
    const amount = Math.max(1, Math.round(prof.gas.amount * (tuning.releaseScale ?? 1)));
    const rate = Math.min(prof.gas.rate, airData(this.content)?.limits?.rate ?? 20);
    const sid = `erupt_${id}_${n}`;
    const r = air.startSource({ id: sid, room, substance: sub, rate, amount, label: `${def.name}'s release`, source: `pressure:${id}` });
    if (r.ok) return { source: sid, substance: sub, amount, rate };
    if (r.reason === 'already pouring') return { source: sid, substance: sub, amount: 0, rate };
    return { source: null, substance: sub, amount: air.addGas(room, sub, amount), rate: null };
  }

  // --- words -------------------------------------------------------------------

  roomName(room) {
    return `the ${this.content?.maps?.get?.(room)?.name?.replace(/^The /, '') ?? room}`;
  }

  notice(key, text, tone) {
    if (this.quiet) return;
    this.bus?.emit('hazard:notice', { key, text, tone });
  }

  changed() {
    this.bus?.emit('hazard:changed', {});
  }

  /** A stage change, said once: rising into building or worse is a warning; falling back to stable, relief ("silent": the event only). */
  announce(id, { silent = false } = {}) {
    const def = this.subject(id);
    const now = this.stage(id);
    const was = this.seenStage[id] ?? 'stable';
    if (now === was) return;
    this.seenStage[id] = now;
    const rising = stageRank(now) > stageRank(was);
    this.bus?.emit('pressure:stage', { subject: id, npc: def.npc, stage: now, from: was, rising, legacy: !!def.legacy });
    if (silent || !this.subjects[id]?.on || now === 'imminent') return;
    const si = stageInfo(this.content, now);
    const hint = { building: 'Calm him, or get ready.', dangerous: 'Act now: calm him, hold it, or let it out somewhere safe.', critical: 'Any moment now.' }[now];
    if (rising && stageRank(now) >= stageRank('building')) this.notice(`pressure:${id}:stage:${now}`, `<${si.tone}>${def.name.toUpperCase()}: ${si.label.toUpperCase()}</>${hint ? ` <k>${hint}</>` : ''}`, si.tone);
    // Back to stable: settled, unless he is only holding it in (the hold said so already).
    else if (!rising && now === 'stable' && !(this.subjects[id]?.held > 0)) this.notice(`pressure:${id}:stage:stable`, `<g>${def.name} is settled.</>`, 'g');
  }

  // --- saving ------------------------------------------------------------------

  serialize() {
    const subjects = {};
    for (const [id, st] of Object.entries(this.subjects)) {
      subjects[id] = { on: st.on, ...(st.p !== null ? { p: st.p } : {}), carry: st.carry, held: st.held, strain: st.strain, phase: st.phase, left: st.left, calmLock: st.calmLock, restrainLock: st.restrainLock, mods: st.mods.map((m) => ({ ...m })), count: st.count, turn: st.turn };
    }
    return { subjects };
  }

  /**
   * From a save or a checkpoint. A save from before version 21 has none:
   * every subject off, nothing pending, nothing invented. Unknown subjects
   * and modifiers are dropped, numbers clamped, an unknown phase is idle; a
   * countdown keeps at most its full warning. Nothing replays: the stage is
   * taken as already announced.
   */
  load(state, onWarning = () => {}) {
    this.subjects = {};
    this.seenStage = {};
    this.whereCache.clear();
    const subs = isPlainObject(state?.subjects) ? state.subjects : {};
    const lim = (this.content && pressureData(this.content)?.limits) ?? {};
    const n = (v, lo, hi, d = lo) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Number(v))) : d);
    for (const [id, raw] of Object.entries(subs)) {
      const def = this.subject(id);
      if (!def || !isPlainObject(raw)) {
        onWarning(`pressure: dropped unknown subject "${id}"`);
        continue;
      }
      const st = this.state(id);
      st.on = raw.on === true;
      if (!def.legacy) st.p = n(raw.p, def.min, def.max, def.start);
      st.carry = n(raw.carry, 0, 0.999999, 0);
      st.held = n(raw.held, 0, lim.held ?? 90, 0);
      st.strain = Math.round(n(raw.strain, 0, def.restrain.maxStrain, 0));
      st.phase = PHASES.includes(raw.phase) ? raw.phase : 'idle';
      if (raw.phase !== undefined && !PHASES.includes(raw.phase)) onWarning(`pressure: ${id} had an unknown phase "${raw.phase}"; it is idle`);
      const most = st.phase === 'imminent' ? Math.max(2, Math.round(def.eruption.warn * 1.5)) : Math.round(def.eruption.cooldown * 1.5);
      st.left = st.phase === 'idle' ? 0 : Math.round(n(raw.left, 1, most, 1));
      st.calmLock = Math.round(n(raw.calmLock, 0, LOCK_MAX, 0));
      st.restrainLock = Math.round(n(raw.restrainLock, 0, LOCK_MAX, 0));
      st.mods = [];
      for (const m of asArray(raw.mods)) {
        const md = def.modifiers[m?.id];
        if (!md) {
          onWarning(`pressure: ${id} dropped unknown modifier "${m?.id}"`);
          continue;
        }
        if (st.mods.length >= (lim.modifiers ?? 4) || st.mods.some((x) => x.id === m.id)) continue;
        st.mods.push({ id: m.id, rate: n(m.rate, 0, Math.min(md.rate, lim.rate ?? 5), md.rate), left: Math.round(n(m.left, 1, md.seconds, md.seconds)) });
      }
      st.count = Math.round(n(raw.count, 0, 1e6, 0));
      st.turn = Math.round(n(raw.turn, 0, 1e6, 0));
      this.seenStage[id] = this.stage(id);
    }
  }
}
