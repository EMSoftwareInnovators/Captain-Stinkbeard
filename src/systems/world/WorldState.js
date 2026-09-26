/**
 * Persistent per-map state that is not story-level: defeated field enemies,
 * opened chests, visited maps, per-NPC talk counters, hidden/moved objects.
 *
 * Object keys are "mapId:objectId" so each map's state is namespaced and a new
 * chapter's maps can never collide with older ones.
 */
export class WorldState {
  constructor({ bus = null } = {}) {
    this.bus = bus;
    this.objects = new Map(); // key -> { prop: value }
    this.visited = new Set();
    this.counters = new Map();
  }

  static key(mapId, objectId) {
    return `${mapId}:${objectId}`;
  }

  get(key, prop, fallback = undefined) {
    const entry = this.objects.get(key);
    return entry && prop in entry ? entry[prop] : fallback;
  }

  set(key, prop, value) {
    const entry = this.objects.get(key) || {};
    entry[prop] = value;
    this.objects.set(key, entry);
    this.bus?.emit('world:objectChanged', { key, prop, value });
  }

  clearObject(key) {
    this.objects.delete(key);
  }

  isDefeated(key) {
    return this.get(key, 'defeated', false) === true;
  }

  markDefeated(key) {
    this.set(key, 'defeated', true);
  }

  isOpened(key) {
    return this.get(key, 'opened', false) === true;
  }

  markOpened(key) {
    this.set(key, 'opened', true);
  }

  /** Records a map visit; returns true the first time. */
  visit(mapId) {
    if (this.visited.has(mapId)) return false;
    this.visited.add(mapId);
    return true;
  }

  hasVisited(mapId) {
    return this.visited.has(mapId);
  }

  getCounter(key) {
    return this.counters.get(key) || 0;
  }

  incrementCounter(key) {
    const next = this.getCounter(key) + 1;
    this.counters.set(key, next);
    return next;
  }

  serialize() {
    return {
      objects: Object.fromEntries(this.objects),
      visited: [...this.visited].sort(),
      counters: Object.fromEntries(this.counters),
    };
  }

  load(data = {}) {
    this.objects = new Map(Object.entries(data.objects || {}));
    this.visited = new Set(data.visited || []);
    this.counters = new Map(Object.entries(data.counters || {}));
  }
}
