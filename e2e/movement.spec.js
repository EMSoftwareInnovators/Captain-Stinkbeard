import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Walking must feel snappy and even: a press in the facing direction moves
 * within a couple of frames, and a held direction advances a constant number
 * of pixels every frame (2 walking, 3 running) with no hitch at tile edges.
 */
async function sampleWhileHolding(page, key, ms, { run = false } = {}) {
  // Sample once per game update (what the player sees change each frame).
  await page.evaluate(() => {
    window.__samples = [];
    const w = window.__GAME__.game.scene.getScene('World');
    if (window.__sampler) w.events.off('postupdate', window.__sampler);
    const t0 = performance.now();
    window.__sampler = () => {
      window.__samples.push([performance.now() - t0, w.player.sprite.x, w.player.sprite.y - w.cameras.main.scrollY]);
    };
    w.events.on('postupdate', window.__sampler);
  });
  if (run) await page.keyboard.down('ShiftLeft');
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  if (run) await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    window.__GAME__.game.scene.getScene('World').events.off('postupdate', window.__sampler);
    window.__sampler = null;
    return window.__samples;
  });
}

function movingDeltas(samples) {
  const d = [];
  for (let i = 1; i < samples.length; i++) d.push(Math.abs(samples[i][1] - samples[i - 1][1]));
  const first = d.findIndex((v) => v > 0);
  let last = d.length - 1;
  while (last > first && d[last] === 0) last--;
  return { deltas: d.slice(first, last + 1), startMs: samples[first + 1]?.[0] ?? Infinity };
}

test('walking is responsive and moves at an even speed', async ({ page }) => {
  await page.goto('/');
  const g = new GameDriver(page);
  await g.newGame();
  await g.skip();
  await g.idle();
  // Face left without moving (a quick tap only turns), then walk left.
  await g.tap('ArrowLeft', 20, 250);
  expect((await g.state()).x).toBe(8);

  const walk = movingDeltas(await sampleWhileHolding(page, 'ArrowLeft', 700));
  expect(walk.startMs).toBeLessThan(70);
  const twos = walk.deltas.filter((v) => v === 2).length;
  expect(twos / walk.deltas.length).toBeGreaterThan(0.85);
  expect(Math.max(...walk.deltas)).toBeLessThanOrEqual(4);

  await g.tap('ArrowRight', 20, 250);
  const run = movingDeltas(await sampleWhileHolding(page, 'ArrowRight', 500, { run: true }));
  const threes = run.deltas.filter((v) => v === 3).length;
  expect(threes / run.deltas.length).toBeGreaterThan(0.8);
});
