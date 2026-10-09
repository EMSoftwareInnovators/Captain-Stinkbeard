import { buildFonts } from './font/buildFont.js';
import { buildUiAtlas } from './ui/uiSprites.js';
import { buildItemIcons } from './ui/itemIcons.js';
import { buildEffectsAtlas, paintOcean, paintStormSky } from './effects/effects.js';
import { paintFumeVignette } from './effects/fumeArt.js';
import { buildStageAtlas } from './stage/stageArt.js';
import { buildVistaAtlas } from './vista/vistaArt.js';
import { buildInsertAtlas } from './inserts/insertArt.js';
import { paintTile } from './tiles/shipTiles.js';
import { GridSheet, ShelfAtlas } from './atlas.js';
import { PROP_PAINTERS, paintProp } from './props/index.js';
import { buildCharacterSheet, buildBattleSheet } from './characters/buildSheets.js';
import { ENEMY_PAINTERS, ENEMY_BATTLE_FRAMES } from './enemies/enemyPainters.js';
import { paintPortrait } from './portraits/portraitPainter.js';
import { paintParrotPortrait } from './characters/parrotPainter.js';
import { paintCardboardPortrait } from './characters/cardboardPainter.js';
import { paintBackdrop, BACKDROP_PAINTERS } from './backdrops/backdrops.js';
import { paintTitleSky, paintTitleSea, paintTitleShip, paintLogo } from './title/titleArt.js';
import { FIELD_DIRS } from './characters/characterPainter.js';

/**
 * Every generated sprite sheet, as plain PixelCanvas data. The browser turns
 * these into Phaser textures (src/phaser/buildAssets.js); Node writes them to
 * PNG files (tools/export-assets.mjs). Nothing here touches the DOM.
 *
 * Each builder returns { canvas, frames?, anims?, rates?, frameWidth?, frameHeight? }.
 */

const seq = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}_${i}`);

export function fontSheet() {
  const { canvas, fonts } = buildFonts();
  return { canvas, fonts };
}

export function uiSheet() {
  return buildUiAtlas(buildItemIcons());
}

export const FX_ANIMS = {
  slash: seq('slash', 4), impact: seq('impact', 3), bite: seq('bite', 3), sparkle: seq('sparkle', 4),
  buff: seq('buff', 4), debuff: seq('debuff', 4), smoke: seq('smoke', 4), gull: seq('gull', 4), wake: seq('wake', 4),
};
export const FX_RATES = { slash: 24, impact: 18, bite: 18, sparkle: 12, buff: 10, debuff: 10, smoke: 5, gull: 8, wake: 4 };
/** One-shot effect animations (everything else loops). */
export const FX_ONESHOT = ['slash', 'impact', 'bite', 'sparkle', 'buff', 'debuff'];

export function fxSheet() {
  return { ...buildEffectsAtlas(), anims: FX_ANIMS, rates: FX_RATES };
}

export function fumeVignette() {
  return paintFumeVignette();
}

export function oceanSheet() {
  return { canvas: paintOcean(4), frameWidth: 64, frameHeight: 64 };
}

/** Story Phase 10: the inside of the Great Sharkstorm (a map's "stormsky" background). */
export function stormSkySheet() {
  return { canvas: paintStormSky(4), frameWidth: 64, frameHeight: 64 };
}

/** Tileset image: frames in tileset order, 16 per row (frame index = tile id). */
export function tileSheet(tileset) {
  const sheet = new GridSheet(tileset.tileSize, tileset.tileSize, 16);
  for (const frame of tileset.frames) sheet.add(frame, paintTile(frame));
  return sheet.build();
}

export function propAtlas() {
  const atlas = new ShelfAtlas(1024, 1);
  const anims = {};
  const rates = {};
  for (const name of Object.keys(PROP_PAINTERS)) {
    const { frames, ms } = paintProp(name);
    if (frames.length === 1) atlas.add(name, frames[0]);
    else {
      anims[name] = frames.map((f, i) => {
        atlas.add(`${name}_${i}`, f);
        return `${name}_${i}`;
      });
      rates[name] = 1000 / ms;
    }
  }
  return { ...atlas.build(), anims, rates };
}

/** Field sprite rates (frames per second) by animation. */
export const CHAR_RATES = { idle: 1.6, walk: 8, work: 3.5, sit: 0, point: 0, surprised: 0 };

export function characterSheet(appearance) {
  const sheet = buildCharacterSheet(appearance);
  return { ...sheet, rates: { ...CHAR_RATES, ...(sheet.rates ?? {}) } };
}

export function battlerSheet(appearance) {
  return {
    ...buildBattleSheet(appearance),
    anims: { ready: ['ready', 'ready2'], victory: ['victory', 'victory2'] },
    rates: { ready: 2.4, victory: 3 },
  };
}

export const ENEMY_IDS = Object.keys(ENEMY_PAINTERS);

/** Field walk frames ("<dir>_<n>") and battle frames ("battle_<name>") for one enemy. */
export function enemySheet(id) {
  const painter = ENEMY_PAINTERS[id];
  const atlas = new ShelfAtlas(256, 1);
  const anims = {};
  for (const dir of FIELD_DIRS) {
    anims[`walk_${dir}`] = [0, 1].map((f) => {
      atlas.add(`${dir}_${f}`, painter.field(dir, f));
      return `${dir}_${f}`;
    });
  }
  for (const frame of ENEMY_BATTLE_FRAMES) atlas.add(`battle_${frame}`, painter.battle(frame));
  anims.battle_idle = ['battle_idle0', 'battle_idle1'];
  return { ...atlas.build(), anims, rates: { walk: 6, battle_idle: 2.5 } };
}

/** All portraits: frames "<portrait>_<expression>". */
export function portraitAtlas(content) {
  const atlas = new ShelfAtlas(1024, 1);
  for (const p of content.portraits.list()) {
    if (p.painter === 'parrot') {
      for (const expr of p.expressions) atlas.add(`${p.id}_${expr}`, paintParrotPortrait(p, expr));
      continue;
    }
    if (p.painter === 'cardboard') {
      for (const expr of p.expressions) atlas.add(`${p.id}_${expr}`, paintCardboardPortrait(p, expr));
      continue;
    }
    const appearance = content.appearances.get(p.appearance ?? p.id);
    for (const expr of p.expressions) atlas.add(`${p.id}_${expr}`, paintPortrait(appearance, p, expr));
  }
  return atlas.build();
}

export const BACKDROP_IDS = Object.keys(BACKDROP_PAINTERS);

export function backdropImage(name) {
  return { canvas: paintBackdrop(name) };
}

export function titleImages() {
  return {
    title_sky: { canvas: paintTitleSky() },
    title_sea: { canvas: paintTitleSea(2), frameWidth: 320, frameHeight: 74 },
    title_ship: { canvas: paintTitleShip() },
    logo: { canvas: paintLogo() },
  };
}

/** Free-moving stage sprites (bathtub, frigate, rowboat, meal, loot). */
export function stageSheet() {
  return buildStageAtlas();
}

/** Side-view vista art (skies, seas, ships, close-ups, masks). */
export function vistaSheet() {
  return buildVistaAtlas();
}

/** Framed close-ups with lettering. */
export function insertSheet() {
  return buildInsertAtlas();
}
