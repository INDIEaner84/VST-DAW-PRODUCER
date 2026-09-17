import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PARAM_SPECS } from '../audio/levels'
import { Knob, Switch } from './Knob'

describe('Knob', () => {
  const spec = PARAM_SPECS.cutoff // log scale, 80..16000

  it('renders label and value', () => {
    render(<Knob spec={spec} value={1000} onChange={() => {}} />)
    expect(screen.getByText('Cutoff')).toBeTruthy()
    expect(screen.getByText(/1000/)).toBeTruthy()
  })

  it('exposes the value to assistive tech', () => {
    render(<Knob spec={spec} value={1000} onChange={() => {}} />)
    expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('1000')
  })

  it('increases on arrow up and decreases on arrow down', () => {
    const onChange = vi.fn()
    render(<Knob spec={spec} value={1000} onChange={onChange} />)
    const k = screen.getByRole('slider')
    fireEvent.keyDown(k, { key: 'ArrowUp' })
    expect(onChange.mock.calls[0][0]).toBeGreaterThan(1000)
    onChange.mockClear()
    fireEvent.keyDown(k, { key: 'ArrowDown' })
    expect(onChange.mock.calls[0][0]).toBeLessThan(1000)
  })

  it('never emits a value outside the range', () => {
    const onChange = vi.fn()
    const { rerender } = render(<Knob spec={spec} value={spec.max!} onChange={onChange} />)
    const k = screen.getByRole('slider')
    for (let i = 0; i < 40; i++) fireEvent.keyDown(k, { key: 'ArrowUp' })
    rerender(<Knob spec={spec} value={spec.min!} onChange={onChange} />)
    for (let i = 0; i < 40; i++) fireEvent.keyDown(k, { key: 'ArrowDown' })
    for (const [v] of onChange.mock.calls) {
      expect(v).toBeGreaterThanOrEqual(spec.min!)
      expect(v).toBeLessThanOrEqual(spec.max!)
      expect(Number.isFinite(v)).toBe(true)
    }
  })

  it('ignores all input when locked', () => {
    const onChange = vi.fn()
    render(<Knob spec={spec} value={1000} onChange={onChange} locked />)
    const k = screen.getByRole('slider')
    fireEvent.keyDown(k, { key: 'ArrowUp' })
    fireEvent.wheel(k, { deltaY: -100 })
    fireEvent.mouseDown(k, { clientY: 100 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('hides the value and shows a lock when locked', () => {
    render(<Knob spec={spec} value={1000} onChange={() => {}} locked />)
    expect(screen.getByText('—')).toBeTruthy()
    expect(screen.queryByText(/1000/)).toBeNull()
  })

  it('marks correct and incorrect state for feedback', () => {
    const { container, rerender } = render(<Knob spec={spec} value={1000} onChange={() => {}} state="ok" />)
    expect(container.querySelector('.knob-wrap.ok')).toBeTruthy()
    rerender(<Knob spec={spec} value={1000} onChange={() => {}} state="off" />)
    expect(container.querySelector('.knob-wrap.off')).toBeTruthy()
  })

  it('handles a linear param with a tiny minimum without hitting zero', () => {
    const onChange = vi.fn()
    render(<Knob spec={PARAM_SPECS.attack} value={0.001} onChange={onChange} />)
    const k = screen.getByRole('slider')
    for (let i = 0; i < 10; i++) fireEvent.keyDown(k, { key: 'ArrowDown' })
    for (const [v] of onChange.mock.calls) expect(v).toBeGreaterThanOrEqual(PARAM_SPECS.attack.min!)
  })
})

describe('Switch', () => {
  const spec = PARAM_SPECS.osc

  it('renders every choice and marks the active one', () => {
    const { container } = render(<Switch spec={spec} value="square" onChange={() => {}} />)
    expect(container.querySelectorAll('.sw')).toHaveLength(spec.choices!.length)
    expect(container.querySelector('.sw.active')!.textContent).toBe('square')
  })

  it('emits the chosen value', () => {
    const onChange = vi.fn()
    render(<Switch spec={spec} value="square" onChange={onChange} />)
    fireEvent.click(screen.getByText('triangle'))
    expect(onChange).toHaveBeenCalledWith('triangle')
  })

  it('is inert when locked', () => {
    const onChange = vi.fn()
    render(<Switch spec={spec} value="square" onChange={onChange} locked />)
    fireEvent.click(screen.getByText('triangle'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
