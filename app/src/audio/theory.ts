export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const midiToNote = (m: number) => `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`
export const noteToMidi = (n: string) => {
  const m = /^([A-G]#?)(-?\d)$/.exec(n)
  if (!m) return 60
  return NOTE_NAMES.indexOf(m[1]) + (parseInt(m[2], 10) + 1) * 12
}

export const KEYS = NOTE_NAMES
export const SCALES: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  'Natural Minor': [0, 2, 3, 5, 7, 8, 10],
  'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
}

/** Roman numeral degree -> semitone offset + chord quality, resolved against a scale. */
export type Chord = { roman: string; root: number; intervals: number[]; label: string }

const QUALITY: Record<string, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  sus4: [0, 5, 7],
}

const ROMAN_TO_DEGREE: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 }

export function parseRoman(roman: string, keyRoot: number, scale: number[]): Chord {
  const m = /^(b?)([ivIV]+)(.*)$/.exec(roman)
  const flat = m?.[1] === 'b' ? -1 : 0
  const base = (m?.[2] ?? 'I').toUpperCase()
  const suffix = m?.[3] ?? ''
  const minor = (m?.[2] ?? 'I') === (m?.[2] ?? 'I').toLowerCase()
  const deg = ROMAN_TO_DEGREE[base] ?? 0
  const root = (keyRoot + scale[deg % scale.length] + flat + 12) % 12
  let q = minor ? 'min' : 'maj'
  if (suffix.includes('dim') || suffix.includes('°')) q = 'dim'
  else if (suffix.includes('sus')) q = 'sus4'
  else if (suffix.includes('maj7')) q = 'maj7'
  else if (suffix.includes('7')) q = minor ? 'min7' : 'dom7'
  return { roman, root, intervals: QUALITY[q], label: `${NOTE_NAMES[root]}${q === 'maj' ? '' : q}` }
}

export type Progression = { name: string; degrees: string[]; scale: keyof typeof SCALES; info: string }

export const PROGRESSIONS: Progression[] = [
  { name: 'Pop 1-5-6-4', degrees: ['I', 'V', 'vi', 'IV'], scale: 'Major', info: 'Die "Axis of Awesome" Formel – tausende Hits.' },
  { name: '1-5-4-6', degrees: ['I', 'V', 'IV', 'vi'], scale: 'Major', info: 'Hymnisch, treibend.' },
  { name: '50s Doo-Wop 1-6-4-5', degrees: ['I', 'vi', 'IV', 'V'], scale: 'Major', info: 'Nostalgisch, Stand By Me.' },
  { name: 'Canon in D', degrees: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], scale: 'Major', info: 'Pachelbels ewige Sequenz.' },
  { name: 'La Folia', degrees: ['i', 'V', 'i', 'bVII', 'bIII', 'bVII', 'i', 'V'], scale: 'Natural Minor', info: 'Barocke Variationsform aus Portugal.' },
  { name: 'Andalusian Cadence', degrees: ['i', 'bVII', 'bVI', 'V'], scale: 'Natural Minor', info: 'Flamenco-Abstieg.' },
  { name: 'Jazz ii-V-I', degrees: ['ii7', 'V7', 'Imaj7', 'Imaj7'], scale: 'Major', info: 'Das Herz des Jazz.' },
  { name: 'Lo-Fi iv-i', degrees: ['i7', 'iv7', 'bVII', 'bIII'], scale: 'Dorian', info: 'Verträumt, Lo-Fi Beats.' },
  { name: 'Epic Minor 1-6-3-7', degrees: ['i', 'bVI', 'bIII', 'bVII'], scale: 'Natural Minor', info: 'Filmisch, EDM-Drops.' },
  { name: 'Blues 12-Bar (kurz)', degrees: ['I7', 'IV7', 'I7', 'V7'], scale: 'Mixolydian', info: 'Shuffle-Basis.' },
]

export function chordNotes(chord: Chord, octave = 3): string[] {
  return chord.intervals.map((iv) => midiToNote(12 * (octave + 1) + chord.root + iv))
}
