import { expect } from 'vitest';
import { currentChapter } from '../src/systems/story/progress.js';
import { tvDef, setPower, setChannel } from '../src/systems/tv/tv.js';
import { stabilityDef, promptOptions } from '../src/systems/stability.js';
import { makeStory } from './storyHarness.js';

/**
 * Story Phase 14 (RETURN OF BROGATH), walked the way a player would
 * (tests/phase14_story.test.js and the debug presets' recorder share it):
 * from the end of Phase 13, every open objective in turn, until he lives
 * here now. When Brogath needs steadying, the walk says something calming
 * (the first calming thing on offer) unless it's walking the 'last' options
 * and he can stand a wrong answer or two, so both kinds of answer get played.
 */

export const PHASE14_QUESTS = ['the_door_opens', 'follow_the_plume', 'return_of_brogath', 'containment_corner', 'keep_brogath_confident',
  'apology_eruption', 'back_in_office', 'two_grand_stenchmasters', 'beans_of_precedent', 'fart_free_zone', 'getting_rid_of_brogath',
  'beyond_broke', 'grand_economy', 'bad_money', 'oat_security', 'television_duty', 'sash_commercial', 'the_grand_bank', 'teller_shift',
  'legendary_depositors', 'branch_concludes', 'distinguishedly_furious', 'brogath_problem', 'history_night'];

const D = 'main_deck';
const G = 'galley';
const H = 'cargo_hold';
const C = 'captains_quarters';
const Q = 'crew_quarters';
const Z = 'fart_free_zone';

const ARRIVE = {
  [D]: { [G]: 'main_hatch', [Q]: 'fore_hatch', [C]: 'cabin_door' },
  [G]: { [D]: 'ladder', [H]: 'stairs', [Q]: 'south_door' },
  [H]: { [G]: 'stairs' },
  [Q]: { [G]: 'north_door', [D]: 'ladder' },
  [C]: { [D]: 'door' },
};
const VIA = { [H]: G, [C]: D };

async function step(s, map) {
  if (s.map === Z) return s.enter(H, null, { x: 13, y: 4, facing: 'down' }); // out of the little door
  if (map === Z) return s.enter(Z, null, { spawn: 'door' });
  await s.enter(map, null, { spawn: ARRIVE[map][s.map] });
}

export async function go(s, map) {
  for (let n = 0; n < 6 && s.map !== map; n++) {
    if (s.map === Z) { await step(s, H); continue; }
    if (map === Z) {
      if (s.map === H) { await step(s, Z); continue; }
      await go(s, H);
      continue;
    }
    if (ARRIVE[map][s.map]) { await step(s, map); continue; }
    if (VIA[s.map] && VIA[s.map] !== map) { await step(s, VIA[s.map]); continue; }
    const mid = VIA[map] ?? (s.map === D ? G : D);
    await step(s, mid);
  }
  if (s.map !== map) throw new Error(`couldn't get from ${s.map} to ${map}`);
}

const firstMissing = (s, ids, prefix) => ids.find((id) => !s.has(`${prefix}${id}`));
const order = (s, list) => (s.pickLast ? list.slice().reverse() : list);
const value = (s, name) => s.session.story.getValue(name);
const pressure = (s) => s.session.story.getVar('brogath_pressure', 10);

/** Before a reassurance prompt: queue the calming answer (always, walking first options; when he's near the top, walking last ones). */
function steadyPick(s, set) {
  const def = stabilityDef({ id: 'brogath', ...s.content.stability.get('brogath') });
  const opts = promptOptions(def, set, s.session.story.getVar(def.turnVar ?? 'brogath_reassure_turn', 0));
  const calm = opts.findIndex((o) => o.calm);
  if (!s.pickLast || pressure(s) >= 55) s.choices.push(calm);
}

async function talkSteady(s, who, set) {
  steadyPick(s, set);
  await s.talk(who);
}

const FLUTTER_SOURCE = { shirt: ['talk', 'bob'], label: ['inspect', 'p14_fl_label'], napkin: ['inspect', 'p14_fl_napkin'], page: ['talk', 'garrick'], squawks: ['talk', 'squawks'], flag: ['inspect', 'p14_fl_flag'] };
const SUPPLIES = { blankets: [Q, 'p14_ffz_blankets'], pillows: [Q, 'p14_ffz_pillows'], mattress: [H, 'p14_ffz_mattress'], sashes: [G, 'p14_ffz_sashes'], barrels: [H, 'p14_ffz_barrels'], rags: [Q, 'p14_ffz_rags'], hardtack: [H, 'p14_ffz_hardtack'], cards: [Q, 'p14_ffz_cards'], grog: [G, 'p14_ffz_grog'] };
const DISHES = { beans: 'p14_stove_dish', onions: 'p14_stove_dish', garlic: 'p14_garlic', cabbage: 'p14_cabbage', grog: 'p14_grog_dish', sauce: 'p14_sauce' };
const PROPOSALS = { storm: 'jim', burn: 'gristle', treasure: 'bob', confident: 'ned' };

/** First open objective wins; each step does what a player would do about it. */
export const STEPS14 = [
  ['the_door_opens.below', async (s) => { await go(s, H); await s.trigger('p14_below'); }],
  ['the_door_opens.signs', async (s) => { await go(s, H); await s.inspect('p14_signs'); }],
  ['the_door_opens.planks', async (s) => { await go(s, H); await s.inspect('p14_planks'); }],
  ['the_door_opens.crack', async (s) => { await go(s, H); await s.inspect('p14_crack'); }],
  ['follow_the_plume.galley', async (s) => { await go(s, G); }],
  ['follow_the_plume.quarters', async (s) => { await go(s, Q); }],
  ['return_of_brogath.speak', async (s) => { await go(s, Q); await talkSteady(s, 'brogath', 'general'); }],
  ['containment_corner.barricade', async (s) => {
    await go(s, Q);
    // The shield is cardboard Sir Rumpus, wherever he was stood in Phase 13.
    const shield = value(s, 'standee_rumpus') === 'door' ? 'p14_bar_shield_door' : 'p14_bar_shield';
    const ids = { table: 'p14_bar_table', cask: 'p14_bar_cask', blankets: 'p14_bar_blankets', shield };
    await s.inspect(ids[firstMissing(s, order(s, Object.keys(ids)), 'p14_bar_')]);
  }],
  ['containment_corner.rules', async (s) => { await go(s, Q); await s.inspect('p14_rules_first'); }],
  ['containment_corner.garrick', async (s) => { await go(s, Q); await s.talk('garrick'); }],
  ['keep_brogath_confident.theory', async (s) => { await go(s, Q); await s.talk('pete'); }],
  ['keep_brogath_confident.flutters', async (s) => {
    await go(s, Q);
    const n = value(s, 'p14_flutter_current');
    if (!s.has(`p14_fl_${n}_secured`)) {
      const [how, what] = FLUTTER_SOURCE[n];
      if (how === 'talk') await s.talk(what);
      else await s.inspect(what);
    } else await talkSteady(s, 'brogath', 'flutter');
  }],
  ['keep_brogath_confident.rules', async (s) => { await go(s, Q); await s.inspect('p14_rules_flutter'); }],
  ['apology_eruption.brace', async (s) => { await go(s, Q); await s.inspect('p14_ae_brace'); }],
  ['apology_eruption.sashes', async (s) => { await go(s, Q); await s.inspect(`p14_ae_sash_${firstMissing(s, order(s, ['a', 'b', 'c']), 'p14_ae_sash_')}`); }],
  ['apology_eruption.objects', async (s) => { await go(s, Q); await s.inspect(s.has('p14_ae_obj_set') ? 'p14_ae_pack' : 'p14_ae_set'); }],
  ['apology_eruption.lantern', async (s) => { await go(s, Q); await s.inspect('p14_ae_lantern'); }],
  ['apology_eruption.reach', async (s) => {
    await go(s, Q);
    // Three tries at the apology prompt, all calming (or the walk's own picks when it can stand them).
    for (let i = 0; i < 3; i++) steadyPick(s, 'apology');
    await s.talk('brogath');
  }],
  ['back_in_office.tongs', async (s) => { await go(s, G); await s.inspect('p14_tongs'); }],
  ['back_in_office.sash', async (s) => { await go(s, C); await s.inspect('p14_wardrobe'); }],
  ['back_in_office.return', async (s) => { await go(s, G); await s.talk('garrick'); }],
  ['back_in_office.decrees', async (s) => {
    await go(s, G);
    if (s.has('p14_gs_started') && !s.has('p14_gs_secured')) await s.talk('garrick');
    else if (s.has('p14_gs_started') && !s.has('p14_gs_done')) await talkSteady(s, 'brogath', 'flutter');
    else await s.talk('garrick');
  }],
  ['two_grand_stenchmasters.rounds', async (s) => { await go(s, G); await s.talk(s.session.story.getVar('p14_rounds', 0) % 2 ? 'brogath' : 'garrick'); }],
  ['beans_of_precedent.compliments', async (s) => {
    await go(s, G);
    // Walking last options: one compliment out of turn first (the other one sulks), then by the rota.
    s.refused ??= new Set();
    if (s.pickLast && !s.refused.has('rota')) {
      s.refused.add('rota');
      await s.talk('brogath');
      return;
    }
    await s.talk(s.session.story.getVar('p14_comp_turn', 0) ? 'brogath' : 'garrick');
  }],
  ['beans_of_precedent.dishes', async (s) => { await go(s, G); await s.inspect(DISHES[firstMissing(s, Object.keys(DISHES), 'p14_dish_')]); }],
  ['beans_of_precedent.meeting', async (s) => { await go(s, H); await s.inspect('p14_nook'); }],
  ['fart_free_zone.declare', async (s) => { await go(s, Z); await s.talk('pete'); }],
  ['fart_free_zone.supplies', async (s) => {
    const next = firstMissing(s, order(s, Object.keys(SUPPLIES)), 'p14_ffz_');
    const [map, id] = SUPPLIES[next];
    await go(s, map);
    await s.inspect(id);
  }],
  ['fart_free_zone.cards', async (s) => { await go(s, Z); await s.inspect('p14z_cards'); }],
  ['getting_rid_of_brogath.proposals', async (s) => { await go(s, Z); await s.talk(PROPOSALS[firstMissing(s, order(s, Object.keys(PROPOSALS)), 'p14_prop_')]); }],
  ['getting_rid_of_brogath.mission', async (s) => { await go(s, Z); await s.talk('pete'); }],
  ['beyond_broke.read', async (s) => { await go(s, Z); await s.inspect('p14z_read_psg'); }],
  ['beyond_broke.ingredients', async (s) => { await go(s, Z); await s.inspect('p14z_slate_ingredients'); }],
  ['beyond_broke.sign', async (s) => { await go(s, H); await s.inspect('p14_exclusion_sign'); }],
  ['grand_economy.read', async (s) => { await go(s, Z); await s.inspect('p14z_read_econ'); }],
  ['grand_economy.sleep', async (s) => { await go(s, Z); await s.inspect('p14z_sleep_econ'); }],
  ['bad_money.see', async (s) => { await go(s, Q); await s.talk('brogath'); }],
  ['bad_money.purse', async (s) => { await go(s, C); await s.inspect('p14_purse'); }],
  ['bad_money.crate', async (s) => { await go(s, D); await s.inspect('p14_crate_deck'); }],
  ['bad_money.open', async (s) => { await go(s, G); await s.inspect('p14_crate_open'); }],
  ['oat_security.job', async (s) => { await go(s, Q); await s.talk('brogath'); }],
  ['oat_security.sacks', async (s) => { await go(s, G); await s.inspect(s.has('p14_oat_sack_b') ? 'p14_oat_sack_stores' : 'p14_oat_sack_flour'); }],
  ['oat_security.check', async (s) => { await go(s, G); await s.inspect('p14_oat_post'); }],
  ['oat_security.sweep', async (s) => { await go(s, G); await s.inspect('p14_oat_sweep'); }],
  ['television_duty.machinery', async (s) => { await go(s, Q); await s.inspect('p14_tv_machinery'); }],
  ['television_duty.channel', async (s) => {
    await go(s, Q);
    // The player flips the dial in the close-up: channel 7, the Frog Tax Man.
    const def = tvDef(s.content, 'ses_kit');
    setPower(def, s.session, true);
    setChannel(def, s.session, 7);
    await s.inspect('p14_tv_channel');
  }],
  ['television_duty.watch', async (s) => { await go(s, Q); await s.talk('brogath'); }],
  ['sash_commercial.eyes', async (s) => { await go(s, Q); await s.talk('brogath'); }],
  ['sash_commercial.channel', async (s) => { await go(s, Q); await s.inspect('p14_ad_channel'); }],
  ['sash_commercial.sashes', async (s) => { await go(s, Q); await s.inspect(`p14_ad_sash_${firstMissing(s, ['a', 'b'], 'p14_ad_sash_')}`); }],
  ['sash_commercial.doors', async (s) => { await go(s, Q); await s.inspect(`p14_ad_door_${firstMissing(s, ['a', 'b'], 'p14_ad_door_')}`); }],
  ['sash_commercial.talk', async (s) => {
    await go(s, Q);
    for (let i = 0; i < 2; i++) steadyPick(s, 'advert');
    await s.talk('brogath');
  }],
  ['the_grand_bank.questions', async (s) => { await go(s, D); await s.talk('brogath'); }],
  ['the_grand_bank.badge', async (s) => { await go(s, D); await s.talk('brogath'); }],
  ['teller_shift.serve', async (s) => { await go(s, D); await s.inspect('p14_bank_bell'); }],
  ['legendary_depositors.serve', async (s) => { await go(s, D); await s.inspect('p14_bank_bell'); }],
  ['branch_concludes.redeem', async (s) => { await go(s, D); await s.inspect('p14_vault'); }],
  ['branch_concludes.ask', async (s) => { await go(s, D); await s.talk('brogath'); }],
  ['branch_concludes.ornament', async (s) => { await go(s, D); await s.talk('brogath'); }],
  ['distinguishedly_furious.console', async (s) => {
    await go(s, Q);
    // Five rounds (one prompt each); a wrong answer repeats the round, so queue the calming ones.
    for (let k = 0; k < 5; k++) {
      const def = stabilityDef({ id: 'brogath', ...s.content.stability.get('brogath') });
      const turn = s.session.story.getVar(def.turnVar ?? 'brogath_reassure_turn', 0) + k;
      s.choices.push(promptOptions(def, `console_${k + 1}`, turn).findIndex((o) => o.calm));
    }
    await s.talk('brogath');
  }],
  ['brogath_problem.research', async (s) => { await go(s, Z); await s.inspect('p14z_research'); }],
  ['brogath_problem.sums', async (s) => { await go(s, Z); await s.inspect('p14z_slate_sums'); }],
  ['brogath_problem.tell', async (s) => { await go(s, Q); await s.talk('brogath'); }],
  ['history_night.sleep', async (s) => { await go(s, Z); await s.inspect('p14z_sleep_night'); }],
  ['history_night.investigate', async (s) => { await go(s, G); await s.inspect('p14_mk2_found'); }],
  ['history_night.unplug', async (s) => { await go(s, G); await s.inspect('p14_mk2_unplug'); }],
  ['history_night.watch', async (s) => { await go(s, G); await s.talk('brogath'); }],
  ['history_night.ads', async (s) => {
    await go(s, G);
    if (!s.has('p14_nj_eyes')) await s.talk('brogath');
    else if (!s.has('p14_nj_sash')) await s.inspect('p14_nj_sash');
    else await s.inspect('p14_mk2_channel');
  }],
  ['history_night.license', async (s) => {
    await go(s, G);
    for (let i = 0; i < 3; i++) steadyPick(s, 'advert_licensed');
    await s.talk('brogath');
  }],
];

/** Plays on from wherever Phase 14 is until he lives here now. */
export async function playToEndP14(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 600 && !s.has('p14_complete'); n++) {
    const next = STEPS14.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!next) {
      const open = PHASE14_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 14 objective the player can act on`);
    }
    onStep(next[0], s);
    await next[1](s);
  }
  expect(s.has('p14_complete'), 'Story Phase 14 reaches its end').toBe(true);
}

/** From "Phase 13 complete": the deck, the night of the command crisis. Phase 14 starts with Pete. */
export async function playPhase14(pick, { onStep = () => {}, preset = 'p13_complete', from = null } = {}) {
  const s = from ?? makeStory({ pick, preset });
  s.pickLast = pick === 'last';
  s.flagsBefore = new Set(s.session.story.allFlags());
  if (s.map !== D) await go(s, D);
  expect(s.has('p14_started'), 'Phase 14 waits for the captain').toBe(false);
  await s.talk('pete');
  expect(s.has('p14_started')).toBe(true);
  const chapters = ['p14c1'];
  await playToEndP14(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
      onStep(ref, st);
    },
  });
  return { s, chapters };
}
