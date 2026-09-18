import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installToneMock } from './test/toneMock'

vi.mock('tone', () => installToneMock())

import App from './App'
import { LEVELS } from './audio/levels'

// jsdom has no canvas 2d context
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never

describe('App smoke test', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders without crashing and starts on the trainer', () => {
    render(<App />)
    expect(screen.getByText('VST DAW PRODUCER')).toBeTruthy()
    expect(screen.getByText(/Level 1 ·/)).toBeTruthy()
  })

  it('shows the synth panel with a locked and an unlocked control', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.synth')).toBeTruthy()
    expect(container.querySelectorAll('.locked').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('.knob-wrap:not(.locked), .switch-wrap:not(.locked)').length).toBeGreaterThan(0)
  })

  it('keeps the level drawer closed until asked', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.drawer.open')).toBeNull()
    fireEvent.click(screen.getByTitle('Level wählen'))
    expect(container.querySelector('.drawer.open')).toBeTruthy()
  })

  it('lists every level in the drawer, with later ones locked', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByTitle('Level wählen'))
    const drawer = container.querySelector('.drawer')!
    expect(drawer.querySelectorAll('.level-btn')).toHaveLength(LEVELS.length)
    expect(drawer.querySelectorAll('.level-btn.locked').length).toBe(LEVELS.length - 1)
  })

  it('closes the drawer with Escape', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByTitle('Level wählen'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(container.querySelector('.drawer.open')).toBeNull()
  })

  it('toggles the lesson text', () => {
    render(<App />)
    expect(screen.queryByText(LEVELS[0].lesson)).toBeNull()
    fireEvent.click(screen.getByTitle('Lektion'))
    expect(screen.getByText(LEVELS[0].lesson)).toBeTruthy()
  })

  it('grades a guess and reports a percentage', () => {
    render(<App />)
    fireEvent.click(screen.getByText('✓ Prüfen'))
    expect(screen.getByText(/% Treffer/)).toBeTruthy()
  })

  it('shows the solution but refuses to count it as passed', () => {
    render(<App />)
    fireEvent.click(screen.getByText('👁 Lösung zeigen'))
    expect(screen.getByText('👁 Lösung')).toBeTruthy()
    expect(screen.getByText('zählt nicht als bestanden')).toBeTruthy()
    expect(screen.queryByText('Nächstes Level →')).toBeNull()
    expect(localStorage.getItem('vdp.unlocked')).toBeNull()
  })

  it('does not award stars for a checked answer that was revealed first', () => {
    render(<App />)
    fireEvent.click(screen.getByText('👁 Lösung zeigen'))
    fireEvent.click(screen.getByText('✓ Prüfen'))
    expect(localStorage.getItem('vdp.stars')).toBeNull()
    expect(localStorage.getItem('vdp.unlocked')).toBeNull()
  })

  it('unlocks the next level when solved honestly', () => {
    render(<App />)
    // level 1 only grades the waveform: try each until one passes
    for (const w of ['sawtooth', 'square', 'triangle', 'sine']) {
      fireEvent.click(screen.getByTitle(w))
      fireEvent.click(screen.getByText('✓ Prüfen'))
      if (screen.queryByText(/Geschafft/)) break
    }
    expect(screen.getByText(/Geschafft/)).toBeTruthy()
    expect(Number(localStorage.getItem('vdp.unlocked'))).toBe(2)
  })

  it('advances to level 2 and unlocks more knobs', () => {
    const { container } = render(<App />)
    const before = container.querySelectorAll('.knob-wrap:not(.locked), .switch-wrap:not(.locked)').length
    for (const w of ['sawtooth', 'square', 'triangle', 'sine']) {
      fireEvent.click(screen.getByTitle(w))
      fireEvent.click(screen.getByText('✓ Prüfen'))
      if (screen.queryByText('Nächstes Level →')) break
    }
    fireEvent.click(screen.getByText('Nächstes Level →'))
    expect(screen.getByText(/Level 2 ·/)).toBeTruthy()
    const after = container.querySelectorAll('.knob-wrap:not(.locked), .switch-wrap:not(.locked)').length
    expect(after).toBeGreaterThan(before)
  })

  it('restores progress from localStorage', () => {
    localStorage.setItem('vdp.unlocked', '5')
    localStorage.setItem('vdp.stars', JSON.stringify({ 1: 3, 2: 2 }))
    const { container } = render(<App />)
    fireEvent.click(screen.getByTitle('Level wählen'))
    const drawer = container.querySelector('.drawer')!
    expect(drawer.querySelectorAll('.level-btn.locked').length).toBe(LEVELS.length - 5)
  })

  it('plays the target sound without throwing', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('Zielsound').closest('button')!)
    expect(screen.getByText('Zielsound')).toBeTruthy()
  })

  it('switches to the studio and back', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    expect(screen.getByText('Akkord-Baukasten')).toBeTruthy()
    fireEvent.click(screen.getByText('Ear Trainer'))
    expect(screen.getByText(/Level 1 ·/)).toBeTruthy()
  })
})

describe('Studio', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  const openStudio = () => {
    const utils = render(<App />)
    fireEvent.click(screen.getByText('Studio'))
    return utils
  }

  it('renders the transport, chords and drum machine', () => {
    openStudio()
    expect(screen.getByText('▶ Play')).toBeTruthy()
    expect(screen.getByText('Akkord-Baukasten')).toBeTruthy()
    expect(screen.getByText('Drum Machine')).toBeTruthy()
  })

  it('shows the chords of the selected progression', () => {
    const { container } = openStudio()
    const chords = container.querySelectorAll('.chord')
    expect(chords.length).toBeGreaterThan(3)
    expect(within(chords[0] as HTMLElement).getByText('I')).toBeTruthy()
  })

  it('switches progression and updates the chord buttons', () => {
    const { container } = openStudio()
    const select = screen.getByDisplayValue('Pop 1-5-6-4') as HTMLSelectElement
    fireEvent.change(select, { target: { value: '4' } }) // La Folia
    const romans = [...container.querySelectorAll('.chord .roman')].map((e) => e.textContent)
    expect(romans[0]).toBe('i')
  })

  it('collapses and expands a section', () => {
    openStudio()
    const head = screen.getByText('Piano Roll').closest('.card-head')!
    expect(document.querySelector('.roll')).toBeTruthy()
    fireEvent.click(head)
    expect(document.querySelector('.roll')).toBeNull()
  })

  it('starts the MIDI section collapsed', () => {
    openStudio()
    expect(screen.getByText('MIDI-Controller')).toBeTruthy()
    expect(screen.queryByText('MIDI verbinden')).toBeNull()
  })

  it('toggles a drum step on and off', () => {
    const { container } = openStudio()
    const step = container.querySelector('.drumrow .step') as HTMLElement
    expect(step.classList.contains('on')).toBe(false)
    fireEvent.click(step)
    expect((container.querySelector('.drumrow .step') as HTMLElement).classList.contains('on')).toBe(true)
    fireEvent.click(container.querySelector('.drumrow .step') as HTMLElement)
    expect((container.querySelector('.drumrow .step') as HTMLElement).classList.contains('on')).toBe(false)
  })

  it('loads a drum preset', () => {
    const { container } = openStudio()
    const before = container.querySelectorAll('.step.on').length
    fireEvent.change(screen.getByText('Preset laden…').closest('select')!, { target: { value: '0' } })
    expect(container.querySelectorAll('.step.on').length).toBeGreaterThan(before)
  })

  it('applies a euclidean pattern with the requested pulse count', () => {
    const { container } = openStudio()
    const euc = container.querySelector('.drumrow .euc') as HTMLSelectElement
    fireEvent.change(euc, { target: { value: '5' } })
    const firstRowOn = container.querySelectorAll('.drumrow')[0].querySelectorAll('.step.on')
    expect(firstRowOn).toHaveLength(5)
  })

  it('clears all drum steps', () => {
    const { container } = openStudio()
    fireEvent.change(screen.getByText('Preset laden…').closest('select')!, { target: { value: '0' } })
    fireEvent.click(screen.getByText('Clear'))
    expect(container.querySelectorAll('.step.on')).toHaveLength(0)
  })

  it('adds and removes a note in the piano roll', () => {
    const { container } = openStudio()
    expect(container.querySelectorAll('.note')).toHaveLength(0)
    fireEvent.click(container.querySelector('.roll-row .cell') as HTMLElement)
    expect(container.querySelectorAll('.note')).toHaveLength(1)
    fireEvent.click(container.querySelector('.note') as HTMLElement)
    expect(container.querySelectorAll('.note')).toHaveLength(0)
  })

  it('keeps euclid within the bar when the bar count changes', () => {
    const { container } = openStudio()
    fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '1' } })
    const euc = container.querySelector('.drumrow .euc') as HTMLSelectElement
    fireEvent.change(euc, { target: { value: '4' } })
    expect(container.querySelectorAll('.drumrow')[0].querySelectorAll('.step')).toHaveLength(16)
    expect(container.querySelectorAll('.drumrow')[0].querySelectorAll('.step.on')).toHaveLength(4)
  })
})
