import { describe, expect, it } from 'vitest';
import { placementChoices, placementChanges } from '../src/world/placements.js';
import { NpcBrain } from '../src/world/NpcBrain.js';

describe('NPC placements', () => {
  const objects = [
    { type: 'npc', id: 'bob_night', npc: 'bob', x: 3, y: 3, if: { flag: 'night' } },
    { type: 'npc', id: 'bob_gone', npc: 'bob', absent: true, if: { flag: 'bob_left' } },
    { type: 'npc', id: 'bob_day', npc: 'bob', x: 5, y: 5 },
    { type: 'npc', id: 'mags_night', npc: 'mags', x: 7, y: 2, if: { flag: 'night' } },
    { type: 'warp', id: 'door', x: 0, y: 0 },
  ];
  const pick = (session) => Object.fromEntries([...placementChoices(objects, session)].map(([k, o]) => [k, o?.id ?? null]));

  it('picks the first placement whose condition holds, per character', () => {
    const s = { story: new Set() }; // all conditions here need is a flag set
    expect(pick(s)).toEqual({ bob: 'bob_day', mags: null });
    s.story.add('night');
    expect(pick(s)).toEqual({ bob: 'bob_night', mags: 'mags_night' });
    s.story.delete('night');
    s.story.add('bob_left');
    expect(pick(s)).toEqual({ bob: null, mags: null });
  });

  it('reports who moved, arrived or left, and nothing for "elsewhere" to "elsewhere"', () => {
    const s = { story: new Set() }; // all conditions here need is a flag set
    const before = placementChoices(objects, s);
    s.story.add('night');
    const after = placementChoices(objects, s);
    expect(placementChanges(before, after).map((c) => [c.npc, c.from?.id ?? null, c.to?.id ?? null])).toEqual([
      ['bob', 'bob_day', 'bob_night'],
      ['mags', null, 'mags_night'],
    ]);
    const gone = [
      { type: 'npc', id: 'a', npc: 'x', absent: true, if: { flag: 'night' } },
      { type: 'npc', id: 'b', npc: 'x', absent: true },
    ];
    s.story.delete('night');
    const b1 = placementChoices(gone, s);
    s.story.add('night');
    expect(placementChanges(b1, placementChoices(gone, s))).toEqual([]);
  });
});

/** A 6x4 room with a wall at x=2 (y 0-2): a gap at the bottom. */
function fakeWorld() {
  const wall = new Set(['2,0', '2,1', '2,2']);
  const occupied = new Map();
  const world = {
    model: { width: 6, height: 4 },
    player: null,
    arrived: [],
    isBlocked: (x, y, self) => x < 0 || y < 0 || x >= 6 || y >= 4 || wall.has(`${x},${y}`) || (occupied.has(`${x},${y}`) && occupied.get(`${x},${y}`) !== self),
    warpAt: () => null,
    tryMoveActor(a, dir) {
      const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
      if (world.isBlocked(a.tx + v[0], a.ty + v[1], a)) return false;
      a.tx += v[0];
      a.ty += v[1];
      return true;
    },
    releaseSource() {},
    showEmote() {},
    relocated: (a, goal, opts = {}) => {
      world.arrived.push({ at: [a.tx, a.ty], goal, jump: !!opts.jump });
      return Promise.resolve();
    },
    occupied,
  };
  return world;
}

function fakeActor(x, y) {
  return { tx: x, ty: y, facing: 'down', moving: false, pose: 'idle', face(d) { this.facing = d; }, stopWalking() {}, playPose(p) { this.pose = p; } };
}

describe('NpcBrain relocation (the story moved someone)', () => {
  it('walks round walls to the new placement, then hands over and takes it up', async () => {
    const world = fakeWorld();
    const a = fakeActor(0, 0);
    const brain = new NpcBrain(world, a, { type: 'stand' }, () => 0.5);
    const done = brain.relocate({ x: 4, y: 0, placement: { id: 'p' } });
    for (let i = 0; i < 40 && brain.relocation; i++) brain.update(16);
    await done;
    expect([a.tx, a.ty]).toEqual([4, 0]);
    expect(world.arrived).toEqual([{ at: [4, 0], goal: expect.objectContaining({ x: 4, y: 0 }), jump: false }]);
    brain.takeUp({ behavior: { type: 'work' }, facing: 'left' });
    expect(brain.behavior.type).toBe('work');
    expect(brain.home).toEqual({ x: 4, y: 0, facing: 'left' });
    expect(a.pose).toBe('work');
  });

  it('waits on people in the way, then gives up walking (the world fades them over)', async () => {
    const world = fakeWorld();
    world.occupied.set('2,3', { id: 'captain' }); // standing in the only gap
    const a = fakeActor(0, 0);
    const brain = new NpcBrain(world, a, { type: 'stand' }, () => 0.5);
    const done = brain.relocate({ x: 4, y: 0 });
    for (let i = 0; i < 100; i++) brain.update(16);
    expect(world.arrived).toEqual([]); // still waiting after 1.6 s
    for (let i = 0; i < 150 && brain.relocation; i++) brain.update(16);
    await done;
    expect(world.arrived[0].jump).toBe(true);
  });

  it('a new relocation replaces the old one, and pausing holds it', async () => {
    const world = fakeWorld();
    const a = fakeActor(0, 3);
    const brain = new NpcBrain(world, a, { type: 'stand' }, () => 0.5);
    const first = brain.relocate({ x: 5, y: 3 });
    const second = brain.relocate({ x: 0, y: 0 });
    await first; // settled by the replacement
    brain.pause();
    brain.update(16);
    expect([a.tx, a.ty]).toEqual([0, 3]);
    brain.resume();
    for (let i = 0; i < 10 && brain.relocation; i++) brain.update(16);
    await second;
    expect([a.tx, a.ty]).toEqual([0, 0]);
  });
});
