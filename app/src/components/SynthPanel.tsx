import type { PatchParams } from '../audio/engine'
import { PARAM_SPECS, type ParamId } from '../audio/levels'
import { MODULES } from './modules'
import { ParamControl } from './Knob'
import { Scope } from './Scope'


export function SynthPanel({
  patch,
  onChange,
  available,
  states = {},
  title = 'MONOLITH-24',
  subtitle = 'ANALOG MODELLING SYNTHESIZER',
  meterActive,
  children,
}: {
  patch: PatchParams
  onChange: (id: ParamId, v: number | string) => void
  /** params the user may touch right now; everything else renders locked */
  available: Set<ParamId>
  /** per-param correctness feedback */
  states?: Partial<Record<ParamId, 'ok' | 'off'>>
  title?: string
  subtitle?: string
  meterActive?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="synth">
      <div className="synth-top">
        <div className="brandplate">
          <span className="screws" />
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>
        <Scope active={meterActive} />
        <div className="synth-top-right">
          {children}
          <div className={`vu${meterActive ? ' on' : ''}`}>
            <span /><span /><span /><span /><span /><span />
          </div>
          <div className="power">
            <span className={`led${meterActive ? ' lit' : ''}`} />
            <small>POWER</small>
          </div>
        </div>
      </div>

      <div className="synth-body">
        {MODULES.map((mod) => {
          const visible = mod.params.filter((p) => PARAM_SPECS[p])
          const anyAvail = visible.some((p) => available.has(p))
          return (
            <div className={`module${anyAvail ? '' : ' module-locked'}`} key={mod.name}>
              <div className="module-head">
                <span className="mod-name">{mod.name}</span>
                {mod.sub && <span className="mod-sub">{mod.sub}</span>}
              </div>
              <div className="module-controls">
                {visible.map((id) => (
                  <ParamControl
                    key={id}
                    spec={PARAM_SPECS[id]}
                    value={patch[id] as number | string}
                    state={states[id] ?? 'neutral'}
                    locked={!available.has(id)}
                    onChange={(v) => onChange(id, v)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="synth-foot">
        <span className="vent" />
        <small>KNOB ZIEHEN · SHIFT = FEIN · DOPPELKLICK = MITTE</small>
        <span className="vent" />
      </div>
    </div>
  )
}
