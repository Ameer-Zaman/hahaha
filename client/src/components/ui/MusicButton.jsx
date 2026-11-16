import { useEffect, useId, useRef, useState } from 'react'

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

/**
 * Header control for the background music: glowing waves that move with the music while it
 * plays, a flat line when it's off. When staff have added songs (Panel → Music), a small arrow
 * under it opens the list to pick one.
 */
export default function MusicButton({ className = '' }) {
  const { playing, tracks, current } = useMusic()
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

  if (!media.music && !tracks.length) return null
  return (
    <div className={`music ${className}`}>
      <button
        type="button"
        className={`music-btn ${playing ? 'is-playing' : ''}`}
        aria-pressed={playing}
        aria-label={playing ? 'Music on — turn off' : 'Music off — turn on'}
        title={playing ? 'Music on' : 'Music off'}
        onClick={toggleMusic}
      >
        <canvas ref={canvas} className="music-btn__wave" aria-hidden="true" />
      </button>
      {tracks.length > 1 && <SongMenu tracks={tracks} current={current} playing={playing} />}
    </div>
  )
}

/** The small arrow under the music button, and the list of songs it opens. */
function SongMenu({ tracks, current, playing }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const toggle = useRef(null)
  const id = useId()
  const now = tracks.find((t) => t.id === current) ?? tracks[0]

  // close on a click elsewhere, or Esc (focus goes back to the arrow)
  useEffect(() => {
    if (!open) return undefined
    const away = (e) => !root.current?.contains(e.target) && setOpen(false)
    const key = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggle.current?.focus()
      }
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', key)
    // start on the song that's playing
    root.current?.querySelector('[aria-checked="true"]')?.focus()
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  // arrow keys move through the list
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...root.current.querySelectorAll('.song-menu__item')]
    const at = items.indexOf(document.activeElement)
    items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }

  return (
    <div className="song-menu" ref={root}>
      <button
        ref={toggle}
        type="button"
        className={`song-menu__toggle ${open ? 'is-open' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Change song — now: ${now?.title ?? ''}`}
        title="Change song"
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div id={id} className="song-menu__panel" role="menu" aria-label="Songs" onKeyDown={onKeyDown}>
          <p className="song-menu__head">Music</p>
          <ul className="song-menu__list" role="none">
            {tracks.map((t) => {
              const on = t.id === now?.id
              return (
                <li key={t.id} role="none">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={on}
                    className={`song-menu__item ${on ? 'is-current' : ''}`}
                    onClick={() => {
                      selectTrack(t.id)
                      setOpen(false)
                      toggle.current?.focus()
                    }}
                  >
                    <span className={`song-menu__eq ${on && playing ? 'is-playing' : ''}`} aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="song-menu__title">{t.title}</span>
                    {on && <span className="song-menu__now">{playing ? 'Playing' : 'Paused'}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
