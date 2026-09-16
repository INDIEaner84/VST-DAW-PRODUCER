import type { ParamSpec } from '../audio/levels'

type Props = {
  spec: ParamSpec
  value: number | string
  onChange: (v: number | string) => void
  state?: 'neutral' | 'ok' | 'off'
  disabled?: boolean
}

export function ParamControl({ spec, value, onChange, state = 'neutral', disabled }: Props) {
  if (spec.kind === 'choice') {
    return (
      <div className={`param param-${state}`}>
        <label>{spec.label}</label>
        <div className="choices">
          {spec.choices!.map((c) => (
            <button
              key={c}
              disabled={disabled}
              className={value === c ? 'chip active' : 'chip'}
              onClick={() => onChange(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    )
  }
  const num = Number(value)
  const sliderVal = spec.log ? Math.log(num) : num
  const min = spec.log ? Math.log(spec.min!) : spec.min!
  const max = spec.log ? Math.log(spec.max!) : spec.max!
  return (
    <div className={`param param-${state}`}>
      <label>
        {spec.label}
        <span className="val">
          {spec.log || num >= 100 ? Math.round(num) : num.toFixed(2)}
          {spec.unit ?? ''}
        </span>
      </label>
      <input
        type="range"
        disabled={disabled}
        min={min}
        max={max}
        step={(max - min) / 300}
        value={sliderVal}
        onChange={(e) => {
          const raw = Number(e.target.value)
          const v = spec.log ? Math.exp(raw) : raw
          const st = spec.step ?? 0.01
          onChange(spec.log ? Math.round(v) : Math.round(v / st) * st)
        }}
      />
    </div>
  )
}
