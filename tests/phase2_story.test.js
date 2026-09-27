import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/content/loadContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { CommandRegistry, ScriptRunner } from '../src/systems/script/ScriptRunner.js';
import { createCommandImplementations } from '../src/systems/script/commands.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { dueStoryTriggers, triggerKey, currentChapter } from '../src/systems/story/progress.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { WorldState } from '../src/systems/world/WorldState.js';

/**
 * Plays Story Phase 2 from the end of the prologue to "phase 2 complete"
 * with the real scripts, quests, conditions and story triggers, and mock
 * presentation services. It walks the story the way a player would (enter a
 * room, talk to someone, inspect something, step on a trigger) and fails on
 * any dead end: a script error, a quest that can't advance, a trigger that
 * loops, a locked door with no way through.
 */

class Transition {
  constructor(map, opts) {
    this.map = map;
    this.opts = opts;
  }
}

function makeStory({ pick = 'first' } = {}) {
  const content = loadContent();
  const bus = new EventBus();
  const session = GameSession.newGame({ content, bus, strictFlags: true });
  applyPresetPlan(session, resolvePreset(content, 'prologue_done'));
  const log = [];
  const choices = [];
  const world = new Proxy({}, {
    get: (_t, name) => {
      if (name === 'transition') return (map, opts) => { throw new Transition(map, opts); };
      return async () => null;
    },
  });
  const services = {
    dialogue: {
      say: async (line) => log.push(`${line.speaker ?? '-'}: ${line.text}`),
      choose: async ({ options }) => {
        if (choices.length) return choices.shift();
        return pick === 'last' ? options.length - 1 : 0;
      },
      close: async () => {},
      tutorial: async () => {},
    },
    ui: { notify: async () => {}, banner: async () => {}, openShop: async () => {} },
    audio: { sfx: () => {}, music: () => {}, ambience: () => {} },
    world,
    cinema: new Proxy({}, { get: () => async () => null }),
    battle: { start: async () => 'win' },
    saves: { autosave: () => {} },
  };
  const runner = new ScriptRunner({
    registry: new CommandRegistry().registerAll(createCommandImplementations()),
    getScript: (id) => content.scripts.get(id),
  });
  const ctx = { session, bus, content, services, wait: async () => {} };
  let busy = 0;

  const story = {
    content,
    session,
    log,
    choices,
    get map() {
      return session.location.map;
    },
    has: (flag) => session.story.has(flag),
    quest: (id) => session.quests.status(id),

    /** Runs a script; a transition ends it and enters the next room. */
    async run(script) {
      busy += 1;
      let next = null;
      try {
        await runner.run(script, ctx);
      } catch (err) {
        if (!(err instanceof Transition)) throw err;
        next = err;
      } finally {
        busy -= 1;
      }
      if (next) await story.enter(next.map, next.opts.then);
    },

    /** Arrives on a map: the transition's follow-up, then onEnter scripts, then triggers. */
    async enter(map, then = null) {
      session.location = { map, x: 1, y: 1, facing: 'down' };
      session.world.visit(map);
      bus.emit('map:entered', { map });
      if (then) {
        await story.run(then);
        if (session.location.map !== map) return;
      }
      for (const e of content.maps.require(map).onEnter ?? []) {
        if (!evaluateCondition(e.if, session)) continue;
        await story.run(e.script);
        if (session.location.map !== map) return;
      }
      await story.settle();
    },

    /** Runs due story triggers until none are left (a loop is a failure). */
    async settle() {
      if (busy) return;
      for (let n = 0; n < 12; n++) {
        const due = dueStoryTriggers(content.storyTriggers.list(), session, (id) => session.world.get(triggerKey(id), 'fired', false));
        if (!due.length) return;
        const t = due[0];
        session.world.set(triggerKey(t.id), 'fired', true);
        await story.run(t.script);
      }
      throw new Error('story triggers keep firing: one of them never falsifies its condition');
    },

    object(id) {
      const obj = (content.maps.require(story.map).objects ?? []).find((o) => o.id === id);
      if (!obj) throw new Error(`no object "${id}" on ${story.map}`);
      return obj;
    },

    /** Talks to an NPC (its dialogue selectors, like WorldScene.talkTo). */
    async talk(npcId) {
      const npc = content.npcs.require(npcId);
      let script = null;
      for (const entry of npc.dialogue ?? []) {
        if (!evaluateCondition(entry.if, session)) continue;
        if (entry.cycle) {
          const n = session.world.incrementCounter(`talk:${npcId}`) - 1;
          script = entry.cycle[n % entry.cycle.length];
        } else script = entry.script;
        break;
      }
      if (!script) throw new Error(`${npcId} has nothing to say here`);
      await story.run(script);
      bus.emit('npc:talked', { npc: npcId });
      await story.settle();
      return script;
    },

    /** Inspects a map object (its live `if` must hold). */
    async inspect(id) {
      const obj = story.object(id);
      if (obj.if && !evaluateCondition(obj.if, session)) throw new Error(`"${id}" can't be inspected right now`);
      let script = obj.script;
      if (!script && obj.dialogue) script = obj.dialogue.find((d) => evaluateCondition(d.if, session))?.script;
      if (script) await story.run(script);
      bus.emit('object:inspected', { id: `${story.map}:${id}`, tags: obj.tags ?? [] });
      await story.settle();
    },

    /** Steps on a trigger. */
    async trigger(id) {
      const obj = story.object(id);
      const key = WorldState.key(story.map, id);
      if (obj.once !== false && session.world.get(key, 'fired', false)) throw new Error(`trigger "${id}" already fired`);
      if (!evaluateCondition(obj.if, session)) throw new Error(`trigger "${id}" is not armed`);
      if (obj.once !== false) session.world.set(key, 'fired', true);
      await story.run(obj.script);
      await story.settle();
    },

    /** Walks through a door/hatch: locked ones play their "locked" script. Returns true if it opened. */
    async warp(id) {
      const obj = story.object(id);
      if (obj.if && !evaluateCondition(obj.if, session)) {
        if (obj.locked) await story.run(obj.locked);
        return false;
      }
      await story.enter(obj.to.map);
      return true;
    },
  };
  return story;
}

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

  // --- Chapter 4: the Guzzlegut Gust ------------------------------------------------
  await s.trigger('escape_door');
  expect(s.has('guzzlegut_gust')).toBe(true);
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
  expect(currentChapter(s.content.game, s.session).id).toBe('phase2_end');
  for (const q of ['tomorrows_heading', 'strange_cargo', 'new_recruit', 'treasure_inspection', 'yellow_alert', 'save_squawks', 'price_of_gold', 'yellow_defense']) {
    expect(s.quest(q), q).toBe('completed');
  }
  // Nothing fires again once the phase is over.
  await s.enter('main_deck');
  await s.talk('garrick');
  await s.talk('squawks');
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

  it('never names Wario or Stinkbeard-era story in Phase 2 lines', async () => {
    const story = makeStory();
    await playPhase2(story);
    const text = story.log.join('\n');
    for (const banned of [/wario/i, /nintendo/i, /stinkbeard/i, /stenchmaster/i, /sharkstorm/i, /stenchcaster/i, /frog grog/i, /brogath/i]) {
      expect(text).not.toMatch(banned);
    }
  });
});
