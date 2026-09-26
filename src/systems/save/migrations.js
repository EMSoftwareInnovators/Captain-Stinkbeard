/**
 * Save migrations. Each entry upgrades a save *state* from version N to N+1.
 *
 * When the save format changes:
 *   1. bump SAVE_VERSION in src/config/constants.js
 *   2. add `MIGRATIONS[oldVersion] = (state) => newState` here
 *   3. add a test in tests/save.test.js with a fixture of the old format
 */
export const MIGRATIONS = {
  // Example for the future:
  // 1: (state) => ({ ...state, story: { ...state.story, vars: state.story.vars ?? {} } }),
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
