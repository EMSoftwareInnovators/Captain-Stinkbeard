# Story inventory, Phase 2: Garrick Grumblegut and the Cursed Treasure

Chapters: 8 (ch1 to ch8). Dialogue lines: 606. Classification: Walk + press A 7, Dialogue / cutscene only 1.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE2.md`, `data/quests/phase2.json`, `data/story/cutscenes/` (Phase 2 files), `data/story/flags/`, `tests/phase2_story.test.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `ch1` · Chapter 1: The Man in the Bathtub

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `ch1`, Chapter 1: The Man in the Bathtub. Scripts: 6 in `data/story/cutscenes/phase2/ch1.json`. Quests: `tomorrows_heading` “Tomorrow's Heading” in `data/quests/phase2.json`; `strange_cargo` “Strange Cargo” in `data/quests/phase2.json`.
2. **Events and dialogue.** Morning on the Sapphire Sea; Bob drinks lamp oil; Ned spots a man paddling an upturned bathtub with two sausages; the telescope view, the haul aboard, Squawks, questioning Garrick and deciding to keep him (provisionally). Dialogue: 104 lines (captain 38, garrick 32, (narration) 8, squawks 7, hale 7, ned 5, bob 2, brask 2, +2 more); 4 choice prompt(s) with 13 options. Presentation: move ×3, spawn ×2, vista ×1, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, hale, ned, bob, brask, rook, sully. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 9 (`phase2_hook_seen`, `ch1_morning_started`, `ch1_foredeck_reached`, `bathtub_spotted`, `bathtub_seen`, `garrick_hauled_aboard`, `met_squawks`, `garrick_questioned`, `garrick_provisional`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Turn in for the night (your bed, Captain's Quarters)” [flag]; “Look through the telescope (starboard rail)” [flag]; “Bring the stranger aboard” [flag]; “Question the stranger” [flag]; “Decide what to do with Garrick” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The haul aboard is a natural physical set-piece; the questioning is a natural judgement scene.
7. **Proposed primary mechanic.** Rescue at sea: steer the Revenge alongside the drifting bathtub (course dial + wind) and land the haul (rope timing; the tub is heavy, the sausages are slippery).
8. **Secondary mechanics.** Interrogation as an evidence choice (what Garrick says vs. what his coat contains), feeding later trust/suspicion values instead of flavour-only choices.
9. **Enemies, puzzles, timers, hazards, resources.** Swell and wind drift; a line that can snap if hauled too hard; Squawks heckling (distraction).
10. **Failure conditions and consequences.** Miss the approach → come round again (time of day advances); snap the line → Garrick swims the last bit and arrives soaked (cosmetic + Garrick grudge flag). Never fatal.
11. **Dependencies.** Entry: story trigger p2_hook: {all:[{flag:tutorial_complete},{questNotStarted:tomorrows_heading}]}; story trigger ch1_lookout: {all:[{onMap:main_deck},{flag:ch1_morning_started},{notFlag:bathtub_spotted},{any:[{flag:ch1_foredeck_reached},{var:{name:morning_beats,gte:3}}]}]}. Start flag: `ch1_morning_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room crew_quarters, room galley, room main_deck, npc bob, npc ned, npc jim, npc penhallow, npc hale). In-room hooks into this chapter: map objects in main_deck ×2, captains_quarters ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** The crew's guesses at the telescope, 'Now THIS is a ship.' / 'Close enough.', and the attitude choices all stay; the comedy of hauling a man who will ruin everything becomes literal effort.

### `ch2` · Chapter 2: Garrick's First Day at Sea

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `ch2`, Chapter 2: Garrick's First Day at Sea. Scripts: 10 in `data/story/cutscenes/phase2/ch2.json`. Quests: `new_recruit` “The New Recruit” in `data/quests/phase2.json`.
2. **Events and dialogue.** Garrick's first day: he turns the foredeck into a toll road, 'scrubs', eats Jim's catastrophic lunch in the galley, and his stomach starts making thunder noises. Dialogue: 111 lines (garrick 37, jim 26, captain 25, (narration) 7, hale 6, sully 4, rook 3, wick 2, +1 more); 5 choice prompt(s) with 15 options. Presentation: move ×8, spawn ×3, insert ×2, shake ×2, transition ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, jim, hale, sully, rook, wick, mags. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick, jim. Rooms: `captains_quarters`, `galley`. Interactables: `garrick_8_6` (galley 8,6), `jim_10_7` (galley 10,7). Flags set: 9 (`garrick_toll_setup`, `garrick_toll_warned`, `garrick_toll_removed`, `garrick_scrub_seen`, `garrick_digestive_crisis`, `galley_lunch_seen`, `jim_warned`, `rumble_sails_seen`, `garrick_thunder_excuse`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Check on Garrick's assigned work (the foredeck)” [flag]; “See how the new recruit is scrubbing” [flag]; “Find Garrick in the galley” [flag]; “Speak with Salty Jim” [flag]; “Continue the afternoon duties (the mainmast)” [flag]; “Respond to the strange stomach noises” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A day of chores is perfect for a 'keep the ship running despite Garrick' management chapter.
7. **Proposed primary mechanic.** Watch duty: a short real-time shift where the captain keeps three deck jobs from failing (rigging, swabbing, lines) while Garrick sabotages them for profit (the toll gate blocks crew paths).
8. **Secondary mechanics.** Galley lunch as an ingredient puzzle (Jim's pickles vs. Garrick's appetite) that sets how bad the later gust is (hidden 'gut pressure' value).
9. **Enemies, puzzles, timers, hazards, resources.** Toll gate that diverts crew traffic, a mop slick on deck, a crew member who stops working until paid.
10. **Failure conditions and consequences.** Jobs fail → the afternoon rumble starts early and the Gust in ch4 is stronger (more fume zones). Recoverable.
11. **Dependencies.** Entry: story trigger ch2_begin: {all:[{questCompleted:strange_cargo},{questNotStarted:new_recruit}]}. Start flag: `garrick_provisional`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room main_deck, room galley, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow). In-room hooks into this chapter: map objects in main_deck ×3; NPC dialogue in garrick, jim.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** The toll road (asset relocation), the scrubbing and the stomach noises are already physical comedy; making them obstacles keeps every line.

### `ch3` · Chapter 3: Blackbeard's Treasure Room

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `ch3`, Chapter 3: Blackbeard's Treasure Room. Scripts: 6 in `data/story/cutscenes/phase2/ch3.json`. Quests: `treasure_inspection` “Treasure Inspection” in `data/quests/phase2.json`.
2. **Events and dialogue.** Hale sends the captain to check the treasure room after the swell; Garrick volunteers; the inventory, the search of Garrick, moving a fallen chest together. Dialogue: 70 lines (garrick 29, captain 28, (narration) 7, hale 6); 1 choice prompt(s) with 3 options. Presentation: move ×8, shake ×3, transition ×1, spawn ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, hale. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `cargo_hold`, `treasure_hold`. Interactables: `garrick_5_4` (cargo_hold 5,4), `to_treasure_p2` (cargo_hold 4,3). Flags set: 5 (`treasure_inspection_started`, `garrick_saw_treasure`, `garrick_searched`, `treasure_hoard_checked`, `treasure_chest_moved`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Meet Garrick at the treasure room door (Cargo Hold)” [flag]; “Inspect the treasure” [flag]; “Move the fallen chest with Garrick” [flag]; “Survive the incident” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The treasure room is a closed space full of heavy objects: a physics/pushing puzzle room.
7. **Proposed primary mechanic.** Sokoban-style chest-righting puzzle with Garrick as an unreliable partner (he lifts when you say, mostly).
8. **Secondary mechanics.** Contraband check: Garrick pockets things while you work; spot and recover them (a 'pickpocket watch' attention mechanic).
9. **Enemies, puzzles, timers, hazards, resources.** Sliding chests on a rolling floor (the swell tilts pushes), coin piles that are slippery, limited moves before the ship rolls again.
10. **Failure conditions and consequences.** Fail the puzzle → a chest pins the captain (small HP loss) and Garrick 'helps'; puzzle resets. Missed thefts reduce the treasure value later (persistent).
11. **Dependencies.** Entry: story trigger ch3_begin: {all:[{questCompleted:new_recruit},{questNotStarted:treasure_inspection}]}. Start flag: `garrick_thunder_excuse`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room treasure_hold). In-room hooks into this chapter: map objects in treasure_hold ×3; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** The audit 'free of charge', the search scene and Hale's 'A wide one.' stay; the joke lands harder if Garrick's help is visibly unhelpful.

### `ch4` · Chapter 4: The Grumblegut Gust

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `ch4`, Chapter 4: The Grumblegut Gust. Scripts: 6 in `data/story/cutscenes/phase2/ch4.json`. Quests: none (no quest; pure cutscene chapter).
2. **Events and dialogue.** Garrick sits on the chest and the Grumblegut Gust erupts: the cloud fills the treasure room, then crew quarters and galley are evacuated; a crab on the door handle; the fumes spread. Dialogue: 44 lines ((narration) 13, captain 11, garrick 10, penhallow 3, dunstan 2, mags 2, fennimore 1, jim 1, +1 more); 0 choice prompt(s) with 0 options. Presentation: move ×13, shake ×9, spawn ×9, transition ×5, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, penhallow, dunstan, mags, fennimore, jim, quill. NPCs with dialogue keyed to an objective (hints, reactions or completions): none. Rooms: `cargo_hold`, `crew_quarters`, `galley`, `main_deck`, `treasure_hold`. Interactables: none. Flags set: 5 (`grumblegut_gust`, `quarters_evacuated`, `galley_evacuated`, `gust_aftermath_done`, `fumes_spread`); items given: none.
4. **Current player actions and mechanics.** Objectives: no objectives: the player watches and advances dialogue. Mechanics invoked by the scripts: none.
5. **Classification.** Dialogue / cutscene only. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Currently almost pure cutscene (44 lines, five room transitions). It is the game's inciting disaster and should be the first escape sequence.
7. **Proposed primary mechanic.** Escape the Gust: a timed, real-time evacuation through filling rooms (Atmosphere + exposure meter), opening doors and hatches to vent while getting crew out.
8. **Secondary mechanics.** Crew rescue triage (who you send where), the crab on the door handle as a micro-obstacle (pry it off or find another route).
9. **Enemies, puzzles, timers, hazards, resources.** Spreading fume zones with telegraphed fronts, jammed doors, a panicking crewman blocking a corridor, the crab.
10. **Failure conditions and consequences.** Overcome by fumes → hauled out by Rook (existing never-fatal collapse) but a crew member is left 'dazed' (unavailable for a chapter). Retry from the treasure-room door.
11. **Dependencies.** Entry: map:treasure_hold/escape_door -> ch4.door_struggle (in-room hook). Start flag: `treasure_chest_moved`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (dialogue cargo, dialogue inspect, room cargo_hold, room crew_quarters, room galley, room main_deck, room treasure_hold, npc garrick). In-room hooks into this chapter: map objects in treasure_hold ×1; NPC dialogue in none.
12. **Complexity and priority.** Complexity L, priority P1.
13. **Preserving story and humour; variety.** 'My digestive system has declared bankruptcy.' and the crab stay; the evacuation exaggerates the absurd scale of one man's gust.

### `ch5` · Chapter 5: The Cloud Takes the Ship

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `ch5`, Chapter 5: The Cloud Takes the Ship. Scripts: 3 in `data/story/cutscenes/phase2/ch5.json`. Quests: `yellow_alert` “Yellow Alert” in `data/quests/phase2.json`.
2. **Events and dialogue.** Everyone on deck, coughing; Garrick explains the Dead Center of the cloud; Squawks falls into it. Dialogue: 48 lines (garrick 16, captain 8, (narration) 5, jim 5, hale 2, wick 2, bob 2, quill 1, +7 more); 0 choice prompt(s) with 0 options. Presentation: move ×1, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, jim, hale, wick, bob, quill, mags, brask, finch, ned, fennimore, squawks, nell. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: set by preceding chapter (no room change). Interactables: none. Flags set: 4 (`deck_evacuated_seen`, `dead_center_explained`, `squawks_fell`, `squawks_exposed`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Get topside (Main Deck)” [flag]; “Hear Garrick out about the cloud” [flag]; “Respond to Squawks' fall” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Short bridge chapter; good place to teach how fumes behave (Dead Center, drift with wind).
7. **Proposed primary mechanic.** Keep mostly narrative; add a short 'read the cloud' interaction: use wind direction and portholes to push the cloud off a deck section so the crew can breathe (Atmosphere routing).
8. **Secondary mechanics.** Headcount mechanic (find the crew still below) that seeds ch6.
9. **Enemies, puzzles, timers, hazards, resources.** Drifting pockets of fume on deck; crew collapsed in them.
10. **Failure conditions and consequences.** Crew left in fumes lose morale/HP; no game over.
11. **Dependencies.** Entry: story trigger ch5_begin: {all:[{questCompleted:treasure_inspection},{questNotStarted:yellow_alert}]}. Start flag: `gust_aftermath_done`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (dialogue garrick, dialogue hale, dialogue hazard, room cargo_hold, room main_deck, npc squawks). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** Quill's 'The count keeps coming out yellow' and Mags mourning her galley are the payoff; keep timing. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `ch6` · Chapter 6: Save Captain Squawks

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `ch6`, Chapter 6: Save Captain Squawks. Scripts: 10 in `data/story/cutscenes/phase2/ch6.json`. Quests: `save_squawks` “Save Squawks” in `data/quests/phase2.json`.
2. **Events and dialogue.** The playable rescue: rope from Rook, wet cloth from Doc Fennimore, down the hatch into the fumes, follow Squawks' cries, carry him out. Dialogue: 44 lines (captain 9, squawks 9, fennimore 8, (narration) 7, rook 6, garrick 4, hale 1); 0 choice prompt(s) with 0 options. Presentation: spawn ×4, shake ×1, transition ×1, move ×1.
3. **Characters, locations, props, flags.** Speaking characters: squawks, fennimore, rook, garrick, hale. NPCs with dialogue keyed to an objective (hints, reactions or completions): rook, fennimore, squawks. Rooms: `main_deck`. Interactables: none. Flags set: 8 (`rescue_rope`, `rescue_cloth`, `rescue_gear_on`, `rescue_prepared`, `rescue_boots_moment`, `squawks_caught`, `squawks_rescued`, `squawks_bald`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Get a rescue line from Rook” [flag]; “Get a wet cloth from Doc Fennimore” [flag]; “Go below into the fumes (main hatch)” [flag]; “Find Squawks (follow his cries)” [flag]; “Get Squawks out to the stairs” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Already the most mechanical chapter of the early game (fume zones, exposure, trailing rope). A strong template.
7. **Proposed primary mechanic.** Fume dive: limited breath/exposure, rope length as a resource, navigate by sound (Squawks' cries pan left/right).
8. **Secondary mechanics.** Carry-and-shield: once you hold Squawks you move slower and must route through the thinnest air.
9. **Enemies, puzzles, timers, hazards, resources.** Dead Center core that drains exposure fast, rope snagging on corners (retrace to free), fallen crates blocking the shortest path.
10. **Failure conditions and consequences.** Pass out → Rook hauls you back by the rope to the hatch (existing), Squawks loses more feathers (cosmetic escalation, persistent until the sweater).
11. **Dependencies.** Entry: story trigger ch6_begin: {all:[{questCompleted:yellow_alert},{questNotStarted:save_squawks}]}. Start flag: `squawks_fell`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (room main_deck, dialogue hazard, room cargo_hold, room galley, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in main_deck ×1, cargo_hold ×1; NPC dialogue in fennimore, rook, squawks.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** The rope protocol ('Two tugs means haul you up'), the boots moment and the bald parrot are all kept; failure makes Squawks balder, which is funnier, not punishing.

### `ch7` · Chapter 7: The Fate of the Treasure

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `ch7`, Chapter 7: The Fate of the Treasure. Scripts: 15 in `data/story/cutscenes/phase2/ch7.json`. Quests: `price_of_gold` “The Price of Gold” in `data/quests/phase2.json`.
2. **Events and dialogue.** The cloud thins; the ruined treasure is inspected; Penhallow tests what it's worth (nothing); Garrick says the smell is permanent; the crew turn on Garrick. Dialogue: 83 lines (captain 30, (narration) 22, penhallow 12, garrick 11, hale 2, quill 2, brask 1, mags 1, +2 more); 1 choice prompt(s) with 2 options. Presentation: spawn ×9, transition ×1, move ×1, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: penhallow, garrick, hale, quill, brask, mags, jim, rook. NPCs with dialogue keyed to an objective (hints, reactions or completions): penhallow, garrick. Rooms: `main_deck`. Interactables: none. Flags set: 13 (`fumes_thinned`, `treasure_contaminated`, `ruined_reveal_seen`, `insp_ruined_coin`, `insp_ruined_ruby`, `insp_ruined_crown`, `insp_ruined_pearls`, `insp_ruined_chest`, `insp_ruined_wall`, `merchant_test_started`, +3 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Inspect the ruined treasure” [inspect×4]; “Find out what the treasure is worth (Penhallow, Crew Quarters)” [flag]; “Ask Garrick whether the smell will fade” [flag]; “Deal with the crew (Main Deck)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Inspection + appraisal; the crew turning is a mob scene.
7. **Proposed primary mechanic.** Salvage triage: the captain chooses which ruined items to keep, scrub (timing bar) or dump, with limited water and time; the result is the first 'doubloons' economy value.
8. **Secondary mechanics.** Crowd control before the trial: calm or redirect the angry crew (a morale mechanic) so they don't throw Garrick overboard before the trial.
9. **Enemies, puzzles, timers, hazards, resources.** Contaminated items that re-stink, limited fresh water, Penhallow's merchant test.
10. **Failure conditions and consequences.** Crew morale too low → they start the trial angrier (harder ch8 choices); recoverable.
11. **Dependencies.** Entry: story trigger ch7_begin: {all:[{questCompleted:save_squawks},{questNotStarted:price_of_gold}]}; story trigger ch7_worth: {all:[{onMap:treasure_hold},{objectiveDone:price_of_gold.inspect},{notFlag:merchant_test_started}]}. Start flag: `squawks_rescued`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (dialogue cargo, room cargo_hold, room crew_quarters, room galley, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in treasure_hold ×8; NPC dialogue in garrick, penhallow.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** Penhallow's appraisal and Garrick's 'accelerated depreciation' language stay; the triage turns a list of ruined things into the player's own bad decisions.

### `ch8` · Chapter 8: The Trial of Garrick Grumblegut

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `ch8`, Chapter 8: The Trial of Garrick Grumblegut. Scripts: 8 in `data/story/cutscenes/phase2/ch8.json`. Quests: `yellow_defense` “The Yellow Defense” in `data/quests/phase2.json`.
2. **Events and dialogue.** The trial at the mainmast; a royal frigate demands surrender; the captain takes the helm, brings her upwind and releases the contaminated sail; the frigate flees; Garrick on probation; the rowboat protocol. Dialogue: 102 lines (captain 26, garrick 25, (narration) 15, squawks 11, quill 7, crew 5, nell 3, hale 3, +5 more); 3 choice prompt(s) with 7 options. Presentation: vista ×7, transition ×3, shake ×3, insert ×2, move ×1, spawn ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, quill, crew, nell, hale, mags, jim, sully, wick, ned. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `main_deck`. Interactables: `helm_frigate` (main_deck 9,6), `sail_line` (main_deck 8,30). Flags set: 11 (`trial_started`, `squawks_sweater`, `frigate_sighted`, `frigate_plan_agreed`, `ship_turned`, `fume_sail_released`, `frigate_fled`, `garrick_on_probation`, `rowboat_protocol`, `squawks_deadly_brew`, +1 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Respond to the royal frigate” [flag]; “Take the helm and bring her upwind” [flag]; “Release the contaminated sail (foremast line)” [flag]; “Watch the frigate retreat” [flag]; “Complete Garrick's trial” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The first naval set-piece. It currently resolves with two inspects (helm, sail line).
7. **Proposed primary mechanic.** Naval encounter: sail upwind under fire (course dial + wind + timed broadside dodges), then release the fume sail at the right moment (aim the cloud at the frigate).
8. **Secondary mechanics.** Trial as a short courtroom choice sequence whose verdict is shaped by earlier chapters (theft recovered, crew morale, how bad the Gust was).
9. **Enemies, puzzles, timers, hazards, resources.** Frigate cannon volleys telegraphed on the deck (Ship Integrity damage), a jammed sail line, the wind shifting.
10. **Failure conditions and consequences.** Hull damage persists into Phase 3 as repairs to do; boarded → a short deck fight against marines (cutthroat enemies exist) before the cloud saves you. No game over.
11. **Dependencies.** Entry: story trigger ch8_begin: {all:[{questCompleted:price_of_gold},{notFlag:trial_started}]}; story trigger ch8_trial: {all:[{onMap:main_deck},{flag:trial_started},{questNotStarted:yellow_defense}]}; story trigger p2_epilogue: {all:[{questCompleted:yellow_defense},{notFlag:phase2_complete}]}. Start flag: `trial_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room cargo_hold, room crew_quarters, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in main_deck ×2; NPC dialogue in none.
12. **Complexity and priority.** Complexity L, priority P1.
13. **Preserving story and humour; variety.** Squawks in the knitted sweater, the crown's demand and 'involuntary maritime restructuring' stay; the naval fight makes Garrick's gas the literal winning weapon.
