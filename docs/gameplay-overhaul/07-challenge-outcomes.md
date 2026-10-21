# 07 · Challenge outcomes, checkpoints and retries (Prompt 3)

Prompt 3 made real failure technically possible without changing the campaign. Three mechanics can now fail for real once a step opts in: the timing bar, Shark Duty and the sash tension. A failed attempt reports a real failure and offers what the chapter allows: retry from a checkpoint, carry on with the consequences, or go back to an earlier checkpoint. The story always has a way forward.

**No existing chapter has opted in.** Every step in the 223 chapters is legacy and plays exactly as before:

- the timing bar still widens after three fumbles and steadies after five;
- Shark Duty still can't be lost;
- the sash trial is still caught for you.

A test scans the whole campaign for opt-ins (`tests/challenges.test.js`, "13"). Every phase snapshot is unchanged, and the production build changes only by the new code.

## The pieces

| File | What it does |
|---|---|
| `src/systems/challenge/outcome.js` | The vocabulary (`success`, `partial`, `failure`, `unsupported`), the run states, rule evaluation, grades and the record |
| `src/systems/challenge/config.js` | Turns a step's `challenge` (a profile id or an object) into a full config; `challengeProblems` lists everything wrong with one, including the softlock rules |
| `src/systems/challenge/checkpoint.js` | Captures and restores checkpoints; diffs two states in story terms |
| `src/systems/challenge/runner.js` | `ChallengeRun` (one challenge from checkpoint to outcome), `runChallenge` (the attempt loop), `ChallengeLog` (per-play bookkeeping) |
| `src/systems/challenge/kinds.js` | What each wired mechanic can report, measure and be tuned by |
| `src/systems/challenge/rng.js` | Seeded randomness: every attempt is reproducible |
| `src/systems/timingBar.js` | The timing bar's rules (legacy and strict), extracted from `OverlayScene`; the overlay now only draws them |
| `src/systems/tension.js` | The sash tension's rules, with an optional `strict` block and `tensionResult` |
| `src/systems/hazards/sharkDuty.js` | `DutyWatch`: a watch's score and limits |
| `src/world/SharkDuty.js` | Runs a duty's challenge in the world (fail, prompt, retry from the watch's start) |
| `src/systems/script/commands.js` | `repair` and `sashTension` take `challenge`; the new `checkpoint` command |
| `src/scenes/OverlayScene.js`, `src/ui/SashTensionView.js` | Strict-mode display (fumbles or seconds left, grip, "let it go"), the outcome prompt, the result toast |
| `data/challenges/profiles.json` | Shared profiles. No chapter uses them yet |

## The challenge result contract

Every challenge run produces a **record** (`createRecord`). Each one is logged per play in `session.transient.challengeLog` and announced on the bus as `challenge:resolved`.

| Field | Meaning |
|---|---|
| `id`, `kind` | The challenge (a stable id from the config, else `<script>/<kind>`) and its mechanic |
| `chapter`, `event`, `script` | The chapter (the script id's prefix, e.g. `p12c4`) and the story event (the script, or `sharkDuty:<session>`) |
| `enabled`, `failureEnabled`, `legacy` | Whether it opted in, and whether real failure is on (`failure: false` gives a graded challenge that can't fail) |
| `attempt`, `maxAttempts` | This attempt's number; the limit (`null` for unlimited) |
| `state` | `ready` → `running` → `awaiting` (failed, waiting for the player's decision) → `resolved` |
| `outcome` | `success`, `partial`, `failure`, or `unsupported` when a rule asks for an outcome the mechanic can't produce. It is never faked |
| `score`, `grade` | The configured `score` metric and its grade |
| `metrics` | Everything the mechanic measured (below) |
| `reason` | Why it failed: `fumbles`, `time`, `bites`, `section:<id>`, `missed`, `lost`, `torn`, `deliberate`, `held` |
| `narrative`, `intent`, `cause` | The sash tension: the ceremony's view (`completed`, `broken` or `torn`; early or not), the captain's objective, and `deliberate` or `accident` |
| `retryAvailable`, `options` | The ways forward after this failure |
| `checkpoint` | The id of the checkpoint the run restores to |
| `decision`, `accepted` | `retry`, `continue`, `fallback` or `abandoned`; `accepted` when the player carried on after a failure |
| `consequences` | How many costs were charged, and which consequence lists ran |
| `transitions` | What the whole challenge changed in story terms: flags set and cleared, vars and values, quest statuses, items, gold |
| `history` | One line per attempt (outcome, reason, score), the last 10 kept |

### What each mechanic measures

| Kind | Metrics |
|---|---|
| `repair` (timing bar) | `completed`, `strikes`, `done`, `clean`, `fumbles`, `lucky`, `assisted`, `elapsed`, `accuracy` |
| `sashTension` | `completed`, `early`, `released`, `deliberate`, `accidental`, `torn`, `fluttered`, `ceremony`, `cause`, `slips`, `seconds`, `grip` |
| `sharkDuty` | `completed`, `repelled`, `bites`, `missed`, `patched`, `elapsed`, `worstSection` |

### Rules and partial outcomes

Outcomes come from rules over the metrics. Each rule is checked in order: **failure first, then success, then partial**. When none holds, `fallback` decides (`partial` by default).

```json
"outcomes": {
  "failure": { "completed": false },
  "success": { "fumbles": 0 },
  "partial": { "any": [{ "fumbles": { "lte": 2 } }, { "assisted": true }] },
  "fallback": "partial"
}
```

- **The comparisons:** `eq`, `ne`, `lt`, `lte`, `gt`, `gte` and `in`. `any` and `all` combine rules.
- **The usual pattern:** failure means the job wasn't done; success means it was done cleanly; partial means done, but worse.
- **A partial is not free.** `onPartial.consequences` runs, and the step's `ifPartial` branch can say what it cost (more supplies, a rougher patch, damage left behind).

The validator checks that every metric a rule reads is one the kind measures, and that every comparison is known.

## Opting a step in

```json
{ "repair": "hull", "strikes": 3, "var": "p99_clean",
  "challenge": { "profile": "repair_strict", "id": "p99_breach_patch", "mechanics": { "maxFumbles": 1 } },
  "outcomeValue": "p99_breach",
  "ifSuccess": [ ... ], "ifPartial": [ ... ], "ifFailure": "node_label" }
```

- **`challenge`:** a profile id from `data/challenges`, or an object (with an optional `profile` to start from). The object's fields override the profile's. `outcomes` replaces the profile's rules whole, so two halves of different rules never mix.
- **`outcomeValue`:** the outcome is written to a story value, for later chapters to read.
- **`ifSuccess`, `ifPartial`, `ifFailure`:** steps, or a node label, run after the final outcome. Only steps that opt in may use these four, so a legacy step can't pretend to branch.
- **`var` and `releasedVar`:** keep their meaning (the final attempt's clean strikes or slips, and whether the release was the captain's own).

A Shark Duty watch opts in through its map entry, or through its session in `data/hazards/shark_duty.json`:

```json
"sharkDuty": [{ "if": { "objectiveActive": "shark_duty.repel" }, "session": "first_watch", "challenge": "shark_duty_strict" }]
```

### The configuration

```json
{
  "failure": true,
  "mechanics": { "maxFumbles": 2, "timeLimit": 15000 },
  "intent": "complete",
  "outcomes": { ... }, "score": "accuracy", "grades": [{ "min": 100, "grade": "A" }],
  "retry": { "policy": "offer", "maxAttempts": null, "restore": true },
  "onFailure": {
    "mustRetry": false,
    "continue": true,
    "prompt": true,
    "costs": [ { "takeItem": "planks" } ],
    "consequences": [ { "addVar": "hull_damage", "value": 2 } ],
    "fallback": "p99_before_breach"
  },
  "onPartial": { "consequences": [ ... ] },
  "keep": { "flags": [], "vars": [], "values": [] },
  "checkpoint": true,
  "announce": false
}
```

| Field | Meaning |
|---|---|
| `failure` | Real failure on. With `false`, the mechanic stays in legacy mode (it can't fail) but is still judged and graded |
| `mechanics` | The kind's difficulty settings. Timing bar: `maxFumbles`, `timeLimit`, `assist`, `zone`, `speed`. Sash: `maxSlips`, `grip`, `breakAt`, `earlyRelease`. Duty: `maxBites`, `sectionBites`, `maxMissed`, `timeLimit`, `shove` |
| `retry.policy` | `offer` (ask), `auto` (retry straight away; a boss that must be beaten), `none` |
| `retry.maxAttempts` | `null` for unlimited |
| `retry.restore` | Restore the checkpoint before a retry |
| `onFailure.mustRetry` | The story can't go on until this is won |
| `onFailure.continue` | Offer "Carry on", which runs `consequences` and lets the story continue under worse conditions |
| `onFailure.costs` | Paid on every failure and **not** undone by a retry: they are re-applied after each restore |
| `onFailure.consequences` | Run only when the player carries on |
| `onFailure.fallback` | Offer going back to a named sequence checkpoint |
| `onFailure.prompt` | `false` decides without asking (retry if possible, else carry on) |
| `keep` | Flags, vars and values that survive a restore (a counter of tries, something learned) |
| `announce` | Show a short result toast on success or partial |

### Profiles (`data/challenges/profiles.json`)

| Profile | Kind | What it is |
|---|---|---|
| `repair_graded` | repair | Can't fail; graded A–C on clean strikes |
| `repair_strict` | repair | No widening, two fumbles allowed, must be won (unlimited retries) |
| `repair_hard_choice` | repair | Three tries against a 15 s clock; after any failure, carrying on is allowed |
| `shark_duty_strict` | sharkDuty | More than three bites loses the watch; retry from the watch's start |
| `sash_trial_strict` | sashTension | `intent: complete`. Three slips or a tear breaks the trial |
| `sash_deliberate_flutter` | sashTension | `intent: sabotage`. Letting go early on purpose is the goal |

## Supported challenge states

| State | Entered when | Left when |
|---|---|---|
| `ready` | The run is created | `begin()`: the checkpoint is taken, attempt 1 starts |
| `running` | An attempt starts | The mechanic reports its metrics |
| `awaiting` | The attempt failed and failure is enabled | The player (or `autoDecision`) picks retry, carry on or go back |
| `resolved` | Success, partial, carry on, go back, or abandoned | Never. The checkpoint is let go and the record is logged |

## Checkpoints and retries

**What a checkpoint holds.** The session's persistent state, exactly what a save holds:

- story flags, vars and values;
- quests and objective progress;
- inventory and gold;
- the party (levels, HP, equipment, abilities);
- world objects opened, beaten or marked;
- the captain's map, tile and facing.

It also holds the per-play hazards a save leaves out (fume exposure). It is captured with `session.serialize()` and deep-copied, so a restore is never less consistent than loading a save. Domains can be narrowed (`checkpoint.domains`).

**What restore does.**
- It loads each captured domain back, then re-applies what `keep` names.
- It announces `session:restored`. The world then:
  - restages NPC placements, story props and triggers from the restored story;
  - puts the captain back on the checkpoint's tile (same room, tile free);
  - stops him walking;
  - consumes every held input, so nothing leaks into the next attempt.

**What a retry re-runs.** Only the attempt. The steps before the challenge (dialogue, walking, a scripted spawn) are not run again, so nobody is spawned twice and no reward is given twice.

- Something an attempt gave (items, gold, XP for clean work, quest progress, a flag that shows a prop) is rolled back by the restore, and given again only by the attempt that keeps it.
- Shark Duty clears its sharks and patches, starts a new schedule and a new score, and restores the objective's count and `duty_bites` to the watch's start.

**Random state.** Each attempt's random choices (the green's position, gusts) come from `attemptSeed(id, attempt)`. A retry is a fresh attempt that can be reproduced exactly. Legacy steps keep `Math.random`.

**Going back further.** A sequence can drop a named checkpoint: `{ "checkpoint": "p99_before_breach", "resume": "breach", "label": "the breach" }`. A later challenge in the **same script and room** whose `onFailure.fallback` names it offers "Go back: the breach". That restores the checkpoint and resumes the script at the `resume` node. The option is offered only when it can really work; there is no reload from a save slot. The last 4 named checkpoints are kept, per play only.

**Retrying is not erasing.** Costs (`onFailure.costs`) survive every restore, and `keep` lets a chapter remember a failure. A later chapter can therefore let the player try again and still pay for each failure, or accept the failure and live with the consequences.

## Legacy fail-soft and the new difficult behavior

| | Legacy (every existing step) | Opted in |
|---|---|---|
| Timing bar | Widens after 3 fumbles, steadies after 5; can't fail; Math.random green | No assists unless `mechanics.assist`; `maxFumbles` or `timeLimit` end the attempt as a failure; seeded green |
| Sash tension | Out of the band too long, it's caught for you (a slip); the trial always reaches the cue | `maxSlips`, `grip` and `breakAt` end it early (`lost`, `torn`); `earlyRelease` lets Cancel let go on purpose |
| Shark Duty | Bites leave patches; nothing can be lost | `DutyWatch` limits lose the watch; with `shove`, each shove is a strict bar and a failed shove leaves the shark |
| Result | `var` / `releasedVar` as always; no record, no prompt, no toast | Record, prompt after a failure, optional toast, `outcomeValue`, the `if*` branches |

Legacy completion is never read as failure. A legacy step doesn't create a run or a record at all: it takes exactly the old code path.

### The sash tension: the ceremony and the captain's intent

The trial's two questions get two answers:

- **What the ceremony saw:** `completed` (held to the cue, then let go), `broken` (it fluttered early) or `torn`.
- **Whether the captain meant it:** `deliberate` or `accident`.

The `intent` decides which outcome that is:

| What happened | Ceremony | Cause | `intent: complete` | `intent: sabotage` |
|---|---|---|---|---|
| Held to the cue, let go | completed | deliberate | **success** (partial with slips) | failure |
| Held to the cue, hands slipped | completed | accident | partial | failure |
| Let go early with Cancel | broken | deliberate | failure | **success** |
| Lost the grip (slips, tired hands) | broken | accident | failure | partial |
| Pulled too tight too long | torn | accident | failure | failure |

## How future chapters opt into genuine failure

1. **Pick a profile, or write the config inline.** Give it a stable `id`.
2. **Decide what failure means for the story.**
   - Must it be won (`mustRetry`)?
   - Can the player carry on (`continue` plus `consequences`)?
   - Does every failure cost something (`costs`)?
   - Should something survive a retry (`keep`)?
3. **Write the outcome branches** (`ifSuccess`, `ifPartial`, `ifFailure`) so every outcome reaches the chapter's mandatory beats.
4. **Run the checks.**
   - `npm run validate`: the softlock rules.
   - `npm run test:challenges`.
   - The chapter's walker under each policy (`npm run test:walkers:fail-once`).
   - `npm run regress`. The challenge registry's `optedIn` count changes, so approve it with the chapter named.

## Rules for avoiding softlocks and save corruption

The validator enforces these, on steps, map duty entries and profiles:

- **Failure needs a rule.** Failure enabled needs an `outcomes.failure` rule.
- **A must-win challenge needs unlimited retries.** `mustRetry` with `maxAttempts`, or with retry policy `none`, is rejected.
- **Attempts that can run out need an exit.** With a `maxAttempts` limit or retry policy `none`, `continue` must be true.
- **A must-win challenge can't also offer carry-on.** `mustRetry` with `continue` is rejected.
- **Restore needs a checkpoint.** `retry.restore` with `checkpoint: false` is rejected.
- **The challenge must be winnable.**
  - Timing bar: the green is at least 8 px wide, a perfect hand gets 50 ms or more to see it at the marker's fastest, and `timeLimit` covers a perfect hand's worst case (`timingBarProblems`).
  - Sash tension: the grip must be able to recover, and the tear point must sit above any band.
  - Shark Duty: a clock under 30 s is refused.
- **Names must be real.** Unknown fields, metrics, comparisons, mechanics or intents are errors.
- **Branches need an opt-in.** `outcomeValue` and the `if*` branches on a legacy step are errors.

At run time:

- **There is always a way forward.** If a config somehow offers nothing, "Carry on" is added.
- **Input can't pick an option that wasn't offered.** A stale or doubled press can only take an option that is on the menu; anything else falls back to the first offered option.
- **One run at a time.** The same challenge can't run twice at once.
- **Nothing piles up.** History is capped at 10 per record, the log at 24 records, and named checkpoints at 4.
- **Saving.** Records, checkpoints and the log live in `session.transient` and are never saved. A save made during an attempt (only possible during an opted-in Shark Duty watch, where the captain has control) holds the story as it is. Loading it starts the watch, and its checkpoint, fresh.
- **Save version.** It stays **17**. No save field was added, so no migration is needed.

## How developers test challenge outcomes

- **The rules, without a screen.** `src/systems/timingBar.js`, `tension.js` and `DutyWatch` are pure. `tests/challengeBots.js` plays them frame by frame with simulated hands:
  - timing bar: `perfect`, `fumble`, `{ fumbles: n }`, `idle`;
  - sash tension: `perfect`, `slack`, `tight`, `{ early: s }`, `noRelease`.

  A failure in a test is therefore a failure the game's own rules produced.
- **The story harness** (`makeStory({ challenges })`) has these policies:
  - `legacy` (default);
  - `success`, `partial`, `failure`, `failOnce`, `failThenContinue`.

  Under any policy but `legacy`, every repair and sash-tension step in a walk runs as a test challenge. That is an in-memory override through `ctx.challengeOverride`; the content is not changed. It goes through the real runner, checkpoint and mechanic, and the policy decides what happens after a failure.
  - `decideChallenges('retry' | 'continue' | 'fallback', ...)` queues decisions.
  - `challengeRecords`, `challengeAttempts`, `challengeDecisions` and `restores` show what happened.
  - A test that pins a legacy result (`setRepairScore`, `setTensionResult`) keeps the legacy path.
- **Commands:**

  | Command | Runs |
  |---|---|
  | `npm run test:challenges` | the contract tests (`tests/challenges.test.js`) |
  | `npm run test:walkers` | all 16 phase walkers |
  | `npm run test:walkers:fail-once` | the same under fail-once-then-succeed, with a per-phase report in `tmp/challenges/failOnce.md` (any policy: `node tools/walk-challenges.mjs partial`) |
  | `npx playwright test e2e/challenges.spec.js` | the real game: a strict bar failed and retried with the keyboard and a pad, "Carry on", and an opted-in Shark Duty watch lost and retried |

### What the walkers showed (fail once, then succeed)

All 16 walker files (Phases 2–17, 505 tests) pass with every repair and sash-tension step failed on its first attempt and won on the retry. The checkpoint was restored 3,902 times across the walks, and every phase still finishes with its own assertions intact.

| Phase | Challenge runs | Kinds | Notes |
|---|---|---|---|
| 1 | 0 | – | The prologue has no headless walker in the story harness; its challenges are map battles (Game Over and the autosave), not yet on the contract |
| 2 | 0 | – | No repair or sash-tension step in Phase 2 |
| 3 | 13 | repair | |
| 4 | 74 | repair | Shark Duty runs in the world, so it is exercised by the browser test |
| 5 | 72 | repair | |
| 6 | 300 | repair | |
| 7 | 148 | repair | |
| 8 | 67 | repair | |
| 9 | 353 | repair | |
| 10 | 781 | repair | |
| 11 | 203 | repair | |
| 12 | 204 | repair 186, sash tension 18 | The thirty-second trial fails (grip lost), retries and completes |
| 13 | 761 | repair | |
| 14 | 636 | repair | |
| 15 | 51 | repair | |
| 16 | 38 | repair | |
| 17 | 201 | repair | |

The counts are challenge runs across all of each phase's walks (both choice orders, every preset, save and load), not distinct steps.

## Current limitations

- **Three mechanics only.** The timing bar, Shark Duty and the sash tension are on the contract. Battles, the teller window, proceedings and reassurance still report through their own legacy means. The runner is generic, so each can be added with a kind entry and an attempt hook.
- **Same script and room for "go back".** Going back works within one script and room; a checkpoint in another room is not offered.
- **Difficulty modes and assists** came in Prompt 4: see [08-difficulty-and-accessibility.md](08-difficulty-and-accessibility.md). That prompt also closed the gap below for the sash tension: a strict trial is now played in the browser (`e2e/difficulty.spec.js`).
- **Consequences are plain script steps.** There is no Ship Integrity or materials system yet, so "damage" is a story variable until Prompt 5.
- **Records are per play.** A chapter that needs to remember a failure across a save stores it itself (`outcomeValue`, `keep`, costs).
- **Shark Duty in the walkers.** The headless walkers don't run Shark Duty's world simulation. It is covered by `DutyWatch` unit tests and the browser test.
