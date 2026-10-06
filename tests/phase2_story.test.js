import { describe, expect, it } from 'vitest';
import { currentChapter } from '../src/systems/story/progress.js';
import { makeStory } from './storyHarness.js';
import { BANNED_LIST } from './bannedNames.js';

/**
 * Plays Story Phase 2 from the end of the prologue to "phase 2 complete"
 * with the real content (see tests/storyHarness.js). Story Phase 3 opens the
 * same evening, so the run ends with its first scene already under way.
 */

async function playPhase2(story) {
  const s = story;
  // --- Chapter 1: the morning, the lookout, the telescope ---------------------
  await s.enter('captains_quarters');
  s.choices.push(0); // "Turn in for the night" (the other option just waits)
  await s.inspect('bed_story');
  expect(s.has('ch1_morning_started')).toBe(true);
  expect(currentChapter(s.content.game, s.session).id).toBe('ch1');
  await s.enter('main_deck');
  await s.talk('bob');
  expect(s.has('bob_lamp_oil_seen')).toBe(true);
  await s.trigger('ch1_foredeck');
  expect(s.quest('strange_cargo')).toBe('active');
  await s.inspect('telescope');
  expect(s.quest('strange_cargo')).toBe('completed');
  expect(s.has('garrick_provisional')).toBe(true);

  // --- Chapter 2: toll deck, scrubbing, lunch, rumbles ---------------------------
  // ch2.begin ran from its trigger and moved to the cabin for the time skip.
  expect(s.quest('new_recruit')).toBe('active');
  expect(s.map).toBe('captains_quarters');
  await s.enter('main_deck');
  await s.trigger('toll_warn');
  await s.inspect('toll_sign_look');
  await s.talk('garrick');
  expect(s.has('garrick_toll_removed')).toBe(true);
  await s.talk('garrick');
  expect(s.has('garrick_scrub_seen')).toBe(true);
  await s.warp('to_galley_p2');
  expect(s.has('galley_lunch_seen')).toBe(true);
  await s.talk('jim');
  expect(s.has('jim_warned')).toBe(true);
  await s.enter('main_deck');
  await s.trigger('sails_rumble');
  await s.talk('garrick');
  expect(s.quest('new_recruit')).toBe('completed');

  // --- Chapter 3: the treasure room ----------------------------------------------
  expect(s.quest('treasure_inspection')).toBe('active');
  await s.enter('cargo_hold');
  // The door is held until Garrick is met; bumping it starts the meeting.
  await s.warp('to_treasure_p2');
  expect(s.map).toBe('treasure_hold');
  expect(s.has('garrick_searched')).toBe(true);
  await s.inspect('hoard');
  await s.inspect('chest_to_move');
  expect(s.has('treasure_chest_moved')).toBe(true);
  expect(await s.warp('to_hold')).toBe(false); // the crab holds the door

  // --- Chapter 4: the Grumblegut Gust ------------------------------------------------
  await s.trigger('escape_door');
  expect(s.has('grumblegut_gust')).toBe(true);
  expect(s.has('quarters_evacuated')).toBe(true);
  expect(s.has('galley_evacuated')).toBe(true);
  expect(s.has('gust_aftermath_done')).toBe(true);
  expect(s.map).toBe('cargo_hold');

  // --- Chapter 5: the cloud takes the ship -------------------------------------------
  expect(s.quest('yellow_alert')).toBe('active');
  expect(await s.warp('to_treasure_p2')).toBe(false); // sealed while the cloud is thick
  await s.enter('galley');
  await s.enter('main_deck');
  expect(s.has('deck_evacuated_seen')).toBe(true);
  await s.talk('garrick');
  expect(s.has('dead_center_explained')).toBe(true);
  expect(s.has('squawks_fell')).toBe(true);

  // --- Chapter 6: save Squawks ----------------------------------------------------------
  expect(s.quest('save_squawks')).toBe('active');
  expect(await s.warp('to_galley_p2')).toBe(false); // no rope, no cloth
  await s.talk('rook');
  await s.talk('fennimore');
  expect(s.has('rescue_gear_on')).toBe(true);
  expect(await s.warp('to_galley_p2')).toBe(true);
  expect(s.has('rescue_prepared')).toBe(true);
  await s.enter('cargo_hold');
  expect(s.has('rescue_boots_moment')).toBe(true);
  await s.talk('squawks');
  expect(s.has('squawks_caught')).toBe(true);
  await s.trigger('rescue_exit');
  expect(s.has('squawks_rescued')).toBe(true);
  expect(s.has('squawks_bald')).toBe(true);
  expect(s.has('boots_stained')).toBe(true);
  expect(s.has('rescue_gear_on')).toBe(false);

  // --- Chapter 7: the fate of the treasure -----------------------------------------------
  expect(s.quest('price_of_gold')).toBe('active');
  expect(s.has('fumes_thinned')).toBe(true);
  await s.enter('treasure_hold');
  expect(s.has('ruined_reveal_seen')).toBe(true);
  for (const id of ['ruined_coin', 'ruined_ruby', 'ruined_crown', 'ruined_crown', 'ruined_pearls']) await s.inspect(id);
  expect(s.has('merchant_test_started')).toBe(true);
  await s.enter('crew_quarters');
  await s.talk('penhallow');
  expect(s.has('merchant_test_done')).toBe(true);
  await s.enter('treasure_hold');
  await s.talk('garrick');
  expect(s.has('ship_permanently_contaminated')).toBe(true);
  await s.enter('main_deck');
  expect(s.quest('price_of_gold')).toBe('completed');

  // --- Chapter 8: the trial, the frigate, probation ------------------------------------------
  expect(s.has('trial_started')).toBe(true);
  expect(s.has('squawks_sweater')).toBe(true);
  expect(s.quest('yellow_defense')).toBe('active');
  expect(s.has('frigate_plan_agreed')).toBe(true);
  await s.inspect('helm_frigate');
  expect(s.has('ship_turned')).toBe(true);
  await s.inspect('sail_line');
  expect(s.has('frigate_fled')).toBe(true);
  expect(s.has('garrick_on_probation')).toBe(true);
  expect(s.has('rowboat_protocol')).toBe(true);
  expect(s.has('squawks_deadly_brew')).toBe(true);
  expect(s.has('phase2_complete')).toBe(true);
  for (const q of ['tomorrows_heading', 'strange_cargo', 'new_recruit', 'treasure_inspection', 'yellow_alert', 'save_squawks', 'price_of_gold', 'yellow_defense']) {
    expect(s.quest(q), q).toBe('completed');
  }
  // Story Phase 3 picks up the same evening: its opener has already run.
  expect(s.has('p3_started')).toBe(true);
  expect(s.quest('necessary_promotion')).toBe('active');
  expect(currentChapter(s.content.game, s.session).id).toBe('p3c1');
}

describe('Story Phase 2 can be played start to finish (headless)', () => {
  it('taking the first option at every choice', async () => {
    const story = makeStory({ pick: 'first' });
    await playPhase2(story);
    expect(story.log.length).toBeGreaterThan(400);
  });

  it('taking the last option at every choice (the attitudes converge)', async () => {
    const story = makeStory({ pick: 'last' });
    await playPhase2(story);
  });

  it('never names the source\'s lead or Stinkbeard-era story in Phase 2 lines', async () => {
    const story = makeStory();
    await playPhase2(story);
    // Only Phase 2's own lines: Phase 3 starts straight after (see phase3_story.test.js).
    const text = story.log.slice(0, story.flagAt.phase2_complete).join('\n');
    expect(story.flagAt.phase2_complete).toBeGreaterThan(400);
    for (const banned of [...BANNED_LIST, /nintendo/i, /stinkbeard/i, /stenchmaster/i, /sharkstorm/i, /stenchcaster/i, /frog grog/i, /brogath/i]) {
      expect(text).not.toMatch(banned);
    }
  });
});

describe('Story Phase 2 staging (who stands where, scene by scene)', () => {
  it('never puts anyone on a solid tile, walks them through one, boxes the captain in or cuts off a doorway', async () => {
    const story = makeStory();
    await playPhase2(story);
    expect(story.stagingIssues).toEqual([]);
  });
});
