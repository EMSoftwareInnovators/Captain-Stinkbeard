// Dev helper: drive the game with scripted input and capture screenshots.
// Usage: node tools/play.mjs <script.txt> [outDir]
// Script lines:  wait 500 | press KeyZ [holdMs] | hold ArrowUp 800 | shot name | eval <js> | log <js>
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const [scriptPath, outDir = '/tmp/claude-0/play', url = 'http://localhost:5173/'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const lines = fs.readFileSync(scriptPath, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 672 } });
const logs = [];
page.on('console', (m) => { if (!m.text().includes('[vite]')) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.goto(url);
let failed = false;
for (const line of lines) {
  const [cmd, ...rest] = line.split(' ');
  const arg = rest.join(' ');
  try {
  if (cmd === 'wait') await page.waitForTimeout(Number(arg));
  else if (cmd === 'press') {
    const [key, hold = '60'] = rest;
    await page.keyboard.down(key);
    await page.waitForTimeout(Number(hold));
    await page.keyboard.up(key);
    await page.waitForTimeout(60);
  } else if (cmd === 'hold') {
    const [key, ms] = rest;
    await page.keyboard.down(key);
    await page.waitForTimeout(Number(ms));
    await page.keyboard.up(key);
  } else if (cmd === 'shot') await page.screenshot({ path: `${outDir}/${arg}.png` });
  else if (cmd === 'eval') await page.evaluate(arg);
  else if (cmd === 'log') console.log(`${arg} =>`, JSON.stringify(await page.evaluate(arg)));
  else if (cmd === 'waitfor') await page.waitForFunction(arg, null, { timeout: 30000 });
  else if (cmd === 'advance') {
    // Press confirm N times, each time waiting until a dialogue page/tutorial/choice is waiting.
    const n = Number(rest[0] || 1);
    for (let i = 0; i < n; i++) {
      await page.waitForFunction(() => {
        const o = window.__GAME__?.app?.overlay;
        if (!o) return false;
        const d = o.dialogue;
        return !!o.tutorialOpen || !!d.choiceMenu || (d.resolveLine && !d.typing);
      }, null, { timeout: 20000 });
      await page.waitForTimeout(80);
      await page.keyboard.down('KeyZ');
      await page.waitForTimeout(50);
      await page.keyboard.up('KeyZ');
      await page.waitForTimeout(60);
    }
  } else if (cmd === 'idle') {
    // Wait until the world is free for player input.
    await page.waitForFunction(() => {
      const g = window.__GAME__;
      const w = g?.game.scene.getScene('World');
      return w && g.game.scene.isActive('World') && !w.isBusy() && !w.leaving;
    }, null, { timeout: 30000 });
  } else if (cmd === 'walk') {
    // walk <dir> <tiles>: hold a direction long enough to cross N tiles
    const [dir, tiles] = rest;
    const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[dir];
    await page.keyboard.down(key);
    await page.waitForTimeout(Number(tiles) * 212 + 40);
    await page.keyboard.up(key);
    await page.waitForTimeout(260);
  } else if (cmd === 'goto') {
    // goto x y: path-find with the game's own BFS and walk it with real key presses
    const [tx, ty] = rest.map(Number);
    const path = await page.evaluate(([x, y]) => window.__GAME__.test.pathTo(x, y), [tx, ty]);
    if (!path) { console.log(`no path to ${tx},${ty}`); continue; }
    for (const dir of path) {
      const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[dir];
      await page.keyboard.down(key);
      await page.waitForFunction(([d]) => { const w = window.__GAME__.game.scene.getScene('World'); return w.player.moving || w.isBusy() || w.leaving; }, [dir], { timeout: 3000 }).catch(() => {});
      await page.keyboard.up(key);
      await page.waitForFunction(() => { const w = window.__GAME__.game.scene.getScene('World'); return !w.player.moving; }, null, { timeout: 3000 }).catch(() => {});
    }
    await page.waitForTimeout(120);
  } else if (cmd === 'approach' || cmd === 'touch') {
    // approach <npcId> | approach x y : walk next to an NPC / tile and face it (does not press confirm)
    // touch <enemyId> : walk up to a field enemy and step into it (starts a battle)
    const target = rest.length === 2 ? rest.map(Number) : rest[0];
    const keyOf = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
    let guard = 0;
    for (;;) {
      if (cmd === 'touch') {
        const inBattle = await page.evaluate(() => window.__GAME__.game.scene.isActive('Battle') || window.__GAME__.game.scene.getScene('World').isBusy());
        if (inBattle) break;
      }
      if (++guard > 500) throw new Error(`could not reach ${arg}`);
      const r = await page.evaluate((t) => window.__GAME__.test.stepToward(t), target);
      if (r.missing) throw new Error(`no actor ${arg}`);
      if (r.wait || r.stuck) { await page.waitForTimeout(150); continue; }
      const dir = r.done ? r.face : r.dir;
      await page.waitForFunction(() => { const w = window.__GAME__.game.scene.getScene('World'); return !w.player.moving && !w.isBusy(); }, null, { timeout: 8000 });
      await page.keyboard.down(keyOf[dir]);
      if (r.done) {
        await page.waitForTimeout(40);
        await page.keyboard.up(keyOf[dir]);
        await page.waitForTimeout(140);
        const facing = await page.evaluate(() => window.__GAME__.game.scene.getScene('World').player.facing);
        if (facing === dir && cmd === 'approach') break;
        continue;
      }
      await page.waitForFunction(() => { const w = window.__GAME__.game.scene.getScene('World'); return w.player.moving || w.isBusy() || w.leaving; }, null, { timeout: 3000 }).catch(() => {});
      await page.keyboard.up(keyOf[dir]);
      await page.waitForFunction(() => { const w = window.__GAME__.game.scene.getScene('World'); return !w.player.moving; }, null, { timeout: 3000 }).catch(() => {});
    }
  } else if (cmd === 'skip') {
    // skip [choiceIndex...]: advance dialogue until the world is idle again; picks listed choices in order
    const picks = rest.map(Number);
    for (let n = 0; n < 400; n++) {
      const st = await page.evaluate(() => {
        const g = window.__GAME__;
        const o = g.app.overlay;
        const w = g.game.scene.getScene('World');
        const d = o.dialogue;
        if (o.tutorialOpen) return 'tutorial';
        if (d.choiceMenu) return 'choice';
        if (d.resolveLine && !d.typing) return 'line';
        if (d.resolveLine && d.typing) return 'typing';
        const worldIdle = w && g.game.scene.isActive('World') && !w.isBusy() && !w.leaving;
        return worldIdle ? 'idle' : 'busy';
      });
      if (st === 'idle') break;
      if (st === 'choice' && !picks.length) {
        // No scripted pick: back out (choices default to their last option on cancel).
        await page.keyboard.down('KeyX');
        await page.waitForTimeout(50);
        await page.keyboard.up('KeyX');
        await page.waitForTimeout(120);
        continue;
      }
      if (st === 'choice') {
        const k = picks.shift();
        for (let i = 0; i < k; i++) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(90); }
      }
      if (st === 'line' || st === 'tutorial' || st === 'choice') {
        await page.waitForTimeout(60);
        await page.keyboard.down('KeyZ');
        await page.waitForTimeout(50);
        await page.keyboard.up('KeyZ');
      }
      await page.waitForTimeout(90);
    }
  } else if (cmd === 'mash') {
    // mash <ms> [key]: tap a key every 180ms for a while (menus, dialogue, battles)
    const [ms, key = 'KeyZ'] = rest;
    const until = Date.now() + Number(ms);
    while (Date.now() < until) {
      await page.keyboard.down(key);
      await page.waitForTimeout(40);
      await page.keyboard.up(key);
      await page.waitForTimeout(140);
    }
  } else if (cmd === 'battle') {
    // battle: confirm through menus until the battle scene closes (uses autoTiming if set)
    await page.waitForFunction(() => window.__GAME__.game.scene.isActive('Battle'), null, { timeout: 10000 });
    for (let i = 0; i < 600; i++) {
      const active = await page.evaluate(() => window.__GAME__.game.scene.isActive('Battle') || window.__GAME__.game.scene.isActive('GameOver'));
      if (!active) break;
      const gameOver = await page.evaluate(() => window.__GAME__.game.scene.isActive('GameOver'));
      if (gameOver) break;
      await page.keyboard.down('KeyZ');
      await page.waitForTimeout(40);
      await page.keyboard.up('KeyZ');
      await page.waitForTimeout(160);
    }
  } else if (cmd === 'fightuntil') {
    // fightuntil <outcome>: confirm through battle menus until the engine reports the outcome
    // and the scene is waiting (e.g. the victory window); does not dismiss it.
    const want = rest[0] || 'win';
    for (let i = 0; i < 800; i++) {
      const st = await page.evaluate(() => {
        const b = window.__GAME__.game.scene.getScene('Battle');
        if (!window.__GAME__.game.scene.isActive('Battle')) return { gone: true };
        return { outcome: b.engine?.outcome ?? null, waiting: !!b.inputHandler && !b.hud.menu && !b.hud.sub };
      });
      if (st.gone) throw new Error('battle ended before outcome');
      if (st.outcome === want && st.waiting) break;
      if (st.outcome && st.outcome !== want) throw new Error(`battle outcome ${st.outcome}`);
      await page.keyboard.down('KeyZ');
      await page.waitForTimeout(40);
      await page.keyboard.up('KeyZ');
      await page.waitForTimeout(160);
    }
  } else if (cmd === 'waitmenu') {
    // waitmenu: wait until the battle command menu is waiting for input
    await page.waitForFunction(() => { const b = window.__GAME__.game.scene.getScene('Battle'); return b && window.__GAME__.game.scene.isActive('Battle') && b.hud && b.hud.menu && !b.hud.sub; }, null, { timeout: 30000 });
    await page.waitForTimeout(120);
  } else if (cmd === 'keys') {
    // keys ArrowDown ArrowDown KeyZ ... : tap keys in sequence
    for (const key of rest) {
      await page.keyboard.down(key);
      await page.waitForTimeout(45);
      await page.keyboard.up(key);
      await page.waitForTimeout(150);
    }
  } else if (cmd === 'face') {
    const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[rest[0]];
    await page.keyboard.down(key);
    await page.waitForTimeout(40);
    await page.keyboard.up(key);
    await page.waitForTimeout(150);
  }
  } catch (err) {
    console.log(`FAILED at "${line}": ${err.message.split('\n')[0]}`);
    await page.screenshot({ path: `${outDir}/error.png` });
    try { console.log('state:', JSON.stringify(await page.evaluate(() => window.__GAME__.test.state()))); } catch {}
    failed = true;
    break;
  }
}
console.log(logs.slice(-40).join('\n'));
await browser.close();
process.exit(failed ? 1 : 0);
