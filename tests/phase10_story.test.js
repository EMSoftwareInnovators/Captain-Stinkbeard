import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { currentChapter, resolveVariant } from '../src/systems/story/progress.js';
import { sharkstormNow } from '../src/systems/hazards/sharkstorm.js';
import { tvDef, tvCondition } from '../src/systems/tv/tv.js';
import { programEpisode, programDef } from '../src/systems/tv/tv.js';
import { logEntries } from '../src/systems/logs/logbook.js';
import { resolvePreset } from '../src/debug/presets.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { makeStory } from './storyHarness.js';
import { PHASE10_QUESTS, playPhase10, playToEndP10 } from './phase10Play.js';

/**
 * Story Phase 10, played headless from the end of Phase 9: the crater and the
 * saddest salvage, the walk back under the wealthy sharks, the Bling Bling
 * King and its participation prize, beans, the sharks' catering, the night in
 * the galley (Brogath, alleged), Rumpold (alleged), the plan, the Grand Feast,
 * the approach, the cowardice crisis, the wrong-way blast, and the Revenge
 * inside the Great Sharkstorm, still trapped. From every Phase 10 preset too.
 */

describe('Story Phase 10 can be played start to finish (headless)', () => {
  it('taking the first option at every choice', async () => {
    const { s, chapters } = await playPhase10('first');
    expect(chapters).toEqual(Array.from({ length: 25 }, (_, i) => `p10c${i + 1}`));
    expect(currentChapter(s.content.game, s.session).id).toBe('phase10_end');
    for (const q of PHASE10_QUESTS) expect(s.quest(q), q).toBe('completed');
  });

  it('taking the last option at every choice (it converges)', async () => {
    const { s } = await playPhase10('last');
    for (const q of PHASE10_QUESTS) expect(s.quest(q), q).toBe('completed');
  });
});

describe('Story Phase 10 staging', () => {
  it('nobody stands in a wall, on a bed that is not there, or boxes the captain in (first options)', async () => {
    const { s } = await playPhase10('first');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
  it('the same, choosing the last option everywhere', async () => {
    const { s } = await playPhase10('last');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
});

describe('Story Phase 10 debug presets are real, finishable points in the story', () => {
  const presets = ['p10_start', 'p10_blame', 'p10_crater_salvage', 'p10_return_trail', 'p10_back_aboard', 'p10_bbk_reveal', 'p10_participation_coin',
    'p10_beans_pantry', 'p10_crying_beans_dinner', 'p10_luxury_seafood', 'p10_shark_leftovers', 'p10_quarters_test', 'p10_luxury_bedding',
    'p10_galley_barracks', 'p10_brogath', 'p10_bedtime_mockery', 'p10_rumpold', 'p10_research', 'p10_fifty_three', 'p10_briefing',
    'p10_pete_reversal', 'p10_sash_holders', 'p10_feast_start', 'p10_bean_smoothie', 'p10_one_bite', 'p10_garrick_charged', 'p10_approach',
    'p10_cowardice', 'p10_cowardice_award', 'p10_final_alignment', 'p10_wrong_way', 'p10_ocean', 'p10_propulsion', 'p10_entry', 'p10_inside',
    'p10_galley_bunker', 'p10_signal_failure', 'p10_sauce_antenna', 'p10_ftm_audit', 'p10_bbk_tv', 'p10_doctrine', 'p10_tax', 'p10_commercial',
    'p10_breakdown', 'p10_complete'];
  it('there are forty-five of them', () => {
    const s = makeStory({ preset: 'p10_start' });
    for (const id of presets) expect(s.content.debugPresets.get(id), id).toBeTruthy();
    expect(s.content.debugPresets.list().filter((p) => p.id.startsWith('p10_')).length).toBe(45);
  });
  for (const id of presets) {
    it(`${id} plays through to the end of Phase 10`, async () => {
      const s = makeStory({ preset: id });
      await s.enter(s.map, resolvePreset(s.content, id).script);
      // The first preset waits for Pete, like the end of Phase 9 does.
      if (!s.has('p10_started')) await s.talk('pete');
      await playToEndP10(s);
      for (const q of PHASE10_QUESTS) expect(s.quest(q), `${id}: ${q}`).toBe('completed');
      expect(s.session.story.getValue('queen_annes_revenge_location'), id).toBe('inside_great_sharkstorm');
      expect(s.stagingIssues.join('\n'), id).toBe('');
    });
  }
});

describe('Story Phase 10 ends where the brief says: inside the Great Sharkstorm, still trapped', () => {
  it('leaves the canonical end state', async () => {
    const { s } = await playPhase10('first');
    const v = (n) => s.session.story.getValue(n);
    for (const f of [
      'p10_started', 'pete_blame_cleared', 'blackbeard_identity_crisis', 'crater_salvage_complete', 'contaminated_salvage_obtained', 'crew_returned_to_ship',
      'bling_bling_king_revealed', 'megalodon_bling_chain', 'participation_coin_obtained', 'bbk_mockery_unlocked', 'bean_pantry_revealed', 'frog_grog_drinks',
      'crying_beans_introduced', 'spicy_sauce_introduced', 'jim_grand_galley_title_refused', 'luxury_seafood_seen', 'shark_leftovers_seen',
      'quarters_reconfirmed_condemned', 'luxury_bedding_seen', 'single_pillow_recovered', 'galley_night_barracks', 'brogath_legend_heard', 'brogath_unverified',
      'bedtime_ribbon_received', 'rumpold_legend_heard', 'tornado_counter_concept', 'stinkbeard_read_book', 'fifty_three_clause_written', 'counter_plan_approved',
      'pete_bureaucracy_reversal', 'rusty_tom_sash_holder', 'barnacle_bill_sash_holder', 'charging_feast_prepared', 'bean_smoothie_made', 'garrick_charged',
      'close_approach_started', 'cowardice_award_received', 'sash_insult_motivation', 'final_alignment_reached', 'fired_wrong_direction',
      'great_sharkstorm_sea_contamination', 'qar_propelled_into_storm', 'great_sharkstorm_entry_complete', 'great_sharkstorm_ship_captured', 'qar_inside_storm',
      'garrick_pressure_reset', 'ses_signal_failure', 'sauce_antenna_installed', 'anomalous_ftm_watched', 'ftm_impossible_broadcast', 'bbk_tv_seen',
      'transfer_doctrine_heard', 'ftm_tax_seen', 'bbk_commercial_seen', 'blackbeard_breakdown_seen', 'p10_complete',
      // carried over, untouched
      'p9_complete', 'fortune_scattered', 'megalodon_crowned', 'great_sharkstorm_treasure_laden', 'crew_quarters_condemned',
    ]) {
      expect(s.has(f), f).toBe(true);
    }
    expect(v('queen_annes_revenge_location')).toBe('inside_great_sharkstorm');
    expect(v('great_sharkstorm')).toBe('inside_ship');
    expect(v('megalodon_alias')).toBe('Bling Bling King');
    expect(v('crimson_crown_holder')).toBe('megalodon');
    expect(v('crimson_fortune_state')).toBe('scattered_into_sharkstorm');
    expect(v('sash_holder_left')).toBe('rusty_tom');
    expect(v('sash_holder_right')).toBe('barnacle_bill');
    expect(v('ses_mark2_antenna')).toBe('spicy_stench_sauce_can');
    expect(v('local_sea_state')).toBe('contaminated');
    expect(v('brogath_status')).toBe('alleged');
    expect(v('rumpold_status')).toBe('alleged');
    expect(v('crimson_salvage_contamination')).toBe('grand_stenchmaster_direct_blast');
    expect(v('garrick_charge')).toBe('calm');
    // The storm: active, not destroyed, and the ship is in it.
    expect(sharkstormNow(s.content, s.session).id).toBe('inside_ship');
    // The last quest is left open, and nothing finishes it.
    expect(s.quest('inside_great_sharkstorm')).toBe('active');
    for (const o of ['out', 'king']) expect(s.session.quests.isObjectiveDone('inside_great_sharkstorm', o), o).toBe(false);
    // Garrick's numbers are his claims: no story value or counter holds them.
    const state = JSON.stringify({ vars: s.session.story.serialize().vars, values: s.session.story.serialize().values });
    expect(state).not.toMatch(/\b(50|52|53|500)\b|fifty|hundred/i);
    // What the captain carries: the salvage, the coin, the ribbon, the book, the plan.
    for (const it of ['crater_salvage', 'participation_coin', 'grand_award_ribbon', 'lost_fart_book', 'counter_plan_notes']) expect(s.session.inventory.count(it), it).toBe(1);
    // Pete: still a deckhand, whatever Garrick calls him. Garrick: not charged any more; still the Grand Stenchmaster.
    const pete = s.content.npcs.require('pete');
    expect(resolveVariant(pete, s.session).class ?? null).toBe(pete.class ?? null);
    expect(resolveVariant(s.content.npcs.require('garrick'), s.session).appearance).not.toMatch(/charged|sash_held/);
    // The galley's old door: boarded up again, the old quarters never a place to sleep.
    const galley = s.content.maps.require('galley');
    const door = galley.objects.find((o) => o.type === 'warp' && o.x === 8 && o.y === 12);
    expect(evaluateCondition(door.if, s.session), 'the old quarters stay shut').toBe(false);
  });

  it('each big moment happens exactly once, the required exchanges in order', async () => {
    const { s } = await playPhase10('first');
    const once = (re) => expect(s.log.filter((l) => re.test(l)).length, String(re)).toBe(1);
    // 'I used to be Blackbeard': at the crater, and again (harder) at the end.
    expect(s.log.filter((l) => /^captain: \.\.\.I used to be Blackbeard\.$/.test(l)).length).toBe(2);
    once(/^squawks: Now Stinkbeard\.$/);
    once(/^captain: IT STILL STINKS!$/);
    once(/^squawks: Bad gold\.$/);
    once(/^squawks: \(reading, from the pouch\) \.\.\.Great memories\.$/);
    once(/^garrick: That release moved in, Captain\.$/);
    // The hammock over the captain: the first night, and again at the very end (a callback).
    expect(s.log.filter((l) => /^captain: YOU DO NOT OUTRANK ME\.$/.test(l)).length).toBe(2);
    once(/^garrick: History repeats, Pete\. It's an ancient prophecy\.$/);
    once(/^captain: He invented him five minutes ago\.$/);
    once(/^garrick: YE'RE USING FAKE JOB DUTIES TO AVOID REAL WORK!$/);
    once(/^captain: THIS IS THE ONE TIME!$/);
    once(/^garrick: STENCHMASTER LAUNCH\.$/);
    once(/^captain: NOT INTO THE OCEAN!$/);
    once(/^gristle: THERE IS NO BETTER WAY TO PHRASE IT\.$/);
    once(/^garrick: \.\.\.NO AFTERSHOCKS\.$/);
    once(/^pete: I hate that it worked\.$/);
    once(/^garrick: THAT'S MADE UP!$/);
    once(/^garrick: \.\.\.Maybe the nap can wait\.$/);
    const all = s.log.join('\n');
    expect(all).toMatch(/pete: \.\.\.Many sharks\.\n[\s\S]{0,200}pete: They look angry\.\n[\s\S]{0,200}captain: Excellent\./);
    expect(all).toMatch(/garrick: \.\.\.When ye phrase it like that\.\.\.\ngristle: THERE IS NO BETTER WAY TO PHRASE IT\./);
    expect(all).toMatch(/YOU DO NOT OUTRANK ME\.\ngarrick: [^\n]*Physically\./);
    // Rusty Tom tests the old quarters once; Barnacle Bill is not related.
    expect(s.log.filter((l) => /^rusty_tom: It is STILL IN THERE\.$/.test(l)).length).toBe(1);
    expect(all).toMatch(/barnacle_bill: Not related\./);
    // The last token of the night.
    expect(JSON.stringify(s.content.scripts.get('p10c25.nap'))).toMatch(/token_good_night/);
  });

  it('the Bling Bling King never says a word in person; only on television, where nobody can explain it', () => {
    const s = makeStory({ preset: 'p10_complete' });
    const scripts = JSON.stringify([...s.content.scripts.map.values()]);
    expect(scripts).not.toMatch(/"(bling_bling_king|megalodon|bbk)(\[[a-z]+\])?: /);
    const tvLines = JSON.stringify(s.content.tvPrograms.get('frog_tax_man'));
    expect(tvLines).toMatch(/bling_king_tv: /);
    expect(s.content.npcs.get('bling_bling_king') ?? null).toBe(null);
  });

  it('keeps talking after the end without restarting anything', async () => {
    const { s } = await playPhase10('first');
    const before = s.log.length;
    for (const id of ['pete', 'bob', 'gristle', 'jim', 'ned', 'garrick', 'squawks', 'rusty_tom', 'barnacle_bill', 'garrick']) await s.talk(id);
    for (const id of ['p10_tv', 'p10_bed_look', 'p10_hammock_look', 'p10_lamp_look']) await s.inspect(id);
    expect(s.has('p10_complete')).toBe(true);
    expect(s.quest('inside_great_sharkstorm')).toBe('active');
    expect(s.log.slice(before).join('\n')).not.toMatch(/STENCHMASTER LAUNCH|NOT INTO THE OCEAN|I feel FANTASTIC/);
  });
});

describe('Story Phase 10 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase10', 'data/dialogue/phase10', 'data/npcs/phase10_crew.json', 'data/quests/phase10.json', 'data/items/phase10.json',
    'data/story/flags/phase10.json', 'data/maps/ship/phase10', 'data/maps/island/phase10', 'data/story/vistas/phase10.json', 'data/logs/phase10.json',
    'data/props/phase10.json', 'data/appearances/phase10.json', 'data/tv/programs/frog_tax_man.json', 'data/tv/ses_mk2.json', 'data/hazards/sharkstorm.json',
    'src/art/vista/vistaPhase10.js', 'src/art/inserts/phase10Inserts.js', 'src/art/props/phase10Props.js', 'src/art/stage/stagePhase10.js',
  ];
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)) : [p];
    return list.map((x) => fs.readFileSync(x, 'utf8'));
  }).join('\n');

  it('uses its own names: Garrick Grumblegut, the Great Sharkstorm, the Grand Expedition for the Lost Fart, Brogath (and no plumbers)', () => {
    for (const banned of [/wario/i, /nintendo/i, /\bwa+h+\b/i, /sharknado/i, /\bnado\b/i, /guzzlegut/i, /raiders/i, /indiana/i, /fedora/i, /brograth/i]) {
      expect(text).not.toMatch(banned);
    }
    expect(text).toMatch(/The Grand Expedition for the Lost Fart: Complete Grand Stenchmaster Legends - Volume One of Probably Many/);
    expect(text).toMatch(/Brogath the Bashful/);
    expect(text).toMatch(/Rumpold Windbreaker the Resolute/);
    expect(text).toMatch(/BLING BLING KING/);
    expect(text).toMatch(/GOOD NIGHT, FART MAN!\|THANKS FOR THE RIDE!/);
    // Barnacle Bill is never Barnacle Bob.
    expect(fs.readFileSync(path.resolve('data/npcs/phase10_crew.json'), 'utf8')).not.toMatch(/"name": "Barnacle Bob"/);
    // Nothing anywhere in the game data says the forbidden storm name or the borrowed book title.
    const all = fs.readdirSync(path.resolve('data'), { recursive: true }).filter((f) => f.endsWith('.json')).map((f) => fs.readFileSync(path.resolve('data', f), 'utf8')).join('\n');
    expect(all).not.toMatch(/sharknado|raiders of the lost/i);
  });

  it('leaves the next phase alone: the storm unresolved, the crown on the megalodon, Brogath unverified, no court', () => {
    for (const banned of [/stenchmaster'?s? court/i, /sash law/i, /ancient (grand )?stenchmasters? (were|was) real/i, /cardboard brogath/i, /brogath (was|is) real/i]) {
      expect(text).not.toMatch(banned);
    }
    const s = makeStory({ preset: 'p10_complete' });
    expect(s.content.quests.require('inside_great_sharkstorm').open).toBe(true);
    const scripts = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => id.startsWith('p10')).map(([, sc]) => sc));
    for (const f of ['revenge_out_of_sharkstorm', 'bling_bling_king_dealt_with', 'crimson_crown_recovered', 'brogath_verified', 'great_sharkstorm_dealt_with']) {
      expect(scripts).not.toMatch(new RegExp(`"setFlag":"${f}"`));
    }
    expect(scripts).not.toMatch(/"setValue":"great_sharkstorm","value":"(destroyed|collapsed|gone)"/);
    expect(scripts).not.toMatch(/"setValue":"crimson_crown_holder"/);
    // No speaker is Brogath (he is only ever a story Garrick tells).
    expect(scripts).not.toMatch(/"brogath(\[[a-z]+\])?: /);
    // Nothing after Phase 10 starts by itself.
    const later = s.content.storyTriggers.list().filter((t) => JSON.stringify(t.if).includes('p10_complete') && !JSON.stringify(t.if).includes('notFlag'));
    expect(later).toEqual([]);
  });
});

describe('A save from the end of Phase 9 is told where Phase 10 starts', () => {
  it('coming onto the island says so once, and nothing starts until the captain talks to Pete', async () => {
    const s = makeStory({ preset: 'p9_complete' });
    await s.enter('crownskull_isle');
    expect(s.has('p10_ready_hint')).toBe(true);
    expect(s.has('p10_started')).toBe(false);
    expect(s.content.scripts.get('p10.ready_hint').find((st) => st.tutorial).tutorial).toMatch(/Pete/);
    await s.talk('pete');
    expect(s.has('p10_started')).toBe(true);
  });

  it('the boats wait until the walk back is done (Phase 9\'s crossing can\'t skip the island chapters)', async () => {
    const s = makeStory({ preset: 'p10_crater_salvage' });
    await s.enter('crownskull_isle');
    const at = s.content.maps.require('crownskull_isle').objects.filter((o) => o.type === 'inspect' && o.x === 25 && o.y === 62);
    const live = at.find((o) => !o.if || evaluateCondition(o.if, s.session));
    expect(live.script).toBe('p10.isle.boats_wait');
    await s.inspect(live.id);
    expect(s.map).toBe('crownskull_isle');
  });
});
