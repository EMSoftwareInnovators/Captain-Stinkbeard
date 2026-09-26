import { describe, expect, it } from 'vitest';
import { trackPress } from '../src/battle/timing/pressTracker.js';
import { guardPress } from '../src/battle/timing/guardPress.js';
import { makeSession } from './fixtures.js';
import { BattleEngine } from '../src/systems/battle/BattleEngine.js';
import { Rng } from '../src/core/Rng.js';

/** Minimal stand-in for a Phaser scene: a clock, frame hooks and input. */
function fakeScene({ autoTiming = null } = {}) {
  const hooks = new Set();
  let pressedNow = false;
  const scene = {
    time: { now: 0 },
    game: { app: { flags: { autoTiming } } },
    controls: {
      pressed: (a) => a === 'confirm' && pressedNow,
      consume: () => { pressedNow = false; },
    },
    addFrameHook: (fn) => hooks.add(fn),
    removeFrameHook: (fn) => hooks.delete(fn),
    /** Advances the clock frame by frame, pressing confirm on the frame nearest `pressAt`. */
    run(untilMs, pressAt = null) {
      for (let t = 0; t <= untilMs; t += 16) {
        scene.time.now = t;
        pressedNow = pressAt !== null && t >= pressAt && t < pressAt + 16;
        for (const h of [...hooks]) h();
      }
    },
    hookCount: () => hooks.size,
  };
  return scene;
}

describe('timed input', () => {
  it('reports the press offset from the impact moment', async () => {
    const scene = fakeScene();
    const p = trackPress(scene, { impactAt: 400, lockoutMs: 250, closeMs: 150 });
    scene.run(700, 416);
    const r = await p;
    expect(r.early).toBe(false);
    expect(r.delta).toBe(16);
    expect(scene.hookCount()).toBe(0);
  });

  it('treats very early presses as a whiff and ignores later ones', async () => {
    const scene = fakeScene();
    const p = trackPress(scene, { impactAt: 400, lockoutMs: 250, closeMs: 150 });
    scene.run(700, 96);
    expect(await p).toEqual({ delta: null, early: true });
  });

  it('closes the window when nothing is pressed', async () => {
    const scene = fakeScene();
    const p = trackPress(scene, { impactAt: 400, lockoutMs: 250, closeMs: 150 });
    scene.run(700);
    expect(await p).toEqual({ delta: null, early: false });
  });

  it('grades guard presses with the guard windows', async () => {
    const mechanic = { windows: { perfect: 55, good: 130 } };
    const cases = [[400, 'perfect'], [496, 'good'], [592, 'none']];
    for (const [pressAt, grade] of cases) {
      const scene = fakeScene();
      const p = guardPress.run(scene, { mechanic, impactAt: 400 });
      scene.run(800, pressAt);
      expect((await p).grade).toBe(grade);
    }
  });

  it('the debug auto-timing aid presses exactly on the impact', async () => {
    const scene = fakeScene({ autoTiming: 0 });
    const p = trackPress(scene, { impactAt: 400 });
    scene.run(700);
    expect(await p).toEqual({ delta: 0, early: false });
  });
});

describe('guarding in battle', () => {
  it('a perfect guard halves the damage of the same hit', () => {
    const hit = (guard) => {
      const { session, content } = makeSession();
      const engine = new BattleEngine({ content, session, encounterId: 'two_rats', rng: new Rng(99), advantage: 'ambush' });
      engine.start();
      const { actor } = engine.nextTurn();
      expect(actor.side).toBe('enemy');
      const { events } = engine.execute(actor, { type: 'ability', ability: 'bite', targets: [engine.party[0].uid] }, { guard });
      return events.find((e) => e.type === 'damage')?.amount ?? 0;
    };
    const full = hit('none');
    const guarded = hit('perfect');
    expect(full).toBeGreaterThan(0);
    expect(guarded).toBeLessThan(full);
    expect(guarded).toBeGreaterThanOrEqual(Math.floor(full / 2) - 1);
  });
});
