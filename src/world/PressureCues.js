import { subjectDef } from '../systems/ship/pressure.js';
import { substance } from '../systems/ship/air.js';

/** The countdown's cue for a subject with none of its own (Brogath's other cues are his Stability's). */
const IMMINENT = { bark: '<r>*RRRMMMBL!!*</>', sfx: 'release_rumble', shake: 0.004 };

/**
 * Overhaul Prompt 8: a Grand Stenchmaster's warnings in the world
 * (docs/gameplay-overhaul/12-pressure-and-eruptions.md). The rules are
 * systems/ship/PressureState.js; nothing here changes them.
 *
 *  - a stage reached on the way up: his cue, in words over him (a bark),
 *    with a sound and, near the top, a small shake. Brogath's are his
 *    Stability's own (StabilityRunner hears the same change), except the
 *    countdown;
 *  - critical or about to blow: he shivers (Brogath's cardboard already
 *    does, by his Stability) and gives a harmless warning puff now and
 *    then (no gas: the eruption is the release);
 *  - an eruption: its sound, a shake and a burst over him.
 * Reduced effects: no shake, no shiver, no puffs or bursts; the words and
 * sounds stay, and the simulation is untouched.
 */
export class PressureCues {
  constructor(scene) {
    this.scene = scene;
    this.app = scene.app;
    this.pr = scene.session.ship.pressure;
    this.puffT = new Map();
    // Calming is done up close: the subject's live tile, not only where the story placed him.
    this.pr.npcAt = (npc) => {
      const a = scene.actors?.get(npc);
      return a ? { x: a.tx, y: a.ty } : null;
    };
    this.subs = [this.app.bus.on('pressure:stage', (e) => this.onStage(e)), this.app.bus.on('pressure:erupted', (e) => this.onErupted(e))];
  }

  destroy() {
    this.subs.forEach((off) => off());
    this.subs = [];
    this.pr.npcAt = null;
    for (const id of Object.keys(this.pr.subjects)) {
      const def = subjectDef(this.scene.content, id);
      const a = def && !def.legacy ? this.scene.actors?.get(def.npc) : null;
      if (a?.shiver) {
        a.shiver = 0;
        a.syncPosition?.();
      }
    }
  }

  actorFor(npc) {
    const a = this.scene.actors?.get(npc);
    return a && a.sprite?.visible !== false ? a : null;
  }

  shake(amount) {
    if (!amount || this.app.settings.reducedEffects()) return;
    const k = this.app.settings.shakeScale?.() ?? 1;
    if (k > 0) this.scene.cameras.main.shake(260, amount * k);
  }

  onStage(e) {
    if (!e.rising) return;
    const def = subjectDef(this.scene.content, e.subject);
    const cue = def?.cues?.[e.stage] ?? (e.stage === 'imminent' ? IMMINENT : null);
    if (!cue) return;
    if (cue.sfx) this.app.audio.sfx(cue.sfx, { volume: 0.6 });
    const a = this.actorFor(def.npc);
    if (a && cue.bark) this.scene.barks.show(a, cue.bark, { duration: 1300 });
    this.shake(cue.shake);
  }

  onErupted(e) {
    if (e.sfx) this.app.audio.sfx(e.sfx, { volume: 0.8 });
    this.shake(e.shake);
    const a = this.actorFor(e.npc);
    if (a && !this.app.settings.reducedEffects()) {
      const tint = substance(this.scene.content, e.gas?.substance)?.color ?? 0x9cc858;
      this.scene.fx.burst('fume', a.px, a.py - 8, { count: e.level === 'catastrophic' ? 10 : e.level === 'major' ? 7 : 4, tint, alpha: 0.6, depth: 70011 });
    }
  }

  update(dt, busy) {
    const reduced = this.app.settings.reducedEffects();
    const now = this.scene.time.now;
    for (const [id, st] of Object.entries(this.pr.subjects)) {
      if (!st.on) continue;
      const def = subjectDef(this.scene.content, id);
      const a = def ? this.actorFor(def.npc) : null;
      if (!a) continue;
      const stage = this.pr.stage(id);
      const hot = stage === 'critical' || stage === 'imminent';
      if (!def.legacy) {
        const was = a.shiver ?? 0;
        a.shiver = !hot || reduced ? 0 : stage === 'imminent' ? Math.round(Math.sin(now / 23) * 1.4) : Math.sin(now / 41) > 0.85 ? 1 : 0;
        if (a.shiver !== was) a.syncPosition?.();
      }
      if (!hot || busy || !def.puff) {
        this.puffT.delete(id);
        continue;
      }
      const t = (this.puffT.get(id) ?? def.puff.every * 1000) - dt;
      if (t > 0) {
        this.puffT.set(id, t);
        continue;
      }
      this.puffT.set(id, def.puff.every * 1000);
      if (def.puff.sfx) this.app.audio.sfx(def.puff.sfx, { volume: 0.4 });
      if (def.puff.bark) this.scene.barks.show(a, def.puff.bark, { duration: 800 });
      if (!reduced) this.scene.fx.burst('fume', a.px, a.py - 6, { count: 2, tint: substance(this.scene.content, def.substance)?.color ?? 0x9cc858, alpha: 0.35, depth: 70011 });
    }
  }
}
