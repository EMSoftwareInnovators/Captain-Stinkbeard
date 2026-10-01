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
import { logAvailable, logEntries } from '../src/systems/logs/logbook.js';
import { FumeField, zoneRect } from '../src/systems/hazards/fumes.js';
import {
  deadCenterLocations, deadCenterLocation, setDeadCenterLocation, deadCenterName, deadCenterZonesFor, deadCenterSeals,
} from '../src/systems/hazards/deadCenter.js';
import { alarmLevel, alarmColor } from '../src/systems/hazards/alarms.js';
import { dutyData, dutySessionFor, DutyPlan, waveSpot } from '../src/systems/hazards/sharkDuty.js';
import { sharkConfig, sharkLevelFor, crowdSize, SHARK_EVENTS } from '../src/systems/hazards/sharks.js';
import { compileMap } from '../src/maps/compileMap.js';

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

describe('the Dead Center', () => {
  it('has every location on a real map, with a core and a way in', () => {
    const locs = deadCenterLocations(content);
    expect(Object.keys(locs).length).toBeGreaterThanOrEqual(10);
    for (const [id, loc] of Object.entries(locs)) {
      expect(content.maps.has(loc.map), `${id}: ${loc.map}`).toBe(true);
      expect(loc.name, id).toBeTruthy();
      expect(loc.zones.some((z) => z.level === 'center'), id).toBe(true);
      expect(Array.isArray(loc.enterFrom), id).toBe(true);
    }
  });

  it('lives in saved story state, and "none" takes it away', () => {
    const s = freshSession();
    expect(deadCenterLocation(s)).toBe(null);
    expect(deadCenterName(content, s)).toBe('nowhere in particular');
    setDeadCenterLocation(s, 'galley_breakfast');
    expect(deadCenterName(content, s)).toBe(deadCenterLocations(content).galley_breakfast.name);
    expect(evaluateCondition({ deadCenter: 'galley_breakfast' }, s)).toBe(true);
    expect(evaluateCondition({ deadCenter: ['washroom', 'galley_breakfast'] }, s)).toBe(true);
    expect(evaluateCondition({ deadCenter: 'washroom' }, s)).toBe(false);
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: JSON.parse(JSON.stringify(s.serialize())) });
    expect(deadCenterLocation(loaded)).toBe('galley_breakfast');
    setDeadCenterLocation(loaded, 'none');
    expect(deadCenterLocation(loaded)).toBe(null);
  });

  it('rolls into a room through the ordinary fume system, then settles', () => {
    const s = freshSession();
    const field = new FumeField(deadCenterZonesFor(content, 'galley'));
    expect(field.refresh(s, 0)).toEqual([]);
    setDeadCenterLocation(s, 'galley_breakfast');
    const zones = field.refresh(s, 1000);
    expect(zones.length).toBeGreaterThan(0);
    expect(zones.every((z) => z.deadCenter === 'galley_breakfast')).toBe(true);
    const core = zones.find((z) => z.level === 'center');
    // Starts off to one side (enterFrom) and arrives after enterMs.
    expect(zoneRect(core, 1000).x).toBeCloseTo(core.x + core.enterFrom[0]);
    expect(zoneRect(core, 1000 + core.enterMs).x).toBe(core.x);
    expect(field.levelAt(core.x, core.y, 1000 + core.enterMs)).toBe('center');
    // Somewhere else on the ship: the galley clears.
    setDeadCenterLocation(s, 'deck_camp');
    expect(field.refresh(s, 9000)).toEqual([]);
  });

  it('seals the rooms it fills, and only those', () => {
    const s = freshSession();
    expect(deadCenterSeals(content, s, 'galley')).toBe(false);
    setDeadCenterLocation(s, 'galley_breakfast');
    expect(deadCenterSeals(content, s, 'galley')).toBe(true);
    expect(deadCenterSeals(content, s, 'main_deck')).toBe(false);
    setDeadCenterLocation(s, 'sleeping_quarters'); // the quarters and the washroom beyond them
    expect(deadCenterSeals(content, s, 'crew_quarters')).toBe(true);
    expect(deadCenterSeals(content, s, 'washroom')).toBe(true);
    // On the open deck it never locks anyone out.
    setDeadCenterLocation(s, 'port_waterline');
    expect(deadCenterSeals(content, s, 'main_deck')).toBe(false);
  });
});

describe('the bell protocol', () => {
  it('has four levels from data, each shown in words as well as heard', () => {
    for (const level of [1, 2, 3, 4]) {
      const def = alarmLevel(content, level);
      expect(def.bells).toBe(level);
      expect(def.label).toMatch(/BELL/);
      expect(def.text.length).toBeGreaterThan(5);
      expect(def.sound).toMatch(/KLANG/); // the bell's sound written out
      expect(content.sfx.has(def.sfx), def.sfx).toBe(true);
      expect(alarmColor(def)).toBeGreaterThan(0);
    }
    expect(alarmLevel(content, 3).text).toMatch(/EVACUATE/);
    expect(alarmLevel(content, 4).text).toMatch(/Garrick/);
    expect(alarmLevel(content, 9)).toBe(null);
  });
});

describe('Shark Duty', () => {
  const data = dutyData(content);
  const deck = compiled('main_deck');

  it('only sends sharks to rail sections that exist, on the rail', () => {
    for (const [id, def] of Object.entries(data.sessions)) {
      expect(def.waves.length, id).toBeGreaterThan(0);
      for (const w of def.waves) {
        if (w.boarder) continue;
        const sec = data.sections[w.section];
        expect(sec, `${id}: ${w.section}`).toBeTruthy();
        expect([3, 16]).toContain(sec.x); // the starboard and port rails
      }
    }
  });

  it('counts toward the quest objectives the board shows', () => {
    const quest = content.quests.require('shark_duty');
    for (const id of ['first_watch', 'second_watch']) {
      const def = data.sessions[id];
      const [, objId] = def.counter.split('.');
      const obj = quest.objectives.find((o) => o.id === objId);
      expect(obj.type).toBe('event');
      expect(obj.target).toBe(def.event);
    }
  });

  it('never crowds the rail: one shark per section, no more than maxActive at once', () => {
    for (const [id, def] of Object.entries(data.sessions)) {
      const plan = new DutyPlan(def);
      const busy = new Map(); // spot -> ms left before the captain answers it
      let most = 0;
      let spawned = 0;
      for (let t = 0; t < 180000; t += 100) {
        for (const [spot, left] of busy) {
          if (left <= 100) busy.delete(spot);
          else busy.set(spot, left - 100);
        }
        for (const w of plan.tick(100, new Set(busy.keys()))) {
          expect(busy.has(waveSpot(w)), `${id}: ${waveSpot(w)} twice`).toBe(false);
          busy.set(waveSpot(w), 3000);
          spawned += 1;
        }
        most = Math.max(most, busy.size);
      }
      expect(most, id).toBeLessThanOrEqual(def.maxActive ?? 2);
      expect(spawned, id).toBeGreaterThan(10);
      expect(plan.cycles, id).toBeGreaterThan(0); // the waves repeat until the story moves on
    }
  });

  it('runs on the deck exactly when the story asks for it', () => {
    const first = atPreset('p4_shark_duty');
    expect(dutySessionFor(deck.meta, first)).toBe(null); // not until he reports to the rail
    first.story.set('shark_duty_reported');
    expect(dutySessionFor(deck.meta, first)).toBe('first_watch');
    expect(dutySessionFor(deck.meta, atPreset('p4_hundreds_of_sharks'))).toBe('second_watch');
    expect(dutySessionFor(deck.meta, atPreset('p4_frenzy'))).toBe(null);
    const after = atPreset('p4_complete');
    expect(dutySessionFor(deck.meta, after)).toBe(null);
    after.story.set('optional_duty_on');
    expect(dutySessionFor(deck.meta, after)).toBe('open_watch');
  });
});

describe('Shark Duty gets harder shark by shark', () => {
  const def = dutyData(content).sessions.first_watch;

  it('each shark bites sooner, swings the bar faster and narrows the green', () => {
    const plan = new DutyPlan(def);
    const tunes = [];
    for (let t = 0; t < 120000 && tunes.length < 10; t += 100) {
      for (const w of plan.tick(100, new Set())) tunes.push(w.tuning);
    }
    expect(tunes.length).toBe(10);
    for (let i = 1; i < tunes.length; i++) {
      expect(tunes[i].window).toBeLessThanOrEqual(tunes[i - 1].window);
      expect(tunes[i].speed).toBeGreaterThanOrEqual(tunes[i - 1].speed);
      expect(tunes[i].zone).toBeLessThanOrEqual(tunes[i - 1].zone);
    }
    expect(tunes.at(-1).window).toBeLessThan(tunes[0].window * 0.7);
    expect(tunes.at(-1).zone).toBeGreaterThanOrEqual(8); // always hittable (and two misses widen it)
    expect(tunes.some((t) => t.big)).toBe(true);
  });

  it('can be put aside off the deck and picked up exactly where it was', () => {
    const plan = new DutyPlan(def);
    for (let t = 0; t < 20000; t += 100) plan.tick(100, new Set());
    const resumed = new DutyPlan(def, JSON.parse(JSON.stringify(plan.state())));
    expect(resumed.state()).toEqual(plan.state());
    expect(resumed.tuning()).toEqual(plan.tuning());
  });
});

describe('the sharks in Phase 4', () => {
  const deck = compiled('main_deck');

  it('knows the frenzy, and its crowd is drawn but capped', () => {
    const cfg = sharkConfig(content);
    expect(cfg.levels.frenzy.fins).toBeGreaterThan(cfg.levels.swarm.fins);
    expect(cfg.levels.frenzy.churn).toBe(true);
    expect(crowdSize(cfg, 'frenzy')).toBeGreaterThan(crowdSize(cfg, 'swarm'));
    expect(crowdSize(cfg, 'swarm', 5000)).toBe(cfg.maxCrowd);
    for (const e of ['frenzy', 'calm', 'thrash', 'hammerhead']) expect(SHARK_EVENTS).toContain(e);
  });

  it('gathers round the ship as the phase goes on, and never leaves', () => {
    const at = (id) => sharkLevelFor(deck.meta, atPreset(id));
    expect(at('p4_start').level).toBe('following');
    expect(at('p4_shark_duty').level).toBe('attacking');
    expect(at('p4_hundreds_of_sharks')).toMatchObject({ level: 'swarm', crowd: 100 });
    const frenzy = atPreset('p4_frenzy');
    frenzy.story.set('frenzy_started');
    expect(sharkLevelFor(deck.meta, frenzy).level).toBe('frenzy');
    expect(at('p4_post_frenzy_repairs').level).toBe('swarm');
    expect(at('p4_complete').level).toBe('swarm'); // the shark crisis is unresolved
  });
});

describe('the Forecast Board', () => {
  const log = content.logs.require('forecasts');

  it('opens with the board, and holds every forecast by the end', () => {
    expect(logAvailable(log, atPreset('p4_start'))).toBe(false);
    const end = atPreset('p4_complete');
    expect(logAvailable(log, end)).toBe(true);
    const entries = logEntries(log, end);
    expect(entries.map((e) => e.id)).toEqual(['day1', 'day2', 'day3', 'days4_6', 'day7', 'day7_revised', 'tomorrow']);
    for (const e of entries) {
      expect(e.predicted, e.id).toBeTruthy();
      expect(e.risk, e.id).toBeTruthy();
      expect(e.confidence, e.id).toBeTruthy();
    }
    // Garrick's crayon map for each day he drew one.
    const maps = entries.filter((e) => e.insert).map((e) => e.insert);
    expect(maps.length).toBeGreaterThanOrEqual(6);
    for (const m of maps) expect(m).toMatch(/^forecast_/);
    expect(JSON.stringify(entries.at(-1))).toMatch(/700%/);
  });
});

describe('Phase 4 saves', () => {
  it('is version 4 or later, and a Phase 3 save migrates with the Center nowhere yet', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(4);
    const v3 = JSON.parse(JSON.stringify(atPreset('phase3_complete').serialize()));
    delete v3.story.values;
    const v4 = migrateState(v3, 3, 4);
    expect(v4.story.values).toEqual({});
    expect(v4.story.flags).toContain('p3_complete');
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: v4 });
    expect(deadCenterLocation(loaded)).toBe(null);
    expect(currentChapter(content.game, loaded).id).toBe('phase3_end');
  });

  it('a version 3 save record in storage upgrades on load', () => {
    const storage = new MemoryStorage();
    const old = new SaveManager({ storage, content, version: 3, migrations: {} });
    expect(old.save(1, atPreset('phase3_complete')).ok).toBe(true);
    const res = new SaveManager({ storage, content }).read(1);
    expect(res.ok).toBe(true);
    expect(res.state.story.values).toEqual(expect.any(Object));
    expect(res.state.story.flags).toContain('p3_complete');
  });

  it('saves and loads at every Phase 4 checkpoint without losing anything', () => {
    const ids = content.debugPresets.list().map((p) => p.id).filter((id) => id.startsWith('p4_'));
    expect(ids.length).toBe(18);
    for (const id of ids) {
      const s = atPreset(id);
      const state = JSON.parse(JSON.stringify(s.serialize()));
      const loaded = GameSession.fromState({ content, bus: new EventBus(), state });
      const again = JSON.parse(JSON.stringify(loaded.serialize()));
      // (A preset names a spawn point; the world turns it into x, y on arrival, before any real save.)
      for (const key of ['story', 'quests', 'inventory', 'party', 'world']) expect(again[key], `${id}: ${key}`).toEqual(state[key]);
      expect(again.location.map, id).toBe(state.location.map);
      expect(currentChapter(content.game, loaded).id, id).toBe(currentChapter(content.game, s).id);
      expect(deadCenterLocation(loaded), id).toBe(deadCenterLocation(s));
    }
  });

  it('keeps everything Phase 4 changed across a save', () => {
    const s = atPreset('p4_complete');
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: JSON.parse(JSON.stringify(s.serialize())) });
    for (const f of ['garrick_grand_stenchmaster_sash', 'forecast_board_up', 'bell_protocol_established', 'squawks_bald_again', 'beard_refreshed', 'p4_complete']) {
      expect(loaded.story.has(f), f).toBe(true);
    }
    expect(deadCenterLocation(loaded)).toBe('treasure_hold');
    expect(loaded.story.getVar('p4_hull_damage')).toBe(3);
    expect(currentChapter(content.game, loaded).id).toBe('phase4_end');
  });
});
