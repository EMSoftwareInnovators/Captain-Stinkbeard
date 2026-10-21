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

## 2026-10-20 (on e3141e2)

Reason: Prompt 3 (challenge outcomes): the timing bar, Shark Duty and the sash tension gained an opt-in challenge mode (success / partial / real failure, checkpoints and retries; src/systems/challenge). The registry records that opt-in support next to the unchanged legacy support, and counts opted-in uses per kind: all 0, because no chapter has opted in. No phase snapshot changed.

Files: challenges.json

Changes: 0 regression, 0 warning, 0 improvement, 20 change

```
Approved changes: 20 changes

Across phases
  CHANGED    challenges: kinds.repair.optIn: undefined -> {"failure":true,"partial":true,"success":true}
  CHANGED    challenges: kinds.sashTension.optIn: undefined -> {"failure":true,"partial":true,"success":true}
  CHANGED    challenges: kinds.sharkDuty.optIn: undefined -> {"failure":true,"partial":true,"success":true}
  CHANGED    challenges: usage.alarm.optedIn: undefined -> 0
  CHANGED    challenges: usage.appraise.optedIn: undefined -> 0
  CHANGED    challenges: usage.battle.optedIn: undefined -> 0
  CHANGED    challenges: usage.conversion.optedIn: undefined -> 0
  CHANGED    challenges: usage.course.optedIn: undefined -> 0
  CHANGED    challenges: usage.dice.optedIn: undefined -> 0
  CHANGED    challenges: usage.fartZone.optedIn: undefined -> 0
  CHANGED    challenges: usage.fumeExposure.optedIn: undefined -> 0
  CHANGED    challenges: usage.lighter.optedIn: undefined -> 0
  CHANGED    challenges: usage.proceeding.optedIn: undefined -> 0
  CHANGED    challenges: usage.reassure.optedIn: undefined -> 0
  CHANGED    challenges: usage.repair.optedIn: undefined -> 0
  ... 5 more (see the full report)
```

## 2026-10-21 (on 2273716)

Reason: Prompt 5: Ship Integrity exists; every phase ends with a whole ship (no chapter damages it); shipIntegrity moves from unsupported to systems.ship; shipRepair registered as a challenge kind with 0 uses

Files: phase-01.json, phase-02.json, phase-03.json, phase-04.json, phase-05.json, phase-06.json, phase-07.json, phase-08.json, phase-09.json, phase-10.json, phase-11.json, phase-12.json, phase-13.json, phase-14.json, phase-15.json, phase-16.json, phase-17.json, challenges.json

Changes: 0 regression, 0 warning, 17 improvement, 18 change

```
Approved changes: 17 improvements, 18 changes

Phase 1
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 2
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 3
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 4
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 5
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 6
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 7
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 8
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 9
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 10
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 11
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 12
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 13
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 14
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 15
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 16
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 17
  IMPROVED   gameplay.unsupported: now supported: shipIntegrity
  CHANGED    gameplay.systems.ship: null -> {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Across phases
  CHANGED    challenges: kinds.shipRepair: undefined -> {"blocksProgression":false,"input":"timed","label":"Ship repair (Pause > Ship; Prompt 5)","retry":"offered while the hold can pay for one; the waste and the damage stay","softlockRisk":"none: no chapter uses it, and a failed repair never ends the game","support":{"failure":true,"partial":true,"success":true}}
```

## 2026-10-21 (on 2273716)

Reason: Prompt 5: the ship_demo debug preset names its start position (crew_quarters 10,8, the same tile as p17_complete): one more preset coordinate reference; no room, prop or NPC moved

Files: coords.json

Changes: 0 regression, 0 warning, 0 improvement, 5 change

```
Approved changes: 5 changes

Across phases
  CHANGED    coords: byKind.preset position: 335 -> 336
  CHANGED    coords: byRoom.crew_quarters.files.data/debug/presets.json: 57 -> 58
  CHANGED    coords: byRoom.crew_quarters.kinds.preset position: 57 -> 58
  CHANGED    coords: byRoom.crew_quarters.total: 1365 -> 1366
  CHANGED    coords: total: 8220 -> 8221
```

## 2026-10-21 (on 2951055)

Reason: Prompt 6: every phase snapshot records the ship's emergencies (none: no chapter starts a leak, flood or fire); the hazard_demo debug preset names its start tile (cargo_hold 14,4); patchLeak registered as a challenge kind with 0 uses

Files: phase-01.json, phase-02.json, phase-03.json, phase-04.json, phase-05.json, phase-06.json, phase-07.json, phase-08.json, phase-09.json, phase-10.json, phase-11.json, phase-12.json, phase-13.json, phase-14.json, phase-15.json, phase-16.json, phase-17.json, coords.json, challenges.json

Changes: 0 regression, 0 warning, 0 improvement, 23 change

```
Approved changes: 23 changes

Phase 1
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 2
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 3
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 4
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 5
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 6
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 7
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 8
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 9
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 10
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 11
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 12
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 13
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 14
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 15
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 16
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 17
  CHANGED    gameplay.systems.ship: {"destroyed":false,"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Across phases
  CHANGED    coords: byKind.preset position: 336 -> 337
  CHANGED    coords: byRoom.cargo_hold.files.data/debug/presets.json: 44 -> 45
  CHANGED    coords: byRoom.cargo_hold.kinds.preset position: 44 -> 45
  CHANGED    coords: byRoom.cargo_hold.total: 763 -> 764
  CHANGED    coords: total: 8221 -> 8222
  CHANGED    challenges: kinds.patchLeak: undefined -> {"blocksProgression":false,"input":"timed","label":"Patching a leak (an emergency; Prompt 6)","retry":"offered while the hold can pay for one; the waste stays","softlockRisk":"none: no chapter uses it","support":{"failure":true,"partial":true,"success":true}}
```

