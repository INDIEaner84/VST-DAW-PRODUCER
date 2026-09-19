import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PATCH } from '../audio/engine'
import { LEVELS, PARAM_SPECS, type ParamId } from '../audio/levels'
import { MODULES } from './modules'
import { SynthPanel } from './SynthPanel'

vi.mock('./Scope', () => ({ Scope: () => <div data-testid="scope" /> }))

const ALL = new Set(Object.keys(PARAM_SPECS) as ParamId[])

function unlockedThrough(levelId: number) {
  const s = new Set<ParamId>()
  for (const l of LEVELS) if (l.id <= levelId) l.params.forEach((p) => s.add(p))
  return s
}

describe('module layout', () => {
  it('shows every knob exactly once across all modules', () => {
    const listed = MODULES.flatMap((m) => m.params)
    expect(new Set(listed).size).toBe(listed.length)
    expect([...listed].sort()).toEqual([...ALL].sort())
  })
})

describe('SynthPanel', () => {
  it('renders all modules regardless of what is unlocked', () => {
    render(<SynthPanel patch={DEFAULT_PATCH} available={new Set()} onChange={() => {}} />)
    for (const m of MODULES) expect(screen.getByText(m.name)).toBeTruthy()
  })

  it('locks every knob when nothing is available', () => {
    const { container } = render(<SynthPanel patch={DEFAULT_PATCH} available={new Set()} onChange={() => {}} />)
    expect(container.querySelectorAll('.knob-wrap:not(.locked)')).toHaveLength(0)
    expect(container.querySelectorAll('.module-locked').length).toBe(MODULES.length)
  })

  it('unlocks exactly the available knobs', () => {
    const avail = unlockedThrough(1) // level 1 teaches the waveform switch only
    const { container } = render(<SynthPanel patch={DEFAULT_PATCH} available={avail} onChange={() => {}} />)
    const openKnobs = container.querySelectorAll('.knob-wrap:not(.locked)')
    const openSwitches = container.querySelectorAll('.switch-wrap:not(.locked)')
    expect(openKnobs.length + openSwitches.length).toBe(avail.size)
  })

  it('grows monotonically: later levels never unlock fewer knobs', () => {
    let prev = 0
    for (const l of LEVELS) {
      const n = unlockedThrough(l.id).size
      expect(n, `level ${l.id}`).toBeGreaterThanOrEqual(prev)
      prev = n
    }
    expect(prev).toBe(ALL.size)
  })

  it('opens every knob in the studio configuration', () => {
    const { container } = render(<SynthPanel patch={DEFAULT_PATCH} available={ALL} onChange={() => {}} />)
    expect(container.querySelectorAll('.locked')).toHaveLength(0)
  })

  it('applies correctness state only where given', () => {
    const { container } = render(
      <SynthPanel patch={DEFAULT_PATCH} available={ALL} onChange={() => {}} states={{ cutoff: 'ok', attack: 'off' }} />,
    )
    expect(container.querySelectorAll('.knob-wrap.ok')).toHaveLength(1)
    expect(container.querySelectorAll('.knob-wrap.off')).toHaveLength(1)
  })
})

describe('SynthPanel: Kompaktmodus', () => {
  it('blendet gesperrte Regler komplett aus statt sie auszugrauen', () => {
    const avail = unlockedThrough(1) // Level 1: nur der Wellenform-Schalter
    const { container } = render(
      <SynthPanel patch={DEFAULT_PATCH} available={avail} compact onChange={() => {}} />,
    )
    // kein einziges gesperrtes Element bleibt uebrig
    expect(container.querySelectorAll('.locked')).toHaveLength(0)
    // und genau so viele Bedienelemente wie freigeschaltete Parameter
    const controls = container.querySelectorAll('.knob-wrap, .switch-wrap')
    expect(controls).toHaveLength(avail.size)
  })

  it('zeigt nur Module, die mindestens einen freien Regler haben', () => {
    const avail = unlockedThrough(1)
    const { container } = render(
      <SynthPanel patch={DEFAULT_PATCH} available={avail} compact onChange={() => {}} />,
    )
    const expected = MODULES.filter((m) => m.params.some((p) => avail.has(p)))
    expect(container.querySelectorAll('.module')).toHaveLength(expected.length)
    expect(expected.length).toBeLessThan(MODULES.length)
  })

  it('waechst mit dem Level mit', () => {
    const counts = [1, 10, 31].map((lvl) => {
      const avail = unlockedThrough(lvl)
      const { container, unmount } = render(
        <SynthPanel patch={DEFAULT_PATCH} available={avail} compact onChange={() => {}} />,
      )
      const n = container.querySelectorAll('.knob-wrap, .switch-wrap').length
      unmount()
      return n
    })
    expect(counts[0]).toBeLessThan(counts[1])
    expect(counts[1]).toBeLessThan(counts[2])
  })

  it('zeigt im Normalmodus weiterhin das gesamte Panel', () => {
    const avail = unlockedThrough(1)
    const { container } = render(
      <SynthPanel patch={DEFAULT_PATCH} available={avail} onChange={() => {}} />,
    )
    expect(container.querySelectorAll('.module')).toHaveLength(MODULES.length)
    expect(container.querySelectorAll('.locked').length).toBeGreaterThan(0)
  })
})
