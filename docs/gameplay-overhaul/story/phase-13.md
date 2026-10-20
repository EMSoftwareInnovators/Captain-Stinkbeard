# Story inventory, Phase 13: The Ancient Stenchmaster Delirium

Chapters: 19 (p13c1 to p13c19). Dialogue lines: 467. Classification: Timing / skill input 9, Walk + press A 6, Choice or puzzle prompt 3, Dialogue / cutscene only 1.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE13.md`, `data/quests/phase13.json`, `data/story/cutscenes/phase13/`, `data/story/flags/phase13.json`, `tests/phase13_story.test.js`, `tests/phase13Play.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p13c1` · Chapter 127: The Finger-Pulling Breakdown

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p13c1`, Chapter 127: The Finger-Pulling Breakdown. Scripts: 7 in `data/story/cutscenes/phase13/ch127_133.json`. Quests: `finger_breakdown` “The Finger-Pulling Breakdown” in `data/quests/phase13.json`.
2. **Events and dialogue.** Nineteen hours left; Garrick, rocking, argues five loopholes (is a tootlet a release?). Dialogue: 27 lines (garrick 13, captain 5, (narration) 4, pete 2, jim 1, gristle 1, bob 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, jim, gristle, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 7 (`p13_started`, `p13_lh_1`, `p13_lh_2`, `p13_lh_3`, `p13_lh_4`, `p13_lh_5`, `loopholes_refused`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Hear his loopholes (him)” [event×5]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A debate.
7. **Proposed primary mechanic.** Keep; optional rebuttal choices draw on p12c8's fine print (show the clause).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: story trigger p13_loopholes: {all:[{objectiveDone:finger_breakdown.loopholes},{notFlag:loopholes_refused}]}. Start flag: `p13_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room cargo_hold, room crew_quarters, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'A tootlet.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p13c2` · Chapter 128: Don't Throw My Sash in the Trash

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p13c2`, Chapter 128: Don't Throw My Sash in the Trash. Scripts: 3 in `data/story/cutscenes/phase13/ch127_133.json`. Quests: `sash_in_the_trash` “Don't Throw My Sash in the Trash” in `data/quests/phase13.json`.
2. **Events and dialogue.** The sash has contaminated the wardrobe (coats changed colour); get rid of it; watch 'Don't Throw My Sash in the Trash' on the Mark II. Dialogue: 15 lines ((narration) 7, captain 2, pete 2, bob 2, gristle 1, jim 1); 0 choice prompt(s) with 0 options. Presentation: tvProgram ×5, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, bob, gristle, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `captains_quarters`, `galley`. Interactables: `p13_wardrobe` (captains_quarters 3,4), `p13_trash_watch` (galley 16,7). Flags set: 3 (`p13_ch128_started`, `p13_wardrobe_opened`, `sash_trash_song_seen`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Get rid of the sash (your wardrobe, in your cabin)” [flag]; “See what's on (the Mark II, in the galley)” [flag]. Mechanics invoked by the scripts: TV knobs ×1.
5. **Classification.** Choice or puzzle prompt (TV knobs ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Contamination spreading into owned items is a Beard Saturation / equipment-condition idea.
7. **Proposed primary mechanic.** Contaminated equipment: wardrobe items (coats) gain a 'tainted' condition that affects crew reactions; washing/airing them is a small upkeep loop.
8. **Secondary mechanics.** TV segment kept.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p13c1 (p13c1.done -> p13c2.begin). Start flag: `p13_ch128_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in captains_quarters ×1, galley ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'like a dog that's been waiting by the door' stays.

### `p13c3` · Chapter 129: The Sleeping Quarters Are Alive

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p13c3`, Chapter 129: The Sleeping Quarters Are Alive. Scripts: 7 in `data/story/cutscenes/phase13/ch127_133.json`. Quests: `quarters_alive` “The Sleeping Quarters Are Alive” in `data/quests/phase13.json`.
2. **Events and dialogue.** Gristle proposes reclaiming the old crew quarters while Garrick is suspended; unboard the door; go in; take the pillow that roars; throw it into the storm; it comes back – throw it again. Dialogue: 33 lines ((narration) 19, gristle 6, captain 3, pete 2, bob 2, squawks 1); 0 choice prompt(s) with 0 options. Presentation: giveItem ×3, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: gristle, pete, bob, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`, `galley`, `main_deck`. Interactables: `p13_unboard` (galley 8,12), `p13_pillow` (crew_quarters 16,6), `p13_throw_1` (main_deck 3,32), `p13_pickup` (main_deck 5,32), `p13_throw_2` (main_deck 3,32). Flags set: 7 (`p13_ch129_started`, `crew_quarters_reopened`, `growling_bedding_found`, `kitten_pillow_taken`, `pillow_thrown_once`, `pillow_picked_up`, `pillow_returned_with_tag`); items given: kitten_roar_pillow.
4. **Current player actions and mechanics.** Objectives: “Open up the old quarters (the boarded door, at the bottom of the galley)” [flag]; “Go in (the old quarters)” [flag]; “Take the pillow that roars (the cot by the starboard wall)” [flag]; “Throw it into the Great Sharkstorm (up the ladder, any deck rail)” [flag]; “Pick it up and throw it AGAIN (the deck, then any rail)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Reclaiming a lost room is central to the ship redesign (this is where crew quarters come back).
7. **Proposed primary mechanic.** Room reclamation: the condemned quarters are a fume-filled area with 'living' bedding (animated pillow that fights back: a mini-enemy that must be carried and thrown).
8. **Secondary mechanics.** Exposure inside the quarters (Atmosphere).
9. **Enemies, puzzles, timers, hazards, resources.** Roaring pillow (enemy-like), fumes, the throw needing the right rail and wind.
10. **Failure conditions and consequences.** Pillow escapes back below → chase it; exposure → hauled out.
11. **Dependencies.** Entry: p13c2 (p13c2.watch -> p13c3.begin). Start flag: `p13_ch129_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in main_deck ×3, galley ×1, crew_quarters ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** The pillow coming back is the joke; making it a creature you fight preserves it.

### `p13c4` · Chapter 130: Condemn the Bedding

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p13c4`, Chapter 130: Condemn the Bedding. Scripts: 11 in `data/story/cutscenes/phase13/ch127_133.json`. Quests: `condemn_bedding` “Condemn the Bedding” in `data/quests/phase13.json`.
2. **Events and dialogue.** Condemn the bedding: judge six kinds (sheets stiff as a board, a whimpering blanket), pile it, take it on deck and over the side, lock the rest in the linen locker, nail it shut. Dialogue: 32 lines ((narration) 23, gristle 4, pete 3, captain 1, garrick 1); 0 choice prompt(s) with 0 options. Presentation: insert ×2, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: gristle, pete, garrick. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`. Interactables: `p13_judge_sheets` (crew_quarters 16,9), `p13_judge_blankets` (crew_quarters 16,6), `p13_judge_pillows` (crew_quarters 5,10), `p13_judge_pillowcases` (crew_quarters 4,8), `p13_judge_mattress` (crew_quarters 5,6), `p13_judge_hammock` (crew_quarters 1,11), `p13_judge_hammock_a` (crew_quarters 1,5), `p13_judge_hammock_b` (crew_quarters 1,8), `p13_pile` (crew_quarters 11,8), `p13_locker_stuff` (crew_quarters 11,3), +1 more. Flags set: 11 (`p13_ch130_started`, `p13_judged_sheets`, `p13_judged_blankets`, `p13_judged_pillows`, `p13_judged_pillowcases`, `p13_judged_mattress`, `p13_judged_hammock`, `bedding_piled`, `bedding_returned_by_storm`, `textiles_in_locker`, +1 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Judge the bedding (six kinds): the cots, the hammocks, and the footlocker with a pillowcase sticking out” [event×6]; “Get the pile up on deck and over the side (the pile)” [flag]; “Lock it in the linen locker (the north wall)” [flag]; “Nail it shut (the linen locker)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×2.
5. **Classification.** Timing / skill input (timing bar (repair) ×2). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A sorting + disposal job.
7. **Proposed primary mechanic.** Sort-and-dispose: classify items (overboard vs. locker) with consequences (some bedding the storm 'won't take' must be locked); carrying the pile is a heavy carry under exposure.
8. **Secondary mechanics.** Nail the locker (timing bar).
9. **Enemies, puzzles, timers, hazards, resources.** Bedding that moves, carry weight.
10. **Failure conditions and consequences.** Wrong pile → items come back (repeat).
11. **Dependencies.** Entry: p13c3 (p13c3.throw_2 -> p13c4.begin). Start flag: `p13_ch130_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 9 (room crew_quarters, trigger). In-room hooks into this chapter: map objects in crew_quarters ×11; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'It whimpers when you fold it.' stays.

### `p13c5` · Chapter 131: Grand Stenchmaster Bedding

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p13c5`, Chapter 131: Grand Stenchmaster Bedding. Scripts: 7 in `data/story/cutscenes/phase13/ch127_133.json`. Quests: `grand_bedding` “Grand Stenchmaster Bedding” in `data/quests/phase13.json`.
2. **Events and dialogue.** The quarters are empty; no clean cloth on the ship; make sash bedding for hammocks, cots, pillows, blankets, corners (five timing bars). Dialogue: 20 lines ((narration) 11, garrick 4, captain 2, jim 1, pete 1, squawks 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, jim, pete, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`. Interactables: `p13_bed_hammocks` (crew_quarters 1,11), `p13_bed_pads` (crew_quarters 16,9), `p13_bed_pillows` (crew_quarters 5,10), `p13_bed_blankets` (crew_quarters 5,6), `p13_bed_corners` (crew_quarters 1,8). Flags set: 8 (`p13_ch131_started`, `p13_bedding_hammocks`, `p13_bedding_pads`, `p13_bedding_pillows`, `p13_bedding_blankets`, `p13_bedding_corners`, `sash_bedding_built`, `garrick_adopted_catchphrase`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Make sash bedding: the hammocks, the cot pads, the pillows, the blankets, the corners (round the quarters)” [event×5]. Mechanics invoked by the scripts: timing bar (repair) ×5.
5. **Classification.** Timing / skill input (timing bar (repair) ×5). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The crew quarters get rebuilt; perfect hook for the permanent crew-quarters design.
7. **Proposed primary mechanic.** Quarters rebuild (build mode): place bunks/hammocks with sash material; this layout becomes the permanent crew quarters for the rest of the game (fixes the 'stranded in the hold' problem at the story's own moment).
8. **Secondary mechanics.** Assign bunks to named crew (residency for the crew schedule system).
9. **Enemies, puzzles, timers, hazards, resources.** Material count, space.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p13c4 (p13c4.nail -> p13c5.begin). Start flag: `p13_ch131_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in crew_quarters ×5; NPC dialogue in none.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** Garrick 'perking up, for the first time in hours' at the sashes stays.

### `p13c6` · Chapter 132: The Fan Mega-Pack

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p13c6`, Chapter 132: The Fan Mega-Pack. Scripts: 4 in `data/story/cutscenes/phase13/ch127_133.json`. Quests: `fan_megapack` “The Fan Mega-Pack” in `data/quests/phase13.json`.
2. **Events and dialogue.** The Fan Mega-Pack arrives down the fore hatch; open it; place five cardboard Stenchmasters (six choices). Dialogue: 22 lines ((narration) 13, garrick 4, captain 2, ned 1, pete 1, gristle 1); 6 choice prompt(s) with 16 options. Presentation: insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, ned, pete, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`. Interactables: `p13_megapack_open` (crew_quarters 12,8), `p13_megapack_place` (crew_quarters 12,8). Flags set: 10 (`p13_ch132_started`, `megapack_opened`, `merch_aboard`, `standee_stenchalina_placed`, `standee_brogath_placed`, `standee_rumpold_placed`, `standee_rumpus_placed`, `standee_gustavio_placed`, `p13_standees_said`, `standees_placed`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Open the Mega-Pack (the box, in the middle of the quarters)” [flag]; “Place the cardboard Stenchmasters (the Mega-Pack)” [event×5]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Decoration placement – these cardboard figures later matter (Brogath cable, hallucinations).
7. **Proposed primary mechanic.** Keep the placement choices; they are already player decisions with consequences (where cardboard Brogath stands).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p13c5 (p13c5.done -> p13c6.begin). Start flag: `p13_ch132_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 10 (room crew_quarters, room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle). In-room hooks into this chapter: map objects in crew_quarters ×2; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** '(actually weeping) A FAN Mega-Pack. I have FANS.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p13c7` · Chapter 133: Build-Your-Own S.E.S.

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p13c7`, Chapter 133: Build-Your-Own S.E.S.. Scripts: 7 in `data/story/cutscenes/phase13/ch127_133.json`. Quests: `build_your_own_ses` “Build-Your-Own S.E.S.” in `data/quests/phase13.json`.
2. **Events and dialogue.** Build-Your-Own S.E.S. kit: find four parts across three rooms (forks, horseshoe, coils, transformer); build it on the barrel table. Dialogue: 26 lines ((narration) 10, garrick 6, captain 4, pete 2, jim 2, sully 2); 0 choice prompt(s) with 0 options. Presentation: giveItem ×4, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, jim, sully. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `cargo_hold`, `crew_quarters`, `galley`. Interactables: `p13_horseshoe` (cargo_hold 13,3), `p13_coils` (cargo_hold 15,13), `p13_forks` (galley 5,4), `p13_transformer` (galley 16,7), `p13_kit_build` (crew_quarters 10,6). Flags set: 7 (`p13_ch133_started`, `ses_part_forks`, `ses_part_horseshoe`, `ses_part_coils`, `ses_part_transformer`, `p13_parts_said`, `second_ses_built`); items given: ses_parts.
4. **Current player actions and mechanics.** Objectives: “Find the parts: forks (galley), horseshoe (hold stairs), coils (hold salvage crate), transformer (under the Mark II)” [event×4]; “Build it (the barrel table, in the quarters)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1, TV knobs ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1, TV knobs ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Fetch quest across rooms.
7. **Proposed primary mechanic.** Scavenger hunt with light routing (the parts are guarded by small hazards: the hold salvage crate is in the red fume, the horseshoe on the hold stairs is slippery).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Small hazards.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p13c6 (p13c6.placed -> p13c7.begin). Start flag: `p13_ch133_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room crew_quarters, room galley, room cargo_hold, trigger). In-room hooks into this chapter: map objects in galley ×2, cargo_hold ×2, crew_quarters ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'ignoring the first line (it says READ ALL INSTRUCTIONS FIRST)' stays.

### `p13c8` · Chapter 134: Wire the Two Systems Together

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p13c8`, Chapter 134: Wire the Two Systems Together. Scripts: 6 in `data/story/cutscenes/phase13/ch134_139.json`. Quests: `wire_the_systems` “Wire the Two Systems Together” in `data/quests/phase13.json`.
2. **Events and dialogue.** Wire the two TVs together the long way: tie off at cardboard Brogath, clear a path on deck, three turns round the starboard cannon, tape it down in the galley, connect. Dialogue: 22 lines ((narration) 11, garrick 5, captain 3, pete 1, gristle 1, jim 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, gristle, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`, `galley`, `main_deck`. Interactables: `p13_cable_brogath_port` (crew_quarters 1,4), `p13_cable_brogath_starboard` (crew_quarters 14,4), `p13_deck_path` (main_deck 11,31), `p13_cannon` (main_deck 14,22), `p13_tape` (galley 14,5), `p13_connect` (galley 16,7). Flags set: 8 (`p13_ch134_started`, `cable_seg_1`, `cable_seg_2`, `cable_seg_3`, `cable_seg_4`, `cable_seg_5`, `tv_cable_routed`, `tv_systems_connected`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Tie the cable off at cardboard Brogath (wherever you put him)” [flag]; “Clear a path for it on deck (the crates by the fore hatch)” [flag]; “Three turns round the starboard cannon” [flag]; “Tack it down across the galley floor (by the ladder)” [flag]; “Connect it to the Mark II” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×5, TV knobs ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×5, TV knobs ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A cable-routing path puzzle across three rooms.
7. **Proposed primary mechanic.** Cable routing: lay a cable of limited length through a route of required anchors; crossings and crew paths must be avoided (a trip hazard later).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Cable length, required anchors.
10. **Failure conditions and consequences.** Too short → re-route.
11. **Dependencies.** Entry: p13c7 (p13c7.build -> p13c8.begin). Start flag: `p13_ch134_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (dialogue p13, room crew_quarters, room main_deck, room galley). In-room hooks into this chapter: map objects in crew_quarters ×2, main_deck ×2, galley ×2; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'Ten feet is no good, Captain. The signal needs to go UP.' stays.

### `p13c9` · Chapter 135: The Stenchmaster Channel

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p13c9`, Chapter 135: The Stenchmaster Channel. Scripts: 2 in `data/story/cutscenes/phase13/ch134_139.json`. Quests: `stenchmaster_channel` “The Stenchmaster Channel” in `data/quests/phase13.json`.
2. **Events and dialogue.** The Stenchmaster Channel (six TV segments). Dialogue: 15 lines ((narration) 4, garrick 4, pete 2, bob 1, jim 1, ned 1, gristle 1, captain 1); 0 choice prompt(s) with 0 options. Presentation: tvProgram ×6, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, bob, jim, ned, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`. Interactables: `p13_channel_watch` (crew_quarters 10,6). Flags set: 3 (`p13_ch135_started`, `stenchmaster_channel_unlocked`, `stenchalina_programme_seen`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Watch it (the bedroom set)” [flag]. Mechanics invoked by the scripts: TV power ×6, TV knobs ×1.
5. **Classification.** Choice or puzzle prompt (TV knobs ×1). Presentation-only effects with no player input: TV power ×6. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** TV.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p13c8 (p13c8.connect -> p13c9.begin). Start flag: `p13_ch135_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete, npc rusty_tom). In-room hooks into this chapter: map objects in crew_quarters ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'The castle's made of ONIONS?' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p13c10` · Chapter 136: Stench-O-Vision

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p13c10`, Chapter 136: Stench-O-Vision. Scripts: 2 in `data/story/cutscenes/phase13/ch134_139.json`. Quests: `stench_o_vision` “Stench-O-Vision” in `data/quests/phase13.json`.
2. **Events and dialogue.** Stench-O-Vision: a grille on the set releases the programme's smell; turn it off. Dialogue: 14 lines ((narration) 8, garrick 2, pete 1, jim 1, squawks 1, captain 1); 0 choice prompt(s) with 0 options. Presentation: insert ×2.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, jim, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`. Interactables: `p13_vent_knobs` (crew_quarters 10,6). Flags set: 3 (`p13_ch136_started`, `stench_o_vision_on`, `p13_smell_tokens_down`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Turn off the Stench-O-Vision (the bedroom set's knobs)” [flag]. Mechanics invoked by the scripts: TV power ×1.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: TV power ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A smell-emitting TV is an Atmosphere hazard.
7. **Proposed primary mechanic.** Keep; the Stench-O-Vision vents a small fume zone that grows until the knobs are set (reuse TV puzzle).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Growing fume.
10. **Failure conditions and consequences.** Exposure → cough; no hard fail.
11. **Dependencies.** Entry: p13c9 (p13c9.watch -> p13c10.begin). Start flag: `p13_ch136_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (dialogue p13, room crew_quarters). In-room hooks into this chapter: map objects in crew_quarters ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** '(breathing it in) IMMERSIVE.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p13c11` · Chapter 137: Poor in Gold, Rich in Gas

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p13c11`, Chapter 137: Poor in Gold, Rich in Gas. Scripts: 2 in `data/story/cutscenes/phase13/ch134_139.json`. Quests: `brogath_special` “Poor in Gold, Rich in Gas” in `data/quests/phase13.json`.
2. **Events and dialogue.** The Brogath Special on both sets: the treasure dig in three minutes of TV. Dialogue: 11 lines (captain 3, (narration) 2, garrick 2, pete 1, bob 1, ned 1, gristle 1); 0 choice prompt(s) with 0 options. Presentation: tvProgram ×6, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, bob, ned, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`. Interactables: `p13_special_watch` (crew_quarters 10,6). Flags set: 2 (`p13_ch137_started`, `brogath_programme_seen`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Watch it (the bedroom set)” [flag]. Mechanics invoked by the scripts: TV power ×6, TV knobs ×1.
5. **Classification.** Choice or puzzle prompt (TV knobs ×1). Presentation-only effects with no player input: TV power ×6. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** TV.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p13c10 (p13c10.knobs -> p13c11.begin). Start flag: `p13_ch137_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 0 (none). In-room hooks into this chapter: map objects in crew_quarters ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Three minutes of digging.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p13c12` · Chapter 138: Captain Stinkbeard Finally Reaches His Limit

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p13c12`, Chapter 138: Captain Stinkbeard Finally Reaches His Limit. Scripts: 7 in `data/story/cutscenes/phase13/ch134_139.json`. Quests: `the_limit` “The Limit” in `data/quests/phase13.json`.
2. **Events and dialogue.** The captain reaches his limit and rants at five things in the red room. Dialogue: 27 lines (captain 14, (narration) 9, pete 3, squawks 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: pete, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`. Interactables: `p13_rant_stenchalina_cots` (crew_quarters 14,9), `p13_rant_stenchalina_hammocks` (crew_quarters 2,9), `p13_rant_brogath_port` (crew_quarters 1,4), `p13_rant_brogath_starboard` (crew_quarters 14,4), `p13_rant_rumpold_hatch` (crew_quarters 12,5), `p13_rant_rumpold_port` (crew_quarters 2,6), `p13_rant_rumpus_table` (crew_quarters 13,10), `p13_rant_rumpus_door` (crew_quarters 9,4), `p13_rant_gustavio_hammocks` (crew_quarters 6,9), `p13_rant_gustavio_cots` (crew_quarters 15,8), +4 more. Flags set: 7 (`p13_ch138_started`, `p13_rant_standees`, `p13_rant_bedding`, `p13_rant_tv`, `p13_rant_locker`, `p13_rant_megapack`, `p13_rant_said`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Say it, at everything: the cardboard Stenchmasters, the sash bedding, the bedroom set, the locker, the Mega-Pack” [event×5]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A cathartic rant.
7. **Proposed primary mechanic.** Keep; the rant targets are the player's choice (existing inspects).
8. **Secondary mechanics.** Beard Saturation spikes with each rant (sets up p13c13).
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p13c11 (p13c11.watch -> p13c12.begin). Start flag: `p13_ch138_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room crew_quarters, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in crew_quarters ×14; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Nobody says anything. Nobody moves.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p13c13` · Chapter 139: The Beard Betrays Him

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p13c13`, Chapter 139: The Beard Betrays Him. Scripts: 1 in `data/story/cutscenes/phase13/ch134_139.json`. Quests: none (no quest; pure cutscene chapter).
2. **Events and dialogue.** The beard betrays him: the wrap is off, the captain breathes in a month of stored fumes; vision doubles. Dialogue: 18 lines ((narration) 8, pete 5, captain 4, garrick 1); 0 choice prompt(s) with 0 options. Presentation: shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, garrick. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 2 (`p13_ch139_started`, `stinkbeard_delirium`); items given: none.
4. **Current player actions and mechanics.** Objectives: no objectives: the player watches and advances dialogue. Mechanics invoked by the scripts: none.
5. **Classification.** Dialogue / cutscene only. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The Beard Saturation system's first major consequence (a hallucination status).
7. **Proposed primary mechanic.** Trigger the 'Saturated' status (screen tint, doubled sprites, controls slightly delayed) that persists through p13c19; this is the Beard Saturation payoff.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Status effects.
10. **Failure conditions and consequences.** None (scripted).
11. **Dependencies.** Entry: p13c12 (p13c12.done -> p13c13.begin). Start flag: `p13_ch139_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room crew_quarters, room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle). In-room hooks into this chapter: map objects in none; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P1.
13. **Preserving story and humour; variety.** The purple-edged room and 'two of themselves' stay; making it a status makes the next six chapters play differently.

### `p13c14` · Chapter 140: Every Ancient Stenchmaster Is Here

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p13c14`, Chapter 140: Every Ancient Stenchmaster Is Here. Scripts: 8 in `data/story/cutscenes/phase13/ch140_145.json`. Quests: `ancient_stenchmasters` “Every Ancient Stenchmaster Is Here” in `data/quests/phase13.json`.
2. **Events and dialogue.** The captain sees the crew as Ancient Stenchmasters; six crew-as-legend interactions (Brogath = Pete, Rumpold = Gristle, Sir Rumpus = Bob, Gustavio = Jim, Stenchalina = Squawks, the Prime = Garrick). Dialogue: 34 lines (captain 13, (narration) 10, pete 3, bob 3, squawks 2, gristle 1, jim 1, garrick 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: pete, bob, squawks, gristle, jim, garrick. NPCs with dialogue keyed to an objective (hints, reactions or completions): pete, gristle, bob, jim, squawks, garrick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 8 (`p13_ch140_started`, `p13_met_pete`, `p13_met_gristle`, `p13_met_bob`, `p13_met_jim`, `p13_met_squawks`, `p13_met_garrick`, `p13_met_said`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Prevent Brogath from becoming bashful (talk to Pete)” [flag]; “Stop Rumpold meeting wind with wind (talk to Gristle)” [flag]; “Halt Sir Rumpus's legal validation (talk to Bob)” [flag]; “Console Lord Gustavio (talk to Jim)” [flag]; “Calm the Princess (talk to Squawks)” [flag]; “Assess the Prime (talk to Garrick)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Hallucination gameplay: the captain's perception is unreliable.
7. **Proposed primary mechanic.** Hallucination rounds: each crew member is shown as their legend (sprite swap); the player must 'prevent' each legend's signature act by reading the legend lore (codex pages from earlier) – the right action per legend.
8. **Secondary mechanics.** Crew react to the captain's behaviour (morale cost for wrong actions).
9. **Enemies, puzzles, timers, hazards, resources.** Picking the correct counter-action per legend.
10. **Failure conditions and consequences.** Wrong action → crew confusion (morale) and the legend 'escalates' (more jokes).
11. **Dependencies.** Entry: p13c13 (p13c13.begin -> p13c14.begin). Start flag: `p13_ch140_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (npc pete, npc gristle, npc bob, npc jim, npc squawks, npc garrick, trigger). In-room hooks into this chapter: map objects in none; NPC dialogue in bob, garrick, gristle, jim, pete, squawks.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'Did Brogath have a peg leg?' stays; gameplay rewards knowing the stupid legends.

### `p13c15` · Chapter 141: Disarm the Ancient Stenchmasters

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p13c15`, Chapter 141: Disarm the Ancient Stenchmasters. Scripts: 9 in `data/story/cutscenes/phase13/ch140_145.json`. Quests: `disarm_stenchmasters` “DISARM THE ANCIENT STENCHMASTERS” in `data/quests/phase13.json`.
2. **Events and dialogue.** Disarm the Ancient Stenchmasters: remove beans, seal the grog, hide the sauce, stop raised fingers, stabilise sash fabric, keep the Prime still, nobody rear-first to the weather. Dialogue: 32 lines (captain 13, (narration) 11, bob 2, garrick 2, gristle 2, jim 1, pete 1); 0 choice prompt(s) with 0 options. Presentation: shake ×1, transition ×1, spawn ×1.
3. **Characters, locations, props, flags.** Speaking characters: bob, garrick, gristle, jim, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, garrick, gristle. Rooms: `crew_quarters`, `main_deck`. Interactables: `p13_dis_beans` (crew_quarters 9,5), `p13_dis_grog` (crew_quarters 16,12), `p13_dis_sauce` (crew_quarters 5,3), `p13_dis_fabric` (crew_quarters 5,6). Flags set: 9 (`p13_ch141_started`, `p13_dis_beans`, `p13_dis_grog`, `p13_dis_sauce`, `p13_dis_fingers`, `p13_dis_fabric`, `p13_dis_still`, `p13_dis_rear`, `p13_disarm_said`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Remove the beans (the sack by the door)” [flag]; “Seal the Frog Grog (the cask)” [flag]; “Hide the Spicy Stench Sauce (the shelf)” [flag]; “Stop the raised fingers (talk to Bob)” [flag]; “Stabilise the sash fabric (a sash hammock)” [flag]; “Keep the Prime still (talk to Garrick)” [flag]; “Nobody rear-first to the weather (talk to Gristle)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×2.
5. **Classification.** Timing / skill input (timing bar (repair) ×2). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A frantic 'defuse everything' round.
7. **Proposed primary mechanic.** Defuse round on a timer (the Saturated captain believes an apocalypse is imminent): seven tasks with the crew resisting (they think he's mad).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Timer, crew who move items back.
10. **Failure conditions and consequences.** Timer runs out → the 'apocalypse' is a mundane event (joke) but morale drops.
11. **Dependencies.** Entry: p13c14 (p13c14.done -> p13c15.begin). Start flag: `p13_ch141_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room crew_quarters, dialogue p13, trigger). In-room hooks into this chapter: map objects in crew_quarters ×4; NPC dialogue in bob, garrick, gristle.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'Lord Gustavio does NOT get beans.' stays.

### `p13c16` · Chapter 142: Ancient Stenchmaster Apocalypse

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p13c16`, Chapter 142: Ancient Stenchmaster Apocalypse. Scripts: 7 in `data/story/cutscenes/phase13/ch140_145.json`. Quests: `stenchmaster_apocalypse` “Ancient Stenchmaster Apocalypse” in `data/quests/phase13.json`.
2. **Events and dialogue.** On deck the captain gives absurd orders ('Trim the mainsail! DO NOT FART AT IT') – five stations. Dialogue: 22 lines (captain 10, (narration) 5, pete 2, gristle 2, bob 1, jim 1, garrick 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: pete, gristle, bob, jim, garrick. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `main_deck`. Interactables: `p13_ord_sail` (main_deck 9,19), `p13_ord_hull` (main_deck 16,26), `p13_ord_cannons` (main_deck 4,22), `p13_ord_helm` (main_deck 9,6), `p13_ord_beans` (main_deck 11,25). Flags set: 7 (`p13_ch142_started`, `p13_ord_sail`, `p13_ord_hull`, `p13_ord_cannons`, `p13_ord_helm`, `p13_ord_beans`, `p13_orders_said`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Trim the mainsail: DO NOT FART AT IT (the mainmast sheets)” [flag]; “Check the hull: KEEP FINGER DOWN (the starboard rail)” [flag]; “Secure the cannons: NO SASH FLUTTER (the port cannon)” [flag]; “Five degrees to port: REPORT STOMACH NOISES (the helm)” [flag]; “Clear the deck: ESPECIALLY BEANS (by the main hatch)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×5.
5. **Classification.** Timing / skill input (timing bar (repair) ×5). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Five deck stations; the crew-stations system can be exercised.
7. **Proposed primary mechanic.** Command round: assign crew to five stations under the Saturated status (the captain may mis-identify who's who); correct assignments keep the ship steady.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Mis-identification, gusts.
10. **Failure conditions and consequences.** Wrong assignments → Ship Integrity knocks (minor).
11. **Dependencies.** Entry: p13c15 (p13c15.done -> p13c16.begin). Start flag: `p13_ch142_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room crew_quarters, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim). In-room hooks into this chapter: map objects in main_deck ×5; NPC dialogue in none.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** Every order with its absurd addendum stays word for word.

### `p13c17` · Chapter 143: Two Brogaths

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p13c17`, Chapter 143: Two Brogaths. Scripts: 4 in `data/story/cutscenes/phase13/ch140_145.json`. Quests: `two_brogaths` “Two Brogaths” in `data/quests/phase13.json`.
2. **Events and dialogue.** Pete brings cardboard Brogath up to prove which is which: Two Brogaths. Dialogue: 25 lines (pete 10, (narration) 7, captain 7, squawks 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: pete, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): pete. Rooms: `main_deck`. Interactables: `p13_look_cardboard` (main_deck 12,6). Flags set: 6 (`p13_ch143_started`, `cardboard_brogath_on_deck`, `p13_looked_cardboard`, `p13_looked_pete`, `p13_brogath_logic_said`, `pete_touched_helm`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Look at them both (cardboard Brogath, and Pete)” [event×2]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A sanity check.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p13c16 (p13c16.done -> p13c17.begin). Start flag: `p13_ch143_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room main_deck, dialogue p13, npc pete, trigger). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in pete.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'THIS is Brogath. He's cardboard.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p13c18` · Chapter 144: Brogath in the Treasure Room

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p13c18`, Chapter 144: Brogath in the Treasure Room. Scripts: 3 in `data/story/cutscenes/phase13/ch140_145.json`. Quests: `treasure_room_brogath` “Brogath in the Treasure Room” in `data/quests/phase13.json`.
2. **Events and dialogue.** A growl from the treasure room: the captain believes there's another Brogath; go below; Pete talks. Dialogue: 32 lines ((narration) 16, captain 8, pete 7, gristle 1); 0 choice prompt(s) with 0 options. Presentation: shake ×2, transition ×1, spawn ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): pete. Rooms: `cargo_hold`, `main_deck`. Interactables: `p13_treasure_door` (cargo_hold 4,3). Flags set: 4 (`p13_ch144_started`, `p13_crew_chase`, `p13_door_tried`, `treasure_room_brogath_believed`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Get to the treasure room (below: the galley, then the hold)” [flag]; “Hear what Brogath... what Pete has to say (Pete)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A dash to a room; foreshadows the real Brogath (Phase 14).
7. **Proposed primary mechanic.** Keep with a short run below through the galley and hold (Saturated controls).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Controls delay.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p13c17 (p13c17.logic -> p13c18.begin). Start flag: `p13_ch144_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (room cargo_hold, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle). In-room hooks into this chapter: map objects in cargo_hold ×1; NPC dialogue in pete.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'He's going to blast the rest of my treasure into the STORM.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p13c19` · Chapter 145: The Brogath Command Crisis

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p13c19`, Chapter 145: The Brogath Command Crisis. Scripts: 5 in `data/story/cutscenes/phase13/ch140_145.json`. Quests: `command_crisis` “The Brogath Command Crisis” in `data/quests/phase13.json`.
2. **Events and dialogue.** The Brogath Command Crisis: the captain challenges 'Brogath' (Pete) for command – hold the helm steady through three gusts (course dial ×8). Dialogue: 40 lines (captain 14, (narration) 12, pete 6, garrick 4, squawks 2, jim 1, bob 1); 0 choice prompt(s) with 0 options. Presentation: insert ×4, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, garrick, squawks, jim, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `main_deck`. Interactables: `p13_helm_1` (main_deck 9,6), `p13_helm_2` (main_deck 9,6), `p13_helm_3` (main_deck 9,6). Flags set: 7 (`p13_ch145_started`, `p13_helm_1`, `p13_helm_2`, `p13_helm_3`, `p13_end_said`, `brogath_command_crisis`, `p13_complete`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Keep Brogath away from the helm: hold her steady through three gusts (the helm)” [event×3]. Mechanics invoked by the scripts: course dial ×8, timing bar (repair) ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Presentation-only effects with no player input: course dial ×8. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Course dial skill check under status effects.
7. **Proposed primary mechanic.** Helm duel: three gust rounds on the course dial while Saturated (wobbling reticle); success clears the status.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Gusts + status.
10. **Failure conditions and consequences.** Drift → retry the round; Ship Integrity scrape.
11. **Dependencies.** Entry: p13c18 (p13c18.pete -> p13c19.begin). Start flag: `p13_ch145_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 6 (room cargo_hold, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle). In-room hooks into this chapter: map objects in main_deck ×3; NPC dialogue in none.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'Steering's literally already your job... I just LEANED.' stays.
