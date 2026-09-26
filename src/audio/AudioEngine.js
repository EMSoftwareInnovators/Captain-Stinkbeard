import { renderSong } from './synth/renderSong.js';
import { renderSfx } from './synth/renderSfx.js';
import { renderOcean, renderWind, ONESHOT_GENERATORS } from './synth/ambience.js';

const SAMPLE_RATE = 32000; // SNES-like output rate; plenty for chiptune.
const yieldFrame = () => new Promise((r) => setTimeout(r, 0));

/**
 * Web Audio playback with four buses (music, ambience, sfx, ui) under a
 * master gain. All sounds are rendered at boot by the pure-JS synth in
 * ./synth, so no audio files are needed and everything is original.
 *
 * Safe to use without audio support (tests, locked-down browsers): every
 * method becomes a no-op when no AudioContext exists.
 */
export class AudioEngine {
  constructor({ content, settings, bus = null }) {
    this.content = content;
    this.settings = settings;
    this.bus = bus;
    this.ctx = null;
    this.buffers = { music: new Map(), sfx: new Map(), loops: new Map(), oneshots: new Map() };
    this.music = null;
    this.musicStack = [];
    this.pendingMusic = null;
    this.ambience = null;
    this.ambienceTimers = [];
    this.renderQueue = null;
    bus?.on('settings:changed', () => this.applyVolumes());
  }

  get available() {
    return !!(globalThis.AudioContext || globalThis.webkitAudioContext);
  }

  ensureContext() {
    if (this.ctx || !this.available) return this.ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain();
    this.master.connect(c.destination);
    this.musicBus = c.createGain();
    this.musicFilter = c.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 20000;
    this.musicBus.connect(this.musicFilter).connect(this.master);
    this.ambBus = c.createGain();
    this.ambBus.connect(this.master);
    this.sfxBus = c.createGain();
    this.sfxBus.connect(this.master);
    this.uiBus = c.createGain();
    this.uiBus.connect(this.master);
    this.applyVolumes();
    return c;
  }

  /** Call from a user gesture (key press) to satisfy browser autoplay rules. */
  unlock() {
    const c = this.ensureContext();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.get('masterVolume'), t, 0.02);
    this.musicBus.gain.setTargetAtTime(s.get('musicVolume') * 0.8, t, 0.02);
    this.ambBus.gain.setTargetAtTime(s.get('ambienceVolume') * 0.7, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(s.get('sfxVolume'), t, 0.02);
    this.uiBus.gain.setTargetAtTime(s.get('sfxVolume') * 0.8, t, 0.02);
  }

  toBuffer({ left, right, data, sampleRate }) {
    const l = left ?? data;
    const r = right ?? data;
    const buf = this.ctx.createBuffer(2, l.length, sampleRate);
    buf.copyToChannel(l, 0);
    buf.copyToChannel(r, 1);
    return buf;
  }

  /**
   * Renders every sound. SFX and loops first (quick), then music in the
   * given priority order, yielding between pieces so loading stays smooth.
   */
  async prepare({ onProgress = () => {}, musicOrder = [] } = {}) {
    if (!this.ensureContext()) return;
    const sfx = [...this.content.sfx.map.entries()];
    const ambienceSources = this.collectAmbienceSources();
    const songs = [...this.content.music.ids()].sort((a, b) => {
      const ia = musicOrder.indexOf(a);
      const ib = musicOrder.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    const total = sfx.length + ambienceSources.length + songs.length;
    let done = 0;
    const step = async (label) => {
      done += 1;
      onProgress(done / total, label);
      await yieldFrame();
    };
    for (const [id, def] of sfx) {
      this.buffers.sfx.set(id, this.toBuffer(renderSfx(def, SAMPLE_RATE)));
      if (done % 8 === 0) await step(`sfx ${id}`);
      else done += 1;
    }
    for (const src of ambienceSources) {
      this.renderAmbienceSource(src);
      await step(`ambience ${src.key}`);
    }
    const instruments = Object.fromEntries(this.content.instruments.map);
    for (const id of songs) {
      if (!this.buffers.music.has(id)) {
        const song = this.content.music.get(id);
        const rendered = renderSong(song, instruments, SAMPLE_RATE);
        this.buffers.music.set(id, { buffer: this.toBuffer(rendered), loopStart: rendered.loopStart, loopEnd: rendered.loopEnd, loop: song.loop !== false });
        if (this.pendingMusic?.id === id) {
          const p = this.pendingMusic;
          this.pendingMusic = null;
          this.playMusic(p.id, p.opts);
        }
      }
      await step(`music ${id}`);
    }
  }

  collectAmbienceSources() {
    const out = [];
    const seen = new Set();
    for (const def of this.content.ambience.list()) {
      for (const loop of def.loops || []) {
        const key = `${loop.source}${loop.muffled ? ':m' : ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ kind: 'loop', key, loop });
        }
      }
      for (const shot of def.oneshots || []) {
        for (const name of shot.sounds) {
          if (!seen.has(name)) {
            seen.add(name);
            out.push({ kind: 'oneshot', key: name });
          }
        }
      }
    }
    return out;
  }

  renderAmbienceSource(src) {
    if (src.kind === 'loop') {
      const r = src.loop.source === 'wind' ? renderWind(SAMPLE_RATE) : renderOcean(SAMPLE_RATE, { muffled: !!src.loop.muffled });
      this.buffers.loops.set(src.key, this.toBuffer(r));
    } else {
      const [gen, variant] = src.key.split(/(\d+)$/);
      const fn = ONESHOT_GENERATORS[gen];
      if (fn) this.buffers.oneshots.set(src.key, this.toBuffer(fn(SAMPLE_RATE, Number(variant || 0))));
    }
  }

  // --- music ------------------------------------------------------------

  playMusic(id, opts = {}) {
    const { fade = 0.8, offset = 0 } = opts;
    if (!this.ctx) return;
    if (id === null || id === undefined) {
      this.stopMusic({ fade });
      return;
    }
    if (this.music?.id === id && !opts.restart) return;
    const entry = this.buffers.music.get(id);
    if (!entry) {
      this.pendingMusic = { id, opts };
      this.stopMusic({ fade });
      return;
    }
    this.stopMusic({ fade });
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = entry.buffer;
    src.loop = entry.loop;
    if (entry.loop) {
      src.loopStart = entry.loopStart;
      src.loopEnd = entry.loopEnd;
    }
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(1, c.currentTime + Math.max(0.01, opts.fadeIn ?? 0.05));
    src.connect(gain).connect(this.musicBus);
    src.start(0, offset);
    this.music = { id, src, gain, startedAt: c.currentTime - offset, entry };
    this.bus?.emit('audio:music', { id });
  }

  stopMusic({ fade = 0.8 } = {}) {
    if (!this.ctx || !this.music) return;
    const { src, gain } = this.music;
    const t = this.ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + fade);
    try {
      src.stop(t + fade + 0.05);
    } catch {
      /* already stopped */
    }
    this.music = null;
  }

  /** Current playback position (seconds) of the playing track within its loop. */
  musicPosition() {
    if (!this.music || !this.ctx) return 0;
    const e = this.music.entry;
    let pos = this.ctx.currentTime - this.music.startedAt;
    if (e.loop && pos > e.loopEnd) pos = e.loopStart + ((pos - e.loopStart) % (e.loopEnd - e.loopStart));
    return pos;
  }

  /** Remember the current track (e.g. before a battle) so it can resume afterwards. */
  pushMusic() {
    this.musicStack.push(this.music ? { id: this.music.id, pos: this.musicPosition() } : null);
  }

  popMusic({ fade = 0.6 } = {}) {
    const prev = this.musicStack.pop();
    if (prev) this.playMusic(prev.id, { restart: true, offset: prev.pos, fadeIn: fade, fade: 0.3 });
    else this.stopMusic({ fade });
  }

  /** 'muffled' low-passes the music (below decks); null restores it. */
  setMusicFilter(mode) {
    if (!this.ctx) return;
    const target = mode === 'muffled' ? 1400 : 20000;
    this.musicFilter.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.25);
  }

  // --- sfx ----------------------------------------------------------------

  sfx(id, { volume = 1, rate = 1, pan = 0, bus = 'sfx' } = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const buf = this.buffers.sfx.get(id);
    if (!buf) return;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const gain = c.createGain();
    gain.gain.value = volume;
    let node = src.connect(gain);
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = pan;
      node = node.connect(p);
    }
    node.connect(bus === 'ui' ? this.uiBus : this.sfxBus);
    src.start();
  }

  ui(id, opts = {}) {
    this.sfx(id, { ...opts, bus: 'ui' });
  }

  // --- ambience -------------------------------------------------------------

  setAmbience(id) {
    if (!this.ctx) return;
    if (this.ambience?.id === id) return;
    this.stopAmbience();
    if (!id) return;
    const def = this.content.ambience.get(id);
    if (!def) return;
    const c = this.ctx;
    const nodes = [];
    for (const loop of def.loops || []) {
      const buf = this.buffers.loops.get(`${loop.source}${loop.muffled ? ':m' : ''}`);
      if (!buf) continue;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0, c.currentTime);
      gain.gain.linearRampToValueAtTime(loop.volume ?? 0.5, c.currentTime + 1.2);
      src.connect(gain).connect(this.ambBus);
      src.start(0, Math.random() * buf.duration);
      nodes.push({ src, gain });
    }
    this.ambience = { id, nodes };
    for (const shot of def.oneshots || []) this.scheduleOneshot(shot);
  }

  scheduleOneshot(shot) {
    const [min, max] = shot.every ?? [5, 12];
    const delayMs = (min + Math.random() * (max - min)) * 1000;
    const timer = setTimeout(() => {
      if (!this.ambience) return;
      const name = shot.sounds[Math.floor(Math.random() * shot.sounds.length)];
      const buf = this.buffers.oneshots.get(name);
      if (buf && this.ctx.state === 'running') {
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = 0.9 + Math.random() * 0.2;
        const gain = this.ctx.createGain();
        gain.gain.value = (shot.volume ?? 0.5) * (0.7 + Math.random() * 0.3);
        let node = src.connect(gain);
        if (this.ctx.createStereoPanner) {
          const p = this.ctx.createStereoPanner();
          p.pan.value = Math.random() * 1.4 - 0.7;
          node = node.connect(p);
        }
        node.connect(this.ambBus);
        src.start();
      }
      this.scheduleOneshot(shot);
    }, delayMs);
    this.ambienceTimers.push(timer);
  }

  stopAmbience() {
    this.ambienceTimers.forEach(clearTimeout);
    this.ambienceTimers = [];
    if (!this.ambience || !this.ctx) {
      this.ambience = null;
      return;
    }
    const t = this.ctx.currentTime;
    for (const { src, gain } of this.ambience.nodes) {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.8);
      try {
        src.stop(t + 0.9);
      } catch {
        /* ignore */
      }
    }
    this.ambience = null;
  }
}
