import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent } from '../src/content/loadContent.js';
import { expandDecor, ContentDB } from '../src/content/ContentDB.js';
import { validateContent } from '../src/content/validateContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { migrateState } from '../src/systems/save/migrations.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION } from '../src/config/constants.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { REPAIR_KINDS, REPAIR_SOUND_KEYS } from '../src/systems/repairKinds.js';
import { characterSheet } from '../src/art/sheets.js';
import { buildVistaAtlas, VISTA_FRAMES } from '../src/art/vista/vistaArt.js';
import { PHASE11_VISTA_FRAMES } from '../src/art/vista/vistaPhase11.js';
import { buildInsertAtlas, INSERT_NAMES } from '../src/art/inserts/insertArt.js';
import { PHASE11_INSERT_NAMES } from '../src/art/inserts/phase11Inserts.js';
import { buildStageAtlas } from '../src/art/stage/stageArt.js';
import { paintProp } from '../src/art/props/index.js';
import { ICON_NAMES } from '../src/art/ui/itemIcons.js';
import { renderSong } from '../src/audio/synth/renderSong.js';
import { renderSfx } from '../src/audio/synth/renderSfx.js';
import { BANNED_LIST } from './bannedNames.js';

/**
 * Story Phases 11-13, the systems: decor slots, a warp's "when", the
 * Stench-O-Vision vent's condition, fragile items, dice and tension
 * definitions, presets that land part-way through a counted objective,
 * saves 10 -> 13 (and a save at every Phase 11-13 preset), the new timing
 * games, and the art and sound.
 */

const content = loadContent();
const SHIPPED = import.meta.glob('/data/**/*.json', { eager: true, import: 'default' });
const freshSession = () => GameSession.newGame({ content, bus: new EventBus() });
const atPreset = (id) => {
  const s = freshSession();
  applyPresetPlan(s, resolvePreset(content, id));
  return s;
};
function validateWith(mutate) {
  const files = structuredClone(SHIPPED);
  mutate(files);
  const db = new ContentDB(files);
  return [...db.loadErrors, ...validateContent(db).errors].join('\n');
}
const LATE_PRESETS = content.debugPresets.list().map((p) => p.id).filter((id) => /^p1[123]_/.test(id));

describe('decor slots (Story Phase 13: the cardboard legends, where the player put them)', () => {
  const slots = [
    { value: 'standee_a', prop: 'standee_a', if: { flag: 'out' }, inspect: 'look.a', spots: { porthole: [3, 4], door: { x: 9, y: 4, flip: true } } },
    { value: 'standee_b', prop: 'standee_b', default: null, spots: { left: [1, 1], right: [5, 1] } },
  ];
  const { props, objects } = expandDecor(slots);
  const session = freshSession();
  const live = (id) => evaluateCondition(props.find((p) => p.id === id).if, session);

  it('become one conditional prop per spot (and an inspect object where the slot has a script)', () => {
    expect(props.map((p) => p.id)).toEqual(['decor_standee_a_porthole', 'decor_standee_a_door', 'decor_standee_b_left', 'decor_standee_b_right']);
    expect(props.find((p) => p.id === 'decor_standee_a_door')).toMatchObject({ x: 9, y: 4, flip: true });
    expect(objects.map((o) => o.id)).toEqual(['decor_standee_a_porthole', 'decor_standee_a_door']);
    expect(objects[0]).toMatchObject({ type: 'inspect', script: 'look.a' });
  });

  it('show only where the story value says; unset means the first spot (or nowhere, with "default": null)', () => {
    session.story.set('out');
    expect([live('decor_standee_a_porthole'), live('decor_standee_a_door')]).toEqual([true, false]);
    expect([live('decor_standee_b_left'), live('decor_standee_b_right')]).toEqual([false, false]);
    session.story.setValue('standee_a', 'door');
    session.story.setValue('standee_b', 'right');
    expect([live('decor_standee_a_porthole'), live('decor_standee_a_door')]).toEqual([false, true]);
    expect([live('decor_standee_b_left'), live('decor_standee_b_right')]).toEqual([false, true]);
    session.story.clear('out');
    expect(live('decor_standee_a_door')).toBe(false);
  });

  it('in the game: the quarters\' standees and the one on deck come from slots, placed before the maps\' own objects', () => {
    const q = content.maps.require('crew_quarters');
    for (const id of ['stenchalina', 'brogath', 'rumpold', 'rumpus', 'gustavio']) expect(q.props.some((p) => (p.id ?? '').startsWith(`decor_standee_${id}_`)), id).toBe(true);
    expect(content.maps.require('main_deck').props.some((p) => p.id === 'decor_standee_brogath_deck')).toBe(true);
    const firstDecor = q.objects.findIndex((o) => (o.id ?? '').startsWith('decor_'));
    const firstOther = q.objects.findIndex((o) => !(o.id ?? '').startsWith('decor_'));
    expect(firstDecor).toBeLessThan(firstOther);
  });
});

describe('the validator knows the new systems', () => {
  it('a warp\'s "when" must be a condition', () => {
    const errors = validateWith((f) => {
      f['/data/maps/ship/phase11/cargo_hold.patch.json'].objects.find((o) => o.id === 'p11_treasure_sealed').when = { flagg: 'x' };
    });
    expect(errors).toMatch(/p11_treasure_sealed|cargo_hold/);
  });

  it('a television\'s vent needs a real map and a valid condition', () => {
    const errors = validateWith((f) => {
      const kit = f['/data/tv/ses_kit.json'].ses_kit;
      kit.vent.tiles = { nowhere: [1, 1] };
      kit.vent.if = { nonsense: true };
    });
    expect(errors).toMatch(/nowhere/);
    expect(errors).toMatch(/nonsense/);
  });

  it('a dice roll always names its result; a wear step names a real stage', () => {
    const errors = validateWith((f) => {
      const ch = f['/data/story/cutscenes/phase12/ch119_126.json'];
      ch['p12c10.roll'].splice(1, 0, { dice: 'roll' });
      ch['p12c8.done'].unshift({ wear: 'pocket_legend_book', to: 'shredded' });
    });
    expect(errors).toMatch(/a dice roll needs "result": 1-6/);
    expect(errors).toMatch(/"shredded" is not one of pocket_legend_book's wear stages/);
  });

  it('a sash tension and an alias set must exist and make sense', () => {
    const errors = validateWith((f) => {
      f['/data/story/cutscenes/phase12/ch112_118.json']['p12c4.trial'].unshift({ sashTension: 'forty_second_trial' });
      f['/data/story/aliases/phase13.json'].stinkbeard_delirium.actors.nobody_at_all = { name: 'X' };
    });
    expect(errors).toMatch(/unknown sash tension "forty_second_trial"/);
    expect(errors).toMatch(/nobody_at_all/);
  });

  it('a preset\'s objective progress is a part of the count, never all of it', () => {
    const errors = validateWith((f) => {
      const p = f['/data/debug/presets.json'].find((x) => x.id === 'p11_grand_dice_discovery');
      p.quests.anti_dice_conspiracy.progress.read = 5;
    });
    expect(errors).toMatch(/progress for "anti_dice_conspiracy\.read" must be a whole number from 1 to 4/);
  });
});

describe('Phase 11-13 saves', () => {
  it('are version 13; a finished Phase 10 save migrates through 11, 12 and 13 without losing anything', () => {
    expect(SAVE_VERSION).toBe(13);
    const s = atPreset('p10_complete');
    const state = s.serialize();
    const up = migrateState(structuredClone(state), 10, 13);
    expect(up.story).toEqual(state.story);
    expect(up.inventory).toEqual(state.inventory);
    expect(up.quests).toEqual(state.quests);
  });

  it('saves and loads at every Phase 11-13 checkpoint without losing anything', () => {
    expect(LATE_PRESETS.length).toBe(63);
    for (const id of LATE_PRESETS) {
      const s = atPreset(id);
      const mgr = new SaveManager({ storage: new MemoryStorage(), content });
      expect(mgr.save(1, s).ok, id).toBe(true);
      const back = GameSession.fromState({ content, bus: new EventBus(), state: mgr.read(1).state });
      expect(back.story.serialize(), id).toEqual(s.story.serialize());
      expect(back.inventory.serialize(), id).toEqual(s.inventory.serialize());
      expect(back.quests.serialize(), id).toEqual(s.quests.serialize());
    }
  });
});

describe('the timing games', () => {
  it('Phases 11-13 add easing out, cracking, slicing, pouring and soldering; every kind has its three sounds', () => {
    for (const k of ['reach', 'crack', 'slice', 'pour', 'solder']) expect(REPAIR_KINDS[k], k).toBeTruthy();
    const sfx = new Set(content.sfx.list().map((x) => x.id ?? x));
    for (const [k, def] of Object.entries(REPAIR_KINDS)) {
      for (const key of REPAIR_SOUND_KEYS) expect(content.sfx.has(def[key]) || sfx.has(def[key]), `${k}.${key} = ${def[key]}`).toBe(true);
    }
  });
});

describe('Phase 11-13 art and sound', () => {
  it('the new looks paint: Garrick suspended, the captain in trial gear (with and without the pot), the delirium\'s legends', () => {
    for (const id of ['garrick_suspended', 'blackbeard_trial_gear', 'blackbeard_trial_gear_pot', 'pete_brogath', 'gristle_rumpold', 'bob_rumpus', 'jim_gustavio', 'garrick_prime']) {
      expect(Object.keys(characterSheet(content.appearances.require(id)).anims).length, id).toBeGreaterThan(8);
    }
    for (const id of ['garrick_suspended', 'delirium_brogath', 'delirium_rumpold', 'delirium_rumpus', 'delirium_gustavio', 'delirium_prime', 'delirium_stenchalina']) {
      expect(content.portraits.has(id), id).toBe(true);
    }
  });

  it('every Phase 11-13 prop paints, and the sash, the cloth, the goggles, the rope, the pot, the pillow and the parts have icons', () => {
    for (const n of [11, 12, 13]) {
      const list = JSON.parse(fs.readFileSync(path.resolve(`data/props/phase${n}.json`)));
      expect(list.length, `phase ${n}`).toBeGreaterThan(10);
      for (const p of list) expect(paintProp(p.sprite ?? p.id).frames.length, p.id).toBeGreaterThan(0);
    }
    expect(ICON_NAMES).toEqual(expect.arrayContaining(['sash', 'cloth', 'goggles', 'rope', 'pot', 'pillow', 'gear']));
  });

  it('the atlases have the new frames (the dice, the flutter and its blast, the channel) and still fit 4096', () => {
    const v = buildVistaAtlas();
    expect(Math.max(v.canvas.width, v.canvas.height)).toBeLessThanOrEqual(4096);
    for (const f of PHASE11_VISTA_FRAMES) expect(VISTA_FRAMES, f).toContain(f);
    for (const f of ['gdie_1', 'gdie_3', 'gdie_6', 'gdie_tumble_0', 'flutter_blast', 'blast_surge', 'sash_flap_full', 'sc_logo_0', 'kit_bezel']) expect(v.frames[f], f).toBeTruthy();
    const ins = buildInsertAtlas();
    expect(Math.max(ins.canvas.width, ins.canvas.height)).toBeLessThanOrEqual(4096);
    for (const f of PHASE11_INSERT_NAMES) expect(INSERT_NAMES, f).toContain(f);
    const st = buildStageAtlas();
    expect(Math.max(st.canvas.width, st.canvas.height)).toBeLessThanOrEqual(4096);
  }, 60000);

  it('the thirteen new tracks render, loop, and never clip', () => {
    const inst = { ...JSON.parse(fs.readFileSync(path.resolve('data/audio/instruments.json'))), ...JSON.parse(fs.readFileSync(path.resolve('data/audio/instruments_phase7.json'))) };
    const ids = ['grand_bedtime_argument', 'cheap_o_rama_delivery', 'sash_conspiracy', 'late_night_bling', 'thirty_second_trial', 'flutter_triumph',
      'grand_dice_ceremony', 'one_day_suspension', 'stenchmaster_channel', 'grand_merchandise_makeover', 'beard_delirium', 'ancient_stenchmasters_everywhere',
      'brogath_command_crisis'];
    for (const id of ids) {
      const out = renderSong(JSON.parse(fs.readFileSync(path.resolve(`data/audio/music/${id}.json`))), inst);
      let peak = 0;
      for (const x of out.left) peak = Math.max(peak, Math.abs(x));
      expect(peak, id).toBeGreaterThan(0.1);
      expect(peak, id).toBeLessThan(1.2);
      expect(out.loopEnd, id).toBeGreaterThan(out.loopStart);
    }
  }, 120000);

  it('the new sound effects render and none of them clips', () => {
    const sfx = JSON.parse(fs.readFileSync(path.resolve('data/audio/sfx_phase11.json')));
    const ids = Object.keys(sfx).filter((k) => k !== '//');
    expect(ids.length).toBeGreaterThanOrEqual(60);
    for (const id of ids) {
      const { data } = renderSfx(sfx[id]);
      let peak = 0;
      for (const x of data) peak = Math.max(peak, Math.abs(x));
      expect(peak, id).toBeGreaterThan(0.05);
      expect(peak, id).toBeLessThan(1.3);
    }
  });
});

describe('the banned names appear nowhere: data, code, docs, tests, presets, file names', () => {
  const roots = ['data', 'src', 'docs', 'tests', 'e2e', 'tools', 'README.md', 'index.html', 'package.json'];
  const files = roots.flatMap((r) => {
    const p = path.resolve(r);
    if (!fs.existsSync(p)) return [];
    return fs.statSync(p).isDirectory() ? fs.readdirSync(p, { recursive: true }).map((n) => path.join(p, n)).filter((f) => fs.statSync(f).isFile()) : [p];
  });

  it('in no file\'s name or contents (the scans themselves keep the names encoded)', () => {
    expect(files.length).toBeGreaterThan(300);
    const hits = [];
    for (const f of files) {
      const rel = path.relative(path.resolve('.'), f);
      for (const re of BANNED_LIST) if (re.test(rel)) hits.push(`${rel}: file name`);
      if (!/\.(js|mjs|json|md|html|txt|css)$/.test(f)) continue;
      const text = fs.readFileSync(f, 'utf8');
      for (const re of BANNED_LIST) if (re.test(text)) hits.push(`${rel}: ${re}`);
    }
    expect(hits).toEqual([]);
  });

  it('and not in any save a player can make in Phases 11-13 (every preset\'s save record)', () => {
    for (const id of LATE_PRESETS) {
      const mgr = new SaveManager({ storage: new MemoryStorage(), content });
      const record = JSON.stringify(mgr.save(1, atPreset(id)).record);
      for (const re of BANNED_LIST) expect(record, id).not.toMatch(re);
    }
  });
});

describe('the game provides every service a script command calls', () => {
  // The headless harness mocks the services, so a command calling a method the game's own
  // services (src/world/worldServices.js) don't have would only fail in a browser. (The sash
  // tension and the dice did, once.)
  it('every service(ctx, <service>, ...).<method> in the commands is defined for that service', () => {
    const commands = fs.readFileSync(path.resolve('src/systems/script/commands.js'), 'utf8');
    const services = fs.readFileSync(path.resolve('src/world/worldServices.js'), 'utf8');
    const calls = new Set([...commands.matchAll(/service\(ctx, '([a-z]+)', '[a-zA-Z]+'\)\.([a-zA-Z]+)/g)].map((m) => `${m[1]}.${m[2]}`));
    expect(calls.size).toBeGreaterThan(40);
    // Each service's block, from its opening line to the closing brace at the same depth.
    const block = (opener) => {
      const start = services.indexOf(opener);
      if (start < 0) return null;
      let depth = 0;
      for (let i = services.indexOf('{', start); i < services.length; i++) {
        if (services[i] === '{') depth++;
        else if (services[i] === '}' && --depth === 0) return services.slice(start, i);
      }
      return null;
    };
    const blocks = { world: block('const world = {'), dialogue: block('    dialogue: {'), ui: block('    ui: {'), audio: block('    audio: {'), battle: block('    battle: {'), saves: block('    saves: {'), cinema: block('    cinema: {') };
    const missing = [];
    for (const call of calls) {
      const [svc, method] = call.split('.');
      const b = blocks[svc];
      if (!b || !new RegExp(`\\n\\s*(async )?${method}\\s*[:(]`).test(b)) missing.push(call);
    }
    expect(missing).toEqual([]);
  });
});

describe('a token a scene throws lands where it is read', () => {
  // A scene drops a token sprite ({ token, x, y, id }) and the inspect that reads it removes that sprite:
  // the two must be the same tile, or the player finds a card that does nothing and can't find the real one.
  it('every thrown token sits inside the inspect object whose script picks it up', () => {
    const steps = (o, fn) => {
      if (Array.isArray(o)) o.forEach((x) => steps(x, fn));
      else if (o && typeof o === 'object') { fn(o); Object.values(o).forEach((x) => steps(x, fn)); }
    };
    const drops = new Map();
    const pickedUpBy = new Map();
    for (const [id, script] of content.scripts.map) {
      steps(script, (st) => {
        if (typeof st.token === 'string' && st.id) drops.set(st.id, { x: st.x, y: st.y, script: id });
        if (typeof st.removeSprite === 'string') pickedUpBy.set(id, [...(pickedUpBy.get(id) ?? []), st.removeSprite]);
      });
    }
    const wrong = [];
    let checked = 0;
    for (const map of content.maps.list()) {
      for (const o of map.objects ?? []) {
        if (o.type !== 'inspect' || !o.script) continue;
        for (const sprite of pickedUpBy.get(o.script) ?? []) {
          const d = drops.get(sprite);
          if (!d) continue;
          checked++;
          const inside = d.x >= o.x && d.x < o.x + (o.w ?? 1) && d.y >= o.y && d.y < o.y + (o.h ?? 1);
          if (!inside) wrong.push(`${sprite}: thrown at ${d.x},${d.y} (${d.script}), read at ${o.x},${o.y} (${map.id} ${o.id})`);
        }
      }
    }
    expect(checked).toBeGreaterThan(8);
    expect(wrong).toEqual([]);
  });
});

