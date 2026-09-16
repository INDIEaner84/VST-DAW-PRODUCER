import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'

type Mode = 'wave' | 'spectrum'

/** CRT-style analyser wired to the master bus. */
export function Scope({ active }: { active?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode>('wave')
  const modeRef = useRef<Mode>(mode)
  modeRef.current = mode

  useEffect(() => {
    const wave = new Tone.Analyser('waveform', 1024)
    const fft = new Tone.Analyser('fft', 256)
    const dest = Tone.getDestination()
    dest.connect(wave)
    dest.connect(fft)

    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const cv = canvas.current
      if (!cv) return
      const ctx = cv.getContext('2d')
      if (!ctx) return
      const w = (cv.width = cv.clientWidth * 2)
      const h = (cv.height = cv.clientHeight * 2)

      ctx.clearRect(0, 0, w, h)
      // graticule
      ctx.strokeStyle = 'rgba(80,200,140,.13)'
      ctx.lineWidth = 1
      for (let i = 1; i < 6; i++) {
        const x = (w / 6) * i
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
      }
      for (let i = 1; i < 4; i++) {
        const y = (h / 4) * i
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
      }

      if (modeRef.current === 'wave') {
        const data = wave.getValue() as Float32Array
        ctx.strokeStyle = '#4bf0a8'
        ctx.shadowColor = '#4bf0a8'
        ctx.shadowBlur = 10
        ctx.lineWidth = 3
        ctx.beginPath()
        for (let i = 0; i < data.length; i++) {
          const x = (i / (data.length - 1)) * w
          const y = h / 2 - data[i] * h * 0.46
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
        ctx.shadowBlur = 0
      } else {
        const data = fft.getValue() as Float32Array
        const bars = data.length
        const bw = w / bars
        for (let i = 0; i < bars; i++) {
          const db = Math.max(-100, Math.min(0, data[i]))
          const mag = (db + 100) / 100
          const bh = mag * h
          const grd = ctx.createLinearGradient(0, h, 0, h - bh)
          grd.addColorStop(0, '#2ba97a')
          grd.addColorStop(0.7, '#4bf0a8')
          grd.addColorStop(1, '#ffd06a')
          ctx.fillStyle = grd
          ctx.fillRect(i * bw + 1, h - bh, bw - 2, bh)
        }
      }
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      dest.disconnect(wave)
      dest.disconnect(fft)
      wave.dispose()
      fft.dispose()
    }
  }, [])

  return (
    <div className={`scope${active ? ' live' : ''}`}>
      <canvas ref={canvas} />
      <div className="scope-overlay" />
      <div className="scope-ctl">
        <button className={mode === 'wave' ? 'on' : ''} onClick={() => setMode('wave')}>WAVE</button>
        <button className={mode === 'spectrum' ? 'on' : ''} onClick={() => setMode('spectrum')}>SPEC</button>
      </div>
    </div>
  )
}
