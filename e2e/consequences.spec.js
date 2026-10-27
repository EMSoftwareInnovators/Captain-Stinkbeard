import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';
import { DEBUG_SHIP } from '../src/debug/shipDebug.js';

/**
 * Persistent consequences in the real game (docs/gameplay-overhaul/15-consequences-and-recovery.md):
 * the consequences demo (the consequences_demo debug preset: the end of
 * Phase 17 in the cargo hold by the bilge pump, the galley up the stairs,
 * the crew quarters and the main deck beyond). Each test plays a demo
 * scenario the way a player would: real repairs on the timing bar (a clean
 * one, a botched one carried on), another room, the Captain's Journal read
 * with the keyboard and with a gamepad, a rest in the crew quarters, tools
 * laid out with Respond, and a save continued. No chapter uses any of it.
 */
const scenario = (letter) => DEBUG_SHIP.consequences.find(([label]) => label.startsWith(`Consequences ${letter}:`))[1].filter((s) => !s.tutorial);
const at = (map, x, y, facing = 'up') => ({ transition: map, x, y, facing, fade: 0, noAutosave: true });

/** Starts steps in the world without waiting (they may open a timing bar); `done(g)` waits for them. */
const start = (g, steps) => g.eval((s) => {
  window.__e2eDone = false;
  window.__GAME__.game.scene.getScene('World').runScript(s).then(() => { window.__e2eDone = true; });
}, steps);
async function done(g, ms = 60000) {
  await g.waitFor(() => window.__e2eDone === true, null, ms);
  await g.idle();
}
async function run(g, steps) {
  await start(g, steps);
  await done(g);
}
async function go(g, step) {
  await g.eval((s) => {
    window.__GAME__.game.scene.getScene('World').runScript([s]);
  }, step);
  await g.waitFor((id) => window.__GAME__.game.scene.isActive('World') && window.__GAME__.game.scene.getScene('World').model?.id === id && !window.__GAME__.game.scene.getScene('World').leaving, step.transition, 15000);
  await g.wait(500);
  await g.idle();
}
const ledger = (g) => g.eval(() => {
  const L = window.__GAME__.app.session.consequences;
  return { held: Object.fromEntries(L.list().map((e) => [e.id, e.state === 'contained' ? 'contained' : e.level])), history: L.history.map((h) => `${h.id}:${h.how}`), uses: L.held('well_prepared')?.uses ?? null, miles: L.held('poorly_prepared')?.miles ?? null };
});
const choices = (g) => g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu?.items.map((i) => i.label.replace(/<[^>]*>/g, '')) ?? null);
const barState = (g) => g.eval(() => {
  const r = window.__GAME__.app.overlay.repairOpen;
  if (!r) return null;
  const onGreen = r.mark.x >= r.zone.x - 2 && r.mark.x <= r.zone.x + r.zone.width + 2;
  const offGreen = r.mark.x < r.zone.x - 14 || r.mark.x > r.zone.x + r.zone.width + 14;
  return { lock: r.lock, onGreen, offGreen, fumbles: r.fumbles, zone: r.zone.width };
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
/** The green of the next bar (waits for it to open). */
async function nextBar(g) {
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 15000);
  return (await barState(g)).zone;
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
/** Records every toast's text from now on (window.__toasts). */
const watchToasts = (g) => g.eval(() => {
  const t = window.__GAME__.app.overlay.toasts;
  window.__toasts = [];
  const push = t.push.bind(t);
  t.push = (o) => {
    window.__toasts.push(o.text.replace(/<[^>]*>/g, ''));
    return push(o);
  };
});
const toasts = (g) => g.eval(() => window.__toasts ?? []);
/** Pause menu → an entry → into its page. */
async function openPage(g, value, { open, up, down, confirm }) {
  await open();
  await g.waitFor(() => window.__GAME__.game.scene.isActive('Menu') && !!window.__GAME__.game.scene.getScene('Menu').nav, null, 10000);
  const target = await g.eval((v) => window.__GAME__.game.scene.getScene('Menu').nav.items.findIndex((i) => i.value === v), value);
  expect(target, value).toBeGreaterThanOrEqual(0);
  for (let cur = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').nav.index); cur !== target; cur = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').nav.index)) await (cur < target ? down() : up());
  await confirm();
  await g.waitFor(() => window.__GAME__.game.scene.getScene('Menu').page?.focused === true, null, 5000);
}
/** The Journal page: its rows (label, right) and the selected entry's detail text (as shown in the panel, lines joined). */
const journal = (g) => g.eval(() => {
  const p = window.__GAME__.game.scene.getScene('Menu').page;
  const strip = (t) => String(t ?? '').replace(/<[^>]*>/g, '');
  return { rows: p.menu.items.map((i) => `${strip(i.label)}|${strip(i.right)}`), index: p.menu.index, detail: p.detail.objects.map((o) => o.text ?? '').join(' / ').replace(/\s+/g, ' ') };
});
/** "Read all" (Confirm): the whole entry, a page at a time, as any long Journal entry; closed again with Cancel. */
async function readAll(g, { confirm, cancel }) {
  await confirm();
  await g.waitFor(() => !!window.__GAME__.game.scene.getScene('Menu').page.reader, null, 5000);
  const text = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').page.reader.pages.flat().map((p) => p.text.replace(/<[^>]*>/g, '')).join(' / '));
  await g.wait(250);
  await cancel();
  await g.waitFor(() => !window.__GAME__.game.scene.getScene('Menu').page.reader, null, 5000);
  return text;
}
const KEYS = (g) => ({
  respondKey: () => g.tap('KeyV', 50, 500),
  open: () => g.tap('KeyC', 50, 600),
  up: () => g.tap('ArrowUp', 45, 150),
  down: () => g.tap('ArrowDown', 45, 150),
  confirm: () => g.tap('KeyZ', 45, 400),
  cancel: () => g.tap('KeyX', 45, 400),
  hit: () => g.tap('KeyZ', 30, 40),
});

test('a mistake carried into another room and read in the Captain\'s Journal, with the keyboard: a clean repair, a botched one carried on, a tighter green upstairs @smoke @ui @world', async ({ page: browser }) => {
  test.setTimeout(300000);
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(browser);
  const keys = KEYS(g);
  await browser.goto('/');
  await g.preset('consequences_demo');
  await g.idle();
  // The deck's green before any mistake (the leader's stat is in it: what changes is measured, not assumed).
  await go(g, at('main_deck', 9, 13, 'down'));
  await start(g, [{ shipDamage: 'deck', amount: 25, category: 'impact', scale: false, announce: false }, { shipRepair: 'deck' }]);
  const before = await nextBar(g);
  await hitUntilClosed(g, keys.hit);
  await done(g);
  expect((await ledger(g)).held).toEqual({});

  // Back in the hold: the demo's two repairs. The first clean; the second fumbled out, and carried on.
  await go(g, at('cargo_hold', 14, 4, 'down'));
  await watchToasts(g);
  await start(g, scenario('A'));
  await nextBar(g);
  await hitUntilClosed(g, keys.hit);
  await nextBar(g);
  await fumble(g, 3, keys.hit);
  await choose(g, /^Carry on$/, keys);
  await done(g);
  expect((await ledger(g)).held).toEqual({ shaken: 1, crew_doubts: 1, in_the_groove: 1 });
  // Free in the world, the hazard clock runs it down (scenes, bars and room changes don't count).
  const left = () => g.eval(() => window.__GAME__.app.session.consequences.held('shaken').left);
  const was = await left();
  await g.wait(3500);
  expect(was - (await left())).toBeGreaterThanOrEqual(2);
  const said = await toasts(g);
  for (const re of [/^IN THE GROOVE: work goes quicker/, /^RATTLED HANDS: repair timing is less forgiving\.$/, /^CREW DOUBTS noted in the Journal\.$/]) expect(said.some((t) => re.test(t)), `${re} in ${said.join(' | ')}`).toBe(true);

  // Upstairs, another repair: the same deck, the same leader, the green exactly 3 narrower.
  await go(g, at('main_deck', 9, 13, 'down'));
  await start(g, [{ shipDamage: 'deck', amount: 25, category: 'impact', scale: false, announce: false }, { shipRepair: 'deck' }]);
  expect(await nextBar(g)).toBe(before - 3);
  await hitUntilClosed(g, keys.hit);
  await done(g);

  // Pause > Journal: the ledger at the top, NEW until read; each says what it does and what puts it right.
  await openPage(g, 'log:captains_journal', keys);
  // The entry the page opens on is read at once (as any Journal entry); the others stay NEW until visited.
  const first = await journal(g);
  expect(first.rows.slice(0, 3)).toEqual(['Rattled Hands|Condition', 'Crew Doubts|NEW', 'In the Groove|NEW']);
  expect(first.detail).toMatch(/Active: Shaky \(1 of 2\)/);
  expect(first.detail).toMatch(/Repair timing is less forgiving\. Green -3\./);
  expect(first.detail).toMatch(/Read all$/);
  const whole = await readAll(g, keys);
  expect(whole).toMatch(/Recover {2}Rest in a hammock, in the crew quarters \(15s\): ends it\. Go to the Crew Quarters\./);
  expect(whole).toMatch(/Ends {2}By itself in [45]:\d\d\./);
  await keys.down();
  const second = await journal(g);
  expect(second.rows.slice(0, 2)).toEqual(['Rattled Hands|Condition', 'Crew Doubts|Crew']);
  expect(second.detail).toMatch(/They're too polite to say so/);
  await keys.cancel();
  await keys.cancel();
  await g.idle();
  expect(errors).toEqual([]);
});

test('recovery with a gamepad: the Journal says what it needs, a rest in the crew quarters puts it right, and it is remembered @input @ui', async ({ page: browser }) => {
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
  const [A, B, X, START, UP, DOWN] = [0, 1, 2, 9, 12, 13];
  const pad = {
    respondKey: () => press(X, 60, 500),
    open: () => press(START, 60, 600),
    up: () => press(UP),
    down: () => press(DOWN),
    confirm: () => press(A, 60, 400),
    cancel: () => press(B, 60, 400),
  };
  await browser.goto('/');
  await g.preset('consequences_demo');
  await g.idle();
  await run(g, scenario('B'));
  expect((await ledger(g)).held).toEqual({ shaken: 2, exhausted: 1 });
  // Read it first: Rattled, and where the rest is.
  await openPage(g, 'log:captains_journal', pad);
  const page = await journal(g);
  expect(page.rows.slice(0, 2)).toEqual(['Rattled Hands|Condition', 'Bone-Tired|NEW']);
  expect(page.detail).toMatch(/Active: Rattled \(2 of 2\)/);
  const whole = await readAll(g, pad);
  expect(whole).toMatch(/\(25s\): ends it\. Go to the Crew Quarters\./);
  expect(whole).toMatch(/Eat a hot meal, a galley meal, eaten from Items: eases it\. You have one\./);
  await pad.cancel();
  await pad.cancel();
  await g.idle();
  // Nothing to rest on in the hold; in the crew quarters, Respond offers the hammock.
  await go(g, at('crew_quarters', 8, 5, 'down'));
  await watchToasts(g);
  // The supplies are on (the demo's meal), so his gear is offered too; the rest is under "Rest and readiness".
  await pad.respondKey();
  expect(await choose(g, /^Rest and readiness$/, pad)).toEqual(['Your gear', 'Rest and readiness', 'Leave it']);
  await g.wait(250);
  const offered = await choose(g, /^Rest in a hammock \(25s\)$/, pad);
  expect(offered).toEqual(['Rest in a hammock (25s)', 'Leave it']);
  await g.idle(60000);
  const after = await ledger(g);
  expect([after.held, after.history]).toEqual([{}, ['shaken:rest', 'exhausted:rest']]);
  await g.waitFor(() => (window.__toasts ?? []).some((t) => /^RATTLED HANDS rested it off\.$/.test(t)), null, 5000);
  // Remembered: the Journal keeps them, past.
  await openPage(g, 'log:captains_journal', pad);
  expect((await journal(g)).rows.slice(0, 2)).toEqual(['Bone-Tired|past', 'Rattled Hands|past']);
  await pad.cancel();
  await pad.cancel();
  await g.idle();
  expect(errors).toEqual([]);
});

test('an advantage earned with Respond, used on a repair, saved and continued, then used up; a chapter-long one counted down across the save @world @saves', async ({ page: browser }) => {
  test.setTimeout(300000);
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(browser);
  const keys = KEYS(g);
  await browser.goto('/');
  await g.preset('consequences_demo');
  await g.idle();
  await go(g, at('cargo_hold', 14, 4, 'down'));
  await start(g, [{ shipDamage: ['hull_port', 'hull_starboard'], amount: 40, category: 'impact', scale: false, announce: false }, { shipRepair: 'hull_port' }]);
  const before = await nextBar(g);
  await hitUntilClosed(g, keys.hit);
  await done(g);
  // Switched on (the demo's own step): Respond in the hold offers laying out the tools.
  await run(g, scenario('C'));
  await watchToasts(g);
  // In the hold the bilge pump's group always comes first (greyed while the bilge is dry): ours is next.
  await keys.respondKey();
  expect(await choose(g, /^Rest and readiness$/, keys)).toEqual(['Fight the emergency', 'Rest and readiness', 'Leave it']);
  await g.wait(250);
  await choose(g, /^Lay out the tools \(12s, 1 Nails\)$/, keys);
  await g.idle(60000);
  expect((await ledger(g)).held).toEqual({ well_prepared: 1 });
  await start(g, [{ shipRepair: 'hull_port' }]);
  expect(await nextBar(g)).toBe(before + 3);
  await hitUntilClosed(g, keys.hit);
  await done(g);
  // A chapter-long one too, and a chapter marked; then saved and continued: both exactly as they were.
  await run(g, [{ consequence: 'crew_doubts' }, { consequenceMilestone: 'chapter' }]);
  expect(await g.eval(() => window.__GAME__.app.saves.save(1, window.__GAME__.app.session).ok)).toBe(true);
  await browser.reload();
  await g.titleChoose('continue');
  await g.idle();
  await watchToasts(g);
  const back = await ledger(g);
  expect([back.held, back.uses]).toEqual([{ well_prepared: 1, crew_doubts: 1 }, 1]);
  // The second repair it helps uses it up (said once), and the next chapter ends the other.
  await start(g, [{ shipRepair: 'hull_starboard' }]);
  expect(await nextBar(g)).toBe(before + 3);
  await hitUntilClosed(g, keys.hit);
  await done(g);
  await g.waitFor(() => (window.__toasts ?? []).some((t) => /^READY FOR ANYTHING used up\.$/.test(t)), null, 5000);
  await run(g, [{ consequenceMilestone: 'chapter' }]);
  const last = await ledger(g);
  expect([last.held, last.history]).toEqual([{}, ['well_prepared:used up', 'crew_doubts:milestone']]);
  expect(errors).toEqual([]);
});
