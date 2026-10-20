# Story inventory, Phase 3: The Grand Stenchmaster

Chapters: 6 (p3c1 to p3c6). Dialogue lines: 663. Classification: Walk + press A 5, Timing / skill input 1.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE3.md`, `data/quests/phase3.json`, `data/story/cutscenes/phase3/`, `data/story/flags/phase3.json`, `tests/phase3_story.test.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p3c1` · Chapter 9: The Grand Stenchmaster Takes Command

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p3c1`, Chapter 9: The Grand Stenchmaster Takes Command. Scripts: 5 in `data/story/cutscenes/phase3/ch9.json`. Quests: `necessary_promotion` “A Necessary Promotion?” in `data/quests/phase3.json`.
2. **Events and dialogue.** Evening after the trial: the crew cope with the haze; Garrick, on a barrel, announces 'reforms', shows the Stench Log and declares himself Grand Stenchmaster. Dialogue: 110 lines (garrick 60, captain 17, (narration) 9, hale 8, squawks 4, quill 3, brask 2, bob 2, +5 more); 1 choice prompt(s) with 3 options. Presentation: spawn ×13, transition ×2, move ×2, shake ×2.
3. **Characters, locations, props, flags.** Speaking characters: garrick, hale, squawks, quill, brask, bob, mags, jim, rook, wick, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `main_deck`. Interactables: none. Flags set: 4 (`p3_started`, `garrick_reforms_started`, `garrick_reforms_heard`, `stenchmaster_declared`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Speak with Garrick (on a barrel, by the mainmast)” [flag]; “Listen to his 'reforms'” [flag]; “Inspect the Stench Log (on the crate beside him)” [flag]; “Witness the declaration” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A political scene; the Stench Log is a real UI system that can carry mechanics (forecasts, contamination records).
7. **Proposed primary mechanic.** Keep as a narrative beat with one interactive layer: a crew 'mood map' of who supports the reforms, used later for crew assignments.
8. **Secondary mechanics.** The Stench Log as a codex the player must consult in later hazard chapters (where the Dead Center is likely to be).
9. **Enemies, puzzles, timers, hazards, resources.** None needed; the scene is the setup.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: story trigger p3_begin: {all:[{flag:phase2_complete},{questNotStarted:necessary_promotion}]}; story trigger p3_declaration: {all:[{onMap:main_deck},{flag:stench_log_seen},{notFlag:stenchmaster_declared}]}. Start flag: `p3_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room captains_quarters, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** Rook's sock and the reforms speech are the point; don't gamify the speech. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p3c2` · Chapter 10: Blackbeard Becomes Stinkbeard

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p3c2`, Chapter 10: Blackbeard Becomes Stinkbeard. Scripts: 3 in `data/story/cutscenes/phase3/ch10.json`. Quests: `what_did_you_call_me` “What Did You Call Me?” in `data/quests/phase3.json`.
2. **Events and dialogue.** Garrick nails an amendment to the mainmast renaming the captain STINKBEARD; confrontation, the beard is sniffed (contaminated), the naming dispute, the name sticks. Dialogue: 98 lines (garrick 35, captain 33, (narration) 12, squawks 7, wick 4, rook 2, hale 2, gristle 1, +2 more); 2 choice prompt(s) with 4 options. Presentation: spawn ×9, move ×8, shake ×4, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, wick, rook, hale, gristle, brask, sully. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, wick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 7 (`amendment_read`, `stinkbeard_proposed`, `beard_sniffed`, `naming_dispute_survived`, `captain_named_stinkbeard`, `beard_prognosis`, `rain_started`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Read Garrick's amendment (the mainmast)” [flag]; “Confront Garrick” [flag]; “Investigate the beard contamination” [flag]; “Survive the naming dispute” [flag]; “Become Captain Stinkbeard” [flag]; “Ask whether the beard can be cleaned” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The beard becomes a lasting mechanic from here on (the Beard Saturation system).
7. **Proposed primary mechanic.** Introduce Beard Saturation: the first tag (Garrick original) and the beard meter; a short test where the beard's smell repels gulls/rats (benefit) and crew (cost).
8. **Secondary mechanics.** The naming dispute as a crew-vote moment (morale values), which can't be won (the name sticks) but shapes crew loyalty.
9. **Enemies, puzzles, timers, hazards, resources.** Crew who step away from the captain when the beard is 'hot' (affects conversations later).
10. **Failure conditions and consequences.** None; the name is canonical.
11. **Dependencies.** Entry: story trigger p3c2_begin: {all:[{questCompleted:necessary_promotion},{questNotStarted:what_did_you_call_me}]}. Start flag: `stenchmaster_declared`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room main_deck, dialogue inspect, room captains_quarters, room galley, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'I only read the first line. I didn't like the first line.' stays. The name change is the punchline; the beard meter gives it consequences.

### `p3c3` · Chapter 11: The Birth of Frog Grog

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p3c3`, Chapter 11: The Birth of Frog Grog. Scripts: 8 in `data/story/cutscenes/phase3/ch11.json`. Quests: `frog_grog` “Frog Grog” in `data/quests/phase3.json`.
2. **Events and dialogue.** Night, rain. The crew gather in the galley over contaminated grog; tasting it; checking the rum, brandy and hidden stash (all contaminated); Frog Grog is named and unlocked. Dialogue: 112 lines ((narration) 22, garrick 22, captain 13, mags 12, brask 8, rook 8, hale 6, crew 6, +5 more); 0 choice prompt(s) with 0 options. Presentation: move ×4, spawn ×2, transition ×1, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, mags, brask, rook, hale, crew, bob, wick, finch, jim, sully. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, jim, mags. Rooms: `captains_quarters`, `crew_quarters`, `main_deck`. Interactables: `rum_check` (captains_quarters 16,8), `brandy_check` (crew_quarters 15,4), `hidden_check` (crew_quarters 4,11). Flags set: 8 (`grog_night_started`, `grog_gathering_seen`, `grog_tasted`, `grog_check_cabinet`, `grog_check_medicine`, `grog_check_hidden`, `frog_grog_named`, `frog_grog_unlocked`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Investigate the crew gathering (Galley)” [flag]; “Taste the grog” [flag]; “Confirm the ship's alcohol is contaminated” [inspect×3]; “Report back to the galley” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Frog Grog is already an item with effects (Phase 3 engine). It can become the game's core consumable.
7. **Proposed primary mechanic.** Resource economy: Frog Grog as a crafted consumable with real trade-offs (restores HP/morale, raises beard saturation or causes belching status). The three checks become a timed search before Garrick drinks the stash.
8. **Secondary mechanics.** Light stealth: get the hidden stash before the crew finds it (patrolling crew).
9. **Enemies, puzzles, timers, hazards, resources.** Patrol routes in the crew quarters at night; leaking barrels to plug.
10. **Failure conditions and consequences.** Lose the stash → fewer starting Frog Grog for Phase 4 (scarcity).
11. **Dependencies.** Entry: story trigger p3c3_begin: {all:[{questCompleted:what_did_you_call_me},{questNotStarted:frog_grog}]}. Start flag: `grog_night_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room captains_quarters, room crew_quarters, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in crew_quarters ×2, captains_quarters ×1; NPC dialogue in jim, mags.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** The rain 'just making the smell wet', Mags's ration and the naming of Frog Grog stay.

### `p3c4` · Chapter 12: The Ship's Transformation

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p3c4`, Chapter 12: The Ship's Transformation. Scripts: 7 in `data/story/cutscenes/phase3/ch12.json`. Quests: `ship_is_changing` “The Ship Is Changing” in `data/quests/phase3.json`.
2. **Events and dialogue.** Morning: the ship itself has changed (yellow wood, sweating ropes, swollen sails, a coughing bell, a masked rat); the crew talk about it; sharks are mentioned. Dialogue: 89 lines (garrick 30, captain 23, (narration) 17, gristle 10, hale 4, masked_rat 3, squawks 2); 0 choice prompt(s) with 0 options. Presentation: spawn ×2, move ×2, transition ×1, shake ×1, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, gristle, hale, masked_rat, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `cargo_hold`, `main_deck`. Interactables: `wood_yellow` (cargo_hold 5,3), `mast_sails` (main_deck 9,19), `rope_damp` (main_deck 11,18). Flags set: 8 (`ship_morning_started`, `sails_swollen`, `ropes_sweating`, `bell_coughs`, `masked_rat_seen`, `wood_yellowing_seen`, `ship_names_rejected`, `sharks_mentioned`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Inspect the stained wood (Cargo Hold, by the treasure door)” [flag]; “Check the sails (mainmast)” [flag]; “Inspect the ropes” [flag]; “Ring the ship's bell (bow)” [flag]; “Speak with the crew about the changes” [event×3]; “Report to the Grand Stenchmaster (quarterdeck)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** An inspection tour of a ship that's 'sick' fits Ship Integrity and Atmosphere perfectly.
7. **Proposed primary mechanic.** Ship survey: diagnose the contamination damage room by room (each check reveals a system's condition and a repair need) and assign the first repairs (Ship Integrity introduction).
8. **Secondary mechanics.** The masked rat as a recurring mini-enemy/thief that steals a repair item.
9. **Enemies, puzzles, timers, hazards, resources.** Swollen sails that must be reefed with a timing bar; the masked rat.
10. **Failure conditions and consequences.** Unrepaired systems carry penalties into Phase 4 (slower turning, leaks).
11. **Dependencies.** Entry: story trigger p3c4_begin: {all:[{questCompleted:frog_grog},{questNotStarted:ship_is_changing}]}. Start flag: `ship_morning_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (dialogue inspect, room captains_quarters, room cargo_hold, room crew_quarters, room galley, room main_deck, npc garrick, npc squawks). In-room hooks into this chapter: map objects in main_deck ×3, cargo_hold ×1; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** The ship-name suggestions and the bell that coughs instead of rings stay; damage becomes funny when it's measurable.

### `p3c5` · Chapter 13: The Sharks Smell the Gust

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p3c5`, Chapter 13: The Sharks Smell the Gust. Scripts: 10 in `data/story/cutscenes/phase3/ch13.json`. Quests: `sharks` “Sharks!” in `data/quests/phase3.json`.
2. **Events and dialogue.** Sharks smell the Gust: an impact on the port side, a hull patch, the rudder, the Frog Grog barrel, Garrick's solution (the rowboat lure); Garrick is lowered away; the sharks follow him. Dialogue: 119 lines ((narration) 34, captain 23, garrick 22, jory 12, hale 8, brask 5, jim 4, squawks 3, +6 more); 1 choice prompt(s) with 3 options. Presentation: move ×9, spawn ×5, shake ×5, vista ×2, transition ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, jory, hale, brask, jim, squawks, rook, wick, ned, nell, gristle, crew. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `main_deck`. Interactables: `p3_impact` (main_deck 12,18), `rudder` (main_deck 5,2), `rowboat_lower` (main_deck 4,24). Flags set: 13 (`sharks_sighted`, `port_impact_seen`, `plank_fetched`, `hull_patched`, `rudder_checked`, `beard_bait_seen`, `grog_spilled`, `deck_shark_seen`, `beans_provided`, `rowboat_plan`, +3 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Investigate the port-side impact” [flag]; “Patch the hull (planks by the fore hatch)” [flag]; “Check the rudder (the stern rail)” [flag]; “Protect the supplies (the Frog Grog barrel)” [flag]; “Find a solution (Garrick)” [flag]; “Send Garrick away in the rowboat (starboard davit)” [flag]; “Watch the sharks follow” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The first shark fight. One repair bar today.
7. **Proposed primary mechanic.** Hull breach defence: real-time leak repair under shark attack (Ship Integrity: water rises in the hold until the patch holds) while sharks ram the hull.
8. **Secondary mechanics.** Rowboat launch as a crane/davit operation (timing + weight), then steering the lure away.
9. **Enemies, puzzles, timers, hazards, resources.** Ramming sharks (telegraphed bumps), a spilling grog barrel to secure, a rudder jam.
10. **Failure conditions and consequences.** Hold floods past a line → supplies lost and the ship lists (movement penalty) until pumped out; retry from the hatch.
11. **Dependencies.** Entry: story trigger p3c5_begin: {all:[{questCompleted:ship_is_changing},{questNotStarted:sharks}]}. Start flag: `sharks_mentioned`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 8 (room main_deck, dialogue inspect, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow). In-room hooks into this chapter: map objects in main_deck ×7; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity L, priority P1.
13. **Preserving story and humour; variety.** 'Imagine what they make of me.' and Garrick in the rowboat as live bait stay; the lure works because he's revolting, which the mechanic proves.

### `p3c6` · Chapter 14: The Grand Stenchmaster's Terms

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p3c6`, Chapter 14: The Grand Stenchmaster's Terms. Scripts: 9 in `data/story/cutscenes/phase3/ch14.json`. Quests: `stenchmaster_temporarily` “Grand Stenchmaster, Temporarily” in `data/quests/phase3.json`.
2. **Events and dialogue.** Garrick rows back; damage assessed with Jory; the Grand Stenchmaster's terms; Squawks's first new feather is yellow; a stomach warning; Garrick evacuated in the rowboat again; the second release far off. Dialogue: 135 lines (garrick 36, (narration) 35, captain 30, jory 12, squawks 9, hale 3, rook 3, brask 3, +3 more); 1 choice prompt(s) with 2 options. Presentation: move ×15, spawn ×14, shake ×3, transition ×2, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, jory, squawks, hale, rook, brask, wick, crew, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, jory, squawks. Rooms: `main_deck`. Interactables: `rowboat_again` (main_deck 4,24). Flags set: 14 (`garrick_returned`, `drunk_sharks_seen`, `damage_assessed`, `frog_water_seen`, `beard_inspection_agreed`, `stenchmaster_terms_set`, `squawks_feather_regrowth_started`, `squawks_first_new_feather_yellow`, `garrick_title_retained`, `second_gust_warning`, +4 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Recover Garrick (starboard davit)” [flag]; “Assess the damage (Jory)” [flag]; “Hear the Grand Stenchmaster's terms” [flag]; “Check on Squawks” [flag]; “Respond to the stomach warning” [flag]; “Evacuate Garrick again” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Negotiation and a second evacuation drill.
7. **Proposed primary mechanic.** Terms negotiation as a resource deal (what Garrick gets vs. what the ship gets: rations, title, duties) that sets Phase 4 starting conditions.
8. **Secondary mechanics.** Evacuation drill: get Garrick into the rowboat before the warning timer ends (carry/escort with crew help).
9. **Enemies, puzzles, timers, hazards, resources.** Countdown; crew in the way; davit timing.
10. **Failure conditions and consequences.** Release aboard → a room contaminated for Phase 4 (persistent, cleanable).
11. **Dependencies.** Entry: story trigger p3c6_begin: {all:[{questCompleted:sharks},{questNotStarted:stenchmaster_temporarily}]}; story trigger p3_epilogue: {all:[{questCompleted:stenchmaster_temporarily},{notFlag:p3_complete}]}. Start flag: `sharks_lured`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 8 (room main_deck, npc garrick, dialogue inspect, npc squawks, room galley, npc bob, npc ned, npc jim). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in garrick, jory, squawks.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** The one-oar return and the yellow feather are kept; the negotiation lets Garrick's business-speak become actual terms.
