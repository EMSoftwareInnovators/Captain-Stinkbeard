import { BaseScene } from './BaseScene.js';

/** Temporary stub (replaced by the full RPG menu). */
export class MenuScene extends BaseScene {
  constructor() {
    super('Menu');
  }
  create() {
    this.scene.stop();
    this.scene.resume('World');
  }
}
