# Content Guide

Everything the player meets — maps, crew, dialogue, quests, items, enemies,
music — is JSON under `data/`. The **folder** decides what a file contains; file
names inside a folder are free, so a new chapter is simply new files
(`data/dialogue/chapter8/…`, `data/quests/chapter8.json`, …).

After any change, run `npm run validate` (or just reload the dev server: broken
content is listed on screen before the title appears). Error messages name the
file, the entry and the path, e.g.
`data/dialogue/prologue/hale.json (hale.rats_hint) start #2: unknown speaker "ghost"`.

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
| `sfx` / `music` / `ambience` | id (`music` takes `fade` ms) | audio |
| `move` | actor, `path` (`["up", 2, "left", 1]`) or `to` `[x, y]`, `speed` (`walk`, `run`, `slow` or ms per tile), `face`, `async` | walk an actor; `async` doesn't wait |
| `face` | actor, `dir` (a direction, `"player"` or another actor) | turn |
| `anim` | actor, `name` (`idle`, `walk`, `work`, `sit`, `point`, `surprised`), `duration` | pose |
| `emote` | actor, `icon` (`exclaim`, `question`, `ellipsis`, `anger`, `sweat`, `note`, `heart`, `zzz`), `duration` | speech bubble icon |
| `spawn` | npc, `id`, `x`, `y`, `facing` | add an NPC for the scene |
| `despawn` | actor | remove |
| `place` | actor, `x`, `y`, `facing` | teleport on the map |
| `camera` | `pan` (`x`,`y` or `actor`), `follow` (`actor`), `reset`; `duration` | camera |
| `shake` | intensity, `duration` | screen shake (respects the option) |
| `flash` | `"#rrggbb"`, `duration` | screen flash |
| `fade` | `in`/`out`, `duration`, `color` | full-screen fade |
| `transition` | map, `spawn` or `x`/`y`, `facing` | change map (ends the script) |
| `showObject` / `hideObject` | object or actor id | visibility |
| `effect` | `slash`, `impact`, `sparkle`, `buff`, `debuff`, `smoke`…, `actor` or `x`/`y` | one-shot effect |
| `battle` | encounter, `win` steps, `lose` steps | fight, then branch on the result |
| `shop` | shop id | open a shop and wait until it closes |

Actors are `player` (or `captain`) or the id of an NPC/actor on the map.

**Where scripts run**: NPC conversations, `inspect` objects, props' inspect
text, `trigger` objects, map `onEnter` lists, `newGame.startScript`, quest
`onComplete`, locked warps' `locked`, and `call`.

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
| `objectState` | `{ "objectState": { "key": "cargo_hold:gunnery_crate", "opened": true } }` |
| `all` / `any` / `not` | `{ "all": [ … ] }`, `{ "not": { … } }` |
| `always` / `never` | `{ "always": true }` |

## Story flags and variables

Every flag must be declared (`data/story/flags/*.json`), which catches typos:

```json
[{ "id": "met_first_mate", "description": "Blackbeard has had his morning briefing with Mister Hale." }]
```

Undeclared flags are validation errors, and declared-but-unused flags produce
warnings. Variables (`setVar`, `addVar`, `var` conditions, `{var:name}`) are
free-form integers.

## Quests (`data/quests/`)

```json
{
  "id": "rats_in_the_hold", "title": "Rats in the Hold", "category": "main", "giver": "quill",
  "summary": "Something has been eating the ship's biscuit.",
  "description": "Quill's ledger won't balance…",
  "objectives": [
    { "id": "talk_quartermaster", "text": "Speak to the Quartermaster", "type": "talk", "target": "quill" },
    { "id": "enter_hold", "text": "Enter the Cargo Hold", "type": "visit", "target": "cargo_hold", "after": ["talk_quartermaster"] },
    { "id": "clear_hold", "text": "Defeat the rats", "type": "defeat", "tag": "hold_rats", "count": 3, "after": ["enter_hold"] },
    { "id": "report_back", "text": "Report back", "type": "talk", "target": "quill", "after": ["clear_hold"] }
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
| `defeat` | a battle is won | `target` (encounter id), `tag` (encounter tag) or `enemy` (counts each one), plus `count` |
| `obtain` | the inventory holds enough | `item`, `count` |
| `event` | a script fires `{ "event": name }` | `target` |
| `flag` | a story flag is set | `target` |
| `manual` | only by `completeObjective` | — |

`after` lists objectives that must be done first (they stay hidden in the quest
log until then); `optional: true` objectives don't block completion. A quest
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
  `bob` gently rocks the camera (pixels).
- `musicFilter: "muffled"` low-passes the music (below decks).
- `ambient` life: `wake`, `gulls`, `smoke` (x, y), `perchedGull` (x, y),
  `sailShadow` (x, y).

**Objects**:

| Type | Fields |
| --- | --- |
| `spawn` | `x`, `y`, `facing` — entry points for warps and `newGame` |
| `warp` | `x`, `y`, `w`, `h`, `to: { map, spawn }` (or `x`/`y`/`facing`), `sfx`, `if`, `locked` (script run when `if` fails) |
| `npc` | `npc`, `x`, `y`, `facing`, `behavior`, `if` |
| `enemy` | `encounter`, `x`, `y`, `sprite`, `wander`, `chase`, `facing`, `if` |
| `inspect` | `x`, `y`, `w`, `h`, and `text` (lines), `script`, or `dialogue` (selectors like NPCs); `tags` |
| `chest` | `x`, `y`, `w`, `prop`, `items`, `gold`, `text` — opened once, remembered |
| `trigger` | `x`, `y`, `w`, `h`, `script`, `once` (default true), `if` — runs when stepped on |
| `block` | `x`, `y`, `w`, `h` — invisible wall |

Inspecting fires `object:inspected` with id `"map:object"`, which `inspect`
objectives use (`"treasure_hold:hoard"`).

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

**A one-time cutscene when entering a room**

```json
"onEnter": [{ "if": { "notFlag": "brig_intro_seen" }, "script": "cutscene.brig_intro" }]
```
…and set `brig_intro_seen` as the cutscene's first step.

**A new enemy type**: add a painter (`field(dir, frame)` and
`battle(frame)`) to `src/art/enemies/enemyPainters.js`, then data in
`data/enemies/`, abilities in `data/abilities/`, and an encounter.
