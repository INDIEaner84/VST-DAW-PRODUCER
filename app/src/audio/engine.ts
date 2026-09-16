import * as Tone from 'tone'

export type PatchParams = {
  osc: 'sawtooth' | 'square' | 'triangle' | 'sine'
  detune: number // cents
  subLevel: number // 0..1
  filterType: 'lowpass' | 'highpass' | 'bandpass'
  cutoff: number // Hz
  resonance: number // Q
  filterEnvAmount: number // 0..1
  attack: number
  decay: number
  sustain: number
  release: number
  fAttack: number
  fDecay: number
  eqLow: number // dB
  eqMid: number
  eqHigh: number
  drive: number // 0..1
  reverb: number // 0..1
  delay: number // 0..1
}

export const DEFAULT_PATCH: PatchParams = {
  osc: 'sawtooth',
  detune: 0,
  subLevel: 0,
  filterType: 'lowpass',
  cutoff: 12000,
  resonance: 0.7,
  filterEnvAmount: 0,
  attack: 0.01,
  decay: 0.2,
  sustain: 0.7,
  release: 0.3,
  fAttack: 0.01,
  fDecay: 0.3,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  drive: 0,
  reverb: 0,
  delay: 0,
}

/** A small subtractive synth voice chain built on Tone.js (MIT, open source). */
export class SynthVoice {
  poly: Tone.PolySynth<Tone.MonoSynth>
  sub: Tone.PolySynth<Tone.Synth>
  filter: Tone.Filter
  eq: Tone.EQ3
  dist: Tone.Distortion
  reverb: Tone.Reverb
  delay: Tone.FeedbackDelay
  out: Tone.Gain
  private patch: PatchParams = { ...DEFAULT_PATCH }

  constructor(destination?: Tone.InputNode) {
    this.out = new Tone.Gain(0.8)
    this.delay = new Tone.FeedbackDelay('8n', 0.3)
    this.reverb = new Tone.Reverb({ decay: 2.5, wet: 0 })
    this.dist = new Tone.Distortion(0)
    this.eq = new Tone.EQ3(0, 0, 0)
    this.filter = new Tone.Filter(12000, 'lowpass')
    this.poly = new Tone.PolySynth(Tone.MonoSynth, { volume: -10 })
    this.sub = new Tone.PolySynth(Tone.Synth, { volume: -60 })

    this.poly.connect(this.filter)
    this.sub.connect(this.filter)
    this.filter.connect(this.eq)
    this.eq.connect(this.dist)
    this.dist.connect(this.delay)
    this.delay.connect(this.reverb)
    this.reverb.connect(this.out)
    this.out.connect(destination ?? Tone.getDestination())
    this.delay.wet.value = 0
    this.apply(this.patch)
  }

  apply(p: PatchParams) {
    this.patch = { ...p }
    this.poly.set({
      oscillator: { type: p.osc },
      detune: p.detune,
      envelope: { attack: p.attack, decay: p.decay, sustain: p.sustain, release: p.release },
      filterEnvelope: {
        attack: p.fAttack,
        decay: p.fDecay,
        sustain: 0.2,
        release: 0.4,
        baseFrequency: p.cutoff,
        octaves: p.filterEnvAmount * 5,
      },
      filter: { Q: p.resonance, type: 'lowpass' },
    })
    this.sub.set({ oscillator: { type: 'sine' }, volume: p.subLevel <= 0 ? -60 : -24 + p.subLevel * 18 })
    this.filter.type = p.filterType
    this.filter.frequency.rampTo(p.cutoff, 0.02)
    this.filter.Q.rampTo(p.resonance, 0.02)
    this.eq.low.value = p.eqLow
    this.eq.mid.value = p.eqMid
    this.eq.high.value = p.eqHigh
    this.dist.distortion = p.drive
    this.reverb.wet.rampTo(p.reverb, 0.05)
    this.delay.wet.rampTo(p.delay, 0.05)
  }

  noteOn(note: string, velocity = 0.8, time?: number) {
    this.poly.triggerAttack(note, time, velocity)
    if (this.patch.subLevel > 0) this.sub.triggerAttack(Tone.Frequency(note).transpose(-12).toNote(), time, velocity)
  }

  noteOff(note: string, time?: number) {
    this.poly.triggerRelease(note, time)
    this.sub.triggerRelease(Tone.Frequency(note).transpose(-12).toNote(), time)
  }

  playNote(note: string, dur: string | number = '8n', time?: number, velocity = 0.8) {
    this.poly.triggerAttackRelease(note, dur, time, velocity)
    if (this.patch.subLevel > 0)
      this.sub.triggerAttackRelease(Tone.Frequency(note).transpose(-12).toNote(), dur, time, velocity)
  }

  releaseAll() {
    this.poly.releaseAll()
    this.sub.releaseAll()
  }
}

export async function startAudio() {
  await Tone.start()
  await Tone.getContext().resume()
}
