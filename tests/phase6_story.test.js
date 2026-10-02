import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { currentChapter, resolveVariant } from '../src/systems/story/progress.js';
import { deadCenterLocation, deadCenterProfile } from '../src/systems/hazards/deadCenter.js';
import { sharkstormNow } from '../src/systems/hazards/sharkstorm.js';
import { tvDef, tvCondition } from '../src/systems/tv/tv.js';
import { logEntries } from '../src/systems/logs/logbook.js';
import { resolvePreset } from '../src/debug/presets.js';
import { makeStory } from './storyHarness.js';

/**
 * Plays Story Phase 6 (The Death Rattle of the Stenchmaster Entertainment
 * System; The Midnight Stenchmaster Catastrophe) with the real content (see
 * tests/storyHarness.js): from the end of Phase 5, through the bed in the
 * captain's cabin, to the rowboat epilogue; and from every Phase 6 debug
 * preset. Shark Duty is played by firing the duty's own events; the knob
 * panel and the timing bars are worked by the harness.
 */

export const PHASE6_QUESTS = ['grand_supper', 'the_frog_tax_man', 'machine_refuses_to_die', 'worst_morning', 'about_to_blow',
  'second_yellow_apocalypse', 'the_great_sharkstorm', 'frog_grog_offensive'];

async function go(s, map) {
  if (s.map !== map) await s.enter(map);
}

async function repel(s, event, n) {
  for (let i = 0; i < n; i++) await s.run([{ event }]);
  await s.settle();
}

/** First open objective wins; each step does what a player would do about it. */
const STEPS = [
  ['grand_supper.squawks', async (s) => { await go(s, 'main_deck'); await s.talk('squawks'); }],
  ['grand_supper.galley', async (s) => { await go(s, 'main_deck'); await s.enter('galley'); }],
  ['grand_supper.outside', async (s) => { await go(s, 'galley'); await s.enter('main_deck'); }],
  ['the_frog_tax_man.watch', async (s) => { await go(s, 'main_deck'); await s.inspect('p6_ses_watch'); }],
  ['the_frog_tax_man.go', async (s) => { await go(s, 'captains_quarters'); await s.enter('main_deck'); }],
  ['the_frog_tax_man.wake', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['the_frog_tax_man.knobs', async (s) => { await go(s, 'main_deck'); await s.inspect('p6_ses_knobs'); }],
  ['machine_refuses_to_die.crew', async (s) => { await go(s, 'main_deck'); await s.talk(s.has('p6_rook_back') ? 'sully' : 'rook'); }],
  ['machine_refuses_to_die.smother', async (s) => {
    await go(s, 'main_deck');
    await s.inspect(['a', 'b', 'c'].map((k) => `p6_smother_${k}`).find((id) => !s.has(id)));
  }],
  ['machine_refuses_to_die.barrel', async (s) => { await go(s, 'main_deck'); await s.inspect('p6_barrel'); }],
  ['machine_refuses_to_die.wait', async (s) => { await go(s, 'main_deck'); await s.inspect('p6_ses_wait'); }],
  ['machine_refuses_to_die.cape', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['worst_morning.talk', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['worst_morning.duty', async (s) => { await go(s, 'main_deck'); await repel(s, 'p6_morning_repelled', 4); }],
  ['worst_morning.order', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
  ['about_to_blow.squawks', async (s) => { await go(s, 'crew_quarters'); await s.talk('squawks'); }],
  ['about_to_blow.wake', async (s) => {
    await go(s, 'crew_quarters');
    await s.talk(['bob', 'wick', 'brask'].find((id) => !s.has(`p6_woke_${id}`)));
  }],
  ['about_to_blow.out', async (s) => { await go(s, 'crew_quarters'); await s.trigger('p6_shift'); }],
  ['about_to_blow.refuge', async (s) => {
    await go(s, 'main_deck');
    const spots = [['hatch', () => s.talk('hale')], ['barrel', () => s.talk('rook')], ['sail', () => s.talk('sully')],
      ['rigging', () => s.talk('finch')], ['rowboat', () => s.inspect('p6_refuge_rowboat')]];
    const order = s.pickLast ? spots.slice().reverse() : spots;
    await order.find(([k]) => !s.has(`p6_refuge_${k}`))[1]();
  }],
  ['second_yellow_apocalypse.clear', async (s) => { await go(s, 'main_deck'); await s.trigger('p6_clear_aft'); }],
  ['second_yellow_apocalypse.check', async (s) => { await go(s, 'main_deck'); await s.talk('squawks'); }],
  ['second_yellow_apocalypse.rail', async (s) => { await go(s, 'main_deck'); await s.inspect('p6_rail'); }],
  ['the_great_sharkstorm.squawks', async (s) => {
    await go(s, 'main_deck');
    // Ropes first, the way most players will (then Squawks); the last-pick run does Squawks first.
    if (!s.pickLast && !['a', 'b', 'c'].every((k) => s.has(`p6_rope_${k}`))) {
      await s.inspect(['a', 'b', 'c'].map((k) => `p6_rope_${k}`).find((id) => !s.has(id)));
      return;
    }
    await s.talk('squawks');
  }],
  ['the_great_sharkstorm.brace', async (s) => {
    await go(s, 'main_deck');
    await s.inspect(['a', 'b', 'c'].map((k) => `p6_rope_${k}`).find((id) => !s.has(id)));
  }],
  ['the_great_sharkstorm.shark', async (s) => { await go(s, 'main_deck'); await s.inspect('p6_heave'); }],
  ['the_great_sharkstorm.helm', async (s) => { await go(s, 'main_deck'); await s.inspect('p6_helm'); }],
  ['frog_grog_offensive.barrels', async (s) => {
    await go(s, 'main_deck');
    await s.inspect(s.has('p6_barrel_ready') ? 'p6_bulk_launch' : 'p6_bulk_take');
  }],
  ['frog_grog_offensive.horizon', async (s) => { await go(s, 'main_deck'); await s.inspect('p6_horizon'); }],
  ['frog_grog_offensive.sniff', async (s) => { await go(s, 'main_deck'); await s.talk('garrick'); }],
];

export async function playToEndP6(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 160 && !s.has('p6_complete'); n++) {
    const step = STEPS.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) {
      const open = PHASE6_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 6 objective the player can act on`);
    }
    onStep(step[0], s);
    await step[1](s);
  }
  expect(s.has('p6_complete'), 'Story Phase 6 reaches its end').toBe(true);
}

/** From "Phase 5 complete": the captain goes to bed, and wakes up in Phase 6. */
async function playPhase6(pick) {
  const s = makeStory({ pick, preset: 'p5_complete' });
  s.pickLast = pick === 'last';
  await s.enter('main_deck');
  expect(s.has('p6_started'), 'Phase 6 waits for the bed').toBe(false);
  await s.enter('captains_quarters');
  s.choices.push(0); // "Sleep"
  await s.inspect('p6_bed');
  expect(s.has('p6_started')).toBe(true);
  expect(currentChapter(s.content.game, s.session).id).toBe('p6c1');
  const chapters = [];
  await playToEndP6(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
    },
  });
  return { s, chapters };
}

describe('Story Phase 6 can be played start to finish (headless)', () => {
  it('taking the first option at every choice', async () => {
    const { s, chapters } = await playPhase6('first');
    expect(chapters).toEqual(['p6c1', 'p6c2', 'p6c3', 'p6c4', 'p6c5', 'p6c6', 'p6c7', 'p6c8']);
    expect(currentChapter(s.content.game, s.session).id).toBe('phase6_end');
    for (const q of PHASE6_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.log.length).toBeGreaterThan(600);
  });

  it('taking the last option at every choice (the tones converge)', async () => {
    const { s } = await playPhase6('last');
    for (const q of PHASE6_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.log.join('\n')).toMatch(/captain: YOUR WORKPLACE IS YOUR TROUSERS!/);
    expect(s.log.join('\n')).toMatch(/garrick: No\./);
  });

  it('leaves the canonical end state', async () => {
    const { s } = await playPhase6('first');
    for (const f of [
      'rotten_garlic_supper_eaten', 'frog_tax_man_unlocked', 'ses_off_maybe', 'garrick_cape_singed', 'p6_overboard_ordered',
      'second_major_release', 'great_sharkstorm_created', 'p6_ses_shark_hit', 'bulk_frog_grog_depleted', 'great_sharkstorm_active',
      'garrick_food_ban', 'p6_complete',
      // carried over, untouched
      'stenchmaster_entertainment_system_built', 'stenchmaster_suit_created', 'garrick_emergency_labor_rule', 'squawks_fully_bald', 'p5_complete',
    ]) {
      expect(s.has(f), f).toBe(true);
    }
    // The S.E.S. is shark-damaged and still aboard (never thrown overboard), and can't be switched on.
    const ses = tvDef(s.content, 'ses');
    expect(tvCondition(ses, s.session)).toMatchObject({ id: 'shark_damaged', dead: true });
    expect(s.session.story.getValue('ses_state')).toBe('shark_damaged');
    // The Great Sharkstorm is NOT destroyed: it ends far off and active.
    expect(sharkstormNow(s.content, s.session)).toMatchObject({ id: 'active_distant', distance: 'distant' });
    expect(s.session.story.getValue('great_sharkstorm_distance')).toBe('distant');
    // One Dead Center, the second generation, in the sleeping quarters.
    expect(deadCenterLocation(s.session)).toBe('second_sleeping_quarters');
    expect(deadCenterProfile(s.content, s.session)).toBe('second');
    expect(s.session.story.getVar('dead_center_generation')).toBe(2);
    // The bulk reserve is gone; the Frog Grog in the captain's pack is not touched.
    expect(s.session.story.getVar('bulk_frog_grog')).toBe(0);
    // Garrick: same palette, gaudier and singed; Squawks alive, bald, in his basket.
    const garrick = resolveVariant(s.content.npcs.require('garrick'), s.session);
    expect(garrick.appearance).toBe('garrick_stenchmaster_singed');
    const look = s.content.appearances.require('garrick_stenchmaster_singed');
    expect(look.outfit).toMatchObject({ primary: 'burgundy', secondary: 'mustard', pants: 'bilious' });
    expect(look.cloak).toBe('burgundy');
    expect(look.extras).toEqual(expect.arrayContaining(['gaudy', 'singed', 'regalia', 'stenchsash']));
    const squawks = resolveVariant(s.content.npcs.require('squawks'), s.session);
    expect(squawks.appearance).toBe('squawks_fully_bald');
    // The Stench Log, in the Grand Stenchmaster's own words.
    const stench = logEntries(s.content.logs.get('stench_log'), s.session);
    for (const id of ['p6_supper', 'p6_ses', 'p6_release', 'p6_storm', 'p6_ban']) expect(stench.find((e) => e.id === id), id).toBeTruthy();
    expect(stench.find((e) => e.id === 'p6_storm').location).toMatch(/horizon/);
    expect(stench.find((e) => e.id === 'p6_ses').source).toBe('The gray one');
    // Each big moment happens exactly once.
    const all = s.log.join('\n');
    const once = (re) => expect(s.log.filter((l) => re.test(l)).length, String(re)).toBe(1);
    once(/^captain: YOUR WORKPLACE IS YOUR TROUSERS!$/);
    once(/^garrick: Seat warming\.$/);
    once(/^franklin: REMEMBER TO FILE BY APRIL FIFTEENTH!$/);
    once(/^captain: Throw it overboard\.$/);
    once(/^garrick: Tradition starts somewhere\.$/);
    once(/^crew: WE'RE PIRATES!$/);
    once(/^crew: THEY'RE ALL GRAY!$/);
    once(/^garrick: DETAILS!$/);
    // The naming exchange, in order.
    expect(all).toMatch(/garrick: Sharkstorm\.\ncaptain: Do not name it\.\ngarrick: The Great Sharkstorm\.\ncaptain: NO\.\ngarrick: THE GRAND STENCHMASTER'S GREAT SHARKSTORM!\ncrew: NO!/);
    // The rowboat epilogue.
    expect(all).toMatch(/squawks: Smart shark\.[\s\S]*REMEMBER WHO SAVED YE FROM THE GREAT SHARKSTORM![\s\S]*YE CREATED THE GREAT SHARKSTORM![\s\S]*garrick: DETAILS![\s\S]*captain: \.\.\.Unfortunately\./);
    // The labour rule comes up twice, and Garrick weasels out both times.
    expect(all).toMatch(/Routine shark chewing is normal operations/);
    expect(all).toMatch(/meteorological and atmospheric catastrophe management/);
  });

  it('plays The Frog Tax Man from data, and the knob panel is how the set goes off', async () => {
    const { s } = await playPhase6('first');
    expect(s.tvs).toContain('ses:knobs');
    const prog = s.content.tvPrograms.get('frog_tax_man');
    const lines = prog.episodes.flatMap((e) => e.beats.map((b) => b.line).filter(Boolean)).join('\n');
    expect(lines).toMatch(/Franklin, you cannot claim forty-seven hundred flies as business expenses!/);
    expect(lines).toMatch(/I ate them during work hours!/);
    expect(lines).toMatch(/Did you itemize\?/);
    expect(lines).toMatch(/I TOOK THE STANDARD DEDUCTION!/);
    const knobs = tvDef(s.content, 'ses').knobs.list.map((k) => k.label);
    expect(knobs).toEqual(['LOUD', 'MORE LOUD', 'PICTURE MAYBE', 'DO NOT TOUCH', 'FROG', '???', 'OFF MAYBE']);
  });

  it('the evacuation carries on if the captain leaves the sleeping quarters by the galley door', async () => {
    const s = makeStory({ preset: 'p6_quarters_evacuation' });
    await s.enter('crew_quarters');
    for (const id of ['bob', 'wick', 'brask']) await s.talk(id);
    await s.enter('galley');
    await s.enter('main_deck');
    expect(s.has('p6_pressure_shift')).toBe(true);
    expect(s.has('p6_evacuated')).toBe(true);
    await playToEndP6(s);
    for (const q of PHASE6_QUESTS) expect(s.quest(q), q).toBe('completed');
  });

  it('keeps talking after the end without restarting anything', async () => {
    const { s } = await playPhase6('first');
    const before = s.log.length;
    await go(s, 'main_deck');
    for (const id of ['garrick', 'squawks', 'pete', 'hale', 'wick', 'rook', 'sully', 'brask', 'gristle', 'jory', 'bob', 'ned', 'nell', 'finch', 'fennimore', 'penhallow']) {
      await s.talk(id);
    }
    await s.inspect('p6_ses');
    await s.inspect('p6_telescope');
    await s.inspect('p6_food_ban');
    await s.inspect('p6_fork');
    await s.enter('galley');
    for (const id of ['mags', 'jim', 'quill']) await s.talk(id);
    expect(s.has('p6_complete')).toBe(true);
    expect(s.log.slice(before).join('\n')).not.toMatch(/CHAPTER|BWOOO|ABOUT TO BLOW|^garrick: DETAILS!$/m);
  });
});

describe('Story Phase 6 debug presets are real, finishable points in the story', () => {
  const presets = ['p6_start', 'p6_rotten_garlic_supper', 'p6_frog_tax_man', 'p6_ses_shutdown', 'p6_ses_death_rattle', 'p6_almost_fires',
    'p6_garrick_wakes', 'p6_ses_apparently_dead', 'p6_midnight_warning', 'p6_quarters_evacuation', 'p6_main_deck_refuge', 'p6_final_warning',
    'p6_major_release', 'p6_second_apocalypse', 'p6_shark_frenzy', 'p6_sharkstorm_formation', 'p6_sharkstorm_attack', 'p6_ses_shark_strike',
    'p6_breaking_point', 'p6_grog_discovery', 'p6_grog_offensive', 'p6_storm_driven_away', 'p6_complete'];
  it('there are twenty-three of them', () => {
    const s = makeStory({ preset: 'p6_start' });
    for (const id of presets) expect(s.content.debugPresets.get(id), id).toBeTruthy();
    expect(s.content.debugPresets.list().filter((p) => p.id.startsWith('p6_')).length).toBe(23);
  });
  for (const id of presets) {
    it(`${id} plays through to the end of Phase 6`, async () => {
      const s = makeStory({ preset: id });
      // In the game a preset's script runs on arrival (src/debug/presets.js presetEntry).
      await s.enter(s.map, resolvePreset(s.content, id).script);
      await playToEndP6(s);
      for (const q of PHASE6_QUESTS) expect(s.quest(q), `${id}: ${q}`).toBe('completed');
      expect(sharkstormNow(s.content, s.session).id, id).toBe('active_distant');
    });
  }
});

describe('Story Phase 6 staging (who stands where, scene by scene)', () => {
  it('never puts anyone on a solid tile, walks them through one, boxes the captain in or cuts off a doorway', async () => {
    const { s } = await playPhase6('first');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
});

describe('Story Phase 6 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase6', 'data/dialogue/phase6', 'data/npcs/phase6_crew.json', 'data/quests/phase6.json',
    'data/story/flags/phase6.json', 'data/maps/ship/phase6', 'data/story/vistas/phase6.json', 'data/tv/ses.json',
    'data/tv/programs', 'data/hazards/sharkstorm.json', 'data/appearances/phase6.json', 'data/characters/speakers_phase6.json',
  ];
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)) : [p];
    return list.map((x) => fs.readFileSync(x, 'utf8'));
  }).join('\n');

  it('never uses borrowed characters, the forbidden storm name, or later-phase material', () => {
    for (const banned of [/wario/i, /nintendo/i, /\bwa+h+\b/i, /sharknado/i, /\bnado\b/i, /brogath/i, /codex/i, /raiders/i,
      /stenchmaster'?s? court/i, /ancient (grand )?stenchmaster/i, /buried treasure/i, /treasure .*into the (great )?sharkstorm/i,
      /purple/i, /\bwah\b/i]) {
      expect(text).not.toMatch(banned);
    }
  });

  it('keeps the original suit palette', () => {
    const looks = JSON.parse(fs.readFileSync(path.resolve('data/appearances/phase6.json'), 'utf8')).filter((a) => a.id.startsWith('garrick'));
    for (const a of looks) expect(a.outfit).toMatchObject({ primary: 'burgundy', secondary: 'mustard', pants: 'bilious' });
  });

  it('never tells the captain to reach inside the set', () => {
    const p6 = fs.readdirSync(path.resolve('data/story/cutscenes/phase6')).map((n) => fs.readFileSync(path.resolve('data/story/cutscenes/phase6', n), 'utf8')).join('\n');
    expect(p6).not.toMatch(/discharg|capacitor|screwdriver|unplug|ground (the|it)|open (up )?the (back|cabinet|tube)/i);
    expect(p6).toMatch(/Nobody touches the inside of the set|You do not touch the wire/);
  });

  it('stops at the rowboat epilogue (no trigger past the end of Phase 6)', () => {
    const s = makeStory({ preset: 'p5_complete' });
    const later = s.content.storyTriggers.list().filter((t) => JSON.stringify(t.if).includes('p6_complete') && !JSON.stringify(t.if).includes('notFlag'));
    expect(later).toEqual([]);
  });
});
