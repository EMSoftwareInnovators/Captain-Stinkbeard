import { clamp } from '../../core/util.js';

/**
 * Battle math. Everything is integer arithmetic on purpose: it is easy to
 * reason about, deterministic with a seeded RNG, and portable to 16-bit CPUs
 * (see docs/RETRO_PORT_NOTES.md).
 *
 *   base   = attack * power / 100
 *   raw    = base - defense / 2            (never below base / 8, never below 1)
 *   spread = raw * (100 ± 8) / 100
 *   crit   = spread * 3 / 2
 *   timed  = * timing multiplier (e.g. 1.5 on PERFECT)
 *   final  = * target damageTaken multipliers (guarding 0.5, marked 1.5)
 */
export function computeDamage({ attack, defense, power = 100, rng, crit = false, timingMult = 1, takenMult = 1, variance = 8 }) {
  const base = Math.floor((attack * power) / 100);
  let raw = base - Math.floor(defense / 2);
  raw = Math.max(raw, Math.floor(base / 8), 1);
  const spread = rng ? rng.int(100 - variance, 100 + variance) : 100;
  let dmg = Math.floor((raw * spread) / 100);
  if (crit) dmg = Math.floor((dmg * 3) / 2);
  dmg = Math.floor(dmg * timingMult);
  dmg = Math.floor(dmg * takenMult);
  return Math.max(1, dmg);
}

/** Crit chance in percent: 4% + luck/4 + ability bonus, capped at 30%. */
export function critChance(luck, bonus = 0) {
  return clamp(4 + Math.floor(luck / 4) + bonus, 0, 30);
}

/** Hit chance in percent from ability accuracy and the luck difference. */
export function hitChance(accuracy, userLuck, targetLuck) {
  return clamp(accuracy + Math.floor((userLuck - targetLuck) / 2), 50, 100);
}

/** Flee chance in percent; each failed attempt makes the next one easier. */
export function fleeChance(partySpeed, enemySpeed, attempts) {
  return clamp(50 + (partySpeed - enemySpeed) * 4 + attempts * 20, 10, 95);
}
