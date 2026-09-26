/**
 * Shared scene transitions (title, game over and the pause menu all load
 * saves the same way).
 */

/** Scene data for WorldScene that resumes the loaded session where it was saved. */
export function worldEntryFromSession(session) {
  const loc = session.location;
  return { map: loc.map, x: loc.x, y: loc.y, facing: loc.facing, loaded: true };
}

/**
 * Loads a save slot and enters the world. On failure, shows why and returns
 * false without leaving the current scene.
 */
export async function loadSlotAndEnter(scene, slot, { stopScenes = [] } = {}) {
  const app = scene.game.app;
  const res = app.loadGame(slot);
  if (!res.ok) {
    app.audio.ui('buzzer');
    app.overlay.toasts.push({ text: `<r>Could not load:</> ${res.reason}`, hold: 3000 });
    return false;
  }
  for (const w of res.warnings ?? []) console.warn(w);
  app.audio.ui('save');
  app.audio.stopMusic({ fade: 0.8 });
  await app.overlay.fadeOut(500);
  app.overlay.reset();
  for (const key of stopScenes) if (scene.scene.isActive(key) || scene.scene.isPaused(key)) scene.scene.stop(key);
  scene.scene.start('World', worldEntryFromSession(app.session));
  return true;
}
