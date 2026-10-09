/**
 * Pooled one-shot particles for the world: coins flying from a blast, wood
 * splinters, feathers, fume puffs, odour lines, splashes. A fixed number of
 * image objects is created once and recycled, so even the biggest set-piece
 * never allocates more than `max` sprites (and "Reduced" visual effects
 * halves every burst).
 *
 *   fx.burst('coins', x, y, { count: 30, speed: 140 })
 */
export const PARTICLE_KINDS = {
  coins: { frames: ['coin_0', 'coin_1', 'coin_2', 'coin_3'], animMs: 70, count: 16, speed: [60, 150], up: 110, gravity: 380, life: [700, 1300], bounce: 0.35, fade: 0.25, depthOffset: 4 },
  gems: { frames: ['gem_r', 'gem_b', 'gem_g', 'pearl'], count: 6, speed: [50, 120], up: 90, gravity: 360, life: [700, 1200], bounce: 0.3, fade: 0.25, pick: true },
  splinters: { frames: ['splinter_0', 'splinter_1'], count: 12, speed: [70, 170], up: 90, gravity: 420, life: [500, 900], spin: 12, fade: 0.3 },
  feathers: { frames: ['feather_r', 'feather_b', 'feather_y'], count: 8, speed: [20, 60], up: 30, gravity: 22, drag: 1.6, life: [1400, 2400], sway: 18, spin: 2, fade: 0.4, pick: true },
  sparkle: { frames: ['sparkle_0', 'sparkle_1', 'sparkle_2', 'sparkle_3'], animMs: 90, count: 6, speed: [0, 20], up: 0, gravity: 0, life: [360, 520], fade: 0.3, spread: 10, depth: 80003 },
  fume: { frames: ['puff_0', 'puff_1', 'puff_2'], count: 10, speed: [10, 50], up: 14, gravity: -8, drag: 0.8, life: [1200, 2200], grow: 0.9, fade: 0.6, alpha: 0.75, pick: true, depth: 70012 },
  odor: { frames: ['odor_0', 'odor_1', 'odor_2'], animMs: 160, count: 1, speed: [0, 4], up: 14, gravity: -4, life: [1500, 2200], fade: 0.5, alpha: 0.8, depth: 70013 },
  splash: { frames: ['drop_0', 'drop_1'], count: 10, speed: [30, 90], up: 120, gravity: 420, life: [400, 700], fade: 0.3 },
  dust: { frames: ['dust_0', 'dust_1'], count: 6, speed: [10, 40], up: 10, gravity: -6, drag: 1.2, life: [500, 900], grow: 0.6, fade: 0.6, alpha: 0.7 },
  // Story Phase 7: grit shaken out of the deckhead below decks when something heavy lands overhead.
  falldust: { frames: ['dust_0', 'dust_1'], count: 5, speed: [0, 12], up: 0, gravity: 70, drag: 0.6, life: [700, 1200], fade: 0.5, alpha: 0.55, spread: 18, pick: true, depth: 79100 },
  // Story Phase 8: the Grand Stenchmaster Suit letting out a little of what it has absorbed (FWOoF).
  suitpuff: { frames: ['puff_0', 'puff_1', 'puff_2'], count: 3, speed: [4, 18], up: 10, gravity: -10, drag: 1.1, life: [900, 1500], grow: 0.8, fade: 0.55, alpha: 0.6, tint: 0xd8cc6a, pick: true, spread: 5, depth: 70012 },
  // Story Phase 10: the Bean Smoothie gets loose (it rains beans), and the Bling Bling King's prizes come with confetti.
  beans: { frames: ['bean_0', 'bean_1', 'bean_2'], count: 14, speed: [30, 110], up: 120, gravity: 380, life: [600, 1100], spin: 6, bounce: 0.25, fade: 0.3, pick: true },
  confetti: { frames: ['confetti_0', 'confetti_1', 'confetti_2', 'confetti_3'], count: 14, speed: [20, 70], up: 60, gravity: 40, drag: 1.4, life: [1200, 2200], sway: 14, spin: 4, fade: 0.4, pick: true, depth: 80002 },
  dishes: { frames: ['dish_0', 'dish_1', 'fork'], count: 4, speed: [30, 80], up: 100, gravity: 400, life: [500, 800], spin: 8, bounce: 0.2, fade: 0.2, pick: true },
  // Story Phase 14: the Grand Bank's forms after a deposit, cards thrown up in the Fart-Free Zone, oats, plastic tokens, peppery embers.
  papers: { frames: ['paper_0', 'paper_1', 'paper_2'], count: 8, speed: [30, 90], up: 70, gravity: 50, drag: 1.5, life: [1200, 2000], sway: 16, spin: 3, fade: 0.4, pick: true, depth: 80002 },
  cards: { frames: ['card_0', 'card_1', 'card_2'], count: 12, speed: [20, 70], up: 110, gravity: 45, drag: 1.4, life: [1600, 2600], sway: 18, spin: 4, fade: 0.35, pick: true, depth: 80002 },
  oats: { frames: ['oat_0', 'oat_1', 'oat_2'], count: 18, speed: [30, 120], up: 110, gravity: 380, life: [600, 1100], spin: 6, bounce: 0.25, fade: 0.3, pick: true },
  tokens: { frames: ['gtoken_0', 'gtoken_1', 'gtoken_2'], count: 12, speed: [40, 120], up: 100, gravity: 380, life: [700, 1200], bounce: 0.4, fade: 0.25, pick: true, depthOffset: 4 },
  embers: { frames: ['ember_0', 'ember_1'], count: 4, speed: [4, 16], up: 22, gravity: -16, drag: 1, life: [500, 900], fade: 0.5, pick: true, spread: 3, depth: 80003 },
};

const rand = (a, b) => a + Math.random() * (b - a);

export class FxPool {
  constructor(scene, { max = 220, texture = 'fx' } = {}) {
    this.scene = scene;
    this.texture = texture;
    this.max = max;
    this.free = [];
    this.live = [];
    this.reduced = false;
  }

  acquire() {
    let img = this.free.pop();
    if (!img) {
      if (this.live.length + this.free.length >= this.max) {
        // Recycle the oldest live particle rather than exceed the budget.
        const oldest = this.live.shift();
        if (!oldest) return null;
        img = oldest.img;
      } else img = this.scene.add.image(0, 0, this.texture, 'coin_0');
    }
    img.setVisible(true).setAlpha(1).setScale(1).setAngle(0).clearTint();
    return img;
  }

  release(p) {
    p.img.setVisible(false);
    this.free.push(p.img);
  }

  /**
   * Emits a burst at world pixel (x, y). Options override the kind's defaults:
   * count, speed [min,max], up (initial upward kick), spread (px), dir (radians,
   * default: all around), cone (radians), tint, depth, floorY (bounce line).
   */
  burst(kind, x, y, opts = {}) {
    const k = { ...PARTICLE_KINDS[kind], ...opts };
    if (!k.frames) return;
    let count = Math.round(k.count ?? 8);
    if (this.reduced) count = Math.max(1, Math.round(count / 2));
    const floorY = opts.floorY ?? y + rand(6, 14);
    for (let i = 0; i < count; i++) {
      const img = this.acquire();
      if (!img) return;
      const ang = k.dir !== undefined ? k.dir + rand(-(k.cone ?? 0.8), k.cone ?? 0.8) : rand(0, Math.PI * 2);
      const sp = rand(k.speed[0], k.speed[1]);
      const frame = k.pick ? k.frames[Math.floor(Math.random() * k.frames.length)] : k.frames[0];
      const s = k.spread ?? 3;
      const p = {
        img,
        kind: k,
        frame0: frame,
        x: x + rand(-s, s),
        y: y + rand(-s, s),
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp * 0.6 - (k.up ?? 0) * rand(0.6, 1.1),
        age: 0,
        life: rand(k.life[0], k.life[1]),
        spin: (k.spin ?? 0) * rand(-1, 1),
        phase: rand(0, Math.PI * 2),
        floorY: floorY + rand(-4, 4),
        bounced: 0,
      };
      img.setFrame(frame);
      img.setDepth(k.depth ?? floorY + (k.depthOffset ?? 2));
      if (k.tint) img.setTint(k.tint);
      img.setAlpha(k.alpha ?? 1);
      this.live.push(p);
    }
  }

  update(dt) {
    const sec = dt / 1000;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      const k = p.kind;
      p.age += dt;
      if (p.age >= p.life) {
        this.live.splice(i, 1);
        this.release(p);
        continue;
      }
      p.vy += (k.gravity ?? 0) * sec;
      if (k.drag) {
        p.vx -= p.vx * k.drag * sec;
        p.vy -= p.vy * k.drag * sec * 0.5;
      }
      p.x += p.vx * sec;
      p.y += p.vy * sec;
      if (k.bounce !== undefined && p.y > p.floorY && p.vy > 0) {
        p.y = p.floorY;
        p.vy = -p.vy * k.bounce;
        p.vx *= 0.6;
        p.bounced += 1;
      }
      const sway = k.sway ? Math.sin(p.age / 180 + p.phase) * k.sway * sec * 4 : 0;
      p.x += sway;
      const u = p.age / p.life;
      const img = p.img;
      img.setPosition(Math.round(p.x), Math.round(p.y));
      if (k.animMs && k.frames.length > 1 && !k.pick) img.setFrame(k.frames[Math.floor(p.age / k.animMs) % k.frames.length]);
      if (p.spin) img.setAngle(img.angle + p.spin * dt * 0.05);
      if (k.grow) img.setScale(1 + u * k.grow);
      const fadeFrom = 1 - (k.fade ?? 0.3);
      img.setAlpha((k.alpha ?? 1) * (u > fadeFrom ? 1 - (u - fadeFrom) / (1 - fadeFrom) : 1));
    }
  }

  clear() {
    for (const p of this.live) this.release(p);
    this.live = [];
  }

  destroy() {
    for (const p of this.live) p.img.destroy();
    for (const img of this.free) img.destroy();
    this.live = [];
    this.free = [];
  }
}
