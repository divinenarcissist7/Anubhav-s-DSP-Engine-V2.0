
export enum TransmuteMode {
  LIQUID = 'Liquid',
  FILTER = 'Filter',
  DIFFUSE = 'Diffuse',
  WASH = 'Wash',
  SPECTRAL = 'Spectral',
  PHASE = 'Phase'
}

export interface AudioState {
  mix: number; // 0 (100% A) to 1 (100% B)
  dryWet: number; // 0 to 1
  gainA: number; // dB
  gainB: number; // dB
  gainOut: number; // dB
  invert: boolean;
  mode: TransmuteMode;
  isPlaying: boolean;
}

export interface MeterData {
  levelA: number;
  levelB: number;
}
