/**
 * Minimal synchronous publish/subscribe hub.
 *
 * Game systems talk to each other through named events instead of direct
 * references (e.g. the quest system listens for 'npc:talked' rather than the
 * NPC code knowing about quests). Handlers run in subscription order.
 */
export class EventBus {
  constructor() {
    this.handlers = new Map();
  }

  /** Subscribe; returns an unsubscribe function. */
  on(event, handler, context = null) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    const entry = { handler, context, once: false };
    this.handlers.get(event).push(entry);
    return () => this.off(event, handler, context);
  }

  once(event, handler, context = null) {
    const off = this.on(event, handler, context);
    const list = this.handlers.get(event);
    list[list.length - 1].once = true;
    return off;
  }

  off(event, handler, context = null) {
    const list = this.handlers.get(event);
    if (!list) return;
    const idx = list.findIndex((e) => e.handler === handler && e.context === context);
    if (idx >= 0) list.splice(idx, 1);
  }

  emit(event, payload) {
    const list = this.handlers.get(event);
    if (!list || list.length === 0) return;
    // Copy so handlers may unsubscribe while we iterate.
    for (const entry of [...list]) {
      if (entry.once) this.off(event, entry.handler, entry.context);
      entry.handler.call(entry.context, payload);
    }
  }

  clear() {
    this.handlers.clear();
  }
}
