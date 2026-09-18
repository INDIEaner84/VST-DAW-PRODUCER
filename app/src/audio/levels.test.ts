import { describe, expect, it } from 'vitest'
import { DEFAULT_PATCH, type PatchParams } from './engine'
import { LEVELS, PARAM_SPECS, gradedParams, randomTarget, scoreGuess, type ParamId } from './levels'
import { PRESETS, PRESET_BY_KEY } from './presets'

const ALL = Object.keys(PARAM_SPECS) as ParamId[]

describe('parameter specs', () => {
  it('covers every patch parameter exactly once', () => {
    expect(new Set(ALL).size).toBe(ALL.length)
    for (const k of Object.keys(DEFAULT_PATCH)) expect(PARAM_SPECS[k as ParamId]).toBeDefined()
  })

  it('has a sane range for every numeric param', () => {
    for (const id of ALL) {
      const s = PARAM_SPECS[id]
      if (s.kind !== 'range') continue
      expect(s.min).toBeLessThan(s.max!)
      if (s.log) expect(s.min).toBeGreaterThan(0) // log(0) is -Infinity
    }
  })

  it('keeps every default value inside its declared range', () => {
    for (const id of ALL) {
      const s = PARAM_SPECS[id]
      const v = DEFAULT_PATCH[id]
      if (s.kind === 'choice') expect(s.choices).toContain(v as string)
      else {
        expect(v as number).toBeGreaterThanOrEqual(s.min!)
        expect(v as number).toBeLessThanOrEqual(s.max!)
      }
    }
  })
})

describe('level structure', () => {
  it('uses unique, gap-free, ascending ids', () => {
    const ids = LEVELS.map((l) => l.id)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
    expect(new Set(ids).size).toBe(ids.length)
    ids.forEach((id, i) => expect(id).toBe(i + 1))
  })

  it('only references known parameters', () => {
    for (const l of LEVELS) for (const p of l.params) expect(PARAM_SPECS[p], `L${l.id}:${p}`).toBeDefined()
  })

  it('never removes a parameter that an earlier level taught', () => {
    // the panel unlocks cumulatively, so difficulty must not go backwards
    const seen = new Set<ParamId>()
    for (const l of LEVELS) {
      l.params.forEach((p) => seen.add(p))
      expect(seen.size).toBeGreaterThanOrEqual(l.params.length)
    }
  })

  it('introduces a new parameter unless the level is flagged as review', () => {
    const seen = new Set<ParamId>()
    const offenders: number[] = []
    for (const l of LEVELS) {
      const fresh = l.params.filter((p) => !seen.has(p))
      // preset + mastery levels legitimately reuse knobs
      if (fresh.length === 0 && !l.review && !l.presetKey && l.id <= 22) offenders.push(l.id)
      l.params.forEach((p) => seen.add(p))
    }
    expect(offenders).toEqual([])
  })

  it('marks review levels honestly (they really add nothing new)', () => {
    const seen = new Set<ParamId>()
    for (const l of LEVELS) {
      const fresh = l.params.filter((p) => !seen.has(p))
      if (l.review) expect(fresh, `L${l.id} is flagged review but adds ${fresh}`).toEqual([])
      l.params.forEach((p) => seen.add(p))
    }
  })

  it('eventually unlocks every knob', () => {
    const seen = new Set<ParamId>()
    LEVELS.forEach((l) => l.params.forEach((p) => seen.add(p)))
    expect([...seen].sort()).toEqual([...ALL].sort())
  })
})

describe('target generation', () => {
  it('produces in-range, finite values for every level', () => {
    for (const l of LEVELS)
      for (let i = 0; i < 200; i++) {
        const t = randomTarget(l)
        for (const id of ALL) {
          const s = PARAM_SPECS[id]
          const v = t[id]
          if (s.kind === 'choice') expect(s.choices).toContain(v as string)
          else {
            expect(Number.isFinite(v as number), `L${l.id} ${id}=${v}`).toBe(true)
            expect(v as number, `L${l.id} ${id}`).toBeGreaterThanOrEqual(s.min!)
            expect(v as number, `L${l.id} ${id}`).toBeLessThanOrEqual(s.max!)
          }
        }
      }
  })

  it('is always solvable: the target itself scores a pass', () => {
    for (const l of LEVELS)
      for (let i = 0; i < 200; i++) {
        const t = randomTarget(l)
        const r = scoreGuess(l, t, t)
        expect(r.passed, `L${l.id} unsolvable`).toBe(true)
        expect(r.percent).toBe(100)
        expect(r.details.every((d) => Number.isFinite(d.score))).toBe(true)
      }
  })

  it('returns the exact preset patch for legend levels', () => {
    for (const l of LEVELS.filter((x) => x.presetKey))
      expect(randomTarget(l)).toEqual(PRESET_BY_KEY[l.presetKey!].patch)
  })

  it('actually varies random targets', () => {
    const l = LEVELS.find((x) => x.id === 2)!
    const vals = new Set(Array.from({ length: 40 }, () => randomTarget(l).cutoff))
    expect(vals.size).toBeGreaterThan(5)
  })
})

describe('grading', () => {
  const l10 = LEVELS.find((x) => x.id === 10)!

  it('hides parameters that are inaudible for the given target', () => {
    const silent: PatchParams = { ...DEFAULT_PATCH, noiseLevel: 0, delay: 0, filterEnvAmount: 0 }
    const lvl = { ...LEVELS[LEVELS.length - 1] }
    const g = gradedParams(lvl, silent)
    expect(g).not.toContain('noiseType')
    expect(g).not.toContain('delayTime')
    expect(g).not.toContain('fDecay')
  })

  it('grades noise type once noise is audible', () => {
    const loud: PatchParams = { ...DEFAULT_PATCH, noiseLevel: 0.8 }
    expect(gradedParams(LEVELS[LEVELS.length - 1], loud)).toContain('noiseType')
  })

  it('fails a wildly wrong guess', () => {
    const t: PatchParams = { ...DEFAULT_PATCH, cutoff: 200, osc: 'sine', detune: -40, subLevel: 0 }
    const g: PatchParams = { ...DEFAULT_PATCH, cutoff: 15000, osc: 'square', detune: 45, subLevel: 1 }
    const r = scoreGuess(l10, t, g)
    expect(r.passed).toBe(false)
    expect(r.percent).toBeLessThan(50)
  })

  it('scores between 0 and 100 for arbitrary guesses', () => {
    for (const l of LEVELS)
      for (let i = 0; i < 30; i++) {
        const r = scoreGuess(l, randomTarget(l), randomTarget(l))
        expect(r.percent).toBeGreaterThanOrEqual(0)
        expect(r.percent).toBeLessThanOrEqual(100)
      }
  })

  it('treats log params symmetrically (an octave off is an octave off)', () => {
    const l = LEVELS.find((x) => x.id === 2)!
    const t: PatchParams = { ...DEFAULT_PATCH, cutoff: 1000 }
    const up = scoreGuess(l, t, { ...t, cutoff: 2000 })
    const down = scoreGuess(l, t, { ...t, cutoff: 500 })
    const upC = up.details.find((d) => d.id === 'cutoff')!.score
    const downC = down.details.find((d) => d.id === 'cutoff')!.score
    expect(Math.abs(upC - downC)).toBeLessThan(0.01)
  })
})

describe('presets', () => {
  it('has unique keys and names', () => {
    expect(new Set(PRESETS.map((p) => p.key)).size).toBe(PRESETS.length)
    expect(new Set(PRESETS.map((p) => p.name)).size).toBe(PRESETS.length)
  })

  it('keeps every preset value inside its knob range', () => {
    for (const pre of PRESETS)
      for (const id of ALL) {
        const s = PARAM_SPECS[id]
        const v = pre.patch[id]
        if (s.kind === 'choice') expect(s.choices, `${pre.key}.${id}`).toContain(v as string)
        else {
          expect(v as number, `${pre.key}.${id}`).toBeGreaterThanOrEqual(s.min!)
          expect(v as number, `${pre.key}.${id}`).toBeLessThanOrEqual(s.max!)
        }
      }
  })

  it('differs audibly from the default patch', () => {
    for (const pre of PRESETS) {
      const diff = ALL.filter((id) => pre.patch[id] !== DEFAULT_PATCH[id])
      expect(diff.length, pre.key).toBeGreaterThan(4)
    }
  })
})
