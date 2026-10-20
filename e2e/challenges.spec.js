import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Challenge outcomes in the real game (docs/gameplay-overhaul/07-challenge-outcomes.md):
 * a strict timing bar started from a script (no chapter has opted in, so the
 * test opts in itself), failed on purpose with real key presses, the outcome
 * prompt answered with the keyboard ("Try again", then "Carry on") and with a
 * stubbed gamepad, and the world free afterwards. The bar can't be cancelled
 * past and one press is one action.
 */
const STRICT = (id, onFailure = { mustRetry: true }) => ({
  id,
  failure: true,
  mechanics: { maxFumbles: 1 },
  outcomes: { failure: { completed: false }, success: { fumbles: 0 }, fallback: 'partial' },
  onFailure,
});

/** Starts a script in the world without waiting for it; `window.__e2eDone` is set when it ends. */
function start(g, steps) {
  return g.eval((s) => {
    window.__e2eDone = false;
    window.__GAME__.game.scene.getScene('World').runScript(s).then(() => { window.__e2eDone = true; });
  }, steps);
}

const barState = (g) => g.eval(() => {
  const r = window.__GAME__.app.overlay.repairOpen;
  if (!r) return null;
  const onGreen = r.mark.x >= r.zone.x - 2 && r.mark.x <= r.zone.x + r.zone.width + 2;
  // Comfortably off the green, so the press can't land on it by the time it arrives.
  const offGreen = r.mark.x < r.zone.x - 14 || r.mark.x > r.zone.x + r.zone.width + 14;
  return { lock: r.lock, onGreen, offGreen, fumbles: r.fumbles, done: r.done };
});

/** Fumbles the open bar `n` times with `press` (pressing well off the green, after the lock). */
async function fumble(g, n, press) {
  for (let i = 0; i < n; i++) {
    const want = i + 1;
    for (let guard = 0; guard < 400; guard++) {
      const st = await barState(g);
      if (!st) return;
      if (st.fumbles >= want) break;
      if (st.lock <= 0 && st.offGreen) await press();
      else await g.wait(16);
    }
  }
}

/** Plays the open bar cleanly with `press` until it closes. */
async function hitUntilClosed(g, press) {
  for (let guard = 0; guard < 3000; guard++) {
    const st = await barState(g);
    if (!st) return;
    if (st.lock <= 0 && st.onGreen) await press();
    else await g.wait(12);
  }
}

const choiceLabels = (g) => g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu?.items?.map((i) => i.label) ?? null);

test('a strict timing bar fails for real, and the outcome prompt works from the keyboard @smoke @ui', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(page);
  await page.goto('/');
  await g.preset('p17_complete');
  const key = () => g.tap('KeyZ', 30, 40);

  // 1. Fail (two fumbles past maxFumbles 1), answer "Try again" with Z, then win.
  await start(g, [{ repair: 'hull', strikes: 2, challenge: STRICT('e2e_retry'), outcomeValue: 'e2e_outcome' }]);
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  await fumble(g, 2, key);
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 10000);
  expect(await choiceLabels(g)).toEqual(['Try again']);
  // It can't be cancelled past: Cancel does nothing, the prompt stays.
  await g.tap('KeyX', 45, 300);
  expect(await choiceLabels(g)).toEqual(['Try again']);
  await g.tap('KeyZ', 45, 300);
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  // The confirm that picked "Try again" didn't leak into the new bar.
  expect((await barState(g)).fumbles).toBe(0);
  await hitUntilClosed(g, key);
  await g.waitFor(() => window.__e2eDone === true, null, 15000);
  expect(await g.eval(() => window.__GAME__.app.session.story.getValue('e2e_outcome'))).toBe('success');

  // 2. Fail, choose "Carry on" (Down, then Z): the consequences run and the script goes on.
  await start(g, [
    { repair: 'hull', strikes: 2, challenge: STRICT('e2e_carry', { continue: true, consequences: [{ addVar: 'e2e_damage', value: 2 }] }), outcomeValue: 'e2e_outcome' },
    { setVar: 'e2e_after', value: 1 },
  ]);
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  await fumble(g, 2, key);
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 10000);
  expect(await choiceLabels(g)).toEqual(['Try again', 'Carry on']);
  await g.tap('ArrowDown', 45, 150);
  await g.tap('KeyZ', 45, 300);
  await g.waitFor(() => window.__e2eDone === true, null, 15000);
  const st = await g.eval(() => {
    const s = window.__GAME__.app.session.story;
    return { outcome: s.getValue('e2e_outcome'), damage: s.getVar('e2e_damage'), after: s.getVar('e2e_after') };
  });
  expect(st).toEqual({ outcome: 'failure', damage: 2, after: 1 });

  // 3. The world is free and nothing is held over: the captain walks.
  expect(await g.uiState()).toBe('idle');
  const before = await g.state();
  await g.walk('down', 1);
  await g.walk('up', 1);
  const after = await g.state();
  expect(after.map).toBe(before.map);
  expect(await g.uiState()).toBe('idle');
  expect(errors).toEqual([]);
});

test('the outcome prompt and the strict bar work with a gamepad @input', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const pad = { id: 'Test Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
    window.__pads = [pad];
    navigator.getGamepads = () => [pad, null, null, null];
  });
  const g = new GameDriver(page);
  const press = async (button, ms = 40) => {
    await page.evaluate((b) => { window.__pads[0].buttons[b].pressed = true; window.__pads[0].buttons[b].value = 1; }, button);
    await page.waitForTimeout(ms);
    await page.evaluate((b) => { window.__pads[0].buttons[b].pressed = false; window.__pads[0].buttons[b].value = 0; }, button);
    await page.waitForTimeout(60);
  };
  const A = () => press(0, 30);
  await page.goto('/');
  await g.preset('p17_complete');
  await start(g, [{ repair: 'hull', strikes: 2, challenge: STRICT('e2e_pad'), outcomeValue: 'e2e_outcome' }]);
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  await fumble(g, 2, A);
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 10000);
  expect(await g.eval(() => window.__GAME__.app.input.device)).toBe('gamepad');
  await press(0, 60);
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  // Win it; a pad press that comes a frame late may fumble once: that fails again, and the pad retries.
  for (let round = 0; round < 4; round++) {
    await hitUntilClosed(g, A);
    const done = await g.eval(() => window.__e2eDone === true);
    if (done) break;
    await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu || window.__e2eDone === true, null, 10000);
    if (await g.eval(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu)) {
      await press(0, 60);
      await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
    }
  }
  await g.waitFor(() => window.__e2eDone === true, null, 15000);
  expect(await g.eval(() => window.__GAME__.app.session.story.getValue('e2e_outcome'))).toBe('success');
  expect(errors).toEqual([]);
});

test('a Shark Duty watch that opted in can be lost, retried from its start, and won @world', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(page);
  await page.goto('/');
  await g.preset('p17_complete');
  // Onto the main deck, then opt the first watch into a challenge at runtime (no content file changes).
  await g.eval(() => {
    window.__GAME__.game.scene.getScene('World').scene.restart({ map: 'main_deck', noAutosave: true });
  });
  await g.waitFor(() => { const w = window.__GAME__.game.scene.getScene('World'); return window.__GAME__.game.scene.isActive('World') && w.model?.id === 'main_deck' && !w.leaving && !w.isBusy(); }, null, 20000);
  await g.wait(600);
  const bites0 = await g.eval(() => window.__GAME__.app.session.story.getVar('duty_bites'));
  await g.eval(() => {
    const w = window.__GAME__.game.scene.getScene('World');
    w.model.meta.sharkDuty = [{ session: 'first_watch', challenge: { id: 'e2e_duty', failure: true, mechanics: { maxBites: 0 }, outcomes: { failure: { completed: false }, success: { bites: 0 }, fallback: 'partial' }, onFailure: { mustRetry: true } } }];
    w.sharkDuty.sync();
  });
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').sharkDuty.sessionId)).toBe('first_watch');
  // The captain stands still: the first shark bites, and with no bites allowed the watch is lost.
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 60000);
  expect(await choiceLabels(g)).toEqual(['Try again']);
  expect(await g.eval(() => window.__GAME__.app.session.story.getVar('duty_bites'))).toBe(bites0 + 1);
  await g.tap('KeyZ', 45, 400);
  await g.waitFor(() => !window.__GAME__.app.overlay.dialogue.choiceMenu, null, 5000);
  // Back to the start of the watch: the bite undone, no sharks, a fresh attempt.
  const after = await g.eval(() => {
    const d = window.__GAME__.game.scene.getScene('World').sharkDuty;
    return { bites: window.__GAME__.app.session.story.getVar('duty_bites'), watchBites: d.watch.bites, incidents: d.incidents.length, attempt: d.run.record.attempt };
  });
  expect(after).toEqual({ bites: bites0, watchBites: 0, incidents: 0, attempt: 2 });
  // The story moves on before anything else bites: the watch ends, judged on this attempt.
  await g.eval(() => {
    const w = window.__GAME__.game.scene.getScene('World');
    w.model.meta.sharkDuty = [];
    w.sharkDuty.sync();
  });
  const rec = await g.eval(() => {
    const r = window.__GAME__.app.session.transient.challengeLog.last('e2e_duty');
    return r && { outcome: r.outcome, attempt: r.attempt, history: r.history.map((h) => h.outcome) };
  });
  expect(rec).toEqual({ outcome: 'success', attempt: 2, history: ['failure', 'success'] });
  expect(await g.uiState()).toBe('idle');
  expect(errors).toEqual([]);
});
