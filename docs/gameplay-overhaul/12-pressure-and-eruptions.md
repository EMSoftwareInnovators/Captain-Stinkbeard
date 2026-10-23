# 12. Grand Stenchmaster pressure and eruptions

Overhaul Prompt 8. A generic pressure-and-release system for characters who
build up supernatural pressure and let it out into the ship: Brogath the
Bashful and Garrick Grumblegut to start with. Their warnings can be read,
the captain can intervene, and a release does real, recoverable damage
through the systems that already exist: the per-room air (Prompt 7), the
openings between rooms, and Ship Integrity (Prompt 5).

**Opt-in.** No chapter switches a subject on. Brogath's Phase 14-17
Stability plays exactly as before, and no legacy fume scene makes gas or
damage. The system and an isolated debug demo are all this prompt adds.

| What | Where |
|---|---|
| Data | `data/ship/pressure.json` (stages, release levels and profiles, impact per room, limits, subjects) |
| Rules (no state) | `src/systems/ship/pressure.js`: definitions, stages, levels, where a character is, validation |
| State | `src/systems/ship/PressureState.js`: `ship.pressure`, saved and checkpointed with the ship |
| The captain's part | `src/systems/ship/pressureResponse.js`: Respond options, Check report, HUD words, advice |
| Commands | `src/systems/script/commands.js` (`pressure*`, `airMend`), schemas in `commandSchemas.js` |
| Condition | `pressure` in `src/systems/conditions/conditions.js` |
| World | `src/world/PressureCues.js` (barks, sounds, shiver, puffs, the eruption's shake) |
| HUD and page | the emergency line (`response.js`), Pause > Ship rows (`src/ui/menu/ShipPage.js`) |
| Demo | `pressure_demo` preset, F2 > Ship > Pressure A-E (`src/debug/shipDebug.js`) |
| Tests | `tests/pressure.test.js` (41), `e2e/pressure.spec.js` (3) |

## 1. Existing Stability compatibility

**What Brogath's Stability is** (Story Phase 14, `src/systems/stability.js`,
`src/world/StabilityRunner.js`, `data/story/stability/brogath.json`):

- **Representation.** One story variable, `brogath_pressure`, a whole number from -20 to 100. A derived story value, `brogath_state`, holds PLEASED, CALM, BASHFUL, EMBARRASSED, PRESSURIZED or CRITICAL (bands at 0, 15, 40, 65, 85). Scripted states override it: ANGRY (`brogath_angry`), RECOVERING (`brogath_recovering`) and MELLOW (read from `ship_atmosphere`). The meter, the running incident, a pending release (`brogath_pending`, `coffin_sock_countdown`) and the reassurance turn are story values too.
- **What moves it.** Only scripts, and never at random:
  - `stability` steps (trigger 58 uses, calm 42, meter 35, set 31, settle 16, incident 13, secure 12, recover 4, anger 4) and `reassure` (4 uses);
  - commercials in `channelEpisode`;
  - a Grand Bank depositor with `brogath_risk`;
  - the `atmosphere` command, which re-derives his state.
- **How bashfulness is triggered.** 45 named triggers in the data (flutter, laughed_at, apologized, reminded_cardboard...), each a fixed amount, with a line. Mellow and recovering scale the rises.
- **How releases happen today.** A running incident (a fluttering napkin, an advert) raises the pressure in the world while the captain has control. At 100 it runs the incident's own eruption script, which is comedic and safe, and drops back to `afterErupt`. Big releases are authored cutscenes. The Phase 17 pending release is a readout with a countdown variable, both set by scripts.
- **What reads it.** Sixteen data files read `brogath_state` or `brogath_pressure` in conditions, dialogue and placements, some at exact values (`brogath_pressure` 97, -20, 45...). Dialogue, scene choices and his placements depend on those values.
- **Chapter transitions.** The values are story state, so they carry across chapters as they are. Chapters use `settle` and `set` at their boundaries.
- **Saving.** Saved with the story and captured by the story checkpoint domain. Never reconstructed.

**The integration: an adapter, one number.** Brogath's pressure subject is a
view over the same variable. When his subject is switched on:

- the new system reads him with `readStability`;
- it writes him only through `writePressure` (rounded and clamped, with his state re-derived);
- it announces every change on `stability:changed`, so his meter, his cardboard's shivers and his stage cues follow;
- his rises are his Stability's triggers, and still count less while he is mellow or recovering;
- his calms and his reassurance prompt are his Stability's own.

Fractions of a rise are carried, so a whole-number Stability neither loses
nor invents pressure. Nothing he holds in, and no modifier, cooldown or
countdown, is written into his story values: those live in `ship.pressure`.

**What keeps legacy behaviour exact:**

- The campaign never switches him on. Then nothing in the new system writes his variable, flags or values. A test plays every Stability command and checks the same numbers and states, no pressure state, and no notices, gas or damage.
- While a Stability incident runs or he is ANGRY, a scene owns him. The new system waits: no buildup, no countdown, no eruption, no interventions.
- His thresholds, his triggers and his scripted outcomes are untouched. The new stages only name ranges of the same number (section 6).

## 2. Generalized pressure-subject model

A subject is a character (a stable npc id, never a sprite or a tile), defined
in `data/ship/pressure.json`:

| Field | Meaning |
|---|---|
| `npc` | the character; must exist |
| `legacy` | a Stability subject backing it (Brogath); its range, triggers, calms and prompts are that data's |
| `available` | an extra story condition (Brogath: `p14_started`) |
| `min`, `max`, `start` | the range (a legacy subject's are its Stability's) |
| `at` | where uneasy, building, dangerous and critical begin; imminent is the maximum |
| `substance` | what a release pours (`vapor`, `heavy_gas`: generic, Prompt 7's) |
| `triggers`, `calms` | named rises and falls (or `"legacy"`) |
| `strain` | how much harder each hold makes the next trigger hit |
| `modifiers` | temporary rises: a rate a second, for seconds (bounded, always ending) |
| `soothe` | the captain's calming: `prompt` (a Stability prompt set) or `work` (seconds and a calm), a lock, `refuseWhile` |
| `restrain` | holding it in: amount, holdFactor, bleed, maxStrain, lock, failRise, minStage |
| `release` | a controlled release: controlScale, seconds, minStage |
| `eruption` | warn (seconds of countdown), cooldown, after (relief to), heldWeight, cancelBelow, recover |
| `reach` | tiles: calming and holding are done up close |
| `cues`, `puff` | warnings in words over him, with sounds; harmless warning puffs |

**State** (`ship.pressure.subjects[id]`): `on`, `p` (a native subject's pressure), `carry` (a legacy subject's fraction), `held`, `strain`, `phase` (idle, imminent, cooldown), `left`, `calmLock`, `restrainLock`, `mods` (at most 4), `count` (eruptions: the event identity), `turn` (the reassurance prompt's rotation).

**Only configured subjects take part**, and only once switched on. A subject
takes part only while the story has the character aboard in a room with ship
air. Where a subject is comes from the same NPC placements the world stages
by (`npcWhere`, cached until the story or the captain's room changes), so
nobody is spawned, moved or duplicated. Before Brogath arrives (Phase 14)
he is unavailable. While Garrick is ashore, his pressure is frozen.

## 3. Brogath's pressure profile

Embarrassment. Range -20 to 100, the same as his Stability, with no buildup
of his own: he moves only when something happens to him.

- **Rises.** His 45 Stability triggers, from 8 to 60 each, times the difficulty and `1 + 0.25 × strain`. The `stared_at` modifier (1.5 a second for 60 s) is the demo's "the crew keeps looking".
- **Calming.** His reassurance prompt (`general`). The right words calm him by that option's calm (reframe -28, distinguished -25...). The wrong words trigger him (laughed_at +25...). Either way he needs 6 s before another try.
- **Holding it in.** 30 at a time, stored at 1.5 times (`holdFactor`), never seeping back. It counts in full at the eruption (`heldWeight` 1). Each hold strains him, up to 3 holds.
- **Release.** Vapor. A controlled release counts 0.7. After an eruption he drops to 10, then 30 s of cooldown.
- **Stages** (on his number): stable below 15, uneasy 15, building 40, dangerous 65, critical 85, imminent at 100 with an 8 s countdown.

## 4. Garrick's pressure profile

Gas and ceremony. Range 0 to 100, starting at 5. Nothing here reads or
writes his story values (`garrick_release` and the rest stay the story's).

| Trigger | Pressure | Modifier |
|---|---|---|
| feast | 25 | digesting (0.6 a second, 60 s) |
| beans | 15 | digesting |
| drink | 10 | |
| ritual (a Grand Stenchmaster ceremony) | 10 | ceremony (1.5 a second, 20 s, deliberate) |
| ritual_failed | 25 | |
| startle | 8 | |

- **Calming.** "Settle Garrick down": 3 s of work (the rest of the ship goes on), then -12, with an 8 s lock. He refuses while a deliberate ceremony is under way.
- **Holding it in.** 25 at a time, stored at 1 (no penalty), up to 4 holds. What he holds seeps back at 0.5 a second (`bleed`), never past the top: holding only delays him.
- **Release.** Heavy gas. His controlled release counts half (he has control). What he held counts 0.75 at an eruption.
- **Stages:** uneasy 20, building 40, dangerous 60, critical 80, imminent at 100 with a 10 s countdown.

## 5. Buildup triggers

All explicit, validated and data-driven: a script names a trigger, a calm,
an amount or a modifier. Nothing is inferred from dialogue lines.

- **Triggers** (`pressureTrigger`): the subject's table. Times the difficulty's `pressureScale`, times strain, and half as much in a cooldown. For Brogath, also his Stability's mellow or recovering scale. A trigger may start a modifier.
- **Modifiers** (`pressureModifier`): a rate a second for a number of seconds, on hazard time. Bounded: a rate of at most 5 a second, at most 300 s, at most 4 at once. The same one again refreshes it, never stacks. Each is named to the player as it starts and ends.
- **Scripted amounts** (`pressureAdd`): bounded by the range.
- **Bleed**: what Garrick held seeping back out.

There is no passive buildup without a visible source: every rise is a
trigger the player was told about, or a named modifier.

## 6. Warning stages

`stable, uneasy, building, dangerous, critical, imminent`. Each subject sets
its own thresholds. Imminent means a countdown is running (at the maximum,
outside a cooldown). Each stage reached on the way up is told:

- **In words.** A toast for building and worse: "GARRICK: DANGEROUS Act now: calm him, hold it, or let it out somewhere safe." At imminent: "GARRICK IS ABOUT TO BLOW! 10 s. Calm, hold, or clear out."
- **On the HUD line,** with the countdown and whether he is holding it in: `GARRICK IMMINENT HELD 7s`.
- **Over him,** as a bark: Garrick's "*GRRRLB*", "*GLOOORP*"; Brogath's are his Stability's own cues ("(the cardboard is humming)").
- **As a sound and a small shake** near the top. There is no shake with reduced effects.
- **A shiver** at critical and imminent (Brogath's cardboard already shivers by his Stability). There is none with reduced effects.
- **A harmless warning puff** every 5 s at critical and imminent: a bark ("*pfft*"), a sound, a tiny burst. It releases no gas.

Calming works less near the top (`stages.*.calm`): 1 up to building, then
0.75 dangerous, 0.5 critical, 0.35 imminent. An imminent countdown stops only
once he is eased below `cancelBelow` (Brogath 85, Garrick 80).

## 7. Player intervention

Respond (V, pad X) in the room where the subject is:

| Action | Where | Cost and limits | Can fail |
|---|---|---|---|
| **Check on him** | the room | none | no |
| **Reassure Brogath** | within 3 tiles | the prompt; a 6 s lock either way | wrong words make him worse |
| **Settle Garrick down** | within 3 tiles | 3 s of work; an 8 s lock; refused mid-ceremony | |
| **Ask him to hold it in** | within 3 tiles | the timing bar ("HOLD IT IN"); a lock after (Brogath 12 s, Garrick 8 s); only from building; at most maxStrain holds | yes: worse by failRise and no new try for 1.5 locks (a cost a retry keeps) |
| **Let him let it out, carefully** | within 3 tiles | 2-3 s of work, from uneasy (Garrick) or building (Brogath) | the countdown can beat it ("Too late. Garrick went first.") |

Preparing the ventilation is the air's own actions, offered in the same
Respond ("Air and vents") whenever a subject is in the room: open the
porthole, shut a door, seal it. Evacuating is walking away; the report says
so. When more than one kind of trouble is in the room, Respond asks which
first: the subject, "Fight the emergency" or "Air and vents".

What these actions don't allow:
- no calming from across the ship;
- no button that removes a catastrophe (every action has a lock, and calming is weaker near the top);
- no random outcome (the prompt and the bar are learnable).

The physical controls the ship redesign should add are the ones listed in
doc 11, section 5. A designated release room (the Fart Zone) needs crew
schedules to walk a subject there, so it is left to that prompt.

## 8. Suppression mechanics

Holding it in lowers the pressure now and stores it for later:
- `held += amount × holdFactor × holdScale`, up to 90;
- `strain + 1`, which makes every later trigger hit `1 + strain × strain-weight` times as hard;
- an imminent countdown stops if the hold takes him below `cancelBelow`.

The stored pressure comes out at the eruption (`heldWeight`). A controlled
release or an eruption empties it and the strain.

Measured in the demo (scenario D, Captain): Brogath building at 55, then the
crew keeps at him with the same four embarrassments for every route:

| Route | Eruptions in 150 s | Where he ends up | Bow |
|---|---|---|---|
| Let it out early | minor, controlled (30 vapor) | climbing again, nothing held | 80/80 |
| Reassure him (the right words, each time he'll listen) | none | stable | 80/80 |
| Hold it in (each time he can) | none yet | held 90, strained 3/3 (maximum) | 80/80 |
| Leave him | major (150 vapor) | relieved | 68/80 |

The next embarrassment for the held-in Brogath (×1.75) blows a CATASTROPHIC
eruption: 240 vapor, the bow and the port hull struck, a door damaged. On
Brutal the held-in route blows within the same 150 s. Steady calming keeps
him from erupting on every difficulty.

## 9. Release lifecycle

1. **Buildup**: triggers, modifiers, bleed.
2. **Warning**: the stages (section 6).
3. **Trigger**: at the maximum, with nothing pending and no cooldown, the countdown starts (warn × warnScale, never under 2 s).
4. **Eruption**: when the countdown runs out (or when the captain helps a controlled release, or a scene asks for one).
5. **Environmental consequences** (section 10).
6. **Relief**: the pressure falls to `after`, and what was held and the strain are emptied. Modifiers carry on unless a profile says otherwise. Brogath's other Stability flags are untouched.
7. **Cooldown**: `cooldown × warnScale` seconds (half for a controlled release). Rises count half, and nothing erupts, even at the top.
8. **Stable again**: a new eruption needs new pressure and a new countdown.

One eruption per countdown, and at most one per cooldown, so there is no
loop. A test ticks ten minutes of a refreshed ceremony modifier and finds
the eruptions bounded by the cooldowns. Each source is finite and
counted. Listeners are made once per scene and unsubscribed with it.

## 10. Environmental consequences

The size comes from intensity = `max(0, pressure) + held × heldWeight`, times
controlScale for a controlled release:

| Level | Intensity | Profile (Captain) |
|---|---|---|
| minor | below 45 | 30 gas at 10 a second |
| moderate | 45 to 74 | 80 gas at 14 a second |
| major | 75 to 114 | 150 gas at 18 a second; 1 shut door blown open; the room's first section struck for 12 |
| catastrophic | 115 and up | 240 gas at 20 a second; 2 shut doors blown open, 1 damaged, every seal torn; the room's first section struck for 22, its second for 10 |

A scene can name a profile (`pressureErupt` `profile`). The named Coffin
Sock, Chicken-Town and Fire-Waft are not profiles; see section 21. A
profile can also open a leak (`breach` on a damage entry) or start a fire
(`ignite`). None of the four does: leaks and fires come only from an
explicitly configured profile.

## 11. Atmosphere integration

An eruption starts one finite Prompt 7 source (`erupt_<subject>_<n>`) in the
subject's room: the subject's substance, the profile's amount (times
`releaseScale`) at its rate. The air then does the rest on the same clock:
- the gas drifts through the real openings;
- the open ones to the outside vent it, and heavy gas sinks;
- the captain breathes it.

Conservation holds: a test accounts every unit of a catastrophe's 240 (aboard,
vented, decayed). When every source slot is taken, the release comes out all
at once instead (never past full). When the source already exists (a
repeat), nothing is added. The old fume zones are untouched, and no legacy
fume scene starts a source.

## 12. Ventilation and structural damage

**Openings.** The blast reaches the origin room's openings to other rooms, in
data order. A profile may also reach the outside with `outside`, though none
does.
- Seals are torn: `breakSeals`, sealed becomes open and damaged.
- Closed doors are blown open: `force`, at most 4.
- Some are left damaged: `damage`, preferring the ones just blown.
- Openings that are always open (the stairs, the sky) can't be damaged, and a blast never reaches a room it doesn't border.

Every change goes through `AirState.setConnection`, so Prompt 7's rules hold:
a damaged opening leaks when shut and won't seal. Nothing is impassable: the
openings are air, not walls. A damaged door or hatch is mended with
**"Mend the X": 1 Planks and 1 Nails on the repair bar** (data
`shipAir.actions.mend`, the `airMend` command), and can then be sealed again.

**Structure.** The room's impact list in the data (the crew quarters: bow,
then port hull; the main deck: deck, then rigging). The washroom and the two
zones belong to no section, so a release there strikes nothing. A strike:
- uses Ship Integrity's `applyDamage` with the `supernatural` category and the section's resistance;
- is scaled by `releaseScale` and `damageScale`;
- never takes a section below a quarter of its maximum, so a mandatory repair can always be made;
- happens once per eruption event;
- is reported by Ship Integrity's own events and the badge.

## 13. Difficulty and accessibility

New `ship` tuning keys, each bounded to 0.5-1.5:

| | Deckhand | Captain | Brutal |
|---|---|---|---|
| pressureScale (rises) | 0.75 | 1 | 1.25 |
| warnScale (countdown and cooldown) | 1.5 | 1 | 0.65 |
| calmScale | 1.3 | 1 | 0.8 |
| holdScale (what a hold stores) | 0.75 | 1 | 1.25 |
| releaseScale (gas and damage) | 0.75 | 1 | 1.25 |

Garrick's countdown is 15, 10 and 7 s; Brogath's is 12, 8 and 5 s. Damage
also takes Ship Integrity's `damageScale`. Difficulty never changes how gas
moves between rooms.

The demo is recoverable everywhere:
- **Catastrophe:** the scenario C catastrophe is survived and repaired on Captain and Brutal (out, vent, mend, repair).
- **Calming:** steady calming keeps Brogath from erupting on all three difficulties.

**Accessibility** is separate from difficulty:
- The timing assist widens and slows the restraint bar (a test checks it on Brutal), and the classic bar applies too.
- Reduced effects remove the shake, the shiver and the bursts. Words, sounds and the simulation stay (a browser test checks he still builds).
- Every cue has words.

## 14. Hazard-clock ordering

One clock: Prompt 6's hazard clock, through `ship.tick()`. No new timer. One
second of hazard time, in order:

1. **Pressure.** Locks run down; modifiers and bleed raise it (scaled; half in a cooldown); a cooldown ends; a countdown runs, and at zero the eruption:
   - structural damage;
   - the openings (ventilation changes);
   - the gas source starts.
2. **Flooding and fire**: leaks, water, fire.
3. **The air**: sources pour (an eruption's gas is in the room the same second), fires smoke, gas propagates, decays and vents, and the captain's exposure.

A countdown or cooldown that begins during a second starts counting the next
one, so "10 s" is ten whole seconds.

The clock only runs while the captain has control in the world (Prompt 6's
pause policy). Nothing runs in dialogue, menus, pauses, cutscenes or battles.
The restraint bar and the reassurance prompt run no hazard time. Settling,
releasing and mending take their seconds as work ticks, and the rest of the
ship moves meanwhile. A script can run time on purpose with `hazardClock`.
Legacy campaign timing is unchanged.

## 15. Checkpoint and retry behavior

`ship.pressure` is part of the ship domain, and Brogath's number is part of
the story domain. A challenge checkpoint therefore captures and restores
everything together:
- pressure, composure and what is held;
- strain, modifiers, phase, countdown, cooldown and locks;
- the eruption count;
- the gas sources, the openings and the structural damage;
- the materials;
- the event ids seen.

- **A failed hold, retried:** the attempt's state comes back. Its price (worse by failRise, and the lock) is a challenge cost, so it is paid again after the restore: a retry is not a free undo.
- **An eruption inside an attempt** is rolled back with it, and can land again on the next attempt (its default event id, `erupt:<subject>:<count>`, is restored too). A repeated callback with the same id is refused.
- **An eruption in a failure's costs** lands once per failure (scoped `cost:<n>`).
- **Repeated retries** never pile up sources, damage, NPCs or flags.

Tests cover all four. They also cover a simultaneous gas emission and
structural damage rolled back together.

## 16. Save version and migration

`SAVE_VERSION` is 21. The ship gains `pressure: { subjects: { ... } }`, with
only the subjects ever touched and at most four modifiers each (full
precision, about 200 bytes with both in play).

The 20 to 21 migration is `fillLayout`, like 19 to 20. Versions 17 to 20 load
with every subject off and nothing pending:
- no eruption is invented;
- nobody is moved or spawned;
- Brogath's Stability, a story variable, loads exactly as it was;
- the story, crew, hull, emergencies, air, inventory, quests and flags load as they were.

Damaged data loads safely:
- unknown subjects and modifiers are dropped with a warning;
- numbers are clamped;
- an unknown phase becomes idle;
- a countdown keeps at most one and a half warnings.

Loading replays nothing: the stage is taken as already announced. A
countdown saved mid-way resumes with the seconds it had.

## 17. Script commands and conditions

Every command is validated and opt-in. No chapter uses one.

| Command | Does |
|---|---|
| `{ "pressureSubject": "garrick", "on": true }` | switches a subject's simulation on (or off: it keeps its numbers, and no countdown stays pending) |
| `{ "pressureTrigger": "brogath", "trigger": "laughed_at", "quiet"?, "eventId"? }` | a named trigger (Brogath's line is said unless `quiet`) |
| `{ "pressureCalm": "garrick", "calm": "rest" }` | a named calm |
| `{ "pressureAdd": "garrick", "amount": 20 }` | a bounded amount |
| `{ "pressureHold": "garrick", "amount"? }` | a scene's suppression (stored, strained, no lock) |
| `{ "pressureModifier": "garrick", "modifier": "digesting", "remove"? }` | a temporary modifier |
| `{ "pressureErupt": "garrick", "profile"? \| "controlled"?, "room"?, "eventId"?, "outcomeValue"? }` | a release now (the profile overrides the size; `room` must have ship air) |
| `{ "pressureSettle": "brogath", "pressure"? }` | back to calm after a scene |
| `{ "pressureCheck": "garrick" }` | the captain's report |
| `{ "pressureSoothe": "brogath", "outcomeValue"? }` | the captain calms him (calmed, worse or refused) |
| `{ "pressureRestrain": "brogath", "challenge"?, "outcomeValue"?, "ifFailure"? }` | the captain's hold (a challenge) |
| `{ "pressureRelease": "garrick", "outcomeValue"? }` | the captain's controlled release (the level, late or refused) |
| `{ "pressureSetback": "brogath", "action": "restrain" }` | a failed hold's price (used as a challenge cost) |
| `{ "airMend": "fore_hatch", "challenge"? }` | mends a damaged door or hatch |

The validator rejects:
- unknown subjects, triggers, calms, modifiers and profiles;
- unknown rooms, substances and openings;
- out-of-range amounts and pressures;
- a controlled release with a profile;
- a mend of something that can't be damaged;
- a bad challenge;
- every data problem in section 2's fields. The data checks cover contradictory cooldowns (an `after` at or above `cancelBelow`), suppression that would shrink a release, countdowns too short on the harshest difficulty, modifiers that never end, cues without words, and impact sections that aren't the room's.

The condition:

```json
{ "pressure": { "subject": "garrick", "stage": ["critical", "imminent"] } }
{ "pressure": { "subject": "brogath", "pressure": { "gte": 40 } } }
{ "pressure": { "subject": "garrick", "phase": "cooldown" } }
{ "pressure": { "subject": "brogath", "held": true } }
{ "pressure": { "subject": "garrick", "erupted": { "gte": 1 } } }
{ "pressure": { "subject": "garrick", "active": true, "available": true, "here": true } }
```

## 18. Debug-demo instructions

1. F2 > Ship > "Pressure demo" (the `pressure_demo` preset): the end of Phase 17 in the crew quarters at (12, 7). Brogath is at (10, 7) and Garrick at (13, 6), where the story has them, both within reach. The ship is healthy, the air clean, and there are supplies (8 planks, 10 nails, 4 rope, 6 sailcloth).
2. F2 > Ship, one of:
   - **A: Brogath laughed at, the crew staring.** Watch the HUD line and his meter. Respond > Brogath > Check on Brogath, then Reassure Brogath (pick the right words; try a wrong one).
   - **B: Garrick after a feast.** Respond > Air and vents > Open the quarters porthole, then Respond > Garrick > Let Garrick let it out, carefully: a small heavy-gas release that the porthole clears, then a cooldown.
   - **C: Garrick held it in twice, then a ceremony.** The countdown (IMMINENT HELD) and a catastrophe. Get out (the fore hatch), come back, open the porthole, Mend the fore hatch, repair the bow (Pause > Ship).
   - **D: Brogath building.** Choose: let it out, reassure, hold it in, or nothing. Then use "Embarrass Brogath" (he trips; the crew laughs) to keep at him, and compare.
   - **E: Garrick charged.** Save (Pause > Save), reload, Continue: the same pressure and modifier. Ask him to hold it in, fail it, Try again, then let it out.
3. Other rows: "Embarrass Brogath", "Garrick has a drink", "Let 10 seconds pass", "Settle them both and switch them off". The F2 > Ship rows show each subject's pressure, stage, what is held, the phase and whether he is away.

## 19. Performance findings

- **State:** two subjects at most, four modifiers each; a save grows by about 200 bytes with both in play, nothing with neither.
- **Per tick:** a few arithmetic steps per switched-on subject. "Where is he" is a placement lookup over his own rows in 9 rooms, cached until the story or the captain's room changes. A thousand ticks with both in play and triggers every 30 s stay well under the test's bound, with nothing accumulating.
- **Per frame:** for each switched-on subject in the room, a shiver and a puff timer. A puff is one small burst every 5 s at most, and none with reduced effects. Nothing runs when no subject is on (the campaign).
- **Measured** with the existing instrumentation: the perf spec now has a pressure scene (the `pressure_demo` crew quarters with both subjects in play, Garrick critical with his shiver and warning puffs, Brogath building under a modifier, the pressure ticking) next to the end-of-Phase-17 crew quarters. Three runs (`PERF_RUNS=3`, medians with the range) on the test machine's software renderer, so diagnostic only:

  | Scene | still: work p95 ms | walk: work p95 ms | still: frame avg ms | display objects | heap MB |
  |---|---|---|---|---|---|
  | end of Phase 17, crew quarters (nobody in play) | 4.3 (3.3-4.9) | 3.6 (2.7-3.8) | 18.96 | 189 | 92.0 |
  | pressure demo, crew quarters (both in play) | 4.6 (4.3-5.3) | 4.6 (3.7-4.6) | 20.45 | 189 | 92.2 |

  At most about 1 ms more work per frame, from the shiver, the puffs and the HUD line; no more display objects; no heap growth. Every figure is well inside the harness's limits (work p95 12 ms). The frame-time flags (p95 33 ms) show up in the rooms with nobody in play too: they come from the software renderer, not from the pressure.
- **Bundle:** 7201 kB raw, 1836 kB gzip, 1399 kB brotli: 58, 16 and 13 kB more than before this prompt (the code and its data).

## 20. Known limitations

- **Subjects don't move.** A designated release room needs crew schedules (a later prompt), so a release happens where the story has the subject.
- **One room's openings.** The blast reaches the origin room's openings only, with no pressure wave travelling further, and no physics.
- **Garrick's buildup isn't tied to the story's food.** His feast, beans and ceremony are this system's triggers; the story's Grand Feast (chapter 89) and his `garrick_release` values are not wired to them. That is for the campaign prompts.
- **Brogath's legacy eruptions are untouched.** His incidents and scripted catastrophes still run their own scripts, and they don't call this system's eruption. A chapter that wants both would switch his subject on and replace its incident with triggers.
- **Two subjects.** Vindicta and Thunderbottom (doc 04 S5) are not subjects yet.
- **Exposure has no defeat.** The worst a release does to the captain is Prompt 7's exposure (HP down to a quarter).
- **A pre-existing bug, unchanged.** The chapter 6 hatch test still fails in `e2e/phase2.spec.js` (doc 05, findings from Prompt 7). Phase 2 content is out of this prompt's scope.

## 21. Future named-fume integration

The release engine takes a substance per subject or per profile, and profile
fields for openings, damage, leaks and fire. The named Stenchmaster
varieties need their own mechanics:
- the Coffin Sock: lingering, attached to cloth;
- Chicken-Town: transforming;
- the Fire-Waft: ignites, with `ignite` and fire spread;
- the Beard Joint: built on Beard Saturation (Prompt 9: [13-beard-saturation.md](13-beard-saturation.md)), which so far adds only the generic residue an eruption leaves in the captain's beard (a subject's `beard`); the Beard Joint itself, and its intoxication, are not implemented.

Each should be added as:
1. a substance in `data/ship/air.json` with its own behaviour fields, where the air needs them;
2. a release profile naming it, with its own effects;
3. new effect kinds in `PressureState.erupt`, only where a variety needs one (a transformation, a status).

A chapter then switches its subject on, replaces its scripted
release with `pressureErupt` (or lets the countdown do it), and replaces its
fume zones with the release's source (one owner for the captain's lungs,
doc 11 section 9).
