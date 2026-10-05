import { TILE_SIZE, DIR_VECTORS } from '../config/constants.js';
import { findPath } from '../maps/pathfinding.js';
import { sharkLevelFor } from '../systems/hazards/sharks.js';
import { tvDef } from '../systems/tv/tv.js';

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

  /** Walks an actor along a path or to a tile (the body of the move command). */
  async function walk(a, { path, to, speed, face }) {
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
  }

  /** Flies an actor through the air (ignores walls), landing on a tile. */
  async function flyActor(a, { to, duration = 900, arc = 18, land = true, alt = 0, from = null, fromAlt = null }) {
    a.brain?.pause();
    a.scripted = true;
    // Optionally start somewhere else first (swooping in from off-screen).
    if (from) a.flight = { x: from[0] * TILE_SIZE + TILE_SIZE / 2, y: from[1] * TILE_SIZE + TILE_SIZE, alt: fromAlt ?? 0, depth: 60000 };
    else if (fromAlt !== null) a.flight = { x: a.px, y: a.py, alt: fromAlt, depth: 60000 };
    if (a.flight) a.setVisible(true);
    const fromX = a.px;
    const fromY = a.py;
    const toX = to[0] * TILE_SIZE + TILE_SIZE / 2;
    const toY = to[1] * TILE_SIZE + TILE_SIZE;
    for (const [k, v] of [...scene.occupancy.entries()]) if (v === a) scene.occupancy.delete(k);
    a.flight = { x: fromX, y: fromY, alt: a.flight?.alt ?? 0, depth: 60000 };
    if (Math.abs(toX - fromX) > Math.abs(toY - fromY)) a.face(toX > fromX ? 'right' : 'left');
    else a.face(toY > fromY ? 'down' : 'up');
    a.playPose('fly');
    const startAlt = a.flight.alt;
    const st = { t: 0 };
    await new Promise((resolve) => {
      scene.tweens.add({
        targets: st,
        t: 1,
        duration,
        ease: 'Sine.InOut',
        onUpdate: () => {
          a.flight.x = fromX + (toX - fromX) * st.t;
          a.flight.y = fromY + (toY - fromY) * st.t;
          a.flight.alt = startAlt + (alt - startAlt) * st.t + Math.sin(st.t * Math.PI) * arc;
          a.syncPosition();
        },
        onComplete: resolve,
      });
    });
    if (land) {
      a.flight = null;
      a.setTile(to[0], to[1]);
      scene.occupancy.set(scene.key(to[0], to[1]), a);
      a.playPose('idle');
    }
  }

  const world = {
    async move(id, opts) {
      const a = actor(id);
      scene.markStaged(a.id);
      a.brain?.pause();
      a.scripted = true;
      // A walk can outlive its scene ("async": true at the end of a script):
      // the actor stays scripted until it arrives, then goes back to its routine.
      a.scriptMoves = (a.scriptMoves ?? 0) + 1;
      try {
        await walk(a, opts);
      } finally {
        a.scriptMoves -= 1;
        if (!a.scriptMoves && scene.scriptDepth === 0 && a !== scene.player && scene.actors.get(a.id) === a) {
          a.scripted = false;
          if (a.brain) a.brain.home = { x: a.tx, y: a.ty, facing: a.facing };
          a.brain?.resume();
          scene.restageDirty = true; // a placement change held back while they walked
        }
      }
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
      a.carrying = name === 'carry';
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
      scene.markStaged(actorId);
    },
    despawn(id) {
      const a = actor(id);
      scene.markStaged(a.id);
      scene.removeActor(a);
    },
    place(id, x, y, facing) {
      const a = actor(id);
      scene.markStaged(a.id);
      scene.putActor(a, { x, y });
      if (facing) a.face(facing);
    },
    /**
     * Puts people where the story's placements now say (see
     * WorldScene.restage): "walk" sends them there and waits until everyone
     * has arrived; "cut" puts them there at once (behind a fade).
     */
    restage(mode) {
      return scene.restage({ instant: mode === 'cut', inScene: true });
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
    /**
     * Screen shake. With `to`, the shake escalates from `intensity` to `to`
     * over the duration (a rumble building up). Scaled by the Screen shake
     * option; "Off" never moves the camera.
     */
    async shake(intensity = 2, duration = 250, { to = null } = {}) {
      const k = app.settings.shakeScale();
      if (k <= 0) return scene.wait(duration);
      if (to === null) {
        scene.cameras.main.shake(duration, ((intensity * 2) / 320) * k);
        return scene.wait(duration);
      }
      const slice = 120;
      const n = Math.max(1, Math.round(duration / slice));
      for (let i = 0; i < n; i++) {
        const v = intensity + ((to - intensity) * i) / Math.max(1, n - 1);
        scene.cameras.main.shake(slice + 20, ((v * 2) / 320) * k, true);
        await scene.wait(slice);
      }
      return null;
    },
    /** Full-screen flash; softer and shorter with Reduced visual effects. */
    flash(color = '#ffffff', duration = 200) {
      const reduced = app.settings.reducedEffects();
      const c = parseInt(color.replace('#', ''), 16);
      const rect = scene.add.rectangle(0, 0, 320, 224, c, reduced ? 0.35 : 0.95).setOrigin(0).setScrollFactor(0).setDepth(79000);
      scene.tweens.add({ targets: rect, alpha: 0, duration: reduced ? duration * 0.6 : duration, ease: 'Quad.Out', onComplete: () => rect.destroy() });
      return scene.wait(duration);
    },
    /** Tilts the whole view (the ship rolling) and back again. */
    async roll(degrees = 3, duration = 1200) {
      const cam = scene.cameras.main;
      const reduced = app.settings.reducedEffects() || app.settings.shakeScale() < 1;
      const target = ((reduced ? degrees * 0.4 : degrees) * Math.PI) / 180;
      await new Promise((resolve) => {
        scene.tweens.add({ targets: cam, rotation: target, duration: duration * 0.35, ease: 'Sine.Out', onComplete: resolve });
      });
      await new Promise((resolve) => {
        scene.tweens.add({ targets: cam, rotation: 0, duration: duration * 0.65, ease: 'Back.Out', onComplete: resolve });
      });
    },
    fade(dir, { duration = 400, color = null } = {}) {
      const c = color ? parseInt(color.replace('#', ''), 16) : 0x000000;
      return dir === 'out' ? overlay.fadeOut(duration, c) : overlay.fadeIn(duration);
    },
    async transition(map, opts) {
      await scene.transitionTo(map, {
        spawn: opts.spawn, x: opts.x, y: opts.y, facing: opts.facing,
        then: opts.then, hidePlayer: opts.hidePlayer, noAutosave: opts.noAutosave ?? !!opts.then,
        duration: opts.fade, keepMusic: opts.keepMusic,
      });
      // The scene restarts; the rest of this script is intentionally dropped.
      await new Promise(() => {});
    },
    setObjectVisible(id, visible) {
      if (id === 'player' || id === 'captain') {
        scene.player.setVisible(visible);
        return;
      }
      if (String(id).startsWith('prop:')) {
        const uid = id.slice(5);
        for (const rec of scene.props.filter((p) => p.uid === uid)) rec.hiddenByScript = !visible;
        scene.applyPropConditions();
        return;
      }
      const a = scene.actors.get(id);
      if (a) {
        a.setVisible(visible);
        return;
      }
      if (scene.stage.get(id)) {
        scene.stage.get(id).img.setVisible(visible);
        return;
      }
      scene.objectSprites.get(id)?.setVisible(visible);
    },

    /** Flies an actor through the air (ignores walls), landing on a tile. */
    async fly(id, opts) {
      const a = actor(id);
      scene.markStaged(a.id);
      // Like a walk, a flight can outlive its scene: restaging waits for it.
      a.scriptMoves = (a.scriptMoves ?? 0) + 1;
      try {
        await flyActor(a, opts);
      } finally {
        a.scriptMoves -= 1;
        if (!a.scriptMoves && scene.scriptDepth === 0) {
          if (a !== scene.player) a.scripted = false;
          scene.restageDirty = true;
        }
      }
    },
    /** A little jump (surprise, being knocked about). */
    hop(id, { height = 8, duration = 280 } = {}) {
      const a = actor(id);
      const st = { t: 0 };
      return new Promise((resolve) => {
        scene.tweens.add({
          targets: st,
          t: 1,
          duration,
          onUpdate: () => {
            a.hop = Math.round(Math.sin(st.t * Math.PI) * height);
            a.syncPosition();
          },
          onComplete: () => {
            a.hop = 0;
            a.syncPosition();
            resolve();
          },
        });
      });
    },

    /** Speech bubble over an actor (or a tile) that doesn't stop the game. */
    bark(id, text, { duration = 1800, shout = false, x, y } = {}) {
      const target = id ? actor(id) : { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE };
      scene.barks.show(target, text, { duration, shout });
    },

    /** Particle burst at an actor or tile (coins, splinters, feathers, fume...). */
    burst(kind, { actor: target, x, y, count, speed, up, dir, cone, spread }) {
      const a = target ? actor(target) : null;
      const px = a ? a.sprite.x : x * TILE_SIZE + TILE_SIZE / 2;
      const py = a ? a.sprite.y - 16 : y * TILE_SIZE + TILE_SIZE / 2;
      const opts = {};
      if (count !== undefined) opts.count = count;
      if (speed !== undefined) opts.speed = Array.isArray(speed) ? speed : [speed * 0.5, speed];
      if (up !== undefined) opts.up = up;
      if (dir !== undefined) opts.dir = (dir * Math.PI) / 180;
      if (cone !== undefined) opts.cone = (cone * Math.PI) / 180;
      if (spread !== undefined) opts.spread = spread;
      scene.fx.burst(kind, px, py, opts);
    },

    /**
     * Effects on map props: "jiggle" (rattle in place), "swing" (lanterns),
     * "fall" (drop to the floor), "frame" (show another painted frame).
     * `prop` is a placement id; `area` [x, y, w, h] picks every prop inside.
     */
    async propFx(mode, { prop, area, duration = 800, intensity = 1, frame, dx = 0, dy = 1 }) {
      const targets = scene.props.filter((p) => p.visible && ((prop && (p.uid === prop || p.prop === prop)) || (area && p.x >= area[0] && p.y >= area[1] && p.x < area[0] + area[2] && p.y < area[1] + area[3])));
      if (mode === 'frame') {
        for (const p of targets) {
          p.sprite.anims.stop();
          p.sprite.setFrame(frame);
        }
        return;
      }
      const promises = targets.map((p) => new Promise((resolve) => {
        const img = p.sprite;
        const x0 = img.x;
        const y0 = img.y;
        if (mode === 'jiggle') {
          const st = { t: 0 };
          scene.tweens.add({
            targets: st, t: 1, duration,
            onUpdate: () => {
              const k = intensity * (app.settings.reducedEffects() ? 0.5 : 1);
              img.x = x0 + Math.round((Math.random() * 2 - 1) * k);
              img.y = y0 + Math.round((Math.random() * 2 - 1) * k * 0.6);
            },
            onComplete: () => { img.x = x0; img.y = y0; resolve(); },
          });
        } else if (mode === 'swing') {
          img.setOrigin(0.5, 0);
          img.y = y0 - img.height;
          scene.tweens.add({ targets: img, angle: { from: -12 * intensity, to: 12 * intensity }, duration: 260, yoyo: true, repeat: Math.max(0, Math.round(duration / 520) - 1), ease: 'Sine.InOut',
            onComplete: () => { img.setAngle(0); img.setOrigin(0.5, 1); img.y = y0; resolve(); } });
        } else if (mode === 'fall') {
          scene.tweens.add({ targets: img, x: x0 + dx * TILE_SIZE, y: y0 + dy * TILE_SIZE, angle: 90 * Math.sign(dx || 1), duration, ease: 'Bounce.Out', onComplete: resolve });
        } else resolve();
      }));
      await Promise.all(promises);
    },

    /** Free sprites off the grid (a bathtub alongside, a frigate, a rowboat). */
    sprite(id, opts) {
      scene.stage.add(id, opts);
    },
    moveSprite(id, opts) {
      return scene.stage.move(id, opts);
    },
    spriteFrame(id, frame) {
      scene.stage.setFrame(id, frame);
    },
    removeSprite(id) {
      scene.stage.remove(id);
    },
    /** Story Phase 10: a cheap prize from the storm lands on (x, y) (SharkstormLayer.dropToken). */
    dropToken(frame, x, y, opts = {}) {
      return scene.sharkstorm.dropToken(frame, x, y, { max: opts.max ?? 6, ...(opts.id ? { id: opts.id } : {}), ...(opts.sfx ? { sfx: opts.sfx } : {}) });
    },
    clearTokens() {
      scene.sharkstorm.clearTokens();
    },

    /** The rescue rope: tied off at (x, y), trails behind the captain. */
    tether(on, { x, y } = {}) {
      if (on) scene.stage.startTether(x, y);
      else scene.stage.stopTether();
    },

    /** Put the captain at a spawn, or ("safe") the nearest spawn in clean air. */
    respawn(spawn) {
      scene.respawnSafely(spawn);
    },

    /**
     * Temporary fume clouds for set-pieces (not saved). `grow` animates the
     * zone from a point to its full size over that many ms.
     */
    async fumeCloud(id, { level = 'dense', x, y, w = 1, h = 1, grow = 0, remove = false }) {
      const field = scene.fumeField;
      if (remove) {
        field.removeTransient(id);
        scene.fumeLayer.setZones(field.all());
        return;
      }
      if (!grow) {
        field.addTransient({ id, level, x, y, w, h });
        scene.fumeLayer.setZones(field.all());
        return;
      }
      const cx = x + w / 2;
      const cy = y + h / 2;
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        const k = i / steps;
        field.addTransient({ id, level, x: cx - (w * k) / 2, y: cy - (h * k) / 2, w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) });
        scene.fumeLayer.setZones(field.all());
        await scene.wait(grow / steps);
      }
    },
    /** Washes an actor in a colour for a moment (turning green at a smell). */
    tint(id, color, duration = 900) {
      const a = actor(id);
      const c = parseInt(String(color).replace('#', ''), 16);
      a.sprite.setTint(c);
      return scene.wait(duration).then(() => {
        if (a.sprite.active) a.sprite.clearTint();
      });
    },

    /** Holds a shark level for the scene (null: back to the map's own). */
    sharks(level, { crowd = null } = {}) {
      scene.sharks.hold(level, sharkLevelFor(scene.model.meta, scene.session), { crowd });
    },

    /** "clear": every shark at the duty rail backs off (the story takes over). */
    sharkDuty(mode) {
      if (mode === 'clear') scene.sharkDuty.stop();
      scene.sharkDuty.sync();
    },

    /** Staged shark moments (see world/SharkLayer.js). */
    async sharkEvent(kind, { x, y, duration }) {
      const sl = scene.sharks;
      switch (kind) {
        case 'bite': return sl.bite(x, y);
        case 'ram': return sl.ram(y ?? null);
        case 'flop': return sl.flop(x, y);
        case 'return': return sl.unflop();
        case 'lure': return sl.lure(x, y, duration);
        case 'follow': return sl.setFollow(true);
        case 'unfollow': return sl.setFollow(false);
        // Phase 4: the waterline frenzy, a thrash of the sea, a hammerhead ramming the hull.
        case 'frenzy': return sl.setFocus(x, y);
        case 'calm': return sl.setFocus(null);
        case 'thrash': return sl.thrash(x, y, duration);
        case 'hammerhead': return sl.hammerhead(x, y);
        default: throw new Error(`Unknown shark event "${kind}"`);
      }
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
      alarm: (level, opts) => {
        const p = overlay.alarm(level, opts);
        scene.panicShouts?.(level);
        return p;
      },
      course: (mode, opts) => overlay.course(mode, opts),
      openLog: (id, entry) => scene.openLog(id, entry),
      repair: async (opts) => {
        await overlay.dialogue.close();
        return overlay.repair(opts);
      },
      tv: async (id, { mode = 'normal', panel = null } = {}) => {
        await overlay.dialogue.close();
        const def = tvDef(scene.content, id);
        if (!def) throw new Error(`No television "${id}"`);
        const present = (who) => {
          const a = scene.actors.get(who);
          return !!a && a.sprite?.visible !== false;
        };
        return overlay.tv(def, { present, mode, panel });
      },
    },
    audio: {
      sfx: (id, opts) => app.audio.sfx(id, opts),
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
    cinema: {
      show: async (id, opts) => {
        await overlay.dialogue.close();
        return app.cinema.show(id, opts);
      },
      end: async (opts) => {
        await overlay.dialogue.close();
        return app.cinema.end(opts);
      },
      move: (id, opts) => app.cinema.move(id, opts),
      frame: (id, frame) => app.cinema.frame(id, frame),
      frames: (id, list, ms) => app.cinema.frames(id, list, ms),
      spin: (id, k) => app.cinema.orbitSpeed(id, k),
      fx: (kind, opts) => app.cinema.vistaFx(kind, opts),
      setVisible: (id, v) => app.cinema.setVisible(id, v),
      insert: async (id, opts) => {
        await overlay.dialogue.close();
        return app.cinema.insert(id, opts);
      },
    },
  };
}
