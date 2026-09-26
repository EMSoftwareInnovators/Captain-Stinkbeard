import { BaseScene } from './BaseScene.js';
import { WorldMap } from '../world/WorldMap.js';
import { NpcBrain } from '../world/NpcBrain.js';
import { FieldEnemy } from '../world/FieldEnemy.js';
import { Ambient } from '../world/Ambient.js';
import { Actor } from '../entities/Actor.js';
import { createWorldServices } from '../world/worldServices.js';
import { evaluateCondition } from '../systems/conditions/conditions.js';
import { CommandRegistry, ScriptRunner } from '../systems/script/ScriptRunner.js';
import { createCommandImplementations } from '../systems/script/commands.js';
import { WorldState } from '../systems/world/WorldState.js';
import { TILE_SIZE, DIR_VECTORS, SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';
import { hash32 } from '../core/Rng.js';
import { asArray } from '../core/util.js';

const WALK_MS = 210;
const RUN_MS = 125;

/**
 * Exploration. Loads one map, spawns the player, NPCs, props and visible
 * enemies, and runs scripts (dialogue, inspections, cutscenes) through the
 * shared ScriptRunner with world services (move/face/camera/...).
 */
export class WorldScene extends BaseScene {
  constructor() {
    super('World');
  }

  init(data) {
    this.entry = data || {};
  }

  create() {
    const app = this.app;
    this.content = app.content;
    this.def = this.content.maps.require(this.entry.map);
    this.model = app.map(this.entry.map);
    this.tileset = this.content.tilesets.require(this.def.tileset);
    this.actors = new Map();
    this.occupancy = new Map();
    this.npcs = [];
    this.enemies = [];
    this.props = [];
    this.propAt = new Map();
    this.objectSprites = new Map();
    this.scriptDepth = 0;
    this.invulnerableMs = 0;
    this.bumpCooldown = 0;
    this.turnHold = 0;
    this.wasMoving = false;
    this.leaving = false;
    this.bobTime = 0;

    this.cameras.main.setBackgroundColor(this.model.meta.background === 'ocean' ? '#16416f' : '#07060b');
    this.worldMap = new WorldMap(this, this.model, this.tileset);
    this.buildProps();
    this.buildObjects();
    this.placePlayer();
    const lights = this.collectLights();
    this.worldMap.buildLighting(lights);
    this.addGlows(lights);
    this.ambient = new Ambient(this, this.def.ambient || []);
    this.marker = this.add.image(0, 0, 'ui', 'mark_talk').setOrigin(0.5, 1).setDepth(80000).setVisible(false);
    this.markerTime = 0;

    this.runner = new ScriptRunner({
      registry: new CommandRegistry().registerAll(createCommandImplementations()),
      getScript: (id) => this.content.scripts.get(id),
    });
    this.services = createWorldServices(this);
    this.subscriptions = [this.app.bus.on('quest:completed', this.onQuestCompleted, this)];
    this.events.once('shutdown', () => this.cleanup());
    this.events.on('resume', () => this.onResume());

    this.updateCamera(0);
    this.setupAudio();
    this.enterMap();
  }

  cleanup() {
    this.subscriptions.forEach((off) => off());
    this.app.overlay?.setHint(null);
  }

  // ---------------------------------------------------------------------------
  // Construction

  buildProps() {
    for (const p of this.model.props) {
      const def = this.content.props.get(p.prop);
      this.addProp(p, def);
    }
  }

  addProp(p, def, frameOverride = null) {
    const [fw, fh] = def.footprint || [1, 1];
    const sprite = def.sprite ?? def.id;
    const frameName = frameOverride ?? (this.app.propAnims[sprite] ? `${sprite}_0` : sprite);
    const x = (p.x + fw / 2) * TILE_SIZE;
    const y = (p.y + fh) * TILE_SIZE;
    const img = this.add.sprite(x, y, 'props', frameName).setOrigin(0.5, 1);
    if (p.flip) img.setFlipX(true);
    if (this.app.propAnims[sprite] && !frameOverride) {
      img.play(`props:${sprite}`);
      img.anims.setProgress(Math.random());
    }
    const layer = def.layer ?? 'object';
    img.setDepth(layer === 'floor' ? -600 : layer === 'wall' ? -900 : layer === 'overhead' ? 55000 : y - 1);
    if (layer === 'overhead' && (sprite === 'mast_top' || sprite === 'foremast_top')) {
      // Upper rigging continues the mast: anchor so the pole joins the base.
      img.y = y - 64;
      img.setAlpha(0.95);
    }
    const rec = { ...p, def, sprite: img };
    this.props.push(rec);
    if (layer === 'object' || layer === 'wall' || def.inspect) {
      for (let j = 0; j < fh; j++) for (let k = 0; k < fw; k++) this.propAt.set(this.key(p.x + k, p.y + j), rec);
    }
    return rec;
  }

  buildObjects() {
    const session = this.session;
    this.objects = [];
    const npcPlaced = new Set();
    for (const obj of this.model.objects) {
      if (obj.if && !evaluateCondition(obj.if, session)) continue;
      const wkey = WorldState.key(this.model.id, obj.id);
      switch (obj.type) {
        case 'npc': {
          if (npcPlaced.has(obj.npc)) break;
          npcPlaced.add(obj.npc);
          this.spawnNpc(obj.npc, { x: obj.x, y: obj.y, facing: obj.facing, behavior: obj.behavior, actorId: obj.npc });
          break;
        }
        case 'enemy': {
          if (session.world.isDefeated(wkey)) break;
          const enc = this.content.encounters.require(obj.encounter);
          const sprite = obj.sprite ?? this.content.enemies.get(enc.enemies[0])?.sprite ?? enc.enemies[0];
          const actor = new Actor(this, { id: obj.id, texture: `enemy_${sprite}`, x: obj.x, y: obj.y, facing: obj.facing ?? 'down', kind: 'enemy', anims: 'enemy', shadow: 'shadow_s' });
          actor.obj = obj;
          this.registerActor(actor);
          this.enemies.push(new FieldEnemy(this, actor, obj));
          break;
        }
        case 'chest': {
          const opened = session.world.isOpened(wkey);
          const propId = obj.prop ?? 'chest';
          const def = this.content.props.get(propId);
          const frame = opened && propId === 'chest' ? 'chest_open' : null;
          const rec = this.addProp({ x: obj.x, y: obj.y, prop: propId }, def, frame);
          this.objectSprites.set(obj.id, rec.sprite);
          this.objects.push(obj);
          break;
        }
        default:
          this.objects.push(obj);
      }
    }
  }

  spawnNpc(npcId, { x, y, facing = 'down', behavior = null, actorId = npcId }) {
    const def = this.content.npcs.require(npcId);
    const actor = new Actor(this, { id: actorId, texture: `char_${def.appearance ?? def.id}`, x, y, facing, kind: 'npc' });
    actor.npc = def;
    this.registerActor(actor);
    const brain = new NpcBrain(this, actor, behavior ?? def.behavior);
    actor.brain = brain;
    this.npcs.push(brain);
    return actor;
  }

  registerActor(actor) {
    this.actors.set(actor.id, actor);
    this.occupancy.set(this.key(actor.tx, actor.ty), actor);
  }

  removeActor(actor) {
    for (const [k, a] of [...this.occupancy.entries()]) if (a === actor) this.occupancy.delete(k);
    this.actors.delete(actor.id);
    this.npcs = this.npcs.filter((b) => b.actor !== actor);
    this.enemies = this.enemies.filter((e) => e.actor !== actor);
    actor.destroy();
  }

  placePlayer() {
    const e = this.entry;
    let pos = null;
    if (e.spawn && this.model.spawns[e.spawn]) pos = this.model.spawns[e.spawn];
    else if (Number.isInteger(e.x) && Number.isInteger(e.y)) pos = { x: e.x, y: e.y, facing: e.facing };
    else pos = Object.values(this.model.spawns)[0];
    const leader = this.session.party.leader();
    const appearance = leader.def.appearance ?? leader.id;
    this.player = new Actor(this, { id: 'player', texture: `char_${appearance}`, x: pos.x, y: pos.y, facing: e.facing ?? pos.facing ?? 'down', kind: 'player', shadow: 'shadow_m' });
    this.registerActor(this.player);
    this.session.location = { map: this.model.id, x: pos.x, y: pos.y, facing: this.player.facing };
  }

  collectLights() {
    const lights = [];
    for (const p of this.props) {
      const l = p.def.light;
      if (!l) continue;
      const [fw] = p.def.footprint || [1, 1];
      lights.push({ x: (p.x + fw / 2) * TILE_SIZE, y: (p.y + (p.def.layer === 'overhead' ? 0.6 : 0.4)) * TILE_SIZE, radius: l.radius, color: l.color, flicker: l.flicker });
    }
    for (const l of this.model.meta.lighting?.lights ?? []) {
      lights.push({ x: l.x * TILE_SIZE, y: l.y * TILE_SIZE, radius: l.radius, color: l.color, flicker: false });
    }
    return lights;
  }

  addGlows(lights) {
    if (!this.model.meta.lighting) return;
    for (const l of lights) {
      if (!l.flicker) continue;
      // Keep the halo inside the map so it never tints the void around a room.
      const rx = Math.min(l.radius * 0.65, l.x, this.worldMap.widthPx - l.x);
      const ry = Math.min(l.radius * 0.5, l.y, this.worldMap.heightPx - l.y);
      if (rx < 8 || ry < 8) continue;
      const glow = this.add.ellipse(l.x, l.y, rx * 2, ry * 2, 0xfcd058, 0.07).setDepth(70001).setBlendMode('ADD');
      this.tweens.add({ targets: glow, alpha: 0.12, scaleX: 1.05, duration: 180 + Math.random() * 160, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });
    }
  }

  setupAudio() {
    const audio = this.app.audio;
    const meta = this.model.meta;
    if (!this.entry.keepMusic) audio.playMusic(meta.music, { fade: 0.8 });
    audio.setMusicFilter(meta.musicFilter);
    audio.setAmbience(meta.ambience);
  }

  async enterMap() {
    const session = this.session;
    const firstVisit = session.world.visit(this.model.id);
    this.app.bus.emit('map:entered', { map: this.model.id, first: firstVisit });
    if (this.entry.fadeIn !== false) await this.app.overlay.fadeIn(this.entry.newGame ? 700 : 260);
    if (!this.entry.newGame) this.app.overlay.locationTitle(this.model.name);
    if (this.entry.newGame) {
      const script = this.content.game.newGame.startScript;
      if (script) await this.runScript(script);
    }
    for (const e of this.model.meta.onEnter) {
      if (evaluateCondition(e.if, session)) await this.runScript(e.script);
    }
    if (!this.entry.newGame && !this.entry.loaded && !this.entry.noAutosave) this.autosave();
  }

  // ---------------------------------------------------------------------------
  // Grid helpers

  key(x, y) {
    return y * this.model.width + x;
  }

  isSolid(x, y) {
    if (x < 0 || y < 0 || x >= this.model.width || y >= this.model.height) return true;
    return this.model.solid[this.key(x, y)] === 1;
  }

  occupantAt(x, y) {
    return this.occupancy.get(this.key(x, y)) || null;
  }

  isBlocked(x, y, self = null) {
    if (this.isSolid(x, y)) return true;
    const occ = this.occupantAt(x, y);
    return !!occ && occ !== self;
  }

  /** Moves an actor one tile if free. Reserves the destination immediately. */
  tryMoveActor(actor, dir, stepMs) {
    const v = DIR_VECTORS[dir];
    const nx = actor.tx + v.x;
    const ny = actor.ty + v.y;
    actor.face(dir);
    if (this.isBlocked(nx, ny, actor)) return false;
    this.occupancy.set(this.key(nx, ny), actor);
    actor.prevKey = this.key(actor.tx, actor.ty);
    actor.beginStep(dir, stepMs);
    return true;
  }

  /** Frees the tile an actor stepped off (called when its step completes). */
  releaseSource(actor) {
    if (actor.prevKey !== undefined && this.occupancy.get(actor.prevKey) === actor) this.occupancy.delete(actor.prevKey);
    actor.prevKey = undefined;
  }

  // ---------------------------------------------------------------------------
  // Frame update

  update(time, delta) {
    const dt = Math.min(delta, 50);
    this.session.addPlayTime(dt / 1000);
    this.worldMap.update(dt);
    this.bumpCooldown -= dt;
    if (this.invulnerableMs > 0) {
      this.invulnerableMs -= dt;
      this.player.sprite.setAlpha(this.invulnerableMs > 0 && Math.floor(this.invulnerableMs / 100) % 2 ? 0.35 : 1);
    }
    const busy = this.isBusy();
    for (const brain of this.npcs) {
      if (busy && !brain.actor.scripted) continue;
      brain.update(dt);
    }
    if (!busy && !this.leaving) for (const e of this.enemies) e.update(dt, this.player);
    for (const a of this.actors.values()) if (a.scripted && a.moving && a.updateMovement(dt)) this.releaseSource(a);

    if (!busy && !this.leaving) this.updatePlayer(dt);
    else if (this.player.moving && !this.player.scripted) {
      if (this.player.updateMovement(dt)) {
        this.releaseSource(this.player);
        this.player.stopWalking();
      }
    }
    this.markerTime += dt;
    this.updateMarker(busy);
    this.ambient.update(dt, this.player);
    this.updateCamera(dt);
  }

  isBusy() {
    return this.scriptDepth > 0 || this.app.overlay.busy || this.transitioning;
  }

  updatePlayer(dt) {
    const p = this.player;
    const input = this.controls;
    if (p.moving) {
      if (p.updateMovement(dt)) {
        this.releaseSource(p);
        this.onPlayerStep();
        if (this.leaving || this.isBusy()) {
          p.stopWalking();
          return;
        }
      } else return;
    }
    if (input.pressed('menu')) {
      input.consume('menu');
      input.consume('cancel');
      this.openMenu();
      return;
    }
    if (input.pressed('confirm')) {
      input.consume('confirm');
      if (this.interact()) {
        p.stopWalking();
        this.wasMoving = false;
        return;
      }
    }
    if (input.pressed('debug')) return;
    const dir = input.heldDirection();
    if (!dir) {
      if (this.wasMoving || p.pose === 'walk') p.stopWalking();
      this.wasMoving = false;
      this.turnHold = 0;
      return;
    }
    if (!this.wasMoving && dir !== p.facing) {
      p.face(dir);
      this.turnHold = 85;
      return;
    }
    if (this.turnHold > 0) {
      this.turnHold -= dt;
      if (this.turnHold > 0) return;
    }
    const running = input.isDown('run') !== this.app.settings.get('alwaysRun');
    this.stepPlayer(dir, running);
  }

  stepPlayer(dir, running) {
    const p = this.player;
    const v = DIR_VECTORS[dir];
    const nx = p.tx + v.x;
    const ny = p.ty + v.y;
    p.face(dir);
    const occ = this.occupantAt(nx, ny);
    if (occ && occ.kind === 'enemy') {
      const enemy = this.enemies.find((e) => e.actor === occ);
      if (enemy && enemy.cooldown <= 0) {
        this.startEncounter(enemy, 'player', dir);
        return;
      }
    }
    const warp = this.warpAt(nx, ny);
    if (warp && warp.if && !evaluateCondition(warp.if, this.session)) {
      this.bump();
      p.stopWalking();
      this.wasMoving = false;
      if (warp.locked) this.runScript(warp.locked);
      return;
    }
    const blocked = this.app.flags.noclip ? nx < 0 || ny < 0 || nx >= this.model.width || ny >= this.model.height || !!occ : this.isBlocked(nx, ny, p);
    if (blocked) {
      this.bump();
      if (this.wasMoving || p.pose === 'walk') p.stopWalking();
      this.wasMoving = false;
      return;
    }
    this.occupancy.set(this.key(nx, ny), p);
    p.prevKey = this.key(p.tx, p.ty);
    p.beginStep(dir, running ? RUN_MS : WALK_MS);
    this.wasMoving = true;
  }

  bump() {
    if (this.bumpCooldown > 0) return;
    this.bumpCooldown = 380;
    this.app.audio.sfx('bump', { volume: 0.6 });
  }

  onPlayerStep() {
    const p = this.player;
    this.session.location = { map: this.model.id, x: p.tx, y: p.ty, facing: p.facing };
    const warp = this.warpAt(p.tx, p.ty);
    if (warp) {
      this.takeWarp(warp);
      return;
    }
    for (const obj of this.objects) {
      if (obj.type !== 'trigger' || !this.inRect(obj, p.tx, p.ty)) continue;
      const wkey = WorldState.key(this.model.id, obj.id);
      if (obj.once !== false && this.session.world.get(wkey, 'fired', false)) continue;
      if (!evaluateCondition(obj.if, this.session)) continue;
      if (obj.once !== false) this.session.world.set(wkey, 'fired', true);
      this.runScript(obj.script);
      return;
    }
  }

  inRect(obj, x, y) {
    return x >= obj.x && y >= obj.y && x < obj.x + (obj.w || 1) && y < obj.y + (obj.h || 1);
  }

  warpAt(x, y) {
    return this.objects.find((o) => o.type === 'warp' && this.inRect(o, x, y)) || null;
  }

  // ---------------------------------------------------------------------------
  // Interaction

  facingTile() {
    const v = DIR_VECTORS[this.player.facing];
    return { x: this.player.tx + v.x, y: this.player.ty + v.y };
  }

  /** What the player would interact with right now (for the marker and confirm). */
  interactionTarget() {
    const { x, y } = this.facingTile();
    const occ = this.occupantAt(x, y);
    if (occ && occ.kind === 'npc' && occ.npc) return { kind: 'npc', actor: occ, x, y };
    for (const obj of this.objects) {
      if ((obj.type === 'inspect' || obj.type === 'chest') && this.inRect(obj, x, y)) return { kind: obj.type, obj, x, y };
    }
    const prop = this.propAt.get(this.key(x, y));
    if (prop?.def?.inspect) return { kind: 'prop', prop, x, y };
    return null;
  }

  interact() {
    const t = this.interactionTarget();
    if (!t) return false;
    if (t.kind === 'npc') this.talkTo(t.actor);
    else if (t.kind === 'inspect') this.inspectObject(t.obj);
    else if (t.kind === 'chest') this.openChest(t.obj);
    else if (t.kind === 'prop') this.inspectProp(t.prop, t.x, t.y);
    return true;
  }

  pickDialogue(selectors, counterKey) {
    for (const entry of selectors || []) {
      if (!evaluateCondition(entry.if, this.session)) continue;
      if (entry.cycle) {
        const n = this.session.world.incrementCounter(counterKey) - 1;
        return entry.cycle[n % entry.cycle.length];
      }
      return entry.script;
    }
    return null;
  }

  async talkTo(actor) {
    const npc = actor.npc;
    const script = this.pickDialogue(npc.dialogue, `talk:${npc.id}`);
    actor.brain?.pause();
    const prevFacing = actor.facing;
    if (npc.turnToTalk !== false && actor.brain?.behavior.type !== 'sit') actor.faceToward(this.player.tx, this.player.ty);
    if (actor.pose === 'work') actor.playPose('idle');
    if (script) await this.runScript(script);
    this.app.bus.emit('npc:talked', { npc: npc.id });
    if (actor.brain && actor.brain.behavior.type !== 'routine') actor.face(prevFacing);
    actor.brain?.resume();
  }

  async inspectObject(obj) {
    const id = `${this.model.id}:${obj.id}`;
    if (obj.script) await this.runScript(obj.script);
    else if (obj.dialogue) {
      const script = this.pickDialogue(obj.dialogue, `inspect:${id}`);
      if (script) await this.runScript(script);
    } else if (obj.text) await this.runScript(asArray(obj.text));
    this.app.bus.emit('object:inspected', { id, tags: obj.tags || [] });
  }

  async inspectProp(prop, x, y) {
    const lines = asArray(prop.def.inspect);
    const line = lines[hash32(this.model.id, prop.x, prop.y) % lines.length];
    await this.runScript([line]);
    this.app.bus.emit('object:inspected', { id: `${this.model.id}:prop:${prop.prop}`, tags: [prop.prop] });
    void x;
    void y;
  }

  async openChest(obj) {
    const wkey = WorldState.key(this.model.id, obj.id);
    if (this.session.world.isOpened(wkey)) {
      await this.runScript(['It’s empty now.']);
      return;
    }
    const steps = [];
    if (obj.text) steps.push(obj.text);
    steps.push({ sfx: 'chest_open' });
    for (const it of obj.items || []) steps.push({ giveItem: it.id, count: it.count ?? 1 });
    if (obj.gold) steps.push({ giveGold: obj.gold });
    this.session.world.markOpened(wkey);
    const sprite = this.objectSprites.get(obj.id);
    if (sprite && (obj.prop ?? 'chest') === 'chest') sprite.setFrame('chest_open');
    await this.runScript(steps);
    this.app.bus.emit('object:inspected', { id: `${this.model.id}:${obj.id}`, tags: obj.tags || [] });
  }

  updateMarker(busy) {
    if (busy || this.player.moving || this.leaving) {
      this.marker.setVisible(false);
      this.app.overlay.setHint(null);
      return;
    }
    const t = this.interactionTarget();
    if (!t) {
      this.marker.setVisible(false);
      this.app.overlay.setHint(null);
      return;
    }
    let mx = t.x * TILE_SIZE + TILE_SIZE / 2;
    let my = t.y * TILE_SIZE - 2;
    let frame = 'mark_look';
    let hint = 'Inspect';
    if (t.kind === 'npc') {
      frame = 'mark_talk';
      hint = 'Talk';
      mx = t.actor.sprite.x;
      my = t.actor.sprite.y - 45;
    } else if (t.kind === 'chest') {
      hint = this.session.world.isOpened(WorldState.key(this.model.id, t.obj.id)) ? 'Inspect' : 'Open';
    }
    // Gentle 2px bob, stepped to whole pixels.
    const bob = Math.round((Math.sin((this.markerTime / 760) * Math.PI * 2) - 1) * 1);
    this.marker.setFrame(frame);
    this.marker.setPosition(Math.round(mx), Math.round(my) + bob);
    this.marker.setVisible(true);
    this.app.overlay.setHint(`{btn:confirm} ${hint}`);
  }

  // ---------------------------------------------------------------------------
  // Scripts

  scriptContext() {
    return {
      session: this.session,
      bus: this.app.bus,
      content: this.content,
      services: this.services,
      wait: (ms) => this.wait(ms),
    };
  }

  async runScript(script) {
    this.scriptDepth += 1;
    this.player.stopWalking();
    this.wasMoving = false;
    try {
      await this.runner.run(script, this.scriptContext());
    } catch (err) {
      console.error(err);
      this.app.overlay.toasts.push({ text: `<r>Script error:</> ${String(err.message).slice(0, 60)}`, hold: 4000 });
    } finally {
      this.scriptDepth -= 1;
      if (this.scriptDepth === 0 && this.sys.isActive()) await this.app.overlay.dialogue.close();
      if (this.scriptDepth === 0) {
        for (const a of this.actors.values()) a.scripted = false;
      }
    }
  }

  onQuestCompleted({ quest }) {
    if (!quest.onComplete || !this.sys.isActive()) return;
    // Let the current conversation finish first.
    const run = () => {
      if (this.isBusy()) this.time.delayedCall(200, run);
      else this.runScript(quest.onComplete);
    };
    this.time.delayedCall(600, run);
  }

  showEmote(actor, icon, duration = 900) {
    const e = this.add.image(actor.sprite.x, actor.sprite.y - 44, 'ui', `emote_${icon}`).setOrigin(0.5, 1).setDepth(80001);
    e.setScale(1, 0.2);
    this.tweens.add({ targets: e, scaleY: 1, duration: 110, ease: 'Back.Out' });
    return new Promise((resolve) => {
      this.time.delayedCall(duration, () => {
        e.destroy();
        resolve();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Transitions, menus, battles

  async takeWarp(warp) {
    this.leaving = true;
    if (warp.sfx) this.app.audio.sfx(warp.sfx);
    this.player.stopWalking();
    await this.app.overlay.fadeOut(220);
    const to = warp.to;
    this.scene.restart({ map: to.map, spawn: to.spawn, x: to.x, y: to.y, facing: to.facing });
  }

  async transitionTo(map, opts = {}) {
    this.leaving = true;
    await this.app.overlay.fadeOut(opts.duration ?? 300);
    this.scene.restart({ map, ...opts });
  }

  openMenu() {
    if (this.isBusy()) return;
    this.app.audio.ui('menu_open');
    this.app.overlay.setHint(null);
    this.marker.setVisible(false);
    this.scene.pause();
    this.scene.launch('Menu', { mode: 'pause' });
  }

  onResume() {
    this.controls.consumeAll();
    this.wasMoving = false;
    this.player.stopWalking();
    if (this.pendingResume) {
      const r = this.pendingResume;
      this.pendingResume = null;
      r();
    }
  }

  /** Opens a shop from a script; resolves when the shop closes. */
  openShop(shopId) {
    return new Promise((resolve) => {
      this.pendingResume = resolve;
      this.app.overlay.dialogue.forceClose();
      this.scene.pause();
      this.scene.launch('Menu', { mode: 'shop', shop: shopId });
    });
  }

  playerInvulnerable() {
    return this.invulnerableMs > 0;
  }

  /** Touching a visible enemy. initiator: 'player' | 'enemy'; dir: the move that made contact. */
  startEncounter(fieldEnemy, initiator, dir) {
    if (this.isBusy() || this.leaving || this.invulnerableMs > 0) return;
    let advantage = 'normal';
    if (initiator === 'player' && fieldEnemy.actor.facing === dir) advantage = 'preemptive';
    if (initiator === 'enemy' && this.player.facing === dir) advantage = 'ambush';
    this.runEncounter(fieldEnemy, advantage);
  }

  async runEncounter(fieldEnemy, advantage) {
    this.scriptDepth += 1;
    const obj = fieldEnemy.actor.obj;
    const result = await this.startBattle(obj.encounter, { advantage });
    this.scriptDepth -= 1;
    if (result === 'win') {
      this.session.world.markDefeated(WorldState.key(this.model.id, obj.id));
      this.removeActor(fieldEnemy.actor);
      this.autosave();
    } else if (result === 'flee') {
      fieldEnemy.stun(3000);
      this.invulnerableMs = 2200;
    }
  }

  /** Runs a battle and resolves with 'win' | 'lose' | 'flee'. */
  startBattle(encounterId, { advantage = 'normal' } = {}) {
    return new Promise((resolve) => {
      this.app.overlay.setHint(null);
      this.marker.setVisible(false);
      this.app.audio.sfx('encounter');
      this.cameras.main.flash(180, 255, 255, 255);
      this.time.delayedCall(200, async () => {
        await this.app.overlay.fadeOut(260);
        this.app.audio.pushMusic();
        this.scene.pause();
        this.scene.launch('Battle', {
          encounter: encounterId,
          advantage,
          onEnd: async (result) => {
            this.pendingResume = async () => {
              const audio = this.app.audio;
              audio.popMusic();
              audio.setMusicFilter(this.model.meta.musicFilter);
              audio.setAmbience(this.model.meta.ambience);
              await this.app.overlay.fadeIn(300);
              resolve(result);
            };
            if (this.sys.isPaused()) this.scene.resume();
            else this.onResume();
          },
        });
      });
    });
  }

  autosave() {
    if (!this.session) return;
    const res = this.app.saves.save('auto', this.session);
    if (!res.ok) console.warn(res.reason);
  }

  // ---------------------------------------------------------------------------
  // Camera

  updateCamera(dt) {
    const cam = this.cameras.main;
    const W = this.worldMap.widthPx;
    const H = this.worldMap.heightPx;
    const focus = this.cameraFocus ?? { x: this.player.px, y: this.player.py - 18 };
    let sx = focus.x - SCREEN_WIDTH / 2;
    let sy = focus.y - SCREEN_HEIGHT / 2;
    sx = W <= SCREEN_WIDTH ? (W - SCREEN_WIDTH) / 2 : Math.max(0, Math.min(W - SCREEN_WIDTH, sx));
    sy = H <= SCREEN_HEIGHT ? (H - SCREEN_HEIGHT) / 2 : Math.max(0, Math.min(H - SCREEN_HEIGHT, sy));
    this.bobTime += dt;
    const bob = this.model.meta.bob ? Math.round(Math.sin((this.bobTime / 2600) * Math.PI * 2) * this.model.meta.bob) : 0;
    cam.setScroll(Math.round(sx), Math.round(sy) + bob);
  }
}
