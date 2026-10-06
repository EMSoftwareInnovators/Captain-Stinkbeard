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
import { sharkstormStates, sharkstormNow } from '../src/systems/hazards/sharkstorm.js';
import { tvDef, tvCondition, programDef, programEpisode } from '../src/systems/tv/tv.js';
import { logEntries } from '../src/systems/logs/logbook.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { REPAIR_KINDS, REPAIR_SOUND_KEYS } from '../src/systems/repairKinds.js';
import { characterSheet } from '../src/art/sheets.js';
import { buildStageAtlas, STAGE_FRAMES } from '../src/art/stage/stageArt.js';
import { PHASE10_STAGE_FRAMES, PHASE10_TOKEN_FRAMES } from '../src/art/stage/stagePhase10.js';
import { buildVistaAtlas, VISTA_FRAMES } from '../src/art/vista/vistaArt.js';
import { PHASE10_VISTA_FRAMES } from '../src/art/vista/vistaPhase10.js';
import { buildInsertAtlas, INSERT_NAMES } from '../src/art/inserts/insertArt.js';
import { PHASE10_INSERT_NAMES } from '../src/art/inserts/phase10Inserts.js';
import { buildEffectsAtlas } from '../src/art/effects/effects.js';
import { PHASE10_FX_FRAMES } from '../src/art/effects/phase10Fx.js';
import { paintProp } from '../src/art/props/index.js';
import { ICON_NAMES } from '../src/art/ui/itemIcons.js';
import { renderSong } from '../src/audio/synth/renderSong.js';
import { renderSfx } from '../src/audio/synth/renderSfx.js';
import { makeContent } from './fixtures.js';

/**
 * Story Phase 10 systems: content loads in phase order (phase10 after
 * phase9); logbook extensions; presets that take an item back; the Great
 * Sharkstorm's four new states (trailing, the close approach, entering,
 * the ship inside it) with their prizes, tokens and gentle sway; the Mark
 * II's second knob panel and its new conditions; the timing-game kinds;
 * save version 10; the art (the charged Grand Stenchmaster, the sash held
 * taut, Rusty Tom, Barnacle Bill, the Bling Bling King, the tokens, the
 * beans) and the sound.
 */

const content = loadContent();
const freshSession = () => GameSession.newGame({ content, bus: new EventBus() });
const atPreset = (id) => {
  const s = freshSession();
  applyPresetPlan(s, resolvePreset(content, id));
  return s;
};
const P10_PRESETS = content.debugPresets.list().map((p) => p.id).filter((id) => id.startsWith('p10_'));

describe('content loads in phase order', () => {
  it('a phase10 file loads after a phase9 one (numbers compare as numbers), so its patch goes on top', () => {
    const db = makeContent({
      '/data/maps/phase10/room.patch.json': { id: 'room_p10', patch: 'room', objects: [{ id: 'from_p10', type: 'spawn', x: 1, y: 1 }] },
      '/data/maps/phase9/room.patch.json': { id: 'room_p9', patch: 'room', objects: [{ id: 'from_p9', type: 'spawn', x: 1, y: 1 }] },
      '/data/maps/phase2/room.patch.json': { id: 'room_p2', patch: 'room', objects: [{ id: 'from_p2', type: 'spawn', x: 1, y: 1 }] },
    });
    expect(db.maps.require('room').objects.map((o) => o.id)).toEqual(['from_p10', 'from_p9', 'from_p2']);
    expect(db.files.indexOf('maps/phase9/room.patch.json')).toBeLessThan(db.files.indexOf('maps/phase10/room.patch.json'));
  });

  it('in the game: Phase 10\'s lines and placements come before Phase 9\'s', () => {
    const pete = content.npcs.require('pete');
    expect(pete.dialogue[0].script).toBe('p10c1.begin');
    const isle = content.maps.require('crownskull_isle').objects;
    const firstP10 = isle.findIndex((o) => o.id.startsWith('p10'));
    expect(firstP10).toBeGreaterThanOrEqual(0);
    expect(firstP10).toBeLessThan(isle.findIndex((o) => o.id.startsWith('p9')));
  });
});

describe('logbook extensions', () => {
  it('add entries, put newer variants first, and may add severities (never anything else)', () => {
    const db = makeContent({
      '/data/logs/a.json': { book: { title: 'Book', severities: { Old: 'g' }, entries: [{ id: 'one', title: 'One', variants: [{ if: { flag: 'x' }, note: 'old' }] }] } },
      '/data/logs/b.json': { book_more: { extend: 'book', severities: { New: 'r' }, entries: [{ id: 'one', variants: [{ if: { flag: 'y' }, note: 'new' }] }, { id: 'two', title: 'Two' }] } },
    });
    const book = db.logs.get('book');
    expect(book.severities).toEqual({ Old: 'g', New: 'r' });
    expect(book.entries.map((e) => e.id)).toEqual(['one', 'two']);
    expect(book.entries[0].variants.map((v) => v.note)).toEqual(['new', 'old']);
    const bad = makeContent({
      '/data/logs/a.json': { book: { title: 'Book', entries: [] } },
      '/data/logs/b.json': { book_more: { extend: 'book', title: 'Renamed' } },
    });
    expect(bad.loadErrors.join('\n')).toMatch(/may only add "entries" and "severities"/);
  });
});

describe('debug presets that take an item back', () => {
  it('"takeItems" removes what a scene handed over (Gristle\'s tally takes the Phase 9 doubloons)', () => {
    const before = atPreset('p10_crater_salvage');
    expect(before.inventory.count('reeking_doubloons')).toBe(1);
    const after = atPreset('p10_return_trail');
    expect(after.inventory.count('reeking_doubloons')).toBe(0);
    expect(after.inventory.count('crater_salvage')).toBe(1);
    expect(resolvePreset(content, 'p10_complete').takeItems).toEqual(['reeking_doubloons']);
  });
});

describe('the Great Sharkstorm in Phase 10 (it follows, it lets you close, it takes the ship)', () => {
  const states = sharkstormStates(content);

  it('has four new states, after treasure_laden, in story order', () => {
    const ids = Object.keys(states);
    expect(ids.slice(ids.indexOf('treasure_laden'))).toEqual(['treasure_laden', 'p10_trailing', 'close_approach', 'entering', 'inside_ship']);
    // Never destroyed, never resolved.
    expect(ids).not.toContain('destroyed');
    expect(ids).not.toContain('collapsed');
  });

  it('every prize it throws is capped and rare: a few at most lying about, never fast', () => {
    for (const [id, st] of Object.entries(states)) {
      if (!st.tokens) continue;
      expect(st.tokens.max, id).toBeGreaterThanOrEqual(1);
      expect(st.tokens.max, id).toBeLessThanOrEqual(8);
      expect(st.tokens.every[0], id).toBeGreaterThanOrEqual(3000);
      for (const f of st.tokens.frames) expect([...PHASE10_TOKEN_FRAMES, ...STAGE_FRAMES], `${id}: ${f}`).toContain(f);
    }
    expect(states.p10_trailing.tokens).toBeTruthy();
  });

  it('the close approach lands sharks on the deck only marked first, and kept off the forward deck', () => {
    const fly = states.close_approach.flying;
    expect(fly.impactEvery).toBeTruthy();
    expect(fly.warnMs).toBeGreaterThanOrEqual(1200);
    // [x0, y0, x1, y1]: the quarterdeck and midships, never the forward deck (rows 25 and on).
    const [, y0, , y1] = fly.areas.main_deck;
    expect(y0).toBeGreaterThanOrEqual(3);
    expect(y1).toBeLessThan(25);
  });

  it('inside: things whirl past at a slant, the rooms drift a few pixels (never a spin), and the deck shows the storm\'s wall', () => {
    const inside = states.inside_ship;
    expect(inside.flying.swirl).toBe(true);
    expect(inside.sway.drift).toBeLessThanOrEqual(3);
    expect(inside.sway.period).toBeGreaterThanOrEqual(3000);
    expect(JSON.stringify(inside)).not.toMatch(/rotat|spin"/);
    const deck = content.maps.require('main_deck');
    const sky = deck.backgroundVariants.find((v) => v.background === 'stormsky');
    expect(evaluateCondition(sky.if, atPreset('p10_complete'))).toBe(true);
    expect(evaluateCondition(sky.if, atPreset('p10_approach'))).toBe(false);
  });

  it('moves with the story: trailing, close, entering, inside, and stays inside', () => {
    expect(sharkstormNow(content, atPreset('p10_start')).id).toBe('treasure_laden');
    expect(sharkstormNow(content, atPreset('p10_participation_coin')).id).toBe('p10_trailing');
    expect(sharkstormNow(content, atPreset('p10_approach')).id).toBe('close_approach');
    expect(sharkstormNow(content, atPreset('p10_entry')).id).toBe('entering');
    expect(sharkstormNow(content, atPreset('p10_complete')).id).toBe('inside_ship');
  });
});

describe('the Mark II in Phase 10', () => {
  const mk2 = tvDef(content, 'ses_mk2');

  it('has a second knob panel for the aerial: glimpses, then the sauce can turns up, and it ends on a picture', () => {
    const panel = mk2.knobPanels.antenna;
    expect(panel.doneFlag).toBe('p10_antenna_fixed');
    const late = panel.list.filter((k) => k.after);
    expect(late.length).toBeGreaterThan(0);
    expect(panel.list.filter((k) => k.effect === 'glimpse').length).toBeGreaterThanOrEqual(3);
  });

  it('goes to snow inside the storm (frames of its own), and to the sauce-can aerial after', () => {
    const inside = atPreset('p10_sauce_antenna');
    expect(tvCondition(mk2, inside).id ?? null).toBe('storm_static');
    expect(mk2.states.storm_static.frames.length).toBeGreaterThan(1);
    const after = atPreset('p10_complete');
    expect(tvCondition(mk2, after).id ?? null).toBe('sauce_antenna');
    expect(after.story.getValue('ses_mark2_antenna')).toBe('spicy_stench_sauce_can');
  });

  it('the Frog Tax Man: the sleep deductions at bedtime, and the impossible audit shown once', () => {
    const ftm = programDef(content, 'frog_tax_man');
    expect(programEpisode(ftm, atPreset('p10_brogath')).id).toBe('the_sleep_deductions');
    expect(programEpisode(ftm, atPreset('p10_ftm_audit')).id).toBe('the_storm_audit');
    expect(programEpisode(ftm, atPreset('p10_complete')).id).not.toBe('the_storm_audit');
  });
});

describe('the timing games', () => {
  it('Phase 10\'s new kinds exist (cooking, catching, sweeping, holding on) and every kind has its three sounds', () => {
    for (const k of ['can', 'stir', 'shake', 'scorch', 'crank', 'plate', 'grab', 'sweep', 'trim', 'buckle', 'grip']) expect(REPAIR_KINDS[k], k).toBeTruthy();
    const sfx = new Set(content.sfx.ids());
    for (const [id, kind] of Object.entries(REPAIR_KINDS)) for (const key of REPAIR_SOUND_KEYS) expect(sfx.has(kind[key]), `${id}.${key} = ${kind[key]}`).toBe(true);
  });
});

describe('Phase 10 saves', () => {
  it('is version 10, and a finished Phase 9 save migrates and waits for Pete', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(10); // 13 since Story Phases 11-13 (tests/phase11.test.js)
    const v9 = JSON.parse(JSON.stringify(atPreset('p9_complete').serialize()));
    const v10 = migrateState(v9, 9, 10);
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: v10 });
    expect(loaded.story.has('p9_complete')).toBe(true);
    expect(loaded.story.has('p10_started')).toBe(false);
    expect(currentChapter(content.game, loaded).id).toBe('phase9_end');
    expect(loaded.story.getValue('crimson_crown_holder')).toBe('megalodon');
  });

  it('normalises any old "Guzzlegut" left in a save (flags and story values) without losing what the player carries', () => {
    const s = atPreset('p9_complete');
    s.inventory.add('frog_grog', 2);
    const carried = s.inventory.count('frog_grog');
    const v9 = JSON.parse(JSON.stringify(s.serialize()));
    v9.story.flags.push('guzzlegut_gust');
    v9.story.values.note = 'Garrick Guzzlegut, GUZZLEGUT';
    delete v9.world.counters;
    const v10 = migrateState(v9, 9, 10);
    expect(v10.story.flags).toContain('grumblegut_gust');
    expect(v10.story.flags).not.toContain('guzzlegut_gust');
    expect(v10.story.values.note).toBe('Garrick Grumblegut, GRUMBLEGUT');
    expect(v10.world.counters).toEqual({});
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: v10 });
    expect(loaded.inventory.count('frog_grog')).toBe(carried);
  });

  it('a version 9 save record in storage upgrades on load', () => {
    const storage = new MemoryStorage();
    const old = new SaveManager({ storage, content, version: 9, migrations: {} });
    expect(old.save(1, atPreset('p9_complete')).ok).toBe(true);
    const res = new SaveManager({ storage, content }).read(1);
    expect(res.ok).toBe(true);
    expect(res.state.story.flags).toContain('p9_complete');
  });

  it('saves and loads at every Phase 10 checkpoint, inside the storm included, without losing anything', () => {
    expect(P10_PRESETS.length).toBe(45);
    for (const id of P10_PRESETS) {
      const s = atPreset(id);
      const mgr = new SaveManager({ storage: new MemoryStorage(), content });
      expect(mgr.save(1, s).ok, id).toBe(true);
      const back = GameSession.fromState({ content, bus: new EventBus(), state: mgr.read(1).state });
      expect([...back.story.flags].sort(), id).toEqual([...s.story.flags].sort());
      for (const v of ['great_sharkstorm', 'queen_annes_revenge_location', 'megalodon_alias', 'sash_holder_left', 'sash_holder_right', 'ses_mark2_antenna', 'local_sea_state']) {
        expect(back.story.getValue(v) ?? null, `${id}: ${v}`).toBe(s.story.getValue(v) ?? null);
      }
      expect(back.inventory.serialize(), id).toEqual(s.inventory.serialize());
      expect(back.quests.serialize(), id).toEqual(s.quests.serialize());
      expect(sharkstormNow(content, back).id, id).toBe(sharkstormNow(content, s).id);
    }
  });
});

describe('Phase 10 logbooks', () => {
  it('Garrick\'s Alleged Stenchmaster Legends: Brogath is in it, unverified, and the entry can be updated later', () => {
    const legends = content.logs.get('garrick_legends');
    expect(legends.title).toBe("Garrick's Alleged Stenchmaster Legends");
    const brogath = legends.entries.find((e) => e.id === 'brogath');
    expect(brogath).toMatchObject({ title: 'Brogath the Bashful', evidence: 'None', verified: 'None', reliability: 'Highly Questionable' });
    expect(Array.isArray(brogath.variants)).toBe(true);
    const shown = logEntries(legends, atPreset('p10_complete'));
    expect(shown[0].id).toBe('verified');
    for (const id of ['brogath', 'rumpold', 'fifty_three', 'five_hundred', 'doctrine']) expect(shown.find((e) => e.id === id), id).toBeTruthy();
    expect(shown.find((e) => e.id === 'doctrine').reliability).toBe('Made up');
  });

  it('the Captain\'s Journal goes on: the Bling Bling King, the salvage, the sea, the Revenge inside the storm', () => {
    const journal = logEntries(content.logs.get('captains_journal'), atPreset('p10_complete'));
    expect(journal.find((e) => e.id === 'megalodon').status).toBe('THE BLING BLING KING');
    expect(journal.find((e) => e.id === 'storm').status).toBe('INSIDE IT');
    expect(journal.find((e) => e.id === 'revenge').where).toMatch(/Inside the Great Sharkstorm/);
    expect(journal.find((e) => e.id === 'sea').notes).toMatch(/guess/i);
    const trash = logEntries(content.logs.get('bbk_trash'), atPreset('p10_complete'));
    expect(trash.map((e) => e.id)).toEqual(['coin', 'leftovers', 'bedtime', 'captain_under', 'ribbon', 'trophy', 'advice', 'approach', 'cowardice', 'good_night']);
  });
});

describe('Phase 10 art and sound', () => {
  it('the new looks paint: the charged Grand Stenchmaster, the sash held taut, Rusty Tom, Barnacle Bill', () => {
    for (const id of ['garrick_stenchmaster_charged', 'garrick_sash_held', 'rusty_tom', 'barnacle_bill']) {
      expect(Object.keys(characterSheet(content.appearances.require(id)).anims).length, id).toBeGreaterThan(8);
    }
    // Barnacle Bill is his own man: not Bob's look, not Bob's name.
    expect(content.npcs.require('barnacle_bill').appearance).not.toBe(content.npcs.require('bob').appearance);
    expect(content.npcs.require('bob').name).not.toMatch(/bill/i);
  });

  it('every Phase 10 prop paints, and the token and the book have icons', () => {
    const list = JSON.parse(fs.readFileSync(path.resolve('data/props/phase10.json')));
    expect(list.length).toBeGreaterThanOrEqual(19);
    for (const p of list) {
      const { frames } = paintProp(p.sprite ?? p.id);
      expect(frames.length, p.id).toBeGreaterThan(0);
    }
    expect(ICON_NAMES).toEqual(expect.arrayContaining(['token', 'book']));
  });

  it('the atlases have the new frames and still fit 4096', () => {
    const v = buildVistaAtlas();
    expect(Math.max(v.canvas.width, v.canvas.height)).toBeLessThanOrEqual(4096);
    for (const f of PHASE10_VISTA_FRAMES) expect(VISTA_FRAMES, f).toContain(f);
    const st = buildStageAtlas();
    expect(Math.max(st.canvas.width, st.canvas.height)).toBeLessThanOrEqual(4096);
    for (const f of [...PHASE10_STAGE_FRAMES, ...PHASE10_TOKEN_FRAMES]) expect(STAGE_FRAMES, f).toContain(f);
    const ins = buildInsertAtlas();
    expect(Math.max(ins.canvas.width, ins.canvas.height)).toBeLessThanOrEqual(4096);
    for (const f of PHASE10_INSERT_NAMES) expect(INSERT_NAMES, f).toContain(f);
    const fx = buildEffectsAtlas();
    for (const f of PHASE10_FX_FRAMES) expect(fx.frames?.has?.(f) ?? Object.keys(fx.frames ?? {}).includes(f), f).toBe(true);
  }, 60000);

  it('the new music renders, loops, and never clips', () => {
    const inst = { ...JSON.parse(fs.readFileSync(path.resolve('data/audio/instruments.json'))), ...JSON.parse(fs.readFileSync(path.resolve('data/audio/instruments_phase7.json'))) };
    for (const id of ['bling_bling_king', 'charge_rising', 'counter_plan', 'galley_beans', 'inside_the_storm', 'legend_ballad']) {
      const song = JSON.parse(fs.readFileSync(path.resolve(`data/audio/music/${id}.json`)));
      const out = renderSong(song, inst);
      let peak = 0;
      for (const x of out.left) peak = Math.max(peak, Math.abs(x));
      expect(peak, id).toBeGreaterThan(0.1);
      expect(peak, id).toBeLessThan(1.2);
      expect(out.loopEnd, id).toBeGreaterThan(out.loopStart);
    }
  }, 60000);

  it('the new sound effects render and none of them clips (the blast is big, not painful)', () => {
    const sfx = JSON.parse(fs.readFileSync(path.resolve('data/audio/sfx_phase10.json')));
    const ids = Object.keys(sfx).filter((k) => k !== '//');
    expect(ids.length).toBeGreaterThanOrEqual(45);
    for (const id of ids) {
      const { data } = renderSfx(sfx[id]);
      let peak = 0;
      for (const x of data) peak = Math.max(peak, Math.abs(x));
      expect(peak, id).toBeGreaterThan(0.05);
      expect(peak, id).toBeLessThan(1.3);
    }
  });
});
