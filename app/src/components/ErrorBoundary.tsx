import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; label?: string }
type State = { error: Error | null }

/**
 * Without a boundary a single throw (e.g. Web Audio being unavailable) unmounts the
 * whole React tree and the user is left staring at a blank page. This keeps the rest
 * of the app alive and explains what went wrong.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[VST-DAW-PRODUCER] crash:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="crash">
        <h2>⚠ {this.props.label ?? 'Etwas ist schiefgelaufen'}</h2>
        <p>
          Dieser Bereich konnte nicht geladen werden. Der Rest der App funktioniert weiter.
        </p>
        <pre>{error.message}</pre>
        <div className="crash-actions">
          <button className="big primary" onClick={() => this.setState({ error: null })}>
            Nochmal versuchen
          </button>
          <button className="big" onClick={() => window.location.reload()}>
            Seite neu laden
          </button>
        </div>
      </div>
    )
  }
}
