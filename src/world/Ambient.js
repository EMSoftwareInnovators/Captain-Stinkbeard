import * as Phaser from 'phaser';
import { TILE_SIZE, SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';
import { evaluateCondition } from '../systems/conditions/conditions.js';

/**
 * Background life for a map (data: map.ambient): the ship's wake, passing
 * gulls with shadows, galley chimney smoke, a gull perched on the rail that
 * flies off when you get close, and slowly swaying sail shadows. Later
 * chapters add rain, sails that puff up on their own, a rat in a nose-cloth
 * peeking out of its hole, odour drifting off the captain's beard. Story
 * Phase 9: fins circling a patch of open water (a reef, a lure, a lagoon).
 *
 * Every entry may carry "if": it comes and goes with the story, live.
 */
export class Ambient {
  constructor(scene, list = []) {
    this.scene = scene;
    this.session = scene.game.app.session;
    this.entries = list.map((def) => ({ def, on: false, handles: [], t: def.kind === 'voice' ? 1200 : 0, i: 0 }));
    this.gullTimer = 3000;
    this.refresh();
  }

  /** Switches entries on and off to match the story (called when flags change). */
  refresh() {
    for (const e of this.entries) {
      const on = !e.def.if || evaluateCondition(e.def.if, this.session);
      if (on === e.on) continue;
      e.on = on;
      if (on) this.enable(e);
      else this.disable(e);
    }
  }

  enable(e) {
    const s = this.scene;
    const a = e.def;
    const px = (a.x ?? 0) * TILE_SIZE + TILE_SIZE / 2;
    const py = (a.y ?? 0) * TILE_SIZE + TILE_SIZE / 2;
    switch (a.kind) {
      case 'wake':
        e.handles.push(s.add.sprite(px, py, 'fx', 'wake_0').play('fx:wake').setDepth(-2500).setAlpha(0.85));
        break;
      case 'perchedGull': {
        const g = s.add.image(px, py - 6, 'fx', 'gull_perched').setDepth(py + 1);
        e.handles.push(g);
        e.perch = { sprite: g, tx: a.x, ty: a.y, away: false };
        break;
      }
      case 'sailShadow': {
        const sh = s.add.ellipse(px, py, 150, 34, 0x0a0810, 0.13).setDepth(40000);
        s.tweens.add({ targets: sh, x: px + 5, scaleX: 1.04, duration: 3200 + Math.random() * 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        e.handles.push(sh);
        break;
      }
      case 'smoke':
        e.t = 0;
        break;
      case 'glitter':
        // Treasure catching the light: sparkles at random spots in an area.
        e.t = 0;
        break;
      case 'voice':
        // Someone (or something) calling out from a spot, now and then:
        // { kind: 'voice', x, y, lines: [...], every: [min, max] ms, sfx }.
        e.t = a.delay ?? 1200;
        break;
      case 'rain':
        e.drops = [];
        e.t = 0;
        break;
      case 'fins': {
        // { kind: 'fins', x, y, rx, ry, count, speed }: fins going round an
        // ellipse (tiles) in open water, evenly spaced, slightly wobbling.
        const n = a.count ?? 3;
        e.fins = [];
        for (let i = 0; i < n; i++) {
          const img = s.add.sprite(px, py, 'stage', 'fin_h_0').setOrigin(0.5, 0.5).setDepth(-2350).setAlpha(0.95);
          e.handles.push(img);
          e.fins.push({ img, phase: (i / n) * Math.PI * 2 + Math.random() * 0.4, t: Math.random() * 1000 });
        }
        break;
      }
      default:
        e.t = a.delay ?? this.nextDelay(a);
    }
  }

  disable(e) {
    for (const h of e.handles) {
      this.scene.tweens.killTweensOf(h);
      h.destroy();
    }
    e.handles = [];
    for (const d of e.drops ?? []) d.destroy();
    e.drops = null;
    e.perch = null;
    e.fins = null;
    if (e.rat) {
      e.rat.destroy();
      e.rat = null;
    }
  }

  updateFins(e, delta) {
    const a = e.def;
    const cx = ((a.x ?? 0) + 0.5) * TILE_SIZE;
    const cy = ((a.y ?? 0) + 0.5) * TILE_SIZE;
    const rx = (a.rx ?? 2) * TILE_SIZE;
    const ry = (a.ry ?? 1.2) * TILE_SIZE;
    const w = (a.speed ?? 0.6) / 1000;
    for (const f of e.fins ?? []) {
      f.phase += w * delta;
      f.t += delta;
      const x = cx + Math.cos(f.phase) * rx + Math.sin(f.t / 380) * 1.5;
      const y = cy + Math.sin(f.phase) * ry;
      const dx = -Math.sin(f.phase) * rx;
      const dy = Math.cos(f.phase) * ry;
      const n = Math.floor(f.t / 260) % 2;
      f.img.setPosition(x, y);
      if (Math.abs(dx) >= Math.abs(dy)) f.img.setFrame(`fin_h_${n}`).setFlipX(dx < 0);
      else f.img.setFrame(`fin_v_${n}`).setFlipX(false);
    }
  }

  nextDelay(a, fallback = [4000, 9000]) {
    const [min, max] = a.every ?? fallback;
    return min + Math.random() * (max - min);
  }

  update(delta, player) {
    const busy = this.scene.isBusy?.();
    let gulls = false;
    for (const e of this.entries) {
      if (!e.on) continue;
      switch (e.def.kind) {
        case 'glitter': this.updateGlitter(e, delta); break;
        case 'voice': if (!busy) this.updateVoice(e, delta); break;
        case 'smoke': this.updateSmoke(e, delta); break;
        case 'gulls': gulls = true; break;
        case 'perchedGull': this.updatePerch(e, player); break;
        case 'rain': this.updateRain(e, delta); break;
        case 'sailPuff': this.updateSailPuff(e, delta); break;
        case 'ratPeek': if (!busy) this.updateRat(e, delta); break;
        case 'odorTrail': this.updateOdor(e, delta); break;
        case 'fins': this.updateFins(e, delta); break;
        default: break;
      }
    }
    if (gulls) {
      this.gullTimer -= delta;
      if (this.gullTimer <= 0) {
        this.gullTimer = 7000 + Math.random() * 9000;
        this.spawnGull();
      }
    }
  }

  updateGlitter(g, delta) {
    const a = g.def;
    g.t -= delta;
    if (g.t > 0) return;
    g.t = (a.every ?? 380) * (0.6 + Math.random() * 0.8);
    const s = this.scene;
    const x = (a.x + Math.random() * (a.w ?? 1)) * TILE_SIZE;
    const y = (a.y + Math.random() * (a.h ?? 1)) * TILE_SIZE;
    const sp = s.add.sprite(x, y, 'fx', 'sparkle_0').setDepth(70005).setBlendMode('ADD').setTint(0xfff0a0);
    sp.play('fx:sparkle');
    sp.once('animationcomplete', () => sp.destroy());
  }

  updateVoice(v, delta) {
    const s = this.scene;
    const a = v.def;
    v.t -= delta;
    if (v.t > 0) return;
    const [min, max] = a.every ?? [3500, 6000];
    v.t = min + Math.random() * (max - min);
    const line = a.lines[Math.min(v.i, a.lines.length - 1)];
    v.i = v.i + 1 >= a.lines.length && a.loop !== false ? (a.loopFrom ?? 0) : v.i + 1;
    const at = { x: a.x * TILE_SIZE + TILE_SIZE / 2, y: a.y * TILE_SIZE };
    s.barks?.show(at, line, { duration: a.duration ?? 2200, shout: a.shout ?? true });
    if (a.sfx) {
      const cam = s.cameras.main;
      const pan = Math.max(-1, Math.min(1, (at.x - (cam.scrollX + 160)) / 200));
      s.game.app.audio.sfx(a.sfx, { pan, volume: a.volume ?? 0.8 });
    }
  }

  updateSmoke(sm, delta) {
    const s = this.scene;
    const a = sm.def;
    sm.t -= delta;
    if (sm.t > 0) return;
    sm.t = (a.every ?? 420) + Math.random() * 200;
    const x = (a.x ?? 0) * TILE_SIZE + TILE_SIZE / 2;
    const y = (a.y ?? 0) * TILE_SIZE + TILE_SIZE / 2 - (a.rise ?? 26);
    const puff = s.add.sprite(x + (Math.random() * 4 - 2), y, 'fx', 'smoke_0').setDepth(45000).setAlpha(a.alpha ?? 0.8);
    // "tint": a cannon mouth breathing out yellow instead of grey.
    if (a.tint) puff.setTint(parseInt(a.tint.replace('#', ''), 16));
    puff.play('fx:smoke');
    s.tweens.add({
      targets: puff,
      y: y - 40,
      x: puff.x + 14 + Math.random() * 8,
      alpha: 0,
      duration: 2600,
      onComplete: () => puff.destroy(),
    });
  }

  updatePerch(e, player) {
    const p = e.perch;
    if (!p || p.away || !player) return;
    const d = Math.abs(player.tx - p.tx) + Math.abs(player.ty - p.ty);
    if (d <= 3) this.scare(p);
  }

  /** Rain streaks across the screen (screen space), plus rings on the deck. */
  updateRain(e, delta) {
    const s = this.scene;
    const a = e.def;
    const cam = s.cameras.main;
    const reduced = s.game.app.settings.reducedEffects();
    const want = Math.round((a.density ?? 40) * (reduced ? 0.4 : 1));
    while (e.drops.length < want) {
      const d = s.add.rectangle(0, 0, 1, 5 + Math.floor(Math.random() * 3), 0xb8c8e8, 0.55).setOrigin(0.5, 0).setDepth(76000);
      d.vy = 190 + Math.random() * 60;
      d.x = cam.scrollX + Math.random() * SCREEN_WIDTH;
      d.y = cam.scrollY + Math.random() * SCREEN_HEIGHT;
      e.drops.push(d);
    }
    const sec = delta / 1000;
    for (const d of e.drops) {
      d.y += d.vy * sec;
      d.x -= d.vy * 0.18 * sec;
      if (d.y > cam.scrollY + SCREEN_HEIGHT || d.x < cam.scrollX - 4) {
        if (Math.random() < 0.35 && !reduced) this.splashRing(d.x, d.y - Math.random() * 60);
        d.x = cam.scrollX + Math.random() * (SCREEN_WIDTH + 30);
        d.y = cam.scrollY - Math.random() * 30;
      }
    }
  }

  splashRing(x, y) {
    const s = this.scene;
    const r = s.add.ellipse(x, y, 2, 1, 0xd0e0f8, 0.5).setDepth(y + 1);
    s.tweens.add({ targets: r, scaleX: 3, scaleY: 3, alpha: 0, duration: 380, onComplete: () => r.destroy() });
  }

  /** A sail swells on its own ("stored stink"): the rigging above puffs out. */
  updateSailPuff(e, delta) {
    const s = this.scene;
    const a = e.def;
    e.t -= delta;
    if (e.t > 0) return;
    e.t = this.nextDelay(a, [7000, 14000]);
    const target = s.props.find((p) => p.visible && (p.uid === a.prop || p.prop === a.prop));
    if (!target) return;
    const img = target.sprite;
    s.tweens.add({ targets: img, scaleX: 1.07, scaleY: 1.04, duration: 260, yoyo: true, hold: 420, ease: 'Sine.Out' });
    s.game.app.audio.sfx('sail_puff', { volume: a.volume ?? 0.45 });
    s.fx.burst('fume', img.x, img.y - img.height * 0.4, { count: 3, depth: 56000 });
  }

  /** The masked rat pokes its head out of its hole, sniffs, and ducks back. */
  updateRat(e, delta) {
    const s = this.scene;
    const a = e.def;
    e.t -= delta;
    if (e.t > 0 || e.rat) return;
    e.t = this.nextDelay(a, [9000, 16000]);
    const x = a.x * TILE_SIZE + TILE_SIZE / 2;
    const y = (a.y + 1) * TILE_SIZE;
    const rat = s.add.sprite(x, y + 4, 'stage', 'rat_mask_0').setOrigin(0.5, 1).setDepth(y + 2).setAlpha(0);
    e.rat = rat;
    s.tweens.chain({
      targets: rat,
      tweens: [
        { y, alpha: 1, duration: 260, ease: 'Sine.Out' },
        { y, duration: 500, onStart: () => rat.setFrame('rat_mask_1') },
        { y, duration: 500, onStart: () => rat.setFrame('rat_mask_2') },
        { y: y + 6, alpha: 0, duration: 240, ease: 'Sine.In', onStart: () => rat.setFrame('rat_mask_0') },
      ],
      onComplete: () => {
        rat.destroy();
        if (e.rat === rat) e.rat = null;
      },
    });
    const cam = s.cameras.main;
    const pan = Math.max(-1, Math.min(1, (x - (cam.scrollX + 160)) / 200));
    s.game.app.audio.sfx('squeak', { rate: 1.3, volume: 0.35, pan });
  }

  /**
   * Odour lines drifting off someone (the captain's beard, since it happened).
   * Story Phase 8: "fx" picks the particle ("suitpuff": the Grand Stenchmaster
   * Suit letting out some of what it has soaked up), "sfx" adds a sound, and
   * "whenMoving" only lets one out when the wearer shifts (the suit exhales
   * when disturbed), never more often than "every"; "idleEvery" lets one out
   * now and then even when he sits still. Always a single small burst.
   */
  updateOdor(e, delta) {
    const s = this.scene;
    const a = e.def;
    e.t -= delta;
    if (e.t > 0) return;
    const actor = a.actor === 'player' || !a.actor ? s.player : s.actors.get(a.actor);
    if (!actor?.sprite?.visible) return;
    if (a.whenMoving) {
      const at = `${actor.tx},${actor.ty},${actor.facing}`;
      const moved = e.lastAt !== undefined && e.lastAt !== at;
      e.lastAt = at;
      e.idleT = (e.idleT ?? this.nextDelay({ every: a.idleEvery ?? [0, 0] })) - delta;
      if (!moved && !(a.idleEvery && e.idleT <= 0)) return;
      e.idleT = a.idleEvery ? this.nextDelay({ every: a.idleEvery }) : 0;
    }
    e.t = this.nextDelay(a, [2600, 5200]);
    const x = actor.sprite.x + (a.dx ?? 3);
    const y = actor.sprite.y - (a.dy ?? 30);
    s.fx.burst(a.fx ?? 'odor', x, y, { count: a.count ?? 1, alpha: a.alpha ?? 0.55 });
    if (a.sfx) {
      const cam = s.cameras.main;
      const pan = Math.max(-1, Math.min(1, (x - (cam.scrollX + 160)) / 200));
      s.game.app.audio.sfx(a.sfx, { pan, volume: a.volume ?? 0.35, rate: 0.9 + Math.random() * 0.2 });
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
      if (!p.sprite.active) return;
      p.sprite.setVisible(true);
      p.away = false;
    });
  }
}

export { Phaser };
