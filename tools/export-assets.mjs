// Exports every procedurally generated asset to plain files:
//
//   exports/sprites/*.png + *.json   sprite sheets with frame rectangles and animations
//   exports/tiled/*.tmj, *.tsj        maps as Tiled 1.10 JSON (tiles, collision, props, objects)
//
//   npm run export
//
// The game never loads these files (it paints its art at boot); they exist so
// artists can inspect/trace the art, maps can be opened in Tiled, and retro
// ports can convert the data. See docs/RETRO_PORT_NOTES.md.
import fs from 'node:fs';
import path from 'node:path';
import { encodePng } from './lib/png.mjs';
import { loadContentFromDisk } from './lib/content.mjs';
import { compileMap } from '../src/maps/compileMap.js';
import { PixelCanvas } from '../src/art/PixelCanvas.js';
import {
  fontSheet, uiSheet, fxSheet, oceanSheet, tileSheet, propAtlas, characterSheet, battlerSheet,
  enemySheet, ENEMY_IDS, portraitAtlas, BACKDROP_IDS, backdropImage, titleImages,
} from '../src/art/sheets.js';

const OUT = path.resolve(process.argv[2] ?? 'exports');
const SPRITES = path.join(OUT, 'sprites');
const TILED = path.join(OUT, 'tiled');
fs.mkdirSync(SPRITES, { recursive: true });
fs.mkdirSync(path.join(TILED, 'props'), { recursive: true });

const content = loadContentFromDisk();
let files = 0;

function writePng(file, canvas) {
  fs.writeFileSync(file, encodePng(canvas));
  files++;
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 1)}\n`);
  files++;
}

/** Writes <name>.png and, when the sheet has frames, <name>.json. */
function sheet(name, s) {
  writePng(path.join(SPRITES, `${name}.png`), s.canvas);
  const meta = {};
  if (s.frames && Object.keys(s.frames).length) meta.frames = Object.fromEntries(Object.entries(s.frames).map(([k, f]) => [k, { x: f.x, y: f.y, w: f.w, h: f.h }]));
  if (s.frameWidth) Object.assign(meta, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
  if (s.anims) meta.animations = s.anims;
  if (s.rates) meta.framesPerSecond = s.rates;
  if (Object.keys(meta).length) writeJson(path.join(SPRITES, `${name}.json`), meta);
}

// --- sprite sheets -----------------------------------------------------------
const fonts = fontSheet();
sheet('fonts', { canvas: fonts.canvas });
writeJson(path.join(SPRITES, 'fonts.json'), fonts.fonts);
sheet('ui', uiSheet());
sheet('fx', fxSheet());
sheet('ocean', oceanSheet());
for (const ts of content.tilesets.list()) sheet(`tiles_${ts.id}`, tileSheet(ts));
const props = propAtlas();
sheet('props', props);
for (const a of content.appearances.list()) sheet(`char_${a.id}`, characterSheet(a));
for (const ch of content.characters.list()) sheet(`battle_${ch.id}`, battlerSheet(content.appearances.get(ch.appearance)));
for (const id of ENEMY_IDS) sheet(`enemy_${id}`, enemySheet(id));
sheet('portraits', portraitAtlas(content));
for (const id of BACKDROP_IDS) sheet(`backdrop_${id}`, backdropImage(id));
for (const [name, img] of Object.entries(titleImages())) sheet(name, img);

// --- Tiled ------------------------------------------------------------------
const T = 16;

function crop(src, f) {
  const c = new PixelCanvas(f.w, f.h);
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) c.px[y * f.w + x] = src.px[(f.y + y) * src.width + f.x + x];
  return c;
}

// Prop images: one PNG each (first frame of animated props) in an image-collection tileset.
const propTiles = [];
const propGid = new Map();
for (const name of Object.keys(props.frames)) {
  const base = props.anims[name.replace(/_\d+$/, '')] ? name.replace(/_\d+$/, '') : name;
  if (base !== name && !name.endsWith('_0')) continue;
  const f = props.frames[name];
  const id = propTiles.length;
  writePng(path.join(TILED, 'props', `${base}.png`), crop(props.canvas, f));
  propTiles.push({ id, image: `props/${base}.png`, imagewidth: f.w, imageheight: f.h, properties: [{ name: 'prop', type: 'string', value: base }] });
  propGid.set(base, id);
}
writeJson(path.join(TILED, 'props.tsj'), {
  type: 'tileset', version: '1.10', tiledversion: '1.10.2', name: 'props', tilewidth: 128, tileheight: 128,
  tilecount: propTiles.length, columns: 0, grid: { orientation: 'orthogonal', width: 1, height: 1 }, margin: 0, spacing: 0, tiles: propTiles,
});

// Collision tileset: a single translucent red tile.
const solidTile = new PixelCanvas(T, T);
for (let i = 0; i < T * T; i++) solidTile.px[i] = 0x803040e0 >>> 0;
writePng(path.join(TILED, 'collision.png'), solidTile);
writeJson(path.join(TILED, 'collision.tsj'), {
  type: 'tileset', version: '1.10', tiledversion: '1.10.2', name: 'collision', tilewidth: T, tileheight: T,
  tilecount: 1, columns: 1, image: 'collision.png', imagewidth: T, imageheight: T, margin: 0, spacing: 0,
  tiles: [{ id: 0, properties: [{ name: 'solid', type: 'bool', value: true }] }],
});

for (const ts of content.tilesets.list()) {
  const s = tileSheet(ts);
  writePng(path.join(TILED, `${ts.id}.png`), s.canvas);
  writeJson(path.join(TILED, `${ts.id}.tsj`), {
    type: 'tileset', version: '1.10', tiledversion: '1.10.2', name: ts.id, tilewidth: ts.tileSize, tileheight: ts.tileSize,
    tilecount: ts.frames.length, columns: s.columns, image: `${ts.id}.png`, imagewidth: s.canvas.width, imageheight: s.canvas.height,
    margin: 0, spacing: 0,
    tiles: ts.frames.map((name, id) => ({ id, properties: [{ name: 'frame', type: 'string', value: name }] })),
  });
}

const prop = (name, value) => ({ name, type: typeof value === 'number' ? (Number.isInteger(value) ? 'int' : 'float') : typeof value === 'boolean' ? 'bool' : 'string', value: typeof value === 'object' ? JSON.stringify(value) : value });

for (const def of content.maps.list()) {
  const tileset = content.tilesets.require(def.tileset);
  const m = compileMap(def, tileset, content.props);
  const firstTile = 1;
  const firstCollision = firstTile + tileset.frames.length;
  const firstProp = firstCollision + 1;
  const toGids = (layer) => Array.from(layer, (v) => (v < 0 ? 0 : v + firstTile));
  let objectId = 1;
  const propObjects = m.props.map((p) => {
    const pdef = content.props.get(p.prop);
    const [fw, fh] = pdef.footprint || [1, 1];
    const sprite = pdef.sprite ?? pdef.id;
    const tile = propTiles[propGid.get(sprite)];
    const w = tile?.imagewidth ?? fw * T;
    const h = tile?.imageheight ?? fh * T;
    let y = (p.y + fh) * T;
    if (sprite === 'mast_top' || sprite === 'foremast_top') y -= 64;
    const gid = tile ? (firstProp + tile.id + (p.flip ? 0x80000000 : 0)) >>> 0 : undefined;
    return {
      id: objectId++, name: p.prop, type: 'prop', gid, x: (p.x + fw / 2) * T - w / 2, y, width: w, height: h, rotation: 0, visible: true,
      properties: [prop('tileX', p.x), prop('tileY', p.y), prop('layer', pdef.layer ?? 'object')],
    };
  });
  const gameObjects = m.objects.map((o) => {
    const extra = Object.entries(o).filter(([k]) => !['id', 'type', 'x', 'y', 'w', 'h'].includes(k));
    return {
      id: objectId++, name: o.id, type: o.type, x: o.x * T, y: o.y * T, width: (o.w || 1) * T, height: (o.h || 1) * T, rotation: 0, visible: true,
      properties: extra.map(([k, v]) => prop(k, v)),
    };
  });
  const layer = (id, name, data, extra = {}) => ({ id, name, type: 'tilelayer', width: m.width, height: m.height, x: 0, y: 0, opacity: 1, visible: true, data, ...extra });
  const mapProps = Object.entries({ name: m.name, ...m.meta }).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => prop(k, v));
  writeJson(path.join(TILED, `${m.id}.tmj`), {
    type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
    width: m.width, height: m.height, tilewidth: T, tileheight: T, infinite: false, compressionlevel: -1,
    nextlayerid: 6, nextobjectid: objectId, properties: mapProps,
    tilesets: [
      { firstgid: firstTile, source: `${tileset.id}.tsj` },
      { firstgid: firstCollision, source: 'collision.tsj' },
      { firstgid: firstProp, source: 'props.tsj' },
    ],
    layers: [
      layer(1, 'ground', toGids(m.ground)),
      { id: 2, name: 'props', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: propObjects },
      layer(3, 'overhead', toGids(m.overhead)),
      layer(4, 'collision', Array.from(m.solid, (v) => (v ? firstCollision : 0)), { opacity: 0.45, visible: false }),
      { id: 5, name: 'objects', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects: gameObjects },
    ],
  });
}

console.log(`Exported ${files} files to ${path.relative(process.cwd(), OUT) || OUT}`);
