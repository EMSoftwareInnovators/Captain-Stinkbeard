# Story Phase 5: What Does the Grand Stenchmaster Actually Do?

The fourth canonical story chapter. It picks up the morning after Phase 4's
seven-hundred-percent forecast: hundreds of sharks, the Dead Center still
wandering, Frog Grog for breakfast, and a Grand Stenchmaster who has been
sitting in a chair since before dawn, facing a humming lump under a sheet.
The crew finally ask him what, exactly, a Grand Stenchmaster does.

The phase starts when the captain goes to bed in his cabin after Phase 4
("Sleep until morning"). It ends that night, at the Stenchmaster
Entertainment System, when something almost appears in the static and
Garrick leans closer: "Programming." / "Executive readiness." Nothing is
explained. The phase stops there, and the next canonical excerpt carries on
from it.

About 35 to 60 minutes of play: 5 chapters, 6 quests, 91 story flags, about
900 lines of dialogue (every crew member has something new to say at every
stage), two real Shark Duty shifts and a short one, three repairs, a
television with six channels, and a suit.

## Canon this phase adds

| Canon | How it shows in the game |
| --- | --- |
| Squawks is fully bald | The close call at the mainmast takes the last three wisps of down; `squawks_fully_bald` switches him to `squawks_fully_bald` (no tail, no crest, weary eyes, sweater, blanket, padded basket) for good. Alive, weak-looking, sarcastic: "Bald." "Everything feels drafty." "Want new crew." "Unfortunately." |
| The crew fear the Center because of Squawks | Three bells now set off panic shouts from whoever is on screen ("Remember the bird!", "I'm not losing me nose!"), with the occasional reply from Squawks ("Still hear you."). Garrick never panics |
| The Grand Stenchmaster's duties | Seat readiness, Frog Grog quality assurance, strategic releases, executive readiness, and monitoring the S.E.S. (`crew_confronted_garrick_duties`). "Ye have invented a royal office for being lazy." / "At LAST. Someone who understands." / "THAT WAS NOT PRAISE." |
| The Stenchmaster Entertainment System | `stenchmaster_entertainment_system_built`: an impossible CRT built from a lantern, the jolly boat's compass, cutlery, a cannon lock, bottles, a bit of the old bell and the barometer. It looks like a bomb. It works. Nobody knows why. Permanent, with six channels |
| The Grand Stenchmaster's station | `stenchmaster_station_unlocked`: midships, the S.E.S. (14,17), his grog table (13,17), his chair (14,18), with the Forecast Board, Stench Log and crayons beside them; anonymous notes pinned to the mainmast |
| THE GRAND STENCHMASTER SUIT | `stenchmaster_suit_created`: burgundy, mustard and bilious green; epaulettes on the epaulettes; five self-awarded medals (one is a bottle cap); odour-retentive ceremonial fabric; ordinary boots with brass glued on (one bit is a door hinge). The sash is sewn into it for good. Garrick's appearance and portrait become `garrick_stenchmaster_suit` |
| "Every Grand Stenchmaster" | "There has NEVER BEEN ANOTHER Grand Stenchmaster." "Somebody has to establish the standards." Said once, not followed up |
| The emergency labour rule | `garrick_emergency_labor_rule`, nailed to the mainmast: in a genuine emergency the Grand Stenchmaster does at least ONE useful thing. "Does 'providing leadership' count?" "NO." He boots a shark on the nose: "That's my one." |

Garrick stays original: no borrowed characters, voices, catchphrases or
iconography, and the S.E.S. is a junk-built crate with a porthole for a
screen, not any real console. `tests/phase5_story.test.js` scans every Phase 5
file for banned names and later-phase material (no Sharkstorm, no midnight
release, no ancient Stenchmasters, no Brogath, no named broadcasts) and checks
that no trigger fires after `p5_complete`.

## Chapter flow

Chapters start from story triggers (`data/story/triggers/phase5.json`); the
chapter name follows flags, and the time of day reuses `p4_tod`
(`data/game.json`).

| # | Chapter | Starts when | Quests | Key flags (in order) |
| --- | --- | --- | --- | --- |
| 20 | Another Terrible Day | the bed, after `p4_complete` | Another Terrible Day, then Remember Squawks | `p5_started`, `p5_round_pete` / `_gristle` / `_jim` / `_bob` (any order), `p5_close_call_started`, `p5_carrying_squawks`, `p5_squawks_safe`, `squawks_fully_bald`, `p5_checkin_gather`, `p5_squawks_checked` |
| 21 | What Do You Actually Do? | `remember_squawks` done | What Do You Actually Do? | `p5_ch21_started`, `p5_first_watch_done`, `p5_confront_started`, `stenchmaster_entertainment_system_built`, `p5_duties_heard`, `ses_examined`, `crew_confronted_garrick_duties`, `p5_back_to_work` |
| 22 | The Grand Stenchmaster's Office | `what_do_you_do` done | The Grand Stenchmaster's Office | `p5_ch22_started`, `stenchmaster_station_unlocked`, `p5_office_duty_done`, `p5_rudder_checked`, `p5_log_drool_seen`, `p5_garrick_qa`, `p5_chair_inspected`, (`p5_bread_seen`, `p5_washroom_wait_seen`), `p5_station_scene`, `p5_station_alarm`, `p5_laundry_yellow`, `p5_station_clear`, `p5_station_reclaimed` |
| 23 | Dressed for Disaster | `stenchmaster_office` done | Dressed for Disaster | `p5_ch23_started`, `p5_garrick_found`, `p5_crew_assembled`, `stenchmaster_suit_created`, `p5_medals_seen`, `p5_suit_tour_done`, `p5_every_stenchmaster`, `p5_suit_refusal`, `p5_stbd_a` / `_b` / `_c`, `p5_stbd_repaired` |
| 24 | One Useful Thing | `dressed_for_disaster` done | One Useful Thing | `p5_ch24_started`, `p5_emergency_squawks`, `p5_emergency_duty_done`, `p5_argument_started`, `garrick_emergency_labor_rule`, `p5_one_useful_thing`, `p5_night`, `p5_night_squawks`, `p5_night_ses_seen`, `p5_complete` |

### What happens

1. **Another Terrible Day.** Hale's morning report: sharks, yes; Center,
   somewhere. The captain makes his rounds, and the Dead Center seems to
   follow him. Pete is patching the rail (the patch is called Gerald) when
   ONE bell goes and he's gone ("One's how it STARTS, Captain!"). Gristle's
   stock count ends when the treasure-room door starts glowing ("Forty-tw—
   NOPE."). The Center comes down the galley stovepipe onto Jim's Frog Grog
   porridge AGAIN ("GAAAARRRIIICK!" "Good morning!"). Bob is asleep sitting
   up; three bells; Dunstan out of the washroom in a towel; Bob saves his
   pillow. Back on deck: three bells at the mainmast, where Doc Fennimore
   left Squawks to air in the sun. Grab him, get aft. The last three wisps of
   down blow away over the rail: "Had three." "Now none." The crew gather
   round his basket for the check-in; this is what the Center did to him,
   and why three bells means run.
2. **What Do You Actually Do?** CRUNCH. Everyone runs to Shark Duty except
   one man in a chair. The confrontation: seat readiness (with a
   demonstration of sitting), Frog Grog quality assurance, strategic
   releases ("present responsibilities, not legacy liabilities"), executive
   readiness ("Administrative moisture."), and the fifth duty: THE
   STENCHMASTER ENTERTAINMENT SYSTEM, unveiled in a close-up vista. "That is
   not a television." "It has a FUSE." "Why is there a potato nailed to it?"
   "Grounding." "Then we have established jurisdiction." A man argues with a
   turnip on a screen that cannot exist. The captain operates the set
   himself; then the TV-duty reactions ("Entertainment." Long silence.), the
   qualifications argument ("Grand FIREmaster?" "Depends how impressive the
   fire is."), the captain's definition, CRAAACK, "Back to work." "THAT IS
   NOT WORK." "Contractual disagreement."
3. **The Grand Stenchmaster's Office.** A real shift on both rails with a
   boarder, Garrick heckling from his chair ("Excellent shark repulsion!"
   "WE KNOW!"); the rudder (a shark called Admiral) and a choice of orders;
   the Stench Log page he drooled on; the chair while he's off doing grog
   "quality assurance" ("Warm." ... "I hate that he was telling the
   truth."); three complaints from the crew. Optional: Jim's first proper
   bread in a week, sat on by the Center (he named the dough); Brask at the
   washroom door: "I'll wait." Then Pete on the rigging ("Not again."),
   three bells, the Center sits on the station, the washing goes yellow, Ned
   takes the long way round (through the hold, the galley and the captain's
   window), and Garrick strolls back through the cloud and sits down:
   "Pre-warmed."
4. **Dressed for Disaster.** Starboard bites, and the chair is empty. He's
   gone to HELP. He took a tablecloth. He's behind the crates in the hold
   with a needle: "Assemble the crew." A fanfare nobody can explain; up the
   ladder comes THE GRAND STENCHMASTER SUIT. The tour (sash, epaulettes for
   "atmospheric command", the five medals, each one asked about in turn,
   odour-retentive fabric, brass-glued boots), the crew ("Brand
   consistency."), Jim's good tablecloth ("It was underutilised.") and a
   chase round the mainmast, the captain's long look ("Take it off."
   "Impossible."), "Every Grand Stenchmaster?" The order to help: it's
   formalwear. "IT IS NOT HELPING." Three starboard patches while he waves
   graciously at the sharks.
5. **One Useful Thing.** Evening: more sharks than ever, three bells on the
   quarterdeck, the wheel lost in the Center, Squawks up by the helm
   ("Nothing left to take."). Emergency Shark Duty. The crew unload ("The
   parrot has NO FEATHERS!" "Confirmed."), the captain's speech (the most
   feared ship on the seven seas, and now a man in a costume watching
   television), Garrick's productive day, the rule, the negotiation, "Does
   'providing leadership' count?" "NO." The last repair: a shark gets its
   head through, and Garrick boots it on the nose. "That's my one." Night.
   "Still bald." "Still here." "...Both." The S.E.S. changes channel by
   itself; something almost appears; "Programming." "Executive readiness."
   Fade out.

## Systems added (reusable)

| System | Where | Notes |
| --- | --- | --- |
| Televisions | `src/systems/tv/tv.js`, `src/ui/TvView.js`, `data/tv/ses.json`, `tv` / `tvSet` commands | A close-up you operate: power, channels (each a frame loop, a glow and a hum), wiring and power-source views, comment cycles per channel with absent speakers skipped, random failures (picture roll, spark, buzz, smoke) and a slap. State is two story variables, so it saves |
| Set on deck follows the set | `data/maps/ship/phase5/main_deck.patch.json` | Ordinary animated props chosen by `ses_power` / `ses_channel` |
| Panic shouts | `src/systems/hazards/alarms.js` `panicShouts`, `data/hazards/alarms.json` `panic` | Lines for on-screen people when a bell rings, an `exclude` list, an optional reply |
| Shark Duty bark replies, helper | `src/world/SharkDuty.js`, `data/hazards/shark_duty.json` | A bark can carry a `reply` and an `if`; a session's `assist` lets a helper see off one shark per shift (the labour rule, on the optional shift) |
| Duty ramp and persistence | `src/systems/hazards/sharkDuty.js` (`DutyPlan` ramp), `src/world/SharkDuty.js` | Each shark harder than the last; leaving the deck puts the watch aside until you're back |
| Peg legs, the suit regalia, parrot states | `src/art/characters/characterPainter.js`, `parrotPainter.js`, `portraitPainter.js`, `hats.js` | `pegleg`, `regalia`, `brassboots`, `gloves`, the `stenchhat`; parrots `naked`, `weary`, `basket` |
| Save v5 | `src/config/constants.js`, `src/systems/save/migrations.js` | 4 to 5 migration |

## Where things live

| What | Where |
| --- | --- |
| Chapter scripts | `data/story/cutscenes/phase5/ch20.json` … `ch24.json`, `world.json` (inspects, the grog cask, the rule, Jory's shift) |
| Crew and character dialogue per stage | `data/dialogue/phase5/crew.json` (states s1 to s9, plus what everyone says about Squawks and their complaints), `characters.json` (Garrick, Squawks) |
| Room changes | `data/maps/ship/phase5/*.patch.json` (placements listed per story state, latest first; props, inspects, Shark Duty shifts, music) |
| NPC extensions, variants | `data/npcs/phase5_crew.json` (Garrick's suit, Squawks fully bald) |
| Quests, flags, triggers | `data/quests/phase5.json`, `data/story/flags/phase5.json`, `data/story/triggers/phase5.json` |
| The S.E.S. | `data/tv/ses.json`; art in `src/art/vista/sesArt.js` (bezel, back, power source, every channel's frames), deck props in `src/art/props/phase5Props.js` |
| Hazards | `data/hazards/dead_center.json` (new: `storeroom`, `midships`, `station`), `alarms.json` (`panic`), `shark_duty.json` (`p5_first_watch`, `office_watch`, `emergency_watch`, `assist` on `open_watch`) |
| Stench Log entries | `data/logs/stench_log.json` (the parrot, the office, the S.E.S., the suit, the rule) |
| Vistas, inserts | `data/story/vistas/phase5.json` (`ses_reveal`, `ses_night`); `src/art/inserts/phase5Inserts.js` (the medals, the noble duties, the notes, the drooled log, the rule) |
| Music and SFX | `data/audio/music/grand_stenchmaster_ceremonial.json` (used once, for the suit); `data/audio/sfx_phase5.json` (CRT power on/off, static, click, hum, buzz, spark, slap; the suit fanfare; argument stings; chair creak; cloth rip) |
| Looks | `data/appearances/phase5.json`, `data/portraits/phase5.json` |
| Presets | `data/debug/presets.json` (11, `p5_start` to `p5_complete`) |

## Persistent state after the phase

Garrick in the suit, sash and all, in his chair at his station, with the
S.E.S. on (six channels, whichever was left tuned); the labour rule nailed to
the mainmast beside the anonymous notes; Squawks fully bald in his basket by
the cabin door; yellow washing on the line; the starboard rail patched three
times and the port rail once more; the Dead Center resting in the treasure
room; a swarm of fins round the ship; new Stench Log entries; night light.
Everyone has something to say. Jory will give the captain a Shark Duty shift
whenever he asks, and under the rule the Grand Stenchmaster sees off exactly
one shark per shift ("That's my one.").

## Testing it

- Debug overlay **Story** tab or `tools/play.mjs` `preset <id>`: Phase 5
  Start, Dead Center Panic, Squawks Check, Grand Stenchmaster Duties, S.E.S.
  Reveal, Shark Duty, Stenchmaster Suit Reveal, Crew Furious, Combined
  Emergency, Night S.E.S. Scene, Phase 5 Complete. Each is played to the end
  of the phase by `tests/phase5_story.test.js`.
- `tests/phase5_story.test.js` plays the phase headlessly both ways, checks
  the end state, the staging of every scene and the banned-terms scan;
  `tests/phase5.test.js` covers the television, the panic shouts, the duty
  replies and helper, and saves; `e2e/phase5.spec.js` plays it in a browser.
