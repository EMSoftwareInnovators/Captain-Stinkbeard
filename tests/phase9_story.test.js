import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { currentChapter, resolveVariant } from '../src/systems/story/progress.js';
import { sharkstormNow } from '../src/systems/hazards/sharkstorm.js';
import { logEntries } from '../src/systems/logs/logbook.js';
import { resolvePreset } from '../src/debug/presets.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { makeStory } from './storyHarness.js';
import { BANNED_LIST } from './bannedNames.js';

/**
 * Plays Story Phase 9 (Garrick's "Completely Authentic" History; the Grand
 * Sharkmaster; Crownskull Isle; the Grand Treasure Catastrophe) with the real
 * content (see tests/storyHarness.js): from the end of Phase 8 (the captain's
 * bunk, under the Grand Nap) through the history lesson, the trial, the
 * bureaucracy, LAND, the council, Pete's plan, the landing, the island, the
 * dig, the launch sequence, the shelter, the blast, the storm inland, the
 * megalodon, the treasure going up, the crown coming down, the shanty, to
 * RECOVER THE CRIMSON FORTUNE (left open); and from every Phase 9 preset.
 */

export const PHASE9_QUESTS = ['morning_after', 'completely_authentic', 'no_receipt', 'sash_bureaucracy', 'land_ho', 'landing_problem',
  'grand_sharkmaster', 'lee_side_landing', 'crownskull_isle', 'crimson_fortune', 'seven_floors', 'excavation_technology', 'run',
  'fire_in_the_hole', 'vertical_relocation'];

const H = 'cargo_hold';
const D = 'main_deck';
const I = 'crownskull_isle';

async function go(s, map) {
  if (s.map !== map) await s.enter(map);
}
const firstMissing = (s, ids, prefix) => ids.find((id) => !s.has(`${prefix}${id}`));
const order = (s, list) => (s.pickLast ? list.slice().reverse() : list);

/** Walks into a named place on the island (the harness has no feet: it says so on the bus). */
async function visit(s, region) {
  await go(s, I);
  s.session.bus.emit('region:entered', { region, map: I });
  await s.settle();
}

/** A question menu with a do-nothing option at the end: the first open topic, or (last-pick runs) the last open one. */
function topic(s, flags) {
  const open = flags.filter((f) => !s.has(f)).length;
  s.choices.push(open && s.pickLast ? open - 1 : 0);
}

/** The right tool for each floor (shovel, pick, crowbar); a last-pick run tries a wrong one first on every floor. */
const RIGHT_TOOL = [0, 1, 1, 1, 0, 1, 2];
function tool(s) {
  const layer = s.session.story.getVar('dig_layer');
  s.wrongTried ??= new Set();
  if (s.pickLast && !s.wrongTried.has(layer)) {
    s.wrongTried.add(layer);
    s.choices.push(RIGHT_TOOL[layer] === 2 ? 0 : 2);
  } else s.choices.push(RIGHT_TOOL[layer]);
}

const HISTORY = ['p9_heard_sacred_stench', 'princess_stenchalina_heard', 'five_grand_treasures_heard', 'former_stenchmasters_heard'];
const OPTIONS = ['beach', 'row', 'swim', 'circle', 'wait', 'lure'].map((o) => `p9_opt_${o}`);

/** First open objective wins; each step does what a player would do about it. */
const STEPS = [
  ['morning_after.crew', async (s) => { await go(s, H); await s.talk(firstMissing(s, order(s, ['pete', 'bob', 'gristle', 'jim']), 'p9_morning_')); }],
  ['morning_after.wake', async (s) => { await go(s, H); await s.inspect('p9_wake'); }],
  ['morning_after.talk', async (s) => { await go(s, H); await s.talk('garrick'); }],
  ...['sacred', 'first', 'treasures', 'masters', 'trap'].map((o) => [`completely_authentic.${o}`, async (s) => { await go(s, H); topic(s, HISTORY); await s.talk('garrick'); }]),
  ['no_receipt.witnesses', async (s) => { await go(s, H); await s.talk(firstMissing(s, order(s, ['pete', 'gristle', 'bob', 'squawks']), 'p9_witness_')); }],
  ['no_receipt.verdict', async (s) => { await go(s, H); await s.talk('garrick'); }],
  ['no_receipt.hat', async (s) => { await go(s, H); await s.inspect('p9_trunk'); }],
  ['sash_bureaucracy.assistant', async (s) => { await go(s, H); await s.talk('bob'); }],
  ['sash_bureaucracy.chart', async (s) => { await go(s, H); await s.inspect('p9_chart'); }],
  ['sash_bureaucracy.herald', async (s) => { await go(s, H); await s.talk('squawks'); }],
  ['sash_bureaucracy.plain', async (s) => { await go(s, H); await s.talk('garrick'); }],
  ['land_ho.look', async (s) => { await go(s, H); await s.inspect('p9_gap_look'); }],
  ['land_ho.map', async (s) => { await go(s, H); await s.inspect('p9_gap_map'); }],
  ['landing_problem.council', async (s) => { await go(s, H); await s.inspect('p9_council'); }],
  ['landing_problem.options', async (s) => { await go(s, H); topic(s, OPTIONS); await s.inspect('p9_options'); }],
  ['grand_sharkmaster.sash', async (s) => { await go(s, H); await s.talk('pete'); }],
  ['grand_sharkmaster.plan', async (s) => { await go(s, H); await s.talk('pete'); }],
  ['grand_sharkmaster.tv', async (s) => { await go(s, H); await s.inspect('p9_tv'); }],
  ['grand_sharkmaster.petes_plan', async (s) => { await go(s, H); await s.talk('pete'); }],
  ['lee_side_landing.helm', async (s) => {
    await go(s, D);
    // A last-pick run steers for the storm first (Nell says no), then does it properly.
    s.choices.push(s.pickLast && !s.steeredWrong ? 2 : 0);
    s.steeredWrong = true;
    await s.inspect('p9_helm');
  }],
  ['lee_side_landing.lines', async (s) => { await go(s, D); await s.inspect('p9_lines'); }],
  ['lee_side_landing.decoy', async (s) => { await go(s, D); await s.inspect('p9_decoy'); }],
  ['lee_side_landing.window', async (s) => {
    await go(s, D);
    // Watch the fins: say "Now!" too soon (first-pick) or wait it out (last-pick); either way, "Now!" on a thin sea.
    s.choices.push(...(s.pickLast ? [1, 1, 0] : [0, 0, 0]));
    await s.talk('pete');
  }],
  ['lee_side_landing.lure', async (s) => { await go(s, D); await s.inspect('p9_lure'); }],
  ['lee_side_landing.boats', async (s) => {
    if (s.map === 'reef_passage') await s.trigger('p9_shore_10');
    else { await go(s, D); await s.inspect('p9_boats'); }
  }],
  ['crownskull_isle.trail', async (s) => {
    // The first-pick run looks round the whole island before following the map.
    if (!s.pickLast) for (const r of ['isle_reef_point', 'isle_west_beach', 'isle_ruins', 'isle_view', 'glade_ne', 'glade_w', 'glade_e']) await visit(s, r);
    await visit(s, 'isle_trail');
  }],
  ['crownskull_isle.ford', async (s) => { await visit(s, 'isle_ford'); }],
  ['crownskull_isle.tooth', async (s) => { await visit(s, 'isle_fork'); }],
  ['crownskull_isle.statue', async (s) => { await visit(s, 'isle_statue'); }],
  ['crownskull_isle.x', async (s) => { await visit(s, 'isle_clearing'); }],
  ['crimson_fortune.vines', async (s) => { await go(s, I); await s.inspect('p9_vines'); }],
  ['crimson_fortune.dreams', async (s) => { await go(s, I); await s.talk(firstMissing(s, order(s, ['pete', 'bob', 'jim', 'gristle', 'ned']), 'p9_dream_')); }],
  ['seven_floors.tools', async (s) => { await go(s, I); await s.inspect('p9_tools_get'); }],
  ['seven_floors.first', async (s) => { await go(s, I); tool(s); await s.inspect('p9_dig'); }],
  ['seven_floors.garrick', async (s) => { await go(s, I); await s.talk('garrick'); }],
  ['seven_floors.deeper', async (s) => { await go(s, I); tool(s); await s.inspect('p9_dig'); }],
  ['excavation_technology.proposal', async (s) => { await go(s, I); await s.talk('garrick'); }],
  ['excavation_technology.listen', async (s) => { await go(s, I); await s.talk('garrick'); }],
  ['run.west', async (s) => { await visit(s, 'isle_west_beach'); }],
  ['run.ruins', async (s) => { await visit(s, 'isle_ruins'); }],
  ...['stone', 'brace', 'beam', 'cloth', 'squawks', 'watch'].map((o) => [`run.${o}`, async (s) => { await go(s, I); await s.inspect(`p9_job_${o}`); }]),
  ['fire_in_the_hole.survive', async (s) => { await go(s, I); await s.talk('squawks'); }],
  ['vertical_relocation.crater', async (s) => { await go(s, I); await s.inspect('p9_crater'); }],
  ['vertical_relocation.megalodon', async (s) => { await go(s, I); await s.inspect('p9_megalodon'); }],
];

export async function playToEndP9(s, { onStep = () => {} } = {}) {
  for (let n = 0; n < 220 && !s.has('p9_complete'); n++) {
    // Chapter 70 has no objective of its own until the end: the captain goes and has a word with Garrick.
    if (s.has('rage_shanty_seen') && !s.has('p9_confronted')) {
      onStep('ch70.confront', s);
      await go(s, I);
      await s.talk('garrick');
      continue;
    }
    const step = STEPS.find(([ref]) => {
      const [q, o] = ref.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) {
      const open = PHASE9_QUESTS.map((q) => `${q}:${s.quest(q)}`).join(' ');
      throw new Error(`stuck on ${s.map} (${open}): no open Phase 9 objective the player can act on`);
    }
    onStep(step[0], s);
    await step[1](s);
  }
  expect(s.has('p9_complete'), 'Story Phase 9 reaches its end').toBe(true);
}

/** From "Phase 8 complete": the captain's bunk, and sleep till morning. */
async function playPhase9(pick) {
  const s = makeStory({ pick, preset: 'p8_complete' });
  s.pickLast = pick === 'last';
  s.flagsBefore = new Set(s.session.story.allFlags());
  await s.enter('cargo_hold');
  expect(s.has('p9_ready_hint'), 'told where Phase 9 starts').toBe(true);
  expect(s.has('p9_started'), 'Phase 9 waits for the bunk').toBe(false);
  s.choices.push(0); // "Lie down and try to sleep till morning"
  await s.inspect('p9_start');
  expect(s.has('p9_started')).toBe(true);
  expect(currentChapter(s.content.game, s.session).id).toBe('p9c1');
  const chapters = [];
  await playToEndP9(s, {
    onStep: (ref, st) => {
      const ch = currentChapter(st.content.game, st.session).id;
      if (chapters[chapters.length - 1] !== ch) chapters.push(ch);
    },
  });
  return { s, chapters };
}

describe('Story Phase 9 can be played start to finish (headless)', () => {
  it('taking the first option at every choice (and looking round the whole island)', async () => {
    const { s, chapters } = await playPhase9('first');
    expect(chapters).toEqual(['p9c1', 'p9c2', 'p9c3', 'p9c4', 'p9c5', 'p9c6', 'p9c7', 'p9c8', 'p9c9', 'p9c10', 'p9c11', 'p9c12', 'p9c13', 'p9c14', 'p9c15', 'p9c16']);
    expect(currentChapter(s.content.game, s.session).id).toBe('phase9_end');
    for (const q of PHASE9_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.quest('isle_curiosities')).toBe('completed');
    expect(s.log.length).toBeGreaterThan(900);
  });

  it('taking the last option at every choice (wrong tools, a wrong heading, waiting at the rail: it converges)', async () => {
    const { s } = await playPhase9('last');
    for (const q of PHASE9_QUESTS) expect(s.quest(q), q).toBe('completed');
    const all = s.log.join('\n');
    expect(all).toMatch(/nell: That's the windward side, Captain\. That's where the storm's sitting\./);
    expect(all).toMatch(/The crowbar sinks in and stays there\./);
  });

  it('leaves the canonical end state', async () => {
    const { s } = await playPhase9('first');
    const v = (n) => s.session.story.getValue(n);
    for (const f of [
      'p9_started', 'p9_complete', 'princess_stenchalina_heard', 'five_grand_treasures_heard', 'former_stenchmasters_heard', 'sash_origin_confrontation',
      'sash_bureaucracy_titles', 'bob_refused_assistant', 'plain_language_admission', 'crownskull_discovered', 'crownskull_map_unlocked',
      'pete_mock_title_grand_sharkmaster', 'blue_sash_exists', 'blue_sash_refused', 'landing_plan_made', 'crownskull_landed', 'crimson_fortune_found',
      'excavation_started', 'release_triggered', 'great_sharkstorm_inland', 'megalodon_introduced', 'fortune_scattered', 'crater_treasure_contaminated',
      'megalodon_crowned', 'great_sharkstorm_treasure_laden', 'rage_shanty_seen', 'recover_fortune_unlocked', 'squawks_share_promised',
      // carried over, untouched
      'p8_complete', 'sash_origin_revealed', 'grand_crown_created', 'lower_hull_barracks', 'crew_quarters_condemned', 'fart_sash_nickname',
    ]) {
      expect(s.has(f), f).toBe(true);
    }
    expect(v('megalodon_state')).toBe('stranded_crownskull');
    expect(v('crimson_crown_holder')).toBe('megalodon');
    expect(v('crimson_fortune_state')).toBe('scattered_into_sharkstorm');
    expect(v('crater_state')).toBe('blasted');
    expect(s.session.story.getVar('crimson_fortune_recovered_percent')).toBe(2);
    expect(s.session.inventory.count('reeking_doubloons')).toBe(1);
    expect(s.session.inventory.count('crimson_chart')).toBe(1);
    // The storm: treasure-laden, glittering, jewelled sharks; not resolved.
    const storm = sharkstormNow(s.content, s.session);
    expect(storm.id).toBe('treasure_laden');
    expect(storm.glints).toBeTruthy();
    expect(storm.flying.variants.filter((f) => /pearls|chain|tiara|rings/.test(f)).length).toBeGreaterThanOrEqual(4);
    // RECOVER THE CRIMSON FORTUNE is open, and stays open.
    expect(s.quest('recover_crimson_fortune')).toBe('active');
    for (const o of ['crown', 'sharks', 'storm', 'deal']) expect(s.session.quests.isObjectiveDone('recover_crimson_fortune', o), o).toBe(false);
    // Pete: a joke title, not a class.
    const pete = s.content.npcs.require('pete');
    const petePlain = s.content.npcs.require('pete');
    expect(resolveVariant(pete, s.session).class ?? null).toBe(petePlain.class ?? null);
    expect(JSON.stringify(s.content.characters.list())).not.toMatch(/sharkmaster/i);
    // Garrick: dusty, crown on. Bob: rid of the helmet.
    expect(resolveVariant(s.content.npcs.require('garrick'), s.session).appearance).toBe('garrick_stenchmaster_dusty');
    expect(resolveVariant(s.content.npcs.require('bob'), s.session).appearance).toBe('bob');
    // Garrick's claims are his: kept apart from verified history (of which there is none).
    const hist = logEntries(s.content.logs.get('garrick_history'), s.session);
    expect(hist[0]).toMatchObject({ id: 'verified', claim: expect.stringMatching(/Nothing in it has been verified/) });
    expect(hist.find((e) => e.id === 'stenchalina')).toMatchObject({ source: 'Garrick', evidence: 'None', reliability: 'Extremely questionable', note: 'He made this up this morning.' });
    expect(hist.find((e) => e.id === 'sash').reliability).toBe('Disproved');
    // The journal: the fortune scattered, the crown on the megalodon; the Grand Sharkmaster (unwanted).
    const journal = logEntries(s.content.logs.get('captains_journal'), s.session);
    const fortune = journal.find((e) => e.id === 'fortune');
    expect(fortune.status).toBe('SCATTERED INTO THE GREAT SHARKSTORM');
    expect(fortune.notes).toMatch(/Current holder: THE CROWNED MEGALODON/);
    expect(journal.find((e) => e.id === 'sharkmaster').notes).toMatch(/Appointed: Peg-Leg Pete\. Accepted: No\. Authority: None\. Duties: apparently every shark problem Garrick doesn't want\. Pete's note: 'I QUIT\.' Garrick's note: 'Request denied\.'/);
    // The island is a place now: the boats go back to the Revenge, and back again.
    const isle = s.content.maps.require(I);
    expect(evaluateCondition(isle.props.find((p) => p.id === 'p9_megalodon_crowned').if, s.session)).toBe(true);
    expect(evaluateCondition(isle.props.find((p) => p.id === 'p9_crater').if, s.session)).toBe(true);
    const hub = s.content.scripts.get('p9.isle.boat');
    expect(JSON.stringify(hub)).toMatch(/"transition":"main_deck"/);
    expect(JSON.stringify(s.content.scripts.get('p9.deck.boat'))).toMatch(/"transition":"crownskull_isle"/);
    // Each big moment happens exactly once.
    const once = (re) => expect(s.log.filter((l) => re.test(l)).length, String(re)).toBe(1);
    once(/^garrick: \.\.\.HAS CONCLUDED\.$/);
    once(/^pete: HE WAS THE ONLY PERSON WHO ACTUALLY SLEPT!$/);
    once(/^captain: We need to talk\.$/);
    once(/^squawks: Fun\.$/);
    once(/^garrick: Her ceremonial ribbon\.\.\. FLUTTERED\.$/);
    once(/^garrick: \.\.\.It sank from embarrassment\.$/);
    once(/^captain: \.\.\.Especially the part about the seventy-per-cent-off discount bin\.$/);
    once(/^squawks: NO\. RECEIPT\.$/);
    once(/^captain: NO! RECEIPT!$/);
    once(/^garrick: It's so somebody can hold it while I fart\.$/);
    once(/^captain: Squawks\. Listen to me\. I am protecting ye from employment\.$/);
    once(/^ned: LAAAAAAAAAAAAND!$/);
    once(/^garrick: Strong scent\.$/);
    once(/^captain: NO MORE FART-BASED NAVIGATION\.$/);
    once(/^pete: I HAVE BEEN GRAND SHARKMASTER FOR FORTY SECONDS!$/);
    once(/^auditor: Mister Franklin\. A sharkstorm is not a valid excuse for poor record-keeping\.$/);
    once(/^captain: \.\.\.That's solid\.$/);
    once(/^garrick: I thought it was FORTY HOURS\.$/);
    once(/^garrick: \.\.\.Launch command acknowledged\.$/);
    once(/^captain: THERE IS NO TEAM!$/);
    once(/^garrick: FIRE IN THE HOLE!$/);
    once(/^squawks: \.\.\.Big shark king\.$/);
    once(/^captain: NOT THAT ONE!$/);
    once(/^captain: Do not interrupt\. I am having a rage hallucination\.$/);
    once(/^captain: IT\. WINKED\.$/);
    once(/^garrick: \.\.\.Grand Sharkmaster operation\?$/);
    const all = s.log.join('\n');
    // The required exchanges, in order.
    expect(all).toMatch(/Tapestries, say\?\ngarrick: Lost\.\ncaptain: Statues\?\ngarrick: Destroyed\.\ncaptain: Written records\?\ngarrick: Missing\.\ncaptain: Archaeological evidence\?\ngarrick: Very private\.\ncaptain: \.\.\.Convenient\./);
    expect(all).toMatch(/captain: Ancient ruins!|garrick: Ancient ruins!\ncaptain: Discount store!\ngarrick: Ten thousand years!\ncaptain: Seven days!\ngarrick: Stench spirits!\ncaptain: Bargain-bin employees!/);
    expect(all).toMatch(/garrick: How long have I been digging\?\npete: \.\.\.Two minutes\? Three\?\ngarrick: I thought it was FORTY HOURS\./);
    expect(all).toMatch(/pete: IT CREATED A JEWELLED SHARK ECONOMY!\ngarrick: Unexpected downstream effects\./);
    expect(all).toMatch(/squawks: Richer than pirates\?[\s\S]*captain: \.\.\.Currently\./);
    // The shanty is the captain's imagination: captioned so, and the sharks are said not to sing.
    expect(s.content.vistas.get('shark_shanty').caption).toMatch(/imagination/);
    expect(all).toMatch(/The sharks are not singing\. Sharks don't sing\./);
  });

  it('keeps talking after the end without restarting anything', async () => {
    const { s } = await playPhase9('first');
    const before = s.log.length;
    for (const id of ['pete', 'bob', 'gristle', 'jim', 'ned', 'garrick', 'pete', 'garrick', 'garrick']) await s.talk(id);
    for (const id of ['p9_crater_look', 'p9_megalodon_look', 'p9_view', 'p9_shelter_look']) await s.inspect(id);
    s.choices.push(1); // "Stay on the island"
    await s.inspect('p9_boats');
    expect(s.has('p9_complete')).toBe(true);
    expect(s.log.slice(before).join('\n')).not.toMatch(/CHAPTER|FIRE IN THE HOLE|Launch command/);
  });
});

describe('Story Phase 9 staging (who stands where, scene by scene)', () => {
  it('never puts anyone on a solid tile, walks them through one, boxes the captain in or cuts off a doorway', async () => {
    const { s } = await playPhase9('first');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
  it('the same, choosing the last option everywhere', async () => {
    const { s } = await playPhase9('last');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
});

describe('Story Phase 9 debug presets are real, finishable points in the story', () => {
  const presets = ['p9_start', 'p9_morning_after', 'p9_history_lesson', 'p9_princess_stenchalina', 'p9_five_treasures', 'p9_discount_confrontation',
    'p9_lost_fart_three', 'p9_sash_bureaucracy', 'p9_plain_language', 'p9_land_sighted', 'p9_crownskull_reveal', 'p9_landing_strategy',
    'p9_grand_sharkmaster', 'p9_ftm_coincidence', 'p9_petes_plan', 'p9_lee_side', 'p9_decoy_boat', 'p9_crownskull_landing', 'p9_jungle_exploration',
    'p9_fortune_site', 'p9_digging_start', 'p9_garrick_quits', 'p9_excavation_proposal', 'p9_launch_sequence', 'p9_evacuation_run',
    'p9_western_beach_trap', 'p9_ruins_shelter', 'p9_final_warning', 'p9_excavation_blast', 'p9_sharkstorm_inland', 'p9_great_white_rain',
    'p9_megalodon_arrival', 'p9_treasure_exposed', 'p9_treasure_blown_away', 'p9_crowned_megalodon', 'p9_treasure_laden', 'p9_rage_shanty',
    'p9_recovery_unlocked', 'p9_complete'];
  it('there are thirty-nine of them', () => {
    const s = makeStory({ preset: 'p9_start' });
    for (const id of presets) expect(s.content.debugPresets.get(id), id).toBeTruthy();
    expect(s.content.debugPresets.list().filter((p) => p.id.startsWith('p9_')).length).toBe(39);
  });
  for (const id of presets) {
    it(`${id} plays through to the end of Phase 9`, async () => {
      const s = makeStory({ preset: id });
      await s.enter(s.map, resolvePreset(s.content, id).script);
      await playToEndP9(s);
      for (const q of PHASE9_QUESTS) expect(s.quest(q), `${id}: ${q}`).toBe('completed');
      expect(sharkstormNow(s.content, s.session).id, id).toBe('treasure_laden');
      expect(s.session.story.getValue('crimson_crown_holder'), id).toBe('megalodon');
      expect(s.stagingIssues.join('\n'), id).toBe('');
    });
  }
});

describe('Story Phase 9 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase9', 'data/dialogue/phase9', 'data/npcs/phase9_crew.json', 'data/quests/phase9.json', 'data/items/phase9.json',
    'data/story/flags/phase9.json', 'data/maps/ship/phase9', 'data/maps/island', 'data/story/vistas/phase9.json', 'data/logs/phase9.json',
    'data/props/phase9.json', 'data/appearances/phase9.json', 'data/audio/music/crownskull_isle.json', 'data/audio/music/rage_shanty.json',
    'src/art/vista/vistaPhase9.js', 'src/art/inserts/phase9Inserts.js', 'src/art/props/phase9Props.js', 'src/art/stage/stagePhase9.js',
  ];
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    // Only the folder's own files (data/maps/island/phase10 is a later phase's).
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)).filter((x) => fs.statSync(x).isFile()) : [p];
    return list.map((x) => fs.readFileSync(x, 'utf8'));
  }).join('\n');

  it('uses its own names: Garrick Grumblegut, the Great Sharkstorm, Crownskull Isle (and no plumbers)', () => {
    for (const banned of [...BANNED_LIST, /nintendo/i, /\bwa+h+\b/i, /skull island/i, /guzzlegut/i, /raiders/i, /indiana/i, /fedora/i]) {
      expect(text).not.toMatch(banned);
    }
    expect(text).toMatch(/Crownskull Isle/);
    expect(text).toMatch(/GREAT SHARKSTORM|Great Sharkstorm/);
    expect(text).toMatch(/THE GRAND EXPEDITION FOR THE LOST FART/);
    // Nothing anywhere in the game data still says Guzzlegut.
    const all = fs.readdirSync(path.resolve('data'), { recursive: true }).filter((f) => f.endsWith('.json')).map((f) => fs.readFileSync(path.resolve('data', f), 'utf8')).join('\n');
    expect(all).not.toMatch(/guzzlegut/i);
  });

  it('leaves the next phase alone (no real Stenchmasters, no Brogath, no court, no Greyhook Cove, the fortune and the storm unresolved)', () => {
    for (const banned of [/brogath/i, /stenchmaster'?s? court/i, /greyhook/i, /crooked lantern/i, /sash law/i, /ancient (grand )?stenchmasters? (were|was) real/i]) {
      expect(text).not.toMatch(banned);
    }
    const s = makeStory({ preset: 'p9_complete' });
    expect(s.content.quests.require('recover_crimson_fortune').open).toBe(true);
    const later = s.content.storyTriggers.list().filter((t) => JSON.stringify(t.if).includes('p9_complete') && !JSON.stringify(t.if).includes('notFlag'));
    expect(later).toEqual([]);
    // Nothing sets the recovery objectives (a later phase will).
    const scripts = JSON.stringify([...s.content.scripts.map.values()]);
    for (const f of ['crimson_crown_recovered', 'shark_treasure_recovered', 'storm_treasure_recovered', 'great_sharkstorm_dealt_with']) {
      expect(scripts).not.toMatch(new RegExp(`"setFlag":"${f}"`));
    }
  });
});

describe('A save from the end of Phase 8 is told where Phase 9 starts', () => {
  it('coming into the barracks says so once, and nothing starts until the captain lies down', async () => {
    const s = makeStory({ preset: 'p8_complete' });
    await s.enter('cargo_hold');
    expect(s.has('p9_ready_hint')).toBe(true);
    expect(s.has('p9_started')).toBe(false);
    const hint = s.content.scripts.get('p9.ready_hint').find((st) => st.tutorial);
    expect(hint.tutorial).toMatch(/bunk/);
    s.choices.push(1); // "Not yet"
    await s.inspect('p9_start');
    expect(s.has('p9_started')).toBe(false);
    s.choices.push(0);
    await s.inspect('p9_start');
    expect(s.has('p9_started')).toBe(true);
  });
});
