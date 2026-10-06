import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { currentChapter, resolveVariant } from '../src/systems/story/progress.js';
import { logEntries } from '../src/systems/logs/logbook.js';
import { deadCenterLocation } from '../src/systems/hazards/deadCenter.js';
import { sharedText } from './laterPhases.js';
import { makeStory } from './storyHarness.js';

/**
 * Plays Story Phase 5 (What Does the Grand Stenchmaster Actually Do?) with
 * the real content (see tests/storyHarness.js): from the end of Phase 4,
 * through the bed in the captain's cabin, to the S.E.S. at night; and from
 * every Phase 5 debug preset, to prove each one is a real, finishable point
 * in the story. Shark Duty is played by firing the duty's own events, the
 * way the world does when a shark is seen off.
 */

const PHASE5_QUESTS = ['another_terrible_day', 'remember_squawks', 'what_do_you_do', 'stenchmaster_office', 'dressed_for_disaster', 'one_useful_thing'];

async function go(s, map) {
  if (s.map !== map) await s.enter(map);
}

async function repel(s, event, n) {
  for (let i = 0; i < n; i++) await s.run([{ event }]);
  await s.settle();
}

/** Talks to the first of these people who still has something to say for an objective. */
async function talkFirst(s, people, flagPrefix) {
  const who = people.find((id) => !s.has(`${flagPrefix}${id}`));
  await s.talk(who);
}

/** First open objective wins; each step does what a player would do about it. */
const STEPS = [
  ['another_terrible_day.pete', async (s) => { await go(s, 'main_deck'); await s.talk('pete'); }],
  ['another_terrible_day.jim', async (s) => { await go(s, 'main_deck'); await s.enter('galley'); }],
  ['another_terrible_day.gristle', async (s) => { await go(s, 'galley'); await s.enter('cargo_hold'); }],
  ['another_terrible_day.bob', async (s) => { await go(s, 'main_deck'); await s.enter('crew_quarters'); }],
  ['remember_squawks.grab', async (s) => { await go(s, 'main_deck'); await s.talk('squawks'); }],
  ['remember_squawks.safe', async (s) => { await go(s, 'main_deck'); await s.trigger('p5_safe_aft'); }],
  ['remember_squawks.check', async (s) => { await go(s, 'main_deck'); await s.talk('squawks'); }],
  ['remember_squawks.crew', async (s) => { await go(s, 'main_deck'); await talkFirst(s, ['gristle', 'pete', 'bob', 'fennimore'], 'p5_sqt_'); }],
  ['what_do_you_do.repel', async (s) => {
    await go(s, 'main_deck');
    await s.talk('garrick'); // 'Can't talk, Captain. On duty.'
    await repel(s, 'p5_shark_repelled', 4);
  }],
  ['what_do_you_do.ask', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['what_do_you_do.ses', async (s) => { await go(s, 'main_deck'); await s.inspect('p5_ses_first'); }],
  ['stenchmaster_office.duty', async (s) => { await go(s, 'main_deck'); await repel(s, 'p5_office_repelled', 6); }],
  ['stenchmaster_office.rudder', async (s) => { await go(s, 'main_deck'); await s.inspect('p5_rudder'); }],
  ['stenchmaster_office.log', async (s) => { await go(s, 'main_deck'); await s.inspect('p5_log'); }],
  ['stenchmaster_office.chair', async (s) => { await go(s, 'main_deck'); await s.inspect('p5_chair_first'); }],
  ['stenchmaster_office.complaints', async (s) => {
    // The galley (bread, and the Grand Stenchmaster's 'quality assurance'), the washroom door, then the deck.
    if (!s.has('p5_cmp_mags')) {
      await go(s, 'main_deck');
      await s.enter('galley');
      expect(s.has('p5_bread_seen'), 'the Center sits on the bread').toBe(true);
      await s.talk('garrick');
      await s.talk('mags'); // Jim has walked out (he named the dough)
      return;
    }
    if (!s.has('p5_cmp_brask')) {
      await s.enter('crew_quarters');
      expect(s.has('p5_washroom_wait_seen'), "'I'll wait.'").toBe(true);
      await s.talk('brask');
      return;
    }
    await go(s, 'main_deck');
    await talkFirst(s, ['gristle', 'pete', 'bob', 'rook'], 'p5_cmp_');
  }],
  ['stenchmaster_office.center', async (s) => { await go(s, 'main_deck'); await s.trigger('p5_station_aft'); }],
  ['dressed_for_disaster.find', async (s) => { await go(s, 'galley'); await s.enter('cargo_hold'); }],
  ['dressed_for_disaster.assemble', async (s) => { await go(s, 'galley'); await s.enter('main_deck'); }],
  ['dressed_for_disaster.order', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['dressed_for_disaster.starboard', async (s) => {
    await go(s, 'main_deck');
    const spot = [['p5_stbd_a', 'p5_stbd_a'], ['p5_stbd_b', 'p5_stbd_b'], ['p5_stbd_c', 'p5_stbd_c']].find(([f]) => !s.has(f));
    await s.inspect(spot[1]);
  }],
  ['one_useful_thing.squawks', async (s) => { await go(s, 'main_deck'); await s.talk('squawks'); }],
  ['one_useful_thing.duty', async (s) => { await go(s, 'main_deck'); await repel(s, 'p5_emergency_repelled', 5); }],
  ['one_useful_thing.confront', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['one_useful_thing.repair', async (s) => { await go(s, 'main_deck'); await s.inspect('p5_final_repair'); }],
  ['one_useful_thing.night', async (s) => { await go(s, 'main_deck'); await s.talk('squawks'); }],
  ['one_useful_thing.ses', async (s) => { await go(s, 'main_deck'); await s.inspect('p5_ses_night'); }],
];

async function playToEnd(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 120 && !s.has('p5_complete'); n++) {
    const step = STEPS.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step && s.map !== 'main_deck') {
      // Nothing to do down here: the story picks up on deck (the next chapter starts there).
      await s.enter('main_deck');
      continue;
    }
    if (!step) {
      const open = PHASE5_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 5 objective the player can act on`);
    }
    onStep(step[0], s);
    await step[1](s);
  }
  expect(s.has('p5_complete'), 'Story Phase 5 reaches its end').toBe(true);
}

/** From "Phase 4 complete": the captain goes to bed, and wakes up in Phase 5. */
async function playPhase5(pick) {
  const s = makeStory({ pick, preset: 'p4_complete' });
  await s.enter('main_deck');
  expect(s.has('p5_started'), 'Phase 5 waits for the bed').toBe(false);
  await s.enter('captains_quarters');
  s.choices.push(0); // "Sleep until morning"
  await s.inspect('p5_bed');
  expect(s.has('p5_started')).toBe(true);
  expect(currentChapter(s.content.game, s.session).id).toBe('p5c1');
  const chapters = [];
  await playToEnd(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
    },
  });
  return { s, chapters };
}

describe('Story Phase 5 can be played start to finish (headless)', () => {
  it('taking the first option at every choice', async () => {
    const { s, chapters } = await playPhase5('first');
    expect(chapters).toEqual(['p5c1', 'p5c2', 'p5c3', 'p5c4', 'p5c5']);
    expect(currentChapter(s.content.game, s.session).id).toBe('phase5_end');
    for (const q of PHASE5_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.log.length).toBeGreaterThan(500);
  });

  it('taking the last option at every choice', async () => {
    const { s } = await playPhase5('last');
    for (const q of PHASE5_QUESTS) expect(s.quest(q), q).toBe('completed');
  });

  it('leaves the canonical end state', async () => {
    const { s } = await playPhase5('first');
    for (const f of [
      'stenchmaster_entertainment_system_built', 'stenchmaster_suit_created', 'stenchmaster_station_unlocked', 'squawks_fully_bald',
      'crew_confronted_garrick_duties', 'garrick_emergency_labor_rule', 'p5_complete',
      // carried over from Phase 4, untouched
      'garrick_grand_stenchmaster_sash', 'forecast_board_up', 'bell_protocol_established', 'p4_complete',
    ]) {
      expect(s.has(f), f).toBe(true);
    }
    // Still Stinkbeard; Garrick still the Grand Stenchmaster, now in the suit; Squawks fully bald and in his basket.
    expect(s.session.party.leader().name).toBe('Stinkbeard');
    const garrick = resolveVariant(s.content.npcs.require('garrick'), s.session);
    expect(garrick.title).toBe('Grand Stenchmaster');
    expect(garrick.appearance).toBe('garrick_stenchmaster_suit');
    expect(garrick.portrait).toBe('garrick_stenchmaster_suit');
    const squawks = resolveVariant(s.content.npcs.require('squawks'), s.session);
    expect(squawks.appearance).toBe('squawks_fully_bald');
    expect(squawks.portrait).toBe('squawks_fully_bald');
    // The Center is resting in the treasure room again; the sharks are still out there.
    expect(deadCenterLocation(s.session)).toBe('treasure_hold');
    // The S.E.S. was looked at (and the TV state is ordinary saved story variables).
    expect(s.tvs.filter((id) => id === 'ses').length).toBeGreaterThanOrEqual(1);
    expect(s.session.story.getVar('ses_power')).toBe(1);
    // The Stench Log has the office, the S.E.S., the suit, the rule and the parrot.
    const stench = logEntries(s.content.logs.get('stench_log'), s.session);
    for (const id of ['p5_bald', 'p5_office', 'p5_ses', 'p5_suit', 'p5_rule']) expect(stench.find((e) => e.id === id), id).toBeTruthy();
    expect(stench.find((e) => e.id === 'p5_rule').notes).toMatch(/booted/);
    // Each big moment happens exactly once.
    const once = (re) => expect(s.log.filter((l) => re.test(l)).length, String(re)).toBe(1);
    once(/THE STENCHMASTER ENTERTAINMENT SYSTEM\./);
    once(/Behold: THE GRAND STENCHMASTER SUIT/);
    once(/Ye have invented a royal office for being lazy/);
    once(/That's my one\./);
    once(/^garrick: Programming\.$/);
    // The rule, and the crew's answer to 'leadership'.
    expect(s.log.join('\n')).toMatch(/Does 'providing leadership' count\?\ncrew: NO\./);
    // Squawks: the check-in lines, and he is never killed off.
    expect(s.log.join('\n')).toMatch(/squawks: Bald\.[\s\S]*squawks: Everything feels drafty\.[\s\S]*squawks: Want new crew\.[\s\S]*squawks: Unfortunately\./);
  });

  it('rings three bells with the crew panicking, and never lets Garrick panic', async () => {
    const { s } = await playPhase5('first');
    const threes = s.alarms.filter((a) => a.level === 3);
    expect(threes.length).toBeGreaterThanOrEqual(4);
    const panic = s.content.hazards.get('alarms').panic;
    expect(panic[0].exclude).toContain('garrick');
    expect(panic[0].lines).toContain('Remember the bird!');
  });

  it('keeps talking after the end without restarting anything', async () => {
    const { s } = await playPhase5('first');
    const before = s.log.length;
    await s.enter('main_deck');
    for (const id of ['garrick', 'squawks', 'pete', 'hale', 'wick', 'rook', 'sully', 'brask', 'gristle', 'jory', 'bob', 'ned', 'nell', 'finch', 'fennimore', 'penhallow']) {
      await s.talk(id);
    }
    await s.inspect('p5_ses');
    await s.inspect('p5_rule');
    await s.inspect('p5_grog_table');
    await s.enter('galley');
    for (const id of ['mags', 'jim', 'quill']) await s.talk(id);
    expect(s.has('p5_complete')).toBe(true);
    expect(s.log.slice(before).join('\n')).not.toMatch(/CHAPTER|Behold|That's my one/);
  });

  it('offers Shark Duty afterwards, where the Grand Stenchmaster helps once', async () => {
    const s = makeStory({ preset: 'p5_complete' });
    await s.enter('main_deck');
    s.choices.push(0);
    await s.talk('jory');
    expect(s.has('optional_duty_on')).toBe(true);
    const open = s.content.hazards.get('shark_duty').sessions.open_watch;
    expect(open.assist).toMatchObject({ who: 'garrick', if: { flag: 'garrick_emergency_labor_rule' } });
    s.choices.push(0);
    await s.talk('jory');
    expect(s.has('optional_duty_on')).toBe(false);
  });
});

describe('Story Phase 5 debug presets are real, finishable points in the story', () => {
  const presets = ['p5_start', 'p5_dead_center_panic', 'p5_squawks_check', 'p5_duties', 'p5_ses_reveal', 'p5_shark_duty',
    'p5_suit_reveal', 'p5_crew_furious', 'p5_combined_emergency', 'p5_night_ses', 'p5_complete'];
  it('there are eleven of them', () => {
    const s = makeStory({ preset: 'p5_start' });
    for (const id of presets) expect(s.content.debugPresets.get(id), id).toBeTruthy();
    expect(s.content.debugPresets.list().filter((p) => p.id.startsWith('p5_')).length).toBe(11);
  });
  for (const id of presets) {
    it(`${id} plays through to the end of Phase 5`, async () => {
      const s = makeStory({ preset: id });
      await s.enter(s.map);
      await playToEnd(s);
      for (const q of PHASE5_QUESTS) expect(s.quest(q), `${id}: ${q}`).toBe('completed');
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

/** A shared logbook file without the entries (and variants) a later phase unlocks. */
const withoutLaterEntries = (file, later) => sharedText(file, later);

describe('Story Phase 5 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase5', 'data/dialogue/phase5', 'data/npcs/phase5_crew.json', 'data/quests/phase5.json',
    'data/story/flags/phase5.json', 'data/maps/ship/phase5', 'data/story/vistas/phase5.json', 'data/tv/ses.json',
    'data/hazards/alarms.json', 'data/hazards/shark_duty.json', 'data/logs/stench_log.json', 'data/appearances/phase5.json',
  ];
  const later = laterPhaseFlags(phasesAfter(5));
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)) : [p];
    return list.map((x) => (x.includes(`${path.sep}logs${path.sep}`) ? withoutLaterEntries(x, later) : fs.readFileSync(x, 'utf8')));
  }).join('\n');

  it('never uses borrowed characters, consoles or later-phase material', () => {
    for (const banned of [/wario/i, /nintendo/i, /\bNES\b/, /famicom/i, /\bwa+h+\b/i, /sharkstorm/i, /shark storm/i, /brogath/i,
      /bling bling/i, /ancient grand stenchmaster/i, /ancient stenchmaster/i, /midnight (fart|release)/i, /treasure .*into the storm/i]) {
      expect(text).not.toMatch(banned);
    }
  });

  it('stops at the night scene (no trigger past the end of Phase 5)', () => {
    const s = makeStory({ preset: 'p5_complete' });
    const later = s.content.storyTriggers.list().filter((t) => JSON.stringify(t.if).includes('p5_complete') && !JSON.stringify(t.if).includes('notFlag'));
    expect(later).toEqual([]);
  });
});

describe('Story Phase 5 staging (who stands where, scene by scene)', () => {
  it('never puts anyone on a solid tile, walks them through one, boxes the captain in or cuts off a doorway', async () => {
    const { s } = await playPhase5('first');
    expect(s.stagingIssues).toEqual([]);
  });
});
