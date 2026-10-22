import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * The ship's air in the real game (docs/gameplay-overhaul/11-atmosphere-and-ventilation.md):
 * the air demo (the air_demo debug preset: the end of Phase 17 in the crew
 * quarters, clean air, sealing supplies). The test starts each scene itself
 * with the demo's own steps (no chapter starts any), then plays it the way a
 * player would: the HUD line and the AIR meter, Respond (V, pad X), Check the
 * air, shutting doors, a seal on the real timing bar (a failure, then Try
 * again), a porthole opened from inside a sealed room, the captain's lungs
 * filling and clearing, the Ship page, a save mid-release and Continue.
 */
const AIR_A = [{ airSource: 'crew_quarters', substance: 'vapor', rate: 4, amount: 240, label: 'a cracked cask of pickling vinegar', source: 'e2e' }];
const AIR_B = [{ airConnection: 'washroom_door', state: 'sealed' }, { airAdd: 'washroom', substance: 'heavy_gas', pct: 30 }];
const AIR_C = [
  { airConnection: 'main_hatch', state: 'closed' },
  { airConnection: 'galley_door', state: 'closed' },
  { airAdd: 'galley', substance: 'smoke', pct: 50 },
  { airSource: 'galley', substance: 'smoke', rate: 6, seconds: 60, label: 'the smoking stove', source: 'e2e' },
];
const TO_WASHROOM = { transition: 'washroom', spawn: 'start', fade: 0, noAutosave: true };
const TO_QUARTERS = { transition: 'crew_quarters', x: 9, y: 7, facing: 'up', fade: 0, noAutosave: true };
const TO_GALLEY = { transition: 'galley', x: 10, y: 6, facing: 'left', fade: 0, noAutosave: true };
const TO_HOLD = { transition: 'cargo_hold', x: 14, y: 4, facing: 'down', fade: 0, noAutosave: true };

async function run(g, steps) {
  await g.eval((s) => {
    window.__e2eDone = false;
    window.__GAME__.game.scene.getScene('World').runScript(s).then(() => { window.__e2eDone = true; });
  }, steps);
  await g.waitFor(() => window.__e2eDone === true, null, 15000);
  await g.idle();
}
/** Moves the captain to another room (the world restarts on the way, so the script's promise is not waited on). */
async function go(g, step) {
  await g.eval((s) => {
    window.__GAME__.game.scene.getScene('World').runScript([s]);
  }, step);
  await g.waitFor((id) => window.__GAME__.game.scene.isActive('World') && window.__GAME__.game.scene.getScene('World').model?.id === id && !window.__GAME__.game.scene.getScene('World').leaving, step.transition, 15000);
  await g.wait(500);
  await g.idle();
}

const air = (g) => g.eval(() => {
  const a = window.__GAME__.app.session.ship.air;
  const pct = (room, sub) => a.airIn(room).subs.find((x) => x.id === sub)?.pct ?? 0;
  const rooms = Object.fromEntries(['crew_quarters', 'galley', 'washroom', 'main_deck', 'cargo_hold'].map((r) => [r, { total: a.airIn(r).total, quality: a.airIn(r).quality.id }]));
  return { rooms, vapor: { washroom: pct('washroom', 'vapor'), galley: pct('galley', 'vapor'), quarters: pct('crew_quarters', 'vapor') }, heavy: { washroom: pct('washroom', 'heavy_gas'), quarters: pct('crew_quarters', 'heavy_gas') }, links: { ...a.links }, sources: a.sources.length, exposure: a.exposure, stage: a.exposureNow().stage.id, serial: JSON.stringify(a.serialize()) };
});
const hud = (g) => g.eval(() => window.__GAME__.app.overlay.emergencyLine?.text.text ?? null);
const meter = (g) => g.eval(() => {
  const m = window.__GAME__.app.overlay.meter;
  return m && !m.hiding ? { label: m.labelText ?? 'FUMES', tag: m.tag.text, shown: m.shown !== false } : null;
});
const choices = (g) => g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu?.items.map((i) => i.label) ?? null);
const held = (g) => g.eval(() => Object.fromEntries(['planks', 'nails', 'rope', 'sailcloth'].map((m) => [m, window.__GAME__.app.session.inventory.count(m)])));
const hp = (g) => g.eval(() => window.__GAME__.app.session.party.members[0].hp);

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

/** Respond, then the choice matching `pick` (and first `group` when two lists are offered). Returns the labels of the last list. */
async function respond(g, pick, { respondKey, down, up, confirm }, group = null) {
  await respondKey();
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 5000);
  const choose = async (re) => {
    const labels = await choices(g);
    const target = labels.findIndex((l) => re.test(l));
    expect(target, `${re} in ${labels.join(' | ')}`).toBeGreaterThanOrEqual(0);
    for (let cur = await g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu.index); cur !== target; cur = await g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu.index)) await (cur < target ? down() : up());
    await confirm();
    return labels;
  };
  // Two lists (an emergency and the air here): the group first; one list: straight to it.
  if (group && (await choices(g)).some((l) => group.test(l))) {
    await choose(group);
    await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu && !(window.__GAME__.app.overlay.dialogue.choiceMenu.items ?? []).some((i) => i.label === 'Air and vents'), null, 5000);
  }
  return choose(pick);
}

/** Reads the dialogue lines on screen until the box closes. */
async function readAll(g, confirm) {
  const lines = [];
  for (let i = 0; i < 12; i++) {
    const t = await g.eval(() => {
      const d = window.__GAME__.app.overlay.dialogue;
      return d.resolveLine ? d.pageText ?? '' : null;
    });
    if (t === null) break;
    lines.push(t.replace(/\s+/g, ' '));
    await confirm();
  }
  return lines;
}

async function openShipPage(g, { open, up, down, confirm }) {
  await open();
  await g.waitFor(() => window.__GAME__.game.scene.isActive('Menu') && !!window.__GAME__.game.scene.getScene('Menu').nav, null, 10000);
  const target = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').nav.items.findIndex((i) => i.value === 'ship'));
  for (let cur = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').nav.index); cur !== target; cur = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').nav.index)) await (cur < target ? down() : up());
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

test('Containment with the keyboard: the HUD and the AIR meter, Check the air, shutting the doors, a seal failed and tried again; a save mid-release resumes on Continue @smoke @ui @world', async ({ page: browser }) => {
  test.setTimeout(300000);
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(browser);
  const keys = KEYS(g);
  await browser.goto('/');
  await g.preset('air_demo');
  await g.idle();
  // Clean air: no line, no meter, nothing to respond to.
  let st = await air(g);
  expect([st.sources, st.exposure, Object.keys(st.links)]).toEqual([0, 0, []]);
  expect(await hud(g)).toBe(null);
  await g.tap('KeyV', 50, 400);
  expect(await g.uiState()).toBe('idle');

  // A. The cask cracks: vapor pours into the quarters, and the room says so.
  await run(g, AIR_A);
  await g.waitFor(() => window.__GAME__.app.session.ship.air.airIn('crew_quarters').index > 0, null, 20000);
  await g.waitFor(() => /AIR Crew Quarters/.test(window.__GAME__.app.overlay.emergencyLine?.text.text ?? ''), null, 5000);
  expect(await meter(g)).toMatchObject({ label: 'AIR', shown: true });
  // Check the air: the room, its source, its openings, the rest of the ship, his lungs.
  await respond(g, /^Check the air$/, keys);
  const report = (await readAll(g, keys.confirm)).join(' / ');
  expect(report).toMatch(/Crew Quarters: (FOUL|TOXIC)/);
  expect(report).toMatch(/Source: a cracked cask of pickling vinegar/);
  expect(report).toMatch(/Openings: fore hatch open, galley door open, washroom door open, quarters porthole closed\./);
  expect(report).toMatch(/You: /);
  await g.idle();
  // Shut it in: the galley door and the washroom door, each a second's work.
  let labels = await respond(g, /^Close the galley door/, keys);
  expect(labels).toEqual(['Check the air', 'Close the fore hatch (2 s)', 'Close the galley door (1 s)', 'Close the washroom door (1 s)', 'Open the quarters porthole (2 s)', 'Leave it']);
  await g.idle(15000);
  await respond(g, /^Close the washroom door/, keys);
  await g.idle(15000);
  st = await air(g);
  expect(st.links).toEqual({ galley_door: { state: 'closed' }, washroom_door: { state: 'closed' } });
  // A while later: the quarters foul, the shut rooms next door kept clear of harm.
  await g.wait(12000);
  st = await air(g);
  expect(['foul', 'toxic', 'deadly']).toContain(st.rooms.crew_quarters.quality);
  expect(['clean', 'hazy']).toContain(st.rooms.washroom.quality);
  expect(['clean', 'hazy']).toContain(st.rooms.galley.quality);

  // E (part 1). Saved mid-release.
  expect(await g.eval(() => window.__GAME__.app.saves.save(1, window.__GAME__.app.session).ok)).toBe(true);
  const saved = await air(g);

  // E (part 2). Seal the galley door: three fumbles fail it (a nail wasted), Try again, cleanly.
  labels = await respond(g, /^Seal the galley door/, keys);
  expect(labels).toContain('Seal the galley door: 1 Sailcloth, 1 Nails');
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  expect((await barState(g)).title).toMatch(/SEAL THE GAPS/);
  const atBar = (await air(g)).serial;
  await fumble(g, 3, keys.hit);
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 10000);
  expect(await choices(g)).toEqual(['Try again', 'Carry on']);
  expect((await air(g)).serial).toBe(atBar); // no time passes on the bar or the choice
  expect((await held(g)).nails).toBe(9);
  await keys.confirm();
  for (let round = 0; round < 4; round++) {
    await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
    await hitUntilClosed(g, keys.hit);
    await g.wait(300);
    if (await g.eval(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu)) {
      await keys.confirm();
      continue;
    }
    break;
  }
  await g.idle(20000);
  st = await air(g);
  expect(st.links.galley_door).toEqual({ state: 'sealed' });
  expect(await held(g)).toMatchObject({ sailcloth: 5, nails: 8 });

  // The Ship page: the bad air in words, the captain's room's openings; Respond here.
  await openShipPage(g, keys);
  for (let i = 0; i < 8 && !/^hz:air:crew_quarters$/.test((await page(g)).selected ?? ''); i++) await keys.down();
  const p = await page(g);
  expect(p.selected).toBe('hz:air:crew_quarters');
  expect(p.detail).toMatch(/Open: fore hatch\. Shut: galley door, washroom door, porthole\./);
  expect(p.detail).toMatch(/Respond here/);
  expect(await meter(g)).toMatchObject({ shown: false }); // the AIR meter gives way to the menu
  await g.tap('KeyX', 45, 300);
  await g.tap('KeyX', 45, 600);
  await g.waitFor(() => !window.__GAME__.game.scene.isActive('Menu'), null, 5000);
  await g.idle();

  // E (part 3). Reload, Continue: the air as it was saved (the doors shut, not sealed), still pouring.
  await browser.reload();
  await g.titleChoose('continue');
  await g.idle();
  const back = await air(g);
  expect(back.links).toEqual(saved.links);
  expect(back.sources).toBe(saved.sources);
  expect(back.rooms.crew_quarters.total).toBeGreaterThan(0);
  expect(await held(g)).toMatchObject({ sailcloth: 6, nails: 10 });
  await g.waitFor(() => !!window.__GAME__.app.overlay.emergencyLine, null, 10000);
  expect(errors).toEqual([]);
});

test('Ventilation and exposure with the keyboard: the sealed washroom aired through its porthole; into the smoky galley, impaired, out, clear @ui @world', async ({ page: browser }) => {
  test.setTimeout(300000);
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(browser);
  const keys = KEYS(g);
  await browser.goto('/');
  await g.preset('air_demo');
  await g.idle();
  // B. The washroom sealed, full of heavy gas. In (holding his breath), open the porthole, out.
  await run(g, AIR_B);
  let st = await air(g);
  expect(st.links.washroom_door).toEqual({ state: 'sealed' });
  const start = st.heavy.washroom;
  expect(start).toBeCloseTo(30, 0);
  await go(g, TO_WASHROOM);
  const labels = await respond(g, /^Open the washroom porthole/, keys);
  expect(labels).toEqual(['Check the air', 'Unseal the washroom door (2 s)', 'Open the washroom porthole (2 s)', 'Leave it']);
  await g.idle(15000);
  await go(g, TO_QUARTERS);
  await g.wait(15000);
  st = await air(g);
  expect(st.heavy.washroom).toBeLessThan(start * 0.75);
  expect(st.heavy.quarters).toBe(0);

  // C. The galley shut, the stove smoking: in, until his lungs say impaired; he walks slower; out, and clear.
  await run(g, AIR_C);
  const before = await hp(g);
  await go(g, TO_GALLEY);
  await g.waitFor(() => ['impaired', 'dangerous', 'critical'].includes(window.__GAME__.app.session.ship.air.exposureNow().stage.id), null, 60000);
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').wade)).toBeGreaterThanOrEqual(1.2);
  expect(await meter(g)).toMatchObject({ label: 'AIR', tag: expect.stringMatching(/TOXIC|DEADLY|FOUL/) });
  await go(g, TO_QUARTERS);
  await g.waitFor(() => window.__GAME__.app.session.ship.air.exposure === 0, null, 60000);
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').wade)).toBe(1);
  expect(await hp(g)).toBe(before);
  expect(errors).toEqual([]);
});

test('Everything at once with a gamepad: X asks which first, the air list, the Ship page sends him to Respond @input', async ({ page: browser }) => {
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
  const [A, X, Y, UP, DOWN] = [0, 2, 3, 12, 13];
  const pad = {
    respondKey: () => press(X, 60, 500),
    open: () => press(Y, 60, 600),
    up: () => press(UP),
    down: () => press(DOWN),
    confirm: () => press(A, 60, 400),
    hit: () => press(A, 30, 40),
  };
  await browser.goto('/');
  await g.preset('air_demo');
  await g.idle();
  // D. A small fire in the quarters (smoky), the cask cracking, the hold breached.
  await run(g, [
    { shipDamage: 'hull_port', amount: 60, category: 'cannon', breach: true, scale: false, source: 'e2e' },
    { shipDamage: 'hull_port', amount: 10, category: 'cannon', breach: true, scale: false, source: 'e2e' },
    { ignite: 'crew_quarters', intensity: 20, spread: false, smoke: true, source: 'e2e' },
    ...AIR_A,
  ]);
  await g.wait(3000);
  // Respond (pad X): which first? The air: shut the galley door.
  await respond(g, /^Close the galley door/, pad, /^Air and vents$/);
  await g.idle(15000);
  expect((await air(g)).links.galley_door).toEqual({ state: 'closed' });
  // The fire, with sailcloth.
  await respond(g, /^Smother it with sailcloth/, pad, /^Fight the emergency$/);
  await g.idle(15000);
  expect(await g.eval(() => window.__GAME__.app.session.ship.hazards.fireIn('crew_quarters'))).toBe(null);
  // The Ship page (pad Y): the leak, the water, the air; A on the quarters' air: Respond, here.
  await openShipPage(g, pad);
  const p = await page(g);
  expect(p.rows.some((r) => /^Air: Crew Quarters (SMOKE|VAPOR) \d+% (FOUL|TOXIC|DEADLY)$/.test(r))).toBe(true);
  expect(p.rows.some((r) => /^Leak: Cargo Hold BREACH$/.test(r))).toBe(true);
  for (let i = 0; i < 10 && (await page(g)).selected !== 'hz:air:crew_quarters'; i++) await pad.down();
  expect((await page(g)).detail).toMatch(/Respond here/);
  await pad.confirm();
  await g.waitFor(() => !window.__GAME__.game.scene.isActive('Menu') && !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 10000);
  // The fire is out: only the air is left to answer here, so the air list comes straight up (two lists only when both are).
  expect(await choices(g)).not.toContain('Air and vents');
  const labels = await choices(g);
  for (let i = 0; i < labels.findIndex((l) => /^Open the quarters porthole/.test(l)); i++) await pad.down();
  await pad.confirm();
  await g.idle(15000);
  expect((await air(g)).links.quarters_porthole).toEqual({ state: 'open' });
  // Then the breach: down to the hold, patch it.
  await go(g, TO_HOLD);
  await respond(g, /^Patch the leak/, pad, /^Fight the emergency$/);
  for (let round = 0; round < 4; round++) {
    await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
    await hitUntilClosed(g, pad.hit);
    await g.wait(300);
    if (await g.eval(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu)) {
      await pad.confirm();
      continue;
    }
    await g.idle(20000);
    if ((await g.eval(() => window.__GAME__.app.session.ship.hazards.leaks[0].state)) === 'patched') break;
    await respond(g, /^Patch the leak/, pad, /^Fight the emergency$/);
  }
  expect(await g.eval(() => window.__GAME__.app.session.ship.hazards.leaks[0].state)).toBe('patched');
  expect(await g.eval(() => window.__GAME__.app.session.ship.destroyed)).toBe(false);
  expect(errors).toEqual([]);
});
