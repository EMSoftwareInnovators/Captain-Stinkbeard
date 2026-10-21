# 08 · Difficulty modes and accessibility assists (Prompt 4)

Prompt 4 added three difficulty modes, accessibility assists for timing, and the settings and menus to choose them, on top of the challenge system from Prompt 3 ([07-challenge-outcomes.md](07-challenge-outcomes.md)). There is still one challenge system: difficulty is one more layer in how a challenge's config is resolved, and assists are one more layer on each attempt.

**No existing chapter has opted in, and none was opted in here.** Difficulty only reaches challenges that opted in, so today it changes nothing in the 223 chapters. The menus say so plainly: "Only challenges rebuilt so far follow it. The rest of the voyage plays as it always has, for now." The one exception is the timing assist, an accommodation the player turns on: it eases every timing bar and sash trial, legacy ones included (see "Assists").

| | Implemented now | Waiting for campaign prompts (35–53) |
|---|---|---|
| Difficulty presets, per-difficulty rules in profiles and challenges, validation on every difficulty | yes | each chapter opting its challenges in, with per-difficulty stakes |
| Timing assist on every bar and sash trial; classic bar on strict bars | yes | – |
| The choice before a new game, the Options panel, persistence | yes | – |
| Records that say which rules and assists were in force | yes | balance passes reading them (Prompts 34, 60) |
| Difficulty for battles, the teller window, field combat, Atmosphere | no | each system's own prompt, through the same layers (Ship Integrity got it in Prompt 5: the presets' `ship` block, [09-ship-integrity.md](09-ship-integrity.md)) |

## The three difficulties

| | Deckhand · Forgiving | Captain · Challenging (default) | Brutal · Expert |
|---|---|---|---|
| Who it's for | the story and the crew | the voyage as meant | old salts |
| Timing bar (preset) | green +8 px, marker ×0.85 | as written | green −6 px, marker ×1.15 |
| Sash tension (preset) | band +5 each side, 0.6 s more grace, sway ×0.85 | as written | band −3 each side, 0.4 s less grace, sway ×1.15 |
| Shark Duty (preset) | sharks wait ×1.3 longer | as written | sharks wait ×0.85 as long |
| Stakes (shared profiles) | more fumbles, slips and bites allowed; unlimited tries; softer success thresholds; lighter costs | the profile as written | fewer mistakes allowed; fewer tries, shorter clocks; tears sooner, tired hands; heavier costs |

The preset rows come from `data/difficulty/presets.json`. The stakes come from each shared profile's `difficulty` blocks (`data/challenges/profiles.json`) and from any challenge's own blocks:

| Profile | Deckhand | Captain | Brutal |
|---|---|---|---|
| `repair_graded` | one fumble is still a success; easier grades | A 100 / B 66 / C | A 100 / B 90 / C |
| `repair_strict` | 4 fumbles; ≤ 1 fumble is a success | 2 fumbles | 1 fumble |
| `repair_hard_choice` | 5 fumbles, 22 s, unlimited tries | 3 fumbles, 15 s, 3 tries | 2 fumbles, 12 s, 2 tries |
| `shark_duty_strict` | 6 bites | 3 bites | 1 bite, 2 failed shoves |
| `sash_trial_strict` | 4 slips, tears at 99 for 1.2 s | 2 slips, 97 for 0.9 s | 1 slip, 94 for 0.7 s, hands tire (grip) |
| `sash_deliberate_flutter` | 5 slips | 3 slips | 1 slip |

**Deckhand is not "skip the challenge".** Its challenges still fail when they are played badly: `repair_strict` still has a fumble limit, a sash still tears if it is yanked. A profile or challenge may turn failure off for Deckhand (`"difficulty": { "deckhand": { "failure": false } }`), but only when the chapter decides so.

**Brutal is hard, never unfair.** Every shipped profile is validated, and played by the test bots, on every difficulty with the weakest leader stat: a perfect hand always wins. The hardest shark on an opted-in watch must leave at least 3 s to reach the rail. Brutal has no permadeath, no random unavoidable failure and no softlock; the softlock rules from 07 apply to every difficulty separately.

## Configuration precedence

A challenge's config is resolved in layers, each later one winning (`challengeConfig` in `src/systems/challenge/config.js`). It is deterministic: the same spec, profile, difficulty and data always give the same config.

| # | Layer | Where | What it can set |
|---|---|---|---|
| 1 | Engine defaults | the kind (`src/systems/challenge/kinds.js`) and the mechanic's own numbers (the step's `zone`/`speed`, the tension def's band) | everything, as the neutral starting point |
| 2 | Difficulty preset | `data/difficulty/presets.json`, `challenges.<kind>` | only the kind's **feel**, as bounded adjustments (`TUNING`) |
| 3 | Shared profile | `data/challenges/profiles.json`, then the profile's `difficulty.<id>` block | any field; the block only the **stakes** |
| 4 | The challenge | the step's (or duty entry's) `challenge`, then its `difficulty.<id>` block | any field; the block only the **stakes** |
| 5 | Accessibility assists | `data/difficulty/assists.json`, per attempt | only easier timing (`ASSIST_TUNING`); never limits, rules or outcomes |

**Feel and stakes.**

- *Feel* (layer 2): `repair` `zoneAdd` (−10..12 px) and `speedScale` (0.7..1.4); `sashTension` `tolerance` (−6..10 points each side), `graceAdd` (−0.8..1.2 s) and `swayScale` (0.6..1.4); `sharkDuty` `reactionScale` (0.6..1.6). These are adjustments to the mechanic's own numbers, never absolute values, and never a new limit: a preset can't give a fumble limit to a challenge that has none.
- *Stakes* (a `difficulty` block): `failure`, `mechanics` (limits such as `maxFumbles`, `timeLimit`, `maxSlips`, `grip`, `breakAt`, `maxBites`, `maxMissed`, `sectionBites`, and the feel keys), `outcomes` (success and partial thresholds), `score`, `grades`, `retry` (attempts, policy), `onFailure` (costs, consequences, carry-on, must-retry) and `onPartial`.
- *Never per difficulty*: `id`, `kind`, `profile`, `label`, `intent`, `keep`, `checkpoint`, `announce`, `assists`. The objective is the same on every difficulty: a deliberate sash sabotage is a sabotage on Deckhand and on Brutal, and a difficulty can't change what a retry restores.

**Merging rules.**

- Plain objects merge key by key; arrays (costs, consequences, grades) and `outcomes` are replaced whole, so two halves of different rules never mix.
- In `mechanics`, an absolute number replaces a lower layer's adjustment to the same quantity (the kind's `pairs`): a challenge's `"zone": 30` drops Brutal's `zoneAdd`; a challenge's own `zoneAdd` replaces the preset's.
- An unknown difficulty resolves as Captain.

Worked example (`repair_strict` on a 3-strike hull patch, default speed and green):

| | Deckhand | Captain | Brutal |
|---|---|---|---|
| layer 2 | `zoneAdd 8`, `speedScale 0.85` | – | `zoneAdd −6`, `speedScale 1.15` |
| layer 3 | `maxFumbles 4`; success `fumbles ≤ 1` | `maxFumbles 2`; success `fumbles 0` | `maxFumbles 1` |
| bar | 34 px green, 127.5 px/s | 26 px, 150 px/s | 20 px, 172.5 px/s |
| + strong assist | 42 px, 89 px/s | 34 px, 105 px/s | 28 px, 121 px/s |

(The leader's stat then widens the green and slows the marker, as it always has, between layers 4 and 5.)

## Accessibility assists

Assists are separate from difficulty. Any combination is allowed (Brutal with the strong timing assist is fine), and an assist never decides an outcome: fumbles and slips still count, and the record lists every assist that helped.

| Option | Levels | Effect |
|---|---|---|
| **Timing assist** | Off · Light · Strong | Timing bar: marker ×0.85 / ×0.7, green +4 / +8 px, clock ×1.25 / ×1.5. Sash tension: band +3 / +6 points each side, grace +0.4 / +0.8 s, sway ×0.9 / ×0.75. Both: readable cues (below) |
| **Classic bar** | Off · On | Strict timing bars help after a miss, like the old bar: the green widens (×1.6) after one miss in a row and steadies (the whole bar) after two |

**Cues** (Light and Strong): the timing bar marks the green's edges with ticks above the bar, the marker stands taller while it is over the green, and each strike is named ("Clean hit! 2 of 3"). The sash tension shows a word under the meter: PULL, HOLD or EASE. None of it depends on colour alone.

**The timing assist and legacy content.** It eases legacy bars and the legacy sash trial too (they are timing interactions, and the player asked for help with timing). It changes only their pace and cues, never their rules: a legacy bar still can't fail and still widens and steadies as it always has, and no record is made. With it Off (the default) every legacy bar and trial is exactly the old one. The one story effect: Chapter 13's hull patch says something different for 4 clean strikes, and an assisted player gets those more easily.

**The classic bar and strict challenges.**

- **Timing evaluation:** unchanged. A strike lands only on the (possibly widened) green.
- **Fumble limits:** unchanged. Every fumble counts toward `maxFumbles`, so a challenge with one fumble allowed still fails on the second, and the fumbling hand still fails `repair_strict` on every difficulty.
- **Outcomes:** an attempt it helped reports `assisted: true` and its real fumble count, so `success: { fumbles: 0 }` is out of reach after any fumble (it is a partial). A forgiving challenge that wants assisted attempts to count as success says so in its own rules (`"success": { "any": [{ "fumbles": 0 }, { "assisted": true }] }`); nothing does that silently.
- **Where it applies:** strict bars only. Legacy and graded bars are classic already. A challenge may refuse it (`"assists": { "classic": false }`), and a challenge's own `mechanics.assist` stands instead of it.
- **Shark Duty:** its shoves are timing bars, so each shove takes the assists as it opens; the watch itself has no timing to assist.

The assist numbers are data (`data/difficulty/assists.json`), validated to only ever ease. A slower marker always gets at least the extra time it needs: `timeScale ≥ 1 / speedScale`.

**Kept as they were:** keyboard remapping (bindings), pad layouts and the controller setup, screen shake, reduced effects, the fume hazard option, the readable text and focus cursor of every panel.

## Choosing and changing

- **New Game** opens *Choose your difficulty*: Deckhand / Captain / Brutal, each with its tagline. Captain is marked "(default)" and highlighted on every new game, whatever was played last. Up/Down chooses, Confirm sets sail, Cancel goes back to the title menu.
- **Options** (from the title and the pause menu) has a first row, *Difficulty*, showing the current one ("Brutal + assist" when an assist is on). Confirm opens *Difficulty and assists*: Difficulty, Timing assist and Classic bar, Left/Right to change, with a description of the highlighted value. Nothing is shown on the HUD.
- **Controls.** Keyboard and pad only. The press that opens a panel never counts inside it, and the first 150 ms ignore Confirm and Cancel. Each panel closes once (no second callback). Every text was measured with the real fonts at 320×224 (`tests/textfit.test.js`).

**Changing difficulty mid-game** is allowed whenever the Options can be opened:

- **The difficulty is fixed per challenge.** It is resolved when the challenge starts, and its rules (limits, thresholds, retries, costs, consequences) hold for every attempt and retry of that challenge. A change applies from the next challenge. So a change can't bypass a pending retry, change what a failure costs, or give an inconsistent record.
- **Assists are read per attempt.** An assist turned on between attempts helps the next attempt, and that attempt's history line says so.
- **When it matters.** The only challenge that can be in progress while the Options are open is an opted-in Shark Duty watch (the captain has control during one). The panel then says "A challenge is under way: a new difficulty applies to the next one, an assist to the next try." Timing bars and the sash trial are modal, so nothing can change during them.

## Persistence and saves

- **Where.** The three preferences are options, saved with the others in the device's settings (`captain-stinkbeard.settings`; `difficulty`, `timingAssist`, `classicBar` in `src/systems/settings/Settings.js`). They survive closing and reopening the game. The choice before a new game writes `difficulty` there.
- **Not in saves.** Save files hold no preference. **The save version stayed 17** in this prompt and no migration was needed (Prompt 5 moved it to 18 for the ship's condition; still no preference in it): every existing save loads as it is and plays on the device's current difficulty. This follows the fume hazard option, the existing accessibility setting, which is also per device.
- **Defaults.** Options stored before Prompt 4 have no difficulty: they load as Captain, Timing assist Off, Classic bar Off. An unknown or damaged value falls back to the same defaults.
- **Nothing rewrites progress.** Preferences live outside the session, so changing one never touches story progress and is never captured or restored by a checkpoint. A retry can't undo a difficulty change, and a difficulty change can't undo a retry.
- **Trade-off.** Two save slots on one device share a difficulty. Binding a difficulty to a playthrough would need a save field (v18); no prompt needs it yet.

## Challenge results

Every record (07, "The challenge result contract") now also says which rules were in force. Everything stays per play, in `session.transient`, never saved, with history still capped at 10 lines.

| Field | Meaning |
|---|---|
| `difficulty` | the difficulty the challenge started on (fixed for the run) |
| `assists` | the assists that helped the latest attempt: `timingAssist:light`, `timingAssist:strong`, `classicBar` |
| `rules` | the resolved thresholds, in short: difficulty, failure, mechanics, outcome rules, retry, carry-on / must-retry, how many costs and consequences |
| `retried` | true once an attempt was a retry (`attempt` says how many) |
| `history[]` | per attempt: outcome, reason, score, `difficulty`, `assists` |
| `outcome`, `decision`, `consequences.applied` | as before: success / partial / failure, retry / continue / fallback, and which consequence lists ran (at the difficulty's severity) |

## How a future chapter specifies difficulty

1. **Start from a shared profile.** It has stakes for all three difficulties already, and the presets add the feel. That is usually enough.
2. **Override only what the chapter needs, per difficulty**, in the step's `challenge`:

   ```json
   { "repair": "hull", "strikes": 4, "var": "p41_clean",
     "challenge": {
       "profile": "repair_hard_choice", "id": "p41_breach",
       "onFailure": { "continue": true, "costs": [{ "takeItem": "planks" }], "consequences": [{ "addVar": "hull_damage", "value": 2 }] },
       "difficulty": {
         "deckhand": { "onFailure": { "costs": [] } },
         "brutal": { "mechanics": { "timeLimit": 13000 }, "onFailure": { "costs": [{ "takeItem": "planks", "count": 2 }], "consequences": [{ "addVar": "hull_damage", "value": 4 }] } }
       }
     },
     "outcomeValue": "p41_breach", "ifFailure": "breach_left_open" }
   ```

3. **Keep every difficulty finishable.** Each block is validated as its own config: a must-win challenge needs unlimited retries on every difficulty, a limited one needs `continue` on every difficulty, and every difficulty must be winnable.
4. **Use the stakes, not the objective.** Change limits, thresholds, tries, costs and consequences. Never change what the challenge is (the validator refuses `intent`, `id`, `keep` and `checkpoint` in a block).
5. **When the chapter's real failure rules go live**, the campaign prompt opts its steps in with a profile (or inline config), gives Deckhand and Brutal their stakes, and runs the checks below. Combat (Prompt 27), Ship Integrity (5) and Atmosphere (7) should add their own feel keys to `TUNING` and their kinds to the presets, so difficulty reaches them through the same layers.

## Validation

`npm run validate` (and `challengeProblems`) checks every step, duty entry and profile on **every difficulty**. A problem that only some difficulties have is prefixed with them ("[brutal] ..."). It rejects:

| Problem | Example message |
|---|---|
| Unknown difficulty | `unknown difficulty "nightmare" (use: deckhand, captain, brutal)` |
| A block changing the objective | `difficulty.brutal can't change "intent"` |
| Impossible timing windows | `[brutal] the green ("zone" 3px) is narrower than 8px` (with the weakest leader), or the marker crossing it in under 50 ms |
| Invalid durations | `[brutal] "timeLimit" 2000 ms is shorter than a perfect hand may need` |
| Contradictory retry rules | `[brutal] onFailure.mustRetry needs unlimited attempts`, `"mustRetry" and "continue" contradict each other`, limited tries without `continue` |
| Costs that aren't costs | `onFailure.costs: "giveGold" gives something`, `takeGold must be positive` |
| Unreachable partial thresholds | `outcomes.partial can never be reached` |
| No way to win | `[brutal] no attempt can end in success` |
| Failure that can't happen | `failure is enabled, but nothing can end an attempt as a failure (give it a limit: ...)` |
| Bad assist settings | `assists.classic must be true or false`, `unknown assists field` |
| Out-of-bounds tuning | `mechanics.zoneAdd must be a number from -10 to 12` |
| Bad difficulty or assist data | a missing preset, a second default, an unknown tuning key, an assist that would make timing harder, a slower marker without the time to match, a classic bar out of bounds |
| A shark too quick on some difficulty | `[brutal] the hardest shark bites after ... ms` (under 3000) |

**Reachability.** Each kind lists the ways an attempt can end ("endings": a completed bar, a bar out of fumbles, a bar out of time; a held trial, a deliberate early release, a lost grip, a tear; a watch finished or lost) as ranges of its metrics. A rule is reachable when some ending can satisfy it before an earlier rule must hold. The check leans towards "reachable", so it never rejects a config that works.

**Each objective separately.** A sash challenge is checked under its own intent: a sabotage needs `earlyRelease`, or it can never succeed; a trial needs a limit, or it can never fail.

## How to test difficulty variants

| Command | Runs |
|---|---|
| `npm run test:difficulty` | `tests/difficulty.test.js`: the 20 checks below, deterministic, against the real mechanics played by simulated hands |
| `npm run test:challenges` | the Prompt 3 contract tests (all still pass) |
| `npm run test:walkers:fail-once` | every phase walker with each repair and sash step failed once, on Captain |
| `npm run test:walkers:difficulty` | the same on Brutal and on Deckhand (`node tools/walk-challenges.mjs failOnce brutal`) |
| `npx playwright test e2e/difficulty.spec.js` | keyboard and pad selection, Options, persistence across a reload, the assist on a real bar, and a strict sash tension through the real close-up |

In the story harness: `makeStory({ prefs: { difficulty: 'brutal', timingAssist: 'strong', classicBar: true } })`, or `STORY_DIFFICULTY=brutal` (also `STORY_TIMING_ASSIST`, `STORY_CLASSIC_BAR=1`) for a whole run. `setPrefs(...)` changes them as the Options would, `playHands(...)` queues the hands for the next attempts, and `challengeAttempts[i].bar` shows the numbers each attempt was played with.

`tests/difficulty.test.js` covers, in order:

1. the presets;
2. Captain as the default;
3. persistence;
4. version 17 saves;
5. resolution and precedence;
6. timing per difficulty;
7. Shark Duty thresholds;
8. sash behaviour;
9. the timing assist with any difficulty;
10. the classic bar;
11. assists kept across difficulty changes;
12. changes during a challenge;
13. success;
14. partial;
15. failure, on every difficulty;
16. retries keep their rules;
17. the record's metadata;
18. invalid configs;
19. legacy behaviour.

The 20th check, phase snapshots, is `tests/regression.test.js` against the approved baseline (`npm run regress:compare`).

### What the walkers showed (fail once, then succeed, on each difficulty)

All 16 walker files (Phases 2–17, 505 tests) pass on Captain, Brutal and Deckhand. Every repair and sash-tension step met in a walk ran as a test challenge on that difficulty (its preset's feel applied, the record saying so), failed on its first attempt, and was won on the retry. Each run has the same 3,902 challenge runs, and every phase still finishes with its own assertions intact. The per-phase counts match 07's table on all three; the reports are written to `tmp/challenges/failOnce.md`, `failOnce-brutal.md` and `failOnce-deckhand.md`.

**The strict sash in the browser** (closing 07's gap): `e2e/difficulty.spec.js` adds a 6-second trial to the page's content at run time (no content file has it), and plays `sash_trial_strict` on Brutal: it lets the grip go, chooses "Try again", holds to the cue, and checks the record. It then plays `sash_deliberate_flutter` on Deckhand with the strong assist, letting go with Cancel, and checks that the cue words show. Nothing in the campaign opts in for it.

## Known limitations

- **Three mechanics.** Difficulty reaches what Prompt 3 put on the contract: the timing bar, the sash tension and Shark Duty. Battles, the teller window, proceedings and the rest have no difficulty yet. Each gets it when its kind joins the contract.
- **Shark Duty's watch is fixed when it starts.** It keeps its difficulty for the whole watch, retries included. Its shoves follow the assist at each shove. It is not walked headlessly (covered by `DutyWatch` simulations and the Prompt 3 browser test).
- **No difficulty condition in scripts.** A chapter can't yet branch dialogue or encounters on the difficulty outside a challenge. Add a condition (`{ "difficulty": "brutal" }`, read from the prefs, never saved) when a campaign prompt needs one.
- **Per device, not per save.** See "Persistence and saves".
- **The reachability check is approximate.** It treats metrics as independent within an ending, so it can miss a rule made impossible by two metrics together. It never rejects a working config. The bot tests cover the shipped profiles exactly.
- **No adjustable assist strength beyond the three levels**, and no separate "extended time only" option. Both are data in `assists.json` if a later accessibility pass (Prompt 61) wants them.
- **The 100-minute full browser suite was not run.** The smoke suite and the new and changed specs were (see the Prompt 4 report).
