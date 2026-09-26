import { asArray } from '../../core/util.js';

/**
 * Effects shared by items and abilities, in and out of battle.
 *
 *   { "type": "heal", "amount": 30 }            restore HP (flat)
 *   { "type": "heal", "percent": 50 }           restore % of max HP
 *   { "type": "revive", "percent": 25 }         revive a knocked-out target
 *   { "type": "cure", "status": "sickened" }    remove statuses ("debuffs" = all negative)
 *   { "type": "applyStatus", "status": "braced", "duration": 3, "chance": 1 }
 *   { "type": "restore", "resource": "command", "amount": 1 }
 *
 * A target implements: isAlive(), hp, maxHp, heal(n), and optionally
 * revive(n), addStatus(id, duration, source), removeStatus(id),
 * statusIds(), restoreResource(name, n). Characters in the field only support
 * HP effects; statuses exist only in battle.
 */
export const EFFECT_TYPES = ['heal', 'revive', 'cure', 'applyStatus', 'restore', 'damage'];

export function applyEffect(effect, target, { rng = null, statuses = null } = {}) {
  switch (effect.type) {
    case 'heal': {
      if (!target.isAlive()) return { type: 'heal', amount: 0, failed: true };
      const amount = effect.percent ? Math.ceil((target.maxHp * effect.percent) / 100) : effect.amount ?? 0;
      return { type: 'heal', amount: target.heal(amount) };
    }
    case 'revive': {
      if (target.isAlive()) return { type: 'revive', amount: 0, failed: true };
      const amount = Math.max(1, Math.ceil((target.maxHp * (effect.percent ?? 25)) / 100));
      if (target.revive) target.revive(amount);
      else target.hp = amount;
      return { type: 'revive', amount };
    }
    case 'cure': {
      if (!target.removeStatus || !target.statusIds) return { type: 'cure', removed: [] };
      const wanted = asArray(effect.status);
      const removed = [];
      for (const id of target.statusIds()) {
        const def = statuses?.get(id);
        const match = wanted.includes(id) || (wanted.includes('debuffs') && def?.kind === 'debuff');
        if (match && target.removeStatus(id)) removed.push(id);
      }
      return { type: 'cure', removed };
    }
    case 'applyStatus': {
      if (!target.addStatus || !target.isAlive()) return { type: 'status', status: effect.status, applied: false };
      const chance = effect.chance ?? 1;
      if (chance < 1 && rng && !rng.chance(chance)) return { type: 'status', status: effect.status, applied: false, resisted: true };
      target.addStatus(effect.status, effect.duration ?? null);
      return { type: 'status', status: effect.status, applied: true };
    }
    case 'restore': {
      if (!target.restoreResource) return { type: 'restore', amount: 0 };
      return { type: 'restore', resource: effect.resource, amount: target.restoreResource(effect.resource, effect.amount ?? 1) };
    }
    default:
      throw new Error(`Unknown effect type "${effect.type}"`);
  }
}

export function applyEffects(effects, target, opts) {
  return asArray(effects).map((e) => applyEffect(e, target, opts));
}

/**
 * Whether using an item on a target would do anything. Used by menus to avoid
 * wasting consumables ("It would have no effect.").
 */
export function wouldAffect(effects, target) {
  return asArray(effects).some((e) => {
    switch (e.type) {
      case 'heal':
        return target.isAlive() && target.hp < target.maxHp;
      case 'revive':
        return !target.isAlive();
      case 'cure':
        return !!target.statusIds && target.statusIds().some((id) => asArray(e.status).includes(id) || asArray(e.status).includes('debuffs'));
      case 'applyStatus':
        return target.isAlive() && !!target.addStatus;
      case 'restore':
        return !!target.restoreResource;
      default:
        return false;
    }
  });
}

/** Item usable in a context ('field' | 'battle')? */
export function itemUsableIn(itemDef, context) {
  return itemDef?.type === 'consumable' && asArray(itemDef.use?.context ?? ['field', 'battle']).includes(context);
}
