import * as Phaser from 'phaser';

/** Shared helpers for every scene: access to the App services. */
export class BaseScene extends Phaser.Scene {
  /** @returns {import('../app/App.js').App} */
  get app() {
    return this.game.app;
  }

  /** Our unified keyboard/gamepad input (Phaser's own input plugins are disabled). */
  get controls() {
    return this.game.app.input;
  }

  get session() {
    return this.game.app.session;
  }

  /** Promise that resolves after `ms` of this scene's (pausable) clock. */
  wait(ms) {
    return new Promise((resolve) => {
      if (ms <= 0) resolve();
      else this.time.delayedCall(ms, resolve);
    });
  }

  tweenAsync(config) {
    return new Promise((resolve) => this.tweens.add({ ...config, onComplete: () => resolve() }));
  }
}
