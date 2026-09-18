import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import { DEFAULT_PATCH, SynthVoice, startAudio, type PatchParams } from '../audio/engine'
import { DRUM_LABELS, DRUM_ORDER, DRUM_PRESETS, DrumMachine, PAD_NOTE_MAP, emptyPattern, type DrumId, type DrumPattern } from '../audio/drums'
import { KEYS, PROGRESSIONS, SCALES, chordNotes, midiToNote, parseRoman } from '../audio/theory'
import { PARAM_SPECS, type ParamId } from '../audio/levels'
import { SynthPanel } from './SynthPanel'
import { KEY_TO_SEMITONE, useMidi } from '../midi/useMidi'
import { Section } from './Section'
import { euclid, rotate } from '../audio/rhythm'
import {
  MAX_BARS,
  MAX_BPM,
  MIN_BPM,
  clearStorage,
  downloadBlob,
  exportMidi,
  loadFromStorage,
  parseProject,
  safeFilename,
  saveToStorage,
  serializeProject,
  type Project,
} from '../audio/project'

const ALL_PARAMS = new Set(Object.keys(PARAM_SPECS) as ParamId[])

export type { Note } from '../audio/project'
import type { Note } from '../audio/project'

const STEPS_PER_BAR = 16

export function Studio() {
  // read the autosave once per mount (lazy initialiser), never at module scope –
  // module scope would capture an empty localStorage on the very first page load
  const [restored] = useState<Project | null>(() => (typeof window === 'undefined' ? null : loadFromStorage()))
  const [projectName, setProjectName] = useState(restored?.name ?? 'Unbenannt')
  const [bars, setBars] = useState(restored?.bars ?? 2)
  const steps = bars * STEPS_PER_BAR
  const [bpm, setBpm] = useState(restored?.bpm ?? 96)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [notes, setNotes] = useState<Note[]>(restored?.notes ?? [])
  const [pattern, setPattern] = useState<DrumPattern>(() => restored?.pattern ?? emptyPattern(64))
  const [recMode, setRecMode] = useState<'off' | 'overdub' | 'replace'>('off')
  const [armNextLoop, setArmNextLoop] = useState(false)
  const [quantize, setQuantize] = useState(restored?.quantize ?? true)
  const [patch, setPatch] = useState<PatchParams>(
    restored?.patch ?? { ...DEFAULT_PATCH, osc: 'sawtooth', cutoff: 3000, attack: 0.02, release: 0.4, reverb: 0.25, delay: 0.15 },
  )
  const [keyRoot, setKeyRoot] = useState(restored?.keyRoot ?? 0)
  const [progIdx, setProgIdx] = useState(restored?.progIdx ?? 0)
  const [chordsOn, setChordsOn] = useState(restored?.chordsOn ?? true)
  const [octave, setOctave] = useState(restored?.octave ?? 4)
  const [log, setLog] = useState<string[]>([])

  const synth = useRef<SynthVoice | null>(null)
  const chordSynth = useRef<SynthVoice | null>(null)
  const drums = useRef<DrumMachine | null>(null)
  const heldRef = useRef<Map<number, { start: number; vel: number }>>(new Map())
  const notesRef = useRef<Note[]>([])
  const patternRef = useRef<DrumPattern>(pattern)
  const recRef = useRef(recMode)
  const [flash, setFlash] = useState<DrumId | null>(null)

  notesRef.current = notes
  patternRef.current = pattern
  recRef.current = recMode

  const prog = PROGRESSIONS[progIdx]
  const scale = SCALES[prog.scale]
  const chords = useMemo(() => prog.degrees.map((d) => parseRoman(d, keyRoot, scale)), [prog, keyRoot, scale])

  useEffect(() => {
    synth.current ??= new SynthVoice()
    chordSynth.current ??= new SynthVoice()
    drums.current ??= new DrumMachine()
    chordSynth.current.apply({ ...DEFAULT_PATCH, osc: 'triangle', cutoff: 2200, attack: 0.05, release: 0.8, reverb: 0.4, subLevel: 0.2 })
  }, [])

  useEffect(() => synth.current?.apply(patch), [patch])
  useEffect(() => {
    Tone.getTransport().bpm.value = bpm
  }, [bpm])

  // main 16th-note scheduler
  useEffect(() => {
    const t = Tone.getTransport()
    t.loop = true
    t.loopStart = 0
    t.loopEnd = `${bars}m`
    const id = t.scheduleRepeat((time) => {
      const step = Math.round(t.ticks / (Tone.getTransport().PPQ / 4)) % steps
      Tone.getDraw().schedule(() => setPos(step), time)

      // drums
      const pat = patternRef.current
      for (const d of DRUM_ORDER) {
        const v = pat[d][step] ?? 0
        if (v > 0) drums.current?.trigger(d, time, v)
      }
      // melody playback
      for (const n of notesRef.current) {
        if (n.start === step) synth.current?.playNote(midiToNote(n.midi), (n.len * 60) / bpm / 4, time, n.vel)
      }
      // chords: one per bar segment
      if (chordsOn && step % STEPS_PER_BAR === 0) {
        const barIdx = Math.floor(step / STEPS_PER_BAR) % chords.length
        const ns = chordNotes(chords[barIdx], 3)
        ns.forEach((n) => chordSynth.current?.playNote(n, (60 / bpm) * 3.6, time, 0.35))
      }
      if (step === 0) {
        if (armNextLoop) {
          setRecMode('overdub')
          setArmNextLoop(false)
        }
        if (recRef.current === 'replace') setNotes([])
      }
    }, '16n')
    return () => {
      t.clear(id)
    }
  }, [bars, steps, bpm, chords, chordsOn, armNextLoop])

  // read live values inside callbacks so the scheduler never sees a stale closure
  const quantizeRef = useRef(quantize)
  const stepsRef = useRef(steps)
  const playingRef = useRef(playing)
  quantizeRef.current = quantize
  stepsRef.current = steps
  playingRef.current = playing

  const currentStep = useCallback(() => {
    const t = Tone.getTransport()
    const raw = t.ticks / (t.PPQ / 4)
    const n = stepsRef.current
    return (quantizeRef.current ? Math.round(raw) : raw) % n
  }, [])

  const noteOn = useCallback(
    (midi: number, vel = 0.8) => {
      startAudio()
      synth.current?.noteOn(midiToNote(midi), vel)
      if (playingRef.current && recRef.current !== 'off') heldRef.current.set(midi, { start: currentStep(), vel })
    },
    [currentStep],
  )

  const noteOff = useCallback(
    (midi: number) => {
      synth.current?.noteOff(midiToNote(midi))
      const held = heldRef.current.get(midi)
      if (!held) return
      heldRef.current.delete(midi)
      const n = stepsRef.current
      const end = currentStep()
      // a note held across the loop point ends *before* it started – wrap instead of going negative
      let len = end - held.start
      if (len <= 0) len += n
      if (quantizeRef.current) len = Math.round(len)
      len = Math.max(1, Math.min(n, len))
      setNotes((ns) => [
        ...ns,
        { id: crypto.randomUUID(), midi, start: Math.floor(held.start) % n, len, vel: held.vel },
      ])
    },
    [currentStep],
  )

  const [padMode, setPadMode] = useState(true)
  const padModeRef = useRef(padMode)
  padModeRef.current = padMode

  const { devices, enabled, error, connect } = useMidi((e) => {
    if (e.type === 'noteon') {
      const pad = PAD_NOTE_MAP[e.note]
      if (pad && e.note < 68 && e.note >= 36 && padModeRef.current) {
        drums.current?.trigger(pad, undefined, e.velocity)
        setFlash(pad)
        if (playing && recRef.current !== 'off') {
          const s = Math.floor(currentStep())
          setPattern((p) => ({ ...p, [pad]: p[pad].map((v, i) => (i === s ? e.velocity : v)) }))
        }
        return
      }
      noteOn(e.note, e.velocity)
    } else if (e.type === 'noteoff') {
      noteOff(e.note)
    } else if (e.type === 'cc') {
      if (e.controller === 1) setPatch((p) => ({ ...p, cutoff: Math.round(200 + e.value * 12000) }))
      if (e.controller === 74) setPatch((p) => ({ ...p, resonance: e.value * 12 }))
      setLog((l) => [`CC${e.controller} = ${e.value.toFixed(2)}`, ...l].slice(0, 5))
    }
  })

  // computer keyboard
  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      if (ev.repeat || ev.metaKey || ev.ctrlKey) return
      if (ev.code === 'Space') {
        ev.preventDefault()
        toggle()
        return
      }
      const st = KEY_TO_SEMITONE[ev.key.toLowerCase()]
      if (st !== undefined) noteOn(12 * (octave + 1) + st, 0.8)
    }
    const up = (ev: KeyboardEvent) => {
      const st = KEY_TO_SEMITONE[ev.key.toLowerCase()]
      if (st !== undefined) noteOff(12 * (octave + 1) + st)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  })

  const toggle = async () => {
    await startAudio()
    const t = Tone.getTransport()
    if (t.state === 'started') {
      t.stop()
      synth.current?.releaseAll()
      setPlaying(false)
      setRecMode('off')
    } else {
      t.position = 0
      t.start()
      setPlaying(true)
    }
  }

  // ---- creative drum tools ----
  const applyPreset = (i: number) => {
    const base = emptyPattern(64)
    const pr = DRUM_PRESETS[i].pattern
    for (const [k, v] of Object.entries(pr)) {
      for (let b = 0; b < 4; b++) for (let s = 0; s < 16; s++) base[k as DrumId][b * 16 + s] = v[s]
    }
    setPattern(base)
  }

  const euclidTo = (d: DrumId, pulses: number) =>
    setPattern((p) => ({ ...p, [d]: euclid(pulses, steps).concat(Array(64).fill(0)).slice(0, 64) }))

  const humanize = () =>
    setPattern((p) => {
      const n = { ...p }
      for (const d of DRUM_ORDER) n[d] = p[d].map((v) => (v > 0 ? Math.max(0.35, Math.min(1, v + (Math.random() - 0.5) * 0.35)) : v))
      return n
    })

  const mutate = () =>
    setPattern((p) => {
      const n = { ...p }
      for (const d of DRUM_ORDER)
        n[d] = p[d].map((v, i) => {
          if (i >= steps) return v
          if (Math.random() < 0.08) return v > 0 ? 0 : Math.random() < 0.5 ? 0.7 : 0
          return v
        })
      return n
    })

  const shift = (dir: number) =>
    setPattern((p) => {
      const n = { ...p }
      for (const d of DRUM_ORDER)
        n[d] = rotate(p[d].slice(0, steps), dir).concat(Array(64 - steps).fill(0))
      return n
    })

  const clearAll = () => setPattern(emptyPattern(64))

  // ------------------------------------------------------------ project I/O
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle')
  const [toast, setToast] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600)
  }, [])

  const collect = useCallback(
    (): Project => ({
      version: 1,
      name: projectName,
      savedAt: Date.now(),
      bpm,
      bars,
      keyRoot,
      progIdx,
      chordsOn,
      quantize,
      octave,
      patch,
      notes,
      pattern,
    }),
    [projectName, bpm, bars, keyRoot, progIdx, chordsOn, quantize, octave, patch, notes, pattern],
  )

  const applyProject = useCallback((p: Project) => {
    setProjectName(p.name)
    setBpm(p.bpm)
    setBars(p.bars)
    setKeyRoot(p.keyRoot)
    setProgIdx(p.progIdx)
    setChordsOn(p.chordsOn)
    setQuantize(p.quantize)
    setOctave(p.octave)
    setPatch(p.patch)
    setNotes(p.notes)
    setPattern(p.pattern)
  }, [])

  // debounced autosave – never runs on every keystroke of a slider drag
  const collectRef = useRef(collect)
  collectRef.current = collect
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSaveState(saveToStorage(collectRef.current()) ? 'saved' : 'error')
    }, 700)
    return () => window.clearTimeout(t)
  }, [notes, pattern, patch, bpm, bars, keyRoot, progIdx, chordsOn, quantize, octave, projectName])

  const exportProject = () => {
    const p = collect()
    downloadBlob(serializeProject(p), safeFilename(p.name, 'vdp.json'), 'application/json')
    showToast('Projekt exportiert')
  }

  const exportAsMidi = () => {
    const p = collect()
    if (p.notes.length === 0 && DRUM_ORDER.every((d) => p.pattern[d].every((v) => !v))) {
      showToast('Nichts zu exportieren – erst etwas einspielen')
      return
    }
    downloadBlob(exportMidi(p), safeFilename(p.name, 'mid'), 'audio/midi')
    showToast('MIDI exportiert')
  }

  const importProject = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseProject(String(reader.result ?? ''))
      if (!parsed) {
        showToast('Datei konnte nicht gelesen werden')
        return
      }
      applyProject(parsed)
      showToast(`"${parsed.name}" geladen`)
    }
    reader.onerror = () => showToast('Datei konnte nicht gelesen werden')
    reader.readAsText(file)
  }

  const newProject = () => {
    if (!window.confirm('Aktuelles Projekt verwerfen und neu anfangen?')) return
    setNotes([])
    setPattern(emptyPattern(64))
    setProjectName('Unbenannt')
    clearStorage()
    showToast('Neues Projekt')
  }


  // piano roll geometry
  const lowMidi = 48
  const highMidi = 84
  const rows = highMidi - lowMidi

  return (
    <div className="studio">
      {toast && <div className="toast" role="status">{toast}</div>}

      <div className="projectbar">
        <span className="pb-icon">💾</span>
        <input
          className="pb-name"
          aria-label="Projektname"
          value={projectName}
          maxLength={80}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <span className={`pb-state pb-${saveState}`} title="Automatisch im Browser gespeichert">
          {saveState === 'error' ? '⚠ nicht gespeichert' : saveState === 'saved' ? '✓ gesichert' : '…'}
        </span>
        <div className="pb-actions">
          <button className="transport" onClick={exportProject} title="Projekt als Datei sichern">⬇ Projekt</button>
          <button className="transport" onClick={exportAsMidi} title="Als Standard-MIDI-Datei exportieren">⬇ MIDI</button>
          <button className="transport" onClick={() => fileInput.current?.click()} title="Projektdatei laden">⬆ Laden</button>
          <button className="transport ghost" onClick={newProject}>✕ Neu</button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            data-testid="project-file"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importProject(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      <div className="topbar">
        <button className={`transport ${playing ? 'on' : ''}`} onClick={toggle}>{playing ? '■ Stop' : '▶ Play'}</button>
        <button className={`transport rec ${recMode === 'overdub' ? 'on' : ''}`} onClick={() => setRecMode((m) => (m === 'overdub' ? 'off' : 'overdub'))}>● Overdub</button>
        <button className={`transport rec ${recMode === 'replace' ? 'on' : ''}`} onClick={() => setRecMode((m) => (m === 'replace' ? 'off' : 'replace'))}>◉ Replace/Loop</button>
        <button className={`transport ${armNextLoop ? 'on' : ''}`} onClick={() => setArmNextLoop((v) => !v)}>⏱ Ab nächstem Loop</button>
        <label className="inline">BPM <input
            type="number"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (Number.isFinite(v) && e.target.value !== '') setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(v))))
            }}
          /></label>
        <label className="inline">Takte
          <select value={bars} onChange={(e) => setBars(Number(e.target.value))}>{[1, 2, 4].filter((b) => b <= MAX_BARS).map((b) => <option key={b}>{b}</option>)}</select>
        </label>
        <label className="inline"><input type="checkbox" checked={quantize} onChange={(e) => setQuantize(e.target.checked)} /> Quantize 1/16</label>
        <label className="inline"><input type="checkbox" checked={chordsOn} onChange={(e) => setChordsOn(e.target.checked)} /> Akkord-Begleitung</label>
        <button className="transport ghost" onClick={() => setNotes([])}>Melodie leeren</button>
      </div>

      <div className="grid-2">
        <Section title="Akkord-Baukasten">
          <div className="row">
            <label className="inline">Tonart
              <select value={keyRoot} onChange={(e) => setKeyRoot(Number(e.target.value))}>
                {KEYS.map((k, i) => <option key={k} value={i}>{k}</option>)}
              </select>
            </label>
            <label className="inline grow">Progression
              <select value={progIdx} onChange={(e) => setProgIdx(Number(e.target.value))}>
                {PROGRESSIONS.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
              </select>
            </label>
          </div>
          <p className="hint">{prog.info} · Skala: {prog.scale}</p>
          <div className="chords">
            {chords.map((c, i) => (
              <button key={i} className={`chord ${playing && Math.floor(pos / STEPS_PER_BAR) % chords.length === i ? 'active' : ''}`}
                onMouseDown={async () => {
                  await startAudio()
                  chordNotes(c, 3).forEach((n) => chordSynth.current?.playNote(n, '2n', undefined, 0.5))
                }}>
                <span className="roman">{c.roman}</span>
                <span className="cname">{c.label}</span>
              </button>
            ))}
          </div>
          <p className="hint">Skalen-Töne werden im Piano Roll hell hinterlegt – du kannst nicht "falsch" spielen.</p>
        </Section>

        <Section title="MIDI-Controller" hint="z.B. Nektar Impact" defaultOpen={false}>
          <button className="transport" onClick={connect}>{enabled ? '✓ MIDI verbunden' : 'MIDI verbinden'}</button>
          {error && <p className="err">{error}</p>}
          <ul className="devlist">{devices.map((d) => <li key={d.id}>🎹 {d.name}</li>)}</ul>
          <label className="inline"><input type="checkbox" checked={padMode} onChange={(e) => setPadMode(e.target.checked)} /> Pads (Note 36–67) = Drums</label>
          <label className="inline">Oktave (PC-Tastatur)
            <input type="number" min={1} max={7} value={octave} onChange={(e) => setOctave(Number(e.target.value))} />
          </label>
          <p className="hint">Ohne Controller: Tasten A W S E D F T G Z H U J spielen eine Oktave. Mod-Wheel (CC1) = Cutoff, CC74 = Resonance.</p>
          <div className="cclog">{log.map((l, i) => <code key={i}>{l}</code>)}</div>
        </Section>
      </div>

      <Section title="Piano Roll" hint={`${notes.length} Noten · Schritt ${pos + 1}/${steps}`}>
        <div className="roll" style={{ ['--steps' as string]: steps, ['--rows' as string]: rows }}>
          <div className="roll-grid">
            {Array.from({ length: rows }).map((_, r) => {
              const midi = highMidi - 1 - r
              const inScale = scale.includes(((midi - keyRoot) % 12 + 12) % 12)
              const isBlack = [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12)
              return (
                <div key={r} className={`roll-row${inScale ? ' in-scale' : ''}${isBlack ? ' black' : ''}`}>
                  {Array.from({ length: steps }).map((_, s) => (
                    <div
                      key={s}
                      className={`cell${s % 4 === 0 ? ' beat' : ''}${s % 16 === 0 ? ' bar' : ''}${s === pos && playing ? ' phead' : ''}`}
                      onClick={() =>
                        setNotes((ns) =>
                          ns.some((n) => n.midi === midi && n.start === s)
                            ? ns.filter((n) => !(n.midi === midi && n.start === s))
                            : [...ns, { id: crypto.randomUUID(), midi, start: s, len: 2, vel: 0.8 }],
                        )
                      }
                    />
                  ))}
                </div>
              )
            })}
          </div>
          {notes.map((n) => (
            <div
              key={n.id}
              className="note"
              title={`${midiToNote(n.midi)} löschen`}
              onClick={() => setNotes((ns) => ns.filter((x) => x.id !== n.id))}
              style={{
                left: `calc(${n.start} * (100% / ${steps}))`,
                width: `calc(${Math.max(1, n.len)} * (100% / ${steps}) - 2px)`,
                top: `calc(${highMidi - 1 - n.midi} * (100% / ${rows}))`,
                opacity: 0.45 + n.vel * 0.55,
              }}
            />
          ))}
        </div>
      </Section>

      <Section title="Drum Machine" hint="8 Pads · Euclidean & Mutation">
        <div className="row wrap">
          <select onChange={(e) => applyPreset(Number(e.target.value))} defaultValue="">
            <option value="" disabled>Preset laden…</option>
            {DRUM_PRESETS.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
          </select>
          <button onClick={humanize}>Humanize</button>
          <button onClick={mutate}>Mutate</button>
          <button onClick={() => shift(1)}>Shift →</button>
          <button onClick={() => shift(-1)}>← Shift</button>
          <button onClick={clearAll}>Clear</button>
        </div>
        <div className="drumgrid">
          {DRUM_ORDER.map((d) => (
            <div className="drumrow" key={d}>
              <button
                className={`pad${flash === d ? ' flash' : ''}`}
                onMouseDown={async () => {
                  await startAudio()
                  drums.current?.trigger(d)
                  setFlash(d)
                  setTimeout(() => setFlash(null), 120)
                  if (playing && recMode !== 'off') {
                    const s = Math.floor(currentStep())
                    setPattern((p) => ({ ...p, [d]: p[d].map((v, i) => (i === s ? 0.9 : v)) }))
                  }
                }}
              >
                {DRUM_LABELS[d]}
              </button>
              <select className="euc" defaultValue="" onChange={(e) => e.target.value && euclidTo(d, Number(e.target.value))}>
                <option value="">Euclid</option>
                {[2, 3, 4, 5, 6, 7, 8, 9, 11].map((n) => <option key={n} value={n}>{n}/{steps}</option>)}
              </select>
              <div className="steps">
                {Array.from({ length: steps }).map((_, s) => (
                  <button
                    key={s}
                    className={`step${pattern[d][s] > 0 ? ' on' : ''}${s % 4 === 0 ? ' beat' : ''}${s === pos && playing ? ' head' : ''}`}
                    style={pattern[d][s] > 0 ? { opacity: 0.45 + pattern[d][s] * 0.55 } : undefined}
                    onClick={() => setPattern((p) => ({ ...p, [d]: p[d].map((v, i) => (i === s ? (v > 0 ? 0 : 0.9) : v)) }))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Sound Design" hint="derselbe Synth wie im Ear-Trainer" defaultOpen={false}>
        <SynthPanel
          patch={patch}
          available={ALL_PARAMS}
          onChange={(id, v) => setPatch((p) => ({ ...p, [id]: v }))}
          subtitle="STUDIO VOICE · ALLE MODULE FREI"
          meterActive={playing}
        />
      </Section>
    </div>
  )
}