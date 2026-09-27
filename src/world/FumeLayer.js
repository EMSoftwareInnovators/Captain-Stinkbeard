import { TILE_SIZE, SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';
import { zoneRect, fumeRank } from '../systems/hazards/fumes.js';

/**
 * Draws fume zones (see systems/hazards/fumes.js) as layered, churning
 * clouds rather than flat rectangles:
 *   - outer haze: big soft mustard blobs that breathe slowly
 *   - currents:   darker yellow streaks sliding through the zone
 *   - core:       for the Dead Center, dense dark blobs with sickly green
 *                 turbulence
 * plus a screen vignette that closes in as the air gets thicker around the
 * captain, a whole-map haze tint and rising odour lines.
 *
 * Every blob is pooled and the total is capped (MAX_BLOBS, halved on
 * "Reduced" effects), so a ship full of fumes costs a fixed, small number of
 * sprites.
 */
const MAX_BLOBS = 180;
const DEPTH = 70010;

const LAYER_STYLE = {
  outer: { frames: ['fcloud_l0', 'fcloud_l1'], tints: [0xf0d860, 0xe0c048, 0xe8d070], density: 0.45 },
  current: { frames: ['fswirl_0', 'fswirl_1', 'fswirl_2'], tints: [0xc8a02a, 0xb89020], density: 0.18 },
  core: { frames: ['fcloud_m0', 'fcloud_m1', 'fcloud_s0'], tints: [0xa88418, 0x98a82c, 0x8a9c24, 0xb08a1a], density: 0.7 },
};

const LEVEL_ALPHA = { light: 0.22, dense: 0.4, center: 0.56 };
const VIGNETTE_ALPHA = { none: 0, light: 0.2, dense: 0.5, center: 0.8 };
const VIGNETTE_SCALE = { none: 1.25, light: 1.12, dense: 1.0, center: 0.84 };
/** During cutscenes the clouds thin and the vignette opens so the scene reads. */
const CINEMATIC_CLOUD = 0.42;
const TINT_ALPHA = { none: 0, light: 0.05, dense: 0.12, center: 0.2 };
const HAZE_ALPHA = { faint: 0.045, light: 0.09, dense: 0.16 };

function hashRand(seed) {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

export class FumeLayer {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.clusters = [];
    this.pool = [];
    this.used = 0;
    this.reduced = false;
    this.time = 0;
    this.hazeLevel = null;
    this.odorTimer = 0;
    this.vLevel = 0;
    this.vScale = 1.25;
    this.tintA = 0;
    this.cinematic = false;
    this.cineK = 1;
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;
    this.vignette = scene.add.image(cx, cy, 'fume_vignette').setScrollFactor(0).setDepth(DEPTH + 8).setAlpha(0);
    this.tint = scene.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0xd8c040, 1).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 7).setAlpha(0);
    this.haze = scene.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0xd0b848, 1).setOrigin(0).setScrollFactor(0).setDepth(DEPTH + 6).setAlpha(0);
  }

  get budget() {
    return this.reduced ? MAX_BLOBS / 2 : MAX_BLOBS;
  }

  blob() {
    const img = this.pool.pop() ?? this.scene.add.image(0, 0, 'fx', 'fcloud_l0');
    img.setVisible(true).setAngle(0).setScale(1).setAlpha(0);
    return img;
  }

  /** Rebuilds the clouds for a new set of zones (story changed, map loaded). */
  setZones(zones) {
    const keep = new Map(this.clusters.map((c) => [c.zone.id ?? c.zone, c]));
    const next = [];
    const wanted = new Set(zones.map((z) => z.id ?? z));
    for (const c of this.clusters) {
      if (!wanted.has(c.zone.id ?? c.zone)) this.dropCluster(c);
    }
    // Share the blob budget between zones by area (the Dead Center gets extra).
    const weights = zones.map((z) => (z.w ?? 1) * (z.h ?? 1) * (z.level === 'center' ? 2.2 : z.level === 'dense' ? 1.3 : 0.8));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    zones.forEach((z, i) => {
      const existing = keep.get(z.id ?? z);
      if (existing && existing.level === z.level && existing.w === z.w && existing.h === z.h) {
        existing.zone = z;
        next.push(existing);
        return;
      }
      if (existing) this.dropCluster(existing);
      const share = Math.max(3, Math.floor((this.budget * weights[i]) / total));
      next.push(this.buildCluster(z, share));
    });
    this.clusters = next;
  }

  buildCluster(zone, share) {
    const rnd = hashRand(String(zone.id ?? 'z').split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
    const area = (zone.w ?? 1) * (zone.h ?? 1);
    const layers = zone.level === 'center' ? ['outer', 'current', 'core'] : zone.level === 'dense' ? ['outer', 'current'] : ['outer'];
    const blobs = [];
    for (const layer of layers) {
      const style = LAYER_STYLE[layer];
      const n = Math.min(Math.ceil(area * style.density) + 1, Math.ceil(share * (layer === 'outer' ? 0.5 : layer === 'core' ? 0.35 : 0.2)));
      for (let i = 0; i < n; i++) {
        const img = this.blob();
        img.setFrame(style.frames[Math.floor(rnd() * style.frames.length)]);
        img.setTint(style.tints[Math.floor(rnd() * style.tints.length)]);
        img.setDepth(DEPTH + (layer === 'outer' ? 0 : layer === 'current' ? 1 : 2));
        if (layer !== 'current') img.setFlipX(rnd() < 0.5);
        blobs.push({
          img,
          layer,
          ox: rnd(),
          oy: rnd(),
          phase: rnd() * Math.PI * 2,
          speed: 0.6 + rnd() * 0.8,
          scale: layer === 'outer' ? 0.9 + rnd() * 0.6 : 0.7 + rnd() * 0.5,
          flow: (rnd() < 0.5 ? -1 : 1) * (0.02 + rnd() * 0.04),
        });
      }
    }
    return { zone, level: zone.level, w: zone.w, h: zone.h, blobs, fade: 0 };
  }

  dropCluster(c) {
    for (const b of c.blobs) {
      b.img.setVisible(false);
      this.pool.push(b.img);
    }
    c.blobs = [];
  }

  setHaze(level) {
    this.hazeLevel = level;
  }

  setReduced(reduced) {
    if (this.reduced === reduced) return;
    this.reduced = reduced;
    const zones = this.clusters.map((c) => c.zone);
    for (const c of this.clusters) this.dropCluster(c);
    this.clusters = [];
    this.setZones(zones);
  }

  /**
   * @param dt ms
   * @param level fume level around the captain (null = clean air)
   * @param fx FxPool for odour lines
   */
  update(dt, level, fx = null) {
    this.time += dt;
    const t = this.time;
    const T = TILE_SIZE;
    this.cineK += ((this.cinematic ? CINEMATIC_CLOUD : 1) - this.cineK) * Math.min(1, dt / 500);
    for (const c of this.clusters) {
      c.fade = Math.min(1, c.fade + dt / 700);
      const r = zoneRect(c.zone, c.zone.transient ? 0 : this.scene.fumeClock ?? t);
      const base = (LEVEL_ALPHA[c.level] ?? 0.4) * (c.zone.alpha ?? 1) * c.fade * this.cineK;
      for (const b of c.blobs) {
        const breathe = Math.sin(t / (1400 / b.speed) + b.phase);
        let x;
        if (b.layer === 'current') {
          // Currents slide through the zone and wrap around.
          const u = (((b.ox + (t / 1000) * b.flow) % 1) + 1) % 1;
          x = (r.x + u * r.w) * T;
        } else x = (r.x + b.ox * r.w) * T + Math.sin(t / 2100 + b.phase) * 5;
        const y = (r.y + b.oy * r.h) * T + Math.cos(t / 1700 + b.phase) * 3;
        b.img.setPosition(Math.round(x), Math.round(y));
        const sc = b.scale * (1 + breathe * (b.layer === 'core' ? 0.12 : 0.06));
        b.img.setScale(sc);
        if (b.layer === 'core') b.img.setAngle(((t / 40) * b.flow * 10 + b.phase * 57) % 360);
        const a = b.layer === 'outer' ? base * 0.75 : b.layer === 'current' ? base * 0.8 : base;
        b.img.setAlpha(Math.max(0, Math.min(1, a * (0.85 + breathe * 0.15))));
      }
    }
    // Screen effects follow the air around the captain, easing in and out.
    let key = level ?? 'none';
    if (this.cinematic && (key === 'dense' || key === 'center')) key = 'light';
    const ease = Math.min(1, dt / 350);
    const vTarget = VIGNETTE_ALPHA[key] * (this.reduced ? 0.7 : 1);
    this.vLevel += (vTarget - this.vLevel) * ease;
    this.vScale += (VIGNETTE_SCALE[key] - this.vScale) * ease;
    const wobble = this.reduced || key !== 'center' ? 0 : Math.sin(t / 260) * 0.02;
    this.vignette.setAlpha(this.vLevel).setScale(this.vScale + wobble);
    this.tintA += (TINT_ALPHA[key] - this.tintA) * ease;
    this.tint.setAlpha(this.tintA);
    const hz = this.hazeLevel ? HAZE_ALPHA[this.hazeLevel] ?? 0 : 0;
    this.haze.setAlpha(hz);
    // Rising odour lines wherever there is haze or fumes near the camera.
    if (fx && (this.hazeLevel || this.clusters.length)) {
      this.odorTimer -= dt;
      if (this.odorTimer <= 0) {
        this.odorTimer = (this.hazeLevel === 'dense' ? 500 : 900) * (this.reduced ? 2 : 1) + Math.random() * 500;
        const cam = this.scene.cameras.main;
        fx.burst('odor', cam.scrollX + 20 + Math.random() * (SCREEN_WIDTH - 40), cam.scrollY + 40 + Math.random() * (SCREEN_HEIGHT - 70), { count: 1 });
      }
    }
  }

  /** Strongest level among clusters, for audio beds. */
  strongest() {
    let best = null;
    for (const c of this.clusters) if (fumeRank(c.level, this.config) > fumeRank(best, this.config)) best = c.level;
    return best;
  }

  destroy() {
    for (const c of this.clusters) this.dropCluster(c);
    for (const img of this.pool) img.destroy();
    this.pool = [];
    this.vignette.destroy();
    this.tint.destroy();
    this.haze.destroy();
  }
}
