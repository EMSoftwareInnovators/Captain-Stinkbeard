import * as Phaser from 'phaser';
import { TILE_SIZE, SCREEN_WIDTH } from '../config/constants.js';

/**
 * Background life for a map (data: map.ambient): the ship's wake, passing
 * gulls with shadows, galley chimney smoke, a gull perched on the rail that
 * flies off when you get close, and slowly swaying sail shadows.
 */
export class Ambient {
  constructor(scene, list = []) {
    this.scene = scene;
    this.perched = [];
    this.smokers = [];
    this.gullTimer = 3000;
    this.hasGulls = false;
    for (const a of list) this.add(a);
  }

  add(a) {
    const s = this.scene;
    const px = (a.x ?? 0) * TILE_SIZE + TILE_SIZE / 2;
    const py = (a.y ?? 0) * TILE_SIZE + TILE_SIZE / 2;
    switch (a.kind) {
      case 'wake':
        s.add.sprite(px, py, 'fx', 'wake_0').play('fx:wake').setDepth(-2500).setAlpha(0.85);
        break;
      case 'gulls':
        this.hasGulls = true;
        break;
      case 'smoke':
        this.smokers.push({ x: px, y: py - 26, t: 0 });
        break;
      case 'perchedGull': {
        const g = s.add.image(px, py - 6, 'fx', 'gull_perched').setDepth(py + 1);
        this.perched.push({ sprite: g, home: { x: px, y: py - 6 }, tx: a.x, ty: a.y, away: false });
        break;
      }
      case 'sailShadow': {
        const sh = s.add.ellipse(px, py, 150, 34, 0x0a0810, 0.13).setDepth(40000);
        s.tweens.add({ targets: sh, x: px + 5, scaleX: 1.04, duration: 3200 + Math.random() * 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        break;
      }
      default:
        break;
    }
  }

  update(delta, player) {
    const s = this.scene;
    for (const sm of this.smokers) {
      sm.t -= delta;
      if (sm.t > 0) continue;
      sm.t = 420 + Math.random() * 200;
      const puff = s.add.sprite(sm.x + (Math.random() * 4 - 2), sm.y, 'fx', 'smoke_0').setDepth(45000).setAlpha(0.8);
      puff.play('fx:smoke');
      s.tweens.add({
        targets: puff,
        y: sm.y - 40,
        x: puff.x + 14 + Math.random() * 8,
        alpha: 0,
        duration: 2600,
        onComplete: () => puff.destroy(),
      });
    }
    if (this.hasGulls) {
      this.gullTimer -= delta;
      if (this.gullTimer <= 0) {
        this.gullTimer = 7000 + Math.random() * 9000;
        this.spawnGull();
      }
    }
    for (const p of this.perched) {
      if (p.away || !player) continue;
      const d = Math.abs(player.tx - p.tx) + Math.abs(player.ty - p.ty);
      if (d <= 3) this.scare(p);
    }
  }

  spawnGull() {
    const s = this.scene;
    const cam = s.cameras.main;
    const fromLeft = Math.random() < 0.5;
    const y = cam.scrollY + 30 + Math.random() * 140;
    const x0 = cam.scrollX + (fromLeft ? -20 : SCREEN_WIDTH + 20);
    const x1 = cam.scrollX + (fromLeft ? SCREEN_WIDTH + 40 : -40);
    const g = s.add.sprite(x0, y, 'fx', 'gull_0').play('fx:gull').setDepth(60000).setFlipX(!fromLeft);
    const sh = s.add.ellipse(x0, y + 46, 10, 3, 0x0a0810, 0.25).setDepth(-500);
    const duration = 5200 + Math.random() * 2000;
    s.tweens.add({ targets: [g, sh], x: x1, duration, onComplete: () => { g.destroy(); sh.destroy(); } });
    s.tweens.add({ targets: g, y: y - 12, duration: duration / 2, yoyo: true, ease: 'Sine.InOut' });
  }

  scare(p) {
    const s = this.scene;
    p.away = true;
    s.game.app.audio.sfx('squeak', { rate: 0.55, volume: 0.35 });
    const fly = s.add.sprite(p.sprite.x, p.sprite.y, 'fx', 'gull_0').play('fx:gull').setDepth(60000);
    p.sprite.setVisible(false);
    s.tweens.add({ targets: fly, x: fly.x + 120, y: fly.y - 90, duration: 1800, onComplete: () => fly.destroy() });
    s.time.delayedCall(25000, () => {
      p.sprite.setVisible(true);
      p.away = false;
    });
  }
}

export { Phaser };
