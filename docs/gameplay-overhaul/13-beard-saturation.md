# 13. Stink Beard Saturation

Overhaul Prompt 9. The captain's Stink Beard becomes a filter and a store:
it catches part of every gas he breathes (that gas leaves the room), holds
it by kind, fills up, protects him less as it fills, gives off what it
holds when it is heavy, and purges back into the room when it is full. It
has conditions (saturated, gagging, paranoid, hornet-nested), it can be
inspected, sniffed, wrung out, rinsed and scrubbed at the washroom tub, and
three story items can be worn over it. It runs on the same air (Prompt 7),
the same exposure, the same eruptions (Prompt 8), the same challenge
runner, the same hazard clock and the same saves as everything before it.

**Opt-in.** No chapter switches it on. The Story Phase 16 beard tags, the
Phase 17 puffs, every legacy fume scene and the washroom's own story scene
play exactly as before. The system and an isolated debug demo are all this
prompt adds.

| What | Where |
|---|---|
| Data | `data/ship/beard.json` (contaminants, stages, statuses, purges, sniff, care, equipment, limits) |
| Rules (no state) | `src/systems/ship/beard.js`: the registry, stages, care stations, validation |
| State | `src/systems/ship/BeardState.js`: `ship.beard`, saved and checkpointed with the ship |
| The air's part | `src/systems/ship/AirState.js`: `breathe` (the beard first, then the lungs), `takeGas`, `inhale`, `absorbed` |
| The captain's part | `src/systems/ship/beardResponse.js`: Respond options, the look and the sniff, HUD words, advice |
| Commands | `src/systems/script/commands.js` (`beard*` except the story's `beard` and `beardPuff`), schemas in `commandSchemas.js` |
| Condition | `beardSaturation` in `src/systems/conditions/conditions.js` |
| Eruptions | `beard` on a subject in `data/ship/pressure.json`, deposited by `PressureState.erupt` |
| World | `src/world/BeardCues.js` (gagging fits, warning puffs, purges, visions, the hornets' buzz) |
| HUD and page | the emergency line (`response.js`, the beard first), Pause > Ship "Your beard" (`src/ui/menu/ShipPage.js`) |
| Timing bar | the `scrub` kind in `src/systems/repairKinds.js` |
| Demo | `beard_demo` preset, F2 > Ship > Beard A-F (`src/debug/shipDebug.js`) |
| Tests | `tests/beard.test.js` (52), `e2e/beard.spec.js` (3) |

## 1. Existing beard mechanics and compatibility

Everything that touched the beard before this prompt, and what it is:

- **The story's beard tags** (Story Phase 16, `src/systems/beard.js`, `data/story/beard.json`). Twelve tags (GARRICK_ORIGINAL, BROGATH_ANCIENT, SKUNK_HAZE, COFFIN_SOCK, HORNET_ATTRACTED...), each a story flag `beard_<tag in lower case>`. They are set by the `beard` command (14 `add` steps, 1 `remove`: HORNET_ATTRACTED is the only temporary one) and read by dialogue, the captain's look and the hornets. **Narrative only.** They record what the beard has been through; they have no amounts and no effects of their own.
- **The puffs** (Story Phase 17, `beardPuff`, 6 uses; `src/world/BeardPuffs.js`). An authored puff from the beard, a reaction from whoever is near, and the story variable `beard_puffs`. **Cosmetic and narrative.** Untouched; the new warning puffs are a separate cue and never touch `beard_puffs`.
- **Beard flags in scenes**: `beard_sniffed`, `beard_wash_attempted` (the Story Phase 4 washroom tub scene). **Narrative only.**
- **The washroom** (`data/maps/ship/washroom.json`): a basin (2,4), the tub (7,5), remedies, a shelf, a vent and towels. Only story inspections. **Reused** (no new fixture): the tub and the basin are the care stations.
- **Story items**: the wet cloth, the bottle goggles and the beard wrap are key items with no effect. The rescue's protection is the story flag `rescue_gear_on` (his lungs take 0.7 of the legacy fumes and, since Prompt 7, of the ship's air). Frog Grog's ward is per-play (`transient.fumeWard`). **Kept as they are**; the new mapping (section 10) applies only while one is worn over the beard by choice.
- **The legacy fume zones** (`src/systems/hazards/fumes.js`): story exposure in authored clouds. **Gameplay, kept**: while one has his lungs, the ship's air doesn't (Prompt 7's rule), and the beard doesn't change that.
- **The hornet swarm** (Story Phase 16, `src/systems/hazards/hornets.js`). A story hazard. **Kept**; the new hornet-nested condition is a separate hook (section 6) and never starts the swarm.
- **What it builds on** (extendable): the ship's air and exposure (Prompt 7), eruptions and their gas (Prompt 8), the challenge runner and checkpoints (Prompt 3), difficulty tuning (Prompt 4), Ship Integrity's event ids and saves (Prompts 5-6), the hazard clock.

Nothing new competes with these: no second atmosphere, exposure, status, equipment or challenge framework.

**Where it lives.** `ship.beard` is a `BeardState` owned by the ship, like `ship.air` and `ship.pressure`: saved in the ship's state (`ship.beard`), restored with the ship by checkpoints, ticked by `ship.tick()`. The air calls into it once a second while he breathes; scripts and the captain's actions call it through commands. It knows the session (content, inventory, where the captain is) and nothing about Phaser: the world listens to its events (`beard:gag`, `beard:puff`, `beard:purged`, `beard:hallucinate`, `beard:hornets`) and its notices (`hazard:notice`, keys `beard:...`).

## 2. Saturation state

- **Capacity**: 100 units, times the difficulty's `beardCapacityScale` (Deckhand 140, Captain 100, Brutal 70).
- **Total**: always the sum of the composition (never stored), never negative, never past capacity. A deposit beyond capacity is refused, not lost. An unknown contaminant or a bad amount changes nothing and says why.
- **Kept state**: whether it is on; the purge cycle (`idle`, `overload` with a countdown, `cooldown`); kept conditions with their seconds; the effects' timers; the sniff lock and the sniff's interruption; what is worn; purges so far (event ids); visions shown. Per play (never saved): what moved (taken, deposited, cleaned, released: conservation is checked on these), the trend, and what was last announced.

**Stages**, by how full it is (percent of this difficulty's capacity), each with an effect:

| Stage | From | Catches | Gives off | Work | Walk | Warning puffs |
|---|---|---|---|---|---|---|
| clean | 0% | 55% | - | | | |
| trace | 2% | 55% | - | | | |
| noticeable | 15% | 50% | - | | | |
| saturated | 35% | 35% | - | x1.05 | | |
| heavily saturated | 60% | 20% | 0.1 | x1.1 | | |
| critical | 80% | 10% | 0.2 | x1.15 | x1.05 | every 6 s |
| overloaded | 100% | 0 | 0.35 | x1.2 | x1.1 | every 4 s |

"Catches" is the share of a breath it takes (times the contaminant's absorb and what he wears); "gives off" is exposure per unit held a second, times potency. Work and walk multiply the time emergency work takes and each step (with water and his lungs: `captainFactors`). The validator requires rising thresholds, a full beard that catches nothing, and never a perfect filter (at most 90%).

**Risk and reward.**

- **Reward**: a clean beard keeps the worst of the air out of his lungs: he can work in smoke that would otherwise make him cough and stumble. Washing it keeps that going.
- **Price**: what it catches stays. It fills, protects less, slows his work a little, gives off what it holds when heavy, makes him gag when irritants build up, and at full it purges into whatever room he is in, after a warning. A beard full of vapor in a room he can't air out is a problem.
- **Brutal**: a 70-unit beard saturates first (in the same smoke: Brutal before Captain before Deckhand, tested), washing does less (x0.75), the purge warning is shorter (7 s), and what it gives off counts more (`exposureScale` 1.35). Deckhand: 140 units, washing x1.3, a 15 s warning.

## 3. Contamination composition

- **Composition** (`held`): an amount per contaminant, from a compact registry in the data:

| Contaminant | From | Absorb | Potency | Cleans | Purges as | Flags |
|---|---|---|---|---|---|---|
| smoke | the air | 1 | 0.02 | 1 | smoke | |
| vapor | the air | 0.8 | 0.05 | 1 | vapor | irritant |
| heavy_gas | the air | 0.5 | 0.08 | 0.8 | heavy gas | irritant |
| stench_residue | eruptions, scripts | - | 0.06 | 0.4 | vapor | supernatural |
| test_musk | debug and tests only | - | 0.02 | 0.6 | vapor | supernatural, paranoia, debugOnly |

  The named gases of later prompts (Coffin Sock, Chicken-Town, Fire-Waft, Beard Joint) are not implemented; a new contaminant is a data entry (section 20).

Two contaminants that fill the same share behave differently: a beard of smoke protects and gives off little, one of heavy gas gives off four times as much and washes out slower, one of vapor or heavy gas makes him gag, one of residue barely washes out, and only the musk makes him paranoid (`tests/beard.test.js`).

## 4. Absorption and conservation rules

Each second the captain breathes (`AirState.breathe`, inside the air's tick), with the beard on:

1. For each gas in his room, in the data's order: `breathed = breath x pct / 100` units pass through the beard (`breath` is 10). It catches `share = stage.absorb x contaminant.absorb x worn absorb` of that, never more than it has room for or the room holds.
2. What it catches leaves the room (`AirState.takeGas`, counted in `air.absorbed`) and goes into the beard.
3. His lungs breathe the rest: each gas at `pct x (1 - share caught)`, against its safe level, times its potency (`indexThrough`). So a clean beard can keep moderate smoke below the safe level altogether, and a full one protects not at all.

Conservation: for every air gas, `in the rooms + vented + decayed + absorbed - released by the beard` is exactly what was poured, and what the beard holds of it is `absorbed - released - washed out`. Event deposits are a separate source (below). Deterministic: no randomness, the data's order, one step a second.

**Eruptions and other event deposits.** One model, documented and tested: an eruption's **gas** is air like any other, and reaches the beard only as he breathes it (above); an eruption's **residue** is a deposit straight into the beard, of a supernatural contaminant that never comes from the air. The two never overlap, so nothing is counted twice.

The residue is opt-in per subject (`"beard": { "contaminant": "stench_residue", "amount": 12, "reach": 4 }` on Brogath and Garrick in `data/ship/pressure.json`). An eruption deposits it only if the beard system is on, the captain is in the eruption's room and within `reach` tiles of the subject, `amount x intensity/100` (bounded 0.25 to 2 times), once per eruption (`<eruption id>:beard`). A contamination event carries its source, room, intensity, contaminant, amount, the subject's position and an event id. Legacy story eruptions (Stability incidents, cutscenes) deposit nothing: they are not Prompt 8 eruptions and the beard system is off in every chapter anyway.

## 5. Protection and exposure interaction

`room air -> the beard (its share, out of the room) -> what passes -> his lungs`, then, exactly as before Prompt 9:

- the **fume hazard option** and **fume immunity** (`air.access`: Off or immune means nothing reaches his lungs);
- the **rescue gear** (`rescue_gear_on`) or the **worn wet cloth**: 0.7, the smaller of the two, never both (the world takes `min(rescue, worn)`);
- **Frog Grog's ward** (per play), multiplied in as before;
- the difficulty's `exposureScale`.

No double counting: the beard only reduces what reaches the protections, it never applies a second protection factor; the wet cloth and the rescue gear are one factor; a legacy fume zone still owns his lungs on its own (the beard still takes the ship's air there, since that air is real, but his lungs take nothing from the ship's air or the beard that second).

**Giving off.** At heavy and worse, the beard gives off `held x potency x stage.offgas` a second into his lungs, through the same access and `exposureScale`. In bad air it adds to the room's dose. In clean air it slows his recovery and never reverses it: the most a full beard of the most potent air gas gives off is below the clean-air recovery on every difficulty (tested). In hazy air on Brutal it can outpace recovery: that air is not clean.

**Not permanent.** Its protection falls stage by stage as it fills (55% to 0), and a full beard gives off the most. Washing or purging restores it.

**Sniffing: internal exposure.**

- **Sniff your beard** (`beardSniff`): the detail (each contaminant and its share), at a price: a whiff into his lungs (`held x potency x 0.6`, through the fume option and the difficulty), a gag if there's irritant in it, and 10 s before the next sniff. It interrupts paranoia (section 7). Never needed for anything, and the price is only what the beard holds.

## 6. Status effects

Four, data-driven (`statuses` in the data), each with limited, real behaviour:

| Status | Kind | When | Effect |
|---|---|---|---|
| Saturated | derived | saturated stage or worse | the stage's own (holds less, protects less); on the HUD as the stage |
| Gagging | derived | irritant contaminants at 30% of capacity or more (the goggles halve them) | a gagging fit every 8 s (he stops a moment, like a cough); work x1.15. No fits with the fume hazard option Off |
| Paranoid | contaminant | paranoia contaminants at 8% or more, then 20 s after | perception (section 7): a vision every 12 s |
| Hornet-nested | applied | a script or event, 300 s | work x1.1; the `beard:hornets` hook every 9 s (a buzz); smoke at 12% of capacity drives them out, and so does a scrub |

Derived statuses are read from what is held (not saved); kept ones are saved with their seconds. Every kept status ends (applied: at most 600 s). A derived status can't be applied by a script. The hornet hook is for a later system: there is no hornet enemy here. Beard Joint intoxication is not implemented.

## 7. Paranoia behavior

Limited perception distortion, from an eligible contaminant (paranoia: only the debug-only test musk today) or an explicit script event (`beardStatus: paranoid`), never from ordinary smoke (a full beard of smoke: tested). While paranoid and not snapped out of it:

- **false alerts**: every 12 s a vision, a toast in purple that always begins "(?) " (the validator requires it of every line), such as "(?) GRAND STENCHMASTER ALERT: something is building up right behind you.";
- **a misleading label**: "(?) Grand Stenchmaster?" over the nearest person on screen for a moment;
- **an altered inspection**: the look adds "(?) Something in it seems to be looking back at you."

**Fairness**: nobody's name, sprite, identity, quest or interaction changes (tested: actor names and the story are untouched); nothing is hidden or made unidentifiable; nothing redirects an attack; the clue is always the same "(?)", in words, so colour is never the only clue; visions never appear on the HUD line, where the real warnings stay; reduced effects keep the words. A **sniff** snaps him out of it for 15 s (no visions; the status itself stays). That temporary interruption is modelled apart from real recovery, which only comes when the contaminant is gone and the 20 s linger has run out.

## 8. Overload and purging

- **Warning puffs**: at critical and worse, a little "*pff*" at his chin every few seconds. A cue only: no gas.
- **Involuntary overload**: full (100%), it says so and counts down (10 s times `warnScale`, never under 4), then purges half of each contaminant into the room he is in. Wringing it out or washing it below 95% first cancels the countdown.
- **Controlled purge** ("Wring it out, here", 3 s of work): 40% of each, into this room. Refused with nothing in it or in the cooldown after a purge.
- **Catastrophic** (all of it): a configurable profile for a future event, never automatic; only a script uses it (`beardPurge: catastrophic`).
- **What a purge releases**: finite air sources in his room, of what each contaminant becomes (`release`), never more than left the beard (every source slot taken: all at once, never past full; no ship air there: into the open, counted as vented). One per event id (`beard:purge:<n>`, saved; its own ids skip one already taken, so a countdown always ends in a purge; a script's own `eventId` is refused when repeated).
- **No loop**: after any purge the beard takes nothing in for its cooldown (15 to 60 s), the purge's gas spreads and vents meanwhile, and a beard can only overload again by taking in more than half its capacity anew. Overloaded in a sealed room with nothing pouring, it purges once in ten minutes and the stink in room and beard together only ever falls (tested). None of it runs in a story scene: the system is off in every chapter.

## 9. Beard care

At a care station: next to the washroom tub (7,5) or the basin (2,4) (reach 1). No new fixture. Refused, with the reason, away from a station, in deep water, in air that isn't breathable (it would only soak up more), or while other work is going on.

- **Rinse** (water, 6 s of hazard time, longer with bad lungs or a heavy beard): 30% of each contaminant out, times its `cleans` and the difficulty's `cleanScale`. Free: a beard can always be cleaned.
- **Scrub** (a sailcloth rag, on the timing bar `SCRUB IT OUT`, the ship_repair profile, 8 s): success takes 80% out, a rough job 50%; both get the hornets out. A failed try wastes the rag and stirs the stink up (10% out and a gag), as a cost that "Try again" keeps; the tries are what the hold can pay for. The rag is taken only when a scrub succeeds or as a failure's cost: never twice, and never by a save in the middle. The cost scales with the difficulty (Brutal 2 rags).

The timing assist and Classic Bar apply as to every bar.

## 10. Equipment compatibility

An opt-in mapping (`equipment` in the data) for three story items; no second equipment system, and nothing is worn by itself:

| Item | Worn over the beard |
|---|---|
| the beard wrap | it soaks less (catches 0.35 of its share): it fills slower, but more reaches his lungs |
| the wet cloth | his lungs take 0.7, the same factor as the rescue gear, never on top of it |
| the bottle goggles | irritant counts half toward gagging |

Worn only through `beardWear` or Respond while the system is on, and only while carried (an item that leaves the inventory stops counting). The items stay key items; nothing in the story changes.

## 11. Difficulty and accessibility

Two new ship tuning keys (validated bounds 0.5 to 1.5) and three existing ones:

| | Deckhand | Captain | Brutal |
|---|---|---|---|
| `beardCapacityScale` (capacity) | 1.4 (140) | 1 (100) | 0.7 (70) |
| `cleanScale` (care) | 1.3 | 1 | 0.75 |
| `warnScale` (overload warning) | 1.5 (15 s) | 1 (10 s) | 0.65 (7 s) |
| `exposureScale` (what reaches his lungs, from the air, the beard and a sniff) | 0.6 | 1 | 1.35 |
| `costScale` (rags) | 0.5 (1) | 1 (1) | 1.5 (2) |

Accessibility:

- **Timing Assist and Classic Bar**: the scrub is the timing bar, so both apply (tested).
- **Reduced effects**: no wisps or bursts; every word, toast, sound and HUD entry stays, and the simulation is unchanged.
- **The fume hazard option**: it affects what reaches his **lungs** (from the air, from what the beard gives off, from a sniff) and the **gagging fits** (none when Off or immune). It does not stop the beard filling, its stages, its purges or its HUD warnings: the beard is about the room's air, and Off must never secretly reintroduce lung damage (tested: Off, nothing reaches his lungs).
- **Remapping and gamepad**: Respond is the Respond control (V, pad X); everything else is choices and the bar.

## 12. Hazard-clock ordering

One clock, frame-rate independent, paused exactly as before (only while the captain is free in the world, never during a scene, dialogue, the bar, a room change or the F2 panel; the work actions run their own ticks). Each tick, in order:

1. **pressure** (buildup, an eruption: damage, blast, its gas source, its residue in the beard);
2. **leaks, water and fire**;
3. **the air**: sources pour (a purge's too), fires smoke, gas moves, decays; then he breathes, **through the beard first** (absorption, then his lungs);
4. **the beard's own second**: locks, kept statuses, effects (gag, vision, buzz), warning puffs, the overload countdown and its purge (whose gas pours from the next second), the cooldown.

Checkpoint restore puts the whole ship back at once (section 14). World interaction (Respond, care) happens between ticks or as work ticks.

## 13. Save version and migration

**Save version 22** (`SAVE_VERSION`, migration `21 -> 22` in `src/systems/save/migrations.js`). The ship's state gains `beard` (written only once the system has been used: `{}` until then): on, composition, phase and countdown, kept statuses with their seconds, effect timers, sniff lock and interruption, worn items, purge and vision counts. Event ids are the ship's (`events`), as before. Versions 17 to 21 load with the beard off and clean; the story's beard tags load exactly as they were and are never read as contamination or conditions (tested on all five). Damaged data loads safely: unknown contaminants, statuses, items and phases are dropped or reset with a warning, numbers clamped, more than the largest capacity scaled down, and nothing is announced on loading.

## 14. Checkpoints and retries

**Checkpoints** capture and restore `ship.beard` with the ship's air and events. Tested:

1. absorption during a challenge attempt is rolled back with it;
2. a failure's costs (a deposit, a failed scrub's rag and its little clean) stay through a retry, once per failure;
3. a retry restores composition, conditions, cycle and the air the beard poured;
4. after a restore, new exposure absorbs again normally;
5. a duplicated callback (the same deposit or purge id twice) applies once;
6. permanent consequences (sticky costs) are kept, not duplicated;
7. a purge in an attempt is not duplicated by the retry (one source per purge id);
8. cleaning materials are spent exactly once per try;
9. saving in the middle of grooming saves the state before it (rag and beard), and the loaded game can groom again;
10. the checkpoint diff names what changed (`beard`: on, phase, count, held by contaminant, statuses, worn).

## 15. Script commands and conditions

All validated; all opt-in; no chapter uses any of them (tested: scripts, maps, quests).

| Command | What |
|---|---|
| `{ "beardSaturation": true }` | switch the system on or off (off keeps what it holds, cancels a countdown) |
| `{ "beardAdd": contaminant, "amount", "eventId"? }` | a deposit not from the air, at most `limits.addAmount`, never past capacity, once per event id |
| `{ "beardClean": true \| contaminant, "share"? }` | a scripted wash (exactly that share) |
| `{ "beardStatus": id, "seconds"? }`, `"remove": true` | apply or remove a kept status (never a derived one) |
| `{ "beardPurge": "controlled" \| "overload" \| "catastrophic", "room"?, "eventId"? }` | a purge now |
| `{ "beardInspect": true }`, `{ "beardSniff": true }` | the look, the sniff |
| `{ "beardWring": true }` | the captain wrings it out (work) |
| `{ "beardCare": "rinse" \| "scrub", "challenge"? }` | care at a station (a scrub is the challenge) |
| `{ "beardWear": item, "remove"? }` | wear a mapped item over it, or take it off |
| `{ "beardSetback": "scrub" }` | a failed scrub's cost (internal) |

The condition `{ "beardSaturation": { ... } }` reads `active`, `stage`, `pct`, `contains` + `amount`, `status`, `phase`, `wearing`, `purged`. The debug-only test musk is refused in content by command and condition. The story's own `beard` (tags) and `beardPuff` commands are unchanged; tags are still read with `{ "flag": "beard_<tag>" }`.

## 16. UI and controls

**HUD**: while saturated or worse, gagging, with a kept condition, or counting down, the emergency line leads with the beard ("BEARD 68% SATURATED GAGGING", "BEARD CRITICAL PURGE RISK", "BEARD OVERLOADED 6s"): it is his own and always here, so it takes the first place and the worst other emergency follows. **Respond** groups "Your beard" with the room's other troubles. **Pause > Ship** has a "Your beard" row while the system is on: how full and the trend, what it holds (short names), conditions with their seconds, protection, purge risk, where and with what to wash it (rags carried), and Respond. Every word is measured to fit (tested). Keyboard and pad alike.

- **Look at your beard** (Respond, `beardInspect`): how full and how bad, what it smells of in broad words ("mostly irritating vapor, with smoke and something not of this world": no figures), each condition with its meaning, how well it protects, the purge risk, what is worn, what to do.

The world's cues (`src/world/BeardCues.js`): a gagging fit stops him a moment with "*gag* *hurk*"; a warning puff is "*pff*" and a wisp at his chin; a purge has its sound and a burst of the gas's colour; a vision is a purple toast marked (?) and the label "(?) Grand Stenchmaster?" over the nearest person; the hornets buzz. Notices are said once per change (the world also drops a repeat of the same notice within 4 s), so nothing spams.

## 17. Debug demonstration

F2 > Ship > "Jump: Beard demo" (`beard_demo`: the end of Phase 17 in the crew quarters, the washroom next door, sailcloth, the beard wrap, the wet cloth and the goggles), then:

- **A**: smoke pours into the crew quarters: the beard fills, his lungs stay clear, then it protects less; leave the room and it stops.
- **B**: mixed contamination (smoke, vapor, residue, heavy gas about): look, sniff, save and load.
- **C**: overloaded: wring it out somewhere you can air, or let it go (one purge, no loop).
- **D**: filthy, with hornets in it: the washroom tub: rinse, scrub (fail, try again), the hornets go.
- **E**: the test musk: paranoia's visions, marked (?); sniff to snap out of it; wash it out.
- **F**: heavy with vapor: save, scrub, fail, retry; reload: identical.

Plus "Wear the beard wrap", "Let 10 seconds pass", and "Wash it clean and switch it off". Respond with V (pad X).

Tests: `tests/beard.test.js` (52: the model and data, absorption and conservation, protection, determinism, the fume option and legacy zones, offgas, eruptions, statuses, paranoia's fairness, overload and purging, no loop and no jammed ids, look and sniff, care and its cancellation, equipment, difficulty and assists, the clock, saves 17-22, damaged data, checkpoints and retries, commands, validation, the condition, HUD, Respond, the Ship page, every word's fit, cost, scenarios A-F, the campaign and the story's beard unchanged). `e2e/beard.spec.js` (3: keyboard look, sniff and rinse with reduced effects; a gamepad scrub failed and retried; an overload saved mid-countdown and continued, wrung out in time, and paranoia's visions).

## 18. Performance findings

The beard does a few multiplications per gas per second while it is on, nothing per frame, and nothing at all while off (every chapter). A thousand seconds of smoke with every condition on stays bounded (tested: under 2.5 s headless, a few hundred bytes of save, at most five timers). In the browser (`perf/scenes.spec.js`, the `beard_demo` scene: smoke pouring, the beard absorbing, gagging, hornets and visions): see the numbers in the final report of Prompt 9 and `tmp/perf/`; they are within the same diagnostic limits as the pressure demo.

## 19. Known limitations

- One beard, the captain's. Crew beards are not simulated.
- The hornet-nested condition is a hook (a buzz and slower work); there are no hornets to fight.
- Paranoia's only eligible contaminant is the debug-only test musk; no story gas causes it yet.
- Warning puffs are cues, not releases. The catastrophic purge is only for scripts.
- The look and the sniff are dialogue reports; there is no dedicated beard panel apart from the Ship page row.
- Care stations are the washroom's tub and basin only.

## 20. Future named-fume integration

A named gas is a contaminant entry (from the air with `air` and `absorb`, or deposited as a supernatural residue), with its `potency`, `cleans`, what it purges as, and flags (`irritant`, `paranoia`); a status is a `statuses` entry with bounded effects; an event that should leave something in the beard uses `beardAdd` or a subject's `beard`. Nothing in the engine needs to change for that.

The named varieties, as they arrive:

- **Coffin Sock**: lingering; a contaminant that `cleans` poorly, and a rinse that barely touches it.
- **Chicken-Town**: transforming; a status with its own bounded effect.
- **Fire-Waft**: igniting; a purge of it could start a fire through the hazards' `ignite`, opt-in per profile.
- **Beard Joint**: the paranoia contaminant for the story (`paranoia: true`, no longer debug-only), with its intoxication as a further status; the sniff already interrupts its visions without curing it.

None of them is implemented here.
