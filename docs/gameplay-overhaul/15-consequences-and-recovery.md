# 15. Persistent Consequences, Recovery and the Captain's Journal

Overhaul Prompt 11 (roadmap S9). What a mistake, a hard choice or good
preparation leaves the captain with now outlasts the challenge that caused
it: it is carried from room to room, chapter to chapter and save to save,
it changes how the ship's own systems treat him (a narrower green, slower
work, a dearer repair, a weaker pump), and it ends on its own or is put
right through the game's own interactions (a rest in the crew quarters, a
hot meal, sorting the kit, clearing the pump). Good play earns bounded
advantages the same way. The Captain's Journal shows all of it.

**Opt-in.** No chapter applies, records, checks or recovers a consequence
(tested: no script, map, NPC, quest, trigger or preset names a
consequence command, condition or outcome table; every phase snapshot ends
with the ledger empty). Every existing quest, dialogue, challenge and story
outcome is unchanged. The ledger, its validator, its recovery methods and
an isolated debug demo are all this prompt adds.

| What | Where |
|---|---|
| Data | `data/consequences/ledger.json` (categories, limits, definitions, methods, outcome tables, milestones, the Journal host); each difficulty's `consequences` block in `data/difficulty/presets.json` |
| Rules (no state) | `src/systems/consequences/ledger.js`: lookups, the difficulty's consequence tuning, level modifiers, combining and bounding, bills and seconds, data validation |
| State | `src/systems/consequences/ConsequenceLedger.js`: `session.consequences`, saved (v24) and checkpointed (the `consequences` domain) |
| The captain's part | `src/systems/consequences/recovery.js`: what Respond offers, requirements and availability, notices, the Journal's lines |
| Safety | `src/systems/consequences/safety.js`: every ship bar at the worst condition, every recovery material's way back, the report |
| Commands | `consequence`, `consequenceSeverity`, `consequenceCheck`, `consequenceResolve`, `consequenceOutcome`, `consequenceRecover`, `consequencePrepare`, `consequenceMilestone`, `consequenceSystem`, `consequenceReport` (`src/systems/script/commands.js`, schemas in `commandSchemas.js`) |
| Condition | `consequence` in `src/systems/conditions/conditions.js` |
| Challenge outcomes | a challenge's `consequences` (an outcome table) compiled by `challengeConfig`; the runner's `onSuccess`, `onFailedAttempt`, `onRetry`, `onFallback` lists (`src/systems/challenge/`) |
| Hooks | `barCondition` / `takeBarCondition` (`supplyResponse.js`), `timingBarSettings`'s condition layer, `captainFactors` (`airResponse.js`), `repairPlan` (`commands.js`), `hazardAction` pumping, the meal effect path (`effects.js`) |
| Clock | `GameSession.tickHazards` / `hazardsActive`: the one hazard clock (world, work ticks, `hazardClock`) |
| Journal | `src/ui/menu/LogPage.js` (the existing Captain's Journal page), `logAvailable` in `src/systems/logs/logbook.js` |
| Report | `npm run consequences` (`tools/consequences.mjs`) |
| Demo | `consequences_demo` preset, F2 > Ship > Consequences A-F (`src/debug/shipDebug.js`) |
| Tests | `tests/consequences.test.js` (54), `e2e/consequences.spec.js` (3) |

**What existed before** (the preflight): story flags, variables and values
(`StoryState`); quests whose objectives advance by events (`QuestSystem`;
221 main and 2 side quests; objectives may be optional); the challenge
runner with checkpoints, sticky costs replayed after a restore, carry-on
consequences, partial consequences and sequence fallbacks (Prompt 3);
difficulty presets and assists (Prompt 4); the ship's integrity,
emergencies, air, pressure, beard and supplies (Prompts 5 to 10), all
ticked by one hazard clock and all retry-safe through scoped event ids;
the Captain's Journal, a logbook (`data/logs/phase9.json`, extended by
Phases 10 to 17) drawn by `LogPage`; save version 23. All of it is reused;
none of it is replaced.

## 1. Ledger architecture

One ledger per session (`session.consequences`, a `ConsequenceLedger`),
beside the ship rather than inside it: consequences are the captain's,
the crew's and the story's, not the hull's. It holds:

- **entries**: what is held now, one per consequence id (a repeat changes
  the entry, never adds a second). Each entry keeps its id, an instance
  number, its level and state (`active` or `contained`), its strength, cap
  and full duration (fixed when it was created), its clocks (seconds,
  milestones, uses left), its source (`{ kind, id, chapter, outcome }`),
  the event id that created it, when (play time), how many times it was
  applied, its worst level, and whether the Journal has shown it.
- **history**: what has ended (`recovered` or `resolved`, and how: a
  method's id, `expired`, `used up`, `milestone`, `superseded`,
  `cleared`), oldest first, at most 24.
- **events**: the event ids applied, at most 128 (duplicate prevention).
- **counts**: how many times each consequence has been applied, ever (one
  number per definition: bounded by the definitions).
- **marks**: the milestones marked, by kind.
- **on**: the interactive layer (preparations offered where he stands).

Nothing derived is stored. The combined modifiers are computed from the
entries when something changes (`changed()` clears a cache) and read in
constant time afterwards; the hazard clock's seconds change only `left`,
which no modifier reads, so ticking never recomputes anything.

## 2. Consequence definitions

`data/consequences/ledger.json` → `definitions`. Each has: `title`,
`short` (a tag of 8 letters at most), `category`, `kind` (`negative`,
`positive`, `narrative`), `description` (the Journal's quote), `effect`
(what it does, in words), `visibility` (`shown` or `hidden`), `levels`
(1 to 3: a label and its modifiers each), `max` (the highest level on
Captain), `stacking`, `expires` (`seconds` of hazard time, `milestones`,
`uses`), `recur` (`fresh`, `once`, `escalate`), `opposes` (applying it
ends these), `recovery` (methods and what each does: `recover` or
`contain`), `earn` (the preparation that grants an advantage),
`affectsChallenges` (it changes a ship bar's green: declared, and checked
against its modifiers) and `permanent` (a decision that stands).

The eight definitions, one or more per category but resources:

| Id | Title | Category | Kind | Levels (Captain's cap) | Ends | Put right |
|---|---|---|---|---|---|---|
| `shaken` | Rattled Hands | condition | negative | Shaky green -3, Rattled -4, Wrecked -6 (2) | 5:00 | rest (ends), a hot meal (eases) |
| `exhausted` | Bone-Tired | condition | negative | Weary work +20%, Spent +35%, Dead on your feet +50% (2) | 8:00 | rest (ends), a hot meal (eases) |
| `poorly_prepared` | Short of Kit | preparation | negative | Untidy +1 material, Scattered +2 and repairs -15% (1) | 2 chapters | sort out the kit |
| `fouled_pump` | Fouled Pump | shipboard | negative | Wheezing pumping -25%, Choked -40% (1) | never by itself | clear the bilge pump |
| `well_prepared` | Ready for Anything | preparation | positive | Ready green +3 | 6:00, or 2 ship bars | (earned: lay out the tools) |
| `in_the_groove` | In the Groove | tactical | positive | Flowing work -15%, repairs +10% | 2:30 | (earned: a clean repair in the demo) |
| `crew_doubts` | Crew Doubts | crew | narrative | Muttering | 2 chapters | a story beat (authorized) |
| `pressed_on` | Pressed On | narrative | narrative | Decided | never (a decision) | none: it stands |

Seven categories are supported (`condition`, `preparation`, `shipboard`,
`resources`, `crew`, `tactical`, `narrative`); `resources` has no
definition yet, because every count it would describe already belongs to
the pack and the stores (the first chapter that needs a resource
consequence, say "the reserve is spent", adds one that changes a
behaviour, not a count). The brief's examples are all here: Shaken (Rattled
Hands), Exhausted (Bone-Tired), Poorly prepared (Short of Kit), Well
prepared (Ready for Anything).

**Methods** (`methods`): how a consequence is put right or an advantage
earned, through existing interactions. `kind` is `rest` (seconds of
hazard time in a room, no work), `provision` (eating a meal whose supplies
effect is in a group, from Items), `maintain` and `prepare` (seconds of
work and a bill in a room). Places are room ids and existing fixtures (the
bilge pump station), never tiles.

| Method | Kind | Where | Seconds (Captain) | Bill (Captain) | Does |
|---|---|---|---|---|---|
| `rest` | rest | the crew quarters | 15, +10 a level past the first | none: time | ends Rattled Hands, Bone-Tired |
| `meal` | provision | eaten from Items (supplies on) | the meal's own | the meal | eases Rattled Hands, Bone-Tired |
| `sort_kit` | maintain | the cargo hold | 15 (work) | 1 rope | ends Short of Kit |
| `clear_pump` | maintain | the cargo hold (the bilge pump) | 18 (work) | 1 sailcloth | ends a Fouled Pump |
| `lay_out` | prepare | the cargo hold | 12 (work) | 1 nail | earns Ready for Anything |

**Outcome tables** (`tables`): what each way of ending a challenge leaves
(section 7). One, `demo_repair`, marked `debugOnly`: the validator refuses
it in story content.

## 3. State ownership

The ledger records implications, never another system's state:

| State | Owner | The ledger's part |
|---|---|---|
| Hull and sections | Ship Integrity (`ship.hp`) | Short of Kit makes a repair dearer and weaker; In the Groove makes it hold better. The hull itself never changes through the ledger. |
| Water | flooding (`ship.hazards`) | a Fouled Pump shifts less water per pump; the water is the flooding's |
| Fire | hazards | none (a rest is refused in a burning room) |
| Gas, the captain's lungs | the air (`ship.air`) | none |
| Beard contents | the beard (`ship.beard`) | none |
| Materials, food | the pack and the stores | bills are paid from the pack by the existing all-or-nothing `takeAll`; the ledger owns no count |
| Food and draught effects | the supplies (`ship.supplies.effects`) | a meal's effect is the supplies'; the ledger only hears that a meal was eaten |
| Equipment, worn gear | the party, the beard's worn list | none |
| Brogath's Stability | the story (a variable) | none |
| Story flags, values, quests | the story, `QuestSystem` | none: no consequence command touches a flag, a value (except `consequenceCheck`'s named value and `outcomeValue`, as every command), a quest or an objective |
| Challenge records | the challenge log (per play) | each record lists what its consequence steps did (`consequences.ledger`) |

A damaged hull, a failed repair, a beard full of smoke or bad air never
becomes a consequence by itself: only a script or a challenge's outcome
table applies one.

## 4. Active and historical consequences

Held (`active`, or `contained`: no effect for now, still held, another
blow brings it back) is apart from ended (`recovered` by the captain, or
`resolved` otherwise). Queries:

| Ledger | Condition | Means |
|---|---|---|
| `held(id)` | `{ "consequence": { "id", "held": true } }` | held at all |
| `level(id)` | `"active": true`, `"severity": n` | in force, at its level (0 when contained or not held) |
| `state(id)` | `"state": "recovered"` | active, contained, recovered, resolved or none (the latest) |
| `lastEnded(id)` | `"resolved": true` | ended before, not held now |
| `ever(id)`, `times(id)` | `"ever": true`, `"times": { "gte": 3 }` | happened at all; how often |
| `ever(positive)` | `{ "earned": "well_prepared" }` | an advantage ever earned |
| `factor(key)` | `{ "modifier": "zone", "lt": 0 }` | what the next challenge would feel now |
| `inCategory(c)` | `{ "category": "condition", "count": 1 }` | how many held in a category |

The history keeps the last 24 endings; `counts` keep "ever" forever (one
number per definition).

## 5. Severity and stacking

A severity is a whole level from 1 to the entry's cap, always. The cap is
the definition's `max` moved by the difficulty (Deckhand one lower,
Brutal one higher, within its levels), fixed when the entry is created.

| Stacking | A repeat while held |
|---|---|
| `none` | nothing (`kept`) |
| `refresh` | the clocks start again (duration, milestones, uses); the level stays |
| `replace` | a greater severity takes over (and its clocks start again); a lesser or equal one is `kept` |
| `add` | the severities add up to the cap (`worsened`, then `capped`); the clocks start again |
| `reject` | refused while held |

A contained entry flares back (`flared`) whatever its stacking.
`recur` decides what happens once it has ended: `fresh` (a new entry),
`once` (never again), `escalate` (one level higher each time it recurs).
`opposes` makes two consequences exclusive: applying one ends the other
(`superseded`), and the validator requires opposites to go both ways.

The validator rejects: stacking `add` with one level (it can never add),
`replace` with one level, `refresh` with no clock, an advantage that adds
up, and a `max` above its levels.

## 6. Mechanical modifiers

Five, each read in the one place its system already resolves that number:

| Modifier | Kind | Where it acts | Bound (combined) |
|---|---|---|---|
| `zone` | pixels | a ship bar's green, in the captain's condition layer (`barCondition`, then `timingBarSettings`) | -6 to +4 (and food and consequences together -6 to +6) |
| `work` | multiplier | every work action's seconds (`captainFactors`: hazard work, air, beard care, supplies, maintenance, preparation) | 0.85 to 1.5 |
| `repair` | multiplier | what a ship repair restores (`repairPlan`'s efficiency, with the water's) | 0.75 to 1.15 |
| `costAdd` | materials | more of a ship repair's main material (`repairPlan`'s bill, after the difficulty scaled it) | -1 to +2 (never below 1 of anything) |
| `response` | multiplier | the water one pump or bail shifts (`hazardAction`) | 0.6 to 1.15 |

**Precedence** for a ship bar's green, in order: the base (every ship
bar's 26 px, plus the difficulty's supplyZone for salvage and cooking),
the difficulty's feel (the preset's `zoneAdd`), the challenge's own
numbers (its profile and spec), the leader's stat and equipment (a
multiplier), the captain's condition (food, draughts and consequences,
one flat layer, bounded together), then the accessibility assists (Timing
Assist, Classic Bar), which no consequence ever reduces. A legacy story
bar has no condition layer at all.

A positive advantage that counts `uses` is used up by each ship bar it
helps, once per run: the use is taken as the attempt starts, and a Try
again's restore gives it back with the checkpoint, so a retried repair
uses it once.

## 7. Challenge-result integration

A challenge carries an outcome table with `"consequences": "<table id>"`
(or the lists inline). `challengeConfig` compiles it into consequence
steps in the lists the runner already runs, each in its own event scope,
so a doubled callback lands nothing and a retried attempt can land again:

| Outcome | When | Kept through Try again? | Runner list | Scope |
|---|---|---|---|---|
| `success` | once, after the final success | (no retry follows) | `onSuccess` (new) | `onSuccess` |
| `partial` | once, after the final partial | (no retry follows) | `onPartial` (existing) | `onPartial` |
| `failure` | when an attempt fails | no: the retry's restore undoes it; carrying on keeps it | `onFailedAttempt` (new) | `failed:N` |
| `retry` | each time he chooses Try again | yes: charged again after every later restore, like a cost | `onRetry` (new) | `retry:N` |
| `accept` | once, when he carries on | (committed) | `onFailure.consequences` (existing) | `onFailure` |
| `fallback` | once, when he chooses Go back | (committed) | `onFallback` (new) | `onFallback` |

Ownership, in the brief's words: applied during the attempt (a step run
inside an attempt, rolled back by a retry), after it resolves (success,
partial), kept through retry (`retry`, and anything in `onFailure.costs`),
committed on accept (`accept`), or cleared by recovery (section 9).

The record and the ledger agree: every consequence step inside a run
appends `{ id, op, level, scope }` to `record.consequences.ledger`
(`applied`, `worsened`, `capped`, `refreshed`, `flared`, `kept`,
`duplicate`, `refused`), a restore marks what it undid (`undone: true`),
and the record's `transitions` (the checkpoint diff) name each changed
level and each ending. A run that has closed can't leave anything more
(a stale callback is refused unless the step is `authorized`).

The difficulty: a consequence applied inside a run is created on the
run's difficulty (fixed when the challenge started). A challenge's
difficulty block can't carry `consequences`, and the validator refuses a
consequence step in one: the ledger's own difficulty table already scales
them, and a penalty is never scaled twice. An advantage in a failure,
retry or accept list, or in `onFailure.costs`, is refused (a cost only
takes). Existing repair chapters are not retrofitted: no step names a
table.

## 8. Retry and checkpoint semantics

Checkpoints capture the ledger (the `consequences` domain, in every
challenge checkpoint by default and in every sequence checkpoint).
Restoring one puts the whole ledger back (entries, history, event ids,
counts), exactly like loading a save. Then:

- an attempt's own consequences (`failure`, or a step inside the attempt)
  are gone with the restore and are not replayed;
- explicit permanent costs (`onFailure.costs`, the `retry` list) are
  charged again after the restore, each charge in its own scope, so each
  lands exactly once per charge;
- accepted outcomes run once, in their own scope (`onFailure`): a doubled
  callback is a duplicate;
- a new, legitimate failure has its own attempt number, so it can apply
  its consequence again;
- a recovery completed before a challenge started is inside that
  challenge's checkpoint, so its retries never undo it. (A sequence
  fallback to a checkpoint taken earlier in the same script undoes
  everything after it, a scripted recovery and its cost alike, as a load
  would.)

Tested over repeated retries, a save and a load in between, and the final
resolution: no entry is ever duplicated, nothing accumulates past its cap,
and the event memory and the history stay bounded.

## 9. Recovery methods

Four real methods, each through an existing interactive system, each
with a cost:

- **Rest** (`rest`): Respond in the crew quarters (the room, not a tile;
  no new furniture), "Rest in a hammock (25s)". Seconds of hazard time,
  during which every emergency on the ship goes on. Never slowed by being
  tired (a rest isn't work); refused in a burning room. Ends Rattled
  Hands and Bone-Tired.
- **A hot meal** (`meal`): eating a galley meal from Items (bean stew,
  oat porridge, fish chowder: the supplies' meal group) eases each a
  level, through the item's own effect (`effects.js`); at its first level
  it is contained. The cost is the meal: ingredients, the stir on the
  timing bar, the simmer. Only while the supplies are on (a meal does
  nothing without them, as in Prompt 10).
- **Sort out the kit** (`sort_kit`): Respond in the cargo hold, seconds of
  work and a rope. Ends Short of Kit.
- **Clear the bilge pump** (`clear_pump`): Respond in the cargo hold, at
  the pump's room, seconds of work and a sailcloth. Ends a Fouled Pump.

And one preparation: **Lay out the tools** (`lay_out`), seconds of work
and a nail, earns Ready for Anything (only while `consequenceSystem` is
on). A script can trigger any of them for real (`consequenceRecover`,
`consequencePrepare`: the same checks, bill and seconds).

Nothing clears from the Pause menu. A script clears one outright only
with `consequenceResolve` and `"authorized": true` (a story beat that
cures it); the validator refuses it otherwise.

**Fairness**, checked by the validator: every penalty has a recovery that
ends it without needing what it impairs (a rest needs nothing; work needs
`work`, which only Bone-Tired impairs, and Bone-Tired is ended by a
rest), or it ends by itself. Every material a recovery bills has a way
back from empty on every difficulty (the economy report's renewable
sources: the bilge and the sacking), so recovery stays feasible on
Brutal, where the bills are 1.5x (rounded up) and the seconds 1.25x.

## 10. Positive outcomes

Ready for Anything (preparation: lay out the tools; +3 green on the next
two ship bars, or 6 minutes) and In the Groove (tactical: a clean repair
in the demo; work 15% quicker and repairs 10% stronger for 2:30). Earned,
never given; bounded (within the limits, each one a level, never adding
up: `stacking: refresh`); always ending (the validator refuses an
advantage without seconds, milestones or uses); the same on every
difficulty. Ready for Anything and Short of Kit oppose each other.

## 11. Difficulty and accessibility

The difficulty touches a consequence in exactly two places
(`data/difficulty/presets.json`, each preset's `consequences`):

| Key | Deckhand | Captain | Brutal | Read |
|---|---|---|---|---|
| `strength` | 0.6 | 1 | 1.35 | once, when a penalty is created: how far its modifiers go from no effect (kept in the entry as `k`) |
| `duration` | 0.6 | 1 | 1.5 | once, when a penalty is created: its full seconds (kept as `span`) |
| `cap` | -1 | 0 | +1 | once, when a penalty is created: the highest level a repeat can reach (kept as `cap`) |
| `actionCost` | 0.5 | 1 | 1.5 | when a recovery or preparation is offered: its bill (rounded up, at least 1) |
| `actionTime` | 0.75 | 1 | 1.25 | when a recovery or preparation is offered: its seconds |

Nowhere else: reads never consult the difficulty, a stack uses the
entry's kept numbers, a reload on another device's difficulty changes
nothing held, and a challenge's difficulty block can't add consequences.
The systems a modifier feeds still apply their own difficulty to their
own numbers (the bill's `costScale`, the restore's `repairScale`), never
to the consequence's part. Advantages are the same on every difficulty.
So Rattled Hands is -2 for 3:00 at most once on Deckhand, -3 then -4 for
5:00 on Captain, and -4, -5, then -6 (the bound) for 7:30 on Brutal.

Assists stay independent: Timing Assist and the Classic Bar apply after
the condition layer and are never reduced by it, and no consequence reads
or writes an assist.

## 12. Cross-chapter persistence

The ledger lives in the session, so it crosses rooms and story events as
they happen, and a save and a load (section 13). Chapter-spanning
consequences count `milestones`, marked explicitly by a script
(`{ "consequenceMilestone": "chapter" }`); no chapter marks one yet, and
nothing in the existing scripts was changed to add one. Timed ones run on
the hazard clock only (section 14). Checkpoints follow their rules
(section 8). The demo shows it: a consequence applied, the room left, a
chapter marked, the game saved and continued, still held, a later repair
dearer for it, then put right, gone from what is held and kept in the
history.

## 13. Save migration

Save version 24 (`SAVE_VERSION`). The session's state gains
`consequences`: `on`, `serial`, `entries` (each entry's id, instance,
level, state, strength, cap, full duration, clocks, source, event id,
time, times applied, worst level, Journal-seen mark), `history`,
`events`, `counts`, `marks`. No modifier is saved (they are derived).

The 23 to 24 migration fills the layout only: a version 17 to 23 save has
no ledger and loads with an empty one (nothing is invented from a damaged
hull, a failed repair, the beard or the story); every other system loads
exactly as it was. Malformed data loads safely: an unknown consequence is
dropped with a warning, levels, strengths, clocks and counts are clamped
to what the data allows, a duplicate entry keeps the first, the history
and the event ids are bounded, anything that isn't a ledger starts empty.

## 14. Journal integration

The Captain's Journal is the existing logbook (`captains_journal`) drawn
by the existing `LogPage`; `data/consequences/ledger.json` → `journal`
names it as the ledger's host (no story log file was edited). The page
puts the ledger at the top: what is held, in category order (penalties
before narratives before advantages), then what has ended, newest first
(at most 8). Held penalties are red, advantages green, what is remembered
gold, ended ones grey with "past"; each is NEW until read (the ledger's
own mark, so the world's log state doesn't grow).

An entry's detail, in the panel below the list (a page at a time with
Confirm when it doesn't fit, as every Journal entry):

```
State    Active: Rattled (2 of 2)
"That last repair did your nerves no favors."
Effect   Repair timing is less forgiving. Green -4.
Recover  Rest in a hammock, in the crew quarters (25s): ends it. Go to the Crew Quarters.
Or       Eat a hot meal, a galley meal, eaten from Items: eases it. You have one.
Ends     By itself in 4:10.
```

Whether a recovery can be done now is worked out from where he stands,
what he carries and the supplies ("Here, now", "Go to the Crew
Quarters", "Not enough: Rope 0/1.", "Cook one first", "No galley meals
this voyage"). Ended entries say how they ended and how bad they got.

The Journal opens for the ledger even before its own first entry (the
crownskull, Phase 9): `logAvailable(log, session, id)` is true for the
host when the ledger has anything shown. No new screen, no banner, no
mouse: the page's `ListMenu` takes the keyboard and the gamepad as every
page does.

**Notices**: one short toast per change a script or a recovery makes
("RATTLED HANDS: repair timing is less forgiving.", "RATTLED HANDS worse
(Rattled).", "BONE-TIRED rested it off."), and one when something ends by
itself ("READY FOR ANYTHING used up.", "RATTLED HANDS wore off."). The
same notice again within 3 s is let go (the overlay's `consequence` kind;
the world's 4 s rule for clock-driven ones). Steps can be quiet
(`"announce": false`).

## 15. Script commands and conditions

| Command | Does |
|---|---|
| `{ "consequence": id, "severity"?, "eventId"?, "source"?, "authorized"?, "announce"?, "outcomeValue"? }` | apply (its stacking decides a repeat). With `eventId` it lands once; inside a challenge's lists it is scoped automatically; elsewhere without one it lands every time. `outcomeValue`: applied, worsened, capped, refreshed, flared, kept, duplicate, refused |
| `{ "consequenceSeverity": id, "to" \| "by", ... }` | a held one's level, within 1 and its cap (ending is a recovery's job) |
| `{ "consequenceCheck": id, "value": name }` | where it stands, into a story value (for dialogue variants) |
| `{ "consequenceResolve": id, "authorized": true, "how"? }` | end it outright (a story beat); refused without `authorized` |
| `{ "consequenceOutcome": table, "outcome", "eventId"? }` | record an outcome that isn't a challenge (a scene going wrong, a choice) against an outcome table |
| `{ "consequenceRecover": method, "anywhere"? }` | trigger a recovery for real (where, bill, seconds; a meal is eaten from the pack) |
| `{ "consequencePrepare": method, "anywhere"? }` | earn an advantage for real (only while the layer is on) |
| `{ "consequenceMilestone": "chapter" }` | mark a milestone |
| `{ "consequenceSystem": true }` | the interactive layer on or off (preparations offered) |
| `{ "consequenceReport": true }` | "How am I holding up?" in the dialogue box |

The condition is `consequence` (section 4). There is no low-level
mutation: no command sets an entry's fields, clocks or history directly.
No existing script uses any of these (tested).

The validator rejects: unknown consequences, tables, methods and
milestones; severities outside a consequence's levels; `to` with `by`;
a clear without `authorized`; a preparation used as a recovery (and the
reverse); a debug-only table in story content; unknown condition keys,
states, modifiers and categories; contradictory conditions (in force yet
ended; two opposites both required); and every data problem of section
2 (unknown targets, invalid recovery resources, unbounded stacking, bad
durations, illegal ranges).

## 16. Progression safety

Consequences may change difficulty, costs, optional rewards, dialogue,
recovery and tactical conditions. They may never decide whether the
story can go on. The validator (and `npm run consequences`, modelled on
`npm run economy`) enforces it:

- **Mandatory gates**: a `consequence` condition is refused on a chapter
  start (`game.json`), a story trigger, a door (warp), a map trigger, a
  person's placement, a step that moves the main story on, or a choice
  whose branch does. "Moves the main story on": a main quest started,
  advanced or completed, or a flag set or cleared that a chapter start or
  a main quest's objective reads. Dialogue and optional steps may use
  them freely.
- **Required challenges stay winnable**: every ship bar (the six repairs,
  the patch, seal, mend, restrain, scrub, the salvage and the four
  stirs), on every difficulty, at the captain's worst condition (the
  bound, -6) with the weakest leader and no assist, must still pass the
  timing bar's own winnability check. Today the tightest is the 4-strike
  hull rebuild on Brutal: 9 px of green, 52 ms at its fastest (the rule
  is 50). A harsher bound (-10) is refused.
- **Required resources can be had again**: every material a recovery or
  preparation bills has a renewable source or a shop on every difficulty.
- **Contradictions**: two opposing consequences required together, and
  self-contradicting conditions, are refused.
- **Nothing to complete, cancel or reinterpret**: no consequence command
  touches a quest, an objective or a flag (tested over all six
  scenarios).

## 17. Validation limitations

These are heuristics, not proofs. The gate check follows a step's own
branches, not a `goto` or a `call` into another node or script, and it
can't see a consequence's indirect influence (a `consequenceCheck` value
read later by a gate, a dialogue variant that changes which choice is
offered). The progress flags are those read by chapter starts and main
quest flag objectives; a flag that gates progress some other way (an NPC
placement's flag, a warp's) isn't counted as progress. Bar winnability
is checked for the ship bars that carry the condition; a future story
challenge that opts into the condition must be added to `shipBars`.
The economy's renewable sources exist only while the supplies are on; a
chapter that applies Short of Kit with the supplies off relies on its
two-chapter end (and the pack). Mutual exclusion is checked for
opposites only.

## 18. Debug scenarios

F2 > Ship > "Jump: Consequences demo" (the `consequences_demo` preset:
the end of Phase 17 in the cargo hold by the bilge pump; repair
materials, a rope and sailcloth, a bean stew), then F2 > Ship >
Consequences:

- **A. A mistake**: repair the port hull cleanly (In the Groove), fumble
  the starboard one and carry on (Rattled Hands, Crew Doubts); upstairs,
  mend the deck: the green is 3 narrower; the Journal shows all three.
- **B. Recovery**: Rattled (2) and Bone-Tired: the Journal says what each
  needs and whether it can be done here; rest in the crew quarters (25 s
  while the ship goes on) or eat the bean stew (eases each a level); the
  repair's green is back.
- **C. An advantage**: lay out the tools (Respond in the hold: a nail, 12
  s), repair twice with a wider green (+3), then it is used up.
- **D. Repeated failure**: fail, Try again, fail...: Bone-Tired builds to
  its cap (2 on Captain, 3 on Brutal), the failed attempt's Rattled Hands
  goes back with each retry, the last stays when carried on, a second
  botch stacks it; one entry each; a rest still works.
- **E. Across chapters**: Short of Kit (two chapters) and Crew Doubts;
  mark a chapter, save and load: still held, the hull repair costs a
  plank more; sort the kit (a rope) or let a second chapter end it; the
  Journal remembers either way.
- **F. A combined emergency**: a leak in the hold, two planks, three
  nails and a sailcloth, a Fouled Pump and Bone-Tired (2): rest first (25
  s while the water rises) or press on (Pressed On, recorded); clear the
  pump or pump it fouled; patch; pump it dry. Winnable on Captain,
  feasible on Brutal (the patch's bill is exactly what he has; the pump
  stays fouled there, because clearing it costs two sailcloth).

Plus: mark a chapter milestone, the report, let 60 seconds pass, switch
the preparations off, and clear the ledger (debug only).

## 19. Automated tests

RESULTS-TESTS

## 20. Performance results

RESULTS-PERF

## 21. Known limitations

- Resources has no definition yet (section 2); crew repercussions are
  narrative only (there are no crew mechanics to change until the crew
  prompts).
- Milestones are explicit: no chapter marks one, so chapter-spanning
  consequences only count down when a future chapter script does.
- Meals ease a consequence only while the supplies system is on.
- The Respond menu shows recoveries only in their rooms; the Journal says
  where to go.
- The gate check is a heuristic (section 17).
- The demo's outcome table is debug-only; campaign tables come with the
  chapters that use them.

## 22. Authoring guidelines for later campaign prompts

1. **Apply through outcomes, not by hand.** Give a challenge an outcome
   table (`"consequences": "<table>"`) rather than consequence steps in
   its `ifFailure`; the runner then scopes, retries and records them.
   For a scene or a choice, `consequenceOutcome` against a table.
2. **Give once-only events an `eventId`.** Outside a challenge, a
   `consequence` step without one lands every time it runs.
3. **Penalties change how hard, never whether.** Use them for the bar's
   green, work time, a bill, the pump, dialogue variants. Never put a
   `consequence` condition on anything that starts a chapter, opens a
   door, places a person the story needs or moves a main quest (the
   validator refuses it; don't route around it with `consequenceCheck`
   values).
4. **Every penalty can be put right where the player can reach,** without
   needing what it impairs, or ends by itself. Prefer rooms and existing
   fixtures; never tiles; no new furniture until the layout prompts.
5. **Advantages are earned and end.** Seconds, chapters or uses; never
   stacking up.
6. **Scale once.** Let the ledger's difficulty table scale penalties; never
   add consequences in a challenge's difficulty block or pick a different
   severity per difficulty.
7. **Milestones are explicit.** When a chapter ends, a script marks
   `consequenceMilestone`; nothing else counts chapters.
8. **Mark chapter-spanning ones in the Journal's words.** The description
   is the captain's voice; the effect is one short sentence (it is also
   the notice); test that both fit (`tests/consequences.test.js`).
9. **Run `npm run consequences`** after any data change: it must end with
   "No problems".
