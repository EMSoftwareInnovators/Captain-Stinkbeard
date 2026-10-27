# 04 · Gameplay systems and difficulty

What the game asks of the player today, where that falls short of a demanding action RPG, and the reusable systems proposed to fix it. Every proposal says what existing code it extends. Nothing here has been implemented.

## 1. What the player does today (measured)

From `01-story-inventory.md` (all 223 chapter entries) and the engine sources:

- **121 of 223 chapters are walking and pressing A**, or pure cutscene. Another 23 add only a choice or puzzle prompt: working the TV set, reassurance choices, forms, appraisal, or a die whose result the script fixes. 79 ask for any timed input, and 64 of those use only the repair timing bar.
- **Nothing after the prologue can be failed.**
  - The repair timing bar widens its green zone after 3 misses and fills the whole bar after 5 (`OverlayScene.placeRepairZone`). The script waits for the strikes and at most stores how many were clean: 2 of the 177 timing-bar steps keep that number, and 3 scripts read it.
  - Shark Duty’s bar “can’t be failed” (`src/systems/hazards/sharkDuty.js`). A slow strike lets a shark bite, which adds a hull patch to hammer and increments `duty_bites`.
  - The sash-tension hold “never fails” (`src/systems/script/commands.js`). Hearings and pitches send the player back to retry (`src/systems/proceedings.js`). Fume exposure ends in a collapse that carries the captain out (`hazard.fume_collapse`).
  - The course dial and the bell alarms take no input: the dial drifts on its own and the alarms play.
- **Combat is a prologue feature.**
  - 4 enemy types; 9 encounters, of which 4 are debug only. The only lethal fights are the three prologue rat encounters; Game Over retries from the autosave (`src/scenes/GameOverScene.js`). The sparring match and the Phase 17 drill are `nonLethal`, and the `cutthroat` enemy is used only by debug encounters.
  - The battle engine is solid: turn-based with timed hits, 22 abilities, 17 statuses, party members, cardboard traits and stagger (`src/systems/battle/`). Visible field enemies wander, chase, and give the first blow to whoever strikes from behind (`src/world/FieldEnemy.js`).
- **Progression is thin.**
  - XP comes from battles and from clean timing-bar strikes: 2 per clean strike, 3 for a sweep (`SKILL_XP` in `OverlayScene.js`). A `giveXp` script command exists but no content uses it; no content uses `giveGold` either.
  - The level table runs to 30 and is marked “Tuning is temporary for Phase 1” (`data/progression/`).
- **Equipment barely matters.** There are 9 pieces in 4 slots (2 weapons, 2 body, 1 feet, 4 accessories). Stats do reach the timing bar: Muscle, Hands and Footing (attack, speed, defense) widen or narrow the green zone by −25% to +60%. Protective gear the story hands out (wet cloth, bottle goggles, clay-pot helmet, beard wrap, waist rope; Chapter 112) are **key items, not equipment**, so they protect nothing mechanically.
- **Resources.** 5 consumables (hardtack, healing tonic, rum ration, bandage, Frog Grog), 37 key items, 3 shops. No resource is scarce, because nothing consumes resources.
- **Saves and checkpoints.** Autosave on entering a room and after field battles; 3 manual slots (`src/scenes/WorldScene.js`, `src/systems/save/`).
- **Accessibility settings.** Text speed, text sound, screen shake, effects, fume hazard (normal / gentle / off), integer scaling, fullscreen, always run, controller setup with learned pad layouts (`src/systems/settings/Settings.js`, `src/ui/panels/ControllerSetupPanel.js`). Movement is immediate and reversible mid-step (E2E `movement.spec.js`).

The engine is not the problem. It already has deterministic, data-driven pressure systems (Brogath Stability, Fart Zone rules, proceedings with retry), real-time hazards (fumes, Shark Duty, hornets) and a capable battle engine. The problem is that the story uses them as decoration: every interaction succeeds, and almost nothing remembers how well it went.

## 2. Deficiencies by area

| Area | Today | Problem | Direction |
|---|---|---|---|
| Combat depth and variety | 4 enemies; story battles only in the prologue | No threat for 220 chapters | Field combat on the grid plus turn-based set-pieces (see §4) |
| Progression and equipment | XP from strikes; 9 equipment pieces; protective gear as key items | Stats barely change play; gear is flavour | Gear slots that matter (head/face/beard/tool), XP from every challenge, abilities per crew |
| Exploration and level design | 9 ship rooms + island + reef; objectives signposted by many NPCs | Rooms are corridors to scripted objects | Rooms with hazards, shortcuts, hidden stores; fewer hints by default |
| Environmental interaction | Fumes and exposure, sharks, wind gusts in script | Hazards rarely interact with each other or the layout | Atmosphere routing (doors, portholes, wind), flooding, fire, sliding objects |
| Ship management | Repairs are narrative chores | Damage never persists | Ship Integrity with persistent damage and repair economy |
| Resource scarcity and recovery | Nothing is consumed | No decisions about supplies | Materials, food and Frog Grog as resources with real sinks |
| Crew management and abilities | Crew are dialogue dispensers; 11 parked in the hold | Crew add nothing to play | Stations, conditions, morale, crisis assignments (see `02-crew-audit.md`) |
| Player agency | Choices are mostly flavour; outcomes are fixed | Decisions don’t echo | Persistent consequences routed into later variants |
| Bosses | None after the prologue’s rat matriarch | No climaxes to master | A boss per phase, using pressure or hazard systems, not just HP |
| Failure states | Only in prologue battles | No tension | Every substantial challenge can fail, at a recoverable cost |
| Checkpoints and retry | Room-entry autosave | Fine for walking, not for set-pieces | Challenge-start checkpoints; instant retry |
| Difficulty progression | Flat | No curve | New verbs per phase and a mastery curve (§5) |
| Controller and accessibility | Good basics; fume-hazard scale | Real-time combat will need more | Input buffering, dodge on a dedicated button, assist options, colour-safe telegraphs |

## 3. Proposed reusable systems

Each system is data-driven, engine-independent (rules in `src/systems/`, drawing in `src/world/` or `src/ui/`), saved through story values, and introduced by one chapter before it is used under pressure.

### S0. Challenge outcome contract (the foundation)

- **What:** one shape for every challenge: a `success`, `partial` or `fail` result, a `cost` routed into persistent values, and a `retry` policy (instant / from checkpoint / next phase). Scripts branch on outcomes instead of assuming success.
- **Extends:** the `repair` command (add fail thresholds and an outcome branch), the Shark Duty ramp (a session can be lost), sash tension (a `slips` limit), and proceedings (whose hearing and pitch fail → retry pattern is already this contract).
- **Data:** `"repair": "hull", "fail": { "misses": 4 }, "onFail": [...], "outcomeVar": "..."`. A shared outcome helper lives in `src/systems/challenge.js` (new).
- **Acceptance:** every existing step still plays exactly as today when no fail rule is given. The story walkers pass with the debug `autoTiming` flag. New tests cover fail paths.

### S1. Ship Integrity

- **What:** hull sections (port, starboard, bow, stern), rigging, masts, sails, helm, galley stove and pump, each with condition points. Damage sources: shark bites, storm debris, falling sharks, fires, Stenchmaster blasts, cannon fire. Effects: leaks (flooding the hold until pumped), fires (spread until smothered), handling (course drift), and hazards on deck.
- **Repair:** timing bar plus **materials** (planks, rope, sashes, sailcloth) plus optional crew help. Bad repairs fail again later (“Everything we fix, something else falls off.”).
- **Extends:** `repairKinds.js` (hull, rope, brace, smother and others already exist), Shark Duty bites (patches), the sharks and Sharkstorm layers. Patch props become integrity-driven decals instead of permanent props (`03-ship-layout-audit.md`).
- **Failure:** integrity at zero during a set-piece means retry from the challenge checkpoint. Persistent damage carries into the next chapter as work to do, never as a dead end.
- **Story hooks:** Chapter 8 frigate, Phase 6–7 storms, the Phase 9 reef, Chapter 92, the Phase 14 lash-down, Chapter 217’s great white.

### S2. Atmosphere (per-room air)

- **What:** each room has an air value per substance (yellow gust, red sauce, green mellow haze, Coffin Sock, Stench-O-Vision). There are sources (Garrick, Brogath, the Suit, the vats, the TV grille, the beard), sinks (open portholes, hatches, doors, wind) and drift. Fume zones are generated from the room’s air instead of only from hand-placed rectangles. Exposure depends on air, equipment (wet cloth, goggles, wrap) and time.
- **Extends:** `fumes.js` (zones, exposure, collapse), `deadCenter.js` (moving source), `atmosphere.js` (ship-wide states and their consequences, which become one layer), `fartZone.js` (doors and portholes are already modelled), the haze rendering in `FumeLayer`.
- **Failure:** collapse becomes costly: lost time, a crew member dazed, or the Dead Center grows. It stays non-lethal by default, and the Brutal difficulty can make the dense core lethal.
- **Built (Prompt 7):** the per-room air, its sources and sinks (the openings, the open sky), drift between rooms and exposure with protection now exist as a generic system beside the fume zones, which are unchanged: [11-atmosphere-and-ventilation.md](11-atmosphere-and-ventilation.md). Generating fume zones from the air and the named substances are left to the prompts that migrate those scenes.
- **Story hooks:** Chapter 4 (evacuation), Chapter 6 (dive), Chapter 48, Chapter 78, Chapter 130, Chapter 151, Chapter 188 (venting), Chapter 222.

### S3. Stink Beard Saturation

- **What:** the beard holds a numeric saturation per substance on top of its current story tags. Benefits: repels sharks, rats and gulls; lures Agnes; gives the appraisal nose for credit underwriting. Costs: crew keep their distance, and talk options narrow. Thresholds trigger statuses: Saturated (doubled vision, Chapter 139), Paranoid (Chapter 177), Hornet-nested (Chapter 198), and at overload the beard puffs on its own (Chapter 220).
- **Care:** washing in the washroom lowers it, the beard wrap slows intake, shaving resets it (Chapter 220 offers the shave, optionally).
- **Extends:** `beard.js` (tags as flags), `BeardPuffs.js`, the hallucination sprite swaps used in Phase 13 and Phase 17.
- **Acceptance:** the existing beard tags still read the same in dialogue conditions; saturation is an added value with a save default of 0.
- **Built (Prompt 9):** saturation by contaminant on the captain's beard, filled from the room's air as he breathes (conserved), stages that protect less as it fills, Saturated, Gagging, Paranoid (marked visions, fair) and Hornet-nested (a hook), warning puffs, involuntary and controlled purges into the room without loops, a sniff and a look, rinsing and scrubbing at the washroom tub, the wrap, cloth and goggles as an opt-in mapping, and eruption residue, all opt-in and unused by the campaign: [13-beard-saturation.md](13-beard-saturation.md). The benefits that need other systems (repelling sharks, luring Agnes, the appraisal nose, crew keeping their distance), shaving, and the named gases are left to later prompts.

### S4. Crew AI and conditions

- **What:** a roster of stations, bunks and watch schedules (see `02-crew-audit.md`), plus conditions: tired, injured, gassed, mellow, panicked, confined. Morale comes from meals, rest and how the captain treats them. In crises the captain **assigns crew to stations**, and an assigned crew member slows a failing system or lends a stat to a repair. Special abilities: Pete (shark watch), Nell (Dead Center warning), Fennimore (cures conditions), Jory (cheaper repairs), Brask (cannon), Tilda (drills and buffs), Ledger (economy), Squawks (early warnings).
- **Extends:** `NpcBrain` `routine`, `placements.js` (story rows still win), the party system for Ledger and Tilda.
- **Failure:** neglected crew degrade (conditions, morale) and their stations fail first. They never leave the story.

### S5. Pressure systems (Brogath and generalised)

- **What:** generalise Brogath Stability into “pressure subjects” with triggers, calms, incidents and eruptions that feed Atmosphere and Ship Integrity:
  - **Brogath:** bashfulness. Flutter, praise, audiences and nearby characters move it.
  - **Garrick:** release pressure. The Grand Feast charge (Chapter 89), Suit puffs, Phase 8’s release uncertainty, and the emergency labour rule as a limited order.
  - **Vindicta and Thunderbottom:** spectral pressure that counts down to a legendary release.
- **Extends:** `stability.js` (“Nothing here is random”), `StabilityRunner.js`, `fartZone.js` (where eruptions are safe), the reassurance prompt.
- **Failure:** an eruption does real, recoverable damage: air, integrity, crew conditions. The story continues.
- **Built (Prompt 8):** pressure subjects for Brogath (an adapter over his Stability: one number, his triggers, calms and prompt) and Garrick (new: food, drink and ceremony, more control, what he holds seeping back), warning stages, the captain's interventions (reassure or settle, hold it in on the timing bar, a controlled release), and eruptions into the air, the room's openings and the hull, opt-in and unused by the campaign: [12-pressure-and-eruptions.md](12-pressure-and-eruptions.md). Vindicta, Thunderbottom, crew conditions and wiring the story's own releases (the Grand Feast, `garrick_release`) are left to later prompts.

### S6. Combat (see §4 for the decision)

- Field combat on the grid, grown from `FieldEnemy` and Shark Duty: telegraphed attacks, stepping out of the way, a tool swing (pole, cutlass, mop), a shove, stagger.
- Turn-based battles for bosses and party fights, using the existing engine.
- **Enemy families the story already contains:** bilge rats and nests, deck crabs, sharks on deck and at the rail, falling sharks (impact shadows), hornets, animated bedding (the roaring pillow, Chapters 129 and 178), royal marines (Chapter 8), spectral customers, the megalodon, the Bling Bling King.

### S7. Equipment and progression

- **Slots:** weapon or tool, body, feet, accessory, plus **head and face** for the protective gear the story already gives out. Gear changes exposure, timing-bar zones, carry speed and field-combat stats.
- **XP:** from every challenge outcome (S0), not just battles. Abilities through the existing party ability lists.
- **Extends:** `src/systems/party/equipment.js`, `EQUIPMENT_SLOTS`, `data/items/equipment.json`, `SKILL_STATS`.

### S8. Resources and economy

- **Materials:** planks, rope, sashes (300 indestructible ones from Chapter 106), sailcloth.
- **Food:** galley meals for morale (Chapters 75, 89, 125).
- **Frog Grog:** a consumable with side effects, and the Chapter 25 barrel count as a stock.
- **Currency:** doubloons, and the absurd Grand Currency economy (tokens, conversions, credit, the bank) as a real trading layer whose comedy is that it is worthless and yet strictly enforced.
- **Extends:** `inventory`, `bank.js`, `credit.js`, `conversions.json`, Quill and Penhallow as the people you deal with.
- **Built (Prompt 10):** the materials and food the overhaul spends, made visible and obtainable: resource classes over the one inventory, places in the rooms to search, salvage and scavenge (two bounded recoveries so a repair material can always be had again, on every difficulty), the ship's stores in the hold, the wrap, cloth, goggles and Bob's Pot worn by hand, timed food and draught effects, a grog tot taken with Frog Grog's ward by the smaller (Frog Grog itself unchanged), and four story foods cooked at the galley stove on the timing bar, all opt-in and unused by the campaign: [14-resources-and-cooking.md](14-resources-and-cooking.md). Sashes as a material, meals for crew morale, the barrel count as a stock, and the currency layer (merchants, the Grand Bank) are left to later prompts.

### S9. Persistent consequences

- **What:** a consequence ledger of story values (ship damage carried, crew dazed, Squawks’s feathers, treasure value, evidence strength, morale) that later chapters read for variants and difficulty. It **never gates mandatory story**: consequences change cost, dialogue variants and difficulty, not whether a chapter can be completed.
- **Extends:** existing story values and `variants` on NPCs and dialogue.
- **Built (Prompt 11):** a ledger beside the story values rather than inside them (they stay the story's): eight data-defined consequences (penalties, advantages, narrative records) with severity levels, stacking, caps, clocks on the hazard clock and chapter milestones, opposites and recurrence; bounded modifiers fed through the one place each system resolves its numbers (a ship bar's green, work, repairs, a bill, pumping); recovery through rest, meals and maintenance where the player can reach; challenge outcome tables; save v24; the Captain's Journal; and the validator rule this section asked for: a consequence condition on anything that starts a chapter, opens a door, places a person or moves a main quest is refused. No chapter uses it yet: [15-consequences-and-recovery.md](15-consequences-and-recovery.md).

### S10. Checkpoints, failure and assists

- **Checkpoints:** an autosave at chapter start and at each challenge start (S0). Retry from the challenge in under 3 seconds.
- **Assists:** opt-in, never forced, on every difficulty (Deckhand / Captain / Brutal). Today’s automatic bar widening stays on legacy bars and becomes the opt-in “classic bar” assist for strict ones, next to a timing assist. (Decided in Prompt 4: [08-difficulty-and-accessibility.md](08-difficulty-and-accessibility.md).)
- **Softlock guard:** a validator rule that every `fail` path leads back to a playable state, plus a headless “fail first, then succeed” mode in the story harness.

## 4. Combat direction (needs your decision)

| Option | What it means | Fit |
|---|---|---|
| **A. Hybrid (recommended)** | Real-time field combat on the 16 px grid for ordinary threats (rats, crabs, sharks, hornets, boarders); turn-based battles with timed hits for bosses and party fights | Extends both existing systems; keeps the RPG party (Ledger, Tilda); retro-port friendly |
| B. Turn-based only | Deepen the existing battle engine; field enemies stay as encounter triggers | Least risk, least “action” |
| C. Real-time only | Replace battles with action combat | Throws away the battle engine and party design |

Option A is assumed by the roadmap. Prompts 2–5 (shared mechanics) do not depend on this choice; it is needed before the combat prompts (`05-overhaul-roadmap.md`, group 4).

## 5. Difficulty principles

1. **Demanding, sometimes ruthless, always fair.** Every danger is telegraphed (shadows, fins, rumbles, a plank going cold), and damage is avoidable with skill or preparation.
2. **Deterministic patterns.** Like Brogath Stability, challenges follow learnable rules. Randomness picks between telegraphed patterns; it never decides outcomes.
3. **Fail fast, retry fast, keep the cost.** Failure costs time, resources, integrity or crew condition, never progress through the story.
4. **No dead ends.** Consequences persist and change difficulty, but every chapter stays completable.
5. **Variety over QTEs.** At most one timing-bar sequence per chapter unless the chapter is about it. Rotate verbs: escort, carry, route air, fortify, stealth, chase, navigate, manage, fight.
6. **Protect the quiet beats.** 88 chapters are marked as quiet beats in the inventory and keep their pacing.
7. **The comedy is the mechanic.** Fart blasts are hazards with real physics, Grand Tokens are a real economy, bureaucracy is a real puzzle. Jokes are never cut to make room for gameplay.

**Proposed curve:**

| Phase(s) | New verbs | Peak challenge |
|---|---|---|
| Prologue | move, shove, carry, swing, repair | Rat nest |
| 2 | evacuate, route air, haul | Chapter 4 evacuation; Chapter 8 frigate |
| 3–4 | ship survey, beard, Shark Duty | Phase 4 Shark Duty sessions |
| 5–7 | crew stations, storm deck, fire | The Great Sharkstorm |
| 8–9 | stealth, scouting, landing, exploration, fortify | Reef run; Fire in the Hole |
| 10–12 | cooking, escort, helm under pressure, endurance | The Wrong Way (Chapter 92) |
| 13 | hallucination statuses | Brogath Command Crisis |
| 14–16 | pressure management, procedures, economy | The Apology Eruption; Vindicta |
| 17 | party combat, lure and countdown rescues | Coffin Sock Catastrophe |
| Endgame | everything | The five open quests (Sharkstorm escape, Bling Bling King, Crimson Fortune, Greyhook) |

## 6. Technical risks and how to avoid regressions

| Risk | Detail (measured) | Mitigation |
|---|---|---|
| Save compatibility | Save v17 with migrations; new values (integrity, saturation, conditions) need defaults | Bump the version per system; migration gives neutral defaults; fixture saves from each phase preset tested on load |
| Flags and event order | 1,906 declared flags, 1,785 set by chapters, **1,204 read by world data** (rooms, NPC dialogue, triggers) | No flag renamed or removed; new systems read flags but write new values; the quest-order and story tests stay green |
| NPC movement after layout changes | 4,968 first-match placement rows; live restaging | Roster defaults below story rows; placement snapshot test at all 17 presets |
| Triggers tied to coordinates | 801 inspectables, 43 triggers, 143 coordinate spawns, 190 coordinate moves, 82 camera steps | Freeze door tiles; coordinate reference index; named anchors (see `03-ship-layout-audit.md`) |
| Scripted object references | Quests, story walkers and E2E tests address objects by id | Keep ids when relocating; the validator already checks references |
| Persistent vs chapter objects | 219 story props never retired in the main rooms | Lifetime classes and the `propConditions` retirement mechanism |
| Tests and automation | 898 unit and story tests; story walkers assume every challenge succeeds | The harness gets an explicit “win” policy (the `autoTiming` debug flag already exists) and a “fail first” policy |
| Controller and input | Grid stepping, gamepad tested; no real-time combat input yet | Input buffering and a dedicated dodge action in `bindings.js`; E2E gamepad test extended |
| Performance | One 7.1 MB bundle; procedural art at boot; FPS not measured | Measure a frame-time baseline first (roadmap prompt 2); budget real-time AI per room; consider code-splitting the art |
| Shared-system conflicts | Fumes vs Atmosphere states vs haze; pressure → air; crew schedules vs story rows; the timing bar shared by repairs and Shark Duty | One owner per value (Atmosphere owns air; pressure systems emit events into it); integration tests per pair |
| Engine and portability | Phaser 4; rules engine-independent; deterministic RNG; `RETRO_PORT_NOTES.md` | Keep new rules in `src/systems/`, integer math, data tables; no physics engine |

**Regression strategy:** one system per prompt, behind data (a chapter opts in), so unconverted chapters behave exactly as today. Every prompt runs the full Vitest suite, the build and the E2E smoke tests. Each group ends with the full E2E story suite.

Source paths: `src/systems/repairKinds.js`, `src/scenes/OverlayScene.js` (timing bar, `SKILL_STATS`, `SKILL_XP`), `src/systems/hazards/` (fumes, deadCenter, sharkDuty, sharks, sharkstorm, alarms, hornets), `src/systems/atmosphere.js`, `src/systems/beard.js`, `src/systems/stability.js`, `src/systems/fartZone.js`, `src/systems/proceedings.js`, `src/systems/tension.js`, `src/systems/battle/`, `src/world/FieldEnemy.js`, `src/world/SharkDuty.js`, `src/systems/party/`, `src/systems/save/`, `src/systems/settings/Settings.js`, `src/platform/input/`, `data/encounters/`, `data/enemies/`, `data/items/`.
