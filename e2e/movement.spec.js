import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Walking must feel immediate and even:
 * - a press in any direction (including a new one) moves on the next frame,
 * - a held direction advances a constant number of pixels every frame
 *   (2 walking, 3 running) with no hitch at tile edges,
 * - pressing the opposite way mid-step turns back at once.
 *
 * Everything is measured in game updates, from when the key reaches the page,
 * so a busy test machine (late key delivery, long browser frames) can't pass
 * itself off as game lag or make real lag look fine.
 */
const WALK_PX_MS = 2 / (1000 / 60);
const RUN_PX_MS = 3 / (1000 / 60);

async function startSampling(page) {
  await page.evaluate(() => {
    window.__keyAt = null;
    const w = window.__GAME__.game.scene.getScene('World');
    // Where he stands before any key, so a move on the very first update shows.
    window.__samples = [[0, w.player.sprite.x, w.player.sprite.y, 0]];
    if (window.__sampler) w.events.off('postupdate', window.__sampler);
    if (window.__keyWatch) window.removeEventListener('keydown', window.__keyWatch, true);
    const t0 = performance.now();
    window.__keyWatch = (e) => { if (e.key.startsWith('Arrow') && window.__keyAt === null) window.__keyAt = performance.now() - t0; };
    window.addEventListener('keydown', window.__keyWatch, true);
    // Sample once per game update (what the player sees change each frame),
    // with the frame time the game moved by.
    window.__sampler = (time, delta) => window.__samples.push([performance.now() - t0, w.player.sprite.x, w.player.sprite.y, Math.min(delta, 50)]);
    w.events.on('postupdate', window.__sampler);
  });
}

async function stopSampling(page) {
  return page.evaluate(() => {
    window.__GAME__.game.scene.getScene('World').events.off('postupdate', window.__sampler);
    window.removeEventListener('keydown', window.__keyWatch, true);
    window.__sampler = null;
    window.__keyWatch = null;
    return { samples: window.__samples, keyAt: window.__keyAt };
  });
}

async function hold(page, key, ms, { run = false } = {}) {
  if (run) await page.keyboard.down('ShiftLeft');
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  if (run) await page.keyboard.up('ShiftLeft');
}

/**
 * From the first movement to the last: per-update |dx|, how many updates after
 * the key arrived the first movement came, and the worst gap between where the
 * captain is and where `pxPerMs` times the frame time says he should be.
 */
function analyse({ samples, keyAt }, pxPerMs, axis = 1) {
  const d = [];
  for (let i = 1; i < samples.length; i++) d.push(Math.abs(samples[i][axis] - samples[i - 1][axis]));
  const first = d.findIndex((v) => v > 0);
  let last = d.length - 1;
  while (last > first && d[last] === 0) last--;
  const deltas = d.slice(first, last + 1);
  const updatesToMove = samples.slice(0, first + 2).filter((s) => s[0] > keyAt).length;
  let moved = 0;
  let expected = 0;
  let drift = 0;
  // The last update may finish the tile early (it stops on the tile), so skip it.
  for (let i = first + 1; i < first + deltas.length; i++) {
    moved += d[i - 1];
    expected += pxPerMs * samples[i][3];
    drift = Math.max(drift, Math.abs(moved - expected));
  }
  return { deltas, updatesToMove, drift };
}

test('walking is immediate, even, and reversible mid-step', { tag: ['@smoke', '@world'] }, async ({ page }) => {
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
  const walk = analyse(await stopSampling(page), WALK_PX_MS);
  // Moves on the very first update after the key arrives.
  expect(walk.updatesToMove).toBe(1);
  // Never stalls mid-walk (a hitch at a tile edge shows up as a 0)...
  expect(walk.deltas).not.toContain(0);
  // ...keeps pace with the clock to within a pixel of rounding...
  expect(walk.drift).toBeLessThanOrEqual(1.5);
  // ...and on a steady 60 Hz frame that's 2 px.
  expect(walk.deltas.filter((v) => v === 2).length / walk.deltas.length).toBeGreaterThan(0.6);

  // Running is 3 px per update, just as even.
  await startSampling(page);
  await hold(page, 'ArrowRight', 500, { run: true });
  await page.waitForTimeout(400);
  const run = analyse(await stopSampling(page), RUN_PX_MS);
  expect(run.deltas).not.toContain(0);
  expect(run.drift).toBeLessThanOrEqual(1.5);
  expect(run.deltas.filter((v) => v === 3).length / run.deltas.length).toBeGreaterThan(0.6);
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
  const { samples } = await stopSampling(page);
  const after = samples.slice(t0);
  const firstBack = after.findIndex((s, i) => i > 0 && s[1] > after[i - 1][1]);
  expect(firstBack).toBeGreaterThan(-1);
  expect(firstBack).toBeLessThanOrEqual(3);
  const end = await g.state();
  expect(Number.isInteger(end.x)).toBe(true);
  // The captain always comes to rest exactly on a tile.
  expect(samples[samples.length - 1][1] % 16).toBe(8);
});
