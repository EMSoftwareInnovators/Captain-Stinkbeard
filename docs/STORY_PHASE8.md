# Story Phase 8: The Lost Fart and the Grand Nap

The seventh canonical story chapter. It picks up where Phase 7 stopped: the crew in the
cargo hold, the Great Sharkstorm on the roof, Franklin on the S.E.S. Mark II.

Nobody can go up on deck, so the hold becomes everything at once: a Sharkstorm bunker,
a television lounge, a dining room, a parrot ward, crew quarters, a storeroom and the
Grand Stenchmaster's ceremonial area. Garrick's stomach rumbles and he doesn't know
what it means. That turns out to be worse than yes. Nobody will hold his sash, so he
invents an adventure game about it (THE GRAND EXPEDITION FOR THE LOST FART), and the
captain snaps. The old sleeping quarters turn out to be uninhabitable for good, so the
hold becomes the barracks by Grand Decree. Then there is a bedtime story. Garrick
sleeps in full ceremonial attire, directly above the captain. The crown falls on the
captain in the night. The sash comes down into his face, and Garrick, talking in his
sleep, reveals where he got it: a sketchy discount shop, last week, seventy per cent
off, cash only, no refunds, no receipt.

The phase starts at the crate next to Squawks, after Phase 7 ("Get some sleep, sitting
up"). It ends at three in the morning: nobody has slept, the frog is on, and the crew are
more worried about Franklin's capital gains than about the storm. Phase 9 is not started.

About 45 to 70 minutes of play:

- 13 chapters (42 to 54) and 9 quests.
- 78 story flags.
- About 1,000 spoken lines and 340 lines of narration. Every crew member has something to say at all ten stages of the night.
- Mostly dialogue and the room itself. There is no new battle and no Sharkstorm fight: the storm is what keeps everyone in.

## Continuity

**The storm eases. It does not end.** The saved value `great_sharkstorm` moves from
`active_near_ship` to `easing_near_ship` in chapter 48. Landings come further apart and
the crew have learned to price them by the sound ("Expensive-big"). It is not resolved
and nobody goes on deck. Squawks asks about the rowboat; the answer is no ("Bad
planning.").

**The Dead Center moves on.** At chapter 48 it goes up through the fore hatch onto the
forward deck (`dead_center` = `second_forward_deck`). The old sleeping quarters are
condemned anyway, and that is a separate thing: what the second release left behind is
embedded in the boards for good (`crew_quarters_condemned`).

**No new major release.** Garrick's stomach is a story value, `garrick_release`, which
is only ever `calm`, `rumbling`, `false_alarm`, `possibly_building` or `unknown`. It
drives the rumbles, the crew's nerves and the dialogue. Nothing is released. The final
GLOOOORP is "Lost Fart..." "NO ADVENTURE." and then nothing.

**Garrick is Garrick.** He is **Garrick Guzzlegut**, as in every earlier phase. The
Phase 8 brief called him "Grumblegut" but said to follow the repository's established
name, so the repository's name stands. The suit keeps its burgundy, mustard and bilious
palette, torn and singed and now saturated. He is the Grand Stenchmaster and nothing
else.

**Squawks** is alive and bald. He laughs for the first time in weeks ("Tax frog
funny."), and ends the phase in his own cradle beside the captain's bunk.

## Canon this phase adds

| Canon | How it shows in the game |
| --- | --- |
| Trapped below with Franklin | The crew settle in: Pete on a bucket, Bob under the leaking grog, Gristle under a pulley ("Forty-one."), Jim guarding the biscuits. Then a new Frog Tax Man episode, `the_audit`: the Auditor, four hundred flies as OFFICE REFRESHMENTS, networking expenses ("With the flies?"), receipts on leaves, tadpole subcontractors. Squawks laughs. GLOOOORP. GRRRRRNNNK. Every head turns. |
| Does the Grand Stenchmaster need to blow? | "...I don't know." "That's worse than yes." "Oh." "Ohhhh." Full emergency: Squawks into the coat, everyone to the stairs, nobody opens the hatch. "...False alarm." "Sometimes the fart is sneaky." "Gas, Garrick, is not planning an ambush." The rowboat: "Bad planning." (`garrick_possible_release_survived`) |
| Sash bearers | Two pirates to hold the sash during a major event, "ceremonially". Ask the crew: nobody volunteers. "I'd rather hold a shark." "I'd rather hold two." "I'd rather hold the Great Sharkstorm." "Tradition starts somewhere." "...It might get wrinkled." The name that sticks: FART SASH (`fart_sash_nickname`). He corrects it every time. |
| Professor Barnacle Bob | The costume trunk; a dented cork sun-helmet and a scarf on Bob (`p8_professor_bob`, look `bob_explorer`). He wants no part of it. |
| The Grand Crown | `grand_crown_created`. Fake gold points, bottle caps, painted onions, fake jewels, Jim's forks and spoons, the bilge pump's handle and a little saucepan on top. The crest is a stink-cloud over an onion, with two spoons crossed. There are no letters on it anywhere. |
| THE GRAND EXPEDITION FOR THE LOST FART | `lost_fart_game_proposed`. The Temple of the Grand Stenchmaster ("Your stomach.") in the Lost Realm of Reekhollow. "Lore does not make it better." The landmarks are all in the room: the grog casks (the Chamber of Frog Grog), Mark II (the Electric Frog Oracle, which says "Disallowed."), a damp patch by the pump (the Bottomless Ravine). |
| The captain snaps | He hands Squawks to Gristle first ("Stinkbeard angry." "Very."). The ship, the crew, the bald parrot, the storm, and he wants them to hold his FART SASH. "STENCHMASTER SASH." Its NOBLE HISTORY is three glorious weeks (a parade, a ceremony, television duty), and every item gets "Fart sash." (`p8_captain_snapped`) |
| The Grand Nap | Garrick yawns. Restorative rest, digestive authority, ancient tradition (this afternoon). The fart blanket; everybody says it, even Squawks. Then the biggest rumble of the day: "Was that the Lost Fart?" "...Maybe." The nap is banned. |
| The sleeping quarters are lost | The storm eases and the Center moves on, so everyone goes to reclaim their hammocks. Garrick is embarrassed in front of the door. Pete opens it a crack: "The fart took residence." "How long?" "...Centuries." Garrick's sign says CONDEMNED / GRAND STENCHMASTER ATMOSPHERIC EVENT / ENTER AT OWN RISK. The captain corrects it to DO NOT ENTER and nails it up (`crew_quarters_condemned`). |
| The Grand Decree | From a crate: the lower hull is the barracks now; everyone builds a bed; the highest hammock is his ("Rank." "Altitude."); quiet hours begin after the GRAND BEDTIME STORY ("You'll see."). |
| The barracks | You sling the hammocks, hang a sailcloth screen, clear the floor, make Squawks a cradle ("Good spot.") and help with four bunks: Pete's rope pillow, Bob's cargo net, Gristle's belts ("Don't ask whose belts."), Jim's padlocked pantry. Over the captain's bunk is a hammock the size of a mainsail. "Still uncertain!" "Move captain." "Where?" "Bad options." (`lower_hull_barracks`, `garrick_top_hammock`, `squawks_sleep_spot`) |
| The Grand Bedtime Story | Told from a blank ledger ("Imagination."). Seven chambers: the Hall of Garlic Breath ("That's just the galley after you've eaten."), the Pit of Frog Grog ("We live next to that."), the Electric Frog Oracle (Mark II interrupts on cue), the Corridor of a Thousand Forecasts ("Did any of them work?" "No."), the Bridge of the Sacred Sash, the Throne of Eternal Seat Warming ("WITH DESTINY."), the Vault of the Lost Fart and the Golden Bottle of Wind. Then Sir Garrick the First ("That's still you."), the forbidden cheese ("Expired cheese." "FORBIDDEN."), the feats ("Impossible."), Professor Barnacle Bob, a giant rolling onion ("The onion's quite good, actually."), a label nobody read, very committed sharks and emotional support. The moral: ALWAYS HOLD THE SASH. "It's historical education." (`lost_fart_legend_told`) |
| The outfit stays on | GRAND NAP PROTOCOL: the continuity of office. The Suit is saturated, and goes FWOoF when he moves. "The suit exhaled." "Stench retention." "Fabric contamination." He isn't even farting, and the captain is still being farted upon. "Bad bunk." |
| The Grand Crown falls | It comes down in the night in pieces: a fork through the canvas an inch from the captain's ear, another into the pillow, a spoon off his nose (BOING), the saucepan in his lap. Nobody is hurt. "GRAND. STENCHMASTER. CUTLERY." The crown is banned from the hammock and goes into a crate (`grand_crown_banned_for_sleep`). He may still wear it awake. |
| The sash descends | It slips down into the captain's face and smells of both releases, garlic, grog, onion, the Suit and something cheap off a roll. Garrick talks in his sleep: don't wrinkle; it smells horrible; somebody hold it; "...not... fart sash..." ("He can argue unconscious."); a good deal; discount; a sketchy store; BOUGHT IT LAST WEEK; seventy percent off; the discount bin; cash only; the shop smelled funny; no refunds. |
| Seventy per cent off | The captain wakes Pete, Gristle and Bob with the evidence. "LAST WEEK?" "Where?" "...sketchy discount store..." "HE CONFIRMS IT!" "He said CENTURIES." "He made us play the Lost Fart nonsense over it." "Twice." The tag (WAS 10, NOW 3, FINAL SALE). "...no... receipt..." One last FWOoF. "...best purchase..." "Bad bunk." "Aye." GLOOOORP. "...Lost... Fart..." "DO NOT EVEN THINK ABOUT IT." "...adventure..." "NO. ADVENTURE." (`sash_origin_revealed`) |
| Nobody sleeps | At three in the morning somebody turns the frog on: `capital_gains`. Franklin sold a lily pad for more than he paid. "What was your basis?" "My what?" "...I ate the records." The hold GASPS. Pete worries about the records, Gristle thinks the basis can be rebuilt, Bob thinks the Auditor is too hard on him, Squawks likes the frog, and the captain isn't watching (he is). (`crew_ftm_invested`, `p8_complete`) |
| The lower hull is home | It's terrible down here, and it's home now. |

**What the sash is, and isn't.** This particular sash is cheap modern junk, bought last
week. As far as anyone on board knows, Garrick made up every Stenchmaster tradition. The
phase does *not* conclude that no ancient Stenchmasters ever existed. The Stench Log
records the Lost Fart material (the temple, the Golden Bottle of Wind, Sir Garrick the
First, the ancient Grand Nap, the sash bridge, the Oracle, the Lost Fart) under **GARRICK'S
CLAIMS**, not as history. None of it is an item, a character or a place in the game. The
sash entry has both origins:

> CLAIMED ORIGIN: ancient ceremonial relic. ACTUAL KNOWN ORIGIN: a sketchy discount shop.
> Purchased last week. Seventy per cent off. Cash only. No refunds. … Captain's note: FART
> SASH. Grand Stenchmaster's correction: STENCHMASTER SASH.

**Originality and scope rules**

- **The adventure is original.** It is THE GRAND EXPEDITION FOR THE LOST FART, in the Lost Realm of Reekhollow. It uses no film titles, no borrowed hero, no fedora, no whip, no idol and no boulder (the boulder is an onion). Bob's hat is a dented cork sun-helmet. The adventure cue is an original pulp-serial parody that lands on the wrong chord.
- **Garrick stays original.** No borrowed names or catchphrases. The crown carries no letter or emblem: its crest is a stink-cloud, an onion and two spoons.
- **No Phase 9 material.** No genuine ancient Stenchmasters or lore made true, no Brogath, no Stenchmaster court, no treasure island. The storm is not resolved and there is no new major release.

`tests/phase8_story.test.js` scans every Phase 8 file, data and art, for borrowed names and
later-phase material. It checks that the Golden Bottle of Wind, the Lost Fart and Sir
Garrick the First are not items or characters, and that no trigger fires after `p8_complete`.

## Chapter flow

Chapters are chained by scripts and story flags. The time of day uses `p4_tod`, with new
values: afternoon below decks (12), lamplight (13) and the dead of night (14).

**42 · Trapped Below Deck with Franklin**

- **Starts when:** the crate next to Squawks, after `p7_complete`.
- **Quest:** Still Trapped.
- **What happens:** Settle in with Pete, Bob, Gristle and Jim; sit in your corner; the audit; "Tax frog funny."; GLOOOORP.

**43 · Does the Grand Stenchmaster Need to Blow?**

- **Starts when:** every head turns.
- **Quest:** False Alarm.
- **What happens:** Ask him; protect Squawks; the stairs; the false alarm; the sneaky fart; no rowboat.

**44 · Request for Sash Bearers**

- **Starts when:** the false alarm.
- **Quest:** Sash Bearers.
- **What happens:** The proposal; ask five of the crew (any five, nobody says yes); WRINKLED; FART SASH.

**45 · The Grand Expedition for the Lost Fart**

- **Starts when:** the nickname.
- **Quest:** The Lost Fart Expedition.
- **What happens:** The costume trunk (Professor Barnacle Bob); the Grand Crown (a close-up); the premise.

**46 · The Legend of the Lost Fart**

- **Starts when:** the premise.
- **What happens:** The three landmarks, all in this room; hand Squawks to Gristle; the captain snaps.

**47 · The Grand Stenchmaster's Grand Nap**

- **Starts when:** the snap.
- **What happens:** The yawn; the nap; take Squawks back; the fart blanket; the big rumble; the nap is banned.

**48 · The Sleeping Quarters Are Lost**

- **Starts when:** the ban.
- **Quest:** No Place to Sleep.
- **What happens:** The storm eases and the Center moves on; up to the galley; Garrick at the door; Pete cracks it (a vista); "Centuries."; nail up the sign (a timing bar); back down.

**49 · The Grand Decree**

- **Starts when:** you go back down to the hold.
- **What happens:** Garrick on a crate: the four decrees.

**50 · Build the New Barracks**

- **Starts when:** the decree.
- **Quest:** The Grand Decree.
- **What happens:** Hammocks, the sailcloth and the clutter (timing bars); Squawks's cradle; four bunks; your bunk, and what's over it.

**51 · The Grand Bedtime Story**

- **Starts when:** your bunk.
- **Quest:** Bedtime Story.
- **What happens:** Lights out; get into your bunk; the legend (a vista of Garrick's crayon pictures, 17 of them); the moral.

**52 · The Outfit Must Stay On**

- **Starts when:** the moral.
- **Quest:** The Grand Nap.
- **What happens:** Grand Nap protocol; FWOoF; he climbs in; the view from the captain's pillow; a comfort choice (every choice ends the same way); "Bad bunk."

**53 · The Grand Crown Falls**

- **Starts when:** "Bad bunk."
- **What happens:** The crown comes down in pieces (a vista); CUTLERY; the ban; put the crown in the crate; back to bed.

**54 · The Sash Descends**

- **Starts when:** you're back in bed.
- **Quest:** Seventy Percent Off.
- **What happens:** The sash; the smell; the sleep-talk; wake Pete, Gristle and Bob; the evidence and the tag; NO ADVENTURE; nobody sleeps; capital gains at three in the morning.

The captain's reaction choices (Furious, Sarcastic, Exhausted, Threatening and Resigned)
come up at the question in chapter 43, the verdict in chapter 44, "Centuries", the
sharks and the moral in the story, the crown ban and "no receipt". They all converge.
What doesn't branch: nobody holds the sash, the quarters are condemned, the hold becomes
the barracks, Garrick sleeps above the captain, the crown falls and the sash's origin
comes out.

## Systems added (reusable)

**Map display names that change with the story**

- **Where:** `nameVariants` in a map or patch; `src/maps/mapName.js`.
- **Notes:** `[{ if, name }]`; the first match wins and later patches come first. The location title and the save menu use it, which is how the hold becomes "Lower Hull" and then "Lower Hull Barracks". The validator checks each entry has an `if` and a name.

**Odour trails on any actor, with their own puff and sound**

- **Where:** `odorTrail` ambient (`src/world/Ambient.js`); FxPool `suitpuff`.
- **Notes:** New fields `fx` (any particle burst), `sfx`, `volume` and `count`. With `whenMoving`, it puffs only when the actor changes tile or facing, plus `idleEvery` for a puff now and then while still. It is always a single small burst, rate-limited by `every`, so it stays bounded (tested with a fake scene). The Suit's FWOoF uses it.

**A sleeping face and a dozing pose**

- **Where:** `portraitPainter.js`, `characterPainter.js`, `NpcBrain.js`.
- **Notes:** The `asleep` expression (eyes shut, mouth open, zzz) and the `doze` field pose (sitting, head down). A sitting NPC with `pose: "doze"` holds it.

**Hats**

- **Where:** `hats.js`, `portraitPainter.js`.
- **Notes:** `grandcrown` (fake gold points, jewels, cutlery, a little pan) and `explorer` (a dented sun-helmet).

**Timing-bar variants**

- **Where:** `OverlayScene.js`.
- **Notes:** `nail` (NAIL IT UP) and `hang` (HANG IT).

**Storm state**

- **Where:** `data/hazards/sharkstorm.json`.
- **Notes:** `easing_near_ship`: still near, lower intensity, longer gaps between passes and landings.

**Save v8**

- **Where:** `src/config/constants.js`, `src/systems/save/migrations.js`.
- **Notes:** A 7 to 8 migration that fills missing story flags, vars and values, world objects, visited rooms, counters and the inventory. It never removes anything. Phase 8's persistent facts are ordinary flags and values, so nothing else needs migrating.

## Where things live

| What | Where |
| --- | --- |
| Chapter scripts | `data/story/cutscenes/phase8/ch42_44.json`, `ch45_47.json`, `ch48_50.json`, `ch51.json`, `ch52_54.json`, `world.json` (the condemned door and what you can do from the doorway, the sign, the pump without its handle, the bunk with Garrick asleep over it, the crown crate, the cradle) |
| Crew dialogue per stage | `data/dialogue/phase8/crew.json`, selectors in `data/npcs/phase8_crew.json` (Garrick crowned, then his everyday look once the crown is in its crate; Bob in the helmet). Sleep-talk is the `garrick_asleep` speaker (`data/characters/speakers_phase8.json`) |
| Room changes | `data/maps/ship/phase8/*.patch.json`: the cargo hold (the day's clutter, the barracks, placements for ten story states, Mark II's noises, the stomach, the pulley, the drip, the snore, the Suit's puffs, the name), the galley (the crowd at the door, the locked and condemned door, the sign, a yellow haze), the crew quarters (permanent dense fumes) |
| Quests, flags, triggers | `data/quests/phase8.json`, `data/story/flags/phase8.json`, `data/story/triggers/phase8.json` (none) |
| The episodes | `data/tv/programs/frog_tax_man.json`: `the_audit` (after `p8_started`) and `capital_gains` (after `p8_complete`); the Auditor in `data/characters/speakers_phase8.json` |
| The storm | `data/hazards/sharkstorm.json` (`easing_near_ship`) |
| Stench Log entries | `data/logs/stench_log.json`: the false alarm, the sash (claimed and known origin), the crown (banned while sleeping), the Lost Fart (GARRICK'S CLAIMS), the quarters (condemned), the barracks, the Grand Nap |
| Vistas | `data/story/vistas/phase8.json`: `quarters_reveal`, `legend`, `bunk_night` (and Phase 7's `shelter_watch` for both episodes) |
| Art | `src/art/vista/vistaPhase8.js` (the Auditor's episodes, the quarters door and what's inside, the bunk at night: Garrick's hammock with and without the crown, the sash in three stages, the crown's pieces, the captain's face, Squawks in his cradle, a suit puff), `src/art/vista/vistaLegend.js` (the bedtime story in Garrick's crayon), `src/art/props/phase8Props.js`, `src/art/inserts/phase8Inserts.js` (the Grand Crown, the condemned sign, the sash's tag) |
| Music and SFX | `data/audio/music/lower_hull.json` (a cramped, weary shelter theme), `lost_fart_adventure.json` (the adventure cue); `data/audio/sfx_phase8.json` (21 effects: stomachs, the false-alarm sting, crew panic, crown and cutlery, hammocks, the FWOoF, the sash, the snore, sleep-talk, Mark II's tik and ZZZT); `data/audio/ambience_phase8.json` (the lower hull, the barracks at night) |
| Looks | `data/appearances/phase8.json`, `data/portraits/phase8.json` (`garrick_stenchmaster_crowned`, `garrick_grand_nap`, `bob_explorer`) |
| Presets | `data/debug/presets.json` (18, `p8_start` to `p8_complete`) |

## Persistent state after the phase

**The storm and the Center**

- The Great Sharkstorm is `easing_near_ship`: still overhead, with landings further apart.
- The Dead Center is on the forward deck (`second_forward_deck`).

**The old sleeping quarters**

- Condemned for good. The galley door is locked with the sign and boards on it, and a yellow haze leaks underneath.
- From the doorway you can look through the crack, smell it, think about your boots, or leave it.
- Nobody goes in.

**The Lower Hull Barracks**

- Crew hammocks, a cargo net, a belt contraption and Jim's pantry.
- The captain's bunk, with Squawks's cradle beside it and the Grand Stenchmaster's hammock above it.
- Mark II, the grog reserve and Garrick's rug, chair and costume trunk.
- It is the crew's common room now. The map is called Lower Hull Barracks.

**Garrick**

- Asleep in the top hammock, bareheaded, sash tucked back under his arm. He talks in his sleep if you look.
- The Grand Crown is in its crate (NOT IN THE HAMMOCK). He may wear it when he's awake.
- He still insists it's the STENCHMASTER SASH.

**The crew**

- Nobody has slept. Everyone has opinions about Franklin's basis.

## Testing it

**Presets.** Use the debug overlay's **Story** tab or `tools/play.mjs` `preset <id>`. Each
preset is played to the end of the phase by `tests/phase8_story.test.js`. Four of them start
inside their scene (`script`). The 18 presets are:

- Phase 8 Start
- Lower Hull Shelter
- Garrick Rumbling
- False Alarm
- Sash Bearer Request
- Lost Fart Expedition
- Grand Crown Reveal
- Stinkbeard Fury
- Sleeping Quarters Condemned
- Lower Hull Barracks
- Barracks Complete
- Bedtime Story
- Grand Nap Start (runs chapter 52)
- Suit Fume Bunk (runs the bunk scene)
- Crown Fall (runs chapter 53)
- Sash Descends (runs chapter 54)
- Discount Store Reveal
- Phase 8 Complete

**Tests.**

- `tests/phase8_story.test.js` plays the phase headlessly with the first and with the last option at every choice. It checks:
  - the canonical end state: the storm easing, the Center moved, the door locked, the quarters dense, the hold renamed, `garrick_release` ending `unknown` with no new release flag, Garrick and Bob's looks, and the Stench Log;
  - that `garrick_release` stays in its five states after every step;
  - that every required line happens exactly once, and the sleep-talk confessions come in order;
  - every preset, the staging of every scene and the brief scan.
- `tests/phase8.test.js` covers:
  - the easing storm and the stomach's values;
  - that nothing in the night can hurt anyone;
  - the Suit's puffs, bounded (with a fake scene);
  - the hold's names and the nameVariants validation;
  - the barracks props and the condemned quarters;
  - saves: the 7 → 8 migration, and round-trips at every Phase 8 checkpoint;
  - the hats, faces, poses, vista frames, music and sound effects.
- `e2e/phase8.spec.js` plays it in a browser:
  - the whole phase from the end of Phase 7, and from Barracks Complete;
  - the discount-store reveal from its preset;
  - the barracks and the condemned door after the phase.
