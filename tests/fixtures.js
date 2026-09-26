import { ContentDB } from '../src/content/ContentDB.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameSession } from '../src/systems/GameSession.js';

/** Minimal self-contained content set for system tests (independent of real game data). */
export function fixtureFiles() {
  return {
    '/data/game.json': {
      title: 'Test',
      constants: { ship: 'the Test' },
      newGame: { party: ['hero'], gold: 10, items: [{ id: 'biscuit', count: 2 }], map: 'room', x: 1, y: 1, facing: 'down' },
    },
    '/data/progression/leveling.json': { maxLevel: 10, totalXp: [0, 10, 30, 60, 100, 150, 210, 280, 360, 450] },
    '/data/characters/party.json': [
      {
        id: 'hero', name: 'Hero', aliases: ['captain'], portrait: 'hero',
        baseStats: { maxHp: 50, attack: 12, defense: 6, speed: 8, luck: 4 },
        growth: { maxHp: 6, attack: 2, defense: 1, speed: 1, luck: 0.5 },
        startEquipment: { weapon: 'sword' },
        learnset: [{ level: 1, ability: 'brace' }, { level: 3, ability: 'focus' }],
        battle: { attack: 'slash', resource: { id: 'command', name: 'Command', max: 5, start: 2, onDefend: 1, onTiming: { great: 1, perfect: 1 } } },
      },
    ],
    '/data/npcs/crew.json': [{ id: 'mate', name: 'First Mate', portrait: 'mate' }],
    '/data/portraits/test.json': [{ id: 'hero', expressions: ['neutral', 'angry'] }, { id: 'mate', expressions: ['neutral'] }],
    '/data/items/items.json': [
      { id: 'biscuit', name: 'Biscuit', type: 'consumable', value: 2, use: { target: 'ally', effects: [{ type: 'heal', amount: 10 }] } },
      { id: 'tonic', name: 'Tonic', type: 'consumable', value: 10, use: { target: 'ally', effects: [{ type: 'heal', percent: 50 }] } },
      { id: 'sword', name: 'Sword', type: 'equipment', slot: 'weapon', stats: { attack: 5 }, value: 30 },
      { id: 'axe', name: 'Axe', type: 'equipment', slot: 'weapon', stats: { attack: 8, speed: -1 }, value: 50 },
      { id: 'coat', name: 'Coat', type: 'equipment', slot: 'body', stats: { defense: 3, maxHp: 10 }, value: 40 },
      { id: 'key', name: 'Key', type: 'key', value: 0 },
    ],
    '/data/statuses/s.json': [
      { id: 'defending', name: 'Guarding', kind: 'buff', duration: 1, expires: 'turnStart', modifiers: { damageTaken: 0.5 } },
      { id: 'braced', name: 'Braced', kind: 'buff', duration: 3, modifiers: { defense: 1.5 } },
      { id: 'marked', name: 'Marked', kind: 'debuff', duration: 3, modifiers: { damageTaken: 1.5 } },
      { id: 'sick', name: 'Sick', kind: 'debuff', duration: 3, tick: { damagePercent: 10, min: 1 } },
    ],
    '/data/abilities/a.json': [
      { id: 'slash', name: 'Slash', kind: 'attack', target: 'enemy', power: 100, accuracy: 100, timing: 'strike' },
      { id: 'brace', name: 'Brace!', kind: 'order', target: 'allies', cost: { command: 1 }, effects: [{ type: 'applyStatus', status: 'braced' }] },
      { id: 'focus', name: 'Focus!', kind: 'order', target: 'enemy', cost: { command: 2 }, effects: [{ type: 'applyStatus', status: 'marked' }] },
      { id: 'bite', name: 'Bite', kind: 'attack', target: 'enemy', power: 100, accuracy: 100 },
      { id: 'squeal', name: 'Squeal', kind: 'summon', target: 'self', summon: 'rat', maxAllies: 3 },
    ],
    '/data/battle/timing.json': {
      strike: { type: 'impactPress', windows: { perfect: 40, great: 90, good: 150 }, multipliers: { perfect: 1.5, great: 1.3, good: 1.15, none: 1 } },
      guard: { type: 'guardPress', windows: { perfect: 50, good: 120 }, reduction: { perfect: 0.5, good: 0.75, none: 1 } },
    },
    '/data/enemies/e.json': [
      { id: 'rat', name: 'Rat', stats: { maxHp: 20, attack: 8, defense: 2, speed: 6, luck: 2 }, abilities: ['bite'], xp: 6, gold: [2, 4], drops: [{ item: 'biscuit', chance: 1 }] },
      { id: 'big_rat', name: 'Big Rat', stats: { maxHp: 40, attack: 10, defense: 4, speed: 5, luck: 2 }, abilities: ['bite', 'squeal'],
        ai: [{ ability: 'squeal', weight: 100, if: { alliesAliveBelow: 3 } }, { ability: 'bite', weight: 1 }], xp: 15, gold: 5 },
    ],
    '/data/encounters/e.json': [
      { id: 'two_rats', enemies: ['rat', 'rat'], tags: ['rats'], backdrop: 'hold', music: 'battle' },
      { id: 'boss', enemies: ['big_rat'], canFlee: false, tags: ['rats'], backdrop: 'hold', music: 'battle' },
    ],
    '/data/quests/q.json': [
      {
        id: 'rounds', title: 'Rounds', description: 'Do the rounds.',
        objectives: [
          { id: 'talk', text: 'Talk to the mate', type: 'talk', target: 'mate' },
          { id: 'look', text: 'Inspect the wheel', type: 'inspect', target: 'deck:wheel' },
          { id: 'visit', text: 'Visit the galley', type: 'visit', target: 'galley' },
          { id: 'report', text: 'Report back', type: 'talk', target: 'mate', after: ['talk', 'look', 'visit'] },
        ],
        rewards: { xp: 12, gold: 5, items: [{ id: 'tonic', count: 1 }], flags: ['rounds_done'] },
      },
      {
        id: 'rats', title: 'Rats', description: 'Kill rats.',
        objectives: [
          { id: 'kill', text: 'Defeat the rats', type: 'defeat', tag: 'rats', count: 2 },
          { id: 'fetch', text: 'Get the key', type: 'obtain', item: 'key', after: ['kill'] },
        ],
      },
    ],
    '/data/story/flags/test.json': [{ id: 'rounds_done' }, { id: 'met_mate' }, 'door_open'],
    '/data/dialogue/test.json': {
      'mate.hello': ['mate: Hello, Captain.', 'captain[angry]: What?'],
      'mate.branch': {
        start: [
          { if: { flag: 'met_mate' }, then: 'again', else: [{ setFlag: 'met_mate' }, 'mate: First time!'] },
          { end: true },
        ],
        again: ['mate: Again!'],
      },
    },
    '/data/maps/room.json': { id: 'room', name: 'Room', tileset: 'ship', legend: {}, tiles: [] },
  };
}

export function makeContent(extra = {}) {
  return new ContentDB({ ...fixtureFiles(), ...extra });
}

export function makeSession(content = makeContent()) {
  const bus = new EventBus();
  const session = GameSession.newGame({ content, bus, strictFlags: true });
  return { content, bus, session };
}
