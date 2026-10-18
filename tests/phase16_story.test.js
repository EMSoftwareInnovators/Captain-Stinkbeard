import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { atmosphereId } from '../src/systems/atmosphere.js';
import { hornetState } from '../src/systems/hazards/hornets.js';
import { makeStory, reloadStory } from './storyHarness.js';
import { PHASE16_QUESTS, STEPS16, playPhase16, playToEndP16 } from './phase16Play.js';
import { BANNED_LIST } from './bannedNames.js';

/**
 * Story Phase 16, THE GRAND LIGHTER (chapters 186-205), played headless from
 * the end of Phase 15: the Grand Search for Fire, the lighter, Coffin Sock,
 * the Stenchmaster Fart Zone, Vindicta's emergency and Agnes's rescue, the
 * near-miss, Chicken-Town, the Grand Dispensary, Bankworth, the converter,
 * Grand Sashback, the Hornet Fart, Stingbeard, Sash-Quote Story Hour, the
 * hornet credit boom, the History of the Grand Lighter, the portable set, the
 * 97-page application, the hearing, and the lighter pitch. From every preset
 * too, and across a save and load.
 */

const CHAPTERS = Array.from({ length: 20 }, (_, i) => `p16c${i + 1}`);
const propLive = (s, map, id) => {
  const p = s.content.maps.require(map).props.find((x) => x.id === id);
  if (!p) throw new Error(`no prop ${id} on ${map}`);
  return !p.if || evaluateCondition(p.if, s.session);
};

/** A preset as the F2 jump starts it: the state, the chapter's opening scene, the room. */
async function fromPreset(preset) {
  const s = makeStory({ preset });
  const p = s.content.debugPresets.get(preset);
  if (p.script) await s.run(p.script);
  await s.enter(s.map);
  return s;
}

async function playUntil(s, ref) {
  for (let n = 0; n < 600; n++) {
    const step = STEPS16.find(([r]) => {
      const [q, o] = r.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) throw new Error(`ran out of objectives before ${ref}`);
    if (step[0] === ref) return;
    await step[1](s);
  }
  throw new Error(`never reached ${ref}`);
}

describe('Story Phase 16 can be played start to finish (headless)', () => {
  let first;
  it('taking the first option at every choice', async () => {
    const gold = makeStory({ preset: 'p15_complete' }).session.inventory.gold;
    const { s, chapters } = await playPhase16('first');
    first = s;
    expect(chapters).toEqual(CHAPTERS);
    for (const q of PHASE16_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.stagingIssues.join('\n')).toBe('');
    expect(s.session.inventory.gold, 'nothing in the phase touches the purse').toBe(gold);
  }, 180000);

  it('taking the last option at every choice (the worst hearing answers, the long pitch); it converges', async () => {
    const { s, chapters } = await playPhase16('last');
    expect(chapters).toEqual(CHAPTERS);
    for (const q of PHASE16_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.stagingIssues.join('\n')).toBe('');
    expect(s.has('p16_agnes_on_form'), 'the form only accepts the right chicken answer').toBe(true);
  }, 180000);

  it('ends where the source ends: COMMON SENSE IS WINNING, and nothing after', () => {
    const s = first;
    expect(s.has('p16_complete')).toBe(true);
    expect(s.session.story.getVar('agnes_returns', 0), 'Agnes comes back exactly once').toBe(1);
    expect(s.has('agnes_second_returned')).toBe(true);
    expect(hornetState(s.content, s.session)).toBe('DORMANT');
    expect(s.has('nickname_stingbeard')).toBe(false);
    expect(s.session.story.getValue('counter_department')).toBe('BUREAU');
    expect(s.session.inventory.count('grand_stenchmaster_lighter')).toBe(1);
    // the end scene is gone, and nothing re-opens the phase
    const end = s.content.maps.require('crew_quarters').objects.find((o) => o.id === 'p16_end');
    expect(evaluateCondition(end.if, s.session)).toBe(false);
    const pete = s.content.npcs.require('pete').dialogue.find((e) => evaluateCondition(e.if, s.session));
    expect(pete.script ?? pete.cycle?.[0]).not.toBe('p16c1.begin');
  });

  it('the ship remembers: the open grating, the Fart Zone\'s signs and dents, the canopy, the counter, the converter, the bunker\'s sign, the portable set', () => {
    const s = first;
    for (const [map, id] of [['main_deck', 'p16_hatch'], ['stenchmaster_fart_zone', 'p16_fz_rules'], ['stenchmaster_fart_zone', 'p16_fz_dents'],
      ['stenchmaster_fart_zone', 'p16_fz_sign_a'], ['crew_quarters', 'p16_canopy'], ['crew_quarters', 'p16_counter_bureau'], ['crew_quarters', 'p16_converter'],
      ['crew_quarters', 'p16_terminal'], ['crew_quarters', 'p16_lounge_sign'], ['cargo_hold', 'p16_bunker_sign'], ['fart_free_zone', 'p16z_tv']]) {
      expect(propLive(s, map, id), `${map} ${id}`).toBe(true);
    }
  });
});

describe('While it plays', () => {
  it('the Chicken-Town waft brings the Great Mellowing back, and Rancidella\'s redemption only fogs one room', async () => {
    const s = await fromPreset('p16_chicken_town');
    await playUntil(s, 'chicken_town.walk');
    expect(atmosphereId(s.content, s.session)).toBe('MELLOW_HAZE');
    await playUntil(s, 'sashback_rewards.save');
    expect(s.session.story.getValue('room_atmosphere_crew_quarters')).toBe('COFFIN_SOCK');
    expect(atmosphereId(s.content, s.session)).toBe('MELLOW_HAZE');
  }, 120000);

  it('a save in the middle of the rescue picks up at the door, and plays on to the end', async () => {
    const s = makeStory({ preset: 'p16_rescue' });
    const t = reloadStory(s);
    expect(t.session.quests.isObjectiveAvailable('vindictas_emergency', 'rescue')).toBe(true);
    t.pickLast = false;
    await playToEndP16(t);
    expect(t.session.story.getVar('agnes_returns', 0)).toBe(1);
  }, 180000);

  it('a save after the application keeps it filed, and the hearing picks up', async () => {
    const s = await fromPreset('p16_hearing');
    const t = reloadStory(s);
    expect(t.has('ignition_application_completed')).toBe(true);
    expect(t.session.inventory.count('ignition_application_copy')).toBe(1);
    await playToEndP16(t);
    expect(t.has('grand_ignition_hearing_approved')).toBe(true);
  }, 180000);

  for (const preset of ['p16_start', 'p16_fart_zone', 'p16_rescue', 'p16_dispensary', 'p16_sashback', 'p16_hornet_release', 'p16_stingbeard', 'p16_epidemic', 'p16_portable_tv', 'p16_lighter_pitch']) {
    it(`plays to the end from the ${preset} preset`, async () => {
      const s = await fromPreset(preset);
      if (preset === 'p16_start') await (await import('./phase16Play.js')).go(s, 'galley').then(() => s.talk('pete'));
      await playToEndP16(s);
      expect(s.stagingIssues.join('\n')).toBe('');
    }, 180000);
  }
});

describe('Story Phase 16 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase16', 'data/dialogue/phase16', 'data/npcs/phase16.json', 'data/npcs/phase16_crew.json', 'data/quests/phase16.json',
    'data/items/phase16.json', 'data/story/flags/phase16.json', 'data/story/triggers/phase16.json', 'data/maps/ship/phase16', 'data/logs/phase16.json',
    'data/props/phase16.json', 'data/story/bank/grand_counter.json', 'data/story/bank/customers_counter.json', 'data/story/proceedings',
    'data/story/fart_zone.json', 'data/story/beard.json', 'data/story/credit.json', 'data/story/novelty.json', 'data/hazards/hornets.json',
    'data/tv/programs/cheapo_ads.json', 'data/tv/programs/before_the_lighter.json', 'data/tv/ses_portable.json', 'data/characters/speakers_phase16.json',
    'data/appearances/phase16.json', 'src/debug/lighterDebug.js',
  ];
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)) : [p];
    return list.map((x) => fs.readFileSync(x, 'utf8'));
  }).join('\n');

  it('uses its own names (and none of the source\'s): GARRICK, the Sharkstorm, the Revenge', () => {
    for (const banned of [...BANNED_LIST, /nintendo/i, /\bnado\b/i, /guzzlegut/i, /must?ache/i]) expect(text).not.toMatch(banned);
    for (const name of ['Garrick', 'Brogath', 'Fart-Free Zone', 'Stenchmaster Fart Zone', 'Sharkstorm', 'Agnes the Second', 'Vindicta', 'Bankworth', 'Cheapy',
      'Cheap-O-Rama', 'Rancidella', 'Puffchester', 'BZBZBZBZZZZ-7', 'STINGBEARD', 'COFFIN SOCK', 'COMMON SENSE IS WINNING']) {
      expect(text, name).toContain(name);
    }
    expect(text).not.toMatch(/Garrick Grumbleguts|Garric\b/);
  });

  it('keeps it fictional and non-instructional: no growing, preparing, dosing, sourcing, wiring or home-made ignition', () => {
    for (const bad of [/\b(dosage|doses?|grams?|ounces?|bongs?|cultivat\w*|extraction|recipes?|temperatures?|wiring|voltage|butane|lighter fluid)\b/i,
      /\broll(s|ing|ed)?\b[^."]{0,24}\bjoints?\b/i, /\bjoints?\b[^."]{0,24}\broll(s|ing|ed)?\b/i, /\bhow to (make|build) (a )?(lighter|flame)/i]) {
      expect(text).not.toMatch(bad);
    }
  });

  it('invents nothing after the source: the storm unresolved, Brogath aboard, Garrick in office, Vindicta still coming back, no chapter 206', () => {
    const s = makeStory({ preset: 'p16_complete' });
    const scripts = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => /^p16/.test(id)).map(([, sc]) => sc));
    for (const f of ['great_sharkstorm_dealt_with', 'revenge_out_of_sharkstorm', 'brogath_dispersed', 'garrick_resigned', 'grand_bank_closed_for_good',
      'vindicta_served', 'vindicta_dissolved_for_good', 'p16_ch206_started', 'p17_started']) {
      expect(scripts).not.toMatch(new RegExp(`"setFlag":"${f}"`));
    }
    // Chapter 206 belongs to Story Phase 17; nothing in Phase 16 starts it.
    expect(s.content.game.chapters.filter((c) => /Chapter 206/.test(c.name)).every((c) => /^p17/.test(c.id))).toBe(true);
    expect(s.has('p17_started')).toBe(false);
    expect(s.has('brogath_permanent')).toBe(true);
    expect(s.has('garrick_regalia_restored')).toBe(true);
    expect(s.has('modern_visitors_aboard')).toBe(true);
  });

  it('Agnes is never hurt: every scene she\'s in, she\'s got out of', () => {
    expect(text).not.toMatch(/agnes[^."]{0,40}\b(dead|died|killed|cooked|roast(ed)?|toasted)\b/i);
  });
});
