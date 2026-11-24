export type BgmMode = 'home' | 'study';

interface AudioContextConstructor {
  new (): AudioContext;
}

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return win.AudioContext ?? win.webkitAudioContext ?? null;
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0.85;
  return Math.max(0, Math.min(1, value));
}

// MIDI note to Hz
function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * WordPop Sunset Audio Engine:
 * - Home BGM ("Golden Sunset Breeze"): dreamy Fmaj7 → Dm9 → Bbmaj7 → C9 Rhodes & warm harp arpeggios (80 BPM)
 * - Study BGM ("Lo-Fi Sunset Chill"): ultra-chill Ebmaj7 → Cm9 → Abmaj7 → Bb13 lo-fi Rhodes, soft sub-bass & whisper brush (66 BPM)
 * - Tactile wooden/ceramic 2.5D tile SFX
 */
class SunsetSoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private musicEnabled = true;
  private sfxVolume = 0.85;
  private musicVolume = 0.85;
  private bgmMode: BgmMode = 'home';
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private bgmStep = 0;
  private ducked = false;

  private ensureContext(): AudioContext | null {
    const Ctor = getAudioContextConstructor();
    if (!Ctor) return null;
    try {
      if (!this.ctx) {
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended' && typeof this.ctx.resume === 'function') {
        void this.ctx.resume().catch(() => {
          // Ignore autoplay restriction until user gesture
        });
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopBgm();
    }
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
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

  public setBgmMode(mode: BgmMode): void {
    if (this.bgmMode === mode) return;
    this.bgmMode = mode;
    if (this.bgmTimer !== null) {
      this.stopBgm();
      this.startBgm();
    }
  }

  public getBgmMode(): BgmMode {
    return this.bgmMode;
  }

  public setDucked(ducked: boolean): void {
    this.ducked = ducked;
  }

  /** Plays a warm, low-pass filtered Rhodes/marimba-style note */
  private playWarmTone(options: {
    freq: number;
    duration: number;
    gain: number;
    type?: OscillatorType;
    attack?: number;
    cutoff?: number;
    delay?: number;
  }): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime + (options.delay ?? 0);
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const amp = ctx.createGain();

      osc.type = options.type ?? 'triangle';
      osc.frequency.setValueAtTime(options.freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(options.cutoff ?? 1600, now);
      filter.Q.setValueAtTime(0.8, now);

      const attack = options.attack ?? 0.025;
      const peak = Math.max(0.0001, options.gain);
      amp.gain.setValueAtTime(0.0001, now);
      amp.gain.linearRampToValueAtTime(peak, now + attack);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

      osc.connect(filter);
      filter.connect(amp);
      amp.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + options.duration + 0.05);
    } catch {
      // Safe no-op in restricted audio environments
    }
  }

  /** Soft lo-fi brushed shaker / hat pulse for study chill beat */
  private playSoftBrush(gain: number): void {
    const ctx = this.ensureContext();
    if (!ctx || typeof ctx.createBuffer !== 'function') return;
    try {
      const length = Math.floor(ctx.sampleRate * 0.045);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.35));
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3400, ctx.currentTime);
      filter.Q.setValueAtTime(1.4, ctx.currentTime);

      const amp = ctx.createGain();
      amp.gain.setValueAtTime(Math.max(0.0001, gain), ctx.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.045);

      src.connect(filter);
      filter.connect(amp);
      amp.connect(ctx.destination);
      src.start();
    } catch {
      // Safe no-op
    }
  }

  private tickHomeBgm(): void {
    if (!this.musicEnabled || this.musicVolume <= 0.001) return;
    const baseGain = 0.055 * this.musicVolume * (this.ducked ? 0.3 : 1);

    // 4-bar sunset progression (Fmaj7 -> Dm9 -> Bbmaj7 -> C9), 8 eighth-note steps per bar = 32 steps
    const chords: number[][] = [
      [53, 60, 64, 69], // Fmaj7
      [50, 57, 60, 64], // Dm9
      [46, 53, 57, 62], // Bbmaj7
      [48, 55, 58, 62], // C9
    ];
    const melody: Array<number | null> = [
      72, null, 74, null, 76, null, 72, null,
      69, null, 72, null, 74, null, null, null,
      70, null, 72, null, 74, null, 69, null,
      67, null, 72, null, 74, null, null, null,
    ];

    const step = this.bgmStep % 32;
    const bar = Math.floor(step / 8);
    const beatInBar = step % 8;
    const chord = chords[bar];

    // Warm Rhodes chord strum on beat 0 of each bar
    if (beatInBar === 0) {
      chord.forEach((midi, idx) => {
        this.playWarmTone({
          freq: midiToHz(midi),
          duration: 2.35,
          gain: baseGain * (idx === 0 ? 0.72 : 0.48),
          type: 'sine',
          attack: 0.06,
          cutoff: 1200,
          delay: idx * 0.03,
        });
      });
    }

    // Gentle sunset harp arpeggio
    if (beatInBar === 2 || beatInBar === 5) {
      const arpNote = chord[(beatInBar + bar) % chord.length] + 12;
      this.playWarmTone({
        freq: midiToHz(arpNote),
        duration: 0.9,
        gain: baseGain * 0.36,
        type: 'triangle',
        attack: 0.02,
        cutoff: 1450,
      });
    }

    // Dreamy top melody
    const mel = melody[step];
    if (mel !== null) {
      this.playWarmTone({
        freq: midiToHz(mel),
        duration: 0.85,
        gain: baseGain * 0.42,
        type: 'triangle',
        attack: 0.03,
        cutoff: 1550,
      });
    }

    this.bgmStep += 1;
  }

  private tickStudyBgm(): void {
    if (!this.musicEnabled || this.musicVolume <= 0.001) return;
    // Ultra-chill lo-fi sunset beat (softer than Home so studying & pronunciation stay crisp)
    const baseGain = 0.044 * this.musicVolume * (this.ducked ? 0.25 : 1);

    // 4-bar lo-fi sunset chords (Ebmaj7 -> Cm9 -> Abmaj7 -> Bb13), 8 steps per bar = 32 steps
    const chords: number[][] = [
      [51, 58, 62, 67], // Ebmaj7
      [48, 55, 58, 62], // Cm9
      [44, 51, 55, 60], // Abmaj7
      [46, 53, 56, 60], // Bb9sus4
    ];
    const bassNotes = [39, 36, 32, 34]; // Eb2, C2, Ab1, Bb1
    const chillLead: Array<number | null> = [
      null, null, 70, null, null, 67, null, null,
      null, null, 65, null, 67, null, null, null,
      null, null, 67, null, null, 63, null, null,
      null, null, 65, null, null, 62, null, null,
    ];

    const step = this.bgmStep % 32;
    const bar = Math.floor(step / 8);
    const beatInBar = step % 8;
    const chord = chords[bar];

    // Muffled lo-fi Rhodes chord on beat 0 and soft ghost chord on beat 5
    if (beatInBar === 0) {
      chord.forEach((midi, idx) => {
        this.playWarmTone({
          freq: midiToHz(midi),
          duration: 3.1,
          gain: baseGain * 0.52,
          type: 'sine',
          attack: 0.09,
          cutoff: 920,
          delay: idx * 0.035,
        });
      });
      // Cozy warm sub-bass
      this.playWarmTone({
        freq: midiToHz(bassNotes[bar]),
        duration: 1.8,
        gain: baseGain * 0.85,
        type: 'sine',
        attack: 0.05,
        cutoff: 320,
      });
    } else if (beatInBar === 5) {
      this.playWarmTone({
        freq: midiToHz(chord[2]),
        duration: 1.1,
        gain: baseGain * 0.28,
        type: 'sine',
        attack: 0.05,
        cutoff: 820,
      });
    }

    // Whisper-soft lo-fi brushed groove on off-beats
    if (beatInBar === 2 || beatInBar === 6) {
      this.playSoftBrush(baseGain * 0.28);
    }

    // Sparse dreamy chill lead notes
    const lead = chillLead[step];
    if (lead !== null) {
      this.playWarmTone({
        freq: midiToHz(lead),
        duration: 1.35,
        gain: baseGain * 0.34,
        type: 'triangle',
        attack: 0.045,
        cutoff: 1050,
      });
    }

    this.bgmStep += 1;
  }

  public startBgm(): void {
    if (!this.musicEnabled || this.musicVolume <= 0.001) return;
    if (this.bgmTimer !== null) return;
    if (!this.ensureContext()) return;

    this.bgmStep = 0;
    // Home: 80 BPM (375ms/eighth); Study Lo-Fi: 66 BPM (454ms/eighth)
    const stepMs = this.bgmMode === 'study' ? 454 : 375;
    const tick = () => {
      if (this.bgmMode === 'study') {
        this.tickStudyBgm();
      } else {
        this.tickHomeBgm();
      }
    };
    tick();
    this.bgmTimer = setInterval(tick, stepMs);
  }

  public stopBgm(): void {
    if (this.bgmTimer !== null) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  // --- Tactile Warm 2.5D Tile SFX ---

  public playPop(): void {
    if (!this.enabled || this.sfxVolume <= 0.001) return;
    this.playWarmTone({
      freq: 520,
      duration: 0.09,
      gain: 0.14 * this.sfxVolume,
      type: 'sine',
      attack: 0.006,
      cutoff: 2200,
    });
  }

  public playPlace(): void {
    if (!this.enabled || this.sfxVolume <= 0.001) return;
    this.playWarmTone({
      freq: 390,
      duration: 0.11,
      gain: 0.16 * this.sfxVolume,
      type: 'triangle',
      attack: 0.005,
      cutoff: 1600,
    });
    this.playWarmTone({
      freq: 585,
      duration: 0.08,
      gain: 0.09 * this.sfxVolume,
      type: 'sine',
      attack: 0.006,
      cutoff: 2000,
      delay: 0.03,
    });
  }

  public playHint(): void {
    if (!this.enabled || this.sfxVolume <= 0.001) return;
    [587.33, 739.99, 880].forEach((freq, i) => {
      this.playWarmTone({
        freq,
        duration: 0.22,
        gain: 0.11 * this.sfxVolume,
        type: 'sine',
        attack: 0.01,
        cutoff: 2400,
        delay: i * 0.06,
      });
    });
  }

  public playCombo(combo: number): void {
    if (!this.enabled || this.sfxVolume <= 0.001) return;
    // Rising warm sunset pentatonic chime as combo climbs (x1 -> x8+)
    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const idx = Math.max(0, Math.min(pentatonic.length - 1, combo - 1));
    const root = pentatonic[idx];
    this.playWarmTone({
      freq: root,
      duration: 0.16,
      gain: 0.15 * this.sfxVolume,
      type: 'triangle',
      attack: 0.006,
      cutoff: 2400,
    });
    this.playWarmTone({
      freq: root * 1.25,
      duration: 0.22,
      gain: 0.11 * this.sfxVolume,
      type: 'sine',
      attack: 0.008,
      cutoff: 2600,
      delay: 0.045,
    });
  }

  public playSuccess(_streak?: number): void {
    if (!this.enabled || this.sfxVolume <= 0.001) return;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      this.playWarmTone({
        freq,
        duration: 0.24,
        gain: 0.13 * this.sfxVolume,
        type: 'triangle',
        attack: 0.01,
        cutoff: 2200,
        delay: i * 0.07,
      });
    });
  }

  public playError(): void {
    if (!this.enabled || this.sfxVolume <= 0.001) return;
    this.playWarmTone({
      freq: 220,
      duration: 0.18,
      gain: 0.15 * this.sfxVolume,
      type: 'sawtooth',
      attack: 0.008,
      cutoff: 650,
    });
    this.playWarmTone({
      freq: 185,
      duration: 0.22,
      gain: 0.14 * this.sfxVolume,
      type: 'sawtooth',
      attack: 0.008,
      cutoff: 550,
      delay: 0.09,
    });
  }

  public playVictory(_stars?: number): void {
    if (!this.enabled || this.sfxVolume <= 0.001) return;
    // Warm sunset major-9 arpeggio fanfare
    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
    notes.forEach((freq, i) => {
      this.playWarmTone({
        freq,
        duration: i === notes.length - 1 ? 0.6 : 0.25,
        gain: 0.13 * this.sfxVolume,
        type: 'triangle',
        attack: 0.01,
        cutoff: 2600,
        delay: i * 0.085,
      });
    });
  }

  public playGameOver(): void {
    if (!this.enabled || this.sfxVolume <= 0.001) return;
    [349.23, 311.13, 261.63].forEach((freq, i) => {
      this.playWarmTone({
        freq,
        duration: 0.32,
        gain: 0.12 * this.sfxVolume,
        type: 'triangle',
        attack: 0.015,
        cutoff: 900,
        delay: i * 0.14,
      });
    });
  }
}

export const soundEngine = new SunsetSoundEngine();
