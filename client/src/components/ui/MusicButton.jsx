import { useEffect, useRef, useState } from 'react'

import { getAudioContext } from '../../lib/introSound'
import { musicLevel, selectTrack, toggleMusic, useMusic } from '../../lib/music'
import { media } from '../../config/site'
import './music-button.css'

/*
 * The button's orb: a small sphere of black glass with a thin gold rim and a glossy
 * highlight. Inside, a molten-gold core of a few drifting blobs swirls and swells with the
 * music; with the music off it cools to a dim, still ember.
 */
const CORE = [
  { color: '255,206,120', r: 0.5, a: 0, sp: 1.0 },
  { color: '227,160,60', r: 0.42, a: 2.1, sp: -1.3 },
  { color: '255,236,190', r: 0.3, a: 4.2, sp: 1.7 },
]

function draw(ctx, size, t, level) {
  const c = size / 2
  const R = c * 0.86
  ctx.clearRect(0, 0, size, size)

  // a warm glow around the orb while it plays
  if (level > 0.02) {
    const glow = ctx.createRadialGradient(c, c, R * 0.8, c, c, c)
    glow.addColorStop(0, `rgba(227,170,80,${0.35 * level})`)
    glow.addColorStop(1, 'rgba(227,170,80,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, size, size)
  }

  ctx.save()
  ctx.beginPath()
  ctx.arc(c, c, R, 0, Math.PI * 2)
  ctx.clip()
  // black glass, a little lighter towards the bottom where light passes through
  const glass = ctx.createRadialGradient(c, c * 1.3, R * 0.1, c, c, R)
  glass.addColorStop(0, '#2a2118')
  glass.addColorStop(1, '#070605')
  ctx.fillStyle = glass
  ctx.fillRect(0, 0, size, size)

  // the molten core
  ctx.globalCompositeOperation = 'lighter'
  const heat = 0.22 + 1.1 * level
  for (const b of CORE) {
    const orbit = R * (0.12 + 0.2 * level)
    const x = c + Math.cos(t * b.sp + b.a) * orbit
    const y = c + Math.sin(t * b.sp * 1.2 + b.a) * orbit
    const rr = R * b.r * (0.8 + 0.55 * level + 0.08 * Math.sin(t * 3 + b.a))
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr)
    g.addColorStop(0, `rgba(${b.color},${0.95 * heat})`)
    g.addColorStop(0.5, `rgba(${b.color},${0.4 * heat})`)
    g.addColorStop(1, `rgba(${b.color},0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }

  // glossy highlight on top, and a darker edge so it reads as a sphere
  ctx.globalCompositeOperation = 'source-over'
  const shine = ctx.createLinearGradient(0, c - R, 0, c)
  shine.addColorStop(0, 'rgba(255,255,255,0.2)')
  shine.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = shine
  ctx.beginPath()
  ctx.ellipse(c, c - R * 0.55, R * 0.55, R * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()
  const edge = ctx.createRadialGradient(c, c, R * 0.7, c, c, R)
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, size, size)
  ctx.restore()

  // the thin gold rim
  ctx.beginPath()
  ctx.arc(c, c, R, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(227,181,90,${0.45 + 0.4 * level})`
  ctx.lineWidth = Math.max(1, size / 44)
  ctx.stroke()
}

/** How long to wait for a second click before treating the first as a plain on/off. */
const DOUBLE_CLICK_MS = 260

/**
 * Header control for the background music: a small black-glass orb whose molten-gold core
 * swirls with the music while it plays and cools to an ember when it's off. One click turns it
 * on or off; when staff have added songs (Panel → Music), a double click opens the player.
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
    }
    size()
    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      // a floor so the waves keep breathing in the quiet bits; zero when the music is off
      const target = playingRef.current ? (still ? 0.8 : Math.max(0.5, Math.min(1, 0.35 + musicLevel()))) : 0
      const rate = target > shown ? 14 : 5 // jump up with a beat, fall back more gently
      shown += (target - shown) * (1 - Math.exp(-rate * dt))
      draw(ctx, el.width, still ? 0 : now / 1000, shown)
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
      size()
      wake.current()
    }
    window.addEventListener('resize', resize)
    draw(ctx, el.width, 0, 0)
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

/*
 * The player's orb: soft blobs of gold, amber, rose and ivory drifting inside a sphere and
 * blending into each other, swelling with the music. Drawn on a canvas, additive light.
 */
const BLOBS = [
  { color: '255,196,92', r: 0.62, sx: 0.31, sy: 0.27, ph: 0 },
  { color: '255,122,58', r: 0.55, sx: -0.23, sy: 0.37, ph: 1.7 },
  { color: '255,94,120', r: 0.48, sx: 0.41, sy: -0.21, ph: 3.1 },
  { color: '255,240,214', r: 0.4, sx: -0.37, sy: -0.29, ph: 4.4 },
  { color: '178,120,255', r: 0.36, sx: 0.19, sy: 0.43, ph: 5.6 },
]

function drawOrb(ctx, size, t, level) {
  const c = size / 2
  const R = size * (0.3 + 0.06 * level)
  ctx.clearRect(0, 0, size, size)
  // the halo around the sphere
  const halo = ctx.createRadialGradient(c, c, R * 0.6, c, c, c * 0.98) // fades out before the canvas edge
  halo.addColorStop(0, `rgba(255,170,80,${0.28 + 0.3 * level})`)
  halo.addColorStop(1, 'rgba(255,120,60,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, size, size)
  // the blobs, clipped to the sphere
  ctx.save()
  ctx.beginPath()
  ctx.arc(c, c, R, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = '#0b0605'
  ctx.fillRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'lighter'
  for (const b of BLOBS) {
    const speed = 0.35 + level * 0.9
    const x = c + Math.sin(t * speed * (0.6 + b.sx) + b.ph) * R * 0.55
    const y = c + Math.cos(t * speed * (0.5 + b.sy) + b.ph * 1.3) * R * 0.55
    const rr = R * b.r * (1 + 0.35 * level * Math.sin(t * 2.3 + b.ph))
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 1.6)
    g.addColorStop(0, `rgba(${b.color},0.95)`)
    g.addColorStop(0.45, `rgba(${b.color},0.45)`)
    g.addColorStop(1, `rgba(${b.color},0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  // a glassy highlight and a soft dark rim, so it reads as a sphere
  ctx.globalCompositeOperation = 'source-over'
  const shine = ctx.createRadialGradient(c - R * 0.35, c - R * 0.45, 0, c - R * 0.35, c - R * 0.45, R * 0.7)
  shine.addColorStop(0, 'rgba(255,255,255,0.35)')
  shine.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = shine
  ctx.fillRect(0, 0, size, size)
  const rim = ctx.createRadialGradient(c, c, R * 0.75, c, c, R)
  rim.addColorStop(0, 'rgba(0,0,0,0)')
  rim.addColorStop(1, 'rgba(0,0,0,0.45)')
  ctx.fillStyle = rim
  ctx.fillRect(0, 0, size, size)
  ctx.restore()
}

/**
 * The song player, opened with a double click: light flowing round the edges of the screen,
 * a glowing orb that moves with the music, the song's name, play/pause and previous/next,
 * and every song in a list. Esc, ×, or a click outside the controls closes it.
 */
function SongDialog({ open, onClose, tracks, current, playing }) {
  const ref = useRef(null)
  const orb = useRef(null)
  const glow = useRef(null)
  const at = Math.max(
    0,
    tracks.findIndex((t) => t.id === current),
  )
  const now = tracks[at]
  const step = (d) => selectTrack(tracks[(at + d + tracks.length) % tracks.length].id)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      dialog.querySelector('.player__play')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  // the orb and the edge light follow the music while the player is open
  useEffect(() => {
    if (!open) return undefined
    const el = orb.current
    const ctx = el.getContext('2d')
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const size = Math.round(el.clientWidth * dpr)
    el.width = el.height = size
    let raf = 0
    let level = 0
    let last = performance.now()
    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const target = musicLevel() ? Math.min(1, 0.25 + musicLevel()) : 0.12
      level += (target - level) * (1 - Math.exp(-(target > level ? 12 : 4) * dt))
      drawOrb(ctx, size, still ? 1 : now / 1000, still ? 0.5 : level)
      glow.current?.style.setProperty('--level', level.toFixed(3))
      if (!still) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [open])

  return (
    <dialog
      ref={ref}
      className="player"
      aria-labelledby="player-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current || e.target.classList.contains('player__stage')) onClose() // outside the controls
      }}
    >
      <span ref={glow} className="player__edge" aria-hidden="true">
        <i />
        <i />
      </span>
      <div className="player__stage">
        <button type="button" className="player__close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M3.5 3.5l9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>

        <div className="player__main">
          <canvas ref={orb} className="player__orb" aria-hidden="true" />
          <p className="player__kicker">{playing ? 'Now playing' : 'Paused'}</p>
          <h2 id="player-title" className="player__title">
            {now?.title}
          </h2>

          <div className="player__controls">
            <button type="button" className="player__skip" onClick={() => step(-1)} aria-label="Previous song">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M7 6v12M18 6l-8 6 8 6z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="player__play" onClick={toggleMusic} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? (
                <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                  <rect x="6.5" y="5" width="3.6" height="14" rx="1" fill="currentColor" />
                  <rect x="13.9" y="5" width="3.6" height="14" rx="1" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                  <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <button type="button" className="player__skip" onClick={() => step(1)} aria-label="Next song">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path d="M17 6v12M6 6l8 6-8 6z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <ul className="player__list" role="radiogroup" aria-label="Songs">
          {tracks.map((t, i) => {
            const on = i === at
            return (
              <li key={t.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`player__song ${on ? 'is-current' : ''}`}
                  onClick={() => selectTrack(t.id)}
                >
                  <span className="player__no">{String(i + 1).padStart(2, '0')}</span>
                  <span className="player__name">{t.title}</span>
                  <span className={`player__eq ${on && playing ? 'is-playing' : ''}`} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </dialog>
  )
}
