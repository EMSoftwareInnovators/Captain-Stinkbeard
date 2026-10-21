# 09 · Ship Integrity, damage and repairs (Prompt 5)

Prompt 5 gave the ship a condition: six structural sections, each with its own integrity, damaged by typed blows and repaired with materials through a real timing-bar challenge. It is built on the challenge system from Prompt 3 ([07-challenge-outcomes.md](07-challenge-outcomes.md)) and scales with the difficulty from Prompt 4 ([08-difficulty-and-accessibility.md](08-difficulty-and-accessibility.md)). It is not a second challenge system and not a second difficulty switch.

**No existing chapter has opted in, and none was opted in here.** No chapter damages the ship, repairs it, checks its condition or hands out repair materials, so the 223 chapters play exactly as before and every phase ends with a whole ship (the regression snapshots and `tests/ship.test.js` 24–25 check this). Everything below can be tried in an isolated debug demo ("Trying it").

| | Implemented now | Planned (hooks only, no code yet) |
|---|---|---|
| Six sections, typed damage, thresholds, events, the overall condition | yes | – |
| What a section's condition means (`operational`, `efficiency`) and a condition for scripts | yes | systems that read it: sailing speed, steering, flooding (Prompt 6) |
| Material repairs played as challenges (success, partial, failure), difficulty scaling | yes | repair stations as world objects (layout prompts 12–19), crew repairs (20–26) |
| Saves (v18), checkpoints, retries | yes | – |
| HUD badge, toasts, Pause > Ship, the F2 Ship tab, the demo | yes | – |
| "The ship is lost" (a vital section at 0) | an event and a content hook | a real defeat, when a chapter needs one |

## The model

### Sections

`data/ship/integrity.json` defines the sections. Their ids are stable and never change with the layout: **a section is never a tile or a coordinate**. Each one names the rooms (map ids) it is worked from; when the layout changes, only those lists change.

| Id | Name | Max | Vital | What it does | Worked from | Repair / at 0 | Resistances |
|---|---|---|---|---|---|---|---|
| `hull_port` | Port hull | 100 | yes | keeps the sea out | cargo hold, galley, crew quarters, treasure hold | `hull_patch` / `hull_rebuild` | storm ×0.5, cannon ×1.25, supernatural ×0.75 |
| `hull_starboard` | Starboard hull | 100 | yes | keeps the sea out | the same four | `hull_patch` / `hull_rebuild` | the same |
| `bow` | Bow | 80 | | cuts the waves | main deck, crew quarters | `hull_patch` / `hull_rebuild` | shark ×0.5, collision ×1.5 |
| `stern` | Stern and rudder | 80 | | steers the ship | main deck, captain's quarters | `rudder_fix` | shark ×1.25, storm ×0.75 |
| `deck` | Main deck | 60 | | gives footing on deck | main deck | `deck_mend` | shark ×0.5, storm ×1.25 |
| `rigging` | Mast and rigging | 60 | | drives the ship | main deck | `rigging_splice` / `rigging_rebuild` | shark ×0 (immune), storm ×1.5, cannon ×0.75 |

A new game starts whole: 480 of 480. Section fields: `name`, `max` (1–1000), `vital`, `function` and `functionLabel` (what it does, shown on the Ship page), `rooms`, `resist` (per category, 0 = immune to 3), `repair`, `rebuild` (the repair used at 0), `repairable` (default true).

### Thresholds

A section's condition comes from its percentage, using the data's thresholds (highest first). 0 is always the bottom threshold, and anything above 0 never is.

| Threshold | From | Works? | Efficiency | Shown as |
|---|---|---|---|---|
| `healthy` | 85% | yes | 1 | HEALTHY (green) |
| `worn` | 60% | yes | 1 | WORN (white) |
| `damaged` | 30% | yes | 0.75 | DAMAGED (yellow) |
| `critical` | above 0 | yes | 0.4 | CRITICAL (orange) |
| `disabled` | 0 | no | 0 | DISABLED (red) |

**The overall condition** is the sum of every section's integrity over the sum of their maximums (bigger sections weigh more), with the same thresholds; it also gives how many sections are below their maximum and the worst one. **The ship is lost** when a vital section (a hull) reaches 0.

### Damage

A blow (`ShipState.applyDamage`, or the `shipDamage` script step) names a section, an amount and a category: `impact` (the default), `shark`, `cannon`, `collision`, `storm`, `supernatural`, `botched` (a failed repair). It also carries a source, the event or challenge it belongs to, an optional `eventId`, the difficulty's tuning, whether to scale, and whether to announce it.

- **Amount:** the amount × the difficulty's `damageScale` (unless `scale: false`) × the section's resistance to the category, rounded, at least 1 (0 when immune).
- **Grace:** one blow can't take a section that is still holding (healthy, worn or damaged) straight to 0; it stops at 1 (critical). The next blow can. Brutal has no grace.
- **Result:** `{ ok, section, category, source, event, requested, applied, before, after, from, to, crossed, destroyed, becameDestroyed }`.
- **Events:** `ship:damaged`, `ship:restored`, `ship:threshold` (`{ section, from, to, direction }`, once per crossing, either way), `ship:destroyed` (once, when a vital section first reaches 0), `ship:changed` (anything changed: the HUD redraws), `ship:loaded`.

**Invariants** (`tests/ship.test.js` 7):

- Integrity is always a whole number from 0 to the maximum.
- An unknown section or category, or an amount that isn't a positive number, changes nothing and says why.
- **One event lands once:** a blow with an `eventId` applies once however often its callback fires. Repeated real attacks (no id, or their own ids) all land. The ids seen are per play, never saved, and capped at 128. *(Changed in Prompt 6: the ids are now saved and checkpointed, and scoped to the challenge attempt or charge applying them, so a retry can take the same hit again; see [10-flooding-and-fire.md](10-flooding-and-fire.md), section 9.)*
- **No damage after the fact:** inside a challenge, a blow is refused once that challenge has resolved, unless the step says `"authorized": true`.

### What a condition means

`isOperational(id)`, `efficiency(id)` and `stateOf(id)` are what other systems read, and the `ship` condition is what scripts read:

```json
{ "if": { "ship": { "section": "rigging", "operational": false } }, "then": [ ... ] }
{ "ship": { "section": "hull_port", "state": ["critical", "disabled"] } }
{ "ship": { "section": "hull_port", "integrity": { "lt": 50 } } }   (percent)
{ "ship": { "overall": { "lt": 60 } } }    { "ship": { "destroyed": true } }
```

**Implemented effect:** the demo's "hoist the mainsail" scene behaves differently with the rigging out of action (it can't), damaged or critical (it goes up slowly) and sound. The condition is validated like any other (unknown sections, states and keys are content errors).

**Planned, not implemented:** nothing in the game reads `efficiency` yet: no sailing speed, steering, footing or flooding. Each is a hook for the system that will own it (see "Hooks").

## Repairs

### What a repair needs

A repair (`shipRepair`, which the Ship page starts) needs all of these, checked by `repairPlan` before anything happens:

1. A known, repairable section below its maximum ("needs no repair" otherwise).
2. The right place: the captain in one of the section's rooms. A station's script can pass `"anywhere": true`.
3. **Enough materials for the worst outcome:** the bill, plus a rough repair's extra, or a failure's waste, whichever is more. A repair never starts unless it can be paid for however it ends.
4. No repair of that section under way already (a per-section lock, held for the whole repair).

If any is missing, nothing changes: the player is told why ("Not enough materials: Nails 2/3.", "Work on the main deck from: Main Deck."), and `outcomeValue` reads `refused`.

### How it plays

The repair is the strict timing bar (the `ship_repair` profile in `data/challenges/profiles.json`; a repair may name its own profile in `challenge`), with these steps:

1. **Lock** the section.
2. **Play** the bar. Captain allows 2 fumbles, Deckhand 3, Brutal 1. No fumbles is a **success**; finishing with fumbles is **partial**; more fumbles than allowed is a **failure**. A repair is never won by default: a hand that can't find the green fails.
3. **On a failure**, the try's materials are wasted (a sticky cost, so it survives "Try again") and the player may **try again**. The tries are limited to what the hold can pay for (`affordableAttempts`). **Carry on** (giving up) does the failure's damage to the section (`botched`, unscaled), and the repair ends with nothing restored.
4. **Commit before the run closes** (the runner's `settle` hook): a success takes the bill and restores the success amount; a partial takes the bill plus its extra and restores the partial amount. All or nothing (`ShipState.commitRepair`): if any item can't be taken, what was taken goes back and nothing is restored. The challenge record's `transitions` show the materials and the section changing together.
5. **Unlock**, even if something broke, and tell the player ("Repaired: Port hull 95% HEALTHY. Used 2 Planks, 2 Nails."). Then `outcomeValue` and `ifSuccess` / `ifPartial` / `ifFailure` run, and they see the repaired ship.

### Costs and results

The materials are four new items of a new type, `material` (`data/items/materials.json`): planks, nails, rope, sailcloth. They have no `use`; the Items menu lists them under Supplies, dimmed. Each repair, per difficulty (restore on success / partial):

| Repair | Deckhand | Captain | Brutal |
|---|---|---|---|
| `hull_patch` (3 strikes) | 1 plank, 1 nail; +44 / +23 (+1 nail); fail: 1 nail, −3 | 2 planks, 2 nails; +35 / +18 (+1 nail); fail: 1 nail, −4 | 3 planks, 3 nails; +30 / +15 (+2 nails); fail: 2 nails, −5 |
| `hull_rebuild` (4) | 2 planks, 2 nails; +38 / +19 (+1 plank); fail: 1 plank, 1 nail | 4 planks, 3 nails; +30 / +15 (+1 plank); fail: 1 plank, 1 nail | 6 planks, 5 nails; +26 / +13 (+2 planks); fail: 2 planks, 2 nails |
| `rudder_fix` (3) | 1 plank, 1 rope, 1 nail; +38 / +19 (+1 rope); fail: 1 nail, −2 | the same bill; +30 / +15 (+1 rope); fail: 1 nail, −3 | 2 of each; +26 / +13 (+2 rope); fail: 2 nails, −4 |
| `deck_mend` (2) | 1 plank, 1 nail; +38 / +19 (+1 nail); fail: 1 nail, −2 | the same bill; +30 / +15 (+1 nail); fail: 1 nail, −3 | 2 planks, 2 nails; +26 / +13 (+2 nails); fail: 2 nails, −4 |
| `rigging_splice` (3) | 1 rope, 1 sailcloth; +44 / +23 (+1 rope); fail: 1 rope, −2 | 2 rope, 1 sailcloth; +35 / +18 (+1 rope); fail: 1 rope, −3 | 3 rope, 2 sailcloth; +30 / +15 (+2 rope); fail: 2 rope, −4 |
| `rigging_rebuild` (4) | 2 rope, 1 sailcloth; +38 / +19 (+1 rope); fail: 1 rope | 3 rope, 2 sailcloth; +30 / +15 (+1 rope); fail: 1 rope | 5 rope, 3 sailcloth; +26 / +13 (+2 rope); fail: 2 rope |

A repair never takes a section past its maximum. A disabled section (0) takes its `rebuild`.

## Difficulty

There is one difficulty system. Each preset in `data/difficulty/presets.json` has a `ship` block, and `shipTuning(content, difficulty)` reads it with bounds:

| | Deckhand | Captain | Brutal | Bounds |
|---|---|---|---|---|
| `damageScale` (damage taken) | 0.75 | 1 | 1.25 | 0.5–1.5 |
| `repairScale` (what a repair restores) | 1.25 | 1 | 0.85 | 0.5–1.5 |
| `costScale` (materials, rounded up, at least 1) | 0.5 | 1 | 1.5 | 0.5–2 |
| `grace` (one blow can't reach 0 from holding) | yes | yes | no | – |
| Fumbles allowed on a repair (`ship_repair` profile) | 3 | 2 | 1 | – |

Failure penalties scale with the same numbers (waste × `costScale`, damage × `damageScale`). A repair may write a difficulty's results itself (`"difficulty": { "brutal": { "results": { ... } } }`), which are then used as written. **A repair keeps the difficulty it started on**: changing the difficulty mid-repair changes nothing until the next one.

**Assists.** The timing assist makes the bar slower and its green wider for the attempt. It never changes what a repair restores or costs: the same hand gets the same result with it on or off, and a hand that can't find the green still fails (test 20). The classic bar (Prompt 4's option for strict bars) widens and steadies the green after a miss. A repair can still fail with it, and misses still make the repair rough.

## Challenge integration

Any challenge can now charge the ship. The Prompt 3 findings asked for real targets instead of story variables:

```json
{ "repair": "hull", "strikes": 3,
  "challenge": { "profile": "repair_strict", "id": "pNN_breach",
    "onFailure": { "continue": true,
      "costs": [{ "takeItem": "planks", "count": 1 }],
      "consequences": [{ "shipDamage": "hull_port", "amount": 12, "category": "impact" }] } } }
```

- **Ordering** (explicit, tested): an attempt plays → a failure's **costs** are charged at once (sticky: replayed after every checkpoint restore, so "Try again" never refunds them, and paid once per failure, never doubled) → the decision → on Carry on, the **consequences** → the outcome's `settle` (a ship repair's commitment) → the run closes and its record is written → the step's branches.
- **Damage inside an attempt** (a hazard during the bar) is part of the attempt: a retry's checkpoint restore undoes it. Damage meant to last belongs in `costs`.
- **Validation:** `shipDamage` and `shipRestore` need an amount above 0, sections and categories must exist, and a `shipRepair` step's challenge is validated with the repair's strikes. Every repair's challenge is checked on every difficulty: it must be able to fail, and it can't be must-win (the materials may run out).

## Checkpoints and saves

- **Checkpoints** capture the `ship` domain with the rest. A retry restores the ship and the hold together (a repair can't be undone without its materials coming back, and vice versa). `diffStates` reports `ship: { section: [before, after] }`. Locks and seen event ids are per play: a restore doesn't touch them. *(Prompt 6: the seen event ids are now part of the `ship` domain, so a restore puts back the ids of its moment; locks are still per play.)*
- **Save version 18** stores `ship: { sections: { hull_port: 60, ... } }`, and nothing else. The 17 → 18 migration adds `{ sections: {} }` when a save has no ship (or something odd in its place); a missing section loads at its maximum, so **an old save loads with a whole ship, and no damage is invented**. Loading drops unknown sections (with a warning), turns a non-number into a whole section, and clamps and rounds the rest.
- **No exploits** (test 23): a save taken mid-repair holds the ship and hold as they were when it was taken. Nothing is half-spent, and no repair is under way after loading. A failed try's waste stays wasted in a later save. Loading the same save twice gives the same hold. A permanent cost survives a retry only when it is a sticky cost.

## HUD and controls

At 320×224, with words as well as colour everywhere:

- **Toasts** for every blow and repair ("Port hull hit by a shark: 60% WORN!", "Rough repair: Port hull 78% WORN. Used 2 Planks, 3 Nails.", "Not enough materials: Nails 1/3."). Every combination is checked to wrap to at most 4 toast lines.
- **The badge** at the bottom left: "SHIP 69%: 1 DISABLED (3 hit)", which is the whole ship's percentage and how many sections are in the worst condition, coloured by it. It only shows while a section is below its maximum. It gives way to dialogue, timing bars, the sash close-up, the menus, battles and the F2 panel, so it never covers them.
- **Pause > Ship** (after Quests): the overall condition and bar, the six sections ("Port hull 60% WORN"), and for the highlighted one: integrity, whether it's vital, what it does and whether it still works ("Keeps the sea out: WORKING", "OUT OF ACTION"), the repair's bill against what the hold has (short items in red), a rough repair's extra, then either "[Z] Repair (4 tries)" or why not.
- **Controls:** keyboard (arrows, Z, X) and gamepad (d-pad, A, B), no mouse. Confirm on a section that can be repaired closes the menu and starts the repair in the world. Confirm on one that can't buzzes and stays. One press starts one repair: the page ignores a second confirm, and the section lock refuses a second repair.
- Every list row and every detail panel, in every state, is checked to fit its space (`tests/ship.test.js`, "the ship's words fit").

## Trying it (the demo)

The demo is a debug fixture, not a story chapter. It adds nothing to any room.

1. Run the dev build (`npm run dev`), F2 > **Ship** > "Jump: Ship Integrity demo" (or the `ship_demo` preset). It is the end of Phase 17 in the crew quarters, with a whole ship and 6 planks, 6 nails, 4 rope and 2 sailcloth.
2. F2 > Ship > "A shark bites the port hull (40)". A toast and the badge appear.
3. Pause > Ship: the port hull is WORN; its patch needs 2 planks and 2 nails (you have 6 of each). Confirm: the bar opens.
4. Fumble three times for a failure: a nail is wasted. Choose "Try again" and strike on the green. The hull goes back up, and the materials are spent (see Items > Supplies).
5. F2 > Ship > "The storm tears the rigging (twice: out of action)", then "Try to hoist the mainsail": it can't. Go to the main deck (the rigging is worked from there), rebuild it from Pause > Ship, and hoist again: it goes up slowly (the rigging is damaged). With the materials from "Give repair materials", splice it whole.
6. Pause > Save, reload, Continue: the ship and the hold are as you left them.

The F2 Ship tab also lists every section's integrity and has "Repair everything (no materials)", "Take every repair material", the other scenes, and "Sink her" (both hulls to 0: the destroyed hook's toast).

## Limitations

- **Nothing reads `efficiency` yet**, and only the demo reads `operational`. Damage has no effect on speed, steering or footing until the systems that own those exist.
- **No repair stations.** Repairs start from Pause > Ship in a section's rooms. Stations (world objects with a section) are for the layout prompts, which will call `shipRepair` with the station's section (and `anywhere` if the station is the place).
- **No source of materials in the campaign.** Only the demo preset and F2 give them. Resources and supply (Prompt 10) will add sources, and the shops can stock them then.
- **The ship can be "lost" but there is no defeat:** `ship:destroyed` and `ship.onDestroyed.script` are hooks, and without a script the world shows a toast.
- **Event ids are per play**, and a checkpoint restore doesn't forget them. A blow that can repeat inside a retried challenge needs an id per attempt (include the attempt number), or none. *(Fixed in Prompt 6: ids are scoped and restored with the checkpoint; see [10-flooding-and-fire.md](10-flooding-and-fire.md), section 9.)*
- **One section, one repair at a time**, from one place. Crew repairing in parallel (Prompts 20–26) needs per-station locks.
- **No new sound or animation** for damage: a toast and the badge. The game's look is unchanged.
- **The 100-minute full browser suite was not run.** The smoke suite and the new and affected specs were (see the Prompt 5 report).

## Hooks for later systems

Documented here, with no code until the owning prompt:

| System (prompt) | Reads | Writes |
|---|---|---|
| Flooding (6), **done** | the hulls' percentage (a leak's severity: below 60 / 30 / 15%) | `strain` damage from a foundering hold; water is its own state ([10](10-flooding-and-fire.md)) |
| Fire (6), **done** | the sections each room's fire names, their `fire` resistance | `applyDamage` with the `fire` category (added to `categories`) |
| Atmosphere per room (7) | a section's rooms | none: atmosphere and integrity stay separate |
| Pressure events, Brogath / Garrick (8) | – | an eruption's `shipDamage` (category `supernatural`, with an `eventId`) |
| Beard Saturation (9) | – | none planned |
| Resources and cooking (10) | – | material sources, shop stock |
| Crew schedules and crew repairs (20–26) | `repairPlan` | `shipRepair` from a station, per-station locks |
| Combat (27–34) and naval combat | `cannon` resistances | `shipDamage` per hit (`cannon`, `collision`), `eventId` per shot |
| The storm (campaign prompts) | – | `storm` damage, `ship.onDestroyed` if a chapter makes the ship sinkable |

## Rules for the layout prompts (12–19)

- **Sections are not places.** Never key a section, a repair or a condition on tiles or coordinates. When rooms move, update `rooms` in `data/ship/integrity.json`. The validator rejects unknown rooms and any `x`, `y` or `tiles` field on a section.
- **Stations are objects** that run `shipRepair` for their section. Put them in rooms with room to stand. Don't add repair props to the crowded rooms before the decluttering prompts.
- **Keep the six ids.** Renaming one is a save migration.

## Testing

- `tests/ship.test.js` follows the 27 checks, plus "the ship's words fit". It is deterministic: repairs play the game's own timing bar with simulated hands (`playHands`) on fixed seeds, `decideChallenges` answers the outcome prompt, and the harness records toasts (`story.notices`). `story.onAttempt(fn)` runs as each bar attempt starts: the tests save the game from there in the middle of a repair.
- `e2e/ship.spec.js` covers the browser. With the keyboard (`@smoke`): the demo, damage, the badge, the Ship page, a failed repair, "Try again", the materials spent, a refusal for want of nails, then save, reload and Continue. With a stubbed pad (`@input`): the pad opens the page, and two presses start one repair.
- The regression harness: every phase snapshot has `systems.ship` whole (approved once, with the reason, in `tests/regression/baselines/APPROVALS.md`). `shipRepair` is registered as a challenge kind with 0 uses, and `shipDamage` and `shipRestore` are registered as non-challenge commands.
