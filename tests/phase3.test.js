import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/content/loadContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { migrateState } from '../src/systems/save/migrations.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION } from '../src/config/constants.js';
import { resolveVariant, currentChapter, dueStoryTriggers } from '../src/systems/story/progress.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { logAvailable, logEntries, takeNewEntries, unseenEntryIds, markEntrySeen } from '../src/systems/logs/logbook.js';
import { sharkLevelFor, finLoop, followPoint, SHARK_LEVELS, sharkConfig } from '../src/systems/hazards/sharks.js';
import { applyEffects } from '../src/systems/effects/effects.js';
import { compileMap } from '../src/maps/compileMap.js';
import { CommandRegistry, ScriptRunner } from '../src/systems/script/ScriptRunner.js';
import { createCommandImplementations } from '../src/systems/script/commands.js';

const content = loadContent();
const freshSession = () => GameSession.newGame({ content, bus: new EventBus() });
const atPreset = (id) => {
  const s = freshSession();
  applyPresetPlan(s, resolvePreset(content, id));
  return s;
};

describe('story variants resolve field by field', () => {
  it('takes each field from the first matching variant that sets it', () => {
    const def = {
      id: 'x', name: 'Base', title: 'Mister',
      variants: [
        { if: { flag: 'b' }, name: 'Late name' },
        { if: { flag: 'a' }, name: 'Early name', appearance: 'early' },
      ],
    };
    const s = freshSession();
    s.story.strict = false;
    expect(resolveVariant(def, s)).toBe(def);
    s.story.set('a');
    expect(resolveVariant(def, s)).toMatchObject({ name: 'Early name', appearance: 'early', title: 'Mister' });
    s.story.set('b');
    // The later story's name wins, and the earlier variant still supplies the look.
    expect(resolveVariant(def, s)).toMatchObject({ name: 'Late name', appearance: 'early' });
  });
});

describe('the captain becomes Captain Stinkbeard', () => {
  // The {captain} text token is party.leader().fullName (src/ui/text.js).
  it('changes name everywhere it is shown, keeping the character id', () => {
    const s = atPreset('pre_rename');
    const cap = s.party.leader();
    expect(cap.id).toBe('blackbeard');
    expect(cap.fullName).toBe('Captain Blackbeard');
    s.story.set('stinkbeard_proposed');
    s.story.set('beard_sniffed');
    expect(cap.look.appearance).toBe('blackbeard_stinkbeard');
    s.story.set('captain_named_stinkbeard');
    expect(cap.name).toBe('Stinkbeard');
    expect(cap.fullName).toBe('Captain Stinkbeard');
    expect(s.party.nameOf('blackbeard')).toBe('Stinkbeard');
    expect(s.party.leader().id).toBe('blackbeard');
  });

  it('round-trips through a save before and after the rename', () => {
    const storage = new MemoryStorage();
    const saves = new SaveManager({ storage, content });
    const before = atPreset('pre_rename');
    expect(saves.save(1, before).ok).toBe(true);
    const after = atPreset('stinkbeard_named');
    expect(saves.save(2, after).ok).toBe(true);
    expect(saves.read(1).summary.leader).toBe('Blackbeard');
    expect(saves.read(2).summary.leader).toBe('Stinkbeard');
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: saves.read(2).state });
    expect(loaded.party.leader().fullName).toBe('Captain Stinkbeard');
    expect(loaded.party.leader().look.portrait).toBe('blackbeard_stinkbeard');
    const early = GameSession.fromState({ content, bus: new EventBus(), state: saves.read(1).state });
    expect(early.party.leader().fullName).toBe('Captain Blackbeard');
  });

  it('gives Garrick his title in stages', () => {
    const garrick = content.npcs.require('garrick');
    expect(resolveVariant(garrick, atPreset('phase3_start')).title).toBe('Businessman');
    expect(resolveVariant(garrick, atPreset('pre_rename')).title).toBe('Grand Stenchmaster (self-appointed)');
    const end = resolveVariant(garrick, atPreset('phase3_complete'));
    expect(end.title).toBe('Grand Stenchmaster');
    expect(end.name).toBe('Grand Stenchmaster Garrick');
    expect(end.appearance).toBe('garrick_battered');
  });
});

describe('Squawks recovers (slowly)', () => {
  it('keeps the sweater and blanket, and grows one yellow feather', () => {
    const squawks = content.npcs.require('squawks');
    expect(resolveVariant(squawks, atPreset('phase3_start')).appearance).toBe('squawks_blanket');
    const late = atPreset('squawks_yellow_feather');
    expect(late.story.has('squawks_feather_regrowth_started')).toBe(true);
    expect(resolveVariant(squawks, late).appearance).toBe('squawks_feather');
    expect(content.appearances.require('squawks_feather')).toMatchObject({ sweater: true, blanket: true, yellowFeather: true, plumage: 'bald' });
  });
});

describe('the Stench Log', () => {
  const log = content.logs.get('stench_log');

  it('opens once read, and fills in with the story', () => {
    const s = atPreset('phase3_start');
    expect(logAvailable(log, s)).toBe(false);
    s.story.set('stench_log_seen');
    expect(logAvailable(log, s)).toBe(true);
    const first = logEntries(log, s).map((e) => e.id);
    expect(first).toEqual(['day_one', 'day_two', 'treasure_room', 'squawks']);
    const treasure = logEntries(log, s).find((e) => e.id === 'treasure_room');
    expect(treasure).toMatchObject({ location: expect.any(String), severity: 'Catastrophic', source: 'Lunch', notes: expect.stringContaining('atmospheric rebranding') });
    const end = logEntries(log, atPreset('phase3_complete'));
    expect(end.find((e) => e.id === 'captains_beard').notes).toMatch(/shark forecasting/);
    expect(end.find((e) => e.id === 'grog_barrel').notes).toMatch(/Frog Grog/);
    expect(end.find((e) => e.id === 'squawks').notes).toMatch(/golden/);
  });

  it('announces only entries that are new since it was last looked at', () => {
    const s = atPreset('phase3_start');
    s.story.set('stench_log_seen');
    // Everything present when the book is first opened is taken as read.
    expect(takeNewEntries(log, 'stench_log', s)).toEqual([]);
    s.story.set('stenchmaster_declared');
    s.story.set('stinkbeard_proposed');
    s.story.set('beard_sniffed');
    expect(takeNewEntries(log, 'stench_log', s).map((e) => e.id)).toEqual(['captains_beard']);
    expect(takeNewEntries(log, 'stench_log', s)).toEqual([]);
    expect(unseenEntryIds(log, 'stench_log', s)).toContain('captains_beard');
    markEntrySeen(s, 'stench_log', 'captains_beard');
    expect(unseenEntryIds(log, 'stench_log', s)).not.toContain('captains_beard');
  });

  it('is data only: every entry has the four fields and a known severity', () => {
    for (const e of log.entries) {
      for (const f of ['location', 'severity', 'source', 'notes']) expect(e[f], `${e.id}.${f}`).toBeTruthy();
      expect(Object.keys(log.severities)).toContain(e.severity);
    }
  });
});

describe('Frog Grog', () => {
  const grog = content.items.require('frog_grog');
  const target = () => {
    const statuses = [];
    return {
      hp: 20, maxHp: 100, statuses,
      isAlive: () => true,
      heal(n) { const before = this.hp; this.hp = Math.min(this.maxHp, this.hp + n); return this.hp - before; },
      addStatus: (id, d) => statuses.push([id, d]),
      statusIds: () => statuses.map((x) => x[0]),
    };
  };
  const rngAt = (v) => ({ next: () => v });

  it('heals, wards against fumes for a while, and has one small surprise', () => {
    const s = freshSession();
    const t = target();
    const out = applyEffects(grog.use.effects, t, { rng: rngAt(0.01), session: s });
    expect(t.hp).toBe(50);
    expect(s.transient.fumeWard.ms).toBe(90000);
    expect(s.transient.fumeWard.scale).toBeLessThan(1);
    const side = out.find((r) => r.type === 'sideEffect');
    expect(side.id).toBe('warmed_up');
    expect(side.text).toBeTruthy();
    expect(t.statuses).toEqual([['warmed_up', 3]]);
  });

  it('never punishes harshly: every side effect is short, and no status hurts over time', () => {
    const table = grog.use.effects.find((e) => e.type === 'sideEffect').table;
    expect(table.map((e) => e.id).sort()).toEqual(['belching', 'dizzy', 'stench_proof', 'warmed_up']);
    for (const e of table) {
      expect(e.duration).toBeLessThanOrEqual(3);
      expect(content.statuses.require(e.status).tick).toBeUndefined();
    }
    // Different rolls land on different entries.
    const ids = new Set([0.01, 0.35, 0.6, 0.95].map((v) => applyEffects(grog.use.effects, target(), { rng: rngAt(v) }).find((r) => r.type === 'sideEffect').id));
    expect(ids.size).toBe(4);
  });

  it('turns every rum ration into Frog Grog, and the galley stocks it after the naming', async () => {
    const s = atPreset('stinkbeard_named');
    s.inventory.add('rum_ration', 3);
    const rum = s.inventory.count('rum_ration');
    const grogBefore = s.inventory.count('frog_grog');
    const runner = new ScriptRunner({ registry: new CommandRegistry().registerAll(createCommandImplementations()), getScript: () => null });
    await runner.run([{ swapItem: 'rum_ration', to: 'frog_grog', silent: true }], { session: s, bus: new EventBus(), services: {} });
    expect(s.inventory.count('rum_ration')).toBe(0);
    expect(s.inventory.count('frog_grog')).toBe(grogBefore + rum);
    const galley = content.shops.require('galley_stores');
    const stock = (flagged) => galley.items.filter((e) => !e.if || (flagged ? e.if.flag : e.if.notFlag)).map((e) => e.id ?? e);
    expect(stock(false)).toContain('rum_ration');
    expect(stock(true)).toContain('frog_grog');
    expect(stock(true)).not.toContain('rum_ration');
  });
});

describe('the shark threat', () => {
  const deck = content.maps.require('main_deck');
  const model = compileMap(deck, content.tilesets.get(deck.tileset), content.props);

  it('follows the story on the main deck, and only thumps the hull below', () => {
    const at = (id) => sharkLevelFor(model.meta, atPreset(id)).level;
    expect(at('ship_transformation')).toBe('none');
    expect(at('shark_attack')).toBe('attacking');
    expect(at('rowboat_lure')).toBe('swarm');
    expect(at('post_shark_damage')).toBe('curious');
    expect(at('squawks_yellow_feather')).toBe('following');
    expect(at('phase3_complete')).toBe('curious');
    const galley = content.maps.require('galley');
    const gm = compileMap(galley, content.tilesets.get(galley.tileset), content.props);
    const below = sharkLevelFor(gm.meta, atPreset('rowboat_lure'));
    expect(below.below).toBe(true);
  });

  it('circles in open water around the hull and paces the captain on his side', () => {
    const loop = finLoop(deck, 0.6);
    expect(loop.length).toBeGreaterThan(8);
    // Every point on the course is open sea (or off the edge of the map), never deck.
    for (const p of loop) {
      const row = deck.tiles[Math.floor(p.y)];
      const ch = row?.[Math.floor(p.x)];
      expect(ch === undefined || deck.legend[ch] === 'sea', `${p.x},${p.y}`).toBe(true);
    }
    expect(followPoint(deck, 5, 20, 0.5).side).toBe('starboard');
    expect(followPoint(deck, 14, 20, 0.5).side).toBe('port');
  });

  it('has a tuning entry for every level', () => {
    const cfg = sharkConfig(content);
    for (const level of SHARK_LEVELS) expect(cfg.levels[level], level).toBeTruthy();
    expect(cfg.levels.none.fins).toBe(0);
    expect(cfg.levels.swarm.fins).toBeGreaterThan(cfg.levels.following.fins);
  });
});

describe('Phase 3 saves', () => {
  it('is version 3 or later, and a Phase 2 save migrates and walks straight into chapter 9', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(3);
    const phase2 = atPreset('phase2_complete');
    const v2 = JSON.parse(JSON.stringify(phase2.serialize()));
    delete v2.world.counters;
    const v3 = migrateState(v2, 2, 3);
    expect(v3.world.counters).toEqual({});
    expect(v3.story.flags).toContain('phase2_complete');
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: v3 });
    const due = dueStoryTriggers(content.storyTriggers.list(), loaded, () => false).map((t) => t.id);
    expect(due[0]).toBe('p3_begin');
    expect(loaded.party.leader().name).toBe('Blackbeard');
  });

  it('a version 2 save record in storage upgrades on load', () => {
    const storage = new MemoryStorage();
    const old = new SaveManager({ storage, content, version: 2, migrations: {} });
    expect(old.save(1, atPreset('phase2_complete')).ok).toBe(true);
    const current = new SaveManager({ storage, content });
    const res = current.read(1);
    expect(res.ok).toBe(true);
    expect(res.state.story.flags).toContain('phase2_complete');
  });

  it('keeps everything Phase 3 changed across a save', () => {
    const s = atPreset('phase3_complete');
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: JSON.parse(JSON.stringify(s.serialize())) });
    for (const f of ['captain_named_stinkbeard', 'garrick_title_retained', 'frog_grog_unlocked', 'hull_patched', 'squawks_first_new_feather_yellow', 'stomach_alarm_protocol', 'p3_complete']) {
      expect(loaded.story.has(f), f).toBe(true);
    }
    expect(loaded.inventory.count('frog_grog')).toBeGreaterThanOrEqual(2);
    expect(loaded.story.getVar('hull_patch_clean')).toBe(3);
    expect(currentChapter(content.game, loaded).id).toBe('phase3_end');
  });
});
