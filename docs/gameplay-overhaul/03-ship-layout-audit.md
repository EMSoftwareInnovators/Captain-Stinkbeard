# 03 · Ship layout and clutter audit

Every map in the game, measured at each phase’s end state, and a proposal for turning the ship into a coherent, navigable working vessel. Audit only: no room, prop or object has been moved.

## Sources and method

- Maps: `data/maps/ship/*.json` (base rooms), `data/maps/ship/phase2/` … `phase17/` (78 patch files that add objects, props, fume zones and so on), `data/maps/island/*.json`. They are merged by `src/content/ContentDB.js`: patch **objects are prepended** (so a later placement row wins), while patch **props, fume zones, regions and decor are appended**. A later patch can retire an earlier prop through `propConditions`.
- Collision: `src/maps/compileMap.js`. Tiles marked solid in the tileset, plus every unconditional prop footprint, plus conditional props and objects as `dynamicSolids` while their condition holds.
- Measurements: for each room and each of the 17 phase-complete presets, the audit tooling evaluated which props, objects and people are live. It then computed the walkable area reachable from the room’s spawns and doors, the **choke tiles** (articulation points: a tile whose blocking would cut the reachable area in two), people standing on choke tiles, inspectables nobody can stand next to, prop anchors shared by several props, and when each story prop first appears and whether it ever goes away.
- Not measured: frame rate and draw calls. No profiling was run in this audit, so the performance notes below are estimates from object counts.

## Ship-wide numbers

- **11 maps**: 9 aboard the ship and 2 off it (reef passage, Crownskull Isle).
- **5,898 map objects** after merging, including **4,968 NPC placement rows**, **801 inspect objects**, **43 trigger tiles** and **30 fume-zone definitions**.
- **Coordinate-bound scripting**: 143 script `spawn` steps with coordinates and 190 `move` steps to coordinates, across 150 scripts, plus 82 camera steps. All of these break if their room’s layout moves underneath them.
- Story props are appended phase by phase and **rarely removed**. At the end of Phase 17 the four main rooms (main deck, galley, crew quarters, cargo hold) show 219 conditional story props, against 96 unconditional fixtures.

## Room summary (end of Phase 17 unless stated)

| Room | Size | Reachable tiles (Pro → P17) | Choke tiles (Pro → P17) | Live props (Pro → P17) | Story props from earlier phases still standing | Overlapping prop anchors | NPC placement rows | Inspect + trigger objects | People at P17 |
|---|---|---|---|---|---|---|---|---|---|
| `main_deck` | 20×46 | 368 → 330 | 1 → 28 | 30 → 96 | 66 | 12 | 1692 | 225 | 1 |
| `galley` | 18×13 | 109 → 96 | 5 → 9 | 16 → 64 | 48 | 5 | 1139 | 178 | 0 |
| `crew_quarters` | 18×18 | 150 → 127 | 13 → 33 | 23 → 72 | 57 | 9 | 898 | 189 | 13 |
| `cargo_hold` | 20×18 | 203 → 190 | 11 → 5 | 36 → 83 | 48 | 5 | 419 | 85 | 11 |
| `treasure_hold` | 20×14 | 128 → 128 | 5 → 5 | 40 → 47 | 39 | 4 | 4 | 12 | 0 |
| `captains_quarters` | 18×12 | 91 → 91 | 6 → 6 | 16 → 17 | 1 | 0 | 67 | 27 | 0 |
| `fart_free_zone` | 11×8 | 25 → 23 | 2 → 5 | 3 → 21 | 21 | 3 | 496 | 28 | 1 |
| `stenchmaster_fart_zone` | 16×10 | 65 → 68 | 1 → 4 | 5 → 15 | 13 | 0 | 140 | 25 | 0 |
| `washroom` | 12×9 | 37 → 37 | 2 → 2 | 8 → 8 | 0 | 0 | 22 | 8 | 0 |
| `crownskull_isle` | 60×72 | 3134 → 3101 | 20 → 26 | 66 → 82 | 16 | 0 | 91 | 47 | 0 |
| `reef_passage` | 22×50 | 818 → 818 | 0 → 0 | 2 → 2 | 0 | 0 | 0 | 20 | 0 |

Reachable tiles and choke tiles are measured without people standing in them. Pro is the end of the prologue; P17 is the end of Phase 17.

## Worst problems, ranked

1. **The crew quarters are eight rooms in one.** By Phase 17 this 18×18 room is the berths, the sick bay (proposed), Brogath’s canopy and containment barricade, the merch shrine (Phase 13 standees and bunting), the Grand Bank / Bashfulness Branch / Grand Dispensary / Bureau of Ceremonial Ignition counter, the credit terminal, the converter, the speaking tube, the Sash Lounge and the cardboard crew’s wall. Reachable floor falls from 150 to 127 tiles; choke tiles rise from 13 to 33; 9 prop anchors are shared; and Ned and Squawks stand on choke tiles at the end (the squeeze-past rule keeps the room passable). It also has 898 NPC placement rows and 189 inspect/trigger objects, 172 of them chapter-specific.
2. **The main deck is a museum of every phase.** 66 story props from earlier phases are still standing at the end: Phase 3 yellow stains and damp rope coils, Phase 4–6 hull patches and brace ropes, the scrapped S.E.S., the fork in the wall, the Phase 15 skunk crates and visitor chairs. That includes 12 shared anchors where props sit on top of each other (two notices on one tile at (9,20); patches stacked three deep at (16,21); `ses_tv_off` and `ses_tv_scrapped` on one tile at (14,17)). Reachable deck shrinks from 368 to 330 tiles and choke tiles grow from 1 to 28. It carries 1,692 NPC placement rows and 225 inspect/trigger objects, 185 of them chapter-specific.
3. **The cargo hold is the NPC dumping ground.** Eleven crew stand there at every milestone from Phase 10 to the end, most of them since Phase 7 (see `02-crew-audit.md`). The Phase 8 barracks (23 props: 14 hammocks, the rug, the costume trunk, the crown crate, the sailcloth screen) never comes down, so storage looks like a dormitory for the rest of the game.
4. **The galley is still a dormitory and dice court.** Phase 10–15 leftovers remain: four bean-sack beds, three sash hammocks, the six-rope lamp, Grand Dice on the floor, wire runs, token spills, oat remnants and snack wreckage (48 story props from earlier phases). It has 1,139 NPC placement rows and 168 chapter-specific inspect objects. By Phase 17 two inspectables are no longer reachable: `p11_porthole_look` (9,2) and `p15_protocol` (12,3). Whether they are still needed was not verified.
5. **The treasure hold has had no purpose since Phase 2.** 39 ruined-treasure props have stood since Chapter 4, with fume wisps overlapping four chests. The room is sealed from Phase 11/13 by door-warp variants and only matters again as the plume’s source in Chapter 147.
6. **One door, many warps.** Several doors are defined two to four times as warp variants on the same tile: the hold’s treasure door has 4 (`to_treasure`, `to_treasure_p2`, `p11_treasure_sealed`, `p13_treasure_sealed`), the galley’s door to the quarters has 4, the deck’s fore and main hatches have 3 each. It works because the first match wins, but door behaviour is spread over several phases’ files.
7. **Special areas are scattered and hard-wired.** The S.E.S. exists as four separate sets of props and objects (Mark I on deck at (14,17), the Mark II in the hold then the galley, the bedroom kit in the quarters, the portable set in the Fart-Free Zone), each with its own inspect objects. The counters reuse one tile in the quarters (12,14) under several names.
8. **Tiny rooms with huge placement tables.** The Fart-Free Zone has about 23 walkable tiles and 496 NPC placement rows; the Fart Zone has 68 tiles and 140 rows. The tables are correct but hard to reason about.
9. **Purposeless rooms.** The washroom matters in only two chapters (20 and 220). The captain’s cabin is mostly unchanged and under-used: 91 tiles, little gameplay.
10. **Coordinates are everywhere.** Objective texts name places (“the starboard rail”, “by the main hatch”). Inspect objects, triggers, script spawns and moves, fume rectangles and Shark Duty rail sections all use absolute tile coordinates, and the captain’s position in a save is absolute too.

## Room by room

### `main_deck` · Main Deck

- **Purpose:** The weather deck: the ship’s hub and the scene of most of the story’s set-pieces.
- **Layout:** Play area is columns 3–16 inside the rails. Rows 3–8 are the quarterdeck: helm at (9,6), binnacle at (11,6). Rows 9–11 are the cabin bulkhead, with the cabin door at (9,11). Midships (rows 12–23) holds the Fart Zone grating (9,17, from Phase 16), the mainmast (9,19) and the main hatch down to the galley (9,24). Forward are the foremast (9,29) and the fore hatch down to the crew quarters (9,33); the bow is rows 35–41. Outside the rails is sea, which is walkable in the collision grid but cut off by the rails. Base file `data/maps/ship/main_deck.json`; 15 patch file(s). Size 20×46 tiles; music `ship_theme`.
- **Access:** warps `p16_to_fz->stenchmaster_fart_zone@9,17`, `p13_to_crew->crew_quarters@9,33`, `p10_hatch_hold_on->galley@9,24`, `p9_to_crew->crew_quarters@9,33`, `to_galley_p2->galley@9,24`, `to_cabin->captains_quarters@9,11`, `to_galley->galley@9,24`, `to_crew->crew_quarters@9,33`; spawns `fz_grate`, `cabin_door`, `main_hatch`, `fore_hatch`. Door tiles carrying several warp variants: 9,17: p16_to_fz; 9,33: p13_to_crew, p9_to_crew, to_crew; 9,24: p10_hatch_hold_on, to_galley_p2, to_galley; 9,11: to_cabin.
- **Objects:** npc 1692, inspect 212, trigger 13, warp 8, block 6, spawn 4. Inspect/trigger objects by owning phase: base 40, p17 7, p16 12, p15 20, p14 8, p13 15, p12 4, p11 1, p10 22, p9 6, p7 16, p6 27, p5 21, p4 22, p3 3, ch1 1. Fume zones: 6; Shark Duty entries: 7.
- **Props:** 237 compiled (30 unconditional fixtures, 207 conditional). Live props by phase end: Pro 30 · P2 35 · P3 53 · P4 66 · P5 77 · P6 89 · P7 95 · P8 95 · P9 96 · P10 100 · P11 100 · P12 100 · P13 105 · P14 107 · P15 94 · P16 95 · P17 96. Story props visible only mid-phase (never at a phase end): 117. Story props that appear and are later retired: 24.
- **Story props that never go away** (live at the end of Phase 17, grouped by the phase end where they first appear). Some are real furniture that happens to be conditional, such as a mess table or a basket; the lifetime classes proposed below separate those from leftovers:
  - P2: `telescope`, `bathtub_deck`, `stain_floor`, `stain_small`
  - P3: `stain_yellow`×4, `rope_coil_damp`×4, `soapbox_barrel`, `stench_log_stand`, `perch_blanket`, `notice_nailed`, `chart_table`, `stain_yellow_big`, `grog_lashings`, `plank_pile`, `hull_patch_fresh`, `davit_empty`, `frog_mugs`
  - P4: `rail_bitten`×3, `forecast_board`, `crayon_box`, `notice_nailed`, `air_scuttle`, `patch_3`, `patch_2`, `patch_1`, `brace_ropes`, `bucket_over`
  - P5: `grog_side_table`, `stench_chair`, `notice_nailed`, `laundry_line_yellow`, `patch_1`, `patch_1_s`, `brace_ropes_s`, `patch_2_s`, `patch_3`
  - P6: `brace_ropes_s`×2, `ses_tv_off`, `brace_ropes`, `fork_in_wall`, `wall_hole`
  - P7: `lantern_fallen`, `horseshoe_gone`, `compass_gone`, `brace_ropes`, `brace_ropes_s`, `ses_tv_scrapped`
  - P9: `rowboat`
  - P10: `firing_mark`
  - P15: `skunk_crates`, `leisure_boat`, `sand_bucket`, `barrel_water`, `sign_safe_corner`, `visitor_chairs`
  - P16: `fz_hatch_open`
  - P17: `helm_log`
- **Overlapping anchors at P17:** `11,6:binnacle+compass_gone`, `5,7:rope_coil+rope_coil_damp`, `9,19:mast+mast_top+fork_in_wall`, `8,21:rope_coil+rope_coil_damp`, `11,18:rope_coil+rope_coil_damp`, `9,29:foremast+foremast_top`, `11,31:rope_coil+rope_coil_damp`, `9,20:notice_nailed+notice_nailed`, `16,21:hull_patch_fresh+patch_2+patch_3`, `16,19:patch_3+brace_ropes`, `16,23:patch_1+patch_1`, `14,17:ses_tv_off+ses_tv_scrapped`.
- **People by phase end:** Pro 7 · P2 11 · P3 13 · P4 15 · P5 16 · P6 16 · P7 0 · P8 0 · P9 4 · P10 1 · P11 1 · P12 2 · P13 8 · P14 1 · P15 4 · P16 1 · P17 1. NPC placement rows: 1692 for 36 different characters.
- **Navigation:** reachable tiles Pro 368, P8 345, P13 342, P17 330; choke tiles 1 / 7 / 16 / 28. People standing on choke tiles: P13 garrick@5,8, bob@6,13; P17 none. Inspectables nobody can stand next to: P8 none; P17 none.

### `galley` · Galley

- **Purpose:** Kitchen and mess. From Phase 10 it is also the dormitory, TV lounge and dice court.
- **Layout:** Stove (1,4), prep table (5,4), long table (7,7), stores (16,8), the Mark II corner (16,7, from Phase 10). Exits: ladder to the deck (14,3), the door down to the crew quarters (8,12) and the stairs down to the hold (12,10). Base file `data/maps/ship/galley.json`; 15 patch file(s). Size 18×13 tiles; music `ship_theme`.
- **Access:** warps `p13_to_crew->crew_quarters@8,12`, `p8_to_crew->crew_quarters@8,12`, `p4_to_crew->crew_quarters@8,12`, `p4_to_hold->cargo_hold@12,10`, `to_deck->main_deck@14,3`, `to_crew->crew_quarters@8,12`, `to_hold->cargo_hold@12,10`; spawns `ladder`, `south_door`, `stairs`. Door tiles carrying several warp variants: 8,12: p13_to_crew, p8_to_crew, p4_to_crew, to_crew; 12,10: p4_to_hold, to_hold; 14,3: to_deck.
- **Objects:** npc 1139, inspect 178, warp 7, spawn 3, block 1. Inspect/trigger objects by owning phase: p17 6, p16 5, p15 21, p14 21, p13 8, p12 24, p11 40, p10 32, p8 3, p7 1, p6 1, p5 2, p4 4, base 10. Fume zones: 4; Shark Duty entries: 0.
- **Props:** 126 compiled (16 unconditional fixtures, 110 conditional). Live props by phase end: Pro 16 · P2 25 · P3 27 · P4 28 · P5 29 · P6 30 · P7 30 · P8 32 · P9 32 · P10 45 · P11 51 · P12 55 · P13 55 · P14 59 · P15 63 · P16 63 · P17 64. Story props visible only mid-phase (never at a phase end): 52. Story props that appear and are later retired: 10.
- **Story props that never go away** (live at the end of Phase 17, grouped by the phase end where they first appear). Some are real furniture that happens to be conditional, such as a mess table or a basket; the lifetime classes proposed below separate those from leftovers:
  - P2: `mess_table`, `pickle_barrel`, `brine_crock`, `note_no_eel`, `captain_portrait`, `sign_no_garrick`, `knitting_basket`, `stain_small`, `stain_floor`
  - P3: `frog_grog_cask`, `stain_yellow`
  - P4: `squawks_basket`
  - P5: `bread_loaves`
  - P6: `garlic_jar`
  - P10: `bean_sack_bed`×4, `cans_spilled`×2, `hammock_patched`, `ses2_sauce`
  - P11: `hammock_sash`×3, `bed_sash_sacks`, `lamp_six_rope`, `org_chart_wall`, `apron_hooks`, `cheap_o_rama_crate_open`, `sash_boxes`, `porthole_latch`
  - P12: `grand_dice_floor_4`, `grand_dice_floor_3`, `dice_six_pack`, `breakfast_normal`
  - P13: `wire_run`×2
  - P14: `gtoken_spill`×2, `oat_remnants`×2
  - P15: `snack_wreckage`×2, `mk2_parts`, `blanket_ready`, `tv_protocol_sign`
  - P17: `ledger_books`
- **Overlapping anchors at P17:** `15,6:crate+lamp_six_rope+wire_run`, `7,7:lantern_hanging+mess_table+breakfast_normal`, `8,8:stain_small+grand_dice_floor_4+grand_dice_floor_3`, `14,10:bean_sack_bed+mk2_parts`, `11,5:gtoken_spill+snack_wreckage`.
- **People by phase end:** Pro 2 · P2 3 · P3 3 · P4 3 · P5 3 · P6 3 · P7 0 · P8 0 · P9 0 · P10 9 · P11 9 · P12 8 · P13 0 · P14 6 · P15 6 · P16 0 · P17 0. NPC placement rows: 1139 for 31 different characters.
- **Navigation:** reachable tiles Pro 109, P8 100, P13 96, P17 96; choke tiles 5 / 5 / 9 / 9. People standing on choke tiles: P13 none; P17 none. Inspectables nobody can stand next to: P8 none; P17 p15_protocol@12,3, p11_porthole_look@9,2.

### `crew_quarters` · Crew Quarters

- **Purpose:** Berths. From Phase 13 also the merch shrine, Brogath’s containment area and canopy, the bank/branch/dispensary/bureau/credit counter, the converter, the speaking tube and the Sash Lounge.
- **Layout:** Exits: washroom (3,3), ladder to the deck (13,3), door to the galley (8,3). The counter is at (12,14), the converter at (7,14), the Brogath Rules board at (9,12) and the canopy at (9,7). Base file `data/maps/ship/crew_quarters.json`; 12 patch file(s). Size 18×18 tiles; music `ship_theme`.
- **Access:** warps `to_washroom->washroom@3,3`, `to_deck->main_deck@13,3`, `to_galley->galley@8,3`; spawns `washroom_door`, `ladder`, `north_door`. Door tiles carrying several warp variants: none.
- **Objects:** npc 898, inspect 188, spawn 3, warp 3, block 1, trigger 1. Inspect/trigger objects by owning phase: base 17, p17 17, p16 43, p15 29, p14 32, p13 48, p7 1, p6 1, p4 1. Fume zones: 6; Shark Duty entries: 0.
- **Props:** 145 compiled (15 unconditional fixtures, 130 conditional). Live props by phase end: Pro 23 · P2 26 · P3 26 · P4 27 · P5 27 · P6 28 · P7 28 · P8 28 · P9 28 · P10 28 · P11 28 · P12 28 · P13 43 · P14 50 · P15 59 · P16 65 · P17 72. Story props visible only mid-phase (never at a phase end): 57. Story props that appear and are later retired: 16.
- **Story props that never go away** (live at the end of Phase 17, grouped by the phase end where they first appear). Some are real furniture that happens to be conditional, such as a mess table or a basket; the lifetime classes proposed below separate those from leftovers:
  - P2: `shackle_chain`, `rag_hooks`, `stain_small`
  - P4: `door_washroom`
  - P13: `hammock_sash_bunk`×2, `cot_sash`×2, `merch_bunting`×2, `merch_clutter`×2, `wire_run`×2, `grand_hammock_sash`, `linen_locker_sealed`, `megapack_open`, `ses_kit_on`, `quarters_shelf`, `standee_stenchalina`, `standee_rumpold`, `standee_gustavio`
  - P14: `scorch_ring`, `porthole_cracked`, `barricade_table`, `grog_barrel_sealed`, `blanket_wall`, `standee_rumpus`, `rules_sheet_4`, `gtoken_spill`, `oat_remnants`, `speaking_tube`
  - P15: `hammock_stripped`×3, `sash_pad`×3, `sash_pad_small`, `captain_pennant`, `sash_pad_grand`, `agnes_perch`, `captains_rules_sheet`
  - P16: `fume_canopy`, `bureau_counter`, `branch_bell`, `credit_terminal`, `sash_lounge_sign`, `sash_lounge_bunting`
  - P17: `papers_scattered`×2, `cutout_jeb`, `cutout_ned`, `cutout_elsie`, `coffin_sock_board_blown`, `converter_planked`, `sash_screen`
- **Overlapping anchors at P17:** `9,2:wall_hooks+porthole_cracked`, `10,6:barrel_table+ses_kit_on`, `11,3:rag_hooks+linen_locker_sealed`, `12,8:stain_small+megapack_open`, `12,12:grand_hammock_sash+blanket_wall`, `2,10:merch_clutter+sash_pad_small`, `12,5:wire_run+standee_rumpold`, `5,3:quarters_shelf+sash_lounge_sign`, `9,12:barricade_table+captains_rules_sheet+coffin_sock_board_blown`.
- **People by phase end:** Pro 1 · P2 3 · P3 3 · P4 2 · P5 1 · P6 0 · P7 0 · P8 0 · P9 0 · P10 0 · P11 0 · P12 0 · P13 0 · P14 1 · P15 1 · P16 12 · P17 13. NPC placement rows: 898 for 28 different characters.
- **Navigation:** reachable tiles Pro 150, P8 147, P13 141, P17 127; choke tiles 13 / 12 / 18 / 33. People standing on choke tiles: P13 none; P17 ned@7,12, squawks@16,11. Inspectables nobody can stand next to: P8 none; P17 none.

### `cargo_hold` · Cargo Hold

- **Purpose:** Storage: crates, barrels, powder, the pump. From Phase 7 the shelter, from Phase 8 the barracks, and permanently the home of the eleven stranded crew.
- **Layout:** Exits: stairs to the galley (14,3), the treasure-room door (4,3), and the little door under the stairs to the Fart-Free Zone (13,3, from Phase 14). Bilge pump at (10,15). The prologue’s rat encounters are here. Base file `data/maps/ship/cargo_hold.json`; 15 patch file(s). Size 20×18 tiles; music `ship_theme`.
- **Access:** warps `p16_bunker_door->fart_free_zone@13,3`, `p14_to_zone->fart_free_zone@13,3`, `p13_treasure_sealed->treasure_hold@4,3`, `p11_treasure_sealed->treasure_hold@4,3`, `p8_to_galley->galley@14,3`, `to_treasure_p2->treasure_hold@4,3`, `to_galley->galley@14,3`, `to_treasure->treasure_hold@4,3`; spawns `stairs`, `treasure_door`. Door tiles carrying several warp variants: 13,3: p16_bunker_door, p14_to_zone; 4,3: p13_treasure_sealed, p11_treasure_sealed, to_treasure_p2, to_treasure; 14,3: p8_to_galley, to_galley.
- **Objects:** npc 419, inspect 82, warp 8, trigger 3, enemy 3, spawn 2, block 1, chest 1. Inspect/trigger objects by owning phase: p17 5, p16 3, p14 12, p13 3, p12 2, p10 7, p9 12, p8 27, p7 9, p4 2, base 3. Fume zones: 9; Shark Duty entries: 0.
- **Props:** 129 compiled (35 unconditional fixtures, 94 conditional). Live props by phase end: Pro 36 · P2 40 · P3 43 · P4 44 · P5 44 · P6 44 · P7 54 · P8 72 · P9 75 · P10 76 · P11 77 · P12 78 · P13 79 · P14 83 · P15 83 · P16 83 · P17 83. Story props visible only mid-phase (never at a phase end): 31. Story props that appear and are later retired: 15.
- **Story props that never go away** (live at the end of Phase 17, grouped by the phase end where they first appear). Some are real furniture that happens to be conditional, such as a mess table or a basket; the lifetime classes proposed below separate those from leftovers:
  - P2: `stain_small`×2, `door_marks`, `stain_floor`
  - P3: `wood_yellow_wall`, `stain_yellow_big`, `stain_yellow`
  - P4: `biscuit_crate`
  - P7: `stench_chair`, `notice_nailed`
  - P8: `hammock_sail`×6, `hammock_blue`×4, `hammock_patched`×4, `hanging_pulley`, `garrick_rug`, `costume_trunk_open`, `squawks_cradle`, `crown_crate`, `sailcloth_screen`, `hammock_net`, `gristle_rig`, `rope_pillow`
  - P9: `hull_gap`×2, `bunk_double`, `plan_board`
  - P10: `sauce_stain`×2, `bean_pantry_open`, `sauce_vat_vented`
  - P12: `salvage_crate`
  - P14: `nook_door`, `sign_brogath_never`, `gtoken_spill`, `oat_remnants`, `bunker_sign`
  - P17: `treasure_door_reinforced`
- **Overlapping anchors at P17:** `17,5:barrel+gristle_rig`, `1,7:crate_stack+hammock_sail`, `4,7:crate+hammock_blue`, `1,10:powder_keg+hammock_net`, `8,10:mast_pillar+notice_nailed`.
- **People by phase end:** Pro 1 · P2 1 · P3 1 · P4 0 · P5 0 · P6 0 · P7 19 · P8 18 · P9 12 · P10 11 · P11 11 · P12 11 · P13 11 · P14 11 · P15 11 · P16 11 · P17 11. NPC placement rows: 419 for 36 different characters.
- **Navigation:** reachable tiles Pro 203, P8 191, P13 189, P17 190; choke tiles 11 / 6 / 6 / 5. People standing on choke tiles: P13 none; P17 none. Inspectables nobody can stand next to: P8 none; P17 none. Placed people on tiles the captain can’t reach at P8 (hammock sleepers slung over crates, by design): hale@2,7, wick@5,7, fennimore@12,5, bob@2,10, jim@17,10.

### `treasure_hold` · Treasure Hold

- **Purpose:** The treasure room, contaminated in Chapter 4 and sealed from Phase 11/13; the source of Brogath’s plume (Chapter 147).
- **Layout:** One door (9,13) to the hold. Its 39 ruined-treasure props have stood since Phase 2. Base file `data/maps/ship/treasure_hold.json`; 2 patch file(s). Size 20×14 tiles; music `ship_theme`.
- **Access:** warps `to_hold->cargo_hold@9,13`; spawns `door`. Door tiles carrying several warp variants: none.
- **Objects:** inspect 11, npc 4, spawn 1, warp 1, trigger 1. Inspect/trigger objects by owning phase: base 12. Fume zones: 4; Shark Duty entries: 0.
- **Props:** 81 compiled (8 unconditional fixtures, 73 conditional). Live props by phase end: Pro 40 · P2 47 · P3 47 · P4 47 · P5 47 · P6 47 · P7 47 · P8 47 · P9 47 · P10 47 · P11 47 · P12 47 · P13 47 · P14 47 · P15 47 · P16 47 · P17 47. Story props visible only mid-phase (never at a phase end): 2. Story props that appear and are later retired: 32.
- **Story props that never go away** (live at the end of Phase 17, grouped by the phase end where they first appear). Some are real furniture that happens to be conditional, such as a mess table or a basket; the lifetime classes proposed below separate those from leftovers:
  - P2: `coin_scatter_foul`×6, `gold_pile_foul`×4, `fume_wisp`×4, `candelabra_foul`×2, `gold_bars_foul`×2, `treasure_chest_foul`×2, `jewel_pile_foul`×2, `silver_pile_foul`×2, `stain_floor`×2, `idol_foul`, `treasure_chest_open_foul`, `crown_cushion_foul`, `goblet_stand_foul`, `necklace_stand_foul`, `gold_statue_foul`, `artifact_mirror_foul`, `strongbox_foul`, `pearl_bowl_foul`, `treasure_chest_small_foul`, `crown_loose_foul`, `chest_broken_foul`, `stain_small`
- **Overlapping anchors at P17:** `3,4:treasure_chest_open_foul+fume_wisp`, `9,4:treasure_chest_foul+fume_wisp`, `17,8:treasure_chest_small_foul+fume_wisp`, `12,11:chest_broken_foul+fume_wisp`.
- **People by phase end:** Pro 0 · P2 0 · P3 0 · P4 0 · P5 0 · P6 0 · P7 0 · P8 0 · P9 0 · P10 0 · P11 0 · P12 0 · P13 0 · P14 0 · P15 0 · P16 0 · P17 0. NPC placement rows: 4 for 1 different characters.
- **Navigation:** reachable tiles Pro 128, P8 128, P13 128, P17 128; choke tiles 5 / 5 / 5 / 5. People standing on choke tiles: P13 none; P17 none. Inspectables nobody can stand next to: P8 none; P17 none.

### `captains_quarters` · Captain's Quarters

- **Purpose:** The captain’s cabin: bed, desk (purse and reserve), wardrobe (sash custody), sea chest.
- **Layout:** Single exit to the deck at (8,11). Barely touched by later phases. Base file `data/maps/ship/captains_quarters.json`; 12 patch file(s). Size 18×12 tiles; music `ship_theme`.
- **Access:** warps `p4_to_deck->main_deck@8,11`, `to_deck->main_deck@8,11`; spawns `start`, `door`. Door tiles carrying several warp variants: 8,11: p4_to_deck, to_deck.
- **Objects:** npc 67, inspect 27, warp 2, spawn 2, chest 1. Inspect/trigger objects by owning phase: p16 2, p15 3, p14 2, p13 2, p12 3, p7 1, p6 1, p5 1, p4 1, base 11. Fume zones: 1; Shark Duty entries: 0.
- **Props:** 21 compiled (16 unconditional fixtures, 5 conditional). Live props by phase end: Pro 16 · P2 16 · P3 16 · P4 16 · P5 16 · P6 16 · P7 16 · P8 16 · P9 16 · P10 16 · P11 16 · P12 17 · P13 17 · P14 16 · P15 17 · P16 17 · P17 17. Story props visible only mid-phase (never at a phase end): 3. Story props that appear and are later retired: 1.
- **Story props that never go away** (live at the end of Phase 17, grouped by the phase end where they first appear). Some are real furniture that happens to be conditional, such as a mess table or a basket; the lifetime classes proposed below separate those from leftovers:
  - P15: `loose_floorboard_weed`
- **Overlapping anchors at P17:** none.
- **People by phase end:** Pro 0 · P2 0 · P3 0 · P4 0 · P5 0 · P6 0 · P7 0 · P8 0 · P9 0 · P10 0 · P11 0 · P12 0 · P13 0 · P14 0 · P15 0 · P16 0 · P17 0. NPC placement rows: 67 for 21 different characters.
- **Navigation:** reachable tiles Pro 91, P8 91, P13 91, P17 91; choke tiles 6 / 6 / 6 / 6. People standing on choke tiles: P13 none; P17 none. Inspectables nobody can stand next to: P8 mirror@2,3; P17 mirror@2,3.

### `washroom` · Washroom

- **Purpose:** Washroom.
- **Layout:** One door (5,8) to the crew quarters; the mirror is at (2,4). Used in Chapter 20 (Dunstan) and Chapter 220 (the shave). Base file `data/maps/ship/washroom.json`; 1 patch file(s). Size 12×9 tiles; music `ship_theme`.
- **Access:** warps `to_crew->crew_quarters@5,8`; spawns `door`, `start`. Door tiles carrying several warp variants: none.
- **Objects:** npc 22, inspect 8, spawn 2, warp 1. Inspect/trigger objects by owning phase: p17 1, base 7. Fume zones: 0; Shark Duty entries: 0.
- **Props:** 8 compiled (8 unconditional fixtures, 0 conditional). Live props by phase end: Pro 8 · P2 8 · P3 8 · P4 8 · P5 8 · P6 8 · P7 8 · P8 8 · P9 8 · P10 8 · P11 8 · P12 8 · P13 8 · P14 8 · P15 8 · P16 8 · P17 8. Story props visible only mid-phase (never at a phase end): 0. Story props that appear and are later retired: 0.
- **Overlapping anchors at P17:** none.
- **People by phase end:** Pro 0 · P2 0 · P3 0 · P4 0 · P5 0 · P6 0 · P7 0 · P8 0 · P9 0 · P10 0 · P11 0 · P12 0 · P13 0 · P14 0 · P15 0 · P16 0 · P17 0. NPC placement rows: 22 for 21 different characters.
- **Navigation:** reachable tiles Pro 37, P8 37, P13 37, P17 37; choke tiles 2 / 2 / 2 / 2. People standing on choke tiles: P13 none; P17 none. Inspectables nobody can stand next to: P8 none; P17 none.

### `fart_free_zone` · The Fart-Free Zone

- **Purpose:** The cupboard under the hold stairs: the crew’s sanctuary from Phase 14.
- **Layout:** One door (5,7). About 23 walkable tiles. Base file `data/maps/ship/fart_free_zone.json`; 3 patch file(s). Size 11×8 tiles; music `zone_quiet`.
- **Access:** warps `to_hold->cargo_hold@5,7`; spawns `door`, `bed`, `start`. Door tiles carrying several warp variants: none.
- **Objects:** npc 496, inspect 28, spawn 3, warp 1. Inspect/trigger objects by owning phase: p17 4, p16 7, base 17. Fume zones: 0; Shark Duty entries: 0.
- **Props:** 26 compiled (0 unconditional fixtures, 26 conditional). Live props by phase end: Pro 3 · P2 3 · P3 3 · P4 3 · P5 3 · P6 3 · P7 3 · P8 3 · P9 3 · P10 3 · P11 3 · P12 3 · P13 3 · P14 18 · P15 19 · P16 20 · P17 21. Story props visible only mid-phase (never at a phase end): 2. Story props that appear and are later retired: 3.
- **Story props that never go away** (live at the end of Phase 17, grouped by the phase end where they first appear). Some are real furniture that happens to be conditional, such as a mess table or a basket; the lifetime classes proposed below separate those from leftovers:
  - P14: `zone_blankets`×2, `barrel`×2, `cards_floor`×2, `zone_mattress`, `zone_table`, `zone_slate`, `zone_sashes`, `zone_rags`, `zone_pillows`, `zone_hardtack`, `zone_grog`, `zone_cards`, `zone_sign`, `bunker_sign`, `speaking_tube`
  - P15: `sign_no_beard`
  - P16: `portable_tv`
  - P17: `sash_knotted`
- **Overlapping anchors at P17:** `5,4:zone_table+zone_cards`, `7,3:zone_blankets+bunker_sign`, `4,3:zone_sashes+sash_knotted`.
- **People by phase end:** Pro 0 · P2 0 · P3 0 · P4 0 · P5 0 · P6 0 · P7 0 · P8 0 · P9 0 · P10 0 · P11 0 · P12 0 · P13 0 · P14 0 · P15 0 · P16 0 · P17 1. NPC placement rows: 496 for 21 different characters.
- **Navigation:** reachable tiles Pro 25, P8 25, P13 25, P17 23; choke tiles 2 / 2 / 2 / 5. People standing on choke tiles: P13 none; P17 none. Inspectables nobody can stand next to: P8 none; P17 none.

### `stenchmaster_fart_zone` · The Stenchmaster Fart Zone

- **Purpose:** The old sail locker under the midships grating, built into the Fart Zone in Phase 16.
- **Layout:** One ladder (7,9) up to the deck; three portholes on the sea side. Base file `data/maps/ship/stenchmaster_fart_zone.json`; 2 patch file(s). Size 16×10 tiles; music `zone_quiet`.
- **Access:** warps `to_deck->main_deck@7,9`; spawns `door`, `start`. Door tiles carrying several warp variants: none.
- **Objects:** npc 140, inspect 25, spawn 2, warp 1. Inspect/trigger objects by owning phase: p17 3, p16 22. Fume zones: 0; Shark Duty entries: 0.
- **Props:** 21 compiled (2 unconditional fixtures, 19 conditional). Live props by phase end: Pro 5 · P2 5 · P3 5 · P4 5 · P5 5 · P6 5 · P7 5 · P8 5 · P9 5 · P10 5 · P11 5 · P12 5 · P13 5 · P14 5 · P15 5 · P16 13 · P17 15. Story props visible only mid-phase (never at a phase end): 3. Story props that appear and are later retired: 3.
- **Story props that never go away** (live at the end of Phase 17, grouped by the phase end where they first appear). Some are real furniture that happens to be conditional, such as a mess table or a basket; the lifetime classes proposed below separate those from leftovers:
  - P16: `fz_porthole_open`×3, `fz_sign`×2, `fz_rope_post`×2, `fz_rules_board`, `fz_queue_rope`, `fz_release_mark`, `fz_door_dents`
  - P17: `fz_scorch`, `feathers_floor`
- **Overlapping anchors at P17:** none.
- **People by phase end:** Pro 0 · P2 0 · P3 0 · P4 0 · P5 0 · P6 0 · P7 0 · P8 0 · P9 0 · P10 0 · P11 0 · P12 0 · P13 0 · P14 0 · P15 0 · P16 0 · P17 0. NPC placement rows: 140 for 21 different characters.
- **Navigation:** reachable tiles Pro 65, P8 65, P13 65, P17 68; choke tiles 1 / 1 / 1 / 4. People standing on choke tiles: P13 none; P17 none. Inspectables nobody can stand next to: P8 none; P17 none.

### `reef_passage` · The Reef Passage

- **Purpose:** Phase 9 landing sequence (boats through the reef).
- **Layout:** Off-ship, 22×50; 19 trigger tiles drive the run. Base file `data/maps/island/reef_passage.json`; 0 patch file(s). Size 22×50 tiles; music `landing_tension`.
- **Access:** warps none (entered by script transition); spawns `from_ship`, `beach`. Door tiles carrying several warp variants: none.
- **Objects:** trigger 19, spawn 2, inspect 1. Inspect/trigger objects by owning phase: p9 20. Fume zones: 0; Shark Duty entries: 0.
- **Props:** 2 compiled (2 unconditional fixtures, 0 conditional). Live props by phase end: Pro 2 · P2 2 · P3 2 · P4 2 · P5 2 · P6 2 · P7 2 · P8 2 · P9 2 · P10 2 · P11 2 · P12 2 · P13 2 · P14 2 · P15 2 · P16 2 · P17 2. Story props visible only mid-phase (never at a phase end): 0. Story props that appear and are later retired: 0.
- **Overlapping anchors at P17:** none.
- **People by phase end:** Pro 0 · P2 0 · P3 0 · P4 0 · P5 0 · P6 0 · P7 0 · P8 0 · P9 0 · P10 0 · P11 0 · P12 0 · P13 0 · P14 0 · P15 0 · P16 0 · P17 0. NPC placement rows: 0 for 0 different characters.
- **Navigation:** reachable tiles Pro 818, P8 818, P13 818, P17 818; choke tiles 0 / 0 / 0 / 0. People standing on choke tiles: P13 none; P17 none. Inspectables nobody can stand next to: P8 none; P17 none.

### `crownskull_isle` · Crownskull Isle

- **Purpose:** Phase 9–10 island: beach, trail, ford, ruins, clearing and crater.
- **Layout:** Off-ship, 60×72, the largest map. Has 4 chests and 10 blocks. Base file `data/maps/island/crownskull_isle.json`; 1 patch file(s). Size 60×72 tiles; music `crownskull_isle`.
- **Access:** warps none (entered by script transition); spawns `landing`, `from_ship`. Door tiles carrying several warp variants: none.
- **Objects:** npc 91, inspect 41, block 10, trigger 6, chest 4, spawn 2. Inspect/trigger objects by owning phase: p10 17, p9 30. Fume zones: 0; Shark Duty entries: 0.
- **Props:** 106 compiled (66 unconditional fixtures, 40 conditional). Live props by phase end: Pro 66 · P2 66 · P3 66 · P4 66 · P5 66 · P6 66 · P7 66 · P8 66 · P9 83 · P10 82 · P11 82 · P12 82 · P13 82 · P14 82 · P15 82 · P16 82 · P17 82. Story props visible only mid-phase (never at a phase end): 23. Story props that appear and are later retired: 1.
- **Story props that never go away** (live at the end of Phase 17, grouped by the phase end where they first appear). Some are real furniture that happens to be conditional, such as a mess table or a basket; the lifetime classes proposed below separate those from leftovers:
  - P9: `debris_island`×4, `debris_island_b`×4, `foul_coins`×2, `crater`, `uprooted_palm`, `stone_block`, `braced_wall`, `beam`, `shelter_cloth`
- **Overlapping anchors at P17:** none.
- **People by phase end:** Pro 0 · P2 0 · P3 0 · P4 0 · P5 0 · P6 0 · P7 0 · P8 0 · P9 6 · P10 0 · P11 0 · P12 0 · P13 0 · P14 0 · P15 0 · P16 0 · P17 0. NPC placement rows: 91 for 7 different characters.
- **Navigation:** reachable tiles Pro 3134, P8 3134, P13 3101, P17 3101; choke tiles 20 / 20 / 26 / 26. People standing on choke tiles: P13 none; P17 none. Inspectables nobody can stand next to: P8 none; P17 none.

## Redesign proposal

### Goals

A working ship whose compartments each have one clear function. Every station is used by a named crew member (`02-crew-audit.md`), the central routes stay clear, special story facilities live in configurable areas instead of accumulating, and every existing interaction and trigger keeps working.

### Compartments and functions

| Compartment | Map today | Function after the redesign | Permanent fixtures | Configurable / temporary |
|---|---|---|---|---|
| Quarterdeck | main_deck rows 3–8 | Command: helm, binnacle, chart table, helm log | Helm, binnacle, taffrail, chart table | Forecast board (Phases 4–6) |
| Waist (midships) | main_deck rows 12–23 | Work deck: mainmast, capstan, guns, grating to the Fart Zone, main hatch | Mainmast, capstan, port/starboard guns, grating, hatch | Storm damage decals driven by Ship Integrity; S.E.S. Mark I slot (14,17) |
| Forecastle and bow | main_deck rows 24–41 | Lookout, bell, foremast; guest corner from Phase 15 | Foremast, bell, telescope, fore hatch | Guest corner (visitors), rowboat davits |
| Captain’s cabin | captains_quarters | Captain’s home and planning: bed, desk, wardrobe, sea chest, Squawks’s basket; the “war room” for plans (the boards of Chapters 60 and 87) | All current furniture | Plan board slot |
| Galley and mess | galley | Cooking and eating only; the cooking system lives here | Stove, prep table, long table, stores, ladder, stairs | S.E.S. corner (16,7) as a TV slot; dormitory states only during Phases 10–12 |
| Berth deck | crew_quarters (berth section) | Bunks for the whole crew, the sick bay corner, Brogath’s canopy alcove | Bunks, hammock beams, linen locker, washroom door | Canopy alcove; story decor slots (standees) capped and retired by arc |
| Counter alcove | crew_quarters (12,14) area, or a new compartment | One counter with modes: Grand Bank, Bashfulness Branch, Dispensary, Bureau of Ignition, Credit | Counter, bell, queue rope | Mode-specific dressing (signs, terminal, converter) from a single table |
| Hold: stores | cargo_hold (north and west) | Storage, Quill’s stores office | Crates, barrels, powder, stores desk | Shelter/barracks states (Phases 7–9) only |
| Hold: workshop | cargo_hold (by the stairs) | Jory’s carpenter’s bench (Ship Integrity materials) | Bench, plank rack | – |
| Hold: bilge | cargo_hold (pump at 10,15) | Pumping (flooding mechanic) | Pump | Water level decals |
| Brig | cargo_hold corner or new | Penhallow’s cell or stall | Cell door | – |
| Treasure hold | treasure_hold | Sealed hazard room, later the vault for recovered treasure (the open Crimson Fortune quest) | Door, chests | Foul treasure set (Phase 2 arc) → vault set |
| Fart-Free Zone | fart_free_zone | Sanctuary and rest point (checkpoint candidate) | Mattress, slate, barrels | Card game, portable TV |
| Fart Zone | stenchmaster_fart_zone | Procedure room (Phase 16+) | Portholes, door, rope posts, rules board | Scorch and feather decals |
| Washroom | washroom | Beard care: washing lowers Beard Saturation; shaving resets it (Chapter 220) | Basin, mirror | – |

**Additional compartments.** Two are worth considering. (a) An **orlop or counting deck** below the quarters, for the counter alcove and the converter, so the berth deck stays a berth deck. (b) A **sick bay**, which could instead be a corner of the berth deck. Neither is required: the low-risk option is to partition the crew quarters into a berth section and a counter alcove inside the existing 18×18 footprint. That keeps every objective text that says “the counter, Crew Quarters” true.

### Routes

- A clear **spine on the main deck** (columns 9–10 from the cabin door at (9,11), past the grating, the mainmast, the main hatch and the fore hatch, to the bow): no props on it, ever. Working props stand in the rail zones (columns 3–6 and 13–16).
- **Below decks** keeps its three doors: the galley ladder, the galley–quarters door and the hold stairs. Door tiles do not move, so no transition breaks.
- **Choke budget:** no room may end a phase with more choke tiles than its prologue value plus a small margin, and nobody stands on a choke tile by default. Both are measured by the same analysis this audit used.

### Permanent versus temporary objects

Every prop gets a lifetime class, enforced by the content validator:

- **fixture**: structure (mast, stove, hatch, rail, counter). Never conditional.
- **furniture**: moved only by a deliberate story state, such as the barracks hammocks.
- **story**: belongs to one arc and must carry an end condition. The `propConditions` retirement mechanism already exists in `ContentDB`; this rule makes it mandatory.
- **residue**: stains, patches, scorch marks. These stop accumulating as individual props and become a capped set of room decals driven by the room’s Ship Integrity and Atmosphere values, so the deck can look battered without 30 hand-placed patches.

### Configurable special areas

- **TV slot.** One TV placement table resolved by a story value (`none`, `mark1_deck`, `mark2_hold`, `mark2_galley`, `kit_quarters`, `portable_ffz`), replacing four independent prop and object sets. Each slot keeps its existing inspect ids.
- **Counter alcove.** One counter, one bell and one queue, with a `mode` value (`bank`, `branch`, `dispensary`, `bureau`, `credit`) choosing the sign, dressing and customer table. Today all of these use tile (12,14).
- **Fart Zone and Fart-Free Zone.** Keep them as their own small maps; they are already the right shape. Trim their placement tables to the roster defaults (see the crew audit).
- **Brogath’s canopy.** A defined alcove with a flutter radius in which no fluttering props and no crew stations may be placed.

### Why some changes are hard, and the safest approach

**Why it is hard:**
- Inspect objects (801), triggers (43), script spawns and moves (333), fume rectangles (30), Shark Duty rails, decor spots and placement rows (4,968) all use absolute tile coordinates.
- Objective texts describe locations in words, and the captain’s saved position is an absolute tile.
- Placement rows are first-match tables spread over 17 phases of patches, so moving one character’s default can be overridden by a row added years of story earlier.
- Props are appended, never replaced, which is how the shared anchors arose.

**Safest approach, in order:**
1. **Freeze door tiles.** Warps and spawns keep their coordinates, so no transition, save position or story walker breaks.
2. **Build a coordinate reference index** (a read-only tool, like this audit’s scripts). For each room it lists every reference to a tile: objects, script steps, fume zones, rails, decor spots, placement rows. A change to a room starts from that list.
3. **Introduce named anchors** (`main_deck:helm`, `galley:tv_slot`), resolved from map data, and move scripts and objects to them one room at a time. Prologue inspect targets already use this form (`main_deck:helm`, `treasure_hold:hoard`).
4. **Retire before relocating.** First add end conditions to finished story props (pure data, low risk). Then relocate fixtures. Then reshape tiles, last and only where needed.
5. **Make the audit a regression test.** For every room and all 17 presets, check reachability, choke tiles, unreachable inspectables, live props and placements against a recorded snapshot, so any change shows its effect.
6. **Bump the save version with a migration** if any room’s tiles change: move a saved captain standing on a now-solid tile to the room’s nearest spawn (`src/systems/save/migrations.js`).

### Retro identity and hardware practicality

- Keep the 16×16 tile grid, the procedural tile and prop art, and the room sizes, all within the 20×46 maximum noted in `docs/RETRO_PORT_NOTES.md`.
- Per-room budgets help a later 16-bit port as well as today’s readability. Aim for at most about 40 live props on any one 20×14-tile screen, at most 24 placed NPCs per room, and stains and patches as background decals rather than sprites.
- Replace the deep first-match placement tables with a per-room, per-NPC index plus a small set of scene overrides. That is the “current placement index” byte per NPC that `RETRO_PORT_NOTES.md` already anticipates.

## Acceptance criteria for the layout work (later prompts)

- No door tile moves. Every story walker (`tests/phase*_story.test.js`, `tests/phase10Play.js` … `tests/phase17Play.js`), `tests/storyStaging.js`, `tests/placements.test.js` and the E2E smoke suite pass after each room change.
- At every phase-complete preset: zero inspectables that are both live and unreachable; reachable area at least the prologue value minus 5%; no NPC default placement on a choke tile.
- No prop anchor shared by two story props (fixtures may layer, e.g. mast and mast top).
- Every conditional prop has a lifetime class, and every `story` prop has an end condition (validator rule in `src/content/validateContent.js`).
- The TV and counter special areas are each driven by one table, with their existing inspect ids preserved.

Source paths: `data/maps/ship/`, `data/maps/island/`, `data/props/`, `src/maps/compileMap.js`, `src/content/ContentDB.js` (patch merge, `propConditions`, decor slots), `src/world/placements.js`, `src/world/worldServices.js`, `src/scenes/WorldScene.js`, `src/content/validateContent.js`, `src/systems/save/migrations.js`, `tests/storyStaging.js`.
