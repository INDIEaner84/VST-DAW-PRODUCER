import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Boom({ fail }: { fail: boolean }): React.ReactElement {
  if (fail) throw new Error('param must be an AudioParam')
  return <p>heile Welt</p>
}

describe('ErrorBoundary', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('rendert Kinder, solange nichts kracht', () => {
    render(
      <ErrorBoundary>
        <Boom fail={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('heile Welt')).toBeTruthy()
  })

  it('zeigt statt eines weissen Bildschirms die Fehlermeldung', () => {
    render(
      <ErrorBoundary label="Studio kaputt">
        <Boom fail />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/Studio kaputt/)).toBeTruthy()
    // the actual cause must be visible, otherwise debugging is guesswork
    expect(screen.getByText(/param must be an AudioParam/)).toBeTruthy()
  })

  it('bietet einen Wiederholen-Knopf an, der wieder rendert', () => {
    function Flaky() {
      return <Boom fail={shouldFail} />
    }
    let shouldFail = true
    const { rerender } = render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/param must be an AudioParam/)).toBeTruthy()
    shouldFail = false
    fireEvent.click(screen.getByRole('button', { name: /Nochmal versuchen/ }))
    rerender(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    )
    expect(screen.getByText('heile Welt')).toBeTruthy()
  })
})
