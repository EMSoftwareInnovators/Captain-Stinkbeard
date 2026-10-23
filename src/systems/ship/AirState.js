import { isPlainObject, asArray } from '../../core/util.js';
import {
  OUTSIDE, airRoom, substance, substanceIds, connection, connectionIds, connectionsOf, airRoomIds,
  qualityFor, qualityRank, exposureStage, exposureRank,
} from './air.js';
import { SHIP_TUNING_DEFAULTS } from './integrity.js';

/**
 * The ship's air, room by room (docs/gameplay-overhaul/11-atmosphere-and-ventilation.md):
 * what each room holds of each substance, the gas sources still pouring, the
 * openings that aren't at their default (shut, sealed, damaged), and what the
 * captain has breathed. Owned by the ship (`session.ship.air`) and saved with
 * it. Engine-agnostic and deterministic: nothing moves except in `tick()`,
 * one step of the same hazard time as flooding and fire.
 *
 * Rules kept here:
 *   - a room's substances are quantities (percent x volume / 100); together
 *     they never pass 100% of the room, and none goes below 0
 *   - gas moves only through connections, in data order, by the difference
 *     in concentration, never past the point where both sides are level, and
 *     never into a full room: what leaves one room arrives in the other
 *   - it leaves the ship only through openings to the outside (vented) or by
 *     its own decay; both are counted, and a trace below TRACE is cleared
 *   - a source pours at its rate until its amount or its seconds run out
 *   - the captain's exposure rises with the index of the air in his room and
 *     falls in clean air; it is not the room's concentration, and ventilating
 *     a room doesn't clear his lungs
 *
 * Events on the bus (shared with the flooding and fire): hazard:changed
 * (redraw), hazard:notice ({ key, text, tone }: only when something changes
 * stage), air:cough (a coughing fit: the world stops the captain a moment).
 */
const TRACE = 0.005;

export class AirState {
  constructor({ ship, def = null, bus = null } = {}) {
    this.ship = ship;
    this.def = def;
    this.bus = bus;
    // Per play, set by the session and the world: where the captain is, how
    // to hurt him, the fume hazard option, and whether a legacy fume zone has
    // his lungs this second (it owns exposure while he stands in one).
    this.where = null;
    this.hurt = null;
    this.nameOf = null;
    this.access = 1;
    this.legacyOwns = false;
    this.quiet = false;
    this.reset();
  }

  reset() {
    this.gas = {};
    this.sources = [];
    this.links = {};
    this.exposure = 0;
    this.next = 1;
    // Per play: what left the ship, what the captain's beard took in (Prompt 9), the fits and hurts' countdowns, each room's last total and quality (trends and notices).
    this.vented = {};
    this.decayed = {};
    this.absorbed = {};
    this.coughIn = 0;
    this.hurtIn = 0;
    this.prev = {};
    this.trend = {};
    this.seen = {};
    this.exposureSeen = null;
  }

  get enabled() {
    return !!this.def;
  }

  /** Anything in the air anywhere, a source pouring, or the captain still short of breath. */
  get active() {
    return this.sources.length > 0 || this.exposure > 0 || Object.values(this.gas).some((g) => Object.values(g).some((q) => q > 0));
  }

  // --- reading -------------------------------------------------------------

  volume(room) {
    return airRoom({ shipAir: this.def }, room)?.volume ?? 0;
  }

  level(room) {
    return airRoom({ shipAir: this.def }, room)?.level ?? 0;
  }

  quantity(room, sub) {
    return this.gas[room]?.[sub] ?? 0;
  }

  /** Room left for more gas before the room is all gas. */
  free(room) {
    return Math.max(0, this.volume(room) - this.loadOf(room));
  }

  /** All gas in a room (quantity units). */
  loadOf(room) {
    return Object.values(this.gas[room] ?? {}).reduce((n, q) => n + q, 0);
  }

  /** Every substance's quantity in the whole ship (what conservation is checked on). */
  total(sub) {
    return Object.values(this.gas).reduce((n, g) => n + (g[sub] ?? 0), 0);
  }

  /**
   * A room's air: { room, known, total (percent), subs: [{ id, label,
   * short, pct, over }], index (exposure a second), quality, worst,
   * sources, trend }. Unknown rooms (not in the data) read as clean.
   */
  airIn(room) {
    const sdef = { shipAir: this.def };
    const vol = this.volume(room);
    if (!vol) return { room, known: false, total: 0, subs: [], index: 0, quality: qualityFor(this.def, 0, 0), worst: null, sources: [], trend: 'steady' };
    const subs = [];
    let index = 0;
    let total = 0;
    for (const id of substanceIds(sdef)) {
      const q = this.gas[room]?.[id] ?? 0;
      if (!(q > 0)) continue;
      const s = substance(sdef, id);
      const pct = (q / vol) * 100;
      const over = Math.max(0, pct - s.safe) * s.potency;
      index += over;
      total += pct;
      subs.push({ id, label: s.label, short: s.short, color: s.color, pct, shown: Math.round(pct), over, safe: s.safe });
    }
    const worst = [...subs].sort((a, b) => b.over - a.over || b.pct - a.pct)[0] ?? null;
    return { room, known: true, total, subs, index, quality: qualityFor(this.def, index, total), worst, sources: this.sources.filter((s) => s.room === room), trend: this.trend[room] ?? 'steady' };
  }

  /** The state of a connection: { id, label, kind, rooms, state, damaged, rate, states, seconds, changeable, outside }. */
  connectionState(id) {
    const c = connection({ shipAir: this.def }, id);
    if (!c) return null;
    const kd = this.def.kinds?.[c.kind] ?? {};
    const cur = this.links[id];
    const state = cur?.state ?? c.state;
    const damaged = cur?.damaged === true;
    const rate = (kd.rates?.[state] ?? 0) + (damaged ? this.def.damagedLeak ?? 0 : 0);
    const states = asArray(kd.states);
    return { id, label: c.label, kind: c.kind, rooms: c.rooms, state, damaged, rate, states, seconds: kd.seconds ?? 1, changeable: states.length > 1, outside: c.rooms[1] === OUTSIDE, byDefault: !cur };
  }

  connectionsIn(room) {
    return connectionsOf({ shipAir: this.def }, room).map((id) => this.connectionState(id));
  }

  /** The captain's exposure: { value, pct, stage, rank }. */
  exposureNow() {
    const max = this.def?.exposure?.max ?? 100;
    const stage = exposureStage(this.def, this.exposure);
    return { value: this.exposure, pct: Math.round((this.exposure / max) * 100), stage, rank: exposureRank(this.def, stage.id) };
  }

  /** The bad air on the ship, worst first (foul or worse), and the captain's lungs when they're short of clear: for the HUD and the Ship page. */
  emergencies() {
    const out = [];
    const weights = { foul: 120, toxic: 170, deadly: 260 };
    for (const room of airRoomIds({ shipAir: this.def })) {
      const a = this.airIn(room);
      if (qualityRank(this.def, a.quality.id) < 2) continue;
      out.push({ kind: 'air', id: `air:${room}`, room, stage: a.quality.id, label: a.quality.label, pct: Math.round(a.worst?.pct ?? 0), substance: a.worst?.short ?? '', weight: (weights[a.quality.id] ?? 120) + Math.min(50, a.index * 5) });
    }
    return out.sort((x, y) => y.weight - x.weight || x.id.localeCompare(y.id));
  }

  // --- changing ------------------------------------------------------------

  /** Gas in (scripted, a source, a fire): never past what the room can hold. Returns how much went in. */
  addGas(room, sub, units) {
    const n = Number(units);
    if (!this.volume(room) || !substance({ shipAir: this.def }, sub) || !Number.isFinite(n) || n <= 0) return 0;
    const add = Math.min(n, this.free(room));
    if (!(add > 0)) return 0;
    this.gas[room] ??= {};
    this.gas[room][sub] = (this.gas[room][sub] ?? 0) + add;
    this.changed();
    return add;
  }

  /** Prompt 9: gas the captain's beard takes out of a room's air (it leaves the room for the beard; counted as absorbed). Returns how much. */
  takeGas(room, sub, units) {
    const have = this.gas[room]?.[sub] ?? 0;
    const n = Math.min(have, Math.max(0, Number(units) || 0));
    if (!(n > 0)) return 0;
    this.gas[room][sub] -= n;
    this.absorbed[sub] = (this.absorbed[sub] ?? 0) + n;
    this.tidy(room);
    this.changed();
    return n;
  }

  /** Prompt 9: a dose straight into his lungs (a sniff of the beard), through the fume option and the difficulty. Returns what it added. */
  inhale(amount, tuning = SHIP_TUNING_DEFAULTS) {
    const max = this.def?.exposure?.max ?? 100;
    const n = Math.max(0, Number(amount) || 0) * Math.max(0, this.access) * (tuning.exposureScale ?? 1);
    const before = this.exposure;
    this.exposure = Math.min(max, this.exposure + n);
    if (this.exposure !== before) this.changed();
    return this.exposure - before;
  }

  /** Gas out of the ship from a room (one substance, or all with `sub` null): `share` of it (0 to 1). Counted as vented. */
  ventRoom(room, share = 1, sub = null) {
    const g = this.gas[room];
    if (!g) return 0;
    const k = Math.max(0, Math.min(1, Number(share) || 0));
    let out = 0;
    for (const id of Object.keys(g)) {
      if (sub && id !== sub) continue;
      const n = g[id] * k;
      g[id] -= n;
      this.vented[id] = (this.vented[id] ?? 0) + n;
      out += n;
    }
    this.tidy(room);
    if (out > 0) this.changed();
    return out;
  }

  /**
   * Starts a source: { id?, room, substance, rate (units a second), amount?
   * (units in all), seconds?, label?, source? }. It must end: an amount, or
   * seconds, or both. Returns { ok, reason?, source }.
   */
  startSource({ id = null, room, substance: sub, rate, amount = null, seconds = null, label = null, source = null }) {
    const fail = (reason) => ({ ok: false, reason });
    const lim = this.def?.limits ?? {};
    if (!this.volume(room)) return fail('no air there');
    if (!substance({ shipAir: this.def }, sub)) return fail('unknown substance');
    if (!(Number(rate) > 0 && Number(rate) <= (lim.rate ?? 20))) return fail(`rate must be above 0, at most ${lim.rate ?? 20}`);
    const hasAmount = amount !== null && amount !== undefined;
    const hasSeconds = seconds !== null && seconds !== undefined;
    if (!hasAmount && !hasSeconds) return fail('a source must end: give it an amount or seconds');
    if (hasAmount && !(Number(amount) > 0)) return fail('amount must be above 0');
    if (hasSeconds && !(Number.isInteger(seconds) && seconds > 0 && seconds <= (lim.seconds ?? 600))) return fail(`seconds must be whole, 1 to ${lim.seconds ?? 600}`);
    if (this.sources.length >= (lim.sources ?? 12)) return fail('too many sources');
    const sid = id ?? `src_${this.next++}`;
    if (this.sources.some((s) => s.id === sid)) return fail('already pouring');
    const s = { id: sid, room, substance: sub, rate: Number(rate), left: hasAmount ? Number(amount) : null, ticks: hasSeconds ? seconds : null, label: label ?? null, source: source ?? null };
    this.sources.push(s);
    const what = substance({ shipAir: this.def }, sub);
    this.notice(`air:src:${sid}`, `<y>${what.short}</> ${s.label ? `from ${s.label} ` : ''}in ${this.roomName(room)}!`, 'y');
    this.changed();
    return { ok: true, source: s };
  }

  /** Stops a source by id (or every source in a room with `room`). Returns how many stopped. */
  stopSource(id = null, room = null) {
    const before = this.sources.length;
    this.sources = this.sources.filter((s) => !(id ? s.id === id : s.room === room));
    if (this.sources.length !== before) this.changed();
    return before - this.sources.length;
  }

  /**
   * Opens, closes or seals a connection (or marks it damaged). Only the
   * states its kind has; sealing only from closed, never when damaged;
   * damage tears a seal (it is closed again). Returns { ok, reason?, from, to }.
   */
  setConnection(id, state = null, { damaged = null } = {}) {
    const cur = this.connectionState(id);
    if (!cur) return { ok: false, reason: 'unknown connection' };
    const fail = (reason) => ({ ok: false, reason, from: cur.state, to: state });
    let to = state ?? cur.state;
    let dmg = damaged === null ? cur.damaged : damaged === true;
    if (!cur.states.includes(to)) return fail(`${cur.label} can't be ${to}`);
    if (to === 'sealed' && cur.state !== 'sealed' && cur.state !== 'closed') return fail(`close ${cur.label} first`);
    if (to === 'sealed' && dmg) {
      if (state === 'sealed') return fail(`${cur.label} is damaged: it won't seal`);
      to = 'closed';
    }
    const def = connection({ shipAir: this.def }, id);
    if (to === def.state && !dmg) delete this.links[id];
    else this.links[id] = { state: to, ...(dmg ? { damaged: true } : {}) };
    if (to !== cur.state || dmg !== cur.damaged) this.changed();
    return { ok: true, from: cur.state, to, damaged: dmg };
  }

  // --- time ----------------------------------------------------------------

  /**
   * One step of hazard time (the same tick as flooding and fire): sources
   * pour, fires that make smoke smoke, gas moves through every connection in
   * data order and out of the open ones to the outside, substances decay,
   * and the captain breathes the air of the room he's in. `tuning`: the
   * difficulty's ship tuning (shipTuning). Returns true if anything was active.
   */
  tick(tuning = SHIP_TUNING_DEFAULTS) {
    if (!this.def || !(this.active || this.smokeToCome())) return false;
    const sdef = { shipAir: this.def };
    const before = this.qualities();
    // 1. Sources.
    for (const s of [...this.sources]) {
      const want = s.left !== null ? Math.min(s.rate, s.left) : s.rate;
      const added = this.addGas(s.room, s.substance, want);
      if (s.left !== null) s.left = Math.max(0, s.left - added);
      if (s.ticks !== null) s.ticks -= 1;
      if ((s.left !== null && s.left <= TRACE) || (s.ticks !== null && s.ticks <= 0)) {
        this.sources = this.sources.filter((x) => x !== s);
        const what = substance(sdef, s.substance);
        this.notice(`air:src:${s.id}:done`, `<k>No more ${what.label.toLowerCase()}${s.label ? ` from ${s.label}` : ''}.</>`, 'k');
      }
    }
    // 2. Smoke from fires that make it (opt-in per fire).
    const per = this.def.fire?.smokePerIntensity ?? 0;
    for (const f of this.ship?.hazards?.fires ?? []) if (f.smoke && per > 0) this.addGas(f.room, 'smoke', f.intensity * per);
    // 3. Through every opening, in data order.
    for (const id of connectionIds(sdef)) this.flow(id, tuning);
    // 4. Decay, and traces gone.
    for (const room of Object.keys(this.gas)) {
      const g = this.gas[room];
      for (const id of Object.keys(g)) {
        const d = substance(sdef, id)?.decay ?? 0;
        if (d > 0) {
          const n = g[id] * d;
          g[id] -= n;
          this.decayed[id] = (this.decayed[id] ?? 0) + n;
        }
      }
      this.tidy(room);
    }
    // 5. The captain breathes.
    this.breathe(tuning);
    // 6. Trends and what changed stage.
    this.announce(before);
    this.changed();
    return true;
  }

  /** A fire that makes smoke keeps the air ticking even when the air is clean. */
  smokeToCome() {
    return (this.ship?.hazards?.fires ?? []).some((f) => f.smoke);
  }

  flow(id, tuning) {
    const c = this.connectionState(id);
    if (!(c.rate > 0)) return;
    const sdef = { shipAir: this.def };
    const [a, b] = c.rooms;
    if (b === OUTSIDE) {
      const g = this.gas[a];
      if (!g) return;
      const k = c.rate * (tuning.ventScale ?? 1);
      for (const id2 of Object.keys(g)) {
        const out = g[id2] * Math.min(1, k * (substance(sdef, id2)?.vent ?? 1));
        g[id2] -= out;
        this.vented[id2] = (this.vented[id2] ?? 0) + out;
      }
      this.tidy(a);
      return;
    }
    const va = this.volume(a);
    const vb = this.volume(b);
    for (const sub of substanceIds(sdef)) {
      const qa = this.quantity(a, sub);
      const qb = this.quantity(b, sub);
      if (!(qa > 0 || qb > 0)) continue;
      const ca = qa / va;
      const cb = qb / vb;
      if (Math.abs(ca - cb) < 1e-9) continue;
      const [from, to, qf, vf] = ca > cb ? [a, b, qa, va] : [b, a, qb, vb];
      const s = substance(sdef, sub);
      let k = c.rate;
      if (s.heavy) {
        const lf = this.level(from);
        const lt = this.level(to);
        if (lt > lf) k *= s.sink;
        else if (lt < lf) k *= s.rise;
      }
      const level = (qa + qb) / (va + vb);
      // Never past level (half the way there at most), never into a full room.
      const n = Math.min(k * Math.abs(ca - cb) * Math.min(va, vb), (qf - level * vf) * 0.5, this.free(to));
      if (!(n > 0)) continue;
      this.gas[from][sub] -= n;
      this.gas[to] ??= {};
      this.gas[to][sub] = (this.gas[to][sub] ?? 0) + n;
    }
    this.tidy(a);
    this.tidy(b);
  }

  /** Clears traces (counted as decayed) and empty rooms. */
  tidy(room) {
    const g = this.gas[room];
    if (!g) return;
    for (const id of Object.keys(g)) {
      if (g[id] > TRACE) continue;
      if (g[id] > 0) this.decayed[id] = (this.decayed[id] ?? 0) + g[id];
      delete g[id];
    }
    if (!Object.keys(g).length) delete this.gas[room];
  }

  breathe(tuning) {
    const ex = this.def.exposure ?? {};
    const max = ex.max ?? 100;
    const room = this.where?.() ?? null;
    const air = room ? this.airIn(room) : null;
    const was = exposureStage(this.def, this.exposure);
    // Prompt 9 (docs/gameplay-overhaul/13-beard-saturation.md): with the Stink Beard switched on, it catches its
    // share of each gas first (out of the room, into the beard) and his lungs breathe the rest; at heavy and worse
    // it gives off what it holds. Off (every chapter), this is the air's own index, exactly as before.
    const beard = this.ship?.beard;
    let index = air?.index ?? 0;
    let fromBeard = 0;
    if (beard?.on) {
      if (room && air?.known && air.subs.length) {
        const caught = beard.absorb(room, air, tuning);
        if (Object.keys(caught).length) index = this.indexThrough(air, caught);
      }
      fromBeard = beard.offgas(tuning);
    }
    const lungs = (tuning.exposureScale ?? 1) * Math.max(0, this.access);
    const gain = index * lungs;
    const off = fromBeard * lungs;
    if (this.legacyOwns) {
      // A legacy fume zone has his lungs this second (systems/hazards/fumes.js): one exposure, never two.
    } else if (gain > 0) this.exposure = Math.min(max, this.exposure + gain + off);
    else if (this.exposure > 0 || off > 0) {
      // Clean air: he recovers, less fast with a beard giving off into his face (faster than it can give off, on every difficulty, in clean air).
      const hazy = air && air.known && air.total >= (this.def.quality?.trace ?? 1);
      this.exposure = Math.max(0, Math.min(max, this.exposure + off - (hazy ? ex.recoverHazy ?? 2 : ex.recover ?? 5) * (tuning.recoveryScale ?? 1)));
      if (this.exposure < 0.01) this.exposure = 0;
    }
    const stage = exposureStage(this.def, this.exposure);
    // A coughing fit every N seconds (the first as soon as he gets there).
    if (stage.cough) {
      this.coughIn -= 1;
      if (this.coughIn <= 0) {
        this.coughIn = stage.cough;
        this.bus?.emit('air:cough', { stage: stage.id });
      }
    } else this.coughIn = 0;
    // Hurt, every N seconds in the worst stage (never on arrival: a moment to get out), never below the floor.
    if (stage.hurt) {
      if (exposureRank(this.def, was.id) < exposureRank(this.def, stage.id)) this.hurtIn = stage.hurt.every;
      this.hurtIn -= 1;
      if (this.hurtIn <= 0) {
        this.hurtIn = stage.hurt.every;
        const lost = this.hurt?.(stage.hurt.hp, stage.hurt.floor) ?? 0;
        if (lost > 0) this.notice('air:hurt', `<r>Choking:</> -${lost} HP. <k>Get to clean air!</>`, 'r');
      }
    } else this.hurtIn = 0;
  }

  /** The index of a breath after the beard caught a share of each gas (each gas at (1 - share) of its concentration, against its safe level). */
  indexThrough(air, caught) {
    const sdef = { shipAir: this.def };
    let index = 0;
    for (const s of air.subs) {
      const def = substance(sdef, s.id);
      index += Math.max(0, s.pct * (1 - (caught[s.id] ?? 0)) - def.safe) * def.potency;
    }
    return index;
  }

  /** Each room's quality id, for the notices. */
  qualities() {
    const out = {};
    for (const room of airRoomIds({ shipAir: this.def })) out[room] = this.airIn(room).quality.id;
    return out;
  }

  announce(before) {
    const here = this.where?.() ?? null;
    for (const room of airRoomIds({ shipAir: this.def })) {
      const a = this.airIn(room);
      const prev = this.prev[room] ?? a.total;
      this.trend[room] = a.total > prev + 0.05 ? 'rising' : a.total < prev - 0.05 ? 'falling' : 'steady';
      this.prev[room] = a.total;
      const was = qualityRank(this.def, before[room]);
      const now = qualityRank(this.def, a.quality.id);
      if (now > was && now >= 2 && (now >= 3 || room === here)) {
        const tone = now >= 4 ? 'r' : now >= 3 ? 'o' : 'y';
        this.notice(`air:${room}:${a.quality.id}`, `<${tone}>${a.quality.label.toUpperCase()}</> air in ${this.roomName(room)}: ${a.worst.short} ${a.worst.shown}%${now >= 3 ? '!' : '.'}`, tone);
      } else if (now <= 1 && was >= 2) this.notice(`air:${room}:clear`, `<g>The air in ${this.roomName(room)} is breathable again.</>`, 'g');
    }
    const e = exposureStage(this.def, this.exposure);
    const seen = this.exposureSeen ?? 'clear';
    const re = exposureRank(this.def, e.id);
    const rs = exposureRank(this.def, seen);
    if (re > rs && re >= 1) this.notice(`air:lungs:${e.id}`, `<${re >= 3 ? 'r' : 'y'}>*cough*</> Your exposure: ${e.label.toUpperCase()}.${re >= 2 ? ' <k>Get to clean air.</>' : ''}`, re >= 3 ? 'r' : 'y');
    else if (re === 0 && rs >= 1) this.notice('air:lungs:clear', '<g>Your lungs have cleared.</>', 'g');
    this.exposureSeen = e.id;
  }

  /** A room's name for a notice ("the Galley"). `nameOf` is set by the session (map names). */
  roomName(room, bare = false) {
    const n = this.nameOf?.(room) ?? String(room).replace(/_/g, ' ');
    return bare ? n : `the ${n}`.replace(/^the the /i, 'the ');
  }

  notice(key, text, tone = 'w') {
    if (!this.quiet) this.bus?.emit('hazard:notice', { key, text, tone });
  }

  changed() {
    this.bus?.emit('hazard:changed', {});
  }

  // --- saving --------------------------------------------------------------

  /** Full precision (a loaded game goes on exactly as the saved one would have): a few dozen numbers at most. */
  serialize() {
    const gas = {};
    for (const [room, g] of Object.entries(this.gas)) {
      const out = {};
      for (const [id, q] of Object.entries(g)) if (q > TRACE) out[id] = q;
      if (Object.keys(out).length) gas[room] = out;
    }
    return {
      gas,
      sources: this.sources.map((s) => ({ ...s })),
      links: Object.fromEntries(Object.entries(this.links).map(([k, v]) => [k, { ...v }])),
      exposure: this.exposure,
      next: this.next,
    };
  }

  /**
   * From a save or a checkpoint. Missing (a save from before version 20):
   * clean air everywhere, nothing invented. What doesn't fit the data (an
   * unknown room, substance or connection, a broken number) is dropped with a
   * warning or clamped; a room holding more than it can is scaled down.
   */
  load(state, onWarning = () => {}) {
    this.reset();
    if (!isPlainObject(state) || !this.def) return;
    const sdef = { shipAir: this.def };
    for (const [room, g] of Object.entries(isPlainObject(state.gas) ? state.gas : {})) {
      const vol = this.volume(room);
      if (!vol || !isPlainObject(g)) {
        onWarning(`air: dropped the air of "${room}" (no such room)`);
        continue;
      }
      const kept = {};
      for (const [id, q] of Object.entries(g)) {
        if (!substance(sdef, id) || !Number.isFinite(q)) {
          onWarning(`air: dropped "${id}" in ${room}`);
          continue;
        }
        if (q > TRACE) kept[id] = q;
      }
      const sum = Object.values(kept).reduce((n, q) => n + q, 0);
      if (sum > vol) {
        onWarning(`air: ${room} held more than it can: scaled down`);
        for (const id of Object.keys(kept)) kept[id] *= vol / sum;
      }
      if (Object.keys(kept).length) this.gas[room] = kept;
    }
    const lim = this.def.limits ?? {};
    let maxId = 0;
    for (const s of asArray(state.sources)) {
      const okEnd = (s?.left === null || (Number.isFinite(s?.left) && s.left > 0)) && (s?.ticks === null || (Number.isInteger(s?.ticks) && s.ticks > 0)) && !(s?.left === null && s?.ticks === null);
      if (!isPlainObject(s) || typeof s.id !== 'string' || !this.volume(s.room) || !substance(sdef, s.substance) || !(s.rate > 0) || !okEnd || this.sources.some((x) => x.id === s.id) || this.sources.length >= (lim.sources ?? 12)) {
        onWarning(`air: dropped a source that doesn't fit (${JSON.stringify(s).slice(0, 80)})`);
        continue;
      }
      maxId = Math.max(maxId, Number(/_(\d+)$/.exec(s.id)?.[1] ?? 0));
      this.sources.push({ id: s.id, room: s.room, substance: s.substance, rate: Math.min(lim.rate ?? 20, s.rate), left: s.left, ticks: s.ticks === null ? null : Math.min(lim.seconds ?? 600, s.ticks), label: typeof s.label === 'string' ? s.label : null, source: typeof s.source === 'string' ? s.source : null });
    }
    for (const [id, v] of Object.entries(isPlainObject(state.links) ? state.links : {})) {
      const c = connection(sdef, id);
      const states = asArray(this.def.kinds?.[c?.kind]?.states);
      if (!c || !isPlainObject(v) || !states.includes(v.state)) {
        onWarning(`air: dropped the state of "${id}"`);
        continue;
      }
      const damaged = v.damaged === true;
      const st = damaged && v.state === 'sealed' ? 'closed' : v.state;
      if (st !== c.state || damaged) this.links[id] = { state: st, ...(damaged ? { damaged: true } : {}) };
    }
    const max = this.def.exposure?.max ?? 100;
    this.exposure = Number.isFinite(state.exposure) ? Math.max(0, Math.min(max, state.exposure)) : 0;
    this.next = Math.max(Number.isInteger(state.next) && state.next > 0 ? state.next : 1, maxId + 1);
    // What the notices compare against: the loaded state, so loading announces nothing.
    this.exposureSeen = exposureStage(this.def, this.exposure).id;
  }
}
