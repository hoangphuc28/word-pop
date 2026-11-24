export type BgmTrackId = 'groove' | 'lofi';

export const BGM_TRACK_IDS: readonly BgmTrackId[] = ['groove', 'lofi'];

type AudioContextCtor = typeof AudioContext;

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: AudioContextCtor;
}

const BGM_TOTAL_STEPS = 64;

const TRACK_STEP_MS: Record<BgmTrackId, number> = {
  lofi: 183, // ~82 BPM chill lo-fi groove (gameplay)
  groove: 122, // ~122 BPM upbeat future-pop / chill-house (home)
};

// Track 1: Chill Lo-Fi (Fmaj7 -> Em7 -> Dm9 -> Cmaj7) — warm, stress-free
const LOFI_CHORDS: readonly (readonly number[])[] = [
  [174.61, 220.0, 261.63, 329.63], // Bar 0: Fmaj7
  [164.81, 196.0, 246.94, 293.66], // Bar 1: Em7
  [146.83, 220.0, 261.63, 329.63], // Bar 2: Dm9
  [130.81, 196.0, 246.94, 329.63], // Bar 3: Cmaj7
];

const LOFI_BASS: readonly number[] = [
  87.31, // F2
  82.41, // E2
  73.42, // D2
  65.41, // C2
];

const LOFI_LEAD: readonly (number | null)[] = [
  // Bar 0 (Fmaj7)
  null, null, 523.25, null, null, null, 659.25, null,
  null, null, 587.33, null, null, null, null, null,
  // Bar 1 (Em7)
  null, null, 493.88, null, null, null, 587.33, null,
  null, null, 523.25, null, 440.0, null, null, null,
  // Bar 2 (Dm9)
  null, null, 523.25, null, null, null, 659.25, null,
  null, null, 783.99, null, 659.25, null, null, null,
  // Bar 3 (Cmaj7)
  null, null, 587.33, null, null, null, 523.25, null,
  null, null, null, null, 392.0, null, null, null,
];

// Track 2: Upbeat Pop (Fmaj7 -> G6 -> Em7 -> Am7) — Home 122 BPM groove
const CHORD_BARS: readonly (readonly number[])[] = [
  [174.61, 220.0, 261.63, 329.63], // Bar 0: Fmaj7
  [196.0, 246.94, 293.66, 329.63], // Bar 1: G6
  [164.81, 196.0, 246.94, 293.66], // Bar 2: Em7
  [220.0, 261.63, 329.63, 392.0], // Bar 3: Am7
];

const BASS_ROOTS: readonly number[] = [
  87.31, // F2
  98.0, // G2
  82.41, // E2
  110.0, // A2
];

const MODERN_LEAD: readonly (number | null)[] = [
  // Bar 0 (Fmaj7)
  659.25, null, null, 587.33, null, null, 523.25, null,
  null, 523.25, 587.33, null, 659.25, null, 783.99, null,
  // Bar 1 (G6)
  null, null, 783.99, null, 659.25, null, 587.33, null,
  null, 523.25, null, 587.33, 659.25, null, null, null,
  // Bar 2 (Em7)
  783.99, null, null, 659.25, null, null, 587.33, null,
  null, 587.33, 659.25, null, 783.99, null, 880.0, null,
  // Bar 3 (Am7)
  null, null, 783.99, null, 659.25, null, 523.25, null,
  null, 587.33, null, 659.25, 523.25, null, null, null,
];

const BGM_GAIN_BOOST = 2.1;

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0.85;
  return Math.max(0, Math.min(1, value));
}

class WebAudioSoundEngine {
  private enabled = true;
  private musicEnabled = true;
  private musicTrack: BgmTrackId = 'groove';
  private sfxVolume = 0.85;
  private musicVolume = 0.85;
  private bgmWanted = false;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private bgmStep = 0;
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = clampVolume(volume);
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = clampVolume(volume);
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setMusicTrack(track: BgmTrackId): void {
    if (this.musicTrack === track) {
      return;
    }
    this.musicTrack = track;
    this.bgmStep = 0;
    if (this.bgmTimer !== null) {
      this.clearBgmTimer();
      if (this.musicEnabled && this.bgmWanted) {
        this.ensureBgmRunning();
      }
    }
  }

  public getMusicTrack(): BgmTrackId {
    return this.musicTrack;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.clearBgmTimer();
    } else if (this.bgmWanted) {
      this.ensureBgmRunning();
    }
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public startBgm(): void {
    this.bgmWanted = true;
    if (!this.musicEnabled) {
      return;
    }
    this.ensureBgmRunning();
  }

  public stopBgm(): void {
    this.bgmWanted = false;
    this.clearBgmTimer();
  }

  private clearBgmTimer(): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private ensureBgmRunning(): void {
    if (this.bgmTimer !== null) {
      return;
    }
    const ctx = this.getAudioContext();
    if (!ctx) {
      return;
    }
    const stepMs = TRACK_STEP_MS[this.musicTrack];
    this.tickBgm();
    this.bgmTimer = setInterval(() => {
      this.tickBgm();
    }, stepMs);
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer | null {
    if (this.noiseBuffer) return this.noiseBuffer;
    if (typeof ctx.createBuffer !== 'function') return null;
    try {
      const length = Math.floor(ctx.sampleRate * 0.12);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
      return buffer;
    } catch {
      return null;
    }
  }

  private playKick(ctx: AudioContext, startTime: number, volScale: number, soft = false): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(soft ? 112 : 145, startTime);
    osc.frequency.exponentialRampToValueAtTime(soft ? 42 : 44, startTime + 0.08);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime((soft ? 0.048 : 0.085) * volScale, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + (soft ? 0.19 : 0.16));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + (soft ? 0.2 : 0.17));
  }

  private playNoisePerc(
    ctx: AudioContext,
    startTime: number,
    options: { filterType: BiquadFilterType; freq: number; duration: number; peakGain: number }
  ): void {
    const buffer = this.getNoiseBuffer(ctx);
    if (!buffer || typeof ctx.createBiquadFilter !== 'function') return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = options.filterType;
    filter.frequency.setValueAtTime(options.freq, startTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(options.peakGain, startTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + options.duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(startTime);
    src.stop(startTime + options.duration + 0.01);
  }

  private playWarmPadChord(
    ctx: AudioContext,
    freqs: readonly number[],
    startTime: number,
    volScale: number,
    options: {
      attack: number;
      duration: number;
      peakGain: number;
      cutoffStart: number;
      cutoffEnd: number;
      type: OscillatorType;
    }
  ): void {
    const hasFilter = typeof ctx.createBiquadFilter === 'function';
    const filter = hasFilter ? ctx.createBiquadFilter() : null;
    const master = ctx.createGain();

    if (filter) {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(options.cutoffStart, startTime);
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(120, options.cutoffEnd),
        startTime + options.duration
      );
      filter.Q.setValueAtTime(0.8, startTime);
      filter.connect(master);
    }

    master.gain.setValueAtTime(0.0001, startTime);
    master.gain.linearRampToValueAtTime(options.peakGain * volScale, startTime + options.attack);
    master.gain.exponentialRampToValueAtTime(0.0001, startTime + options.duration);
    master.connect(ctx.destination);

    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      osc.type = options.type;
      osc.frequency.setValueAtTime(freq, startTime);
      osc.connect(filter ?? master);
      osc.start(startTime);
      osc.stop(startTime + options.duration + 0.03);
    }
  }

  private playModernChordStab(
    ctx: AudioContext,
    freqs: readonly number[],
    startTime: number,
    volScale: number
  ): void {
    const hasFilter = typeof ctx.createBiquadFilter === 'function';
    const filter = hasFilter ? ctx.createBiquadFilter() : null;
    const master = ctx.createGain();

    if (filter) {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1900, startTime);
      filter.frequency.exponentialRampToValueAtTime(460, startTime + 0.28);
      filter.Q.setValueAtTime(1.2, startTime);
      filter.connect(master);
    }

    master.gain.setValueAtTime(0.0001, startTime);
    master.gain.linearRampToValueAtTime(0.022 * volScale, startTime + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.32);
    master.connect(ctx.destination);

    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.connect(filter ?? master);
      osc.start(startTime);
      osc.stop(startTime + 0.34);
    }
  }

  private playModernPluck(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    volScale: number
  ): void {
    const osc = ctx.createOscillator();
    const harmonic = ctx.createOscillator();
    const gain = ctx.createGain();
    const harmGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    harmonic.type = 'triangle';
    harmonic.frequency.setValueAtTime(freq * 2, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(0.032 * volScale, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

    harmGain.gain.setValueAtTime(0.0001, startTime);
    harmGain.gain.linearRampToValueAtTime(0.008 * volScale, startTime + 0.005);
    harmGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.09);

    osc.connect(gain);
    harmonic.connect(harmGain);
    harmGain.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    harmonic.start(startTime);
    osc.stop(startTime + 0.24);
    harmonic.stop(startTime + 0.11);
  }

  private playSoftBell(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    volScale: number,
    duration: number,
    peakGain: number
  ): void {
    const osc = ctx.createOscillator();
    const shimmer = ctx.createOscillator();
    const gain = ctx.createGain();
    const shimmerGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(freq * 2, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain * volScale, startTime + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    shimmerGain.gain.setValueAtTime(0.0001, startTime);
    shimmerGain.gain.linearRampToValueAtTime(peakGain * 0.18 * volScale, startTime + 0.01);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.45);

    osc.connect(gain);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    shimmer.start(startTime);
    osc.stop(startTime + duration + 0.02);
    shimmer.stop(startTime + duration * 0.5);
  }

  private tickLofi(
    ctx: AudioContext,
    now: number,
    step: number,
    bar: number,
    stepInBar: number,
    volScale: number
  ): void {
    if (stepInBar === 0) {
      this.playWarmPadChord(ctx, LOFI_CHORDS[bar], now, volScale, {
        attack: 0.045,
        duration: 1.55,
        peakGain: 0.022,
        cutoffStart: 1050,
        cutoffEnd: 380,
        type: 'triangle',
      });
    } else if (stepInBar === 10) {
      this.playWarmPadChord(ctx, LOFI_CHORDS[bar], now, volScale, {
        attack: 0.035,
        duration: 0.75,
        peakGain: 0.013,
        cutoffStart: 820,
        cutoffEnd: 340,
        type: 'sine',
      });
    }

    if (stepInBar === 0 || stepInBar === 10) {
      this.playTone(ctx, {
        type: 'sine',
        startFreq: LOFI_BASS[bar],
        startTime: now,
        duration: stepInBar === 0 ? 0.55 : 0.32,
        peakGain: 0.042 * volScale,
      });
    }

    if (stepInBar === 0 || stepInBar === 10) {
      this.playKick(ctx, now, volScale, true);
    }

    if (stepInBar === 4 || stepInBar === 12) {
      this.playNoisePerc(ctx, now, {
        filterType: 'bandpass',
        freq: 1100,
        duration: 0.06,
        peakGain: 0.012 * volScale,
      });
    }

    if (stepInBar % 2 === 0) {
      this.playNoisePerc(ctx, now, {
        filterType: 'highpass',
        freq: 6200,
        duration: 0.028,
        peakGain: (stepInBar % 4 === 2 ? 0.0075 : 0.0045) * volScale,
      });
    }

    const leadFreq = LOFI_LEAD[step];
    if (leadFreq !== null) {
      this.playSoftBell(ctx, leadFreq, now, volScale, 0.55, 0.024);
    }
  }

  private tickGroove(
    ctx: AudioContext,
    now: number,
    step: number,
    bar: number,
    stepInBar: number,
    volScale: number
  ): void {
    if (stepInBar % 4 === 0) {
      this.playKick(ctx, now, volScale);
    }

    if (stepInBar === 4 || stepInBar === 12) {
      this.playNoisePerc(ctx, now, {
        filterType: 'bandpass',
        freq: 1450,
        duration: 0.075,
        peakGain: 0.022 * volScale,
      });
    }

    if (stepInBar % 4 === 2) {
      this.playNoisePerc(ctx, now, {
        filterType: 'highpass',
        freq: 7800,
        duration: 0.04,
        peakGain: 0.015 * volScale,
      });
    }

    if (stepInBar === 0 || stepInBar === 6 || stepInBar === 12) {
      this.playModernChordStab(ctx, CHORD_BARS[bar], now, volScale);
    }

    if (stepInBar === 2 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
      const root = BASS_ROOTS[bar];
      const bassFreq = stepInBar === 14 ? root * 1.5 : root;
      this.playTone(ctx, {
        type: 'sine',
        startFreq: bassFreq,
        startTime: now,
        duration: 0.18,
        peakGain: 0.055 * volScale,
      });
    }

    const leadFreq = MODERN_LEAD[step];
    if (leadFreq !== null) {
      this.playModernPluck(ctx, leadFreq, now, volScale);
    }
  }

  private tickBgm(): void {
    if (!this.musicEnabled || !this.bgmWanted) {
      this.clearBgmTimer();
      return;
    }
    const ctx = this.getAudioContext();
    if (!ctx || ctx.state === 'suspended') {
      return;
    }
    const volScale = this.musicVolume * BGM_GAIN_BOOST;
    if (volScale <= 0.001) {
      this.bgmStep = (this.bgmStep + 1) % BGM_TOTAL_STEPS;
      return;
    }
    try {
      const now = ctx.currentTime;
      const step = this.bgmStep % BGM_TOTAL_STEPS;
      const bar = Math.floor(step / 16);
      const stepInBar = step % 16;

      if (this.musicTrack === 'lofi') {
        this.tickLofi(ctx, now, step, bar, stepInBar, volScale);
      } else {
        this.tickGroove(ctx, now, step, bar, stepInBar, volScale);
      }

      this.bgmStep = (this.bgmStep + 1) % BGM_TOTAL_STEPS;
    } catch {
      // Safe no-op
    }
  }

  private getAudioContext(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {
          // Ignore autoplay resume errors in restricted contexts
        });
      }
      return this.ctx;
    }

    const Ctor: AudioContextCtor | undefined =
      typeof globalThis.AudioContext === 'function'
        ? globalThis.AudioContext
        : typeof window !== 'undefined'
          ? (window as WindowWithWebkitAudio).webkitAudioContext
          : undefined;

    if (!Ctor) {
      return null;
    }

    try {
      this.ctx = new Ctor();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private getSfxContext(): AudioContext | null {
    if (!this.enabled || this.sfxVolume <= 0.001) {
      return null;
    }
    return this.getAudioContext();
  }

  private playSfxTone(
    ctx: AudioContext,
    options: {
      type: OscillatorType;
      startFreq: number;
      endFreq?: number;
      startTime: number;
      duration: number;
      peakGain: number;
    }
  ): void {
    this.playTone(ctx, {
      ...options,
      peakGain: options.peakGain * this.sfxVolume,
    });
  }

  private playTone(
    ctx: AudioContext,
    options: {
      type: OscillatorType;
      startFreq: number;
      endFreq?: number;
      startTime: number;
      duration: number;
      peakGain: number;
    }
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = options.type;
    osc.frequency.setValueAtTime(options.startFreq, options.startTime);
    if (options.endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, options.endFreq),
        options.startTime + options.duration
      );
    }

    gain.gain.setValueAtTime(0.0001, options.startTime);
    gain.gain.linearRampToValueAtTime(options.peakGain, options.startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, options.startTime + options.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(options.startTime);
    osc.stop(options.startTime + options.duration + 0.01);
  }

  public playPop(): void {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      this.playSfxTone(ctx, {
        type: 'sine',
        startFreq: 420,
        endFreq: 660,
        startTime: now,
        duration: 0.075,
        peakGain: 0.14,
      });
    } catch {
      // Safe no-op
    }
  }

  public playPlace(): void {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      this.playSfxTone(ctx, {
        type: 'triangle',
        startFreq: 540,
        endFreq: 260,
        startTime: now,
        duration: 0.06,
        peakGain: 0.16,
      });
    } catch {
      // Safe no-op
    }
  }

  public playHint(): void {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      this.playSfxTone(ctx, {
        type: 'sine',
        startFreq: 783.99, // G5
        startTime: now,
        duration: 0.11,
        peakGain: 0.13,
      });
      this.playSfxTone(ctx, {
        type: 'sine',
        startFreq: 987.77, // B5
        startTime: now + 0.07,
        duration: 0.18,
        peakGain: 0.14,
      });
    } catch {
      // Safe no-op
    }
  }

  public playSuccess(streak = 0): void {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const semitoneBoost = Math.min(Math.max(0, streak), 8);
      const ratio = Math.pow(2, semitoneBoost / 12);
      const base = 523.25 * ratio; // C5 shifted up by streak

      this.playSfxTone(ctx, {
        type: 'triangle',
        startFreq: base,
        startTime: now,
        duration: 0.12,
        peakGain: 0.16,
      });
      this.playSfxTone(ctx, {
        type: 'sine',
        startFreq: base * 1.25,
        startTime: now + 0.09,
        duration: 0.18,
        peakGain: 0.18,
      });
    } catch {
      // Safe no-op
    }
  }

  public playError(): void {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      this.playSfxTone(ctx, {
        type: 'triangle',
        startFreq: 240,
        endFreq: 165,
        startTime: now,
        duration: 0.16,
        peakGain: 0.13,
      });
    } catch {
      // Safe no-op
    }
  }

  public playVictory(): void {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        this.playSfxTone(ctx, {
          type: 'triangle',
          startFreq: freq,
          startTime: now + idx * 0.095,
          duration: idx === notes.length - 1 ? 0.34 : 0.14,
          peakGain: 0.17,
        });
      });
    } catch {
      // Safe no-op
    }
  }

  public playGameOver(): void {
    const ctx = this.getSfxContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [392.0, 349.23, 329.63, 261.63]; // G4 -> F4 -> E4 -> C4
      notes.forEach((freq, idx) => {
        this.playSfxTone(ctx, {
          type: 'triangle',
          startFreq: freq,
          startTime: now + idx * 0.12,
          duration: idx === notes.length - 1 ? 0.36 : 0.14,
          peakGain: 0.14,
        });
      });
    } catch {
      // Safe no-op
    }
  }
}

export const soundEngine: {
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  setMusicEnabled(enabled: boolean): void;
  isMusicEnabled(): boolean;
  setMusicTrack(track: BgmTrackId): void;
  getMusicTrack(): BgmTrackId;
  setSfxVolume(volume: number): void;
  getSfxVolume(): number;
  setMusicVolume(volume: number): void;
  getMusicVolume(): number;
  startBgm(): void;
  stopBgm(): void;
  playPop(): void;
  playPlace(): void;
  playHint(): void;
  playSuccess(streak?: number): void;
  playError(): void;
  playVictory(): void;
  playGameOver(): void;
} = new WebAudioSoundEngine();
