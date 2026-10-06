import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { currentChapter, resolveVariant } from '../src/systems/story/progress.js';
import { sharkstormNow } from '../src/systems/hazards/sharkstorm.js';
import { tvDef, tvCondition } from '../src/systems/tv/tv.js';
import { programEpisode, programDef } from '../src/systems/tv/tv.js';
import { logEntries } from '../src/systems/logs/logbook.js';
import { resolvePreset } from '../src/debug/presets.js';
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
