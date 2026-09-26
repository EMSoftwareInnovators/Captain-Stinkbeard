import { paintWindow } from '../art/ui/windows.js';
import { addTexture } from '../phaser/textures.js';

/** Returns (and caches) a texture key for a window of this size/style. */
export function windowTexture(scene, w, h, style = 'default') {
  const key = `win_${style}_${w}x${h}`;
  if (!scene.textures.exists(key)) addTexture(scene, key, { canvas: paintWindow(w, h, style) });
  return key;
}

/** A framed window image. Pixel-perfect at any size (painted, not stretched). */
export function addPanel(scene, x, y, w, h, { style = 'default', depth = 0, alpha = 1 } = {}) {
  const img = scene.add.image(x, y, windowTexture(scene, w, h, style)).setOrigin(0, 0).setDepth(depth).setAlpha(alpha);
  img.panelWidth = w;
  img.panelHeight = h;
  return img;
}
