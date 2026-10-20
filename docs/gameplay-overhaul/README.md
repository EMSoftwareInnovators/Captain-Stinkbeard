# Gameplay overhaul: audit and plan

Planning documents for the Captain Stinkbeard gameplay overhaul. Prompt 1 was the audit (documents 00–05); Prompt 2 built the regression harness and measurement baseline (document 06); Prompt 3 added challenge outcomes, checkpoints and retries as opt-in infrastructure (document 07). None of them changed how the existing campaign plays.

| Document | Contents |
|---|---|
| [00-project-baseline.md](00-project-baseline.md) | Architecture, existing systems, content counts, test/build/E2E baseline, extension points |
| [01-story-inventory.md](01-story-inventory.md) | Index of all 223 chapter entries (prologue + Chapters 1–222), classification, findings |
| [story/phase-01.md](story/phase-01.md) … [story/phase-17.md](story/phase-17.md) | Every chapter with all 13 audit fields |
| [02-crew-audit.md](02-crew-audit.md) | Full NPC roster, stranded and vanished crew, stations, schedules, special rules, final roster |
| [03-ship-layout-audit.md](03-ship-layout-audit.md) | Room-by-room measurements, clutter, bottlenecks, redesign proposal, safe technical approach |
| [04-gameplay-systems.md](04-gameplay-systems.md) | What the player does today, deficiencies, reusable systems, combat decision, difficulty principles, technical risks |
| [05-overhaul-roadmap.md](05-overhaul-roadmap.md) | 62 dependency-ordered prompts in 7 groups, with acceptance criteria, and the recommendation for Prompt 2 |
| [06-regression-harness.md](06-regression-harness.md) | The regression harness: commands, phase snapshots, crew lifecycle, room navigation, coordinate index, challenge outcome contract, performance baseline, how baselines are approved, known problems, and how later prompts use it |
| [07-challenge-outcomes.md](07-challenge-outcomes.md) | The challenge outcome contract: records, rules, partial outcomes, checkpoints and retries, the strict timing bar, Shark Duty and sash tension, opting chapters in, the softlock and save rules, testing outcomes, limitations |

The audit's figures were measured from the repository at commit `fe6281d` by loading the merged content and the 17 phase-complete debug presets. Where something could not be verified, the documents say so. Prompt 2 corrected one audit classification (the TV, see 06 "Differences from the Prompt 1 audit"); from now on the harness (`npm run regress`) is the source for these measurements.
