/**
 * Small deterministic PRNG (xorshift32).
 *
 * Deterministic so battles can be unit-tested with fixed seeds, and simple
 * enough to reimplement bit-for-bit on 16/32-bit retro CPUs.
 */
export class Rng {
  constructor(seed = Date.now()) {
    this.setSeed(seed);
  }

  setSeed(seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    this.state = s;
  }

  /** Next raw unsigned 32-bit value. */
  nextU32() {
    let x = this.state;
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    this.state = x;
    return x;
  }

  /** Float in [0, 1). */
  next() {
    return this.nextU32() / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** True with probability p (0..1). */
  chance(p) {
    return this.next() < p;
  }

  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  /** Pick an element using numeric weights: [{ weight, ...}] */
  weighted(list, weightKey = 'weight') {
    const total = list.reduce((sum, item) => sum + (item[weightKey] ?? 1), 0);
    let roll = this.next() * total;
    for (const item of list) {
      roll -= item[weightKey] ?? 1;
      if (roll < 0) return item;
    }
    return list[list.length - 1];
  }
}

/** Stable 32-bit hash of integers/strings; used for deterministic visual variation. */
export function hash32(...parts) {
  let h = 2166136261 >>> 0;
  for (const part of parts) {
    const str = String(part);
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= 0x2c; // separator
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
