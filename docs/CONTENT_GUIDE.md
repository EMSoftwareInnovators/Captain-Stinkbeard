# Content Guide

Everything the player meets — maps, crew, dialogue, quests, items, enemies,
music — is JSON under `data/`. The **folder** decides what a file contains; file
names inside a folder are free, so a new chapter is simply new files
(`data/dialogue/chapter8/…`, `data/quests/chapter8.json`, …).

After any change, run `npm run validate` (or just reload the dev server: broken
content is listed on screen before the title appears). Error messages name the
file, the entry and the path, e.g.
`data/dialogue/prologue/hale.json (hale.rats_hint) start #2: unknown speaker "ghost"`.

**Staging** is checked too, in two halves:

- Validation (static): no script spawns or places someone on a wall or on
  fixed furniture, walks them along a `path` through one, or sends them `to`
  a tile they can't reach. This covers every script whose room is known
  (from map objects, `onEnter`, story triggers with `onMap`, a
  `transition`'s `then`, `call`, or an NPC who is only ever in one room).
- The story tests (`npm test`, `tests/storyStaging.js`) replay Story Phases 2
  and 3 with the real flags, props and placements, and after every scene
  check that:
  - nobody is left standing on a solid tile;
  - the captain isn't boxed in by walls and people;
  - from every arrival point of every room, every doorway can still be
    reached past the people standing there (a `"blocks": true` gate
    excepted);
  - everyone the story needs a word with is actually in the room.

  These tests caught the galley crowd that trapped the captain in the cargo
  hold after the Frog Grog.

- [Conventions](#conventions)
- [Game setup](#game-setup-datagamejson)
- [Characters, appearances and portraits](#characters-appearances-and-portraits)
- [NPCs](#npcs-datanpcs)
- [Dialogue and cutscenes (scripts)](#dialogue-and-cutscenes-scripts)
- [Conditions](#conditions)
- [Story flags and variables](#story-flags-and-variables)
- [Quests](#quests-dataquests)
- [Items, equipment and shops](#items-equipment-and-shops)
- [Abilities, statuses and timing](#abilities-statuses-and-timing)
- [Enemies and encounters](#enemies-and-encounters)
- [Maps](#maps-datamaps)
- [Tilesets and props](#tilesets-and-props)
- [Audio](#audio)
- [Recipes](#recipes)

## Conventions

- Ids are `lower_snake_case` and unique within their kind.
- Positions are **tiles** (16×16 px); `x` grows right, `y` grows down.
- Directions: `up`, `down`, `left`, `right`.
- Text supports colour markup — `<y>gold</>`, `<r>red</>`, `<g>green</>`,
  `<b>blue</>`, `<p>purple</>`, `<c>cyan</>`, `<o>orange</>`, `<k>grey</>` —
  and tokens: `{ship}` (any key of `game.json` `constants`), `{player}`,
  `{gold}`, `{item:hardtack}`, `{var:name}`, `{btn:confirm}` (the button glyph
  for the active keyboard/pad).
- A `"//"` key is a comment and is ignored.

## Game setup (`data/game.json`)

```json
{
  "title": "Captain Stinkbeard",
  "chapterName": "Prologue",
  "titleMusic": "title",
  "constants": { "ship": "the Revenge" },
  "newGame": {
    "party": ["blackbeard"], "gold": 40,
    "items": [{ "id": "hardtack", "count": 3 }],
    "flags": [],
    "map": "captains_quarters", "spawn": "start", "facing": "down",
    "startScript": "cutscene.opening"
  }
}
```

`data/progression/leveling.json` holds `maxLevel` and `totalXp` — the total XP
needed to reach each level (`totalXp[n]` reaches level `n + 1`).

## Characters, appearances and portraits

**Playable characters** — `data/characters/*.json` (a list):

```json
{
  "id": "blackbeard", "name": "Blackbeard", "title": "Captain",
  "aliases": ["captain"], "appearance": "blackbeard", "portrait": "blackbeard",
  "voice": { "pitch": 0.62 }, "startLevel": 1,
  "baseStats": { "maxHp": 64, "attack": 14, "defense": 9, "speed": 9, "luck": 6 },
  "growth":    { "maxHp": 9,  "attack": 2,  "defense": 1.5, "speed": 1, "luck": 0.6 },
  "startEquipment": { "weapon": "cutlass", "body": "captains_coat", "feet": "sea_boots", "accessory": null },
  "learnset": [{ "level": 1, "ability": "order_brace" }, { "level": 2, "ability": "order_focus_fire" }],
  "battle": {
    "attack": "cutlass_slash",
    "guard": "guard",
    "resource": { "id": "command", "name": "Command", "short": "CMD", "max": 5, "start": 2,
                  "onDefend": 1, "onTiming": { "great": 1, "perfect": 1 } }
  }
}
```

A stat at level L is `floor(base + growth × (L − 1))` plus equipment. `aliases`
let scripts say `captain:` instead of `blackbeard:`. `battle.guard` names the
timing entry used when this character guards (default `guard`).

**Extra speakers** (voices with no NPC, e.g. an off-screen crew shout) —
`data/characters/speakers.json`: `{ "id", "name", "portrait"?, "voice"? }`.

**Appearances** — `data/appearances/*.json` describe how a person is painted
(field sprites, battle sprites and portrait bust):

```json
{
  "id": "hale", "build": "thin", "skin": "dark",
  "hair": { "style": "cropped", "color": "salt" },
  "beard": { "style": "mustache", "color": "grey" },
  "hat": { "style": "tricorn", "color": "black", "trim": "gold" },
  "outfit": { "style": "coat", "primary": "navy", "secondary": "white", "pants": "charcoal", "boots": "black", "trim": "gold" },
  "extras": ["spectacles"]
}
```

| Field | Options |
| --- | --- |
| `build` | `small` `medium` `thin` `stout` `large` `huge` |
| `skin` | `pale` `light` `tan` `olive` `brown` `dark` |
| hair `style` | `bald` `short` `long` `ponytail` `bun` `wild` `curly` `cropped` |
| hair/beard `color` | `black` `darkbrown` `brown` `ginger` `blond` `grey` `white` `salt` |
| beard `style` | `none` `stubble` `mustache` `full` `great` `goatee` `sideburns` |
| hat `style` | `none` `tricorn` `bandana` `kerchief` `knitcap` `tophat` |
| outfit `style` | `shirt` `vest` `coat` `longcoat` `striped` `dress` `apron` (+ `rolledSleeves`, `barefoot`, `apron`) |
| cloth colours | `red` `crimson` `navy` `blue` `teal` `green` `olive` `plum` `black` `charcoal` `grey` `brown` `tan` `cloth` `white` `mustard` `rust` `leather` `gold` `iron` |
| `extras` | `apron` `baldric` `cutlass` `earring` `eyepatch` `neckerchief` `pipe` `sash` `spectacles` |

**Portraits** — `data/portraits/*.json`:

```json
{ "id": "hale", "appearance": "hale", "face": "long", "nose": "pointed", "brows": "heavy",
  "age": "old", "eyeColor": "#2a1a10",
  "expressions": ["neutral", "happy", "concerned", "annoyed", "surprised"] }
```

Faces: `square` `round` `long` `young` `broad`. Expressions available:
`neutral` `annoyed` `angry` `surprised` `concerned` `happy` `laugh` `smug`
`sad` `determined` — list the ones this person uses; dialogue asking for any
other expression is a validation error.

## NPCs (`data/npcs/`)

```json
{
  "id": "quill", "name": "Josiah Quill", "title": "Quartermaster",
  "appearance": "quill", "portrait": "quill", "voice": { "pitch": 1.1 },
  "behavior": { "type": "stand", "lookAround": true },
  "turnToTalk": true,
  "dialogue": [
    { "if": { "objectiveActive": "rats_in_the_hold.report_back" }, "script": "quill.rats_report" },
    { "if": { "questActive": "rats_in_the_hold" }, "script": "quill.rats_reminder" },
    { "cycle": ["quill.idle_1", "quill.idle_2"] },
    { "script": "quill.default" }
  ]
}
```

`dialogue` is checked top to bottom; the first entry whose `if` passes wins.
`cycle` plays its scripts in turn on each conversation.

**Behaviours** (can be overridden per map placement):

| Type | Fields | Meaning |
| --- | --- | --- |
| `stand` | `lookAround` | stays put, glances around |
| `wander` | `radius` | random steps near home |
| `work` | — | loops the work animation (swabbing, stirring…) |
| `sit` | — | seated pose |
| `routine` | `steps` | loops steps: `{ "go": [x, y] }`, `{ "wait": ms }`, `{ "face": "left" }`, `{ "anim": "work", "ms": 3000 }`, `{ "emote": "note" }` |

Place an NPC with a map object: `{ "id": "quill", "type": "npc", "npc": "quill", "x": 11, "y": 6, "facing": "down", "if": { … } }`.
The same NPC may appear on several maps (or twice on one map under different
conditions — the first matching placement is used).

### Placements are live: where people are after a scene

Placements are the one source of truth for where people stand. They are not
only read when a room loads. Once a scene ends (and any scene it sets off
straight away), the room is **restaged**: these people go where the
placements now say:

- everyone whose placement changed, because the story moved on;
- everyone the scene positioned by script (`spawn`, `place`, `move`, `fly`,
  `despawn`).

They walk to their new spot, walk in from the nearest arrival point (a map
`spawn`), or walk out through one, fading in or out at the door. Anyone who
is stuck behind people for 3 seconds fades across instead. Extras a scene
spawned under their own `id` have no placement, so they leave. The room you
see after a scene is therefore the room a reload would build.

What this means when writing:

- **To leave someone somewhere after a scene, give them a placement there**
  under the flags the scene sets. The scene can still walk them over itself.
  If it doesn't, restaging does. Example: `garrick_by_chest` in
  `treasure_hold.json` keeps Garrick by the chest between the chest move and
  the blast.
- **Don't spawn people just so they are in the room.** If their placement
  has them there, they are there. Spawn and move people for the choreography
  of a scene; the placements tidy up afterwards.
- `{ "restage": "walk" }` restages mid-scene and waits until everyone has
  arrived (the crew gathers). `{ "restage": "cut" }` puts everyone in place
  at once, which is best behind a `fade`. Add `"async": true` to carry on
  without waiting.
- A placement with `"blocks": true` is a deliberate gate (Garrick's toll on
  the Phase 2 deck). The captain can normally squeeze past someone standing
  in his way by walking into them for a moment (they swap places), but not
  past a gate unless he is boxed in on every side.

## Dialogue and cutscenes (scripts)

Files under `data/dialogue/**` and `data/story/cutscenes/**` are maps of
**script id → script**. A script is a list of steps, or an object of labelled
nodes where `start` runs first:

```json
{
  "hale.rounds_intro": {
    "start": [
      "hale: Captain. Morning watch is set.",
      "captain[annoyed]: Fed already? What did Mags burn this time?",
      { "goto": "topics" }
    ],
    "topics": [
      { "choice": [
        { "text": "How's the crew?", "then": ["hale: Rested, paid and bored."], "goto": "topics" },
        { "text": "That'll do.", "goto": "finish" }
      ] }
    ],
    "finish": ["hale: I'll be about the deck.", { "setFlag": "met_first_mate" }]
  }
}
```

**Lines** are strings `speaker[expression]: text`. The speaker is an NPC,
character (or alias) or extra speaker id; the portrait and name plate come from
it. A line with no `speaker:` prefix is narration. Long lines paginate
automatically.

**Branches**: `{ "if": <condition>, "then": <steps or label>, "else": <steps or label> }`.
Any command can also carry `"if"` to run only when the condition holds.

**Choices**: `{ "choice": [ { "text", "if"?, "then"?, "goto"? } ], "prompt"?, "cancel"? }`.
Options whose `if` fails are hidden. `cancel` is the option index chosen by
the cancel button (default: the last option).

### Commands

| Command | Parameters | Effect |
| --- | --- | --- |
| `goto` | label | jump to a node |
| `end` | `true` | stop the script |
| `call` | script id | run another script, then continue |
| `wait` | ms | pause |
| `parallel` | `[[steps], [steps]]` | run branches together, continue when all finish |
| `choice` | see above | menu |
| `say` | text, `speaker`, `expr`, `name` | explicit line (e.g. a one-off name) |
| `narrate` | text | narration box |
| `close` | `true` | close the dialogue box now |
| `tutorial` | text, `title` | parchment tip box |
| `banner` | text, `sub` | chapter-style banner |
| `setFlag` / `clearFlag` | flag or list | story flags |
| `setVar` / `addVar` | name, `value` | story variables |
| `giveItem` / `takeItem` | item, `count`, `silent` | inventory (with a notice unless silent) |
| `giveGold` / `takeGold` | amount, `silent` | gold |
| `startQuest` | quest, `silent` | start a quest |
| `completeObjective` | `"quest.objective"` | finish an objective |
| `advanceObjective` | `"quest.objective"`, `amount` | add progress |
| `completeQuest` | quest | complete (grants rewards) |
| `heal` | `"party"` or character | full heal |
| `giveXp` | amount | XP to the party (with level ups) |
| `event` | name | fires `script:event` (for `event` objectives) |
| `markObject` | `"map:object"`, `set: {…}` | store per-object state |
| `joinParty` / `leaveParty` | character | party changes |
| `save` | `"auto"` | autosave |
| `sfx` / `music` / `ambience` | id (`music` takes `fade` ms; `null` for silence) | audio |
| `move` | actor, `path` (`["up", 2, "left", 1]`) or `to` `[x, y]`, `speed` (`walk`, `run`, `slow` or ms per tile), `face`, `async` | walk an actor; `async` doesn't wait |
| `face` | actor, `dir` (a direction, `"player"` or another actor) | turn |
| `anim` | actor, `name` (`idle`, `walk`, `work`, `sit`, `point`, `surprised`, `fallen`, plus any extra pose the appearance opts into: `carry`, `smug`, `greedy`, `eat`, `nervous`, `clutch`, `panic`, `relief`, `slouch`, `hips`, `shrug`, `excited`; parrots: `fly`, `squawk`, `furious`, `shiver`), `duration` | pose (`carry` also switches walking to the carrying walk) |
| `emote` | actor, `icon` (`exclaim`, `question`, `ellipsis`, `anger`, `sweat`, `note`, `heart`, `zzz`), `duration` | speech bubble icon |
| `spawn` | npc, `id`, `x`, `y`, `facing` | add an NPC for the scene |
| `despawn` | actor | remove |
| `place` | actor, `x`, `y`, `facing` | teleport on the map |
| `restage` | `walk` or `cut`, `async` | put people where the placements now say, mid-scene (see "Placements are live"); `async` lets them walk while the scene goes on (the crew scattering at the bells) |
| `camera` | `pan` (`x`,`y` or `actor`), `follow` (`actor`), `reset`; `duration` | camera (end a scene with `reset`; if you forget, the camera glides back to the captain once he has control) |
| `shake` | intensity, `duration`, `to` (escalate to this intensity), `async` | screen shake (scaled by the Screen shake option) |
| `flash` | `"#rrggbb"`, `duration` | screen flash |
| `fade` | `in`/`out`, `duration`, `color` | full-screen fade |
| `transition` | map, `spawn` or `x`/`y`, `facing`, `then` (script to run on arrival), `hidePlayer`, `fade` (ms), `keepMusic`, `noAutosave` | change map (ends the script; `then` continues the scene in the new room) |
| `showObject` / `hideObject` | object or actor id | visibility |
| `effect` | `slash`, `impact`, `sparkle`, `buff`, `debuff`, `smoke`…, `actor` or `x`/`y` | one-shot effect |
| `battle` | encounter, `win` steps, `lose` steps | fight, then branch on the result |
| `fly` | actor, `to` `[x, y]`, `from`, `fromAlt`, `alt`, `arc`, `duration`, `land` | through the air, ignoring walls (a parrot, a man hauled aboard) |
| `hop` | actor, `height`, `duration` | a little jump |
| `bark` | actor or `"none"` (with `x`, `y`), `text`, `duration`, `shout` | speech bubble that doesn't stop the game |
| `burst` | `coins`, `gems`, `splinters`, `feathers`, `sparkle`, `fume`, `odor`, `splash`, `dust`, `dishes`; `actor` or `x`/`y`, `count` | particle burst (pooled, capped) |
| `propFx` | `jiggle`, `swing`, `fall`, `frame`; `prop` (placement `id` or prop id) or `area` `[x, y, w, h]`, `duration`, `intensity` | shake the room's furniture |
| `roll` | degrees, `duration` | tilt the view (the ship heeling) |
| `sprite` / `moveSprite` / `spriteFrame` / `removeSprite` | id, `frame`, `x`/`y` in tiles, `anim`, `below`, `depth`, `bob`; move: `x`, `y`, `alpha`, `scale`, `angle`, `duration` | free stage sprites (a bathtub alongside, a rowboat) |
| `tether` | `on` (with `x`, `y`) / `off` | the rescue rope, trailing the captain's path |
| `respawn` | spawn id or `"safe"` | put the captain somewhere breathable |
| `fumeCloud` | id, `level`, `x`, `y`, `w`, `h`, `grow` (ms), `remove` | a temporary fume zone for a set-piece |
| `vista` / `vistaEnd` | vista id, `mask`, `caption`, `fade` | full-screen illustrated shot (data/story/vistas) |
| `vistaMove` / `vistaFrame` / `vistaShow` / `vistaFx` | layer id; `x`, `y`, `scale`, `alpha`, `flip`, `duration` / `frame` / `visible` / burst kind at `x`, `y` | animate a vista layer |
| `insert` | insert id, `caption`, `hold` | framed close-up (a label, a sign, a document) |
| `shop` | shop id | open a shop and wait until it closes |
| `logbook` | log id, `entry` | open a logbook (the Stench Log) in the world; waits until it is closed |
| `swapItem` | item, `to` item, `bonus`, `silent` | turn every copy of one item into another (all the rum becomes Frog Grog) |
| `tint` | actor, `color` `"#rrggbb"`, `duration`, `async` | tint an actor for a moment (turning green) |
| `sharks` | level or `"auto"`, `crowd` | hold a shark level for the scene (`crowd`: how many distant fins to draw); `auto` hands it back to the map |
| `sharkEvent` | `bite` (`x`, `y` hull tile), `ram`, `flop` (`x`, `y` deck tile), `return`, `lure` (`x`, `y`, `duration`), `follow`, `unfollow`, `frenzy` (`x`, `y`: the scent on the hull), `calm`, `thrash` (`x`, `y`), `hammerhead` (`x`, `y`); `async` | staged shark moments |
| `repair` | kind (`hull`, `rope`, `helm`, `shark`), `strikes`, `title`, `var`, `speed` (marker speed scale), `zone` (green width, px) | the timing game (patch, haul, hold the wheel, shove a shark); clean strikes go into `var` |
| `deadCenter` | location id or `"none"` | where the Dead Center is now (Phase 4; see below) |
| `alarm` | level 1-4, `where`, `wait` | ring the bell protocol: shown in words and heard; carries on unless `wait` |
| `course` | `show` (`heading`, `target`, `label`), `drift` (`to`, `duration`), `hide`; `async` | the course dial (the ship falling off her heading) |
| `sharkDuty` | `"clear"` | send every shark at the rail away at once (standing down) |

Actors are `player` (or `captain`) or the id of an NPC/actor on the map.

**Where scripts run**: NPC conversations, `inspect` objects, props' inspect
text, `trigger` objects, map `onEnter` lists, a `transition`'s `then`, story
triggers, `newGame.startScript`, quest `onComplete`, locked warps' `locked`,
a map's `fumeCollapse`, and `call`.

A step may name a parameter that is also a command (`move` with `face`,
`transition` with `spawn` and `fade`, `sprite` with `anim`): the command is
the one whose parameter list contains the others.

## Conditions

Used by `if` everywhere (dialogue selectors, steps, choices, map objects, warps, onEnter):

| Condition | Example |
| --- | --- |
| `flag` / `notFlag` | `{ "flag": "met_first_mate" }` |
| `anyFlag` | `{ "anyFlag": ["a", "b"] }` |
| `questActive`, `questCompleted`, `questStarted`, `questNotStarted`, `questNotCompleted` | `{ "questActive": "rats_in_the_hold" }` |
| `objectiveDone`, `objectiveNotDone`, `objectiveActive` | `{ "objectiveActive": "captains_rounds.report" }` |
| `hasItem` / `lacksItem` | `{ "hasItem": "treasure_key" }`, `{ "hasItem": { "id": "hardtack", "count": 3 } }` or a list |
| `gold` | `{ "gold": 50 }` (at least 50) or `{ "gold": { "lt": 10 } }` (`eq`, `ne`, `gt`, `gte`, `lt`, `lte`) |
| `var` | `{ "var": { "name": "rats_killed", "gte": 3 } }` |
| `partyHas` / `partyLacks` | `{ "partyHas": "blackbeard" }` |
| `level` | `{ "level": 3 }` or `{ "level": { "lt": 5 } }` (party leader) |
| `visited` / `notVisited` | `{ "visited": "cargo_hold" }` |
| `onMap` | `{ "onMap": "main_deck" }` (the captain's current map) |
| `objectState` | `{ "objectState": { "key": "cargo_hold:gunnery_crate", "opened": true } }` |
| `all` / `any` / `not` | `{ "all": [ … ] }`, `{ "not": { … } }` |
| `always` / `never` | `{ "always": true }` |
| `deadCenter` | `{ "deadCenter": "galley_breakfast" }` or a list (any of): where the Dead Center is (Phase 4) |

## Story flags and variables

Every flag must be declared (`data/story/flags/*.json`), which catches typos:

```json
[{ "id": "met_first_mate", "description": "Blackbeard has had his morning briefing with Mister Hale." }]
```

Undeclared flags are validation errors, and declared-but-unused flags produce
warnings. Variables (`setVar`, `addVar`, `var` conditions, `{var:name}`) are
free-form integers. Story **values** are named text (saved since save version
4); the one in use is where the Dead Center is (`deadCenter` command and
condition, `{deadCenter}` in text).

## Quests (`data/quests/`)

```json
{
  "id": "rats_in_the_hold", "title": "Rats in the Hold", "category": "main", "giver": "quill",
  "summary": "Something has been eating the ship's biscuit.",
  "description": "Quill's ledger won't balance…",
  "objectives": [
    { "id": "talk_quartermaster", "text": "Speak to the Quartermaster", "type": "talk", "target": "quill" },
    { "id": "enter_hold", "text": "Enter the Cargo Hold", "type": "visit", "target": "cargo_hold" },
    { "id": "clear_hold", "text": "Defeat the rats", "type": "defeat", "count": 3,
      "objects": ["cargo_hold:rats_1", "cargo_hold:rats_2", "cargo_hold:rats_nest"] },
    { "id": "report_back", "text": "Report back", "type": "talk", "target": "quill", "after": ["talk_quartermaster", "clear_hold"] }
  ],
  "rewards": { "xp": 40, "gold": 60, "items": [{ "id": "healing_tonic", "count": 1 }], "flags": ["rat_problem_complete"] },
  "onComplete": "cutscene.tutorial_done"
}
```

| Objective type | Progresses when | Fields |
| --- | --- | --- |
| `talk` | a conversation with the NPC ends | `target` (NPC id) |
| `inspect` | an object is inspected | `target` `"map:object"` or `tag` |
| `visit` | a map or region is entered | `target` (map id or region id) |
| `defeat` | a battle is won, or (with `objects`) the listed field enemies are beaten | `target` (encounter id), `tag` (encounter tag) or `enemy` (counts each one), plus `count`; or `objects` (`"map:object"` enemy ids) |
| `obtain` | the inventory holds enough | `item`, `count` |
| `event` | a script fires `{ "event": name }` | `target` |
| `flag` | a story flag is set | `target` |
| `manual` | only by `completeObjective` | — |

`after` lists objectives that must be done first (they stay hidden in the quest
log until then); `optional: true` objectives don't block completion.

**Let players do things early.** Anything the player can do before the quest
asks for it must still count. `obtain`, `flag`, `visit` (the current map) and
`defeat` with `objects` follow saved state rather than one-off events: they are
checked when the quest starts, when an objective unlocks, whenever the state
changes and when a save loads. So rats beaten before Quill hands out the job
still count, and old saves repair themselves. Prefer these for anything
permanent (a map enemy stays beaten; a `tag` count only sees battles won while
the objective is active), keep `after` for things that genuinely can't happen
earlier (usually the final report), and give the quest giver a dialogue
selector for "already done" (see `quill.rats_already_done`). One event
completes at most one step of a chain: a single conversation can't finish
"talk to Quill" and "report to Quill" together. A quest
completes when all required objectives are done: rewards are granted, toasts
shown and `onComplete` runs when the player is free. Categories `main` and
`side` sort the quest log.

## Items, equipment and shops

`data/items/*.json`, one list per file. `type` is `consumable`, `key` or
`equipment`; `icon` names an item icon (`hardtack`, `tonic`, `rum`, `bandage`,
`rusty_key`, `treasure_key`, `fuse`, `cutlass`, `axe`, `coat`, `boots`,
`doubloon`, `charm`, `fishbone`, `gold`, `ledger`, `shirt`); `value` is the
shop price (sold for half).

```json
{ "id": "healing_tonic", "name": "Healing Tonic", "type": "consumable", "icon": "tonic", "value": 20,
  "description": "Doc Fennimore's own recipe. Restores 45 HP.",
  "use": { "target": "ally", "context": ["field", "battle"], "effects": [{ "type": "heal", "amount": 45 }] } }

{ "id": "boarding_axe", "name": "Boarding Axe", "type": "equipment", "slot": "weapon", "icon": "axe", "value": 70,
  "stats": { "attack": 9, "speed": -1 }, "equipBy": ["blackbeard"] }
```

- `use.target`: `ally`, `allies`, `enemy`, `enemies`, `self`; `context`:
  where it can be used.
- Effects: `heal` (`amount` or `percent`), `revive` (`percent`), `cure`
  (`status`, or `"debuffs"`), `applyStatus` (`status`, `duration`, `chance`),
  `restore` (`resource`, `amount`). Statuses only exist in battle.
- Equipment slots: `weapon`, `body`, `feet`, `accessory`; stats: `maxHp`,
  `attack`, `defense`, `speed`, `luck`. `locked: true` gear can't be removed.
- Key items never stack beyond one and can't be sold.

**Shops** (`data/shops/`): `{ "id", "name", "keeper": npc id, "greeting", "items": [ids], "prices"?: { id: price } }`,
opened from a script with `{ "shop": "galley_stores" }`.

## Abilities, statuses and timing

**Abilities** (`data/abilities/`):

```json
{ "id": "cutlass_slash", "name": "Cutlass", "kind": "attack", "target": "enemy",
  "power": 100, "accuracy": 100, "timing": "cutlass_strike", "anim": "slash", "sfx": "sword_hit" }
{ "id": "order_brace", "name": "Brace!", "kind": "order", "target": "allies", "cost": { "command": 1 },
  "effects": [{ "type": "applyStatus", "status": "braced", "duration": 3 }], "shout": "BRACE!", "sfx": "buff" }
```

`kind`: `attack`, `skill`, `order`, `summon` (`summon`: enemy id,
`maxAllies`). `target`: `enemy`, `enemies`, `ally`, `allies`, `self`. Optional:
`hits`, `critBonus`, `sureHit`, `cost` (`{ resourceId: n }`), `effects`,
`timing` (a timing mechanic), `shout` (orders), `description`.

**Statuses** (`data/statuses/`): `{ "id", "name", "kind": "buff"|"debuff", "duration", "expires"?: "turnStart", "modifiers"?: { "attack": 1.25, "defense": 0.75, "damageTaken": 1.5 }, "tick"?: { "damagePercent": 5, "min": 2 } }`.
Status icons exist for `braced`, `defending`, `marked`, `sickened`,
`emboldened`, `rattled`.

**Timing mechanics** (`data/battle/timing.json`):

```json
"cutlass_strike": { "type": "impactPress", "windows": { "perfect": 45, "great": 95, "good": 165 },
                    "multipliers": { "perfect": 1.5, "great": 1.3, "good": 1.15, "none": 1.0 },
                    "windupMs": 420, "earlyLockoutMs": 260 },
"guard": { "type": "guardPress", "windows": { "perfect": 55, "good": 130 },
           "reduction": { "perfect": 0.5, "good": 0.75, "none": 1.0 } }
```

Windows are milliseconds either side of the impact. `type` selects the
presenter in `src/battle/timing/`.

## Enemies and encounters

```json
{ "id": "large_bilge_rat", "name": "Large Bilge Rat", "sprite": "large_bilge_rat",
  "stats": { "maxHp": 60, "attack": 14, "defense": 6, "speed": 6, "luck": 5 },
  "abilities": ["rat_bite", "rat_gnash", "rat_squeal"],
  "ai": [
    { "ability": "rat_squeal", "weight": 3, "if": { "alliesAliveBelow": 2, "selfHpBelow": 75 } },
    { "ability": "rat_gnash", "weight": 2 },
    { "ability": "rat_bite", "weight": 3 }
  ],
  "xp": 22, "gold": [8, 14],
  "drops": [{ "item": "rusty_key", "chance": 1.0 }],
  "tags": ["vermin", "rat", "boss"] }
```

AI entries are weighted; their `if` supports `selfHpBelow`, `selfHpAbove`
(percent), `alliesAliveBelow`, `turnMultiple`, `chance` (percent) and
`targetLacksStatus`. `sprite` must be an enemy painter in
`src/art/enemies/enemyPainters.js` (`bilge_rat`, `large_bilge_rat`,
`sparring_sailor`, `cutthroat`).

**Encounters** (`data/encounters/`):

```json
{ "id": "hold_rats_nest", "enemies": ["large_bilge_rat", "bilge_rat"], "backdrop": "cargo_hold",
  "music": "battle", "tags": ["hold_rats"], "canFlee": false, "nonLethal": false, "tutorial": false,
  "intro": "The matriarch rises from her nest!", "loseText": "…" }
```

Backdrops: `cargo_hold`, `main_deck`, `captains_quarters`. `nonLethal`
battles return to the map on defeat (HP 1) instead of Game Over;
`tutorial` shows the battle tutorial the first time. Put the encounter on a
map as a visible enemy:

```json
{ "id": "rats_1", "type": "enemy", "encounter": "hold_rats_1", "x": 12, "y": 8,
  "wander": 2, "chase": 4, "if": { "questActive": "rats_in_the_hold" } }
```

Defeated map enemies stay defeated (saved per `map:object`).

## Maps (`data/maps/`)

```json
{
  "id": "galley", "name": "Galley", "tileset": "ship",
  "music": "ship_theme", "musicFilter": "muffled", "ambience": "below",
  "background": "void",
  "lighting": { "ambient": "#a08a80", "lights": [{ "x": 3, "y": 5, "radius": 40, "color": "#ffb060" }] },
  "legend": { " ": "void", ".": "floor", "W": "wall", "#": "ladder", "v": "exit_s" },
  "tiles": [
    "                  ",
    "[WWWWWWWWWWWWW#WW]",
    "[................]",
    "{_______v________}"
  ],
  "overhead": ["…same size, spaces are empty…"],
  "props": ["stove 1 4", "barrel 5 7 flip", { "prop": "table", "x": 5, "y": 6 }],
  "objects": [ … ],
  "onEnter": [{ "if": { "notFlag": "galley_argument_seen" }, "script": "cutscene.galley_argument" }],
  "regions": [{ "id": "galley_stove", "x": 1, "y": 4, "w": 3, "h": 2 }],
  "ambient": [{ "kind": "smoke", "x": 2, "y": 3 }],
  "bob": 1
}
```

- `tiles` rows must all be the same width; each character maps through
  `legend` to a tile type of the tileset.
- `background`: `void` (dark) or `ocean` (animated sea around the ship);
  `bob` sets the height of the ocean swell around the ship (pixels).
- `musicFilter: "muffled"` low-passes the music (below decks).
- `ambient` life: `wake`, `gulls`, `smoke` (x, y), `perchedGull` (x, y),
  `sailShadow` (x, y).

**Objects**:

| Type | Fields |
| --- | --- |
| `spawn` | `x`, `y`, `facing` — entry points for warps and `newGame` |
| `warp` | `x`, `y`, `w`, `h`, `to: { map, spawn }` (or `x`/`y`/`facing`), `sfx`, `if` (a live lock, see below), `locked` (script run when the lock holds) |
| `npc` | `npc`, `x`, `y`, `facing`, `behavior`, `pose`, `if`, `absent` (this placement means "not in this room"), `blocks` (a deliberate gate: no squeezing past) — the first placement per NPC whose `if` holds wins, live |
| `enemy` | `encounter`, `x`, `y`, `sprite`, `wander`, `chase`, `facing`, `if` |
| `inspect` | `x`, `y`, `w`, `h`, and `text` (lines), `script`, or `dialogue` (selectors like NPCs); `tags` |
| `chest` | `x`, `y`, `w`, `prop`, `items`, `gold`, `text` — opened once, remembered |
| `trigger` | `x`, `y`, `w`, `h`, `script`, `once` (default true), `if` — runs when stepped on |
| `block` | `x`, `y`, `w`, `h`, `if` — invisible wall (live: appears and disappears with the story) |

Inspecting fires `object:inspected` with id `"map:object"`, which `inspect`
objectives use (`"treasure_hold:hoard"`).

On every other object `if` decides whether it exists when the map loads. On a
**warp** it is a lock, checked each time: while it fails the warp's tile is
solid, walking into it bumps and runs `locked`, and so does pressing Confirm
facing it. It opens the moment the condition holds (pick up the key and the
door works without leaving the room).

**Spawns next to warps.** Directions held when a map loads never carry the
player onto a warp: they must be released first. Put a spawn on the tile
beside its ladder or hatch, facing away from it (`"facing": "up"` below a
hatch you just climbed out of), so arriving and walking on feels natural.

**Story-driven map fields** (all optional):

```json
"musicVariants": [{ "if": { "flag": "guzzlegut_gust" }, "music": "yellow_alert", "ambience": "hold_fumes" }],
"lightingVariants": [{ "if": { "flag": "trial_started" }, "ambient": "#c08870" }],
"haze": [{ "if": { "flag": "fumes_thinned" }, "level": "faint" }, { "if": { "flag": "guzzlegut_gust" }, "level": "dense" }],
"fumes": [{ "id": "core", "level": "center", "x": 3, "y": 4, "w": 4, "h": 3, "if": { … },
           "path": [[3, 4], [6, 4]], "periodMs": 9000 }],
"fumeCollapse": "hazard.collapse_hold",
"fumeSafeSpawn": "stairs"
```

The first variant whose `if` holds wins, and the map switches live when the
story changes. Props also take `if`, an `id` (for `propFx`/`hideObject
"prop:<id>"`), `depthOffset` and `alpha`; a conditional solid prop is a live
wall. Inspect objects and triggers check `if` live. `ambient` entries take
`if`, and two more kinds: `glitter` (sparkles in an area: `x`, `y`, `w`, `h`,
`every`) and `voice` (`x`, `y`, `lines`, `every` `[min, max]` ms, `sfx`,
`loopFrom`: someone calling out, checked live).

## Story Phase 2 formats

### Patching a map from a later chapter

A file with `"patch": "<mapId>"` (for example
`data/maps/ship/phase2/galley.patch.json`) extends that map without editing
it. `objects`, `musicVariants`, `lightingVariants` and `haze` are placed
**before** the base map's (so a conditional placement overrides an older
one); `props`, `onEnter`, `regions`, `ambient`, `fumes` and `collision` are
appended; `lights` add to the lighting; `fumeCollapse` and `fumeSafeSpawn`
replace. Anything else is an error.

### Extending NPCs and characters, look variants

```json
{ "extend": "hale", "dialogue": [ { "if": { "flag": "trial_started" }, "script": "hale.tr" } ] }
{ "id": "squawks", …, "variants": [
  { "if": { "flag": "squawks_sweater" }, "appearance": "squawks_sweater", "portrait": "squawks_sweater" },
  { "if": { "flag": "squawks_bald" }, "appearance": "squawks_bald", "portrait": "squawks_bald" } ] }
```

`extend` puts dialogue selectors ahead of the original ones and adds
variants. Variants (first match wins) may change `appearance`, `portrait`,
`name`, `voice` and `shadow`; sprites and portraits swap the moment the flag
changes, in the world and in the dialogue box.

### Chapters and time of day (`data/game.json`)

```json
"chapters": [{ "id": "ch1", "name": "Chapter 1: The Man in the Bathtub", "if": { "flag": "ch1_morning_started" } }],
"timeOfDay": [{ "id": "evening", "grade": "#f2b894", "interior": 0.45, "if": { "flag": "trial_started" } }]
```

The last entry whose `if` holds is current. The chapter name shows in the
save list and the debug overlay; the time of day is a colour grade multiplied
over the world (`interior` is how much of it reaches below decks).

### Story triggers (`data/story/triggers/`)

```json
{ "id": "ch2_begin", "if": { "all": [{ "questCompleted": "strange_cargo" }, { "questNotStarted": "new_recruit" }] },
  "script": "ch2.begin", "once": false }
```

Checked whenever the story changes and the world is idle (never mid-scene).
Use `"once": false` with a condition the script clears straight away
(`startQuest`, `setFlag`): then an interrupted trigger simply runs again after
loading. Add `onMap` when the scene needs a particular room.

### Vistas (`data/story/vistas/`) and inserts

```json
"bathtub_view": { "sky": "morning", "sea": "morning", "horizon": 132, "mask": "telescope",
  "layers": [{ "id": "tub", "frame": "tub_0", "frames": ["tub_0", "tub_1"], "frameMs": 340,
               "x": 226, "y": 140, "scale": 0.45, "bob": 2 }] }
```

Skies and seas: `morning`, `day`, `afternoon`, `evening`, `sunset`, `dusk`.
Layers are screen pixels anchored bottom-centre, and can be `hidden`, `flip`,
`alpha`, `scale`, `depth`. Keep subjects above y ≈ 158: the dialogue box
covers the rest. Inserts (`eel_jar_label`, `toll_sign_close`,
`probation_rules`, `charge_sheet`) are painted in `src/art/inserts/`.

### Fumes (`data/hazards/fumes.json`)

Levels `light` (no exposure), `dense` and `center` (the Dead Center), each
with an exposure rate per second and a visibility; `recoverPerSec`,
`lightRecoverPerSec`, `max` and `warnAt`. Map zones and haze are described
above. Collapsing runs the map's `fumeCollapse` script (default
`hazard.fume_collapse`), which should `respawn` the captain somewhere safe.

### Debug presets (`data/debug/presets.json`)

```json
{ "id": "squawks_rescue", "name": "Squawks Rescue", "after": "post_blast",
  "flags": ["squawks_fell"], "clearFlags": [], "vars": {},
  "quests": { "yellow_alert": "completed", "save_squawks": "active", "treasure_inspection": { "done": ["meet"] } },
  "items": ["treasure_key"], "map": "main_deck", "x": 9, "y": 21, "facing": "down" }
```

`after` chains presets (flags accumulate, quests apply in order). They appear
in the F2 *Story* tab and in `tools/play.mjs` (`preset <id>`).

## Story Phase 3 formats

### Names and titles that follow the story

Variants may set `name` and `title` as well as the look. Each field comes
from the **first matching variant that sets it**, so list later story first:

```json
{ "extend": "blackbeard", "variants": [
  { "if": { "flag": "captain_named_stinkbeard" }, "name": "Stinkbeard" },
  { "if": { "flag": "beard_sniffed" }, "appearance": "blackbeard_stinkbeard", "portrait": "blackbeard_stinkbeard" } ] }
```

The character keeps its id. Every display (name plates, status, save slots,
toasts, battle results, the quest log) uses the resolved name, and
`{captain}` in text is the leader's title and name ("Captain Stinkbeard").

### Logbooks (`data/logs/`)

```json
"stench_log": { "title": "The Stench Log", "menuLabel": "Stench Log", "keeper": "garrick", "icon": "ledger",
  "if": { "flag": "stench_log_seen" },
  "fields": [{ "id": "location", "label": "Location" }, { "id": "severity", "label": "Severity" },
             { "id": "source", "label": "Probable source" }, { "id": "notes", "label": "Notes", "quote": true }],
  "severities": { "Mild": "g", "Moist": "c", "Concerning": "y", "Severe": "o", "Catastrophic": "r", "Premium": "p" },
  "entries": [{ "id": "treasure_room", "title": "Treasure Room", "if": { "flag": "p3_started" },
    "location": "Aft hold", "severity": "Catastrophic", "source": "Lunch", "notes": "Successful atmospheric rebranding.",
    "variants": [{ "if": { "flag": "…" }, "notes": "a later note" }] }] }
```

Once `if` holds the log is a page in the pause menu (after Quests). Entries
appear when their `if` holds, in file order, with variants applied field by
field; new ones are announced with a toast and marked NEW until read. Open it
from a script with `{ "logbook": "stench_log" }`. Future chapters add entries
to the same file (or another log file).

### Sharks

A map (or patch) lists shark levels, latest story first:

```json
"sharks": [{ "if": { "flag": "grog_spilled" }, "level": "swarm" },
           { "if": { "flag": "sharks_sighted" }, "level": "following" }]
```

Levels: `none`, `curious`, `following`, `attacking` (fins bump the hull now
and then while the captain has control), `swarm`. Fins need an ocean map;
below decks use `"below": true` and the hull just thumps. Tuning (fin count,
speed, distance from the hull, how often they bump) can be overridden per
level in `data/hazards/sharks.json`.

### Patch prop conditions

```json
"propConditions": [{ "id": "rowboat", "if": { "notFlag": "garrick_lowered" } }]
```

Adds a condition to a prop the base map (or an earlier patch) placed with that
`id`. It is a load error if no prop has the id.

### Ambient life

Beyond `wake`, `gulls`, `smoke`, `perchedGull`, `sailShadow`, `glitter` and
`voice`: `rain` (`density`, drops and splash rings), `sailPuff` (`prop`, `every`:
a sail swells and breathes out), `ratPeek` (`x`, `y`, `every`: the masked rat),
`odorTrail` (`actor`, `every`: whiffs off someone). `smoke` takes `tint`,
`rise`, `every`, `alpha`. Every entry may have an `if`, re-checked live.

### Items with surprises

```json
"use": { "target": "ally", "effects": [
  { "type": "heal", "amount": 30 },
  { "type": "fumeWard", "seconds": 90, "scale": 0.5 },
  { "type": "sideEffect", "table": [
    { "id": "warmed_up", "weight": 3, "status": "warmed_up", "duration": 3, "text": "…" },
    { "id": "stench_proof", "weight": 3, "status": "stench_proof", "duration": 3, "text": "…",
      "field": [{ "type": "fumeWard", "seconds": 150, "scale": 0.35 }] } ] } ] },
"useSfx": "grog_gulp"
```

`fumeWard` slows fume exposure in the field for a while. `sideEffect` picks
one entry by weight: in battle it applies the short status, in the field its
`field` effects; its `text` is shown either way. Keep side effects short and
harmless. Shop stock entries may be `{ "id": "frog_grog", "if": { … } }`.

### Poses, skies and inserts added in Phase 3

Poses: `proclaim` (Garrick on his barrel) and `brace` (grabbing hold).
Vista skies and seas: `night`, `noon`. Vista frames: `fin_side_0/1`,
`shark_leap`, `rowboat_beans_0/1`, `rowboat_pan_0/1`, `revenge_puffed`,
`shark_belly_0/1`, `ripple_0…2`. Stage frames: `fin_h/v_*`, `shark_bite_*`,
`shark_deck_*`, `rowboat_beans_*`, `rowboat_pan_*`, `rowboat_hitch_*`,
`shark_belly_*`, `rat_mask_0…2`. Inserts: `amendment_notice`, `ship_names`.

## Story Phase 4 formats

### The Dead Center (`data/hazards/dead_center.json`)

The Center is a named location, stored as a story value. Each location is a
room and fume zones (the ordinary fume system draws it and meters exposure):

```json
"locations": {
  "galley_breakfast": { "name": "the galley", "map": "galley",
    "zones": [{ "level": "center", "x": 3, "y": 5, "w": 8, "h": 6 },
              { "level": "dense", "x": 1, "y": 4, "w": 11, "h": 8 }],
    "enterFrom": [-7, 0], "enterMs": 6000,
    "seals": true }
}
```

`enterFrom` is the offset (in tiles) it rolls in from over `enterMs`, so
there is always time to get out. `seals: true` locks every warp into that map
while the Center is there (a list names the maps to seal); the door plays
`hazard.dead_center_door` instead ("The door won't budge..."). Scripts put it
somewhere with `{ "deadCenter": "washroom" }` and take it away with
`"none"`; `{ "if": { "deadCenter": "washroom" } }` asks where it is, and
`{deadCenter}` in text names the place. Adding a place is data only.

### The bell protocol (`data/hazards/alarms.json`)

```json
"levels": { "3": { "label": "THREE BELLS", "text": "DEAD CENTER SIGHTED. EVACUATE.",
                   "sound": "KLANG-HACK-KOFF-WHEEZE", "sfx": "alarm_bell_3", "color": "#e04030" } }
```

`{ "alarm": 3, "where": "the galley" }` rings it: a panel with the bells,
what they mean, where, and the bell's sound written out, with the screen edge
pulsing once per bell (softer with Reduced effects). Nobody has to hear it.
The world never rings alarms by itself; scripts do. Add `"wait": true` when
the next thing shown must not sit under the panel.

### Shark Duty (`data/hazards/shark_duty.json`, map `"sharkDuty"`)

Rail sections are tiles on the main deck; sessions are wave lists:

```json
"sections": { "port_mid": { "x": 16, "y": 20 } },
"sessions": { "first_watch": { "title": "SHARK DUTY", "label": "Sharks seen off",
  "event": "shark_repelled", "counter": "shark_duty.repel",
  "window": 9500, "maxActive": 2,
  "waves": [{ "gap": 1400, "section": "port_mid" }, { "gap": 3800, "section": "port_patch", "big": true },
            { "gap": 4000, "boarder": [10, 22] }],
  "barks": [{ "who": "jory", "text": "Mind the patch, Captain!" }] } }
```

A map turns a session on from the story (first match wins):

```json
"sharkDuty": [{ "if": { "objectiveActive": "shark_duty.repel" }, "session": "first_watch" },
              { "if": { "flag": "optional_duty_on" }, "session": "open_watch" }]
```

While it runs, sharks come to the rail one wave at a time (never two at one
section, never more than `maxActive`); the captain faces the rail and presses
Confirm to shove each one off (the `shark` repair kind; `big` sharks need two).
Each one seen off fires `event` (count it with an `event` objective) and the
duty board shows `counter`'s progress. A shark left too long bites and leaves
damage to patch; nothing is ever lost. `{ "sharkDuty": "clear" }` stands the
rail down at once.

Each shark is harder than the last. A session's optional `ramp` (defaults in
`DEFAULT_RAMP`, `src/systems/hazards/sharkDuty.js`) blends from the first
shark to the `over`-th: `window` and `gap` scale how long a shark waits and
how soon the next comes, `speed` scales the timing bar's marker, `zone` is the
green zone's width in px, and from `bigFrom` every `bigEvery`th shark is a big
one. Two misses in a row still widen the zone. Leaving the deck mid-watch puts
the watch aside (per play, never saved) with its clock stopped; the same
sharks are waiting when the captain comes back.

### Sharks: the frenzy and the crowd

Map shark entries take `crowd` (how many small distant fins to draw, capped
by `maxCrowd`): `{ "if": { "flag": "hundreds_seen" }, "level": "swarm", "crowd": 100 }`.
There is a sixth level, `frenzy` (churning water, fins everywhere); stage it
with `{ "sharkEvent": "frenzy", "x": 17, "y": 21 }`, end it with `calm`.
`thrash` disturbs the water at a spot; `hammerhead` rams the hull there.

### The Forecast Board and logbook pictures

Log entries may carry a picture (`insert`, `caption`) shown full-screen from
the entry, and a field can be drawn as a scale (`"scale": true`, coloured
through `severities`). The Forecast Board (`data/logs/forecasts.json`) uses
both: `predicted`, `risk` (a scale), `confidence`, `result` and `notes`, with
each day's crayon map. New forecasts are new entries with an `if`.

### Vistas: crowds and the dialogue at the top

A vista layer can be a **school**: many drifting copies from one entry
(`frames`, `count` up to 400, `area` `[x, y, w, h]`, `scale` and `speed`
ranges, `flip: "random"`, `frameMs`), shown and hidden like any layer. A
vista with `"dock": "top"` puts the dialogue window along the top, over the
sky, so the whole sea stays in view.

### Time of day by variable

Phase 4 keeps the hour in a variable: `data/game.json` `timeOfDay` entries
match `{ "var": { "name": "p4_tod", "eq": 3 } }` (1 morning, 2 noon, 3
afternoon, 4 evening, 5 night), so a script sets the hour with `setVar`.

### Poses, frames and inserts added in Phase 4

Vista frames: `revenge_bitten_1…3`, `shark_shadow_0/1`, `hammer_ram_0/1`,
`churn_0…2`, `yellow_wake`. Inserts: `forecast_day1…3`, `forecast_sharks`,
`forecast_worst`, `forecast_worst_flipped`, `forecast_tomorrow_70`,
`forecast_tomorrow_700`, `grog_close`, `grog_forecast`, `beard_remedies`,
`bell_protocol`, `patch_labels`. Garrick's appearance and portrait
`garrick_grand_stenchmaster` (the sash), `squawks_feathers_3`,
`squawks_feathers_7`, `squawks_bald_again` and `pete` are in
`data/appearances/phase4.json` and `data/portraits/phase4.json`.


## Story Phase 5 formats

### Televisions (`data/tv/`)

A television is a close-up the captain operates (`src/ui/TvView.js`): power,
next/previous channel, the wiring, the power source, a slap while it's
misbehaving, step away. Its state is two story variables, so it saves:

```json
"ses": {
  "name": "The Stenchmaster Entertainment System",
  "channelVar": "ses_channel", "powerVar": "ses_power",
  "flags": { "open": "ses_examined", "wiring": "ses_wiring_seen", "power": "ses_power_source_seen", "slap": "ses_slapped" },
  "offComments": [["captain: It's off. The glass is still warm."]],
  "channels": [
    { "id": 5, "title": "The Theatre", "frames": ["tv_theatre_0", "tv_theatre_1", "tv_theatre_2"], "frameMs": 500,
      "glow": "#d8b8a0", "hum": "tv_hum", "if": { "flag": "..." },
      "comments": [["captain: The man arguing with the turnip.", "garrick: Act Two. It gets very tense."]] }
  ],
  "wiring": [["captain: I recognise none of this."]],
  "powerSource": [["captain: There is no sensible reason this should work.", "garrick: And yet."]],
  "slap": [["garrick: Firmly. On the side. There."]],
  "failures": { "every": [9000, 16000], "kinds": ["roll", "spark", "buzz", "smoke"], "lines": [["pete: It's going to BLOW!"]] }
}
```

Each comment list is one look; looks are taken in turn (a world counter per
set and channel). A line spoken by someone who isn't on the map is left out,
so Garrick only answers when he's there. Channel frames are vista frames
(`src/art/vista/sesArt.js`); a channel with an `if` only exists once it holds.
`{ "tv": "ses" }` opens the close-up and waits until the captain steps away;
`{ "tvSet": "ses", "power": true, "channel": 5 }` sets it from a script. The
set on deck is ordinary props chosen with `{ "var": { "name": "ses_channel", "eq": 5 } }`.

### Panic when the bell goes (`data/hazards/alarms.json` `"panic"`)

```json
"panic": [{ "if": { "flag": "p5_started" }, "levels": [3], "count": 3, "exclude": ["garrick"],
            "lines": ["CENTER!", "Remember the bird!"],
            "reply": { "who": "squawks", "chance": 0.4, "lines": ["Still hear you."] } }]
```

When an alarm rings outside a vista, up to `count` people on screen (not the
ones in `exclude`) shout a line each, never the same one twice; `reply.who`
may answer. The first entry whose `if` and `levels` match is used.

### Shark Duty: replies, conditions and a helper

A bark may answer back and may have a condition:
`{ "who": "garrick", "text": "Excellent shark repulsion!", "reply": { "who": "pete", "text": "WE KNOW!" } }`
(`reply.delay`, `reply.shout` optional; `"if"` on the bark). A session's
`assist` lets someone else see off one shark per shift once `after` sharks
have come:

```json
"assist": { "if": { "flag": "garrick_emergency_labor_rule" }, "who": "garrick", "after": 2,
            "lines": ["That's my one."], "sfx": "pole_strike", "event": "garrick_one_useful_thing" }
```

### Looks added in Phase 5

Character extras: `pegleg` (a wooden leg from the knee), `regalia`
(epaulettes, high collar wings, medals with a bottle cap, the cloud crest on
the back), `brassboots`, `gloves`, and the `stenchhat` hat style (also on
portraits). Parrot options: `naked` (no tail or crest), `weary` (heavy lids),
`basket` (sitting in his padded basket). Appearances and portraits
`garrick_stenchmaster_suit` and `squawks_fully_bald` are in
`data/appearances/phase5.json` and `data/portraits/phase5.json`. Vista frames:
`ses_bezel`, `ses_back`, `ses_power_source`, `tv_off`, `tv_scan`, `tv_glare`,
every channel's `tv_*` frames, `tv_almost`, `tv_spark_0…2`, `tv_smoke`,
`ses_wall_day`, `ses_wall_night`, `garrick_back_suit`. Inserts:
`stenchmaster_medals`, `noble_duties`, `insult_notes`, `log_drool`,
`emergency_rule`. Props: `ses_tv_covered`, `ses_tv_off`, `ses_tv_ch1…6`,
`stench_chair`, `grog_side_table`, `notes_insults`, `laundry_line`,
`laundry_line_yellow`, `bread_loaves`, and starboard mirrors of the rail
damage (`rail_bitten_s`, `rail_gap_s`, `patch_1_s`, `patch_2_s`,
`brace_ropes_s`).

## Story Phase 6 formats

### Television programmes (`data/tv/programs/`)

```json
"frog_tax_man": {
  "title": "The Frog Tax Man", "laugh": "ftm_laugh", "closeup": ["ftm_close_0", "ftm_close_1"],
  "episodes": [
    { "id": "forty_seven_hundred_flies", "beats": [
      { "frames": ["ftm_title_0", "ftm_title_1"], "frameMs": 420, "line": "announcer: THE FROG TAX MAN!", "sfx": "ftm_horn", "ms": 2400 },
      { "frames": ["ftm_close_0", "ftm_close_1"], "line": "franklin: I ate them during work hours!", "laugh": true } ] },
    { "id": "quarterly_estimates", "if": { "flag": "p6_complete" }, "beats": [ ... ] } ]
}
```

A channel carries a programme with `"program": "frog_tax_man"`; the close-up
plays the last episode whose `if` holds, beat by beat (the cast are extra
speakers in `data/characters/speakers_phase6.json`). In a cutscene,
`{ "tvProgram": "frog_tax_man", "episode": "...", "layer": "screen", "from": 6, "to": 7 }`
plays beats 6 and 7 (inclusive) on a vista's screen layer.

### Television conditions and the knob panel (`data/tv/ses.json`)

```json
"stateValue": "ses_state",
"states": {
  "apparently_dead": { "dead": true, "bezel": "ses_bezel_dead", "back": "ses_back_singed",
                       "flicker": { "every": [9000, 16000], "frames": ["tv_dot"], "sfx": "ses_clicking", "lines": [["..."]] },
                       "lookComments": [["captain: Dead. Black glass."]] },
  "shark_damaged": { "dead": true, "bezel": "ses_bezel_wrecked", "glass": "tv_cracked", ... } },
"knobs": { "doneFlag": "ses_off_maybe", "openLines": [["..."]],
           "list": [{ "id": "off_maybe", "label": "OFF MAYBE", "effect": "off", "tries": 3, "lines": [["..."]], "doneLines": [["..."]] }] }
```

`{ "tvSet": "ses", "state": "shark_damaged" }` sets the condition (a dead set
is switched off and can't be switched on). Knob effects: `louder` (with
`amount`), `flip`, `tint`, `slow`, `shrink`, `frog`, `noop`, `off` (with
`tries`); validation insists on an `off` knob. `{ "tv": "ses", "mode": "knobs" }`
opens the panel.

### The Great Sharkstorm (`data/hazards/sharkstorm.json`)

```json
"great_sharkstorm": { "value": "great_sharkstorm", "distanceValue": "great_sharkstorm_distance",
  "states": {
    "attacking_ship": { "intensity": 3, "distance": "near",
      "flying": { "passEvery": [1800, 3600], "impactEvery": [6500, 10000], "warnMs": 1600, "area": [4, 12, 15, 31] } },
    "active_distant": { "intensity": 2, "distance": "distant", "rumble": { "every": [26000, 52000], "sfx": "storm_distant" } } } }
```

`{ "sharkstorm": "attacking_ship" }` moves it (and records the distance);
`{ "if": { "sharkstorm": ["forming", "attacking_ship"] } }` tests it.

### Vista orbit layers

```json
{ "id": "sharks_high", "x": 222, "y": 186, "depth": 12,
  "orbit": { "frames": ["storm_shark_0", "storm_shark_1"], "count": 120, "height": 180,
             "radius": [18, 66], "speed": 1.4, "scale": [0.3, 0.75], "frameMs": 140, "wobble": 4 } }
```

`{ "vistaSpin": "sharks_high", "speed": 0.5 }` slows it (a storm losing its grip).

### Dead Center profiles, values, timing bars

A Dead Center location may have `"profile": "second"` (the garlic-pale
cloud). Conditions can test story text values:
`{ "value": { "name": "ses_state", "in": ["apparently_dead", "shark_damaged"] } }`
(`eq`, `ne`, `in`, `set`); scripts set them with `{ "setValue": "name", "value": "text" }`.
The timing bar (`repair`) has Phase 6 variants `smother`, `brace`, `heave`
and `barrel`.

### Looks added in Phase 6

Character extras `gaudy` (saucepan-lid medal, bottle caps, mismatched
buttons, grog-soaked tassels) and `singed` (scorched hem, grog stains); the
painted cape is the existing `cloak` in burgundy. Parrot option `nightcap`.
Appearances and portraits `garrick_stenchmaster_gaudy`,
`garrick_stenchmaster_singed`, `squawks_nightcap` are in
`data/appearances/phase6.json` and `data/portraits/phase6.json`.

## Tilesets and props

**Tilesets** (`data/tilesets/`) list `frames` (painted by name in
`src/art/tiles/`) and tile **types** with autotile rules:

```json
"floor": { "variants": ["floor_a", "floor_b", "floor_c"], "weights": [4, 3, 3] },
"wall": { "solid": true, "column": { "top": "wall_top", "mid": "wall_mid", "bottom": "wall_bot", "single": "wall_single" } },
"rail": { "solid": true, "row": { "left": "rail_l", "mid": "rail_m", "right": "rail_r", "single": "rail_s" } },
"hold_wet": { "frame": "hold_wet" }
```

`variants` pick a frame by a stable hash of the position, so maps look
hand-varied but never change between loads. `joins` lists other tile types that
count as "the same wall" for `column`/`row` pieces (a porthole inside a wall
run), and the tileset's `animations` map cycles frames for animated tiles
(e.g. the hull where the sea laps against it).

**Props** (`data/props/`) are furniture and fittings:

```json
{ "id": "rum_cabinet", "footprint": [1, 2], "solid": true, "layer": "object",
  "inspect": ["Rum. Good rum. Locked, for everyone's safety."],
  "light": { "radius": 36, "color": "#ffb060", "flicker": true }, "sprite": "rum_cabinet" }
```

`layer`: `object` (y-sorted with actors), `floor`, `wall`, `overhead`.
Each id needs a painter in `src/art/props/` (validation checks this).

## Audio

**Music** (`data/audio/music/<id>.json`) is written in a compact tracker
notation, rendered by the built-in synthesizer:

```json
{
  "id": "ship_theme", "title": "Morning Watch", "bpm": 70, "stepsPerBeat": 6, "reverb": 0.18,
  "channels": { "lead": { "instrument": "flute", "volume": 0.36, "pan": 0.1 }, "drums": { "instrument": "kit", "volume": 0.2 } },
  "patterns": {
    "A": { "lead": "G4:4 B4:2 D5:4 B4:2 | C5:4 A4:2 F#4:4 A4:2", "drums": "k.h.s.h.k.h.s.h." }
  },
  "sequence": ["A", "A2", "B"], "loopFrom": 0, "loop": true
}
```

Melodic notes: `NOTE[:steps]` (`C4`, `F#5`, `Bb3`), `r` rest, `-` tie,
`[C4 E4 G4]:4` chord, `|` bar line (ignored). Drums: one character per step —
`k` kick, `s` snare, `h` hat, `o` open hat, `t`/`T` toms, `c` crash, `.` rest.
`loop: false` makes a one-shot sting (victory, game over). Instruments live in
`data/audio/instruments.json` (waveform/FM/pluck, envelope, vibrato, filter).

**Sound effects** (`data/audio/sfx.json`) are layered synth programs:
`{ "layers": [{ "type": "tone"|"noise", "wave", "notes": [["E5", 0.04]], "sweep": [from, to], "dur", "delay", "decay", "volume", "lp", "hp", "duty" }] }`.

**Ambience** (`data/audio/ambience.json`): looping beds (`ocean`, `wind`,
optionally `muffled`) plus random one-shots (`creak0`–`creak3`, `gull0`–`gull2`,
`drip0`–`drip2`, `thump0`–`thump1`) with an `every: [min, max]` seconds range.

## Recipes

**A new crew member who gives a quest**

1. Appearance in `data/appearances/`, portrait in `data/portraits/`.
2. NPC in `data/npcs/` with dialogue selectors.
3. Scripts in `data/dialogue/<chapter>/<name>.json`; use `{ "startQuest": … }`.
4. Flags in `data/story/flags/`, the quest in `data/quests/`.
5. Place the NPC on a map. Run `npm run validate`.

**A locked door that needs a key**

```json
{ "id": "to_brig", "type": "warp", "x": 4, "y": 3, "to": { "map": "brig", "spawn": "door" },
  "if": { "hasItem": "brig_key" }, "locked": "inspect.brig_locked" }
```
Without the key the door is solid and `inspect.brig_locked` runs when the
player walks into it or presses Confirm on it; with it, the door just opens.

**A one-time cutscene when entering a room**

```json
"onEnter": [{ "if": { "notFlag": "brig_intro_seen" }, "script": "cutscene.brig_intro" }]
```
…and set `brig_intro_seen` as the cutscene's first step.

**A new enemy type**: add a painter (`field(dir, frame)` and
`battle(frame)`) to `src/art/enemies/enemyPainters.js`, then data in
`data/enemies/`, abilities in `data/abilities/`, and an encounter.
