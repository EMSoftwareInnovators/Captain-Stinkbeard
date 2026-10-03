# Story Phase 7: The Great Sharkstorm Returns and the Song of the Grand Stenchmaster

The sixth canonical story chapter. It adapts two connected excerpts, *The
Stenchmaster Sharkstorm Disaster* and *The Song of the Grand Stenchmaster*,
played as one phase. It picks up the morning after Phase 6.

The Great Sharkstorm, which was driven off and never destroyed, comes back.
Garrick has no intention of helping: it isn't a Stenchmaster duty. A shark
takes his cape. He holds a parade and sings a song. Then he dismantles the
ship's lucky horseshoe for parts. The crew go below, and in the hold, out of
a turnip crate, the Stenchmaster Entertainment System Mark II is born.

The phase starts when the captain goes to bed after Phase 6 ("Sleep"). It
ends in the cargo hold, late, with half the crew asleep where they sit. The
other half are still watching The Frog Tax Man, and the Great Sharkstorm is
overhead, not going anywhere. Phase 8 is not started.

About 60 to 90 minutes of play:

- 9 chapters (33 to 41) and 9 quests.
- 83 story flags.
- About 900 lines of dialogue: every crew member has something to say at every stage, on deck and below.
- A storm survival scene that reuses Phase 6's storm without replaying its formation.
- An argument about a job description.
- A parade, a song with call and response, a salvage run.
- A television built from a crate, a knob panel, and a whole new episode of The Frog Tax Man watched by everyone.

## Continuity

**The storm returns.** The Great Sharkstorm is the same storm. It is never re-created and its formation is not replayed. The saved value `great_sharkstorm` moves on from where Phase 6 left it: `active_distant` → `returning` → `attacking_ship` → `active_near_ship`. It is not resolved. The phase ends with it parked right over the ship (`great_sharkstorm_returned`).

**The Phase 6 trick can't be repeated.** The bulk Frog Grog reserve (`bulk_frog_grog`) stays at 0, and the crew say so in chapter 33 ("Then we can't do it again."). Frog Grog in the captain's pack is never touched. The toast in chapter 41 uses Mags's new, small, warm batch.

**Garrick is Garrick.** He keeps the burgundy, mustard and bilious suit. It is now torn as well as singed: the cape has a shark-shaped bite out of it, the crown leans and the plume is mostly gone. He is still the Grand Stenchmaster and is never called anything else. The storm is only ever THE GREAT SHARKSTORM.

**Squawks** is alive, bald and wrapped in the captain's coat, then in his basket in the hold. He hides from the song.

## Canon this phase adds

| Canon | How it shows in the game |
| --- | --- |
| It's coming back | `great_sharkstorm_returned`. Hale's telescope at dawn; "Technically, we discouraged it." "Forecasting language is nuanced." "'Driven off.' Off is a direction." |
| The Grand Stenchmaster Aura | `garrick_aura_named`. The captain forbids "residual Stenchmaster exhaust" ("I forbid it. The phrase. Never again."); Garrick renames it. |
| Which away? | The storm attacks. Brace two lines, reef the main, get Squawks into the coat, heave a deck shark, take the helm: "AWAY." "Which away?" "That is an excellent question." |
| Garrick's TV complaint | "Franklin has an audit hearing tonight." The season finale; four episodes "recorded": "Grand Stenchmaster technology." |
| The loophole | The emergency labour rule read aloud. SHARKS means *ship* sharks; sharks in the sky are weather, so this is Meteorological Shark Management. The implied clause; "I did my one useful thing. In the spring." |
| The job description | Three primary functions: EATING (raw material), SLEEPING (conserves energy), farting (the official stench). The television is a support function ("part of the production line"). "Ye have invented a government office for being lazy." |
| THE GRAND SHARKMASTER | `grand_sharkmaster_invented`. The office that manages the sharks: "That's a staffing problem." Garrick posts a SITUATIONS VACANT notice; the captain writes **NOT REAL.** across it. It is never made a real role: the Stench Log entry says NOT REAL, and nobody is ever appointed. |
| The crew revolt and the cape shark | Hear four grievances; Hale chalks "WHAT DOES HE DO?" on a slate. "Excellent career alignment!" Then a flying shark takes the cape: RIIIIP. "CEREMONIAL PROPERTY, Captain." "...Then what is the crew FOR?" `garrick_cape_torn` (look `garrick_stenchmaster_torn`, for good). |
| The Ceremonial Parade | `stenchmaster_parade_done`. Garrick marches the deck on a routine while the crew work. Help Pete with a shark, Bob with a knot, Jim with his food crate; Garrick encourages ("I'm assisting emotionally."). |
| The Song of the Grand Stenchmaster | `grand_stenchmaster_song_performed`. An original song with call and response (BANNED! UGLY! NO! YOU DID!) and its own track. Squawks hides; "...Song over?" "Best news tonight." The lyric sheet is pinned up in the hold. |
| Mark I, wrecked | `ses_mark1_wrecked`. A second shark finishes the original set (`ses_state` = `wrecked`). It is kept on deck with PARTS chalked on it; "A shark accomplished what I could not." |
| The salvage | The binnacle compass ("You don't need a compass for away."), the lantern wire ("This wire isn't doing anything."; the lantern falls), the lucky horseshoe ("Reception."). Each is visibly missing afterwards. |
| Everyone below | Lash the wheel, bar the hatch, everyone to the hold. What each person brings (Pete's supplies, Jim's food, Gristle's charts, Garrick's chair). Squawks: "Bad ceiling." "Bad sky, then." |
| The S.E.S. Mark II | `ses_mark2_built`, `ses_mark2_operational`. Built in four abstract steps: aerial, "special insulation", "signal routing" (a fork), a knob that does nothing. Nobody reaches inside anything; there are no real electrical or picture-tube instructions. The switch is refused twice, then WARM-UP. |
| FROG MAYBE | The Mark II knob panel: VOLUME?, UPSIDE, ROLLY, SHRIEK, COLOUR, SPOON, FROG MAYBE. FROG MAYBE takes two tries: "...Ribbit." "FRANKLIN RETURNS!" (`p7_franklin_found`). |
| Season Seventeen, Flies | A new Frog Tax Man episode (`season_seventeen_flies`) with invented forms (Form RIB-40, Schedule POND, the 10-FROG-X), a dragonfly claimed as a business expense, a letter from the Pond Revenue Service, a forfeited lily pad, a refund, and depreciation. |
| The crew get invested | `crew_watched_frog_tax_man`, `crew_franklin_fans`. Frog Grog goes round ("Still awful."). Squawks: "Sad frog." "Why taxes?" "No receipts?" "He's finished." "...Open letter." |
| One episode | `p7_one_episode`. At the commercial break the biggest landing yet hits overhead. Garrick: "Somebody should go and deal with that." The labour rule is in the captain's pocket; the compromise is one episode, then the Great Sharkstorm personally, ceremonially, "with all the resources of the office" ("That's for the Grand Sharkmaster to say."). |
| Frog better Stenchmaster | `p7_squawks_verdict`. The hold explodes laughing; the captain too. "...I'm not dignifying that." |
| The toast | `p7_toast`. "To Franklin!" "To getting through the Great Sharkstorm!" "And to throwing that television overboard. One day." "I object to the third one." "NOTED." |
| The final image | Mark I a shell on deck, Mark II a turnip crate with a horseshoe on top, the cape short a piece, the Grand Sharkmaster vacant, a song nobody can forget. The storm goes on overhead; down below, a frog is explaining depreciation. |

**Originality and scope rules**

- **Garrick stays original.** No borrowed names, voices or catchphrases. The suit keeps its palette.
- **The storm is the Great Sharkstorm.** The crew may call it a shark storm, flying sharks or that shark nightmare.
- **No real procedures.** The Mark II assembly is abstract: select a part, place it, tighten a fictional connector, align a nonsense antenna, turn an absurd knob. There is nothing about real electrics, picture tubes, high voltage or capacitors.
- **No Phase 8 material.** There is no treasure blasting, buried treasure, ancient Stenchmasters, Brogath, Stenchmaster court or supernatural broadcasts.

`tests/phase7_story.test.js` scans every Phase 7 file for the forbidden names, later-phase material and procedure-like wording. It also checks that no trigger fires after `p7_complete`.

## Chapter flow

Chapters are chained by scripts and story flags. The time of day uses `p4_tod`, with new values for overcast (9), storm dark (10) and below-decks night (11).

**33 · It's Coming Back**

- **Starts when:** the bed, after `p6_complete`.
- **Quest:** It's Coming Back.
- **What happens:** Morning repairs (clear the debris, the foremast rigging; timing bars); Ned and the light; the telescope; the realisation; the grog ("we can't do it again"); the first THWACK; the Aura.

**34 · Which Away?**

- **Starts when:** the storm attacks.
- **Quest:** Which Away?
- **What happens:** Two lines and the reef (timing bars); Squawks into the coat; a deck shark (HEAVE); the helm ("AWAY."); Garrick's television complaint.

**35 · Not a Stenchmaster Duty**

- **Starts when:** the complaint.
- **Quest:** Not a Stenchmaster Duty.
- **What happens:** Fetch the labour rule from the mainmast; read it aloud; the loophole; the three primary functions; the support function; the Grand Sharkmaster.

**36 · The Job Description**

- **Starts when:** the notice goes up.
- **Quest:** The Job Description.
- **What happens:** Hear out four of Gristle, Pete, Bob, Hale and Rook; the slate; "career alignment"; the cape shark; the chase; "I FORGIVE YOU ALL."

**37 · The Grand Stenchmaster's Parade**

- **Starts when:** the chase ends.
- **Quest:** The Grand Stenchmaster's Parade.
- **What happens:** Garrick marches; help Pete (a shark), Bob (a knot) and Jim (his crate); onions, BANNED.

**38 · The Song of the Grand Stenchmaster**

- **Starts when:** the last job on deck.
- **Quest:** Back to Work.
- **What happens:** The song (Squawks hides); a second shark finishes Mark I; "It's PARTS."; the compass, the lantern and the horseshoe.

**39 · Everyone Below**

- **Starts when:** the horseshoe.
- **Quest:** Everyone Below.
- **What happens:** "EVERYONE BELOW!"; lash the wheel; the galley hatch is barred; the hold; what everyone brought; "Bad ceiling."

**40 · The Stenchmaster Entertainment System Mark II**

- **Starts when:** everyone is in the hold.
- **Quest:** The Stenchmaster Entertainment System Mark II.
- **What happens:** Four bench steps; the switch, refused twice; WARM-UP; the knob panel; Franklin returns.

**41 · A Pleasant Evening**

- **Starts when:** "...Ribbit."
- **Quest:** A Pleasant Evening.
- **What happens:** Find something else to do (the pump, the crates); the boom; sit down next to Squawks; the episode; the commercial break and the one-episode compromise; "Frog better Stenchmaster."; the toast; the final image.

The tone choices converge on the same line: the helm, the song, two of the bench steps, and "Why taxes?". The storm's return and the end state are not branched.

## Systems added (reusable)

**Storm states with flying variants and below-deck thuds**

- **Where:** `data/hazards/sharkstorm.json`, `src/world/SharkstormLayer.js`, `FxPool` (`falldust`).
- **Notes:** A state's `flying.variants` adds shark frame prefixes (hammerhead, small, the one with the cape). A state's `below` (`maps`, `every`, `sfx`, `volume`, `shake`, `dust`) plays a muffled landing in the rooms under the deck. Each landing has a small shake and dust from the deckhead, and emits the script event `sharkstorm_thud`. It never hurts. `returning` and `active_near_ship` are new states.

**A second television**

- **Where:** `data/tv/ses_mk2.json`, `TvView`.
- **Notes:** A set can bring its own art (`bezel`, `back`, `powerFrame`) and its own saved values. Mark II shares the channels' programme data with Mark I.

**More knob effects**

- **Where:** `TvView`, `validateContent.js`.
- **Notes:** `roll`, `shriek` and `tune`. `tune` sets the knob's `channel`, powers the set and fires `doneFlag` (after `tries`). A panel needs an `off` or a `tune` knob.

**Television condition `wrecked`**

- **Where:** `data/tv/ses.json`.
- **Notes:** Mark I's last state: dead, with the scrapped bezel and its own look comments.

**Timing-bar variants**

- **Where:** `src/scenes/OverlayScene.js`.
- **Notes:** `clear`, `reef`, `knot`, `carry`, `lash` and `assemble`.

**Character poses and suit damage**

- **Where:** `characterPainter.js`.
- **Notes:** The `torn` extra (cape bite, frayed edge, tide line, grog stains, a crooked crown). Poses `march` and `sing`; arms `salute` and `wide`.

**Save v7**

- **Where:** `src/config/constants.js`, `src/systems/save/migrations.js`.
- **Notes:** A 6 to 7 migration that fills missing story maps, world maps and the inventory. It never removes items.

## Where things live

| What | Where |
| --- | --- |
| Chapter scripts | `data/story/cutscenes/phase7/ch33.json` … `ch41.json`, `world.json` (the bed, the Mark II in normal use, looks at the salvage, the notice, the song sheet, the barred hatches) |
| Crew dialogue per stage | `data/dialogue/phase7/crew.json`, selectors in `data/npcs/phase7_crew.json` (Garrick torn; shushes while the set is on) |
| Room changes | `data/maps/ship/phase7/*.patch.json`: the main deck (tasks, the rule, the notice, Mark I, the missing compass, lantern and horseshoe, placements per stage, Garrick's parade route), the cargo hold (Mark II, the chair, seats, supplies, Squawks's basket, the song sheet), the galley and crew quarters (barred hatches), the captain's bed |
| Quests, flags, triggers | `data/quests/phase7.json`, `data/story/flags/phase7.json`, `data/story/triggers/phase7.json` (none) |
| Televisions and the episode | `data/tv/ses.json` (`wrecked`), `data/tv/ses_mk2.json`, `data/tv/programs/frog_tax_man.json` (`season_seventeen_flies`, after `p7_franklin_found`) |
| The storm | `data/hazards/sharkstorm.json` (`returning`, `active_near_ship`, variants and `below` on `attacking_ship`) |
| Stench Log entries | `data/logs/stench_log.json` (the Aura, the Grand Sharkmaster — NOT REAL, the cape, the song, Mark II, the evening; the storm entry now says Returned) |
| Vistas | `data/story/vistas/phase7.json`: `telescope_returning`, `mk2_close`, `shelter_watch` |
| Art | `src/art/vista/vistaPhase7.js` (Mark II build/bezel/back/power, the new episode's screens, the storm returning, Garrick zapped, the shelter and the crew from behind), `src/art/stage/stagePhase7.js` (flying shark variants, the cape shark, the falling lantern, the cape piece, horseshoe, spoon, Mark II carried), `src/art/props/phase7Props.js`, `src/art/inserts/phase7Inserts.js` (the slate, the notice, the song sheet), the ♪ glyph |
| Music and SFX | `data/audio/music/sharkstorm_returns.json`, `stenchmaster_parade.json`, `grand_stenchmaster_song.json`, `hunker_down.json`, `pleasant_evening.json`; `data/audio/sfx_phase7.json` (21 effects); `data/audio/ambience_phase7.json`; `data/audio/instruments_phase7.json` (warble, kazoo) |
| Looks | `data/appearances/phase7.json`, `data/portraits/phase7.json` (`garrick_stenchmaster_torn`) |
| Presets | `data/debug/presets.json` (17, `p7_start` to `p7_complete`) |

## Persistent state after the phase

**The storm**

- The Great Sharkstorm is `active_near_ship`, right overhead.
- Flying sharks still pass high over the deck, with thunder now and then.
- Landings thud through every room below.

**The ship**

- The galley and fore hatches are barred from below. The crew live in the hold.
- Mark I is a shell on deck with PARTS chalked on it.
- The binnacle has an empty socket and a note. The lantern lies on its side. Two nails mark where the horseshoe was.
- The Grand Sharkmaster notice is still on the foremast, with NOT REAL. across it.

**Mark II and Garrick**

- Mark II sits in the hold on Franklin, channel 7. It works as a normal set: power, channels, The Frog Tax Man.
- Garrick is in his chair beside it, in the torn suit.

**Squawks and the crew**

- Squawks is in his basket next to the empty crate.
- Most of the crew are Franklin fans now, and all of them have something to say.

## Testing it

**Presets.** Use the debug overlay's **Story** tab or `tools/play.mjs` `preset <id>`. Each preset is played to the end of the phase by `tests/phase7_story.test.js`. The 17 presets are:

- Phase 7 Start
- Sharkstorm Returning
- Flying Sharks Return
- Garrick TV Complaint
- Not a Stenchmaster Duty
- Grand Sharkmaster Argument
- Crew Job Revolt
- Cape Shark
- Stenchmaster Parade
- Stenchmaster Song
- S.E.S. Mark I Wrecked
- Retreat Below
- Mark II Construction
- Mark II Startup
- Franklin Returns
- Crew Watches Frog Tax Man
- Phase 7 Complete

**Tests.**

- `tests/phase7_story.test.js` plays the phase headlessly both ways. It checks:
  - the canonical end state (the storm returned and still overhead, the bulk grog at 0 and the captain's own untouched, Mark I wrecked, Mark II on channel 7);
  - that each big line happens exactly once;
  - every preset, the staging of every scene and the brief scan.
- `tests/phase7.test.js` covers:
  - the storm states, flying variants and the below-deck thud (with a fake scene);
  - both televisions, the knob panel's `tune`, chapters and art/audio references;
  - saves: the 6 → 7 migration, and round-trips at every Phase 7 checkpoint.
- `e2e/phase7.spec.js` plays it in a browser:
  - the whole phase from the end of Phase 6, and from Retreat Below;
  - the Mark II knob panel by hand;
  - the set, the hatch and the thuds after the phase.
