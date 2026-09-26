import { describe, expect, it } from 'vitest';
import { makeSession } from './fixtures.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { GameSession } from '../src/systems/GameSession.js';
import { Settings, DEFAULT_SETTINGS } from '../src/systems/settings/Settings.js';
import { EventBus } from '../src/core/EventBus.js';

describe('SaveManager', () => {
  it('round-trips a full session through storage', () => {
    const { session, content } = makeSession();
    session.story.set('met_mate');
    session.quests.start('rounds');
    session.inventory.add('axe');
    session.party.get('hero').gainXp(12);
    session.location = { map: 'room', x: 4, y: 5, facing: 'left' };
    session.playTime = 321;
    const storage = new MemoryStorage();
    const saves = new SaveManager({ storage, content });
    expect(saves.save(2, session).ok).toBe(true);
    const res = saves.read(2);
    expect(res.ok).toBe(true);
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: res.state });
    expect(loaded.story.has('met_mate')).toBe(true);
    expect(loaded.quests.status('rounds')).toBe('active');
    expect(loaded.inventory.count('axe')).toBe(1);
    expect(loaded.party.get('hero').level).toBe(2);
    expect(loaded.location).toEqual({ map: 'room', x: 4, y: 5, facing: 'left' });
    expect(loaded.playTime).toBe(321);
    expect(saves.latestSlot()).toBe(2);
  });

  it('reports empty, corrupt, tampered and newer saves without throwing', () => {
    const { session, content } = makeSession();
    const storage = new MemoryStorage();
    const saves = new SaveManager({ storage, content });
    expect(saves.read(1).status).toBe('empty');
    storage.setItem(saves.key(1), '{not json');
    expect(saves.read(1).status).toBe('corrupt');
    saves.save(1, session);
    const rec = JSON.parse(storage.getItem(saves.key(1)));
    rec.state.inventory.gold = 99999;
    storage.setItem(saves.key(1), JSON.stringify(rec));
    expect(saves.read(1).status).toBe('corrupt');
    saves.save(1, session);
    const rec2 = JSON.parse(storage.getItem(saves.key(1)));
    rec2.version = 99;
    storage.setItem(saves.key(1), JSON.stringify(rec2));
    expect(saves.read(1).status).toBe('incompatible');
    expect(saves.listSlots().find((s) => s.slot === 1).status).toBe('incompatible');
    expect(saves.hasAnySave()).toBe(false);
  });

  it('migrates old versions through the migration table', () => {
    const { session, content } = makeSession();
    const storage = new MemoryStorage();
    const old = new SaveManager({ storage, content, version: 1 });
    old.save(3, session);
    const migrations = { 1: (state) => ({ ...state, story: { ...state.story, flags: [...state.story.flags, 'door_open'] } }) };
    const current = new SaveManager({ storage, content, version: 2, migrations });
    const res = current.read(3);
    expect(res.ok).toBe(true);
    expect(res.state.story.flags).toContain('door_open');
    const broken = new SaveManager({ storage, content, version: 3, migrations });
    expect(broken.read(3).status).toBe('incompatible');
  });

  it('drops unknown ids from damaged content references instead of crashing', () => {
    const { session, content } = makeSession();
    const state = session.serialize();
    state.inventory.items.ghost_item = 3;
    const warnings = [];
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state, onWarning: (w) => warnings.push(w) });
    expect(loaded.inventory.count('biscuit')).toBe(2);
    expect(warnings.join()).toMatch(/ghost_item/);
  });
});

describe('Settings', () => {
  it('persists valid values and ignores garbage', () => {
    const storage = new MemoryStorage();
    const s = new Settings({ storage, bus: new EventBus() });
    s.set('musicVolume', 0.25);
    s.set('textSpeed', 'fast');
    expect(() => s.set('musicVolume', 3)).toThrow();
    const again = new Settings({ storage });
    expect(again.get('musicVolume')).toBe(0.25);
    expect(again.get('textSpeed')).toBe('fast');
    storage.setItem('captain-stinkbeard.settings', JSON.stringify({ musicVolume: 'loud', sfxVolume: 0.1 }));
    const third = new Settings({ storage });
    expect(third.get('musicVolume')).toBe(DEFAULT_SETTINGS.musicVolume);
    expect(third.get('sfxVolume')).toBe(0.1);
  });
});
