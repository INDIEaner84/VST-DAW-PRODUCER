import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Knob } from './Knob'
import type { ParamSpec } from '../audio/levels'

const spec = { key: 'cutoff', label: 'Cutoff', min: 0, max: 100, unit: 'Hz' } as unknown as ParamSpec

describe('Knob: Tastatur- und Touch-Bedienung', () => {
  it('unterstuetzt Pfeile, Shift-Feinschritt, PageUp und Home/End', () => {
    const calls: number[] = []
    render(<Knob spec={spec} value={50} onChange={(v) => calls.push(v)} />)
    const k = screen.getByRole('slider')
    fireEvent.keyDown(k, { key: 'ArrowUp' })
    fireEvent.keyDown(k, { key: 'ArrowUp', shiftKey: true })
    fireEvent.keyDown(k, { key: 'PageUp' })
    fireEvent.keyDown(k, { key: 'Home' })
    fireEvent.keyDown(k, { key: 'End' })
    expect(calls).toEqual([52, 50.5, 60, 0, 100])
  })

  it('exponiert einen vollstaendigen Slider-Kontrakt fuer Screenreader', () => {
    render(<Knob spec={spec} value={50} onChange={() => {}} />)
    const k = screen.getByRole('slider')
    expect(k.getAttribute('aria-valuemin')).toBe('0')
    expect(k.getAttribute('aria-valuemax')).toBe('100')
    expect(k.getAttribute('aria-valuenow')).toBe('50')
    expect(k.getAttribute('aria-valuetext')).toBe('50.0Hz')
    expect(k.getAttribute('tabindex')).toBe('0')
  })

  it('laesst sich per Pointer ziehen, also auch per Touch', () => {
    const onChange = vi.fn()
    render(<Knob spec={spec} value={50} onChange={onChange} />)
    const k = screen.getByRole('slider')
    fireEvent.pointerDown(k, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(window, { clientY: 64, pointerId: 1 })
    // 36px nach oben bei speed 180 => +20% des Bereichs
    expect(onChange).toHaveBeenCalledWith(70)
  })

  it('ignoriert Bedienung, wenn der Regler gesperrt ist', () => {
    const onChange = vi.fn()
    render(<Knob spec={spec} value={50} onChange={onChange} locked />)
    const k = screen.getByRole('slider')
    expect(k.getAttribute('tabindex')).toBe('-1')
    fireEvent.keyDown(k, { key: 'ArrowUp' })
    fireEvent.pointerDown(k, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(window, { clientY: 60, pointerId: 1 })
    expect(onChange).not.toHaveBeenCalled()
  })
})
