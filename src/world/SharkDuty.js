import { TILE_SIZE, SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';
import { dutyData, dutySessionFor, DutyPlan, waveSpot } from '../systems/hazards/sharkDuty.js';
import { splitObjectiveRef } from '../systems/conditions/conditions.js';

/**
 * Runs Shark Duty on the deck while the captain has control (rules in
 * systems/hazards/sharkDuty.js). Sharks rear up at rail sections, marked in
 * red; the captain walks over, faces the rail and presses Confirm for a
 * quick shove (the repair timing bar, "REPEL THE SHARK"). A shark that is
 * left too long bites the hull and leaves a patch to hammer. Now and then
 * one flops aboard and has to be heaved back over. Arrows at the edge of the
 * screen point at sharks the camera can't see, and a small board shows the
 * count. Pooled stage sprites, a handful at a time.
 */
const T = TILE_SIZE;
const rand = (a, b) => a + Math.random() * (b - a);

export class SharkDuty {
  constructor(scene) {
    this.scene = scene;
    this.data = dutyData(scene.content);
    this.sessionId = null;
    this.incidents = [];
    this.arrows = [];
    this.responding = false;
    this.nextId = 1;
    this.barkTimer = 5000;
  }

  get active() {
    return !!this.sessionId;
  }

  /** Starts or stops duty to match the map's story entries. */
  sync() {
    const id = dutySessionFor(this.scene.model.meta, this.scene.session);
    if (id === this.sessionId) return;
    this.stop();
    if (id && this.data.sessions?.[id]) this.start(id);
  }

  start(id) {
    this.sessionId = id;
    this.def = this.data.sessions[id];
    this.plan = new DutyPlan(this.def);
    this.barkTimer = 5000;
    this.updateBoard(true);
  }

  stop() {
    if (!this.sessionId) return;
    for (const inc of this.incidents) this.clear(inc, { retreat: true });
    this.incidents = [];
    for (const a of this.arrows) a.destroy();
    this.arrows = [];
    this.sessionId = null;
    this.def = null;
    this.scene.app.overlay?.setDutyBoard?.(null);
  }

  destroy() {
    this.stop();
  }

  // --- the clock ----------------------------------------------------------------

  update(dt, busy) {
    if (!this.sessionId) return;
    this.updateArrows();
    this.updateBoard();
    for (const inc of this.incidents) this.animate(inc, dt);
    if (busy || this.responding) return;
    const spots = new Set(this.incidents.map((i) => i.spot));
    for (const wave of this.plan.tick(dt, spots)) this.spawn(wave);
    for (const inc of this.incidents) {
      if (inc.kind !== 'rail') continue;
      inc.t += dt;
      if (inc.t >= (inc.window ?? this.def.window ?? 8000)) this.bite(inc);
      else if (!inc.warned && inc.t >= (inc.window ?? this.def.window ?? 8000) * 0.7) {
        inc.warned = true;
        this.scene.app.audio.sfx('shark_surface', { volume: 0.6, rate: 1.2 });
      }
    }
    this.barks(dt);
  }

  barks(dt) {
    const list = this.def.barks ?? [];
    if (!list.length) return;
    this.barkTimer -= dt;
    if (this.barkTimer > 0) return;
    this.barkTimer = rand(6500, 11000);
    const b = list[Math.floor(Math.random() * list.length)];
    const who = this.scene.actors.get(b.who);
    if (who) this.scene.barks?.show?.(who, b.text, { duration: 1800 });
  }

  // --- sharks at the rail ---------------------------------------------------------

  spawn(wave) {
    const s = this.scene;
    const id = this.nextId++;
    if (wave.boarder) {
      const [x, y] = wave.boarder;
      if (s.isSolid(x, y) || s.occupantAt(x, y)) return;
      const inc = { id, kind: 'boarder', x, y, spot: 'deck', t: 0 };
      this.incidents.push(inc);
      // Something on the deck blocks the way until it's dealt with.
      inc.blocker = { id: `duty_boarder_${id}`, kind: 'prop', tx: x, ty: y };
      s.occupancy.set(s.key(x, y), inc.blocker);
      s.sharks.flop(x, y);
      this.mark(inc, x, y - 1.3);
      return;
    }
    const sec = this.data.sections?.[wave.section];
    if (!sec) return;
    const port = sec.x >= s.model.width / 2;
    const inc = { id, kind: 'rail', section: wave.section, x: sec.x, y: sec.y, port, big: !!wave.big, spot: wave.section, t: 0, window: wave.window };
    this.incidents.push(inc);
    inc.sprite = `duty_shark_${id}`;
    const rec = s.stage.add(inc.sprite, { frame: 'shark_bite_0', x: port ? sec.x + 1.4 : sec.x - 0.4, y: sec.y + 1, below: true, flip: port });
    rec.img.setAlpha(0);
    s.tweens.add({ targets: rec.img, alpha: 1, duration: 260 });
    if (inc.big) rec.img.setScale(1.25);
    s.fx.burst('splash', (port ? sec.x + 1.2 : sec.x - 0.2) * T, (sec.y + 0.6) * T, { count: 6 });
    s.app.audio.sfx('shark_surface', { volume: 0.8 });
    this.mark(inc, sec.x + 0.5, sec.y - 0.2);
  }

  /** The red marker over a shark (or the hammer over a patch), blinking. */
  mark(inc, x, y, frame = 'duty_mark_0') {
    const s = this.scene;
    if (inc.marker) s.stage.remove(inc.marker);
    inc.marker = `duty_mark_${inc.id}`;
    const rec = s.stage.add(inc.marker, { frame, x, y, depth: 79000 });
    rec.frames = frame === 'duty_mark_0' ? ['duty_mark_0', 'duty_mark_1'] : ['duty_patch_0', 'duty_patch_1'];
  }

  animate(inc, dt) {
    inc.anim = (inc.anim ?? 0) + dt;
    const rec = inc.marker ? this.scene.stage.get(inc.marker) : null;
    if (!rec) return;
    // Blinks faster as the bite gets closer.
    const urgency = inc.kind === 'rail' ? Math.min(1, inc.t / (inc.window ?? this.def?.window ?? 8000)) : 0;
    const period = 420 - urgency * 260;
    rec.img.setFrame(rec.frames[Math.floor(inc.anim / period) % 2]);
    if (inc.sprite && inc.kind === 'rail') {
      const shark = this.scene.stage.get(inc.sprite);
      if (shark) shark.img.y = shark.baseY + Math.round(Math.sin(inc.anim / 180) * 1.5);
    }
  }

  /** Too slow: the shark gets a bite in, and leaves a hole to patch. */
  bite(inc) {
    const s = this.scene;
    if (inc.sprite) s.stage.remove(inc.sprite);
    inc.sprite = null;
    s.sharks.bite(inc.x, inc.y);
    inc.kind = 'patch';
    inc.t = 0;
    this.mark(inc, inc.x + 0.5, inc.y - 0.2, 'duty_patch_0');
    s.session.story.addVar('duty_bites', 1);
  }

  // --- the captain responds ----------------------------------------------------------

  /** The duty target on tile (x, y), if the captain is facing one. */
  targetAt(x, y) {
    if (!this.sessionId || this.responding) return null;
    return this.incidents.find((i) => i.x === x && i.y === y) ?? null;
  }

  hintFor(inc) {
    if (inc.kind === 'patch') return 'Patch';
    if (inc.kind === 'boarder') return 'Heave over';
    return 'Repel';
  }

  async respond(inc) {
    if (this.responding) return;
    this.responding = true;
    const s = this.scene;
    const kind = inc.kind === 'patch' ? 'hull' : 'shark';
    const strikes = inc.kind === 'patch' ? 2 : inc.kind === 'boarder' || inc.big ? 2 : 1;
    const title = inc.kind === 'patch' ? 'PATCH THE BITE' : inc.kind === 'boarder' ? 'HEAVE IT OVERBOARD' : inc.big ? 'REPEL THE BIG ONE' : 'REPEL THE SHARK';
    s.player.face(this.facingFor(inc));
    await s.runScript([{ repair: kind, strikes, title }]);
    this.responding = false;
    if (!this.incidents.includes(inc)) return;
    const counted = inc.kind !== 'patch';
    this.clear(inc, { repelled: true });
    this.incidents = this.incidents.filter((i) => i !== inc);
    if (counted && this.def?.event) s.app.bus.emit('script:event', { name: this.def.event });
    if (!counted) s.app.bus.emit('script:event', { name: 'duty_patched' });
  }

  facingFor(inc) {
    const p = this.scene.player;
    if (inc.x > p.tx) return 'right';
    if (inc.x < p.tx) return 'left';
    return inc.y > p.ty ? 'down' : 'up';
  }

  clear(inc, { repelled = false, retreat = false } = {}) {
    const s = this.scene;
    if (inc.marker) s.stage.remove(inc.marker);
    inc.marker = null;
    if (inc.kind === 'boarder') {
      if (s.occupancy.get(s.key(inc.x, inc.y)) === inc.blocker) s.occupancy.delete(s.key(inc.x, inc.y));
      s.sharks.unflop();
      return;
    }
    if (inc.sprite) {
      const rec = s.stage.get(inc.sprite);
      const id = inc.sprite;
      inc.sprite = null;
      if (rec) {
        if (repelled) {
          s.fx.burst('splash', rec.img.x, rec.img.y - 6, { count: 10 });
          s.app.audio.sfx('splash', { volume: 0.7 });
        }
        s.tweens.add({ targets: rec.img, alpha: 0, x: rec.img.x + (inc.port ? 14 : -14), duration: retreat ? 500 : 320, onComplete: () => s.stage.remove(id) });
      }
    }
  }

  // --- what the captain can see ----------------------------------------------------

  /** Arrows at the screen edge toward sharks the camera can't see. */
  updateArrows() {
    const s = this.scene;
    const cam = s.cameras.main;
    const off = this.incidents.filter((inc) => {
      const px = (inc.x + 0.5) * T - cam.scrollX;
      const py = (inc.y + 0.5) * T - cam.scrollY;
      return px < 0 || py < 0 || px > SCREEN_WIDTH || py > SCREEN_HEIGHT;
    });
    while (this.arrows.length < off.length) this.arrows.push(s.add.image(0, 0, 'stage', 'duty_arrow').setScrollFactor(0).setDepth(79500));
    this.arrows.forEach((a, i) => {
      const inc = off[i];
      if (!inc) {
        a.setVisible(false);
        return;
      }
      const px = (inc.x + 0.5) * T - cam.scrollX;
      const py = (inc.y + 0.5) * T - cam.scrollY;
      const cx = SCREEN_WIDTH / 2;
      const cy = SCREEN_HEIGHT / 2;
      const ang = Math.atan2(py - cy, px - cx);
      const x = Math.max(10, Math.min(SCREEN_WIDTH - 10, px));
      const y = Math.max(26, Math.min(SCREEN_HEIGHT - 22, py));
      const pulse = 1 + Math.sin(s.time.now / 140) * 0.12;
      a.setVisible(true).setPosition(Math.round(x), Math.round(y)).setRotation(ang).setScale(pulse);
    });
  }

  updateBoard(force = false) {
    const ref = this.def?.counter;
    let text = '';
    if (ref) {
      const [q, o] = splitObjectiveRef(ref);
      const qs = this.scene.session.quests;
      const def = qs.objectiveDef?.(q, o);
      const st = qs.objState(q, o);
      if (def) text = `${this.def.label ?? 'Sharks repelled'}  <y>${Math.min(st?.progress ?? 0, def.count ?? 1)}/${def.count ?? 1}</>`;
    }
    const key = `${this.sessionId}|${text}|${this.incidents.length}`;
    if (!force && key === this.boardKey) return;
    this.boardKey = key;
    this.scene.app.overlay?.setDutyBoard?.({ title: this.def?.title ?? 'SHARK DUTY', text, sharks: this.incidents.length });
  }
}
