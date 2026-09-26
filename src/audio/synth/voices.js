import { midiToFreq } from './notes.js';

/**
 * Instrument voices. Each renders one note into a mono Float32Array that the
 * song renderer mixes (with pan) into the stereo output. All original sounds:
 * pulse/triangle waves (SNES/NES flavour), 2-operator FM (Genesis flavour),
 * Karplus–Strong plucked strings and noise drums.
 */
const TAU = Math.PI * 2;

function envelope(t, dur, inst) {
  const a = inst.attack ?? 0.005;
  const d = inst.decay ?? 0.1;
  const s = inst.sustain ?? 0.7;
  const r = inst.release ?? 0.08;
  let level;
  if (t < a) level = t / a;
  else if (t < a + d) level = 1 - (1 - s) * ((t - a) / d);
  else level = s;
  if (t > dur) {
    const rel = (t - dur) / r;
    level *= Math.max(0, 1 - rel);
  }
  return level;
}

function oscSample(wave, phase, duty) {
  const p = phase - Math.floor(phase);
  switch (wave) {
    case 'square':
      return p < duty ? 0.8 : -0.8;
    case 'triangle':
      return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
    case 'saw':
      return 2 * p - 1;
    case 'sine':
    default:
      return Math.sin(TAU * p);
  }
}

/** Renders a pitched note. Returns Float32Array (includes the release tail). */
export function renderVoice(inst, midi, durSec, sampleRate, velocity = 1) {
  const release = inst.release ?? 0.08;
  const total = Math.ceil((durSec + release + (inst.type === 'pluck' ? 0.6 : 0)) * sampleRate);
  const out = new Float32Array(total);
  const freq = midiToFreq(midi + (inst.transpose ?? 0));
  if (inst.type === 'pluck') return renderPluck(inst, freq, durSec, sampleRate, velocity, out);
  const vib = inst.vibrato;
  let phase = 0;
  let phase2 = 0;
  let modPhase = 0;
  let lp = 0;
  const cutoff = inst.lowpass ?? 1; // 0..1 one-pole coefficient (1 = open)
  const duty = inst.duty ?? 0.5;
  const detune = inst.detune ? 2 ** (inst.detune / 1200) : 1;
  for (let i = 0; i < total; i++) {
    const t = i / sampleRate;
    let f = freq;
    if (vib && t > (vib.delay ?? 0)) f *= 1 + Math.sin(TAU * vib.rate * t) * vib.depth;
    if (inst.slide && t < inst.slide.time) f *= 2 ** ((inst.slide.semis * (1 - t / inst.slide.time)) / 12);
    let s;
    if (inst.type === 'fm') {
      const ratio = inst.ratio ?? 1;
      const idxEnv = inst.indexDecay ? Math.exp(-t / inst.indexDecay) : 1;
      const floor = inst.indexFloor ?? 0.2;
      const index = (inst.index ?? 2) * (floor + (1 - floor) * idxEnv);
      modPhase += (f * ratio) / sampleRate;
      phase += f / sampleRate;
      s = Math.sin(TAU * phase + index * Math.sin(TAU * modPhase)) * 0.8;
    } else {
      phase += f / sampleRate;
      s = oscSample(inst.wave, phase, duty);
      if (inst.detune) {
        phase2 += (f * detune) / sampleRate;
        s = (s + oscSample(inst.wave, phase2, duty)) * 0.6;
      }
    }
    if (inst.breath) s += (Math.random() * 2 - 1) * inst.breath * Math.max(0, 1 - t * 8);
    lp += (s - lp) * cutoff;
    out[i] = lp * envelope(t, durSec, inst) * velocity;
  }
  return out;
}

function renderPluck(inst, freq, durSec, sampleRate, velocity, out) {
  // Karplus–Strong: a burst of noise in a delay line, averaged each pass.
  const period = Math.max(2, Math.round(sampleRate / freq));
  const buf = new Float32Array(period);
  let seed = 12345 + period * 7;
  for (let i = 0; i < period; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    buf[i] = ((seed / 4294967296) * 2 - 1) * 0.8;
  }
  const damp = inst.damping ?? 0.996;
  const bright = inst.brightness ?? 0.5;
  let idx = 0;
  const cutAt = durSec + (inst.release ?? 0.1);
  for (let i = 0; i < out.length; i++) {
    const cur = buf[idx];
    const next = buf[(idx + 1) % period];
    buf[idx] = (cur * bright + next * (1 - bright)) * damp;
    const t = i / sampleRate;
    const gate = t < cutAt ? 1 : Math.max(0, 1 - (t - cutAt) / 0.05);
    out[i] = cur * velocity * gate;
    idx = (idx + 1) % period;
  }
  return out;
}

/** Deterministic noise so renders are identical run to run. */
function noiseGen(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return (s / 4294967296) * 2 - 1;
  };
}

export function renderDrum(kind, sampleRate, seed = 1) {
  const noise = noiseGen(seed * 7919 + kind.charCodeAt(0));
  const len = { k: 0.28, s: 0.22, h: 0.05, o: 0.28, t: 0.3, T: 0.25, c: 1.2 }[kind] ?? 0.1;
  const n = Math.ceil(len * sampleRate);
  const out = new Float32Array(n);
  let phase = 0;
  let lp = 0;
  let hp = 0;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let s = 0;
    switch (kind) {
      case 'k': {
        const f = 50 + 110 * Math.exp(-t * 30);
        phase += f / sampleRate;
        s = Math.sin(TAU * phase) * Math.exp(-t * 11) * 1.1;
        if (t < 0.004) s += noise() * 0.4;
        break;
      }
      case 's': {
        const f = 185 * (1 + 0.3 * Math.exp(-t * 40));
        phase += f / sampleRate;
        const tone = Math.sin(TAU * phase) * Math.exp(-t * 25) * 0.45;
        const nz = noise();
        hp = nz - prev + 0.6 * hp;
        prev = nz;
        s = tone + hp * Math.exp(-t * 16) * 0.55;
        break;
      }
      case 'h':
      case 'o': {
        const nz = noise();
        hp = nz - prev + 0.2 * hp;
        prev = nz;
        s = hp * Math.exp(-t * (kind === 'h' ? 70 : 12)) * 0.32;
        break;
      }
      case 't':
      case 'T': {
        const base = kind === 't' ? 95 : 150;
        const f = base * (1 + 0.5 * Math.exp(-t * 18));
        phase += f / sampleRate;
        s = Math.sin(TAU * phase) * Math.exp(-t * 9) * 0.8;
        break;
      }
      case 'c': {
        const nz = noise();
        hp = nz - prev + 0.1 * hp;
        prev = nz;
        lp += (hp - lp) * 0.7;
        s = lp * Math.exp(-t * 3) * 0.3;
        break;
      }
      default:
        break;
    }
    out[i] = s;
  }
  return out;
}
