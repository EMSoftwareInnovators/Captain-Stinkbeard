import { BaseScene } from './BaseScene.js';
import { assetSteps } from '../phaser/buildAssets.js';
import { addText } from '../ui/text.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';
import { IS_DEV } from '../platform/env.js';

/**
 * Paints every texture, renders all audio, then opens the title screen.
 * Nothing is downloaded: the whole game is generated here.
 */
export class BootScene extends BaseScene {
  constructor() {
    super('Boot');
  }

  create() {
    this.cameras.main.setBackgroundColor('#06060b');
    this.run().catch((err) => this.fail(err));
  }

  async run() {
    const steps = assetSteps(this, this.app);
    // Fonts first so the loading screen can use them.
    steps[0][1]();
    const label = addText(this, 0, SCREEN_HEIGHT / 2 - 16, 'Rigging the ship...', { color: 0xc8b898 });
    label.x = Math.round(SCREEN_WIDTH / 2 - label.textWidth / 2);
    const barBg = this.add.rectangle(SCREEN_WIDTH / 2 - 60, SCREEN_HEIGHT / 2, 120, 5, 0x1a1320).setOrigin(0, 0);
    const bar = this.add.rectangle(SCREEN_WIDTH / 2 - 59, SCREEN_HEIGHT / 2 + 1, 1, 3, 0xe0ad38).setOrigin(0, 0);
    void barBg;
    const total = steps.length + 1;
    let done = 1;
    for (const [, fn] of steps.slice(1)) {
      await this.nextFrame();
      fn();
      done += 1;
      bar.width = Math.max(1, Math.round((118 * done) / (total + 1)));
    }
    if (IS_DEV && this.app.validation.errors.length) await this.showValidationErrors();

    // Audio renders in the background: title music first so it can start soon.
    const title = this.app.content.game.titleMusic;
    this.app.audioReady = this.app.audio.prepare({
      musicOrder: [title, 'ship_theme', 'battle', 'victory', 'game_over'],
      onProgress: (p) => {
        bar.width = Math.max(1, Math.round(118 * ((done + p) / (total + 1))));
      },
    });
    await this.app.audioReady;
    bar.width = 118;
    await this.wait(120);
    this.scene.launch('Overlay');
    this.scene.start('Title');
  }

  nextFrame() {
    return new Promise((r) => this.time.delayedCall(1, r));
  }

  /**
   * Development builds stop on broken content: the errors are listed on
   * screen (and in the console) until the developer presses confirm.
   */
  showValidationErrors() {
    const errs = this.app.validation.errors;
    console.error(`CONTENT VALIDATION FAILED (${errs.length})\n${errs.join('\n')}`);
    const parts = [this.add.rectangle(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0x2a0608, 0.96).setOrigin(0).setDepth(10)];
    parts.push(addText(this, 8, 6, `CONTENT ERRORS: ${errs.length}`, { font: 'bold', color: 0xff8070, depth: 11 }));
    let y = 22;
    for (const e of errs.slice(0, 14)) {
      const t = addText(this, 8, y, e.replace(/[<>{}]/g, ''), { maxWidth: SCREEN_WIDTH - 16, color: 0xffd8d0, depth: 11 });
      parts.push(t);
      y += t.text.split('\n').length * 11 + 2;
      if (y > SCREEN_HEIGHT - 28) break;
    }
    parts.push(addText(this, 8, SCREEN_HEIGHT - 14, 'See the console for the full list.  Press Z to continue anyway.', { color: 0xffffff, depth: 11 }));
    return new Promise((resolve) => {
      this.onConfirm = () => {
        parts.forEach((p) => p.destroy());
        resolve();
      };
    });
  }

  update() {
    if (this.onConfirm && this.controls.pressed('confirm')) {
      this.controls.consume('confirm');
      const fn = this.onConfirm;
      this.onConfirm = null;
      fn();
    }
  }

  fail(err) {
    console.error(err);
    this.children.removeAll();
    const t = this.add.text(8, 8, `Boot failed:\n${err.message}`, { fontFamily: 'monospace', fontSize: '8px', color: '#ff8080', wordWrap: { width: 300 } });
    t.setResolution(2);
  }
}
