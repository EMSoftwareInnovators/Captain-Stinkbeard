export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

export const deepClone = (value) =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value));

export const isPlainObject = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

export function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Promise that resolves after `ms` using the provided scheduler (defaults to setTimeout). */
export function delay(ms, schedule = setTimeout) {
  return new Promise((resolve) => schedule(resolve, ms));
}

/** Formats seconds as H:MM:SS for save slots and menus. */
export function formatPlayTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** FNV-1a checksum of a string, hex encoded. Used to detect corrupted saves. */
export function checksum(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Error type thrown for broken content so failures are easy to recognise. */
export class ContentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ContentError';
  }
}
