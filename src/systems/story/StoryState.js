/**
 * Central story state: named boolean flags, named integer variables, and
 * named text values (Story Phase 4: where the Dead Center is today).
 *
 *   story.has('met_first_mate')
 *   story.set('met_first_mate')
 *   story.clear('met_first_mate')
 *   story.setValue('dead_center', 'galley_table')   // null clears it
 *
 * Flags are declared in data/story/flags/*.json. When `knownFlags` is given and
 * `strict` is on (development), touching an undeclared flag throws so typos
 * are caught immediately instead of silently creating new state.
 */
export class StoryState {
  constructor({ bus = null, knownFlags = null, strict = false } = {}) {
    this.bus = bus;
    this.knownFlags = knownFlags; // Set<string> | null
    this.strict = strict;
    this.flags = new Set();
    this.vars = new Map();
    this.values = new Map();
  }

  checkFlag(flag) {
    if (typeof flag !== 'string' || flag.length === 0) {
      throw new Error(`Invalid story flag: ${JSON.stringify(flag)}`);
    }
    if (this.knownFlags && !this.knownFlags.has(flag)) {
      const msg = `Undeclared story flag "${flag}" (declare it in data/story/flags/)`;
      if (this.strict) throw new Error(msg);
      console.warn(msg);
    }
  }

  has(flag) {
    return this.flags.has(flag);
  }

  set(flag) {
    this.checkFlag(flag);
    if (this.flags.has(flag)) return false;
    this.flags.add(flag);
    this.bus?.emit('story:flagSet', { flag });
    return true;
  }

  clear(flag) {
    this.checkFlag(flag);
    if (!this.flags.has(flag)) return false;
    this.flags.delete(flag);
    this.bus?.emit('story:flagCleared', { flag });
    return true;
  }

  toggle(flag) {
    return this.has(flag) ? (this.clear(flag), false) : (this.set(flag), true);
  }

  getVar(name, fallback = 0) {
    return this.vars.has(name) ? this.vars.get(name) : fallback;
  }

  setVar(name, value) {
    if (!Number.isFinite(value)) throw new Error(`Story var "${name}" must be a number`);
    const prev = this.getVar(name);
    this.vars.set(name, value);
    if (prev !== value) this.bus?.emit('story:varChanged', { name, value, prev });
  }

  addVar(name, delta) {
    this.setVar(name, this.getVar(name) + delta);
    return this.getVar(name);
  }

  getValue(name, fallback = null) {
    return this.values.has(name) ? this.values.get(name) : fallback;
  }

  /** Sets a text value; null (or '') clears it. */
  setValue(name, value) {
    if (value !== null && value !== undefined && typeof value !== 'string') throw new Error(`Story value "${name}" must be a string or null`);
    const prev = this.getValue(name);
    const next = value || null;
    if (next === null) this.values.delete(name);
    else this.values.set(name, next);
    if (prev !== next) this.bus?.emit('story:valueChanged', { name, value: next, prev });
  }

  allFlags() {
    return [...this.flags].sort();
  }

  serialize() {
    return {
      flags: this.allFlags(),
      vars: Object.fromEntries([...this.vars.entries()].sort(([a], [b]) => a.localeCompare(b))),
      values: Object.fromEntries([...this.values.entries()].sort(([a], [b]) => a.localeCompare(b))),
    };
  }

  load(data = {}) {
    this.flags = new Set(Array.isArray(data.flags) ? data.flags.filter((f) => typeof f === 'string') : []);
    this.vars = new Map(
      Object.entries(data.vars || {}).filter(([, v]) => Number.isFinite(v)),
    );
    this.values = new Map(
      Object.entries(data.values || {}).filter(([, v]) => typeof v === 'string' && v.length > 0),
    );
  }
}
