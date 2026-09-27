import { BaseScene } from './BaseScene.js';
import { FxPool } from '../world/FxPool.js';
import { addPanel } from '../ui/Panel.js';
import { addText, centerText } from '../ui/text.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';

/**
 * Full-screen illustrated shots for set-pieces, drawn above the world and
 * below the dialogue box:
 *
 * - **Vistas** (data/story/vistas/*.json): a side-view stage (sky, sea,
 *   layered sprites) that scripts animate while dialogue plays: the view
 *   through a telescope, a frigate panicking, the closing montage.
 *
 *     "bathtub_view": { "sky": "morning", "sea": "day", "horizon": 96, "mask": "telescope",
 *       "layers": [ { "id": "tub", "frame": "tub_0", "frames": ["tub_0", "tub_1"], "frameMs": 320,
 *                     "x": 160, "y": 150, "bob": 3 } ] }
 *
 *   Layer x/y are screen pixels (sprite origin: bottom centre).
 * - **Inserts**: a framed close-up (a jar's label) with a caption, dismissed
 *   with Confirm.
 */
export class CinemaScene extends BaseScene {
  constructor() {
    super('Cinema');
  }

  create() {
    this.app.cinema = this;
    this.active = null;
    this.insertOpen = null;
    this.fx = new FxPool(this, { max: 90 });
    this.cover = this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 1).setOrigin(0).setDepth(40).setAlpha(0);
    this.time0 = 0;
  }

  get busy() {
    return !!this.insertOpen;
  }

  update(time, delta) {
    this.time0 += delta;
    this.fx.update(delta);
    if (this.active) {
      for (const l of this.active.layers.values()) {
        if (l.frames && l.frames.length > 1 && !l.frozen) {
          const i = Math.floor(this.time0 / (l.frameMs ?? 300)) % l.frames.length;
          if (l.img.frame.name !== l.frames[i]) l.img.setFrame(l.frames[i]);
        }
        const bob = l.bob ? Math.round(Math.sin(this.time0 / (l.bobMs ?? 700) + l.phase) * l.bob) : 0;
        l.img.y = Math.round(l.y + bob);
        l.img.x = Math.round(l.x);
      }
      if (this.active.sea) {
        const f = Math.floor(this.time0 / 420) % 2;
        this.active.sea.setFrame(`sea_${this.active.def.sea ?? 'day'}_${f}`);
      }
    }
    const input = this.controls;
    if (this.insertOpen && !this.insertOpen.hold && this.insertOpen.ready && (input.pressed('confirm') || input.pressed('cancel'))) {
      input.consume('confirm');
      input.consume('cancel');
      this.app.audio.ui('confirm');
      this.closeInsert();
    }
  }

  // --- vistas -------------------------------------------------------------------

  async show(id, { mask, fade = 400, caption } = {}) {
    const def = this.app.content.vistas.require(id);
    if (this.active) this.clearVista();
    this.fx.clear();
    await this.fadeCover(1, fade / 2);
    const parts = [];
    const horizon = def.horizon ?? 100;
    const sky = this.add.image(0, 0, 'vista', `sky_${def.sky ?? 'day'}`).setOrigin(0).setDepth(0);
    parts.push(sky);
    let sea = null;
    if (def.sea !== false) {
      sea = this.add.image(0, horizon, 'vista', `sea_${def.sea ?? 'day'}_0`).setOrigin(0).setDepth(1);
      parts.push(sea);
    }
    const layers = new Map();
    (def.layers || []).forEach((l, i) => {
      const img = this.add.image(l.x, l.y, 'vista', l.frame).setOrigin(0.5, 1).setDepth(l.depth ?? 10 + i);
      if (l.flip) img.setFlipX(true);
      if (l.alpha !== undefined) img.setAlpha(l.alpha);
      if (l.scale) img.setScale(l.scale);
      if (l.hidden) img.setVisible(false);
      parts.push(img);
      layers.set(l.id, { ...l, img, phase: i * 1.7 });
    });
    const maskName = mask ?? def.mask;
    if (maskName) parts.push(this.add.image(0, 0, 'vista', `mask_${maskName}`).setOrigin(0).setDepth(900));
    if (caption ?? def.caption) {
      const t = addText(this, 0, 0, caption ?? def.caption, { color: 0xfff4e0, depth: 950 });
      const w = t.textWidth + 16;
      const panel = addPanel(this, Math.round((SCREEN_WIDTH - w) / 2), 8, w, 18, { depth: 949 });
      t.y = 12;
      centerText(t, SCREEN_WIDTH / 2);
      parts.push(panel, t);
    }
    this.active = { def, parts, layers, sea };
    await this.fadeCover(0, fade / 2);
  }

  async end({ fade = 400 } = {}) {
    if (!this.active) return;
    await this.fadeCover(1, fade / 2);
    this.clearVista();
    await this.fadeCover(0, fade / 2);
  }

  clearVista() {
    if (!this.active) return;
    for (const p of this.active.parts) {
      this.tweens.killTweensOf(p);
      p.destroy();
    }
    this.fx.clear();
    this.active = null;
  }

  layer(id) {
    const l = this.active?.layers.get(id);
    if (!l) throw new Error(`Vista has no layer "${id}"`);
    return l;
  }

  move(id, { x, y, duration = 1000, ease = 'Sine.InOut', alpha, scale, flip }) {
    const l = this.layer(id);
    if (flip !== undefined) l.img.setFlipX(flip);
    const props = {};
    if (x !== undefined) props.x = x;
    if (y !== undefined) props.y = y;
    const imgProps = {};
    if (alpha !== undefined) imgProps.alpha = alpha;
    if (scale !== undefined) imgProps.scale = scale;
    return new Promise((resolve) => {
      let pending = 0;
      const done = () => {
        pending -= 1;
        if (pending <= 0) resolve();
      };
      if (Object.keys(props).length) {
        pending += 1;
        this.tweens.add({ targets: l, ...props, duration, ease, onComplete: done });
      }
      if (Object.keys(imgProps).length) {
        pending += 1;
        this.tweens.add({ targets: l.img, ...imgProps, duration, ease, onComplete: done });
      }
      if (!pending) resolve();
    });
  }

  frame(id, frame) {
    const l = this.layer(id);
    l.frozen = true;
    l.img.setFrame(frame);
  }

  setVisible(id, visible) {
    this.layer(id).img.setVisible(visible);
  }

  fx(kind, { x, y, count }) {
    const opts = count !== undefined ? { count } : {};
    this.fxBurst(kind, x, y, opts);
  }

  fxBurst(kind, x, y, opts) {
    this.fx.burst(kind, x, y, { depth: 500, ...opts });
  }

  // --- inserts ------------------------------------------------------------------

  /** Close-up image with a caption; resolves when dismissed (or after `hold` ms). */
  insert(id, { caption, hold } = {}) {
    return new Promise((resolve) => {
      const parts = [];
      const img = this.add.image(SCREEN_WIDTH / 2, 0, 'inserts', id).setOrigin(0.5, 0).setDepth(1001);
      const h = img.height + (caption ? 22 : 8) + 16;
      const w = img.width + 20;
      const top = Math.max(4, Math.round((SCREEN_HEIGHT - h) / 2) - 20);
      img.y = top + 10;
      const back = this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x07060b, 0.6).setOrigin(0).setDepth(999);
      const panel = addPanel(this, Math.round((SCREEN_WIDTH - w) / 2), top, w, h, { depth: 1000 });
      parts.push(back, panel, img);
      if (caption) {
        const t = addText(this, 0, top + img.height + 16, caption, { color: 0xfff4e0, depth: 1002, maxWidth: w - 16 });
        centerText(t, SCREEN_WIDTH / 2);
        parts.push(t);
      }
      parts.forEach((p) => p.setAlpha(0));
      this.tweens.add({ targets: parts, alpha: (t) => (t === back ? 0.6 : 1), duration: 180 });
      this.app.audio.ui('menu_open');
      this.insertOpen = { parts, resolve, hold, ready: false };
      this.time.delayedCall(250, () => {
        if (this.insertOpen) this.insertOpen.ready = true;
      });
      if (hold) this.time.delayedCall(hold, () => this.closeInsert());
    });
  }

  closeInsert() {
    const ins = this.insertOpen;
    if (!ins) return;
    this.insertOpen = null;
    this.tweens.add({
      targets: ins.parts,
      alpha: 0,
      duration: 150,
      onComplete: () => ins.parts.forEach((p) => p.destroy()),
    });
    ins.resolve();
  }

  fadeCover(alpha, duration) {
    this.tweens.killTweensOf(this.cover);
    if (duration <= 0) {
      this.cover.setAlpha(alpha);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.tweens.add({ targets: this.cover, alpha, duration, onComplete: resolve });
    });
  }

  /** Clears everything (returning to the title). */
  reset() {
    this.clearVista();
    if (this.insertOpen) {
      this.insertOpen.parts.forEach((p) => p.destroy());
      this.insertOpen.resolve();
      this.insertOpen = null;
    }
    this.cover.setAlpha(0);
  }
}
