import { useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import { DEFAULT_PATCH, SynthVoice, startAudio, type PatchParams } from '../audio/engine'
import { LEVELS, PARAM_SPECS, randomTarget, scoreGuess, type ParamId } from '../audio/levels'
import { ParamControl } from './Knob'

const DEMO_NOTES = ['C3', 'E3', 'G3', 'C4']

export function EarTrainer() {
  const [levelIdx, setLevelIdx] = useState(0)
  const [target, setTarget] = useState<PatchParams>(() => randomTarget(LEVELS[0]))
  const [guess, setGuess] = useState<PatchParams>({ ...DEFAULT_PATCH })
  const [result, setResult] = useState<ReturnType<typeof scoreGuess> | null>(null)
  const [stars, setStars] = useState<Record<number, number>>(() =>
    JSON.parse(localStorage.getItem('vdp.stars') ?? '{}'),
  )
  const [unlocked, setUnlocked] = useState<number>(() => Number(localStorage.getItem('vdp.unlocked') ?? 1))
  const targetSynth = useRef<SynthVoice | null>(null)
  const guessSynth = useRef<SynthVoice | null>(null)

  const level = LEVELS[levelIdx]

  useEffect(() => {
    if (!targetSynth.current) targetSynth.current = new SynthVoice()
    if (!guessSynth.current) guessSynth.current = new SynthVoice()
  }, [])

  useEffect(() => {
    guessSynth.current?.apply(guess)
  }, [guess])
  useEffect(() => {
    targetSynth.current?.apply(target)
  }, [target])

  const play = async (which: 'target' | 'guess') => {
    await startAudio()
    const s = which === 'target' ? targetSynth.current : guessSynth.current
    if (!s) return
    s.apply(which === 'target' ? target : guess)
    const now = Tone.now() + 0.05
    DEMO_NOTES.forEach((n, i) => s.playNote(n, '8n', now + i * 0.28, 0.8))
    s.playNote('C4', '2n', now + DEMO_NOTES.length * 0.28 + 0.1, 0.8)
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

  const grouped = useMemo(() => {
    const g: Record<string, ParamId[]> = {}
    for (const id of level.params) {
      const grp = PARAM_SPECS[id].group
      ;(g[grp] ??= []).push(id)
    }
    return g
  }, [level])

  return (
    <div className="trainer">
      <aside className="levels">
        <h3>Level</h3>
        {LEVELS.map((l, i) => {
          const locked = l.id > unlocked
          return (
            <button
              key={l.id}
              className={`level-btn${i === levelIdx ? ' active' : ''}${locked ? ' locked' : ''}`}
              disabled={locked}
              onClick={() => {
                setLevelIdx(i)
                newRound(i)
              }}
            >
              <span className="lv-num">{l.id}</span>
              <span className="lv-title">{l.title}</span>
              <span className="lv-stars">{'★'.repeat(stars[l.id] ?? 0) || (locked ? '🔒' : '')}</span>
            </button>
          )
        })}
      </aside>

      <section className="trainer-main">
        <div className="lesson">
          <h2>
            Level {level.id}: {level.title}
          </h2>
          <p>{level.lesson}</p>
        </div>

        <div className="transport-row">
          <button className="big primary" onClick={() => play('target')}>▶ Zielsound</button>
          <button className="big" onClick={() => play('guess')}>▶ Dein Sound</button>
          <button className="big" onClick={check}>✓ Prüfen</button>
          <button className="big ghost" onClick={() => newRound()}>⟳ Neue Aufgabe</button>
        </div>

        {result && (
          <div className={`result ${result.passed ? 'pass' : 'fail'}`}>
            <strong>{result.passed ? 'Geschafft!' : 'Noch nicht ganz'}</strong> — Treffer: {result.percent}%
            {!result.passed && <span> · rot markierte Regler weiter justieren</span>}
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
      </section>
    </div>
  )
}
