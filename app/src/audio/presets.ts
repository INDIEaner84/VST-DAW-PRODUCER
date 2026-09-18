import { DEFAULT_PATCH, type PatchParams } from './engine'

export type SoundPreset = {
  key: string
  name: string
  origin: string
  brief: string
  patch: PatchParams
}

const mk = (p: Partial<PatchParams>): PatchParams => ({ ...DEFAULT_PATCH, ...p })

/** Iconic synth sounds to rebuild by ear in the mastery chapter. */
export const PRESETS: SoundPreset[] = [
  {
    key: 'reese',
    name: 'Reese Bass',
    origin: 'Kevin Saunderson, 1988 · Drum & Bass / Jungle',
    brief: 'Zwei verstimmte Sägezähne die gegeneinander schweben, tief gefiltert und breit.',
    patch: mk({ osc: 'sawtooth', detune: 34, subLevel: 0.55, cutoff: 420, resonance: 2.4, filterType: 'lowpass', attack: 0.02, decay: 0.6, sustain: 0.9, release: 0.35, filterEnvAmount: 0.15, fDecay: 0.5, chorus: 0.45, drive: 0.3, eqLow: 5 }),
  },
  {
    key: 'acid303',
    name: '303 Acid Line',
    origin: 'Roland TB-303, 1982 · Acid House',
    brief: 'Square mit schnellem Filter-Sweep, hoher Resonanz und Glide zwischen den Noten.',
    patch: mk({ osc: 'square', pwm: 0.5, cutoff: 700, resonance: 11, filterEnvAmount: 0.75, fAttack: 0.005, fDecay: 0.22, attack: 0.001, decay: 0.18, sustain: 0.1, release: 0.08, glide: 0.09, drive: 0.45 }),
  },
  {
    key: 'supersaw',
    name: 'Supersaw Lead',
    origin: 'Roland JP-8000, 1996 · Trance',
    brief: 'Breit verstimmter Saw, weit offenes Filter, viel Chorus, Delay und Hall.',
    patch: mk({ osc: 'sawtooth', detune: 46, subLevel: 0.25, cutoff: 9000, resonance: 0.8, attack: 0.03, decay: 0.4, sustain: 0.85, release: 0.6, chorus: 0.8, reverb: 0.4, delay: 0.3, delayTime: 0.33, delayFeedback: 0.35, eqHigh: 4 }),
  },
  {
    key: 'moogbass',
    name: 'Fat Moog Bass',
    origin: 'Minimoog, 1970 · Funk / Synthpop',
    brief: 'Dickes Lowpass mit deutlichem Filter-Punch beim Anschlag, Sub drunter.',
    patch: mk({ osc: 'sawtooth', detune: 9, subLevel: 0.75, cutoff: 600, resonance: 3.2, filterEnvAmount: 0.6, fAttack: 0.002, fDecay: 0.18, attack: 0.005, decay: 0.3, sustain: 0.55, release: 0.25, drive: 0.25, eqLow: 6 }),
  },
  {
    key: 'pad',
    name: 'Warm Analog Pad',
    origin: 'Juno-106, 1984 · Ambient',
    brief: 'Langsam öffnender, weicher Flächenklang mit Chorus und viel Raum.',
    patch: mk({ osc: 'triangle', detune: 18, subLevel: 0.3, cutoff: 2400, resonance: 0.9, attack: 0.9, decay: 1.2, sustain: 0.85, release: 1.8, filterEnvAmount: 0.3, fAttack: 0.7, fDecay: 1.0, chorus: 0.7, reverb: 0.65, lfoRate: 0.6, lfoToFilter: 0.2 }),
  },
  {
    key: 'pluck',
    name: 'Bell Pluck',
    origin: 'FM-Ära, 1983 · Pop / House',
    brief: 'Kurzer, glockiger Anschlag ohne Sustain, mit Delay das den Raum füllt.',
    patch: mk({ osc: 'sine', detune: 6, cutoff: 5200, resonance: 2.0, attack: 0.001, decay: 0.22, sustain: 0, release: 0.3, filterEnvAmount: 0.5, fDecay: 0.14, delay: 0.42, delayTime: 0.28, delayFeedback: 0.42, reverb: 0.35, eqHigh: 3 }),
  },
  {
    key: 'wobble',
    name: 'Wobble Bass',
    origin: 'Dubstep, 2008',
    brief: 'Rhythmischer LFO auf dem Filter, hohe Resonanz, dreckig verzerrt.',
    patch: mk({ osc: 'sawtooth', detune: 20, subLevel: 0.6, cutoff: 800, resonance: 7, lfoRate: 4.5, lfoToFilter: 0.75, attack: 0.01, decay: 0.4, sustain: 0.9, release: 0.2, drive: 0.6, bitcrush: 0.25, eqLow: 4 }),
  },
  {
    key: 'wind',
    name: 'Noise Sweep',
    origin: 'Riser / FX-Design',
    brief: 'Reines Rauschen durch ein resonantes Bandpass-Filter, langsam aufziehend.',
    patch: mk({ osc: 'sine', noiseLevel: 0.9, noiseType: 'white', filterType: 'bandpass', cutoff: 1800, resonance: 6, attack: 1.2, decay: 0.8, sustain: 0.7, release: 1.0, reverb: 0.6, lfoRate: 0.4, lfoToFilter: 0.5 }),
  },
]

export const PRESET_BY_KEY = Object.fromEntries(PRESETS.map((p) => [p.key, p]))
