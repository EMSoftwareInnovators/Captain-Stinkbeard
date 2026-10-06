import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { currentChapter } from '../src/systems/story/progress.js';
import { resolveSpeaker } from '../src/systems/story/aliases.js';
import { sharkstormNow } from '../src/systems/hazards/sharkstorm.js';
import { resolvePreset } from '../src/debug/presets.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { SAVE_VERSION } from '../src/config/constants.js';
import { makeStory, reloadStory } from './storyHarness.js';
import { PHASE11_QUESTS, STEPS11, playPhase11, playToEndP11 } from './phase11Play.js';
import { BANNED, BANNED_LIST } from './bannedNames.js';

/**
 * Story Phase 11 (chapters 96-111), played headless from the end of Phase 10:
 * bedtime inside the Great Sharkstorm, the six-rope lamp, Brogath's treasure,
 * every sash incident, the Grand Finger-Puller, the storm's tokens, the
 * hammocks, the lost book, the Cheap-O-Rama sashes and their pocket edition,
 * bed sashes, Sir Rumpus, the late-night show, the First Great Sash Flutter,
 * and the captain's secret research: the anti-dice conspiracy. From every
 * Phase 11 preset too, and across a save and load.
 */

/** Walks open objectives until `ref` is the next one (it isn't done). */
async function playUntil(s, steps, ref) {
  for (let n = 0; n < 200; n++) {
    const step = steps.find(([r]) => {
      const [q, o] = r.split('.');
      return s.session.quests.isObjectiveAvailable(q, o);
    });
    if (!step) throw new Error(`ran out of objectives before ${ref}`);
    if (step[0] === ref) return;
    await step[1](s);
  }
  throw new Error(`never reached ${ref}`);
}

async function startPhase11(pick = 'first') {
  const s = makeStory({ pick, preset: 'p10_complete' });
  s.pickLast = pick === 'last';
  await s.enter('galley');
  await s.inspect('p11_start_bed');
  return s;
}

describe('Story Phase 11 can be played start to finish (headless)', () => {
  it('taking the first option at every choice', async () => {
    const { s, chapters } = await playPhase11('first');
    // Every chapter starts, in order (some run straight on into the next, between two of the player's moves).
    const starts = ['p11_started', ...Array.from({ length: 15 }, (_, i) => `p11_ch${97 + i}_started`)];
    const at = starts.map((f) => s.flagAt[f]);
    expect(at.every((n) => n !== undefined), starts.filter((f) => s.flagAt[f] === undefined).join(' ')).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(chapters[0]).toBe('p11c1');
    expect(chapters[chapters.length - 1]).toBe('p11c16');
    expect(currentChapter(s.content.game, s.session).id).toBe('phase11_end');
    for (const q of PHASE11_QUESTS) expect(s.quest(q), q).toBe('completed');
  });

  it('taking the last option at every choice (it converges)', async () => {
    const { s } = await playPhase11('last');
    for (const q of PHASE11_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.has('conspiracy_ready')).toBe(true);
  });
});

describe('Story Phase 11 staging', () => {
  it('nobody stands in a wall, on a bed that is not there, or boxes the captain in (first options)', async () => {
    const { s } = await playPhase11('first');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
  it('the same, choosing the last option everywhere', async () => {
    const { s } = await playPhase11('last');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
});

describe('Story Phase 11 debug presets are real, finishable points in the story', () => {
  const presets = ['p11_start', 'p11_bedtime_argument', 'p11_lamp_engineering', 'p11_brogath_legend', 'p11_finger_puller', 'p11_token_downpour',
    'p11_hammock_failure', 'p11_lost_book', 'p11_cheap_o_rama', 'p11_bed_sashes', 'p11_grand_nap', 'p11_sir_rumpus', 'p11_bling_late_night',
    'p11_first_flutter', 'p11_secret_borrow', 'p11_grand_dice_discovery', 'p11_anti_dice', 'p11_complete'];
  it('there are eighteen of them, chained from the end of Phase 10, with the brief\'s names', () => {
    const s = makeStory({ preset: 'p11_start' });
    const all = s.content.debugPresets.list().filter((p) => p.id.startsWith('p11_'));
    expect(all.map((p) => p.id)).toEqual(presets);
    expect(all.map((p) => p.name)).toEqual(['Phase 11 Start', 'Grand Bedtime Argument', 'Lamp Engineering', 'Brogath Bedtime Legend',
      'Finger-Puller Revelation', 'Token Downpour', 'Hammock Failure', 'Lost Book', 'Cheap-O-Rama Sashes', 'Bed Sash Repairs', 'Grand Nap Resumption',
      'Sir Rumpus Legend', 'Bling Late-Night Show', 'First Great Sash Flutter', 'Secret Book Borrow', 'Grand Dice Discovery', 'Anti-Dice Conspiracy',
      'Phase 11 Complete']);
    expect(all[0].after).toBe('p10_complete');
    for (let i = 1; i < all.length; i++) expect(all[i].after, all[i].id).toBe(all[i - 1].id);
  });
  for (const id of presets) {
    it(`${id} plays through to the end of Phase 11`, async () => {
      const s = makeStory({ preset: id });
      s.pickLast = false;
      await s.enter(s.map, resolvePreset(s.content, id).script);
      if (!s.has('p11_started')) await s.inspect('p11_start_bed');
      await playToEndP11(s);
      for (const q of PHASE11_QUESTS) expect(s.quest(q), `${id}: ${q}`).toBe('completed');
      expect(s.stagingIssues.join('\n'), id).toBe('');
    });
  }
  it('Grand Dice Discovery lands with four of the five passages read (a counted objective, part done)', () => {
    const s = makeStory({ preset: 'p11_grand_dice_discovery' });
    expect(s.session.quests.objState('anti_dice_conspiracy', 'read')).toMatchObject({ progress: 4, done: false });
    expect(s.session.story.getValue('pocket_legend_book_condition')).toBe('torn_corner');
  });
});

describe('Story Phase 11 ends where the brief says: the conspiracy sworn, still inside the storm', () => {
  it('leaves the canonical end state', async () => {
    const { s } = await playPhase11('first');
    const v = (n) => s.session.story.getValue(n);
    // The lamp really works: six ropes.
    expect(v('galley_lamp_state')).toBe('six_rope_suspension');
    expect(s.has('lamp_six_rope_installed')).toBe(true);
    // Brogath's story is the day's catastrophe again; still only a legend.
    expect(v('brogath_status')).toBe('alleged_poor_in_gold');
    expect(s.has('brogath_verified')).toBe(false);
    // The Grand Finger-Puller exists, as a post. Nobody holds it.
    expect(v('grand_finger_puller')).toBe('vacant');
    // The storm mocked the designated fart man; the hammocks broke; the book is gone into the storm.
    for (const f of ['bbk_mocked_fart_man', 'sailcloth_hammocks_snapped', 'garrick_book_lost', 'cheap_o_rama_sashes_arrived', 'bed_sashes_installed',
      'rumpus_legend_heard', 'bbk_late_night_seen', 'sash_flutter_weakness_discovered', 'grand_dice_known', 'conspiracy_ready']) expect(s.has(f), f).toBe(true);
    expect(v('garrick_book_location')).toBe('great_sharkstorm');
    expect(s.session.inventory.count('lost_fart_book')).toBe(0);
    expect(v('grand_court_status')).toBe('alleged');
    // The pocket edition went back where it was found, a little more worn; the plan is the captain's.
    expect(s.has('pocket_book_borrowed') && s.has('pocket_book_returned')).toBe(true);
    expect(s.session.inventory.count('pocket_legend_book')).toBe(0);
    expect(v('pocket_legend_book_condition')).toBe('page_tear');
    expect(s.session.inventory.count('anti_dice_plan')).toBe(1);
    expect(v('anti_dice_strategy')).toBe('destroy');
    // Still inside the Great Sharkstorm, at bedtime. Nothing escaped, nothing found again.
    expect(sharkstormNow(s.content, s.session)).toMatchObject({ id: 'inside_bedtime', distance: 'inside' });
    expect(v('queen_annes_revenge_location')).toBe('inside_great_sharkstorm');
    expect(s.quest('inside_great_sharkstorm')).toBe('active');
    // Garrick is still the Grand Stenchmaster; nothing of Phase 12 has started.
    expect(resolveSpeaker(s.content, s.session, 'garrick').name).toBe('Grand Stenchmaster Garrick');
    for (const f of ['p12_started', 'thirty_seconds_held', 'stenchmaster_suspension_active', 'regalia_removed']) expect(s.has(f), f).toBe(false);
    // The treasure room is sealed (and stays that way).
    expect(s.has('treasure_room_sealed')).toBe(true);
  });

  it('each big moment happens exactly once, in order', async () => {
    const { s } = await playPhase11('first');
    const all = s.log.join('\n');
    const once = (re) => expect(s.log.filter((l) => re.test(l)).length, String(re)).toBe(1);
    once(/^captain: SIX ropes\? For a LAMP\?$/);
    once(/^garrick: And Brogath was left in the hole\. Poor in gold\.$/);
    once(/^garrick: The Grand Stenchmaster's GRAND FINGER-PULLER\.$/);
    once(/^garrick: THE BOOK!$/);
    once(/^captain: Bed sash\.$/);
    once(/^garrick: 'The Grand Waft is valid\.'$/);
    once(/^bling_king_tv: So I've been asking myself, folks\. Why does a pirate ship have a designated FART MAN\?$/);
    once(/^garrick: \.\.\.that he refused to release again\. For THREE WEEKS\.$/);
    once(/^captain: Table A says see Table A\.$/);
    // In story order: the lamp, Brogath, the Finger-Puller, the book, bed sashes, the Court, the show, the flutter, the dice.
    const order = ['SIX ropes', 'Poor in gold', 'GRAND FINGER-PULLER', 'THE BOOK!', 'captain: Bed sash.', 'The Grand Waft is valid', 'designated FART MAN', 'For THREE WEEKS', 'Table A says'];
    const at = order.map((t) => all.indexOf(t));
    expect(at.every((i) => i >= 0), JSON.stringify(at)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('the storm\'s tokens mock the designated fart man; the Bling Bling King never says a word in person', () => {
    const s = makeStory({ preset: 'p11_complete' });
    expect(JSON.stringify(s.content.scripts.get('p11c6.t1'))).toMatch(/DESIGNATED FART MAN/);
    const scripts = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => /^p11/.test(id)).map(([, sc]) => sc));
    expect(scripts).not.toMatch(/"(bling_bling_king|megalodon|bbk)(\[[a-z]+\])?: /);
    expect(JSON.stringify(s.content.tvPrograms.get('bling_late_night'))).toMatch(/bling_king_tv: /);
  });

  it('keeps Garrick\'s own book: the pocket edition is a Cheap-O-Rama companion, suspiciously similar', () => {
    const s = makeStory({ preset: 'p11_complete' });
    expect(s.content.items.require('lost_fart_book').description ?? '').not.toMatch(BANNED.book);
    expect(s.content.items.require('pocket_legend_book').description).toMatch(/COMPLETE GRAND STENCHMASTER LEGENDS - CHEAP-O-RAMA POCKET EDITION/);
    const text = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => /^p11c10/.test(id)));
    expect(text).toMatch(/It's the BOOK, Garrick\. It's YOUR book\./);
  });
});

describe('The pocket edition is fragile: it wears, a stage at a time, and never comes back', () => {
  it('comes out of the crate new, then bent, a torn corner, a torn last page, in that order', async () => {
    const s = await startPhase11('first');
    const seen = [];
    s.bus.on('story:valueChanged', ({ name, value }) => { if (name === 'pocket_legend_book_condition') seen.push(value); });
    await playToEndP11(s);
    expect(seen).toEqual(['new', 'bent', 'torn_corner', 'page_tear']);
    const stages = s.content.items.require('pocket_legend_book').wear.stages;
    expect(stages.slice(0, 4)).toEqual(['new', 'bent', 'torn_corner', 'page_tear']);
  });

  it('a wear step never goes backwards or past the end', async () => {
    const s = makeStory({ preset: 'p11_complete' });
    s.session.story.setValue('pocket_legend_book_condition', 'loose_staple');
    await s.run([{ wear: 'pocket_legend_book', to: 'bent' }]);
    expect(s.session.story.getValue('pocket_legend_book_condition')).toBe('loose_staple');
    for (let i = 0; i < 4; i++) await s.run([{ wear: 'pocket_legend_book' }]);
    expect(s.session.story.getValue('pocket_legend_book_condition')).toBe('barely_surviving');
  });
});

describe('Story Phase 11 survives a save and load', () => {
  it('saved after the book is lost, loaded, it plays on to the same end', async () => {
    const s = await startPhase11('first');
    await playUntil(s, STEPS11, 'cheap_o_rama_delivery.deck');
    expect(s.has('garrick_book_lost')).toBe(true);
    const t = reloadStory(s);
    expect(t.record.version).toBe(SAVE_VERSION);
    expect(t.session.story.serialize()).toEqual(s.session.story.serialize());
    await t.enter(t.map);
    await playToEndP11(t);
    for (const q of PHASE11_QUESTS) expect(t.quest(q), q).toBe('completed');
    const { s: straight } = await playPhase11('first');
    expect(t.session.story.serialize().values).toEqual(straight.session.story.serialize().values);
  });

  it('saved mid-research (the booklet borrowed), loaded, the booklet and its wear come back with it', async () => {
    const s = await startPhase11('first');
    await playUntil(s, STEPS11, 'anti_dice_conspiracy.plan');
    const t = reloadStory(s);
    expect(t.session.inventory.count('pocket_legend_book')).toBe(1);
    expect(t.session.story.getValue('pocket_legend_book_condition')).toBe('page_tear');
    expect(t.session.quests.isObjectiveDone('anti_dice_conspiracy', 'read')).toBe(true);
    await t.enter(t.map);
    await playToEndP11(t);
    expect(t.has('p11_complete')).toBe(true);
  });

  it('a save from the end of Phase 10 (version 10) loads, migrates and is told where Phase 11 starts', async () => {
    const storage = new MemoryStorage();
    const p10 = makeStory({ preset: 'p10_complete' });
    expect(new SaveManager({ storage, content: p10.content, version: 10 }).save(3, p10.session).ok).toBe(true);
    const read = new SaveManager({ storage, content: p10.content }).read(3);
    expect(read.ok).toBe(true);
    const s = makeStory({ state: read.state });
    expect(s.has('p10_complete')).toBe(true);
    expect(s.session.story.getValue('pocket_legend_book_condition')).toBe(null);
    await s.enter('galley');
    expect(s.has('p11_ready_hint')).toBe(true);
    expect(s.has('p11_started')).toBe(false);
    await s.inspect('p11_start_bed');
    expect(s.has('p11_started')).toBe(true);
  });
});

describe('The treasure room is sealed from Phase 11 on, and the old key no longer opens it', () => {
  it('the cargo hold\'s treasure door is the sealed one once the sign is up, whatever the captain carries', async () => {
    const s = makeStory({ preset: 'p11_complete' });
    const hold = s.content.maps.require('cargo_hold');
    const door = hold.objects.find((o) => o.type === 'warp' && o.to?.map === 'treasure_hold' && (!o.when || evaluateCondition(o.when, s.session)));
    expect(door.id).toBe('p11_treasure_sealed');
    expect(door.locked).toBe('p11.treasure_door_sealed');
    expect(evaluateCondition(door.if, s.session)).toBe(false);
    s.session.inventory.add('treasure_key');
    expect(evaluateCondition(door.if, s.session)).toBe(false);
    // Through Phase 12 too; Phase 13 adds its own signs (and its own door) only once it has started.
    for (const id of ['p12_complete', 'p13_start']) {
      const t = makeStory({ preset: id });
      const d = hold.objects.find((o) => o.type === 'warp' && o.to?.map === 'treasure_hold' && (!o.when || evaluateCondition(o.when, t.session)));
      expect(d.id, id).toBe('p11_treasure_sealed');
    }
  });

  it('before Phase 11 the old door (and its key) are what the hold has', () => {
    const s = makeStory({ preset: 'p10_complete' });
    const hold = s.content.maps.require('cargo_hold');
    const door = hold.objects.find((o) => o.type === 'warp' && o.to?.map === 'treasure_hold' && (!o.when || evaluateCondition(o.when, s.session)));
    expect(door.id).not.toBe('p11_treasure_sealed');
  });
});

describe('Story Phase 11 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase11', 'data/dialogue/phase11', 'data/npcs/phase11_crew.json', 'data/quests/phase11.json', 'data/items/phase11.json',
    'data/story/flags/phase11.json', 'data/story/triggers/phase11.json', 'data/maps/ship/phase11', 'data/story/vistas/phase11.json',
    'data/logs/phase11.json', 'data/props/phase11.json', 'data/characters/speakers_phase11.json',
  ];
  // (data/appearances/phase11.json and data/portraits/phase11.json hold the looks of all three phases, the delirium's included.)
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)) : [p];
    return list.map((x) => fs.readFileSync(x, 'utf8'));
  }).join('\n');

  it('uses its own names (and none of the source\'s)', () => {
    for (const banned of [...BANNED_LIST, /nintendo/i, /\bwa+h+\b/i, /\bnado\b/i, /indiana/i, /fedora/i, /brograth/i]) expect(text).not.toMatch(banned);
    for (const name of ['Brogath the Bashful', 'Sir Rumpus Windbottom', 'Lord Gustavio Bottomsworth', 'Cheap-O-Rama', 'Grand Finger-Puller', 'Great Sharkstorm']) {
      expect(text, name).toContain(name);
    }
  });

  it('leaves Phase 12 alone: nobody holds the sash, nobody rolls, nobody is suspended', () => {
    for (const banned of [/jumping bean/i, /stench-o-vision/i, /mega-pack/i, /stenchmaster prime/i, /stench silence is (on|active)/i]) expect(text).not.toMatch(banned);
    const s = makeStory({ preset: 'p11_complete' });
    const scripts = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => /^p11/.test(id)).map(([, sc]) => sc));
    for (const f of ['thirty_seconds_held', 'sash_fluttered', 'stenchmaster_suspension_active', 'regalia_removed', 'revenge_out_of_sharkstorm', 'brogath_verified']) {
      expect(scripts).not.toMatch(new RegExp(`"setFlag":"${f}"`));
    }
    expect(scripts).not.toMatch(/"dice":"roll"/);
    // Nothing after Phase 11 starts by itself: Phase 12 waits for the captain's bed.
    const later = s.content.storyTriggers.list().filter((t) => JSON.stringify(t.if).includes('p11_complete') && !JSON.stringify(t.if).includes('notFlag'));
    expect(later).toEqual([]);
  });
});
