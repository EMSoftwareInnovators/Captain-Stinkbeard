import { TILE_SIZE, DIR_VECTORS } from '../config/constants.js';
import { findPath } from '../maps/pathfinding.js';

/**
 * Script services provided by the exploration scene (see
 * systems/script/commands.js for the command → service mapping).
 */
export function createWorldServices(scene) {
  const app = scene.app;
  const overlay = app.overlay;

  const actor = (id) => {
    if (id === 'player' || id === 'captain') return scene.player;
    const a = scene.actors.get(id);
    if (!a) throw new Error(`No actor "${id}" on map "${scene.model.id}"`);
    return a;
  };

  const stepMs = (speed) => (typeof speed === 'number' ? speed : speed === 'run' ? 130 : speed === 'slow' ? 340 : 230);

  async function stepActor(a, dir, ms) {
    const v = DIR_VECTORS[dir];
    const nx = a.tx + v.x;
    const ny = a.ty + v.y;
    // Scripted moves wait briefly for a free tile, then pass through anyway so
    // a cutscene can never softlock on a stray NPC.
    for (let tries = 0; tries < 20 && scene.occupantAt(nx, ny) && scene.occupantAt(nx, ny) !== a; tries++) await scene.wait(100);
    const occupant = scene.occupantAt(nx, ny);
    if (!occupant || occupant === a) scene.occupancy.set(scene.key(nx, ny), a);
    a.prevKey = scene.key(a.tx, a.ty);
    a.scripted = true;
    a.beginStep(dir, ms);
    await new Promise((resolve) => {
      const check = () => {
        if (!a.moving) resolve();
        else scene.time.delayedCall(16, check);
      };
      check();
    });
  }

  const world = {
    async move(id, { path, to, speed, face }) {
      const a = actor(id);
      a.brain?.pause();
      a.scripted = true;
      const ms = stepMs(speed);
      let dirs = [];
      if (Array.isArray(path)) {
        for (let i = 0; i < path.length; i++) {
          const d = path[i];
          const n = typeof path[i + 1] === 'number' ? path[++i] : 1;
          for (let k = 0; k < n; k++) dirs.push(d);
        }
      } else if (Array.isArray(to)) {
        dirs = findPath(scene.model.width, scene.model.height, { x: a.tx, y: a.ty }, { x: to[0], y: to[1] }, (x, y) => scene.isSolid(x, y)) || [];
      }
      for (const d of dirs) await stepActor(a, d, ms);
      a.stopWalking();
      if (face) a.face(face);
      if (a === scene.player) scene.session.location = { map: scene.model.id, x: a.tx, y: a.ty, facing: a.facing };
    },
    face(id, dir) {
      const a = actor(id);
      if (dir === 'player') a.faceToward(scene.player.tx, scene.player.ty);
      else if (DIR_VECTORS[dir]) a.face(dir);
      else {
        const other = actor(dir);
        a.faceToward(other.tx, other.ty);
      }
    },
    async anim(id, name, duration) {
      const a = actor(id);
      a.playPose(name);
      if (duration) {
        await scene.wait(duration);
        a.playPose('idle');
      }
    },
    emote(id, icon, duration = 900) {
      app.audio.ui(icon === 'exclaim' ? 'confirm' : 'cursor', { volume: 0.5 });
      return scene.showEmote(actor(id), icon, duration);
    },
    spawn(npcId, { id, x, y, facing }) {
      const actorId = id ?? npcId;
      if (scene.actors.has(actorId)) scene.removeActor(scene.actors.get(actorId));
      const a = scene.spawnNpc(npcId, { x, y, facing, actorId, behavior: { type: 'stand' } });
      a.scripted = true;
    },
    despawn(id) {
      scene.removeActor(actor(id));
    },
    place(id, x, y, facing) {
      const a = actor(id);
      for (const [k, v] of [...scene.occupancy.entries()]) if (v === a) scene.occupancy.delete(k);
      a.setTile(x, y);
      scene.occupancy.set(scene.key(x, y), a);
      if (facing) a.face(facing);
    },
    /**
     * pan: glide to a tile or actor and hold there; follow: glide to an actor
     * and keep tracking it; reset: glide back to the captain and follow him.
     */
    async camera(mode, { x, y, actor: target, duration = 600 }) {
      if (mode === 'reset' || (mode === 'follow' && !target)) {
        await panTo(scene.player.px, scene.player.py - 18, duration);
        scene.cameraFocus = null;
        return;
      }
      if (mode === 'follow') {
        const a = actor(target);
        await panTo(a.px, a.py - 18, duration);
        scene.cameraFocus = a === scene.player ? null : { get x() { return a.px; }, get y() { return a.py - 18; } };
        return;
      }
      const goal = target ? actor(target) : null;
      const gx = goal ? goal.px : x * TILE_SIZE + TILE_SIZE / 2;
      const gy = goal ? goal.py - 18 : y * TILE_SIZE + TILE_SIZE / 2;
      await panTo(gx, gy, duration);
    },
    shake(intensity = 2, duration = 250) {
      if (!app.settings.get('screenShake')) return scene.wait(duration);
      scene.cameras.main.shake(duration, (intensity * 2) / 320);
      return scene.wait(duration);
    },
    flash(color = '#ffffff', duration = 200) {
      const c = parseInt(color.replace('#', ''), 16);
      scene.cameras.main.flash(duration, (c >> 16) & 255, (c >> 8) & 255, c & 255);
      return scene.wait(duration);
    },
    fade(dir, { duration = 400, color = null } = {}) {
      const c = color ? parseInt(color.replace('#', ''), 16) : 0x000000;
      return dir === 'out' ? overlay.fadeOut(duration, c) : overlay.fadeIn(duration);
    },
    async transition(map, opts) {
      await scene.transitionTo(map, { spawn: opts.spawn, x: opts.x, y: opts.y, facing: opts.facing });
      // The scene restarts; the rest of this script is intentionally dropped.
      await new Promise(() => {});
    },
    setObjectVisible(id, visible) {
      const sprite = scene.objectSprites.get(id) ?? scene.actors.get(id)?.sprite;
      sprite?.setVisible(visible);
    },
    effect(name, { actor: target, x, y }) {
      const a = target ? actor(target) : null;
      const px = a ? a.sprite.x : x * TILE_SIZE + TILE_SIZE / 2;
      const py = a ? a.sprite.y - 20 : y * TILE_SIZE + TILE_SIZE / 2;
      const s = scene.add.sprite(px, py, 'fx', `${name}_0`).setDepth(80002);
      if (scene.anims.exists(`fx:${name}`)) s.play(`fx:${name}`);
      s.once('animationcomplete', () => s.destroy());
      scene.time.delayedCall(1200, () => s.destroy());
    },
  };

  function panTo(gx, gy, duration) {
    const from = scene.cameraFocus ?? { x: scene.player.px, y: scene.player.py - 18 };
    return new Promise((resolve) => {
      const state = { x: from.x, y: from.y };
      scene.cameraFocus = state;
      scene.tweens.add({
        targets: state,
        x: gx,
        y: gy,
        duration,
        ease: 'Sine.InOut',
        onComplete: () => {
          if (gx === scene.player.px && gy === scene.player.py - 18) scene.cameraFocus = null;
          resolve();
        },
      });
    });
  }

  return {
    dialogue: {
      say: (line) => overlay.dialogue.say(line),
      choose: (opts) => overlay.dialogue.choose(opts),
      close: () => overlay.dialogue.close(),
      tutorial: async (t) => {
        await overlay.dialogue.close();
        await overlay.tutorial(t);
      },
    },
    ui: {
      notify: (n) => overlay.notify(n),
      banner: async (text, sub) => {
        await overlay.dialogue.close();
        await overlay.banner(text, sub);
      },
      openShop: (id) => scene.openShop(id),
    },
    audio: {
      sfx: (id) => app.audio.sfx(id),
      music: (id, opts) => app.audio.playMusic(id, { fade: opts?.fade ? opts.fade / 1000 : 0.8 }),
      ambience: (id) => app.audio.setAmbience(id),
    },
    world,
    battle: {
      start: async (encounterId) => {
        await overlay.dialogue.close();
        return scene.startBattle(encounterId);
      },
    },
    saves: {
      autosave: () => scene.autosave(),
    },
  };
}
