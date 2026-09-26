import { findPath } from '../maps/pathfinding.js';
import { DIRECTIONS } from '../config/constants.js';

/**
 * Idle behaviour for an NPC. Data-driven via the NPC definition or the map
 * placement:
 *   { "type": "stand", "lookAround": true }
 *   { "type": "wander", "radius": 2 }
 *   { "type": "work" }        loops the 'work' animation (swabbing, stirring…)
 *   { "type": "sit" }
 *   { "type": "routine", "steps": [ { "go": [x,y] }, { "wait": ms }, { "face": dir },
 *                                   { "anim": "work", "ms": 3000 }, { "emote": "note" } ] }
 * Brains pause while the NPC is talking or a cutscene runs.
 */
export class NpcBrain {
  constructor(world, actor, behavior, rng = Math.random) {
    this.world = world;
    this.actor = actor;
    this.behavior = behavior || { type: 'stand' };
    this.home = { x: actor.tx, y: actor.ty, facing: actor.facing };
    this.rand = rng;
    this.timer = 1000 + this.rand() * 2500;
    this.stepIndex = 0;
    this.path = null;
    this.state = 'idle';
    this.paused = false;
    this.applyPose();
  }

  applyPose() {
    const t = this.behavior.type;
    if (t === 'work') this.actor.playPose('work');
    else if (t === 'sit') this.actor.playPose('sit');
    else this.actor.playPose('idle');
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    if (!this.actor.moving) {
      if (this.behavior.type === 'routine' && this.currentAnim) this.actor.playPose(this.currentAnim);
      else if (this.behavior.type !== 'routine') {
        this.actor.face(this.behavior.facing ?? this.home.facing);
        this.applyPose();
      } else this.actor.playPose('idle');
    }
  }

  update(delta) {
    if (this.paused) return;
    const a = this.actor;
    if (a.moving) {
      if (a.updateMovement(delta)) this.world.releaseSource(a);
      return;
    }
    // Courtesy: hold still while the captain stands facing us, so walking
    // crew are easy to talk to.
    if (this.behavior.type !== 'stand' && this.playerFacingMe()) {
      if (a.pose === 'walk') a.stopWalking();
      return;
    }
    switch (this.behavior.type) {
      case 'stand':
        if (this.behavior.lookAround) this.lookAround(delta);
        break;
      case 'wander':
        this.wander(delta);
        break;
      case 'routine':
        this.routine(delta);
        break;
      default:
        break;
    }
  }

  /** Crew never stop on doorways, ladders or hatches, so exits stay clear. */
  blocked(x, y) {
    return this.world.isBlocked(x, y, this.actor) || !!this.world.warpAt(x, y);
  }

  playerFacingMe() {
    const p = this.world.player;
    if (!p || p.moving) return false;
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.facing];
    return p.tx + v[0] === this.actor.tx && p.ty + v[1] === this.actor.ty;
  }

  lookAround(delta) {
    this.timer -= delta;
    if (this.timer > 0) return;
    this.timer = 2500 + this.rand() * 3500;
    const a = this.actor;
    if (a.facing !== this.home.facing && this.rand() < 0.6) a.face(this.home.facing);
    else a.face(DIRECTIONS[Math.floor(this.rand() * 4)]);
  }

  wander(delta) {
    this.timer -= delta;
    if (this.timer > 0) {
      if (this.actor.pose === 'walk') this.actor.stopWalking();
      return;
    }
    this.timer = 1500 + this.rand() * 2500;
    const r = this.behavior.radius ?? 2;
    const dir = DIRECTIONS[Math.floor(this.rand() * 4)];
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    const nx = this.actor.tx + v[0];
    const ny = this.actor.ty + v[1];
    if (Math.abs(nx - this.home.x) > r || Math.abs(ny - this.home.y) > r || this.blocked(nx, ny)) {
      this.actor.face(dir);
      return;
    }
    this.world.tryMoveActor(this.actor, dir, 260);
  }

  routine(delta) {
    const steps = this.behavior.steps;
    const step = steps[this.stepIndex];
    if (!step) {
      this.stepIndex = 0;
      return;
    }
    const a = this.actor;
    if (step.go) {
      const [gx, gy] = step.go;
      if (a.tx === gx && a.ty === gy) {
        a.stopWalking();
        this.path = null;
        this.next();
        return;
      }
      if (!this.path || this.path.length === 0) {
        this.path = findPath(this.world.model.width, this.world.model.height, { x: a.tx, y: a.ty }, { x: gx, y: gy }, (x, y) => this.blocked(x, y));
        if (!this.path) {
          // Blocked (probably by the player): wait a moment and retry.
          this.timer -= delta;
          if (this.timer <= 0) {
            this.timer = 600;
            this.failures = (this.failures || 0) + 1;
            if (this.failures > 8) {
              this.failures = 0;
              this.next();
            }
          }
          a.stopWalking();
          return;
        }
      }
      const dir = this.path[0];
      if (this.world.tryMoveActor(a, dir, step.speed ?? 240)) this.path.shift();
      else {
        this.path = null;
        a.stopWalking();
      }
      return;
    }
    if (this.state !== 'step') {
      this.state = 'step';
      this.timer = step.wait ?? step.ms ?? 0;
      if (step.face) a.face(step.face);
      if (step.anim) {
        this.currentAnim = step.anim;
        a.playPose(step.anim);
      }
      if (step.emote) this.world.showEmote(a, step.emote, 900);
    }
    this.timer -= delta;
    if (this.timer <= 0) {
      if (step.anim) {
        this.currentAnim = null;
        a.playPose('idle');
      }
      this.next();
    }
  }

  next() {
    this.state = 'idle';
    this.stepIndex = (this.stepIndex + 1) % this.behavior.steps.length;
  }
}
