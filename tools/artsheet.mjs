#!/usr/bin/env node
/**
 * Renders chosen generated art into one scaled PNG contact sheet for review:
 *
 *   node tools/artsheet.mjs out.png char:garrick_stenchmaster:idle_down_0 portrait:garrick:proud \
 *        prop:frog_grog_cask stage:fin_h_0 vista:revenge_puffed icon:frog_grog insert:ship_names
 *
 * `char:<appearance>` alone shows its idle frame in all four directions.
 */
import fs from 'node:fs';
import { encodePng } from './lib/png.mjs';
import { loadContentFromDisk } from './lib/content.mjs';
import { PixelCanvas } from '../src/art/PixelCanvas.js';
import { characterSheet, propAtlas, stageSheet, vistaSheet, insertSheet, uiSheet } from '../src/art/sheets.js';
import { paintPortrait } from '../src/art/portraits/portraitPainter.js';
import { paintParrotPortrait } from '../src/art/characters/parrotPainter.js';

const [out, ...specs] = process.argv.slice(2);
const content = loadContentFromDisk();
const cache = {};
const sheet = (name, build) => (cache[name] ??= build());

function crop(built, frame) {
  const r = built.frames[frame];
  if (!r) throw new Error(`no frame ${frame}`);
  const c = new PixelCanvas(r.w, r.h);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) c.set(x, y, built.canvas.get(r.x + x, r.y + y));
  return c;
}

const pieces = [];
for (const spec of specs) {
  const [kind, id, arg] = spec.split(':');
  if (kind === 'char') {
    const built = sheet(`char_${id}`, () => characterSheet(content.appearances.require(id)));
    const names = arg ? [arg] : ['idle_down_0', 'idle_left_0', 'idle_right_0', 'idle_up_0'];
    for (const n of names) pieces.push(crop(built, n));
  } else if (kind === 'portrait') {
    const p = content.portraits.require(id);
    const c = p.painter === 'parrot' ? paintParrotPortrait(p, arg ?? 'neutral') : paintPortrait(content.appearances.get(p.appearance ?? p.id), p, arg ?? 'neutral');
    pieces.push(c);
  } else if (kind === 'prop') pieces.push(crop(sheet('props', propAtlas), sheet('props', propAtlas).frames[id] ? id : `${id}_${arg ?? 0}`));
  else if (kind === 'stage') pieces.push(crop(sheet('stage', stageSheet), id));
  else if (kind === 'vista') pieces.push(crop(sheet('vista', vistaSheet), id));
  else if (kind === 'insert') pieces.push(crop(sheet('inserts', insertSheet), id));
  else if (kind === 'icon') pieces.push(crop(sheet('ui', uiSheet), `icon_${id}`));
  else if (kind === 'status') pieces.push(crop(sheet('ui', uiSheet), `status_${id}`));
  else throw new Error(`unknown kind ${kind}`);
}

const scale = 3;
const pad = 4;
const maxW = 1400;
let x = pad;
let y = pad;
let rowH = 0;
const placed = [];
for (const p of pieces) {
  const w = p.width * scale;
  const h = p.height * scale;
  if (x + w > maxW) {
    x = pad;
    y += rowH + pad;
    rowH = 0;
  }
  placed.push({ p, x, y });
  x += w + pad;
  rowH = Math.max(rowH, h);
}
const W = maxW;
const H = y + rowH + pad;
const canvas = new PixelCanvas(W, H);
canvas.rect(0, 0, W, H, '#3a6a8a');
for (const { p, x: px, y: py } of placed) {
  for (let j = 0; j < p.height; j++) {
    for (let i = 0; i < p.width; i++) {
      const v = p.get(i, j);
      if (!(v >>> 24)) continue;
      canvas.rect(px + i * scale, py + j * scale, scale, scale, v);
    }
  }
}
fs.writeFileSync(out, encodePng(canvas));
console.log(`wrote ${out} (${W}x${H}, ${pieces.length} pieces)`);
