import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/EventBus.js';
import { Rng, hash32 } from '../src/core/Rng.js';
import { checksum, formatPlayTime } from '../src/core/util.js';
import { StoryState } from '../src/systems/story/StoryState.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';
import { makeSession } from './fixtures.js';

describe('EventBus', () => {
  it('delivers, unsubscribes and supports once', () => {
    const bus = new EventBus();
    const got = [];
    const off = bus.on('x', (p) => got.push(p));
    bus.once('x', (p) => got.push(`once:${p}`));
    bus.emit('x', 1);
    bus.emit('x', 2);
    off();
    bus.emit('x', 3);
    expect(got).toEqual([1, 'once:1', 2]);
  });
});

describe('Rng', () => {
  it('is deterministic for a seed and stays in range', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 20 }, () => a.int(1, 6));
    const seqB = Array.from({ length: 20 }, () => b.int(1, 6));
    expect(seqA).toEqual(seqB);
    expect(seqA.every((n) => n >= 1 && n <= 6)).toBe(true);
    expect(hash32(1, 2)).toBe(hash32(1, 2));
    expect(hash32(1, 2)).not.toBe(hash32(2, 1));
  });
});

describe('util', () => {
  it('formats play time and checksums strings', () => {
    expect(formatPlayTime(3725)).toBe('1:02:05');
    expect(checksum('abc')).toBe(checksum('abc'));
    expect(checksum('abc')).not.toBe(checksum('abd'));
  });
});

describe('StoryState', () => {
  it('sets, clears and serializes flags and vars', () => {
    const bus = new EventBus();
    const events = [];
    bus.on('story:flagSet', (e) => events.push(e.flag));
    const story = new StoryState({ bus });
    story.set('a');
    story.set('a');
    expect(story.has('a')).toBe(true);
    story.setVar('rats', 2);
    story.addVar('rats', 3);
    const saved = story.serialize();
    const other = new StoryState();
    other.load(saved);
    expect(other.has('a')).toBe(true);
    expect(other.getVar('rats')).toBe(5);
    other.clear('a');
    expect(other.has('a')).toBe(false);
    expect(events).toEqual(['a']);
  });

  it('rejects undeclared flags in strict mode', () => {
    const story = new StoryState({ knownFlags: new Set(['ok']), strict: true });
    story.set('ok');
    expect(() => story.set('typo_flag')).toThrow(/Undeclared/);
  });
});

describe('conditions', () => {
  it('evaluates flags, quests, items, gold, vars and combinators', () => {
    const { session } = makeSession();
    session.story.set('met_mate');
    session.quests.start('rounds');
    expect(evaluateCondition({ flag: 'met_mate' }, session)).toBe(true);
    expect(evaluateCondition({ notFlag: 'met_mate' }, session)).toBe(false);
    expect(evaluateCondition({ questActive: 'rounds' }, session)).toBe(true);
    expect(evaluateCondition({ questNotStarted: 'rats' }, session)).toBe(true);
    expect(evaluateCondition({ objectiveActive: 'rounds.talk' }, session)).toBe(true);
    expect(evaluateCondition({ objectiveActive: 'rounds.report' }, session)).toBe(false);
    expect(evaluateCondition({ hasItem: { id: 'biscuit', count: 2 } }, session)).toBe(true);
    expect(evaluateCondition({ hasItem: 'key' }, session)).toBe(false);
    expect(evaluateCondition({ gold: { gte: 10 } }, session)).toBe(true);
    expect(evaluateCondition({ partyHas: 'hero' }, session)).toBe(true);
    session.story.setVar('n', 3);
    expect(evaluateCondition({ var: { name: 'n', gte: 3, lt: 4 } }, session)).toBe(true);
    expect(evaluateCondition({ any: [{ flag: 'door_open' }, { flag: 'met_mate' }] }, session)).toBe(true);
    expect(evaluateCondition({ not: { flag: 'met_mate' } }, session)).toBe(false);
    expect(evaluateCondition([{ flag: 'met_mate' }, { hasItem: 'biscuit' }], session)).toBe(true);
    expect(() => evaluateCondition({ bogus: 1 }, session)).toThrow(/Unknown condition/);
  });
});
