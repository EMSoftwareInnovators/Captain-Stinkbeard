import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { currentChapter } from '../src/systems/story/progress.js';
import { sharkstormNow } from '../src/systems/hazards/sharkstorm.js';
import { readStability } from '../src/systems/stability.js';
import { stabilitySubject } from '../src/systems/script/commands.js';
import { resolvePreset } from '../src/debug/presets.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { makeStory, reloadStory } from './storyHarness.js';
import { PHASE14_QUESTS, STEPS14, go, playPhase14, playToEndP14 } from './phase14Play.js';
import { BANNED_LIST } from './bannedNames.js';

/**
 * Story Phase 14, RETURN OF BROGATH (chapters 146-169), played headless from
 * the end of Phase 13: the treasure-room door opened a crack, the plume,
 * Brogath the Bashful in his own cardboard cut-out, the containment corner
 * and the Brogath Rules, the flutter incidents and the Apology Eruption,
 * Garrick back in office, two Grand Stenchmasters, the bean breakfast, the
 * Fart-Free Zone, the second treasure catastrophe, the Grand Economy of
 * Farts, the Grand Currency, oat security, television duty, the sash
 * commercial, the Anger Waft and the Grand Bank, the teller's shift, the
 * legends and Grandmother Gustilda, the branch concluding business, ten
 * minutes and forty-seven seconds, the Steel Brogath warning, and Mandatory
 * History Night. From every Phase 14 preset too, and across a save and load.
 */

async function playUntil(s, ref) {
  for (let n = 0; n < 400; n++) {
    const step = STEPS14.find(([r]) => {
      const [q, o] = r.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) throw new Error(`ran out of objectives before ${ref}`);
    if (step[0] === ref) return;
    await step[1](s);
  }
  throw new Error(`never reached ${ref}`);
}

async function startPhase14(pick = 'first') {
  const s = makeStory({ pick, preset: 'p13_complete' });
  s.pickLast = pick === 'last';
  await go(s, 'main_deck');
  await s.talk('pete');
  return s;
}

const propLive = (s, map, id) => {
  const p = s.content.maps.require(map).props.find((x) => x.id === id);
  if (!p) throw new Error(`no prop ${id} on ${map}`);
  return !p.if || evaluateCondition(p.if, s.session);
};
const objLive = (s, map, id) => {
  const o = s.content.maps.require(map).objects.find((x) => x.id === id);
  if (!o) throw new Error(`no object ${id} on ${map}`);
  return !o.if || evaluateCondition(o.if, s.session);
};
const stability = (s) => readStability(stabilitySubject(s.content, 'brogath'), s.session);
const BANK_PROPS = ['p14_bank_counter', 'p14_bank_bell', 'p14_bank_forms', 'p14_bank_rope', 'p14_bank_sign', 'p14_bank_vault'];

describe('Story Phase 14 can be played start to finish (headless)', () => {
  it('taking the first option at every choice', async () => {
    const { s, chapters } = await playPhase14('first');
    expect(chapters).toEqual(Array.from({ length: 24 }, (_, i) => `p14c${i + 1}`));
    const starts = ['p14_started', ...Array.from({ length: 23 }, (_, i) => `p14_ch${147 + i}_started`)];
    const at = starts.map((f) => s.flagAt[f]);
    expect(at.every((n) => n !== undefined), starts.filter((f) => s.flagAt[f] === undefined).join(' ')).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(currentChapter(s.content.game, s.session).id).toBe('phase14_end');
    for (const q of PHASE14_QUESTS) expect(s.quest(q), q).toBe('completed');
  });

  it('taking the last option at every choice (wrong answers to Brogath too, while he can take them); it converges', async () => {
    const { s } = await playPhase14('last');
    for (const q of PHASE14_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.has('brogath_permanent')).toBe(true);
  });
});

describe('Story Phase 14 staging', () => {
  it('nobody stands in a wall or a doorway, cuts off a door, or boxes the captain in (first options)', async () => {
    const { s } = await playPhase14('first');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
  it('the same, choosing the last option everywhere', async () => {
    const { s } = await playPhase14('last');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
});

describe('Story Phase 14 debug presets are real, finishable points in the story', () => {
  const presets = ['p14_start', 'p14_the_plume', 'p14_brogath_returns', 'p14_containment', 'p14_flutter_lessons', 'p14_apology_eruption',
    'p14_back_in_office', 'p14_two_stenchmasters', 'p14_bean_breakfast', 'p14_fart_free_zone', 'p14_getting_rid', 'p14_beyond_broke',
    'p14_grand_economy', 'p14_bad_money', 'p14_oat_security', 'p14_television_duty', 'p14_sash_commercial', 'p14_grand_bank', 'p14_teller_shift',
    'p14_gustilda', 'p14_branch_concludes', 'p14_catastrophe', 'p14_brogath_problem', 'p14_history_night', 'p14_complete'];
  it('there are twenty-five of them, chained from the end of Phase 13, one per chapter and the end', () => {
    const s = makeStory({ preset: 'p14_start' });
    const all = s.content.debugPresets.list().filter((p) => p.id.startsWith('p14_'));
    expect(all.map((p) => p.id)).toEqual(presets);
    expect(all[0].after).toBe('p13_complete');
    for (let i = 1; i < all.length; i++) expect(all[i].after, all[i].id).toBe(all[i - 1].id);
    for (let i = 1; i < all.length - 1; i++) expect(all[i].script, all[i].id).toBe(`p14c${i + 1}.begin`);
  });
  for (const id of presets) {
    it(`${id} plays through to the end of Phase 14`, async () => {
      const s = makeStory({ preset: id });
      s.pickLast = false;
      await s.enter(s.map, resolvePreset(s.content, id).script);
      if (!s.has('p14_started')) {
        await go(s, 'main_deck');
        await s.talk('pete');
      }
      await playToEndP14(s);
      for (const q of PHASE14_QUESTS) expect(s.quest(q), `${id}: ${q}`).toBe('completed');
      expect(s.stagingIssues.join('\n'), id).toBe('');
      expect(s.session.story.getVar('grand_currency_gold_paid'), id).toBe(10);
    });
  }
});

describe('Brogath comes back once, and stays', () => {
  it('one reincarnation, never two', async () => {
    const { s } = await playPhase14('first');
    expect(s.log.filter((l) => l.startsWith('-: Then it goes INTO him.')).length).toBe(1);
    expect(s.session.story.getValue('brogath_status')).toBe('reincarnated_cardboard');
    // Back to the quarters, the hold, the deck: nothing replays it.
    const before = s.log.length;
    for (const map of ['crew_quarters', 'cargo_hold', 'galley', 'main_deck', 'crew_quarters']) await go(s, map);
    expect(s.log.slice(before).join('\n')).not.toMatch(/Then it goes INTO him/);
  });

  it('he is permanent, and a save and load keeps him so (and keeps the Fart-Free Zone)', async () => {
    const { s } = await playPhase14('first');
    const t = reloadStory(s);
    for (const f of ['brogath_permanent', 'brogath_consultant', 'brogath_lives_here', 'fart_free_zone_established', 'fart_free_zone_reinforced', 'treasure_exclusion_posted']) {
      expect(t.has(f), f).toBe(true);
    }
    const door = t.content.maps.require('cargo_hold').objects.find((o) => o.id === 'p14_to_zone');
    expect(evaluateCondition(door.when, t.session)).toBe(true);
    expect(door.if === undefined || evaluateCondition(door.if, t.session)).toBe(true);
    await t.enter('fart_free_zone', null, { spawn: 'door' });
    expect(t.map).toBe('fart_free_zone');
  });

  it('he is never put in the hold, the treasure room or the Fart-Free Zone, and the captain never goes into the treasure room', async () => {
    const s = await startPhase14('first');
    const entered = [];
    s.bus.on('map:entered', ({ map }) => entered.push(map));
    const where = new Set();
    await playToEndP14(s, {
      onStep: (r, st) => {
        for (const m of ['cargo_hold', 'fart_free_zone', 'treasure_hold']) if (st.staging.placements(m).has('brogath')) where.add(m);
      },
    });
    expect([...where]).toEqual([]);
    expect(entered).not.toContain('treasure_hold');
    const hold = s.content.maps.require('cargo_hold');
    const door = hold.objects.find((o) => o.type === 'warp' && o.to?.map === 'treasure_hold' && (!o.when || evaluateCondition(o.when, s.session)));
    expect(evaluateCondition(door.if, s.session)).toBe(false);
    expect(s.has('treasure_room_sealed')).toBe(true);
    expect(propLive(s, 'cargo_hold', 'p14_exclusion_sign')).toBe(true);
  });
});

describe('The Grand Currency and the Grand Bank', () => {
  it('ten real doubloons leave the purse exactly once; twenty thousand tokens arrive, and they are not gold', async () => {
    const s = await startPhase14('first');
    const gold = s.session.inventory.gold;
    await playToEndP14(s);
    expect(s.session.inventory.gold).toBe(gold - 10);
    expect(s.session.story.getVar('grand_currency_gold_paid')).toBe(10);
    expect(s.session.story.getVar('grand_currency_tokens')).toBe(20000);
    expect(s.session.inventory.count('grand_currency')).toBe(1);
    expect(s.has('grand_currency_acquired')).toBe(true);
  });

  it('the bank is only there while it is open: after it concludes business, nothing of it is left on deck', async () => {
    const { s } = await playPhase14('first');
    expect(s.has('grand_bank_open')).toBe(false);
    expect(s.has('grand_bank_dissolved')).toBe(true);
    for (const id of BANK_PROPS) expect(propLive(s, 'main_deck', id), id).toBe(false);
    for (const id of ['p14_bank_bell', 'p14_vault_look', 'p14_forms', 'p14_bank_sign']) expect(objLive(s, 'main_deck', id), id).toBe(false);
    // The depositors went back into the haze.
    const deck = s.staging.placements('main_deck');
    for (const id of ['bank_gary', 'bank_gustilda', 'bank_windabella']) expect(deck.has(id), id).toBe(false);
    // What's left: a badge, an ornament (on Garrick), and some tokens in the scuppers.
    expect(s.session.inventory.count('teller_badge')).toBe(1);
    expect(s.has('garrick_wears_ornament')).toBe(true);
  });

  it('a save in the middle of the teller\'s shift loads with the bank still open and the queue where it was, and finishes', async () => {
    const s = await startPhase14('first');
    await playUntil(s, 'teller_shift.serve');
    await STEPS14.find(([r]) => r === 'teller_shift.serve')[1](s);
    await STEPS14.find(([r]) => r === 'teller_shift.serve')[1](s);
    const served = s.session.story.getVar('bank_served');
    expect(served).toBeGreaterThanOrEqual(2);
    const t = reloadStory(s);
    expect(t.has('grand_bank_open')).toBe(true);
    expect(t.session.story.getVar('bank_served')).toBe(served);
    for (const id of BANK_PROPS) expect(propLive(t, 'main_deck', id), id).toBe(true);
    await t.enter(t.map);
    await playToEndP14(t);
    expect(t.has('p14_complete')).toBe(true);
    expect(t.session.story.getVar('grand_currency_gold_paid')).toBe(10);
    expect(t.stagingIssues.join('\n')).toBe('');
  });
});

describe('Brogath Stability is put back after every catastrophe', () => {
  it('after the Anger Waft, the bank and the ten-minute catastrophe, he is calm, not angry, with no incident running', async () => {
    const s = await startPhase14('first');
    const after = {};
    await playToEndP14(s, {
      onStep: (r, st) => {
        if (['teller_shift.serve', 'brogath_problem.research'].includes(r) && !after[r]) after[r] = stability(st);
      },
    });
    for (const [r, st] of Object.entries(after)) expect(st, r).toMatchObject({ angry: false, incident: null });
    expect(after['brogath_problem.research'].pressure).toBeLessThan(15);
    expect(stability(s)).toMatchObject({ angry: false, incident: null, meter: null });
    expect(['PLEASED', 'CALM']).toContain(stability(s).state);
    expect(s.has('brogath_unloaded')).toBe(true);
  });
});

describe('The televisions never keep the captain', () => {
  it('every knob panel Phase 14 opens has a way to its end, and the sets can be looked at afterwards', async () => {
    const { s } = await playPhase14('first');
    expect(s.has('p14_unplug_tried')).toBe(true);
    expect(s.has('p14_ad_channel')).toBe(true);
    await go(s, 'galley');
    await s.inspect('p10_tv');
    expect(s.has('p14_complete')).toBe(true);
  });
});

describe('Story Phase 14 ends where the source does: he lives here now, and nothing after', () => {
  it('leaves the canonical end state', async () => {
    const { s } = await playPhase14('first');
    expect(s.has('p14_complete')).toBe(true);
    // Garrick's suspension is over; he has his sash back (by way of the fire tongs).
    expect(s.has('stenchmaster_suspension_over')).toBe(true);
    expect(s.has('stenchmaster_suspension_active')).toBe(false);
    expect(s.has('garrick_regalia_restored')).toBe(true);
    // Still inside the Great Sharkstorm; the Trials never held; no Steel Brogath.
    expect(sharkstormNow(s.content, s.session)).toMatchObject({ distance: 'inside' });
    expect(s.session.story.getValue('queen_annes_revenge_location')).toBe('inside_great_sharkstorm');
    expect(s.quest('inside_great_sharkstorm')).toBe('active');
    expect(s.quest('grand_waft_trials')).toBe('active');
    expect(s.has('steel_brogath_known')).toBe(true);
    expect(s.content.npcs.get('steel_brogath') ?? null).toBe(null);
    expect(s.session.story.getVar('brogath_rules')).toBe(21);
  });

  it('each big moment happens exactly once, in order', async () => {
    const { s } = await playPhase14('first');
    const all = s.log.join('\n');
    const once = (re) => expect(s.log.filter((l) => re.test(l)).length, String(re)).toBe(1);
    once(/^-: Then it goes INTO him\./);
    once(/^-: Your hand goes through the vault door\./);
    once(/^-: 10:47\.$/);
    once(/^captain: With a position\. An official one\. From today you are the ship's ANCIENT HISTORICAL CONSULTANT\.$/);
    once(/^-: He lives here now\.$/);
    const order = ['Then it goes INTO him.', 'The Grand Waft Trials!', 'a FART-FREE ZONE.', 'WHEN BROGATH CEASETH TO BE BASHFUL', 'Your hand goes through the vault door.',
      '10:47.', 'Steel Brogath.', 'ANCIENT HISTORICAL CONSULTANT', 'He lives here now.'];
    const at = order.map((t) => all.indexOf(t));
    expect(at.every((i) => i >= 0), JSON.stringify(at)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    // The pocket edition (Garrick's book, the Cheap-O-Rama one) is the codex.
    expect(all).toMatch(/^codex: /m);
  });

  it('a save from the end of Phase 13 (version 13) loads, migrates and starts Phase 14 with Pete', async () => {
    const storage = new MemoryStorage();
    const p13 = makeStory({ preset: 'p13_complete' });
    expect(new SaveManager({ storage, content: p13.content, version: 13 }).save(1, p13.session).ok).toBe(true);
    const read = new SaveManager({ storage, content: p13.content }).read(1);
    expect(read.ok).toBe(true);
    const s = makeStory({ state: read.state });
    expect(s.has('p13_complete')).toBe(true);
    expect(s.has('p14_started')).toBe(false);
    await go(s, 'main_deck');
    await s.talk('pete');
    expect(s.has('p14_started')).toBe(true);
    await playToEndP14(s);
    expect(s.has('p14_complete')).toBe(true);
  });

  it('keeps talking after the end without restarting anything', async () => {
    const { s } = await playPhase14('first');
    const before = s.log.length;
    for (const [map, ids] of [['galley', ['garrick', 'pete', 'bob', 'jim', 'ned', 'squawks', 'brogath']], ['crew_quarters', ['brogath']], ['main_deck', ['gristle']]]) {
      await go(s, map);
      for (const id of ids) if (s.staging.actors.has(id)) await s.talk(id);
    }
    expect(s.has('p14_complete')).toBe(true);
    expect(s.log.slice(before).join('\n')).not.toMatch(/CHAPTER 1[4-6][0-9]|Then it goes INTO him/);
  });
});

describe('Story Phase 14 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase14', 'data/dialogue/phase14', 'data/npcs/phase14_crew.json', 'data/npcs/phase14_brogath.json', 'data/npcs/phase14_bank.json',
    'data/quests/phase14.json', 'data/items/phase14.json', 'data/story/flags/phase14.json', 'data/story/triggers/phase14.json', 'data/maps/ship/phase14',
    'data/maps/ship/fart_free_zone.json', 'data/logs/phase14.json', 'data/logs/phase14_bank.json', 'data/props/phase14.json', 'data/story/bank',
    'data/story/stability', 'data/tv/programs/frog_tax_man.json', 'data/tv/programs/bbk_sash_ads.json', 'data/tv/programs/stenchmaster_channel.json',
    'data/debug/presets.json', 'src/debug/brogathDebug.js', 'docs/STORY_PHASE14.md',
  ];
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)) : [p];
    return list.map((x) => fs.readFileSync(x, 'utf8'));
  }).join('\n');

  it('uses its own names (and none of the source\'s)', () => {
    for (const banned of [...BANNED_LIST, /nintendo/i, /\bnado\b/i, /guzzlegut/i, /brograth/i]) expect(text).not.toMatch(banned);
    for (const name of ['Brogath the Bashful', 'Fart-Free Zone', 'Grand Bank', 'Grand Currency', 'Frog Tax Man', 'Stenchmaster Channel', 'Ancient Historical Consultant',
      'Great Sharkstorm', "Queen Anne's Revenge", 'Grandmother Gustilda']) {
      expect(text, name).toContain(name);
    }
  });

  it('invents nothing after the source: no Trials held, no Steel Brogath made, no storm escaped, no treasure room opened, Brogath not destroyed', () => {
    const s = makeStory({ preset: 'p14_complete' });
    const scripts = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => /^p14/.test(id)).map(([, sc]) => sc));
    for (const f of ['grand_waft_trials_held', 'steel_brogath_created', 'steel_brogath_exists', 'brogath_dispersed', 'brogath_destroyed', 'revenge_out_of_sharkstorm',
      'great_sharkstorm_dealt_with', 'treasure_room_opened', 'treasure_recovered']) {
      expect(scripts).not.toMatch(new RegExp(`"setFlag":"${f}"`));
    }
    expect(scripts).not.toMatch(/"clearFlag":"(treasure_room_sealed|brogath_permanent|brogath_reincarnated)"/);
    expect(scripts).not.toMatch(/"transition":"treasure_hold"/);
    expect(scripts).not.toMatch(/"setValue":"great_sharkstorm","value":"(destroyed|collapsed|gone|escaped)"/);
    expect(scripts).not.toMatch(/"complete":"(grand_waft_trials|inside_great_sharkstorm)"/);
    const chapters = s.content.game.chapters;
    const after = chapters.slice(chapters.findIndex((c) => c.id === 'phase14_end') + 1);
    for (const c of after) {
      expect(c.id).not.toMatch(/^p14/);
      expect(JSON.stringify(c.if)).toMatch(/"flag":"p1[5-9]_/);
    }
    const later = s.content.storyTriggers.list().filter((t) => JSON.stringify(t.if).includes('p14_complete') && !JSON.stringify(t.if).includes('notFlag'));
    expect(later).toEqual([]);
  });
});
