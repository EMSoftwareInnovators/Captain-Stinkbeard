import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Leaks, flooding and fire in the real game (docs/gameplay-overhaul/10-flooding-and-fire.md):
 * the emergency demo (the hazard_demo debug preset: the end of Phase 17, in
 * the cargo hold by the bilge pump, with supplies). The test starts each
 * emergency itself with the demo's own steps (no chapter starts one), then
 * plays it the way a player would: the HUD line, Respond (V, pad X), the
 * choice, the patch on the real timing bar (a failure, then Try again),
 * pumping on hazard time, buckets from the galley's cask, the Ship page,
 * a save mid-emergency and Continue.
 */

/** The demo's blows (data in src/debug/shipDebug.js): the same on every difficulty. */
const BREACH = (section) => [
  { shipDamage: section, amount: 60, category: 'cannon', breach: true, scale: false, source: 'e2e' },
  { shipDamage: section, amount: 10, category: 'cannon', breach: true, scale: false, source: 'e2e' },
];
const TO_GALLEY = { transition: 'galley', x: 10, y: 6, facing: 'left', fade: 0, noAutosave: true };
const TO_QUARTERS = { transition: 'crew_quarters', x: 9, y: 7, facing: 'up', fade: 0, noAutosave: true };
const TO_HOLD = { transition: 'cargo_hold', x: 14, y: 4, facing: 'down', fade: 0, noAutosave: true };

/** Moves the captain to another room (the world restarts on the way, so the script's promise is not waited on). */
async function go(g, step) {
  await g.eval((s) => {
    window.__GAME__.game.scene.getScene('World').runScript([s]);
  }, step);
  await g.waitFor((id) => window.__GAME__.game.scene.isActive('World') && window.__GAME__.game.scene.getScene('World').model?.id === id && !window.__GAME__.game.scene.getScene('World').leaving, step.transition, 15000);
  await g.wait(500);
  await g.idle();
}

/** Runs script steps in the world and waits for them. */
async function run(g, steps) {
  await g.eval((s) => {
    window.__e2eDone = false;
    window.__GAME__.game.scene.getScene('World').runScript(s).then(() => { window.__e2eDone = true; });
  }, steps);
  await g.waitFor(() => window.__e2eDone === true, null, 15000);
  await g.idle();
}

const hz = (g) => g.eval(() => {
  const h = window.__GAME__.app.session.ship.hazards;
  const hold = ['cargo_hold', 'treasure_hold', 'fart_free_zone'].reduce((n, r) => n + h.waterIn(r).units, 0);
  return { leaks: h.leaks.map((l) => ({ id: l.id, severity: l.severity, state: l.state, slowed: l.slowed })), water: { ...h.water }, hold, fires: h.fires.map((f) => ({ room: f.room, intensity: f.intensity })), buckets: h.buckets, time: h.time, active: h.active, working: h.working };
});
const hp = (g, s) => g.eval((id) => window.__GAME__.app.session.ship.section(id).hp, s);
const held = (g) => g.eval(() => Object.fromEntries(['planks', 'nails', 'rope', 'sailcloth'].map((m) => [m, window.__GAME__.app.session.inventory.count(m)])));
const hud = (g) => g.eval(() => {
  const e = window.__GAME__.app.overlay.emergencyLine;
  return e ? { text: e.text.text, shown: e.text.visible } : null;
});
const choices = (g) => g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu?.items.map((i) => i.label) ?? null);
const work = (g) => g.eval(() => window.__GAME__.app.overlay.workPanel?.parts.find((p) => p.text && /\S/.test(p.text))?.text ?? null);

const barState = (g) => g.eval(() => {
  const r = window.__GAME__.app.overlay.repairOpen;
  if (!r) return null;
  const onGreen = r.mark.x >= r.zone.x - 2 && r.mark.x <= r.zone.x + r.zone.width + 2;
  const offGreen = r.mark.x < r.zone.x - 14 || r.mark.x > r.zone.x + r.zone.width + 14;
  return { lock: r.lock, onGreen, offGreen, fumbles: r.fumbles, title: r.parts[1]?.text ?? null };
});
async function fumble(g, n, press) {
  for (let guard = 0; guard < 1200; guard++) {
    const st = await barState(g);
    if (!st || st.fumbles >= n) return;
    if (st.lock <= 0 && st.offGreen) await press();
    else await g.wait(16);
  }
}
async function hitUntilClosed(g, press) {
  for (let guard = 0; guard < 3000; guard++) {
    const st = await barState(g);
    if (!st) return;
    if (st.lock <= 0 && st.onGreen) await press();
    else await g.wait(12);
  }
}

/**
 * Respond (the `respond` press), then the choice whose label matches `pick`
 * (`nav` moves and confirms). Returns the labels offered.
 */
async function respond(g, pick, { respondKey, down, up, confirm }) {
  await respondKey();
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 5000);
  const labels = await choices(g);
  const target = labels.findIndex((l) => pick.test(l));
  expect(target, `${pick} in ${labels.join(' | ')}`).toBeGreaterThanOrEqual(0);
  for (let cur = await g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu.index); cur !== target; cur = await g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu.index)) {
    await (cur < target ? down() : up());
  }
  await confirm();
  return labels;
}

/** Pause menu → the Ship entry → into its list. */
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
const page = (g) => g.eval(() => {
  const p = window.__GAME__.game.scene.isActive('Menu') ? window.__GAME__.game.scene.getScene('Menu').page : null;
  if (!p?.menu) return null;
  return { selected: p.menu.selected?.value, rows: p.menu.items.map((i) => `${i.label} ${i.right}`), detail: p.detail.objects.map((o) => o.text.replace(/\n/g, ' ')).join(' | ') };
});

const KEYS = (g) => ({
  respondKey: () => g.tap('KeyV', 50, 500),
  open: () => g.tap('KeyC', 50, 600),
  up: () => g.tap('ArrowUp', 45, 150),
  down: () => g.tap('ArrowDown', 45, 150),
  confirm: () => g.tap('KeyZ', 45, 400),
  hit: () => g.tap('KeyZ', 30, 40),
});

/** Pumps (Respond > Pump) until the hold is dry. */
async function pumpDry(g, keys, max = 8) {
  for (let i = 0; i < max && (await hz(g)).hold > 0; i++) {
    await respond(g, /^Pump the bilge/, keys);
    await g.waitFor(() => !!window.__GAME__.app.overlay.workPanel, null, 5000);
    await g.idle(20000);
  }
}

test('A breach with the keyboard: the HUD, Respond, a failed patch and Try again, pumping dry; a save mid-emergency resumes on Continue @smoke @ui @world', async ({ page: browser }) => {
  test.setTimeout(240000);
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(browser);
  const keys = KEYS(g);
  await browser.goto('/');
  await g.preset('hazard_demo');
  await g.idle();
  // All clear: no emergency, no line, nothing to respond to.
  expect(await hz(g)).toMatchObject({ leaks: [], water: {}, fires: [], active: false });
  expect(await hud(g)).toBe(null);
  expect(await held(g)).toEqual({ planks: 8, nails: 10, rope: 4, sailcloth: 4 });
  await g.tap('KeyV', 50, 400);
  expect(await g.uiState()).toBe('idle'); // V with nothing going on: nothing

  // A. Cannon fire holes the port hull: a breach, water coming in on hazard time while the captain is free.
  await run(g, BREACH('hull_port'));
  const holed = await hp(g, 'hull_port');
  expect((await hz(g)).leaks).toMatchObject([{ severity: 'breach', state: 'open' }]);
  await g.waitFor(() => window.__GAME__.app.session.ship.hazards.waterIn('cargo_hold').units >= 9, null, 10000);
  await g.waitFor(() => !!window.__GAME__.app.overlay.emergencyLine, null, 5000);
  expect(await hud(g)).toMatchObject({ shown: true });
  expect((await hud(g)).text).toMatch(/WATER Cargo Hold \d+%  LEAK Cargo Hold|LEAK Cargo Hold/);

  // D (part 1). Saved mid-emergency.
  expect(await g.eval(() => window.__GAME__.app.saves.save(1, window.__GAME__.app.session).ok)).toBe(true);
  const saved = await hz(g);

  // Respond: what can be done here, in words. Patch it: the timing bar; three fumbles fail it.
  let labels = await respond(g, /^Patch the leak/, keys);
  expect(labels).toEqual(['Patch the leak (breach): 2 Planks, 2 Nails, 1 Sailcloth', 'Pump the bilge (6 s)', 'Bail (4 s)', 'Leave it']);
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  expect((await barState(g)).title).toMatch(/PATCH THE LEAK/);
  expect((await hud(g))?.shown ?? false).toBe(false); // the line gives way to the bar
  const timeAtBar = (await hz(g)).time;
  await fumble(g, 3, keys.hit);
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 10000);
  expect(await choices(g)).toEqual(['Try again', 'Carry on']);
  expect((await hz(g)).time).toBe(timeAtBar); // no hazard time passes on the bar or the choice
  expect((await hz(g)).leaks[0].state).toBe('open');
  expect((await held(g)).nails).toBe(9); // the failed try wasted a nail
  // Try again, cleanly: patched (or a rough patch, then again).
  await keys.confirm();
  for (let round = 0; round < 4; round++) {
    await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
    await hitUntilClosed(g, keys.hit);
    await g.wait(300);
    if (await g.eval(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu)) {
      await keys.confirm();
      continue;
    }
    // The patching takes its seconds after the bar (the work panel), then the result.
    await g.idle(20000);
    const st = await hz(g);
    if (st.leaks[0].state === 'patched') break;
    await respond(g, /^Patch the leak/, keys);
  }
  let st = await hz(g);
  expect(st.leaks).toMatchObject([{ state: 'patched' }]);
  expect(await hp(g, 'hull_port')).toBe(holed); // a patch closes the leak; it doesn't mend the hull
  expect(st.hold).toBeGreaterThan(0); // ... or remove the water

  // Pump it dry: Respond > Pump, on hazard time, the work panel showing.
  await respond(g, /^Pump the bilge/, keys);
  await g.waitFor(() => !!window.__GAME__.app.overlay.workPanel, null, 5000);
  expect(await work(g)).toMatch(/PUMP THE BILGE/i);
  await g.idle(20000);
  await pumpDry(g, keys);
  st = await hz(g);
  expect(st).toMatchObject({ hold: 0, active: false, working: false });
  await g.waitFor(() => !window.__GAME__.app.overlay.emergencyLine, null, 5000);
  expect(await g.eval(() => window.__GAME__.app.session.ship.destroyed)).toBe(false);

  // The Ship page: the patched leak waits for a hull repair.
  await openShipPage(g, keys);
  expect((await page(g)).rows.at(-1)).toBe('Leak: Cargo Hold PATCHED');
  await g.tap('KeyX', 45, 300);
  await g.tap('KeyX', 45, 600);
  await g.waitFor(() => !window.__GAME__.game.scene.isActive('Menu'), null, 5000);
  await g.idle();

  // D (part 2). Reload, Continue: the emergency as it was saved, and going on (the breach still open).
  await browser.reload();
  await g.titleChoose('continue');
  await g.idle();
  const back = await hz(g);
  expect(back.leaks).toEqual(saved.leaks);
  expect(back.hold).toBeGreaterThanOrEqual(saved.hold);
  expect(back.time).toBeGreaterThanOrEqual(saved.time);
  expect(back.working).toBe(false);
  await g.waitFor(() => !!window.__GAME__.app.overlay.emergencyLine, null, 5000);
  expect(await held(g)).toEqual({ planks: 8, nails: 10, rope: 4, sailcloth: 4 });
  // And it can be answered again: Respond, Leave it.
  labels = await respond(g, /^Leave it$/, keys);
  expect(labels[0]).toMatch(/^Patch the leak \(breach\)/);
  await g.idle();
  expect(errors).toEqual([]);
});

test('A fire with the keyboard: buckets from the galley cask, doused in the crew quarters, the damage stops, then a repair @ui @world', async ({ page: browser }) => {
  test.setTimeout(240000);
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(browser);
  const keys = KEYS(g);
  await browser.goto('/');
  await g.preset('hazard_demo');
  await g.idle();
  // B. A fire in the crew quarters, seen from the galley.
  await go(g, TO_GALLEY);
  await run(g, [{ ignite: 'crew_quarters', intensity: 35, source: 'e2e' }]);
  await g.waitFor(() => !!window.__GAME__.app.overlay.emergencyLine, null, 5000);
  expect((await hud(g)).text).toMatch(/FIRE Crew Quarters BURNING/);
  // The galley's water cask: fill the buckets (3 s).
  const labels = await respond(g, /^Fill the buckets/, keys);
  expect(labels).toEqual(['Fill the buckets (0/3, 3 s)', 'Leave it']);
  await g.idle(15000);
  expect((await hz(g)).buckets).toBe(3);
  // To the fire; it has been burning the bow.
  await go(g, TO_QUARTERS);
  const bowBefore = await hp(g, 'bow');
  for (let i = 0; i < 3 && (await hz(g)).fires.length; i++) {
    await respond(g, /^Douse the fire/, keys);
    await g.idle(15000);
  }
  let st = await hz(g);
  expect(st.fires).toEqual([]);
  expect(st.buckets).toBeLessThan(3);
  expect(await hp(g, 'bow')).toBeLessThanOrEqual(bowBefore);
  // Out: the damage stops.
  const bowOut = await hp(g, 'bow');
  expect(bowOut).toBeLessThan(await g.eval(() => window.__GAME__.app.content.ship.sections.bow.max));
  await g.wait(3000);
  expect(await hp(g, 'bow')).toBe(bowOut);
  await g.waitFor(() => !window.__GAME__.app.overlay.emergencyLine, null, 5000);
  // The repair (Pause > Ship > Bow), played cleanly.
  await openShipPage(g, keys);
  for (let i = 0; i < 6 && (await page(g)).selected !== 'bow'; i++) await keys.down();
  expect((await page(g)).detail).toMatch(/Repair/);
  await keys.confirm();
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  for (let round = 0; round < 4; round++) {
    await hitUntilClosed(g, keys.hit);
    await g.wait(300);
    if (!(await g.eval(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu))) break;
    await keys.confirm();
    await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  }
  await g.idle();
  expect(await hp(g, 'bow')).toBeGreaterThan(bowOut);
  st = await hz(g);
  expect(st.active).toBe(false);
  expect(errors).toEqual([]);
});

test('Both at once with a gamepad: X responds, the Ship page sends the captain to Respond, patch, douse at the cask, pump dry @input', async ({ page: browser }) => {
  test.setTimeout(300000);
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
  const [A, B, X, Y, UP, DOWN] = [0, 1, 2, 3, 12, 13];
  const pad = {
    respondKey: () => press(X, 60, 500),
    open: () => press(Y, 60, 600),
    up: () => press(UP),
    down: () => press(DOWN),
    confirm: () => press(A, 60, 400),
    hit: () => press(A, 30, 40),
  };
  await browser.goto('/');
  await g.preset('hazard_demo');
  await g.idle();
  // C. The galley burning and the hold breached.
  await run(g, [{ ignite: 'galley', intensity: 40, source: 'e2e' }, ...BREACH('hull_starboard')]);
  await g.waitFor(() => window.__GAME__.app.session.ship.hazards.waterIn('cargo_hold').units >= 6, null, 10000);
  // The Ship page (pad Y): every emergency in words. The fire is elsewhere (A buzzes); the water is here (A: Respond).
  await openShipPage(g, pad);
  let p = await page(g);
  expect(p.rows.slice(6)).toEqual([expect.stringMatching(/^Fire: Galley \d+% BURNING$/), expect.stringMatching(/^Water: Cargo Hold \d+% (DAMP|SHALLOW)$/), 'Leak: Cargo Hold BREACH']);
  for (let i = 0; i < 6; i++) await pad.down();
  p = await page(g);
  expect(p.detail).toMatch(/Go to the Galley to deal with it\./);
  await pad.confirm();
  expect(await g.eval(() => window.__GAME__.game.scene.isActive('Menu'))).toBe(true);
  await pad.down();
  expect((await page(g)).selected).toBe('hz:water:cargo_hold');
  expect((await page(g)).detail).toMatch(/Respond here/);
  await pad.confirm();
  await g.waitFor(() => !window.__GAME__.game.scene.isActive('Menu') && !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 10000);
  // Respond from the page: patch first (pad A on the bar).
  const target = (await choices(g)).findIndex((l) => /^Patch the leak/.test(l));
  for (let i = 0; i < target; i++) await pad.down();
  await pad.confirm();
  for (let round = 0; round < 4; round++) {
    await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
    await hitUntilClosed(g, pad.hit);
    await g.wait(300);
    if (await g.eval(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu)) {
      await pad.confirm();
      continue;
    }
    await g.idle(20000);
    if ((await hz(g)).leaks[0].state === 'patched') break;
    await respond(g, /^Patch the leak/, pad);
  }
  expect((await hz(g)).leaks).toMatchObject([{ state: 'patched' }]);
  // The fire, before it reaches the pump: the galley's cask is water to hand.
  await go(g, TO_GALLEY);
  for (let i = 0; i < 6 && (await hz(g)).fires.some((f) => f.room === 'galley'); i++) {
    await respond(g, /^Douse the fire \(water to hand/, pad);
    await g.idle(15000);
  }
  expect((await hz(g)).fires.filter((f) => f.room === 'galley')).toEqual([]);
  // If it spread, put that out too (the cask is still here, the buckets carry it).
  if ((await hz(g)).fires.length) {
    await respond(g, /^Fill the buckets/, pad);
    await g.idle(15000);
    for (const f of (await hz(g)).fires) {
      await go(g, f.room === 'cargo_hold' ? TO_HOLD : f.room === 'crew_quarters' ? TO_QUARTERS : TO_GALLEY);
      for (let i = 0; i < 3 && (await hz(g)).fires.some((x) => x.room === f.room); i++) {
        await respond(g, /^Douse the fire/, pad);
        await g.idle(15000);
      }
    }
  }
  expect((await hz(g)).fires).toEqual([]);
  // Back to the hold: pump it dry.
  await go(g, TO_HOLD);
  await pumpDry(g, pad);
  const st = await hz(g);
  expect(st).toMatchObject({ hold: 0, fires: [], active: false });
  expect(await g.eval(() => window.__GAME__.app.session.ship.destroyed)).toBe(false);
  await press(B, 60, 200);
  expect(errors).toEqual([]);
});
