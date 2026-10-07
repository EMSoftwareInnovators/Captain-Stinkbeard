# Story Phase 13: The Ancient Stenchmaster Delirium

The twelfth canonical story chapter, and the last one adapted so far. It picks up later the
same day as Phase 12, with Garrick suspended and about nineteen hours to go, and ends that
evening on deck in the **Brogath Command Crisis**: the captain, having breathed through his
own beard once too often, sees the Ancient Grand Stenchmasters of Garrick's legends in his
crew, believes Pete is Brogath, and has to hold the helm against him. The treasure room is
still sealed, the Great Sharkstorm is still going round, and nothing after that is invented.

It comes in four movements, adapted from the last part of the source:

1. **The sash and the quarters** (chapters 127 to 131). Garrick's loopholes (a tootlet; a non-Grand toot; a suspension-compliant toot, filed in advance, with a form; Finger-Puller-assisted pressure relief), all refused. The captain's wardrobe smells from the deck; the sash goes, nearly, into the trash, and the Mark II plays the Bling Bling King's hit, "Don't Throw My Sash in the Trash". The old sleeping quarters are reopened, and the bedding is growling. A pillow that roars like a kitten is thrown into the storm, and the storm throws it back, with a participation medal pinned through it. The bedding is judged, piled, condemned, stuffed into the linen locker and nailed shut (DO NOT OPEN. IT GROWLS.). New bedding: the Cheap-O-Rama toy sashes.
2. **The merchandise** (132 to 137). The flying machine brings a **Grand Stenchmaster Fan Mega-Pack**: merchandise, and five life-size cardboard Ancient Stenchmasters, which the player places where they like. At the bottom: a **Build-Your-Own S.E.S.** kit. The captain finds the parts not included (Jim's forks, the lucky horseshoe, a copper coil, the spare transformer), solders it up, and it gets snow; so a cable runs from the bedroom set over cardboard Brogath's shoulder, up the fore hatch, three times round a cannon and down to the Mark II's sauce can. The **Stenchmaster Channel**: Princess Stenchalina's three hours and forty-one minutes, and then the set starts to smell: **Stench-O-Vision**. The Brogath special: Poor in Gold, Rich in Gas.
3. **The limit and the beard** (138 to 141). The captain's enormous rant at everything in the room. Then a breath, deep, through the beard he took the wrap off that morning. Pete becomes Brogath. Gristle, Rumpold; Bob, Sir Rumpus; Jim, Lord Gustavio. Squawks: "BIRD. BIRD. I AM A BIRD." Garrick: the Grand Stenchmaster PRIME. Every sash in the room flutters at once. The captain sets out to disarm them: the beans, the Grog, the sauce, the fingers, the fabric, the Prime, the rear-first.
4. **The command crisis** (142 to 145). On deck, orders before the apocalypse (DO NOT FART AT IT; KEEP FINGER DOWN; NO SASH FLUTTER; REPORT STOMACH NOISES; ESPECIALLY BEANS). Cardboard Brogath by the helm, and Pete beside him: TWO BROGATHS. Pete leans on the wheel. Below, the treasure room growls: a third Brogath, about to blast the rest of the treasure away. The crew hold the captain back from the door; Pete works with the delusion ("as long as this door stays SHUT, he can't get out"). Back on deck, a challenge for command: three gusts at the helm, three campaign tokens (VOTE CAPTAIN BROGATH). Garrick, quietly, tells the truth about the growl. "But Pete is still Brogath." TONIGHT: THE GREAT BROGATH DEBATE (announced; never held).

The phase starts from the end of Phase 12: the galley says where (Garrick), once.

About 90 to 120 minutes of play:

- 19 chapters (127 to 145) and 18 quests with 48 objectives, all finished in the phase.
- 120 story flags.
- About 505 lines of dialogue and narration in the scripts, plus about 130 lines of crew dialogue across the stages.
- No new maps: the old crew quarters (closed since Phase 8) open up and change for good; the galley, the deck, the hold and the cabin change through map patches.
- No battles. The challenges are timing bars (knots, a throw, nails, a pry, solder, the helm in three gusts) and the Stench-O-Vision knobs.

## Continuity

**From Phase 12.** Garrick is suspended (`stenchmaster_suspension_active`, about nineteen
hours left at the start, nine at the end). The sash is in the captain's wardrobe, and stays
there. The Revenge is inside the Great Sharkstorm (`great_sharkstorm` ends at
`command_crisis`, still `inside`). The treasure room is sealed.

**The delirium is a way of seeing.** Everything that changes is presentation. Pete is Pete;
Brogath is not confirmed (`brogath_status` = `alleged_still_none`); no legend becomes true
because the captain believes it. Ids, quests, dialogue selectors, saves and the dialogue log
keep the real crew. The alias layer (below) follows a flag (`stinkbeard_delirium`), so a save
made in the delirium loads in it, and nothing about it is stored.

**The treasure room stays sealed.** DO NOT OPEN (Gristle), YES, SERIOUSLY (under it), BAD
CLOUD (Squawks' clawprint): Phase 13's door, from Phase 13 on. The captain never gets in;
the crew and Pete keep him out (`treasure_room_state` = `sealed_brogath_alleged`).

**Nothing after the source.** The phase ends at the command crisis. The suspension doesn't
end, the delirium isn't cured, the debate is only announced, nobody leaves the storm, and the
crown stays with the Bling Bling King. `tests/phase13_story.test.js` checks that no Phase 11
to 13 script sets any of those, and that no story trigger starts anything after
`p13_complete`.

## Canon this phase adds

| Canon | How it shows in the game |
| --- | --- |
| The loopholes | Five, refused by the captain, Pete, Jim, Gristle and Bob in turn (`loopholes_refused`). |
| Don't Throw My Sash in the Trash | The wardrobe, opened once; the song on the Mark II (`sash_trash_song_seen`); the sash stays put. Garrick adopts the catchphrase. |
| The quarters are alive | Reopened (`crew_quarters_reopened`), yellowed, growling: hammocks that grumble, a blanket that hrrrmphs, a kitten-roar pillow. Light fumes until the bedding is sealed. |
| The returned pillow | Over the port rail into the storm... and straight back, with a participation medal through it (`pillow_returned_with_tag`). Then again. |
| Condemned bedding | Six kinds judged, piled, thrown, sent back folded, stuffed into the linen locker, nailed shut: DO NOT OPEN. IT GROWLS. (`textiles_sealed`, `textile_closet_state` = `sealed_growls`). |
| Sash bedding | Hammocks, cot pads, pillows, blankets and corners in toy sashes (`sash_bedding_built`). |
| The Fan Mega-Pack | Pennants, crowns, HOLD MY SASH flags, a Bean Bailiff badge, and five cardboard Ancient Stenchmasters, each where the player puts them (story values `standee_*`). "It's a museum." "It's a gift shop." "It's my SHIP." "It's HOME." |
| The second S.E.S. | Parts not included; soldered; snow; a cable over cardboard Brogath ("historically load-bearing"), up the fore hatch, round the rope coil, three turns round the starboard cannon, down the main hatch, tacked across the galley floor, into the Mark II (`second_ses_built`, `tv_systems_connected`). |
| The Stenchmaster Channel | Channel 9 on both sets. Princess Stenchalina: a baby, an onion castle, a waft, a flutter, RUNTIME OF THE GRAND DISASTER 3:41:09. |
| Stench-O-Vision | The bedroom set's grille opens: the programme smells (`stench_o_vision_on`). A small, mild fume source in the existing system. The storm complains. The knobs shut it (`stench_o_vision_disabled`). |
| Poor in Gold, Rich in Gas | The Brogath special; sponsored by Cheap-O-Rama. |
| The limit | The rant at the standees, the bedding, the set, the locker and the Mega-Pack: cumulative, enormous. |
| The beard | One breath too deep through the beard. The world goes purple at the edges and wobbles (`stinkbeard_delirium`). |
| Everyone is here | Pete as BROGATH (?), Gristle as RUMPOLD (?), Bob as SIR RUMPUS (?), Jim as LORD GUSTAVIO (?), Squawks as PRINCESS STENCHALINA (?) ("BIRD."), Garrick as THE GRAND STENCHMASTER PRIME (?). Their real names and faces blink through. |
| The apocalypse | Every sash flutters at once. Disarm the room; then orders on deck. |
| Two Brogaths | Cardboard Brogath by the helm, and Pete. "ONE. BROGATH. And he's CARDBOARD." Pete touches the wheel (`pete_touched_helm`). |
| The third Brogath | The treasure-room growl. The crew hold the captain back; Pete plays along to keep the door shut (`treasure_room_brogath_believed`). |
| The command crisis | Three gusts held at the helm; campaign tokens: VOTE CAPTAIN BROGATH, STINKBEARD FOR CAPTAIN! (NO FUN!), HOLD MY SASH: A HOSTILE TAKEOVER. Garrick explains the growl: his own first-night fart. The purple lifts for a moment. "But Pete is still Brogath." The debate is announced for tonight (`brogath_command_crisis`, `p13_complete`). |

## Chapter flow

- **127 The Finger-Pulling Breakdown** (the galley). Hear his five loopholes.
- **128 Don't Throw My Sash in the Trash.** The wardrobe (your cabin); see what's on (the Mark II).
- **129 The Sleeping Quarters Are Alive.** Unboard the door at the bottom of the galley; go in; take the pillow that roars; throw it into the storm (the port rail); pick it up and throw it again.
- **130 Condemn the Bedding** (the quarters). Judge six kinds: the sheets and blankets on the two cots, the pillows, mattress covers and hammock cloth on the hammocks (every hammock counts for one), and the pillowcases in the middle port footlocker, one sticking out from under the lid; the pile up and over the side; stuff it into the linen locker; nail it shut.
- **131 Grand Stenchmaster Bedding.** Five kinds of sash bedding round the room.
- **132 The Fan Mega-Pack.** Open it; place the five cardboard Stenchmasters (each has two spots in the quarters; or leave them in the box for now).
- **133 Build-Your-Own S.E.S.** The parts (Jim's forks in the galley, the horseshoe over the hold stairs, a coil in the hold's salvage crate, the transformer under the Mark II); build it on the barrel table.
- **134 Wire the Two Systems Together.** Cardboard Brogath, wherever you put him; the crates by the fore hatch; the starboard cannon; the galley floor; the Mark II.
- **135 The Stenchmaster Channel.** Watch it.
- **136 Stench-O-Vision.** Turn it off (the bedroom set's knobs: MORE, NOSE, PINE?, UPSIDE; after three, VENT SHUT turns up).
- **137 Poor in Gold, Rich in Gas.** Watch it.
- **138 Captain Stinkbeard Finally Reaches His Limit.** Say it, at everything.
- **139 The Beard Betrays Him.**
- **140 Every Ancient Stenchmaster Is Here.** Talk to each of them: Pete, Gristle, Bob, Jim, Squawks, Garrick.
- **141 Disarm the Ancient Stenchmasters.** The bean sack, the Grog cask, the sauce shelf, Bob's fingers, a sash hammock, the Prime, Gristle.
- **142 Ancient Stenchmaster Apocalypse** (the deck). Five orders: the mainmast sheets, the starboard rail, the port cannon, the helm, the beans by the main hatch.
- **143 Two Brogaths.** Look at them both.
- **144 Brogath in the Treasure Room** (below: the galley, then the hold). The door; Pete.
- **145 The Brogath Command Crisis** (the deck). The helm, three gusts.

The captain's choices (where each standee goes, which knob first, the order of the rant)
converge; the standees stay where they were put. What doesn't branch: the bedding is
condemned, the sets are wired, the beard betrays him, the door stays shut, and Pete is still
Brogath at the end.

## Systems added (reusable)

**Actor aliases (who somebody appears to be)**

- **Where:** `src/systems/story/aliases.js` (`activeAliasSets`, `actorAlias`, `resolveSpeaker`, `resolveActorLook`, `aliasOverlay`); alias sets in `data/story/aliases/*.json`; the dialogue box (`src/ui/DialogueBox.js`) and the world (`WorldScene.spawnNpc`, texture refresh on flag change).
- **Notes:** A set is live while its `if` holds and maps real ids to `{ name, portrait, appearance, flicker }`, with an optional world `overlay` (tint, wobble). The dialogue box shows the alias's name and portrait and, with `flicker`, blinks to the real ones now and then (with reduced effects: both names, no blink). The world draws the alias's appearance. Nothing is stored: saves, quests, dialogue selectors, the log and story flags keep the real ids. The validator checks every actor and portrait it names.

**Stench-O-Vision (a programme that smells)**

- **Where:** a set's `vent: { tiles: { <map>: [x, y] }, sfx, if }` (`data/tv/ses_kit.json`); a programme beat's `aroma`; the `tvProgram` command's `tv`; `TvView`, `WorldScene.ventPuff`; a fume zone in the room.
- **Notes:** While the vent's `if` holds, each aroma beat (in the close-up or played on a vista) puffs out of the set in the world. The smell itself is an ordinary fume zone with a `severity` (0.35: a dense zone, scaled down to a mild source) in `data/maps/ship/phase13/crew_quarters.patch.json`. The Fume Hazard option scales its exposure like any other (Normal, Gentle at half, Off at none); with Off, the cloud, the puffs and the story reactions are all still there, and it never builds up.

**Fume zone `severity`**

- **Where:** `FumeField.severityAt` (`src/systems/hazards/fumes.js`), the world's exposure update.
- **Notes:** A zone's `severity` (0 to 1, default 1) multiplies the exposure it builds, so a small source can be dense-looking but mild.

**Persistent decor (where the player put things)**

- **Where:** a map's (or patch's) `decor`; `expandDecor` in `src/content/ContentDB.js`.
- **Notes:** `{ value, prop, spots: { name: [x, y] | { x, y, flip, frame } }, if, inspect, default }`. The story value names the spot (it's saved like any other value), and each spot becomes an ordinary conditional prop (id `decor_<value>_<spot>`), with an inspect object where the slot has a script. Unset means the first spot, unless `"default": null`. A choice menu in a script sets the values; the standees use it, and cardboard Brogath has a spot of his own on deck.

**Fume props (furniture that grumbles)**

- **Where:** ambient `{ kind: 'fumeProp', x, y, prop, every, sounds, puff }` (`src/world/Ambient.js`).
- **Notes:** Now and then the prop on a tile shivers, a wisp comes off it, and one of its sounds plays quietly: a growl, a whimper, a "mrrrow". Not a creature: nothing moves, blocks or follows.

**Save v13**

- **Where:** `src/systems/save/migrations.js` (12 to 13).
- **Notes:** Unchanged layout. The quarters' new bedding, the sealed locker, the standees (each a story value; unset means the first spot), the second set, its cable, the channel, Stench-O-Vision and the delirium are flags and values that start unset. Aliases are never saved: they follow the flags.

## Map patches

| Map | What changes |
| --- | --- |
| Crew quarters (`data/maps/ship/phase13/crew_quarters.patch.json`) | Reopened (Phase 8's condemned smoke and Phase 3's hammock sighs retired). The bedding, yellowed and growling (fume props), with light fumes until sealed; the kitten-roar pillow; the pile; the linen locker, stuffed, then nailed. Sash bunks, cots, the Grand Stenchmaster's sash hammock. The Mega-Pack, bunting, merchandise; five decor slots for the standees. The bedroom set on the barrel table (box, static, on, vent), its cable, the Stench-O-Vision fume zone. The bean sack, the Grog cask, the sauce shelf. Placements for every scene. |
| Galley (`phase13/galley.patch.json`) | Garrick on the bench end, then the long table. The trash song on the Mark II. The boarded door to the quarters (the boards come off in 129; the warp opens for good). Jim's forks; the spare transformer; the cable tacked across the floor and connected. |
| Main deck (`phase13/main_deck.patch.json`) | The fore hatch opens again. The pillow over the port rail and back. The cable round the rope coil and the starboard cannon. The apocalypse orders. Cardboard Brogath by the helm (a decor spot of his own). The command crisis at the helm. |
| Cargo hold (`phase13/cargo_hold.patch.json`) | The lucky horseshoe over the stairs, the coil in the salvage crate. The treasure-room door with its three signs, growling now and then; Phase 13's sealed door (from Phase 13 on). The crew round the door in 144. |
| Captain's cabin (`phase13/captains_quarters.patch.json`) | The wardrobe, opened once; the coats changing colour at the hems. |

## Television

- **The bedroom set** (`data/tv/ses_kit.json`, the Build-Your-Own S.E.S.): channel 1 (snow) and channel 9; the state `no_signal` until the cable is connected; the `vent` (Stench-O-Vision); the `vent` knob panel: MORE (louder), NOSE (a glimpse of a smell-test card), PINE? (a tint), UPSIDE (a flip), then VENT SHUT (tune; sets `stench_o_vision_disabled` and keeps the set on channel 9).
- **The Mark II, channel 9** once the sets are connected.
- **The Stenchmaster Channel** (`data/tv/programs/stenchmaster_channel.json`, narrated by `channel_narrator`): `stenchalina_disaster` (thirteen beats, seven of them smelly) and `brogath_special` (sixteen beats).
- **The Bling Bling King Show** (`bling_late_night.json`): `sash_trash_song`.

## Logbooks

`data/logs/phase13.json`:

- **Garrick's Alleged Stenchmaster Legends:** Brogath (updated: still none), The Stenchmaster Channel.
- **Garrick's History** (the Stenchalina entry, updated).
- **The Bling Bling King's Participation Trash:** The Returned Pillow, The Smell Complaint, The Campaign.
- **The Captain's Journal:** the suspension (updated), The Old Quarters, Brogath (Sightings).

## Where things live

| What | Where |
| --- | --- |
| Chapter scripts | `data/story/cutscenes/phase13/ch127_133.json`, `ch134_139.json`, `ch140_145.json`, `world.json` (the quarters door, the treasure door, the cable, the bedroom set, the locker, the Mega-Pack, the shelf, the sash bunks, the wardrobe, each standee) |
| Crew dialogue per stage | `data/dialogue/phase13/crew.json`; selectors in `data/npcs/phase13_crew.json`; the narrator in `data/characters/speakers_phase13.json` |
| Quests, flags, triggers | `data/quests/phase13.json`, `data/story/flags/phase13.json`, `data/story/triggers/phase13.json` |
| The delirium | `data/story/aliases/phase13.json`; looks in `data/appearances/phase11.json` (`pete_brogath`, `gristle_rumpold`, `bob_rumpus`, `jim_gustavio`, `garrick_prime`), portraits in `data/portraits/phase11.json` (`delirium_*`) |
| Items | `data/items/phase13.json`: Kitten-Roar Pillow, Parts Not Included |
| Vistas | `data/story/vistas/phase13.json`: `quarters_watch` (the bedroom set, close) |
| Props and art | `data/props/phase13.json`; `src/art/props/phase11Props.js`, `src/art/vista/vistaPhase11.js` (the kit's bezel, the channel's frames), `src/art/inserts/phase11Inserts.js` |
| Music | `stenchmaster_channel`, `grand_merchandise_makeover`, `beard_delirium`, `ancient_stenchmasters_everywhere`, `brogath_command_crisis` |
| The storm | `data/hazards/sharkstorm.json` (`command_crisis`) |
| Presets | `data/debug/presets.json` (24, `p13_start` to `p13_complete`) |

## Persistent state after the phase

**The ship.** Inside the Great Sharkstorm (`great_sharkstorm` = `command_crisis`, distance
`inside`; `queen_annes_revenge_location` = `inside_great_sharkstorm`). The old quarters are
open again, made up in sash bedding, decorated with the Mega-Pack, the standees where the
player put them (`crew_quarters_state` = `sash_bedding_merch`), the condemned bedding nailed
into the linen locker, growling. Two sets, wired together, on channel 9; Stench-O-Vision off.
Cardboard Brogath is on deck by the helm. The treasure room is sealed
(`treasure_room_state` = `sealed_brogath_alleged`).

**The captain.** In the delirium (`stinkbeard_delirium`, `stinkbeard_state` =
`ancient_stenchmaster_delirium`): he sees the legends in his crew, and believes Pete is
Brogath. The sash is still in his wardrobe.

**Garrick.** Still suspended (about nine hours to go), still Garrick underneath (THE GRAND
STENCHMASTER PRIME to the captain), and the one who told the truth about the growl.

**Brogath.** Not confirmed. Not real. Three of him, in the captain's opinion.

**Left for later, and not invented here:** the debate (announced on a token), the end of the
suspension, the end of the delirium, and INSIDE THE GREAT SHARKSTORM, which stays open.

## Testing it

**Presets.** Each is the state recorded from a real headless walk, chained from
`p12_complete`, and each is played to the end of the phase by `tests/phase13_story.test.js`.
The 24 presets:

Phase 13 Start, Sash Trash Comedy, Growling Bedding, Returned Pillow, Textile Closet, Sash
Bedding, Mega-Pack, Cardboard Legends, Bedroom S.E.S. Build, Antenna Routing, Stenchmaster
Channel, Stenchalina Programme, Stench-O-Vision, Brogath Programme, Captain Rant, Beard
Delirium, Ancient Stenchmasters, Disarm Stenchmasters, Deck Delirium, Two Brogaths,
Treasure-Room Brogath, Captain Brogath, Brogath Command Crisis, Phase 13 Complete.

**Tests.**

- `npm test -- tests/phase13_story.test.js`: both choice paths (the last one puts every standee in its other spot); every chapter in order; staging; every preset to the end; the quarters' changes and the standees (across a save and load); the sets, the channel and its programmes; Stench-O-Vision as a mild zone scaled by Normal, Gentle and Off (and still seen with Off), shut by its knobs; the aliases (before and after the beard, real names underneath, nothing saved, real speakers in the log); the sealed treasure room; the storm still active; the canonical end and the big moments in order; a version 12 save migrating in; the brief scan and nothing after the source.
- `npx playwright test e2e/phase13.spec.js` (tag `@phase13`): the whole phase in a browser, and from the beard; Stench-O-Vision with the Fume Hazard option Off (no build-up) and its knobs; the delirium in the dialogue box and on the map; the standees across a save and Continue; every preset loads.
