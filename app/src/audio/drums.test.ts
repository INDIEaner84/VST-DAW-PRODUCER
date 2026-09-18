import { describe, expect, it } from 'vitest'
import { DRUM_ORDER, DRUM_PRESETS, PAD_NOTE_MAP, emptyPattern } from './drums'
import { euclid } from './rhythm'

describe('pattern container', () => {
  it('creates one lane per drum with the requested length', () => {
    const p = emptyPattern(16)
    expect(Object.keys(p).sort()).toEqual([...DRUM_ORDER].sort())
    for (const d of DRUM_ORDER) expect(p[d]).toHaveLength(16)
  })

  it('does not share array references between lanes', () => {
    const p = emptyPattern(16)
    p.kick[0] = 1
    expect(p.snare[0]).toBe(0)
  })
})

describe('drum presets', () => {
  it('only uses known drums and 16 steps', () => {
    for (const preset of DRUM_PRESETS)
      for (const [drum, steps] of Object.entries(preset.pattern)) {
        expect(DRUM_ORDER).toContain(drum)
        expect(steps, `${preset.name}/${drum}`).toHaveLength(16)
        for (const v of steps!) expect(v).toBeGreaterThanOrEqual(0)
      }
  })

  it('every preset actually makes sound', () => {
    for (const p of DRUM_PRESETS) {
      const hits = Object.values(p.pattern).flat().filter((v) => v! > 0).length
      expect(hits, p.name).toBeGreaterThan(3)
    }
  })

  it('puts a kick on beat one for the four-on-the-floor preset', () => {
    const f = DRUM_PRESETS.find((p) => p.name === 'Four on the Floor')!
    expect(f.pattern.kick![0]).toBeGreaterThan(0)
    expect(f.pattern.kick![4]).toBeGreaterThan(0)
    expect(f.pattern.kick![8]).toBeGreaterThan(0)
    expect(f.pattern.kick![12]).toBeGreaterThan(0)
  })
})

describe('pad mapping', () => {
  it('maps only to real drums', () => {
    for (const d of Object.values(PAD_NOTE_MAP)) expect(DRUM_ORDER).toContain(d)
  })
  it('covers the GM kick and snare', () => {
    expect(PAD_NOTE_MAP[36]).toBe('kick')
    expect(PAD_NOTE_MAP[38]).toBe('snare')
  })
})

describe('euclidean rhythms', () => {
  it('places exactly the requested number of pulses', () => {
    for (let len = 4; len <= 32; len++)
      for (let p = 0; p <= len; p++)
        expect(euclid(p, len).filter((v) => v > 0)).toHaveLength(p)
  })

  it('always starts on the downbeat when there is at least one pulse', () => {
    for (let p = 1; p <= 16; p++) expect(euclid(p, 16)[0]).toBe(1)
  })

  it('returns the canonical tresillo for 3 in 8', () => {
    expect(euclid(3, 8)).toEqual([1, 0, 0, 1, 0, 0, 1, 0])
  })

  it('returns the canonical cinquillo for 5 in 8', () => {
    expect(euclid(5, 8)).toEqual([1, 0, 1, 1, 0, 1, 1, 0])
  })

  it('spreads 4 in 16 evenly', () => {
    expect(euclid(4, 16)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0])
  })

  it('handles the degenerate cases safely', () => {
    expect(euclid(0, 16).some((v) => v > 0)).toBe(false)
    expect(euclid(20, 16).filter((v) => v > 0)).toHaveLength(16)
    expect(euclid(-3, 16).some((v) => v > 0)).toBe(false)
    expect(euclid(4, 0)).toEqual([])
  })
})
