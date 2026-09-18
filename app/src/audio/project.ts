import { DEFAULT_PATCH, type PatchParams } from './engine'
import { DRUM_ORDER, emptyPattern, type DrumId, type DrumPattern } from './drums'
import { PARAM_SPECS, quantize, type ParamId } from './levels'
import { PROGRESSIONS } from './theory'

export type Note = { id: string; midi: number; start: number; len: number; vel: number }

export const PROJECT_VERSION = 1
export const MAX_STEPS = 64
export const MAX_BARS = 4
export const MAX_NOTES = 2000
export const MIN_BPM = 40
export const MAX_BPM = 240

export type Project = {
  version: number
  name: string
  savedAt: number
  bpm: number
  bars: number
  keyRoot: number
  progIdx: number
  chordsOn: boolean
  quantize: boolean
  octave: number
  patch: PatchParams
  notes: Note[]
  pattern: DrumPattern
}

const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** Like clampInt but returns null when the value is absent or out of range,
 *  so callers can drop the record instead of silently relocating it. */
const strictInt = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return null
  const r = Math.round(n)
  return r < min || r > max ? null : r
}

const clampNum = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** Coerce anything into a valid patch – unknown keys dropped, values clamped to knob ranges. */
export function sanitizePatch(raw: unknown): PatchParams {
  const src = (raw ?? {}) as Record<string, unknown>
  const out = { ...DEFAULT_PATCH }
  for (const id of Object.keys(PARAM_SPECS) as ParamId[]) {
    const spec = PARAM_SPECS[id]
    const v = src[id]
    if (v === undefined || v === null) continue
    if (spec.kind === 'choice') {
      if (typeof v === 'string' && spec.choices!.includes(v)) (out as Record<string, unknown>)[id] = v
    } else {
      const n = typeof v === 'number' ? v : Number(v)
      if (Number.isFinite(n)) (out as Record<string, unknown>)[id] = quantize(spec, n)
    }
  }
  return out
}

export function sanitizeNotes(raw: unknown, steps: number): Note[] {
  if (!Array.isArray(raw)) return []
  const out: Note[] = []
  for (const item of raw.slice(0, MAX_NOTES)) {
    if (!item || typeof item !== 'object') continue
    const n = item as Record<string, unknown>
    const midi = strictInt(n.midi, 0, 127)
    if (midi === null) continue
    const start = strictInt(n.start, 0, steps - 1)
    if (start === null) continue
    out.push({
      id: typeof n.id === 'string' && n.id ? n.id : crypto.randomUUID(),
      midi,
      start,
      len: clampInt(n.len, 1, steps, 1),
      vel: clampNum(n.vel, 0.05, 1, 0.8),
    })
  }
  return out
}

export function sanitizePattern(raw: unknown): DrumPattern {
  const out = emptyPattern(MAX_STEPS)
  const src = (raw ?? {}) as Record<string, unknown>
  for (const d of DRUM_ORDER) {
    const lane = src[d]
    if (!Array.isArray(lane)) continue
    for (let i = 0; i < Math.min(lane.length, MAX_STEPS); i++) {
      const v = Number(lane[i])
      out[d as DrumId][i] = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0
    }
  }
  return out
}

/** Validate + migrate an untrusted object (file, localStorage) into a usable Project. */
export function sanitizeProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  // a project must at least look like one
  if (!('patch' in r) && !('notes' in r) && !('pattern' in r)) return null

  const bars = clampInt(r.bars, 1, MAX_BARS, 2)
  const steps = bars * 16
  return {
    version: PROJECT_VERSION,
    name: typeof r.name === 'string' && r.name.trim() ? r.name.trim().slice(0, 80) : 'Unbenannt',
    savedAt: clampNum(r.savedAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    bpm: clampInt(r.bpm, MIN_BPM, MAX_BPM, 96),
    bars,
    keyRoot: clampInt(r.keyRoot, 0, 11, 0),
    progIdx: clampInt(r.progIdx, 0, PROGRESSIONS.length - 1, 0),
    chordsOn: r.chordsOn !== false,
    quantize: r.quantize !== false,
    octave: clampInt(r.octave, 1, 7, 4),
    patch: sanitizePatch(r.patch),
    notes: sanitizeNotes(r.notes, steps),
    pattern: sanitizePattern(r.pattern),
  }
}

export function serializeProject(p: Project): string {
  return JSON.stringify({ ...p, version: PROJECT_VERSION }, null, 2)
}

export function parseProject(text: string): Project | null {
  try {
    return sanitizeProject(JSON.parse(text))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- autosave

const STORAGE_KEY = 'vdp.project'

export function saveToStorage(p: Project): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, serializeProject(p))
    return true
  } catch {
    // quota exceeded or storage disabled – never crash the app over this
    return false
  }
}

export function loadFromStorage(): Project | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? parseProject(raw) : null
  } catch {
    return null
  }
}

export function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------- MIDI export

const writeVarLen = (value: number): number[] => {
  const v = Math.max(0, Math.round(value))
  const bytes = [v & 0x7f]
  let rest = v >> 7
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80)
    rest >>= 7
  }
  return bytes
}

const str = (s: string) => [...s].map((c) => c.charCodeAt(0))
const u32 = (n: number) => [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
const u16 = (n: number) => [(n >> 8) & 0xff, n & 0xff]

type MidiEventRec = { tick: number; data: number[]; order: number }

function buildTrack(events: MidiEventRec[], name: string): number[] {
  // note-offs must come before note-ons at the same tick, hence the order tiebreaker
  const sorted = [...events].sort((a, b) => a.tick - b.tick || a.order - b.order)
  const body: number[] = []
  body.push(...writeVarLen(0), 0xff, 0x03, name.length, ...str(name))
  let last = 0
  for (const e of sorted) {
    body.push(...writeVarLen(e.tick - last), ...e.data)
    last = e.tick
  }
  body.push(...writeVarLen(0), 0xff, 0x2f, 0x00) // end of track
  return [...str('MTrk'), ...u32(body.length), ...body]
}

/** GM drum notes for the export track. */
const DRUM_MIDI: Record<DrumId, number> = {
  kick: 36, snare: 38, clap: 39, hatC: 42, hatO: 46, tom: 45, rim: 37, cow: 56,
}

/**
 * Export the project as a type-1 Standard MIDI File.
 * Track 1 = melody, track 2 = drums (channel 10).
 */
export function exportMidi(project: Project): Uint8Array<ArrayBuffer> {
  const PPQ = 96
  const tickPerStep = PPQ / 4 // 16th notes
  const steps = project.bars * 16

  // --- melody ---
  const melody: MidiEventRec[] = []
  for (const n of project.notes) {
    const start = n.start * tickPerStep
    const end = Math.min(n.start + n.len, steps) * tickPerStep
    const vel = Math.max(1, Math.min(127, Math.round(n.vel * 127)))
    melody.push({ tick: start, data: [0x90, n.midi & 0x7f, vel], order: 1 })
    melody.push({ tick: Math.max(start + 1, end), data: [0x80, n.midi & 0x7f, 0], order: 0 })
  }
  // tempo meta goes on the first track
  const mpqn = Math.round(60000000 / project.bpm)
  melody.unshift({
    tick: 0,
    data: [0xff, 0x51, 0x03, (mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff],
    order: -1,
  })

  // --- drums on channel 10 (index 9) ---
  const drums: MidiEventRec[] = []
  for (const d of DRUM_ORDER) {
    const lane = project.pattern[d]
    for (let s = 0; s < steps; s++) {
      const v = lane[s]
      if (!v) continue
      const tick = s * tickPerStep
      const vel = Math.max(1, Math.min(127, Math.round(v * 127)))
      drums.push({ tick, data: [0x99, DRUM_MIDI[d], vel], order: 1 })
      drums.push({ tick: tick + tickPerStep / 2, data: [0x89, DRUM_MIDI[d], 0], order: 0 })
    }
  }

  const header = [...str('MThd'), ...u32(6), ...u16(1), ...u16(2), ...u16(PPQ)]
  const bytes = [...header, ...buildTrack(melody, 'Melody'), ...buildTrack(drums, 'Drums')]
  const out = new Uint8Array(new ArrayBuffer(bytes.length))
  out.set(bytes)
  return out
}

export function downloadBlob(data: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // release the object URL once the download has been handed to the browser
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function safeFilename(name: string, ext: string) {
  const cleaned = name
    .replace(/[\\/]+/g, ' ')       // never allow path separators
    .replace(/\.{2,}/g, '.')       // no parent-directory traversal
    .replace(/[^\w\-. ]+/g, ' ')   // drop anything else exotic
    .replace(/[\s_]+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '') // no leading/trailing dots or space
    .trim()
    .slice(0, 60)
    .trim()
  // a name made only of punctuation collapses to nothing -> use the fallback
  const base = /[\w]/.test(cleaned) ? cleaned : 'projekt'
  return `${base}.${ext}`
}
