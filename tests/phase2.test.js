import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/content/loadContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { FumeField, Exposure, zoneRect, hazeFor, fumeConfig, DEFAULT_FUME_CONFIG } from '../src/systems/hazards/fumes.js';
import { resolveVariant, currentChapter, currentTimeOfDay, dueStoryTriggers } from '../src/systems/story/progress.js';
import { migrateState } from '../src/systems/save/migrations.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { commandNameOf } from '../src/systems/script/commandSchemas.js';
import { Settings } from '../src/systems/settings/Settings.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION } from '../src/config/constants.js';
import { makeContent, makeSession } from './fixtures.js';

const content = loadContent();
const freshSession = () => GameSession.newGame({ content, bus: new EventBus(), strictFlags: true });

describe('fume hazard model', () => {
  const zones = [
    { id: 'haze', level: 'light', x: 0, y: 0, w: 10, h: 10 },
    { id: 'bank', level: 'dense', x: 2, y: 2, w: 3, h: 3 },
    { id: 'core', level: 'center', x: 3, y: 3, w: 1, h: 1 },
  ];

  it('reports the strongest level covering a tile', () => {
    const field = new FumeField(zones);
    field.refresh(null);
    expect(field.levelAt(0, 0)).toBe('light');
    expect(field.levelAt(2, 2)).toBe('dense');
    expect(field.levelAt(3, 3)).toBe('center');
    expect(field.levelAt(20, 20)).toBe(null);
    expect(field.isSafe(0, 0)).toBe(true);
    expect(field.isSafe(2, 2)).toBe(false);
  });

  it('follows the story and adds temporary clouds', () => {
    const { session } = makeSession();
    const field = new FumeField([{ id: 'z', level: 'dense', x: 0, y: 0, w: 2, h: 2, if: { flag: 'door_open' } }]);
    field.refresh(session);
    expect(field.levelAt(0, 0)).toBe(null);
    session.story.set('door_open');
    field.refresh(session);
    expect(field.levelAt(0, 0)).toBe('dense');
    field.addTransient({ id: 'puff', level: 'center', x: 5, y: 5, w: 1, h: 1 });
    expect(field.levelAt(5, 5)).toBe('center');
    field.removeTransient('puff');
    expect(field.levelAt(5, 5)).toBe(null);
  });

  it('drifts pockets back and forth along a path', () => {
    const zone = { level: 'dense', x: 0, y: 0, w: 1, h: 1, path: [[0, 0], [10, 0]], periodMs: 1000 };
    expect(zoneRect(zone, 0).x).toBeCloseTo(0);
    expect(zoneRect(zone, 500).x).toBeCloseTo(10);
    expect(zoneRect(zone, 1000).x).toBeCloseTo(0);
    expect(zoneRect(zone, 250).x).toBeGreaterThan(0);
  });

  it('builds exposure in thick fumes, recovers in clean air and collapses at the maximum', () => {
    const e = new Exposure(DEFAULT_FUME_CONFIG);
    expect(e.update(1000, 'light').value).toBe(0);
    e.update(2000, 'dense');
    expect(e.value).toBeCloseTo(22);
    const warn = e.update(1500, 'center');
    expect(warn.warn).toBe(true);
    e.update(1000, null);
    expect(e.value).toBeLessThan(70);
    let r;
    for (let i = 0; i < 20 && !(r?.collapsed); i++) r = e.update(500, 'center');
    expect(r.collapsed).toBe(true);
    expect(e.value).toBe(100);
    e.reset();
    expect(e.value).toBe(0);
  });

  it('scales the build-up (wet cloth, Gentle option) and can switch it off', () => {
    const a = new Exposure();
    const b = new Exposure();
    const off = new Exposure();
    a.update(1000, 'dense');
    b.update(1000, 'dense', 0.5);
    off.update(5000, 'center', 0);
    expect(b.value).toBeCloseTo(a.value / 2);
    expect(off.value).toBe(0);
  });

  it('reads tuning and haze from the shipped data', () => {
    const cfg = fumeConfig(content);
    expect(cfg.levels.center.exposure).toBeGreaterThan(cfg.levels.dense.exposure);
    expect(cfg.levels.light.exposure).toBe(0);
    const s = freshSession();
    const haze = content.maps.require('treasure_hold').haze;
    expect(hazeFor(haze, s)).toBe(null);
    s.story.set('guzzlegut_gust');
    expect(hazeFor(haze, s)).toBe('dense');
    s.story.set('fumes_thinned');
    expect(hazeFor(haze, s)).toBe('faint');
  });
});

describe('story state lookups', () => {
  it('Squawks and the captain change looks with the story', () => {
    const s = freshSession();
    const squawks = content.npcs.require('squawks');
    const look = () => resolveVariant(squawks, s).appearance;
    expect(look()).toBe('squawks');
    s.story.set('squawks_exposed');
    expect(look()).toBe('squawks_exposed');
    s.story.set('squawks_bald');
    expect(look()).toBe('squawks_bald');
    s.story.set('squawks_sweater');
    expect(look()).toBe('squawks_sweater');
    const cap = content.characters.require('blackbeard');
    expect(resolveVariant(cap, s).appearance ?? 'blackbeard').toBe('blackbeard');
    s.story.set('rescue_gear_on');
    expect(resolveVariant(cap, s).appearance).toBe('blackbeard_rescue');
    s.story.clear('rescue_gear_on');
    s.story.set('boots_stained');
    expect(resolveVariant(cap, s).appearance).toBe('blackbeard_stained');
  });

  it('derives the chapter and time of day from flags alone', () => {
    const s = freshSession();
    expect(currentChapter(content.game, s).id).toBe('prologue');
    s.story.set('ch1_morning_started');
    expect(currentChapter(content.game, s).id).toBe('ch1');
    expect(currentTimeOfDay(content.game, s).id).toBe('morning');
    s.story.set('trial_started');
    expect(currentChapter(content.game, s).id).toBe('ch8');
    expect(currentTimeOfDay(content.game, s).id).toBe('evening');
  });

  it('story triggers wait for their conditions and skip fired ones', () => {
    const triggers = [{ id: 'a', if: { flag: 'x' }, script: 's' }, { id: 'b', if: { flag: 'x' }, script: 's', once: false }];
    const { session } = makeSession(makeContent({ '/data/story/flags/x.json': [{ id: 'x' }] }));
    expect(dueStoryTriggers(triggers, session, () => false)).toEqual([]);
    session.story.set('x');
    expect(dueStoryTriggers(triggers, session, () => true).map((t) => t.id)).toEqual(['b']);
  });

  it('every repeatable trigger resolves its own condition (it cannot loop)', () => {
    const scriptsCalled = (id, seen = new Set()) => {
      if (seen.has(id)) return seen;
      seen.add(id);
      const text = JSON.stringify(content.scripts.get(id));
      for (const m of text.matchAll(/"call":"([^"]+)"/g)) scriptsCalled(m[1], seen);
      return seen;
    };
    for (const t of content.storyTriggers.list().filter((x) => x.once === false)) {
      const body = [...scriptsCalled(t.script)].map((id) => JSON.stringify(content.scripts.get(id))).join('');
      const cond = JSON.stringify(t.if);
      const waits = [...cond.matchAll(/"questNotStarted":"([^"]+)"/g)].map((m) => `"startQuest":"${m[1]}"`)
        .concat([...cond.matchAll(/"notFlag":"([^"]+)"/g)].map((m) => m[1]));
      expect(waits.some((w) => body.includes(w)), `trigger ${t.id} never clears its own condition`).toBe(true);
    }
  });

  it('every flag objective in Phase 2 is set by some script or reward', () => {
    const all = JSON.stringify([...content.scripts.map.values()]) + JSON.stringify(content.quests.list().map((q) => q.rewards ?? {}));
    for (const q of content.quests.list()) {
      for (const o of q.objectives.filter((x) => x.type === 'flag')) {
        expect(all.includes(`"${o.target}"`), `${q.id}.${o.id} waits on ${o.target}, which nothing sets`).toBe(true);
      }
    }
  });
});

describe('save compatibility', () => {
  it('a version 1 save migrates to version 2', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(2); // 3 since Story Phase 3 (tests/phase3.test.js)
    const v1 = { story: { flags: ['tutorial_complete'] }, location: { map: 'treasure_hold', x: 5, y: 3, facing: 'down' } };
    const v2 = migrateState(v1, 1, 2);
    expect(v2.story.vars).toEqual({});
    expect(v2.story.flags).toEqual(['tutorial_complete']);
    expect(v2.location).toEqual({ map: 'treasure_hold', x: 9, y: 12, facing: 'up' });
    const elsewhere = migrateState({ story: { flags: [], vars: { a: 1 } }, location: { map: 'galley', x: 3, y: 4 } }, 1, 2);
    expect(elsewhere.location).toEqual({ map: 'galley', x: 3, y: 4 });
    expect(elsewhere.story.vars).toEqual({ a: 1 });
  });

  it('a Phase 2 session round-trips through serialize/load', () => {
    const s = freshSession();
    applyPresetPlan(s, resolvePreset(content, 'contaminated_treasure'));
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: JSON.parse(JSON.stringify(s.serialize())) });
    expect(loaded.story.has('squawks_bald')).toBe(true);
    expect(loaded.story.has('boots_stained')).toBe(true);
    expect(loaded.quests.status('price_of_gold')).toBe('active');
    expect(loaded.location.map).toBe('treasure_hold');
  });
});

describe('debug story presets', () => {
  it('chain through "after" and set up each chapter', () => {
    const plan = resolvePreset(content, 'phase2_complete');
    expect(plan.flags).toContain('tutorial_complete');
    expect(plan.flags).toContain('phase2_complete');
    const s = freshSession();
    applyPresetPlan(s, plan);
    for (const q of ['strange_cargo', 'new_recruit', 'treasure_inspection', 'yellow_alert', 'save_squawks', 'price_of_gold', 'yellow_defense']) {
      expect(s.quests.status(q), q).toBe('completed');
    }
    expect(currentChapter(content.game, s).id).toBe('phase2_end');
  });

  it('clearFlags undo state a later chapter moved past', () => {
    const s = freshSession();
    applyPresetPlan(s, resolvePreset(content, 'contaminated_treasure'));
    expect(s.story.has('squawks_exposed')).toBe(false);
    expect(s.story.has('squawks_rescued')).toBe(true);
  });

  it('every preset applies to a fresh game without errors', () => {
    for (const p of content.debugPresets.list()) {
      const s = freshSession();
      const loc = applyPresetPlan(s, resolvePreset(content, p.id));
      expect(content.maps.has(loc.map), p.id).toBe(true);
    }
  });
});

describe('script parsing', () => {
  it('a parameter that shares a command name belongs to its command', () => {
    expect(commandNameOf({ move: 'rook', to: [1, 2], face: 'left' })).toBe('move');
    expect(commandNameOf({ transition: 'galley', spawn: 'ladder', fade: 0 })).toBe('transition');
    expect(commandNameOf({ sprite: 'tub', frame: 'x', x: 1, y: 1, anim: 'a' })).toBe('sprite');
    expect(commandNameOf({ vista: 'v', fade: 400 })).toBe('vista');
    expect(() => commandNameOf({ face: 'rook', move: 'rook', flash: '#fff' })).toThrow();
  });
});

describe('quests', () => {
  it('distinct inspect objectives count each object once', () => {
    const extra = {
      '/data/quests/p2.json': [{ id: 'look', title: 'Look', objectives: [{ id: 'see', text: 'See', type: 'inspect', tag: 'gold', count: 2, distinct: true }] }],
    };
    const { session, bus } = makeSession(makeContent(extra));
    session.quests.start('look');
    bus.emit('object:inspected', { id: 'room:a', tags: ['gold'] });
    bus.emit('object:inspected', { id: 'room:a', tags: ['gold'] });
    expect(session.quests.isObjectiveDone('look', 'see')).toBe(false);
    bus.emit('object:inspected', { id: 'room:b', tags: ['gold'] });
    expect(session.quests.isObjectiveDone('look', 'see')).toBe(true);
  });
});

describe('accessibility settings', () => {
  it('fume hazard, shake and effects options persist and scale', () => {
    const storage = new MemoryStorage();
    const settings = new Settings({ storage });
    expect(settings.fumeScale()).toBe(1);
    settings.set('fumeHazard', 'gentle');
    expect(settings.fumeScale()).toBe(0.5);
    settings.set('fumeHazard', 'off');
    settings.set('screenShake', 'reduced');
    settings.set('effects', 'reduced');
    const again = new Settings({ storage });
    expect(again.fumeScale()).toBe(0);
    expect(again.shakeScale()).toBeLessThan(1);
    expect(again.reducedEffects()).toBe(true);
    expect(() => settings.set('fumeHazard', 'extreme')).toThrow();
  });
});
