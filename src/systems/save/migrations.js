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

  /**
   * 2 → 3 (Story Phase 3: The Grand Stenchmaster)
   * The state's shape is unchanged; what's new lives in keys a Phase 2 build
   * doesn't know (the Stench Log's read/announced entries in world state,
   * Frog Grog in the inventory, the Phase 3 flags and quests). The bump is
   * what stops an older build loading a Phase 3 save and quietly dropping
   * them. The captain's name and Garrick's title are derived from flags, so
   * nothing needs renaming here.
   * Defaults are filled defensively: a Phase 2 save starts with no log
   * bookkeeping and no Phase 3 flags, and walks into chapter 9 on load.
   */
  2: (state) => ({
    ...state,
    story: {
      ...state.story,
      flags: Array.isArray(state.story?.flags) ? state.story.flags : [],
      vars: state.story?.vars ?? {},
    },
    world: {
      ...state.world,
      objects: state.world?.objects ?? {},
      visited: state.world?.visited ?? [],
      counters: state.world?.counters ?? {},
    },
  }),

  /**
   * 3 → 4 (Story Phase 4: The Stench Forecast)
   * Story state gains named text values ("values"), used for where the Dead
   * Center is today. A Phase 3 save has none: the Center is nowhere in
   * particular until the story puts it somewhere. Everything else Phase 4
   * adds (the sash, the forecast board, the bell protocol, Squawks's seven
   * feathers, the hull's damage) follows flags and variables, which start
   * unset, so a finished Phase 3 save walks into chapter 15 on load.
   */
  3: (state) => ({
    ...state,
    story: {
      ...state.story,
      flags: Array.isArray(state.story?.flags) ? state.story.flags : [],
      vars: state.story?.vars ?? {},
      values: state.story?.values && typeof state.story.values === 'object' ? state.story.values : {},
    },
  }),

  /**
   * 4 -> 5 (Story Phase 5: What Does the Grand Stenchmaster Actually Do?)
   * The layout is unchanged. Phase 5 keeps its state in flags (the
   * Stenchmaster Entertainment System, the suit, the station, Squawks fully
   * bald, the emergency labour rule) and variables (the set's channel and
   * power: ses_channel, ses_power), which start unset, so a finished Phase 4
   * save walks into chapter 20 on load. Shark Duty in progress is per-play
   * and never saved. The bump stops a Phase 4 build from loading a Phase 5
   * save and silently dropping its quests; missing fields are filled.
   */
  4: (state) => ({
    ...state,
    story: {
      ...state.story,
      flags: Array.isArray(state.story?.flags) ? state.story.flags : [],
      vars: state.story?.vars && typeof state.story.vars === 'object' ? state.story.vars : {},
      values: state.story?.values && typeof state.story.values === 'object' ? state.story.values : {},
    },
    world: {
      ...state.world,
      objects: state.world?.objects ?? {},
      visited: state.world?.visited ?? [],
      counters: state.world?.counters ?? {},
    },
  }),
  /**
   * 5 -> 6 (Story Phase 6: the Death Rattle of the S.E.S. and the Midnight
   * Stenchmaster Catastrophe). The layout is unchanged again. The S.E.S.'s
   * condition, the Great Sharkstorm's state and distance are story values;
   * the bulk Frog Grog stores are a variable (barrels, separate from the
   * captain's own bottles, which are never touched); the food ban, the
   * suit's wear and the ship's new damage are flags. A finished Phase 5 save
   * walks into chapter 25 on load. Missing fields are filled.
   */
  5: (state) => ({
    ...state,
    story: {
      ...state.story,
      flags: Array.isArray(state.story?.flags) ? state.story.flags : [],
      vars: state.story?.vars && typeof state.story.vars === 'object' ? state.story.vars : {},
      values: state.story?.values && typeof state.story.values === 'object' ? state.story.values : {},
    },
    inventory: state.inventory && typeof state.inventory === 'object' ? state.inventory : { gold: 0, items: {} },
  }),
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
