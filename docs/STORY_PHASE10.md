# Story Phase 10: The Great Sharkstorm Spout Catastrophe

The ninth canonical story chapter. It picks up on Crownskull Isle a minute after Phase 9's
rage shanty, with the Crimson Fortune going round in the Great Sharkstorm and the Crimson
King's Crown on the megalodon, and it ends with the Queen Anne's Revenge **inside** the
Great Sharkstorm, still trapped.

It comes in seven parts, adapted from seven sections of the source:

1. **The Bling Bling King's Participation Prize** (chapters 71 to 77). Not Pete's fault. "I used to be Blackbeard." The saddest salvage, the walk back under the wealthy sharks, the tiara (stolen twice), the row home. The crowned megalodon comes back as THE BLING BLING KING and spits a plastic coin on the deck. Beans, Frog Grog, Crying Beans and Spicy Stench Sauce. The sharks order catering and throw their rubbish on the deck.
2. **The Bling Bling King's Bedtime Mockery** (78 to 83). A sauce vat vents in the hold. Rusty Tom checks the old quarters: still condemned. The sharks buy bedding; one pillow comes down. The galley becomes a bedroom, with the Grand Stenchmaster's hammock strung over the captain. The Frog Tax Man deducts sleep. The kerosene lamp. Brogath the Bashful (alleged). Tokens down the hatch; the Grand Award Ribbon; a word with the storm.
3. **The Legend of the Tornado-Stopping Stenchmaster** (84 to 86). Rumpold Windbreaker the Resolute (alleged) met wind with wind. Fifty-three times worse, Garrick says. The fart-man trophy. The captain borrows the book at night and writes the plan, clause and all.
4. **The Counter-Sharkstorm Initiative** (87 and 88). The briefing; every alternative is worse; two sash holders needed; Pete's fake job duties ("YE'RE USING FAKE JOB DUTIES TO AVOID REAL WORK!"); Rusty Tom and Barnacle Bill draw the short straws.
5. **Garrick Charges the Stenchmaster** (89). The Grand Feast in five parts, plated formally, eaten in one bite.
6. **The Grand Stenchmaster Cowardice Crisis** (90 and 91). The approach, with sharks landing on the deck. THIS IS THE ONE TIME. He runs for the bow. Three arguments. The Bling Bling King's Certificate of Grand Cowardice; the sash flutters; he goes back.
7. **The Great Sharkstorm Spout Catastrophe** (92 to 95). Alignment; "...nope"; STENCHMASTER LAUNCH, into the ocean. The sea comes up green (BEANS). The blast drives the Revenge stern-first into the storm. Hold on, Squawks, below. Inside: the tokens' welcome, NO AFTERSHOCKS, the Mark II saved, a can of sauce for an aerial, the impossible audit (the Bling Bling King on television, quoting Garrick's book as law, paying its tax with the captain's crown, then an advertisement). "I USED TO BE BLACKBEARD." The Grand Nap, postponed.

The phase starts from the end of Phase 9: coming onto the island says where (Pete, at the
crater), once. It ends inside the storm with **INSIDE THE GREAT SHARKSTORM** open and
unresolved. Phase 11 is not started.

About 100 to 140 minutes of play:

- 25 chapters (71 to 95) and 25 quests, one of them left open.
- 184 story flags.
- About 1,150 lines of dialogue and narration in the scripts, plus about 160 lines of crew dialogue across the stages.
- No new maps: the phase plays on Crownskull Isle, the main deck, the galley and the hold, all through map patches.
- No battles. The danger is the storm's sharks landing on marked tiles during the approach; a hit knocks the captain flat and nothing worse.

## Continuity

**From Phase 9.** The crater is still a crater, the fortune is still `scattered_into_sharkstorm`,
the Crimson King's Crown is still on the megalodon (`crimson_crown_holder` = `megalodon`),
and the storm is still `treasure_laden`. Pete's Grand Sharkmaster is still a joke title; his
class never changes. Squawks rides in the captain's pouch on the island and walks again
aboard. The old crew quarters stay condemned.

**Names.** He is **Garrick Grumblegut**, everywhere (a version 9 save is checked once more
for any "Guzzlegut" and normalised). The storm is the **GREAT SHARKSTORM** (or the
Sharkstorm, the shark vortex, "that damned storm"), never the protected name. The book is
**The Grand Expedition for the Lost Fart: Complete Grand Stenchmaster Legends - Volume One
of Probably Many**, homemade, in crayon, and not a reliable source. **Barnacle Bill** is a
new deckhand and is not Barnacle Bob. `tests/phase10_story.test.js` scans every Phase 10
file, data and art, for the banned names and for later-phase material.

**The storm moves with the story.** The saved value `great_sharkstorm` goes through four new
states (`data/hazards/sharkstorm.json`):

- `p10_trailing`: treasure-laden, following the Revenge close. Now and then one of the Bling Bling King's cheap prizes comes down on the deck with a clack: never more than three lying about, never during a scene.
- `close_approach`: the storm fills the sky; sharks make fast low passes and come down on the quarterdeck and midships (marked first, kept off the forward deck). A hit knocks the captain down.
- `entering`: the Revenge driven stern-first into the storm. Everything whirls past at a slant.
- `inside_ship`: the Revenge inside the storm, lifted and going round. The deck shows the storm's wall (the `stormsky` backdrop); below, the rooms drift a pixel or two with her (never a spin, and off when screen shake is off), with things landing overhead.

**The Dead Center** is still over the forward deck until chapter 90, when the approach
blows it away (`deadCenter: none`), so the bow is clear for the cowardice crisis.

## Canon this phase adds

| Canon | How it shows in the game |
| --- | --- |
| Not Pete's fault | Pete, hands up on the crater's rim: he didn't create the storm, attract the sharks, blast the treasure or appoint himself. The captain knows. He's angry with the sharks, and with Garrick (who hides behind Bob for "leadership protection"). |
| I used to be Blackbeard | The captain looks at his beard. "Now Stinkbeard." (Squawks.) "It IS catchy." A breathing exercise through the beard: IT STILL STINKS. "Root-deep." It comes back, harder, at the end. |
| The saddest salvage | Eight glints round the rim: 27 gold coins, a few silver, four emeralds, a ruby, half a necklace, a cracked goblet, a bent spoon, six pearls, a suspicious brass button. Everything smells like him (`crimson_salvage_contamination` = `grand_stenchmaster_direct_blast`, a story state, not a price). "Second-layer bouquet." "Bad gold." |
| The Bling Bling King | The megalodon, lifted out of the lagoon by the storm, comes up under the Revenge in the Crimson King's Crown, a gold chain like a hawser and a diamond pendant reading BLING BLING KING (`megalodon_alias`, `megalodon_bling_chain`). In person it never says a word. |
| Participation prizes | A plastic coin (TREASURE IS ABOUT THE JOURNEY! / NO CASH VALUE), then tokens, a ribbon, a trophy, a certificate, seafood rubbish: a small, capped stream of mockery, scripted or rare. Kept in the Participation Trash logbook. |
| Beans | Jim's pantry is beans. The casks are Frog Grog. CRYING BEANS and SPICY STENCH SAUCE come from the same sketchy store as the sash. Jim refuses GRAND STENCHMASTER'S GRAND GALLEY GRAND CHEF. Garrick puts the whole can in. |
| Shark catering | The sharks order luxury seafood, delivered by a catering company to a barge on the storm, and pay with the captain's crown. Then they throw the rubbish on his deck. |
| Nowhere to sleep | A sauce vat vents: the barracks are out. Rusty Tom tests the old quarters, still condemned ("That release moved in"). The hands sleep on deck under the spare sail, the rest in the galley on bean sacks, the Grand Stenchmaster's hammock over the captain ("YOU DO NOT OUTRANK ME." "Physically."). |
| Brogath the Bashful | Garrick's bedtime story, first mentioned here, never verified. A shy Grand Stenchmaster, a treasure, three minutes of digging, a blast, rich sharks, the biggest one crowned; lesson: ALWAYS HIRE A GRAND SHARKMASTER. "That happened to US." "An ancient prophecy." "He invented him five minutes ago." In Garrick's Alleged Stenchmaster Legends: Evidence None, Reliability Highly Questionable, updatable. |
| Rumpold Windbreaker the Resolute | Faced a tornado rear-first, waited for the eye, met wind with wind; the funnel collapsed. Afterwards everything reeked "fifty times worse... approximately fifty-three", Garrick says. Alleged; the number is his claim. |
| The plan | The captain reads the Rumpold chapter at night, writes ORIENTATION: GARRICK REAR TOWARD VORTEX (Squawks makes the belly bigger), eleven steps to RECOVER DIGNITY ("Dignity hardest") and the fifty-three clause, then STILL CONSIDERING IT. |
| Sash holders | The sash must not flutter. The captain exempts himself; Pete exempts himself with fake duties; Garrick sees through it; the crew revel. Lots: Rusty Tom (left) and Barnacle Bill (right) (`sash_holder_left`, `sash_holder_right`). |
| The Grand Feast | Crying Beans, Garrick-Approved Baked Beans, Burnt Beans, a Bean Smoothie (a blender with a fork in it) and the sauce ceremony; plated formally; eaten in one bite. Charged: deep rumbles, gloooorp. |
| The one time | The approach under fire; Pete's report ("Many sharks." "They look angry." "Excellent."). THIS IS THE ONE TIME. He runs to the bow; three arguments; the Certificate of Grand Cowardice lands on him and the sash flutters; that gets him back. |
| The wrong way | Alignment, then "...nope." He bolts for the bow and fires into the ocean ("NOT INTO THE OCEAN!"). Garrick's guess: maybe five hundred times worse. The sea erupts brown and green (BEANS); `great_sharkstorm_sea_contamination`, local, with no number stored. The reaction drives the Revenge stern-first into the storm ("When ye phrase it like that..." "THERE IS NO BETTER WAY TO PHRASE IT."). |
| Inside | Lifted, going round. WELCOME TO THE BLING BLING EXPRESS! (They had those READY.) He feels FANTASTIC. NO AFTERSHOCKS. He saves the television. No signal; a can of Spicy Stench Sauce on the aerial works (`ses_mark2_antenna` = `spicy_stench_sauce_can`). "I hate that it worked." |
| The impossible audit | The Frog Tax Man audits a rotating weather system, live. The Bling Bling King comes on and speaks, smooth, citing the Ancient Stenchmaster Transfer Doctrine (Fart It, Lose It, Chapter Forty-Seven, see: Brogath). "THAT'S MADE UP!" It pays its tax with the captain's second-best crown, PAID. Then: Bling Bling King Treasure Solutions. Nobody explains any of it. |
| The end | The captain's breakdown; a breath through the beard; the Grand Nap proposed, and for once postponed. GOOD NIGHT, FART MAN! THANKS FOR THE RIDE! The Revenge is still inside the storm. |

## Chapter flow

Each chapter's quest objectives say where to go and who to talk to.

- **71 Not Pete's Fault** (Crownskull Isle, the crater). Talk to Pete. Pete, the captain, Blackbeard.
- **72 The Saddest Salvage.** Search four glints, ask Garrick, search four more, give Gristle the haul. The storm lifts the megalodon out of the lagoon.
- **73 Wealthy Sharks.** Down the trail: a pearl-necked shark over the statue, a belt and a chained great white over the broken tooth, a shark landing at the ford, the tiara on the trail, stolen back. Row home (the boats wait until the trail is done).
- **74 The Participation Prize** (the deck). The Bling Bling King; the coin.
- **75 The Least Celebratory Celebration** (the hold). Jim's pantry; the casks.
- **76 The Grand Galley Grand Chef** (the galley). The can, the pot, the sauce, stopping him (four timing games).
- **77 Shark Catering** (the deck). The catering, the rubbish; sweep the three heaps. Something goes off below.
- **78 That Release Moved In** (the hold, then the galley). The vented vat; where everyone sleeps; Rusty Tom's test at the boarded door.
- **79 Shark Suites** (the deck). Ned's barge; catch the pillows (one comes down).
- **80 Bad Hotel** (the galley). Bean-sack beds, Squawks' basket, the captain's spot, the hammock.
- **81 Bedtime Television.** The Frog Tax Man's sleep deductions; the lamp.
- **82 Brogath the Bashful.** The story.
- **83 Sweet Dreams.** Three tokens down the hatch; the ribbon; a word with the storm at the stern.
- **84 Meet Wind with Wind** (back below). Rumpold; the fantasy; "Unfortunately..."
- **85 Fart Man.** The trophy.
- **86 Fart Literature.** The book; five phrases at the long table; the plan.
- **87 The Counter-Sharkstorm Initiative** (the deck). The briefing; six alternatives (Ned, Bob, Jim, Gristle, Hale, Pete); decide.
- **88 Sash Holders.** Garrick's condition; Pete's duties; lots.
- **89 The Grand Feast** (the galley and the hold). Five parts in any order, plate, serve.
- **90 The Approach** (the deck, the galley). Sheets, cargo, ropes, the helm, the galley, the holders, then Pete's report.
- **91 The One Time.** The stern; the bow; three arguments; the award.
- **92 The Wrong Way.** The helm; the blast; HOLD ON; Squawks; the hatch (locked until he's safe).
- **93 Inside the Spout** (the galley). The aerial (a knob panel: three tries, then the sauce can).
- **94 The Impossible Audit.** Watch it.
- **95 I Used to Be Blackbeard.** Breathe.

The captain's reaction choices (the lamp, the questionable garlic, rowing now or later, the
research menu) converge. What doesn't branch: the treasure stays in the storm, the crown
stays on the Bling Bling King, he fires the wrong way, and the Revenge goes in.

## Systems added (reusable)

**Content load order**

- **Where:** `src/content/ContentDB.js` (`byPath`).
- **Notes:** Files load in numeric-aware path order, so `phase10` loads after `phase9` (it used to sort before `phase2`). A later phase's map patches, NPC and character extensions and logbook extensions therefore go on top of the earlier ones, as intended.

**Backdrops by story state (`backgroundVariants`) and the storm's wall**

- **Where:** a map's (or patch's) `backgroundVariants`; `paintStormSky` in `src/art/effects/effects.js`.
- **Notes:** `{ "if": <condition>, "background": "<id>" }`, first match wins, live. `stormsky` is a scrolling wall of cloud and spray for a ship that's inside the storm.

**Prizes from the sky, and a gentle drift (storm `tokens`, `sway`, `flying.swirl`)**

- **Where:** `src/world/SharkstormLayer.js`; the `token` and `clearTokens` script commands.
- **Notes:** `tokens: { frames, maps, every, max, sfx }` drops decorative tokens now and then (never in a scene, never more than `max` lying about, validated 1 to 8, at least 3 s apart). `sway: { maps, drift, period }` drifts the camera a few pixels (validated to 3 px or less, scaled by the shake setting). `flying.swirl` sends the passing sharks across at a slant.

**More than one knob panel per television**

- **Where:** a set's `knobPanels`; the `tv` command's `panel`; `src/ui/TvView.js`.
- **Notes:** A knob can turn up only `after` N other tries, and a `glimpse` knob shows a few frames of something else and lets go. The aerial panel ends on the sauce can. A set's condition (state) can carry its own `frames`, `frameMs` and `osd`.

**Logbook extensions**

- **Where:** `ContentDB.extendLog`.
- **Notes:** A record with `"extend": "<logbook>"` adds `entries` (an existing id puts its `variants` first) and may add `severities`. Entries are never removed, so a later phase can update Brogath without deleting him.

**Timing-bar kinds**

- **Where:** `src/systems/repairKinds.js` (moved out of `OverlayScene.js`).
- **Notes:** Eleven new kinds: `can`, `stir`, `shake`, `scorch`, `crank`, `plate`, `grab`, `sweep`, `trim`, `buckle`, `grip`. The validator checks every kind a script names and that each kind's three sounds exist.

**Presets that take an item back**

- **Where:** `src/debug/presets.js`, `"takeItems"`.
- **Notes:** Gristle's tally folds Phase 9's Reeking Doubloons into the Crater Salvage; a preset after that point removes them.

**Looks, particles**

- **Looks:** an appearance can tweak its build (`buildTweak`); painter extras `charged` and `sashTaut`. Garrick charged, Garrick with the sash held taut, Rusty Tom, Barnacle Bill.
- **Particles:** `beans` and `confetti` bursts.

**Save v10**

- **Where:** `src/config/constants.js`, `src/systems/save/migrations.js`.
- **Notes:** A 9 to 10 migration re-runs the Grumblegut rename over flags and story values and fills missing maps. Phase 10's facts are ordinary flags and values, so a save made inside the storm loads inside the storm.

**Testing aids**

- The headless story harness (`tests/storyHarness.js`) now fails when a scene turns, poses, emotes, hops, barks or bursts at someone who isn't in the room (the game throws); when an objective's object has someone standing on it whose dialogue doesn't start the same scene (the game talks to them first: Squawks in his basket, Garrick in his hammock now say the same scenes); and when the captain arrives on someone's placed tile (chapter 87's muster used to land on Bob). It understands named knob panels.
- `tests/laterPhases.js`: older phases' brief tests read shared logbooks and programmes without the entries a later phase unlocks.

## Where things live

| What | Where |
| --- | --- |
| Chapter scripts | `data/story/cutscenes/phase10/ch71_77.json`, `ch78_83.json`, `ch84_88.json`, `ch89_92.json`, `ch93_95.json`, `world.json` (the boats, the board, the galley bed and hammock, the lamp, the Mark II, the vats, the pantry, the rail inside the storm, the locked hatch) |
| Crew dialogue per stage | `data/dialogue/phase10/crew.json`; selectors, Rusty Tom and Barnacle Bill in `data/npcs/phase10_crew.json`; the captain's looks in `data/characters/phase10.json` |
| Maps | `data/maps/island/phase10/crownskull_isle.patch.json`; `data/maps/ship/phase10/main_deck.patch.json`, `galley.patch.json`, `cargo_hold.patch.json` |
| Quests, flags, triggers | `data/quests/phase10.json`, `data/story/flags/phase10.json`, `data/story/triggers/phase10.json` |
| The episodes | `data/tv/programs/frog_tax_man.json`: `the_sleep_deductions`, `the_storm_audit`; the speaker `bling_king_tv` |
| The Mark II | `data/tv/ses_mk2.json`: the `antenna` panel, `storm_static`, `sauce_antenna` |
| The storm | `data/hazards/sharkstorm.json` (four new states) |
| Logbooks | `data/logs/phase10.json`: Garrick's Alleged Stenchmaster Legends, the Bling Bling King's Participation Trash, the Captain's Journal (extended) |
| Items | `data/items/phase10.json`: Crater Salvage, Participation Coin, Grand Award Ribbon, Garrick's Book, Counter-Storm Plan |
| Vistas | `data/story/vistas/phase10.json`: `row_back`, `bbk_reveal`, `shark_catering`, `shark_suites`, `galley_watch`, `galley_legend`, `fantasy`, `wrong_way`, `inside_spout`, `galley_storm_watch`, `glory_days` |
| Art | `src/art/vista/vistaPhase10.js`, `src/art/stage/stagePhase10.js`, `src/art/inserts/phase10Inserts.js`, `src/art/props/phase10Props.js`, `src/art/effects/phase10Fx.js` |
| Music and SFX | `data/audio/music/bling_bling_king.json`, `charge_rising.json`, `counter_plan.json`, `galley_beans.json`, `inside_the_storm.json`, `legend_ballad.json`; `data/audio/sfx_phase10.json` (49 effects); `data/audio/ambience_phase10.json` (storm trailing, the galley at night, inside the storm on deck and below) |
| Presets | `data/debug/presets.json` (45, `p10_start` to `p10_complete`) |

## Persistent state after the phase

**The Queen Anne's Revenge** is inside the Great Sharkstorm, going round
(`queen_annes_revenge_location` = `inside_great_sharkstorm`, `great_sharkstorm_ship_captured`).
Battered; everyone is below in the galley. The barracks are sauced; the old quarters are
condemned (`crew_quarters_state` = `condemned_reconfirmed`).

**The Great Sharkstorm** is `inside_ship`: active, not destroyed, treasure-laden, full of
wealthy sharks. The local sea under it is contaminated (`local_sea_state` = `contaminated`);
no multiplier is stored anywhere.

**The Bling Bling King** is alive, with the Crimson King's Crown, the chain and the pendant.
It has never spoken in person. It paid its tax with the captain's second-best crown
(`bbk_tax_status`).

**The fortune** is mostly unrecovered (`crimson_fortune_recovered_percent` = 3, contaminated).

**The crew.** Garrick is no longer charged, feels excellent, is still the Grand Stenchmaster
and refuses "fart man". Rusty Tom and Barnacle Bill are alive and are the sash holders. Pete
is still an unwilling Grand Sharkmaster, and used fake duties. Brogath and Rumpold are
alleged (`brogath_status`, `rumpold_status`). The Mark II works on a sauce can. The audit
broadcast is unexplained. The captain is furious and misses being Blackbeard. Squawks is
bald, sarcastic and beside him.

**Left for later:** INSIDE THE GREAT SHARKSTORM (get out; deal with the Bling Bling King) is
open, and nothing in the game can finish it.

## Testing it

**Presets.** Use the debug overlay's **Story** tab or `tools/play.mjs` `preset <id>`. Each
preset is the state recorded from a real headless walk at that beat, and each is played to
the end of the phase by `tests/phase10_story.test.js`. The mid-scene ones start their scene
part-way through (`p10c22.from_sea`, `p10c24.from_interview` and so on). The 45 presets:

Phase 10 Start, Grand Sharkmaster Blame Scene, Crater Salvage, Wealthy Shark Return Trail,
Back Aboard Ship, Bling Bling King Reveal, Participation Coin, Beans Pantry, Crying Beans
Dinner, Luxury Shark Seafood, Shark Leftovers, Sleeping Quarters Test, Luxury Bedding,
Galley Barracks, Brogath Alleged Legend, Bedtime Mockery, Rumpold Legend, Stinkbeard
Research, 53x Warning, Counter-Sharkstorm Briefing, Pete Bureaucracy Reversal, Sash Holder
Selection, Charging Feast Start, Bean Smoothie, One-Bite Feast, Garrick Fully Charged, Great
Sharkstorm Approach, Cowardice Crisis, Cowardice Award, Final Alignment, Wrong-Way Release,
Ocean Contamination, Fart Propulsion, Great Sharkstorm Entry, Inside Great Sharkstorm,
Galley Bunker, S.E.S. Signal Failure, Spicy Sauce Antenna, Frog Tax Man Storm Audit, Bling
Bling King TV Interview, Fake Transfer Doctrine, Bling Bling King Tax Payment, Bling Bling
King Commercial, Blackbeard Breakdown, Phase 10 Complete.

**Tests.**

- `tests/phase10_story.test.js` plays the phase headlessly (`tests/phase10Play.js`) with the first and the last option at every choice, then checks the canonical end state, the big lines exactly once, the Bling Bling King silent in person, every preset to the end, the staging of every scene, the brief scan and the start from a Phase 9 save.
- `tests/phase10.test.js` covers the load order, logbook extensions, `takeItems`, the four storm states (capped prizes, marked landings, the drift), the Mark II's panel and conditions, the Frog Tax Man episodes, the timing games, saves (9 to 10, every checkpoint round-trips), the logbooks, and the art and sound.
- `e2e/phase10.spec.js` plays it in a browser: the whole phase from the end of Phase 9, and from the approach; the wrong-way entry (the hatch locked until Squawks is safe); the aerial; every preset loads cleanly.
