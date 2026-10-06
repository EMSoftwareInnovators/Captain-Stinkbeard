/**
 * The timing bar's variants: title, prompt, sounds, and the captain's stat it
 * leans on (see SKILL_STATS in OverlayScene): heaving and hammering on Muscle (attack), knots
 * and fiddly work on Hands (speed), keeping your feet on Footing (defense).
 */
export const REPAIR_KINDS = {
  hull: { title: 'PATCH THE HULL', hint: 'Strike on the green!', stat: 'attack', hit: 'hammer_hit', miss: 'hammer_miss', done: 'repair_done' },
  shark: { title: 'REPEL THE SHARK', hint: 'Shove on the green!', stat: 'attack', hit: 'pole_strike', miss: 'pole_whiff', done: 'shark_repelled', speed: 170 },
  rope: { title: 'SECURE THE ROPE', hint: 'Haul on the green!', stat: 'speed', hit: 'rope_haul', miss: 'hammer_miss', done: 'repair_done' },
  helm: { title: 'BRING HER ABOUT', hint: 'Hold her on the mark!', stat: 'defense', hit: 'wheel_turn', miss: 'hammer_miss', done: 'repair_done', speed: 120 },
  // Story Phase 6
  smother: { title: 'SMOTHER IT', hint: 'Pat it out on the green!', stat: 'speed', hit: 'smother', miss: 'ember_hiss', done: 'repair_done', speed: 110 },
  brace: { title: 'BRACE!', hint: 'Haul on the green!', stat: 'defense', hit: 'rope_haul', miss: 'hammer_miss', done: 'repair_done', speed: 140 },
  heave: { title: 'HEAVE!', hint: 'Push together on the green!', stat: 'attack', hit: 'heave', miss: 'shark_flop', done: 'splash_big', speed: 150 },
  barrel: { title: 'LAUNCH THE BARREL', hint: 'Let go on the green!', stat: 'attack', hit: 'barrel_launch', miss: 'barrel_roll', done: 'grog_burst', speed: 130 },
  // Story Phase 7
  clear: { title: 'CLEAR THE DEBRIS', hint: 'Heave on the green!', stat: 'attack', hit: 'wood_crack', miss: 'hammer_miss', done: 'repair_done', speed: 130 },
  reef: { title: 'REEF THE MAINSAIL', hint: 'Haul on the green!', stat: 'speed', hit: 'rope_haul', miss: 'sail_snap', done: 'repair_done', speed: 135 },
  knot: { title: 'TIE IT OFF', hint: 'Pull tight on the green!', stat: 'speed', hit: 'rope_haul', miss: 'hammer_miss', done: 'repair_done', speed: 145 },
  carry: { title: 'LIFT!', hint: 'Lift on the green!', stat: 'attack', hit: 'heave', miss: 'thud', done: 'thud_heavy', speed: 120 },
  lash: { title: 'LASH THE WHEEL', hint: 'Make fast on the green!', stat: 'speed', hit: 'wheel_turn', miss: 'hammer_miss', done: 'repair_done', speed: 130 },
  assemble: { title: 'HOLD IT STEADY', hint: 'Steady on the green!', stat: 'speed', hit: 'spoon_tink', miss: 'mk2_rattle', done: 'mk2_tube_ping', speed: 110 },
  // Story Phase 8
  nail: { title: 'NAIL IT UP', hint: 'Strike on the green!', stat: 'attack', hit: 'hammer_hit', miss: 'hammer_miss', done: 'repair_done', speed: 125 },
  hang: { title: 'HANG IT', hint: 'Pull on the green!', stat: 'speed', hit: 'sash_swish', miss: 'hammer_miss', done: 'hammock_creak', speed: 130 },
  // Story Phase 9
  dig: { title: 'DIG!', hint: 'Bite in on the green!', stat: 'attack', hit: 'shovel_dig', miss: 'shovel_clank', done: 'dirt_heap', speed: 135 },
  pick: { title: 'BREAK THE STONE', hint: 'Swing on the green!', stat: 'attack', hit: 'pick_strike', miss: 'shovel_clank', done: 'stone_crack', speed: 150 },
  pry: { title: 'PRY IT UP', hint: 'Lever on the green!', stat: 'defense', hit: 'stone_scrape', miss: 'shovel_clank', done: 'stone_crack', speed: 120 },
  vines: { title: 'CUT THE VINES', hint: 'Slash on the green!', stat: 'speed', hit: 'vine_slash', miss: 'hammer_miss', done: 'vine_fall', speed: 140 },
  throw: { title: 'THROW!', hint: 'Let fly on the green!', stat: 'attack', hit: 'heave', miss: 'thud', done: 'splash_big', speed: 140 },
  lower: { title: 'LOWER AWAY', hint: 'Pay out on the green!', stat: 'speed', hit: 'rope_haul', miss: 'hammer_miss', done: 'splash', speed: 125 },
  // Story Phase 10
  can: { title: 'OPEN THE CAN', hint: 'Crank on the green!', stat: 'speed', hit: 'can_crank', miss: 'can_slip', done: 'can_hiss', speed: 130 },
  stir: { title: 'STIR THE POT', hint: 'Stir on the green!', stat: 'speed', hit: 'pot_stir', miss: 'pot_slop', done: 'pot_bubble', speed: 120 },
  shake: { title: 'SHAKE THE SAUCE', hint: 'Shake on the green!', stat: 'attack', hit: 'sauce_shake', miss: 'pot_slop', done: 'sauce_pressure', speed: 150 },
  scorch: { title: 'SCRAPE THE POT', hint: 'Scrape on the green!', stat: 'attack', hit: 'pot_scrape', miss: 'burnt_clack', done: 'burnt_clack', speed: 135 },
  crank: { title: 'CRANK THE BLENDER', hint: 'Crank on the green!', stat: 'attack', hit: 'blender_crank', miss: 'blender_jam', done: 'blender_whirr', speed: 140 },
  plate: { title: 'PLATE IT', hint: 'Set it down on the green!', stat: 'speed', hit: 'plate_tink', miss: 'plate_wobble', done: 'plate_ding', speed: 115 },
  grab: { title: 'GRAB IT!', hint: 'Snatch on the green!', stat: 'speed', hit: 'grab_swipe', miss: 'grab_whiff', done: 'pillow_poof', speed: 155 },
  sweep: { title: 'SWEEP IT UP', hint: 'Sweep on the green!', stat: 'speed', hit: 'broom_sweep', miss: 'broom_whiff', done: 'trash_heap', speed: 130 },
  trim: { title: 'TRIM THE SAILS', hint: 'Haul on the green!', stat: 'speed', hit: 'rope_haul', miss: 'sail_snap', done: 'sail_puff', speed: 135 },
  buckle: { title: 'MAKE IT FAST', hint: 'Cinch on the green!', stat: 'speed', hit: 'buckle_click', miss: 'hammer_miss', done: 'buckle_snap', speed: 130 },
  grip: { title: 'HOLD ON!', hint: 'Grip on the green!', stat: 'defense', hit: 'rail_grip', miss: 'slip', done: 'repair_done', speed: 145 },
  // Story Phases 11-13
  reach: { title: 'EASE IT OUT', hint: 'Gently, on the green!', stat: 'speed', hit: 'reach_ease', miss: 'reach_bump', done: 'page_flip_tiny', speed: 105 },
  crack: { title: 'CRACK THE EGGS', hint: 'Tap on the green!', stat: 'speed', hit: 'egg_crack', miss: 'pot_slop', done: 'pan_sizzle', speed: 130 },
  slice: { title: 'SLICE IT', hint: 'Cut on the green!', stat: 'speed', hit: 'knife_chop', miss: 'plate_wobble', done: 'plate_tink', speed: 140 },
  pour: { title: 'POUR THE TEA', hint: 'Tip on the green!', stat: 'defense', hit: 'tea_pour', miss: 'grog_spill', done: 'tea_sip', speed: 110 },
  solder: { title: 'SOLDER IT', hint: 'Touch on the green!', stat: 'speed', hit: 'solder_hiss', miss: 'mk2_zzzt', done: 'mk2_tube_ping', speed: 125 },
};

/** The sounds each kind plays (the validator checks they exist). */
export const REPAIR_SOUND_KEYS = ['hit', 'miss', 'done'];
