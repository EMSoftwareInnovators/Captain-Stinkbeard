import { STORAGE_PREFIX } from '../../config/constants.js';

export const TEXT_SPEEDS = ['slow', 'normal', 'fast', 'instant'];
/** Milliseconds per character for the typewriter at each speed. */
export const TEXT_SPEED_MS = { slow: 45, normal: 26, fast: 12, instant: 0 };
export const SCALE_MODES = ['integer', 'fit'];

export const DEFAULT_SETTINGS = Object.freeze({
  masterVolume: 0.8,
  musicVolume: 0.7,
  ambienceVolume: 0.7,
  sfxVolume: 0.8,
  textSpeed: 'normal',
  textSound: true,
  screenShake: true,
  scaleMode: 'integer',
  fullscreen: false,
  alwaysRun: false,
});

const VALIDATORS = {
  masterVolume: (v) => typeof v === 'number' && v >= 0 && v <= 1,
  musicVolume: (v) => typeof v === 'number' && v >= 0 && v <= 1,
  ambienceVolume: (v) => typeof v === 'number' && v >= 0 && v <= 1,
  sfxVolume: (v) => typeof v === 'number' && v >= 0 && v <= 1,
  textSpeed: (v) => TEXT_SPEEDS.includes(v),
  textSound: (v) => typeof v === 'boolean',
  screenShake: (v) => typeof v === 'boolean',
  scaleMode: (v) => SCALE_MODES.includes(v),
  fullscreen: (v) => typeof v === 'boolean',
  alwaysRun: (v) => typeof v === 'boolean',
};

/**
 * Player options, persisted separately from save files (they are per-device,
 * not per-playthrough). Invalid stored values fall back to defaults.
 */
export class Settings {
  constructor({ storage, bus = null, key = `${STORAGE_PREFIX}.settings` }) {
    this.storage = storage;
    this.bus = bus;
    this.key = key;
    this.values = { ...DEFAULT_SETTINGS };
    this.load();
  }

  load() {
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        if (VALIDATORS[k]?.(v)) this.values[k] = v;
      }
    } catch {
      console.warn('Settings were unreadable; using defaults.');
    }
  }

  persist() {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.values));
    } catch {
      console.warn('Could not persist settings.');
    }
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    if (!(key in DEFAULT_SETTINGS)) throw new Error(`Unknown setting "${key}"`);
    if (!VALIDATORS[key](value)) throw new Error(`Invalid value for setting "${key}": ${value}`);
    if (this.values[key] === value) return;
    this.values[key] = value;
    this.persist();
    this.bus?.emit('settings:changed', { key, value });
  }

  all() {
    return { ...this.values };
  }

  reset() {
    this.values = { ...DEFAULT_SETTINGS };
    this.persist();
    this.bus?.emit('settings:changed', { key: '*', value: null });
  }
}
