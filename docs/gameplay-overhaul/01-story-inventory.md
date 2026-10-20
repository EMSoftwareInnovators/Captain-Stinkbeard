# 01 · Story inventory

Every implemented chapter of Captain Stinkbeard, with its current gameplay and a proposed overhaul. The detailed per-chapter entries (all 13 audit fields) are in the per-phase files linked below; this page is the index and the summary.

## How this was produced

The chapter list comes from `data/game.json` (`chapters`). For each chapter the audit tooling loaded the merged content through `src/content/ContentDB.js`, parsed every script whose id starts with the chapter id (the prologue uses the `cutscene.*` scripts), and counted dialogue lines, speakers, choices, mechanics commands, presentation commands, flags, quests and objectives. It also mapped each objective to the map objects, NPC dialogue entries and story triggers that complete it, and traced flag dependencies across chapters, rooms, NPCs and triggers. I then reviewed a digest of every chapter (objectives, where they are completed, speaker counts, opening lines) and wrote the assessment fields by hand.

Depth, stated plainly: every chapter was examined at this data-and-digest level. I did not read all ~11,000 dialogue lines word for word. Where a proposal quotes a line, the quote comes from the chapter’s own scripts.

## Counts

- Story phases: **17** (Phase 1 is the prologue and engine foundation; Story Phases 2–17 are listed in `docs/STORY_PHASE2.md` … `docs/STORY_PHASE17.md`).
- Playable chapter entries: **223**, made up of the prologue and **222** numbered chapters (Chapter 1 to Chapter 222).
- `data/game.json` also holds **16 phase-end markers** (`phase2_end` … `phase17_end`, 239 entries in all). They are completion states used by the chapter select and presets, not chapters, so they are not counted here.
- Dialogue lines across all chapters: **11,301**.
- Classification: **Walk + press A** 112, **Timing / skill input** 79, **Choice or puzzle prompt** 23, **Dialogue / cutscene only** 9.
- Mechanics with player input, by number of chapters that use them: timing bar (repair) 66, Brogath reassurance prompt 16, TV close-up 9, teller window 7, Shark Duty 4, proceeding (form/hearing/pitch) 4, dice roll 2, appraisal 2, battle (map encounters) 1, sash tension (hold) 1, teller deposit 1, battle 1.
- Chapters with a scripted battle: **1** (the optional drill in `p17c5`). The prologue’s three rat fights are map encounters (`hold_rats_1`, `hold_rats_2`, `hold_rats_nest` in `data/encounters/prologue.json`), not chapter scripts, so all of the game’s story combat sits in the prologue plus that one drill.
- Proposed priorities: P1 45, P2 84, P3 94; complexity: S 141, M 71, L 11; quiet beats to protect: 88.

## Findings that affect the overhaul

1. **Most chapters are walk-and-press-A.** A chapter counts as “walk + press A” when the player only talks to people, inspects objects or steps on tiles, and as “dialogue / cutscene only” when there is no objective at all. Together these make up 121 of 223 chapters. A further 23 add only a choice or puzzle prompt (working the TV set, reassurance choices, forms, appraisal, a die whose result is fixed by the script). Just 79 ask for timed input at all.
   Of those 79, **64** use only the repair timing bar.
2. **Nothing after the prologue can be failed.** The repair timing bar never fails: the script waits for the strikes and at most stores how many were clean. Only 2 of the 177 timing-bar steps in the scripts keep that number, and 3 scripts read it. Shark Duty’s bar widens after two misses “so it can’t be failed” (`src/systems/hazards/sharkDuty.js`); a slow strike lets a shark bite, which only adds a hull patch to hammer. The sash-tension hold “never fails” (`src/systems/script/commands.js`). Hearings and pitches send the player back to retry. Fume exposure ends in a collapse that carries the captain out. The course dial and the bell alarms are presentation: the dial drifts on its own and the alarms play, with no input. The only fights that can end the game are the prologue’s three rat encounters (`hold_rats_1`, `hold_rats_2`, `hold_rats_nest`), which lead to Game Over and a retry from the autosave; the prologue’s sparring match and the Phase 17 drill are `nonLethal`.
3. **Combat is almost absent from the story.** Outside the prologue, the only scripted battle in 222 chapters is Tilda’s optional, non-lethal drill (`p17c5`). The game has 4 enemy types; the `cutthroat` appears only in debug encounters.
4. **Five main quests are deliberately left open with no completion path in the current build.** None of their target flags is set by any script, map object or TV data:
   - `recover_crimson_fortune` (Phase 9, `data/quests/phase9.json`): crown from the megalodon, treasure on the sharks, treasure in the storm, deal with the storm.
   - `inside_great_sharkstorm` (Phase 10): get the Revenge out of the Sharkstorm; deal with the Bling Bling King.
   - `the_suspension` (Phase 12): an hours countdown that stays open.
   - `grand_waft_trials` (Phase 14): make sure the trials never happen.
   - `the_great_ledger_expedition` (Phase 17): blocked until the ship leaves the Sharkstorm.
   The quest files themselves say a later phase finishes them, so they are open on purpose. They are the natural spine for an endgame (see `05-overhaul-roadmap.md`).
5. **Objectives are signposted by the whole crew.** Many objectives in Phases 6–8 have dialogue on a dozen crew members keyed to them (field 3 lists them). Mostly these are hints and reactions, such as `hale.p7_wa_helm` pointing at the helm. A few really can be completed through anyone, such as `p8c3` “ask anyone at all”. Players rarely get stuck, but the work of finding things out is done for them.
6. **Chapter state is spread through world data.** Most chapters set flags that rooms, NPC dialogue or triggers read (field 11). Moving rooms or people changes chapter behaviour unless those readers move with them; `04-gameplay-systems.md` covers this risk.

## Per-phase files

- [Phase 1: The Prologue (engine foundation)](story/phase-01.md): 1 chapter (prologue–prologue)
- [Phase 2: Garrick Grumblegut and the Cursed Treasure](story/phase-02.md): 8 chapters (ch1–ch8)
- [Phase 3: The Grand Stenchmaster](story/phase-03.md): 6 chapters (p3c1–p3c6)
- [Phase 4: Life Around the Dead Center](story/phase-04.md): 5 chapters (p4c1–p4c5)
- [Phase 5: What Does the Grand Stenchmaster Actually Do?](story/phase-05.md): 5 chapters (p5c1–p5c5)
- [Phase 6: The Death Rattle of the S.E.S. and the Midnight Stenchmaster Catastrophe](story/phase-06.md): 8 chapters (p6c1–p6c8)
- [Phase 7: The Great Sharkstorm Returns and the Song of the Grand Stenchmaster](story/phase-07.md): 9 chapters (p7c1–p7c9)
- [Phase 8: The Lost Fart and the Grand Nap](story/phase-08.md): 13 chapters (p8c1–p8c13)
- [Phase 9: The Grand Treasure Catastrophe](story/phase-09.md): 16 chapters (p9c1–p9c16)
- [Phase 10: The Great Sharkstorm Spout Catastrophe](story/phase-10.md): 25 chapters (p10c1–p10c25)
- [Phase 11: The Grand Bedtime Argument](story/phase-11.md): 16 chapters (p11c1–p11c16)
- [Phase 12: The Thirty-Second Sash Trial](story/phase-12.md): 15 chapters (p12c1–p12c15)
- [Phase 13: The Ancient Stenchmaster Delirium](story/phase-13.md): 19 chapters (p13c1–p13c19)
- [Phase 14: Return of Brogath](story/phase-14.md): 24 chapters (p14c1–p14c24)
- [Phase 15: The Great Mellowing](story/phase-15.md): 16 chapters (p15c1–p15c16)
- [Phase 16: The Grand Lighter](story/phase-16.md): 20 chapters (p16c1–p16c20)
- [Phase 17: The Return of the Ancient Crew and the Coffin Sock Catastrophe](story/phase-17.md): 17 chapters (p17c1–p17c17)

## Chapter index

Class: D = dialogue / cutscene only, W = walk + press A, C = choice or puzzle prompt, T = timing / skill input. Mechanics are those the chapter’s scripts invoke today. Proposed primary mechanics are shortened here; see the phase file for the full entry.


### Phase 1: The Prologue (engine foundation)

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `prologue` | – | Prologue | 26 | T | battle (map encounters) ×3 | Tutorial voyage | M | P1 |  |

### Phase 2: Garrick Grumblegut and the Cursed Treasure

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `ch1` | 1 | The Man in the Bathtub | 104 | W | – | Rescue at sea | M | P2 |  |
| `ch2` | 2 | Garrick's First Day at Sea | 111 | W | – | Watch duty | M | P2 |  |
| `ch3` | 3 | Blackbeard's Treasure Room | 70 | W | – | Sokoban-style chest-righting puzzle with Garrick as an unreliable partner (he lifts when… | M | P2 |  |
| `ch4` | 4 | The Grumblegut Gust | 44 | D | – | Escape the Gust | L | P1 |  |
| `ch5` | 5 | The Cloud Takes the Ship | 48 | W | – | Keep mostly narrative; add a short 'read the cloud' interaction: use wind direction and p… | S | P3 | yes |
| `ch6` | 6 | Save Captain Squawks | 44 | W | – | Fume dive | M | P1 |  |
| `ch7` | 7 | The Fate of the Treasure | 83 | W | – | Salvage triage | M | P2 |  |
| `ch8` | 8 | The Trial of Garrick Grumblegut | 102 | W | – | Naval encounter | L | P1 |  |

### Phase 3: The Grand Stenchmaster

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p3c1` | 9 | The Grand Stenchmaster Takes Command | 110 | W | – | Keep as a narrative beat with one interactive layer | S | P3 | yes |
| `p3c2` | 10 | Blackbeard Becomes Stinkbeard | 98 | W | – | Introduce Beard Saturation | S | P2 |  |
| `p3c3` | 11 | The Birth of Frog Grog | 112 | W | – | Resource economy | M | P2 |  |
| `p3c4` | 12 | The Ship's Transformation | 89 | W | – | Ship survey | M | P1 |  |
| `p3c5` | 13 | The Sharks Smell the Gust | 119 | T | timing bar (repair) ×1 | Hull breach defence | L | P1 |  |
| `p3c6` | 14 | The Grand Stenchmaster's Terms | 135 | W | – | Terms negotiation as a resource deal (what Garrick gets vs. what the ship gets: rations,… | M | P2 |  |

### Phase 4: Life Around the Dead Center

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p4c1` | 15 | Morning with the Frog Grog | 123 | W | – | Forecast reading | M | P1 |  |
| `p4c2` | 16 | Life Around the Center | 134 | T | timing bar (repair) ×1 | Crisis management day | L | P1 |  |
| `p4c3` | 17 | The Center Picks the Worst Places | 84 | W | – | Short rescue | M | P2 |  |
| `p4c4` | 18 | Shark Duty | 102 | W | – | Make Shark Duty the core action-combat introduction | L | P1 |  |
| `p4c5` | 19 | The Worst Forecast Yet | 88 | T | timing bar (repair) ×3 | Repair under a clock with materials | M | P2 |  |

### Phase 5: What Does the Grand Stenchmaster Actually Do?

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p5c1` | 20 | Another Terrible Day | 102 | T | Shark Duty ×1 | Morning rounds as a scheduled task loop (check stores, wake crew) interrupted by a Dead C… | M | P2 |  |
| `p5c2` | 21 | What Do You Actually Do? | 155 | C | TV close-up ×1 | Shark Duty round (reuse ch18 combat) with Garrick as a distraction hazard (his chair bloc… | M | P2 |  |
| `p5c3` | 22 | The Grand Stenchmaster's Office | 76 | W | – | Two-rail defence with boarding sharks (enemy variety | M | P2 |  |
| `p5c4` | 23 | Dressed for Disaster | 115 | T | timing bar (repair) ×3 | Search-and-command | M | P2 |  |
| `p5c5` | 24 | One Useful Thing | 117 | T | timing bar (repair) ×2 | Phase finale | L | P1 |  |

### Phase 6: The Death Rattle of the S.E.S. and the Midnight Stenchmaster Catastrophe

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p6c1` | 25 | The Grand Stenchmaster's Supper | 103 | T | Shark Duty ×1 | Keep the supper as a narrative beat; make the barrels a tracked ship resource (count show… | S | P3 | yes |
| `p6c2` | 26 | The Frog Tax Man | 64 | C | TV close-up ×1 | S.E.S. shutdown puzzle | M | P2 |  |
| `p6c3` | 27 | The Machine Refuses to Die | 79 | T | timing bar (repair) ×4 | Fire crisis | M | P1 |  |
| `p6c4` | 28 | The Worst Morning | 68 | T | Shark Duty ×1 | Shark Duty as a proper combat shift | M | P1 |  |
| `p6c5` | 29 | The Burning Warning | 97 | T | timing bar (repair) ×1 | Timed evacuation | M | P1 |  |
| `p6c6` | 30 | The Mightiest Gust Yet | 77 | W | – | Short 'brace and hold' sequence | S | P2 |  |
| `p6c7` | 31 | The Great Sharkstorm | 79 | T | timing bar (repair) ×4 | Storm deck | L | P1 |  |
| `p6c8` | 32 | Another Ocean | 95 | T | timing bar (repair) ×1 | Barrel artillery | M | P1 |  |

### Phase 7: The Great Sharkstorm Returns and the Song of the Grand Stenchmaster

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p7c1` | 33 | It's Coming Back | 77 | T | Shark Duty ×1, timing bar (repair) ×2 | Repair round | M | P1 |  |
| `p7c2` | 34 | Which Away? | 67 | T | timing bar (repair) ×4 | Storm deck II with escalation | L | P1 |  |
| `p7c3` | 35 | Not a Stenchmaster Duty | 73 | W | – | Keep as dialogue; add one mechanical beat | S | P3 | yes |
| `p7c4` | 36 | The Job Description | 57 | W | – | Keep as narrative; surface the Crew roster screen here for the first time (each grievance… | S | P3 | yes |
| `p7c5` | 37 | The Grand Stenchmaster's Parade | 49 | T | timing bar (repair) ×3 | Multi-task shift | S | P2 |  |
| `p7c6` | 38 | The Song of the Grand Stenchmaster | 86 | W | – | Keep the song; then 'catch him at it' | M | P2 |  |
| `p7c7` | 39 | Everyone Below | 41 | T | timing bar (repair) ×1 | Retreat run | S | P2 |  |
| `p7c8` | 40 | The Stenchmaster Entertainment System Mark II | 94 | T | timing bar (repair) ×1, TV close-up ×1 | Keep largely narrative; the switch beat becomes a 'hold him back' timing (twice). | S | P3 | yes |
| `p7c9` | 41 | A Pleasant Evening | 110 | W | – | Quiet beat | S | P3 | yes |

### Phase 8: The Lost Fart and the Grand Nap

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p8c1` | 42 | Trapped Below Deck with Franklin | 79 | W | – | Bunker management (light) | M | P2 |  |
| `p8c2` | 43 | Does the Grand Stenchmaster Need to Blow? | 66 | W | – | False-alarm stampede | S | P2 |  |
| `p8c3` | 44 | Request for Sash Bearers | 59 | W | – | Keep as dialogue (each refusal is a joke). Optional | S | P3 | yes |
| `p8c4` | 45 | The Grand Expedition for the Lost Fart | 47 | W | – | Mock dungeon | S | P3 |  |
| `p8c5` | 46 | The Legend of the Lost Fart | 61 | D | – | Keep as is (quiet beat). | S | P3 | yes |
| `p8c6` | 47 | The Grand Stenchmaster's Grand Nap | 38 | D | – | Keep as is. | S | P3 | yes |
| `p8c7` | 48 | The Sleeping Quarters Are Lost | 52 | T | timing bar (repair) ×1 | Scouting run into the contaminated quarters (Atmosphere/exposure) to confirm they're lost… | S | P2 |  |
| `p8c8` | 49 | The Grand Decree | 18 | D | – | Keep as is. | S | P3 | yes |
| `p8c9` | 50 | Build the New Barracks | 60 | T | timing bar (repair) ×3 | Build mode (light) | M | P2 |  |
| `p8c10` | 51 | The Grand Bedtime Story | 173 | W | – | Keep (quiet beat). The existing choices remain the only interaction. | S | P3 | yes |
| `p8c11` | 52 | The Outfit Must Stay On | 54 | W | – | Keep as dialogue; the crown can be a physical carry item (heavy, jangling) that must be s… | S | P3 | yes |
| `p8c12` | 53 | The Grand Crown Falls | 40 | D | – | Keep as is. | S | P3 | yes |
| `p8c13` | 54 | The Sash Descends | 129 | W | – | Stealth wake-up | M | P2 |  |

### Phase 9: The Grand Treasure Catastrophe

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p9c1` | 55 | The Morning After the Grand Nap | 78 | W | – | Keep as narrative; crew sleep quality from the p8c9 layout feeds their condition (fatigue… | S | P3 | yes |
| `p9c2` | 56 | A Completely Authentic History | 111 | W | – | Cross-examination | S | P2 |  |
| `p9c3` | 57 | No Receipt | 62 | W | – | Witness order | S | P2 |  |
| `p9c4` | 58 | The Grand Sash Bureaucracy | 72 | W | – | Keep as narrative. | S | P3 | yes |
| `p9c5` | 59 | LAND! | 35 | W | – | Keep as is (35 lines). | S | P3 | yes |
| `p9c6` | 60 | The Landing Problem | 48 | W | – | Landing planner | M | P2 |  |
| `p9c7` | 61 | The Grand Sharkmaster | 80 | W | – | Keep as narrative; establishes Pete's Sharkmaster role used by crew stations (shark watch… | S | P3 | yes |
| `p9c8` | 62 | The Lee-Side Landing | 66 | T | timing bar (repair) ×5 | Reef run | L | P1 |  |
| `p9c9` | 63 | Crownskull Isle | 15 | W | – | Exploration with hazards | M | P1 |  |
| `p9c10` | 64 | The Fortune of the Crimson Kings | 47 | T | timing bar (repair) ×1 | Keep as narrative (crew dreams are character beats). | S | P3 | yes |
| `p9c11` | 65 | Seven Floors Down | 58 | T | timing bar (repair) ×3 | Excavation | M | P2 |  |
| `p9c12` | 66 | Stenchmaster Excavation Technology | 33 | W | – | Keep as is. | S | P3 | yes |
| `p9c13` | 67 | RUN | 61 | T | timing bar (repair) ×4 | Fortify the shelter against a countdown (Garrick's build-up): jobs with different duratio… | M | P1 |  |
| `p9c14` | 68 | Fire in the Hole | 37 | W | – | Survive the barrage | M | P1 |  |
| `p9c15` | 69 | Vertical Relocation | 52 | W | – | Keep as narrative (vistas). | S | P3 | yes |
| `p9c16` | 70 | The Shark Shanty | 82 | W | – | Keep the shanty; turn 'Recover the Crimson Fortune' into a persistent bounty system: spec… | M | P2 |  |

### Phase 10: The Great Sharkstorm Spout Catastrophe

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p10c1` | 71 | Not Pete's Fault | 53 | W | – | Salvage search with hazards | S | P2 |  |
| `p10c2` | 72 | The Saddest Salvage | 45 | W | – | Tiara grab | S | P2 |  |
| `p10c3` | 73 | Wealthy Sharks | 32 | D | – | Keep as narrative. | S | P3 | yes |
| `p10c4` | 74 | The Participation Prize | 33 | W | – | Keep as narrative. | S | P3 | yes |
| `p10c5` | 75 | The Least Celebratory Celebration | 31 | W | – | Morale restoration | S | P2 |  |
| `p10c6` | 76 | The Grand Galley Grand Chef | 38 | T | timing bar (repair) ×4 | Galley cooking mini-game | M | P2 |  |
| `p10c7` | 77 | Shark Catering | 38 | T | timing bar (repair) ×3 | Shark rubbish sweep under light pressure (sharks drop more rubbish while you sweep; clear… | S | P3 |  |
| `p10c8` | 78 | That Release Moved In | 71 | W | – | Room-loss management | M | P2 |  |
| `p10c9` | 79 | Shark Suites | 38 | T | timing bar (repair) ×2 | Pillow catch | S | P2 |  |
| `p10c10` | 80 | Bad Hotel | 31 | T | timing bar (repair) ×3 | Keep short; reuse build mode with the galley's furniture (tables, stove) as obstacles. | S | P3 | yes |
| `p10c11` | 81 | Bedtime Television | 25 | W | – | Keep; the lamp becomes a fire-risk mini-hazard (trim the wick before it catches a sack). | S | P3 | yes |
| `p10c12` | 82 | Brogath the Bashful | 30 | W | – | Keep as narrative; the book becomes a codex item that collects 'legend pages' with gamepl… | S | P3 | yes |
| `p10c13` | 83 | Sweet Dreams | 29 | W | – | Keep; collect the three tokens (codex/evidence). | S | P3 | yes |
| `p10c14` | 84 | Meet Wind with Wind | 44 | W | – | Keep as narrative; log 'meet wind with wind' as a plan clue. | S | P3 | yes |
| `p10c15` | 85 | Fart Man | 28 | W | – | Keep as is. | S | P3 | yes |
| `p10c16` | 86 | Fart Literature | 36 | T | timing bar (repair) ×1 | Stealth borrow (sleep meter, reuse p8c13) + research puzzle: assemble the Rumpold method… | M | P2 |  |
| `p10c17` | 87 | The Counter-Sharkstorm Initiative | 56 | W | – | Keep the briefing; the decision screen shows the plan's requirements (sash holders, feast… | S | P3 | yes |
| `p10c18` | 88 | Sash Holders | 58 | W | – | Keep; drawing lots can be a small rigged-lots gag the player can play. | S | P3 | yes |
| `p10c19` | 89 | The Grand Feast | 76 | T | timing bar (repair) ×7 | Cooking challenge II | M | P1 |  |
| `p10c20` | 90 | The Approach | 39 | T | timing bar (repair) ×6 | Battle stations | M | P1 |  |
| `p10c21` | 91 | The One Time | 68 | W | – | Escort the charged Garrick | M | P1 |  |
| `p10c22` | 92 | The Wrong Way | 40 | T | timing bar (repair) ×3 | Helm alignment under fire | L | P1 |  |
| `p10c23` | 93 | Inside the Spout | 45 | C | TV close-up ×1 | Keep; aerial adjustment on a rotating ship (signal drifts as the ship turns). | S | P3 | yes |
| `p10c24` | 94 | The Impossible Audit | 50 | W | – | Keep as is. | S | P3 | yes |
| `p10c25` | 95 | I Used to Be Blackbeard | 56 | W | – | Keep as narrative (quiet beat). | S | P3 | yes |

### Phase 11: The Grand Bedtime Argument

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p11c1` | 96 | Bedtime Inside the Great Sharkstorm | 31 | T | timing bar (repair) ×1 | Introduce 'Tilting Galley' | S | P2 |  |
| `p11c2` | 97 | Grand Bedside Illumination System | 41 | T | timing bar (repair) ×2 | Lamp rigging puzzle | S | P2 |  |
| `p11c3` | 98 | Brogath's Treasure Story | 34 | W | – | Keep (legend codex page). | S | P3 | yes |
| `p11c4` | 99 | Every Sash Incident | 41 | W | – | Evidence board | S | P3 |  |
| `p11c5` | 100 | The Grand Finger-Puller | 33 | W | – | Keep; votes reflect crew morale/loyalty values (data feed only). | S | P3 | yes |
| `p11c6` | 101 | The Storm Starts Listening | 22 | W | – | Keep; tokens collected (evidence). | S | P3 | yes |
| `p11c7` | 102 | Hammocks Begin to Die | 34 | T | timing bar (repair) ×1 | Sliding table | S | P2 |  |
| `p11c8` | 103 | The Lost Book | 33 | T | timing bar (repair) ×1 | Keep; brace is one timing bar. | S | P3 | yes |
| `p11c9` | 104 | Cheap-O-Rama Emergency Delivery | 30 | T | timing bar (repair) ×1 | Crate carry | S | P2 |  |
| `p11c10` | 105 | The Pocket Sacred Text | 23 | W | – | Keep. | S | P3 | yes |
| `p11c11` | 106 | Bed Sashes | 27 | T | timing bar (repair) ×3 | Sashes become a crafting material (rope substitute) in the inventory; re-hanging hammocks… | S | P2 |  |
| `p11c12` | 107 | The Grand Nap's Grand Resumption | 15 | W | – | Keep as is. | S | P3 | yes |
| `p11c13` | 108 | Sir Rumpus and Fart Validity | 28 | D | – | Keep (codex). | S | P3 | yes |
| `p11c14` | 109 | Late-Night Bling Bling King | 16 | C | TV close-up ×1 | Keep; the knob shutdown can reuse the p6c2 puzzle with a harder sequence. | S | P3 | yes |
| `p11c15` | 110 | The First Great Sash Flutter | 31 | W | – | Keep. | S | P3 | yes |
| `p11c16` | 111 | Secret Research and the Anti-Dice Conspiracy | 97 | T | timing bar (repair) ×3 | Night heist | M | P1 |  |

### Phase 12: The Thirty-Second Sash Trial

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p12c1` | 112 | He Woke Up Loaded | 39 | W | – | Equipment prep | S | P1 |  |
| `p12c2` | 113 | Volunteer | 26 | W | – | Keep. | S | P3 | yes |
| `p12c3` | 114 | Pre-Waft | 15 | W | – | Keep. | S | P3 | yes |
| `p12c4` | 115 | The Thirty-Second Trial | 6 | T | sash tension (hold) ×1 | Sash endurance | M | P1 |  |
| `p12c5` | 116 | The Flutter | 31 | W | – | Keep; tokens are evidence. | S | P3 | yes |
| `p12c6` | 117 | Three Weeks! | 19 | D | – | Keep. | S | P3 | yes |
| `p12c7` | 118 | Find the Dice | 41 | W | – | Search race | S | P2 |  |
| `p12c8` | 119 | Rules, Loopholes and No Escape | 44 | W | – | Loophole hunt | S | P2 |  |
| `p12c9` | 120 | The Grand Dice Shipment | 12 | W | – | Keep. | S | P3 | yes |
| `p12c10` | 121 | The Grand Dice Ceremony | 47 | C | dice roll ×8 | Weighted dice | S | P3 |  |
| `p12c11` | 122 | Mexican Jumping Beans | 34 | C | dice roll ×13 | Catch the hopping die | S | P2 |  |
| `p12c12` | 123 | Garrick Is Not Grand | 16 | W | – | Keep; the suspension countdown shows on the HUD (existing var). | S | P3 | yes |
| `p12c13` | 124 | The Authenticity Whiff | 34 | W | – | Keep; the inhalation adds Beard Saturation (persistent) as a real consequence. | S | P3 | yes |
| `p12c14` | 125 | A Normal Pirate Breakfast | 30 | T | timing bar (repair) ×6 | Cooking mini-game (relaxed difficulty) | S | P3 | yes |
| `p12c15` | 126 | One Day Is Apparently Unbearable | 42 | W | – | Interception | S | P2 |  |

### Phase 13: The Ancient Stenchmaster Delirium

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p13c1` | 127 | The Finger-Pulling Breakdown | 27 | W | – | Keep; optional rebuttal choices draw on p12c8's fine print (show the clause). | S | P3 | yes |
| `p13c2` | 128 | Don't Throw My Sash in the Trash | 15 | W | – | Contaminated equipment | S | P3 |  |
| `p13c3` | 129 | The Sleeping Quarters Are Alive | 33 | T | timing bar (repair) ×3 | Room reclamation | M | P1 |  |
| `p13c4` | 130 | Condemn the Bedding | 32 | T | timing bar (repair) ×2 | Sort-and-dispose | S | P2 |  |
| `p13c5` | 131 | Grand Stenchmaster Bedding | 20 | T | timing bar (repair) ×5 | Quarters rebuild (build mode) | M | P1 |  |
| `p13c6` | 132 | The Fan Mega-Pack | 22 | W | – | Keep the placement choices; they are already player decisions with consequences (where ca… | S | P3 | yes |
| `p13c7` | 133 | Build-Your-Own S.E.S. | 26 | T | timing bar (repair) ×1 | Scavenger hunt with light routing (the parts are guarded by small hazards: the hold salva… | S | P3 |  |
| `p13c8` | 134 | Wire the Two Systems Together | 22 | T | timing bar (repair) ×5 | Cable routing | S | P2 |  |
| `p13c9` | 135 | The Stenchmaster Channel | 15 | W | – | Keep. | S | P3 | yes |
| `p13c10` | 136 | Stench-O-Vision | 14 | C | TV close-up ×1 | Keep; the Stench-O-Vision vents a small fume zone that grows until the knobs are set (reu… | S | P3 | yes |
| `p13c11` | 137 | Poor in Gold, Rich in Gas | 11 | W | – | Keep. | S | P3 | yes |
| `p13c12` | 138 | Captain Stinkbeard Finally Reaches His Limit | 27 | W | – | Keep; the rant targets are the player's choice (existing inspects). | S | P3 | yes |
| `p13c13` | 139 | The Beard Betrays Him | 18 | D | – | Trigger the 'Saturated' status (screen tint, doubled sprites, controls slightly delayed)… | S | P1 |  |
| `p13c14` | 140 | Every Ancient Stenchmaster Is Here | 34 | W | – | Hallucination rounds | M | P1 |  |
| `p13c15` | 141 | Disarm the Ancient Stenchmasters | 32 | T | timing bar (repair) ×2 | Defuse round on a timer (the Saturated captain believes an apocalypse is imminent): seven… | M | P2 |  |
| `p13c16` | 142 | Ancient Stenchmaster Apocalypse | 22 | T | timing bar (repair) ×5 | Command round | M | P2 |  |
| `p13c17` | 143 | Two Brogaths | 25 | W | – | Keep. | S | P3 | yes |
| `p13c18` | 144 | Brogath in the Treasure Room | 32 | T | timing bar (repair) ×1 | Keep with a short run below through the galley and hold (Saturated controls). | S | P3 | yes |
| `p13c19` | 145 | The Brogath Command Crisis | 40 | T | timing bar (repair) ×3 | Helm duel | M | P1 |  |

### Phase 14: Return of Brogath

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p14c1` | 146 | The Door Opens | 44 | T | timing bar (repair) ×2 | Lash-down crisis on deck (loose objects become projectiles if not lashed in time), then a… | M | P2 |  |
| `p14c2` | 147 | The Plume | 7 | W | – | Follow the plume (a short tail sequence; keep distance or it speeds away). | S | P3 | yes |
| `p14c3` | 148 | Brogath Returns | 41 | C | Brogath reassurance prompt ×1 | Keep as introduction; the stability meter appears with a clear tutorial. | S | P2 |  |
| `p14c4` | 149 | The Containment Corner | 45 | T | timing bar (repair) ×3 | Barricade build (place four objects to form a cover line; push mechanics); rules start a… | S | P2 |  |
| `p14c5` | 150 | Keep Brogath Confident | 56 | C | Brogath reassurance prompt ×1 | Brogath Pressure management | M | P1 |  |
| `p14c6` | 151 | The Apology Eruption | 48 | T | timing bar (repair) ×7, Brogath reassurance prompt ×3 | Eruption crisis | M | P1 |  |
| `p14c7` | 152 | Back in Office | 53 | C | Brogath reassurance prompt ×1 | Keep; the sash is a hazardous carry (Beard Saturation if touched without tongs). | S | P3 | yes |
| `p14c8` | 153 | Two Grand Stenchmasters | 51 | W | – | Ego balance | S | P2 |  |
| `p14c9` | 154 | Beans of Ancient Precedent | 60 | W | – | Compliment rhythm (alternate correctly) while cooking six dishes (reuse cooking system);… | M | P2 |  |
| `p14c10` | 155 | The Fart-Free Zone | 50 | T | timing bar (repair) ×2 | Sanctuary setup | M | P2 |  |
| `p14c11` | 156 | Getting Rid of Brogath | 46 | W | – | Keep (dialogue). | S | P3 | yes |
| `p14c12` | 157 | Beyond Broke | 33 | W | – | Keep; codex pages become recipe/plan entries (data). | S | P3 | yes |
| `p14c13` | 158 | The Grand Economy of Farts | 21 | W | – | Keep; Grand Currency denominations become a real (absurd) secondary currency in the inven… | S | P3 | yes |
| `p14c14` | 159 | Bad Money | 32 | T | timing bar (repair) ×2 | Keep; the purse check shows currency conversion (the existing appraisal). | S | P3 | yes |
| `p14c15` | 160 | Grand Temporary Ancient Oat Security Officer | 50 | T | timing bar (repair) ×4 | Babysit | S | P2 |  |
| `p14c16` | 161 | Important Television Duty | 30 | C | TV close-up ×1 | Keep; channel selection reuses TV knobs. | S | P3 | yes |
| `p14c17` | 162 | The Sash Flutter Commercial | 30 | T | TV close-up ×1, timing bar (repair) ×2, Brogath reassurance prompt ×2 | Commercial crisis | M | P1 |  |
| `p14c18` | 163 | The Grand Bank | 46 | W | – | Keep. | S | P3 | yes |
| `p14c19` | 164 | Your Gas Is Our Business | 17 | T | teller window ×2 | Teller shifts with escalating rules (forgeries, impatient customers, a stability meter if… | M | P2 |  |
| `p14c20` | 165 | Legendary Depositors | 5 | W | – | Legend customers with unique teller rules (each legend from the codex has a quirk). | S | P2 |  |
| `p14c21` | 166 | The Branch Concludes Business | 36 | W | – | Vault dash | S | P2 |  |
| `p14c22` | 167 | Distinguishedly Furious | 69 | C | Brogath reassurance prompt ×5 | Brogath 'boss' | M | P1 |  |
| `p14c23` | 168 | The Brogath Problem | 50 | W | – | Keep; the sums are a small calculation puzzle (how much water). | S | P3 | yes |
| `p14c24` | 169 | Mandatory History Night | 63 | T | TV close-up ×2, timing bar (repair) ×1, Brogath reassurance prompt ×1 | Keep the structure; the three commercial-break responses are a quick-reaction stability r… | S | P2 |  |

### Phase 15: The Great Mellowing

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p15c1` | 170 | The Stenchmaster Channel Presents | 68 | W | – | Station check as a Crew-stations tutorial | S | P2 |  |
| `p15c2` | 171 | The Top Ten Most Embarrassing Sash Flutters | 69 | T | timing bar (repair) ×3 | Smoke investigation | S | P2 |  |
| `p15c3` | 172 | Family of Idiots | 78 | C | Brogath reassurance prompt ×3 | Keep mostly narrative; reassurance prompts become a gentle conversation puzzle (pick the… | S | P3 | yes |
| `p15c4` | 173 | The Grand Economic Recovery | 64 | W | – | Keep; the provocation is a controlled eruption the player positions (where to put the cra… | S | P2 |  |
| `p15c5` | 174 | Creative Conversion | 46 | C | Brogath reassurance prompt ×3 | Sorting under time (the smell spreads) | S | P2 |  |
| `p15c6` | 175 | Stinkbeard's Select Scent of Skunk | 73 | W | – | Guest onboarding | S | P2 |  |
| `p15c7` | 176 | The Chicken Incident | 35 | W | – | Keep. | S | P3 | yes |
| `p15c8` | 177 | The Grand Paranoia | 113 | W | – | Paranoia status | M | P2 |  |
| `p15c9` | 178 | The Grand Stenchmaster's Grand Nap | 47 | T | timing bar (repair) ×1 | Quarters upkeep | S | P2 |  |
| `p15c10` | 179 | The Nose-Fire Waft | 45 | T | timing bar (repair) ×3 | Altered-status catch | S | P2 |  |
| `p15c11` | 180 | The Bashfulness Branch | 28 | T | teller window ×1 | Keep; the Branch is a configurable special area (opens/closes on Brogath's stability). | S | P3 | yes |
| `p15c12` | 181 | The Great Mellowing | 71 | T | timing bar (repair) ×1 | Crew-wide 'mellow' condition | M | P2 |  |
| `p15c13` | 182 | The Untold Stories | 33 | T | timing bar (repair) ×2, Brogath reassurance prompt ×2 | Solo stations | M | P1 |  |
| `p15c14` | 183 | Relief Grand Teller | 20 | T | teller window ×1 | Teller shift (harder than p14c19) with a rating that unlocks a small perk. | S | P2 |  |
| `p15c15` | 184 | The Sash-Backed Loan Emergency | 64 | T | teller deposit ×1 | Form-processing puzzle (match stamps/fields under time) – a fun variant of the teller sys… | S | P2 |  |
| `p15c16` | 185 | The One Fart He Actually Misses | 121 | W | – | Phase finale | M | P2 |  |

### Phase 16: The Grand Lighter

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p16c1` | 186 | The Grand Search for Fire | 69 | C | Brogath reassurance prompt ×1 | Ship-wide search with Brogath Pressure ticking in the background (leaving Brogath alone t… | M | P2 |  |
| `p16c2` | 187 | The Grand Lighter | 37 | W | – | Lighter as an equipment item with a reliability stat (clicks); the parcel catch reuses fa… | S | P2 |  |
| `p16c3` | 188 | Coffin Sock | 40 | C | Brogath reassurance prompt ×1 | Ventilation run | M | P1 |  |
| `p16c4` | 189 | The Stenchmaster Fart Zone | 37 | W | – | Room construction | M | P1 |  |
| `p16c5` | 190 | Vindicta's Legendary Emergency | 46 | T | timing bar (repair) ×3 | Timed rescue | M | P1 |  |
| `p16c6` | 191 | The Near-Miss | 17 | C | Brogath reassurance prompt ×1 | Keep. | S | P3 | yes |
| `p16c7` | 192 | Chicken-Town | 35 | W | – | Keep; the 'sit and do nothing' is a lovely anti-mechanic (wait without input). | S | P3 | yes |
| `p16c8` | 193 | The Grand Dispensary | 13 | T | teller window ×1 | Keep with teller rules variant. | S | P3 | yes |
| `p16c9` | 194 | The Sash Lounge | 14 | T | teller window ×1 | Keep; the Sash Lounge becomes a permanent crew leisure area in the quarters layout. | S | P3 | yes |
| `p16c10` | 195 | The Grand Currency Converter | 14 | W | – | Keep. | S | P3 | yes |
| `p16c11` | 196 | Grand Sashback Rewards | 26 | T | appraisal ×1, teller window ×2 | Beard-appraisal underwriting | S | P2 |  |
| `p16c12` | 197 | The Hornet Fart | 34 | C | Brogath reassurance prompt ×1 | Procedure with a twist | S | P2 |  |
| `p16c13` | 198 | Stingbeard | 30 | T | timing bar (repair) ×2 | 'Hornet beard' status | S | P2 |  |
| `p16c14` | 199 | Sash-Quote Story Hour | 36 | W | – | Keep. | S | P3 | yes |
| `p16c15` | 200 | The Hornet Credit Boom | 22 | T | appraisal ×1, teller window ×1 | Keep; the epidemic is a rush shift (teller). | S | P3 | yes |
| `p16c16` | 201 | The History of the Grand Lighter | 20 | W | – | Keep. | S | P3 | yes |
| `p16c17` | 202 | The Portable Stenchmaster Entertainment System | 24 | W | – | Keep. | S | P3 | yes |
| `p16c18` | 203 | The 97-Page Application | 14 | C | proceeding (form/hearing/pitch) ×1 | Keep; the 97 pages could be a short form-filling puzzle (reuse p15c15). | S | P3 | yes |
| `p16c19` | 204 | The Grand Ignition Hearing | 14 | C | proceeding (form/hearing/pitch) ×1 | Keep; the hearing is a short argument (proceeding) with evidence choices. | S | P3 | yes |
| `p16c20` | 205 | Stinkbeard's Desperate Lighter Pitch | 35 | C | proceeding (form/hearing/pitch) ×1 | Pitch duel | M | P2 |  |

### Phase 17: The Return of the Ancient Crew and the Coffin Sock Catastrophe

| ID | # | Title | Lines | Class | Current mechanics | Proposed primary mechanic | Cx | Prio | Quiet |
|---|---|---|---|---|---|---|---|---|---|
| `p17c1` | 206 | Brogath Remembers | 50 | C | Brogath reassurance prompt ×1 | Keep (quiet beat). The memory items become codex entries introducing Jeb, Ledger, Tilda a… | S | P3 | yes |
| `p17c2` | 207 | The Cardboard Crew | 41 | W | – | Race to the door | S | P2 |  |
| `p17c3` | 208 | The Forbidden Door | 31 | T | timing bar (repair) ×2 | Door hold | S | P2 |  |
| `p17c4` | 209 | The Ancient Reunion | 35 | W | – | Keep (narrative). | S | P3 | yes |
| `p17c5` | 210 | Adult Supervision | 64 | T | timing bar (repair) ×2, battle ×1 | Tilda's drill becomes a mandatory combat training sequence (real-time field combat tutori… | M | P1 |  |
| `p17c6` | 211 | The Ninety-Seven Pages, Again | 23 | C | proceeding (form/hearing/pitch) ×1 | Keep. | S | P3 | yes |
| `p17c7` | 212 | The Crew He Left Behind | 21 | W | – | Keep (quiet beat). | S | P3 | yes |
| `p17c8` | 213 | The Ledgers of Greyhook Cove | 37 | T | timing bar (repair) ×1 | Command contest | M | P2 |  |
| `p17c9` | 214 | Captain Minutes | 42 | W | – | Keep; a short race to stop him before the converter cycles. | S | P3 | yes |
| `p17c10` | 215 | Meet the New Dead Idiots! | 21 | W | – | Keep. | S | P3 | yes |
| `p17c11` | 216 | The Grand Restraint | 48 | T | timing bar (repair) ×1, Brogath reassurance prompt ×1 | Negotiated procedure | M | P2 |  |
| `p17c12` | 217 | The Fire-Sharkstorm | 63 | W | – | Escort Agnes across the deck during the shark impacts (telegraphed hits), then a short At… | M | P2 |  |
| `p17c13` | 218 | Lord Vaporious Thunderbottom the Seventh | 47 | W | – | Lure-and-lead | M | P2 |  |
| `p17c14` | 219 | The Grand Fart Chamber | 39 | T | timing bar (repair) ×5 | Countdown rescue | M | P1 |  |
| `p17c15` | 220 | The Beard Exhales | 31 | W | – | Beard emissions | M | P1 |  |
| `p17c16` | 221 | The Beard Joint (Again) | 74 | W | – | Reuse the hallucination system (p13c14/p15c8) with escalation: the captain must identify… | M | P2 |  |
| `p17c17` | 222 | The Coffin Sock Catastrophe | 50 | T | timing bar (repair) ×1 | Catastrophe escape | L | P1 |  |
