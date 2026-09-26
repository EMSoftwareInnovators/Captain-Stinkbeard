/**
 * Level/XP rules driven by data/progression/leveling.json:
 *
 *   { "maxLevel": 30, "totalXp": [0, 20, 55, ...] }
 *
 * totalXp[n] is the cumulative XP needed to *reach* level n+1. Keeping it a
 * plain table (instead of a formula) makes tuning and retro ports trivial.
 */
export class Progression {
  constructor(data) {
    if (!data || !Array.isArray(data.totalXp) || data.totalXp.length < 2) {
      throw new Error('leveling data needs a totalXp table');
    }
    this.table = data.totalXp;
    this.maxLevel = Math.min(data.maxLevel ?? this.table.length, this.table.length);
  }

  /** Total XP required to reach `level`. */
  xpForLevel(level) {
    if (level <= 1) return 0;
    return this.table[Math.min(level, this.maxLevel) - 1];
  }

  levelForXp(xp) {
    let level = 1;
    while (level < this.maxLevel && xp >= this.xpForLevel(level + 1)) level++;
    return level;
  }

  /** XP still needed to reach the next level (0 at max level). */
  xpToNext(level, xp) {
    if (level >= this.maxLevel) return 0;
    return Math.max(0, this.xpForLevel(level + 1) - xp);
  }
}
