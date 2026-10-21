import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Difficulty and accessibility assists in the real game
 * (docs/gameplay-overhaul/08-difficulty-and-accessibility.md): choosing a
 * difficulty before a new game with the keyboard and with a pad (Captain
 * highlighted every time), changing it and the timing assists from the pause
 * menu's Options, the choice surviving a reload, the assist reaching the
 * timing bar, and a strict sash tension played through the real close-up.
 * No chapter has opted in: the challenges here are started by the test
 * itself, and the short trial is added to this page's content only.
 */
const title = (g) => g.eval(() => {
  const t = window.__GAME__.game.scene.getScene('Title');
  const p = t.panel;
  return { state: t.state, mode: p?.mode ?? null, row: p ? p.rows[p.index].id : null };
});
const prefs = (g) => g.eval(() => window.__GAME__.app.settings.challengePrefs());

/** Title → the menu (past "Press Z"), on New Game. */
async function toTitleMenu(g) {
  await g.waitFor(() => window.__GAME__?.game.scene.isActive('Title'), null, 120000);
  while ((await title(g)).state !== 'menu') await g.tap('KeyZ', 45, 400);
  const cur = await g.eval(() => window.__GAME__.game.scene.getScene('Title').menu.index);
  for (let i = 0; i < cur; i++) await g.tap('ArrowUp', 45, 150);
}

test('difficulty with the keyboard: chosen before a new game, changed in Options, kept across a reload @smoke @ui', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(page);
  await page.goto('/');
  await toTitleMenu(g);
  expect(await prefs(g)).toEqual({ difficulty: 'captain', timingAssist: 'off', classicBar: false });

  // New Game opens the choice, on Captain; one press, one step: the game hasn't started.
  await g.tap('KeyZ', 45, 400);
  expect(await title(g)).toEqual({ state: 'menu', mode: 'new', row: 'captain' });
  expect(await g.eval(() => window.__GAME__.game.scene.isActive('World'))).toBe(false);
  await g.tap('ArrowDown', 45, 200);
  expect((await title(g)).row).toBe('brutal');
  // Back: nothing chosen, nothing started.
  await g.tap('KeyX', 45, 400);
  expect(await title(g)).toEqual({ state: 'menu', mode: null, row: null });
  expect((await prefs(g)).difficulty).toBe('captain');
  // Again: Captain is highlighted again; Up to Deckhand and set sail.
  await g.tap('KeyZ', 45, 400);
  expect((await title(g)).row).toBe('captain');
  await g.tap('ArrowUp', 45, 200);
  await g.tap('KeyZ', 45, 300);
  await g.waitFor(() => window.__GAME__.game.scene.isActive('World'), null, 15000);
  expect((await prefs(g)).difficulty).toBe('deckhand');

  // Reopened (the prologue's opening scene is left behind), the choice is still there.
  await page.reload();
  await g.waitFor(() => window.__GAME__?.game.scene.isActive('Title'), null, 120000);
  expect((await prefs(g)).difficulty).toBe('deckhand');

  // In a game: pause menu → Options → Difficulty shows it, and opens the panel.
  await g.preset('p17_complete');
  await g.idle();
  await g.tap('KeyC', 50, 600);
  await g.waitFor(() => window.__GAME__.game.scene.isActive('Menu') && !!window.__GAME__.game.scene.getScene('Menu').nav, null, 10000);
  const target = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').nav.items.findIndex((i) => i.value === 'options'));
  for (let cur = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').nav.index); cur !== target; cur = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').nav.index)) {
    await g.tap(cur < target ? 'ArrowDown' : 'ArrowUp', 45, 150);
  }
  await g.tap('KeyZ', 45, 400);
  const options = () => g.eval(() => {
    const o = window.__GAME__.game.scene.getScene('Menu').modal;
    return o && { row: o.rows[o.index].key, value: o.valueText(o.rows[0]), sub: o.sub ? { row: o.sub.rows[o.sub.index].id } : null };
  });
  expect(await options()).toEqual({ row: 'difficulty', value: 'Deckhand', sub: null });
  await g.tap('KeyZ', 45, 400);
  expect((await options()).sub).toEqual({ row: 'difficulty' });
  await g.tap('ArrowRight', 45, 200); // Captain
  await g.tap('ArrowRight', 45, 200); // Brutal
  await g.tap('ArrowDown', 45, 200);
  await g.tap('ArrowRight', 45, 200); // Timing assist: Light
  await g.tap('ArrowDown', 45, 200);
  await g.tap('KeyZ', 45, 200); // Classic bar: On
  expect(await prefs(g)).toEqual({ difficulty: 'brutal', timingAssist: 'light', classicBar: true });
  await g.tap('KeyX', 45, 400);
  expect(await options()).toEqual({ row: 'difficulty', value: 'Brutal + assist', sub: null });
  await g.tap('KeyX', 45, 400);
  await g.tap('KeyX', 45, 600);
  await g.waitFor(() => !window.__GAME__.game.scene.isActive('Menu'), null, 5000);
  expect(await g.uiState()).toBe('idle');

  // Closing and reopening the game keeps all three; a new game still starts on Captain.
  await page.reload();
  await toTitleMenu(g);
  expect(await prefs(g)).toEqual({ difficulty: 'brutal', timingAssist: 'light', classicBar: true });
  const newIndex = await g.eval(() => window.__GAME__.game.scene.getScene('Title').menu.items.findIndex((i) => i.value === 'new'));
  for (let cur = await g.eval(() => window.__GAME__.game.scene.getScene('Title').menu.index); cur !== newIndex; cur = await g.eval(() => window.__GAME__.game.scene.getScene('Title').menu.index)) {
    await g.tap(cur < newIndex ? 'ArrowDown' : 'ArrowUp', 45, 150);
  }
  await g.tap('KeyZ', 45, 400);
  expect((await title(g)).row).toBe('captain');
  await g.tap('KeyX', 45, 300);
  expect((await title(g)).mode).toBe(null);
  expect(errors).toEqual([]);
});

test('difficulty with a gamepad: one press opens the choice, the pad picks Brutal and sets sail @input', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const pad = { id: 'Test Pad (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
    window.__pads = [pad];
    navigator.getGamepads = () => [pad, null, null, null];
  });
  const g = new GameDriver(page);
  const press = async (button, ms = 60) => {
    await page.evaluate((b) => { window.__pads[0].buttons[b].pressed = true; window.__pads[0].buttons[b].value = 1; }, button);
    await page.waitForTimeout(ms);
    await page.evaluate((b) => { window.__pads[0].buttons[b].pressed = false; window.__pads[0].buttons[b].value = 0; }, button);
    await page.waitForTimeout(250);
  };
  const A = 0;
  const B = 1;
  const DOWN = 13;
  await page.goto('/');
  await g.waitFor(() => window.__GAME__?.game.scene.isActive('Title'), null, 120000);
  for (let i = 0; i < 10 && (await title(g)).state !== 'menu'; i++) await press(A);
  expect(await g.eval(() => window.__GAME__.app.input.device)).toBe('gamepad');
  await press(A); // New Game (the first entry: no saves yet)
  expect(await title(g)).toEqual({ state: 'menu', mode: 'new', row: 'captain' });
  await press(DOWN);
  expect((await title(g)).row).toBe('brutal');
  await press(B); // back, and in again
  expect((await title(g)).mode).toBe(null);
  await press(A);
  expect((await title(g)).row).toBe('captain');
  await press(DOWN);
  await press(A);
  await g.waitFor(() => window.__GAME__.game.scene.isActive('World'), null, 15000);
  expect((await prefs(g)).difficulty).toBe('brutal');
  expect(errors).toEqual([]);
});

/** Starts a script in the world without waiting for it; `window.__e2eDone` is set when it ends. */
function start(g, steps) {
  return g.eval((s) => {
    window.__e2eDone = false;
    window.__GAME__.game.scene.getScene('World').runScript(s).then(() => { window.__e2eDone = true; });
  }, steps);
}

test('the timing assist reaches the bars, and a strict sash tension plays through the real close-up @smoke @ui @world', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(page);
  await page.goto('/');
  await g.preset('p17_complete');
  await g.idle();

  // A legacy bar with the assist off, then strong: slower, more green, cues; still no challenge record.
  const bar = () => g.eval(() => { const r = window.__GAME__.app.overlay.repairOpen; return r && { speed: r.bar.speed, zone: r.bar.zoneWidth, cues: r.cues, strict: r.bar.strict }; });
  const legacyBar = async () => {
    await start(g, [{ repair: 'hull', strikes: 1 }]);
    await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
    const b = await bar();
    while (!(await g.eval(() => window.__e2eDone === true))) await g.repairTick();
    return b;
  };
  const off = await legacyBar();
  await g.eval(() => window.__GAME__.app.settings.set('timingAssist', 'strong'));
  const strong = await legacyBar();
  expect(off).toMatchObject({ cues: false, strict: false });
  expect(strong).toMatchObject({ cues: true, strict: false, zone: off.zone + 8 });
  expect(strong.speed).toBeCloseTo(off.speed * 0.7, 3);
  expect(await g.eval(() => window.__GAME__.app.session.transient?.challengeLog?.records?.length ?? 0)).toBe(0);
  await g.eval(() => window.__GAME__.app.settings.set('timingAssist', 'off'));

  // A short trial, for this page only (no content file has it).
  await g.eval(() => window.__GAME__.app.content.tension.add('e2e_trial', {
    title: 'E2E TRIAL', seconds: 6, band: [38, 68], pull: 60, slack: 44, sway: { amp: 14, period: 4.6 }, grace: 1.6,
    release: { cue: 'LET GO!', auto: 4000 },
  }, 'e2e'));
  const tension = () => g.eval(() => { const t = window.__GAME__.app.overlay.tensionOpen; return t && { phase: t.st.phase, band: t.st.band, grace: t.st.def.grace, cue: t.cueWord?.text ?? null }; });
  const record = (id) => g.eval((i) => { const r = window.__GAME__.app.session.transient.challengeLog.last(i); return r && { outcome: r.outcome, difficulty: r.difficulty, intent: r.intent, cause: r.cause, ceremony: r.narrative?.ceremony ?? null, history: r.history.map((h) => h.outcome), reason: r.history[0]?.reason ?? null, assists: r.assists }; }, id);

  // 1. The trial for real, on Brutal: let the hands go slack and the grip is lost; "Try again" (it must be won); then held to the cue.
  await g.eval(() => window.__GAME__.app.settings.set('difficulty', 'brutal'));
  await start(g, [{ sashTension: 'e2e_trial', challenge: { profile: 'sash_trial_strict', id: 'e2e_sash' }, outcomeValue: 'e2e_sash_outcome' }]);
  await g.waitFor(() => !!window.__GAME__.app.overlay.tensionOpen, null, 10000);
  const brutal = await tension();
  expect(brutal.band).toEqual([41, 65]); // Brutal's tolerance: three points in from each side
  expect(brutal.grace).toBeCloseTo(1.2, 5);
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 20000);
  expect(await g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu.items.map((i) => i.label))).toEqual(['Try again']);
  await g.tap('KeyX', 45, 300); // can't be cancelled past
  expect(await g.eval(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu)).toBe(true);
  await g.tap('KeyZ', 45, 300);
  await g.waitFor(() => !!window.__GAME__.app.overlay.tensionOpen, null, 10000);
  await g.holdTension();
  await g.waitFor(() => window.__e2eDone === true, null, 15000);
  expect(await record('e2e_sash')).toMatchObject({ outcome: 'success', difficulty: 'brutal', intent: 'complete', ceremony: 'completed', cause: 'deliberate', history: ['failure', 'success'], reason: 'lost' });
  expect(await g.eval(() => window.__GAME__.app.session.story.getValue('e2e_sash_outcome'))).toBe('success');

  // 2. The same close-up for a saboteur, on Deckhand with the strong assist: Cancel lets it go on purpose, and that is the win.
  await g.eval(() => { const s = window.__GAME__.app.settings; s.set('difficulty', 'deckhand'); s.set('timingAssist', 'strong'); });
  await start(g, [{ sashTension: 'e2e_trial', challenge: { profile: 'sash_deliberate_flutter', id: 'e2e_sabotage' } }]);
  await g.waitFor(() => !!window.__GAME__.app.overlay.tensionOpen, null, 10000);
  await g.wait(1200);
  const eased = await tension();
  expect(eased.band[1] - eased.band[0]).toBe(30 + 2 * (5 + 6)); // Deckhand's tolerance and the strong assist's, both sides
  expect(['PULL', 'HOLD', 'EASE']).toContain(eased.cue);
  await g.tap('KeyX', 45, 200);
  await g.waitFor(() => window.__e2eDone === true, null, 15000);
  expect(await record('e2e_sabotage')).toMatchObject({ outcome: 'success', difficulty: 'deckhand', intent: 'sabotage', ceremony: 'broken', cause: 'deliberate', history: ['success'], assists: ['timingAssist:strong'] });

  // The world is free afterwards.
  expect(await g.uiState()).toBe('idle');
  expect(errors).toEqual([]);
});
