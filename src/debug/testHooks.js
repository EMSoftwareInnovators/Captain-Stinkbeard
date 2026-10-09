import { findPath } from '../maps/pathfinding.js';
import { DIR_VECTORS } from '../config/constants.js';
import { startPreset } from './startPreset.js';
import { resolveVariant } from '../systems/story/progress.js';
import { logAvailable, logEntries } from '../systems/logs/logbook.js';
import { placementChoices, roomGuard } from '../world/placements.js';

/**
 * Development-only helpers used by automated end-to-end tests
 * (window.__GAME__.test). Never shipped in production builds.
 */
export function installTestHooks(app, game) {
  const world = () => game.scene.getScene('World');

  /** Walkable for scripted test walking: never path across a warp by accident. */
  const blockedFor = (w, p, gx, gy) => (tx, ty) => w.isBlocked(tx, ty, p) || (!!w.warpAt(tx, ty) && !(tx === gx && ty === gy));

  /** Next move for the player to stand next to (x, y) and face it. */
  function stepTowardTile(w, x, y) {
    const p = w.player;
    for (const [dir, v] of Object.entries(DIR_VECTORS)) {
      if (p.tx + v.x === x && p.ty + v.y === y) return { done: true, face: dir };
    }
    let best = null;
    for (const v of Object.values(DIR_VECTORS)) {
      const gx = x - v.x;
      const gy = y - v.y;
      if (w.isBlocked(gx, gy, p) || w.warpAt(gx, gy)) continue;
      const path = findPath(w.model.width, w.model.height, { x: p.tx, y: p.ty }, { x: gx, y: gy }, blockedFor(w, p, gx, gy));
      if (path && (!best || path.length < best.length)) best = path;
    }
    return best && best.length ? { dir: best[0] } : { stuck: true };
  }

  return {
    /** Starts a fresh game at a story preset (data/debug/presets.json). */
    preset(id) {
      return startPreset(game, id).id;
    },
    pathTo(x, y) {
      const w = world();
      const p = w.player;
      return findPath(w.model.width, w.model.height, { x: p.tx, y: p.ty }, { x, y }, blockedFor(w, p, x, y));
    },
    /** target: an actor id (NPC) or [x, y] tile to interact with. */
    stepToward(target) {
      const w = world();
      if (Array.isArray(target)) return stepTowardTile(w, target[0], target[1]);
      const a = w.actors.get(target);
      if (!a) return { missing: true };
      if (a.moving) return { wait: true };
      return stepTowardTile(w, a.tx, a.ty);
    },
    /**
     * Each character with a placement in this room: where the story wants
     * them (null = elsewhere), where they are (null = not here) and whether
     * they are still walking there (live restaging); `roams` for people who
     * wander or walk a routine from their spot.
     */
    placements() {
      const w = world();
      return [...placementChoices(w.model.objects, app.session, roomGuard(app.content.npcs, w.model.id))].map(([npc, o]) => {
        const a = w.actors.get(npc);
        const roams = ['wander', 'routine'].includes(a?.brain?.behavior?.type);
        return { npc, want: o ? [o.x, o.y] : null, at: a ? [a.tx, a.ty] : null, roams, relocating: !!a?.brain?.relocation || !!a?.moving };
      });
    },
    /** Starts a battle from the current map; the result lands in `lastBattle`. */
    battle(id, advantage = 'normal') {
      const w = world();
      this.lastBattle = null;
      w.scriptDepth += 1;
      w.startBattle(id, { advantage }).then((r) => {
        w.scriptDepth -= 1;
        this.lastBattle = r;
      });
    },
    lastBattle: null,
    battleScene() {
      return game.scene.getScene('Battle');
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
        vars: s?.story.serialize?.().vars,
        exposure: s?.transient?.exposure?.value ?? 0,
        busy: w ? w.isBusy() : null,
        quests: s?.quests.serialize(),
        gold: s?.inventory.gold,
        items: s?.inventory.serialize().items,
        hp: s?.party.leader()?.hp,
        level: s?.party.leader()?.level,
        scenes: game.scene.getScenes(true).map((sc) => sc.scene.key),
        // Story Phase 3
        captain: s?.party.leader()?.fullName,
        garrickTitle: s && app.content.npcs.get('garrick') ? resolveVariant(app.content.npcs.get('garrick'), s).title : null,
        sharks: w?.sharks ? { level: w.sharks.level, below: w.sharks.below, fins: w.sharks.fins.length } : null,
        logs: s ? Object.fromEntries([...app.content.logs.map].map(([id, log]) => [id, logAvailable(log, s) ? logEntries(log, s).length : 0])) : {},
      };
    },
  };
}
