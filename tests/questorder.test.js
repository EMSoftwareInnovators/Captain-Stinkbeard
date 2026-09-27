import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/content/loadContent.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';
import { CommandRegistry, ScriptRunner } from '../src/systems/script/ScriptRunner.js';
import { createCommandImplementations } from '../src/systems/script/commands.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { makeSession } from './fixtures.js';

const content = loadContent();

/** A session on the real prologue content plus a script runner with silent services. */
function prologue() {
  const bus = new EventBus();
  const session = GameSession.newGame({ content, bus, strictFlags: true });
  const services = {
    dialogue: { say: async () => {}, choose: async () => 0, close: async () => {} },
    ui: { notify: async () => {} },
  };
  const runner = new ScriptRunner({ registry: new CommandRegistry().registerAll(createCommandImplementations()), getScript: (id) => content.scripts.get(id) });
  const ctx = { session, bus, services, wait: async () => {} };
  /** Talks to an NPC the way the world does: pick a script, run it, then announce the talk. */
  const talk = async (npcId) => {
    const npc = content.npcs.get(npcId);
    const entry = npc.dialogue.find((d) => !d.if || evaluateCondition(d.if, session));
    const script = entry.script ?? entry.cycle[0];
    await runner.run(script, ctx);
    bus.emit('npc:talked', { npc: npcId });
    return script;
  };
  const enter = (map) => {
    session.location = { map, x: 0, y: 0, facing: 'down' };
    session.world.visit(map);
    bus.emit('map:entered', { map });
  };
  const beat = (map, obj) => session.world.markDefeated(`${map}:${obj}`);
  return { session, bus, talk, enter, beat };
}

const RATS = ['rats_1', 'rats_2', 'rats_nest'];
const status = (s) => s.quests.status('rats_in_the_hold');
const obj = (s, id) => s.quests.objState('rats_in_the_hold', id);

describe('Rats in the Hold can be done in any order', () => {
  it('normal order: Quill, then the hold, then report', async () => {
    const g = prologue();
    g.session.quests.start('rats_in_the_hold');
    expect(await g.talk('quill')).toBe('quill.rats_brief');
    g.enter('cargo_hold');
    for (const r of RATS) g.beat('cargo_hold', r);
    expect(obj(g.session, 'clear_hold').done).toBe(true);
    expect(await g.talk('quill')).toBe('quill.rats_report');
    expect(status(g.session)).toBe('completed');
  });

  it('killing the rats before speaking to Quill still completes the quest', async () => {
    const g = prologue();
    g.session.quests.start('rats_in_the_hold'); // the galley argument starts it
    g.enter('cargo_hold');
    for (const r of RATS) g.beat('cargo_hold', r);
    expect(obj(g.session, 'clear_hold').done).toBe(true);
    // Quill acknowledges it and the quest wraps up in one conversation.
    expect(await g.talk('quill')).toBe('quill.rats_already_done');
    expect(status(g.session)).toBe('completed');
    expect(g.session.inventory.count('rat_catchers_charm')).toBe(1);
  });

  it('a save stuck the old way repairs itself on load', async () => {
    const g = prologue();
    g.session.quests.start('rats_in_the_hold');
    for (const r of RATS) g.beat('cargo_hold', r);
    // Simulate an old save: rats beaten, but the objective never counted.
    const state = g.session.serialize();
    state.quests.rats_in_the_hold.objectives.clear_hold = { progress: 0, done: false };
    state.location = { map: 'galley', x: 8, y: 8, facing: 'down' };
    const loaded = GameSession.fromState({ content, bus: new EventBus(), state, strictFlags: false });
    expect(loaded.quests.objState('rats_in_the_hold', 'clear_hold').done).toBe(true);
  });

  it('counts rats beaten one at a time, with progress', () => {
    const g = prologue();
    g.session.quests.start('rats_in_the_hold');
    const progress = [];
    g.bus.on('quest:objectiveProgress', (e) => progress.push(e.progress));
    g.beat('cargo_hold', 'rats_1');
    g.beat('cargo_hold', 'rats_2');
    expect(obj(g.session, 'clear_hold')).toEqual({ progress: 2, done: false });
    g.beat('cargo_hold', 'rats_nest');
    expect(obj(g.session, 'clear_hold').done).toBe(true);
    expect(progress).toEqual([1, 2, 3]);
  });
});

describe('QuestSystem event ordering', () => {
  it('one conversation never completes a chain of talk objectives', () => {
    const { session, bus } = makeSession();
    const q = session.quests;
    // Fixture quest "rounds": talk to mate, ..., then report to the same mate.
    q.start('rounds');
    bus.emit('object:inspected', { id: 'deck:wheel', tags: [] });
    bus.emit('map:entered', { map: 'galley' });
    bus.emit('npc:talked', { npc: 'mate' });
    // The first talk completes "talk"; "report" only just became available.
    expect(q.isObjectiveDone('rounds', 'talk')).toBe(true);
    expect(q.isObjectiveDone('rounds', 'report')).toBe(false);
    bus.emit('npc:talked', { npc: 'mate' });
    expect(q.isCompleted('rounds')).toBe(true);
  });
});
