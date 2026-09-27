import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Walking must feel immediate and even:
 * - a press in any direction (including a new one) moves on the next frame,
 * - a held direction advances a constant number of pixels every frame
 *   (2 walking, 3 running) with no hitch at tile edges,
 * - pressing the opposite way mid-step turns back at once.
 */
async function startSampling(page) {
  await page.evaluate(() => {
    window.__samples = [];
    const w = window.__GAME__.game.scene.getScene('World');
    if (window.__sampler) w.events.off('postupdate', window.__sampler);
    const t0 = performance.now();
    // Sample once per game update (what the player sees change each frame).
    window.__sampler = () => window.__samples.push([performance.now() - t0, w.player.sprite.x, w.player.sprite.y]);
    w.events.on('postupdate', window.__sampler);
  });
}

async function stopSampling(page) {
  return page.evaluate(() => {
    window.__GAME__.game.scene.getScene('World').events.off('postupdate', window.__sampler);
    window.__sampler = null;
    return window.__samples;
  });
}

async function hold(page, key, ms, { run = false } = {}) {
  if (run) await page.keyboard.down('ShiftLeft');
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  if (run) await page.keyboard.up('ShiftLeft');
}

/** Per-update |dx| from the first movement to the last. */
function movingDeltas(samples, axis = 1) {
  const d = [];
  for (let i = 1; i < samples.length; i++) d.push(Math.abs(samples[i][axis] - samples[i - 1][axis]));
  const first = d.findIndex((v) => v > 0);
  let last = d.length - 1;
  while (last > first && d[last] === 0) last--;
  return { deltas: d.slice(first, last + 1), startMs: samples[first + 1]?.[0] ?? Infinity };
}

test('walking is immediate, even, and reversible mid-step', async ({ page }) => {
  await page.goto('/');
  const g = new GameDriver(page);
  await g.newGame();
  await g.skip();
  await g.idle();
  expect((await g.state()).facing).toBe('down');

  // A new direction (left, while facing down) moves right away: no turn delay.
  await startSampling(page);
  await hold(page, 'ArrowLeft', 700);
  await page.waitForTimeout(400);
  const walk = movingDeltas(await stopSampling(page));
  expect(walk.startMs).toBeLessThan(40);
  expect(walk.deltas.filter((v) => v === 2).length / walk.deltas.length).toBeGreaterThan(0.85);
  expect(Math.max(...walk.deltas)).toBeLessThanOrEqual(4);

  // Running is an even 3 px per update.
  await startSampling(page);
  await hold(page, 'ArrowRight', 500, { run: true });
  await page.waitForTimeout(400);
  const run = movingDeltas(await stopSampling(page));
  expect(run.deltas.filter((v) => v === 3).length / run.deltas.length).toBeGreaterThan(0.8);
  await g.idle();

  // Reversal: start walking left, then press right mid-step.
  await startSampling(page);
  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => { const p = window.__GAME__.game.scene.getScene('World').player; return p.moving && p.moveT > 0.3 && p.moveT < 0.7; });
  const t0 = await page.evaluate(() => window.__samples.length);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(120);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(400);
  const samples = await stopSampling(page);
  const after = samples.slice(t0);
  const firstBack = after.findIndex((s, i) => i > 0 && s[1] > after[i - 1][1]);
  expect(firstBack).toBeGreaterThan(-1);
  expect(firstBack).toBeLessThanOrEqual(3);
  const end = await g.state();
  expect(Number.isInteger(end.x)).toBe(true);
  // The captain always comes to rest exactly on a tile.
  expect(samples[samples.length - 1][1] % 16).toBe(8);
});
