import { TILE_SIZE, DIR_VECTORS, OPPOSITE_DIR } from '../config/constants.js';
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
    if (this.flight) return this.flight.x;
    const t = this.moving ? this.moveT : 1;
    return (this.from.x + (this.to.x - this.from.x) * (this.moving ? t : 1)) * TILE_SIZE + TILE_SIZE / 2;
  }

  get py() {
    if (this.flight) return this.flight.y;
    const t = this.moving ? this.moveT : 1;
    return (this.from.y + (this.to.y - this.from.y) * (this.moving ? t : 1)) * TILE_SIZE + TILE_SIZE;
  }

  syncPosition() {
    const x = Math.round(this.px);
    const y = Math.round(this.py);
    const lift = (this.hop || 0) + (this.flight?.alt || 0);
    this.sprite.setPosition(x, y - lift);
    this.sprite.setDepth(this.flight?.depth ?? y + (this.kind === 'player' ? 0.5 : 0));
    this.shadow.setPosition(x, y - 2);
    this.shadow.setDepth(-400);
    this.shadow.setAlpha(this.flight ? Math.max(0.25, 1 - (this.flight.alt || 0) / 60) : 1);
    if (this.moving && this.pose === 'walk') this.updateWalkFrame();
  }

  /** Swaps the sprite sheet (a character's look changed), keeping pose and facing. */
  setTexture(key) {
    if (key === this.textureKey || !this.scene.textures.exists(key)) return;
    this.textureKey = key;
    this.sprite.setTexture(key);
    this.playPose(this.pose, true);
  }

  /** Walk frame from step progress: a stride per tile, legs alternating. */
  updateWalkFrame() {
    const secondHalf = this.moveT >= 0.5;
    let frame;
    if (this.animStyle === 'enemy') frame = `${this.facing}_${(this.stride + (secondHalf ? 1 : 0)) % 2}`;
    else {
      const leftFoot = this.stride % 2 === 0;
      // Carrying something: the carry walk cycle, if this sheet has one.
      const walk = this.carrying && this.sprite.texture.has(`carrywalk_${this.facing}_0`) ? 'carrywalk' : 'walk';
      frame = `${walk}_${this.facing}_${leftFoot ? (secondHalf ? 0 : 1) : secondHalf ? 2 : 3}`;
    }
    if (this.sprite.frame.name !== frame && this.sprite.texture.has(frame)) this.sprite.setFrame(frame);
  }

  animKey(pose, dir = this.facing) {
    if (this.animStyle === 'enemy') return `${this.textureKey}:walk_${dir}`;
    return `${this.textureKey}:${pose}_${dir}`;
  }

  playPose(pose, force = false) {
    this.pose = pose;
    // "fallen": flat on the deck (knocked over, collapsed in the fumes).
    const fallen = pose === 'fallen';
    this.sprite.setAngle(fallen ? (this.facing === 'left' ? -90 : 90) : 0);
    if (fallen) {
      const key = this.animKey('idle');
      if (this.scene.anims.exists(key)) this.sprite.play(key, true);
      this.sprite.anims.stop();
      return;
    }
    if (pose === 'walk' && this.moving) {
      // Walking is stepped by movement progress, not by a timed animation.
      this.sprite.anims.stop();
      this.updateWalkFrame();
      return;
    }
    let key = this.animKey(pose);
    if (!this.scene.anims.exists(key)) {
      // A pose this sheet doesn't have falls back to standing.
      key = this.animKey('idle');
      if (!this.scene.anims.exists(key)) return;
    }
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

  /** Turns an in-progress step around, heading back to the tile it left. */
  reverse() {
    if (!this.moving) return;
    const back = this.from;
    this.from = this.to;
    this.to = back;
    this.tx = back.x;
    this.ty = back.y;
    this.moveT = 1 - this.moveT;
    this.facing = OPPOSITE_DIR[this.facing];
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
    this.playPose(this.pose === 'walk' ? (this.carrying ? 'carry' : 'idle') : this.pose);
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
