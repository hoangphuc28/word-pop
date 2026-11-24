function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0.85;
  return Math.max(0, Math.min(1, value));
}

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  const synth = window.speechSynthesis;
  if (!synth || typeof synth.speak !== 'function') {
    return null;
  }
  return synth;
}

function getUtteranceConstructor(): typeof SpeechSynthesisUtterance | null {
  if (typeof globalThis.SpeechSynthesisUtterance === 'function') {
    return globalThis.SpeechSynthesisUtterance;
  }
  if (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance })
      .SpeechSynthesisUtterance === 'function'
  ) {
    return (window as unknown as { SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance })
      .SpeechSynthesisUtterance;
  }
  return null;
}

class WebSpeechEngine {
  private enabled = true;
  private volume = 0.85;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setVolume(volume: number): void {
    this.volume = clampVolume(volume);
  }

  public getVolume(): number {
    return this.volume;
  }

  public isSupported(): boolean {
    return getSpeechSynthesis() !== null && getUtteranceConstructor() !== null;
  }

  public speak(text: string): void {
    if (!this.enabled || this.volume <= 0.001) {
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const synth = getSpeechSynthesis();
    const UtteranceCtor = getUtteranceConstructor();
    if (!synth || !UtteranceCtor) {
      return;
    }
    try {
      if (typeof synth.cancel === 'function') {
        synth.cancel();
      }
      const utterance = new UtteranceCtor(trimmed);
      utterance.lang = 'en-US';
      utterance.rate = 0.92;
      utterance.volume = this.volume;
      synth.speak(utterance);
    } catch {
      // Safe no-op when browser restricts speech synthesis
    }
  }

  public stop(): void {
    const synth = getSpeechSynthesis();
    if (!synth || typeof synth.cancel !== 'function') {
      return;
    }
    try {
      synth.cancel();
    } catch {
      // Safe no-op
    }
  }
}

export const speechEngine: {
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  setVolume(volume: number): void;
  getVolume(): number;
  speak(text: string): void;
  stop(): void;
  isSupported(): boolean;
} = new WebSpeechEngine();
