import { MAX_GOLD, MAX_ITEM_STACK } from '../../config/constants.js';
import { clamp } from '../../core/util.js';

/**
 * Party inventory: item counts plus gold.
 *
 * Equipped gear lives on characters, not here; the inventory only holds spare
 * copies. Unknown item ids throw, because a typo in content should never
 * silently hand the player nothing.
 */
export class Inventory {
  constructor({ items, bus = null }) {
    this.defs = items; // Registry of item definitions
    this.bus = bus;
    this.gold = 0;
    this.counts = new Map();
  }

  def(id) {
    const def = this.defs.get(id);
    if (!def) throw new Error(`Unknown item "${id}"`);
    return def;
  }

  count(id) {
    return this.counts.get(id) || 0;
  }

  has(id, n = 1) {
    return this.count(id) >= n;
  }

  maxStack(def) {
    return def.type === 'key' ? 1 : def.maxStack ?? MAX_ITEM_STACK;
  }

  /** Adds items, clamped to the stack limit. Returns how many were actually added. */
  add(id, n = 1) {
    const def = this.def(id);
    if (n <= 0) return 0;
    const before = this.count(id);
    const after = clamp(before + n, 0, this.maxStack(def));
    this.counts.set(id, after);
    const added = after - before;
    if (added > 0) this.bus?.emit('inventory:changed', { id, count: after, delta: added });
    return added;
  }

  remove(id, n = 1) {
    this.def(id);
    const before = this.count(id);
    if (before < n || n <= 0) return false;
    const after = before - n;
    if (after === 0) this.counts.delete(id);
    else this.counts.set(id, after);
    this.bus?.emit('inventory:changed', { id, count: after, delta: -n });
    return true;
  }

  addGold(n) {
    const before = this.gold;
    this.gold = clamp(this.gold + Math.floor(n), 0, MAX_GOLD);
    if (this.gold !== before) this.bus?.emit('gold:changed', { gold: this.gold, delta: this.gold - before });
    return this.gold - before;
  }

  spendGold(n) {
    if (n < 0 || this.gold < n) return false;
    this.addGold(-n);
    return true;
  }

  /**
   * Lists owned items in content-definition order, optionally filtered.
   * @param {{type?: string, filter?: (def) => boolean}} opts
   */
  entries({ type = null, filter = null } = {}) {
    const out = [];
    for (const def of this.defs.list()) {
      const count = this.count(def.id);
      if (count <= 0) continue;
      if (type && def.type !== type) continue;
      if (filter && !filter(def)) continue;
      out.push({ id: def.id, def, count });
    }
    return out;
  }

  serialize() {
    return { gold: this.gold, items: Object.fromEntries([...this.counts.entries()].sort(([a], [b]) => a.localeCompare(b))) };
  }

  /** Loads saved data; unknown ids are dropped and reported through `onWarning`. */
  load(data = {}, onWarning = console.warn) {
    this.gold = clamp(Math.floor(data.gold || 0), 0, MAX_GOLD);
    this.counts = new Map();
    for (const [id, count] of Object.entries(data.items || {})) {
      if (!this.defs.has(id)) {
        onWarning(`Save references unknown item "${id}" — dropped.`);
        continue;
      }
      const n = Math.floor(count);
      if (n > 0) this.counts.set(id, Math.min(n, this.maxStack(this.defs.get(id))));
    }
  }
}
