import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Shipboard resources in the real game (docs/gameplay-overhaul/14-resources-and-cooking.md):
 * the supplies demo (the supplies_demo debug preset: the end of Phase 17 in
 * the cargo hold by the ship's stores, the galley up the stairs, a few
 * materials and the four pieces of gear). Each test switches the system on
 * with the demo's own steps (no chapter does), then plays it the way a
 * player would: Respond (V, pad X) where he stands to search, salvage, put
 * away and take out, cook on the real timing bar (failed, then Try again),
 * serve and eat from the Items menu, wear gear, drink a grog tot and Frog
 * Grog, scavenge the bilge on Brutal, and save and continue.
 */
const ON = [{ suppliesSystem: true }];
const SCENARIO_C = [{ suppliesSystem: true }, { beardSaturation: true }, { beardClean: true }, { airAdd: 'cargo_hold', substance: 'smoke', pct: 20 }, { airSource: 'cargo_hold', substance: 'smoke', rate: 3, seconds: 240, label: 'a smouldering bale', source: 'debug' }, { giveItem: 'grog_tot', count: 1 }, { giveItem: 'frog_grog', count: 1 }];
const SCENARIO_D = [{ suppliesSystem: true }, { supplyStore: 'hold', give: [{ item: 'beans', count: 4 }, { item: 'onions', count: 2 }, { item: 'oats', count: 4 }] }];
const at = (map, x, y, facing = 'up') => ({ transition: map, x, y, facing, fade: 0, noAutosave: true });

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
const sup = (g) => g.eval(() => {
  const s = window.__GAME__.app.session;
  const u = s.ship.supplies;
  const inv = (id) => s.inventory.count(id);
  return { on: u.on, stores: JSON.stringify(u.stores), left: (id) => null, crates: u.sourceState('hold_crates').left, bilge: u.sourceState('hold_bilge').cooldown, cooking: u.cooking, effects: Object.keys(u.effects), worn: [...s.ship.beard.worn], planks: inv('planks'), nails: inv('nails'), beans: inv('beans'), stew: inv('bean_stew'), tot: inv('grog_tot'), frog: inv('frog_grog'), hp: s.party.members[0].hp, maxHp: s.party.members[0].maxHp, serial: JSON.stringify(u.serialize()) };
});
const choices = (g) => g.eval(() => window.__GAME__.app.overlay.dialogue.choiceMenu?.items.map((i) => i.label.replace(/<[^>]*>/g, '')) ?? null);
const barState = (g) => g.eval(() => {
  const r = window.__GAME__.app.overlay.repairOpen;
  if (!r) return null;
  const onGreen = r.mark.x >= r.zone.x - 2 && r.mark.x <= r.zone.x + r.zone.width + 2;
  const offGreen = r.mark.x < r.zone.x - 14 || r.mark.x > r.zone.x + r.zone.width + 14;
  return { lock: r.lock, onGreen, offGreen, fumbles: r.fumbles, title: r.parts[1]?.text ?? null, zone: r.zone.width };
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
async function respond(g, group, action, keys) {
  await keys.respondKey();
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 5000);
  let groups = null;
  if ((await choices(g)).some((l) => group.test(l))) {
    groups = await choose(g, group, keys);
    await g.wait(250);
    await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 5000);
  }
  return [groups, await choose(g, action, keys)];
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
  for (let cur = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').nav.index); cur !== target; cur = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').nav.index)) await (cur < target ? down() : up());
  await confirm();
  await g.waitFor(() => window.__GAME__.game.scene.getScene('Menu').page?.focused === true, null, 5000);
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

test('salvage and storage with the keyboard: search the loose crates, put it in the stores, leave and come back (still empty), the Ship page says where it is @smoke @ui @world', async ({ page: browser }) => {
  test.setTimeout(300000);
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(browser);
  const keys = KEYS(g);
  await browser.goto('/');
  await g.preset('supplies_demo');
  await g.idle();
  // Off (every chapter): nothing to search, the stores silent.
  expect((await sup(g)).on).toBe(false);
  await go(g, at('cargo_hold', 5, 8));
  await keys.respondKey();
  const offGroups = (await choices(g)) ?? [];
  expect(offGroups.some((l) => /loose crates|stores|gear/i.test(l))).toBe(false);
  if (offGroups.length) await keys.cancel();
  await g.idle();

  await run(g, ON);
  await watchToasts(g);
  const before = await sup(g);
  // At the loose crates: search them (seconds of work), once.
  const [groups, actions] = await respond(g, /^The loose crates$/, /^Search the loose crates/, keys);
  expect(groups).toEqual(expect.arrayContaining(['The loose crates', 'Your gear', 'Leave it']));
  expect(actions[0]).toMatch(/^Search the loose crates \(\d+s\) \[1 left\]$/);
  await g.idle(20000);
  const found = await sup(g);
  expect([found.planks - before.planks, found.nails - before.nails, found.beans - before.beans, found.crates]).toEqual([2, 3, 2, 0]);
  await g.waitFor(() => (window.__toasts ?? []).some((t) => /^Found 2 Planks, 3 Nails, 2 Beans\.$/.test(t)), null, 5000);

  // To the stores: put all the planks away.
  await go(g, at('cargo_hold', 2, 8));
  await respond(g, /^The ship's stores$/, /^Put supplies away$/, keys);
  await choose(g, /^Planks/, keys);
  await choose(g, /^All 3$/, keys);
  await g.idle();
  const stored = await sup(g);
  expect([stored.planks, JSON.parse(stored.stores).hold.planks]).toEqual([0, 3]);

  // Away to the galley and back: the crates stay searched; asking again says why, and costs nothing.
  await go(g, at('galley', 8, 5));
  await go(g, at('cargo_hold', 5, 8));
  const [, again] = await respond(g, /^The loose crates$/, /^Search the loose crates/, keys);
  expect(again[0]).toMatch(/\[0 left\]$/);
  await g.idle();
  await g.waitFor(() => (window.__toasts ?? []).some((t) => /nothing left/.test(t)), null, 5000);
  expect((await sup(g)).planks).toBe(0);

  // Pause > Ship: where the supplies are, what's in them, and what the repair still needs.
  await openPage(g, 'ship', keys);
  const rows = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').page.menu.items.map((i) => `${i.label} ${i.right}`));
  expect(rows).toEqual(expect.arrayContaining(["Ship's stores 3/60", 'Your gear NONE', 'Galley 4 RECIPES', 'To search here 0/1 READY']));
  const target = rows.findIndex((r) => r.startsWith("Ship's stores"));
  for (let i = 0; i < target; i++) await keys.down();
  const detail = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').page.detail.objects.map((o) => o.text ?? '').join(' / '));
  expect(detail).toMatch(/The ship's stores \(Cargo Hold\): 3\/60/);
  expect(detail).toMatch(/Repair materials: 3 Planks/);
  expect(detail).toMatch(/Repairs use what you carry/);
  expect(errors).toEqual([]);
});

test('cooking with a gamepad: up to the galley stove, the stew scorched, Try again, simmer, serve two, eat one from the Items menu @input @ui', async ({ page: browser }) => {
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
    hit: () => press(A, 30, 40),
  };
  await browser.goto('/');
  await g.preset('supplies_demo');
  await g.idle();
  await run(g, SCENARIO_D);
  await go(g, at('galley', 3, 4, 'left'));
  const [groups, actions] = await respond(g, /^The galley stove$/, /^Cook Bean Stew$/, pad);
  expect(groups).toEqual(expect.arrayContaining(['The galley stove', 'Your gear']));
  expect(actions).toEqual(expect.arrayContaining(['Cook Bean Stew', 'Cook Oat Porridge', 'What can I cook?']));
  // The stir, on the real bar: fumbled out (scorched), then Try again, played clean.
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  expect((await barState(g)).title).toMatch(/STIR THE STEW/);
  await fumble(g, 3, pad.hit);
  await g.waitFor(() => !!window.__GAME__.app.overlay.dialogue.choiceMenu, null, 10000);
  expect(await choices(g)).toEqual(['Try again', 'Carry on']);
  await pad.confirm();
  await g.waitFor(() => !!window.__GAME__.app.overlay.repairOpen, null, 10000);
  await hitUntilClosed(g, pad.hit);
  await g.idle(20000);
  const on = await sup(g);
  expect(on.cooking).toMatchObject({ recipe: 'bean_stew', serves: 2 });
  // The scorched try cost a bean (kept through the retry); the stew took two and an onion.
  expect(JSON.parse(on.stores).hold).toEqual({ beans: 1, onions: 1, oats: 4 });
  // Not ready yet: serving waits. The pot simmers on hazard time (he could walk away).
  await run(g, [{ hazardClock: 30 }]);
  await respond(g, /^The galley stove$/, /^Serve the Bean Stew \(2\)$/, pad);
  await g.idle();
  expect((await sup(g)).stew).toBe(2);
  // Eat one: Pause > Items > Bean Stew.
  await g.eval(() => { window.__GAME__.app.session.party.members[0].hp -= 30; });
  await openPage(g, 'items', pad);
  const items = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').page.menu.items.map((i) => i.value));
  for (let i = 0; i < items.indexOf('bean_stew'); i++) await pad.down();
  await pad.confirm();
  // Who eats it (the party has three): the captain, first (the timed effect is his).
  await g.waitFor(() => !!window.__GAME__.game.scene.getScene('Menu').page.targetMenu, null, 5000);
  await pad.confirm();
  await g.wait(600);
  const ate = await sup(g);
  expect([ate.stew, ate.maxHp - ate.hp, ate.effects]).toEqual([1, 5, ['full_belly']]);
  expect(errors).toEqual([]);
});

test('gear and draughts: wear the wet cloth in bad air, a grog tot and Frog Grog (the smaller ward, never on top); saved and continued, the same @world @saves', async ({ page: browser }) => {
  test.setTimeout(300000);
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(browser);
  const keys = KEYS(g);
  await browser.goto('/');
  await g.preset('supplies_demo');
  await g.idle();
  await go(g, at('cargo_hold', 9, 11));
  await run(g, SCENARIO_C);
  const access = () => g.eval(() => window.__GAME__.app.session.ship.air.access / window.__GAME__.app.settings.fumeScale());
  await g.wait(300);
  expect(await access()).toBeCloseTo(1, 5);
  // Never worn by itself: put it on by hand.
  await respond(g, /^Your gear$/, /^Wear Wet Cloth$/, keys);
  await g.idle();
  await g.wait(300);
  expect((await sup(g)).worn).toEqual(['wet_cloth']);
  expect(await access()).toBeCloseTo(0.7, 5);
  // Bob's Pot and the goggles don't go together.
  await respond(g, /^Your gear$/, /^Wear Bob's Pot$/, keys);
  await g.idle();
  await watchToasts(g);
  await respond(g, /^Your gear$/, /^Wear Bottle Goggles$/, keys);
  await g.idle();
  await g.waitFor(() => (window.__toasts ?? []).some((t) => /Bob's Pot comes down over the goggles/.test(t)), null, 5000);
  // A grog tot: less reaches the lungs, the hands wobble.
  await run(g, [{ useSupply: 'grog_tot' }]);
  await g.wait(300);
  expect(await access()).toBeCloseTo(0.7 * 0.6, 5);
  // Frog Grog on top of it, drunk from the Items menu as ever (its own ward, its side effect): the smaller of the
  // two wards, never both multiplied, never past the best there ever was (its stench-proof 0.35, under the cloth).
  const frogs = (await sup(g)).frog;
  await openPage(g, 'items', keys);
  const items = await g.eval(() => window.__GAME__.game.scene.getScene('Menu').page.menu.items.map((i) => i.value));
  for (let i = 0; i < items.indexOf('frog_grog'); i++) await keys.down();
  await keys.confirm();
  await g.waitFor(() => !!window.__GAME__.game.scene.getScene('Menu').page.targetMenu, null, 5000);
  await keys.confirm();
  await g.wait(400);
  await keys.cancel();
  await keys.cancel();
  await g.idle();
  expect((await sup(g)).frog).toBe(frogs - 1);
  const ward = await g.eval(() => window.__GAME__.app.session.transient.fumeWard?.scale);
  expect([0.5, 0.35]).toContain(ward);
  await g.wait(300);
  expect(await access()).toBeCloseTo(0.7 * Math.min(ward, 0.6), 5);
  expect(await access()).toBeGreaterThanOrEqual(0.245 - 1e-9);
  // Saved and continued: the gear, the effect, the stores as they were.
  const saved = await g.eval(() => {
    const ok = window.__GAME__.app.saves.save(1, window.__GAME__.app.session).ok;
    return { ok, serial: JSON.stringify(window.__GAME__.app.session.ship.supplies.serialize()), worn: [...window.__GAME__.app.session.ship.beard.worn] };
  });
  expect(saved.ok).toBe(true);
  await browser.reload();
  await g.titleChoose('continue');
  await g.idle();
  const back = await sup(g);
  expect(back.worn).toEqual(saved.worn);
  expect(back.effects).toEqual(['grog_ward']);
  expect(JSON.parse(back.serial).on).toBe(true);
  expect(errors).toEqual([]);
});

test('scarcity on Brutal: nothing on you, the stores bare, every cache taken; the bilge gives a little, then is picked clean until its time comes round @world', async ({ page: browser }) => {
  test.setTimeout(300000);
  const errors = [];
  browser.on('pageerror', (e) => errors.push(e.message));
  const g = new GameDriver(browser);
  const keys = KEYS(g);
  await browser.goto('/');
  await g.preset('supplies_demo');
  await g.idle();
  await g.eval(() => window.__GAME__.app.settings.set('difficulty', 'brutal'));
  await go(g, at('cargo_hold', 10, 14));
  await run(g, [
    { suppliesSystem: true },
    { supplyTransfer: 'hold', item: 'planks', all: true, to: 'store', anywhere: true, announce: false },
    { supplyTransfer: 'hold', item: 'nails', all: true, to: 'store', anywhere: true, announce: false },
    { supplyTransfer: 'hold', item: 'sailcloth', all: true, to: 'store', anywhere: true, announce: false },
    { supplyStore: 'hold', empty: true },
    { supplySource: 'hold_crates', op: 'deplete' },
    { supplySource: 'hold_wreckage', op: 'deplete' },
    { supplySource: 'hold_barrels', op: 'deplete' },
  ]);
  expect(await g.eval(() => window.__GAME__.app.settings.challengePrefs().difficulty)).toBe('brutal');
  const bare = await sup(g);
  expect([bare.planks, bare.nails, bare.stores]).toEqual([0, 0, '{}']);
  await respond(g, /^The bilge$/, /^Scavenge the bilge/, keys);
  await g.idle(30000);
  const got = await sup(g);
  expect([got.planks, got.nails, got.bilge]).toEqual([1, 1, 90]);
  // Picked clean: offered, greyed, and says how long.
  const [, again] = await respond(g, /^The bilge$/, /^Scavenge the bilge/, keys);
  await g.idle();
  expect((await sup(g)).planks).toBe(1);
  await run(g, [{ hazardClock: 90 }]);
  await respond(g, /^The bilge$/, /^Scavenge the bilge/, keys);
  await g.idle(30000);
  expect((await sup(g)).planks).toBe(2);
  expect(again.length).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});
