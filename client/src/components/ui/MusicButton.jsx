import { useEffect, useRef, useState } from 'react'

import { getAudioContext } from '../../lib/introSound'
import { musicLevel, selectTrack, toggleMusic, useMusic } from '../../lib/music'
import { media } from '../../config/site'
import './music-button.css'

/*
 * The button's orb: a sphere of dark glass with ribbons of liquid light inside.
 *
 * Four soft, translucent ribbons — gold, amber, copper and champagne — each a slowly
 * morphing blob, turn round the centre at their own speed and add up where they overlap.
 * Turning the music on, they bloom out from a spark in the middle with a little overshoot,
 * then breathe and swell with the beat; turning it off, they draw back into a small ember.
 * Everything is driven by two numbers: `energy` (on/off, sprung) and `level` (the music).
 */
const RIBBONS = [
  { color: [255, 186, 64], size: 0.78, spin: 0.55, phase: 0.0, lobes: [2, 3], wob: 0.16 },
  { color: [255, 118, 36], size: 0.7, spin: -0.75, phase: 1.7, lobes: [3, 2], wob: 0.2 },
  { color: [226, 74, 58], size: 0.62, spin: 0.95, phase: 3.4, lobes: [2, 4], wob: 0.22 },
  { color: [255, 226, 168], size: 0.5, spin: -1.2, phase: 5.0, lobes: [3, 5], wob: 0.14 },
]
const STEPS = 56

/** One ribbon: a closed, smooth blob whose edge ripples with two slow waves. */
function blob(ctx, cx, cy, radius, t, r) {
  const pts = []
  for (let i = 0; i < STEPS; i++) {
    const a = (i / STEPS) * Math.PI * 2
    const k = 1 + r.wob * Math.sin(r.lobes[0] * a + t * 1.3 + r.phase) + r.wob * 0.6 * Math.sin(r.lobes[1] * a - t * 0.9 + r.phase * 1.7)
    pts.push([cx + Math.cos(a) * radius * k, cy + Math.sin(a) * radius * k * 0.86])
  }
  ctx.beginPath()
  // smooth curve through the points (midpoint quadratic Béziers)
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
  let m = mid(pts[STEPS - 1], pts[0])
  ctx.moveTo(m[0], m[1])
  for (let i = 0; i < STEPS; i++) {
    const p = pts[i]
    m = mid(p, pts[(i + 1) % STEPS])
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1])
  }
  ctx.closePath()
}

function draw(ctx, size, t, energy, level) {
  const c = size / 2
  const R = size * 0.3 // the glass sphere; the canvas is larger so the glow has room
  const e = Math.max(0, energy)
  ctx.clearRect(0, 0, size, size)

  // the halo: warm light spilling round the sphere, pulsing with the music
  const haloA = 0.08 + 0.42 * Math.min(1.2, e) * (0.6 + 0.6 * level)
  const halo = ctx.createRadialGradient(c, c, R * 0.7, c, c, c)
  halo.addColorStop(0, `rgba(255,170,80,${haloA})`)
  halo.addColorStop(0.45, `rgba(227,140,60,${haloA * 0.35})`)
  halo.addColorStop(1, 'rgba(227,140,60,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, size, size)

  ctx.save()
  ctx.beginPath()
  ctx.arc(c, c, R, 0, Math.PI * 2)
  ctx.clip()

  // dark glass, faintly warm at the bottom where light passes through
  const glass = ctx.createRadialGradient(c, c + R * 0.45, R * 0.05, c, c, R * 1.05)
  glass.addColorStop(0, '#2b1d10')
  glass.addColorStop(1, '#050403')
  ctx.fillStyle = glass
  ctx.fillRect(0, 0, size, size)

  // the ribbons of light: each a soft glowing band (a wide faint stroke under a fine bright one)
  // over a faint fill, so the colours stay apart and only glow white where they cross
  ctx.globalCompositeOperation = 'screen'
  const bloom = 0.25 + 0.75 * e // off: a small ember; on: filling the sphere
  const lit = Math.min(1, e)
  for (const r of RIBBONS) {
    const swell = 1 + 0.18 * level * Math.sin(t * 2.2 + r.phase) + 0.1 * level
    const radius = R * r.size * bloom * swell
    const turn = t * r.spin + r.phase
    const drift = R * 0.1 * lit
    const [cr, cg, cb] = r.color
    const a = 0.25 + 0.6 * lit * (0.8 + 0.3 * level)
    ctx.save()
    ctx.translate(c + Math.cos(turn * 0.7) * drift, c + Math.sin(turn * 0.9) * drift)
    ctx.rotate(turn)
    blob(ctx, 0, 0, radius, t, r)
    const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
    fill.addColorStop(0, `rgba(${cr},${cg},${cb},${a * 0.05})`)
    fill.addColorStop(1, `rgba(${cr},${cg},${cb},${a * 0.2})`)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.lineJoin = 'round'
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a * 0.22})`
    ctx.lineWidth = R * 0.22
    ctx.stroke()
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a * 0.5})`
    ctx.lineWidth = R * 0.09
    ctx.stroke()
    ctx.strokeStyle = `rgba(255,240,215,${a * 0.55})`
    ctx.lineWidth = Math.max(1, R * 0.025)
    ctx.stroke()
    ctx.restore()
  }

  // a small warm heart where the ribbons meet
  const heart = ctx.createRadialGradient(c, c, 0, c, c, R * (0.16 + 0.16 * lit + 0.08 * level))
  heart.addColorStop(0, `rgba(255,236,200,${0.35 + 0.4 * lit})`)
  heart.addColorStop(1, 'rgba(255,200,130,0)')
  ctx.fillStyle = heart
  ctx.fillRect(0, 0, size, size)

  // glass: a soft highlight on top and a darker rim, so it reads as a sphere
  ctx.globalCompositeOperation = 'source-over'
  const edge = ctx.createRadialGradient(c, c, R * 0.62, c, c, R)
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(0,0,0,0.6)')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, size, size)
  const shine = ctx.createLinearGradient(0, c - R, 0, c - R * 0.35)
  shine.addColorStop(0, `rgba(255,255,255,${0.06 + 0.08 * lit})`)
  shine.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = shine
  ctx.beginPath()
  ctx.ellipse(c, c - R * 0.62, R * 0.42, R * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // the rim: a hairline of gold, brighter while it plays
  ctx.beginPath()
  ctx.arc(c, c, R, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(240,196,110,${0.35 + 0.45 * Math.min(1, e)})`
  ctx.lineWidth = Math.max(1, size / 70)
  ctx.stroke()
}

/** How long to wait for a second click before treating the first as a plain on/off. */
const DOUBLE_CLICK_MS = 260

/**
 * Header control for the background music: a small dark-glass orb whose ribbons of light
 * bloom and move with the music while it plays and draw back to an ember when it's off. One click turns it
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
    // energy: 0 = off, 1 = on, moved by a spring so switching on blooms with a small overshoot
    let energy = playingRef.current ? 1 : 0
    let velocity = 0
    let level = 0 // the music's loudness, smoothed
    let clock = 0 // the ribbons' own time: slow when off, full speed when on
    let last = performance.now()
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      el.width = Math.round(el.clientWidth * dpr)
      el.height = Math.round(el.clientHeight * dpr)
    }
    size()
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const on = playingRef.current
      if (still) {
        energy = on ? 1 : 0
        level = on ? 0.5 : 0
      } else {
        // spring towards on/off (stiff, lightly damped: a quick bloom, a soft settle)
        const force = 170 * ((on ? 1 : 0) - energy) - 15 * velocity
        velocity += force * dt
        energy += velocity * dt
        const target = on ? Math.min(1, musicLevel() * 1.4) : 0
        level += (target - level) * (1 - Math.exp(-(target > level ? 18 : 6) * dt))
        clock += dt * (0.25 + 0.9 * Math.max(0, Math.min(1, energy)) + 0.8 * level)
      }
      draw(ctx, el.width, clock, energy, level)
      // keep drawing while playing or still settling; stop once at rest
      const settling = Math.abs(velocity) > 0.002 || Math.abs((on ? 1 : 0) - energy) > 0.002
      raf = !still && (on || settling) ? requestAnimationFrame(frame) : 0
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
    draw(ctx, el.width, 0, energy, 0)
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

/**
 * The song player, opened with a double click: light flowing round the edges of the screen
 * that brightens with the music, the song's name, play/pause and previous/next, and every
 * song in a list. Esc, ×, or a click outside the controls closes it.
 */
function SongDialog({ open, onClose, tracks, current, playing }) {
  const ref = useRef(null)
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

  // the edge light follows the music while the player is open
  useEffect(() => {
    if (!open || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let raf = 0
    let level = 0
    let last = performance.now()
    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const target = musicLevel() ? Math.min(1, 0.25 + musicLevel()) : 0.12
      level += (target - level) * (1 - Math.exp(-(target > level ? 12 : 4) * dt))
      glow.current?.style.setProperty('--level', level.toFixed(3))
      raf = requestAnimationFrame(frame)
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
