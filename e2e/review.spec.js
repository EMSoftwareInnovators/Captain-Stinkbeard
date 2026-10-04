import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * The review fixes before Story Phase 9, in a real browser: sleepers are in
 * their hammocks (and people walk under them), a crowd can be squeezed
 * through and its people go back to their spots, and a timing bar can't be
 * won by hammering the button.
 */
async function open(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  const g = new GameDriver(page);
  await g.waitFor(() => !!window.__GAME__?.app);
  return { g, errors };
}

test('at night the crew are in their hammocks, and the captain walks under them', { tag: ['@review', '@world'] }, async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p8_sash_descends');
  await g.skip();
  const crew = await g.eval(() => {
    const w = window.__GAME__.game.scene.getScene('World');
    return [...w.actors.values()].filter((a) => a.npc && a.id !== 'squawks' && a.id !== 'pete').map((a) => ({ id: a.id, pose: a.pose, aloft: a.aloft, sling: !!a.sling }));
  });
  expect(crew.length).toBeGreaterThan(10);
  for (const c of crew) {
    expect(['hammock', 'hammock_awake'], c.id).toContain(c.pose);
    expect(c.aloft, c.id).toBe(true);
    expect(c.sling, c.id).toBe(true);
  }
  // Ned's hammock hangs over the floor: walk straight under it.
  const ned = await g.eval(() => { const a = window.__GAME__.game.scene.getScene('World').actors.get('ned'); return [a.tx, a.ty]; });
  await g.goto(ned[0], ned[1]);
  expect(await g.eval(() => { const w = window.__GAME__.game.scene.getScene('World'); return [w.player.tx, w.player.ty]; })).toEqual(ned);
  expect(errors).toEqual([]);
});

test('pushing into a crowd squeezes past, and they go back to their spot', { tag: ['@review', '@world'] }, async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p8_lower_hull_shelter');
  await g.skip();
  // Stand next to someone sitting on open floor, facing them.
  const setup = await g.eval(() => {
    const w = window.__GAME__.game.scene.getScene('World');
    const dirs = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const a of w.actors.values()) {
      if (!a.npc || a.blocks || a.lying || a.moving) continue;
      for (const [dir, [dx, dy]] of Object.entries(dirs)) {
        const x = a.tx - dx;
        const y = a.ty - dy;
        if (w.isBlocked(x, y) || w.warpAt(x, y)) continue;
        w.putActor(w.player, { x, y });
        w.player.face(dir);
        return { id: a.id, home: [a.tx, a.ty], from: [x, y], key: { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' }[dir] };
      }
    }
    return null;
  });
  expect(setup).not.toBeNull();
  // Push until through (a moment's push), then let go.
  await page.keyboard.down(setup.key);
  const through = () => g.eval((home) => { const p = window.__GAME__.game.scene.getScene('World').player; return p.tx === home[0] && p.ty === home[1]; }, setup.home);
  for (let t = 0; t < 60 && !(await through()); t++) await g.wait(25);
  await page.keyboard.up(setup.key);
  await g.wait(300);
  const after = await g.eval((id) => { const w = window.__GAME__.game.scene.getScene('World'); const a = w.actors.get(id); return { player: [w.player.tx, w.player.ty], npc: [a.tx, a.ty] }; }, setup.id);
  expect(after.player).toEqual(setup.home); // through
  // Step away; they go back where they were.
  await g.goto(setup.home[0] + (setup.home[0] > 10 ? -3 : 3), setup.home[1]);
  await g.waitFor(({ id, home }) => { const a = window.__GAME__.game.scene.getScene('World').actors.get(id); return a.tx === home[0] && a.ty === home[1]; }, { id: setup.id, home: setup.home }, 10000).catch(() => {});
  const back = await g.eval((id) => { const a = window.__GAME__.game.scene.getScene('World').actors.get(id); return [a.tx, a.ty]; }, setup.id);
  expect(back).toEqual(setup.home);
  expect(errors).toEqual([]);
});

test('a timing bar is a skill check: mashing fumbles, waiting for the green earns XP', { tag: ['@review', '@ui'] }, async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  const { g, errors } = await open(page);
  await g.preset('p8_complete');
  await g.skip();
  const xp0 = await g.eval(() => window.__GAME__.app.session.party.leader().xp);
  // Hammer the button: fumbles, and nowhere near done.
  await g.eval(() => { window.__mashed = window.__GAME__.app.overlay.repair({ kind: 'hull', strikes: 3 }); return 1; });
  await g.wait(300);
  for (let i = 0; i < 12; i++) await g.tap('KeyZ', 20, 30);
  const mid = await g.eval(() => { const r = window.__GAME__.app.overlay.repairOpen; return r && { fumbles: r.fumbles ?? 0, done: r.done, skill: r.skill?.label }; });
  expect(mid.fumbles).toBeGreaterThan(0);
  expect(mid.done).toBeLessThan(3);
  expect(['MUSCLE']).toContain(mid.skill);
  // Finish properly.
  for (let i = 0; i < 2000 && (await g.eval(() => !!window.__GAME__.app.overlay.repairOpen)); i++) await g.repairTick();
  // A clean one: three clean strikes, a little XP.
  await g.eval(() => { window.__GAME__.app.overlay.repair({ kind: 'knot', strikes: 3 }); return 1; });
  await g.wait(300);
  for (let i = 0; i < 2000 && (await g.eval(() => !!window.__GAME__.app.overlay.repairOpen)); i++) await g.repairTick();
  const xp1 = await g.eval(() => window.__GAME__.app.session.party.leader().xp);
  expect(xp1).toBeGreaterThan(xp0);
  expect(errors).toEqual([]);
});
