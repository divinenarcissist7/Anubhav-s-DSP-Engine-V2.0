
import { TransmuteMode } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sourceA: AudioBufferSourceNode | null = null;
  private sourceB: AudioBufferSourceNode | null = null;
  private bufferA: AudioBuffer | null = null;
  private bufferB: AudioBuffer | null = null;
  
  private gainA: GainNode | null = null;
  private gainB: GainNode | null = null;
  private masterMix: GainNode | null = null;
  private outputGain: GainNode | null = null;
  
  private filterA: BiquadFilterNode | null = null;
  private filterB: BiquadFilterNode | null = null;
  
  private analyserA: AnalyserNode | null = null;
  private analyserB: AnalyserNode | null = null;
  private analyserOut: AnalyserNode | null = null;
  
  private mixValue: number = 0.5;

  constructor() {}

  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.gainA = this.ctx.createGain();
    this.gainB = this.ctx.createGain();
    this.masterMix = this.ctx.createGain();
    this.outputGain = this.ctx.createGain();
    
    this.filterA = this.ctx.createBiquadFilter();
    this.filterB = this.ctx.createBiquadFilter();
    
    this.analyserA = this.ctx.createAnalyser();
    this.analyserB = this.ctx.createAnalyser();
    this.analyserOut = this.ctx.createAnalyser();
    
    [this.analyserA, this.analyserB, this.analyserOut].forEach(a => {
      a.fftSize = 512;
      a.smoothingTimeConstant = 0.8;
    });

    // Wire up the constant parts of the chain
    this.gainA.connect(this.filterA);
    this.filterA.connect(this.analyserA);
    this.analyserA.connect(this.masterMix);

    this.gainB.connect(this.filterB);
    this.filterB.connect(this.analyserB);
    this.analyserB.connect(this.masterMix);

    this.masterMix.connect(this.analyserOut);
    this.analyserOut.connect(this.outputGain);
    this.outputGain.connect(this.ctx.destination);
  }

  private dbToGain(db: number): number {
    return Math.pow(10, db / 20);
  }

  async decodeFile(file: File): Promise<AudioBuffer> {
    if (!this.ctx) await this.init();
    const arrayBuffer = await file.arrayBuffer();
    return await this.ctx!.decodeAudioData(arrayBuffer);
  }

  async setTrackA(buffer: AudioBuffer) {
    this.bufferA = buffer;
    if (this.ctx && this.ctx.state === 'running') {
      this.startTrackA();
    }
  }

  async setTrackB(buffer: AudioBuffer) {
    this.bufferB = buffer;
    if (this.ctx && this.ctx.state === 'running') {
      this.startTrackB();
    }
  }

  startTrackA() {
    if (!this.ctx || !this.bufferA || !this.gainA) return;
    this.stopTrackA();
    this.sourceA = this.ctx.createBufferSource();
    this.sourceA.buffer = this.bufferA;
    this.sourceA.loop = true;
    this.sourceA.connect(this.gainA);
    this.sourceA.start();
  }

  stopTrackA() {
    if (this.sourceA) {
      try {
        this.sourceA.stop();
        this.sourceA.disconnect();
      } catch (e) {}
      this.sourceA = null;
    }
  }

  startTrackB() {
    if (!this.ctx || !this.bufferB || !this.gainB) return;
    this.stopTrackB();
    this.sourceB = this.ctx.createBufferSource();
    this.sourceB.buffer = this.bufferB;
    this.sourceB.loop = true;
    this.sourceB.connect(this.gainB);
    this.sourceB.start();
  }

  stopTrackB() {
    if (this.sourceB) {
      try {
        this.sourceB.stop();
        this.sourceB.disconnect();
      } catch (e) {}
      this.sourceB = null;
    }
  }

  private generateProceduralBuffer(type: 'rhythm' | 'pad'): AudioBuffer {
    if (!this.ctx) throw new Error("Context not initialized");
    const duration = 2.0;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(2, sampleRate * duration, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const now = buffer.getChannelData(channel);
      for (let i = 0; i < now.length; i++) {
        const t = i / sampleRate;
        if (type === 'rhythm') {
          const kick = Math.sin(2 * Math.PI * 50 * Math.exp(-t * 10)) * Math.exp(-t * 5 % 0.5 * 10);
          const noise = (Math.random() * 2 - 1) * 0.05 * Math.exp(-(t % 0.25) * 20);
          now[i] = (kick + noise) * 0.5;
        } else {
          const f1 = Math.sin(2 * Math.PI * 220 * t);
          const f2 = Math.sin(2 * Math.PI * 330 * t + Math.sin(t * 2));
          const f3 = Math.sin(2 * Math.PI * 440 * t);
          now[i] = (f1 + f2 + f3) * 0.2;
        }
      }
    }
    return buffer;
  }

  async loadDefaultSamples() {
    if (!this.ctx) await this.init();
    if (!this.bufferA) this.bufferA = this.generateProceduralBuffer('rhythm');
    if (!this.bufferB) this.bufferB = this.generateProceduralBuffer('pad');
    this.startTrackA();
    this.startTrackB();
  }

  updateParams(params: {
    mix: number;
    dryWet: number;
    gainA: number;
    gainB: number;
    gainOut: number;
    mode: TransmuteMode;
    invert: boolean;
  }) {
    if (!this.ctx || !this.gainA || !this.gainB || !this.outputGain || !this.filterA || !this.filterB) return;

    this.mixValue = params.mix;
    const mix = params.invert ? 1 - params.mix : params.mix;

    const gainA_target = Math.cos(mix * 0.5 * Math.PI);
    const gainB_target = Math.cos((1 - mix) * 0.5 * Math.PI);
    
    this.gainA.gain.setTargetAtTime(this.dbToGain(params.gainA) * gainA_target * params.dryWet, this.ctx.currentTime, 0.05);
    this.gainB.gain.setTargetAtTime(this.dbToGain(params.gainB) * gainB_target * params.dryWet, this.ctx.currentTime, 0.05);
    this.outputGain.gain.setTargetAtTime(this.dbToGain(params.gainOut), this.ctx.currentTime, 0.05);

    switch (params.mode) {
      case TransmuteMode.FILTER:
        this.filterA.type = 'lowpass';
        this.filterB.type = 'highpass';
        this.filterA.frequency.setTargetAtTime(20000 * Math.pow(1 - mix, 2) + 20, this.ctx.currentTime, 0.1);
        this.filterB.frequency.setTargetAtTime(20000 * Math.pow(mix, 2) + 20, this.ctx.currentTime, 0.1);
        break;
      case TransmuteMode.LIQUID:
        this.filterA.type = 'bandpass';
        this.filterB.type = 'bandpass';
        this.filterA.frequency.setTargetAtTime(100 + 8000 * Math.sin(mix * Math.PI), this.ctx.currentTime, 0.1);
        this.filterB.frequency.setTargetAtTime(8000 - 7000 * Math.sin(mix * Math.PI), this.ctx.currentTime, 0.1);
        this.filterA.Q.value = 4;
        this.filterB.Q.value = 4;
        break;
      case TransmuteMode.WASH:
        this.filterA.type = 'lowpass';
        this.filterB.type = 'lowpass';
        const washAmount = Math.sin(mix * Math.PI);
        this.filterA.frequency.setTargetAtTime(20000 - (18000 * washAmount), this.ctx.currentTime, 0.2);
        this.filterB.frequency.setTargetAtTime(20000 - (18000 * washAmount), this.ctx.currentTime, 0.2);
        break;
      default:
        this.filterA.type = 'allpass';
        this.filterB.type = 'allpass';
    }
  }

  getMeterData() {
    if (!this.analyserA || !this.analyserB) return { levelA: 0, levelB: 0 };
    const dataA = new Uint8Array(this.analyserA.frequencyBinCount);
    const dataB = new Uint8Array(this.analyserB.frequencyBinCount);
    this.analyserA.getByteTimeDomainData(dataA);
    this.analyserB.getByteTimeDomainData(dataB);
    let sumA = 0, sumB = 0;
    for (let i = 0; i < dataA.length; i++) {
      const valA = (dataA[i] - 128) / 128;
      const valB = (dataB[i] - 128) / 128;
      sumA += valA * valA;
      sumB += valB * valB;
    }
    return {
      levelA: Math.sqrt(sumA / dataA.length),
      levelB: Math.sqrt(sumB / dataB.length)
    };
  }

  getFrequencyData() {
    if (!this.analyserA || !this.analyserB || !this.analyserOut) return { dataA: null, dataB: null, dataOut: null };
    const dataA = new Uint8Array(this.analyserA.frequencyBinCount);
    const dataB = new Uint8Array(this.analyserB.frequencyBinCount);
    const dataOut = new Uint8Array(this.analyserOut.frequencyBinCount);
    
    this.analyserA.getByteFrequencyData(dataA);
    this.analyserB.getByteFrequencyData(dataB);
    this.analyserOut.getByteFrequencyData(dataOut);
    
    return { dataA, dataB, dataOut };
  }

  resume() { this.ctx?.resume(); }
  suspend() { this.ctx?.suspend(); }
}

export const audioEngine = new AudioEngine();
