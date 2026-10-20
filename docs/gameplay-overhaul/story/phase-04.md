# Story inventory, Phase 4: Life Around the Dead Center

Chapters: 5 (p4c1 to p4c5). Dialogue lines: 531. Classification: Walk + press A 3, Timing / skill input 2.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE4.md`, `data/quests/phase4.json`, `data/story/cutscenes/phase4/`, `data/story/flags/phase4.json`, `tests/phase4_story.test.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p4c1` · Chapter 15: Morning with the Frog Grog

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p4c1`, Chapter 15: Morning with the Frog Grog. Scripts: 8 in `data/story/cutscenes/phase4/ch15.json`. Quests: `todays_forecast` “Today's Forecast” in `data/quests/phase4.json`.
2. **Events and dialogue.** The new normal: the morning ration of Frog Grog, Garrick's daily forecast of where the Dead Center will be, a breakfast evacuation, the new Forecast Board midships. Dialogue: 123 lines (garrick 42, (narration) 31, captain 27, bob 7, pete 4, brask 4, squawks 3, gristle 2, +2 more); 0 choice prompt(s) with 0 options. Presentation: move ×3, insert ×3, spawn ×2, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, bob, pete, brask, squawks, gristle, wick, mags. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `galley`, `main_deck`. Interactables: `p4_forecast_table` (galley 7,7), `p4_to_crew` (galley 8,12), `p4_to_hold` (galley 12,10), `p4_board_first` (main_deck 10,16). Flags set: 13 (`p4_started`, `garrick_grand_stenchmaster_sash`, `beard_remedies_heard`, `squawks_refused_grog`, `p4_ration_attended`, `where_is_center_asked`, `forecast_day1_shown`, `forecast_day1_inspected`, `breakfast_center_arrived`, `breakfast_evacuated`, +3 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Attend the morning ration (Galley)” [flag]; “Ask Garrick where the Dead Center is today” [flag]; “Inspect the forecast (on the breakfast table)” [flag]; “Clear the breakfast area! (up the ladder to the deck)” [flag]; “Look at the new Forecast Board (Garrick's station, midships)” [flag]. Mechanics invoked by the scripts: bell alarm ×1.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: bell alarm ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The Dead Center forecast is a ready-made hazard-prediction mechanic.
7. **Proposed primary mechanic.** Forecast reading: use Garrick's (unreliable) forecast and the board to predict where the Dead Center lands and evacuate the right room in time (bell alarm).
8. **Secondary mechanics.** Ration management (Frog Grog stocks).
9. **Enemies, puzzles, timers, hazards, resources.** Moving Dead Center with a warning time; crew who don't move without a bell.
10. **Failure conditions and consequences.** Wrong room → crew dazed, a room contaminated for the day.
11. **Dependencies.** Entry: p4.bed_sleep -> p4c1.begin. Start flag: `p4_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: p4c5 (1). Flags read by world data (rooms/NPCs/triggers): 6 (room captains_quarters, room cargo_hold, room crew_quarters, room galley, room main_deck, room treasure_hold, npc garrick, npc squawks). In-room hooks into this chapter: map objects in galley ×3, main_deck ×1; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'First the coughing. Then the gagging. Then the bell. Then the Frog Grog.' stays verbatim.

### `p4c2` · Chapter 16: Life Around the Center

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p4c2`, Chapter 16: Life Around the Center. Scripts: 18 in `data/story/cutscenes/phase4/ch16.json`. Quests: `life_around_center` “Life Around the Center” in `data/quests/phase4.json`.
2. **Events and dialogue.** The crew's bell protocol; a sequence of Dead Center emergencies: Gristle in the washroom, the galley stove, lunch from the hold, the sleeping quarters, the night deck (Squawks), the quarterdeck blockade (the helm). Dialogue: 134 lines ((narration) 42, captain 26, garrick 19, pete 14, jim 10, hale 8, gristle 5, bob 5, +2 more); 0 choice prompt(s) with 0 options. Presentation: move ×14, shake ×3, spawn ×3, transition ×2, insert ×2.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, jim, hale, gristle, bob, nell, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): hale, pete, jim, bob, squawks, nell. Rooms: `captains_quarters`, `cargo_hold`, `main_deck`. Interactables: `p4_protocol` (main_deck 10,30), `p4_scuttle_rescue` (main_deck 6,33), `p4_damper` (main_deck 12,27), `p4_biscuits_take` (cargo_hold 16,4), `p4_helm_fix` (main_deck 9,6). Flags set: 24 (`p4_ch16_started`, `squawks_three_feathers`, `bell_protocol_established`, `bell_protocol_read`, `washroom_incident_started`, `washroom_door_seen`, `scuttle_found`, `gristle_rescued`, `galley_incident_started`, `stove_damper_closed`, +14 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Read the bell protocol (by the ship's bell, near the bow)” [flag]; “Washroom problem: get Gristle out” [flag]; “Galley problem: smother the stove from the deck (the stovepipe)” [flag]; “Galley problem: salvage lunch (biscuits, Cargo Hold)” [flag]; “Sleeping-quarter evacuation: see the crew bedded down on deck” [flag]; “Night deck evacuation: get Squawks” [flag]; “Quarterdeck blockade: get the ship back on course” [flag]. Mechanics invoked by the scripts: bell alarm ×7, course dial ×7, timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Presentation-only effects with no player input: bell alarm ×7, course dial ×7. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Already a run of mini-crises with the bell and the course dial. The best candidate in the early game for a real crisis-management chapter.
7. **Proposed primary mechanic.** Crisis management day: several simultaneous Dead Center events on a clock; the player decides the order, rings the correct bell code, and uses crew assignments to cover the rest.
8. **Secondary mechanics.** Course-dial helm segment to steer out of the cloud's path.
9. **Enemies, puzzles, timers, hazards, resources.** Concurrent events with timers, wrong bell codes cause panic, a stove fire risk.
10. **Failure conditions and consequences.** Each failed event leaves a lasting cost (lost lunch = lower HP regen, smoked quarters = no rest bonus, off course = longer Phase 4).
11. **Dependencies.** Entry: story trigger p4c2_begin: {all:[{questCompleted:todays_forecast},{questNotStarted:life_around_center}]}; story trigger p4c2_galley: {all:[{objectiveActive:life_around_center.damper},{notFlag:galley_incident_started},{onMap:main_deck}]}; story trigger p4c2_quarters: {all:[{objectiveActive:life_around_center.quarters},{notFlag:quarters_incident_started},{onMap:main_deck}]}; story trigger p4c2_night: {all:[{objectiveActive:life_around_center.night},{notFlag:night_alarm_started},{onMap:main_deck}]}; story trigger p4c2_quarterdeck: {all:[{objectiveActive:life_around_center.quarterdeck},{notFlag:quarterdeck_incident_started},{onMap:main_deck}]}. Start flag: `p4_ch16_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 19 (room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow). In-room hooks into this chapter: map objects in main_deck ×4, cargo_hold ×1, captains_quarters ×1; NPC dialogue in bob, jim, squawks.
12. **Complexity and priority.** Complexity L, priority P1.
13. **Preserving story and humour; variety.** The crew's meeting 'about the bell' and Quill's protocol stay; the comedy is the protocol's absurd precision under pressure.

### `p4c3` · Chapter 17: The Center Picks the Worst Places

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p4c3`, Chapter 17: The Center Picks the Worst Places. Scripts: 11 in `data/story/cutscenes/phase4/ch17.json`. Quests: `worst_places` “The Worst Places” in `data/quests/phase4.json`; `seven_feathers` “Seven Feathers” in `data/quests/phase4.json`.
2. **Events and dialogue.** The Dead Center picks the worst places: the powder store, Squawks's cabin; a serious beard wash in the washroom fails; Squawks loses seven feathers. Dialogue: 84 lines ((narration) 30, captain 21, squawks 14, garrick 10, wick 3, brask 2, jim 2, fennimore 1, +1 more); 0 choice prompt(s) with 0 options. Presentation: spawn ×7, transition ×4, move ×3, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: squawks, garrick, wick, brask, jim, fennimore, hale. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, squawks. Rooms: `cargo_hold`, `crew_quarters`, `galley`, `main_deck`, `washroom`. Interactables: `tub_wash` (washroom 7,5), `p4_log_beard` (main_deck 12,16). Flags set: 11 (`p4_ch17_started`, `worst_places_seen`, `beard_wash_attempted`, `beard_refreshed`, `beard_refresh_protested`, `squawks_reached_seven_feathers`, `feathers_alarm`, `squawks_protected`, `feathers_returned`, `squawks_bald_again`, +1 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Attempt a serious beard wash (Washroom, off the Crew Quarters)” [flag]; “Read what the Grand Stenchmaster wrote about it (Stench Log)” [flag]; “Check on Squawks (Captain's Quarters)” [flag]; “Protect Squawks: get him out of the cabin!” [flag]; “Return to the cabin once the cloud clears” [flag]; “See how Squawks is” [flag]. Mechanics invoked by the scripts: bell alarm ×3.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: bell alarm ×3. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Rescue of Squawks + washroom beard wash.
7. **Proposed primary mechanic.** Short rescue: get Squawks out of the cabin before the cloud settles (route planning around a drifting Dead Center).
8. **Secondary mechanics.** Beard wash as an attempt to reduce Beard Saturation (it fails, establishing that the beard is permanent but can be 'managed').
9. **Enemies, puzzles, timers, hazards, resources.** Drifting cloud with a predictable path; doors that must be closed behind you.
10. **Failure conditions and consequences.** Squawks loses more feathers (cosmetic escalation), not a game over.
11. **Dependencies.** Entry: story trigger p4c3_begin: {all:[{questCompleted:life_around_center},{notFlag:p4_ch17_started}]}; story trigger p4c3_feathers: {all:[{questCompleted:worst_places},{questNotStarted:seven_feathers}]}. Start flag: `p4_ch17_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room captains_quarters, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow). In-room hooks into this chapter: map objects in washroom ×1, main_deck ×1; NPC dialogue in squawks.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'It KNOWS.' and the seven feathers stay; the cloud choosing the worst place should feel like it's hunting you.

### `p4c4` · Chapter 18: Shark Duty

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p4c4`, Chapter 18: Shark Duty. Scripts: 9 in `data/story/cutscenes/phase4/ch18.json`. Quests: `shark_duty` “Shark Duty” in `data/quests/phase4.json`.
2. **Events and dialogue.** Shark Duty: take a pole from the duty barrel, repel sharks at the port rail, check damage, hold both rails as numbers grow, Garrick toasts instead of helping, abandon duty, the Shark Frenzy. Dialogue: 102 lines (captain 27, (narration) 25, garrick 18, jory 15, ned 6, pete 5, rook 3, squawks 2, +1 more); 0 choice prompt(s) with 0 options. Presentation: shake ×4, vista ×3, transition ×1, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, jory, ned, pete, rook, squawks, wick. NPCs with dialogue keyed to an objective (hints, reactions or completions): jory, ned, garrick, squawks. Rooms: `main_deck`. Interactables: `p4_duty_pole` (main_deck 13,24). Flags set: 15 (`p4_ch18_started`, `shark_duty_introduced`, `shark_duty_reported`, `piracy_rant_done`, `port_damage_checked`, `starboard_checked`, `hundreds_seen`, `garrick_toast_seen`, `garrick_refused_duty`, `waterline_alarm`, +5 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Report to the rail (take a pole from the duty barrel by Jory)” [flag]; “Repel the sharks at the port rail” [event×6]; “Check the port damage with Jory” [flag]; “Check starboard activity (Ned, at the bow)” [flag]; “Hold both rails against the growing numbers” [event×8]; “Get the Grand Stenchmaster to help (his station)” [flag]; “Abandon Shark Duty! Get clear of the port rail” [flag]; “Witness the Shark Frenzy” [flag]. Mechanics invoked by the scripts: bell alarm ×1.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: bell alarm ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Shark Duty is already a real-time system (sharks lunge at rails; poles). It is the obvious seed of field combat.
7. **Proposed primary mechanic.** Make Shark Duty the core action-combat introduction: poles with reach and a cooldown, sharks with telegraphed lunges and flops onto deck, rail sections with HP (Ship Integrity).
8. **Secondary mechanics.** Crew stations on the rail (assign who holds which section; morale drops under pressure).
9. **Enemies, puzzles, timers, hazards, resources.** Escalating waves, sharks that land on deck and must be shoved overboard, a frenzy finale you must survive, not win.
10. **Failure conditions and consequences.** Rail broken → hull damage carried into ch19's repairs; captain knocked down → respawn at the mast with lost rail HP. No game over unless difficulty setting says so.
11. **Dependencies.** Entry: story trigger p4c4_begin: {all:[{questCompleted:seven_feathers},{notFlag:p4_ch18_started}]}; story trigger p4c4_rant: {all:[{objectiveActive:shark_duty.port},{notFlag:piracy_rant_done},{onMap:main_deck}]}; story trigger p4c4_toast: {all:[{objectiveActive:shark_duty.garrick},{notFlag:garrick_toast_seen},{onMap:main_deck}]}. Start flag: `p4_ch18_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 6 (room captains_quarters, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in garrick, jory, ned, squawks.
12. **Complexity and priority.** Complexity L, priority P1.
13. **Preserving story and humour; variety.** Jory's roster speech, the mop and the broom as weapons and Garrick toasting while everyone fights all survive; it's funnier when the player is actually fighting.

### `p4c5` · Chapter 19: The Worst Forecast Yet

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p4c5`, Chapter 19: The Worst Forecast Yet. Scripts: 11 in `data/story/cutscenes/phase4/ch19.json`. Quests: `repair_it_again` “Repair It Again” in `data/quests/phase4.json`.
2. **Events and dialogue.** Repair it again: three repairs on the port rail with Jory, Garrick's next forecast, evacuate the repair, watch the fresh repair dissolve, tomorrow's forecast. Dialogue: 88 lines ((narration) 46, garrick 18, captain 10, jory 4, pete 2, rook 2, crew 2, squawks 2, +2 more); 0 choice prompt(s) with 0 options. Presentation: insert ×5, transition ×2, vista ×1, spawn ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, jory, pete, rook, crew, squawks, mags, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): jory, garrick. Rooms: `main_deck`. Interactables: `p4_fix_board` (main_deck 16,19), `p4_fix_rope` (main_deck 16,21), `p4_fix_patch` (main_deck 16,23), `p4_evac_aft` (main_deck 4,12), `p4_evac_fore` (main_deck 4,31). Flags set: 15 (`p4_ch19_started`, `repairs_started`, `repair_board_done`, `repair_rope_done`, `repair_patch_done`, `supervisor_debate`, `worst_forecast_seen`, `center_returning`, `repair_evacuated`, `fresh_repair_destroyed`, +5 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Assist the repairs along the port rail” [event×3]; “Check Garrick's latest forecast” [flag]; “Evacuate the repair!” [flag]; “Watch what happens to the fresh repair” [flag]; “Receive tomorrow's forecast” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×3, bell alarm ×2.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Presentation-only effects with no player input: bell alarm ×2. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Repairs exist (3 timing bars). Good place for the repair economy.
7. **Proposed primary mechanic.** Repair under a clock with materials: planks, rope and pitch are limited; better repairs last longer (quality from the timing bar) before the Dead Center melts them.
8. **Secondary mechanics.** Evacuation with a choice of exits.
9. **Enemies, puzzles, timers, hazards, resources.** Material scarcity, the cloud arriving mid-repair.
10. **Failure conditions and consequences.** Poor repairs fail sooner in Phase 5 (more rail breaches).
11. **Dependencies.** Entry: story trigger p4c5_begin: {all:[{questCompleted:shark_duty},{notFlag:p4_ch19_started}]}; story trigger p4c5_supervisor: {all:[{anyFlag:[repair_board_done,repair_rope_done,repair_patch_done]},{notFlag:supervisor_debate},{onMap:main_deck}]}. Start flag: `p4_ch19_started`. Reads flags first set in earlier chapters: p4c1: `p4_ration_attended`. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 9 (room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow, npc dunstan). In-room hooks into this chapter: map objects in main_deck ×5; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'REPAIR EVERYTHING.' and the biscuit-nibbled rail stay; the fresh repair dissolving is the punchline.
