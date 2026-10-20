# Story inventory, Phase 6: The Death Rattle of the S.E.S. and the Midnight Stenchmaster Catastrophe

Chapters: 8 (p6c1 to p6c8). Dialogue lines: 662. Classification: Timing / skill input 6, Choice or puzzle prompt 1, Walk + press A 1.

Sources: `data/game.json` (chapter list), `docs/STORY_PHASE6.md`, `data/quests/phase6.json`, `data/story/cutscenes/phase6/`, `data/story/flags/phase6.json`, `tests/phase6_story.test.js`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `p6c1` · Chapter 25: The Grand Stenchmaster's Supper

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **yes, protect**.

1. **ID, title, source files.** `p6c1`, Chapter 25: The Grand Stenchmaster's Supper. Scripts: 7 in `data/story/cutscenes/phase6/ch25.json`. Quests: `grand_supper` “The Grand Stenchmaster's Supper” in `data/quests/phase6.json`.
2. **Events and dialogue.** Sunset; Garrick's improved suit; check on Squawks; the Grand Stenchmaster's Supper in the galley (onion, garlic, cheese and Frog Grog); back on deck. The bulk Frog Grog reserve (sixteen barrels) is introduced midships. Dialogue: 103 lines ((narration) 33, garrick 21, captain 18, squawks 8, pete 7, mags 6, jim 5, quill 2, +3 more); 1 choice prompt(s) with 5 options. Presentation: move ×7, spawn ×4, transition ×3, insert ×2, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, pete, mags, jim, quill, gristle, rook, hale. NPCs with dialogue keyed to an objective (hints, reactions or completions): squawks. Rooms: `galley`, `main_deck`. Interactables: none. Flags set: 5 (`p6_started`, `p6_squawks_checked`, `p6_carrying_squawks`, `rotten_garlic_supper_eaten`, `p6_supper_outside`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Check on Squawks (his basket, by the cabin door)” [flag]; “Get to the galley (the main hatch)” [flag]; “Follow the Grand Stenchmaster back up on deck” [flag]. Mechanics invoked by the scripts: Shark Duty ×1.
5. **Classification.** Timing / skill input (Shark Duty ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A setup chapter that introduces a resource (the sixteen BULK barrels) the player later spends in p6c8. It can seed the resource economy.
7. **Proposed primary mechanic.** Keep the supper as a narrative beat; make the barrels a tracked ship resource (count shown in the Stench Log / ship status) so later losses are visible.
8. **Secondary mechanics.** Optional pre-supper chore (lash the tarpaulin over the reserve; how well it's lashed decides how many barrels survive the Sharkstorm).
9. **Enemies, puzzles, timers, hazards, resources.** None mandatory; an optional lashing timing bar.
10. **Failure conditions and consequences.** Badly lashed tarpaulin → fewer barrels available in p6c8 (needs more precise launches).
11. **Dependencies.** Entry: p6.bed_sleep -> p6c1.begin. Start flag: `p6_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 4 (room captains_quarters, room crew_quarters, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned). In-room hooks into this chapter: map objects in none; NPC dialogue in squawks.
12. **Complexity and priority.** Complexity S, priority P3.
13. **Preserving story and humour; variety.** The supper menu, Pete's reactions and the haze that 'pays rent' are the joke; the only addition is a resource the player cares about. This is a quiet beat: keep it as written or near enough, so the action chapters around it have contrast.

### `p6c2` · Chapter 26: The Frog Tax Man

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p6c2`, Chapter 26: The Frog Tax Man. Scripts: 8 in `data/story/cutscenes/phase6/ch26.json`. Quests: `the_frog_tax_man` “The Frog Tax Man” in `data/quests/phase6.json`.
2. **Events and dialogue.** After supper the S.E.S. switches itself on: the Frog Tax Man programme (six TV segments); Garrick falls asleep in his chair; the captain tries to wake him and has to find the knobs to switch it off. Dialogue: 64 lines ((narration) 25, captain 14, garrick 12, bob 8, squawks 5); 0 choice prompt(s) with 0 options. Presentation: tvProgram ×6, transition ×2, spawn ×2, move ×2, shake ×1, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, bob, squawks. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `captains_quarters`, `main_deck`. Interactables: `p6_ses_watch` (main_deck 14,17), `p6_ses_knobs` (main_deck 14,17). Flags set: 8 (`p6_ch26_started`, `frog_tax_man_unlocked`, `p6_ftm_watched`, `p6_garrick_asleep`, `p6_carrying_squawks`, `p6_bob_woke_captain`, `p6_deck_night_seen`, `p6_garrick_wont_wake`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Watch the S.E.S. with the Grand Stenchmaster (his station)” [flag]; “Go up on deck and see about the S.E.S.” [flag]; “Try to wake the Grand Stenchmaster (his chair)” [flag]; “Turn off the S.E.S. (the knobs, on the side of the set)” [flag]. Mechanics invoked by the scripts: TV state change (scripted) ×1, TV close-up ×1.
5. **Classification.** Choice or puzzle prompt (TV close-up ×1). Presentation-only effects with no player input: TV state change (scripted) ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The S.E.S. knob mini-game exists. The 'TV that won't turn off' can be a small machine puzzle instead of one inspect.
7. **Proposed primary mechanic.** S.E.S. shutdown puzzle: knobs, tubes and the aerial must be set in an order the programme hints at (the Frog Tax Man's 'deductions' are clues).
8. **Secondary mechanics.** Wake Garrick without waking the crew (noise meter; optional).
9. **Enemies, puzzles, timers, hazards, resources.** A set that turns itself back on if the sequence is wrong; mild time pressure from the rising whine.
10. **Failure conditions and consequences.** Wrong order → the programme restarts with a new segment (more comedy, no penalty) and the set starts smouldering earlier in p6c3.
11. **Dependencies.** Entry: p6c1 (p6c1.outside -> p6c2.begin). Start flag: `p6_ch26_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 5 (room captains_quarters, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc penhallow). In-room hooks into this chapter: map objects in main_deck ×2; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P2.
13. **Preserving story and humour; variety.** All six TV segments stay; the puzzle makes the player sit through the Frog Tax Man's logic, which is the joke.

### `p6c3` · Chapter 27: The Machine Refuses to Die

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p6c3`, Chapter 27: The Machine Refuses to Die. Scripts: 11 in `data/story/cutscenes/phase6/ch27.json`. Quests: `machine_refuses_to_die` “The Machine Refuses to Die” in `data/quests/phase6.json`.
2. **Events and dialogue.** The S.E.S. refuses to die: keep Rook and Sully back, smother three smouldering spots, move a Frog Grog barrel away from a live wire, wait for the set to die, deal with Garrick's cape. Dialogue: 79 lines ((narration) 42, captain 18, bob 10, squawks 4, rook 2, sully 2, franklin 1); 1 choice prompt(s) with 2 options. Presentation: vista ×3, move ×2, shake ×2, insert ×1.
3. **Characters, locations, props, flags.** Speaking characters: bob, squawks, rook, sully, franklin. NPCs with dialogue keyed to an objective (hints, reactions or completions): rook, sully, garrick. Rooms: `main_deck`. Interactables: `p6_smother_a` (main_deck 12,18), `p6_smother_b` (main_deck 12,17), `p6_smother_c` (main_deck 11,19), `p6_barrel` (main_deck 8,18), `p6_ses_wait` (main_deck 14,17). Flags set: 11 (`p6_ch27_started`, `p6_crew_woke_noise`, `p6_rook_back`, `p6_sully_back`, `p6_smother_a`, `p6_smother_b`, `p6_smother_c`, `p6_grog_barrel_moved`, `p6_fork_thrown`, `p6_ses_pop`, +1 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Keep Rook and Sully back from the S.E.S.” [event×2]; “Smother the smouldering spots” [event×3]; “Get the Frog Grog barrel away from the wire” [flag]; “Wait for the S.E.S. to die (watch from the mainmast)” [flag]; “Deal with the Grand Stenchmaster's cape” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×4, TV state change (scripted) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×4). Presentation-only effects with no player input: TV state change (scripted) ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Already four timing bars; it is a natural small fire-fighting crisis.
7. **Proposed primary mechanic.** Fire crisis: smouldering spots spread on a timer (real-time); water/sand buckets are a limited resource carried from the rail; the barrel must be pushed clear before sparks reach it.
8. **Secondary mechanics.** Crowd control: Rook and Sully keep drifting towards the set (escort/blocking).
9. **Enemies, puzzles, timers, hazards, resources.** Spreading embers, a live wire tile that shocks (HP), a barrel that explodes into a fume patch if reached.
10. **Failure conditions and consequences.** Barrel reached → a deck fume zone for the next chapter and a Ship Integrity hit; captain knocked down by the wire → retry from the mainmast.
11. **Dependencies.** Entry: p6c2 (p6c2.knobs -> p6c3.begin). Start flag: `p6_ch27_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 11 (room main_deck, npc rook, npc sully, npc garrick). In-room hooks into this chapter: map objects in main_deck ×6; NPC dialogue in garrick, rook, sully.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** The whine 'like a mosquito being told bad news' and the old-dog wheeze stay; the cape gag is the final beat after the crisis.

### `p6c4` · Chapter 28: The Worst Morning

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p6c4`, Chapter 28: The Worst Morning. Scripts: 5 in `data/story/cutscenes/phase6/ch28.json`. Quests: `worst_morning` “The Worst Morning” in `data/quests/phase6.json`.
2. **Events and dialogue.** The worst morning after a sleepless night: tell Garrick what happened; Shark Duty (four sharks) while Garrick asks about the frog; remind him of the labour rule. Dialogue: 68 lines ((narration) 21, garrick 21, captain 15, rook 2, crew 2, bob 1, gristle 1, pete 1, +4 more); 1 choice prompt(s) with 4 options. Presentation: shake ×3, transition ×1, vista ×1, move ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, rook, crew, bob, gristle, pete, squawks, sully, franklin, hale. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `main_deck`. Interactables: none. Flags set: 5 (`p6_ch28_started`, `p6_garrick_told`, `p6_duty_cleared`, `p6_overboard_ordered`, `garrick_rowboat_morning`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Tell the Grand Stenchmaster what happened (his chair)” [flag]; “Shark Duty: see the sharks off” [event×4]; “Remind the Grand Stenchmaster of the labour rule (his chair)” [flag]. Mechanics invoked by the scripts: Shark Duty ×1, TV state change (scripted) ×1.
5. **Classification.** Timing / skill input (Shark Duty ×1). Presentation-only effects with no player input: TV state change (scripted) ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Shark Duty is the most action-like system in the game. This is a good place to deepen it.
7. **Proposed primary mechanic.** Shark Duty as a proper combat shift: four sharks with distinct behaviours (lunger, circler, hull-biter, the fork-in-the-mast one), Ship Integrity damage from bites.
8. **Secondary mechanics.** Labour-rule argument as a negotiation choice that sets how much Garrick 'helps' in Phase 7.
9. **Enemies, puzzles, timers, hazards, resources.** Sharks attacking several hull points; fatigue (no sleep) slows the captain's swing.
10. **Failure conditions and consequences.** Hull breached → bilge flooding to pump in the next chapter; captain bitten → wake at Fennimore's with HP penalty.
11. **Dependencies.** Entry: p6c3 (p6c3.cape -> p6c4.begin). Start flag: `p6_ch28_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc gristle, npc pete, npc hale). In-room hooks into this chapter: map objects in none; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'Is it time for the frog?' is the punchline of a fight the player actually had to win.

### `p6c5` · Chapter 29: The Burning Warning

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p6c5`, Chapter 29: The Burning Warning. Scripts: 13 in `data/story/cutscenes/phase6/ch29.json`. Quests: `about_to_blow` “The Stenchmaster's About to Blow” in `data/quests/phase6.json`.
2. **Events and dialogue.** After midnight Garrick is about to blow: grab Squawks, wake Bob, Wick and Brask, get everyone up the ladder, find refuge on deck (rowboat, crew), brace. Dialogue: 97 lines ((narration) 40, garrick 22, captain 14, squawks 9, bob 3, wick 3, brask 3, rook 2, +1 more); 0 choice prompt(s) with 0 options. Presentation: move ×3, transition ×2, shake ×2.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, bob, wick, brask, rook, crew. NPCs with dialogue keyed to an objective (hints, reactions or completions): squawks, bob, brask, wick, hale, rook, sully, finch. Rooms: `crew_quarters`, `main_deck`. Interactables: `p6_shift` (crew_quarters 1,4), `p6_refuge_rowboat` (main_deck 4,24). Flags set: 10 (`p6_ch29_started`, `p6_squawks_nightcap`, `p6_night_squawks_grabbed`, `p6_woke_bob`, `p6_woke_wick`, `p6_woke_brask`, `p6_pressure_shift`, `p6_evacuated`, `p6_no_refuge`, `p6_squawks_wrapped`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Grab Squawks (his basket)” [flag]; “Get the sleepers moving (Bob, Wick, Brask)” [event×3]; “Get everyone up the ladder (top right)” [flag]; “Find somewhere safe on deck” [event×3]; “Brace for it” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** A night evacuation with a countdown is a ready-made timed crisis.
7. **Proposed primary mechanic.** Timed evacuation: a visible pressure gauge (Garrick's rumble) while the captain wakes sleepers (each needs a different action: shake, shout, pour water) and routes them up one ladder.
8. **Secondary mechanics.** Refuge placement: assign crew to safe spots on deck (upwind, rowboat, behind the cabin) – a small spatial puzzle.
9. **Enemies, puzzles, timers, hazards, resources.** Sleepers who fall back asleep, a single-file ladder bottleneck, darkness (limited light radius).
10. **Failure conditions and consequences.** Gauge runs out → anyone still below is 'gassed' (unavailable/dazed for Phase 6's remaining chapters); captain caught → never fatal, but Squawks loses feathers again.
11. **Dependencies.** Entry: p6c4 (p6c4.order -> p6c5.begin). Start flag: `p6_ch29_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 8 (room crew_quarters, room galley, room main_deck, npc garrick, npc squawks, npc bob, npc gristle, npc pete). In-room hooks into this chapter: map objects in crew_quarters ×1; NPC dialogue in bob, brask, squawks, wick.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'Ribbit... taxes...' in Squawks's sleep and the sleepers' excuses stay; panic is funnier with a timer.

### `p6c6` · Chapter 30: The Mightiest Gust Yet

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p6c6`, Chapter 30: The Mightiest Gust Yet. Scripts: 5 in `data/story/cutscenes/phase6/ch30.json`. Quests: `second_yellow_apocalypse` “The Second Yellow Apocalypse” in `data/quests/phase6.json`.
2. **Events and dialogue.** The Mightiest Gust Yet: the deck jumps, the mast bends, half the crew knocked flat; get aft clear of the new cloud, check on Squawks, look over the rail at the result. Dialogue: 77 lines ((narration) 42, captain 10, garrick 10, squawks 5, pete 2, crew 2, gristle 1, quill 1, +4 more); 0 choice prompt(s) with 0 options. Presentation: vista ×3, shake ×1, spawn ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, pete, crew, gristle, quill, rook, brask, wick, bob. NPCs with dialogue keyed to an objective (hints, reactions or completions): squawks. Rooms: `main_deck`. Interactables: `p6_clear_aft` (main_deck 4,12), `p6_rail` (main_deck 16,20). Flags set: 6 (`p6_ch30_started`, `second_major_release`, `p6_second_cloud_seen`, `p6_clear_aft`, `p6_squawks_ok`, `great_sharkstorm_created`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Get aft, clear of the new cloud (by the cabin door)” [flag]; “Check on Squawks” [flag]; “Look over the rail (on deck)” [flag]. Mechanics invoked by the scripts: none.
5. **Classification.** Walk + press A. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Currently no mechanic at all (77 lines). It is the spectacle chapter between two crises.
7. **Proposed primary mechanic.** Short 'brace and hold' sequence: when the gust hits, hold a rail through three shock waves (timed input), then get aft before the cloud front reaches you.
8. **Secondary mechanics.** None; let the vistas breathe afterwards.
9. **Enemies, puzzles, timers, hazards, resources.** Shock waves telegraphed by the teacup rattle; rolling barrels.
10. **Failure conditions and consequences.** Knocked loose → slide down the deck into the cloud (exposure) and restart at the cabin door.
11. **Dependencies.** Entry: p6c5 (p6c5.countdown -> p6c6.begin). Start flag: `p6_ch30_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in main_deck ×2; NPC dialogue in squawks.
12. **Complexity and priority.** Complexity S, priority P2.
13. **Preserving story and humour; variety.** The cape flying horizontal and 'the other half were already lying down on purpose' stay untouched.

### `p6c7` · Chapter 31: The Great Sharkstorm

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p6c7`, Chapter 31: The Great Sharkstorm. Scripts: 10 in `data/story/cutscenes/phase6/ch31.json`. Quests: `the_great_sharkstorm` “The Great Sharkstorm” in `data/quests/phase6.json`.
2. **Events and dialogue.** The Great Sharkstorm hits: sharks rain from the sky; secure the shrouds (three), get Squawks under cover, heave a shark overboard, take the helm. Dialogue: 79 lines ((narration) 31, captain 20, garrick 8, squawks 6, crew 5, fennimore 2, pete 2, gristle 2, +3 more); 1 choice prompt(s) with 4 options. Presentation: shake ×3, vista ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, crew, fennimore, pete, gristle, franklin, jory, rook. NPCs with dialogue keyed to an objective (hints, reactions or completions): bob, ned, jim, penhallow, gristle, pete, hale, quill, mags, fennimore, brask, nell, wick, rook, sully, finch, jory, squawks. Rooms: `main_deck`. Interactables: `p6_rope_a` (main_deck 3,16), `p6_rope_b` (main_deck 16,16), `p6_rope_c` (main_deck 3,7), `p6_heave` (main_deck 12,21), `p6_heave_block` (main_deck 12,21), `p6_helm` (main_deck 9,6). Flags set: 12 (`p6_ch31_started`, `p6_rope_a`, `p6_rope_b`, `p6_rope_c`, `p6_squawks_sheltered`, `p6_deck_shark_falling`, `p6_deck_shark_landed`, `p6_deck_shark_lifted`, `p6_deck_shark_heaved`, `p6_ses_shark_hit`, +2 more); items given: none.
4. **Current player actions and mechanics.** Objectives: “Secure the shrouds (starboard, port, and the quarterdeck braces)” [event×3]; “Get Squawks under cover (his basket, by the cabin door)” [flag]; “Shark on deck! Heave it overboard (midships, port of the mainmast)” [flag]; “Take the helm (the quarterdeck)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×4, TV state change (scripted) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×4). Presentation-only effects with no player input: TV state change (scripted) ×1. Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** The first true storm set-piece; currently sequential inspects and timing bars.
7. **Proposed primary mechanic.** Storm deck: a real-time crisis with three failing shrouds (each decays), falling-shark shadows to dodge (telegraphed by shadow), a shark to drag to the rail, then helm control in the gale.
8. **Secondary mechanics.** Crew assignment: send crew to hold one shroud while you fix another (first use of Crew stations).
9. **Enemies, puzzles, timers, hazards, resources.** Falling sharks (shadows), slack shrouds that snap if ignored, a rolling deck that pushes movement.
10. **Failure conditions and consequences.** A shroud parts → mast damage carried into Phase 7 (extra repair job); captain hit by a shark → knocked down, lose time; never a game over unless Ship Integrity reaches zero (then retry from chapter start).
11. **Dependencies.** Entry: p6c6 (p6c6.frenzy -> p6c7.begin). Start flag: `p6_ch31_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 9 (room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle, npc pete). In-room hooks into this chapter: map objects in main_deck ×5; NPC dialogue in squawks.
12. **Complexity and priority.** Complexity L, priority P1.
13. **Preserving story and humour; variety.** 'A whole shark, upside down, mouth open, very surprised' becomes the hazard; keep Fennimore's lines.

### `p6c8` · Chapter 32: Another Ocean

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `p6c8`, Chapter 32: Another Ocean. Scripts: 9 in `data/story/cutscenes/phase6/ch32.json`. Quests: `frog_grog_offensive` “The Frog Grog Offensive” in `data/quests/phase6.json`.
2. **Events and dialogue.** A shark lands in the bulk Frog Grog and prefers the sea; the crew realise the grog repels sharks; roll five barrels to the rail and launch them into the storm; the horizon; Garrick sniffs something. Dialogue: 95 lines ((narration) 45, garrick 16, captain 14, squawks 5, pete 4, crew 4, mags 3, gristle 2, +1 more); 0 choice prompt(s) with 0 options. Presentation: vista ×4, shake ×2, insert ×1, transition ×1.
3. **Characters, locations, props, flags.** Speaking characters: garrick, squawks, pete, crew, mags, gristle, hale. NPCs with dialogue keyed to an objective (hints, reactions or completions): garrick. Rooms: `main_deck`. Interactables: `p6_bulk_take` (main_deck 5,25), `p6_bulk_launch` (main_deck 16,24), `p6_horizon` (main_deck 4,28). Flags set: 8 (`p6_ch32_started`, `p6_barrel_ready`, `bulk_frog_grog_depleted`, `p6_storm_driven_off`, `great_sharkstorm_active`, `garrick_food_ban`, `p6_epilogue_seen`, `p6_complete`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Roll barrels to the rail and launch them into the storm” [event×5]; “Look at the horizon (the telescope, starboard)” [flag]; “See what the Grand Stenchmaster's sniffing at (midships)” [flag]. Mechanics invoked by the scripts: timing bar (repair) ×1.
5. **Classification.** Timing / skill input (timing bar (repair) ×1). Nothing in this chapter can fail in a way that costs the player anything.
6. **Gameplay opportunities.** Already a carry-and-throw scene; this is where the player turns the stink into a weapon (a running theme).
7. **Proposed primary mechanic.** Barrel artillery: roll barrels across a pitching deck and launch them into the funnel at the right moment (aim + timing); each hit pushes the storm back.
8. **Secondary mechanics.** Resource tie-in: the barrel count from p6c1 limits attempts.
9. **Enemies, puzzles, timers, hazards, resources.** Rolling deck, barrels that slide back, sharks landing on the route.
10. **Failure conditions and consequences.** Run out of barrels → the storm reaches the ship (bigger repair load in Phase 7); retry possible with fewer barrels.
11. **Dependencies.** Entry: p6c7 (p6c7.breaking -> p6c8.begin). Start flag: `p6_ch32_started`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 7 (room galley, room main_deck, npc garrick, npc squawks, npc bob, npc ned, npc jim, npc gristle). In-room hooks into this chapter: map objects in main_deck ×3; NPC dialogue in garrick.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** 'Did it just choose the SEA over the GROG?' is the setup; the payoff is that the player wins with weaponised grog.
