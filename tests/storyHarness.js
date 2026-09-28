import { loadContent } from '../src/content/loadContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { CommandRegistry, ScriptRunner } from '../src/systems/script/ScriptRunner.js';
import { createCommandImplementations } from '../src/systems/script/commands.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { dueStoryTriggers, triggerKey } from '../src/systems/story/progress.js';
import { resolvePreset, applyPresetPlan } from '../src/debug/presets.js';
import { WorldState } from '../src/systems/world/WorldState.js';
import { StagingTracker } from './storyStaging.js';

/**
 * A headless story player shared by the story-phase tests: the real scripts,
 * quests, conditions and story triggers, with mock presentation services. It
 * walks the story the way a player would (enter a room, talk to someone,
 * inspect something, step on a trigger) and fails on any dead end: a script
 * error, a quest that can't advance, a trigger that loops, a locked door with
 * no way through.
 *
 *   makeStory({ pick: 'first' | 'last', preset: 'prologue_done' })
 */

class Transition {
  constructor(map, opts) {
    this.map = map;
    this.opts = opts;
  }
}

export function makeStory({ pick = 'first', preset = 'prologue_done' } = {}) {
  const content = loadContent();
  const bus = new EventBus();
  const session = GameSession.newGame({ content, bus, strictFlags: true });
  applyPresetPlan(session, resolvePreset(content, preset));
  const log = [];
  const choices = [];
  const opened = [];
  const flagAt = {};
  let repairScore = null;
  // Where in the dialogue log each flag was first set (to split one phase's lines from the next).
  bus.on('story:flagSet', ({ flag }) => { flagAt[flag] ??= log.length; });
  // Who stands where, scene by scene (see tests/storyStaging.js).
  const staging = new StagingTracker(content, session);
  const tracked = {
    spawn: (npc, opts) => staging.spawn(npc, opts),
    place: (id, x, y) => staging.place(id, x, y),
    despawn: (id) => staging.despawn(id),
    move: (id, opts) => staging.move(id, opts),
    fly: (id, opts) => staging.fly(id, { ...opts, land: opts?.land !== false }),
    setObjectVisible: (id, visible) => (visible ? staging.show(id) : staging.hide(id)),
    restage: () => staging.restage(),
  };
  const world = new Proxy({}, {
    get: (_t, name) => {
      if (name === 'transition') return (map, opts) => { throw new Transition(map, opts); };
      if (tracked[name]) return async (...args) => { tracked[name](...args); return null; };
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
    ui: {
      notify: async () => {},
      banner: async () => {},
      openShop: async () => {},
      openLog: async (id) => { opened.push(id); },
      // The hull-patch timing game: a clean run unless a test says otherwise.
      repair: async ({ strikes }) => (repairScore ?? strikes),
    },
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
    opened,
    flagAt,
    /** Sets how many clean strikes the next repair timing game scores. */
    setRepairScore(n) {
      repairScore = n;
    },
    get map() {
      return session.location.map;
    },
    has: (flag) => session.story.has(flag),
    quest: (id) => session.quests.status(id),

    staging,
    /** Staging problems found so far (see tests/storyStaging.js). */
    get stagingIssues() {
      return staging.issues;
    },

    /** Runs a script; a transition ends it and enters the next room. */
    async run(script) {
      busy += 1;
      let next = null;
      if (typeof script === 'string') staging.context = script;
      try {
        await runner.run(script, ctx);
      } catch (err) {
        if (!(err instanceof Transition)) throw err;
        next = err;
      } finally {
        busy -= 1;
      }
      if (next) await story.enter(next.map, next.opts.then, next.opts);
      else if (!busy) {
        staging.checkStanding();
        staging.checkNotBoxedIn();
      }
    },

    /** Arrives on a map: the transition's follow-up, then onEnter scripts, then triggers. */
    async enter(map, then = null, at = {}) {
      // Where the captain arrives: the transition's spot, else a preset's (same room).
      const prev = session.location;
      staging.enter(map, at.spawn || Number.isInteger(at.x) ? at : prev?.map === map ? prev : {});
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
        if (!due.length) {
          staging.restage();
          staging.idle(staging.context);
          return;
        }
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
      staging.checkPresent(npcId);
      staging.approachActor(npcId);
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
      staging.approach(obj.x, obj.y, obj.w ?? 1, obj.h ?? 1);
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
      staging.stepOn(obj.x, obj.y, obj.w ?? 1, obj.h ?? 1);
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
