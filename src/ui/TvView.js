import { addPanel } from './Panel.js';
import { addText, setText, UI_COLORS } from './text.js';
import { ListMenu } from './ListMenu.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';
import { SES_BEZEL, SES_SCREEN } from '../art/vista/sesArt.js';
import { tvState, setPower, setChannel, stepChannel, nextLines, tvCondition, programDef, programEpisode } from '../systems/tv/tv.js';
import { parseLine } from '../systems/script/parseLine.js';
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
 *
 * Story Phase 6 adds:
 *   - the set's condition (tv.js tvCondition): a dead set won't come on, a
 *     damaged one wears a different bezel and cracked glass, and now and
 *     then flickers back to half-life on its own;
 *   - programmes: a channel with "program" plays that show's episode, beat by
 *     beat, its lines underneath (data/tv/programs);
 *   - the knob panel ({ "tv": "ses", "mode": "knobs" }): the set's own knobs
 *     from data ("knobs"), each with an effect on the picture or the sound,
 *     until the one that switches it off has been tried enough times. No
 *     wrong answer is ever a dead end.
 *
 * Story Phase 7 adds a second set (S.E.S. Mark II, data/tv/ses_mk2.json):
 *   - a set can wear its own art ("bezel", "back", "powerFrame"; the
 *     original's by default);
 *   - knob effects "roll" (the picture loses its hold), "shriek" (a noise
 *     with no business coming out of a television) and "tune" (after enough
 *     tries, it finds a channel: the panel's way of ending in a programme
 *     rather than in darkness).
 *
 * Story Phase 10 adds more than one knob panel per set ("knobPanels", the tv
 * command's "panel"), knobs that only turn up after N other tries ("after":
 * the last idea), a "glimpse" effect (another picture for a moment), and a
 * condition that holds the picture to its own "frames" whatever the channel
 * (no reception), with its own "osd".
 */
const D = 740;
const rand = (a, b) => a + Math.random() * (b - a);

export class TvView {
  /**
   * @param {Phaser.Scene} scene the overlay
   * @param {object} def from systems/tv/tv.js tvDef
   * @param {{ present?: (id: string) => boolean, onClose: () => void }} opts
   */
  constructor(scene, def, { present = () => true, onClose, mode = 'normal', panel = null }) {
    this.scene = scene;
    this.app = scene.game.app;
    this.session = this.app.session;
    this.def = def;
    this.present = present;
    this.onClose = onClose;
    this.mode = mode;
    // Story Phase 10: a set can have more than one knob panel ("knobPanels"); the script names which.
    this.knobs = (panel && def.knobPanels?.[panel]) || def.knobs || null;
    this.knobKey = panel ? `${panel}_` : '';
    this.knobState = { vol: 0, flip: false, tint: 0, slow: false, shrink: false, tries: {} };
    this.flickerT = 2500;
    this.flickering = 0;
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
    this.glass = add(s.add.image(sx, sy, 'vista', 'tv_scan').setOrigin(0).setDepth(D + 5).setVisible(false));
    this.glare = add(s.add.image(sx, sy, 'vista', 'tv_glare').setOrigin(0).setDepth(D + 5));
    this.bezel = add(s.add.image(bx, by, 'vista', this.def.bezel ?? 'ses_bezel').setOrigin(0).setDepth(D + 6));
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
    if (this.mode === 'knobs') this.showLines(nextLines(this.def, this.session, `${this.knobKey}knobs_open`, this.knobs?.openLines ?? [], this.present));
  }

  refreshMenu() {
    const st = tvState(this.def, this.session);
    if (this.mode === 'knobs') {
      // A knob with "after" only turns up once that many other turns have been tried (the last idea).
      const turned = Object.values(this.knobState.tries).reduce((a, b) => a + b, 0);
      const knobs = (this.knobs?.list ?? []).filter((k) => !k.after || turned >= k.after)
        .map((k) => ({ label: k.label, value: `knob:${k.id}`, color: k.effect === 'off' || k.after ? UI_COLORS.gold : undefined }));
      knobs.push({ label: 'Step away', value: 'leave' });
      const keepK = this.menu.selected?.value;
      this.menu.setItems(knobs, Math.max(0, knobs.findIndex((i) => i.value === keepK)));
      return;
    }
    if (st.dead) {
      const dead = [
        { label: 'Try the power', value: 'deadpower' },
        { label: 'The wiring', value: 'wiring' },
        { label: 'The power source', value: 'source' },
        { label: 'Step away', value: 'leave' },
      ];
      const keepD = this.menu.selected?.value;
      this.menu.setItems(dead, Math.max(0, dead.findIndex((i) => i.value === keepD)));
      return;
    }
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
    const cond = tvCondition(this.def, this.session);
    const front = this.view === 'front';
    const d = this.def;
    this.bezel.setFrame(front ? cond.bezel ?? d.bezel ?? 'ses_bezel' : this.view === 'wiring' ? cond.back ?? d.back ?? 'ses_back' : d.powerFrame ?? 'ses_power_source');
    for (const p of [this.screen, this.scan, this.glare, this.glow, this.osd]) p.setVisible(front);
    this.glass.setVisible(front && !!cond.glass);
    if (cond.glass) this.glass.setFrame(cond.glass);
    this.program = null;
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
    // Story Phase 10: a condition can hold the picture to its own frames whatever
    // the channel (no reception: snow, and now and then a frame of something).
    this.condFrames = cond.frames ?? null;
    this.condFrameMs = cond.frameMs ?? null;
    if (!this.condFrames) this.startProgram();
    this.screen.setFrame(this.currentFrames()[0] ?? 'tv_static_0');
    this.glow.setFillStyle(Phaser_hex(this.channel?.glow ?? '#c8d0d8'), 0.22);
    if (animate) {
      setText(this.osd, cond.osd ?? `CH ${this.channel?.label ?? this.channel?.id ?? ''}`);
      this.osdT = 1400;
    }
  }

  // --- programmes (Story Phase 6) -----------------------------------------------------

  /** If the channel carries a programme, start its current episode from the top. */
  startProgram() {
    const prog = this.channel?.program ? programDef(this.app.content, this.channel.program) : null;
    this.program = prog;
    this.episode = prog ? programEpisode(prog, this.session) : null;
    this.beatI = -1;
    this.beatT = 0;
    if (this.episode) this.nextBeat();
  }

  get beat() {
    return this.episode?.beats?.[this.beatI] ?? null;
  }

  currentFrames() {
    if (this.condFrames) return this.condFrames;
    if (this.knobState.frog && this.program?.closeup) return this.program.closeup;
    return this.beat?.frames ?? this.channel?.frames ?? [];
  }

  nextBeat() {
    const beats = this.episode?.beats ?? [];
    if (!beats.length) return;
    this.beatI = (this.beatI + 1) % beats.length;
    this.beatT = 0;
    this.frameI = 0;
    this.frameT = 0;
    const b = this.beat;
    const k = this.knobState;
    const volume = Math.min(1, 0.5 + k.vol * 0.25);
    const rate = k.slow ? 0.5 : 1;
    if (b.sfx) this.app.audio.sfx(b.sfx, { volume, rate });
    if (b.laugh) this.app.audio.sfx(this.program.laugh ?? 'ftm_laugh', { volume: volume * 0.8, rate });
    if (b.line) {
      const l = parseLine(b.line);
      if (k.slow) l.text = l.text.toUpperCase().split(' ').join('... ');
      this.showLines([l]);
    }
    const f = this.currentFrames()[0];
    if (f) this.screen.setFrame(f);
  }

  // --- the knob panel (Story Phase 6) ----------------------------------------------

  turnKnob(id) {
    const knob = (this.knobs?.list ?? []).find((k) => k.id === id);
    if (!knob) return;
    const k = this.knobState;
    const audio = this.app.audio;
    audio.sfx(knob.sfx ?? 'tv_click', { rate: 0.8 + Math.random() * 0.4 });
    k.tries[id] = (k.tries[id] ?? 0) + 1;
    switch (knob.effect) {
      case 'louder':
        k.vol = Math.min(4, k.vol + (knob.amount ?? 1));
        setText(this.osd, `VOL ${'|'.repeat(4 + k.vol * 2)}`);
        this.osdT = 1600;
        this.scene.cameras.main.shake(160, 0.002 * k.vol * this.app.settings.shakeScale());
        break;
      case 'flip':
        k.flip = !k.flip;
        this.screen.setFlipY(k.flip);
        break;
      case 'tint':
        k.tint = (k.tint + 1) % 3;
        if (k.tint === 0) this.screen.clearTint();
        else this.screen.setTint(k.tint === 1 ? 0xb070e0 : 0x60f070);
        break;
      case 'slow':
        k.slow = !k.slow;
        break;
      case 'shrink':
        k.shrink = !k.shrink;
        this.screen.setScale(k.shrink ? 0.55 : 1);
        this.screen.setPosition(this.sx + (k.shrink ? SES_SCREEN.w * 0.225 : 0), this.sy + (k.shrink ? SES_SCREEN.h * 0.225 : 0));
        break;
      case 'glimpse':
        // Story Phase 10: another channel comes through for a moment (weather, cooking, an advert) and goes.
        this.glimpse = { frames: knob.frames ?? [], t: 0, ms: knob.ms ?? 1400, frameMs: knob.frameMs ?? 300 };
        if (this.glimpse.frames[0]) this.screen.setFrame(this.glimpse.frames[0]);
        break;
      case 'frog':
        k.frog = !k.frog;
        this.frameI = 0;
        break;
      case 'roll':
        // Story Phase 7: the picture loses its hold and slides (ends when slapped or another knob is turned).
        if (this.failure?.kind === 'roll') this.endFailure();
        else this.failure = { kind: 'roll', t: 0, roll: 0, knob: true };
        break;
      case 'shriek': {
        setText(this.osd, '!!!!!!');
        this.osdT = 1200;
        const sk = this.app.settings.shakeScale();
        if (sk > 0) this.scene.cameras.main.shake(260, 0.006 * sk);
        this.scene.tweens.add({ targets: this.bezel, x: this.bx + 2, duration: 30, yoyo: true, repeat: 3 });
        break;
      }
      case 'tune':
        if (k.tries[id] >= (knob.tries ?? 1)) {
          this.showLines(nextLines(this.def, this.session, `knob_${this.knobKey}${id}_done`, knob.doneLines ?? [], this.present));
          this.tuneIn(knob);
          return;
        }
        // Not yet: something nearly comes through the snow, and goes.
        this.screen2.setVisible(false);
        this.line.setVisible(true).setScale(1, 2).setAlpha(0.8);
        this.scene.time.delayedCall(350, () => this.line.setVisible(false));
        break;
      case 'off':
        if (k.tries[id] >= (knob.tries ?? 1)) {
          this.showLines(nextLines(this.def, this.session, `knob_${this.knobKey}${id}_done`, knob.doneLines ?? [], this.present));
          this.shutDown();
          return;
        }
        // Not yet: it shrinks to a dot, thinks about it, and comes back.
        this.line.setVisible(true).setScale(0.05, 1).setAlpha(1);
        this.scene.time.delayedCall(500, () => this.line.setVisible(false));
        break;
      default:
        break;
    }
    this.showLines(nextLines(this.def, this.session, `knob_${this.knobKey}${id}`, knob.lines ?? [], this.present));
  }

  /** OFF MAYBE, at last: the picture folds to a dot, the flag is set, the close-up shuts. */
  shutDown() {
    setPower(this.def, this.session, false);
    this.app.audio.sfx('tv_power_off');
    this.powerFx(false);
    this.flag(this.knobs?.doneFlag);
    this.knobsDone = true;
    this.scene.time.delayedCall(this.knobs?.closeAfter ?? 2600, () => this.close());
  }

  /** Story Phase 7: the panel finds a channel (the one the knob names), sets its flag and lets go. */
  tuneIn(knob) {
    if (this.failure) this.endFailure();
    // The flag first: a programme's newest episode may be waiting on it.
    this.flag(this.knobs?.doneFlag);
    setPower(this.def, this.session, true);
    if (knob.channel) setChannel(this.def, this.session, knob.channel);
    this.app.audio.sfx(knob.doneSfx ?? 'tv_power_on');
    this.applyState(true);
    this.knobsDone = true;
    this.scene.time.delayedCall(this.knobs?.closeAfter ?? 2600, () => this.close());
  }

  // --- the controls ---------------------------------------------------------------

  choose(value) {
    const audio = this.app.audio;
    const st = tvState(this.def, this.session);
    if (value.startsWith('knob:')) {
      if (!this.knobsDone) this.turnKnob(value.slice(5));
      // A knob that waits for others ("after") may have just turned up.
      if (!this.knobsDone && this.knobs?.list?.some((k) => k.after)) this.refreshMenu();
      return;
    }
    switch (value) {
      case 'deadpower':
        audio.sfx('tv_click', { rate: 0.6 });
        this.showLines(nextLines(this.def, this.session, `dead_${tvCondition(this.def, this.session).id}`, tvCondition(this.def, this.session).lookComments ?? [], this.present));
        break;
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
    if (st.dead) return nextLines(this.def, this.session, `dead_${tvCondition(this.def, this.session).id}`, tvCondition(this.def, this.session).lookComments ?? [], this.present);
    if (this.program && this.mode !== 'knobs') return [];
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
    if (st.dead && this.view === 'front') this.updateFlicker(delta);
    if (this.view !== 'front' || !st.power || !this.channel) {
      this.updatePuffs(delta);
      return;
    }
    // A programme moves on beat by beat.
    if (this.beat) {
      this.beatT += delta;
      if (this.beatT >= (this.beat.ms ?? 2600) * (this.knobState.slow ? 1.6 : 1)) this.nextBeat();
    }
    // Story Phase 10: a knob's glimpse of another channel, then back to whatever it was.
    if (this.glimpse) {
      const g = this.glimpse;
      g.t += delta;
      const i = Math.floor(g.t / g.frameMs) % Math.max(1, g.frames.length);
      if (g.frames[i]) this.screen.setFrame(g.frames[i]);
      if (g.t < g.ms) return;
      this.glimpse = null;
    }
    // Frames, flicker, the hum.
    const frames = this.currentFrames();
    const frameMs = this.condFrameMs ?? this.beat?.frameMs ?? this.channel.frameMs ?? 300;
    this.frameT += delta;
    if (frames.length > 1 && this.frameT >= frameMs) {
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

  /**
   * A dead set that isn't quite dead (shark-damaged): now and then a frame of
   * something comes up through the cracks with a crackle, and goes again.
   */
  updateFlicker(delta) {
    const f = tvCondition(this.def, this.session).flicker;
    if (!f?.frames?.length) return;
    if (this.flickering) {
      this.flickering -= delta;
      if (this.flickering <= 0) {
        this.flickering = 0;
        this.screen.setFrame('tv_off');
      }
      return;
    }
    this.flickerT -= delta;
    if (this.flickerT > 0) return;
    const [a, b] = f.every ?? [7000, 14000];
    this.flickerT = rand(a, b);
    this.flickering = f.ms ?? 450;
    this.screen.setVisible(true).setFrame(f.frames[Math.floor(Math.random() * f.frames.length)]);
    if (f.sfx) this.app.audio.sfx(f.sfx, { volume: 0.5 });
    if (f.lines?.length) this.showLines(nextLines(this.def, this.session, 'flicker', f.lines, this.present));
  }

  // --- misbehaving ----------------------------------------------------------------

  nextFailure() {
    const [a, b] = this.def.failures?.every ?? [9000, 16000];
    return rand(a, b);
  }

  updateFailure(delta) {
    const f = this.def.failures;
    if (!this.failure) {
      if (!f?.kinds?.length) return;
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
      // Vertical hold gone: the picture slides down and wraps round (a knob's roll stops when the panel says so).
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
