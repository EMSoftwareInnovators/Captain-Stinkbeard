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
import { FumeField, Exposure, fumeConfig, hazeFor } from '../systems/hazards/fumes.js';
import { sharkConfig, sharkLevelFor } from '../systems/hazards/sharks.js';
import { resolveVariant, currentTimeOfDay, dueStoryTriggers, triggerKey } from '../systems/story/progress.js';
import { takeNewEntries } from '../systems/logs/logbook.js';
import { FxPool } from '../world/FxPool.js';
import { Barks } from '../world/Barks.js';
import { FumeLayer } from '../world/FumeLayer.js';
import { SharkLayer } from '../world/SharkLayer.js';
import { Stage } from '../world/Stage.js';
import { mix, unpack, rgba } from '../art/palette.js';
import { TILE_SIZE, DIR_VECTORS, OPPOSITE_DIR, DIRECTIONS, SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';
import { hash32 } from '../core/Rng.js';
import { asArray } from '../core/util.js';

// Step durations chosen so a 60 Hz frame moves a whole number of pixels:
// walking is 2 px per frame (8 frames per tile), running 3 px per frame.
const FRAME_MS = 1000 / 60;
const WALK_MS = FRAME_MS * 8;
const RUN_MS = (FRAME_MS * 16) / 3;
/** How long the captain leans on someone standing in his way before squeezing past. */
const SQUEEZE_PAST_MS = 700;

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
    // A cutscene may have left the view tilted (the ship rolling).
    this.cameras.main.setRotation(0);
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
    this.wasMoving = false;
    this.leaving = false;
    // The scene object is reused on every map change: clear leftovers from
    // the previous map (a cutscene camera target, region tracking, debug
    // drawing, a pending shop/battle resume).
    this.cameraFocus = null;
    this.regionsInside = null;
    this.debugKey = null;
    this.debugGfx = null;
    this.pendingResume = null;
    this.transitioning = false;
    this.collapsing = false;
    this.fumeClock = 0;
    this.storyDirty = false;
    this.triggersDirty = true;
    this.coughTimer = 2500;
    this.mapAudioKey = null;
    this.gradeKey = null;
    // Directions already held when this map loaded. They never carry the
    // captain straight back through a doorway; release and press again.
    this.entryHeld = new Set(DIRECTIONS.filter((d) => this.controls.isDown(d)));
    this.lockedHold = null;

    this.cameras.main.setBackgroundColor(this.model.meta.background === 'ocean' ? '#16416f' : '#07060b');
    this.worldMap = new WorldMap(this, this.model, this.tileset);
    this.dynSolid = new Uint8Array(this.model.width * this.model.height);
    this.buildProps();
    this.refreshDynamicSolids();
    this.buildObjects();
    this.placePlayer();
    this.glows = [];
    this.lightKey = null;
    this.refreshLighting();
    this.ambient = new Ambient(this, this.def.ambient || []);
    this.fx = new FxPool(this);
    this.barks = new Barks(this);
    this.stage = new Stage(this);
    const cfg = fumeConfig(this.content);
    this.fumeField = new FumeField(this.model.meta.fumes, cfg);
    this.fumeLayer = new FumeLayer(this, cfg);
    this.session.transient.exposure ??= new Exposure(cfg);
    this.exposure = this.session.transient.exposure;
    this.sharks = new SharkLayer(this, sharkConfig(this.content));
    this.grade = this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0xffffff).setOrigin(0).setScrollFactor(0).setDepth(75000).setBlendMode('MULTIPLY');
    this.applyReducedEffects();
    this.refreshStory({ immediate: true });
    this.marker = this.add.image(0, 0, 'ui', 'mark_talk').setOrigin(0.5, 1).setDepth(80000).setVisible(false);
    this.markerTime = 0;

    this.runner = new ScriptRunner({
      registry: new CommandRegistry().registerAll(createCommandImplementations()),
      getScript: (id) => this.content.scripts.get(id),
    });
    this.services = createWorldServices(this);
    this.app.overlay.dialogue.dockResolver = (line, current) => this.dialogueDock(line, current);
    const markStory = () => {
      this.storyDirty = true;
      this.triggersDirty = true;
    };
    this.subscriptions = [
      this.app.bus.on('quest:completed', this.onQuestCompleted, this),
      this.app.bus.on('story:flagSet', markStory),
      this.app.bus.on('story:flagCleared', markStory),
      this.app.bus.on('story:varChanged', markStory),
      this.app.bus.on('quest:started', markStory),
      this.app.bus.on('quest:objectiveCompleted', markStory),
      this.app.bus.on('quest:completed', markStory),
      this.app.bus.on('settings:changed', () => this.applyReducedEffects()),
    ];
    this.events.once('shutdown', () => this.cleanup());
    this.events.on('resume', () => this.onResume());

    this.updateCamera(0);
    this.setupAudio();
    this.enterMap();
  }

  cleanup() {
    this.subscriptions.forEach((off) => off());
    if (this.app.overlay?.dialogue) this.app.overlay.dialogue.dockResolver = null;
    this.app.overlay?.setHint(null);
    this.app.overlay?.setExposure(null);
    this.fx?.destroy();
    this.barks?.clear();
    this.stage?.clear();
    this.fumeLayer?.destroy();
    this.sharks?.destroy();
    // The camera may already be torn down when the scene shuts down.
    this.cameras?.main?.setRotation(0);
  }

  // ---------------------------------------------------------------------------
  // Construction

  buildProps() {
    for (const p of this.model.props) {
      const def = this.content.props.get(p.prop);
      this.addProp(p, def);
    }
    this.applyPropConditions();
  }

  /** Shows the props whose "if" holds and rebuilds what can be bumped into or inspected. */
  applyPropConditions() {
    this.propAt = new Map();
    for (const rec of this.props) {
      const on = !rec.if || evaluateCondition(rec.if, this.session);
      rec.visible = on && !rec.hiddenByScript;
      rec.sprite.setVisible(rec.visible);
      if (!rec.visible) continue;
      const def = rec.def;
      const [fw, fh] = def.footprint || [1, 1];
      const layer = def.layer ?? 'object';
      if (layer === 'object' || layer === 'wall' || def.inspect) {
        for (let j = 0; j < fh; j++) for (let k = 0; k < fw; k++) this.propAt.set(this.key(rec.x + k, rec.y + j), rec);
      }
    }
  }

  /** Solid tiles that come and go with the story (conditional props, blocks, chests). */
  refreshDynamicSolids() {
    this.dynSolid.fill(0);
    for (const d of this.model.dynamicSolids ?? []) {
      if (!evaluateCondition(d.if, this.session)) continue;
      for (let j = 0; j < d.h; j++) for (let k = 0; k < d.w; k++) {
        const x = d.x + k;
        const y = d.y + j;
        if (x >= 0 && y >= 0 && x < this.model.width && y < this.model.height) this.dynSolid[this.key(x, y)] = 1;
      }
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
    if (p.depthOffset) img.setDepth(img.depth + p.depthOffset);
    if (p.alpha !== undefined) img.setAlpha(p.alpha);
    const rec = { ...p, def, sprite: img, visible: true };
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
      // A warp's `if` is a lock, checked live when the captain steps on it
      // (so a door opens as soon as he has the key and can say it's locked).
      // Inspectables and triggers are also checked live, so a cutscene can
      // make new things to look at appear without leaving the room.
      const live = obj.type === 'warp' || obj.type === 'inspect' || obj.type === 'trigger' || obj.type === 'block';
      if (obj.if && !live && !evaluateCondition(obj.if, session)) continue;
      const wkey = WorldState.key(this.model.id, obj.id);
      switch (obj.type) {
        case 'npc': {
          if (npcPlaced.has(obj.npc)) break;
          npcPlaced.add(obj.npc);
          // "absent": this placement says the NPC is elsewhere for now.
          if (obj.absent) break;
          const a = this.spawnNpc(obj.npc, { x: obj.x, y: obj.y, facing: obj.facing, behavior: obj.behavior, actorId: obj.npc });
          if (obj.pose) {
            a.brain.pose = obj.pose;
            a.playPose(obj.pose);
          }
          // A deliberate gate (Garrick's toll): the captain can't squeeze past.
          a.blocks = !!obj.blocks;
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
    const look = resolveVariant(def, this.session);
    const actor = new Actor(this, { id: actorId, texture: `char_${look.appearance ?? def.id}`, x, y, facing, kind: 'npc', shadow: look.shadow ?? 'shadow_m' });
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
    // A save or warp that points into a wall (a room was rebuilt since) lands
    // on the nearest open tile instead.
    if (this.isSolid(pos.x, pos.y)) pos = { ...this.nearestOpenTile(pos.x, pos.y), facing: pos.facing };
    const appearance = this.playerAppearance();
    this.player = new Actor(this, { id: 'player', texture: `char_${appearance}`, x: pos.x, y: pos.y, facing: e.facing ?? pos.facing ?? 'down', kind: 'player', shadow: 'shadow_m' });
    if (e.hidePlayer) this.player.setVisible(false);
    this.registerActor(this.player);
    this.session.location = { map: this.model.id, x: pos.x, y: pos.y, facing: this.player.facing };
  }

  playerAppearance() {
    const leader = this.session.party.leader();
    const look = resolveVariant(leader.def, this.session);
    return look.appearance ?? leader.id;
  }

  /** Closest walkable tile to (x, y), searching outward ring by ring. */
  nearestOpenTile(x, y) {
    for (let r = 1; r < 40; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!this.isSolid(nx, ny) && !this.warpAt?.(nx, ny)) return { x: nx, y: ny };
      }
    }
    const first = Object.values(this.model.spawns)[0];
    return { x: first.x, y: first.y };
  }

  collectLights() {
    const lights = [];
    for (const p of this.props) {
      const l = p.def.light;
      if (!l || !p.visible) continue;
      const [fw] = p.def.footprint || [1, 1];
      lights.push({ x: (p.x + fw / 2) * TILE_SIZE, y: (p.y + (p.def.layer === 'overhead' ? 0.6 : 0.4)) * TILE_SIZE, radius: l.radius, color: l.color, flicker: l.flicker });
    }
    for (const l of this.model.meta.lighting?.lights ?? []) {
      lights.push({ x: l.x * TILE_SIZE, y: l.y * TILE_SIZE, radius: l.radius, color: l.color, flicker: false });
    }
    return lights;
  }

  /** (Re)bakes the light map when the set of lights or the ambient colour changed. */
  refreshLighting() {
    const lights = this.collectLights();
    const variant = (this.model.meta.lightingVariants ?? []).find((v) => evaluateCondition(v.if, this.session));
    const ambient = variant?.ambient ?? null;
    const key = `${ambient}|${lights.map((l) => `${l.x},${l.y}`).join(';')}`;
    if (key === this.lightKey) return;
    this.lightKey = key;
    this.worldMap.buildLighting(lights, ambient);
    for (const g of this.glows) g.destroy();
    this.glows = [];
    this.addGlows(lights);
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
      this.glows.push(glow);
    }
  }

  /** Music, filter and ambience for this map, after story variants. */
  mapAudio() {
    const meta = this.model.meta;
    const v = (meta.musicVariants ?? []).find((m) => evaluateCondition(m.if, this.session)) ?? {};
    return {
      music: 'music' in v ? v.music : meta.music,
      musicFilter: 'musicFilter' in v ? v.musicFilter : meta.musicFilter,
      ambience: 'ambience' in v ? v.ambience : meta.ambience,
    };
  }

  setupAudio() {
    const audio = this.app.audio;
    const a = this.mapAudio();
    this.mapAudioKey = JSON.stringify(a);
    if (!this.entry.keepMusic) audio.playMusic(a.music, { fade: 0.8 });
    audio.setMusicFilter(a.musicFilter);
    audio.setAmbience(a.ambience);
  }

  async enterMap() {
    // Busy until the arrival scripts have run: the fade-in is not a moment
    // of free control (no fumes build, no input, no story triggers).
    this.entering = true;
    try {
      await this.runArrival();
    } finally {
      this.entering = false;
    }
    this.continueStory();
  }

  async runArrival() {
    const session = this.session;
    const firstVisit = session.world.visit(this.model.id);
    this.app.bus.emit('map:entered', { map: this.model.id, first: firstVisit });
    this.updateRegions();
    if (this.entry.fadeIn !== false) await this.app.overlay.fadeIn(this.entry.newGame ? 700 : 260);
    if (!this.entry.newGame) this.app.overlay.locationTitle(this.model.name);
    if (this.entry.newGame) {
      const script = this.content.game.newGame.startScript;
      if (script) await this.runScript(script);
    }
    // A cutscene that changed maps continues here ("transition" with "then").
    if (this.entry.then) await this.runScript(this.entry.then);
    for (const e of this.model.meta.onEnter) {
      if (evaluateCondition(e.if, session)) await this.runScript(e.script);
    }
    if (!this.entry.newGame && !this.entry.loaded && !this.entry.noAutosave && !this.leaving) this.autosave();
  }

  // ---------------------------------------------------------------------------
  // Grid helpers

  key(x, y) {
    return y * this.model.width + x;
  }

  isSolid(x, y) {
    if (x < 0 || y < 0 || x >= this.model.width || y >= this.model.height) return true;
    const k = this.key(x, y);
    // Conditional props, blocks and chests live in dynSolid (refreshStory).
    return this.model.solid[k] === 1 || this.dynSolid?.[k] === 1;
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
    this.fumeClock += dt;
    if (this.storyDirty) {
      this.storyDirty = false;
      this.refreshStory();
    }
    this.worldMap.update(dt);
    this.fx.update(dt);
    this.barks.update(dt);
    this.stage.update(time);
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
    this.updateFumes(dt, busy);
    this.sharks.update(dt, { busy, player: this.player });
    this.updateDebugDraw();
    this.ambient.update(dt, this.player);
    this.updateCamera(dt);
    if (this.triggersDirty && !busy && !this.leaving && !this.collapsing && this.sys.isActive()) {
      this.triggersDirty = false;
      this.checkStoryTriggers();
    }
  }

  // ---------------------------------------------------------------------------
  // Story state: everything on the map that follows flags, refreshed live

  refreshStory({ immediate = false } = {}) {
    const session = this.session;
    this.applyPropConditions();
    this.refreshDynamicSolids();
    this.refreshLighting();
    // Characters whose look depends on the story (a parrot losing feathers).
    for (const a of this.actors.values()) {
      if (a.npc) a.setTexture(`char_${resolveVariant(a.npc, session).appearance ?? a.npc.id}`);
    }
    this.player?.setTexture(`char_${this.playerAppearance()}`);
    this.fumeLayer.setZones(this.fumeField.refresh(session));
    this.fumeLayer.setHaze(hazeFor(this.model.meta.haze, session));
    this.sharks.setLevel(sharkLevelFor(this.model.meta, session), { immediate });
    this.ambient?.refresh();
    this.announceLogEntries();
    this.applyTimeOfDay(immediate ? 0 : 1600);
    if (!immediate) {
      const a = this.mapAudio();
      const key = JSON.stringify(a);
      if (key !== this.mapAudioKey) {
        this.mapAudioKey = key;
        if (a.music !== undefined) this.app.audio.playMusic(a.music, { fade: 1.2 });
        this.app.audio.setMusicFilter(a.musicFilter);
        this.app.audio.setAmbience(a.ambience);
      }
    }
  }

  /** "Stench Log updated" when the story unlocks new entries in a logbook. */
  announceLogEntries() {
    for (const [id, log] of this.content.logs.map) {
      for (const e of takeNewEntries(log, id, this.session)) {
        this.app.overlay?.toasts.push({ text: `${log.menuLabel ?? log.title} updated: <y>${e.title}</>`, icon: log.icon ?? 'ledger', sound: 'log_update', hold: 2600 });
      }
    }
  }

  /** Colour grade for the time of day (data/game.json "timeOfDay"). */
  applyTimeOfDay(duration = 0) {
    const tod = currentTimeOfDay(this.content.game, this.session);
    const outdoor = this.model.meta.outdoor;
    let color = tod.grade ?? '#ffffff';
    if (!outdoor) color = mix('#ffffff', color, tod.interior ?? 0.35);
    const key = String(color);
    if (key === this.gradeKey) return;
    this.gradeKey = key;
    const target = unpack(rgba(color));
    const from = this.grade.fillColor;
    const start = { r: (from >> 16) & 255, g: (from >> 8) & 255, b: from & 255 };
    if (duration <= 0) {
      this.grade.setFillStyle((target.r << 16) | (target.g << 8) | target.b, 1);
      return;
    }
    const st = { t: 0 };
    this.tweens.add({
      targets: st,
      t: 1,
      duration,
      onUpdate: () => {
        const l = (a, b) => Math.round(a + (b - a) * st.t);
        this.grade.setFillStyle((l(start.r, target.r) << 16) | (l(start.g, target.g) << 8) | l(start.b, target.b), 1);
      },
    });
  }

  applyReducedEffects() {
    const reduced = this.app.settings.reducedEffects();
    this.fx.reduced = reduced;
    this.fumeLayer.setReduced(reduced);
  }

  /** Runs the first due story trigger (data/story/triggers), one at a time. */
  async checkStoryTriggers() {
    const session = this.session;
    const due = dueStoryTriggers(this.content.storyTriggers.list(), session, (id) => session.world.get(triggerKey(id), 'fired', false));
    const t = due[0];
    if (!t) return;
    session.world.set(triggerKey(t.id), 'fired', true);
    await this.runScript(t.script);
    this.triggersDirty = true;
  }

  // ---------------------------------------------------------------------------
  // Fumes

  /** Fume level at the captain's feet. */
  playerFumeLevel() {
    const p = this.player;
    return this.fumeField.levelAt(Math.floor(p.px / TILE_SIZE), Math.floor((p.py - 1) / TILE_SIZE), this.fumeClock);
  }

  updateFumes(dt, busy) {
    const level = this.playerFumeLevel();
    this.fumeLayer.cinematic = busy;
    this.fumeLayer.update(dt, level, this.fx);
    const overlay = this.app.overlay;
    const exposure = this.exposure;
    // Exposure only builds while the player is in control: cutscenes never
    // choke the captain behind a dialogue box.
    if (!busy && !this.leaving && !this.collapsing && !this.app.flags.fumeImmunity) {
      // The wet cloth from the rescue slows the fumes; so does the Gentle
      // option, and a swig of Frog Grog for a while (its "fume ward").
      let scale = this.app.settings.fumeScale() * (this.session.story.has('rescue_gear_on') ? 0.7 : 1);
      const ward = this.session.transient.fumeWard;
      if (ward?.ms > 0) {
        scale *= ward.scale;
        ward.ms -= dt;
      }
      const r = exposure.update(dt, level, scale);
      if (r.warn) {
        this.app.audio.sfx('cough_heavy');
        this.barks.show(this.player, '<y>*cough* ...need air...</>', { duration: 1400 });
      }
      if (r.collapsed) {
        this.collapse();
        return;
      }
    }
    // The meter belongs to free play: cutscenes and dialogue hide it.
    const hazardOn = this.app.settings.fumeScale() > 0 && !this.app.flags.fumeImmunity;
    const show = !busy && (exposure.value > 0.5 || (hazardOn && (level === 'dense' || level === 'center')));
    overlay?.setExposure(show ? { value: exposure.fraction, level } : null);
    // Coughing in thick air.
    if (level === 'dense' || level === 'center' || exposure.value > 40) {
      this.coughTimer -= dt;
      if (this.coughTimer <= 0) {
        this.coughTimer = level === 'center' ? 1400 + Math.random() * 900 : 2600 + Math.random() * 2400;
        this.app.audio.sfx(`cough${Math.floor(Math.random() * 3)}`, { volume: 0.7 });
      }
    }
  }

  /** Too long in the fumes: the captain drops and is carried to clean air. */
  async collapse() {
    if (this.collapsing) return;
    this.collapsing = true;
    this.scriptDepth += 1;
    this.player.stopWalking();
    this.wasMoving = false;
    this.app.audio.sfx('collapse');
    this.player.playPose('fallen');
    await this.wait(900);
    this.exposure.reset();
    this.app.overlay.setExposure(null);
    this.scriptDepth -= 1;
    this.collapsing = false;
    await this.runScript(this.model.meta.fumeCollapse ?? 'hazard.fume_collapse');
    if (this.player.pose === 'fallen') this.player.playPose('idle');
  }

  /**
   * Puts the captain somewhere breathable: the map's fumeSafeSpawn, a named
   * spawn, or the nearest spawn outside dense fumes.
   */
  respawnSafely(spawnId = 'safe') {
    const spawns = this.model.spawns;
    let pos = spawnId !== 'safe' ? spawns[spawnId] : null;
    if (!pos && this.model.meta.fumeSafeSpawn) pos = spawns[this.model.meta.fumeSafeSpawn];
    if (!pos) {
      const p = this.player;
      const safe = Object.values(spawns)
        .filter((sp) => this.fumeField.isSafe(sp.x, sp.y, this.fumeClock))
        .sort((a, b) => Math.abs(a.x - p.tx) + Math.abs(a.y - p.ty) - (Math.abs(b.x - p.tx) + Math.abs(b.y - p.ty)));
      pos = safe[0] ?? Object.values(spawns)[0];
    }
    this.services.world.place('player', pos.x, pos.y, pos.facing ?? 'down');
    this.player.playPose('idle');
    this.stage.tetherStep(pos.x, pos.y);
  }

  isBusy() {
    return this.scriptDepth > 0 || this.entering || this.app.overlay.busy || this.transitioning || !!this.app.cinema?.busy;
  }

  /**
   * Player control. Responsiveness rules: a direction press moves on the same
   * frame it is read (no turn-in-place delay), the first step starts one
   * frame's distance in, and pressing the opposite way mid-step turns back
   * immediately instead of finishing the tile first.
   */
  updatePlayer(dt) {
    const p = this.player;
    const input = this.controls;
    if (p.moving) {
      if (input.heldDirection() === OPPOSITE_DIR[p.facing]) this.reversePlayer();
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
    for (const d of this.entryHeld) if (!input.isDown(d)) this.entryHeld.delete(d);
    if (this.lockedHold && !input.isDown(this.lockedHold)) this.lockedHold = null;
    const dir = input.heldDirection();
    if (!dir) {
      this.pushing = null;
      if (this.wasMoving || p.pose === 'walk') p.stopWalking();
      this.wasMoving = false;
      return;
    }
    const running = input.isDown('run') !== this.app.settings.get('alwaysRun');
    this.stepPlayer(dir, running, dt);
  }

  /** Turns a step around mid-tile: head back to the tile we were leaving. */
  reversePlayer() {
    const p = this.player;
    const leaving = this.key(p.tx, p.ty);
    p.reverse();
    // The tile we came from is still reserved by us; the one we were heading
    // for becomes the tile we release when this step completes.
    p.prevKey = leaving;
  }

  stepPlayer(dir, running, dt = 0) {
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
    if (warp && (this.entryHeld.has(dir) || this.lockedHold === dir)) {
      // Still holding the key that brought us here (or that just hit a
      // locked door): don't bounce through the doorway.
      if (this.wasMoving || p.pose === 'walk') p.stopWalking();
      this.wasMoving = false;
      return;
    }
    if (warp && !this.warpUnlocked(warp)) {
      this.bump();
      p.stopWalking();
      this.wasMoving = false;
      this.lockedHold = dir;
      if (warp.locked) this.runScript(warp.locked);
      return;
    }
    const blocked = this.app.flags.noclip ? nx < 0 || ny < 0 || nx >= this.model.width || ny >= this.model.height || !!occ : this.isBlocked(nx, ny, p);
    const person = blocked && occ && occ !== p && occ.npc && !occ.moving && !occ.scripted && !this.isSolid(nx, ny) ? occ : null;
    if (person && person !== this.pushing?.npc) this.pushing = { npc: person, since: this.time.now };
    if (!person) this.pushing = null;
    // Never leave the captain stuck behind people: walled in on every side,
    // or pushing on someone standing in a narrow way for a moment, and he
    // squeezes past (they trade places). A placement marked "blocks" is a
    // deliberate gate and only gives way when he is truly boxed in.
    if (person && (this.boxedIn(p) || (!person.blocks && this.time.now - this.pushing.since >= SQUEEZE_PAST_MS))) {
      this.pushing = null;
      this.tradePlaces(person, dir, running ? RUN_MS : WALK_MS, dt);
      return;
    }
    if (blocked) {
      this.bump();
      if (this.wasMoving || p.pose === 'walk') p.stopWalking();
      this.wasMoving = false;
      return;
    }
    this.occupancy.set(this.key(nx, ny), p);
    p.prevKey = this.key(p.tx, p.ty);
    // Continuing: carry the time left over from the last tile. Starting from
    // a standstill: begin one frame in, so the first pixel shows this frame.
    p.beginStep(dir, running ? RUN_MS : WALK_MS, this.wasMoving ? p.carryMs : dt);
    this.wasMoving = true;
  }

  /** True when every tile around the captain is a wall or a person (a doorway counts as a way out). */
  boxedIn(p) {
    return DIRECTIONS.every((d) => {
      const v = DIR_VECTORS[d];
      return this.isBlocked(p.tx + v.x, p.ty + v.y, p) && !this.warpAt(p.tx + v.x, p.ty + v.y);
    });
  }

  /** The captain and a standing NPC swap tiles, both walking (the NPC's brain finishes its step). */
  tradePlaces(npc, dir, ms, dt) {
    const p = this.player;
    const here = this.key(p.tx, p.ty);
    const there = this.key(npc.tx, npc.ty);
    npc.prevKey = there;
    this.occupancy.set(here, npc);
    npc.beginStep(OPPOSITE_DIR[dir], ms);
    p.prevKey = here;
    this.occupancy.set(there, p);
    p.beginStep(dir, ms, this.wasMoving ? p.carryMs : dt);
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
    this.stage.tetherStep(p.tx, p.ty);
    const warp = this.warpAt(p.tx, p.ty);
    if (warp && this.warpUnlocked(warp)) {
      this.takeWarp(warp);
      return;
    }
    this.updateRegions();
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

  /**
   * Map regions ({ id, x, y, w, h } in the map's "regions" list) announce
   * 'region:entered' when the captain walks into them (visit objectives).
   */
  updateRegions() {
    const p = this.player;
    const inside = new Set(this.model.meta.regions.filter((r) => this.inRect(r, p.tx, p.ty)).map((r) => r.id));
    for (const id of inside) {
      if (!this.regionsInside?.has(id)) this.app.bus.emit('region:entered', { region: id, map: this.model.id });
    }
    this.regionsInside = inside;
  }

  inRect(obj, x, y) {
    return x >= obj.x && y >= obj.y && x < obj.x + (obj.w || 1) && y < obj.y + (obj.h || 1);
  }

  warpUnlocked(warp) {
    return !warp.if || evaluateCondition(warp.if, this.session);
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
      if ((obj.type === 'inspect' || obj.type === 'chest') && this.inRect(obj, x, y)) {
        if (obj.type === 'inspect' && obj.if && !evaluateCondition(obj.if, this.session)) continue;
        return { kind: obj.type, obj, x, y };
      }
    }
    const prop = this.propAt.get(this.key(x, y));
    if (prop?.def?.inspect) return { kind: 'prop', prop, x, y };
    const warp = this.warpAt(x, y);
    if (warp?.locked && !this.warpUnlocked(warp)) return { kind: 'locked', warp, x, y };
    return null;
  }

  interact() {
    const t = this.interactionTarget();
    if (!t) return false;
    if (t.kind !== 'npc') this.reach();
    if (t.kind === 'npc') this.talkTo(t.actor);
    else if (t.kind === 'inspect') this.inspectObject(t.obj);
    else if (t.kind === 'chest') this.openChest(t.obj);
    else if (t.kind === 'prop') this.inspectProp(t.prop, t.x, t.y);
    else if (t.kind === 'locked') this.runScript(t.warp.locked);
    return true;
  }

  /** Short hands-forward animation when the captain examines or opens something. */
  reach() {
    this.player.playPose('work', true);
    this.time.delayedCall(420, () => {
      if (this.player.pose === 'work' && !this.player.moving) this.player.playPose('idle');
    });
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
    const fromTile = this.key(actor.tx, actor.ty);
    if (script) await this.runScript(script);
    this.app.bus.emit('npc:talked', { npc: npc.id });
    // The conversation may have sent them off (despawned or respawned), or
    // walked them somewhere on purpose: then leave them as the script did.
    if (!this.sys.isActive() || this.actors.get(actor.id) !== actor) return;
    const brain = actor.brain;
    if (brain) {
      if (this.key(actor.tx, actor.ty) !== fromTile) brain.home = { x: actor.tx, y: actor.ty, facing: actor.facing };
      else if (brain.behavior.type !== 'routine') actor.face(prevFacing);
      if (!['idle', 'walk', 'work'].includes(actor.pose)) brain.pose = actor.pose;
    }
    brain?.resume();
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
    // Above the target tile, or on it when the target is below the captain
    // (so the bubble never sits on his own sprite).
    let my = t.y > this.player.ty ? t.y * TILE_SIZE + TILE_SIZE - 1 : t.y * TILE_SIZE - 2;
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
        // Actors still walking a scripted path (an async move) stay scripted until they arrive.
        for (const a of this.actors.values()) if (!a.scriptMoves) a.scripted = false;
        this.continueStory();
      }
    }
  }

  /**
   * A scene just ended (or the map finished arriving): start the next due
   * story trigger straight away, so the story never leaves a frame of free
   * control between one scene and the next.
   */
  continueStory() {
    // Stays dirty: the frame loop checks again, after any events the ending
    // script's caller still has to send (an inspection counting for a quest).
    this.triggersDirty = true;
    if (this.isBusy() || this.leaving || this.collapsing || !this.sys.isActive()) return;
    this.checkStoryTriggers();
  }

  /**
   * Which edge the dialogue window should use for a line: the one that hides
   * fewer of the people involved (the captain and the speaker). Ties keep
   * the current edge so the window doesn't hop between lines.
   */
  dialogueDock(line, current = 'bottom') {
    if (this.app.cinema?.active || !this.sys.isActive()) return 'bottom';
    const view = this.cameras.main.worldView;
    // While the camera is held on something (a pan), that is what the line
    // is about; otherwise it's the captain.
    const focus = this.cameraFocus;
    const people = [focus ? { feet: focus.y + 18 } : this.player];
    const id = line?.speaker === 'captain' ? 'player' : line?.speaker;
    const speaker = id ? this.actors.get(id) : null;
    if (speaker && speaker !== this.player) people.push(speaker);
    let underBottom = 0;
    let underTop = 0;
    for (const a of people) {
      if (a.feet === undefined && !a?.sprite?.visible) continue;
      const feet = (a.feet ?? a.sprite.y) - view.y;
      if (feet < 0 || feet - 30 > view.height) continue; // off screen
      if (feet > 150) underBottom += 1;
      if (feet - 28 < 82) underTop += 1;
    }
    if (underBottom === underTop) return current;
    return underBottom > underTop ? 'top' : 'bottom';
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

  /** Opens a logbook (the Stench Log) from a script; resolves when it closes. */
  openLog(logId, entryId = null) {
    return new Promise((resolve) => {
      this.pendingResume = resolve;
      this.app.overlay.dialogue.forceClose();
      this.app.overlay.setHint(null);
      this.marker.setVisible(false);
      this.scene.pause();
      this.scene.launch('Menu', { mode: 'log', log: logId, entry: entryId });
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
              const a = this.mapAudio();
              audio.setMusicFilter(a.musicFilter);
              audio.setAmbience(a.ambience);
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

  /** Collision / trigger visualisation toggled from the F2 debug overlay. */
  updateDebugDraw() {
    const f = this.app.flags;
    const key = `${f.collisionView}|${f.showTriggers}|${this.lightKey}`;
    if (key === this.debugKey) return;
    this.debugKey = key;
    this.debugGfx?.destroy();
    this.debugGfx = null;
    if (!f.collisionView && !f.showTriggers) return;
    const g = this.add.graphics().setDepth(90000);
    const T = TILE_SIZE;
    if (f.collisionView) {
      g.fillStyle(0xff3048, 0.35);
      for (let y = 0; y < this.model.height; y++) {
        for (let x = 0; x < this.model.width; x++) if (this.isSolid(x, y)) g.fillRect(x * T, y * T, T, T);
      }
    }
    if (f.showTriggers) {
      const colors = { warp: 0x40a0ff, trigger: 0xffd040, inspect: 0x40ff90, chest: 0xff80ff, spawn: 0xffffff, block: 0xff4040 };
      for (const z of this.fumeField.all()) {
        g.lineStyle(1, z.level === 'center' ? 0xff2020 : z.level === 'dense' ? 0xffa020 : 0xffff60, 0.9);
        g.strokeRect(z.x * T + 1.5, z.y * T + 1.5, (z.w ?? 1) * T - 3, (z.h ?? 1) * T - 3);
      }
      for (const o of this.model.objects) {
        const c = colors[o.type];
        if (c === undefined) continue;
        g.lineStyle(1, c, 0.9);
        g.strokeRect(o.x * T + 0.5, o.y * T + 0.5, (o.w || 1) * T - 1, (o.h || 1) * T - 1);
      }
    }
    this.debugGfx = g;
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
    cam.setScroll(Math.round(sx), Math.round(sy));
  }
}
