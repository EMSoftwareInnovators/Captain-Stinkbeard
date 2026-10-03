import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent } from '../src/content/loadContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { migrateState } from '../src/systems/save/migrations.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION } from '../src/config/constants.js';
import { currentChapter } from '../src/systems/story/progress.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { tvDef, tvState, tvCondition, setTvCondition, setPower, setChannel, availableChannels, programDef, programEpisode } from '../src/systems/tv/tv.js';
import { sharkstormStates, sharkstormNow, setSharkstormState } from '../src/systems/hazards/sharkstorm.js';
import { SharkstormLayer } from '../src/world/SharkstormLayer.js';
import { characterSheet } from '../src/art/sheets.js';
import { buildVistaAtlas, VISTA_FRAMES } from '../src/art/vista/vistaArt.js';
import { STAGE_FRAMES } from '../src/art/stage/stageArt.js';
import { renderSong } from '../src/audio/synth/renderSong.js';
import { renderSfx } from '../src/audio/synth/renderSfx.js';
import { GLYPHS } from '../src/art/font/glyphs.js';

/**
 * Story Phase 7 systems: the Great Sharkstorm's new states (returning,
 * active_near_ship) and its shapes and below-decks thuds; the original
 * S.E.S. wrecked for good and the S.E.S. Mark II as a second set with its own
 * art, condition, power, channel and knob panel; the new Frog Tax Man
 * episode; save version 7; the art and sound that came with it.
 */

const content = loadContent();
const freshSession = () => GameSession.newGame({ content, bus: new EventBus() });
const atPreset = (id) => {
  const s = freshSession();
  applyPresetPlan(s, resolvePreset(content, id));
  return s;
};

describe('the Great Sharkstorm in Phase 7 (it comes back; it is not made again)', () => {
  it('has two new states after Phase 6\'s five', () => {
    expect(Object.keys(sharkstormStates(content))).toEqual(['not_created', 'forming', 'attacking_ship', 'dispersed_near_ship', 'active_distant', 'returning', 'active_near_ship']);
    const st = sharkstormStates(content);
    expect(st.returning).toMatchObject({ distance: 'approaching' });
    expect(st.returning.flying.impactEvery).toBeUndefined(); // nothing lands while it's still coming
    expect(st.active_near_ship).toMatchObject({ distance: 'near' });
    expect(st.active_near_ship.below.maps).toEqual(expect.arrayContaining(['cargo_hold', 'galley']));
  });

  it('starts Phase 7 far off, comes back, attacks, and ends the phase parked over the ship', () => {
    expect(sharkstormNow(content, atPreset('p7_start')).id).toBe('active_distant');
    expect(sharkstormNow(content, atPreset('p7_flying_sharks_return')).id).toBe('attacking_ship');
    const end = atPreset('p7_complete');
    expect(sharkstormNow(content, end)).toMatchObject({ id: 'active_near_ship', distance: 'near' });
    expect(end.story.getValue('great_sharkstorm_distance')).toBe('near');
    // Never re-created: the creation flag is Phase 6's and nothing in Phase 7 sets it, or sets the storm back to forming.
    const p7 = fs.readdirSync(path.resolve('data/story/cutscenes/phase7')).map((n) => fs.readFileSync(path.resolve('data/story/cutscenes/phase7', n), 'utf8')).join('\n');
    expect(p7).not.toMatch(/"setFlag": "great_sharkstorm_created"/);
    expect(p7).not.toMatch(/"sharkstorm": "(forming|not_created|dispersed_near_ship)"/);
  });

  it('flings more than one kind of shark, and every kind has art', () => {
    const kinds = new Set(Object.values(sharkstormStates(content)).flatMap((s) => s.flying?.variants ?? []));
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    for (const k of kinds) for (const f of [`${k}_0`, `${k}_1`]) expect(STAGE_FRAMES).toContain(f);
  });

  it('below decks it is heard through the planks: a thud, a small shake, grit from the deckhead (never on deck, never in a scene)', () => {
    const s = atPreset('p7_mk2_construction');
    const sounds = [];
    const bursts = [];
    const events = [];
    let shakes = 0;
    const scene = {
      content, session: s, model: { id: 'cargo_hold' },
      app: { audio: { sfx: (id) => sounds.push(id) }, settings: { reducedEffects: () => false, shakeScale: () => 1 }, bus: { emit: (n, e) => events.push(e?.name) } },
      cameras: { main: { scrollX: 0, scrollY: 0, shake: () => { shakes += 1; } } },
      fx: { burst: (kind) => bursts.push(kind) },
    };
    const layer = new SharkstormLayer(scene);
    layer.update(30000, true); // a scene running: nothing
    expect(sounds).toEqual([]);
    layer.update(30000, false);
    expect(sounds.length).toBe(1);
    expect(['hull_thud', 'hull_thud_big', 'deck_scrape']).toContain(sounds[0]);
    expect(shakes).toBe(1);
    expect(bursts).toContain('falldust');
    expect(events).toContain('sharkstorm_thud');
    // The deck is where the flying sharks are; there the layer does not thud.
    scene.model = { id: 'main_deck' };
    sounds.length = 0;
    layer.thudT = 0;
    layer.passT = 1e9;
    layer.update(100, false);
    expect(sounds.filter((x) => x.startsWith('hull_thud'))).toEqual([]);
  });
});

describe('the two televisions', () => {
  it('the original S.E.S. keeps its history and ends wrecked (dead, stripped, still aboard)', () => {
    const ses = tvDef(content, 'ses');
    expect(Object.keys(ses.states)).toEqual(expect.arrayContaining(['apparently_dead', 'shark_damaged', 'wrecked']));
    expect(tvCondition(ses, atPreset('p7_start')).id).toBe('shark_damaged');
    const s = atPreset('p7_mk1_wrecked');
    expect(tvCondition(ses, s)).toMatchObject({ id: 'wrecked', dead: true, bezel: 'ses_bezel_scrapped' });
    expect(ses.states.wrecked.flicker).toBeUndefined();
    setPower(ses, s, true);
    expect(tvState(ses, s).power).toBe(false);
    expect(JSON.stringify(ses.states.wrecked.lookComments)).toMatch(/A shark accomplished what I could not/);
  });

  it('Mark II is a second set: its own art, condition, power and channel', () => {
    const mk2 = tvDef(content, 'ses_mk2');
    expect(mk2).toMatchObject({ bezel: 'mk2_bezel', back: 'mk2_back', powerFrame: 'mk2_power', stateValue: 'ses_mk2_state', powerVar: 'ses_mk2_power', channelVar: 'ses_mk2_channel' });
    for (const f of ['mk2_bezel', 'mk2_back', 'mk2_power', 'mk2_build_0', 'mk2_build_1', 'mk2_bezel_off']) expect(VISTA_FRAMES).toContain(f);
    const s = atPreset('p7_mk2_construction');
    expect(tvCondition(mk2, s)).toMatchObject({ id: 'under_construction', dead: true });
    setPower(mk2, s, true);
    expect(tvState(mk2, s).power).toBe(false); // can't switch on what isn't built
    setTvCondition(mk2, s, 'working');
    setPower(mk2, s, true);
    expect(tvState(mk2, s).power).toBe(true);
    // The original is untouched by any of this.
    expect(tvCondition(tvDef(content, 'ses'), s).id).toBe('wrecked');
    expect(s.story.getVar('ses_power')).toBe(0);
  });

  it('Mark II gets The Frog Tax Man on channel 7, and season seventeen once Franklin is found', () => {
    const mk2 = tvDef(content, 'ses_mk2');
    const s = atPreset('p7_franklin_returns');
    expect(availableChannels(mk2, s).map((c) => c.id)).toEqual([1, 3, 4, 7]);
    const prog = programDef(content, 'frog_tax_man');
    expect(programEpisode(prog, s).id).toBe('quarterly_estimates');
    const end = atPreset('p7_complete');
    expect(tvState(mk2, end)).toMatchObject({ power: true });
    expect(tvState(mk2, end).channel.id).toBe(7);
    expect(programEpisode(prog, end).id).toBe('season_seventeen_flies');
  });

  it('inherits the knob panel: every wrong knob does something, FROG MAYBE finds Franklin on the second try', () => {
    const knobs = tvDef(content, 'ses_mk2').knobs;
    expect(knobs.doneFlag).toBe('p7_franklin_found');
    const frog = knobs.list.find((k) => k.id === 'frog');
    expect(frog).toMatchObject({ effect: 'tune', tries: 2, channel: 7 });
    expect(new Set(knobs.list.map((k) => k.effect))).toEqual(new Set(['louder', 'flip', 'roll', 'shriek', 'tint', 'noop', 'tune']));
  });
});

describe('Phase 7 state', () => {
  it('the bulk Frog Grog stays at zero all phase (the Phase 6 trick cannot be repeated); the captain\'s own is untouched', () => {
    for (const id of ['p7_start', 'p7_flying_sharks_return', 'p7_retreat_below', 'p7_complete']) {
      expect(atPreset(id).story.getVar('bulk_frog_grog'), id).toBe(0);
      expect(atPreset(id).story.has('bulk_frog_grog_depleted'), id).toBe(true);
    }
    const p7 = fs.readdirSync(path.resolve('data/story/cutscenes/phase7')).map((n) => fs.readFileSync(path.resolve('data/story/cutscenes/phase7', n), 'utf8')).join('\n');
    expect(p7).not.toMatch(/"setVar": "bulk_frog_grog"/);
    expect(p7).not.toMatch(/"takeItem": "frog_grog"/);
  });

  it('chapters 33 to 41 follow the story flags', () => {
    expect(currentChapter(content.game, atPreset('p7_start')).id).toBe('p7c1');
    expect(currentChapter(content.game, atPreset('p7_not_a_duty')).id).toBe('p7c3');
    expect(currentChapter(content.game, atPreset('p7_stenchmaster_parade')).id).toBe('p7c5');
    expect(currentChapter(content.game, atPreset('p7_mk2_construction')).id).toBe('p7c8');
    expect(currentChapter(content.game, atPreset('p7_complete')).id).toBe('phase7_end');
  });

  it('Garrick\'s cape stays torn, and the torn suit has his parade and singing poses', () => {
    const look = content.appearances.require('garrick_stenchmaster_torn');
    expect(look.extras).toContain('torn');
    expect(look.poses).toEqual(expect.arrayContaining(['march', 'sing']));
    const sheet = characterSheet(look);
    expect(Object.keys(sheet.anims)).toEqual(expect.arrayContaining(['march_down', 'sing_down']));
    for (const id of ['p7_stenchmaster_parade', 'p7_mk2_construction', 'p7_complete']) expect(atPreset(id).story.has('garrick_cape_torn'), id).toBe(true);
  });

  it('the song has a font: the ♪ glyph exists', () => {
    expect(GLYPHS['♪']).toBeTruthy();
  });
});

describe('Phase 7 art and sound', () => {
  it('the vista atlas still fits a 4096 texture', () => {
    const v = buildVistaAtlas();
    expect(v.canvas.height).toBeLessThanOrEqual(4096);
    expect(v.canvas.width).toBeLessThanOrEqual(4096);
  });

  it('the new music renders, loops, and never clips', () => {
    const inst = { ...JSON.parse(fs.readFileSync(path.resolve('data/audio/instruments.json'))), ...JSON.parse(fs.readFileSync(path.resolve('data/audio/instruments_phase7.json'))) };
    for (const id of ['sharkstorm_returns', 'stenchmaster_parade', 'grand_stenchmaster_song', 'hunker_down', 'pleasant_evening']) {
      const song = JSON.parse(fs.readFileSync(path.resolve(`data/audio/music/${id}.json`)));
      const out = renderSong(song, inst);
      let peak = 0;
      for (const v of out.left) peak = Math.max(peak, Math.abs(v));
      expect(peak, id).toBeGreaterThan(0.1);
      expect(peak, id).toBeLessThan(1.2);
      expect(out.loopEnd, id).toBeGreaterThan(out.loopStart);
    }
  });

  it('the new sound effects render', () => {
    const sfx = JSON.parse(fs.readFileSync(path.resolve('data/audio/sfx_phase7.json')));
    for (const [id, def] of Object.entries(sfx)) {
      if (id === '//') continue;
      const { data } = renderSfx(def);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v));
      expect(peak, id).toBeGreaterThan(0.05);
      expect(peak, id).toBeLessThan(1.3);
    }
  });
});

describe('Phase 7 saves', () => {
  it('is version 7 or later, and a finished Phase 6 save migrates and waits for the bed', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(7);
    const v6 = JSON.parse(JSON.stringify(atPreset('p6_complete').serialize()));
    const v7 = migrateState(v6, 6, 7);
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: v7 });
    expect(loaded.story.has('p6_complete')).toBe(true);
    expect(loaded.story.has('p7_started')).toBe(false);
    expect(currentChapter(content.game, loaded).id).toBe('phase6_end');
    expect(sharkstormNow(content, loaded).id).toBe('active_distant');
    expect(tvCondition(tvDef(content, 'ses'), loaded).id).toBe('shark_damaged');
    expect(tvCondition(tvDef(content, 'ses_mk2'), loaded).id).toBe('working'); // not built yet: no condition saved
    expect(loaded.story.has('ses_mark2_built')).toBe(false);
  });

  it('fills missing story maps and keeps the Frog Grog a player is carrying', () => {
    const s = atPreset('p6_complete');
    s.inventory.add('frog_grog', 4);
    const carried = s.inventory.count('frog_grog');
    const v6 = JSON.parse(JSON.stringify(s.serialize()));
    delete v6.story.values;
    delete v6.world.counters;
    const v7 = migrateState(v6, 6, 7);
    expect(v7.story.values).toEqual({});
    expect(v7.world.counters).toEqual({});
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: v7 });
    expect(loaded.inventory.count('frog_grog')).toBe(carried);
  });

  it('a version 6 save record in storage upgrades on load', () => {
    const storage = new MemoryStorage();
    const old = new SaveManager({ storage, content, version: 6, migrations: {} });
    expect(old.save(1, atPreset('p6_complete')).ok).toBe(true);
    const res = new SaveManager({ storage, content }).read(1);
    expect(res.ok).toBe(true);
    expect(res.state.story.flags).toContain('p6_complete');
  });

  it('saves and loads at every Phase 7 checkpoint without losing anything (the storm, both sets, the cape)', () => {
    const ids = content.debugPresets.list().map((p) => p.id).filter((id) => id.startsWith('p7_'));
    expect(ids.length).toBe(17);
    for (const id of ids) {
      const s = atPreset(id);
      const storage = new MemoryStorage();
      const mgr = new SaveManager({ storage, content });
      expect(mgr.save(1, s).ok, id).toBe(true);
      const back = GameSession.fromState({ content, bus: new EventBus(), state: mgr.read(1).state });
      expect([...back.story.flags].sort(), id).toEqual([...s.story.flags].sort());
      for (const v of ['great_sharkstorm', 'great_sharkstorm_distance', 'ses_state', 'ses_mk2_state']) {
        expect(back.story.getValue(v) ?? null, `${id}: ${v}`).toBe(s.story.getValue(v) ?? null);
      }
      for (const v of ['ses_mk2_power', 'ses_mk2_channel', 'ses_generation', 'bulk_frog_grog']) {
        expect(back.story.getVar(v), `${id}: ${v}`).toBe(s.story.getVar(v));
      }
    }
  });

  it('Mark II survives a save and load switched on, on Franklin', () => {
    const s = atPreset('p7_complete');
    const mgr = new SaveManager({ storage: new MemoryStorage(), content });
    mgr.save(2, s);
    const back = GameSession.fromState({ content, bus: new EventBus(), state: mgr.read(2).state });
    const mk2 = tvDef(content, 'ses_mk2');
    expect(tvState(mk2, back)).toMatchObject({ power: true, dead: false });
    expect(tvState(mk2, back).channel.id).toBe(7);
    setChannel(mk2, back, 3);
    expect(tvState(mk2, back).channel.title).toBe('Potatoes');
  });
});
