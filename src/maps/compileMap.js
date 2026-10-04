import { hash32 } from '../core/Rng.js';
import { ContentError } from '../core/util.js';

/**
 * Compiles an ASCII-authored map (data/maps/**) into a MapModel.
 *
 * Map JSON (abridged):
 *   {
 *     "id": "galley", "name": "Galley", "tileset": "ship",
 *     "legend": { "#": "wall", ".": "galley_floor", " ": "void" },
 *     "tiles":    [ "#####", "#...#", ... ],       ground layer (required)
 *     "overhead": [ "     ", "  =  ", ... ],       drawn above characters (optional)
 *     "props":    [ "barrel 3 4", { "prop": "table", "x": 5, "y": 6 } ],
 *     "objects":  [ { "id": "stairs", "type": "warp", "x": 2, "y": 9, "to": {...} } ]
 *   }
 *
 * Tile *types* come from the tileset (data/tilesets/*.json) and resolve to
 * atlas frames through simple autotile rules:
 *   frame     one fixed frame
 *   variants  a frame picked by a stable position hash (weighted)
 *   column    top / mid / bottom / single pieces for vertical runs (walls)
 *   row       left / mid / right / single pieces for horizontal runs
 *
 * The result is engine-agnostic: plain arrays that the Phaser world scene,
 * the Tiled exporter and the validator all consume.
 */
export function compileMap(def, tileset, props = null) {
  const where = `map "${def.id}"`;
  if (!tileset) throw new ContentError(`${where}: unknown tileset "${def.tileset}"`);
  if (!Array.isArray(def.tiles) || def.tiles.length === 0) throw new ContentError(`${where}: "tiles" must be a non-empty array of strings`);
  const height = def.tiles.length;
  const width = Math.max(...def.tiles.map((r) => r.length));
  def.tiles.forEach((row, y) => {
    if (row.length !== width) throw new ContentError(`${where}: tiles row ${y} is ${row.length} wide, expected ${width}`);
  });
  if (def.overhead) {
    if (def.overhead.length !== height) throw new ContentError(`${where}: overhead has ${def.overhead.length} rows, expected ${height}`);
    def.overhead.forEach((row, y) => {
      if (row.length !== width) throw new ContentError(`${where}: overhead row ${y} is ${row.length} wide, expected ${width}`);
    });
  }

  const frameIndex = new Map(tileset.frames.map((name, i) => [name, i]));
  const legend = def.legend || {};
  const typeAt = (grid, x, y) => {
    if (y < 0 || y >= height || x < 0 || x >= width) return null;
    const ch = grid[y][x];
    return legend[ch] ?? null;
  };

  const resolveLayer = (grid, layerName) => {
    const out = new Int16Array(width * height).fill(-1);
    const solid = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ch = grid[y][x];
        if (layerName === 'overhead' && ch === ' ') continue;
        const typeId = legend[ch];
        if (typeId === undefined) throw new ContentError(`${where}: ${layerName} char "${ch}" at ${x},${y} is not in the legend`);
        const type = tileset.types[typeId];
        if (!type) throw new ContentError(`${where}: legend maps "${ch}" to unknown tile type "${typeId}"`);
        const frame = pickFrame(type, typeId, x, y, (dx, dy) => typeAt(grid, x + dx, y + dy), def.id);
        if (frame === null) continue; // e.g. "empty"
        const idx = frameIndex.get(frame);
        if (idx === undefined) throw new ContentError(`${where}: tile type "${typeId}" uses frame "${frame}" missing from tileset "${tileset.id}"`);
        out[y * width + x] = idx;
        if (type.solid) solid[y * width + x] = 1;
      }
    }
    return { out, solid };
  };

  const ground = resolveLayer(def.tiles, 'ground');
  const overhead = def.overhead ? resolveLayer(def.overhead, 'overhead') : { out: new Int16Array(width * height).fill(-1), solid: new Uint8Array(width * height) };
  const solid = new Uint8Array(width * height);
  for (let i = 0; i < solid.length; i++) solid[i] = ground.solid[i] | overhead.solid[i];

  // Things that are only solid while a condition holds (a prop, block or
  // chest with "if"): the world scene re-evaluates these as the story moves.
  const dynamicSolids = [];
  // Beds (props with "bed": true: hammocks, bedrolls), for sleepers to lie in.
  const beds = [];

  // Props: "id x y [flip]" shorthand or objects.
  const propList = (def.props || []).map((p, i) => {
    const rec = typeof p === 'string' ? parsePropString(p, where) : { ...p };
    rec.uid = rec.id ?? `prop${i}`;
    if (props) {
      const pdef = props.get(rec.prop);
      if (!pdef) throw new ContentError(`${where}: unknown prop "${rec.prop}" (props[${i}])`);
      const [fw, fh] = pdef.footprint || [1, 1];
      if (pdef.bed) beds.push({ x: rec.x, y: rec.y, w: fw, h: fh, if: rec.if ?? null, uid: rec.uid, prop: rec.prop, flip: !!rec.flip });
      if (pdef.solid !== false && rec.solid !== false && (pdef.layer ?? 'object') === 'object') {
        if (rec.if) dynamicSolids.push({ x: rec.x, y: rec.y, w: fw, h: fh, if: rec.if, source: `prop ${rec.uid}` });
        else {
          for (let j = 0; j < fh; j++) for (let k = 0; k < fw; k++) {
            const tx = rec.x + k;
            const ty = rec.y + j;
            if (tx >= 0 && ty >= 0 && tx < width && ty < height) solid[ty * width + tx] = 1;
          }
        }
      }
    }
    return rec;
  });

  const objects = (def.objects || []).map((o) => ({ ...o }));
  const spawns = {};
  for (const o of objects) {
    if (o.type === 'spawn') spawns[o.id] = { x: o.x, y: o.y, facing: o.facing || 'down' };
    if ((o.type === 'chest' || o.type === 'block') && o.solid !== false) {
      if (o.if) dynamicSolids.push({ x: o.x, y: o.y, w: o.w || 1, h: o.h || 1, if: o.if, source: `object ${o.id}` });
      else for (let j = 0; j < (o.h || 1); j++) for (let k = 0; k < (o.w || 1); k++) solid[(o.y + j) * width + o.x + k] = 1;
    }
  }
  for (const c of def.collision || []) {
    for (let j = 0; j < (c.h || 1); j++) for (let k = 0; k < (c.w || 1); k++) {
      const tx = c.x + k;
      const ty = c.y + j;
      if (tx >= 0 && ty >= 0 && tx < width && ty < height) solid[ty * width + tx] = c.solid === false ? 0 : 1;
    }
  }

  return {
    id: def.id,
    name: def.name || def.id,
    tileset: tileset.id,
    tileSize: tileset.tileSize || 16,
    width,
    height,
    ground: ground.out,
    overhead: overhead.out,
    solid,
    props: propList,
    objects,
    spawns,
    dynamicSolids,
    beds,
    meta: {
      music: def.music ?? null,
      musicFilter: def.musicFilter ?? null,
      ambience: def.ambience ?? null,
      background: def.background ?? 'void',
      lighting: def.lighting ?? null,
      bob: def.bob ?? 0,
      onEnter: def.onEnter ?? [],
      regions: def.regions ?? [],
      chapter: def.chapter ?? null,
      // Story-dependent overrides, first matching entry wins:
      //   musicVariants    [{ if, music?, ambience?, musicFilter? }]
      //   lightingVariants [{ if, ambient }]  (replaces the ambient colour)
      //   nameVariants     [{ if, name }]  (what the room is called now; Story Phase 8)
      musicVariants: def.musicVariants ?? [],
      lightingVariants: def.lightingVariants ?? [],
      nameVariants: def.nameVariants ?? [],
      // Environmental hazards (see systems/hazards/fumes.js).
      fumes: def.fumes ?? [],
      haze: def.haze ?? [],
      fumeCollapse: def.fumeCollapse ?? null,
      fumeSafeSpawn: def.fumeSafeSpawn ?? null,
      // Sharks around the ship (see systems/hazards/sharks.js):
      //   [{ if, level, below? }], first matching entry wins.
      sharks: def.sharks ?? [],
      // Shark Duty (Phase 4, see world/SharkDuty.js): [{ if, session }], first match runs.
      sharkDuty: def.sharkDuty ?? [],
      outdoor: (def.background ?? 'void') === 'ocean',
      // Story Phase 9: the captain is in something here (stage frames "<id>_<dir>": the rowboat).
      playerVehicle: def.playerVehicle ?? null,
    },
  };
}

function parsePropString(str, where) {
  const parts = str.trim().split(/\s+/);
  if (parts.length < 3) throw new ContentError(`${where}: prop "${str}" must be "propId x y [flip]"`);
  const [prop, x, y, ...flags] = parts;
  const rec = { prop, x: Number(x), y: Number(y) };
  if (!Number.isInteger(rec.x) || !Number.isInteger(rec.y)) throw new ContentError(`${where}: prop "${str}" has non-integer coordinates`);
  if (flags.includes('flip')) rec.flip = true;
  return rec;
}

function sameType(a, b, type) {
  if (a === null) return false;
  if (a === b) return true;
  return Array.isArray(type.joins) && type.joins.includes(a);
}

export function pickFrame(type, typeId, x, y, neighbour, seed = '') {
  if (type.empty) return null;
  if (type.frame) return type.frame;
  if (type.variants) {
    const weights = type.weights || type.variants.map(() => 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = hash32(seed, x, y, typeId) % total;
    for (let i = 0; i < type.variants.length; i++) {
      roll -= weights[i];
      if (roll < 0) return type.variants[i];
    }
    return type.variants[0];
  }
  if (type.mask) {
    // Edges (Story Phase 9's island): a frame per combination of sides that
    // meet other ground, "<frame>_<n>" with n = 1 north + 2 east + 4 south +
    // 8 west. "against" lists what counts as other ground (default: anything
    // not this type or one it "joins"); "edgeOut" makes the map's edge count.
    const m = type.mask;
    const other = (dx, dy) => {
      const t = neighbour(dx, dy);
      if (t === null) return !!m.edgeOut;
      return m.against ? m.against.includes(t) : !sameType(t, typeId, type);
    };
    const n = (other(0, -1) ? 1 : 0) | (other(1, 0) ? 2 : 0) | (other(0, 1) ? 4 : 0) | (other(-1, 0) ? 8 : 0);
    if (n === 0 && m.plain) return pickFrame({ variants: m.plain, weights: m.weights }, typeId, x, y, neighbour, seed);
    return `${m.frame}_${n}`;
  }
  if (type.column) {
    const up = sameType(neighbour(0, -1), typeId, type);
    const down = sameType(neighbour(0, 1), typeId, type);
    const p = type.column;
    if (!up && !down) return p.single ?? p.top;
    if (!up) return p.top;
    if (!down) return p.bottom;
    return p.mid;
  }
  if (type.row) {
    const left = sameType(neighbour(-1, 0), typeId, type);
    const right = sameType(neighbour(1, 0), typeId, type);
    const p = type.row;
    if (!left && !right) return p.single ?? p.mid;
    if (!left) return p.left;
    if (!right) return p.right;
    return p.mid;
  }
  throw new ContentError(`tile type "${typeId}" has no frame rule`);
}

/** Convenience lookups on a compiled map. */
export function isSolid(model, x, y) {
  if (x < 0 || y < 0 || x >= model.width || y >= model.height) return true;
  return model.solid[y * model.width + x] === 1;
}

/** Placement poses for someone in a bed: they need a bed prop under them (Actor LYING_POSES). */
export const BED_POSES = ['hammock', 'hammock_awake', 'bedroll'];
/** Of those, up in a hammock: off the floor, so people walk underneath (Actor.aloft). */
export const ALOFT_POSES = ['hammock', 'hammock_awake'];

/** The beds (props with "bed": true) covering a tile; `active(cond)` filters conditional ones. */
export function bedsAt(model, x, y, active = () => true) {
  return (model.beds ?? []).filter((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h && (!b.if || active(b.if)));
}
