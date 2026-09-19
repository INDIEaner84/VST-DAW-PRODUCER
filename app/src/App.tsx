import { useState } from 'react'
import './App.css'
import { EarTrainer } from './components/EarTrainer'
import { Studio } from './components/Studio'
import { ErrorBoundary } from './components/ErrorBoundary'

export default function App() {
  const [tab, setTab] = useState<'train' | 'studio'>('train')
  // mount the studio on first visit and keep it alive from then on
  const [studioOpened, setStudioOpened] = useState(false)
  const show = (t: 'train' | 'studio') => {
    if (t === 'studio') setStudioOpened(true)
    setTab(t)
  }
  return (
    <div className="app">
      <a className="skip-link" href="#panel-train">Zum Inhalt springen</a>
      <header className="app-header">
        <div className="brand">
          <span className="logo">◉</span>
          <div>
            <h1>VST DAW PRODUCER</h1>
            <p>Sound-Design lernen · komponieren im Flow</p>
          </div>
        </div>
        <nav role="tablist" aria-label="Bereich wählen">
          <button
            role="tab"
            aria-selected={tab === 'train'}
            aria-controls="panel-train"
            className={tab === 'train' ? 'active' : ''}
            onClick={() => show('train')}
          >
            Ear Trainer
          </button>
          <button
            role="tab"
            aria-selected={tab === 'studio'}
            aria-controls="panel-studio"
            className={tab === 'studio' ? 'active' : ''}
            onClick={() => show('studio')}
          >
            Studio
          </button>
        </nav>
      </header>
      {/* The studio holds unsaved musical work, so it stays mounted once opened and
          is only hidden – unmounting it would discard notes, patterns and playback state. */}
      <div id="panel-train" role="tabpanel" aria-label="Ear Trainer" hidden={tab !== 'train'}>{tab === 'train' && <ErrorBoundary label="Trainer konnte nicht geladen werden"><EarTrainer /></ErrorBoundary>}</div>
      {studioOpened && <div id="panel-studio" role="tabpanel" aria-label="Studio" hidden={tab !== 'studio'}><ErrorBoundary label="Studio konnte nicht geladen werden"><Studio /></ErrorBoundary></div>}
    </div>
  )
}
