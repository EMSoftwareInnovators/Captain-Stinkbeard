import { describe, expect, it } from 'vitest';
import { makeSession } from './fixtures.js';
import { CommandRegistry, ScriptRunner } from '../src/systems/script/ScriptRunner.js';
import { createCommandImplementations } from '../src/systems/script/commands.js';
import { parseLine } from '../src/systems/script/parseLine.js';

function harness(choices = []) {
  const { session, bus, content } = makeSession();
  const said = [];
  const notes = [];
  const services = {
    dialogue: {
      say: async (line) => said.push(`${line.speaker ?? '-'}${line.expression ? `[${line.expression}]` : ''}: ${line.text}`),
      choose: async ({ options }) => {
        said.push(`? ${options.map((o) => o.text).join(' | ')}`);
        return choices.shift() ?? 0;
      },
      close: async () => {},
    },
    ui: { notify: async (n) => notes.push(n.kind) },
  };
  const registry = new CommandRegistry().registerAll(createCommandImplementations());
  const runner = new ScriptRunner({ registry, getScript: (id) => content.scripts.get(id) });
  const ctx = () => ({ session, bus, services, wait: async () => {} });
  return { session, bus, runner, said, notes, ctx };
}

describe('parseLine', () => {
  it('parses speaker, expression and narration', () => {
    expect(parseLine('hale: Hi.')).toEqual({ speaker: 'hale', expression: null, text: 'Hi.' });
    expect(parseLine('captain[angry]: No.')).toEqual({ speaker: 'captain', expression: 'angry', text: 'No.' });
    expect(parseLine('Rum.').speaker).toBe(null);
    expect(parseLine('Note: capital means narration').speaker).toBe(null);
  });
});

describe('ScriptRunner', () => {
  it('runs lines and branches on flags', async () => {
    const h = harness();
    await h.runner.run('mate.branch', h.ctx());
    await h.runner.run('mate.branch', h.ctx());
    expect(h.said).toEqual(['-: First time!'.replace('-', '-'), 'mate: Again!'].map((s, i) => (i === 0 ? 'mate: First time!' : s)));
    expect(h.session.story.has('met_mate')).toBe(true);
  });

  it('handles choices with goto, inline steps, conditions and state commands', async () => {
    const h = harness([1, 0]);
    const script = {
      start: [
        'mate: Choose.',
        {
          choice: [
            { text: 'Gold', then: [{ giveGold: 5 }] },
            { text: 'Item', then: [{ giveItem: 'tonic' }, { goto: 'after' }] },
            { text: 'Hidden', if: { flag: 'door_open' }, goto: 'never' },
          ],
        },
        'mate: unreachable',
      ],
      after: [{ choice: [{ text: 'Leave', end: true }, { text: 'Stay' }] }, 'mate: unreachable too'],
    };
    const result = await h.runner.run(script, h.ctx());
    expect(result).toBe('ended');
    expect(h.said).toEqual(['mate: Choose.', '? Gold | Item', '? Leave | Stay']);
    expect(h.session.inventory.count('tonic')).toBe(1);
    expect(h.notes).toEqual(['itemGained']);
  });

  it('starts quests, sets vars, guards steps and emits events', async () => {
    const h = harness();
    const events = [];
    h.bus.on('script:event', (e) => events.push(e.name));
    await h.runner.run(
      [
        { startQuest: 'rounds' },
        { completeObjective: 'rounds.look' },
        { addVar: 'count', value: 2 },
        { if: { var: { name: 'count', gte: 2 } }, event: 'counted' },
        { if: { flag: 'door_open' }, event: 'nope' },
        { if: { questActive: 'rounds' }, then: ['mate: Active.'] },
      ],
      h.ctx(),
    );
    expect(h.session.quests.isObjectiveDone('rounds', 'look')).toBe(true);
    expect(events).toEqual(['counted']);
    expect(h.said).toEqual(['mate: Active.']);
  });

  it('reports the script location of failures and stops infinite loops', async () => {
    const h = harness();
    await expect(h.runner.run({ start: [{ goto: 'missing' }] }, h.ctx())).rejects.toThrow(/no node "missing"/);
    await expect(h.runner.run({ start: [{ bogusCommand: 1 }] }, h.ctx())).rejects.toThrow(/Unknown script command/);
    await expect(h.runner.run({ start: [{ goto: 'start' }] }, h.ctx())).rejects.toThrow(/infinite/);
  });

  it('can abort a running script', async () => {
    const h = harness();
    const ctx = h.ctx();
    ctx.services.dialogue.say = async (line) => {
      h.said.push(line.text);
      ctx.aborted = true;
    };
    const res = await h.runner.run(['mate: one', 'mate: two'], ctx);
    expect(res).toBe('aborted');
    expect(h.said).toEqual(['one']);
  });
});
