# 10 · Flooding, fire, leaks and the emergency response (Prompt 6)

Prompt 6 gave the ship emergencies: leaks that let the sea in, water that rises room by room and finds its level, fires that grow, spread and burn the structure, and a player-driven response (patch, pump, bail, fetch water, douse, smother) that costs time and materials. It is built on the Ship Integrity model from Prompt 5 ([09-ship-integrity.md](09-ship-integrity.md)): a leak belongs to a structural section, fire damages sections through the same `applyDamage`, and a patch is played on the same timing bar as a repair. It uses the challenge system from Prompt 3 ([07-challenge-outcomes.md](07-challenge-outcomes.md)) and scales with the difficulty from Prompt 4 ([08-difficulty-and-accessibility.md](08-difficulty-and-accessibility.md)). It is not a second damage model, a second challenge system or a second difficulty switch.

**No existing chapter has opted in, and none was opted in here.** No chapter, quest, map or NPC script opens a leak, floods a room, starts a fire, reads a hazard, or deals `breach` damage, and no campaign step hands out materials. The 223 chapters play exactly as before, and every phase snapshot ends with no emergency (`tests/hazards.test.js`, "the campaign is unchanged", scans every script, map and quest and the 17 approved baselines). Everything below can be tried in an isolated debug demo (section 13).

| | Implemented now | Planned (hooks only) |
|---|---|---|
| Leaks per section and room, severity from the hull's condition, patching, sealing by repair | yes | crew patching (20–26) |
| Water per compartment, stages with effects, drains and door sills, stability and hull strain | yes | sailing effects of a listing ship |
| Fire per room: fuel, growth, stages, damage to named sections, bounded spread | yes | fire from cooking, lamps, cannon (owning prompts) |
| The response: patch, pump, bail, fetch, douse, smother, with time, materials, refusals | yes | stations as world objects (layout prompts 12–19) |
| Difficulty scaling, checkpoints, saves (v19), retry-safe damage events | yes | – |
| HUD emergency line, Respond button, work panel, room tint/waterline/embers/smoke, Ship page | yes | – |
| Campaign chapters using any of it | **no** | each chapter's own prompt |

## 1. Data model

Everything is data in `data/ship/hazards.json` (ContentDB key `shipHazards`), validated at load (`hazardDataProblems` in `src/systems/ship/hazards.js` and the step checks in `validateContent`). Everything is keyed by **room ids (map ids) and section ids**, never by tiles or coordinates, so a layout change touches neither the data nor a save. The validator rejects any `x`, `y` or `tiles` field.

The state lives in `HazardState` (`src/systems/ship/HazardState.js`), owned by the ship (`session.ship.hazards`) and serialized inside the `ship` save domain, so saves and checkpoints carry it with the hull:

```js
{
  leaks:  [{ id: 'leak_1', section: 'hull_port', room: 'cargo_hold', severity: 'breach', state: 'open' | 'patched', slowed, source, since }],
  water:  { cargo_hold: 54.6, treasure_hold: 3 },          // units per compartment (absent = dry)
  fires:  [{ id: 'fire_2', room: 'galley', intensity: 41.2, fuel: 96.4, spread: true, hot: 0, acc: { hull_port: 0.42 }, source, since }],
  fuel:   { captains_quarters: 0 },                          // fuel left in rooms that have burned (absent = all of it)
  buckets: 0,      // full buckets the captain carries (0 to 3)
  time: 37,        // seconds of hazard time so far
  strain: 0,       // seconds the hold has been foundering since the last strain blow
  next: 3,         // the next hazard id number
}
```

Each hazard has an id, a type (the list it's in), a room (and for a leak a section), a severity or intensity, a source (`'debug'`, a challenge id, `spread:fire_2`), a state, and the time it started. Rates are not stored: they come from the data and the difficulty each tick, so a difficulty change applies at once and a save holds no stale numbers. A response in progress is per play (`hazards.working`), never saved (section 9).

**Compartments** (rooms that hold water) and their capacity in units:

| Room | Capacity | Deck |
|---|---|---|
| `cargo_hold` | 240 | hold (the bilge) |
| `treasure_hold` | 140 | hold |
| `fart_free_zone` | 60 | hold |
| `galley` | 160 | tween |
| `crew_quarters` | 200 | tween |
| `washroom` | 60 | tween |

The main deck and the captain's quarters hold no water: the sea runs off the deck. Rooms that aren't compartments can't flood, and rooms not in `fire.rooms` can't burn. There is no per-tile fluid, smoke or chemistry simulation.

## 2. Leak rules

- **Where:** a leak belongs to a section that can leak (`leaks.sections`: `hull_port` and `hull_starboard` into the cargo hold, `bow` into the crew quarters) and a room that section is worked from (a blow can name another of the section's compartments, e.g. the starboard hull into the treasure hold).
- **When:** only from damage that says so (`"breach": true` on a `shipDamage` step or `applyDamage`) or the `leak` command. **Ordinary story damage never opens a leak**: the 223 chapters' legacy steps carry no `breach`, and a test runs legacy `shipDamage` and repair steps and checks that no emergency starts. Hull strain from flooding never opens one either.
- **How bad:** a breach blow opens a leak as bad as the section's condition now allows: below 60% a **seep** (0.6 units/s), below 30% a **leak** (1.5/s), below 15% a **breach** (3/s). Above 60% the blow opens nothing. A second blow on the same section and room makes the existing leak worse (never two leaks in one place) or tears its patch open.
- **Several at once:** each section/room pair is its own leak, and their water adds up.
- **Patching** (section 6) closes a leak (`patched`) or slows it (a rough patch halves its rate). **A patch is not a repair:** the hull keeps its damage, and the water stays where it is.
- **A repair is not pumping:** repairing the section eases its leaks to what its new condition allows, and **seals** them at 60% (`sealAt`), patched or open. The water that came in stays.
- A patched leak stays listed (the Ship page: "Leak: Cargo Hold PATCHED") until a repair seals it. It is not an emergency: it doesn't count as active, show on the HUD or tick the clock.

## 3. Flood progression

Water is a number of units per compartment, shown as a percentage of its capacity, in stages:

| Stage | From | Work takes | Repairs restore | Walking pace | Can work here |
|---|---|---|---|---|---|
| Dry | 0% | ×1 | ×1 | ×1 | yes |
| Damp | 1% | ×1 | ×1 | ×1 | yes |
| Shallow | 10% | ×1 | ×1 | ×1 | yes |
| Serious | 35% | ×1.25 | ×0.75 | ×1.25 slower | yes |
| Critical | 65% | ×1.5 | ×0.5 | ×1.5 slower | yes |
| Flooded | 95% | – | none | ×1.75 slower | **no** (pump it down first) |

**Movement between rooms** follows only the data's `flow` links, and every link joins rooms that really open onto each other (a map warp between them; the validator checks this, so water can't teleport):

- **Drains** run down: the galley drains down the hold stairs into the cargo hold, 4 units a second.
- **Door sills** spill both ways, but only above the sill and only until both sides are level: crew quarters ↔ galley and washroom ↔ crew quarters at 15%, cargo hold ↔ treasure hold and cargo hold ↔ Fart-Free Zone at 25%. Water below a sill stays where it is (bail it).
- **Nothing is lost on the way**, and nothing goes past a compartment's capacity or below dry.

**One small breach can't flood the ship.** A leak fills its own room first and reaches a neighbour only over a sill; the washroom reaches the hold only by way of the crew quarters and the galley. On Captain, an unanswered breach takes the cargo hold to Shallow in 8 s, Serious in 52 s, Critical in 96 s and Flooded in 140 s (Deckhand: 14 / 86 / 159 / 233 s; Brutal: 7 / 40 / 74 / 108 s). The test "a single breach gives at least half a minute before the hold is critical" holds on every difficulty.

**Stability:** the hold deck's water as a share of its capacity. From 35% the ship is **listing**; from 70% it is **foundering**, and every 10 seconds of foundering both hulls take 1 point of `strain` damage (exact, never a new leak). The HUD line leads with LISTING or FOUNDERING!.

Every effect is **telegraphed** (a toast when a room reaches Shallow, Serious, Critical or Flooded, the HUD line, the room's tint and waterline rising) and **recoverable** (pump or bail it down and the effects go with the stage).

## 4. Fire progression

A fire has a room, an intensity (1–100), the fuel its room had left, and whether it may spread.

- **Starts** only in a room that can burn, and not in a room awash (35% water or more): `ignite` says "too wet to burn".
- **Stages:** Smouldering from 1, Burning from 25, Blazing from 60, Inferno from 90.
- **Grows** 0.6 a second (× the difficulty's `fireScale`) while it has fuel; fuel burns at intensity / 25 a second. Out of fuel, it dies down 2 a second and **burns out**.
- **What burns is gone.** A room's fuel (galley 120, cargo hold 200, crew quarters 140, main deck 150, captain's quarters 100, treasure hold 80) is spent for good: a fire put out early leaves the rest for next time, a fire that comes back gets only what's left, and a burnt-out room can't catch again ("nothing left to burn"). So the ship's fires, all together, are bounded by its fuel, and an unattended fire always ends.
- **Damage** goes only to the sections its room's data names, from the stage named: the galley's fire reaches both hulls once Blazing, the cargo hold's once Burning, the crew quarters' the bow from the start, the main deck's the deck and (Blazing) the rigging, the captain's quarters' the stern. Per second: intensity × 0.015 × `damageScale` × the section's `fire` resistance (hulls ×0.75, deck ×1.25, rigging ×1.5), accumulated per section and applied in whole points (`category: 'fire'`, exact). The validator checks every named section is worked from that room ("a fire here can't reach the deck").
- **Spreads** only after Blazing (60+) for 20 s in a row (÷ `fireScale`), to the first room in its spread list that can catch (not already burning, not awash), one room at a time, along real room connections (validated like the flow links). A fire started with `"spread": false` stays home. No more fires than rooms that can burn.
- **Water in the same room** slows it (35%+: −3 a second, no growth, no spreading) or drowns it (65%+: out). **Water anywhere else changes nothing**, and a fire never makes water or water a fire elsewhere.

Left alone on Captain, a galley fire started at 10 is Burning at 25 s, Blazing at 84 s and burns out at 116 s, scorching each hull by 1 point; a crew-quarters fire at 35 burns out after 102 s and leaves the bow at 7 of 80. On Brutal the same fire spreads to the cargo hold at 79 s and on to the treasure hold; if nobody ever answers it, both hulls are gone at 202 s and the last fire burns out at 248 s. An emergency ignored for three minutes on Brutal can lose the ship. Answered, it is recoverable on every difficulty (section 7).

## 5. Structural relationships

| Hazard | Reads from Ship Integrity | Writes to Ship Integrity |
|---|---|---|
| Leak | the section's percentage (severity), its rooms (where it can leak) | – |
| Repair of a leaking section | – | eases or seals its leaks (`onSectionRestored`) |
| Fire | the section's `fire` resistance | `applyDamage` with `category: 'fire'`, only named sections |
| Foundering | – | `strain` damage to both hulls |
| Water where a repair is done | – | the repair restores × the stage's `repair` factor, none when Flooded |
| Fire in a section's rooms | – | that section can't be repaired until it's out ("Put out the fire in the Galley first.") |

The two new categories are data in `data/ship/integrity.json` (`fire`: "the fire", `strain`: "the strain of the flooding"). Ship Integrity knows nothing of rooms filling or burning; hazards know nothing of thresholds or repairs beyond these calls.

## 6. Response actions

What can be done is computed in one place, `responseOptions(session, room)` (`src/systems/ship/response.js`), which both the Respond choice and the Ship page use, so what's offered is what can actually be done. Every action happens in the room the captain stands in, takes seconds of hazard time (longer in deep water: × the stage's `work`), and **while it takes, every other emergency goes on**. One action at a time (`hazards.working`): a second request says "Already at work."

| Action | Where | Time | Effect | Cost |
|---|---|---|---|---|
| **Patch the leak** | the leak's room | the timing bar, then 4 s of work with the leak still pouring | success: closed; rough: halved | seep: 1 plank, 1 nail; leak: 1 plank, 2 nails; breach: 2 planks, 2 nails, 1 sailcloth (× `costScale`); a failed try wastes a nail |
| **Pump the bilge** | the bilge pump (cargo hold) | 6 s | 24 units out of the hold's three compartments, deepest first, spread over the seconds | – |
| **Bail** | any room with water | 4 s | 8 units out of this room | – |
| **Fill the buckets** | the sea (main deck), the galley's water cask, or flood water (10%+) | 3 s | carry 3 full buckets (from a flood: 6 units each, which lowers it) | – |
| **Douse the fire** | the fire's room, with water to hand or a bucket | 3 s | −25 intensity | a bucket (unless water is to hand here) |
| **Smother it with sailcloth** | the fire's room | 3 s | −45 intensity | 1 sailcloth |

Amounts × the difficulty's `responseScale`. **Refusals say why** and change nothing: "The pump is in the fire: put it out first." (the pump's room burning at Burning or worse), "The bilge is dry: nothing to pump.", "No water to hand: fill the buckets first.", "Too deep to work in the Cargo Hold: pump it down first.", "Not enough: Nails 1/2.". A refused action is still offered (greyed, with its reason), not hidden.

**The patch** (`patchLeak`) is a challenge on the strict timing bar (the `ship_repair` profile: Deckhand 3 fumbles, Captain 2, Brutal 1; it can always fail, and it is never must-win). It never starts unless the hold can pay for the worst outcome, and the tries are limited to what it can pay for. A failure wastes a nail (a sticky cost: "Try again" doesn't refund it) and the leak stays open; Carry on gives up with nothing else lost. A success or rough patch commits the bill only after its 4 s of work, then closes or slows the leak; if the leak was sealed meanwhile, nothing is taken.

**No single global command.** Water must be pumped where the pump is or bailed room by room; a fire must be fought in its room with water fetched from a source; a leak must be patched where it is. The player's choices matter: patch first or pump first, fight the galley fire before it reaches the pump, fetch three buckets or douse from the cask, spend sailcloth on a fire or keep it for a breach patch. **No spam exploit:** each action costs its full time, one at a time, a second press is refused, buckets and materials are only taken when the work is done, and the hazard clock runs during the work.

**At least one scenario balances fire against flooding** (demo C, section 13): the galley burns while the hold is breached; the pump is in the hold, the cask in the galley; leave the fire and it can spread into the hold and stop the pump; leave the breach and the water rises past Serious and slows every action.

## 7. Difficulty

The one difficulty system: each preset's `ship` block in `data/difficulty/presets.json`, read by `shipTuning` with bounds. Three new numbers (bounds 0.5–1.5):

| | Deckhand | Captain | Brutal |
|---|---|---|---|
| `leakScale` (water in) | 0.6 | 1 | 1.3 |
| `fireScale` (growth; spreading takes ÷ this) | 0.6 | 1 | 1.3 |
| `responseScale` (pumped, bailed, doused, smothered) | 1.3 | 1 | 0.85 |
| `damageScale` (fire damage, from Prompt 5) | 0.75 | 1 | 1.25 |
| `costScale` (patch materials, waste) | 0.5 | 1 | 1.5 |
| Patch fumbles allowed | 3 | 2 | 1 |
| A breach (3/s) against the pump | 1.8 in, 5.2 out | 3 in, 4 out | 3.9 in, 3.4 out: **patch it** |

**Every difficulty is recoverable**, tested with the play a player would make ("every difficulty can recover": a breach patched and pumped dry; a fire doused from the cask; both at once, the fire first, then the pump) and with the demo in the browser. On Brutal the pump alone can't keep up with a breach, so the patch is the answer, as it should be.

**Nothing is frame-rate dependent:** rates are per hazard second, and the clock runs whole ticks (section 11). **Assists never act as damage multipliers:** the timing assist and the classic bar change only the patch's bar for that attempt; the hazards never read them (tested).

The demo's cannon blows use `scale: false`, so every difficulty starts from the same breach and the difficulty is in how fast the water and fire come, how long the work takes and what the patch costs.

## 8. Resources

The response reuses Prompt 5's materials (planks, nails, rope, sailcloth); there are no new items. **No campaign source was added**: only the debug preset `hazard_demo` (8 planks, 10 nails, 4 rope, 4 sailcloth) and F2 give them. Buckets are equipment, not items: three carried, filled for free at a source, used up by dousing, saved with the hazards.

**Transaction safety** (tested):

- **No negative counts:** a bill is taken whole or not at all (`takeAll`), and an action is offered as possible only when the hold holds its whole worst case.
- **No duplicate spending:** the patch takes its bill once, after the work; smothering takes its cloth once, when it starts; the event id rules (section 9) stop a consequence landing twice.
- **No retry exploit:** a failed try's waste is a sticky cost: kept by "Try again", charged once per failure.
- **No lost equipment on cancel:** "Leave it" and Carry on take nothing; a bucket is used only when a douse completes.
- **No double consequences, no inconsistent save:** a save or checkpoint taken during the work holds the moment, with nothing half-spent and no work under way after loading (section 10).

Future campaign prompts that use hazards must supply materials through a real source (Resources and supply, Prompt 10): a chapter must not open a breach the player can't pay to patch, unless pumping alone is meant to be the answer.

## 9. Checkpoints and retry-safe damage events

### Checkpoints

A checkpoint captures the `ship` domain, which now holds the sections, the hazards and the applied event ids. Restoring one puts back the hull, the leaks, the water, the fires and their fuel and damage accumulators, the buckets, the hazard time, the foundering strain and the next id, together with the hold, and emits `hazard:changed`, so the world rebuilds its tint, waterline, HUD line and walking pace from the state (nothing visual is restored as such). `diffStates` reports `hazards: { water: { room: [before, after] }, fire: { room: [before, after] }, leaks: [openBefore, openAfter] }`. A restore never replays resolved damage: the hazard time is rewound with the fire that dealt it.

### Retry-safe damage event ids

Prompt 5 recorded the event ids a blow carries per play and never forgot them on a restore, so a retried challenge couldn't take the same hit again (its documented limitation). The fix:

1. **The ids are scoped.** `scopedEventId(ctx, id)` (`src/systems/script/commands.js`) turns a step's `eventId` into the id the ship records:
   - inside a challenge's **costs or consequences**, the runner passes the list it is running as a scope (`cost:N` for the Nth charge, `onFailure`, `onPartial`): `"bilge_run:cost:2:hit"`. A sticky cost replayed after a restore keeps its charge's id, so it can't land twice; each new failure is a new charge with a new id.
   - elsewhere in a challenge (a hazard during an attempt), the attempt: `"bilge_run#3:hit"`.
   - outside a challenge, as written.
2. **The ids are state.** `ShipState.seen` (the latest 128) is saved as `ship.events` and captured by checkpoints. A restore puts back the ids of the moment it was taken, so a hit that was undone can land again; a hit that is still applied can't.
3. **Hazard ticks carry no ids.** A fire's or the foundering's damage is applied once, inside `tick()`, which runs once per hazard second; a restore rewinds the time, the fire and the hull together, so there is nothing to replay and nothing to deduplicate.

What that guarantees (each is a test in `tests/hazards.test.js`, "retry-safe damage events"):

| | Case | Result |
|---|---|---|
| 1 | one callback firing twice in the same attempt | lands once |
| 2 | a failed attempt's damage | rolled back by the retry's restore |
| 3 | the same hit on the next attempt | lands again (its id was rolled back with it) |
| 4 | separate hits within one attempt (their own ids) | each lands |
| 5 | a permanent consequence (a sticky cost) | survives the retry, once per failure |
| 6 | save and load | the applied ids load with the save: a repeated callback after a reload still lands once |
| 7 | fire and flood damage across ticks | each tick once; a restored checkpoint replays nothing twice |

A blow after its challenge has resolved is still refused unless the step says `"authorized": true` (Prompt 5).

## 10. Save migration

**Save version 19.** The `ship` domain becomes `{ sections, hazards, events }`. The 18 → 19 migration adds nothing but structure (a save without hazards loads with none): **a v17 or v18 save loads dry and unburnt, with its hull as it was, and no emergency, id or material is invented** (tested for both versions).

Loading checks everything against the data: a leak with an unknown section, room or severity, a duplicate id, water in a room that isn't a compartment or that isn't a number, a fire in a room that can't burn, a second fire in a room or one with no intensity, are dropped with a warning; water and intensity are clamped to their bounds, fuel to the room's, buckets to 0–3; a broken time, strain or id counter is reset. The next id never reuses a loaded one.

**Saving mid-response can't duplicate anything:** the work in progress is per play, so a save made while pumping holds the water of that moment and loads with no work under way; a save made as a patch's bar starts holds the materials and the leak as they were (no bill taken, no leak closed). Loading the same save twice gives the same hold and the same emergency.

## 11. Timing and pause

Hazard time is **fixed-step and deterministic**: one tick per `tickMs` (1000 ms) of eligible time, counted by `HazardClock` (`src/systems/ship/hazardClock.js`). *(Since Prompt 7 the clock ticks `ship.tick()`, the hazards then the ship's air, on the same rules: [11-atmosphere-and-ventilation.md](11-atmosphere-and-ventilation.md), section 8. A fire started with `"smoke": true` sends smoke into its room's air; no story fire does.)* The frame rate decides only when a tick lands, never how many (10.5 s at 30, 60 or 144 fps is 10 ticks). At most 3 ticks run in one frame; a longer stall drops the excess rather than dumping it later, so there is no burst of damage after a hitch.

| Situation | Hazard time |
|---|---|
| The captain free in the world | runs |
| Emergency work (pump, bail, patch work, fetch, douse, smother) | runs, tick by tick, inside the action |
| Dialogue, a choice (including Respond's), a cutscene or scripted scene | stopped |
| A timing bar (a patch or repair attempt) and its retry choice | stopped |
| The pause menu, the Ship page, any menu, a battle | stopped (the world scene is paused) |
| A room transition, the F2 panel | stopped |
| A checkpoint restore, a save, a load | no time passes; nothing is owed afterwards |
| Nothing active (no open leak, no water, no fire) | the clock resets |

Scripts move hazard time only on purpose: the `hazardClock` step (N ticks) for authored sequences and the demo. **No damage while paused or in a scene**, because no tick runs. **No toast spam:** a toast only when something changes stage (a room reaching Shallow, a fire Blazing, a leak opening, the ship listing), never every tick, and the world drops a repeat of the same notice within 4 s.

## 12. UI and controls

At 320×224, with words as well as colour everywhere:

- **The emergency line** (HUD, bottom left, above the ship badge): the worst two emergencies in words, how many more, and the stability: `! FIRE Galley BURNING  WATER Cargo Hold 15% +1`, `FOUNDERING! FIRE Captain's Quarters INFERNO +10`. When two long names don't fit the screen, it shows the worst one and a count. It gives way to dialogue, timing bars, the menus, battles and the F2 panel, like the badge.
- **Respond** (`V` on the keyboard, `X` on a pad): in a room where something can be done or explained, the hint shows "{btn:secondary} Respond". The press opens a choice: the room and what's wrong in it ("Cargo Hold: water 15% SHALLOW, a leak"), then each action with its time and cost ("Patch the leak (breach): 2 Planks, 2 Nails, 1 Sailcloth", "Pump the bilge (6 s)", "Bail (4 s)"), the impossible ones greyed (choosing one says why), and "Leave it".
- **The work panel** while an action runs: what ("PUMP THE BILGE"), a bar, and the seconds left.
- **Toasts** when a leak opens, worsens, is patched or sealed, a room reaches a stage, a fire starts, spreads, flares up or goes out, the ship lists or rights herself, and after each action ("Pumped 24: Cargo Hold water 8% DAMP.").
- **The room itself** (`src/world/HazardLayer.js`): a blue tint and a bobbing waterline that rise with the stage, an orange flicker, embers and smoke that grow with the fire. A fixed handful of screen-space shapes; with reduced effects, the flicker holds still and no particles. The captain wades slower in deep water.
- **Pause > Ship**: below the six sections, every emergency in words ("Fire: Galley 33% BURNING", "Water: Cargo Hold 11% SHALLOW", "Leak: Cargo Hold BREACH" / "PATCHED"), and for the highlighted one what it does and what to do ("Patch it in the Cargo Hold, or repair the hull. Then pump."), the rooms a fire is burning, the effect of the water ("work 25% slower, repairs 75%"), then "{btn:confirm} Respond here" or "Go to the Galley to deal with it.". Confirm on one in the captain's room closes the menu and opens Respond; elsewhere it buzzes. The F2 Ship tab lists the emergencies and the demo scenes.
- **Controls:** keyboard (arrows, Z, X, V, C) and gamepad (d-pad, A, B, X, Y), no mouse. Every word (toasts in four lines, the HUD line, every Respond choice, the page details) is checked to fit (`tests/hazards.test.js`, "every hazard word fits").

## 13. Demo instructions ("Trying it")

The demo is a debug fixture, not a story chapter. It adds nothing to any room.

1. Run the dev build (`npm run dev`), F2 > **Ship** > "Jump: Emergency demo" (or the `hazard_demo` preset): the end of Phase 17 in the cargo hold, by the bilge pump, with a whole ship and 8 planks, 10 nails, 4 rope and 4 sailcloth.
2. **A. Breach and flooding.** F2 > Ship > "A: cannon fire holes the port hull". Close F2: water starts coming in (toasts, the HUD line, the tint). Press **V**: Respond. Pump once and watch the breach outpace it on Brutal (or nearly on Captain). Respond > Patch the leak: strike the green on the bar. Fumble three times instead to see a failure: a nail is wasted, "Try again" puts the water and the hold back as they were at the start of the attempt. Once it's patched, pump until the hold is dry: the HUD line goes away. The hull is still holed (Pause > Ship): repair it to seal the patch for good.
3. **B. Fire.** Walk to the galley (or start there), F2 > Ship > "B: fire in the crew quarters". The fire grows (Burning, toasts, the HUD line) and the bow loses integrity. In the galley, Respond > Fill the buckets (the water cask). Go to the crew quarters, Respond > Douse the fire, until it's out. The bow stops losing integrity: repair it from Pause > Ship.
4. **C. Both at once.** From the cargo hold, F2 > Ship > "C: galley fire and a breach in the hold at once". Patch the breach, go up to the galley and douse the fire from the cask before it blazes and spreads into the hold (a burning hold stops the pump), come back and pump dry. Demanding on Captain, forgiving on Deckhand, tight on Brutal (patch first: the pump can't keep up with a breach there).
5. **D. Save, load, fail, retry.** Mid-emergency, Pause > Save, then reload and Continue: the leak, the water and the fire are as they were, and go on. Fail a patch and choose "Try again": the attempt's checkpoint restores the emergency of that moment; choose Carry on to leave it open.

"A wave over the side" pours 60 units into the galley (it drains into the hold and spills into the crew quarters), "Let 10 seconds of emergency pass" runs the clock, and "End every emergency (no materials)" clears everything.

## 14. Performance

- **Compact state:** a handful of numbers per room, a short list of leaks and fires (at most one fire per flammable room). A save grows by well under 1 kB.
- **No per-tile work:** water and fire are per room; a tick is a loop over five flow links, the leaks and the fires. The ticks are at most 3 per frame, and nothing runs while all is clear.
- **Rendering:** three screen-sized rectangles per room and a few particle bursts a second from the existing effects pool, only while something burns. The HUD line redraws only when its content changes.
- **Measured** with the existing instrumentation: the perf spec (`npm run perf`) now has an emergency scene, the `hazard_demo` cargo hold with a breach, rising water and a Blazing fire, ticking while it's measured, next to the end-of-Phase-17 cargo hold (`PERF_ONLY=p17_complete,hazard_demo`, one run, software rendering, so diagnostic only):

  | Cargo hold | build ms | still: work p95 | walk: work p95 | long frames | display objects | heap MB |
  |---|---|---|---|---|---|---|
  | end of Phase 17, all clear | 26.1 | 2.2 | 1.8 | 3 | 177 | 89.9 |
  | the same mid-emergency | 26.0 | 2.1 | 1.7 | 0 | 183 | 90.5 |

  The emergency costs six display objects (the three screen shapes are in every room, invisible while all is clear; the rest are embers and smoke) and no measurable frame time. The production bundle grew from 7045.5 kB to 7096.4 kB raw (+50.9), 1791.3 to 1806.3 kB gzip (+15.0) and 1361.8 to 1374.6 kB brotli (+12.8).

## 15. Limitations

- **No chapter uses any of it.** The campaign is unchanged by design; using hazards in a chapter is that chapter's prompt.
- **No source of materials in the campaign** (as in Prompt 5). Only the demo preset and F2 give them.
- **Stations are data, not objects.** The bilge pump is "in the cargo hold" (`stations.bilge_pump.room`); there is no pump prop to walk up to, and Respond works anywhere in the room. The layout prompts can place a pump object that runs `{ "hazardAction": "pump" }`.
- **One response at a time, the captain only.** Crew can't pump or fight fires in parallel until crew schedules (20–26).
- **Room-level water.** There is no water level within a room, no current, no per-tile wading: the whole room is at one stage. Rooms that aren't compartments (the main deck, the captain's quarters) never flood.
- **Water below a door sill stays.** A few units can be left in the crew quarters or a side hold, Damp and harmless, until bailed.
- **Fire has no smoke or heat spread** beyond the room-to-room spread; it doesn't hurt the captain or the crew, and nothing stops him walking into a burning room.
- **The ship can be lost** (both hulls to 0 from an unanswered Brutal fire or a foundering hold), but, as in Prompt 5, there is no defeat yet: the `ship:destroyed` hook and a toast.
- **No new art or music**: the effects reuse the existing particles and sounds.
- **The 100-minute full browser suite was not run.** The smoke suite and the new and affected specs were (see the Prompt 6 report).

## 16. Future integration

| System (prompt) | Uses |
|---|---|
| Atmosphere per room (7) | room ids; keep fumes separate from water and fire (no fume propagation through these links) |
| Pressure events, Brogath / Garrick (8) | an eruption's `shipDamage` with `breach` and an `eventId`; `ignite` with a `source` |
| Resources and cooking (10) | a real source of materials; a cooking accident can `ignite` the galley; the cask as a supply |
| Layout prompts (12–19) | `stations` and `waterSources` move with the rooms; pump and cask objects run `hazardAction`; keep every flow and spread link on a real doorway (the validator checks) |
| Crew schedules and crew repairs (20–26) | crew running `hazardAction` / `patchLeak` from stations, one `working` flag per worker |
| Combat and naval encounters (27–34) | cannon hits with `breach: true` and an `eventId` per shot; fire from hot shot |
| Campaign chapters | opt in with steps (`leak`, `flood`, `ignite`, `hazardClock`), read with the `hazard` condition, and supply the materials the response needs |

Rules for any prompt that touches this: **never key a hazard on tiles**; **never give a story's ordinary damage `breach`** unless that chapter opts in; **give every repeatable blow an `eventId`**; **give the player a way to pay** for the response it asks for; and add a fairness test (the scenario recovered on every difficulty) next to the content.
