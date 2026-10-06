import { expect } from 'vitest';
import { currentChapter } from '../src/systems/story/progress.js';
import { makeStory } from './storyHarness.js';

/**
 * Story Phase 13, walked the way a player would (tests/phase13_story.test.js
 * and the debug presets' recorder share it): from the end of Phase 12, every
 * open objective in turn, until the Brogath command crisis.
 */

export const PHASE13_QUESTS = ['finger_breakdown', 'sash_in_the_trash', 'quarters_alive', 'condemn_bedding', 'grand_bedding', 'fan_megapack',
  'build_your_own_ses', 'wire_the_systems', 'stenchmaster_channel', 'stench_o_vision', 'brogath_special', 'the_limit', 'ancient_stenchmasters',
  'disarm_stenchmasters', 'stenchmaster_apocalypse', 'two_brogaths', 'treasure_room_brogath', 'command_crisis'];

export const STANDEES = ['stenchalina', 'brogath', 'rumpold', 'rumpus', 'gustavio'];
export const STANDEE_SPOTS = {
  stenchalina: ['cots', 'hammocks'], brogath: ['port', 'starboard'], rumpold: ['hatch', 'port'], rumpus: ['table', 'door'], gustavio: ['hammocks', 'cots'],
};

const D = 'main_deck';
const G = 'galley';
const H = 'cargo_hold';
const C = 'captains_quarters';
const Q = 'crew_quarters';

// Which way you come into a room from a neighbouring one (the doorway you arrive at).
const ARRIVE = {
  [D]: { [G]: 'main_hatch', [Q]: 'fore_hatch', [C]: 'cabin_door' },
  [G]: { [D]: 'ladder', [H]: 'stairs', [Q]: 'south_door' },
  [H]: { [G]: 'stairs' },
  [Q]: { [G]: 'north_door', [D]: 'ladder' },
  [C]: { [D]: 'door' },
};
// The way through: the galley joins the deck, the hold and the old quarters (once they're open); the cabin is off the deck.
const VIA = { [H]: G, [C]: D };

async function step(s, map) {
  await s.enter(map, null, { spawn: ARRIVE[map][s.map] });
}

async function go(s, map) {
  if (s.map === map) return;
  if (ARRIVE[map][s.map]) return step(s, map);
  // Up out of the hold or the cabin first, then across.
  if (VIA[s.map] && VIA[s.map] !== map) await step(s, VIA[s.map]);
  if (s.map === map) return;
  if (ARRIVE[map][s.map]) return step(s, map);
  const mid = VIA[map] ?? (s.map === D ? G : D);
  await step(s, mid);
  await step(s, map);
}
const firstMissing = (s, ids, prefix) => ids.find((id) => !s.has(`${prefix}${id}`));
const order = (s, list) => (s.pickLast ? list.slice().reverse() : list);
const value = (s, name) => s.session.story.getValue(name);

const PARTS = { forks: [G, 'p13_forks'], horseshoe: [H, 'p13_horseshoe'], coils: [H, 'p13_coils'], transformer: [G, 'p13_transformer'] };
const JUDGE = ['sheets', 'blankets', 'pillows', 'pillowcases', 'mattress', 'hammock'];
const BEDDING = ['hammocks', 'pads', 'pillows', 'blankets', 'corners'];
const RANT = ['standees', 'bedding', 'tv', 'locker', 'megapack'];
const MET = { brogath: 'pete', rumpold: 'gristle', rumpus: 'bob', gustavio: 'jim', stenchalina: 'squawks', prime: 'garrick' };
const DISARM = { beans: 'p13_dis_beans', grog: 'p13_dis_grog', sauce: 'p13_dis_sauce', fabric: 'p13_dis_fabric', fingers: 'bob', still: 'garrick', rear: 'gristle' };
const ORDERS = ['sail', 'hull', 'cannons', 'helm', 'beans'];

/** First open objective wins; each step does what a player would do about it. */
export const STEPS13 = [
  ['finger_breakdown.loopholes', async (s) => { await go(s, G); await s.talk('garrick'); }],
  ['sash_in_the_trash.wardrobe', async (s) => { await go(s, C); await s.inspect('p13_wardrobe'); }],
  ['sash_in_the_trash.watch', async (s) => { await go(s, G); await s.inspect('p13_trash_watch'); }],
  ['quarters_alive.unboard', async (s) => { await go(s, G); await s.inspect('p13_unboard'); }],
  ['quarters_alive.inside', async (s) => { await go(s, Q); }],
  ['quarters_alive.pillow', async (s) => { await go(s, Q); await s.inspect('p13_pillow'); }],
  ['quarters_alive.throw', async (s) => { await go(s, D); await s.inspect('p13_throw_1'); }],
  ['quarters_alive.again', async (s) => { await go(s, D); await s.inspect(s.has('pillow_picked_up') ? 'p13_throw_2' : 'p13_pickup'); }],
  ['condemn_bedding.judge', async (s) => { await go(s, Q); await s.inspect(`p13_judge_${firstMissing(s, order(s, JUDGE), 'p13_judged_')}`); }],
  ['condemn_bedding.discard', async (s) => { await go(s, Q); await s.inspect('p13_pile'); }],
  ['condemn_bedding.stuff', async (s) => { await go(s, Q); await s.inspect('p13_locker_stuff'); }],
  ['condemn_bedding.nail', async (s) => { await go(s, Q); await s.inspect('p13_locker_nail'); }],
  ['grand_bedding.bedding', async (s) => { await go(s, Q); await s.inspect(`p13_bed_${firstMissing(s, order(s, BEDDING), 'p13_bedding_')}`); }],
  ['fan_megapack.open', async (s) => { await go(s, Q); await s.inspect('p13_megapack_open'); }],
  ['fan_megapack.place', async (s) => {
    await go(s, Q);
    // First pick: every standee in its first spot, in one go. Last pick: leaves them in the box once,
    // then the last one left each time, in its other spot.
    s.refused ??= new Set();
    if (s.pickLast && !s.refused.has('place')) s.refused.add('place');
    else if (s.pickLast) for (let left = STANDEES.filter((id) => !s.has(`standee_${id}_placed`)).length; left > 0; left--) s.choices.push(left - 1, 1);
    await s.inspect('p13_megapack_place');
  }],
  ['build_your_own_ses.parts', async (s) => {
    const next = firstMissing(s, order(s, Object.keys(PARTS)), 'ses_part_');
    const [map, id] = PARTS[next];
    await go(s, map);
    await s.inspect(id);
  }],
  ['build_your_own_ses.build', async (s) => { await go(s, Q); await s.inspect('p13_kit_build'); }],
  ['wire_the_systems.brogath', async (s) => { await go(s, Q); await s.inspect(`p13_cable_brogath_${value(s, 'standee_brogath')}`); }],
  ['wire_the_systems.deck', async (s) => { await go(s, D); await s.inspect('p13_deck_path'); }],
  ['wire_the_systems.cannon', async (s) => { await go(s, D); await s.inspect('p13_cannon'); }],
  ['wire_the_systems.tape', async (s) => { await go(s, G); await s.inspect('p13_tape'); }],
  ['wire_the_systems.connect', async (s) => { await go(s, G); await s.inspect('p13_connect'); }],
  ['stenchmaster_channel.watch', async (s) => { await go(s, Q); await s.inspect('p13_channel_watch'); }],
  ['stench_o_vision.vent', async (s) => { await go(s, Q); await s.inspect('p13_vent_knobs'); }],
  ['brogath_special.watch', async (s) => { await go(s, Q); await s.inspect('p13_special_watch'); }],
  ['the_limit.rant', async (s) => {
    await go(s, Q);
    const next = firstMissing(s, order(s, RANT), 'p13_rant_');
    if (next !== 'standees') return s.inspect(`p13_rant_${next}`);
    const sid = s.pickLast ? 'gustavio' : 'stenchalina';
    return s.inspect(`p13_rant_${sid}_${value(s, `standee_${sid}`)}`);
  }],
  ...Object.entries(MET).map(([o, who]) => [`ancient_stenchmasters.${o}`, async (s) => { await go(s, Q); await s.talk(who); }]),
  ...Object.entries(DISARM).map(([o, what]) => [`disarm_stenchmasters.${o}`, async (s) => {
    await go(s, Q);
    if (what.startsWith('p13_')) await s.inspect(what);
    else await s.talk(what);
  }]),
  ...ORDERS.map((o) => [`stenchmaster_apocalypse.${o}`, async (s) => { await go(s, D); await s.inspect(`p13_ord_${o}`); }]),
  ['two_brogaths.look', async (s) => {
    await go(s, D);
    const next = firstMissing(s, order(s, ['cardboard', 'pete']), 'p13_looked_');
    if (next === 'pete') await s.talk('pete');
    else await s.inspect('p13_look_cardboard');
  }],
  ['treasure_room_brogath.door', async (s) => { await go(s, H); await s.inspect('p13_treasure_door'); }],
  ['treasure_room_brogath.pete', async (s) => { await go(s, H); await s.talk('pete'); }],
  ['command_crisis.helm', async (s) => { await go(s, D); await s.inspect(`p13_helm_${firstMissing(s, ['1', '2', '3'], 'p13_helm_')}`); }],
];

/** Plays on from wherever Phase 13 is until the Brogath command crisis is over. */
export async function playToEndP13(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 300 && !s.has('p13_complete'); n++) {
    const next = STEPS13.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!next) {
      const open = PHASE13_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 13 objective the player can act on`);
    }
    onStep(next[0], s);
    await next[1](s);
  }
  expect(s.has('p13_complete'), 'Story Phase 13 reaches its end').toBe(true);
}

/** From "Phase 12 complete": the galley, the day of the suspension. Phase 13 starts with Garrick. */
export async function playPhase13(pick, { onStep = () => {}, preset = 'p12_complete', from = null } = {}) {
  const s = from ?? makeStory({ pick, preset });
  s.pickLast = pick === 'last';
  s.flagsBefore = new Set(s.session.story.allFlags());
  if (s.map !== G) await go(s, G);
  expect(s.has('p13_ready_hint'), 'told where Phase 13 starts').toBe(true);
  expect(s.has('p13_started'), 'Phase 13 waits for the captain').toBe(false);
  await s.talk('garrick');
  expect(s.has('p13_started')).toBe(true);
  const chapters = ['p13c1'];
  await playToEndP13(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
      onStep(ref, st);
    },
  });
  return { s, chapters };
}
