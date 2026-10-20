# Regression baseline approvals

Every approval of new baselines, newest last: the reason given and what changed. Written by `npm run regress:approve`; never edit a baseline file by hand.

## 2026-10-20 (on a113efc)

Reason: Initial baselines (gameplay overhaul Prompt 2): the game as it stands before the overhaul, known defects included; see tests/regression/known-issues.json

Files: phase-01.json, phase-02.json, phase-03.json, phase-04.json, phase-05.json, phase-06.json, phase-07.json, phase-08.json, phase-09.json, phase-10.json, phase-11.json, phase-12.json, phase-13.json, phase-14.json, phase-15.json, phase-16.json, phase-17.json, lifecycle.json, coords.json, challenges.json

Changes: 0 regression, 0 warning, 0 improvement, 20 change

```
Approved changes: 20 changes

Phase 1
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 2
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 3
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 4
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 5
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 6
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 7
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 8
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 9
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 10
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 11
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 12
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 13
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 14
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 15
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 16
  CHANGED    snapshot: no approved baseline for this phase yet

Phase 17
  CHANGED    snapshot: no approved baseline for this phase yet

Across phases
  CHANGED    lifecycle.json: no approved baseline yet
  CHANGED    coords.json: no approved baseline yet
  CHANGED    challenges.json: no approved baseline yet
```

## 2026-10-20 (on a113efc)

Reason: Challenge registry: register the TV close-up (the tv command in its normal mode: power, channels, wiring) as a choice challenge, and resolve a step's command with the game's own commandNameOf, so a tvProgram or channelEpisode step's tv parameter is not counted. Corrects the Prompt 1 audit, which had the scripted tvSet as the player's puzzle.

Files: challenges.json

Changes: 0 regression, 0 warning, 0 improvement, 2 change

```
Approved changes: 2 changes

Across phases
  CHANGED    challenges: kinds.tvCloseUp: undefined -> {"blocksProgression":false,"input":"choice","label":"TV close-up (power, channels, wiring)","retry":"step away and work the set again","softlockRisk":"none known","support":{"failure":false,"partial":false,"success":true}}
  CHANGED    challenges: usage.tvCloseUp: undefined -> {"byPhase":{"P14":2,"P5":1},"maps":0,"resultRead":0,"scripts":10,"storingResult":0,"total":10}
```

