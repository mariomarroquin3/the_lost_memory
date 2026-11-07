import type { World } from '../shared/reducer.js';

export type AudioEvent =
  | 'lia' | 'alucinador' | 'solve' | 'fragment' | 'clue' | 'signal-send'
  | 'signal-receive' | 'channel-open' | 'door' | 'error' | 'blocked'
  | 'boss-start' | 'boss-fire' | 'web-hit' | 'alert'
  | 'ending-lia' | 'ending-new-genesis' | 'ending-lost';

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
  ambient: number;
  muted: boolean;
}

export type MusicScene =
  | 'exploration' | 'investigation' | 'recovery' | 'intrusion'
  | 'vulnerability' | 'core' | 'final-lia' | 'final-new-genesis' | 'final-lost';

const SETTINGS_KEY = 'rescate-audio-v2';
const LIA_INTERVALS = [0, 3, 7, 10];
const TEMPO = 64;
const BEAT_SECONDS = 60 / TEMPO;
const BEATS_PER_BAR = 4;
const BARS_PER_PHRASE = 16;
const HARMONY: Record<World, number[]> = {
  real: [0, -2, 5, 3, 0, -2, 7, 3, 0, 5, -2, 3, 0, 7, 5, 3],
  inverted: [0, -1, 4, 2, 0, -1, 6, 2, 0, 4, -1, 2, 0, 6, 4, 2],
};
const VOICINGS = [
  [0, 3, 7, 10], [0, 3, 7, 12], [0, 4, 7, 10], [0, 3, 7, 14],
  [0, 3, 7, 10], [0, 5, 7, 12], [0, 3, 7, 10], [0, 4, 7, 12],
  [0, 3, 7, 10], [0, 3, 7, 12], [0, 4, 7, 10], [0, 3, 7, 14],
  [0, 5, 7, 12], [0, 3, 7, 10], [0, 4, 7, 12], [0, 3, 7, 10],
];
const MELODY: Array<Array<number | null>> = [
  [0, null, 3, 7], [10, 7, null, 3], [0, 3, 7, null], [10, null, 7, 3],
  [0, null, 3, 7], [12, 10, 7, null], [7, null, 3, 0], [10, 7, null, null],
  [3, null, 7, 10], [12, 10, null, 7], [7, 3, 0, null], [10, null, 7, 3],
  [0, 3, null, 7], [12, 10, 7, 3], [7, null, 3, 0], [10, 7, null, null],
];
type SynthPartial = { ratio: number; weight: number; type: OscillatorType; detune?: number };
const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const semitone = (frequency: number, offset: number): number => frequency * Math.pow(2, offset / 12);

/** Audio procedural: buses separados, motivo narrativo y efectos sin archivos externos. */
export class Music {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private tensionGain: GainNode | null = null;
  private musicFxSend: GainNode | null = null;
  private musicDelay: DelayNode | null = null;
  private musicReverb: ConvolverNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  private musicSources: AudioScheduledSourceNode[] = [];
  private musicGraph: AudioNode[] = [];
  private ambientSources: AudioScheduledSourceNode[] = [];
  private ambientGraph: AudioNode[] = [];
  private ambientFilter: BiquadFilterNode | null = null;
  private musicTimer: number | null = null;
  private transitionTimer: number | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private world: World = 'real';
  private alertLevel = 5;
  private fragments = 0;
  private scene: MusicScene = 'exploration';
  private musicBeat = 0;
  private musicBar = 0;
  private settings: AudioSettings = { master: .8, music: .34, sfx: .55, ambient: .08, muted: false };
  private lastEvent = new Map<AudioEvent, number>();
  private unlocked = false;
  enabled = false;

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<AudioSettings> | null;
      if (saved) {
        for (const bus of ['master', 'music', 'sfx', 'ambient'] as const) {
          const value = Number(saved[bus]);
          if (Number.isFinite(value)) this.settings[bus] = clamp(value);
        }
        if (typeof saved.muted === 'boolean') this.settings.muted = saved.muted;
      }
    } catch { /* El audio funciona también sin almacenamiento. */ }
  }

  /** Crea o reanuda el contexto después de una interacción del usuario. */
  unlock(): void {
    const context = this.ensureContext();
    if (!context) return;
    void context.resume();
    if (this.unlocked) return;
    this.unlocked = true;
    // El clic de entrada ya es un gesto válido: empieza música audible,
    // no un ruido de viento que quede sonando por separado.
    if (!this.settings.muted && !this.enabled) {
      this.enabled = true;
      this.startAmbient();
      this.startMusic();
    }
  }

  toggle(): boolean {
    if (this.enabled) {
      this.stop();
      return false;
    }
    this.start();
    return true;
  }

  start(): void {
    const context = this.ensureContext();
    if (!context) return;
    void context.resume();
    this.unlocked = true;
    this.settings.muted = false;
    this.enabled = true;
    this.startAmbient();
    this.startMusic();
    this.persist();
  }

  stop(): void {
    this.enabled = false;
    if (this.transitionTimer !== null) {
      window.clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.clearMusicTimer();
    this.fade(this.musicGain, 0, .18);
    this.fade(this.tensionGain, 0, .12);
    this.deferStop(this.musicSources.splice(0), this.musicGraph.splice(0), 220);
    this.deferStop(this.ambientSources.splice(0), this.ambientGraph.splice(0), 160);
    this.ambientFilter = null;
    this.persist();
  }

  setWorld(world: World): void {
    if (this.world === world) return;
    this.world = world;
    if (this.ambientFilter) this.ambientFilter.frequency.setTargetAtTime(this.ambientFrequency(), this.context?.currentTime ?? 0, .25);
    if (!this.enabled) return;
    if (this.transitionTimer !== null) window.clearTimeout(this.transitionTimer);
    this.fade(this.musicGain, 0, .25);
    this.transitionTimer = window.setTimeout(() => {
      this.transitionTimer = null;
      if (this.enabled) this.startMusic();
    }, 280);
  }

  setAlert(alert: number): void {
    this.alertLevel = Math.max(0, Math.min(100, alert));
    this.updateTensionGain();
  }

  /** Hace que el motivo de Lía recupere notas al recuperar fragmentos. */
  setFragments(count: number): void {
    this.fragments = Math.max(0, Math.min(10, Math.floor(count)));
  }

  /** Cambia la sección musical sin reiniciar el compás actual. */
  setScene(scene: MusicScene): void {
    if (this.scene === scene) return;
    this.scene = scene;
    this.updateTensionGain();
  }

  setVolume(bus: keyof AudioSettings, value: number): void {
    if (bus === 'muted') return;
    this.settings[bus] = clamp(value);
    this.applyVolumes();
    this.persist();
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.applyVolumes();
    if (!muted && !this.enabled) {
      this.unlocked = true;
      this.enabled = true;
      this.startAmbient();
      this.startMusic();
    }
    this.persist();
  }

  getSettings(): AudioSettings { return { ...this.settings }; }

  /** Reproduce un evento narrativo o mecánico breve. */
  event(name: AudioEvent): void {
    const now = performance.now();
    const minimumGap = name === 'signal-receive' || name === 'signal-send' ? 70 : 120;
    if (now - (this.lastEvent.get(name) ?? -Infinity) < minimumGap) return;
    this.lastEvent.set(name, now);
    switch (name) {
      case 'lia': this.playLiaMotif(); break;
      case 'alucinador': this.playCorruptedMotif(); break;
      case 'solve': this.chord([392, 523.25, 659.25], .34, .07); break;
      case 'fragment': this.chord([440, 660, 880], .48, .09); break;
      case 'clue': this.tone(740, .12, 'triangle', .07, 980); break;
      case 'signal-send': this.pulse(420, .07, 'triangle', .045); break;
      case 'signal-receive': this.pulse(680, .09, 'sine', .055); break;
      case 'channel-open': this.chord([261.63, 329.63, 392], .7, .08); break;
      case 'door': this.mechanical(); break;
      case 'error': this.tone(180, .18, 'sawtooth', .06, 110); break;
      case 'blocked': this.tone(95, .16, 'square', .045, 70); break;
      case 'boss-start': this.playCorruptedMotif(); this.chord([55, 73.42, 110], 1.1, .07); break;
      case 'boss-fire': this.tone(920, .13, 'square', .06, 280); break;
      case 'web-hit': this.noise(.16, 900, .035); this.tone(120, .3, 'sine', .05, 80); break;
      case 'alert': this.alertTone(); break;
      case 'ending-lia': this.chord([523.25, 659.25, 783.99], .9, .08); break;
      case 'ending-new-genesis': this.chord([329.63, 293.66, 246.94], 1.1, .055); break;
      case 'ending-lost': this.playCorruptedMotif(); this.glitch(.28); break;
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    const AudioContextClass = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.ambientGain = this.context.createGain();
    this.tensionGain = this.context.createGain();
    this.musicFxSend = this.context.createGain();
    this.musicDelay = this.context.createDelay(1.2);
    this.musicReverb = this.context.createConvolver();
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = .01;
    this.compressor.release.value = .25;
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.ambientGain.connect(this.masterGain);
    this.tensionGain.connect(this.musicGain);
    this.musicFxSend.gain.value = .22;
    this.musicDelay.delayTime.value = .28;
    const delayFeedback = this.context.createGain();
    const delayReturn = this.context.createGain();
    const reverbReturn = this.context.createGain();
    delayFeedback.gain.value = .2;
    delayReturn.gain.value = .14;
    reverbReturn.gain.value = .12;
    this.musicReverb.buffer = this.createReverbBuffer(1.8, .25);
    this.musicFxSend.connect(this.musicDelay);
    this.musicDelay.connect(delayFeedback).connect(this.musicDelay);
    this.musicDelay.connect(delayReturn).connect(this.musicGain);
    this.musicFxSend.connect(this.musicReverb).connect(reverbReturn).connect(this.musicGain);
    this.masterGain.connect(this.compressor).connect(this.context.destination);
    this.applyVolumes();
    return this.context;
  }

  private applyVolumes(): void {
    const context = this.context;
    const now = context?.currentTime ?? 0;
    const muted = this.settings.muted ? 0 : 1;
    this.masterGain?.gain.setTargetAtTime(this.settings.master * muted, now, .02);
    this.musicGain?.gain.setTargetAtTime(this.settings.music, now, .02);
    this.sfxGain?.gain.setTargetAtTime(this.settings.sfx, now, .02);
    this.ambientGain?.gain.setTargetAtTime(this.settings.ambient, now, .02);
    this.setAlert(this.alertLevel);
  }

  private startMusic(): void {
    const context = this.context;
    if (!context || !this.musicGain || !this.enabled) return;
    this.stopMusicNow();
    const root = this.world === 'real' ? 110 : 103.83;
    const drone = context.createOscillator();
    const droneGain = context.createGain();
    drone.type = 'sine';
    drone.frequency.value = root;
    droneGain.gain.value = .035;
    drone.connect(droneGain).connect(this.musicGain);
    const pad = context.createOscillator();
    const padGain = context.createGain();
    pad.type = 'triangle';
    pad.frequency.value = semitone(root, 7);
    padGain.gain.value = .012;
    pad.connect(padGain).connect(this.musicGain);
    this.musicSources.push(drone, pad);
    this.musicGraph.push(droneGain, padGain);
    drone.start();
    pad.start();
    this.musicBeat = 0;
    this.musicBar = 0;
    this.fade(this.musicGain, this.settings.music, .8);
    this.tickMusic();
    this.musicTimer = window.setInterval(() => this.tickMusic(), BEAT_SECONDS * 1000);
    this.setAlert(this.alertLevel);
  }

  private tickMusic(): void {
    if (!this.context || !this.musicGain || !this.enabled || this.settings.muted) return;
    const beat = this.musicBeat % BEATS_PER_BAR;
    const bar = this.musicBar % BARS_PER_PHRASE;
    const phrase = Math.floor(this.musicBar / BARS_PER_PHRASE);
    const harmonicOffset = HARMONY[this.world][bar];
    if (beat === 0) {
      this.playHarmony(harmonicOffset, bar);
      this.playBass(harmonicOffset, bar);
    }

    const recoveredNotes = this.scene.startsWith('final-')
      ? 4
      : Math.min(4, Math.max(1, 1 + Math.floor(this.fragments / 3)));
    const melodyPosition = (bar * BEATS_PER_BAR + beat) % 4;
    const melodyInterval = melodyPosition < recoveredNotes ? MELODY[bar][beat] : null;
    const sparseExploration = this.scene === 'exploration' && bar % 2 === 1 && beat !== 0;
    if (melodyInterval !== null && !sparseExploration) {
      const variation = phrase % 3 === 1 && bar % 2 === 1 ? 12 : phrase % 3 === 2 && beat === 3 ? -2 : 0;
      const melodyRoot = this.world === 'real' ? 220 : 207.65;
      this.pianoNote(semitone(melodyRoot + harmonicOffset, melodyInterval + variation), BEAT_SECONDS * .72, .048, phrase % 3 === 2 ? -6 : 4);
    }

    if (this.shouldAddTexture(phrase, bar, beat)) this.playTexture(harmonicOffset, bar, phrase);
    if (this.shouldAddCorruption(beat)) this.playCorruptionLayer(harmonicOffset, bar);

    this.musicBeat += 1;
    if (this.musicBeat % BEATS_PER_BAR === 0) {
      this.musicBar += 1;
    }
  }

  private playHarmony(harmonicOffset: number, bar: number): void {
    const root = this.world === 'real' ? 110 : 103.83;
    const duration = BEAT_SECONDS * BEATS_PER_BAR * .96;
    VOICINGS[bar].forEach((interval, index) => {
      this.stringsNote(semitone(root + harmonicOffset, interval), duration, index === 0 ? .021 : .016, index === 3 ? -4 : 0);
    });
    if (this.scene === 'core' || this.scene === 'final-lia') {
      this.choirNote(semitone(root, 12 + VOICINGS[bar][2]), duration, .012, 0);
    }
  }

  private playBass(harmonicOffset: number, bar: number): void {
    const root = this.world === 'real' ? 55 : 51.91;
    const duration = BEAT_SECONDS * 1.65;
    this.celloNote(semitone(root + harmonicOffset, 0), duration, .048, 0);
    if (bar % 2 === 1) this.celloNote(semitone(root + harmonicOffset, 7), BEAT_SECONDS * .7, .026, BEAT_SECONDS * 2);
  }

  private shouldAddTexture(phrase: number, bar: number, beat: number): boolean {
    if (this.scene === 'exploration') return phrase > 0 && bar === 6 && beat === 2;
    return (bar + phrase) % 3 === 0 && beat === 2;
  }

  private playTexture(harmonicOffset: number, bar: number, phrase: number): void {
    const root = this.world === 'real' ? 440 : 415.3;
    const interval = VOICINGS[bar][phrase % VOICINGS[bar].length];
    this.bellNote(semitone(root + harmonicOffset, interval), .42, .022, phrase % 2 === 0 ? -.35 : .35);
    if (this.scene !== 'exploration') this.pianoNote(semitone(root + harmonicOffset, interval + 12), .28, .014, phrase % 2 === 0 ? .25 : -.25, .16);
  }

  private shouldAddCorruption(beat: number): boolean {
    return (this.scene === 'intrusion' || this.scene === 'vulnerability' || this.scene === 'core' || this.scene === 'final-lost')
      && (beat === 1 || beat === 3);
  }

  /** Capa del Alucinador: conserva el intervalo, pero lo desplaza y desafina. */
  private playCorruptionLayer(harmonicOffset: number, bar: number): void {
    const root = this.world === 'real' ? 220 : 207.65;
    const interval = LIA_INTERVALS[(bar + this.fragments) % LIA_INTERVALS.length];
    this.corruptedNote(semitone(root + harmonicOffset, interval + (bar % 2 === 0 ? 1 : -1)), .24, .025, bar % 2 === 0 ? 18 : -22);
  }

  private startAmbient(): void {
    const context = this.context;
    if (!context || !this.ambientGain || this.ambientSources.length) return;
    // Ambiente tonal muy bajo: evita el ruido blanco continuo que dominaba la mezcla.
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.ambientFrequency();
    filter.Q.value = .5;
    const hum = context.createOscillator();
    const humGain = context.createGain();
    hum.type = 'sine';
    hum.frequency.value = this.world === 'real' ? 49 : 46.25;
    humGain.gain.value = .018;
    const pulse = context.createOscillator();
    const pulseGain = context.createGain();
    pulse.type = 'triangle';
    pulse.frequency.value = this.world === 'real' ? 98 : 92.5;
    pulseGain.gain.value = .006;
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = .12;
    lfoGain.gain.value = .003;
    hum.connect(humGain).connect(filter);
    pulse.connect(pulseGain).connect(filter);
    lfo.connect(lfoGain).connect(humGain.gain);
    filter.connect(this.ambientGain);
    this.ambientFilter = filter;
    this.ambientSources.push(hum, pulse, lfo);
    this.ambientGraph.push(filter, humGain, pulseGain, lfoGain);
    hum.start();
    pulse.start();
    lfo.start();
  }

  private ambientFrequency(): number {
    return this.world === 'real' ? 170 : 230;
  }

  private updateTensionGain(): void {
    const sceneBoost = this.scene === 'core' || this.scene === 'vulnerability'
      ? .025
      : this.scene === 'intrusion' || this.scene === 'final-lost'
        ? .012
        : 0;
    const target = this.settings.muted || !this.enabled
      ? 0
      : .004 + sceneBoost + (this.alertLevel / 100) * .065;
    this.fade(this.tensionGain, target, .5);
  }

  private playLiaMotif(): void {
    const base = this.world === 'real' ? 523.25 : 493.88;
    this.pianoNote(base, .22, .07, -.12);
    this.pianoNote(semitone(base, 3), .26, .06, 0, .14);
    this.stringsNote(semitone(base, 7), .52, .042, 4, .29);
  }

  /** Usa los mismos intervalos de Lía, con desafinación y modulación. */
  private playCorruptedMotif(): void {
    const base = this.world === 'real' ? 523.25 : 493.88;
    const corruptedIntervals = [LIA_INTERVALS[0], LIA_INTERVALS[1] + 1, LIA_INTERVALS[2] - 1, LIA_INTERVALS[3]];
    corruptedIntervals.forEach((interval, index) => {
      this.corruptedNote(semitone(base, interval), .24, .035, index % 2 === 0 ? -24 : 31, index * .09);
    });
    this.noise(.08, 1500, .018);
  }

  private pianoNote(frequency: number, duration: number, volume: number, pan = 0, delay = 0): void {
    this.instrumentNote(frequency, duration, volume, [
      { ratio: 1, weight: .86, type: 'triangle' },
      { ratio: 2, weight: .18, type: 'sine', detune: 2 },
      { ratio: 3, weight: .05, type: 'sine', detune: -3 },
    ], .008, 'lowpass', 4200, .14, pan, delay);
  }

  private stringsNote(frequency: number, duration: number, volume: number, detune = 0, delay = 0): void {
    this.instrumentNote(frequency, duration, volume, [
      { ratio: 1, weight: .48, type: 'sawtooth', detune: detune - 7 },
      { ratio: 1, weight: .44, type: 'sawtooth', detune: detune + 7 },
      { ratio: 2, weight: .18, type: 'triangle', detune },
    ], .16, 'lowpass', 1600, .28, detune > 0 ? .12 : -.12, delay);
  }

  private celloNote(frequency: number, duration: number, volume: number, delay = 0): void {
    this.instrumentNote(frequency, duration, volume, [
      { ratio: 1, weight: .78, type: 'sine' },
      { ratio: 2, weight: .28, type: 'triangle', detune: -2 },
    ], .12, 'lowpass', 720, .16, 0, delay);
  }

  private choirNote(frequency: number, duration: number, volume: number, pan = 0, delay = 0): void {
    this.instrumentNote(frequency, duration, volume, [
      { ratio: 1, weight: .44, type: 'sine', detune: -10 },
      { ratio: 1, weight: .42, type: 'sine', detune: 10 },
      { ratio: 2, weight: .18, type: 'triangle', detune: 4 },
    ], .34, 'lowpass', 1900, .42, pan, delay);
  }

  private bellNote(frequency: number, duration: number, volume: number, pan = 0, delay = 0): void {
    this.instrumentNote(frequency, duration, volume, [
      { ratio: 1, weight: .72, type: 'sine' },
      { ratio: 2.01, weight: .25, type: 'sine', detune: 5 },
      { ratio: 3.97, weight: .08, type: 'sine', detune: -7 },
    ], .004, 'highpass', 260, .35, pan, delay);
  }

  private corruptedNote(frequency: number, duration: number, volume: number, detune = 0, delay = 0): void {
    this.instrumentNote(frequency, duration, volume, [
      { ratio: 1, weight: .58, type: 'sawtooth', detune },
      { ratio: 1.01, weight: .32, type: 'square', detune: detune + 19 },
      { ratio: 2, weight: .12, type: 'sawtooth', detune: detune - 31 },
    ], .015, 'bandpass', 1800, .16, detune > 0 ? .18 : -.18, delay);
  }

  private instrumentNote(
    frequency: number,
    duration: number,
    volume: number,
    partials: SynthPartial[],
    attack: number,
    filterType: BiquadFilterType,
    filterFrequency: number,
    wet: number,
    pan: number,
    delay = 0,
  ): void {
    const context = this.context;
    const destination = this.musicGain;
    if (!context || !destination || this.settings.muted) return;
    const now = context.currentTime + Math.max(0, delay);
    const filter = context.createBiquadFilter();
    const amplitude = context.createGain();
    const panner = context.createStereoPanner();
    const sources: OscillatorNode[] = [];
    const partialGains: GainNode[] = [];
    const send = wet > 0 && this.musicFxSend ? context.createGain() : null;
    const attackTime = Math.min(attack, duration * .35);
    const sustainTime = Math.max(attackTime + .015, duration * .48);
    filter.type = filterType;
    filter.frequency.value = filterFrequency;
    filter.Q.value = filterType === 'bandpass' ? 1.4 : .55;
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    amplitude.gain.setValueAtTime(.0001, now);
    amplitude.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), now + attackTime);
    amplitude.gain.exponentialRampToValueAtTime(Math.max(.0002, volume * .62), now + sustainTime);
    amplitude.gain.exponentialRampToValueAtTime(.0001, now + duration);
    partials.forEach((partial) => {
      const source = context.createOscillator();
      const partialGain = context.createGain();
      source.type = partial.type;
      source.frequency.value = Math.max(20, frequency * partial.ratio);
      source.detune.value = partial.detune ?? 0;
      partialGain.gain.value = partial.weight;
      source.connect(partialGain).connect(filter);
      source.start(now);
      source.stop(now + duration + .08);
      sources.push(source);
      partialGains.push(partialGain);
    });
    filter.connect(amplitude).connect(panner).connect(destination);
    if (send && this.musicFxSend) amplitude.connect(send).connect(this.musicFxSend);
    window.setTimeout(() => {
      sources.forEach((source) => source.disconnect());
      partialGains.forEach((partialGain) => partialGain.disconnect());
      filter.disconnect();
      amplitude.disconnect();
      panner.disconnect();
      send?.disconnect();
    }, (delay + duration + .2) * 1000);
  }

  private tone(start: number, duration: number, type: OscillatorType, volume: number, end?: number): void {
    this.note(start, duration, type, volume, this.sfxGain, 0, 0, end);
  }

  private note(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    destination: AudioNode | null,
    detune = 0,
    delay = 0,
    end?: number,
  ): void {
    const context = this.context;
    if (!context || !destination || this.settings.muted) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime + Math.max(0, delay);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), now);
    oscillator.detune.setValueAtTime(detune, now);
    if (end !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .04);
    window.setTimeout(() => {
      oscillator.disconnect();
      gain.disconnect();
    }, (delay + duration + .12) * 1000);
  }

  private pulse(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    this.tone(frequency, duration, type, volume, frequency * 1.02);
  }

  private chord(frequencies: number[], duration: number, volume: number): void {
    frequencies.forEach((frequency, index) => this.note(frequency, duration, 'sine', volume / frequencies.length, this.sfxGain, 0, index * .042));
  }

  private noise(duration: number, frequency: number, volume: number): void {
    const context = this.context;
    if (!context || !this.sfxGain || this.settings.muted) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;
    source.buffer = this.noiseBuffer ??= this.createNoiseBuffer(1);
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 1.2;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.sfxGain);
    source.start(now);
    source.stop(now + duration + .02);
    window.setTimeout(() => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    }, (duration + .12) * 1000);
  }

  private glitch(duration: number): void {
    this.noise(Math.min(.12, duration), 1700, .025);
    this.tone(70, duration, 'sawtooth', .035, 38);
    this.tone(74, duration * .7, 'square', .018, 48);
  }

  private mechanical(): void {
    this.tone(90, .4, 'square', .045, 55);
    window.setTimeout(() => this.tone(240, .08, 'triangle', .035, 180), 170);
  }

  private alertTone(): void {
    const level = this.alertLevel >= 75 ? 2 : this.alertLevel >= 45 ? 1 : 0;
    if (level === 0) this.tone(260, .1, 'triangle', .035, 220);
    if (level === 1) {
      this.tone(220, .12, 'square', .045, 180);
      window.setTimeout(() => this.tone(330, .12, 'square', .04, 250), 130);
    }
    if (level === 2) {
      this.tone(110, .28, 'sawtooth', .045, 75);
      this.tone(116, .24, 'square', .025, 80);
    }
  }

  private createNoiseBuffer(seconds: number): AudioBuffer {
    const context = this.context!;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private createReverbBuffer(seconds: number, decay: number): AudioBuffer {
    const context = this.context!;
    const buffer = context.createBuffer(2, Math.floor(context.sampleRate * seconds), context.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = 0; index < data.length; index += 1) {
        const envelope = Math.pow(1 - index / data.length, decay * 4);
        data[index] = (Math.random() * 2 - 1) * envelope;
      }
    }
    return buffer;
  }

  private fade(node: GainNode | null, value: number, seconds: number): void {
    if (!node || !this.context) return;
    node.gain.cancelScheduledValues(this.context.currentTime);
    node.gain.setTargetAtTime(value, this.context.currentTime, Math.max(.01, seconds / 4));
  }

  private clearMusicTimer(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private stopMusicNow(): void {
    this.clearMusicTimer();
    this.stopSources(this.musicSources.splice(0));
    this.disconnectNodes(this.musicGraph.splice(0));
  }

  private deferStop(sources: AudioScheduledSourceNode[], graph: AudioNode[], delay: number): void {
    window.setTimeout(() => {
      this.stopSources(sources);
      this.disconnectNodes(graph);
    }, delay);
  }

  private stopSources(sources: AudioScheduledSourceNode[]): void {
    sources.forEach((source) => {
      try { source.stop(); } catch { /* El nodo ya terminó. */ }
      source.disconnect();
    });
  }

  private disconnectNodes(nodes: AudioNode[]): void {
    nodes.forEach((node) => node.disconnect());
  }

  private persist(): void {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* sin almacenamiento */ }
  }
}
