# Story inventory, Phase 15: The Great Mellowing

Chapters: 16 (p15c1 to p15c16). Dialogue lines: 975. Classification: Timing / skill input 8, Walk + press A 6, Choice or puzzle prompt 2.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE15.md`, `data/quests/phase15.json`, `data/story/cutscenes/phase15/`, `data/story/flags/phase15.json`, `tests/phase15_story.test.js`, `tests/phase15Play.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p15c1` · Chapter 170: The Stenchmaster Channel Presents

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p15c1`, Chapter 170: The Stenchmaster Channel Presents. Scripts: 17 in `data/story/cutscenes/phase15/ch170_172.json`. Quests: `stenchmaster_channel_presents` “The Stenchmaster Channel Presents” in `data/quests/phase15.json`.
2. **Events and dialogue.** The Mark II has been on for three days unplugged; check the five safety-protocol stations round it; Garrick wants snacks; watch 'The Age of Fart Commerce' with Brogath. Dialogue: 68 lines (brogath 18, captain 11, (narration) 9, pete 8, garrick 7, jim 4, gristle 3, squawks 3, +4 more); 1 choice prompt(s) with 3 options. Presentation: vista ×1, channelEpisode ×1, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete, garrick, jim, gristle, squawks, bob, ned, channel_narrator, crew. NPCs with dialogue keyed to an objective (hints, reactions or completions): squawks, bob, jim, gristle, pete, garrick, brogath. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 10 (`p15_started`, `p15_ch170_started`, `p15_st_pete`, `p15_st_gristle`, `p15_st_bob`, `p15_st_jim`, `p15_st_squawks`, `p15_no_beans`, `p15_stations_said`, `p15_aofc_watched`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Check the safety protocol stations round the Mark II (Pete, Gristle, Bob, Jim, Squawks)” [event×5]; “Garrick wants snacks (Garrick)” [flag]; “Watch the Age of Fart Commerce with him (Brogath, front row of the galley)” [flag]. Mechanics invoked by the scripts: stability change ×3.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×3. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Crew stations around a hazard already exist in the fiction ('safety protocol stations').
7. **Proposed primary mechanic.** Station check as a Crew-stations tutorial: each station has a job (blanket ready, napkin held, Squawks still) that must be maintained while the episode plays (Brogath Pressure).
8. **Secondary mechanics.** Snack run (fetch).
9. **Enemies, puzzles, timers, hazards, resources.** Stations slipping as crew get bored.
10. **Failure conditions and consequences.** Station abandoned → stability dip.
11. **Dependencies.** Entry: story trigger p15_stations: {all:[{objectiveDone:stenchmaster_channel_presents.stations},{objectiveDone:stenchmaster_channel_presents.snacks},{notFlag:p15_stations_said}]}. Start flag: `p15_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room captains_quarters, room cargo_hold, room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks). In-room hooks into this chapter: map objects in none; NPC dialogue in bob, brogath, garrick, gristle, jim, pete, squawks.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'It hit me BACK.' stays.

### `p15c2` · Chapter 171: The Top Ten Most Embarrassing Sash Flutters

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p15c2`, Chapter 171: The Top Ten Most Embarrassing Sash Flutters. Scripts: 9 in `data/story/cutscenes/phase15/ch170_172.json`. Quests: `top_ten_flutters` “The Top Ten Most Embarrassing Sash Flutters” in `data/quests/phase15.json`.
2. **Events and dialogue.** The Top Ten Most Embarrassing Sash Flutters: something is burning (stove, lantern, Mark II); work out the source with Pete; get air on deck; make it stop. Dialogue: 69 lines ((narration) 35, pete 11, captain 9, brogath 6, garrick 2, hale 2, jim 1, bob 1, +2 more); 0 choice prompt(s) with 0 options. Presentation: shake ×4, vista ×1, channelEpisode ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, brogath, garrick, hale, jim, bob, gristle, channel_narrator. NPCs with dialogue keyed to an objective (hints, reactions or completions): pete. Rooms: `galley`, `main_deck`. Interactables: `p15_burn_stove` (galley 2,4), `p15_burn_lantern` (galley 7,7), `p15_burn_tv` (galley 16,7), `p15_mk2_stop` (galley 16,7). Flags set: 12 (`p15_ch171_started`, `p15_top_ten_watched`, `p15_first_skunk_waft`, `p15_burn_stove`, `p15_burn_lantern`, `p15_burn_tv`, `p15_burning_said`, `p15_skunk_vision`, `p15_skunk_source`, `p15_air`, +2 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Find what's burning (the stove, the lantern over the long table, the Mark II)” [event×3]; “Work out where it's really coming from (Pete, in the galley)” [flag]; “Get some air (up on deck)” [flag]; “Make it STOP (the Mark II, in the galley)” [flag]. Mechanics invoked by the scripts: stability change ×5, timing bar (repair) ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Presentation-only effects with no player input: stability change ×5. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Small investigation + hazard.
7. **Proposed primary mechanic.** Smoke investigation: follow the smell gradient (Atmosphere) to the real source while Garrick's laughing threatens Brogath's stability.
8. **Secondary mechanics.** Keep Garrick quiet (interrupt prompts).
9. **Enemies, puzzles, timers, hazards, resources.** Smoke, laughter interrupts.
10. **Failure conditions and consequences.** Stability dip → toot.
11. **Dependencies.** Entry: p15c1 (p15c1.watch -> p15c2.begin). Start flag: `p15_ch171_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 9 (room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in galley ×4; NPC dialogue in pete.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'The GOAT.' and Garrick 'making a noise like a kettle' stay.

### `p15c3` · Chapter 172: Family of Idiots

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p15c3`, Chapter 172: Family of Idiots. Scripts: 9 in `data/story/cutscenes/phase15/ch170_172.json`. Quests: `family_of_idiots` “Family of Idiots” in `data/quests/phase15.json`.
2. **Events and dialogue.** Family of Idiots: find Brogath sad in the quarters; stop the cardboard plan (Mega-Pack box, Garrick's sketches, Brogath); research who they were; tell him no, kindly. Dialogue: 78 lines (brogath 20, captain 16, (narration) 14, codex 7, pete 6, garrick 5, jim 4, gristle 3, +3 more); 1 choice prompt(s) with 2 options. Presentation: insert ×4.
3. **Characters, locations, props, flags.** Speaking characters: brogath, codex, pete, garrick, jim, gristle, squawks, ned, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath, garrick. Rooms: `crew_quarters`, `fart_free_zone`. Interactables: `p15_nc_box` (crew_quarters 12,8), `p15z_lore` (fart_free_zone 5,4). Flags set: 16 (`p15_ch172_started`, `p15_brogath_quiet`, `p15_nc_box`, `p15_nc_sketch`, `p15_nc_steady`, `p15_plan_said`, `ancient_lore_ledger`, `ancient_lore_tilda`, `ancient_lore_ned`, `ancient_lore_harold`, +6 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Find Brogath (the Crew Quarters)” [flag]; “Stop the cardboard plan: the Mega-Pack box, Garrick's sketches, and Brogath himself (the Crew Quarters)” [event×3]; “Find out who they were (the pocket edition, in the Fart-Free Zone)” [event×4]; “Tell him no. Kindly. (Brogath, in the Crew Quarters)” [flag]. Mechanics invoked by the scripts: stability change ×5, Brogath reassurance prompt ×3.
5. **Classification.** Choice or puzzle prompt (Brogath reassurance prompt ×3). Presentation-only effects with no player input: stability change ×5. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** An emotional beat with Brogath; research.
7. **Proposed primary mechanic.** Keep mostly narrative; reassurance prompts become a gentle conversation puzzle (pick the kind truth).
8. **Secondary mechanics.** Research in the Fart-Free Zone (codex).
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** Unkind answer → stability dip (recoverable).
11. **Dependencies.** Entry: p15c2 (p15c2.stop -> p15c3.begin). Start flag: `p15_ch172_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 6 (room crew_quarters, room fart_free_zone, room galley, npc garrick, npc squawks, npc ned, npc jim, npc gristle). In-room hooks into this chapter: map objects in crew_quarters ×1, fart_free_zone ×1; NPC dialogue in brogath, garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'Brogath sad.' from Squawks stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p15c4` · Chapter 173: The Grand Economic Recovery

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p15c4`, Chapter 173: The Grand Economic Recovery. Scripts: 5 in `data/story/cutscenes/phase15/ch173_176.json`. Quests: `grand_economic_recovery` “The Grand Economic Recovery” in `data/quests/phase15.json`.
2. **Events and dialogue.** The Grand Economic Recovery: check the emergency reserve under the floorboard; get the 20,000 tokens on deck; everyone stand clear; let Garrick provoke Brogath. Dialogue: 64 lines ((narration) 23, brogath 15, garrick 11, captain 7, pete 5, ned 2, bob 1); 1 choice prompt(s) with 2 options. Presentation: shake ×2.
3. **Characters, locations, props, flags.** Speaking characters: brogath, garrick, pete, ned, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): pete, garrick. Rooms: `captains_quarters`, `galley`. Interactables: `p15_reserve` (captains_quarters 15,7), `p15_crate_up` (galley 13,9). Flags set: 6 (`p15_ch173_started`, `captain_reserve_counted`, `p15_crate_on_deck`, `p15_stand_clear`, `skunk_weed_cargo`, `p15_economic_waft`); items given: none.
4. **Current player actions and mechanics.** Objectives: “First: check the emergency reserve (the loose floorboard at the foot of the bed, Captain's Quarters)” [flag]; “Get the tokens up on deck, away from everything (the crate, in the galley)” [flag]; “Everybody stand clear (Pete, on deck)” [flag]; “Let Garrick make him angry (Garrick, on deck). You are going to regret this.” [flag]. Mechanics invoked by the scripts: stability change ×9, Grand Currency conversion ×1.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×9, Grand Currency conversion ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Uses the Grand Currency conversion system.
7. **Proposed primary mechanic.** Keep; the provocation is a controlled eruption the player positions (where to put the crate on deck matters for wind).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Placement relative to wind.
10. **Failure conditions and consequences.** Wrong spot → cargo mountain blocks the deck route (clean up later).
11. **Dependencies.** Entry: p15c3 (p15c3.tell -> p15c4.begin). Start flag: `p15_ch173_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc ned, npc jim). In-room hooks into this chapter: map objects in captains_quarters ×1, galley ×1; NPC dialogue in garrick, pete.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'You are going to regret this.' objective text stays.

### `p15c5` · Chapter 174: Creative Conversion

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p15c5`, Chapter 174: Creative Conversion. Scripts: 11 in `data/story/cutscenes/phase15/ch173_176.json`. Quests: `creative_conversion` “Creative Conversion” in `data/quests/phase15.json`.
2. **Events and dialogue.** Creative Conversion: the tokens have become a cargo mountain of skunky plant matter; the reserve is gone too; sort five piles; hear the Economic Recovery Report; something comes out of the Sharkstorm. Dialogue: 46 lines ((narration) 25, brogath 8, captain 7, pete 3, garrick 2, squawks 1); 0 choice prompt(s) with 0 options. Presentation: insert ×3.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete, garrick, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `captains_quarters`, `main_deck`. Interactables: `p15_cargo_first` (main_deck 5,26), `p15_reserve_gone` (captains_quarters 15,7), `p15_sort_dust` (main_deck 7,26), `p15_sort_stems` (main_deck 5,27), `p15_sort_seeds` (main_deck 6,27), `p15_sort_leaf` (main_deck 7,27), `p15_sort_skunky` (main_deck 5,27), `p15_bbk_token` (main_deck 11,23). Flags set: 11 (`p15_ch174_started`, `p15_cargo_seen`, `p15_reserve_gone`, `p15_sort_stems`, `p15_sort_seeds`, `p15_sort_leaf`, `p15_sort_dust`, `p15_sort_skunky`, `p15_sort_said`, `p15_report_heard`, +1 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “See what the tokens became (the deck, where the crate was)” [flag]; “Check the reserve. Please. (the floorboard, Captain's Quarters)” [flag]; “Sort it: stems, seeds, leaf, dust, and one especially skunky crate (the cargo mountain, on deck)” [event×5]; “Hear the Economic Recovery Report (Brogath, on deck)” [flag]; “Something's coming out of the Sharkstorm (the deck)” [flag]. Mechanics invoked by the scripts: stability change ×4, Brogath reassurance prompt ×3.
5. **Classification.** Choice or puzzle prompt (Brogath reassurance prompt ×3). Presentation-only effects with no player input: stability change ×4. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Sorting job.
7. **Proposed primary mechanic.** Sorting under time (the smell spreads): five categories, carry to the right place; Beard Saturation rises nearby.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Smell spread, carry.
10. **Failure conditions and consequences.** Unsorted → lingering deck haze.
11. **Dependencies.** Entry: p15c4 (p15c4.provoke -> p15c5.begin). Start flag: `p15_ch174_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 9 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in main_deck ×7, captains_quarters ×1; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** '...Productive.' from Garrick stays.

### `p15c6` · Chapter 175: Stinkbeard's Select Scent of Skunk

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p15c6`, Chapter 175: Stinkbeard's Select Scent of Skunk. Scripts: 14 in `data/story/cutscenes/phase15/ch173_176.json`. Quests: `stinkbeards_select` “Stinkbeard's Select Scent of Skunk” in `data/quests/phase15.json`.
2. **Events and dialogue.** Two visitors in a small boat are spat onto the deck; meet them; make a sale; make them a safe corner at the bow (sand, water, sign); show them round; explain a Grand Stenchmaster fart. Dialogue: 73 lines ((narration) 19, visitor_one 16, captain 15, visitor_two 12, garrick 5, brogath 2, gristle 2, hale 1, +1 more); 0 choice prompt(s) with 0 options. Presentation: shake ×2, spawn ×2, insert ×2, giveItem ×1.
3. **Characters, locations, props, flags.** Speaking characters: visitor_one, visitor_two, garrick, brogath, gristle, hale, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): visitor_one, visitor_two, garrick. Rooms: `galley`, `main_deck`. Interactables: `p15_boat` (main_deck 12,29), `p15_corner_sand` (main_deck 7,37), `p15_corner_water` (main_deck 12,37), `p15_corner_sign` (main_deck 9,36), `p15_tour_tv` (galley 16,7), `p15_tour_sashes` (galley 13,6). Flags set: 16 (`p15_ch175_started`, `p15_boat_landed`, `modern_visitors_aboard`, `p15_boat_seen`, `p15_met_one`, `p15_met_two`, `p15_first_sale`, `p15_corner_sand`, `p15_corner_water`, `p15_corner_sign`, +6 more); items given: modern_cash.
4. **Current player actions and mechanics.** Objectives: “See what the Sharkstorm spat out (the deck)” [flag]; “Meet them (the two visitors, by their boat)” [event×2]; “Make a sale (Stoner #1, on deck)” [flag]; “Make them a safe corner at the bow (the chalk marks at the front of the deck: sand, water, a sign)” [event×3]; “Show them round (Garrick; in the galley, the Mark II and the sashes)” [event×3]; “Explain what a Grand Stenchmaster fart actually is (the visitors, at the bow)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** New characters arrive (the visitors). Crew-integration: they need a place aboard.
7. **Proposed primary mechanic.** Guest onboarding: assign the visitors a proper bunk/corner (Crew system: guests), give the tour (teaches the ship layout to the player too).
8. **Secondary mechanics.** Trade (sale) as a barter mini-system.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p15c5 (p15c5.king -> p15c6.begin). Start flag: `p15_ch175_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 12 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc jim). In-room hooks into this chapter: map objects in main_deck ×4, galley ×2; NPC dialogue in garrick, visitor_one, visitor_two.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'is that a COOL BOX?' and the folding chair still standing stay.

### `p15c7` · Chapter 176: The Chicken Incident

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p15c7`, Chapter 176: The Chicken Incident. Scripts: 5 in `data/story/cutscenes/phase15/ch173_176.json`. Quests: `chicken_incident` “The Chicken Incident” in `data/quests/phase15.json`.
2. **Events and dialogue.** The Chicken Incident on the Stenchmaster Channel; the TV has no insides yet plays; say no to the visitors' clambake idea; retreat to the Fart-Free Zone. Dialogue: 35 lines (captain 8, brogath 8, visitor_one 5, pete 4, visitor_two 4, (narration) 3, channel_narrator 1, gristle 1, +1 more); 1 choice prompt(s) with 3 options. Presentation: vista ×2, channelEpisode ×2.
3. **Characters, locations, props, flags.** Speaking characters: brogath, visitor_one, pete, visitor_two, channel_narrator, gristle, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath, visitor_one, visitor_two. Rooms: `fart_free_zone`, `galley`. Interactables: `p15_tv_back` (galley 16,7). Flags set: 7 (`p15_ch176_started`, `tv_possessed_reactivation`, `p15_wrath_watched`, `p15_tv_back`, `p15_agnes_watched`, `brogath_rule_not_selectable`, `stenchmaster_farts_not_selectable`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Go and look (the Mark II, in the galley)” [flag]; “Watch it (Brogath, in the galley)” [flag]; “Say no to the visitors' idea (the visitors, in the galley)” [flag]; “Retreat (the Fart-Free Zone)” [flag]. Mechanics invoked by the scripts: stability change ×4.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×4. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Short.
7. **Proposed primary mechanic.** Keep.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p15c6 (p15c6.explain -> p15c7.begin). Start flag: `p15_ch176_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc gristle, npc pete). In-room hooks into this chapter: map objects in galley ×1; NPC dialogue in brogath, visitor_one, visitor_two.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'It's got no INSIDES. The Captain's got its insides. They're on the FLOOR.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p15c8` · Chapter 177: The Grand Paranoia

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p15c8`, Chapter 177: The Grand Paranoia. Scripts: 12 in `data/story/cutscenes/phase15/ch177_180.json`. Quests: `grand_paranoia` “The Grand Paranoia” in `data/quests/phase15.json`.
2. **Events and dialogue.** The Grand Paranoia: the visitors call the captain's beard an archive; assess six 'threats' in the galley (mug, mop, creaking wall...); train the guards; come down; make a rule (38 inserts, 8 choices). Dialogue: 113 lines ((narration) 39, captain 19, visitor_one 12, visitor_two 12, pete 11, squawks 7, bob 6, brogath 3, +2 more); 8 choice prompt(s) with 40 options. Presentation: insert ×38, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: visitor_one, visitor_two, pete, squawks, bob, brogath, garrick, gristle. NPCs with dialogue keyed to an objective (hints, reactions or completions): squawks, bob, pete, brogath, visitor_one, visitor_two. Rooms: `crew_quarters`, `fart_free_zone`, `galley`. Interactables: `p15_threat_mug` (galley 7,7), `p15_threat_mop` (galley 16,11), `p15_threat_hull` (galley 3,3), `p15z_recover` (fart_free_zone 1,4), `p15_rule_beard` (crew_quarters 9,12). Flags set: 16 (`p15_zone_retreat`, `p15_ch177_started`, `p15_beard_paranoia`, `beard_experiment_done`, `p15_paranoia_out`, `p15_threat_pete`, `p15_threat_mug`, `p15_threat_bob`, `p15_threat_mop`, `p15_threat_squawks`, +6 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Assess the threats in the galley (Pete, Bob, Squawks, a mug on the table, the mop, the creaking wall by the aprons)” [event×6]; “Train the guards (the visitors, in the galley)” [flag]; “Come down (the mattress, in the Fart-Free Zone)” [flag]; “Make a rule (the Brogath Rules board, Crew Quarters)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A second altered-state sequence (after p13c13), with many choices.
7. **Proposed primary mechanic.** Paranoia status: the captain misreads harmless objects as threats (sprite swaps); the player must check each threat calmly (inspect) rather than 'attack' it; wrong actions cost morale.
8. **Secondary mechanics.** Guard training as a short drill with the visitors.
9. **Enemies, puzzles, timers, hazards, resources.** Distinguishing real from imagined threats.
10. **Failure conditions and consequences.** Overreactions → crew morale down; no hard fail.
11. **Dependencies.** Entry: story trigger p15_zone: {all:[{objectiveActive:chicken_incident.retreat},{notFlag:p15_zone_retreat},{onMap:fart_free_zone}]}; story trigger p15_threats: {all:[{objectiveDone:grand_paranoia.assess},{notFlag:p15_threats_said}]}. Start flag: `p15_ch177_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 13 (trigger, room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob). In-room hooks into this chapter: map objects in galley ×3, fart_free_zone ×1, crew_quarters ×1; NPC dialogue in bob, brogath, pete, squawks, visitor_one, visitor_two.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'Your beard is like... an archive.' stays; the paranoia gags stay as the visual swaps.

### `p15c9` · Chapter 178: The Grand Stenchmaster's Grand Nap

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p15c9`, Chapter 178: The Grand Stenchmaster's Grand Nap. Scripts: 17 in `data/story/cutscenes/phase15/ch177_180.json`. Quests: `grand_stenchmaster_nap` “The Grand Stenchmaster's Grand Nap” in `data/quests/phase15.json`.
2. **Events and dialogue.** The Grand Nap (again): strip old bedding, fetch clean sashes, lay out sash bedding on chalk outlines, settle everyone, deal with the growling pillow, eject it over a rail, nap. Dialogue: 47 lines ((narration) 24, garrick 9, captain 8, pete 2, visitor_one 2, visitor_two 1, codex 1); 0 choice prompt(s) with 0 options. Presentation: insert ×2.
3. **Characters, locations, props, flags.** Speaking characters: garrick, pete, visitor_one, visitor_two, codex. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, pete, visitor_one, visitor_two. Rooms: `crew_quarters`, `main_deck`. Interactables: `p15_strip_a` (crew_quarters 1,5), `p15_strip_b` (crew_quarters 1,11), `p15_strip_c` (crew_quarters 5,6), `p15_sashes` (crew_quarters 12,8), `p15_bed_port` (crew_quarters 1,7), `p15_bed_stbd` (crew_quarters 3,13), `p15_bed_grand` (crew_quarters 11,9), `p15_pillow` (crew_quarters 16,6), `p15_eject` (main_deck 16,13), `p15_nap` (crew_quarters 2,10). Flags set: 17 (`p15_ch178_started`, `p15_strip_a`, `p15_strip_b`, `p15_strip_c`, `p15_sashes_fetched`, `p15_strip_said`, `p15_bed_port`, `p15_bed_stbd`, `p15_bed_grand`, `p15_beds_said`, +7 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Strip the old bedding (the three hammocks in the Crew Quarters)” [event×3]; “Fetch clean sashes (the Mega-Pack, Crew Quarters)” [flag]; “Lay out the clean sash bedding (the chalk outlines on the Crew Quarters floor)” [event×3]; “Settle everybody down (Pete, the visitors, Garrick: the Crew Quarters)” [event×3]; “Deal with the growling pillow (the cot on the right wall, Crew Quarters)” [flag]; “Get rid of it (over any rail, on deck)” [flag]; “Nap (your pad: navy and gold, by the CAPTAIN pennant, Crew Quarters)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Another quarters refresh; good to tie into permanent quarters.
7. **Proposed primary mechanic.** Quarters upkeep: bedding refresh is a recurring maintenance task (Crew conditions: rest quality).
8. **Secondary mechanics.** Growling pillow returns (mini-enemy from p13c3).
9. **Enemies, puzzles, timers, hazards, resources.** Pillow chase.
10. **Failure conditions and consequences.** Pillow escapes → find it.
11. **Dependencies.** Entry: p15c8 (p15c8.rule -> p15c9.begin). Start flag: `p15_ch178_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 14 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc jim). In-room hooks into this chapter: map objects in crew_quarters ×9, main_deck ×1; NPC dialogue in garrick, pete, visitor_one, visitor_two.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'It's lying down. With your eyes shut.' stays.

### `p15c10` · Chapter 179: The Nose-Fire Waft

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p15c10`, Chapter 179: The Nose-Fire Waft. Scripts: 7 in `data/story/cutscenes/phase15/ch177_180.json`. Quests: `nose_fire_waft` “The Nose-Fire Waft” in `data/quests/phase15.json`.
2. **Events and dialogue.** The Nose-Fire Waft: the captain sniffs his beard fringe and drifts; catch the pillow three times; throw it out; apologise to Brogath. Dialogue: 45 lines ((narration) 27, captain 11, brogath 6, visitor_one 1); 0 choice prompt(s) with 0 options. Presentation: shake ×4, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, visitor_one. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `crew_quarters`, `main_deck`. Interactables: `p15_catch_1` (crew_quarters 8,9), `p15_catch_2` (crew_quarters 5,7), `p15_catch_3` (crew_quarters 14,10), `p15_throw` (main_deck 16,13). Flags set: 7 (`p15_ch179_started`, `p15_nose_fire`, `p15_pillow2_caught`, `p15_catch_said`, `p15_pillow2_ejected`, `p15_apologised`, `bashfulness_branch_formed`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Catch the pillow (it won't stay still: the Crew Quarters)” [event×3]; “Throw it out (over any rail, on deck)” [flag]; “Apologise to Brogath (the Crew Quarters)” [flag]. Mechanics invoked by the scripts: stability change ×12, timing bar (repair) ×3.
5. **Classification.** Timing / skill input (timing bar (repair) ×3). Presentation-only effects with no player input: stability change ×12. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Beard Saturation consequence again.
7. **Proposed primary mechanic.** Altered-status catch: catch the evasive pillow while the 'mellow' status slows controls.
8. **Secondary mechanics.** Apology (reassurance).
9. **Enemies, puzzles, timers, hazards, resources.** Slow controls, evasive pillow.
10. **Failure conditions and consequences.** Miss → retry.
11. **Dependencies.** Entry: p15c9 (p15c9.nap -> p15c10.begin). Start flag: `p15_ch179_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 3 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc jim, npc gristle). In-room hooks into this chapter: map objects in crew_quarters ×3, main_deck ×1; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** '(comfortably, to the dark) Ahh. The zone.' stays.

### `p15c11` · Chapter 180: The Bashfulness Branch

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p15c11`, Chapter 180: The Bashfulness Branch. Scripts: 5 in `data/story/cutscenes/phase15/ch177_180.json`. Quests: `bashfulness_branch` “The Bashfulness Branch” in `data/quests/phase15.json`.
2. **Events and dialogue.** The Bashfulness Branch appears in the quarters (a haze teller); pay Brogath a compliment and watch the sign flicker; try to sleep. Dialogue: 28 lines ((narration) 12, branch_teller 4, captain 4, pete 4, brogath 4); 0 choice prompt(s) with 0 options. Presentation: insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: branch_teller, pete, brogath. NPCs with dialogue keyed to an objective (hints, reactions or completions): brogath. Rooms: `crew_quarters`. Interactables: `p15_branch_look` (crew_quarters 12,14), `p15_night` (crew_quarters 2,10). Flags set: 3 (`p15_ch180_started`, `p15_branch_seen`, `p15_flicker_seen`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Look at it (the branch counter, Crew Quarters)” [flag]; “Pay Brogath a compliment, and watch the sign (Brogath, Crew Quarters)” [flag]; “Try to get some sleep (your pad, by the CAPTAIN pennant, Crew Quarters)” [event×4]. Mechanics invoked by the scripts: stability change ×1, teller window ×1.
5. **Classification.** Timing / skill input (teller window ×1). Presentation-only effects with no player input: stability change ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A persistent special area (the Branch) that depends on Brogath's state.
7. **Proposed primary mechanic.** Keep; the Branch is a configurable special area (opens/closes on Brogath's stability).
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** None.
10. **Failure conditions and consequences.** None.
11. **Dependencies.** Entry: p15c10 (p15c10.sorry -> p15c11.begin). Start flag: `p15_ch180_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc gristle, npc pete, npc brogath). In-room hooks into this chapter: map objects in crew_quarters ×2; NPC dialogue in brogath.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** 'OPEN SO LONG AS BROGATH REMAINS BASHFUL.' stays. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p15c12` · Chapter 181: The Great Mellowing

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p15c12`, Chapter 181: The Great Mellowing. Scripts: 12 in `data/story/cutscenes/phase15/ch181_185.json`. Quests: `great_mellowing` “The Great Mellowing” in `data/quests/phase15.json`.
2. **Events and dialogue.** The Great Mellowing: Agnes the Second (a chicken) parachutes out of the storm; catch her; take her to Brogath; walk the ship – everyone is mellow; work out why you're not. Dialogue: 71 lines ((narration) 30, pete 9, captain 7, brogath 6, gristle 4, visitor_one 4, visitor_two 3, garrick 2, +4 more); 0 choice prompt(s) with 0 options. Presentation: shake ×1, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: pete, brogath, gristle, visitor_one, visitor_two, garrick, bob, jim, hale, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): agnes_second, brogath, garrick, bob, jim, gristle, pete, visitor_one, visitor_two. Rooms: `main_deck`. Interactables: `p15d_agnes_second_1` (main_deck 12,20). Flags set: 13 (`p15_ch181_started`, `p15_parachute_seen`, `agnes_second_on_ship`, `great_mellowing`, `p15_mellowing_seen`, `p15_mellow_garrick`, `p15_mellow_pete`, `p15_mellow_gristle`, `p15_mellow_bob`, `p15_mellow_jim`, +3 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “See what's coming down out of the Sharkstorm (the deck)” [flag]; “Catch it (the chicken, on deck)” [flag]; “Take her to Brogath (the Crew Quarters)” [flag]; “Walk the ship. Everybody's... different. (galley: Garrick, Pete, Bob, Jim; on deck: Gristle, the visitors)” [event×6]; “Work out why you're the only one who isn't (Pete, in the galley)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Agnes the Second arrives (new character); the whole crew has a status.
7. **Proposed primary mechanic.** Crew-wide 'mellow' condition: crew stations are neglected; the captain must cover duties (the Crew conditions system demonstrates its stakes). Catch Agnes (chase).
8. **Secondary mechanics.** Agnes needs a perch (crew integration).
9. **Enemies, puzzles, timers, hazards, resources.** Chicken chase, neglected stations failing.
10. **Failure conditions and consequences.** Stations fail → minor ship damage.
11. **Dependencies.** Entry: p15c11 (p15c11.morning -> p15c12.begin). Start flag: `p15_ch181_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 11 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in none; NPC dialogue in agnes_second, bob, brogath, garrick, gristle, jim, pete, visitor_one, visitor_two.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** The harness 'made of string and somebody's sock' stays.

### `p15c13` · Chapter 182: The Untold Stories

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p15c13`, Chapter 182: The Untold Stories. Scripts: 12 in `data/story/cutscenes/phase15/ch181_185.json`. Quests: `untold_stories` “The Untold Stories” in `data/quests/phase15.json`.
2. **Events and dialogue.** The Untold Stories: everyone has abandoned their stations; do everybody's job (screen, sash, Brogath, Garrick, brace); watch. Dialogue: 33 lines ((narration) 16, brogath 7, pete 3, garrick 2, captain 2, gristle 1, channel_narrator 1, branch_teller 1); 0 choice prompt(s) with 0 options. Presentation: shake ×1, vista ×1, channelEpisode ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, pete, garrick, gristle, channel_narrator, branch_teller. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, brogath. Rooms: `galley`. Interactables: `p15_job_screen` (galley 16,7), `p15_job_sash` (galley 7,9), `p15_job_brace` (galley 7,7). Flags set: 8 (`p15_ch182_started`, `p15_job_screen`, `p15_job_sash`, `p15_job_brogath`, `p15_job_garrick`, `p15_job_brace`, `p15_jobs_said`, `p15_untold_watched`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Do everybody's job in the galley (the screen, the sash hammock, Brogath, Garrick, and BRACE at the long table)” [event×5]; “Watch the Untold Stories (Brogath, in the galley)” [flag]. Mechanics invoked by the scripts: stability change ×8, timing bar (repair) ×2, Brogath reassurance prompt ×2.
5. **Classification.** Timing / skill input (timing bar (repair) ×2, Brogath reassurance prompt ×2). Presentation-only effects with no player input: stability change ×8. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Literally a one-person crew-stations crisis.
7. **Proposed primary mechanic.** Solo stations: five stations decay at different rates; the captain runs between them (spinning plates) through one episode.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Five timers.
10. **Failure conditions and consequences.** Stability zero → eruption; restart.
11. **Dependencies.** Entry: p15c12 (p15c12.sober -> p15c13.begin). Start flag: `p15_ch182_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in galley ×3; NPC dialogue in brogath, garrick.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'It's... licensed. It's something with an L.' stays.

### `p15c14` · Chapter 183: Relief Grand Teller

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p15c14`, Chapter 183: Relief Grand Teller. Scripts: 6 in `data/story/cutscenes/phase15/ch181_185.json`. Quests: `relief_grand_teller` “Relief Grand Teller” in `data/quests/phase15.json`.
2. **Events and dialogue.** Relief Grand Teller: the branch teller goes on break; serve ten spectral customers; collect your rating. Dialogue: 20 lines ((narration) 11, captain 4, branch_teller 3, pete 1, brogath 1); 0 choice prompt(s) with 0 options. Presentation: insert ×3, transition ×1, giveItem ×1.
3. **Characters, locations, props, flags.** Speaking characters: branch_teller, pete, brogath. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`. Interactables: `p15_relief_bell` (crew_quarters 12,14), `p15_rating` (crew_quarters 12,14). Flags set: 6 (`p15_ch183_started`, `branch_teller_clocked_out`, `p15_relief_half_said`, `p15_relief_said`, `p15_teller_rated`, `branch_express_window`); items given: relief_teller_badge.
4. **Current player actions and mechanics.** Objectives: “Serve the relief queue (ring the branch bell on the counter, Crew Quarters)” [event×10]; “Collect your rating (the branch counter, Crew Quarters)” [flag]. Mechanics invoked by the scripts: teller window ×1.
5. **Classification.** Timing / skill input (teller window ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Teller system.
7. **Proposed primary mechanic.** Teller shift (harder than p14c19) with a rating that unlocks a small perk.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Queue.
10. **Failure conditions and consequences.** Low rating (cosmetic) – repeatable.
11. **Dependencies.** Entry: p15c13 (p15c13.watch -> p15c14.begin). Start flag: `p15_ch183_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in crew_quarters ×2; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** 'Tea, sir. Forty years. Never had a break.' stays.

### `p15c15` · Chapter 184: The Sash-Backed Loan Emergency

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p15c15`, Chapter 184: The Sash-Backed Loan Emergency. Scripts: 7 in `data/story/cutscenes/phase15/ch181_185.json`. Quests: `sash_backed_loan` “The Sash-Backed Loan Emergency” in `data/quests/phase15.json`.
2. **Events and dialogue.** The Sash-Backed Loan Emergency: Grand Lady Whifflebottom needs forty-seven silver; process forms 1A to 97Q; the collateral ceremony; close the line. Dialogue: 64 lines ((narration) 29, whifflebottom 14, captain 12, spectral_customer 5, brogath 2, pete 2); 4 choice prompt(s) with 8 options. Presentation: insert ×6, giveItem ×1, spawn ×1, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: whifflebottom, spectral_customer, brogath, pete. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `crew_quarters`. Interactables: `p15_loan_hear` (crew_quarters 12,14), `p15_loan_forms` (crew_quarters 12,14), `p15_loan_collateral` (crew_quarters 12,14), `p15_loan_last` (crew_quarters 12,14). Flags set: 6 (`p15_ch184_started`, `p15_loan_arrived`, `p15_loan_heard`, `p15_forms_said`, `sash_loan_resolved`, `bashfulness_branch_closed_for_good`); items given: loan_fee_receipt.
4. **Current player actions and mechanics.** Objectives: “Hear her out (the branch counter, Crew Quarters)” [flag]; “Process the application: forms 1A to 97Q (the branch counter)” [event×4]; “The collateral activation ceremony (ring the bell, and hold her sash)” [flag]; “CLOSE THE LINE (the last customers, at the window)” [event×3]. Mechanics invoked by the scripts: teller deposit ×1.
5. **Classification.** Timing / skill input (teller deposit ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Bureaucratic puzzle.
7. **Proposed primary mechanic.** Form-processing puzzle (match stamps/fields under time) – a fun variant of the teller system.
8. **Secondary mechanics.** None.
9. **Enemies, puzzles, timers, hazards, resources.** Field matching, time.
10. **Failure conditions and consequences.** Rejected application → redo.
11. **Dependencies.** Entry: p15c14 (p15c14.rating -> p15c15.begin). Start flag: `p15_ch184_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc pete, npc brogath, npc visitor_one). In-room hooks into this chapter: map objects in crew_quarters ×4; NPC dialogue in none.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** Whifflebottom's titles stay in full.

### `p15c16` · Chapter 185: The One Fart He Actually Misses

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p15c16`, Chapter 185: The One Fart He Actually Misses. Scripts: 15 in `data/story/cutscenes/phase15/ch181_185.json`. Quests: `the_fart_he_misses` “The One Fart He Actually Misses” in `data/quests/phase15.json`.
2. **Events and dialogue.** The One Fart He Actually Misses: peace; check stores; get rid of Vindicta (a spectral customer) on deck; find Agnes (perch, feather trail, rail); ask Brogath to do it again; write new rules; 'Not today.' Dialogue: 121 lines ((narration) 57, captain 25, brogath 15, vindicta 9, garrick 7, pete 5, squawks 2, jim 1); 0 choice prompt(s) with 0 options. Presentation: shake ×5, giveItem ×1, vista ×1, channelEpisode ×1, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: brogath, vindicta, garrick, pete, squawks, jim. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, brogath, agnes_second, vindicta. Rooms: `crew_quarters`, `galley`, `main_deck`. Interactables: `p15_pantry` (galley 16,8), `p15_search_perch` (crew_quarters 14,7), `p15_search_deck` (main_deck 12,21), `p15_search_rail` (main_deck 16,13), `p15_rule_policy` (crew_quarters 9,12), `p15_end` (main_deck 16,13). Flags set: 18 (`p15_ch185_started`, `p15_peace_garrick`, `p15_peace_brogath`, `p15_peace_agnes`, `p15_pantry_seen`, `p15_peace_said`, `p15_vindicta_here`, `p15_haze_cleared`, `great_mellowing_cleared`, `p15_search_perch`, +8 more); items given: agnes_feather.
4. **Current player actions and mechanics.** Objectives: “Enjoy it (anyone: Garrick in the galley; Brogath or Agnes in the Crew Quarters)” [event×3]; “Check the stores (the galley)” [flag]; “Get rid of her (the spectral customer on deck)” [event×3]; “Find Agnes the Second (her perch in the Crew Quarters; the feather trail by the mainmast, on deck; any rail)” [event×3]; “Ask Brogath to do it again (Brogath, on deck)” [flag]; “Write the captain's new rules (the Brogath Rules board, Crew Quarters)” [flag]; “Not today. (any rail, on deck)” [flag]. Mechanics invoked by the scripts: stability change ×8.
5. **Classification.** Walk + press A. Presentation-only effects with no player input: stability change ×8. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Vindicta's first appearance (later important). A long finale with a search.
7. **Proposed primary mechanic.** Phase finale: Vindicta as the first 'hostile spectre' encounter (she must be talked or out-manoeuvred off the ship), then a tracking search for Agnes (feather trail).
8. **Secondary mechanics.** New rules on the Brogath Rules board (persistent).
9. **Enemies, puzzles, timers, hazards, resources.** Vindicta's pressure, trail-following.
10. **Failure conditions and consequences.** Vindicta lingers → ship morale down.
11. **Dependencies.** Entry: p15c15 (p15c15.branch_closes -> p15c16.begin). Start flag: `p15_ch185_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 14 (room crew_quarters, room fart_free_zone, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc jim). In-room hooks into this chapter: map objects in main_deck ×3, crew_quarters ×2, galley ×1; NPC dialogue in agnes_second, brogath, garrick, vindicta.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** 'This cup. It holds things.' / 'What's a committee?' stay.
