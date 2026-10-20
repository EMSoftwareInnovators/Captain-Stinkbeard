# Story inventory, Phase 8: The Lost Fart and the Grand Nap

Chapters: 13 (p8c1 to p8c13). Dialogue lines: 876. Classification: Walk + press A 7, Dialogue / cutscene only 4, Timing / skill input 2.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE8.md`, `data/quests/phase8.json`, `data/story/cutscenes/phase8/`, `data/story/flags/phase8.json`, `tests/phase8_story.test.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p8c1` · Chapter 42: Trapped Below Deck with Franklin

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p8c1`, Chapter 42: Trapped Below Deck with Franklin. Scripts: 7 in `data/story/cutscenes/phase8/ch42_44.json`. Quests: `still_trapped` “Still Trapped” in `data/quests/phase8.json`.
2. **Events and dialogue.** The crew are trapped in the hold, which is now bunker, TV lounge, dining room, parrot ward and quarters at once; see how Pete, Bob, Gristle and Jim are managing; sit in your corner with Squawks. Dialogue: 79 lines ((narration) 29, captain 12, pete 9, gristle 8, bob 7, squawks 4, hale 3, jim 3, +3 more); 0 choice prompt(s) with 0 options. Presentation: tvProgram ×5, shake ×4, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, gristle, bob, squawks, hale, jim, garrick, mags, rook. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, jim, gristle, pete, hale, nell, wick, rook. Rooms: `cargo_hold`. Interactables: `p8_corner_sit` (cargo_hold 16,16). Flags set: 6 (`p8_started`, `p8_settled_pete`, `p8_settled_bob`, `p8_settled_gristle`, `p8_settled_jim`, `p8_ftm_started`); items given: none.
4. **Current player actions and mechanics.** Objectives: “See how everyone's managing (Pete, Bob, Gristle and Salty Jim)” [event×4]; “Sit down in your corner, with Squawks (the crate, bottom right)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The line 'It was designed for none of them' is an explicit statement of the ship-clutter problem. This is the chapter to introduce the hold as a managed space.
7. **Proposed primary mechanic.** Bunker management (light): assign areas of the hold (sleeping, food, sick bay, TV) on a simple grid; crew mood reacts to the layout.
8. **Secondary mechanics.** Crew check-ins feed the Crew conditions system (tired, hungry, scared).
9. **Enemies, puzzles, timers, hazards, resources.** Limited space; the storm 'walking about' overhead causes occasional leaks to plug.
10. **Failure conditions and consequences.** Poor layout → morale penalties carried through Phase 8 (more grumbling, slower help).
11. **Dependencies.** Entry: p8.start -> p8c1.begin. Start flag: `p8_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room cargo_hold, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim). In-room hooks into this chapter: map objects in cargo_hold ×1; NPC dialogue in bob, gristle, jim, pete.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** The list of what the hold has become is funnier if the player had to arrange it themselves.

### `p8c2` · Chapter 43: Does the Grand Stenchmaster Need to Blow?

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p8c2`, Chapter 43: Does the Grand Stenchmaster Need to Blow?. Scripts: 4 in `data/story/cutscenes/phase8/ch42_44.json`. Quests: `false_alarm` “False Alarm” in `data/quests/phase8.json`.
2. **Events and dialogue.** Somebody has to ask Garrick if he needs to blow; 'I don't know' (much worse than yes); a false alarm: protect Squawks and rush the hatch. Dialogue: 66 lines (garrick 15, captain 15, (narration) 14, gristle 5, bob 4, pete 3, squawks 3, rook 2, +4 more); 1 choice prompt(s) with 5 options. Presentation: shake ×2.
3. **Characters, locations, props, flags.** Speaking characters: garrick, gristle, bob, pete, squawks, rook, jory, hale, wick, nell. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, ned, penhallow, hale, quill, mags, fennimore, brask, nell, wick, rook, sully, finch, jory, squawks, bob, jim, gristle, pete. Rooms: `cargo_hold`. Interactables: `p8_basket_alarm` (cargo_hold 15,16), `p8_to_galley` (cargo_hold 14,3). Flags set: 5 (`p8_ch43_started`, `p8_asked`, `p8_alarm_squawks`, `p8_alarm_hatch`, `garrick_possible_release_survived`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Ask the Grand Stenchmaster the question everyone is thinking (his chair)” [flag]; “Protect Squawks! (your corner)” [flag]; “Get to the hatch! (the stairs up to the galley)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A panic drill; good short timed beat.
7. **Proposed primary mechanic.** False-alarm stampede: protect Squawks then reach the hatch through a crowd surging for the stairs (crowd pathing).
8. **Secondary mechanics.** Choice of how to ask (existing 5 options) kept.
9. **Enemies, puzzles, timers, hazards, resources.** Crowd bottleneck at the stairs.
10. **Failure conditions and consequences.** Trampled → small HP loss; Squawks dropped → he hides (find him).
11. **Dependencies.** Entry: p8c1 (p8c1.watch -> p8c2.begin). Start flag: `p8_ch43_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (npc garrick, npc bob, npc ned, npc jim, npc penhallow, npc gristle, npc pete, npc hale). In-room hooks into this chapter: map objects in cargo_hold ×2; NPC dialogue in garrick, squawks.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'It is a much worse answer than yes.' is the beat; the stampede is the punchline for a false alarm.

### `p8c3` · Chapter 44: Request for Sash Bearers

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p8c3`, Chapter 44: Request for Sash Bearers. Scripts: 21 in `data/story/cutscenes/phase8/ch42_44.json`. Quests: `sash_bearers` “Sash Bearers” in `data/quests/phase8.json`.
2. **Events and dialogue.** Garrick wants sash bearers; ask the crew for volunteers (five refusals); report back. Dialogue: 59 lines (captain 17, garrick 14, (narration) 8, pete 3, ned 2, gristle 1, bob 1, jim 1, +12 more); 1 choice prompt(s) with 5 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, ned, gristle, bob, jim, hale, rook, wick, sully, brask, jory, nell, finch, mags, quill, fennimore, penhallow. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, bob, ned, jim, penhallow, gristle, pete, hale, quill, mags, fennimore, brask, nell, wick, rook, sully, finch, jory. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 20 (`p8_ch44_started`, `p8_sash_proposal`, `fart_sash_nickname`, `p8_refused_gristle`, `p8_refused_pete`, `p8_refused_bob`, `p8_refused_jim`, `p8_refused_ned`, `p8_refused_hale`, `p8_refused_rook`, +10 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “See why the Grand Stenchmaster is looking at his sash like that (his chair)” [flag]; “Ask the crew for volunteers (anyone at all)” [event×5]; “Tell the Grand Stenchmaster how that went (his chair)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Social chapter; the refusals are the jokes.
7. **Proposed primary mechanic.** Keep as dialogue (each refusal is a joke). Optional: track who refused for later crew-relationship flavour.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p8c2 (p8c2.hatch -> p8c3.begin). Start flag: `p8_ch44_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 18 (room cargo_hold, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow, npc gristle). In-room hooks into this chapter: map objects in none; NPC dialogue in bob, brask, fennimore, finch, garrick, gristle, hale, jim, jory, mags, ned, nell, penhallow, pete, quill, rook, sully, wick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** Five distinct refusals stay word for word. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p8c4` · Chapter 45: The Grand Expedition for the Lost Fart

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p8c4`, Chapter 45: The Grand Expedition for the Lost Fart. Scripts: 4 in `data/story/cutscenes/phase8/ch45_47.json`. Quests: `lost_fart_expedition` “The Lost Fart Expedition” in `data/quests/phase8.json`.
2. **Events and dialogue.** Garrick opens the costume trunk, wears a crown, and pitches the Grand Expedition for the Lost Fart; his 'ancient landmarks' are the reserve casks, Mark II and the wet patch by the pump; Squawks is handed to Gristle and back. Dialogue: 47 lines (garrick 21, (narration) 7, pete 6, captain 4, bob 3, rook 2, gristle 2, jim 2); 0 choice prompt(s) with 0 options. Presentation: insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, bob, rook, gristle, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, gristle, pete, hale, nell, wick, rook, sully, finch, jory. Rooms: `cargo_hold`. Interactables: `p8_trunk` (cargo_hold 12,12), `p8_lm_grog_a` (cargo_hold 5,12), `p8_lm_grog_b` (cargo_hold 6,13), `p8_lm_oracle` (cargo_hold 11,11), `p8_lm_ravine` (cargo_hold 11,14), `p8_lm_ravine_step` (cargo_hold 11,14). Flags set: 4 (`p8_ch45_started`, `p8_professor_bob`, `grand_crown_created`, `lost_fart_game_proposed`); items given: none.
4. **Current player actions and mechanics.** Objectives: “See what he's dragging out of the costume trunk (his chair)” [flag]; “Look at what he's put on his head (him)” [flag]; “Hear the premise (if you must)” [flag]; “See what his 'ancient landmarks' really are (the reserve casks, Mark II, the wet patch by the pump)” [event×3]; “Hand Squawks to Gristle” [flag]; “Take Squawks back (Gristle)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A mock adventure staged in a room; a perfect tongue-in-cheek puzzle space.
7. **Proposed primary mechanic.** Mock dungeon: the hold landmarks become a parody 'temple' route with real (small) obstacles – a cask maze, the slippery 'ravine' wet patch – that the captain walks while Garrick narrates.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Slippery tiles (slide puzzle), stacked casks to push.
10. **Failure conditions and consequences.** Slip into the 'ravine' → wet boots status (cosmetic), restart at the 'temple entrance'.
11. **Dependencies.** Entry: p8c3 (p8c3.verdict -> p8c4.begin). Start flag: `p8_ch45_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (room cargo_hold, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow, npc gristle). In-room hooks into this chapter: map objects in cargo_hold ×1; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** The premise works because it's obviously the hold; the 'dungeon' should be tiny and silly.

### `p8c5` · Chapter 46: The Legend of the Lost Fart

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p8c5`, Chapter 46: The Legend of the Lost Fart. Scripts: 6 in `data/story/cutscenes/phase8/ch45_47.json`. Quests: none (no quest; pure cutscene chapter).
2. **Events and dialogue.** The Legend of the Lost Fart: Garrick gives a tour of the hold as an ancient temple; 'They're all in this room, aren't they.' / 'That's a coincidence.' Dialogue: 61 lines (garrick 21, captain 19, (narration) 10, pete 3, squawks 2, gristle 2, bob 1, mags 1, +2 more); 0 choice prompt(s) with 0 options. Presentation: shake ×3.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, squawks, gristle, bob, mags, auditor, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 5 (`p8_ch46_started`, `p8_lm_grog`, `p8_lm_oracle`, `p8_lm_ravine`, `p8_captain_snapped`); items given: none.
4. **Current player actions and mechanics.** Objectives: no objectives: the player watches and advances dialogue. Mechanics invoked by the scripts: none.
5. **Classification.** Dialogue / cutscene only. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** No quest; pure dialogue.
7. **Proposed primary mechanic.** Keep as is (quiet beat).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p8c4 (p8c4.premise -> p8c5.begin). Start flag: `p8_ch46_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (room cargo_hold). In-room hooks into this chapter: map objects in cargo_hold ×5; NPC dialogue in gristle.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** Do not touch the exchange; it is the payoff of p8c4. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p8c6` · Chapter 47: The Grand Stenchmaster's Grand Nap

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p8c6`, Chapter 47: The Grand Stenchmaster's Grand Nap. Scripts: 2 in `data/story/cutscenes/phase8/ch45_47.json`. Quests: none (no quest; pure cutscene chapter).
2. **Events and dialogue.** Garrick yawns: it is time for the Grand Stenchmaster's Grand Nap. Dialogue: 38 lines (garrick 11, (narration) 10, captain 6, gristle 3, pete 3, bob 2, rook 1, jim 1, +1 more); 0 choice prompt(s) with 0 options. Presentation: shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, gristle, pete, bob, rook, jim, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 2 (`p8_ch47_started`, `p8_nap_banned`); items given: none.
4. **Current player actions and mechanics.** Objectives: no objectives: the player watches and advances dialogue. Mechanics invoked by the scripts: none.
5. **Classification.** Dialogue / cutscene only. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** 38-line transition; no quest.
7. **Proposed primary mechanic.** Keep as is.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p8c5 (p8c5.snap -> p8c6.begin). Start flag: `p8_ch47_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (room cargo_hold). In-room hooks into this chapter: map objects in none; NPC dialogue in gristle.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** Short timing beat; leave alone. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p8c7` · Chapter 48: The Sleeping Quarters Are Lost

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p8c7`, Chapter 48: The Sleeping Quarters Are Lost. Scripts: 4 in `data/story/cutscenes/phase8/ch48_50.json`. Quests: `no_place_to_sleep` “No Place to Sleep” in `data/quests/phase8.json`.
2. **Events and dialogue.** Hours pass; the storm's landings are further apart; Nell says the Center has moved; go back to the old sleeping quarters through the galley; Pete opens the door; nail a sign up; back to the hold. Dialogue: 52 lines ((narration) 17, garrick 13, captain 9, pete 6, hale 2, bob 2, gristle 2, nell 1); 1 choice prompt(s) with 5 options. Presentation: move ×4, vista ×1, shake ×1, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, hale, bob, gristle, nell. NPCs with dialogue keyed to an objective (hints, reactions or completions): ned, penhallow, quill, mags, fennimore, brask, nell, wick, sully, finch, pete, bob, jim, gristle, hale, rook, jory. Rooms: `galley`. Interactables: `p8_door_nail` (galley 8,12). Flags set: 4 (`p8_ch48_started`, `p8_quarters_blocked`, `p8_door_cracked`, `crew_quarters_condemned`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Go back to the old sleeping quarters (through the galley)” [flag]; “Let Pete open the door (the galley, by the door)” [flag]; “Nail the sign up (the door)” [flag]; “Go back down to the hold” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A short scouting trip into contaminated territory (the old quarters).
7. **Proposed primary mechanic.** Scouting run into the contaminated quarters (Atmosphere/exposure) to confirm they're lost and recover one item each for the crew (limited breath).
8. **Secondary mechanics.** Nail the sign with the timing bar (exists).
9. **Enemies, puzzles, timers, hazards, resources.** Exposure meter; the Dead Center moving (Nell's cold-plank tell is a learnable cue).
10. **Failure conditions and consequences.** Pass out → hauled back by Pete; items lost.
11. **Dependencies.** Entry: p8c6 (p8c6.blanket -> p8c7.begin). Start flag: `p8_ch48_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (dialogue p8, room cargo_hold, room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in pete.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** The sign joke and Hale's 'It's not gone. It's just... less.' stay.

### `p8c8` · Chapter 49: The Grand Decree

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p8c8`, Chapter 49: The Grand Decree. Scripts: 1 in `data/story/cutscenes/phase8/ch48_50.json`. Quests: none (no quest; pure cutscene chapter).
2. **Events and dialogue.** Garrick climbs a crate and issues the Grand Decree (18 lines). Dialogue: 18 lines (garrick 7, (narration) 5, captain 4, hale 1, gristle 1); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, hale, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 2 (`p8_ch49_started`, `p8_decree_heard`); items given: none.
4. **Current player actions and mechanics.** Objectives: no objectives: the player watches and advances dialogue. Mechanics invoked by the scripts: none.
5. **Classification.** Dialogue / cutscene only. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Pure setup for p8c9.
7. **Proposed primary mechanic.** Keep as is.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: map object in `data/maps/ship/phase8/cargo_hold.patch.json` (merged patch object). Start flag: `p8_ch49_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (room cargo_hold, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow, npc gristle). In-room hooks into this chapter: map objects in none; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'There's no authority vested in ye.' / '—by me—' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p8c9` · Chapter 50: Build the New Barracks

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p8c9`, Chapter 50: Build the New Barracks. Scripts: 11 in `data/story/cutscenes/phase8/ch48_50.json`. Quests: `grand_decree` “The Grand Decree” in `data/quests/phase8.json`.
2. **Events and dialogue.** Build the new barracks in the hold: sling hammocks, hang a sailcloth screen, shift clutter, make Squawks a safe place, help four crew rig bunks, look at your own bunk. Dialogue: 60 lines ((narration) 26, captain 11, gristle 5, squawks 4, garrick 4, pete 3, bob 2, jim 2, +3 more); 0 choice prompt(s) with 0 options. Presentation: shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: gristle, squawks, garrick, pete, bob, jim, hale, wick, rook. NPCs with dialogue keyed to an objective (hints, reactions or completions): squawks, bob, jim, gristle, pete. Rooms: `cargo_hold`. Interactables: `p8_ropes` (cargo_hold 1,7), `p8_sailcloth` (cargo_hold 15,16), `p8_clutter` (cargo_hold 9,15), `p8_clutter_b` (cargo_hold 12,16), `p8_basket_cradle` (cargo_hold 14,16), `p8_mine` (cargo_hold 15,16). Flags set: 11 (`p8_ch50_started`, `p8_ropes_tied`, `p8_sailcloth_hung`, `p8_crates_moved`, `squawks_sleep_spot`, `p8_bunk_pete`, `p8_bunk_bob`, `p8_bunk_gristle`, `p8_bunk_jim`, `garrick_top_hammock`, +1 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Sling the hammocks (the beams over the crates, port side)” [flag]; “Hang a sailcloth screen (over your corner)” [flag]; “Shift the clutter to clear some floor (by the pump)” [flag]; “Make Squawks a safe place to sleep (beside your bunk)” [flag]; “Help the crew rig their bunks (Pete, Bob, Gristle, Salty Jim)” [event×4]; “Look at your own bunk (your corner)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Literally a construction chapter; the best existing hook for the crew-quarters redesign (where people sleep is decided here).
7. **Proposed primary mechanic.** Build mode (light): place hammocks/screens/crates on the hold grid with material limits; each crew member has a preference; the result becomes the hold's barracks layout used until the quarters are reclaimed.
8. **Secondary mechanics.** Squawks's cradle placement affects his sleep (and p8c13).
9. **Enemies, puzzles, timers, hazards, resources.** Limited rope and sailcloth; crates that must be pushed to clear floor.
10. **Failure conditions and consequences.** Bad layout → crew 'sleep badly' (fatigue status next phase); no hard fail.
11. **Dependencies.** Entry: p8c8 (p8c8.decree -> p8c9.begin). Start flag: `p8_ch50_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 9 (room cargo_hold, npc pete, npc bob, npc gristle, npc jim). In-room hooks into this chapter: map objects in cargo_hold ×6; NPC dialogue in bob, gristle, jim, pete, squawks.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** Garrick's hammock goes up first and he supervises – keep that as the opening beat.

### `p8c10` · Chapter 51: The Grand Bedtime Story

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p8c10`, Chapter 51: The Grand Bedtime Story. Scripts: 3 in `data/story/cutscenes/phase8/ch51.json`. Quests: `bedtime_story` “The Grand Bedtime Story” in `data/quests/phase8.json`.
2. **Events and dialogue.** Lights down; everyone in their bunks; the Grand Bedtime Story (Garrick's 70-line legend with two choice points). Dialogue: 173 lines (garrick 70, (narration) 26, captain 25, pete 11, bob 10, gristle 10, hale 7, jim 3, +8 more); 2 choice prompt(s) with 10 options. Presentation: shake ×4, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, bob, gristle, hale, jim, wick, squawks, nell, jory, mags, fennimore, auditor, rook. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, ned, jim, penhallow, gristle, pete, hale, quill, mags, fennimore, brask, nell, wick, rook, sully, finch, jory. Rooms: `cargo_hold`. Interactables: `p8_bed` (cargo_hold 15,16). Flags set: 4 (`p8_ch51_started`, `p8_lights_out`, `p8_story_started`, `lost_fart_legend_told`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Get into your bunk” [flag]; “Endure the legend” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A long comedic monologue; it should stay a monologue.
7. **Proposed primary mechanic.** Keep (quiet beat). The existing choices remain the only interaction.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p8c9 (p8c9.mine -> p8c10.begin). Start flag: `p8_ch51_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (room cargo_hold, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow, npc gristle). In-room hooks into this chapter: map objects in cargo_hold ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** '...This is all right, actually.' from Wick is a rare warm moment; protect it. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p8c11` · Chapter 52: The Outfit Must Stay On

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p8c11`, Chapter 52: The Outfit Must Stay On. Scripts: 2 in `data/story/cutscenes/phase8/ch52_54.json`. Quests: `grand_nap` “The Grand Nap” in `data/quests/phase8.json`.
2. **Events and dialogue.** Garrick, still in Suit, sash and spoon crown, climbs into the hammock above yours; he 'can't' take it off; put the crown away; back to bed. Dialogue: 54 lines ((narration) 27, captain 10, garrick 9, pete 3, squawks 2, gristle 1, hale 1, bob 1); 1 choice prompt(s) with 3 options. Presentation: move ×1, shake ×1, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, squawks, gristle, hale, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, ned, jim, penhallow, gristle, pete, hale, quill, mags, fennimore, brask, nell, wick, rook, sully, finch, jory. Rooms: `cargo_hold`. Interactables: `p8_crate_crown` (cargo_hold 17,14), `p8_back` (cargo_hold 15,16). Flags set: 3 (`p8_ch52_started`, `p8_garrick_in_bunk`, `p8_suit_puffed`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Try to get comfortable” [flag]; “Put the Grand Crown somewhere it can't hurt anyone (the spare crate by your bunk)” [flag]; “Back to bed (your bunk)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Small domestic beat.
7. **Proposed primary mechanic.** Keep as dialogue; the crown can be a physical carry item (heavy, jangling) that must be stowed quietly (noise meter) without waking the crew.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Noise when moving with the crown.
10. **Failure conditions and consequences.** Wake someone → their grumble line; no penalty.
11. **Dependencies.** Entry: p8c10 (p8c10.legend -> p8c11.begin). Start flag: `p8_ch52_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (room cargo_hold). In-room hooks into this chapter: map objects in none; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'I can't.' is the joke; leave it. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p8c12` · Chapter 53: The Grand Crown Falls

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p8c12`, Chapter 53: The Grand Crown Falls. Scripts: 3 in `data/story/cutscenes/phase8/ch52_54.json`. Quests: none (no quest; pure cutscene chapter).
2. **Events and dialogue.** The hold goes quiet; Garrick snores; the captain almost falls asleep; the Grand Crown falls. Dialogue: 40 lines ((narration) 22, captain 6, pete 3, garrick_asleep 2, hale 2, rook 1, bob 1, nell 1, +2 more); 1 choice prompt(s) with 5 options. Presentation: shake ×3, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, garrick_asleep, hale, rook, bob, nell, gristle, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 4 (`p8_ch53_started`, `p8_crown_fell`, `grand_crown_banned_for_sleep`, `p8_back_in_bunk`); items given: none.
4. **Current player actions and mechanics.** Objectives: no objectives: the player watches and advances dialogue. Mechanics invoked by the scripts: none.
5. **Classification.** Dialogue / cutscene only. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Quiet build-up to p8c13.
7. **Proposed primary mechanic.** Keep as is.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p8c11 (p8c11.bunk -> p8c12.begin). Start flag: `p8_ch53_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room cargo_hold, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow, npc gristle). In-room hooks into this chapter: map objects in cargo_hold ×2; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** The snore lines and the near-sleep must not be interrupted. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p8c13` · Chapter 54: The Sash Descends

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p8c13`, Chapter 54: The Sash Descends. Scripts: 7 in `data/story/cutscenes/phase8/ch52_54.json`. Quests: `seventy_percent_off` “Seventy Percent Off” in `data/quests/phase8.json`.
2. **Events and dialogue.** The Suit lets things go every time Garrick rolls over; the sash descends; Garrick talks in his sleep ('seventy percent off'); wake Pete, Gristle and Bob; tell them what he said. Dialogue: 129 lines ((narration) 63, garrick_asleep 20, captain 19, pete 9, gristle 7, bob 5, hale 2, squawks 2, +2 more); 1 choice prompt(s) with 5 options. Presentation: tvProgram ×4, vista ×2, shake ×2, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick_asleep, pete, gristle, bob, hale, squawks, jim, jory. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, gristle, pete. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 8 (`p8_ch54_started`, `p8_sash_in_hand`, `p8_woke_pete`, `p8_woke_gristle`, `p8_woke_bob`, `sash_origin_revealed`, `crew_ftm_invested`, `p8_complete`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Wake the crew (Pete, Gristle, Bob)” [event×3]; “Tell them what he said (by your bunk)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A night scene with a sleeping antagonist; a natural stealth beat.
7. **Proposed primary mechanic.** Stealth wake-up: move between hammocks without waking Garrick (his sleep meter reacts to noise and proximity); wake each witness in time to hear the evidence.
8. **Secondary mechanics.** Remember the sleep-talk evidence (a flag) for the later trial/confrontation.
9. **Enemies, puzzles, timers, hazards, resources.** Creaking planks, the hanging sash as an obstacle, fumes from the Suit.
10. **Failure conditions and consequences.** Garrick wakes → he denies everything; the evidence is weaker later (dialogue variant), retry allowed.
11. **Dependencies.** Entry: p8c12 (p8c12.back -> p8c13.begin). Start flag: `p8_ch54_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (npc squawks, npc bob, npc ned, npc jim, npc penhallow, npc gristle, npc pete, npc hale). In-room hooks into this chapter: map objects in none; NPC dialogue in bob, gristle, pete.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** The sleep-talk ('seventy percent off') is the payoff; stealth makes the player complicit in the eavesdropping.
