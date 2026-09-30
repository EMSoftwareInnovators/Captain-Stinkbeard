# Story Phase 4: Life Around the Dead Center

The third canonical story chapter. It picks up where Phase 3 left the ship:
Captain Stinkbeard's crew have a patched hull, a coughing bell and a
Grand Stenchmaster, and the Dead Center has not gone anywhere. It still
wanders the ship. Phase 4 is the crew trying to live around it, and the
sharks that the whole arrangement keeps attracting.

The phase starts when the captain goes to bed in his cabin at the end of
Phase 3 ("Sleep until morning"). It ends seven days later with tomorrow's
forecast: VERY BAD, seventy percent, then seven hundred. The shark crisis is
not resolved. The phase stops there, and the next canonical excerpt carries
on from it.

About 45 to 75 minutes of play: 308 scripts, about 850 dialogue lines, 6
quests, 79 story flags, Shark Duty (a real, repeatable job on the rail), three
repairs, a frenzy and a finale.

## Canon this phase adds

| Canon | How it shows in the game |
| --- | --- |
| Garrick wears the Grand Stenchmaster sash for good | `garrick_grand_stenchmaster_sash`, set as the phase opens; his appearance and portrait become `garrick_grand_stenchmaster` from then on. It is a sash he made himself: no powers, no history |
| Blackbeard is Captain Stinkbeard, and hates the name | The Phase 3 rename carries on everywhere; he protests the Stench Log's wording about his beard ("REFRESHED") |
| The Dead Center still wanders the ship | A saved story value (`dead_center`) names where it is; eleven locations in data, from the breakfast table to the treasure room |
| Frog Grog every morning, and a crayon forecast | The morning ration, the first Grand Stenchmaster Stench Forecast, and the forecast ending up in the captain's grog ("Now it's fortified.") |
| The bell protocol | One to four coughing bells, each shown in words as well as heard. Four bells: Garrick is drawing a forecast |
| Squawks's feathers | Seven new feathers (the yellow one included), then all seven gone again: `squawks_bald_again` |
| The sharks are Garrick's fault and won't leave | Shark Duty, 20 to port, 30 to starboard, then HUNDREDS; the frenzy at the waterline; roughly another three hundred; the yellow wake ("We've been ADVERTISING.") |
| Garrick will not do Shark Duty | "This is SHARK MANAGEMENT. That's a different department entirely." / "GENERAL STENCH CEREMONY IS NOT A REAL JOB." The rowboat lure can't be repeated: no pressure, not for hundreds, not with the Center aboard |

Garrick stays original: his business-speak and his crayon forecasts are his
own. No borrowed characters, voices, catchphrases or iconography.
`tests/phase4_story.test.js` scans every Phase 4 file for banned names and
later-phase material (no Sharkstorm, no midnight fart, no Stenchcaster, no
ancient Stenchmasters, no Brogath, no treasure hunt) and checks that no
trigger fires after `p4_complete`.

## Chapter flow

Chapters start from story triggers (`data/story/triggers/phase4.json`); the
chapter name and time of day follow flags and `p4_tod` (`data/game.json`).

| # | Chapter | Starts when | Quest | Key flags (in order) |
| --- | --- | --- | --- | --- |
| 15 | Today's Forecast | the bed, after `p3_complete` | Today's Forecast | `p4_started`, `garrick_grand_stenchmaster_sash`, `p4_ration_attended`, `beard_remedies_heard`, `squawks_refused_grog`, `where_is_center_asked`, `forecast_day1_shown`, `forecast_day1_inspected`, `breakfast_center_arrived`, `breakfast_evacuated`, `forecast_in_grog`, `forecast_board_up`, `forecast_board_seen` |
| 16 | Life Around the Center | `todays_forecast` done | Life Around the Center | `p4_ch16_started`, `squawks_three_feathers`, `bell_protocol_established`, `bell_protocol_read`, `washroom_incident_started`, `washroom_door_seen`, `scuttle_found`, `gristle_rescued`, `galley_incident_started`, `stove_damper_closed`, `lunch_salvaged`, `galley_incident_done`, `quarters_incident_started`, `deck_camp_set`, `yellow_pillow_seen`, `night_alarm_started`, `night_squawks_saved`, `night_scramble`, `grog_thrown_overboard`, `garrick_priorities_seen`, `night_evacuation_done`, `quarterdeck_incident_started`, `sausage_forecast_seen`, `course_restored` |
| 17 | The Worst Places | `life_around_center` done | The Worst Places, then Seven Feathers | `p4_ch17_started`, `worst_places_seen`, `beard_wash_attempted`, `beard_refreshed`, `beard_refresh_protested`, `squawks_reached_seven_feathers`, `feathers_alarm`, `squawks_protected`, `feathers_returned`, `squawks_bald_again`, `recurring_molt_heard` |
| 18 | Shark Duty | `seven_feathers` done | Shark Duty | `p4_ch18_started`, `shark_duty_introduced`, `shark_duty_reported`, `piracy_rant_done`, `port_damage_checked`, `starboard_checked`, `hundreds_seen`, `garrick_toast_seen`, `garrick_refused_duty`, `waterline_alarm`, `waterline_evacuated`, `frenzy_started`, `ship_smaller_seen`, `actively_ending`, `waterline_logged` |
| 19 | The Worst Forecast Yet | `shark_duty` done | Repair It Again | `p4_ch19_started`, `repairs_started`, `repair_board_done` / `_rope_done` / `_patch_done`, `supervisor_debate`, `worst_forecast_seen`, `center_returning`, `repair_evacuated`, `fresh_repair_destroyed`, `forecast_drunk`, `three_hundred_more`, `yellow_wake_seen`, `tomorrow_forecast_seen`, `p4_complete` |

### What happens

1. **The morning.** Coughing through the cabin wall, the bell clearing its
   throat, the crew hacking in the rigging. Frog Grog is served in the
   galley: the beard remedies (none worked: "molecular beard level"),
   Squawks refuses his ration (the wisest decision of the morning), and the
   captain asks the question everyone now asks: where is the Dead Center
   today? Garrick produces the first crayon forecast. It says: Bad Here,
   Probably. "That might be now." The Center rolls into breakfast; the
   doors are sealed; the captain gets Squawks and himself up the ladder.
   Garrick's obsolete forecast lands in the captain's grog ("Now it's
   fortified."), and the Forecast Board goes up at his station.
2. **Life around the Center** (vignettes A to E). Quill's bell protocol,
   nailed by the bell. The Center moves into the washroom with Gristle
   inside; he's hauled out through the air scuttle on deck, still holding his
   toothbrush. It settles on Jim's stove with the stew on it; the captain
   closes the stovepipe damper and lunch is biscuits from the hold. It takes
   the sleeping quarters; the crew bed down on deck (Pete's yellow pillow).
   Three bells at three in the morning: Squawks first, always; Pete saves the
   Frog Grog by mistake and throws it overboard; the sharks thrash; Garrick
   evacuates pillows, a frying pan and his coins. Then it sits on the
   quarterdeck, the helm is unreachable and the course dial shows the Revenge
   falling off her heading until it moves on.
3. **The worst places.** The powder room, the medicine chest, the oven, the
   washroom again: it chooses exactly the room that is needed. One more
   serious beard wash, and the Center passes through mid-scrub: the beard is
   REFRESHED (the Stench Log says so; the captain objects). Squawks reaches
   seven feathers; three bells; SAVE FEATHERS; he goes out under the coat;
   they come back when it clears; the feathers fall out one by one, then all
   at once. Garrick calls it a recurring molt. Squawks: "Fart hates
   feathers."
4. **Shark Duty.** The most hated job on the ship: poles, paddles, mops and
   discouragement. The captain takes a pole and plays a real watch on the
   port rail. Piracy was supposed to involve merchant ships. Patches on
   patches; twenty sharks to port, thirty to starboard; "HOW MANY?"
   "HUNDREDS." A second, busier watch on both rails, and the Grand
   Stenchmaster eating garlic toast. He refuses the pole: SHARK MANAGEMENT
   is a different department; GENERAL STENCH CEREMONY IS NOT A REAL JOB; and
   the rowboat lure can't be done again. Three bells: the Center rolls
   toward the very patch they've been defending. It reaches the waterline
   and the ocean erupts: the frenzy, a hammerhead ramming the hull, an hour,
   two hours. "Ship smaller." The captain's monologue (the Navy, the
   Spanish, the Dutch, a Portuguese admiral with a wooden nose, three
   hangings walked out of) ends at a FART. "The ship hasn't ended YET." "IT
   IS ACTIVELY ENDING." Garrick updates the forecast while it happens.
   Notes: "Excellent response."
5. **The worst forecast yet.** Late afternoon, the Center moves off.
   REPAIR EVERYTHING: a board, a rope brace, a patch (short timing games).
   Supervisors don't hammer; the Grand Stenchmaster outranks supervisor;
   nobody agrees. The worst map yet: six skulls, a crowned shark, the galley
   as a sandwich, STINKBEARD HOUSE. Sideways, upside down, a wet finger, a
   sniff: THE CENTER IS COMING BACK. Everyone runs; the fresh repair lasts
   about four seconds. "We're repairing it slower than they're eating it."
   Garrick crumples the forecast into the captain's fresh grog, then drinks
   it, paper and all: "Waste not." About three hundred more fins astern; the
   yellow wake to the horizon: they've been ADVERTISING. Four bells.
   Tomorrow: VERY BAD, 70%. He adds another zero. "That seems more
   accurate."

## Systems added (reusable)

| System | Where | Notes |
| --- | --- | --- |
| Story values | `src/systems/story/StoryState.js` (`getValue` / `setValue`), save v4 | Named text, saved; presets set them with `values` |
| The Dead Center | `src/systems/hazards/deadCenter.js`, `data/hazards/dead_center.json`, `deadCenter` command and condition, `{deadCenter}` token | Locations become ordinary fume zones that roll in; sealed rooms refuse warps with a message |
| The bell protocol | `src/systems/hazards/alarms.js`, `data/hazards/alarms.json`, `OverlayScene.alarm`, `alarm` command | Four levels, shown in words and heard; never rung by the world on its own |
| Shark Duty | `src/systems/hazards/sharkDuty.js` (`DutyPlan`), `src/world/SharkDuty.js`, `data/hazards/shark_duty.json`, map `sharkDuty` entries | Waves to rail sections, face and shove, bites leave damage, a duty board, quest counters via events |
| Frenzy and crowds | `src/systems/hazards/sharks.js`, `src/world/SharkLayer.js` | `frenzy` level, `crowd` of distant fins, `frenzy` / `calm` / `thrash` / `hammerhead` events |
| Course dial | `OverlayScene.course`, `course` command | The heading drifting while nobody can reach the wheel |
| Repair kinds | `OverlayScene.repair` | `rope` and `helm` beside `hull`, and `shark` (the Shark Duty shove) |
| Forecast Board | `data/logs/forecasts.json`, `src/ui/menu/LogPage.js` | Logbook entries with a picture and a scale field; a board on deck and a pause-menu page |
| Vista crowds and top dock | `src/scenes/CinemaScene.js` | School layers (hundreds of fins) and `"dock": "top"` for the dialogue |
| Time of day by variable | `data/game.json` `timeOfDay` | Entries match `p4_tod` |
| Notices clear of the dialogue | `src/ui/Toasts.js`, `OverlayScene` | Toasts, the map title and the alarm move below a top-docked window; a tutorial opens below an alarm |

## Where things live

| What | Where |
| --- | --- |
| Chapter scripts | `data/story/cutscenes/phase4/ch15.json` … `ch19.json`, `world.json` (inspects, the sealed door, Jory's optional shift) |
| Crew and character dialogue per stage | `data/dialogue/phase4/crew.json`, `characters.json` (crew states s1 to s9) |
| Room changes | `data/maps/ship/phase4/*.patch.json` (generated from a placement table), `data/maps/ship/washroom.json` (new room) |
| NPCs, extensions, variants | `data/npcs/phase4_crew.json` (Pete is new; Garrick's sash, Squawks's feathers) |
| Quests, flags, triggers | `data/quests/phase4.json`, `data/story/flags/phase4.json`, `data/story/triggers/phase4.json` |
| Hazards | `data/hazards/dead_center.json`, `alarms.json`, `shark_duty.json` |
| The Forecast Board, Stench Log entries | `data/logs/forecasts.json`, `data/logs/stench_log.json` |
| Vistas | `data/story/vistas/phase4.json` |
| Music, ambience, SFX | `data/audio/music/weary_morning.json`, `shark_duty.json`, `shark_frenzy.json`; `data/audio/ambience_phase4.json`; `data/audio/sfx_phase4.json` (24 effects: the four bell patterns, the pole, the frenzy, the grog, the crayon) |
| Art | `src/art/inserts/forecastArt.js` (every crayon forecast and close-up), `src/art/vista/vistaPhase4.js`, `src/art/props/phase4Props.js`, `src/art/stage/stagePhase4.js`, `data/props/phase4.json`, `data/appearances/phase4.json`, `data/portraits/phase4.json` |
| Presets | `data/debug/presets.json` (18, `p4_start` to `p4_complete`) |

## Persistent state after the phase

Garrick in his sash; Squawks bald again (seven feathers laid out by his
nest); the Dead Center lying down in the treasure room; the hull at its worst
damage (`p4_hull_damage` 3): the port rail patched, re-patched, braced with
rope and bitten along its length; a
swarm of about a hundred fins round the ship for good; the Forecast Board
with seven forecasts; new Stench Log entries (the Center, the forecasts,
breakfast, the washroom, the pillow, Shark Duty, the waterline, the wake);
evening light. The crew have lines for every stage. Jory will give the
captain an optional Shark Duty shift whenever he asks, and stand him down
again.

## Testing it

- Debug overlay **Story** tab or `tools/play.mjs` `preset <id>`: Phase 4
  Start, Morning Grog, First Forecast, Breakfast Evacuation, Life Around the
  Center, Washroom Incident, Galley Incident, Night Evacuation, Quarterdeck
  Blocked, Seven Feathers, Bald Again, Shark Duty, Hundreds of Sharks,
  Frenzy, Post-Frenzy Repairs, Center Returns, Final Forecast, Phase 4
  Complete. Each is played to the end of the phase by
  `tests/phase4_story.test.js`.
- `tests/phase4_story.test.js` plays the phase headlessly both ways, checks
  the end state, the staging of every scene and the banned-terms scan;
  `tests/phase4.test.js` covers the systems and saves; `e2e/phase4.spec.js`
  plays it in a browser (Shark Duty played properly), plus the sealed
  washroom, the Forecast Board and the optional shift.
- `tools/play.mjs` has `duty <expr>` (play Shark Duty until a condition
  holds) and `skipshot` now plays repairs and logbooks too.
