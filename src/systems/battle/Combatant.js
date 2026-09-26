import { clamp } from '../../core/util.js';

/**
 * A participant in one battle (party member or enemy).
 *
 * Stats are snapshotted at battle start; statuses apply multiplicative
 * modifiers on top. Party members copy HP back to their Character when the
 * battle ends.
 */
export class Combatant {
  constructor({ uid, side, name, def, stats, hp, abilities, statuses, character = null, resource = null, index = 0 }) {
    this.uid = uid; // unique within the battle ("p0", "e1", ...)
    this.side = side; // 'party' | 'enemy'
    this.name = name;
    this.def = def; // character or enemy definition
    this.baseStats = { ...stats };
    this.hp = clamp(hp, 0, stats.maxHp);
    this.abilities = abilities; // ability ids
    this.statusDefs = statuses; // registry
    this.statuses = new Map(); // id -> { turns, fresh }
    this.character = character;
    this.resource = resource ? { ...resource, current: resource.start ?? 0 } : null;
    this.index = index; // slot position for presentation
    this.actedThisTurn = false;
  }

  get maxHp() {
    return this.baseStats.maxHp;
  }

  isAlive() {
    return this.hp > 0;
  }

  /** Stat including status modifiers. Multipliers are applied in integer-friendly steps. */
  stat(key) {
    let value = this.baseStats[key] ?? 0;
    for (const id of this.statuses.keys()) {
      const mod = this.statusDefs.get(id)?.modifiers?.[key];
      if (mod !== undefined) value = Math.floor(value * mod);
    }
    return Math.max(0, value);
  }

  /** Product of all damageTaken multipliers (1 = normal). */
  damageTakenMultiplier() {
    let m = 1;
    for (const id of this.statuses.keys()) {
      const mod = this.statusDefs.get(id)?.modifiers?.damageTaken;
      if (mod !== undefined) m *= mod;
    }
    return m;
  }

  heal(amount) {
    if (!this.isAlive()) return 0;
    const before = this.hp;
    this.hp = clamp(this.hp + Math.floor(amount), 0, this.maxHp);
    return this.hp - before;
  }

  revive(amount) {
    if (this.isAlive()) return 0;
    this.hp = clamp(Math.floor(amount), 1, this.maxHp);
    return this.hp;
  }

  takeDamage(amount) {
    const dealt = Math.min(this.hp, Math.max(0, Math.floor(amount)));
    this.hp -= dealt;
    if (this.hp <= 0) this.statuses.clear();
    return dealt;
  }

  hasStatus(id) {
    return this.statuses.has(id);
  }

  statusIds() {
    return [...this.statuses.keys()];
  }

  addStatus(id, duration = null) {
    const def = this.statusDefs.get(id);
    if (!def) throw new Error(`Unknown status "${id}"`);
    const turns = duration ?? def.duration ?? 3;
    const existing = this.statuses.get(id);
    // Re-applying refreshes the duration rather than stacking.
    this.statuses.set(id, { turns: Math.max(turns, existing?.turns ?? 0), fresh: this.actedThisTurn });
  }

  removeStatus(id) {
    return this.statuses.delete(id);
  }

  restoreResource(name, amount) {
    if (!this.resource || this.resource.id !== name) return 0;
    const before = this.resource.current;
    this.resource.current = clamp(before + amount, 0, this.resource.max);
    return this.resource.current - before;
  }

  canAfford(cost = {}) {
    return Object.entries(cost).every(([res, n]) => !n || (this.resource?.id === res && this.resource.current >= n));
  }

  spend(cost = {}) {
    for (const [res, n] of Object.entries(cost)) {
      if (n && this.resource?.id === res) this.resource.current -= n;
    }
  }
}
