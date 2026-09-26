/**
 * Small, deterministic post effects for rendered audio.
 */

/** Schroeder-style stereo reverb applied in place. mix 0..1. */
export function reverb(left, right, sampleRate, { mix = 0.18, room = 0.78, damp = 0.35 } = {}) {
  const scale = sampleRate / 44100;
  const combTimes = [1116, 1188, 1277, 1356].map((n) => Math.round(n * scale));
  const allTimes = [556, 441].map((n) => Math.round(n * scale));
  const process = (input, spread) => {
    const out = new Float32Array(input.length);
    const combs = combTimes.map((n) => ({ buf: new Float32Array(n + spread), i: 0, lp: 0 }));
    const alls = allTimes.map((n) => ({ buf: new Float32Array(n + spread), i: 0 }));
    for (let s = 0; s < input.length; s++) {
      const x = input[s] * 0.25;
      let acc = 0;
      for (const c of combs) {
        const y = c.buf[c.i];
        c.lp = y * (1 - damp) + c.lp * damp;
        c.buf[c.i] = x + c.lp * room;
        c.i = (c.i + 1) % c.buf.length;
        acc += y;
      }
      for (const a of alls) {
        const y = a.buf[a.i];
        a.buf[a.i] = acc + y * 0.5;
        a.i = (a.i + 1) % a.buf.length;
        acc = y - acc * 0.5;
      }
      out[s] = acc;
    }
    return out;
  };
  const wetL = process(left, 0);
  const wetR = process(right, 23);
  for (let i = 0; i < left.length; i++) {
    left[i] = left[i] * (1 - mix * 0.5) + wetL[i] * mix;
    right[i] = right[i] * (1 - mix * 0.5) + wetR[i] * mix;
  }
}

/** Soft limiter to keep peaks under full scale without harsh clipping. */
export function softLimit(buffers, ceiling = 0.92) {
  let peak = 0;
  for (const b of buffers) for (let i = 0; i < b.length; i++) peak = Math.max(peak, Math.abs(b[i]));
  const gain = peak > ceiling ? ceiling / peak : 1;
  for (const b of buffers) for (let i = 0; i < b.length; i++) b[i] = Math.tanh(b[i] * gain * 1.1) / Math.tanh(1.1);
}

/** One-pole low-pass in place. */
export function lowpass(buf, coeff) {
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    y += (buf[i] - y) * coeff;
    buf[i] = y;
  }
}
