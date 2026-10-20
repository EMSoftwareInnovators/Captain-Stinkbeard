# Story inventory, Phase 5: What Does the Grand Stenchmaster Actually Do?

Chapters: 5 (p5c1 to p5c5). Dialogue lines: 565. Classification: Timing / skill input 3, Choice or puzzle prompt 1, Walk + press A 1.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE5.md`, `data/quests/phase5.json`, `data/story/cutscenes/phase5/`, `data/story/flags/phase5.json`, `tests/phase5_story.test.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p5c1` · Chapter 20: Another Terrible Day

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p5c1`, Chapter 20: Another Terrible Day. Scripts: 12 in `data/story/cutscenes/phase5/ch20.json`. Quests: `another_terrible_day` “Another Terrible Day” in `data/quests/phase5.json`; `remember_squawks` “Remember Squawks” in `data/quests/phase5.json`.
2. **Events and dialogue.** Another terrible day: rounds (Pete, Gristle's stores, Jim's breakfast, wake Bob); the Center moves; grab Squawks's basket and get aft; the crew talk about Squawks. Dialogue: 102 lines ((narration) 37, captain 16, squawks 12, gristle 8, jim 8, bob 7, pete 6, hale 4, +3 more); 0 choice prompt(s) with 0 options. Presentation: move ×6, spawn ×2, transition ×1, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: squawks, gristle, jim, bob, pete, hale, fennimore, mags, dunstan. NPCs with dialogue keyed to an objective (hints, reactions or completions): pete, squawks, bob, jim, gristle, hale, mags, fennimore, wick, rook, sully, jory. Rooms: `main_deck`. Interactables: `p5_safe_aft` (main_deck 4,12). Flags set: 11 (`p5_started`, `p5_round_pete`, `p5_round_gristle`, `p5_round_jim`, `p5_round_bob`, `p5_close_call_started`, `p5_carrying_squawks`, `p5_squawks_safe`, `squawks_fully_bald`, `p5_checkin_gather`, +1 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “See Pete at the port rail” [flag]; “Check the stores with Gristle (Cargo Hold)” [flag]; “Look in on breakfast (Salty Jim, Galley)” [flag]; “Wake Barnacle Bob (Crew Quarters)” [flag]; “Grab Squawks! (his basket, at the foot of the mainmast)” [flag]; “Get aft, clear of the Center (by the cabin door)” [flag]; “Check on Squawks” [flag]; “Talk to the crew about how Squawks is doing” [event×2]. Mechanics invoked by the scripts: bell alarm ×3, Shark Duty ×1.
5. **Classification.** Timing / skill input (Shark Duty ×1). Presentation-only effects with no player input: bell alarm ×3. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Morning rounds + an emergency.
7. **Proposed primary mechanic.** Morning rounds as a scheduled task loop (check stores, wake crew) interrupted by a Dead Center event that demands an immediate carry-and-run (Squawks's basket).
8. **Secondary mechanics.** Supply audit feeding the resource economy.
9. **Enemies, puzzles, timers, hazards, resources.** Shark nudges under the hull (a small bump hazard), the moving Center.
10. **Failure conditions and consequences.** Late rescue → Squawks loses feathers.
11. **Dependencies.** Entry: p5.bed_sleep -> p5c1.begin. Start flag: `p5_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 11 (dialogue p5, room captains_quarters, room cargo_hold, room crew_quarters, room galley, room main_deck, npc garrick, npc squawks). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in pete, squawks.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'Seven hundred percent turned out to be a conservative estimate.' stays.

### `p5c2` · Chapter 21: What Do You Actually Do?

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p5c2`, Chapter 21: What Do You Actually Do?. Scripts: 6 in `data/story/cutscenes/phase5/ch21.json`. Quests: `what_do_you_do` “What Do You Actually Do?” in `data/quests/phase5.json`.
2. **Events and dialogue.** Shark Duty again while Garrick stays in his chair; what does he actually do?; the Stenchmaster Entertainment System appears; no useful definition of the job. Dialogue: 155 lines (garrick 57, (narration) 35, bob 13, captain 12, pete 10, gristle 9, jim 7, crew 4, +5 more); 0 choice prompt(s) with 0 options. Presentation: shake ×6, insert ×1, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, bob, pete, gristle, jim, crew, rook, jory, squawks, quill, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `main_deck`. Interactables: `p5_ses_first` (main_deck 14,17). Flags set: 8 (`p5_ch21_started`, `p5_first_watch_done`, `p5_confront_started`, `stenchmaster_entertainment_system_built`, `p5_duties_heard`, `ses_examined`, `crew_confronted_garrick_duties`, `p5_back_to_work`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Shark Duty: see off the sharks at the port rail” [event×4]; “Ask the Grand Stenchmaster what he's been doing (his chair, midships)” [flag]; “Inspect the Stenchmaster Entertainment System” [flag]; “Get a useful definition of the job” [flag]. Mechanics invoked by the scripts: TV knobs ×2, TV power ×1.
5. **Classification.** Choice or puzzle prompt (TV knobs ×2). Presentation-only effects with no player input: TV power ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The S.E.S. is introduced (TV knobs exist).
7. **Proposed primary mechanic.** Shark Duty round (reuse ch18 combat) with Garrick as a distraction hazard (his chair blocks the rail).
8. **Secondary mechanics.** TV knobs as a small mechanical puzzle that later matters (the S.E.S. becomes a hazard/source in Phase 6).
9. **Enemies, puzzles, timers, hazards, resources.** Sharks + an obstacle you can't move.
10. **Failure conditions and consequences.** As ch18.
11. **Dependencies.** Entry: story trigger p5c2_begin: {all:[{questCompleted:remember_squawks},{notFlag:p5_ch21_started},{onMap:main_deck}]}; story trigger p5c2_watch_done: {all:[{objectiveActive:what_do_you_do.ask},{notFlag:p5_first_watch_done},{onMap:main_deck}]}. Start flag: `p5_ch21_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room crew_quarters, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'Nineteen pirates. One of them stays exactly where he is.' is the joke; keep the chair in the way.

### `p5c3` · Chapter 22: The Grand Stenchmaster's Office

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p5c3`, Chapter 22: The Grand Stenchmaster's Office. Scripts: 11 in `data/story/cutscenes/phase5/ch22.json`. Quests: `stenchmaster_office` “The Grand Stenchmaster's Office” in `data/quests/phase5.json`.
2. **Events and dialogue.** Sharks queue on both rails and start coming aboard; the rudder; the Stench Log; Garrick's empty chair; crew complaints; three bells at the station: get clear. Dialogue: 76 lines ((narration) 41, captain 8, garrick 5, nell 4, ned 3, jory 2, rook 2, mags 2, +6 more); 2 choice prompt(s) with 5 options. Presentation: move ×5, shake ×1, insert ×1, spawn ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, nell, ned, jory, rook, mags, jim, brask, pete, bob, crew, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, ned, jim, gristle, pete, hale, quill, mags, brask, nell, wick, rook, sully, finch, jory. Rooms: `main_deck`. Interactables: `p5_rudder` (main_deck 9,6), `p5_log` (main_deck 12,16), `p5_chair_first` (main_deck 14,18). Flags set: 15 (`p5_ch22_started`, `stenchmaster_station_unlocked`, `p5_office_duty_done`, `p5_rudder_checked`, `p5_log_drool_seen`, `p5_garrick_qa`, `p5_sat_in_chair`, `p5_chair_inspected`, `p5_bread_seen`, `p5_washroom_wait_seen`, +5 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Shark Duty: hold both rails” [event×6]; “Check the rudder (the wheel, on the quarterdeck)” [flag]; “Inspect the Stench Log (his station)” [flag]; “Inspect the Grand Stenchmaster's chair (while he's out)” [flag]; “Hear the crew's complaints” [event×3]; “Three bells at the station: get clear!” [flag]. Mechanics invoked by the scripts: bell alarm ×1.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: bell alarm ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Combat + investigation of the chair.
7. **Proposed primary mechanic.** Two-rail defence with boarding sharks (enemy variety: biters, floppers, a big one that needs two hits).
8. **Secondary mechanics.** Investigating the chair and log reveals the next day's danger (information reward).
9. **Enemies, puzzles, timers, hazards, resources.** Boarding sharks, complaints that cost morale if ignored.
10. **Failure conditions and consequences.** As ch18; ignored complaints reduce crew help in ch23.
11. **Dependencies.** Entry: story trigger p5c3_begin: {all:[{questCompleted:what_do_you_do},{notFlag:p5_ch22_started},{onMap:main_deck}]}; story trigger p5c3_duty_done: {all:[{objectiveActive:stenchmaster_office.rudder},{notFlag:p5_office_duty_done},{onMap:main_deck}]}; story trigger p5c3_station: {all:[{objectiveActive:stenchmaster_office.center},{notFlag:p5_station_scene},{onMap:main_deck}]}. Start flag: `p5_ch22_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 11 (room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow). In-room hooks into this chapter: map objects in main_deck ×5; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'They've worked out there's two sides to a boat.' and the man arguing with a turnip stay.

### `p5c4` · Chapter 23: Dressed for Disaster

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p5c4`, Chapter 23: Dressed for Disaster. Scripts: 10 in `data/story/cutscenes/phase5/ch23.json`. Quests: `dressed_for_disaster` “Dressed for Disaster” in `data/quests/phase5.json`.
2. **Events and dialogue.** The starboard rail takes bites; Garrick has gone below with a tablecloth; assemble the crew; order him to help; patch three starboard bites. Dialogue: 115 lines (garrick 41, (narration) 27, captain 12, gristle 7, pete 7, jim 6, rook 4, jory 3, +3 more); 1 choice prompt(s) with 6 options. Presentation: move ×10, shake ×3, spawn ×1, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, gristle, pete, jim, rook, jory, bob, crew, quill. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `main_deck`. Interactables: `p5_stbd_a` (main_deck 3,19), `p5_stbd_b` (main_deck 3,21), `p5_stbd_c` (main_deck 3,23). Flags set: 18 (`p5_ch23_started`, `p5_garrick_found`, `p5_crew_assembled`, `stenchmaster_suit_created`, `p5_suit_revealed`, `p5_medal_release`, `p5_medal_grog`, `p5_medal_shark`, `p5_medal_forecast`, `p5_medal_nap`, +8 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Find the Grand Stenchmaster (he went below with a tablecloth)” [flag]; “Go back up on deck and assemble the crew” [flag]; “Order the Grand Stenchmaster to help” [flag]; “Patch the starboard rail (three bites)” [event×3]. Mechanics invoked by the scripts: timing bar (repair) ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Repairs under pressure + finding Garrick.
7. **Proposed primary mechanic.** Search-and-command: find Garrick below (he hides from work), then a three-point repair with crew you assign while sharks keep biting.
8. **Secondary mechanics.** Garrick's 'suit' (the tablecloth outfit) as an equipment joke that later becomes the suit system.
9. **Enemies, puzzles, timers, hazards, resources.** Concurrent bites with rising damage; crew who need orders.
10. **Failure conditions and consequences.** Rail breached → water in the hold (Ship Integrity).
11. **Dependencies.** Entry: story trigger p5c4_begin: {all:[{questCompleted:stenchmaster_office},{notFlag:p5_ch23_started},{onMap:main_deck}]}. Start flag: `p5_ch23_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 9 (room crew_quarters, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim). In-room hooks into this chapter: map objects in main_deck ×3; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** Garrick 'Dressed for Disaster' stays; the S.E.S. playing a fish to nobody stays.

### `p5c5` · Chapter 24: One Useful Thing

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p5c5`, Chapter 24: One Useful Thing. Scripts: 10 in `data/story/cutscenes/phase5/ch24.json`. Quests: `one_useful_thing` “One Useful Thing” in `data/quests/phase5.json`.
2. **Events and dialogue.** The wheel drifts into the poison; Squawks on the quarterdeck; emergency Shark Duty; confront Garrick; the final repair; check Squawks at night; the S.E.S. at night (his one useful thing). Dialogue: 117 lines ((narration) 46, captain 27, garrick 22, squawks 8, crew 2, jory 2, gristle 2, nell 1, +7 more); 0 choice prompt(s) with 0 options. Presentation: shake ×4, move ×1, insert ×1, vista ×1, transition ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, crew, jory, gristle, nell, fennimore, pete, bob, jim, ned, rook, sully. NPCs with dialogue keyed to an objective (hints, reactions or completions): squawks, garrick. Rooms: `main_deck`. Interactables: `p5_final_repair` (main_deck 16,21), `p5_ses_night` (main_deck 14,17). Flags set: 10 (`p5_ch24_started`, `p5_emergency_squawks`, `p5_emergency_duty_done`, `p5_argument_started`, `garrick_emergency_labor_rule`, `p5_one_useful_thing`, `p5_night`, `p5_night_squawks`, `p5_night_ses_seen`, `p5_complete`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Get Squawks off the quarterdeck!” [flag]; “Emergency Shark Duty: hold both rails” [event×5]; “Confront the Grand Stenchmaster (his station)” [flag]; “Finish the repair at the port rail” [flag]; “Check on Squawks before bed” [flag]; “Look in on the S.E.S.” [flag]. Mechanics invoked by the scripts: course dial ×3, timing bar (repair) ×2, bell alarm ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×2). Presentation-only effects with no player input: course dial ×3, bell alarm ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Finale of the phase: helm + rescue + combat.
7. **Proposed primary mechanic.** Phase finale: steer out of the cloud (course dial under fume exposure) while the crew hold the rails and Squawks must be carried clear.
8. **Secondary mechanics.** The night scene stays quiet (narrative).
9. **Enemies, puzzles, timers, hazards, resources.** Exposure on the quarterdeck, sharks on both rails, a final repair under timer.
10. **Failure conditions and consequences.** Lose the wheel → the ship drifts into a worse forecast for Phase 6 (more hazard intensity).
11. **Dependencies.** Entry: story trigger p5c5_begin: {all:[{questCompleted:dressed_for_disaster},{notFlag:p5_ch24_started},{onMap:main_deck}]}; story trigger p5c5_duty_done: {all:[{objectiveActive:one_useful_thing.confront},{notFlag:p5_emergency_duty_done},{onMap:main_deck}]}. Start flag: `p5_ch24_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 8 (room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow, npc dunstan). In-room hooks into this chapter: map objects in main_deck ×2; NPC dialogue in garrick, squawks.
12. **Complexity and priority.** Complexity L, priority P1.
13. **Preserving story and humour; variety.** 'Nothing left to take. Let it try.' and the S.E.S. at night stay as the quiet ending.
