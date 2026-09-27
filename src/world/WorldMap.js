import * as Phaser from 'phaser';
import { TILE_SIZE } from '../config/constants.js';
import { PixelCanvas } from '../art/PixelCanvas.js';
import { addTexture } from '../phaser/textures.js';
import { rgba, unpack, pack } from '../art/palette.js';

/**
 * Builds the visual side of a compiled map: background (ocean or void),
 * tile layers, animated tiles and the baked lighting overlay.
 */
export class WorldMap {
  constructor(scene, model, tileset) {
    this.scene = scene;
    this.model = model;
    this.tileset = tileset;
    this.widthPx = model.width * TILE_SIZE;
    this.heightPx = model.height * TILE_SIZE;
    this.buildBackground();
    this.buildLayers();
    this.setupTileAnimations();
  }

  buildBackground() {
    const s = this.scene;
    if (this.model.meta.background === 'ocean') {
      const pad = 64;
      this.oceanPad = pad;
      this.bobTime = 0;
      this.ocean = s.add
        .tileSprite(-pad, -pad, this.widthPx + pad * 2, this.heightPx + pad * 2, 'ocean', 0)
        .setOrigin(0)
        .setDepth(-3000);
      this.oceanFrame = 0;
      s.time.addEvent({
        delay: 360,
        loop: true,
        callback: () => {
          this.oceanFrame = (this.oceanFrame + 1) % 4;
          this.ocean.setFrame(this.oceanFrame);
        },
      });
    }
  }

  buildLayers() {
    const s = this.scene;
    const m = this.model;
    this.tilemap = s.make.tilemap({ tileWidth: TILE_SIZE, tileHeight: TILE_SIZE, width: m.width, height: m.height });
    const ts = this.tilemap.addTilesetImage(this.tileset.id, `tiles_${this.tileset.id}`, TILE_SIZE, TILE_SIZE, 0, 0, 0);
    const toRows = (arr) => Array.from({ length: m.height }, (_, y) => Array.from(arr.slice(y * m.width, (y + 1) * m.width)));
    this.ground = this.tilemap.createBlankLayer('ground', ts);
    this.ground.putTilesAt(toRows(m.ground), 0, 0);
    this.ground.setDepth(-1000);
    if (m.overhead.some((v) => v >= 0)) {
      this.overhead = this.tilemap.createBlankLayer('overhead', ts);
      this.overhead.putTilesAt(toRows(m.overhead), 0, 0);
      this.overhead.setDepth(50000);
    }
  }

  setupTileAnimations() {
    const anims = this.tileset.animations || {};
    const index = new Map(this.tileset.frames.map((f, i) => [f, i]));
    this.tileAnims = [];
    for (const def of Object.values(anims)) {
      const frames = def.frames.map((f) => index.get(f));
      const cells = [];
      this.ground.forEachTile((tile) => {
        const at = frames.indexOf(tile.index);
        if (at >= 0) cells.push({ tile, offset: at });
      });
      if (cells.length) this.tileAnims.push({ frames, cells, ms: def.ms, t: 0, step: 0 });
    }
  }

  update(delta) {
    for (const a of this.tileAnims) {
      a.t += delta;
      if (a.t < a.ms) continue;
      a.t -= a.ms;
      a.step += 1;
      for (const c of a.cells) c.tile.index = a.frames[(a.step + c.offset) % a.frames.length];
    }
    if (this.ocean) {
      this.ocean.tilePositionY -= delta * 0.004;
      // The swell: the sea rises and falls around a steady ship (map "bob" = pixels).
      // Moving the water rather than the camera keeps the deck and the captain still.
      const amp = this.model.meta.bob ?? 0;
      if (amp) {
        this.bobTime += delta;
        this.ocean.y = -this.oceanPad + Math.round(Math.sin((this.bobTime / 2600) * Math.PI * 2) * amp * 2);
      }
    }
  }

  /**
   * Bakes a light map (ambient colour with posterised pools of light) and
   * lays it over the scene with MULTIPLY blending. Returns glow positions so
   * the scene can add flickering additive glows on top.
   */
  buildLighting(lights) {
    const lighting = this.model.meta.lighting;
    if (!lighting) return [];
    const s = this.scene;
    const scale = 2; // light map at half resolution, scaled up
    const w = Math.ceil(this.widthPx / scale);
    const h = Math.ceil(this.heightPx / scale);
    const pc = new PixelCanvas(w, h);
    const amb = unpack(rgba(lighting.ambient ?? '#808080'));
    const bands = [1, 0.72, 0.45, 0.2];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = amb.r;
        let g = amb.g;
        let b = amb.b;
        for (const l of lights) {
          const dx = (x * scale - l.x) / l.radius;
          const dy = (y * scale - l.y) / (l.radius * 0.8);
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d >= 1) continue;
          // posterise with a little ordered dithering at band edges
          let band = Math.floor(d * 4);
          if (band < 3 && d * 4 - band > 0.75 && (x + y) % 2 === 0) band += 1;
          const t = bands[Math.min(3, band)];
          const lc = unpack(rgba(l.color ?? '#fff0d0'));
          r = Math.max(r, Math.round(amb.r + (lc.r - amb.r) * t));
          g = Math.max(g, Math.round(amb.g + (lc.g - amb.g) * t));
          b = Math.max(b, Math.round(amb.b + (lc.b - amb.b) * t));
        }
        pc.px[y * w + x] = pack(r, g, b, 255);
      }
    }
    const key = `lightmap_${this.model.id}`;
    addTexture(s, key, { canvas: pc });
    this.lightImage = s.add.image(0, 0, key).setOrigin(0).setScale(scale).setDepth(70000).setBlendMode(Phaser.BlendModes.MULTIPLY);
    return lights;
  }
}
