import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installToneMock } from './test/toneMock'

vi.mock('tone', () => installToneMock())

import App from './App'
import { loadFromStorage, parseProject, serializeProject, type Project } from './audio/project'
import { emptyPattern } from './audio/drums'
import { DEFAULT_PATCH } from './audio/engine'

HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never

// capture downloads instead of hitting the real browser API
let downloads: { name: string; parts: BlobPart[]; type: string }[] = []
let lastClickedAnchor: HTMLAnchorElement | null = null
const createObjectURL = vi.fn(() => 'blob:mock')
const revokeObjectURL = vi.fn()

beforeEach(() => {
  localStorage.clear()
  downloads = []
  lastClickedAnchor = null
  vi.useFakeTimers({ shouldAdvanceTime: true })
  Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    lastClickedAnchor = this
  })
  const RealBlob = globalThis.Blob
  vi.stubGlobal(
    'Blob',
    class extends RealBlob {
      constructor(parts: BlobPart[], opts?: BlobPropertyBag) {
        super(parts, opts)
        downloads.push({ name: '', parts, type: opts?.type ?? '' })
      }
    },
  )
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const openStudio = () => {
  const utils = render(<App />)
  fireEvent.click(screen.getByText('Studio'))
  return utils
}

/** the autosave is debounced by 700 ms */
const flushAutosave = async () => {
  await act(async () => {
    vi.advanceTimersByTime(900)
  })
}

describe('project bar', () => {
  it('renders the save controls', () => {
    openStudio()
    expect(screen.getByLabelText('Projektname')).toBeTruthy()
    expect(screen.getByText('⬇ Projekt')).toBeTruthy()
    expect(screen.getByText('⬇ MIDI')).toBeTruthy()
    expect(screen.getByText('⬆ Laden')).toBeTruthy()
  })

  it('lets the user rename the project', () => {
    openStudio()
    const input = screen.getByLabelText('Projektname') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Mein Track' } })
    expect(input.value).toBe('Mein Track')
  })
})

describe('autosave', () => {
  it('persists edits to localStorage after the debounce', async () => {
    const { container } = openStudio()
    expect(loadFromStorage()).toBeNull()
    fireEvent.click(container.querySelector('.drumrow .step') as HTMLElement)
    await flushAutosave()
    const saved = loadFromStorage()
    expect(saved).not.toBeNull()
    expect(saved!.pattern.kick[0]).toBeGreaterThan(0)
  })

  it('shows a saved indicator', async () => {
    const { container } = openStudio()
    fireEvent.click(container.querySelector('.drumrow .step') as HTMLElement)
    await flushAutosave()
    expect(screen.getByText('✓ gesichert')).toBeTruthy()
  })

  it('debounces rapid edits into a single write', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    const { container } = openStudio()
    const steps = container.querySelectorAll('.drumrow .step')
    spy.mockClear()
    for (let i = 0; i < 10; i++) fireEvent.click(steps[i] as HTMLElement)
    await flushAutosave()
    const projectWrites = spy.mock.calls.filter((c) => c[0] === 'vdp.project')
    expect(projectWrites.length).toBeLessThanOrEqual(2)
  })

  it('restores the project on remount', async () => {
    const { container, unmount } = openStudio()
    fireEvent.change(screen.getByLabelText('Projektname'), { target: { value: 'Restored' } })
    fireEvent.click(container.querySelector('.roll-row .cell') as HTMLElement)
    await flushAutosave()
    unmount()

    const second = openStudio()
    expect((screen.getByLabelText('Projektname') as HTMLInputElement).value).toBe('Restored')
    expect(second.container.querySelectorAll('.note')).toHaveLength(1)
  })

  it('reports an error state when storage rejects the write', async () => {
    const { container } = openStudio()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    fireEvent.click(container.querySelector('.drumrow .step') as HTMLElement)
    await flushAutosave()
    expect(screen.getByText('⚠ nicht gespeichert')).toBeTruthy()
  })

  it('starts clean when stored data is corrupt', () => {
    localStorage.setItem('vdp.project', '{{{not json')
    const { container } = openStudio()
    expect(container.querySelectorAll('.note')).toHaveLength(0)
    expect((screen.getByLabelText('Projektname') as HTMLInputElement).value).toBe('Unbenannt')
  })
})

describe('export', () => {
  it('downloads a project file with the sanitised name', async () => {
    openStudio()
    fireEvent.change(screen.getByLabelText('Projektname'), { target: { value: 'Song/One' } })
    fireEvent.click(screen.getByText('⬇ Projekt'))
    expect(lastClickedAnchor!.download).toBe('Song One.vdp.json')
    expect(downloads.at(-1)!.type).toBe('application/json')
  })

  it('writes a project file that can be parsed back', async () => {
    const { container } = openStudio()
    fireEvent.click(container.querySelector('.roll-row .cell') as HTMLElement)
    fireEvent.click(screen.getByText('⬇ Projekt'))
    const text = downloads.at(-1)!.parts[0] as string
    const parsed = parseProject(text)
    expect(parsed).not.toBeNull()
    expect(parsed!.notes).toHaveLength(1)
  })

  it('refuses to export MIDI from an empty project', () => {
    openStudio()
    fireEvent.click(screen.getByText('⬇ MIDI'))
    expect(screen.getByText(/Nichts zu exportieren/)).toBeTruthy()
    expect(lastClickedAnchor).toBeNull()
  })

  it('exports MIDI once there is content', () => {
    const { container } = openStudio()
    fireEvent.click(container.querySelector('.roll-row .cell') as HTMLElement)
    fireEvent.click(screen.getByText('⬇ MIDI'))
    expect(lastClickedAnchor!.download).toMatch(/\.mid$/)
    expect(downloads.at(-1)!.type).toBe('audio/midi')
  })

  it('exports MIDI from drums alone', () => {
    const { container } = openStudio()
    fireEvent.click(container.querySelector('.drumrow .step') as HTMLElement)
    fireEvent.click(screen.getByText('⬇ MIDI'))
    expect(lastClickedAnchor!.download).toMatch(/\.mid$/)
  })

  it('releases the object URL afterwards', () => {
    const { container } = openStudio()
    fireEvent.click(container.querySelector('.roll-row .cell') as HTMLElement)
    fireEvent.click(screen.getByText('⬇ Projekt'))
    act(() => {
      vi.advanceTimersByTime(11_000)
    })
    expect(revokeObjectURL).toHaveBeenCalled()
  })

  it('removes the temporary anchor from the DOM', () => {
    openStudio()
    fireEvent.click(screen.getByText('⬇ Projekt'))
    expect(document.querySelectorAll('a[download]')).toHaveLength(0)
  })
})

describe('import', () => {
  const makeFile = (p: Partial<Project>) =>
    new File(
      [
        serializeProject({
          version: 1,
          name: 'Imported',
          savedAt: Date.now(),
          bpm: 140,
          bars: 1,
          keyRoot: 2,
          progIdx: 1,
          chordsOn: false,
          quantize: false,
          octave: 3,
          patch: { ...DEFAULT_PATCH, cutoff: 900 },
          notes: [{ id: 'n1', midi: 62, start: 2, len: 3, vel: 0.7 }],
          pattern: emptyPattern(64),
          ...p,
        } as Project),
      ],
      'song.vdp.json',
      { type: 'application/json' },
    )

  const upload = async (file: File) => {
    const input = screen.getByTestId('project-file') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await waitFor(() => expect(screen.queryByText(/geladen|gelesen/)).toBeTruthy())
  }

  it('loads a project file and applies every field', async () => {
    const { container } = openStudio()
    await upload(makeFile({}))
    expect((screen.getByLabelText('Projektname') as HTMLInputElement).value).toBe('Imported')
    expect((screen.getByDisplayValue('140') as HTMLInputElement).value).toBe('140')
    expect(container.querySelectorAll('.note')).toHaveLength(1)
  })

  it('shows an error for a file that is not a project', async () => {
    openStudio()
    const input = screen.getByTestId('project-file') as HTMLInputElement
    const bad = new File(['this is not json'], 'x.json', { type: 'application/json' })
    Object.defineProperty(input, 'files', { value: [bad], configurable: true })
    fireEvent.change(input)
    await waitFor(() => expect(screen.getByText(/konnte nicht gelesen werden/)).toBeTruthy())
  })

  it('does not wipe the current project when the import fails', async () => {
    const { container } = openStudio()
    fireEvent.click(container.querySelector('.roll-row .cell') as HTMLElement)
    const input = screen.getByTestId('project-file') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [new File(['nope'], 'x.json')], configurable: true })
    fireEvent.change(input)
    await waitFor(() => expect(screen.getByText(/konnte nicht gelesen werden/)).toBeTruthy())
    expect(container.querySelectorAll('.note')).toHaveLength(1)
  })

  it('sanitises a malicious file instead of trusting it', async () => {
    const { container } = openStudio()
    const evil = new File(
      [JSON.stringify({ notes: [{ midi: 9999, start: 9999, len: -5 }], bpm: 1e9, bars: 99, patch: { cutoff: 1e9 } })],
      'evil.json',
    )
    const input = screen.getByTestId('project-file') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [evil], configurable: true })
    fireEvent.change(input)
    await waitFor(() => expect(screen.queryByText(/geladen/)).toBeTruthy())
    expect(container.querySelectorAll('.note')).toHaveLength(0)
    const bpm = document.querySelector('input[type=number][max="240"]') as HTMLInputElement
    expect(Number(bpm.value)).toBeLessThanOrEqual(240)
    expect(Number(bpm.value)).toBeGreaterThanOrEqual(40)
  })
})

describe('new project', () => {
  it('clears everything after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { container } = openStudio()
    fireEvent.click(container.querySelector('.roll-row .cell') as HTMLElement)
    fireEvent.click(container.querySelector('.drumrow .step') as HTMLElement)
    await flushAutosave()
    fireEvent.click(screen.getByText('✕ Neu'))
    expect(container.querySelectorAll('.note')).toHaveLength(0)
    expect(container.querySelectorAll('.step.on')).toHaveLength(0)
  })

  it('keeps everything when the user cancels', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { container } = openStudio()
    fireEvent.click(container.querySelector('.roll-row .cell') as HTMLElement)
    fireEvent.click(screen.getByText('✕ Neu'))
    expect(container.querySelectorAll('.note')).toHaveLength(1)
  })
})

describe('regression: existing studio features still work', () => {
  it('still toggles drum steps and piano roll notes', () => {
    const { container } = openStudio()
    fireEvent.click(container.querySelector('.drumrow .step') as HTMLElement)
    expect(container.querySelectorAll('.step.on')).toHaveLength(1)
    fireEvent.click(container.querySelector('.roll-row .cell') as HTMLElement)
    expect(container.querySelectorAll('.note')).toHaveLength(1)
  })

  it('still applies euclidean patterns', () => {
    const { container } = openStudio()
    fireEvent.change(container.querySelector('.drumrow .euc') as HTMLSelectElement, { target: { value: '5' } })
    expect(container.querySelectorAll('.drumrow')[0].querySelectorAll('.step.on')).toHaveLength(5)
  })

  it('still switches chord progressions', () => {
    const { container } = openStudio()
    fireEvent.change(screen.getByDisplayValue('Pop 1-5-6-4'), { target: { value: '4' } })
    expect(container.querySelector('.chord .roman')!.textContent).toBe('i')
  })

  it('still collapses sections', () => {
    openStudio()
    fireEvent.click(screen.getByText('Piano Roll').closest('.card-head')!)
    expect(document.querySelector('.roll')).toBeNull()
  })

  it('does not disturb the ear trainer progress keys', async () => {
    localStorage.setItem('vdp.unlocked', '7')
    const { container } = openStudio()
    fireEvent.click(container.querySelector('.drumrow .step') as HTMLElement)
    await flushAutosave()
    expect(localStorage.getItem('vdp.unlocked')).toBe('7')
  })

  it('keeps bar changes consistent with the drum grid', () => {
    const { container } = openStudio()
    fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '4' } })
    expect(container.querySelectorAll('.drumrow')[0].querySelectorAll('.step')).toHaveLength(64)
  })
})
