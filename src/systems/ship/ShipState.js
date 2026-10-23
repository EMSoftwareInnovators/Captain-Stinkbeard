import { isPlainObject, asArray } from '../../core/util.js';
import { thresholdFor, sumItems } from './integrity.js';
import { HazardState } from './HazardState.js';
import { AirState } from './AirState.js';
import { PressureState } from './PressureState.js';
import { BeardState } from './BeardState.js';

/**
 * The ship's condition (docs/gameplay-overhaul/09-ship-integrity.md): each
 * structural section's integrity, saved with the game (save version 18) and
 * captured by challenge checkpoints (the "ship" domain). Engine-agnostic and
 * event-driven: nothing here runs every frame.
 *
 * What it guarantees:
 *   - integrity is a whole number from 0 to the section's maximum, always
 *   - an unknown section or category, or an amount that isn't a positive
 *     number, changes nothing and says why
 *   - a damage event with an "eventId" applies once, however often its
 *     callback fires (genuine repeated attacks have their own ids). Inside
 *     a challenge the id is scoped to the attempt (the script commands do
 *     that), and the ids seen are saved and restored with the ship, so a
 *     retried attempt can take the same hit again and a stale callback
 *     can't (docs/gameplay-overhaul/10-flooding-and-fire.md)
 *   - damage asked for by a challenge that has already resolved is refused
 *     unless explicitly authorized
 *   - a repair takes all of its materials or none, and only then restores
 *   - one repair per section at a time ("lock")
 *
 * Events on the bus: ship:damaged, ship:restored, ship:threshold (a section
 * moved to another condition), ship:destroyed (a vital section reached 0),
 * ship:changed (anything changed: the HUD redraws), ship:loaded.
 *
 * Its emergencies (leaks, water, fire: Prompt 6) are `this.hazards`
 * (./HazardState.js), its air room by room (Prompt 7) is `this.air`
 * (./AirState.js), and the Grand Stenchmasters' pressure (Prompt 8) is
 * `this.pressure` (./PressureState.js), and the captain's Stink Beard
 * (Prompt 9) is `this.beard` (./BeardState.js), all saved and checkpointed
 * with it, and all moved by one clock: `tick()`.
 */
const SEEN_LIMIT = 128;
/** Event ids a save and a checkpoint keep (all of them: at most SEEN_LIMIT). */
const SAVED_EVENTS = SEEN_LIMIT;

export class ShipState {
  constructor({ def = null, hazards = null, air = null, pressure = null, bus = null } = {}) {
    this.def = def;
    this.bus = bus;
    this.hp = new Map();
    // Damage events already applied (saved and checkpointed, the latest SAVED_EVENTS), and repairs under way (per play).
    this.seen = new Set();
    this.locks = new Set();
    this.thresholds = [...(def?.thresholds ?? [])].sort((a, b) => b.min - a.min);
    this.hazards = new HazardState({ ship: this, def: hazards, bus });
    this.air = new AirState({ ship: this, def: air, bus });
    this.pressure = new PressureState({ ship: this, def: pressure, bus });
    this.beard = new BeardState({ ship: this, bus });
    this.reset();
  }

  /** Something to move on the hazard clock: an emergency, anything in the air, a Grand Stenchmaster under pressure, or a beard holding something. */
  get envActive() {
    return this.hazards.active || this.air.active || this.air.smokeToCome() || this.pressure.active || this.beard.active;
  }

  /**
   * One step of hazard time for everything environmental, in order: the
   * pressure (buildup, and an eruption's damage, blast and gas source), the
   * leaks, water and fire, then the air (which pours the sources, reads the
   * fires' smoke, moves the gas and lets the captain breathe: through his
   * beard, which takes its share then), then the beard's own second (its
   * conditions, the overload countdown and a purge, which pours into the air
   * from the next second). The one clock: the world calls it while the
   * captain is free, the emergency work tick by tick, `hazardClock` on
   * purpose. Returns true if anything moved.
   */
  tick(tuning) {
    const p = this.pressure.tick(tuning);
    const a = this.hazards.tick(tuning);
    const b = this.air.tick(tuning);
    const c = this.beard.tick(tuning);
    return p || a || b || c;
  }

  get ids() {
    return Object.keys(this.def?.sections ?? {}).filter((k) => !k.startsWith('//'));
  }

  has(id) {
    return !!this.def?.sections?.[id] && !id.startsWith('//');
  }

  /** Every section at full integrity. */
  reset() {
    this.hp.clear();
    for (const id of this.ids) this.hp.set(id, this.def.sections[id].max);
  }

  /** One section's condition: integrity, percentage, threshold, whether it works and how well. */
  section(id) {
    if (!this.has(id)) return null;
    const def = this.def.sections[id];
    const hp = this.hp.get(id);
    const t = thresholdFor(this.thresholds, hp, def.max);
    return {
      id,
      name: def.name,
      hp,
      max: def.max,
      pct: Math.round((hp / def.max) * 100),
      state: t.id,
      label: t.label,
      note: t.note ?? '',
      operational: t.operational !== false,
      efficiency: t.efficiency ?? (hp > 0 ? 1 : 0),
      vital: !!def.vital,
      function: def.function ?? null,
      functionLabel: def.functionLabel ?? null,
      repairable: def.repairable !== false,
      rooms: [...(def.rooms ?? [])],
    };
  }

  sections() {
    return this.ids.map((id) => this.section(id));
  }

  /** The whole ship: the sum of its sections, and whether a vital one is gone. */
  overall() {
    let hp = 0;
    let max = 0;
    for (const id of this.ids) {
      hp += this.hp.get(id);
      max += this.def.sections[id].max;
    }
    const t = thresholdFor(this.thresholds, hp, max || 1);
    const damaged = this.sections().filter((s) => s.hp < s.max);
    return { hp, max, pct: max ? Math.round((hp / max) * 100) : 100, state: t.id, label: t.label, destroyed: this.destroyed, damaged: damaged.length, worst: damaged.sort((a, b) => a.hp / a.max - b.hp / b.max)[0] ?? null };
  }

  /** True when a vital section (the hull) is at 0: the ship is lost. The game has no defeat for it yet (ship:destroyed is the hook). */
  get destroyed() {
    return this.ids.some((id) => this.def.sections[id].vital && this.hp.get(id) <= 0);
  }

  isOperational(id) {
    return this.section(id)?.operational ?? false;
  }

  efficiency(id) {
    return this.section(id)?.efficiency ?? 0;
  }

  stateOf(id) {
    return this.section(id)?.state ?? null;
  }

  /** True when every section is at full integrity (the HUD stays hidden). */
  get pristine() {
    return this.ids.every((id) => this.hp.get(id) >= this.def.sections[id].max);
  }

  /** True when nothing is wrong at all: every section whole, no hazard (leak, water, fire, buckets carried), clean air, every opening at its default, no pressure in play, the beard system never used. */
  get untouched() {
    return this.pristine && !this.hazards.any && !this.air.active && !Object.keys(this.air.links).length && this.pressure.untouched && this.beard.untouched;
  }

  /**
   * Damages one section. `req`:
   *   section, amount (before scaling), category, source, event (a story
   *   event or challenge id), eventId (applied once), tuning (the
   *   difficulty's ship tuning: damageScale, grace), scale (false: the amount
   *   is final), challengeState / authorized (see the class comment),
   *   breach (true: this blow may hole the hull, opening a leak into `room`
   *   or the section's own; Prompt 6), exact (true: a hazard's tick, already
   *   scaled and resisted: applied as given)
   * Returns what happened; `ok: false` changes nothing.
   */
  applyDamage(req = {}) {
    const { section, category = 'impact', source = null, event = null, eventId = null, tuning = null, scale = true, challengeState = null, authorized = false, breach = false, room = null, exact = false } = req;
    const fail = (reason) => ({ ok: false, reason, section, category, applied: 0 });
    if (!this.has(section)) return fail('unknown section');
    if (!this.def.categories?.[category]) return fail('unknown category');
    const amount = Number(req.amount);
    if (!Number.isFinite(amount) || amount <= 0) return fail('invalid amount');
    if (challengeState === 'resolved' && !authorized) return fail('challenge already resolved');
    if (!this.claimEvent(eventId)) return fail('duplicate event');
    const def = this.def.sections[section];
    const resist = exact ? 1 : def.resist?.[category] ?? 1;
    const k = exact ? 1 : (scale ? tuning?.damageScale ?? 1 : 1) * resist;
    const before = this.hp.get(section);
    const from = this.section(section);
    if (k <= 0) return { ok: true, reason: 'immune', section, category, source, event, requested: amount, applied: 0, before, after: before, from: from.state, to: from.state, crossed: false, destroyed: this.destroyed };
    let applied = Math.max(1, Math.round(amount * k));
    let after = Math.max(0, before - applied);
    // Grace: one blow can't take a section that is still holding straight to nothing.
    const holding = from.state !== 'critical' && from.state !== 'disabled';
    if ((tuning?.grace ?? true) && holding && after === 0 && before > 1) after = 1;
    applied = before - after;
    const wasDestroyed = this.destroyed;
    this.hp.set(section, after);
    const to = this.section(section);
    const result = { ok: true, section, category, source, event, requested: amount, applied, before, after, max: def.max, from: from.state, to: to.state, crossed: from.state !== to.state, destroyed: this.destroyed, becameDestroyed: !wasDestroyed && this.destroyed };
    this.announce('ship:damaged', result, from, to);
    // A blow that may hole the hull opens (or worsens, or tears open) a leak as bad as the section's condition now allows.
    if (breach) result.leak = this.hazards.onBreach(result, room);
    return result;
  }

  /** Restores a section (a scripted fix, or a repair's result). Clamped to the maximum. */
  restore(section, amount, { source = null } = {}) {
    if (!this.has(section)) return { ok: false, reason: 'unknown section', section, restored: 0 };
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return { ok: false, reason: 'invalid amount', section, restored: 0 };
    const def = this.def.sections[section];
    const before = this.hp.get(section);
    const from = this.section(section);
    const after = Math.min(def.max, before + Math.round(n));
    this.hp.set(section, after);
    const to = this.section(section);
    const result = { ok: true, section, source, restored: after - before, before, after, max: def.max, from: from.state, to: to.state, crossed: from.state !== to.state, destroyed: this.destroyed };
    this.announce('ship:restored', result, from, to);
    // A sounder section leaks less, and stops once it's sound enough (the water already in stays).
    this.hazards.onSectionRestored(section);
    return result;
  }

  /**
   * A repair's commitment: takes `items` from `inventory` (all or nothing)
   * and then restores `restore` to the section. If anything is missing,
   * nothing is taken and nothing restored.
   */
  commitRepair({ section, restore = 0, items = [], inventory, source = 'repair' }) {
    if (!this.has(section)) return { ok: false, reason: 'unknown section', section };
    const need = sumItems(items);
    const missing = need.filter((c) => inventory.count(c.item) < c.count).map((c) => ({ ...c, have: inventory.count(c.item) }));
    if (missing.length) return { ok: false, reason: 'materials', section, missing };
    const taken = [];
    for (const c of need) {
      if (!inventory.remove(c.item, c.count)) {
        for (const t of taken) inventory.add(t.item, t.count);
        return { ok: false, reason: 'materials', section, missing: [{ ...c, have: inventory.count(c.item) }] };
      }
      taken.push(c);
    }
    const r = restore > 0 ? this.restore(section, restore, { source }) : { ok: true, section, restored: 0, before: this.hp.get(section), after: this.hp.get(section) };
    return { ...r, spent: taken };
  }

  /**
   * Records an event id (a damage callback, a scripted leak or fire); false
   * if it was already applied. No id: always new (a hazard's own ticks never
   * repeat, so they don't need one).
   */
  claimEvent(id) {
    if (id === null || id === undefined) return true;
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    if (this.seen.size > SEEN_LIMIT) this.seen.delete(this.seen.values().next().value);
    return true;
  }

  /** One repair at a time per section (repeated input can't start two). */
  lock(section) {
    if (this.locks.has(section)) return false;
    this.locks.add(section);
    return true;
  }

  unlock(section) {
    this.locks.delete(section);
  }

  isLocked(section) {
    return this.locks.has(section);
  }

  announce(type, result, from, to) {
    if (!this.bus) return;
    this.bus.emit(type, result);
    if (from.state !== to.state) this.bus.emit('ship:threshold', { section: result.section, from: from.state, to: to.state, direction: to.hp < from.hp ? 'down' : 'up' });
    if (result.becameDestroyed) this.bus.emit('ship:destroyed', { section: result.section });
    this.bus.emit('ship:changed', { section: result.section });
  }

  serialize() {
    return { sections: Object.fromEntries(this.ids.map((id) => [id, this.hp.get(id)])), hazards: this.hazards.serialize(), air: this.air.serialize(), pressure: this.pressure.serialize(), beard: this.beard.serialize(), events: [...this.seen].slice(-SAVED_EVENTS) };
  }

  /**
   * From a save (or a checkpoint). A missing ship (a save from before
   * version 18) or a missing section is at full integrity; an unknown
   * section is dropped with a warning; a damaged number is clamped.
   */
  load(state, onWarning = () => {}) {
    this.reset();
    // The damage events already applied (a save from before version 19 has none) and the emergencies (none: nothing invented).
    this.seen = new Set(asArray(state?.events).filter((e) => typeof e === 'string').slice(-SAVED_EVENTS));
    const sections = isPlainObject(state?.sections) ? state.sections : {};
    for (const [id, v] of Object.entries(sections)) {
      if (!this.has(id)) {
        onWarning(`ship: dropped unknown section "${id}"`);
        continue;
      }
      const max = this.def.sections[id].max;
      const n = Number(v);
      if (!Number.isFinite(n)) {
        onWarning(`ship: section "${id}" had no number; it is whole again`);
        continue;
      }
      this.hp.set(id, Math.max(0, Math.min(max, Math.round(n))));
    }
    this.hazards.load(state?.hazards, onWarning);
    // The air (a save from before version 20 has none: clean everywhere, nothing invented).
    this.air.load(state?.air, onWarning);
    // The pressure (a save from before version 21 has none: every subject off, nothing pending, nothing invented).
    this.pressure.load(state?.pressure, onWarning);
    // The beard (a save from before version 22 has none: off and clean; the old beard tags are the story's, never read as contamination).
    this.beard.load(state?.beard, onWarning);
    this.bus?.emit('ship:loaded', {});
    this.bus?.emit('hazard:changed', {});
    this.bus?.emit('ship:changed', { section: null });
  }
}
