import { STORAGE_PREFIX } from '../../config/constants.js';

export const TEXT_SPEEDS = ['slow', 'normal', 'fast', 'instant'];
/** Milliseconds per character for the typewriter at each speed. */
export const TEXT_SPEED_MS = { slow: 45, normal: 26, fast: 12, instant: 0 };
export const SCALE_MODES = ['integer', 'fit'];
export const SHAKE_LEVELS = ['full', 'reduced', 'off'];
export const EFFECT_LEVELS = ['full', 'reduced'];
/** Fume hazard difficulty (accessibility): how fast thick fumes build exposure. */
export const FUME_HAZARD_LEVELS = ['normal', 'gentle', 'off'];
export const FUME_HAZARD_SCALE = { normal: 1, gentle: 0.5, off: 0 };

/** Multiplier applied to every screen shake for each setting. */
export const SHAKE_SCALE = { full: 1, reduced: 0.35, off: 0 };

export const DEFAULT_SETTINGS = Object.freeze({
  masterVolume: 0.8,
  musicVolume: 0.7,
  ambienceVolume: 0.7,
  sfxVolume: 0.8,
  textSpeed: 'normal',
  textSound: true,
  screenShake: 'full',
  effects: 'full',
  fumeHazard: 'normal',
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
  screenShake: (v) => SHAKE_LEVELS.includes(v),
  effects: (v) => EFFECT_LEVELS.includes(v),
  fumeHazard: (v) => FUME_HAZARD_LEVELS.includes(v),
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
      // Older versions stored screen shake as on/off.
      if (typeof parsed.screenShake === 'boolean') parsed.screenShake = parsed.screenShake ? 'full' : 'off';
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

  /** Scale for screen shakes (0 when shaking is off). */
  shakeScale() {
    return SHAKE_SCALE[this.values.screenShake] ?? 1;
  }

  /** True when the player asked for calmer visuals (fewer particles, softer flashes). */
  reducedEffects() {
    return this.values.effects === 'reduced';
  }

  /** Multiplier on fume exposure (0 = fumes never make the captain collapse). */
  fumeScale() {
    return FUME_HAZARD_SCALE[this.values.fumeHazard] ?? 1;
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
