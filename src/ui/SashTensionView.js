import { addPanel } from './Panel.js';
import { addText, setText, centerText, UI_COLORS } from './text.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';
import { createTension, stepTension, tensionZone, autoHold } from '../systems/tension.js';

const D = 720;
const WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN',
  'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN', 'TWENTY', 'TWENTY-ONE', 'TWENTY-TWO', 'TWENTY-THREE',
  'TWENTY-FOUR', 'TWENTY-FIVE', 'TWENTY-SIX', 'TWENTY-SEVEN', 'TWENTY-EIGHT', 'TWENTY-NINE', 'THIRTY'];

/**
 * The Sash Tension close-up (Story Phase 12): a panel at the top of the
 * screen over the scene (the captain behind the Grand Stenchmaster, holding
 * the sash), with the count in big figures, a meter with its target band
 * and the needle, what's being shouted, and the control. Rules in
 * systems/tension.js; this draws them and takes the controls:
 *
 *   hold Confirm (or Up) to pull · let off to ease · at the end, press
 *   Confirm (or Cancel) to let go.
 *
 * Calmer effects: no haze over the room beyond a faint tint, no pulsing
 * cue, no flash; screen shake follows the Screen Shake option. The story
 * is the same either way.
 */
export class SashTensionView {
  constructor(scene, def, { onDone }) {
    this.scene = scene;
    this.app = scene.game.app;
    this.st = createTension(def);
    this.onDone = onDone;
    this.calm = this.app.settings.reducedEffects();
    this.lineT = 0;
    this.sfxT = 0;
    this.hazeTarget = 0;
    this.parts = [];
    this.build();
  }

  add(o) {
    this.parts.push(o);
    return o;
  }

  build() {
    const s = this.scene;
    const d = this.st.def;
    // The room goes greener as it gets worse (behind the panel).
    this.haze = this.add(s.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, Phaser_hex(d.hazeColor ?? '#7a8a2a'), 1).setOrigin(0).setDepth(D - 2).setAlpha(0));
    const w = 236;
    const h = 70;
    const x = Math.round((SCREEN_WIDTH - w) / 2);
    const y = 4;
    this.box = { x, y, w, h };
    this.add(addPanel(s, x, y, w, h, { depth: D }));
    const title = this.add(addText(s, 0, y + 6, d.title ?? 'HOLD IT', { font: 'bold', color: UI_COLORS.gold, depth: D + 2 }));
    title.x = x + 10;
    this.count = this.add(addText(s, 0, y + 20, '0', { font: 'big', color: 0xffffff, depth: D + 2 }));
    this.countOf = this.add(addText(s, 0, y + 30, `/${d.seconds}`, { color: UI_COLORS.dim, depth: D + 2 }));
    // the meter
    const mx = x + 12;
    const my = y + 24;
    const mw = 168;
    this.meter = { x: mx, y: my, w: mw };
    this.add(s.add.rectangle(mx - 1, my - 1, mw + 2, 12, 0x07060b).setOrigin(0).setDepth(D + 1));
    this.add(s.add.rectangle(mx, my, mw, 10, 0x2a1a24).setOrigin(0).setDepth(D + 1));
    this.lowZone = this.add(s.add.rectangle(mx, my, 10, 10, 0x6a2a2a).setOrigin(0).setDepth(D + 1));
    this.highZone = this.add(s.add.rectangle(mx, my, 10, 10, 0x6a4a1a).setOrigin(0).setDepth(D + 1));
    this.bandRect = this.add(s.add.rectangle(mx, my, 10, 10, 0x5a9a4a).setOrigin(0).setDepth(D + 2));
    this.needle = this.add(s.add.rectangle(mx, my - 3, 3, 16, 0xfff4e0).setOrigin(0.5, 0).setDepth(D + 3));
    this.add(addText(s, mx, my + 12, '<r>SLACK</>', { depth: D + 2 }));
    const tight = this.add(addText(s, 0, my + 12, '<o>TOO TIGHT</>', { depth: D + 2 }));
    tight.x = mx + mw - tight.textWidth;
    this.line = this.add(addText(s, x + 10, y + h - 22, '', { depth: D + 2, maxWidth: w - 20, maxLines: 1, clipWidth: w - 20 }));
    this.hint = this.add(addText(s, 0, y + h - 12, '', { color: UI_COLORS.dim, depth: D + 2 }));
    this.setHint('{btn:confirm} hold to pull · let go to ease');
    // the release cue, later
    this.cue = this.add(addText(s, 0, 96, d.release.cue ?? 'LET GO!', { font: 'big', color: UI_COLORS.gold, depth: D + 4 }).setVisible(false));
    centerText(this.cue, SCREEN_WIDTH / 2);
    this.cueHint = this.add(addText(s, 0, 122, '{btn:confirm}', { depth: D + 4 }).setVisible(false));
    centerText(this.cueHint, SCREEN_WIDTH / 2);
    this.parts.forEach((p) => p !== this.haze && p !== this.cue && p !== this.cueHint && p.setAlpha(0));
    s.tweens.add({ targets: this.parts.filter((p) => p !== this.haze && p !== this.cue && p !== this.cueHint), alpha: 1, duration: 160 });
    this.layoutCount();
    this.drawMeter();
  }

  setHint(text) {
    setText(this.hint, text);
    this.hint.x = this.box.x + this.box.w - this.hint.textWidth - 8;
  }

  say(text, hold = 2200) {
    setText(this.line, text);
    this.lineT = hold;
  }

  layoutCount() {
    const b = this.box;
    this.count.x = b.x + b.w - 40 - Math.round(this.count.textWidth / 2);
    this.countOf.x = b.x + b.w - 40 + 12;
  }

  drawMeter() {
    const { x, w } = this.meter;
    const [lo, hi] = this.st.band;
    const px = (v) => Math.round(x + (v / 100) * w);
    this.lowZone.width = px(lo) - x;
    this.highZone.x = px(hi);
    this.highZone.width = x + w - px(hi);
    this.bandRect.x = px(lo);
    this.bandRect.width = px(hi) - px(lo);
    this.needle.x = px(this.st.value);
    const zone = tensionZone(this.st);
    this.needle.setFillStyle(zone === 'ok' ? 0xfff4e0 : zone === 'low' ? 0xf07860 : 0xf8a040);
  }

  shake(amount, ms = 260) {
    const k = this.app.settings.shakeScale?.() ?? 1;
    if (k > 0 && amount) this.scene.scene.get('World')?.cameras?.main?.shake(ms, amount * k);
  }

  update(delta, input) {
    const st = this.st;
    // The debug "auto timed hits" (and the E2E runs) hold it for you: autoTiming is a number when on, null when off.
    const auto = this.app.flags?.autoTiming != null;
    const held = auto ? autoHold(st) : input.isDown('confirm') || input.isDown('up');
    let pressed = false;
    if (st.phase === 'release') {
      pressed = auto || input.pressed('confirm') || input.pressed('cancel');
      input.consume('confirm');
      input.consume('cancel');
    }
    const events = stepTension(st, delta / 1000, { held, pressed });
    const d = st.def;
    for (const e of events) this.onEvent(e, d);
    if (st.phase === 'done') return;
    // Out of the band: the sash complains (a creak if it's too tight, a little flap if it's slack).
    this.sfxT -= delta;
    const zone = tensionZone(st);
    if (st.phase === 'hold' && zone !== 'ok' && this.sfxT <= 0) {
      this.sfxT = zone === 'high' ? 520 : 680;
      this.app.audio.sfx(zone === 'high' ? d.tightSfx ?? 'sash_creak' : d.slackSfx ?? 'sash_flap_small', { volume: 0.55 });
    }
    if (this.lineT > 0) {
      this.lineT -= delta;
      if (this.lineT <= 0) setText(this.line, '');
    }
    // Haze eases toward its target.
    const cap = this.calm ? 0.1 : 0.42;
    const target = Math.min(cap, this.hazeTarget);
    this.haze.setAlpha(this.haze.alpha + (target - this.haze.alpha) * Math.min(1, delta / 500));
    if (st.phase === 'release' && !this.calm) this.cue.setScale(1 + Math.sin(this.scene.time.now / 90) * 0.06);
    this.drawMeter();
  }

  onEvent(e, d) {
    const audio = this.app.audio;
    switch (e.type) {
      case 'second': {
        setText(this.count, String(e.n));
        this.layoutCount();
        if (!this.calm) this.scene.tweens.add({ targets: this.count, scale: { from: 1.25, to: 1 }, duration: 180 });
        if (d.count?.sfx) audio.sfx(d.count.sfx, { volume: 0.7, rate: 1 + e.n / 60 });
        // The counting voice, unless a milestone has something to say this second.
        if (!(d.milestones ?? []).some((m) => m.at === e.n && m.text)) {
          const who = d.count?.name ?? 'PETE';
          this.say(`<y>${who}:</> ${WORDS[e.n] ?? e.n}!`, 900);
        }
        break;
      }
      case 'milestone': {
        const m = e.m;
        if (m.text) this.say(m.text, m.hold ?? 2600);
        if (m.sfx) audio.sfx(m.sfx, { volume: m.volume ?? 0.8 });
        if (m.haze !== undefined) this.hazeTarget = m.haze;
        if (m.shake) this.shake(m.shake);
        if (m.flash && !this.calm) this.scene.cameras.main.flash(120, 200, 230, 120);
        break;
      }
      case 'surge':
        audio.sfx(d.surgeSfx ?? 'fume_surge', { volume: 0.8 });
        this.shake(0.006, 320);
        break;
      case 'gust':
        audio.sfx(d.gustSfx ?? 'sash_flap_small', { volume: 0.5 });
        break;
      case 'caught':
        audio.sfx(d.caughtSfx ?? 'sash_flap', { volume: 0.8 });
        this.say(e.zone === 'low' ? (d.slackLine ?? '<r>NOT YET!</> Get a grip on it!') : (d.tightLine ?? '<o>EASY!</> Not so tight!'), 1600);
        break;
      case 'cue':
        audio.sfx(d.release.cueSfx ?? 'sash_cue', { volume: 0.9 });
        this.cue.setVisible(true);
        this.cueHint.setVisible(true);
        this.setHint('{btn:confirm} let go');
        break;
      case 'released':
        if (d.release.sfx) audio.sfx(d.release.sfx, { volume: 0.9 });
        if (e.how === 'slipped') this.say(d.release.slipLine ?? 'Your hands slip.', 1200);
        this.finish();
        break;
      default:
        break;
    }
  }

  finish() {
    const result = { slips: this.st.slips, released: this.st.released };
    this.scene.tweens.add({
      targets: this.parts,
      alpha: 0,
      delay: 200,
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

function Phaser_hex(color) {
  return parseInt(String(color).replace('#', ''), 16);
}
