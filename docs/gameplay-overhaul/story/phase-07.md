# Story inventory, Phase 7: The Great Sharkstorm Returns and the Song of the Grand Stenchmaster

Chapters: 9 (p7c1 to p7c9). Dialogue lines: 654. Classification: Timing / skill input 5, Walk + press A 3, Choice or puzzle prompt 1.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE7.md`, `data/quests/phase7.json`, `data/story/cutscenes/phase7/`, `data/story/flags/phase7.json`, `tests/phase7_story.test.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p7c1` · Chapter 33: It's Coming Back

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p7c1`, Chapter 33: It's Coming Back. Scripts: 9 in `data/story/cutscenes/phase7/ch33.json`. Quests: `sharkstorm_returns` “It's Coming Back” in `data/quests/phase7.json`.
2. **Events and dialogue.** Two days of repairs; the storm is on the horizon; help with debris and the foremast; Ned shouts; the telescope shows it's coming back. Dialogue: 77 lines ((narration) 31, captain 9, garrick 7, hale 5, ned 5, gristle 3, finch 3, rook 3, +5 more); 0 choice prompt(s) with 0 options. Presentation: transition ×1, vista ×1, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, hale, ned, gristle, finch, rook, mags, pete, bob, crew, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): ned. Rooms: `main_deck`. Interactables: `p7_debris` (main_deck 7,20), `p7_debris_block` (main_deck 7,20), `p7_foremast` (main_deck 9,29), `p7_telescope_look` (main_deck 4,28). Flags set: 10 (`p7_started`, `p7_debris_cleared`, `p7_fore_rigging`, `p7_ned_called`, `p7_fins_seen`, `p7_spray_seen`, `great_sharkstorm_returned`, `p7_first_thwack`, `p7_wisp_seen`, `garrick_aura_named`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Help with the repairs (the storm debris midships; the foremast rigging, forward)” [event×2]; “See what Ned's shouting about (the bow)” [flag]; “Look at the horizon (the telescope, starboard, by the forward rail)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×2, Shark Duty ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×2, Shark Duty ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A repair day is the natural home for Ship Integrity: damage from Phase 6 becomes this chapter's work list.
7. **Proposed primary mechanic.** Repair round: a list of damage carried over from p6c7/p6c8 (persistent), fixed with materials (planks, line) and the timing bar; crew can be assigned to jobs.
8. **Secondary mechanics.** Ned's telescope sighting as a 'read the weather' tool (forecast for p7c2).
9. **Enemies, puzzles, timers, hazards, resources.** Limited materials, jobs that break again if done badly ('everything we fix, something else falls off').
10. **Failure conditions and consequences.** Unfinished repairs carry into p7c2 as weak points that fail first.
11. **Dependencies.** Entry: p7.bed_sleep -> p7c1.begin. Start flag: `p7_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room captains_quarters, room cargo_hold, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in main_deck ×3; NPC dialogue in ned.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** Hale's 'Everything we fix, something else falls off' becomes literally true; the hammering argument stays.

### `p7c2` · Chapter 34: Which Away?

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p7c2`, Chapter 34: Which Away?. Scripts: 11 in `data/story/cutscenes/phase7/ch34.json`. Quests: `which_away` “Which Away?” in `data/quests/phase7.json`.
2. **Events and dialogue.** The storm returns: make two loose lines fast, reef the main, keep Squawks close, heave a shark, take the helm, find out what Garrick is shouting. Dialogue: 67 lines ((narration) 21, captain 13, garrick 10, nell 4, jory 3, squawks 3, pete 3, rook 2, +5 more); 1 choice prompt(s) with 3 options. Presentation: shake ×2.
3. **Characters, locations, props, flags.** Speaking characters: garrick, nell, jory, squawks, pete, rook, hale, crew, bob, finch, fennimore. NPCs with dialogue keyed to an objective (hints, reactions or completions): squawks, bob, ned, jim, gristle, pete, hale, quill, mags, fennimore, brask, nell, wick, rook, sully, finch, jory, garrick. Rooms: `main_deck`. Interactables: `p7_line_a` (main_deck 16,19), `p7_line_b` (main_deck 3,29), `p7_reef` (main_deck 9,19), `p7_heave` (main_deck 12,25), `p7_heave_block` (main_deck 12,25), `p7_helm` (main_deck 9,6). Flags set: 11 (`p7_ch34_started`, `p7_line_a`, `p7_line_b`, `p7_sail_reefed`, `p7_squawks_coat`, `p7_deck_shark_falling`, `p7_deck_shark_landed`, `p7_deck_shark_lifted`, `p7_deck_shark_heaved`, `p7_helm_away`, +1 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Make the loose rigging fast (the port main shrouds; the starboard fore shrouds)” [event×2]; “Reef the mainsail (the foot of the mainmast)” [flag]; “Keep Squawks close (his basket, by the cabin door)” [flag]; “Shark on deck! Heave it overboard (midships, forward of the main hatch)” [flag]; “Take the helm (the quarterdeck)” [flag]; “Find out what the Grand Stenchmaster is shouting about (his chair)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×4.
5. **Classification.** Timing / skill input (timing bar (repair) ×4). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Second storm; must escalate rather than repeat p6c7.
7. **Proposed primary mechanic.** Storm deck II with escalation: weak points from p7c1 fail first, the mainsail can rip if not reefed in time, and helm steering ('which away?') is a choice with consequences (into the wind vs. away).
8. **Secondary mechanics.** Squawks follows the captain (escort) and must be kept out of shark shadows.
9. **Enemies, puzzles, timers, hazards, resources.** More sharks, a ripping sail on a timer, crew calling for help at two places at once.
10. **Failure conditions and consequences.** Sail rips → sail repair in p7c5; Squawks hit → feathers (cosmetic) and morale drop.
11. **Dependencies.** Entry: p7c1 (p7c1.aura -> p7c2.begin). Start flag: `p7_ch34_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 8 (dialogue p7, room main_deck, npc hale, npc fennimore, npc rook, npc finch, npc jory). In-room hooks into this chapter: map objects in main_deck ×5; NPC dialogue in garrick, squawks.
12. **Complexity and priority.** Complexity L, priority P1.
13. **Preserving story and humour; variety.** Jory's 'Watch it for WHAT?' and the which-away argument stay; the choice of direction becomes the player's.

### `p7c3` · Chapter 35: Not a Stenchmaster Duty

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p7c3`, Chapter 35: Not a Stenchmaster Duty. Scripts: 4 in `data/story/cutscenes/phase7/ch35.json`. Quests: `not_a_duty` “Not a Stenchmaster Duty” in `data/quests/phase7.json`.
2. **Events and dialogue.** Garrick refuses to help: 'it isn't a Stenchmaster duty'. Fetch the emergency labour rule from the mainmast and read it to him. Dialogue: 73 lines (garrick 30, captain 12, (narration) 10, hale 5, pete 4, rook 3, gristle 3, bob 3, +2 more); 0 choice prompt(s) with 0 options. Presentation: insert ×2.
3. **Characters, locations, props, flags.** Speaking characters: garrick, hale, pete, rook, gristle, bob, crew, jory. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `main_deck`. Interactables: `p7_rule` (main_deck 9,20). Flags set: 5 (`p7_ch35_started`, `p7_rule_fetched`, `p7_loophole`, `p7_job_slate`, `grand_sharkmaster_invented`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Fetch the emergency labour rule (nailed to the mainmast)” [flag]; “Read it to the Grand Stenchmaster (his chair)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Pure argument; short.
7. **Proposed primary mechanic.** Keep as dialogue; add one mechanical beat: the rule is nailed up in the storm and must be prised off while the deck pitches (one timing bar).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None needed.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p7c2 (p7c2.garrick -> p7c3.begin). Start flag: `p7_ch35_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'It isn't a Stenchmaster duty.' must land cleanly; leave the timing alone. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p7c4` · Chapter 36: The Job Description

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p7c4`, Chapter 36: The Job Description. Scripts: 10 in `data/story/cutscenes/phase7/ch36.json`. Quests: `job_description` “The Job Description” in `data/quests/phase7.json`.
2. **Events and dialogue.** The crew gather round Gristle with a list of grievances; hear each crewman; take the list to Garrick. Dialogue: 57 lines ((narration) 18, garrick 13, captain 6, gristle 5, pete 3, bob 3, hale 3, rook 3, +1 more); 0 choice prompt(s) with 0 options. Presentation: move ×6, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, gristle, pete, bob, hale, rook, crew. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, gristle, pete, hale, rook, garrick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 9 (`p7_ch36_started`, `p7_grievance_gristle`, `p7_grievance_pete`, `p7_grievance_bob`, `p7_grievance_hale`, `p7_grievance_rook`, `p7_career_alignment`, `garrick_cape_torn`, `p7_cape_chase`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Hear the crew out (they're gathering midships)” [event×4]; “Take the list to the Grand Stenchmaster (his chair)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A morale scene; the crew list is a natural 'crew status' screen.
7. **Proposed primary mechanic.** Keep as narrative; surface the Crew roster screen here for the first time (each grievance is recorded against a crew member's mood).
8. **Secondary mechanics.** Optional: choose which grievances to lead with (affects Garrick's reply line only, not the plot).
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p7c3 (p7c3.sharkmaster -> p7c4.begin). Start flag: `p7_ch36_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (npc garrick, npc bob, npc ned, npc jim, npc gristle, npc pete, npc hale, npc quill). In-room hooks into this chapter: map objects in none; NPC dialogue in bob, garrick, gristle, hale, pete, rook.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Before we have a different kind of word, with him' is the beat; untouched. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p7c5` · Chapter 37: The Grand Stenchmaster's Parade

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p7c5`, Chapter 37: The Grand Stenchmaster's Parade. Scripts: 4 in `data/story/cutscenes/phase7/ch37.json`. Quests: `stenchmaster_parade` “The Grand Stenchmaster's Parade” in `data/quests/phase7.json`.
2. **Events and dialogue.** Garrick's morale parade; the crew hope he'll help; instead the captain helps Pete with a shark, Bob with a line, Jim with a crate while Garrick parades. Dialogue: 49 lines ((narration) 16, garrick 14, bob 6, pete 5, jim 5, captain 3); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, bob, pete, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): pete, bob, jim. Rooms: `main_deck`. Interactables: `p7_pete_shark` (main_deck 12,25), `p7_pete_shark_block` (main_deck 12,25). Flags set: 5 (`p7_ch37_started`, `p7_parade_started`, `p7_helped_pete`, `p7_helped_bob`, `p7_helped_jim`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Help Pete with the shark (forward of the main hatch)” [flag]; “Help Bob tie off the line (the port rail)” [flag]; “Help Salty Jim with his crate (by the empty grog lashings)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Three chores while being distracted by a parade.
7. **Proposed primary mechanic.** Multi-task shift: three jobs on timers while the parade route blocks the deck (moving obstacle with a brass section).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Parade blocks paths; crew get annoyed if left waiting (morale).
10. **Failure conditions and consequences.** Job not done → that crew member is 'sulking' in p7c6 (cosmetic + morale).
11. **Dependencies.** Entry: p7c4 (p7c4.chase -> p7c5.begin). Start flag: `p7_ch37_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (room main_deck, npc garrick, npc bob, npc ned, npc jim, npc gristle, npc pete, npc hale). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in bob, jim, pete.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** The parade as a moving obstacle makes Garrick's uselessness physical.

### `p7c6` · Chapter 38: The Song of the Grand Stenchmaster

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p7c6`, Chapter 38: The Song of the Grand Stenchmaster. Scripts: 5 in `data/story/cutscenes/phase7/ch38.json`. Quests: `back_to_work` “Back to Work” in `data/quests/phase7.json`.
2. **Events and dialogue.** The Song of the Grand Stenchmaster (a long song); then Garrick quietly takes the ship apart for salvage while the captain watches. Dialogue: 86 lines (garrick 35, (narration) 25, captain 12, crew 6, squawks 2, jim 1, pete 1, bob 1, +3 more); 1 choice prompt(s) with 2 options. Presentation: shake ×2.
3. **Characters, locations, props, flags.** Speaking characters: garrick, crew, squawks, jim, pete, bob, rook, hale, nell. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 9 (`p7_ch38_started`, `grand_stenchmaster_song_performed`, `stenchmaster_parade_done`, `ses_mark1_wrecked`, `p7_back_to_work`, `p7_salvage_compass`, `p7_lantern_fell`, `p7_salvage_lantern`, `p7_salvage_horseshoe`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Keep an eye on the Grand Stenchmaster (he's taking the ship apart)” [event×3]. Mechanics invoked by the scripts: TV knobs ×1.
5. **Classification.** Choice or puzzle prompt (TV knobs ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The song is a comedic set-piece; the salvage is a stealth/watch opportunity.
7. **Proposed primary mechanic.** Keep the song; then 'catch him at it': Garrick removes three ship parts (the compass, the TV wire, the aerial) – the captain can stop or allow each, which determines how good Mark II is in p7c8 and what the ship loses.
8. **Secondary mechanics.** Song choice stays as-is.
9. **Enemies, puzzles, timers, hazards, resources.** Garrick moves between hiding spots; limited attention.
10. **Failure conditions and consequences.** Missed parts → minor ship functions offline (e.g., compass broken = course dial harder in Phase 8).
11. **Dependencies.** Entry: p7c5 (p7c5.pete -> p7c6.begin); p7c5 (p7c5.bob -> p7c6.begin); p7c5 (p7c5.jim -> p7c6.begin). Start flag: `p7_ch38_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 8 (room main_deck, npc garrick, npc bob, npc ned, npc jim, npc gristle, npc pete, npc hale). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** The full song stays; the theft makes his 'contribution' cost the ship something visible.

### `p7c7` · Chapter 39: Everyone Below

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p7c7`, Chapter 39: Everyone Below. Scripts: 4 in `data/story/cutscenes/phase7/ch39.json`. Quests: `everyone_below` “Everyone Below” in `data/quests/phase7.json`.
2. **Events and dialogue.** The storm leans over the ship and it rains sharks; a yard falls; lash the wheel; get everyone below to the hold. Dialogue: 41 lines ((narration) 19, captain 9, gristle 3, squawks 3, garrick 2, crew 1, hale 1, pete 1, +2 more); 0 choice prompt(s) with 0 options. Presentation: shake ×5.
3. **Characters, locations, props, flags.** Speaking characters: gristle, squawks, garrick, crew, hale, pete, nell, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `main_deck`. Interactables: `p7_lash` (main_deck 9,6). Flags set: 4 (`p7_ch39_started`, `p7_wheel_lashed`, `p7_hatch_secured`, `p7_sheltered`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Lash the wheel (the helm)” [flag]; “Get below (the main hatch, then down to the hold)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A last dash below.
7. **Proposed primary mechanic.** Retreat run: lash the wheel (timing bar), then reach the main hatch through falling debris, pulling stragglers along (escort).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Falling yard (telegraphed), sharks landing on the route.
10. **Failure conditions and consequences.** Hit → knocked down, lose time, retry from the helm.
11. **Dependencies.** Entry: p7c6 (p7c6.horseshoe -> p7c7.begin). Start flag: `p7_ch39_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow, npc gristle). In-room hooks into this chapter: map objects in main_deck ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** Gristle's 'Clear that one! — never mind! NEVER MIND!' stays.

### `p7c8` · Chapter 40: The Stenchmaster Entertainment System Mark II

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p7c8`, Chapter 40: The Stenchmaster Entertainment System Mark II. Scripts: 11 in `data/story/cutscenes/phase7/ch40.json`. Quests: `mark_two` “The Stenchmaster Entertainment System Mark II” in `data/quests/phase7.json`.
2. **Events and dialogue.** In the hold, Garrick builds the S.E.S. Mark II on a crate from salvaged parts; keep his hands off the switch; knobs. Dialogue: 94 lines ((narration) 43, garrick 27, captain 8, pete 5, hale 4, bob 2, gristle 2, rook 1, +2 more); 2 choice prompt(s) with 6 options. Presentation: vista ×4, shake ×2.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, hale, bob, gristle, rook, crew, franklin. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `cargo_hold`. Interactables: `p7_bench` (cargo_hold 11,11), `p7_knobs` (cargo_hold 11,11). Flags set: 11 (`p7_ch40_started`, `p7_mk2_aerial`, `p7_mk2_insulation`, `p7_mk2_routing`, `p7_mk2_knob`, `ses_mark2_built`, `p7_switch_stopped_1`, `p7_switch_stopped_2`, `p7_noise_helps`, `p7_mk2_startup`, +1 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Watch the Grand Stenchmaster build it (his bench)” [event×4]; “Keep his hands off the switch (his bench)” [event×2]; “Mark II's knobs (the set)” [flag]. Mechanics invoked by the scripts: TV knobs ×3, timing bar (repair) ×1, TV power ×1.
5. **Classification.** Timing / skill input (TV knobs ×3, timing bar (repair) ×1). Presentation-only effects with no player input: TV power ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A build scene with knobs; tie to the parts recovered or lost in p7c6.
7. **Proposed primary mechanic.** Keep largely narrative; the switch beat becomes a 'hold him back' timing (twice).
8. **Secondary mechanics.** Mark II quality depends on p7c6 (persistent reference).
9. **Enemies, puzzles, timers, hazards, resources.** Minor.
10. **Failure conditions and consequences.** Let him switch on early → p7c9 starts sooner (no penalty).
11. **Dependencies.** Entry: p7c7 (p7c7.shelter -> p7c8.begin). Start flag: `p7_ch40_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room cargo_hold). In-room hooks into this chapter: map objects in cargo_hold ×2; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Gentlemen. Mark Two.' and the groan of the hold stay. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p7c9` · Chapter 41: A Pleasant Evening

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p7c9`, Chapter 41: A Pleasant Evening. Scripts: 12 in `data/story/cutscenes/phase7/ch41.json`. Quests: `pleasant_evening` “A Pleasant Evening” in `data/quests/phase7.json`.
2. **Events and dialogue.** Trapped in the hold watching the frog programme (16 TV segments); find something else to do; sit by Squawks. Dialogue: 110 lines ((narration) 45, garrick 16, captain 12, squawks 8, crew 7, pete 7, rook 4, gristle 4, +3 more); 1 choice prompt(s) with 3 options. Presentation: tvProgram ×16, vista ×2, shake ×2.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, crew, pete, rook, gristle, hale, bob, brask. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, ned, jim, penhallow, gristle, pete, hale, quill, mags, fennimore, brask, nell, wick, rook, sully, finch, jory. Rooms: `cargo_hold`. Interactables: `p7_nw_pump` (cargo_hold 10,15), `p7_nw_crates` (cargo_hold 14,9), `p7_seat_sit` (cargo_hold 12,14). Flags set: 13 (`p7_ch41_started`, `p7_episode_part1`, `p7_not_watching_pump`, `p7_not_watching_crates`, `p7_not_watching_crew`, `p7_captain_sits`, `p7_one_episode`, `p7_squawks_verdict`, `p7_toast`, `crew_watched_frog_tax_man`, +3 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Find something else to do (anything but the television)” [event×2]; “Sit down (the empty crate, next to Squawks)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Deliberately a quiet beat after two storms.
7. **Proposed primary mechanic.** Quiet beat: keep. Optional idle activities in the hold (pump, crates) become small ship chores that grant materials for later.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p7c8 (p7c8.ribbit -> p7c9.begin). Start flag: `p7_ch41_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room cargo_hold, dialogue p7, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow). In-room hooks into this chapter: map objects in cargo_hold ×3; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'You may look at the wall. Quietly.' – the TV evening must stay unhurried. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.
