// Fully synthesized audio: SFX voices + a generative music sequencer.
import { RNG } from './rng';

type SfxName =
  | 'slash' | 'bow' | 'fireball' | 'explode' | 'zap' | 'seed' | 'hit' | 'crit' | 'enemyDie' | 'squeak' | 'blorp'
  | 'bones' | 'gem' | 'loot' | 'legendary' | 'chest' | 'heal' | 'levelup' | 'recruit' | 'click' | 'hover'
  | 'bossRoar' | 'stairs' | 'capyHurt' | 'capyDie' | 'wipe' | 'enemyShoot' | 'spore' | 'telegraph' | 'slam'
  | 'break' | 'chomp' | 'portal' | 'perk' | 'deny' | 'branch' | 'bubble' | 'splash' | 'open' | 'dodge';

export type TrackName = 'title' | 'dungeon' | 'boss' | 'none';

const MIN_GAP: Partial<Record<SfxName, number>> = {
  hit: 0.035, crit: 0.05, bow: 0.04, slash: 0.05, zap: 0.045, seed: 0.05, enemyDie: 0.03, squeak: 0.05,
  blorp: 0.06, bones: 0.06, gem: 0.03, capyHurt: 0.12, enemyShoot: 0.07, spore: 0.1, explode: 0.06,
  fireball: 0.08, break: 0.05, bubble: 0.05, dodge: 0.2, heal: 0.25, branch: 0.1,
};

class AudioSystem {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxBus!: GainNode;
  musicBus!: GainNode;
  reverb!: ConvolverNode;
  reverbSend!: GainNode;
  delay!: DelayNode;
  noiseBuf!: AudioBuffer;
  last: Partial<Record<SfxName, number>> = {};
  voices = 0;
  volumes = { master: 0.8, music: 0.55, sfx: 0.8 };
  muted = false;
  music: MusicSequencer | null = null;

  constructor() {
    try {
      const v = JSON.parse(localStorage.getItem('capydelve_audio') || 'null');
      if (v) this.volumes = { ...this.volumes, ...v };
    } catch {
      /* storage unavailable */
    }
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;
      this.master.connect(comp).connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.musicBus = ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this.makeImpulse(2.6, 2.4);
      this.reverbSend = ctx.createGain();
      this.reverbSend.gain.value = 0.35;
      this.reverbSend.connect(this.reverb).connect(this.master);
      this.delay = ctx.createDelay(1.5);
      this.delay.delayTime.value = 0.28;
      const fb = ctx.createGain();
      fb.gain.value = 0.32;
      const dl = ctx.createBiquadFilter();
      dl.type = 'lowpass';
      dl.frequency.value = 2400;
      this.delay.connect(dl).connect(fb).connect(this.delay);
      dl.connect(this.reverbSend);
      dl.connect(this.musicBus);
      const len = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      this.music = new MusicSequencer(this);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  makeImpulse(dur: number, decay: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volumes.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.8, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx * 0.9, t, 0.05);
    try {
      localStorage.setItem('capydelve_audio', JSON.stringify(this.volumes));
    } catch {
      /* ignore */
    }
  }

  setVolume(k: 'master' | 'music' | 'sfx', v: number) {
    this.volumes[k] = v;
    this.applyVolumes();
  }

  // ------------------------------------------------------------ primitives
  tone(o: {
    type?: OscillatorType; f: number; f2?: number; t?: number; dur: number; vol: number; a?: number; dest?: AudioNode;
    rev?: number; detune?: number; curve?: 'exp' | 'lin'; filter?: number; vib?: number;
  }) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (o.t ?? 0);
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) {
      if (o.curve === 'lin') osc.frequency.linearRampToValueAtTime(o.f2, t0 + o.dur);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.dur);
    }
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    const a = o.a ?? 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(o.vol, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    let node: AudioNode = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.filter;
      osc.connect(f);
      node = f;
    }
    if (o.vib) {
      const l = ctx.createOscillator();
      l.frequency.value = o.vib;
      const lg = ctx.createGain();
      lg.gain.value = o.f * 0.03;
      l.connect(lg).connect(osc.frequency);
      l.start(t0);
      l.stop(t0 + o.dur + 0.05);
    }
    node.connect(g);
    g.connect(o.dest ?? this.sfxBus);
    if (o.rev) {
      const s = ctx.createGain();
      s.gain.value = o.rev;
      g.connect(s).connect(this.reverbSend);
    }
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
    return osc;
  }

  noise(o: { t?: number; dur: number; vol: number; type?: BiquadFilterType; f: number; f2?: number; q?: number; a?: number; dest?: AudioNode; rev?: number }) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (o.t ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const off = Math.random() * 1.5;
    const flt = ctx.createBiquadFilter();
    flt.type = o.type ?? 'bandpass';
    flt.frequency.setValueAtTime(o.f, t0);
    if (o.f2) flt.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.dur);
    flt.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(o.vol, t0 + (o.a ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(flt).connect(g).connect(o.dest ?? this.sfxBus);
    if (o.rev) {
      const s = ctx.createGain();
      s.gain.value = o.rev;
      g.connect(s).connect(this.reverbSend);
    }
    src.start(t0, off, o.dur + 0.05);
  }

  // ------------------------------------------------------------ sfx
  play(name: SfxName, opts: { vol?: number; pitch?: number; n?: number } = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const gap = MIN_GAP[name] ?? 0.02;
    if ((this.last[name] ?? -1) + gap > now) return;
    if (this.voices > 28) return;
    this.last[name] = now;
    this.voices++;
    setTimeout(() => this.voices--, 250);
    const v = opts.vol ?? 1;
    const p = (opts.pitch ?? 1) * (0.94 + Math.random() * 0.12);
    const T = this.tone.bind(this),
      N = this.noise.bind(this);
    switch (name) {
      case 'slash':
        N({ dur: 0.14, vol: 0.32 * v, f: 2400 * p, f2: 500, q: 1.2 });
        T({ f: 190 * p, f2: 80, dur: 0.1, vol: 0.18 * v });
        break;
      case 'bow':
        T({ type: 'triangle', f: 620 * p, f2: 360, dur: 0.12, vol: 0.13 * v });
        N({ dur: 0.05, vol: 0.1 * v, type: 'highpass', f: 3000 });
        break;
      case 'fireball':
        N({ dur: 0.28, vol: 0.2 * v, type: 'lowpass', f: 300, f2: 1600, a: 0.05 });
        T({ f: 240 * p, f2: 120, dur: 0.2, vol: 0.08 * v, type: 'triangle' });
        break;
      case 'explode':
        N({ dur: 0.5, vol: 0.45 * v, type: 'lowpass', f: 1400 * p, f2: 90, rev: 0.4 });
        T({ f: 110 * p, f2: 36, dur: 0.45, vol: 0.35 * v });
        break;
      case 'zap':
        T({ type: 'square', f: 1400 * p, f2: 260, dur: 0.09, vol: 0.06 * v, filter: 3500 });
        N({ dur: 0.07, vol: 0.12 * v, type: 'highpass', f: 2500 });
        break;
      case 'seed':
        T({ f: 620 * p, f2: 980, dur: 0.07, vol: 0.1 * v, type: 'sine' });
        break;
      case 'hit':
        N({ dur: 0.06, vol: 0.2 * v, f: 1300 * p, q: 0.8 });
        T({ f: 170 * p, f2: 70, dur: 0.08, vol: 0.2 * v });
        break;
      case 'crit':
        N({ dur: 0.08, vol: 0.3 * v, f: 1800 * p, q: 0.8 });
        T({ f: 220 * p, f2: 60, dur: 0.12, vol: 0.28 * v });
        T({ type: 'triangle', f: 1500 * p, f2: 2200, dur: 0.12, vol: 0.07 * v, rev: 0.4 });
        break;
      case 'enemyDie':
        T({ f: 520 * p, f2: 140, dur: 0.14, vol: 0.14 * v, type: 'triangle' });
        N({ dur: 0.09, vol: 0.14 * v, f: 900 * p, q: 0.7 });
        break;
      case 'squeak':
        T({ f: 1300 * p, f2: 1900, dur: 0.05, vol: 0.07 * v, type: 'triangle' });
        T({ t: 0.05, f: 1800 * p, f2: 800, dur: 0.08, vol: 0.07 * v, type: 'triangle' });
        break;
      case 'blorp':
        T({ f: 360 * p, f2: 70, dur: 0.24, vol: 0.2 * v, vib: 18 });
        break;
      case 'bones':
        for (let i = 0; i < 5; i++) N({ t: i * 0.025 + Math.random() * 0.02, dur: 0.03, vol: 0.14 * v, f: 2200 + Math.random() * 1500, q: 4 });
        break;
      case 'gem': {
        const n = opts.n ?? 0;
        T({ type: 'triangle', f: 880 * Math.pow(2, (n % 12) / 12), dur: 0.09, vol: 0.06 * v, rev: 0.2 });
        break;
      }
      case 'loot': {
        const tier = opts.n ?? 0;
        const notes = [523, 659, 784, 1046, 1318].slice(0, 2 + tier);
        notes.forEach((f, i) => T({ type: 'triangle', f, t: i * 0.06, dur: 0.25, vol: 0.08 * v, rev: 0.4 }));
        break;
      }
      case 'legendary':
        [392, 523, 659, 784, 1046, 1318, 1568].forEach((f, i) => T({ type: 'triangle', f, t: i * 0.07, dur: 0.9, vol: 0.07 * v, rev: 0.7 }));
        T({ f: 131, dur: 1.2, vol: 0.12 * v, a: 0.02, rev: 0.4 });
        break;
      case 'chest':
        T({ type: 'sawtooth', f: 110, f2: 190, dur: 0.25, vol: 0.05 * v, filter: 800 });
        [659, 784, 988, 1318].forEach((f, i) => T({ type: 'triangle', f, t: 0.18 + i * 0.07, dur: 0.35, vol: 0.08 * v, rev: 0.5 }));
        break;
      case 'heal':
        [523, 659, 784].forEach((f, i) => T({ f: f * p, f2: f * 1.5 * p, t: i * 0.05, dur: 0.45, vol: 0.05 * v, rev: 0.6, a: 0.05, curve: 'lin' }));
        break;
      case 'levelup':
        [523, 659, 784, 1046, 1318].forEach((f, i) => {
          T({ type: 'square', f, t: i * 0.075, dur: 0.22, vol: 0.045 * v, filter: 2500, rev: 0.3 });
          T({ type: 'triangle', f: f * 2, t: i * 0.075, dur: 0.3, vol: 0.04 * v });
        });
        T({ type: 'triangle', f: 1568, t: 0.4, dur: 0.6, vol: 0.06 * v, rev: 0.6 });
        break;
      case 'recruit':
        [784, 880, 988, 1175, 1568].forEach((f, i) => T({ type: 'triangle', f, t: i * 0.09, dur: 0.3, vol: 0.08 * v, rev: 0.4 }));
        T({ f: 1500, f2: 2200, t: 0.55, dur: 0.07, vol: 0.06 * v, type: 'triangle' });
        T({ f: 2000, f2: 1300, t: 0.62, dur: 0.09, vol: 0.06 * v, type: 'triangle' });
        break;
      case 'click':
        T({ type: 'triangle', f: 1300, f2: 900, dur: 0.05, vol: 0.07 * v });
        break;
      case 'hover':
        T({ type: 'sine', f: 900, dur: 0.035, vol: 0.03 * v });
        break;
      case 'bossRoar': {
        const ctx = this.ctx;
        const ws = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
          const x = (i / 128) - 1;
          curve[i] = Math.tanh(x * 4);
        }
        ws.curve = curve;
        const g = ctx.createGain();
        g.gain.value = 0.5;
        ws.connect(g).connect(this.sfxBus);
        T({ type: 'sawtooth', f: 95, f2: 48, dur: 1.4, vol: 0.25 * v, dest: ws, a: 0.1, vib: 7 });
        T({ type: 'sawtooth', f: 142, f2: 70, dur: 1.2, vol: 0.12 * v, dest: ws, a: 0.1 });
        N({ dur: 1.3, vol: 0.25 * v, type: 'lowpass', f: 700, f2: 200, a: 0.1, rev: 0.5 });
        break;
      }
      case 'stairs':
        N({ dur: 1.1, vol: 0.2 * v, f: 2400, f2: 180, q: 1.4, a: 0.1, rev: 0.5 });
        [1046, 784, 659, 523].forEach((f, i) => T({ type: 'triangle', f, t: 0.15 + i * 0.14, dur: 0.6, vol: 0.06 * v, rev: 0.7 }));
        break;
      case 'capyHurt':
        T({ type: 'triangle', f: 980 * p, f2: 700, dur: 0.07, vol: 0.06 * v });
        break;
      case 'capyDie':
        [659, 587, 523, 392].forEach((f, i) => T({ type: 'triangle', f, t: i * 0.16, dur: 0.4, vol: 0.09 * v, rev: 0.6 }));
        break;
      case 'wipe':
        [146.8, 174.6, 220, 293.7].forEach((f) => T({ type: 'sawtooth', f, f2: f * 0.94, dur: 3.2, vol: 0.05 * v, filter: 700, a: 0.3, rev: 0.8 }));
        T({ f: 73, dur: 3.5, vol: 0.2 * v, a: 0.2 });
        break;
      case 'enemyShoot':
        T({ type: 'triangle', f: 420 * p, f2: 260, dur: 0.1, vol: 0.07 * v });
        N({ dur: 0.05, vol: 0.06 * v, type: 'highpass', f: 2000 });
        break;
      case 'spore':
        T({ f: 260 * p, f2: 180, dur: 0.18, vol: 0.09 * v, vib: 30 });
        N({ dur: 0.2, vol: 0.06 * v, type: 'lowpass', f: 600 });
        break;
      case 'telegraph':
        T({ type: 'triangle', f: 220 * p, f2: 520 * p, dur: 0.45, vol: 0.07 * v, curve: 'lin', a: 0.05 });
        break;
      case 'slam':
        T({ f: 90 * p, f2: 30, dur: 0.45, vol: 0.4 * v });
        N({ dur: 0.35, vol: 0.3 * v, type: 'lowpass', f: 900, f2: 100, rev: 0.4 });
        break;
      case 'break':
        N({ dur: 0.14, vol: 0.25 * v, f: 700 * p, q: 1.5 });
        for (let i = 0; i < 3; i++) N({ t: 0.03 + i * 0.03, dur: 0.03, vol: 0.1 * v, f: 1800 + i * 400, q: 3 });
        break;
      case 'chomp':
        N({ dur: 0.05, vol: 0.2 * v, f: 1200, q: 1 });
        N({ t: 0.09, dur: 0.05, vol: 0.2 * v, f: 1000, q: 1 });
        T({ t: 0.18, f: 523, f2: 784, dur: 0.18, vol: 0.06 * v, type: 'triangle' });
        break;
      case 'portal':
        for (let i = 0; i < 8; i++) T({ type: 'sine', f: 400 + i * 120, t: i * 0.05, dur: 0.5, vol: 0.04 * v, rev: 0.7 });
        break;
      case 'perk':
        [784, 1175, 1568].forEach((f, i) => T({ type: 'triangle', f, t: i * 0.05, dur: 0.4, vol: 0.07 * v, rev: 0.5 }));
        break;
      case 'deny':
        T({ type: 'square', f: 140, dur: 0.15, vol: 0.05 * v, filter: 900 });
        break;
      case 'branch':
        N({ dur: 0.4, vol: 0.18 * v, type: 'bandpass', f: 500, f2: 1400, q: 2, a: 0.03 });
        break;
      case 'bubble':
        T({ f: 500 * p, f2: 1200, dur: 0.06, vol: 0.06 * v });
        break;
      case 'splash':
        N({ dur: 0.3, vol: 0.15 * v, type: 'highpass', f: 1500, f2: 600 });
        break;
      case 'open':
        [392, 523, 659].forEach((f, i) => T({ type: 'triangle', f, t: i * 0.05, dur: 0.2, vol: 0.05 * v }));
        break;
      case 'dodge':
        N({ dur: 0.1, vol: 0.08 * v, type: 'highpass', f: 3000, f2: 6000 });
        break;
    }
  }

  setMusic(track: TrackName) {
    this.music?.setTrack(track);
  }
  setIntensity(v: number) {
    if (this.music) this.music.intensity = v;
  }
}

// ---------------------------------------------------------------- music
const NOTE = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

interface TrackDef {
  bpm: number;
  chords: number[][]; // midi notes per bar
  bass: number[]; // bass root per bar
  scale: number[]; // melody scale (midi)
  drums: 'none' | 'soft' | 'drive';
  arp: boolean;
  lead: OscillatorType;
  swing: number;
}

const TRACKS: Record<Exclude<TrackName, 'none'>, TrackDef> = {
  title: {
    bpm: 76,
    chords: [[65, 69, 72], [57, 60, 64], [58, 62, 65], [60, 64, 67], [65, 69, 72], [62, 65, 69], [58, 62, 65], [60, 64, 67]],
    bass: [41, 45, 46, 48, 41, 38, 46, 48],
    scale: [72, 74, 76, 77, 79, 81, 84, 86],
    drums: 'none',
    arp: true,
    lead: 'sine',
    swing: 0,
  },
  dungeon: {
    bpm: 98,
    chords: [[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 60, 64], [62, 65, 69], [65, 69, 72], [55, 58, 62], [57, 61, 64]],
    bass: [38, 34, 36, 33, 38, 41, 31, 33],
    scale: [74, 76, 77, 79, 81, 82, 84, 86],
    drums: 'soft',
    arp: true,
    lead: 'triangle',
    swing: 0.08,
  },
  boss: {
    bpm: 142,
    chords: [[62, 65, 69], [63, 67, 70], [62, 65, 69], [60, 64, 67], [62, 65, 69], [63, 67, 70], [58, 62, 65], [61, 64, 69]],
    bass: [38, 39, 38, 36, 38, 39, 34, 37],
    scale: [74, 75, 77, 79, 81, 82, 84, 86],
    drums: 'drive',
    arp: true,
    lead: 'square',
    swing: 0,
  },
};

class MusicSequencer {
  a: AudioSystem;
  track: TrackName = 'none';
  def: TrackDef | null = null;
  bus: GainNode;
  step = 0;
  nextTime = 0;
  timer: number | null = null;
  intensity = 0;
  motif: number[] = [];
  rng = new RNG(1234);

  constructor(a: AudioSystem) {
    this.a = a;
    this.bus = a.ctx!.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(a.musicBus);
    const send = a.ctx!.createGain();
    send.gain.value = 0.5;
    this.bus.connect(send).connect(a.reverbSend);
  }

  setTrack(t: TrackName) {
    if (t === this.track) return;
    const ctx = this.a.ctx!;
    const now = ctx.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setValueAtTime(this.bus.gain.value, now);
    this.bus.gain.linearRampToValueAtTime(0, now + 0.6);
    this.track = t;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (t === 'none') return;
    setTimeout(() => {
      if (this.track !== t) return;
      this.def = TRACKS[t];
      this.step = 0;
      this.nextTime = ctx.currentTime + 0.1;
      this.newMotif();
      const n2 = ctx.currentTime;
      this.bus.gain.cancelScheduledValues(n2);
      this.bus.gain.setValueAtTime(0, n2);
      this.bus.gain.linearRampToValueAtTime(1, n2 + 1.2);
      if (this.timer) clearInterval(this.timer);
      this.timer = window.setInterval(() => this.tick(), 25);
    }, 650);
  }

  newMotif() {
    const len = 8;
    this.motif = [];
    let idx = this.rng.int(0, 4);
    for (let i = 0; i < len; i++) {
      idx = Math.max(0, Math.min(7, idx + this.rng.pick([-2, -1, -1, 0, 1, 1, 2])));
      this.motif.push(this.rng.chance(0.3) ? -1 : idx);
    }
  }

  tick() {
    const ctx = this.a.ctx!;
    if (!this.def) return;
    // don't pile up notes when the tab was suspended
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.schedule(this.step, this.nextTime);
      const spb = 60 / this.def.bpm / 4; // 16th notes
      const swing = this.step % 2 === 0 ? 1 + this.def.swing : 1 - this.def.swing;
      this.nextTime += spb * swing;
      this.step++;
    }
  }

  schedule(step: number, t: number) {
    const d = this.def!;
    const a = this.a;
    const ctx = a.ctx!;
    const dt = t - ctx.currentTime;
    const bar = Math.floor(step / 16) % d.chords.length;
    const s = step % 16;
    const chord = d.chords[bar];
    const spb = 60 / d.bpm;
    const phrase = Math.floor(step / (16 * 8));
    if (s === 0 && bar === 0 && step > 0 && phrase % 2 === 0) this.newMotif();
    const bus = this.bus;
    const inten = this.intensity;

    // pad
    if (s === 0) {
      for (const n of chord) {
        a.tone({ type: 'sawtooth', f: NOTE(n), t: dt, dur: spb * 4.2, vol: d.drums === 'drive' ? 0.018 : 0.022, a: 0.5, filter: 900, dest: bus, detune: -7 });
        a.tone({ type: 'sawtooth', f: NOTE(n), t: dt, dur: spb * 4.2, vol: d.drums === 'drive' ? 0.018 : 0.022, a: 0.5, filter: 900, dest: bus, detune: 7 });
      }
    }
    // bass
    const root = d.bass[bar];
    if (d.drums === 'drive') {
      if (s % 2 === 0) a.tone({ type: 'sawtooth', f: NOTE(root + (s % 8 === 6 ? 12 : 0)), t: dt, dur: spb * 0.45, vol: 0.07, filter: 500, dest: bus });
    } else if (d.drums === 'soft') {
      if (s === 0 || s === 6 || s === 10) a.tone({ type: 'triangle', f: NOTE(root), t: dt, dur: spb * (s === 0 ? 1.4 : 0.8), vol: 0.12, dest: bus });
    } else if (s === 0 || s === 8) a.tone({ type: 'sine', f: NOTE(root + 12), t: dt, dur: spb * 2, vol: 0.08, a: 0.05, dest: bus });

    // arpeggio
    if (d.arp) {
      const every = d.drums === 'drive' ? 1 : 2;
      if (s % every === 0) {
        const pat = [0, 1, 2, 1, 0, 2, 1, 2];
        const k = pat[(s / every) % pat.length];
        const note = chord[k] + (d.drums === 'none' ? 12 : 12);
        const vol = d.drums === 'none' ? 0.03 : d.drums === 'drive' ? 0.02 : 0.025;
        const g = a.tone({ type: d.drums === 'drive' ? 'square' : 'triangle', f: NOTE(note), t: dt, dur: spb * 0.4, vol, dest: bus, filter: 2600 });
        void g;
      }
    }
    // melody motif (every other bar pair)
    const melodyOn = d.drums === 'none' ? true : bar % 4 >= 2 || (d.drums === 'drive' && inten > 0.3);
    if (melodyOn && s % 4 === 0) {
      const mi = this.motif[(s / 4 + (bar % 2) * 4) % this.motif.length];
      if (mi >= 0) {
        const f = NOTE(d.scale[mi] - (d.drums === 'drive' ? 12 : 0));
        const bell = d.drums === 'none';
        a.tone({ type: d.lead, f, t: dt, dur: spb * (bell ? 1.6 : 0.9), vol: bell ? 0.05 : d.drums === 'drive' ? 0.025 : 0.035, dest: bus, filter: d.lead === 'square' ? 1800 : undefined, a: 0.01 });
        if (bell) a.tone({ type: 'sine', f: f * 2, t: dt, dur: spb * 0.8, vol: 0.015, dest: bus });
        // echo
        const s2 = a.ctx!.createGain();
        s2.gain.value = 0;
        void s2;
      }
    }

    // drums
    const kick = (vol: number) => a.tone({ f: 130, f2: 38, t: dt, dur: 0.22, vol, dest: bus });
    const hat = (vol: number) => a.noise({ t: dt, dur: 0.04, vol, type: 'highpass', f: 7000, dest: bus });
    const snare = (vol: number) => {
      a.noise({ t: dt, dur: 0.14, vol, type: 'bandpass', f: 1800, q: 0.7, dest: bus });
      a.tone({ f: 200, f2: 120, t: dt, dur: 0.08, vol: vol * 0.5, dest: bus });
    };
    if (d.drums === 'soft') {
      const k = 0.13 + inten * 0.08;
      if (s === 0 || s === 10) kick(k);
      if (s === 4 || s === 12) snare(0.035 + inten * 0.06);
      if (s % 2 === 0) hat(0.012 + inten * 0.02);
      if (inten > 0.5 && (s === 7 || s === 15)) hat(0.02);
    } else if (d.drums === 'drive') {
      if (s % 4 === 0) kick(0.2);
      if (s === 4 || s === 12) snare(0.1);
      if (s % 2 === 1) hat(0.03);
      if (bar % 4 === 3 && s >= 12) a.tone({ f: 180 - (s - 12) * 20, f2: 80, t: dt, dur: 0.15, vol: 0.12, dest: bus });
    } else if (s % 4 === 2) hat(0.004);
  }
}

export const audio = new AudioSystem();
export type { SfxName };
