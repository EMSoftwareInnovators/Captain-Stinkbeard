import { isPlainObject, asArray } from '../../core/util.js';
import { SHIP_TUNING_DEFAULTS } from './integrity.js';
import { evaluateCondition } from '../conditions/conditions.js';
import {
  supplyData,
  classOf,
  storeDef,
  storeIds,
  sourceDef,
  sourceIds,
  sourceYields,
  restockSeconds,
  cooldownSeconds,
  recipeDef,
  recipeIds,
  recipeKnown,
  effectDef,
  effectIds,
  gearDef,
  gearIds,
  supplyLimits,
  storesFor,
  scaleYield,
} from './supplies.js';

/**
 * The ship's supplies (overhaul Prompt 10, docs/gameplay-overhaul/14-resources-and-cooking.md):
 * `ship.supplies`, saved with the ship (save version 23) and captured by
 * challenge checkpoints (the "ship" domain). Off until a script switches it
 * on; no chapter does.
 *
 * What it holds: the stores' stock, each source's state (what is left, its
 * restock and cooldown clocks, opened), the timed effects of food and
 * draughts, the pot on the stove, how wet the cloth is, and the recipes a
 * script taught. What is worn is the beard's list (`ship.beard.worn`, saved
 * with it since version 22): one list of worn gear, read here for slots and
 * charges and by the beard for its own effects.
 *
 * What it guarantees:
 *   - every transaction (a deposit, a withdrawal, a source taken, a bill
 *     paid, a pot served) is whole or nothing: no negative count, nothing
 *     taken twice, nothing made from nothing
 *   - a source gives what is left of it, once per use: leaving the room,
 *     reloading or retrying never refills it (its state is saved and
 *     checkpointed; only its restock, on the hazard clock, does)
 *   - a key item is never stored, spent or cooked
 *   - an effect always ends, one per group, never stacking past the limits
 *   - nothing here runs every frame: the hazard clock moves it
 */
export class SupplyState {
  constructor({ ship = null, bus = null } = {}) {
    this.ship = ship;
    this.bus = bus;
    // The session (set by GameSession): the content, the pack, the party, where the captain is.
    this.session = null;
    this.tuning = SHIP_TUNING_DEFAULTS;
    this.reset();
  }

  reset() {
    this.on = false;
    this.stores = {};
    this.sources = {};
    this.effects = {};
    this.cooking = null;
    this.charges = {};
    this.learned = [];
  }

  get content() {
    return this.session?.content ?? null;
  }

  get data() {
    return supplyData(this.content);
  }

  get inventory() {
    return this.session?.inventory ?? null;
  }

  /** Nothing has ever been asked of it. */
  get untouched() {
    return !this.on && !Object.keys(this.stores).length && !Object.keys(this.sources).length && !Object.keys(this.effects).length && !this.cooking && !Object.keys(this.charges).length && !this.learned.length;
  }

  /** Something to move on the hazard clock: an effect running, a pot on, a restock or cooldown counting, a wet cloth worn. */
  get active() {
    if (!this.on || !this.data) return false;
    if (Object.keys(this.effects).length || this.cooking) return true;
    if (Object.values(this.sources).some((s) => (s.restockIn ?? 0) > 0 || (s.cooldown ?? 0) > 0)) return true;
    return this.wornCharged().length > 0;
  }

  changed(what = 'supplies') {
    this.bus?.emit('supplies:changed', { what });
    // The world redraws its line and Respond from the state (as for the hazards and the beard).
    this.bus?.emit('hazard:changed', {});
  }

  notice(key, text, tone = 'w') {
    this.bus?.emit('hazard:notice', { key, text, tone });
  }

  // --- the stores ------------------------------------------------------------

  storeCount(store, item) {
    return this.stores[store]?.[item] ?? 0;
  }

  storeTotal(store) {
    return Object.values(this.stores[store] ?? {}).reduce((n, q) => n + q, 0);
  }

  /** The stock of a store, by item (sorted by class then name). */
  storeItems(store) {
    return Object.entries(this.stores[store] ?? {})
      .filter(([, q]) => q > 0)
      .map(([item, count]) => ({ item, count, cls: classOf(this.content, item) }));
  }

  /** Why an item can't go into a store (null when it can). */
  storeRefusal(store, item, n) {
    const s = storeDef(this.content, store);
    if (!s) return `No store "${store}".`;
    const def = this.content.items?.get?.(item);
    if (!def) return `No item "${item}".`;
    if (def.type === 'key') return `${def.name} stays with you.`;
    const cls = classOf(this.content, item);
    if (!cls || !asArray(s.accepts).includes(cls)) return `${def.name} doesn't go in ${s.label}.`;
    if (!(Number.isInteger(n) && n >= 1)) return 'Nothing to move.';
    if (this.storeTotal(store) + n > s.capacity) return `${s.label.replace(/^the /, 'The ')} ${this.storeTotal(store) >= s.capacity ? 'are full' : `have room for ${s.capacity - this.storeTotal(store)} more`}.`;
    return null;
  }

  /** What the pack can still take of an item. */
  packRoom(item) {
    const inv = this.inventory;
    const def = this.content?.items?.get?.(item);
    if (!inv || !def) return 0;
    return Math.max(0, inv.maxStack(def) - inv.count(item));
  }

  /** From the pack into a store: whole or nothing. */
  deposit(store, item, n = 1) {
    const why = this.storeRefusal(store, item, n);
    if (why) return { ok: false, reason: why };
    const inv = this.inventory;
    if (!inv || inv.count(item) < n) return { ok: false, reason: `You don't have ${n} ${this.itemName(item)}.` };
    if (!inv.remove(item, n)) return { ok: false, reason: `You don't have ${n} ${this.itemName(item)}.` };
    this.stores[store] = { ...(this.stores[store] ?? {}), [item]: this.storeCount(store, item) + n };
    this.changed('stores');
    return { ok: true, item, count: n };
  }

  /** From a store into the pack: whole or nothing. */
  withdraw(store, item, n = 1) {
    if (!storeDef(this.content, store)) return { ok: false, reason: `No store "${store}".` };
    if (!(Number.isInteger(n) && n >= 1)) return { ok: false, reason: 'Nothing to move.' };
    if (this.storeCount(store, item) < n) return { ok: false, reason: `The stores don't have ${n} ${this.itemName(item)}.` };
    if (this.packRoom(item) < n) return { ok: false, reason: `You can't carry ${n} more ${this.itemName(item)}.` };
    this.unstock(store, item, n);
    this.inventory.add(item, n);
    this.changed('stores');
    return { ok: true, item, count: n };
  }

  /** A script puts stock straight into a store (no pack involved): within capacity, or nothing. */
  stock(store, item, n) {
    const why = this.storeRefusal(store, item, n);
    if (why) return { ok: false, reason: why };
    this.stores[store] = { ...(this.stores[store] ?? {}), [item]: this.storeCount(store, item) + n };
    this.changed('stores');
    return { ok: true, item, count: n };
  }

  /** Takes stock out of a store (no pack involved): all of it or nothing. */
  unstock(store, item, n) {
    if (!(Number.isInteger(n) && n >= 1) || this.storeCount(store, item) < n) return { ok: false, reason: `The stores don't have ${n} ${this.itemName(item)}.` };
    const left = this.storeCount(store, item) - n;
    const next = { ...this.stores[store] };
    if (left > 0) next[item] = left;
    else delete next[item];
    if (Object.keys(next).length) this.stores[store] = next;
    else delete this.stores[store];
    this.changed('stores');
    return { ok: true, item, count: n };
  }

  /**
   * What an action ("cook") can draw on from a room: the pack, then the
   * stores it may spend from there. count(item) is the sum.
   */
  reach(action, room) {
    const stores = storesFor(this.content, action, room);
    return { stores, count: (item) => (this.inventory?.count(item) ?? 0) + stores.reduce((n, s) => n + this.storeCount(s, item), 0) };
  }

  /**
   * Pays a bill from the pack first, then the stores an action may spend
   * from a room: all of it or nothing. Returns where it came from.
   */
  spend(bill, action, room) {
    const { stores, count } = this.reach(action, room);
    const need = new Map();
    for (const c of asArray(bill)) need.set(c.item, (need.get(c.item) ?? 0) + (c.count ?? 1));
    for (const [item, n] of need) {
      if (this.content?.items?.get?.(item)?.type === 'key') return { ok: false, reason: `${this.itemName(item)} is never spent.` };
      if (count(item) < n) return { ok: false, reason: `Not enough ${this.itemName(item)}.` };
    }
    const from = [];
    for (const [item, n] of need) {
      let left = n;
      const fromPack = Math.min(left, this.inventory.count(item));
      if (fromPack > 0) {
        this.inventory.remove(item, fromPack);
        from.push({ item, count: fromPack, from: 'pack' });
        left -= fromPack;
      }
      for (const s of stores) {
        if (left <= 0) break;
        const k = Math.min(left, this.storeCount(s, item));
        if (k > 0) {
          this.unstock(s, item, k);
          from.push({ item, count: k, from: s });
          left -= k;
        }
      }
    }
    this.changed('spend');
    return { ok: true, from };
  }

  itemName(item) {
    return this.content?.items?.get?.(item)?.name ?? item;
  }

  // --- the sources -----------------------------------------------------------

  /** A source's state: what is left of it (Infinity for a recovery), its clocks, whether it is open. */
  sourceState(id) {
    const def = sourceDef(this.content, id);
    if (!def) return null;
    const s = this.sources[id] ?? {};
    return {
      left: def.type === 'recovery' ? Infinity : s.left ?? def.uses ?? 1,
      restockIn: s.restockIn ?? 0,
      cooldown: s.cooldown ?? 0,
      open: s.open ?? !def.closed,
      taken: s.taken ?? 0,
    };
  }

  /** Whether a source can be taken from now (and why not). */
  available(id) {
    const def = sourceDef(this.content, id);
    if (!def) return { ok: false, reason: `No source "${id}".` };
    const st = this.sourceState(id);
    if (!st.open || (def.when !== undefined && this.session && !evaluateCondition(def.when, this.session))) return { ok: false, reason: `Nothing to be had from ${def.label} yet.` };
    if (st.cooldown > 0) return { ok: false, reason: `${cap(def.label)}: picked clean for now (${st.cooldown}s).`, wait: st.cooldown };
    if (st.left <= 0) return { ok: false, reason: `${cap(def.label)}: nothing left${def.restock ? ` (more in ${st.restockIn}s)` : ''}.`, empty: true };
    return { ok: true, left: st.left };
  }

  /**
   * Takes one use of a source: its yields (for an outcome's share) into the
   * pack, whole or nothing (refused if the pack can't hold all of it, so
   * nothing is lost), then it is one use emptier (a recovery: its cooldown
   * starts). Returns what was found.
   */
  take(id, { share = 1, difficulty = 'captain' } = {}) {
    const ok = this.available(id);
    if (!ok.ok) return ok;
    const def = sourceDef(this.content, id);
    const found = sourceYields(this.content, id, difficulty, share);
    for (const y of found) if (this.packRoom(y.item) < y.count) return { ok: false, reason: `You can't carry ${y.count} more ${this.itemName(y.item)}.`, full: true };
    const s = { ...(this.sources[id] ?? {}) };
    if (def.type === 'recovery') s.cooldown = cooldownSeconds(def, this.tuning);
    else {
      s.left = this.sourceState(id).left - 1;
      if (def.restock && s.left < def.restock.max && !(s.restockIn > 0)) s.restockIn = restockSeconds(def, this.tuning);
    }
    s.taken = (s.taken ?? 0) + 1;
    this.sources[id] = s;
    for (const y of found) this.inventory.add(y.item, y.count);
    this.changed('sources');
    return { ok: true, items: found };
  }

  /** A script: open a closed source, empty one, or restock one (to full, or by n). */
  sourceOp(id, op, n = null) {
    const def = sourceDef(this.content, id);
    if (!def) return { ok: false, reason: `No source "${id}".` };
    const s = { ...(this.sources[id] ?? {}) };
    if (op === 'open') s.open = true;
    else if (op === 'deplete') {
      if (def.type === 'recovery') s.cooldown = cooldownSeconds(def, this.tuning);
      else {
        s.left = 0;
        if (def.restock && !(s.restockIn > 0)) s.restockIn = restockSeconds(def, this.tuning);
      }
    } else if (op === 'restock') {
      if (def.type === 'recovery') s.cooldown = 0;
      else {
        const full = def.uses ?? 1;
        s.left = Math.min(full, n === null ? full : this.sourceState(id).left + n);
        if (s.left >= (def.restock?.max ?? full)) delete s.restockIn;
      }
    } else return { ok: false, reason: `Unknown source op "${op}"` };
    this.sources[id] = s;
    this.changed('sources');
    return { ok: true };
  }

  // --- gear ------------------------------------------------------------------

  /** The worn list (the beard's, since save version 22), as it counts: gear the data knows, still in the pack. */
  wornGear() {
    const inv = this.inventory;
    const list = this.ship?.beard?.worn ?? [];
    return list.filter((item) => (gearDef(this.content, item) || this.content?.shipBeard?.equipment?.[item]) && (!inv || inv.count(item) > 0));
  }

  wornIn(slot) {
    return this.wornGear().find((item) => gearDef(this.content, item)?.slot === slot) ?? null;
  }

  /** How many seconds of use are left in a charged item (full until first used). */
  charge(item) {
    const c = gearDef(this.content, item)?.charges;
    if (!c) return null;
    return this.charges[item] ?? c.max;
  }

  /** A charged item worn out (the cloth dry): it gives nothing until recharged. Only while the system is on. */
  spent(item) {
    return this.on && this.charge(item) === 0;
  }

  wornCharged() {
    return this.wornGear().filter((item) => gearDef(this.content, item)?.charges && this.charge(item) > 0);
  }

  /**
   * Puts gear on, by hand: it must be gear (or the beard's), in the pack,
   * allowed with what else is worn; its slot's last occupant comes off.
   */
  equip(item) {
    const g = gearDef(this.content, item);
    const beardOnly = !g && this.content?.shipBeard?.equipment?.[item];
    if (!g && !beardOnly) return { ok: false, reason: `${this.itemName(item)} isn't something to wear.` };
    if ((this.inventory?.count(item) ?? 0) <= 0) return { ok: false, reason: `You don't have ${this.itemName(item)}.` };
    const worn = this.wornGear();
    if (worn.includes(item)) return { ok: true, label: this.itemName(item), already: true };
    if (g?.when !== undefined && this.session && !evaluateCondition(g.when, this.session)) return { ok: false, reason: `Not now.` };
    for (const other of worn) {
      const o = gearDef(this.content, other);
      if (asArray(g?.notWith).includes(other)) return { ok: false, reason: g.notWithReason };
      if (asArray(o?.notWith).includes(item)) return { ok: false, reason: o.notWithReason };
    }
    const replaced = g ? this.wornIn(g.slot) : null;
    const beard = this.ship.beard;
    beard.worn = beard.worn.filter((x) => x !== replaced);
    if (!beard.worn.includes(item)) beard.worn.push(item);
    beard.changed?.();
    this.changed('gear');
    return { ok: true, label: this.itemName(item), replaced };
  }

  unequip(item) {
    const beard = this.ship.beard;
    if (!beard.worn.includes(item)) return { ok: false, reason: `You aren't wearing ${this.itemName(item)}.` };
    beard.worn = beard.worn.filter((x) => x !== item);
    beard.changed?.();
    this.changed('gear');
    return { ok: true, label: this.itemName(item) };
  }

  /** Wets a charged item again (the cloth, at water): to full. */
  recharge(item) {
    const c = gearDef(this.content, item)?.charges;
    if (!c) return { ok: false, reason: `${this.itemName(item)} needs nothing.` };
    if ((this.inventory?.count(item) ?? 0) <= 0) return { ok: false, reason: `You don't have ${this.itemName(item)}.` };
    delete this.charges[item];
    this.changed('gear');
    return { ok: true, label: this.itemName(item) };
  }

  /** The share of a knock that gets through what he wears (the helmet). */
  knockFactor() {
    let k = 1;
    for (const item of this.wornGear()) if (typeof gearDef(this.content, item)?.knock === 'number') k *= gearDef(this.content, item).knock;
    return k;
  }

  // --- effects ---------------------------------------------------------------

  /** Starts a timed effect: one per group (a new one replaces the group's last), the same one again restarts its clock. */
  applyEffect(id, { tuning = this.tuning } = {}) {
    const def = effectDef(this.content, id);
    if (!def) return { ok: false, reason: `No effect "${id}".` };
    if (!this.on) return { ok: false, reason: 'off' };
    const lim = supplyLimits(this.content);
    const seconds = Math.max(1, Math.min(lim.seconds, Math.round(def.seconds * (tuning.effectScale ?? 1))));
    let replaced = null;
    for (const other of Object.keys(this.effects)) {
      if (other !== id && effectDef(this.content, other)?.group === def.group) {
        replaced = other;
        delete this.effects[other];
      }
    }
    const was = this.effects[id]?.left ?? 0;
    this.effects[id] = { left: Math.max(was, seconds) };
    this.changed('effects');
    return { ok: true, seconds: this.effects[id].left, replaced, refreshed: was > 0 };
  }

  removeEffect(id) {
    if (!this.effects[id]) return { ok: false };
    delete this.effects[id];
    this.changed('effects');
    return { ok: true };
  }

  effectList() {
    return Object.entries(this.effects).map(([id, e]) => ({ id, left: e.left, ...effectDef(this.content, id) }));
  }

  /**
   * The effects combined, within the limits: work and hurt multiply (never
   * below their floors), zone adds (never past its bound either way), lungs
   * is a draught's (the smallest; the world takes it with the Frog Grog
   * ward, the smaller, never on top). 1 (0 for zone) while off.
   */
  factor(key) {
    if (!this.on) return key === 'zone' ? 0 : 1;
    const lim = supplyLimits(this.content);
    const vals = this.effectList().map((e) => e[key]).filter((v) => typeof v === 'number');
    if (key === 'zone') return Math.max(-lim.zone, Math.min(lim.zone, vals.reduce((a, b) => a + b, 0)));
    if (key === 'lungs') return vals.length ? Math.max(lim.lungs, Math.min(...vals)) : 1;
    const product = vals.reduce((a, b) => a * b, 1);
    return Math.max(lim[key] ?? 0.5, product);
  }

  /** Minor recovery (garlic broth): clears up to `points` of the lungs' bad-air exposure, never more than the limit. */
  recover(points) {
    const lim = supplyLimits(this.content);
    const air = this.ship?.air;
    if (!air || !(air.exposure > 0)) return { ok: false, cleared: 0 };
    const n = Math.min(air.exposure, Math.max(0, Math.min(lim.recover, points)));
    air.exposure = Math.max(0, air.exposure - n);
    air.changed?.();
    return { ok: true, cleared: Math.round(n) };
  }

  // --- cooking ---------------------------------------------------------------

  knows(recipe) {
    return recipeKnown(this.content, recipe, this.learned);
  }

  learn(recipe) {
    if (!recipeDef(this.content, recipe)) return { ok: false, reason: `No recipe "${recipe}".` };
    if (!this.learned.includes(recipe)) this.learned.push(recipe);
    this.changed('recipes');
    return { ok: true };
  }

  /** The pot goes on: it simmers on the hazard clock, then can be served. One pot at a time. */
  startCooking(recipe, serves) {
    const r = recipeDef(this.content, recipe);
    if (!r) return { ok: false, reason: `No recipe "${recipe}".` };
    if (this.cooking) return { ok: false, reason: 'Something is already cooking.' };
    if (!(Number.isInteger(serves) && serves >= 1)) return { ok: false, reason: 'Nothing to serve.' };
    this.cooking = { recipe, serves, left: r.simmer ?? 0 };
    this.changed('cooking');
    return { ok: true };
  }

  get ready() {
    return !!this.cooking && this.cooking.left <= 0;
  }

  /** Serves the pot into the pack, once: refused (nothing lost) if not ready or the pack is full. */
  serve() {
    const c = this.cooking;
    if (!c) return { ok: false, reason: 'Nothing is cooking.' };
    if (c.left > 0) return { ok: false, reason: `Not ready: ${c.left}s more.` };
    const product = recipeDef(this.content, c.recipe)?.product;
    if (!product) {
      this.cooking = null;
      return { ok: false, reason: 'Nothing to serve.' };
    }
    if (this.packRoom(product) < c.serves) return { ok: false, reason: `You can't carry ${c.serves} more ${this.itemName(product)}.` };
    this.cooking = null;
    this.inventory.add(product, c.serves);
    this.changed('cooking');
    return { ok: true, item: product, count: c.serves };
  }

  /** A script empties the pot (nothing served). */
  clearCooking() {
    this.cooking = null;
    this.changed('cooking');
  }

  // --- the clock -------------------------------------------------------------

  /**
   * One second of hazard time: effects run down (and end), sources restock
   * and recoveries come back, the pot simmers, and a charged item worn in
   * bad air uses a charge (the cloth dries). Returns true if anything moved.
   */
  tick(tuning = this.tuning) {
    if (!this.on || !this.data) return false;
    this.tuning = tuning;
    let moved = false;
    for (const [id, e] of Object.entries(this.effects)) {
      e.left -= 1;
      moved = true;
      if (e.left <= 0) {
        delete this.effects[id];
        const def = effectDef(this.content, id);
        this.notice(`supplies:effect:${id}:end`, `<k>${def?.label ?? id} wore off.</>`);
      }
    }
    for (const [id, s] of Object.entries(this.sources)) {
      const def = sourceDef(this.content, id);
      if (!def) continue;
      if (s.cooldown > 0) {
        s.cooldown -= 1;
        moved = true;
        if (s.cooldown <= 0) delete s.cooldown;
      }
      if (s.restockIn > 0 && def.restock) {
        if (def.restock.when !== undefined && this.session && !evaluateCondition(def.restock.when, this.session)) continue;
        s.restockIn -= 1;
        moved = true;
        if (s.restockIn <= 0) {
          const full = def.uses ?? 1;
          s.left = Math.min(def.restock.max, full, (s.left ?? full) + def.restock.add);
          delete s.restockIn;
          if (s.left < def.restock.max) s.restockIn = restockSeconds(def, tuning);
          if (s.left >= full) delete s.left;
        }
      }
    }
    if (this.cooking && this.cooking.left > 0) {
      this.cooking.left -= 1;
      moved = true;
      if (this.cooking.left === 0) this.notice('supplies:cooking:ready', `<g>${recipeDef(this.content, this.cooking.recipe)?.name ?? 'The pot'} is ready.</> <k>Serve it at the stove.</>`, 'g');
    }
    // The cloth dries while he breathes bad air through it.
    const room = this.session?.location?.map ?? null;
    const air = room ? this.ship?.air?.airIn?.(room) : null;
    if (air?.index > 0) {
      for (const item of this.wornCharged()) {
        const n = this.charge(item) - 1;
        this.charges[item] = Math.max(0, n);
        moved = true;
        if (n === 0) {
          const c = gearDef(this.content, item).charges;
          this.notice(`supplies:charges:${item}`, `<y>${cap(this.itemName(item))} is ${c.empty}.</> <k>Wet it again at water.</>`, 'y');
        }
      }
    }
    if (moved) this.changed('tick');
    return moved;
  }

  // --- saving ----------------------------------------------------------------

  /** Only what changed (sparse); nothing at all while it has never been used. Never a derived value. */
  serialize() {
    if (this.untouched) return {};
    const out = { on: this.on };
    if (Object.keys(this.stores).length) out.stores = Object.fromEntries(Object.entries(this.stores).map(([k, v]) => [k, { ...v }]));
    if (Object.keys(this.sources).length) out.sources = Object.fromEntries(Object.entries(this.sources).map(([k, v]) => [k, { ...v }]));
    if (Object.keys(this.effects).length) out.effects = Object.fromEntries(Object.entries(this.effects).map(([k, v]) => [k, { left: v.left }]));
    if (this.cooking) out.cooking = { ...this.cooking };
    if (Object.keys(this.charges).length) out.charges = { ...this.charges };
    if (this.learned.length) out.learned = [...this.learned];
    return out;
  }

  /**
   * From a save or a checkpoint. A save from before version 23 has none:
   * off, empty stores, every source as the data has it, nothing invented.
   * Unknown stores, items, sources, effects and recipes are dropped with a
   * warning; counts are whole and clamped; nothing replays.
   */
  load(state, onWarning = () => {}) {
    this.reset();
    if (!isPlainObject(state) || !this.data) return;
    const content = this.content;
    const lim = supplyLimits(content);
    const whole = (v, lo, hi) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.round(Number(v)))) : null);
    this.on = state.on === true;
    for (const [store, stock] of Object.entries(isPlainObject(state.stores) ? state.stores : {})) {
      const def = storeDef(content, store);
      if (!def || !isPlainObject(stock)) {
        onWarning(`supplies: dropped store "${store}"`);
        continue;
      }
      for (const [item, q] of Object.entries(stock)) {
        const n = whole(q, 0, lim.give);
        const idef = content.items?.get?.(item);
        if (!idef || idef.type === 'key' || n === null) {
          onWarning(`supplies: dropped "${item}" from ${store}`);
          continue;
        }
        if (n > 0) this.stores[store] = { ...(this.stores[store] ?? {}), [item]: n };
      }
      if (this.storeTotal(store) > def.capacity) onWarning(`supplies: ${store} holds more than its capacity (kept; nothing more goes in)`);
    }
    for (const [id, s] of Object.entries(isPlainObject(state.sources) ? state.sources : {})) {
      const def = sourceDef(content, id);
      if (!def || !isPlainObject(s)) {
        onWarning(`supplies: dropped source "${id}"`);
        continue;
      }
      const o = {};
      if (def.type !== 'recovery' && s.left !== undefined) {
        const n = whole(s.left, 0, def.uses ?? 1);
        if (n !== null && n < (def.uses ?? 1)) o.left = n;
      }
      if (def.restock && s.restockIn !== undefined) {
        const n = whole(s.restockIn, 0, def.restock.every * 2);
        if (n) o.restockIn = n;
      }
      if (def.type === 'recovery' && s.cooldown !== undefined) {
        const n = whole(s.cooldown, 0, def.cooldown * 2);
        if (n) o.cooldown = n;
      }
      if (s.open === true) o.open = true;
      const t = whole(s.taken, 0, 1e6);
      if (t) o.taken = t;
      if (Object.keys(o).length) this.sources[id] = o;
    }
    for (const [id, e] of Object.entries(isPlainObject(state.effects) ? state.effects : {})) {
      const n = isPlainObject(e) ? whole(e.left, 1, lim.seconds) : null;
      if (!effectDef(content, id) || n === null) {
        onWarning(`supplies: dropped effect "${id}"`);
        continue;
      }
      this.effects[id] = { left: n };
    }
    // One per group, even from a damaged save.
    const groups = new Set();
    for (const id of Object.keys(this.effects)) {
      const g = effectDef(content, id).group;
      if (groups.has(g)) {
        delete this.effects[id];
        onWarning(`supplies: dropped effect "${id}" (one per group)`);
      }
      groups.add(g);
    }
    if (isPlainObject(state.cooking)) {
      const r = recipeDef(content, state.cooking.recipe);
      const serves = r ? whole(state.cooking.serves, 1, r.serves?.success ?? 1) : null;
      if (!r || serves === null) onWarning(`supplies: dropped the pot ("${state.cooking.recipe}")`);
      else this.cooking = { recipe: state.cooking.recipe, serves, left: whole(state.cooking.left, 0, (r.simmer ?? 0) * 2) ?? 0 };
    }
    for (const [item, q] of Object.entries(isPlainObject(state.charges) ? state.charges : {})) {
      const c = gearDef(content, item)?.charges;
      const n = c ? whole(q, 0, c.max) : null;
      if (n === null) {
        onWarning(`supplies: dropped charges for "${item}"`);
        continue;
      }
      if (n < c.max) this.charges[item] = n;
    }
    for (const id of asArray(state.learned)) {
      if (!recipeDef(content, id)) onWarning(`supplies: dropped recipe "${id}"`);
      else if (!this.learned.includes(id)) this.learned.push(id);
    }
  }
}

const cap = (s) => String(s).replace(/^./, (c) => c.toUpperCase());

export { storeIds, sourceIds, recipeIds, effectIds, gearIds, scaleYield };
