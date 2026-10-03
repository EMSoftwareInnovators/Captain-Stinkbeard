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
  }

  get state() {
    return sharkstormNow(this.scene.content, this.scene.session);
  }

  get onDeck() {
    return this.scene.model?.id === 'main_deck';
  }

  update(dt, busy) {
    const st = this.state;
    for (const p of this.passes) this.animatePass(p, dt);
    this.passes = this.passes.filter((p) => !p.done);
    if (this.impact) this.animateImpact(dt);
    if (st.below && !busy && (st.below.maps ?? []).includes(this.scene.model?.id)) this.belowDecks(st.below, dt);
    if (!this.onDeck) return;
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
    // Landings only while the captain can move (never during a scene).
    if (busy || this.impact || !fly.impactEvery) return;
    this.impactT -= dt;
    if (this.impactT <= 0) {
      this.impactT = between(fly.impactEvery);
      this.spawnImpact(fly);
    }
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
    const x0 = cam.scrollX + (fromLeft ? -30 : SCREEN_WIDTH + 30);
    const x1 = cam.scrollX + (fromLeft ? SCREEN_WIDTH + 30 : -30);
    const id = `storm_pass_${this.nextId++}`;
    const variants = this.state.flying?.variants ?? ['flying_shark'];
    const kind = variants[Math.floor(Math.random() * variants.length)];
    const shark = s.add.image(x0, y0, 'stage', `${kind}_0`).setDepth(79200).setFlipX(!fromLeft).setScale(0.9 + Math.random() * 0.5);
    const shadow = s.add.image(x0, y0 + 26, 'stage', 'flying_shark_shadow').setDepth(10).setAlpha(0.35);
    this.passes.push({ id, kind, shark, shadow, x0, x1, y0, t: 0, dur: 1100 + Math.random() * 700, spin: (Math.random() - 0.5) * 0.02, frame: 0 });
    if (Math.random() < 0.5) s.app.audio.sfx('shark_whoosh', { volume: 0.4, rate: 0.9 + Math.random() * 0.3 });
  }

  animatePass(p, dt) {
    p.t += dt;
    const k = Math.min(1, p.t / p.dur);
    const x = p.x0 + (p.x1 - p.x0) * k;
    const arc = Math.sin(k * Math.PI) * 18;
    p.shark.setPosition(x, p.y0 - arc).setRotation(p.shark.rotation + p.spin * dt);
    p.shadow.setPosition(x, p.y0 + 26);
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
    const tile = this.pickTile(fly.area);
    if (!tile) return;
    const [x, y] = tile;
    const id = this.nextId++;
    const ring = s.stage.add(`storm_mark_${id}`, { frame: 'duty_mark_0', x: x + 0.5, y: y + 0.4, depth: 79000 });
    const shadow = s.add.image((x + 0.5) * T, (y + 0.7) * T, 'stage', 'flying_shark_shadow').setDepth(11).setAlpha(0.1).setScale(0.4);
    s.app.audio.sfx('shark_whistle', { volume: 0.6 });
    this.impact = { id, x, y, t: 0, warn: fly.warnMs ?? 1500, ring, shadow, phase: 'warn' };
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
      // It flops back over the rail with a sulk.
      s.stage.remove(`storm_shark_${im.id}`);
      s.fx.burst('splash', (im.x + 0.5) * T, (im.y + 0.5) * T, { count: 8 });
      s.app.audio.sfx('splash', { volume: 0.5 });
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
    s.stage.add(`storm_shark_${im.id}`, { frame: 'shark_deck_0', x: im.x + 0.5, y: im.y + 1, anim: 'stage:shark_flop' });
    s.app.audio.sfx('shark_land', { volume: 0.8 });
    s.fx.burst('splinters', (im.x + 0.5) * T, (im.y + 0.6) * T, { count: s.app.settings.reducedEffects() ? 4 : 10 });
    const k = s.app.settings.shakeScale();
    if (k > 0) s.cameras.main.shake(180, 0.006 * k);
    const p = s.player;
    if (p.tx === im.x && p.ty === im.y) this.knockDown();
    s.app.bus.emit('script:event', { name: 'sharkstorm_impact' });
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
