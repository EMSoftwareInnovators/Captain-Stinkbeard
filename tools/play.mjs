// Dev helper: drive the running dev server with a small script and capture
// screenshots. Uses the same GameDriver as the E2E tests.
//
//   node tools/play.mjs <script.txt> [outDir] [url]
//
// One command per line ('#' starts a comment):
//   wait <ms>                 press <Key> [holdMs]        hold <Key> <ms>
//   keys <Key> <Key> ...      mash <ms> [Key]             shot <name>
//   eval <js>                 log <js>                    waitfor <js>
//   newgame                   skip [choice...]            idle
//   walk <dir> <tiles>        goto <x> <y>                travel <x> <y> <map>
//   approach <npc>|<x> <y>    talk <npc>|<x> <y> [choice...]
//   fight <enemyId>           fightuntil [win|lose]       battle (confirm until it ends)
//   face <dir>                preset <id> (data/debug/presets.json; fast text)
//   duty <js>                 play Shark Duty until the expression holds
//   skipshot <prefix> [choice...]   like skip, saving a screenshot of every line
//   shots <prefix> <count> <ms>     screenshots at an interval (set-pieces)
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import { GameDriver } from '../e2e/driver.js';

const [scriptPath, outDir = 'tmp/play', url = 'http://localhost:5173/'] = process.argv.slice(2);
if (!scriptPath) {
  console.log('usage: node tools/play.mjs <script.txt> [outDir] [url]');
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });
const lines = fs.readFileSync(scriptPath, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 672 } });
const logs = [];
page.on('console', (m) => { if (!m.text().includes('[vite]')) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.goto(url);
const g = new GameDriver(page);
const target = (rest) => (rest.length >= 2 && !Number.isNaN(Number(rest[0])) ? [Number(rest[0]), Number(rest[1])] : rest[0]);

let failed = false;
for (const line of lines) {
  const [cmd, ...rest] = line.split(' ');
  const arg = rest.join(' ');
  try {
    switch (cmd) {
      case 'wait': await g.wait(Number(arg)); break;
      case 'press': await g.tap(rest[0], Number(rest[1] ?? 60), 60); break;
      case 'hold': await page.keyboard.down(rest[0]); await g.wait(Number(rest[1])); await page.keyboard.up(rest[0]); break;
      case 'keys': await g.keys(...rest); break;
      case 'mash': {
        const until = Date.now() + Number(rest[0]);
        while (Date.now() < until) await g.tap(rest[1] ?? 'KeyZ', 40, 140);
        break;
      }
      case 'shot': await page.screenshot({ path: `${outDir}/${arg}.png` }); break;
      case 'eval': await page.evaluate(arg); break;
      case 'log': console.log(`${arg} =>`, JSON.stringify(await page.evaluate(arg))); break;
      case 'waitfor': await g.waitFor(arg); break;
      case 'newgame': await g.newGame(); break;
      case 'skip': await g.skip(...rest.map(Number)); break;
      case 'idle': await g.idle(); break;
      case 'walk': await g.walk(rest[0], Number(rest[1])); break;
      case 'goto': await g.goto(Number(rest[0]), Number(rest[1])); break;
      case 'travel': await g.travel(Number(rest[0]), Number(rest[1]), rest[2]); break;
      case 'approach': await g.approach(target(rest)); break;
      case 'talk': {
        const t = target(rest);
        const picks = rest.slice(Array.isArray(t) ? 2 : 1).map(Number);
        await g.interact(t, ...picks);
        break;
      }
      case 'fight': if (!(await g.fight(rest[0]))) console.log(`(${rest[0]} already gone)`); break;
      case 'fightuntil': await g.fightUntil(rest[0] || 'win'); break;
      case 'battle': await g.settleBattle(); break;
      case 'duty': console.log(`duty: ${await g.sharkDuty(arg)} answered`); break;
      case 'preset': await g.preset(rest[0]); await g.wait(200); break;
      case 'skipshot': {
        const picks = rest.slice(1).map(Number);
        let n = 0;
        let inRepair = false;
        for (let guard = 0; guard < 600; guard++) {
          const st = await g.uiState();
          if (st === 'idle') break;
          if (st === 'battle') { await g.settleBattle(); continue; }
          if (st === 'repair') {
            // one shot of each timing panel, as it opens
            if (!inRepair) await page.screenshot({ path: `${outDir}/${rest[0]}_${String(n++).padStart(3, '0')}.png` });
            inRepair = true;
            await g.repairTick();
            continue;
          }
          inRepair = false;
          if (st === 'book') {
            await g.wait(250);
            await page.screenshot({ path: `${outDir}/${rest[0]}_${String(n++).padStart(3, '0')}.png` });
            await g.tap('KeyX', 45, 250);
            continue;
          }
          if (st === 'line' || st === 'tutorial' || st === 'choice') {
            await page.screenshot({ path: `${outDir}/${rest[0]}_${String(n++).padStart(3, '0')}.png` });
            if (st === 'choice') {
              const k = picks.length ? picks.shift() : 0;
              for (let i = 0; i < k; i++) await g.tap('ArrowDown', 40, 90);
            }
            await g.tap('KeyZ', 45, 60);
          } else if (await page.evaluate(() => !!window.__GAME__.app.cinema?.insertOpen)) {
            await page.screenshot({ path: `${outDir}/${rest[0]}_${String(n++).padStart(3, '0')}.png` });
            await g.tap('KeyZ', 45, 60);
          }
          await g.wait(110);
        }
        console.log(`skipshot ${rest[0]}: ${n} shots`);
        break;
      }
      case 'shots': {
        for (let i = 0; i < Number(rest[1]); i++) {
          await page.screenshot({ path: `${outDir}/${rest[0]}_${String(i).padStart(3, '0')}.png` });
          await g.wait(Number(rest[2]));
        }
        break;
      }
      case 'face': await g.tap({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[rest[0]], 40, 150); break;
      default: throw new Error(`unknown command "${cmd}"`);
    }
  } catch (err) {
    console.log(`FAILED at "${line}": ${err.message.split('\n')[0]}`);
    await page.screenshot({ path: `${outDir}/error.png` });
    try { console.log('state:', JSON.stringify(await g.state())); } catch { /* no game yet */ }
    failed = true;
    break;
  }
}
console.log(logs.slice(-40).join('\n'));
await browser.close();
process.exit(failed ? 1 : 0);
