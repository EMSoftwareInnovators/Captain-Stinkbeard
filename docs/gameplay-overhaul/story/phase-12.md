# Story inventory, Phase 12: The Thirty-Second Sash Trial

Chapters: 15 (p12c1 to p12c15). Dialogue lines: 436. Classification: Walk + press A 9, Choice or puzzle prompt 3, Timing / skill input 2, Dialogue / cutscene only 1.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE12.md`, `data/quests/phase12.json`, `data/story/cutscenes/phase12/`, `data/story/flags/phase12.json`, `tests/phase12_story.test.js`, `tests/phase12Play.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p12c1` · Chapter 112: He Woke Up Loaded

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p12c1`, Chapter 112: He Woke Up Loaded. Scripts: 8 in `data/story/cutscenes/phase12/ch112_118.json`. Quests: `he_woke_up_loaded` “He Woke Up Loaded” in `data/quests/phase12.json`.
2. **Events and dialogue.** He woke up loaded: the galley vibrates; gather protection (wet cloth, goggles, rope, beard wrap) from four rooms; Bob's pot (optional). Dialogue: 39 lines ((narration) 19, captain 5, bob 4, garrick 3, gristle 3, pete 2, jim 2, squawks 1); 1 choice prompt(s) with 2 options. Presentation: giveItem ×5, shake ×3.
3. **Characters, locations, props, flags.** Speaking characters: bob, garrick, gristle, pete, jim, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob. Rooms: `captains_quarters`, `cargo_hold`, `galley`. Interactables: `p12_wardrobe_wrap` (captains_quarters 3,4), `p12_goggles` (cargo_hold 15,13), `p12_bucket` (galley 3,6), `p12_rope` (galley 15,9). Flags set: 8 (`p12_started`, `gear_wet_cloth`, `gear_goggles`, `gear_waist_rope`, `gear_beard_wrap`, `gear_clay_pot`, `gear_clay_pot_refused`, `trial_gear_on`); items given: wet_cloth, bottle_goggles, waist_rope, beard_wrap, clay_pot_helmet.
4. **Current player actions and mechanics.** Objectives: “Gather protection: wet cloth (Jim's bucket), goggles (the hold), rope (by the Grog cask), beard wrap (your wardrobe)” [event×4]; “Bob has a pot (optional)” [flag, optional]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A gear-gathering errand across the ship; equipment exists only as flags today.
7. **Proposed primary mechanic.** Equipment prep: the four items become real equipment slots (head, face, beard, utility) with stats against fume exposure; the player chooses what to wear for p12c4.
8. **Secondary mechanics.** Bob's pot as an optional helmet with a trade-off (protection vs. vision).
9. **Enemies, puzzles, timers, hazards, resources.** A time limit as the rumble builds (GRRRNK meter).
10. **Failure conditions and consequences.** Missing gear → harder sash hold in p12c4.
11. **Dependencies.** Entry: story trigger p12_geared: {all:[{objectiveDone:he_woke_up_loaded.gear},{notFlag:trial_gear_on}]}. Start flag: `p12_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 8 (room cargo_hold, room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow). In-room hooks into this chapter: map objects in galley ×4, cargo_hold ×1, captains_quarters ×1; NPC dialogue in bob.
12. **Complexity and priority.** Complexity S, priority P1.
13. **Preserving story and humour; variety.** Bob's pot stays optional and silly; the beard wrap ties into Beard Saturation.

### `p12c2` · Chapter 113: Volunteer

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p12c2`, Chapter 113: Volunteer. Scripts: 3 in `data/story/cutscenes/phase12/ch112_118.json`. Quests: `volunteer` “Volunteer” in `data/quests/phase12.json`.
2. **Events and dialogue.** On deck, the ceremony; Rusty Tom and Barnacle Bill hide; the captain volunteers and takes the sash. Dialogue: 26 lines (garrick 9, (narration) 8, captain 6, barnacle_bill 2, rusty_tom 1); 0 choice prompt(s) with 0 options. Presentation: insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, barnacle_bill, rusty_tom. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 5 (`p12_ch113_started`, `p12_on_deck`, `stinkbeard_volunteered`, `sash_taken`, `old_sash_worse_than_beard`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Up on deck: the ceremony (by the mainmast)” [flag]; “Take the sash (him)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Short.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p12c1 (p12c1.geared -> p12c2.begin). Start flag: `p12_ch113_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (room galley, room main_deck). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Tom. Bill. Left and right. You know the positions.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p12c3` · Chapter 114: Pre-Waft

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p12c3`, Chapter 114: Pre-Waft. Scripts: 1 in `data/story/cutscenes/phase12/ch112_118.json`. Quests: `the_trial` “The Thirty-Second Trial” in `data/quests/phase12.json`.
2. **Events and dialogue.** Pre-Waft: everyone backs off; a warning plume hits your goggles. Dialogue: 15 lines ((narration) 7, captain 4, garrick 2, pete 1, jim 1); 1 choice prompt(s) with 3 options. Presentation: shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 1 (`p12_ch114_started`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Hold the sash for thirty seconds (him, from behind)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** 15 lines.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p12c2 (p12c2.take -> p12c3.begin). Start flag: `p12_ch114_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 0 (none). In-room hooks into this chapter: map objects in none; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'That was the WARNING?' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p12c4` · Chapter 115: The Thirty-Second Trial

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p12c4`, Chapter 115: The Thirty-Second Trial. Scripts: 1 in `data/story/cutscenes/phase12/ch112_118.json`. Quests: none (no quest; pure cutscene chapter).
2. **Events and dialogue.** The Thirty-Second Trial: hold the sash for thirty seconds (the existing sash-tension hold mechanic); the hands slip at thirty. Dialogue: 6 lines ((narration) 3, garrick 2, captain 1); 0 choice prompt(s) with 0 options. Presentation: shake ×2.
3. **Characters, locations, props, flags.** Speaking characters: garrick. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 2 (`p12_ch115_started`, `thirty_seconds_held`); items given: none.
4. **Current player actions and mechanics.** Objectives: no objectives: the player watches and advances dialogue. Mechanics invoked by the scripts: sash tension (hold) ×1.
5. **Classification.** Timing / skill input (sash tension (hold) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** One of the few skill mechanics; can become a proper endurance boss.
7. **Proposed primary mechanic.** Sash endurance: the sash-tension hold with phases (gust spikes, fume pulses that blur vision, Pete's count as rhythm), affected by equipment from p12c1. The outcome stays canonical (the sash goes at thirty), but performance determines the 'flutter' magnitude and crew reaction.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Tension spikes, vision blur, grip fatigue.
10. **Failure conditions and consequences.** Drop early → retry (the story requires reaching thirty).
11. **Dependencies.** Entry: npc:garrick -> p12c4.trial (in-room hook). Start flag: `p12_ch115_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete, npc rusty_tom). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'Pete's voice cracks on THIRTY.' stays.

### `p12c5` · Chapter 116: The Flutter

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p12c5`, Chapter 116: The Flutter. Scripts: 8 in `data/story/cutscenes/phase12/ch112_118.json`. Quests: `the_flutter` “The Flutter” in `data/quests/phase12.json`.
2. **Events and dialogue.** The storm lifts the loose sash and it FLUTTERS; Pete gasps as rehearsed; read four complaint tokens on deck. Dialogue: 31 lines ((narration) 14, captain 4, pete 2, jim 2, bob 2, gristle 2, ned 2, garrick 2, +1 more); 1 choice prompt(s) with 3 options. Presentation: insert ×5, vista ×2, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, jim, bob, gristle, ned, garrick, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `main_deck`. Interactables: `p12_complaint_1` (main_deck 5,13), `p12_complaint_2` (main_deck 13,13), `p12_complaint_3` (main_deck 7,18), `p12_complaint_4` (main_deck 12,18). Flags set: 8 (`p12_ch116_started`, `sash_fluttered`, `p12_complaints_down`, `p12_complaint_1`, `p12_complaint_2`, `p12_complaint_3`, `p12_complaint_4`, `sash_flutter_humiliation_valid`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Read the complaints (the tokens, all over the deck)” [event×4]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Reveal + collectables.
7. **Proposed primary mechanic.** Keep; tokens are evidence.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p12c4 (p12c4.trial -> p12c5.begin). Start flag: `p12_ch116_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 6 (room main_deck, trigger). In-room hooks into this chapter: map objects in main_deck ×4; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** '(pointing, gasping, exactly as rehearsed) GASP!' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p12c6` · Chapter 117: Three Weeks!

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p12c6`, Chapter 117: Three Weeks!. Scripts: 1 in `data/story/cutscenes/phase12/ch112_118.json`. Quests: none (no quest; pure cutscene chapter).
2. **Events and dialogue.** The captain reads the penalty: twenty-one days of Stench Silence; the crew cheer. Dialogue: 19 lines ((narration) 7, garrick 5, captain 2, pete 2, gristle 1, jim 1, bob 1); 0 choice prompt(s) with 0 options. Presentation: insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, gristle, jim, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 3 (`p12_ch117_started`, `trial_gear_off`, `dice_clause_invoked`); items given: none.
4. **Current player actions and mechanics.** Objectives: no objectives: the player watches and advances dialogue. Mechanics invoked by the scripts: none.
5. **Classification.** Dialogue / cutscene only. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Victory beat.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p12c5 (p12c5.done -> p12c6.begin). Start flag: `p12_ch117_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete, npc rusty_tom). In-room hooks into this chapter: map objects in none; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'The SACRED Twenty-One Days of Stenchless Honour!' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p12c7` · Chapter 118: Find the Dice

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p12c7`, Chapter 118: Find the Dice. Scripts: 8 in `data/story/cutscenes/phase12/ch112_118.json`. Quests: `find_the_dice` “Find the Dice” in `data/quests/phase12.json`.
2. **Events and dialogue.** Garrick hunts for dice; follow him (drawers, beans, long table, crate); search the Cheap-O-Rama crate yourself. Dialogue: 41 lines ((narration) 19, garrick 9, pete 5, captain 3, jim 2, bob 2, gristle 1); 1 choice prompt(s) with 3 options. Presentation: transition ×1, spawn ×1, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, jim, bob, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `galley`. Interactables: `p12_crate_dice` (galley 13,6). Flags set: 7 (`p12_ch118_started`, `p12_rs_1`, `p12_rs_2`, `p12_rs_3`, `p12_rs_4`, `normal_die_six`, `grand_dice_found`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Follow him! (him: the drawers, the beans, the long table, the crate)” [event×4]; “Search the Cheap-O-Rama crate yourself (the crate)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A race: find the dice before he does.
7. **Proposed primary mechanic.** Search race: Garrick and the captain search simultaneously; the player must reach the die first using knowledge from p11c16 (where it would be).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Garrick's search path; obstacles in the galley.
10. **Failure conditions and consequences.** He finds it first → the ceremony starts with him in control (dialogue variant).
11. **Dependencies.** Entry: p12c6 (p12c6.begin -> p12c7.begin). Start flag: `p12_ch118_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room galley, room main_deck, npc garrick, trigger). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'A die is a small thing, Jim. It could be ANYWHERE.' and the occupied mousetrap stay.

### `p12c8` · Chapter 119: Rules, Loopholes and No Escape

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p12c8`, Chapter 119: Rules, Loopholes and No Escape. Scripts: 3 in `data/story/cutscenes/phase12/ch119_126.json`. Quests: `no_escape` “No Escape” in `data/quests/phase12.json`.
2. **Events and dialogue.** Read every clause of the Grand Dice fine print (eight steps). Dialogue: 44 lines (pete 16, captain 11, (narration) 8, gristle 3, garrick 3, bob 1, jim 1, ned 1); 1 choice prompt(s) with 9 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: pete, gristle, garrick, bob, jim, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`. Interactables: `p12_fine_print` (galley 7,7). Flags set: 10 (`p12_ch119_started`, `p12_clause_witness`, `p12_clause_holders`, `p12_clause_emergency`, `p12_clause_chairs`, `p12_clause_rerolls`, `p12_clause_destroy`, `p12_clause_lost`, `p12_clause_mandatory`, `fine_print_read`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Read the fine print, every clause (the Grand Dice, on the long table)” [event×8]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Reading puzzle.
7. **Proposed primary mechanic.** Loophole hunt: the clauses form a logic puzzle; finding the real loophole (the 'witness' clause) gives an advantage in p12c10.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Logic.
10. **Failure conditions and consequences.** Miss it → no advantage.
11. **Dependencies.** Entry: p12c7 (p12c7.crate -> p12c8.begin). Start flag: `p12_ch119_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (trigger). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** Pete's grim reading and 'Plan A was destroy every dice on the ship' stay.

### `p12c9` · Chapter 120: The Grand Dice Shipment

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p12c9`, Chapter 120: The Grand Dice Shipment. Scripts: 2 in `data/story/cutscenes/phase12/ch119_126.json`. Quests: `six_dice` “The Grand Dice Shipment” in `data/quests/phase12.json`.
2. **Events and dialogue.** Six more Grand Dice arrive down the hatch. Dialogue: 12 lines ((narration) 4, garrick 2, squawks 2, ned 1, captain 1, pete 1, jim 1); 0 choice prompt(s) with 0 options. Presentation: insert ×2.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, ned, pete, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`. Interactables: `p12_shipment` (galley 13,4). Flags set: 2 (`p12_ch120_started`, `grand_dice_shipment_received`); items given: none.
4. **Current player actions and mechanics.** Objectives: “See what came down the hatch (the crate at the foot of the ladder)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** 12 lines.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p12c8 (p12c8.done -> p12c9.begin). Start flag: `p12_ch120_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room galley). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** '(it had)' listening joke stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p12c10` · Chapter 121: The Grand Dice Ceremony

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p12c10`, Chapter 121: The Grand Dice Ceremony. Scripts: 9 in `data/story/cutscenes/phase12/ch119_126.json`. Quests: `grand_dice_ceremony` “The Grand Dice Ceremony” in `data/quests/phase12.json`.
2. **Events and dialogue.** The Grand Dice Ceremony: inspect the die, choose a witness, let him roll (dice roll mechanic), celebrate. Dialogue: 47 lines ((narration) 16, garrick 8, pete 5, gristle 5, jim 4, bob 4, squawks 2, ned 2, +1 more); 2 choice prompt(s) with 7 options. Presentation: insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, gristle, jim, bob, squawks, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, bob, ned, jim, gristle, pete. Rooms: `galley`. Interactables: `p12_die_inspect` (galley 7,7), `p12_die_witness` (galley 7,7). Flags set: 9 (`p12_ch121_started`, `p12_die_inspected`, `p12_witness_chosen`, `apparent_three_months`, `p12_cheer_pete`, `p12_cheer_jim`, `p12_cheer_bob`, `p12_cheer_gristle`, `p12_cheer_ned`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Inspect the Grand Dice (the long table)” [flag]; “Choose a witness (the long table)” [flag]; “Let him roll (him)” [flag]; “Celebrate! (talk to the crew)” [event×3]. Mechanics invoked by the scripts: dice roll ×8.
5. **Classification.** Choice or puzzle prompt (dice roll ×8). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The dice mechanic exists (8 uses).
7. **Proposed primary mechanic.** Weighted dice: the player's preparation (loophole, witness choice) changes the die's faces/odds; the roll remains a visible mechanic.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None beyond the roll.
10. **Failure conditions and consequences.** A long result is canonical (story continues).
11. **Dependencies.** Entry: p12c9 (p12c9.open -> p12c10.begin). Start flag: `p12_ch121_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 8 (room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in galley ×2; NPC dialogue in bob, garrick, gristle, jim, ned, pete.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** The sticker meanings ('Three MONTHS. You save three for last.') stay.

### `p12c11` · Chapter 122: Mexican Jumping Beans

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p12c11`, Chapter 122: Mexican Jumping Beans. Scripts: 4 in `data/story/cutscenes/phase12/ch119_126.json`. Quests: `jumping_beans` “Mexican Jumping Beans” in `data/quests/phase12.json`.
2. **Events and dialogue.** The die is full of jumping beans and hops round the galley; catch it three times. Dialogue: 34 lines ((narration) 19, pete 4, garrick 4, captain 3, jim 2, bob 1, squawks 1); 1 choice prompt(s) with 3 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: pete, garrick, jim, bob, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`. Interactables: `p12_die_1` (galley 10,9), `p12_die_2` (galley 3,5), `p12_die_3` (galley 8,8). Flags set: 5 (`p12_ch122_started`, `p12_hop_1`, `p12_hop_2`, `stenchmaster_suspension_active`, `one_day_betrayal`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Catch the die! (it's hopping round the galley)” [event×3]. Mechanics invoked by the scripts: dice roll ×13.
5. **Classification.** Choice or puzzle prompt (dice roll ×13). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Catching a hopping object is a natural action mini-game.
7. **Proposed primary mechanic.** Catch the hopping die: it hops on a visible rhythm, bounces off furniture; corner it.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Erratic hops, crew getting in the way.
10. **Failure conditions and consequences.** It lands on a bad face → a dialogue variant; retry.
11. **Dependencies.** Entry: story trigger p12_celebrated: {all:[{objectiveDone:grand_dice_ceremony.celebrate},{notFlag:p12_ch122_started}]}. Start flag: `p12_ch122_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (room galley, trigger, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle). In-room hooks into this chapter: map objects in galley ×3; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'It's in the leaflet! For extra fun!' stays.

### `p12c12` · Chapter 123: Garrick Is Not Grand

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p12c12`, Chapter 123: Garrick Is Not Grand. Scripts: 2 in `data/story/cutscenes/phase12/ch119_126.json`. Quests: `not_grand` “Garrick Is Not Grand” in `data/quests/phase12.json`; `the_suspension` “The Suspension” (left OPEN) in `data/quests/phase12.json`.
2. **Events and dialogue.** Garrick is not Grand: read him the suspension rules (regalia off). Opens 'The Suspension' (an open quest counting hours). Dialogue: 16 lines (captain 4, garrick 4, (narration) 3, pete 1, jim 1, bob 1, gristle 1, squawks 1); 0 choice prompt(s) with 0 options. Presentation: insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, jim, bob, gristle, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 3 (`p12_ch123_started`, `regalia_removed`, `garrick_not_grand`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Read him the suspension rules (him)” [flag]; “Keep him to it: no releases (about {var:suspension_hours_left} hours to go)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** An ongoing constraint that could be a timed objective.
7. **Proposed primary mechanic.** Keep; the suspension countdown shows on the HUD (existing var).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p12c11 (p12c11.catch_3 -> p12c12.begin). Start flag: `p12_ch123_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'No ceremonial regalia.' Off. stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p12c13` · Chapter 124: The Authenticity Whiff

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p12c13`, Chapter 124: The Authenticity Whiff. Scripts: 5 in `data/story/cutscenes/phase12/ch119_126.json`. Quests: `authenticity_whiff` “The Authenticity Whiff” in `data/quests/phase12.json`.
2. **Events and dialogue.** The Authenticity Whiff: verify the sash (look, fabric, fringe) and perform the ceremonial inhalation; put it in your wardrobe. Dialogue: 34 lines ((narration) 17, pete 5, captain 4, garrick 3, jim 2, gristle 1, squawks 1, bob 1); 2 choice prompt(s) with 6 options. Presentation: insert ×1, shake ×1, giveItem ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, garrick, jim, gristle, squawks, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `captains_quarters`, `galley`. Interactables: `p12_sash_exam` (galley 7,7), `p12_sash_whiff` (galley 7,7), `p12_wardrobe_sash` (captains_quarters 3,4). Flags set: 7 (`p12_ch124_started`, `p12_exam_look`, `p12_exam_fabric`, `p12_exam_fringe`, `authenticity_whiff_done`, `p12_custody_said`, `sash_in_wardrobe`); items given: stenchmaster_sash.
4. **Current player actions and mechanics.** Objectives: “Verify the sash: look, fabric, fringe (the sash, on the long table)” [event×3]; “The ceremonial inhalation (the sash)” [flag]; “Put it in your wardrobe (your cabin)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A comic forced action.
7. **Proposed primary mechanic.** Keep; the inhalation adds Beard Saturation (persistent) as a real consequence.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p12c12 (p12c12.rules -> p12c13.begin). Start flag: `p12_ch124_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (trigger, room captains_quarters, room galley). In-room hooks into this chapter: map objects in galley ×2, captains_quarters ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** Garrick sitting up 'VERY interested, despite everything' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p12c14` · Chapter 125: A Normal Pirate Breakfast

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p12c14`, Chapter 125: A Normal Pirate Breakfast. Scripts: 9 in `data/story/cutscenes/phase12/ch119_126.json`. Quests: `normal_breakfast` “A Normal Pirate Breakfast” in `data/quests/phase12.json`.
2. **Events and dialogue.** A Normal Pirate Breakfast: cook eggs, bacon, potatoes, toast, fruit, tea with Jim (six timing bars); eat. Dialogue: 30 lines ((narration) 19, jim 6, garrick 3, captain 1, pete 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: jim, garrick, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `galley`. Interactables: `p12_bf_eggs` (galley 1,4), `p12_bf_bacon` (galley 1,4), `p12_bf_potatoes` (galley 1,4), `p12_bf_fruit` (galley 5,4), `p12_bf_toast` (galley 5,4), `p12_bf_tea` (galley 7,7), `p12_bf_eat` (galley 7,7). Flags set: 9 (`p12_ch125_started`, `p12_bf_eggs`, `p12_bf_bacon`, `p12_bf_potatoes`, `p12_bf_toast`, `p12_bf_fruit`, `p12_bf_tea`, `p12_bf_said`, `normal_breakfast_eaten`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Cook: eggs, bacon, potatoes (the stove), toast and fruit (the prep table), tea (the long table)” [event×6]; “Breakfast! (the long table)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×6.
5. **Classification.** Timing / skill input (timing bar (repair) ×6). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Cooking system again; a happy beat.
7. **Proposed primary mechanic.** Cooking mini-game (relaxed difficulty): no hazards, just a satisfying parallel-pans sequence; rewards a morale buff.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Parallel pans, mild.
10. **Failure conditions and consequences.** Burnt toast (cosmetic).
11. **Dependencies.** Entry: p12c13 (p12c13.wardrobe -> p12c14.begin). Start flag: `p12_ch125_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 9 (room galley, trigger, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle). In-room hooks into this chapter: map objects in galley ×7; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** Jim's hope is the point; keep it gentle. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p12c15` · Chapter 126: One Day Is Apparently Unbearable

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p12c15`, Chapter 126: One Day Is Apparently Unbearable. Scripts: 7 in `data/story/cutscenes/phase12/ch119_126.json`. Quests: `pull_my_finger` “One Day Is Apparently Unbearable” in `data/quests/phase12.json`.
2. **Events and dialogue.** Two hours later Garrick asks crew to pull his finger; follow him round and stop him asking five people. Dialogue: 42 lines (garrick 14, (narration) 12, captain 5, pete 3, bob 2, gristle 2, jim 2, rusty_tom 1, +1 more); 0 choice prompt(s) with 0 options. Presentation: tvProgram ×5, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, bob, gristle, jim, rusty_tom, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 9 (`p12_ch126_started`, `p12_fg_pete`, `p12_fg_bob`, `p12_fg_gristle`, `p12_fg_jim`, `p12_fg_tom`, `finger_crisis_seen`, `bbk_daytime_seen`, `p12_complete`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Stop Garrick asking (follow him round: Pete, Bob, Gristle, Jim, Rusty Tom)” [event×5]. Mechanics invoked by the scripts: TV knobs ×2.
5. **Classification.** Choice or puzzle prompt (TV knobs ×2). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** An interception chase.
7. **Proposed primary mechanic.** Interception: Garrick moves crew to crew; reach each before he does (path blocking) or talk them out of it.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Garrick's speed, crowded galley.
10. **Failure conditions and consequences.** Someone pulls → a small fume burst and suspension broken (dialogue variant), not a game over.
11. **Dependencies.** Entry: p12c14 (p12c14.eat -> p12c15.begin). Start flag: `p12_ch126_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 8 (room galley, npc garrick, room main_deck, trigger). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'It's not a RELEASE, Pete, it's a GESTURE...' stays.
