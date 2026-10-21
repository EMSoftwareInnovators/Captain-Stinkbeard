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
