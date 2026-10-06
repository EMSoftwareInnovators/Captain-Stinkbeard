import { addText, setText, centerText, UI_COLORS } from './text.js';
import { SCREEN_WIDTH } from '../config/constants.js';

const D = 300; // under the dialogue window, over the room

/**
 * A large die, rolled for the story (Story Phase 12: the Grand Dice of
 * Grandness). Never random: a script says what it lands on.
 *
 *   { "dice": "roll", "die": "grand_dice", "result": 6, "bounces": 3 }   in from the left, tumbling, bouncing, lands on 6
 *   { "dice": "hop", "to": 3, "hops": 4 }        tik... tik-tik... it hops (there's something in it) and lands on 3
 *   { "dice": "hold", "seconds": 10 }            it sits still while a ring counts down round it
 *   { "dice": "show", "face": 6 } · { "dice": "hide" }
 *
 * A die is data (data/story/dice/*.json): its art prefix ("gdie": frames
 * gdie_1..6, gdie_tumble_0..3, gdie_shadow), what each face says, and its
 * sounds. The die stays up between commands, so the cast can talk over it.
 */
export class DiceView {
  constructor(scene, def) {
    this.scene = scene;
    this.app = scene.game.app;
    this.def = def;
    this.art = def.art ?? 'gdie';
    this.home = { x: SCREEN_WIDTH / 2, y: 104 };
    this.face = def.start ?? 1;
    this.calm = this.app.settings.reducedEffects();
    this.shadow = scene.add.image(this.home.x, this.home.y + 26, 'vista', `${this.art}_shadow`).setDepth(D).setAlpha(0);
    this.die = scene.add.image(this.home.x, this.home.y, 'vista', `${this.art}_${this.face}`).setDepth(D + 1).setAlpha(0);
    this.label = addText(scene, 0, this.home.y + 34, '', { font: 'bold', color: UI_COLORS.gold, depth: D + 2 });
    this.ring = scene.add.graphics().setDepth(D + 2);
    this.ringText = addText(scene, 0, this.home.y - 46, '', { font: 'bold', color: 0xffffff, depth: D + 2 });
  }

  sfx(key, opts = {}) {
    const id = this.def.sfx?.[key];
    if (id) this.app.audio.sfx(id, { volume: 0.8, ...opts });
  }

  setFace(n, { label = true } = {}) {
    this.face = n;
    this.die.setFrame(`${this.art}_${n}`);
    this.showLabel(label ? this.def.faces?.[n] ?? '' : '');
  }

  showLabel(text) {
    setText(this.label, text ? `${this.face} - ${text}` : '');
    centerText(this.label, this.home.x);
  }

  tween(cfg) {
    return new Promise((resolve) => this.scene.tweens.add({ ...cfg, onComplete: resolve }));
  }

  wait(ms) {
    return new Promise((resolve) => this.scene.time.delayedCall(ms, resolve));
  }

  show(face = this.face) {
    this.setFace(face);
    this.die.setPosition(this.home.x, this.home.y).setAngle(0);
    this.shadow.setPosition(this.home.x, this.home.y + 26);
    return this.tween({ targets: [this.die, this.shadow], alpha: 1, duration: 220 });
  }

  /** In from the left, end over end, bouncing, and down on `result`. */
  async roll(result, bounces = 3) {
    this.showLabel('');
    const startX = -30;
    this.die.setPosition(startX, this.home.y - 40).setAlpha(1).setAngle(0);
    this.shadow.setAlpha(0.6);
    this.sfx('throw');
    const n = Math.max(1, bounces);
    for (let i = 0; i < n; i++) {
      const toX = startX + ((this.home.x - startX) * (i + 1)) / n;
      const height = 46 * (1 - i / (n + 1));
      await this.hopTo(toX, height, 360 - i * 40, true);
      this.sfx('bounce', { rate: 1 + i * 0.08 });
      this.sfx('squeak', { volume: 0.5, rate: 1.1 - i * 0.05 });
      if (!this.calm) this.scene.cameras.main.shake(80, 0.002 * (this.app.settings.shakeScale?.() ?? 1));
    }
    this.setFace(result, { label: false });
    this.die.setAngle(0);
    await this.tween({ targets: this.die, scaleX: 1.12, scaleY: 0.88, duration: 70, yoyo: true });
    this.sfx('land');
    this.setFace(result);
    this.sfx('fanfare', { volume: 0.9 });
    if (!this.calm) await this.tween({ targets: this.label, scale: { from: 1.4, to: 1 }, duration: 260 });
  }

  /** One arc: up and over to x, tumbling (frames) if asked. */
  async hopTo(toX, height, ms, tumble) {
    const fromX = this.die.x;
    const y0 = this.home.y;
    const st = { t: 0 };
    const start = this.scene.time.now;
    await new Promise((resolve) => this.scene.tweens.add({
      targets: st,
      t: 1,
      duration: ms,
      onUpdate: () => {
        const t = st.t;
        this.die.x = fromX + (toX - fromX) * t;
        this.die.y = y0 - height * 4 * t * (1 - t);
        this.shadow.x = this.die.x;
        this.shadow.setScale(1 - 0.4 * 4 * t * (1 - t));
        if (tumble) {
          // End over end: a tumble frame every 70 ms, and a little spin.
          this.die.setFrame(`${this.art}_tumble_${Math.floor((this.scene.time.now - start) / 70) % 4}`);
          this.die.setAngle(t * 200);
        }
      },
      onComplete: resolve,
    }));
    this.die.y = y0;
  }

  /** Something inside it: tik... tik-tik... then it hops, face by face, and lands on `to`. */
  async hop(to, hops = 4) {
    const shiver = async () => {
      this.sfx('beans', { volume: 0.7 });
      await this.tween({ targets: this.die, x: this.die.x + 2, duration: 40, yoyo: true, repeat: 1 });
    };
    await shiver();
    await this.wait(700);
    await shiver();
    await this.wait(160);
    await shiver();
    await this.wait(500);
    // The faces it shows on the way, never `to` until the last hop, never the one it's on.
    const pool = [1, 2, 3, 4, 5, 6].filter((f) => f !== to);
    const n = Math.max(1, hops);
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      let face = to;
      if (!last) {
        const options = pool.filter((f) => f !== this.face);
        face = options[(i * 2 + this.face) % options.length];
      }
      const dx = (i % 2 === 0 ? 1 : -1) * (14 + i * 4);
      this.sfx('beans', { volume: 0.6, rate: 1.2 });
      await this.hopTo(this.home.x + (last ? 0 : dx), 18 + (n - i) * 3, 260, true);
      this.die.setAngle(0);
      this.setFace(face, { label: last });
      this.sfx('bounce', { volume: 0.5, rate: 1.3 });
      await this.wait(last ? 200 : 220);
    }
    this.sfx('land');
  }

  /** It sits still; a ring counts down `seconds` round it (the ten ceremonial seconds). */
  async hold(seconds = 10) {
    const r = 36;
    for (let n = 1; n <= seconds; n++) {
      setText(this.ringText, String(n));
      centerText(this.ringText, this.home.x);
      this.ring.clear();
      this.ring.lineStyle(2, 0xf8d86c, 0.9);
      this.ring.beginPath();
      this.ring.arc(this.home.x, this.home.y, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * n) / seconds, false);
      this.ring.strokePath();
      this.sfx('tick', { volume: 0.6 });
      await this.wait(1000);
    }
    this.ring.clear();
    setText(this.ringText, '');
  }

  hide() {
    return this.tween({ targets: [this.die, this.shadow, this.label], alpha: 0, duration: 220 }).then(() => this.destroy());
  }

  destroy() {
    for (const o of [this.die, this.shadow, this.label, this.ring, this.ringText]) o.destroy();
  }
}
