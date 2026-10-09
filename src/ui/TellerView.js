import { addPanel } from './Panel.js';
import { addText, setText, centerText, UI_COLORS } from './text.js';
import { SCREEN_WIDTH } from '../config/constants.js';
import { createTeller, stepTeller, autoTeller, tensionZone, intensityValue, scaleEntry } from '../systems/bank.js';

const D = 720;

/**
 * Story Phase 14: the teller's window at THE GRAND STENCHMASTER'S GRAND BANK
 * AND GRAND TRUST (rules in systems/bank.js). A panel across the top of the
 * screen, over the bank:
 *
 *   the depositor's name and title on a brass plate;
 *   the INTENSITY telegraph: the bank's scale, 1 to 10 (and 10+), with a
 *   needle that climbs toward the depositor's class while the pressure builds;
 *   what's happening (TAKE THE SASH · HOLD IT · BRACE!), and its control.
 *
 *   Take the sash: press Confirm (or it's put in your hand).
 *   Hold it: hold Confirm (or Up) to keep it taut; let off to ease. Out of
 *   the band too long and the crew grab it with you (it counts, it isn't a
 *   failure).
 *   Brace: a ring closes on the gold one; press Confirm as they meet. Early
 *   presses don't count (a short lock: no mashing). Late, or not at all, and
 *   the deposit blows the teller back. Nothing ends the shift.
 *
 * Each wave is reported as it lands (`onWave`) so the world can shake, scatter
 * papers and knock the captain over at the right moment. Calmer effects: no
 * pulsing, softer shakes; the bank is the same.
 */
export class TellerView {
  constructor(scene, customer, bank, { onWave, onDone }) {
    this.scene = scene;
    this.app = scene.game.app;
    this.customer = customer;
    this.bank = bank;
    this.st = createTeller(customer);
    this.onWave = onWave;
    this.onDone = onDone;
    this.calm = this.app.settings.reducedEffects();
    this.parts = [];
    this.lineT = 0;
    this.build();
  }

  add(o) {
    this.parts.push(o);
    return o;
  }

  build() {
    const s = this.scene;
    const c = this.customer;
    const w = 300;
    const h = 92;
    const x = Math.round((SCREEN_WIDTH - w) / 2);
    const y = 3;
    this.box = { x, y, w, h };
    this.add(addPanel(s, x, y, w, h, { depth: D }));
    // The brass nameplate.
    this.add(s.add.rectangle(x + 6, y + 5, w - 12, 25, 0x3a2410).setOrigin(0).setDepth(D + 1));
    this.add(s.add.rectangle(x + 6, y + 5, w - 12, 1, 0xd8a840).setOrigin(0).setDepth(D + 1));
    this.add(s.add.rectangle(x + 6, y + 29, w - 12, 1, 0x8a6020).setOrigin(0).setDepth(D + 1));
    const name = this.add(addText(s, 0, y + 7, c.name, { font: 'bold', color: UI_COLORS.gold, depth: D + 2, maxWidth: w - 20, maxLines: 1, clipWidth: w - 20 }));
    centerText(name, SCREEN_WIDTH / 2);
    const title = this.add(addText(s, 0, y + 18, c.title ?? '', { color: 0xdccca8, depth: D + 2, maxWidth: w - 20, maxLines: 1, clipWidth: w - 20 }));
    centerText(title, SCREEN_WIDTH / 2);
    // The intensity telegraph: the bank's scale.
    const gx = x + 12;
    const gy = y + 36;
    const gw = w - 24;
    this.gauge = { x: gx, y: gy, w: gw };
    this.add(addText(s, gx, gy - 1, '<k>INTENSITY</>', { depth: D + 2 }));
    const scaleY = gy + 10;
    this.add(s.add.rectangle(gx - 1, scaleY - 1, gw + 2, 8, 0x07060b).setOrigin(0).setDepth(D + 1));
    const COLS = [0x5a9a4a, 0x6aa84a, 0x8ab048, 0xb0b040, 0xd0a038, 0xd88030, 0xd86028, 0xd04028, 0xb82828, 0x981838, 0x6a1050];
    for (let n = 1; n <= 11; n++) {
      const cx = gx + Math.round(((n - 1) * gw) / 11);
      const cw = Math.round((n * gw) / 11) - Math.round(((n - 1) * gw) / 11) - 1;
      this.add(s.add.rectangle(cx, scaleY, cw, 6, COLS[n - 1]).setOrigin(0).setDepth(D + 1).setAlpha(0.55));
      const label = n === 11 ? '10+' : String(n);
      const t = this.add(addText(s, 0, scaleY + 7, `<k>${label}</>`, { depth: D + 2 }));
      t.x = cx + Math.round(cw / 2 - t.textWidth / 2);
    }
    this.needle = this.add(s.add.rectangle(gx, scaleY - 3, 3, 12, 0xfff4e0).setOrigin(0.5, 0).setDepth(D + 3));
    this.scaleY = scaleY;
    // What's happening, and the hold meter / brace ring.
    this.stage = this.add(addText(s, x + 10, y + h - 26, '', { font: 'bold', color: 0xfff4e0, depth: D + 2 }));
    this.line = this.add(addText(s, x + 10, y + h - 13, '', { depth: D + 2, maxWidth: w - 20, maxLines: 1, clipWidth: w - 120 }));
    this.hint = this.add(addText(s, 0, y + h - 13, '', { color: UI_COLORS.dim, depth: D + 2 }));
    // the hold meter (right half of the bottom)
    const mx = x + w - 116;
    const my = y + h - 25;
    this.meter = { x: mx, y: my, w: 104 };
    this.meterParts = [
      this.add(s.add.rectangle(mx - 1, my - 1, 106, 9, 0x07060b).setOrigin(0).setDepth(D + 1)),
      this.add(s.add.rectangle(mx, my, 104, 7, 0x2a1a24).setOrigin(0).setDepth(D + 1)),
    ];
    this.band = this.add(s.add.rectangle(mx, my, 10, 7, 0x5a9a4a).setOrigin(0).setDepth(D + 2));
    this.holdNeedle = this.add(s.add.rectangle(mx, my - 2, 3, 11, 0xfff4e0).setOrigin(0.5, 0).setDepth(D + 3));
    this.meterParts.push(this.band, this.holdNeedle);
    // the brace ring
    this.ring = this.add(s.add.graphics().setDepth(D + 4));
    this.ringAt = { x: x + w - 64, y: y + h - 21 };
    this.setMeterVisible(false);
    this.parts.forEach((p) => p.setAlpha?.(0));
    s.tweens.add({ targets: this.parts, alpha: 1, duration: 160 });
  }

  setMeterVisible(v) {
    for (const p of this.meterParts) p.setVisible(v);
  }

  setStage(text, hint) {
    setText(this.stage, text);
    setText(this.hint, hint ?? '');
    this.hint.x = this.box.x + this.box.w - this.hint.textWidth - 8;
  }

  say(text, hold = 1800) {
    setText(this.line, text ?? '');
    this.lineT = hold;
  }

  update(delta, input) {
    const st = this.st;
    if (st.done) return;
    const auto = this.app.flags?.autoTiming != null;
    let held;
    let pressed;
    if (auto) ({ held, pressed } = autoTeller(st));
    else {
      held = input.isDown('confirm') || input.isDown('up');
      pressed = input.pressed('confirm');
      if (pressed) input.consume('confirm');
    }
    const events = stepTeller(st, delta / 1000, { held, pressed });
    for (const e of events) this.onEvent(e);
    if (this.lineT > 0) {
      this.lineT -= delta;
      if (this.lineT <= 0) setText(this.line, '');
    }
    this.draw();
  }

  onEvent(e) {
    const audio = this.app.audio;
    const c = this.customer;
    switch (e.type) {
      case 'beat': {
        const b = e.beat;
        this.ring.clear();
        this.setMeterVisible(!!b.hold);
        if (b.take) this.setStage('TAKE THE SASH', '{btn:confirm} take it');
        else if (b.hold) this.setStage(b.label ?? 'HOLD THE SASH', '{btn:confirm} hold · let go to ease');
        else if (b.brace) {
          this.setStage(b.brace === true ? 'BRACE!' : String(b.brace), '{btn:confirm} as the rings meet');
          audio.sfx(b.cueSfx ?? 'pressure_build', { volume: 0.7 });
        } else if (b.wait) this.setStage(b.label ?? '...', '');
        else if (b.puff) this.setStage(b.label ?? 'puff.', '');
        if (b.text) this.say(b.text, b.hold ? b.hold * 1000 : 2200);
        if (b.sfx) audio.sfx(b.sfx, { volume: b.volume ?? 0.7 });
        break;
      }
      case 'take':
        audio.sfx('sash_flap_small', { volume: 0.7 });
        if (e.auto) this.say(`<k>${c.short ?? 'The depositor'} puts it in your hand.</>`, 1600);
        break;
      case 'caught':
        audio.sfx('sash_flap', { volume: 0.7 });
        this.say(e.zone === 'low' ? '<y>PETE:</> <r>Don\'t let it go slack!</>' : '<y>GRISTLE:</> <o>EASY! Not so tight!</>', 1500);
        break;
      case 'milestone':
        if (e.m.text) this.say(e.m.text, e.m.hold ?? 2200);
        if (e.m.sfx) audio.sfx(e.m.sfx, { volume: e.m.volume ?? 0.7 });
        break;
      case 'surge':
        audio.sfx('fume_surge', { volume: 0.7 });
        break;
      case 'early':
        audio.ui('buzzer');
        this.say('<k>Not yet...</>', 700);
        break;
      case 'puff':
        audio.sfx(e.beat.sfx ?? 'puff_tiny', { volume: 0.6 });
        this.onWave?.({ beat: e.beat, grade: 'puff', customer: c });
        break;
      case 'wave': {
        const g = e.grade;
        this.ring.clear();
        audio.sfx(e.beat.waveSfx ?? (intensityValue(e.beat.power ?? c.intensity) >= 7 ? 'eruption_big' : 'deposit_whoomp'), { volume: 0.85 });
        if (g === 'perfect') this.say('<g>BRACED.</> You hold your ground.', 1400);
        else if (g === 'good') this.say('<y>ROCKED.</> You slide back a step.', 1400);
        else this.say('<r>BLOWN BACK.</> Papers everywhere.', 1600);
        this.onWave?.({ beat: e.beat, grade: g, customer: c });
        break;
      }
      case 'done':
        this.finish();
        break;
      default:
        break;
    }
  }

  draw() {
    const st = this.st;
    const g = this.gauge;
    // The telegraph needle climbs toward the depositor's class.
    const target = intensityValue(this.customer.intensity);
    const want = g.x + ((target - 0.5) * g.w) / 11;
    const x = g.x + (want - g.x) * st.fill;
    this.needle.x = Math.round(x);
    const b = st.beat;
    if (b?.hold && st.tension) {
      const m = this.meter;
      const [lo, hi] = st.tension.band;
      const px = (v) => Math.round(m.x + (v / 100) * m.w);
      this.band.x = px(lo);
      this.band.width = px(hi) - px(lo);
      this.holdNeedle.x = px(st.tension.value);
      const zone = tensionZone(st.tension);
      this.holdNeedle.setFillStyle(zone === 'ok' ? 0xfff4e0 : zone === 'low' ? 0xf07860 : 0xf8a040);
    }
    if (b?.brace && !st.pressed) {
      const ring = b.ring ?? 1000;
      const k = Math.max(0, 1 - st.t / ring);
      const { x: rx, y: ry } = this.ringAt;
      this.ring.clear();
      this.ring.lineStyle(2, 0xd8a840, 1).strokeCircle(rx, ry, 7);
      this.ring.lineStyle(2, st.lock > 0 ? 0x7a6a7a : 0xfff4e0, 1).strokeCircle(rx, ry, 7 + Math.round(k * 26));
    }
  }

  finish() {
    const result = { grades: [...this.st.grades], slips: this.st.slips };
    const entry = scaleEntry(this.bank, this.customer.intensity);
    if (entry) this.say(`<k>${entry.n} — ${entry.name}</>`, 1200);
    this.scene.tweens.add({
      targets: this.parts,
      alpha: 0,
      delay: 450,
      duration: 220,
      onComplete: () => {
        this.destroy();
        this.onDone(result);
      },
    });
  }

  destroy() {
    for (const p of this.parts) p.destroy();
    this.parts = [];
  }
}
