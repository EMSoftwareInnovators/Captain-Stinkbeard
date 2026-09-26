import { noteFreq } from './notes.js';

/**
 * Sound effects are small layered synth programs (data/audio/sfx.json):
 *
 *   "sword_hit": { "layers": [
 *      { "type": "noise", "dur": 0.12, "decay": 30, "hp": 0.4, "volume": 0.6 },
 *      { "type": "tone", "wave": "square", "sweep": [880, 180], "dur": 0.1, "volume": 0.3 } ] }
 *
 * Layer fields: type tone|noise, wave, freq|note|notes[[note,sec]...],
 * sweep [fromHz,toHz], dur, delay, attack, decay (exp rate) or sustain,
 * volume, lp/hp (0..1 filter coefficients), vibrato {rate, depth}, duty.
 */
const TAU = Math.PI * 2;

function osc(wave, p, duty = 0.5) {
  const x = p - Math.floor(p);
  if (wave === 'square') return x < duty ? 0.8 : -0.8;
  if (wave === 'triangle') return x < 0.5 ? 4 * x - 1 : 3 - 4 * x;
  if (wave === 'saw') return 2 * x - 1;
  return Math.sin(TAU * x);
}

export function renderSfx(def, sampleRate = 32000) {
  const layers = def.layers || [def];
  let total = 0;
  for (const l of layers) {
    const dur = l.notes ? l.notes.reduce((s, [, d]) => s + d, 0) : l.dur ?? 0.1;
    total = Math.max(total, (l.delay ?? 0) + dur + (l.release ?? 0.02));
  }
  const out = new Float32Array(Math.ceil(total * sampleRate));
  let seed = 22222;
  const rnd = () => {
    seed ^= seed << 13; seed >>>= 0;
    seed ^= seed >>> 17;
    seed ^= seed << 5; seed >>>= 0;
    return (seed / 4294967296) * 2 - 1;
  };
  for (const l of layers) {
    const start = Math.round((l.delay ?? 0) * sampleRate);
    const vol = l.volume ?? 0.5;
    const segments = l.notes
      ? l.notes.map(([n, d]) => ({ f: typeof n === 'number' ? n : noteFreq(n), d }))
      : [{ f: l.freq ?? (l.note ? noteFreq(l.note) : 440), d: l.dur ?? 0.1 }];
    let offset = start;
    let phase = 0;
    let lp = 0;
    let hpPrev = 0;
    let hp = 0;
    let hpIn = 0;
    let crush = 0;
    for (const seg of segments) {
      const n = Math.round(seg.d * sampleRate);
      for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        const u = i / n;
        let f = seg.f;
        if (l.sweep) f = l.sweep[0] * (l.sweep[1] / l.sweep[0]) ** u;
        if (l.vibrato) f *= 1 + Math.sin(TAU * l.vibrato.rate * t) * l.vibrato.depth;
        phase += f / sampleRate;
        let s;
        if (l.type === 'noise') {
          // Sample-and-hold noise gives a crunchier, retro character.
          if (l.crush) {
            crush += f / sampleRate;
            if (crush >= 1) { crush -= 1; hpPrev = rnd(); }
            s = hpPrev;
          } else s = rnd();
        } else {
          s = osc(l.wave ?? 'square', phase, l.duty ?? 0.5);
        }
        if (l.hp) {
          const x = s;
          hp = x - hpIn + (1 - l.hp) * hp;
          hpIn = x;
          s = hp;
        }
        if (l.lp) {
          lp += (s - lp) * l.lp;
          s = lp;
        }
        const attack = l.attack ?? 0.002;
        let env = t < attack ? t / attack : 1;
        if (l.decay) env *= Math.exp(-(t - attack) * l.decay);
        if (!l.decay && u > 0.85) env *= (1 - u) / 0.15;
        const j = offset + i;
        if (j < out.length) out[j] += s * env * vol;
      }
      offset += n;
    }
  }
  return { data: out, sampleRate };
}
