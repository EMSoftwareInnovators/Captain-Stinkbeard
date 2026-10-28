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
3. **Difficulty default.** Decided in Prompt 4: the modes are **Deckhand / Captain / Brutal**, and **Captain** is the default for a new game ([08-difficulty-and-accessibility.md](08-difficulty-and-accessibility.md)).

## Group 1 · Architecture and shared mechanics (Prompts 2–11)

| # | Prompt | Depends on | Acceptance criteria | Main source paths |
|---|---|---|---|---|
| 2 | **Regression harness and measurements.** Turn this audit’s tooling into tests: per-room and per-crew snapshots at all 17 phase presets (reachable area, choke tiles, unreachable inspectables, live props, placements); a read-only coordinate reference index tool; an explicit “win” policy for the story walkers; a frame-time baseline in the browser | – | No gameplay change; new tests pass on today’s content; index lists every coordinate reference per room; frame-time numbers recorded in `docs/gameplay-overhaul/` | `tests/storyHarness.js`, `tests/storyStaging.js`, `src/debug/presets.js`, `src/maps/compileMap.js`, `src/world/placements.js`, `tools/` |
| 3 | **Challenge outcome contract (S0)** and challenge-start checkpoints with instant retry; opt-in fail rules for `repair`, Shark Duty, sash tension; harness “fail first” policy. **Done**: see [07-challenge-outcomes.md](07-challenge-outcomes.md) | 2 | Steps without fail rules play identically; fail rules branch and retry; every walker passes under both policies | `src/systems/script/commands.js`, `src/scenes/OverlayScene.js`, `src/systems/hazards/sharkDuty.js`, `src/systems/tension.js`, `src/systems/challenge/` (as built), `src/systems/timingBar.js` |
| 4 | **Difficulty modes and assists** (Deckhand / Captain / Brutal); today’s bar widening becomes the classic-bar assist, plus a timing assist. **Done**: see [08-difficulty-and-accessibility.md](08-difficulty-and-accessibility.md) | 3 | Setting saved; each mode changes only the tables in data, by adjusting opted-in challenges' mechanics and retry rules, never legacy steps; E2E options test updated | `src/systems/settings/Settings.js`, `src/ui/panels/OptionsPanel.js`, `src/ui/panels/DifficultyPanel.js`, `src/systems/challenge/config.js`, `src/systems/challenge/difficulty.js`, `data/difficulty/` |
| 5 | **Ship Integrity core (S1)**: sections, damage, HUD readout, materials-based repairs; save v18. **Done**: see [09-ship-integrity.md](09-ship-integrity.md) | 3 | Integrity values saved and migrated; repairs can consume materials when a chapter opts in; no chapter opted in yet | new `src/systems/integrity.js`, `src/systems/repairKinds.js`, `src/scenes/OverlayScene.js`, `src/systems/save/` |
| 6 | **Flooding and fire**: leaks raise the hold water level, the pump lowers it; fires spread until smothered. **Done**: see [10-flooding-and-fire.md](10-flooding-and-fire.md) (leaks, water per compartment, fire per room, the emergency response, retry-safe damage events, save v19) | 5 | Deterministic tests for spread and pumping; one debug preset demonstrates both | `src/systems/ship/hazards.js`, `src/systems/ship/HazardState.js`, `src/systems/ship/response.js`, `src/world/HazardLayer.js`, `data/ship/hazards.json` (as built) |
| 7 | **Atmosphere per room (S2)**: air values, sources and sinks, doors and portholes, generated fume zones; `atmosphere.js` states become a layer. **Done** as a generic simulation beside the legacy fumes (which are unchanged; generating zones from the air is left to the campaign prompts that migrate a scene): see [11-atmosphere-and-ventilation.md](11-atmosphere-and-ventilation.md) (air per room, openings, sources, containment and ventilation, the captain's exposure, save v20) | 3 | Existing fume rectangles still work; generated zones are deterministic; exposure uses equipment hooks | `src/systems/ship/air.js`, `src/systems/ship/AirState.js`, `src/systems/ship/airResponse.js`, `data/ship/air.json` (as built) |
| 8 | **Pressure subjects (S5)**: generalise Brogath Stability; add Garrick’s release pressure; eruptions emit Atmosphere and Integrity events. **Done** as an opt-in system (no chapter switches a subject on): see [12-pressure-and-eruptions.md](12-pressure-and-eruptions.md) (Brogath's subject is an adapter over his Stability, Garrick's pressure is new; interventions, suppression, eruptions into the air, openings and hull; save v21) | 5, 7 | Brogath behaves exactly as today in Phases 14–17; new subjects are data; eruption integration tests | `src/systems/ship/pressure.js`, `src/systems/ship/PressureState.js`, `src/systems/ship/pressureResponse.js`, `data/ship/pressure.json` (as built; `stability.js` unchanged) |
| 9 | **Beard Saturation (S3)** with statuses (Saturated, Paranoid, Hornet-nested), beard puffs at overload, washroom care. **Done** as an opt-in system (no chapter switches it on): see [13-beard-saturation.md](13-beard-saturation.md) (composition by contaminant, absorption from the room's air inside the captain's breath, stages, statuses, finite purges without loops, sniff and look, rinse and scrub at the washroom tub, an opt-in equipment mapping, eruption residue, save v22) | 7 | Existing beard tags unchanged; saturation saved; statuses data-driven | `src/systems/ship/beard.js`, `src/systems/ship/BeardState.js`, `src/systems/ship/beardResponse.js`, `src/world/BeardCues.js`, `data/ship/beard.json` (as built; `src/systems/beard.js` and `BeardPuffs.js` unchanged) |
| 10 | **Resources and cooking (S8)**: materials, food, Frog Grog effects; reusable galley cooking minigame. **Done** as an opt-in system (no chapter switches it on): see [14-resources-and-cooking.md](14-resources-and-cooking.md) (classes over the one inventory, physical sources with depletion and restocking, the ship's stores, recoveries on every difficulty, gear worn by hand, timed food and draught effects, a grog tot beside an unchanged Frog Grog, galley cooking on the shared timing bar, save v23) | 5 | Inventory shows materials; the cooking minigame has its own tests; no chapter changed yet | `src/systems/ship/supplies.js`, `src/systems/ship/SupplyState.js`, `src/systems/ship/supplyResponse.js`, `data/ship/supplies.json`, `data/items/supplies.json` (as built; `Inventory.js` unchanged) |
| 11 | **Consequence ledger (S9)** with a validator rule that consequences never gate mandatory story; shown in the Captain’s Journal. **Done** as an opt-in system (no chapter applies anything): see [15-consequences-and-recovery.md](15-consequences-and-recovery.md) (eight data-defined consequences with levels, stacking, caps and clocks; modifiers through the systems' own resolvers; rest, meals and maintenance as recovery; challenge outcome tables; save v24; the Captain's Journal; the validator refuses consequence conditions on chapter starts, doors, triggers, people's places and steps that move a main quest, and checks every ship bar stays winnable at the worst condition) | 3 | Validator flags any mandatory objective gated on a consequence value | `src/systems/consequences/`, `data/consequences/ledger.json`, `src/content/validateContent.js`, `src/ui/menu/LogPage.js` (as built; `data/logs/` unchanged) |

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
| 27 | **Field combat core**: tool swing, dodge, stagger, telegraphs, knockdown, input buffering, bindings | 3, 4 | Gamepad and keyboard E2E; frame budget met; no lethal field damage outside Brutal | `src/world/FieldEnemy.js`, `src/scenes/WorldScene.js`, `src/platform/input/bindings.js` |
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

## Findings from Prompt 4

What building difficulty and assists showed, and how it changes later prompts:

- **Difficulty is a layer, not a second system.** A challenge resolves through engine defaults, the difficulty preset's feel, the profile, the challenge, then the player's assists. Every later system that should scale with difficulty (combat in Prompt 27, Ship Integrity in 5, Atmosphere in 7) adds its feel keys to `TUNING` and its kind to the presets, and its stakes to profiles' `difficulty` blocks. It doesn't add its own difficulty switch.
- **Stakes live in profiles.** The presets only change how a challenge feels. Fumbles, slips, bites, tries, costs and consequences per difficulty are written in the shared profiles (already done for all six) or in a chapter's own `difficulty` block. Campaign prompts 35–53 should start from a profile and override per difficulty only what the chapter needs.
- **Every difficulty is validated on its own.** A chapter that opts in is checked as three configs: winnable, finishable, every named outcome reachable. Campaign prompts should also run `npm run test:walkers:difficulty`.
- **The timing assist already reaches legacy content.** Turning a chapter's steps into challenges doesn't change what an assisted player gets; only the stakes become real.
- **A difficulty condition for scripts is still missing.** Branching dialogue or encounters on the difficulty outside a challenge needs one (read from the prefs, never saved). Add it in the first campaign prompt that needs it.

## Findings from Prompt 5

What building Ship Integrity showed, and how it changes later prompts:

- **Challenges now have real targets.** A failure's `costs` can take materials (`takeItem`) and its consequences can damage a section (`shipDamage`), so campaign prompts 35–53 can replace "hull_damage" story variables with sections. Damage meant to survive a retry belongs in `costs`; damage inside an attempt is undone by the retry.
- **Materials have no source yet.** Only the debug demo hands them out. Prompt 10 (resources) has to add sources before any chapter can ask for a repair, or a chapter must give the materials it needs itself.
- **Nothing reads a section's efficiency yet.** Flooding and fire (Prompt 6) are the first systems that should: the hulls' condition as leaks, the deck and rigging as fuel. Combat and the storm write damage through `shipDamage`, with an `eventId` per hit.
- **Repairs need places.** They start from Pause > Ship in a section's rooms. The layout prompts (12–19) should add repair stations as objects that run `shipRepair` for their section, in rooms with space, and keep sections mapped by room id, never by tile.
- **The ship can be lost, but nothing happens yet.** `ship.onDestroyed` is a hook. Whether the campaign ever sinks the ship is a story decision for the campaign prompts.

## Findings from Prompt 6

What building flooding, fire and the emergency response showed, and how it changes later prompts:

- **Event ids are now state, and scoped.** Prompt 5's per-play ids couldn't let a retried attempt take the same hit again. They are now saved and checkpointed with the ship, and scoped to the charge, list or attempt that applies them (10, section 9). Every later system that deals repeatable damage (pressure eruptions in 8, combat in 27–34) gives each blow an `eventId` and gets this for free; it must not deduplicate damage some other way.
- **Room-level state works.** Water per compartment and fire per room, moving only along validated room links (a map warp between them), was enough for real effects, real choices and no tile simulation. Atmosphere (Prompt 7) should reuse the pattern: state per room, links checked by `roomLinks`, a fixed-step clock that runs only in free world time (`HazardClock`). It must stay a separate layer: fumes don't travel through the water's flow links or the fire's spread lists.
- **Stations are data, not objects yet.** The bilge pump and the water sources are rooms in `data/ship/hazards.json`. The layout prompts (12–19) should add pump, cask and repair objects that run `hazardAction` / `shipRepair`, and keep every flow and spread link on a real doorway when rooms move (the validator fails otherwise).
- **Materials are now the bottleneck.** A breach patch costs up to 3 planks, 3 nails and 2 sailcloth on Brutal. Prompt 10 has to add a real source before any chapter can open a leak; a chapter that does so earlier must supply the materials itself.
- **The secondary button is now Respond in the world** (V, pad X; its keyboard glyph was wrong and is fixed). Later prompts that want a world action on it must share it with Respond, which shows only where there's an emergency to answer.
- **Brutal is lethal if ignored.** An unanswered galley fire on Brutal spreads to the hold and can burn both hulls to nothing in about three minutes. That is intended (answered, every difficulty recovers, tested), but campaign prompts opting in on Brutal should test the "player walks away" case and decide whether the ship may be lost there.
- **Recommendation for Prompt 7 (Atmosphere per room):** start from the existing fume zones and `atmosphere.js` states, and add per-room air values with sources and sinks on the same room graph and clock, keeping existing fume rectangles working exactly as today. No chapter should change, and the Chicken-Town / Coffin Sock propagation stays out of scope until its own prompt.

## Findings from Prompt 7

What building the air showed, and how it changes later prompts:

- **One clock, one state, one pipeline.** The air ticks on Prompt 6's hazard clock (`ship.tick()`), lives in the ship's state (saved and checkpointed with it), and speaks through the same notices, HUD line, Respond button and Ship page. Every later environmental system (pressure in 8, saturation in 9) should join that, not add a timer or a meter of its own.
- **The legacy fumes and the air don't share state, by design.** Tile rectangles per map and room-level gas don't map onto each other. They share room ids, events, the meter, protection and the fume hazard option; while a legacy zone holds the captain, it owns his lungs, so he is never charged twice. Moving a scene onto the air is that chapter's campaign prompt: zones out, a source in, one owner.
- **The name "atmosphere" was taken.** Story Phase 15's ship-wide atmosphere value (and its command) is an authored story state. The simulation is "air" in code (`ship.air`, `air*` commands, the `air` condition) so the two can't be confused; docs call it the atmosphere system.
- **Openings need objects.** Doors, hatches and portholes are data, worked from the room through Respond. The layout prompts (12–19) should add the objects listed in 11, section 5, and keep the opening ids when doors move (the validator rejects a connection that isn't a real doorway).
- **Difficulty scales the captain, never the gas between rooms.** That keeps containment honest on every difficulty; later systems should scale people and responses, not the physics.
- **Exposure has no defeat yet**, only slowness, coughing and HP down to a quarter. Whether a chapter's air can knock the captain out (the legacy collapse) is a story decision for the campaign prompts.
- **Pre-existing, found while verifying (not fixed: room content is out of scope):** the browser test "the rescue: rope, cloth, Dead Center, collapse and the haul-out" (`e2e/phase2.spec.js`, @scenes, not in the smoke set) fails at its first step on this branch and already did before the overhaul (`fe6281d`): in chapter 6 the captain can go down the main hatch without the rescue gear. Three warps share the hatch tiles (9,24) on the main deck: the base map's unconditional `to_galley`, Phase 2's `to_galley_p2` (locked as `ch6.hatch_blocked` without `rescue_gear_on`) and Phase 10's `p10_hatch_hold_on`, and the unconditional one lets him through. The rest of that scene (the Dead Center exposure, the collapse, Rook's haul-out, the rescue) passes unchanged when the hatch step is skipped. The prompt that owns the main deck's layout should merge those warps into one with both conditions.
- **Recommendation for Prompt 8 (Pressure subjects):** generalise Brogath Stability into pressure subjects (Brogath exactly as today in Phases 14–17, Garrick's release pressure as data), whose eruptions are events into the systems that now exist: an air source in the rooms around (with an `eventId`), openings forced open (`damaged`), and ship damage, all opt-in and tested on every difficulty. No chapter's outcome should change; named gases (Coffin Sock, Chicken-Town, Fire-Waft) stay out until their own prompts.

## Findings from Prompt 8

What building the pressure system showed, and how it changes later prompts:

- **An adapter, not a replacement.** Brogath's Stability is read by sixteen data files at exact values, and its incidents and scripted catastrophes are authored. His pressure subject is a view over the same variable, written through `writePressure`, so there is only ever one number. Everything new about him (what he holds in, modifiers, the countdown and cooldown) lives in `ship.pressure`. While a Stability incident or the scripted ANGRY state runs, the new system waits. The campaign prompts that convert a Brogath scene should switch his subject on and replace the incident with triggers, never run both.
- **Where a character is comes from the placements.** `npcWhere` uses the same rules the world stages people by, so a subject is never spawned, moved or duplicated, and is unavailable before the story brings him aboard. Moving a subject to a safe release room (the Fart Zone) needs crew schedules (S8) first.
- **The pressure is the ship's state.** It moves on the one hazard clock, before the hazards and the air, and is saved and checkpointed with the ship. An eruption is three existing events: integrity damage (the `supernatural` category, never below a quarter), opening changes through `setConnection`, and one finite air source. Retry safety comes for free from the ship's event ids.
- **Suppression is the interesting choice.** Holding it in works now and stores pressure for later. Measured on Captain, the same embarrassments after four different choices end in a minor controlled puff, nothing, a stored-up catastrophe, or a major eruption (doc 12, section 8). Later subjects (Vindicta, Thunderbottom) should keep that trade-off rather than add random outcomes.
- **Blast-damaged openings needed a fix.** Prompt 7 had no way to undo `damaged`, so this prompt added the `airMend` action (planks, nails, the repair bar). The layout prompts should keep opening ids stable for it.
- **Pre-existing, unchanged:** the chapter 6 hatch test (see Prompt 7's findings) still fails in `e2e/phase2.spec.js`, untouched as instructed. The fix belongs in the early ship-layout or campaign-overhaul work that owns the main deck's warps.
- **Recommendation for Prompt 9 (Beard Saturation):** saturation as a per-play-saved value on the captain's beard, fed by the same events: exposure to the air (`air` sources and exposure stages, Prompt 7), eruptions nearby (`pressure:erupted`, Prompt 8) and the existing beard contamination tags. Statuses (Saturated, Paranoid, Hornet-nested) should be data, with beard puffs at overload emitting a tiny opt-in air source, and washroom care as a timed action on the existing bar. As always, opt-in, no chapter outcome changes, and every difficulty tested.

## Findings from Prompt 9

What building Beard Saturation showed, and how it changes later prompts:

- **The beard sits inside the breath, not beside it.** The cleanest place for a filter was `AirState.breathe`: the beard takes its share of each gas from the room (conserved, counted as `absorbed`), and the lungs breathe the rest, then every existing protection applies once (the fume option, the rescue gear or the worn wet cloth, Frog Grog, the difficulty). With the beard off the air breathes exactly as before. Later protections (S7 equipment, Prompt 30) should join that one chain, never add a second exposure.
- **The story's beard tags stay narrative.** Twelve tags, set 15 times by scripts and read by dialogue and looks, have no amounts. They are not read by the new system and never become contamination on load (tested on saves 17 to 21). A campaign prompt that wants a tag to mean something mechanical should deposit a contaminant in the same scene, explicitly.
- **Overload puffs are cues, not releases.** The roadmap suggested a tiny air source per puff; in practice that made a release-and-reabsorb loop easy. Warning puffs are cues; the purge is the release, finite, with a cooldown in which the beard takes nothing in. Overloaded in a sealed room it purges once and the stink only falls.
- **Eruption residue is a deposit, the gas is breathed.** One model, so nothing counts twice: subjects carry an opt-in `beard` residue; the eruption's gas reaches the beard only through the air.
- **Paranoia needed fairness rules first.** Visions are always marked "(?)" in words, never on the HUD line, and never change a name, a sprite or an interaction; a sniff interrupts them, real recovery is separate. Only a debug-only contaminant causes it today: the content validator refuses it in story content.
- **Washroom care reused what was there.** The tub and the basin are the stations (reach 1), a rinse is free (so a beard can always be cleaned), a scrub costs a sailcloth rag on the shared timing bar, with the usual sticky failure costs. No new fixture, no new material.
- **The HUD line had to give the beard a fixed place.** With bad air in three rooms, the beard (weight 60-250) never made the top two; it now leads the line when listed (it is always "here"). Later personal conditions should share that slot rather than compete with room emergencies.
- **Materials are now spent in four places** (repairs, seals, mends, scrubs), always all-or-nothing and scaled by `costScale`, but the player still can't see where materials come from or make more. That is the gap the next prompt fills.
- **Pre-existing, unchanged:** the chapter 6 hatch test (see Prompt 7's findings) still fails in `e2e/phase2.spec.js`, untouched as instructed.
- **Pre-existing, found while verifying (machine speed, not this prompt):** two Vitest tests run close to the 5 s default timeout on this machine. `tests/phase2.test.js` "every preset applies to a fresh game without errors" (it starts all 342 debug presets) took 5.4 to 5.6 s on the Prompt 8 commit and 5.5 to 6.0 s here, so it fails on both; `tests/phase14_story.test.js` "the barricade's shield..." passed here at idle and timed out once on the Prompt 8 commit under load. Neither touches the beard. They need a longer per-test timeout (or the preset sweep split) in a harness prompt; nothing was weakened here.
- **Recommendation for Prompt 10 (Resources and cooking, S8):** make the materials the overhaul already spends (planks, nails, rope, sailcloth) and food visible and obtainable: a resource view in the inventory, data-driven sources (salvage from repairs and wreckage, the hold's stores, purchases), and the galley cooking minigame on the shared challenge runner and timing bar. Frog Grog's ward should become a data-driven consumable effect that joins the existing exposure chain as one factor (and may slow beard absorption the same way the wrap does), never a second protection system. Keep it opt-in: no chapter's costs change, every difficulty is tested, and nothing is ever free in the campaign.


## Findings from Prompt 10

What building shipboard resources and cooking showed, and how it changes later prompts:

- **One inventory was enough.** Everything the overhaul spends was already an ordinary item paid from the pack through one all-or-nothing `takeAll`. Supplies became classes over those items (data), places in the rooms that give them, and one shared store; nothing parallel. The one engine change to item use is a `shipEffect` effect type in the existing pipeline.
- **Who pays had to be decided, not discovered.** Repairs keep paying from what the captain carries (every bill exactly as Prompts 5 to 9 made it); the stores are fetched from, and only the cook may draw on them from the galley. A future quartermaster or carpenter adds a store's `spend.for`; the repairs would then go through the store-aware `spend` instead of `takeAll`.
- **Physical sources reused the room's own props.** Every source, the stores and the stove are tiles of props already in the cargo hold and galley, reached by standing next to them; the Respond button follows him from spot to spot. No scenery moved and no map changed. The bilge pump's own Respond entry always comes first in the hold, which tests have to count.
- **The "way back from empty" is data with a validator.** Two bounded recoveries (the bilge, the sacking) give a little of every repair material for time, and the validator refuses any data where a repair material on any difficulty has no restock, recovery or shop (`npm run economy`). Campaign prompts that make repairs mandatory should add their requirement to the report's `mandatory` list rather than invent totals now.
- **Story items needed protecting from the new stores.** The rum ration looked like food but is turned into Frog Grog by a chapter 11 `swapItem`; stored, the swap would have missed it. It is never classed, and the validator now refuses classing any item a story `takeItem` or `swapItem` names. Gear is the exception: worn is a mark on a held item, never a move.
- **Frog Grog stays the story's; its gameplay cousin is a portion.** A grog tot from the galley jugs is the opt-in draught; its ward is taken with Frog Grog's by the smaller in the one protection chain (`WorldScene.updateHazards`), never multiplied, never past the old best (0.245). Without a tot the formula is exactly the old one.
- **The beard's worn list became the one worn list.** Prompt 9 saved what is worn over the beard; gear (with the helmet) uses the same list for slots, restrictions and the cloth's charges, so nothing is worn twice or saved twice.
- **Timing tests investigated** (the brief's four):
  - *Phase 2 preset sweep* (`tests/phase2.test.js` "every preset applies to a fresh game without errors"): passes here, 3.3 to 3.5 s idle (three runs) and in the full suite. Root cause of its cost found by profiling: each of the hundreds of flags and quests a late preset applies fires a full `refreshStateObjectives` over every active quest (cost grows with flags times quests; 359 presets, 3.4 s in plain Node, about 90% in `applyPresetPlan`). Batching the refresh to one at the end measured 4x faster (3.6 s to 0.8 s) but changed the saved `progress` counters of already-done objectives in 342 presets (done flags and statuses identical), which would move every snapshot, so it was not applied; a harness prompt should make the batch exactly equivalent (or move the refresh guard into `QuestSystem`) and then apply it. New changes are not implicated (one preset added).
  - *Phase 14 staging* (`tests/phase14_story.test.js` "the barricade's shield..."): passes, 3.0 to 3.3 s idle (three runs) and in the full suite. Load-sensitive only; not implicated.
  - *Captain walker under load*: at idle all 505 tests pass (153 s). Run beside another suite on the 4 CPUs, a different handful of the longest story walks (Phases 14 to 17) cross Vitest's 5 s per-test timeout (5.0 to 5.8 s). Side by side under the same load, this commit had 5 such timeouts and the previous commit 4, with the same total walk time (223 s and 224 s): pre-existing and load-only. A harness prompt should give the story walks their own timeout (they are long by design) rather than share the 5 s default; nothing was raised here.
  - *Phase 2 hatch in the browser* (`e2e/phase2.spec.js` "the rescue..."): still fails, deterministically and identically on the previous commit: going down the hatch without the gear, the captain arrives in the galley instead of being turned back. Not implicated; untouched as instructed (Phase 2 content).
  - The supplies' own heaviest tests were made cheap (3.6 s to 0.6 s) so they don't join that list under load.
- **Recommendation for Prompt 11 (Consequence ledger, S9):** the overhaul now has opt-in state in six places (integrity, emergencies, air, pressure, the beard, supplies) and the story has its own values; the ledger should be a small, saved, data-defined list of named consequences (ship damage carried, crew dazed, Squawks's feathers, evidence strength, morale, supplies spent) that chapters write with one command and read with one condition, shown in the Captain's Journal. Its validator rule is the point: a consequence may change cost, dialogue variants and difficulty, never whether a mandatory objective can be completed (the economy report's recoverability check is the model). Keep it opt-in, migrate saves (v24) with nothing invented, and test every difficulty.

## Findings from Prompt 11

What building the consequence ledger showed, and how it changes later prompts:

- **A ledger beside the story, not inside it.** The roadmap's S9 imagined consequences as story values. Kept apart, they get what story values can't: severity levels, stacking with caps, clocks on the hazard clock, chapter milestones, bounded history, event ids, a validator that knows what a penalty impairs, and a save and checkpoint domain of their own. Story values stay the story's; a chapter that wants a value from the ledger reads the `consequence` condition (or `consequenceCheck` into a value for dialogue variants).
- **One resolver per number.** Every modifier joins a place that already resolves its number for every system (the ship bars' condition layer, `captainFactors`, `repairPlan`, `hazardAction`), so no system needed a scattered check, and every bound holds wherever the number is read. The ship bars needed a real precedence order for the first time: the captain's condition (food, draughts and consequences together) became a flat layer after the challenge's numbers and the leader's stat, before the assists. Food was moved into it; legacy story bars have no condition layer.
- **The runner already had most of the retry semantics.** Sticky costs replayed after a restore and scoped event ids (Prompts 3 and 6) gave "kept through retry" and "never twice" almost for free; Prompt 11 added four lists (success, a failed attempt, each retry, going back) and marked in the record what a restore undid, so the record and the ledger always agree.
- **The gate is a validator rule, and a heuristic.** "Never gates mandatory story" is enforced where a condition can decide progress (chapter starts, story triggers, doors, map triggers, people's places, steps and choices that move a main quest or a progress flag). It can't follow a `goto`, a `call` or a value read later; campaign prompts should keep consequence checks in dialogue variants and costs, and run `npm run consequences`.
- **Winnability needed the real kinds.** The bar check uses each ship bar's own kind speed, strikes and the difficulty's limits with the weakest leader: the 4-strike hull and rigging rebuilds on Brutal are the tightest (52 ms at the -6 bound; -10 would break them), which is what fixed the condition bound at -6 to +6.
- **Recovery reused rooms, not tiles.** Resting is a room-level Respond action in the crew quarters, maintenance in the cargo hold (the pump by its station id): nothing moves when the layout prompts move the furniture. A meal eases through the item's own effect path.
