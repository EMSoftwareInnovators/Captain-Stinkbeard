import { expect } from 'vitest';
import { currentChapter } from '../src/systems/story/progress.js';
import { makeStory } from './storyHarness.js';

/**
 * Story Phase 12, walked the way a player would (tests/phase12_story.test.js
 * and the debug presets' recorder share it): from the end of Phase 11, every
 * open objective in turn, until the one-day suspension is under way.
 */

export const PHASE12_QUESTS = ['he_woke_up_loaded', 'volunteer', 'the_trial', 'the_flutter', 'find_the_dice', 'no_escape', 'six_dice',
  'grand_dice_ceremony', 'jumping_beans', 'not_grand', 'authenticity_whiff', 'normal_breakfast', 'pull_my_finger'];

const D = 'main_deck';
const G = 'galley';
const H = 'cargo_hold';
const C = 'captains_quarters';

async function go(s, map) {
  if (s.map === map) return;
  // The galley and the hold connect directly; the cabin and the galley are off the deck.
  const below = (m) => m === G || m === H;
  if (!(below(map) && below(s.map)) && map !== D && s.map !== D) await s.enter(D);
  if (map === H && s.map === D) await s.enter(G);
  await s.enter(map);
}
const firstMissing = (s, ids, prefix) => ids.find((id) => !s.has(`${prefix}${id}`));
const order = (s, list) => (s.pickLast ? list.slice().reverse() : list);

const GEAR = { wet_cloth: [G, 'p12_bucket'], goggles: [H, 'p12_goggles'], waist_rope: [G, 'p12_rope'], beard_wrap: [C, 'p12_wardrobe_wrap'] };
const BREAKFAST = ['eggs', 'bacon', 'potatoes', 'fruit', 'toast', 'tea'];

/** First open objective wins; each step does what a player would do about it. */
export const STEPS12 = [
  ['he_woke_up_loaded.gear', async (s) => {
    // A last-pick run takes Bob's pot first (the optional objective), then the gear the other way round.
    if (s.pickLast && !s.has('gear_clay_pot') && !s.has('gear_clay_pot_refused')) {
      await go(s, G);
      s.choices.push(0);
      await s.talk('bob');
      return;
    }
    const next = firstMissing(s, order(s, Object.keys(GEAR)), 'gear_');
    const [map, id] = GEAR[next];
    await go(s, map);
    await s.inspect(id);
  }],
  ['volunteer.deck', async (s) => { await go(s, D); }],
  ['volunteer.take', async (s) => { await go(s, D); await s.talk('garrick'); }],
  ['the_trial.hold', async (s) => { await go(s, D); await s.talk('garrick'); }],
  ['the_flutter.complaints', async (s) => { await go(s, D); await s.inspect(`p12_complaint_${firstMissing(s, order(s, ['1', '2', '3', '4']), 'p12_complaint_')}`); }],
  ['find_the_dice.follow', async (s) => { await go(s, G); await s.talk('garrick'); }],
  ['find_the_dice.crate', async (s) => { await go(s, G); await s.inspect('p12_crate_dice'); }],
  ['no_escape.read', async (s) => {
    await go(s, G);
    // A last-pick run stops reading once, then reads on.
    s.refused ??= new Set();
    if (s.pickLast && !s.refused.has('fine')) s.refused.add('fine');
    else if (s.pickLast) for (let i = 0; i < 8; i++) s.choices.push(0);
    await s.inspect('p12_fine_print');
  }],
  ['six_dice.open', async (s) => { await go(s, G); await s.inspect('p12_shipment'); }],
  ['grand_dice_ceremony.inspect', async (s) => { await go(s, G); await s.inspect('p12_die_inspect'); }],
  ['grand_dice_ceremony.witness', async (s) => { await go(s, G); await s.inspect('p12_die_witness'); }],
  ['grand_dice_ceremony.roll', async (s) => { await go(s, G); await s.talk('garrick'); }],
  ['grand_dice_ceremony.celebrate', async (s) => { await go(s, G); await s.talk(firstMissing(s, order(s, ['pete', 'jim', 'bob', 'gristle', 'ned']), 'p12_cheer_')); }],
  ['jumping_beans.catch', async (s) => { await go(s, G); await s.inspect(`p12_die_${firstMissing(s, ['1', '2', '3'], 'p12_hop_')}`); }],
  ['not_grand.rules', async (s) => { await go(s, G); await s.talk('garrick'); }],
  ['authenticity_whiff.exam', async (s) => {
    await go(s, G);
    s.refused ??= new Set();
    if (s.pickLast && !s.refused.has('exam')) s.refused.add('exam');
    else if (s.pickLast) for (let i = 0; i < 3; i++) s.choices.push(0);
    await s.inspect('p12_sash_exam');
  }],
  ['authenticity_whiff.whiff', async (s) => {
    await go(s, G);
    // A last-pick run says no first (the rule brings it back to the question), then does it.
    if (s.pickLast) s.choices.push(1, 0);
    await s.inspect('p12_sash_whiff');
  }],
  ['authenticity_whiff.wardrobe', async (s) => { await go(s, C); await s.inspect('p12_wardrobe_sash'); }],
  ['normal_breakfast.parts', async (s) => { await go(s, G); await s.inspect(`p12_bf_${firstMissing(s, order(s, BREAKFAST), 'p12_bf_')}`); }],
  ['normal_breakfast.eat', async (s) => { await go(s, G); await s.inspect('p12_bf_eat'); }],
  ['pull_my_finger.intervene', async (s) => { await go(s, G); await s.talk('garrick'); }],
];

export async function playToEndP12(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 200 && !s.has('p12_complete'); n++) {
    const step = STEPS12.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) {
      const open = PHASE12_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 12 objective the player can act on`);
    }
    onStep(step[0], s);
    await step[1](s);
  }
  expect(s.has('p12_complete'), 'Story Phase 12 reaches its end').toBe(true);
}

/** From "Phase 11 complete": the galley at night, the conspiracy ready. Phase 12 starts at the captain's bed (morning). */
export async function playPhase12(pick, { onStep = () => {}, preset = 'p11_complete' } = {}) {
  const s = makeStory({ pick, preset });
  s.pickLast = pick === 'last';
  s.flagsBefore = new Set(s.session.story.allFlags());
  await s.enter(G);
  expect(s.has('p12_ready_hint'), 'told where Phase 12 starts').toBe(true);
  expect(s.has('p12_started'), 'Phase 12 waits for the morning').toBe(false);
  await s.inspect('p12_start_bed');
  expect(s.has('p12_started')).toBe(true);
  const chapters = ['p12c1'];
  await playToEndP12(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
      onStep(ref, st);
    },
  });
  return { s, chapters };
}
