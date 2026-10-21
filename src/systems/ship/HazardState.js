import { isPlainObject, asArray } from '../../core/util.js';
import {
  compartment, fireRoom, floodStage, fireStage, fireRank, leakSeverityFor, leakSeverity, severityRank, waterSource,
} from './hazards.js';
import { SHIP_TUNING_DEFAULTS } from './integrity.js';

/**
 * The ship's emergencies (docs/gameplay-overhaul/10-flooding-and-fire.md):
 * leaks, water per compartment and fires per room, owned by the ship
 * (`session.ship.hazards`) and saved with it. Engine-agnostic and
 * deterministic: nothing moves except in `tick()`, one fixed step of hazard
 * time (data "tickMs"), which the world calls only while the captain is free
 * and the work actions call while he works. No frame rate is involved.
 *
 * Rules kept here:
 *   - a leak is tied to a section and a room; it opens only from damage that
 *     says so ("breach") or an explicit command; its severity follows the
 *     section's condition; patching closes it without restoring the hull or
 *     removing water; repairing the section past "sealAt" seals it
 *   - water moves only along the data's flow links (drains down stairs,
 *     spills over door sills), never past a compartment's capacity
 *   - a fire grows while it has fuel, burns out after, damages only the
 *     sections its room's data names (from the stage named), spreads only to
 *     the rooms its data names, and only after burning hot for a while;
 *     water in the same room slows or drowns it, water elsewhere doesn't
 *   - what burns is gone: a room's fuel is spent for good, so a fire that
 *     comes back into a room gets only what's left, and a burnt-out room
 *     can't catch again (the ship's fires are bounded by its fuel)
 *   - hazard damage is applied through the ship (ShipState.applyDamage),
 *     once per fire, tick and section, from inside tick() only (a restored
 *     checkpoint rewinds the time and the fire with the hull, so nothing
 *     is applied twice)
 *
 * Events on the bus: hazard:changed (redraw), hazard:notice ({ key, text,
 * tone }: only when something changes stage, never every tick).
 */
const round2 = (n) => Math.round(n * 100) / 100;

export class HazardState {
  constructor({ ship, def = null, bus = null } = {}) {
    this.ship = ship;
    this.def = def;
    this.bus = bus;
    // Per play: an emergency action under way (one at a time; a restore or a load doesn't clear it), and notices held back.
    this.working = false;
    this.quiet = false;
    this.reset();
  }

  reset() {
    this.leaks = [];
    this.water = {};
    this.fires = [];
    // Fuel left per room that has burned (absent: the room's full fuel).
    this.fuel = {};
    this.buckets = 0;
    this.time = 0;
    this.strain = 0;
    this.next = 1;
  }

  get enabled() {
    return !!this.def;
  }

  /** Something is happening: an open leak, water anywhere, a fire. (A patched leak is not an emergency.) */
  get active() {
    return this.leaks.some((l) => l.state === 'open') || Object.values(this.water).some((u) => u > 0) || this.fires.length > 0;
  }

  /** Anything to show or save: active, or patched leaks still waiting for a repair, or buckets carried. */
  get any() {
    return this.active || this.leaks.length > 0 || this.buckets > 0;
  }

  // --- reading -------------------------------------------------------------

  waterIn(room) {
    const c = compartment({ shipHazards: this.def }, room);
    if (!c) return { room, units: 0, capacity: 0, pct: 0, stage: floodStage(this.def, 0), floodable: false };
    const units = this.water[room] ?? 0;
    const pct = (units / c.capacity) * 100;
    return { room, units, capacity: c.capacity, pct: Math.round(pct), exact: pct, stage: floodStage(this.def, pct), floodable: true };
  }

  fireIn(room) {
    const f = this.fires.find((x) => x.room === room) ?? null;
    return f ? { ...f, stage: fireStage(this.def, f.intensity) } : null;
  }

  leaksIn(room) {
    return this.leaks.filter((l) => l.room === room);
  }

  leakRate(leak, tuning = SHIP_TUNING_DEFAULTS) {
    if (leak.state !== 'open') return 0;
    return (leakSeverity(this.def, leak.severity)?.rate ?? 0) * (tuning.leakScale ?? 1) * (leak.slowed ? 0.5 : 1);
  }

  /** The hold's water as a share of the hold's capacity, and what it does to the ship. */
  stability() {
    let units = 0;
    let cap = 0;
    for (const [room, c] of Object.entries(this.def?.compartments ?? {})) {
      if (room.startsWith('//') || c.deck !== 'hold') continue;
      units += this.water[room] ?? 0;
      cap += c.capacity;
    }
    const pct = cap ? Math.round((units / cap) * 100) : 0;
    const s = this.def?.stability ?? {};
    const state = pct >= (s.foundering ?? 101) ? 'foundering' : pct >= (s.listing ?? 101) ? 'listing' : 'steady';
    return { pct, state };
  }

  /** Every emergency, worst first: fires, then flooding, then open leaks (for the HUD and the Ship page). */
  emergencies() {
    const out = [];
    for (const f of this.fires) {
      const st = fireStage(this.def, f.intensity);
      out.push({ kind: 'fire', id: f.id, room: f.room, stage: st.id, label: st.label, intensity: Math.round(f.intensity), weight: 200 + f.intensity });
    }
    for (const room of Object.keys(this.water)) {
      const w = this.waterIn(room);
      if (w.units <= 0) continue;
      out.push({ kind: 'flood', id: `water:${room}`, room, stage: w.stage.id, label: w.stage.label, pct: w.pct, weight: 100 + w.pct });
    }
    for (const l of this.leaks) {
      const sev = leakSeverity(this.def, l.severity);
      out.push({ kind: 'leak', id: l.id, room: l.room, section: l.section, stage: l.state === 'open' ? l.severity : 'patched', label: l.state === 'open' ? sev?.label ?? l.severity : 'Patched', open: l.state === 'open', slowed: l.slowed, weight: l.state === 'open' ? 50 + severityRank(this.def, l.severity) * 10 : 0 });
    }
    return out.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
  }

  // --- leaks ---------------------------------------------------------------

  /**
   * Opens a leak (or makes an existing one in the same section and room
   * worse, or tears its patch open). `req`: section, room (default: the
   * section's), severity, source. Returns { ok, reason?, leak, opened,
   * worse, reopened }.
   */
  openLeak({ section, room = null, severity, source = null }) {
    const fail = (reason) => ({ ok: false, reason, section, room });
    const ldef = this.def?.leaks?.sections?.[section];
    if (!ldef) return fail('section cannot leak');
    const where = room ?? ldef.room;
    const sdef = this.ship?.def?.sections?.[section];
    if (!compartment({ shipHazards: this.def }, where)) return fail('not a compartment');
    if (sdef && !asArray(sdef.rooms).includes(where)) return fail('room not on that section');
    const sev = leakSeverity(this.def, severity);
    if (!sev) return fail('unknown severity');
    let leak = this.leaks.find((l) => l.section === section && l.room === where);
    if (leak) {
      const worse = severityRank(this.def, sev.id) > severityRank(this.def, leak.severity);
      const reopened = leak.state !== 'open';
      if (worse) leak.severity = sev.id;
      if (reopened) {
        leak.state = 'open';
        leak.slowed = false;
      }
      if (worse || reopened) this.notice(`leak:${leak.id}:${leak.severity}`, `${reopened ? 'The patch tore open: ' : ''}${this.leakText(leak)}`, 'r');
      this.changed();
      return { ok: true, leak, opened: false, worse, reopened };
    }
    leak = { id: `leak_${this.next++}`, section, room: where, severity: sev.id, state: 'open', slowed: false, source, since: this.time };
    this.leaks.push(leak);
    this.notice(`leak:${leak.id}:${leak.severity}`, this.leakText(leak), 'r');
    this.changed();
    return { ok: true, leak, opened: true, worse: false, reopened: false };
  }

  leakText(leak) {
    const sec = this.ship?.def?.sections?.[leak.section]?.name ?? leak.section;
    const sev = leakSeverity(this.def, leak.severity)?.label ?? leak.severity;
    return `<r>${sev.toUpperCase()}</> in the ${sec.toLowerCase()}: water coming into ${this.roomName(leak.room)}!`;
  }

  /** Damage that may hole the hull ("breach": true): a leak as bad as the section's condition now allows. */
  onBreach(result, room = null) {
    if (!result?.ok || !this.def?.leaks?.sections?.[result.section]) return null;
    const sec = this.ship.section(result.section);
    const sev = leakSeverityFor(this.def, sec.pct);
    if (!sev) return null;
    return this.openLeak({ section: result.section, room, severity: sev.id, source: result.source ?? null });
  }

  /** A section was repaired: its leaks ease to what its condition allows, and are sealed once it's sound enough. */
  onSectionRestored(section) {
    const mine = this.leaks.filter((l) => l.section === section);
    if (!mine.length) return;
    const pct = this.ship.section(section).pct;
    const sealAt = this.def?.leaks?.sealAt ?? 60;
    const allowed = leakSeverityFor(this.def, pct);
    for (const l of mine) {
      if (pct >= sealAt || !allowed) {
        this.leaks = this.leaks.filter((x) => x !== l);
        this.notice(`leak:${l.id}:sealed`, `<g>Sealed:</> the ${this.ship.def.sections[section].name.toLowerCase()} no longer leaks into ${this.roomName(l.room)}.`, 'g');
      } else if (severityRank(this.def, allowed.id) < severityRank(this.def, l.severity)) {
        l.severity = allowed.id;
      }
    }
    this.changed();
  }

  /** An emergency patch's result: success closes the leak (the hull and the water stay as they are); partial halves it. */
  patchLeak(id, outcome) {
    const leak = this.leaks.find((l) => l.id === id);
    if (!leak || leak.state !== 'open') return { ok: false, reason: 'no open leak' };
    if (outcome === 'success') {
      leak.state = 'patched';
      leak.slowed = false;
      this.notice(`leak:${id}:patched`, `<g>Patched:</> the leak into ${this.roomName(leak.room)} is closed. <k>Now pump it out.</>`, 'g');
    } else if (outcome === 'partial') {
      leak.slowed = true;
      this.notice(`leak:${id}:slowed`, `<y>Rough patch:</> the leak into ${this.roomName(leak.room)} is slowed, not stopped.`, 'y');
    } else return { ok: false, reason: 'no result' };
    this.changed();
    return { ok: true, leak };
  }

  /** Scripted: the leaks of a section (in one room, or all) are gone. */
  sealLeaks(section, room = null) {
    const before = this.leaks.length;
    this.leaks = this.leaks.filter((l) => !(l.section === section && (!room || l.room === room)));
    if (this.leaks.length !== before) this.changed();
    return before - this.leaks.length;
  }

  // --- water ---------------------------------------------------------------

  /** Water in (scripted, or a leak): never past the compartment's capacity. Returns how much went in. */
  addWater(room, units) {
    const c = compartment({ shipHazards: this.def }, room);
    const n = Number(units);
    if (!c || !Number.isFinite(n) || n <= 0) return 0;
    const before = this.water[room] ?? 0;
    const after = Math.min(c.capacity, round2(before + n));
    this.water[room] = after;
    if (after !== before) this.changed();
    return round2(after - before);
  }

  /** Water out (pumped, bailed, scooped): never below 0. Returns how much came out. */
  removeWater(room, units) {
    const n = Number(units);
    const before = this.water[room] ?? 0;
    if (!Number.isFinite(n) || n <= 0 || before <= 0) return 0;
    const after = Math.max(0, round2(before - n));
    if (after > 0) this.water[room] = after;
    else delete this.water[room];
    this.changed();
    return round2(before - after);
  }

  // --- fire ----------------------------------------------------------------

  /** The fuel a room has left to burn (all of it until a fire there has spent some). */
  fuelLeft(room) {
    const rdef = fireRoom({ shipHazards: this.def }, room);
    if (!rdef) return 0;
    const f = this.fires.find((x) => x.room === room);
    return f ? f.fuel : this.fuel[room] ?? rdef.fuel;
  }

  /** Starts a fire (or feeds one already burning). `spread: false` keeps it in its room. */
  ignite({ room, intensity = null, spread = true, source = null }) {
    const rdef = fireRoom({ shipHazards: this.def }, room);
    if (!rdef) return { ok: false, reason: 'room cannot burn', room };
    const w = this.waterIn(room);
    if (w.floodable && w.exact >= (this.def.fire.water?.slows ?? 101)) return { ok: false, reason: 'too wet to burn', room };
    if (!this.fires.some((x) => x.room === room) && this.fuelLeft(room) <= 0) return { ok: false, reason: 'nothing left to burn', room };
    const start = Math.max(1, Math.min(100, Number(intensity ?? this.def.fire.ignite)));
    let f = this.fires.find((x) => x.room === room);
    if (f) {
      f.intensity = Math.max(f.intensity, start);
      f.spread = f.spread || spread;
      this.changed();
      return { ok: true, fire: f, started: false };
    }
    f = { id: `fire_${this.next++}`, room, intensity: start, fuel: this.fuelLeft(room), spread: spread !== false, hot: 0, acc: {}, source, since: this.time };
    this.fires.push(f);
    this.notice(`fire:${f.id}:start`, `<o>FIRE</> in ${this.roomName(room)}!`, 'o');
    this.changed();
    return { ok: true, fire: f, started: true };
  }

  /** Knocks a fire down by `amount` (a bucket, sailcloth); out at 0. */
  douse(room, amount) {
    const f = this.fires.find((x) => x.room === room);
    if (!f) return { ok: false, reason: 'no fire' };
    const before = f.intensity;
    f.intensity = round2(Math.max(0, f.intensity - amount));
    if (f.intensity <= 0) this.putOut(f, `<g>Fire out</> in ${this.roomName(room)}.`);
    else this.changed();
    return { ok: true, before, after: f.intensity, out: f.intensity <= 0 };
  }

  /** Scripted: the fire in a room is out. */
  extinguish(room) {
    const f = this.fires.find((x) => x.room === room);
    if (!f) return false;
    this.putOut(f, `<g>Fire out</> in ${this.roomName(room)}.`);
    return true;
  }

  putOut(f, text) {
    this.fires = this.fires.filter((x) => x !== f);
    this.fuel[f.room] = round2(Math.max(0, f.fuel));
    this.notice(`fire:${f.id}:out`, text, 'g');
    this.changed();
  }

  // --- buckets -------------------------------------------------------------

  /** Water to hand in a room: a source (the sea, the cask), or the flood itself. */
  waterAtHand(room) {
    if (waterSource({ shipHazards: this.def }, room)) return 'source';
    return this.waterIn(room).exact >= 10 ? 'flood' : null;
  }

  /** Fills the carried buckets (up to `cap`) from a source, or scoops them from the flood. Returns how many. */
  fillBuckets(room, cap) {
    const at = this.waterAtHand(room);
    if (!at) return 0;
    const space = Math.max(0, cap - this.buckets);
    if (at === 'source') {
      this.buckets += space;
      if (space) this.changed();
      return space;
    }
    const per = this.def.actions?.fetch?.fromFlood ?? 6;
    const n = Math.min(space, Math.floor((this.water[room] ?? 0) / per));
    if (n > 0) {
      this.removeWater(room, n * per);
      this.buckets += n;
    }
    return n;
  }

  // --- time ----------------------------------------------------------------

  /**
   * One step of hazard time. `tuning`: the difficulty's ship tuning
   * (shipTuning). Leaks pour in, water drains and spills, fires grow, burn,
   * spread and damage, a foundering hold strains the hulls. Returns true if
   * anything was active.
   */
  tick(tuning = SHIP_TUNING_DEFAULTS) {
    if (!this.def || !this.active) return false;
    this.time += 1;
    const before = this.stagesNow();
    // 1. Leaks.
    for (const l of this.leaks) {
      const rate = this.leakRate(l, tuning);
      if (rate > 0) this.addWater(l.room, rate);
    }
    // 2. Water finds its level along the flow links, in data order.
    for (const link of this.def.flow ?? []) this.flow(link);
    // 3. Fires, oldest first (a fire started by spreading this tick waits for the next).
    for (const f of [...this.fires]) this.burn(f, tuning);
    // 4. A foundering hold strains the hulls.
    const st = this.def.stability;
    if (this.stability().state === 'foundering') {
      this.strain += 1;
      if (this.strain >= (st.strain?.every ?? 10)) {
        this.strain = 0;
        for (const s of st.strain?.sections ?? []) this.ship.applyDamage({ section: s, amount: st.strain.amount, category: 'strain', exact: true, source: 'flooding' });
      }
    } else this.strain = 0;
    this.announceStages(before, this.stagesNow());
    this.changed();
    return true;
  }

  flow(link) {
    const cap = (r) => compartment({ shipHazards: this.def }, r)?.capacity ?? 0;
    const w = (r) => this.water[r] ?? 0;
    const move = (from, to, n) => {
      const amount = round2(Math.min(n, w(from), cap(to) - w(to)));
      if (amount <= 0) return;
      this.water[from] = round2(w(from) - amount);
      if (this.water[from] <= 0) delete this.water[from];
      this.water[to] = round2(w(to) + amount);
    };
    if (link.kind === 'drain') {
      if (w(link.from) > 0) move(link.from, link.to, link.rate);
      return;
    }
    // A spill over a sill, either way: down to the sill, or until both sides are level.
    for (const [a, b] of [[link.from, link.to], [link.to, link.from]]) {
      const ca = cap(a);
      const cb = cap(b);
      const pa = (w(a) / ca) * 100;
      const pb = (w(b) / cb) * 100;
      if (!(pa > link.sill && pa > pb + 0.5)) continue;
      const level = ((w(a) + w(b)) / (ca + cb)) * 100;
      const keep = (Math.max(level, link.sill) / 100) * ca;
      move(a, b, Math.min(link.rate, w(a) - keep));
    }
  }

  burn(f, tuning) {
    const fd = this.def.fire;
    const rdef = fd.rooms[f.room];
    const w = this.waterIn(f.room);
    if (w.floodable && w.exact >= fd.water.drowns) {
      this.putOut(f, `<g>The water put out</> the fire in ${this.roomName(f.room)}.`);
      return;
    }
    const slowed = w.floodable && w.exact >= fd.water.slows;
    if (slowed) {
      f.intensity -= fd.water.slowBy;
      f.hot = 0;
    } else if (f.fuel > 0) {
      f.intensity += fd.growth * (tuning.fireScale ?? 1);
      f.fuel = round2(Math.max(0, f.fuel - f.intensity / fd.burnRate));
    } else f.intensity -= fd.decay;
    f.intensity = round2(Math.min(100, f.intensity));
    if (f.intensity <= 0) {
      this.putOut(f, f.fuel <= 0 ? `The fire in ${this.roomName(f.room)} <g>burned out</>.` : `<g>Fire out</> in ${this.roomName(f.room)}.`);
      return;
    }
    // Damage: only the sections this room's fire reaches, from the stage named.
    const rank = fireRank(this.def, fireStage(this.def, f.intensity).id);
    for (const b of rdef.burns ?? []) {
      if (b.from && rank < fireRank(this.def, b.from)) continue;
      const resist = this.ship.def.sections[b.section]?.resist?.fire ?? 1;
      f.acc[b.section] = (f.acc[b.section] ?? 0) + f.intensity * fd.damagePerIntensity * (tuning.damageScale ?? 1) * resist;
      const whole = Math.floor(f.acc[b.section]);
      if (whole >= 1) {
        f.acc[b.section] = round2(f.acc[b.section] - whole);
        // One application per fire, tick and section, inside tick(): it can't repeat, so it carries no event id.
        this.ship.applyDamage({ section: b.section, amount: whole, category: 'fire', exact: true, source: f.id });
      }
    }
    // Spread: hot long enough, into the first room its data names that can catch.
    if (!f.spread || slowed || f.intensity < fd.spreadAt) {
      f.hot = 0;
      return;
    }
    f.hot += 1;
    if (f.hot < Math.round(fd.spreadAfter / (tuning.fireScale ?? 1))) return;
    f.hot = 0;
    for (const to of rdef.spread ?? []) {
      if (this.fires.some((x) => x.room === to)) continue;
      const r = this.ignite({ room: to, intensity: fd.spreadStart, spread: true, source: `spread:${f.id}` });
      if (r.ok) {
        this.notice(`fire:${r.fire.id}:spread`, `<o>The fire spread</> from ${this.roomName(f.room)} to ${this.roomName(to)}!`, 'o');
        break;
      }
    }
  }

  /** Each room's flood and fire stage, and the ship's stability: what a notice compares. */
  stagesNow() {
    const flood = {};
    for (const room of Object.keys(this.def?.compartments ?? {})) if (!room.startsWith('//')) flood[room] = this.waterIn(room).stage.id;
    const fire = {};
    for (const f of this.fires) fire[f.room] = fireStage(this.def, f.intensity).id;
    return { flood, fire, stability: this.stability().state };
  }

  announceStages(a, b) {
    const ranks = (this.def.floodStages ?? []).map((s) => s.id);
    for (const room of Object.keys(b.flood)) {
      const ra = ranks.indexOf(a.flood[room]);
      const rb = ranks.indexOf(b.flood[room]);
      if (rb > ra && rb >= ranks.indexOf('shallow')) {
        const w = this.waterIn(room);
        this.notice(`flood:${room}:${w.stage.id}`, `${this.roomName(room, true)}: water ${w.pct}% <${rb >= ranks.indexOf('critical') ? 'r' : 'y'}>${w.stage.label.toUpperCase()}</>`, rb >= ranks.indexOf('critical') ? 'r' : 'y');
      } else if (rb === 0 && ra > 0) this.notice(`flood:${room}:dry`, `<g>${this.roomName(room, true)} is dry again.</>`, 'g');
    }
    for (const room of Object.keys(b.fire)) {
      const ra = fireRank(this.def, a.fire[room] ?? 'out');
      const rb = fireRank(this.def, b.fire[room]);
      if (rb > ra && ra > 0 && rb >= fireRank(this.def, 'blazing')) {
        const st = fireStage(this.def, this.fires.find((x) => x.room === room).intensity);
        this.notice(`fire:${room}:${st.id}`, `The fire in ${this.roomName(room)} is <o>${st.label.toUpperCase()}</>!`, 'o');
      }
    }
    if (a.stability !== b.stability) {
      const t = { steady: '<g>The ship rights herself.</>', listing: '<y>The ship is LISTING</>: too much water in the hold.', foundering: '<r>FOUNDERING!</> The hold is filling: the hull strains.' }[b.stability];
      this.notice(`stability:${b.stability}`, t, b.stability === 'steady' ? 'g' : 'r');
    }
  }

  /** A room's name for a notice ("the Cargo Hold"; `bare`: "Cargo Hold"). `nameOf` is set by the session (map names). */
  roomName(room, bare = false) {
    const n = this.nameOf?.(room) ?? room.replace(/_/g, ' ');
    return bare ? n : `the ${n}`.replace(/^the the /i, 'the ');
  }

  // --- events --------------------------------------------------------------

  notice(key, text, tone = 'w') {
    if (!this.quiet) this.bus?.emit('hazard:notice', { key, text, tone });
  }

  changed() {
    this.bus?.emit('hazard:changed', {});
  }

  // --- saving --------------------------------------------------------------

  serialize() {
    return {
      leaks: this.leaks.map((l) => ({ ...l })),
      water: { ...this.water },
      fires: this.fires.map((f) => ({ ...f, acc: { ...f.acc } })),
      fuel: { ...this.fuel },
      buckets: this.buckets,
      time: this.time,
      strain: this.strain,
      next: this.next,
    };
  }

  /**
   * From a save or a checkpoint. Missing (a save from before version 19):
   * no hazards, nothing invented. Anything that doesn't fit the data (an
   * unknown room, section or severity, a broken number) is dropped with a
   * warning or clamped.
   */
  load(state, onWarning = () => {}) {
    this.reset();
    if (!isPlainObject(state) || !this.def) return;
    const sections = this.ship?.def?.sections ?? {};
    const used = new Set();
    const idNum = (id) => Number(/_(\d+)$/.exec(id ?? '')?.[1] ?? 0);
    let maxId = 0;
    for (const l of asArray(state.leaks)) {
      if (!isPlainObject(l) || !this.def.leaks?.sections?.[l.section] || !sections[l.section] || !compartment({ shipHazards: this.def }, l.room) || !leakSeverity(this.def, l.severity) || used.has(l.id) || typeof l.id !== 'string') {
        onWarning(`hazards: dropped a leak that doesn't fit (${JSON.stringify(l).slice(0, 80)})`);
        continue;
      }
      used.add(l.id);
      maxId = Math.max(maxId, idNum(l.id));
      this.leaks.push({ id: l.id, section: l.section, room: l.room, severity: l.severity, state: l.state === 'patched' ? 'patched' : 'open', slowed: l.slowed === true, source: typeof l.source === 'string' ? l.source : null, since: Number.isFinite(l.since) ? l.since : 0 });
    }
    for (const [room, units] of Object.entries(isPlainObject(state.water) ? state.water : {})) {
      const c = compartment({ shipHazards: this.def }, room);
      const n = Number(units);
      if (!c || !Number.isFinite(n)) {
        onWarning(`hazards: dropped water in "${room}"`);
        continue;
      }
      const v = round2(Math.max(0, Math.min(c.capacity, n)));
      if (v > 0) this.water[room] = v;
    }
    for (const f of asArray(state.fires)) {
      const rdef = isPlainObject(f) ? fireRoom({ shipHazards: this.def }, f.room) : null;
      if (!rdef || used.has(f.id) || typeof f.id !== 'string' || this.fires.some((x) => x.room === f.room) || !(Number(f.intensity) > 0)) {
        onWarning(`hazards: dropped a fire that doesn't fit (${JSON.stringify(f).slice(0, 80)})`);
        continue;
      }
      used.add(f.id);
      maxId = Math.max(maxId, idNum(f.id));
      const acc = {};
      for (const [s, v] of Object.entries(isPlainObject(f.acc) ? f.acc : {})) if (sections[s] && Number.isFinite(v) && v >= 0 && v < 1) acc[s] = v;
      this.fires.push({ id: f.id, room: f.room, intensity: round2(Math.min(100, Number(f.intensity))), fuel: Number.isFinite(f.fuel) ? Math.max(0, Math.min(rdef.fuel, f.fuel)) : rdef.fuel, spread: f.spread !== false, hot: Number.isInteger(f.hot) && f.hot >= 0 ? f.hot : 0, acc, source: typeof f.source === 'string' ? f.source : null, since: Number.isFinite(f.since) ? f.since : 0 });
    }
    for (const [room, left] of Object.entries(isPlainObject(state.fuel) ? state.fuel : {})) {
      const rdef = fireRoom({ shipHazards: this.def }, room);
      if (!rdef || !Number.isFinite(left)) {
        onWarning(`hazards: dropped the fuel left in "${room}"`);
        continue;
      }
      this.fuel[room] = round2(Math.max(0, Math.min(rdef.fuel, left)));
    }
    this.buckets = Number.isInteger(state.buckets) ? Math.max(0, Math.min(this.def.actions?.fetch?.buckets ?? 3, state.buckets)) : 0;
    this.time = Number.isInteger(state.time) && state.time >= 0 ? state.time : 0;
    this.strain = Number.isInteger(state.strain) && state.strain >= 0 ? state.strain : 0;
    this.next = Math.max(Number.isInteger(state.next) ? state.next : 1, maxId + 1);
  }
}

