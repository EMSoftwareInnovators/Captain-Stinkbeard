import { stabilityDef, readStability, writePressure, stateFor, stageIndex, incidentDef, stepIncident } from '../systems/stability.js';

/**
 * Story Phase 14: Brogath Stability, in the world. The rules are
 * systems/stability.js; this is the part that needs a clock and a room:
 *
 *  - a running incident (a napkin fluttering, a sash advert) raises the
 *    pressure while the captain has control, never during a scene. The live
 *    value is kept here and written to the saved variable only when it
 *    crosses a warning stage (and before any script reads it), so the story
 *    doesn't refresh every frame;
 *  - at the top, the incident's eruption script runs (comedic and safe),
 *    after which the pressure drops back and the incident carries on until
 *    it's secured;
 *  - the BASHFULNESS meter (OverlayScene.setStability): hidden in ordinary
 *    play, shown once the pressure passes the subject's "reveal" level, while
 *    an incident runs, while he's angry, or when a scene asks for it;
 *  - each warning stage has its sound (and a bark over him if he's here),
 *    with a cooldown so a long incident doesn't drone;
 *  - the cardboard shivers when he's pressurized (a pixel, more when
 *    critical; nothing with Reduced effects) and creaks now and then while
 *    he's in the room and the captain has control.
 *
 * Nothing here erupts by itself outside an incident a scene started.
 */
export class StabilityRunner {
  constructor(scene, subject = 'brogath') {
    this.scene = scene;
    this.app = scene.app;
    this.session = scene.session;
    const raw = scene.content.stability?.get?.(subject);
    this.def = raw ? stabilityDef({ id: subject, ...raw }) : null;
    this.live = null;
    this.cool = new Map();
    this.creakT = 9000 + Math.random() * 9000;
    this.erupting = false;
    this.subs = this.def
      ? [
        this.app.bus.on('stability:sync', ({ subject: s }) => s === this.def.id && this.commit()),
        this.app.bus.on('stability:changed', (e) => e.subject === this.def.id && this.onChanged(e)),
      ]
      : [];
  }

  destroy() {
    this.commit();
    this.subs.forEach((off) => off());
    this.subs = [];
    this.app.overlay?.setStability(null);
    const a = this.actor;
    if (a) a.shiver = 0;
  }

  get actor() {
    return this.def ? this.scene.actors.get(this.def.actor ?? this.def.id) : null;
  }

  /** Writes a live (rising) pressure back to the story. */
  commit() {
    if (this.live === null || !this.def) return;
    const v = this.live;
    this.live = null;
    writePressure(this.def, this.session, v);
  }

  /** A command moved the pressure: the saved value is the truth now; a stage reached plays its cue. */
  onChanged(e) {
    this.live = null;
    if (e.stageTo !== undefined && e.stageTo > e.stageFrom) this.stageCue(e.stageTo, true);
  }

  stageCue(index, force = false) {
    const st = this.def.stages[index];
    if (!st) return;
    const now = this.scene.time.now;
    const until = this.cool.get(index) ?? 0;
    if (!force && now < until) return;
    this.cool.set(index, now + (st.cooldownMs ?? 6000));
    if (st.sfx) this.app.audio.sfx(st.sfx, { volume: st.volume ?? 0.6 });
    const a = this.actor;
    if (a && st.bark && a.sprite?.visible !== false) this.scene.barks.show(a, st.bark, { duration: 1300 });
    if (st.shake && !this.app.settings.reducedEffects()) {
      const k = this.app.settings.shakeScale?.() ?? 1;
      if (k > 0) this.scene.cameras.main.shake(260, st.shake * k);
    }
  }

  update(dt, busy) {
    const def = this.def;
    if (!def) return;
    const s = this.session;
    const st = readStability(def, s);
    let pressure = this.live ?? st.pressure;
    const control = !busy && !this.scene.leaving && !this.scene.collapsing && !this.erupting;
    if (st.incident && control) {
      const inc = incidentDef(def, st.incident);
      const before = pressure;
      const r = stepIncident(def, inc, pressure, dt / 1000);
      pressure = r.live;
      this.live = pressure;
      const s0 = stageIndex(def, before);
      const s1 = stageIndex(def, pressure);
      if (s1 !== s0) {
        writePressure(def, s, pressure);
        this.live = pressure;
        if (s1 > s0) this.stageCue(s1);
      }
      if (r.erupt) this.erupt(inc);
    } else if (this.live !== null && !control) this.commit();

    // The meter.
    const angry = st.angry;
    const forced = st.meter;
    const show = forced === 'show' || (forced !== 'hide' && (pressure >= def.reveal || angry || !!st.incident));
    const overlay = this.app.overlay;
    if (overlay) {
      if (show && !this.app.cinema?.busy) {
        overlay.setStability({
          pressure, min: def.min, max: def.max, state: stateFor(def, pressure, angry), stage: stageIndex(def, pressure),
          stages: def.stages, label: angry ? def.angryLabel ?? 'WRATH' : def.label ?? 'BASHFULNESS', incident: !!st.incident,
        });
      } else overlay.setStability(null);
    }

    // The cardboard.
    const a = this.actor;
    if (!a) return;
    const state = stateFor(def, pressure, angry);
    const calm = this.app.settings.reducedEffects();
    if (calm) a.shiver = 0;
    else if (state === 'CRITICAL' || angry) a.shiver = Math.round(Math.sin(this.scene.time.now / 23) * 1.4);
    else if (state === 'PRESSURIZED') a.shiver = Math.sin(this.scene.time.now / 41) > 0.85 ? 1 : 0;
    else a.shiver = 0;
    if (a.shiver !== 0 || a.lastShiver) a.syncPosition();
    a.lastShiver = a.shiver;
    // A creak now and then while he's in the room and nothing's happening.
    if (control && a.sprite?.visible !== false) {
      this.creakT -= dt;
      if (this.creakT <= 0) {
        this.creakT = 14000 + Math.random() * 16000;
        const sfx = def.creak ?? 'cardboard_creak';
        if (sfx && this.scene.content.sfx.has?.(sfx)) this.app.audio.sfx(sfx, { volume: 0.25 });
      }
    }
  }

  /** The top: the incident's (safe, comedic) eruption, then the pressure falls back and it goes on. */
  async erupt(inc) {
    if (this.erupting) return;
    this.erupting = true;
    this.live = null;
    writePressure(this.def, this.session, this.def.max);
    try {
      await this.scene.runScript(inc.erupt);
    } finally {
      this.erupting = false;
      const now = readStability(this.def, this.session);
      // Still going (the napkin is still out): it carries on from lower down.
      if (now.incident && now.pressure >= this.def.max) writePressure(this.def, this.session, inc.afterErupt ?? this.def.afterErupt);
    }
  }
}
