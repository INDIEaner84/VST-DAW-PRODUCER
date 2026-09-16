import { DEFAULT_PATCH, type PatchParams } from './engine'

export type ParamId = keyof PatchParams

export type ParamSpec = {
  id: ParamId
  label: string
  group: 'Oscillator' | 'Noise' | 'Filter' | 'Amp Envelope' | 'Filter Envelope' | 'LFO' | 'EQ' | 'FX'
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
  delay: { id: 'delay', label: 'Delay Mix', group: 'FX', kind: 'range', min: 0, max: 1, step: 0.05, tolerance: 0.2 },
  noiseLevel: { id: 'noiseLevel', label: 'Noise Level', group: 'Noise', kind: 'range', min: 0, max: 1, step: 0.05, tolerance: 0.2 },
  noiseType: { id: 'noiseType', label: 'Noise Type', group: 'Noise', kind: 'choice', choices: ['white', 'pink', 'brown'] },
  pwm: { id: 'pwm', label: 'Pulse Width', group: 'Oscillator', kind: 'range', min: 0.05, max: 0.95, step: 0.01, tolerance: 0.15 },
  glide: { id: 'glide', label: 'Glide', group: 'Oscillator', kind: 'range', min: 0, max: 0.5, step: 0.01, unit: 's', tolerance: 0.2 },
  lfoRate: { id: 'lfoRate', label: 'LFO Rate', group: 'LFO', kind: 'range', min: 0.1, max: 18, step: 0.1, unit: 'Hz', log: true, tolerance: 0.16 },
  lfoToPitch: { id: 'lfoToPitch', label: 'LFO → Pitch', group: 'LFO', kind: 'range', min: 0, max: 100, step: 1, unit: 'ct', tolerance: 0.2 },
  lfoToFilter: { id: 'lfoToFilter', label: 'LFO → Filter', group: 'LFO', kind: 'range', min: 0, max: 1, step: 0.05, tolerance: 0.2 },
  lfoToAmp: { id: 'lfoToAmp', label: 'LFO → Amp', group: 'LFO', kind: 'range', min: 0, max: 1, step: 0.05, tolerance: 0.2 },
  delayTime: { id: 'delayTime', label: 'Delay Time', group: 'FX', kind: 'range', min: 0.03, max: 0.8, step: 0.01, unit: 's', tolerance: 0.18 },
  delayFeedback: { id: 'delayFeedback', label: 'Feedback', group: 'FX', kind: 'range', min: 0, max: 0.85, step: 0.05, tolerance: 0.2 },
  chorus: { id: 'chorus', label: 'Chorus', group: 'FX', kind: 'range', min: 0, max: 1, step: 0.05, tolerance: 0.2 },
  bitcrush: { id: 'bitcrush', label: 'Bitcrush', group: 'FX', kind: 'range', min: 0, max: 1, step: 0.05, tolerance: 0.2 },
}

export type Level = {
  id: number
  chapter: string
  title: string
  lesson: string
  tip?: string
  params: ParamId[] // parameters unlocked & graded in this level
}

export const LEVELS: Level[] = [
  // ---- Kapitel 1: Grundlagen ----
  { id: 1, chapter: 'Grundlagen', title: 'Wellenformen hören', lesson: 'Saw ist hell und reich, Square hohl, Triangle weich, Sine pur. Hör den Zielsound und wähle die Wellenform.', tip: 'Sine hat keinerlei Obertöne – wenn du gar keine "Schärfe" hörst, ist es eine Sine.', params: ['osc'] },
  { id: 2, chapter: 'Grundlagen', title: 'Filter Cutoff', lesson: 'Das Lowpass-Filter nimmt Höhen weg. Je tiefer der Cutoff, desto dumpfer der Sound.', tip: 'Fahre den Regler langsam von oben nach unten, bis die Helligkeit passt.', params: ['osc', 'cutoff'] },
  { id: 3, chapter: 'Grundlagen', title: 'Resonance', lesson: 'Resonance betont den Bereich direkt am Cutoff – es "pfeift" oder quakt.', tip: 'Hohe Resonance macht einen deutlich hörbaren Pfeifton am Cutoff-Punkt.', params: ['osc', 'cutoff', 'resonance'] },
  { id: 4, chapter: 'Grundlagen', title: 'Attack & Release', lesson: 'Attack = Einschwingzeit, Release = Ausklingen nach dem Loslassen.', tip: 'Pads haben langen Attack, Plucks fast keinen.', params: ['osc', 'cutoff', 'attack', 'release'] },
  { id: 5, chapter: 'Grundlagen', title: 'Decay & Sustain', lesson: 'Decay fällt auf den Sustain-Pegel. Pluck = kurzer Decay, wenig Sustain.', tip: 'Sustain 0 = der Ton verschwindet trotz gehaltener Taste.', params: ['osc', 'cutoff', 'attack', 'decay', 'sustain', 'release'] },
  { id: 6, chapter: 'Grundlagen', title: 'Volle ADSR-Kontrolle', lesson: 'Jetzt alle vier Hüllkurven-Stufen gleichzeitig treffen.', params: ['osc', 'cutoff', 'attack', 'decay', 'sustain', 'release'] },

  // ---- Kapitel 2: Filter vertiefen ----
  { id: 7, chapter: 'Filter', title: 'Filter-Hüllkurve', lesson: 'Die Filter-Envelope öffnet das Filter beim Anschlag – klassischer "Wow"-Bass.', tip: 'Env Amount bestimmt, wie weit das Filter aufreißt.', params: ['osc', 'cutoff', 'filterEnvAmount', 'fAttack', 'fDecay', 'attack', 'release'] },
  { id: 8, chapter: 'Filter', title: 'Filtertypen', lesson: 'Highpass dünnt aus und nimmt den Bass, Bandpass macht telefonig.', params: ['osc', 'filterType', 'cutoff', 'resonance', 'filterEnvAmount', 'fDecay'] },
  { id: 9, chapter: 'Filter', title: 'Filter-Sweep timing', lesson: 'F-Attack und F-Decay bestimmen, wie schnell der Sweep passiert.', tip: 'Langer F-Attack = der Sound "öffnet" sich langsam.', params: ['osc', 'cutoff', 'resonance', 'filterEnvAmount', 'fAttack', 'fDecay', 'attack', 'sustain', 'release'] },

  // ---- Kapitel 3: Oszillator-Layer ----
  { id: 10, chapter: 'Oszillatoren', title: 'Detune & Sub', lesson: 'Detune verbreitert und macht den Sound fett, der Sub-Oszillator gibt Fundament eine Oktave tiefer.', params: ['osc', 'detune', 'subLevel', 'cutoff', 'resonance', 'attack', 'release'] },
  { id: 11, chapter: 'Oszillatoren', title: 'Pulse Width', lesson: 'Bei Square verändert die Pulsbreite den Charakter: 0.5 ist hohl, extreme Werte werden dünn und nasal.', tip: 'Dieses Level nutzt immer Square – hör nur auf die "Nasigkeit".', params: ['pwm', 'cutoff', 'attack', 'release'] },
  { id: 12, chapter: 'Oszillatoren', title: 'Noise Layer', lesson: 'Rauschen dazumischen: White ist hell/zischend, Pink weicher, Brown dumpf und rumpelnd.', tip: 'Noise ist das Geheimnis hinter Wind, Atem und Snare-artigen Sounds.', params: ['osc', 'noiseLevel', 'noiseType', 'cutoff', 'attack', 'decay', 'sustain', 'release'] },
  { id: 13, chapter: 'Oszillatoren', title: 'Glide / Portamento', lesson: 'Glide lässt die Tonhöhe von Note zu Note gleiten – typisch für 303-Basslines.', params: ['osc', 'glide', 'cutoff', 'resonance', 'filterEnvAmount', 'attack', 'release'] },

  // ---- Kapitel 4: Modulation ----
  { id: 14, chapter: 'Modulation', title: 'LFO → Pitch (Vibrato)', lesson: 'Ein LFO moduliert die Tonhöhe. Rate = Geschwindigkeit, Amount = Tiefe in Cent.', tip: 'Langsam + wenig = musikalisches Vibrato. Schnell + viel = Sirene.', params: ['osc', 'lfoRate', 'lfoToPitch', 'cutoff', 'attack', 'release'] },
  { id: 15, chapter: 'Modulation', title: 'LFO → Filter (Wobble)', lesson: 'Derselbe LFO auf den Cutoff erzeugt Wobble- und Dubstep-Bässe.', params: ['osc', 'lfoRate', 'lfoToFilter', 'cutoff', 'resonance', 'attack', 'release'] },
  { id: 16, chapter: 'Modulation', title: 'LFO → Amp (Tremolo)', lesson: 'Auf die Lautstärke gelegt wird aus dem LFO ein Tremolo – pulsierende Pads.', params: ['osc', 'lfoRate', 'lfoToAmp', 'cutoff', 'attack', 'release'] },
  { id: 17, chapter: 'Modulation', title: 'Modulations-Routing', lesson: 'Jetzt alle drei LFO-Ziele gleichzeitig. Welches Ziel hörst du wirklich?', tip: 'Pitch = Tonhöhe wackelt, Filter = Helligkeit wackelt, Amp = Lautstärke wackelt.', params: ['osc', 'lfoRate', 'lfoToPitch', 'lfoToFilter', 'lfoToAmp', 'cutoff', 'resonance'] },

  // ---- Kapitel 5: Mixing & FX ----
  { id: 18, chapter: 'Mixing & FX', title: 'Equalizer', lesson: 'EQ formt den fertigen Sound: Low / Mid / High in dB anheben oder absenken.', params: ['osc', 'cutoff', 'eqLow', 'eqMid', 'eqHigh', 'attack', 'release'] },
  { id: 19, chapter: 'Mixing & FX', title: 'Drive & Sättigung', lesson: 'Distortion fügt Obertöne hinzu und macht den Sound aggressiv und laut.', params: ['osc', 'drive', 'cutoff', 'resonance', 'eqLow', 'eqHigh'] },
  { id: 20, chapter: 'Mixing & FX', title: 'Delay im Detail', lesson: 'Nicht nur "wieviel Delay": Delay Time setzt den Abstand, Feedback die Anzahl der Wiederholungen.', params: ['osc', 'delay', 'delayTime', 'delayFeedback', 'cutoff', 'attack', 'release'] },
  { id: 21, chapter: 'Mixing & FX', title: 'Reverb & Raum', lesson: 'Reverb setzt den Sound in einen Raum – von trocken bis Kathedrale.', params: ['osc', 'reverb', 'delay', 'cutoff', 'attack', 'release'] },
  { id: 22, chapter: 'Mixing & FX', title: 'Chorus & Bitcrush', lesson: 'Chorus verbreitert stereo und schimmert, Bitcrush macht es lo-fi und digital-dreckig.', params: ['osc', 'chorus', 'bitcrush', 'cutoff', 'resonance', 'attack', 'release'] },

  // ---- Kapitel 6: Meisterprüfung ----
  { id: 23, chapter: 'Meisterprüfung', title: 'Bass-Design', lesson: 'Alles aus Oszillator, Filter und Hüllkurven kombiniert – baue den Bass exakt nach.', params: ['osc', 'detune', 'subLevel', 'pwm', 'glide', 'filterType', 'cutoff', 'resonance', 'filterEnvAmount', 'fAttack', 'fDecay', 'attack', 'decay', 'sustain', 'release', 'drive'] },
  { id: 24, chapter: 'Meisterprüfung', title: 'Full Patch', lesson: 'Die finale Prüfung: jeder Parameter des Synths ist im Spiel.', params: Object.keys(PARAM_SPECS) as ParamId[] },
]

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

/** Params that would be inaudible and therefore must not be graded for this target. */
export function gradedParams(level: Level, target: PatchParams): ParamId[] {
  return level.params.filter((id) => {
    if (id === 'noiseType' && target.noiseLevel <= 0.05) return false
    if (id === 'pwm' && target.osc !== 'square') return false
    if (id === 'lfoRate' && target.lfoToPitch < 5 && target.lfoToFilter < 0.1 && target.lfoToAmp < 0.1) return false
    if ((id === 'delayTime' || id === 'delayFeedback') && target.delay < 0.1) return false
    if ((id === 'fAttack' || id === 'fDecay') && target.filterEnvAmount < 0.1) return false
    return true
  })
}

export function randomTarget(level: Level): PatchParams {
  const t: PatchParams = { ...DEFAULT_PATCH }
  // levels that teach pulse width always use a square/pulse oscillator
  if (level.params.includes('pwm') && !level.params.includes('osc')) t.osc = 'square'
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
  // make modulation levels clearly audible instead of near-zero
  if (level.params.includes('lfoToPitch') && level.params.length <= 6 && t.lfoToPitch < 20) t.lfoToPitch = 25 + Math.random() * 60
  if (level.params.includes('lfoToFilter') && level.params.length <= 7 && t.lfoToFilter < 0.25) t.lfoToFilter = 0.3 + Math.random() * 0.6
  if (level.params.includes('lfoToAmp') && level.params.length <= 6 && t.lfoToAmp < 0.25) t.lfoToAmp = 0.3 + Math.random() * 0.6
  if (level.params.includes('noiseLevel') && t.noiseLevel < 0.2) t.noiseLevel = 0.3 + Math.random() * 0.6
  if (level.params.includes('delayTime') && t.delay < 0.25) t.delay = 0.3 + Math.random() * 0.4
  return t
}

export function scoreGuess(level: Level, target: PatchParams, guess: PatchParams) {
  const details = gradedParams(level, target).map((id) => {
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
