import { test, expect } from '@playwright/test';

/**
 * No text runs off the screen, past the width it was given, or over other
 * text: every pause menu page and every row in it (at the end of Phase 3 and
 * at the end of Phase 8, when the logbooks are long), every banner and tip
 * box in the game's scripts, and every quest notification the quest log can
 * make, shown three at a time with the room's name and the FUMES meter up.
 * (tests/textfit.test.js measures the content itself against the fonts.)
 */
async function open(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => !!window.__GAME__?.app);
  await page.waitForFunction(() => window.__GAME__.game.scene.isActive('Title'), null, { timeout: 120000 });
  await page.evaluate(() => window.__GAME__.app.settings.set('textSpeed', 'instant'));
  return errors;
}

/** Every visible line of text in the overlay, the menu and the world's HUD that breaks a rule. */
const scan = (page, label) => page.evaluate((label) => {
  const out = [];
  const game = window.__GAME__.game;
  for (const key of ['Overlay', 'Menu', 'World']) {
    const sc = game.scene.getScene(key);
    if (!sc || !game.scene.isActive(key)) continue;
    const texts = [];
    for (const o of sc.children.list) {
      if (o.type !== 'BitmapText' || !o.visible || !o.text || o.alpha <= 0.05) continue;
      if (key === 'World' && o.scrollFactorX !== 0) continue;
      const b = o.getTextBounds(true).global;
      const w = o.textWidth ?? b.width;
      const r = { x: o.x, y: b.y, w, h: b.height, depth: o.depth, text: o.text.replace(/\n/g, ' / ').slice(0, 60) };
      texts.push(r);
      if (r.x < 0 || r.x + w > 321 || r.y < -1 || r.y + r.h > 225) out.push(`${label} [${key}] off screen x=${r.x} y=${Math.round(r.y)} w=${w} h=${r.h}: ${r.text}`);
      if (o.maxTextWidth && w > o.maxTextWidth + 1) out.push(`${label} [${key}] past its width ${w}>${o.maxTextWidth}: ${r.text}`);
    }
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i];
        const c = texts[j];
        // A modal panel (the save slots, a reader) covers the page under it.
        if (key === 'Menu' && Math.abs(a.depth - c.depth) >= 200) continue;
        const ox = Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x);
        const oy = Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y);
        if (ox > 2 && oy > 2) out.push(`${label} [${key}] overlap: "${a.text}" / "${c.text}"`);
      }
    }
  }
  return out;
}, label);

test('no text runs off the screen or over other text in the pause menu', { tag: ['@ui'] }, async ({ page }) => {
  test.setTimeout(30 * 60 * 1000);
  const errors = await open(page);
  const report = new Set();
  const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.down(k); await page.waitForTimeout(40); await page.keyboard.up(k); await page.waitForTimeout(100); } };
  for (const preset of ['phase3_complete', 'p8_complete']) {
    await page.evaluate((p) => window.__GAME__.test.preset(p), preset);
    await page.waitForFunction(() => window.__GAME__.game.scene.isActive('World'));
    await page.waitForTimeout(1500);
    await key('KeyC'); await page.waitForTimeout(500);
    const navCount = await page.evaluate(() => window.__GAME__.game.scene.getScene('Menu').navList.length);
    for (let n = 0; n < navCount; n++) {
      const nav = await page.evaluate(() => { const m = window.__GAME__.game.scene.getScene('Menu'); return m.navList[m.nav.index].value; });
      (await scan(page, `${preset} menu ${nav}`)).forEach((l) => report.add(l));
      if (!['quit', 'return', 'options'].includes(nav)) {
        await key('KeyZ');
        for (let i = 0; i < 30; i++) { (await scan(page, `${preset} ${nav} row ${i}`)).forEach((l) => report.add(l)); await key('ArrowDown'); }
        await key('KeyE'); (await scan(page, `${preset} ${nav} tab`)).forEach((l) => report.add(l));
        for (let i = 0; i < 20; i++) { (await scan(page, `${preset} ${nav} tab row ${i}`)).forEach((l) => report.add(l)); await key('ArrowDown'); }
        await key('KeyX'); await key('KeyX');
        const open = await page.evaluate(() => window.__GAME__.game.scene.isActive('Menu'));
        if (!open) { await key('KeyC'); await page.waitForTimeout(400); await page.evaluate((i) => { const m = window.__GAME__.game.scene.getScene('Menu'); m.nav.index = i; m.nav.render?.(); m.preview(m.navList[i].value); }, n); }
      }
      await key('ArrowDown'); await page.waitForTimeout(150);
    }
    await key('KeyX'); await page.waitForTimeout(500);
  }
  expect([...report]).toEqual([]);
  expect(errors).toEqual([]);
});

test('no text runs off the screen in banners or tips', { tag: ['@ui'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const errors = await open(page);
  await page.evaluate(() => window.__GAME__.test.preset('phase3_complete'));
  await page.waitForFunction(() => window.__GAME__.game.scene.isActive('World'));
  await page.waitForTimeout(1500);
  const report = new Set();
  const shows = await page.evaluate(() => {
    const found = [];
    const walk = (v) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { if (v.banner) found.push({ banner: v.banner, sub: v.sub }); if (v.tutorial) found.push({ tutorial: v.tutorial, title: v.title }); Object.values(v).forEach(walk); } };
    const db = window.__GAME__.app.content.scripts;
    for (const id of db.ids()) walk(db.get(id));
    return found;
  });
  expect(shows.length).toBeGreaterThan(40);
  for (const s of shows) {
    await page.evaluate((s) => { const o = window.__GAME__.app.overlay; if (s.banner) o.banner(s.banner, s.sub, { hold: 400 }); else o.tutorial({ title: s.title, text: s.tutorial }); }, s);
    await page.waitForTimeout(300);
    (await scan(page, s.banner ? 'banner' : 'tutorial')).forEach((l) => report.add(l));
    if (s.tutorial) { await page.evaluate(() => { const t = window.__GAME__.app.overlay.tutorialOpen; t.parts.forEach((p) => p.destroy()); window.__GAME__.app.overlay.tutorialOpen = null; t.resolve(); }); }
    else await page.waitForTimeout(1300);
  }
  expect([...report]).toEqual([]);
  expect(errors).toEqual([]);
});

test('quest notifications wrap, stack and stay clear of the HUD', { tag: ['@ui'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const errors = await open(page);
  await page.evaluate(() => window.__GAME__.test.preset('p8_complete'));
  await page.waitForFunction(() => window.__GAME__.game.scene.isActive('World'));
  await page.waitForTimeout(1500);
  const toasts = await page.evaluate(() => {
    const out = [];
    for (const q of window.__GAME__.app.content.quests.list()) {
      out.push(`New quest: <y>${q.title}</>`);
      for (const o of q.objectives ?? []) out.push(`★ ${o.text}`);
    }
    return out;
  });
  expect(toasts.length).toBeGreaterThan(100);
  const report = new Set();
  for (let i = 0; i < toasts.length; i += 3) {
    await page.evaluate(({ ts, fumes }) => {
      const o = window.__GAME__.app.overlay;
      o.toasts.clear();
      o.setExposure(fumes ? { value: 0.5, level: 'dense' } : null);
      o.locationTitle('Lower Hull Barracks');
      ts.forEach((t) => o.toasts.push({ text: t, hold: 300 }));
    }, { ts: toasts.slice(i, i + 3), fumes: (i / 3) % 2 === 1 });
    await page.waitForTimeout(240);
    (await scan(page, 'toast')).forEach((l) => report.add(l));
  }
  expect([...report]).toEqual([]);
  expect(errors).toEqual([]);
});
