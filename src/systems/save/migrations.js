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
   * 1 → 2 (Story Phase 2: Garrick Grumblegut and the Cursed Treasure)
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
  /**
   * 6 -> 7 (Story Phase 7: the Great Sharkstorm returns; the Song of the
   * Grand Stenchmaster). The layout is unchanged. The storm's new states
   * (returning, active_near_ship) live in the same story value; the second
   * television (S.E.S. Mark II) keeps its condition, power and channel in
   * story values and variables of its own, beside the original's (which
   * keeps its history: shark_damaged, then wrecked). The torn cape, the
   * parade, the song and the Grand Sharkmaster are flags. A finished
   * Phase 6 save walks into chapter 33 from the captain's bed. Missing
   * fields are filled; nothing is removed (the captain's Frog Grog included).
   */
  6: (state) => ({
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
    inventory: state.inventory && typeof state.inventory === 'object' ? state.inventory : { gold: 0, items: {} },
  }),
  /**
   * 7 -> 8 (Story Phase 8: trapped below with Franklin; the Grand Nap). The
   * layout is unchanged. The old sleeping quarters (condemned), the barracks
   * in the lower hull, the bunks, the Grand Crown and its ban, the sash's
   * nickname and where it really came from are flags; the Grand
   * Stenchmaster's uncertain stomach is a story value (calm, rumbling,
   * false_alarm, possibly_building, unknown) that only ever drives noises
   * and dialogue: there is no release in it. A finished Phase 7 save walks
   * into chapter 42 from the crate next to Squawks. Missing fields are
   * filled; nothing is removed (the captain's Frog Grog included).
   */
  7: (state) => ({
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
    inventory: state.inventory && typeof state.inventory === 'object' ? state.inventory : { gold: 0, items: {} },
  }),
  /**
   * 8 -> 9 (Story Phase 9: the Completely Authentic History; Crownskull Isle;
   * the Grand Excavation; the Grand Treasure Catastrophe).
   * - Garrick's surname is Grumblegut. Early builds called him "Guzzlegut",
   *   and the flag for the first gust was "guzzlegut_gust": it becomes
   *   "grumblegut_gust" (names on screen come from the game's data, so
   *   nothing else needs renaming).
   * Everything Phase 9 adds (Crownskull Isle, Pete's mock title, the Crimson
   * Fortune's state, the crowned megalodon, the treasure-laden storm) is
   * flags and story values that start unset, so a finished Phase 8 save
   * walks into the morning after the Grand Nap. Missing fields are filled;
   * nothing is removed.
   */
  8: (state) => {
    const flags = Array.isArray(state.story?.flags) ? state.story.flags : [];
    const renamed = [...new Set(flags.map((f) => (f === 'guzzlegut_gust' ? 'grumblegut_gust' : f)))];
    return {
      ...state,
      story: {
        ...state.story,
        flags: renamed,
        vars: state.story?.vars && typeof state.story.vars === 'object' ? state.story.vars : {},
        values: state.story?.values && typeof state.story.values === 'object' ? state.story.values : {},
      },
      world: {
        ...state.world,
        objects: state.world?.objects ?? {},
        visited: state.world?.visited ?? [],
        counters: state.world?.counters ?? {},
      },
      inventory: state.inventory && typeof state.inventory === 'object' ? state.inventory : { gold: 0, items: {} },
    };
  },
  /**
   * 9 -> 10 (Story Phase 10: the Bling Bling King's prizes, the beans, the
   * Counter-Sharkstorm Initiative, and the Queen Anne's Revenge blown into
   * the Great Sharkstorm). The layout is unchanged.
   * - The Grumblegut rename runs again (it is idempotent): a save written by
   *   a build between the two can still carry "guzzlegut_gust", and a story
   *   value written as text can still carry the old surname.
   * Everything Phase 10 adds (the megalodon's alias and chain, the sash
   * holders, where the ship is, Garrick's charge, Brogath's and Rumpold's
   * unverified legends, the antenna) is flags and story values that start
   * unset, so a finished Phase 9 save walks onto Crownskull Isle the
   * moment after the Crimson Fortune went up. Missing fields are filled;
   * nothing is removed.
   */
  9: (state) => {
    const flags = Array.isArray(state.story?.flags) ? state.story.flags : [];
    const renamed = [...new Set(flags.map((f) => (f === 'guzzlegut_gust' ? 'grumblegut_gust' : f)))];
    const values = state.story?.values && typeof state.story.values === 'object' ? state.story.values : {};
    const fix = (v) => (typeof v === 'string' ? v.replace(/Guzzlegut/g, 'Grumblegut').replace(/GUZZLEGUT/g, 'GRUMBLEGUT').replace(/guzzlegut/g, 'grumblegut') : v);
    return {
      ...state,
      story: {
        ...state.story,
        flags: renamed,
        vars: state.story?.vars && typeof state.story.vars === 'object' ? state.story.vars : {},
        values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, fix(v)])),
      },
      world: {
        ...state.world,
        objects: state.world?.objects ?? {},
        visited: state.world?.visited ?? [],
        counters: state.world?.counters ?? {},
      },
      inventory: state.inventory && typeof state.inventory === 'object' ? state.inventory : { gold: 0, items: {} },
    };
  },
};

/**
 * Fills the layout's containers without touching what's in them (the later
 * phases add flags, variables and story values only, all of which start
 * unset). Used by the 10 -> 11, 11 -> 12 and 12 -> 13 steps.
 */
function fillLayout(state) {
  return {
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
    inventory: state.inventory && typeof state.inventory === 'object' ? state.inventory : { gold: 0, items: {} },
  };
}

Object.assign(MIGRATIONS, {
  /**
   * 10 -> 11 (Story Phase 11: the Grand Bedtime Argument). The layout is
   * unchanged. What the phase adds (the six-rope lamp, the lost book, the
   * Cheap-O-Rama sashes, the pocket booklet's condition, the sash-flutter
   * weakness, the conspiracy) is flags and story values that start unset, so
   * a finished Phase 10 save wakes inside the Great Sharkstorm at bedtime.
   * The booklet's condition reads as "new" until the story sets it.
   */
  10: (state) => fillLayout(state),
  /**
   * 11 -> 12 (Story Phase 12: the Thirty-Second Sash Trial). Unchanged layout.
   * The trial, the Grand Dice (always scripted, never rolled at random), the
   * suspension (`stenchmaster_suspension_active`, its duration and the hours
   * left), the sash's custody and the breakfast are flags, variables and
   * values that start unset: no suspension, sash where Garrick left it.
   */
  11: (state) => fillLayout(state),
  /**
   * 12 -> 13 (Story Phase 13: the Ancient Stenchmaster Delirium). Unchanged
   * layout. The quarters' new bedding, the sealed textile locker, the
   * standees (each a story value naming the spot the player chose; unset
   * means the first spot), the second S.E.S., its cable, the Stenchmaster
   * Channel, Stench-O-Vision and the captain's delirium are flags and
   * values. Delirium aliases are never saved: they follow the flags.
   */
  12: (state) => fillLayout(state),
});

export function migrateState(state, fromVersion, toVersion, migrations = MIGRATIONS) {
  let current = state;
  for (let v = fromVersion; v < toVersion; v++) {
    const step = migrations[v];
    if (!step) throw new Error(`No save migration from version ${v} to ${v + 1}`);
    current = step(current);
  }
  return current;
}
