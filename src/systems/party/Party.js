import { Character } from './Character.js';

/** Ordered list of active party members. The first member is the leader. */
export class Party {
  constructor({ characters, progression, items, bus = null }) {
    this.defs = characters; // registry of character definitions
    this.progression = progression;
    this.items = items;
    this.bus = bus;
    this.members = [];
  }

  create(id) {
    const def = this.defs.get(id);
    if (!def) throw new Error(`Unknown character "${id}"`);
    return new Character(def, { progression: this.progression, items: this.items });
  }

  add(id) {
    if (this.has(id)) return this.get(id);
    const member = this.create(id);
    this.members.push(member);
    this.bus?.emit('party:changed', { added: id });
    return member;
  }

  remove(id) {
    const idx = this.members.findIndex((m) => m.id === id);
    if (idx < 0) return false;
    this.members.splice(idx, 1);
    this.bus?.emit('party:changed', { removed: id });
    return true;
  }

  has(id) {
    return this.members.some((m) => m.id === id);
  }

  get(id) {
    return this.members.find((m) => m.id === id) || null;
  }

  leader() {
    return this.members[0] || null;
  }

  alive() {
    return this.members.filter((m) => m.isAlive());
  }

  healAll() {
    for (const m of this.members) m.fullHeal();
  }

  serialize() {
    return this.members.map((m) => m.serialize());
  }

  load(list = [], onWarning = console.warn) {
    this.members = [];
    for (const data of list) {
      if (!this.defs.has(data.id)) {
        onWarning(`Save references unknown character "${data.id}" — skipped.`);
        continue;
      }
      const member = this.create(data.id);
      member.load(data, onWarning);
      this.members.push(member);
    }
  }
}
