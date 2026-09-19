import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/** Last-resort visible failure: never leave the user with a blank white page. */
function showFatal(message: string) {
  const root = document.getElementById('root')
  if (!root || root.dataset.fatal === '1') return
  root.dataset.fatal = '1'
  root.innerHTML = ''
  const box = document.createElement('div')
  box.style.cssText =
    'margin:40px auto;max-width:560px;padding:20px 24px;border:1px solid #a33;' +
    'border-radius:10px;background:#2a1414;color:#f2dede;font-family:system-ui,sans-serif'
  const h = document.createElement('h2')
  h.textContent = '⚠ Die App konnte nicht gestartet werden'
  const p = document.createElement('p')
  p.textContent = 'Bitte lade die Seite neu. Details:'
  const pre = document.createElement('pre')
  pre.style.cssText =
    'white-space:pre-wrap;word-break:break-word;background:#1a0d0d;padding:10px;' +
    'border-radius:6px;font-size:12px;color:#ffb4b4'
  pre.textContent = message // textContent, not innerHTML: never interpolate error text as markup
  box.append(h, p, pre)
  root.appendChild(box)
}

window.addEventListener('error', (e) => showFatal(e.message))
window.addEventListener('unhandledrejection', (e) => showFatal(String(e.reason)))

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e) {
  showFatal(e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e))
}
