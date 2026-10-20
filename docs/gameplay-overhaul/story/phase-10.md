# Story inventory, Phase 10: The Great Sharkstorm Spout Catastrophe

Chapters: 25 (p10c1 to p10c25). Dialogue lines: 1090. Classification: Walk + press A 14, Timing / skill input 8, Choice or puzzle prompt 2, Dialogue / cutscene only 1.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE10.md`, `data/quests/phase10.json`, `data/story/cutscenes/phase10/`, `data/story/flags/phase10.json`, `tests/phase10_story.test.js`, `tests/phase10Play.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p10c1` · Chapter 71: Not Pete's Fault

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p10c1`, Chapter 71: Not Pete's Fault. Scripts: 1 in `data/story/cutscenes/phase10/ch71_77.json`. Quests: `saddest_salvage` “The Saddest Salvage” in `data/quests/phase10.json`.
2. **Events and dialogue.** Pete pleads 'Not Pete's fault' on the crater rim; search eight glints around the rim; ask Garrick's opinion; give Gristle the haul to count. Dialogue: 53 lines ((narration) 17, captain 13, pete 10, garrick 9, bob 2, squawks 2); 0 choice prompt(s) with 0 options. Presentation: move ×3, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, garrick, bob, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, gristle. Rooms: `crownskull_isle`. Interactables: `p10_salv_1` (crownskull_isle 25,27), `p10_salv_2` (crownskull_isle 29,27), `p10_salv_3` (crownskull_isle 33,26), `p10_salv_4` (crownskull_isle 34,23), `p10_salv_5` (crownskull_isle 33,22), `p10_salv_6` (crownskull_isle 21,25), `p10_salv_7` (crownskull_isle 24,22), `p10_salv_8` (crownskull_isle 23,24). Flags set: 4 (`p10_started`, `pete_blame_cleared`, `blackbeard_identity_crisis`, `p10_ch72_started`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Search the crater rim (the glints on the south and east side)” [event×4]; “Ask the Grand Stenchmaster for his professional opinion (him, on the rim)” [flag]; “Search the rest of the rim (the glints on the north and west side)” [event×4]; “Give Gristle the haul to count (Gristle)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A search with a real economic payoff (the remaining treasure).
7. **Proposed primary mechanic.** Salvage search with hazards: the crater rim is unstable (crumbling tiles), some glints are bait (crabs), and the haul is a real doubloon value carried forward.
8. **Secondary mechanics.** Gristle's tally becomes the ship's treasury number (persistent).
9. **Enemies, puzzles, timers, hazards, resources.** Crumbling rim tiles, hot ash patches, crabs.
10. **Failure conditions and consequences.** Slide into the crater → climb back (time), lose an item.
11. **Dependencies.** Entry: npc:pete -> p10c1.begin (in-room hook). Start flag: `p10_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room crownskull_isle, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in none; NPC dialogue in pete.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** Pete's 'I was APPOINTED. Against my will. With a sash.' stays as the opener.

### `p10c2` · Chapter 72: The Saddest Salvage

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p10c2`, Chapter 72: The Saddest Salvage. Scripts: 12 in `data/story/cutscenes/phase10/ch71_77.json`. Quests: `wealthy_sharks` “Wealthy Sharks” in `data/quests/phase10.json`.
2. **Events and dialogue.** The Saddest Salvage: 27 warm coins; walk back down the trail; the tiara falls on the trail – get it; row back to the Revenge. Dialogue: 45 lines ((narration) 24, garrick 7, captain 5, gristle 4, squawks 2, ned 1, jim 1, pete 1); 0 choice prompt(s) with 0 options. Presentation: insert ×1, giveItem ×1, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, gristle, squawks, ned, jim, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crownskull_isle`, `isle_trail`. Interactables: `p10_trig_tiara` (crownskull_isle 27,51), `p10_tiara_look` (crownskull_isle 29,53), `p10_boats` (crownskull_isle 25,62), `p10_boats_b` (crownskull_isle 34,62). Flags set: 16 (`p10_salv_said_smell`, `p10_salv_1`, `p10_salv_2`, `p10_salv_3`, `p10_salv_4`, `p10_salv_5`, `p10_salv_6`, `p10_salv_7`, `p10_salv_8`, `p10_half_said`, +6 more); items given: crater_salvage.
4. **Current player actions and mechanics.** Objectives: “Head back down the jungle trail, toward the beach” [visit]; “The tiara! It came down on the trail. GET IT.” [flag]; “Row back to the Revenge (the boats on the landing beach)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A return journey; the tiara is a small chase.
7. **Proposed primary mechanic.** Tiara grab: the tiara lands near a shark-wary crab/monkey thief; quick chase on the trail.
8. **Secondary mechanics.** Rowing back as a short shark-watch segment (reuse p9c8 rowing).
9. **Enemies, puzzles, timers, hazards, resources.** Thief chase, sharks circling the boats.
10. **Failure conditions and consequences.** Thief escapes → tiara lost (one less treasure); row too slow → boat bitten (supplies lost).
11. **Dependencies.** Entry: story trigger p10_salvage_half: {all:[{objectiveDone:saddest_salvage.first},{notFlag:p10_half_said}]}; story trigger p10_salvage_done: {all:[{objectiveDone:saddest_salvage.rest},{notFlag:p10_rest_said}]}. Start flag: `p10_ch72_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 12 (room crownskull_isle, trigger, dialogue p10). In-room hooks into this chapter: map objects in crownskull_isle ×8; NPC dialogue in garrick, gristle.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'They smell exactly like him.' stays.

### `p10c3` · Chapter 73: Wealthy Sharks

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p10c3`, Chapter 73: Wealthy Sharks. Scripts: 6 in `data/story/cutscenes/phase10/ch71_77.json`. Quests: none (no quest; pure cutscene chapter).
2. **Events and dialogue.** Wealthy Sharks: a bull shark wearing pearls; Pete admires; 'EXTREMELY CRIMINAL'. Dialogue: 32 lines ((narration) 17, captain 8, squawks 5, pete 2); 1 choice prompt(s) with 2 options. Presentation: shake ×1, vista ×1, transition ×1.
3. **Characters, locations, props, flags.** Speaking characters: squawks, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `main_deck`. Interactables: none. Flags set: 7 (`p10_fly_pearls`, `p10_fly_belt`, `p10_shark_landed`, `p10_tiara_fallen`, `p10_tiara_taken`, `p10_tiara_stolen`, `crew_returned_to_ship`); items given: none.
4. **Current player actions and mechanics.** Objectives: no objectives: the player watches and advances dialogue. Mechanics invoked by the scripts: none.
5. **Classification.** Dialogue / cutscene only. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Short (32 lines).
7. **Proposed primary mechanic.** Keep as narrative.
8. **Secondary mechanics.** Seed the named-shark bounty list (pearl bull shark).
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: story trigger p10_tiara: {all:[{objectiveDone:wealthy_sharks.down},{notFlag:p10_tiara_fallen}]}. Start flag: `p10_ch73_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room crownskull_isle, trigger). In-room hooks into this chapter: map objects in crownskull_isle ×7; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Extremely criminal. Sorry, Captain.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p10c4` · Chapter 74: The Participation Prize

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p10c4`, Chapter 74: The Participation Prize. Scripts: 2 in `data/story/cutscenes/phase10/ch71_77.json`. Quests: `participation_prize` “The Participation Prize” in `data/quests/phase10.json`.
2. **Events and dialogue.** Aboard; a shadow the size of the ship slides under the hull; something spits out a coin – pick it up (the Participation Prize). Dialogue: 33 lines ((narration) 22, garrick 4, squawks 2, captain 2, ned 1, bob 1, pete 1); 0 choice prompt(s) with 0 options. Presentation: shake ×2, insert ×2, vista ×1, giveItem ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, ned, bob, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `main_deck`. Interactables: `p10_coin` (main_deck 8,13). Flags set: 9 (`p10_aboard`, `p10_ch74_started`, `p10_garrick_brushed`, `megalodon_bling_chain`, `bling_bling_king_revealed`, `p10_coin_spat`, `p10_first_coin`, `participation_coin_obtained`, `bbk_mockery_unlocked`); items given: participation_coin.
4. **Current player actions and mechanics.** Objectives: “Pick up what it spat out (on the deck)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** An ominous beat with the megalodon.
7. **Proposed primary mechanic.** Keep as narrative.
8. **Secondary mechanics.** Optional: a sonar-like 'watch the shadow' moment that teaches the megalodon's tell for later fights.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p10c3 (p10c3.row -> p10c4.begin). Start flag: `p10_ch74_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (room crownskull_isle, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Home, sweet Grand Stenchmaster home.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p10c5` · Chapter 75: The Least Celebratory Celebration

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p10c5`, Chapter 75: The Least Celebratory Celebration. Scripts: 3 in `data/story/cutscenes/phase10/ch71_77.json`. Quests: `treasure_feast` “A Celebration (Allegedly)” in `data/quests/phase10.json`.
2. **Events and dialogue.** The Revenge limps away listing; morale is bad; the captain orders a celebration; get Jim's pantry open, find something to drink, take it up to cook. Dialogue: 31 lines ((narration) 11, captain 9, jim 5, garrick 4, bob 1, squawks 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: jim, garrick, bob, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): jim. Rooms: `cargo_hold`. Interactables: `p10_pantry` (cargo_hold 17,10), `p10_casks_a` (cargo_hold 5,12), `p10_casks_b` (cargo_hold 6,13). Flags set: 3 (`p10_ch75_started`, `bean_pantry_revealed`, `frog_grog_drinks`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Get Jim to open his pantry (Jim, in the hold)” [flag]; “Find something to drink (the water casks, in the hold)” [flag]; “Take it up to the galley and cook (the galley)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Morale as an explicit state; supplies as resources.
7. **Proposed primary mechanic.** Morale restoration: gather ingredients from the hold (pantry, casks) under a supply budget; the feast quality raises crew morale (Crew conditions system).
8. **Secondary mechanics.** Listing ship: the list affects walking (slope push) until repaired in a later chapter.
9. **Enemies, puzzles, timers, hazards, resources.** Limited supplies, spoiled casks.
10. **Failure conditions and consequences.** Poor feast → lower morale carried into p10c17 alternatives.
11. **Dependencies.** Entry: p10c4 (p10c4.coin -> p10c5.begin). Start flag: `p10_ch75_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room cargo_hold). In-room hooks into this chapter: map objects in cargo_hold ×3; NPC dialogue in jim.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'You know morale when you see it, and this isn't it.' stays.

### `p10c6` · Chapter 76: The Grand Galley Grand Chef

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p10c6`, Chapter 76: The Grand Galley Grand Chef. Scripts: 5 in `data/story/cutscenes/phase10/ch71_77.json`. Quests: `grand_galley` “The Grand Galley Grand Chef” in `data/quests/phase10.json`.
2. **Events and dialogue.** Garrick appoints Jim 'Grand Galley Grand Chef'; open the Crying Beans, heat the pot, shake the Spicy Stench Sauce, stop Garrick at the stove. Dialogue: 38 lines ((narration) 12, garrick 10, jim 8, captain 4, pete 2, bob 1, squawks 1); 0 choice prompt(s) with 0 options. Presentation: insert ×2, shake ×1, transition ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, jim, pete, bob, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`, `main_deck`. Interactables: `p10_prep_beans` (galley 5,4), `p10_stove_pot` (galley 1,4), `p10_table_sauce` (galley 7,7), `p10_stove_stop` (galley 1,4). Flags set: 7 (`p10_ch76_started`, `jim_grand_galley_title_refused`, `crying_beans_introduced`, `p10_pot_heated`, `spicy_sauce_introduced`, `p10_too_much_sauce`, `p10_dinner_cooked`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Open the Crying Beans (the prep table)” [flag]; “Heat the pot (the stove)” [flag]; “Shake up the Spicy Stench Sauce (the long table)” [flag]; “Stop the Grand Stenchmaster! (the stove)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×4.
5. **Classification.** Timing / skill input (timing bar (repair) ×4). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A cooking sequence with four timing bars; good for a proper cooking mini-game.
7. **Proposed primary mechanic.** Galley cooking mini-game: a recipe sequence with heat management (too hot → sauce boils over into a fume patch), and Garrick 'helping' by adding ingredients (intercept him).
8. **Secondary mechanics.** Reusable cooking system for later feasts (p10c19).
9. **Enemies, puzzles, timers, hazards, resources.** Heat gauge, boil-overs, Garrick interference.
10. **Failure conditions and consequences.** Boil-over → a red fume patch in the galley (hazard for p10c8–p10c11).
11. **Dependencies.** Entry: map:galley/p10_prep_beans -> p10c6.beans (in-room hook); map:galley/p10_stove_pot -> p10c6.pot (in-room hook). Start flag: `p10_ch76_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (room cargo_hold, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim). In-room hooks into this chapter: map objects in galley ×4; NPC dialogue in none.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'It's led by the cook.' / 'GRAND GALLEY GRAND CHEF' stays.

### `p10c7` · Chapter 77: Shark Catering

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p10c7`, Chapter 77: Shark Catering. Scripts: 5 in `data/story/cutscenes/phase10/ch71_77.json`. Quests: `shark_catering` “Shark Catering” in `data/quests/phase10.json`.
2. **Events and dialogue.** Dinner on deck: Crying Beans in Spicy Stench Sauce; Bob cries; the sharks dump rubbish on the deck – sweep three heaps overboard. Dialogue: 38 lines ((narration) 20, captain 6, bob 4, pete 3, squawks 2, gristle 1, ned 1, jim 1); 0 choice prompt(s) with 0 options. Presentation: vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: bob, pete, squawks, gristle, ned, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `main_deck`. Interactables: `p10_heap_1` (main_deck 5,13), `p10_heap_2` (main_deck 12,15), `p10_heap_3` (main_deck 6,23). Flags set: 7 (`p10_ch77_started`, `luxury_seafood_seen`, `shark_leftovers_seen`, `p10_leftovers_dumped`, `p10_swept_1`, `p10_swept_2`, `p10_swept_3`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Sweep the sharks' rubbish over the side (three heaps on the deck)” [event×3]. Mechanics invoked by the scripts: timing bar (repair) ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Sweeping is a short chore.
7. **Proposed primary mechanic.** Shark rubbish sweep under light pressure (sharks drop more rubbish while you sweep; clear before it clogs the scuppers).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Sharks dropping debris (telegraphed).
10. **Failure conditions and consequences.** Scuppers clog → deck puddle hazard for the night.
11. **Dependencies.** Entry: p10c6 (p10c6.stop -> p10c7.begin). Start flag: `p10_ch77_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room galley, room main_deck). In-room hooks into this chapter: map objects in main_deck ×3; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'They're... crying. In my mouth.' stays.

### `p10c8` · Chapter 78: That Release Moved In

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p10c8`, Chapter 78: That Release Moved In. Scripts: 4 in `data/story/cutscenes/phase10/ch78_83.json`. Quests: `release_moved_in` “That Release Moved In” in `data/quests/phase10.json`.
2. **Events and dialogue.** A WHUMP from the hold: a sauce vat has gone off; red mist; decide where everyone sleeps; Rusty Tom tests the old quarters door. Dialogue: 71 lines ((narration) 25, garrick 12, captain 8, rusty_tom 7, bob 5, ned 4, gristle 3, pete 2, +3 more); 0 choice prompt(s) with 0 options. Presentation: shake ×2, move ×1, spawn ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, rusty_tom, bob, ned, gristle, pete, jim, barnacle_bill, hale. NPCs with dialogue keyed to an objective (hints, reactions or completions): gristle. Rooms: `galley`. Interactables: `p10_quarters_test` (galley 8,12). Flags set: 9 (`p10_ch78_started`, `p10_hold_vented_seen`, `hold_barracks_sauced`, `p10_sleep_discussed`, `rusty_tom_introduced`, `barnacle_bill_introduced`, `p10_quarters_open`, `quarters_reconfirmed_condemned`, `rusty_tom_quarters_test`); items given: none.
4. **Current player actions and mechanics.** Objectives: “See what went off (the hold)” [flag]; “Decide where everyone sleeps (the crew, in the hold)” [flag]; “Rusty Tom checks the old quarters (the old door, in the galley)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Another lost room; ties to the ship-rooms problem (the crew keep losing rooms).
7. **Proposed primary mechanic.** Room-loss management: the hold becomes a red-fume zone; the captain must quickly salvage essential supplies from it (exposure) before deciding where everyone sleeps.
8. **Secondary mechanics.** Sleeping assignment (crew preferences) reused from p8c9 build mode.
9. **Enemies, puzzles, timers, hazards, resources.** Red fume exposure (a different hazard profile: eyes water, vision narrows).
10. **Failure conditions and consequences.** Pass out → hauled out; supplies lost.
11. **Dependencies.** Entry: p10c7 (p10c7.swept -> p10c8.begin). Start flag: `p10_ch78_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room cargo_hold, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in gristle.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'That was... possibly... a vat.' stays.

### `p10c9` · Chapter 79: Shark Suites

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p10c9`, Chapter 79: Shark Suites. Scripts: 5 in `data/story/cutscenes/phase10/ch78_83.json`. Quests: `shark_suites` “Shark Suites” in `data/quests/phase10.json`.
2. **Events and dialogue.** The Gilded Gill catering barge delivers bedding to the sharks; catch two falling pillows. Dialogue: 38 lines ((narration) 21, captain 5, garrick 4, pete 2, gristle 2, ned 1, jim 1, bob 1, +1 more); 0 choice prompt(s) with 0 options. Presentation: shake ×2, vista ×1, transition ×1, spawn ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, gristle, ned, jim, bob, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): ned. Rooms: `galley`, `main_deck`. Interactables: `p10_pillow_1` (main_deck 6,15), `p10_pillow_2` (main_deck 13,13). Flags set: 5 (`p10_ch79_started`, `luxury_bedding_seen`, `p10_pillow_1`, `p10_pillow_2`, `single_pillow_recovered`); items given: none.
4. **Current player actions and mechanics.** Objectives: “See what Ned's seen (Ned, on deck)” [flag]; “Catch a pillow! (they're coming down on the deck)” [event×2]. Mechanics invoked by the scripts: timing bar (repair) ×2.
5. **Classification.** Timing / skill input (timing bar (repair) ×2). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Catching falling items is a natural arcade beat.
7. **Proposed primary mechanic.** Pillow catch: falling bedding with shadows (reuse shark-impact telegraph); catch as many as possible for the crew's beds.
8. **Secondary mechanics.** Count of pillows caught improves sleep quality in p10c10.
9. **Enemies, puzzles, timers, hazards, resources.** Falling items with mixed timing; sharks swooping.
10. **Failure conditions and consequences.** Few pillows → crew sleep on beans (fatigue next day).
11. **Dependencies.** Entry: p10c8 (p10c8.test -> p10c9.begin). Start flag: `p10_ch79_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room main_deck). In-room hooks into this chapter: map objects in main_deck ×2; NPC dialogue in ned.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** The yellow foam cushion 'the size of a rowboat' going into the storm nest is the gag.

### `p10c10` · Chapter 80: Bad Hotel

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p10c10`, Chapter 80: Bad Hotel. Scripts: 4 in `data/story/cutscenes/phase10/ch78_83.json`. Quests: `bad_hotel` “Bad Hotel” in `data/quests/phase10.json`.
2. **Events and dialogue.** Bad Hotel: nine people and a parrot sleep in the galley; lay out bean sacks, make Squawks' bed, pick your spot. Dialogue: 31 lines ((narration) 13, captain 4, squawks 3, garrick 3, jim 2, gristle 2, barnacle_bill 2, pete 1, +1 more); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: squawks, garrick, jim, gristle, barnacle_bill, pete, rusty_tom. NPCs with dialogue keyed to an objective (hints, reactions or completions): squawks. Rooms: `galley`. Interactables: `p10_sacks` (galley 16,8), `p10_basket` (galley 10,7), `p10_bunk` (galley 12,8). Flags set: 7 (`p10_ch80_started`, `p10_sack_1`, `p10_sack_2`, `p10_sack_3`, `p10_squawks_bed`, `galley_hammock_strung`, `galley_night_barracks`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Lay out bean sacks for beds (the sacks by the stores)” [event×3]; “Make up Squawks' bed (his basket)” [flag]; “Pick your spot (the sacks by the long table)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Another improvised barracks.
7. **Proposed primary mechanic.** Keep short; reuse build mode with the galley's furniture (tables, stove) as obstacles.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Space.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p10c9 (p10c9.catch -> p10c10.begin). Start flag: `p10_ch80_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 6 (room galley, room main_deck). In-room hooks into this chapter: map objects in galley ×3; NPC dialogue in squawks.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'There's nothing soft. There's beans.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p10c11` · Chapter 81: Bedtime Television

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p10c11`, Chapter 81: Bedtime Television. Scripts: 3 in `data/story/cutscenes/phase10/ch78_83.json`. Quests: `bedtime_television` “Bedtime Television” in `data/quests/phase10.json`.
2. **Events and dialogue.** Garrick has carried the Mark II up to the galley; bedtime viewing; deal with the kerosene lamp. Dialogue: 25 lines ((narration) 10, garrick 8, captain 2, pete 1, bob 1, ned 1, gristle 1, squawks 1); 1 choice prompt(s) with 2 options. Presentation: tvProgram ×4, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, bob, ned, gristle, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`. Interactables: `p10_tv_bedtime` (galley 16,7), `p10_lamp` (galley 15,6). Flags set: 5 (`p10_ch81_started`, `p10_mk2_moved`, `p10_ftm_bedtime_seen`, `p10_lamp_lit`, `p10_lamp_lowered`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Watch the Frog Tax Man (the Mark II, by the stores)” [flag]; “Do something about that lamp (the kerosene lamp)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Small hazard (the lamp).
7. **Proposed primary mechanic.** Keep; the lamp becomes a fire-risk mini-hazard (trim the wick before it catches a sack).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Lamp flare timer.
10. **Failure conditions and consequences.** Sack catches → smother (timing bar).
11. **Dependencies.** Entry: p10c10 (p10c10.bunk -> p10c11.begin). Start flag: `p10_ch81_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room cargo_hold, room galley, dialogue p10). In-room hooks into this chapter: map objects in galley ×2; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'It goes where the Grand Stenchmaster sleeps, Pete. It's a household.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p10c12` · Chapter 82: Brogath the Bashful

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p10c12`, Chapter 82: Brogath the Bashful. Scripts: 2 in `data/story/cutscenes/phase10/ch78_83.json`. Quests: `brogath_the_bashful` “Brogath the Bashful” in `data/quests/phase10.json`.
2. **Events and dialogue.** Garrick's bedtime story from his stitched book: Brogath the Bashful ('Volume One of Probably Many'). Dialogue: 30 lines (garrick 17, pete 4, (narration) 3, jim 2, bob 1, gristle 1, captain 1, ned 1); 0 choice prompt(s) with 0 options. Presentation: insert ×1, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, jim, bob, gristle, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `galley`. Interactables: `p10_hammock_brogath` (galley 11,8). Flags set: 3 (`p10_ch82_started`, `brogath_legend_heard`, `brogath_unverified`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Hear the bedtime story (the Grand Stenchmaster's hammock)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Introduces Brogath (key later antagonist/character) through a story.
7. **Proposed primary mechanic.** Keep as narrative; the book becomes a codex item that collects 'legend pages' with gameplay hints for later Brogath encounters.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p10c11 (p10c11.lamp -> p10c12.begin). Start flag: `p10_ch82_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 0 (none). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Volume One of Probably Many.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p10c13` · Chapter 83: Sweet Dreams

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p10c13`, Chapter 83: Sweet Dreams. Scripts: 6 in `data/story/cutscenes/phase10/ch78_83.json`. Quests: `sweet_dreams` “Sweet Dreams” in `data/quests/phase10.json`.
2. **Events and dialogue.** Lights out; plastic tokens bounce down the hatch; go up and have a word with the storm. Dialogue: 29 lines ((narration) 16, captain 7, squawks 3, bob 1, garrick 1, hale 1); 0 choice prompt(s) with 0 options. Presentation: insert ×5, giveItem ×1.
3. **Characters, locations, props, flags.** Speaking characters: squawks, bob, garrick, hale. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`, `main_deck`. Interactables: `p10_btok_1` (galley 13,5), `p10_btok_2` (galley 10,5), `p10_btok_3` (galley 14,7), `p10_stern_word` (main_deck 4,4). Flags set: 7 (`p10_ch83_started`, `p10_bedtime_tokens`, `p10_btok_1`, `p10_btok_2`, `p10_btok_3`, `bedtime_ribbon_received`, `p10_storm_confronted`); items given: grand_award_ribbon.
4. **Current player actions and mechanics.** Objectives: “See what's coming down the hatch (on the floor)” [event×3]; “Go up and have a word with that storm (on deck)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Short, mood-setting.
7. **Proposed primary mechanic.** Keep; collect the three tokens (codex/evidence).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p10c12 (p10c12.story -> p10c13.begin). Start flag: `p10_ch83_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (room galley). In-room hooks into this chapter: map objects in galley ×3, main_deck ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'It's not THEIR gold to be comfortable.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p10c14` · Chapter 84: Meet Wind with Wind

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p10c14`, Chapter 84: Meet Wind with Wind. Scripts: 2 in `data/story/cutscenes/phase10/ch84_88.json`. Quests: `meet_wind_with_wind` “Meet Wind with Wind” in `data/quests/phase10.json`.
2. **Events and dialogue.** Can't sleep; Garrick tells the story of Rumpold (meet wind with wind). Dialogue: 44 lines (garrick 14, (narration) 12, captain 11, squawks 2, pete 2, gristle 1, jim 1, ned 1); 0 choice prompt(s) with 0 options. Presentation: vista ×3.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, pete, gristle, jim, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `galley`. Interactables: `p10_hammock_rumpold` (galley 11,8). Flags set: 4 (`p10_ch84_started`, `rumpold_legend_heard`, `tornado_counter_concept`, `p10_fifty_three_heard`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Ask for a story about a storm (the Grand Stenchmaster's hammock)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The tactical idea for the counter-sharkstorm is delivered here.
7. **Proposed primary mechanic.** Keep as narrative; log 'meet wind with wind' as a plan clue.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: map:galley/p10_hammock_rumpold -> p10c14.story (in-room hook); npc:garrick -> p10c14.story (in-room hook). Start flag: `p10_ch84_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 0 (none). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** The quiet hammock conversation is a rare sincere beat. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p10c15` · Chapter 85: Fart Man

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p10c15`, Chapter 85: Fart Man. Scripts: 2 in `data/story/cutscenes/phase10/ch84_88.json`. Quests: `fart_man` “Fart Man” in `data/quests/phase10.json`.
2. **Events and dialogue.** A plastic 'Fart Man' trophy comes down the ladder; Garrick is offended by the title. Dialogue: 28 lines ((narration) 9, garrick 8, captain 4, pete 2, gristle 2, jim 1, ned 1, squawks 1); 0 choice prompt(s) with 0 options. Presentation: insert ×2, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, gristle, jim, ned, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`. Interactables: `p10_trophy` (galley 14,5). Flags set: 3 (`p10_ch85_started`, `p10_leadership_trophy`, `leadership_trophy_received`); items given: none.
4. **Current player actions and mechanics.** Objectives: “See what came down the hatch (by the ladder)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Short gag.
7. **Proposed primary mechanic.** Keep as is.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p10c14 (p10c14.story -> p10c15.begin). Start flag: `p10_ch85_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 0 (none). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'It's a TITLE. It's a sacred OFFICE. With DUTIES.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p10c16` · Chapter 86: Fart Literature

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p10c16`, Chapter 86: Fart Literature. Scripts: 4 in `data/story/cutscenes/phase10/ch84_88.json`. Quests: `fart_literature` “Fart Literature” in `data/quests/phase10.json`.
2. **Events and dialogue.** At night, borrow Garrick's book from his hammock; read the Rumpold chapter properly (five research steps); write it up. Dialogue: 36 lines ((narration) 26, captain 6, squawks 3, garrick_asleep 1); 1 choice prompt(s) with 6 options. Presentation: insert ×6, giveItem ×2.
3. **Characters, locations, props, flags.** Speaking characters: squawks, garrick_asleep. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `galley`. Interactables: `p10_hammock_book` (galley 11,8), `p10_read` (galley 7,7), `p10_notes` (galley 7,7). Flags set: 9 (`p10_ch86_started`, `stinkbeard_read_book`, `p10_phr_rear`, `p10_phr_eye`, `p10_phr_wind`, `p10_phr_rotation`, `p10_phr_collapse`, `p10_plan_written`, `fifty_three_clause_written`); items given: lost_fart_book, counter_plan_notes.
4. **Current player actions and mechanics.** Objectives: “Borrow the book (from the Grand Stenchmaster's hammock)” [flag]; “Read the Rumpold chapter properly (the long table)” [event×5]; “Write it up (the long table)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Stealth-borrow plus research.
7. **Proposed primary mechanic.** Stealth borrow (sleep meter, reuse p8c13) + research puzzle: assemble the Rumpold method from five pages into a plan (order/match).
8. **Secondary mechanics.** Notes become the board in p10c17.
9. **Enemies, puzzles, timers, hazards, resources.** Sleeping crew, creaky beans, page puzzle.
10. **Failure conditions and consequences.** Garrick stirs → wait it out (timer).
11. **Dependencies.** Entry: p10c15 (p10c15.trophy -> p10c16.begin). Start flag: `p10_ch86_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (dialogue p10, room galley, npc garrick, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in galley ×3; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** The captain secretly reading fart literature by lamplight is the joke; keep the six inserts.

### `p10c17` · Chapter 87: The Counter-Sharkstorm Initiative

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p10c17`, Chapter 87: The Counter-Sharkstorm Initiative. Scripts: 11 in `data/story/cutscenes/phase10/ch84_88.json`. Quests: `counter_sharkstorm` “The Counter-Sharkstorm Initiative” in `data/quests/phase10.json`.
2. **Events and dialogue.** The Counter-Sharkstorm Initiative: brief the crew at the board, hear six alternatives, decide. Dialogue: 56 lines (captain 21, (narration) 8, gristle 6, bob 5, jim 4, pete 4, ned 4, garrick 2, +1 more); 0 choice prompt(s) with 0 options. Presentation: transition ×1.
3. **Characters, locations, props, flags.** Speaking characters: gristle, bob, jim, pete, ned, garrick, hale. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, ned, jim, gristle, pete, hale. Rooms: `main_deck`. Interactables: `p10_board_brief` (main_deck 11,21), `p10_board_decide` (main_deck 11,21). Flags set: 10 (`p10_ch87_started`, `p10_briefing`, `p10_alt_ned`, `p10_alt_bob`, `p10_alt_jim`, `p10_alt_gristle`, `p10_alt_hale`, `p10_alt_pete`, `p10_alts_said`, `counter_plan_approved`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Brief the crew (the board, by the mainmast)” [flag]; “Hear out the alternatives (the crew)” [event×6]; “Decide (the board)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A strategy briefing; existing alternatives are jokes.
7. **Proposed primary mechanic.** Keep the briefing; the decision screen shows the plan's requirements (sash holders, feast, approach) as a checklist that drives Phase 10's remaining chapters.
8. **Secondary mechanics.** Crew morale (from p10c5) affects how many alternatives are offered seriously.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p10c16 (p10c16.notes -> p10c17.begin). Start flag: `p10_ch87_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 9 (room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow). In-room hooks into this chapter: map objects in main_deck ×2; NPC dialogue in bob, gristle, hale, jim, ned, pete.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'ALL HANDS ON DECK!' with KLANG. KOFF. stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p10c18` · Chapter 88: Sash Holders

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p10c18`, Chapter 88: Sash Holders. Scripts: 4 in `data/story/cutscenes/phase10/ch84_88.json`. Quests: `sash_holders` “Sash Holders” in `data/quests/phase10.json`.
2. **Events and dialogue.** Garrick accepts on one condition: the sash must not flutter; find two volunteers; draw lots (Rusty Tom and Barnacle Bill). Dialogue: 58 lines ((narration) 20, garrick 17, pete 5, captain 4, squawks 3, barnacle_bill 3, bob 2, rusty_tom 2, +2 more); 0 choice prompt(s) with 0 options. Presentation: move ×3.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, squawks, barnacle_bill, bob, rusty_tom, ned, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, pete. Rooms: `main_deck`. Interactables: `p10_board_lots` (main_deck 11,21). Flags set: 7 (`p10_ch88_started`, `p10_holders_needed`, `pete_bureaucracy_reversal`, `sash_holders_chosen`, `rusty_tom_sash_holder`, `barnacle_bill_sash_holder`, `sash_holders_on`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Ask the Grand Stenchmaster what he needs (him)” [flag]; “Find two volunteers (the crew)” [flag]; “Draw lots (the board)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Lots and volunteers; social.
7. **Proposed primary mechanic.** Keep; drawing lots can be a small rigged-lots gag the player can play.
8. **Secondary mechanics.** Introduces Rusty Tom and Barnacle Bill as named crew (crew audit: they need stations).
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p10c17 (p10c17.decide -> p10c18.begin). Start flag: `p10_ch88_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (npc garrick). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in garrick, pete.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'the sash must not flutter.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p10c19` · Chapter 89: The Grand Feast

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p10c19`, Chapter 89: The Grand Feast. Scripts: 10 in `data/story/cutscenes/phase10/ch89_92.json`. Quests: `grand_feast` “The Grand Feast” in `data/quests/phase10.json`.
2. **Events and dialogue.** The Grand Feast to 'charge' Garrick: Crying Beans, baked beans, burnt beans, a bean smoothie, the sauce ceremony in the hold, plate it, serve him. Dialogue: 76 lines ((narration) 28, garrick 25, jim 15, captain 7, squawks 1); 1 choice prompt(s) with 2 options. Presentation: insert ×2, shake ×2, transition ×1, spawn ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, jim, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `cargo_hold`, `galley`. Interactables: `p10_feast_crying` (galley 5,4), `p10_feast_baked` (galley 7,7), `p10_feast_burnt` (galley 1,4), `p10_feast_blender` (galley 9,7), `p10_vats_feast` (cargo_hold 18,7), `p10_feast_plate` (galley 7,7). Flags set: 10 (`p10_ch89_started`, `p10_feast_crying`, `p10_feast_baked`, `p10_feast_burnt`, `p10_blender_walking`, `bean_smoothie_made`, `p10_feast_sauce`, `p10_feast_parts_said`, `charging_feast_prepared`, `garrick_charged`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Crying Beans (the prep table)” [flag]; “Garrick-Approved Baked Beans (the long table)” [flag]; “Burnt Beans (the stove)” [flag]; “A Bean Smoothie (the blender, on the long table)” [flag]; “The sauce ceremony (the sauce vats, in the hold)” [flag]; “Plate it, formally (the long table)” [flag]; “Serve the Grand Stenchmaster (him)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×7.
5. **Classification.** Timing / skill input (timing bar (repair) ×7). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Seven timing bars already; the cooking system from p10c6 can carry it.
7. **Proposed primary mechanic.** Cooking challenge II: prepare five dishes in parallel across two rooms (galley + hold vats) with timers; Garrick's 'charge' meter is the score.
8. **Secondary mechanics.** Charge level determines the strength of the release in p10c21/22 (affects difficulty there).
9. **Enemies, puzzles, timers, hazards, resources.** Parallel timers, the hold's red fume when fetching sauce.
10. **Failure conditions and consequences.** Undercharged → p10c22 needs more precise helm alignment.
11. **Dependencies.** Entry: p10c18 (p10c18.lots -> p10c19.begin). Start flag: `p10_ch89_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 9 (room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle). In-room hooks into this chapter: map objects in galley ×5, cargo_hold ×1; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'There's a pause while everyone counts the Grands.' stays.

### `p10c20` · Chapter 90: The Approach

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p10c20`, Chapter 90: The Approach. Scripts: 11 in `data/story/cutscenes/phase10/ch89_92.json`. Quests: `the_approach` “The Approach” in `data/quests/phase10.json`.
2. **Events and dialogue.** The approach to the Great Sharkstorm: trim sails, lash cargo, check ropes, helm with Gristle, secure the galley, ready the sash holders, ask Pete for a report. Dialogue: 39 lines ((narration) 16, captain 8, gristle 4, pete 3, rusty_tom 2, barnacle_bill 2, squawks 2, ned 1, +1 more); 0 choice prompt(s) with 0 options. Presentation: shake ×2, insert ×2, transition ×1.
3. **Characters, locations, props, flags.** Speaking characters: gristle, pete, rusty_tom, barnacle_bill, squawks, ned, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): rusty_tom, barnacle_bill, pete. Rooms: `galley`, `main_deck`. Interactables: `p10_sheet_port` (main_deck 9,19), `p10_sheet_star` (main_deck 10,19), `p10_cargo` (main_deck 14,16), `p10_ropes` (main_deck 11,18), `p10_helm_approach` (main_deck 9,6), `p10_secure_galley` (galley 1,4). Flags set: 12 (`p10_ch90_started`, `close_approach_started`, `p10_sail_port`, `p10_sail_starboard`, `p10_cargo_lashed`, `p10_ropes_checked`, `p10_helm_set`, `p10_galley_secured`, `p10_holders_positioned`, `p10_approach_done_said`, +2 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Trim the sails (the mainmast's sheets, both sides)” [event×2]; “Lash the cargo (the crates by the starboard rail)” [flag]; “Check the ropes (the coils by the mainmast)” [flag]; “Take the helm with Gristle (the helm)” [flag]; “Secure the galley (below: the pots)” [flag]; “Get the sash holders ready (Rusty Tom and Barnacle Bill)” [flag]; “Ask the Grand Sharkmaster for a report (Pete, with his spyglass)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×6.
5. **Classification.** Timing / skill input (timing bar (repair) ×6). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A pre-battle preparation round with six timing bars.
7. **Proposed primary mechanic.** Battle stations: a time-limited preparation phase where each job has a measurable effect (sail trim → speed, cargo → fewer loose hazards, galley → no fires) in the climax.
8. **Secondary mechanics.** Crew assignment to stations (first full use of the Crew stations system).
9. **Enemies, puzzles, timers, hazards, resources.** Time limit (the storm closes), parallel jobs.
10. **Failure conditions and consequences.** Unfinished jobs become hazards in p10c21/22.
11. **Dependencies.** Entry: p10c19 (p10c19.serve -> p10c20.begin). Start flag: `p10_ch90_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (dialogue p10, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim). In-room hooks into this chapter: map objects in main_deck ×5, galley ×1; NPC dialogue in barnacle_bill, pete, rusty_tom.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** '...Even the Dead Center's leaving.' stays.

### `p10c21` · Chapter 91: The One Time

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p10c21`, Chapter 91: The One Time. Scripts: 4 in `data/story/cutscenes/phase10/ch89_92.json`. Quests: `the_one_time` “The One Time” in `data/quests/phase10.json`.
2. **Events and dialogue.** The One Time: Garrick at full pressure; get him into firing position at the stern; he wanders to the bow and must be talked back three times; an award falls from the sky. Dialogue: 68 lines ((narration) 22, garrick 21, captain 17, gristle 4, pete 3, squawks 1); 0 choice prompt(s) with 0 options. Presentation: shake ×4, move ×3, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, gristle, pete, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 10 (`p10_ch91_started`, `sash_holders_on`, `p10_firing_position`, `p10_balked`, `p10_arg_ocean`, `p10_arg_force`, `p10_arg_beg`, `cowardice_award_received`, `sash_insult_motivation`, `p10_cowardice_done`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Firing position (the stern rail, with the Grand Stenchmaster)” [flag]; “Talk him back to the stern (him, at the bow)” [event×3]; “...What's that coming down? (him)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Escorting a 'bomb' is a great mechanic.
7. **Proposed primary mechanic.** Escort the charged Garrick: move him across a pitching deck without jostling (each jolt leaks pressure), avoiding falling debris; persuasion beats when he drifts.
8. **Secondary mechanics.** Sash holders must stay in formation (the sash must not flutter).
9. **Enemies, puzzles, timers, hazards, resources.** Rolling deck, falling debris, distractions pulling Garrick off course.
10. **Failure conditions and consequences.** Pressure leaks too much → weaker release (harder p10c22); a premature leak → a fume burst on deck (exposure).
11. **Dependencies.** Entry: p10c20 (p10c20.report -> p10c21.begin). Start flag: `p10_ch91_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (npc garrick, room main_deck). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'Garrick. ASSUME FIRING POSITION.' stays.

### `p10c22` · Chapter 92: The Wrong Way

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p10c22`, Chapter 92: The Wrong Way. Scripts: 11 in `data/story/cutscenes/phase10/ch89_92.json`. Quests: `wrong_way` “The Wrong Way” in `data/quests/phase10.json`.
2. **Events and dialogue.** The Wrong Way: bring the stern to the centre (course dial ×3), hold on to the rail, grab Squawks, get below – the ship goes into the storm instead of out. Dialogue: 40 lines ((narration) 20, ned 6, garrick 4, captain 3, gristle 2, squawks 2, pete 1, jim 1, +1 more); 0 choice prompt(s) with 0 options. Presentation: shake ×4, vista ×3.
3. **Characters, locations, props, flags.** Speaking characters: ned, garrick, gristle, squawks, pete, jim, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): squawks. Rooms: `main_deck`. Interactables: `p10_helm_align` (main_deck 9,6), `p10_rail_port` (main_deck 3,30), `p10_rail_star` (main_deck 16,30). Flags set: 10 (`p10_ch92_started`, `p10_aligned`, `final_alignment_reached`, `fired_wrong_direction`, `great_sharkstorm_sea_contamination`, `qar_propelled_into_storm`, `p10_entry_rail`, `p10_entry_squawks`, `p10_entry_below`, `great_sharkstorm_entry_complete`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Bring her stern to the centre (the helm)” [flag]; “HOLD ON (the rail)” [flag]; “Get hold of Squawks!” [flag]; “Get below! (the galley hatch)” [flag]. Mechanics invoked by the scripts: course dial ×3, timing bar (repair) ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Presentation-only effects with no player input: course dial ×3. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The phase climax; already uses the course dial.
7. **Proposed primary mechanic.** Helm alignment under fire: hold the course dial on the centre while gusts push it (skill), then survive the blast (hold rail timing) and rescue Squawks.
8. **Secondary mechanics.** Outcome stays canonical (the ship ends up inside the spout); performance affects damage carried forward.
9. **Enemies, puzzles, timers, hazards, resources.** Gust pushes, falling sharks, Ned's degree calls as cues.
10. **Failure conditions and consequences.** Ship Integrity damage persists into Phase 11; if Integrity hits zero, retry from p10c22 start.
11. **Dependencies.** Entry: p10c21 (p10c21.award -> p10c22.begin). Start flag: `p10_ch92_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in main_deck ×3; NPC dialogue in squawks.
12. **Complexity and priority.** Complexity L, priority P1.
13. **Preserving story and humour; variety.** 'Ten degrees... five... ON THE CENTRE' then the wrong way remains the punchline.

### `p10c23` · Chapter 93: Inside the Spout

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p10c23`, Chapter 93: Inside the Spout. Scripts: 4 in `data/story/cutscenes/phase10/ch93_95.json`. Quests: `inside_the_spout` “Inside the Spout” in `data/quests/phase10.json`.
2. **Events and dialogue.** Inside the spout: the galley rocks; the ship is going round; get a picture on the Mark II via the aerial. Dialogue: 45 lines ((narration) 19, garrick 12, pete 4, captain 4, rusty_tom 3, barnacle_bill 2, jim 1); 0 choice prompt(s) with 0 options. Presentation: vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, rusty_tom, barnacle_bill, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`. Interactables: `p10_tv_antenna` (galley 16,7). Flags set: 6 (`p10_ch93_started`, `great_sharkstorm_ship_captured`, `qar_inside_storm`, `garrick_pressure_reset`, `ses_signal_failure`, `sauce_antenna_installed`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Get a picture on the Mark II (its aerial)” [flag]. Mechanics invoked by the scripts: TV knobs ×2, TV power ×1.
5. **Classification.** Choice or puzzle prompt (TV knobs ×2). Presentation-only effects with no player input: TV power ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Short; TV knobs exist.
7. **Proposed primary mechanic.** Keep; aerial adjustment on a rotating ship (signal drifts as the ship turns).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Drifting signal.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p10c22 (p10c22.below -> p10c23.begin). Start flag: `p10_ch93_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (dialogue p10, room cargo_hold, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** The rolling can of Crying Beans stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p10c24` · Chapter 94: The Impossible Audit

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p10c24`, Chapter 94: The Impossible Audit. Scripts: 10 in `data/story/cutscenes/phase10/ch93_95.json`. Quests: `the_impossible_audit` “The Impossible Audit” in `data/quests/phase10.json`.
2. **Events and dialogue.** The Impossible Audit: watch the Frog Tax Man do a rotating weather system (13 TV segments). Dialogue: 50 lines ((narration) 16, garrick 12, captain 9, gristle 4, ned 3, pete 3, jim 1, bob 1, +1 more); 0 choice prompt(s) with 0 options. Presentation: tvProgram ×13, vista ×5, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, gristle, ned, pete, jim, bob, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`. Interactables: `p10_tv_audit` (galley 16,7). Flags set: 8 (`p10_ch94_started`, `bbk_tv_seen`, `transfer_doctrine_heard`, `ftm_tax_seen`, `p10_audit_seen`, `anomalous_ftm_watched`, `ftm_impossible_broadcast`, `bbk_commercial_seen`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Watch the Frog Tax Man (the Mark II)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** TV episode.
7. **Proposed primary mechanic.** Keep as is.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p10c23 (p10c23.antenna -> p10c24.begin). Start flag: `p10_ch94_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 0 (none). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'That's us. That's a storm. He's doing a storm.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p10c25` · Chapter 95: I Used to Be Blackbeard

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p10c25`, Chapter 95: I Used to Be Blackbeard. Scripts: 3 in `data/story/cutscenes/phase10/ch93_95.json`. Quests: `blackbeard` “I Used to Be Blackbeard” in `data/quests/phase10.json`; `inside_great_sharkstorm` “Inside the Great Sharkstorm” (left OPEN) in `data/quests/phase10.json`.
2. **Events and dialogue.** I Used to Be Blackbeard: a shark on TV with an advertising budget paid for with the captain's treasure; breathe. Opens 'Inside the Great Sharkstorm' (get the Revenge out; deal with the Bling Bling King) – still open at the end of Phase 17 (neither target flag is set by any script). Dialogue: 56 lines ((narration) 20, captain 12, garrick 12, squawks 2, ned 2, jim 2, bob 2, pete 2, +2 more); 0 choice prompt(s) with 0 options. Presentation: vista ×1, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, ned, jim, bob, pete, gristle, hale. NPCs with dialogue keyed to an objective (hints, reactions or completions): squawks. Rooms: `galley`. Interactables: `p10_breathe` (galley 12,8). Flags set: 3 (`p10_ch95_started`, `blackbeard_breakdown_seen`, `p10_complete`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Breathe: go to your bed (the bean sacks by the long table) and sit down, or talk to Squawks” [flag]; “Get the Revenge out of the Great Sharkstorm” [flag]; “Deal with the Bling Bling King” [flag]. Mechanics invoked by the scripts: TV knobs ×1.
5. **Classification.** Choice or puzzle prompt (TV knobs ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** An emotional low; the open quest is a hook for later content.
7. **Proposed primary mechanic.** Keep as narrative (quiet beat).
8. **Secondary mechanics.** Track the open quest in the roadmap (needs an ending or a re-scoping).
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p10c24 (p10c24.ad -> p10c25.begin). Start flag: `p10_ch95_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (dialogue p10, room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in squawks.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'There is a SHARK. On the TELEVISION.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.
