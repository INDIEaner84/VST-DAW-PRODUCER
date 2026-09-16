import { useCallback, useEffect, useRef, useState } from 'react'

export type MidiEvent =
  | { type: 'noteon'; note: number; velocity: number }
  | { type: 'noteoff'; note: number }
  | { type: 'cc'; controller: number; value: number }

export type MidiDevice = { id: string; name: string }

export function useMidi(onEvent: (e: MidiEvent) => void) {
  const [devices, setDevices] = useState<MidiDevice[]>([])
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cb = useRef(onEvent)
  cb.current = onEvent

  const connect = useCallback(async () => {
    const nav = navigator as Navigator & { requestMIDIAccess?: (o?: { sysex: boolean }) => Promise<MIDIAccess> }
    if (!nav.requestMIDIAccess) {
      setError('Web MIDI wird von diesem Browser nicht unterstützt (Chrome/Edge nutzen).')
      return
    }
    try {
      const access = await nav.requestMIDIAccess({ sysex: false })
      const refresh = () => {
        const list: MidiDevice[] = []
        access.inputs.forEach((inp) => {
          list.push({ id: inp.id, name: inp.name ?? 'MIDI In' })
          inp.onmidimessage = (msg: MIDIMessageEvent) => {
            const [status, d1, d2] = msg.data as unknown as number[]
            const cmd = status & 0xf0
            if (cmd === 0x90 && d2 > 0) cb.current({ type: 'noteon', note: d1, velocity: d2 / 127 })
            else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) cb.current({ type: 'noteoff', note: d1 })
            else if (cmd === 0xb0) cb.current({ type: 'cc', controller: d1, value: d2 / 127 })
          }
        })
        setDevices(list)
      }
      refresh()
      access.onstatechange = refresh
      setEnabled(true)
      setError(null)
    } catch (e) {
      setError('MIDI-Zugriff abgelehnt: ' + String(e))
    }
  }, [])

  useEffect(() => () => undefined, [])
  return { devices, enabled, error, connect }
}

/** Computer keyboard as fallback piano (QWERTZ friendly). */
export const KEY_TO_SEMITONE: Record<string, number> = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, z: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ö: 16,
}
