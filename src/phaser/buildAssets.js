import { addTexture, addGridTexture, addBitmapFont, addAnimations } from './textures.js';
import {
  fontSheet, uiSheet, fxSheet, oceanSheet, stormSkySheet, tileSheet, propAtlas, characterSheet, battlerSheet,
  enemySheet, ENEMY_IDS, portraitAtlas, BACKDROP_IDS, backdropImage, titleImages, FX_ONESHOT,
  fumeVignette, stageSheet, vistaSheet, insertSheet,
} from '../art/sheets.js';

/**
 * Builds every generated texture from the engine-independent sheet builders
 * in src/art/sheets.js. Returned as a list of steps so the boot scene can
 * show progress between them.
 */
export function assetSteps(scene, app) {
  const content = app.content;
  return [
    ['fonts', () => {
      const { canvas, fonts } = fontSheet();
      addTexture(scene, 'fonts', { canvas });
      for (const [name, font] of Object.entries(fonts)) addBitmapFont(scene, name, 'fonts', font, canvas.width, canvas.height);
      app.fontMetrics = fonts;
    }],
    ['interface', () => {
      addTexture(scene, 'ui', uiSheet());
      const fx = fxSheet();
      addTexture(scene, 'fx', fx);
      addAnimations(scene, 'fx', fx.anims, fx.rates);
      for (const k of FX_ONESHOT) scene.anims.get(`fx:${k}`).repeat = 0;
      addGridTexture(scene, 'ocean', oceanSheet());
      addGridTexture(scene, 'stormsky', stormSkySheet());
      addTexture(scene, 'fume_vignette', { canvas: fumeVignette() });
    }],
    ['tiles', () => {
      for (const ts of content.tilesets.list()) addGridTexture(scene, `tiles_${ts.id}`, tileSheet(ts));
    }],
    ['props', () => {
      const props = propAtlas();
      addTexture(scene, 'props', props);
      addAnimations(scene, 'props', props.anims, props.rates);
      app.propFrames = props.frames;
      app.propAnims = props.anims;
    }],
    ['crew', () => {
      for (const appearance of content.appearances.list()) {
        const sheet = characterSheet(appearance);
        addTexture(scene, `char_${appearance.id}`, sheet);
        addAnimations(scene, `char_${appearance.id}`, sheet.anims, sheet.rates);
      }
    }],
    ['battlers', () => {
      for (const ch of content.characters.list()) {
        const sheet = battlerSheet(content.appearances.get(ch.appearance));
        addTexture(scene, `battle_${ch.id}`, sheet);
        addAnimations(scene, `battle_${ch.id}`, sheet.anims, sheet.rates);
      }
      for (const id of ENEMY_IDS) {
        const sheet = enemySheet(id);
        addTexture(scene, `enemy_${id}`, sheet);
        addAnimations(scene, `enemy_${id}`, sheet.anims, sheet.rates);
      }
    }],
    ['portraits', () => {
      addTexture(scene, 'portraits', portraitAtlas(content));
    }],
    ['scenery', () => {
      for (const name of BACKDROP_IDS) addTexture(scene, `backdrop_${name}`, backdropImage(name));
      const title = titleImages();
      addTexture(scene, 'title_sky', title.title_sky);
      addGridTexture(scene, 'title_sea', title.title_sea);
      addTexture(scene, 'title_ship', title.title_ship);
      addTexture(scene, 'logo', title.logo);
    }],
    ['story', () => {
      const stage = stageSheet();
      addTexture(scene, 'stage', stage);
      addAnimations(scene, 'stage', stage.anims, stage.rates);
      addTexture(scene, 'vista', vistaSheet());
      addTexture(scene, 'inserts', insertSheet());
    }],
  ];
}
