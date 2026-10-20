# 00 · Project baseline

What exists today, measured from the repository at commit `fe6281d` (branch `claude/brave-darwin-g62wku`), before any overhaul work. Nothing in the repository was changed to produce this; the only new files are these planning documents.

## Stack

| Piece | Version / value | Where |
|---|---|---|
| Engine | Phaser 4.2.1 | `package.json`, `src/phaser/`, `src/scenes/` |
| Build | Vite 8.3.1 (one ES-module bundle) | `vite.config.*`, `npm run build` |
| Unit tests | Vitest 5.0.2 | `tests/*.test.js`, `npm test` |
| Browser tests | Playwright 1.63.0 | `e2e/*.spec.js`, `playwright.config.*`, `npm run e2e*` |
| Resolution | 320×224, 16×16 tiles, grid-stepped movement | `src/config/constants.js` |
| Save format | version 17, 3 manual slots + 1 autosave slot, checksums, migrations | `src/config/constants.js`, `src/systems/save/` |
| Package version | 0.10.0 (its description still says “Phase 1 foundation + Story Phases 2 to 7”, which is out of date) | `package.json` |

All art (characters, props, tiles, vistas, portraits) and all audio (a JavaScript chiptune synth) are generated procedurally in code; there are no image or audio asset files. `npm run export` writes Tiled maps and sprite sheets for porting (`tools/export-assets.mjs`).

## Architecture

`docs/ARCHITECTURE.md` is accurate and detailed. In short:

- **Engine-independent core** (runs in Node and in tests): `src/content/` (ContentDB, registries, `validateContent.js`, 1,655 lines), `src/systems/` (GameSession, story state, quests, inventory, party, battle engine, script runner, saves, hazards and the Phase 4–17 story systems), `src/maps/` (map compiler, pathfinding), `src/art/` (pixel painters), `src/audio/synth`, `src/core/` (EventBus, seeded RNG).
- **Presentation** (Phaser): `src/scenes/` (Boot, Title, World, Battle, Menu, GameOver, Overlay, Cinema, Debug), `src/world/` (the world stage, NPC brains, field enemies, fume/shark/storm layers, Shark Duty, stability runner, hornets, beard puffs), `src/ui/` (menus, panels, TV view, sash-tension view), `src/platform/` (input, storage, scaling).
- **Size**: 232 source files, about 56,500 lines. The largest are `WorldScene.js` (1,786), `validateContent.js` (1,655), `characterPainter.js` (1,593) and `commands.js` (993).
- **Content**: 557 JSON files (7.9 MB) under `data/`, all merged by `ContentDB`. Later phases extend earlier content without editing it: map **patches** prepend objects and append props; NPC **extend** records prepend dialogue.

## Systems that exist (extend these rather than rebuild)

| System | What it does today | Source |
|---|---|---|
| Game loop and world | Grid-stepped movement, collision, warps, inspect/talk interaction, live NPC restaging when flags change, squeezing past crowds | `src/scenes/WorldScene.js`, `src/world/` |
| Script runner | 109 command types (dialogue, choices, moves, spawns, camera, flags, quests, battles, minigames, presentation) | `src/systems/script/` |
| Story state | Declared flags (1,906), integer variables and text values; aliases | `src/systems/story/`, `data/story/flags/` |
| Quests | 223 quests; flag/event/visit/talk/inspect/defeat/obtain objectives; ordering (`after`) | `src/systems/quests/QuestSystem.js`, `data/quests/` |
| Story triggers | 173 condition → script triggers | `data/story/triggers/` |
| NPC placement | Per-room first-match placement rows, room guards, live restaging | `src/world/placements.js`, `src/world/NpcBrain.js` |
| NPC behaviour | `stand`, `wander`, `work`, `sit`, `routine` (scripted steps; used by only 6 placements) | `src/world/NpcBrain.js` |
| Field enemies | Visible enemies that wander and chase; touching starts a battle; catching one from behind gives the first blow | `src/world/FieldEnemy.js` |
| Battle | Turn-based with timed-hit input, abilities (22), statuses (17), party members, cardboard traits and stagger (Phase 17) | `src/systems/battle/`, `src/scenes/BattleScene.js`, `data/battle/timing.json` |
| Party and progression | 3 party characters, levels from an XP table (max 30), learnable abilities, 4 equipment slots | `src/systems/party/`, `data/progression/`, `data/characters/` |
| Inventory and items | 51 items (5 consumables, 9 equipment, 37 key items), gold, 3 shops | `src/systems/inventory/`, `data/items/`, `data/shops/` |
| Repair timing bar | Strike-on-the-green minigame with 38 variants (hull, shark, rope, helm, smother, brace, heave…), each leaning on a captain stat (Muscle, Hands, Footing) | `src/systems/repairKinds.js`, `src/scenes/OverlayScene.js` |
| Fumes / exposure | Fume zones (light, dense, dead), exposure meter, a non-fatal collapse that carries the captain out | `src/systems/hazards/fumes.js`, `src/world/FumeLayer.js` |
| Dead Center | The wandering cloud core, by named place | `src/systems/hazards/deadCenter.js` |
| Bell alarms | Escalating warning levels | `src/systems/hazards/alarms.js` |
| Sharks / Shark Duty | Real-time sharks on rail sections, pole strikes, escalating sessions | `src/systems/hazards/sharkDuty.js`, `src/world/SharkDuty.js`, `src/world/SharkLayer.js` |
| Great Sharkstorm | Storm state and visuals | `src/systems/hazards/sharkstorm.js`, `src/world/SharkstormLayer.js` |
| Course dial | Helm steering minigame | script command + overlay |
| S.E.S. television | Programmes, channels, knobs and power, possessed sets | `src/systems/tv/tv.js`, `src/ui/TvView.js`, `data/tv/` |
| Sash tension | Hold-and-ease timing (the Thirty-Second Trial) | `src/systems/tension.js`, `src/ui/SashTensionView.js` |
| Dice | The Grand Dice | `data/story/dice/` |
| Brogath Stability | Pressure that rises with embarrassment and falls with reassurance; incidents; meter | `src/systems/stability.js`, `src/world/StabilityRunner.js` |
| Bank, teller and currency | Teller window, deposits, Grand Currency, conversions, credit, appraisal | `src/systems/bank.js`, `src/systems/credit.js`, `data/story/bank/` |
| Proceedings | Forms, hearings and pitches | `src/systems/proceedings.js` |
| Atmosphere | One ship-wide air state with authored consequences (haze tint, NPC pace) | `src/systems/atmosphere.js`, `data/story/atmosphere.json` |
| Beard profile | Contamination tags as flags; beard puffs (Phase 17) | `src/systems/beard.js`, `src/world/BeardPuffs.js` |
| Fart Zone procedure | Ordered safety steps for a release | `src/systems/fartZone.js` |
| Hornets | Swarm state | `src/systems/hazards/hornets.js`, `src/world/HornetSwarm.js` |
| Saves | Slots, autosave on room entry and after field battles, migrations v1 → v17 | `src/systems/save/` |
| Game over | Only after a lethal battle; retry from the autosave | `src/scenes/GameOverScene.js` |
| Input | Keyboard plus gamepad; all bindings in one table; an in-game controller setup that learns a pad’s button layout (the Firefox/macOS fixes) | `src/platform/input/` |
| Debug | F2 overlay with tabs (crew, Brogath, lighter, mellowing), 353 presets, test hooks | `src/debug/`, `data/debug/presets.json` |

## Content in numbers

| Kind | Count |
|---|---|
| Story phases | 17 (Phase 1 = prologue and engine; Story Phases 2–17) |
| Playable chapters | 223 entries: the prologue + 222 numbered chapters. Also 16 phase-end markers, which are not chapters |
| Scripts | 4,553 |
| Dialogue lines in chapter scripts | 11,301 |
| Quests | 223 (5 left open on purpose; see `01-story-inventory.md`) |
| Maps | 11 (9 ship rooms, a reef passage, an island), merged from 78 patch files |
| Map objects | 5,898 (4,968 NPC placement rows, 801 inspectables, 43 triggers) |
| NPCs | 76 definitions (37 speak in the story) + 3 party characters + 29 voice-only speakers |
| Enemies / encounters | 4 enemies (`bilge_rat`, `large_bilge_rat`, `sparring_sailor`, `cutthroat`) / 9 encounters (3 in the prologue, the Phase 17 drill, debug) |
| Props / appearances / portraits | 521 / 129 / 77 |
| Vistas / TV programmes | 63 / 9 |
| Music / SFX / ambience | 72 / 492 / 46 |

## Baseline validation (run for this audit; nothing changed)

| Check | Command | Result |
|---|---|---|
| Unit, content and story tests | `npx vitest run` | **46 files, 898 tests, all passed** (159 s). The only stderr is expected test-fixture warnings (“Undeclared story flag "out"/"a"/"b"”) from tests that check undeclared flags on purpose. |
| Production build | `npx vite build` | **Passed** in 2.7 s. One chunk, `index-*.js` 7,119 kB (1,822 kB gzip); Vite warns that it is larger than 5,000 kB. |
| Browser smoke tests | `npx playwright test --grep @smoke` (Chromium at `/opt/pw-browsers/chromium`) | **35 of 35 passed**, in two runs because the first reached a 30-minute limit after 21 tests: 21 passed (gamepad, menus, movement, Phases 10–15), then the remaining 14 passed (Phases 2–9, 16, 17) in 50.7 min. The slowest test is `e2e/phase2.spec.js` “every Phase 2 chapter preset starts cleanly” at 31.8 min on one worker. |
| Full browser suite | `npm run e2e` | Not run: its own config estimates about 100 minutes. The last full run was in Phase 17 development. |

The story is checked headlessly as well as in the browser. `tests/storyHarness.js` plays chapters with scripted input; the Phase 6–9 walkers live in `tests/phase6_story.test.js` … `tests/phase9_story.test.js`, and the Phase 10–17 walkers in `tests/phase10Play.js` … `tests/phase17Play.js`. `tests/storyStaging.js` checks that nobody stands on solid tiles, that moves are reachable and that the captain is never boxed in. `tests/bannedNames.js` scans the whole repository for three forbidden names.

## Tools

- `tools/export-assets.mjs`: Tiled maps and sprite sheets (`npm run export`).
- `tools/mapgrid.mjs`, `tools/artsheet.mjs`, `tools/art-preview.html`, `tools/shot.mjs`, `tools/play.mjs`: map grids, art previews, screenshots, scripted play.
- Debug presets: `data/debug/presets.json` (353), started from F2 or the URL (`src/debug/startPreset.js`). Every phase-complete state has one, which is how this audit measured rooms and crews.

## Known baseline issues (found by this audit; none fixed)

1. **One 7.1 MB JavaScript bundle**, with no code-splitting. Procedural art is built at boot.
2. **Placement tables are enormous** (1,692 rows on the main deck) and first-match ordering spans 17 phases of patches.
3. **Story props accumulate**: 219 phase-specific props remain standing in the four main rooms at the end of Phase 17 (see `03-ship-layout-audit.md`).
4. **Eleven crew are parked in the cargo hold** from Phase 10 to the end, most of them since Phase 7 (see `02-crew-audit.md`).
5. **Five main quests are open with no completion path** (by design; see `01-story-inventory.md`).
6. **Combat content is minimal**: 4 enemy types, and one scripted battle outside the prologue.
7. **`package.json`’s description is out of date** (mentions Phases 2–7).

## Extension points the overhaul should use

- **Field enemies** (`src/world/FieldEnemy.js`) are the seed of real-time field combat: they already wander, chase, and grant advantage from behind.
- **Shark Duty** (`src/world/SharkDuty.js`) is already a real-time, rail-based defence game with sessions and escalation, and can generalise to other hazards and enemies.
- **The repair timing bar** variants carry a captain stat each (`src/systems/repairKinds.js`). This is a ready hook for equipment and skill progression.
- **Fumes, Dead Center, Atmosphere and beard tags** become the Atmosphere and Beard Saturation systems.
- **Brogath Stability** is already a deterministic pressure system with incidents (`src/systems/stability.js`). It generalises to other pressures, such as Garrick’s release pressure.
- **`routine` NPC behaviour** is the base for crew schedules.
- **Map patches, `propConditions` and decor slots** let content retire and configure props without editing earlier phases.
- **Debug presets at every phase end** are a regression harness for any layout or crew change.
