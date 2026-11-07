import type { World } from '../shared/reducer.js';

export type AudioEvent =
  | 'lia' | 'alucinador' | 'solve' | 'fragment' | 'clue' | 'signal-send'
  | 'signal-receive' | 'channel-open' | 'door' | 'error' | 'blocked'
  | 'boss-start' | 'boss-fire' | 'web-hit' | 'alert';

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
  ambient: number;
  muted: boolean;
}

const SETTINGS_KEY = 'rescate-audio-v2';
const clamp = (value: number): number => Math.max(0, Math.min(1, value));

/** Audio procedural: cuatro buses, música por mundo y efectos sin archivos externos. */
export class Music {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private tensionGain: GainNode | null = null;
  private musicNodes: AudioScheduledSourceNode[] = [];
  private ambientNodes: AudioScheduledSourceNode[] = [];
  private transitionTimer: number | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private world: World = 'real';
  private alertLevel = 5;
  private settings: AudioSettings = { master: .8, music: .28, sfx: .55, ambient: .3, muted: false };
  private lastEvent = new Map<AudioEvent, number>();
  enabled = false;

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<AudioSettings> | null;
      if (saved) this.settings = { ...this.settings, ...saved };
    } catch { /* El audio funciona también sin almacenamiento. */ }
  }

  /** Crea o reanuda el contexto después de una interacción del usuario. */
  unlock(): void {
    const context = this.ensureContext();
    if (!context) return;
    void context.resume();
    if (!this.settings.muted) this.startAmbient();
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
    this.settings.muted = false;
    this.enabled = true;
    this.startAmbient();
    this.startMusic();
    this.persist();
  }

  stop(): void {
    this.enabled = false;
    this.fade(this.musicGain, 0, .18);
    window.setTimeout(() => this.stopNodes(this.musicNodes), 220);
    this.persist();
  }

  setWorld(world: World): void {
    if (this.world === world) return;
    this.world = world;
    if (!this.enabled) return;
    if (this.transitionTimer !== null) window.clearTimeout(this.transitionTimer);
    this.fade(this.musicGain, 0, .25);
    this.transitionTimer = window.setTimeout(() => {
      this.stopNodes(this.musicNodes);
      this.startMusic();
      this.transitionTimer = null;
    }, 280);
  }

  setAlert(alert: number): void {
    this.alertLevel = Math.max(0, Math.min(100, alert));
    const target = this.settings.muted ? 0 : .008 + (this.alertLevel / 100) * .035;
    this.fade(this.tensionGain, target, .5);
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
      case 'lia': this.tone(660, .18, 'sine', .08, 880); break;
      case 'alucinador': this.glitch(.35); break;
      case 'solve': this.chord([392, 523.25, 659.25], .34, .07); break;
      case 'fragment': this.chord([440, 660, 880], .48, .09); break;
      case 'clue': this.tone(740, .12, 'triangle', .07, 980); break;
      case 'signal-send': this.pulse(420, .07, 'triangle', .045); break;
      case 'signal-receive': this.pulse(680, .09, 'sine', .055); break;
      case 'channel-open': this.chord([261.63, 329.63, 392], .7, .08); break;
      case 'door': this.mechanical(); break;
      case 'error': this.tone(180, .18, 'sawtooth', .06, 110); break;
      case 'blocked': this.tone(95, .16, 'square', .045, 70); break;
      case 'boss-start': this.glitch(.5); this.chord([55, 73.42, 110], 1.1, .07); break;
      case 'boss-fire': this.tone(920, .13, 'square', .06, 280); break;
      case 'web-hit': this.noise(.25, 900, .07); this.tone(120, .3, 'sine', .05, 80); break;
      case 'alert': this.alertTone(); break;
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
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.ambientGain.connect(this.masterGain);
    this.tensionGain.connect(this.musicGain);
    this.masterGain.connect(this.context.destination);
    this.applyVolumes();
    return this.context;
  }

  private applyVolumes(): void {
    const muted = this.settings.muted ? 0 : 1;
    this.masterGain?.gain.setTargetAtTime(this.settings.master * muted, this.context?.currentTime ?? 0, .02);
    this.musicGain?.gain.setTargetAtTime(this.settings.music, this.context?.currentTime ?? 0, .02);
    this.sfxGain?.gain.setTargetAtTime(this.settings.sfx, this.context?.currentTime ?? 0, .02);
    this.ambientGain?.gain.setTargetAtTime(this.settings.ambient, this.context?.currentTime ?? 0, .02);
    this.setAlert(this.alertLevel);
  }

  private startMusic(): void {
    const context = this.context;
    if (!context || !this.musicGain) return;
    this.stopNodes(this.musicNodes);
    const root = this.world === 'real' ? 55 : 51.91;
    const drone = context.createOscillator();
    const fifth = context.createOscillator();
    const pad = context.createOscillator();
    const droneGain = context.createGain();
    const fifthGain = context.createGain();
    const padGain = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.world === 'real' ? 520 : 380;
    filter.Q.value = .7;
    drone.type = 'sine'; drone.frequency.value = root;
    fifth.type = 'triangle'; fifth.frequency.value = root * (this.world === 'real' ? 1.498 : 1.47);
    pad.type = 'sine'; pad.frequency.value = root * 2;
    droneGain.gain.value = .035;
    fifthGain.gain.value = .012;
    padGain.gain.value = .008;
    drone.connect(droneGain).connect(filter);
    fifth.connect(fifthGain).connect(filter);
    pad.connect(padGain).connect(filter);
    filter.connect(this.musicGain);
    this.fade(this.musicGain, this.settings.music, .8);
    this.fade(this.tensionGain, .008 + (this.alertLevel / 100) * .035, .8);
    [drone, fifth, pad].forEach((node) => { node.start(); this.musicNodes.push(node); });
  }

  private startAmbient(): void {
    const context = this.context;
    if (!context || !this.ambientGain || this.ambientNodes.length) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    source.buffer = this.noiseBuffer ??= this.createNoiseBuffer(2.5);
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = this.world === 'real' ? 180 : 260;
    filter.Q.value = .45;
    lfo.type = 'sine'; lfo.frequency.value = .08; lfoGain.gain.value = 85;
    lfo.connect(lfoGain).connect(filter.frequency);
    source.connect(filter).connect(this.ambientGain);
    source.start(); lfo.start();
    this.ambientNodes.push(source, lfo);
  }

  private tone(start: number, duration: number, type: OscillatorType, volume: number, end?: number): void {
    const context = this.context;
    if (!context || this.settings.muted) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, now);
    if (end !== undefined) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(this.sfxGain!);
    oscillator.start(now); oscillator.stop(now + duration + .03);
  }

  private pulse(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    this.tone(frequency, duration, type, volume, frequency * 1.02);
  }

  private chord(frequencies: number[], duration: number, volume: number): void {
    frequencies.forEach((frequency, index) => window.setTimeout(() => this.tone(frequency, duration, 'sine', volume / frequencies.length), index * 42));
  }

  private noise(duration: number, frequency: number, volume: number): void {
    const context = this.context;
    if (!context || this.settings.muted) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;
    source.buffer = this.noiseBuffer ??= this.createNoiseBuffer(1);
    filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .6;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.sfxGain!);
    source.start(now); source.stop(now + duration + .02);
  }

  private glitch(duration: number): void {
    this.noise(duration, 1800, .08);
    this.tone(70, duration, 'sawtooth', .04, 38);
  }

  private mechanical(): void {
    this.tone(90, .4, 'square', .045, 55);
    window.setTimeout(() => this.tone(240, .08, 'triangle', .035, 180), 170);
  }

  private alertTone(): void {
    const level = this.alertLevel >= 75 ? 2 : this.alertLevel >= 45 ? 1 : 0;
    if (level === 0) this.tone(260, .1, 'triangle', .035, 220);
    if (level === 1) { this.tone(220, .12, 'square', .045, 180); window.setTimeout(() => this.tone(330, .12, 'square', .04, 250), 130); }
    if (level === 2) { this.noise(.35, 1500, .06); this.tone(110, .35, 'sawtooth', .05, 75); }
  }

  private createNoiseBuffer(seconds: number): AudioBuffer {
    const context = this.context!;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private fade(node: GainNode | null, value: number, seconds: number): void {
    if (!node || !this.context) return;
    node.gain.cancelScheduledValues(this.context.currentTime);
    node.gain.setTargetAtTime(value, this.context.currentTime, Math.max(.01, seconds / 4));
  }

  private stopNodes(nodes: AudioScheduledSourceNode[]): void {
    while (nodes.length) {
      const node = nodes.pop();
      try { node?.stop(); } catch { /* El nodo ya terminó. */ }
      node?.disconnect();
    }
  }

  private persist(): void {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* sin almacenamiento */ }
  }
}
