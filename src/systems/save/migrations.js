/**
 * Save migrations. Each entry upgrades a save *state* from version N to N+1.
 *
 * When the save format changes:
 *   1. bump SAVE_VERSION in src/config/constants.js
 *   2. add `MIGRATIONS[oldVersion] = (state) => newState` here
 *   3. add a test in tests/save.test.js with a fixture of the old format
 */
export const MIGRATIONS = {
  /**
   * 1 → 2 (Story Phase 2: Garrick Guzzlegut and the Cursed Treasure)
   * - The treasure hold was rebuilt larger for the new chapter: a save made
   *   inside it moves to the room's door so it never loads inside a wall.
   * - Story variables are always an object (older saves could omit them).
   * Everything else carries over: new story flags simply start unset, so a
   * finished prologue save walks straight into the new chapter.
   */
  1: (state) => {
    const next = { ...state, story: { ...state.story, vars: state.story?.vars ?? {} } };
    if (state.location?.map === 'treasure_hold') {
      next.location = { ...state.location, x: 9, y: 12, facing: 'up' };
    }
    return next;
  },
};

export function migrateState(state, fromVersion, toVersion, migrations = MIGRATIONS) {
  let current = state;
  for (let v = fromVersion; v < toVersion; v++) {
    const step = migrations[v];
    if (!step) throw new Error(`No save migration from version ${v} to ${v + 1}`);
    current = step(current);
  }
  return current;
}
