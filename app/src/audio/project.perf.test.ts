import { describe, expect, it } from 'vitest'
import { DEFAULT_PATCH } from './engine'
import { emptyPattern } from './drums'
import { DRUM_ORDER } from './drums'
import {
  MAX_STEPS,
  exportMidi,
  parseProject,
  sanitizeProject,
  serializeProject,
  type Project,
} from './project'

const heavyProject = (noteCount: number): Project => {
  const pattern = emptyPattern(MAX_STEPS)
  for (const d of DRUM_ORDER) for (let i = 0; i < MAX_STEPS; i++) pattern[d][i] = 1
  return {
    version: 1,
    name: 'Stress',
    savedAt: Date.now(),
    bpm: 174,
    bars: 4,
    keyRoot: 0,
    progIdx: 0,
    chordsOn: true,
    quantize: true,
    octave: 4,
    patch: { ...DEFAULT_PATCH },
    notes: Array.from({ length: noteCount }, (_, i) => ({
      id: `n${i}`,
      midi: 36 + (i % 60),
      start: i % 64,
      len: 1 + (i % 8),
      vel: 0.5,
    })),
    pattern,
  }
}

describe('performance: serialisation', () => {
  it('serialises a full 4-bar project quickly', () => {
    const p = heavyProject(500)
    const t0 = performance.now()
    const text = serializeProject(p)
    const dt = performance.now() - t0
    expect(dt).toBeLessThan(120)
    expect(text.length).toBeGreaterThan(0)
  })

  it('keeps the payload small enough for localStorage', () => {
    // a full project must stay far below the typical 5 MB quota
    const text = serializeProject(heavyProject(500))
    expect(text.length).toBeLessThan(600_000)
  })

  it('parses a large project quickly', () => {
    const text = serializeProject(heavyProject(500))
    const t0 = performance.now()
    const back = parseProject(text)
    expect(performance.now() - t0).toBeLessThan(200)
    expect(back!.notes.length).toBe(500)
  })

  it('handles repeated autosave cycles without slowing down', () => {
    const p = heavyProject(300)
    const times: number[] = []
    for (let i = 0; i < 25; i++) {
      const t0 = performance.now()
      parseProject(serializeProject(p))
      times.push(performance.now() - t0)
    }
    const first = times.slice(0, 5).reduce((a, b) => a + b, 0) / 5
    const last = times.slice(-5).reduce((a, b) => a + b, 0) / 5
    // no runaway growth (allow generous noise margin on shared CI)
    expect(last).toBeLessThan(Math.max(first * 6, 60))
  })
})

describe('performance: MIDI export', () => {
  it('exports a dense project fast', () => {
    const t0 = performance.now()
    const bytes = exportMidi(heavyProject(500))
    expect(performance.now() - t0).toBeLessThan(300)
    expect(bytes.length).toBeGreaterThan(100)
  })

  it('produces a file size proportional to the content', () => {
    const small = exportMidi(heavyProject(10)).length
    const big = exportMidi(heavyProject(500)).length
    expect(big).toBeGreaterThan(small)
    expect(big).toBeLessThan(200_000)
  })

  it('does not blow the stack on the maximum note count', () => {
    // spread-based byte building can overflow the call stack on huge arrays
    expect(() => exportMidi(heavyProject(2000))).not.toThrow()
  })

  it('stays linear rather than quadratic', () => {
    const time = (n: number) => {
      const p = heavyProject(n)
      const t0 = performance.now()
      exportMidi(p)
      return performance.now() - t0
    }
    time(100) // warm up
    const t100 = time(100)
    const t800 = time(800)
    // 8x the notes must not cost dramatically more than 8x the time
    expect(t800).toBeLessThan(Math.max(t100 * 40, 500))
  })
})

describe('performance: sanitising untrusted input', () => {
  it('rejects a huge hostile note array without hanging', () => {
    const evil = { notes: Array.from({ length: 200_000 }, () => ({ midi: 60, start: 0, len: 1, vel: 1 })) }
    const t0 = performance.now()
    const p = sanitizeProject(evil)!
    expect(performance.now() - t0).toBeLessThan(500)
    expect(p.notes.length).toBeLessThanOrEqual(2000)
  })

  it('caps memory growth from oversized drum lanes', () => {
    const evil = { pattern: { kick: Array(1_000_000).fill(1) }, notes: [] }
    const t0 = performance.now()
    const p = sanitizeProject(evil)!
    expect(performance.now() - t0).toBeLessThan(500)
    expect(p.pattern.kick).toHaveLength(MAX_STEPS)
  })
})
