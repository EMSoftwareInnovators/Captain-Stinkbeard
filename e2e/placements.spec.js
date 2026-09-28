import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Live NPC placements: when a scene changes where the story has people,
 * they go there once it ends (walking over, in through a door or out of
 * one), with no reload. Garrick's report on the main deck moves half the
 * crew for the shark scenes that follow it.
 */

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

test('people the story moves walk to their new places when a scene ends', { tag: ['@world', '@phase3'] }, async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const g = new GameDriver(page);
  await g.waitFor(() => !!window.__GAME__?.app);
  await g.preset('ship_transformation');
  await g.skip();
  await g.travel(14, 3, 'main_deck').catch(() => {}); // already there from some presets
  await g.skip();
  expect((await g.state()).map).toBe('main_deck');
  const before = await g.eval(() => window.__GAME__.test.placements());

  await g.interact('garrick'); // the report, then the sharks
  await g.skip();
  await g.waitFor(() => window.__GAME__.test.placements().every((p) => !p.relocating), null, 30000);
  const after = await g.eval(() => window.__GAME__.test.placements());

  const moved = after.filter((p) => !same(p.want, before.find((b) => b.npc === p.npc)?.want));
  expect(moved.length).toBeGreaterThan(0);
  // The room now looks the way a reload would build it (people who roam aside).
  for (const p of after) if (!p.roams) expect(p.at, `${p.npc} should be at ${p.want}`).toEqual(p.want);
  expect(errors).toEqual([]);
});
