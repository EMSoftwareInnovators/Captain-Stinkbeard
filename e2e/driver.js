/**
 * Plays the game through a Playwright page with real key presses, using the
 * development-only hooks in src/debug/testHooks.js (window.__GAME__) to read
 * state and plan paths. Shared by the E2E spec and tools/play.mjs.
 */
const DIR_KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

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
    await this.waitFor(() => window.__GAME__?.game.scene.isActive('Title'));
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
    await this.waitFor(() => window.__GAME__?.game.scene.isActive('Title'));
    await this.eval((t) => {
      window.__GAME__.app.settings.set('textSpeed', 'instant');
      window.__GAME__.app.flags.autoTiming = t;
    }, autoTiming);
    await this.titleChoose('new');
    await this.wait(1200);
  }

  /** Current UI state: tutorial | choice | line | typing | idle | busy | battle. */
  uiState() {
    return this.eval(() => {
      const g = window.__GAME__;
      if (g.game.scene.isActive('Battle')) return 'battle';
      const o = g.app.overlay;
      const d = o.dialogue;
      if (o.tutorialOpen) return 'tutorial';
      if (d.choiceMenu) return 'choice';
      if (d.resolveLine && !d.typing) return 'line';
      if (d.resolveLine && d.typing) return 'typing';
      const w = g.game.scene.getScene('World');
      return w && g.game.scene.isActive('World') && !w.isBusy() && !w.leaving ? 'idle' : 'busy';
    });
  }

  /**
   * Advances dialogue until the world is free again. `picks` are choice
   * indices used in order; without one, a choice is cancelled (last option).
   */
  async skip(...picks) {
    for (let n = 0; n < 400; n++) {
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
      if (st === 'line' || st === 'tutorial' || st === 'choice') await this.tap('KeyZ', 45, 60);
      await this.wait(90);
    }
    throw new Error('dialogue never finished');
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

  /** Walks to (x, y) along the game's own BFS path, one real key press per tile. */
  async goto(x, y) {
    const path = await this.eval(([tx, ty]) => window.__GAME__.test.pathTo(tx, ty), [x, y]);
    if (!path) throw new Error(`no path to ${x},${y}`);
    for (const dir of path) {
      await this.page.keyboard.down(DIR_KEYS[dir]);
      await this.waitFor(() => { const w = window.__GAME__.game.scene.getScene('World'); return w.player.moving || w.isBusy() || w.leaving; }, null, 3000).catch(() => {});
      await this.page.keyboard.up(DIR_KEYS[dir]);
      await this.waitFor(() => !window.__GAME__.game.scene.getScene('World').player.moving, null, 3000).catch(() => {});
    }
    await this.wait(120);
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

  /** Touches a field enemy, fights and dismisses the results. Returns false if it was already gone. */
  async fight(enemyId) {
    const started = await this.approach(enemyId, { touch: true });
    if (!started) return false;
    await this.fightUntil('win');
    await this.tap('KeyZ', 45, 1200);
    await this.idle();
    return true;
  }
}
