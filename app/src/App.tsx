import { useState } from 'react'
import './App.css'
import { EarTrainer } from './components/EarTrainer'
import { Studio } from './components/Studio'

export default function App() {
  const [tab, setTab] = useState<'train' | 'studio'>('train')
  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="logo">◉</span>
          <div>
            <h1>VST DAW PRODUCER</h1>
            <p>Sound-Design lernen · komponieren im Flow</p>
          </div>
        </div>
        <nav>
          <button className={tab === 'train' ? 'active' : ''} onClick={() => setTab('train')}>Ear Trainer</button>
          <button className={tab === 'studio' ? 'active' : ''} onClick={() => setTab('studio')}>Studio</button>
        </nav>
      </header>
      {tab === 'train' ? <EarTrainer /> : <Studio />}
    </div>
  )
}
