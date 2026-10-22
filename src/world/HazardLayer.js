import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';

/**
 * What the ship's emergencies look like in the room the captain is in
 * (docs/gameplay-overhaul/10-flooding-and-fire.md, "UI and controls"):
 * a blue tint and a bobbing waterline that rise with the flood stage, an
 * orange flicker, embers and smoke that grow with the fire, and (Prompt 7,
 * docs/gameplay-overhaul/11-atmosphere-and-ventilation.md) a haze in the
 * colour of the worst gas in the room's air, thicker as the air gets worse,
 * with a few drifting wisps. Presentation only: it reads the state each time
 * it changes (and after a load or a checkpoint restore), never drives it,
 * and draws a fixed handful of screen-space shapes (no per-tile water or
 * gas, no unbounded particles). The words for all of it are on the HUD.
 */
const WATER_ALPHA = { dry: 0, damp: 0.04, shallow: 0.08, serious: 0.13, critical: 0.18, flooded: 0.24 };
const WATER_LINE = { dry: 0, damp: 0, shallow: 10, serious: 26, critical: 44, flooded: 60 };
const FIRE_ALPHA = { out: 0, smouldering: 0.04, burning: 0.08, blazing: 0.12, inferno: 0.16 };
const EMBER_MS = { smouldering: 900, burning: 600, blazing: 380, inferno: 260 };
const AIR_ALPHA = { clean: 0, hazy: 0.05, foul: 0.1, toxic: 0.16, deadly: 0.22 };
const WISP_MS = { hazy: 0, foul: 1400, toxic: 900, deadly: 600 };

export class HazardLayer {
  constructor(scene) {
    this.scene = scene;
    const D = 90000;
    this.water = scene.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x2c5f94, 0).setOrigin(0).setScrollFactor(0).setDepth(D);
    this.line = scene.add.rectangle(0, SCREEN_HEIGHT, SCREEN_WIDTH, 1, 0x9cc8f0, 0).setOrigin(0).setScrollFactor(0).setDepth(D + 1);
    this.fire = scene.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0xe8641c, 0).setOrigin(0).setScrollFactor(0).setDepth(D + 2);
    this.air = scene.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x8c8c8c, 0).setOrigin(0).setScrollFactor(0).setDepth(D + 3);
    this.state = { water: 'dry', fire: 'out', air: 'clean', airColor: 0x8c8c8c };
    this.wispMs = 0;
    this.t = 0;
    this.emberMs = 0;
    this.smokeMs = 0;
  }

  /** Reads the room's water and fire (call when the hazards change, a room is entered, a save loads). */
  sync(room) {
    const hz = this.scene.session.ship.hazards;
    const w = hz.waterIn(room);
    const f = hz.fireIn(room);
    const a = this.scene.session.ship.air.airIn(room);
    const color = a.worst?.color ? Number.parseInt(a.worst.color.slice(1), 16) : 0x8c8c8c;
    this.state = { water: w.units > 0 ? w.stage.id : 'dry', fire: f ? f.stage.id : 'out', air: a.quality.id, airColor: color };
    this.water.setFillStyle(0x2c5f94, WATER_ALPHA[this.state.water] ?? 0);
    this.line.setAlpha(WATER_LINE[this.state.water] ? 0.6 : 0);
    this.air.setFillStyle(color, AIR_ALPHA[this.state.air] ?? 0);
  }

  update(dt, { reduced = false } = {}) {
    this.t += dt;
    const lineH = WATER_LINE[this.state.water] ?? 0;
    if (lineH) this.line.y = Math.round(SCREEN_HEIGHT - lineH + Math.sin(this.t / 420) * 1.5);
    const fa = FIRE_ALPHA[this.state.fire] ?? 0;
    // The flicker steps (no smooth strobing), and holds still with reduced effects.
    this.fire.setFillStyle(0xe8641c, fa ? (reduced ? fa : fa * (0.75 + 0.25 * (Math.floor(this.t / 120) % 3) / 2)) : 0);
    const cam = this.scene.cameras.main;
    // Wisps of the room's gas drifting by (none with reduced effects: the haze and the HUD still say it).
    const wisp = WISP_MS[this.state.air] ?? 0;
    if (wisp && !reduced) {
      this.wispMs -= dt;
      if (this.wispMs <= 0) {
        this.wispMs = wisp;
        this.scene.fx.burst('fume', cam.scrollX + 20 + Math.random() * (SCREEN_WIDTH - 40), cam.scrollY + 40 + Math.random() * (SCREEN_HEIGHT - 80), { count: 2, tint: this.state.airColor, alpha: 0.35, depth: 70011 });
      }
    }
    if (!fa || reduced) return;
    this.emberMs -= dt;
    if (this.emberMs <= 0) {
      this.emberMs = EMBER_MS[this.state.fire] ?? 900;
      this.scene.fx.burst('embers', cam.scrollX + 20 + Math.random() * (SCREEN_WIDTH - 40), cam.scrollY + SCREEN_HEIGHT - 30 - Math.random() * 80, { count: 2 });
    }
    this.smokeMs -= dt;
    if (this.smokeMs <= 0) {
      this.smokeMs = 1600;
      this.scene.fx.burst('fume', cam.scrollX + 30 + Math.random() * (SCREEN_WIDTH - 60), cam.scrollY + 30 + Math.random() * 60, { count: 2, tint: 0x3a3438, alpha: 0.4, depth: 70012 });
    }
  }

  destroy() {
    this.water.destroy();
    this.line.destroy();
    this.fire.destroy();
    this.air.destroy();
  }
}
