import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { currentChapter, resolveVariant } from '../src/systems/story/progress.js';
import { deadCenterLocation } from '../src/systems/hazards/deadCenter.js';
import { sharkstormNow } from '../src/systems/hazards/sharkstorm.js';
import { tvDef, tvCondition, tvState } from '../src/systems/tv/tv.js';
import { logEntries } from '../src/systems/logs/logbook.js';
import { resolvePreset } from '../src/debug/presets.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { makeStory } from './storyHarness.js';

/**
 * Plays Story Phase 7 (the Great Sharkstorm returns; the Song of the Grand
 * Stenchmaster) with the real content (see tests/storyHarness.js): from the
 * end of Phase 6, through the bed in the captain's cabin, to the crew in the
 * hold watching The Frog Tax Man on the S.E.S. Mark II; and from every
 * Phase 7 debug preset. The timing bars and the Mark II knob panel are
 * worked by the harness.
 */

export const PHASE7_QUESTS = ['sharkstorm_returns', 'which_away', 'not_a_duty', 'job_description', 'stenchmaster_parade', 'back_to_work',
  'everyone_below', 'mark_two', 'pleasant_evening'];

async function go(s, map) {
  if (s.map !== map) await s.enter(map);
}

const firstMissing = (s, ids, prefix) => ids.find((id) => !s.has(`${prefix}${id}`));

/** First open objective wins; each step does what a player would do about it. */
const STEPS = [
  ['sharkstorm_returns.repairs', async (s) => {
    await go(s, 'main_deck');
    await s.inspect(s.pickLast ? (s.has('p7_fore_rigging') ? 'p7_debris' : 'p7_foremast') : (s.has('p7_debris_cleared') ? 'p7_foremast' : 'p7_debris'));
  }],
  ['sharkstorm_returns.ned', async (s) => { await go(s, 'main_deck'); await s.talk('ned'); }],
  ['sharkstorm_returns.telescope', async (s) => { await go(s, 'main_deck'); await s.inspect('p7_telescope_look'); }],
  ['which_away.squawks', async (s) => {
    await go(s, 'main_deck');
    // The rigging first, the way most players will; the last-pick run fetches Squawks first.
    if (!s.pickLast && !(s.has('p7_line_a') && s.has('p7_line_b') && s.has('p7_sail_reefed'))) {
      if (!s.has('p7_line_a')) await s.inspect('p7_line_a');
      else if (!s.has('p7_line_b')) await s.inspect('p7_line_b');
      else await s.inspect('p7_reef');
      return;
    }
    await s.talk('squawks');
  }],
  ['which_away.lines', async (s) => { await go(s, 'main_deck'); await s.inspect(s.has('p7_line_a') ? 'p7_line_b' : 'p7_line_a'); }],
  ['which_away.sail', async (s) => { await go(s, 'main_deck'); await s.inspect('p7_reef'); }],
  ['which_away.shark', async (s) => { await go(s, 'main_deck'); await s.inspect('p7_heave'); }],
  ['which_away.helm', async (s) => { await go(s, 'main_deck'); await s.inspect('p7_helm'); }],
  ['which_away.garrick', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['not_a_duty.rule', async (s) => { await go(s, 'main_deck'); await s.inspect('p7_rule'); }],
  ['not_a_duty.read', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['job_description.crew', async (s) => {
    await go(s, 'main_deck');
    const crew = ['gristle', 'pete', 'bob', 'hale', 'rook'];
    await s.talk(firstMissing(s, s.pickLast ? crew.slice().reverse() : crew, 'p7_grievance_'));
  }],
  ['job_description.confront', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['stenchmaster_parade.pete', async (s) => {
    await go(s, 'main_deck');
    if (s.pickLast && !s.has('p7_helped_jim')) return s.talk('jim');
    if (s.pickLast) return s.talk('pete');
    return s.inspect('p7_pete_shark');
  }],
  ['stenchmaster_parade.bob', async (s) => { await go(s, 'main_deck'); await s.talk('bob'); }],
  ['stenchmaster_parade.jim', async (s) => { await go(s, 'main_deck'); await s.talk('jim'); }],
  ['back_to_work.salvage', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['everyone_below.wheel', async (s) => { await go(s, 'main_deck'); await s.inspect('p7_lash'); }],
  ['everyone_below.below', async (s) => {
    if (s.map === 'main_deck') await s.warp('to_galley');
    else if (s.map === 'galley') await s.warp('to_hold');
    else await s.enter('cargo_hold');
  }],
  ['mark_two.build', async (s) => { await go(s, 'cargo_hold'); await s.inspect('p7_bench'); }],
  ['mark_two.switch', async (s) => { await go(s, 'cargo_hold'); await s.talk('garrick'); }],
  ['mark_two.knobs', async (s) => { await go(s, 'cargo_hold'); await s.inspect('p7_knobs'); }],
  ['pleasant_evening.elsewhere', async (s) => {
    await go(s, 'cargo_hold');
    if (s.pickLast) return s.talk(s.has('p7_not_watching_crew') ? 'rook' : 'hale');
    return s.inspect(s.has('p7_not_watching_pump') ? 'p7_nw_crates' : 'p7_nw_pump');
  }],
  ['pleasant_evening.sit', async (s) => { await go(s, 'cargo_hold'); await s.inspect('p7_seat_sit'); }],
];

export async function playToEndP7(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 160 && !s.has('p7_complete'); n++) {
    const step = STEPS.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) {
      const open = PHASE7_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 7 objective the player can act on`);
    }
    onStep(step[0], s);
    await step[1](s);
  }
  expect(s.has('p7_complete'), 'Story Phase 7 reaches its end').toBe(true);
}

/** From "Phase 6 complete": the captain goes to bed, and wakes up in Phase 7. */
async function playPhase7(pick) {
  const s = makeStory({ pick, preset: 'p6_complete' });
  s.pickLast = pick === 'last';
  s.session.inventory.add('frog_grog', 3);
  s.grogBefore = s.session.inventory.count('frog_grog');
  await s.enter('main_deck');
  expect(s.has('p7_started'), 'Phase 7 waits for the bed').toBe(false);
  await s.enter('captains_quarters');
  s.choices.push(0); // "Sleep"
  await s.inspect('p7_bed');
  expect(s.has('p7_started')).toBe(true);
  expect(currentChapter(s.content.game, s.session).id).toBe('p7c1');
  const chapters = [];
  await playToEndP7(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
    },
  });
  return { s, chapters };
}

describe('Story Phase 7 can be played start to finish (headless)', () => {
  it('taking the first option at every choice', async () => {
    const { s, chapters } = await playPhase7('first');
    expect(chapters).toEqual(['p7c1', 'p7c2', 'p7c3', 'p7c4', 'p7c5', 'p7c6', 'p7c7', 'p7c8', 'p7c9']);
    expect(currentChapter(s.content.game, s.session).id).toBe('phase7_end');
    for (const q of PHASE7_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.log.length).toBeGreaterThan(500);
  });

  it('taking the last option at every choice (the tones converge)', async () => {
    const { s } = await playPhase7('last');
    for (const q of PHASE7_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.log.join('\n')).toMatch(/garrick: Technically, we discouraged it\./);
    expect(s.log.join('\n')).toMatch(/squawks: Frog better Stenchmaster\./);
  });

  it('leaves the canonical end state', async () => {
    const { s } = await playPhase7('first');
    for (const f of [
      'great_sharkstorm_returned', 'garrick_aura_named', 'grand_sharkmaster_invented', 'garrick_cape_torn', 'stenchmaster_parade_done',
      'grand_stenchmaster_song_performed', 'ses_mark1_wrecked', 'ses_mark2_built', 'ses_mark2_operational', 'crew_watched_frog_tax_man',
      'crew_franklin_fans', 'p7_one_episode', 'p7_squawks_verdict', 'p7_rested', 'p7_complete',
      // carried over, untouched
      'great_sharkstorm_created', 'great_sharkstorm_active', 'bulk_frog_grog_depleted', 'garrick_food_ban', 'garrick_emergency_labor_rule',
      'frog_tax_man_unlocked', 'squawks_fully_bald', 'p6_complete',
    ]) {
      expect(s.has(f), f).toBe(true);
    }
    // The Great Sharkstorm came BACK (it was never re-created) and is still there, right over the ship.
    expect(sharkstormNow(s.content, s.session)).toMatchObject({ id: 'active_near_ship', distance: 'near' });
    expect(s.log.filter((l) => /CHAPTER 30|frenzy|naming/i.test(l) && /Sharkstorm\.$/.test(l))).toEqual([]);
    // The bulk reserve is still empty (it can't be done again); the captain's own Frog Grog is untouched.
    expect(s.session.story.getVar('bulk_frog_grog')).toBe(0);
    expect(s.session.inventory.count('frog_grog')).toBe(s.grogBefore);
    // The S.E.S.: Mark I wrecked and kept (its history intact), Mark II built and on Franklin.
    expect(tvCondition(tvDef(s.content, 'ses'), s.session)).toMatchObject({ id: 'wrecked', dead: true });
    const mk2 = tvDef(s.content, 'ses_mk2');
    expect(tvCondition(mk2, s.session).id).toBe('working');
    expect(tvState(mk2, s.session)).toMatchObject({ power: true, dead: false });
    expect(tvState(mk2, s.session).channel.id).toBe(7);
    expect(s.session.story.getVar('ses_generation')).toBe(2);
    expect(s.tvs).toContain('ses_mk2:knobs');
    // The Dead Center is where Phase 6 left it; the hatches are barred.
    expect(deadCenterLocation(s.session)).toBe('second_sleeping_quarters');
    const galley = s.content.maps.require('galley');
    const barred = galley.objects.find((o) => o.id === 'p7_hatch_block');
    expect(evaluateCondition(barred.if, s.session)).toBe(true);
    // Garrick: still Grand Stenchmaster, the same palette, torn; Squawks alive, bald, wrapped up.
    const garrick = resolveVariant(s.content.npcs.require('garrick'), s.session);
    expect(garrick.appearance).toBe('garrick_stenchmaster_torn');
    const look = s.content.appearances.require('garrick_stenchmaster_torn');
    expect(look.outfit).toMatchObject({ primary: 'burgundy', secondary: 'mustard', pants: 'bilious' });
    expect(look.extras).toEqual(expect.arrayContaining(['gaudy', 'singed', 'torn', 'regalia', 'stenchsash']));
    expect(resolveVariant(s.content.npcs.require('squawks'), s.session).appearance).toBe('squawks_fully_bald');
    // The Stench Log, including the office that isn't real.
    const stench = logEntries(s.content.logs.get('stench_log'), s.session);
    for (const id of ['p7_aura', 'p7_sharkmaster', 'p7_cape', 'p7_song', 'p7_mk2', 'p7_evening']) expect(stench.find((e) => e.id === id), id).toBeTruthy();
    expect(stench.find((e) => e.id === 'p7_sharkmaster').notes).toMatch(/NOT REAL/);
    expect(stench.find((e) => e.id === 'p6_storm').status).toMatch(/Returned/);
    // Each big moment happens exactly once.
    const all = s.log.join('\n');
    const once = (re) => expect(s.log.filter((l) => re.test(l)).length, String(re)).toBe(1);
    once(/^garrick: Technically, we discouraged it\.$/);
    once(/^garrick: Forecasting language is nuanced\.$/);
    once(/^captain: AWAY\.$/);
    once(/^captain: That is an excellent question\.$/);
    once(/^garrick: Franklin has an audit hearing tonight\.$/);
    once(/^garrick: Grand Stenchmaster technology\.$/);
    once(/^garrick: Exactly\. That's a staffing problem\.$/);
    once(/^garrick: \.\.\.No\. No\. Conflict of interest\.$/);
    once(/^garrick: CEREMONIAL PROPERTY, Captain\.$/);
    once(/^garrick: \.\.\.Then what is the crew FOR\?$/);
    once(/^garrick: I'm assisting emotionally\.$/);
    once(/^garrick: Reception\.$/);
    once(/^garrick: Looks professional\.$/);
    once(/^franklin: \.\.\.Ribbit\.\.\.$/);
    once(/^squawks: Frog better Stenchmaster\.$/);
    // The recognition beat, in order.
    expect(all).toMatch(/squawks: No\.\ncaptain: I know\.\nsquawks: Sky sharks again\.\ncaptain: \.\.\.Aye\./);
    // The aura.
    expect(all).toMatch(/residual Stenchmaster exhaust[\s\S]*captain: No\.[\s\S]*Grand Stenchmaster Aura\.\ncrew: THAT'S WORSE!/);
    // The labour rule, explicitly invoked, and the loophole.
    expect(all).toMatch(/AT LEAST one useful thing[\s\S]*Meteorological Shark Management/);
    // The song, with its interruptions, stopped halfway through the second verse.
    expect(all).toMatch(/My regal suit of burgundy! ♪\ncrew: UGLY!/);
    expect(all).toMatch(/My medal shining like the sun! ♪\njim: IT'S A POT LID!/);
    expect(all).toMatch(/The bravest man upon the sea! ♪\ncrew: NO!/);
    expect(all).toMatch(/VERSE THE SECOND[\s\S]*captain: ENOUGH\.[\s\S]*squawks: \.\.\.Song over\?\ncaptain: Aye\.[\s\S]*squawks: Best news tonight\./);
    // The one-episode compromise.
    expect(all).toMatch(/garrick: \.\.\.After the episode\?\ncaptain: No\.\ngarrick: Two episodes\?\ncaptain: No\.[\s\S]*garrick: \.\.\.One episode\./);
  });

  it('plays the new Frog Tax Man episode from data (invented frog forms only)', async () => {
    const { s } = await playPhase7('first');
    const prog = s.content.tvPrograms.get('frog_tax_man');
    const ep = prog.episodes.find((e) => e.id === 'season_seventeen_flies');
    const lines = ep.beats.map((b) => b.line).filter(Boolean).join('\n');
    expect(lines).toMatch(/Twenty-seven thousand flies/);
    expect(lines).toMatch(/Business snacks, or personal snacks\?/);
    expect(lines).toMatch(/Can they be both\?/);
    expect(lines).toMatch(/Form RIB-40/);
    expect(lines).toMatch(/Schedule POND/);
    expect(lines).toMatch(/10-FROG-X/);
    expect(lines).toMatch(/depreciat/i);
    const knobs = tvDef(s.content, 'ses_mk2').knobs.list.map((k) => k.label);
    expect(knobs).toEqual(['VOLUME?', 'UPSIDE', 'ROLLY', 'SHRIEK', 'COLOUR', 'SPOON', 'FROG MAYBE']);
  });

  it('keeps talking after the end without restarting anything', async () => {
    const { s } = await playPhase7('first');
    const before = s.log.length;
    await go(s, 'cargo_hold');
    for (const id of ['garrick', 'squawks', 'pete', 'hale', 'wick', 'rook', 'sully', 'brask', 'gristle', 'jory', 'bob', 'ned', 'nell', 'finch',
      'fennimore', 'mags', 'jim', 'quill', 'penhallow']) {
      await s.talk(id);
    }
    await s.inspect('p7_mk2');
    await s.inspect('p7_seat');
    await s.inspect('p7_song_sheet');
    await s.enter('galley');
    await s.inspect('p7_hatch_barred');
    expect(s.has('p7_complete')).toBe(true);
    expect(s.log.slice(before).join('\n')).not.toMatch(/CHAPTER|SONG|♪|WARM-UP/);
    expect(s.tvs.filter((t) => t === 'ses_mk2').length).toBeGreaterThan(0);
  });
});

describe('Chapter 34 keeps the captain pointed at the next job', () => {
  it('each job says what is left and where; the crew stop asking for jobs already done; every later stage is named', async () => {
    const s = makeStory({ preset: 'p7_flying_sharks_return' });
    await s.enter(s.map, resolvePreset(s.content, 'p7_flying_sharks_return').script);
    const said = async (fn) => {
      const n = s.log.length;
      await fn();
      return s.log.slice(n).join('\n');
    };
    expect(await said(() => s.talk('rook'))).toMatch(/Make the shrouds fast/);
    expect(await said(() => s.inspect('p7_line_a'))).toMatch(/fore shrouds, Captain! Starboard side/);
    expect(await said(() => s.talk('rook'))).toMatch(/Port main's holding/);
    expect(await said(() => s.talk('jory'))).toMatch(/One shroud still loose, Captain! The starboard fore/);
    // Both shrouds fast: the game says so, and what comes next.
    expect(await said(() => s.inspect('p7_line_b'))).toMatch(/Now the mainsail, Captain! Reef it, at the foot of the mainmast/);
    const finch = await said(() => s.talk('finch'));
    expect(finch).toMatch(/Fore shrouds are fast/);
    expect(finch).not.toMatch(/banging like a door/);
    expect(await said(() => s.talk('rook'))).not.toMatch(/Make the shrouds fast/);
    expect(await said(() => s.talk('jory'))).toMatch(/Now reef the main/);
    expect(await said(() => s.inspect('p7_reef'))).toMatch(/Squawks, Captain! He's still out in his basket by the cabin door/);
    expect(await said(() => s.talk('hale'))).toMatch(/Main's reefed/);
    // The last job: a shark lands, and everybody on deck says where.
    await s.talk('squawks');
    expect(s.session.quests.isObjectiveAvailable('which_away', 'shark')).toBe(true);
    for (const npc of ['rook', 'finch', 'hale', 'jory', 'bob', 'gristle', 'nell']) expect(await said(() => s.talk(npc)), npc).toMatch(/main hatch/);
    await s.inspect('p7_heave');
    for (const npc of ['rook', 'jory', 'pete']) expect(await said(() => s.talk(npc)), npc).toMatch(/helm/i);
    await s.inspect('p7_helm');
    for (const npc of ['hale', 'jory', 'nell']) expect(await said(() => s.talk(npc)), npc).toMatch(/his chair/);
  });
});

describe('Story Phase 7 debug presets are real, finishable points in the story', () => {
  const presets = ['p7_start', 'p7_sharkstorm_returning', 'p7_flying_sharks_return', 'p7_garrick_tv_complaint', 'p7_not_a_duty',
    'p7_grand_sharkmaster', 'p7_crew_revolt', 'p7_cape_shark', 'p7_stenchmaster_parade', 'p7_stenchmaster_song', 'p7_mk1_wrecked',
    'p7_retreat_below', 'p7_mk2_construction', 'p7_mk2_startup', 'p7_franklin_returns', 'p7_crew_watches', 'p7_complete'];
  it('there are seventeen of them', () => {
    const s = makeStory({ preset: 'p7_start' });
    for (const id of presets) expect(s.content.debugPresets.get(id), id).toBeTruthy();
    expect(s.content.debugPresets.list().filter((p) => p.id.startsWith('p7_')).length).toBe(17);
  });
  for (const id of presets) {
    it(`${id} plays through to the end of Phase 7`, async () => {
      const s = makeStory({ preset: id });
      await s.enter(s.map, resolvePreset(s.content, id).script);
      await playToEndP7(s);
      for (const q of PHASE7_QUESTS) expect(s.quest(q), `${id}: ${q}`).toBe('completed');
      expect(sharkstormNow(s.content, s.session).id, id).toBe('active_near_ship');
    });
  }
});

describe('Story Phase 7 staging (who stands where, scene by scene)', () => {
  it('never puts anyone on a solid tile, walks them through one, boxes the captain in or cuts off a doorway', async () => {
    const { s } = await playPhase7('first');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
  it('the same, choosing the last option everywhere', async () => {
    const { s } = await playPhase7('last');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
});

describe('Story Phase 7 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase7', 'data/dialogue/phase7', 'data/npcs/phase7_crew.json', 'data/quests/phase7.json',
    'data/story/flags/phase7.json', 'data/maps/ship/phase7', 'data/story/vistas/phase7.json', 'data/tv/ses_mk2.json',
    'data/tv/programs', 'data/hazards/sharkstorm.json', 'data/appearances/phase7.json', 'data/audio/music/grand_stenchmaster_song.json',
  ];
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)) : [p];
    return list.map((x) => fs.readFileSync(x, 'utf8'));
  }).join('\n');

  it('never uses borrowed characters, the forbidden storm name, or later-phase material', () => {
    for (const banned of [/wario/i, /nintendo/i, /\bwa+h+\b/i, /sharknado/i, /\bnado\b/i, /brogath/i, /codex/i, /raiders/i,
      /stenchmaster'?s? court/i, /ancient (grand )?stenchmaster/i, /buried treasure/i, /treasure .*into the (great )?sharkstorm/i, /purple/i]) {
      expect(text).not.toMatch(banned);
    }
  });

  it('builds Mark II out of nonsense, never out of a real procedure', () => {
    for (const banned of [/capacitor/i, /discharg/i, /high.?voltage/i, /\bvolts?\b/i, /wiring diagram/i, /screwdriver/i, /solder/i, /\bunplug/i,
      /ground (the|it)\b/i, /transformer/i, /flyback/i, /cathode/i, /\bamps?\b/i]) {
      expect(text).not.toMatch(banned);
    }
    expect(text).toMatch(/SPECIAL INSULATION|Special insulation/);
    expect(text).toMatch(/Signal routing/);
  });

  it('keeps the original suit palette', () => {
    const looks = JSON.parse(fs.readFileSync(path.resolve('data/appearances/phase7.json'), 'utf8'));
    for (const a of looks) expect(a.outfit).toMatchObject({ primary: 'burgundy', secondary: 'mustard', pants: 'bilious' });
  });

  it('never makes the Grand Sharkmaster real', () => {
    const s = makeStory({ preset: 'p7_complete' });
    expect(s.content.npcs.get('grand_sharkmaster')).toBeFalsy();
    expect(s.content.extraSpeakers?.get?.('grand_sharkmaster') ?? null).toBeFalsy();
  });

  it('stops in the hold (no trigger past the end of Phase 7, and the storm is not resolved)', () => {
    const s = makeStory({ preset: 'p7_complete' });
    const later = s.content.storyTriggers.list().filter((t) => JSON.stringify(t.if).includes('p7_complete') && !JSON.stringify(t.if).includes('notFlag'));
    expect(later).toEqual([]);
    expect(sharkstormNow(s.content, s.session).id).toBe('active_near_ship');
  });
});
