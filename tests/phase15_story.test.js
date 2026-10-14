import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { currentChapter } from '../src/systems/story/progress.js';
import { sharkstormNow } from '../src/systems/hazards/sharkstorm.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { atmosphereId } from '../src/systems/atmosphere.js';
import { makeStory, reloadStory } from './storyHarness.js';
import { PHASE15_QUESTS, STEPS15, playPhase15, playToEndP15 } from './phase15Play.js';
import { go } from './phase14Play.js';
import { BANNED_LIST } from './bannedNames.js';

/**
 * Story Phase 15, THE GREAT MELLOWING (chapters 170-185), played headless
 * from the end of Phase 14: the Stenchmaster Channel and the safety
 * protocol, the Top Ten and the first skunk waft, the Mark II gutted (for
 * now), Brogath's crew, the Economic Anger Waft, creative conversion, the
 * visitors and the sale, the chicken on television, the beard-smoke
 * catastrophe and the threat levels, the Grand Nap, the Nose-Fire Waft, the
 * Bashfulness Branch, Agnes the Second and the Great Mellowing, the Untold
 * Stories, the relief teller, the sash-backed loan, and the one fart he
 * actually misses. From some of its presets too, and across a save and load.
 */

const propLive = (s, map, id) => {
  const p = s.content.maps.require(map).props.find((x) => x.id === id);
  if (!p) throw new Error(`no prop ${id} on ${map}`);
  return !p.if || evaluateCondition(p.if, s.session);
};
const talksWith = (s, npc) => s.content.npcs.require(npc).dialogue.find((e) => evaluateCondition(e.if, s.session));

/** A preset as the F2 jump starts it: the state, the chapter's opening scene, the room. */
async function fromPreset(preset) {
  const s = makeStory({ preset });
  const p = s.content.debugPresets.get(preset);
  if (p.script) await s.run(p.script);
  await s.enter(s.map);
  return s;
}

async function playUntil(s, ref) {
  for (let n = 0; n < 500; n++) {
    const step = STEPS15.find(([r]) => {
      const [q, o] = r.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) throw new Error(`ran out of objectives before ${ref}`);
    if (step[0] === ref) return;
    await step[1](s);
  }
  throw new Error(`never reached ${ref}`);
}

describe('Story Phase 15 can be played start to finish (headless)', () => {
  let first;
  it('taking the first option at every choice', async () => {
    const before = makeStory({ preset: 'p14_complete' });
    const gold = before.session.inventory.gold;
    const { s, chapters } = await playPhase15('first');
    first = s;
    expect(chapters).toEqual(Array.from({ length: 16 }, (_, i) => `p15c${i + 1}`));
    expect(currentChapter(s.content.game, s.session).id).toBe('phase15_end');
    for (const q of PHASE15_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.stagingIssues.join('\n')).toBe('');
    // The purse: nothing earned anywhere else is touched (the reserve was its own story variable).
    expect(s.session.inventory.gold).toBe(gold);
  }, 180000);

  it('taking the last option at every choice (wrong answers to Brogath where a scene asks again); it converges', async () => {
    const { s } = await playPhase15('last');
    for (const q of PHASE15_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.stagingIssues.join('\n')).toBe('');
  }, 180000);

  it('ends with the economy converted once, the cargo kept, and the souvenirs in the bag', () => {
    const s = first;
    const st = s.session.story;
    expect(st.getVar('grand_currency_tokens')).toBe(0);
    expect(st.getVar('grand_currency_converted_tokens')).toBe(20000);
    expect(st.getVar('captain_emergency_reserve')).toBe(0);
    expect(st.getVar('captain_reserve_converted')).toBe(7);
    expect(st.getVar('skunk_weed_lots')).toBe(39); // forty, less the first sale
    expect(st.getVar('modern_cash')).toBe(40);
    expect(st.getVar('teller_rating_x10')).toBe(23);
    for (const item of ['skunk_cargo_manifest', 'modern_cash', 'relief_teller_badge', 'loan_fee_receipt', 'agnes_feather']) expect(s.session.inventory.count(item), item).toBe(1);
    expect(s.session.inventory.count('grand_currency')).toBe(0);
  });

  it('ends in ordinary normality: the haze cleared, the storm rough again, Agnes in it, the branch closed, the policy written', () => {
    const s = first;
    expect(atmosphereId(s.content, s.session)).toBe('ORDINARY_STENCH');
    expect(sharkstormNow(s.content, s.session).id).toBe('rough_turbulence');
    expect(s.has('agnes_second_missing_in_sharkstorm')).toBe(true);
    expect(s.has('agnes_second_on_ship')).toBe(false);
    expect(s.session.story.getVar('agnes_second_arrivals')).toBe(1);
    expect(s.session.story.getValue('bashfulness_branch_state')).toBe('closed');
    for (const f of ['emergency_mellowing_policy', 'stenchmaster_farts_not_selectable', 'beard_experiment_banned', 'ancient_crew_reincarnation_prevented', 'modern_visitors_aboard',
      'tv_destroyed_again', 'tv_possessed_reactivation', 'great_mellowing', 'great_mellowing_cleared', 'sash_loan_resolved', 'roaring_pillow_ejected', 'grand_nap_done']) {
      expect(s.has(f), f).toBe(true);
    }
  });

  it('the ship remembers: crates, the boat, the safe corner, sash bedding, the branch\'s marks, the perch, the rules, the TV\'s insides', () => {
    const s = first;
    for (const [map, id] of [['main_deck', 'p15_skunk_crates'], ['main_deck', 'p15_boat'], ['main_deck', 'p15_chairs'], ['main_deck', 'p15_corner_sign'],
      ['crew_quarters', 'p15_pad_port_a'], ['crew_quarters', 'p15_pad_grand'], ['crew_quarters', 'p15_branch_marks'], ['crew_quarters', 'p15_perch'], ['crew_quarters', 'p15_captains_rules'],
      ['galley', 'p15_mk2_parts'], ['galley', 'p15_blanket'], ['galley', 'p15_protocol'], ['galley', 'p15_snacks_b'], ['fart_free_zone', 'p15z_no_beard'], ['captains_quarters', 'p15_floorboard_weed']]) {
      expect(propLive(s, map, id), `${map} ${id}`).toBe(true);
    }
    for (const [map, id] of [['main_deck', 'p15_mountain'], ['crew_quarters', 'p15_branch_open'], ['crew_quarters', 'p15_old_pillow'], ['main_deck', 'p15_crate_deck']]) {
      expect(propLive(s, map, id), `${map} ${id}`).toBe(false);
    }
  });
});

describe('While it plays', () => {
  it('Garrick stops decreeing in the Mellowing, and starts again the moment it clears', async () => {
    const s = await fromPreset('p15_the_fart_he_misses');
    await go(s, 'galley');
    expect(talksWith(s, 'garrick').script ?? talksWith(s, 'garrick').cycle?.[0]).toMatch(/peace_garrick|p15_peace/);
    await playUntil(s, 'the_fart_he_misses.agnes');
    const entry = talksWith(s, 'garrick');
    expect(entry.script ?? entry.cycle?.[0]).toMatch(/p15_normal/);
    const garrick = s.content.maps.require('galley').objects.find((o) => o.type === 'npc' && o.npc === 'garrick' && !o.absent && evaluateCondition(o.if, s.session));
    expect(garrick?.pose ?? null).not.toBe('sit');
  }, 120000);

  it('the captain is the only one not mellow: every crew member has Mellowing lines, and his are the beard\'s', async () => {
    const s = await fromPreset('p15_great_mellowing');
    await playUntil(s, 'great_mellowing.walk');
    expect(atmosphereId(s.content, s.session)).toBe('MELLOW_HAZE');
    expect(s.session.story.getValue('brogath_state')).toBe('MELLOW');
    for (const npc of ['pete', 'gristle', 'bob', 'jim', 'garrick', 'visitor_one']) {
      const e = talksWith(s, npc);
      expect(e.script ?? e.cycle?.[0], npc).toMatch(/mellow/);
    }
  }, 120000);

  it('a save in the middle of the relief shift picks up at the next customer, and plays on to the end', async () => {
    const s = await fromPreset('p15_relief_teller');
    await playUntil(s, 'relief_grand_teller.serve');
    for (let i = 0; i < 5; i++) await STEPS15.find(([r]) => r === 'relief_grand_teller.serve')[1](s);
    const served = s.session.story.getVar('branch_relief_served');
    expect(served).toBe(5);
    const t = reloadStory(s);
    expect(t.session.story.getVar('branch_relief_served')).toBe(5);
    await t.enter(t.map, null, { x: 12, y: 15, facing: 'up' }); // behind the counter, where the save was made
    await playToEndP15(t);
    expect(t.has('p15_complete')).toBe(true);
    expect(t.tellers.filter((id) => id === 'gary_relief')).toEqual(['gary_relief']);
    expect(t.stagingIssues.join('\n')).toBe('');
  }, 180000);

  for (const preset of ['p15_visitors', 'p15_grand_nap', 'p15_relief_gary', 'p15_sash_loan']) {
    it(`plays to the end from the ${preset} preset`, async () => {
      const s = await fromPreset(preset);
      await playToEndP15(s);
      expect(s.has('p15_complete')).toBe(true);
      expect(s.stagingIssues.join('\n')).toBe('');
    }, 180000);
  }
});

describe('Story Phase 15 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase15', 'data/dialogue/phase15', 'data/npcs/phase15.json', 'data/npcs/phase15_crew.json', 'data/npcs/phase15_branch.json',
    'data/quests/phase15.json', 'data/items/phase15.json', 'data/story/flags/phase15.json', 'data/story/triggers/phase15.json', 'data/maps/ship/phase15',
    'data/logs/phase15.json', 'data/logs/phase15_branch.json', 'data/props/phase15.json', 'data/story/bank/bashfulness_branch.json', 'data/story/bank/customers_branch.json',
    'data/story/atmosphere.json', 'data/story/conversions.json', 'data/story/ancient_crew.json', 'data/story/aliases/phase15.json',
    'data/tv/programs/stenchmaster_channel.json', 'data/tv/programs/bbk_sash_ads.json', 'data/tv/programs/grand_bank_ads.json', 'src/debug/mellowingDebug.js',
  ];
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)) : [p];
    return list.map((x) => fs.readFileSync(x, 'utf8'));
  }).join('\n');

  it('uses its own names (and none of the source\'s)', () => {
    for (const banned of [...BANNED_LIST, /nintendo/i, /\bnado\b/i, /guzzlegut/i]) expect(text).not.toMatch(banned);
    for (const name of ['Garrick', 'Brogath the Bashful', 'Fart-Free Zone', 'Sharkstorm', 'Stenchmaster Channel', 'Bling Bling King', "Queen Anne's Revenge",
      'Ledger Billiam', 'No-Nonsense Tilda', 'Elsie Beanwright', 'Agnes the Second', 'BASHFULNESS BRANCH', 'Vindicta Thunderwaft', 'Whifflebottom', 'Gary']) {
      expect(text, name).toContain(name);
    }
  });

  it('keeps the herb fictional and the smoking off-screen: no preparation, amounts, growing, kit or sourcing', () => {
    for (const bad of [/\b(dosage|doses?|grams?|ounces?|bongs?|cultivat\w*|extraction|recipes?|temperatures?)\b/i, /\broll(s|ing|ed)?\b[^."]{0,24}\bjoints?\b/i, /\bjoints?\b[^."]{0,24}\broll(s|ing|ed)?\b/i]) {
      expect(text).not.toMatch(bad);
    }
    // The visitors are grown men.
    expect(text).toMatch(/thirty-four/i);
  });

  it('invents nothing after the source: Agnes not rescued, nobody reincarnated, the storm unresolved, Garrick still in office, no Steel Brogath', () => {
    const s = makeStory({ preset: 'p15_complete' });
    const scripts = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => /^p15/.test(id)).map(([, sc]) => sc));
    for (const f of ['agnes_second_rescued', 'ledger_billiam_reincarnated', 'tilda_reincarnated', 'ancient_crew_reincarnated', 'great_sharkstorm_dealt_with', 'revenge_out_of_sharkstorm',
      'steel_brogath_created', 'steel_brogath_exists', 'brogath_dispersed', 'brogath_destroyed', 'garrick_resigned', 'garrick_regalia_removed', 'grand_waft_trials_held']) {
      expect(scripts).not.toMatch(new RegExp(`"setFlag":"${f}"`));
    }
    for (const id of s.content.ancientCrew.map.keys()) expect(scripts, id).not.toMatch(new RegExp(`"spawn":"${id}"`));
    expect(s.has('garrick_regalia_restored')).toBe(true);
    expect(s.has('brogath_permanent')).toBe(true);
    expect(s.has('modern_visitors_aboard')).toBe(true); // no invented exit
  });
});
