import { addPanel } from './Panel.js';
import { addText, setText, UI_COLORS } from './text.js';
import { ListMenu } from './ListMenu.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';
import { SES_BEZEL, SES_SCREEN } from '../art/vista/sesArt.js';
import { tvState, setPower, stepChannel, nextLines } from '../systems/tv/tv.js';
import { resolveVariant } from '../systems/story/progress.js';

/**
 * The television close-up you operate (Story Phase 5: the Stenchmaster
 * Entertainment System). Rules in systems/tv/tv.js; this draws it and takes
 * the controls. Cheap by design: the "CRT" is a frame-cycled screen image, a
 * scanline overlay, a glass glare, a glow rectangle and an alpha flicker. No
 * shaders. A roll is the screen image sliding and wrapping inside the glass.
 *
 * Menu: power, next / previous channel, look at the wiring, look at the power
 * source, slap the side (only while it's misbehaving), step away. The
 * captain's comments (and Garrick's, if he's in the room) appear underneath.
 */
const D = 740;
const rand = (a, b) => a + Math.random() * (b - a);

export class TvView {
  /**
   * @param {Phaser.Scene} scene the overlay
   * @param {object} def from systems/tv/tv.js tvDef
   * @param {{ present?: (id: string) => boolean, onClose: () => void }} opts
   */
  constructor(scene, def, { present = () => true, onClose }) {
    this.scene = scene;
    this.app = scene.game.app;
    this.session = this.app.session;
    this.def = def;
    this.present = present;
    this.onClose = onClose;
    this.view = 'front';
    this.failure = null;
    this.failTimer = this.nextFailure();
    this.humTimer = 0;
    this.t = 0;
    this.parts = [];
    this.build();
    this.flag(def.flags?.open);
    this.showLines(this.channelLines(true));
  }

  // --- building -------------------------------------------------------------------

  build() {
    const s = this.scene;
    const bx = Math.round((SCREEN_WIDTH - SES_BEZEL.w) / 2);
    const by = 4;
    this.bx = bx;
    this.by = by;
    const sx = bx + SES_SCREEN.x;
    const sy = by + SES_SCREEN.y;
    this.sx = sx;
    this.sy = sy;
    const add = (o) => {
      this.parts.push(o);
      return o;
    };
    add(s.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x07060b, 0.88).setOrigin(0).setDepth(D));
    this.glow = add(s.add.rectangle(sx - 6, sy - 6, SES_SCREEN.w + 12, SES_SCREEN.h + 12, 0xc8d0d8, 0.0).setOrigin(0).setDepth(D + 1));
    // The picture, and a second copy for the wrap while the picture rolls.
    this.screen = add(s.add.image(sx, sy, 'vista', 'tv_off').setOrigin(0).setDepth(D + 2));
    this.screen2 = add(s.add.image(sx, sy, 'vista', 'tv_off').setOrigin(0).setDepth(D + 2).setVisible(false));
    this.line = add(s.add.rectangle(sx + SES_SCREEN.w / 2, sy + SES_SCREEN.h / 2, SES_SCREEN.w, 2, 0xf4fff8, 1).setDepth(D + 3).setVisible(false));
    this.scan = add(s.add.image(sx, sy, 'vista', 'tv_scan').setOrigin(0).setDepth(D + 4).setAlpha(0.55));
    this.glare = add(s.add.image(sx, sy, 'vista', 'tv_glare').setOrigin(0).setDepth(D + 5));
    this.bezel = add(s.add.image(bx, by, 'vista', 'ses_bezel').setOrigin(0).setDepth(D + 6));
    this.osd = add(addText(s, sx + SES_SCREEN.w - 30, sy + 4, '', { color: 0x8af0a0, depth: D + 7 }));
    this.puffs = [];
    // the controls and the comments underneath
    const py = by + SES_BEZEL.h + 2;
    const ph = SCREEN_HEIGHT - py - 4;
    add(addPanel(s, 4, py, 112, ph, { depth: D + 8 }));
    add(addPanel(s, 118, py, SCREEN_WIDTH - 122, ph, { depth: D + 8 }));
    this.nameText = add(addText(s, 126, py + 6, '', { color: UI_COLORS.name, depth: D + 9 }));
    this.bodyText = add(addText(s, 126, py + 18, '', { depth: D + 9, maxWidth: SCREEN_WIDTH - 140 }));
    this.menu = new ListMenu(s, {
      x: 20, y: py + 6, width: 92, rows: Math.max(4, Math.floor((ph - 10) / 10)), rowHeight: 10, depth: D + 9,
      items: [], onSelect: (item) => this.choose(item.value), onCancel: () => this.close(),
    });
    this.refreshMenu();
    this.applyState(false);
  }

  refreshMenu() {
    const st = tvState(this.def, this.session);
    const items = [
      { label: st.power ? 'Turn it off' : 'Turn it on', value: 'power' },
      { label: 'Next channel', value: 'next', disabled: !st.power },
      { label: 'Previous channel', value: 'prev', disabled: !st.power },
      { label: 'The wiring', value: 'wiring' },
      { label: 'The power source', value: 'source' },
    ];
    if (this.failure) items.push({ label: 'Slap the side', value: 'slap', color: UI_COLORS.gold });
    items.push({ label: 'Step away', value: 'leave' });
    const keep = this.menu.selected?.value;
    const index = Math.max(0, items.findIndex((i) => i.value === keep));
    this.menu.setItems(items, index);
  }

  // --- state -> picture --------------------------------------------------------------

  applyState(animate = true) {
    const st = tvState(this.def, this.session);
    const front = this.view === 'front';
    this.bezel.setFrame(front ? 'ses_bezel' : this.view === 'wiring' ? 'ses_back' : 'ses_power_source');
    for (const p of [this.screen, this.scan, this.glare, this.glow, this.osd]) p.setVisible(front);
    if (!front) {
      this.screen2.setVisible(false);
      return;
    }
    if (!st.power) {
      this.screen.setFrame('tv_off');
      this.glow.setAlpha(0);
      this.osd.setText('');
      return;
    }
    this.channel = st.channel;
    this.frameT = 0;
    this.frameI = 0;
    this.screen.setFrame(this.channel?.frames?.[0] ?? 'tv_static_0');
    this.glow.setFillStyle(Phaser_hex(this.channel?.glow ?? '#c8d0d8'), 0.22);
    if (animate) {
      setText(this.osd, `CH ${this.channel?.label ?? this.channel?.id ?? ''}`);
      this.osdT = 1400;
    }
  }

  // --- the controls ---------------------------------------------------------------

  choose(value) {
    const audio = this.app.audio;
    const st = tvState(this.def, this.session);
    switch (value) {
      case 'power':
        if (this.view !== 'front') this.view = 'front';
        setPower(this.def, this.session, !st.power);
        audio.sfx(st.power ? 'tv_power_off' : 'tv_power_on');
        this.powerFx(!st.power);
        if (st.power) this.failure = null;
        this.showLines(st.power ? [] : this.channelLines(true));
        break;
      case 'next':
      case 'prev':
        if (this.view !== 'front') this.view = 'front';
        stepChannel(this.def, this.session, value === 'next' ? 1 : -1);
        audio.sfx('tv_click');
        this.applyState(true);
        this.showLines(this.channelLines(false));
        break;
      case 'wiring':
        this.view = 'wiring';
        audio.sfx('tv_click', { rate: 0.7 });
        this.applyState();
        this.flag(this.def.flags?.wiring);
        this.showLines(nextLines(this.def, this.session, 'wiring', this.def.wiring, this.present));
        break;
      case 'source':
        this.view = 'source';
        audio.sfx('tv_hum', { volume: 0.8 });
        this.applyState();
        this.flag(this.def.flags?.power);
        this.showLines(nextLines(this.def, this.session, 'power', this.def.powerSource, this.present));
        break;
      case 'slap':
        audio.sfx('tv_slap');
        this.scene.tweens.add({ targets: this.bezel, x: this.bx + 3, duration: 40, yoyo: true, repeat: 1 });
        this.endFailure();
        this.flag(this.def.flags?.slap);
        this.showLines(nextLines(this.def, this.session, 'slap', this.def.slap, this.present));
        break;
      default:
        this.close();
        return;
    }
    this.refreshMenu();
  }

  /** Power on: a bright line opens into the picture. Off: the picture folds to a dot. */
  powerFx(on) {
    const s = this.scene;
    this.line.setVisible(true).setScale(1, 1).setAlpha(1);
    if (on) {
      this.screen.setFrame('tv_off');
      this.line.setScale(0.05, 1);
      s.tweens.add({
        targets: this.line, scaleX: 1, duration: 140,
        onComplete: () => s.tweens.add({
          targets: this.line, scaleY: SES_SCREEN.h / 2, alpha: 0.2, duration: 160,
          onComplete: () => {
            this.line.setVisible(false);
            this.applyState(true);
          },
        }),
      });
    } else {
      this.applyState(false);
      this.line.setScale(1, SES_SCREEN.h / 2).setAlpha(0.6);
      s.tweens.add({
        targets: this.line, scaleY: 1, alpha: 1, duration: 120,
        onComplete: () => s.tweens.add({ targets: this.line, scaleX: 0.02, duration: 160, onComplete: () => this.line.setVisible(false) }),
      });
    }
  }

  // --- what gets said -----------------------------------------------------------

  channelLines(onOpen) {
    const st = tvState(this.def, this.session);
    if (!st.power) return nextLines(this.def, this.session, 'off', this.def.offComments ?? [], this.present);
    const ch = st.channel;
    if (!ch) return [];
    return nextLines(this.def, this.session, `ch${ch.id}`, ch.comments ?? [], this.present);
  }

  /** Shows a short exchange: the lines take turns, Confirm-free (they rotate). */
  showLines(lines) {
    this.lines = lines ?? [];
    this.lineI = 0;
    this.lineT = 0;
    this.renderLine();
  }

  renderLine() {
    const l = this.lines[this.lineI];
    if (!l) {
      setText(this.nameText, '');
      setText(this.bodyText, '');
      return;
    }
    const sp = l.speaker === 'player' ? 'captain' : l.speaker;
    setText(this.nameText, sp ? this.speakerName(sp) : '');
    setText(this.bodyText, l.text);
  }

  speakerName(id) {
    const sp = this.app.content.speaker(id);
    return (sp && resolveVariant(sp, this.session)?.name) ?? id;
  }

  flag(f) {
    if (f && !this.session.story.has(f)) this.session.story.set(f);
  }

  // --- the clock ---------------------------------------------------------------

  update(delta, input) {
    this.t += delta;
    this.menu.update(input);
    if (!this.menu) return;
    // Long exchanges advance by themselves, a line every couple of seconds.
    if (this.lines.length > 1 && this.lineI < this.lines.length - 1) {
      this.lineT += delta;
      if (this.lineT > 2300) {
        this.lineT = 0;
        this.lineI += 1;
        this.renderLine();
      }
    }
    const st = tvState(this.def, this.session);
    if (this.view !== 'front' || !st.power || !this.channel) {
      this.updatePuffs(delta);
      return;
    }
    // Frames, flicker, the hum.
    const frames = this.channel.frames ?? [];
    this.frameT += delta;
    if (frames.length > 1 && this.frameT >= (this.channel.frameMs ?? 300)) {
      this.frameT = 0;
      this.frameI = (this.frameI + 1) % frames.length;
      this.screen.setFrame(frames[this.frameI]);
      if (this.screen2.visible) this.screen2.setFrame(frames[this.frameI]);
    }
    this.screen.setAlpha(0.9 + Math.random() * 0.1);
    this.glow.setAlpha(0.16 + Math.sin(this.t / 300) * 0.05);
    if (this.osdT > 0) {
      this.osdT -= delta;
      if (this.osdT <= 0) setText(this.osd, '');
    }
    this.humTimer -= delta;
    if (this.humTimer <= 0) {
      this.humTimer = rand(1400, 2200);
      this.app.audio.sfx(this.channel.hum ?? 'tv_hum', { volume: 0.35 });
    }
    this.updateFailure(delta);
    this.updatePuffs(delta);
  }

  // --- misbehaving ----------------------------------------------------------------

  nextFailure() {
    const [a, b] = this.def.failures?.every ?? [9000, 16000];
    return rand(a, b);
  }

  updateFailure(delta) {
    const f = this.def.failures;
    if (!f?.kinds?.length) return;
    if (!this.failure) {
      this.failTimer -= delta;
      if (this.failTimer > 0) return;
      const kind = f.kinds[Math.floor(Math.random() * f.kinds.length)];
      this.failure = { kind, t: 0, roll: 0 };
      this.app.audio.sfx(kind === 'spark' ? 'tv_spark' : 'tv_buzz');
      if (kind === 'spark') this.spark();
      if (kind === 'smoke') this.smoke();
      this.refreshMenu();
      this.showLines(nextLines(this.def, this.session, 'failure', f.lines ?? [], this.present));
      return;
    }
    const fl = this.failure;
    fl.t += delta;
    const sx = this.sx;
    const sy = this.sy;
    if (fl.kind === 'roll') {
      // Vertical hold gone: the picture slides down and wraps round.
      fl.roll = (fl.roll + delta * 0.09) % SES_SCREEN.h;
      const r = Math.round(fl.roll);
      this.screen.setPosition(sx, sy + r).setCrop(0, 0, SES_SCREEN.w, SES_SCREEN.h - r);
      this.screen2.setVisible(true).setFrame(this.screen.frame.name).setPosition(sx, sy - SES_SCREEN.h + r).setCrop(0, SES_SCREEN.h - r, SES_SCREEN.w, r);
    } else if (fl.kind === 'buzz') {
      this.screen.x = sx + (Math.random() < 0.5 ? -1 : 1);
      if (fl.t > 2500) this.endFailure();
    } else if (fl.t > 3500) {
      this.endFailure();
    }
  }

  endFailure() {
    this.failure = null;
    this.failTimer = this.nextFailure();
    this.screen.setPosition(this.sx, this.sy).setCrop();
    this.screen2.setVisible(false);
    this.refreshMenu();
  }

  spark() {
    const s = this.scene;
    const x = this.bx + SES_BEZEL.w - 30;
    const y = this.by + 12;
    const img = s.add.image(x, y, 'vista', 'tv_spark_0').setDepth(D + 7);
    let i = 0;
    s.time.addEvent({ delay: 60, repeat: 5, callback: () => {
      i += 1;
      if (i > 5) img.destroy();
      else img.setFrame(`tv_spark_${i % 3}`);
    } });
  }

  smoke() {
    for (let i = 0; i < 6; i++) {
      const img = this.scene.add.image(this.bx + SES_BEZEL.w - 40 + rand(-6, 6), this.by + 20, 'vista', 'tv_smoke').setDepth(D + 7).setAlpha(0.7);
      this.puffs.push({ img, vy: rand(-14, -8), life: 1400 + i * 140 });
    }
  }

  updatePuffs(delta) {
    for (const p of this.puffs) {
      p.life -= delta;
      p.img.y += p.vy * (delta / 1000);
      p.img.setAlpha(Math.max(0, Math.min(0.7, p.life / 1400)));
      p.img.setScale(1 + (1400 - p.life) / 1400);
    }
    for (const p of this.puffs.filter((q) => q.life <= 0)) p.img.destroy();
    this.puffs = this.puffs.filter((q) => q.life > 0);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.app.audio.ui('cancel');
    this.menu.destroy();
    this.menu = null;
    for (const p of this.puffs) p.img.destroy();
    this.parts.forEach((p) => p.destroy());
    this.onClose?.();
  }
}

/** "#rrggbb" -> 0xrrggbb */
function Phaser_hex(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return Number.isFinite(n) ? n : 0xc8d0d8;
}
