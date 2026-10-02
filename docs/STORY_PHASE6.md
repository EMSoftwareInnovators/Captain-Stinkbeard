# Story Phase 6: The Death Rattle of the S.E.S. and the Midnight Stenchmaster Catastrophe

The fifth canonical story chapter, in two connected parts played as one phase.
It picks up a few days after Phase 5. The Grand Stenchmaster has improved his
suit again. He eats a jar of rotten garlic, finds the S.E.S.'s first proper
programme (The Frog Tax Man), and falls asleep in front of it. The set will
not die quietly. The next night something much bigger happens inside Garrick,
and it ends with a storm made of sharks.

The phase starts when the captain goes to bed in his cabin after Phase 5
("Sleep"). It ends with the rowboat epilogue: "DETAILS!" / "Unfortunately."
Far off on the horizon, the Great Sharkstorm is still turning. The next
canonical excerpt carries on from there. Phase 7 is not started.

About 60 to 100 minutes of play:

- 8 chapters (25 to 32) and 8 quests.
- 68 story flags.
- About 1,000 lines of dialogue: every crew member has something to say at each stage they're on deck.
- A television programme, a knob panel, three almost-fire smoulders and a cape.
- An evacuation with no failure state.
- The biggest set-piece so far.
- A survival sequence with flying sharks.
- A barrel offensive.

## Canon this phase adds

| Canon | How it shows in the game |
| --- | --- |
| The rotten-garlic supper | `rotten_garlic_supper_eaten`. The jar (GARLIC / DO NOT EAT / BADLY SPOILED) and raw onions. "Consider yourself warned." "YOUR WORKPLACE IS YOUR TROUSERS!" The first rumble; OUTSIDE; he takes the chair ("Seat warming."). |
| The Frog Tax Man | `frog_tax_man_unlocked`. The S.E.S.'s first recurring programme: Franklin (a frog in a tie and glasses), his accountant (green visor), and a judge (a frog in a wig). It is data (`data/tv/programs/frog_tax_man.json`) on channel 7: crude green CRT, a rolling bar, a laugh track and a sting for every tax term. Garrick is obsessed. |
| OFF MAYBE | The back panel, labelled in Garrick's crayon: LOUD, MORE LOUD, PICTURE MAYBE, DO NOT TOUCH, FROG, ???, OFF MAYBE (`ses_off_maybe`). |
| The death rattle | Whine, clicking, wheeze, kettle, groan, HONK ("Why?" "Garrick."). Then the warning card (WAIT BEFORE POKING / VERY ZAPPY), the BONK, the fork thrown into the mainmast, the last red light, BEEEE-OOOOP, "REMEMBER TO FILE BY APRIL FIFTEENTH!", POP. Nobody touches the inside of the set. |
| The S.E.S.'s condition | The saved value `ses_state`: `working` → `apparently_dead` → `shark_damaged`. A dead set can't be switched on. The shark-damaged set has cracked glass, a bite, soot, a flattened aerial and a hole in the rail beside it. It is never thrown overboard ("Throw it overboard." ... "Later."). |
| The singed cape | `garrick_cape_singed`. The captain thinks about it first. Garrick's look becomes `garrick_stenchmaster_singed`. |
| The labour rule, weaselled twice | "Routine shark chewing is normal operations," and later "meteorological and atmospheric catastrophe management". Nobody accepts either. Garrick's answer to "FIX IT" is "No." |
| "Tradition starts somewhere." | Said once, in the countdown. Kept for later. |
| The second major release | `second_major_release`: the ship inflates, vents through every seam, and fires a broadside into empty sea ("WE'RE PIRATES!"). Nobody is hurt and nothing is hit. |
| The second Dead Center | Generation 2 (`dead_center_generation` = 2) uses new locations with the `second` profile: garlic-pale, eye-watering. It is still ONE lethal zone. It ends in the sleeping quarters: "Nobody sleeps below tonight." |
| THE GREAT SHARKSTORM | `great_sharkstorm_created`, then the saved value `great_sharkstorm`, which moves through not_created → forming → attacking_ship → dispersed_near_ship → active_distant, plus `great_sharkstorm_distance`. The naming exchange is word for word. It is never destroyed: it ends `active_distant` (`great_sharkstorm_active`). |
| Concentrated Frog Grog repels sharks | Diluted, the scent draws them; straight from the barrel, in the gills, they can't stand it. Sixteen barrels go into the storm. The bulk reserve is the variable `bulk_frog_grog`, which goes 16 → 0 (`bulk_frog_grog_depleted`). Frog Grog in the captain's pack is never touched. |
| The food ban | `garrick_food_ban`: no rotten garlic, EVER; also onions, beans, cabbage and cheese (for Garrick). Nailed to the mainmast. |

**Originality rules**

- **Garrick stays original.** No borrowed names, voices, catchphrases, third-person speech, purple-and-yellow clothes or console iconography.
- **The suit keeps its palette.** It stays burgundy, mustard and bilious green. The gaudier version only adds the saucepan-lid medal, bottle caps, tassels, buttons, a feather-duster plume and the painted cape.
- **The storm is the Great Sharkstorm.** It is only ever called that (the crew's first guesses are shark storm, shark vortex, shark cyclone, flying-shark nightmare).

`tests/phase6_story.test.js` scans every Phase 6 file. It checks for:

- the forbidden names;
- later-phase material (Brogath, Codex/Raiders, a Stenchmaster court, ancient Stenchmasters, buried treasure);
- any wording that would be a real repair or discharge procedure.

It also checks that no trigger fires after `p6_complete`.

## Chapter flow

Chapters are chained by scripts and story flags. The time of day uses `p4_tod`, with new values for sunset (6), storm (7) and grey dawn (8).

**25 · The Grand Stenchmaster's Supper**

- **Starts when:** the bed, after `p5_complete`.
- **Quest:** The Grand Stenchmaster's Supper.
- **What happens:** Squawks, a cut to the galley, Pete runs for the captain; the rule, the trousers, OUTSIDE.

**26 · The Frog Tax Man**

- **Starts when:** supper outdoors.
- **Quest:** The Frog Tax Man.
- **What happens:** BWAAAAAH; the episode; Garrick asleep; Bob wakes the captain; "five more minutes"; the knob panel.

**27 · The Machine Refuses to Die**

- **Starts when:** OFF MAYBE.
- **Quest:** The Machine Refuses to Die.
- **What happens:** The dying set; keep Rook and Sully back, smother three smoulders, move the wired barrel; the death rattle; the cape.

**28 · The Worst Morning**

- **Starts when:** dawn.
- **Quest:** The Worst Morning.
- **What happens:** WHO TURNED IT OFF?; the cape; Shark Duty; the first weasel; the onion; ROWBOAT; the flicker ("quarterly estimates"); "Throw it overboard" (not done).

**29 · The Burning Warning**

- **Starts when:** that night.
- **Quest:** The Stenchmaster's About to Blow.
- **What happens:** The sleeping quarters; the warning; grab Squawks, wake Bob, Wick and Brask; "Pressure shift"; refuge (try three places); the countdown; brace.

**30 · The Mightiest Gust Yet**

- **Starts when:** the blast.
- **Quest:** The Second Yellow Apocalypse.
- **What happens:** The ship inflates, jets, the broadside; the smell; the second cloud; get aft; check Squawks; the rail: frenzy, rotation, the column, the naming.

**31 · The Great Sharkstorm**

- **Starts when:** the storm attacks.
- **Quest:** The Great Sharkstorm.
- **What happens:** Brace three shrouds and shelter Squawks under flying sharks; SHARK ON DECK (HEAVE); the storm drinks the cloud; the shark in the S.E.S.; THEY'RE ALL GRAY; the helm; the monologue; "No."

**32 · Another Ocean**

- **Starts when:** "No."
- **Quest:** The Frog Grog Offensive.
- **What happens:** The discovery; five barrels by hand, eleven by the crew; the collapse; the telescope (still there); the sniff; the sleeping quarters; the food ban; the aftershock; the rowboat epilogue.

The tone choices (furious, sarcastic, exhausted, threatening, incredulous) at
the supper, the overboard order and the breaking point all converge on the
same line. The storm's creation is not branched.

## Systems added (reusable)

**Programmes on a television**

- **Where:** `src/systems/tv/tv.js` (`programDef`, `programEpisode`), `src/ui/TvView.js`, `data/tv/programs/`, the `tvProgram` command.
- **Notes:** A show is data: episodes made of beats (frames, a line for an extra speaker, an sfx, the laugh track, timing). A channel carries one with `"program"`. A cutscene can play beats `from`–`to` (inclusive) on a vista's screen. New episodes need no code; an episode with an `if` waits for its flag.

**Television conditions**

- **Where:** `tv.js` (`tvCondition`, `setTvCondition`), `data/tv/ses.json` `states`, `tvSet { state }`.
- **Notes:** `stateValue` names a saved story value. Each state can swap the bezel, the back and the glass overlay, set a flicker, and carry its own look comments. A dead set can't be switched on.

**The knob panel**

- **Where:** `TvView` knobs mode, `{ "tv": "ses", "mode": "knobs" }`.
- **Notes:** Knob effects: louder, flip, tint, slow, shrink, frog, noop and off. `off` can need several tries. `doneFlag` is set when it finally goes off.

**The Great Sharkstorm**

- **Where:** `src/systems/hazards/sharkstorm.js`, `data/hazards/sharkstorm.json`, the `sharkstorm` command and condition, `src/world/SharkstormLayer.js`.
- **Notes:** One saved value plus data per state. While it is attacking, the deck layer sends flying-shark passes overhead. It also makes telegraphed deck impacts: a red ring and a growing shadow for at least 1.2 s; a direct hit only knocks the captain flat. While it is far off, a distant rumble plays. A few pooled sprites, never a crowd.

**Orbit layers in vistas**

- **Where:** `src/scenes/CinemaScene.js` (`orbit`), the `vistaSpin` command.
- **Notes:** Hundreds of sharks, spray and timber circling a column, in one container. Members behind the column are smaller and dimmer. Reduced effects slows them.

**Dead Center profiles**

- **Where:** `deadCenter.js` (`deadCenterProfile`), `FumeLayer.js` `PALETTES.second`.
- **Notes:** A location (or zone) can carry `"profile": "second"` for the garlic-pale generation.

**`value` condition, `setValue`**

- **Where:** `src/systems/conditions/conditions.js`, `commands.js`.
- **Notes:** Story text values in conditions (`eq`, `ne`, `in`, `set`).

**Timing-bar variants**

- **Where:** `src/scenes/OverlayScene.js`.
- **Notes:** `smother`, `brace`, `heave` and `barrel` (titles, prompts, sounds).

**Save v6**

- **Where:** `src/config/constants.js`, `src/systems/save/migrations.js`.
- **Notes:** A 5 to 6 migration that fills missing story maps and the inventory. It never removes items.

## Where things live

| What | Where |
| --- | --- |
| Chapter scripts | `data/story/cutscenes/phase6/ch25.json` … `ch32.json`, `world.json` (fork, card, bulk grog, telescope, food ban, wall hole, garlic jar, sleeping-quarters hatch) |
| Crew and character dialogue per stage | `data/dialogue/phase6/crew.json` (stages t1 to t9) |
| Room changes | `data/maps/ship/phase6/*.patch.json` (placements per story state, latest first; props, inspects, triggers, music, sharks) |
| NPC extensions, variants | `data/npcs/phase6_crew.json` (Garrick gaudy → singed; Squawks's sleeping cap) |
| Quests, flags, triggers | `data/quests/phase6.json`, `data/story/flags/phase6.json`, `data/story/triggers/phase6.json` |
| The S.E.S. and The Frog Tax Man | `data/tv/ses.json` (channel 7, `states`, `knobs`), `data/tv/programs/frog_tax_man.json`, `data/characters/speakers_phase6.json` (Franklin, the Accountant, the Judge, the Announcer) |
| Hazards | `data/hazards/sharkstorm.json`; `dead_center.json` (`second_forward_deck`, `second_sleeping_quarters`); `shark_duty.json` (`morning_after_watch`) |
| Stench Log entries | `data/logs/stench_log.json` (the supper, the S.E.S., the release, the storm, the ban) |
| Vistas | `data/story/vistas/phase6.json`: `ftm_night`, `ses_dying`, `ses_dark_morning`, `ses_wrecked`, `release_night`, `frenzy_night`, `sharkstorm_forms`, `grog_offensive`, `telescope_storm`, `epilogue_rowboat` |
| Art | `src/art/vista/vistaPhase6.js` (Frog Tax Man screens, the dying/dead/wrecked set, night ship and broadside, garlic cloud, the storm), `src/art/stage/stagePhase6.js` (flying sharks), `src/art/props/phase6Props.js`, `src/art/inserts/phase6Inserts.js` (garlic label, warning card, painted cape, food ban), suit extras `gaudy` and `singed` in `characterPainter.js`, the parrot `nightcap` |
| Music and SFX | `data/audio/music/frog_tax_man_theme.json`, `midnight_warning.json`, `stenchmaster_catastrophe.json`, `great_sharkstorm.json`; `data/audio/sfx_phase6.json` (47 effects); `data/audio/ambience_phase6.json` |
| Looks | `data/appearances/phase6.json`, `data/portraits/phase6.json` |
| Presets | `data/debug/presets.json` (23, `p6_start` to `p6_complete`) |

## Persistent state after the phase

**Garrick and the S.E.S.**

- Garrick is in the singed, gaudy suit, back in his chair (nobody saw him come aboard).
- He faces the S.E.S., which sits shark-damaged and dark midships, with a boarded hole in the rail beside it.
- The fork is still in the mainmast. The food ban is nailed up beside the labour rule.

**The ship**

- The second-generation Dead Center fills the sleeping quarters; the crew sleep on deck.
- The bulk Frog Grog reserve is empty lashings.
- There is storm debris on deck and fewer fins round the ship.

**The storm**

- The Great Sharkstorm is a mustard smudge on the starboard horizon, seen through the telescope, with a distant rumble now and then.
- Hale moves its mark on the chart every morning.

**Squawks and the crew**

- Squawks is alive, bald and furious in his basket by the cabin door.
- Everyone has something new to say.

## Testing it

**Presets.** Use the debug overlay's **Story** tab or `tools/play.mjs` `preset <id>`. Each preset is played to the end of the phase by `tests/phase6_story.test.js`. The 23 presets are:

- Phase 6 Start
- Rotten Garlic Supper
- Frog Tax Man
- S.E.S. Shutdown
- S.E.S. Death Rattle
- Almost Fires
- Garrick Wakes
- S.E.S. Apparently Dead
- Midnight Warning
- Sleeping Quarters Evacuation
- Main Deck Refuge
- Final Warning
- Major Release
- Second Yellow Apocalypse
- Shark Frenzy
- Great Sharkstorm Formation
- Great Sharkstorm Attack
- S.E.S. Shark Strike
- Stinkbeard Breaking Point
- Frog Grog Discovery
- Frog Grog Offensive
- Storm Driven Away
- Phase 6 Complete

**Tests.**

- `tests/phase6_story.test.js` plays the phase headlessly both ways. It checks the end state, the staging of every scene, the brief scan, the programme and the knobs.
- `tests/phase6.test.js` covers the Sharkstorm states, the S.E.S. conditions and programme, the second Dead Center, the bulk grog versus the captain's own, chapters, and saves (5 → 6 migration, round-trips at every Phase 6 checkpoint).
- `e2e/phase6.spec.js` plays it in a browser.
