/**
 * Key/value storage adapter. Uses localStorage when available and falls back
 * to memory (private browsing, blocked storage, tests) without crashing.
 */
export class MemoryStorage {
  constructor() {
    this.data = new Map();
    this.persistent = false;
  }
  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
  removeItem(key) {
    this.data.delete(key);
  }
}

export function createStorage() {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return new MemoryStorage();
    const probe = '__cs_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      persistent: true,
      getItem: (k) => ls.getItem(k),
      setItem: (k, v) => ls.setItem(k, v),
      removeItem: (k) => ls.removeItem(k),
    };
  } catch {
    console.warn('Browser storage unavailable — saves will not persist this session.');
    return new MemoryStorage();
  }
}
