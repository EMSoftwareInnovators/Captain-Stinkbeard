/**
 * Ordered id → record lookup for one kind of content (items, enemies, ...).
 * Keeps definition order (menus list things in authoring order) and remembers
 * which file each record came from so validation errors point at the source.
 */
export class Registry {
  constructor(kind) {
    this.kind = kind;
    this.map = new Map();
    this.sources = new Map();
    this.duplicates = [];
  }

  add(id, record, source = '?') {
    if (typeof id !== 'string' || !id) {
      this.duplicates.push(`${source}: ${this.kind} record without a valid "id"`);
      return;
    }
    if (this.map.has(id)) {
      this.duplicates.push(`${source}: duplicate ${this.kind} id "${id}" (first defined in ${this.sources.get(id)})`);
      return;
    }
    this.map.set(id, record);
    this.sources.set(id, source);
  }

  get(id) {
    return this.map.get(id);
  }

  require(id) {
    const rec = this.map.get(id);
    if (!rec) throw new Error(`Unknown ${this.kind} "${id}"`);
    return rec;
  }

  has(id) {
    return this.map.has(id);
  }

  list() {
    return [...this.map.values()];
  }

  ids() {
    return [...this.map.keys()];
  }

  sourceOf(id) {
    return this.sources.get(id);
  }

  get size() {
    return this.map.size;
  }
}
