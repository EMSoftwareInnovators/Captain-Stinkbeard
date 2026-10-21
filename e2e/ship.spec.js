import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Ship Integrity in the real game (docs/gameplay-overhaul/09-ship-integrity.md):
 * the isolated demo (the ship_demo debug preset: a whole ship, materials,
 * the crew quarters), damage started by the test itself (no chapter damages
 * the ship), the HUD badge, the pause menu's Ship page, a repair failed and
 * retried on the real timing bar, the materials spent, a refusal when the
 * hold is short, and the ship's condition kept by a save and Continue. With
 * the keyboard, and again with a stubbed gamepad (one press, one repair).
 */

/** Starts a script in the world without waiting for it; `window.__e2eDone` is set when it ends. */
function start(g, steps) {
  return g.eval((s) => {
    window.__e2eDone = false;
    window.__GAME__.game.scene.getScene('World').runScript(s).then(() => { window.__e2eDone = true; });
  }, steps);
}

const ship = (g) => g.eval(() => window.__GAME__.app.session.ship.serialize().sections);
const hold = (g) => g.eval(() => Object.fromEntries(['planks', 'nails', 'rope', 'sailcloth'].map((m) => [m, window.__GAME__.app.session.inventory.count(m)])));
const badge = (g) => g.eval(() => {
  const b = window.__GAME__.app.overlay.shipBadge;
  return b ? { text: b.text.text, shown: b.text.visible } : null;
});
const page = (g) => g.eval(() => {
  const m = window.__GAME__.game.scene.getScene('Menu');
  const p = window.__GAME__.game.scene.isActive('Menu') ? m.page : null;
  if (!p?.menu) return null;
  return { focused: p.focused, selected: p.menu.selected?.value, rows: p.menu.items.map((i) => `${i.label} ${i.right}`), detail: p.detail.objects.map((o) => o.text.replace(/\n/g, ' ')).join(' | ') };
});
const records = (g, id) => g.eval((i) => window.__GAME__.app.session.transient?.challengeLog?.records?.filter((r) => r.id === i).map((r) => ({ outcome: r.outcome, attempt: r.attempt, history: r.history.map((h) => h.outcome) })) ?? [], id);

const barState = (g) => g.eval(() => {
  const r = window.__GAME__.app.overlay.repairOpen;
  if (!r) return null;
  const onGreen = r.mark.x >= r.zone.x - 2 && r.mark.x <= r.zone.x + r.zone.width + 2;
  const offGreen = r.mark.x < r.zone.x - 14 || r.mark.x > r.zone.x + r.zone.width + 14;
  return { lock: r.lock, onGreen, offGreen, fumbles: r.fumbles, strict: r.bar.strict, title: r.title?.text ?? null };
});
/** Fumbles the open bar until `n` fumbles (or it closes). */
async function fumble(g, n, press) {
  for (let guard = 0; guard < 1200; guard++) {
    const st = await barState(g);
    if (!st || st.fumbles >= n) return;
    if (st.lock <= 0 && st.offGreen) await press();
    else await g.wait(16);
  }
}
/** Plays the open bar cleanly until it closes. */
async function hitUntilClosed(g, press) {
  for (let guard = 0; guard < 3000; guard++) {
    const st = await barState(g);
    if (!st) return;
    if (st.lock <= 0 && st.onGreen) await press();
    else await g.wait(12);
  }
}

/** Pause menu → the Ship entry → into its list, with `nav` (up/down/confirm presses). */
async function openShipPage(g, { open, up, down, confirm }) {
  await open();
  await g.waitFor(() => window.__GAME__.game.scene.isActive('Menu') && !!window.__GAME__.game.scene.getScene('Menu').nav, null, 10000);
  const target = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').nav.items.findIndex((i) => i.value === 'ship'));
  for (let cur = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').nav.index); cur !== target; cur = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').nav.index)) {
    await (cur < target ? down() : up());
  }
  await confirm();
  await g.waitFor(() => window.__GAME__.game.scene.getScene('Menu').page?.focused === true, null, 5000);
}

test('Ship Integrity with the keyboard: damage, inspect, repair (a failure, then a retry), refusal, save and Continue @smoke @ui @world', async ({ page: browser }) => {
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(browser);
  await browser.goto('/');
  await g.preset('ship_demo');
  await g.idle();
  // A healthy start: no badge, the materials in the hold.
  expect(await ship(g)).toEqual({ hull_port: 100, hull_starboard: 100, bow: 80, stern: 80, deck: 60, rigging: 60 });
  expect(await badge(g)).toBe(null);
  expect(await hold(g)).toEqual({ planks: 6, nails: 6, rope: 4, sailcloth: 2 });

  // Damage (the demo's shark): the toast and the badge say so in words.
  await start(g, [{ shipDamage: 'hull_port', amount: 40, category: 'shark', source: 'e2e' }]);
  await g.waitFor(() => window.__e2eDone === true, null, 10000);
  expect((await ship(g)).hull_port).toBe(60);
  await g.idle();
  expect(await badge(g)).toEqual({ text: 'SHIP 92%: 1 WORN (1 hit)', shown: true });

  // Inspect: Pause > Ship.
  const keys = { open: () => g.tap('KeyC', 50, 600), up: () => g.tap('ArrowUp', 45, 150), down: () => g.tap('ArrowDown', 45, 150), confirm: () => g.tap('KeyZ', 45, 400) };
  await openShipPage(g, keys);
  let p = await page(g);
  expect(p.selected).toBe('hull_port');
  expect(await badge(g)).toMatchObject({ shown: false }); // the menu covers the bottom-left
  expect(p.rows).toEqual(['Port hull 60% WORN', 'Starboard hull 100% HEALTHY', 'Bow 100% HEALTHY', 'Stern and rudder 100% HEALTHY', 'Main deck 100% HEALTHY', 'Mast and rigging 100% HEALTHY']);
  expect(p.detail).toMatch(/Port hull 60\/100 \(vital\)/);
  expect(p.detail).toMatch(/Keeps the sea out: WORKING/);
  expect(p.detail).toMatch(/Patch the hull: 2 Planks \(6\), 2 Nails \(6\)/);
  expect(p.detail).toMatch(/Repair \(4 tries\)/);
  // A whole section: Z only buzzes; the menu stays.
  await g.tap('ArrowDown', 45, 150);
  await g.tap('KeyZ', 45, 300);
  expect(await g.eval(() => window.__GAME__.game.scene.isActive('Menu'))).toBe(true);
  await g.tap('ArrowUp', 45, 150);

  // Repair: Z closes the menu and the timing bar opens. Three fumbles (Captain allows two): a failure.
  await g.tap('KeyZ', 45, 200);
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  const bar = await barState(g);
  expect(bar).toMatchObject({ strict: true, fumbles: 0 });
  expect(await badge(g)).toMatchObject({ shown: false }); // the badge gives way to the bar
  const key = () => g.tap('KeyZ', 30, 40);
  await fumble(g, 3, key);
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 10000);
  expect(await g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu.items.map((i) => i.label))).toEqual(['Try again', 'Carry on']);
  expect((await hold(g)).nails).toBe(5); // the failed try's nail is gone
  // Try again, and play it cleanly.
  await g.tap('KeyZ', 45, 300);
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  for (let round = 0; round < 3; round++) {
    await hitUntilClosed(g, key);
    if (await g.eval(() => !window.__GAME__.app.overlay.dialogue.choiceMenu && !window.__GAME__.app.overlay.repairOpen)) break;
    await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 10000);
    await g.tap('KeyZ', 45, 300);
    await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  }
  await g.idle();
  const rec = (await records(g, 'ship:hull_port:hull_patch')).at(-1);
  expect(rec.outcome === 'success' || rec.outcome === 'partial').toBe(true);
  expect(rec.history[0]).toBe('failure');
  const wasted = rec.history.filter((h) => h === 'failure').length;
  const after = await ship(g);
  expect(after.hull_port).toBe(rec.outcome === 'success' ? 95 : 78);
  expect(await hold(g)).toEqual({ planks: 4, nails: 6 - wasted - (rec.outcome === 'success' ? 2 : 3), rope: 4, sailcloth: 2 });

  // Not enough: down to one nail, the starboard hull holed. The page says so and Z changes nothing.
  await g.eval(() => {
    const inv = window.__GAME__.app.session.inventory;
    inv.remove('nails', inv.count('nails') - 1);
  });
  await start(g, [{ shipDamage: 'hull_starboard', amount: 30, category: 'cannon', source: 'e2e' }]);
  await g.waitFor(() => window.__e2eDone === true, null, 10000);
  await g.idle();
  const held = await hold(g);
  await openShipPage(g, keys);
  await g.tap('ArrowDown', 45, 150);
  p = await page(g);
  expect(p.selected).toBe('hull_starboard');
  expect(p.detail).toMatch(/Not enough materials: Nails 1\/3\./);
  await g.tap('KeyZ', 45, 300);
  expect(await g.eval(() => window.__GAME__.game.scene.isActive('Menu'))).toBe(true);
  expect(await g.eval(() => !!window.__GAME__.app.overlay.repairOpen)).toBe(false);
  expect(await hold(g)).toEqual(held);
  await g.tap('KeyX', 45, 300);
  await g.tap('KeyX', 45, 600);
  await g.waitFor(() => !window.__GAME__.game.scene.isActive('Menu'), null, 5000);
  await g.idle();

  // Save, reload, Continue: the same ship and the same hold.
  const before = { ship: await ship(g), hold: await hold(g) };
  expect(await g.eval(() => window.__GAME__.app.saves.save(1, window.__GAME__.app.session).ok)).toBe(true);
  await browser.reload();
  await g.titleChoose('continue');
  await g.idle();
  expect({ ship: await ship(g), hold: await hold(g) }).toEqual(before);
  expect((await badge(g)).text).toMatch(/^SHIP \d+%: [12] WORN \(2 hit\)$/);
  expect(await g.uiState()).toBe('idle');
  expect(errors).toEqual([]);
});

test('Ship Integrity with a gamepad: the pad opens the Ship page, one press starts one repair @input', async ({ page: browser }) => {
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  await browser.addInitScript(() => {
    const pad = { id: 'Test Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
    window.__pads = [pad];
    navigator.getGamepads = () => [pad, null, null, null];
  });
  const g = new GameDriver(browser);
  const press = async (button, ms = 60, after = 250) => {
    await browser.evaluate((b) => { window.__pads[0].buttons[b].pressed = true; window.__pads[0].buttons[b].value = 1; }, button);
    await browser.waitForTimeout(ms);
    await browser.evaluate((b) => { window.__pads[0].buttons[b].pressed = false; window.__pads[0].buttons[b].value = 0; }, button);
    await browser.waitForTimeout(after);
  };
  const A = 0;
  const Y = 3;
  const UP = 12;
  const DOWN = 13;
  await browser.goto('/');
  await g.preset('ship_demo');
  await g.idle();
  await start(g, [{ shipDamage: ['hull_port', 'rigging'], amount: 30, category: 'cannon', source: 'e2e' }]);
  await g.waitFor(() => window.__e2eDone === true, null, 10000);
  await g.idle();
  await openShipPage(g, { open: () => press(Y, 60, 600), up: () => press(UP), down: () => press(DOWN), confirm: () => press(A, 60, 400) });
  expect(await g.eval(() => window.__GAME__.app.input.device)).toBe('gamepad');
  const p = await page(g);
  expect(p.rows[0]).toBe('Port hull 62% WORN');
  // Two quick presses of A: one repair.
  await press(A, 40, 40);
  await press(A, 40, 200);
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  const tap = () => press(A, 30, 40);
  for (let round = 0; round < 4; round++) {
    await hitUntilClosed(g, tap);
    if (await g.eval(() => !window.__GAME__.app.overlay.dialogue.choiceMenu && !window.__GAME__.app.overlay.repairOpen)) break;
    await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 10000);
    await press(A);
    await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  }
  await g.idle();
  const recs = await records(g, 'ship:hull_port:hull_patch');
  expect(recs.length).toBe(1);
  expect(['success', 'partial']).toContain(recs[0].outcome);
  expect((await ship(g)).hull_port).toBeGreaterThan(62);
  expect(await g.eval(() => window.__GAME__.app.session.ship.isLocked('hull_port'))).toBe(false);
  expect(await g.uiState()).toBe('idle');
  expect(errors).toEqual([]);
});
