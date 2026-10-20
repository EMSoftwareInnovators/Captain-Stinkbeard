# Story inventory, Phase 9: The Grand Treasure Catastrophe

Chapters: 16 (p9c1 to p9c16). Dialogue lines: 937. Classification: Walk + press A 12, Timing / skill input 4.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE9.md`, `data/quests/phase9.json`, `data/story/cutscenes/phase9/`, `data/story/flags/phase9.json`, `tests/phase9_story.test.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p9c1` · Chapter 55: The Morning After the Grand Nap

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p9c1`, Chapter 55: The Morning After the Grand Nap. Scripts: 8 in `data/story/cutscenes/phase9/ch55_58.json`. Quests: `morning_after` “The Morning After” in `data/quests/phase9.json`.
2. **Events and dialogue.** Morning in the hold barracks after a sleepless night under the puffing Suit; see how four crew slept; wake Garrick; tell him you need to talk. Dialogue: 78 lines ((narration) 25, captain 18, garrick 12, pete 6, gristle 5, bob 4, squawks 3, jim 3, +2 more); 1 choice prompt(s) with 3 options. Presentation: shake ×1, spawn ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, gristle, bob, squawks, jim, garrick_asleep, wick. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, jim, gristle, pete, garrick. Rooms: `cargo_hold`. Interactables: `p9_wake` (cargo_hold 15,16). Flags set: 7 (`p9_started`, `p9_morning_pete`, `p9_morning_bob`, `p9_morning_gristle`, `p9_morning_jim`, `p9_nap_concluded`, `p9_baited`); items given: none.
4. **Current player actions and mechanics.** Objectives: “See how everyone slept (Pete, Bob in his net, Gristle in his belts, Salty Jim)” [event×4]; “Wake the Grand Stenchmaster (the hammock over your bunk)” [flag]; “Tell him you need to talk (him)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A wake-up round; carries the barracks layout from p8c9 forward.
7. **Proposed primary mechanic.** Keep as narrative; crew sleep quality from the p8c9 layout feeds their condition (fatigue) here.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p9.start -> p9c1.begin. Start flag: `p9_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room cargo_hold, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow, npc gristle). In-room hooks into this chapter: map objects in cargo_hold ×1; NPC dialogue in bob, garrick, gristle, jim, pete.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'being puffed on' and the snore count must stay as written. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p9c2` · Chapter 56: A Completely Authentic History

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p9c2`, Chapter 56: A Completely Authentic History. Scripts: 7 in `data/story/cutscenes/phase9/ch55_58.json`. Quests: `completely_authentic` “A Completely Authentic History” in `data/quests/phase9.json`.
2. **Events and dialogue.** Garrick, on his rug before the Mark II, gives 'A Completely Authentic History' of the Grand Stenchmaster office; the captain asks four questions and sets a trap. Dialogue: 111 lines (garrick 50, (narration) 20, captain 17, jim 8, pete 8, gristle 4, bob 3, ned 1); 1 choice prompt(s) with 6 options. Presentation: vista ×3, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, jim, pete, gristle, bob, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 9 (`p9_ch56_started`, `clearance_sticker_seen`, `p9_heard_sacred_stench`, `princess_stenchalina_heard`, `sash_bearer_origin_heard`, `five_grand_treasures_heard`, `former_stenchmasters_heard`, `sash_origin_confrontation`, `p9_trap_sprung`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Ask what a Grand Stenchmaster is for (him, on his rug)” [flag]; “Ask who wore the sash first (him)” [flag]; “Ask about the treasures of the office (him)” [flag]; “Ask about the great Stenchmasters of old (him)” [flag]; “Thank him for a magnificent explanation (him)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Question-and-answer with a hidden trap; a natural lie-detection puzzle.
7. **Proposed primary mechanic.** Cross-examination: each answer contains a detail that contradicts something seen earlier (the sleep-talk, the sash label); spotting contradictions unlocks the 'trap' question and strengthens p9c3.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Picking the right contradiction (no time pressure).
10. **Failure conditions and consequences.** Wrong pick → Garrick embellishes further (more jokes); the trap still works but with fewer witnesses convinced.
11. **Dependencies.** Entry: p9c1 (p9c1.talk -> p9c2.begin). Start flag: `p9_ch56_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 0 (none). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** Garrick's history is 50 lines of comedy; the puzzle only asks the player to listen to it closely.

### `p9c3` · Chapter 57: No Receipt

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p9c3`, Chapter 57: No Receipt. Scripts: 8 in `data/story/cutscenes/phase9/ch55_58.json`. Quests: `no_receipt` “No Receipt” in `data/quests/phase9.json`.
2. **Events and dialogue.** No Receipt: call four witnesses (Pete, Gristle, Bob, Squawks), put the evidence to Garrick ('Seventy per cent off'), return the explorer's hat to the trunk. Dialogue: 62 lines (garrick 19, captain 17, (narration) 15, pete 3, gristle 3, bob 2, squawks 2, ned 1); 0 choice prompt(s) with 0 options. Presentation: shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, gristle, bob, squawks, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): squawks, bob, gristle, pete, garrick. Rooms: `cargo_hold`. Interactables: `p9_trunk` (cargo_hold 12,12). Flags set: 9 (`p9_ch57_started`, `p9_witness_pete`, `p9_witness_gristle`, `p9_witness_bob`, `p9_witness_squawks`, `p9_spiritual_age`, `lost_fart_attempt_three`, `p9_hat_grabbed`, `p9_hat_confiscated`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Call your witnesses (Pete, Gristle, Bob, and Squawks)” [event×4]; “Put it to the Grand Stenchmaster (him)” [flag]; “Put the explorer's hat back in the costume trunk, where it belongs (the trunk)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A courtroom payoff of p8c13's eavesdropping.
7. **Proposed primary mechanic.** Witness order: present testimony in the right order (each witness only remembers part of the sleep-talk); strength depends on p8c13 and p9c2.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Ordering puzzle.
10. **Failure conditions and consequences.** Weak case → Garrick keeps one extra privilege (dialogue only).
11. **Dependencies.** Entry: p9c2 (p9c2.trap -> p9c3.begin). Start flag: `p9_ch57_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (npc pete, npc gristle, npc bob, npc squawks). In-room hooks into this chapter: map objects in cargo_hold ×1; NPC dialogue in bob, garrick, gristle, pete, squawks.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'What is a bin.' / 'WHO SAID THAT?' stay; the player builds the case.

### `p9c4` · Chapter 58: The Grand Sash Bureaucracy

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p9c4`, Chapter 58: The Grand Sash Bureaucracy. Scripts: 5 in `data/story/cutscenes/phase9/ch55_58.json`. Quests: `sash_bureaucracy` “The Grand Sash Bureaucracy” in `data/quests/phase9.json`.
2. **Events and dialogue.** Garrick moves on to 'staffing': he recruits Bob as an assistant, pins up an organisation chart, tries to employ Squawks as herald; make him say it in plain words. Dialogue: 72 lines (garrick 25, (narration) 17, captain 9, bob 5, ned 5, pete 4, squawks 4, gristle 2, +1 more); 0 choice prompt(s) with 0 options. Presentation: insert ×1, move ×1, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, bob, ned, pete, squawks, gristle, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, squawks, garrick. Rooms: `cargo_hold`. Interactables: `p9_chart` (cargo_hold 5,10). Flags set: 7 (`p9_ch58_started`, `p9_bob_resigned`, `bob_refused_assistant`, `sash_bureaucracy_titles`, `p9_org_chart_seen`, `p9_herald_refused`, `plain_language_admission`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Find out what he wants with Bob (Bob)” [flag]; “Look at the organisation chart (the board by the barrels)” [flag]; “Protect Squawks from employment (Squawks)” [flag]; “Make him say it in plain words (him)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Bureaucracy satire; dialogue-led.
7. **Proposed primary mechanic.** Keep as narrative.
8. **Secondary mechanics.** Optional: inspect the org chart as a codex page.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p9c3 (p9c3.trunk -> p9c4.begin). Start flag: `p9_ch58_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room cargo_hold, dialogue p9). In-room hooks into this chapter: map objects in cargo_hold ×1; NPC dialogue in bob, garrick, squawks.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'The problem is STAFFING.' and the lighthouse gaze stay untouched. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p9c5` · Chapter 59: LAND!

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p9c5`, Chapter 59: LAND!. Scripts: 3 in `data/story/cutscenes/phase9/ch59_62.json`. Quests: `land_ho` “LAND!” in `data/quests/phase9.json`.
2. **Events and dialogue.** LAND! Ned sees an island through a crack in the hull; check it against the treasure map. Dialogue: 35 lines ((narration) 17, captain 6, garrick 6, ned 3, pete 1, squawks 1, gristle 1); 0 choice prompt(s) with 0 options. Presentation: vista ×2, giveItem ×1, insert ×1, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, ned, pete, squawks, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `cargo_hold`. Interactables: `p9_gap_look` (cargo_hold 6,3), `p9_gap_map` (cargo_hold 6,3). Flags set: 4 (`p9_ch59_started`, `crownskull_discovered`, `crownskull_map_unlocked`, `crownskull_isle_sighted`); items given: crimson_chart.
4. **Current player actions and mechanics.** Objectives: “See what Ned's seen (the gap in the hull, by the stairs)” [flag]; “Check it against your treasure map (your sea chest, by your bunk)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Short discovery beat.
7. **Proposed primary mechanic.** Keep as is (35 lines).
8. **Secondary mechanics.** Map comparison as a quick 'match the silhouette' check (optional).
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p9c4 (p9c4.plain -> p9c5.begin). Start flag: `p9_ch59_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room cargo_hold, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow, npc gristle). In-room hooks into this chapter: map objects in cargo_hold ×2; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'I've been saying it for ages. LAND.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p9c6` · Chapter 60: The Landing Problem

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p9c6`, Chapter 60: The Landing Problem. Scripts: 4 in `data/story/cutscenes/phase9/ch59_62.json`. Quests: `landing_problem` “The Landing Problem” in `data/quests/phase9.json`.
2. **Events and dialogue.** The landing problem: reef, rotten ship, sharks, small delicious boats; call a council at the board; go through six options; the Crimson Chart replaces the org chart. Dialogue: 48 lines (garrick 13, captain 13, (narration) 6, hale 4, gristle 3, pete 3, jim 2, squawks 2, +2 more); 1 choice prompt(s) with 7 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, hale, gristle, pete, jim, squawks, bob, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `cargo_hold`. Interactables: `p9_council` (cargo_hold 5,10), `p9_options` (cargo_hold 5,10). Flags set: 9 (`p9_ch60_started`, `p9_council`, `p9_opt_beach`, `p9_opt_row`, `p9_opt_swim`, `p9_opt_circle`, `p9_opt_wait`, `p9_opt_lure`, `grand_sharkmaster_revived`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Call a council round the map (the board by the barrels)” [flag]; “Go through every option (the board)” [event×6]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A planning screen; the six options could be real plans with real outcomes.
7. **Proposed primary mechanic.** Landing planner: choose route, boat, decoy and lure from the options; the chosen plan sets the parameters of the p9c8 landing (more risk, fewer steps, or safer and longer).
8. **Secondary mechanics.** Garrick's options remain as jokes in the list.
9. **Enemies, puzzles, timers, hazards, resources.** Trade-offs between time, risk and resources.
10. **Failure conditions and consequences.** None here; consequences appear in p9c8.
11. **Dependencies.** Entry: p9c5 (p9c5.map -> p9c6.begin). Start flag: `p9_ch60_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room cargo_hold, dialogue p9). In-room hooks into this chapter: map objects in cargo_hold ×2; NPC dialogue in none.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** Hale's 'Small. Wooden. Delicious.' stays as the boat-risk line.

### `p9c7` · Chapter 61: The Grand Sharkmaster

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p9c7`, Chapter 61: The Grand Sharkmaster. Scripts: 5 in `data/story/cutscenes/phase9/ch59_62.json`. Quests: `grand_sharkmaster` “The Grand Sharkmaster” in `data/quests/phase9.json`.
2. **Events and dialogue.** Garrick appoints Pete 'Grand Sharkmaster'; get the blue sash off Pete; ask him for a landing plan; the Frog Tax Man on the Mark II; hear Pete's plan. Dialogue: 80 lines (pete 25, (narration) 19, garrick 17, captain 7, gristle 4, jim 2, ned 2, squawks 2, +2 more); 0 choice prompt(s) with 0 options. Presentation: tvProgram ×3, insert ×2, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, garrick, gristle, jim, ned, squawks, franklin, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): pete. Rooms: `cargo_hold`. Interactables: `p9_tv` (cargo_hold 11,11). Flags set: 10 (`p9_ch61_started`, `pete_mock_title_grand_sharkmaster`, `blue_sash_exists`, `pete_blue_sash_on`, `blue_sash_refused`, `crayon_paper_torn`, `p9_forty_seconds`, `p9_ftm_storm_seen`, `ftm_sharkstorm_coincidence`, `landing_plan_made`); items given: none.
4. **Current player actions and mechanics.** Objectives: “See who's been appointed (the Grand Stenchmaster)” [flag]; “Get the blue sash off Pete (Pete)” [flag]; “Ask the Grand Sharkmaster for a landing plan (Pete)” [flag]; “See what the Frog Tax Man's doing (the Mark II)” [flag]; “Hear Pete's plan (Pete, at the board)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Pete becomes the shark specialist (a natural crew station later).
7. **Proposed primary mechanic.** Keep as narrative; establishes Pete's Sharkmaster role used by crew stations (shark watch).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p9c6 (p9c6.nap -> p9c7.begin). Start flag: `p9_ch61_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (npc pete, dialogue p9). In-room hooks into this chapter: map objects in cargo_hold ×1; NPC dialogue in pete.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'CONGRATULATIONS.' and the clock-finger appointment stay. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p9c8` · Chapter 62: The Lee-Side Landing

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p9c8`, Chapter 62: The Lee-Side Landing. Scripts: 13 in `data/story/cutscenes/phase9/ch59_62.json`. Quests: `lee_side_landing` “The Lee-Side Landing” in `data/quests/phase9.json`.
2. **Events and dialogue.** The lee-side landing: helm south of the reef, make lines fast, ready an empty decoy boat, watch the fins with Pete, throw the lure, lower the boats and row for the beach (reef_passage map). Dialogue: 66 lines ((narration) 32, captain 10, pete 9, garrick 6, hale 3, squawks 2, jim 2, nell 1, +1 more); 3 choice prompt(s) with 7 options. Presentation: transition ×3, vista ×2, spawn ×2, move ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, garrick, hale, squawks, jim, nell, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): pete. Rooms: `crownskull_isle`, `main_deck`, `reef_passage`. Interactables: `p9_helm` (main_deck 9,6), `p9_lines` (main_deck 9,14), `p9_decoy` (main_deck 4,24), `p9_lure` (main_deck 11,22), `p9_boats` (main_deck 4,12). Flags set: 9 (`p9_ch62_started`, `p9_helm_done`, `p9_lines_done`, `p9_decoy_ready`, `p9_window_found`, `p9_lure_thrown`, `p9_rowing`, `p9_landed`, `crownskull_landed`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Bring her round, south of the reef (the helm)” [flag]; “Make the lines fast (the capstan)” [flag]; “Ready the decoy boat. EMPTY. (the port davits)” [flag]; “Watch the fins with Pete for a window (Pete, at the starboard rail)” [flag]; “Throw the lure (the reeking timber, starboard side)” [flag]; “Lower the boats and row for the beach (the port davits)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×5.
5. **Classification.** Timing / skill input (timing bar (repair) ×5). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Already six steps and five timing bars over three maps; the strongest candidate in Phase 9 for an action set-piece.
7. **Proposed primary mechanic.** Reef run: steer through the reef passage (course dial with current), time the lure throw to Pete's fin call, then a rowing segment where sharks are drawn off by the decoy.
8. **Secondary mechanics.** Plan from p9c6 sets the difficulty knobs (decoy quality, lure strength).
9. **Enemies, puzzles, timers, hazards, resources.** Reef rocks (hull damage), shark fins with telegraphed charges, current drift.
10. **Failure conditions and consequences.** Boat holed → swim the last stretch (exposure to sharks, HP) and lose some supplies; ship holed → Ship Integrity damage persists.
11. **Dependencies.** Entry: p9c7 (p9c7.pete_plan -> p9c8.begin). Start flag: `p9_ch62_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room crownskull_isle, room reef_passage, room cargo_hold, room crew_quarters, room galley, room main_deck, npc garrick, npc squawks). In-room hooks into this chapter: map objects in reef_passage ×19, main_deck ×5; NPC dialogue in pete.
12. **Complexity and priority.** Complexity L, priority P1.
13. **Preserving story and humour; variety.** Squawks in the padded pouch and 'EMPTY.' decoy instruction stay; it is funnier when the player actually times the lure.

### `p9c9` · Chapter 63: Crownskull Isle

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p9c9`, Chapter 63: Crownskull Isle. Scripts: 1 in `data/story/cutscenes/phase9/ch63_66.json`. Quests: `crownskull_isle` “Crownskull Isle” in `data/quests/phase9.json`; `isle_curiosities` “Curiosities of Crownskull Isle” in `data/quests/phase9.json`.
2. **Events and dialogue.** Ashore on Crownskull Isle; Garrick arrives in full regalia; a treasure-map trail (trail, ford, tooth boulder, statue's arm, X) plus seven optional curiosities. Dialogue: 15 lines (garrick 4, captain 4, (narration) 3, squawks 2, pete 1, ned 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, pete, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `glade_e`, `glade_ne`, `glade_w`, `isle_clearing`, `isle_ford`, `isle_fork`, `isle_reef_point`, `isle_ruins`, `isle_statue`, `isle_trail`, `isle_view`, `isle_west_beach`. Interactables: none. Flags set: 2 (`p9_ch63_started`, `p9_isle_briefed`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Follow the jungle trail north from the beach” [visit]; “Cross the river at the ford” [visit]; “Find the broken-tooth boulder” [visit]; “Follow the statue's arm” [visit]; “Find the X (the clearing under the skull)” [visit]; “The reef point (east along the beach)” [visit]; “The western beach” [visit]; “The ruins (north of the clearing)” [visit]; “The view from the ridge path (up the rocky slope)” [visit]; “The glade by the river, off the ridge path” [visit]; “The glade west of the jungle trail” [visit]; “The glade east of the jungle trail” [visit]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The game's first real exploration map with visit objectives. Good base for an overworld-style exploration chapter.
7. **Proposed primary mechanic.** Exploration with hazards: the trail has real obstacles (river ford current, slippery rocks, a jungle maze) and the map clues must be read rather than followed by markers.
8. **Secondary mechanics.** Curiosities give tangible rewards (supplies, a tool upgrade, codex entries).
9. **Enemies, puzzles, timers, hazards, resources.** Ford current, jungle wildlife (crabs, monkeys stealing items – reuse enemy system), heat/thirst light resource.
10. **Failure conditions and consequences.** Swept downstream → start at the beach side of the ford; items stolen → chase.
11. **Dependencies.** Entry: p9c8 (p9c8.shore -> p9c9.begin). Start flag: `p9_ch63_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room crownskull_isle). In-room hooks into this chapter: map objects in none; NPC dialogue in none.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'Formal dress is required. For an island.' stays; Garrick keeping his boots dry can be a running obstacle (he must be carried over the ford).

### `p9c10` · Chapter 64: The Fortune of the Crimson Kings

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p9c10`, Chapter 64: The Fortune of the Crimson Kings. Scripts: 8 in `data/story/cutscenes/phase9/ch63_66.json`. Quests: `crimson_fortune` “The Fortune of the Crimson Kings” in `data/quests/phase9.json`.
2. **Events and dialogue.** The clearing: cut vines off the marker stone; ask five crew what they'll do with their share; ask Squawks. Dialogue: 47 lines (captain 15, (narration) 12, garrick 4, bob 3, pete 3, gristle 3, squawks 3, jim 2, +1 more); 0 choice prompt(s) with 0 options. Presentation: insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, bob, pete, gristle, squawks, jim, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, ned, jim, gristle, pete. Rooms: `crownskull_isle`. Interactables: `p9_vines` (crownskull_isle 29,22). Flags set: 10 (`p9_ch64_started`, `crimson_fortune_site_found`, `crimson_fortune_found`, `p9_dream_pete`, `p9_dream_bob`, `p9_dream_jim`, `p9_dream_gristle`, `p9_dream_ned`, `squawks_share_promised`, `garrick_share_denied`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Cut the vines off the marker stone (the clearing)” [flag]; “Ask the crew what they'll do with their share (Pete, Bob, Salty Jim, Gristle, Ned)” [event×5]; “Ask Squawks (in your pouch: talk to yourself... well, to him)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A breather after the trek.
7. **Proposed primary mechanic.** Keep as narrative (crew dreams are character beats).
8. **Secondary mechanics.** Vine cutting with the existing timing bar.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: story trigger p9c10_begin: {all:[{objectiveDone:crownskull_isle.x},{notFlag:p9_ch64_started}]}. Start flag: `p9_ch64_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room crownskull_isle, npc garrick, npc bob, npc ned, npc jim, npc gristle, npc pete, trigger). In-room hooks into this chapter: map objects in crownskull_isle ×1; NPC dialogue in bob, gristle, jim, ned, pete.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** The crew's dreams are setups for the Shark Shanty heartbreak; leave them. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p9c11` · Chapter 65: Seven Floors Down

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p9c11`, Chapter 65: Seven Floors Down. Scripts: 6 in `data/story/cutscenes/phase9/ch63_66.json`. Quests: `seven_floors` “Seven Floors Down” in `data/quests/phase9.json`.
2. **Events and dialogue.** Seven floors down: read the inscription; get tools; dig the first floor; give Garrick a turn; dig on. Dialogue: 58 lines ((narration) 35, garrick 12, gristle 6, captain 4, pete 1); 3 choice prompt(s) with 9 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, gristle, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `crownskull_isle`. Interactables: `p9_tools_get` (crownskull_isle 34,26), `p9_dig` (crownskull_isle 28,23). Flags set: 4 (`p9_ch65_started`, `p9_tools_fetched`, `excavation_started`, `garrick_quit_digging`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Get the tools (the pile by the clearing's edge)” [flag]; “Dig the first floor: loose sand (the X)” [flag]; “Give the Grand Stenchmaster a turn (him)” [flag]; “Dig on (the pit)” [event×2]. Mechanics invoked by the scripts: timing bar (repair) ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Digging is a natural resource/stamina loop.
7. **Proposed primary mechanic.** Excavation: each floor has a material (sand, clay, stone, gravel) needing the right tool and technique; stamina and tool durability are resources; crew can take shifts.
8. **Secondary mechanics.** Garrick's 'turn' is a comic interruption (he digs one spoonful).
9. **Enemies, puzzles, timers, hazards, resources.** Cave-ins on soft floors, water seepage on clay, tool breakage on stone.
10. **Failure conditions and consequences.** Cave-in → dig back out (lost progress), tool broken → fetch spare from the beach.
11. **Dependencies.** Entry: p9c10 (p9c10.squawks -> p9c11.begin). Start flag: `p9_ch65_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room crownskull_isle). In-room hooks into this chapter: map objects in crownskull_isle ×2; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'SEVEN FLOORS? That's... that's DAYS.' sets up p9c12; the effort makes his 'technology' tempting.

### `p9c12` · Chapter 66: Stenchmaster Excavation Technology

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p9c12`, Chapter 66: Stenchmaster Excavation Technology. Scripts: 3 in `data/story/cutscenes/phase9/ch63_66.json`. Quests: `excavation_technology` “Stenchmaster Excavation Technology” in `data/quests/phase9.json`.
2. **Events and dialogue.** Garrick proposes Stenchmaster Excavation Technology: a Grand Excavation Release over the hole; listen to the rising noise. Dialogue: 33 lines (garrick 12, (narration) 11, captain 8, pete 1, jim 1); 0 choice prompt(s) with 0 options. Presentation: shake ×3.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 4 (`p9_ch66_started`, `excavation_proposal_rejected`, `launch_sequence_started`, `release_triggered`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Hear the Grand Stenchmaster's proposal (him)” [flag]; “Listen. What is that noise? (him)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** 33-line setup.
7. **Proposed primary mechanic.** Keep as is.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p9c11 (p9c11.estimate -> p9c12.begin). Start flag: `p9_ch66_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (room crownskull_isle). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'The rocks go VERY elsewhere.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p9c13` · Chapter 67: RUN

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p9c13`, Chapter 67: RUN. Scripts: 10 in `data/story/cutscenes/phase9/ch67_70.json`. Quests: `run` “RUN” in `data/quests/phase9.json`.
2. **Events and dialogue.** RUN: flee the clearing west to the beach then to the ruins; shift a stone block, brace a wall, drag a beam, hang a cloth, put Squawks somewhere safe, watch the clearing from a gap. Dialogue: 61 lines ((narration) 25, pete 7, captain 6, gristle 6, bob 5, garrick_far 4, squawks 3, jim 3, +2 more); 0 choice prompt(s) with 0 options. Presentation: shake ×2, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, gristle, bob, garrick_far, squawks, jim, garrick, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crownskull_isle`, `isle_ruins`, `isle_west_beach`. Interactables: `p9_job_stone` (crownskull_isle 26,15), `p9_job_brace` (crownskull_isle 34,8), `p9_job_beam` (crownskull_isle 21,16), `p9_job_cloth` (crownskull_isle 32,12), `p9_job_squawks` (crownskull_isle 30,9), `p9_job_watch` (crownskull_isle 31,19), `p9_job_watch_w` (crownskull_isle 23,19), `p9_watch_gap_e` (crownskull_isle 31,19), `p9_watch_gap_w` (crownskull_isle 23,19). Flags set: 9 (`p9_ch67_started`, `p9_west_trap`, `p9_in_ruins`, `p9_shelter_stone`, `p9_shelter_brace`, `p9_shelter_beam`, `p9_shelter_cloth`, `p9_squawks_sheltered`, `ruins_shelter_ready`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Away from him! West, to the beach (the path west from the clearing)” [visit]; “To the ruins! (north, up the beach path to the west gate)” [visit]; “Shift a stone block into the gap (the shelter's broken corner)” [flag]; “Brace the cracked wall (the shelter's east wall)” [flag]; “Drag the fallen beam over for a roof (the court)” [flag]; “Hang a cloth over the doorway (the shelter door)” [flag]; “Put Squawks somewhere safe (inside the shelter)” [flag]; “Watch the clearing (step into a gap in the ruins' south wall)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×4.
5. **Classification.** Timing / skill input (timing bar (repair) ×4). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Already a flight + fortify sequence with six jobs; ideal for a timed defence-prep chapter.
7. **Proposed primary mechanic.** Fortify the shelter against a countdown (Garrick's build-up): jobs with different durations, crew helpers assigned to jobs, shelter strength computed from what was finished.
8. **Secondary mechanics.** The flight itself as a chase (path choices through the jungle).
9. **Enemies, puzzles, timers, hazards, resources.** Countdown, heavy objects to push/drag, limited helpers.
10. **Failure conditions and consequences.** Shelter strength low → more shark impacts in p9c14 (harder survival).
11. **Dependencies.** Entry: p9c12 (p9c12.launch -> p9c13.begin). Start flag: `p9_ch67_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 9 (room crownskull_isle, npc garrick, npc bob, npc ned, npc jim, npc gristle, npc pete, trigger). In-room hooks into this chapter: map objects in crownskull_isle ×9; NPC dialogue in none.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'I've got ye. I've got ye.' to Squawks and Garrick's one-eye aim stay.

### `p9c14` · Chapter 68: Fire in the Hole

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p9c14`, Chapter 68: Fire in the Hole. Scripts: 2 in `data/story/cutscenes/phase9/ch67_70.json`. Quests: `fire_in_the_hole` “Fire in the Hole” in `data/quests/phase9.json`.
2. **Events and dialogue.** Fire in the Hole: Garrick's aiming adjustments; the release; sharks rain (marked before they land); get back to Squawks in the shelter. Dialogue: 37 lines ((narration) 19, captain 5, ned 4, squawks 4, pete 2, garrick 2, garrick_far 1); 0 choice prompt(s) with 0 options. Presentation: vista ×4, shake ×4.
3. **Characters, locations, props, flags.** Speaking characters: ned, squawks, pete, garrick, garrick_far. NPCs with dialogue keyed to an objective (hints, reactions or completions): squawks. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 5 (`p9_ch68_started`, `grand_excavation_blast`, `great_sharkstorm_inland`, `p9_great_white_rain_survived`, `megalodon_introduced`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Get back to Squawks in the shelter! (the sharks are marked before they land)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Existing 'sharks marked before they land' is a dodging mechanic; it can be the climax action of the phase.
7. **Proposed primary mechanic.** Survive the barrage: dodge marked impact tiles across the ruins to reach the shelter; the shelter built in p9c13 absorbs hits.
8. **Secondary mechanics.** Rescue a crew member caught outside (optional, morale).
9. **Enemies, puzzles, timers, hazards, resources.** Telegraphed shark impacts with increasing density, debris.
10. **Failure conditions and consequences.** Hit → knocked back and dazed (HP); out of HP → wake inside the shelter with a crew member injured (persistent for a chapter).
11. **Dependencies.** Entry: p9c13 (p9c13.watch -> p9c14.begin). Start flag: `p9_ch68_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (dialogue p9, room crownskull_isle, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in none; NPC dialogue in squawks.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'He's making aiming adjustments.' / 'There's no such thing as aiming adjustments.' stays before the barrage.

### `p9c15` · Chapter 69: Vertical Relocation

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p9c15`, Chapter 69: Vertical Relocation. Scripts: 5 in `data/story/cutscenes/phase9/ch67_70.json`. Quests: `vertical_relocation` “Vertical Relocation” in `data/quests/phase9.json`.
2. **Events and dialogue.** The column keeps going; the crater shows the Fortune blown out of the Miser's Floor; look at the megalodon in the lagoon wearing the crown. Dialogue: 52 lines ((narration) 32, captain 7, garrick_far 4, squawks 3, pete 2, ned 1, garrick 1, bob 1, +1 more); 0 choice prompt(s) with 0 options. Presentation: vista ×3, shake ×1, giveItem ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick_far, squawks, pete, ned, garrick, bob, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crownskull_isle`. Interactables: `p9_crater` (crownskull_isle 26,25), `p9_crater_look` (crownskull_isle 26,25), `p9_megalodon` (crownskull_isle 15,12), `p9_megalodon_look` (crownskull_isle 15,12). Flags set: 9 (`p9_ch69_started`, `crimson_fortune_exposed`, `great_sharkstorm_treasure_laden`, `fortune_scattered`, `megalodon_crowned`, `garrick_dusty`, `p9_squawks_back`, `crater_treasure_contaminated`, `p9_crowned_seen`); items given: reeking_doubloons.
4. **Current player actions and mechanics.** Objectives: “Go and look in the crater (the clearing)” [flag]; “Look at the megalodon (the lagoon, west of the ruins)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Reveal chapter.
7. **Proposed primary mechanic.** Keep as narrative (vistas).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p9c14 (p9c14.survived -> p9c15.begin). Start flag: `p9_ch69_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (dialogue p9, room crownskull_isle, npc garrick, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in crownskull_isle ×2; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** The list of treasure going skyward is the gag. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p9c16` · Chapter 70: The Shark Shanty

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p9c16`, Chapter 70: The Shark Shanty. Scripts: 3 in `data/story/cutscenes/phase9/ch67_70.json`. Quests: `recover_crimson_fortune` “Recover the Crimson Fortune” (left OPEN) in `data/quests/phase9.json`.
2. **Events and dialogue.** The Shark Shanty: the sharks wear the treasure and sing; the captain resolves to recover it. Opens the 'Recover the Crimson Fortune' quest (crown from the megalodon, treasure on sharks, loose treasure in the storm, deal with the storm). NOTE: this quest is still open at the end of Phase 17 – none of its four target flags is set by any script. Dialogue: 82 lines (captain 25, (narration) 18, garrick 12, shark_chorus 10, pete 5, gristle 3, bob 2, jim 2, +3 more); 0 choice prompt(s) with 0 options. Presentation: vista ×1, shake ×1, move ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, shark_chorus, pete, gristle, bob, jim, ned, squawks, hammerhead. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 5 (`p9_ch70_started`, `rage_shanty_seen`, `p9_confronted`, `recover_fortune_unlocked`, `p9_complete`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Recover the Crimson King's Crown (from the crowned megalodon)” [flag]; “Retrieve the treasure the sharks are wearing” [flag]; “Recover the loose treasure inside the Great Sharkstorm” [flag]; “Deal with the Great Sharkstorm” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** An explicit open-ended quest the overhaul can use as a recurring side objective (shark 'bounties').
7. **Proposed primary mechanic.** Keep the shanty; turn 'Recover the Crimson Fortune' into a persistent bounty system: specific named sharks carry treasure and can be fought in Shark Duty / field combat across later phases.
8. **Secondary mechanics.** Megalodon as a recurring optional boss (crown).
9. **Enemies, puzzles, timers, hazards, resources.** Named treasure sharks with unique patterns.
10. **Failure conditions and consequences.** None here.
11. **Dependencies.** Entry: p9c15 (p9c15.megalodon -> p9c16.begin). Start flag: `p9_ch70_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (npc garrick, dialogue p9, room crownskull_isle, room main_deck, npc squawks, npc bob, npc ned, npc jim). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** The shark chorus stays word for word; the bounty system lets the player get the last laugh later.
