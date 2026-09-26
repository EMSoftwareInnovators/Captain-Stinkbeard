import { findPath } from '../maps/pathfinding.js';
import { DIRECTIONS } from '../config/constants.js';

/**
 * Visible enemies in exploration (no random encounters). They wander near
 * home and chase the player when close. Touching the player — or being
 * touched — starts the battle; see WorldScene.startEncounter for advantage.
 */
export class FieldEnemy {
  constructor(world, actor, obj, rng = Math.random) {
    this.world = world;
    this.actor = actor;
    this.obj = obj;
    this.home = { x: actor.tx, y: actor.ty };
    this.radius = obj.wander ?? 2;
    this.chaseRange = obj.chase ?? 4;
    this.rand = rng;
    this.timer = 500 + this.rand() * 1500;
    this.cooldown = 0;
  }

  update(delta, player) {
    const a = this.actor;
    if (a.moving) {
      if (a.updateMovement(delta)) this.world.releaseSource(a);
      return;
    }
    if (this.cooldown > 0) {
      this.cooldown -= delta;
      a.sprite.setAlpha(Math.floor(this.cooldown / 120) % 2 ? 0.4 : 1);
      if (this.cooldown <= 0) a.sprite.setAlpha(1);
      return;
    }
    const dist = Math.abs(player.tx - a.tx) + Math.abs(player.ty - a.ty);
    this.timer -= delta;
    if (this.timer > 0) return;
    if (dist <= this.chaseRange && !this.world.playerInvulnerable()) {
      this.timer = 260;
      const blocked = (x, y) => this.world.isBlocked(x, y, a) || (!!this.world.warpAt(x, y) && !(x === player.tx && y === player.ty));
      const path = findPath(this.world.model.width, this.world.model.height, { x: a.tx, y: a.ty }, { x: player.tx, y: player.ty }, blocked, 600);
      if (path && path.length) {
        const dir = path[0];
        const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
        if (a.tx + v[0] === player.tx && a.ty + v[1] === player.ty) {
          a.face(dir);
          this.world.startEncounter(this, 'enemy', dir);
          return;
        }
        this.world.tryMoveActor(a, dir, 230);
      }
      return;
    }
    this.timer = 900 + this.rand() * 1800;
    const dir = DIRECTIONS[Math.floor(this.rand() * 4)];
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    const nx = a.tx + v[0];
    const ny = a.ty + v[1];
    if (Math.abs(nx - this.home.x) > this.radius || Math.abs(ny - this.home.y) > this.radius || this.world.warpAt(nx, ny)) {
      a.face(dir);
      return;
    }
    this.world.tryMoveActor(a, dir, 320);
  }

  stun(ms) {
    this.cooldown = ms;
  }
}
