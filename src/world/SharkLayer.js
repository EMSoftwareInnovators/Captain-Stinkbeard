import { TILE_SIZE } from '../config/constants.js';
import { finLoop, loopLength, pointOnLoop, followPoint, sharkLevelIndex, crowdSize, seaLanes } from '../systems/hazards/sharks.js';

/**
 * Draws the shark threat (systems/hazards/sharks.js) around the ship: fins
 * circling in the water, now and then one hitting the hull, and the staged
 * moments scripts ask for (a bite at a hull plank, a ram from beneath, a
 * shark flopping on deck, the whole swarm peeling off after a rowboat).
 *
 * Below decks ("below": true) nothing is drawn; the hull just gets hit.
 *
 * Phase 4 adds the crowd: many small, distant fins filling the water down
 * both sides and off the bow and stern (pooled, capped at maxCrowd, so
 * "hundreds of sharks" costs about a hundred small sprites). Side-lane fins
 * keep to the part of the strip the camera can see, so the water always
 * looks full. A frenzy focus (the Dead Center at the waterline) pulls most of
 * them toward one stretch of hull, with the sea churning and wood splintering
 * there until it is cleared.
 */
const T = TILE_SIZE;
const rand = (a, b) => a + Math.random() * (b - a);

export class SharkLayer {
  constructor(scene, cfg) {
    this.scene = scene;
    this.cfg = cfg;
    this.fins = [];
    this.level = 'none';
    this.below = false;
    this.override = null;
    this.follower = null;
    this.bumpTimer = 4000;
    this.outdoor = scene.model.meta.background === 'ocean';
    this.loops = new Map();
    this.width = scene.model.width;
    // Phase 4: the crowd of distant fins, and a frenzy focus on the hull.
    this.crowd = [];
    this.mapCrowd = null;
    this.crowdOverride = null;
    this.focus = null;
    this.churnTimer = 0;
    this.hitTimer = 1500;
    this.lanes = this.outdoor ? seaLanes(scene.def) : [];
  }

  loop(margin) {
    const key = margin.toFixed(2);
    if (!this.loops.has(key)) {
      const pts = finLoop(this.scene.def, margin);
      this.loops.set(key, { pts, len: loopLength(pts) });
    }
    return this.loops.get(key);
  }

  levelCfg(level = this.level) {
    return this.cfg.levels[level] ?? { fins: 0 };
  }

  /** From the map's story variants; a script override wins while it is set. */
  setLevel({ level, below, crowd = null }, { immediate = false } = {}) {
    const next = this.override ?? level;
    this.below = !!below;
    this.mapCrowd = crowd;
    if (next === this.level && !immediate) {
      this.syncCrowd(immediate);
      return;
    }
    this.level = next;
    this.syncFins(immediate);
    this.syncCrowd(immediate);
  }

  /**
   * Holds a level for a scene ({ "sharks": "attacking", "crowd": 40 }); null
   * returns to the map's own.
   */
  hold(level, mapLevel, { crowd = null } = {}) {
    this.override = level;
    this.crowdOverride = level === null ? null : crowd;
    this.setLevel(level === null ? mapLevel : { level, below: this.below, crowd: mapLevel?.crowd ?? null });
  }

  syncFins(immediate) {
    if (!this.outdoor || this.below) {
      for (const f of this.fins) this.dismiss(f, true);
      this.fins = [];
      return;
    }
    const want = this.levelCfg().fins ?? 0;
    const live = this.fins.filter((f) => !f.leaving);
    for (let i = live.length; i < want; i++) this.fins.push(this.spawnFin(immediate));
    // Fewer wanted: the extras swim off.
    for (const f of live.slice(want)) this.dismiss(f, false);
  }

  spawnFin(immediate) {
    const cfg = this.levelCfg();
    const { len } = this.loop(cfg.margin ?? 0.6);
    const img = this.scene.add.sprite(0, 0, 'stage', 'fin_h_0').setOrigin(0.5, 0.5).setDepth(-2350);
    img.setAlpha(immediate ? 0.95 : 0);
    const f = {
      img,
      d: rand(0, len),
      dir: Math.random() < 0.5 ? 1 : -1,
      speedK: rand(0.75, 1.25),
      wobble: rand(0, Math.PI * 2),
      under: 0,
      alpha: 0.95,
      fade: immediate ? 1 : 0,
      leaving: false,
      anim: rand(0, 400),
    };
    return f;
  }

  dismiss(f, now) {
    if (now) {
      f.img.destroy();
      return;
    }
    f.leaving = true;
    const away = f.img.x < (this.width * T) / 2 ? -3 * T : (this.width + 3) * T;
    this.scene.tweens.add({ targets: f.img, x: away, alpha: 0, duration: 2600, ease: 'Sine.In', onComplete: () => {
      f.img.destroy();
      this.fins = this.fins.filter((x) => x !== f);
    } });
  }

  update(dt, { busy, player }) {
    if (this.below) {
      this.updateBumps(dt, busy);
      return;
    }
    this.updateCrowd(dt);
    this.updateChurn(dt);
    if (!this.fins.length) return;
    const cfg = this.levelCfg();
    const { pts, len } = this.loop(cfg.margin ?? 0.6);
    const sec = dt / 1000;
    for (const f of this.fins) {
      if (f.leaving || f.scripted) continue;
      f.anim += dt;
      f.fade = Math.min(1, f.fade + sec * 0.8);
      if (f === this.follower && player) {
        // Pacing the captain along the rail: level with him, on his side.
        const target = followPoint(this.scene.def, player.px / T, player.py / T - 0.3, cfg.margin ?? 0.5);
        if (target) {
          const tx = target.x * T;
          const ty = target.y * T;
          const k = Math.min(1, sec * 3.2);
          const dy = ty - f.img.y;
          f.img.x += (tx - f.img.x) * k;
          f.img.y += dy * k;
          this.orient(f, 0, Math.sign(dy) || 1, Math.abs(dy) > 1);
          f.img.setAlpha(0.95 * f.fade);
          continue;
        }
      }
      f.d += f.dir * (cfg.speed ?? 1.5) * f.speedK * sec;
      const p = pointOnLoop(pts, f.d);
      const w = Math.sin(f.anim / 700 + f.wobble) * 0.18;
      f.img.x = Math.round((p.x - p.dy * w) * T);
      f.img.y = Math.round((p.y + p.dx * w) * T);
      this.orient(f, p.dx * f.dir, p.dy * f.dir, true);
      // Now and then a fin slips under and comes up again further on.
      if (f.under > 0) f.under -= dt;
      else if (Math.random() < (cfg.submerge ?? 0) * sec * 0.25) f.under = rand(1400, 3200);
      const target = f.under > 0 ? 0 : 0.95;
      f.alpha += (target - f.alpha) * Math.min(1, sec * 4);
      f.img.setAlpha(f.alpha * f.fade);
    }
    void len;
    this.updateBumps(dt, busy);
  }

  orient(f, dx, dy, moving) {
    const frameN = Math.floor(f.anim / 220) % 2;
    if (Math.abs(dx) >= Math.abs(dy)) {
      f.img.setFrame(`fin_h_${frameN}`);
      f.img.setFlipX(dx < 0);
      f.img.setFlipY(false);
    } else {
      f.img.setFrame(`fin_v_${frameN}`);
      f.img.setFlipY(dy > 0);
      f.img.setFlipX(false);
    }
    void moving;
  }

  /** Attacking sharks hit the hull while the captain is free to move. */
  updateBumps(dt, busy) {
    const cfg = this.levelCfg();
    if (!cfg.bumpEvery || busy || this.scene.leaving) return;
    this.bumpTimer -= dt;
    if (this.bumpTimer > 0) return;
    const [a, b] = cfg.bumpEvery;
    this.bumpTimer = rand(a, b);
    this.bump(cfg.shake ?? 1);
  }

  bump(strength = 1) {
    const s = this.scene;
    const app = s.game.app;
    app.audio.sfx(this.below ? 'shark_thump' : 'shark_bump', { volume: this.below ? 0.8 : 0.9, rate: rand(0.9, 1.1) });
    s.services?.world.shake(strength, 260);
    if (this.below || !this.fins.length) return;
    // A fin darts in at the hull near the captain, then sheers off.
    const p = s.player;
    const f = this.fins[Math.floor(Math.random() * this.fins.length)];
    if (!f || f.leaving || f === this.follower) return;
    const target = followPoint(s.def, p.px / T + rand(-6, 6), p.py / T + rand(-4, 4), 0.1);
    if (!target) return;
    f.scripted = true;
    const x0 = f.img.x;
    const y0 = f.img.y;
    s.tweens.add({ targets: f.img, x: target.x * T, y: target.y * T, duration: 180, ease: 'Quad.In', onComplete: () => {
      const hullX = target.side === 'port' ? target.x - 0.6 : target.x + 0.6;
      s.fx.burst('splash', hullX * T, target.y * T, { count: 8 });
      s.fx.burst('splinters', hullX * T, target.y * T - 4, { count: 3 });
      s.tweens.add({ targets: f.img, x: x0, y: y0, duration: 700, ease: 'Sine.Out', onComplete: () => { f.scripted = false; } });
    } });
  }

  // --- scripted events ------------------------------------------------------

  /** A shark rears up at a hull tile and bites: resolves when it sinks back. */
  async bite(x, y) {
    const s = this.scene;
    const port = x >= this.width / 2;
    const sx = port ? x + 1.4 : x - 0.4;
    const sy = y + 1;
    const id = `shark_bite_${Math.round(x)}_${Math.round(y)}`;
    const rec = s.stage.add(id, { frame: 'shark_bite_0', x: sx, y: sy, below: true, flip: port });
    rec.img.setAlpha(0);
    await this.tween(rec.img, { alpha: 1, duration: 220 });
    s.game.app.audio.sfx('shark_surface');
    for (let i = 0; i < 2; i++) {
      s.stage.setFrame(id, 'shark_bite_1');
      await s.wait(230);
      s.stage.setFrame(id, 'shark_bite_2');
      s.game.app.audio.sfx('shark_bite', { rate: rand(0.95, 1.08) });
      s.fx.burst('splinters', (port ? x : x + 1) * T, (y + 0.5) * T, { count: 6 });
      s.fx.burst('splash', (port ? x + 0.8 : x + 0.2) * T, (y + 0.7) * T, { count: 6 });
      s.services?.world.shake(1, 200);
      await s.wait(260);
    }
    s.stage.setFrame(id, 'shark_bite_0');
    await this.tween(rec.img, { alpha: 0, duration: 420 });
    s.stage.remove(id);
  }

  /** Something big hits the hull from below. */
  async ram(y = null) {
    const s = this.scene;
    const app = s.game.app;
    app.audio.sfx('shark_ram');
    app.audio.sfx('wood_crack', { volume: 0.8 });
    const py = y ?? s.player.py / T;
    if (!this.below && this.outdoor) {
      const row = followPoint(s.def, 0, py, 0.3);
      const row2 = followPoint(s.def, this.width, py, 0.3);
      for (const r of [row, row2]) if (r) s.fx.burst('splash', r.x * T, r.y * T, { count: 12, up: 160 });
    }
    s.fx.burst('dust', s.player.px, s.player.py - 30, { count: 5 });
    await s.services?.world.shake(3, 420);
  }

  /** A shark lands on the deck (stage sprite "deck_shark") and keeps flopping. */
  async flop(x, y) {
    const s = this.scene;
    const port = x >= this.width / 2;
    const fromX = port ? this.width + 0.5 : -0.5;
    const rec = s.stage.add('deck_shark', { frame: 'shark_deck_0', x: fromX, y: y + 1, anim: 'stage:shark_flop' });
    s.game.app.audio.sfx('splash_big', { volume: 0.7 });
    const tx = (x + 0.5) * T;
    await new Promise((resolve) => {
      const st = { t: 0 };
      const x0 = rec.img.x;
      const y0 = rec.baseY;
      s.tweens.add({
        targets: st, t: 1, duration: 620, ease: 'Sine.InOut',
        onUpdate: () => {
          rec.img.x = x0 + (tx - x0) * st.t;
          rec.baseY = y0 + ((y + 1) * T - y0) * st.t - Math.sin(st.t * Math.PI) * 26;
        },
        onComplete: resolve,
      });
    });
    rec.baseY = (y + 1) * T;
    s.game.app.audio.sfx('shark_flop');
    s.fx.burst('splash', tx, (y + 0.8) * T, { count: 10 });
    s.services?.world.shake(1, 180);
  }

  /** The deck shark flops back over the side. */
  async unflop() {
    const s = this.scene;
    const rec = s.stage.get('deck_shark');
    if (!rec) return;
    const x0 = rec.img.x;
    const port = x0 >= (this.width * T) / 2;
    const tx = port ? (this.width + 1) * T : -T;
    const y0 = rec.baseY;
    rec.img.play('stage:shark_flop');
    await new Promise((resolve) => {
      const st = { t: 0 };
      s.tweens.add({
        targets: st, t: 1, duration: 560, ease: 'Sine.In',
        onUpdate: () => {
          rec.img.x = x0 + (tx - x0) * st.t;
          rec.baseY = y0 - Math.sin(st.t * Math.PI) * 22 + st.t * 6;
        },
        onComplete: resolve,
      });
    });
    s.game.app.audio.sfx('splash');
    s.stage.remove('deck_shark');
  }

  /**
   * The swarm peels away toward (x, y) in tiles (a rowboat heading off).
   * Resolves once they are gone; the map's level decides what comes back.
   */
  async lure(x, y, duration = 3200) {
    const s = this.scene;
    const fins = this.fins.slice();
    this.fins = [];
    this.follower = null;
    s.game.app.audio.sfx('shark_swarm_depart');
    await Promise.all(fins.map((f, i) => new Promise((resolve) => {
      f.leaving = true;
      s.tweens.add({
        targets: f.img, x: x * T + rand(-20, 20), y: y * T + rand(-16, 16), alpha: 0,
        delay: i * 140, duration: duration + rand(-400, 400), ease: 'Sine.In',
        onUpdate: () => {
          f.anim += 16;
          const dx = x * T - f.img.x;
          const dy = y * T - f.img.y;
          this.orient(f, dx, dy, true);
        },
        onComplete: () => {
          f.img.destroy();
          resolve();
        },
      });
    })));
  }

  /** One fin starts (or stops) pacing the captain along the rail. */
  setFollow(on) {
    if (!on) {
      this.follower = null;
      return;
    }
    if (!this.fins.length) this.fins.push(this.spawnFin(false));
    this.follower = this.fins.find((f) => !f.leaving) ?? null;
  }

  tween(target, props) {
    return new Promise((resolve) => this.scene.tweens.add({ targets: target, ...props, onComplete: resolve }));
  }

  get strength() {
    return sharkLevelIndex(this.level);
  }

  // --- the crowd (Phase 4) ------------------------------------------------------

  crowdTarget() {
    if (!this.outdoor || this.below || !this.lanes.length) return 0;
    const n = crowdSize(this.cfg, this.level, this.crowdOverride ?? this.mapCrowd);
    return this.scene.app?.settings?.reducedEffects?.() ? Math.round(n * 0.6) : n;
  }

  /** Adds or retires crowd fins to match the level (retired ones sink away). */
  syncCrowd(immediate = false) {
    const want = this.crowdTarget();
    const live = this.crowd.filter((f) => !f.leaving);
    for (let i = live.length; i < want; i++) this.crowd.push(this.spawnCrowdFin(immediate));
    for (const f of live.slice(want)) f.leaving = true;
  }

  spawnCrowdFin(immediate) {
    // Side strips get most of them: that is where the captain can see.
    const weights = this.lanes.map((l) => (l.side === 'port' || l.side === 'starboard' ? 3 : 1) * (l.x1 - l.x0) * (l.y1 - l.y0));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let lane = this.lanes[0];
    for (let i = 0; i < this.lanes.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        lane = this.lanes[i];
        break;
      }
    }
    const img = this.scene.add.sprite(0, 0, 'stage', 'fin_far_0').setOrigin(0.5, 0.5).setDepth(-2352).setAlpha(0);
    const side = lane.side === 'port' || lane.side === 'starboard';
    return {
      img,
      lane,
      side,
      u: Math.random(),
      v: Math.random(),
      speed: rand(0.02, 0.07) * (Math.random() < 0.5 ? -1 : 1),
      wobble: rand(0, Math.PI * 2),
      anim: rand(0, 600),
      alpha: 0,
      fade: immediate ? 1 : 0,
      pull: 0,
      drawn: Math.random() < 0.7, // answers the frenzy
      jx: rand(-1, 1),
      jy: rand(-1, 1),
      leaving: false,
    };
  }

  updateCrowd(dt) {
    if (!this.crowd.length) return;
    const sec = dt / 1000;
    const cam = this.scene.cameras.main;
    const top = cam.scrollY / T - 1;
    const span = cam.height / T + 2;
    const keep = [];
    for (const f of this.crowd) {
      f.anim += dt;
      f.fade = f.leaving ? f.fade - sec * 0.9 : Math.min(1, f.fade + sec * 0.6);
      if (f.leaving && f.fade <= 0) {
        f.img.destroy();
        continue;
      }
      keep.push(f);
      const L = f.lane;
      // Drift along the lane; side lanes wrap within what the camera shows.
      if (f.side) f.v = (((f.v + f.speed * sec) % 1) + 1) % 1;
      else f.u = (((f.u + f.speed * sec * 0.5) % 1) + 1) % 1;
      const wob = Math.sin(f.anim / 650 + f.wobble) * 0.22;
      let x = L.x0 + f.u * (L.x1 - L.x0) + (f.side ? wob * 0.5 : 0);
      let y = f.side ? top + f.v * span : L.y0 + f.v * (L.y1 - L.y0) + wob * 0.4;
      if (f.side) y = Math.max(L.y0, Math.min(L.y1, y));
      // The frenzy: most of them head for the scent and mill about it.
      const pullTo = this.focus && f.drawn ? 1 : 0;
      f.pull += (pullTo - f.pull) * Math.min(1, sec * (pullTo ? 0.55 : 0.35));
      if (f.pull > 0.01 && this.focus) {
        const spin = f.anim / 380 + f.wobble;
        const fx = this.focus.x + f.jx * 1.4 + Math.cos(spin) * 0.6;
        const fy = this.focus.y + f.jy * 2.4 + Math.sin(spin) * 0.8;
        x += (fx - x) * f.pull;
        y += (fy - y) * f.pull;
      }
      const px = Math.round(x * T);
      const py = Math.round(y * T);
      const dx = px - f.img.x;
      f.img.setPosition(px, py);
      if (Math.abs(dx) > 0.2) f.img.setFlipX(dx < 0);
      f.img.setFrame(Math.floor(f.anim / (f.pull > 0.5 ? 120 : 260)) % 2 ? 'fin_far_1' : 'fin_far_0');
      // Now and then one slips under.
      const under = Math.sin(f.anim / 1300 + f.wobble * 3) > 0.86 && f.pull < 0.5;
      f.alpha += ((under ? 0.1 : 0.85) - f.alpha) * Math.min(1, sec * 3);
      f.img.setAlpha(f.alpha * Math.max(0, f.fade));
    }
    this.crowd = keep;
  }

  /** The sea boiling where the frenzy is (splashes, and the hull splintering). */
  updateChurn(dt) {
    if (!this.focus || this.below || !this.outdoor) return;
    const s = this.scene;
    const reduced = s.app?.settings?.reducedEffects?.();
    this.churnTimer -= dt;
    if (this.churnTimer <= 0) {
      this.churnTimer = rand(110, 240) * (reduced ? 2 : 1);
      s.fx?.burst('splash', (this.focus.x + rand(-1.3, 1.3)) * T, (this.focus.y + rand(-2.2, 2.2)) * T, { count: reduced ? 3 : 6 });
    }
    this.hitTimer -= dt;
    if (this.hitTimer <= 0) {
      this.hitTimer = rand(900, 1900);
      const hullX = this.focus.x < this.width / 2 ? this.focus.x + 1.2 : this.focus.x - 1.2;
      s.fx?.burst('splinters', hullX * T, (this.focus.y + rand(-1.5, 1.5)) * T, { count: 4 });
      s.game.app.audio.sfx(Math.random() < 0.5 ? 'shark_bite' : 'frenzy_hit', { volume: 0.55, rate: rand(0.9, 1.15) });
    }
  }

  /** The frenzy's target on the hull, in tiles (null clears it). */
  setFocus(x, y) {
    this.focus = x === null || x === undefined ? null : { x, y };
    this.churnTimer = 0;
    this.hitTimer = 400;
  }

  /** A short, violent thrashing of the water at (x, y): something disturbed them. */
  async thrash(x, y, duration = 1600) {
    const s = this.scene;
    s.game.app.audio.sfx('frenzy_churn', { volume: 0.8 });
    const until = s.time.now + duration;
    const n = Math.max(3, Math.round(duration / 160));
    for (let i = 0; i < n && s.time.now < until + 200; i++) {
      s.fx?.burst('splash', (x + rand(-1.4, 1.4)) * T, (y + rand(-1.6, 1.6)) * T, { count: 7 });
      await s.wait(duration / n);
    }
  }

  /** A hammerhead rams the hull at (x, y), twice. */
  async hammerhead(x, y) {
    const s = this.scene;
    const port = x >= this.width / 2;
    const sx = port ? x + 1.5 : x - 0.5;
    const sy = y + 1;
    const id = `hammerhead_${Math.round(x)}_${Math.round(y)}`;
    const rec = s.stage.add(id, { frame: 'hammerhead_0', x: sx, y: sy, below: true, flip: port });
    rec.img.setAlpha(0);
    await this.tween(rec.img, { alpha: 1, duration: 200 });
    for (let i = 0; i < 2; i++) {
      s.stage.setFrame(id, 'hammerhead_1');
      await s.wait(160);
      s.stage.setFrame(id, 'hammerhead_2');
      s.game.app.audio.sfx('shark_ram', { rate: rand(0.9, 1.05) });
      s.game.app.audio.sfx('wood_crack', { volume: 0.7 });
      s.fx.burst('splinters', (port ? x : x + 1) * T, (y + 0.5) * T, { count: 8 });
      s.fx.burst('splash', (port ? x + 0.8 : x + 0.2) * T, (y + 0.7) * T, { count: 8 });
      s.services?.world.shake(2, 260);
      await s.wait(300);
      s.stage.setFrame(id, 'hammerhead_0');
      await s.wait(220);
    }
    await this.tween(rec.img, { alpha: 0, duration: 380 });
    s.stage.remove(id);
  }

  destroy() {
    for (const f of this.fins) f.img.destroy();
    this.fins = [];
    for (const f of this.crowd) f.img.destroy();
    this.crowd = [];
  }
}
