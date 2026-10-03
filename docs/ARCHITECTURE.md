# Architecture

Captain Stinkbeard is split into **rules and content that know nothing about
Phaser** and **a thin presentation layer that does**. The rules can run in
Node (unit tests, balance simulations, export tools) and could be driven by a
different renderer; Phaser draws sprites, plays audio buffers and ticks the
frame loop.

```
            data/**/*.json  (all content)
                   │  import.meta.glob (browser, Vitest) / fs (Node tools)
                   ▼
  ┌──────────────── engine-independent ────────────────┐
  │ content/   ContentDB, registries, validateContent  │
  │ systems/   GameSession ─ story, world, inventory,  │
  │            party, quests, effects, battle engine,  │
  │            script runner, saves, settings          │
  │ maps/      compileMap, pathfinding                 │
  │ art/       PixelCanvas painters → sheets.js        │
  │ audio/synth  note data → PCM buffers               │
  │ core/      EventBus, Rng, util                     │
  └────────────────────────────────────────────────────┘
                   ▲ calls / events
  ┌──────────────── presentation (Phaser 4) ───────────┐
  │ scenes/    Boot, Title, World, Battle, Menu,       │
  │            GameOver, Overlay, (Debug)              │
  │ world/ entities/ battle/ ui/ phaser/               │
  │ platform/  input, storage, display scaling         │
  │ audio/AudioEngine (Web Audio buses)                │
  └────────────────────────────────────────────────────┘
```

## App and services

`src/app/App.js` is created once in `main.js` and attached to the Phaser game
(`game.app`). Every scene reaches it via `BaseScene.app`:

| Service | Purpose |
| --- | --- |
| `bus` | `EventBus` for game events (see below) |
| `content` | `ContentDB`: every registry (`items`, `npcs`, `maps`, `scripts`, …) |
| `validation` | `{ errors, warnings }` from `validateContent` (dev builds stop on errors) |
| `settings` | persisted options (volumes, text speed, scaling, …) |
| `saves` | `SaveManager` (slots, checksums, migrations) |
| `input` | `InputManager` (keyboard + gamepad actions) |
| `audio` | `AudioEngine` (music / ambience / SFX / UI buses) |
| `session` | the running `GameSession`, or `null` on the title screen |
| `flags` | debug toggles (collision view, noclip, auto timing, …) |

## Game state: `GameSession`

`src/systems/GameSession.js` composes all mutable state of one playthrough:

- `story` — `StoryState`: declared boolean flags and integer variables
- `world` — `WorldState`: per-object state (`"map:object"` → props such as
  `opened`, `defeated`), visited maps, counters (dialogue cycles)
- `inventory` — gold and item counts
- `party` — `Character`s (level, XP, HP, equipment, learned abilities)
- `quests` — `QuestSystem` state
- `location`, `playTime`

`session.serialize()` is exactly what a save stores; `GameSession.fromState`
rebuilds it (unknown ids are dropped with warnings instead of crashing).

### Events

Systems announce changes on the bus; nothing polls. Quests, the overlay
(toasts) and scenes subscribe.

| Event | Payload | Emitted by |
| --- | --- | --- |
| `story:flagSet` / `story:flagCleared` / `story:varChanged` | `{ flag }` / `{ name, value }` | StoryState |
| `inventory:changed`, `gold:changed` | counts | Inventory |
| `world:objectChanged` | `{ key: "map:object", prop, value }` (defeated, opened...) | WorldState |
| `party:changed`, `party:levelUp` | `{ levelUps, source }` | Party / GameSession |
| `quest:started`, `quest:objectiveProgress`, `quest:objectiveCompleted`, `quest:completed`, `quest:reset` | quest + objective | QuestSystem |
| `npc:talked` | `{ npc }` | WorldScene after a conversation |
| `object:inspected` | `{ id: "map:object", tags }` | WorldScene |
| `map:entered`, `region:entered` | `{ map }`, `{ region, map }` | WorldScene |
| `battle:won` | `{ encounter, tags, enemies }` | BattleScene |
| `script:event` | `{ name }` | the `event` script command |
| `session:started`, `settings:changed`, `input:device`, `audio:music` | | App / services |

Quest objectives are data (`{ type: 'talk', target: 'hale' }`) matched
against these events, so no quest ever needs code. Each event is matched
against a snapshot of the objectives available *before* it, so one event
advances at most one step of an `after` chain. Objectives about permanent
state (`obtain`, `flag`, `visit` of the current map, `defeat` with `objects`)
are also re-checked from the session on quest start, on unlock, on
`inventory:changed` / `story:flagSet` / `world:objectChanged`, and after
a save loads, so doing things before the quest asks still counts.

## Content pipeline

1. `loadContent()` imports every JSON file under `data/` with
   `import.meta.glob` (Node tools read the same files from disk).
2. `ContentDB` sorts files into registries by **folder** (`FOLDER_RULES`):
   `data/npcs/*.json` → `npcs`, `data/dialogue/**` and
   `data/story/cutscenes/**` → `scripts`, etc. A new chapter is new files in
   the same folders; no registration code.
3. `validateContent()` cross-checks everything: ids unique, references resolve
   (items, NPCs, speakers and expressions, scripts, script labels, quests and
   objectives, encounters, enemies, abilities, statuses, maps, warps and spawn
   points, equipment slots and stats, shop stock, music instruments, art names),
   script commands and their parameters, conditions, story flags declared and
   used, walkable spawns/warps. Errors carry the file and path.
4. `App` stops development builds with an on-screen list of errors; the
   `npm run validate` / `npm test` suites fail on any error.

## Scripts: dialogue, cutscenes and inspections

One interpreter, `ScriptRunner` (`src/systems/script/`), runs every kind of
scripted sequence. A script is an array of steps (or labelled nodes):

```json
[
  "hale[concerned]: Rats, sir?",
  { "if": { "questActive": "rats_in_the_hold" }, "then": ["captain: Rats."] },
  { "move": "wick", "path": ["up", 2], "speed": "run" },
  { "choice": [ { "text": "Yes", "goto": "yes" }, { "text": "No" } ] }
]
```

- Strings are dialogue lines: `speaker[expression]: text` (narration without a
  speaker). Text supports colour markup (`<y>gold</>`) and tokens (`{ship}`,
  `{btn:confirm}`, `{item:hardtack}`).
- `{ "if": …, "then": …, "else": … }` branches; any command may carry an `if`
  guard.
- Commands (`src/systems/script/commandSchemas.js` lists them all with their
  parameters) are async functions in `commands.js`. They never touch Phaser:
  they call **services** handed in by the scene running the script
  (`dialogue`, `ui`, `audio`, `world`, `battle`, `saves`).

Because every command is awaited, cutscenes read top to bottom — no nested
timeouts or callbacks. Waits use the scene clock (paused with the scene).
`parallel` runs branches concurrently and joins them.

The world supplies `world` services (`src/world/worldServices.js`): move actors
along paths or to tiles, face, animate, emote, spawn/despawn/place NPCs, camera
pan/follow/reset, shake, flash, fade, map transitions, object visibility and
effects. Unit tests run scripts against mock services.

## Scenes

| Scene | Role |
| --- | --- |
| `Boot` | paints all textures (`phaser/buildAssets.js` ← `art/sheets.js`), renders all audio, shows content errors in dev |
| `Title` | logo, animated sea and ship, New Game / Continue / Load / Options |
| `World` | one map at a time: tiles, props, lighting, ambient life, player, NPCs, field enemies, triggers, warps, scripts |
| `Battle` | launched over the paused world; presents `BattleEngine` |
| `Menu` | pause menu and shops, launched over the paused world |
| `GameOver` | retry from autosave, load, or title |
| `Cinema` | full-screen illustrated vistas and close-up inserts for set-pieces, above the world and below the dialogue box |
| `Overlay` | always on top: dialogue box, tutorials, toasts, banners, location titles, hints, full-screen fades |
| `Debug` | F2 overlay (development builds only) |

Scene order in `main.js` is draw order. Scenes talk through the App and
promises: `WorldScene.startBattle(id)` resolves with `'win' | 'lose' | 'flee'`
once the battle has ended and the world has resumed, so a script can write
`{ "battle": "sparring_match", "win": [...], "lose": [...] }`.

## World

- **Maps** are authored as ASCII rows plus a legend
  (`data/maps/**`); `compileMap` resolves tile types through the tileset's
  autotile rules into frame indices, a solidity grid, props and objects. The
  same model feeds the Phaser renderer, the validator and the Tiled exporter.
- **Movement** is strictly tile-based: an actor reserves its destination tile
  in an occupancy map before moving, so two actors never overlap, and nothing
  can slide through walls or stop between tiles. Diagonals don't exist.
  Walking moves exactly 2 px per 60 Hz frame (8 frames per tile) and running
  3 px per frame; leftover time carries into the next step so a held direction
  never hitches at tile edges, and the walk cycle is driven by step progress
  (one stride per tile). There is no turn-in-place delay: a press moves on
  the frame it is read (walking into a wall or a person just turns you), the
  first step starts one frame in, and pressing the opposite way mid-step turns
  back at once instead of finishing the tile.
- **Warps** take the player when a step lands on them. A warp with `if` is a
  live lock: while the condition fails its tile blocks, and bumping or
  confirming on it runs its `locked` script (once per push; the direction must
  be released before it bumps again). Directions already held when a map loads
  are latched: they walk the player around normally but never onto a warp until
  released, so holding Up through a ladder can't bounce straight back.
- **Depth** is y-sorted by feet position; overhead layers (rigging, beams) draw
  above actors.
- **NPC brains** (`world/NpcBrain.js`): `stand` (optionally looking around),
  `wander` within a radius, `work` (loop an animation), `sit`, and `routine`
  (a list of go/wait/face/anim/emote steps with BFS pathing). NPCs pause while
  talking, hold still while the captain faces them, and never stop on warps.
- **Placements are live** (`world/placements.js`, `WorldScene.restage`). A
  room is built from each NPC's first placement whose `if` holds. After
  every scene, and after any scene it sets off, the room is restaged:
  - everyone whose placement changed, and everyone a script positioned
    (`spawn`, `place`, `move`, `fly`, `despawn` mark the actor as staged),
    goes where the placements say;
  - `NpcBrain.relocate` walks them there, or in from the nearest arrival
    point, or out through one (fading at the door);
  - after 3 s stuck behind people, they fade across instead;
  - someone still on an async scripted walk or flight is left to finish it
    first.

  The room after a scene is therefore what a reload would build. Scripts can
  restage mid-scene (`restage: walk | cut`).
- **Never stuck behind people.** Walking into a standing NPC for 0.7 s
  squeezes the captain past them (they trade places), and he does so at once
  when he is boxed in on every side. A placement marked `blocks` is a
  deliberate gate that only gives way when he is boxed in.
- **Field enemies** (`world/FieldEnemy.js`) wander, chase within a range and
  start battles on contact. Approaching an enemy from behind gives a
  *preemptive* round; being caught from behind gives the enemies an *ambush*
  round.
- **Interaction**: the tile in front of the player is checked for an NPC,
  inspect/chest objects, or props with inspect text; a bubble marker and a
  context hint (`[Z] Talk`) show what confirm will do.
- **Lighting**: each map may declare an ambient colour; lanterns and windows
  add light. The light map is baked once per map at half resolution and
  multiplied over the scene, with flickering glows on flame lights.
- **Ambient life**: ocean with wake and a swell (the sea rises and falls, the deck stays steady), gulls, chimney smoke,
  animated flags and lanterns, drifting sail shadows, crew routines, and
  ambience beds with random one-shots (creaks, gulls, drips, bells).

## Story, set-pieces and hazards (Phase 2)

Story Phase 2 added engine features, not special cases. Everything is data.

- **Chapters extend earlier content without editing it.** A map file with
  `"patch": "<mapId>"` (`data/maps/ship/phase2/*.patch.json`) prepends
  objects, music/lighting variants and haze, and appends props, onEnter
  scripts, regions, ambient life, fume zones and collision to the base map
  (`ContentDB.applyExtensions`). An NPC or character record with
  `"extend": "<id>"` puts its dialogue selectors ahead of the original ones
  and adds look variants.
- **Story state is flags.** The current chapter, the time-of-day colour grade
  and every character's look (`variants`, resolved by
  `systems/story/progress.js`) are pure functions of the saved flags, so none
  of them is saved separately. `WorldScene.refreshStory()` re-applies
  conditional props, dynamic solids (props, blocks, chests), lighting,
  appearances, fumes, haze, the grade and music the moment a flag changes.
  NPC *placements* are chosen when a map is built (first matching placement
  per NPC wins, `absent` means "elsewhere"), so scenes that move people
  mid-scene use `spawn`/`move`, and the next visit shows the new arrangement.
- **Story triggers** (`data/story/triggers/*.json`) start chapters: a trigger
  runs when its condition holds and the world is idle. Chapter triggers are
  `"once": false` with a condition their script falsifies at once (for
  example `questNotStarted` + `startQuest`), so a trigger interrupted by
  closing the game simply runs again after loading; a unit test checks every
  repeatable trigger clears its own condition.
- **The world is busy until a map's arrival scripts have run**
  (`WorldScene.enterMap`): a transition's `then` script and `onEnter` scripts
  run before the player, fumes or triggers get a frame.
- **Set-piece commands** (`fly`, `hop`, `bark`, `burst`, `propFx`, `roll`,
  `sprite`/`moveSprite`, `tether`, `fumeCloud`, `vista…`, `insert`) are in
  `worldServices.js` and `CinemaScene`. Stage sprites (`world/Stage.js`) are
  free sprites placed in tile units (a bathtub alongside, a rowboat being
  lowered) and the rescue rope, which follows the path the captain actually
  walked. `FxPool` recycles particles with a hard cap (halved with Reduced
  effects). `Barks` are speech bubbles that don't stop the game.
- **Fumes** (`systems/hazards/fumes.js` rules, `world/FumeLayer.js` drawing):
  zones of `light`/`dense`/`center` level (optionally drifting along a path),
  exposure that builds in thick fumes and recovers in clean air, a warning at
  65 %, and a collapse that is never fatal: the map's `fumeCollapse` script
  (default `hazard.fume_collapse`) runs and the captain respawns somewhere
  breathable. Exposure only builds under player control; during scenes the
  clouds thin and the vignette opens so the scene reads. The *Fume hazard*
  option scales the build-up (Normal 1, Gentle 0.5, Off 0).
- **The dialogue window docks** at the top of the screen when the bottom
  would hide the captain, the speaker, or the point the camera is held on
  (`WorldScene.dialogueDock`), with hysteresis so it doesn't hop between lines.
  Vistas keep it at the bottom.
- **Debug presets** (`data/debug/presets.json`, `src/debug/presets.js`) build
  a fresh session at any point of the story by chaining `after` presets; the
  F2 *Story* tab, `window.__GAME__.test.preset(id)` and unit tests share them.

## Names, logbooks, sharks and repairs (Phase 3)

Story Phase 3 (see [STORY_PHASE3.md](STORY_PHASE3.md)) kept the same rules:
new behaviour arrives as data plus small, reusable engine pieces.

- **Variants resolve field by field** (`resolveVariant`): each field comes
  from the first matching variant that sets it, so "renamed" (a late variant
  setting `name`) and "beard sniffed" (an earlier one setting `appearance`)
  combine. Names and titles are variant fields too.
- **Characters have a story-dependent face and name.** `Character.look`,
  `name`, `title` and `fullName` resolve through a hook the session passes to
  the party, so the captain's id stays `blackbeard` (saves, scripts, stats)
  while every display (name plates, status page, toasts, battle results, save
  slots, the quest log, `{captain}`) says Stinkbeard once the flag is set.
  Nothing about the name is saved; it follows the flags.
- **Logbooks** (`data/logs/`, `systems/logs/logbook.js`) are data-only
  records whose entries unlock with conditions and change through variants.
  An available logbook adds a pause-menu page (`ui/menu/LogPage.js`), the
  `logbook` command opens it in the world, and newly unlocked entries are
  announced. Only "read" and "announced" ids are remembered (world state,
  `log:<id>`).
- **The shark threat** is a hazard level per map (`"sharks"` variants in a
  map or patch: none / curious / following / attacking / swarm).
  `systems/hazards/sharks.js` holds the rules and geometry (a fin course that
  hugs the hull, a point on the rail beside the captain); `world/SharkLayer.js`
  draws fins, bumps the hull while the captain has control (never during a
  scene), and plays scripted moments (`sharkEvent`: bite, ram, flop, return,
  lure, follow, unfollow). Below decks the hull only thumps. A scene can hold a
  level with `{ "sharks": "swarm" }` and hand it back with `"auto"`.
- **The repair timing game** (`OverlayScene.repair`, `repair` command) is a
  small modal: strike when the marker is in the green; two misses in a row
  widen the zone, and the auto-timing assist makes every strike land. The
  number of clean strikes goes into a story variable.
- **The captain is never walled in.** If every tile around him is a wall or
  a person (a scene that ended with the crew standing all round him), walking
  into a standing NPC trades places with them (`WorldScene.tradePlaces`).
  Scenes should still leave him a way out; this is the backstop.
- **Item effects** gained `fumeWard` (fumes build slower for a while, per
  play, never saved) and `sideEffect` (one weighted pick: a short battle
  status and/or field effects, with a line of text).

## The Dead Center, bells and Shark Duty (Phase 4)

Story Phase 4 (see [STORY_PHASE4.md](STORY_PHASE4.md)) turns the Dead Center
into a recurring, data-driven hazard and builds daily life around it. Again:
data plus small reusable pieces, nothing rebuilt.

- **Story values.** `StoryState` gained named text values beside flags and
  variables (`getValue` / `setValue`, saved; save version 4). Where the Dead
  Center is today is one: `dead_center`, holding a location id.
- **The Dead Center is routed through the existing fume system.**
  `systems/hazards/deadCenter.js` turns `data/hazards/dead_center.json`
  locations into ordinary fume zones, each conditional on
  `{ "deadCenter": id }`, so the map's usual story refresh brings it and
  takes it away. It rolls in from `enterFrom` over `enterMs` (the fume field
  remembers when a zone appeared), and exposure, collapse and rescue are the
  Phase 2 rules. `deadCenterSeals` makes the world refuse warps into a room
  the Center fills and play `hazard.dead_center_door` instead.
- **The bell protocol** (`systems/hazards/alarms.js`, `OverlayScene.alarm`):
  data levels 1-4, always shown in words (and the bell's sound written out)
  as well as played; the panel sits below a top-docked dialogue window and
  moves back up when it closes; a tutorial opens below it.
- **Shark Duty** is two halves: `systems/hazards/sharkDuty.js` (pure: data,
  which session a map runs, and `DutyPlan`, the deterministic wave schedule)
  and `world/SharkDuty.js` (the rail marks, the shove, bites that leave
  damage, the duty board, crew barks). Time only passes while the captain has
  control; nothing can be failed.
- **Sharks** gained a `frenzy` level, crowds of distant fins (`crowd`, capped
  and pooled), and staged `frenzy` / `calm` / `thrash` / `hammerhead` events
  in `world/SharkLayer.js`.
- **The course dial** (`OverlayScene.course`, `course` command) shows the
  ship falling off her heading while the helm is unreachable.
- **Vistas** gained school layers (many drifting copies from one entry, for
  hundreds of fins) and `"dock": "top"` (the dialogue window over the sky).
  Toasts and the map title also move below a top-docked window.
- **Logbooks** gained pictures (an entry's `insert`) and scale fields, for
  the Forecast Board (`data/logs/forecasts.json`).
- **Time of day** entries can match variables, so Phase 4 sets the hour with
  `p4_tod`.

## The S.E.S., panic and the labour rule (Phase 5)

Story Phase 5 (see [STORY_PHASE5.md](STORY_PHASE5.md)) adds the Grand
Stenchmaster's office. Data plus small reusable pieces again:

- **Televisions.** `systems/tv/tv.js` is engine-agnostic (which channels
  exist, power and channel as two saved story variables, comment cycles that
  skip anyone not in the room); `ui/TvView.js` is the close-up, opened by the
  `tv` command through `OverlayScene.tv` and counted as busy like a repair. A
  channel is a loop of vista frames under a scanline overlay, a glare and a
  glow; failures (roll, spark, buzz, smoke) are timers and tweens on the same
  sprites, so the CRT costs a few images, no shaders. The set on deck is
  ordinary animated props whose `if` reads the same variables (props refresh on
  variable changes as well as flags).
- **Panic shouts.** `alarms.js` `panicShouts` picks on-screen people (less an
  `exclude` list) to shout when a bell rings, plus a possible reply;
  `WorldScene.panicShouts` shows them as barks. Never during a vista.
- **Shark Duty** gained bark replies and conditions, and a per-shift helper
  (`assist`): the emergency labour rule as data. The ramp and the put-aside
  watch (leaving the deck) came with the Phase 5 fixes.
- **Looks** gained `pegleg`, `regalia`, `brassboots`, `gloves`, the
  `stenchhat`, and parrot `naked` / `weary` / `basket` options; the suit and
  fully bald Squawks are appearance variants on flags, as before.
- **Save version 5** keeps the layout (Phase 5 is flags and variables).

## Programmes, the Great Sharkstorm and the second cloud (Phase 6)

Story Phase 6 (see [STORY_PHASE6.md](STORY_PHASE6.md)) extends the same
pieces rather than adding new architecture:

- **Television programmes and conditions.** A programme
  (`data/tv/programs/`, ContentDB kind `tvPrograms`) is episodes of beats;
  `TvView` plays the channel's programme beat by beat and the `tvProgram`
  command plays beats on a vista's screen layer. A set's condition is a saved
  story value (`stateValue`); a state swaps bezel/back/glass art and can make
  the set dead (no power) with a flicker. The knob panel is a mode of the
  same close-up (`{ "tv": "ses", "mode": "knobs" }`).
- **The Great Sharkstorm** is one saved story value plus data per state
  (`systems/hazards/sharkstorm.js`); the `sharkstorm` condition and command
  read and move it. `world/SharkstormLayer.js` reads the current state each
  frame on the main deck: pooled flying-shark passes, telegraphed impacts
  (a duty-mark ring and a growing shadow before anything lands; a hit only
  knocks the captain down), and a distant rumble once it's far off. The big
  pictures are vistas with **orbit layers** (`CinemaScene.buildOrbit`): many
  copies of a few frames circling a column in one container.
- **Dead Center profiles.** A location may carry `"profile"`; the fume layer
  tints that cloud from `PALETTES[profile]`. The second generation is new
  locations, still one value, so there is still only one Center.
- **Story text values in conditions** (`value`) and scripts (`setValue`).
- **Save version 6** keeps the layout (Phase 6 is flags, variables and
  values); the migration fills missing maps and never touches the inventory.

## The storm comes back, a second television, below decks (Phase 7)

Story Phase 7 (see [STORY_PHASE7.md](STORY_PHASE7.md)) adds no new
architecture either:

- **The Great Sharkstorm** gains two states (`returning`,
  `active_near_ship`); the value moves on from where Phase 6 left it, so
  the storm is the same one. A state's `flying.variants` lists extra
  flying-shark frame prefixes. A state's `below` makes
  `SharkstormLayer.belowDecks` play a muffled landing now and then in the
  listed rooms (sound, small shake, `falldust` from the deckhead,
  `sharkstorm_thud` event); it waits while a scene runs and never hurts.
- **A second television** is a second `tvs` record (`data/tv/ses_mk2.json`)
  with its own saved values and its own art (`bezel`, `back`, `powerFrame`
  in the def, falling back to Mark I's). `TvView` reads everything from the
  def, so the knob panel, programmes, channels and conditions all work for
  either set. New knob effects: `roll`, `shriek` and `tune` (finds a
  channel, powers the set and fires `doneFlag`, which is set before the
  picture is drawn so a programme's newest episode is already unlocked).
- **Save version 7** keeps the layout; the 6 → 7 migration fills missing
  story/world maps and never removes items.

## Battle

`BattleEngine` (`src/systems/battle/`) owns the rules and is fully
deterministic for a given seed. It is stepped by the scene:

```
start() → loop { nextTurn() → action → execute(actor, action, { timing, guard }) → endTurn(actor) } → rewards() → finish()
```

Every mutation comes back as a **presentation event** (`damage`, `miss`,
`heal`, `status`, `statusEnd`, `ko`, `summon`, `resource`, `tick`,
`outcome`, …). `BattleScene` animates events one at a time; the engine never
waits for anything.

Presentation pieces live in `src/battle/`: `BattlerView` (sprites, shadows,
status icons, enemy HP gauges), `BattleHud` (party status, command menu,
sub-menus, message plate, turn order, floating numbers, results) and
**timing presenters**.

### Timed inputs

Timed mechanics are data (`data/battle/timing.json`) with a `type`. A
presenter for that type (`src/battle/timing/`) draws its cue, reads input on
the scene clock and returns a grade (`perfect | great | good | none`); the
engine only ever sees the grade and applies the configured multiplier.

- `impactPress` — Blackbeard's cutlass: a ring closes on the target over the
  wind-up; press as it meets the gold ring. Early presses lock out (no
  mashing).
- `guardPress` — defending against enemy attacks: press as the blow lands.

Giving another character a different mini-game (hold-and-release, rhythm,
mashing) means adding a presenter and a timing entry; the rules don't change.

### Captain's Orders

Blackbeard has a **Command** resource (5 pips, starts at 2, +1 for Defend and
for GREAT/PERFECT hits). Orders are abilities of kind `order` that cost
Command: **BRACE!** (Defense ×1.5 for the whole side, 3 turns) and **FOCUS
FIRE!** (a foe takes 50% more damage, 3 turns). They are data, so later
officers can bring their own orders.

## UI

All text uses a custom pixel font (`art/font/`) rendered as Phaser bitmap
fonts in four styles (`main` with drop shadow for dark windows, `ink` without
a shadow for light parchment, `bold` outlined, `big` 2× banner). `ui/text.js`
handles markup colours (with a darker ink palette on light surfaces), tokens,
word wrap and pagination; button-prompt glyphs are never tinted. Windows are painted per size (`ui/Panel.js`), never stretched.
`ListMenu` gives every menu the same controller-first behaviour (auto-repeat,
wrap, disabled items with a buzzer, cancel). The dialogue box types text with
punctuation pauses and per-speaker voice blips; holding cancel fast-forwards.

## Input

`platform/input/bindings.js` maps physical keys and gamepad buttons (by
position: `south`, `east`, `west`, `north`, `lb`…) to abstract actions
(`confirm`, `cancel`, `menu`, `run`, `pageLeft`, …). `InputManager` is polled
once per frame (Phaser's `prestep`), tracks
`isDown / pressed / released / repeat`, lets handlers `consume` a press, and
reports the last used device so prompts show the right glyphs. Phaser's own
input plugins are disabled.

Every connected pad is read each frame, each through its own layout
(`platform/input/padLayouts.js`): the standard mapping when the browser
provides it, otherwise a layout chosen from the pad's vendor and product ids.
This matters for Firefox on macOS, which passes Xbox pads it has no remapper
for straight through (face buttons at raw 0, 1, 3, 4; the D-pad on a hat
axis) and can list another HID device ahead of the controller. Axes that rest
off-centre (triggers, stray devices) are never read as a held direction. The
F2 *Info* tab shows what each pad reports.

Some pads arrive with buttons nowhere a table can guess. One example is a
Bluetooth Xbox pad on an Apple Silicon Mac in Firefox, whose buttons shift up
by one (Mozilla bug 1707400). For those, the **Controller setup**
(`ui/panels/ControllerSetupPanel.js`) learns the layout by asking for each
button in turn:
- it covers the face buttons, Start, the bumpers and the D-pad, including a
  D-pad that reports as a hat axis;
- it opens by itself on the first press of a pad the browser doesn't map,
  and can be reopened from Options > Controller;
- in Firefox a pad reported as "standard" isn't trusted until checked
  (`InputManager.trustStandard`): the setup asks for A and B, and when
  they sit where the standard layout says it saves `{ auto: true }` and
  stops;
- the result is saved per controller id (`settings.padLayouts`), and
  `InputManager.layoutFor` prefers it over every built-in layout.

## Audio

`audio/synth` renders all music, SFX and ambience at boot into PCM buffers
(32 kHz): pulse/triangle/saw/sine and 2-operator FM voices, plucked strings,
noise drums, a small reverb, and seamless loop points. `AudioEngine` plays them
through Web Audio buses (master → music / ambience / SFX / UI), supports
cross-fades, a music stack (battle music pushes and later restores the map
music at the same position), and a low-pass "muffled" filter below decks.

## Rendering and display

The game renders at **320×224** with `pixelArt: true`. `platform/display.js`
scales the canvas by whole-number factors (or "fill" mode) with CSS and
handles fullscreen, so pixels stay square and sharp.

## Saves

See the README and [RETRO_PORT_NOTES.md](RETRO_PORT_NOTES.md#save-schema).
Autosave on map entry and after battles, three manual slots from the pause
menu, checksum + version per record, migrations table for future formats.
The schema is at version 6 (Story Phase 4 added story values: where the
Dead Center is; Phases 5 and 6 keep the layout); a save from any earlier phase
upgrades on load and walks into the next chapter.

## Testing

- `tests/` (Vitest, Node): core utilities, conditions, story, inventory,
  equipment, effects, quests, the script runner, saves (round trip, corrupt,
  tampered, newer, migrations), battle math and engine behaviour, timed-input
  tracking, guard reduction, content validation (shipped content passes;
  deliberately broken content fails with the right message) and a balance
  simulation of the prologue fights, and quest objectives done in any order.
- `e2e/` (Playwright), a real browser with real key presses:
  `prologue.spec.js` plays from New Game through both quests, saves, reloads
  and continues; `gamepad.spec.js` does the same by pad; `movement.spec.js`
  measures input latency, pixels per frame and turning back mid-step;
  `menus.spec.js` checks the shop never bleeds into the pause menu;
  `progression.spec.js` plays out of order (rats before Quill, a locked door
  without the key, holding a direction through ladders and hatches).
  `phase2.spec.js` starts every chapter preset, plays the rescue (including
  a collapse in the Dead Center), saves and continues mid-phase, plays a
  scene with choices on a gamepad, and plays all of Story Phase 2 from the
  end of the prologue to Garrick's probation. `phase3.spec.js` plays all of
  Story Phase 3, and chapters 12 to 14 from a preset. It also saves and
  continues either side of the rename, plays key scenes on an unmapped
  Firefox pad, and checks the captain can't be walled in.
  `phase4.spec.js` plays all of Story Phase 4 from the end of Phase 3
  (Shark Duty played properly: walk to each shark, face the rail, shove on
  the green), chapters 18 and 19 from a preset, the sealed washroom, the
  Forecast Board and the optional shift after the phase.
  `placements.spec.js` checks that people go where the story moved them.
  `e2e/driver.js` is the shared driver; `tools/play.mjs` runs quick scripted
  sessions for screenshots.
- **End-to-end tests are tagged** so a run can match the change:

  | Tag | What |
  | --- | --- |
  | `@smoke` | a few minutes: menus, movement, a pad, Phase 2 presets, being walled in, the Dead Center's sealed door, the Forecast Board, the S.E.S., the Mark II knob panel |
  | `@story` | the long playthroughs (prologue, Phase 2, Phase 3, chapters 12 to 14, Phase 4, chapters 18 and 19, Phase 5, chapters 23 and 24, Phase 6, Phase 7, chapters 39 to 41) |
  | `@prologue` `@phase2` `@phase3` `@phase4` `@phase5` `@phase6` `@phase7` | by part of the story |
  | `@input` `@saves` `@world` `@scenes` `@ui` | by system |

  `npm run e2e:smoke`, `npm run e2e:quick` (all but `@story`),
  `npm run e2e:story`, or `npm run e2e -- --grep @phase3`. For a faster
  full run, use `--shard=1/3` across machines, or `E2E_WORKERS=2` on one big
  enough to keep the timing tests honest.
- **Staging** is checked in two halves:
  - `content/staging.js`, run by validation, catches scripts that put
    someone in a wall, walk them through one or send them somewhere
    unreachable.
  - `tests/storyStaging.js`, run by the headless story tests with real flags
    and placements and modelling live restaging, catches:
    - anyone left standing on furniture;
    - a captain boxed in when a scene ends;
    - a room whose doorways are cut off by people from some arrival point;
    - talking to someone who isn't in the room.
- `tests/phase2_story.test.js` to `tests/phase7_story.test.js` play the Story Phases headlessly with the real
  scripts, quests and triggers and mock services, twice (always the first
  choice, always the last), and fails on any dead end, loop or script error.
  `tests/phase2.test.js` covers the fume model, variants, chapters and time of
  day, save migration 1 → 2, presets, trigger hygiene and the new options.
  `tests/phase4.test.js` covers the Dead Center (zones, rolling in, sealed
  rooms, the saved value), the bells, the Shark Duty plan, the frenzy, the
  Forecast Board and save migration 3 → 4. `tests/phase5.test.js` covers
  the television (channels, power, looks, the set on deck), panic shouts, the
  Phase 5 Shark Duty shifts and helper, and save migration 4 → 5.
  `tests/phase6.test.js` covers the Great Sharkstorm states, the S.E.S.
  conditions, programme and knob panel, the second Dead Center, the bulk
  Frog Grog (and the captain's own, untouched), and save migration 5 → 6.
  `tests/phase7.test.js` covers the storm's return (new states, shark
  variants, the below-deck thud), both televisions (Mark I wrecked, Mark II's
  art, channels, programme and `tune` knob), the empty bulk reserve, the
  torn suit and its poses, the new music and sounds, and save migration
  6 → 7 with round-trips at every Phase 7 checkpoint.

## Adding Chapter 8 (or anything else)

Nothing in the engine is prologue-specific:

1. New maps under `data/maps/<area>/`, a tileset if the look changes (plus
   painters for new tile frames in `src/art/tiles/`).
2. NPCs, portraits and appearances in their folders; dialogue and cutscenes
   under `data/dialogue/<chapter>/` and `data/story/cutscenes/`.
3. Story flags in `data/story/flags/<chapter>.json`, quests in
   `data/quests/<chapter>.json`, enemies/encounters/items/shops likewise.
4. Link the new area to an existing one with a warp (or start it from a
   cutscene `transition`), or patch an existing room with a
   `"patch": "<mapId>"` file for new placements, props, fumes and music.
5. Start the chapter from a story trigger (`data/story/triggers/`), add
   `extend` records so the crew talk about it, and add debug presets so it
   can be jumped to.

The prologue's files are never edited to add a chapter. (Phase 2 did rebuild
the treasure hold, with a save migration for anyone saved inside it. Phase 3
touched Phase 2 only to hand its ending straight on to chapter 9 and to add
a few portrait expressions.)
