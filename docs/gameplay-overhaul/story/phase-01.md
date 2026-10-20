# Story inventory, Phase 1: The Prologue (engine foundation)

Chapters: 1 (the prologue). Dialogue lines: 26. Classification: Timing / skill input 1.

Sources: `data/game.json` (chapter list), `data/story/cutscenes/` (`cutscene.*` scripts), `data/quests/` (captains_rounds, rats_in_the_hold, brasks_fuse), `data/encounters/prologue.json`, `data/enemies/vermin.json`, `data/maps/ship/cargo_hold.json`.

Field key: 1 ID/title/files · 2 events and dialogue · 3 characters, locations, props, flags · 4 current actions and mechanics · 5 classification · 6 opportunities · 7 proposed primary mechanic · 8 secondary · 9 enemies/puzzles/timers/hazards/resources · 10 failure and consequences · 11 dependencies · 12 complexity and priority · 13 preserving story/humour, variety.

Complexity: S = content and data only, reuses an existing system; M = needs one new or extended shared system; L = new system plus new content and tests; XL = multi-system set-piece. Priority: P1 = core of the overhaul (do early), P2 = strong improvement, P3 = keep or light touch.

Every proposal here is a planning note. Nothing in this file has been implemented, and none of it changes the story's events, dialogue or order.

[Back to the story index](../01-story-inventory.md)

### `prologue` · Prologue

Audit status: **examined** (scripts parsed in full by the audit tooling; digest of objectives and opening lines reviewed). Quiet beat: **no**.

1. **ID, title, source files.** `prologue`, Prologue. Scripts: 4 in `data/story/cutscenes/prologue.json`. Quests: `captains_rounds` “Captain's Rounds” in `data/quests/prologue.json`; `rats_in_the_hold` “Rats in the Hold” in `data/quests/prologue.json`; `brasks_fuse` “A Match for Brask” in `data/quests/prologue.json`.
2. **Events and dialogue.** A calm morning aboard the Queen Anne's Revenge under Captain Blackbeard. Three starter quests: Captain's Rounds (Hale, the helm, the galley, the treasure hold), Rats in the Hold (Quill; three visible turn-based rat fights) and A Match for Brask (find a cannon fuse). It is the only part of the game with ordinary combat. Dialogue: 26 lines (captain 8, wick 6, quill 4, (narration) 3, mags 3, jory 2); 0 choice prompt(s) with 0 options. Presentation: move ×2, spawn ×1, shake ×1.
3. **Characters, locations, props, flags.** Speaking characters: wick, quill, mags, jory. NPCs with dialogue keyed to an objective (hints, reactions or completions): hale, quill, brask. Rooms: `cargo_hold`, `galley`, `main_deck`, `treasure_hold`. Interactables: none. Flags set: 4 (`opening_seen`, `galley_argument_seen`, `rats_intro_seen`, `tutorial_complete`); items given: none.
4. **Current player actions and mechanics.** Objectives: “Speak with the First Mate” [talk]; “Inspect the Main Deck (the helm)” [inspect]; “Check the Galley” [visit]; “Inspect the Treasure Hold” [inspect]; “Report to Mister Hale” [talk]; “Speak to the Quartermaster” [talk]; “Enter the Cargo Hold” [visit]; “Defeat the rats” [defeat×3]; “Report back to the Quartermaster” [talk]; “Find a cannon fuse” [obtain×1]; “Bring it to Brask” [talk]. Mechanics invoked by the scripts: none.
5. **Classification.** Timing / skill input (battle (map encounters) ×3). The rat fights can be lost (game over, retry from the autosave).
6. **Gameplay opportunities.** Already the closest thing to an RPG opening. It can teach every core verb the rest of the overhaul relies on: moving, shoving, carrying, swinging a tool, dodging, repairing, managing a resource.
7. **Proposed primary mechanic.** Tutorial voyage: the rounds become a short 'ship systems' tutorial (check the bilge pump, patch a seeping plank with the timing bar, coil a fouled line) that introduces Ship Integrity.
8. **Secondary mechanics.** Rats in the Hold as the first real-time field-combat lesson (rats telegraph a lunge; nests must be found and blocked). Brask's fuse becomes a small search with the cargo-handling (push/carry) verb.
9. **Enemies, puzzles, timers, hazards, resources.** Bilge rats (3 kinds), a rat nest that respawns rats until plugged, one leaking seam, a fouled line, crates to push.
10. **Failure conditions and consequences.** Knocked out by rats → wake at Doc Fennimore's with a small morale/HP penalty and the nest grown; no game over in the tutorial.
11. **Dependencies.** Entry: new game: `data/game.json` `startScript` = `cutscene.opening`; the rat fights are map encounters `hold_rats_1`, `hold_rats_2`, `hold_rats_nest` on `data/maps/ship/cargo_hold.json` (defined in `data/encounters/prologue.json`). Start flag: `None`. Reads flags first set in earlier chapters: none detected. Flags read by later chapters: none detected. Flags read by world data (rooms/NPCs/triggers): 2 (room main_deck, npc hale, npc nell, trigger). In-room hooks into this chapter: map objects in none; NPC dialogue in none.
12. **Complexity and priority.** Complexity M, priority P1.
13. **Preserving story and humour; variety.** Wick's over-polite messages, Quill's ledger and Mags's galley stay word for word; the joke that this is the last normal day of the captain's life gets sharper if it's the one day everything works.
