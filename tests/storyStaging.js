import { compileMap } from '../src/maps/compileMap.js';
import { findPath } from '../src/maps/pathfinding.js';
import { evaluateCondition } from '../src/systems/conditions/conditions.js';

/**
 * The story-aware half of the staging checks (the static half is
 * src/content/staging.js). Plugged into the headless story player
 * (tests/storyHarness.js), it follows who stands where through every scene,
 * with the real story flags, props and NPC placements, and records:
 *
 *   - someone spawned or placed on a solid tile (walls, and props that are
 *     there at that point in the story), or still standing on one when the
 *     scene ends (a flying landing on furniture mid-scene is staging)
 *   - a scripted walk through a solid tile, or to a tile it can't reach
 *   - the captain boxed in (walls and people on every side) when a scene ends
 *   - a room where, from some arrival point, not every exit can be reached
 *     past the people standing in it (checked for every room, every time the
 *     player gets control back, so a crowd in a room the player isn't in yet
 *     is caught too). A placement marked "blocks": true is a deliberate gate
 *     (Garrick's toll road) and doesn't count.
 */
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export class StagingTracker {
  constructor(content, session) {
    this.content = content;
    this.session = session;
    this.models = new Map();
    this.issues = [];
    this.seen = new Set();
    this.map = null;
    this.actors = new Map(); // on the current map: id -> [x, y]
    this.player = null; // [x, y] when known
    this.hidden = new Set(); // props hidden by the current scene (hideObject "prop:<id>")
    this.gates = new Set(); // people placed as deliberate gates in the current room
    this.context = '';
  }

  issue(msg) {
    const key = `${this.context}: ${msg}`;
    if (this.seen.has(msg)) return;
    this.seen.add(msg);
    this.issues.push(key);
  }

  model(map) {
    if (!this.models.has(map)) {
      const def = this.content.maps.require(map);
      this.models.set(map, compileMap(def, this.content.tilesets.get(def.tileset), this.content.props));
    }
    return this.models.get(map);
  }

  solid(map, x, y) {
    const m = this.model(map);
    if (x < 0 || y < 0 || x >= m.width || y >= m.height) return true;
    if (map === this.map && this.hiddenAt(x, y)) return false;
    if (m.solid[y * m.width + x] === 1) return true;
    return m.dynamicSolids.some((d) => x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h && evaluateCondition(d.if, this.session));
  }

  /** A prop the scene hid (a chest being carried off) no longer stands in the way. */
  hiddenAt(x, y) {
    if (!this.hidden.size) return false;
    return this.model(this.map).props.some((p) => {
      if (!this.hidden.has(p.uid) && !this.hidden.has(p.prop)) return false;
      const [w, h] = this.content.props.get(p.prop)?.footprint ?? [1, 1];
      return x >= p.x && x < p.x + w && y >= p.y && y < p.y + h;
    });
  }

  hide(id) {
    if (typeof id === 'string' && id.startsWith('prop:')) this.hidden.add(id.slice(5));
  }

  show(id) {
    if (typeof id === 'string' && id.startsWith('prop:')) this.hidden.delete(id.slice(5));
  }

  /** Who a room shows right now: the first matching placement per NPC ("absent" = elsewhere). */
  placements(map, gates = null) {
    const out = new Map();
    const done = new Set();
    for (const o of this.model(map).objects) {
      if (o.type !== 'npc' || done.has(o.npc)) continue;
      if (o.if && !evaluateCondition(o.if, this.session)) continue;
      done.add(o.npc);
      if (!o.absent) out.set(o.npc, [o.x, o.y]);
      if (!o.absent && o.blocks) gates?.add(o.npc);
    }
    return out;
  }

  warps(map) {
    return this.model(map).objects.filter((o) => o.type === 'warp');
  }

  occupied(x, y, except = null) {
    for (const [id, p] of this.actors) if (id !== except && p[0] === x && p[1] === y) return id;
    return null;
  }

  // --- the world as scripts move it ------------------------------------------

  enter(map, { spawn = null, x, y } = {}) {
    this.map = map;
    this.hidden.clear();
    this.gates = new Set();
    this.actors = this.placements(map, this.gates);
    const sp = spawn ? this.model(map).spawns[spawn] : null;
    this.player = sp ? [sp.x, sp.y] : Number.isInteger(x) && Number.isInteger(y) ? [x, y] : null;
  }

  checkTile(who, x, y, what) {
    if (!this.map || !Number.isInteger(x) || !Number.isInteger(y)) return;
    if (this.solid(this.map, x, y)) this.issue(`${what} ${who} on a solid tile (${x},${y}) on ${this.map}`);
  }

  setPos(id, p) {
    if (id === 'player' || id === 'captain') this.player = p;
    else this.actors.set(id, p);
  }

  posOf(id) {
    return id === 'player' || id === 'captain' ? this.player : this.actors.get(id) ?? null;
  }

  spawn(npc, { id, x, y } = {}) {
    this.checkTile(id ?? npc, x, y, 'spawns');
    this.setPos(id ?? npc, [x, y]);
  }

  place(id, x, y) {
    this.checkTile(id, x, y, 'places');
    this.setPos(id, [x, y]);
  }

  despawn(id) {
    this.actors.delete(id);
  }

  fly(id, { to, land = true } = {}) {
    if (!Array.isArray(to)) return;
    // Landing on furniture is fair staging (on a barrel, into the gold); being
    // left there when the scene ends is not (checkStanding).
    if (land) this.setPos(id, [...to]);
    else if (id !== 'player' && id !== 'captain') this.actors.delete(id); // in the air: not in anyone's way
  }

  move(id, { path, to } = {}) {
    const from = this.posOf(id);
    if (Array.isArray(to)) {
      const [tx, ty] = to;
      if (this.map && this.solid(this.map, tx, ty)) this.issue(`sends ${id} to a solid tile (${tx},${ty}) on ${this.map}`);
      else if (from && this.map) {
        const m = this.model(this.map);
        if (!findPath(m.width, m.height, { x: from[0], y: from[1] }, { x: tx, y: ty }, (x, y) => this.solid(this.map, x, y))) {
          this.issue(`sends ${id} from ${from} to ${tx},${ty} on ${this.map}, which can't be reached`);
        }
      }
      this.setPos(id, [tx, ty]);
      return;
    }
    if (!Array.isArray(path) || !from || !this.map) return;
    let [x, y] = from;
    for (let i = 0; i < path.length; i++) {
      const d = DIRS[path[i]];
      const n = typeof path[i + 1] === 'number' ? path[++i] : 1;
      if (!d) break;
      for (let k = 0; k < n; k++) {
        x += d[0];
        y += d[1];
        if (this.solid(this.map, x, y)) {
          this.issue(`walks ${id} through a solid tile (${x},${y}) on ${this.map}`);
          this.setPos(id, [x, y]);
          return;
        }
      }
    }
    this.setPos(id, [x, y]);
  }

  /** The captain walks up to something to use it: stand on a free tile next to it. */
  approach(x, y, w = 1, h = 1) {
    if (!this.map) return;
    const around = [];
    for (let i = 0; i < w; i++) around.push([x + i, y - 1], [x + i, y + h]);
    for (let j = 0; j < h; j++) around.push([x - 1, y + j], [x + w, y + j]);
    const free = around.find(([ax, ay]) => !this.solid(this.map, ax, ay) && !this.occupied(ax, ay));
    if (free) this.player = free;
  }

  /** The captain steps onto a trigger: somewhere walkable inside it. */
  stepOn(x, y, w = 1, h = 1) {
    if (!this.map) return;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (!this.solid(this.map, x + i, y + j) && !this.occupied(x + i, y + j)) {
          this.player = [x + i, y + j];
          return;
        }
      }
    }
  }

  approachActor(id) {
    const p = this.actors.get(id);
    if (p) this.approach(p[0], p[1]);
  }

  // --- checks when the player has control -----------------------------------

  /** Nobody is left standing inside a wall or on furniture when a scene ends. */
  checkStanding() {
    if (!this.map) return;
    const all = [...this.actors].concat(this.player ? [['the captain', this.player]] : []);
    for (const [id, [x, y]] of all) {
      if (this.solid(this.map, x, y)) this.issue(`leaves ${id} standing on a solid tile (${x},${y}) on ${this.map}`);
    }
  }

  /** The captain must have somewhere to go when a scene hands control back. */
  checkNotBoxedIn() {
    if (!this.map || !this.player) return;
    const [px, py] = this.player;
    const warps = this.warps(this.map);
    const onWarp = (x, y) => warps.some((w) => x >= w.x && x < w.x + (w.w || 1) && y >= w.y && y < w.y + (w.h || 1));
    const free = Object.values(DIRS).some(([dx, dy]) => {
      const x = px + dx;
      const y = py + dy;
      return onWarp(x, y) || (!this.solid(this.map, x, y) && !this.occupied(x, y));
    });
    if (!free) this.issue(`the captain is boxed in at ${px},${py} on ${this.map} (walls and people on every side)`);
  }

  /**
   * From every arrival point of a room, every exit must be reachable past the
   * people standing in it. The current room uses who is actually there now;
   * other rooms use their placements for the current story.
   */
  checkRoom(map) {
    const m = this.model(map);
    const gates = new Set();
    const people = map === this.map ? this.actors : this.placements(map, gates);
    if (map === this.map) this.gates.forEach((g) => gates.add(g));
    const occupied = new Set([...people].filter(([id]) => !gates.has(id)).map(([, [x, y]]) => `${x},${y}`));
    const warps = this.warps(map);
    // Later chapters can lay a second door over an old one: stepping there reaches both.
    const warpsAt = (x, y) => warps.filter((w) => x >= w.x && x < w.x + (w.w || 1) && y >= w.y && y < w.y + (w.h || 1));
    for (const [spawnId, sp] of Object.entries(m.spawns)) {
      if (occupied.has(`${sp.x},${sp.y}`)) this.issue(`someone stands on the "${spawnId}" arrival point of ${map}`);
      const seen = new Set([`${sp.x},${sp.y}`]);
      const reached = new Set();
      const queue = [[sp.x, sp.y]];
      while (queue.length) {
        const [x, y] = queue.shift();
        for (const [dx, dy] of Object.values(DIRS)) {
          const nx = x + dx;
          const ny = y + dy;
          const k = `${nx},${ny}`;
          if (seen.has(k)) continue;
          seen.add(k);
          const doors = warpsAt(nx, ny);
          if (doors.length) {
            doors.forEach((w) => reached.add(w.id));
            continue; // stepping onto a door leaves the room
          }
          if (this.solid(map, nx, ny) || occupied.has(k)) continue;
          queue.push([nx, ny]);
        }
      }
      // The arrival point may itself be on a door (walking back through it).
      warpsAt(sp.x, sp.y).forEach((w) => reached.add(w.id));
      const missing = warps.filter((w) => !reached.has(w.id)).map((w) => w.id);
      if (missing.length) this.issue(`from the "${spawnId}" arrival point of ${map}, people or props cut off ${missing.join(', ')}`);
    }
  }

  /** Called whenever the player gets control back. */
  idle(context) {
    this.context = context;
    this.checkNotBoxedIn();
    for (const map of this.content.maps.ids()) this.checkRoom(map);
  }
}
