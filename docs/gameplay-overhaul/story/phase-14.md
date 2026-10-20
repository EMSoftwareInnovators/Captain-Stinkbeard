# Story inventory, Phase 14: Return of Brogath

Chapters: 24 (p14c1 to p14c24). Dialogue lines: 983. Classification: Walk + press A 11, Timing / skill input 9, Choice or puzzle prompt 4.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE14.md`, `data/quests/phase14.json`, `data/story/cutscenes/phase14/`, `data/story/flags/phase14.json`, `tests/phase14_story.test.js`, `tests/phase14Play.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p14c1` · Chapter 146: The Door Opens

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c1`, Chapter 146: The Door Opens. Scripts: 5 in `data/story/cutscenes/phase14/ch146_151.json`. Quests: `the_door_opens` “The Door Opens” in `data/quests/phase14.json`.
2. **Events and dialogue.** The storm speeds up; all hands lash everything; slip below to the treasure-room door in the hold; read the signs; take the barricade down plank by plank; open it a crack. Dialogue: 44 lines ((narration) 27, captain 7, pete 5, gristle 4, jim 1); 0 choice prompt(s) with 0 options. Presentation: shake ×5, move ×5, spawn ×4, insert ×3.
3. **Characters, locations, props, flags.** Speaking characters: pete, gristle, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `cargo_hold`. Interactables: `p14_below` (cargo_hold 13,4), `p14_signs` (cargo_hold 4,3), `p14_planks` (cargo_hold 4,3), `p14_crack` (cargo_hold 4,3). Flags set: 9 (`p14_started`, `p14_ch146_started`, `p14_standee_below`, `p14_sneaked_below`, `p14_signs_read`, `p14_plank_1`, `p14_plank_2`, `p14_door_resealed`, `p14_door_cracked`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Slip below while they're busy (the main hatch, the galley, then down the stairs to the hold)” [flag]; “See what they've nailed to it (the treasure-room door)” [flag]; “Take the barricade down, plank by plank (the door)” [event×2]; “Open it. Just a crack. (the door)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×2.
5. **Classification.** Timing / skill input (timing bar (repair) ×2). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A storm deck plus a sneak below; tension build-up.
7. **Proposed primary mechanic.** Lash-down crisis on deck (loose objects become projectiles if not lashed in time), then a quiet plank-by-plank door sequence (noise must stay low so the crew don't stop you).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Wind, flying objects, noise meter at the door.
10. **Failure conditions and consequences.** Hit by a crate → HP; caught by Gristle → sent back up (retry).
11. **Dependencies.** Entry: npc:pete -> p14c1.begin (in-room hook); map:cargo_hold/p14_below -> p14c1.below (in-room hook). Start flag: `p14_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room captains_quarters, room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks). In-room hooks into this chapter: map objects in cargo_hold ×4; NPC dialogue in pete.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'IF IT'S NOT TIED DOWN, IT'S GOING ROUND WITH THE SHARKS!' stays.

### `p14c2` · Chapter 147: The Plume

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p14c2`, Chapter 147: The Plume. Scripts: 2 in `data/story/cutscenes/phase14/ch146_151.json`. Quests: `follow_the_plume` “The Plume” in `data/quests/phase14.json`.
2. **Events and dialogue.** A bodiless plume comes up the stairs and drifts into the old quarters; follow it. Dialogue: 7 lines (pete 2, (narration) 2, captain 1, ned 1, jim 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: pete, ned, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 2 (`p14_ch147_started`, `p14_plume_galley`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Follow the plume (up the stairs, into the galley)” [flag]; “Follow it (through the door at the bottom of the galley)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** 7 lines.
7. **Proposed primary mechanic.** Follow the plume (a short tail sequence; keep distance or it speeds away).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** Lose it → it waits (comedic).
11. **Dependencies.** Entry: p14c1 (p14c1.crack -> p14c2.begin). Start flag: `p14_ch147_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (room galley, room main_deck). In-room hooks into this chapter: map objects in none; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Something just came up the stairs WITHOUT A BODY.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p14c3` · Chapter 148: Brogath Returns

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c3`, Chapter 148: Brogath Returns. Scripts: 3 in `data/story/cutscenes/phase14/ch146_151.json`. Quests: `return_of_brogath` “Brogath Returns” in `data/quests/phase14.json`.
2. **Events and dialogue.** The plume enters cardboard Brogath; Brogath returns; say something to him (first stability change and reassurance prompt). Dialogue: 41 lines ((narration) 20, pete 5, captain 5, brogath 4, jim 2, bob 2, gristle 2, squawks 1); 0 choice prompt(s) with 0 options. Presentation: shake ×2, spawn ×1, move ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, brogath, jim, bob, gristle, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 7 (`p14_plume_quarters`, `p14_ch148_started`, `brogath_reincarnated`, `p14_hat_lost`, `p14_first_eruption`, `p14_quarters_scorched`, `p14_first_words`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Say something to him (Brogath)” [flag]. Mechanics invoked by the scripts: stability change ×9, Brogath reassurance prompt ×1.
5. **Classification.** Choice or puzzle prompt (Brogath reassurance prompt ×1). Presentation-only effects with no player input: stability change ×9. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Introduction of the Brogath Stability system (exists).
7. **Proposed primary mechanic.** Keep as introduction; the stability meter appears with a clear tutorial.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** First reassurance prompt.
10. **Failure conditions and consequences.** Wrong words → stability dip and a small toot (teaches stakes).
11. **Dependencies.** Entry: npc:brogath -> p14c3.speak (in-room hook). Start flag: `p14_ch148_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room crew_quarters, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim). In-room hooks into this chapter: map objects in none; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'It goes round him. Once. Twice. As if it's looking.' stays.

### `p14c4` · Chapter 149: The Containment Corner

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c4`, Chapter 149: The Containment Corner. Scripts: 8 in `data/story/cutscenes/phase14/ch146_151.json`. Quests: `containment_corner` “The Containment Corner” in `data/quests/phase14.json`.
2. **Events and dialogue.** The Containment Corner: build a barricade (card table, Grog cask, sash blankets, cardboard Sir Rumpus); help Pete start the rules; check on Garrick. Dialogue: 45 lines ((narration) 12, pete 10, garrick 6, gristle 4, brogath 4, captain 4, bob 3, crew 1, +1 more); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: pete, garrick, gristle, brogath, bob, crew, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `crew_quarters`. Interactables: `p14_bar_table` (crew_quarters 10,10), `p14_bar_cask` (crew_quarters 16,12), `p14_bar_blankets` (crew_quarters 5,10), `p14_bar_shield` (crew_quarters 13,10), `p14_bar_shield_door` (crew_quarters 9,4), `p14_rules_first` (crew_quarters 9,12). Flags set: 13 (`p14_ch149_started`, `p14_bar_table`, `p14_bar_cask`, `p14_bar_blankets`, `p14_bar_shield`, `p14_barricade_said`, `p14_hat_back`, `brogath_rule_no_laughing`, `brogath_rule_cardboard`, `brogath_rule_sad_memories`, +3 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Build the barricade (the card table, the Grog cask, sash blankets, cardboard Sir Rumpus)” [event×4]; “Help Pete start the rules (the barricade)” [flag]; “Check on Garrick (out there with him)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A defence-building job.
7. **Proposed primary mechanic.** Barricade build (place four objects to form a cover line; push mechanics); rules start a 'Brogath rules' list that is a real reference for later prompts.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Heavy objects, space.
10. **Failure conditions and consequences.** Weak barricade → more exposure in p14c6.
11. **Dependencies.** Entry: p14c3 (p14c3.erupt -> p14c4.begin). Start flag: `p14_ch149_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room crew_quarters, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim). In-room hooks into this chapter: map objects in crew_quarters ×6; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'We don't put HIM anywhere. We put US somewhere.' stays.

### `p14c5` · Chapter 150: Keep Brogath Confident

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c5`, Chapter 150: Keep Brogath Confident. Scripts: 19 in `data/story/cutscenes/phase14/ch146_151.json`. Quests: `keep_brogath_confident` “Keep Brogath Confident” in `data/quests/phase14.json`.
2. **Events and dialogue.** Keep Brogath confident: Pete's flutter theory; handle six fluttering things (secure them, then steady him) with 25 stability changes. Dialogue: 56 lines ((narration) 25, pete 11, captain 7, bob 3, squawks 3, gristle 2, jim 2, garrick 2, +1 more); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: pete, bob, squawks, gristle, jim, garrick, brogath. NPCs with dialogue keyed to an objective (hints, reactions or completions): pete, brogath. Rooms: `crew_quarters`. Interactables: `p14_rules_flutter` (crew_quarters 9,12). Flags set: 25 (`p14_ch150_started`, `p14_pete_theory`, `p14_fl_shirt_started`, `p14_fl_shirt_secured`, `p14_fl_label_started`, `p14_fl_label_secured`, `p14_fl_napkin_started`, `p14_fl_napkin_secured`, `p14_fl_page_started`, `brogath_rule_no_sighing`, +15 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Hear Pete's theory (Pete)” [flag]; “Handle whatever flutters: secure it, then steady him (talk to Brogath)” [event×6]; “Add to the rules (the barricade)” [flag]. Mechanics invoked by the scripts: stability change ×25, Brogath reassurance prompt ×1.
5. **Classification.** Choice or puzzle prompt (Brogath reassurance prompt ×1). Presentation-only effects with no player input: stability change ×25. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Already the most systemic chapter of Phase 14 (triggers + stability).
7. **Proposed primary mechanic.** Brogath Pressure management: flutter events trigger around the room on timers; secure each before it embarrasses him, and use reassurance to recover stability (Brogath Pressure system).
8. **Secondary mechanics.** Rules list grows (persistent).
9. **Enemies, puzzles, timers, hazards, resources.** Simultaneous flutter sources (label, napkin, page, Squawks, flag).
10. **Failure conditions and consequences.** Stability zero → an eruption (exposure, objects scattered) and the chapter restarts from the barricade.
11. **Dependencies.** Entry: story trigger p14_corner_done: {all:[{objectiveDone:containment_corner.rules},{objectiveDone:containment_corner.garrick},{notFlag:p14_ch150_started}]}; story trigger p14_fl_label: {all:[{objectiveActive:keep_brogath_confident.flutters},{flag:p14_fl_shirt_done},{notFlag:p14_fl_label_started}]}; story trigger p14_fl_napkin: {all:[{objectiveActive:keep_brogath_confident.flutters},{flag:p14_fl_label_done},{notFlag:p14_fl_napkin_started}]}; story trigger p14_fl_page: {all:[{objectiveActive:keep_brogath_confident.flutters},{flag:p14_fl_napkin_done},{notFlag:p14_fl_page_started}]}; story trigger p14_fl_squawks: {all:[{objectiveActive:keep_brogath_confident.flutters},{flag:p14_fl_page_done},{notFlag:p14_fl_squawks_started}]}; story trigger p14_fl_flag: {all:[{objectiveActive:keep_brogath_confident.flutters},{flag:p14_fl_squawks_done},{notFlag:p14_fl_flag_started}]}; story trigger p14_flutters: {all:[{objectiveDone:keep_brogath_confident.flutters},{notFlag:p14_flutters_said}]}. Start flag: `p14_ch150_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 19 (trigger, npc bob, npc brogath, room crew_quarters, npc garrick, npc squawks). In-room hooks into this chapter: map objects in crew_quarters ×4; NPC dialogue in bob, brogath, garrick, pete, squawks.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'Flutter's the most embarrassing thing there is, for a Stenchmaster.' stays.

### `p14c6` · Chapter 151: The Apology Eruption

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c6`, Chapter 151: The Apology Eruption. Scripts: 12 in `data/story/cutscenes/phase14/ch146_151.json`. Quests: `apology_eruption` “The Apology Eruption” in `data/quests/phase14.json`.
2. **Events and dialogue.** The Apology Eruption: Gristle's compliment backfires; brace, secure three loose sashes, stop the bedroom set and Mega-Pack sliding, catch the lantern, get through the cloud and talk him down. Dialogue: 48 lines ((narration) 23, brogath 8, pete 6, gristle 4, captain 3, jim 1, bob 1, garrick 1, +1 more); 0 choice prompt(s) with 0 options. Presentation: shake ×2.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete, gristle, jim, bob, garrick, crew. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `crew_quarters`. Interactables: `p14_ae_brace` (crew_quarters 8,13), `p14_ae_sash_a` (crew_quarters 1,5), `p14_ae_sash_b` (crew_quarters 1,8), `p14_ae_sash_c` (crew_quarters 1,11), `p14_ae_set` (crew_quarters 10,6), `p14_ae_pack` (crew_quarters 12,8), `p14_ae_lantern` (crew_quarters 7,8). Flags set: 13 (`p14_ch151_started`, `p14_apology_active`, `p14_ae_brace`, `p14_ae_sash_a`, `p14_ae_sash_b`, `p14_ae_sash_c`, `p14_ae_obj_set`, `p14_ae_obj_pack`, `p14_ae_lantern`, `p14_ae_ready_said`, +3 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “BRACE! (the mast post)” [flag]; “Secure the loose sashes (the sash hammocks)” [event×3]; “Stop what's sliding (the bedroom set, the Mega-Pack)” [event×2]; “Catch the lantern (the swinging one)” [flag]; “Get to him through the cloud and talk him down (Brogath)” [flag]. Mechanics invoked by the scripts: stability change ×13, timing bar (repair) ×7, Brogath reassurance prompt ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×7, Brogath reassurance prompt ×3). Presentation-only effects with no player input: stability change ×13. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A multi-task crisis inside a fume cloud.
7. **Proposed primary mechanic.** Eruption crisis: real-time cloud expansion (Atmosphere), sliding objects (push to stop), a lantern fire risk, then a reassurance sequence through the cloud.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Exposure, sliding objects, lantern timer.
10. **Failure conditions and consequences.** Lantern breaks → fire; captain overcome → restart at the mast post.
11. **Dependencies.** Entry: p14c5 (p14c5.rules -> p14c6.begin); p14.eruption_apology -> p14c6.begin. Start flag: `p14_ch151_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: p14c17 (1), p14c24 (1). Flags read by world data (rooms/NPCs/triggers): 7 (room crew_quarters, trigger, dialogue p14). In-room hooks into this chapter: map objects in crew_quarters ×7; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'A TOOT? It moved the TABLE.' stays.

### `p14c7` · Chapter 152: Back in Office

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p14c7`, Chapter 152: Back in Office. Scripts: 8 in `data/story/cutscenes/phase14/ch152_157.json`. Quests: `back_in_office` “Back in Office” in `data/quests/phase14.json`.
2. **Events and dialogue.** Dawn; Garrick has sat all night beside Brogath; get the fire tongs, retrieve the sash from your wardrobe with them, give it back; hear his Grand Decrees. Dialogue: 53 lines (garrick 18, (narration) 13, captain 11, brogath 4, pete 3, jim 2, ned 1, gristle 1); 1 choice prompt(s) with 3 options. Presentation: move ×1, giveItem ×1, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, brogath, pete, jim, ned, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, brogath. Rooms: `captains_quarters`, `galley`. Interactables: `p14_tongs` (galley 2,4), `p14_wardrobe` (captains_quarters 3,4). Flags set: 11 (`p14_ch152_started`, `stenchmaster_suspension_over`, `p14_regalia_demanded`, `p14_tongs_taken`, `p14_sash_retrieved`, `garrick_regalia_restored`, `p14_gs_started`, `brogath_rule_sashes_tucked`, `p14_gs_secured`, `p14_gs_done`, +1 more); items given: fire_tongs.
4. **Current player actions and mechanics.** Objectives: “Get something long (the fire tongs, by the galley stove)” [flag]; “Get the sash out of your wardrobe (your cabin), with the tongs” [flag]; “Give it back (Garrick, the galley)” [flag]; “Hear his Grand Decrees (Garrick)” [flag]. Mechanics invoked by the scripts: stability change ×4, Brogath reassurance prompt ×1.
5. **Classification.** Choice or puzzle prompt (Brogath reassurance prompt ×1). Presentation-only effects with no player input: stability change ×4. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Errand with a contaminated item (tongs).
7. **Proposed primary mechanic.** Keep; the sash is a hazardous carry (Beard Saturation if touched without tongs).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p14c6 (p14c6.done -> p14c7.begin). Start flag: `p14_ch152_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 6 (room crew_quarters, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim). In-room hooks into this chapter: map objects in galley ×1, captains_quarters ×1; NPC dialogue in brogath, garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** '(who hasn't blinked since midnight) Ned. NED. What time is it?' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p14c8` · Chapter 153: Two Grand Stenchmasters

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c8`, Chapter 153: Two Grand Stenchmasters. Scripts: 9 in `data/story/cutscenes/phase14/ch152_157.json`. Quests: `two_grand_stenchmasters` “Two Grand Stenchmasters” in `data/quests/phase14.json`; `grand_waft_trials` “The Grand Waft Trials” (left OPEN) in `data/quests/phase14.json`.
2. **Events and dialogue.** Two Grand Stenchmasters: keep five rounds from becoming a contest. Opens 'The Grand Waft Trials' (make sure they never happen) – still open at the end of Phase 17. Dialogue: 51 lines (garrick 22, brogath 19, captain 4, (narration) 3, pete 3); 1 choice prompt(s) with 3 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, brogath, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, brogath. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 3 (`p14_ch153_started`, `brogath_rule_no_grand_waft_trials`, `p14_trials_mentioned`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Keep it from becoming a contest (Garrick, Brogath)” [event×5]; “Make sure the Grand Waft Trials never happen” [flag]. Mechanics invoked by the scripts: stability change ×3.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×3. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A balancing act between two egos.
7. **Proposed primary mechanic.** Ego balance: alternating responses keep Garrick and Brogath's rivalry meter centred (reuse stability system with two needles).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Two meters.
10. **Failure conditions and consequences.** One meter tips → a 'contest' starts (comedic sting) and the round restarts.
11. **Dependencies.** Entry: p14c7 (p14c7.decrees -> p14c8.begin). Start flag: `p14_ch153_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (room crew_quarters, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim). In-room hooks into this chapter: map objects in none; NPC dialogue in brogath, garrick.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'I decreed a WHOLE MONTH once. February.' stays.

### `p14c9` · Chapter 154: Beans of Ancient Precedent

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c9`, Chapter 154: Beans of Ancient Precedent. Scripts: 11 in `data/story/cutscenes/phase14/ch152_157.json`. Quests: `beans_of_precedent` “Beans of Ancient Precedent” in `data/quests/phase14.json`.
2. **Events and dialogue.** Beans of Ancient Precedent: compliments by turns; serve a six-dish breakfast; emergency meeting in the little door under the hold stairs (to the Fart-Free Zone). Dialogue: 60 lines ((narration) 19, garrick 9, brogath 8, pete 7, captain 7, gristle 4, jim 4, bob 2); 0 choice prompt(s) with 0 options. Presentation: transition ×1, spawn ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, brogath, pete, gristle, jim, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, brogath. Rooms: `cargo_hold`, `fart_free_zone`, `galley`. Interactables: `p14_stove_dish` (galley 2,4), `p14_garlic` (galley 5,8), `p14_cabbage` (galley 12,4), `p14_grog_dish` (galley 16,9), `p14_sauce` (galley 15,6), `p14_nook` (cargo_hold 13,3). Flags set: 14 (`p14_ch154_started`, `brogath_rule_compliment_rota`, `p14_compliments_said`, `p14_dish_beans`, `p14_dish_onions`, `p14_dish_garlic`, `p14_dish_cabbage`, `p14_dish_grog`, `p14_dish_sauce`, `brogath_loaded`, +4 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Keep them both content: a compliment each, by turns (Garrick, Brogath)” [event×4]; “Serve breakfast: beans, onions (stove), garlic (jar), cabbage (crock), Frog Grog (cask), Sauce (crate)” [event×6]; “EMERGENCY MEETING! (the little door under the hold stairs)” [flag]. Mechanics invoked by the scripts: stability change ×3.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×3. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Turn-taking + cooking.
7. **Proposed primary mechanic.** Compliment rhythm (alternate correctly) while cooking six dishes (reuse cooking system); a mistake triggers a stability dip.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Alternation + parallel tasks.
10. **Failure conditions and consequences.** Stability dip → small toot event.
11. **Dependencies.** Entry: p14c8 (p14c8.done -> p14c9.begin). Start flag: `p14_ch154_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 11 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in galley ×5, cargo_hold ×1; NPC dialogue in brogath, garrick.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** '...I used to rob merchant vessels.' stays.

### `p14c10` · Chapter 155: The Fart-Free Zone

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c10`, Chapter 155: The Fart-Free Zone. Scripts: 13 in `data/story/cutscenes/phase14/ch152_157.json`. Quests: `fart_free_zone` “The Fart-Free Zone” in `data/quests/phase14.json`.
2. **Events and dialogue.** The Fart-Free Zone in the cupboard under the stairs; hold the meeting; make it safe with nine supplies; be pirates for a minute (cards). Dialogue: 50 lines ((narration) 22, pete 7, gristle 5, jim 5, bob 4, squawks 3, captain 3, brogath 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: pete, gristle, jim, bob, squawks, brogath. NPCs with dialogue keyed to an objective (hints, reactions or completions): pete. Rooms: `cargo_hold`, `crew_quarters`, `fart_free_zone`, `galley`. Interactables: `p14z_declare` (fart_free_zone 4,5), `p14_ffz_mattress` (cargo_hold 15,16), `p14_ffz_barrels` (cargo_hold 17,5), `p14_ffz_hardtack` (cargo_hold 16,4), `p14_ffz_blankets` (crew_quarters 1,5), `p14_ffz_pillows` (crew_quarters 16,6), `p14_ffz_rags` (crew_quarters 15,4), `p14_ffz_cards` (crew_quarters 9,12), `p14_ffz_sashes` (galley 13,6), `p14_ffz_grog` (galley 16,9), +1 more. Flags set: 15 (`p14_ch155_started`, `fart_free_zone_declared`, `p14_ffz_blankets`, `p14_ffz_pillows`, `p14_ffz_mattress`, `p14_ffz_sashes`, `p14_ffz_barrels`, `p14_ffz_rags`, `p14_ffz_hardtack`, `p14_ffz_cards`, +5 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Hold the meeting (Pete)” [flag]; “Make it safe: blankets, pillows, mattress, clean sashes, barrels, rags, hardtack, cards, Frog Grog (round the ship)” [event×9]; “Be pirates for a minute (the cards)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×2.
5. **Classification.** Timing / skill input (timing bar (repair) ×2). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A safe room – a natural hub/sanctuary.
7. **Proposed primary mechanic.** Sanctuary setup: bring nine supplies (carry), each adding a benefit (rest, morale, Atmosphere filter). The Fart-Free Zone becomes a save/rest point for Phases 14–17.
8. **Secondary mechanics.** The cards scene stays as a quiet beat.
9. **Enemies, puzzles, timers, hazards, resources.** Carrying through the galley without disturbing the Stenchmasters.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p14c9 (p14c9.nook -> p14c10.begin). Start flag: `p14_ch155_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 15 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in crew_quarters ×4, cargo_hold ×3, fart_free_zone ×2, galley ×2; NPC dialogue in pete.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'Nobody. Farts. In here. Ever.' stays.

### `p14c11` · Chapter 156: Getting Rid of Brogath

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p14c11`, Chapter 156: Getting Rid of Brogath. Scripts: 7 in `data/story/cutscenes/phase14/ch152_157.json`. Quests: `getting_rid_of_brogath` “Getting Rid of Brogath” in `data/quests/phase14.json`.
2. **Events and dialogue.** Getting rid of Brogath: hear four plans and Pete's. Dialogue: 46 lines (pete 11, gristle 9, (narration) 6, captain 5, jim 4, bob 4, brogath 3, ned 2, +1 more); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: pete, gristle, jim, bob, brogath, ned, garrick. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, ned, jim, gristle, pete. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 8 (`p14_ch156_started`, `p14_prop_storm`, `p14_prop_burn`, `p14_prop_treasure`, `p14_prop_confident`, `p14_proposals_said`, `p14_mission_overheard`, `brogath_hard_to_remove`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Hear the plans (Jim, Gristle, Bob, Ned)” [event×4]; “Hear Pete's (Pete)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Plan selection.
7. **Proposed primary mechanic.** Keep (dialogue).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p14c10 (p14c10.cards_play -> p14c11.begin). Start flag: `p14_ch156_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 6 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc jim, npc gristle, npc bob, npc ned). In-room hooks into this chapter: map objects in none; NPC dialogue in bob, gristle, jim, ned, pete.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Throw him in the Sharkstorm. Over the rail, gone.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p14c12` · Chapter 157: Beyond Broke

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p14c12`, Chapter 157: Beyond Broke. Scripts: 5 in `data/story/cutscenes/phase14/ch152_157.json`. Quests: `beyond_broke` “Beyond Broke” in `data/quests/phase14.json`.
2. **Events and dialogue.** Beyond Broke: by candlelight, read the pocket edition (codex), write the ingredients on the slate, put up a warning sign. Dialogue: 33 lines (codex 16, (narration) 14, captain 2, pete 1); 0 choice prompt(s) with 0 options. Presentation: insert ×5.
3. **Characters, locations, props, flags.** Speaking characters: codex, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `cargo_hold`, `fart_free_zone`. Interactables: `p14z_read_psg` (fart_free_zone 5,4), `p14z_slate_ingredients` (fart_free_zone 3,3), `p14_exclusion_sign` (cargo_hold 15,3). Flags set: 7 (`p14_ch157_started`, `p14_psg_said`, `p14_ingredients`, `brogath_rule_treasure_room`, `brogath_rule_no_treasure`, `treasure_exclusion_posted`, `brogath_treasure_excluded`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Read it, by lamplight (the pocket edition, in the zone)” [event×4]; “Write it down (the slate, on the zone's back wall)” [flag]; “Put up a warning (the foot of the hold stairs)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Codex reading.
7. **Proposed primary mechanic.** Keep; codex pages become recipe/plan entries (data).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p14c11 (p14c11.pete -> p14c12.begin). Start flag: `p14_ch157_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in fart_free_zone ×2, cargo_hold ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'They wrote it down.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p14c13` · Chapter 158: The Grand Economy of Farts

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p14c13`, Chapter 158: The Grand Economy of Farts. Scripts: 4 in `data/story/cutscenes/phase14/ch158_163.json`. Quests: `grand_economy` “The Grand Economy of Farts” in `data/quests/phase14.json`.
2. **Events and dialogue.** The Grand Economy of Farts (codex): Gust Pieces, Wind Crowns, Atmospheric Doubloons. Dialogue: 21 lines (codex 15, (narration) 3, captain 3); 0 choice prompt(s) with 0 options. Presentation: insert ×4.
3. **Characters, locations, props, flags.** Speaking characters: codex. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `fart_free_zone`. Interactables: `p14z_read_econ` (fart_free_zone 5,4), `p14z_sleep_econ` (fart_free_zone 1,4). Flags set: 3 (`p14_ch158_started`, `p14_econ_said`, `p14_slept_after_reading`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Read on (the pocket edition)” [event×4]; “Get some sleep (the mattress)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Introduces Grand Currency.
7. **Proposed primary mechanic.** Keep; Grand Currency denominations become a real (absurd) secondary currency in the inventory.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p14c12 (p14c12.sign -> p14c13.begin). Start flag: `p14_ch158_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (trigger). In-room hooks into this chapter: map objects in fart_free_zone ×2; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Brogath was the Bean Treasury.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p14c14` · Chapter 159: Bad Money

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p14c14`, Chapter 159: Bad Money. Scripts: 5 in `data/story/cutscenes/phase14/ch158_163.json`. Quests: `bad_money` “Bad Money” in `data/quests/phase14.json`.
2. **Events and dialogue.** Bad Money: Brogath has been shopping; check your purse (Grand Currency); get the delivery below; open it. Dialogue: 32 lines ((narration) 12, brogath 8, captain 5, squawks 2, pete 2, gristle 1, jim 1, ned 1); 1 choice prompt(s) with 3 options. Presentation: insert ×3, shake ×1, giveItem ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, squawks, pete, gristle, jim, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `captains_quarters`, `galley`, `main_deck`. Interactables: `p14_purse` (captains_quarters 7,6), `p14_crate_deck` (main_deck 11,32), `p14_crate_open` (galley 13,9). Flags set: 6 (`p14_ch159_started`, `p14_shopping_seen`, `p14_purse_checked`, `grand_currency_crate_below`, `grand_currency_crate_opened`, `grand_tokens_loose`); items given: grand_currency.
4. **Current player actions and mechanics.** Objectives: “See what's got Brogath so pleased (the old quarters)” [flag]; “Check your purse (the desk, your cabin)” [flag]; “Get the delivery below (on deck, by the forward hatch)” [flag]; “Open it (the crate, in the galley)” [flag]. Mechanics invoked by the scripts: stability change ×3, timing bar (repair) ×2.
5. **Classification.** Timing / skill input (timing bar (repair) ×2). Presentation-only effects with no player input: stability change ×3. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Economy consequence.
7. **Proposed primary mechanic.** Keep; the purse check shows currency conversion (the existing appraisal).
8. **Secondary mechanics.** Crate carry (reuse).
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p14c13 (p14c13.sleep -> p14c14.begin). Start flag: `p14_ch159_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in captains_quarters ×1, main_deck ×1, galley ×1; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Brogath's been... shopping.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p14c15` · Chapter 160: Grand Temporary Ancient Oat Security Officer

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c15`, Chapter 160: Grand Temporary Ancient Oat Security Officer. Scripts: 6 in `data/story/cutscenes/phase14/ch158_163.json`. Quests: `oat_security` “Grand Temporary Ancient Oat Security Officer” in `data/quests/phase14.json`.
2. **Events and dialogue.** Brogath is made Grand Temporary Ancient Oat Security Officer: fetch three oat sacks, check on him, sweep up. Dialogue: 50 lines ((narration) 21, brogath 13, pete 5, jim 4, gristle 3, captain 3, crew 1); 1 choice prompt(s) with 3 options. Presentation: shake ×2.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete, jim, gristle, crew. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `galley`. Interactables: `p14_oat_sack_flour` (galley 8,4), `p14_oat_sack_stores` (galley 16,8), `p14_oat_post` (galley 5,5), `p14_oat_sweep` (galley 4,6). Flags set: 10 (`p14_ch160_started`, `p14_oat_job_given`, `p14_oat_sack_a`, `p14_oat_sack_b`, `p14_oat_sack_c`, `p14_oats_posted`, `brogath_rule_oats`, `p14_oat_disaster`, `oats_everywhere`, `p14_oats_swept`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Give Brogath an important job (Brogath)” [flag]; “Fetch the oats (three sacks: the galley stores)” [event×3]; “Check on him (the galley)” [flag]; “Sweep up (the galley floor)” [flag]. Mechanics invoked by the scripts: stability change ×7, timing bar (repair) ×4.
5. **Classification.** Timing / skill input (timing bar (repair) ×4). Presentation-only effects with no player input: stability change ×7. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Keeping a volatile NPC busy.
7. **Proposed primary mechanic.** Babysit: Brogath's boredom meter rises; tasks (oats) keep it low while the captain does chores; let it max and stability drops.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Boredom meter.
10. **Failure conditions and consequences.** Stability dip → toot → sweep job grows.
11. **Dependencies.** Entry: p14c14 (p14c14.open -> p14c15.begin). Start flag: `p14_ch160_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 6 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in galley ×4; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'Nobody cares about the oats.' stays.

### `p14c16` · Chapter 161: Important Television Duty

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p14c16`, Chapter 161: Important Television Duty. Scripts: 4 in `data/story/cutscenes/phase14/ch158_163.json`. Quests: `television_duty` “Important Television Duty” in `data/quests/phase14.json`.
2. **Events and dialogue.** Important Television Duty: find something he'll sit still for (bedroom set), the right channel, watch with him. Dialogue: 30 lines ((narration) 9, brogath 8, pete 8, gristle 2, crew 1, garrick 1, captain 1); 0 choice prompt(s) with 0 options. Presentation: tvProgram ×5, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete, gristle, crew, garrick. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `crew_quarters`. Interactables: `p14_tv_machinery` (crew_quarters 10,6), `p14_tv_channel` (crew_quarters 10,6). Flags set: 6 (`p14_ch161_started`, `brogath_rule_no_machinery`, `p14_knob_off`, `p14_ftm_found`, `p14_tv_duty_assigned`, `brogath_tv_duty`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Find him something he'll sit still for (the bedroom set)” [flag]; “Find the right channel (the bedroom set)” [flag]; “Watch it with him (Brogath)” [flag]. Mechanics invoked by the scripts: TV power ×6, stability change ×3.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: TV power ×6, stability change ×3. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** TV puzzle.
7. **Proposed primary mechanic.** Keep; channel selection reuses TV knobs.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p14c15 (p14c15.sweep -> p14c16.begin). Start flag: `p14_ch161_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in crew_quarters ×2; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'I've got a lot of guarding in me.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p14c17` · Chapter 162: The Sash Flutter Commercial

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c17`, Chapter 162: The Sash Flutter Commercial. Scripts: 10 in `data/story/cutscenes/phase14/ch158_163.json`. Quests: `sash_commercial` “The Sash Flutter Commercial” in `data/quests/phase14.json`.
2. **Events and dialogue.** The Sash Flutter Commercial: cover his eyes, change channel, tie down two sashes, shut two doors, talk him through it. Dialogue: 30 lines ((narration) 15, brogath 8, pete 3, captain 2, franklin 1, crew 1); 0 choice prompt(s) with 0 options. Presentation: tvProgram ×3, vista ×1, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete, franklin, crew. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `crew_quarters`. Interactables: `p14_ad_channel` (crew_quarters 10,6), `p14_ad_sash_a` (crew_quarters 1,5), `p14_ad_sash_b` (crew_quarters 5,6), `p14_ad_door_a` (crew_quarters 8,3), `p14_ad_door_b` (crew_quarters 13,3). Flags set: 9 (`p14_ch162_started`, `p14_ad_eyes`, `p14_ad_sash_a`, `p14_ad_sash_b`, `p14_ad_door_a`, `p14_ad_door_b`, `p14_ad_ready_said`, `brogath_rule_cover_eyes`, `p14_ad_resolved`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Cover his eyes (Brogath)” [flag]; “Change the channel (the bedroom set)” [flag]; “Tie down the sashes nearby (the sash hammocks)” [event×2]; “Shut the doors (the galley door, the deck hatch)” [event×2]; “Talk him through it (Brogath)” [flag]. Mechanics invoked by the scripts: stability change ×10, TV power ×4, timing bar (repair) ×2, Brogath reassurance prompt ×2.
5. **Classification.** Timing / skill input (timing bar (repair) ×2, Brogath reassurance prompt ×2). Presentation-only effects with no player input: stability change ×10, TV power ×4. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Multi-task crisis with stability (10 changes).
7. **Proposed primary mechanic.** Commercial crisis: a countdown to the flutter shot; do tasks in an optimal order (doors first stop draughts) while keeping stability up.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Timer, draught sources.
10. **Failure conditions and consequences.** Eruption → restart.
11. **Dependencies.** Entry: p14c16 (p14c16.watch -> p14c17.begin). Start flag: `p14_ch162_started`. Reads flags first set in earlier chapters: p14c6: `brogath_rule_toot`. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room crew_quarters, trigger). In-room hooks into this chapter: map objects in crew_quarters ×5; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'Gloriously. Shamelessly. FLUTTERING.' / '(very quietly) ...Oh.' stays.

### `p14c18` · Chapter 163: The Grand Bank

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p14c18`, Chapter 163: The Grand Bank. Scripts: 5 in `data/story/cutscenes/phase14/ch158_163.json`. Quests: `the_grand_bank` “The Grand Bank” in `data/quests/phase14.json`.
2. **Events and dialogue.** Grand Tokens everywhere (boots, beard, tea); the Grand Bank opens; ask seven questions; take your badge. Dialogue: 46 lines (brogath 14, (narration) 13, captain 11, pete 3, garrick 2, squawks 1, codex 1, gristle 1); 0 choice prompt(s) with 0 options. Presentation: insert ×2, shake ×2, transition ×1, spawn ×1, giveItem ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete, garrick, squawks, codex, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `fart_free_zone`. Interactables: none. Flags set: 5 (`p14_ch163_started`, `anger_waft_seen`, `grand_bank_open`, `brogath_rule_no_banking`, `teller_badge_given`); items given: teller_badge.
4. **Current player actions and mechanics.** Objectives: “Ask him about the bank (Brogath)” [event×7]; “Take your badge (Brogath)” [flag]. Mechanics invoked by the scripts: stability change ×7.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×7. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Setup for the teller minigame.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p14c17 (p14c17.talk -> p14c18.begin). Start flag: `p14_ch163_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: p14c19 (1). Flags read by world data (rooms/NPCs/triggers): 3 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in none; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'You find one in the TEA.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p14c19` · Chapter 164: Your Gas Is Our Business

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c19`, Chapter 164: Your Gas Is Our Business. Scripts: 2 in `data/story/cutscenes/phase14/ch164_169.json`. Quests: `teller_shift` “Your Gas Is Our Business” in `data/quests/phase14.json`.
2. **Events and dialogue.** Your Gas Is Our Business: the teller window minigame – serve sixteen depositors. Dialogue: 17 lines ((narration) 5, brogath 3, garrick 2, captain 2, jim 2, squawks 2, pete 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: brogath, garrick, jim, squawks, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 1 (`p14_ch164_started`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Serve the depositors (ring the teller bell, behind the counter)” [event×16]. Mechanics invoked by the scripts: teller window ×2.
5. **Classification.** Timing / skill input (teller window ×2). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The teller minigame exists (one of the more systemic mechanics).
7. **Proposed primary mechanic.** Teller shifts with escalating rules (forgeries, impatient customers, a stability meter if Brogath sees a mistake).
8. **Secondary mechanics.** Earnings feed the absurd currency economy.
9. **Enemies, puzzles, timers, hazards, resources.** Queue pressure, forgeries.
10. **Failure conditions and consequences.** Too many errors → bank 'audit' (repeat shift).
11. **Dependencies.** Entry: p14c18 (p14c18.badge -> p14c19.begin). Start flag: `p14_ch164_started`. Reads flags first set in earlier chapters: p14c18: `grand_bank_open`. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 0 (none). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'An alternative asset class. LIQUIDITY.' stays.

### `p14c20` · Chapter 165: Legendary Depositors

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c20`, Chapter 165: Legendary Depositors. Scripts: 1 in `data/story/cutscenes/phase14/ch164_169.json`. Quests: `legendary_depositors` “Legendary Depositors” in `data/quests/phase14.json`.
2. **Events and dialogue.** Legendary Depositors: the legends queue; serve three of them. Dialogue: 5 lines ((narration) 2, brogath 2, garrick 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: brogath, garrick. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 1 (`p14_ch165_started`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Serve the legends (the teller bell)” [event×3]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Boss-like customers.
7. **Proposed primary mechanic.** Legend customers with unique teller rules (each legend from the codex has a quirk).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Unique rules.
10. **Failure conditions and consequences.** Repeat.
11. **Dependencies.** Entry: story trigger p14_deposits: {all:[{objectiveDone:teller_shift.serve},{notFlag:p14_ch165_started}]}. Start flag: `p14_ch165_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (trigger). In-room hooks into this chapter: map objects in none; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'The legends are queueing.' stays.

### `p14c21` · Chapter 166: The Branch Concludes Business

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c21`, Chapter 166: The Branch Concludes Business. Scripts: 4 in `data/story/cutscenes/phase14/ch164_169.json`. Quests: `branch_concludes` “The Branch Concludes Business” in `data/quests/phase14.json`.
2. **Events and dialogue.** The branch concludes business: redeem the tokens at the vault quickly, ask what they're for, ask for the bank back without you in it. Dialogue: 36 lines ((narration) 13, brogath 9, captain 9, garrick 4, squawks 1); 0 choice prompt(s) with 0 options. Presentation: insert ×1, giveItem ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, garrick, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `main_deck`. Interactables: `p14_vault` (main_deck 13,25). Flags set: 7 (`p14_ch166_started`, `grand_bank_dissolved`, `grand_bank_concluded`, `p14_redeem_failed`, `p14_wealthy_answer`, `holiday_ornament_made`, `garrick_wears_ornament`); items given: holiday_branch_ornament.
4. **Current player actions and mechanics.** Objectives: “REDEEM THE TOKENS (the vault, quick!)” [flag]; “Ask him what they're for (Brogath)” [flag]; “Ask for the bank back, without you in it (Brogath)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A dash before closing.
7. **Proposed primary mechanic.** Vault dash: redeem before the bank fades (timer, path through fading furniture).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Timer.
10. **Failure conditions and consequences.** Too slow → fewer tokens redeemed (economy).
11. **Dependencies.** Entry: story trigger p14_legends: {all:[{objectiveDone:legendary_depositors.serve},{notFlag:p14_ch166_started}]}. Start flag: `p14_ch166_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (trigger, room crew_quarters, room galley, room main_deck, dialogue p14, npc garrick). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** Grandmother Gustilda and 'Gary' stay.

### `p14c22` · Chapter 167: Distinguishedly Furious

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c22`, Chapter 167: Distinguishedly Furious. Scripts: 5 in `data/story/cutscenes/phase14/ch164_169.json`. Quests: `distinguishedly_furious` “Distinguishedly Furious” in `data/quests/phase14.json`.
2. **Events and dialogue.** Distinguishedly Furious: Brogath is blown about the deck like a kite; go into the plume and console him (five reassurance prompts). Dialogue: 69 lines ((narration) 27, captain 21, brogath 13, pete 7, crew 1); 3 choice prompt(s) with 9 options. Presentation: shake ×6, insert ×2.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete, crew. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 5 (`p14_ch167_started`, `brogath_catastrophe`, `brogath_unloaded`, `brogath_rule_idiot_distinguished`, `p14_consoled`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Go into the plume and console him (the old quarters)” [flag]. Mechanics invoked by the scripts: stability change ×5, Brogath reassurance prompt ×5.
5. **Classification.** Choice or puzzle prompt (Brogath reassurance prompt ×5). Presentation-only effects with no player input: stability change ×5. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Stability boss fight.
7. **Proposed primary mechanic.** Brogath 'boss': a reassurance duel inside a moving plume (Atmosphere), with three choice rounds that use rules learned so far.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Exposure + choices.
10. **Failure conditions and consequences.** Eruption → restart round.
11. **Dependencies.** Entry: p14c21 (p14c21.ornament -> p14c22.begin). Start flag: `p14_ch167_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in none; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'OH, I'M FLYING!' stays.

### `p14c23` · Chapter 168: The Brogath Problem

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p14c23`, Chapter 168: The Brogath Problem. Scripts: 6 in `data/story/cutscenes/phase14/ch164_169.json`. Quests: `brogath_problem` “The Brogath Problem” in `data/quests/phase14.json`.
2. **Events and dialogue.** The Brogath Problem: research dispersal in the pocket edition (soak the card), do the sums, tell him. Dialogue: 50 lines (captain 10, codex 9, (narration) 7, pete 7, gristle 6, brogath 6, bob 2, jim 2, +1 more); 0 choice prompt(s) with 0 options. Presentation: insert ×4, transition ×1, spawn ×1.
3. **Characters, locations, props, flags.** Speaking characters: codex, pete, gristle, brogath, bob, jim, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `fart_free_zone`. Interactables: `p14z_research` (fart_free_zone 5,4), `p14z_slate_sums` (fart_free_zone 3,3). Flags set: 8 (`p14_ch168_started`, `steel_brogath_known`, `brogath_rule_no_armor`, `armor_warning_known`, `p14_research_said`, `p14_sums_done`, `brogath_permanent`, `brogath_consultant`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Read up on dispersing him (the pocket edition, in the zone)” [event×4]; “Do the sums (the slate, on the zone's back wall)” [flag]; “Tell him (Brogath, the old quarters)” [flag]. Mechanics invoked by the scripts: stability change ×1.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Planning.
7. **Proposed primary mechanic.** Keep; the sums are a small calculation puzzle (how much water).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p14c22 (p14c22.console -> p14c23.begin). Start flag: `p14_ch168_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in fart_free_zone ×2; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Somebody's got rid of one of these before. Somebody must have.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p14c24` · Chapter 169: Mandatory History Night

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p14c24`, Chapter 169: Mandatory History Night. Scripts: 13 in `data/story/cutscenes/phase14/ch164_169.json`. Quests: `history_night` “Mandatory History Night” in `data/quests/phase14.json`.
2. **Events and dialogue.** Mandatory History Night: eleven normal minutes; the Mark II comes on; try to unplug it; watch; commercial breaks (his eyes, a sash, the channel); explain the sashes. Dialogue: 63 lines ((narration) 22, brogath 16, pete 8, captain 5, channel_narrator 3, squawks 3, jim 2, ledger_billiam 1, +3 more); 0 choice prompt(s) with 0 options. Presentation: tvProgram ×7, vista ×2, transition ×1, spawn ×1, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete, channel_narrator, squawks, jim, ledger_billiam, garrick, crew, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `fart_free_zone`, `galley`. Interactables: `p14z_sleep_night` (fart_free_zone 1,4), `p14_mk2_found` (galley 16,7), `p14_mk2_unplug` (galley 16,7), `p14_mk2_channel` (galley 16,7), `p14_nj_sash` (galley 7,9), `p14_nj_sash_b` (galley 9,10). Flags set: 12 (`p14_ch169_started`, `p14_zone_sleep`, `p14_set_found_on`, `p14_beggar_watched`, `p14_nj_eyes`, `p14_nj_sash`, `p14_nj_channel`, `p14_night_jobs_said`, `brogath_rule_professional_sashes`, `tv_safety_protocol`, +2 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Get some sleep (the mattress, in the zone)” [flag]; “See what's on (the Mark II, in the galley)” [flag]; “Turn it off. Somehow. (the Mark II)” [flag]; “Watch it, apparently (Brogath)” [flag]; “Commercial break! His eyes, a sash hammock, the channel (the galley)” [event×3]; “Explain the sashes (Brogath)” [flag]. Mechanics invoked by the scripts: TV power ×9, stability change ×8, timing bar (repair) ×1, Brogath reassurance prompt ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1, Brogath reassurance prompt ×1). Presentation-only effects with no player input: TV power ×9, stability change ×8. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** TV + stability crisis.
7. **Proposed primary mechanic.** Keep the structure; the three commercial-break responses are a quick-reaction stability round.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Quick reactions.
10. **Failure conditions and consequences.** Stability dip.
11. **Dependencies.** Entry: p14c23 (p14c23.tell -> p14c24.begin). Start flag: `p14_ch169_started`. Reads flags first set in earlier chapters: p14c6: `brogath_rule_toot`. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 8 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in galley ×5, fart_free_zone ×1; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'For eleven whole minutes, everything is normal.' stays.
