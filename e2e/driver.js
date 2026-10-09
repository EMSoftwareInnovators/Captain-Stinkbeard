/**
 * Plays the game through a Playwright page with real key presses, using the
 * development-only hooks in src/debug/testHooks.js (window.__GAME__) to read
 * state and plan paths. Shared by the E2E spec and tools/play.mjs.
 */
const DIR_KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
/** Booting renders every song before the title (slow on a software-rendered test machine). */
const BOOT_MS = 120000;

export class GameDriver {
  constructor(page) {
    this.page = page;
  }

  wait(ms) {
    return this.page.waitForTimeout(ms);
  }

  eval(fn, arg) {
    return this.page.evaluate(fn, arg);
  }

  async tap(key, hold = 45, after = 150) {
    await this.page.keyboard.down(key);
    await this.wait(hold);
    await this.page.keyboard.up(key);
    await this.wait(after);
  }

  async keys(...list) {
    for (const k of list) await this.tap(k);
  }

  state() {
    return this.eval(() => window.__GAME__.test.state());
  }

  async waitFor(fn, arg, timeout = 30000) {
    await this.page.waitForFunction(fn, arg, { timeout });
  }

  /** Opens the title menu (past "Press Z") and confirms the entry with `value`. */
  async titleChoose(value) {
    await this.waitFor(() => window.__GAME__?.game.scene.isActive('Title'), null, BOOT_MS);
    const title = () => this.eval(() => window.__GAME__.game.scene.getScene('Title').state);
    while ((await title()) !== 'menu') await this.tap('KeyZ', 45, 400);
    const index = await this.eval((v) => window.__GAME__.game.scene.getScene('Title').menu.items.findIndex((i) => i.value === v), value);
    let current = await this.eval(() => window.__GAME__.game.scene.getScene('Title').menu.index);
    while (current !== index) {
      await this.tap(current < index ? 'ArrowDown' : 'ArrowUp', 45, 120);
      current = await this.eval(() => window.__GAME__.game.scene.getScene('Title').menu.index);
    }
    await this.tap('KeyZ', 45, 300);
    await this.waitFor(() => window.__GAME__.game.scene.isActive('World'), null, 15000);
  }

  /** Title screen → New Game, with fast text for testing. */
  async newGame({ autoTiming = 0 } = {}) {
    await this.waitFor(() => window.__GAME__?.game.scene.isActive('Title'), null, BOOT_MS);
    await this.eval((t) => {
      window.__GAME__.app.settings.set('textSpeed', 'instant');
      window.__GAME__.app.flags.autoTiming = t;
    }, autoTiming);
    await this.titleChoose('new');
    await this.wait(1200);
  }

  /** Starts a fresh game at a story preset (data/debug/presets.json), fast text. */
  async preset(id) {
    await this.waitFor(() => window.__GAME__?.game.scene.isActive('Title') || window.__GAME__?.game.scene.isActive('World'), null, BOOT_MS);
    await this.eval(() => window.__GAME__.app.settings.set('textSpeed', 'instant'));
    await this.eval((p) => window.__GAME__.test.preset(p), id);
    await this.waitFor(() => window.__GAME__.game.scene.isActive('World') && !window.__GAME__.game.scene.getScene('World').leaving, null, 15000);
    await this.wait(700);
  }

  /** Current UI state: tutorial | choice | line | typing | insert | repair | tension | book | tv | teller | idle | busy | battle. */
  uiState() {
    return this.eval(() => {
      const g = window.__GAME__;
      if (g.game.scene.isActive('Battle')) return 'battle';
      const menu = g.game.scene.getScene('Menu');
      if (g.game.scene.isActive('Menu') && menu?.bookMode) return 'book';
      const o = g.app.overlay;
      const d = o.dialogue;
      if (o.tensionOpen) return 'tension';
      if (o.tutorialOpen) return 'tutorial';
      if (o.repairOpen) return 'repair';
      if (o.tvOpen) return 'tv';
      if (o.tellerOpen) return 'teller';
      if (d.choiceMenu) return 'choice';
      if (d.resolveLine && !d.typing) return 'line';
      if (d.resolveLine && d.typing) return 'typing';
      if (g.app.cinema?.insertOpen?.ready) return 'insert';
      const w = g.game.scene.getScene('World');
      return w && g.game.scene.isActive('World') && !w.isBusy() && !w.leaving ? 'idle' : 'busy';
    });
  }

  /**
   * Advances dialogue until the world is free again. `picks` are choice
   * indices used in order; without one, a choice is cancelled (last option).
   */
  async skip(...picks) {
    // Time-based: long set-pieces spend most of their time busy, not talking.
    const until = Date.now() + 150000;
    while (Date.now() < until) {
      const st = await this.uiState();
      if (st === 'idle') return;
      if (st === 'battle') {
        await this.settleBattle();
        continue;
      }
      if (st === 'choice') {
        if (!picks.length) {
          await this.tap('KeyX', 45, 120);
          continue;
        }
        const k = picks.shift();
        for (let i = 0; i < k; i++) await this.tap('ArrowDown', 40, 90);
      }
      if (st === 'book') {
        // A logbook opened in the world (the Stench Log): read it, close it.
        await this.wait(250);
        await this.tap('KeyX', 45, 250);
        continue;
      }
      if (st === 'repair') {
        await this.repairTick();
        continue;
      }
      if (st === 'tension') {
        await this.holdTension();
        continue;
      }
      if (st === 'tv') {
        // A television close-up (the S.E.S.): step away from it.
        await this.tap('KeyX', 45, 250);
        continue;
      }
      if (st === 'teller') {
        // The Grand Bank's teller window (Story Phase 14) plays itself with the debug auto timing on.
        await this.wait(200);
        continue;
      }
      if (st === 'line' || st === 'tutorial' || st === 'choice' || st === 'insert') await this.tap('KeyZ', 45, 60);
      await this.wait(90);
    }
    throw new Error('dialogue never finished');
  }

  /**
   * Works the television close-up: each action is a menu value ('power',
   * 'next', 'prev', 'wiring', 'source', 'slap', 'leave'), picked by moving
   * the cursor to it and pressing Confirm. Returns what the set shows.
   */
  async tv(...actions) {
    await this.waitFor(() => !!window.__GAME__.app.overlay.tvOpen, null, 10000);
    for (const value of actions) {
      const ok = await this.waitFor((v) => {
        const tv = window.__GAME__.app.overlay.tvOpen;
        return !!tv && tv.menu.items.some((i) => i.value === v && !i.disabled);
      }, value, 10000).then(() => true, () => false);
      if (!ok) throw new Error(`the television has no "${value}" right now`);
      for (let guard = 0; guard < 12; guard++) {
        const at = await this.eval(() => window.__GAME__.app.overlay.tvOpen?.menu.selected?.value);
        if (at === value) break;
        await this.tap('ArrowDown', 40, 90);
      }
      await this.tap('KeyZ', 45, 450);
    }
    return this.eval(() => {
      const tv = window.__GAME__.app.overlay.tvOpen;
      return tv ? { view: tv.view, frame: tv.screen.frame.name, text: tv.bodyText.text ?? '' } : null;
    });
  }

  /**
   * The sash tension (Story Phase 12): holds Confirm down while the needle is
   * below the middle of the band and lets go above it, with real key presses,
   * for the whole of the count; then, at the cue, one deliberate press (or,
   * with `release: false`, waits for the captain's hands to slip). Returns
   * { slips, released, seconds } as the trial ends.
   */
  async holdTension({ release = true } = {}) {
    let down = false;
    let last = null;
    const started = Date.now();
    for (let guard = 0; guard < 6000; guard++) {
      const st = await this.eval(() => {
        const t = window.__GAME__.app.overlay.tensionOpen?.st;
        return t ? { phase: t.phase, value: t.value, band: t.band, slips: t.slips, released: t.released } : null;
      });
      if (!st) break;
      last = st;
      if (st.phase === 'hold') {
        const want = st.value < (st.band[0] + st.band[1]) / 2;
        if (want !== down) {
          if (want) await this.page.keyboard.down('KeyZ');
          else await this.page.keyboard.up('KeyZ');
          down = want;
        }
        await this.wait(25);
        continue;
      }
      if (down) {
        await this.page.keyboard.up('KeyZ');
        down = false;
      }
      if (st.phase === 'release' && release) await this.tap('KeyZ', 45, 120);
      else await this.wait(100);
    }
    if (down) await this.page.keyboard.up('KeyZ');
    return { ...last, seconds: (Date.now() - started) / 1000 };
  }

  /** One tick of the repair timing game: strike when the marker is in the green. */
  async repairTick() {
    const hit = await this.eval(() => {
      const r = window.__GAME__.app.overlay.repairOpen;
      return !!r && r.lock <= 0 && r.mark.x >= r.zone.x && r.mark.x <= r.zone.x + r.zone.width;
    });
    if (hit) await this.tap('KeyZ', 30, 40);
    else await this.wait(16);
  }

  /** Waits until the player can move (fighting any battle that interrupts). */
  async idle(timeout = 30000) {
    const until = Date.now() + timeout;
    while (Date.now() < until) {
      const st = await this.uiState();
      if (st === 'idle') return;
      if (st === 'battle') await this.settleBattle();
      else await this.wait(120);
    }
    throw new Error('world never became idle');
  }

  /** Fights a running battle by confirming everything, until it closes. */
  async settleBattle() {
    const active = () => this.eval(() => window.__GAME__?.game.scene.isActive('Battle'));
    if (!(await active())) return false;
    for (let i = 0; i < 900 && (await active()); i++) await this.tap('KeyZ', 40, 160);
    await this.wait(800);
    return true;
  }

  /** Confirms through a battle until the engine reports `want` and waits (e.g. on the results). */
  async fightUntil(want = 'win') {
    await this.waitFor(() => window.__GAME__.game.scene.isActive('Battle'), null, 6000);
    for (let i = 0; i < 800; i++) {
      const st = await this.eval(() => {
        const b = window.__GAME__.game.scene.getScene('Battle');
        if (!window.__GAME__.game.scene.isActive('Battle')) return { gone: true };
        return { outcome: b.engine?.outcome ?? null, waiting: !!b.inputHandler && !b.hud.menu && !b.hud.sub };
      });
      if (st.gone) throw new Error('battle closed before its outcome');
      if (st.outcome === want && st.waiting) return;
      if (st.outcome && st.outcome !== want) throw new Error(`battle outcome was ${st.outcome}`);
      await this.tap('KeyZ', 40, 160);
    }
    throw new Error('battle took too long');
  }

  worldReady() {
    return this.waitFor(() => {
      const w = window.__GAME__.game.scene.getScene('World');
      return !w.player.moving && !w.isBusy();
    }, null, 8000).then(() => true, () => false);
  }

  /**
   * Walks to (x, y) along the game's own BFS path, one real key press per
   * tile. After a scene the crew walk off to their places, and anyone can
   * step into the way: wait for a way through and re-plan whenever a step
   * doesn't land. Stops early if the walk starts a scene (a trigger).
   */
  async goto(x, y) {
    const where = () => this.eval(() => {
      const w = window.__GAME__.game.scene.getScene('World');
      return { x: w.player.tx, y: w.player.ty, busy: w.isBusy() || w.leaving };
    });
    for (let attempt = 0; attempt < 40; attempt++) {
      let at = await where();
      if (at.busy || (at.x === x && at.y === y)) break;
      const path = await this.eval(([tx, ty]) => window.__GAME__.test.pathTo(tx, ty), [x, y]);
      if (!path) {
        await this.wait(250);
        continue;
      }
      for (const dir of path) {
        const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
        await this.page.keyboard.down(DIR_KEYS[dir]);
        await this.waitFor(() => { const w = window.__GAME__.game.scene.getScene('World'); return w.player.moving || w.isBusy() || w.leaving; }, null, 3000).catch(() => {});
        await this.page.keyboard.up(DIR_KEYS[dir]);
        await this.waitFor(() => !window.__GAME__.game.scene.getScene('World').player.moving, null, 3000).catch(() => {});
        const next = await where();
        if (next.busy || next.x !== at.x + dx || next.y !== at.y + dy) break; // re-plan
        at = next;
      }
    }
    const end = await where();
    if (!end.busy && (end.x !== x || end.y !== y)) throw new Error(`no path to ${x},${y}`);
    await this.wait(120);
  }

  /**
   * Plays Shark Duty (Story Phase 4) until `done` (an expression or function
   * evaluated in the page) holds: walks to the shark or bite nearest the
   * captain, faces the rail, presses Confirm and strikes on the green.
   * Returns how many incidents were answered.
   */
  async sharkDuty(done, { timeout = 240000 } = {}) {
    const until = Date.now() + timeout;
    let answered = 0;
    while (Date.now() < until) {
      if (await this.page.evaluate(done)) return answered;
      const inc = await this.eval(() => {
        const w = window.__GAME__.game.scene.getScene('World');
        const d = w.sharkDuty;
        if (!d?.active || d.responding || w.isBusy()) return null;
        const p = w.player;
        const near = (i) => Math.abs(i.x - p.tx) + Math.abs(i.y - p.ty);
        const list = d.incidents.map((i) => ({ x: i.x, y: i.y, kind: i.kind })).sort((a, b) => near(a) - near(b));
        return list[0] ?? null;
      });
      if (!inc) {
        await this.wait(200);
        continue;
      }
      try {
        await this.approach([inc.x, inc.y]);
      } catch {
        await this.wait(200);
        continue;
      }
      const facing = await this.eval(([x, y]) => !!window.__GAME__.game.scene.getScene('World').sharkDuty.targetAt(x, y), [inc.x, inc.y]);
      if (!facing) continue;
      await this.tap('KeyZ', 50, 200);
      await this.skip();
      answered += 1;
    }
    throw new Error('Shark Duty never finished');
  }

  /** Holds a direction long enough to cross `tiles` tiles. */
  async walk(dir, tiles) {
    await this.page.keyboard.down(DIR_KEYS[dir]);
    await this.wait(tiles * 140 + 40);
    await this.page.keyboard.up(DIR_KEYS[dir]);
    await this.wait(260);
  }

  /**
   * Walks next to an NPC (id) or tile ([x, y]) and faces it. With
   * `{ touch: true }` it keeps walking into the target (starting a battle
   * with a field enemy); an enemy that is already gone is skipped.
   */
  async approach(target, { touch = false } = {}) {
    for (let guard = 0; guard < 500; guard++) {
      if (touch) {
        const st = await this.eval(() => ({ battle: window.__GAME__.game.scene.isActive('Battle'), busy: window.__GAME__.game.scene.getScene('World').isBusy() }));
        if (st.battle) return true;
        if (st.busy) {
          await this.wait(150);
          continue;
        }
      }
      const r = await this.eval((t) => window.__GAME__.test.stepToward(t), target);
      if (r.missing) {
        if (touch) return false;
        throw new Error(`no actor ${target}`);
      }
      if (r.wait || r.stuck) {
        await this.wait(150);
        continue;
      }
      if (!touch && (await this.settleBattle())) continue;
      if (!(await this.worldReady())) {
        if (await this.settleBattle()) continue;
        throw new Error('world stayed busy');
      }
      const dir = r.done ? r.face : r.dir;
      await this.page.keyboard.down(DIR_KEYS[dir]);
      if (r.done) {
        await this.wait(40);
        await this.page.keyboard.up(DIR_KEYS[dir]);
        await this.wait(140);
        const facing = await this.eval(() => window.__GAME__.game.scene.getScene('World').player.facing);
        if (facing === dir && !touch) return true;
        continue;
      }
      await this.waitFor(() => { const w = window.__GAME__.game.scene.getScene('World'); return w.player.moving || w.isBusy() || w.leaving; }, null, 3000).catch(() => {});
      await this.page.keyboard.up(DIR_KEYS[dir]);
      await this.waitFor(() => !window.__GAME__.game.scene.getScene('World').player.moving, null, 3000).catch(() => {});
    }
    throw new Error(`could not reach ${target}`);
  }

  /** Approach + confirm + read everything. */
  async interact(target, ...picks) {
    await this.approach(target);
    await this.tap('KeyZ', 50, 250);
    await this.skip(...picks);
  }

  /**
   * Walks onto the warp at (x, y) and waits for the next map. Crew can wander
   * into the way, so the path is re-planned until the map changes.
   */
  async travel(x, y, mapId) {
    const onMap = () => this.eval((id) => window.__GAME__.game.scene.getScene('World')?.model?.id === id, mapId);
    for (let attempt = 0; attempt < 20 && !(await onMap()); attempt++) {
      await this.idle();
      const path = await this.eval(([tx, ty]) => window.__GAME__.test.pathTo(tx, ty), [x, y]);
      if (!path) {
        await this.wait(400);
        continue;
      }
      await this.goto(x, y).catch(() => {});
      await this.wait(300);
    }
    await this.waitFor((id) => window.__GAME__.game.scene.getScene('World')?.model?.id === id, mapId, 10000);
    await this.wait(700);
  }

  /**
   * Touches a field enemy, fights and dismisses the results, until that enemy
   * is beaten. Enemies chase, so another one can catch the captain on the way:
   * that fight is won too and the approach goes on. Returns false if the enemy
   * was already gone.
   */
  async fight(enemyId) {
    let fought = false;
    for (let round = 0; round < 6; round++) {
      const started = await this.approach(enemyId, { touch: true });
      if (!started) return fought;
      await this.fightUntil('win');
      await this.tap('KeyZ', 45, 1200);
      await this.idle();
      fought = true;
    }
    throw new Error(`${enemyId} was still standing after 6 fights`);
  }
}
