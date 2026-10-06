import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { currentChapter, resolveVariant } from '../src/systems/story/progress.js';
import { logEntries } from '../src/systems/logs/logbook.js';
import { isShared, sharedText } from './laterPhases.js';
import { makeStory } from './storyHarness.js';

/**
 * Plays Story Phase 3 (The Grand Stenchmaster) with the real content (see
 * tests/storyHarness.js): from the end of Phase 2 to the second distant
 * release, and from every Phase 3 debug preset, to prove each one is a real,
 * finishable point in the story.
 *
 * The driver looks at which objective is open and does what a player would
 * do about it, so it can pick the story up anywhere.
 */

const PHASE3_QUESTS = ['necessary_promotion', 'what_did_you_call_me', 'frog_grog', 'ship_is_changing', 'sharks', 'stenchmaster_temporarily'];

async function go(s, map) {
  if (s.map !== map) await s.enter(map);
}

/** First open objective wins; each step does what a player would do about it. */
const STEPS = [
  ['necessary_promotion.speak', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['necessary_promotion.log', async (s) => { await go(s, 'main_deck'); await s.inspect('stench_log'); }],
  ['necessary_promotion.declare', async (s) => { await s.enter('main_deck'); }],
  ['what_did_you_call_me.notice', async (s) => { await go(s, 'main_deck'); await s.inspect('amendment'); }],
  ['what_did_you_call_me.confront', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['frog_grog.gathering', async (s) => { await s.enter('galley'); }],
  ['frog_grog.taste', async (s) => { await go(s, 'galley'); await s.talk('mags'); }],
  ['frog_grog.confirm', async (s) => {
    if (!s.has('grog_check_cabinet')) {
      await go(s, 'captains_quarters');
      await s.inspect('rum_check');
    } else if (!s.has('grog_check_medicine')) {
      await go(s, 'crew_quarters');
      await s.inspect('brandy_check');
    } else {
      await go(s, 'crew_quarters');
      await s.inspect('hidden_check');
    }
  }],
  ['frog_grog.unlock', async (s) => { await s.enter('galley'); }],
  ['ship_is_changing.sails', async (s) => { await go(s, 'main_deck'); await s.inspect('mast_sails'); }],
  ['ship_is_changing.ropes', async (s) => { await go(s, 'main_deck'); await s.inspect('rope_damp'); }],
  ['ship_is_changing.bell', async (s) => { await go(s, 'main_deck'); await s.inspect('bell_p3'); }],
  ['ship_is_changing.wood', async (s) => { await go(s, 'cargo_hold'); await s.inspect('wood_yellow'); }],
  ['ship_is_changing.crew', async (s) => {
    const who = [['heard_chart', 'nell', 'main_deck'], ['heard_cannons', 'brask', 'main_deck'], ['heard_fish', 'jim', 'main_deck'], ['heard_hammocks', 'jory', 'crew_quarters']].find(([f]) => !s.has(f));
    await go(s, who[2]);
    await s.talk(who[1]);
  }],
  ['ship_is_changing.sharks', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['sharks.impact', async (s) => { await go(s, 'main_deck'); await s.trigger('p3_impact'); }],
  ['sharks.patch', async (s) => {
    await go(s, 'main_deck');
    if (!s.has('plank_fetched')) {
      await s.inspect('breach'); // no plank yet: Jory sends you for one
      await s.inspect('planks');
    }
    await s.inspect('breach');
  }],
  ['sharks.rudder', async (s) => { await go(s, 'main_deck'); await s.inspect('rudder'); }],
  ['sharks.supplies', async (s) => {
    await go(s, 'main_deck');
    if (!s.has('beard_bait_seen')) await s.trigger('p3_beard_bait');
    await s.trigger('p3_spill');
  }],
  ['sharks.solution', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['sharks.rowboat', async (s) => { await go(s, 'main_deck'); await s.inspect('rowboat_lower'); }],
  ['stenchmaster_temporarily.recover', async (s) => { await go(s, 'main_deck'); await s.inspect('davits_empty'); }],
  ['stenchmaster_temporarily.damage', async (s) => { await s.talk('jory'); }],
  ['stenchmaster_temporarily.terms', async (s) => { await s.talk('garrick'); }],
  ['stenchmaster_temporarily.squawks', async (s) => { await s.talk('squawks'); }],
  ['stenchmaster_temporarily.evacuate', async (s) => { await go(s, 'main_deck'); await s.inspect('rowboat_again'); }],
];

async function playToEnd(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 80 && !s.has('p3_complete'); n++) {
    const step = STEPS.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) {
      const open = PHASE3_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 3 objective the player can act on`);
    }
    onStep(step[0], s);
    await step[1](s);
  }
  expect(s.has('p3_complete'), 'Story Phase 3 reaches its end').toBe(true);
}

/** From "Phase 2 complete": arriving on deck starts Phase 3 the same evening. */
async function playPhase3(pick) {
  const s = makeStory({ pick, preset: 'phase2_complete' });
  await s.enter('main_deck');
  expect(s.has('p3_started')).toBe(true);
  expect(currentChapter(s.content.game, s.session).id).toBe('p3c1');
  const chapters = [];
  const names = {};
  await playToEnd(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
      names[ref] = st.session.party.leader().name;
    },
  });
  return { s, chapters, names };
}

/** Every story phase after `n` that has flags (so a new phase's log entries are never counted as this one's). */
function phasesAfter(n) {
  return fs.readdirSync(path.resolve('data/story/flags'))
    .map((f) => /^phase(\d+)\.json$/.exec(f))
    .filter((m) => m && Number(m[1]) > n)
    .map((m) => `phase${m[1]}`);
}

/** Flags that belong to later story phases (their log entries are not Phase 3's). */
function laterPhaseFlags() {
  const ids = [];
  for (const phase of phasesAfter(3)) {
    ids.push(...JSON.parse(fs.readFileSync(path.resolve(`data/story/flags/${phase}.json`), 'utf8')).map((f) => f.id));
  }
  return new Set(ids);
}

describe('Story Phase 3 can be played start to finish (headless)', () => {
  it('taking the first option at every choice', async () => {
    const { s, chapters, names } = await playPhase3('first');
    expect(chapters).toEqual(['p3c1', 'p3c2', 'p3c3', 'p3c4', 'p3c5', 'p3c6']);
    expect(currentChapter(s.content.game, s.session).id).toBe('phase3_end');
    for (const q of PHASE3_QUESTS) expect(s.quest(q), q).toBe('completed');
    // The rename lands in the middle of chapter 10 and sticks.
    expect(names['what_did_you_call_me.confront']).toBe('Blackbeard');
    expect(names['frog_grog.taste']).toBe('Stinkbeard');
    expect(names['stenchmaster_temporarily.evacuate']).toBe('Stinkbeard');
    expect(s.log.length).toBeGreaterThan(500);
  });

  it('taking the last option at every choice (the attitudes converge)', async () => {
    const { s } = await playPhase3('last');
    for (const q of PHASE3_QUESTS) expect(s.quest(q), q).toBe('completed');
  });

  it('leaves the ship permanently changed', async () => {
    const { s } = await playPhase3('first');
    for (const f of [
      'captain_named_stinkbeard', 'stenchmaster_declared', 'garrick_title_retained', 'frog_grog_unlocked',
      'wood_yellowing_seen', 'sails_swollen', 'bell_coughs', 'ropes_sweating', 'hull_patched', 'squawks_first_new_feather_yellow',
      'stomach_alarm_protocol', 'controlled_release_rule', 'garrick_evacuated_again', 'second_release_seen', 'p3_complete',
    ]) {
      expect(s.has(f), f).toBe(true);
    }
    const inv = s.session.inventory;
    expect(inv.count('rum_ration')).toBe(0);
    expect(inv.count('frog_grog')).toBeGreaterThanOrEqual(2);
    // Garrick's canonical title, and the captain's name, in menus and name plates.
    const garrick = resolveVariant(s.content.npcs.require('garrick'), s.session);
    expect(garrick.title).toBe('Grand Stenchmaster');
    expect(garrick.name).toBe('Grand Stenchmaster Garrick');
    expect(s.session.party.leader().name).toBe('Stinkbeard');
    // Every Stench Log entry is unlocked by the end, bar the optional crew chats not had.
    const log = s.content.logs.get('stench_log');
    const have = new Set(logEntries(log, s.session).map((e) => e.id));
    // (Entries a later phase unlocks are not Phase 3's to unlock.)
    const later = laterPhaseFlags();
    const missing = log.entries.filter((e) => !later.has(e.if?.flag)).map((e) => e.id).filter((id) => !have.has(id));
    expect(missing.every((id) => ['hammocks', 'guns', 'chart'].includes(id)), missing.join()).toBe(true);
    expect(have.has('captains_beard') && have.has('sharks') && have.has('protocol')).toBe(true);
    expect(s.opened).toContain('stench_log');
    // The Stench Log is read once, then Garrick's promotion is never re-run.
    expect(s.log.filter((l) => l.includes('GRAND STENCHMASTER') || l.includes('Friends. Crewmates. Captain. Parrot.')).length).toBe(1);
  });

  it('keeps talking after the end without restarting anything', async () => {
    const { s } = await playPhase3('first');
    const before = s.log.length;
    await s.enter('main_deck');
    for (const id of ['squawks', 'hale', 'quill', 'mags', 'brask', 'nell', 'wick', 'rook', 'sully', 'finch', 'jory', 'bob', 'ned', 'jim', 'gristle', 'fennimore']) {
      await s.talk(id);
    }
    expect(s.has('p3_complete')).toBe(true);
    expect(s.log.slice(before).join('\n')).not.toMatch(/CHAPTER|Friends\. Crewmates/);
  });

  it('a clumsy hull patch still holds (and is remembered)', async () => {
    const s = makeStory({ preset: 'shark_attack' });
    s.setRepairScore(1);
    await s.enter('main_deck');
    await s.inspect('planks');
    await s.inspect('breach');
    expect(s.has('hull_patched')).toBe(true);
    expect(s.session.story.getVar('hull_patch_clean')).toBe(1);
    expect(s.log.join('\n')).toMatch(/bent nails and hope/);
  });
});

describe('Story Phase 3 debug presets are real, finishable points in the story', () => {
  const presets = ['phase3_start', 'stenchmaster_declaration', 'pre_rename', 'stinkbeard_named', 'frog_grog_unlocked', 'ship_transformation',
    'pre_shark_attack', 'shark_attack', 'rowboat_lure', 'post_shark_damage', 'squawks_yellow_feather', 'phase3_complete'];
  for (const id of presets) {
    it(`${id} plays through to the end of Phase 3`, async () => {
      const s = makeStory({ preset: id });
      await s.enter(s.map);
      await playToEnd(s);
      for (const q of PHASE3_QUESTS) expect(s.quest(q), `${id}: ${q}`).toBe('completed');
    });
  }
});

describe('Story Phase 3 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase3', 'data/dialogue/phase3', 'data/logs', 'data/npcs/phase3_crew.json', 'data/items/phase3.json',
    'data/quests/phase3.json', 'data/story/flags/phase3.json', 'data/maps/ship/phase3', 'data/statuses/phase3.json', 'data/story/vistas/phase3.json',
  ];
  const later = laterPhaseFlags();
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)) : [p];
    // The logbooks are shared: leave out what a later phase unlocks.
    return list.map((x) => (isShared(x) ? sharedText(x, later) : fs.readFileSync(x, 'utf8')));
  }).join('\n');

  it('never uses borrowed characters or later-phase mythology', () => {
    for (const banned of [/wario/i, /nintendo/i, /\bwa+h+\b/i, /sharkstorm/i, /stenchcaster/i, /entertainment system/i, /brogath/i,
      /bling bling/i, /codex/i, /raiders/i, /sash law/i, /stenchmaster'?s? court/i, /ancient grand stenchmaster/i]) {
      expect(text).not.toMatch(banned);
    }
  });

  it('stops at the second distant release (no Phase 4 content)', () => {
    const s = makeStory({ preset: 'phase3_complete' });
    expect(s.has('p3_complete')).toBe(true);
    expect(s.has('garrick_evacuated_again')).toBe(true);
    expect(s.content.storyTriggers.list().filter((t) => JSON.stringify(t.if).includes('p3_complete') && !JSON.stringify(t.if).includes('notFlag'))).toEqual([]);
  });
});

describe('Story Phase 3 staging (who stands where, scene by scene)', () => {
  it('never puts anyone on a solid tile, walks them through one, boxes the captain in or cuts off a doorway', async () => {
    const s = makeStory({ preset: 'phase2_complete' });
    await s.enter('main_deck');
    await playToEnd(s);
    expect(s.stagingIssues).toEqual([]);
  });
});
