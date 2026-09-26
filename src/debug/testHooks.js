import { findPath } from '../maps/pathfinding.js';

/**
 * Development-only helpers used by automated end-to-end tests
 * (window.__GAME__.test). Never shipped in production builds.
 */
export function installTestHooks(app, game) {
  const world = () => game.scene.getScene('World');
  return {
    pathTo(x, y) {
      const w = world();
      const p = w.player;
      return findPath(w.model.width, w.model.height, { x: p.tx, y: p.ty }, { x, y }, (tx, ty) => w.isBlocked(tx, ty, p));
    },
    state() {
      const w = world();
      const s = app.session;
      return {
        map: w?.model?.id,
        x: w?.player?.tx,
        y: w?.player?.ty,
        facing: w?.player?.facing,
        flags: s?.story.allFlags(),
        quests: s?.quests.serialize(),
        gold: s?.inventory.gold,
        items: s?.inventory.serialize().items,
        hp: s?.party.leader()?.hp,
        level: s?.party.leader()?.level,
        scenes: game.scene.getScenes(true).map((sc) => sc.scene.key),
      };
    },
  };
}
