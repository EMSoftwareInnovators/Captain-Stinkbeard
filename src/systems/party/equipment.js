import { EQUIPMENT_SLOTS, STAT_KEYS } from '../../config/constants.js';

/**
 * Equipment rules shared by menus, scripts and tests.
 * Equipping moves an item out of the inventory onto the character; the item it
 * replaces goes back into the inventory.
 */

export function canEquip(character, itemDef) {
  if (!itemDef || itemDef.type !== 'equipment') return false;
  if (!EQUIPMENT_SLOTS.includes(itemDef.slot)) return false;
  if (Array.isArray(itemDef.equipBy) && !itemDef.equipBy.includes(character.id)) return false;
  return true;
}

export function equip(character, itemId, inventory) {
  const def = inventory.def(itemId);
  if (!canEquip(character, def)) throw new Error(`${character.id} cannot equip "${itemId}"`);
  if (!inventory.has(itemId)) throw new Error(`"${itemId}" is not in the inventory`);
  const slot = def.slot;
  const previous = character.equipment[slot];
  inventory.remove(itemId, 1);
  if (previous) inventory.add(previous, 1);
  character.equipment[slot] = itemId;
  character.clampHp();
  return previous;
}

export function unequip(character, slot, inventory) {
  const current = character.equipment[slot];
  if (!current) return null;
  const def = inventory.def(current);
  if (def.locked) return null; // e.g. story-bound gear
  inventory.add(current, 1);
  character.equipment[slot] = null;
  character.clampHp();
  return current;
}

/** Stat differences if `itemId` (or nothing, when null) were equipped in `slot`. */
export function previewEquip(character, slot, itemId, items) {
  const before = character.stats();
  const saved = character.equipment[slot];
  character.equipment[slot] = itemId;
  const after = character.stats();
  character.equipment[slot] = saved;
  const diff = {};
  for (const k of STAT_KEYS) diff[k] = after[k] - before[k];
  return { before, after, diff };
}

/** Inventory items that fit `slot` for this character. */
export function equippableItems(character, slot, inventory) {
  return inventory.entries({ type: 'equipment', filter: (def) => def.slot === slot && canEquip(character, def) });
}
