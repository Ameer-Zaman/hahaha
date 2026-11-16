import { useEffect, useRef, useState } from 'react'

import { getAudioContext } from '../../lib/introSound'
import { musicLevel, selectTrack, toggleMusic, useMusic } from '../../lib/music'
import { media } from '../../config/site'
import './music-button.css'

/*
 * The waves: a few glowing curves laid over each other, each pinched to nothing at both ends
 * and swelling in the middle, drifting at their own speeds. Their height follows how loud the
 * music is at that moment; with the music off they settle into one flat line.
 */
const WAVES = [
  { color: '227,181,90', amp: 1.0, freq: 5.2, speed: 2.6, width: 1.6 }, // gold
  { color: '255,150,60', amp: 0.75, freq: 3.4, speed: -1.9, width: 1.3 }, // amber
  { color: '244,236,220', amp: 0.55, freq: 7.1, speed: 3.4, width: 1.1 }, // ivory
  { color: '184,134,47', amp: 0.85, freq: 2.3, speed: -1.2, width: 1.4 }, // deep gold
]
// pinch at the ends: 1 in the middle, 0 at both edges (x from -2 to 2)
const pinch = (x) => (4 / (4 + x ** 4)) ** 4

function draw(ctx, w, h, dpr, t, level, still) {
  ctx.clearRect(0, 0, w, h)
  const mid = h / 2
  const steps = 48
  ctx.globalCompositeOperation = 'lighter'
  for (const wave of WAVES) {
    const a = (h / 2 - 1 * dpr) * wave.amp * Math.min(1, level)
    const phase = still ? wave.freq : t * wave.speed
    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const xn = -2 + (4 * i) / steps
      const y = mid + a * pinch(xn) * Math.sin(wave.freq * xn + phase)
      const x = (i / steps) * w
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    // a soft filled body under each curve, and the curve itself drawn bright on top
    ctx.lineTo(w, mid)
    ctx.lineTo(0, mid)
    ctx.closePath()
    ctx.fillStyle = `rgba(${wave.color},${0.16 * Math.min(1, level * 2)})`
    ctx.fill()
    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const xn = -2 + (4 * i) / steps
      const y = mid + a * pinch(xn) * Math.sin(wave.freq * xn + phase)
      const x = (i / steps) * w
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = `rgba(${wave.color},0.95)`
    ctx.lineWidth = wave.width * dpr
    ctx.shadowColor = `rgba(${wave.color},0.9)`
    ctx.shadowBlur = 4 * dpr * level
    ctx.stroke()
  }
  ctx.shadowBlur = 0
  // the resting line, fading out as the waves rise
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = `rgba(244,236,220,${0.85 * Math.max(0, 1 - level * 6)})`
  ctx.fillRect(0, mid - 0.6 * dpr, w, 1.2 * dpr)
}

/** How long to wait for a second click before treating the first as a plain on/off. */
const DOUBLE_CLICK_MS = 260

/**
 * Header control for the background music: glowing waves that move with the music while it
 * plays, a flat line when it's off. One click turns it on or off; when staff have added songs
 * (Panel → Music), a double click opens a pop-up to pick one.
 */
export default function MusicButton({ className = '' }) {
  const { playing, tracks, current } = useMusic()
  const [picking, setPicking] = useState(false)
  const clickTimer = useRef(0)
  const canvas = useRef(null)
  const playingRef = useRef(playing)
  const wake = useRef(null)

  useEffect(() => {
    playingRef.current = playing
    wake.current?.()
  }, [playing])
  useEffect(() => {
    const el = canvas.current
    if (!el) return undefined
    const ctx = el.getContext('2d')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let shown = 0 // the height drawn, easing towards the music's level
    let last = performance.now()
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      el.width = Math.round(el.clientWidth * dpr)
      el.height = Math.round(el.clientHeight * dpr)
      return dpr
    }
    let dpr = size()
    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      // a floor so the waves keep breathing in the quiet bits; zero when the music is off
      const target = playingRef.current ? (still ? 0.8 : Math.max(0.5, Math.min(1, 0.35 + musicLevel()))) : 0
      const rate = target > shown ? 14 : 5 // jump up with a beat, fall back more gently
      shown += (target - shown) * (1 - Math.exp(-rate * dt))
      draw(ctx, el.width, el.height, dpr, now / 1000, shown, still)
      // keep drawing while playing or still settling; stop once flat
      raf = playingRef.current || shown > 0.002 ? requestAnimationFrame(frame) : 0
    }
    wake.current = () => {
      if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    const resize = () => {
      dpr = size()
      wake.current()
    }
    window.addEventListener('resize', resize)
    draw(ctx, el.width, el.height, dpr, 0, 0, still)
    if (playingRef.current) wake.current()
    return () => {
      cancelAnimationFrame(raf)
      wake.current = null
      window.removeEventListener('resize', resize)
    }
  }, [])

  useEffect(() => () => clearTimeout(clickTimer.current), [])

  const choosable = tracks.length > 1
  const onClick = () => {
    if (!choosable) return toggleMusic()
    // wake the audio inside the click (browsers only allow sound from one), then wait a moment:
    // a second click opens the songs, otherwise this was an on/off
    getAudioContext()
      ?.resume()
      .catch(() => {})
    if (clickTimer.current) {
      clearTimeout(clickTimer.current)
      clickTimer.current = 0
      setPicking(true)
      return
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = 0
      toggleMusic()
    }, DOUBLE_CLICK_MS)
  }

  if (!media.music && !tracks.length) return null
  const label = `${playing ? 'Music on — turn off' : 'Music off — turn on'}${choosable ? '. Press twice to choose a song' : ''}`
  return (
    <div className={`music ${className}`}>
      <button
        type="button"
        className={`music-btn ${playing ? 'is-playing' : ''}`}
        aria-pressed={playing}
        aria-label={label}
        title={choosable ? `${playing ? 'Music on' : 'Music off'} · double-click to choose a song` : playing ? 'Music on' : 'Music off'}
        onClick={onClick}
      >
        <canvas ref={canvas} className="music-btn__wave" aria-hidden="true" />
      </button>
      {choosable && <SongDialog open={picking} onClose={() => setPicking(false)} tracks={tracks} current={current} playing={playing} />}
    </div>
  )
}

/** The pop-up with every song; the one playing is marked. Esc, ×, or a click outside closes it. */
function SongDialog({ open, onClose, tracks, current, playing }) {
  const ref = useRef(null)
  const now = tracks.find((t) => t.id === current) ?? tracks[0]

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      dialog.querySelector('[aria-checked="true"]')?.focus() // start on the song that's playing
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  // arrow keys move through the list
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...ref.current.querySelectorAll('.songs__item')]
    const at = items.indexOf(document.activeElement)
    items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }

  return (
    <dialog
      ref={ref}
      className="songs"
      aria-labelledby="songs-title"
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // a click on the dimmed backdrop
      }}
    >
      <div className="songs__panel">
        <header className="songs__head">
          <div>
            <p className="songs__kicker">Music</p>
            <h2 id="songs-title" className="songs__title">
              Choose a song
            </h2>
          </div>
          <button type="button" className="songs__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M3.5 3.5l9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
            </svg>
          </button>
        </header>
        <ul className="songs__list" role="radiogroup" aria-labelledby="songs-title">
          {tracks.map((t, i) => {
            const on = t.id === now?.id
            return (
              <li key={t.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`songs__item ${on ? 'is-current' : ''}`}
                  onClick={() => {
                    selectTrack(t.id)
                    onClose()
                  }}
                >
                  <span className="songs__no">{String(i + 1).padStart(2, '0')}</span>
                  <span className="songs__name">{t.title}</span>
                  <span className={`songs__eq ${on && playing ? 'is-playing' : ''}`} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  {on && <span className="songs__now">{playing ? 'Playing' : 'Paused'}</span>}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="songs__foot">Click once to turn the music on or off, twice to come back here.</p>
      </div>
    </dialog>
  )
}
