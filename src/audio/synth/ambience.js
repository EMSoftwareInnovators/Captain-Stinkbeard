/**
 * Procedural ambience sources: ocean swell loops, wind, and one-shot ship
 * sounds (wood creaks, gulls, drips, the ship's bell). Deterministic seeds
 * keep every build sounding identical.
 */
const TAU = Math.PI * 2;

function rng(seed) {
  let s = seed >>> 0 || 7;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Seamless stereo sea loop. Swell periods divide the loop length exactly. */
export function renderOcean(sampleRate, { seconds = 12, muffled = false, seed = 5 } = {}) {
  const n = Math.round(seconds * sampleRate);
  const fade = Math.round(1.5 * sampleRate);
  const make = (sd) => {
    const r = rng(sd);
    const buf = new Float32Array(n + fade);
    let brown = 0;
    let lp = 0;
    let lp2 = 0;
    for (let i = 0; i < buf.length; i++) {
      const t = i / sampleRate;
      brown = (brown + (r() * 2 - 1) * 0.08) * 0.995;
      const swell = 0.55 + 0.25 * Math.sin((TAU * t) / (seconds / 2)) + 0.15 * Math.sin((TAU * t) / (seconds / 3) + 1.3) + 0.1 * Math.sin((TAU * t) / seconds + 0.4);
      const cutoff = (muffled ? 0.02 : 0.05) + swell * (muffled ? 0.03 : 0.12);
      lp += (brown * 3 - lp) * cutoff;
      lp2 += (lp - lp2) * (muffled ? 0.15 : 0.5);
      buf[i] = lp2 * swell * (muffled ? 1.4 : 1);
    }
    // Crossfade the extra second back over the start.
    const out = buf.slice(0, n);
    for (let i = 0; i < fade; i++) {
      const w = i / fade;
      out[i] = out[i] * w + buf[n + i] * (1 - w);
    }
    return out;
  };
  return { left: make(seed), right: make(seed + 101), sampleRate, loop: true };
}

export function renderWind(sampleRate, { seconds = 10, seed = 9 } = {}) {
  const n = Math.round(seconds * sampleRate);
  const r = rng(seed);
  const out = new Float32Array(n);
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const x = r() * 2 - 1;
    const f = 0.02 + 0.015 * Math.sin((TAU * t) / seconds) + 0.01 * Math.sin((TAU * t * 3) / seconds);
    b1 += (x - b1) * f;
    b2 += (b1 - b2) * f;
    out[i] = (b1 - b2) * 6 * (0.6 + 0.4 * Math.sin((TAU * t * 2) / seconds + 0.7));
  }
  const fade = Math.round(0.5 * sampleRate);
  for (let i = 0; i < fade; i++) out[i] *= i / fade;
  for (let i = 0; i < fade; i++) out[n - 1 - i] *= i / fade;
  return { left: out, right: out, sampleRate, loop: true };
}

/**
 * Steady rain: dense filtered noise with scattered drop ticks. Muffled for
 * below decks (the rain on the deck overhead). Seamless loop.
 */
export function renderRain(sampleRate, { seconds = 8, muffled = false, seed = 21 } = {}) {
  const n = Math.round(seconds * sampleRate);
  const make = (sd) => {
    const r = rng(sd);
    const out = new Float32Array(n);
    let lp = 0;
    let hp = 0;
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const x = r() * 2 - 1;
      lp += (x - lp) * (muffled ? 0.05 : 0.35);
      hp = lp - prev + 0.97 * hp;
      prev = lp;
      let s = (muffled ? lp * 1.6 : hp) * 0.32;
      // individual drops
      if (r() < (muffled ? 0.0006 : 0.0025)) {
        const len = Math.round((muffled ? 0.02 : 0.008) * sampleRate);
        const amp = (muffled ? 0.25 : 0.4) * (0.4 + r() * 0.6);
        for (let k = 0; k < len && i + k < n; k++) out[i + k] += Math.sin(k * (muffled ? 0.09 : 0.6)) * amp * (1 - k / len);
      }
      out[i] += s;
    }
    const fade = Math.round(0.3 * sampleRate);
    for (let i = 0; i < fade; i++) {
      const w = i / fade;
      out[i] = out[i] * w + out[n - fade + i] * (1 - w);
    }
    return out.slice(0, n - fade);
  };
  return { left: make(seed), right: make(seed + 57), sampleRate, loop: true };
}

/**
 * Wooden creak: friction impulses (stick–slip) exciting two resonators.
 * Variant changes pitch, length and resonances.
 */
export function renderCreak(sampleRate, variant = 0) {
  const r = rng(1000 + variant * 37);
  const dur = 0.45 + r() * 0.7;
  const n = Math.round(dur * sampleRate);
  const out = new Float32Array(n + Math.round(0.2 * sampleRate));
  const res = [
    { f: 260 + r() * 300, r: 0.995 },
    { f: 700 + r() * 500, r: 0.99 },
  ].map((o) => ({ ...o, c: 2 * o.r * Math.cos((TAU * o.f) / sampleRate), y1: 0, y2: 0 }));
  let next = 0;
  const rate0 = 35 + r() * 50;
  for (let i = 0; i < out.length; i++) {
    const t = i / sampleRate;
    let x = 0;
    if (i >= next && i < n) {
      const u = t / dur;
      const env = Math.sin(Math.PI * u) ** 0.6;
      x = env * (0.6 + r() * 0.4);
      const rate = rate0 * (1 + 0.5 * Math.sin(TAU * u * (1.3 + variant * 0.2)) + (r() - 0.5) * 0.3);
      next = i + Math.max(1, Math.round(sampleRate / rate));
    }
    let s = 0;
    for (const o of res) {
      const y = o.c * o.y1 - o.r * o.r * o.y2 + x;
      o.y2 = o.y1;
      o.y1 = y;
      s += y;
    }
    out[i] = s * 0.018;
  }
  return { data: out, sampleRate };
}

export function renderGull(sampleRate, variant = 0) {
  const r = rng(2000 + variant * 11);
  const calls = 2 + Math.floor(r() * 2);
  const callLen = 0.22;
  const gap = 0.12;
  const n = Math.round((calls * (callLen + gap) + 0.2) * sampleRate);
  const out = new Float32Array(n);
  let phase = 0;
  for (let c = 0; c < calls; c++) {
    const start = Math.round(c * (callLen + gap) * sampleRate);
    const len = Math.round(callLen * sampleRate * (0.8 + r() * 0.4));
    const base = 1500 + r() * 400;
    for (let i = 0; i < len; i++) {
      const u = i / len;
      const f = base * (1 + 0.35 * Math.sin(Math.PI * u) - 0.25 * u);
      phase += f / sampleRate;
      const p = phase - Math.floor(phase);
      const s = Math.sin(TAU * p) * 0.6 + (p < 0.3 ? 0.25 : -0.25);
      const env = Math.sin(Math.PI * u) ** 0.5 * (c === calls - 1 ? 0.7 : 1);
      out[start + i] += s * env * 0.22;
    }
  }
  return { data: out, sampleRate };
}

export function renderDrip(sampleRate, variant = 0) {
  const n = Math.round(0.25 * sampleRate);
  const out = new Float32Array(n);
  let phase = 0;
  const f0 = 900 + variant * 180;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const f = f0 * (1 + 2.5 * Math.min(1, t * 30));
    phase += f / sampleRate;
    out[i] = Math.sin(TAU * phase) * Math.exp(-t * 40) * 0.35;
  }
  return { data: out, sampleRate };
}

export function renderBell(sampleRate, strikes = 2) {
  const each = 0.55;
  const n = Math.round((each * strikes + 2.2) * sampleRate);
  const out = new Float32Array(n);
  for (let k = 0; k < strikes; k++) {
    const start = Math.round(k * each * sampleRate);
    let p = 0;
    let m = 0;
    for (let i = 0; start + i < n; i++) {
      const t = i / sampleRate;
      p += 880 / sampleRate;
      m += (880 * 2.76) / sampleRate;
      const idx = 2.2 * Math.exp(-t * 2.5);
      out[start + i] += Math.sin(TAU * p + idx * Math.sin(TAU * m)) * Math.exp(-t * 1.6) * 0.3;
    }
  }
  return { data: out, sampleRate };
}

/** Low hull thump for below-deck ambience. */
export function renderThump(sampleRate, variant = 0) {
  const n = Math.round(0.6 * sampleRate);
  const out = new Float32Array(n);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (48 + variant * 6) / sampleRate;
    out[i] = Math.sin(TAU * p) * Math.exp(-t * 7) * 0.5 * Math.min(1, t * 60);
  }
  return { data: out, sampleRate };
}

export const ONESHOT_GENERATORS = {
  creak: renderCreak,
  gull: renderGull,
  drip: renderDrip,
  bell: (sr) => renderBell(sr, 2),
  thump: renderThump,
};
