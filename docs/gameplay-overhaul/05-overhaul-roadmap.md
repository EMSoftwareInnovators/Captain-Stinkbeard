# 05 · Overhaul roadmap

A dependency-ordered plan of small, individually testable Claude Code prompts. Prompt 1 was this audit. **Refined estimate: 62 prompts (Prompts 2–63), with a realistic range of 58–68**, depending on how much each story phase needs and on the combat decision.

## Rules for every prompt

- One system or one slice of content per prompt. Changes are data-driven: a chapter opts in, so unconverted chapters behave exactly as they do today.
- Before finishing: `npx vitest run` (all green), `npx vite build`, and the E2E smoke suite (`npm run e2e:smoke`). The last prompt of each group also runs the full E2E story suite (`npm run e2e:story`).
- No dialogue deleted, no story events reordered, no flags renamed or removed. New text passes `tests/bannedNames.js` and `tests/textfit.test.js`.
- A save-format change bumps `SAVE_VERSION` and adds a migration with neutral defaults (`src/systems/save/migrations.js`), tested against fixture saves.
- Update `docs/ARCHITECTURE.md` / `docs/CONTENT_GUIDE.md` for every new system.

## Decisions needed from you

1. **Combat model** (`04-gameplay-systems.md` §4). Hybrid real-time field combat plus turn-based bosses is assumed. Needed before group 4.
2. **Endgame story.** The five open quests need endings. The story is yours: group 6 starts with a proposal document for you to approve before any new story is written.
3. **Difficulty default.** Which mode (Story / Seaworthy / Ruthless) is the default for a new game. Needed by Prompt 4.

## Group 1 · Architecture and shared mechanics (Prompts 2–11)

| # | Prompt | Depends on | Acceptance criteria | Main source paths |
|---|---|---|---|---|
| 2 | **Regression harness and measurements.** Turn this audit’s tooling into tests: per-room and per-crew snapshots at all 17 phase presets (reachable area, choke tiles, unreachable inspectables, live props, placements); a read-only coordinate reference index tool; an explicit “win” policy for the story walkers; a frame-time baseline in the browser | – | No gameplay change; new tests pass on today’s content; index lists every coordinate reference per room; frame-time numbers recorded in `docs/gameplay-overhaul/` | `tests/storyHarness.js`, `tests/storyStaging.js`, `src/debug/presets.js`, `src/maps/compileMap.js`, `src/world/placements.js`, `tools/` |
| 3 | **Challenge outcome contract (S0)** and challenge-start checkpoints with instant retry; opt-in fail rules for `repair`, Shark Duty, sash tension; harness “fail first” policy. **Done**: see [07-challenge-outcomes.md](07-challenge-outcomes.md) | 2 | Steps without fail rules play identically; fail rules branch and retry; every walker passes under both policies | `src/systems/script/commands.js`, `src/scenes/OverlayScene.js`, `src/systems/hazards/sharkDuty.js`, `src/systems/tension.js`, `src/systems/challenge/` (as built), `src/systems/timingBar.js` |
| 4 | **Difficulty modes and assists** (Story / Seaworthy / Ruthless); today’s bar widening becomes an assist (the strict bar already takes `mechanics.assist`; there is no timing-assist accessibility option yet) | 3 | Setting saved; each mode changes only the tables in data, by adjusting opted-in challenges' mechanics and retry rules, never legacy steps; E2E options test updated | `src/systems/settings/Settings.js`, `src/ui/panels/OptionsPanel.js`, `src/systems/challenge/config.js` |
| 5 | **Ship Integrity core (S1)**: sections, damage, HUD readout, materials-based repairs; save v18 | 3 | Integrity values saved and migrated; repairs can consume materials when a chapter opts in; no chapter opted in yet | new `src/systems/integrity.js`, `src/systems/repairKinds.js`, `src/scenes/OverlayScene.js`, `src/systems/save/` |
| 6 | **Flooding and fire**: leaks raise the hold water level, the pump lowers it; fires spread until smothered | 5 | Deterministic tests for spread and pumping; one debug preset demonstrates both | `src/systems/hazards/`, `src/world/` |
| 7 | **Atmosphere per room (S2)**: air values, sources and sinks, doors and portholes, generated fume zones; `atmosphere.js` states become a layer | 3 | Existing fume rectangles still work; generated zones are deterministic; exposure uses equipment hooks | `src/systems/hazards/fumes.js`, `src/systems/atmosphere.js`, `src/systems/hazards/deadCenter.js`, `src/world/FumeLayer.js` |
| 8 | **Pressure subjects (S5)**: generalise Brogath Stability; add Garrick’s release pressure; eruptions emit Atmosphere and Integrity events | 5, 7 | Brogath behaves exactly as today in Phases 14–17; new subjects are data; eruption integration tests | `src/systems/stability.js`, `src/world/StabilityRunner.js`, `data/story/stability/` |
| 9 | **Beard Saturation (S3)** with statuses (Saturated, Paranoid, Hornet-nested), beard puffs at overload, washroom care | 7 | Existing beard tags unchanged; saturation saved; statuses data-driven | `src/systems/beard.js`, `src/world/BeardPuffs.js`, `data/story/beard.json` |
| 10 | **Resources and cooking (S8)**: materials, food, Frog Grog effects; reusable galley cooking minigame | 5 | Inventory shows materials; the cooking minigame has its own tests; no chapter changed yet | `src/systems/inventory/`, `data/items/`, new cooking UI |
| 11 | **Consequence ledger (S9)** with a validator rule that consequences never gate mandatory story; shown in the Captain’s Journal | 3 | Validator flags any mandatory objective gated on a consequence value | `src/content/validateContent.js`, `data/logs/` |

## Group 2 · Ship layout and environment (Prompts 12–19)

| # | Prompt | Depends on | Acceptance criteria | Main source paths |
|---|---|---|---|---|
| 12 | **Prop lifetime classes** plus validator; retire finished story props with `propConditions` (data only) | 2 | Every conditional prop classified; snapshot diff reviewed room by room; no inspectable becomes unreachable | `src/content/ContentDB.js`, `src/content/validateContent.js`, `data/maps/ship/phase*/` |
| 13 | **Named anchors**: map anchor tables; scripts and objects move to anchor ids, starting with the main deck | 2 | Coordinate index shows the main deck fully anchored; walkers green | `src/maps/compileMap.js`, `src/systems/script/commands.js`, `data/maps/ship/main_deck.json` |
| 14 | **Main deck redesign**: station zones, clear spine, residue as integrity decals, overlaps fixed | 5, 12, 13 | Choke tiles at or below the prologue value + margin at every preset; zero shared story-prop anchors | `data/maps/ship/main_deck.json` + patches, `src/world/` |
| 15 | **Galley and cargo hold redesign**: kitchen and mess; stores office, carpenter’s bench, brig, bilge; barracks only as a story state | 12, 13 | No dormitory leftovers after their arcs; hold placements limited to workers and story shelter scenes | `data/maps/ship/galley.json`, `cargo_hold.json` + patches |
| 16 | **Crew quarters partition**: berths, sick bay, Brogath’s canopy alcove, a counter alcove with modes (bank, branch, dispensary, bureau, credit) | 12, 13 | Every counter scene plays from one counter table with its inspect ids preserved; choke budget met | `data/maps/ship/crew_quarters.json` + patches, `src/systems/bank.js`, `data/story/bank/` |
| 17 | **TV slot** (the S.E.S. as one configurable special area); tidy the Fart Zone and Fart-Free Zone | 12, 13 | Each S.E.S. era resolves from one story value; TV E2E tests pass | `src/systems/tv/tv.js`, `data/tv/`, `data/maps/ship/fart_free_zone.json` |
| 18 | **Treasure hold, washroom and cabin purposes**: sealed hazard room → vault; beard care; plan board | 9, 12 | Each room has at least one recurring use; no story change | `data/maps/ship/treasure_hold.json`, `washroom.json`, `captains_quarters.json` |
| 19 | **Layout save migration (v19) and full regression** | 14–18 | Saves from every phase load and place the captain on a walkable tile; full E2E story suite green | `src/systems/save/migrations.js`, `e2e/` |

## Group 3 · Pirate crew integration and NPC AI (Prompts 20–26)

| # | Prompt | Depends on | Acceptance criteria | Main source paths |
|---|---|---|---|---|
| 20 | **Roster and default placements** (story rows still win); nobody stranded in the hold | 2, 15, 16 | Crew snapshot test: no non-shelter crew in the hold at any preset except Quill and Jory at work; every roster NPC placed after their introduction | new `data/crew/roster.json`, `src/world/placements.js` |
| 21 | **Watch schedules and bunks** (`routine`), with a day/evening/night value | 20 | Schedules are deterministic; story scenes override; performance budget met | `src/world/NpcBrain.js`, `src/world/worldServices.js` |
| 22 | **Crew conditions and morale (S4)**; Fennimore’s sick bay | 20, 11 | Conditions saved; cured at the sick bay; never remove a crew member from the story | new `src/systems/crew.js` |
| 23 | **Crisis station assignment** and crew abilities (Pete, Nell, Jory, Brask, Fennimore, Squawks) | 22, 5, 7 | An assignment changes a failing system’s rate in tests | `src/systems/crew.js`, `src/ui/` |
| 24 | **Late arrivals and exits**: seed Gristle, Pete, Rusty Tom and Barnacle Bill as background crew earlier; give Dunstan, Tom and Bill an in-character place | 20 | New lines only; banned-name and text-fit tests pass; no existing line changed | `data/npcs/`, `data/maps/ship/phase*/` |
| 25 | **Special-character rules**: Garrick’s office and labour-rule order; Brogath’s containment radius; cardboard weaknesses to water and wind; spectres bound to their areas; Agnes’s lure behaviour | 8, 20 | Each rule has a unit test; Phases 14–17 walkers green | `src/systems/stability.js`, `data/story/traits.json`, `data/npcs/` |
| 26 | **Crew regression and stale-dialogue pass**: bound ambient lines to their phase | 20–25 | No ambient line mentions events of a later phase than the current one (checked by a test) | `data/npcs/phase*_crew.json` |

## Group 4 · Combat and RPG progression (Prompts 27–34)

Needs the combat decision.

| # | Prompt | Depends on | Acceptance criteria | Main source paths |
|---|---|---|---|---|
| 27 | **Field combat core**: tool swing, dodge, stagger, telegraphs, knockdown, input buffering, bindings | 3, 4 | Gamepad and keyboard E2E; frame budget met; no lethal field damage outside Ruthless | `src/world/FieldEnemy.js`, `src/scenes/WorldScene.js`, `src/platform/input/bindings.js` |
| 28 | **Enemy families I**: rats and nests, crabs, sharks on deck (from Shark Duty), falling-shark impacts | 27 | Each enemy’s pattern is deterministic and telegraphed; tests per enemy | `data/enemies/`, `src/world/SharkDuty.js` |
| 29 | **Enemy families II**: hornets, animated bedding, boarders and marines, hostile spectres | 27, 8 | As above | `src/systems/hazards/hornets.js`, `data/enemies/` |
| 30 | **Equipment expansion**: head and face slots; the protective gear the story gives (wet cloth, goggles, clay-pot helmet, beard wrap, waist rope) becomes equipment, with a migration | 7, 9 | Old saves keep the items; gear changes exposure, timing zones and combat | `src/config/constants.js` (`EQUIPMENT_SLOTS`), `src/systems/party/equipment.js`, `data/items/` |
| 31 | **Progression rework**: XP from every challenge outcome; level table retuned; captain abilities | 3, 30 | Balance simulation shows the intended curve | `data/progression/`, `src/systems/party/`, `tests/balance.test.js` |
| 32 | **Turn-based boss upgrades**: phases, hazards inside battle, Atmosphere and pressure links, cardboard traits | 7, 8 | Existing battles unchanged unless they opt in | `src/systems/battle/`, `src/scenes/BattleScene.js` |
| 33 | **Boss framework and first bosses**: the reworked rat matriarch and the royal frigate (naval) | 32, 5 | Each boss is beatable in tests by its intended strategy | `data/encounters/`, `data/enemies/` |
| 34 | **Balance tooling**: simulation of challenges and battles; difficulty tables per mode | 31, 33 | Report of win rates per mode in `docs/gameplay-overhaul/` | `tests/balance.test.js`, `tools/` |

## Group 5 · Campaign overhaul from the prologue (Prompts 35–53)

Each prompt applies the shared systems to one phase, following that phase’s entries in `01-story-inventory.md` (P1 items first, quiet beats protected). Acceptance criteria for every prompt in this group:

- Every chapter of the phase is still completable under both harness policies, in its original order, with every original line intact.
- The phase’s story walker and staging test pass, as does its E2E file.
- Each P1 proposal for the phase is implemented or explicitly deferred with a reason; quiet beats are unchanged.
- No new softlock: a validator check for fail paths, plus a fail-first harness run.

| # | Phase | Chapters | Headline gameplay (from the inventory) |
|---|---|---|---|
| 35 | Prologue | prologue | Tutorial voyage: every core verb; rat nest |
| 36 | Phase 2 | ch1–ch8 | Rescue at sea; Gust evacuation; fume dive; frigate fight |
| 37 | Phase 3 | p3c1–p3c6 | Ship survey; Beard Saturation intro; Frog Grog economy |
| 38 | Phase 4 | p4c1–p4c5 | Shark Duty as core combat; forecasts |
| 39 | Phase 5 | p5c1–p5c5 | Crew stations intro; S.E.S. |
| 40 | Phase 6 | p6c1–p6c8 | Fire crisis; storm deck; barrel artillery |
| 41 | Phase 7 | p7c1–p7c9 | Repair round with carried damage; storm II; retreat |
| 42 | Phase 8 | p8c1–p8c13 | Bunker management; stampede; scouting; stealth night |
| 43 | Phase 9 | p9c1–p9c16 | Landing planner; reef run; island exploration; fortify; barrage |
| 44 | Phase 10 (part 1) | p10c1–p10c13 | Salvage; cooking; room loss; catches |
| 45 | Phase 10 (part 2) | p10c14–p10c25 | Research heist; feast charge; battle stations; escort; the Wrong Way |
| 46 | Phase 11 | p11c1–p11c16 | Tilting galley; lamp rig; heist |
| 47 | Phase 12 | p12c1–p12c15 | Gear prep; endurance trial; interceptions |
| 48 | Phase 13 | p13c1–p13c19 | Room reclamation; quarters rebuild; hallucination rounds; helm duel |
| 49 | Phase 14 (part 1) | p14c1–p14c12 | Lash-down; containment; flutter crises; sanctuary |
| 50 | Phase 14 (part 2) | p14c13–p14c24 | Economy; teller shifts; Brogath boss reassurance |
| 51 | Phase 15 | p15c1–p15c16 | Solo stations; paranoia; Vindicta |
| 52 | Phase 16 | p16c1–p16c20 | Ventilation; Fart Zone construction; timed rescue; pitch duel |
| 53 | Phase 17 | p17c1–p17c17 | Party combat training; lure and countdown rescues; catastrophe escape |

## Group 6 · Final story act and postgame (Prompts 54–58)

Nothing in this group writes story until you approve Prompt 54’s proposal.

| # | Prompt | Depends on | Acceptance criteria | Main source paths |
|---|---|---|---|---|
| 54 | **Endgame proposal** (document only): how the five open quests resolve, in the story’s voice, for your approval | 53 | Approved by you before 55–58 start | `docs/gameplay-overhaul/` |
| 55 | **Escape the Great Sharkstorm** (`inside_great_sharkstorm.out`) as a multi-system set-piece | 54 | Quest completes; save migration for players parked at the end of Phase 17 | `data/quests/phase10.json`, new phase data |
| 56 | **The Bling Bling King** boss (`inside_great_sharkstorm.king`) | 54, 33 | Boss beatable by its intended strategies in each mode | `data/encounters/`, `data/enemies/` |
| 57 | **Crimson Fortune bounties** (`recover_crimson_fortune`): named treasure sharks, the crowned megalodon, the treasure vault | 54, 28, 18 | All four objectives completable | `data/quests/phase9.json` |
| 58 | **Greyhook Cove** (`the_great_ledger_expedition`) and the postgame (the Grand Waft Trials as an optional challenge arena you keep from happening) | 54, 55 | Ledger’s ledgers found; postgame repeatable | `data/quests/phase17.json`, `phase14.json` |

## Group 7 · Testing, optimization and balancing (Prompts 59–63)

| # | Prompt | Depends on | Acceptance criteria | Main source paths |
|---|---|---|---|---|
| 59 | **Performance**: code-split or cache procedural art, frame-time budgets per room, real-time AI budget | 27, 21 | Frame time within budget on the measured baseline machine; bundle warning addressed | `vite.config.js`, `src/art/`, `src/scenes/BootScene.js` |
| 60 | **Full balance pass** per difficulty mode | 34, 53 | Win-rate and time-to-complete targets met in simulation and in a scripted playthrough | `tests/balance.test.js`, `tools/play.mjs` |
| 61 | **Accessibility pass**: assists, colour-safe telegraphs, remapping for new actions, reduced motion | 27, 4 | Options E2E covers the new settings | `src/systems/settings/`, `src/platform/input/` |
| 62 | **Save compatibility matrix and softlock audit**: fixture saves from every version and phase | 19, 58 | Every fixture loads and can finish the game | `tests/save.test.js`, `src/systems/save/` |
| 63 | **Final regression and documentation**: full E2E, `ARCHITECTURE`, `CONTENT_GUIDE`, `RETRO_PORT_NOTES` | all | Everything green; docs current | `docs/`, `e2e/` |

## Order and critical path

```
2 regression harness ─┬─> 3 challenge contract ─┬─> 4 difficulty
                      │                         ├─> 5 integrity ─> 6 flooding/fire
                      │                         ├─> 7 atmosphere ─> 9 beard
                      │                         │        └─> 8 pressure (needs 5)
                      │                         ├─> 10 resources, 11 consequences
                      ├─> 12 prop lifetimes ─> 13 anchors ─> 14–18 rooms ─> 19
                      └─> 20 roster (needs 15, 16) ─> 21–26 crew
3,4 ─> 27 field combat ─> 28–34
all of groups 1–4 ─> 35–53 campaign (in story order) ─> 54 endgame proposal ─> 55–58 ─> 59–63
```

Groups 2, 3 and 4 can be interleaved once group 1 is done. Group 5 should go in story order, because each phase introduces the verbs the next one uses.

## Recommendation for Prompt 2

> **Done in Prompt 2.** See [06-regression-harness.md](06-regression-harness.md) for what was built, the measured baseline, and the recommendation for Prompt 3.

**Prompt 2: build the regression harness and measurement baseline.** No gameplay change.

1. Convert this audit’s scripts into Vitest checks over all 17 phase presets: rooms (reachable area, choke tiles, unreachable live inspectables, shared story-prop anchors, live props) and crew (placements, people on choke tiles, hold occupancy). Record today’s values as the baseline, so later prompts show their effect as a diff.
2. Add a read-only `tools/coord-index.mjs` that lists every coordinate reference per room: objects, script spawns and moves, camera steps, fume zones, Shark Duty rails, decor spots, placement rows.
3. Give the story harness an explicit challenge policy (`win`, using the existing `autoTiming` flag, and a stub for `fail-first`), so Prompt 3 can make challenges failable without breaking the 17 phase walkers.
4. Measure frame time in the browser at the heaviest scenes (main deck in Phases 6, 10 and 17; crew quarters at the end of Phase 17) and record the numbers next to these documents.

Why first: every later prompt moves rooms, people or challenge outcomes. Without these baselines, a regression in any of the 223 chapters would only show up in a 100-minute E2E run, or not at all. It is also the lowest-risk prompt in the plan, a good first step to review.

## Findings from Prompt 3

What building the challenge contract showed, and how it changes later prompts:

- **Only three mechanics are on the contract** (the timing bar, Shark Duty, the sash tension). Battles, the teller window, proceedings and reassurance keep their own legacy results. Each needs a kind entry and an attempt hook before a chapter can opt it in; do that in the first prompt that converts a chapter using one (combat: Prompt 27).
- **"Go back to an earlier checkpoint" works within one script and room.** A chapter that needs to go back across a room change needs a room-aware fallback (a transition to the checkpoint's room). Add it when a campaign prompt first needs it, not before.
- **Consequences are script steps for now.** Until Ship Integrity (Prompt 5) and materials (Prompt 10) exist, "damage" and "supplies used" are story variables. Those prompts should give challenges real targets (an integrity section, a material) to charge.
- **The harness can walk every phase with failures injected** (`npm run test:walkers:fail-once`), so each campaign prompt (35–53) can prove its chapters stay finishable whatever the player does.

