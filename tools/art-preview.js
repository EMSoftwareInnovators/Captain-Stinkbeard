// Dev-only art preview: renders generated assets at high zoom for inspection.
// Open http://localhost:5173/tools/art-preview.html?only=<section>&zoom=3
import { toHtmlCanvas } from '../src/art/toHtmlCanvas.js';
import { buildFonts } from '../src/art/font/buildFont.js';

const params = new URLSearchParams(location.search);
const ZOOM = Number(params.get('zoom') || 3);
const only = params.get('only');
const root = document.getElementById('root');

export function section(title, dark = false) {
  const h = document.createElement('h2');
  h.textContent = title;
  const row = document.createElement('div');
  row.className = 'row' + (dark ? ' dark' : '');
  root.append(h, row);
  return row;
}

export function show(row, pc, label = '', zoom = ZOOM) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  const c = toHtmlCanvas(pc);
  c.style.width = `${pc.width * zoom}px`;
  c.style.height = `${pc.height * zoom}px`;
  cell.append(c);
  if (label) {
    const s = document.createElement('span');
    s.textContent = label;
    cell.append(s);
  }
  row.append(cell);
}

const sections = {
  async fonts() {
    const { canvas } = buildFonts();
    show(section('font atlas', true), canvas, 'fonts', 2);
  },
};

for (const [name, fn] of Object.entries(sections)) {
  if (!only || only.split(',').includes(name)) await fn();
}
window.__ok = true;

import { buildUiAtlas } from '../src/art/ui/uiSprites.js';
import { buildItemIcons } from '../src/art/ui/itemIcons.js';
import { paintWindow } from '../src/art/ui/windows.js';
if (!only || only.split(',').includes('ui')) {
  const row = section('ui');
  const { canvas } = buildUiAtlas(buildItemIcons());
  show(row, canvas, 'ui atlas', 4);
  show(row, paintWindow(120, 60), 'window', 3);
  show(row, paintWindow(80, 40, 'parchment'), 'parchment', 3);
  show(row, paintWindow(80, 40, 'inset'), 'inset', 3);
}

import { resolveLook, paintCharacterFrame, FIELD_POSES } from '../src/art/characters/characterPainter.js';
import appearances from '../data/appearances/ship_crew.json';
import portraits from '../data/portraits/ship_crew.json';
const pick = new URLSearchParams(location.search).get('who');
const TEST_LOOKS = appearances.filter((a) => !pick || pick.split(',').includes(a.id));
if (!only || only.split(',').includes('chars')) {
  for (const app of TEST_LOOKS) {
    const L = resolveLook(app);
    const row = section(app.id);
    for (const dir of ['down', 'left', 'up']) {
      for (const [name, frames] of Object.entries(FIELD_POSES)) {
        frames.forEach((pose, i) => show(row, paintCharacterFrame(L, dir, pose), `${dir} ${name}${i}`, 3));
      }
    }
  }
}

import { paintTile } from '../src/art/tiles/shipTiles.js';
import shipTileset from '../data/tilesets/ship.json';
if (!only || only.split(',').includes('tiles')) {
  const row = section('ship tiles');
  for (const f of shipTileset.frames) show(row, paintTile(f), f, 4);
}

import { PROP_PAINTERS, paintProp } from '../src/art/props/index.js';
if (!only || only.split(',').includes('props')) {
  const row = section('props');
  for (const name of Object.keys(PROP_PAINTERS)) {
    const { frames } = paintProp(name);
    show(row, frames[0], name, 3);
  }
}

import { ENEMY_PAINTERS, ENEMY_BATTLE_FRAMES } from '../src/art/enemies/enemyPainters.js';
import { paintBattleFrame, BATTLE_POSE_NAMES } from '../src/art/characters/battlePoses.js';
if (!only || only.split(',').includes('enemies')) {
  for (const [id, p] of Object.entries(ENEMY_PAINTERS)) {
    const row = section(id);
    for (const f of ENEMY_BATTLE_FRAMES) show(row, p.battle(f), f, 3);
    for (const d of ['down', 'left', 'right', 'up']) for (const f of [0, 1]) show(row, p.field(d, f), `${d}${f}`, 3);
  }
  const row = section('blackbeard battle');
  const L = resolveLook(TEST_LOOKS[0]);
  for (const pose of BATTLE_POSE_NAMES) show(row, paintBattleFrame(L, pose), pose, 3);
}

import { paintPortrait, EXPRESSIONS } from '../src/art/portraits/portraitPainter.js';
const TEST_PORTRAITS = Object.fromEntries(portraits.map((p) => [p.id, p]));
if (!only || only.split(',').includes('portraits')) {
  for (const app of TEST_LOOKS) {
    const row = section(`portrait ${app.id}`, true);
    for (const expr of Object.keys(EXPRESSIONS)) show(row, paintPortrait(app, TEST_PORTRAITS[app.id] || {}, expr), expr, 3);
  }
}
