import { vi } from 'vitest'

/** Minimal Tone.js stand-in so components can be exercised in jsdom. */
export function installToneMock() {
  const param = () => ({ value: 0, rampTo: vi.fn(), setValueAtTime: vi.fn() })
  const node = () => {
    const n: Record<string, unknown> = {
      connect: vi.fn(() => n),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      toDestination: vi.fn(() => n),
      start: vi.fn(() => n),
      stop: vi.fn(() => n),
      set: vi.fn(),
      triggerAttack: vi.fn(),
      triggerRelease: vi.fn(),
      triggerAttackRelease: vi.fn(),
      releaseAll: vi.fn(),
      getValue: vi.fn(() => new Float32Array(256)),
      frequency: param(),
      detune: param(),
      gain: param(),
      wet: param(),
      delayTime: param(),
      feedback: param(),
      Q: param(),
      low: param(),
      mid: param(),
      high: param(),
      bits: param(),
      fade: param(),
      a: {},
      b: {},
      type: 'white',
      distortion: 0,
      min: 0,
      max: 1,
    }
    return n
  }

  const transport = {
    bpm: param(),
    ticks: 0,
    PPQ: 192,
    state: 'stopped',
    position: 0,
    loop: false,
    loopStart: 0,
    loopEnd: '2m',
    start: vi.fn(),
    stop: vi.fn(),
    scheduleRepeat: vi.fn(() => 1),
    clear: vi.fn(),
  }

  // must be usable with `new`, so a real function – not an arrow
  const Ctor = () =>
    vi.fn(function (this: Record<string, unknown>) {
      Object.assign(this, node())
    }) as unknown as new (...args: unknown[]) => unknown

  return {
    start: vi.fn(async () => {}),
    now: vi.fn(() => 0),
    getDestination: vi.fn(() => node()),
    getContext: vi.fn(() => ({ resume: vi.fn(async () => {}) })),
    getTransport: vi.fn(() => transport),
    getDraw: vi.fn(() => ({ schedule: vi.fn() })),
    Frequency: vi.fn(() => ({ transpose: () => ({ toNote: () => 'C3' }) })),
    Gain: Ctor(), Filter: Ctor(), EQ3: Ctor(), Distortion: Ctor(), Reverb: Ctor(),
    FeedbackDelay: Ctor(), Chorus: Ctor(), BitCrusher: Ctor(), CrossFade: Ctor(),
    PolySynth: Ctor(), Synth: Ctor(), MonoSynth: Ctor(), Noise: Ctor(),
    AmplitudeEnvelope: Ctor(), LFO: Ctor(), Analyser: Ctor(), Compressor: Ctor(),
    MembraneSynth: Ctor(), NoiseSynth: Ctor(), MetalSynth: Ctor(),
    Transport: transport,
  }
}
