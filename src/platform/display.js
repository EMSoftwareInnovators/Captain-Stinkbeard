import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../config/constants.js';

/**
 * Scales the fixed 320x224 canvas to the window with CSS.
 *  - 'integer': largest whole-number multiple that fits (pixel-perfect)
 *  - 'fit': fill as much as possible keeping aspect ratio (nearest-neighbour)
 * Fullscreen uses the standard Fullscreen API on the page container.
 */
export class DisplayScaler {
  constructor({ container, canvas, mode = 'integer' }) {
    this.container = container;
    this.canvas = canvas;
    this.mode = mode;
    this.onResize = () => this.apply();
    window.addEventListener('resize', this.onResize);
    document.addEventListener('fullscreenchange', this.onResize);
    this.apply();
  }

  setMode(mode) {
    this.mode = mode;
    this.apply();
  }

  apply() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let scale = Math.min(w / SCREEN_WIDTH, h / SCREEN_HEIGHT);
    if (this.mode === 'integer') scale = Math.max(1, Math.floor(scale));
    this.canvas.style.width = `${Math.floor(SCREEN_WIDTH * scale)}px`;
    this.canvas.style.height = `${Math.floor(SCREEN_HEIGHT * scale)}px`;
    this.scale = scale;
  }

  static fullscreenSupported() {
    return !!document.documentElement.requestFullscreen;
  }

  static isFullscreen() {
    return !!document.fullscreenElement;
  }

  /** Must be called from a user gesture (key press counts). Returns a promise. */
  async setFullscreen(on) {
    try {
      if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      if (!on && document.fullscreenElement) await document.exitFullscreen();
      return true;
    } catch (err) {
      console.warn('Fullscreen request failed', err);
      return false;
    }
  }
}
