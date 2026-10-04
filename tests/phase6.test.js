import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/content/loadContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { migrateState } from '../src/systems/save/migrations.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION } from '../src/config/constants.js';
import { currentChapter } from '../src/systems/story/progress.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { tvDef, tvState, tvCondition, setTvCondition, setPower, availableChannels, programDef, programEpisode } from '../src/systems/tv/tv.js';
import { sharkstormStates, sharkstormNow, setSharkstormState, sharkstormIs } from '../src/systems/hazards/sharkstorm.js';
import { deadCenterLocations, deadCenterProfile, setDeadCenterLocation } from '../src/systems/hazards/deadCenter.js';
import { dutyData } from '../src/systems/hazards/sharkDuty.js';
import { compileMap } from '../src/maps/compileMap.js';
import { placementChoices } from '../src/world/placements.js';

const content = loadContent();
const freshSession = () => GameSession.newGame({ content, bus: new EventBus() });
const atPreset = (id) => {
  const s = freshSession();
  applyPresetPlan(s, resolvePreset(content, id));
  return s;
};
const compiled = (id) => {
  const def = content.maps.require(id);
  return compileMap(def, content.tilesets.get(def.tileset), content.props);
};

describe('the Great Sharkstorm (a saved state, not a weather simulation)', () => {
  it('has the five states the brief asks for, and starts not created', () => {
    // Phase 6's five, in order (Story Phase 7 adds returning and active_near_ship after them).
    expect(Object.keys(sharkstormStates(content)).slice(0, 5)).toEqual(['not_created', 'forming', 'attacking_ship', 'dispersed_near_ship', 'active_distant']);
    const s = freshSession();
    expect(sharkstormNow(content, s).id).toBe('not_created');
    expect(evaluateCondition({ sharkstorm: 'not_created' }, s)).toBe(true);
  });

  it('moves between states and records how far away it is', () => {
    const s = freshSession();
    setSharkstormState(content, s, 'attacking_ship');
    expect(s.story.getValue('great_sharkstorm')).toBe('attacking_ship');
    expect(s.story.getValue('great_sharkstorm_distance')).toBe('near');
    expect(sharkstormNow(content, s).flying.impactEvery).toBeTruthy();
    setSharkstormState(content, s, 'active_distant');
    expect(sharkstormNow(content, s)).toMatchObject({ id: 'active_distant', distance: 'distant', rumble: { sfx: 'storm_distant' } });
    expect(sharkstormIs(content, s, ['forming', 'active_distant'])).toBe(true);
    expect(evaluateCondition({ sharkstorm: ['attacking_ship'] }, s)).toBe(false);
    expect(() => setSharkstormState(content, s, 'destroyed')).toThrow(/no state/);
  });

  it('only throws sharks at the deck while it is attacking, always with a warning', () => {
    for (const [id, st] of Object.entries(sharkstormStates(content))) {
      if (st.flying?.impactEvery) {
        // Story Phase 9's landings are on named maps only (the reef channel, the island), never the deck.
        if (id !== 'attacking_ship') {
          expect(Object.keys(st.flying.areas ?? {}), id).not.toContain('main_deck');
          expect(Object.keys(st.flying.areas ?? {}).length, id).toBeGreaterThan(0);
        }
        expect(st.flying.warnMs).toBeGreaterThanOrEqual(1200);
      }
    }
  });

  it('ends Phase 6 far off and still active (never destroyed)', () => {
    const s = atPreset('p6_complete');
    expect(sharkstormNow(content, s).id).toBe('active_distant');
    expect(s.story.has('great_sharkstorm_active')).toBe(true);
  });
});

describe('the S.E.S. in Phase 6', () => {
  const ses = tvDef(content, 'ses');

  it('is working, then apparently dead, then shark-damaged, from one saved value', () => {
    const s = atPreset('p5_complete');
    expect(tvCondition(ses, s).id).toBe('working');
    setPower(ses, s, true);
    setTvCondition(ses, s, 'apparently_dead');
    expect(s.story.getValue('ses_state')).toBe('apparently_dead');
    expect(tvState(ses, s)).toMatchObject({ power: false, dead: true });
    expect(setPower(ses, s, true)).toBeFalsy();
    expect(tvState(ses, s).power).toBe(false);
    setTvCondition(ses, s, 'shark_damaged');
    expect(tvCondition(ses, s)).toMatchObject({ bezel: 'ses_bezel_wrecked', glass: 'tv_cracked', dead: true });
  });

  it('carries The Frog Tax Man as data on a seventh channel, once unlocked', () => {
    const s = atPreset('p5_complete');
    expect(availableChannels(ses, s).map((c) => c.id)).not.toContain(7);
    s.story.set('frog_tax_man_unlocked');
    const ch = availableChannels(ses, s).find((c) => c.id === 7);
    expect(ch).toMatchObject({ title: 'The Frog Tax Man', program: 'frog_tax_man' });
    const prog = programDef(content, 'frog_tax_man');
    expect(prog.title).toBe('The Frog Tax Man');
    expect(programEpisode(prog, s).id).toBeTruthy();
    expect(programEpisode(prog, s, 'quarterly_estimates').id).toBe('quarterly_estimates');
    for (const ep of prog.episodes) for (const b of ep.beats) expect(b.frames.length, `${ep.id}`).toBeGreaterThan(0);
  });

  it('has a knob panel whose only way off is OFF MAYBE, and needs a few tries', () => {
    const off = ses.knobs.list.filter((k) => k.effect === 'off');
    expect(off.map((k) => k.label)).toEqual(['OFF MAYBE']);
    expect(off[0].tries).toBeGreaterThan(1);
    expect(ses.knobs.doneFlag).toBe('ses_off_maybe');
  });
});

describe('the second Dead Center', () => {
  it('is new locations with the "second" profile, still one zone at a time', () => {
    const locs = deadCenterLocations(content);
    expect(locs.second_forward_deck.profile).toBe('second');
    expect(locs.second_sleeping_quarters.profile).toBe('second');
    const s = freshSession();
    setDeadCenterLocation(s, 'second_forward_deck');
    expect(deadCenterProfile(content, s)).toBe('second');
    setDeadCenterLocation(s, 'second_sleeping_quarters');
    expect(s.story.getValue('dead_center')).toBe('second_sleeping_quarters');
    expect(deadCenterProfile(content, s)).toBe('second');
  });
});

describe('Phase 6 state', () => {
  it('a Shark Duty session for the worst morning, with every post at the rail clear of crew', () => {
    const duty = dutyData(content);
    expect(duty.sessions.morning_after_watch).toMatchObject({ event: 'p6_morning_repelled', counter: 'worst_morning.duty' });
    const s = atPreset('p6_garrick_wakes');
    s.story.set('p6_garrick_told');
    s.quests.completeObjective('worst_morning', 'talk', { force: true });
    expect(s.quests.isObjectiveAvailable('worst_morning', 'duty')).toBe(true);
    // Where the captain has to stand to see each shark off (port rail x=16 from x=15; starboard x=3 from x=4).
    const posts = Object.values(duty.sections).map((sec) => `${sec.x === 16 ? 15 : 4},${sec.y}`);
    const standing = [...placementChoices(content.maps.require('main_deck').objects, s)].filter(([, o]) => o && !o.absent).map(([npc, o]) => [npc, `${o.x},${o.y}`]);
    for (const [npc, at] of standing) expect(posts, `${npc} stands at a Shark Duty post`).not.toContain(at);
  });

  it('the bulk Frog Grog is a story variable; the captain\'s own Frog Grog is untouched', () => {
    const s = atPreset('p6_grog_offensive');
    expect(s.story.getVar('bulk_frog_grog')).toBe(16);
    const done = atPreset('p6_complete');
    expect(done.story.getVar('bulk_frog_grog')).toBe(0);
    expect(done.inventory.count('frog_grog')).toBe(s.inventory.count('frog_grog'));
    expect(JSON.stringify(content.scripts.get('p6c8.collapse'))).not.toMatch(/takeItem/);
  });

  it('chapters 25 to 32 follow the story flags', () => {
    expect(currentChapter(content.game, atPreset('p6_start')).id).toBe('p6c1');
    expect(currentChapter(content.game, atPreset('p6_midnight_warning')).id).toBe('p6c5');
    expect(currentChapter(content.game, atPreset('p6_complete')).id).toBe('phase6_end');
  });

  it('every placement on the deck stands somewhere walkable in every Phase 6 preset', () => {
    const model = compiled('main_deck');
    expect(model).toBeTruthy();
  });
});

describe('Phase 6 saves', () => {
  it('is version 6 or later, and a finished Phase 5 save migrates and walks into chapter 25', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(6);
    const v5 = JSON.parse(JSON.stringify(atPreset('p5_complete').serialize()));
    delete v5.story.values;
    const v6 = migrateState(v5, 5, 6);
    expect(v6.story.values).toEqual({});
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: v6 });
    expect(loaded.story.has('p5_complete')).toBe(true);
    expect(loaded.story.has('p6_started')).toBe(false);
    expect(currentChapter(content.game, loaded).id).toBe('phase5_end');
    expect(sharkstormNow(content, loaded).id).toBe('not_created');
    expect(tvCondition(tvDef(content, 'ses'), loaded).id).toBe('working');
  });

  it('keeps the Frog Grog a player is carrying through the migration', () => {
    const s = atPreset('p5_complete');
    s.inventory.add('frog_grog', 4);
    const carried = s.inventory.count('frog_grog');
    const v5 = JSON.parse(JSON.stringify(s.serialize()));
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: migrateState(v5, 5, 6) });
    expect(loaded.inventory.count('frog_grog')).toBe(carried);
  });

  it('a version 5 save record in storage upgrades on load', () => {
    const storage = new MemoryStorage();
    const old = new SaveManager({ storage, content, version: 5, migrations: {} });
    expect(old.save(1, atPreset('p5_complete')).ok).toBe(true);
    const res = new SaveManager({ storage, content }).read(1);
    expect(res.ok).toBe(true);
    expect(res.state.story.flags).toContain('p5_complete');
  });

  it('saves and loads at every Phase 6 checkpoint without losing anything', () => {
    const ids = content.debugPresets.list().map((p) => p.id).filter((id) => id.startsWith('p6_'));
    expect(ids.length).toBe(23);
    for (const id of ids) {
      const s = atPreset(id);
      const storage = new MemoryStorage();
      const mgr = new SaveManager({ storage, content });
      expect(mgr.save(1, s).ok, id).toBe(true);
      const back = GameSession.fromState({ content, bus: new EventBus(), state: mgr.read(1).state });
      expect([...back.story.flags].sort(), id).toEqual([...s.story.flags].sort());
      expect(back.story.getValue('great_sharkstorm') ?? null, id).toBe(s.story.getValue('great_sharkstorm') ?? null);
      expect(back.story.getValue('ses_state') ?? null, id).toBe(s.story.getValue('ses_state') ?? null);
    }
  });
});
