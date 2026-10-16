import { expect } from 'vitest';
import { currentChapter } from '../src/systems/story/progress.js';
import { stabilityDef, promptOptions } from '../src/systems/stability.js';
import { makeStory } from './storyHarness.js';
import { go as go14 } from './phase14Play.js';

/**
 * Story Phase 16 (THE GRAND LIGHTER), walked the way a player would
 * (tests/phase16_story.test.js and the debug presets' recorder share it):
 * from the end of Phase 15, every open objective in turn, until COMMON SENSE
 * IS WINNING. When Brogath needs steadying, the walk queues the calming answer
 * (walking 'last' options it opens with a wrong one where the scene asks
 * again). The forms, the hearing and the pitch are played by the choices the
 * walk makes: 'first' and 'last' take different routes through each.
 */

export const PHASE16_QUESTS = ['grand_search_for_fire', 'the_grand_lighter', 'coffin_sock', 'stenchmaster_fart_zone', 'vindictas_emergency',
  'chicken_near_miss', 'chicken_town', 'grand_dispensary', 'bankworth', 'currency_converter', 'sashback_rewards', 'hornet_fart', 'stingbeard',
  'sash_quote_story_hour', 'hornet_credit_boom', 'grand_lighter_history', 'portable_tv', 'ignition_application', 'ignition_hearing', 'lighter_pitch'];

const D = 'main_deck';
const G = 'galley';
const H = 'cargo_hold';
const C = 'captains_quarters';
const Q = 'crew_quarters';
const Z = 'fart_free_zone';
export const FZ = 'stenchmaster_fart_zone';

/** Gets the captain to a room (the Fart Zone is down the ladder under the cargo grating). */
export async function go(s, map) {
  if (s.map === map) return;
  if (s.map === FZ) await s.enter(D, null, { spawn: 'fz_grate' });
  if (map === FZ) {
    await go14(s, D);
    await s.enter(FZ, null, { spawn: 'door' });
    return;
  }
  await go14(s, map);
}

const firstMissing = (s, ids, prefix) => ids.find((id) => !s.has(`${prefix}${id}`));
const order = (s, list) => (s.pickLast ? list.slice().reverse() : list);

/** Queues answers for a run of reassurance prompts (sets, in order). */
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

const FIRE = { desk: [C, 'p16_fire_desk'], stove: [G, 'p16_fire_stove'], footlocker: [Q, 'p16_fire_footlocker'], crate: [H, 'p16_fire_crate'],
  garrick: [G, 'p16_fire_garrick'], barrel: [D, 'p16_fire_barrel'] };
const VENT = { quarters: [Q, 'p16_vent_quarters'], galley: [G, 'p16_vent_galley'], cabin: [C, 'p16_vent_cabin'] };
const HEN = { bunks: [Q, 'p16_hen_bunks'], barrels: [G, 'p16_hen_barrels'], hold: [H, 'p16_hen_hold'], sashes: [Q, 'p16_hen_sashes'], grating: [D, 'p16_hen_grating'] };
const WALK = { garrick: [G, 'talk', 'garrick'], jim: [G, 'talk', 'jim'], pete: [D, 'talk', 'pete'], visitors: [D, 'talk', 'visitor_one'], rail: [D, 'inspect', 'p16_walk_rail'] };
const SHOO = { rail: 'p16_shoo_rail', barrel: 'p16_shoo_barrel', wheel: 'p16_shoo_wheel' };

async function at(s, map, how, what) {
  await go(s, map);
  if (how === 'talk') await s.talk(what);
  else await s.inspect(what);
}

/** First open objective wins; each step does what a player would do about it. */
export const STEPS16 = [
  // 186
  ['grand_search_for_fire.calm', async (s) => at(s, G, 'talk', firstMissing(s, order(s, ['pete', 'garrick']), 'p16_calm_'))],
  ['grand_search_for_fire.sashes', async (s) => at(s, Q, 'inspect', 'p16_sashes')],
  ['grand_search_for_fire.spot', async (s) => at(s, Q, 'inspect', 'p16_canopy')],
  ['grand_search_for_fire.talks', async (s) => {
    const who = firstMissing(s, order(s, ['pete', 'garrick', 'brogath']), 'p16_talk_');
    if (who === 'brogath') queueSteady(s, ['general'], { retry: false });
    await at(s, Q, 'talk', who);
  }],
  ['grand_search_for_fire.light', async (s) => at(s, Q, 'talk', 'visitor_one')],
  ['grand_search_for_fire.search', async (s) => {
    const [map, id] = FIRE[firstMissing(s, order(s, Object.keys(FIRE)), 'p16_fire_')];
    await at(s, map, 'inspect', id);
  }],
  ['grand_search_for_fire.precedent', async (s) => at(s, Q, 'talk', 'garrick')],
  // 187
  ['the_grand_lighter.shout', async (s) => at(s, D, 'inspect', 'p16_shout')],
  ['the_grand_lighter.catch', async (s) => at(s, D, 'inspect', 'p16_parcel')],
  ['the_grand_lighter.try', async (s) => at(s, Q, 'inspect', 'p16_try')],
  ['the_grand_lighter.ad', async (s) => at(s, G, 'inspect', 'p16_ad')],
  ['the_grand_lighter.work', async (s) => at(s, Q, 'inspect', 'p16_work')],
  ['the_grand_lighter.vindicta', async (s) => at(s, Q, 'talk', 'vindicta')],
  // 188
  ['coffin_sock.idea', async (s) => at(s, Q, 'talk', 'brogath')],
  ['coffin_sock.prep', async (s) => {
    const who = { pete: 'pete', visitors: 'visitor_one', garrick: 'garrick' }[firstMissing(s, order(s, ['pete', 'visitors', 'garrick']), 'p16_prep_')];
    await at(s, Q, 'talk', who);
  }],
  ['coffin_sock.attempt', async (s) => {
    queueSteady(s, ['apology', 'apology', 'apology'], { retry: true });
    await at(s, Q, 'talk', 'brogath');
  }],
  ['coffin_sock.committee', async (s) => at(s, Q, 'talk', 'garrick')],
  ['coffin_sock.vent', async (s) => {
    const [map, id] = VENT[firstMissing(s, order(s, Object.keys(VENT)), 'p16_vent_')];
    await at(s, map, 'inspect', id);
  }],
  ['coffin_sock.bbk', async (s) => at(s, D, 'inspect', 'p16_bbk')],
  // 189
  ['stenchmaster_fart_zone.find', async (s) => at(s, D, 'inspect', 'p16_fz_find')],
  ['stenchmaster_fart_zone.inspect', async (s) => go(s, FZ)],
  ['stenchmaster_fart_zone.clear', async (s) => at(s, FZ, 'inspect', `p16_fz_clear_${firstMissing(s, order(s, ['sails', 'spar', 'cable']), 'p16_fz_clear_')}`)],
  ['stenchmaster_fart_zone.signs', async (s) => at(s, FZ, 'inspect', `p16_fz_sign_${firstMissing(s, order(s, ['a', 'b']), 'p16_fz_sign_')}`)],
  ['stenchmaster_fart_zone.door', async (s) => at(s, FZ, 'inspect', 'p16_fz_door')],
  ['stenchmaster_fart_zone.portholes', async (s) => at(s, FZ, 'inspect', `p16_fz_porthole_${firstMissing(s, order(s, ['1', '2', '3']), 'p16_fz_porthole_')}`)],
  ['stenchmaster_fart_zone.observe', async (s) => at(s, FZ, 'inspect', 'p16_fz_observe')],
  ['stenchmaster_fart_zone.queue', async (s) => at(s, FZ, 'inspect', 'p16_fz_queue')],
  ['stenchmaster_fart_zone.rules', async (s) => at(s, FZ, 'inspect', 'p16_fz_rules')],
  ['stenchmaster_fart_zone.orient', async (s) => at(s, FZ, 'talk', firstMissing(s, order(s, ['brogath', 'garrick']), 'p16_fz_orient_'))],
  ['stenchmaster_fart_zone.vindicta', async (s) => at(s, D, 'talk', 'vindicta')],
  // 190
  ['vindictas_emergency.search', async (s) => {
    const [map, id] = HEN[firstMissing(s, order(s, Object.keys(HEN)), 'p16_hen_')];
    await at(s, map, 'inspect', id);
  }],
  ['vindictas_emergency.vindicta', async (s) => at(s, D, 'talk', 'vindicta')],
  ['vindictas_emergency.procedure', async (s) => at(s, FZ, 'inspect', s.has('p16_vproc_portholes') ? 'p16_v_door' : 'p16_v_portholes')],
  ['vindictas_emergency.rescue', async (s) => at(s, FZ, 'inspect', 'p16_v_rescue')],
  // 191
  ['chicken_near_miss.sniff', async (s) => at(s, Q, 'talk', 'agnes_second')],
  ['chicken_near_miss.steady', async (s) => {
    queueSteady(s, ['near_miss'], { retry: false });
    await at(s, Q, 'talk', 'brogath');
  }],
  ['chicken_near_miss.watch', async (s) => at(s, Q, 'talk', 'brogath')],
  ['chicken_near_miss.calm', async (s) => at(s, Q, 'talk', 'pete')],
  // 192
  ['chicken_town.think', async (s) => at(s, D, 'inspect', 'p16_think')],
  ['chicken_town.hands', async (s) => {
    const who = { garrick: 'garrick', visitors: 'visitor_one', pete: 'pete' }[firstMissing(s, order(s, ['garrick', 'visitors', 'pete']), 'p16_hands_')];
    await at(s, Q, 'talk', who);
  }],
  ['chicken_town.wait', async (s) => at(s, Q, 'inspect', 'p16_wait')],
  ['chicken_town.walk', async (s) => {
    const [map, how, what] = WALK[firstMissing(s, order(s, Object.keys(WALK)), 'p16_walk_')];
    await at(s, map, how, what);
  }],
  // 193
  ['grand_dispensary.brogath', async (s) => at(s, Q, 'talk', 'brogath')],
  ['grand_dispensary.look', async (s) => at(s, Q, 'inspect', 'p16_disp_look')],
  ['grand_dispensary.serve', async (s) => at(s, Q, 'inspect', 'p16_disp_serve')],
  // 194
  ['bankworth.lounge', async (s) => at(s, Q, 'inspect', 'p16_lounge')],
  ['bankworth.song', async (s) => at(s, Q, 'talk', 'pete')],
  ['bankworth.bankworth', async (s) => at(s, Q, 'talk', 'bankworth')],
  ['bankworth.deposit', async (s) => at(s, Q, 'inspect', 'p16_deposit')],
  // 195
  ['currency_converter.machine', async (s) => at(s, Q, 'inspect', 'p16_machine')],
  ['currency_converter.insert', async (s) => at(s, Q, 'inspect', 'p16_insert')],
  ['currency_converter.receipt', async (s) => at(s, Q, 'inspect', 'p16_receipt')],
  // 196
  ['sashback_rewards.first', async (s) => at(s, Q, 'inspect', 'p16_credit_first')],
  ['sashback_rewards.more', async (s) => at(s, Q, 'inspect', 'p16_credit_more')],
  ['sashback_rewards.rancidella', async (s) => at(s, Q, 'inspect', 'p16_credit_rancidella')],
  ['sashback_rewards.redeem', async (s) => at(s, Q, 'talk', 'rancidella')],
  ['sashback_rewards.save', async (s) => at(s, Q, 'talk', 'brogath')],
  ['sashback_rewards.policy', async (s) => at(s, Q, 'inspect', 'p16_policy')],
  // 197
  ['hornet_fart.idea', async (s) => at(s, Q, 'talk', 'brogath')],
  ['hornet_fart.procedure', async (s) => {
    const next = firstMissing(s, order(s, ['door', 'portholes', 'sash', 'warning']), 'p16_hproc_');
    if (next === 'sash') await at(s, FZ, 'talk', 'brogath');
    else await at(s, FZ, 'inspect', `p16_h_${next}`);
  }],
  ['hornet_fart.release', async (s) => at(s, FZ, 'inspect', 'p16_h_release')],
  ['hornet_fart.deck', async (s) => go(s, D)],
  ['hornet_fart.praise', async (s) => {
    queueSteady(s, ['hornet_pride'], { retry: false });
    await at(s, D, 'talk', 'brogath');
  }],
  // 198
  ['stingbeard.shoo', async (s) => at(s, D, 'inspect', SHOO[firstMissing(s, order(s, Object.keys(SHOO)), 'p16_shoo_')])],
  ['stingbeard.name', async (s) => at(s, D, 'talk', 'pete')],
  ['stingbeard.bunker', async (s) => { await go(s, H); await s.run('p16.bunker_door'); }],
  ['stingbeard.work', async (s) => at(s, Q, 'inspect', 'p16_back_to_work')],
  // 199
  ['sash_quote_story_hour.tube', async (s) => at(s, Q, 'inspect', 'p16_tube')],
  ['sash_quote_story_hour.sashes', async (s) => at(s, Q, 'inspect', 'p16_quote')],
  ['sash_quote_story_hour.brogath', async (s) => at(s, Q, 'talk', 'brogath')],
  // 200
  ['hornet_credit_boom.apply', async (s) => at(s, Q, 'inspect', 'p16_bzz_apply')],
  ['hornet_credit_boom.approved', async (s) => at(s, Q, 'inspect', 'p16_bzz_approve')],
  ['hornet_credit_boom.converter', async (s) => at(s, Q, 'inspect', 'p16_bzz_convert')],
  ['hornet_credit_boom.epidemic', async (s) => at(s, Q, 'inspect', 'p16_epidemic')],
  ['hornet_credit_boom.preferred', async (s) => at(s, Q, 'talk', 'bankworth')],
  ['hornet_credit_boom.smores', async (s) => at(s, Q, 'inspect', 'p16_smores')],
  // 201
  ['grand_lighter_history.in', async (s) => go(s, Z)],
  ['grand_lighter_history.read', async (s) => at(s, Z, 'inspect', 'p16_lore')],
  ['grand_lighter_history.react', async (s) => at(s, Z, 'talk', 'garrick')],
  // 202
  ['portable_tv.coat', async (s) => at(s, Z, 'talk', 'garrick')],
  ['portable_tv.aerial', async (s) => at(s, Z, 'inspect', 'p16_aerial')],
  ['portable_tv.watch', async (s) => at(s, Z, 'inspect', 'p16_watch')],
  ['portable_tv.off', async (s) => at(s, Z, 'inspect', s.has('p16_tv_off_1') ? 'p16_tv_off_2' : 'p16_tv_off_1')],
  // 203
  ['ignition_application.customer', async (s) => at(s, Q, 'inspect', 'p16_customer')],
  ['ignition_application.form', async (s) => at(s, Q, 'inspect', 'p16_form')],
  ['ignition_application.stamp', async (s) => at(s, Q, 'inspect', 'p16_stamp')],
  // 204
  ['ignition_hearing.council', async (s) => at(s, Q, 'inspect', 'p16_council')],
  ['ignition_hearing.selected', async (s) => at(s, Q, 'inspect', 'p16_selected')],
  // 205
  ['lighter_pitch.pitch', async (s) => at(s, Q, 'inspect', 'p16_pitch')],
  ['lighter_pitch.next', async (s) => at(s, Q, 'inspect', 'p16_next')],
  ['lighter_pitch.end', async (s) => at(s, Q, 'inspect', 'p16_end')],
];

/** Plays on from wherever Phase 16 is until COMMON SENSE IS WINNING. */
export async function playToEndP16(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 800 && !s.has('p16_complete'); n++) {
    const next = STEPS16.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!next) {
      const open = PHASE16_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 16 objective the player can act on`);
    }
    onStep(next[0], s);
    await next[1](s);
  }
  expect(s.has('p16_complete'), 'Story Phase 16 reaches its end').toBe(true);
}

/** From "Phase 15 complete": Phase 16 starts with Pete, in the galley. */
export async function playPhase16(pick, { onStep = () => {}, preset = 'p15_complete', from = null } = {}) {
  const s = from ?? makeStory({ pick, preset });
  s.pickLast = pick === 'last';
  if (s.map !== G) await go(s, G);
  expect(s.has('p16_started'), 'Phase 16 waits for the captain').toBe(false);
  await s.talk('pete');
  expect(s.has('p16_started')).toBe(true);
  const chapters = ['p16c1'];
  await playToEndP16(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
      onStep(ref, st);
    },
  });
  return { s, chapters };
}
