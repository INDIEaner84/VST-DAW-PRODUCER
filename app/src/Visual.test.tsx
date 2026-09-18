import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installToneMock } from './test/toneMock'

vi.mock('tone', () => installToneMock())

import App from './App'
import { MODULES } from './components/modules'

HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never

beforeEach(() => localStorage.clear())

describe('tab visibility', () => {
  it('shows only one panel at a time', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    const panes = [...container.querySelectorAll('.app > div[hidden], .app > div:not([hidden])')].filter(
      (d) => d.querySelector('.studio, .trainer'),
    )
    const visible = panes.filter((d) => !d.hasAttribute('hidden'))
    expect(visible).toHaveLength(1)
    expect(visible[0].querySelector('.studio')).toBeTruthy()
  })

  it('hides the studio rather than destroying it when switching back', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    fireEvent.click(screen.getByText('Ear Trainer'))
    const studioPane = container.querySelector('.studio')!.closest('div[hidden]')
    expect(studioPane).toBeTruthy() // still in the DOM, just hidden
  })

  it('marks the active tab button', () => {
    render(<App />)
    expect(screen.getByText('Ear Trainer').className).toContain('active')
    fireEvent.click(screen.getByText('Studio'))
    expect(screen.getByText('Studio').className).toContain('active')
    expect(screen.getByText('Ear Trainer').className).not.toContain('active')
  })
})

describe('project bar layout', () => {
  const openStudio = () => {
    const u = render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    return u
  }

  it('renders above the transport bar', () => {
    const { container } = openStudio()
    const studio = container.querySelector('.studio')!
    const pb = studio.querySelector('.projectbar')!
    const tb = studio.querySelector('.topbar')!
    expect(pb.compareDocumentPosition(tb) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps all four actions reachable', () => {
    const { container } = openStudio()
    const actions = container.querySelectorAll('.pb-actions .transport')
    expect(actions).toHaveLength(4)
    for (const a of actions) expect((a as HTMLButtonElement).disabled).toBe(false)
  })

  it('keeps the hidden file input out of the layout', () => {
    openStudio()
    const input = screen.getByTestId('project-file') as HTMLInputElement
    expect(input.style.display).toBe('none')
    expect(input.type).toBe('file')
  })

  it('reflects the save state in a class for styling', () => {
    const { container } = openStudio()
    expect(container.querySelector('.pb-state')).toBeTruthy()
    expect(container.querySelector('.pb-idle, .pb-saved, .pb-error')).toBeTruthy()
  })

  it('announces the toast politely for screen readers', () => {
    openStudio()
    fireEvent.click(screen.getByText('⬇ MIDI')) // empty project -> toast
    const toast = screen.getByRole('status')
    expect(toast.className).toContain('toast')
  })
})

describe('synth panel rendering', () => {
  it('lays out every module in the studio with all knobs unlocked', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    fireEvent.click(screen.getByText('Sound Design').closest('.card-head')!)
    const studio = container.querySelector('.studio')!
    expect(studio.querySelectorAll('.module')).toHaveLength(MODULES.length)
    expect(studio.querySelectorAll('.knob-wrap.locked')).toHaveLength(0)
  })

  it('shows locked knobs with a lock indicator in the trainer', () => {
    const { container } = render(<App />)
    const trainer = container.querySelector('.trainer')!
    const locked = trainer.querySelectorAll('.knob-wrap.locked')
    expect(locked.length).toBeGreaterThan(0)
    expect(trainer.querySelectorAll('.knob-lock').length).toBeGreaterThan(0)
  })

  it('renders the scope only once per panel', () => {
    const { container } = render(<App />)
    expect(container.querySelectorAll('.trainer .scope')).toHaveLength(1)
  })
})

describe('interaction states', () => {
  it('collapsible headers expose their expanded state', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    const head = screen.getByText('Piano Roll').closest('.card-head')!
    expect(head.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(head)
    expect(head.getAttribute('aria-expanded')).toBe('false')
  })

  it('supports keyboard toggling of sections', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    const head = screen.getByText('Piano Roll').closest('.card-head')!
    fireEvent.keyDown(head, { key: 'Enter' })
    expect(head.getAttribute('aria-expanded')).toBe('false')
  })

  it('highlights the transport when playing', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    const play = screen.getByText('▶ Play')
    expect(play.className).not.toContain('on')
  })
})
