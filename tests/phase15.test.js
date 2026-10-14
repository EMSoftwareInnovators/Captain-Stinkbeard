import path from 'node:path';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION } from '../src/config/constants.js';
import { stabilityDef, readStability, writePressure, addPressure, effectOf, triggerScale } from '../src/systems/stability.js';
import { ATMOSPHERE_STATES, atmosphereId, atmosphereOn, roomHaze, setAtmosphere } from '../src/systems/atmosphere.js';
import { TELLER_MODIFIERS, applyTellerModifiers, nextCustomer } from '../src/systems/bank.js';
import { bankDef } from '../src/systems/script/commands.js';
import { resolveSpeaker, resolveActorLook } from '../src/systems/story/aliases.js';
import { resolvePreset } from '../src/debug/presets.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { DEBUG_MELLOWING } from '../src/debug/mellowingDebug.js';
import { makeStory, reloadStory } from './storyHarness.js';

/**
 * Story Phase 15 (THE GREAT MELLOWING) systems: the Ship Atmosphere State,
 * Brogath's MELLOW, the one-time Economic Anger Waft conversion, the
 * Stenchmaster Channel's episodes, the hallucination layer, the Bashfulness
 * Branch (Teller Shift V2, the night queue, Gary, the loan), the ancient
 * crew (lore only), saves, and the F2 Mellow tab.
 */

const brogath = (content) => stabilityDef({ id: 'brogath', ...content.stability.get('brogath') });

describe('The Ship Atmosphere State', () => {
  it('has the authored states, NORMAL when unset, and only on the ship\'s maps', () => {
    const s = makeStory({ preset: 'p14_complete' });
    expect(ATMOSPHERE_STATES).toEqual(['NORMAL', 'ORDINARY_STENCH', 'BROGATH_SKUNK_HAZE', 'MELLOW_HAZE', 'BEARD_PARANOIA_HAZE', 'NOSE_FIRE_RESIDUE', 'BANK_FUMES', 'CLEARING']);
    const def = s.content.atmosphere.get('ship');
    expect(Object.keys(def.states).sort()).toEqual([...ATMOSPHERE_STATES].sort());
    expect(atmosphereId(s.content, s.session)).toBe('NORMAL');
    setAtmosphere(s.content, s.session, 'MELLOW_HAZE');
    expect(atmosphereOn(s.content, s.session, 'galley').id).toBe('MELLOW_HAZE');
    expect(atmosphereOn(s.content, s.session, 'galley').npcPace).toBeLessThan(1);
    expect(atmosphereOn(s.content, s.session, 'not_a_ship_map').id).toBe('NORMAL');
    expect(() => setAtmosphere(s.content, s.session, 'GAS_SIMULATION')).toThrow();
  });

  it('shows in a room over a fainter leftover haze, and gives way to a denser one', () => {
    const s = makeStory({ preset: 'p15_untold_stories' });
    const air = atmosphereOn(s.content, s.session, 'galley');
    expect(roomHaze('faint', air)).toEqual({ level: 'light', color: '#9cb860' });
    expect(roomHaze(null, air)).toEqual({ level: 'light', color: '#9cb860' });
    expect(roomHaze('dense', air)).toEqual({ level: 'dense', color: null });
    expect(roomHaze('faint', atmosphereOn(s.content, s.session, 'not_a_ship_map'))).toEqual({ level: 'faint', color: null });
  });

  it('the atmosphere command sets it and rewrites Brogath\'s state at once', async () => {
    const s = makeStory({ preset: 'p14_complete' });
    writePressure(brogath(s.content), s.session, 50);
    await s.run([{ atmosphere: 'MELLOW_HAZE' }]);
    expect(s.session.story.getValue('brogath_state')).toBe('MELLOW');
    await s.run([{ atmosphere: 'ORDINARY_STENCH' }]);
    expect(s.session.story.getValue('brogath_state')).not.toBe('MELLOW');
  });
});

describe('Channel episodes are watched', () => {
  it('every episode a Phase 15 scene plays has the watching view up first (and it comes down after)', () => {
    const dir = path.resolve('data/story/cutscenes/phase15');
    for (const f of fs.readdirSync(dir)) {
      const scripts = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const [id, body] of Object.entries(scripts)) {
        if (!Array.isArray(body)) continue;
        let up = false;
        for (const step of body) {
          if (step && typeof step === 'object' && typeof step.vista === 'string') up = true;
          if (step && typeof step === 'object' && step.vistaEnd) up = false;
          if (step && typeof step === 'object' && step.channelEpisode) expect(up, `${f} ${id}: ${step.channelEpisode} with no view up`).toBe(true);
        }
      }
    }
  });
});

describe('Brogath: MELLOW', () => {
  it('while the air is MELLOW_HAZE every rise counts for an eighth, and he reads as MELLOW', () => {
    const s = makeStory({ preset: 'p14_complete' });
    const def = brogath(s.content);
    const flutter = effectOf(def, 'trigger', 'flutter_big').pressure;
    writePressure(def, s.session, 10);
    setAtmosphere(s.content, s.session, 'MELLOW_HAZE');
    expect(triggerScale(def, s.session)).toBe(0.125);
    addPressure(def, s.session, flutter);
    expect(readStability(def, s.session).pressure).toBe(10 + Math.round(flutter * 0.125));
    expect(readStability(def, s.session).state).toBe('MELLOW');
    expect(readStability(def, s.session).mellow).toBe(true);
  });

  it('clearing the haze restores him: a flutter counts in full again', () => {
    const s = makeStory({ preset: 'p14_complete' });
    const def = brogath(s.content);
    writePressure(def, s.session, 10);
    setAtmosphere(s.content, s.session, 'MELLOW_HAZE');
    setAtmosphere(s.content, s.session, 'CLEARING');
    expect(triggerScale(def, s.session)).toBe(1);
    addPressure(def, s.session, effectOf(def, 'trigger', 'flutter_big').pressure);
    expect(readStability(def, s.session).pressure).toBe(10 + effectOf(def, 'trigger', 'flutter_big').pressure);
    expect(readStability(def, s.session).state).not.toBe('MELLOW');
  });

  it('wrath still wins over mellow', () => {
    const s = makeStory({ preset: 'p14_complete' });
    const def = brogath(s.content);
    setAtmosphere(s.content, s.session, 'MELLOW_HAZE');
    s.session.story.set(def.angerFlag);
    writePressure(def, s.session, 50);
    expect(readStability(def, s.session).state).toBe('ANGRY');
  });
});

describe('The Economic Anger Waft: twenty thousand tokens and the reserve, into Skunk Weed, exactly once', () => {
  async function converted() {
    const s = makeStory({ preset: 'p15_economic_recovery' });
    s.session.story.setVar('captain_emergency_reserve', 7);
    s.session.inventory.addGold(250); // gold the player earned elsewhere
    const gold = s.session.inventory.gold;
    expect(s.session.story.getVar('grand_currency_tokens')).toBe(20000);
    expect(s.session.inventory.count('grand_currency')).toBe(1);
    await s.run([{ convert: 'economic_anger_waft' }]);
    return { s, gold };
  }

  it('converts the tokens and the narrative reserve, never the purse', async () => {
    const { s, gold } = await converted();
    const st = s.session.story;
    expect(st.has('grand_currency_converted')).toBe(true);
    expect(st.getVar('grand_currency_tokens')).toBe(0);
    expect(st.getVar('grand_currency_converted_tokens')).toBe(20000);
    expect(st.getVar('captain_emergency_reserve')).toBe(0);
    expect(st.getVar('captain_reserve_converted')).toBe(7);
    expect(st.getVar('skunk_weed_lots')).toBe(40);
    expect(s.session.inventory.count('grand_currency')).toBe(0);
    expect(s.session.inventory.count('skunk_cargo_manifest')).toBe(1);
    expect(s.session.inventory.gold).toBe(gold);
  });

  it('runs once: again, or after a save and load, it does nothing (no doubling)', async () => {
    const { s } = await converted();
    s.session.story.setVar('grand_currency_tokens', 20000); // even if tokens somehow came back
    s.session.story.setVar('captain_emergency_reserve', 7);
    await s.run([{ convert: 'economic_anger_waft' }]);
    expect(s.session.story.getVar('skunk_weed_lots')).toBe(40);
    const t = reloadStory(s);
    await t.run([{ convert: 'economic_anger_waft' }]);
    expect(t.session.story.getVar('skunk_weed_lots')).toBe(40);
    expect(t.session.story.getVar('captain_reserve_converted')).toBe(7);
    expect(t.session.story.getVar('grand_currency_converted_tokens')).toBe(20000);
  });

  it('the converted currency is no longer Grand Currency anywhere: no item, no tokens, nothing to spend', async () => {
    const { s } = await converted();
    expect(s.session.inventory.count('grand_currency')).toBe(0);
    const def = s.content.conversions.get('economic_anger_waft');
    expect(JSON.stringify(def)).not.toMatch(/"gold"/);
    expect(s.content.items.get('skunk_cargo_manifest').value).toBe(0);
    expect(s.content.items.get('modern_cash').value).toBe(0);
  });
});

describe('The Stenchmaster Channel: episodes are data', () => {
  it('each episode names its frames, its breaks, its unlock and completion flags, and whether the set can be switched off', () => {
    const s = makeStory({ preset: 'p14_complete' });
    const prog = s.content.tvPrograms.get('stenchmaster_channel');
    const ids = ['age_of_fart_commerce', 'top_ten_flutters', 'goat_incident', 'wrath_of_brogath', 'chicken_incident', 'untold_stories'];
    for (const id of ids) {
      const ep = prog.episodes.find((e) => e.id === id);
      expect(ep, id).toBeTruthy();
      expect(ep.doneFlag, id).toBeTruthy();
      expect(ep.powerOff, id).toBe(false);
    }
    const aofc = prog.episodes.find((e) => e.id === 'age_of_fart_commerce');
    const ads = aofc.segments.filter((g) => g.commercial).map((g) => g.commercial);
    expect(ads.map((a) => a.episode)).toEqual(['short_one', 'short_two', 'slowmo', 'unsupported', 'mass_flutter']);
    // A different piece of nonsense each break.
    expect(new Set(ads.map((a) => a.reassure)).size).toBe(5);
    const calms = ads.map((a) => brogath(s.content).prompts[a.reassure].options.filter((o) => o.calm).map((o) => o.calm).join());
    expect(new Set(calms).size).toBe(5);
  });

  it('playing one runs its beats and breaks, then sets its completion flag', async () => {
    const s = makeStory({ preset: 'p15_chicken_incident' });
    await s.run([{ channelEpisode: 'chicken_incident', tv: 'ses_mk2' }]);
    expect(s.has('p15_agnes_watched')).toBe(true);
    expect(s.session.story.getValue('ses_mk2_state')).toBe('possessed');
  });

  it('the Mark II can be gutted, and switches itself back on (and both stay in the save)', async () => {
    const s = makeStory({ preset: 'p15_family' });
    expect(s.has('tv_destroyed_again')).toBe(true);
    expect(s.session.story.getValue('ses_mk2_state')).toBe('gutted');
    const t = reloadStory(s);
    expect(t.has('tv_destroyed_again')).toBe(true);
    await t.run('p15c7.begin');
    expect(t.has('tv_possessed_reactivation')).toBe(true);
    expect(t.session.story.getValue('ses_mk2_state')).toBe('possessed');
    expect(reloadStory(t).has('tv_possessed_reactivation')).toBe(true);
  });
});

describe('The hallucinations are a presentation layer', () => {
  it('names, portraits and looks change while the flag holds; the real ones come back when it clears', () => {
    for (const [flag, setName] of [['p15_skunk_vision', 'skunk_haze_vision'], ['p15_beard_paranoia', 'beard_paranoia']]) {
      const s = makeStory({ preset: 'p14_complete' });
      const real = resolveSpeaker(s.content, s.session, 'pete');
      s.session.story.set(flag);
      const seen = resolveSpeaker(s.content, s.session, 'pete');
      expect(seen.alias, setName).toBe(true);
      expect(seen.name).not.toBe(real.name);
      expect(seen.realName).toBe(real.name);
      expect(resolveActorLook(s.content, s.session, s.content.npcs.get('pete')).appearance).toBe('pete_brogath');
      s.session.story.clear(flag);
      expect(resolveSpeaker(s.content, s.session, 'pete').name).toBe(real.name);
      expect(resolveActorLook(s.content, s.session, s.content.npcs.get('pete')).appearance).not.toBe('pete_brogath');
    }
  });

  it('nobody can be fought: the phase starts no battle and puts no enemy anywhere', () => {
    const s = makeStory({ preset: 'p14_complete' });
    const scripts = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => /^p15/.test(id)).map(([, sc]) => sc));
    expect(scripts).not.toMatch(/"battle"/);
    for (const m of ['main_deck', 'galley', 'crew_quarters', 'captains_quarters', 'fart_free_zone', 'cargo_hold']) {
      const objs = s.content.maps.require(m).objects.filter((o) => o.type === 'enemy' && JSON.stringify(o.if ?? {}).includes('p15'));
      expect(objs, m).toEqual([]);
    }
  });
});

describe('Brogath\'s ancient crew: lore, and nobody comes back', () => {
  it('eight records, all reincarnationAllowed false, none of them an NPC anywhere', () => {
    const s = makeStory({ preset: 'p14_complete' });
    const crew = [...s.content.ancientCrew.map.entries()];
    expect(crew.map(([, m]) => m.displayName).sort()).toEqual(['Blind-Eye Margery', 'Captain-Sometimes Clem', 'Elsie Beanwright', 'Half-Mast Harold', 'Ledger Billiam', 'No-Nonsense Tilda', 'Old Jeb Rattleplank', 'Wobbly Ned'].sort());
    for (const [id, m] of crew) {
      expect(m.reincarnationAllowed, id).toBe(false);
      expect(s.content.npcs.get(id), id).toBeFalsy();
    }
  });
});

describe('The Bashfulness Branch (Teller Shift V2)', () => {
  it('extends the Grand Bank: same scale, its own queues, every customer\'s modifiers known', () => {
    const s = makeStory({ preset: 'p14_complete' });
    const branch = bankDef(s.content, 'bashfulness_branch');
    const gb = bankDef(s.content, 'grand_bank');
    expect(branch.scale).toEqual(gb.scale);
    expect(Object.keys(branch.queues)).toEqual(['night', 'relief', 'express']);
    expect(branch.queues.relief.customers).toContain('gary_relief');
    expect(s.content.bankCustomers.get('gary_relief').npc).toBe('gary'); // the same Gary
    for (const cid of branch.queues.relief.customers) {
      for (const m of s.content.bankCustomers.get(cid).modifiers ?? []) expect(TELLER_MODIFIERS, cid).toContain(m);
    }
  });

  it('modifiers reshape the same beats (no new controls)', () => {
    const beats = [{ take: true }, { hold: 3, band: [30, 70] }, { brace: 'BRACE!', ring: 1000, window: 170 }];
    const out = applyTellerModifiers(beats, ['forgets_title', 'whistle', 'shared', 'long_sash', 'desk_slides', 'tv_interrupt']);
    expect(out.every((b) => ['take', 'hold', 'wait', 'brace', 'puff'].some((k) => k in b))).toBe(true);
    expect(out.filter((b) => 'brace' in b).length).toBe(2); // "AND HIS BROTHER!"
    expect(out.find((b) => 'hold' in b).band[1] - out.find((b) => 'hold' in b).band[0]).toBeLessThan(40);
  });

  it('the night queue is served by the branch\'s own teller: no window, no ledger, the queue still moves', async () => {
    const s = makeStory({ preset: 'p15_bashfulness_branch' });
    const before = s.tellers.length;
    await s.run([{ bank: 'next', bankId: 'bashfulness_branch', queue: 'night', observe: true }]);
    expect(s.tellers.length).toBe(before);
    expect(s.session.story.getVar('branch_night_served')).toBe(1);
  });

  it('Gary is served once: after a save and load the queue has moved past him', async () => {
    const s = makeStory({ preset: 'p15_relief_gary' });
    const branch = bankDef(s.content, 'bashfulness_branch');
    expect(nextCustomer(branch, 'relief', s.session)).toBe('gary_relief');
    await s.run([{ bank: 'next', bankId: 'bashfulness_branch', queue: 'relief' }]);
    expect(s.tellers.at(-1)).toBe('gary_relief');
    const t = reloadStory(s);
    expect(nextCustomer(branch, 'relief', t.session)).toBe('thunderpants');
    // Serving him again by name (a stale script, a debug call) never moves the queue backwards or counts twice.
    await t.run([{ bankDeposit: 'gary_relief' }]);
    expect(t.session.story.getVar('branch_relief_served')).toBe(8);
  });

  it('exists only while its state says so, and is gone for good afterwards', () => {
    const s = makeStory({ preset: 'p15_complete' });
    const props = s.content.maps.require('crew_quarters').props.filter((p) => /^p15_branch_(open|flicker|closing|bell)$/.test(p.id));
    expect(props.length).toBe(4);
    for (const p of props) expect(evaluateCondition(p.if, s.session), p.id).toBe(false);
    expect(s.session.story.getValue('bashfulness_branch_state')).toBe('closed');
    expect(s.has('bashfulness_branch_closed_for_good')).toBe(true);
    const marks = s.content.maps.require('crew_quarters').props.find((p) => p.id === 'p15_branch_marks');
    expect(evaluateCondition(marks.if, s.session)).toBe(true);
    for (const st of ['forming', 'open', 'flickering', 'closing']) {
      s.session.story.setValue('bashfulness_branch_state', st);
      expect(props.some((p) => evaluateCondition(p.if, s.session)), st).toBe(true);
    }
  });
});

describe('Saves (version 15)', () => {
  it('the save version is 15, and a version 14 save migrates unchanged in layout', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(15);
    const s = makeStory({ preset: 'p14_complete' });
    const storage = new MemoryStorage();
    expect(new SaveManager({ storage, content: s.content, version: 14 }).save(1, s.session).ok).toBe(true);
    const read = new SaveManager({ storage, content: s.content }).read(1);
    expect(read.ok).toBe(true);
    const t = makeStory({ state: read.state });
    expect(t.session.story.allFlags().sort()).toEqual(s.session.story.allFlags().sort());
    expect(t.session.inventory.gold).toBe(s.session.inventory.gold);
    expect(atmosphereId(t.content, t.session)).toBe('NORMAL');
  });

  it('the phase\'s state is plain story state, and survives a save', () => {
    const s = makeStory({ preset: 'p15_complete' });
    const t = reloadStory(s);
    for (const v of ['skunk_weed_lots', 'captain_reserve_converted', 'grand_currency_converted_tokens', 'modern_cash', 'branch_relief_served', 'branch_night_served', 'teller_rating_x10', 'agnes_second_arrivals']) {
      expect(t.session.story.getVar(v), v).toBe(s.session.story.getVar(v));
    }
    for (const v of ['ship_atmosphere', 'bashfulness_branch_state', 'ses_mk2_state', 'ship_pantry']) expect(t.session.story.getValue(v), v).toBe(s.session.story.getValue(v));
    for (const f of ['grand_currency_converted', 'emergency_mellowing_policy', 'agnes_second_missing_in_sharkstorm', 'bashfulness_branch_closed_for_good', 'beard_experiment_banned',
      'ancient_crew_reincarnation_prevented', 'roaring_pillow_ejected', 'grand_nap_done', 'modern_visitors_aboard', 'great_mellowing', 'tv_possessed_reactivation']) {
      expect(t.has(f), f).toBe(true);
    }
  });
});

describe('Story Phase 15 debug tools', () => {
  it('every jump in the F2 Mellow tab is a preset, in story order, and the chain starts at the end of Phase 14', () => {
    const s = makeStory({ preset: 'p15_start' });
    const ids = DEBUG_MELLOWING.jumps.map(([, id]) => id);
    const presets = s.content.debugPresets.list().filter((p) => p.id.startsWith('p15_')).map((p) => p.id);
    expect(ids).toEqual(presets);
    expect(s.content.debugPresets.get('p15_start').after).toBe('p14_complete');
    expect(resolvePreset(s.content, 'p15_relief_farthelmew').vars.branch_relief_served).toBe(9);
  });

  it('every debug scene runs (from the end of the phase), and every episode is on the channel', async () => {
    for (const [label, steps] of DEBUG_MELLOWING.scenes) {
      if (typeof steps === 'string') continue;
      const s = makeStory({ preset: 'p15_complete' });
      await expect(s.run(steps), label).resolves.not.toThrow();
    }
    const s = makeStory({ preset: 'p15_complete' });
    const eps = s.content.tvPrograms.get('stenchmaster_channel').episodes.map((e) => e.id);
    for (const id of DEBUG_MELLOWING.episodes) expect(eps).toContain(id);
  });
});
