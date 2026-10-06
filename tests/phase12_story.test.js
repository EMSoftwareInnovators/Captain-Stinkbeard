import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { currentChapter, resolveVariant } from '../src/systems/story/progress.js';
import { resolveSpeaker } from '../src/systems/story/aliases.js';
import { sharkstormNow } from '../src/systems/hazards/sharkstorm.js';
import { resolvePreset } from '../src/debug/presets.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { createTension, stepTension, autoHold, tensionDef } from '../src/systems/tension.js';
import { SaveManager } from '../src/systems/save/SaveManager.js';
import { MemoryStorage } from '../src/platform/storage.js';
import { makeStory, reloadStory } from './storyHarness.js';
import { PHASE12_QUESTS, STEPS12, playPhase12, playToEndP12 } from './phase12Play.js';
import { BANNED_LIST } from './bannedNames.js';

/**
 * Story Phase 12 (chapters 112-126), played headless from the end of Phase
 * 11: Garrick wakes up loaded, the captain gears up and volunteers, the
 * pre-waft, the full thirty-second hold, the flutter he lets happen on
 * purpose, the humiliation blast and the storm's complaints, three weeks
 * claimed, the dice (a normal six that doesn't count, the real foam one, six
 * more by delivery), the ceremony and its six, the jumping beans and the
 * final three, ONE DAY, the suspension, the authenticity whiff, the sash in
 * the captain's wardrobe, a normal breakfast, and the finger. From every
 * Phase 12 preset too, and across a save and load.
 */

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

async function startPhase12(pick = 'first') {
  const s = makeStory({ pick, preset: 'p11_complete' });
  s.pickLast = pick === 'last';
  await s.enter('galley');
  await s.inspect('p12_start_bed');
  return s;
}

describe('Story Phase 12 can be played start to finish (headless)', () => {
  it('taking the first option at every choice', async () => {
    const { s, chapters } = await playPhase12('first');
    const starts = ['p12_started', ...Array.from({ length: 14 }, (_, i) => `p12_ch${113 + i}_started`)];
    const at = starts.map((f) => s.flagAt[f]);
    expect(at.every((n) => n !== undefined), starts.filter((f) => s.flagAt[f] === undefined).join(' ')).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(chapters[0]).toBe('p12c1');
    expect(chapters[chapters.length - 1]).toBe('p12c15');
    expect(currentChapter(s.content.game, s.session).id).toBe('phase12_end');
    for (const q of PHASE12_QUESTS) expect(s.quest(q), q).toBe('completed');
  });

  it('taking the last option at every choice (Bob\'s pot, a refusal or two; it converges)', async () => {
    const { s } = await playPhase12('last');
    for (const q of PHASE12_QUESTS) expect(s.quest(q), q).toBe('completed');
    expect(s.has('gear_clay_pot')).toBe(true);
  });
});

describe('Story Phase 12 staging', () => {
  it('nobody stands in a wall, on a bed that is not there, or boxes the captain in (first options)', async () => {
    const { s } = await playPhase12('first');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
  it('the same, choosing the last option everywhere', async () => {
    const { s } = await playPhase12('last');
    expect(s.stagingIssues.join('\n')).toBe('');
  });
});

describe('Story Phase 12 debug presets are real, finishable points in the story', () => {
  const presets = ['p12_start', 'p12_garrick_loaded', 'p12_protective_gear', 'p12_sash_volunteer', 'p12_pre_waft', 'p12_trial', 'p12_flutter',
    'p12_humiliation_blast', 'p12_three_weeks', 'p12_dice_search', 'p12_real_dice', 'p12_dice_shipment', 'p12_dice_ceremony', 'p12_three_months',
    'p12_jumping_beans', 'p12_one_day', 'p12_authenticity_whiff', 'p12_sash_wardrobe', 'p12_breakfast', 'p12_finger_crisis', 'p12_complete'];
  it('there are twenty-one of them, chained from the end of Phase 11, with the brief\'s names', () => {
    const s = makeStory({ preset: 'p12_start' });
    const all = s.content.debugPresets.list().filter((p) => p.id.startsWith('p12_'));
    expect(all.map((p) => p.id)).toEqual(presets);
    expect(all.map((p) => p.name)).toEqual(['Phase 12 Start', 'Garrick Loaded', 'Protective Gear', 'Sash Volunteer', 'Pre-Waft', 'Thirty-Second Trial',
      'Flutter Moment', 'Runaway Humiliation Blast', 'Three Weeks Claimed', 'Dice Search', 'Real Grand Dice Found', 'Grand Dice Shipment',
      'Grand Dice Ceremony', 'Apparent Three Months', 'Jumping Bean Betrayal', 'One-Day Suspension', 'Authenticity Whiff', 'Sash Wardrobe',
      'Normal Breakfast', 'Finger-Pulling Crisis', 'Phase 12 Complete']);
    expect(all[0].after).toBe('p11_complete');
    for (let i = 1; i < all.length; i++) expect(all[i].after, all[i].id).toBe(all[i - 1].id);
  });
  for (const id of presets) {
    it(`${id} plays through to the end of Phase 12`, async () => {
      const s = makeStory({ preset: id });
      s.pickLast = false;
      await s.enter(s.map, resolvePreset(s.content, id).script);
      if (!s.has('p12_started')) await s.inspect('p12_start_bed');
      await playToEndP12(s);
      for (const q of PHASE12_QUESTS) expect(s.quest(q), `${id}: ${q}`).toBe('completed');
      expect(s.stagingIssues.join('\n'), id).toBe('');
    });
  }
  it('the mid-scene presets put their scene back up first (the humiliation blast starts at full flutter)', () => {
    const s = makeStory({ preset: 'p12_humiliation_blast' });
    const plan = resolvePreset(s.content, 'p12_humiliation_blast');
    expect(plan.script).toBe('p12c5.from_surge');
    expect(JSON.stringify(s.content.scripts.get('p12c5.from_surge'))).toMatch(/"vista":"sash_flutter"[\s\S]*"frame":"sash_flap_full"[\s\S]*"call":"p12c5\.surge"/);
    expect(s.has('sash_fluttered')).toBe(true);
    expect(s.has('p12_complaints_down')).toBe(false);
  });
});

describe('The thirty-second trial is a real, fail-soft hold, and the flutter is on purpose', () => {
  const def = () => makeStory({ preset: 'p12_trial' }).content.tension.require('thirty_second_trial');

  it('lasts exactly thirty counted seconds, then asks to LET IT FLUTTER', () => {
    const st = createTension(def());
    const seconds = [];
    let cue = 0;
    for (let i = 0; i < 31 * 60 && st.phase === 'hold'; i++) {
      for (const e of stepTension(st, 1 / 60, { held: autoHold(st) }, () => 0.5)) {
        if (e.type === 'second') seconds.push(e.n);
        if (e.type === 'cue') cue += 1;
      }
    }
    expect(seconds).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(cue).toBe(1);
    expect(st.phase).toBe('release');
    expect(st.slips).toBe(0);
    expect(tensionDef(def()).release.cue).toBe('LET IT FLUTTER!');
  });

  it('a careful hand never slips; letting go or yanking is caught, never failed, and the clock keeps going', () => {
    for (const held of [false, true]) {
      const st = createTension(def());
      let t = 0;
      while (st.phase === 'hold' && t < 40) {
        stepTension(st, 1 / 30, { held }, () => 0.5);
        t += 1 / 30;
      }
      expect(st.phase, `held=${held}`).toBe('release');
      expect(st.slips, `held=${held}`).toBeGreaterThan(0);
      expect(t).toBeLessThan(30.1);
    }
  });

  it('the release is a deliberate press; without one the captain\'s hands slip after a moment anyway', () => {
    const run = (press) => {
      const st = createTension(def());
      while (st.phase === 'hold') stepTension(st, 1 / 60, { held: autoHold(st) }, () => 0.5);
      for (let i = 0; i < 600 && st.phase !== 'done'; i++) stepTension(st, 1 / 60, { pressed: press && i === 30 });
      return st.released;
    };
    expect(run(true)).toBe('pressed');
    expect(run(false)).toBe('slipped');
  });

  it('pressed: the captain opens his hands; slipped: they open for him. The sash flutters either way, after the full thirty seconds', async () => {
    for (const released of ['pressed', 'slipped']) {
      const s = makeStory({ preset: 'p12_trial' });
      s.setTensionResult({ slips: released === 'pressed' ? 0 : 3, released });
      await s.enter(s.map, 'p12c4.trial');
      expect(s.tensions).toEqual(['thirty_second_trial']);
      expect(s.has('thirty_seconds_held')).toBe(true);
      expect(s.has('sash_fluttered')).toBe(true);
      expect(s.flagAt.thirty_seconds_held).toBeLessThan(s.flagAt.sash_fluttered);
      expect(s.session.story.getVar('trial_released')).toBe(released === 'pressed' ? 1 : 0);
      expect(s.session.story.getVar('trial_slips')).toBe(released === 'pressed' ? 0 : 3);
      const all = s.log.join('\n');
      if (released === 'slipped') expect(all).toMatch(/At thirty your fists won't open/);
      else expect(all).not.toMatch(/At thirty your fists won't open/);
      // The humiliation makes it worse; the storm complains.
      expect(all).toMatch(/OH, THE SHAME!/);
      expect(all).toMatch(/\.\.\.WORSE\./);
    }
  });
});

describe('The Grand Dice: an apparent six, then the beans, then three. Always the same, never random', () => {
  it('the normal die\'s six doesn\'t count; the real foam die rolls six (THREE MONTHS) and hops to three (ONE DAY)', async () => {
    const { s } = await playPhase12('first');
    expect(s.has('normal_die_six')).toBe(true);
    expect(s.flagAt.normal_die_six).toBeLessThan(s.flagAt.grand_dice_found);
    const rolls = s.dice.filter((d) => d.op === 'roll');
    expect(rolls).toEqual([expect.objectContaining({ result: 6, at: 'p12c10.roll' })]);
    const hops = s.dice.filter((d) => d.op === 'hop');
    expect(hops[hops.length - 1]).toMatchObject({ to: 3, at: 'p12c11.catch_3' });
    expect(s.session.story.getValue('grand_dice_apparent_result')).toBe('six_three_months');
    expect(s.session.story.getValue('grand_dice_final_result')).toBe('three_one_day');
    expect(s.flagAt.apparent_three_months).toBeLessThan(s.flagAt.one_day_betrayal);
    const all = s.log.join('\n');
    expect(all).toMatch(/^pete: THREE MONTHS!$/m);
    expect(all.indexOf('THREE MONTHS!')).toBeLessThan(all.lastIndexOf('ONE DAY'));
  });

  it('every roll in the data names its result; the die is data (faces, three is ONE DAY)', () => {
    const s = makeStory({ preset: 'p12_complete' });
    const scripts = JSON.stringify([...s.content.scripts.map.values()]);
    const rolls = scripts.match(/\{"dice":"roll"[^}]*\}/g) ?? [];
    expect(rolls.length).toBeGreaterThan(0);
    for (const r of rolls) expect(r).toMatch(/"result":\d/);
    const die = s.content.dice.require('grand_dice');
    expect(die.faces).toMatchObject({ 3: 'ONE DAY', 6: '3 MONTHS' });
  });
});

describe('The suspension: Garrick is just Garrick for one day', () => {
  it('is active, one day long, and counting down', async () => {
    const { s } = await playPhase12('first');
    expect(s.has('stenchmaster_suspension_active')).toBe(true);
    expect(s.session.story.getValue('stenchmaster_suspension_duration')).toBe('one_day');
    expect(s.session.story.getValue('garrick_title_state')).toBe('suspended');
    const hours = s.session.story.getVar('suspension_hours_left');
    expect(hours).toBeGreaterThan(0);
    expect(hours).toBeLessThan(24);
    expect(s.quest('the_suspension')).toBe('active');
  });

  it('his name, title, look and portrait follow it, from the moment the regalia comes off', () => {
    const before = makeStory({ preset: 'p12_one_day' });
    expect(resolveSpeaker(before.content, before.session, 'garrick').name).toBe('Grand Stenchmaster Garrick');
    const after = makeStory({ preset: 'p12_authenticity_whiff' });
    const sp = resolveSpeaker(after.content, after.session, 'garrick');
    expect(sp.name).toBe('Garrick');
    expect(sp.portrait).toBe('garrick_suspended');
    const npc = resolveVariant(after.content.npcs.require('garrick'), after.session);
    expect(npc).toMatchObject({ name: 'Garrick', title: 'Garrick (suspended)', appearance: 'garrick_suspended' });
    // Ids never change: quests, dialogue and saves still say "garrick".
    expect(npc.id).toBe('garrick');
  });

  it('the crew talk about him differently once the regalia is off (their suspension lines are the ones picked)', () => {
    const s = makeStory({ preset: 'p12_sash_wardrobe' });
    for (const id of ['pete', 'bob', 'jim', 'gristle', 'ned']) {
      const live = (s.content.npcs.require(id).dialogue ?? []).find((d) => !d.if || evaluateCondition(d.if, s.session));
      expect(JSON.stringify(live?.if ?? null), id).toMatch(/garrick_not_grand/);
    }
  });
});

describe('The sash goes into the captain\'s wardrobe, and stays there', () => {
  it('in his custody, out of his hands, leaking into his coats', async () => {
    const { s } = await playPhase12('first');
    expect(s.session.story.getValue('stenchmaster_sash_custody')).toBe('captains_wardrobe');
    expect(s.has('sash_in_wardrobe')).toBe(true);
    expect(s.session.inventory.count('stenchmaster_sash')).toBe(0);
    const cabin = s.content.maps.require('captains_quarters');
    const leak = cabin.props.find((p) => p.id === 'p12_wardrobe_leak');
    expect(evaluateCondition(leak.if, s.session)).toBe(true);
    // Nothing in Phase 12 takes it back out.
    const scripts = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => /^p1[23]/.test(id)).map(([, sc]) => sc));
    expect(scripts).not.toMatch(/"setValue":"stenchmaster_sash_custody","value":"(?!captains_wardrobe)/);
  });

  it('the authenticity whiff comes first, done by the captain', async () => {
    const { s } = await playPhase12('first');
    expect(s.flagAt.authenticity_whiff_done).toBeLessThan(s.flagAt.sash_in_wardrobe);
  });
});

describe('Story Phase 12 ends where the brief says: one day, the sash in the wardrobe, still inside the storm', () => {
  it('leaves the canonical end state', async () => {
    const { s } = await playPhase12('first');
    for (const f of ['stinkbeard_volunteered', 'old_sash_worse_than_beard', 'thirty_seconds_held', 'sash_fluttered', 'sash_flutter_humiliation_valid',
      'dice_clause_invoked', 'grand_dice_found', 'grand_dice_shipment_received', 'apparent_three_months', 'one_day_betrayal', 'regalia_removed',
      'authenticity_whiff_done', 'normal_breakfast_eaten', 'finger_crisis_seen']) expect(s.has(f), f).toBe(true);
    expect(s.session.story.getValue('sash_flutter_humiliation')).toBe('valid');
    expect(s.session.story.getValue('pocket_legend_book_condition')).toBe('loose_staple');
    expect(sharkstormNow(s.content, s.session)).toMatchObject({ id: 'inside_morning', distance: 'inside' });
    expect(s.session.story.getValue('queen_annes_revenge_location')).toBe('inside_great_sharkstorm');
    expect(s.has('treasure_room_sealed')).toBe(true);
    // Nobody pulled the finger. Nothing of Phase 13 has started.
    expect(s.log.join('\n')).not.toMatch(/^[a-z_]+: \(pulling (it|the finger)\)/m);
    for (const f of ['p13_started', 'stinkbeard_delirium', 'crew_quarters_reopened', 'second_ses_built']) expect(s.has(f), f).toBe(false);
  });

  it('each big moment happens exactly once, in order', async () => {
    const { s } = await playPhase12('first');
    const all = s.log.join('\n');
    const once = (re) => expect(s.log.filter((l) => re.test(l)).length, String(re)).toBe(1);
    once(/^captain: I'll do it\.$/);
    once(/^captain: \(through the wet cloth\) \.\.\.It's worse than my BEARD\.$/);
    once(/^garrick: Pre-waft, Captain\. Purely ceremonial\. Clearing the way\.$/);
    once(/^pete: \(pointing, gasping, exactly as rehearsed\) GASP!$/);
    once(/^pete: Morning, GARRICK\.$/);
    once(/^pete: Your wardrobe, Captain\.$/);
    once(/^garrick: Pete\. Pete\. Pull my finger\.$/);
    const order = ["I'll do it.", 'worse than my BEARD', 'Pre-waft, Captain', 'GASP!', 'It doesn\'t count. Oh, thank goodness', 'pete: THREE MONTHS!', 'Morning, GARRICK', 'Your wardrobe, Captain', 'Pull my finger'];
    const at = order.map((t) => all.indexOf(t));
    expect(at.every((i) => i >= 0), JSON.stringify(at)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });
});

describe('Story Phase 12 survives a save and load', () => {
  it('saved geared up before the trial, loaded, it plays on (the trial included) to the same end', async () => {
    const s = await startPhase12('first');
    await playUntil(s, STEPS12, 'volunteer.deck');
    const t = reloadStory(s);
    expect(t.session.inventory.count('wet_cloth')).toBe(1);
    await t.enter(t.map);
    await playToEndP12(t);
    for (const q of PHASE12_QUESTS) expect(t.quest(q), q).toBe('completed');
    expect(t.tensions).toEqual(['thirty_second_trial']);
    expect(t.session.story.getValue('grand_dice_final_result')).toBe('three_one_day');
  });

  it('saved during the suspension, loaded: still Garrick, still one day, the sash still in the wardrobe', async () => {
    const s = await startPhase12('first');
    await playUntil(s, STEPS12, 'normal_breakfast.parts');
    const t = reloadStory(s);
    expect(resolveSpeaker(t.content, t.session, 'garrick').name).toBe('Garrick');
    expect(t.has('stenchmaster_suspension_active')).toBe(true);
    expect(t.session.story.getValue('stenchmaster_sash_custody')).toBe('captains_wardrobe');
    expect(t.session.story.getVar('suspension_hours_left')).toBe(s.session.story.getVar('suspension_hours_left'));
    await t.enter(t.map);
    await playToEndP12(t);
    expect(t.has('p12_complete')).toBe(true);
  });

  it('a save from the end of Phase 11 (version 11) loads, migrates and is told where Phase 12 starts', async () => {
    const storage = new MemoryStorage();
    const p11 = makeStory({ preset: 'p11_complete' });
    expect(new SaveManager({ storage, content: p11.content, version: 11 }).save(2, p11.session).ok).toBe(true);
    const read = new SaveManager({ storage, content: p11.content }).read(2);
    expect(read.ok).toBe(true);
    const s = makeStory({ state: read.state });
    expect(s.has('stenchmaster_suspension_active')).toBe(false);
    expect(s.session.story.getValue('stenchmaster_sash_custody')).toBe(null);
    await s.enter('galley');
    expect(s.has('p12_ready_hint')).toBe(true);
    expect(s.has('p12_started')).toBe(false);
    await s.inspect('p12_start_bed');
    expect(s.has('p12_started')).toBe(true);
  });
});

describe('Story Phase 12 stays inside its brief', () => {
  const files = [
    'data/story/cutscenes/phase12', 'data/dialogue/phase12', 'data/npcs/phase12_crew.json', 'data/quests/phase12.json', 'data/items/phase12.json',
    'data/story/flags/phase12.json', 'data/story/triggers/phase12.json', 'data/maps/ship/phase12', 'data/story/vistas/phase12.json',
    'data/logs/phase12.json', 'data/props/phase12.json', 'data/characters/phase12.json', 'data/story/dice/phase12.json', 'data/story/tension/phase12.json',
  ];
  const text = files.flatMap((f) => {
    const p = path.resolve(f);
    const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)) : [p];
    return list.map((x) => fs.readFileSync(x, 'utf8'));
  }).join('\n');

  it('uses its own names (and none of the source\'s)', () => {
    for (const banned of [...BANNED_LIST, /nintendo/i, /\bwa+h+\b/i, /\bnado\b/i, /indiana/i, /fedora/i, /brograth/i]) expect(text).not.toMatch(banned);
    for (const name of ['Grand Dice of Grandness', 'Mexican jumping beans', 'Great Sharkstorm', 'Cheap-O-Rama']) expect(text, name).toMatch(new RegExp(name, 'i'));
  });

  it('the Bling Bling King never says a word in person; only on television', () => {
    const s = makeStory({ preset: 'p12_complete' });
    const scripts = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => /^p12/.test(id)).map(([, sc]) => sc));
    expect(scripts).not.toMatch(/"(bling_bling_king|megalodon|bbk)(\[[a-z]+\])?: /);
  });

  it('leaves Phase 13 alone: no delirium, no second set, the quarters still condemned, the sash stays put', () => {
    for (const banned of [/stench-o-vision/i, /mega-pack/i, /stenchmaster prime/i, /cardboard brogath/i, /two brogaths/i]) expect(text).not.toMatch(banned);
    const s = makeStory({ preset: 'p12_complete' });
    const scripts = JSON.stringify([...s.content.scripts.map.entries()].filter(([id]) => /^p12/.test(id)).map(([, sc]) => sc));
    for (const f of ['stinkbeard_delirium', 'crew_quarters_reopened', 'second_ses_built', 'revenge_out_of_sharkstorm', 'brogath_verified', 'stenchmaster_suspension_over']) {
      expect(scripts).not.toMatch(new RegExp(`"setFlag":"${f}"`));
    }
    const later = s.content.storyTriggers.list().filter((t) => JSON.stringify(t.if).includes('p12_complete') && !JSON.stringify(t.if).includes('notFlag'));
    expect(later).toEqual([]);
  });
});
