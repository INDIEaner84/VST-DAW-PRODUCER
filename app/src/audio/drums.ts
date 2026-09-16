import * as Tone from 'tone'

export type DrumId = 'kick' | 'snare' | 'clap' | 'hatC' | 'hatO' | 'tom' | 'rim' | 'cow'

export const DRUM_LABELS: Record<DrumId, string> = {
  kick: 'Kick',
  snare: 'Snare',
  clap: 'Clap',
  hatC: 'HiHat cl.',
  hatO: 'HiHat op.',
  tom: 'Tom',
  rim: 'Rim',
  cow: 'Cowbell',
}

export const DRUM_ORDER: DrumId[] = ['kick', 'snare', 'clap', 'hatC', 'hatO', 'tom', 'rim', 'cow']

/** Nektar Impact style 8 pad layout -> GM-ish notes (also works with most pad controllers). */
export const PAD_NOTE_MAP: Record<number, DrumId> = {
  36: 'kick',
  38: 'snare',
  39: 'clap',
  42: 'hatC',
  46: 'hatO',
  45: 'tom',
  37: 'rim',
  56: 'cow',
  // Nektar Impact LX factory pads (C1..) fallback
  60: 'kick',
  61: 'snare',
  62: 'clap',
  63: 'hatC',
  64: 'hatO',
  65: 'tom',
  66: 'rim',
  67: 'cow',
}

/** Fully synthesized drum machine (no samples needed, all open source Tone.js nodes). */
export class DrumMachine {
  out: Tone.Gain
  private comp: Tone.Compressor
  private kick: Tone.MembraneSynth
  private tom: Tone.MembraneSynth
  private snare: Tone.NoiseSynth
  private clap: Tone.NoiseSynth
  private hat: Tone.MetalSynth
  private rim: Tone.MetalSynth
  private cow: Tone.MetalSynth
  private hatFilter: Tone.Filter

  constructor() {
    this.out = new Tone.Gain(0.9).toDestination()
    this.comp = new Tone.Compressor(-18, 3).connect(this.out)
    this.kick = new Tone.MembraneSynth({ octaves: 6, pitchDecay: 0.05, envelope: { attack: 0.001, decay: 0.4, sustain: 0 } }).connect(this.comp)
    this.tom = new Tone.MembraneSynth({ octaves: 3, pitchDecay: 0.1, envelope: { attack: 0.002, decay: 0.3, sustain: 0 } }).connect(this.comp)
    this.snare = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.16, sustain: 0 } }).connect(this.comp)
    this.clap = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.003, decay: 0.22, sustain: 0 } }).connect(this.comp)
    this.hatFilter = new Tone.Filter(7000, 'highpass').connect(this.comp)
    this.hat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.08, release: 0.02 }, harmonicity: 5.1, resonance: 4000, volume: -18 }).connect(this.hatFilter)
    this.rim = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.03, release: 0.01 }, harmonicity: 8, resonance: 8000, volume: -22 }).connect(this.comp)
    this.cow = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.2, release: 0.05 }, harmonicity: 3.2, resonance: 1200, volume: -24 }).connect(this.comp)
  }

  trigger(id: DrumId, time?: number, velocity = 1) {
    const t = time ?? Tone.now()
    switch (id) {
      case 'kick': return this.kick.triggerAttackRelease('C1', '8n', t, velocity)
      case 'tom': return this.tom.triggerAttackRelease('G2', '8n', t, velocity)
      case 'snare': return this.snare.triggerAttackRelease('16n', t, velocity)
      case 'clap': return this.clap.triggerAttackRelease('16n', t, velocity * 0.9)
      case 'hatC': return this.hat.triggerAttackRelease('32n', t, velocity * 0.6)
      case 'hatO': return this.hat.triggerAttackRelease('8n', t, velocity * 0.6)
      case 'rim': return this.rim.triggerAttackRelease('64n', t, velocity)
      case 'cow': return this.cow.triggerAttackRelease('16n', t, velocity * 0.7)
    }
  }
}

export type DrumPattern = Record<DrumId, number[]> // 16 steps, velocity 0..1

export const emptyPattern = (steps = 16): DrumPattern =>
  Object.fromEntries(DRUM_ORDER.map((d) => [d, Array(steps).fill(0)])) as DrumPattern

const p = (s: string) => s.split('').map((c) => (c === 'x' ? 1 : c === 'o' ? 0.55 : 0))

export const DRUM_PRESETS: { name: string; pattern: Partial<Record<DrumId, number[]>> }[] = [
  { name: 'Four on the Floor', pattern: { kick: p('x...x...x...x...'), hatC: p('..o...o...o...o.'), clap: p('....x.......x...') } },
  { name: 'Boom Bap', pattern: { kick: p('x.....x...x.....'), snare: p('....x.......x...'), hatC: p('x.o.x.o.x.o.x.oo') } },
  { name: 'Trap', pattern: { kick: p('x.....x...x..x..'), clap: p('........x.......'), hatC: p('xxoxxoxxxxoxxxxx'), hatO: p('..........x.....') } },
  { name: 'Amen-ish Break', pattern: { kick: p('x..x....x..x....'), snare: p('....x..x..x.x..x'), hatC: p('o.o.o.o.o.o.o.o.') } },
  { name: 'Afro 6/8 Feel', pattern: { kick: p('x..x..x..x..x..x'), cow: p('x.x.x.x.x.x.x.x.'), rim: p('..x..x..x..x..x.') } },
  { name: 'Techno Rolling', pattern: { kick: p('x...x...x...x...'), hatO: p('..x...x...x...x.'), rim: p('...x...x...x...x'), tom: p('..............x.') } },
]
