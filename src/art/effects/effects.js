import { PixelCanvas } from '../PixelCanvas.js';
import { PAL } from '../palette.js';
import { ShelfAtlas } from '../atlas.js';
import { addFumeEffects } from './fumeArt.js';

/** Small animated effects: slashes, impacts, sparkles, smoke, shadows, gulls. */
function slash(frame) {
  const c = new PixelCanvas(40, 40);
  const start = -1.2 + frame * 0.5;
  for (let t = 0; t < 1; t += 0.01) {
    const a = start + t * 1.4;
    if (a > start + 1.4) break;
    const fade = t;
    const r = 16;
    const x = 20 + Math.cos(a) * r;
    const y = 20 + Math.sin(a) * r;
    const col = fade > 0.7 ? '#ffffff' : fade > 0.4 ? '#d8f0ff' : '#8ac0f0';
    c.set(Math.round(x), Math.round(y), col);
    c.set(Math.round(x - Math.cos(a)), Math.round(y - Math.sin(a)), fade > 0.5 ? '#bfe4ff' : '#6a9ad8');
    if (fade > 0.6) c.set(Math.round(x - 2 * Math.cos(a)), Math.round(y - 2 * Math.sin(a)), '#8ac0f0');
  }
  return c;
}

function impact(frame, color = PAL.gold4) {
  const c = new PixelCanvas(24, 24);
  const r = 3 + frame * 3;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + frame * 0.2;
    const len = i % 2 ? r * 0.6 : r;
    c.line(12, 12, Math.round(12 + Math.cos(a) * len), Math.round(12 + Math.sin(a) * len), i % 2 ? '#ffffff' : color);
  }
  if (frame < 2) c.ellipse(12, 12, 3 - frame, 3 - frame, '#ffffff');
  return c;
}

function sparkle(frame) {
  const c = new PixelCanvas(16, 16);
  const s = [1, 3, 4, 2][frame];
  c.set(8, 8, '#ffffff');
  for (let i = 1; i <= s; i++) {
    const col = i === s ? PAL.green4 : '#e8ffe0';
    c.set(8 + i, 8, col); c.set(8 - i, 8, col); c.set(8, 8 + i, col); c.set(8, 8 - i, col);
  }
  if (frame === 2) { c.set(10, 10, PAL.green4); c.set(6, 6, PAL.green4); c.set(10, 6, PAL.green4); c.set(6, 10, PAL.green4); }
  return c;
}

function buff(frame, color) {
  const c = new PixelCanvas(16, 20);
  for (const [x, off] of [[3, 0], [8, 4], [13, 2]]) {
    const y = 16 - ((frame * 5 + off * 2) % 16);
    c.set(x, y, color); c.set(x - 1, y + 1, color); c.set(x + 1, y + 1, color);
    c.vline(x, y + 1, y + 3, color);
  }
  return c;
}

function smoke(frame) {
  const c = new PixelCanvas(16, 16);
  const r = 2 + frame * 1.2;
  const col = ['#d8d4d0', '#c0bcb8', '#a8a4a0', '#908c88'][frame];
  c.ellipse(8, 8, r, r * 0.85, col);
  c.ellipse(7, 7, r * 0.6, r * 0.5, '#ece8e4');
  return c;
}

function shadow(w, h) {
  const c = new PixelCanvas(w, h);
  c.ellipse(w / 2, h / 2, w / 2, h / 2, '#0a081060');
  return c;
}

/**
 * The blanket over a sleeper lying in a hammock or a bedroll (Actor poses
 * "hammock" and "bedroll"): it covers everything from the neck down, arms
 * and all, so only the head shows at one end. Drawn for a head on the right
 * (the turned-down edge at the neck); flipped for a head on the left. Two
 * sizes: most of the crew, and the broad ones (the suit).
 */
function sleepBlanket(w, h) {
  const c = new PixelCanvas(w, h);
  const m = '#4a5a8a';
  const d = '#36426a';
  const l = '#6a7cb0';
  const mid = h / 2;
  for (let x = 0; x < w; x++) {
    // Full height over the shoulders and arms, narrowing over the legs to the feet (on the left).
    const fromNeck = w - 1 - x;
    const legs = Math.max(0, fromNeck - 14) / Math.max(1, w - 15);
    const half = mid - legs * (mid * 0.4) - (x === 0 ? 1 : 0);
    const lump = Math.round(Math.sin(x * 0.5) * 0.6);
    const top = Math.round(mid - half) + lump;
    const bot = Math.round(mid + half) - 1;
    c.vline(x, top, bot, m);
    c.set(x, top, l);
    c.set(x, top + 1, l);
    c.vline(x, bot - 1, bot, d);
  }
  // the turned-down edge at the neck, a fold down the middle, and the stripes
  c.vline(w - 3, 1, h - 2, '#e6dcc4');
  c.vline(w - 2, 1, h - 2, '#cfc2a4');
  for (let x = 3; x < w - 5; x++) if (x % 3) c.set(x, Math.round(mid) + (x % 7 === 0 ? 1 : 0), d);
  for (let x = 5; x < w - 5; x += 6) c.vline(x, Math.round(mid) - 4, Math.round(mid) - 2, '#5e6ea0');
  c.outline(PAL.ink);
  return c;
}

function gull(frame) {
  const c = new PixelCanvas(16, 12);
  const wing = [0, 2, 4, 2][frame];
  c.rect(6, 5, 5, 2, '#f4f4f0');
  c.set(11, 5, '#f4f4f0');
  c.set(12, 5, PAL.gold3);
  c.line(7, 5, 1, 5 - (4 - wing), '#e0e0e0');
  c.line(9, 5, 15, 5 - (4 - wing), '#e0e0e0');
  c.set(1, 5 - (4 - wing), '#3a3a40');
  c.set(15, 5 - (4 - wing), '#3a3a40');
  return c;
}

function gullPerched() {
  const c = new PixelCanvas(12, 12);
  c.ellipse(6, 6, 4, 3, '#f4f4f0');
  c.rect(4, 4, 6, 2, '#b8bcc4');
  c.ellipse(9, 3, 2, 2, '#f4f4f0');
  c.set(11, 3, PAL.gold3);
  c.set(9, 2, PAL.ink);
  c.set(5, 9, PAL.gold2);
  c.set(7, 9, PAL.gold2);
  c.outline('#2a2a30');
  return c;
}

function wake(frame) {
  const c = new PixelCanvas(64, 32);
  for (let i = 0; i < 40; i++) {
    const y = (i * 7 + frame * 3) % 32;
    const spread = 8 + y * 0.8;
    const x = 32 + Math.round(Math.sin(i * 1.7 + frame) * spread);
    c.set(x, y, i % 3 ? '#dff2fa' : '#a8d8ec');
    if (i % 4 === 0) c.set(x + 1, y, '#dff2fa');
  }
  return c;
}

/** Timing cue ring of radius r (crisp midpoint circle with a dark rim). */
function ring(r, color = '#ffffff', rim = '#20182a') {
  const size = r * 2 + 5;
  const c = new PixelCanvas(size, size);
  const m = Math.floor(size / 2);
  c.ellipseOutline(m, m, r + 1, r + 1, rim);
  c.ellipseOutline(m, m, r - 1, r - 1, rim);
  c.ellipseOutline(m, m, r, r, color);
  return c;
}

/** Small shield that flashes on a successful guard. */
function shield(frame) {
  const c = new PixelCanvas(16, 18);
  const rows = ['.oooooooooo.', 'oGGGGGGGGGGo', 'oGYYYYYYYYGo', 'oGYGGGGGGYGo', 'oGYGYYYYGYGo', 'oGYGYGGYGYGo', 'oGYGYGGYGYGo', '.oGYGYYGYGo.', '.oGYGGGGYGo.', '..oGYYYYGo..', '...oGGGGo...', '....oooo....'];
  const pal = frame === 0 ? { o: '#ffffff', G: '#ffffff', Y: '#ffffff' } : { o: PAL.ink, G: frame === 1 ? '#fff4c0' : PAL.gold4, Y: frame === 1 ? '#ffffff' : PAL.gold2 };
  c.stamp(rows, 2, 3, pal);
  return c;
}

/** "!" burst used as an enemy attack tell. */
function tell() {
  const c = new PixelCanvas(9, 13);
  c.stamp(['.ooooo.', 'oYYYYYo', 'oYWWWYo', 'oYWWWYo', 'oYWWWYo', '.oYWYo.', '.oYWYo.', '..oYo..', '..ooo..', '.oYYYo.', '.oYWYo.', '..ooo..'], 1, 0, { o: PAL.ink, Y: PAL.red3, W: '#ffffff' });
  return c;
}

export function buildEffectsAtlas() {
  const atlas = new ShelfAtlas(512, 1);
  for (let f = 0; f < 4; f++) atlas.add(`slash_${f}`, slash(f));
  for (let f = 0; f < 3; f++) atlas.add(`impact_${f}`, impact(f));
  for (let f = 0; f < 3; f++) atlas.add(`bite_${f}`, impact(f, PAL.red4));
  for (let f = 0; f < 4; f++) atlas.add(`sparkle_${f}`, sparkle(f));
  for (let f = 0; f < 4; f++) atlas.add(`buff_${f}`, buff(f, PAL.gold4));
  for (let f = 0; f < 4; f++) atlas.add(`debuff_${f}`, buff(f, PAL.plum4));
  for (let f = 0; f < 4; f++) atlas.add(`smoke_${f}`, smoke(f));
  for (let f = 0; f < 4; f++) atlas.add(`gull_${f}`, gull(f));
  for (let f = 0; f < 4; f++) atlas.add(`wake_${f}`, wake(f));
  atlas.add('gull_perched', gullPerched());
  for (let r = 3; r <= 30; r++) atlas.add(`ring_${r}`, ring(r));
  atlas.add('ring_target', ring(6, PAL.gold4));
  atlas.add('ring_target_hit', ring(6, '#ffffff', PAL.gold3));
  for (let f = 0; f < 3; f++) atlas.add(`shield_${f}`, shield(f));
  atlas.add('tell', tell());
  atlas.add('shadow_s', shadow(14, 5));
  atlas.add('shadow_m', shadow(20, 6));
  atlas.add('shadow_l', shadow(28, 8));
  atlas.add('shadow_xs', shadow(10, 4));
  atlas.add('sleep_blanket', sleepBlanket(26, 22));
  atlas.add('sleep_blanket_l', sleepBlanket(27, 30));
  addFumeEffects(atlas);
  return atlas.build();
}

/**
 * Story Phase 10: the inside of the Great Sharkstorm, as seen over the rail
 * once the Revenge is up in it. Tileable (64x64 per frame, 4 frames): grey-green
 * cloud banks streaking sideways, spray, a glint of somebody's gold now and
 * then. The motion is the texture scrolling (WorldMap), not the camera.
 */
export function paintStormSky(frames = 4) {
  const S = 64;
  const c = new PixelCanvas(S * frames, S);
  const tones = ['#1a2622', '#24352e', '#30463c', '#3e584a', '#56705e'];
  for (let f = 0; f < frames; f++) {
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        // streaks: long sideways bands that wobble, drifting with the frame
        const ph = (f / frames) * Math.PI * 2;
        const v = Math.sin((y / S) * Math.PI * 2 * 3 + Math.sin((x / S) * Math.PI * 2 + ph) * 0.9)
          + Math.sin((x / S) * Math.PI * 2 * 2 - (y / S) * Math.PI * 2 + ph) * 0.45;
        const i = Math.max(0, Math.min(4, Math.round((v + 1.6) * 1.25)));
        c.set(f * S + x, y, tones[i]);
      }
    }
    // spray and rain: short pale dashes, slanted
    for (let i = 0; i < 26; i++) {
      const bx = (i * 23 + f * 9) % S;
      const by = (i * 37 + 5) % S;
      for (let k = 0; k < 4; k++) c.set(f * S + ((bx + k) % S), (by + Math.floor(k / 2)) % S, k === 0 ? '#9ab8a8' : '#6e8c7c');
    }
    // a glint of stolen gold, now and then
    const gx = (f * 19 + 11) % S;
    const gy = (f * 29 + 21) % S;
    c.set(f * S + gx, gy, '#f8e070');
    c.set(f * S + ((gx + 1) % S), gy, '#e0b030');
  }
  return c;
}

/** Tileable animated ocean (64x64 per frame, 4 frames in a row). */
export function paintOcean(frames = 4) {
  const S = 64;
  const c = new PixelCanvas(S * frames, S);
  for (let f = 0; f < frames; f++) {
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const v = Math.sin((x / S) * Math.PI * 2 * 2 + (y / S) * Math.PI * 2) + Math.sin((y / S) * Math.PI * 2 * 3 - (f / frames) * Math.PI * 2) * 0.6;
        c.set(f * S + x, y, v > 0.9 ? PAL.sea3 : v < -0.9 ? PAL.sea1 : PAL.sea2);
      }
    }
    // wave crests: short arcs that drift with the frame
    for (let i = 0; i < 22; i++) {
      const bx = (i * 29 + 7) % S;
      const by = (i * 17 + 3) % S;
      const drift = Math.round((f / frames) * 4 * ((i % 3) - 1));
      const len = 3 + (i % 4);
      for (let k = 0; k < len; k++) {
        const x = (bx + k + drift + S) % S;
        const y = (by + (k === 0 || k === len - 1 ? 1 : 0)) % S;
        c.set(f * S + x, y, k === 1 ? PAL.sea5 : PAL.sea4);
      }
      if ((i + f) % 5 === 0) c.set(f * S + ((bx + 1 + drift + S) % S), (by + S - 1) % S, '#cfeaf4');
    }
  }
  return c;
}
