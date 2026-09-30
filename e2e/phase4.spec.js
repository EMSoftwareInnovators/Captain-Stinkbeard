import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Story Phase 4 (Life Around the Dead Center) in a real browser with real
 * key presses: the whole phase from the end of Phase 3 (through the bed in
 * the captain's cabin), the Shark Duty half on its own from its preset, and
 * quick checks that the Center seals the room it fills and the Forecast
 * Board opens.
 *
 * Shark Duty is played properly: the driver walks to each shark at the rail,
 * faces it and presses Confirm, and the timing bar is struck in the green.
 */

const flagsOf = (s) => new Set(s.flags);

async function open(page, { initScript = null } = {}) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (initScript) await page.addInitScript(initScript);
  await page.goto('/');
  const g = new GameDriver(page);
  await g.waitFor(() => !!window.__GAME__?.app);
  expect(await g.eval(() => window.__GAME__.app.validation.errors)).toEqual([]);
  return { g, errors };
}

const deadCenter = (g) => g.eval(() => window.__GAME__.app.session.story.getValue('dead_center'));
const onMap = (g) => g.eval(() => window.__GAME__.game.scene.getScene('World').model.id);
const objectiveDone = (quest, obj) => `window.__GAME__.app.session.quests.isObjectiveDone('${quest}', '${obj}')`;

/** Chapter 15: bed, the morning ration, the first forecast, the breakfast evacuation, the board. */
async function chapter15(g, s, has) {
  await g.travel(9, 11, 'captains_quarters');
  await g.goto(13, 6);
  await g.interact([14, 5], 0); // "Sleep until morning"
  expect(await has('p4_started')).toBe(true);
  expect(await has('garrick_grand_stenchmaster_sash')).toBe(true);
  await g.travel(8, 11, 'main_deck');
  await g.travel(9, 24, 'galley');
  await g.skip();
  expect(await has('p4_ration_attended')).toBe(true);
  await g.interact('garrick');
  expect(await has('forecast_day1_shown')).toBe(true);
  await g.interact([8, 7]); // the forecast on the table... and the Center rolls in
  expect(await deadCenter(g)).toBe('galley_breakfast');
  await g.travel(14, 3, 'main_deck'); // up the ladder: the only way out
  await g.skip();
  expect(await has('forecast_in_grog')).toBe(true);
  await g.interact([10, 16]); // the Forecast Board (opens as a book)
  expect(await has('forecast_board_seen')).toBe(true);
  expect((await s()).logs.forecasts).toBeGreaterThanOrEqual(1);
}

/** Chapter 16: life around the Center (bell protocol, vignettes A-E). */
async function chapter16(g, s, has) {
  await g.skip();
  await g.interact([10, 30]); // the bell protocol notice
  expect(await has('bell_protocol_read')).toBe(true);
  await g.skip(); // the washroom: Gristle's inside
  expect(await has('washroom_incident_started')).toBe(true);
  if ((await onMap(g)) !== 'main_deck') await g.travel(13, 3, 'main_deck');
  await g.interact([6, 33]); // haul him out through the air scuttle
  expect(await has('gristle_rescued')).toBe(true);
  await g.skip(); // the galley stove
  await g.interact([12, 27]); // the stovepipe damper
  expect(await has('stove_damper_closed')).toBe(true);
  await g.travel(9, 24, 'galley');
  await g.travel(12, 10, 'cargo_hold');
  await g.interact([16, 4]); // lunch, as biscuits
  expect(await has('lunch_salvaged')).toBe(true);
  await g.travel(14, 3, 'galley');
  await g.travel(14, 3, 'main_deck');
  await g.interact('jim');
  await g.skip(); // the sleeping quarters are taken
  await g.interact('bob'); // the deck camp, Pete's pillow, then three bells at 3 AM
  await g.skip();
  expect(await has('night_alarm_started')).toBe(true);
  await g.interact('squawks'); // Squawks first
  expect(await has('night_squawks_saved')).toBe(true);
  await g.travel(8, 11, 'main_deck');
  await g.skip();
  expect(await has('grog_thrown_overboard')).toBe(true);
  await g.skip(); // the quarterdeck
  await g.interact([9, 6]); // back to the helm once it has moved on
  await g.skip();
  expect(await has('course_restored')).toBe(true);
}

/** Chapter 17: the worst places, the beard REFRESHED, seven feathers and bald again. */
async function chapter17(g, s, has) {
  await g.skip();
  await g.travel(9, 33, 'crew_quarters');
  await g.travel(3, 3, 'washroom');
  await g.interact([7, 5]); // one more serious beard wash
  expect(await has('beard_refreshed')).toBe(true);
  await g.travel(5, 8, 'crew_quarters');
  await g.travel(13, 3, 'main_deck');
  await g.interact([12, 16]); // the Stench Log's note on the beard
  expect(await has('beard_refresh_protested')).toBe(true);
  await g.skip();
  await g.travel(9, 11, 'captains_quarters');
  await g.interact('squawks'); // seven feathers... three bells
  expect(await has('squawks_reached_seven_feathers')).toBe(true);
  await g.travel(8, 11, 'main_deck');
  await g.skip();
  await g.travel(9, 11, 'captains_quarters');
  await g.skip();
  expect(await has('squawks_bald_again')).toBe(true);
}

/** Chapters 18 and 19: Shark Duty, the frenzy, the repairs and tomorrow's forecast. */
async function chapters18to19(g, s, has) {
  await g.skip();
  if ((await onMap(g)) !== 'main_deck') await g.travel(8, 11, 'main_deck');
  await g.interact([13, 24]); // a pole from the duty barrel
  expect(await has('shark_duty_reported')).toBe(true);
  expect(await g.sharkDuty(objectiveDone('shark_duty', 'repel'))).toBeGreaterThanOrEqual(3);
  await g.skip();
  expect(await has('piracy_rant_done')).toBe(true);
  await g.interact('jory');
  await g.interact('ned'); // "HOW MANY?" "HUNDREDS."
  expect(await has('hundreds_seen')).toBe(true);
  expect((await s()).sharks.level).toBe('swarm');
  expect(await g.sharkDuty(objectiveDone('shark_duty', 'numbers'))).toBeGreaterThanOrEqual(3);
  await g.skip();
  expect(await has('garrick_toast_seen')).toBe(true);
  await g.interact('garrick'); // no. SHARK MANAGEMENT. Three bells.
  expect(await has('garrick_refused_duty')).toBe(true);
  expect(await deadCenter(g)).toBe('port_waterline');
  await g.interact('squawks'); // into the coat: the frenzy, "Ship smaller.", IT IS ACTIVELY ENDING
  for (const f of ['frenzy_started', 'ship_smaller_seen', 'actively_ending', 'waterline_logged']) expect(await has(f), f).toBe(true);
  await g.skip();
  expect(await g.eval(() => window.__GAME__.app.session.story.getVar('p4_hull_damage'))).toBe(3);

  // Chapter 19: repair everything (the timing bar), then the worst forecast yet.
  await g.skip();
  expect(await deadCenter(g)).toBe(null);
  await g.interact([16, 19]);
  await g.skip(); // supervisors don't hammer
  expect(await has('supervisor_debate')).toBe(true);
  await g.interact([16, 21]);
  await g.interact([16, 23]);
  for (const f of ['repair_board_done', 'repair_rope_done', 'repair_patch_done']) expect(await has(f), f).toBe(true);
  await g.interact('garrick'); // upside down: THE CENTER IS COMING BACK
  expect(await has('center_returning')).toBe(true);
  expect(await deadCenter(g)).toBe('port_waterline');
  // Clear aft by the cabin door (or forward by the bell, if the crew are in the way).
  await g.goto(10, 13).catch(() => g.goto(10, 31));
  // The evacuation scene starts on the next frame; wait for it, then play it out.
  await g.waitFor(() => window.__GAME__.app.session.story.has('repair_evacuated'), null, 10000);
  await g.skip();
}

async function expectPhase4Complete(g, s, errors) {
  const end = await s();
  const flags = flagsOf(end);
  for (const f of ['fresh_repair_destroyed', 'forecast_drunk', 'three_hundred_more', 'yellow_wake_seen', 'tomorrow_forecast_seen', 'p4_complete']) {
    expect(flags.has(f), f).toBe(true);
  }
  for (const q of ['todays_forecast', 'life_around_center', 'worst_places', 'seven_feathers', 'shark_duty', 'repair_it_again']) {
    expect(end.quests[q].status, q).toBe('completed');
  }
  expect(end.captain).toBe('Captain Stinkbeard');
  expect(end.garrickTitle).toBe('Grand Stenchmaster');
  expect(end.logs.forecasts).toBe(7);
  expect(end.sharks.level).toBe('swarm'); // the shark crisis is not over
  expect(await deadCenter(g)).toBe('treasure_hold');
  expect(end.busy).toBe(false);
  expect(errors).toEqual([]);
}

test('Story Phase 4 plays from the end of Phase 3 to tomorrow\'s forecast', { tag: ['@phase4', '@story'] }, async ({ page }) => {
  test.setTimeout(40 * 60 * 1000);
  const { g, errors } = await open(page);
  const s = () => g.state();
  const has = async (flag) => flagsOf(await s()).has(flag);
  await g.preset('phase3_complete');
  await g.skip();
  expect(await has('p4_started')).toBe(false); // Phase 4 waits for the bed
  await chapter15(g, s, has);
  await chapter16(g, s, has);
  await chapter17(g, s, has);
  await chapters18to19(g, s, has);
  await expectPhase4Complete(g, s, errors);
});

test('Phase 4 Shark Duty to the end plays from the Shark Duty preset', { tag: ['@phase4', '@story'] }, async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  const { g, errors } = await open(page);
  const s = () => g.state();
  const has = async (flag) => flagsOf(await s()).has(flag);
  await g.preset('p4_shark_duty');
  await chapters18to19(g, s, has);
  await expectPhase4Complete(g, s, errors);
});

test('the Dead Center seals the room it fills, and says why', { tag: ['@phase4', '@world', '@smoke'] }, async ({ page }) => {
  const { g, errors } = await open(page);
  await g.preset('p4_washroom_incident');
  await g.skip();
  expect(await onMap(g)).toBe('crew_quarters');
  expect(await deadCenter(g)).toBe('washroom');
  await g.goto(3, 4);
  await g.tap('ArrowUp', 60, 500);
  expect(await g.uiState()).toMatch(/line|typing/); // "The door won't budge."
  await g.skip();
  expect(await onMap(g)).toBe('crew_quarters');
  expect(errors).toEqual([]);
});

test('the Forecast Board opens as a book from the Grand Stenchmaster\'s station', { tag: ['@phase4', '@ui', '@smoke'] }, async ({ page }) => {
  const { g, errors } = await open(page);
  await g.preset('p4_life_around_center');
  await g.skip();
  await g.approach([10, 16]);
  await g.tap('KeyZ', 50, 400);
  await g.tap('KeyZ', 50, 400); // past "The Forecast Board. A crayon cloud..."
  await g.waitFor(() => {
    const m = window.__GAME__.game.scene.getScene('Menu');
    return window.__GAME__.game.scene.isActive('Menu') && !!m.bookMode;
  }, null, 15000);
  await g.skip();
  expect((await g.state()).busy).toBe(false);
  expect(errors).toEqual([]);
});

test('after Phase 4, Jory lets the captain take an optional Shark Duty shift', { tag: ['@phase4', '@world'] }, async ({ page }) => {
  const { g, errors } = await open(page);
  await g.preset('p4_complete');
  await g.interact('jory', 0); // his line, then "Take a shift"
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').sharkDuty.sessionId)).toBe('open_watch');
  expect(await g.sharkDuty('(window.__dutyT0 ??= Date.now(), Date.now() - window.__dutyT0 > 25000)')).toBeGreaterThanOrEqual(1);
  await g.interact('jory', 0); // "Stand down"
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').sharkDuty.sessionId)).toBe(null);
  expect(errors).toEqual([]);
});

test('Shark Duty and the choices play on a controller', { tag: ['@phase4', '@input'] }, async ({ page }) => {
  test.setTimeout(6 * 60 * 1000);
  const { g, errors } = await open(page, {
    initScript: () => {
      const mk = (id, buttons, axes, index) => ({
        id, index, connected: true, mapping: 'standard', timestamp: 0, axes,
        buttons: Array.from({ length: buttons }, () => ({ pressed: false, value: 0, touched: false })),
      });
      const list = [mk('045e-0b20-Xbox Wireless Controller', 17, [0, 0, 0, 0], 0)];
      window.__pad = list[0];
      navigator.getGamepads = () => list;
    },
  });
  const A = 0;
  const press = async (button, ms = 60) => {
    await page.evaluate((b) => { window.__pad.buttons[b].pressed = true; window.__pad.buttons[b].value = 1; }, button);
    await page.waitForTimeout(ms);
    await page.evaluate((b) => { window.__pad.buttons[b].pressed = false; window.__pad.buttons[b].value = 0; }, button);
    await page.waitForTimeout(110);
  };
  /** Presses A until `done`, striking the timing bar on the green. */
  const mashUntil = async (done) => {
    for (let i = 0; i < 900; i++) {
      if (await done()) return;
      const repair = await g.eval(() => {
        const r = window.__GAME__.app.overlay.repairOpen;
        return r ? { hit: r.lock <= 0 && r.mark.x >= r.zone.x && r.mark.x <= r.zone.x + r.zone.width } : null;
      });
      if (repair && !repair.hit) {
        await page.waitForTimeout(16);
        continue;
      }
      await press(A, repair ? 30 : 40);
    }
    throw new Error('never finished');
  };
  const idle = async () => !(await g.state()).busy;
  const progress = async () => (await g.state()).quests.shark_duty.objectives.repel.progress;

  // Report to the rail and see off two sharks, shoving with A.
  await g.preset('p4_shark_duty');
  await g.approach([13, 24]);
  await mashUntil(async () => flagsOf(await g.state()).has('shark_duty_reported') && (await idle()));
  for (let n = 0; n < 40 && (await progress()) < 2; n++) {
    const inc = await g.eval(() => {
      const w = window.__GAME__.game.scene.getScene('World');
      const d = w.sharkDuty;
      if (!d?.active || d.responding || w.isBusy()) return null;
      const p = w.player;
      return d.incidents.map((i) => [i.x, i.y]).sort((a, b) => Math.abs(a[0] - p.tx) + Math.abs(a[1] - p.ty) - Math.abs(b[0] - p.tx) - Math.abs(b[1] - p.ty))[0] ?? null;
    });
    if (!inc) {
      await page.waitForTimeout(250);
      continue;
    }
    await g.approach(inc).catch(() => {});
    const before = await progress();
    await mashUntil(async () => (await progress()) > before || !(await g.eval(([x, y]) => !!window.__GAME__.game.scene.getScene('World').sharkDuty.targetAt(x, y), inc)));
  }
  expect(await progress()).toBeGreaterThanOrEqual(2);
  expect(await g.eval(() => window.__GAME__.app.input.device)).toBe('gamepad');

  // A choice on the pad: Jory's optional shift after the phase ("Take a shift" is first).
  await g.preset('p4_complete');
  await g.approach('jory');
  await mashUntil(async () => flagsOf(await g.state()).has('optional_duty_on') && (await idle()));
  expect(errors).toEqual([]);
});
