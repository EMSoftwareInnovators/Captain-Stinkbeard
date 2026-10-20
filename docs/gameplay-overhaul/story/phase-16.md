# Story inventory, Phase 16: The Grand Lighter

Chapters: 20 (p16c1 to p16c20). Dialogue lines: 577. Classification: Choice or puzzle prompt 7, Walk + press A 7, Timing / skill input 6.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE16.md`, `data/quests/phase16.json`, `data/story/cutscenes/phase16/`, `data/story/flags/phase16.json`, `tests/phase16_story.test.js`, `tests/phase16Play.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p16c1` · Chapter 186: The Grand Search for Fire

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p16c1`, Chapter 186: The Grand Search for Fire. Scripts: 19 in `data/story/cutscenes/phase16/ch186_189.json`. Quests: `grand_search_for_fire` “The Grand Search for Fire” in `data/quests/phase16.json`.
2. **Events and dialogue.** Operation Calm; Garrick's administrative capacity returns; fetch sashes and rig a loose canopy over Brogath's spot; precautions; ask the visitors for a light; search six chalk X's across four rooms for fire; Garrick's historical precedent. Dialogue: 69 lines ((narration) 22, garrick 14, pete 13, captain 11, brogath 4, visitor_one 2, visitor_two 2, hale 1); 2 choice prompt(s) with 4 options. Presentation: vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, brogath, visitor_one, visitor_two, hale. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, pete, brogath, visitor_one, visitor_two. Rooms: `captains_quarters`, `cargo_hold`, `crew_quarters`, `galley`, `main_deck`. Interactables: `p16_sashes` (crew_quarters 12,8), `p16_canopy` (crew_quarters 9,7), `p16_fire_desk` (captains_quarters 7,6), `p16_fire_crate` (cargo_hold 11,4), `p16_fire_footlocker` (crew_quarters 4,5), `p16_fire_stove` (galley 2,4), `p16_fire_garrick` (galley 15,6), `p16_fire_barrel` (main_deck 5,16). Flags set: 20 (`p16_started`, `p16_ch186_started`, `p16_calm_pete`, `p16_calm_garrick`, `p16_calm_said`, `p16_canopy_sashes`, `brogath_fume_canopy_built`, `p16_talk_pete`, `p16_talk_garrick`, `p16_talk_brogath`, +10 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Announce Operation Calm (Pete, then Garrick: the galley)” [event×2]; “Fetch clean sashes for a canopy (the Mega-Pack, Crew Quarters)” [flag]; “Rig the canopy over Brogath's spot by the bedroom set: LOOSE, not sealed (Crew Quarters)” [flag]; “Precautions (Pete), a committee to stop (Garrick), and Brogath to check on: the Crew Quarters” [event×3]; “Ask for a light (the visitors, Crew Quarters)” [flag]; “Search for fire at each chalk X: cabin desk, stove, footlocker, hold crate by the stairs, Garrick's crate, rum barrel” [event×6]; “Hear the historical precedent (Garrick, with the lore book: Crew Quarters)” [flag]. Mechanics invoked by the scripts: stability change ×1, Brogath reassurance prompt ×1.
5. **Classification.** Choice or puzzle prompt (Brogath reassurance prompt ×1). Presentation-only effects with no player input: stability change ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A ship-wide search; the ship's rooms are traversed in a loop.
7. **Proposed primary mechanic.** Ship-wide search with Brogath Pressure ticking in the background (leaving Brogath alone too long lowers stability); route planning across four rooms.
8. **Secondary mechanics.** Canopy rigging (loose, not sealed – a rule the player must respect).
9. **Enemies, puzzles, timers, hazards, resources.** Pressure timer, routing.
10. **Failure conditions and consequences.** Stability dip → toot in the quarters (cleanup).
11. **Dependencies.** Entry: story trigger p16_calmed: {all:[{objectiveDone:grand_search_for_fire.calm},{notFlag:p16_calm_said}]}; story trigger p16_talked: {all:[{objectiveDone:grand_search_for_fire.talks},{notFlag:p16_talks_said}]}; story trigger p16_searched: {all:[{objectiveDone:grand_search_for_fire.search},{notFlag:p16_search_said}]}. Start flag: `p16_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 16 (room captains_quarters, room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick). In-room hooks into this chapter: map objects in crew_quarters ×3, galley ×2, captains_quarters ×1, cargo_hold ×1, main_deck ×1; NPC dialogue in brogath, garrick, pete, visitor_one, visitor_two.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'GOOD MORNING, TEAM.' and Squawks shouting at a bucket stay.

### `p16c2` · Chapter 187: The Grand Lighter

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p16c2`, Chapter 187: The Grand Lighter. Scripts: 7 in `data/story/cutscenes/phase16/ch186_189.json`. Quests: `the_grand_lighter` “The Grand Lighter” in `data/quests/phase16.json`.
2. **Events and dialogue.** The Grand Lighter: shout into the Sharkstorm for a light; catch the parcel; try it; the Mark II comes on; make it work (lighter clicks); Vindicta visits. Dialogue: 37 lines ((narration) 15, captain 7, vindicta 5, pete 3, brogath 3, jim 2, hale 1, garrick 1); 0 choice prompt(s) with 0 options. Presentation: shake ×2, insert ×2, giveItem ×1, vista ×1, tvProgram ×1, spawn ×1.
3. **Characters, locations, props, flags.** Speaking characters: vindicta, pete, brogath, jim, hale, garrick. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath, vindicta. Rooms: `crew_quarters`, `galley`, `main_deck`. Interactables: `p16_shout` (main_deck 16,13), `p16_parcel` (main_deck 12,20), `p16_try` (crew_quarters 9,7), `p16_ad` (galley 16,7), `p16_work` (crew_quarters 9,7). Flags set: 7 (`p16_ch187_started`, `p16_shouted`, `grand_lighter_acquired`, `p16_lighter_first_try`, `p16_cheapy_ad_seen`, `grand_lighter_working`, `vindicta_returned`); items given: grand_stenchmaster_lighter.
4. **Current player actions and mechanics.** Objectives: “Shout into the Sharkstorm for a light (any rail, on deck)” [flag]; “Catch what comes back (the parcel, on deck)” [flag]; “Try it (the canopy over Brogath's spot, Crew Quarters)” [flag]; “Somebody's switched the Mark II on (the galley)” [flag]; “Make it work (the canopy over Brogath's spot, Crew Quarters: keep trying)” [flag]; “A visitor (Vindicta, Crew Quarters)” [flag]. Mechanics invoked by the scripts: lighter clicks ×2.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: lighter clicks ×2. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Catching a parcel and an unreliable tool (lighter).
7. **Proposed primary mechanic.** Lighter as an equipment item with a reliability stat (clicks); the parcel catch reuses falling-object telegraphs.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Parcel catch, lighter misfires.
10. **Failure conditions and consequences.** Parcel lost overboard → shout again (comic repeat).
11. **Dependencies.** Entry: p16c1 (p16c1.precedent -> p16c2.begin). Start flag: `p16_ch187_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room crew_quarters, room galley, npc garrick, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in main_deck ×2, crew_quarters ×2, galley ×1; NPC dialogue in brogath, vindicta.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'Captain, not the Sharkstorm.' / 'The Sharkstorm.' stays.

### `p16c3` · Chapter 188: Coffin Sock

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p16c3`, Chapter 188: Coffin Sock. Scripts: 13 in `data/story/cutscenes/phase16/ch186_189.json`. Quests: `coffin_sock` “Coffin Sock” in `data/quests/phase16.json`.
2. **Events and dialogue.** Coffin Sock: Brogath wants to make the 'green one' on purpose; get everyone ready; let him try; stop the classification committee; air the ship room by room (three portholes/windows); something comes out of the Sharkstorm. Dialogue: 40 lines ((narration) 14, brogath 10, captain 4, pete 4, garrick 4, visitor_one 2, visitor_two 2); 2 choice prompt(s) with 4 options. Presentation: shake ×2, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete, garrick, visitor_one, visitor_two. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath, garrick, pete, visitor_one, visitor_two. Rooms: `captains_quarters`, `crew_quarters`, `galley`, `main_deck`. Interactables: `p16_vent_cabin` (captains_quarters 8,3), `p16_vent_quarters` (crew_quarters 2,3), `p16_vent_galley` (galley 4,3), `p16_bbk` (main_deck 11,23). Flags set: 13 (`p16_ch188_started`, `p16_green_idea`, `p16_prep_pete`, `p16_prep_visitors`, `p16_prep_garrick`, `p16_prep_said`, `first_coffin_sock_failure`, `p16_cs_no_committee`, `p16_vent_quarters`, `p16_vent_galley`, +3 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Hear Brogath out (Brogath, Crew Quarters)” [flag]; “Get everybody ready (Pete, the visitors, Garrick: Crew Quarters)” [event×3]; “Let him try (Brogath, Crew Quarters)” [flag]; “No classification committee (Garrick, Crew Quarters)” [flag]; “Air the ship room by room (Crew Quarters porthole, galley porthole, the stern windows in the Captain's Quarters)” [event×3]; “Something out of the Sharkstorm (the token, on deck)” [flag]. Mechanics invoked by the scripts: stability change ×7, Brogath reassurance prompt ×1.
5. **Classification.** Choice or puzzle prompt (Brogath reassurance prompt ×1). Presentation-only effects with no player input: stability change ×7. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Venting rooms is a direct Atmosphere mechanic.
7. **Proposed primary mechanic.** Ventilation run: the Coffin Sock cloud spreads room to room; open portholes/windows in the right order (cross-draughts) to clear it (Atmosphere routing).
8. **Secondary mechanics.** Committee interception (Garrick).
9. **Enemies, puzzles, timers, hazards, resources.** Spreading cloud, door/porthole order.
10. **Failure conditions and consequences.** Rooms stay contaminated → exposure + crew conditions.
11. **Dependencies.** Entry: p16c2 (p16c2.vindicta -> p16c3.begin). Start flag: `p16_ch188_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 10 (room crew_quarters, room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle). In-room hooks into this chapter: map objects in crew_quarters ×1, galley ×1, captains_quarters ×1, main_deck ×1; NPC dialogue in brogath, garrick, pete, visitor_one, visitor_two.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'a Grand Stenchmaster fart isn't a menu' stays.

### `p16c4` · Chapter 189: The Stenchmaster Fart Zone

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p16c4`, Chapter 189: The Stenchmaster Fart Zone. Scripts: 20 in `data/story/cutscenes/phase16/ch186_189.json`. Quests: `stenchmaster_fart_zone` “The Stenchmaster Fart Zone” in `data/quests/phase16.json`.
2. **Events and dialogue.** The Stenchmaster Fart Zone: open the old sail locker under the midships grating; clear junk; put up signs; check the door frame; free three portholes; set up an observation point; rope off a queue; post rules; orient Brogath and Garrick; no exemptions for Vindicta. Dialogue: 37 lines ((narration) 17, captain 7, vindicta 5, pete 4, brogath 2, garrick 2); 0 choice prompt(s) with 0 options. Presentation: insert ×2.
3. **Characters, locations, props, flags.** Speaking characters: vindicta, pete, brogath, garrick. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, brogath, vindicta. Rooms: `main_deck`, `stenchmaster_fart_zone`. Interactables: `p16_fz_find` (main_deck 9,16), `p16_fz_clear_sails` (stenchmaster_fart_zone 2,5), `p16_fz_clear_spar` (stenchmaster_fart_zone 12,4), `p16_fz_clear_cable` (stenchmaster_fart_zone 5,7), `p16_fz_sign_a` (stenchmaster_fart_zone 4,3), `p16_fz_sign_b` (stenchmaster_fart_zone 10,3), `p16_fz_door` (stenchmaster_fart_zone 6,9), `p16_fz_porthole_1` (stenchmaster_fart_zone 2,3), `p16_fz_porthole_2` (stenchmaster_fart_zone 6,3), `p16_fz_porthole_3` (stenchmaster_fart_zone 13,3), +3 more. Flags set: 20 (`p16_ch189_started`, `p16_fz_found`, `p16_fz_inspected`, `p16_fz_clear_sails`, `p16_fz_clear_spar`, `p16_fz_clear_cable`, `p16_fz_clear_said`, `p16_fz_sign_a`, `p16_fz_sign_b`, `p16_fz_door_checked`, +10 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Open up the old sail locker (the cargo grating, midships on deck)” [flag]; “Look it over (inside the sail locker)” [flag]; “Clear out the junk (the old sails, the spar, the cable: the Fart Zone)” [event×3]; “Put up the warning signs (the chalk marks on the wall, the Fart Zone)” [event×2]; “Check the door frame (by the ladder, the Fart Zone)” [flag]; “Free the three portholes (the Fart Zone, sea side)” [event×3]; “Set up an observation point behind a rope (the bench, the Fart Zone)” [flag]; “Rope off a queue (by the door, the Fart Zone)” [flag]; “Post the rules (the board, the Fart Zone)” [flag]; “Show Brogath and Garrick round (the Fart Zone)” [event×2]; “No exemptions (Vindicta, on deck)” [flag]. Mechanics invoked by the scripts: stability change ×2.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×2. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A new room purpose-built for a hazard: the model for 'configurable special areas'.
7. **Proposed primary mechanic.** Room construction: the Fart Zone as a configurable facility (ventilation stats from the portholes, capacity from the queue rope, safety from signs); its quality affects every later Fart Zone procedure.
8. **Secondary mechanics.** Vindicta's no-exemption confrontation.
9. **Enemies, puzzles, timers, hazards, resources.** Clearing heavy junk, freeing seized portholes (timing bar).
10. **Failure conditions and consequences.** Poorly built → procedures leak (exposure) later.
11. **Dependencies.** Entry: p16c3 (p16c3.bbk -> p16c4.begin). Start flag: `p16_ch189_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 17 (room crew_quarters, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc squawks, npc bob, npc jim). In-room hooks into this chapter: map objects in stenchmaster_fart_zone ×12, main_deck ×1; NPC dialogue in brogath, garrick, vindicta.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'Not the Fart-FREE Zone. The other one. The opposite one.' stays.

### `p16c5` · Chapter 190: Vindicta's Legendary Emergency

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p16c5`, Chapter 190: Vindicta's Legendary Emergency. Scripts: 12 in `data/story/cutscenes/phase16/ch190_193.json`. Quests: `vindictas_emergency` “Vindicta's Legendary Emergency” in `data/quests/phase16.json`.
2. **Events and dialogue.** Vindicta's Legendary Emergency: find the clucking (five chalk X's); Vindicta needs the Fart Zone NOW; run the procedure (door, portholes); Agnes is in there – watch the gap, grab, run. Dialogue: 46 lines ((narration) 26, vindicta 11, brogath 3, captain 2, pete 2, squawks 1, agnes_second 1); 0 choice prompt(s) with 0 options. Presentation: shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: vindicta, brogath, pete, squawks, agnes_second. NPCs with dialogue keyed to an objective (hints, reactions or completions): vindicta, agnes_second. Rooms: `cargo_hold`, `crew_quarters`, `galley`, `main_deck`, `stenchmaster_fart_zone`. Interactables: `p16_hen_hold` (cargo_hold 10,15), `p16_hen_bunks` (crew_quarters 16,9), `p16_hen_sashes` (crew_quarters 12,8), `p16_hen_barrels` (galley 16,4), `p16_hen_grating` (main_deck 9,16), `p16_v_portholes` (stenchmaster_fart_zone 6,3), `p16_v_door` (stenchmaster_fart_zone 6,9), `p16_v_rescue` (stenchmaster_fart_zone 6,9). Flags set: 13 (`p16_ch190_started`, `p16_hen_bunks`, `p16_hen_barrels`, `p16_hen_hold`, `p16_hen_sashes`, `p16_hen_grating`, `p16_hen_search_said`, `p16_vindicta_queued`, `p16_vproc_portholes`, `p16_vproc_door`, +3 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Find the clucking (chalk X by each): quarters cot, galley barrel, hold bilge pump, quarters sash pile, deck grating” [event×5]; “Vindicta needs the Fart Zone. NOW. (Vindicta, by the grating, on deck)” [flag]; “Run the procedure: the door and the portholes (the Fart Zone)” [event×2]; “AGNES IS IN THERE. Get her out (the Fart Zone: watch the gap, grab, run)” [flag]. Mechanics invoked by the scripts: Fart Zone procedure ×7, timing bar (repair) ×3, stability change ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Presentation-only effects with no player input: Fart Zone procedure ×7, stability change ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The Fart Zone procedure system exists; a rescue under a countdown.
7. **Proposed primary mechanic.** Timed rescue: search for Agnes (sound cues) while Vindicta's pressure builds; then the procedure; then a gap-timing grab inside the zone.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Countdown, gap timing.
10. **Failure conditions and consequences.** Grab missed → Agnes 'dazed' (cosmetic) and exposure; retry.
11. **Dependencies.** Entry: p16c4 (p16c4.vindicta -> p16c5.begin). Start flag: `p16_ch190_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 13 (room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc squawks, npc bob). In-room hooks into this chapter: map objects in stenchmaster_fart_zone ×3, crew_quarters ×2, galley ×1, cargo_hold ×1, main_deck ×1; NPC dialogue in agnes_second, vindicta.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'A single brown feather, still warm.' stays.

### `p16c6` · Chapter 191: The Near-Miss

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p16c6`, Chapter 191: The Near-Miss. Scripts: 5 in `data/story/cutscenes/phase16/ch190_193.json`. Quests: `chicken_near_miss` “The Near-Miss” in `data/quests/phase16.json`.
2. **Events and dialogue.** The Near-Miss: Brogath won't let go of Agnes; Agnes puts her head in the beard; steady Brogath; watch; calm down. Dialogue: 17 lines ((narration) 8, brogath 4, pete 3, captain 2); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): agnes_second, brogath, pete. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 5 (`p16_ch191_started`, `p16_agnes_sniffed`, `p16_nm_steadied`, `brogath_chicken_near_miss`, `p16_nm_calm`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Agnes and the beard (Agnes, Crew Quarters)” [flag]; “Steady Brogath (Brogath, Crew Quarters)” [flag]; “Watch it happen (Brogath, Crew Quarters)” [flag]; “Calm down (Pete, Crew Quarters)” [flag]. Mechanics invoked by the scripts: stability change ×4, Fart Zone procedure ×1, Brogath reassurance prompt ×1.
5. **Classification.** Choice or puzzle prompt (Brogath reassurance prompt ×1). Presentation-only effects with no player input: stability change ×4, Fart Zone procedure ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Short.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p16c5 (p16c5.rescue -> p16c6.begin). Start flag: `p16_ch191_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 1 (room crew_quarters, room galley, room main_deck, room stenchmaster_fart_zone, npc squawks, npc pete, npc brogath). In-room hooks into this chapter: map objects in none; NPC dialogue in agnes_second, brogath, pete.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'because the Sharkstorm is a circle. You don't say so.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p16c7` · Chapter 192: Chicken-Town

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p16c7`, Chapter 192: Chicken-Town. Scripts: 13 in `data/story/cutscenes/phase16/ch190_193.json`. Quests: `chicken_town` “Chicken-Town” in `data/quests/phase16.json`.
2. **Events and dialogue.** Chicken-Town: think it through at the rail; tell everyone to stop interfering; sit and do nothing; see the mellow ship. Dialogue: 35 lines ((narration) 15, captain 5, garrick 4, pete 3, visitor_two 2, visitor_one 2, brogath 2, hale 1, +1 more); 0 choice prompt(s) with 0 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, visitor_two, visitor_one, brogath, hale, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, pete, visitor_one, visitor_two, jim. Rooms: `crew_quarters`, `main_deck`. Interactables: `p16_think` (main_deck 16,13), `p16_wait` (crew_quarters 2,10), `p16_walk_rail` (main_deck 16,13). Flags set: 13 (`p16_ch192_started`, `chicken_town_waft_unlocked`, `p16_hands_garrick`, `p16_hands_visitors`, `p16_hands_pete`, `p16_hands_said`, `chicken_town_great_mellowing_complete`, `p16_walk_garrick`, `p16_walk_jim`, `p16_walk_pete`, +3 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Think it through (any rail, on deck)” [flag]; “Tell everybody to stop interfering (Garrick, the visitors, Pete: Crew Quarters)” [event×3]; “Sit down on your pad and do nothing (Crew Quarters)” [flag]; “See the mellow ship (galley: Garrick, Jim; on deck: Pete, the visitors, the Sharkstorm from any rail)” [event×5]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A deliberate 'do nothing' beat.
7. **Proposed primary mechanic.** Keep; the 'sit and do nothing' is a lovely anti-mechanic (wait without input).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p16c6 (p16c6.calm -> p16c7.begin). Start flag: `p16_ch192_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 12 (room crew_quarters, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc squawks, npc jim, npc gristle). In-room hooks into this chapter: map objects in main_deck ×2, crew_quarters ×1; NPC dialogue in garrick, jim, pete, visitor_one, visitor_two.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'The chicken just needs to chicken.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p16c8` · Chapter 193: The Grand Dispensary

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p16c8`, Chapter 193: The Grand Dispensary. Scripts: 5 in `data/story/cutscenes/phase16/ch190_193.json`. Quests: `grand_dispensary` “The Grand Dispensary” in `data/quests/phase16.json`.
2. **Events and dialogue.** The Grand Dispensary: Brogath can do it while relaxed; the counter; serve five customers. Dialogue: 13 lines ((narration) 6, brogath 4, pete 1, captain 1, garrick 1); 0 choice prompt(s) with 0 options. Presentation: insert ×2, shake ×1, giveItem ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete, garrick. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `crew_quarters`. Interactables: `p16_disp_look` (crew_quarters 12,14), `p16_disp_serve` (crew_quarters 12,14). Flags set: 4 (`p16_ch193_started`, `p16_dispensary_appeared`, `grand_dispensary_opened`, `p16_disp_said`); items given: dispensary_visor.
4. **Current player actions and mechanics.** Objectives: “Brogath's discovery (Brogath, Crew Quarters)” [flag]; “Look at it (the counter, Crew Quarters)” [flag]; “Serve the customers (ring the bell on the counter, Crew Quarters)” [event×5]. Mechanics invoked by the scripts: teller window ×1, stability change ×1.
5. **Classification.** Timing / skill input (teller window ×1). Presentation-only effects with no player input: stability change ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Teller variant.
7. **Proposed primary mechanic.** Keep with teller rules variant.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Queue.
10. **Failure conditions and consequences.** Repeat.
11. **Dependencies.** Entry: p16c7 (p16c7.walk_done -> p16c8.begin). Start flag: `p16_ch193_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room crew_quarters, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in crew_quarters ×2; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Watch. (he doesn't do anything) ...There.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p16c9` · Chapter 194: The Sash Lounge

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p16c9`, Chapter 194: The Sash Lounge. Scripts: 5 in `data/story/cutscenes/phase16/ch194_197.json`. Quests: `bankworth` “The Sash Lounge and the Return of the Grand Bank” in `data/quests/phase16.json`.
2. **Events and dialogue.** The Sash Lounge built by the crew; singing; Bankworth arrives at the counter; his opening deposit. Dialogue: 14 lines ((narration) 4, bankworth 3, pete 2, gristle 1, bob 1, crew 1, captain 1, garrick 1); 0 choice prompt(s) with 0 options. Presentation: shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: bankworth, pete, gristle, bob, crew, garrick. NPCs with dialogue keyed to an objective (hints, reactions or completions): pete, bankworth. Rooms: `crew_quarters`. Interactables: `p16_lounge` (crew_quarters 5,3), `p16_deposit` (crew_quarters 12,14). Flags set: 6 (`p16_ch194_started`, `sash_lounge_built`, `p16_song_heard`, `bank_reconstituted`, `bankworth_arrived`, `p16_bankworth_deposit`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Look at what the crew have built (the Sash Lounge, Crew Quarters)” [flag]; “Is that SINGING? (the Sash Lounge)” [flag]; “The gentleman at the counter (Bankworth, Crew Quarters)” [flag]; “His opening deposit (ring the bell on the counter)” [flag]. Mechanics invoked by the scripts: teller window ×1.
5. **Classification.** Timing / skill input (teller window ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** New character Bankworth; new furniture (lounge).
7. **Proposed primary mechanic.** Keep; the Sash Lounge becomes a permanent crew leisure area in the quarters layout.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p16c8 (p16c8.serve_done -> p16c9.begin). Start flag: `p16_ch194_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room crew_quarters, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc bob, npc jim, npc gristle). In-room hooks into this chapter: map objects in crew_quarters ×2; NPC dialogue in bankworth, pete.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'And I've touched a mermaid.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p16c10` · Chapter 195: The Grand Currency Converter

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p16c10`, Chapter 195: The Grand Currency Converter. Scripts: 4 in `data/story/cutscenes/phase16/ch194_197.json`. Quests: `currency_converter` “The Grand Currency Converter” in `data/quests/phase16.json`.
2. **Events and dialogue.** The Grand Currency Converter machine: look, insert a token, take the receipt. Dialogue: 14 lines ((narration) 8, bankworth 3, converter_voice 2, captain 1); 0 choice prompt(s) with 0 options. Presentation: shake ×1, insert ×1, giveItem ×1.
3. **Characters, locations, props, flags.** Speaking characters: bankworth, converter_voice. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`. Interactables: `p16_machine` (crew_quarters 7,14), `p16_insert` (crew_quarters 7,14), `p16_receipt` (crew_quarters 7,14). Flags set: 4 (`p16_ch195_started`, `currency_converter_discovered`, `currency_converter_first_use`, `p16_receipt_read`); items given: converter_receipt.
4. **Current player actions and mechanics.** Objectives: “Look at the machine (the purple machine by the mast, left of the counter, Crew Quarters)” [flag]; “Put one Grand Token from the till in it (the converter)” [flag]; “Take the receipt (the converter)” [flag]. Mechanics invoked by the scripts: converter ×1.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: converter ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Converter system.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p16c9 (p16c9.deposit -> p16c10.begin). Start flag: `p16_ch195_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room crew_quarters, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc bob, npc gristle, npc pete). In-room hooks into this chapter: map objects in crew_quarters ×3; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'You're fairly sure.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p16c11` · Chapter 196: Grand Sashback Rewards

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p16c11`, Chapter 196: Grand Sashback Rewards. Scripts: 8 in `data/story/cutscenes/phase16/ch194_197.json`. Quests: `sashback_rewards` “Grand Sashback Rewards” in `data/quests/phase16.json`.
2. **Events and dialogue.** Grand Sashback Rewards: process credit applications by appraising sashes with the beard; Lady Rancidella redeems everything; save the haze; post the new policy. Dialogue: 26 lines ((narration) 11, bankworth 7, captain 2, rancidella 2, converter_voice 2, brogath 2); 0 choice prompt(s) with 0 options. Presentation: insert ×2, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: bankworth, rancidella, converter_voice, brogath. NPCs with dialogue keyed to an objective (hints, reactions or completions): rancidella, brogath. Rooms: `crew_quarters`. Interactables: `p16_credit_first` (crew_quarters 12,14), `p16_credit_more` (crew_quarters 12,14), `p16_credit_rancidella` (crew_quarters 12,14), `p16_redeem` (crew_quarters 7,14), `p16_policy` (crew_quarters 7,14). Flags set: 7 (`p16_ch196_started`, `sashback_credit_unlocked`, `p16_credit_said`, `p16_rancidella_approved`, `rancidella_redemption_complete`, `p16_tiny_green`, `converter_air_quality_policy`); items given: none.
4. **Current player actions and mechanics.** Objectives: “The first applicant (ring the bell on the counter, Crew Quarters)” [flag]; “Process the applications (ring the bell)” [event×2]; “Lady Rancidella (ring the bell)” [flag]; “She's redeeming it. ALL of it. (the converter)” [flag]; “Save the haze (Agnes and Brogath, under his canopy, Crew Quarters)” [flag]; “Post the new policy (the converter)” [flag]. Mechanics invoked by the scripts: teller window ×2, appraisal ×1, converter ×1.
5. **Classification.** Timing / skill input (teller window ×2, appraisal ×1). Presentation-only effects with no player input: converter ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Appraisal + teller + converter in one; the beard as a tool.
7. **Proposed primary mechanic.** Beard-appraisal underwriting: sniff-test sashes (Beard Saturation rises with each), approve/deny; Rancidella's redemption is a 'boss' application.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Saturation budget vs. accuracy.
10. **Failure conditions and consequences.** Bad approvals → the bank's haze drains (economy).
11. **Dependencies.** Entry: p16c10 (p16c10.receipt -> p16c11.begin). Start flag: `p16_ch196_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room crew_quarters, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc bob, npc gristle, npc pete). In-room hooks into this chapter: map objects in crew_quarters ×5; NPC dialogue in brogath, rancidella.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'You're the only underwriter on the seven seas with a nose like that.' stays.

### `p16c12` · Chapter 197: The Hornet Fart

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p16c12`, Chapter 197: The Hornet Fart. Scripts: 10 in `data/story/cutscenes/phase16/ch194_197.json`. Quests: `hornet_fart` “The Hornet Fart” in `data/quests/phase16.json`.
2. **Events and dialogue.** The Hornet Fart: Brogath's ancient idea to drive the sharks off; run the five-step posted procedure; watch from behind the rope; where did they go? Praise the swarm. Dialogue: 34 lines ((narration) 17, brogath 11, captain 3, pete 2, hale 1); 1 choice prompt(s) with 2 options. Presentation: shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete, hale. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `main_deck`, `stenchmaster_fart_zone`. Interactables: `p16_h_door` (stenchmaster_fart_zone 6,9), `p16_h_portholes` (stenchmaster_fart_zone 6,3), `p16_h_warning` (stenchmaster_fart_zone 4,3), `p16_h_release` (stenchmaster_fart_zone 12,7). Flags set: 10 (`p16_ch197_started`, `p16_hornet_idea`, `p16_hproc_door`, `p16_hproc_portholes`, `p16_hproc_sash`, `p16_hproc_warning`, `p16_hproc_said`, `hornet_fart_occurred`, `hornet_swarm_active`, `p16_hornet_praised`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Hear the idea (Brogath, under his canopy, Crew Quarters)” [flag]; “The posted procedure: Brogath in, door shut, portholes open, sash secure, warning up (the Fart Zone)” [event×4]; “Watch from behind the rope (the bench, the Fart Zone)” [flag]; “Where did they go? (on deck)” [flag]; “Say something about the swarm (Brogath, on deck)” [flag]. Mechanics invoked by the scripts: Fart Zone procedure ×8, stability change ×1, hornet state ×1, Brogath reassurance prompt ×1.
5. **Classification.** Choice or puzzle prompt (Brogath reassurance prompt ×1). Presentation-only effects with no player input: Fart Zone procedure ×8, stability change ×1, hornet state ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Fart Zone procedure (8 uses) – the system is mature.
7. **Proposed primary mechanic.** Procedure with a twist: the hornet state requires an extra step (timing the portholes to release the swarm towards the storm).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Procedure order + timing.
10. **Failure conditions and consequences.** Swarm released inside → p16c13 is harder.
11. **Dependencies.** Entry: p16c11 (p16c11.policy -> p16c12.begin). Start flag: `p16_ch197_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 9 (room crew_quarters, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in stenchmaster_fart_zone ×4; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** '...the HORNET...' stays.

### `p16c13` · Chapter 198: Stingbeard

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p16c13`, Chapter 198: Stingbeard. Scripts: 8 in `data/story/cutscenes/phase16/ch198_201.json`. Quests: `stingbeard` “Stingbeard” in `data/quests/phase16.json`.
2. **Events and dialogue.** Stingbeard: hornets nest in the beard; shoo them at the rail, the water barrel, the wheel; the name STINGBEARD; the crew's bunker plan; back to work. Dialogue: 30 lines ((narration) 12, pete 7, captain 6, bankworth 2, hale 1, visitor_two 1, crew 1); 0 choice prompt(s) with 0 options. Presentation: insert ×2.
3. **Characters, locations, props, flags.** Speaking characters: pete, bankworth, hale, visitor_two, crew. NPCs with dialogue keyed to an objective (hints, reactions or completions): pete. Rooms: `crew_quarters`, `main_deck`. Interactables: `p16_shoo_rail` (main_deck 16,13), `p16_shoo_barrel` (main_deck 4,8), `p16_shoo_wheel` (main_deck 9,6), `p16_back_to_work` (crew_quarters 12,14). Flags set: 9 (`p16_ch198_started`, `p16_shoo_rail`, `p16_shoo_barrel`, `p16_shoo_wheel`, `p16_shoo_said`, `stingbeard_nickname_unlocked`, `nickname_stingbeard`, `fart_free_zone_reinforced`, `p16_back_to_work`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Shoo them out of your beard (on deck): any rail, the water barrel by the wheel, the wheel” [event×3]; “...STINGBEARD? (anyone, on deck)” [flag]; “The crew have a plan (the Fart-Free Zone, in the hold)” [flag]; “Back to work (the bank counter, Crew Quarters)” [flag]. Mechanics invoked by the scripts: hornet state ×3, timing bar (repair) ×2.
5. **Classification.** Timing / skill input (timing bar (repair) ×2). Presentation-only effects with no player input: hornet state ×3. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The beard as a habitat – a Beard Saturation status variant.
7. **Proposed primary mechanic.** 'Hornet beard' status: movement makes swarm noise that disturbs crew; shoo attempts are a three-location timing challenge.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Swarm behaviour.
10. **Failure conditions and consequences.** Swarm stays → status lasts longer (cosmetic + crew avoidance).
11. **Dependencies.** Entry: p16c12 (p16c12.praise -> p16c13.begin). Start flag: `p16_ch198_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc squawks). In-room hooks into this chapter: map objects in main_deck ×3, crew_quarters ×1; NPC dialogue in pete.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'Captain, you're humming.' stays.

### `p16c14` · Chapter 199: Sash-Quote Story Hour

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p16c14`, Chapter 199: Sash-Quote Story Hour. Scripts: 5 in `data/story/cutscenes/phase16/ch198_201.json`. Quests: `sash_quote_story_hour` “Sash-Quote Story Hour” in `data/quests/phase16.json`.
2. **Events and dialogue.** Sash-Quote Story Hour via a speaking tube from the bunker; answer five; Brogath has one. Dialogue: 36 lines (garrick 9, brogath 5, jim 4, squawks 4, gristle 3, visitor_one 3, (narration) 2, captain 2, +3 more); 6 choice prompt(s) with 12 options. Presentation: none.
3. **Characters, locations, props, flags.** Speaking characters: garrick, brogath, jim, squawks, gristle, visitor_one, bob, crew, visitor_two. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `crew_quarters`. Interactables: `p16_tube` (crew_quarters 10,13), `p16_quote` (crew_quarters 10,13). Flags set: 4 (`p16_ch199_started`, `p16_story_hour_started`, `p16_quotes_said`, `sash_quote_story_hour_complete`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Answer the speaking tube (by the counter, Crew Quarters)” [flag]; “Sash-quote story hour (the speaking tube): answer five of them” [event×5]; “Brogath has one (Brogath, under his canopy, Crew Quarters)” [flag]. Mechanics invoked by the scripts: stability change ×1.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Choice-heavy (6/12).
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p16c13 (p16c13.work -> p16c14.begin). Start flag: `p16_ch199_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc squawks, npc bob). In-room hooks into this chapter: map objects in crew_quarters ×2; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'It's MANDATORY FUN, Captain.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p16c15` · Chapter 200: The Hornet Credit Boom

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p16c15`, Chapter 200: The Hornet Credit Boom. Scripts: 8 in `data/story/cutscenes/phase16/ch198_201.json`. Quests: `hornet_credit_boom` “The Hornet Credit Boom” in `data/quests/phase16.json`.
2. **Events and dialogue.** The Hornet Credit Boom: a hornet applies for credit with a beard hair as collateral; the epidemic; the bank's announcement; s'mores in the bunker. Dialogue: 22 lines ((narration) 9, bankworth 4, captain 3, hornet_bzz 2, garrick 2, converter_voice 1, pete 1); 0 choice prompt(s) with 0 options. Presentation: insert ×2, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: bankworth, hornet_bzz, garrick, converter_voice, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): bankworth. Rooms: `crew_quarters`. Interactables: `p16_bzz_apply` (crew_quarters 6,13), `p16_bzz_approve` (crew_quarters 6,13), `p16_bzz_convert` (crew_quarters 7,14), `p16_epidemic` (crew_quarters 12,14), `p16_smores` (crew_quarters 10,13). Flags set: 7 (`p16_ch200_started`, `p16_bzz_applied`, `p16_bzz_approved`, `p16_bzz_converted`, `p16_epidemic_said`, `hornet_credit_boom_occurred`, `p16_smores`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Look at the APPLY NOW terminal (next to the purple converter by the mast, Crew Quarters)” [flag]; “Process the application (the terminal)” [flag]; “Where's it going? (the converter)” [flag]; “They've ALL found out (the counter: serve them)” [event×3]; “The bank's announcement (Bankworth)” [flag]; “Meanwhile, in the bunker (the speaking tube)” [flag]. Mechanics invoked by the scripts: appraisal ×1, converter ×1, teller window ×1.
5. **Classification.** Timing / skill input (appraisal ×1, teller window ×1). Presentation-only effects with no player input: converter ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Teller variant.
7. **Proposed primary mechanic.** Keep; the epidemic is a rush shift (teller).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Rush.
10. **Failure conditions and consequences.** Repeat.
11. **Dependencies.** Entry: p16c14 (p16c14.brogath -> p16c15.begin). Start flag: `p16_ch200_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc squawks, npc bob). In-room hooks into this chapter: map objects in crew_quarters ×5; NPC dialogue in bankworth.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'NAME: BZBZBZBZZZZ-7.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p16c16` · Chapter 201: The History of the Grand Lighter

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p16c16`, Chapter 201: The History of the Grand Lighter. Scripts: 5 in `data/story/cutscenes/phase16/ch198_201.json`. Quests: `grand_lighter_history` “The History of the Grand Lighter” in `data/quests/phase16.json`.
2. **Events and dialogue.** The swarm leaves at sunset; get into the bunker; read the History of the Grand Lighter; react. Dialogue: 20 lines (garrick 10, (narration) 5, pete 2, bankworth 1, captain 1, brogath 1); 1 choice prompt(s) with 2 options. Presentation: vista ×1, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, bankworth, brogath. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `fart_free_zone`. Interactables: `p16_lore` (fart_free_zone 5,4). Flags set: 4 (`p16_ch201_started`, `p16_in_bunker`, `p16_lore_said`, `grand_lighter_history_unlocked`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Get into the bunker at last (the Fart-Free Zone, in the hold)” [flag]; “The History of the Grand Lighter (the lore book: three chapters)” [event×3]; “Say something (Garrick)” [flag]. Mechanics invoked by the scripts: hornet state ×2.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: hornet state ×2. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Lore.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p16c15 (p16c15.smores -> p16c16.begin). Start flag: `p16_ch201_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc squawks). In-room hooks into this chapter: map objects in fart_free_zone ×1; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'You are, for the moment, just Stinkbeard.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p16c17` · Chapter 202: The Portable Stenchmaster Entertainment System

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p16c17`, Chapter 202: The Portable Stenchmaster Entertainment System. Scripts: 7 in `data/story/cutscenes/phase16/ch202_205.json`. Quests: `portable_tv` “The Portable Stenchmaster Entertainment System” in `data/quests/phase16.json`.
2. **Events and dialogue.** The Portable S.E.S. comes out of Garrick's coat; fix the aerial; watch; turn it off twice. Dialogue: 24 lines ((narration) 11, garrick 6, pete 3, captain 1, channel_narrator 1, brogath 1, bankworth 1); 0 choice prompt(s) with 0 options. Presentation: vista ×1, tvProgram ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, channel_narrator, brogath, bankworth. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `fart_free_zone`. Interactables: `p16_aerial` (fart_free_zone 6,4), `p16_watch` (fart_free_zone 6,4), `p16_tv_off_1` (fart_free_zone 6,4), `p16_tv_off_2` (fart_free_zone 6,4). Flags set: 7 (`p16_ch202_started`, `portable_stenchmaster_tv_acquired`, `p16_portable_aerial`, `ignition_documentary_viewed`, `p16_tv_off_1`, `p16_tv_off_2`, `p16_tv_off_said`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Garrick's coat (Garrick, the Fart-Free Zone)” [flag]; “The aerial (the portable set)” [flag]; “Watch it (the portable set)” [flag]; “Turn it off (the portable set)” [event×2]. Mechanics invoked by the scripts: TV state change (scripted) ×3.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: TV state change (scripted) ×3. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** TV.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p16c16 (p16c16.react -> p16c17.begin). Start flag: `p16_ch202_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc pete, npc brogath). In-room hooks into this chapter: map objects in fart_free_zone ×4; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'His arm goes in up to the shoulder.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p16c18` · Chapter 203: The 97-Page Application

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p16c18`, Chapter 203: The 97-Page Application. Scripts: 4 in `data/story/cutscenes/phase16/ch202_205.json`. Quests: `ignition_application` “The 97-Page Application” in `data/quests/phase16.json`.
2. **Events and dialogue.** The 97-Page Application at the re-established Bureau of Ceremonial Ignition: a customer (Puffchester); the form; stamp it (proceeding mechanic). Dialogue: 14 lines ((narration) 5, puffchester 4, captain 3, bankworth 2); 0 choice prompt(s) with 0 options. Presentation: spawn ×1, move ×1, giveItem ×1, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: puffchester, bankworth. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`. Interactables: `p16_customer` (crew_quarters 12,14), `p16_form` (crew_quarters 12,14), `p16_stamp` (crew_quarters 12,14). Flags set: 4 (`p16_ch203_started`, `p16_puffchester_arrived`, `ignition_application_completed`, `p16_review_required`); items given: ignition_application_copy.
4. **Current player actions and mechanics.** Objectives: “A customer at the bureau (ring the bell on the counter, Crew Quarters)” [flag]; “The application (the counter: 97 pages)” [flag]; “Stamp it (the counter)” [flag]. Mechanics invoked by the scripts: proceeding (form/hearing/pitch) ×1.
5. **Classification.** Choice or puzzle prompt (proceeding (form/hearing/pitch) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Proceeding system.
7. **Proposed primary mechanic.** Keep; the 97 pages could be a short form-filling puzzle (reuse p15c15).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p16c17 (p16c17.off_done -> p16c18.begin). Start flag: `p16_ch203_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc pete, npc brogath). In-room hooks into this chapter: map objects in crew_quarters ×3; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Bureaus come back, Captain. Like banks.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p16c19` · Chapter 204: The Grand Ignition Hearing

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p16c19`, Chapter 204: The Grand Ignition Hearing. Scripts: 3 in `data/story/cutscenes/phase16/ch202_205.json`. Quests: `ignition_hearing` “The Grand Ignition Hearing” in `data/quests/phase16.json`.
2. **Events and dialogue.** The Grand Ignition Hearing before a spectral Council; who performs it? Dialogue: 14 lines ((narration) 4, council_chair 4, vindicta 3, captain 2, brogath 1); 0 choice prompt(s) with 0 options. Presentation: vista ×2, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: council_chair, vindicta, brogath. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`. Interactables: `p16_council` (crew_quarters 12,14), `p16_selected` (crew_quarters 12,14). Flags set: 3 (`p16_ch204_started`, `grand_ignition_hearing_approved`, `vindicta_selected_for_ignition`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Go before the Council (the counter, Crew Quarters)” [flag]; “Who performs it? (the Council)” [flag]. Mechanics invoked by the scripts: proceeding (form/hearing/pitch) ×1.
5. **Classification.** Choice or puzzle prompt (proceeding (form/hearing/pitch) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Hearing.
7. **Proposed primary mechanic.** Keep; the hearing is a short argument (proceeding) with evidence choices.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p16c18 (p16c18.stamp -> p16c19.begin). Start flag: `p16_ch204_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc pete, npc brogath). In-room hooks into this chapter: map objects in crew_quarters ×2; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'STINKbeard. The hornets have gone.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p16c20` · Chapter 205: Stinkbeard's Desperate Lighter Pitch

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p16c20`, Chapter 205: Stinkbeard's Desperate Lighter Pitch. Scripts: 4 in `data/story/cutscenes/phase16/ch202_205.json`. Quests: `lighter_pitch` “Stinkbeard's Desperate Lighter Pitch” in `data/quests/phase16.json`.
2. **Events and dialogue.** The Desperate Lighter Pitch: sell Lord Puffchester the lighter before Vindicta goes off; the next applicant; common sense. Dialogue: 35 lines ((narration) 14, captain 5, bureau_puffington 4, puffchester 3, vindicta 3, council_right 1, council_left 1, council_chair 1, +3 more); 0 choice prompt(s) with 0 options. Presentation: vista ×1, spawn ×1, move ×1.
3. **Characters, locations, props, flags.** Speaking characters: bureau_puffington, puffchester, vindicta, council_right, council_left, council_chair, bankworth, garrick, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`. Interactables: `p16_pitch` (crew_quarters 12,14), `p16_next` (crew_quarters 12,14), `p16_end` (crew_quarters 12,14). Flags set: 4 (`p16_ch205_started`, `puffchester_convinced`, `mechanical_ignition_victory`, `p16_complete`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Sell Lord Puffchester the lighter before Vindicta goes off (the Council)” [flag]; “The next applicant (ring the bell on the counter)” [flag]; “Common sense (the counter)” [flag]. Mechanics invoked by the scripts: proceeding (form/hearing/pitch) ×1, lighter clicks ×1.
5. **Classification.** Choice or puzzle prompt (proceeding (form/hearing/pitch) ×1). Presentation-only effects with no player input: lighter clicks ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A pitch under a countdown.
7. **Proposed primary mechanic.** Pitch duel: the proceeding mechanic with Vindicta's pressure as a visible timer; the lighter's reliability (from p16c2) affects the demo.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Timer, lighter misfire.
10. **Failure conditions and consequences.** Vindicta goes off → exposure and the pitch restarts.
11. **Dependencies.** Entry: p16c19 (p16c19.selected -> p16c20.begin). Start flag: `p16_ch205_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room crew_quarters, room fart_free_zone, room galley, room main_deck, room stenchmaster_fart_zone, npc garrick, npc pete, npc brogath). In-room hooks into this chapter: map objects in crew_quarters ×3; NPC dialogue in none.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'Point of order. My lord. Before the ceremony. One small demonstration.' stays.
