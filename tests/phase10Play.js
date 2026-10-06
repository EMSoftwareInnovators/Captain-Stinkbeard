import { expect } from 'vitest';
import { currentChapter } from '../src/systems/story/progress.js';
import { makeStory } from './storyHarness.js';

/**
 * Story Phase 10, walked the way a player would (tests/phase10_story.test.js
 * and the debug presets' checks share it): from the end of Phase 9, every
 * open objective in turn, until the Revenge is inside the Great Sharkstorm.
 */

export const PHASE10_QUESTS = ['saddest_salvage', 'wealthy_sharks', 'participation_prize', 'treasure_feast', 'grand_galley', 'shark_catering',
  'release_moved_in', 'shark_suites', 'bad_hotel', 'bedtime_television', 'brogath_the_bashful', 'sweet_dreams', 'meet_wind_with_wind', 'fart_man',
  'fart_literature', 'counter_sharkstorm', 'sash_holders', 'grand_feast', 'the_approach', 'the_one_time', 'wrong_way', 'inside_the_spout',
  'the_impossible_audit', 'blackbeard'];

const I = 'crownskull_isle';
const D = 'main_deck';
const G = 'galley';
const H = 'cargo_hold';

async function go(s, map) {
  if (s.map !== map) await s.enter(map);
}
const firstMissing = (s, ids, prefix) => ids.find((id) => !s.has(`${prefix}${id}`));
const order = (s, list) => (s.pickLast ? list.slice().reverse() : list);

/** Walks into a named place on the island (the harness has no feet: it says so on the bus). */
async function visit(s, region) {
  await go(s, I);
  s.session.bus.emit('region:entered', { region, map: I });
  await s.settle();
}

/** A last-pick run says "not yet" once (to everything that offers it), then goes on. */
function once(s, key, yes = 0, no = 1) {
  s.refused ??= new Set();
  if (s.pickLast && !s.refused.has(key)) {
    s.refused.add(key);
    s.choices.push(no);
  } else s.choices.push(yes);
}

/** First open objective wins; each step does what a player would do about it. */
export const STEPS = [
  // Part One
  ['saddest_salvage.first', async (s) => { await go(s, I); await s.inspect(`p10_salv_${firstMissing(s, order(s, ['1', '2', '3', '4']), 'p10_salv_')}`); }],
  ['saddest_salvage.appraisal', async (s) => { await go(s, I); await s.talk('garrick'); }],
  ['saddest_salvage.rest', async (s) => { await go(s, I); await s.inspect(`p10_salv_${firstMissing(s, order(s, ['5', '6', '7', '8']), 'p10_salv_')}`); }],
  ['saddest_salvage.tally', async (s) => { await go(s, I); await s.talk('gristle'); }],
  ['wealthy_sharks.down', async (s) => {
    // Down the trail: over the statue, past the broken tooth, the ford.
    await go(s, I);
    for (const t of ['p10_trig_statue', 'p10_trig_fork', 'p10_trig_ford']) await s.trigger(t);
    await visit(s, 'isle_trail');
  }],
  ['wealthy_sharks.tiara', async (s) => { await go(s, I); await s.trigger('p10_trig_tiara'); }],
  ['wealthy_sharks.boats', async (s) => {
    await go(s, I);
    // A last-pick run tries to row before the tiara... no: the boats wait only until the trail's done. It says "not yet" once.
    once(s, 'row');
    await s.inspect('p10_boats');
  }],
  ['participation_prize.coin', async (s) => { await go(s, D); await s.inspect('p10_coin'); }],
  ['treasure_feast.pantry', async (s) => { await go(s, H); await s.talk('jim'); }],
  ['treasure_feast.casks', async (s) => { await go(s, H); await s.inspect('p10_casks_a'); }],
  ['treasure_feast.galley', async (s) => { await go(s, D); await go(s, G); }],
  ['grand_galley.beans', async (s) => { await go(s, G); await s.inspect('p10_prep_beans'); }],
  ['grand_galley.pot', async (s) => { await go(s, G); await s.inspect('p10_stove_pot'); }],
  ['grand_galley.sauce', async (s) => { await go(s, G); await s.inspect('p10_table_sauce'); }],
  ['grand_galley.stop', async (s) => { await go(s, G); await s.inspect('p10_stove_stop'); }],
  ['shark_catering.sweep', async (s) => { await go(s, D); await s.inspect(`p10_heap_${firstMissing(s, order(s, ['1', '2', '3']), 'p10_swept_')}`); }],
  // Part Two
  ['release_moved_in.hold', async (s) => { await go(s, D); await go(s, H); }],
  ['release_moved_in.where', async (s) => { await go(s, H); await s.talk('gristle'); }],
  ['release_moved_in.test', async (s) => { await go(s, G); await s.inspect('p10_quarters_test'); }],
  ['shark_suites.look', async (s) => { await go(s, D); await s.talk('ned'); }],
  ['shark_suites.pillows', async (s) => { await go(s, D); await s.inspect(`p10_pillow_${firstMissing(s, order(s, ['1', '2']), 'p10_pillow_')}`); }],
  ['bad_hotel.sacks', async (s) => { await go(s, G); await s.inspect('p10_sacks'); }],
  ['bad_hotel.squawks', async (s) => { await go(s, G); await s.inspect('p10_basket'); }],
  ['bad_hotel.bunk', async (s) => { await go(s, G); await s.inspect('p10_bunk'); }],
  ['bedtime_television.tv', async (s) => { await go(s, G); await s.inspect('p10_tv_bedtime'); }],
  ['bedtime_television.lamp', async (s) => { await go(s, G); await s.inspect('p10_lamp'); }],
  ['brogath_the_bashful.story', async (s) => { await go(s, G); await s.inspect('p10_hammock_brogath'); }],
  ['sweet_dreams.tokens', async (s) => { await go(s, G); await s.inspect(`p10_btok_${firstMissing(s, order(s, ['1', '2', '3']), 'p10_btok_')}`); }],
  ['sweet_dreams.deck', async (s) => { await go(s, D); await s.trigger('p10_stern_word'); }],
  // Part Three
  ['meet_wind_with_wind.rumpold', async (s) => { await go(s, G); await s.inspect('p10_hammock_rumpold'); }],
  ['fart_man.trophy', async (s) => { await go(s, G); await s.inspect('p10_trophy'); }],
  ['fart_literature.book', async (s) => { await go(s, G); await s.inspect('p10_hammock_book'); }],
  ['fart_literature.research', async (s) => {
    await go(s, G);
    // The menu lists the phrases not read yet, then "Close it for now": a last-pick run closes it once.
    once(s, 'read', 0, 99);
    if (s.choices[s.choices.length - 1] === 99) s.choices[s.choices.length - 1] = 5 - ['eye', 'rear', 'wind', 'rotation', 'collapse'].filter((k) => s.has(`p10_phr_${k}`)).length;
    await s.inspect('p10_read');
  }],
  ['fart_literature.notes', async (s) => { await go(s, G); await s.inspect('p10_notes'); }],
  // Part Four
  ['counter_sharkstorm.muster', async (s) => { await go(s, D); await s.inspect('p10_board_brief'); }],
  ['counter_sharkstorm.alternatives', async (s) => { await go(s, D); await s.talk(firstMissing(s, order(s, ['ned', 'bob', 'jim', 'gristle', 'hale', 'pete']), 'p10_alt_')); }],
  ['counter_sharkstorm.decide', async (s) => { await go(s, D); await s.inspect('p10_board_decide'); }],
  ['sash_holders.condition', async (s) => { await go(s, D); await s.talk('garrick'); }],
  ['sash_holders.volunteers', async (s) => { await go(s, D); await s.talk('pete'); }],
  ['sash_holders.lots', async (s) => { await go(s, D); await s.inspect('p10_board_lots'); }],
  // Part Five
  ['grand_feast.crying', async (s) => { await go(s, G); await s.inspect('p10_feast_crying'); }],
  ['grand_feast.baked', async (s) => { await go(s, G); await s.inspect('p10_feast_baked'); }],
  ['grand_feast.burnt', async (s) => { await go(s, G); await s.inspect('p10_feast_burnt'); }],
  ['grand_feast.smoothie', async (s) => { await go(s, G); await s.inspect('p10_feast_blender'); }],
  ['grand_feast.sauce', async (s) => { await go(s, D); await go(s, H); await s.inspect('p10_vats_feast'); }],
  ['grand_feast.plate', async (s) => { await go(s, D); await go(s, G); await s.inspect('p10_feast_plate'); }],
  ['grand_feast.serve', async (s) => { await go(s, G); await s.talk('garrick'); }],
  // Part Six
  ['the_approach.sails', async (s) => { await go(s, D); await s.inspect(s.has('p10_sail_port') ? 'p10_sheet_star' : 'p10_sheet_port'); }],
  ['the_approach.cargo', async (s) => { await go(s, D); await s.inspect('p10_cargo'); }],
  ['the_approach.ropes', async (s) => { await go(s, D); await s.inspect('p10_ropes'); }],
  ['the_approach.helm', async (s) => { await go(s, D); await s.inspect('p10_helm_approach'); }],
  ['the_approach.galley', async (s) => { await go(s, G); await s.inspect('p10_secure_galley'); }],
  ['the_approach.holders', async (s) => { await go(s, D); await s.talk(s.pickLast ? 'barnacle_bill' : 'rusty_tom'); }],
  ['the_approach.report', async (s) => { await go(s, D); await s.talk('pete'); }],
  ['the_one_time.position', async (s) => { await go(s, D); await s.talk('garrick'); }],
  ['the_one_time.persuade', async (s) => { await go(s, D); await s.talk('garrick'); }],
  // Part Seven
  ['wrong_way.align', async (s) => { await go(s, D); await s.inspect('p10_helm_align'); }],
  ['wrong_way.rail', async (s) => {
    await go(s, D);
    // A last-pick run tries the hatch first: it's locked until he's safe.
    if (s.pickLast && !s.triedHatch) {
      s.triedHatch = true;
      expect(await s.warp('p10_hatch_hold_on')).toBe(false);
    }
    await s.inspect(s.pickLast ? 'p10_rail_star' : 'p10_rail_port');
  }],
  ['wrong_way.squawks', async (s) => { await go(s, D); await s.talk('squawks'); }],
  ['wrong_way.below', async (s) => { await go(s, D); expect(await s.warp('p10_hatch_hold_on')).toBe(true); }],
  ['inside_the_spout.antenna', async (s) => { await go(s, G); await s.inspect('p10_tv_antenna'); }],
  ['the_impossible_audit.watch', async (s) => { await go(s, G); await s.inspect('p10_tv_audit'); }],
  ['blackbeard.breathe', async (s) => { await go(s, G); await s.inspect('p10_breathe'); }],
];

export async function playToEndP10(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 260 && !s.has('p10_complete'); n++) {
    // Chapter 84 has no objective until the captain goes back down to the galley, after his word with the storm.
    if (s.has('p10_storm_confronted') && !s.has('p10_ch84_started')) {
      onStep('ch84.below', s);
      await go(s, D);
      await go(s, G);
      continue;
    }
    const step = STEPS.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) {
      const open = PHASE10_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 10 objective the player can act on`);
    }
    onStep(step[0], s);
    await step[1](s);
  }
  expect(s.has('p10_complete'), 'Story Phase 10 reaches its end').toBe(true);
}

/** From "Phase 9 complete": on Crownskull Isle, Pete at the crater. */
export async function playPhase10(pick, { onStep = () => {} } = {}) {
  const s = makeStory({ pick, preset: 'p9_complete' });
  s.pickLast = pick === 'last';
  s.flagsBefore = new Set(s.session.story.allFlags());
  await s.enter(I);
  expect(s.has('p10_ready_hint'), 'told where Phase 10 starts').toBe(true);
  expect(s.has('p10_started'), 'Phase 10 waits for Pete').toBe(false);
  await s.talk('pete');
  expect(s.has('p10_started')).toBe(true);
  // Chapter 71 (Not Pete's Fault) is one scene: it ends at the crater, with the salvage.
  const chapters = ['p10c1'];
  await playToEndP10(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
      onStep(ref, st);
    },
  });
  return { s, chapters };
}

