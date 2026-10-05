import { describe, expect, it } from 'vitest';
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
import { compileMap } from '../src/maps/compileMap.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { sharkstormStates, sharkstormNow } from '../src/systems/hazards/sharkstorm.js';
import { deadCenterLocation, deadCenterLocations } from '../src/systems/hazards/deadCenter.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { characterSheet } from '../src/art/sheets.js';
import { buildStageAtlas, STAGE_FRAMES } from '../src/art/stage/stageArt.js';
import { buildVistaAtlas, VISTA_FRAMES } from '../src/art/vista/vistaArt.js';
import { paintProp } from '../src/art/props/index.js';
import { ICON_NAMES } from '../src/art/ui/itemIcons.js';
import { renderSong } from '../src/audio/synth/renderSong.js';
import { renderSfx } from '../src/audio/synth/renderSfx.js';
import { renderInsects } from '../src/audio/synth/ambience.js';

/**
 * Story Phase 9 systems: the Great Sharkstorm's four new states (following,
 * offshore, inland, treasure-laden) and where its sharks may come down; the
 * captain's rowboat (a vehicle he sits in); Crownskull Isle's named places;
 * the quest left open; save version 9; the art (the dusty Grand Stenchmaster,
 * the blue sash, the parrot pouch, the island, the blast, the crowned
 * megalodon, the shanty) and the sound.
 */

const content = loadContent();
const freshSession = () => GameSession.newGame({ content, bus: new EventBus() });
const atPreset = (id) => {
  const s = freshSession();
  applyPresetPlan(s, resolvePreset(content, id));
  return s;
};
const P9_PRESETS = content.debugPresets.list().map((p) => p.id).filter((id) => id.startsWith('p9_'));
const compiled = (id) => {
  const def = content.maps.require(id);
  return compileMap(def, content.tilesets.get(def.tileset), content.props);
};
const DIRS = ['up', 'down', 'left', 'right'];

describe('the Great Sharkstorm in Phase 9 (it follows, it comes inland, it keeps the treasure)', () => {
  const st = sharkstormStates(content);

  it('has four new states, after easing_near_ship, in story order', () => {
    const ids = Object.keys(st);
    const at = ids.indexOf('easing_near_ship');
    expect(ids.slice(at + 1, at + 5)).toEqual(['following_crownskull', 'offshore_crownskull', 'inland_crownskull', 'treasure_laden']);
    for (const id of ['following_crownskull', 'offshore_crownskull', 'inland_crownskull', 'treasure_laden']) {
      expect(st[id].intensity, id).toBeGreaterThan(0); // never resolved
    }
  });

  it('moves with the story: behind the ship, off the coast, inland after the blast, then treasure-laden for good', () => {
    const now = (id) => sharkstormNow(content, atPreset(id)).id;
    expect(now('p9_crownskull_reveal')).toBe('easing_near_ship');
    expect(now('p9_landing_strategy')).toBe('following_crownskull');
    expect(now('p9_lee_side')).toBe('offshore_crownskull');
    expect(now('p9_excavation_blast')).toBe('offshore_crownskull');
    expect(now('p9_sharkstorm_inland')).toBe('inland_crownskull');
    expect(now('p9_treasure_blown_away')).toBe('inland_crownskull');
    expect(now('p9_crowned_megalodon')).toBe('treasure_laden');
    expect(now('p9_complete')).toBe('treasure_laden');
  });

  it('only drops sharks where a state gives a map an area, inside the map, landing the way the ground allows', () => {
    for (const [id, s] of Object.entries(st)) {
      const fly = s.flying;
      if (!fly?.areas) continue;
      for (const [mapId, [x0, y0, x1, y1]] of Object.entries(fly.areas)) {
        const m = compiled(mapId);
        expect(s.maps, `${id}: ${mapId} is one of its maps`).toContain(mapId);
        expect(x0 >= 0 && y0 >= 0 && x1 < m.width && y1 < m.height && x0 <= x1 && y0 <= y1, `${id}: ${mapId} area`).toBe(true);
        expect(['deck', 'land', 'water'], `${id}: ground`).toContain(fly.ground?.[mapId] ?? 'deck');
        expect([undefined, 'knock', 'push'], `${id}: onHit`).toContain(fly.onHit?.[mapId]);
        expect(fly.warnMs, `${id}: a landing is marked first`).toBeGreaterThanOrEqual(1000);
      }
    }
    // The reef: sharks splash down in the channel and the wave pushes the boat back (downstream, a little).
    const off = st.offshore_crownskull.flying;
    expect(off.ground.reef_passage).toBe('water');
    expect(off.onHit.reef_passage).toBe('push');
    expect(off.push).toEqual({ dir: 'down', tiles: 2 });
    expect(off.areas.crownskull_isle).toBeUndefined(); // overhead on the island, but nothing comes down on it yet
    // Inland: great whites in the ruins' yard and round the clearing; a hit knocks the captain flat.
    const inland = st.inland_crownskull.flying;
    expect(inland.ground.crownskull_isle).toBe('land');
    expect(inland.onHit.crownskull_isle).toBe('knock');
  });

  it('treasure-laden: jewelled sharks (pearls, a chain, a tiara, rings) and gold glints in the sky', () => {
    const tl = st.treasure_laden;
    for (const k of ['pearls', 'chain', 'tiara', 'rings']) {
      expect(tl.flying.variants).toContain(`flying_shark_${k}`);
      for (const f of [0, 1]) expect(STAGE_FRAMES).toContain(`flying_shark_${k}_${f}`);
    }
    expect(tl.glints.sfx).toBe('coin_glint');
    expect(tl.glints.every[0]).toBeGreaterThanOrEqual(1000);
    expect(tl.maps).toEqual(expect.arrayContaining(['crownskull_isle', 'main_deck']));
  });

  it('no Phase 9 scene can hurt anyone (no battles, no damage); a direct hit only knocks the captain down', () => {
    const dir = path.resolve('data/story/cutscenes/phase9');
    const text = fs.readdirSync(dir).map((n) => fs.readFileSync(path.join(dir, n), 'utf8')).join('\n');
    for (const banned of [/"battle"/, /"damage"/, /"takeHp"/, /"hurt"/]) expect(text).not.toMatch(banned);
  });
});

describe('the rowboat (a vehicle the captain sits in)', () => {
  const stage = buildStageAtlas();

  it('the Reef Passage seats the captain in rowboat_top, with a frame for every direction and a front layer', () => {
    expect(compiled('reef_passage').meta.playerVehicle).toBe('rowboat_top');
    for (const d of DIRS) {
      expect(STAGE_FRAMES).toContain(`rowboat_top_${d}`);
      expect(STAGE_FRAMES).toContain(`rowboat_top_${d}_front`);
    }
  });

  it('both layers share the seat at their centre, and the front layer is only what is nearer the camera than the seat', () => {
    for (const d of DIRS) {
      const back = stage.frames[`rowboat_top_${d}`];
      const front = stage.frames[`rowboat_top_${d}_front`];
      expect([front.w, front.h], d).toEqual([back.w, back.h]);
      const seatY = Math.floor(back.h / 2);
      let above = 0;
      let below = 0;
      for (let y = 0; y < front.h; y++) {
        for (let x = 0; x < front.w; x++) {
          if (!stage.canvas.alphaAt(front.x + x, front.y + y)) continue;
          if (y <= seatY) above += 1;
          else below += 1;
        }
      }
      expect(above, `${d}: nothing at or above the seat`).toBe(0);
      expect(below, `${d}: the near side of the boat`).toBeGreaterThan(40);
    }
  });

  it('a map whose vehicle has no frames is an error', () => {
    const db = loadContent();
    db.maps.get('reef_passage').playerVehicle = 'bathtub_nope';
    expect(validateContent(db).errors.join('\n')).toMatch(/playerVehicle "bathtub_nope" needs a stage frame "bathtub_nope_up"/);
  });
});

describe('Crownskull Isle', () => {
  const isle = compiled('crownskull_isle');

  it('every place on the island has a name (its location title), and the quest visits real places', () => {
    expect(isle.meta.regions.length).toBeGreaterThanOrEqual(14);
    for (const r of isle.meta.regions) expect(typeof r.name === 'string' && r.name.length > 0, r.id).toBe(true);
    const ids = new Set(isle.meta.regions.map((r) => r.id));
    for (const q of ['crownskull_isle', 'isle_curiosities', 'run']) {
      for (const o of content.quests.require(q).objectives.filter((x) => x.type === 'visit')) expect(ids, `${q}.${o.id}`).toContain(o.target);
    }
  });

  it('a region\'s name must be a non-empty string', () => {
    const db = loadContent();
    db.maps.get('crownskull_isle').regions[0].name = '';
    expect(validateContent(db).errors.join('\n')).toMatch(/a region's "name" must be a non-empty string/);
  });

  it('fins circle the decoy and the lure in the reef passage', () => {
    const fins = content.maps.require('reef_passage').ambient.filter((a) => a.kind === 'fins');
    expect(fins.length).toBeGreaterThanOrEqual(2);
    for (const f of fins) expect(f).toMatchObject({ x: expect.any(Number), y: expect.any(Number), count: expect.any(Number) });
  });

  it('after the phase, the boats go both ways (the ship stays the hub)', () => {
    const boat = isle.objects.find((o) => o.id === 'p9_boats');
    expect(boat.script).toBe('p9.isle.boat');
    expect(JSON.stringify(content.scripts.require('p9.isle.boat'))).toMatch(/"transition":"main_deck"/);
    const hub = content.maps.require('main_deck').objects.find((o) => o.id === 'p9_boat_hub');
    expect(hub).toMatchObject({ script: 'p9.deck.boat', if: { flag: 'p9_complete' } });
    expect(JSON.stringify(content.scripts.require('p9.deck.boat'))).toMatch(/"transition":"crownskull_isle"/);
  });

  it('the crater replaces the dig for good, and the island stays walkable round it', () => {
    const s = atPreset('p9_complete');
    expect(s.story.getValue('crater_state')).toBe('blasted');
    const props = content.maps.require('crownskull_isle').props.filter((p) => p.if && JSON.stringify(p.if).includes('grand_excavation_blast') && !JSON.stringify(p.if).includes('"not"'));
    expect(props.map((p) => p.prop)).toEqual(expect.arrayContaining(['crater', 'uprooted_palm', 'foul_coins']));
  });
});

describe('the landing on deck, round the Dead Center', () => {
  it('Phase 9 leaves the Dead Center where Phase 8 put it, and nothing on deck needs you to stand in its cloud', () => {
    const s = atPreset('p9_lee_side');
    expect(deadCenterLocation(s)).toBe('second_forward_deck');
    const zones = deadCenterLocations(content).second_forward_deck.zones;
    const inCloud = (x, y) => zones.some((z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h);
    const deck = content.maps.require('main_deck');
    const m = compiled('main_deck');
    for (const id of ['p9_helm', 'p9_lines', 'p9_decoy', 'p9_lure', 'p9_boats']) {
      const o = deck.objects.find((x) => x.id === id);
      const tiles = [];
      for (let x = o.x; x < o.x + (o.w || 1); x++) tiles.push([x, o.y]);
      expect(tiles.some(([x, y]) => inCloud(x, y)), `${id} is in the cloud`).toBe(false);
      // Somewhere to stand next to it that isn't in the cloud either.
      const stands = tiles.flatMap(([x, y]) => [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]])
        .filter(([x, y]) => !tiles.some(([a, b]) => a === x && b === y) && !inCloud(x, y) && x > 3 && x < 16 && y > 0 && y < m.height);
      expect(stands.length, `${id}: somewhere clean to stand`).toBeGreaterThan(0);
    }
    // The crew on deck for the landing stand clear of it too.
    for (const o of deck.objects.filter((x) => x.type === 'npc' && !x.absent && x.id.startsWith('p9d_'))) {
      if (!evaluateCondition(o.if, s)) continue;
      expect(inCloud(o.x, o.y), `${o.npc} at ${o.x},${o.y}`).toBe(false);
    }
  });
});

describe('no one-way doors', () => {
  /** The rooms a warp can take you to from `mapId` right now (the first warp on a tile is the one you take). */
  const exits = (mapId, s) => {
    const m = compiled(mapId);
    const solidNow = (x, y) => m.solid[y * m.width + x] === 1
      || m.dynamicSolids.some((d) => x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h && evaluateCondition(d.if, s));
    const warps = m.objects.filter((o) => o.type === 'warp');
    const out = new Set();
    for (const w of warps) {
      for (let y = w.y; y < w.y + (w.h || 1); y++) {
        for (let x = w.x; x < w.x + (w.w || 1); x++) {
          const first = warps.find((o) => x >= o.x && x < o.x + (o.w || 1) && y >= o.y && y < o.y + (o.h || 1));
          if (first !== w || solidNow(x, y)) continue;
          if (w.if && !evaluateCondition(w.if, s)) continue;
          out.add(w.to.map);
        }
      }
    }
    return out;
  };
  const reach = (from, s) => {
    const seen = new Set([from]);
    const todo = [from];
    while (todo.length) for (const n of exits(todo.pop(), s)) if (!seen.has(n)) { seen.add(n); todo.push(n); }
    return seen;
  };

  it('at every story checkpoint (every phase), every room you can walk into from where you are has a way back', () => {
    for (const id of content.debugPresets.list().map((p) => p.id)) {
      const s = atPreset(id);
      const start = resolvePreset(content, id).location?.map;
      if (!start) continue;
      for (const room of reach(start, s)) {
        expect(reach(room, s).has(start), `${id}: from ${start} into ${room}, and no way back`).toBe(true);
      }
    }
  });

  it('the hatches open again when the crew go up on deck, and the condemned quarters stay shut from the deck', () => {
    const s = atPreset('p9_lee_side');
    expect(exits('galley', s).has('main_deck')).toBe(true);
    expect(exits('main_deck', s).has('crew_quarters')).toBe(false);
    expect(exits('cargo_hold', atPreset('p9_landing_strategy')).has('galley')).toBe(true);
    expect(reach('cargo_hold', atPreset('p9_landing_strategy')).has('main_deck')).toBe(false); // still barred below until chapter 62
  });
});

describe('RECOVER THE CRIMSON FORTUNE is left open', () => {
  it('is marked open, active at the end, and nothing in the game can finish it yet', () => {
    const q = content.quests.require('recover_crimson_fortune');
    expect(q.open).toBe(true);
    const s = atPreset('p9_complete');
    expect(s.quests.status('recover_crimson_fortune')).toBe('active');
    const all = JSON.stringify([...content.scripts.map.values()]) + JSON.stringify(content.debugPresets.list()) + JSON.stringify(content.triggers?.list?.() ?? []);
    for (const o of q.objectives) {
      expect(o.type, o.id).toBe('flag');
      expect(all, `nothing sets ${o.target}`).not.toContain(`"${o.target}"`);
    }
  });
});

describe('Phase 9 state', () => {
  it('chapters 55 to 70 follow the story flags', () => {
    expect(currentChapter(content.game, atPreset('p9_start')).id).toBe('phase8_end'); // the bunk scene starts chapter 55
    expect(currentChapter(content.game, atPreset('p9_morning_after')).id).toBe('p9c1');
    expect(currentChapter(content.game, atPreset('p9_land_sighted')).id).toBe('p9c5');
    expect(currentChapter(content.game, atPreset('p9_lee_side')).id).toBe('p9c8');
    expect(currentChapter(content.game, atPreset('p9_digging_start')).id).toBe('p9c11');
    expect(currentChapter(content.game, atPreset('p9_sharkstorm_inland')).id).toBe('p9c14');
    expect(currentChapter(content.game, atPreset('p9_rage_shanty')).id).toBe('p9c16');
    expect(currentChapter(content.game, atPreset('p9_complete')).id).toBe('phase9_end');
  });

  it('the persistent facts are set by the end', () => {
    const s = atPreset('p9_complete');
    for (const f of ['pete_mock_title_grand_sharkmaster', 'megalodon_crowned', 'crater_treasure_contaminated', 'crownskull_landed',
      'crimson_fortune_found', 'fortune_scattered', 'rage_shanty_seen', 'recover_fortune_unlocked', 'p9_complete']) {
      expect(s.story.has(f), f).toBe(true);
    }
    expect(s.story.getValue('megalodon_state')).toBe('stranded_crownskull');
    expect(s.story.getValue('crimson_crown_holder')).toBe('megalodon');
    expect(s.story.getValue('crimson_fortune_state')).toBe('scattered_into_sharkstorm');
    expect(s.story.getVar('crimson_fortune_recovered_percent')).toBe(2);
  });
});

describe('Phase 9 saves', () => {
  it('is version 9, and a finished Phase 8 save migrates and waits for the bunk', () => {
    expect(SAVE_VERSION).toBe(9);
    const v8 = JSON.parse(JSON.stringify(atPreset('p8_complete').serialize()));
    const v9 = migrateState(v8, 8, 9);
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: v9 });
    expect(loaded.story.has('p8_complete')).toBe(true);
    expect(loaded.story.has('p9_started')).toBe(false);
    expect(currentChapter(content.game, loaded).id).toBe('phase8_end');
    expect(sharkstormNow(content, loaded).id).toBe('easing_near_ship');
    for (const v of ['megalodon_state', 'crimson_crown_holder', 'crimson_fortune_state']) expect(loaded.story.getValue(v) ?? null, v).toBe(null);
  });

  it('renames the old "guzzlegut_gust" flag, and fills missing story maps without losing what the player carries', () => {
    const s = atPreset('p8_complete');
    s.inventory.add('frog_grog', 2);
    const carried = s.inventory.count('frog_grog');
    const v8 = JSON.parse(JSON.stringify(s.serialize()));
    v8.story.flags = v8.story.flags.filter((f) => f !== 'grumblegut_gust').concat('guzzlegut_gust');
    delete v8.story.values;
    delete v8.world.counters;
    delete v8.world.visited;
    const v9 = migrateState(v8, 8, 9);
    expect(v9.story.flags).toContain('grumblegut_gust');
    expect(v9.story.flags).not.toContain('guzzlegut_gust');
    expect(v9.story.values).toEqual({});
    expect(v9.world.counters).toEqual({});
    expect(v9.world.visited).toEqual([]);
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: v9 });
    expect(loaded.inventory.count('frog_grog')).toBe(carried);
  });

  it('a version 8 save record in storage upgrades on load', () => {
    const storage = new MemoryStorage();
    const old = new SaveManager({ storage, content, version: 8, migrations: {} });
    expect(old.save(1, atPreset('p8_complete')).ok).toBe(true);
    const res = new SaveManager({ storage, content }).read(1);
    expect(res.ok).toBe(true);
    expect(res.state.story.flags).toContain('p8_complete');
  });

  it('saves and loads at every Phase 9 checkpoint without losing anything (the crown stays on the megalodon)', () => {
    expect(P9_PRESETS.length).toBe(39);
    for (const id of P9_PRESETS) {
      const s = atPreset(id);
      const mgr = new SaveManager({ storage: new MemoryStorage(), content });
      expect(mgr.save(1, s).ok, id).toBe(true);
      const back = GameSession.fromState({ content, bus: new EventBus(), state: mgr.read(1).state });
      expect([...back.story.flags].sort(), id).toEqual([...s.story.flags].sort());
      for (const v of ['great_sharkstorm', 'crimson_fortune_state', 'megalodon_state', 'crimson_crown_holder', 'crater_state']) {
        expect(back.story.getValue(v) ?? null, `${id}: ${v}`).toBe(s.story.getValue(v) ?? null);
      }
      for (const v of ['p4_tod', 'dig_layer', 'crimson_fortune_recovered_percent']) expect(back.story.getVar(v), `${id}: ${v}`).toBe(s.story.getVar(v));
      expect(back.inventory.serialize(), id).toEqual(s.inventory.serialize());
      expect(sharkstormNow(content, back).id, id).toBe(sharkstormNow(content, s).id);
    }
  });
});

describe('Phase 9 art and sound', () => {
  it('the new looks paint: the dusty Grand Stenchmaster, Pete in the blue sash, the captain with the parrot pouch', () => {
    for (const id of ['garrick_stenchmaster_dusty', 'pete_grand_sharkmaster', 'blackbeard_pouch']) {
      expect(Object.keys(characterSheet(content.appearances.require(id)).anims).length, id).toBeGreaterThan(8);
    }
    expect(content.appearances.require('garrick_stenchmaster_dusty').outfit).toMatchObject({ primary: 'burgundy', secondary: 'mustard', pants: 'bilious' });
  });

  it('every Phase 9 prop paints, and the treasure map has its own icon', () => {
    const props = JSON.parse(fs.readFileSync(path.resolve('data/props/phase9.json')));
    const list = (Array.isArray(props) ? props : Object.values(props)).filter((p) => p && p.id);
    expect(list.length).toBeGreaterThanOrEqual(50);
    for (const p of list) {
      const { frames } = paintProp(p.sprite ?? p.id);
      expect(frames.length, p.id).toBeGreaterThan(0);
      for (const f of frames) expect(f.bounds(), p.id).toBeTruthy();
    }
    expect(ICON_NAMES).toContain('chart');
    expect(content.items.require('crimson_chart').icon).toBe('chart');
  });

  it('the vista atlas has the island, the blast, the crowned megalodon and the shanty, and still fits a 4096 texture', () => {
    const v = buildVistaAtlas();
    expect(v.canvas.height).toBeLessThanOrEqual(4096);
    expect(v.canvas.width).toBeLessThanOrEqual(4096);
    for (const f of ['crownskull_far', 'clearing_bg', 'blast_column_0', 'palm_flying_0', 'treasure_column_0', 'megalodon_side', 'megalodon_side_crowned',
      'crimson_crown_big', 'shanty_stage', 'shanty_pearls_0', 'shanty_hammer_0', 'shanty_accordion_0', 'hist_stenchalina', 'garrick_aim_0']) {
      expect(VISTA_FRAMES, f).toContain(f);
    }
  });

  it('the new music renders, loops, and never clips', () => {
    const inst = { ...JSON.parse(fs.readFileSync(path.resolve('data/audio/instruments.json'))), ...JSON.parse(fs.readFileSync(path.resolve('data/audio/instruments_phase7.json'))) };
    for (const id of ['crownskull_isle', 'landing_tension', 'launch_buildup', 'rage_shanty']) {
      const song = JSON.parse(fs.readFileSync(path.resolve(`data/audio/music/${id}.json`)));
      const out = renderSong(song, inst);
      let peak = 0;
      for (const v of out.left) peak = Math.max(peak, Math.abs(v));
      expect(peak, id).toBeGreaterThan(0.1);
      expect(peak, id).toBeLessThan(1.2);
      expect(out.loopEnd, id).toBeGreaterThan(out.loopStart);
    }
  }, 30000);

  it('the new sound effects render (shovels, picks, the howl, the blast, coins, the regal sting, a tiny pfft)', () => {
    const sfx = JSON.parse(fs.readFileSync(path.resolve('data/audio/sfx_phase9.json')));
    const ids = Object.keys(sfx).filter((k) => k !== '//');
    for (const id of ['shovel_dig', 'pick_strike', 'vine_slash', 'stomach_howl', 'ground_hum', 'excavation_blast', 'coin_cascade', 'coin_glint',
      'megalodon_impact', 'regal_sting', 'discovery_sting', 'oar_stroke', 'pfft_tiny']) {
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

  it('the jungle\'s insects render as a quiet loop', () => {
    const { left, right, loop } = renderInsects(16000, { seconds: 2 });
    expect(loop).toBe(true);
    let peak = 0;
    for (const ch of [left, right]) for (const v of ch) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeGreaterThan(0.01);
    expect(peak).toBeLessThan(0.9);
  });
});
