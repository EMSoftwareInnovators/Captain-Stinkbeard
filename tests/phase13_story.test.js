import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { currentChapter, resolveVariant } from '../src/systems/story/progress.js';
import { resolveSpeaker, resolveActorLook, actorAlias, aliasOverlay } from '../src/systems/story/aliases.js';
import { sharkstormNow } from '../src/systems/hazards/sharkstorm.js';
import { FumeField, Exposure, fumeConfig } from '../src/systems/hazards/fumes.js';
import { FUME_HAZARD_SCALE } from '../src/systems/settings/Settings.js';
import { programEpisode, programDef, tvDef } from '../src/systems/tv/tv.js';
import { resolvePreset } from '../src/debug/presets.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { makeStory, reloadStory } from './storyHarness.js';
import { PHASE13_QUESTS, STEPS13, STANDEES, STANDEE_SPOTS, playPhase13, playToEndP13 } from './phase13Play.js';
import { BANNED_LIST } from './bannedNames.js';

/**
 * Story Phase 13 (chapters 127-145), played headless from the end of Phase
 * 12: the finger loopholes, "Don't Throw My Sash in the Trash", the growling
 * bedding and the pillow the storm sends back, the condemned textiles nailed
 * into the linen locker, sash bedding, the Fan Mega-Pack and its cardboard
 * Ancient Stenchmasters (put where the player chooses), a second S.E.S.
 * wired to the first, the Stenchmaster Channel, Stench-O-Vision, the Brogath
 * special, the captain's rant, the beard, the delirium (the crew seen as the
 * legends), the deck orders, two Brogaths, the treasure room (sealed), and
 * the Brogath Command Crisis. From every Phase 13 preset too, and across a
 * save and load.
 */

async function playUntil(s, steps, ref) {
  for (let n = 0; n < 300; n++) {
    const step = steps.find(([r]) => {
      const [q, o] = r.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) throw new Error(`ran out of objectives before ${ref}`);
    if (step[0] === ref) return;
    await step[1](s);
  }
  throw new Error(`never reached ${ref}`);
}

async function startPhase13(pick = 'first') {
  const s = makeStory({ pick, preset: 'p12_complete' });
  s.pickLast = pick === 'last';
  await s.enter('galley');
  await s.talk('garrick');
  return s;
}

const quarters = (s) => s.content.maps.require('crew_quarters');
const propLive = (s, map, id) => {
  const p = s.content.maps.require(map).props.find((x) => x.id === id);
  if (!p) throw new Error(`no prop ${id} on ${map}`);
  return !p.if || evaluateCondition(p.if, s.session);
};

describe('Story Phase 13 can be played start to finish (headless)', () => {
  it('taking the first option at every choice', async () => {
    const { s, chapters } = await playPhase13('first');
    const starts = ['p13_started', ...Array.from({ length: 18 }, (_, i) => `p13_ch${128 + i}_started`)];
    const at = starts.map((f) => s.flagAt[f]);
    expect(at.every((n) => n !== undefined), starts.filter((f) => s.flagAt[f] === undefined).join(' ')).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(chapters[0]).toBe('p13c1');
    expect(chapters[chapters.length - 1]).toBe('p13c19');
    expect(currentChapter(s.content.game, s.session).id).toBe('phase13_end');
    for (const q of PHASE13_QUESTS) expect(s.quest(q), q).toBe('completed');
  });

  it('taking the last option at every choice (the standees in their other spots; it converges)', async () => {
    const { s } = await playPhase13('last');
    for (const q of PHASE13_QUESTS) expect(s.quest(q), q).toBe('completed');
  });
});

describe('Story Phase 13 staging', () => {
  it('nobody stands in a wall, on a bed that is not there, or boxes the captain in (first options)', async () => {
    const { s } = await playPhase13('first');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
  it('the same, choosing the last option everywhere', async () => {
    const { s } = await playPhase13('last');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
});

describe('Story Phase 13 debug presets are real, finishable points in the story', () => {
  const presets = ['p13_start', 'p13_sash_trash', 'p13_growling_bedding', 'p13_returned_pillow', 'p13_textile_closet', 'p13_sash_bedding', 'p13_megapack',
    'p13_cardboard_legends', 'p13_ses_build', 'p13_antenna', 'p13_channel', 'p13_stenchalina', 'p13_stench_o_vision', 'p13_brogath_programme',
    'p13_captain_rant', 'p13_beard_delirium', 'p13_ancient_stenchmasters', 'p13_disarm', 'p13_deck_delirium', 'p13_two_brogaths',
    'p13_treasure_brogath', 'p13_captain_brogath', 'p13_command_crisis', 'p13_complete'];
  it('there are twenty-four of them, chained from the end of Phase 12, with the brief\'s names', () => {
    const s = makeStory({ preset: 'p13_start' });
    const all = s.content.debugPresets.list().filter((p) => p.id.startsWith('p13_'));
    expect(all.map((p) => p.id)).toEqual(presets);
    expect(all.map((p) => p.name)).toEqual(['Phase 13 Start', 'Sash Trash Comedy', 'Growling Bedding', 'Returned Pillow', 'Textile Closet',
      'Sash Bedding', 'Mega-Pack', 'Cardboard Legends', 'Bedroom S.E.S. Build', 'Antenna Routing', 'Stenchmaster Channel', 'Stenchalina Programme',
      'Stench-O-Vision', 'Brogath Programme', 'Captain Rant', 'Beard Delirium', 'Ancient Stenchmasters', 'Disarm Stenchmasters', 'Deck Delirium',
      'Two Brogaths', 'Treasure-Room Brogath', 'Captain Brogath', 'Brogath Command Crisis', 'Phase 13 Complete']);
    expect(all[0].after).toBe('p12_complete');
    for (let i = 1; i < all.length; i++) expect(all[i].after, all[i].id).toBe(all[i - 1].id);
  });
  for (const id of presets) {
    it(`${id} plays through to the end of Phase 13`, async () => {
      const s = makeStory({ preset: id });
      s.pickLast = false;
      await s.enter(s.map, resolvePreset(s.content, id).script);
      if (!s.has('p13_started')) await s.talk('garrick');
      await playToEndP13(s);
      for (const q of PHASE13_QUESTS) expect(s.quest(q), `${id}: ${q}`).toBe('completed');
      expect(s.stagingIssues.join('\n'), id).toBe('');
    });
  }
});

describe('The quarters change for good, and keep the player\'s choices', () => {
  it('condemned bedding, nailed into the locker; sash bunks, a Mega-Pack, bunting, and the second set', async () => {
    const { s } = await playPhase13('first');
    for (const id of ['p13_locker_sealed', 'p13_grand_hammock_sash', 'p13_hammock_sash_a', 'p13_cot_sash_a', 'p13_megapack_open', 'p13_bunting_n', 'p13_merch_a', 'p13_kit_on']) {
      expect(propLive(s, 'crew_quarters', id), id).toBe(true);
    }
    for (const id of ['p13_hammock_grimy_a', 'p13_pile', 'p13_locker', 'p13_kit_box', 'p13_kit_vent']) expect(propLive(s, 'crew_quarters', id), id).toBe(false);
    expect(s.session.story.getValue('crew_quarters_state')).toBe('sash_bedding_merch');
    expect(s.session.story.getValue('textile_closet_state')).toBe('sealed_growls');
  });

  it('each cardboard legend stands where the player put it, and nowhere else', async () => {
    for (const pick of ['first', 'last']) {
      const { s } = await playPhase13(pick);
      for (const id of STANDEES) {
        const spot = s.session.story.getValue(`standee_${id}`);
        if (id === 'brogath') {
          // Brogath went up on deck (chapter 143): the quarters' spots are empty, the deck's is his.
          expect(spot).toBe('deck');
          expect(propLive(s, 'main_deck', 'decor_standee_brogath_deck')).toBe(true);
        } else {
          expect(spot, `${pick}: ${id}`).toBe(STANDEE_SPOTS[id][pick === 'first' ? 0 : 1]);
        }
        for (const other of STANDEE_SPOTS[id]) expect(propLive(s, 'crew_quarters', `decor_standee_${id}_${other}`), `${pick}: ${id} at ${other}`).toBe(other === spot);
      }
    }
  });

  it('the choices (and every change to the room) survive a save and load', async () => {
    const { s } = await playPhase13('last');
    const t = reloadStory(s);
    for (const p of quarters(s).props) {
      const live = (x) => !p.if || evaluateCondition(p.if, x.session);
      expect(live(t), p.id).toBe(live(s));
    }
  });
});

describe('Condemning the bedding: all six kinds can be found', () => {
  it('every bed is a place to judge, and the footlocker with the pillowcases in it shows one sticking out', async () => {
    const s = makeStory({ preset: 'p13_returned_pillow' });
    await s.enter(s.map, resolvePreset(s.content, 'p13_returned_pillow').script);
    const open = (ref) => s.session.quests.isObjectiveAvailable(...ref.split('.'));
    for (let n = 0; n < 20 && !open('condemn_bedding.judge'); n++) await STEPS13.find(([ref]) => open(ref))[1](s);
    expect(open('condemn_bedding.judge')).toBe(true);
    if (s.map !== 'crew_quarters') await s.enter('crew_quarters', null, { spawn: s.map === 'galley' ? 'north_door' : 'ladder' });
    const q = quarters(s);
    const live = (o) => !o.if || evaluateCondition(o.if, s.session);
    const covers = (o, x, y) => x >= o.x && x < o.x + (o.w ?? 1) && y >= o.y && y < o.y + (o.h ?? 1);
    const judges = q.objects.filter((o) => o.type === 'inspect' && o.id.startsWith('p13_judge_') && live(o));
    expect(new Set(judges.map((o) => o.script)).size).toBe(6);
    // Every grimy hammock and cot counts for something...
    const beds = q.props.filter((p) => live(p) && ['hammock_grimy', 'cot_grimy'].includes(p.prop));
    expect(beds).toHaveLength(7);
    for (const b of beds) expect(judges.some((o) => covers(o, b.x, b.y)), `${b.id} is a place to judge`).toBe(true);
    // ...and every place to judge has something on it to see: a bed, or the pillowcase hanging out of the footlocker.
    const seen = (o) => q.props.some((p) => live(p) && ['hammock_grimy', 'cot_grimy', 'footlocker_pillowcase'].includes(p.prop) && covers(o, p.x, p.y));
    for (const o of judges) expect(seen(o), `${o.id} has something to see`).toBe(true);
    const corner = q.props.find((p) => p.id === 'p13_pillowcase_corner');
    expect(judges.find((o) => o.id === 'p13_judge_pillowcases')).toMatchObject({ x: corner.x, y: corner.y });
    await s.inspect('p13_judge_pillowcases');
    expect(live(corner)).toBe(false);
    // The hammock cloth is on every port hammock; whichever is judged first, it counts once.
    await s.inspect('p13_judge_hammock_a');
    expect(['p13_judge_hammock', 'p13_judge_hammock_a', 'p13_judge_hammock_b'].map((id) => live(q.objects.find((o) => o.id === id)))).toEqual([false, false, false]);
    expect(s.session.quests.objState('condemn_bedding', 'judge').progress).toBe(2);
  });
});

describe('Two televisions, wired together; the Stenchmaster Channel; Stench-O-Vision', () => {
  it('the bedroom set gets one channel, two programmes, in order', async () => {
    const s = makeStory({ preset: 'p13_stenchalina' });
    const prog = programDef(s.content, 'stenchmaster_channel');
    expect(programEpisode(prog, s.session, null).id).toBe('stenchalina_disaster');
    const later = makeStory({ preset: 'p13_brogath_programme' });
    await later.enter(later.map, 'p13c11.begin');
    expect(programEpisode(prog, later.session, null).id).toBe('brogath_special');
    const { s: end } = await playPhase13('first');
    for (const f of ['second_ses_built', 'tv_systems_connected', 'stenchmaster_channel_unlocked', 'stenchalina_programme_seen', 'brogath_programme_seen']) {
      expect(end.has(f), f).toBe(true);
    }
    expect(end.session.story.getValue('ses_kit_state')).toBe('working');
  });

  it('Stench-O-Vision is a small, mild source in the existing fume system, and respects the Fume Hazard setting', async () => {
    const s = makeStory({ preset: 'p13_stench_o_vision' });
    await s.enter(s.map, 'p13c10.begin');
    expect(s.has('stench_o_vision_on')).toBe(true);
    const cfg = fumeConfig(s.content);
    const field = new FumeField(quarters(s).fumes, cfg);
    field.refresh(s.session, 0, { immediate: true });
    const [vx, vy] = tvDef(s.content, 'ses_kit').vent.tiles.crew_quarters;
    const zone = field.zoneAt(vx, vy);
    expect(zone).toMatchObject({ id: 'p13_stench_o_vision', level: 'dense', severity: 0.35 });
    // Mild: a third of a dense zone's build-up at Normal, half that at Gentle, none at Off.
    const tenSeconds = (scale) => new Exposure(cfg).update(10000, field.levelAt(vx, vy), scale).value;
    const full = tenSeconds(1);
    const normal = tenSeconds(FUME_HAZARD_SCALE.normal * field.severityAt(vx, vy));
    const gentle = tenSeconds(FUME_HAZARD_SCALE.gentle * field.severityAt(vx, vy));
    const off = tenSeconds(FUME_HAZARD_SCALE.off * field.severityAt(vx, vy));
    expect(normal).toBeGreaterThan(0);
    expect(normal).toBeLessThan(full * 0.4);
    expect(gentle).toBeCloseTo(normal / 2, 5);
    expect(off).toBe(0);
    expect(normal).toBeLessThan(cfg.warnAt);
    // With the hazard Off the vent still puffs and the cloud is still there to see; it just never builds up.
    expect(evaluateCondition(tvDef(s.content, 'ses_kit').vent.if, s.session)).toBe(true);
    expect(propLive(s, 'crew_quarters', 'p13_kit_vent')).toBe(true);
    // The programme's smelly beats: the set has to be on and its vent open.
    const ep = programEpisode(programDef(s.content, 'stenchmaster_channel'), s.session, 'stenchalina_disaster');
    expect(ep.beats.some((b) => b.aroma)).toBe(true);
  });

  it('the knobs shut it off; the fumes go with it', async () => {
    const s = makeStory({ preset: 'p13_stench_o_vision' });
    await s.enter(s.map, 'p13c10.begin');
    await s.inspect('p13_vent_knobs');
    expect(s.tvs).toContain('ses_kit:knobs:vent');
    expect(s.has('stench_o_vision_disabled')).toBe(true);
    expect(s.session.story.getValue('stench_o_vision')).toBe('off');
    const field = new FumeField(quarters(s).fumes, fumeConfig(s.content));
    field.refresh(s.session, 0, { immediate: true });
    expect(field.zoneAt(10, 6)?.id ?? null).not.toBe('p13_stench_o_vision');
    expect(evaluateCondition(tvDef(s.content, 'ses_kit').vent.if, s.session)).toBe(false);
  });
});

describe('The delirium is a way of seeing, not a change to anybody', () => {
  const LEGENDS = { pete: 'BROGATH (?)', gristle: 'RUMPOLD (?)', bob: 'SIR RUMPUS (?)', jim: 'LORD GUSTAVIO (?)', squawks: 'PRINCESS STENCHALINA (?)', garrick: 'THE GRAND STENCHMASTER PRIME (?)' };

  it('before the beard, everybody is themselves', () => {
    const s = makeStory({ preset: 'p13_beard_delirium' });
    for (const id of Object.keys(LEGENDS)) expect(actorAlias(s.content, s.session, id), id).toBe(null);
    expect(aliasOverlay(s.content, s.session)).toBe(null);
  });

  it('after it, the dialogue box and the world show the legends; the real names flicker through', () => {
    const s = makeStory({ preset: 'p13_ancient_stenchmasters' });
    expect(s.has('stinkbeard_delirium')).toBe(true);
    for (const [id, name] of Object.entries(LEGENDS)) {
      const sp = resolveSpeaker(s.content, s.session, id);
      expect(sp, id).toMatchObject({ name, alias: true, flicker: true });
    }
    expect(resolveSpeaker(s.content, s.session, 'pete').realName).toBe('Peg-Leg Pete');
    // Garrick is still suspended underneath: plain Garrick.
    expect(resolveSpeaker(s.content, s.session, 'garrick').realName).toBe('Garrick');
    expect(resolveActorLook(s.content, s.session, s.content.npcs.require('pete')).appearance).toBe('pete_brogath');
    expect(resolveVariant(s.content.npcs.require('pete'), s.session).appearance).not.toBe('pete_brogath');
    expect(aliasOverlay(s.content, s.session)).toMatchObject({ tint: expect.any(String) });
  });

  it('nothing stores it: ids, quests and saves stay the crew\'s, and a reload sees what the flags say', async () => {
    const s = await startPhase13('first');
    await playUntil(s, STEPS13, 'ancient_stenchmasters.rumpold');
    // The objective that "meets Brogath" was talking to Pete (the scene he starts counts it).
    expect(s.content.quests.require('ancient_stenchmasters').objectives.find((o) => o.id === 'brogath').target).toBe('p13_met_pete');
    expect(JSON.stringify(s.content.npcs.require('pete'))).toMatch(/p13c14\.pete/);
    expect(s.session.quests.isObjectiveDone('ancient_stenchmasters', 'brogath')).toBe(true);
    const t = reloadStory(s);
    expect(JSON.stringify(t.record)).not.toMatch(/BROGATH \(\?\)|RUMPOLD \(\?\)|STENCHMASTER PRIME/);
    expect(resolveSpeaker(t.content, t.session, 'pete').name).toBe('BROGATH (?)');
    await t.enter(t.map);
    await playToEndP13(t);
    expect(t.has('p13_complete')).toBe(true);
  });

  it('the log keeps the real speakers; Squawks is a BIRD; Brogath is never confirmed', async () => {
    const { s } = await playPhase13('first');
    const all = s.log.join('\n');
    expect(all).not.toMatch(/^(brogath|rumpold|rumpus|gustavio|stenchalina|prime)(\[[a-z]+\])?: /m);
    expect(all).toMatch(/^squawks: BIRD\.$/m);
    expect(all).toMatch(/^pete: ONE\. BROGATH\. And he's CARDBOARD\.$/m);
    expect(s.session.story.getValue('brogath_status')).toBe('alleged_still_none');
    expect(s.has('brogath_verified')).toBe(false);
    // Still seeing them at the end: the captain hasn't recovered.
    expect(s.has('stinkbeard_delirium')).toBe(true);
    expect(s.session.story.getValue('stinkbeard_state')).toBe('ancient_stenchmaster_delirium');
  });
});

describe('The treasure room stays sealed, and the storm stays where it is', () => {
  it('the crew (and Pete, playing along) keep the captain out; the door never opens', async () => {
    const s = await startPhase13('first');
    const entered = [];
    s.bus.on('map:entered', ({ map }) => entered.push(map));
    await playToEndP13(s);
    expect(entered).not.toContain('treasure_hold');
    expect(s.session.story.getValue('treasure_room_state')).toBe('sealed_brogath_alleged');
    const hold = s.content.maps.require('cargo_hold');
    const door = hold.objects.find((o) => o.type === 'warp' && o.to?.map === 'treasure_hold' && (!o.when || evaluateCondition(o.when, s.session)));
    expect(door.id).toBe('p13_treasure_sealed');
    expect(evaluateCondition(door.if, s.session)).toBe(false);
    s.session.inventory.add('treasure_key');
    expect(evaluateCondition(door.if, s.session)).toBe(false);
    expect(propLive(s, 'cargo_hold', 'p13_treasure_signs')).toBe(true);
    expect(s.log.join('\n')).toMatch(/^pete: Nobody opens the door\. EVER\.$/m);
  });

  it('nothing in any of the three phases opens it or clears the seal', () => {
    const s = makeStory({ preset: 'p13_complete' });
    const scripts = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => /^p1[123]/.test(id)).map(([, sc]) => sc));
    expect(scripts).not.toMatch(/"clearFlag":"treasure_room_sealed"/);
    expect(scripts).not.toMatch(/"transition":"treasure_hold"/);
    expect(scripts).not.toMatch(/"setValue":"treasure_room_state","value":"(open|opened|cleared)/);
  });

  it('the Great Sharkstorm is still active, with the Revenge inside it', async () => {
    const { s } = await playPhase13('first');
    expect(sharkstormNow(s.content, s.session)).toMatchObject({ id: 'command_crisis', distance: 'inside' });
    expect(s.session.story.getValue('queen_annes_revenge_location')).toBe('inside_great_sharkstorm');
    expect(s.quest('inside_great_sharkstorm')).toBe('active');
  });
});

describe('Story Phase 13 ends where the brief says: the Brogath Command Crisis, and nothing after', () => {
  it('leaves the canonical end state', async () => {
    const { s } = await playPhase13('first');
    expect(s.has('p13_complete')).toBe(true);
    expect(s.has('brogath_command_crisis')).toBe(true);
    // Garrick: still suspended (about nine hours to go), still Garrick underneath.
    expect(s.has('stenchmaster_suspension_active')).toBe(true);
    expect(s.session.story.getVar('suspension_hours_left')).toBe(9);
    expect(s.session.story.getValue('garrick_title_state')).toBe('suspended');
    expect(resolveSpeaker(s.content, s.session, 'garrick').realName).toBe('Garrick');
    // The sash: never thrown in the trash, still in the captain's wardrobe.
    expect(s.session.story.getValue('stenchmaster_sash_custody')).toBe('captains_wardrobe');
    expect(s.session.inventory.count('stenchmaster_sash')).toBe(0);
    // The suspension never ends inside Phase 13.
    expect(s.has('stenchmaster_suspension_over')).toBe(false);
  });

  it('each big moment happens exactly once, in order', async () => {
    const { s } = await playPhase13('first');
    const all = s.log.join('\n');
    const once = (re) => expect(s.log.filter((l) => re.test(l)).length, String(re)).toBe(1);
    once(/^bling_king_tv: Thank you! 'Don't Throw My Sash in the Trash\.' Available now on wax cylinder\. From Cheap-O-Rama\.$/);
    once(/^pete: \(very quietly\) Did the room just GROWL\?$/);
    once(/^captain: BROGATH THE BASHFUL\.$/);
    once(/^captain: TWO BROGATHS\.$/);
    once(/^captain: THE THIRD BROGATH\.$/);
    once(/^captain: But Pete is still Brogath\.$/);
    const order = ["Don't Throw My Sash in the Trash.'", 'Did the room just GROWL?', 'IMMERSIVE.', 'BROGATH THE BASHFUL.', 'squawks: BIRD.', 'TWO BROGATHS.', 'Nobody opens the door. EVER.', 'THE THIRD BROGATH.', 'But Pete is still Brogath.'];
    const at = order.map((t) => all.indexOf(t));
    expect(at.every((i) => i >= 0), JSON.stringify(at)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('a save from the end of Phase 12 (version 12) loads, migrates and is told where Phase 13 starts', async () => {
    const storage = new MemoryStorage();
    const p12 = makeStory({ preset: 'p12_complete' });
    expect(new SaveManager({ storage, content: p12.content, version: 12 }).save(1, p12.session).ok).toBe(true);
    const read = new SaveManager({ storage, content: p12.content }).read(1);
    expect(read.ok).toBe(true);
    const s = makeStory({ state: read.state });
    expect(s.has('stenchmaster_suspension_active')).toBe(true);
    await s.enter('galley');
    expect(s.has('p13_ready_hint')).toBe(true);
    expect(s.has('p13_started')).toBe(false);
    await s.talk('garrick');
    expect(s.has('p13_started')).toBe(true);
  });

  it('keeps talking after the end without restarting anything', async () => {
    const { s } = await playPhase13('first');
    const before = s.log.length;
    for (const id of ['pete', 'bob', 'gristle', 'jim', 'ned', 'garrick', 'squawks']) await s.talk(id);
    expect(s.has('p13_complete')).toBe(true);
    expect(s.log.slice(before).join('\n')).not.toMatch(/THE THIRD BROGATH|CHAPTER 14[0-9]/);
  });
});

describe('Story Phase 13 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase13', 'data/dialogue/phase13', 'data/npcs/phase13_crew.json', 'data/quests/phase13.json', 'data/items/phase13.json',
    'data/story/flags/phase13.json', 'data/story/triggers/phase13.json', 'data/maps/ship/phase13', 'data/story/vistas/phase13.json',
    'data/logs/phase13.json', 'data/props/phase13.json', 'data/story/aliases/phase13.json', 'data/characters/speakers_phase13.json',
    'data/tv/ses_kit.json', 'data/tv/programs/stenchmaster_channel.json',
  ];
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)) : [p];
    return list.map((x) => fs.readFileSync(x, 'utf8'));
  }).join('\n');

  it('uses its own names (and none of the source\'s)', () => {
    for (const banned of [...BANNED_LIST, /nintendo/i, /\bwa+h+\b/i, /\bnado\b/i, /indiana/i, /fedora/i, /brograth/i]) expect(text).not.toMatch(banned);
    for (const name of ['Princess Stenchalina', 'Rumpold', 'Sir Rumpus', 'Lord Gustavio', 'Stench-O-Vision', 'Fan Mega-Pack', 'Great Sharkstorm']) {
      expect(text, name).toContain(name);
    }
  });

  it('the Bling Bling King never says a word in person; only on television', () => {
    const s = makeStory({ preset: 'p13_complete' });
    const scripts = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => /^p13/.test(id)).map(([, sc]) => sc));
    expect(scripts).not.toMatch(/"(bling_bling_king|megalodon|bbk)(\[[a-z]+\])?: /);
    expect(s.content.npcs.get('bling_bling_king') ?? null).toBe(null);
  });

  it('invents nothing after the source: no escape, no recovered crown, no debate, no Phase 14', () => {
    const s = makeStory({ preset: 'p13_complete' });
    const scripts = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => /^p1[123]/.test(id)).map(([, sc]) => sc));
    for (const f of ['revenge_out_of_sharkstorm', 'bling_bling_king_dealt_with', 'crimson_crown_recovered', 'brogath_verified', 'great_sharkstorm_dealt_with',
      'stenchmaster_suspension_over', 'brogath_debate_held', 'stinkbeard_delirium_cured']) {
      expect(scripts).not.toMatch(new RegExp(`"(setFlag)":"${f}"`));
    }
    expect(scripts).not.toMatch(/"setValue":"great_sharkstorm","value":"(destroyed|collapsed|gone|escaped)"/);
    expect(scripts).not.toMatch(/"clearFlag":"stinkbeard_delirium"/);
    // The debate is only ever announced (a token), never held.
    expect(scripts).not.toMatch(/p13c20|CHAPTER 146/);
    // Nothing of Phase 13's own comes after its end; any later chapter is a later phase's, behind its own flags.
    const chapters = s.content.game.chapters;
    const after = chapters.slice(chapters.findIndex((c) => c.id === 'phase13_end') + 1);
    for (const c of after) {
      expect(c.id).not.toMatch(/^p13/);
      expect(JSON.stringify(c.if)).toMatch(/"flag":"p1[4-9]_/);
    }
    const later = s.content.storyTriggers.list().filter((t) => JSON.stringify(t.if).includes('p13_complete') && !JSON.stringify(t.if).includes('notFlag'));
    expect(later).toEqual([]);
  });
});
