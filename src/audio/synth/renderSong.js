import { parseMelody, parseDrums } from './notes.js';
import { renderVoice, renderDrum } from './voices.js';
import { reverb, softLimit } from './effects.js';

/**
 * Renders a song definition (data/audio/music/*.json) to stereo PCM with an
 * exact loop region, so playback can loop sample-accurately.
 *
 * The part of the song after `loopFrom` loops forever; everything rendered
 * past the end (release tails, reverb) is folded back onto the loop start so
 * the seam is inaudible.
 */
export function renderSong(song, instruments, sampleRate = 32000) {
  const stepSec = 60 / song.bpm / (song.stepsPerBeat ?? 4);
  const patternLengths = {};
  const parsed = {};
  for (const [pid, pattern] of Object.entries(song.patterns)) {
    parsed[pid] = {};
    let len = 0;
    for (const [ch, str] of Object.entries(pattern)) {
      const channel = song.channels[ch];
      if (!channel) throw new Error(`Song "${song.id}" pattern "${pid}" uses unknown channel "${ch}"`);
      const inst = instruments[channel.instrument];
      const p = inst?.type === 'drums' ? parseDrums(str) : parseMelody(str);
      parsed[pid][ch] = p;
      len = Math.max(len, p.length);
    }
    patternLengths[pid] = song.patternSteps ?? len;
  }

  // Timeline of pattern start steps.
  let cursor = 0;
  const placed = song.sequence.map((pid) => {
    const at = cursor;
    cursor += patternLengths[pid];
    return { pid, at };
  });
  const totalSteps = cursor;
  const loopFromIndex = song.loopFrom ?? 0;
  const loopStartStep = placed[loopFromIndex]?.at ?? 0;
  const loopStart = Math.round(loopStartStep * stepSec * sampleRate);
  const loopEnd = Math.round(totalSteps * stepSec * sampleRate);
  const tail = Math.round((song.tail ?? 2.5) * sampleRate);
  const L = new Float32Array(loopEnd + tail);
  const R = new Float32Array(loopEnd + tail);

  const mix = (buf, startSample, vol, pan) => {
    const gl = vol * Math.min(1, 1 - pan);
    const gr = vol * Math.min(1, 1 + pan);
    for (let i = 0; i < buf.length; i++) {
      const j = startSample + i;
      if (j >= L.length) break;
      L[j] += buf[i] * gl;
      R[j] += buf[i] * gr;
    }
  };

  const drumCache = new Map();
  for (const { pid, at } of placed) {
    for (const [ch, p] of Object.entries(parsed[pid])) {
      const channel = song.channels[ch];
      const inst = instruments[channel.instrument];
      const vol = channel.volume ?? 0.5;
      const pan = channel.pan ?? 0;
      if (inst.type === 'drums') {
        for (const ev of p.events) {
          const key = ev.drum;
          if (!drumCache.has(key)) drumCache.set(key, renderDrum(key, sampleRate, 3));
          const start = Math.round((at + ev.step) * stepSec * sampleRate);
          mix(drumCache.get(key), start, vol * (inst.levels?.[key] ?? 1), pan + (key === 'h' || key === 'o' ? 0.2 : 0));
        }
      } else {
        for (const ev of p.events) {
          const dur = ev.len * stepSec * (inst.gate ?? 0.9);
          for (const midi of ev.midis) {
            const buf = renderVoice(inst, midi + (channel.transpose ?? 0), dur, sampleRate, ev.midis.length > 1 ? 0.7 : 1);
            const swing = song.swing && (at + ev.step) % 2 === 1 ? song.swing * stepSec : 0;
            mix(buf, Math.round(((at + ev.step) * stepSec + swing) * sampleRate), vol, pan);
          }
        }
      }
    }
  }

  if (song.reverb !== 0) reverb(L, R, sampleRate, { mix: song.reverb ?? 0.16 });

  // Fold the tail back into the loop start for a seamless loop.
  const loops = song.loop !== false;
  if (loops) {
    for (let i = 0; i < tail; i++) {
      L[loopStart + i] += L[loopEnd + i];
      R[loopStart + i] += R[loopEnd + i];
    }
  }
  const length = loops ? loopEnd : L.length;
  const left = L.slice(0, length);
  const right = R.slice(0, length);
  softLimit([left, right], song.ceiling ?? 0.9);
  return { left, right, sampleRate, loopStart: loops ? loopStart / sampleRate : null, loopEnd: loops ? loopEnd / sampleRate : null, duration: length / sampleRate };
}
