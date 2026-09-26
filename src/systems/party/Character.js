import { EQUIPMENT_SLOTS, STAT_KEYS } from '../../config/constants.js';
import { clamp } from '../../core/util.js';

/**
 * A playable party member (runtime state + derived stats).
 *
 * Definition data (data/characters/*.json) supplies base stats, per-level
 * growth, learnable abilities and starting gear. Runtime state is level, XP,
 * current HP, equipped items and learned abilities — exactly what is saved.
 */
export class Character {
  constructor(def, { progression, items }) {
    this.def = def;
    this.progression = progression;
    this.items = items;
    this.id = def.id;
    this.level = def.startLevel ?? 1;
    this.xp = progression.xpForLevel(this.level);
    this.equipment = Object.fromEntries(EQUIPMENT_SLOTS.map((s) => [s, def.startEquipment?.[s] ?? null]));
    this.abilities = [];
    this.learnUpTo(this.level);
    this.hp = this.maxHp;
  }

  get name() {
    return this.def.name;
  }

  /** Base stat from definition + growth (floored so all stats stay integers). */
  baseStat(key) {
    const base = this.def.baseStats?.[key] ?? 0;
    const growth = this.def.growth?.[key] ?? 0;
    return Math.floor(base + growth * (this.level - 1));
  }

  equipmentBonus(key) {
    let bonus = 0;
    for (const slot of EQUIPMENT_SLOTS) {
      const itemId = this.equipment[slot];
      if (!itemId) continue;
      bonus += this.items.get(itemId)?.stats?.[key] ?? 0;
    }
    return bonus;
  }

  stat(key) {
    const value = this.baseStat(key) + this.equipmentBonus(key);
    return Math.max(key === 'maxHp' ? 1 : 0, value);
  }

  stats() {
    return Object.fromEntries(STAT_KEYS.map((k) => [k, this.stat(k)]));
  }

  get maxHp() {
    return this.stat('maxHp');
  }

  isAlive() {
    return this.hp > 0;
  }

  heal(amount) {
    const before = this.hp;
    this.hp = clamp(this.hp + Math.floor(amount), 0, this.maxHp);
    return this.hp - before;
  }

  fullHeal() {
    this.hp = this.maxHp;
  }

  /** Keeps HP valid after max HP changes (equipment swaps, level ups). */
  clampHp() {
    this.hp = clamp(this.hp, 0, this.maxHp);
  }

  learnUpTo(level) {
    const learned = [];
    for (const entry of this.def.learnset || []) {
      if (entry.level <= level && !this.abilities.includes(entry.ability)) {
        this.abilities.push(entry.ability);
        learned.push(entry.ability);
      }
    }
    return learned;
  }

  xpToNext() {
    return this.progression.xpToNext(this.level, this.xp);
  }

  /**
   * Adds XP and applies any level ups.
   * @returns {Array<{level:number, gains:Object, learned:string[]}>}
   */
  gainXp(amount) {
    const results = [];
    if (amount <= 0) return results;
    this.xp += Math.floor(amount);
    let target = this.progression.levelForXp(this.xp);
    while (this.level < target) {
      const before = Object.fromEntries(STAT_KEYS.map((k) => [k, this.baseStat(k)]));
      const hpRatioMissing = this.maxHp - this.hp;
      this.level += 1;
      const gains = {};
      for (const k of STAT_KEYS) {
        const diff = this.baseStat(k) - before[k];
        if (diff) gains[k] = diff;
      }
      // Level ups restore the gained max HP (common RPG convention), not a full heal.
      this.hp = clamp(this.maxHp - hpRatioMissing, 1, this.maxHp);
      const learned = this.learnUpTo(this.level);
      results.push({ level: this.level, gains, learned });
    }
    return results;
  }

  setLevel(level) {
    const clamped = clamp(level, 1, this.progression.maxLevel);
    this.level = clamped;
    this.xp = this.progression.xpForLevel(clamped);
    this.learnUpTo(clamped);
    this.clampHp();
  }

  serialize() {
    return {
      id: this.id,
      level: this.level,
      xp: this.xp,
      hp: this.hp,
      equipment: { ...this.equipment },
      abilities: [...this.abilities],
    };
  }

  load(data, onWarning = console.warn) {
    this.level = clamp(Math.floor(data.level || 1), 1, this.progression.maxLevel);
    this.xp = Math.max(this.progression.xpForLevel(this.level), Math.floor(data.xp || 0));
    for (const slot of EQUIPMENT_SLOTS) {
      const itemId = data.equipment?.[slot] ?? null;
      if (itemId && !this.items.has(itemId)) {
        onWarning(`Save references unknown equipment "${itemId}" — unequipped.`);
        this.equipment[slot] = null;
      } else {
        this.equipment[slot] = itemId;
      }
    }
    this.abilities = Array.isArray(data.abilities) ? [...data.abilities] : [];
    this.learnUpTo(this.level);
    this.hp = clamp(Math.floor(data.hp ?? this.maxHp), 0, this.maxHp);
  }
}
