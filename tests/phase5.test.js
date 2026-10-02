import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/content/loadContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { migrateState } from '../src/systems/save/migrations.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION } from '../src/config/constants.js';
import { currentChapter, resolveVariant } from '../src/systems/story/progress.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { tvDef, availableChannels, tvState, setPower, stepChannel, nextLines } from '../src/systems/tv/tv.js';
import { panicShouts } from '../src/systems/hazards/alarms.js';
import { dutyData, dutySessionFor } from '../src/systems/hazards/sharkDuty.js';
import { deadCenterLocations, deadCenterLocation } from '../src/systems/hazards/deadCenter.js';
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

describe('the Stenchmaster Entertainment System', () => {
  const ses = tvDef(content, 'ses');

  it('has the six channels the brief asks for, and nothing named', () => {
    expect(ses.name).toBe('The Stenchmaster Entertainment System');
    // Phase 5's own channels; later phases add programme channels behind a flag (Phase 6: The Frog Tax Man).
    const own = ses.channels.filter((c) => !c.program);
    expect(own.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(own.map((c) => c.title)).toEqual(['Static', 'Weather', 'Potatoes', 'A Fish', 'The Theatre', 'Whispers']);
    for (const c of own) expect(c.comments.length, c.title).toBeGreaterThanOrEqual(3);
    for (const c of ses.channels.filter((x) => x.program)) expect(c.if, `${c.title} waits for its phase`).toBeTruthy();
  });

  it('starts off, tunes to the first channel when switched on, and wraps the knob both ways', () => {
    const s = freshSession();
    expect(tvState(ses, s).power).toBe(false);
    setPower(ses, s, true);
    expect(tvState(ses, s)).toMatchObject({ power: true, channel: { id: 1 } });
    expect(stepChannel(ses, s, -1).id).toBe(6);
    expect(stepChannel(ses, s, 1).id).toBe(1);
    for (let i = 0; i < 5; i++) stepChannel(ses, s, 1);
    expect(tvState(ses, s).channel.id).toBe(6);
    expect(availableChannels(ses, s).length).toBe(6);
  });

  it("keeps its state in saved story variables (it survives a save)", () => {
    const s = atPreset('p5_complete');
    setPower(ses, s, true);
    stepChannel(ses, s, 1);
    const ch = tvState(ses, s).channel.id;
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: JSON.parse(JSON.stringify(s.serialize())) });
    expect(tvState(ses, loaded)).toMatchObject({ power: true, channel: { id: ch } });
  });

  it('takes turns through the looks, and leaves out whoever is not there to answer', () => {
    const s = freshSession();
    const looks = ses.powerSource;
    const first = nextLines(ses, s, 'power', looks, () => true);
    expect(first.map((l) => l.text)).toEqual(['A cask, a coil of copper, a cannon lock and three bottles of something green, all wired together.',
      'There is no sensible reason this should work.', 'And yet.']);
    const second = nextLines(ses, s, 'power', looks, () => false);
    expect(second.every((l) => l.speaker !== 'garrick')).toBe(true);
    expect(second.length).toBe(1);
  });

  it('can misbehave in all four ways, and the slap has lines', () => {
    expect(ses.failures.kinds.sort()).toEqual(['buzz', 'roll', 'smoke', 'spark']);
    expect(ses.slap.length).toBeGreaterThan(0);
    expect(ses.wiring.flat().join(' ')).toMatch(/I recognise none of this/);
    expect(ses.wiring.flat().join(' ')).toMatch(/tied to a spoon/);
  });

  it('shows on deck as the set is: covered, off, or on its channel', () => {
    const props = content.mapPatches.get('main_deck_phase5').props.filter((p) => p.x === 14 && p.y === 17);
    const shown = (s) => props.filter((p) => evaluateCondition(p.if, s)).map((p) => p.prop);
    expect(shown(atPreset('p5_start'))).toEqual(['ses_tv_covered']);
    const s = atPreset('p5_ses_reveal');
    expect(shown(s)).toEqual(['ses_tv_ch5']);
    setPower(ses, s, false);
    expect(shown(s)).toEqual(['ses_tv_off']);
    setPower(ses, s, true);
    stepChannel(ses, s, 1);
    expect(shown(s)).toEqual(['ses_tv_ch6']);
  });
});

describe('the Grand Stenchmaster and Squawks', () => {
  it('Garrick wears the suit (sash and all) once it exists, and stays the Grand Stenchmaster', () => {
    const before = resolveVariant(content.npcs.require('garrick'), atPreset('p5_suit_reveal'));
    expect(before.appearance).toBe('garrick_grand_stenchmaster');
    const after = resolveVariant(content.npcs.require('garrick'), atPreset('p5_crew_furious'));
    expect(after.appearance).toBe('garrick_stenchmaster_suit');
    expect(after.portrait).toBe('garrick_stenchmaster_suit');
    expect(after.title).toBe('Grand Stenchmaster');
    const look = content.appearances.require('garrick_stenchmaster_suit');
    for (const e of ['stenchsash', 'regalia', 'brassboots']) expect(look.extras, e).toContain(e);
  });

  it('Squawks is fully bald from the close call on, and alive in every preset', () => {
    expect(resolveVariant(content.npcs.require('squawks'), atPreset('p5_start')).appearance).toBe('squawks_bald_again');
    for (const id of ['p5_squawks_check', 'p5_night_ses', 'p5_complete']) {
      expect(resolveVariant(content.npcs.require('squawks'), atPreset(id)).appearance, id).toBe('squawks_fully_bald');
    }
    const deck = content.mapPatches.get('main_deck_phase5').objects.filter((o) => o.npc === 'squawks' && !o.absent);
    expect(deck.length).toBeGreaterThan(0);
  });
});

describe('panic when the bell goes', () => {
  const rnd = () => 0.1;
  it('three bells: the crew on screen shout, Garrick never does, Squawks may answer', () => {
    const s = atPreset('p5_start');
    const out = panicShouts(content, s, 3, ['garrick', 'pete', 'gristle', 'bob', 'rook', 'squawks'], rnd);
    const shouters = out.map((o) => o.who);
    expect(shouters).not.toContain('garrick');
    expect(shouters.filter((w) => w !== 'squawks').length).toBe(3);
    expect(new Set(out.map((o) => o.text)).size).toBe(out.length);
    expect(shouters[shouters.length - 1]).toBe('squawks');
  });
  it('is quiet before Phase 5, and when nobody is on screen', () => {
    expect(panicShouts(content, atPreset('p4_complete'), 3, ['pete', 'bob'], rnd)).toEqual([]);
    expect(panicShouts(content, atPreset('p5_start'), 3, [], rnd)).toEqual([]);
  });
});

describe('Phase 5 Shark Duty', () => {
  const duty = dutyData(content);
  it('has the three shifts, each counting toward its quest objective', () => {
    for (const [id, ref] of [['p5_first_watch', 'what_do_you_do.repel'], ['office_watch', 'stenchmaster_office.duty'], ['emergency_watch', 'one_useful_thing.duty']]) {
      const def = duty.sessions[id];
      expect(def.counter, id).toBe(ref);
      const [q, o] = ref.split('.');
      expect(content.quests.require(q).objectives.find((x) => x.id === o).target).toBe(def.event);
      for (const w of def.waves) if (w.section) expect(duty.sections[w.section], `${id}: ${w.section}`).toBeTruthy();
    }
  });
  it('runs exactly when the story asks', () => {
    const meta = compiled('main_deck').meta;
    expect(dutySessionFor(meta, atPreset('p5_duties'))).toBe(null);
    expect(dutySessionFor(meta, atPreset('p5_shark_duty'))).toBe('office_watch');
    expect(dutySessionFor(meta, atPreset('p5_crew_furious'))).toBe(null);
  });
  it('the Grand Stenchmaster heckles, the crew answer back, and every speaker is real', () => {
    const office = duty.sessions.office_watch;
    expect(office.barks.filter((b) => b.who === 'garrick' && b.reply?.text === 'WE KNOW!').length).toBeGreaterThanOrEqual(3);
    for (const def of Object.values(duty.sessions)) {
      for (const b of def.barks ?? []) {
        expect(content.npcs.get(b.who), b.who).toBeTruthy();
        if (b.reply) expect(content.npcs.get(b.reply.who), b.reply.who).toBeTruthy();
      }
    }
  });
  it('under the labour rule, the optional shift gets one useful thing from Garrick', () => {
    const a = duty.sessions.open_watch.assist;
    expect(a.who).toBe('garrick');
    expect(evaluateCondition(a.if, atPreset('p5_combined_emergency'))).toBe(false);
    expect(evaluateCondition(a.if, atPreset('p5_complete'))).toBe(true);
    expect(a.lines).toContain("That's my one.");
  });
});

describe('the Dead Center in Phase 5', () => {
  it('has the new stops on real maps', () => {
    const all = deadCenterLocations(content);
    for (const id of ['storeroom', 'midships', 'station']) expect(all[id], id).toBeTruthy();
    expect(all.station.map).toBe('main_deck');
  });
});

describe('Phase 5 saves', () => {
  it('is version 5 or later, and a finished Phase 4 save migrates and walks into chapter 20', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(5);
    const v4 = JSON.parse(JSON.stringify(atPreset('p4_complete').serialize()));
    delete v4.world.counters;
    const v5 = migrateState(v4, 4, 5);
    expect(v5.world.counters).toEqual({});
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: v5 });
    expect(loaded.story.has('p4_complete')).toBe(true);
    expect(loaded.story.has('p5_started')).toBe(false);
    expect(currentChapter(content.game, loaded).id).toBe('phase4_end');
    expect(deadCenterLocation(loaded)).toBe('treasure_hold');
  });

  it('a version 4 save record in storage upgrades on load', () => {
    const storage = new MemoryStorage();
    const old = new SaveManager({ storage, content, version: 4, migrations: {} });
    expect(old.save(1, atPreset('p4_complete')).ok).toBe(true);
    const res = new SaveManager({ storage, content }).read(1);
    expect(res.ok).toBe(true);
    expect(res.state.story.flags).toContain('p4_complete');
  });

  it('saves and loads at every Phase 5 checkpoint without losing anything', () => {
    const ids = content.debugPresets.list().map((p) => p.id).filter((id) => id.startsWith('p5_'));
    expect(ids.length).toBe(11);
    for (const id of ids) {
      const s = atPreset(id);
      const state = JSON.parse(JSON.stringify(s.serialize()));
      const loaded = GameSession.fromState({ content, bus: new EventBus(), state });
      const again = JSON.parse(JSON.stringify(loaded.serialize()));
      for (const key of ['story', 'quests', 'inventory', 'party', 'world']) expect(again[key], `${id}: ${key}`).toEqual(state[key]);
      expect(currentChapter(content.game, loaded).id, id).toBe(currentChapter(content.game, s).id);
    }
  });

  it('keeps everything Phase 5 made permanent across a save', () => {
    const s = atPreset('p5_complete');
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state: JSON.parse(JSON.stringify(s.serialize())) });
    for (const f of ['stenchmaster_entertainment_system_built', 'stenchmaster_suit_created', 'stenchmaster_station_unlocked',
      'squawks_fully_bald', 'crew_confronted_garrick_duties', 'garrick_emergency_labor_rule', 'p5_complete', 'garrick_grand_stenchmaster_sash']) {
      expect(loaded.story.has(f), f).toBe(true);
    }
    expect(currentChapter(content.game, loaded).id).toBe('phase5_end');
  });
});
