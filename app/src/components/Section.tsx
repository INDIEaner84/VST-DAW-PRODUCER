import { useState, type ReactNode } from 'react'

export function Section({
  title,
  hint,
  children,
  defaultOpen = true,
  right,
}: {
  title: string
  hint?: string
  children: ReactNode
  defaultOpen?: boolean
  right?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`card collapsible${open ? ' open' : ''}`}>
      <header className="card-head" onClick={() => setOpen((v) => !v)}>
        <span className={`caret${open ? ' open' : ''}`}>▸</span>
        <h3>{title}{hint && <small>{hint}</small>}</h3>
        <div className="card-head-right" onClick={(e) => e.stopPropagation()}>{right}</div>
      </header>
      {open && <div className="card-body">{children}</div>}
    </section>
  )
}
