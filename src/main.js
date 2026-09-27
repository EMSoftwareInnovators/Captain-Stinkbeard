import * as Phaser from 'phaser';
import { App } from './app/App.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './config/constants.js';
import { DisplayScaler } from './platform/display.js';
import { DEBUG_ENABLED } from './platform/env.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { WorldScene } from './scenes/WorldScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { OverlayScene } from './scenes/OverlayScene.js';
import { CinemaScene } from './scenes/CinemaScene.js';

/**
 * Entry point. Builds the App (content + services), then the Phaser game.
 * Scene order = draw order: later scenes render on top.
 */
async function main() {
  const app = new App();
  const scenes = [BootScene, TitleScene, WorldScene, BattleScene, MenuScene, GameOverScene, CinemaScene, OverlayScene];
  if (DEBUG_ENABLED) {
    const { DebugScene } = await import('./debug/DebugScene.js');
    scenes.push(DebugScene);
  }
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    pixelArt: true,
    backgroundColor: '#000000',
    scale: { mode: Phaser.Scale.NONE },
    audio: { noAudio: true },
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    banner: false,
    fps: { target: 60, smoothStep: true },
    scene: scenes,
  });
  game.app = app;
  app.game = game;
  game.events.on('prestep', (time) => app.input.update(time));
  game.events.once('ready', () => {
    app.display = new DisplayScaler({ container: document.getElementById('game'), canvas: game.canvas, mode: app.settings.get('scaleMode') });
    if (DEBUG_ENABLED) game.scene.start('Debug');
  });
  // Browsers only allow audio after a user gesture.
  const unlock = () => app.audio.unlock();
  window.addEventListener('keydown', unlock);
  window.addEventListener('pointerdown', unlock);
  if (DEBUG_ENABLED) {
    const { installTestHooks } = await import('./debug/testHooks.js');
    window.__GAME__ = { app, game, test: installTestHooks(app, game) };
  }
}

main();
