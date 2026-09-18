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
  // --- advanced ---
  noiseLevel: number // 0..1
  noiseType: 'white' | 'pink' | 'brown'
  pwm: number // 0..1 -> pulse width (only audible for pulse/square)
  glide: number // portamento seconds
  lfoRate: number // Hz
  lfoToPitch: number // cents
  lfoToFilter: number // 0..1
  lfoToAmp: number // 0..1 (tremolo)
  delayTime: number // seconds
  delayFeedback: number // 0..1
  chorus: number // 0..1
  bitcrush: number // 0..1 (0 = off)
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
  noiseLevel: 0,
  noiseType: 'white',
  pwm: 0.5,
  glide: 0,
  lfoRate: 5,
  lfoToPitch: 0,
  lfoToFilter: 0,
  lfoToAmp: 0,
  delayTime: 0.25,
  delayFeedback: 0.3,
  chorus: 0,
  bitcrush: 0,
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
  noise: Tone.Noise
  noiseGain: Tone.Gain
  noiseEnv: Tone.AmplitudeEnvelope
  chorus: Tone.Chorus
  crusher: Tone.BitCrusher
  crushGain: Tone.CrossFade
  tremolo: Tone.Gain
  lfoPitch: Tone.LFO
  lfoFilter: Tone.LFO
  lfoAmp: Tone.LFO
  private patch: PatchParams = { ...DEFAULT_PATCH }
  private held = 0

  constructor(destination?: Tone.InputNode) {
    this.out = new Tone.Gain(0.8)
    this.tremolo = new Tone.Gain(1)
    this.delay = new Tone.FeedbackDelay('8n', 0.3)
    this.reverb = new Tone.Reverb({ decay: 2.5, wet: 0 })
    this.chorus = new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: 0 }).start()
    this.crusher = new Tone.BitCrusher(8)
    this.crushGain = new Tone.CrossFade(0)
    this.dist = new Tone.Distortion(0)
    this.eq = new Tone.EQ3(0, 0, 0)
    this.filter = new Tone.Filter(12000, 'lowpass')
    this.poly = new Tone.PolySynth(Tone.MonoSynth, { volume: -10 })
    this.sub = new Tone.PolySynth(Tone.Synth, { volume: -60 })

    // noise layer with its own amp envelope
    this.noiseEnv = new Tone.AmplitudeEnvelope({ attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.3 })
    this.noiseGain = new Tone.Gain(0)
    this.noise = new Tone.Noise('white').start()
    this.noise.connect(this.noiseEnv)
    this.noiseEnv.connect(this.noiseGain)
    this.noiseGain.connect(this.filter)

    this.poly.connect(this.filter)
    this.sub.connect(this.filter)
    this.filter.connect(this.eq)
    this.eq.connect(this.dist)
    // dry/wet bitcrush
    this.dist.connect(this.crushGain.a)
    this.dist.connect(this.crusher)
    this.crusher.connect(this.crushGain.b)
    this.crushGain.connect(this.chorus)
    this.chorus.connect(this.delay)
    this.delay.connect(this.reverb)
    this.reverb.connect(this.tremolo)
    this.tremolo.connect(this.out)
    this.out.connect(destination ?? Tone.getDestination())
    this.delay.wet.value = 0

    // LFOs
    this.lfoPitch = new Tone.LFO(5, -1, 1).start()
    this.lfoFilter = new Tone.LFO(5, 0, 0).start()
    this.lfoAmp = new Tone.LFO(5, 1, 1).start()
    this.lfoFilter.connect(this.filter.frequency)
    this.lfoAmp.connect(this.tremolo.gain)

    this.apply(this.patch)
  }

  apply(p: PatchParams) {
    this.patch = { ...p }
    const oscOpts: Record<string, unknown> =
      p.osc === 'square' ? { type: 'pulse', width: Math.max(0.05, Math.min(0.95, p.pwm)) } : { type: p.osc }
    this.poly.set({
      oscillator: oscOpts as never,
      portamento: p.glide,
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
    this.delay.delayTime.rampTo(p.delayTime, 0.05)
    this.delay.feedback.rampTo(p.delayFeedback, 0.05)

    // noise layer
    if (this.noise.type !== p.noiseType) this.noise.type = p.noiseType
    this.noiseGain.gain.rampTo(p.noiseLevel * 0.35, 0.02)
    this.noiseEnv.set({ attack: p.attack, decay: p.decay, sustain: p.sustain, release: p.release })

    // modulation
    this.lfoPitch.frequency.value = p.lfoRate
    this.lfoFilter.frequency.value = p.lfoRate
    this.lfoAmp.frequency.value = p.lfoRate
    this.lfoPitch.min = -p.lfoToPitch
    this.lfoPitch.max = p.lfoToPitch
    const fDepth = p.lfoToFilter * Math.min(p.cutoff * 0.9, 6000)
    this.lfoFilter.min = -fDepth
    this.lfoFilter.max = fDepth
    this.lfoAmp.min = 1 - p.lfoToAmp
    this.lfoAmp.max = 1

    this.chorus.wet.rampTo(p.chorus, 0.05)
    this.crushGain.fade.rampTo(p.bitcrush > 0 ? 1 : 0, 0.05)
    if (p.bitcrush > 0) this.crusher.bits.value = Math.max(1, Math.round(16 - p.bitcrush * 14))
  }

  private pitchLfoTargets = new Set<string>()

  private attachPitchLfo(note: string) {
    // LFO -> detune of the whole polysynth (vibrato applies to all sounding voices)
    if (this.patch.lfoToPitch > 0 && !this.pitchLfoTargets.has('poly')) {
      try {
        this.lfoPitch.connect((this.poly as unknown as { detune: Tone.Param<'cents'> }).detune)
        this.pitchLfoTargets.add('poly')
      } catch {
        /* detune not exposed – vibrato silently skipped */
      }
    }
    void note
  }

  noteOn(note: string, velocity = 0.8, time?: number) {
    this.attachPitchLfo(note)
    this.poly.triggerAttack(note, time, velocity)
    if (this.patch.subLevel > 0) this.sub.triggerAttack(Tone.Frequency(note).transpose(-12).toNote(), time, velocity)
    if (this.patch.noiseLevel > 0) {
      if (this.held === 0) this.noiseEnv.triggerAttack(time, velocity)
      this.held++
    }
  }

  noteOff(note: string, time?: number) {
    this.poly.triggerRelease(note, time)
    this.sub.triggerRelease(Tone.Frequency(note).transpose(-12).toNote(), time)
    if (this.held > 0) {
      this.held--
      if (this.held === 0) this.noiseEnv.triggerRelease(time)
    }
  }

  playNote(note: string, dur: string | number = '8n', time?: number, velocity = 0.8) {
    this.attachPitchLfo(note)
    this.poly.triggerAttackRelease(note, dur, time, velocity)
    if (this.patch.subLevel > 0)
      this.sub.triggerAttackRelease(Tone.Frequency(note).transpose(-12).toNote(), dur, time, velocity)
    if (this.patch.noiseLevel > 0) this.noiseEnv.triggerAttackRelease(dur, time, velocity)
  }

  releaseAll() {
    this.poly.releaseAll()
    this.sub.releaseAll()
    this.held = 0
    this.noiseEnv.triggerRelease()
  }
}

export async function startAudio() {
  await Tone.start()
  await Tone.getContext().resume()
}
