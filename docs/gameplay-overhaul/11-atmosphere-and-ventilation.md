# 11 · Atmosphere: air per room, ventilation, containment and exposure (Prompt 7)

Prompt 7 gave the ship real air. Each room holds its own mix of gases. Gas moves only through the ship's actual openings (doors, hatches, stairs, portholes, the open sky over the deck), sources pour it in for as long as they last, and ventilation takes it off the ship for good. The captain breathes the air of the room he is in: his exposure rises in bad air, slows his work and his walking, makes him cough, and at the worst costs HP. He fights back from the room he is in: checking the air, shutting doors, sealing them, opening portholes.

It is built on what is there. The air lives in the ship's state beside the Prompt 6 hazards ([10-flooding-and-fire.md](10-flooding-and-fire.md)), moves on **the same hazard clock**, uses the same Respond button, HUD line and Ship page, the same retry-safe event ids, checkpoints and saves, and the same difficulty presets ([08-difficulty-and-accessibility.md](08-difficulty-and-accessibility.md)). It is not a second clock, a second exposure meter or a second difficulty switch.

**No existing chapter has been opted in, and the legacy fume scenes behave exactly as before.** No chapter, quest, map or NPC script starts a gas source, adds gas, opens, shuts or seals an opening, reads the air, or lights a smoky fire. The campaign's fumes are still the legacy fume zones ([section 9](#9-existing-fume-zone-compatibility)), unchanged, and every phase snapshot breathes clean air (`tests/atmosphere.test.js`, "the campaign is unchanged").

| | Implemented now | Planned (hooks only) |
|---|---|---|
| Air per room: substances, sources, propagation through real openings, venting, decay | yes | named supernatural gases (8, 9, campaign prompts) |
| Openings: open, closed, sealed, damaged; containment and ventilation as player actions | yes | door, hatch and porthole objects (layout prompts 12–19) |
| The captain's exposure: stages, slower work and walking, coughing fits, HP at the worst, recovery | yes | crew exposure (20–26), Beard Saturation (9) |
| Difficulty, the fume hazard option, protection (wet cloth, Frog Grog) | yes | gear that filters air |
| Smoke from fire (opt-in), flooding blocks work on openings | yes | combustion, pressure events, visibility |
| Checkpoints, retry-safe gas events, save v20 | yes | – |
| HUD line, AIR meter, Respond, Check the air, room haze, the Ship page | yes | – |
| Legacy fume zones moved onto the air | **no** | each chapter's own campaign prompt |

Architectural limits found in the preflight (they shaped the design):

- The legacy fumes are tile rectangles per map, filtered by story state, and their exposure is per play and never saved: they share nothing with a room graph.
- `src/systems/atmosphere.js` and the `atmosphere` script command (Story Phase 15) are an authored ship-wide story value with consequences, not a simulation. To keep the two apart, the new system is called **air** in code (`session.ship.air`, `air*` commands, the `air` condition).
- There are no door, hatch or porthole objects to walk up to in the current maps, and the ship's rooms will be redesigned. Openings are therefore data keyed by stable ids, worked from the room they are in.

## 1. Atmosphere data model

Everything is data in `data/ship/air.json` (ContentDB key `shipAir`), validated at load (`airDataProblems` in `src/systems/ship/air.js`, the step and condition checks in `validateContent`). Everything is keyed by **room ids (map ids) and opening ids, never by tiles**, so the layout redesign can move doors and portholes without touching a save; the validator rejects any `x`, `y` or `tiles` field.

The state is `AirState` (`src/systems/ship/AirState.js`), owned by the ship (`session.ship.air`) and saved inside the `ship` domain:

```js
{
  gas:     { crew_quarters: { vapor: 63.4, smoke: 8.2 }, galley: { heavy_gas: 12 } },  // quantity per room per substance (absent = none)
  sources: [{ id: 'src_1', room: 'crew_quarters', substance: 'vapor', rate: 4, left: 148, ticks: null, label: 'a cracked cask', source: 'debug' }],
  links:   { galley_door: { state: 'closed' }, washroom_door: { state: 'sealed' }, fore_hatch: { state: 'closed', damaged: true } },  // only openings not at their default
  exposure: 42.7,  // the captain's lungs, 0 to 100
  next: 2,         // the next source id number
}
```

Per room, the record has what the prompt asked for: the composition (the `gas` entry), its openings and their states (`links` over the data's defaults), its exchange with the outside (the openings to `outside`), the sources pouring into it, and, derived each time it is read (`airIn(room)`), its total concentration, its index (the harm a second of it does), its quality, its worst substance and whether it is rising or falling. The captain's exposure is one number. Nothing derivable is stored: quality, trend and rates come from the data each tick.

**Rooms** (volume: how much air; level: 0 weather deck, 1 between decks, 2 the hold):

| Room | Volume | Level | To the outside |
|---|---|---|---|
| `main_deck` | 600 | 0 | the open sky (always open) |
| `captains_quarters` | 120 | 0 | the stern windows |
| `crew_quarters` | 200 | 1 | the quarters porthole |
| `galley` | 160 | 1 | the galley porthole |
| `washroom` | 60 | 1 | the washroom porthole |
| `stenchmaster_fart_zone` | 100 | 1 | the Fart Zone portholes |
| `cargo_hold` | 260 | 2 | none (below the waterline) |
| `treasure_hold` | 140 | 2 | none |
| `fart_free_zone` | 50 | 2 | none |

## 2. Substance registry

A small generic registry (`substances`), enough to prove propagation and effects. Each substance has a label and short label, a colour (the room's haze), a **safe** concentration below which it does no harm, a **potency** (exposure per second per point above safe), a **decay** (share lost per second on its own), a **vent** factor (how readily it leaves through an opening to the outside), and, for a heavy gas, **sink** and **rise** (how much faster it flows down a level, how much slower up).

| Substance | Safe | Potency | Decay /s | Vent | Notes |
|---|---|---|---|---|---|
| `smoke` (Smoke) | 15% | 0.06 | 0.004 | 1 | ordinary smoke; fires can make it (opt-in) |
| `vapor` (Irritating vapor) | 8% | 0.12 | 0.0015 | 1 | the demo's cracked cask |
| `heavy_gas` (Heavy gas) | 4% | 0.2 | 0 | 0.5 | sinks (down ×1.5, up ×0.25); only ventilation clears it |

Substances coexist: a room can hold smoke, vapor and heavy gas at once, each its own quantity, never overwriting the others. A new substance is a data entry (the validator checks its numbers); the Stenchmaster varieties will be entries with their own properties ([section 17](#17-future-stenchmaster-gas-integration)).

## 3. Concentration units and limits

- A room's **quantity** of a substance is in units; its **concentration** is `quantity / volume × 100` (percent of the room's air).
- All substances together never exceed **100%** of a room: gas added to a full room doesn't go in (a source into a full room waits, its remaining amount untouched); a transfer never pushes a room past full.
- Nothing is ever negative. A quantity that falls below **0.005 units** (a trace) is cleared (counted as decayed), so a room aired out reaches exactly clean and no residue raises alerts forever.
- **Quality** from the room's **index** (the sum over substances of `(percent − safe) × potency` where above safe: the exposure a second of that air gives): **clean** (under 1% of anything), **hazy** (gas, all under its safe level: harmless), **foul** (any index), **toxic** (index 1.5+), **deadly** (index 4+). "Safe to enter" means index 0.
- A **source** has a rate (at most 20 units a second) and must end: an amount, seconds (at most 600), or both. At most 12 sources at once; one id once.
- Bad data loading is clamped or dropped with a warning ([section 10](#10-save-migration)).

## 4. Propagation and conservation

Each hazard tick (one second), in this order (`AirState.tick`):

1. **Sources** pour their rate (or what's left of their amount) into their rooms.
2. **Fires that make smoke** (opt-in) add `intensity × 0.05` smoke a second to their room.
3. **Every opening, in data order**, moves gas:
   - between two rooms, for each substance, `rate × (concentration difference) × the smaller room's volume`, from the richer side to the poorer; never past the point where both sides are level (at most half the way there in one tick) and never into a full room. Heavy gas moves `sink` times faster down a level and `rise` times slower up one. **What leaves one room arrives in the other.**
   - to the outside, `rate × ventScale × vent` of each substance in the room **leaves the ship** (counted as vented).
4. **Decay**: each substance loses its decay share (counted as decayed); traces are cleared.
5. The captain breathes ([section 6](#6-player-exposure-and-recovery)).

**Conservation** (tested over 400 seconds of sources, three substances and openings toggling): for every substance, what is aboard plus what has been vented plus what has decayed equals what was poured in, to 6 decimal places. No room ever holds a negative quantity or more than all its air; nothing is duplicated; twenty seconds of frames at 30, 60 or 144 fps, or in 50 ms frames, give exactly the same air as twenty direct ticks (the clock gives whole ticks, [section 8](#8-clock-and-pause-rules)). A room aired out ends exactly clean, and the notices stop.

Gas never teleports: every connection between two rooms is a real doorway (a map warp between them, checked by the validator), and a room shut off from the rest keeps what it has (only its own decay changes it). It never generates gas once its sources end: a room contaminated once doesn't stay a source.

What the openings do, measured (`tests/atmosphere.test.js` and the probes; a cask pouring 3 units a second for a minute into the crew quarters, everything else at its default):

| The quarters' openings | Quarters (worst) | Washroom (worst) | Galley (worst) |
|---|---|---|---|
| all open (the fore hatch carries it up to the deck, which vents fast) | 12% foul | 11% foul | 6% hazy |
| the galley and washroom doors shut, the hatch open | 17% foul | 4% hazy | 2% hazy |
| only the fore hatch shut (the doors open: nowhere up to the deck) | 24% toxic | 22% toxic | 12% foul |
| everything sealed | 86% deadly (still 72% after 3 minutes) | 0 | 0 |
| the doors shut, the porthole open | 23% toxic, then clear by 2 minutes | 6% hazy | 1% |

## 5. Ventilation and containment

**Kinds of opening** (`kinds`), with how much air each passes per second in each state:

| Kind | Open | Closed | Sealed | Changing it takes |
|---|---|---|---|---|
| door | 0.10 | 0.006 (the gaps) | 0 | 1 s |
| hatch | 0.08 | 0.004 | 0 | 2 s |
| stairs | 0.08 | – (can't be shut) | – | – |
| porthole (to outside) | 0.05 | 0 | – | 2 s |
| windows (to outside) | 0.07 | 0 | – | 2 s |
| open sky (to outside) | 0.25 | – (always open) | – | – |

A **damaged** opening leaks 0.04 more whatever its state, and can't be sealed (damage tears a seal: it is closed again).

**The openings** (stable ids; a save stores only those changed from their defaults):

| Id | Between | Kind | Default |
|---|---|---|---|
| `cabin_door` | main deck, captain's quarters | door | open |
| `main_hatch` | main deck, galley | hatch | open |
| `fore_hatch` | main deck, crew quarters | hatch | open |
| `fz_hatch` | main deck, Stenchmaster Fart Zone | hatch | open |
| `galley_door` | galley, crew quarters | door | open |
| `washroom_door` | crew quarters, washroom | door | open |
| `hold_stairs` | galley, cargo hold | stairs | open |
| `treasure_door` | cargo hold, treasure hold | door | open |
| `ffz_door` | cargo hold, Fart-Free Zone | door | open |
| `open_sky` | main deck, outside | sky | open |
| `stern_windows` | captain's quarters, outside | windows | closed |
| `quarters_porthole`, `galley_porthole`, `washroom_porthole`, `fz_portholes` | the room, outside | porthole | closed |

**What the captain does** (Respond, V or pad X, in the room; `airOptions` in `src/systems/ship/airResponse.js`, which the Respond choice, the commands and the Ship page all use):

1. **Check the air**: the room's quality and trend, what is in it, the source pouring into it, its openings and their states, the other rooms with bad air, his own lungs, in the dialogue box (no time passes while reading).
2. **Open / close** one of this room's doors, hatches, portholes or windows: its seconds of hazard time (longer in deep water and with bad lungs), the gas going on meanwhile.
3. **Seal** a closed door or hatch: a sailcloth and a nail, on the repair bar (the `ship_repair` profile: a failed try wastes a nail, "Try again" keeps the waste; materials only on success). Not when it is damaged.
4. **Unseal** it again (back to closed: 2 s, the cloth is spoiled).

Only the openings of the room he stands in are offered: no hatch is worked from across the ship, and the Ship page sends him to the room ("Go there to deal with it."). An action that can't be done is listed with its reason ("Already at work.", "Too deep to work in the Crew Quarters: pump it down first.", "The galley door is damaged: it won't seal.", "Not enough: Sailcloth 0/1.").

**The tradeoffs are real** (scenario A and the table in section 4): opening the quarters to the deck dilutes them fastest but puts the gas on deck (and, with every door open, into the washroom); shutting the doors keeps the neighbours clean but leaves the quarters foul until aired; sealing holds it all in, dangerous, for minutes; the porthole clears the room without spreading it, slowly; walking in to do any of it costs breath.

**Physical controls the layout redesign must add** (prompts 12–19): door objects for the cabin door (main deck 9,11), the galley door, the washroom door, the treasure door and the Fart-Free Zone door; hatch covers at the main hatch (9,24) and the fore hatch (9,33) and the Fart Zone grating (9,17); porthole latches in the quarters, the galley, the washroom and the Fart Zone, and the stern windows. Each runs `{ "airControl": id, "state": ... }` or `{ "airSeal": id }`, and the room-wide Respond list stays as a fallback.

## 6. Player exposure and recovery

The captain's **exposure** (0 to 100) is what he has breathed, not what the room holds. Each second he is free (or working) in a room, it **rises by the room's index** × the difficulty's `exposureScale` × his protection ([section 7](#7-difficulty-and-accessibility-behavior)); in air with nothing above its safe level it **falls**, 5 a second in clean air, 2 in hazy air (× `recoveryScale`). Ventilating a room doesn't clear his lungs; leaving it stops any more building up, and they clear gradually.

| Stage | From | Work takes | Walking | Coughing fits | HP |
|---|---|---|---|---|---|
| Clear | 0 | ×1 | ×1 | – | – |
| Mild | 15 | ×1 | ×1 | – | – |
| Impaired | 35 | ×1.25 | ×1.2 slower | – | – |
| Dangerous | 60 | ×1.5 | ×1.4 slower | every 6 s | – |
| Critical | 85 | ×1.75 | ×1.6 slower | every 4 s | −1 every 3 s, never below a quarter of his maximum |

- **Work** is every emergency action (patch, pump, bail, douse, the openings): `workFactor` multiplies the flood stage by the lungs.
- **A coughing fit** stops him where he stands for a moment (`air:cough`; the first comes on reaching the stage, as a warning), never during a scene.
- **HP** is the party leader's (the existing `Character.hp`, no new health model), lost only at Critical, first after 3 s there (time to get out), never below 25% of his maximum and never to 0: bad air never kills.
- In 40% vapor (toxic) his lungs go from clear to full in about half a minute (34 s); out on deck they clear in 20 s.

**Fairness**: nothing hits without warning. The HUD line names bad air in any room before he goes in; walking into a room with harmful air shows a toast ("TOXIC air in here: VAPOR 24%. Don't linger."); the AIR meter shows the air where he stands in words and his lungs as a bar; the room is tinted in the gas's colour and thickens with its quality; each stage change is a toast; the first coughing fit comes as he reaches Dangerous; HP only goes at Critical, after 3 s, never to 0.

## 7. Difficulty and accessibility behavior

The one difficulty system: each preset's `ship` block (`shipTuning`, bounds 0.5–1.5). It scales **the captain's risk and his ventilation, never how gas moves between rooms** (so containment always works the same way):

| | Deckhand | Captain | Brutal |
|---|---|---|---|
| `exposureScale` (what a second of bad air does to him) | 0.6 | 1 | 1.35 |
| `recoveryScale` (how fast his lungs clear) | 1.4 | 1 | 0.75 |
| `ventScale` (what an opening to the outside clears) | 1.25 | 1 | 0.85 |
| Seal fumbles allowed (`ship_repair`) and costs (`costScale`) | 3, ×0.5 | 2, ×1 | 1, ×1.5 |

Tested: one tick of gas moving between rooms is identical on all three; venting and exposure differ by their scales.

**Accessibility** stays separate:

- **The fume hazard option** (normal / Gentle / Off, per device, never in a save) keeps its documented behavior for the legacy fumes and also scales how fast the ship's air **builds his exposure** (Gentle ×0.5, Off none). It never changes the air itself: the gas moves, vents and shows the same.
- **Protection** the legacy fumes honour protects from the air too: the wet cloth (`rescue_gear_on`, ×0.7) and a swig of Frog Grog (its fume ward).
- **Reduced effects** only stills the presentation (no wisps, a steady haze); the simulation is the same.
- **Never colour alone**: every state is a word (CLEAN, HAZY, FOUL, TOXIC, DEADLY; MILD, IMPAIRED, DANGER, CRITICAL), on the HUD line, the meter, the report and the Ship page; the haze and the sounds only add to them.

## 8. Clock and pause rules

**One clock.** Prompt 6's `HazardClock` now advances `ship.tick()`, which ticks the hazards then the air, while anything environmental is active (`ship.envActive`). The three places hazard time passes are unchanged: the world while the captain is free, emergency work tick by tick, and the `hazardClock` step on purpose.

| Situation | Air and exposure |
|---|---|
| Free in the world | move |
| Emergency work (pump, patch, open, close, seal, unseal...) | move, tick by tick, inside the action |
| Dialogue, a choice (Respond's too), Check the air, a cutscene | stopped |
| A timing bar (a seal or patch attempt) and its retry choice | stopped |
| The pause menu, the Ship page, any menu, a battle | stopped (the world scene is paused) |
| A room transition, the F2 panel | stopped |
| A checkpoint restore, a save, a load | no time passes; nothing is owed or replayed |

So **the captain never takes atmospheric damage in a cutscene or a paused interface**: no tick runs there. A specially authored encounter that should go on during a scene uses `hazardClock` explicitly (no current chapter does). Determinism: whole ticks only, at most 3 a frame, no frame-rate term anywhere ([section 4](#4-propagation-and-conservation)).

## 9. Existing fume-zone compatibility

The legacy fumes (`src/systems/hazards/fumes.js`, `FumeLayer`, `data/hazards/fumes.json`, the Dead Center, the room hazes, the Phase 15 atmosphere states, the Fart Zone's door and portholes) **are untouched and keep their behavior**:

- their zones, exposure rates (light 0, dense 11, center 32 a second), collapse and the scripts that carry the captain out are the same code and data;
- the Phase 15 `atmosphere` command and the Fart Zone's `fz_door` / `fz_portholes` are still story values; setting them adds no gas and changes no opening (tested);
- historical fart jokes, haze and dialogue are not gas sources: nothing converts them.

**Narrow compatibility** (shared where it is the same thing):

| Shared | How |
|---|---|
| Room ids | both key on map ids |
| Environmental events | the air's notices go through the same `hazard:notice` and `hazard:changed` events as the flooding and fire (one toast pipeline, one 4-second dedupe) |
| The exposure meter | one meter at the top of the screen: FUMES (the legacy zone's level and his legacy exposure) while a legacy zone holds him, else AIR (the room's quality and his air exposure) |
| Protection and the fume hazard option | the same wet cloth, Frog Grog ward and option scale both |

**Ownership, so the player is never charged twice**: while the captain stands in a legacy dense or Dead Center zone, **the legacy system owns his lungs** that second (`air.legacyOwns`): the air adds no exposure, and the meter shows FUMES. The two exposures are separate numbers (the legacy one per play and never saved, as it always was; the air's saved and checkpointed). Today they never overlap, because no room has both.

**Migration strategy** (for the campaign prompts, not done here): a chapter that moves a fume scene onto the air replaces its zone rectangles and haze with a source (and openings), in that chapter's own data, and deletes the zones; its collapse script stays, triggered by an `air` condition on exposure if wanted. One event, one owner: a scene is either legacy zones or air, never both. Known legacy quirk left as it was: the FUMES meter stays drawn over the pause menu (the AIR meter gives way to menus).

## 10. Save migration

**Save version 20.** The `ship` domain gains `air` (gas per room, sources, openings changed from their defaults, the captain's exposure, the next id), stored at full precision so a loaded game goes on exactly as the saved one would have (a few dozen numbers at most). The 19 → 20 migration adds nothing: **a v17, v18 or v19 save loads with clean air everywhere, every opening at its default and clear lungs, and its hull, leaks, water, fires, materials, quests and crew exactly as they were** (tested for all three versions).

Loading checks everything against the data: gas in an unknown room, an unknown substance or a broken number is dropped with a warning; a room holding more than it can is scaled down to full; a source in an unknown room, of an unknown substance, that would never end, or beyond the limit is dropped, and a rate over the limit is clamped; an unknown opening or a state its kind doesn't have is dropped, and a damaged seal reads as closed; exposure is clamped to 0–100; the next id never reuses a loaded one. **Loading replays nothing**: no notices, no breath, no emission; the next tick goes on from the saved moment (tested). A save made while shutting a door holds the door as it was, with no work under way after loading.

## 11. Checkpoint and retry behavior

A checkpoint captures the `ship` domain, which now includes the air: the gas, the sources, the openings and the captain's exposure, with the hull, the hazards, the hold and the applied event ids. Restoring one puts them all back and emits `hazard:changed`, so the world rebuilds the haze, the HUD line, the meter and his pace from the state. `diffStates` reports `air: { gas: { room: [before, after] }, links: { id: [before, after] }, sources: [before, after], exposure: [before, after] }`.

The air uses Prompt 6's retry-safe event ids ([10](10-flooding-and-fire.md), section 9): `airSource` and `airAdd` take an `eventId`, scoped to the challenge charge, consequence list or attempt applying it, and the ids are saved and checkpointed. Tested:

- gas released and breath taken **during an attempt** are rolled back by "Try again";
- a release in a failure's **costs** lands **once per failure** (a callback firing twice in one charge adds gas once), survives the retry, and **lands again** on the next attempt's failure (a new charge);
- a failed seal tried again: the air and his lungs as they were when the bar went up, the wasted nail gone;
- a checkpoint restored after a source, a closed hatch and twenty seconds of breathing is exactly the air it captured.

## 12. Script commands and conditions

All opt-in, validated (rooms, substances, openings, states, rates, amounts, seconds, ranges), registered with the regression harness, and used by no chapter.

```json
{ "airSource": "crew_quarters", "substance": "vapor", "rate": 4, "amount": 240, "label": "a cracked cask", "eventId": "pNN_cask" }
{ "airSource": "galley", "substance": "smoke", "rate": 6, "seconds": 60, "id": "stove" }
{ "airStop": "stove" }                         { "airStop": true, "room": "galley" }
{ "airAdd": "washroom", "substance": "heavy_gas", "pct": 30, "eventId": "pNN_puff" }
{ "airVent": "crew_quarters", "share": 0.5 }    (a scene airs it: that share leaves the ship)
{ "airConnection": "washroom_door", "state": "sealed" }     { "airConnection": "fore_hatch", "damaged": true }
{ "airCheck": true }                            (the report, in the dialogue box)
{ "airControl": "galley_door", "state": "closed", "outcomeValue": "pNN_door" }   (the captain's action, with its seconds)
{ "airSeal": "galley_door", "outcomeValue": "pNN_seal" }                        (a challenge on the repair bar)
{ "ignite": "galley", "intensity": 30, "smoke": true }      (Prompt 6's fire, making smoke)
```

- `airSource` must end (`amount` and/or `seconds`); a source that is already pouring or past the limit is left alone (the state decides, not the content).
- `airConnection` (a scene, at once) closes an open opening before sealing it; a damaged one isn't sealed. `airControl` and `airSeal` are the captain's own work: refused, they say why and set `outcomeValue` to `refused`.
- The condition:

```json
{ "air": { "room": "galley" } }                                     any gas there
{ "air": { "room": "galley", "quality": ["toxic", "deadly"] } }
{ "air": { "room": "galley", "substance": "smoke", "pct": { "gte": 20 } } }
{ "air": { "room": "galley", "safe": true } }                       nothing above its safe level: safe to go in
{ "air": { "exposure": { "gte": 35 } } }   { "air": { "exposureStage": ["dangerous", "critical"] } }
{ "air": { "connection": "galley_door", "state": "closed" } }       ("damaged": true)
{ "air": { "source": "galley" } }   { "air": { "source": true } }   { "air": { "any": true } }
```

## 13. UI and controls

At 320×224, in words as well as colour:

- **The HUD line** (bottom left, above the ship badge): bad air (foul or worse) is an emergency with the rest, weighed against them: `! AIR Crew Quarters TOXIC  FIRE Galley BURNING`. It gives way to dialogue, timing bars, menus, battles and F2.
- **The AIR meter** (top centre, the legacy meter's place): the word is the air where he stands (`clean`, `hazy`, `FOUL`, `TOXIC`, `DEADLY`), the bar his lungs. It shows while his lungs aren't clear or the air here does harm, hides during scenes and gives way to the menus.
- **Respond** (V, pad X) in a ship room with anything in the air: "Check the air" and this room's openings with their times and costs; with an emergency here as well, a first choice "Fight the emergency" / "Air and vents" keeps both lists short.
- **The work panel** sizes to its words ("CLOSING THE GALLEY DOOR").
- **The room**: a haze in the worst gas's colour, thicker as the air gets worse, a few drifting wisps (none with reduced effects).
- **Toasts** when a source starts or runs dry, a room's air turns toxic or deadly (foul in his own room), clears again, he walks into bad air, his lungs change stage, or he chokes.
- **Pause > Ship**: below the sections and the emergencies, each room with bad air ("Air: Crew Quarters VAPOR 24% TOXIC") and his lungs ("Your lungs 42% IMPAIRED"); the detail shows its quality and trend, what is in it, its openings (open / shut), what to do, and "Respond here" or "Go there to deal with it."; his lungs show their effects. Confirm on the air of his room closes the menu and opens Respond; elsewhere it buzzes.
- **Controls**: keyboard (arrows, Z, X, V, C) and gamepad (d-pad, A, B, X, Y), no mouse; one press, one action (the world takes no input while he works, and a scripted second action is refused: "Already at work.").
- Every word is checked to fit: toasts in four lines, report lines on one dialogue page, choices on the screen, work labels in their panel, the page detail in its panel (`tests/atmosphere.test.js`, "every air word fits").

## 14. Debug demonstration instructions

A debug fixture, not a story chapter: it adds nothing to any room.

1. `npm run dev`, F2 > **Ship** > "Jump: Air demo" (the `air_demo` preset): the end of Phase 17 in the crew quarters, clean air, 8 planks, 10 nails, 4 rope, 6 sailcloth.
2. **A. Containment.** F2 > Ship > "Air A: vapor pouring from a cracked cask in the crew quarters". Close F2: the HUD line and the haze appear. Press **V**: "Check the air" names the source and the openings. Close the galley door and the washroom door: the galley and the washroom stay hazy at worst while the quarters go foul; leave them open and the washroom goes foul too.
3. **B. Ventilation.** "Air B: the washroom sealed, full of heavy gas". Go into the washroom (the meter climbs at once: you're breathing it), Respond > "Open the washroom porthole", get out. The heavy gas leaves through the porthole; the quarters never get a breath of it, because the door is still sealed. Unsealing the door instead would let it sink through the quarters toward the hold, which has no porthole.
4. **C. Dangerous exposure.** "Air C: the galley stove smoking, the galley shut". Walk into the galley: the meter says TOXIC, his lungs fill (toasts at each stage), he walks slower, then coughs. Walk out: no more harm; his lungs clear over twenty seconds or so.
5. **D. Combined emergency.** "Air D: the hold breached, the galley stove burning (smoke), vapor in the quarters". Which first? The breach floods the hold, the fire burns the hull and smokes the galley, the vapor spreads from the quarters. A sound order on Captain and Brutal: patch the breach, douse the fire from the galley cask, shut the galley door and open the quarters porthole, then pump.
6. **E. Persistence and retry.** "Air E: a short release in the crew quarters". Shut a door, breathe some of it, Pause > Save, reload, Continue: the air, the doors and his lungs as saved. Then seal a door and fumble the bar: "Try again" puts the air and his lungs back as they were when the bar went up, the wasted nail stays gone. Seal it, and air the room out.

"Clear the air and the lungs (every opening to default)" ends it all; "Let 10 seconds of emergency pass" runs the clock.

## 15. Performance measurements

- **Compact state**: at most nine rooms × three substances, twelve sources, the openings that changed, one exposure number; a save grows by well under 1 kB. No per-tile or per-particle simulation.
- **Per tick**: a pass over the sources, the fifteen openings and the rooms; nothing runs while the air is clean and his lungs are clear. At most 3 ticks a frame.
- **Presentation**: one screen-sized rectangle per room (the haze), and a fume burst every 0.6–1.4 s from the existing effects pool while the air is foul or worse (none with reduced effects); the HUD line and the meter redraw only when their words change.
- **Measured** with the existing instrumentation: the perf spec now has an air scene (the `air_demo` crew quarters with deadly vapor, smoke, a source pouring and gas moving through the whole ship while it is measured) next to the end-of-Phase-17 crew quarters. Three runs (`PERF_RUNS=3`, medians with the range), on the test machine's software renderer, so diagnostic only:

  | Scene | still: work p95 ms | walk: work p95 ms | still: frame avg ms | display objects | heap MB |
  |---|---|---|---|---|---|
  | end of Phase 17, crew quarters (clean air) | 2.7 (2.6–4.6) | 3.3 (2.5–3.5) | 17.39 | 189 | 91.5 |
  | air demo, crew quarters (deadly air, all moving) | 4.6 (4.0–4.6) | 3.8 (3.2–4.1) | 18.43 | 193 | 91.7 |

  About 1–2 ms more work per frame at worst, most of it the wisps and the haze; four more display objects (the haze rectangle and the AIR meter); no heap growth. Every figure is well inside the harness's limits (work p95 12 ms). The frame-time flags in that run (p95 33 ms) were raised on the clean-air rooms as well: the software renderer, not the air.

## 16. Known limitations

- **No chapter uses it**; no legacy fume scene has moved onto it (by design).
- **Openings are data, not objects**: the captain works them from anywhere in the room, through Respond. Closing a door doesn't stop anyone walking through it (he shuts it behind him).
- **Room-level air**: one concentration per room, no gradient within it, no smoke layer at the ceiling, no per-tile drift. Heavy gas sinks between levels only by rate, never piling up past level.
- **Only the captain breathes it**: the crew don't react, cough or flee (crew conditions, prompts 20–26).
- **Generic substances only**; no supernatural properties, no ignition of gas, no explosions, no pressure, no visibility loss from smoke.
- **Seal materials have no campaign source** (as in Prompts 5 and 6).
- **The legacy FUMES meter** is still drawn over the pause menu (pre-existing; left alone).
- **Exposure ends in no collapse**: at worst he is slow, coughing and down to a quarter of his HP. A chapter that wants a collapse can trigger the legacy collapse script on an `air` condition.
- **The 100-minute full browser suite was not run.** The smoke suite and the new and affected specs were (see the Prompt 7 report).

## 17. Future Stenchmaster gas integration

| Future system (prompt) | Builds on |
|---|---|
| Brogath and Garrick's pressure (8) | an eruption is an `airSource` (or several, in the rooms around) with an `eventId`, plus `airConnection` to force doors open (`damaged`) and Prompt 6's `shipDamage`. Pressure events push air, they don't simulate it. *(Built in Prompt 8 as one finite source in the subject's room, the blast at that room's openings through `setConnection`, and integrity damage; a damaged opening is mended with `airMend`: [12-pressure-and-eruptions.md](12-pressure-and-eruptions.md).)* |
| Beard Saturation (9) | reads the captain's room air and exposure (the `air` condition, `exposureNow`); the beard can be a sink (a negative source: a new substance property) or a slow source *(Built in Prompt 9 as a sink inside the captain's breath: `AirState.breathe` lets the beard take its share of each gas first (`takeGas`, counted as `absorbed`), his lungs breathe the rest, and a purge pours back as finite sources: [13-beard-saturation.md](13-beard-saturation.md).)* |
| Coffin Sock, Chicken-Town, Fire-Waft, Beard Joint, the Grand Stenchmaster (campaign prompts) | each a substance entry with its own safe level, potency, decay, vent and heaviness, plus new optional properties (`flammable`, `panics`, `stains`, `clings`), read by their systems; the Grand Stenchmaster Fart is a huge short source in a room with the doors forced open: it really contaminates rooms, overwhelms the portholes and drives everyone out |
| Fire (with Prompt 6) | smoke is already opt-in per fire; ignition of a flammable gas is a rule in `AirState.tick` reading `flammable` substances in a burning room |
| Crew conditions and panic (20–26) | crew exposure per person from the room's index, the same stages; panic from deadly air |
| Layout prompts (12–19) | door, hatch and porthole objects run `airControl` / `airSeal`; moved doorways keep their ids; a new doorway is a new connection (the validator insists it is a real warp) |
| Legacy fume scenes (campaign prompts) | migrated per chapter ([section 9](#9-existing-fume-zone-compatibility)): zones out, sources in, one owner |

The comedy stays absurd and the consequences become real: the same rules that make a cracked cask of pickling vinegar a nuisance make a Grand Stenchmaster Fart a catastrophe, because it is the same air.
