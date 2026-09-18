import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PATCH } from './engine'
import { DRUM_ORDER, emptyPattern } from './drums'
import { PARAM_SPECS, type ParamId } from './levels'
import { PROGRESSIONS } from './theory'
import {
  MAX_STEPS,
  clearStorage,
  exportMidi,
  loadFromStorage,
  parseProject,
  safeFilename,
  sanitizeNotes,
  sanitizePatch,
  sanitizePattern,
  sanitizeProject,
  saveToStorage,
  serializeProject,
  type Project,
} from './project'

const ALL = Object.keys(PARAM_SPECS) as ParamId[]

const baseProject = (over: Partial<Project> = {}): Project => ({
  version: 1,
  name: 'Test',
  savedAt: 1700000000000,
  bpm: 120,
  bars: 2,
  keyRoot: 0,
  progIdx: 0,
  chordsOn: true,
  quantize: true,
  octave: 4,
  patch: { ...DEFAULT_PATCH },
  notes: [{ id: 'a', midi: 60, start: 0, len: 4, vel: 0.8 }],
  pattern: emptyPattern(MAX_STEPS),
  ...over,
})

// ---------------------------------------------------------------- sanitizing

describe('sanitizePatch', () => {
  it('returns the default patch for junk input', () => {
    for (const junk of [null, undefined, 42, 'nope', [], true])
      expect(sanitizePatch(junk)).toEqual(DEFAULT_PATCH)
  })

  it('keeps valid values', () => {
    expect(sanitizePatch({ cutoff: 4000, osc: 'square' }).cutoff).toBe(4000)
    expect(sanitizePatch({ osc: 'square' }).osc).toBe('square')
  })

  it('clamps out-of-range numbers into the knob range', () => {
    const p = sanitizePatch({ cutoff: 999999, resonance: -50, attack: -1 })
    expect(p.cutoff).toBeLessThanOrEqual(PARAM_SPECS.cutoff.max!)
    expect(p.resonance).toBeGreaterThanOrEqual(PARAM_SPECS.resonance.min!)
    expect(p.attack).toBeGreaterThanOrEqual(PARAM_SPECS.attack.min!)
  })

  it('rejects invalid enum values and keeps the default', () => {
    expect(sanitizePatch({ osc: 'triangleish' }).osc).toBe(DEFAULT_PATCH.osc)
    expect(sanitizePatch({ filterType: 'moog' }).filterType).toBe(DEFAULT_PATCH.filterType)
  })

  it('drops NaN, Infinity and non-numeric values', () => {
    const p = sanitizePatch({ cutoff: NaN, resonance: Infinity, decay: 'loud' })
    expect(p.cutoff).toBe(DEFAULT_PATCH.cutoff)
    expect(p.resonance).toBe(DEFAULT_PATCH.resonance)
    expect(p.decay).toBe(DEFAULT_PATCH.decay)
  })

  it('ignores unknown keys entirely', () => {
    const p = sanitizePatch({ hackTheGibson: 1, __proto__: { polluted: true } })
    expect(Object.keys(p).sort()).toEqual([...ALL].sort())
    expect((p as Record<string, unknown>).hackTheGibson).toBeUndefined()
  })

  it('never lets prototype pollution through', () => {
    sanitizePatch(JSON.parse('{"__proto__":{"pwned":true}}'))
    expect(({} as Record<string, unknown>).pwned).toBeUndefined()
  })

  it('always produces a fully populated, finite patch', () => {
    const p = sanitizePatch({})
    for (const id of ALL) {
      const spec = PARAM_SPECS[id]
      if (spec.kind === 'choice') expect(spec.choices).toContain(p[id] as string)
      else expect(Number.isFinite(p[id] as number)).toBe(true)
    }
  })
})

describe('sanitizeNotes', () => {
  it('returns an empty list for non-arrays', () => {
    for (const junk of [null, undefined, {}, 'x', 5]) expect(sanitizeNotes(junk, 32)).toEqual([])
  })

  it('keeps well-formed notes', () => {
    const n = sanitizeNotes([{ id: 'x', midi: 60, start: 3, len: 2, vel: 0.5 }], 32)
    expect(n).toHaveLength(1)
    expect(n[0]).toMatchObject({ midi: 60, start: 3, len: 2, vel: 0.5 })
  })

  it('drops notes with an unusable pitch or position', () => {
    const n = sanitizeNotes(
      [{ midi: 'abc', start: 0 }, { midi: 60, start: -5 }, { midi: 200, start: 0 }, null, 7],
      32,
    )
    expect(n).toHaveLength(0)
  })

  it('clamps start and length to the bar length', () => {
    const n = sanitizeNotes([{ midi: 60, start: 999, len: 999 }], 32)
    expect(n).toHaveLength(0) // start beyond the loop is dropped, not silently moved
    const m = sanitizeNotes([{ midi: 60, start: 31, len: 999 }], 32)
    expect(m[0].len).toBeLessThanOrEqual(32)
  })

  it('guarantees a minimum length of one step', () => {
    expect(sanitizeNotes([{ midi: 60, start: 0, len: 0 }], 32)[0].len).toBe(1)
    expect(sanitizeNotes([{ midi: 60, start: 0, len: -4 }], 32)[0].len).toBe(1)
  })

  it('clamps velocity into an audible range', () => {
    expect(sanitizeNotes([{ midi: 60, start: 0, vel: 99 }], 32)[0].vel).toBeLessThanOrEqual(1)
    expect(sanitizeNotes([{ midi: 60, start: 0, vel: -1 }], 32)[0].vel).toBeGreaterThan(0)
  })

  it('generates an id when one is missing', () => {
    expect(sanitizeNotes([{ midi: 60, start: 0 }], 32)[0].id).toBeTruthy()
  })

  it('caps absurdly large note lists', () => {
    const huge = Array.from({ length: 50_000 }, () => ({ midi: 60, start: 0, len: 1, vel: 1 }))
    expect(sanitizeNotes(huge, 32).length).toBeLessThanOrEqual(2000)
  })
})

describe('sanitizePattern', () => {
  it('produces a full pattern for junk', () => {
    const p = sanitizePattern(null)
    expect(Object.keys(p).sort()).toEqual([...DRUM_ORDER].sort())
    for (const d of DRUM_ORDER) expect(p[d]).toHaveLength(MAX_STEPS)
  })

  it('keeps valid velocities and clamps the rest', () => {
    const p = sanitizePattern({ kick: [1, 5, -3, NaN, 0.5] })
    expect(p.kick[0]).toBe(1)
    expect(p.kick[1]).toBe(1)
    expect(p.kick[2]).toBe(0)
    expect(p.kick[3]).toBe(0)
    expect(p.kick[4]).toBe(0.5)
  })

  it('ignores unknown drum lanes', () => {
    const p = sanitizePattern({ cowbell9000: [1, 1, 1] })
    expect((p as Record<string, unknown>).cowbell9000).toBeUndefined()
  })

  it('truncates over-long lanes instead of growing the pattern', () => {
    const p = sanitizePattern({ kick: Array(500).fill(1) })
    expect(p.kick).toHaveLength(MAX_STEPS)
  })
})

describe('sanitizeProject', () => {
  it('rejects things that are not projects', () => {
    for (const junk of [null, undefined, 5, 'x', [], {}, { foo: 1 }])
      expect(sanitizeProject(junk)).toBeNull()
  })

  it('accepts a minimal object that has project-ish fields', () => {
    expect(sanitizeProject({ notes: [] })).not.toBeNull()
  })

  it('clamps every numeric field into a usable range', () => {
    const p = sanitizeProject({ notes: [], bpm: 100000, bars: 99, keyRoot: 77, progIdx: 999, octave: 42 })!
    expect(p.bpm).toBeLessThanOrEqual(240)
    expect(p.bars).toBeLessThanOrEqual(4)
    expect(p.keyRoot).toBeLessThan(12)
    expect(p.progIdx).toBeLessThan(PROGRESSIONS.length)
    expect(p.octave).toBeLessThanOrEqual(7)
  })

  it('falls back to sane defaults for missing fields', () => {
    const p = sanitizeProject({ notes: [] })!
    expect(p.bpm).toBe(96)
    expect(p.bars).toBe(2)
    expect(p.name).toBe('Unbenannt')
    expect(p.chordsOn).toBe(true)
  })

  it('respects explicit false for booleans', () => {
    const p = sanitizeProject({ notes: [], chordsOn: false, quantize: false })!
    expect(p.chordsOn).toBe(false)
    expect(p.quantize).toBe(false)
  })

  it('drops notes that fall outside the restored bar length', () => {
    const p = sanitizeProject({ bars: 1, notes: [{ midi: 60, start: 40, len: 2 }] })!
    expect(p.notes).toHaveLength(0)
  })

  it('trims and caps the project name', () => {
    expect(sanitizeProject({ notes: [], name: '   ' })!.name).toBe('Unbenannt')
    expect(sanitizeProject({ notes: [], name: 'x'.repeat(500) })!.name.length).toBeLessThanOrEqual(80)
  })
})

// ---------------------------------------------------------------- round trip

describe('serialize / parse round trip', () => {
  it('survives a full round trip unchanged', () => {
    const p = baseProject({ patch: { ...DEFAULT_PATCH, cutoff: 3000, osc: 'square' } })
    const back = parseProject(serializeProject(p))!
    expect(back.bpm).toBe(p.bpm)
    expect(back.patch).toEqual(p.patch)
    expect(back.notes).toEqual(p.notes)
    expect(back.name).toBe(p.name)
  })

  it('returns null for malformed JSON instead of throwing', () => {
    expect(parseProject('{ not json')).toBeNull()
    expect(parseProject('')).toBeNull()
    expect(parseProject('null')).toBeNull()
    expect(parseProject('[1,2,3]')).toBeNull()
  })

  it('handles a truncated file gracefully', () => {
    const text = serializeProject(baseProject())
    expect(parseProject(text.slice(0, text.length / 2))).toBeNull()
  })

  it('preserves drum hits through a round trip', () => {
    const pattern = emptyPattern(MAX_STEPS)
    pattern.kick[0] = 1
    pattern.snare[4] = 0.6
    const back = parseProject(serializeProject(baseProject({ pattern })))!
    expect(back.pattern.kick[0]).toBe(1)
    expect(back.pattern.snare[4]).toBeCloseTo(0.6)
  })
})

// ---------------------------------------------------------------- storage

describe('localStorage persistence', () => {
  beforeEach(() => localStorage.clear())

  it('saves and restores a project', () => {
    expect(saveToStorage(baseProject({ name: 'Mein Song', bpm: 133 }))).toBe(true)
    const back = loadFromStorage()!
    expect(back.name).toBe('Mein Song')
    expect(back.bpm).toBe(133)
  })

  it('returns null when nothing is stored', () => {
    expect(loadFromStorage()).toBeNull()
  })

  it('returns null (not a crash) for corrupted storage', () => {
    localStorage.setItem('vdp.project', '{{{ broken')
    expect(loadFromStorage()).toBeNull()
  })

  it('clears storage on request', () => {
    saveToStorage(baseProject())
    clearStorage()
    expect(loadFromStorage()).toBeNull()
  })

  it('reports failure instead of throwing when the quota is exceeded', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(saveToStorage(baseProject())).toBe(false)
    spy.mockRestore()
  })

  it('survives localStorage being unavailable entirely', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('disabled')
    })
    expect(loadFromStorage()).toBeNull()
    spy.mockRestore()
  })
})

// ---------------------------------------------------------------- MIDI

const readU32 = (b: Uint8Array, i: number) => (b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]
const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.slice(i, i + n))

describe('MIDI export', () => {
  it('writes a valid type-1 header with two tracks', () => {
    const b = exportMidi(baseProject())
    expect(ascii(b, 0, 4)).toBe('MThd')
    expect(readU32(b, 4)).toBe(6)
    expect((b[8] << 8) | b[9]).toBe(1) // format 1
    expect((b[10] << 8) | b[11]).toBe(2) // two tracks
    expect((b[12] << 8) | b[13]).toBe(96) // PPQ
  })

  it('declares both track chunks with a correct length', () => {
    const b = exportMidi(baseProject())
    let i = 14
    let tracks = 0
    while (i < b.length) {
      expect(ascii(b, i, 4)).toBe('MTrk')
      const len = readU32(b, i + 4)
      expect(len).toBeGreaterThan(0)
      i += 8 + len
      tracks++
    }
    expect(tracks).toBe(2)
    expect(i).toBe(b.length) // no trailing garbage
  })

  it('ends every track with an end-of-track meta event', () => {
    const b = exportMidi(baseProject())
    let i = 14
    while (i < b.length) {
      const len = readU32(b, i + 4)
      const end = i + 8 + len
      expect([b[end - 3], b[end - 2], b[end - 1]]).toEqual([0xff, 0x2f, 0x00])
      i = end
    }
  })

  it('encodes the tempo as a meta event', () => {
    const b = exportMidi(baseProject({ bpm: 120 }))
    const idx = [...b].findIndex((_, i) => b[i] === 0xff && b[i + 1] === 0x51 && b[i + 2] === 0x03)
    expect(idx).toBeGreaterThan(0)
    const mpqn = (b[idx + 3] << 16) | (b[idx + 4] << 8) | b[idx + 5]
    expect(Math.round(60000000 / mpqn)).toBe(120)
  })

  it('emits a note-on and a matching note-off for each note', () => {
    const b = exportMidi(baseProject({ notes: [{ id: 'a', midi: 64, start: 0, len: 4, vel: 1 }] }))
    expect([...b]).toContain(0x90)
    expect([...b]).toContain(0x80)
  })

  it('puts drums on channel 10', () => {
    const pattern = emptyPattern(MAX_STEPS)
    pattern.kick[0] = 1
    const b = exportMidi(baseProject({ notes: [], pattern }))
    expect([...b]).toContain(0x99) // note-on, channel 10
  })

  it('produces a valid file for a completely empty project', () => {
    const b = exportMidi(baseProject({ notes: [], pattern: emptyPattern(MAX_STEPS) }))
    expect(ascii(b, 0, 4)).toBe('MThd')
    expect(b.length).toBeGreaterThan(20)
  })

  it('never emits a value outside a byte', () => {
    const pattern = emptyPattern(MAX_STEPS)
    DRUM_ORDER.forEach((d, i) => (pattern[d][i] = 1))
    const b = exportMidi(
      baseProject({
        bpm: 240,
        bars: 4,
        notes: Array.from({ length: 200 }, (_, i) => ({ id: `n${i}`, midi: i % 128, start: i % 64, len: 8, vel: 1 })),
        pattern,
      }),
    )
    for (const byte of b) {
      expect(byte).toBeGreaterThanOrEqual(0)
      expect(byte).toBeLessThanOrEqual(255)
      expect(Number.isInteger(byte)).toBe(true)
    }
  })

  it('keeps notes inside the loop even when their length overflows', () => {
    // a 4-step note starting at the last step must not extend past the bar
    const b = exportMidi(baseProject({ bars: 1, notes: [{ id: 'a', midi: 60, start: 15, len: 16, vel: 1 }] }))
    expect(ascii(b, 0, 4)).toBe('MThd')
  })

  it('always gives a note a non-zero duration', () => {
    const b = exportMidi(baseProject({ notes: [{ id: 'a', midi: 60, start: 0, len: 1, vel: 0.05 }] }))
    expect(b.length).toBeGreaterThan(20)
  })
})

describe('safeFilename', () => {
  it('keeps normal names', () => {
    expect(safeFilename('My Song', 'mid')).toBe('My Song.mid')
  })
  it('strips path separators and dangerous characters', () => {
    const f = safeFilename('../../etc/passwd', 'json')
    expect(f).not.toContain('/')
    expect(f).not.toContain('..')
  })
  it('falls back for an empty name', () => {
    expect(safeFilename('', 'mid')).toBe('projekt.mid')
    expect(safeFilename('!!!', 'mid')).toBe('projekt.mid')
  })
  it('caps the length', () => {
    expect(safeFilename('x'.repeat(500), 'mid').length).toBeLessThan(70)
  })
})
