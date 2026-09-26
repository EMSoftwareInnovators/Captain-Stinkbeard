import { BaseScene } from './BaseScene.js';

/** Temporary stub (replaced by the full battle scene). */
export class BattleScene extends BaseScene {
  constructor() {
    super('Battle');
  }
  create(data) {
    this.time.delayedCall(300, () => {
      this.scene.stop();
      data.onEnd('win');
    });
  }
}
