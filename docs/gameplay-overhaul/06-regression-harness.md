# 06 · Regression harness and measurements (Prompt 2)

Prompt 2 turned the audit's one-off scripts into tools and tests that later prompts run on every change. Nothing in the game changed: no file under `src/` or `data/` was touched, and no save format, story chapter, dialogue, placement or room layout moved.

The harness measures the game at the end of all 17 story phases (the phase-complete debug presets) and checks four things:

- **Story:** chapter, flags, quests and consequences.
- **Crew:** where everyone is, and whether anyone is duplicated, stranded, vanished or in the way.
- **Rooms:** reachability, choke tiles, exits, interactables, props and clutter.
- **Gameplay state:** party, inventory and every system's value.

It also indexes every fixed tile coordinate in the content, records what each challenge can actually do, and measures performance in the browser.

> **A baseline is not a statement of correctness.** The approved baselines record the game as it is, defects included. Every known defect is listed and classified in `tests/regression/known-issues.json`, and the reports name it. A later prompt that fixes one shows up as an *improvement* to approve, not as a failure.

## Commands

| Command | What it does | Time |
|---|---|---|
| `npm run regress` | Everything in one go: hard invariants, changes against the baselines, key numbers per phase. Writes all reports to `tmp/regression/`. | ~3 s |
| `npm run regress:snapshot` | Writes the 17 phase snapshots and the summary records to `tmp/regression/current/`. Never touches the baselines. | ~3 s |
| `npm run regress:compare` | What changed against `tests/regression/baselines/`, with each change graded (add `-- --all` for the full list). | ~3 s |
| `npm run regress:approve -- --reason "…"` | Accepts the current state as the new baselines (add `--dry-run` to see what would be written). See [Baselines](#baselines-generation-review-and-approval). | ~3 s |
| `npm run regress:crew` | Crew lifecycle findings by status, and crew in the hold per phase. Report: `tmp/regression/crew.md`. | ~3 s |
| `npm run regress:rooms` | Room navigation and clutter, prologue to Phase 17. Report: `tmp/regression/rooms.md`. | ~3 s |
| `npm run regress:coords` | Every fixed-position reference, by room and file. Add `-- --room main_deck` for one room. Report: `tmp/regression/coords.md`. | ~3 s |
| `npm run regress:challenges` | The challenge-outcome registry and where each challenge is used. Report: `tmp/regression/challenges.md`. | ~3 s |
| `npm run test:regression` | The Vitest file `tests/regression.test.js`: invariants, baseline match, and self-tests of the tools. | ~11 s |
| `npm run test:core` | Every other Vitest file (the existing unit, content and story-walker tests). `npm test` runs both. | |
| `npm run perf` | The Playwright performance measurement of the heaviest scenes. Writes `tmp/perf/perf.md` and `perf-results.json`. Needs `CHROMIUM_PATH` here. | ~3 min (one run) |
| `npm run perf:bundle` | The production bundle's size, after `npm run build`. Writes `tmp/perf/bundle.md` and `bundle.json`. | <1 s |

The `regress` commands exit with 0 when everything holds and nothing changed, 1 when there are differences or a hard invariant fails, and 2 on a usage error (for example, approving without a reason). `tmp/` is git-ignored.

## Where things are

| Path | Contents |
|---|---|
| `tests/regression/world.js` | The 17 phases, a fresh session at a preset, compiled rooms, live solidity, active warps and spawns, and stable JSON |
| `tests/regression/rooms.js` | Reachability, choke tiles, exits, interactables, clutter; `checkPoints` for reusable navigation checks |
| `tests/regression/crew.js` | Crew per phase, required NPCs, lifecycle findings and their classification |
| `tests/regression/snapshot.js` | The phase snapshot (schema 1), the state of each game system, and what is not supported yet |
| `tests/regression/coords.js` | The fixed-position reference index |
| `tests/regression/challenges.js` | The challenge-outcome contract: vocabulary, registry, inventory, story-harness policy |
| `tests/regression/compare.js` | Snapshot comparison with severities, and the change report |
| `tests/regression/harness.js` | `runHarness` (measures everything once) and the hard invariants |
| `tests/regression/report.js` | Baseline files, compare, approve, and the markdown reports |
| `tests/regression/known-issues.json` | Every known problem, classified |
| `tests/regression/baselines/` | The approved baselines and `APPROVALS.md`, the approval log |
| `tests/regression.test.js` | The Vitest entry point |
| `tools/regress.mjs` | The command line above |
| `perf/scenes.spec.js`, `perf/report.js`, `playwright.perf.config.js` | The performance measurement and its report, kept out of `npm run e2e` |
| `tools/bundle-size.mjs` | The bundle size report |

The harness runs headless, on the same `ContentDB`, `GameSession`, presets and compiled maps as the game. It runs in Node too: `tools/lib/content.mjs` loads `data/` from disk the way Vite's `import.meta.glob` does.

## What it measures

### Phase snapshots

There is one snapshot per phase, at the phase-complete preset: `prologue_done`, `phase2_complete`, `phase3_complete`, then `p4_complete` … `p17_complete`. Each is a sorted JSON file of 17–40 kB, deterministic (the same content gives the same bytes) and written to be read in a diff.

**Story**
- The chapter and location.
- Flags: a total, plus the ones this phase added or removed compared with the previous phase.
- Chapter starts: every chapter that has started must still meet its start condition. A list of any that fail.
- Quests:
  - completed (ids);
  - active;
  - open by design (a hook into the next phase);
  - open when they shouldn't be;
  - the objectives still open.
- Consequences: the story values (`setValue`) and story variables.

**Crew**

Every NPC as one line: `present main_deck@9,6:sit [flags] {party}`, `duplicate …`, `away (room:row, …)` (every room's chosen row hides them), `unmatched` (no row applies anywhere) or `scene-only` (no placement rows at all). The flags are:

- `out-of-bounds`;
- `on-solid-tile`;
- `on-door`;
- `on-arrival-point`;
- `on-choke-tile`;
- `on-critical-choke-tile`;
- `deliberate-gate` (a guard row).

The crew summary groups people by room and lists the NPCs the open objectives need: talk targets, and dialogue keyed on an active objective.

**Rooms**

Per room:
- size;
- walkable, blocked and reachable tiles (with and without people standing in the way);
- choke tiles;
- critical choke tiles (those whose blocking would cut an arrival point off from an exit or another arrival point);
- each exit: where it leads, whether it is locked, whether another warp shadows it, and whether it is reachable;
- arrival points;
- people, people on walkable tiles and people on choke tiles;
- props (permanent fixtures against story props), stacked props, overlapping footprints and interactables;
- objective targets the captain can't reach, and scenery that can't be inspected;
- people blocking something;
- fume zones.

**Gameplay**
- Party: level, HP, equipment and abilities.
- Gold and items.
- Every system's state:
  - atmosphere, and per-room atmosphere overrides;
  - Dead Center, Sharkstorm and hornets;
  - Brogath stability;
  - the Fart Zone;
  - beard tags;
  - every TV.

Systems the overhaul has planned but that don't exist yet are listed under `unsupported`, each with what exists today and the prompt that will add it:

- Ship Integrity (since Prompt 5 measured under `systems.ship`: each section's integrity, the overall percentage, whether the ship is lost);
- per-room atmosphere simulation;
- Beard Saturation;
- crew conditions;
- challenge outcomes;
- field combat.

#### Navigation rules

The rules are the game's own, from `WorldScene`:

- A tile is solid if the compiled map says so (`model.solid`) or a live conditional prop, block or chest covers it (`dynSolid`).
- Standing people block a tile, but the reports keep the with-people and without-people numbers apart. People in hammocks (aloft) never block.
- A door (warp) tile is an exit. It is reached, but never walked across.
- Only the first warp on a tile whose condition holds is active. The ones under it are reported as `shadowedBy`.
- To inspect something, the captain must stand on an orthogonal neighbour and face it. An objective spot with `jobUnderfoot` also works from on top. Rail objects cover all their rail tiles.

`checkPoints(content, model, session, points, people)` (in `rooms.js`) answers whether given points can be reached and used. It covers stations, spawns, interactables and transitions, and is meant for later prompts' own tests, for example "after the main deck redesign, the helm, the pump and every door are still reachable at every phase". `tests/regression.test.js` shows it in use.

### Crew lifecycle

`crew.js` follows every NPC across the 17 phases and reports these finding types:

| Type | Meaning | Lifecycle error |
|---|---|---|
| `duplicate` | Placed in two rooms at the same phase end | yes |
| `out-of-bounds`, `on-solid-tile` | Placed off the map or inside a wall or prop | yes |
| `guarded-out` | Kept out of a room by its guard rule while a row there wants them | yes |
| `missing-required` | An open objective needs them and nobody places them | yes |
| `vanished` | Placed before, then hidden in every room from some phase on, with no explicit exit | yes |
| `temporary-absence` | Hidden everywhere at one phase end, placed again later | yes |
| `stranded-in-storage` | In a storage room (the cargo hold) phase after phase with no reason given. The story's own shelter phases (7–9) don't count | yes |
| `placed-before-first-line` | An early spawn: in the world before their first chapter line. Seeding someone early can be right, but it has to be marked intentional | yes |
| `first-presence-with-first-line` | Not in the world until the phase of their first line (the "appears out of nowhere" pattern) | no: an observation |

Each finding gets a status from `known-issues.json`:

- **known-defect:** a real problem a later prompt should fix.
- **intentional:** the story means it, with the reason.
- **uncertain:** needs a human decision.
- **observation:** recorded, not a problem.
- **new:** not in the file.

Only a lifecycle error with the status **new** fails: it is a hard invariant, so `npm run test:regression` and `npm run regress` fail on it until it is fixed or classified. Once classified, under any status, it is reported on every run but doesn't fail. A known issue the harness no longer finds is reported as **resolved**, and the test fails until its entry is removed. That way the file can't go stale and a fix can't go unnoticed.

The difference between being away and being lost:
- **temporary-absence:** hidden at one phase end and back later. Intentional when the story says why (Garrick's evacuation at the end of Phase 3, Squawks in the captain's pouch in Phase 9).
- **vanished:** never comes back.
- **unmatched / scene-only:** characters with no placement yet, such as visitors before they arrive, or people who only exist inside cutscenes.

### Fixed-position references

`coords.js` indexes every tile coordinate in the content: **8,220 references** today. It covers:

- map objects and placement rows;
- arrival points;
- paths and decor spots;
- fume zones and rails;
- Dead Center zones;
- preset positions;
- quest objective targets;
- these script steps: `spawn`, `place`, `move`, `fly`, `camera`, `sharkEvent`, `burst`, `bark`, `sprite`, `moveSprite`, `token`, `tether` and `fumeCloud`.

Each reference has its room, source file and path. A script's room is inferred in this order:

1. the map that runs it (`onEnter`, triggers, objects);
2. a `transition` before the step;
3. the room of the NPC whose dialogue calls it;
4. the room of the script that calls or jumps to it, repeated until nothing changes.

`vista*` and `insert` steps are in screen pixels, not tiles, and are left out.

| Kind | Count | Kind | Count |
|---|---|---|---|
| placement row | 4,968 | spawn (script) | 143 |
| prop | 891 | place | 101 |
| inspect | 790 | ambient | 55 |
| preset position | 335 | trigger | 43 |
| burst | 248 | other kinds (23) | 456 |
| move | 190 | | |

By room:

| Room | References |
|---|---|
| main deck | 2,579 |
| galley | 1,598 |
| crew quarters | 1,365 |
| cargo hold | 763 |
| Fart Free Zone | 567 |
| Crownskull Isle | 322 |
| Stenchmaster Fart Zone | 198 |
| captain's quarters | 145 |
| treasure hold | 134 |
| washroom | 43 |
| reef passage | 29 |
| several rooms | 207 |
| unknown | 270 |

- **Unknown (270):**
  - 262 script steps whose room couldn't be inferred. 215 of them are in the teller-window scenes (`phase14/bank.json`, `phase15/branch.json`, `phase16/counter.json`), which the teller system runs rather than a map.
  - 8 positions in `data/hazards/shark_duty.json`, which name no room.
- **Several rooms (207):** steps of scripts that run in more than one room (shared scenes). Each is listed with every room it runs in.

The hard invariants require zero references out of bounds and zero objective targets that name an object that doesn't exist. Both are 0 today.

### Challenge outcome contract

`challenges.js` defines one vocabulary, **success / partial / failure / unsupported**, and a registry of every interactive system, as it is today. For each system it records:
- its input type;
- which outcomes it can actually produce;
- what success and partial look like;
- how a failure retries;
- whether an outcome can block progression;
- the risk of a softlock;
- its source file.

It also counts where each one is used (scripts and maps, by phase, and whether the result is stored and read).

| Kind | Input | Success | Partial | Failure | Uses |
|---|---|---|---|---|---|
| repair (timing bar) | timed | yes | yes (clean-strike count, if stored) | **unsupported**: the bar widens after 3 misses and fills after 5 | 177 scripts (2 store the result) |
| Shark Duty | real-time | yes | yes (bites) | **unsupported** ("can't be failed") | 5 scripts, 7 maps |
| sash tension | timed | yes | yes (slips) | **unsupported** ("never fails") | 1 |
| teller window | timed | yes | yes | yes (the queue moves on) | 10 |
| proceeding | choice | yes | yes | yes (built-in retry) | 4 |
| Brogath reassurance | choice | yes | unsupported | yes (pressure rises) | 29 (18 store, 14 read) |
| appraisal | choice | yes | yes | unsupported | 2 |
| TV knob panel | choice | yes | yes | unsupported | 7 |
| TV close-up | choice | yes | unsupported | unsupported | 10 |
| battle | timed | yes | yes (flee) | yes (Game Over and the autosave; `nonLethal` fights continue) | 2 scripts, 3 maps |
| fume exposure | real-time | yes | yes | yes (collapse, carried out) | 30 maps |
| dice, course dial, alarm, lighter, Fart Zone procedure, conversion | none (presentation) | – | – | – | 107 |

Nothing in the game was changed to fake a failure. `applyChallengePolicy(story, outcome)` drives the headless story harness's existing mock results (the repair score, the tension result, the teller grade and, new in this prompt, the battle result in `tests/storyHarness.js`). Where the game cannot produce an outcome, it returns `unsupported` instead of pretending. `normaliseOutcome(kind, value, step)` reads a stored result back in the vocabulary. A new script command must be either registered as a challenge or listed as non-challenge in `harness.js`, or the hard invariants fail. This keeps the registry complete as Prompt 3 and later prompts add systems.

### Performance

`npm run perf` boots the game in the Playwright browser (the dev server, as in the E2E suite) and loads each scene from its preset:

| Preset | Rooms | Why |
|---|---|---|
| `p6_complete` | main deck | most crew on deck (16) with 59 story props |
| `p8_complete` | cargo hold | the shelter: 18 people in the hold |
| `p10_complete` | main deck | inside the Great Sharkstorm |
| `p13_complete` | main deck, cargo hold | most story props on deck (75); 11 crew in the hold |
| `p17_complete` | crew quarters, main deck, cargo hold, galley | the end of the game |

For each room it measures:

- **Build time:** the World scene's `create()`, measured twice, and the total time from the restart request to the second frame drawn.
- **Frame intervals** (`requestAnimationFrame`): average, p50, p95, p99, max, and the number of long frames (over 33.3 ms and over 50 ms). Measured standing still (4 s), then walking (4 s). The walk goes back and forth along a clear run of tiles with no door, live trigger or person on it. It is re-planned every leg, because people move, and when a run is blocked the captain steps toward the nearest clear one.
- **Work per frame:** the time spent inside Phaser's own step (update and render submission), from a wrapper around `game.loop.callback`.
- **What the scene holds:** display objects, actors, NPCs, props shown and built, live interactive objects, tweens and timers.
- **JS heap** after a forced garbage collection, through the Chrome DevTools Protocol (`Performance.getMetrics`).

If a room's on-enter scene is waiting for input (a tutorial or a line), the run plays it out first and says so. `PERF_RUNS=3` repeats every measurement and adds an across-runs table (median and range), `PERF_ONLY=p17_complete` (a comma-separated list) measures only those presets, and `PERF_IDLE_MS` / `PERF_WALK_MS` change the sample lengths. `node perf/report.js` re-renders `perf.md` from `perf-results.json`.

#### Baseline (this machine)

Measured on commit `a113efc` content (unchanged by this prompt), 2026-10-20: Chromium 141 headless, ANGLE SwiftShader (software rendering), 4 CPUs, 3 runs of 4 s still and 4 s walking per room (16,151 frames in all; the captain walked 24–27 tiles per room each run). Boot, from page load to the title menu: 67 s (it renders every song first).

| Scene | Room | Build ms, median (range) | Work per frame p95, still / walking | Frame interval avg, still / walking | Long frames (>33 ms), median of 3 | Display objects | Actors | Props shown (built) | Interactive | Heap MB |
|---|---|---|---|---|---|---|---|---|---|---|
| `p6_complete` | main deck | 10.3 (6.4–13.9) | 3.3 / 2.9 ms | 18.2 / 16.9 ms | 9 | 379 | 17 | 89 (237) | 65 | 90 |
| `p8_complete` | cargo hold | 34.9 (30.2–45.4) | 5.6 / 4.0 ms | 19.6 / 20.1 ms | 53 | 200 | 19 | 73 (130) | 33 | 90 |
| `p10_complete` | main deck | 9.1 (8.9–12.9) | 2.7 / 2.5 ms | 17.1 / 16.9 ms | 3 | 267 | 2 | 100 (237) | 60 | 90 |
| `p13_complete` | main deck | 8.1 (6.1–9.8) | 2.1 / 2.2 ms | 16.8 / 16.8 ms | 3 | 274 | 9 | 105 (237) | 69 | 90 |
| `p13_complete` | cargo hold | 40.7 (33.0–44.4) | 2.8 / 2.3 ms | 17.0 / 16.8 ms | 1 | 174 | 12 | 80 (130) | 32 | 90 |
| `p17_complete` | crew quarters | 28.3 (23.2–37.3) | 2.3 / 2.3 ms | 17.1 / 17.1 ms | 9 | 185 | 14 | 72 (145) | 44 | 90 |
| `p17_complete` | main deck | 9.5 (8.8–10.9) | 2.5 / 2.8 ms | 17.3 / 17.2 ms | 14 | 261 | 2 | 96 (237) | 68 | 90 |
| `p17_complete` | cargo hold | 29.6 (28.0–52.0) | 2.2 / 2.2 ms | 16.7 / 16.8 ms | 0 | 173 | 12 | 84 (130) | 35 | 90 |
| `p17_complete` | galley | 26.6 (23.7–38.5) | 1.8 / 2.0 ms | 16.7 / 16.7 ms | 0 | 143 | 1 | 64 (126) | 40 | 90 |

What it says:

- **The game's own work is small everywhere:** 2–3 ms per frame (p95), against a 16.7 ms frame. The one exception is the Phase 8 shelter: 19 people in the cargo hold cost 5.6 ms. It is also the scene where frames most often run long: a median of 53 frames over 33 ms in a run of about 600 (4 to 66 across the three runs).
- **Building a room takes 6–52 ms.** The holds, the crew quarters and the galley (25–40 ms) take longer than the main deck (8–10 ms), even though the deck has more props. That is worth a look when the rooms are rebuilt.
- **The main deck builds 237 props at every phase and shows 89–105 of them.** Story props that are hidden are still built. Prompt 12 (prop lifetimes) will reduce this.
- **The heap is about 90 MB in every scene.** It is dominated by what the game holds globally (content and generated art), not by the room.
- **Frame intervals here are noise from software rendering.** Averages of 16.7–20 ms, with every interval snapping to 16.7 or 33.3 ms.
- **Repeatability:** display objects vary by ±1 between runs (effects and barks). Build time and work per frame vary by up to about ±40% between runs, so compare medians of `PERF_RUNS=3`.

Bundle (`npm run build && npm run perf:bundle`):

- **One JavaScript chunk:** 6,952 kB raw, 1,762 kB gzip, 1,338 kB brotli.
- **Story content:** 557 JSON files, 6,443 kB as written, 4,764 kB minified, all bundled into that chunk. It is most of the bundle.
- Vite already warns that the chunk exceeds the configured 5,000 kB warning limit (`vite.config.js`). Not addressed here, as the prompt asked.

#### Which numbers could become gates

| Metric | Gate? | Why |
|---|---|---|
| Bundle size (`perf:bundle`) | **yes**, now | Deterministic for a given build. A budget, for example "gzip grows by under 5% without a reason", is safe. |
| Scene contents (display objects, actors, props shown, interactive objects) | **yes**, now | Deterministic for a preset and room. They track clutter directly. The regression snapshots already gate the same things headlessly (people, props, interactables). |
| Room build time | later, as a ratio | Varies by up to about ±40% between runs on one machine, so gate on the median of 3 runs and a generous ratio ("no room takes more than 2× its baseline"). Absolute milliseconds depend on the machine. |
| Work per frame (p95) | later, as a ratio | The best CPU-cost signal (the crowded Phase 8 hold stands out at 2× the others). Gate it only on a fixed CI machine, with medians of 3 runs. |
| JS heap | advisory | Moves with GC timing and with what earlier scenes left behind. Useful for spotting a leak across `PERF_RUNS`. |
| Frame intervals and long frames | advisory | Here they measure SwiftShader's software rendering more than the game: intervals snap to 16.7 or 33.3 ms. |

The limits in `perf/scenes.spec.js` (`DIAGNOSTIC`) only flag a row in the report. Nothing fails.

## Hard checks and advisory checks

| Check | Kind | Where |
|---|---|---|
| All 17 phases measured; each ends in its own phase-end chapter | **hard** | `test:regression` |
| Every started chapter still meets its start condition | **hard** | invariants |
| No quest open at a phase end unless it is open by design or listed in `known-issues.json` | **hard** | invariants |
| No open objective's target out of the captain's reach | **hard** | invariants |
| Every exit that isn't shadowed is reachable from an arrival point | **hard** | invariants |
| The story tests' staging rule (every exit reachable past the people, from every arrival point) at all 17 presets | **hard** | invariants (`StagingTracker`) |
| No *new* crew lifecycle error | **hard** | invariants |
| No coordinate out of bounds; no objective target naming a missing object | **hard** | invariants |
| Every script command registered as a challenge or as non-challenge | **hard** | invariants |
| No stale entry in `known-issues.json` | **hard** | `test:regression` |
| The current measurements equal the approved baselines | **hard until approved**: any difference fails, with a graded report; approving it is a deliberate act | `test:regression`, `regress:compare` |
| Severity of each difference (regression / warning / improvement / change) | advisory: guides the review | `regress:compare` |
| Classified known issues (known-defect, uncertain, intentional, observation) | advisory: reported every run | `regress:crew` |
| Performance and bundle size | advisory | `perf`, `perf:bundle` |

What the grades mean:

- **Regressions:**
  - a person newly duplicated or placed on a wall;
  - an exit or objective target that became unreachable;
  - a flag a phase no longer sets;
  - a quest it no longer completes;
  - a chapter start that broke;
  - more crew in the hold;
  - more choke tiles, or fewer reachable tiles.
- **Warnings:** someone who stops being placed, or who moves room.
- **Improvements:** the reverse of a regression, such as fewer choke tiles, fewer crew in the hold, or less unreachable scenery.
- **Changes:** anything else.

Every line names the phase, room, object id or NPC, and the old and new values. `formatChanges` limits the console output; `tmp/regression/changes.md` has everything.

## Baselines: generation, review and approval

The baselines in `tests/regression/baselines/` are 17 phase files plus `lifecycle.json`, `coords.json` and `challenges.json`. They were first approved from the game as it stood before the overhaul (commit `a113efc`).

1. Make the change.
2. `npm run regress:compare` lists every difference, graded. `npm run test:regression` fails while any exist.
3. Review each line. Regressions and warnings need a reason. A hard invariant that fails can't be approved away: fix it, or, for a crew finding, classify it in `known-issues.json` with a note.
4. `npm run regress:approve -- --reason "what changed and why"`. Try `--dry-run` first.
5. Commit the baseline files and the new `APPROVALS.md` entry in the same commit as the change that caused them.

The safeguards:

- **Comparing never writes a baseline.** `regress`, `regress:compare` and the Vitest file only read them. The test checks that the files' modification times don't change.
- **Approving needs a reason**, and is **refused while any hard invariant fails.**
- **Approving writes only the files that changed.** It appends the reason, the commit, the date and the full list of approved changes to `APPROVALS.md`, so a reviewer sees exactly what was accepted.
- **Never edit a baseline file by hand.**

The first real use of the flow was in this prompt: registering the TV close-up as a challenge changed `challenges.json`, and the change was approved with its reason (see `APPROVALS.md`).

## Known problems in today's baseline

From `npm run regress:crew` and `npm run regress:rooms` (details: `tmp/regression/crew.md`, `rooms.md`).

**Known defects: 23**
- Duplicate placements:
  - Fennimore at the end of Phases 3 and 9;
  - Jory at the end of Phase 3;
  - Hale, Nell and Sully at the end of Phase 9.

  The Phase 9 cases fall while the crew are on Crownskull Isle and the ship can't be reached, but they are still two rows winning in two rooms.
- Vanished with no exit: Dunstan after Phase 5, Rusty Tom and Barnacle Bill after Phase 12.
- Stranded in the cargo hold from Phase 10 to 17: Brask, Fennimore, Finch, Jory, Mags, Nell, Penhallow, Quill, Rook, Sully and Wick (11). The hold holds 1 person in the prologue, 19 during the Phase 7 shelter, and 11 from Phase 10 on.
- Appear only with their first line: Gristle (P3), Pete (P4), Rusty Tom and Barnacle Bill (P10).

**Uncertain: 2.** Garrick hidden at the end of Phase 8 ("in his bunk", but no room places him there), and Gristle hidden at the end of Phase 14.

**Intentional: 10**
- the prologue crew placed before their first chapter line;
- Jory at work in the hold in Phases 1–3;
- Garrick away at the end of Phase 3;
- Squawks in the pouch in Phase 9.

**Quests**
- `tomorrows_heading` is open at the end of the prologue by design.
- `isle_curiosities` (uncertain) stays open from Phase 9 on, and nothing leads back to the island after Chapter 73, so a player can't finish it.

**Rooms (P1 → P17)**

| Room | Reachable tiles | Choke tiles |
|---|---|---|
| main deck | 362 → 322 | 3 → 30 |
| crew quarters | 147 → 124 (106 with the crew standing in it) | 13 → 33 |
| galley | 103 → 90 | 7 → 11 |
| cargo hold | 196 → 182 | 12 → 8 |

- The main deck has one critical choke tile (8,28) at P17.
- Story props in the four main rooms: 9 → 219.
- Scenery that can't be inspected (no tile to stand on facing it): the mirror (captain's quarters 2,3), the vent (washroom 2,3), `p16_bunker_look` (cargo hold 12,3), `p16_tube_zone` (Fart Free Zone 9,3), `p11_porthole_look` (galley 9,2) and `p15_protocol` (galley 12,3).
- No open objective target is unreachable at any phase end, and every exit is reachable.

## How later prompts use the harness

- **Every prompt:**
  - Run `npm run regress` before and after.
  - A gameplay prompt's change shows up as graded differences. Approve them with a reason that names the prompt.
  - Run `npm run test:regression` with the other tests.
- **Layout prompts (12–19):**
  - Start from `npm run regress:coords -- --room <room>`: every reference that must move with the room.
  - Afterwards, `regress:rooms` shows reachability and choke tiles phase by phase.
  - Add `checkPoints` tests for the room's stations and doors.
  - The audit's acceptance budgets (choke tiles at or below the prologue value plus a margin, nobody on a choke tile by default, no unreachable live inspectable) can be written as assertions over `result.snapshots`.
- **Crew prompts (20–26):**
  - Each fix turns a known-defect into "resolved": delete its entry from `known-issues.json` in the same change.
  - A new lifecycle error fails until it is fixed or classified.
- **Challenge prompts (3 onwards):**
  - Register new outcomes in `CHALLENGE_KINDS`: `outcomes` for the legacy behaviour, `optIn` for what a step that opts in can report (done in Prompt 3 for the timing bar, Shark Duty and the sash tension). The registry baseline counts opted-in uses per kind (`optedIn`), so a chapter that opts in shows up as a change to approve.
  - Walk the phases with failures injected: `npm run test:walkers:fail-once` (the story harness's challenge policies, docs/gameplay-overhaul/07-challenge-outcomes.md). `applyChallengePolicy` still drives the legacy mocks.
  - An outcome still marked `unsupported` tells you which systems still can't fail.
- **New systems (Integrity, Atmosphere, Beard Saturation and the rest):**
  - Move the system from `UNSUPPORTED` into `systemsState` in `snapshot.js`, so its value at every phase end is recorded and compared.
  - Register any new script command (the invariants insist).
- **Performance-sensitive prompts:** run `npm run perf` before and after, on the same machine, and compare `tmp/perf/perf.md`. Run `npm run build && npm run perf:bundle` for size.

## Changes outside the harness

- **`tools/lib/content.mjs`:** gained `readDataFiles(root)`, a sorted walk of `data/`, so the command line reads the same files in the same order every time. `loadContentFromDisk` uses it. Tooling only.
- **`tests/storyHarness.js`:** the headless story harness's battle mock always returned `'win'`. It now returns a settable `battleResult` (`setBattleResult`), still `'win'` by default, so the challenge policy can drive it. Test code only; every existing walker is unchanged.
- **`package.json`:** the scripts above.

No production code (`src/`), content (`data/`) or save format changed.

## Differences from the Prompt 1 audit

- **The TV was classified the wrong way round.** The audit counted `tvSet` (a scripted change of the set's state) as the player's "TV knobs" puzzle, and the TV close-up (`tv`, where the player works the set) as passive. It also counted the `tv` parameter of `tvProgram` and `channelEpisode` steps. Corrected in `01-story-inventory.md`, the phase files and `04-gameplay-systems.md`:
  - "TV close-up" is used in 9 chapters, not "TV knobs" in 17;
  - chapters that are walk-and-press-A or cutscene only: 121, not 116;
  - chapters with a choice or puzzle prompt only: 23, not 28.

  The timed-input count (79) is unchanged.
- **Duplicate placements** (Fennimore P3/P9; Jory P3; Hale, Nell, Sully P9) were not in the audit, whose per-milestone table showed one room per person.
- **Unreachable scenery:** the audit found the mirror, `p15_protocol` and `p11_porthole_look`. The harness also finds the washroom vent, `p16_bunker_look` and `p16_tube_zone`, because it uses the game's rule (stand orthogonally next to it and face it) instead of the audit's any-of-8-neighbours.
- **Reachable tiles are slightly lower and choke tiles slightly higher than in the audit** (main deck P17: 322 and 30, against 330 and 28). The harness treats a door as an exit that is never walked across, and uses only the first active warp on a tile, as `WorldScene.warpAt` does.
- **`isle_curiosities`:** the audit listed it as one of the open quests. The harness found that it can't be completed after the crew leave the island.
- **Coordinate references:** the audit's 801 inspect references are 790 inspect objects plus 11 decor spots. The index counts both, in separate kinds.

## Limitations

- **Phase ends only.** The snapshots are taken at the 17 phase-complete presets. A problem that exists only in the middle of a phase is caught by the existing story walkers, not by the snapshots.
- **Presets, not play.** Presets set the story state directly. They don't replay the player's free choices, so optional content a player could have done (like the island curiosities) is measured as not done.
- **Static placement.** Crew positions are the placement rows' choice. Wandering and routines move people at run time; the harness records the anchor tile, and the browser's live restaging is not simulated.
- **Script rooms are inferred.** 262 script references (about 3%) have no inferred room. They are listed under "unknown" in `coords.md`.
- **Navigation ignores timing and cutscene state.** A tile blocked only during a scene, or a door a scene opens, is measured as it stands at the phase end.
- **Performance runs on software rendering here.** SwiftShader frame intervals say more about the machine than the game. Compare work-per-frame and build times, on the same machine. The JS heap includes everything earlier scenes in the same page left behind.
- **The challenge contract is test-level.** Nothing in the game reports outcomes yet. That is Prompt 3.

## Recommendation for Prompt 3

Prompt 3 should stay as the roadmap has it: **the challenge outcome contract in the game, with challenge-start checkpoints and instant retry, and opt-in fail rules for the repair timing bar, Shark Duty and the sash tension.** The harness is now ready to hold it to "no unasked-for change":

1. **Contract.**
   - Add `src/systems/challenge.js`: one outcome record (`success` / `partial` / `failure`), emitted once per challenge step and optionally stored in a variable named by the step.
   - Use the vocabulary and the kind ids from `tests/regression/challenges.js`, so the registry and the game agree.
   - A step without a `fail` rule behaves exactly as today. Every phase snapshot should then come out unchanged; only `challenges.json` changes, and that change is approved with its reason.
2. **Checkpoints and retry.**
   - A challenge that fails restarts from its own start, with the scene state captured at that point.
   - Never a save reload, and never a softlock.
   - The invariants already insist that every exit and every objective target stay reachable at each phase end.
3. **Opt-in fail rules.**
   - For `repair`, `sharkDuty` and `sashTension` only, as data on the step.
   - No chapter opted in yet, or one demonstrator behind a debug preset, if you want to see it play.
   - Flip `outcomes.failure` in the registry for each kind as it gains real support.
4. **"Fail first" in the walkers.**
   - Make `applyChallengePolicy(story, 'failure')` drive real failures: fail once, then succeed on the retry.
   - Run every phase walker under both policies. The acceptance test: all 17 walkers green both ways.

Out of scope for Prompt 3, as before:
- Integrity damage (Prompt 5) and difficulty modes (Prompt 4), so a failed repair costs only the retry for now.
- Any crew fix.
- Layout changes.

Three things the harness found that need your decision. None blocks Prompt 3, but all should be settled before the crew prompts (20–26):
- `isle_curiosities`: close it on leaving the island, or make it completable.
- Garrick at the end of Phase 8: "in his bunk", but placed nowhere.
- Gristle at the end of Phase 14: hidden everywhere.

The duplicate placements (five crew, six phase ends) are plain data defects. The first crew prompt can fix them, or a small fix-up prompt before it.
