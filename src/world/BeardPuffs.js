import { evaluateCondition } from '../systems/conditions/conditions.js';
import { beardPuffDef, puffReaction } from '../systems/beard.js';
import { between } from '../systems/hazards/sharkstorm.js';

/**
 * Story Phase 17: the captain's beard puffs (systems/beard.js, "puffs" in
 * data/story/beard.json). A little haze at his chin, a short sound, the
 * nearest person within a few tiles reacting (or the captain, to himself),
 * and on every few puffs a brief tint of the screen that fades straight back.
 * Only while the captain can move; never during a scene. Reduced effects:
 * no tint.
 */
export class BeardPuffs {
  constructor(scene) {
    this.scene = scene;
    this.def = beardPuffDef(scene.content);
    this.t = this.def ? between(this.def.every ?? [18000, 34000]) * 0.5 : 0;
    this.tint = null;
  }

  destroy() {
    this.tint?.destroy();
    this.tint = null;
  }

  active() {
    const d = this.def;
    return !!d && evaluateCondition(d.if ?? { flag: 'beard_puffing' }, this.scene.session);
  }

  update(dt, busy) {
    if (!this.def || busy || !this.active()) return;
    this.t -= dt;
    if (this.t > 0) return;
    this.t = between(this.def.every ?? [18000, 34000]);
    this.puff();
  }

  /** One puff now ("big": a bigger cloud). `line` replaces the reaction. Returns the reaction said, if any. */
  puff(mode = 'small', line = null) {
    const d = this.def;
    const scene = this.scene;
    const p = scene.player;
    if (!d || !p) return null;
    const story = scene.session.story;
    const n = story.getVar(d.countVar ?? 'beard_puffs', 0);
    story.setVar(d.countVar ?? 'beard_puffs', n + 1);
    const x = p.sprite.x + (p.facing === 'left' ? -4 : p.facing === 'right' ? 4 : 0);
    const y = p.sprite.y - 22;
    scene.fx.burst('odor', x, y, { count: mode === 'big' ? 12 : 5, up: 0.6 });
    scene.fx.burst('fume', x, y + 2, { count: mode === 'big' ? 6 : 2 });
    const sounds = Array.isArray(d.sfx) ? d.sfx : [d.sfx ?? 'beard_puff'];
    scene.app.audio.sfx(sounds[n % sounds.length], { volume: mode === 'big' ? 0.7 : 0.45 });
    // A brief exposure: a light tint, gone again in under a second.
    const ex = d.exposure;
    const reduced = scene.app.settings?.reducedEffects?.();
    if (ex && !reduced && (mode === 'big' || (n + 1) % (ex.every ?? 3) === 0)) this.flashTint(ex);
    // Somebody nearby reacts (the nearest within four tiles), or the captain mutters.
    let who = null;
    let best = 5;
    for (const a of scene.actors?.values?.() ?? []) {
      if (a === p || !a.sprite?.visible || a.kind === 'player') continue;
      const dd = Math.abs(a.tx - p.tx) + Math.abs(a.ty - p.ty);
      if (dd < best) {
        best = dd;
        who = a;
      }
    }
    const text = line ?? (who ? puffReaction(d, who.npc?.id ?? who.id, n) : null) ?? (d.captain?.length ? d.captain[n % d.captain.length] : null);
    if (text) scene.barks.show(who ?? p, text, { duration: 2200 });
    return text;
  }

  flashTint(ex) {
    const scene = this.scene;
    const cam = scene.cameras.main;
    this.tint?.destroy();
    const r = scene.add.rectangle(cam.scrollX, cam.scrollY, cam.width, cam.height, Number.parseInt((ex.tint ?? '#a89868').slice(1), 16), ex.alpha ?? 0.16)
      .setOrigin(0).setDepth(90000).setScrollFactor(0);
    this.tint = r;
    scene.tweens.add({ targets: r, alpha: 0, duration: ex.ms ?? 700, onComplete: () => {
      r.destroy();
      if (this.tint === r) this.tint = null;
    } });
  }
}
