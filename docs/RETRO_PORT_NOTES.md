# Retro Port Notes

Phase 1 targets modern browsers only. These notes record the decisions made so
that a later port to 16-bit-era hardware (SNES, Mega Drive/Genesis) or to a
retro-style engine stays realistic. Nothing here is implemented as a port; it
is a map of what would carry over directly and what would need adapting.

## Summary

| Area | Carries over | Needs adapting |
| --- | --- | --- |
| Game rules (battle, quests, flags, inventory) | Integer math, seeded xorshift32 RNG, tables in JSON | Convert JSON to packed binary tables |
| Maps | 16×16 tile grid, ASCII source compiled to frame indices, per-tile solidity | Tile counts per map vs VRAM, metatiles |
| Scripts | Linear step lists with labels, flags and conditions | Compile to bytecode (see below) |
| Art | Pixel art at native resolution, 16×16 tiles, 32×48 field sprites | Colour counts (4bpp palettes), sprite size limits, blending effects |
| Resolution | 320×224 matches Mega Drive H40 | SNES is 256×224: widen UI margins or crop |
| Audio | Note/pattern data, instrument envelopes | Map synth voices to SPC700 samples or YM2612 FM |
| Saves | Small, flat, versioned state | Fit SRAM budget; drop JSON |

## Master data formats

All content lives in `data/**.json` and is already table-shaped: lists of
records with ids. A converter would:

1. Assign each id a small integer (per kind) in a stable order (sorted by id or
   by file order) and emit symbol tables for code.
2. Pack records into fixed-size structs. Typical sizes today:
   - item: type (u8), slot (u8), icon (u8), value (u16), 5 stat modifiers (s8), effects (≤2 × 4 bytes)
   - enemy: 5 stats (u16 HP, u8 others), ≤4 ability ids, AI table (≤4 × {ability, weight, condition}), xp (u16), gold range (u8×2), ≤2 drops
   - ability: kind, target, power (u8, percent), accuracy, cost, timing id, ≤2 effects
3. Store text in a string bank (dialogue, names, descriptions). Current text
   uses ASCII plus `’ ‘ “ ” … — – • × ♥ ★ ▶ ◀ ▲ ▼ ✓ é` and button glyphs; markup
   (`<y>…</>`) and tokens (`{ship}`) become control codes.

The validator (`src/content/validateContent.js`) already guarantees every
reference resolves, so a converter can assume integrity.

## Map format

- Grid: 16×16 px tiles. Current maps range from 14×10 to 20×46 tiles.
- Source: ASCII rows + legend + tileset autotile rules (`variants`, `column`,
  `row`, `joins`). `compileMap` turns this into:
  - `ground[]` and `overhead[]`: frame indices (−1 = empty)
  - `solid[]`: 1 byte per tile (could be a bitfield)
  - `props[]`: `{prop, x, y, flip}`
  - `objects[]`: spawns, warps, NPC/enemy placements, inspectables, chests,
    triggers, blocks
- Variant selection uses `hash32(mapId, x, y)`, so compiled maps are
  deterministic and can be precomputed offline (no autotiling at runtime).
- The whole tileset is 86 frames (60 colours). Props are separate images
  (94 frames); on hardware, props would become either BG tiles (static
  furniture) or sprites (animated/y-sorted objects such as lanterns, the flag).
- `npm run export` writes every map as a Tiled `.tmj` with the tileset, a
  collision layer, prop tile objects and game objects with their properties,
  a practical starting point for any toolchain.

NPC placements are re-evaluated after every scene (live restaging). A port
can do the same cheaply:
- keep one "current placement index" byte per NPC in the room;
- after a scene, recompute it;
- walk anyone whose index changed, or whom a script moved, with the same BFS
  the routines use.

No extra save data is needed, since a reload rebuilds the same room.

Y-sorting: props on the `object` layer and actors sort by their feet row;
`overhead` tiles and props always draw above actors. On hardware this maps to
BG priority bits (overhead) and sprite ordering by Y.

## Story flags and variables

- Flags are declared (`data/story/flags/*.json`), so they can be numbered and
  stored as a bit array. The prologue declares 18 flags (3 bytes).
- Variables are signed integers; the prologue uses none by default. Budget
  16 bits each.
- World state per object (`"map:object"` → opened/defeated/fired) can become
  bits indexed by (map, object) pairs; the prologue has about 20 such objects.
- Quests: status (2 bits) + per-objective progress (u8) + done bit.

## Scripts

Scripts are already linear step lists with labels and structured branches.
A compiler would emit bytecode per script:

```
LINE speaker, expr, text#      SETFLAG n       IF cond, else_label
CHOICE n, [text#, label]...    GIVEITEM id, n  GOTO label
MOVE actor, path#              BATTLE enc, win_label, lose_label
```

Conditions compile to a small expression tree (`all`/`any`/`not` of leaf
tests). Every command's parameters are typed in
`src/systems/script/commandSchemas.js`, which is the natural source for the
opcode table. Waiting commands (`wait`, `move`, `say`, `battle`) map to
coroutine yields in a per-frame script VM.

## Battle math

All integer arithmetic (`src/systems/battle/damage.js`), 16-bit friendly:

```
base   = attack * power / 100               (power in percent, 100 = normal)
raw    = max(base - defense / 2, base / 8, 1)
spread = raw * rand(92..108) / 100
crit   = spread * 3 / 2                      (chance 4% + luck/4 + bonus, cap 30%)
timed  = floor(dmg * timing multiplier)      (1.15 / 1.3 / 1.5)
final  = floor(dmg * damage-taken multipliers) (guard 0.5, marked 1.5, perfect guard 0.5, good 0.75)
hit%   = clamp(accuracy + (userLuck - targetLuck) / 2, 50, 100)
flee%  = clamp(50 + (partySpeed - enemySpeed) * 4 + attempts * 20, 10, 95)
init   = speed * rand(100..120) / 100        (party wins ties)
```

Multipliers other than whole numbers (1.15, 1.3, 1.5, 0.75) should become
fixed-point (e.g. ×/256). Status stat modifiers (×1.5 defense, ×1.25 attack,
×0.75 defense) are floor-applied in sequence.

Level stats: `floor(base + growth × (level − 1))` — precompute per-level
tables. XP curve: a plain `totalXp` table.

RNG: xorshift32 (`src/core/Rng.js`), 3 shifts and XORs on a 32-bit state — easy
on a 65816 or 68000 (the 68000 version is a handful of instructions).
`rand(a..b)` is `a + floor(next() * (b - a + 1))` using the top bits.

## Timed inputs

- Windows are ±45 / ±95 / ±165 ms for the cutlass (≈ ±3 / ±6 / ±10 frames at
  60 Hz) and ±55 / ±130 ms for guarding. Press detection is frame-based
  already; on hardware, count frames from the impact frame.
- Early lockout (260 ms / ~16 frames before impact) prevents mashing.
- The visual cue is a shrinking ring (radius 26 → 6 px over the 420 ms
  wind-up). On hardware: a sequence of 3–4 sprite frames, or a scaled BG layer
  (Mode 7 on SNES is unnecessary; pre-drawn ring sizes are fine).

## Input assumptions

The game only ever reads abstract actions (`src/platform/input/bindings.js`):

| Action | SNES | Mega Drive (6-button) | Mega Drive (3-button) |
| --- | --- | --- | --- |
| move | D-pad | D-pad | D-pad |
| confirm | A (or B) | C | C |
| cancel | B (or Y) | B | B |
| menu | X / Start | Start / Y | Start |
| run (hold) | B / Y | A | A |
| page left/right | L / R | X / Z | — (use left/right in tab bars) |

No analogue input, no mouse, no simultaneous chords, no timing finer than one
frame is required. Button prompt glyphs are per device (`PROMPT_GLYPHS`).

## Save schema

`src/systems/save/SaveManager.js`, current `SAVE_VERSION = 5` (Story Phase 5):

```json
{
  "format": "captain-stinkbeard-save", "version": 5, "savedAt": "ISO date", "slot": 1,
  "checksum": "FNV-1a of the state JSON",
  "summary": { "location": "Main Deck", "playTime": 812.4, "leader": "Blackbeard", "level": 3, "gold": 160, "chapter": "Prologue" },
  "state": {
    "story": { "flags": ["opening_seen"], "vars": {}, "values": { "dead_center": "treasure_hold" } },
    "world": { "objects": { "cargo_hold:rats_1": { "defeated": true }, "log:stench_log": { "announced": ["day_one"], "seen": ["day_one"] } }, "visited": ["captains_quarters"], "counters": { "talk:wick": 2 } },
    "inventory": { "gold": 160, "items": { "hardtack": 3 } },
    "party": [{ "id": "blackbeard", "level": 3, "xp": 64, "hp": 71, "equipment": { "weapon": "cutlass", "body": "captains_coat", "feet": "sea_boots", "accessory": null }, "abilities": ["order_brace", "order_focus_fire"] }],
    "quests": { "captains_rounds": { "status": "completed", "objectives": { "talk_first_mate": { "progress": 1, "done": true } } } },
    "location": { "map": "main_deck", "x": 9, "y": 14, "facing": "down" },
    "playTime": 812.4,
    "createdAt": "ISO date"
  }
}
```

Binary budget estimate for a cartridge port (per slot): flags 8 bytes,
vars 32 bytes, object state 16 bytes, visited maps 4 bytes, dialogue counters
16 bytes, inventory 64 items × 1 byte + gold 3 bytes, party 4 × 16 bytes,
quests 32 × 8 bytes, location 5 bytes, play time 4 bytes, checksum 2 bytes —
well under 1 KB. Four slots (3 manual + autosave) fit easily in 8 KB SRAM.

Versioning: every format change bumps `SAVE_VERSION` and adds a migration
(`src/systems/save/migrations.js`); records carry the version, and loads of
unknown/newer versions are refused politely. Version 2 adds nothing to the
layout: story state is still flags, vars and per-object state (the chapter,
time of day, characters' looks, fume zones and haze are all derived from
flags). The 1 → 2 migration only moves a save made inside the rebuilt
treasure hold to its door and guarantees `story.vars` exists. Fume exposure is
deliberately not saved (loading always starts with clean lungs).

Version 3 (Story Phase 3) also keeps the layout. The captain's new name,
Garrick's title, the ship's changes and the shark level are all derived from
flags; the Stench Log remembers only which entry ids have been announced and
read (object state `log:<id>`); Frog Grog is an ordinary inventory item; the
Frog Grog fume ward is per-play and never saved. The 2 → 3 migration fills
missing `story`/`world` fields; the version bump itself is what stops a
Phase 2 build from loading a Phase 3 save and silently dropping its quests.
Port budget: two short id lists per logbook (18 entries → 2 × 3 bytes as
bitfields).

Version 4 (Story Phase 4) adds `story.values`: named text, of which only one
is used, `dead_center` (where the Dead Center is: one of eleven location ids,
or absent). The 3 → 4 migration adds an empty `values`. Everything else Phase
4 adds follows flags and variables (`p4_tod` for the hour, `p4_hull_damage`
for the hull); the Shark Duty in progress, its incidents and the duty board
are per-play and never saved (a load mid-duty starts a fresh watch; quest
progress is kept). Port budget: one byte for the Center's location index.

Version 5 (Story Phase 5) keeps the layout. The Stenchmaster Entertainment
System, the suit, the station, Squawks fully bald and the emergency labour
rule are flags; the set's state is two variables (`ses_power` 0/1,
`ses_channel` 1-6). The 4 → 5 migration only fills missing fields; the bump
stops a Phase 4 build from loading a Phase 5 save. Port budget: one byte for
the set (power bit plus a 3-bit channel). The CRT effects are a frame loop, a
scanline overlay, a glare sprite, a glow and small offsets (roll, jitter),
all of which map onto sprites and a scroll register on 16-bit hardware.

## Asset naming

Generated assets are named by kind and id, and exported with
`npm run export`:

| Asset | Name | Frame size | Frames |
| --- | --- | --- | --- |
| Field character | `char_<appearance>` | 32×48 | `<anim>_<dir>_<n>`: idle(2), walk(4), work(2), sit, point, surprised × down/left/right/up |
| Battle character | `battle_<character>` | 48×48 | ready, ready2, windup, swing, strike, hurt, defend, order, victory, victory2, item, ko |
| Enemy | `enemy_<id>` | varies (≤ 65×42) | field `<dir>_<0|1>`, battle `battle_idle0/1`, `battle_attack`, `battle_hurt` |
| Portrait | `portraits` atlas | 48×48 | `<portrait>_<expression>` |
| Tileset | `tiles_<tileset>` | 16×16 | tileset frame order (16 per row) |
| Props | `props` atlas | varies | `<prop>` or `<prop>_<n>` for animated props |
| Backdrops | `backdrop_<id>` | 320×160 | — |
| UI / FX | `ui`, `fx` atlases | varies | cursor, markers, emotes, gauges, icons; slash/impact/sparkle/rings… |

Right-facing field frames are mirrored left frames (hardware H-flip); battle
sprites face one way per side (party left, enemies right).

## Colour and sprite limits

Current generated art is palette-driven but not yet palette-limited:

| Asset | Colours today | 4bpp target |
| --- | --- | --- |
| Field character sheet | 24–31 per character | 15 + transparent (split skin/cloth palettes or merge ramps) |
| Blackbeard battle sheet | 28 | 15 |
| Rats | 9 | fits |
| Human enemies | 24–30 | 15 |
| Portraits (all) | 110 across 12 people | 15 per portrait (+ shared UI palette) |
| Ship tileset | 60 across 86 tiles | 4–6 BG palettes of 15 |
| Backdrops | 13–51 | 1–3 BG palettes |

Ramps in `src/art/palette.js` are 3–5 shades each, so merging them to a
per-character 15-colour palette is mostly mechanical (skin 4, hair 3, primary
cloth 3, secondary 2, outline/ink 1, metal/gold 2).

Sprite sizes: 32×48 field sprites are 6 SNES 16×16 cells or 2 Mega Drive
32×32 + 32×16 pieces. Scenes have at most ~8 characters on screen (Main Deck),
well within per-line limits if they are spread vertically as they are now.

## Visual effects that need adapting

| Effect | Where | Hardware approach |
| --- | --- | --- |
| Baked multiply light map with coloured lights | every interior map (`WorldMap.buildLighting`) | pre-darkened tile palettes + lighter palettes near lanterns; SNES colour math (subtract) as an option |
| Additive flickering glows | lanterns, stove | palette cycling |
| Alpha fades and flashes | scene fades, camera flash, KO fade | brightness register (SNES INIDISP / palette fades on MD) |
| Camera shake / ocean swell | encounters, orders, sea around the deck | BG scroll offsets |
| Scale tweens | emotes pop-in, shout panels, grade text | pre-drawn frames |
| Half-transparent shadows | characters, props | dithered shadow sprites or colour-math (SNES) |
| Sprite tint (white flash, red KO) | battle hits | palette swap for a few frames |
| Stepped alpha flicker | invulnerability after fleeing | sprite blink (skip every other frame) |
| Low-pass music filter below decks | `setMusicFilter('muffled')` | echo/filter on SPC; lower FM operator levels |
| Parallax title sea | title screen | line scroll (HDMA on SNES, per-line scroll on MD) |
| Time-of-day grade (multiply) | Story Phase 2 morning → evening | per-chapter palette sets or SNES fixed-colour subtraction |
| Fume clouds (translucent, tinted blobs) and haze | Phase 2 fume zones | dithered cloud sprites over BG, colour math on SNES, a haze palette per room |
| Fume vignette closing in | thick fumes | window registers (SNES) or a pre-drawn border sprite ring |
| Camera roll (screen rotation) | the ship heeling in set-pieces | skip, or mode 7 on SNES; a sideways BG sweep elsewhere |
| Vistas (full-screen illustrated shots) | telescope, frigate, epilogue | a separate BG scene with sprites; the telescope mask is a window |

## Audio

Music is note data with simple instruments: pulse/triangle/saw/sine, 2-op FM,
plucked strings, noise drums, one reverb send (`data/audio/`). Channel counts
per song are 3–5, matching both the SNES (8 voices, sampled) and the Mega Drive
(6 FM + 3 PSG + noise). Instrument definitions (ADSR, vibrato, filter) are
close to what a tracker/driver needs; FM instruments map naturally to the
YM2612, pulse/noise parts to the PSG, and the SPC700 would use short rendered
samples of each instrument (the synthesizer can render those).

Sound effects are layered tone/noise programs with sweeps — PSG-friendly.
Ambience (ocean, wind, creaks, gulls) would become short looping noise samples
or be dropped in favour of music-only below decks.

## Resolution

320×224 is the Mega Drive's H40 mode. For SNES 256×224:

- The world view simply shows 32 fewer pixels on each side (maps already scroll).
- UI is laid out on a 4 px margin; the battle HUD (bottom 64 px) and pause menu
  panes would need narrower columns — the widest fixed-width UI is the
  320-wide battle HUD and the 312-wide dialogue box.
- The battle backdrop (320×160) would be cropped or redrawn at 256×160.
