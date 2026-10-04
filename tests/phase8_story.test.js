import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { currentChapter, resolveVariant } from '../src/systems/story/progress.js';
import { deadCenterLocation } from '../src/systems/hazards/deadCenter.js';
import { sharkstormNow } from '../src/systems/hazards/sharkstorm.js';
import { logEntries } from '../src/systems/logs/logbook.js';
import { resolvePreset } from '../src/debug/presets.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { mapDisplayName } from '../src/maps/mapName.js';
import { makeStory } from './storyHarness.js';

/**
 * Plays Story Phase 8 (the Lost Fart; the Grand Nap) with the real content
 * (see tests/storyHarness.js): from the end of Phase 7 (the crate next to
 * Squawks), through the false alarm, the sash bearers, the Lost Fart
 * nonsense, the condemned quarters, the barracks, the bedtime story, the
 * crown and the sash, to three in the morning; and from every Phase 8 debug
 * preset.
 */

export const PHASE8_QUESTS = ['still_trapped', 'false_alarm', 'sash_bearers', 'lost_fart_expedition', 'no_place_to_sleep', 'grand_decree',
  'bedtime_story', 'grand_nap', 'seventy_percent_off'];

/** The only states Garrick's stomach may be in: it is never a release. */
const RELEASE_STATES = ['calm', 'rumbling', 'false_alarm', 'possibly_building', 'unknown'];

async function go(s, map) {
  if (s.map === map) return;
  if (s.map === 'galley' && map === 'cargo_hold') await s.warp('to_hold');
  else if (s.map === 'cargo_hold' && map === 'galley') await s.warp('p8_to_galley');
  else await s.enter(map);
}

const firstMissing = (s, ids, prefix) => ids.find((id) => !s.has(`${prefix}${id}`));
const order = (s, list) => (s.pickLast ? list.slice().reverse() : list);
const H = 'cargo_hold';

/** First open objective wins; each step does what a player would do about it. */
const STEPS = [
  ['still_trapped.settle', async (s) => { await go(s, H); await s.talk(firstMissing(s, order(s, ['pete', 'bob', 'gristle', 'jim']), 'p8_settled_')); }],
  ['still_trapped.corner', async (s) => { await go(s, H); await s.inspect('p8_corner_sit'); }],
  ['false_alarm.ask', async (s) => { await go(s, H); await s.talk('garrick'); }],
  ['false_alarm.squawks', async (s) => { await go(s, H); if (s.pickLast) await s.inspect('p8_basket_alarm'); else await s.talk('squawks'); }],
  ['false_alarm.hatch', async (s) => { await go(s, H); await s.warp('p8_to_galley'); }],
  ['sash_bearers.proposal', async (s) => { await go(s, H); await s.talk('garrick'); }],
  ['sash_bearers.volunteers', async (s) => {
    await go(s, H);
    const crew = ['gristle', 'pete', 'bob', 'jim', 'ned', 'hale', 'rook', 'wick', 'sully', 'brask', 'jory', 'nell', 'finch', 'mags', 'quill', 'fennimore', 'penhallow'];
    await s.talk(firstMissing(s, s.pickLast ? crew.slice(-5) : crew, 'p8_refused_'));
  }],
  ['sash_bearers.verdict', async (s) => { await go(s, H); await s.talk('garrick'); }],
  ['lost_fart_expedition.trunk', async (s) => { await go(s, H); if (s.pickLast) await s.talk('garrick'); else await s.inspect('p8_trunk'); }],
  ['lost_fart_expedition.crown', async (s) => { await go(s, H); await s.talk('garrick'); }],
  ['lost_fart_expedition.premise', async (s) => { await go(s, H); await s.talk('garrick'); }],
  ['lost_fart_expedition.landmarks', async (s) => {
    await go(s, H);
    const left = order(s, [['grog', 'p8_lm_grog_a'], ['oracle', 'p8_lm_oracle'], ['ravine', 'p8_lm_ravine']]).find(([f]) => !s.has(`p8_lm_${f}`));
    await s.inspect(left[1]);
  }],
  ['lost_fart_expedition.snap', async (s) => { await go(s, H); await s.talk('gristle'); }],
  ['lost_fart_expedition.squawks_back', async (s) => { await go(s, H); await s.talk('gristle'); }],
  ['no_place_to_sleep.quarters', async (s) => { await go(s, 'galley'); }],
  ['no_place_to_sleep.open', async (s) => { await go(s, 'galley'); await s.talk('pete'); }],
  ['no_place_to_sleep.sign', async (s) => { await go(s, 'galley'); if (s.pickLast) await s.warp('p8_to_crew'); else await s.inspect('p8_door_nail'); }],
  ['no_place_to_sleep.back', async (s) => { await go(s, H); }],
  ['grand_decree.squawks', async (s) => { await go(s, H); if (s.pickLast) await s.inspect('p8_basket_cradle'); else await s.talk('squawks'); }],
  ['grand_decree.ropes', async (s) => { await go(s, H); await s.inspect('p8_ropes'); }],
  ['grand_decree.sailcloth', async (s) => { await go(s, H); await s.inspect('p8_sailcloth'); }],
  ['grand_decree.crates', async (s) => { await go(s, H); await s.inspect(s.pickLast ? 'p8_clutter_b' : 'p8_clutter'); }],
  ['grand_decree.bunks', async (s) => { await go(s, H); await s.talk(firstMissing(s, order(s, ['pete', 'bob', 'gristle', 'jim']), 'p8_bunk_')); }],
  ['grand_decree.mine', async (s) => { await go(s, H); await s.inspect('p8_mine'); }],
  ['bedtime_story.bed', async (s) => { await go(s, H); await s.inspect('p8_bed'); }],
  ['grand_nap.crown', async (s) => { await go(s, H); await s.inspect('p8_crate_crown'); }],
  ['grand_nap.back', async (s) => { await go(s, H); await s.inspect('p8_back'); }],
  ['seventy_percent_off.wake', async (s) => { await go(s, H); await s.talk(firstMissing(s, order(s, ['pete', 'gristle', 'bob']), 'p8_woke_')); }],
];

export async function playToEndP8(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 160 && !s.has('p8_complete'); n++) {
    const step = STEPS.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) {
      const open = PHASE8_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 8 objective the player can act on`);
    }
    onStep(step[0], s);
    await step[1](s);
    const release = s.session.story.getValue('garrick_release');
    expect(RELEASE_STATES, `garrick_release after ${step[0]}`).toContain(release);
  }
  expect(s.has('p8_complete'), 'Story Phase 8 reaches its end').toBe(true);
}

/** From "Phase 7 complete": the crate next to Squawks, and sleep, sitting up. */
async function playPhase8(pick) {
  const s = makeStory({ pick, preset: 'p7_complete' });
  s.pickLast = pick === 'last';
  s.flagsBefore = new Set(s.session.story.allFlags());
  await s.enter('cargo_hold');
  expect(s.has('p8_started'), 'Phase 8 waits for the crate').toBe(false);
  s.choices.push(0); // "Get some sleep, sitting up"
  await s.inspect('p8_start');
  expect(s.has('p8_started')).toBe(true);
  expect(currentChapter(s.content.game, s.session).id).toBe('p8c1');
  const chapters = [];
  await playToEndP8(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
    },
  });
  return { s, chapters };
}

describe('Story Phase 8 can be played start to finish (headless)', () => {
  it('taking the first option at every choice', async () => {
    const { s, chapters } = await playPhase8('first');
    expect(chapters).toEqual(['p8c1', 'p8c2', 'p8c3', 'p8c4', 'p8c5', 'p8c6', 'p8c7', 'p8c9', 'p8c10', 'p8c12', 'p8c13']);
    expect(currentChapter(s.content.game, s.session).id).toBe('phase8_end');
    for (const q of PHASE8_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.log.length).toBeGreaterThan(700);
  });

  it('taking the last option at every choice (the tones converge)', async () => {
    const { s } = await playPhase8('last');
    for (const q of PHASE8_QUESTS) expect(s.quest(q), q).toBe('completed');
    const all = s.log.join('\n');
    expect(all).toMatch(/captain: \.\.\.Go to sleep, Garrick\./);
    expect(all).toMatch(/captain: \.\.\.No receipt\. Right\./);
  });

  it('leaves the canonical end state', async () => {
    const { s } = await playPhase8('first');
    for (const f of [
      'crew_quarters_condemned', 'lower_hull_barracks', 'garrick_top_hammock', 'squawks_sleep_spot', 'grand_crown_created',
      'grand_crown_banned_for_sleep', 'fart_sash_nickname', 'sash_origin_revealed', 'lost_fart_game_proposed', 'lost_fart_legend_told',
      'garrick_possible_release_survived', 'crew_ftm_invested', 'p8_complete',
      // carried over, untouched
      'p7_complete', 'great_sharkstorm_returned', 'ses_mark2_operational', 'crew_franklin_fans', 'garrick_cape_torn', 'second_major_release',
    ]) {
      expect(s.has(f), f).toBe(true);
    }
    // The storm eased; it did not go. The Center moved on; the quarters are condemned anyway.
    expect(sharkstormNow(s.content, s.session)).toMatchObject({ id: 'easing_near_ship', distance: 'near' });
    expect(deadCenterLocation(s.session)).toBe('second_forward_deck');
    const galley = s.content.maps.require('galley');
    const door = galley.objects.find((o) => o.id === 'p8_to_crew');
    expect(evaluateCondition(door.if, s.session), 'the quarters door stays locked').toBe(false);
    const quarters = s.content.maps.require('crew_quarters');
    expect(quarters.fumes.find((z) => z.id === 'p8_condemned')).toMatchObject({ level: 'dense' });
    // The hold is the barracks now.
    expect(mapDisplayName(s.content.maps.require('cargo_hold'), s.session)).toBe('Lower Hull Barracks');
    // No new major release: the stomach ends 'unknown', and nothing new got released.
    expect(s.session.story.getValue('garrick_release')).toBe('unknown');
    const flags = s.content.flags.list().map((f) => f.id).filter((f) => s.has(f) && !s.flagsBefore.has(f));
    expect(flags.filter((f) => /release/.test(f))).toEqual(['garrick_possible_release_survived']);
    // Garrick asleep up there, crown in its crate (his everyday look); Bob still in the helmet.
    expect(resolveVariant(s.content.npcs.require('garrick'), s.session).appearance).toBe('garrick_stenchmaster_torn');
    expect(resolveVariant(s.content.npcs.require('bob'), s.session).appearance).toBe('bob_explorer');
    // The Stench Log: the sash's claimed and known origin; the Lost Fart as Garrick's claims, not history.
    const stench = logEntries(s.content.logs.get('stench_log'), s.session);
    for (const id of ['p8_false_alarm', 'p8_sash', 'p8_crown', 'p8_lost_fart', 'p8_quarters', 'p8_barracks', 'p8_grand_nap']) expect(stench.find((e) => e.id === id), id).toBeTruthy();
    const sash = stench.find((e) => e.id === 'p8_sash');
    expect(sash.notes).toMatch(/CLAIMED ORIGIN: ancient ceremonial relic/);
    expect(sash.notes).toMatch(/sketchy discount shop. Purchased last week. Seventy per cent off. Cash only. No refunds/);
    expect(sash.notes).toMatch(/Captain's note: FART SASH\. Grand Stenchmaster's correction: STENCHMASTER SASH\./);
    expect(stench.find((e) => e.id === 'p8_lost_fart').notes).toMatch(/^GARRICK'S CLAIMS/);
    expect(stench.find((e) => e.id === 'p8_crown').status).toBe('Banned while sleeping');
    // Each big moment happens exactly once.
    const all = s.log.join('\n');
    const once = (re) => expect(s.log.filter((l) => re.test(l)).length, String(re)).toBe(1);
    once(/^squawks: \.\.\.Tax frog funny\.$/);
    once(/^garrick: \.\.\.I don't know\.$/);
    once(/^garrick: Oh\.$/);
    once(/^garrick: Ohhhh\.$/);
    once(/^garrick: \.\.\.False alarm\.$/);
    once(/^garrick: Sometimes the fart is sneaky\.$/);
    once(/^squawks: Bad planning\.$/);
    once(/^bob: I'd rather hold a shark\.$/);
    once(/^jim: I'd rather hold two\.$/);
    once(/^ned: I'd rather hold the Great Sharkstorm\.$/);
    once(/^garrick: Tradition starts somewhere, Captain\.$/);
    once(/^garrick: \.\.\.It might get wrinkled\.$/);
    once(/^garrick: The fart took residence\.$/);
    once(/^garrick: \.\.\.Centuries\.$/);
    once(/^squawks: Bad options\.$/);
    once(/^garrick: Imagination\.$/);
    once(/^garrick: WITH DESTINY\.$/);
    once(/^jim: Expired cheese\.$/);
    once(/^squawks: Impossible\.$/);
    once(/^garrick: He didn't read the label\.$/);
    once(/^garrick: Very committed sharks\.$/);
    once(/^garrick: He provides EMOTIONAL SUPPORT\.$/);
    once(/^garrick: It's historical education\.$/);
    once(/^pete: The suit exhaled\.$/);
    once(/^captain: GRAND\. STENCHMASTER\. CUTLERY\.$/);
    once(/^pete: He can argue unconscious\.$/);
    once(/^garrick_asleep: \.\.\.bought it\.\.\. last week\.\.\.$/);
    once(/^garrick_asleep: \.\.\.seventy percent off\.\.\.$/);
    once(/^captain: HE CONFIRMS IT!$/);
    once(/^captain: NO\. ADVENTURE\.$/);
    expect(s.log.filter((l) => /^squawks: Bad bunk\.$/.test(l)).length).toBe(2);
    // The required exchanges, in order.
    expect(all).toMatch(/squawks: Rowboat\?[\s\S]*squawks: Bad planning\./);
    expect(all).toMatch(/pete: That's still you\.\ngarrick: An ancestor\./);
    expect(all).toMatch(/jim: What's forbidden cheese\?\ngarrick: Cheese you're not supposed to eat\.\njim: Expired cheese\.\ngarrick: FORBIDDEN\./);
    expect(all).toMatch(/captain: WHY ARE THERE SHARKS IN A JUNGLE TEMPLE\?\ngarrick: Very committed sharks\./);
    expect(all).toMatch(/pete: The suit exhaled\.\ngarrick: Stench retention\.\ncaptain: Fabric contamination\./);
    expect(all).toMatch(/pete: LAST WEEK\?\nbob: Where\?[\s\S]*garrick_asleep: \.\.\.sketchy discount store\.\.\.\ncaptain: HE CONFIRMS IT!\ngristle: He said CENTURIES\.\ncaptain: He made us play the Lost Fart nonsense over it\.\nbob: Twice\./);
    expect(all).toMatch(/garrick_asleep: \.\.\.Lost\.\.\. Fart\.\.\.\ncaptain: DO NOT EVEN THINK ABOUT IT\.\ngarrick_asleep: \.\.\.adventure\.\.\.\ncaptain: NO\. ADVENTURE\./);
    expect(all).toMatch(/Nobody sleeps for the rest of the night\./);
    // The sleep-talk confessions, in order.
    const conf = ['don\'t\\.\\.\\. wrinkle', 'smells\\.\\.\\. horrible', 'not\\.\\.\\. fart sash', 'good deal', 'discount\\.\\.\\.', 'sketchy\\.\\.\\. store',
      'bought it\\.\\.\\. last week', 'seventy percent off', 'discount bin', 'cash only', 'smelled funny', 'no refunds', 'no\\.\\.\\. receipt'];
    expect(all).toMatch(new RegExp(conf.join('[\\s\\S]*')));
  });

  it('plays the new Frog Tax Man episodes from data (invented frog paperwork only)', async () => {
    const { s } = await playPhase8('first');
    const prog = s.content.tvPrograms.get('frog_tax_man');
    const lines = (id) => prog.episodes.find((e) => e.id === id).beats.map((b) => b.line).filter(Boolean).join('\n');
    expect(lines('the_audit')).toMatch(/OFFICE REFRESHMENTS/);
    expect(lines('the_audit')).toMatch(/networking expenses/);
    expect(lines('the_audit')).toMatch(/With the flies\?/);
    expect(lines('capital_gains')).toMatch(/What was your basis, Franklin\?/);
    expect(lines('capital_gains')).toMatch(/I ate the records/);
    expect(s.log.join('\n')).toMatch(/The whole hold GASPS\./);
  });

  it('keeps talking after the end without restarting anything', async () => {
    const { s } = await playPhase8('first');
    const before = s.log.length;
    await go(s, 'cargo_hold');
    for (const id of ['squawks', 'pete', 'hale', 'wick', 'rook', 'sully', 'brask', 'gristle', 'jory', 'bob', 'ned', 'nell', 'finch',
      'fennimore', 'mags', 'jim', 'quill', 'penhallow']) {
      await s.talk(id);
    }
    for (let i = 0; i < 6; i++) await s.inspect('p8_bunk_after');
    await s.inspect('p8_crate_crown_look');
    await s.inspect('p8_cradle');
    await s.inspect('p8_pump');
    await go(s, 'galley');
    s.choices.push(1);
    await s.inspect('p8_door_look');
    await s.inspect('p8_sign_look');
    expect(await s.warp('p8_to_crew')).toBe(false);
    expect(s.has('p8_complete')).toBe(true);
    expect(s.log.slice(before).join('\n')).not.toMatch(/CHAPTER|GLOOOO|NO\. ADVENTURE/);
  });
});

describe('Story Phase 8 debug presets are real, finishable points in the story', () => {
  const presets = ['p8_start', 'p8_lower_hull_shelter', 'p8_garrick_rumbling', 'p8_false_alarm', 'p8_sash_bearer_request', 'p8_lost_fart_expedition',
    'p8_grand_crown_reveal', 'p8_stinkbeard_fury', 'p8_quarters_condemned', 'p8_lower_hull_barracks', 'p8_barracks_complete', 'p8_bedtime_story',
    'p8_grand_nap_start', 'p8_suit_fume_bunk', 'p8_crown_fall', 'p8_sash_descends', 'p8_discount_store_reveal', 'p8_complete'];
  it('there are eighteen of them', () => {
    const s = makeStory({ preset: 'p8_start' });
    for (const id of presets) expect(s.content.debugPresets.get(id), id).toBeTruthy();
    expect(s.content.debugPresets.list().filter((p) => p.id.startsWith('p8_')).length).toBe(18);
  });
  for (const id of presets) {
    it(`${id} plays through to the end of Phase 8`, async () => {
      const s = makeStory({ preset: id });
      await s.enter(s.map, resolvePreset(s.content, id).script);
      await playToEndP8(s);
      for (const q of PHASE8_QUESTS) expect(s.quest(q), `${id}: ${q}`).toBe('completed');
      expect(sharkstormNow(s.content, s.session).id, id).toBe('easing_near_ship');
      expect(s.stagingIssues.join('\n'), id).toBe('');
    });
  }
});

describe('Story Phase 8 staging (who stands where, scene by scene)', () => {
  it('never puts anyone on a solid tile, walks them through one, boxes the captain in or cuts off a doorway', async () => {
    const { s } = await playPhase8('first');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
  it('the same, choosing the last option everywhere', async () => {
    const { s } = await playPhase8('last');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
});

describe('Story Phase 8 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase8', 'data/dialogue/phase8', 'data/npcs/phase8_crew.json', 'data/quests/phase8.json',
    'data/story/flags/phase8.json', 'data/maps/ship/phase8', 'data/story/vistas/phase8.json', 'data/tv/programs',
    'data/props/phase8.json', 'data/appearances/phase8.json', 'data/audio/music/lost_fart_adventure.json', 'data/audio/music/lower_hull.json',
    'src/art/vista/vistaLegend.js', 'src/art/vista/vistaPhase8.js', 'src/art/inserts/phase8Inserts.js', 'src/art/props/phase8Props.js',
  ];
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)) : [p];
    return list.map((x) => fs.readFileSync(x, 'utf8'));
  }).join('\n');

  it('uses its own adventure: no borrowed films, heroes, hats or plumbers', () => {
    for (const banned of [/wario/i, /nintendo/i, /\bwa+h+\b/i, /raiders/i, /indiana/i, /\bindy\b/i, /fedora/i, /\bwhip\b/i, /\bidol\b/i, /\bboulder\b/i,
      /stenchsylvania/i, /sharknado/i]) {
      expect(text).not.toMatch(banned);
    }
    expect(text).toMatch(/THE GRAND EXPEDITION FOR THE LOST FART/);
    expect(text).toMatch(/PROFESSOR BARNACLE BOB/);
    expect(text).toMatch(/Reekhollow/);
    expect(text).toMatch(/SIR GARRICK THE FIRST/);
  });

  it('leaves the next phase alone (no real Stenchmasters, no court, no treasure island, the storm unresolved)', () => {
    for (const banned of [/brogath/i, /stenchmaster'?s? court/i, /treasure island/i, /buried treasure/i, /ancient (grand )?stenchmasters? (were|was) real/i]) {
      expect(text).not.toMatch(banned);
    }
    const s = makeStory({ preset: 'p8_complete' });
    for (const id of ['golden_bottle_of_wind', 'lost_fart', 'grand_crown', 'sir_garrick']) {
      expect(s.content.items.get(id), id).toBeFalsy();
      expect(s.content.npcs.get(id), id).toBeFalsy();
    }
    const later = s.content.storyTriggers.list().filter((t) => JSON.stringify(t.if).includes('p8_complete') && !JSON.stringify(t.if).includes('notFlag'));
    expect(later).toEqual([]);
    expect(sharkstormNow(s.content, s.session).id).toBe('easing_near_ship');
  });

  it('keeps the original suit palette, and the crown has no letters on it', () => {
    const looks = JSON.parse(fs.readFileSync(path.resolve('data/appearances/phase8.json'), 'utf8'));
    const crowned = looks.find((a) => a.id === 'garrick_stenchmaster_crowned');
    expect(crowned.outfit).toMatchObject({ primary: 'burgundy', secondary: 'mustard', pants: 'bilious' });
    expect(crowned.hat.style).toBe('grandcrown');
    // The crown's close-up draws exactly one caption and nothing else in letters.
    const inserts = fs.readFileSync(path.resolve('src/art/inserts/phase8Inserts.js'), 'utf8');
    const crown = inserts.slice(inserts.indexOf('function grandCrown'), inserts.indexOf('function condemnedSign'));
    expect(crown.match(/drawText\(/g)).toHaveLength(1);
    expect(crown).toMatch(/THE GRAND STENCHMASTER.{1,2}S GRAND CROWN/);
  });
});
