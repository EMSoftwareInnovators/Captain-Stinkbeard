import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Grand Stenchmaster pressure in the real game (docs/gameplay-overhaul/12-pressure-and-eruptions.md):
 * the pressure demo (the pressure_demo debug preset: the end of Phase 17 in
 * the crew quarters, Brogath and Garrick where the story has them, a
 * healthy ship, supplies). Each test switches its subject on with the demo's
 * own steps (no chapter does), then plays it the way a player would: the
 * HUD line, Respond (V, pad X), reassuring Brogath with the right words,
 * Check on him, a hold on the real timing bar (failed, then Try again), a
 * controlled release, a save mid-buildup and Continue, a catastrophe that
 * blows a hatch and hits the bow, and mending it.
 */
const SCENARIO_A = [
  { pressureSubject: 'brogath', on: true },
  { pressureSettle: 'brogath', pressure: 20 },
  { pressureModifier: 'brogath', modifier: 'stared_at' },
  { pressureTrigger: 'brogath', trigger: 'laughed_at', quiet: true },
];
const SCENARIO_C = [
  { pressureSubject: 'garrick', on: true },
  { pressureSettle: 'garrick', pressure: 60 },
  { pressureHold: 'garrick' },
  { pressureHold: 'garrick' },
  { pressureAdd: 'garrick', amount: 85 },
  { pressureModifier: 'garrick', modifier: 'ceremony' },
];
const SCENARIO_E = [{ pressureSubject: 'garrick', on: true }, { pressureSettle: 'garrick', pressure: 40 }, { pressureTrigger: 'garrick', trigger: 'beans' }];
const TO_DECK = { transition: 'main_deck', spawn: 'start', fade: 0, noAutosave: true };
const TO_QUARTERS = { transition: 'crew_quarters', x: 12, y: 7, facing: 'up', fade: 0, noAutosave: true };

async function run(g, steps) {
  await g.eval((s) => {
    window.__e2eDone = false;
    window.__GAME__.game.scene.getScene('World').runScript(s).then(() => { window.__e2eDone = true; });
  }, steps);
  await g.waitFor(() => window.__e2eDone === true, null, 15000);
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

const info = (g, id) => g.eval((s) => {
  const i = window.__GAME__.app.session.ship.pressure.info(s);
  return { on: i.on, pressure: i.pressure, stage: i.stage, held: i.held, strain: i.strain, phase: i.phase, left: i.left, count: i.count, mods: i.mods.map((m) => m.id), serial: JSON.stringify(window.__GAME__.app.session.ship.pressure.serialize()) };
}, id);
const ship = (g) => g.eval(() => {
  const s = window.__GAME__.app.session.ship;
  return { bow: s.hp.get('bow'), links: { ...s.air.links }, sources: s.air.sources.map((x) => x.id), heavy: s.air.total('heavy_gas') + (s.air.vented.heavy_gas ?? 0) + (s.air.decayed.heavy_gas ?? 0) };
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
/** Plays the bar to the end, saying Try again after any failure. */
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
/** Moves the choice cursor to the first label matching `re` and confirms it. Returns the labels. */
async function choose(g, re, { down, up, confirm }) {
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 5000);
  const labels = await choices(g);
  const target = labels.findIndex((l) => re.test(l));
  expect(target, `${re} in ${labels.join(' | ')}`).toBeGreaterThanOrEqual(0);
  for (let cur = await g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu.index); cur !== target; cur = await g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu.index)) await (cur < target ? down() : up());
  await confirm();
  return labels;
}
/** Respond, the group (when more than one is offered), then the action. Returns [groups, actions]. */
async function respond(g, group, pick, keys) {
  await keys.respondKey();
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 5000);
  let groups = null;
  if ((await choices(g)).includes('Air and vents')) {
    groups = await choose(g, group, keys);
    await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu && !window.__GAME__.app.overlay.dialogue.choiceMenu.items.some((i) => i.label === 'Air and vents'), null, 5000);
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

const KEYS = (g) => ({
  respondKey: () => g.tap('KeyV', 50, 500),
  up: () => g.tap('ArrowUp', 45, 150),
  down: () => g.tap('ArrowDown', 45, 150),
  confirm: () => g.tap('KeyZ', 45, 400),
  hit: () => g.tap('KeyZ', 30, 40),
});

test('Brogath with the keyboard: laughed at and stared at, the HUD and his meter, Check on him, the right words calm him; reduced effects change nothing but the shaking @smoke @ui @world', async ({ page: browser }) => {
  test.setTimeout(240000);
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(browser);
  const keys = KEYS(g);
  await browser.goto('/');
  await g.preset('pressure_demo');
  await g.idle();
  // Nobody's pressure in play: no line, nothing to respond to.
  expect(await hud(g)).toBe(null);
  expect((await info(g, 'brogath')).on).toBe(false);
  await g.tap('KeyV', 50, 400);
  expect(await g.uiState()).toBe('idle');

  // A. Laughed at, and the crew staring: BUILDING, in words on the HUD; his own BASHFULNESS meter shows too (his Stability's).
  await run(g, SCENARIO_A);
  expect(await info(g, 'brogath')).toMatchObject({ on: true, stage: 'building', mods: ['stared_at'] });
  await g.waitFor(() => /BROGATH BUILDING/.test(window.__GAME__.app.overlay.emergencyLine?.text.text ?? ''), null, 5000);
  expect(await g.eval(() => !!window.__GAME__.app.overlay.stabilityMeter)).toBe(true);
  // Check on him: his stage, what builds him up, the openings here, what helps.
  let [groups, actions] = await respond(g, /^Brogath \(/, /^Check on Brogath$/, keys);
  expect(groups).toEqual([expect.stringMatching(/^Brogath \((BUILDING|DANGEROUS)\)$/), 'Air and vents', 'Leave it']);
  expect(actions).toEqual(['Check on Brogath', 'Reassure Brogath', 'Ask Brogath to hold it in', 'Help Brogath let it out gently (3 s)', 'Leave it']);
  const report = (await readAll(g, keys.confirm)).join(' / ');
  expect(report).toMatch(/Brogath: (BUILDING|DANGEROUS)/);
  expect(report).toMatch(/Building him up: the crew staring at him/);
  expect(report).toMatch(/Openings here: fore hatch open, galley door open, washroom door open, porthole closed\./);
  await g.idle();
  // Reassure him: the prompt's right words (one is always there).
  const calmWords = await g.eval(() => window.__GAME__.app.content.stability.get('brogath').prompts.general.options.filter((o) => o.calm).map((o) => o.text));
  const before = (await info(g, 'brogath')).pressure;
  await respond(g, /^Brogath \(/, /^Reassure Brogath$/, keys);
  await choose(g, new RegExp(`^(${calmWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`), keys);
  await readAll(g, keys.confirm);
  await g.idle();
  const after = await info(g, 'brogath');
  expect(after.pressure).toBeLessThan(before);
  // Straight away again: offered greyed, and he needs a moment (the lock), said in words.
  await respond(g, /^Brogath \(/, /Reassure Brogath/, keys);
  await g.idle();
  expect((await info(g, 'brogath')).pressure).toBeGreaterThanOrEqual(after.pressure);

  // Reduced effects: no shaking, the simulation the same (the crew still stares; he still builds).
  await g.eval(() => window.__GAME__.app.settings.set('reducedEffects', true));
  const p0 = (await info(g, 'brogath')).pressure;
  await g.wait(6000);
  expect((await info(g, 'brogath')).pressure).toBeGreaterThan(p0);
  expect(errors).toEqual([]);
});

test('Garrick with the keyboard: charged, saved and continued; a hold failed and tried again on the bar; let out carefully: one finite release, nothing doubled @ui @world @saves', async ({ page: browser }) => {
  test.setTimeout(300000);
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(browser);
  const keys = KEYS(g);
  await browser.goto('/');
  await g.preset('pressure_demo');
  await g.idle();
  // E. Garrick charged: building, digesting. Saved mid-buildup.
  await run(g, SCENARIO_E);
  await g.wait(2000);
  expect(await g.eval(() => window.__GAME__.app.saves.save(1, window.__GAME__.app.session).ok)).toBe(true);
  const saved = await info(g, 'garrick');
  expect(saved).toMatchObject({ on: true, stage: 'building', mods: ['digesting'] });
  // Reload and Continue: the same pressure, modifier and phase (nothing replayed, nothing lost).
  await browser.reload();
  await g.titleChoose('continue');
  await g.idle();
  const back = await info(g, 'garrick');
  expect(back.serial).toBe(saved.serial);

  // Hold it in: three fumbles fail it (he's worse), Try again, cleanly.
  const [, actions] = await respond(g, /^Garrick \(/, /^Ask Garrick to hold it in$/, keys);
  expect(actions).toEqual(['Check on Garrick', 'Settle Garrick down (3 s)', 'Ask Garrick to hold it in', 'Let Garrick let it out, carefully (2 s)', 'Leave it']);
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  expect((await barState(g)).title).toMatch(/HOLD IT IN/);
  const atBar = await info(g, 'garrick');
  await fumble(g, 3, keys.hit);
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 10000);
  expect(await choices(g)).toEqual(['Try again', 'Carry on']);
  const failed = await info(g, 'garrick');
  expect(failed.pressure).toBeCloseTo(atBar.pressure + 8, 6); // the failure's price: worse by 8
  await keys.confirm();
  await playOut(g, keys);
  await g.idle(15000);
  const heldIn = await info(g, 'garrick');
  expect(heldIn).toMatchObject({ held: 25, strain: 1 });
  expect(heldIn.pressure).toBeCloseTo(atBar.pressure + 8 - 25, 6);

  // Let it out, carefully: a controlled release (the porthole's still shut: the gas stays in the room).
  const s0 = await ship(g);
  await respond(g, /^Garrick \(/, /^Let Garrick let it out, carefully/, keys);
  await g.idle(15000);
  let after = await info(g, 'garrick');
  expect(after).toMatchObject({ count: 1, phase: 'cooldown', held: 0, strain: 0 });
  await g.waitFor(() => window.__GAME__.app.session.ship.air.sources.length === 0, null, 30000);
  const s1 = await ship(g);
  expect(s1.bow).toBe(s0.bow); // a controlled release strikes nothing
  // Once: a minor or moderate release, whatever the saves and repeats.
  expect([30, 80]).toContain(Math.round(s1.heavy));
  after = await info(g, 'garrick');
  expect(after.count).toBe(1);
  expect(errors).toEqual([]);
});

test('A catastrophe with a gamepad: Garrick blows (the HUD counts down), the hatch blown and the bow hit; X: open the porthole, mend the hatch @input', async ({ page: browser }) => {
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
  await g.preset('pressure_demo');
  await g.idle();
  // C. He held it in twice, then a ceremony: the countdown, on the HUD, with HELD.
  await run(g, SCENARIO_C);
  await g.waitFor(() => /GARRICK IMMINENT HELD \d+s/.test(window.__GAME__.app.overlay.emergencyLine?.text.text ?? ''), null, 15000);
  // He gets out to the deck and waits it out.
  await go(g, TO_DECK);
  await g.waitFor(() => window.__GAME__.app.session.ship.pressure.info('garrick').count === 1, null, 20000);
  const st = await ship(g);
  expect(st.bow).toBeLessThan(80);
  expect(st.links.fore_hatch).toEqual({ state: 'open', damaged: true });
  expect(st.sources).toEqual(['erupt_garrick_1']);
  await g.wait(8000);
  // Back in: X, the air: open the porthole, then mend the hatch (planks and nails, on the bar).
  await go(g, TO_QUARTERS);
  await respond(g, /^Air and vents$/, /^Open the quarters porthole/, pad);
  await g.idle(15000);
  await respond(g, /^Air and vents$/, /^Mend the fore hatch/, pad);
  await playOut(g, pad);
  await g.idle(15000);
  const fixed = await ship(g);
  expect(fixed.links.fore_hatch).toEqual(undefined); // open and whole: its default
  expect(fixed.links.quarters_porthole).toEqual({ state: 'open' });
  expect(await g.eval(() => window.__GAME__.app.session.ship.pressure.info('garrick').count)).toBe(1);
  expect(errors).toEqual([]);
});
