import { test, expect } from '@playwright/test';
import { GameDriver } from './driver.js';

/**
 * Story Phase 3 (The Grand Stenchmaster) in a real browser with real key
 * presses: the whole phase from the end of Phase 2, saving and continuing
 * either side of the rename, and the key scenes on a controller that
 * Firefox on macOS leaves unmapped.
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

/** Chapters 9 to 11: from the end of Phase 2 to Frog Grog (the next chapter is already under way). */
async function chapters9to11(g, s, has) {
  // Chapter 9: the Grand Stenchmaster takes command
  expect((await s()).quests.necessary_promotion.status).toBe('active');
  await g.interact('garrick');
  expect(await has('garrick_reforms_heard')).toBe(true);
  await g.interact([12, 16]); // the Stench Log (opens as a book), then the declaration
  await g.skip();
  expect(await has('stenchmaster_declared')).toBe(true);
  expect((await s()).logs.stench_log).toBeGreaterThanOrEqual(4);
  expect((await s()).garrickTitle).toBe('Grand Stenchmaster (self-appointed)');

  // Chapter 10: Blackbeard becomes Stinkbeard (refusing to sniff until the choice runs out)
  expect((await s()).captain).toBe('Captain Blackbeard');
  await g.interact([9, 20]);
  expect(await has('amendment_read')).toBe(true);
  await g.interact('garrick');
  await g.skip();
  expect(await has('captain_named_stinkbeard')).toBe(true);
  expect(await has('rain_started')).toBe(true);
  expect((await s()).captain).toBe('Captain Stinkbeard');
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').player.textureKey)).toBe('char_blackbeard_stinkbeard');

  // Chapter 11: the birth of Frog Grog
  expect((await s()).quests.frog_grog.status).toBe('active');
  await g.travel(9, 24, 'galley');
  await g.skip();
  expect(await has('grog_gathering_seen')).toBe(true);
  await g.interact('mags');
  expect(await has('grog_tasted')).toBe(true);
  await g.travel(14, 3, 'main_deck');
  await g.travel(9, 11, 'captains_quarters');
  await g.interact([16, 8]);
  await g.travel(8, 11, 'main_deck');
  await g.travel(9, 33, 'crew_quarters');
  await g.interact([15, 4]);
  await g.interact([4, 11]);
  await g.travel(8, 3, 'galley');
  await g.skip();
  expect(await has('frog_grog_unlocked')).toBe(true);
  const items = (await s()).items;
  expect(JSON.stringify(items)).toContain('frog_grog');
}

/** Chapters 12 to 14: the changed ship, the sharks, the terms and the second release. */
async function chapters12to14(g, s, has) {
  // Chapter 12: the ship's transformation
  await g.skip();
  expect((await s()).quests.ship_is_changing.status).toBe('active');
  await g.interact([9, 19]);
  await g.interact([11, 18]);
  await g.interact([12, 33]);
  for (const who of ['nell', 'brask', 'jim']) await g.interact(who);
  await g.travel(9, 24, 'galley');
  await g.travel(12, 10, 'cargo_hold');
  await g.interact([5, 3]);
  await g.travel(14, 3, 'galley');
  await g.travel(14, 3, 'main_deck');
  for (const f of ['sails_swollen', 'ropes_sweating', 'bell_coughs', 'wood_yellowing_seen', 'masked_rat_seen']) expect(await has(f), f).toBe(true);
  await g.interact('garrick'); // the report... and the sharks
  await g.skip();

  // Chapter 13: the sharks smell the Gust
  expect(await has('sharks_sighted')).toBe(true);
  expect((await s()).sharks.fins).toBeGreaterThan(0);
  await g.goto(13, 19);
  await g.skip();
  expect(await has('port_impact_seen')).toBe(true);
  expect((await s()).sharks.level).toBe('attacking');
  await g.interact([16, 21]); // no plank yet: Jory sends you for one
  expect(await has('hull_patched')).toBe(false);
  await g.interact([7, 32]);
  await g.interact([16, 21]); // the timing game
  expect(await has('hull_patched')).toBe(true);
  await g.interact([8, 2]);
  expect(await has('rudder_checked')).toBe(true);
  await g.goto(10, 13).catch(() => {});
  await g.skip();
  expect(await has('beard_bait_seen')).toBe(true);
  await g.goto(13, 21).catch(() => {});
  await g.skip();
  expect(await has('grog_spilled')).toBe(true);
  expect((await s()).sharks.level).toBe('swarm');
  await g.interact('garrick');
  expect(await has('rowboat_plan')).toBe(true);
  await g.interact([4, 24]); // lower the rowboat; the sharks follow
  await g.skip();
  expect(await has('sharks_lured')).toBe(true);

  // Chapter 14: the Grand Stenchmaster's terms
  expect((await s()).quests.stenchmaster_temporarily.status).toBe('active');
  await g.interact([4, 24]);
  expect(await has('garrick_returned')).toBe(true);
  await g.interact('jory');
  await g.interact('garrick');
  expect(await has('stenchmaster_terms_set')).toBe(true);
  await g.interact('squawks', 0);
  expect(await has('squawks_first_new_feather_yellow')).toBe(true);
  expect((await s()).garrickTitle).toBe('Grand Stenchmaster');
  await g.interact([4, 24]); // off to another ocean
  await g.skip();
}

async function expectPhase3Complete(g, s, errors) {
  const end = await s();
  const flags = flagsOf(end);
  for (const f of ['garrick_evacuated_again', 'second_release_seen', 'p3_complete', 'stomach_alarm_protocol']) expect(flags.has(f), f).toBe(true);
  for (const q of ['necessary_promotion', 'what_did_you_call_me', 'frog_grog', 'ship_is_changing', 'sharks', 'stenchmaster_temporarily']) expect(end.quests[q].status, q).toBe('completed');
  expect(end.captain).toBe('Captain Stinkbeard');
  expect(end.busy).toBe(false);
  expect(errors).toEqual([]);
}

test('Story Phase 3 plays from the end of Phase 2 to the second distant release', { tag: ['@phase3', '@story'] }, async ({ page }) => {
  test.setTimeout(30 * 60 * 1000);
  const { g, errors } = await open(page);
  const s = () => g.state();
  const has = async (flag) => flagsOf(await s()).has(flag);
  await g.preset('phase2_complete');
  await g.skip();
  await chapters9to11(g, s, has);
  await chapters12to14(g, s, has);
  await expectPhase3Complete(g, s, errors);
});

test('Phase 3 chapters 12 to 14 play from the Frog Grog Unlocked preset', { tag: ['@phase3', '@story'] }, async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  const { g, errors } = await open(page);
  const s = () => g.state();
  const has = async (flag) => flagsOf(await s()).has(flag);
  await g.preset('frog_grog_unlocked');
  // The preset starts in the galley the next morning (buy Frog Grog from Mags here if wanted).
  await g.travel(14, 3, 'main_deck');
  await chapters12to14(g, s, has);
  await expectPhase3Complete(g, s, errors);
});

test('the captain is never walled in by people', { tag: ['@phase3', '@world', '@smoke'] }, async ({ page }) => {
  const { g, errors } = await open(page);
  await g.preset('phase3_start');
  await g.skip();
  await g.eval(() => {
    const sv = window.__GAME__.game.scene.getScene('World').services.world;
    sv.place('player', 7, 15, 'down');
    sv.spawn('wick', { x: 6, y: 15, facing: 'right' });
    sv.spawn('rook', { x: 8, y: 15, facing: 'left' });
    sv.spawn('bob', { x: 7, y: 14, facing: 'down' });
    sv.spawn('sully', { x: 7, y: 16, facing: 'up' });
    for (const a of window.__GAME__.game.scene.getScene('World').actors.values()) a.scripted = false;
  });
  await g.wait(300);
  await g.tap('ArrowRight', 60, 600);
  const st = await g.state();
  expect([st.x, st.y]).toEqual([8, 15]);
  const rook = await g.eval(() => { const a = window.__GAME__.game.scene.getScene('World').actors.get('rook'); return [a.tx, a.ty]; });
  expect(rook).toEqual([7, 15]);
  // With a way out, people block as usual.
  await g.tap('ArrowLeft', 60, 600);
  const st2 = await g.state();
  expect([st2.x, st2.y]).toEqual([8, 15]);
  expect(errors).toEqual([]);
});

test('saving and continuing either side of the rename', { tag: ['@phase3', '@saves'] }, async ({ page }) => {
  const { g, errors } = await open(page);
  await g.preset('pre_rename');
  await g.skip();
  await g.eval(() => window.__GAME__.game.scene.getScene('World').autosave());
  await page.reload();
  await g.waitFor(() => !!window.__GAME__?.app);
  await g.titleChoose('continue');
  await g.skip();
  expect((await g.state()).captain).toBe('Captain Blackbeard');

  await g.interact('garrick');
  await g.skip();
  expect((await g.state()).captain).toBe('Captain Stinkbeard');
  await g.skip();
  await g.eval(() => window.__GAME__.game.scene.getScene('World').autosave());
  const summary = await g.eval(() => window.__GAME__.app.saves.read('auto').summary);
  expect(summary.leader).toBe('Stinkbeard');
  await page.reload();
  await g.waitFor(() => !!window.__GAME__?.app);
  await g.titleChoose('continue');
  await g.skip();
  const s = await g.state();
  expect(s.captain).toBe('Captain Stinkbeard');
  expect(flagsOf(s).has('captain_named_stinkbeard')).toBe(true);
  expect(await g.eval(() => window.__GAME__.game.scene.getScene('World').player.textureKey)).toBe('char_blackbeard_stinkbeard');
  expect(errors).toEqual([]);
});

test('the rename and the hull patch play on a controller Firefox leaves unmapped', { tag: ['@phase3', '@input'] }, async ({ page }) => {
  test.setTimeout(6 * 60 * 1000);
  const { g, errors } = await open(page, {
    initScript: () => {
      const centred = 8 / 3.5 - 1; // a hat switch's "no direction"
      const mk = (id, buttons, axes, index) => ({
        id, index, connected: true, mapping: '', timestamp: 0, axes,
        buttons: Array.from({ length: buttons }, () => ({ pressed: false, value: 0, touched: false })),
      });
      const list = [mk('05ac-0000-Some HID Device', 2, [0, -1], 0), mk('045e-0b20-Xbox Wireless Controller', 16, [0, 0, -1, 0, 0, -1, 0, 0, 0, centred], 1)];
      window.__pad = list[1];
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

  // The rename, including its choices, on the pad's A button alone.
  await g.preset('pre_rename');
  await g.skip();
  await g.approach('garrick');
  await mashUntil(async () => {
    const st = await g.state();
    return flagsOf(st).has('rain_started') && !st.busy;
  });
  expect((await g.state()).captain).toBe('Captain Stinkbeard');
  expect(await g.eval(() => window.__GAME__.app.input.device)).toBe('gamepad');

  // The hull patch: fetch a plank and hit the nails in the green, with A.
  await g.preset('shark_attack');
  await g.skip();
  await g.approach([7, 32]);
  await mashUntil(async () => flagsOf(await g.state()).has('plank_fetched') && !(await g.state()).busy);
  await g.approach([16, 21]);
  await mashUntil(async () => {
    const st = await g.state();
    return flagsOf(st).has('hull_patched') && !st.busy;
  });
  const clean = await g.eval(() => window.__GAME__.app.session.story.getVar('hull_patch_clean'));
  expect(clean).toBe(4);
  expect(errors).toEqual([]);
});
