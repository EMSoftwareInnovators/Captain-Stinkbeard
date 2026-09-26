/**
 * Note names and the compact pattern notation used by songs in data/audio/music.
 *
 * Melodic channels:  "D5:2 F5 A5:3 r:2 | G5:4 -:2"
 *   NOTE[:steps]   C4, F#5, Bb3 ... (default length 1 step)
 *   r[:steps]      rest
 *   -[:steps]      extend the previous note (tie)
 *   [C4 E4 G4]:4   chord
 *   |              bar line (ignored, for readability)
 * Drum channels:     "k..h s..h" one character per step
 *   k kick, s snare, h closed hat, o open hat, t low tom, T high tom, c crash, . rest
 */
const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteToMidi(name) {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`Bad note "${name}"`);
  let n = SEMITONES[m[1].toUpperCase()];
  if (m[2] === '#') n += 1;
  if (m[2] === 'b') n -= 1;
  return 12 * (Number(m[3]) + 1) + n;
}

export function midiToFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function noteFreq(name) {
  return midiToFreq(noteToMidi(name));
}

/** Parses a melodic channel string into [{ step, len, midis: [..] }]. */
export function parseMelody(str) {
  const events = [];
  const tokens = str.replace(/\|/g, ' ').match(/\[[^\]]*\](?::\d+)?|\S+/g) || [];
  let step = 0;
  for (const tok of tokens) {
    let body = tok;
    let len = 1;
    const colon = tok.lastIndexOf(':');
    if (colon > 0 && !tok.endsWith(']')) {
      body = tok.slice(0, colon);
      len = Number(tok.slice(colon + 1));
      if (!Number.isInteger(len) || len < 1) throw new Error(`Bad length in "${tok}"`);
    }
    if (body === 'r' || body === '.') {
      step += len;
      continue;
    }
    if (body === '-') {
      const last = events[events.length - 1];
      if (!last) throw new Error('Tie "-" with no previous note');
      last.len += len;
      step += len;
      continue;
    }
    const names = body.startsWith('[') ? body.slice(1, -1).trim().split(/\s+/) : [body];
    events.push({ step, len, midis: names.map(noteToMidi) });
    step += len;
  }
  return { events, length: step };
}

/** Parses a drum channel string into [{ step, drum }]. */
export function parseDrums(str) {
  const events = [];
  let step = 0;
  for (const ch of str.replace(/[\s|]/g, '')) {
    if (ch !== '.') events.push({ step, drum: ch });
    step += 1;
  }
  return { events, length: step };
}
