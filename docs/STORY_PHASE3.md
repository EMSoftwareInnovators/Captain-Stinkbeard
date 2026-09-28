# Story Phase 3: The Grand Stenchmaster

The second canonical story chapter. It continues **the same evening** as the
end of Phase 2: the treasure is ruined, Squawks is bald and blanketed, the
trial and the frigate are behind everyone, and Garrick is on probation.
Garrick decides all of this clearly qualifies him for a promotion.

By the end, Blackbeard is **Captain Stinkbeard**, Garrick is **Grand
Stenchmaster Garrick Guzzlegut** (temporarily), the ship's drink is **Frog
Grog**, the ship itself has changed for good, and Garrick has been sent off in
the rowboat for the second time, trailing sharks toward another distant
release. The phase stops there. The next canonical excerpt continues it.

About 45 to 75 minutes of play: 232 scripts, about 1,080 dialogue lines, 6
quests, 61 story flags, a hull-patching timing game and a shark attack.

## Canon this phase adds

| Canon | How it shows in the game |
| --- | --- |
| Garrick invents the title *Grand Stenchmaster* | His NPC `title` follows the story: "Grand Stenchmaster (self-appointed)" from `stenchmaster_declared`, then "Grand Stenchmaster" (name plate "Grand Stenchmaster Garrick") from `garrick_title_retained` |
| Blackbeard becomes *Captain Stinkbeard* | The party character keeps the id `blackbeard` (saves, scripts); a story variant renames him from `captain_named_stinkbeard`. The name follows everywhere: dialogue name plates, the status page, level-up toasts, battle results, the save slot list, the quest log, the `{captain}` token and the debug overlay |
| The contaminated drink becomes *Frog Grog* | A real consumable (`data/items/phase3.json`); every rum ration turns into it (`swapItem`); the galley sells it instead of rum |
| The ship keeps changing | Yellow wood, breathing sails, sweating ropes, a coughing bell, a stained chart, a masked rat, yellow gun smoke |
| Garrick attracts sharks, and can lead them away | The shark threat layer; the rowboat lure; a *controlled release* well away from the ship |
| Stinkbeard lets Garrick keep the title, TEMPORARILY | `garrick_title_retained` |
| Suspicious stomach noises are an official emergency | `stomach_alarm_protocol` and the Stench Log's protocol entry |

Garrick stays original: the business-speak (operational restructuring,
atmospheric rebranding, accelerated depreciation, executive appointment) is
his, used sparingly; no borrowed characters, catchphrases or iconography.
`tests/phase3_story.test.js` scans every Phase 3 data file for banned names
and later-phase mythology.

## Chapter flow

Chapters start from story triggers (`data/story/triggers/phase3.json`), so a
game closed mid-scene always picks the story back up. The chapter name (save
list, debug overlay) and the time of day follow the flags (`data/game.json`).

| # | Chapter | Starts when | Quest | Key flags (in order) |
| --- | --- | --- | --- | --- |
| 9 | The Grand Stenchmaster Takes Command | `phase2_complete` | A Necessary Promotion? | `p3_started`, `garrick_reforms_started`, `garrick_reforms_heard`, `stench_log_seen`, `stenchmaster_declared` |
| 10 | Blackbeard Becomes Stinkbeard | `necessary_promotion` done | What Did You Call Me? | `amendment_read`, `stinkbeard_proposed`, `beard_sniffed`, `naming_dispute_survived`, `captain_named_stinkbeard`, `beard_prognosis`, `rain_started` |
| 11 | The Birth of Frog Grog | `what_did_you_call_me` done | Frog Grog | `grog_night_started`, `grog_gathering_seen`, `grog_tasted`, `grog_check_cabinet` / `_medicine` / `_hidden`, `frog_grog_named`, `frog_grog_unlocked` |
| 12 | The Ship's Transformation | `frog_grog` done | The Ship Is Changing | `ship_morning_started`, `sails_swollen`, `ropes_sweating`, `bell_coughs`, `wood_yellowing_seen`, `masked_rat_seen`, `heard_*` (crew), `ship_names_rejected`, `sharks_mentioned` |
| 13 | The Sharks Smell the Gust | `ship_is_changing` done | Sharks! | `sharks_sighted`, `port_impact_seen`, `plank_fetched`, `hull_patched`, `rudder_checked`, `beard_bait_seen`, `grog_spilled`, `deck_shark_seen`, `beans_provided`, `rowboat_plan`, `garrick_lowered`, `controlled_release_rule`, `sharks_lured` |
| 14 | The Grand Stenchmaster's Terms | `sharks` done | Grand Stenchmaster, Temporarily | `garrick_returned`, `drunk_sharks_seen`, `damage_assessed`, `frog_water_seen`, `beard_inspection_agreed`, `stenchmaster_terms_set`, `squawks_feather_regrowth_started`, `squawks_first_new_feather_yellow`, `garrick_title_retained`, `second_gust_warning`, `stomach_alarm_protocol`, `garrick_evacuated_again`, `second_release_seen`, `p3_complete` |

### What happens

1. **The same evening.** A stale haze below, stained planks, crew in
   improvised masks (Rook's wet sock, Bob's bottle, Sully's candle wax, Wick
   fanning, Gristle holding his breath and regretting it, a masked rat).
   Garrick stands on a barrel in a curtain, a galley pot and a mop. He cites
   the frigate, reviews the "situation", and hands the captain the Stench Log.
   Once it has been read he declares himself GRAND STENCHMASTER OF THE SEVEN
   SEAS: stunned silence, "No." / "Already finalized." / "By whom?" / "By the
   only qualified applicant." Duties: odour inspection (there is only one
   smell now: efficiency), the Stench Log, evacuation zones, classification
   (Mild to Premium). Squawks wants his feathers back: outside warranty.
2. **The rename.** An amendment is nailed to the mainmast. Garrick explains
   the beard went into the Dead Center too. Squawks: "Need evidence." The
   captain can refuse (twice) before he sniffs: freeze, green tint, sting,
   stagger, coughing, crew stepping back. Top notes, middle notes, a finish:
   "This is not a scent. This is an attack." BLACK / STINK; a stomach rumble
   as leverage (absurd, not sinister); a look at the frightened crew and
   the shivering parrot; "For the ship." CAPTAIN STINKBEARD. "Beard. Stinks."
   Root-deep, the beard beneath the beard, centuries... then rain, "I've
   extended the estimate", and a scream.
3. **Frog Grog.** Night and rain. The last sealed barrel, the toasts, the
   tasting (only Bob and Garrick like it), then checks of the captain's
   cabinet, Doc Fennimore's brandy and Old Finch's hidden bottle: all
   contaminated, and fresh drink turns too. FROG GROG is named, Garrick
   threatens a demonstration, "You do NOT have unlimited authority", a toast
   under duress, and Rook's first yellow burp.
4. **The ship changes.** Morning: breathing sails ("safe?" / "no idea"),
   sweating ropes, the coughing bell (KLANG, HACK, KOFF), yellowed wood by
   the treasure door and the masked rat; the crew add the hammocks
   ("Debatable"), the chart, the guns and Jim's pre-smoked fish. Garrick's
   report: an Assistant Stenchmaster (refused), a shortlist of new ship names
   (all rejected: she stays the Queen Anne's Revenge), and "I haven't
   mentioned the sharks yet." / "WHAT sharks?"
5. **Sharks.** Pseudo-science (cheese, garlic, beans, eel), disbelief, then
   fins. A shark bites through the port side; fetch a plank and patch it (a
   timing game); check the rudder; a fin tracks the captain's beard along the
   rail (BEARD BAIT); the Frog Grog cask goes over and the sea goes mad; a
   shark flops on deck, sniffs the beard, is disgusted, and goes back to
   biting. Stinkbeard grabs Garrick; "ANOTHER RELEASE" is refused; a huge
   impact; then the captain's own ugly, competent idea: not here, out
   there. Garrick needs fuel: Jim's beans ("We are feeding the weapon"). He
   rows off eating beans with two hands ("Use your feet!"); the fins turn one
   by one and follow; a distant yellow cloud, a delayed WHUMPF, relief.
6. **Terms.** An hour later: a bitten rowboat, one oar, a small shark on the
   stern, a battered Grand Stenchmaster: "I saved the ship" / the damage list
   / "some of the ship remains". Drunk sharks drift past blowing yellow
   bubbles. Terms: he reports dangerous meals and absolutely answers to the
   captain; he gets shark stink emergencies and Frog Grog production; Frog
   Water (no); beard inspections (no, until a fin appears; then from a safe
   distance: "Beard still terrible."). Squawks grows one tiny new feather.
   It's yellow. "It's golden, Squawks." Garrick sniffs it, the chase, fins,
   the captain looks at all of it: "You can keep it. TEMPORARILY." A rumble,
   "DEADLY BREW!", the rowboat again with one oar and a frying pan, "How
   far?" / "ANOTHER OCEAN." Finale: the changed ship at sail, a far-off
   announcement, "BRACE YOURSELVES!", a vast distant release, rings on the
   water, every shark turning toward it, and distant laughter.

## Systems added (reusable)

| System | Where | Notes |
| --- | --- | --- |
| Per-field story variants | `src/systems/story/progress.js` `resolveVariant` | Each field comes from the first matching variant that sets it, so a later name and an earlier look combine |
| Names and titles from the story | `Character.name / title / fullName / look`, `Party.nameOf` | The id never changes; displays resolve through variants |
| Logbooks | `data/logs/*.json`, `src/systems/logs/logbook.js`, `src/ui/menu/LogPage.js` | Data-only entries (location, severity, probable source, notes) with `if` and variants; a pause-menu page once available; the `logbook` command opens it in the world; new entries are announced |
| Shark threat | `src/systems/hazards/sharks.js`, `src/world/SharkLayer.js`, map `"sharks"` variants, `data/hazards/sharks.json` (optional tuning) | Levels none / curious / following / attacking / swarm; fins circle the hull, bump it when attacking, only thump the hull below decks; `sharks` and `sharkEvent` (bite, ram, flop, return, lure, follow, unfollow) commands |
| Repair timing game | `OverlayScene.repair`, `repair` command | Strike when the marker is in the green; two misses in a row widen the zone; honours the auto-timing assist |
| Frog Grog effects | `src/systems/effects/effects.js` `fumeWard`, `sideEffect` | Heal, a temporary fume ward in the field, one weighted, harmless side effect (Warmed Up, Stench-Proof, Belching, Dizzy) |
| Script commands | `src/systems/script/commandSchemas.js` | `logbook`, `swapItem`, `tint`, `sharks`, `sharkEvent`, `repair`; `music: null` stops the music |
| Ambient kinds | `src/world/Ambient.js` | `rain`, `sailPuff`, `ratPeek`, `odorTrail`, tinted `smoke`; entries follow live `if` conditions |
| Map patch prop conditions | `propConditions` in a map patch | Adds a condition to an earlier map's prop by id (the rowboat disappears when lowered) |

## Where things live

| What | Where |
| --- | --- |
| Chapter scripts | `data/story/cutscenes/phase3/ch9.json` … `ch14.json`, `world.json` (inspects) |
| Crew and character dialogue per stage | `data/dialogue/phase3/crew.json`, `characters.json` |
| Room changes | `data/maps/ship/phase3/*.patch.json` |
| NPCs, extensions, variants | `data/npcs/phase3_crew.json` (Gristle the rigger is new), `data/characters/phase3.json` (the rename), `data/characters/speakers_phase3.json` |
| Quests, flags, triggers | `data/quests/phase3.json`, `data/story/flags/phase3.json`, `data/story/triggers/phase3.json` |
| The Stench Log | `data/logs/stench_log.json` |
| Frog Grog and its statuses | `data/items/phase3.json`, `data/statuses/phase3.json`, `data/shops/ship.json` |
| Vistas | `data/story/vistas/phase3.json` |
| Music, ambience, SFX | `data/audio/music/stenchmaster_fanfare.json`, `stenchmaster_theme.json`, `frog_grog_shanty.json`, `shark_attack.json`; `data/audio/ambience_phase3.json`; `data/audio/sfx_phase3.json` |
| Art | `src/art/props/phase3Props.js`, `data/props/phase3.json`, `data/appearances/phase3.json`, `data/portraits/phase3.json`, `src/art/stage/stageArt.js`, `src/art/vista/vistaArt.js`, `src/art/inserts/insertArt.js` |
| Presets | `data/debug/presets.json` |

## Persistent state after the phase

Captain Stinkbeard's name and olive-tinged beard (and a faint odour trail);
Grand Stenchmaster Garrick (away in another ocean for now); the Stench Log in
the pause menu; Frog Grog in the galley; mustard-yellow wood and stains; sails
that puff; a bell that coughs; sweating rope; a patched hull; an empty davit;
ambient fins at a respectful distance; Squawks bald, blanketed and wearing one
yellow feather; the rowboat and stomach-noise protocol. The crew have lines
for every stage, ending with the new title in everyday use.

## Testing it

- Debug overlay **Story** tab or `tools/play.mjs` `preset <id>`: Phase 3
  Start, Grand Stenchmaster Declaration, Pre-Stinkbeard Rename, Stinkbeard
  Named, Frog Grog Unlocked, Ship Transformation, Pre-Shark Attack, Shark
  Attack, Garrick Rowboat Lure, Post-Shark Damage, Squawks Yellow Feather,
  Phase 3 Complete. Each sets every earlier flag and quest, and each is
  played to the end of the phase by `tests/phase3_story.test.js`.
- `tests/phase3_story.test.js` plays the phase headlessly both ways;
  `tests/phase3.test.js` covers the systems and saves; `e2e/phase3.spec.js`
  plays it in a browser, saves either side of the rename, and plays the
  rename and the hull patch on a controller.
