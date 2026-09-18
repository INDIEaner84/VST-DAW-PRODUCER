import type { ParamId } from '../audio/levels'

/** Fixed hardware-style layout: the panel always looks the same,
 *  only the availability of each module changes as levels unlock. */
export const MODULES: { name: string; sub?: string; params: ParamId[] }[] = [
  { name: 'Oscillator', sub: 'VCO', params: ['osc', 'pwm', 'detune', 'subLevel', 'glide'] },
  { name: 'Noise', sub: 'GEN', params: ['noiseType', 'noiseLevel'] },
  { name: 'Filter', sub: 'VCF', params: ['filterType', 'cutoff', 'resonance', 'filterEnvAmount'] },
  { name: 'Filter Env', sub: 'ADS', params: ['fAttack', 'fDecay'] },
  { name: 'Amplifier', sub: 'ADSR', params: ['attack', 'decay', 'sustain', 'release'] },
  { name: 'Modulation', sub: 'LFO', params: ['lfoRate', 'lfoToPitch', 'lfoToFilter', 'lfoToAmp'] },
  { name: 'Equalizer', sub: 'TONE', params: ['eqLow', 'eqMid', 'eqHigh'] },
  { name: 'Effects', sub: 'FX', params: ['drive', 'chorus', 'bitcrush', 'delay', 'delayTime', 'delayFeedback', 'reverb'] },
]
