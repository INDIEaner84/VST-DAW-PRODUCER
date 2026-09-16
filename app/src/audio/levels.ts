import { DEFAULT_PATCH, type PatchParams } from './engine'

export type ParamId = keyof PatchParams

export type ParamSpec = {
  id: ParamId
  label: string
  group: 'Oscillator' | 'Filter' | 'Amp Envelope' | 'Filter Envelope' | 'EQ' | 'FX'
  kind: 'range' | 'choice'
  min?: number
  max?: number
  step?: number
  unit?: string
  choices?: string[]
  log?: boolean
  tolerance?: number // fraction of range accepted as "correct"
}

export const PARAM_SPECS: Record<ParamId, ParamSpec> = {
  osc: { id: 'osc', label: 'Waveform', group: 'Oscillator', kind: 'choice', choices: ['sawtooth', 'square', 'triangle', 'sine'] },
  detune: { id: 'detune', label: 'Detune', group: 'Oscillator', kind: 'range', min: -50, max: 50, step: 1, unit: 'ct', tolerance: 0.15 },
  subLevel: { id: 'subLevel', label: 'Sub Osc', group: 'Oscillator', kind: 'range', min: 0, max: 1, step: 0.05, tolerance: 0.2 },
  filterType: { id: 'filterType', label: 'Filter Type', group: 'Filter', kind: 'choice', choices: ['lowpass', 'highpass', 'bandpass'] },
  cutoff: { id: 'cutoff', label: 'Cutoff', group: 'Filter', kind: 'range', min: 80, max: 16000, step: 10, unit: 'Hz', log: true, tolerance: 0.14 },
  resonance: { id: 'resonance', label: 'Resonance', group: 'Filter', kind: 'range', min: 0, max: 14, step: 0.1, tolerance: 0.18 },
  filterEnvAmount: { id: 'filterEnvAmount', label: 'Env Amount', group: 'Filter Envelope', kind: 'range', min: 0, max: 1, step: 0.05, tolerance: 0.2 },
  attack: { id: 'attack', label: 'Attack', group: 'Amp Envelope', kind: 'range', min: 0.001, max: 2, step: 0.005, unit: 's', tolerance: 0.15 },
  decay: { id: 'decay', label: 'Decay', group: 'Amp Envelope', kind: 'range', min: 0.01, max: 2, step: 0.01, unit: 's', tolerance: 0.18 },
  sustain: { id: 'sustain', label: 'Sustain', group: 'Amp Envelope', kind: 'range', min: 0, max: 1, step: 0.05, tolerance: 0.18 },
  release: { id: 'release', label: 'Release', group: 'Amp Envelope', kind: 'range', min: 0.01, max: 3, step: 0.01, unit: 's', tolerance: 0.2 },
  fAttack: { id: 'fAttack', label: 'F-Attack', group: 'Filter Envelope', kind: 'range', min: 0.001, max: 1.5, step: 0.005, unit: 's', tolerance: 0.2 },
  fDecay: { id: 'fDecay', label: 'F-Decay', group: 'Filter Envelope', kind: 'range', min: 0.01, max: 2, step: 0.01, unit: 's', tolerance: 0.2 },
  eqLow: { id: 'eqLow', label: 'EQ Low', group: 'EQ', kind: 'range', min: -18, max: 12, step: 0.5, unit: 'dB', tolerance: 0.15 },
  eqMid: { id: 'eqMid', label: 'EQ Mid', group: 'EQ', kind: 'range', min: -18, max: 12, step: 0.5, unit: 'dB', tolerance: 0.15 },
  eqHigh: { id: 'eqHigh', label: 'EQ High', group: 'EQ', kind: 'range', min: -18, max: 12, step: 0.5, unit: 'dB', tolerance: 0.15 },
  drive: { id: 'drive', label: 'Drive', group: 'FX', kind: 'range', min: 0, max: 1, step: 0.05, tolerance: 0.2 },
  reverb: { id: 'reverb', label: 'Reverb', group: 'FX', kind: 'range', min: 0, max: 1, step: 0.05, tolerance: 0.2 },
  delay: { id: 'delay', label: 'Delay', group: 'FX', kind: 'range', min: 0, max: 1, step: 0.05, tolerance: 0.2 },
}

export type Level = {
  id: number
  title: string
  lesson: string
  params: ParamId[] // parameters unlocked & graded in this level
}

export const LEVELS: Level[] = [
  { id: 1, title: 'Wellenformen hören', lesson: 'Saw ist hell und reich, Square hohl, Triangle weich, Sine pur. Hör den Zielsound und wähle die Wellenform.', params: ['osc'] },
  { id: 2, title: 'Filter Cutoff', lesson: 'Das Lowpass-Filter nimmt Höhen weg. Je tiefer der Cutoff, desto dumpfer.', params: ['osc', 'cutoff'] },
  { id: 3, title: 'Resonance', lesson: 'Resonance betont den Bereich direkt am Cutoff – es "pfeift" oder quakt.', params: ['osc', 'cutoff', 'resonance'] },
  { id: 4, title: 'Attack & Release', lesson: 'Attack = Einschwingen, Release = Ausklingen nach dem Loslassen.', params: ['osc', 'cutoff', 'attack', 'release'] },
  { id: 5, title: 'Decay & Sustain', lesson: 'Decay fällt auf den Sustain-Pegel. Pluck = kurzer Decay, wenig Sustain.', params: ['osc', 'cutoff', 'attack', 'decay', 'sustain', 'release'] },
  { id: 6, title: 'Filter-Hüllkurve', lesson: 'Die Filter-Envelope öffnet das Filter beim Anschlag – klassischer "Wow"-Bass.', params: ['osc', 'cutoff', 'filterEnvAmount', 'fAttack', 'fDecay', 'attack', 'release'] },
  { id: 7, title: 'Filtertypen', lesson: 'Highpass dünnt aus, Bandpass macht telefonig.', params: ['osc', 'filterType', 'cutoff', 'resonance', 'filterEnvAmount', 'fDecay'] },
  { id: 8, title: 'Detune & Sub', lesson: 'Detune verbreitert, Sub-Oszillator gibt Fundament.', params: ['osc', 'detune', 'subLevel', 'cutoff', 'resonance', 'attack', 'release'] },
  { id: 9, title: 'Equalizer', lesson: 'EQ formt den fertigen Sound: Low / Mid / High in dB.', params: ['osc', 'cutoff', 'eqLow', 'eqMid', 'eqHigh', 'attack', 'release'] },
  { id: 10, title: 'Drive, Delay & Reverb', lesson: 'Sättigung und Raum – der letzte Schliff. Alles ist jetzt frei.', params: Object.keys(PARAM_SPECS) as ParamId[] },
]

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

export function randomTarget(level: Level): PatchParams {
  const t: PatchParams = { ...DEFAULT_PATCH }
  for (const id of level.params) {
    const s = PARAM_SPECS[id]
    if (s.kind === 'choice') {
      const c = s.choices!
      ;(t as Record<string, unknown>)[id] = c[Math.floor(Math.random() * c.length)]
    } else if (s.log) {
      const v = Math.exp(rnd(Math.log(s.min!), Math.log(s.max!)))
      ;(t as Record<string, unknown>)[id] = Math.round(v)
    } else {
      const v = rnd(s.min!, s.max!)
      const st = s.step ?? 0.01
      ;(t as Record<string, unknown>)[id] = Math.round(v / st) * st
    }
  }
  return t
}

export function scoreGuess(level: Level, target: PatchParams, guess: PatchParams) {
  const details = level.params.map((id) => {
    const s = PARAM_SPECS[id]
    if (s.kind === 'choice') {
      const ok = target[id] === guess[id]
      return { id, ok, score: ok ? 1 : 0 }
    }
    const min = s.min!, max = s.max!
    const norm = (v: number) => (s.log ? (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min)) : (v - min) / (max - min))
    const d = Math.abs(norm(target[id] as number) - norm(guess[id] as number))
    const tol = s.tolerance ?? 0.15
    return { id, ok: d <= tol, score: Math.max(0, 1 - d / (tol * 2)) }
  })
  const avg = details.reduce((a, b) => a + b.score, 0) / details.length
  const allOk = details.every((d) => d.ok)
  return { details, percent: Math.round(avg * 100), passed: allOk }
}
