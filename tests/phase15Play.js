import { expect } from 'vitest';
import { currentChapter } from '../src/systems/story/progress.js';
import { stabilityDef, promptOptions } from '../src/systems/stability.js';
import { makeStory } from './storyHarness.js';
import { go } from './phase14Play.js';

/**
 * Story Phase 15 (THE GREAT MELLOWING), walked the way a player would
 * (tests/phase15_story.test.js and the debug presets' recorder share it):
 * from the end of Phase 14, every open objective in turn, until the captain
 * throws a pillow at Vindicta and says 'Not today.' When Brogath needs
 * steadying, the walk queues the calming answer for each prompt the scene
 * will ask (walking 'last' options, it gives a wrong one first where the
 * scene asks again, so both kinds of answer get played).
 */

export const PHASE15_QUESTS = ['stenchmaster_channel_presents', 'top_ten_flutters', 'family_of_idiots', 'grand_economic_recovery', 'creative_conversion',
  'stinkbeards_select', 'chicken_incident', 'grand_paranoia', 'grand_stenchmaster_nap', 'nose_fire_waft', 'bashfulness_branch', 'great_mellowing',
  'untold_stories', 'relief_grand_teller', 'sash_backed_loan', 'the_fart_he_misses'];

const D = 'main_deck';
const G = 'galley';
const C = 'captains_quarters';
const Q = 'crew_quarters';
const Z = 'fart_free_zone';

const firstMissing = (s, ids, prefix) => ids.find((id) => !s.has(`${prefix}${id}`));
const order = (s, list) => (s.pickLast ? list.slice().reverse() : list);
const value = (s, name) => s.session.story.getValue(name);

/** Queues answers for a run of reassurance prompts (sets, in order): calming ones (the last-option walk opens with a wrong one where `retry`). */
function queueSteady(s, sets, { retry = false } = {}) {
  const def = stabilityDef({ id: 'brogath', ...s.content.stability.get('brogath') });
  const turn0 = s.session.story.getVar(def.turnVar ?? 'brogath_reassure_turn', 0);
  sets.forEach((set, k) => {
    const opts = promptOptions(def, set, turn0 + k);
    const calm = opts.findIndex((o) => o.calm);
    const wrong = opts.findIndex((o) => o.trigger);
    s.choices.push(retry && s.pickLast && k === 0 && wrong >= 0 ? wrong : calm);
  });
}

const STATIONS = ['pete', 'gristle', 'bob', 'jim', 'squawks'];
const BURN = { stove: 'p15_burn_stove', lantern: 'p15_burn_lantern', tv: 'p15_burn_tv' };
const SORTS = ['dust', 'stems', 'seeds', 'leaf', 'skunky'];
const CORNER = ['sand', 'water', 'sign'];
const THREATS = { pete: ['talk', 'pete'], mug: ['inspect', 'p15_threat_mug'], bob: ['talk', 'bob'], mop: ['inspect', 'p15_threat_mop'], squawks: ['talk', 'squawks'], hull: ['inspect', 'p15_threat_hull'] };
const MELLOW = { garrick: [G, 'garrick'], pete: [G, 'pete'], gristle: [D, 'gristle'], bob: [G, 'bob'], jim: [G, 'jim'], visitors: [D, 'visitor_one'] };

/** First open objective wins; each step does what a player would do about it. */
export const STEPS15 = [
  // 170
  ['stenchmaster_channel_presents.stations', async (s) => { await go(s, G); await s.talk(firstMissing(s, order(s, STATIONS), 'p15_st_')); }],
  ['stenchmaster_channel_presents.snacks', async (s) => { await go(s, G); await s.talk('garrick'); }],
  ['stenchmaster_channel_presents.watch', async (s) => {
    await go(s, G);
    queueSteady(s, ['ad_1', 'ad_2', 'ad_3', 'ad_4', 'ad_5'], { retry: true });
    await s.talk('brogath');
  }],
  // 171
  ['top_ten_flutters.burning', async (s) => { await go(s, G); await s.inspect(BURN[firstMissing(s, order(s, Object.keys(BURN)), 'p15_burn_')]); }],
  ['top_ten_flutters.source', async (s) => { await go(s, G); await s.talk('pete'); }],
  ['top_ten_flutters.air', async (s) => { await go(s, D); }],
  ['top_ten_flutters.stop', async (s) => { await go(s, G); await s.inspect('p15_mk2_stop'); }],
  // 172
  ['family_of_idiots.find', async (s) => { await go(s, Q); await s.talk('brogath'); }],
  ['family_of_idiots.plan', async (s) => {
    await go(s, Q);
    const next = firstMissing(s, order(s, ['box', 'sketch', 'steady']), 'p15_nc_');
    if (next === 'box') await s.inspect('p15_nc_box');
    else if (next === 'sketch') await s.talk('garrick');
    else {
      queueSteady(s, ['crew_missing', 'crew_missing', 'crew_missing'], { retry: true });
      await s.talk('brogath');
    }
  }],
  ['family_of_idiots.research', async (s) => { await go(s, Z); await s.inspect('p15z_lore'); }],
  ['family_of_idiots.tell', async (s) => { await go(s, Q); await s.talk('brogath'); }],
  // 173
  ['grand_economic_recovery.reserve', async (s) => { await go(s, C); await s.inspect('p15_reserve'); }],
  ['grand_economic_recovery.crate', async (s) => { await go(s, G); await s.inspect('p15_crate_up'); }],
  ['grand_economic_recovery.clear', async (s) => { await go(s, D); await s.talk('pete'); }],
  ['grand_economic_recovery.provoke', async (s) => { await go(s, D); await s.talk('garrick'); }],
  // 174
  ['creative_conversion.look', async (s) => { await go(s, D); await s.inspect('p15_cargo_first'); }],
  ['creative_conversion.reserve', async (s) => { await go(s, C); await s.inspect('p15_reserve_gone'); }],
  ['creative_conversion.sort', async (s) => { await go(s, D); await s.inspect(`p15_sort_${firstMissing(s, order(s, SORTS), 'p15_sort_')}`); }],
  ['creative_conversion.report', async (s) => {
    await go(s, D);
    queueSteady(s, ['report', 'report', 'report'], { retry: true });
    await s.talk('brogath');
  }],
  ['creative_conversion.king', async (s) => { await go(s, D); await s.inspect('p15_bbk_token'); }],
  // 175
  ['stinkbeards_select.boat', async (s) => { await go(s, D); await s.inspect('p15_boat'); }],
  ['stinkbeards_select.meet', async (s) => { await go(s, D); await s.talk(s.has('p15_met_one') ? 'visitor_two' : 'visitor_one'); }],
  ['stinkbeards_select.pitch', async (s) => { await go(s, D); await s.talk('visitor_one'); }],
  ['stinkbeards_select.corner', async (s) => { await go(s, D); await s.inspect(`p15_corner_${firstMissing(s, order(s, CORNER), 'p15_corner_')}`); }],
  ['stinkbeards_select.tour', async (s) => {
    const next = firstMissing(s, order(s, ['garrick', 'tv', 'sashes']), 'p15_tour_');
    if (next === 'garrick') { await go(s, D); await s.talk('garrick'); } else { await go(s, G); await s.inspect(`p15_tour_${next}`); }
  }],
  ['stinkbeards_select.explain', async (s) => { await go(s, D); await s.talk('visitor_one'); }],
  // 176
  ['chicken_incident.look', async (s) => { await go(s, G); await s.inspect('p15_tv_back'); }],
  ['chicken_incident.watch', async (s) => { await go(s, G); await s.talk('brogath'); }],
  ['chicken_incident.clambake', async (s) => { await go(s, G); await s.talk('visitor_one'); }],
  ['chicken_incident.retreat', async (s) => { await go(s, Z); }],
  // 177
  ['grand_paranoia.assess', async (s) => {
    await go(s, G);
    const [how, what] = THREATS[firstMissing(s, order(s, Object.keys(THREATS)), 'p15_threat_')];
    if (how === 'talk') await s.talk(what);
    else await s.inspect(what);
  }],
  ['grand_paranoia.train', async (s) => { await go(s, G); await s.talk('visitor_one'); }],
  ['grand_paranoia.recover', async (s) => { await go(s, Z); await s.inspect('p15z_recover'); }],
  ['grand_paranoia.rule', async (s) => { await go(s, Q); await s.inspect('p15_rule_beard'); }],
  // 178
  ['grand_stenchmaster_nap.strip', async (s) => { await go(s, Q); await s.inspect(`p15_strip_${firstMissing(s, order(s, ['a', 'b', 'c']), 'p15_strip_')}`); }],
  ['grand_stenchmaster_nap.sashes', async (s) => { await go(s, Q); await s.inspect('p15_sashes'); }],
  ['grand_stenchmaster_nap.beds', async (s) => { await go(s, Q); await s.inspect(`p15_bed_${firstMissing(s, order(s, ['port', 'stbd', 'grand']), 'p15_bed_')}`); }],
  ['grand_stenchmaster_nap.settle', async (s) => {
    await go(s, Q);
    const who = { pete: 'pete', visitors: 'visitor_one', garrick: 'garrick' }[firstMissing(s, order(s, ['pete', 'visitors', 'garrick']), 'p15_settle_')];
    await s.talk(who);
  }],
  ['grand_stenchmaster_nap.pillow', async (s) => { await go(s, Q); await s.inspect('p15_pillow'); }],
  ['grand_stenchmaster_nap.eject', async (s) => { await go(s, D); await s.inspect('p15_eject'); }],
  ['grand_stenchmaster_nap.nap', async (s) => { await go(s, Q); await s.inspect('p15_nap'); }],
  // 179
  ['nose_fire_waft.catch', async (s) => { await go(s, Q); await s.inspect(`p15_catch_${s.session.story.getVar('pillow_spot', 0)}`); }],
  ['nose_fire_waft.throw', async (s) => { await go(s, D); await s.inspect('p15_throw'); }],
  ['nose_fire_waft.sorry', async (s) => { await go(s, Q); await s.talk('brogath'); }],
  // 180
  ['bashfulness_branch.look', async (s) => { await go(s, Q); await s.inspect('p15_branch_look'); }],
  ['bashfulness_branch.flicker', async (s) => { await go(s, Q); await s.talk('brogath'); }],
  ['bashfulness_branch.night', async (s) => { await go(s, Q); await s.inspect('p15_night'); }],
  // 181
  ['great_mellowing.see', async (s) => { await go(s, D); }],
  ['great_mellowing.catch', async (s) => { await go(s, D); await s.talk('agnes_second'); }],
  ['great_mellowing.brogath', async (s) => { await go(s, Q); await s.talk('brogath'); }],
  ['great_mellowing.walk', async (s) => {
    const [map, who] = MELLOW[firstMissing(s, order(s, Object.keys(MELLOW)), 'p15_mellow_')];
    await go(s, map);
    await s.talk(who);
  }],
  ['great_mellowing.sober', async (s) => { await go(s, G); await s.talk('pete'); }],
  // 182
  ['untold_stories.jobs', async (s) => {
    await go(s, G);
    const next = firstMissing(s, order(s, ['screen', 'sash', 'brogath', 'garrick', 'brace']), 'p15_job_');
    if (next === 'brogath') {
      queueSteady(s, ['mellow_ad', 'mellow_ad'], { retry: true });
      await s.talk('brogath');
    } else if (next === 'garrick') await s.talk('garrick');
    else await s.inspect(`p15_job_${next}`);
  }],
  ['untold_stories.watch', async (s) => { await go(s, G); await s.talk('brogath'); }],
  // 183
  ['relief_grand_teller.serve', async (s) => { await go(s, Q); await s.inspect('p15_relief_bell'); }],
  ['relief_grand_teller.rating', async (s) => { await go(s, Q); await s.inspect('p15_rating'); }],
  // 184
  ['sash_backed_loan.hear', async (s) => { await go(s, Q); await s.inspect('p15_loan_hear'); }],
  ['sash_backed_loan.forms', async (s) => { await go(s, Q); await s.inspect('p15_loan_forms'); }],
  ['sash_backed_loan.collateral', async (s) => { await go(s, Q); await s.inspect('p15_loan_collateral'); }],
  ['sash_backed_loan.close', async (s) => { await go(s, Q); await s.inspect('p15_loan_last'); }],
  // 185
  ['the_fart_he_misses.peace', async (s) => {
    const next = firstMissing(s, order(s, ['garrick', 'brogath', 'agnes']), 'p15_peace_');
    if (next === 'garrick') { await go(s, G); await s.talk('garrick'); } else { await go(s, Q); await s.talk(next === 'agnes' ? 'agnes_second' : 'brogath'); }
  }],
  ['the_fart_he_misses.pantry', async (s) => { await go(s, G); await s.inspect('p15_pantry'); }],
  ['the_fart_he_misses.vindicta', async (s) => { await go(s, D); await s.talk('vindicta'); }],
  ['the_fart_he_misses.agnes', async (s) => {
    const next = firstMissing(s, order(s, ['perch', 'deck', 'rail']), 'p15_search_');
    await go(s, next === 'perch' ? Q : D);
    await s.inspect(`p15_search_${next}`);
  }],
  ['the_fart_he_misses.again', async (s) => { await go(s, D); await s.talk('brogath'); }],
  ['the_fart_he_misses.policy', async (s) => { await go(s, Q); await s.inspect('p15_rule_policy'); }],
  ['the_fart_he_misses.end', async (s) => { await go(s, D); await s.inspect('p15_end'); }],
];

/** Plays on from wherever Phase 15 is until 'Not today.' */
export async function playToEndP15(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 700 && !s.has('p15_complete'); n++) {
    const next = STEPS15.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!next) {
      const open = PHASE15_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 15 objective the player can act on`);
    }
    onStep(next[0], s);
    await next[1](s);
  }
  expect(s.has('p15_complete'), 'Story Phase 15 reaches its end').toBe(true);
}

/** From "Phase 14 complete": the galley, Mandatory History Night's morning after. Phase 15 starts with Pete. */
export async function playPhase15(pick, { onStep = () => {}, preset = 'p14_complete', from = null } = {}) {
  const s = from ?? makeStory({ pick, preset });
  s.pickLast = pick === 'last';
  if (s.map !== G) await go(s, G);
  expect(s.has('p15_started'), 'Phase 15 waits for the captain').toBe(false);
  await s.talk('pete');
  expect(s.has('p15_started')).toBe(true);
  const chapters = ['p15c1'];
  await playToEndP15(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
      onStep(ref, st);
    },
  });
  return { s, chapters };
}
