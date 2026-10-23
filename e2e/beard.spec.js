import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Stink Beard Saturation in the real game (docs/gameplay-overhaul/13-beard-saturation.md):
 * the beard demo (the beard_demo debug preset: the end of Phase 17 in the
 * crew quarters, the washroom next door, sailcloth, the beard wrap, the wet
 * cloth and the goggles). Each test switches the system on with the demo's
 * own steps (no chapter does), then plays it the way a player would: the
 * HUD line, Respond (V, pad X), looking at and sniffing the beard, rinsing
 * it at the washroom tub, a scrub on the real timing bar (failed, then Try
 * again), the overload countdown saved and continued, wringing it out in
 * time, and paranoia's visions, always marked (?), never on the HUD line.
 */
const SCENARIO_A = [
  { beardSaturation: true },
  { beardClean: true },
  { airSource: 'crew_quarters', substance: 'smoke', rate: 6, seconds: 90, label: 'a smouldering hammock', source: 'debug' },
];
const SCENARIO_C = [{ beardSaturation: true }, { beardClean: true }, { beardAdd: 'smoke', amount: 55 }, { beardAdd: 'vapor', amount: 50 }];
const SCENARIO_D = [{ beardSaturation: true }, { beardClean: true }, { beardAdd: 'vapor', amount: 26 }, { beardAdd: 'heavy_gas', amount: 18 }, { beardAdd: 'stench_residue', amount: 8 }, { beardStatus: 'hornet_nested' }];
const SCENARIO_E = [{ beardSaturation: true }, { beardClean: true }, { beardAdd: 'test_musk', amount: 14 }];
const TO_TUB = { transition: 'washroom', x: 7, y: 6, facing: 'up', fade: 0, noAutosave: true };

async function run(g, steps) {
  await g.eval((s) => {
    window.__e2eDone = false;
    window.__GAME__.game.scene.getScene('World').runScript(s).then(() => { window.__e2eDone = true; });
  }, steps);
  await g.waitFor(() => window.__e2eDone === true, null, 30000);
  await g.idle();
}
async function go(g, step) {
  await g.eval((s) => {
    window.__GAME__.game.scene.getScene('World').runScript([s]);
  }, step);
  await g.waitFor((id) => window.__GAME__.game.scene.isActive('World') && window.__GAME__.game.scene.getScene('World').model?.id === id && !window.__GAME__.game.scene.getScene('World').leaving, step.transition, 15000);
  await g.wait(500);
  await g.idle();
}

const beard = (g) => g.eval(() => {
  const b = window.__GAME__.app.session.ship.beard;
  const i = b.info();
  return { on: i.on, total: i.total, pct: i.shown, stage: i.stage, phase: i.phase, left: i.left, statuses: i.statuses.map((s) => s.id), count: b.count, serial: JSON.stringify(b.serialize()) };
});
const hud = (g) => g.eval(() => window.__GAME__.app.overlay.emergencyLine?.text.text ?? null);
const choices = (g) => g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu?.items.map((i) => i.label) ?? null);
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
async function playOut(g, { confirm, hit }) {
  for (let round = 0; round < 4; round++) {
    await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
    await hitUntilClosed(g, hit);
    await g.wait(300);
    if (await g.eval(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu)) {
      await confirm();
      continue;
    }
    break;
  }
}
async function choose(g, re, { down, up, confirm }) {
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 5000);
  const labels = await choices(g);
  const target = labels.findIndex((l) => re.test(l));
  expect(target, `${re} in ${labels.join(' | ')}`).toBeGreaterThanOrEqual(0);
  for (let cur = await g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu.index); cur !== target; cur = await g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu.index)) await (cur < target ? down() : up());
  await confirm();
  return labels;
}
/** Respond, "Your beard" when more than one kind of trouble is offered, then the action. Returns [groups, actions]. */
async function respond(g, pick, keys) {
  await keys.respondKey();
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 5000);
  let groups = null;
  if ((await choices(g)).includes('Your beard')) {
    groups = await choose(g, /^Your beard$/, keys);
    await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu && !window.__GAME__.app.overlay.dialogue.choiceMenu.items.some((i) => i.label === 'Your beard'), null, 5000);
  }
  return [groups, await choose(g, pick, keys)];
}
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
/** Records every toast's text from now on (window.__toasts). */
const watchToasts = (g) => g.eval(() => {
  const t = window.__GAME__.app.overlay.toasts;
  window.__toasts = [];
  const push = t.push.bind(t);
  t.push = (o) => {
    window.__toasts.push(o.text);
    return push(o);
  };
});

const KEYS = (g) => ({
  respondKey: () => g.tap('KeyV', 50, 500),
  up: () => g.tap('ArrowUp', 45, 150),
  down: () => g.tap('ArrowDown', 45, 150),
  confirm: () => g.tap('KeyZ', 45, 400),
  hit: () => g.tap('KeyZ', 30, 40),
});

test('the beard with the keyboard: smoke fills it, the HUD names it; look, sniff, then rinse it at the washroom tub; reduced effects hide no warning @smoke @ui @world', async ({ page: browser }) => {
  test.setTimeout(300000);
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(browser);
  const keys = KEYS(g);
  await browser.goto('/');
  await g.preset('beard_demo');
  await g.idle();
  // Off: no line, nothing to respond to, nothing in it.
  expect(await hud(g)).toBe(null);
  expect((await beard(g)).on).toBe(false);
  await g.tap('KeyV', 50, 400);
  expect(await g.uiState()).toBe('idle');

  // A. Smoke pours in; a minute of it later the beard is saturated, in words on the HUD.
  await run(g, [...SCENARIO_A, { hazardClock: 60 }]);
  const a = await beard(g);
  expect(a.on).toBe(true);
  expect(a.pct).toBeGreaterThanOrEqual(35);
  // The beard first on the line (it is his own, always here), the worst of the air after it.
  await g.waitFor(() => /^! BEARD (\d+% (SATURATED|HEAVILY SATURATED)|CRITICAL PURGE RISK)/.test(window.__GAME__.app.overlay.emergencyLine?.text.text ?? ''), null, 5000);
  // Look at it: how full, what it smells of (broadly), how well it protects, what helps.
  let [groups, actions] = await respond(g, /^Look at your beard$/, keys);
  expect(groups).toEqual(['Air and vents', 'Your beard', 'Leave it']);
  // Not at the tub: rinse and scrub are offered greyed (Respond says why if picked).
  expect(actions.slice(0, 5).map((l) => l.replace(/<[^>]*>/g, ''))).toEqual(['Look at your beard', 'Sniff your beard', expect.stringMatching(/^Wring it out, here \(\d s\)$/), expect.stringMatching(/^Rinse the beard \(\d+ s\)$/), 'Scrub the beard: 1 Sailcloth']);
  expect(actions).toEqual(expect.arrayContaining(['Wear the beard wrap', 'Wear the wet cloth', 'Wear the bottle goggles']));
  const report = (await readAll(g, keys.confirm)).join(' / ');
  expect(report).toMatch(/Your beard: (SATURATED|HEAVILY SATURATED|CRITICAL) \(\d+%\)/);
  expect(report).toMatch(/smells of mostly smoke/);
  expect(report).toMatch(/Protection: it catches about \d+% of the smoke you breathe/);
  await g.idle();
  // Sniff it: the detail.
  await respond(g, /^Sniff your beard$/, keys);
  const sniff = (await readAll(g, keys.confirm)).join(' / ');
  expect(sniff).toMatch(/\*sniff\* Smoke \d+%/);
  await g.idle();

  // The crew air the place out; then to the washroom tub (care needs breathable air): a rinse, water and seconds.
  await run(g, [{ airStop: true, room: 'crew_quarters' }, { airVent: 'crew_quarters' }, { airVent: 'washroom' }]);
  await go(g, TO_TUB);
  const before = await beard(g);
  await respond(g, /^Rinse the beard/, keys);
  await g.idle(20000);
  const after = await beard(g);
  expect(after.total).toBeLessThan(before.total * 0.75);

  // Reduced effects: the warning stays on the HUD.
  await run(g, [{ beardAdd: 'smoke', amount: 60 }]);
  await g.eval(() => window.__GAME__.app.settings.set('effects', 'reduced'));
  await g.waitFor(() => /BEARD/.test(window.__GAME__.app.overlay.emergencyLine?.text.text ?? ''), null, 5000);
  expect(errors).toEqual([]);
});

test('grooming with a gamepad: hornets in a filthy beard; X at the tub: scrub it, fail, Try again: two rags, the hornets gone @input @ui', async ({ page: browser }) => {
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
  const [A, X, UP, DOWN] = [0, 2, 12, 13];
  const pad = {
    respondKey: () => press(X, 60, 500),
    up: () => press(UP),
    down: () => press(DOWN),
    confirm: () => press(A, 60, 400),
    hit: () => press(A, 30, 40),
  };
  await browser.goto('/');
  await g.preset('beard_demo');
  await g.idle();
  await go(g, TO_TUB);
  await run(g, SCENARIO_D);
  expect((await beard(g)).statuses).toEqual(['saturated', 'gagging', 'hornet_nested']);
  await g.waitFor(() => /BEARD \d+% SATURATED GAGGING HORNETS/.test(window.__GAME__.app.overlay.emergencyLine?.text.text ?? ''), null, 5000);
  const rags = await g.eval(() => window.__GAME__.app.session.inventory.count('sailcloth'));
  const before = await beard(g);
  await respond(g, /^Scrub the beard/, pad);
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  expect((await barState(g)).title).toMatch(/SCRUB IT OUT/);
  await fumble(g, 3, pad.hit);
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 10000);
  expect(await choices(g)).toEqual(['Try again', 'Carry on']);
  await pad.confirm();
  await playOut(g, pad);
  await g.idle(20000);
  const after = await beard(g);
  expect(after.statuses).not.toContain('hornet_nested');
  expect(after.total).toBeLessThan(before.total * 0.6);
  expect(await g.eval(() => window.__GAME__.app.session.inventory.count('sailcloth'))).toBe(rags - 2);
  expect(errors).toEqual([]);
});

test('overloaded, saved mid-countdown and continued: the same countdown, wrung out in time (one purge, nothing doubled); paranoia\'s visions marked (?), never on the HUD, names unchanged @ui @world @saves', async ({ page: browser }) => {
  test.setTimeout(300000);
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(browser);
  const keys = KEYS(g);
  await browser.goto('/');
  await g.preset('beard_demo');
  await g.idle();
  // C. Overloaded: the countdown, on the HUD.
  await run(g, SCENARIO_C);
  await g.waitFor(() => /BEARD OVERLOADED \d+s/.test(window.__GAME__.app.overlay.emergencyLine?.text.text ?? ''), null, 5000);
  await g.wait(2500);
  const saved = await g.eval(() => {
    const ok = window.__GAME__.app.saves.save(1, window.__GAME__.app.session).ok;
    const b = window.__GAME__.app.session.ship.beard;
    return { ok, held: JSON.stringify(b.held), phase: b.phase, left: b.left, count: b.count };
  });
  expect(saved).toMatchObject({ ok: true, phase: 'overload', count: 0 });
  await browser.reload();
  await g.titleChoose('continue');
  await g.idle();
  // The same beard and countdown (a second may have run since the world came back).
  const back = await g.eval(() => {
    const b = window.__GAME__.app.session.ship.beard;
    return { held: JSON.stringify(b.held), phase: b.phase, left: b.left, count: b.count };
  });
  expect(back).toMatchObject({ held: saved.held, phase: 'overload', count: 0 });
  expect(back.left).toBeLessThanOrEqual(saved.left);
  expect(back.left).toBeGreaterThanOrEqual(saved.left - 2);
  // Wring it out before it goes: one controlled purge, the countdown over.
  await respond(g, /^Wring it out, here/, keys);
  await g.idle(15000);
  const wrung = await beard(g);
  expect(wrung).toMatchObject({ count: 1, phase: 'cooldown' });
  await g.wait(4000);
  expect((await beard(g)).count).toBe(1);

  // E. The test musk: paranoia. Visions in purple toasts, always marked (?); the HUD line never shows one; nobody's name changes.
  await watchToasts(g);
  const names = await g.eval(() => [...window.__GAME__.game.scene.getScene('World').actors.values()].map((a) => `${a.id}:${a.npc?.name ?? ''}`).sort());
  await run(g, SCENARIO_E);
  // Each vision (the data's own lines) shows as a purple toast, marked (?) at the front.
  const lines = await g.eval(() => window.__GAME__.app.content.shipBeard.statuses.paranoid.visions);
  await g.waitFor((ls) => (window.__toasts ?? []).some((t) => ls.some((l) => t.includes(l))), lines, 20000);
  const visions = await g.eval((ls) => window.__toasts.filter((t) => ls.some((l) => t.includes(l))), lines);
  expect(visions.length).toBeGreaterThan(0);
  expect(visions.every((t) => /^<p>\(\?\) .*<\/>$/.test(t))).toBe(true);
  expect(await hud(g) ?? '').not.toMatch(/\(\?\)/);
  expect(await g.eval(() => [...window.__GAME__.game.scene.getScene('World').actors.values()].map((a) => `${a.id}:${a.npc?.name ?? ''}`).sort())).toEqual(names);
  expect((await beard(g)).statuses).toContain('paranoid');
  expect(errors).toEqual([]);
});
