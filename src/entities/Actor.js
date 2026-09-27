import { TILE_SIZE, DIR_VECTORS } from '../config/constants.js';
import { FOOT_Y, FRAME_H } from '../art/characters/characterPainter.js';

/**
 * A grid-walking character in the world (player, NPC or field enemy).
 *
 * Movement is tile-to-tile: an actor reserves its destination tile when a
 * step starts and interpolates there over `stepMs`, so positions are always
 * whole tiles when idle and two actors can never overlap. Depth is the feet
 * y-coordinate so characters sort correctly against props and each other.
 *
 * Time left over when a step finishes is carried into the next step, so a
 * held direction moves at a perfectly even speed across tile boundaries, and
 * the walk cycle is driven by step progress (one stride per tile) instead of
 * a free-running animation, so feet always match the ground.
 */
export class Actor {
  constructor(scene, { id, texture, x, y, facing = 'down', kind = 'npc', anims = 'char', shadow = 'shadow_m' }) {
    this.scene = scene;
    this.id = id;
    this.kind = kind;
    this.textureKey = texture;
    this.animStyle = anims; // 'char' (anim_dir) or 'enemy' (walk_dir)
    this.tx = x;
    this.ty = y;
    this.facing = facing;
    this.moving = false;
    this.moveT = 0;
    this.stepMs = 220;
    this.from = { x, y };
    this.to = { x, y };
    this.pose = 'idle';
    this.stride = 0;
    this.carryMs = 0;
    this.locked = false;
    this.shadow = scene.add.image(0, 0, 'fx', shadow).setOrigin(0.5, 0.5);
    this.sprite = scene.add.sprite(0, 0, texture);
    if (anims === 'char') this.sprite.setOrigin(0.5, FOOT_Y / FRAME_H);
    else this.sprite.setOrigin(0.5, 1);
    this.syncPosition();
    this.playPose('idle', true);
  }

  get px() {
    const t = this.moving ? this.moveT : 1;
    return (this.from.x + (this.to.x - this.from.x) * (this.moving ? t : 1)) * TILE_SIZE + TILE_SIZE / 2;
  }

  get py() {
    const t = this.moving ? this.moveT : 1;
    return (this.from.y + (this.to.y - this.from.y) * (this.moving ? t : 1)) * TILE_SIZE + TILE_SIZE;
  }

  syncPosition() {
    const x = Math.round(this.px);
    const y = Math.round(this.py);
    this.sprite.setPosition(x, y - (this.hop || 0));
    this.sprite.setDepth(y + (this.kind === 'player' ? 0.5 : 0));
    this.shadow.setPosition(x, y - 2);
    this.shadow.setDepth(-400);
    if (this.moving && this.pose === 'walk') this.updateWalkFrame();
  }

  /** Walk frame from step progress: a stride per tile, legs alternating. */
  updateWalkFrame() {
    const secondHalf = this.moveT >= 0.5;
    let frame;
    if (this.animStyle === 'enemy') frame = `${this.facing}_${(this.stride + (secondHalf ? 1 : 0)) % 2}`;
    else {
      const leftFoot = this.stride % 2 === 0;
      frame = `walk_${this.facing}_${leftFoot ? (secondHalf ? 0 : 1) : secondHalf ? 2 : 3}`;
    }
    if (this.sprite.frame.name !== frame && this.sprite.texture.has(frame)) this.sprite.setFrame(frame);
  }

  animKey(pose, dir = this.facing) {
    if (this.animStyle === 'enemy') return `${this.textureKey}:walk_${dir}`;
    return `${this.textureKey}:${pose}_${dir}`;
  }

  playPose(pose, force = false) {
    this.pose = pose;
    if (pose === 'walk' && this.moving) {
      // Walking is stepped by movement progress, not by a timed animation.
      this.sprite.anims.stop();
      this.updateWalkFrame();
      return;
    }
    const key = this.animKey(pose);
    if (!this.scene.anims.exists(key)) return;
    const anims = this.sprite.anims;
    if (force || !anims.isPlaying || anims.currentAnim?.key !== key) this.sprite.play(key, true);
  }

  face(dir) {
    if (!dir || dir === this.facing) return;
    this.facing = dir;
    this.playPose(this.moving ? 'walk' : this.pose === 'walk' ? 'idle' : this.pose, true);
  }

  faceToward(tx, ty) {
    const dx = tx - this.tx;
    const dy = ty - this.ty;
    if (Math.abs(dx) > Math.abs(dy)) this.face(dx > 0 ? 'right' : 'left');
    else if (dy !== 0) this.face(dy > 0 ? 'down' : 'up');
  }

  /**
   * Starts a one-tile step (caller has already checked the tile is free).
   * `carryMs` is time already spent past the end of the previous step, so
   * continuous walking never loses a frame at tile boundaries.
   */
  beginStep(dir, stepMs, carryMs = 0) {
    const v = DIR_VECTORS[dir];
    this.facing = dir;
    this.from = { x: this.tx, y: this.ty };
    this.to = { x: this.tx + v.x, y: this.ty + v.y };
    this.tx = this.to.x;
    this.ty = this.to.y;
    this.moving = true;
    this.stepMs = stepMs;
    this.moveT = Math.min(0.95, Math.max(0, carryMs) / stepMs);
    this.carryMs = 0;
    this.stride += 1;
    this.playPose('walk');
    this.syncPosition();
  }

  /** Advances an in-progress step. Returns true on the frame the step completes. */
  updateMovement(delta) {
    if (!this.moving) return false;
    this.moveT += delta / this.stepMs;
    if (this.moveT >= 1) {
      this.carryMs = (this.moveT - 1) * this.stepMs;
      this.moveT = 1;
      this.moving = false;
      this.from = { x: this.tx, y: this.ty };
      this.to = { x: this.tx, y: this.ty };
      this.syncPosition();
      return true;
    }
    this.syncPosition();
    return false;
  }

  stopWalking() {
    this.carryMs = 0;
    this.playPose(this.pose === 'walk' ? 'idle' : this.pose);
  }

  setTile(x, y) {
    this.tx = x;
    this.ty = y;
    this.from = { x, y };
    this.to = { x, y };
    this.moving = false;
    this.syncPosition();
  }

  setVisible(v) {
    this.sprite.setVisible(v);
    this.shadow.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
