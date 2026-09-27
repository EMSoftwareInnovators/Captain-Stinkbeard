import { TILE_SIZE } from '../config/constants.js';

/**
 * Free sprites that cutscenes place and move off the tile grid: a bathtub
 * drifting alongside, a frigate on the horizon, a rowboat being lowered.
 * Positions are in tiles (fractions allowed) so data reads like map data.
 *
 * Also draws the rescue rope ("tether"): a line from an anchor point that
 * follows the path the captain actually walked, so it trails behind him
 * around corners and shortens again as he backtracks.
 */
export class Stage {
  constructor(scene) {
    this.scene = scene;
    this.sprites = new Map();
    this.tether = null;
  }

  frameSource(frame) {
    const tex = this.scene.textures;
    if (tex.exists('stage') && tex.get('stage').has(frame)) return 'stage';
    if (tex.get('props').has(frame)) return 'props';
    return 'fx';
  }

  /**
   * @param {string} id
   * @param {{frame:string, x:number, y:number, depth?:number, flip?:boolean, anim?:string, alpha?:number, bob?:number, below?:boolean}} o
   */
  add(id, o) {
    this.remove(id);
    const s = this.scene;
    const key = this.frameSource(o.frame);
    const img = s.add.sprite(o.x * TILE_SIZE, o.y * TILE_SIZE, key, o.frame).setOrigin(0.5, 1);
    if (o.flip) img.setFlipX(true);
    if (o.alpha !== undefined) img.setAlpha(o.alpha);
    if (o.anim && s.anims.exists(o.anim)) img.play(o.anim);
    const rec = { img, bob: o.bob ?? 0, phase: Math.random() * 6, baseY: img.y, depth: o.depth, below: !!o.below };
    this.applyDepth(rec);
    this.sprites.set(id, rec);
    return rec;
  }

  applyDepth(rec) {
    // On the ocean around the ship (under the hull), or y-sorted like an actor.
    if (rec.depth !== undefined) rec.img.setDepth(rec.depth);
    else if (rec.below) rec.img.setDepth(-2400);
    else rec.img.setDepth(rec.baseY);
  }

  get(id) {
    return this.sprites.get(id) ?? null;
  }

  remove(id) {
    const rec = this.sprites.get(id);
    if (!rec) return;
    this.scene.tweens.killTweensOf(rec.img);
    rec.img.destroy();
    this.sprites.delete(id);
  }

  /** Tweens a sprite to (x, y) in tiles; resolves when it arrives. */
  move(id, { x, y, duration = 1000, ease = 'Sine.InOut', alpha, scale, angle }) {
    const rec = this.sprites.get(id);
    if (!rec) return Promise.resolve();
    const s = this.scene;
    const props = {};
    if (x !== undefined) props.x = x * TILE_SIZE;
    if (y !== undefined) props.baseY = y * TILE_SIZE;
    if (alpha !== undefined) props.alpha = alpha;
    if (scale !== undefined) props.scale = scale;
    if (angle !== undefined) props.angle = angle;
    return new Promise((resolve) => {
      const targets = [rec.img];
      const imgProps = { ...props };
      delete imgProps.baseY;
      if (props.baseY !== undefined) s.tweens.add({ targets: rec, baseY: props.baseY, duration, ease });
      s.tweens.add({ targets, ...imgProps, duration, ease, onComplete: resolve });
    });
  }

  setFrame(id, frame) {
    const rec = this.sprites.get(id);
    if (!rec) return;
    rec.img.anims.stop();
    rec.img.setFrame(frame);
  }

  update(time) {
    for (const rec of this.sprites.values()) {
      const bob = rec.bob ? Math.round(Math.sin(time / 520 + rec.phase) * rec.bob) : 0;
      rec.img.y = Math.round(rec.baseY + bob);
      rec.img.x = Math.round(rec.img.x);
      if (rec.depth === undefined && !rec.below) rec.img.setDepth(rec.baseY);
    }
    this.drawTether();
  }

  // --- the rescue rope ---------------------------------------------------------

  startTether(x, y) {
    this.stopTether();
    const g = this.scene.add.graphics().setDepth(60050);
    this.tether = { g, points: [{ x, y }] };
  }

  stopTether() {
    this.tether?.g.destroy();
    this.tether = null;
  }

  /** Called whenever the captain arrives on a tile. */
  tetherStep(x, y) {
    const t = this.tether;
    if (!t) return;
    const pts = t.points;
    const prev = pts[pts.length - 2];
    if (prev && prev.x === x && prev.y === y) pts.pop();
    else pts.push({ x, y });
    if (pts.length > 240) pts.splice(1, 1);
  }

  drawTether() {
    const t = this.tether;
    if (!t) return;
    const p = this.scene.player;
    const g = t.g;
    g.clear();
    const T = TILE_SIZE;
    const pts = t.points.map((q) => ({ x: q.x * T + T / 2, y: q.y * T + T / 2 + 4 }));
    pts.push({ x: p.px, y: p.py - 14 });
    // Shadow, then rope with a highlight, so it reads on any floor.
    for (const [w, col, dy] of [[3, 0x140e18, 1], [2, 0xa67c3e, 0], [1, 0xe8cc8c, -0.5]]) {
      g.lineStyle(w, col, 1);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y + dy);
      for (let i = 1; i < pts.length; i++) {
        // A little sag between points.
        const a = pts[i - 1];
        const b = pts[i];
        g.lineTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 2 + dy);
        g.lineTo(b.x, b.y + dy);
      }
      g.strokePath();
    }
  }

  clear() {
    for (const id of [...this.sprites.keys()]) this.remove(id);
    this.stopTether();
  }
}
