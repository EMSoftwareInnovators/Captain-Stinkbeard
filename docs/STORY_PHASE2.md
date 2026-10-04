# Story Phase 2: Garrick Grumblegut and the Cursed Treasure

The first canonical story chapter after the prologue. The player is still
**Captain Blackbeard** of the *Queen Anne's Revenge*, on the Sapphire Sea.
The phase ends with Garrick surviving his trial on probation. The story does
not go further; the next excerpt continues it.

About 30–60 minutes of play: 227 scripts, about 800 dialogue lines, 7 quests,
69 story flags, and one playable rescue.

## Garrick Grumblegut

An original character: a disgraced dockside treasure appraiser, salvager, con
man and "maritime businessman". Stout, loud, greedy, confident, lazy, knows
valuables by smell, invents business rules, occasionally clever and never
malicious. His gimmick is commerce-speak for his disasters: *asset
relocation* (theft), *accelerated depreciation* (ruining the treasure),
*atmospheric restructuring*, *infrastructure monetization* and *involuntary
maritime restructuring* (nearly fumigating a parrot).

Look (`data/appearances/phase2.json`, `data/portraits/phase2.json`): a portly
build, a crimson comb-over and mutton-chop sideburns, a battered sea-green
frock coat, burgundy striped trousers, oversized boots, a brass monocle, coin
pouches, belts and tools. 17 portrait expressions, including `gastro`,
`pretend` and `businesslike`.

**Captain Squawks** (red and blue parrot, the ship's self-appointed "first
mate of the air") has four looks that follow the story: `squawks` →
`squawks_exposed` (sooty, puffed, losing feathers) → `squawks_bald` →
`squawks_sweater` (Mags's knitted jumper and cap). Also new: Salty Jim (the
ship's pickler), One-Eyed Ned (lookout), Barnacle Bob, Penhallow (a ransom
prisoner and cloth merchant) and Dunstan.

## Chapter flow

Chapters start from story triggers (`data/story/triggers/phase2.json`), never
from quest callbacks, so a game closed mid-scene always picks the story up
again. The chapter name (save list, debug overlay) and the time of day follow
the flags (`data/game.json`).

| # | Chapter | Starts when | Quest | Key flags (in order) |
| --- | --- | --- | --- | --- |
| — | Hook | prologue done | Tomorrow's Heading | `phase2_hook_seen` → sleep in the captain's bed → `ch1_morning_started` |
| 1 | The Man in the Bathtub | `ch1_morning_started` | Strange Cargo | `bob_lamp_oil_seen`, `ch1_foredeck_reached`, `bathtub_spotted`, `bathtub_seen`, `garrick_hauled_aboard`, `met_squawks`, `garrick_questioned`, `garrick_provisional` |
| 2 | Garrick's First Day at Sea | `garrick_provisional` | The New Recruit | `garrick_toll_setup`, `garrick_toll_warned`, `garrick_toll_removed`, `garrick_scrub_seen`, `galley_lunch_seen`, `garrick_digestive_crisis`, `jim_warned`, `rumble_sails_seen`, `garrick_thunder_excuse` |
| 3 | Blackbeard's Treasure Room | `garrick_thunder_excuse` | Treasure Inspection | `treasure_inspection_started`, `garrick_saw_treasure`, `garrick_searched`, `treasure_hoard_checked`, `treasure_chest_moved` |
| 4 | The Grumblegut Gust | `treasure_chest_moved` | (Treasure Inspection) | `grumblegut_gust`, `quarters_evacuated`, `galley_evacuated`, `gust_aftermath_done`, `fumes_spread` |
| 5 | The Cloud Takes the Ship | `gust_aftermath_done` | Yellow Alert | `deck_evacuated_seen`, `dead_center_explained`, `squawks_fell`, `squawks_exposed` |
| 6 | Save Captain Squawks | `squawks_fell` | Save Squawks | `rescue_rope`, `rescue_cloth`, `rescue_gear_on`, `rescue_prepared`, `rescue_boots_moment`, `squawks_caught`, `squawks_rescued`, `squawks_bald`, `boots_stained` |
| 7 | The Fate of the Treasure | `squawks_rescued` | The Price of Gold | `fumes_thinned`, `treasure_contaminated`, `ruined_reveal_seen`, `insp_ruined_*`, `merchant_test_started`, `merchant_test_done`, `ship_permanently_contaminated`, `crew_turned_on_garrick` |
| 8 | The Trial of Garrick Grumblegut | `trial_started` | The Yellow Defense | `squawks_sweater`, `frigate_sighted`, `frigate_plan_agreed`, `ship_turned`, `fume_sail_released`, `frigate_fled`, `garrick_on_probation`, `rowboat_protocol`, `squawks_deadly_brew`, `phase2_complete` |

### What happens

1. **Morning.** Barnacle Bob drinks lamp oil ("spicy sunshine"). Walking
   forward (or chatting with three crew) makes One-Eyed Ned spot something off
   the starboard bow. Through the telescope: a man in an overturned bathtub,
   paddling with two giant sausages, while the crew guess (a stranded
   merchant, an unusually loud buoy, a giant floating fruit). Rook hauls him
   aboard ("Now THIS is a ship." / "Close enough."). Squawks returns and the
   two loathe each other on sight. Garrick's sloop came at a discount because
   the bottom was missing. Questions, a decision (throw him back, put him to
   work, the brig) that converges on "provisionally", and a toast on the
   captain's account.
2. **First day.** After a time skip Garrick has roped off the foredeck as
   GARRICK'S TOLL DECK (a painted-sign insert, attitude choices), then
   "supervises the plank" while Sully scrubs. Lunch in the galley: twelve
   pickled onions, a bulb of roasted garlic, cabbage stew, the sour cheese,
   deviled eggs, beans, the sea-soaked sausages, and the jar of FERMENTED EEL
   PASTE (DO NOT OPEN BELOW DECK). The first rumble rattles the pots and the
   captain's portrait. Salty Jim warns the captain. At the mainmast the
   sails shudder; Garrick blames distant thunder.
3. **The treasure room.** DO NOT TOUCH ANYTHING; Garrick dives in anyway
   ("inventory audit"). The search turns up coins, a ruby, a necklace, a
   silver fork and a small gold statue ("proprietary methodology"). Moving
   the fallen chest together builds the strongest rumble yet; Garrick's shoe
   comes off on its own ("My shoe."); EVERYBODY OUT.
4. **The Gust.** Garrick slips on a coin onto the chest ("my digestive system
   has declared bankruptcy"). A crab has clamped onto the door handle. A
   long build-up (a false alarm: a tiny toot) ends in the biggest blast in
   the game. Cutaways follow: the crew quarters, the galley, the deck and the
   ship from afar wearing "a small yellow hat". Back in the room the treasure
   has gone foul and Blackbeard is furious.
5. **The cloud.** The crew have evacuated to the deck; the figurehead's
   expression changes for the first time in sixty years. Garrick explains the
   Dead Center, admits the sausages were crab bait, and defends the eel paste
   ("It said not to open it below deck. That's where the jar was."). A gust
   blows Squawks down the main hatch into the cloud.
6. **The rescue** (playable, 1–3 minutes). A line from Rook and a wet cloth
   from Doc Fennimore, then down through the galley into the hold: dense
   banks, a drifting pocket, debris and the Dead Center by the treasure door.
   Squawks's cries guide the way, the rope trails the captain's path, and
   Garrick shouts down about leather boots. Squawks bursts out in a blizzard of
   feathers. Carry him to the stairs and the crew haul both of you out ("Then
   put me back in the EGG!").
7. **The fate of the treasure.** Everything is still there, and all of it is
   wrong: the ruby smells of pickled onion, the pearls sweat, the planks are
   stained right through. Penhallow will not take one coin at any price
   (WORTHLESS). Garrick: it has "bonded with the ship" ("Like paint."). The
   crew draw weapons; Blackbeard calls a trial.
8. **The trial.** Squawks attends in a knitted sweater. Four charges, each
   renamed by Garrick; Squawks votes guilty early, twice; the "plucked
   chicken" defence ends with Squawks going for his sideburns. Punishments
   are interrupted by a royal frigate. Garrick's plan: take the helm and put
   the ship upwind, then release the fouled sail. The frigate turns and runs.
   Probation: no eel paste, no treasure room after meals, and any unusual
   stomach noise means the rowboat, half a mile off, downwind. At once there
   is a rumble, and a cry of "ROWBOAT!". An epilogue montage follows: a yellow
   trail, ships, gulls and fish keeping clear, a happy rowboat, a distant
   cloud, and "DEADLY BREW!".

## Where things live

| What | Where |
| --- | --- |
| Chapter scripts | `data/story/cutscenes/phase2/ch1.json` … `ch8.json`, `world.json` (inspects, doors, collapse) |
| Crew and character dialogue per stage | `data/dialogue/phase2/crew.json`, `characters.json` |
| Room changes | `data/maps/ship/phase2/*.patch.json`; the rebuilt `data/maps/ship/treasure_hold.json` |
| NPCs, extensions, variants | `data/npcs/phase2_crew.json`, `data/characters/phase2.json` |
| Quests, flags, triggers | `data/quests/phase2.json`, `data/story/flags/phase2.json`, `data/story/triggers/phase2.json` |
| Vistas | `data/story/vistas/phase2.json` (art in `src/art/vista/`) |
| Fume tuning | `data/hazards/fumes.json` |
| Music, ambience, SFX | `data/audio/music/*.json` (garrick_theme, treasure_glitter, yellow_alert, rescue_tension, ruined_treasure, trial, frigate, fume_victory, epilogue), `data/audio/ambience.json`, `data/audio/sfx_phase2.json` |
| Art | `src/art/characters/` (portly build, parrot painter), `src/art/props/storyProps.js`, `src/art/stage/`, `src/art/vista/`, `src/art/inserts/`, `src/art/effects/fumeArt.js` |
| Presets | `data/debug/presets.json` |

## Persistent state after the phase

The treasure stays ruined (the foul props replace the originals); the treasure
room keeps a faint haze and a whiff by the broken chest; the deck has stains;
the figurehead wrinkles her nose; Squawks is bald and wears the sweater; the
captain's boots are stained; the rowboat reads "G.G."; the bathtub sits by
the bow. The crew and the new characters all have lines for the morning after.

## Testing it

- Debug overlay **Story** tab or `tools/play.mjs` `preset <id>`: Prologue
  complete, Chapter 1 morning, Garrick Arrival, Galley Lunch, Chapter 3
  treasure door, Pre-Treasure Blast, Post-Blast, Squawks Rescue, Contaminated
  Treasure, Garrick Trial, Frigate Encounter, Phase 2 Complete.
- `tests/phase2_story.test.js` plays the phase headlessly both ways;
  `e2e/phase2.spec.js` plays it in a browser.
