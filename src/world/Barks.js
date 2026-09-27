import { addText, parseMarkup, measure, formatTokens } from '../ui/text.js';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../config/constants.js';

/**
 * "Barks": short speech bubbles over a character's head that do not stop the
 * game (a parrot screaming from below decks, crew shouting across the deck).
 * When the speaker is off screen the bubble sticks to the nearest screen
 * edge with a pointer toward them, so a voice can guide the player.
 */
const PAD_X = 5;
const PAD_Y = 3;
const MAX_W = 150;

export class Barks {
  constructor(scene) {
    this.scene = scene;
    this.app = scene.game.app;
    this.list = [];
  }

  /**
   * @param {{x:number,y:number}|object} target  actor (uses sprite) or world pixel point
   * @param {string} text   markup allowed
   * @param {{duration?:number, color?:number, shout?:boolean}} opts
   */
  show(target, text, { duration = 1800, color = 0xfff4e0, shout = false } = {}) {
    const s = this.scene;
    const formatted = formatTokens(text, { app: this.app, session: this.app.session });
    const plain = parseMarkup(formatted).text;
    const width = Math.min(MAX_W, measure(this.app.fontMetrics.main, plain));
    const body = addText(s, 0, 0, formatted, { maxWidth: MAX_W, depth: 80021, color });
    const lines = body.text.split('\n').length;
    const w = (body.textWidth ?? width) + PAD_X * 2;
    const h = lines * 11 + PAD_Y * 2 - 1;
    const g = s.add.graphics().setDepth(80020);
    const bark = { target, body, g, w, h, age: 0, duration, shout, pointer: s.add.graphics().setDepth(80020) };
    // Only one bubble per speaker at a time: the newest replaces the old.
    for (const b of this.list.filter((o) => o.target === target)) this.remove(b);
    this.list.push(bark);
    this.draw(bark);
    this.position(bark);
    return bark;
  }

  draw(b) {
    const g = b.g;
    g.clear();
    g.fillStyle(b.shout ? 0x3a0c10 : 0x0b0914, 0.88);
    g.fillRoundedRect(0, 0, b.w, b.h, 3);
    g.lineStyle(1, b.shout ? 0xe46452 : 0xb57f22, 1);
    g.strokeRoundedRect(0.5, 0.5, b.w - 1, b.h - 1, 3);
  }

  anchor(b) {
    const t = b.target;
    if (t.sprite) return { x: t.sprite.x, y: t.sprite.y - (t.sprite.displayHeight ? Math.min(46, t.sprite.displayHeight) : 44) };
    return { x: t.x, y: t.y };
  }

  position(b) {
    const cam = this.scene.cameras.main;
    const a = this.anchor(b);
    let x = Math.round(a.x - b.w / 2);
    let y = Math.round(a.y - b.h - 4);
    const minX = cam.scrollX + 4;
    const maxX = cam.scrollX + SCREEN_WIDTH - b.w - 4;
    const minY = cam.scrollY + 4;
    const maxY = cam.scrollY + SCREEN_HEIGHT - b.h - 30;
    const off = x < minX || x > maxX || y < minY || y > maxY;
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));
    b.g.setPosition(x, y);
    b.body.setPosition(x + PAD_X, y + PAD_Y + 1);
    const p = b.pointer;
    p.clear();
    p.fillStyle(b.shout ? 0xe46452 : 0xb57f22, 1);
    if (off) {
      // Arrow on the bubble edge nearest the speaker.
      const cx = x + b.w / 2;
      const cy = y + b.h / 2;
      const ang = Math.atan2(a.y - cy, a.x - cx);
      const ex = cx + Math.cos(ang) * (b.w / 2 + 3);
      const ey = cy + Math.sin(ang) * (b.h / 2 + 3);
      const px = Math.cos(ang);
      const py = Math.sin(ang);
      p.fillTriangle(ex + px * 5, ey + py * 5, ex - py * 3, ey + px * 3, ex + py * 3, ey - px * 3);
    } else {
      const tx = Math.round(Math.max(x + 4, Math.min(x + b.w - 8, a.x - 2)));
      p.fillStyle(b.shout ? 0x3a0c10 : 0x0b0914, 0.88);
      p.fillTriangle(tx, y + b.h - 1, tx + 5, y + b.h - 1, tx + 2, y + b.h + 3);
    }
  }

  update(dt) {
    for (const b of [...this.list]) {
      b.age += dt;
      if (b.age >= b.duration) {
        this.remove(b);
        continue;
      }
      this.position(b);
      const fadeIn = Math.min(1, b.age / 90);
      const fadeOut = Math.min(1, (b.duration - b.age) / 200);
      const a = Math.min(fadeIn, fadeOut);
      b.g.setAlpha(a);
      b.body.setAlpha(a);
      b.pointer.setAlpha(a);
      if (b.shout && b.age < 300) b.g.setScale(1 + 0.04 * Math.sin(b.age / 20), 1);
    }
  }

  remove(b) {
    b.g.destroy();
    b.body.destroy();
    b.pointer.destroy();
    this.list = this.list.filter((o) => o !== b);
  }

  clear() {
    for (const b of [...this.list]) this.remove(b);
  }
}
