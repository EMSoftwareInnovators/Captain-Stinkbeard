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
