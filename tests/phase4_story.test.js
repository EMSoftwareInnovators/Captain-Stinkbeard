import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { currentChapter, resolveVariant } from '../src/systems/story/progress.js';
import { logEntries } from '../src/systems/logs/logbook.js';
import { deadCenterLocation } from '../src/systems/hazards/deadCenter.js';
import { makeStory } from './storyHarness.js';

/**
 * Plays Story Phase 4 (Life Around the Dead Center) with the real content
 * (see tests/storyHarness.js): from the end of Phase 3, through the bed in
 * the captain's cabin, to tomorrow's 700% forecast; and from every Phase 4
 * debug preset, to prove each one is a real, finishable point in the story.
 *
 * The driver looks at which objective is open and does what a player would
 * do about it. Shark Duty is played by firing the duty's own events, the way
 * the world does when a shark is seen off.
 */

const PHASE4_QUESTS = ['todays_forecast', 'life_around_center', 'worst_places', 'seven_feathers', 'shark_duty', 'repair_it_again'];

async function go(s, map) {
  if (s.map !== map) await s.enter(map);
}

async function repel(s, event, n) {
  for (let i = 0; i < n; i++) await s.run([{ event }]);
  await s.settle();
}

/** First open objective wins; each step does what a player would do about it. */
const STEPS = [
  ['todays_forecast.ration', async (s) => { await s.enter('galley'); }],
  ['todays_forecast.ask', async (s) => { await go(s, 'galley'); await s.talk('garrick'); }],
  ['todays_forecast.inspect', async (s) => { await go(s, 'galley'); await s.inspect('p4_forecast_table'); }],
  ['todays_forecast.evacuate', async (s) => {
    await go(s, 'galley');
    // The door and the hold stairs are shut while the Center is in the room: only the ladder.
    expect(await s.warp('p4_to_crew')).toBe(false);
    expect(await s.warp('p4_to_hold')).toBe(false);
    await s.warp('to_deck');
  }],
  ['todays_forecast.board', async (s) => { await go(s, 'main_deck'); await s.inspect('p4_board_first'); }],
  ['life_around_center.protocol', async (s) => { await go(s, 'main_deck'); await s.inspect('p4_protocol'); }],
  ['life_around_center.washroom', async (s) => {
    if (!s.has('washroom_door_seen')) {
      await s.enter('crew_quarters');
      // Nobody walks into the washroom while the Center is in it.
      expect(await s.warp('to_washroom')).toBe(false);
      return;
    }
    await go(s, 'main_deck');
    await s.inspect('p4_scuttle_rescue');
  }],
  ['life_around_center.damper', async (s) => { await go(s, 'main_deck'); await s.inspect('p4_damper'); }],
  ['life_around_center.lunch', async (s) => {
    if (!s.has('lunch_salvaged')) {
      await s.enter('galley');
      await s.enter('cargo_hold');
      await s.inspect('p4_biscuits_take');
    }
    await go(s, 'main_deck');
    await s.talk('jim');
  }],
  ['life_around_center.quarters', async (s) => { await go(s, 'main_deck'); await s.talk('bob'); }],
  ['life_around_center.night', async (s) => {
    await go(s, 'captains_quarters');
    if (!s.has('night_squawks_saved')) {
      // The door won't let him leave without Squawks.
      expect(await s.warp('p4_to_deck')).toBe(false);
      await s.talk('squawks');
    }
    await s.warp('p4_to_deck');
  }],
  ['life_around_center.quarterdeck', async (s) => { await go(s, 'main_deck'); await s.inspect('p4_helm_fix'); }],
  ['worst_places.wash', async (s) => {
    await go(s, 'crew_quarters');
    await s.warp('to_washroom');
    await s.inspect('tub_wash');
  }],
  ['worst_places.log', async (s) => { await go(s, 'main_deck'); await s.inspect('p4_log_beard'); }],
  ['seven_feathers.check', async (s) => { await go(s, 'captains_quarters'); await s.talk('squawks'); }],
  ['seven_feathers.protect', async (s) => { await go(s, 'captains_quarters'); await s.warp('p4_to_deck'); }],
  ['seven_feathers.return', async (s) => { await go(s, 'main_deck'); await s.warp('to_cabin'); }],
  ['shark_duty.report', async (s) => { await go(s, 'main_deck'); await s.inspect('p4_duty_pole'); }],
  ['shark_duty.repel', async (s) => { await go(s, 'main_deck'); await repel(s, 'shark_repelled', 6); }],
  ['shark_duty.port', async (s) => { await go(s, 'main_deck'); await s.talk('jory'); }],
  ['shark_duty.starboard', async (s) => { await go(s, 'main_deck'); await s.talk('ned'); }],
  ['shark_duty.numbers', async (s) => { await go(s, 'main_deck'); await repel(s, 'shark_repelled_more', 8); }],
  ['shark_duty.garrick', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['shark_duty.evacuate', async (s) => { await go(s, 'main_deck'); await s.talk('squawks'); }],
  ['repair_it_again.repairs', async (s) => {
    await go(s, 'main_deck');
    const spot = [['repair_board_done', 'p4_fix_board'], ['repair_rope_done', 'p4_fix_rope'], ['repair_patch_done', 'p4_fix_patch']].find(([f]) => !s.has(f));
    await s.inspect(spot[1]);
  }],
  ['repair_it_again.forecast', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['repair_it_again.evacuate', async (s) => { await go(s, 'main_deck'); await s.trigger('p4_evac_aft'); }],
];

async function playToEnd(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 90 && !s.has('p4_complete'); n++) {
    const step = STEPS.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) {
      const open = PHASE4_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 4 objective the player can act on`);
    }
    onStep(step[0], s);
    await step[1](s);
  }
  expect(s.has('p4_complete'), 'Story Phase 4 reaches its end').toBe(true);
}

/** From "Phase 3 complete": the captain goes to bed, and wakes up in Phase 4. */
async function playPhase4(pick) {
  const s = makeStory({ pick, preset: 'phase3_complete' });
  await s.enter('main_deck');
  expect(s.has('p4_started'), 'Phase 4 waits for the bed').toBe(false);
  await s.enter('captains_quarters');
  s.choices.push(0); // "Sleep until morning"
  await s.inspect('p4_bed');
  expect(s.has('p4_started')).toBe(true);
  expect(currentChapter(s.content.game, s.session).id).toBe('p4c1');
  const chapters = [];
  await playToEnd(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
    },
  });
  return { s, chapters };
}

describe('Story Phase 4 can be played start to finish (headless)', () => {
  it('taking the first option at every choice', async () => {
    const { s, chapters } = await playPhase4('first');
    expect(chapters).toEqual(['p4c1', 'p4c2', 'p4c3', 'p4c4', 'p4c5']);
    expect(currentChapter(s.content.game, s.session).id).toBe('phase4_end');
    for (const q of PHASE4_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.log.length).toBeGreaterThan(400);
  });

  it('taking the last option at every choice', async () => {
    const { s } = await playPhase4('last');
    for (const q of PHASE4_QUESTS) expect(s.quest(q), q).toBe('completed');
  });

  it('leaves the canonical end state', async () => {
    const { s } = await playPhase4('first');
    for (const f of [
      'garrick_grand_stenchmaster_sash', 'forecast_board_up', 'bell_protocol_established', 'squawks_reached_seven_feathers',
      'squawks_bald_again', 'shark_duty_introduced', 'garrick_refused_duty', 'frenzy_started', 'fresh_repair_destroyed',
      'forecast_drunk', 'three_hundred_more', 'tomorrow_forecast_seen', 'p4_complete',
    ]) {
      expect(s.has(f), f).toBe(true);
    }
    // Still Stinkbeard; Garrick still Grand Stenchmaster, now in his sash; Squawks bald again.
    expect(s.session.party.leader().name).toBe('Stinkbeard');
    const garrick = resolveVariant(s.content.npcs.require('garrick'), s.session);
    expect(garrick.title).toBe('Grand Stenchmaster');
    expect(garrick.appearance).toBe('garrick_grand_stenchmaster');
    expect(resolveVariant(s.content.npcs.require('squawks'), s.session).appearance).toBe('squawks_bald_again');
    // The Center keeps wandering (it is resting in the treasure room), and the damage stays.
    expect(deadCenterLocation(s.session)).toBe('treasure_hold');
    expect(s.session.story.getVar('p4_hull_damage')).toBe(3);
    // Every forecast is on the board, and the waterline disaster is in the Stench Log.
    const board = s.content.logs.get('forecasts');
    expect(logEntries(board, s.session).map((e) => e.id)).toEqual(board.entries.map((e) => e.id));
    const stench = logEntries(s.content.logs.get('stench_log'), s.session);
    expect(stench.find((e) => e.id === 'waterline')?.notes).toMatch(/Excellent response/);
    expect(stench.find((e) => e.id === 'captains_beard')?.status).toBe('Refreshed');
    expect(s.opened).toContain('forecasts');
    // All four bells were rung, each shown with its meaning (never sound alone).
    expect(new Set(s.alarms.map((a) => a.level))).toEqual(new Set([1, 2, 3, 4]));
    // The first forecast and the final 700% forecast happen exactly once.
    expect(s.log.filter((l) => l.includes('the first official GRAND STENCHMASTER STENCH FORECAST')).length).toBe(1);
    expect(s.log.filter((l) => l.includes('That seems more accurate')).length).toBe(1);
  });

  it('keeps talking after the end without restarting anything', async () => {
    const { s } = await playPhase4('first');
    const before = s.log.length;
    await s.enter('main_deck');
    for (const id of ['garrick', 'squawks', 'pete', 'hale', 'wick', 'rook', 'sully', 'brask', 'gristle', 'jory', 'bob', 'ned', 'nell', 'finch', 'fennimore']) {
      await s.talk(id);
    }
    await s.enter('galley');
    for (const id of ['mags', 'jim', 'quill']) await s.talk(id);
    expect(s.has('p4_complete')).toBe(true);
    expect(s.log.slice(before).join('\n')).not.toMatch(/CHAPTER|That seems more accurate/);
  });

  it('offers Shark Duty afterwards as an optional shift, and lets you stand down', async () => {
    const s = makeStory({ preset: 'p4_complete' });
    await s.enter('main_deck');
    const before = s.log.length;
    s.choices.push(0);
    await s.talk('jory'); // his end-state line, then the offer: take a shift
    expect(s.log.slice(before).join('\n')).toMatch(/PATCH FOR PATCH[\s\S]*Want a shift/);
    expect(s.has('optional_duty_on')).toBe(true);
    s.choices.push(0);
    await s.talk('jory'); // stand down
    expect(s.has('optional_duty_on')).toBe(false);
  });
});

describe('Story Phase 4 debug presets are real, finishable points in the story', () => {
  const presets = ['p4_start', 'p4_morning_grog', 'p4_first_forecast', 'p4_breakfast_evacuation', 'p4_life_around_center', 'p4_washroom_incident',
    'p4_galley_incident', 'p4_night_evacuation', 'p4_quarterdeck_blocked', 'p4_seven_feathers', 'p4_bald_again', 'p4_shark_duty',
    'p4_hundreds_of_sharks', 'p4_frenzy', 'p4_post_frenzy_repairs', 'p4_center_returns', 'p4_final_forecast', 'p4_complete'];
  it('there are eighteen of them', () => {
    const s = makeStory({ preset: 'p4_start' });
    for (const id of presets) expect(s.content.debugPresets.get(id), id).toBeTruthy();
  });
  for (const id of presets) {
    it(`${id} plays through to the end of Phase 4`, async () => {
      const s = makeStory({ preset: id });
      await s.enter(s.map);
      await playToEnd(s);
      for (const q of PHASE4_QUESTS) expect(s.quest(q), `${id}: ${q}`).toBe('completed');
    });
  }
});

/** Every story phase after `n` that has flags (so a new phase's log entries are never counted as this one's). */
function phasesAfter(n) {
  return fs.readdirSync(path.resolve('data/story/flags'))
    .map((f) => /^phase(\d+)\.json$/.exec(f))
    .filter((m) => m && Number(m[1]) > n)
    .map((m) => `phase${m[1]}`);
}

/** Flags that belong to later story phases (their log entries are not this phase's). */
function laterPhaseFlags(phases) {
  return new Set(phases.flatMap((phase) => JSON.parse(fs.readFileSync(path.resolve(`data/story/flags/${phase}.json`), 'utf8')).map((f) => f.id)));
}

/** A shared logbook file without the entries a later phase unlocks. */
function withoutLaterEntries(file, later) {
  const logs = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const log of Object.values(logs)) if (log?.entries) log.entries = log.entries.filter((e) => !later.has(e.if?.flag));
  return JSON.stringify(logs);
}

describe('Story Phase 4 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase4', 'data/dialogue/phase4', 'data/logs', 'data/npcs/phase4_crew.json', 'data/quests/phase4.json',
    'data/story/flags/phase4.json', 'data/maps/ship/phase4', 'data/maps/ship/washroom.json', 'data/story/vistas/phase4.json',
    'data/hazards/dead_center.json', 'data/hazards/shark_duty.json', 'data/hazards/alarms.json',
  ];
  const later = laterPhaseFlags(phasesAfter(4));
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)) : [p];
    return list.map((x) => (x.includes(`${path.sep}logs${path.sep}`) ? withoutLaterEntries(x, later) : fs.readFileSync(x, 'utf8')));
  }).join('\n');

  it('never uses borrowed characters or later-phase mythology', () => {
    for (const banned of [/wario/i, /nintendo/i, /\bwa+h+\b/i, /sharkstorm/i, /shark storm/i, /stenchcaster/i, /brogath/i,
      /ancient grand stenchmaster/i, /grand stenchmaster fart/i, /midnight (fart|release)/i, /sash (has|gives|grants) (power|magic)/i]) {
      expect(text).not.toMatch(banned);
    }
  });

  it('leaves the shark crisis unresolved (no trigger past the end of Phase 4)', () => {
    const s = makeStory({ preset: 'p4_complete' });
    const later = s.content.storyTriggers.list().filter((t) => JSON.stringify(t.if).includes('p4_complete') && !JSON.stringify(t.if).includes('notFlag'));
    expect(later).toEqual([]);
    expect(s.has('p4_complete')).toBe(true);
  });
});

describe('Story Phase 4 staging (who stands where, scene by scene)', () => {
  it('never puts anyone on a solid tile, walks them through one, boxes the captain in or cuts off a doorway', async () => {
    const { s } = await playPhase4('first');
    expect(s.stagingIssues).toEqual([]);
  });
});
