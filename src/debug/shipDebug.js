/**
 * Overhaul Prompt 5: what the F2 "Ship" tab offers (development builds only):
 * the Ship Integrity test bench (docs/gameplay-overhaul/09-ship-integrity.md,
 * "Trying it"). Nothing here is campaign content: the jump is a debug
 * preset, and the scenes are script steps run in whatever room you're in.
 */
export const DEBUG_SHIP = {
  jumps: [
    ['Ship Integrity demo (crew quarters, materials, a healthy ship)', 'ship_demo'],
    ['Emergency demo (cargo hold by the bilge pump, supplies, a healthy ship)', 'hazard_demo'],
    ['Air demo (crew quarters, clean air, sealing supplies)', 'air_demo'],
    ['Pressure demo (crew quarters by Brogath and Garrick, supplies)', 'pressure_demo'],
    ['Beard demo (crew quarters by the washroom, rags, the beard wrap, cloth and goggles)', 'beard_demo'],
    ['Supplies demo (cargo hold by the stores; the galley up the stairs; the gear)', 'supplies_demo'],
  ],
  /**
   * Prompt 6 (docs/gameplay-overhaul/10-flooding-and-fire.md, "Trying it"):
   * the emergency scenarios. Each is script steps run where the captain is;
   * the hazards then run on hazard time (only while he's free in the world).
   * The blows are the same on every difficulty (scale: false): the
   * difficulty is in how fast the water and the fire come, how long the
   * work takes and what the patch costs.
   */
  hazards: [
    ['A: cannon fire holes the port hull (two hits: a leak, then a breach)', [
      { shipDamage: 'hull_port', amount: 60, category: 'cannon', breach: true, scale: false, source: 'debug' },
      { shipDamage: 'hull_port', amount: 10, category: 'cannon', breach: true, scale: false, source: 'debug' },
    ]],
    ['B: fire in the crew quarters', [{ ignite: 'crew_quarters', intensity: 35, source: 'debug' }]],
    ['C: galley fire and a breach in the hold at once', [
      { ignite: 'galley', intensity: 40, source: 'debug' },
      { shipDamage: 'hull_starboard', amount: 60, category: 'cannon', breach: true, scale: false, source: 'debug' },
      { shipDamage: 'hull_starboard', amount: 10, category: 'cannon', breach: true, scale: false, source: 'debug' },
    ]],
    ['A wave over the side: 60 water into the galley', [{ flood: 'galley', amount: 60 }]],
    ['Let 10 seconds of emergency pass', [{ hazardClock: 10 }]],
  ],
  /**
   * Prompt 7 (docs/gameplay-overhaul/11-atmosphere-and-ventilation.md,
   * "Trying it"): the air scenarios, from the air_demo preset (the crew
   * quarters). Each is script steps; the air then moves on hazard time.
   */
  air: [
    ['Air A: vapor pouring from a cracked cask in the crew quarters', [
      { airSource: 'crew_quarters', substance: 'vapor', rate: 4, amount: 240, label: 'a cracked cask of pickling vinegar', source: 'debug' },
    ]],
    ['Air B: the washroom sealed, full of heavy gas', [
      { airConnection: 'washroom_door', state: 'sealed' },
      { airAdd: 'washroom', substance: 'heavy_gas', pct: 30 },
    ]],
    ['Air C: the galley stove smoking, the galley shut', [
      { airConnection: 'main_hatch', state: 'closed' },
      { airConnection: 'galley_door', state: 'closed' },
      { airAdd: 'galley', substance: 'smoke', pct: 50 },
      { airSource: 'galley', substance: 'smoke', rate: 6, seconds: 60, label: 'the smoking stove', source: 'debug' },
    ]],
    ['Air D: the hold breached, the galley stove burning (smoke), vapor in the quarters', [
      { shipDamage: 'hull_port', amount: 60, category: 'cannon', breach: true, scale: false, source: 'debug' },
      { shipDamage: 'hull_port', amount: 10, category: 'cannon', breach: true, scale: false, source: 'debug' },
      { ignite: 'galley', intensity: 30, smoke: true, source: 'debug' },
      { airSource: 'crew_quarters', substance: 'vapor', rate: 3, amount: 150, label: 'a cracked cask of pickling vinegar', source: 'debug' },
    ]],
    ['Air E: a short release in the crew quarters (save, reload, retry)', [
      { airSource: 'crew_quarters', substance: 'vapor', rate: 3, seconds: 40, label: 'a cracked cask of pickling vinegar', source: 'debug' },
    ]],
  ],
  /**
   * Prompt 8 (docs/gameplay-overhaul/12-pressure-and-eruptions.md, "Trying
   * it"): the pressure scenarios, from the pressure_demo preset (the crew
   * quarters, Brogath and Garrick within reach). Each switches its subject
   * on and sets the scene; then it all runs on hazard time, and the
   * captain responds with V (pad X).
   */
  pressure: [
    ['Pressure A: Brogath laughed at, the crew staring (calm him)', [
      { pressureSubject: 'brogath', on: true },
      { pressureSettle: 'brogath', pressure: 20 },
      { pressureModifier: 'brogath', modifier: 'stared_at' },
      { pressureTrigger: 'brogath', trigger: 'laughed_at' },
    ]],
    ['Pressure B: Garrick after a feast (open a porthole, let it out carefully)', [
      { pressureSubject: 'garrick', on: true },
      { pressureSettle: 'garrick' },
      { pressureTrigger: 'garrick', trigger: 'feast' },
    ]],
    ['Pressure C: Garrick held it in twice, then a ceremony (a catastrophe is coming)', [
      { pressureSubject: 'garrick', on: true },
      { pressureSettle: 'garrick', pressure: 60 },
      { pressureHold: 'garrick' },
      { pressureHold: 'garrick' },
      { pressureAdd: 'garrick', amount: 85 },
      { pressureModifier: 'garrick', modifier: 'ceremony' },
    ]],
    // He only moves when something happens to him: after choosing (let it out, calm him, hold it in, or nothing), keep at him with the two rows below.
    ['Pressure D: Brogath building (relieve, calm, hold it in, or leave him; then embarrass him)', [
      { pressureSubject: 'brogath', on: true },
      { pressureSettle: 'brogath', pressure: 55 },
    ]],
    ['Pressure E: Garrick charged (save, reload, hold it in, retry, release)', [
      { pressureSubject: 'garrick', on: true },
      { pressureSettle: 'garrick', pressure: 40 },
      { pressureTrigger: 'garrick', trigger: 'beans' },
    ]],
    ['Embarrass Brogath (he trips)', [{ pressureTrigger: 'brogath', trigger: 'tripped' }]],
    ['Embarrass Brogath (the crew laughs at him)', [{ pressureTrigger: 'brogath', trigger: 'laughed_at' }]],
    ['Garrick has a drink', [{ pressureTrigger: 'garrick', trigger: 'drink' }]],
    ['Let 10 seconds pass', [{ hazardClock: 10 }]],
    ['Settle them both and switch them off', [
      { pressureSettle: 'brogath' }, { pressureSubject: 'brogath', on: false },
      { pressureSettle: 'garrick' }, { pressureSubject: 'garrick', on: false },
    ]],
  ],
  /**
   * Prompt 9 (docs/gameplay-overhaul/13-beard-saturation.md, "Trying it"):
   * the Stink Beard scenarios, from the beard_demo preset (the crew
   * quarters, the washroom next door). Each switches the system on (no
   * chapter does) and sets the scene; then it all runs on hazard time, and
   * the captain looks after his beard with V (pad X): look, sniff, wring it
   * out, rinse or scrub it at the washroom tub, wear something over it.
   * "test_musk" (E) is a debug-only contaminant: story content can't use it.
   */
  beard: [
    ['Beard A: smoke pouring into the crew quarters (the beard fills, protects, then less)', [
      { beardSaturation: true },
      { beardClean: true },
      { airSource: 'crew_quarters', substance: 'smoke', rate: 6, seconds: 90, label: 'a smouldering hammock', source: 'debug' },
    ]],
    ['Beard B: mixed contamination (smoke, vapor, residue, heavy gas about; save and load)', [
      { beardSaturation: true },
      { beardClean: true },
      { beardAdd: 'smoke', amount: 14 },
      { beardAdd: 'vapor', amount: 16 },
      { beardAdd: 'stench_residue', amount: 8 },
      { airAdd: 'crew_quarters', substance: 'heavy_gas', pct: 12 },
    ]],
    ['Beard C: overloaded (a purge is coming: wring it out where you can air it, or let it go)', [
      { beardSaturation: true },
      { beardClean: true },
      { beardAdd: 'smoke', amount: 55 },
      { beardAdd: 'vapor', amount: 50 },
    ]],
    // No smoke in it: smoke would drive the hornets straight out.
    ['Beard D: filthy, and hornets in it (the washroom tub: rinse, or scrub with sailcloth)', [
      { beardSaturation: true },
      { beardClean: true },
      { beardAdd: 'vapor', amount: 26 },
      { beardAdd: 'heavy_gas', amount: 18 },
      { beardAdd: 'stench_residue', amount: 8 },
      { beardStatus: 'hornet_nested' },
    ]],
    ['Beard E: a strange musk (test only: paranoia; what isn\'t real is marked (?); sniff to snap out of it)', [
      { beardSaturation: true },
      { beardClean: true },
      { beardAdd: 'test_musk', amount: 14 },
    ]],
    ['Beard F: heavy with vapor (save, scrub, fail, retry; or wring it out and reload)', [
      { beardSaturation: true },
      { beardClean: true },
      { beardAdd: 'vapor', amount: 62 },
      { beardAdd: 'smoke', amount: 8 },
    ]],
    ['Wear the beard wrap', [{ beardWear: 'beard_wrap' }]],
    ['Let 10 seconds pass', [{ hazardClock: 10 }]],
    ['Wash it clean and switch it off', [{ beardClean: true }, { beardStatus: 'hornet_nested', remove: true }, { beardSaturation: false }]],
  ],
  /**
   * Prompt 10 (docs/gameplay-overhaul/14-resources-and-cooking.md, "Debug
   * demo"): the supplies scenarios, from the supplies_demo preset (the cargo
   * hold by the ship's stores; the galley up the stairs). Each switches the
   * system on; then act where you stand with V (pad X): search, salvage, put
   * away and take out, cook, serve, wear and eat. The sources remember what
   * they gave (leave the room and come back; save and load).
   */
  supplies: [
    ['Supplies A: salvage and storage (search the loose crates, salvage the stove-in ones, put it all in the stores)', [
      { suppliesSystem: true },
      { tutorial: 'Search the loose crates and salvage the stove-in ones (V by them), then put what you found in the ship\'s stores by the big crates. Leave the hold and come back: what you took stays taken.', title: 'Supplies' },
    ]],
    ['Supplies B: the repair loop (a leak in the hold; the materials are in the stores, not on you)', [
      { suppliesSystem: true },
      { supplyTransfer: 'hold', item: 'planks', all: true, to: 'store', anywhere: true, announce: false },
      { supplyTransfer: 'hold', item: 'nails', all: true, to: 'store', anywhere: true, announce: false },
      { supplyStore: 'hold', give: [{ item: 'planks', count: 2 }, { item: 'nails', count: 3 }] },
      { leak: 'hull_port', severity: 'leak', source: 'debug' },
    ]],
    ['Supplies C: gear and draughts (bad air in the hold; the cloth, a grog tot, Frog Grog)', [
      { suppliesSystem: true },
      { beardSaturation: true },
      { beardClean: true },
      { airAdd: 'cargo_hold', substance: 'smoke', pct: 20 },
      { airSource: 'cargo_hold', substance: 'smoke', rate: 3, seconds: 240, label: 'a smouldering bale', source: 'debug' },
      { giveItem: 'grog_tot', count: 1 },
      { giveItem: 'frog_grog', count: 1 },
    ]],
    ['Supplies D: cooking (ingredients in the stores: up to the galley stove, stir, simmer, serve, eat)', [
      { suppliesSystem: true },
      { supplyStore: 'hold', give: [{ item: 'beans', count: 4 }, { item: 'onions', count: 2 }, { item: 'oats', count: 4 }] },
    ]],
    ['Supplies E: scarcity (nothing on you, the stores bare, every cache taken; a leak; the bilge and the sacking come back)', [
      { suppliesSystem: true },
      { supplyTransfer: 'hold', item: 'planks', all: true, to: 'store', anywhere: true, announce: false },
      { supplyTransfer: 'hold', item: 'nails', all: true, to: 'store', anywhere: true, announce: false },
      { supplyTransfer: 'hold', item: 'sailcloth', all: true, to: 'store', anywhere: true, announce: false },
      { supplyStore: 'hold', empty: true },
      { supplySource: 'hold_crates', op: 'deplete' },
      { supplySource: 'hold_wreckage', op: 'deplete' },
      { supplySource: 'hold_barrels', op: 'deplete' },
      { leak: 'hull_port', severity: 'leak', source: 'debug' },
    ]],
    ['Supplies F: saves and retries (beans and onions on you: cook, fail the stir, retry; salvage; save and load)', [
      { suppliesSystem: true },
      { giveItem: 'beans', count: 4 },
      { giveItem: 'onions', count: 2 },
    ]],
    ['Let 30 seconds pass', [{ hazardClock: 30 }]],
    ['Switch the supplies off', [{ suppliesSystem: false }]],
  ],
  scenes: [
    ['A shark bites the port hull (40)', [{ shipDamage: 'hull_port', amount: 40, category: 'shark', source: 'debug' }]],
    ['A cannonball hits the starboard hull (45)', [{ shipDamage: 'hull_starboard', amount: 45, category: 'cannon', source: 'debug' }]],
    // Two blows: on Deckhand and Captain one blow leaves a section that was holding at 1 (grace).
    ['The storm tears the rigging (twice: out of action)', [
      { shipDamage: 'rigging', amount: 70, category: 'storm', source: 'debug', scale: false },
      { shipDamage: 'rigging', amount: 20, category: 'storm', source: 'debug', scale: false },
    ]],
    ['A great blast hits the deck and stern (25 each)', [{ shipDamage: ['deck', 'stern'], amount: 25, category: 'supernatural', source: 'debug' }]],
    ['Try to hoist the mainsail (needs the rigging working)', [
      { if: { ship: { section: 'rigging', operational: false } }, then: [{ narrate: 'The rigging hangs in tatters. Nothing to hoist a sail on: repair it first (Pause > Ship).' }],
        else: [{ if: { ship: { section: 'rigging', state: ['damaged', 'critical'] } }, then: [{ narrate: 'The mainsail goes up slowly, and the mast groans. She sails, badly.' }],
          else: [{ narrate: 'Up goes the mainsail. The rigging holds.' }] }] },
    ]],
    ['Sink her (both hulls to 0)', [{ shipDamage: ['hull_port', 'hull_starboard'], amount: 200, category: 'cannon', scale: false, source: 'debug' }, { shipDamage: ['hull_port', 'hull_starboard'], amount: 200, category: 'cannon', scale: false, source: 'debug' }]],
    ['Give repair materials (10 of each)', [{ giveItem: 'planks', count: 10 }, { giveItem: 'nails', count: 10 }, { giveItem: 'rope', count: 10 }, { giveItem: 'sailcloth', count: 10 }]],
  ],
  materials: ['planks', 'nails', 'rope', 'sailcloth'],
};
