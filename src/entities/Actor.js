import { TILE_SIZE, DIR_VECTORS, OPPOSITE_DIR } from '../config/constants.js';
import { FOOT_Y, FRAME_H } from '../art/characters/characterPainter.js';
import { HammockSleeper } from './hammockSleeper.js';

/**
 * Poses lying down. "fallen": flat on the deck (knocked over, collapsed in
 * the fumes), turned about the feet. "asleep": the same, eyes shut (asleep
 * where they dropped). "hammock": asleep in a hammock, drawn the way the
 * hammock props draw a sleeper (see hammockSleeper.js) when the hammock says
 * where its canvas hangs ("sling"), else turned on their side along the
 * middle of it under a blanket; someone up in a hammock is off the floor, so
 * people walk underneath ("aloft"). "hammock_awake": the same, eyes open. "bedroll": turned on their side along
 * the middle of a bed on the floor, under a blanket. A placement puts a
 * sleeper on a tile of their hammock or bedroll (a prop with "bed": true).
 * `lift` raises a sleeper lying along a bed from the middle of the tile.
 */
export const LYING_POSES = {
  fallen: { frame: 'idle', lift: 0, blanket: false, center: false },
  asleep: { frame: 'sleep', lift: 0, blanket: false, center: false },
  hammock: { frame: 'sleep', lift: 5, blanket: true, center: true, above: true },
  hammock_awake: { frame: 'idle', lift: 5, blanket: true, center: true, above: true },
  bedroll: { frame: 'sleep', lift: 0, blanket: true, center: true },
};
/** The depth of things slung overhead (WorldScene props on the "overhead" layer). */
const OVERHEAD_DEPTH = 55000;

/**
 * Blankets (fx frames): most of the crew, and the broad ones (the suit). The
 * blanket's edge goes at the neck: `neck` is where the neck is from the
 * middle of the sprite, head to the right (mirrored for a head on the left).
 */
const BLANKETS = {
  normal: { frame: 'sleep_blanket', neck: [1, 0] },
  broad: { frame: 'sleep_blanket_l', neck: [-1, 2] },
};
/** Shoulder width (px) of each character texture's sleep frame, measured once. */
const SHOULDERS = new Map();
function shoulderWidth(scene, key) {
  if (SHOULDERS.has(key)) return SHOULDERS.get(key);
  let w = 18;
  try {
    const f = scene.textures.getFrame(key, 'sleep_down_0');
    const ctx = f?.source?.image?.getContext?.('2d');
    if (ctx) {
      const row = ctx.getImageData(f.cutX, f.cutY + 32, f.cutWidth, 1).data;
      let a = -1;
      let b = -1;
      for (let x = 0; x < f.cutWidth; x++) {
        if (row[x * 4 + 3] === 0) continue;
        if (a < 0) a = x;
        b = x;
      }
      if (a >= 0) w = b - a + 1;
    }
  } catch {
    // keep the usual width
  }
  SHOULDERS.set(key, w);
  return w;
}

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
    this.fade = 1; // fading in or out of the room (WorldScene.fadeActor)
    this.headLeft = false; // lying down: which end the head is (see layDown)
    this.bedDx = 0; // lying in a bed: from the middle of the tile to the middle of the bed
    this.sling = null; // asleep in a hammock's canvas (HammockSleeper)
    this.vehicle = null; // sitting in something that moves with them (Story Phase 9: the rowboat)
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
    const lie = this.lying;
    if (this.sling) {
      // In a hammock's canvas, head on the pillow end (drawn over things slung overhead).
      this.sling.sync(OVERHEAD_DEPTH + 1 + y);
    } else if (lie?.center) {
      // Lying along the middle of the bed.
      const cx = x + this.bedDx;
      const cy = y - TILE_SIZE / 2 - lie.lift;
      this.sprite.setPosition(cx, cy - lift);
      this.sprite.setDepth((lie.above ? OVERHEAD_DEPTH + 1 : 0) + y);
      if (this.blanket) {
        // The blanket's edge at the neck, the rest over the body towards the feet.
        const neck = this.blanketKind.neck;
        this.blanket.setPosition(cx + (this.headLeft ? neck[1] : neck[0]), cy - lift).setDepth(this.sprite.depth + 0.2)
          .setFlipX(this.headLeft).setOrigin(this.headLeft ? 0 : 1, 0.5)
          .setAlpha(this.sprite.alpha).setVisible(this.sprite.visible);
      }
    } else {
      // Story Phase 14: cardboard under pressure shivers (StabilityRunner sets `shiver`, a pixel or two).
      this.sprite.setPosition(x + (this.shiver || 0), y - lift);
      this.sprite.setDepth(this.flight?.depth ?? y + (this.kind === 'player' ? 0.5 : 0));
    }
    if (this.vehicle) {
      // The boat round them, faced the way they're going: its frames are
      // centred on the seat (their hips), and the near part of it ("_front")
      // goes over them, so they sit in it.
      const v = this.vehicle;
      const frame = `${v.base}_${this.facing}`;
      const bob = this.moving ? Math.round(Math.sin(this.moveT * Math.PI * 2)) : 0;
      this.sprite.y += 2 + bob;
      for (const [img, name, dz] of [[v.img, frame, -0.3], [v.front, `${frame}_front`, 0.3]]) {
        if (!img) continue;
        if (img.frame.name !== name) img.setFrame(name);
        img.setPosition(x, this.sprite.y - 5);
        img.setDepth(this.sprite.depth + dz).setAlpha(this.sprite.alpha).setVisible(this.sprite.visible);
      }
    }
    this.shadow.setPosition(x, y - 2);
    this.shadow.setDepth(-400);
    this.shadow.setAlpha((this.flight ? Math.max(0.25, 1 - (this.flight.alt || 0) / 60) : 1) * this.fade * (this.vehicle ? 0 : 1));
    if (this.moving && this.pose === 'walk' && !this.vehicle) this.updateWalkFrame();
  }

  /**
   * Puts the actor in a vehicle (stage frames "<base>_<dir>": the rowboat on
   * the reef passage) or takes them out (null). In it they sit, whatever
   * they're doing, and the boat goes where they go.
   */
  setVehicle(base) {
    if (this.vehicle?.base === base) return;
    this.vehicle?.img.destroy();
    this.vehicle?.front?.destroy();
    this.vehicle = null;
    const stage = this.scene.textures.get('stage');
    if (base && stage?.has(`${base}_down`)) {
      const front = stage.has(`${base}_down_front`) ? this.scene.add.image(0, 0, 'stage', `${base}_${this.facing}_front`).setOrigin(0.5, 0.5) : null;
      this.vehicle = { base, img: this.scene.add.image(0, 0, 'stage', `${base}_${this.facing}`).setOrigin(0.5, 0.5), front };
    }
    this.playPose(this.pose, true);
    this.syncPosition();
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

  /** The lying pose this actor is in (see LYING_POSES), or null when upright. */
  get lying() {
    return this.animStyle === 'char' ? LYING_POSES[this.pose] ?? null : null;
  }

  /** Up in a hammock: off the floor, so the tile underneath is free to walk through. */
  get aloft() {
    return !!this.lying?.above && !this.moving;
  }

  playPose(pose, force = false) {
    this.pose = pose;
    // In a boat: sitting, whether rowing along or waiting.
    if (this.vehicle && (pose === 'walk' || pose === 'idle')) {
      this.layDown(null);
      const key = this.animKey('sit');
      if (this.scene.anims.exists(key) && (force || this.sprite.anims.currentAnim?.key !== key)) this.sprite.play(key, true);
      return;
    }
    const lie = this.lying;
    if (lie) {
      // Lying down (see LYING_POSES): a still frame, no animation.
      let key = this.animKey(lie.frame, lie.center ? 'down' : this.facing);
      if (!this.scene.anims.exists(key)) key = this.animKey('idle');
      if (this.scene.anims.exists(key)) this.sprite.play(key, true);
      this.sprite.anims.stop();
      this.layDown(lie);
      this.syncPosition();
      return;
    }
    this.layDown(null);
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

  /**
   * Lays the sprite down for a lying pose (or stands it back up), with the
   * sleeper's blanket. The head goes to the left when facing left, otherwise
   * to the right; in a bed it stays there when they're turned to talk.
   */
  layDown(lie) {
    const s = this.sprite;
    if (this.animStyle !== 'char') return;
    this.headLeft = this.facing === 'left';
    this.sling?.destroy();
    this.sling = null;
    const bed = lie?.center ? this.scene.bedAt?.(this.tx, this.ty) : null;
    // Along the middle of the bed (a two-tile hammock is centred between its tiles).
    this.bedDx = bed ? bed.cx - (this.tx * TILE_SIZE + TILE_SIZE / 2) : 0;
    if (lie?.above && bed?.sling) {
      s.setAngle(0).setOrigin(0.5, FOOT_Y / FRAME_H);
      this.blanket?.setVisible(false);
      this.sling = new HammockSleeper(this, bed);
      return;
    }
    s.setAngle(lie ? (this.headLeft ? -90 : 90) : 0);
    s.setOrigin(0.5, lie?.center ? 0.5 : FOOT_Y / FRAME_H);
    if (lie?.blanket) {
      // A bigger blanket for broad shoulders, so no arms stick out.
      this.blanketKind = shoulderWidth(this.scene, s.texture.key) > 21 ? BLANKETS.broad : BLANKETS.normal;
      if (!this.blanket) this.blanket = this.scene.add.image(0, 0, 'fx', this.blanketKind.frame);
      this.blanket.setFrame(this.blanketKind.frame).setVisible(s.visible).setAlpha(s.alpha);
    } else if (this.blanket) this.blanket.setVisible(false);
  }

  /** Where an emote goes: over the head, wherever the head is. */
  emoteAnchor() {
    if (this.sling) return { x: this.sling.headX, y: this.sling.headTop };
    if (this.lying?.center) return { x: this.sprite.x + (this.headLeft ? -14 : 14), y: this.sprite.y - 10 };
    return { x: this.sprite.x, y: this.sprite.y - 44 };
  }

  face(dir) {
    if (!dir || dir === this.facing) return;
    this.facing = dir;
    // In bed: they look round, but don't turn over (the head stays on the pillow).
    if (this.lying?.center && !this.moving) return;
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
    if (this.blanket) this.blanket.setVisible(v && !!this.lying?.blanket && !this.sling);
    this.sling?.band.setVisible(v);
    this.vehicle?.img.setVisible(v);
    this.vehicle?.front?.setVisible(v);
  }

  destroy() {
    this.sprite.destroy();
    this.shadow.destroy();
    this.blanket?.destroy();
    this.sling?.destroy();
    this.vehicle?.img.destroy();
    this.vehicle?.front?.destroy();
  }
}
