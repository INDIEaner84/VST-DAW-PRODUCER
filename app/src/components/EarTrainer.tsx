import { useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import { DEFAULT_PATCH, SynthVoice, startAudio, type PatchParams } from '../audio/engine'
import { LEVELS, PARAM_SPECS, gradedParams, randomTarget, scoreGuess, type ParamId } from '../audio/levels'
import { ParamControl } from './Knob'

const DEMO_NOTES = ['C3', 'E3', 'G3', 'C4']

export function EarTrainer() {
  const [levelIdx, setLevelIdx] = useState(0)
  const [target, setTarget] = useState<PatchParams>(() => randomTarget(LEVELS[0]))
  const [guess, setGuess] = useState<PatchParams>({ ...DEFAULT_PATCH })
  const [result, setResult] = useState<ReturnType<typeof scoreGuess> | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lessonOpen, setLessonOpen] = useState(false)
  const [playingWhich, setPlayingWhich] = useState<'target' | 'guess' | null>(null)
  const [stars, setStars] = useState<Record<number, number>>(() =>
    JSON.parse(localStorage.getItem('vdp.stars') ?? '{}'),
  )
  const [unlocked, setUnlocked] = useState<number>(() => Number(localStorage.getItem('vdp.unlocked') ?? 1))
  const targetSynth = useRef<SynthVoice | null>(null)
  const guessSynth = useRef<SynthVoice | null>(null)

  const level = LEVELS[levelIdx]
  const graded = useMemo(() => gradedParams(level, target), [level, target])

  useEffect(() => {
    if (!targetSynth.current) targetSynth.current = new SynthVoice()
    if (!guessSynth.current) guessSynth.current = new SynthVoice()
  }, [])

  useEffect(() => void guessSynth.current?.apply(guess), [guess])
  useEffect(() => void targetSynth.current?.apply(target), [target])

  // close drawer with Escape, play with Space
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
      if (e.code === 'Space' && !(e.target as HTMLElement)?.closest?.('input,select,button')) {
        e.preventDefault()
        play('target')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const play = async (which: 'target' | 'guess') => {
    await startAudio()
    const s = which === 'target' ? targetSynth.current : guessSynth.current
    if (!s) return
    s.apply(which === 'target' ? target : guess)
    setPlayingWhich(which)
    const now = Tone.now() + 0.05
    DEMO_NOTES.forEach((n, i) => s.playNote(n, '8n', now + i * 0.28, 0.8))
    s.playNote('C4', '2n', now + DEMO_NOTES.length * 0.28 + 0.1, 0.8)
    setTimeout(() => setPlayingWhich(null), 2400)
  }

  const newRound = (idx = levelIdx) => {
    setTarget(randomTarget(LEVELS[idx]))
    setGuess({ ...DEFAULT_PATCH })
    setResult(null)
  }

  const check = () => {
    const r = scoreGuess(level, target, guess)
    setResult(r)
    if (r.passed) {
      const st = r.percent >= 95 ? 3 : r.percent >= 85 ? 2 : 1
      const next = { ...stars, [level.id]: Math.max(stars[level.id] ?? 0, st) }
      setStars(next)
      localStorage.setItem('vdp.stars', JSON.stringify(next))
      const nu = Math.max(unlocked, Math.min(LEVELS.length, level.id + 1))
      setUnlocked(nu)
      localStorage.setItem('vdp.unlocked', String(nu))
    }
  }

  const goNext = () => {
    const ni = Math.min(LEVELS.length - 1, levelIdx + 1)
    setLevelIdx(ni)
    newRound(ni)
  }

  const reveal = () => {
    setGuess({ ...target })
    setResult(scoreGuess(level, target, target))
  }

  const grouped = useMemo(() => {
    const g: Record<string, ParamId[]> = {}
    for (const id of graded) {
      const grp = PARAM_SPECS[id].group
      ;(g[grp] ??= []).push(id)
    }
    return g
  }, [graded])

  const chapters = useMemo(() => {
    const m: { name: string; levels: typeof LEVELS }[] = []
    for (const l of LEVELS) {
      const last = m[m.length - 1]
      if (last && last.name === l.chapter) last.levels.push(l)
      else m.push({ name: l.chapter, levels: [l] })
    }
    return m
  }, [])

  const doneCount = Object.keys(stars).length

  return (
    <div className="trainer focus">
      {/* --- slim level bar --- */}
      <div className="levelbar">
        <button className="drawer-toggle" onClick={() => setDrawerOpen(true)} title="Level wählen">
          <span className="burger">☰</span>
          <span className="lb-chapter">{level.chapter}</span>
          <span className="lb-sep">/</span>
          <span className="lb-title">Level {level.id} · {level.title}</span>
        </button>
        <div className="lb-right">
          <span className="lb-stars">{'★'.repeat(stars[level.id] ?? 0).padEnd(3, '☆')}</span>
          <span className="lb-prog">{doneCount}/{LEVELS.length}</span>
          <button className={`icon-btn${lessonOpen ? ' on' : ''}`} onClick={() => setLessonOpen((v) => !v)} title="Lektion anzeigen">?</button>
        </div>
      </div>

      {lessonOpen && (
        <div className="lesson-pop">
          <p>{level.lesson}</p>
          {level.tip && <p className="tip">💡 {level.tip}</p>}
        </div>
      )}

      {/* --- focus stage --- */}
      <div className="stage">
        <div className="ab-compare">
          <button className={`ab target${playingWhich === 'target' ? ' ringing' : ''}`} onClick={() => play('target')}>
            <span className="ab-label">Zielsound</span>
            <span className="ab-play">▶</span>
            <span className="ab-hint">Leertaste</span>
          </button>
          <div className="ab-vs">A / B</div>
          <button className={`ab mine${playingWhich === 'guess' ? ' ringing' : ''}`} onClick={() => play('guess')}>
            <span className="ab-label">Dein Sound</span>
            <span className="ab-play">▶</span>
            <span className="ab-hint">vergleichen</span>
          </button>
        </div>

        {result && (
          <div className={`result ${result.passed ? 'pass' : 'fail'}`}>
            <div className="res-bar"><div className="res-fill" style={{ width: `${result.percent}%` }} /></div>
            <div className="res-text">
              <strong>{result.passed ? '🎉 Geschafft!' : 'Noch nicht ganz'}</strong>
              <span>{result.percent}% Treffer</span>
              {result.passed
                ? levelIdx < LEVELS.length - 1 && <button className="big primary sm" onClick={goNext}>Nächstes Level →</button>
                : <span className="dim">rot markierte Regler weiter justieren</span>}
            </div>
          </div>
        )}

        <div className="panels">
          {Object.entries(grouped).map(([group, ids]) => (
            <div className="panel" key={group}>
              <h4>{group}</h4>
              {ids.map((id) => {
                const det = result?.details.find((d) => d.id === id)
                return (
                  <ParamControl
                    key={id}
                    spec={PARAM_SPECS[id]}
                    value={guess[id] as number | string}
                    state={det ? (det.ok ? 'ok' : 'off') : 'neutral'}
                    onChange={(v) => setGuess((g) => ({ ...g, [id]: v }))}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* --- sticky action bar --- */}
      <div className="actionbar">
        <button className="big primary" onClick={check}>✓ Prüfen</button>
        <button className="big" onClick={() => newRound()}>⟳ Neue Aufgabe</button>
        <button className="big ghost" onClick={reveal}>👁 Lösung zeigen</button>
      </div>

      {/* --- level drawer --- */}
      {drawerOpen && <div className="scrim" onClick={() => setDrawerOpen(false)} />}
      <aside className={`drawer${drawerOpen ? ' open' : ''}`}>
        <div className="drawer-head">
          <h3>Level · {doneCount}/{LEVELS.length}</h3>
          <button className="icon-btn" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>
        <div className="drawer-body">
          {chapters.map((ch) => (
            <div key={ch.name} className="chapter">
              <h5>{ch.name}</h5>
              {ch.levels.map((l) => {
                const locked = l.id > unlocked
                return (
                  <button
                    key={l.id}
                    className={`level-btn${l.id === level.id ? ' active' : ''}${locked ? ' locked' : ''}`}
                    disabled={locked}
                    onClick={() => {
                      const i = LEVELS.findIndex((x) => x.id === l.id)
                      setLevelIdx(i)
                      newRound(i)
                      setDrawerOpen(false)
                    }}
                  >
                    <span className="lv-num">{l.id}</span>
                    <span className="lv-title">{l.title}</span>
                    <span className="lv-stars">{'★'.repeat(stars[l.id] ?? 0) || (locked ? '🔒' : '')}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
