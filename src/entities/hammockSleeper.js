import { PAL, hexNumber } from '../art/palette.js';
import { FOOT_Y } from '../art/characters/characterPainter.js';

/**
 * Someone asleep in a hammock, drawn the way the hammock props draw their
 * sleepers: the head (the character's own sprite, eyes shut, cut off at the
 * neck) on the pillow end of the sling, sunk in a little, and a blanket lying
 * in the sling along the rest of it, following its sag.
 *
 * `bed` comes from WorldScene.bedAt: `left`/`top` are the hammock image's
 * top-left corner on screen and `width` its width, `sling` is [x0, x1, y,
 * sag] in image pixels (where the canvas starts and ends, its top edge at
 * the ends, and how far it sags in the middle), and `flip` mirrors it.
 */
const COLORS = {
  ink: hexNumber(PAL.ink),
  light: 0x6a7cb0,
  mid: 0x4a5a8a,
  dark: 0x36426a,
  edge: 0xe6dcc4,
};

/** The row where each character sheet's neck ends (the shoulders start), measured once per texture. */
const NECKS = new Map();
function neckRow(scene, key) {
  if (NECKS.has(key)) return NECKS.get(key);
  let neck = 26;
  try {
    const f = scene.textures.getFrame(key, 'sleep_down_0');
    const ctx = f?.source?.image?.getContext?.('2d', { willReadFrequently: true });
    if (ctx) {
      const px = ctx.getImageData(f.cutX, f.cutY, f.cutWidth, f.cutHeight).data;
      const width = (y) => {
        let a = -1;
        let b = -1;
        for (let x = 0; x < f.cutWidth; x++) {
          if (px[(y * f.cutWidth + x) * 4 + 3] === 0) continue;
          if (a < 0) a = x;
          b = x;
        }
        return a < 0 ? 0 : b - a + 1;
      };
      // The shoulders: the first row (below the face) a good deal wider than the one above it.
      for (let y = 18; y < Math.min(36, f.cutHeight); y++) {
        if (width(y) >= width(y - 1) + 4) {
          neck = y;
          break;
        }
      }
    }
  } catch {
    // keep the usual neck
  }
  NECKS.set(key, neck);
  return neck;
}

export class HammockSleeper {
  constructor(actor, bed) {
    this.actor = actor;
    this.bed = bed;
    this.band = actor.scene.add.graphics();
    this.layout();
  }

  /** The sling's top edge at image column x. */
  slingTop(x) {
    const [x0, x1, y, sag] = this.bed.sling;
    const t = Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));
    return y + Math.round(Math.sin(t * Math.PI) * sag);
  }

  layout() {
    const a = this.actor;
    const [x0, x1] = this.bed.sling;
    // Which end the head is at, in image columns (the image may be flipped).
    const headLeft = a.headLeft !== !!this.bed.flip;
    const neck = neckRow(a.scene, a.sprite.texture.key);
    a.sprite.setCrop(0, 0, a.sprite.frame.width, neck);
    const headCol = headLeft ? x0 + 7 : x1 - 7;
    const col = (x) => (this.bed.flip ? this.bed.width - 1 - x : x);
    // The chin sinks a few pixels into the canvas.
    this.headX = this.bed.left + col(headCol);
    this.spriteY = this.bed.top + this.slingTop(headCol) + 3 + (FOOT_Y - neck);
    this.headTop = this.spriteY - FOOT_Y + 8;
    // The blanket, from the shoulders to the far end of the sling.
    const g = this.band;
    g.clear();
    const from = headLeft ? x0 + 11 : x0 + 1;
    const to = headLeft ? x1 - 1 : x1 - 11;
    const feet = headLeft ? to : from;
    for (let x = from; x <= to; x++) {
      const st = this.slingTop(x);
      // Shoulders by the head, a lump for the knees, the feet up at the far end.
      const fromFeet = Math.abs(x - feet);
      const lump = fromFeet < 3 ? 1 : fromFeet > 6 && fromFeet < 10 ? 1 : 0;
      const top = st - 4 - lump;
      const bot = st + 3;
      const sx = col(x);
      g.fillStyle(COLORS.ink, 1).fillRect(sx, top - 1, 1, bot - top + 3);
      g.fillStyle(COLORS.mid, 1).fillRect(sx, top, 1, bot - top + 1);
      g.fillStyle(COLORS.light, 1).fillRect(sx, top, 1, 1);
      g.fillStyle(COLORS.dark, 1).fillRect(sx, bot - 1, 1, 2);
      // the turned-down edge under the chin
      if (Math.abs(x - (headLeft ? from : to)) <= 1) g.fillStyle(COLORS.edge, 1).fillRect(sx, top, 1, bot - top + 1);
    }
    // the ends of the blanket, outlined
    for (const x of [from - 1, to + 1]) {
      const st = this.slingTop(x);
      g.fillStyle(COLORS.ink, 1).fillRect(col(x), st - 4, 1, 8);
    }
    g.setPosition(this.bed.left, this.bed.top);
  }

  /** Keeps the head and blanket where the hammock is (called from Actor.syncPosition). */
  sync(depth) {
    const s = this.actor.sprite;
    s.setPosition(this.headX, this.spriteY);
    s.setDepth(depth);
    this.band.setDepth(depth + 0.2).setAlpha(s.alpha).setVisible(s.visible);
  }

  destroy() {
    this.actor.sprite.setCrop();
    this.band.destroy();
  }
}
