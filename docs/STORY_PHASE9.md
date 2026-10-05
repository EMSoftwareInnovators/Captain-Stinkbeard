# Story Phase 9: The Grand Treasure Catastrophe

The eighth canonical story chapter, and the biggest so far. It picks up at three in the
morning after the Grand Nap, in the lower hull barracks, and leaves the ship for the first
time.

It comes in four parts:

1. **Garrick's "Completely Authentic" History of the Grand Stenchmaster Sash.** The captain baits him into a history lesson, puts the sash on trial with Garrick's own sleep-talk, sits through a sash bureaucracy and gets a plain-language admission out of him.
2. **The Grand Sharkmaster and Crownskull Isle.** LAND. Garrick appoints Pete Grand Sharkmaster against his will, and Pete accidentally comes up with a good landing plan. The Revenge comes round to the lee side and the captain rows the reef.
3. **The Grand Excavation.** The island, the X, seven floors down, Garrick's three minutes with a shovel, STENCHMASTER EXCAVATION TECHNOLOGY, a launch sequence nobody can stop, RUN, and the shelter in the ruins.
4. **The Grand Treasure Catastrophe.** FIRE IN THE HOLE. The blast finds the treasure and keeps going. The Great Sharkstorm comes inland, great whites rain on the ruins, and a megalodon lands in the lagoon. The Crimson Fortune goes up into the storm, and the Crimson King's Crown comes down on the megalodon. Then the rage shanty, and a new main quest.

The phase starts in the captain's bunk at the end of Phase 8 ("Lie down and try to sleep
till morning"). It ends on Crownskull Isle with **RECOVER THE CRIMSON FORTUNE** open and
unresolved. Phase 10 is not started.

About 90 to 130 minutes of play:

- 16 chapters (55 to 70) and 17 quests, one of them left open.
- 118 story flags.
- About 1,150 lines of dialogue and narration in the scripts, plus crew dialogue for every stage.
- Two new maps: **Crownskull Isle** (60 by 72) and **the Reef Passage** (22 by 50).
- No new battles. The danger is environmental: sharks coming down on marked tiles. They knock the captain flat or shove his boat back, and never do worse.

## Continuity

**From Phase 8.** The crew wake (nobody slept but him) in the Lower Hull Barracks. The sash
is the one from the discount bin. The Grand Crown is in its crate (NOT IN THE HAMMOCK), and
the Great Sharkstorm is `easing_near_ship`. Garrick's sleep-talk from chapter 54 is the
evidence in chapter 57.

**Names.** He is **Garrick Grumblegut**, everywhere. The storm is the **GREAT SHARKSTORM**,
or casually the Sharkstorm, never anything else. The island is **CROWNSKULL ISLE**.
`tests/phase9_story.test.js` scans every Phase 9 file, data and art, for the banned names
and for later-phase material.

**The storm moves with the story.** The saved value `great_sharkstorm` goes through four new
states, all in `data/hazards/sharkstorm.json`:

- `following_crownskull`: behind the Revenge as she raises the island.
- `offshore_crownskull`: off the coast, held off a little by the cliffs. Sharks come down in the reef channel and the wave shoves the rowboat back.
- `inland_crownskull`: after the blast. It smells the new stench, crosses the coast, and drops great whites on the ruins' yard and round the clearing.
- `treasure_laden`: offshore again with most of the Crimson Fortune inside it. Gold flashes in the sky and the sharks going over wear it. Not resolved.

**The Dead Center stays put.** It is still over the forward deck (`dead_center` =
`second_forward_deck`), and the lee-side landing works round it: the helm, the capstan,
the decoy, the lure and the boats all have somewhere clean to stand, and the crew on deck
stand clear of the cloud.

**Squawks** is alive and bald. He rides in the captain's padded pouch and says one or two
words at a time. The captain promises him a share of the treasure (`squawks_share_promised`)
and protects him from employment.

## Canon this phase adds

| Canon | How it shows in the game |
| --- | --- |
| The morning after | Grey light through the hull planks. Garrick snored all night through a crown falling, a confession and a frog's capital gains. FWOoF. Pete looks destroyed, Bob remembers he sleeps in a cargo net, Gristle is irritated and Jim can still smell the Suit. "THE GRAND STENCHMASTER'S GRAND NAP HAS CONCLUDED." He was the only one who slept. Pfft. "Good morning to the suit too." |
| The bait | The captain, eerily calm: "We need to talk." THE HISTORY OF THE GRAND STENCHMASTER SASH. Garrick is delighted. The crew can see exactly what's happening ("Fun."). |
| A Completely Authentic History | From a crate. The Sacred Stench and its six duties ("resting" and "sleeping" are the same thing). The CLEARANCE label (an insert; the captain's smile gets dangerous). A thousand years (yesterday it was centuries); the tapestries are lost, the statues destroyed, the records missing, the archaeology "very private". "Convenient." |
| Princess Stenchalina the First | The first Grand Stenchmaster, an infant, the first Royal Waft. The palace shook, the little royal trousers flew across the nursery, and the disaster was that the ribbon fluttered. Hence the Sacred Sash Bearers. Pete: Garrick's own fake history proves it's a FART SASH. (`princess_stenchalina_heard`) |
| The Five Grand Treasures | The Grand Crown ("reconstructed from historical descriptions" / "HISTORICAL INTUITION"), the Sacred Seat (his chair), the Grand Eating Bowl (Jim's mixing bowl, and Jim objects), the Stenchmaster Entertainment System ("Spiritually."), and the Grand Sash ("descended through generations"). (`five_grand_treasures_heard`) |
| Former Stenchmasters | Sir Stenchalot the Flatulent, Lady Windbottom the Mighty, Grand Duke Gassius the Loud and Admiral Rumpus Thunderpants (the Battle of Seven Winds: six ships turned round, and the seventh "sank from embarrassment"). Garrick's fiction, never confirmed. (`former_stenchmasters_heard`) |
| The trap | "Especially the part about the seventy-percent-off discount bin." He freezes. |
| No Receipt | A trial. Each of Pete, Gristle, Bob and Squawks confirms a piece of the sleep-talk, and Squawks finishes it: "No receipt." "NO RECEIPT!" The defence: irrelevant. SPIRITUAL AGE: bought last week materially, ancient symbolically, a thousand years old emotionally. Then, without thinking, what the sash is for: somebody has to hold it while he farts. A rumble (not a release). LOST FART ATTEMPT THREE goes nowhere ("ancient ruins!" / "discount store!"). The explorer hat is confiscated again. (`sash_origin_confrontation`, `p9_hat_confiscated`) |
| The Grand Sash Bureaucracy | THE GRAND STENCHMASTER'S GRAND STENCHMASTER SASH'S GRAND ASSISTANT: Bob resigns before accepting. Then the GRAND STEWARD (a second title), the procedure (STENCHMASTER PRESSURE BUILDING! BRACE THE SASH!), and an org chart down to the Senior Flutter Observer, who stands fifteen feet away (an insert). "I KNEW IT." Squawks is offered CEREMONIAL SASH HERALD, and the captain shields him: "I am protecting ye from employment." The plain-language ban, and finally: "I want somebody to hold the sash so it doesn't flutter while I fart." "FINALLY." (`sash_bureaucracy_titles`, `bob_refused_assistant`, `plain_language_admission`) |
| LAND! | Ned sees it through a hole in the hull. Nobody hears him over FART SASH / STENCHMASTER SASH, so he shouts louder. The reveal is a vista: the pale beach, the reefs, the jungle, the cliffs and the crowned skull of the ridge. It's the island on the captain's map. "Treasure?" "Aye." "MONEY!" "MY treasure." The Sharkstorm followed them: "Strong scent." (`crownskull_discovered`, `crownskull_map_unlocked`; the treasure map is the `crimson_chart` item) |
| The Landing Problem | A council in the hull, and six options to talk through: beach her (the hull would break), anchor and row (sharks), swim (NO; Garrick can't swim in the Suit, which is not why), circle (the storm follows the wake), wait (the sharks keep eating the ship), and another release as a lure (NO MORE FART-BASED NAVIGATION). He asks for a Grand Nap. Everyone explodes. |
| The Grand Sharkmaster | Revived from Phase 7 to fix "understaffing". He points at Pete: "CONGRATULATIONS." The blue sash ("the discount store sold a two-pack"), refused and thrown, and the crayon paper `GRAND SHARKMASTER = PETE`, torn. Pete's class doesn't change. `pete_mock_title_grand_sharkmaster` is a joke title in dialogue and in the journal: Appointed: Peg-Leg Pete. Accepted: No. Authority: None. (`blue_sash_exists`, `blue_sash_refused`) |
| The Frog Tax Man | Episode `the_sharkstorm`: Franklin's records were eaten by a shark. Then by a shark storm. Every head turns to the screen. It's a coincidence (the television knows nothing). The Auditor: a sharkstorm is not a valid excuse for poor recordkeeping. (`ftm_sharkstorm_coincidence`) |
| Pete's plan | "I HAVE BEEN GRAND SHARKMASTER FOR FORTY SECONDS!" Then, on the chart (an insert): the lee side, the cliffs, an empty decoy boat first, watch the fins, a fart-soaked timber thrown to the far side, the crew boats away from the sharks. It's good. "Grand Sharkmaster." Pete feels betrayed. (`landing_plan_made`) |
| The Lee-Side Landing | On deck, in that order: bring her round under the cliffs (a wrong heading gets a no from Nell, and you try again), make the lines fast, rig the decoy, watch the fins with Pete and call "Now!" on a thin sea, throw the lure, lower away. Then the Reef Passage: the captain rows a zigzag through four reef banks in a rowboat, with Squawks in the bow and the crew boat behind. Storm sharks come down in the channel (marked first), and the wave pushes the boat back. It never sinks. (`crownskull_landed`) |
| Crownskull Isle | The landing beach, the jungle trail, the river crossing, the Broken Tooth, the statue (it points north), the Crimson Clearing, the ancient ruins, the western beach, the reef point, the ridge path, the lagoon and three quiet glades. Every place has a name that shows on entry. The crew follow; Garrick carries nothing, in full regalia, crown on ("Ugly crown."). Optional: CURIOSITIES OF CROWNSKULL ISLE (seven places) and four chests (a charm, tonics, biscuits, a little money). |
| The Fortune of the Crimson Kings | A marker under vines (CUT THE VINES): a crowned skull, crossed swords, THE FORTUNE OF THE CRIMSON KINGS. The crew's dreams: Pete's own ship, Bob's tavern, a kitchen where nobody steals Jim's cookware, Gristle's retirement, a quiet house for Ned far from Garrick, a gold pouch for Squawks. Garrick's GRAND STENCHMASTER BONUS, ceremonial percentage and fart royalty are all denied. (`crimson_fortune_found`) |
| Seven Floors Down | Loose sand, packed clay, stone, more clay, gravel, more stone and the Miser's Floor. Each floor is a choice of tool and a timing bar; the wrong tool costs a line and nothing else. After the first floor Garrick has his turn: three strokes. "How long have I been digging?" "About two or three minutes." He believed forty hours. Snack, break and nap are all denied. After the third floor: days of it. |
| Stenchmaster Excavation Technology | Dig by Grand Stenchmaster release. The sand goes elsewhere, the rocks go VERY elsewhere, and the treasure "hopefully stays". NO. Then the stomach changes: a HOWL, birds leave, the crown rattles, the ground hums. "Oh." "I may have already sent the launch commands." To internal Stenchmaster operations. "Launch command acknowledged." There is no choice that stops it. (`excavation_started`, `release_triggered`) |
| RUN | Tools down; Gristle takes the map; the captain takes Squawks; Garrick stays, TARGETING. The western beach has the Sharkstorm too (a shark lands nearby). "Sharks this way, Garrick that way." Then the ruins, and six jobs: shift the stone, brace the wall, drag the beam, hang the cloth, Squawks in the safest corner, someone on watch. 70%, 80%, 85%. WHOOOOSH one way, AWWOOOO-GRRRRR-BLOOORP the other. "They're communicating." |
| Fire in the Hole | Cut to the clearing (a vista): aiming adjustments; lining up. "GRAND STENCHMASTER EXCAVATION TEAM—" "THERE IS NO TEAM!" "FIRE IN THE HOLE!" |
| The Grand Excavation | The biggest set-piece yet: a column of sand, clay, stone and gravel; a palm tree going past upside down; chunks of the island in the sea. "Bad digging." "Aye." The smell reaches the ruins (nobody dies). The storm leans, turns "like a dog that has heard its name", and comes inland. (`great_sharkstorm_inland`; the crater is `crater_state` = `blasted`) |
| The storm comes inland | Fire in the Hole: get back to Squawks in the shelter while great whites come down in the ruins' yard, each on a marked tile. A hit knocks the captain flat and nothing worse. Then a shadow the size of the ship: the megalodon comes down in the lagoon. "Big shark." "Aye." "Very big." Pete: not a Grand Sharkmaster problem. (`megalodon_introduced`; `megalodon_state` = `stranded_crownskull`) |
| The treasure, and then not | The blast is still going and it finds the treasure. For one moment IT WORKED. Then STOP, CANCEL LAUNCH, ABORT, REVERSE THRUST, EMERGENCY STENCHMASTER OVERRIDE: nothing works. Coins, crowns, chains, goblets and the Crimson King's Crown ("NOT THAT ONE!") go up into the storm. "MY MONEY!" (`fortune_scattered`; `crimson_fortune_state` = `scattered_into_sharkstorm`) |
| The crowned megalodon | The Crimson King's Crown comes down on the megalodon's head and fits. "Big shark king." "No." (`megalodon_crowned`; `crimson_crown_holder` = `megalodon`) |
| Pfft | The release dwindles to one small "pfft." Garrick, dusty and sandy, crown crooked, picks up a coin and sniffs it. "Uh-oh." In the crater: about two per cent of the fortune, reeking (`crater_treasure_contaminated`, the `reeking_doubloons` item, `crimson_fortune_recovered_percent` = 2). The captain's breakdown: NO MORE GRAND ANYTHING. "Pretty." "Very pretty." |
| The Shark Shanty | **In Stinkbeard's increasingly furious imagination...** On a stage, behind a caption, sharks in jewels sing that the pirates dug and the sharks got the gold, with a hammerhead solo and the megalodon crowned. It's a vista and only in his head. "Stop it." "I am NOT in the reef." "STOP. SINGING. I AM THE CAPTAIN." Back on the shore nobody is singing; the crew are watching him shout at the sky. "The captain is having a rage hallucination." "Do not interrupt. I am having a rage hallucination." A reef shark comes down in a bandana, a chain and half a hat. It flops. "IT'S MOCKING ME." (`rage_shanty_seen`) |
| Vertical relocation | The confrontation: the first release ruined the treasure aboard, the second made the Great Sharkstorm, and this one found the fortune, real, and BLEW IT INTO A SHARK CYCLONE. "Technically, it has been successfully excavated. It's simply no longer underground." Suit memory, expedition patina, historical aroma: STOP MAKING DISASTER SOUND PRESTIGIOUS. |
| Recover the Crimson Fortune | "All of it?" "AYE." "Purely organisationally, consult the GRAND SHARKMASTER." "IT CREATED A JEWELED SHARK ECONOMY!" A hammerhead goes over and winks ("Probably rolled." "IT. WINKED."). If sharks want to act like pirates, he'll treat them like pirates. "Grand Sharkmaster operation?" He runs. The new main quest has four objectives (the Crown, the shark-carried treasure, the loose storm treasure, the Great Sharkstorm) and none of them can be done yet. (`recover_fortune_unlocked`, `p9_complete`) |

**Garrick's history is his.** Nothing he says in this phase is true and nothing in the game
confirms it. The new logbook **Garrick's History of the Grand Stenchmaster Sash**
(`data/logs/phase9.json`, `garrick_history`) keeps it apart. Its first entry is
**VERIFIED HISTORY**: "Everything below this line is the Grand Stenchmaster's claim. Nothing
in it has been verified by anyone, ever." Every claim under it has a Source, Evidence,
Reliability and Captain's note, for example:

> Princess Stenchalina the First. Source: Garrick. Evidence: None. Reliability: Extremely
> questionable. Captain's note: He made this up this morning.

The sash's entry is **Disproved**. Nothing here says there were never real ancient
Stenchmasters, and none of it is an item, a character or a place.

**The Captain's Journal** (`captains_journal`) holds the facts:

- **The Crimson Fortune:** from Located to SCATTERED INTO THE GREAT SHARKSTORM. Current holder of the Crown: THE CROWNED MEGALODON.
- **The Grand Sharkmaster:** Appointed: Peg-Leg Pete. Accepted: No. Authority: None. Duties: apparently every shark problem Garrick doesn't want. Pete's note: 'I QUIT.' Garrick's note: 'Request denied.'
- **The island and the megalodon**, as they are.

**Originality and scope rules**

- The adventure is still THE GRAND EXPEDITION FOR THE LOST FART: no film titles, no borrowed hero.
- The shanty is original, and it is imagination only. Sharks don't talk or sing in the game.
- No plumbers and no borrowed palettes for Garrick.
- **No Phase 10 material.** The fortune is not recovered, the megalodon is not fought, the storm is not resolved. There are no real ancient Stenchmasters, no sash law, no court, no Brogath, no Greyhook Cove and no Crooked Lantern. The test scans for all of it.

## Chapter flow

Chapters are chained by scripts and story flags. The time of day uses `p4_tod`, with new
values: grey morning in the hold (15), morning at sea (16), noon on the island (17), the
long afternoon of the dig (18), the dark sky of the storm inland (19) and the aftermath
(20).

**55 · The Morning After the Grand Nap**

- **Starts when:** the captain's bunk after `p8_complete` ("Lie down and try to sleep till morning"). A Phase 8 save that comes into the hold gets a one-time pointer to it (`p9_ready_hint`).
- **Quest:** The Morning After.
- **What happens:** The crew one by one; wake the Grand Stenchmaster; "We need to talk."

**56 · A Completely Authentic History**

- **Quest:** A Completely Authentic History.
- **What happens:** Ask him about the Sacred Stench, the first Stenchmaster, the treasures and the former Stenchmasters, in any order; the clearance label; the trap.

**57 · No Receipt**

- **Quest:** No Receipt.
- **What happens:** Four witnesses; the verdict; spiritual age; the plain purpose; a rumble; Lost Fart attempt three; the hat goes back in the trunk.

**58 · The Grand Sash Bureaucracy**

- **Quest:** The Grand Sash Bureaucracy.
- **What happens:** Bob's title; the org chart; the herald; the plain words.

**59 · LAND!**

- **Quest:** LAND!
- **What happens:** Ned at the gap in the hull; the reveal (a vista); the map.

**60 · The Landing Problem**

- **Quest:** The Landing Problem.
- **What happens:** The council; six options, talked through in any order; no Grand Nap.

**61 · The Grand Sharkmaster**

- **Quest:** The Grand Sharkmaster.
- **What happens:** Pete is appointed; the blue sash; the crayon paper; the Frog Tax Man coincidence; Pete's plan.

**62 · The Lee-Side Landing**

- **Quest:** The Lee-Side Landing.
- **What happens:** Up on deck: the helm, the lines, the decoy, the window, the lure, the boats; then row the Reef Passage to the beach.

**63 · Crownskull Isle**

- **Quest:** Crownskull Isle (and the optional Curiosities of Crownskull Isle).
- **What happens:** Follow the map: the trail, the river crossing, the Broken Tooth, the statue, the X.

**64 · The Fortune of the Crimson Kings**

- **Quest:** The Fortune of the Crimson Kings.
- **What happens:** Cut the vines; the inscription; five dreams; Squawks's share.

**65 · Seven Floors Down**

- **Quest:** Seven Floors Down.
- **What happens:** Fetch the tools; dig (the right tool, struck on the green); Garrick's turn; deeper.

**66 · Stenchmaster Excavation Technology**

- **Quest:** Stenchmaster Excavation Technology.
- **What happens:** The proposal; NO; the howl; the launch commands.

**67 · RUN**

- **Quest:** RUN.
- **What happens:** The western beach; the ruins; six jobs to make the shelter; the percentages.

**68 · Fire in the Hole**

- **Quest:** Fire in the Hole.
- **What happens:** The countdown (a vista); the blast; the smell; the storm comes inland; back to Squawks through the falling sharks; the megalodon.

**69 · Vertical Relocation**

- **Quest:** Vertical Relocation.
- **What happens:** The treasure exposed, and blown away; the crown on the megalodon; pfft; the crater; the megalodon up close.

**70 · The Shark Shanty**

- **Quest:** Recover the Crimson Fortune (opens at the end).
- **What happens:** The rage shanty (a vista); the reef shark in a bandana; have a word with Garrick; vertical relocation; the wink; RECOVER THE CRIMSON FORTUNE.

The captain's reaction choices (Furious, Sarcastic, Exhausted, Threatening and Resigned)
come up through the trial, the bureaucracy, the council, the dig and the confrontation. They
all converge. What doesn't branch: the sash is cheap, Pete is Grand Sharkmaster whether he
likes it or not, the release can't be stopped, the fortune goes into the storm, and the
crown goes on the megalodon.

## Systems added (reusable)

**An outdoor map, and named places on it**

- **Where:** `data/maps/island/crownskull_isle.json`, the `island` tileset; regions with `name`.
- **Notes:** A region with a `name` shows a location title on entry (top right, wrapping clear of the quest notices). A quest objective of type `visit` completes on `region:entered`. The validator checks names are non-empty strings.

**Riding in something (`playerVehicle`)**

- **Where:** a map's `playerVehicle`; `Actor.setVehicle`; `src/art/stage/stagePhase9.js`.
- **Notes:** The captain sits in the vehicle and it goes where he goes. The stage frames are `<base>_<dir>`, centred on his seat, plus an optional `<base>_<dir>_front` drawn over him, so he sits in the boat rather than on it. The Reef Passage uses `rowboat_top`. The validator checks the four direction frames.

**Sharks that come down anywhere**

- **Where:** `src/world/SharkstormLayer.js`; state fields `maps`, `flying.areas`, `flying.ground`, `flying.onHit`, `flying.push`, `glints`.
- **Notes:** A state names the maps it plays on and an area per map. `ground` decides how a landing goes: `deck` (flops back over the rail), `land` (yanked back up) or `water` (splashes). `onHit` decides what happens to the captain: `knock` (flat on his back) or `push` (the boat shoved back a few tiles). Every landing is marked first (`warnMs`). `glints` flashes gold in the sky.

**Fins in the water**

- **Where:** `src/world/Ambient.js`, kind `fins`.
- **Notes:** `{ x, y, rx, ry, count, speed }`: fins circling an ellipse (the decoy boat, the lure).

**Timing-bar variants**

- **Where:** `OverlayScene.js`.
- **Notes:** `dig`, `pick`, `pry`, `vines`, `throw` and `lower`. The story now waits until a finished bar has faded before the next line opens.

**A quest left open**

- **Where:** `data/quests/phase9.json`, `"open": true`.
- **Notes:** RECOVER THE CRIMSON FORTUNE is active with objectives nothing in the game can complete yet. The quest checks skip it.

**Looks, props, sounds**

- **Looks:** `garrick_stenchmaster_dusty`, Pete's blue sash (`bluesash`), the captain's padded parrot pouch (`data/appearances/phase9.json`, `data/portraits/phase9.json`, `data/characters/phase9.json`).
- **Props:** 51, in `data/props/phase9.json` and `src/art/props/phase9Props.js`: palms, ruins, the marker, seven dig pits, the tool pile, the crater, debris, foul coins, the megalodon (crowned or not).
- **Speakers:** `garrick_far` (shouting from the clearing), `shark_chorus` and `hammerhead` (imaginary).
- **Insects:** a new ambience loop for the jungle.

**Save v9**

- **Where:** `src/config/constants.js`, `src/systems/save/migrations.js`.
- **Notes:** An 8 to 9 migration that fills missing flags, vars, values, world objects, visited rooms, counters and inventory. It never removes anything. Phase 9's persistent facts (the crowned megalodon, the scattered fortune, the treasure-laden storm, Pete's title) are ordinary flags and values, so they survive save and load.

## Where things live

| What | Where |
| --- | --- |
| Chapter scripts | `data/story/cutscenes/phase9/ch55_58.json`, `ch59_62.json`, `ch63_66.json`, `ch67_70.json`, `world.json` (the boats both ways, the crater, the megalodon, the marker, the tools, the lagoon, the view, the glades and the chests' surroundings) |
| Crew dialogue per stage | `data/dialogue/phase9/crew.json`, selectors in `data/npcs/phase9_crew.json` |
| Maps | `data/maps/island/crownskull_isle.json` (regions, story props, placements for every stage), `data/maps/island/reef_passage.json`; `data/maps/ship/phase9/cargo_hold.patch.json` and `main_deck.patch.json` (the morning, the council, the deck at the lee side, the boat to the island after the phase) |
| Quests, flags, triggers | `data/quests/phase9.json`, `data/story/flags/phase9.json`, `data/story/triggers/phase9.json` (the dig after the tools, the western beach, the ruins) |
| The episode | `data/tv/programs/frog_tax_man.json`: `the_sharkstorm` |
| The storm | `data/hazards/sharkstorm.json` (four new states) |
| Logbooks | `data/logs/phase9.json`: Garrick's History of the Grand Stenchmaster Sash, the Captain's Journal |
| Items | `data/items/phase9.json` (the Crimson Chart, the Reeking Doubloons), `data/items/phase9_equipment.json` (the Crownskull Charm) |
| Vistas | `data/story/vistas/phase9.json`: `history_lesson`, `crownskull_reveal`, `crownskull_offshore`, `lee_side`, `excavation`, `garrick_aim`, `treasure_exposed`, `crowned_megalodon`, `ridge_view`, `shark_shanty` |
| Art | `src/art/vista/vistaPhase9.js` (Garrick's crayon history, the island, the blast, the treasure, the crowned megalodon, the shanty stage), `src/art/props/phase9Props.js`, `src/art/inserts/phase9Inserts.js` (the clearance tag, the org chart, Pete's plan, the treasure map, the marker), `src/art/stage/stagePhase9.js` (the rowboat, the jewelled sharks) |
| Music and SFX | `data/audio/music/crownskull_isle.json` (the island), `landing_tension.json` (the landing), `launch_buildup.json` (the stomach), `rage_shanty.json` (the shanty, accordion and all); `data/audio/sfx_phase9.json` (28 effects: shovels, picks, vines, the howl, the ground's hum, the birds leaving, the blast, falling debris, coins and jewels, the megalodon's landing, the regal sting, a tiny pfft); `data/audio/ambience_phase9.json` (5: surf, the jungle, the beach, the storm inland, the aftermath) |
| Presets | `data/debug/presets.json` (39, `p9_start` to `p9_complete`) |

## Persistent state after the phase

**Crownskull Isle**

- Unlocked and explorable, and reachable both ways: the boats on the beach row back to the Revenge, and the ship's boat on deck rows across.
- The clearing is a crater (`crater_state` = `blasted`), with debris, an uprooted palm, foul coins and a reek. The marker is gone. Debris is scattered through the jungle and the ruins' yard.
- The megalodon is in the lagoon, alive, stranded and crowned. Nobody fights it.

**The Crimson Fortune**

- `crimson_fortune_state` = `scattered_into_sharkstorm`.
- `crimson_fortune_recovered_percent` = 2, and those two per cent reek.
- The Crimson King's Crown is on the megalodon (`crimson_crown_holder` = `megalodon`).

**The Great Sharkstorm**

- `treasure_laden`: gold in the sky, jewelled sharks going over, offshore and still following. Not resolved.

**The crew**

- Pete is Grand Sharkmaster (Unwilling), in dialogue and the journal only. His class is unchanged.
- Garrick is dusty, crowned, and runs whenever the captain turns round.
- The captain has a new level of anger and one priority: RECOVER THE CRIMSON FORTUNE.

**The Revenge** rides at anchor on the lee side, battered and usable: the hub for whatever
comes next. The hatches Phase 7 barred from below (the galley's ladder, the sleeping
quarters' ladder) open again when the crew go up on deck in chapter 62, so the deck, the
galley and the hold connect both ways. The fore hatch from the deck down into the
condemned quarters is nailed shut ("Nobody goes in.").

## Testing it

**Presets.** Use the debug overlay's **Story** tab or `tools/play.mjs` `preset <id>`. Each
preset is played to the end of the phase by `tests/phase9_story.test.js`. Nineteen of them
start inside their scene (`script`). The 39 presets are:

- Phase 9 Start
- Morning After Grand Nap
- Sash History Lesson
- Princess Stenchalina Story
- Five Grand Treasures
- Discount Sash Confrontation
- Lost Fart Attempt Three
- Sash Bureaucracy
- Plain-Language Admission
- Land Sighted
- Crownskull Isle Reveal
- Landing Strategy
- Grand Sharkmaster Appointment
- Frog Tax Man Sharkstorm Coincidence
- Pete's Landing Plan
- Lee-Side Approach
- Decoy Boat
- Crownskull Landing
- Jungle Exploration
- Crimson Fortune Site
- Digging Start
- Garrick Quits Digging
- Excavation Proposal
- Launch Sequence
- Evacuation Run
- Western Beach Trap
- Ancient Ruins Shelter
- Final Warning
- Excavation Blast
- Great Sharkstorm Inland
- Great White Rain
- Megalodon Arrival
- Treasure Exposed
- Treasure Blown Away
- Crowned Megalodon
- Treasure-Laden Sharkstorm
- Stinkbeard Rage Shanty
- Recovery Quest Unlocked
- Phase 9 Complete

**Tests.**

- `tests/phase9_story.test.js` plays the phase headlessly with the first and with the last option at every choice. The first-option run also looks round the whole island; the last-option run tries a wrong tool on every floor, steers for the storm first and waits at the rail. It checks:
  - the canonical end state: the flags, the values, the storm, the crater, the items, the open quest, Pete's class, Garrick's and Bob's looks, both logbooks;
  - that the required lines happen exactly once;
  - every preset, the staging of every scene and the brief scan.
- `tests/phase9.test.js` covers:
  - the four storm states, in story order, and where their sharks may come down (areas, ground, knock or push, glints, the jewelled variants);
  - that no Phase 9 scene can hurt anyone;
  - the rowboat's frames (the front layer is only what's nearer the camera than the seat) and the vehicle validation;
  - the island's named places, the region-name validation, the fins and the boats both ways;
  - the open quest (nothing in the game can finish it);
  - saves: the 8 → 9 migration (and the old `guzzlegut_gust` flag), a version 8 record upgrading, and round-trips at all 39 checkpoints;
  - the looks, the props, the vistas, the music, the sound effects and the insects.
- `e2e/phase9.spec.js` plays it in a browser:
  - the whole phase from the end of Phase 8, and from the Crownskull Landing;
  - the reef passage, rowed;
  - the first floor of the dig (the wrong tool, then the right one);
  - after the phase, the boats both ways with the fortune still out there.
