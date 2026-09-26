import { toHtmlCanvas } from '../art/toHtmlCanvas.js';

/**
 * Bridges the engine-independent art pipeline (PixelCanvas + frame maps)
 * to Phaser textures, bitmap fonts and animations.
 */
export function addTexture(scene, key, { canvas, frames = {} }) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.addCanvas(key, toHtmlCanvas(canvas));
  for (const [name, f] of Object.entries(frames)) texture.add(name, 0, f.x, f.y, f.w, f.h);
  return texture;
}

/** Registers a grid texture whose frames are numbered 0..n-1 (tilesets). */
export function addGridTexture(scene, key, { canvas, frameWidth, frameHeight }) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.addCanvas(key, toHtmlCanvas(canvas));
  const cols = Math.floor(canvas.width / frameWidth);
  const rows = Math.floor(canvas.height / frameHeight);
  for (let i = 0; i < cols * rows; i++) texture.add(i, 0, (i % cols) * frameWidth, Math.floor(i / cols) * frameHeight, frameWidth, frameHeight);
  return texture;
}

/** Registers one of our pixel fonts (see art/font/buildFont.js) as a Phaser BitmapFont. */
export function addBitmapFont(scene, key, textureKey, font, texWidth, texHeight) {
  const chars = {};
  for (const [code, g] of Object.entries(font.glyphs)) {
    chars[code] = {
      x: g.x,
      y: g.y,
      width: g.w,
      height: g.h,
      centerX: Math.floor(g.w / 2),
      centerY: Math.floor(g.h / 2),
      xOffset: 0,
      yOffset: g.yOffset || 0,
      xAdvance: g.advance,
      data: {},
      kerning: {},
      u0: g.x / texWidth,
      v0: 1 - g.y / texHeight,
      u1: (g.x + g.w) / texWidth,
      v1: 1 - (g.y + g.h) / texHeight,
    };
  }
  scene.cache.bitmapFont.add(key, {
    data: { font: key, size: font.size, lineHeight: font.lineHeight, chars },
    texture: textureKey,
    frame: null,
  });
}

/** Creates animations "<texture>:<anim>" from { anim: [frameNames] }. */
export function addAnimations(scene, textureKey, anims, rates = {}) {
  for (const [name, frames] of Object.entries(anims)) {
    const key = `${textureKey}:${name}`;
    if (scene.anims.exists(key)) scene.anims.remove(key);
    const base = name.split('_')[0];
    const rate = rates[name] ?? rates[base] ?? 6;
    scene.anims.create({
      key,
      frames: frames.map((frame) => ({ key: textureKey, frame })),
      frameRate: rate,
      repeat: rate === 0 ? 0 : -1,
    });
  }
}
