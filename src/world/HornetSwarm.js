import { TILE_SIZE } from '../config/constants.js';
import { PixelCanvas } from '../art/PixelCanvas.js';
import { addTexture } from '../phaser/textures.js';
import { hornetsOn, hornetDef } from '../systems/hazards/hornets.js';

/**
 * Story Phase 16: draws the hornet swarm (systems/hazards/hornets.js) in the
 * room. A pool of small two-frame sprites: room hornets drift round an anchor
 * (or the whole room) with a little flocking wobble; beard hornets orbit the
 * captain's head. On DISPERSING they climb away and fade. A low buzz plays now
 * and then, louder with more of them. They never block anything and never
 * hurt anyone. Reduced effects halves the count.
 */
const T = TILE_SIZE;
const rand = (a, b) => a + Math.random() * (b - a);

function hornetTexture(scene) {
  if (scene.textures.exists('hornet')) return;
  const c = new PixelCanvas(10, 5);
  for (let f = 0; f < 2; f++) {
    const x = f * 5;
    c.set(x + 1, 2, '#e8c020'); c.set(x + 2, 2, '#202018'); c.set(x + 3, 2, '#e8c020'); c.set(x + 4, 2, '#202018');
    c.set(x + 1, 3, '#202018'); c.set(x + 2, 3, '#e8c020'); c.set(x + 3, 3, '#202018');
    // wings: up on frame 0, flat on frame 1
    if (f === 0) { c.set(x + 2, 0, '#e0f0ff'); c.set(x + 3, 1, '#e0f0ff'); } else { c.set(x + 2, 1, '#e0f0ff'); c.set(x + 3, 1, '#c8e0f0'); }
  }
  addTexture(scene, 'hornet', { canvas: c, frames: { h0: { x: 0, y: 0, w: 5, h: 5 }, h1: { x: 5, y: 0, w: 5, h: 5 } } });
}

export class HornetSwarm {
  constructor(scene) {
    this.scene = scene;
    this.bugs = [];
    this.want = { count: 0, follow: 0, anchor: null, leave: false, state: 'DORMANT' };
    this.buzzT = 1200;
    this.def = hornetDef(scene.content);
    if (this.def) hornetTexture(scene);
  }

  destroy() {
    for (const b of this.bugs) b.sprite.destroy();
    this.bugs = [];
  }

  /** How many are on screen now (tests). */
  get count() {
    return this.bugs.filter((b) => !b.gone).length;
  }

  sync() {
    if (!this.def) return;
    const want = hornetsOn(this.scene.content, this.scene.session, this.scene.model.id);
    const reduced = this.scene.app.settings?.reducedEffects?.();
    if (reduced) {
      want.count = Math.ceil(want.count / 2);
      want.follow = Math.ceil(want.follow / 2);
    }
    this.want = want;
    const room = this.bugs.filter((b) => !b.follow && !b.gone);
    const beard = this.bugs.filter((b) => b.follow && !b.gone);
    this.adjust(room, want.count, false);
    this.adjust(beard, want.follow, true);
    if (want.leave) for (const b of this.bugs) b.leaving = true;
  }

  adjust(list, n, follow) {
    for (let i = list.length; i < n; i++) this.spawn(follow);
    for (let i = n; i < list.length; i++) list[i].leaving = true;
  }

  home() {
    const m = this.scene.model;
    const a = this.want.anchor;
    if (a) return { x: a[0] * T + T / 2, y: a[1] * T + T / 2, r: T * 2.5 };
    return { x: (m.width * T) / 2, y: (m.height * T) / 2, r: Math.min(m.width, m.height) * T * 0.35 };
  }

  spawn(follow) {
    const h = this.home();
    const p = this.scene.player;
    const x = follow && p ? p.x + rand(-20, 20) : h.x + rand(-h.r, h.r);
    const y = follow && p ? p.y - 30 + rand(-10, 10) : h.y + rand(-h.r, h.r);
    const sprite = this.scene.add.image(x, y, 'hornet', 'h0').setDepth(60000).setAlpha(0);
    this.scene.tweens.add({ targets: sprite, alpha: 1, duration: 300 });
    this.bugs.push({ sprite, follow, vx: rand(-20, 20), vy: rand(-20, 20), phase: rand(0, 6.28), t: 0, leaving: false, gone: false });
  }

  update(dt) {
    if (!this.bugs.length) return;
    const s = dt / 1000;
    const h = this.home();
    const p = this.scene.player;
    for (const b of this.bugs) {
      if (b.gone) continue;
      b.t += s;
      b.sprite.setFrame((Math.floor(b.t * 18) % 2) ? 'h1' : 'h0');
      if (b.leaving) {
        b.vy -= 90 * s;
        b.sprite.alpha = Math.max(0, b.sprite.alpha - s * 0.9);
        if (b.sprite.alpha <= 0) {
          b.gone = true;
          b.sprite.destroy();
          continue;
        }
      } else {
        // Toward a point: the captain's head (beard hornets) or somewhere round the home.
        const tx = b.follow && p ? p.x + Math.cos(b.t * 3 + b.phase) * 11 : h.x + Math.cos(b.t * 0.7 + b.phase) * h.r;
        const ty = b.follow && p ? p.y - 22 + Math.sin(b.t * 4 + b.phase) * 6 : h.y + Math.sin(b.t * 0.9 + b.phase * 1.3) * h.r * 0.6;
        const k = b.follow ? 6 : 1.4;
        b.vx += ((tx - b.sprite.x) * k + rand(-60, 60)) * s;
        b.vy += ((ty - b.sprite.y) * k + rand(-60, 60)) * s;
        b.vx *= 1 - Math.min(0.9, s * 2.2);
        b.vy *= 1 - Math.min(0.9, s * 2.2);
      }
      b.sprite.x += b.vx * s;
      b.sprite.y += b.vy * s;
      b.sprite.setFlipX(b.vx < 0);
    }
    this.bugs = this.bugs.filter((b) => !b.gone);
    // The buzz: now and then, louder with more of them (never a constant drone).
    this.buzzT -= dt;
    if (this.buzzT <= 0 && this.count > 0) {
      this.buzzT = rand(2200, 3600);
      this.scene.app.audio?.sfx(this.def.buzz ?? 'hornet_buzz', { volume: Math.min(0.55, 0.15 + this.count * 0.01) });
    }
  }
}
