# Story Phase 11: The Grand Bedtime Argument

The tenth canonical story chapter. It picks up in the galley the night Phase 10 ends, with
the Queen Anne's Revenge inside the Great Sharkstorm, the crew below, and the Grand Nap
postponed. It ends the same night, much later: the captain has secretly read the pocket
edition of the legends, found the one weakness the Grand Stenchmaster has (the sash must
never flutter, or he stops for three weeks), found the dice that ruin it, and sworn the crew
to an anti-dice conspiracy. Nothing is done yet. Phase 12 starts in the morning.

It is one long night in five movements, adapted from the first part of the source (up to
the conspiracy):

1. **Bedtime inside the storm** (chapters 96 and 97). The book is in the captain's things; the hammocks; the bed. The kerosene lamp swings, so the Grand Stenchmaster designs a Grand Bedside Illumination System, and the captain ties it up: two ropes, a test that fails, then six. It works.
2. **The legends and the office** (98 to 100). Brogath's treasure story, expanded (the day's catastrophe, again). Every sash incident on record, reviewed: the peg, the org chart, the holders, the book; the captain's case that every legend is somebody holding his sash while he farts. The Grand Finger-Puller, and a vote (one for, everyone against; the office stays on the chart, vacant).
3. **The storm listens** (101 to 103). Tokens down the ladder: WHY DOES A PIRATE SHIP HAVE A DESIGNATED FART MAN? A laminated card: NOW HIRING: GRAND FINGER-PULLER. The sailcloth hammocks give way, the long table slides, and in the lurch the book goes out of the porthole into the storm.
4. **Cheap-O-Rama** (104 to 108). A flying machine comes down through the wall of the storm with a crate: three hundred toy sashes (ages six and up, pull tab for pretend fart noises) and, in every box, a pocket edition of suspiciously familiar legends. Garrick: INDEPENDENT CORROBORATION. The crew re-hang their hammocks in toy sashes ("bed sashes"), the captain too. The Grand Nap's Grand Resumption. Sir Rumpus Windbottom and the Grand Court decide whether a fart is valid.
5. **The weakness and the conspiracy** (109 to 111). The Mark II switches itself on: the Bling Bling King's late-night show, about the designated fart man, the hammock over the captain, the benefits package. Four wrong knobs, then the master switch. The last story of the night: Lord Gustavio Bottomsworth, the first Great Sash Flutter, and three weeks without a toot. The captain borrows the booklet off a sleeping chest, reads it under the six-rope lamp (five passages: the thirty seconds, the clause, the silence, the Grand Dice of Grandness), writes the plan, puts the booklet back, wakes the crew one by one and holds the meeting. A token rolls onto the table. A growl from the hammock.

The phase starts from the end of Phase 10: coming into the galley says where (the
captain's bed), once. Phase 11 waits until the captain goes to bed.

About 70 to 100 minutes of play:

- 16 chapters (96 to 111) and 15 quests with 33 objectives, every one played.
- 93 story flags.
- About 570 lines of dialogue and narration in the scripts, plus about 100 lines of crew dialogue across the stages.
- No new maps: the phase plays in the galley, with one trip up on deck and a sign on the treasure-room door, all through map patches.
- No battles. The challenges are timing bars (the lamp's six knots, grabbing the sliding table, bracing, carrying the crate, easing the booklet out from under a sleeping man and back) and the knobs.

## Continuity

**From Phase 10.** The Revenge is inside the Great Sharkstorm (`great_sharkstorm` moves from
`inside_ship` to `inside_bedtime`, still `inside`). The galley is a bedroom: bean sacks,
Squawks' basket, the Grand Stenchmaster's hammock over the captain's spot. The old crew
quarters are still condemned. The Mark II works on its sauce-can aerial. The Bling Bling King
still has the Crimson King's Crown, and still never speaks in person.

**The book.** Garrick's own book, **The Grand Expedition for the Lost Fart: Complete Grand
Stenchmaster Legends - Volume One of Probably Many** (homemade, crayon), is the one lost into
the storm in chapter 103. The Cheap-O-Rama booklet is a different thing: **Complete Grand
Stenchmaster Legends - Cheap-O-Rama Pocket Edition**, a commercial companion that tells
suspiciously similar stories. Nobody knows who copied whom. Garrick says it proves the legends
are real. The captain says it proves the opposite. The borrowed adventure-film title is never
used anywhere.

**Names.** Garrick Grumblegut; the Great Sharkstorm (never the protected name); Brogath the
Bashful, Rumpold Windbreaker, Princess Stenchalina, Sir Rumpus Windbottom and Lord Gustavio
Bottomsworth are legends, all alleged. `tests/phase11_story.test.js` scans every Phase 11 file
for the banned names, and `tests/phase11.test.js` scans every file in the repository and every
save a player can make in Phases 11 to 13.

**The treasure room.** Somebody suggests sleeping in the treasure room (chapter 102). Gristle
nails a sign across the door: DO NOT OPEN. From then on the door is sealed
(`treasure_room_sealed`): what the first release left is still in there. The captain's key no
longer opens it. The old door (and its key) are what the hold has before Phase 11, which the
warp `when` system keeps apart (below).

## Canon this phase adds

| Canon | How it shows in the game |
| --- | --- |
| The six-rope lamp works | Rope from the stores, leather ties from Jim's hooks, the rig, a test (it swings, it fails), then six ropes. The Grand Bedside Illumination System is the only steady light on the ship (`galley_lamp_state` = `six_rope_suspension`). It stays up. |
| Brogath, expanded | Brogath the Bashful finds a treasure, digs, releases, blasts it into the sky; rich sharks; poor in gold. The captain hears his own day in it (`brogath_status` = `alleged_poor_in_gold`). |
| The office | Every sash incident reviewed (peg, chart, holders, book). The captain's summary: every legend is somebody standing behind him holding his sash while he farts. |
| The Grand Finger-Puller | Pulls the finger when the Grand Stenchmaster extends it. The vote fails; the post goes on the org chart, vacant (`grand_finger_puller` = `vacant`). |
| The storm is listening | Tokens down the ladder: the DESIGNATED FART MAN, the Grand Sharkmaster ("see above"), NOW HIRING. The Bling Bling King's Participation Trash logbook keeps them. |
| The hammocks break | Sailcloth isn't strong enough. Three hammocks snap to rags; the long table slides; BRACE. |
| The book is lost | Out of the porthole, into the storm (`garrick_book_location` = `great_sharkstorm`, `garrick_book_lost`; the Lost Fart Book leaves the inventory). |
| Cheap-O-Rama delivers | A flying machine, a crate on a winch: DELIVER TO: THE FART MAN, C/O THE STORM. ORDERED BY: THE BLING BLING KING. Three hundred toy sashes. |
| The pocket edition | In every box. Garrick: INDEPENDENT CORROBORATION. The crew have opinions (Ned, Gristle, Pete). It is fragile and wears (below). |
| Bed sashes | Toy sashes won't tear: the hammocks are re-hung in them, the captain's bed too. Garrick: desecration. They stay. |
| Sir Rumpus and the Grand Court | Witnesses, rotating; a licensed Finger-Puller; "The Grand Waft is valid." Nobody ever said one wasn't (`grand_court_status` = `alleged`). |
| Late-night Bling Bling King | On the Mark II, by itself: the designated fart man, the benefits package, the hammock over the captain. On television only; in person it still never speaks. |
| The weakness | Lord Gustavio's sash fluttered, and he refused to release for THREE WEEKS (`sash_flutter_weakness_discovered`). Every head turns toward the hammock. The captain smiles. |
| The rule, and the dice | Thirty seconds, held by the highest-ranking officer present; it may be allowed to flutter on purpose; then twenty-one days. Or, at the Stenchmaster's request, the GRAND DICE OF GRANDNESS (sold separately) (`grand_dice_known`). |
| The conspiracy | The plan, in his crayon: hold it, let it flutter, he must notice, gasp and point, 21 days, NO DICE. Every idea round the table comes back to making twenty-one days sound grander than a toy cube (`anti_dice_strategy` = `destroy`, `anti_dice_pitch` = `sacred_twenty_one_days`, `conspiracy_ready`). |

## Chapter flow

Each chapter's quest objectives say where to go and who to talk to. Everything is in the
galley unless it says otherwise.

- **96 Bedtime Inside the Great Sharkstorm.** Give him his book back (his hammock); help Gristle string hammocks; go to bed.
- **97 Grand Bedside Illumination System.** Fetch ties (rope from the stores, leather from Jim's hooks), tie the lamp to the beam, test it, six ropes.
- **98 Brogath's Treasure Story.** Hear it (his hammock).
- **99 Every Sash Incident.** The peg by the hatch, the org chart by the stove, the sash holders (Rusty Tom), the book (him), in any order.
- **100 The Grand Finger-Puller.** Count the votes: Pete, Bob, Jim, Gristle.
- **101 The Storm Starts Listening.** Four tokens on the floor, and a card.
- **102 Hammocks Begin to Die.** Help Pete, Bob and Jim up; stop the long table; look at the rags. (Gristle's sign goes on the treasure-room door.)
- **103 The Lost Book.** BRACE (the long table); say something to him.
- **104 Cheap-O-Rama Emergency Delivery** (up on deck, then below). The flying machine; carry the crate down; open it.
- **105 The Pocket Sacred Text.** What else is in the box; Ned, Gristle and Pete on it.
- **106 Bed Sashes.** Take sashes; re-hang Pete's, Bob's and Jim's hammocks; your own bed.
- **107 The Grand Nap's Grand Resumption.** Three Grands (or four, or five).
- **108 Sir Rumpus and Fart Validity.** Hear it.
- **109 Late-Night Bling Bling King.** Turn it OFF (the Mark II: a knob panel; four wrong knobs, then the master switch turns up).
- **110 The First Great Sash Flutter.** The last story of the night.
- **111 Secret Research and the Anti-Dice Conspiracy.** Borrow the booklet off his chest (an easing timing bar), read it under the lamp (five passages, any order; the menu can be closed and come back to), write the plan, put it back, wake Pete, Gristle, Bob and Jim, hold the meeting.

The captain's reaction choices (how many Grands, what to say to the lost book, which
passage first) converge. What doesn't branch: the lamp works, the book is lost, the
sashes arrive, the weakness is found, and nothing is attempted yet.

## Systems added (reusable)

**A warp's `when` (which door a tile is)**

- **Where:** map objects; `WorldScene.warpAt`, `tests/storyStaging.js`, `tools/mapgrid.mjs`, the validator.
- **Notes:** A warp can carry `"when": <condition>`. `warpAt` returns the first warp on the tile whose `when` holds; its `if` is still the lock, and `locked` names the script that plays when it is locked. Later patches come first, so a later phase can put a different door on the same tile from a given point in the story without touching the earlier one. Phase 11's sealed treasure-room door uses it (and Phase 13's, from Phase 13 on).

**Talking to someone in the hammock overhead**

- **Where:** `WorldScene.interactionTarget`.
- **Notes:** A hammock doesn't stop the captain walking in under it, and from there he faces past the person in it. Confirm now talks to whoever is in the hammock right above him, before anything in front of him except a job for an open objective (in front of him or under his feet), as it would from beside it. Phase 11 is full of conversations with people in hammocks; the browser playthrough found it.

**Fragile items (`wear`)**

- **Where:** an item's `"wear": { "value", "stages": [...] }`; the `wear` script command; item `variants` for the description at each stage.
- **Notes:** `{ "wear": "<item>" }` moves the item's story value on one stage, or `"to"` a named one; never backwards, never past the last, and the item itself is never taken. The pocket edition goes new, bent, torn corner, torn last page (Phase 11), loose staple (Phase 12). The validator checks every `to`.

**Retiring an earlier chapter's prop, fume zone or ambient entry**

- **Where:** a map patch's `propConditions`, `fumeConditions`, `ambientConditions`; `ContentDB`.
- **Notes:** `[{ "id": "<entry id>", "if": <condition> }]` adds a condition to an earlier patch's entry, so a later chapter can take away (for example) Phase 3's hammock sighs or Phase 8's condemned smoke without editing those files.

**Knob panels: more effects**

- **Where:** a set's `knobPanels`; `src/ui/TvView.js`.
- **Notes:** `louder`, `flip`, `tint`, `slow`, `stretch`, `mute`, `shrink`, `glimpse`, `frog`, `roll`, `shriek`, `tune` (sets the panel's `doneFlag` and leaves the set on, at a channel) and `off`. The late-night panel ends on the master switch after four other tries.

**Timing-bar kinds**

- **Where:** `src/systems/repairKinds.js`.
- **Notes:** `reach` (ease the booklet out) is Phase 11's; `crack`, `slice`, `pour` (breakfast) and `solder` (the bedroom set) come with Phases 12 and 13. Each kind has its three sounds, checked by the validator.

**Presets that land part-way through a counted objective**

- **Where:** `src/debug/presets.js`, a quest state's `"progress": { "<objective>": n }`.
- **Notes:** Grand Dice Discovery starts with four of the five passages read. The validator keeps `n` between 1 and the count less one.

**Vista layer commands, validated**

- **Where:** `src/content/validateContent.js` (`checkVistaCommands`).
- **Notes:** `vistaMove`, `vistaFrame`, `vistaShow`, `vistaSpin` and a programme played onto a vista's screen must name a layer of the vista that is up (the cinema throws otherwise). Each script is followed with the vista its own `vista` commands put up, into the scripts it calls; a branch that changes the vista leaves it unknown; a debug preset's script starts with nothing up. `vistaFrame`'s frame must be vista art.

**Save v11**

- **Where:** `src/config/constants.js`, `src/systems/save/migrations.js` (10 to 11).
- **Notes:** The layout is unchanged; the migration fills missing containers. Phase 11's facts (the lamp, the lost book, the sashes, the booklet's condition, the weakness, the conspiracy) are flags and story values that start unset, so a finished Phase 10 save wakes inside the storm at bedtime. The booklet's condition reads as `new` until the story sets it.

## Map patches

| Map | What changes |
| --- | --- |
| Galley (`data/maps/ship/phase11/galley.patch.json`) | Three sailcloth hammocks for Pete, Bob and Jim, snapped to rags in 102, re-hung in toy sashes in 106 (and they stay). The lamp tied to the beams (two ropes, then six). The sash on its peg by the ladder, the org chart by the stove, the tokens, the porthole the book goes out of, the Cheap-O-Rama crate at the foot of the ladder, the long table's slide, the meeting. Placements for every scene. |
| Main deck (`phase11/main_deck.patch.json`) | The crate winched down midships (104). |
| Cargo hold (`phase11/cargo_hold.patch.json`) | Gristle's DO NOT OPEN sign on the treasure-room door, and the sealed door (a warp with `when`). |
| Crew quarters | Still condemned. The base map's props now have ids (so later phases can retire them). |

## Television

- **The Mark II, channel 8** (`data/tv/ses_mk2.json`): **The Bling Bling King Show**, on from chapter 109 (`data/tv/programs/bling_late_night.json`, episodes `late_night_part_one` and `late_night_part_two`). The speaker is `bling_king_tv`: the shark speaks only on television.
- **The `late_night` knob panel**: FLIP, STRETCH, WORSE SOUND, MUTE, then (after four tries) the MASTER SWITCH (`p11_late_night_off`). No wrong knob is a dead end; the programme carries on throughout.

## Logbooks

`data/logs/phase11.json` extends three books:

- **Garrick's Alleged Stenchmaster Legends:** Brogath (updated: poor in gold), The Office of the Grand Stenchmaster, Sir Rumpus Windbottom and the Grand Court, Lord Gustavio Bottomsworth and the First Great Sash Flutter, the Cheap-O-Rama Pocket Edition, The Thirty Seconds and the Grand Dice of Grandness. Every entry is "alleged"; none is evidence.
- **The Bling Bling King's Participation Trash:** the Fart Man tokens, NOW HIRING, Good Luck, Captain (the token on the meeting table).
- **The Captain's Journal:** the storm entry, updated for the night.

## Where things live

| What | Where |
| --- | --- |
| Chapter scripts | `data/story/cutscenes/phase11/ch96_103.json`, `ch104_111.json`, `world.json` (the bed, the lamp, the peg, the chart, the porthole, the crate, the sash hammocks, the sealed door) |
| Crew dialogue per stage | `data/dialogue/phase11/crew.json`; selectors in `data/npcs/phase11_crew.json` |
| Quests, flags, triggers | `data/quests/phase11.json`, `data/story/flags/phase11.json`, `data/story/triggers/phase11.json` |
| Items | `data/items/phase11.json`: Pocket Edition (fragile), Toy Sash, The Plan |
| Vistas | `data/story/vistas/phase11.json`: `cheap_o_rama_drop` |
| Props and art | `data/props/phase11.json`; `src/art/props/phase11Props.js` (all three phases' props), `src/art/vista/vistaPhase11.js`, `src/art/inserts/phase11Inserts.js` |
| Music and SFX | `grand_bedtime_argument`, `cheap_o_rama_delivery`, `sash_conspiracy`, `late_night_bling` (`data/audio/music/`); `data/audio/sfx_phase11.json` (65 effects for all three phases) |
| Presets | `data/debug/presets.json` (18, `p11_start` to `p11_complete`) |

## Persistent state after the phase

**The ship.** Inside the Great Sharkstorm at bedtime (`great_sharkstorm` = `inside_bedtime`,
distance `inside`; `queen_annes_revenge_location` = `inside_great_sharkstorm`). The galley
has the six-rope lamp, three hammocks re-hung in toy sashes, the captain's bed sashed too, and
the Cheap-O-Rama crate at the foot of the ladder. The treasure room is sealed. The old
quarters are condemned.

**The legends.** Garrick's own book is in the storm. The pocket edition is back on his chest,
with a torn last page (`pocket_legend_book_condition` = `page_tear`). Brogath, Rumpus and
Gustavio are alleged. The Grand Finger-Puller is a vacant post on an org chart.

**The crew.** Garrick is still the Grand Stenchmaster, asleep, rumbling
(`garrick_stomach_rumbling`). The captain has the plan; the crew are sworn
(`conspiracy_ready`). Nobody has held the sash. No dice are aboard.

**Left for later:** INSIDE THE GREAT SHARKSTORM stays open. Phase 12 starts at the captain's
bed in the morning (`p12_ready_hint`).

## Testing it

**Presets.** Use the debug overlay's **Story** tab or `tools/play.mjs` `preset <id>`. Each
preset is the state recorded from a real headless walk at that beat, chained from
`p10_complete`, and each is played to the end of the phase by `tests/phase11_story.test.js`.
The 18 presets:

Phase 11 Start, Grand Bedtime Argument, Lamp Engineering, Brogath Bedtime Legend,
Finger-Puller Revelation, Token Downpour, Hammock Failure, Lost Book, Cheap-O-Rama Sashes, Bed
Sash Repairs, Grand Nap Resumption, Sir Rumpus Legend, Bling Late-Night Show, First Great Sash
Flutter, Secret Book Borrow, Grand Dice Discovery (four passages read), Anti-Dice Conspiracy,
Phase 11 Complete.

**Tests.**

- `npm test -- tests/phase11_story.test.js`: the phase played headlessly (`tests/phase11Play.js`) with the first and the last option at every choice; every chapter in order; staging; every preset to the end; the canonical end state; the big moments once and in order; the tokens and the silent Bling Bling King; Garrick's own book kept; the pocket edition's wear; saves made mid-phase and loaded; a version 10 save migrating in; the sealed treasure-room door (and the old one before it); the brief scan.
- `npm test -- tests/phase11.test.js`: the systems of Phases 11 to 13 (decor, the validator's rules, saves 10 to 13 and at every preset, timing kinds, art and sound) and the repository-wide banned-name scan.
- `npx playwright test e2e/phase11.spec.js` (tag `@phase11`): the whole phase in a browser from the end of Phase 10, and from the Cheap-O-Rama delivery; the lamp; the late-night knobs; the sealed door with the key in hand; every preset loads. `--grep @smoke` runs the short ones.
