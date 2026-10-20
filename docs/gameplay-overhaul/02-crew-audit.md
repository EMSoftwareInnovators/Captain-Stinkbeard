# 02 · Crew audit

Every pirate, companion and named NPC in the game: who they are, where the game puts them at each stage of the story, what they do, and a proposal for giving each one a place aboard. Audit only: nothing here has been moved or changed.

## Sources and method

- NPC definitions: `data/npcs/*.json` (base definitions, plus `extend` entries that add dialogue per phase). Party characters: `data/characters/`. Speaker-only voices: the `extraSpeakers` registry built by `src/content/ContentDB.js`. The ancient crew’s records: `data/story/ancient_crew.json`.
- Placement logic: `src/world/placements.js`. Each room lists `npc` placement rows in priority order and the first row whose `if` holds wins. An `"absent": true` row, or no matching row, means “not in this room”. `roomGuard` stops characters appearing outside the rooms their definition allows. Idle behaviour comes from `src/world/NpcBrain.js` (`stand`, `wander`, `work`, `sit`, `routine`).
- Where each character stands was measured by loading each of the 17 phase-complete debug presets (`prologue_done`, `phase2_complete` … `p17_complete`, from `src/debug/presets.js`) and evaluating every room’s placement rows, the same way the game does. These are snapshots at the end of each phase; mid-phase positions change live as flags change. Story lines are counted from the chapter scripts only; ambient NPC dialogue is counted separately as “dialogue entries”.

## Counts

- **76 NPC definitions.** 37 of them speak in story chapters; 39 are silent queue customers for the bank, branch, dispensary and credit counters, defined for the teller minigames.
- **3 party characters** (`data/characters/`): `blackbeard` (the captain), `ledger` and `tilda`. The last two join in Phase 17.
- **29 speaker-only voices** with no body in the world: the codex, TV and channel narrators, the imaginary shark chorus, the Council of Ignition, the converter’s voice, `garrick_asleep` and `garrick_far`, and others.
- **8 ancient-crew records** in `data/story/ancient_crew.json`. Only Ledger Billiam and No-Nonsense Tilda exist as characters; Old Jeb Rattleplank, Wobbly Ned, Blind-Eye Margery, Half-Mast Harold, Captain-Sometimes Clem and Elsie Beanwright exist as lore and as Brogath’s Chapter 207 cut-outs.

## The core problem, in numbers

Ten of the eleven original crew members (everyone except Mister Hale), plus the merchant Penhallow, are placed in the **cargo hold at every phase milestone from Phase 10 to the end of the game**, and eight of them without a break since Phase 7. They went below with everyone else for the Sharkstorm in Phase 7 (“Everyone Below”, Chapter 39). The main cast later moved to the galley (Phase 10) and the crew quarters (Phase 16), but no placement row ever moved these eleven out again.

Their dialogue shows the same drop. Each had 13–24 new dialogue entries per phase in Phases 7–8, and 1–3 per phase from Phase 9 on: a single phase-reactive line each. Fennimore, Finch and Penhallow get none after Phase 14. They keep their personalities, as these lines show, but they have no job, no station and no story function:

> quill: Twenty-nine rules for Brogath, eleven for the Fart Zone, and a sign that says NOT EVEN FOR FRIENDS. I’m running out of NAILS.
>
> rook: Captain, the cardboard first mate challenged me to a drill. I lost. To CARDBOARD.

At the end of Phase 17 the cargo hold holds 11 people, the crew quarters 13, the main deck 1 (Hale) and the galley none. The hold is the ship’s storage, and it is currently its biggest crowd.

Other persistence problems found:

- **Dunstan**’s last scene is Chapter 20 (running out of the washroom in a towel). He stands in the quarters until the end of Phase 5 and is never placed after that. No line explains it.
- **Rusty Tom and Barnacle Bill** arrive in Phase 10 as the sash holders and are hidden by every placement row from Phase 13 on. They vanish without an exit.
- **Gristle** is unplaced at the `p14_complete` snapshot: the first matching row in every room hides him. He is placed again in Phases 15–17. This may be intended (a scene state at the end of Phase 14), but it was not verified.
- **Stale ambient lines.** Late-phase lines are often keyed only on a start flag (for example Finch’s `{"flag": "p14_started"}`), so in Phase 17 he still talks about Phase 14 events. Most are harmless; check them when the crew get stations.
- **Late arrivals with no earlier presence.** Gristle (Phase 3), Pete (Phase 4) and Rusty Tom and Barnacle Bill (Phase 10) are introduced as long-serving crew, but none of them is in the world before their introduction. Pete’s lore helps: he “slept through the Gust and everything after it”.

## Full roster

Each entry: id and display name; role and personality from their own lines; definition file; first and last story chapter they speak in; story lines (chapters); ambient dialogue entries; where they stand at each phase milestone (Pro = end of the prologue, P2 … P17 = end of that phase; HOLD = cargo hold); status; and the proposed station.

### The original crew of the Revenge (prologue; `data/npcs/ship_crew.json`)

**`hale` · Mister Hale** (First Mate; appearance `hale`; `data/npcs/ship_crew.json`)
- Role and personality: First Mate. Dry, steady, resigned (“Everything we fix, something else falls off.”). Runs the deck and the helm in every phase.
- Story presence: 142 lines in 52 chapters, first `ch1`, last `p17c8`. Ambient dialogue entries: 140 (added in Phase 9 and later: P9 5, P10 5, P11 4, P12 7, P13 8, P14 4, P15 4, P16 4, P17 4). Behaviour: `stand`. Room whitelist: any room.
- Placement by phase: Pro:deck P2:deck P3:deck P4:deck P5:deck P6:deck P7:HOLD P8:HOLD P9:deck P10:deck P11:deck P12:deck P13:deck P14:deck P15:deck P16:deck P17:deck.
- Status: **Active**.
- Proposed: Quarterdeck, beside the helm. Officer of the watch: runs crew-station assignments in crises; course dial and helm assist. Bunk: mates’ berth (aft end of the crew quarters).

**`quill` · Mister Quill** (Quartermaster; appearance `quill`; `data/npcs/ship_crew.json`)
- Role and personality: Quartermaster. Counts everything; keeps ledgers, stores and (from Phase 14) the Brogath Rules (“Twenty-nine rules for Brogath, eleven for the Fart Zone…”).
- Story presence: 25 lines in 11 chapters, first `prologue`, last `p8c3`. Ambient dialogue entries: 93 (added in Phase 9 and later: P9 2, P10 2, P11 1, P12 1, P13 1, P14 1, P15 1, P16 1, P17 1). Behaviour: `stand`. Room whitelist: any room.
- Placement by phase: Pro:galley P2:galley P3:galley P4:galley P5:galley P6:galley P7:HOLD P8:HOLD P9:HOLD P10:HOLD P11:HOLD P12:HOLD P13:HOLD P14:HOLD P15:HOLD P16:HOLD P17:HOLD.
- Status: **Stranded in storage (Phases 9–17), one phase-reactive line per phase**.
- Proposed: Stores office in the cargo hold, the one crew member who belongs there. Runs the resource economy: rations, Frog Grog, planks, rope and sashes, plus the rules board. Rival bookkeeper to Ledger from Phase 17. Bunk: crew quarters.

**`mags` · Mags Tallow** (Cook; appearance `mags`; `data/npcs/ship_crew.json`)
- Role and personality: Cook. Warm, sharp-tongued, argues with Quill and Jim; knits (“I knitted the chicken another hat.”).
- Story presence: 44 lines in 19 chapters, first `prologue`, last `p8c10`. Ambient dialogue entries: 93 (added in Phase 9 and later: P9 2, P10 2, P11 1, P12 1, P13 1, P14 1, P15 1, P16 1, P17 1). Behaviour: `work`. Room whitelist: any room.
- Placement by phase: Pro:galley P2:galley P3:galley P4:galley P5:galley P6:galley P7:HOLD P8:HOLD P9:HOLD P10:HOLD P11:HOLD P12:HOLD P13:HOLD P14:HOLD P15:HOLD P16:HOLD P17:HOLD.
- Status: **Stranded in storage (Phases 9–17)**.
- Proposed: Galley, second cook with Jim (two cooks are already a running argument). Duty: cooking system and morale meals. Secondary: sailmaker and knitter, mending bedding, sash cloth and Squawks’s sweater. Bunk: crew quarters.

**`fennimore` · Doc Fennimore** (Surgeon; appearance `fennimore`; `data/npcs/ship_crew.json`)
- Role and personality: Surgeon. Dry medical humour (“As a medical man: no. As a man: also no.”).
- Story presence: 19 lines in 10 chapters, first `ch4`, last `p8c10`. Ambient dialogue entries: 92 (added in Phase 9 and later: P9 3, P10 3, P11 1, P12 1, P13 1, P14 1). Behaviour: `stand`. Room whitelist: any room.
- Placement by phase: Pro:qtrs P2:qtrs P3:deck P4:deck P5:deck P6:deck P7:HOLD P8:HOLD P9:deck P10:HOLD P11:HOLD P12:HOLD P13:HOLD P14:HOLD P15:HOLD P16:HOLD P17:HOLD.
- Status: **Stranded in storage (Phases 9–17); no dialogue after Phase 14**.
- Proposed: Sick bay, a cot corner in the crew quarters. Duty: injuries and knock-outs (where the captain and the crew wake after failing), and curing crew conditions. Bunk: beside the sick bay.

**`brask` · Old Brask** (Master Gunner; appearance `brask`; `data/npcs/ship_crew.json`)
- Role and personality: Master Gunner. Loud, bored by peace (“Guns clean, sea calm, nobody to shoot! TERRIBLE!”).
- Story presence: 37 lines in 15 chapters, first `ch1`, last `p8c3`. Ambient dialogue entries: 97 (added in Phase 9 and later: P9 2, P10 2, P11 1, P12 1, P13 1, P14 1, P15 1, P16 1, P17 1). Behaviour: `work`. Room whitelist: any room.
- Placement by phase: Pro:deck P2:deck P3:deck P4:deck P5:deck P6:deck P7:HOLD P8:HOLD P9:HOLD P10:HOLD P11:HOLD P12:HOLD P13:HOLD P14:HOLD P15:HOLD P16:HOLD P17:HOLD.
- Status: **Stranded in storage (Phases 9–17)**.
- Proposed: Gun deck, the main deck cannons. Duty: naval encounters, shark repelling with powder, and the cannon used in Phase 13’s cable gag. Bunk: crew quarters.

**`nell` · Nell Sounder** (Navigator; appearance `nell`; `data/npcs/ship_crew.json`)
- Role and personality: Navigator. Practical; can feel the Dead Center through the planks (“I felt the planks by the quarters door go cold.”).
- Story presence: 27 lines in 15 chapters, first `ch5`, last `p9c8`. Ambient dialogue entries: 97 (added in Phase 9 and later: P9 3, P10 3, P11 1, P12 1, P13 1, P14 1, P15 1, P16 1, P17 1). Behaviour: `work`. Room whitelist: any room.
- Placement by phase: Pro:deck P2:deck P3:deck P4:deck P5:deck P6:deck P7:HOLD P8:HOLD P9:deck P10:HOLD P11:HOLD P12:HOLD P13:HOLD P14:HOLD P15:HOLD P16:HOLD P17:HOLD.
- Status: **Stranded in storage (Phases 10–17)**.
- Proposed: Chart table on the quarterdeck (or the captain’s cabin). Duty: forecast board, course plotting and Atmosphere early warning (her plank sense becomes a telegraph before fume events). Bunk: crew quarters.

**`wick` · Wick** (Cabin Boy; appearance `wick`; `data/npcs/ship_crew.json`)
- Role and personality: Cabin boy. Over-polite messenger; carries news (“I only read the first line. I didn’t like the first line.”).
- Story presence: 39 lines in 19 chapters, first `prologue`, last `p9c1`. Ambient dialogue entries: 100 (added in Phase 9 and later: P9 3, P10 2, P11 1, P12 1, P13 1, P14 1, P15 1, P16 1, P17 1). Behaviour: `stand`. Room whitelist: any room.
- Placement by phase: Pro:deck P2:deck P3:deck P4:deck P5:deck P6:deck P7:HOLD P8:HOLD P9:HOLD P10:HOLD P11:HOLD P12:HOLD P13:HOLD P14:HOLD P15:HOLD P16:HOLD P17:HOLD.
- Status: **Stranded in storage (Phases 9–17)**.
- Proposed: Runner. A routine between the cabin, deck and galley, carrying objective hints and fetching items, which turns the existing hint role into a visible job. Bunk: hammock by the captain’s door.

**`rook` · Tomas Rook** (Deckhand; appearance `rook`; `data/npcs/ship_crew.json`)
- Role and personality: Deckhand. Blunt and quick-tempered; has the sock; loses a drill to cardboard Tilda in Phase 17.
- Story presence: 79 lines in 36 chapters, first `ch1`, last `p8c12`. Ambient dialogue entries: 100 (added in Phase 9 and later: P9 2, P10 2, P11 1, P12 1, P13 1, P14 1, P15 1, P16 1, P17 1). Behaviour: `work`. Room whitelist: any room.
- Placement by phase: Pro:deck P2:deck P3:deck P4:deck P5:deck P6:deck P7:HOLD P8:HOLD P9:HOLD P10:HOLD P11:HOLD P12:HOLD P13:HOLD P14:HOLD P15:HOLD P16:HOLD P17:HOLD.
- Status: **Stranded in storage (Phases 9–17)**.
- Proposed: Capstan and rigging. Duty: rigging repairs; sparring partner for Tilda’s drills (combat training). Bunk: crew quarters.

**`sully` · Sully Crabbe** (Deckhand; appearance `sully`; `data/npcs/ship_crew.json`)
- Role and personality: Deckhand. Weary swabber (“Swabbing. Again. There’s a lesson in it somewhere.”).
- Story presence: 16 lines in 10 chapters, first `ch1`, last `p13c7`. Ambient dialogue entries: 99 (added in Phase 9 and later: P9 2, P10 3, P11 1, P12 1, P13 1, P14 1, P15 1, P16 1, P17 1). Behaviour: `work`. Room whitelist: any room.
- Placement by phase: Pro:deck P2:deck P3:deck P4:deck P5:deck P6:deck P7:HOLD P8:HOLD P9:deck P10:HOLD P11:HOLD P12:HOLD P13:HOLD P14:HOLD P15:HOLD P16:HOLD P17:HOLD.
- Status: **Stranded in storage (Phases 10–17)**.
- Proposed: Deck cleaning. Duty: deck condition (slick tiles, fume residue, shark rubbish), feeding the Atmosphere and Ship Integrity systems. Bunk: crew quarters.

**`finch` · Old Finch** (Able Seaman; appearance `finch`; `data/npcs/ship_crew.json`)
- Role and personality: Able Seaman. Old, sits, senses the weather (“The sea’s holding her breath again.”).
- Story presence: 9 lines in 5 chapters, first `ch5`, last `p8c3`. Ambient dialogue entries: 91 (added in Phase 9 and later: P9 2, P10 2, P11 1, P12 1, P13 1, P14 1). Behaviour: `sit`. Room whitelist: any room.
- Placement by phase: Pro:deck P2:deck P3:deck P4:deck P5:deck P6:deck P7:HOLD P8:HOLD P9:HOLD P10:HOLD P11:HOLD P12:HOLD P13:HOLD P14:HOLD P15:HOLD P16:HOLD P17:HOLD.
- Status: **Stranded in storage (Phases 9–17); no dialogue after Phase 14**.
- Proposed: Bow, sitting watch with Ned. Duty: weather sense (warns of the next gust or storm wave); mends rope while sitting. Bunk: crew quarters, lower berth.

**`jory` · Jory Adze** (Carpenter; appearance `jory`; `data/npcs/ship_crew.json`)
- Role and personality: Carpenter. Practical, quick to report damage (“The swell sprang two of my patches below. Sorted.”).
- Story presence: 64 lines in 16 chapters, first `prologue`, last `p8c13`. Ambient dialogue entries: 108 (added in Phase 9 and later: P9 2, P10 2, P11 1, P12 1, P13 1, P14 1, P15 1, P16 1, P17 1). Behaviour: `work`. Room whitelist: any room.
- Placement by phase: Pro:HOLD P2:HOLD P3:deck P4:deck P5:deck P6:deck P7:HOLD P8:HOLD P9:HOLD P10:HOLD P11:HOLD P12:HOLD P13:HOLD P14:HOLD P15:HOLD P16:HOLD P17:HOLD.
- Status: **Stranded in storage (Phases 8–17)**.
- Proposed: Carpenter’s bench by the hold stairs, a legitimate work corner, not storage. Duty: leads the Ship Integrity repair crew and supplies planks. Bunk: crew quarters.

### Arrivals in Phases 2–4

**`garrick` · Garrick Grumblegut** (Businessman; appearance `garrick`; `data/npcs/phase2_crew.json`)
- Role and personality: Garrick Grumblegut: the antagonist-in-residence, Grand Stenchmaster. 1,901 lines, the largest part in the game.
- Story presence: 1901 lines in 172 chapters, first `ch1`, last `p17c17`. Ambient dialogue entries: 273 (added in Phase 9 and later: P9 15, P10 19, P11 11, P12 20, P13 19, P14 23, P15 25, P16 19, P17 14). Behaviour: `stand`. Room whitelist: any room.
- Placement by phase: P2:deck P4:deck P5:deck P6:deck P7:HOLD P9:isle P10:galley P11:galley P12:galley P13:deck P14:galley P15:galley P16:qtrs P17:qtrs.
- Status: **Active (special)**.
- Proposed: See special rules. Has an “office” (chair, rug, Mark II) rather than a duty station; the emergency labour rule is the one lever that makes him work.

**`squawks` · Captain Squawks** (Parrot; appearance `squawks`; `data/npcs/phase2_crew.json`)
- Role and personality: Captain Squawks, the parrot. Heckler and companion; bald, sweatered, frog-obsessed.
- Story presence: 316 lines in 111 chapters, first `ch1`, last `p16c14`. Ambient dialogue entries: 150 (added in Phase 9 and later: P9 7, P10 12, P11 5, P12 7, P13 11, P14 16, P15 15, P16 4, P17 6). Behaviour: `stand`. Room whitelist: any room.
- Placement by phase: P2:deck P3:deck P4:deck P5:deck P6:deck P7:HOLD P8:HOLD P10:galley P11:galley P12:galley P13:deck P14:galley P15:galley P16:qtrs P17:qtrs.
- Status: **Active**.
- Proposed: Companion. Basket in the captain’s cabin or the quarters, or the chest pouch on away missions. Duty: an early-warning squawk before fume events and sharks (Atmosphere telegraph).

**`bob` · Barnacle Bob** (Deckhand; appearance `bob`; `data/npcs/phase2_crew.json`)
- Role and personality: Barnacle Bob, deckhand. Drinks lamp oil; cheerful and literal.
- Story presence: 291 lines in 113 chapters, first `ch1`, last `p17c16`. Ambient dialogue entries: 185 (added in Phase 9 and later: P9 15, P10 12, P11 8, P12 9, P13 13, P14 18, P15 10, P16 5, P17 8). Behaviour: `stand`. Room whitelist: any room.
- Placement by phase: P2:deck P3:deck P4:deck P5:deck P6:deck P7:HOLD P8:HOLD P9:isle P10:galley P11:galley P12:galley P13:deck P14:galley P15:galley P16:qtrs P17:qtrs.
- Status: **Active**.
- Proposed: General hand on deck; sash holder; volunteer for anything. Bunk: his net in the quarters.

**`ned` · One-Eyed Ned** (Lookout; appearance `ned`; `data/npcs/phase2_crew.json`)
- Role and personality: One-Eyed Ned, lookout. Sees things first (“I’ve been saying it for ages. LAND.”).
- Story presence: 107 lines in 58 chapters, first `ch1`, last `p15c4`. Ambient dialogue entries: 158 (added in Phase 9 and later: P9 12, P10 13, P11 6, P12 8, P13 10, P14 15, P15 5, P16 3, P17 3). Behaviour: `stand`. Room whitelist: any room.
- Placement by phase: P2:deck P3:deck P4:deck P5:deck P6:deck P7:HOLD P8:HOLD P9:isle P10:galley P11:galley P12:galley P13:deck P14:galley P15:galley P16:qtrs P17:qtrs.
- Status: **Active through Phase 15, then a minor part**.
- Proposed: Crow’s nest or bow with the telescope. Duty: lookout (sightings and forecasts) and telegraphing sharks and incoming objects.

**`jim` · Salty Jim** (Ship's Cook; appearance `jim`; `data/npcs/phase2_crew.json`)
- Role and personality: Salty Jim, ship’s cook. Protective of his galley and pickles; quietly heroic about breakfast.
- Story presence: 302 lines in 120 chapters, first `ch2`, last `p17c17`. Ambient dialogue entries: 184 (added in Phase 9 and later: P9 13, P10 13, P11 8, P12 8, P13 12, P14 17, P15 11, P16 6, P17 10). Behaviour: `work`. Room whitelist: any room.
- Placement by phase: P2:galley P3:galley P4:galley P5:galley P6:galley P7:HOLD P8:HOLD P9:isle P10:galley P11:galley P12:galley P13:deck P14:galley P15:galley P16:qtrs P17:qtrs.
- Status: **Active**.
- Proposed: Galley (head cook). Duty: cooking system and food supplies.

**`penhallow` · Mister Penhallow** (Merchant (Prisoner); appearance `penhallow`; `data/npcs/phase2_crew.json`)
- Role and personality: Merchant prisoner (“Aldous Penhallow, of Penhallow and Daughters, cloth and fine goods. I wish to register a complaint.”). Appraises the ruined treasure in Chapter 7.
- Story presence: 16 lines in 3 chapters, first `ch4`, last `p8c3`. Ambient dialogue entries: 75 (added in Phase 9 and later: P9 2, P10 2, P11 1, P12 1, P13 1, P14 1). Behaviour: `stand`. Room whitelist: any room.
- Placement by phase: P2:qtrs P3:qtrs P4:qtrs P5:deck P6:deck P7:HOLD P8:HOLD P9:HOLD P10:HOLD P11:HOLD P12:HOLD P13:HOLD P14:HOLD P15:HOLD P16:HOLD P17:HOLD.
- Status: **Stranded in storage (Phases 7–17); no dialogue after Phase 14**.
- Proposed: The brig, or a trader’s stall once released. Duty: appraisal, trading and the cloth trade (sashes), tying into the Grand Currency economy. His prisoner status needs a story-compatible answer (keep him a prisoner with a cell, or a documented parole).

**`dunstan` · Dunstan** (Middle Watch; appearance `dunstan`; `data/npcs/phase2_crew.json`)
- Role and personality: Middle-watch sleeper. His last scene is running out of the washroom in a towel at three bells (Chapter 20, `data/story/cutscenes/phase5/ch20.json`). He stays placed in the quarters until the end of Phase 5, then is never placed again.
- Story presence: 3 lines in 2 chapters, first `ch4`, last `p5c1`. Ambient dialogue entries: 28 (added in Phase 9 and later: none). Behaviour: `stand`. Room whitelist: any room.
- Placement by phase: P2:qtrs P3:qtrs P4:qtrs P5:qtrs.
- Status: **Vanished after Phase 5 (no placement row matches later; no line explains it)**.
- Proposed: Night watch: asleep in his bunk by day, on deck at night. Shows the schedule system working. His towel exit can stay; give him a return line rather than a silent disappearance.

**`gristle` · Gristle** (Rigger; appearance `gristle`; `data/npcs/phase3_crew.json`)
- Role and personality: Gristle, rigger. The crew’s spokesman; blunt, union-minded (“We’ve been making a list.”).
- Story presence: 346 lines in 122 chapters, first `p3c1`, last `p17c16`. Ambient dialogue entries: 188 (added in Phase 9 and later: P9 14, P10 14, P11 9, P12 8, P13 13, P14 17, P15 18, P16 6, P17 10). Behaviour: `stand`. Room whitelist: any room.
- Placement by phase: P3:deck P4:deck P5:deck P6:deck P7:HOLD P8:HOLD P9:isle P10:galley P11:galley P12:galley P13:deck P15:deck P16:qtrs P17:qtrs.
- Status: **Active; unplaced at the Phase 14 milestone (every room’s first matching row hides him at `p14_complete`; intent unverified)**.
- Proposed: Mainmast and rigging. Duty: rigging, and crew spokesman for morale. Bunk: crew quarters.

**`pete` · Peg-Leg Pete** (Deckhand (formerly Night Watch); appearance `pete`; `data/npcs/phase4_crew.json`)
- Role and personality: Peg-Leg Pete, ex-night watch, reluctant “Grand Sharkmaster”, later Brogath’s keeper. 717 lines, the second-largest part.
- Story presence: 717 lines in 183 chapters, first `p4c1`, last `p17c17`. Ambient dialogue entries: 221 (added in Phase 9 and later: P9 18, P10 15, P11 9, P12 8, P13 14, P14 20, P15 27, P16 20, P17 17). Behaviour: `stand`. Room whitelist: any room.
- Placement by phase: P4:deck P5:deck P6:deck P7:HOLD P8:HOLD P9:isle P10:galley P11:galley P12:galley P13:deck P14:galley P15:galley P16:qtrs P17:qtrs.
- Status: **Active**.
- Proposed: Starboard rail with the spyglass. Duty: Shark Duty lead, and Brogath handler (keeper of the rules) from Phase 14.

### Arrivals in Phase 10

**`rusty_tom` · Rusty Tom** (Deckhand; appearance `rusty_tom`; `data/npcs/phase10_crew.json`)
- Role and personality: Rusty Tom, deckhand “since Portsmouth”; first to volunteer and sorry every time; holds the sash on the left.
- Story presence: 18 lines in 8 chapters, first `p10c8`, last `p12c15`. Ambient dialogue entries: 30 (added in Phase 9 and later: P10 11, P11 6, P12 7, P13 6). Behaviour: `stand`. Room whitelist: any room.
- Placement by phase: P10:galley P11:galley P12:deck.
- Status: **Vanished after Phase 12 (hidden by every placement row from Phase 13)**.
- Proposed: Sash-holder detail, then Fart Zone attendant from Phase 16 (door and queue rope). Seed him earlier as a background deckhand so his Phase 10 “introduction” isn’t a spawn.

**`barnacle_bill` · Barnacle Bill** (Deckhand; appearance `barnacle_bill`; `data/npcs/phase10_crew.json`)
- Role and personality: Barnacle Bill, old deckhand, NOT Barnacle Bob; says very little; holds the sash on the right.
- Story presence: 14 lines in 7 chapters, first `p10c8`, last `p12c2`. Ambient dialogue entries: 30 (added in Phase 9 and later: P10 11, P11 6, P12 7, P13 6). Behaviour: `stand`. Room whitelist: any room.
- Placement by phase: P10:galley P11:galley P12:galley.
- Status: **Vanished after Phase 12**.
- Proposed: Same detail as Rusty Tom (right-hand side); Fart Zone attendant. Seed as background crew from Phase 2.

### Supernatural residents and the reincarnated crew (Phases 14–17)

**`brogath` · Brogath the Bashful** (Ancient Grand Stenchmaster; appearance `brogath`; `data/npcs/phase14_brogath.json`)
- Role and personality: Brogath the Bashful, Ancient Grand Stenchmaster, returned in a cardboard cut-out (Chapter 148). Polite, embarrassed, dangerous.
- Story presence: 405 lines in 64 chapters, first `p14c3`, last `p17c17`. Ambient dialogue entries: 129 (added in Phase 9 and later: P14 46, P15 33, P16 24, P17 26). Behaviour: `stand`. Room whitelist: crew_quarters, galley, main_deck, stenchmaster_fart_zone, cargo_hold, fart_free_zone.
- Placement by phase: P14:qtrs P15:qtrs P16:qtrs P17:qtrs.
- Status: **Active (special)**.
- Proposed: Contained resident: the canopy in the old quarters, or the Fart Zone during procedures. See special rules.

**`ledger` · Ledger Billiam** (Treasurer (reincarnated); appearance `ledger`; `data/npcs/phase17.json`)
- Role and personality: Ledger Billiam, Brogath’s treasurer, reincarnated in cardboard (Chapter 208); party member.
- Story presence: 59 lines in 11 chapters, first `p17c4`, last `p17c17`. Ambient dialogue entries: 21 (added in Phase 9 and later: P17 21). Behaviour: `stand`. Room whitelist: crew_quarters, galley, main_deck, cargo_hold, fart_free_zone, stenchmaster_fart_zone, captains_quarters.
- Placement by phase: P17:qtrs.
- Status: **Active (Phase 17 only)**.
- Proposed: Counting desk by the bank counter. Duty: economy (converter, Grand Currency, treasury); party member.

**`tilda` · No-Nonsense Tilda** (First Mate (reincarnated); appearance `tilda`; `data/npcs/phase17.json`)
- Role and personality: No-Nonsense Tilda, Brogath’s first mate and navigator, reincarnated in cardboard; party member; singed from Chapter 217.
- Story presence: 74 lines in 11 chapters, first `p17c4`, last `p17c17`. Ambient dialogue entries: 22 (added in Phase 9 and later: P17 22). Behaviour: `stand`. Room whitelist: crew_quarters, galley, main_deck, cargo_hold, fart_free_zone, stenchmaster_fart_zone, captains_quarters.
- Placement by phase: P17:qtrs.
- Status: **Active (Phase 17 only)**.
- Proposed: Quarterdeck. Duty: drill master (combat training) and sailing master; documented rivalry with Hale over the helm.

**`bankworth` · Bankworth** (The Grand Bank (re-formed); appearance `bankworth`; `data/npcs/phase16.json`)
- Role and personality: Bankworth, the Grand Bank re-formed as a gentleman (Chapter 194).
- Story presence: 24 lines in 9 chapters, first `p16c9`, last `p16c20`. Ambient dialogue entries: 3 (added in Phase 9 and later: P16 3). Behaviour: `stand`. Room whitelist: crew_quarters.
- Placement by phase: P16:qtrs P17:qtrs.
- Status: **Active (special area)**.
- Proposed: Bound to the bank counter special area; present only while the bank is open.

**`branch_teller` · The Branch Teller** (Bashfulness Branch; appearance `branch_teller`; `data/npcs/phase15.json`)
- Role and personality: The Bashfulness Branch’s haze teller (Chapters 180–183).
- Story presence: 8 lines in 3 chapters, first `p15c11`, last `p15c14`. Ambient dialogue entries: 1 (added in Phase 9 and later: P15 1). Behaviour: `stand`. Room whitelist: crew_quarters.
- Placement by phase: never placed by a placement row (scene-spawned only).
- Status: **One arc by design**.
- Proposed: Bound to the branch counter; leaves in Chapter 183 by design.

**`vindicta` · Vindicta Thunderwaft** (Grand Stenchmistress (Unserved); appearance `vindicta`; `data/npcs/phase15.json`)
- Role and personality: Grand Stenchmistress Vindicta Thunderwaft the Unserved, a spectral customer who won’t dissolve (Chapter 185 onward).
- Story presence: 36 lines in 6 chapters, first `p15c16`, last `p16c20`. Ambient dialogue entries: 6 (added in Phase 9 and later: P15 2, P16 4). Behaviour: `stand`. Room whitelist: main_deck, crew_quarters, stenchmaster_fart_zone.
- Placement by phase: never placed by a placement row (scene-spawned only).
- Status: **Event-only (supernatural)**.
- Proposed: Spawns from the haze for her events only; never placed as resident crew. See special rules.

**`thunderbottom` · Lord Thunderbottom** (Lord Vaporious Thunderbottom the Seventh; appearance `thunderbottom`; `data/npcs/phase17.json`)
- Role and personality: Lord Vaporious Thunderbottom the Seventh, a spectral applicant (Chapters 218–219).
- Story presence: 25 lines in 2 chapters, first `p17c13`, last `p17c14`. Ambient dialogue entries: 3 (added in Phase 9 and later: P17 3). Behaviour: `stand`. Room whitelist: crew_quarters, main_deck, stenchmaster_fart_zone.
- Placement by phase: never placed by a placement row (scene-spawned only).
- Status: **Event-only (supernatural)**.
- Proposed: As Vindicta: haze-bound and event-only.

### Guests and animals (Phases 15–16)

**`visitor_one` · Stoner #1** (Visitor (out of the Sharkstorm); appearance `visitor_one`; `data/npcs/phase15.json`)
- Role and personality: Visitor out of the Sharkstorm: slow, philosophical, kind.
- Story presence: 53 lines in 13 chapters, first `p15c6`, last `p17c12`. Ambient dialogue entries: 36 (added in Phase 9 and later: P15 20, P16 9, P17 7). Behaviour: `stand`. Room whitelist: main_deck, galley, crew_quarters, fart_free_zone.
- Placement by phase: P15:deck P16:qtrs P17:qtrs.
- Status: **Active guest (Phases 15–17)**.
- Proposed: Guest berth: the bow corner built in Chapter 175, later the Sash Lounge. Duty: none required; optional trading and morale.

**`visitor_two` · Stoner #2** (Visitor (out of the Sharkstorm); appearance `visitor_two`; `data/npcs/phase15.json`)
- Role and personality: The other visitor: excitable, literal (“Bro.”).
- Story presence: 43 lines in 12 chapters, first `p15c6`, last `p17c12`. Ambient dialogue entries: 35 (added in Phase 9 and later: P15 19, P16 9, P17 7). Behaviour: `stand`. Room whitelist: main_deck, galley, crew_quarters, fart_free_zone.
- Placement by phase: P15:deck P16:qtrs P17:qtrs.
- Status: **Active guest (Phases 15–17)**.
- Proposed: As visitor_one.

**`agnes_second` · Agnes the Second** (Chicken; appearance `agnes_second`; `data/npcs/phase15.json`)
- Role and personality: Agnes the Second, a hen who parachuted out of the Sharkstorm (Chapter 181). Follows smells.
- Story presence: 11 lines in 7 chapters, first `p16c5`, last `p17c16`. Ambient dialogue entries: 12 (added in Phase 9 and later: P15 3, P16 3, P17 6). Behaviour: `wander`. Room whitelist: crew_quarters, galley, main_deck, stenchmaster_fart_zone, fart_free_zone.
- Placement by phase: P16:qtrs P17:FFZ.
- Status: **Active (wanders)**.
- Proposed: Coop beside Brogath’s canopy. Mechanic: a lure animal that follows the strongest smell (used in Phase 17).

### Named one-scene spectral customers with lines

**`whifflebottom` · Lady Whifflebottom** (Bashfulness Branch customer; appearance `branch_whifflebottom`; `data/npcs/phase15_branch.json`)
- Role and personality: Grand Lady Whifflebottom, a branch customer with an emergency loan (Chapter 184).
- Story presence: 14 lines in 1 chapters, first `p15c15`, last `p15c15`. Ambient dialogue entries: 0 (added in Phase 9 and later: P15 0). Behaviour: `stand`. Room whitelist: crew_quarters.
- Placement by phase: never placed by a placement row (scene-spawned only).
- Status: **One scene by design**.
- Proposed: Queue system only.

**`puffchester` · Lord Puffchester** (Lord Nicotinius Puffchester the Third; appearance `puffchester`; `data/npcs/phase16.json`)
- Role and personality: Lord Puffchester, the Bureau of Ceremonial Ignition’s first applicant (Chapters 203–205).
- Story presence: 7 lines in 2 chapters, first `p16c18`, last `p16c20`. Ambient dialogue entries: 1 (added in Phase 9 and later: P16 1). Behaviour: `stand`. Room whitelist: crew_quarters.
- Placement by phase: never placed by a placement row (scene-spawned only).
- Status: **One arc by design**.
- Proposed: Bureau counter only.

**`rancidella` · Lady Rancidella** (Grand Credit Applicant; appearance `rancidella`; `data/npcs/phase16.json`)
- Role and personality: Lady Rancidella, credit applicant (Chapter 196).
- Story presence: 2 lines in 1 chapters, first `p16c11`, last `p16c11`. Ambient dialogue entries: 2 (added in Phase 9 and later: P16 2). Behaviour: `stand`. Room whitelist: crew_quarters.
- Placement by phase: never placed by a placement row (scene-spawned only).
- Status: **One scene by design**.
- Proposed: Queue system only.

**`bureau_puffington` · Mrs. Puffington** (Customer; appearance `bureau_puffington`; `data/npcs/phase16.json`)
- Role and personality: Mrs. Puffington, spectral customer.
- Story presence: 4 lines in 1 chapters, first `p16c20`, last `p16c20`. Ambient dialogue entries: 1 (added in Phase 9 and later: P16 0, P17 1). Behaviour: `stand`. Room whitelist: crew_quarters.
- Placement by phase: never placed by a placement row (scene-spawned only).
- Status: **One scene by design**.
- Proposed: Queue system only.

**`spectral_customer` · A Customer** (Bashfulness Branch; appearance `spectral_customer`; `data/npcs/phase15.json`)
- Role and personality: Last-second customers at the closing branch (Chapter 184).
- Story presence: 5 lines in 1 chapters, first `p15c15`, last `p15c15`. Ambient dialogue entries: 0 (added in Phase 9 and later: P15 0). Behaviour: `stand`. Room whitelist: crew_quarters.
- Placement by phase: never placed by a placement row (scene-spawned only).
- Status: **One scene by design**.
- Proposed: Queue system only.

### Silent queue customers (one scene by design)

These have no lines in chapter scripts and no ambient dialogue entries; what they say at the window comes from the queue data (`data/story/bank/customers.json`, `customers_branch.json` and `customers_counter.json`, with the counters in `grand_bank.json`, `bashfulness_branch.json` and `grand_counter.json`). They are the queue for the teller-style minigames, are drawn from the haze, and are meant to dissolve. They are not crew and need no station; they belong to the queue system.

- `data/npcs/phase14_bank.json`: `windabella` (The Duchess), `gassius` (Sir Gassius), `rumblewaft` (Lady Rumblewaft), `puffington` (Lord Puffington), `breezella` (Breezella), `gustavius` (Little Grand Gustavius), `puffalina` (Puffalina), `ventworth` (Dr. Flatulon Ventworth), `windledger` (Madame Windledger), `gasbeth` (Captain Gasbeth), `thundergut` (Baron Thundergut), `duke_puff` (Duke Puff), `wind_twins` (The Grand Wind Twins), `rumpington` (Grand Duke Rumpington), `beatrice` (Beatrice), `gary` (Gary), `zephyrella` (The Empress), `rumbleseptimus` (The Patriarch), `gustilda` (Grandmother Gustilda)
- `data/npcs/phase15_branch.json`: `gasimir` (Duke Gasimir), `flatulencia` (Countess Flatulencia), `billowmere` (Baron Billowmere), `puffenstein` (The Dowager), `boomington` (Grand Lord Boomington), `whistlewaft` (Duchess Whistlewaft), `fumblebottom` (Sir Fumblebottom), `wind_brothers` (The Wind Brothers), `boomboom` (Grandmother Boom-Boom), `rumblequill` (Professor Rumblequill), `flapworthy` (Lady Flapworthy), `thunderpants` (Admiral Thunderpants), `farthelmew` (Emperor Farthelmew)
- `data/npcs/phase16.json`: `disp_wheezeworth` (Earl Wheezeworth), `disp_mildew` (Madame Mildew), `disp_stalebreath` (Sir Stalebreath), `disp_draftly` (The Draftly Twins), `disp_fumble` (Brother Fumble), `credit_rottingham` (Baron Rottingham), `credit_mustyhem` (Dame Mustyhem)

### Name echoes (intentional, keep them distinct)

- Barnacle Bob / Barnacle Bill: an explicit joke (“no relation, and he would like that known”).
- Vindicta Thunderwaft / Lord Thunderbottom: an explicit joke (“no relation, he says, loudly”).
- One-Eyed Ned / Wobbly Ned (ancient crew lore). Lord Puffington (`puffington`, bank queue) / Mrs. Puffington (`bureau_puffington`) / Lord Puffchester.
- Two cooks (Mags, Jim), two first mates (Hale, Tilda), two bookkeepers (Quill, Ledger). These pairs are already comic rivalries in the dialogue. The plan below gives each person a distinct job instead of merging them.

No two NPCs share an appearance id, and the merged content reports no speaker-id collisions (`speakerErrors: 0`).

## About “content tied to a borrowed character”

The request asks for special handling of content tied to a borrowed character name. This repository forbids that name: `tests/bannedNames.js` scans the whole project for it (the pattern is stored base64-encoded, and its comment calls it “the source’s lead character (the game’s captain has his own name)”). The scan passes today, so no content uses it. In this game the stand-in roles are original characters: the captain is Captain Stinkbeard, and the gas-powered businessman is Garrick Grumblegut. Garrick was renamed and given his own look in commit `7c66594`, and `docs/STORY_PHASE9.md` says “no plumbers and no borrowed palettes for Garrick”. I found no separate NPC, item, map or scene for the borrowed character, so its special rules are Garrick’s rules below. **Uncertain:** if a separate character is intended, it does not exist in the repository yet and would have to be designed under the banned-name rule.

## Crew-integration redesign (proposal)

### Principles

1. **Every named crew member gets a station, a bunk and a duty.** These live in one roster table (proposed `data/crew/roster.json`) read by a new crew system, not spread across hundreds of per-chapter placement rows. Today there are 1,692 NPC rows on the main deck, 1,139 in the galley, 898 in the crew quarters and 496 in the Fart-Free Zone.
2. **Story scenes still win.** The existing placement rows keep their priority (first match wins), so every scene that needs someone somewhere still gets them. The roster supplies the default only when no scene row matches. This needs no story rewrite and keeps every trigger working.
3. **A watch schedule,** with day/evening/night as a saved story value, chooses between station, mess and bunk using the existing `routine` behaviour (`src/world/NpcBrain.js`, used by only 6 placements today). Crews move with a purpose instead of standing still.
4. **Storage is for cargo.** The cargo hold keeps Quill’s stores office and Jory’s bench, both legitimate work places, and nobody lives there except during the story’s own sheltering scenes (Phases 7–9).
5. **Crew conditions feed gameplay.** States such as tired, injured, gassed, mellow, panicked and confined come from story events and existing story values. They change how well a station works, and Fennimore’s sick bay cures them.
6. **Late arrivals are seeded, not spawned.** Characters the story calls long-serving (Gristle, Pete, Rusty Tom, Barnacle Bill) appear as non-speaking background crew from Phase 2, at their future stations. Pete is asleep in a hammock, which matches his own lore. No dialogue changes.
7. **Exits get a line.** Dunstan, Rusty Tom and Barnacle Bill get a visible place or an explicit, in-character absence (on watch, in the Fart Zone queue) instead of vanishing.

### Proposed stations (all phases after the crew leave the hold)

| Station | Room (current map) | Crew | Duty / system it feeds |
|---|---|---|---|
| Helm and quarterdeck | main_deck (stern) | Hale; Tilda (from P17); Nell (chart table) | Course dial, helm events, crew-station orders, navigation and forecasts |
| Rigging and mainmast | main_deck (midships) | Gristle, Rook | Sail and rigging integrity, storm crises |
| Gun deck | main_deck (port and starboard cannons) | Brask (+ Bob) | Naval encounters, shark repelling |
| Shark watch | main_deck (starboard rail) | Pete (lead), Ned | Shark Duty, sightings |
| Lookout | main_deck (bow and telescope) | Ned, Finch (sitting watch) | Forecasts, early warnings |
| Deck cleaning | main_deck | Sully | Deck condition, fume residue |
| Galley | galley | Jim (head), Mags | Cooking, morale meals, supplies |
| Stores office | cargo_hold (by the stores) | Quill | Resource economy, rules board |
| Carpenter’s bench | cargo_hold (by the stairs) | Jory | Ship Integrity repairs, planks |
| Sick bay | crew_quarters (cot corner) | Fennimore | Injuries, knock-out recovery, conditions |
| Runner | cabin ↔ deck ↔ galley (routine) | Wick | Hints, fetching items |
| Brig / trader’s stall | cargo_hold or a new compartment | Penhallow | Appraisal, trading, cloth |
| Night watch | main_deck at night; bunk by day | Dunstan | Night events (the schedule demonstrator) |
| Sash detail → Fart Zone attendants | main_deck → stenchmaster_fart_zone | Rusty Tom, Barnacle Bill | Sash holding (P10–12), Fart Zone door and queue (P16+) |
| Brogath’s canopy | crew_quarters (old quarters) | Brogath, Agnes the Second | Brogath Pressure; containment |
| Counting desk and bank counter | crew_quarters (counter end) | Ledger; Bankworth (when open) | Economy, converter, teller shifts |
| Garrick’s office | wherever the story puts his chair and Mark II | Garrick | Atmosphere source; labour-rule events |
| Guest berth / Sash Lounge | main_deck bow → crew_quarters lounge | The two visitors | Optional trading and morale |
| Companion | captain’s cabin basket / chest pouch | Squawks | Warning squawks |

### Living arrangements

- **Crew quarters** (rebuilt in the story itself, Chapters 129–131) become the permanent berth for the deck crew. Bunk assignment is data: one bunk per crew member, and sleeping poses already exist (`hammock`, `bedroll`, `asleep`).
- **Aft berth** for the officers (Hale, Nell, Tilda): the aft end of the quarters, or a new small compartment (see `03-ship-layout-audit.md`).
- **Galley** sleeping (Phases 10–12) and **hold** sleeping (Phases 7–9) stay as story states. When those arcs end, the roster takes over again.

### Introducing later characters properly

| Character | How they arrive (existing chapter) | Where they go afterwards | What they do aboard |
|---|---|---|---|
| Garrick | Hauled out of a bathtub (Ch 1) | Probationary hammock → his chair and office | Atmosphere hazard, labour-rule events |
| Squawks | Already aboard; first story beat Ch 1 | Basket in the cabin | Companion, warnings |
| Gristle | First speaks Ch 9 (p3c1) | Seed as rigging crew from Phase 2 | Rigging, morale spokesman |
| Pete | First speaks Ch 15 (p4c1), the sleeper | Seed asleep in a hammock in Phases 2–3 | Shark watch, Brogath keeper |
| Rusty Tom, Barnacle Bill | Drawn for sash duty Ch 88 (p10c18) | Seed as background deckhands from Phase 2 | Sash detail → Fart Zone attendants |
| Brogath | Into the cut-out, Ch 148 | Containment corner → canopy | Pressure system |
| The visitors | Spat out of the storm, Ch 175 | Bow corner → Sash Lounge | Guests |
| Agnes the Second | Parachute, Ch 181 | Brogath’s canopy (coop) | Lure animal |
| Bankworth | Re-formed from the takings, Ch 194 | Bank counter (special area) | Economy |
| Ledger, Tilda | Cut-outs come alive, Ch 208–209 | Counting desk; quarterdeck | Economy; drills and navigation; party |
| Vindicta, Thunderbottom | Out of the haze, Ch 185 and Ch 218 | Nowhere: event-only | Supernatural set-pieces |

### Special rules for unusual characters

- **Garrick Grumblegut.** He is not crew, he is the Office. He never takes a duty station, which preserves “It isn’t a Stenchmaster duty.” He is an Atmosphere source: his Suit puffs, release pressure and the Grand Feast charge become one “release pressure” value read by the Atmosphere system. Crises can invoke the emergency labour rule (Ch 35) as a mechanic: a limited-use order that forces him to help, at a morale or comedy cost. Where he can be is limited to his office and the rooms a scene puts him in; he never wanders freely during hazard sequences.
- **Brogath the Bashful.** He is contained, never stored: the canopy, the containment corner or the Fart Zone. Brogath Pressure (`src/systems/stability.js`) is his state, and flutter, embarrassment, praise and relaxation move it as today. He is cardboard, so he is vulnerable to water (the codex’s dispersal rule) and wind (Ch 167), which hazards must respect. Agnes the Second calms him. No crew station may sit within his flutter radius.
- **Ledger and Tilda.** Cardboard party members with the existing traits and stagger (`data/story/traits.json`): weak to water and wind, flat. They hold real stations (counting desk, quarterdeck). The Tilda/Hale helm rivalry stays a rivalry: Tilda’s orders are a crisis event, not a takeover.
- **Vindicta, Thunderbottom and other spectres.** They spawn from the haze at the counter or on deck for their events, are bound to the special area they serve, and dissolve afterwards. They are never in the roster and never placed by default.
- **The haze tellers and queue customers.** Owned by the queue system for each special area, never placed by the roster.
- **Squawks and Agnes.** Animals: no station, but a home spot and follow rules. Squawks follows the captain on missions; Agnes follows the strongest smell, which is how the Phase 17 lure works.

## Proposed final roster (after the overhaul)

| Crew | Station | Bunk | Schedule | Phase present |
|---|---|---|---|---|
| Hale | Quarterdeck | Aft berth | Day + evening | All |
| Quill | Stores office (hold) | Quarters | Day | All |
| Mags | Galley | Quarters | Day + evening | All |
| Fennimore | Sick bay (quarters) | Quarters | Day; on call at night | All |
| Brask | Gun deck | Quarters | Day | All |
| Nell | Chart table | Aft berth | Day | All |
| Wick | Runner | Hammock by the cabin | Day | All |
| Rook | Rigging / capstan | Quarters | Day | All |
| Sully | Deck cleaning | Quarters | Day | All |
| Finch | Bow (sitting watch) | Quarters | Day | All |
| Jory | Carpenter’s bench (hold) | Quarters | Day | All |
| Penhallow | Brig / stall | Brig | Confined / day | P2 on |
| Dunstan | Night watch | Quarters (by day) | Night | P2 on |
| Bob | Deck hand / gun deck | His net (quarters) | Day | P2 on |
| Ned | Lookout | Quarters | Day | P2 on |
| Jim | Galley (head cook) | Galley corner / quarters | Day + evening | P2 on |
| Gristle | Rigging | Quarters | Day | seeded P2, speaks P3 |
| Pete | Shark watch | Quarters | Day; was night | seeded P2, speaks P4 |
| Rusty Tom | Sash detail → Fart Zone | Quarters | Day | seeded P2, speaks P10 |
| Barnacle Bill | Sash detail → Fart Zone | Quarters | Day | seeded P2, speaks P10 |
| Garrick | Office (special) | His hammock | His own | P2 on |
| Squawks | Companion | Basket | Follows | All |
| Brogath | Canopy (contained) | Canopy | Contained | P14 on |
| Agnes the Second | Coop by the canopy | Coop | Wanders | P15 on |
| Ledger | Counting desk | Quarters | Day | P17 |
| Tilda | Quarterdeck (drills) | Aft berth | Day | P17 |
| Visitors (2) | Guest berth / lounge | Guest berth | Lounge | P15 on |
| Bankworth | Bank counter (special area) | – | Banking hours | P16 on |

## Acceptance criteria for the crew work (later prompts)

- No NPC who is not in a sheltering scene stands in the cargo hold at any phase-complete preset, except Quill and Jory at their work places. Checked by a test that evaluates placements at all 17 presets, the same way this audit did.
- Every NPC in the roster table is placed somewhere (or is on documented duty elsewhere) at every preset after their introduction. No silent disappearances: Dunstan, Rusty Tom and Barnacle Bill are covered.
- Every existing story placement row still wins over the roster defaults. The per-phase story walkers (`tests/phase*_story.test.js`, `tests/phase10Play.js` … `tests/phase17Play.js`) and `tests/storyStaging.js` pass unchanged.
- No line of dialogue is deleted. New lines only fill gaps (exits, stations) and pass the banned-name scan and the text-fit test (`tests/textfit.test.js`).
- The number of NPC placement rows per room falls, because defaults move to the roster. Target: below a third of today’s count for the main deck, galley and quarters.

Source paths: `data/npcs/*.json`, `data/characters/`, `data/story/ancient_crew.json`, `data/maps/ship/*.json` and `data/maps/ship/phase*/` (placement rows), `src/world/placements.js`, `src/world/NpcBrain.js`, `src/world/worldServices.js`, `src/debug/presets.js`, `tests/storyStaging.js`, `tests/placements.test.js`.
