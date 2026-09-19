import { useCallback, useEffect, useRef, useState } from 'react'
import { quantize, type ParamSpec } from '../audio/levels'

type State = 'neutral' | 'ok' | 'off'

/** Analog-style rotary knob. Drag up/down (or scroll) to turn. */
export function Knob({
  spec,
  value,
  onChange,
  state = 'neutral',
  locked,
}: {
  spec: ParamSpec
  value: number
  onChange: (v: number) => void
  state?: State
  locked?: boolean
}) {
  const min = spec.min!
  const max = spec.max!
  const toNorm = useCallback(
    (v: number) => (spec.log ? (Math.log(v) - Math.log(min)) / (Math.log(max) - Math.log(min)) : (v - min) / (max - min)),
    [spec.log, min, max],
  )
  const fromNorm = useCallback(
    (n: number) => {
      const c = Math.max(0, Math.min(1, n))
      const v = spec.log ? Math.exp(Math.log(min) + c * (Math.log(max) - Math.log(min))) : min + c * (max - min)
      return quantize(spec, v)
    },
    [spec, min, max],
  )

  const norm = Math.max(0, Math.min(1, toNorm(value)))
  const angle = -140 + norm * 280
  const dragging = useRef<{ y: number; n: number; id: number } | null>(null)
  const [active, setActive] = useState(false)

  // Pointer events cover mouse, touch and pen with one code path, so the knob
  // is usable on tablets and touch laptops instead of mouse-only.
  useEffect(() => {
    if (!active) return
    const move = (e: PointerEvent) => {
      const d = dragging.current
      if (!d || e.pointerId !== d.id) return
      e.preventDefault()
      const dy = d.y - e.clientY
      const speed = e.shiftKey ? 600 : 180
      onChange(fromNorm(d.n + dy / speed))
    }
    const up = (e: PointerEvent) => {
      if (dragging.current && e.pointerId !== dragging.current.id) return
      dragging.current = null
      setActive(false)
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [active, fromNorm, onChange])

  const display = spec.log || Math.abs(value) >= 100 ? String(Math.round(value)) : value.toFixed(2).replace(/0$/, '')

  // tick marks around the dial
  const ticks = Array.from({ length: 11 }, (_, i) => -140 + (i / 10) * 280)

  return (
    <div className={`knob-wrap ${state}${locked ? ' locked' : ''}${active ? ' active' : ''}`}>
      <div
        className="knob"
        role="slider"
        tabIndex={locked ? -1 : 0}
        aria-label={spec.label}
        aria-valuenow={Number(value.toFixed(3))}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={`${display}${spec.unit ?? ''}`}
        aria-orientation="vertical"
        aria-disabled={locked || undefined}
        title={`${spec.label} — ziehen, scrollen oder Pfeiltasten. Shift = fein, Doppelklick = Mitte.`}
        onPointerDown={(e) => {
          if (locked) return
          e.preventDefault()
          e.currentTarget.setPointerCapture?.(e.pointerId)
          dragging.current = { y: e.clientY, n: norm, id: e.pointerId }
          setActive(true)
        }}
        onDoubleClick={() => !locked && onChange(fromNorm(0.5))}
        onWheel={(e) => {
          if (locked) return
          onChange(fromNorm(norm - Math.sign(e.deltaY) * (e.shiftKey ? 0.01 : 0.03)))
        }}
        onKeyDown={(e) => {
          if (locked) return
          // Shift = fine steps, PageUp/Down = coarse, Home/End = limits
          const step = e.shiftKey ? 0.005 : 0.02
          let n: number | null = null
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') n = norm + step
          else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') n = norm - step
          else if (e.key === 'PageUp') n = norm + 0.1
          else if (e.key === 'PageDown') n = norm - 0.1
          else if (e.key === 'Home') n = 0
          else if (e.key === 'End') n = 1
          if (n === null) return
          e.preventDefault()
          onChange(fromNorm(n))
        }}
      >
        <svg viewBox="0 0 64 64" className="knob-svg">
          {ticks.map((t, i) => (
            <line
              key={i}
              className="tick"
              x1="32" y1="5" x2="32" y2="9"
              transform={`rotate(${t} 32 32)`}
            />
          ))}
          {/* value arc */}
          <circle
            className="arc-bg"
            cx="32" cy="32" r="26"
            transform="rotate(-220 32 32)"
            strokeDasharray={`${(280 / 360) * 2 * Math.PI * 26} 999`}
          />
          <circle
            className="arc"
            cx="32" cy="32" r="26"
            transform="rotate(-220 32 32)"
            strokeDasharray={`${norm * (280 / 360) * 2 * Math.PI * 26} 999`}
          />
          {/* cap */}
          <circle className="cap-shadow" cx="32" cy="33" r="19" />
          <circle className="cap" cx="32" cy="32" r="19" />
          <circle className="cap-top" cx="32" cy="31" r="15" />
          <g transform={`rotate(${angle} 32 32)`}>
            <rect className="pointer" x="30.8" y="15" width="2.4" height="12" rx="1.2" />
          </g>
        </svg>
        {locked && <span className="knob-lock">🔒</span>}
      </div>
      <div className="knob-label">{spec.label}</div>
      <div className="knob-val">
        {locked ? '—' : display}
        {!locked && spec.unit ? <span className="unit">{spec.unit}</span> : null}
      </div>
    </div>
  )
}

/** Retro rocker switch for choice params. */
export function Switch({
  spec,
  value,
  onChange,
  state = 'neutral',
  locked,
}: {
  spec: ParamSpec
  value: string
  onChange: (v: string) => void
  state?: State
  locked?: boolean
}) {
  return (
    <div className={`switch-wrap ${state}${locked ? ' locked' : ''}`}>
      <div className="switch-label">{spec.label}</div>
      <div className="switch">
        {spec.choices!.map((c) => (
          <button
            key={c}
            disabled={locked}
            className={value === c ? 'sw active' : 'sw'}
            onClick={() => onChange(c)}
            title={c}
          >
            {c.replace('sawtooth', 'saw').replace('lowpass', 'LP').replace('highpass', 'HP').replace('bandpass', 'BP')}
          </button>
        ))}
        {locked && <span className="knob-lock sw-lock">🔒</span>}
      </div>
    </div>
  )
}

/** Router used by both the trainer and the studio. */
export function ParamControl({
  spec,
  value,
  onChange,
  state = 'neutral',
  locked,
}: {
  spec: ParamSpec
  value: number | string
  onChange: (v: number | string) => void
  state?: State
  locked?: boolean
  disabled?: boolean
}) {
  if (spec.kind === 'choice')
    return <Switch spec={spec} value={String(value)} onChange={onChange} state={state} locked={locked} />
  return <Knob spec={spec} value={Number(value)} onChange={onChange} state={state} locked={locked} />
}
