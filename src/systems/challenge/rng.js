/**
 * Seeded randomness for challenges: an attempt's random choices (where the
 * timing bar's green lands, when a gust comes) follow from the challenge id
 * and the attempt number, so an attempt can be replayed exactly in tests,
 * and a retry is a fresh but reproducible attempt rather than a re-roll the
 * player can't reason about. Legacy challenges keep Math.random.
 */

/** A 32-bit FNV-1a hash of a string. */
export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32: a small, fast, good-enough generator. Returns () => [0, 1). */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The seed for one attempt of one challenge. */
export function attemptSeed(id, attempt, salt = 0) {
  return hashString(`${id}#${attempt}#${salt}`);
}
