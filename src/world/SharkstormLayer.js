import { TILE_SIZE, SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';
import { sharkstormNow, between } from '../systems/hazards/sharkstorm.js';

/**
 * The Great Sharkstorm on deck (Story Phase 6; rules and states in
 * systems/hazards/sharkstorm.js). Only on the main deck, and only while the
 * captain has control:
 *
 *   - passes: sharks flung across the sky over the ship (a shadow on the deck,
 *     the shark above it), pure scenery, a few pooled sprites;
 *   - impacts: now and then a shark comes down on a deck tile near the
 *     captain. The tile is marked first (a pulsing red ring and a growing
 *     shadow, with a whistle) for warnMs, so it can always be walked off.
 *     A shark landing on the captain knocks him flat for a moment; it never
 *     hurts and never ends anything. The shark flops back over the rail.
 *   - rumble: once the storm has gone off to the horizon, distant thunder.
 *   - below (Story Phase 7): with the crew sheltering below decks, the storm
 *     is something heard through the planks: now and then a heavy, muffled
 *     landing overhead, the lantern swings (a small shake), and grit sifts
 *     down from the deckhead. Only on the maps the state lists.
 *
 * Flying sharks come in shapes (data "variants": frame prefixes, each with
 * _0 and _1 frames), picked at random per pass.
 *
 * Story Phase 9: a state can name the maps it plays on ("maps", default the
 * main deck) with an area per map ("areas"), and how a landing goes there
 * ("ground": "deck" flops back over the rail, "land" is yanked back up into
 * the sky, "water" splashes down; "onHit": "knock" flattens the captain,
 * "push" shoves his rowboat back a few tiles). With "areas", sharks only
 * come down on the maps that have one. A treasure-laden storm
 * ("glints") flashes gold now and then: coins and jewels in the sky.
 *
 * Story Phase 10: the Bling Bling King's sharks throw things. A state's
 * "tokens" ({ every, frames, max, sfx, maps? }) drops a cheap plastic prize
 * (a participation coin, a trophy, a rosette, a lobster shell) onto a free
 * tile near the captain now and then: it falls, bounces, clacks and lies
 * there as scenery. Never more than "max" at once (the oldest is swept
 * away), never during a scene, gone when you leave the room. Scenes throw
 * their own with the "token" command (dropToken). "sway" ({ maps, amp,
 * period }) lets a room drift gently with the ship once she's inside the
 * storm (a few pixels of camera, never a spin, off with screen shake off),
 * and "flying.swirl" sends the passing sharks across at a slant, every
 * which way, the way things go round inside a whirlwind.
 *
 * Reduced effects: fewer passes, no shake. It looks like hundreds of sharks
 * because the vistas and the shark crowd do the hundreds; this layer only
 * ever has a handful of sprites.
 */
const T = TILE_SIZE;
const MAX_PASSES = 3;

export class SharkstormLayer {
  constructor(scene) {
    this.scene = scene;
    this.passes = [];
    this.impact = null;
    this.passT = 1500;
    this.impactT = 3000;
    this.rumbleT = 8000;
    this.thudT = 4000;
    this.thuds = 0; // landings heard from below, this visit
    this.nextId = 1;
    this.tokens = []; // cheap prizes lying on this map (ids, oldest first)
    this.tokenT = 6000;
    this.swayT = 0;
  }

  get state() {
    return sharkstormNow(this.scene.content, this.scene.session);
  }

  /** Is the storm overhead on this map (its "maps", or just the main deck)? */
  get here() {
    const maps = this.state.maps ?? ['main_deck'];
    return maps.includes(this.scene.model?.id);
  }

  update(dt, busy) {
    const st = this.state;
    for (const p of this.passes) this.animatePass(p, dt);
    this.passes = this.passes.filter((p) => !p.done);
    if (this.impact) this.animateImpact(dt);
    if (st.below && !busy && (st.below.maps ?? []).includes(this.scene.model?.id)) this.belowDecks(st.below, dt);
    if (st.tokens && !busy) this.tokenRain(st.tokens, dt);
    if (!this.here) return;
    if (st.glints && !busy) this.glint(st.glints, dt);
    if (st.rumble && !busy) {
      this.rumbleT -= dt;
      if (this.rumbleT <= 0) {
        this.rumbleT = between(st.rumble.every ?? [30000, 60000]);
        this.scene.app.audio.sfx(st.rumble.sfx ?? 'storm_distant', { volume: 0.35 });
      }
    }
    const fly = st.flying;
    if (!fly) return;
    const reduced = this.scene.app.settings.reducedEffects();
    this.passT -= dt;
    if (this.passT <= 0) {
      this.passT = between(fly.passEvery ?? [2500, 4500]) * (reduced ? 2 : 1);
      if (this.passes.length < MAX_PASSES) this.spawnPass();
    }
    // Landings only while the captain can move (never during a scene), and
    // only on the maps the state gives an area to (when it gives any).
    if (busy || this.impact || !fly.impactEvery) return;
    if (fly.areas && !fly.areas[this.scene.model?.id]) return;
    this.impactT -= dt;
    if (this.impactT <= 0) {
      this.impactT = between(fly.impactEvery);
      this.spawnImpact(fly);
    }
  }

  /** A treasure-laden storm (Story Phase 9): now and then, gold and jewels flash in the sky. */
  glint(g, dt) {
    this.glintT = (this.glintT ?? 2000) - dt;
    if (this.glintT > 0) return;
    this.glintT = between(g.every ?? [1800, 3600]) * (this.scene.app.settings.reducedEffects() ? 2 : 1);
    const cam = this.scene.cameras.main;
    const x = cam.scrollX + 20 + Math.random() * (SCREEN_WIDTH - 40);
    const y = cam.scrollY + 10 + Math.random() * 50;
    this.scene.fx.burst(Math.random() < 0.6 ? 'coins' : 'gems', x, y, { count: 4 });
    this.scene.fx.burst('sparkle', x, y, { count: 3 });
    if (Math.random() < 0.4) this.scene.app.audio.sfx(g.sfx ?? 'coin_glint', { volume: 0.25, rate: 0.9 + Math.random() * 0.3 });
  }

  // --- the Bling Bling King's prizes (Story Phase 10) ------------------------------------

  tokenRain(t, dt) {
    const map = this.scene.model?.id;
    if (!(t.maps ?? this.state.maps ?? ['main_deck']).includes(map)) return;
    this.tokenT -= dt;
    if (this.tokenT > 0) return;
    this.tokenT = between(t.every ?? [20000, 40000]) * (this.scene.app.settings.reducedEffects() ? 2 : 1);
    const frames = t.frames ?? ['token_coin'];
    const tile = this.pickTile(t.areas?.[map] ?? t.area);
    if (tile) this.dropToken(frames[Math.floor(Math.random() * frames.length)], tile[0], tile[1], { max: t.max ?? 3, sfx: t.sfx });
  }

  /**
   * A cheap prize falls onto a tile, bounces and lies there (a stage sprite).
   * Resolves when it has landed. Keeps at most "max" on the map (the oldest
   * goes first); "id" names it, so a scene can pick it up again.
   */
  dropToken(frame, x, y, { id = null, max = 3, sfx = 'token_clack' } = {}) {
    const s = this.scene;
    const key = id ?? `storm_token_${this.nextId++}`;
    while (this.tokens.length >= Math.max(1, max)) s.stage.remove(this.tokens.shift());
    const rec = s.stage.add(key, { frame, x: x + 0.5, y: y + 0.85, depth: (y + 0.85) * T - 6 });
    this.tokens.push(key);
    const land = rec.img.y;
    rec.img.y = land - 6 * T;
    rec.img.setAngle(-30 + Math.random() * 60);
    s.app.audio.sfx('token_whistle', { volume: 0.35, rate: 0.9 + Math.random() * 0.3 });
    return new Promise((resolve) => {
      s.tweens.add({
        targets: rec.img,
        y: land,
        angle: Math.random() < 0.5 ? -8 : 8,
        duration: 700,
        ease: 'Bounce.Out',
        onComplete: () => {
          s.app.audio.sfx(sfx ?? 'token_clack', { volume: 0.6, rate: 0.9 + Math.random() * 0.25 });
          s.fx.burst('sparkle', rec.img.x, rec.img.y - 4, { count: 2 });
          resolve(key);
        },
      });
    });
  }

  /** Clears every prize off this map (a scene that sweeps the deck). */
  clearTokens() {
    for (const id of this.tokens) this.scene.stage?.remove?.(id);
    this.tokens = [];
  }

  /** Story Phase 10: a gentle drift of the whole view while the ship is up inside the storm. */
  swayOffset(dt) {
    const sw = this.state.sway;
    if (!sw || !(sw.maps ?? []).includes(this.scene.model?.id)) return null;
    const k = this.scene.app.settings.shakeScale();
    if (!k) return null;
    this.swayT += dt;
    const p = sw.period ?? 5200;
    const amp = (sw.amp ?? 1.5) * k;
    return {
      x: Math.sin((this.swayT / p) * Math.PI * 2) * amp,
      y: Math.sin((this.swayT / (p * 1.37)) * Math.PI * 2) * amp * 0.6,
    };
  }

  // --- below decks (Story Phase 7) ----------------------------------------------

  /** A landing on the deck overhead: a thud through the planks, a small shake, grit from the deckhead. */
  belowDecks(below, dt) {
    this.thudT -= dt;
    if (this.thudT > 0) return;
    this.thudT = between(below.every ?? [8000, 15000]);
    this.thud(below);
  }

  thud(below = this.state.below ?? {}) {
    const s = this.scene;
    this.thuds += 1;
    const sounds = below.sfx ?? ['hull_thud'];
    s.app.audio.sfx(sounds[Math.floor(Math.random() * sounds.length)], { volume: below.volume ?? 0.55, rate: 0.85 + Math.random() * 0.3 });
    const k = s.app.settings.shakeScale();
    if (k > 0) s.cameras.main.shake(220, (below.shake ?? 0.003) * k);
    if (below.dust !== false) {
      const cam = s.cameras.main;
      const n = s.app.settings.reducedEffects() ? 1 : 3;
      for (let i = 0; i < n; i++) s.fx.burst('falldust', cam.scrollX + 30 + Math.random() * (SCREEN_WIDTH - 60), cam.scrollY + 10 + Math.random() * 40);
    }
    s.app.bus.emit('script:event', { name: 'sharkstorm_thud' });
  }

  // --- sharks across the sky -----------------------------------------------------

  spawnPass() {
    const s = this.scene;
    const cam = s.cameras.main;
    const fromLeft = Math.random() < 0.5;
    const y0 = cam.scrollY + 20 + Math.random() * (SCREEN_HEIGHT - 60);
    // Inside the storm (Story Phase 10) things go across at a slant, every which way.
    const y1 = this.state.flying?.swirl ? y0 + (Math.random() - 0.5) * 160 : y0;
    const x0 = cam.scrollX + (fromLeft ? -30 : SCREEN_WIDTH + 30);
    const x1 = cam.scrollX + (fromLeft ? SCREEN_WIDTH + 30 : -30);
    const id = `storm_pass_${this.nextId++}`;
    const variants = this.state.flying?.variants ?? ['flying_shark'];
    const kind = variants[Math.floor(Math.random() * variants.length)];
    const shark = s.add.image(x0, y0, 'stage', `${kind}_0`).setDepth(79200).setFlipX(!fromLeft).setScale(0.9 + Math.random() * 0.5);
    const shadow = s.add.image(x0, y0 + 26, 'stage', 'flying_shark_shadow').setDepth(10).setAlpha(0.35);
    this.passes.push({ id, kind, shark, shadow, x0, x1, y0, y1, t: 0, dur: 1100 + Math.random() * 700, spin: (Math.random() - 0.5) * 0.02, frame: 0 });
    if (Math.random() < 0.5) s.app.audio.sfx('shark_whoosh', { volume: 0.4, rate: 0.9 + Math.random() * 0.3 });
  }

  animatePass(p, dt) {
    p.t += dt;
    const k = Math.min(1, p.t / p.dur);
    const x = p.x0 + (p.x1 - p.x0) * k;
    const y = p.y0 + ((p.y1 ?? p.y0) - p.y0) * k;
    const arc = Math.sin(k * Math.PI) * 18;
    p.shark.setPosition(x, y - arc).setRotation(p.shark.rotation + p.spin * dt);
    p.shadow.setPosition(x, y + 26);
    p.frame += dt;
    p.shark.setFrame(`${p.kind ?? 'flying_shark'}_${Math.floor(p.frame / 120) % 2}`);
    if (k >= 1) {
      p.shark.destroy();
      p.shadow.destroy();
      p.done = true;
    }
  }

  // --- a shark coming down on the deck -----------------------------------------------

  /** A walkable, empty tile near the captain (inside the storm's deck area). */
  pickTile(area) {
    const s = this.scene;
    const p = s.player;
    const [ax, ay, bx, by] = area ?? [4, 12, 15, 30];
    for (let tries = 0; tries < 24; tries++) {
      const x = Math.max(ax, Math.min(bx, p.tx + Math.round((Math.random() - 0.5) * 8)));
      const y = Math.max(ay, Math.min(by, p.ty + Math.round((Math.random() - 0.5) * 6)));
      if (s.isSolid(x, y) || (s.occupantAt(x, y) && !(x === p.tx && y === p.ty))) continue;
      return [x, y];
    }
    return null;
  }

  spawnImpact(fly) {
    const s = this.scene;
    const tile = this.pickTile(fly.areas?.[s.model.id] ?? fly.area);
    if (!tile) return;
    const [x, y] = tile;
    const id = this.nextId++;
    const ring = s.stage.add(`storm_mark_${id}`, { frame: 'duty_mark_0', x: x + 0.5, y: y + 0.4, depth: 79000 });
    const shadow = s.add.image((x + 0.5) * T, (y + 0.7) * T, 'stage', 'flying_shark_shadow').setDepth(11).setAlpha(0.1).setScale(0.4);
    s.app.audio.sfx('shark_whistle', { volume: 0.6 });
    const ground = fly.ground?.[s.model.id] ?? 'deck';
    const onHit = fly.onHit?.[s.model.id] ?? 'knock';
    this.impact = { id, x, y, t: 0, warn: fly.warnMs ?? 1500, ring, shadow, phase: 'warn', ground, onHit, push: fly.push ?? { dir: 'down', tiles: 2 } };
  }

  animateImpact(dt) {
    const s = this.scene;
    const im = this.impact;
    im.t += dt;
    if (im.phase === 'warn') {
      const k = Math.min(1, im.t / im.warn);
      im.ring.img.setFrame(Math.floor(im.t / (220 - k * 140)) % 2 ? 'duty_mark_1' : 'duty_mark_0');
      im.shadow.setScale(0.4 + k * 0.9).setAlpha(0.1 + k * 0.4);
      if (k >= 1) this.land();
      return;
    }
    if (im.phase === 'landed' && im.t > 900) {
      s.stage.remove(`storm_shark_${im.id}`);
      if (im.ground === 'land') {
        // The storm takes it back: up it goes, in a spray of sand.
        s.fx.burst('dust', (im.x + 0.5) * T, (im.y + 0.6) * T, { count: 8 });
        s.app.audio.sfx('shark_whoosh', { volume: 0.5, rate: 0.8 });
      } else {
        // It flops back over the rail with a sulk (or just sinks back into the sea).
        s.fx.burst('splash', (im.x + 0.5) * T, (im.y + 0.5) * T, { count: 8 });
        s.app.audio.sfx('splash', { volume: 0.5 });
      }
      this.impact = null;
    }
  }

  land() {
    const s = this.scene;
    const im = this.impact;
    s.stage.remove(`storm_mark_${im.id}`);
    im.shadow.destroy();
    im.phase = 'landed';
    im.t = 0;
    const water = im.ground === 'water';
    if (!water) s.stage.add(`storm_shark_${im.id}`, { frame: 'shark_deck_0', x: im.x + 0.5, y: im.y + 1, anim: 'stage:shark_flop' });
    s.app.audio.sfx(water ? 'splash_big' : 'shark_land', { volume: 0.8 });
    const burst = water ? 'splash' : im.ground === 'land' ? 'dust' : 'splinters';
    s.fx.burst(burst, (im.x + 0.5) * T, (im.y + 0.6) * T, { count: s.app.settings.reducedEffects() ? 4 : 10 });
    const k = s.app.settings.shakeScale();
    if (k > 0) s.cameras.main.shake(180, 0.006 * k);
    const p = s.player;
    const near = Math.abs(p.tx - im.x) + Math.abs(p.ty - im.y);
    if (im.onHit === 'push' ? near <= 1 : near === 0) {
      if (im.onHit === 'push') this.pushBack(im.push);
      else this.knockDown();
    }
    s.app.bus.emit('script:event', { name: 'sharkstorm_impact' });
  }

  /** The wave off a shark hitting the water next to the rowboat shoves it back a little. Never sinks it. */
  pushBack({ dir = 'down', tiles = 2 } = {}) {
    const s = this.scene;
    const p = s.player;
    if (s.isBusy?.() || p.moving) return;
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    let x = p.tx;
    let y = p.ty;
    for (let i = 0; i < tiles; i++) {
      if (s.isBlocked(x + v[0], y + v[1], p)) break;
      x += v[0];
      y += v[1];
    }
    s.barks?.show?.(p, 'Whoa!', { duration: 900 });
    if (x === p.tx && y === p.ty) return;
    s.tweens.add({ targets: p, hop: 6, duration: 120, yoyo: true, onUpdate: () => p.syncPosition() });
    s.putActor(p, { x, y });
  }

  /** Flattened, briefly. Never hurt, never lost. */
  knockDown() {
    const s = this.scene;
    const p = s.player;
    if (s.isBusy?.()) return;
    p.playPose('fallen');
    s.app.audio.sfx('thud', { volume: 0.7 });
    s.barks?.show?.(p, 'Oof!', { duration: 900 });
    s.time.delayedCall(700, () => {
      if (p.pose === 'fallen') p.playPose('idle');
    });
  }

  destroy() {
    this.clearTokens();
    for (const p of this.passes) {
      p.shark.destroy();
      p.shadow.destroy();
    }
    this.passes = [];
    if (this.impact) {
      this.scene.stage?.remove?.(`storm_mark_${this.impact.id}`);
      this.scene.stage?.remove?.(`storm_shark_${this.impact.id}`);
      this.impact.shadow?.destroy?.();
      this.impact = null;
    }
  }
}
