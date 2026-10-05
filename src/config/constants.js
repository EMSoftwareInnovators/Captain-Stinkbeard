// Global engine constants. Content never needs to change these.

/** Internal render resolution (pixels). 320x224 matches common 16-bit output modes. */
export const SCREEN_WIDTH = 320;
export const SCREEN_HEIGHT = 224;

/** World grid size in pixels. Every map, collision cell and movement step uses it. */
export const TILE_SIZE = 16;

/** Save-data schema version. Bump when the save format changes and add a migration. */
export const SAVE_VERSION = 10;

/** Namespace for all browser-storage keys. */
export const STORAGE_PREFIX = 'captain-stinkbeard';

/** Manual save slots (1-based ids) plus one autosave slot. */
export const MANUAL_SAVE_SLOTS = [1, 2, 3];
export const AUTOSAVE_SLOT = 'auto';

/** Facing directions in a fixed order (also the order of sprite-sheet rows). */
export const DIRECTIONS = ['down', 'left', 'right', 'up'];

export const DIR_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE_DIR = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** Equipment slots, in menu order. */
export const EQUIPMENT_SLOTS = ['weapon', 'body', 'feet', 'accessory'];

/** Stats every character and enemy has. */
export const STAT_KEYS = ['maxHp', 'attack', 'defense', 'speed', 'luck'];

export const STAT_LABELS = {
  maxHp: 'Max HP',
  attack: 'Attack',
  defense: 'Defense',
  speed: 'Speed',
  luck: 'Luck',
};

export const ITEM_TYPES = ['consumable', 'equipment', 'key'];

export const MAX_ITEM_STACK = 99;
export const MAX_GOLD = 999999;
