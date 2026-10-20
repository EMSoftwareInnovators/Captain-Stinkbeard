# Story inventory, Phase 11: The Grand Bedtime Argument

Chapters: 16 (p11c1 to p11c16). Dialogue lines: 536. Classification: Timing / skill input 7, Walk + press A 7, Dialogue / cutscene only 1, Choice or puzzle prompt 1.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE11.md`, `data/quests/phase11.json`, `data/story/cutscenes/phase11/`, `data/story/flags/phase11.json`, `tests/phase11_story.test.js`, `tests/phase11Play.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p11c1` · Chapter 96: Bedtime Inside the Great Sharkstorm

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p11c1`, Chapter 96: Bedtime Inside the Great Sharkstorm. Scripts: 4 in `data/story/cutscenes/phase11/ch96_103.json`. Quests: `bedtime_in_the_storm` “Bedtime Inside the Great Sharkstorm” in `data/quests/phase11.json`.
2. **Events and dialogue.** Bedtime inside the storm: give Garrick his book back, help Gristle string hammocks, go to bed; the ship tips and four sets of sacks slide the length of the galley. Dialogue: 31 lines ((narration) 12, garrick 7, captain 4, gristle 3, pete 2, bob 2, jim 1); 1 choice prompt(s) with 3 options. Presentation: shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, gristle, pete, bob, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, gristle. Rooms: `galley`. Interactables: `p11_bed` (galley 12,8). Flags set: 4 (`p11_started`, `garrick_book_returned`, `sailcloth_hammocks_strung`, `p11_lay_down`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Give the Grand Stenchmaster his book back (him, in the hammock)” [flag]; “Help Gristle string the hammocks (Gristle)” [flag]; “Go to bed (your bean sacks, under his hammock)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The rotating ship (the galley tips periodically) is an environmental rule that can govern all of Phase 11.
7. **Proposed primary mechanic.** Introduce 'Tilting Galley': a periodic tilt that slides unsecured objects and people; the player learns to wedge and lash things (a Phase 11-wide hazard).
8. **Secondary mechanics.** Hammock stringing (timing bar).
9. **Enemies, puzzles, timers, hazards, resources.** Periodic tilt.
10. **Failure conditions and consequences.** Slide into a wall → small HP/dignity; no hard fail.
11. **Dependencies.** Entry: map:galley/p11_start_bed -> p11c1.begin (in-room hook); npc:garrick -> p11c1.book (in-room hook). Start flag: `p11_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow, npc gristle). In-room hooks into this chapter: map objects in galley ×2; NPC dialogue in garrick, gristle.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'with great dignity, the length of the galley' stays.

### `p11c2` · Chapter 97: Grand Bedside Illumination System

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p11c2`, Chapter 97: Grand Bedside Illumination System. Scripts: 6 in `data/story/cutscenes/phase11/ch96_103.json`. Quests: `grand_illumination` “Grand Bedside Illumination System” in `data/quests/phase11.json`.
2. **Events and dialogue.** The kerosene lamp threatens the galley; fetch ties (rope, leather); tie the lamp to the beam; test it; six ropes. Dialogue: 41 lines ((narration) 16, captain 10, garrick 10, gristle 2, jim 2, pete 1); 0 choice prompt(s) with 0 options. Presentation: shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, gristle, jim, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`. Interactables: `p11_tie_rope` (galley 15,9), `p11_tie_leather` (galley 3,3), `p11_lamp_rig` (galley 15,6), `p11_lamp_test` (galley 15,6), `p11_lamp_six` (galley 15,6). Flags set: 6 (`p11_ch97_started`, `p11_tie_rope`, `p11_tie_leather`, `lamp_two_ropes`, `lamp_test_failed`, `lamp_six_rope_installed`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Fetch ties: rope (the coil by the Frog Grog cask, under the Mark II), leather ties (Jim's hooks, by the stove)” [event×2]; “Tie the lamp to the beam (the lamp)” [flag]; “Test it (the lamp)” [flag]; “Six ropes. SIX. (the lamp)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×2.
5. **Classification.** Timing / skill input (timing bar (repair) ×2). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A small engineering puzzle with a hazard.
7. **Proposed primary mechanic.** Lamp rigging puzzle: choose tie points so the lamp stays level through a tilt cycle (physics-lite; test reveals weak points); each failed test risks a flare.
8. **Secondary mechanics.** Fetch ties across a tilting room.
9. **Enemies, puzzles, timers, hazards, resources.** Tilt, fire risk.
10. **Failure conditions and consequences.** Lamp falls → small fire to smother; retry.
11. **Dependencies.** Entry: p11c1 (p11c1.bed -> p11c2.begin). Start flag: `p11_ch97_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room galley, dialogue p11). In-room hooks into this chapter: map objects in galley ×5; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'Not if it's ENGINEERED, Captain.' and 'Six ropes. SIX.' stay.

### `p11c3` · Chapter 98: Brogath's Treasure Story

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p11c3`, Chapter 98: Brogath's Treasure Story. Scripts: 2 in `data/story/cutscenes/phase11/ch96_103.json`. Quests: `poor_in_gold` “Poor in Gold” in `data/quests/phase11.json`.
2. **Events and dialogue.** Brogath's treasure story ('Poor in Gold') from Garrick's book. Dialogue: 34 lines (garrick 18, (narration) 6, pete 3, captain 3, bob 1, jim 1, ned 1, squawks 1); 1 choice prompt(s) with 3 options. Presentation: vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, bob, jim, ned, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 2 (`p11_ch98_started`, `brogath_treasure_story_heard`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Hear the story (the Grand Stenchmaster, in his hammock)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Legend chapter.
7. **Proposed primary mechanic.** Keep (legend codex page).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p11c2 (p11c2.six -> p11c3.begin). Start flag: `p11_ch98_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 0 (none). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** Ned's 'Princess Stenchalina in the castle with the onions again' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p11c4` · Chapter 99: Every Sash Incident

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p11c4`, Chapter 99: Every Sash Incident. Scripts: 6 in `data/story/cutscenes/phase11/ch96_103.json`. Quests: `every_sash_incident` “Every Sash Incident” in `data/quests/phase11.json`.
2. **Events and dialogue.** The captain can't sleep and reviews every sash incident: the sash on its peg, the org chart, the sash holders, Garrick. Dialogue: 41 lines (captain 17, garrick 12, (narration) 7, jim 1, pete 1, rusty_tom 1, barnacle_bill 1, squawks 1); 0 choice prompt(s) with 0 options. Presentation: insert ×2.
3. **Characters, locations, props, flags.** Speaking characters: garrick, jim, pete, rusty_tom, barnacle_bill, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, rusty_tom, barnacle_bill. Rooms: `galley`. Interactables: `p11_sash_peg` (galley 13,3), `p11_org_chart` (galley 4,3). Flags set: 6 (`p11_ch99_started`, `p11_sash_ex_peg`, `p11_sash_ex_chart`, `p11_sash_ex_holders`, `p11_sash_ex_book`, `sash_incidents_reviewed`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Go over it: the sash on its peg (by the hatch), his org chart (by the stove), the sash holders (Rusty Tom), the book (him)” [event×4]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A recap that could be an evidence board.
7. **Proposed primary mechanic.** Evidence board: pin the four clues into a timeline (simple ordering); the result unlocks the sharper questions in p11c5/p11c16.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Ordering.
10. **Failure conditions and consequences.** Wrong order → the captain 'starts again' (no penalty).
11. **Dependencies.** Entry: p11c3 (p11c3.story -> p11c4.begin). Start flag: `p11_ch99_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room galley, npc rusty_tom, npc barnacle_bill, npc garrick, trigger). In-room hooks into this chapter: map objects in galley ×2; NPC dialogue in barnacle_bill, garrick, rusty_tom.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** '(instantly awake) What about the sash?' stays.

### `p11c5` · Chapter 100: The Grand Finger-Puller

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p11c5`, Chapter 100: The Grand Finger-Puller. Scripts: 6 in `data/story/cutscenes/phase11/ch96_103.json`. Quests: `grand_finger_puller` “The Grand Finger-Puller” in `data/quests/phase11.json`.
2. **Events and dialogue.** Garrick proposes a Grand Finger-Puller; count four votes. Dialogue: 33 lines (garrick 9, captain 7, pete 5, (narration) 4, bob 4, squawks 2, jim 1, gristle 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, bob, squawks, jim, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, jim, gristle, pete. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 6 (`p11_ch100_started`, `p11_vote_pete`, `p11_vote_bob`, `p11_vote_jim`, `p11_vote_gristle`, `grand_finger_puller_introduced`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Count the votes: Pete, Bob, Jim and Gristle” [event×4]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A vote scene.
7. **Proposed primary mechanic.** Keep; votes reflect crew morale/loyalty values (data feed only).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p11c4 (p11c4.done -> p11c5.begin). Start flag: `p11_ch100_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (npc pete, npc bob, npc jim, npc gristle, dialogue p11, trigger). In-room hooks into this chapter: map objects in none; NPC dialogue in bob, gristle, jim, pete.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** The drawing of a hand with one finger out stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p11c6` · Chapter 101: The Storm Starts Listening

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p11c6`, Chapter 101: The Storm Starts Listening. Scripts: 6 in `data/story/cutscenes/phase11/ch96_103.json`. Quests: `storm_listening` “The Storm Starts Listening” in `data/quests/phase11.json`.
2. **Events and dialogue.** Four plastic participation tokens come down the ladder; the storm is listening. Dialogue: 22 lines ((narration) 7, garrick 4, captain 4, pete 3, ned 2, gristle 1, bob 1); 0 choice prompt(s) with 0 options. Presentation: insert ×5.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, ned, gristle, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`. Interactables: `p11_tok_1` (galley 13,5), `p11_tok_2` (galley 10,5), `p11_tok_3` (galley 14,9), `p11_tok_4` (galley 9,11). Flags set: 8 (`p11_ch101_started`, `p11_tokens_down`, `p11_tok_1`, `p11_tok_2`, `p11_tok_3`, `p11_tok_4`, `p11_tokens_read`, `bbk_mocked_fart_man`); items given: none.
4. **Current player actions and mechanics.** Objectives: “See what came down the ladder (four tokens, on the floor)” [event×4]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Short.
7. **Proposed primary mechanic.** Keep; tokens collected (evidence).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p11c5 (p11c5.result -> p11c6.begin). Start flag: `p11_ch101_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 6 (room galley, trigger). In-room hooks into this chapter: map objects in galley ×4; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'The sharks are LISTENING.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p11c7` · Chapter 102: Hammocks Begin to Die

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p11c7`, Chapter 102: Hammocks Begin to Die. Scripts: 7 in `data/story/cutscenes/phase11/ch96_103.json`. Quests: `hammocks_die` “Hammocks Begin to Die” in `data/quests/phase11.json`.
2. **Events and dialogue.** The ship drops sideways; three new hammocks die; help Pete, Bob and Jim up; stop the long table sliding; inspect the rags. Garrick's old hammock survives. Dialogue: 34 lines ((narration) 17, garrick 4, gristle 4, bob 3, captain 3, pete 2, jim 1); 0 choice prompt(s) with 0 options. Presentation: shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, gristle, bob, pete, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, jim, pete. Rooms: `galley`. Interactables: `p11_table` (galley 7,7), `p11_rags_pete` (galley 7,9), `p11_rags_bob` (galley 9,10), `p11_rags_jim` (galley 1,7). Flags set: 9 (`p11_ch102_started`, `sailcloth_hammocks_snapped`, `p11_up_pete`, `p11_up_bob`, `p11_up_jim`, `p11_table_braced`, `hammock_cloth_too_weak`, `treasure_door_sign_1`, `treasure_room_sealed`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Help Pete, Bob and Jim up (on the floor)” [event×3]; “Stop the long table sliding (the long table)” [flag]; “Look at what's left of the hammocks (the rags on the beams)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** An impact moment followed by a sliding-table hazard.
7. **Proposed primary mechanic.** Sliding table: stop the long table before it goes down the hold stairs (push against tilt timing) while helping crew off the floor.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Tilt, heavy table.
10. **Failure conditions and consequences.** Table goes down the stairs → blocks the hold stairs (detour) until cleared.
11. **Dependencies.** Entry: p11c6 (p11c6.done -> p11c7.begin). Start flag: `p11_ch102_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 6 (room galley, npc pete, npc bob, npc jim, room cargo_hold, trigger). In-room hooks into this chapter: map objects in galley ×4; NPC dialogue in bob, jim, pete.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** Garrick's patched hammock 'perfectly intact' stays.

### `p11c8` · Chapter 103: The Lost Book

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p11c8`, Chapter 103: The Lost Book. Scripts: 3 in `data/story/cutscenes/phase11/ch96_103.json`. Quests: `the_lost_book` “The Lost Book” in `data/quests/phase11.json`.
2. **Events and dialogue.** Garrick reads Rumpold and the Second Tornado to 'the morale'; brace the long table; the book is lost; console him. Dialogue: 33 lines ((narration) 17, garrick 10, squawks 2, pete 1, gristle 1, jim 1, captain 1); 1 choice prompt(s) with 3 options. Presentation: shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, pete, gristle, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `galley`. Interactables: `p11_brace` (galley 7,7). Flags set: 3 (`p11_ch103_started`, `garrick_book_lost`, `p11_garrick_consoled`); items given: none.
4. **Current player actions and mechanics.** Objectives: “BRACE! (the long table)” [flag]; “Say something to him (him)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Brace beat.
7. **Proposed primary mechanic.** Keep; brace is one timing bar.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p11c7 (p11c7.done -> p11c8.begin). Start flag: `p11_ch103_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room galley). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'There's always a second tornado, Pete. That's how you know the first one meant it.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p11c9` · Chapter 104: Cheap-O-Rama Emergency Delivery

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p11c9`, Chapter 104: Cheap-O-Rama Emergency Delivery. Scripts: 5 in `data/story/cutscenes/phase11/ch104_111.json`. Quests: `cheap_o_rama_delivery` “Cheap-O-Rama Emergency Delivery” in `data/quests/phase11.json`.
2. **Events and dialogue.** A Cheap-O-Rama delivery helicopter descends through the storm; go on deck; carry the crate below; open it. Dialogue: 30 lines ((narration) 13, garrick 4, pete 3, captain 3, gristle 2, ned 2, jim 2, bob 1); 0 choice prompt(s) with 0 options. Presentation: vista ×1, transition ×1, spawn ×1, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, gristle, ned, jim, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`, `main_deck`. Interactables: `p11_crate_deck` (main_deck 9,15), `p11_crate_open` (galley 13,6). Flags set: 4 (`p11_ch104_started`, `cheap_o_rama_crate_landed`, `cheap_o_rama_crate_below`, `cheap_o_rama_sashes_arrived`); items given: none.
4. **Current player actions and mechanics.** Objectives: “See what that noise is (up the ladder, on deck)” [flag]; “Get the crate below (the crate, on deck)” [flag]; “Open it (the crate, in the galley)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Heavy carry across a storm deck.
7. **Proposed primary mechanic.** Crate carry: move a heavy crate from the deck to the galley hatch through the storm's wind (push-back gusts, falling sharks).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Wind gusts, carry slows movement.
10. **Failure conditions and consequences.** Crate dropped → it splits (some sashes lost; humour).
11. **Dependencies.** Entry: p11c8 (p11c8.console -> p11c9.begin). Start flag: `p11_ch104_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room main_deck, room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle). In-room hooks into this chapter: map objects in main_deck ×1, galley ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'WE DELIVER ANYWHERE.' stays.

### `p11c10` · Chapter 105: The Pocket Sacred Text

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p11c10`, Chapter 105: The Pocket Sacred Text. Scripts: 6 in `data/story/cutscenes/phase11/ch104_111.json`. Quests: `pocket_sacred_text` “The Pocket Sacred Text” in `data/quests/phase11.json`.
2. **Events and dialogue.** The Pocket Sacred Text: Garrick's legends in a cheap stapled booklet in every box; the crew react. Dialogue: 23 lines (garrick 7, (narration) 5, captain 3, bob 2, pete 2, ned 2, gristle 1, squawks 1); 0 choice prompt(s) with 0 options. Presentation: giveItem ×1, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, bob, pete, ned, gristle, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): ned, gristle, pete. Rooms: `galley`. Interactables: `p11_crate_find` (galley 13,6). Flags set: 6 (`p11_ch105_started`, `pocket_book_found`, `p11_pt_ned`, `p11_pt_gristle`, `p11_pt_pete`, `pocket_book_corroboration_mocked`); items given: pocket_legend_book.
4. **Current player actions and mechanics.** Objectives: “See what else is in the box (the crate)” [flag]; “Hear what the crew think of it (Ned, Gristle and Pete)” [event×3]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Revelation beat.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p11c9 (p11c9.open -> p11c10.begin). Start flag: `p11_ch105_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (npc ned, npc gristle, npc pete, trigger). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in gristle, ned, pete.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'It's the BOOK, Garrick. It's YOUR book.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p11c11` · Chapter 106: Bed Sashes

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p11c11`, Chapter 106: Bed Sashes. Scripts: 7 in `data/story/cutscenes/phase11/ch104_111.json`. Quests: `bed_sashes` “Bed Sashes” in `data/quests/phase11.json`.
2. **Events and dialogue.** Bed Sashes: the cheap sashes won't tear; re-hang three hammocks with sashes; your own bed. Dialogue: 27 lines ((narration) 12, gristle 5, garrick 5, captain 2, pete 1, bob 1, jim 1); 1 choice prompt(s) with 2 options. Presentation: giveItem ×1.
3. **Characters, locations, props, flags.** Speaking characters: gristle, garrick, pete, bob, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`. Interactables: `p11_crate_take` (galley 13,6), `p11_hang_pete` (galley 7,9), `p11_hang_bob` (galley 9,10), `p11_hang_jim` (galley 1,7), `p11_own_bed` (galley 12,8). Flags set: 8 (`p11_ch106_started`, `p11_sashes_taken`, `p11_hung_pete`, `p11_hung_bob`, `p11_hung_jim`, `p11_hung_said`, `captain_uses_bed_sash`, `bed_sashes_installed`); items given: toy_sash.
4. **Current player actions and mechanics.** Objectives: “Take sashes from the crate” [flag]; “Re-hang the hammocks with sashes (the rags on the beams: Pete's, Bob's, Jim's)” [event×3]; “And your own bed (the bean sacks under his hammock)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A resource find (300 indestructible sashes) that could be a crafting material all game.
7. **Proposed primary mechanic.** Sashes become a crafting material (rope substitute) in the inventory; re-hanging hammocks uses them with the timing bar.
8. **Secondary mechanics.** Later chapters can accept sashes for repairs (persistent resource).
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p11c10 (p11c10.done -> p11c11.begin). Start flag: `p11_ch106_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 6 (room galley, trigger, dialogue p11). In-room hooks into this chapter: map objects in galley ×5; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'They're ages six and up. We're all over six.' stays.

### `p11c12` · Chapter 107: The Grand Nap's Grand Resumption

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p11c12`, Chapter 107: The Grand Nap's Grand Resumption. Scripts: 1 in `data/story/cutscenes/phase11/ch104_111.json`. Quests: `grand_resumption` “The Grand Nap's Grand Resumption” in `data/quests/phase11.json`.
2. **Events and dialogue.** Garrick declares the Grand Nap resumed; none of the sleep so far counts. Dialogue: 15 lines (garrick 5, bob 4, (narration) 2, jim 2, pete 1, captain 1); 1 choice prompt(s) with 3 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, bob, jim, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 1 (`p11_ch107_started`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Hear one more story (the Grand Stenchmaster, in his hammock)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** 15 lines.
7. **Proposed primary mechanic.** Keep as is.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p11c11 (p11c11.own -> p11c12.begin). Start flag: `p11_ch107_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (room galley). In-room hooks into this chapter: map objects in none; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Sleep... doesn't count?' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p11c13` · Chapter 108: Sir Rumpus and Fart Validity

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p11c13`, Chapter 108: Sir Rumpus and Fart Validity. Scripts: 1 in `data/story/cutscenes/phase11/ch104_111.json`. Quests: none (no quest; pure cutscene chapter).
2. **Events and dialogue.** Sir Rumpus Windbottom and the founding of the Grand Court (legend). Dialogue: 28 lines (garrick 15, pete 4, captain 3, bob 2, (narration) 2, jim 1, squawks 1); 1 choice prompt(s) with 3 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, bob, jim, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 2 (`p11_ch108_started`, `rumpus_legend_heard`); items given: none.
4. **Current player actions and mechanics.** Objectives: no objectives: the player watches and advances dialogue. Mechanics invoked by the scripts: none.
5. **Classification.** Dialogue / cutscene only. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Legend; sets up the Grand Court satire used in Phase 12.
7. **Proposed primary mechanic.** Keep (codex).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: npc:garrick -> p11c13.story (in-room hook). Start flag: `p11_ch108_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 0 (none). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Just a FART, Jim. Exactly. Chaos.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p11c14` · Chapter 109: Late-Night Bling Bling King

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p11c14`, Chapter 109: Late-Night Bling Bling King. Scripts: 2 in `data/story/cutscenes/phase11/ch104_111.json`. Quests: `late_night_bling` “Late-Night Bling Bling King” in `data/quests/phase11.json`.
2. **Events and dialogue.** The Mark II turns itself on: Late-Night Bling Bling King (the shark in a suit behind a desk); turn it off. Dialogue: 16 lines ((narration) 6, garrick 3, pete 2, jim 1, ned 1, bob 1, gristle 1, captain 1); 0 choice prompt(s) with 0 options. Presentation: tvProgram ×4, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, jim, ned, bob, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`. Interactables: `p11_tv_late` (galley 16,7). Flags set: 2 (`p11_ch109_started`, `bbk_late_night_seen`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Turn it OFF (the Mark II)” [flag]. Mechanics invoked by the scripts: TV knobs ×2, TV power ×1.
5. **Classification.** Choice or puzzle prompt (TV knobs ×2). Presentation-only effects with no player input: TV power ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** TV knob beat.
7. **Proposed primary mechanic.** Keep; the knob shutdown can reuse the p6c2 puzzle with a harder sequence.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p11c13 (p11c13.story -> p11c14.begin). Start flag: `p11_ch109_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 0 (none). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'That's the shark. In a suit. Behind a DESK.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p11c15` · Chapter 110: The First Great Sash Flutter

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p11c15`, Chapter 110: The First Great Sash Flutter. Scripts: 2 in `data/story/cutscenes/phase11/ch104_111.json`. Quests: `first_great_flutter` “The First Great Sash Flutter” in `data/quests/phase11.json`.
2. **Events and dialogue.** Garrick, hurt by the show, tells the legend of the First Great Sash Flutter. Dialogue: 31 lines (garrick 14, (narration) 9, captain 4, pete 2, bob 1, jim 1); 0 choice prompt(s) with 0 options. Presentation: vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, bob, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 3 (`p11_ch110_started`, `gustavio_legend_heard`, `sash_flutter_weakness_discovered`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Hear the last story of the night (the Grand Stenchmaster, in his hammock)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Legend.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p11c14 (p11c14.knobs -> p11c15.begin). Start flag: `p11_ch110_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (dialogue p11, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'That show was very unfair. To the office.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p11c16` · Chapter 111: Secret Research and the Anti-Dice Conspiracy

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p11c16`, Chapter 111: Secret Research and the Anti-Dice Conspiracy. Scripts: 17 in `data/story/cutscenes/phase11/ch104_111.json`. Quests: `anti_dice_conspiracy` “The Anti-Dice Conspiracy” in `data/quests/phase11.json`.
2. **Events and dialogue.** Secret research: borrow the booklet off Garrick's chest without waking him, read it under the six-rope lamp (5 steps), write the plan, put it back, wake four crew quietly, hold a meeting (the Anti-Dice Conspiracy). Dialogue: 97 lines ((narration) 55, captain 19, pete 9, gristle 5, garrick 3, bob 3, jim 3); 2 choice prompt(s) with 12 options. Presentation: insert ×8, giveItem ×2, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, gristle, garrick, bob, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, jim, gristle, pete. Rooms: `galley`. Interactables: `p11_borrow` (galley 12,8), `p11_lamp_read` (galley 15,6), `p11_plan` (galley 7,7), `p11_return` (galley 12,8), `p11_meeting` (galley 7,7). Flags set: 20 (`p11_ch111_started`, `p11_reach_shifted`, `pocket_book_borrowed`, `p11_psg_gustavio`, `p11_psg_thirty`, `p11_psg_clause`, `p11_psg_silence`, `p11_psg_dice`, `grand_dice_known`, `anti_dice_plan_written`, +10 more); items given: pocket_legend_book, anti_dice_plan.
4. **Current player actions and mechanics.** Objectives: “Borrow the booklet off his chest (his hammock, from your bed)” [flag]; “Read it properly under the six-rope lamp (by the Mark II)” [event×5]; “Write the plan (the long table)” [flag]; “Put the booklet back (his hammock, from your bed)” [flag]; “Wake the crew, quietly: Pete, Gristle, Bob and Jim” [event×4]; “Hold the meeting (the long table)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The phase's biggest interactive chapter (97 lines, 20 flags). It is a heist.
7. **Proposed primary mechanic.** Night heist: timing the borrow to the hammock swing (exists as timing), stealth across a tilting galley, a research puzzle (assemble the dice rules from the booklet), and quiet wake-ups (noise meter).
8. **Secondary mechanics.** The plan's quality determines how the dice trial in Phase 12 can be manipulated.
9. **Enemies, puzzles, timers, hazards, resources.** Hammock swing timing, tilt cycle, creaky sacks, sleep meter.
10. **Failure conditions and consequences.** Garrick wakes → he takes the booklet back to bed (retry later in the night with a tighter window).
11. **Dependencies.** Entry: p11c15 (p11c15.story -> p11c16.begin). Start flag: `p11_ch111_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 8 (room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in galley ×5; NPC dialogue in bob, gristle, jim, pete.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** The conspiracy meeting's jokes stay; stealth makes the player the conspirator.
