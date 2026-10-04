import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent } from '../src/content/loadContent.js';
import { validateContent } from '../src/content/validateContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { migrateState } from '../src/systems/save/migrations.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION } from '../src/config/constants.js';
import { currentChapter } from '../src/systems/story/progress.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { sharkstormStates, sharkstormNow } from '../src/systems/hazards/sharkstorm.js';
import { deadCenterLocation } from '../src/systems/hazards/deadCenter.js';
import { mapDisplayName } from '../src/maps/mapName.js';
import { Ambient } from '../src/world/Ambient.js';
import { PARTICLE_BURSTS } from '../src/systems/script/commandSchemas.js';
import { characterSheet } from '../src/art/sheets.js';
import { EXPRESSIONS } from '../src/art/portraits/portraitPainter.js';
import { FIELD_POSES } from '../src/art/characters/characterPainter.js';
import { HAT_STYLES } from '../src/art/characters/hats.js';
import { buildVistaAtlas, VISTA_FRAMES } from '../src/art/vista/vistaArt.js';
import { renderSong } from '../src/audio/synth/renderSong.js';
import { renderSfx } from '../src/audio/synth/renderSfx.js';

/**
 * Story Phase 8 systems: the storm easing (not ending); the Grand
 * Stenchmaster's stomach as a story value that is never a release; the Suit's
 * trapped puffs (bounded); the hold's new name; the condemned quarters; save
 * version 8; the art (the Grand Crown, the explorer's helmet, asleep, dozing,
 * the bedtime story and the bunk at night) and the sound.
 */

// Ambient (the Suit's puffs) imports Phaser, which wants a browser; it uses none of it here.
vi.mock('phaser', () => ({}));

const content = loadContent();
const freshSession = () => GameSession.newGame({ content, bus: new EventBus() });
const atPreset = (id) => {
  const s = freshSession();
  applyPresetPlan(s, resolvePreset(content, id));
  return s;
};
const RELEASE_STATES = ['calm', 'rumbling', 'false_alarm', 'possibly_building', 'unknown'];
const p8Scripts = () => fs.readdirSync(path.resolve('data/story/cutscenes/phase8')).map((n) => fs.readFileSync(path.resolve('data/story/cutscenes/phase8', n), 'utf8')).join('\n');

describe('the Great Sharkstorm in Phase 8 (it eases; it does not end)', () => {
  it('has one new state, easing_near_ship: still near, fewer and further-apart landings', () => {
    const st = sharkstormStates(content);
    expect(Object.keys(st).slice(-1)).toEqual(['easing_near_ship']);
    const near = st.active_near_ship;
    const easing = st.easing_near_ship;
    expect(easing.distance).toBe('near');
    expect(easing.intensity).toBeLessThan(near.intensity);
    expect(easing.flying.passEvery[0]).toBeGreaterThan(near.flying.passEvery[0]);
    expect(easing.below.every[0]).toBeGreaterThan(near.below.every[0]);
    expect(easing.below.maps).toEqual(near.below.maps);
  });

  it('is easing (never gone) from chapter 48 on, and the Dead Center has moved to the forward deck', () => {
    expect(sharkstormNow(content, atPreset('p8_stinkbeard_fury')).id).toBe('active_near_ship');
    for (const id of ['p8_quarters_condemned', 'p8_bedtime_story', 'p8_complete']) {
      expect(sharkstormNow(content, atPreset(id)).id, id).toBe('easing_near_ship');
      expect(deadCenterLocation(atPreset(id)), id).toBe('second_forward_deck');
    }
  });
});

describe('the Grand Stenchmaster\'s stomach (a story value, never a release)', () => {
  it('every value the story gives it is one of the uncertain states', () => {
    const set = [...p8Scripts().matchAll(/"setValue": "garrick_release",\s*"value": "([a-z_]+)"/g)].map((m) => m[1]);
    expect(set.length).toBeGreaterThan(8);
    for (const v of set) expect(RELEASE_STATES).toContain(v);
    for (const p of content.debugPresets.list().filter((x) => x.id.startsWith('p8_'))) {
      const v = p.values?.garrick_release;
      if (v !== undefined) expect(RELEASE_STATES, p.id).toContain(v);
    }
  });

  it('Phase 8 never starts a fume cloud, a release or a Dead Center move except the one it moves on', () => {
    const text = p8Scripts();
    expect(text).not.toMatch(/"fumeCloud"/);
    expect(text).not.toMatch(/"setFlag": "[a-z_]*major_release/);
    expect([...text.matchAll(/"deadCenter": "([a-z_]+)"/g)].map((m) => m[1])).toEqual(['second_forward_deck']);
  });

  it('the crown fall and the suit\'s puffs cannot hurt anyone (no damage, no battle, no fumes)', () => {
    const night = fs.readFileSync(path.resolve('data/story/cutscenes/phase8/ch52_54.json'), 'utf8');
    for (const banned of [/"battle"/, /"damage"/, /"fumeCloud"/, /"hurt"/, /"takeHp"/, /"heal"/]) expect(night).not.toMatch(banned);
    expect(night).toMatch(/You are fine\. You are entirely unhurt\./);
  });
});

describe('the Suit\'s trapped puffs (FWOoF) stay bounded', () => {
  const odor = () => content.maps.require('cargo_hold').ambient.find((a) => a.kind === 'odorTrail' && a.actor === 'garrick');

  it('are defined on Garrick in the hold, as single small suit puffs with their own sound', () => {
    const a = odor();
    expect(a).toMatchObject({ fx: 'suitpuff', sfx: 'suit_fwoof', whenMoving: true });
    expect(PARTICLE_BURSTS).toContain('suitpuff');
    expect(a.count ?? 1).toBe(1);
    expect(a.every[0]).toBeGreaterThanOrEqual(1500);
    expect(a.idleEvery[0]).toBeGreaterThanOrEqual(10000);
  });

  it('puff when he moves, rarely when he sits still, and never faster than the cooldown', () => {
    const session = atPreset('p8_start');
    const bursts = [];
    const garrick = { sprite: { visible: true, x: 100, y: 100 }, tx: 11, ty: 13, facing: 'up' };
    const scene = {
      game: { app: { session, audio: { sfx: () => {} } } },
      cameras: { main: { scrollX: 0 } },
      fx: { burst: (kind, x, y, opts) => bursts.push({ kind, count: opts.count }) },
      actors: new Map([['garrick', garrick]]),
      player: null,
      tweens: { add: () => {}, killTweensOf: () => {} },
    };
    const amb = new Ambient(scene, [odor()]);
    // A minute sitting still in his chair.
    for (let t = 0; t < 60000; t += 100) amb.update(100, null);
    const still = bursts.length;
    expect(still).toBeLessThanOrEqual(5);
    // Ten seconds walking about (a new tile every 300 ms).
    for (let t = 0; t < 10000; t += 100) {
      if (t % 300 === 0) garrick.tx += 1;
      amb.update(100, null);
    }
    const walking = bursts.length - still;
    expect(walking).toBeGreaterThan(2);
    expect(walking).toBeLessThanOrEqual(Math.ceil(10000 / odor().every[0]) + 1);
    expect(bursts.every((b) => b.kind === 'suitpuff' && b.count === 1)).toBe(true);
  });
});

describe('the lower hull, the barracks and the condemned quarters', () => {
  it('the hold is renamed by the story: Lower Hull, then Lower Hull Barracks', () => {
    const hold = content.maps.require('cargo_hold');
    expect(mapDisplayName(hold, atPreset('p7_complete'))).toBe(hold.name);
    expect(mapDisplayName(hold, atPreset('p8_start'))).toBe('Lower Hull');
    expect(mapDisplayName(hold, atPreset('p8_bedtime_story'))).toBe('Lower Hull Barracks');
    expect(mapDisplayName(hold, atPreset('p8_complete'))).toBe('Lower Hull Barracks');
    expect(mapDisplayName(null, atPreset('p8_complete'))).toBe('');
  });

  it('respawn names a spawn point, never an NPC (it moves the captain)', () => {
    const db = loadContent();
    db.scripts.map.set('zz.respawn_npc', [{ respawn: 'garrick' }]);
    db.scripts.map.set('zz.respawn_ok', [{ respawn: 'stairs' }, { respawn: 'safe' }]);
    const errors = validateContent(db).errors.join('\n');
    expect(errors).toMatch(/respawn "garrick" is not a spawn point/);
    expect(errors).not.toMatch(/respawn "stairs"|respawn "safe"/);
    expect(fs.readdirSync(path.resolve('data/story/cutscenes/phase8')).map((n) => fs.readFileSync(path.resolve('data/story/cutscenes/phase8', n), 'utf8')).join('')).not.toMatch(/"respawn"/);
  });

  it('a name variant needs a condition and a name', () => {
    const db = loadContent();
    db.maps.get('galley').nameVariants = [{ if: { flag: 'p8_started' } }];
    const r = validateContent(db);
    expect(r.errors.join('\n')).toMatch(/nameVariants/);
  });

  it('the barracks are built in the hold: bunks, the cradle, the top hammock, the pantry, the crown crate', () => {
    const hold = content.maps.require('cargo_hold');
    const props = (hold.meta?.props ?? hold.props ?? []).map((p) => p.prop);
    for (const id of ['bunk_double', 'bunk_double_crowned', 'bunk_double_bare', 'squawks_cradle', 'hammock_sail', 'hammock_net', 'gristle_rig',
      'jim_pantry', 'rope_pillow', 'sailcloth_screen', 'crown_crate', 'costume_trunk']) {
      expect(props, id).toContain(id);
    }
  });

  it('the old quarters\' door is locked all phase, and condemned for good (dense, permanent, not the Dead Center)', () => {
    const galley = content.maps.require('galley');
    const door = galley.objects.find((o) => o.id === 'p8_to_crew');
    expect(door).toMatchObject({ x: 8, y: 12, locked: 'p8.condemned_door' });
    const warps = galley.objects.filter((o) => o.type === 'warp' && o.x === 8 && o.y === 12);
    expect(warps[0].id, 'the Phase 8 lock comes first').toBe('p8_to_crew');
    const quarters = content.maps.require('crew_quarters');
    const zone = quarters.fumes.find((z) => z.id === 'p8_condemned');
    expect(zone).toMatchObject({ level: 'dense', if: { flag: 'crew_quarters_condemned' } });
    // Its own flag, nothing to do with where the Dead Center is.
    expect(JSON.stringify(zone.if)).not.toMatch(/dead_center/);
  });
});

describe('Phase 8 state', () => {
  it('chapters 42 to 54 follow the story flags', () => {
    expect(currentChapter(content.game, atPreset('p8_start')).id).toBe('p8c1');
    expect(currentChapter(content.game, atPreset('p8_sash_bearer_request')).id).toBe('p8c3');
    expect(currentChapter(content.game, atPreset('p8_quarters_condemned')).id).toBe('p8c7');
    expect(currentChapter(content.game, atPreset('p8_lower_hull_barracks')).id).toBe('p8c9');
    expect(currentChapter(content.game, atPreset('p8_discount_store_reveal')).id).toBe('p8c13');
    expect(currentChapter(content.game, atPreset('p8_complete')).id).toBe('phase8_end');
  });

  it('the persistent facts are set by the end and kept in a save', () => {
    const s = atPreset('p8_complete');
    for (const f of ['crew_quarters_condemned', 'lower_hull_barracks', 'garrick_top_hammock', 'squawks_sleep_spot', 'grand_crown_created',
      'grand_crown_banned_for_sleep', 'fart_sash_nickname', 'sash_origin_revealed', 'lost_fart_game_proposed', 'lost_fart_legend_told',
      'garrick_possible_release_survived', 'crew_ftm_invested', 'p8_complete']) {
      expect(s.story.has(f), f).toBe(true);
    }
  });
});

describe('Phase 8 saves', () => {
  it('is version 8, and a finished Phase 7 save migrates and waits for the crate', () => {
    expect(SAVE_VERSION).toBe(8);
    const v7 = JSON.parse(JSON.stringify(atPreset('p7_complete').serialize()));
    const v8 = migrateState(v7, 7, 8);
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: v8 });
    expect(loaded.story.has('p7_complete')).toBe(true);
    expect(loaded.story.has('p8_started')).toBe(false);
    expect(currentChapter(content.game, loaded).id).toBe('phase7_end');
    expect(sharkstormNow(content, loaded).id).toBe('active_near_ship');
    expect(mapDisplayName(content.maps.require('cargo_hold'), loaded)).toBe(content.maps.require('cargo_hold').name);
  });

  it('fills missing story maps without losing what the player carries', () => {
    const s = atPreset('p7_complete');
    s.inventory.add('frog_grog', 2);
    const carried = s.inventory.count('frog_grog');
    const v7 = JSON.parse(JSON.stringify(s.serialize()));
    delete v7.story.values;
    delete v7.world.counters;
    delete v7.world.visited;
    const v8 = migrateState(v7, 7, 8);
    expect(v8.story.values).toEqual({});
    expect(v8.world.counters).toEqual({});
    expect(v8.world.visited).toEqual([]);
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: v8 });
    expect(loaded.inventory.count('frog_grog')).toBe(carried);
  });

  it('a version 7 save record in storage upgrades on load', () => {
    const storage = new MemoryStorage();
    const old = new SaveManager({ storage, content, version: 7, migrations: {} });
    expect(old.save(1, atPreset('p7_complete')).ok).toBe(true);
    const res = new SaveManager({ storage, content }).read(1);
    expect(res.ok).toBe(true);
    expect(res.state.story.flags).toContain('p7_complete');
  });

  it('saves and loads at every Phase 8 checkpoint without losing anything', () => {
    const ids = content.debugPresets.list().map((p) => p.id).filter((id) => id.startsWith('p8_'));
    expect(ids.length).toBe(18);
    for (const id of ids) {
      const s = atPreset(id);
      const mgr = new SaveManager({ storage: new MemoryStorage(), content });
      expect(mgr.save(1, s).ok, id).toBe(true);
      const back = GameSession.fromState({ content, bus: new EventBus(), state: mgr.read(1).state });
      expect([...back.story.flags].sort(), id).toEqual([...s.story.flags].sort());
      for (const v of ['garrick_release', 'great_sharkstorm', 'dead_center']) {
        expect(back.story.getValue(v) ?? null, `${id}: ${v}`).toBe(s.story.getValue(v) ?? null);
      }
      expect(back.story.getVar('p4_tod'), id).toBe(s.story.getVar('p4_tod'));
    }
  });
});

describe('Phase 8 art and sound', () => {
  it('the Grand Crown and the explorer\'s helmet are hats; asleep is a face; doze is a pose', () => {
    expect(HAT_STYLES.grandcrown).toBeTruthy();
    expect(HAT_STYLES.explorer).toBeTruthy();
    expect(EXPRESSIONS.asleep).toMatchObject({ eye: 'closed' });
    expect(FIELD_POSES.doze).toBeTruthy();
    const crowned = content.appearances.require('garrick_stenchmaster_crowned');
    expect(crowned.outfit).toMatchObject({ primary: 'burgundy', secondary: 'mustard', pants: 'bilious' });
    expect(Object.keys(characterSheet(crowned).anims).length).toBeGreaterThan(8);
    expect(Object.keys(characterSheet(content.appearances.require('bob_explorer')).anims).length).toBeGreaterThan(8);
  });

  it('the vista atlas has the new pictures and still fits a 4096 texture', () => {
    const v = buildVistaAtlas();
    expect(v.canvas.height).toBeLessThanOrEqual(4096);
    expect(v.canvas.width).toBeLessThanOrEqual(4096);
    for (const f of ['legend_bg', 'leg_reekhollow', 'leg_sir_garrick', 'leg_onion', 'leg_moral', 'bunk_bg', 'bunk_garrick_0', 'bunk_sash_2', 'bunk_fork',
      'quarters_door', 'quarters_inside_1', 'ftm_basis_0']) {
      expect(VISTA_FRAMES, f).toContain(f);
    }
  });

  it('the new music renders, loops, and never clips', () => {
    const inst = { ...JSON.parse(fs.readFileSync(path.resolve('data/audio/instruments.json'))), ...JSON.parse(fs.readFileSync(path.resolve('data/audio/instruments_phase7.json'))) };
    for (const id of ['lower_hull', 'lost_fart_adventure']) {
      const song = JSON.parse(fs.readFileSync(path.resolve(`data/audio/music/${id}.json`)));
      const out = renderSong(song, inst);
      let peak = 0;
      for (const v of out.left) peak = Math.max(peak, Math.abs(v));
      expect(peak, id).toBeGreaterThan(0.1);
      expect(peak, id).toBeLessThan(1.2);
      expect(out.loopEnd, id).toBeGreaterThan(out.loopStart);
    }
  }, 30000);

  it('the new sound effects render (stomachs, cutlery, hammocks, the FWOoF, the snore)', () => {
    const sfx = JSON.parse(fs.readFileSync(path.resolve('data/audio/sfx_phase8.json')));
    const ids = Object.keys(sfx).filter((k) => k !== '//');
    for (const id of ['stomach_glorp', 'stomach_grnk', 'stomach_big', 'false_alarm_sting', 'crown_clatter', 'fork_thunk', 'spoon_boing', 'lid_clang',
      'hammock_creak', 'suit_fwoof', 'sash_swish', 'garrick_snore', 'sleep_mumble', 'mk2_tik', 'mk2_zzzt']) {
      expect(ids, id).toContain(id);
    }
    for (const id of ids) {
      const { data } = renderSfx(sfx[id]);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v));
      expect(peak, id).toBeGreaterThan(0.05);
      expect(peak, id).toBeLessThan(1.3);
    }
  });
});
