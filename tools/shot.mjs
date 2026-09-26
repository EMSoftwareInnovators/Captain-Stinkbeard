// Dev helper: open a URL in headless Chromium, wait, and save a screenshot.
// Usage: node tools/shot.mjs <url> <out.png> [waitMs] [width] [height]
// Env: CLIP="x,y,w,h" to crop, FULL=1 for full page.
import { chromium } from '@playwright/test';
const [url, out, wait = '1500', w = '960', h = '672'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForTimeout(+wait);
const opts = { path: out };
if (process.env.CLIP) {
  const [x, y, cw, ch] = process.env.CLIP.split(',').map(Number);
  opts.clip = { x, y, width: cw, height: ch };
}
if (process.env.FULL) opts.fullPage = true;
await page.screenshot(opts);
const ok = await page.evaluate(() => window.__ok || null);
console.log(JSON.stringify(ok));
console.log(logs.filter((l) => !l.includes('[vite]') && !l.includes('404')).join('\n'));
await browser.close();
