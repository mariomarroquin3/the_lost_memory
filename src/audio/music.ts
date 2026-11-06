/** Música ambiental mínima generada con Web Audio, activada solo tras interacción. */
export class Music {
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  enabled = false;

  toggle(): boolean {
    if (this.enabled) {
      this.stop();
      return false;
    }
    this.start();
    return true;
  }

  start(): void {
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.context ??= new AudioContextClass();
    void this.context.resume();
    this.oscillator = this.context.createOscillator();
    this.gain = this.context.createGain();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 73.42;
    this.gain.gain.value = 0.035;
    this.oscillator.connect(this.gain).connect(this.context.destination);
    this.oscillator.start();
    this.enabled = true;
  }

  stop(): void {
    this.oscillator?.stop();
    this.oscillator?.disconnect();
    this.gain?.disconnect();
    this.oscillator = null;
    this.gain = null;
    this.enabled = false;
  }
}
