import { test, expect } from '@playwright/test';

/**
 * No text runs off the screen or out of the width it was given: every pause
 * menu page and every row in it at the end of Phase 3, and every banner and
 * tip box in the game's scripts (a banner too long for one line wraps, quest
 * objectives wrap under their mark).
 */
test('no text runs off the screen in menus, banners or tips', { tag: ['@ui'] }, async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForFunction(() => !!window.__GAME__?.app);
  await page.waitForFunction(() => window.__GAME__.game.scene.isActive('Title'), null, { timeout: 120000 });
  await page.evaluate(() => window.__GAME__.app.settings.set('textSpeed', 'instant'));
  await page.evaluate(() => window.__GAME__.test.preset('phase3_complete'));
  await page.waitForFunction(() => window.__GAME__.game.scene.isActive('World'));
  await page.waitForTimeout(1500);
  const scan = (label) => page.evaluate((label) => {
    const out = [];
    for (const key of ['Overlay', 'Menu', 'World']) {
      const sc = window.__GAME__.game.scene.getScene(key);
      if (!sc || !window.__GAME__.game.scene.isActive(key)) continue;
      for (const o of sc.children.list) {
        if (o.type !== 'BitmapText' || !o.visible || !o.text) continue;
        if (key === 'World' && o.scrollFactorX !== 0) continue;
        const w = o.textWidth ?? o.width;
        const right = key === 'Menu' ? 312 : 321;
        const bad = o.x < 0 || o.x + w > right || (o.maxTextWidth && w > o.maxTextWidth + 1);
        if (bad && o.alpha > 0) out.push(`${label} [${key}] x=${o.x} w=${w} max=${o.maxTextWidth || '-'}: ${o.text.replace(/\n/g, ' / ').slice(0, 70)}`);
      }
    }
    return out;
  }, label);
  const report = new Set();
  const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.down(k); await page.waitForTimeout(40); await page.keyboard.up(k); await page.waitForTimeout(110); } };
  // Menus: every nav entry, every row in each page
  await key('KeyC'); await page.waitForTimeout(500);
  const navCount = await page.evaluate(() => window.__GAME__.game.scene.getScene('Menu').navList.length);
  for (let n = 0; n < navCount; n++) {
    const nav = await page.evaluate(() => { const m = window.__GAME__.game.scene.getScene('Menu'); return m.navList[m.nav.index].value; });
    (await scan(`menu ${nav}`)).forEach((l) => report.add(l));
    if (!['quit', 'save', 'options'].includes(nav)) {
      await key('KeyZ');
      for (let i = 0; i < 30; i++) { (await scan(`menu ${nav} row ${i}`)).forEach((l) => report.add(l)); await key('ArrowDown'); }
      await key('KeyE'); (await scan(`menu ${nav} tab`)).forEach((l) => report.add(l));
      for (let i = 0; i < 20; i++) { (await scan(`menu ${nav} tab row ${i}`)).forEach((l) => report.add(l)); await key('ArrowDown'); }
      await key('KeyX'); await key('KeyX');
      const open = await page.evaluate(() => window.__GAME__.game.scene.isActive('Menu'));
      if (!open) { await key('KeyC'); await page.waitForTimeout(400); await page.evaluate((i) => { const m = window.__GAME__.game.scene.getScene('Menu'); m.nav.index = i; m.nav.render?.(); m.preview(m.navList[i].value); }, n); }
    }
    await key('ArrowDown'); await page.waitForTimeout(150);
  }
  await key('KeyX'); await page.waitForTimeout(500);
  // Banners and tutorials from every script
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
    (await scan(s.banner ? 'banner' : 'tutorial')).forEach((l) => report.add(l));
    if (s.tutorial) { await page.evaluate(() => { const t = window.__GAME__.app.overlay.tutorialOpen; t.parts.forEach((p) => p.destroy()); window.__GAME__.app.overlay.tutorialOpen = null; t.resolve(); }); }
    else await page.waitForTimeout(1300);
  }
  expect([...report]).toEqual([]);
    expect(errors).toEqual([]);
});
