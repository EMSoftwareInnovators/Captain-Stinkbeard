import { ALOFT_POSES } from '../../src/maps/compileMap.js';
import { coversTile, isObjectiveJob } from '../../src/world/inspectTarget.js';
import { liveSolid, live, activeWarps, activeSpawns, tilesOf } from './world.js';

/**
 * Room navigation and clutter, measured with the game's own movement rules
 * (WorldScene.isSolid / isBlocked, tests/storyStaging.js):
 *   - walls, unconditional props and every conditional prop, block or chest
 *     whose condition holds are solid;
 *   - stepping onto a door (a warp that exists now) leaves the room, so a
 *     walk never passes through one;
 *   - people block, except sleepers up in a hammock (people walk underneath)
 *     and placements marked "blocks" (deliberate gates, which the staging
 *     checks don't count either). Standing people can be squeezed past in the
 *     game, so "with people" figures are the pessimistic case.
 * Movement is 4-directional; interacting needs an orthogonal neighbour.
 */
const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

/** Breadth-first reach from the room's arrival points. Doors are reached (as exits) but never walked through. */
export function reachFrom(model, solid, warps, starts, blockedExtra = null) {
  const W = model.width;
  const H = model.height;
  // Later chapters can lay a second door over an old one; like WorldScene.warpAt, the first that applies wins.
  const warpAt = new Map();
  for (const w of warps) for (const [x, y] of tilesOf(w)) if (x >= 0 && y >= 0 && x < W && y < H) {
    const k = y * W + x;
    if (!warpAt.has(k)) warpAt.set(k, [w]);
  }
  const reached = new Uint8Array(W * H);
  const exits = new Set();
  const queue = [];
  for (const [x, y] of starts) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const k = y * W + x;
    for (const w of warpAt.get(k) ?? []) exits.add(w.id);
    if (reached[k]) continue;
    reached[k] = 1;
    queue.push(k);
  }
  for (let head = 0; head < queue.length; head++) {
    const k = queue[head];
    const x = k % W;
    const y = (k - x) / W;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const nk = ny * W + nx;
      if (reached[nk]) continue;
      const doors = warpAt.get(nk);
      if (doors) {
        for (const w of doors) exits.add(w.id);
        continue;
      }
      if (solid[nk] || blockedExtra?.has(nk)) continue;
      reached[nk] = 1;
      queue.push(nk);
    }
  }
  return { reached, exits };
}

/**
 * Articulation points of the reachable floor: tiles that, blocked, would cut
 * the reachable area in two. Doors are leaf nodes (a floor tile that is a
 * door's only neighbour is a choke point). Iterative, so large maps are fine.
 */
export function chokeTiles(model, reached, warps) {
  const W = model.width;
  const H = model.height;
  const door = new Set();
  for (const w of warps) for (const [x, y] of tilesOf(w)) if (x >= 0 && y >= 0 && x < W && y < H) door.add(y * W + x);
  const node = (k) => reached[k] === 1 || door.has(k);
  const neighbours = (k) => {
    const x = k % W;
    const y = (k - x) / W;
    const out = [];
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const nk = ny * W + nx;
      if (!node(nk)) continue;
      if (door.has(k) && door.has(nk)) continue; // two door tiles don't connect through each other
      out.push(nk);
    }
    return out;
  };
  const disc = new Int32Array(W * H).fill(-1);
  const low = new Int32Array(W * H);
  const parent = new Int32Array(W * H).fill(-1);
  const points = new Set();
  let t = 0;
  for (let root = 0; root < W * H; root++) {
    if (!node(root) || disc[root] >= 0) continue;
    disc[root] = low[root] = t++;
    let rootKids = 0;
    const stack = [[root, neighbours(root), 0]];
    while (stack.length) {
      const top = stack[stack.length - 1];
      const [u, ns] = top;
      if (top[2] < ns.length) {
        const v = ns[top[2]++];
        if (disc[v] < 0) {
          parent[v] = u;
          disc[v] = low[v] = t++;
          if (u === root) rootKids++;
          stack.push([v, neighbours(v), 0]);
        } else if (v !== parent[u]) low[u] = Math.min(low[u], disc[v]);
      } else {
        stack.pop();
        const p = parent[u];
        if (p >= 0) {
          low[p] = Math.min(low[p], low[u]);
          if (p !== root && low[u] >= disc[p]) points.add(p);
        }
      }
    }
    if (rootKids > 1) points.add(root);
  }
  // Doors themselves aren't floor: only floor tiles count as choke points.
  return [...points].filter((k) => !door.has(k)).sort((a, b) => a - b);
}

/**
 * Can the captain interact with an object? Inspect: face it from an
 * orthogonal neighbour (WorldScene.interactionTarget); a spot for an open
 * objective also works standing on it (jobUnderfoot). Trigger: step on it.
 */
export function interactable(model, o, reached) {
  const W = model.width;
  const H = model.height;
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  let tiles = tilesOf(o);
  if (o.rail && model.rails) {
    tiles = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (coversTile(o, x, y, model)) tiles.push([x, y]);
  }
  const onIt = tiles.some(([x, y]) => inside(x, y) && reached[y * W + x] === 1);
  if (o.type === 'trigger') return onIt;
  if (onIt && isObjectiveJob(o)) return true;
  return tiles.some(([x, y]) => DIRS.some(([dx, dy]) => inside(x + dx, y + dy) && reached[(y + dy) * W + x + dx] === 1));
}

/**
 * Everything the harness measures about one room at one point in the story.
 * @param {Map<string, object>} people npc id -> its live placement row in this room
 * @param {object} content the ContentDB (for prop definitions)
 */
export function analyzeRoom(content, model, session, people) {
  const W = model.width;
  const H = model.height;
  const solid = liveSolid(model, session);
  const warps = activeWarps(model, session);
  const spawns = activeSpawns(model, session);
  const starts = spawns.map((s) => [s.x, s.y]);
  const terrain = reachFrom(model, solid, warps, starts);
  const chokes = chokeTiles(model, terrain.reached, warps);
  const chokeSet = new Set(chokes);

  // People: non-aloft, non-gate placements block (the staging checks' rule).
  const standing = [...people].filter(([, o]) => !ALOFT_POSES.includes(o.pose) && !o.blocks);
  const occupied = new Set(standing.map(([, o]) => o.y * W + o.x));
  const crowd = reachFrom(model, solid, warps, starts, occupied);

  // Critical choke points: blocking one would cut an arrival point off from an exit or another arrival point.
  const keyTiles = [...starts.filter(([x, y]) => x >= 0 && y >= 0 && x < W && y < H)];
  const critical = [];
  for (const k of chokes) {
    const cut = reachFrom(model, solid, warps, keyTiles.slice(0, 1), new Set([k]));
    const lostExit = warps.some((w) => terrain.exits.has(w.id) && !cut.exits.has(w.id));
    const lostSpawn = keyTiles.some(([x, y]) => terrain.reached[y * W + x] && !cut.reached[y * W + x] && y * W + x !== k);
    if (lostExit || lostSpawn) critical.push(k);
  }
  const xy = (k) => `${k % W},${Math.floor(k / W)}`;

  // Props: fixtures (unconditional) and story props (conditional, live now).
  const liveProps = model.props.filter((p) => live(session, p.if));
  const anchors = new Map();
  for (const p of liveProps) {
    const k = `${p.x},${p.y}`;
    if (!anchors.has(k)) anchors.set(k, []);
    anchors.get(k).push(p.prop);
  }
  const stacked = [...anchors].filter(([, v]) => v.length > 1).map(([k, v]) => `${k} ${v.slice().sort().join('+')}`).sort();
  // Solid object-layer props whose footprints share a tile.
  const cover = new Map();
  for (const p of liveProps) {
    const def = content.props.get(p.prop);
    if (!def || def.solid === false || p.solid === false || (def.layer ?? 'object') !== 'object') continue;
    const [fw, fh] = def.footprint || [1, 1];
    for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) {
      const k = `${p.x + i},${p.y + j}`;
      cover.set(k, (cover.get(k) ?? 0) + 1);
    }
  }
  const overlapTiles = [...cover.values()].filter((n) => n > 1).length;

  // Interactions.
  const inspects = model.objects.filter((o) => (o.type === 'inspect' || o.type === 'trigger') && live(session, o.if));
  const unreachable = inspects.filter((o) => !interactable(model, o, terrain.reached));
  const unreachableWithPeople = inspects.filter((o) => interactable(model, o, terrain.reached) && !interactable(model, o, crowd.reached));
  const job = (o) => isObjectiveJob(o) || (o.type === 'trigger' && JSON.stringify(o.if ?? null).includes('objectiveActive'));
  const objRef = (o) => `${o.id}@${o.x},${o.y}`;

  let walkable = 0;
  for (let i = 0; i < W * H; i++) if (!solid[i]) walkable++;
  let reachable = 0;
  let reachableWithPeople = 0;
  for (let i = 0; i < W * H; i++) {
    reachable += terrain.reached[i];
    reachableWithPeople += crowd.reached[i];
  }
  const peopleList = [...people].map(([npc, o]) => `${npc}@${o.x},${o.y}${o.pose ? `:${o.pose}` : ''}`).sort();
  const onChoke = standing.filter(([, o]) => chokeSet.has(o.y * W + o.x)).map(([npc, o]) => `${npc}@${o.x},${o.y}`).sort();
  const onCritical = standing.filter(([, o]) => critical.includes(o.y * W + o.x)).map(([npc, o]) => `${npc}@${o.x},${o.y}`).sort();
  const onNav = standing.filter(([, o]) => terrain.reached[o.y * W + o.x]).length;

  return {
    size: `${W}x${H}`,
    walkable,
    blocked: W * H - walkable,
    reachable,
    reachableWithPeople,
    chokeTiles: chokes.length,
    criticalChokeTiles: critical.map(xy),
    exits: warps.map((w) => {
      const shadowedBy = warps.find((o) => o !== w && warps.indexOf(o) < warps.indexOf(w) && tilesOf(w).some(([x, y]) => tilesOf(o).some(([ox, oy]) => ox === x && oy === y)));
      return { id: w.id, at: `${w.x},${w.y}`, to: w.to?.map ?? null, locked: !!w.if && !live(session, w.if), shadowedBy: shadowedBy?.id ?? null, reachable: terrain.exits.has(w.id), reachableWithPeople: crowd.exits.has(w.id) };
    }).sort((a, b) => a.id.localeCompare(b.id)),
    spawns: spawns.map((s) => `${s.id}@${s.x},${s.y}`).sort(),
    people: peopleList,
    peopleOnNavTiles: onNav,
    peopleOnChokeTiles: onChoke,
    peopleOnCriticalChokeTiles: onCritical,
    props: { fixtures: liveProps.filter((p) => !p.if).length, story: liveProps.filter((p) => p.if).length },
    stackedProps: stacked,
    overlappingFootprintTiles: overlapTiles,
    interactables: inspects.length,
    unreachableObjectiveTargets: unreachable.filter(job).map(objRef).sort(),
    unreachableScenery: unreachable.filter((o) => !job(o)).map(objRef).sort(),
    blockedByPeople: unreachableWithPeople.map(objRef).sort(),
    fumeZones: (content.maps.get(model.id)?.fumes ?? []).filter((f) => live(session, f.if)).map((f) => `${f.id ?? '?'}:${f.level ?? '?'}`).sort(),
  };
}

/**
 * Reusable navigation check for future layout changes: which of these
 * points can the captain reach in this room now? A point is
 * { kind, id, x, y, w?, h?, type? } (type "trigger" means step on it,
 * anything else means stand next to it).
 */
export function checkPoints(content, model, session, points, people = new Map()) {
  const solid = liveSolid(model, session);
  const warps = activeWarps(model, session);
  const starts = activeSpawns(model, session).map((s) => [s.x, s.y]);
  const occupied = new Set([...people].filter(([, o]) => !ALOFT_POSES.includes(o.pose) && !o.blocks).map(([, o]) => o.y * model.width + o.x));
  const terrain = reachFrom(model, solid, warps, starts);
  const crowd = reachFrom(model, solid, warps, starts, occupied);
  return points.map((p) => {
    const o = { type: 'inspect', ...p };
    const isExit = warps.some((w) => w.id === p.id);
    return {
      ...p,
      reachable: isExit ? terrain.exits.has(p.id) : interactable(model, o, terrain.reached),
      reachableWithPeople: isExit ? crowd.exits.has(p.id) : interactable(model, o, crowd.reached),
    };
  });
}
