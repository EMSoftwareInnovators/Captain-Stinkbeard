# Story inventory, Phase 17: The Return of the Ancient Crew and the Coffin Sock Catastrophe

Chapters: 17 (p17c1 to p17c17). Dialogue lines: 717. Classification: Walk + press A 9, Timing / skill input 6, Choice or puzzle prompt 2.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE17.md`, `data/quests/phase17.json`, `data/story/cutscenes/phase17/`, `data/story/flags/phase17.json`, `tests/phase17_story.test.js`, `tests/phase17Play.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p17c1` · Chapter 206: Brogath Remembers

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p17c1`, Chapter 206: Brogath Remembers. Scripts: 11 in `data/story/cutscenes/phase17/ch206_209.json`. Quests: `brogath_remembers` “Brogath Remembers” in `data/quests/phase17.json`.
2. **Events and dialogue.** In the Fart-Free Zone Brogath remembers his old crew; look at what he's kept (slate, pocket edition, sash); ask about five names; Pete speaks; something dawns on him; talk him out of it. Dialogue: 50 lines (brogath 31, (narration) 14, pete 3, captain 1, visitor_one 1); 2 choice prompt(s) with 9 options. Presentation: insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete, visitor_one. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath, pete. Rooms: `fart_free_zone`. Interactables: `p17_memory_slate` (fart_free_zone 3,3), `p17_memory_sash` (fart_free_zone 4,3), `p17_memory_book` (fart_free_zone 5,4). Flags set: 16 (`p17_started`, `p17_ch206_started`, `p17_memories_heard`, `p17_memory_slate`, `p17_memory_book`, `p17_memory_sash`, `p17_memories_said`, `p17_crew_ledger`, `p17_crew_tilda`, `p17_crew_jeb`, +6 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Sit with Brogath (on the bedding, the Fart-Free Zone)” [flag]; “What he's kept: the slate, the pocket edition, his sash on the wall (the Fart-Free Zone)” [event×3]; “Ask him about each of them (Brogath)” [event×5]; “Pete has something to say (Pete, the Fart-Free Zone)” [flag]; “Something is dawning on him (Brogath)” [flag]; “Talk him out of it (Brogath)” [flag]. Mechanics invoked by the scripts: stability change ×3, Brogath reassurance prompt ×1.
5. **Classification.** Choice or puzzle prompt (Brogath reassurance prompt ×1). Presentation-only effects with no player input: stability change ×3. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** An emotional, quiet setup chapter.
7. **Proposed primary mechanic.** Keep (quiet beat). The memory items become codex entries introducing Jeb, Ledger, Tilda and the others before they appear.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: story trigger p17_begin: {all:[{flag:p16_complete},{notFlag:p17_started},{onMap:fart_free_zone}]}; story trigger p17_p17_memories_said: {all:[{objectiveDone:brogath_remembers.memories},{notFlag:p17_memories_said}]}; story trigger p17_p17_names_said: {all:[{objectiveDone:brogath_remembers.names},{notFlag:p17_names_said}]}. Start flag: `p17_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room captains_quarters, room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, room washroom). In-room hooks into this chapter: map objects in fart_free_zone ×3; NPC dialogue in brogath, pete.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'I miss them.' is played straight; protect it. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p17c2` · Chapter 207: The Cardboard Crew

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p17c2`, Chapter 207: The Cardboard Crew. Scripts: 12 in `data/story/cutscenes/phase17/ch206_209.json`. Quests: `the_cardboard_crew` “The Cardboard Crew” in `data/quests/phase17.json`.
2. **Events and dialogue.** The Cardboard Crew: Brogath has made five life-size cut-outs (Jeb, Ledger, Tilda and two more) on the north wall of the old quarters; look at each; eyebrows; warn him off the treasure-room door; have Pete watch it; RUN to the door. Dialogue: 41 lines ((narration) 20, brogath 10, captain 7, pete 4); 0 choice prompt(s) with 0 options. Presentation: insert ×2, shake ×2.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath, pete. Rooms: `cargo_hold`, `crew_quarters`, `galley`. Interactables: `p17_cutout_jeb` (crew_quarters 5,5), `p17_cutout_ledger` (crew_quarters 6,5), `p17_cutout_tilda` (crew_quarters 7,5), `p17_cutout_ned` (crew_quarters 10,5), `p17_cutout_elsie` (crew_quarters 11,5). Flags set: 15 (`p17_ch207_started`, `ledger_cutout_created`, `tilda_cutout_created`, `other_old_crew_cutouts_prepared`, `p17_cutouts_found`, `p17_cutout_ledger`, `p17_cutout_tilda`, `p17_cutout_jeb`, `p17_cutout_ned`, `p17_cutout_elsie`, +5 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “See what he's making (the north wall of the old quarters)” [flag]; “Look at each cut-out (the north wall, the old quarters)” [event×5]; “Brogath, working on the eyebrows (Brogath)” [flag]; “Warn him off the treasure-room door (Brogath)” [flag]; “Have that door watched: Pete (on deck, by the wheel)” [flag]; “RUN: the treasure-room door (the hold)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Introduces the ancient crew as objects first; ends in a race.
7. **Proposed primary mechanic.** Race to the door: a real-time dash from the quarters through the galley to the hold (trigger-based race exists) with obstacles (Mark II cable, sliding table).
8. **Secondary mechanics.** Cut-out inspection (character introductions).
9. **Enemies, puzzles, timers, hazards, resources.** Race timer, obstacles.
10. **Failure conditions and consequences.** Too slow → the door is further open in p17c3 (harder).
11. **Dependencies.** Entry: p17c1 (p17c1.dissuade -> p17c2.begin). Start flag: `p17_ch207_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 10 (room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob). In-room hooks into this chapter: map objects in crew_quarters ×5; NPC dialogue in brogath, pete.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'They are very, very flat.' stays.

### `p17c3` · Chapter 208: The Forbidden Door

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p17c3`, Chapter 208: The Forbidden Door. Scripts: 4 in `data/story/cutscenes/phase17/ch206_209.json`. Quests: `the_forbidden_door` “The Forbidden Door” in `data/quests/phase17.json`.
2. **Events and dialogue.** The Forbidden Door: Brogath, with Ledger and Tilda cut-outs propped beside him, is pulling planks; something behind pushes; stop him; slam and nail; turn round – the plume has entered the cut-outs. Dialogue: 31 lines ((narration) 20, pete 5, brogath 4, captain 2); 0 choice prompt(s) with 0 options. Presentation: move ×3, shake ×3, spawn ×3, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, brogath. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `cargo_hold`. Interactables: `p17_door_stop` (cargo_hold 4,3), `p17_door_shut` (cargo_hold 4,3), `p17_plume_l` (cargo_hold 2,5), `p17_plume_r` (cargo_hold 6,5). Flags set: 5 (`p17_ch208_started`, `p17_door_cracked`, `p17_door_resealed`, `ledger_billiam_reincarnated`, `tilda_reincarnated`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Stop him (the treasure-room door, the hold)” [flag]; “SLAM IT AND NAIL IT (the treasure-room door)” [flag]; “Turn round (the cut-outs, by the door)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×2.
5. **Classification.** Timing / skill input (timing bar (repair) ×2). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A struggle at a door.
7. **Proposed primary mechanic.** Door hold: alternate holding the door against pushes and nailing planks (timing bar + push resistance).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Push timing.
10. **Failure conditions and consequences.** Door bursts → plume escapes (scripted anyway), small exposure.
11. **Dependencies.** Entry: story trigger p17_race: {all:[{objectiveActive:the_cardboard_crew.run},{notFlag:p17_ch208_started},{onMap:cargo_hold}]}. Start flag: `p17_ch208_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (room cargo_hold, room crew_quarters, room fart_free_zone, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in cargo_hold ×4; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'like guests at a door they've been invited to' stays.

### `p17c4` · Chapter 209: The Ancient Reunion

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p17c4`, Chapter 209: The Ancient Reunion. Scripts: 4 in `data/story/cutscenes/phase17/ch206_209.json`. Quests: `the_ancient_reunion` “The Ancient Reunion” in `data/quests/phase17.json`.
2. **Events and dialogue.** The Ancient Reunion: Ledger and Tilda wake in cardboard; talk to each; let them have a moment with Brogath. Dialogue: 35 lines (ledger 10, tilda 8, (narration) 7, captain 5, brogath 4, pete 1); 1 choice prompt(s) with 3 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: ledger, tilda, brogath, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): ledger, tilda, brogath. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 6 (`p17_ch209_started`, `p17_ledger_woke`, `p17_tilda_woke`, `old_crew_reunion_completed`, `ledger_party_unlocked`, `tilda_party_unlocked`); items given: none.
4. **Current player actions and mechanics.** Objectives: “The one with the hat (Ledger, the hold)” [flag]; “The one with the eyebrows (Tilda, the hold)” [flag]; “Let them have a moment (Brogath, the hold)” [flag]. Mechanics invoked by the scripts: stability change ×1.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Character introduction (two new crew members).
7. **Proposed primary mechanic.** Keep (narrative).
8. **Secondary mechanics.** Crew integration: assign Ledger and Tilda quarters/stations later (see crew audit).
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p17c3 (p17c3.plume -> p17c4.begin). Start flag: `p17_ch209_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room cargo_hold, room crew_quarters, room fart_free_zone, room main_deck, npc garrick, npc squawks, npc jim, npc gristle). In-room hooks into this chapter: map objects in none; NPC dialogue in brogath, ledger, tilda.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Is it a tax thing?' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p17c5` · Chapter 210: Adult Supervision

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p17c5`, Chapter 210: Adult Supervision. Scripts: 14 in `data/story/cutscenes/phase17/ch210_213.json`. Quests: `the_geniuses` “Adult Supervision” in `data/quests/phase17.json`.
2. **Events and dialogue.** Adult Supervision: Ledger 'did the ship's finances'; correct three book entries; find out what Tilda told Gristle and Bob; put barrels back; check the roster Ledger 'corrected'; Brogath is impressed; settle who's in charge; optional: Tilda's drill (the only scripted battle in the 222 chapters). Dialogue: 64 lines ((narration) 16, captain 15, tilda 12, ledger 11, gristle 5, bob 3, brogath 2); 5 choice prompt(s) with 14 options. Presentation: insert ×3.
3. **Characters, locations, props, flags.** Speaking characters: tilda, ledger, gristle, bob, brogath. NPCs with dialogue keyed to an objective (hints, reactions or completions): ledger, bob, gristle, brogath, tilda. Rooms: `crew_quarters`, `galley`, `main_deck`. Interactables: `p17_entries` (galley 9,7), `p17_barrel_wheel` (main_deck 8,7), `p17_barrel_rail` (main_deck 15,13), `p17_roster` (crew_quarters 9,12). Flags set: 17 (`p17_ch210_started`, `ledger_accounting_introduced`, `p17_entry_assets`, `p17_entry_storm`, `p17_entry_currency`, `p17_entry_maybe`, `p17_entries_said`, `p17_orders_gristle`, `p17_orders_bob`, `p17_orders_said`, +7 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Ledger's review of the finances (Ledger, the galley)” [flag]; “Correct his books (the ledger on the galley's mess table)” [event×3]; “What did Tilda tell them? (Gristle and Bob, on deck)” [event×2]; “Put the barrels back (on deck: by the wheel, by the rail)” [event×2]; “The crew roster Ledger 'corrected' (the rules board, the old quarters)” [flag]; “Brogath, impressed (Brogath, the old quarters)” [flag]; “Settle who's in charge (Tilda, on deck)” [flag]; “Tilda's drill, to see what they can do (Tilda)” [flag, optional]. Mechanics invoked by the scripts: timing bar (repair) ×2, stability change ×1, battle ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×2, battle ×1). Presentation-only effects with no player input: stability change ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Contains the only story battle; Tilda as drill-master is the natural combat trainer.
7. **Proposed primary mechanic.** Tilda's drill becomes a mandatory combat training sequence (real-time field combat tutorial or turn-based party drill), introducing combat for the late game.
8. **Secondary mechanics.** Book corrections as an accounting puzzle (find the three errors).
9. **Enemies, puzzles, timers, hazards, resources.** Training opponents (crew sparring), puzzle.
10. **Failure conditions and consequences.** Lose the drill → Tilda's disappointment line; retry.
11. **Dependencies.** Entry: p17c4 (p17c4.reunion -> p17c5.begin). Start flag: `p17_ch210_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 10 (dialogue tilda, room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks). In-room hooks into this chapter: map objects in main_deck ×2, galley ×1, crew_quarters ×1; NPC dialogue in bob, brogath, gristle, ledger, tilda.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'I counted once and then I wrote it down twice. That's double-entry.' stays.

### `p17c6` · Chapter 211: The Ninety-Seven Pages, Again

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p17c6`, Chapter 211: The Ninety-Seven Pages, Again. Scripts: 4 in `data/story/cutscenes/phase17/ch210_213.json`. Quests: `tilda_application` “The Ninety-Seven Pages, Again” in `data/quests/phase17.json`.
2. **Events and dialogue.** The Ninety-Seven Pages, Again: Tilda at the Bureau; offer her the lighter; her application. Dialogue: 23 lines (tilda 11, (narration) 8, captain 3, brogath 1); 2 choice prompt(s) with 4 options. Presentation: giveItem ×1.
3. **Characters, locations, props, flags.** Speaking characters: tilda, brogath. NPCs with dialogue keyed to an objective (hints, reactions or completions): tilda. Rooms: `crew_quarters`. Interactables: `p17_tilda_form` (crew_quarters 12,14). Flags set: 5 (`p17_ch211_started`, `p17_tilda_at_bureau`, `p17_lighter_refused`, `p17_permit_issued`, `tilda_ignition_application_approved`); items given: tilda_ignition_permit.
4. **Current player actions and mechanics.** Objectives: “Tilda at the Bureau (the counter, the old quarters)” [flag]; “Offer her the lighter (Tilda)” [flag]; “Her application (the counter: 97 pages)” [flag]. Mechanics invoked by the scripts: lighter clicks ×1, proceeding (form/hearing/pitch) ×1.
5. **Classification.** Choice or puzzle prompt (proceeding (form/hearing/pitch) ×1). Presentation-only effects with no player input: lighter clicks ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Proceeding.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p17c5 (p17c5.authority -> p17c6.begin). Start flag: `p17_ch211_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (dialogue tilda, room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc bob). In-room hooks into this chapter: map objects in crew_quarters ×1; NPC dialogue in tilda.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** Tilda's memory of the Fire-Waft is a sincere beat; keep. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p17c7` · Chapter 212: The Crew He Left Behind

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p17c7`, Chapter 212: The Crew He Left Behind. Scripts: 7 in `data/story/cutscenes/phase17/ch210_213.json`. Quests: `old_crew_documentary` “The Crew He Left Behind” in `data/quests/phase17.json`.
2. **Events and dialogue.** The Crew He Left Behind: the Mark II shows a documentary about Brogath's crew; watch it with them; afterwards. Dialogue: 21 lines ((narration) 13, ledger 4, brogath 2, tilda 2); 3 choice prompt(s) with 8 options. Presentation: vista ×1, channelEpisode ×1.
3. **Characters, locations, props, flags.** Speaking characters: ledger, brogath, tilda. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `galley`. Interactables: `p17_doc_set` (galley 16,7), `p17_doc_watch` (galley 16,7). Flags set: 4 (`p17_ch212_started`, `p17_doc_on`, `old_crew_documentary_viewed`, `p17_doc_after`); items given: none.
4. **Current player actions and mechanics.** Objectives: “The Mark II (the galley)” [flag]; “Watch it with them (the Mark II, the galley)” [flag]; “Afterwards (Brogath, the galley)” [flag]. Mechanics invoked by the scripts: stability change ×2, TV power ×1.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×2, TV power ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** TV.
7. **Proposed primary mechanic.** Keep (quiet beat).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p17c6 (p17c6.form -> p17c7.begin). Start flag: `p17_ch212_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (dialogue tilda, room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc bob). In-room hooks into this chapter: map objects in galley ×2; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** '...That's us.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p17c8` · Chapter 213: The Ledgers of Greyhook Cove

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p17c8`, Chapter 213: The Ledgers of Greyhook Cove. Scripts: 11 in `data/story/cutscenes/phase17/ch210_213.json`. Quests: `great_ledger_proposal` “The Ledgers of Greyhook Cove” in `data/quests/phase17.json`; `the_great_ledger_expedition` “The Great Ledger Expedition” (left OPEN) in `data/quests/phase17.json`.
2. **Events and dialogue.** The Ledgers of Greyhook Cove: Ledger wants his books; argue; Tilda has taken the wheel; countermand her orders to Gristle and Bob; Pete; your name back in the helm log; secure the wheel; show her the Sharkstorm. Opens 'The Great Ledger Expedition' (escape the Sharkstorm, sail for Greyhook, find the ledgers) – open and blocked at the end of Phase 17. Dialogue: 37 lines (tilda 10, captain 7, ledger 6, (narration) 5, brogath 2, gristle 2, bob 2, pete 2, +1 more); 1 choice prompt(s) with 3 options. Presentation: insert ×1, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: tilda, ledger, brogath, gristle, bob, pete, hale. NPCs with dialogue keyed to an objective (hints, reactions or completions): ledger, bob, gristle, pete, tilda. Rooms: `main_deck`. Interactables: `p17_log` (main_deck 12,6), `p17_wheel` (main_deck 9,6). Flags set: 11 (`p17_ch213_started`, `greyhook_expedition_proposed`, `greyhook_expedition_blocked`, `p17_tilda_helm`, `p17_cm_gristle`, `p17_cm_bob`, `p17_countermand_said`, `p17_helm_pete`, `p17_helm_log`, `p17_wheel_secured`, +1 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Ledger remembers his books (Ledger, the galley)” [flag]; “Argue about it (Ledger and Tilda)” [flag]; “Tilda has gone up to the wheel (on deck)” [flag]; “Countermand her orders (Gristle at the sheets, Bob at the braces, on deck)” [event×2]; “Pete (on deck)” [flag]; “Your name back in the helm log (the log by the wheel)” [flag]; “Secure the wheel (the wheel)” [flag]; “Show her the Sharkstorm (Tilda, at the rail)” [flag]; “BLOCKED: get the Revenge out of the Sharkstorm first” [flag]; “Sail for Greyhook Cove” [flag]; “Find Ledger's ledgers” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A command struggle (who's captain).
7. **Proposed primary mechanic.** Command contest: Tilda issues orders around the deck; the captain countermands at each station before the ship changes course (race against her).
8. **Secondary mechanics.** Helm log as a persistent record.
9. **Enemies, puzzles, timers, hazards, resources.** Tilda's speed, station count.
10. **Failure conditions and consequences.** Ship turns → course correction at the dial.
11. **Dependencies.** Entry: p17c7 (p17c7.after -> p17c8.begin). Start flag: `p17_ch213_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 6 (dialogue tilda, room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc bob). In-room hooks into this chapter: map objects in main_deck ×2; NPC dialogue in bob, gristle, ledger, pete, tilda.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'Two days east by north. One if Brogath helps.' / 'Do I blow?' stays.

### `p17c9` · Chapter 214: Captain Minutes

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p17c9`, Chapter 214: Captain Minutes. Scripts: 5 in `data/story/cutscenes/phase17/ch214_217.json`. Quests: `captain_minutes` “Captain Minutes” in `data/quests/phase17.json`.
2. **Events and dialogue.** Captain Minutes: Ledger finds a Grand Token; stop him at the converter; ban conversions; his research. Dialogue: 42 lines ((narration) 23, ledger 15, captain 3, brogath 1); 5 choice prompt(s) with 10 options. Presentation: insert ×7, shake ×5, giveItem ×1.
3. **Characters, locations, props, flags.** Speaking characters: ledger, brogath. NPCs with dialogue keyed to an objective (hints, reactions or completions): ledger. Rooms: `crew_quarters`. Interactables: `p17_stop` (crew_quarters 7,14), `p17_ban` (crew_quarters 7,14). Flags set: 6 (`p17_ch214_started`, `p17_ledger_token`, `ledger_converter_incident_complete`, `p17_conversions_banned`, `p17_research_given`, `captain_minutes_invented`); items given: ledger_research.
4. **Current player actions and mechanics.** Objectives: “Ledger's found a token (Ledger, the old quarters)” [flag]; “STOP HIM (the converter, by the mast)” [flag]; “Ban conversions (the converter)” [flag]; “Ledger's research (Ledger)” [flag]. Mechanics invoked by the scripts: converter ×1.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: converter ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Converter.
7. **Proposed primary mechanic.** Keep; a short race to stop him before the converter cycles.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Short timer.
10. **Failure conditions and consequences.** Converted → a comic asset appears.
11. **Dependencies.** Entry: p17c8 (p17c8.explain -> p17c9.begin). Start flag: `p17_ch214_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (dialogue tilda, room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks). In-room hooks into this chapter: map objects in crew_quarters ×2; NPC dialogue in ledger.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Everything's worth something, Captain. That's the first rule of accounting.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p17c10` · Chapter 215: Meet the New Dead Idiots!

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p17c10`, Chapter 215: Meet the New Dead Idiots!. Scripts: 6 in `data/story/cutscenes/phase17/ch214_217.json`. Quests: `new_dead_idiots` “Meet the New Dead Idiots!” in `data/quests/phase17.json`.
2. **Events and dialogue.** The Bling Bling King's Late-Night Sharkstorm Special (TV). Dialogue: 21 lines ((narration) 10, bbk_special 3, visitor_two 2, visitor_one 2, tilda 1, ledger 1, brogath 1, shark_audience 1); 2 choice prompt(s) with 6 options. Presentation: vista ×1, channelEpisode ×1.
3. **Characters, locations, props, flags.** Speaking characters: bbk_special, visitor_two, visitor_one, tilda, ledger, brogath, shark_audience. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`. Interactables: `p17_special_set` (galley 16,7), `p17_special_watch` (galley 16,7). Flags set: 3 (`p17_ch215_started`, `p17_special_on`, `bbk_late_night_special_viewed`); items given: none.
4. **Current player actions and mechanics.** Objectives: “The Mark II (the galley)” [flag]; “THE BLING BLING KING'S LATE-NIGHT SHARKSTORM SPECIAL (the Mark II)” [flag]. Mechanics invoked by the scripts: TV power ×1.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: TV power ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** TV.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p17c9 (p17c9.research -> p17c10.begin). Start flag: `p17_ch215_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (dialogue tilda, room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks). In-room hooks into this chapter: map objects in galley ×2; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'BRO. Bro. It's the KING.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p17c11` · Chapter 216: The Grand Restraint

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p17c11`, Chapter 216: The Grand Restraint. Scripts: 10 in `data/story/cutscenes/phase17/ch214_217.json`. Quests: `grand_restraint` “The Grand Restraint” in `data/quests/phase17.json`.
2. **Events and dialogue.** The Grand Restraint: Tilda's approved permit; make your points; safety conditions; prep (portholes, Agnes to the zone, Pete's bucket); the restraint behind the rope. Dialogue: 48 lines ((narration) 16, tilda 15, captain 7, brogath 5, pete 3, agnes_second 1, ledger 1); 3 choice prompt(s) with 12 options. Presentation: insert ×3.
3. **Characters, locations, props, flags.** Speaking characters: tilda, brogath, pete, agnes_second, ledger. NPCs with dialogue keyed to an objective (hints, reactions or completions): tilda, pete, agnes_second. Rooms: `stenchmaster_fart_zone`. Interactables: `p17_prep_portholes` (stenchmaster_fart_zone 6,3), `p17_restraint` (stenchmaster_fart_zone 12,7). Flags set: 19 (`p17_ch216_started`, `p17_permit_produced`, `p17_point_lungs`, `p17_point_card`, `p17_point_fire`, `p17_point_warned`, `p17_point_lighter`, `p17_points_said`, `tilda_admits_comfort`, `p17_safety_conditions`, +9 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Tilda, with her permit (Tilda, the galley)” [flag]; “Make your points (Tilda)” [event×3]; “The safety conditions (Tilda)” [flag]; “Get ready: the Fart Zone's portholes, Agnes to the Fart-Free Zone, Pete's bucket” [event×3]; “THE GRAND STENCHMASTER'S GRAND RESTRAINT (behind the rope, the Fart Zone)” [flag]. Mechanics invoked by the scripts: stability change ×7, Fart Zone procedure ×5, lighter clicks ×1, timing bar (repair) ×1, Brogath reassurance prompt ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1, Brogath reassurance prompt ×1). Presentation-only effects with no player input: stability change ×7, Fart Zone procedure ×5, lighter clicks ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A Fart Zone procedure with negotiated conditions.
7. **Proposed primary mechanic.** Negotiated procedure: the conditions won in the argument (choice) change the procedure's difficulty; then run it.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Procedure steps.
10. **Failure conditions and consequences.** Procedure error → leak (exposure).
11. **Dependencies.** Entry: p17c10 (p17c10.watch -> p17c11.begin). Start flag: `p17_ch216_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: p17c12 (3). Flags read by world data (rooms/NPCs/triggers): 7 (dialogue tilda, room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick). In-room hooks into this chapter: map objects in stenchmaster_fart_zone ×2; NPC dialogue in agnes_second, pete, tilda.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'which is easy, because so is she' (flat) stays.

### `p17c12` · Chapter 217: The Fire-Sharkstorm

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p17c12`, Chapter 217: The Fire-Sharkstorm. Scripts: 14 in `data/story/cutscenes/phase17/ch214_217.json`. Quests: `fire_sharkstorm` “The Fire-Sharkstorm” in `data/quests/phase17.json`.
2. **Events and dialogue.** The Fire-Sharkstorm: a great white hits the hull; the cardboard crew spin; Brogath's restraint fails; fetch Agnes; bring her to Brogath; everyone mellow; try to breathe it in yourself. Dialogue: 63 lines ((narration) 28, tilda 9, captain 7, brogath 4, pete 4, ledger 3, agnes_second 2, garrick 2, +3 more); 0 choice prompt(s) with 0 options. Presentation: shake ×3, vista ×2.
3. **Characters, locations, props, flags.** Speaking characters: tilda, brogath, pete, ledger, agnes_second, garrick, jim, visitor_one, visitor_two. NPCs with dialogue keyed to an objective (hints, reactions or completions): agnes_second, garrick, jim, pete, brogath, visitor_one, visitor_two, ledger, tilda. Rooms: `main_deck`, `stenchmaster_fart_zone`. Interactables: `p17_inhale` (main_deck 16,13). Flags set: 18 (`p17_ch217_started`, `fire_sharkstorm_occurred`, `tilda_cardboard_singed`, `p17_fire_deck_seen`, `p17_agnes_fetched`, `p17_carrying_agnes`, `chicken_town_second_mellowing`, `tilda_cigarette_lit`, `p17_mellow_brogath`, `p17_mellow_ledger`, +8 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Fetch Agnes (the Fart-Free Zone, in the hold)” [flag]; “Bring her to Brogath, gently (the Fart Zone, across the deck)” [flag]; “Everybody's mellow but you (Brogath, Ledger, Tilda in the Fart Zone; Pete, the visitors on deck; Garrick, Jim in the galley)” [event×7]; “Try to breathe it in yourself (the haze, any rail on deck)” [flag]. Mechanics invoked by the scripts: stability change ×5, Fart Zone procedure ×3.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×5, Fart Zone procedure ×3. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Impact + escort.
7. **Proposed primary mechanic.** Escort Agnes across the deck during the shark impacts (telegraphed hits), then a short Atmosphere sequence.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Impacts, escort.
10. **Failure conditions and consequences.** Agnes bolts → recapture.
11. **Dependencies.** Entry: p17c11 (p17c11.restraint -> p17c12.begin). Start flag: `p17_ch217_started`. Reads flags first set in earlier chapters: p17c11: `p17_prec_bucket`, `p17_prec_tilda`, `p17_prec_ports`. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 15 (dialogue tilda, room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in agnes_second, brogath, garrick, jim, ledger, pete, tilda, visitor_one, visitor_two.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'like three playing cards thrown at a hat' stays.

### `p17c13` · Chapter 218: Lord Vaporious Thunderbottom the Seventh

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p17c13`, Chapter 218: Lord Vaporious Thunderbottom the Seventh. Scripts: 7 in `data/story/cutscenes/phase17/ch218_222.json`. Quests: `thunderbottom` “Lord Vaporious Thunderbottom the Seventh” in `data/quests/phase17.json`.
2. **Events and dialogue.** Lord Vaporious Thunderbottom the Seventh rings the Bureau bell; serve him; stand between him and Agnes; Agnes follows him; lead her away to the Fart-Free Zone cushion. Dialogue: 47 lines (thunderbottom 20, (narration) 18, captain 6, pete 1, garrick 1, agnes_second 1); 2 choice prompt(s) with 8 options. Presentation: spawn ×1, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: thunderbottom, pete, garrick, agnes_second. NPCs with dialogue keyed to an objective (hints, reactions or completions): thunderbottom, agnes_second. Rooms: `crew_quarters`, `fart_free_zone`, `main_deck`. Interactables: `p17_bell` (crew_quarters 12,14), `p17_cushion` (fart_free_zone 2,5). Flags set: 14 (`p17_ch218_started`, `thunderbottom_arrived`, `thunderbottom_threatened_agnes`, `p17_tb_stood`, `p17_tb_forms`, `p17_tb_complaints`, `p17_tb_overtime`, `p17_tb_title`, `p17_tb_insults`, `p17_please`, +4 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “The bell (the counter, the old quarters)” [flag]; “Serve him (the counter)” [flag]; “Stand between him and Agnes (Lord Thunderbottom)” [flag]; “Agnes is following him. Lead her away (Agnes, by the grating on deck)” [flag]; “Further away: the Fart-Free Zone (put her on the cushion)” [flag]. Mechanics invoked by the scripts: Fart Zone procedure ×5.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: Fart Zone procedure ×5. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A new spectral heavyweight; Agnes as a lure.
7. **Proposed primary mechanic.** Lure-and-lead: Agnes follows the strongest smell; the captain's beard (Saturation) is a competing lure – use it to lead her away from Thunderbottom.
8. **Secondary mechanics.** Thunderbottom as a recurring spectral 'boss'.
9. **Enemies, puzzles, timers, hazards, resources.** Agnes pathing, Thunderbottom's pull.
10. **Failure conditions and consequences.** Agnes reaches him → restart lead.
11. **Dependencies.** Entry: p17c12 (p17c12.end -> p17c13.begin). Start flag: `p17_ch218_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 6 (room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, room cargo_hold, npc garrick, npc squawks). In-room hooks into this chapter: map objects in crew_quarters ×1, fart_free_zone ×1; NPC dialogue in agnes_second, thunderbottom.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'a crown on top of another crown' stays.

### `p17c14` · Chapter 219: The Grand Fart Chamber

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p17c14`, Chapter 219: The Grand Fart Chamber. Scripts: 5 in `data/story/cutscenes/phase17/ch218_222.json`. Quests: `grand_fart_chamber` “The Grand Fart Chamber” in `data/quests/phase17.json`.
2. **Events and dialogue.** The Grand Fart Chamber: Agnes slips off; Thunderbottom counts down; get to the Fart Zone; get her out; Agnes on deck. Dialogue: 39 lines ((narration) 29, thunderbottom 5, agnes_second 3, pete 1, captain 1); 2 choice prompt(s) with 5 options. Presentation: shake ×4, transition ×2, spawn ×2.
3. **Characters, locations, props, flags.** Speaking characters: thunderbottom, agnes_second, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): agnes_second. Rooms: `main_deck`, `stenchmaster_fart_zone`. Interactables: `p17_grating` (main_deck 9,16). Flags set: 5 (`p17_ch219_started`, `thunderbottom_fart_zone_started`, `agnes_thunderbottom_rescue_complete`, `thunderbottom_departed`, `agnes_post_rescue_condition`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Get to the Fart Zone (the grating, on deck)” [flag]; “Get her out (the Fart Zone)” [flag]; “Agnes (on deck)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×5, Fart Zone procedure ×5.
5. **Classification.** Timing / skill input (timing bar (repair) ×5). Presentation-only effects with no player input: Fart Zone procedure ×5. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A countdown rescue (five Fart Zone procedure steps, five timing bars).
7. **Proposed primary mechanic.** Countdown rescue: reach the Fart Zone and extract Agnes before the countdown (procedure steps must be done in order under pressure).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Countdown, procedure.
10. **Failure conditions and consequences.** Countdown ends → exposure collapse; retry from the grating.
11. **Dependencies.** Entry: p17c13 (p17c13.farther -> p17c14.begin). Start flag: `p17_ch219_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc jim). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in agnes_second.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'a voice like a cathedral, counting down' stays.

### `p17c15` · Chapter 220: The Beard Exhales

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p17c15`, Chapter 220: The Beard Exhales. Scripts: 9 in `data/story/cutscenes/phase17/ch218_222.json`. Quests: `beard_exhales` “The Beard Exhales” in `data/quests/phase17.json`.
2. **Events and dialogue.** The Beard Exhales: the beard puffs by itself (it's not just keeping them); optional shave at the washroom mirror; Brogath notices; emergency procedures. Dialogue: 31 lines ((narration) 16, brogath 4, tilda 3, ledger 3, captain 2, pete 2, agnes_second 1); 0 choice prompt(s) with 0 options. Presentation: insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, tilda, ledger, pete, agnes_second. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath, agnes_second, ledger, tilda. Rooms: `crew_quarters`, `washroom`. Interactables: `p17_shave` (washroom 2,4), `p17_board` (crew_quarters 9,12). Flags set: 10 (`p17_ch220_started`, `p17_first_puff`, `beard_puffing`, `p17_shave_joke`, `brogath_coffin_sock_brewing`, `p17_proc_tilda`, `p17_proc_ledger`, `p17_proc_agnes`, `p17_proc_board`, `p17_proc_said`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Your beard (the old quarters)” [flag]; “Shave it off (the washroom mirror)” [flag, optional]; “Brogath has noticed something (Brogath, the old quarters)” [flag]; “Emergency procedures: Tilda, Ledger, Agnes into the Fart-Free Zone, Pete's board” [event×4]. Mechanics invoked by the scripts: stability change ×4.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×4. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Beard Saturation becomes an active hazard (the beard emits).
7. **Proposed primary mechanic.** Beard emissions: at high saturation the beard puffs periodically (small fume bursts that affect nearby crew); the shave option resets saturation with a cost.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Periodic puffs.
10. **Failure conditions and consequences.** Crew affected → conditions.
11. **Dependencies.** Entry: p17c14 (p17c14.after -> p17c15.begin). Start flag: `p17_ch220_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc squawks). In-room hooks into this chapter: map objects in washroom ×1, crew_quarters ×1; NPC dialogue in agnes_second, brogath, ledger, tilda.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** '...It's not just keeping them.' stays.

### `p17c16` · Chapter 221: The Beard Joint (Again)

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p17c16`, Chapter 221: The Beard Joint (Again). Scripts: 14 in `data/story/cutscenes/phase17/ch218_222.json`. Quests: `beard_joint` “The Beard Joint (Again)” in `data/quests/phase17.json`.
2. **Events and dialogue.** The Beard Joint (Again): Garrick with scissors proposes the Beard Joint; something wrong with everyone's faces; Garrick's 'improvement'; who's in on it (five). Dialogue: 74 lines ((narration) 40, garrick 9, captain 9, pete 4, agnes_second 2, gristle 2, ledger 2, tilda 2, +3 more); 6 choice prompt(s) with 13 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, agnes_second, gristle, ledger, tilda, brogath, jim, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, bob, jim, gristle, pete, brogath, ledger, tilda. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 17 (`p17_ch221_started`, `garrick_beard_joint_experiment`, `p17_beard_joint_vision`, `p17_vision_pete`, `p17_vision_jim`, `p17_vision_gristle`, `p17_vision_bob`, `p17_vision_said`, `frog_grog_beard_exposure`, `p17_grand_paranoia`, +7 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Garrick (the old quarters)” [flag]; “Something is wrong with everybody's faces (talk to two of them)” [event×2]; “Garrick's improvement (Garrick)” [flag]; “Who's in on it? (Garrick, Ledger, Tilda, Brogath, Pete: the old quarters)” [event×5]. Mechanics invoked by the scripts: stability change ×5.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×5. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Third altered-state sequence (paranoia/hallucination).
7. **Proposed primary mechanic.** Reuse the hallucination system (p13c14/p15c8) with escalation: the captain must identify who is really conspiring (none) via evidence, not accusations.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Evidence vs. hallucination.
10. **Failure conditions and consequences.** False accusations → morale cost.
11. **Dependencies.** Entry: p17c15 (p17c15.procedures_done -> p17c16.begin). Start flag: `p17_ch221_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 13 (room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc squawks). In-room hooks into this chapter: map objects in none; NPC dialogue in bob, brogath, garrick, gristle, jim, ledger, pete, tilda.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'Hear me out. The BEARD JOINT.' stays.

### `p17c17` · Chapter 222: The Coffin Sock Catastrophe

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p17c17`, Chapter 222: The Coffin Sock Catastrophe. Scripts: 8 in `data/story/cutscenes/phase17/ch218_222.json`. Quests: `coffin_sock_catastrophe` “The Coffin Sock Catastrophe” in `data/quests/phase17.json`.
2. **Events and dialogue.** The Coffin Sock Catastrophe: the captain sees Jim as Princess Stenchalina; Brogath's release; afterwards (Ledger, Pete, Brogath). Current end of the implemented story. Dialogue: 50 lines ((narration) 21, captain 9, jim 7, brogath 6, ledger 3, pete 2, tilda 1, garrick 1); 0 choice prompt(s) with 0 options. Presentation: shake ×4, vista ×2.
3. **Characters, locations, props, flags.** Speaking characters: jim, brogath, ledger, pete, tilda, garrick. NPCs with dialogue keyed to an objective (hints, reactions or completions): jim, brogath, pete, ledger. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 10 (`p17_ch222_started`, `princess_stenchalina_delusion`, `p17_paranoia_broken`, `stinkbeard_paranoia_residue`, `major_coffin_sock_release_complete`, `p17_after_ledger`, `p17_after_pete`, `p17_after_brogath`, `p17_after_said`, `p17_complete`); items given: none.
4. **Current player actions and mechanics.** Objectives: “HER (Salty Jim, the old quarters)” [flag]; “...Brogath? (the old quarters)” [flag]; “Afterwards (Ledger, Pete, Brogath: the old quarters)” [event×3]. Mechanics invoked by the scripts: stability change ×7, timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Presentation-only effects with no player input: stability change ×7. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The current finale; a catastrophe set-piece.
7. **Proposed primary mechanic.** Catastrophe escape: the Coffin Sock release floods the quarters (Atmosphere) – evacuate the crew while hallucinating (identify real crew vs. legends) to the Fart-Free Zone.
8. **Secondary mechanics.** Sets up the post-Phase-17 state (open quests: Greyhook, Sharkstorm, Crimson Fortune, Waft Trials).
9. **Enemies, puzzles, timers, hazards, resources.** Flooding fume, hallucination, evacuation.
10. **Failure conditions and consequences.** Crew left behind → conditions carry into the next content.
11. **Dependencies.** Entry: p17c16 (p17c16.spiral_done -> p17c17.begin). Start flag: `p17_ch222_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc squawks). In-room hooks into this chapter: map objects in none; NPC dialogue in brogath, jim, ledger, pete.
12. **Complexity and priority.** Complexity L, priority P1.
13. **Preserving story and humour; variety.** 'THAT IS EXACTLY WHAT SHE WOULD SAY.' stays.
