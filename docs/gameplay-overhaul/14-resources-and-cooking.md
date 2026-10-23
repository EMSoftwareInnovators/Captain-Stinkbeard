# 14. Shipboard Resources, Supplies, Equipment and Cooking

Overhaul Prompt 10. The ship gets a supply economy you work with your
hands: materials and food come from places in the rooms (loose crates to
search, stove-in crates to pry loose on the timing bar, provision barrels,
the galley's sacks and grog jugs, and two places that always give a little
back: the bilge and the old sacking). The cargo hold has the ship's stores
(put away, take out, a capacity). The existing protective story items can
be worn by hand, one to a slot. Food and draughts give timed effects on the
hazard clock. The galley cooks four story foods on the timing bar. It all
runs on the same pack (the session's one inventory), the same items, the
same challenge runner and checkpoints, the same hazard clock, the same
difficulty presets and the same saves as everything before it.

**Opt-in.** No chapter switches it on (tested: no script, map, quest, NPC
or shop names a supplies command, condition or item, and every new game
and debug preset starts with it off). Every key item, Frog Grog, the rum
ration that becomes it, every shop, chest and repair plays exactly as
before. The system and an isolated debug demo are all this prompt adds.

| What | Where |
|---|---|
| Data | `data/ship/supplies.json` (classes, stores, sources, gear, effects, limits, stations, recipes); new items `data/items/supplies.json` |
| Rules (no state) | `src/systems/ship/supplies.js`: lookups, reach, yields, the economy report, validation |
| State | `src/systems/ship/SupplyState.js`: `ship.supplies`, saved and checkpointed with the ship |
| The captain's part | `src/systems/ship/supplyResponse.js`: Respond groups, reports, work seconds, the bar's zone |
| Commands | `src/systems/script/commands.js` (`suppliesSystem`, `supply*`, `gear*`, `useSupply`, `cook`, `serve`, `cookReport`, `learnRecipe`), schemas in `commandSchemas.js` |
| Condition | `supplies` in `src/systems/conditions/conditions.js` |
| Item effect | `shipEffect` in `src/systems/effects/effects.js` (the Items menu's use, unchanged otherwise) |
| World | the Respond button follows him from spot to spot; the protection pipeline (`WorldScene.updateHazards`) |
| Pages | Pause > Ship rows (`src/ui/menu/ShipPage.js`), Pause > Items descriptions (`src/ui/menu/ItemsPage.js`) |
| Icons | `sack`, `onion`, `fish`, `bowl`, `tot` in `src/art/ui/itemIcons.js` |
| Economy | `npm run economy` (`tools/economy.mjs`) |
| Demo | `supplies_demo` preset, F2 > Ship > Supplies A-F (`src/debug/shipDebug.js`) |
| Tests | `tests/supplies.test.js` (40), `e2e/supplies.spec.js` (4) |

**What existed before** (the preflight): one inventory (`src/systems/inventory/Inventory.js`: counts, stacks, gold, `add` clamps and returns what fitted, `remove` is all or nothing), item types `consumable`, `equipment`, `key`, `material`; party equipment slots (weapon, body, feet, accessory) that move an item out of the pack into a character; repair materials (planks, nails, rope, sailcloth) paid from the pack by every repair and emergency action through one atomic `takeAll`; chests that give once (`WorldState.markOpened`); shops; quest and battle rewards; the field use of consumables (`applyEffects`); Frog Grog's per-play ward (`transient.fumeWard`); the beard's worn list (Prompt 9); the galley's story cooking (the `stir`, `plate`, `crack`, `slice` and `scorch` bar kinds in Phases 10 to 13). All of it is reused; none of it is replaced.

## 1. Classifications

Every functional resource is in exactly one class (`classes`, validated: one class each, real items, never a key item except gear):

| Class | Items | Purpose |
|---|---|---|
| Repair materials | planks, nails, rope, sailcloth | the bills of every repair and emergency action (Prompts 5 to 9), unchanged |
| Emergency supplies | bandage, healing tonic | healing, as before |
| Ingredients | beans, onions, oats, garlic, salt fish (new, `material`) | the galley's recipes |
| Food | hardtack, bean stew, oat porridge, fish chowder, garlic broth (four new, `consumable`) | eaten from the Items menu |
| Draughts | grog tot (new, `consumable`) | a measured portion with a ward and a drawback |
| Protective gear | beard wrap, wet cloth, bottle goggles, Bob's Pot | worn, never used up |

The story foods are the story's own: beans (the most named food in the game), onions, garlic, oats, salted fish. No redundant variants: one sack icon for dry goods, one bowl for every cooked meal.

**Never classed** (so nothing here can store, spend, cook or take them): Frog Grog, the rum ration (a chapter 11 `swapItem` turns it into Frog Grog), every key item that isn't gear. The validator refuses classing any item a story step takes or swaps (`takeItem`, `swapItem`): the stores could hold it when the story looks for it.

**Purpose and source, documented by the data itself**: `npm run economy` lists, per difficulty, each resource's class, its sources (and the most the finite ones give), its renewable paths, the shops that sell it, the recipes that make it, and every bill and recipe that uses it.

## 2. Source definitions

A source is a place in a room (`sources`):

| Field | Meaning |
|---|---|
| id (the key) | lower_snake_case |
| `type` | `cache` (searched: seconds of work, no bar), `salvage` (pried loose on the timing bar), `recovery` (always there, small, a cooldown after each) |
| `label`, `room`, `at`, `reach` | where: the props' tiles in an existing room, and how close he must stand (no new scenery) |
| `action` | `label`, `seconds`; a salvage also `kind`, `title`, `strikes`, `challenge` |
| `yields` | the possible items and their counts (one entry per item) |
| `results` | a salvage's shares: success 1, partial its share |
| `knock` | a salvage's failure: HP lost (`hp`), never below `floor` of his maximum |
| `uses` | how many times it gives (a recovery: unlimited) |
| `restock` | `{ every, add, max, when? }`: replenishes on hazard time, under an optional condition |
| `cooldown` | a recovery's seconds between uses |
| `when` | a condition (story restrictions) for it to be there at all |
| `closed` | starts closed until a script opens it |

Difficulty modifiers are the difficulty's (section 13); persistence is always saved and checkpointed (section 3).

The sources built (all in rooms that already had the props):

| Source | Type | Room | Gives | Uses / renewal |
|---|---|---|---|---|
| the loose crates | cache | cargo hold | 2 planks, 3 nails, 2 beans | 1 |
| the stove-in crates | salvage (`pry`) | cargo hold | 2 planks, 2 nails, 1 sailcloth | 3 |
| the provision barrels | cache | cargo hold | 2 salt fish, 3 oats | 1 |
| the bilge | recovery | cargo hold | 1 plank, 1 nail | every 60 s |
| the old sacking | recovery | cargo hold | 1 sailcloth, 1 rope | every 90 s |
| the galley sacks | cache | galley | 2 onions, 1 garlic, 2 beans | 1, restocks 1 every 240 s |
| the grog jugs | cache | galley | 1 grog tot | 2, restocks 1 every 180 s |

## 3. Acquisition and depletion

Physical only: an action is offered by Respond (V, pad X) when he stands within reach of the place, never from a menu elsewhere (a script may say `"anywhere": true`). Searching and recovering take their seconds of work on the hazard clock (the ship goes on meanwhile); a salvage is the timing bar.

Taking is one transaction (`SupplyState.take`): check it is there (open, its condition, not cooling down, something left), compute the yields (the difficulty's, the outcome's share), refuse the whole take if the pack can't hold all of it (nothing lost, the source untouched), then the source is one use emptier and the pack gets the items. A failed salvage leaves the source as it was (the knock is its cost).

No duplication:

- **Callbacks**: the take happens once, in the challenge's settle step (after the final outcome), never in an attempt.
- **Room re-entry**: a source's state is the ship's, not the map's: leaving and coming back changes nothing.
- **Saves and reloads**: saved (section 15); a reload has exactly what the save had.
- **Retries**: a challenge's checkpoint holds the pack and the sources together; a restore puts both back (section 16).

## 4. Restocking

Event-driven: on the hazard clock's tick only (the same one-second clock as the water, fire, air and beard; it runs while the captain is free in the world), never per frame and never on a room visit. When a restocking source drops below its `max`, its clock starts; at zero it gains `add` uses (never past `max`), and starts again if still short. A `restock.when` condition pauses the clock while false. A recovery's cooldown counts down the same way. The difficulty's `restockScale` stretches both (section 13). Nothing is restocked while the system is off.

## 5. Inventory and ship storage

**One inventory.** What the captain carries is the session's ordinary pack; nothing parallel. The ship's stores (`stores.hold`, "the ship's stores", in the cargo hold by the big crates) are a shared supply: what is put there is no longer in the pack.

- **Deposit** and **withdraw** standing at the stores (Respond > the ship's stores > Put supplies away / Take supplies out: the item, then how many: 1, 5 or all; five items to a page, "More..."), **inspect** ("Check the stores": by class).
- **Capacity**: 60 units in all. **Accepts**: repair materials, emergency supplies, ingredients, food (never gear: it is worn; never a draught; never a key item).
- **Who pays (material ownership).** Repairs and emergency actions pay from what the captain carries, never from the stores: he fetches (the Ship page says what's short in the pack and is in the stores). This keeps every repair bill exactly as Prompts 5 to 9 made it. The galley is the one authorised spender: the cook may draw on the stores from the galley (`spend: { for: ["cook"], in: ["galley", "cargo_hold"] }`), the pack first, then the stores.
- **Hooks for a quartermaster or carpenter**: `supplyTransfer` with `"anywhere": true` (an errand), `supplyStore` (stock or empty a store: give, take, `empty`), and `spend` per store (which actions may draw on it, from where). No crew schedules, no pirate moved.

## 6. Transaction safety

Every operation is whole or nothing, and checked before anything changes:

- a deposit: a real store, a real item that isn't a key item, a class it takes, a whole count of 1 or more, room in the store, that many in the pack; then the pack loses them and the store gains them.
- a withdrawal: that many in the store, room in the pack (its stack limit); then the reverse.
- a bill (`spend`): every item counted across the pack and the reachable stores first; then the pack first, then the stores. A key item is never spent.
- a take, a serve: refused if the pack can't hold all of it.
- a store's entry disappears at zero (no negative or ghost counts); a store can't be spent from where it isn't reachable.

Tested: double deposits and withdrawals, zero, negative and fractional counts, a full store, a key item, a draught, a party weapon, a bill with too little.

## 7. Recoverability

Finite (caches, the salvage), renewable (the galley sacks and jugs restock) and emergency-recovery (the bilge, the sacking) sources. **Every repair material has a way back from empty on every difficulty**: the bilge gives planks and nails, the sacking sailcloth and rope, for time (a minute and a half of hazard time on Brutal between them, plus the work) and the risk of whatever is happening meanwhile. The validator refuses data where a repair material has no restock, recovery or shop (`economyReport`'s problems), and a recovery is bounded (at most two of each, a cooldown of 20 to 600 seconds, always there, no condition).

`npm run economy` (Brutal):

```
nails      repair   finite 5   hold_bilge: 1 every 102s     | 18 bills
planks     repair   finite 4   hold_bilge: 1 every 102s     | 10 bills
rope       repair   finite 0   hold_sacking: 1 every 145s   | 8 bills
sailcloth  repair   finite 3   hold_sacking: 1 every 145s   | 6 bills
mandatory (what a chapter requires): none (no chapter opts in)
```

Nothing is invented: "mandatory" lists what a chapter actually requires, which is nothing, and the repair bills are reported per action, not as a fabricated campaign total.

## 8. Equipment

Opt-in functional definitions for four existing story items (`gear.items`), worn by hand only (Respond > Your gear: Wear / Take off; `gearEquip`), never by themselves (giving one, or getting it back, wears nothing):

| Item | Slot | What it does while worn |
|---|---|---|
| beard wrap | beard | the beard catches less (the beard's `absorb`, Prompt 9) |
| wet cloth | face | filters what reaches the lungs (the beard's `lungs` 0.7) while wet: it dries one charge per second of bad air breathed through it (120), and is wetted again at water (the galley and hold water barrels, the washroom tub) |
| bottle goggles | eyes | keeps the sting of a gassy beard out of the eyes (the beard's `irritant`) |
| Bob's Pot | head | half a salvage's knock (`knock` 0.5); comes down over the goggles (not worn with them) |

- **Slots**: one to a slot; wearing another takes the last off (said). **Restrictions**: `notWith` (refused with its reason), an optional `when`. **Charges**: optional (the cloth). **Ownership**: worn gear stays in the pack; wearing is a mark, never a copy or a move, so a story check for the item still finds it, and nothing can sell (a key item's price is 0), store, spend or cook it. If the story takes it away, it no longer counts as worn.
- **One worn list**: the beard's (`ship.beard.worn`, saved since version 22), read here for slots and charges and by the beard for its own effects. The beard's own "Wear" option still works and, with the supplies on, goes by the same rules (one Respond entry, not two).
- **Saved and checkpointed** with the ship. No durability beyond the cloth's charges; no slot without a function (validated).

## 9. Consumables

A consumable is used from the Items menu (or `useSupply`): it must be in the pack, its use is checked (`wouldAffect`: nothing that would do nothing; a timed effect only while the supplies are on and only for the captain), exactly one is taken, its effects apply once (`applyEffects`), and a line says what happened ("Stinkbeard recovers 25 HP." then "Full belly 240s."). Its effects are the existing item-effect pipeline plus one type, `shipEffect` (a timed effect, or a little of the lungs cleared). Protections go through the same exposure pipeline as everything else (section 10): masks by the smaller, draughts by the smaller, the two multiplied, never past the best there ever was (0.245 of the air, under the rescue gear and Frog Grog's stench-proof). When the last one is gone, the next use is refused and nothing changes.

## 10. Frog Grog

The design chosen: **a new portion item**, the grog tot, poured from the galley jugs (a renewable source), never made from Frog Grog. Frog Grog itself is unchanged: the same item, effects (heal, its per-play ward, its weighted side effect), quests, swap and story; nothing here classes, stores, spends or cooks it.

The tot: 10 HP, and `grog_ward` for 90 s: 0.6 of the air reaches the lungs, and the hands wobble (4 pixels off a repair, salvage or cooking bar's green zone): a bounded effect with a drawback, no intoxication system. It is a draught, taken with Frog Grog's ward by the smaller, never multiplied with it:

```
protect = min(rescue gear 0.7, the beard's cloth)                     masks, as in Prompt 9
        × (a draught on ? max(0.35, min(Frog Grog ward, the draught)) : Frog Grog ward)
```

Without a tot (every chapter) the formula is exactly the old one. No chapter requires or depletes Frog Grog any differently (tested in the browser: drunk from the Items menu with a tot on, its own ward and side effect, the smaller ward wins).

## 11. Recipes and cooking

Data-driven (`recipes`): id, name, ingredients and counts, station (the galley stove: no new prop), product, portions for success and partial, the waste of a scorched try, seconds of work, simmer time, and the stir on the timing bar (`stir`, three strikes, the `ship_repair` profile). Four recipes, all story food:

| Recipe | Ingredients | Serves | Simmer | Effect |
|---|---|---|---|---|
| Bean Stew | 2 beans, 1 onion | 2 (partial 1) | 30 s | 25 HP; full belly |
| Oat Porridge | 2 oats | 2 (1) | 20 s | 15 HP; steady hands |
| Fish Chowder | 1 salt fish, 1 onion, 1 oats | 2 (1) | 40 s | 40 HP; warm belly |
| Garlic Broth | 1 garlic, 1 onion | 2 (1) | 20 s | 10 HP; clears 25 of the lungs |

At the stove (Respond > the galley stove): Cook (offered greyed with what's missing), Serve, "What can I cook?". The stir decides it: **success** and **partial** take the ingredients (the pack, then the stores the cook may draw on), seconds of work, and put the pot on to simmer on hazard time (he can walk away: "Bean Stew is ready. Serve it at the stove."); **failure** scorches it: its waste (one of the first ingredient) is lost, a cost a retry keeps, and nothing cooks. Food poisoning is not a result. Tries are limited to what can be paid for. One pot at a time; it is served once, into the pack. A recipe can be kept back (`known: false`) for a script to teach (`learnRecipe`).

## 12. Food effects

Timed effects (`effects`), on the hazard clock, saved:

| Effect | Group | Seconds | What |
|---|---|---|---|
| Full belly (FED) | meal | 240 | emergency work takes 0.85 as long |
| Steady hands (STEADY) | meal | 180 | +4 px of green on repair, salvage and cooking bars (a preparation bonus) |
| Warm belly (WARM) | meal | 240 | bad air does half the harm |
| Grog-warded (GROG) | draught | 90 | 0.6 of the air reaches the lungs; −4 px of green |

HP comes from the existing `heal` (never past the maximum). **Minor-condition recovery**: garlic broth clears up to 25 points of bad-air exposure (bounded by `limits.recover`). **Bounded**: one effect per group (a new meal replaces the last; the same one again only restarts its clock), every effect ends (at most 600 s), and the combination keeps its floors (work ≥ 0.8, harm ≥ 0.5, zone within ±6, lungs ≥ 0.35). No stamina system exists to feed (work speed stands in for it), and **no hunger meter**: nothing needs a meal. Food clears no gas from the beard, cures no story condition and never touches a Grand Stenchmaster.

## 13. Difficulty

The existing three presets (`data/difficulty/presets.json`, each preset's `ship` block, bounded in `SHIP_TUNING`), no new setting:

| | Deckhand | Captain | Brutal |
|---|---|---|---|
| `supplyYieldScale` (what a source gives) | 1.25 | 1 | 0.75 (never below 1 of an item) |
| `restockScale` (restocks and recovery cooldowns) | 0.75 | 1 | 1.5 |
| `supplyZone` (salvage and cooking bar, px) | +4 | 0 | −4 |
| `effectScale` (how long food and draughts last) | 1.25 | 1 | 0.8 |
| `costScale` (repair bills, a scorched try's waste) | 0.5 | 1 | 1.5 |
| `maxFumbles` (the `ship_repair` profile) | 3 | 2 | 1 |

Every difficulty keeps a recovery route (section 7; tested on all three). The Timing Assist and the Classic Bar change how the bar plays, never an amount: no supplies field reads them.

## 14. Accessibility

Everything is said in words as well as colour (stores counts, "[0 left]", "picked clean 30s", "missing Oats 0/2", effect names and seconds). Everything is turn-based or waits for input except the hazard clock (which only runs while he is free in the world, and pauses for every menu and dialogue). The bars are the shared timing bar with its assists. Reduced effects hide nothing. Every Respond label, report line and notice is measured to fit 320×224 (tested), and the store lists page rather than overflow. Keyboard and pad alike (both tested in the browser).

## 15. Save migration

**Save version 23** (`SAVE_VERSION`, migration `22 -> 23`). The ship's state gains `supplies`, written sparsely and only once used (`{}` until then): on, each store's stock, each touched source (`left`, `restockIn`, `cooldown`, `open`, `taken`), effects with their seconds, the pot (recipe, portions, seconds left), the cloth's charges, recipes taught. Never a derived value (no totals, factors, "ready" or availability; tested). What is worn stays the beard's list. Versions 17 to 22 load with the supplies off, the stores empty and every source as the data has it: nothing given retroactively, the pack, its key items and Frog Grog exactly as they were (tested on all six). Damaged data loads safely: unknown stores, items, sources, effects and recipes are dropped with a warning, key items never stored, counts made whole and clamped, one effect per group, an impossible pot dropped.

## 16. Checkpoints and retries

`ship.supplies` is in the ship domain: a challenge's checkpoint captures and restores it with the pack, the party and the beard's worn list at once. The checkpoint diff names what changed (`supplies`: on, store deltas by item, sources taken, the pot, effects). The ten checks (tested):

1. a salvage awards its supplies;
2. a later challenge fails;
3. its retry restores that challenge's state, and the salvage stays;
4. rewards can't be collected twice (a salvage retried gives once; a restored checkpoint takes back what came after it);
5. permanent costs survive only when configured (the knock and the scorched waste are the failure's sticky costs);
6. repeated failures charge correctly (two failed salvages: two knocks; two failed stirs: two wastes);
7. cooking can't duplicate ingredients or meals (a restore puts the pack, the stores and the pot back exactly; serving twice serves once);
8. equipping can't duplicate items (a mark, not a copy; restored with it);
9. a consumable can't be used after it is gone;
10. saving in the middle (a pot on, a restock and a cooldown counting, an effect running, mid-salvage) is whole and consistent, and the loaded game goes on the same way.

## 17. Commands and conditions

All validated; all opt-in; no chapter uses any of them. The pack keeps its own `giveItem` and `takeItem`.

| Command | What |
|---|---|
| `{ "suppliesSystem": true }` | switch on or off (off keeps the stores and sources as they are) |
| `{ "supplyStore": store, "give"?: [{item, count}], "take"?: [...], "empty"? }` | a script stocks or empties a store (no pack) |
| `{ "supplyTransfer": store, "item", "count" \| "all", "to": "store" \| "pack", "anywhere"? }` | move between the pack and a store |
| `{ "supplyMenu": "deposit" \| "withdraw", "store" }`, `{ "supplyCheck": store }` | the stores' Respond flows |
| `{ "supplySource": id, "op": "open" \| "deplete" \| "restock", "count"? }` | open, empty or restock a source |
| `{ "supplyTake": id, "anywhere"?, "challenge"? }` | the captain takes from a source (a salvage is the challenge) |
| `{ "gearEquip": item, "remove"? }`, `{ "gearRecharge": item }` | wear or take off; wet the cloth at water |
| `{ "useSupply": item }` | eat or drink one (the Items menu's use) |
| `{ "supplyEffect": id, "remove"? }` | start or end a timed effect |
| `{ "learnRecipe": id }` | teach a recipe |
| `{ "cook": recipe, "anywhere"?, "challenge"? }`, `{ "serve": true }`, `{ "cookReport": true }` | begin cooking, resolve it, what can be cooked |
| `{ "supplySetback": "salvage" \| "cook", ... }` | a failure's cost (internal) |

The condition `{ "supplies": { ... } }` reads `active`, `has` / `stored` (+ `store`) / `reach` with `count`, `source` with `left` or `ready`, `wearing`, `effect`, `cooking` (true, false or a recipe), `ready`, `canCook`, `knows`.

Rejected by the validator: unknown items, stores, sources, recipes, effects, gear and slots; negative, zero and impossible quantities; key items anywhere a supply goes; an item a story step takes being classed; duplicate yields; a recipe ingredient that comes from nowhere, or more than can ever be held; waste that isn't an ingredient; a product that isn't food; an item giving two supply effects (contradictory); unbounded effects; a salvage or stir that can't fail or is must-win; difficulty overrides out of bounds; a repair material with no way back (unrecoverable).

## 18. UI and controls

- **Respond** (V, pad X) offers what is where he stands: a source ("Search the loose crates (5s) [1 left]", "Scavenge the bilge (12s) [60s]"), the stores, the galley stove (cook, serve, "What can I cook?"), water (wet the cloth) and "Your gear", grouped with the room's other troubles. A greyed action says why when picked. The Respond hint follows him from spot to spot.
- **Pause > Ship** (while on): "Ship's stores 9/60" (by class, where they are, who pays), "Your gear" (each slot, the cloth's wetness, what each does), "Galley" (the pot, each recipe and what it's missing), "Food & draughts" (FED 230s), "To search here" (each source's state). A repair's detail says what's short in the pack but in the stores.
- **Pause > Items**: food and draughts say what they do; with the supplies on, a supply says how many are in the stores and gear whether it is worn. Eating says the HP and the effect.
- **Acquisition feedback**: "Found 2 Planks, 3 Nails, 2 Beans."; "Picked clean for 60s."; "Bean Stew is ready."; "Full belly wore off."; "Wet Cloth is dry."

The player can answer: what materials do I have (Items, Supplies tab), where are my ship supplies (Ship > Ship's stores), what can I repair (Ship > a section; what's in the stores), what am I wearing (Ship > Your gear; Items), what can I cook and what am I missing (Ship > Galley; "What can I cook?"), what does this consumable do (Items). Keyboard and pad, the same focus rules as every page; the menu-open button never repeats into Respond.

## 19. Debug demo

F2 > Ship > "Jump: Supplies demo" (`supplies_demo`: the end of Phase 17 in the cargo hold by the stores, a plank, two nails, a sailcloth, the four pieces of gear), then:

- **A** salvage and storage: search the loose crates, salvage the stove-in ones, put it in the stores; leave and come back.
- **B** the repair loop: a leak in the hold, the materials in the stores, not on you: fetch, patch (fail, retry), recover from the bilge.
- **C** gear and draughts: bad air in the hold; the cloth (it dries), a grog tot, Frog Grog.
- **D** cooking: ingredients in the stores; up to the galley stove: stir (success, partial, scorched), simmer, serve, eat.
- **E** scarcity: nothing on you, the stores bare, every cache taken, a leak: the bilge and the sacking come back (try it on Captain and Brutal).
- **F** saves and retries: beans and onions on you: cook, fail the stir, retry; salvage; save and load.

Plus "Let 30 seconds pass" and "Switch the supplies off". The real runtime throughout; nothing is mocked.

## 20. Test and performance results

**Unit and integration** (`tests/supplies.test.js`, 40): the data and validator; the economy on every difficulty; the validator's rejections; commands and conditions validated and classed for the regression harness; caches once (room change, reload); a full pack; restocking and recovery on every difficulty; yields by difficulty; the salvage's outcomes and the helmet; the bar's zone; stores (atomic, capacity, classes, key items) and their Respond flow; who pays; gear (by hand, slots, restrictions, ownership); the cloth's drying; the beard's wear; eating; effect bounds; difficulty, warm belly, garlic broth; Frog Grog; cooking's outcomes, refusals and retries; the ten checkpoint checks; saves 17 to 22, damaged data, nothing derived; legacy protection; text fit; cost. The save-version assertions in five earlier test files moved to 23.

**Browser** (`e2e/supplies.spec.js`, 4): salvage and storage with the keyboard (leave and come back; the Ship page); cooking with a gamepad (scorched, Try again, simmer, serve, eat from the Items menu); gear and draughts (the wet cloth, Bob's Pot refusing the goggles, a tot, Frog Grog from the Items menu, saved and continued); scarcity on Brutal (the bilge, picked clean, back again).

RESULTS_PLACEHOLDER

## 21. Limitations

- One store (the hold's), one cooking station (the galley stove). No pantry, no spoilage.
- Food's effects are the captain's; another party member who eats gets the HP only.
- Stamina has no system of its own: food speeds work instead.
- Gear effects on the lungs and the beard work while the beard system is on (they are the beard's numbers); the helmet's knock is the only gear effect of its own.
- Only the wet cloth has charges; nothing else wears out.
- Shops are unchanged: no buying ingredients, no selling food (no merchant economy, no Grand Bank).
- Sources are fixed in the data; nothing spawns new ones.

## 22. Future crew and campaign integration

- **A quartermaster or carpenter** (the crew prompts): fetch with `supplyTransfer` and `"anywhere": true`; repair from the stores by adding a store's `spend.for` (the bill already goes through one `spend`); a crew schedule can restock a source with `supplySource` or `supplyStore`.
- **Campaign chapters** opt in with `{ "suppliesSystem": true }`, open a hidden cache (`"closed": true`, `supplySource` open), teach a recipe (`learnRecipe`), check `{ "supplies": { ... } }`, and reward with ordinary `giveItem`. Mandatory consumption should be added to the economy report's `mandatory` list as chapters require it, and the validator will refuse a chapter whose requirement has no recovery path.
- **The named gases** (Coffin Sock, Chicken-Town, Fire-Waft) can name a draught or a meal as a counter through the same `effects` (bounded, one per group), never a cure-all.
- **Merchants and the Grand Bank**: shops already list in the economy report; buying and selling supplies is a later prompt.
