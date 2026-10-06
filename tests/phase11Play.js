import { expect } from 'vitest';
import { currentChapter } from '../src/systems/story/progress.js';
import { makeStory } from './storyHarness.js';

/**
 * Story Phase 11, walked the way a player would (tests/phase11_story.test.js
 * and the debug presets' recorder share it): from the end of Phase 10, every
 * open objective in turn, until the anti-dice conspiracy is ready.
 */

export const PHASE11_QUESTS = ['bedtime_in_the_storm', 'grand_illumination', 'poor_in_gold', 'every_sash_incident', 'grand_finger_puller',
  'storm_listening', 'hammocks_die', 'the_lost_book', 'cheap_o_rama_delivery', 'pocket_sacred_text', 'bed_sashes', 'grand_resumption',
  'late_night_bling', 'first_great_flutter', 'anti_dice_conspiracy'];

const D = 'main_deck';
const G = 'galley';

async function go(s, map) {
  if (s.map === map) return;
  // Everything below is reached from the deck (the galley ladder, the hold stairs).
  if (map !== D && s.map !== D && s.map !== G) await s.enter(D);
  await s.enter(map);
}
const firstMissing = (s, ids, prefix) => ids.find((id) => !s.has(`${prefix}${id}`));
const order = (s, list) => (s.pickLast ? list.slice().reverse() : list);

/** First open objective wins; each step does what a player would do about it. */
export const STEPS11 = [
  ['bedtime_in_the_storm.book', async (s) => { await go(s, G); await s.talk('garrick'); }],
  ['bedtime_in_the_storm.hammocks', async (s) => { await go(s, G); await s.talk('gristle'); }],
  ['bedtime_in_the_storm.bed', async (s) => { await go(s, G); await s.inspect('p11_bed'); }],
  ['grand_illumination.ties', async (s) => { await go(s, G); await s.inspect(`p11_tie_${firstMissing(s, order(s, ['rope', 'leather']), 'p11_tie_')}`); }],
  ['grand_illumination.rig', async (s) => { await go(s, G); await s.inspect('p11_lamp_rig'); }],
  ['grand_illumination.test', async (s) => { await go(s, G); await s.inspect('p11_lamp_test'); }],
  ['grand_illumination.six', async (s) => { await go(s, G); await s.inspect('p11_lamp_six'); }],
  ['poor_in_gold.story', async (s) => { await go(s, G); await s.talk('garrick'); }],
  ['every_sash_incident.review', async (s) => {
    await go(s, G);
    const next = firstMissing(s, order(s, ['peg', 'chart', 'holders', 'book']), 'p11_sash_ex_');
    if (next === 'peg') await s.inspect('p11_sash_peg');
    else if (next === 'chart') await s.inspect('p11_org_chart');
    else if (next === 'holders') await s.talk(s.pickLast ? 'barnacle_bill' : 'rusty_tom');
    else await s.talk('garrick');
  }],
  ['grand_finger_puller.vote', async (s) => { await go(s, G); await s.talk(firstMissing(s, order(s, ['pete', 'bob', 'jim', 'gristle']), 'p11_vote_')); }],
  ['storm_listening.tokens', async (s) => { await go(s, G); await s.inspect(`p11_tok_${firstMissing(s, order(s, ['1', '2', '3', '4']), 'p11_tok_')}`); }],
  ['hammocks_die.up', async (s) => { await go(s, G); await s.talk(firstMissing(s, order(s, ['pete', 'bob', 'jim']), 'p11_up_')); }],
  ['hammocks_die.table', async (s) => { await go(s, G); await s.inspect('p11_table'); }],
  ['hammocks_die.rags', async (s) => { await go(s, G); await s.inspect(s.pickLast ? 'p11_rags_jim' : 'p11_rags_pete'); }],
  ['the_lost_book.brace', async (s) => { await go(s, G); await s.inspect('p11_brace'); }],
  ['the_lost_book.console', async (s) => { await go(s, G); await s.talk('garrick'); }],
  ['cheap_o_rama_delivery.deck', async (s) => { await go(s, D); }],
  ['cheap_o_rama_delivery.carry', async (s) => { await go(s, D); await s.inspect('p11_crate_deck'); }],
  ['cheap_o_rama_delivery.open', async (s) => { await go(s, G); await s.inspect('p11_crate_open'); }],
  ['pocket_sacred_text.find', async (s) => { await go(s, G); await s.inspect('p11_crate_find'); }],
  ['pocket_sacred_text.crew', async (s) => { await go(s, G); await s.talk(firstMissing(s, order(s, ['ned', 'gristle', 'pete']), 'p11_pt_')); }],
  ['bed_sashes.take', async (s) => { await go(s, G); await s.inspect('p11_crate_take'); }],
  ['bed_sashes.hang', async (s) => { await go(s, G); await s.inspect(`p11_hang_${firstMissing(s, order(s, ['pete', 'bob', 'jim']), 'p11_hung_')}`); }],
  ['bed_sashes.own', async (s) => { await go(s, G); await s.inspect('p11_own_bed'); }],
  ['grand_resumption.story', async (s) => { await go(s, G); await s.talk('garrick'); }],
  ['late_night_bling.off', async (s) => { await go(s, G); await s.inspect('p11_tv_late'); }],
  ['first_great_flutter.story', async (s) => { await go(s, G); await s.talk('garrick'); }],
  ['anti_dice_conspiracy.borrow', async (s) => { await go(s, G); await s.inspect('p11_borrow'); }],
  ['anti_dice_conspiracy.read', async (s) => {
    await go(s, G);
    // The menu lists the passages not read yet, then "Close it for now": a last-pick run closes it once.
    s.refused ??= new Set();
    if (s.pickLast && !s.refused.has('read')) s.refused.add('read');
    else if (s.pickLast) s.choices.push(0);
    await s.inspect('p11_lamp_read');
  }],
  ['anti_dice_conspiracy.plan', async (s) => { await go(s, G); await s.inspect('p11_plan'); }],
  ['anti_dice_conspiracy.return', async (s) => { await go(s, G); await s.inspect('p11_return'); }],
  ['anti_dice_conspiracy.wake', async (s) => { await go(s, G); await s.talk(firstMissing(s, order(s, ['pete', 'gristle', 'bob', 'jim']), 'p11_woken_')); }],
  ['anti_dice_conspiracy.meet', async (s) => { await go(s, G); await s.inspect('p11_meeting'); }],
];

export async function playToEndP11(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 200 && !s.has('p11_complete'); n++) {
    const step = STEPS11.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) {
      const open = PHASE11_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 11 objective the player can act on`);
    }
    onStep(step[0], s);
    await step[1](s);
  }
  expect(s.has('p11_complete'), 'Story Phase 11 reaches its end').toBe(true);
}

/** From "Phase 10 complete": in the galley, inside the storm, at night. Phase 11 starts at the captain's bed. */
export async function playPhase11(pick, { onStep = () => {}, preset = 'p10_complete' } = {}) {
  const s = makeStory({ pick, preset });
  s.pickLast = pick === 'last';
  s.flagsBefore = new Set(s.session.story.allFlags());
  await s.enter(G);
  expect(s.has('p11_ready_hint'), 'told where Phase 11 starts').toBe(true);
  expect(s.has('p11_started'), 'Phase 11 waits for bedtime').toBe(false);
  await s.inspect('p11_start_bed');
  expect(s.has('p11_started')).toBe(true);
  const chapters = ['p11c1'];
  await playToEndP11(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
      onStep(ref, st);
    },
  });
  return { s, chapters };
}
