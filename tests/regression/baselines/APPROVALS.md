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

## 2026-10-22 (on 2067c62)

Reason: Overhaul Prompt 7 (docs/gameplay-overhaul/11-atmosphere-and-ventilation.md): every phase snapshot gains systems.ship.air (rooms with gas, sources, openings changed from their defaults, the captain's exposure), and it reads clean in all 17 phases: no chapter starts a source, adds gas, changes an opening or reads the air. The air_demo debug preset adds one preset position in the crew quarters (coords +1). airSeal is registered as a challenge kind with no chapter uses. Nothing else changed.

Files: phase-01.json, phase-02.json, phase-03.json, phase-04.json, phase-05.json, phase-06.json, phase-07.json, phase-08.json, phase-09.json, phase-10.json, phase-11.json, phase-12.json, phase-13.json, phase-14.json, phase-15.json, phase-16.json, phase-17.json, coords.json, challenges.json

Changes: 0 regression, 0 warning, 0 improvement, 23 change

```
Approved changes: 23 changes

Phase 1
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 2
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 3
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 4
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 5
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 6
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 7
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 8
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 9
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 10
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 11
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 12
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 13
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 14
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 15
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 16
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 17
  CHANGED    gameplay.systems.ship: {"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Across phases
  CHANGED    coords: byKind.preset position: 337 -> 338
  CHANGED    coords: byRoom.crew_quarters.files.data/debug/presets.json: 58 -> 59
  CHANGED    coords: byRoom.crew_quarters.kinds.preset position: 58 -> 59
  CHANGED    coords: byRoom.crew_quarters.total: 1366 -> 1367
  CHANGED    coords: total: 8222 -> 8223
  CHANGED    challenges: kinds.airSeal: undefined -> {"blocksProgression":false,"input":"timed","label":"Sealing a door or hatch against bad air (Prompt 7)","retry":"offered while the hold can pay for one; the waste stays","softlockRisk":"none: no chapter uses it","support":{"failure":true,"partial":true,"success":true}}
```

## 2026-10-22 (on 99c30f6)

Reason: Overhaul Prompt 8 (Grand Stenchmaster pressure): every phase snapshot records ship.pressure, empty at every phase end (no chapter switches a subject on); one debug preset (pressure_demo, crew quarters) adds a coordinate; two new opt-in challenge kinds (pressureRestrain, airMend), used by no chapter.

Files: phase-01.json, phase-02.json, phase-03.json, phase-04.json, phase-05.json, phase-06.json, phase-07.json, phase-08.json, phase-09.json, phase-10.json, phase-11.json, phase-12.json, phase-13.json, phase-14.json, phase-15.json, phase-16.json, phase-17.json, coords.json, challenges.json

Changes: 0 regression, 0 warning, 0 improvement, 24 change

```
Approved changes: 24 changes

Phase 1
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 2
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 3
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 4
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 5
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 6
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 7
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 8
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 9
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 10
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 11
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 12
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 13
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 14
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 15
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 16
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 17
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Across phases
  CHANGED    coords: byKind.preset position: 338 -> 339
  CHANGED    coords: byRoom.crew_quarters.files.data/debug/presets.json: 59 -> 60
  CHANGED    coords: byRoom.crew_quarters.kinds.preset position: 59 -> 60
  CHANGED    coords: byRoom.crew_quarters.total: 1367 -> 1368
  CHANGED    coords: total: 8223 -> 8224
  CHANGED    challenges: kinds.airMend: undefined -> {"blocksProgression":false,"input":"timed","label":"Mending a door or hatch a blast damaged (Prompt 8)","retry":"offered while the hold can pay for one; the waste stays","softlockRisk":"none: no chapter uses it","support":{"failure":true,"partial":true,"success":true}}
  CHANGED    challenges: kinds.pressureRestrain: undefined -> {"blocksProgression":false,"input":"timed","label":"Coaching a Grand Stenchmaster to hold it in (Prompt 8)","retry":"offered; each failed try leaves him worse (a cost a retry keeps)","softlockRisk":"none: no chapter uses it, and a failed hold never ends the game","support":{"failure":true,"partial":true,"success":true}}
```

## 2026-10-23 (on 36e9684)

Reason: Prompt 9 (Stink Beard Saturation): every phase snapshot gains ship.beard (off, holding nothing, no conditions, nothing worn, no purges: no chapter switches it on); the debug preset beard_demo adds one crew_quarters coordinate; the challenge registry gains beardCare (the scrub at the washroom tub). No story, room, crew or coordinate of any chapter changed.

Files: phase-01.json, phase-02.json, phase-03.json, phase-04.json, phase-05.json, phase-06.json, phase-07.json, phase-08.json, phase-09.json, phase-10.json, phase-11.json, phase-12.json, phase-13.json, phase-14.json, phase-15.json, phase-16.json, phase-17.json, coords.json, challenges.json

Changes: 0 regression, 0 warning, 0 improvement, 23 change

```
Approved changes: 23 changes

Phase 1
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 2
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 3
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 4
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 5
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 6
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 7
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 8
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 9
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 10
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 11
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 12
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 13
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 14
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 15
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 16
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Phase 17
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}}

Across phases
  CHANGED    coords: byKind.preset position: 339 -> 340
  CHANGED    coords: byRoom.crew_quarters.files.data/debug/presets.json: 60 -> 61
  CHANGED    coords: byRoom.crew_quarters.kinds.preset position: 60 -> 61
  CHANGED    coords: byRoom.crew_quarters.total: 1368 -> 1369
  CHANGED    coords: total: 8224 -> 8225
  CHANGED    challenges: kinds.beardCare: undefined -> {"blocksProgression":false,"input":"timed","label":"Grooming the Stink Beard at the washroom tub (Prompt 9)","retry":"offered while the hold can pay for a rag; the waste stays","softlockRisk":"none: no chapter uses it, and a beard can always be rinsed with water alone","support":{"failure":true,"partial":true,"success":true}}
```

## 2026-10-23 (on 9128f7c)

Reason: Prompt 10 (shipboard supplies): every phase snapshot records the supplies system, off and empty in all 17 (no chapter opts in); the coordinate index counts the new supplies_demo debug preset's position in the cargo hold; the challenge registry lists the two new opt-in challenges (supplyTake salvage, cook), which no chapter uses

Files: phase-01.json, phase-02.json, phase-03.json, phase-04.json, phase-05.json, phase-06.json, phase-07.json, phase-08.json, phase-09.json, phase-10.json, phase-11.json, phase-12.json, phase-13.json, phase-14.json, phase-15.json, phase-16.json, phase-17.json, coords.json, challenges.json

Changes: 0 regression, 0 warning, 0 improvement, 24 change

```
Approved changes: 24 changes

Phase 1
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 2
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 3
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 4
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 5
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 6
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 7
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 8
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 9
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 10
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 11
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 12
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 13
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 14
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 15
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 16
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Phase 17
  CHANGED    gameplay.systems.ship: {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80}} -> {"air":{"exposure":0,"links":[],"rooms":[],"sources":0},"beard":{"held":[],"on":false,"purges":0,"statuses":[],"worn":[]},"destroyed":false,"hazards":{"buckets":0,"fires":[],"leaks":0,"stability":"steady","water":[]},"overall":100,"pressure":{"on":[],"pending":[],"subjects":[]},"sections":{"bow":80,"deck":60,"hull_port":100,"hull_starboard":100,"rigging":60,"stern":80},"supplies":{"cooking":null,"effects":[],"on":false,"sources":[],"stored":[]}}

Across phases
  CHANGED    coords: byKind.preset position: 340 -> 341
  CHANGED    coords: byRoom.cargo_hold.files.data/debug/presets.json: 45 -> 46
  CHANGED    coords: byRoom.cargo_hold.kinds.preset position: 45 -> 46
  CHANGED    coords: byRoom.cargo_hold.total: 764 -> 765
  CHANGED    coords: total: 8225 -> 8226
  CHANGED    challenges: kinds.cook: undefined -> {"blocksProgression":false,"input":"timed","label":"Cooking at the galley stove (Prompt 10)","retry":"offered while what he can reach pays for a try; the waste stays","softlockRisk":"none: no chapter uses it, and nothing needs a meal","support":{"failure":true,"partial":true,"success":true}}
  CHANGED    challenges: kinds.supplyTake: undefined -> {"blocksProgression":false,"input":"timed","label":"Searching and salvaging the ship's supplies (Prompt 10)","retry":"offered; each failed try is a knock (a cost a retry keeps, never below the floor)","softlockRisk":"none: no chapter uses it; the bilge and the sacking always come back","support":{"failure":true,"partial":true,"success":true}}
```

## 2026-10-27 (on da74b11)

Reason: Prompt 11 (consequence ledger): every phase snapshot gains gameplay.systems.consequences, empty at every phase end (no chapter applies, records or marks anything in the ledger); the coordinate index counts the new consequences_demo debug preset in the cargo hold (one preset position). No story, quest, crew, room, NPC or prop change.

Files: phase-01.json, phase-02.json, phase-03.json, phase-04.json, phase-05.json, phase-06.json, phase-07.json, phase-08.json, phase-09.json, phase-10.json, phase-11.json, phase-12.json, phase-13.json, phase-14.json, phase-15.json, phase-16.json, phase-17.json, coords.json

Changes: 0 regression, 0 warning, 0 improvement, 22 change

```
Approved changes: 22 changes

Phase 1
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 2
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 3
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 4
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 5
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 6
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 7
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 8
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 9
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 10
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 11
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 12
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 13
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 14
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 15
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 16
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Phase 17
  CHANGED    gameplay.systems.consequences: null -> {"ended":0,"held":[],"milestones":0,"on":false}

Across phases
  CHANGED    coords: byKind.preset position: 341 -> 342
  CHANGED    coords: byRoom.cargo_hold.files.data/debug/presets.json: 46 -> 47
  CHANGED    coords: byRoom.cargo_hold.kinds.preset position: 46 -> 47
  CHANGED    coords: byRoom.cargo_hold.total: 765 -> 766
  CHANGED    coords: total: 8226 -> 8227
```

