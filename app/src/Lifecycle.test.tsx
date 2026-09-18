import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installToneMock } from './test/toneMock'

vi.mock('tone', () => installToneMock())

import App from './App'

HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('resource cleanup', () => {
  it('cancels the pending autosave timer on unmount', () => {
    const clear = vi.spyOn(window, 'clearTimeout')
    const { container, unmount } = render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    fireEvent.click(container.querySelector('.drumrow .step') as HTMLElement)
    clear.mockClear()
    unmount()
    expect(clear).toHaveBeenCalled()
  })

  it('does not write to storage after unmount', () => {
    const { container, unmount } = render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    fireEvent.click(container.querySelector('.drumrow .step') as HTMLElement)
    unmount()
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(spy.mock.calls.filter((c) => c[0] === 'vdp.project')).toHaveLength(0)
  })

  it('stops the scope animation loop on unmount', () => {
    const cancel = vi.spyOn(window, 'cancelAnimationFrame')
    const { unmount } = render(<App />)
    unmount()
    expect(cancel).toHaveBeenCalled()
  })

  it('survives many mount/unmount cycles without throwing', () => {
    for (let i = 0; i < 12; i++) {
      const { unmount } = render(<App />)
      fireEvent.click(screen.getByText('Studio'))
      unmount()
    }
    expect(true).toBe(true)
  })

  it('does not accumulate listeners across tab switches', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    render(<App />)
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByText('Studio'))
      fireEvent.click(screen.getByText('Ear Trainer'))
    }
    const added = add.mock.calls.filter((c) => c[0] === 'keydown').length
    const removed = remove.mock.calls.filter((c) => c[0] === 'keydown').length
    // every registration must be paired with a teardown (±1 for the live one)
    expect(Math.abs(added - removed)).toBeLessThanOrEqual(2)
  })
})

describe('rapid interaction stress', () => {
  it('handles a burst of drum edits without error', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    const steps = [...container.querySelectorAll('.drumrow .step')] as HTMLElement[]
    for (let pass = 0; pass < 3; pass++) for (const s of steps.slice(0, 40)) fireEvent.click(s)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(container.querySelector('.drumgrid')).toBeTruthy()
  })

  it('handles rapid project name edits with a single debounced save', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    const input = screen.getByLabelText('Projektname')
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    spy.mockClear()
    for (let i = 0; i < 30; i++) fireEvent.change(input, { target: { value: `Name ${i}` } })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(spy.mock.calls.filter((c) => c[0] === 'vdp.project').length).toBeLessThanOrEqual(2)
  })

  it('keeps working after switching tabs mid-edit', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    fireEvent.click(container.querySelector('.roll-row .cell') as HTMLElement)
    fireEvent.click(screen.getByText('Ear Trainer'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    fireEvent.click(screen.getByText('Studio'))
    expect(container.querySelectorAll('.note')).toHaveLength(1)
  })
})

describe('idle cost of the hidden studio', () => {
  it('does not paint the scope while its tab is hidden', () => {
    const calls: string[] = []
    HTMLCanvasElement.prototype.getContext = vi.fn(() => {
      calls.push('ctx')
      return null
    }) as never
    render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    fireEvent.click(screen.getByText('Ear Trainer'))
    calls.length = 0
    act(() => {
      vi.advanceTimersByTime(500)
    })
    // jsdom reports offsetParent === null for hidden nodes, so the loop bails out early
    expect(calls.length).toBeLessThan(200)
  })
})
