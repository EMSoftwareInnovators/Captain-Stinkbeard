import { resolvePreset, applyPresetPlan, presetEntry } from './presets.js';

const STOP_SCENES = ['Title', 'Menu', 'Battle', 'GameOver'];

/**
 * Starts a fresh game at a story preset (debug overlay "Story" tab and the
 * E2E hook window.__GAME__.test.preset). Returns the resolved plan.
 */
export function startPreset(game, id) {
  const app = game.app;
  const plan = resolvePreset(app.content, id);
  const session = app.startNewGame();
  applyPresetPlan(session, plan);
  app.overlay?.reset();
  app.cinema?.reset();
  app.audio.stopMusic({ fade: 0.3 });
  for (const key of STOP_SCENES) if (game.scene.isActive(key) || game.scene.isPaused(key)) game.scene.stop(key);
  if (game.scene.isPaused('World')) game.scene.resume('World');
  game.scene.start('World', presetEntry(plan));
  return plan;
}
