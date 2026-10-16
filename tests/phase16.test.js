import { describe, expect, it } from 'vitest';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION } from '../src/config/constants.js';
import { stabilityDef, readStability, addPressure, effectOf } from '../src/systems/stability.js';
import { atmosphereId, atmosphereOn, setAtmosphere, clearRoomAtmospheres } from '../src/systems/atmosphere.js';
import { fartZoneDef, readFartZone, enqueue, enter, setDoor, setPortholes, releaseProblems, release, ventilate, complete, FART_ZONE_STATES } from '../src/systems/fartZone.js';
import { beardDef, beardTags, addBeardTag, removeBeardTag, hasBeardTag } from '../src/systems/beard.js';
import { noveltyDef, attempt, peekOutcome } from '../src/systems/novelty.js';
import { proceedingDef, answerEffect, hearingPassed, pitchRound } from '../src/systems/proceedings.js';
import { creditDef, appraisalScore, creditClass, welcomeBonus, conversion } from '../src/systems/credit.js';
import { HORNET_STATES, hornetsOn, setHornets, hornetState } from '../src/systems/hazards/hornets.js';
import { resolvePreset } from '../src/debug/presets.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { DEBUG_LIGHTER } from '../src/debug/lighterDebug.js';
import { makeStory, reloadStory } from './storyHarness.js';

/**
 * Story Phase 16 (THE GRAND LIGHTER) systems: rooms with their own air, the
 * Stenchmaster Fart Zone (queue, procedure, each release exactly once), the
 * captain's beard (a contamination profile; the hornets' tag is the only
 * temporary one), the Grand Lighter (unreliable, deterministic), the
 * proceedings (the 97-page form, the hearing, the pitch: none can be lost for
 * good), Grand Sashback credit and the Grand Currency Converter (nothing
 * touches the purse, nothing doubles), the hornet swarm (a handful of sprites
 * per room, gone when they disperse), Brogath RECOVERING, saves (v16), and the
 * F2 Lighter tab.
 */

const brogath = (content) => stabilityDef({ id: 'brogath', ...content.stability.get('brogath') });

describe('Rooms with their own air', () => {
  it('a room can hold its own atmosphere over the ship\'s, and hand it back', async () => {
    const s = makeStory({ preset: 'p15_complete' });
    setAtmosphere(s.content, s.session, 'ORDINARY_STENCH');
    setAtmosphere(s.content, s.session, 'COFFIN_SOCK', { room: 'crew_quarters' });
    expect(atmosphereOn(s.content, s.session, 'crew_quarters').id).toBe('COFFIN_SOCK');
    expect(atmosphereOn(s.content, s.session, 'galley').id).toBe('ORDINARY_STENCH');
    await s.run([{ atmosphere: 'SHIP', room: 'crew_quarters' }]);
    expect(atmosphereOn(s.content, s.session, 'crew_quarters').id).toBe('ORDINARY_STENCH');
    setAtmosphere(s.content, s.session, 'COFFIN_SOCK', { room: 'galley' });
    clearRoomAtmospheres(s.content, s.session);
    expect(atmosphereOn(s.content, s.session, 'galley').id).toBe('ORDINARY_STENCH');
    expect(atmosphereId(s.content, s.session)).toBe('ORDINARY_STENCH');
  });
});

describe('The Stenchmaster Fart Zone', () => {
  it('has its own map under the cargo grating, separate from the Fart-Free Zone', () => {
    const s = makeStory({ preset: 'p16_fart_zone' });
    expect(s.content.maps.has('stenchmaster_fart_zone')).toBe(true);
    const deck = s.content.maps.require('main_deck');
    const warp = deck.objects.find((o) => o.id === 'p16_to_fz');
    expect(warp.to.map).toBe('stenchmaster_fart_zone');
    expect(evaluateCondition(warp.when, s.session)).toBe(false); // shut until the grating is opened
    s.session.story.set('p16_fz_found');
    expect(evaluateCondition(warp.when, s.session)).toBe(true);
    expect(fartZoneDef(s.content).map).not.toBe('fart_free_zone');
  });

  it('queues, follows the posted procedure, and processes each release exactly once', () => {
    const s = makeStory({ preset: 'p16_fart_zone' });
    const def = fartZoneDef(s.content);
    expect(FART_ZONE_STATES).toEqual(['IDLE', 'QUEUED', 'ENTERING', 'PREPARING', 'RELEASING', 'VENTILATING', 'COMPLETE']);
    enqueue(def, s.session, 'vindicta');
    expect(readFartZone(def, s.session).state).toBe('QUEUED');
    enter(def, s.session, 'vindicta');
    expect(readFartZone(def, s.session).occupant).toBe('vindicta');
    expect(releaseProblems(def, s.session)).toEqual(['door open', 'portholes shut']);
    setDoor(def, s.session, 'closed');
    setPortholes(def, s.session, 'open');
    expect(releaseProblems(def, s.session)).toEqual([]);
    const first = release(def, s.session, 'vindicta_legendary');
    expect(first.done).toBe(true);
    const damage = s.session.story.getVar('fz_damage', 0);
    expect(release(def, s.session, 'vindicta_legendary').done).toBe(false); // again: nothing
    expect(s.session.story.getVar('fz_damage', 0)).toBe(damage);
    ventilate(def, s.session);
    complete(def, s.session);
    expect(readFartZone(def, s.session).occupant).toBeFalsy();
  });

  it('the release command refuses to break the procedure, and its state survives a save', async () => {
    const s = makeStory({ preset: 'p16_fart_zone' });
    await s.run([{ fartZone: 'queue', who: 'brogath' }, { fartZone: 'enter', who: 'brogath' }]);
    await expect(s.run([{ fartZone: 'release', release: 'hornet_fart' }])).rejects.toThrow(/procedure/);
    await s.run([{ fartZone: 'door', value: 'closed' }, { fartZone: 'portholes', value: 'open' }, { fartZone: 'release', release: 'hornet_fart' }]);
    expect(atmosphereOn(s.content, s.session, 'stenchmaster_fart_zone').id).toBe('HORNET_SWARM_RESIDUE');
    const t = reloadStory(s);
    expect(t.has('fz_done_hornet_fart')).toBe(true);
    expect(t.session.story.getValue('fz_door')).toBe('closed');
    expect(t.session.story.getValue('fz_occupant')).toBe('brogath');
  });
});

describe('The captain\'s beard', () => {
  it('collects tags; they persist; only the hornets can be removed', async () => {
    const s = makeStory({ preset: 'p16_start' });
    const def = beardDef(s.content);
    for (const t of ['GARRICK_ORIGINAL', 'BROGATH_ANCIENT', 'GRAND_BANK_DEPOSITS', 'COFFIN_SOCK', 'VINDICTA_LEGENDARY', 'GRAND_LIGHTER_FUEL', 'CURRENCY_CONVERTER', 'HORNET_ATTRACTED']) {
      expect(def.tags[t], t).toBeTruthy();
    }
    addBeardTag(s.content, s.session, 'COFFIN_SOCK');
    addBeardTag(s.content, s.session, 'HORNET_ATTRACTED');
    expect(removeBeardTag(s.content, s.session, 'COFFIN_SOCK')).toBe(false); // permanent
    expect(hasBeardTag(s.content, s.session, 'COFFIN_SOCK')).toBe(true);
    removeBeardTag(s.content, s.session, 'HORNET_ATTRACTED');
    expect(hasBeardTag(s.content, s.session, 'HORNET_ATTRACTED')).toBe(false);
    const t = reloadStory(s);
    expect(hasBeardTag(t.content, t.session, 'COFFIN_SOCK')).toBe(true);
    expect(beardTags(t.content, t.session)).toContain('COFFIN_SOCK');
  });
});

describe('The Grand Lighter', () => {
  it('is unreliable but deterministic: a fixed sequence, a forced flame when a scene needs one, a saved count', () => {
    const s = makeStory({ preset: 'p16_grand_lighter' });
    const def = noveltyDef(s.content, 'grand_smokes');
    const seq = def.sequence;
    expect(seq.length).toBeGreaterThanOrEqual(8);
    expect(new Set(seq).size).toBeGreaterThan(3);
    expect(peekOutcome(def, s.session)).toBe(seq[s.session.story.getVar('lighter_clicks', 0) % seq.length]);
    const before = s.session.story.getVar('lighter_clicks', 0);
    const outs = attempt(def, s.session, 32, 'flame');
    expect(outs).toHaveLength(32);
    expect(outs[31]).toBe('flame');
    expect(s.session.story.getVar('lighter_clicks', 0)).toBe(before + 32);
    expect(s.content.items.require('grand_stenchmaster_lighter').type).toBe('key');
  });
});

describe('The proceedings', () => {
  it('the 97-page form asks the chicken question again until AGNES is filed', () => {
    const s = makeStory({ preset: 'p16_application' });
    const form = proceedingDef(s.content, 'ignition_application');
    expect(form.pages).toBe(97);
    const chickens = form.questions.find((q) => q.id === 'chickens');
    expect(chickens.required).toBe(true);
    const right = chickens.options.findIndex((o) => /DO NOT TOAST/.test(o.text));
    expect(answerEffect(chickens, right).again).toBe(false);
    expect(answerEffect(chickens, right).flag).toBe('p16_agnes_on_form');
    chickens.options.forEach((o, i) => { if (i !== right) expect(answerEffect(chickens, i).again).toBe(true); });
  });

  it('the hearing can be passed, and failing it twice still ends it (no softlock)', async () => {
    const s = makeStory({ preset: 'p16_hearing', pick: 'last' }); // the worst answers every time
    const h = proceedingDef(s.content, 'ignition_hearing');
    expect(hearingPassed(h, 9)).toBe(true);
    expect(hearingPassed(h, 3)).toBe(false);
    await s.run([{ proceeding: 'ignition_hearing' }]);
    expect(s.session.story.getVar('ignition_hearing_score', 0)).toBeLessThan(h.pass);
  });

  it('the pitch is always winnable: the checkpoint gives a longer clock every time', () => {
    const s = makeStory({ preset: 'p16_lighter_pitch' });
    const p = proceedingDef(s.content, 'lighter_pitch');
    const best = [...p.arguments].sort((a, b) => b.points - a.points);
    let c = 0;
    let pr = 0;
    let r = null;
    for (const a of best) {
      r = pitchRound(p, c, pr, a.points);
      c = r.convinced;
      pr = r.pressure;
      if (r.won || r.lost) break;
    }
    expect(r.won).toBe(true);
    expect(p.gauge.frames).toBeGreaterThan(p.max);
  });
});

describe('Grand Sashback and the converter: no money from nowhere', () => {
  it('scores are clamped, classes and bonuses follow, and bonuses are tokens, never gold', () => {
    const s = makeStory({ preset: 'p16_sashback' });
    const def = creditDef(s.content, 'sashback');
    expect(appraisalScore(def, [0, 0, 0], 9999)).toBe(def.max);
    expect(appraisalScore(def, [2, 2, 2], -9999)).toBe(def.min);
    expect(creditClass(def, def.max)).toMatch(/RAUNCHY/);
    expect(welcomeBonus(def, def.max)).toBeGreaterThan(welcomeBonus(def, def.min));
  });

  it('the converter takes only what it\'s given, never pays gold, and the policy caps it', async () => {
    const s = makeStory({ preset: 'p16_sashback' });
    const gold = s.session.inventory.gold;
    s.session.story.setVar('test_tokens', 5000);
    await s.run([{ currencyConverter: 'converter', from: 'test_tokens', amount: 1 }]);
    expect(s.session.story.getVar('test_tokens', 0)).toBe(4999);
    await s.run([{ currencyConverter: 'converter', from: 'test_tokens', amount: 'all' }]);
    expect(s.session.story.getVar('test_tokens', 0)).toBe(0);
    await s.run([{ currencyConverter: 'converter', from: 'test_tokens', amount: 'all' }]); // nothing left: nothing happens
    expect(s.session.story.getVar('test_tokens', 0)).toBe(0);
    expect(s.session.inventory.gold).toBe(gold);
    const def = creditDef(s.content, 'converter');
    s.session.story.set('converter_air_quality_policy');
    expect(conversion(def, s.session, 50000)).toMatchObject({ amount: 1000, capped: true });
  });

  it('the counter became a bank once: the dispensary\'s customers are served once, even across a save', async () => {
    const s = makeStory({ preset: 'p16_sash_lounge' });
    expect(s.has('grand_dispensary_opened')).toBe(true);
    expect(s.session.story.getVar('counter_disp_served', 0)).toBe(5);
    const till = s.session.story.getVar('counter_till', 0);
    const t = reloadStory(s);
    await t.run([{ bank: 'next', queue: 'dispensary', bankId: 'grand_counter' }]); // queue empty: nothing
    expect(t.session.story.getVar('counter_till', 0)).toBe(till);
  });
});

describe('The hornets', () => {
  it('a handful of sprites per room, never more than the pool; dispersing leaves; dormant shows none', () => {
    const s = makeStory({ preset: 'p16_stingbeard' });
    expect(HORNET_STATES).toHaveLength(8);
    const max = s.content.hazards.get('hornets').max;
    for (const st of HORNET_STATES) {
      setHornets(s.content, s.session, st);
      for (const m of ['main_deck', 'crew_quarters', 'cargo_hold', 'galley', 'stenchmaster_fart_zone']) {
        expect(hornetsOn(s.content, s.session, m).count).toBeLessThanOrEqual(max);
      }
    }
    setHornets(s.content, s.session, 'DISPERSING');
    expect(hornetsOn(s.content, s.session, 'main_deck').leave).toBe(true);
    setHornets(s.content, s.session, 'DORMANT');
    expect(hornetsOn(s.content, s.session, 'main_deck').count).toBe(0);
  });

  it('are gone by the end of the phase, and the nickname with them', () => {
    const s = makeStory({ preset: 'p16_complete' });
    expect(hornetState(s.content, s.session)).toBe('DORMANT');
    expect(s.has('nickname_stingbeard')).toBe(false);
    expect(s.has('beard_hornet_attracted')).toBe(false);
    expect(s.has('stingbeard_nickname_unlocked')).toBe(true);
  });
});

describe('Brogath: RECOVERING', () => {
  it('after a big release his rises count half, until a script lets him out; wrath still wins', () => {
    const s = makeStory({ preset: 'p16_coffin_sock' });
    const def = brogath(s.content);
    s.session.story.set(def.recoverFlag);
    const base = readStability(def, s.session).pressure;
    const rise = effectOf(def, 'trigger', 'flutter').pressure;
    addPressure(def, s.session, rise);
    expect(readStability(def, s.session).pressure - base).toBe(Math.round(rise / 2));
    expect(readStability(def, s.session).state).toBe('RECOVERING');
    s.session.story.clear(def.recoverFlag);
    expect(readStability(def, s.session).state).not.toBe('RECOVERING');
  });
});

describe('Two televisions', () => {
  it('the portable set is its own set (the Fart-Free Zone), distinct from the Mark II (the galley)', () => {
    const s = makeStory({ preset: 'p16_portable_tv' });
    const portable = s.content.tv.get('ses_portable');
    const mk2 = s.content.tv.get('ses_mk2');
    expect(portable).toBeTruthy();
    expect(portable.powerVar).not.toBe(mk2.powerVar);
    expect(portable.stateValue).not.toBe(mk2.stateValue);
    const zone = s.content.maps.require('fart_free_zone');
    expect(zone.props.some((p) => p.prop === 'portable_tv')).toBe(true);
  });
});

describe('The bunker', () => {
  it('is locked to the captain\'s beard only while the hornets are in it, and open again after', () => {
    const s = makeStory({ preset: 'p16_story_hour' });
    const lock = s.content.maps.require('cargo_hold').objects.find((o) => o.id === 'p16_bunker_door');
    expect(evaluateCondition(lock.when, s.session)).toBe(true);
    expect(evaluateCondition(lock.if, s.session)).toBe(false);
    const t = makeStory({ preset: 'p16_portable_tv' });
    expect(evaluateCondition(lock.when, t.session)).toBe(false);
  });
});

describe('Saves (version 16)', () => {
  it('the save version is 16, and a version 15 save migrates unchanged in layout', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(16);
    const s = makeStory({ preset: 'p15_complete' });
    const storage = new MemoryStorage();
    expect(new SaveManager({ storage, content: s.content, version: 15 }).save(1, s.session).ok).toBe(true);
    const read = new SaveManager({ storage, content: s.content }).read(1);
    expect(read.ok).toBe(true);
    const t = makeStory({ state: read.state });
    expect(t.session.story.allFlags().sort()).toEqual(s.session.story.allFlags().sort());
    expect(t.session.inventory.gold).toBe(s.session.inventory.gold);
    expect(t.has('agnes_second_missing_in_sharkstorm')).toBe(true); // Phase 15's ending is kept
  });

  it('the phase\'s state is plain story state, and survives a save', () => {
    const s = makeStory({ preset: 'p16_complete' });
    const t = reloadStory(s);
    for (const v of ['lighter_clicks', 'counter_till', 'converter_tokens_converted', 'sashback_tokens_issued', 'agnes_returns', 'fz_damage']) {
      expect(t.session.story.getVar(v, 0), v).toBe(s.session.story.getVar(v, 0));
    }
    for (const v of ['counter_department', 'fz_state', 'hornet_swarm', 'ship_atmosphere']) expect(t.session.story.getValue(v), v).toBe(s.session.story.getValue(v));
    for (const f of ['grand_lighter_working', 'stenchmaster_fart_zone_built', 'agnes_second_returned', 'bank_reconstituted', 'converter_air_quality_policy',
      'portable_stenchmaster_tv_acquired', 'ignition_application_completed', 'grand_ignition_hearing_approved', 'mechanical_ignition_victory', 'p16_complete',
      'beard_coffin_sock', 'beard_vindicta_legendary']) {
      expect(t.has(f), f).toBe(true);
    }
    expect(t.session.inventory.count('grand_stenchmaster_lighter')).toBe(1);
  });
});

describe('Story Phase 16 debug tools', () => {
  it('every jump in the F2 Lighter tab is a preset, in story order (24 of them), chained from the end of Phase 15', () => {
    const s = makeStory({ preset: 'p16_start' });
    const ids = DEBUG_LIGHTER.jumps.map(([, id]) => id);
    const presets = s.content.debugPresets.list().filter((p) => p.id.startsWith('p16_')).map((p) => p.id);
    expect(ids).toEqual(presets);
    expect(ids).toHaveLength(24);
    expect(s.content.debugPresets.get('p16_start').after).toBe('p15_complete');
    expect(resolvePreset(s.content, 'p16_complete').flags).toContain('p16_complete');
  });

  it('every debug scene runs (from the end of the phase)', async () => {
    for (const [label, steps] of DEBUG_LIGHTER.scenes) {
      if (typeof steps === 'string') continue;
      const s = makeStory({ preset: 'p16_complete' });
      s.session.story.setVar('test', 0);
      await expect(s.run(steps), label).resolves.not.toThrow();
    }
  });
});
