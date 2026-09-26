import { addTexture, addGridTexture, addBitmapFont, addAnimations } from './textures.js';
import { buildFonts } from '../art/font/buildFont.js';
import { buildUiAtlas } from '../art/ui/uiSprites.js';
import { buildItemIcons } from '../art/ui/itemIcons.js';
import { buildEffectsAtlas, paintOcean } from '../art/effects/effects.js';
import { paintTile } from '../art/tiles/shipTiles.js';
import { GridSheet, ShelfAtlas } from '../art/atlas.js';
import { PROP_PAINTERS, paintProp } from '../art/props/index.js';
import { buildCharacterSheet, buildBattleSheet } from '../art/characters/buildSheets.js';
import { ENEMY_PAINTERS, ENEMY_BATTLE_FRAMES } from '../art/enemies/enemyPainters.js';
import { paintPortrait } from '../art/portraits/portraitPainter.js';
import { paintBackdrop, BACKDROP_PAINTERS } from '../art/backdrops/backdrops.js';
import { paintTitleSky, paintTitleSea, paintTitleShip, paintLogo } from '../art/title/titleArt.js';
import { FIELD_DIRS } from '../art/characters/characterPainter.js';

/** Frame rates for character animations. */
const CHAR_RATES = { idle: 1.6, walk: 8, work: 3.5, sit: 0, point: 0, surprised: 0 };

/**
 * Builds every generated texture. Returned as a list of steps so the boot
 * scene can show progress between them.
 */
export function assetSteps(scene, app) {
  const content = app.content;
  return [
    ['fonts', () => {
      const { canvas, fonts } = buildFonts();
      addTexture(scene, 'fonts', { canvas });
      for (const [name, font] of Object.entries(fonts)) addBitmapFont(scene, name, 'fonts', font, canvas.width, canvas.height);
      app.fontMetrics = fonts;
    }],
    ['interface', () => {
      addTexture(scene, 'ui', buildUiAtlas(buildItemIcons()));
      const fx = buildEffectsAtlas();
      addTexture(scene, 'fx', fx);
      const seq = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}_${i}`);
      addAnimations(scene, 'fx', {
        slash: seq('slash', 4), impact: seq('impact', 3), bite: seq('bite', 3), sparkle: seq('sparkle', 4),
        buff: seq('buff', 4), debuff: seq('debuff', 4), smoke: seq('smoke', 4), gull: seq('gull', 4), wake: seq('wake', 4),
      }, { slash: 24, impact: 18, bite: 18, sparkle: 12, buff: 10, debuff: 10, smoke: 5, gull: 8, wake: 4 });
      for (const k of ['slash', 'impact', 'bite', 'sparkle', 'buff', 'debuff']) scene.anims.get(`fx:${k}`).repeat = 0;
      const ocean = paintOcean(4);
      addGridTexture(scene, 'ocean', { canvas: ocean, frameWidth: 64, frameHeight: 64 });
    }],
    ['tiles', () => {
      for (const ts of content.tilesets.list()) {
        const sheet = new GridSheet(ts.tileSize, ts.tileSize, 16);
        for (const frame of ts.frames) sheet.add(frame, paintTile(frame));
        const built = sheet.build();
        addGridTexture(scene, `tiles_${ts.id}`, { canvas: built.canvas, frameWidth: ts.tileSize, frameHeight: ts.tileSize });
      }
    }],
    ['props', () => {
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
      const built = atlas.build();
      addTexture(scene, 'props', built);
      addAnimations(scene, 'props', anims, rates);
      app.propFrames = built.frames;
      app.propAnims = anims;
    }],
    ['crew', () => {
      for (const appearance of content.appearances.list()) {
        const sheet = buildCharacterSheet(appearance);
        addTexture(scene, `char_${appearance.id}`, sheet);
        addAnimations(scene, `char_${appearance.id}`, sheet.anims, CHAR_RATES);
      }
    }],
    ['battlers', () => {
      for (const ch of content.characters.list()) {
        const app2 = content.appearances.get(ch.appearance);
        addTexture(scene, `battle_${ch.id}`, buildBattleSheet(app2));
        addAnimations(scene, `battle_${ch.id}`, { ready: ['ready', 'ready2'], victory: ['victory', 'victory2'] }, { ready: 2.4, victory: 3 });
      }
      for (const [id, painter] of Object.entries(ENEMY_PAINTERS)) {
        const field = new ShelfAtlas(256, 1);
        const fieldAnims = {};
        for (const dir of FIELD_DIRS) {
          fieldAnims[`walk_${dir}`] = [0, 1].map((f) => {
            field.add(`${dir}_${f}`, painter.field(dir, f));
            return `${dir}_${f}`;
          });
        }
        for (const frame of ENEMY_BATTLE_FRAMES) field.add(`battle_${frame}`, painter.battle(frame));
        const built = field.build();
        addTexture(scene, `enemy_${id}`, built);
        addAnimations(scene, `enemy_${id}`, { ...fieldAnims, battle_idle: ['battle_idle0', 'battle_idle1'] }, { walk: 6, battle_idle: 2.5 });
      }
    }],
    ['portraits', () => {
      const atlas = new ShelfAtlas(1024, 1);
      for (const p of content.portraits.list()) {
        const appearance = content.appearances.get(p.appearance ?? p.id);
        for (const expr of p.expressions) atlas.add(`${p.id}_${expr}`, paintPortrait(appearance, p, expr));
      }
      addTexture(scene, 'portraits', atlas.build());
    }],
    ['scenery', () => {
      for (const name of Object.keys(BACKDROP_PAINTERS)) addTexture(scene, `backdrop_${name}`, { canvas: paintBackdrop(name) });
      addTexture(scene, 'title_sky', { canvas: paintTitleSky() });
      addGridTexture(scene, 'title_sea', { canvas: paintTitleSea(2), frameWidth: 320, frameHeight: 74 });
      addTexture(scene, 'title_ship', { canvas: paintTitleShip() });
      addTexture(scene, 'logo', { canvas: paintLogo() });
    }],
  ];
}
