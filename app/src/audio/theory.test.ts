import { describe, expect, it } from 'vitest'
import { NOTE_NAMES, PROGRESSIONS, SCALES, chordNotes, midiToNote, noteToMidi, parseRoman } from './theory'

const nameOf = (root: number) => NOTE_NAMES[root]
const rootsOf = (prog: string[], key: number, scale: number[]) =>
  prog.map((d) => nameOf(parseRoman(d, key, scale).root))

describe('midi <-> note conversion', () => {
  it('round-trips', () => {
    for (let m = 21; m <= 108; m++) expect(noteToMidi(midiToNote(m))).toBe(m)
  })
  it('anchors middle C at 60', () => {
    expect(midiToNote(60)).toBe('C4')
    expect(noteToMidi('A4')).toBe(69)
  })
})

describe('roman numeral resolution', () => {
  const major = SCALES.Major

  it('resolves basic major degrees in C', () => {
    expect(rootsOf(['I', 'V', 'vi', 'IV'], 0, major)).toEqual(['C', 'G', 'A', 'F'])
  })

  it('resolves Canon in D correctly', () => {
    const canon = PROGRESSIONS.find((p) => p.name === 'Canon in D')!
    // in D major: D A Bm F#m G D G A
    expect(rootsOf(canon.degrees, 2, SCALES[canon.scale])).toEqual(['D', 'A', 'B', 'F#', 'G', 'D', 'G', 'A'])
  })

  it('resolves La Folia in D minor to Dm A Dm C F C Dm A', () => {
    const folia = PROGRESSIONS.find((p) => p.name === 'La Folia')!
    expect(rootsOf(folia.degrees, 2, SCALES[folia.scale])).toEqual(['D', 'A', 'D', 'C', 'F', 'C', 'D', 'A'])
  })

  it('resolves the Andalusian cadence in A minor to Am G F E', () => {
    const and = PROGRESSIONS.find((p) => p.name === 'Andalusian Cadence')!
    expect(rootsOf(and.degrees, 9, SCALES[and.scale])).toEqual(['A', 'G', 'F', 'E'])
  })

  it('keeps flat degrees identical regardless of the scale context', () => {
    // bVII must be 10 semitones above the root no matter which mode is selected
    for (const s of Object.values(SCALES)) expect(parseRoman('bVII', 0, s).root).toBe(10)
    for (const s of Object.values(SCALES)) expect(parseRoman('bIII', 0, s).root).toBe(3)
  })

  it('derives chord quality from case and suffix', () => {
    expect(parseRoman('I', 0, major).intervals).toEqual([0, 4, 7])
    expect(parseRoman('vi', 0, major).intervals).toEqual([0, 3, 7])
    expect(parseRoman('V7', 0, major).intervals).toEqual([0, 4, 7, 10])
    expect(parseRoman('ii7', 0, major).intervals).toEqual([0, 3, 7, 10])
    expect(parseRoman('Imaj7', 0, major).intervals).toEqual([0, 4, 7, 11])
  })

  it('never produces a root outside 0..11', () => {
    for (const p of PROGRESSIONS)
      for (let key = 0; key < 12; key++)
        for (const d of p.degrees) {
          const r = parseRoman(d, key, SCALES[p.scale]).root
          expect(r).toBeGreaterThanOrEqual(0)
          expect(r).toBeLessThan(12)
        }
  })

  it('produces playable note names for every progression and key', () => {
    for (const p of PROGRESSIONS)
      for (let key = 0; key < 12; key++)
        for (const d of p.degrees)
          for (const n of chordNotes(parseRoman(d, key, SCALES[p.scale]), 3)) {
            expect(n).toMatch(/^[A-G]#?\d$/)
            expect(noteToMidi(n)).toBeGreaterThan(0)
          }
  })
})
