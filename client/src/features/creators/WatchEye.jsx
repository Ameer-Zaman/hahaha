import { useEffect, useId, useRef } from 'react'

/**
 * A realistic little eye for "people watching": a shaded white, a hazel iris with fibres and a
 * dark rim, a pupil that widens and narrows, two catchlights, and an upper lid with lashes that
 * really comes down when it blinks. It glances around at random, each eye on its own timing.
 * Still (looking ahead) for people who prefer less motion.
 */
const ALMOND = 'M2 12C9 2.5 31 2.5 38 12C31 21.5 9 21.5 2 12Z'
const LID_OPEN = -13 // the lid rests just over the top of the iris, like a real eye
const FIBRES = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2
  const r1 = 2.9 + (i % 3) * 0.25
  const r2 = 6.4 - (i % 2) * 0.5
  return `M${(20 + Math.cos(a) * r1).toFixed(2)} ${(12 + Math.sin(a) * r1).toFixed(2)}L${(20 + Math.cos(a) * r2).toFixed(2)} ${(12 + Math.sin(a) * r2).toFixed(2)}`
}).join('')

export default function WatchEye({ className = '' }) {
  const look = useRef(null)
  const pupil = useRef(null)
  const lid = useRef(null)
  const id = useId().replace(/:/g, '')

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const timers = new Set()
    const later = (fn, ms) => {
      const t = window.setTimeout(() => {
        timers.delete(t)
        fn()
      }, ms)
      timers.add(t)
    }
    const rand = (a, b) => a + Math.random() * (b - a)

    // glance: a quick dart (saccade) to a new spot, then hold; the pupil breathes a little
    const glance = () => {
      const centre = Math.random() < 0.25
      const x = centre ? 0 : rand(-4.6, 4.6)
      const y = centre ? 0 : rand(-1.7, 1.9)
      if (look.current) {
        look.current.style.transitionDuration = `${rand(60, 140)}ms`
        look.current.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`
      }
      if (pupil.current) pupil.current.style.transform = `scale(${rand(0.82, 1.18).toFixed(2)})`
      later(glance, rand(450, 2600))
    }
    // blink: the upper lid comes down and back up; now and then twice
    const shut = (ms) => {
      const el = lid.current
      if (!el) return
      el.style.transform = 'translateY(0px)'
      later(() => (el.style.transform = `translateY(${LID_OPEN}px)`), ms)
    }
    const blink = () => {
      shut(110)
      if (Math.random() < 0.2) later(() => shut(90), 260)
      later(blink, rand(2200, 6500))
    }
    later(glance, rand(200, 1200))
    later(blink, rand(1200, 4500))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [])

  return (
    <svg className={`watch-eye ${className}`} viewBox="0 0 40 24" aria-hidden="true">
      <defs>
        <clipPath id={`${id}c`}>
          <path d={ALMOND} />
        </clipPath>
        <radialGradient id={`${id}w`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#ede6e1" />
          <stop offset="1" stopColor="#c79d96" />
        </radialGradient>
        <radialGradient id={`${id}i`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e0a447" />
          <stop offset="0.35" stopColor="#a8682a" />
          <stop offset="0.75" stopColor="#5a3214" />
          <stop offset="1" stopColor="#24130a" />
        </radialGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${id}c)`}>
        <rect x="0" y="0" width="40" height="24" fill={`url(#${id}w)`} />
        <g ref={look} className="watch-eye__look">
          <circle cx="20" cy="12" r="7" fill={`url(#${id}i)`} />
          <path d={FIBRES} stroke="#f3cf8e" strokeOpacity="0.35" strokeWidth="0.35" />
          <circle cx="20" cy="12" r="6.7" fill="none" stroke="#120904" strokeWidth="0.9" />
          <circle ref={pupil} className="watch-eye__pupil" cx="20" cy="12" r="2.8" fill="#040404" />
          <circle cx="22.6" cy="9.5" r="1.35" fill="#fff" fillOpacity="0.92" />
          <circle cx="17.7" cy="14.2" r="0.55" fill="#fff" fillOpacity="0.55" />
        </g>
        {/* the shadow the upper lid casts on the eye */}
        <rect x="0" y="0" width="40" height="24" fill={`url(#${id}s)`} />
        {/* the upper lid with its lash line: rests high, comes down to blink */}
        <g ref={lid} className="watch-eye__lid" style={{ transform: `translateY(${LID_OPEN}px)` }}>
          <path d="M-2 -20H42V12C31 21.5 9 21.5 -2 12Z" fill="#2b2320" />
          <path d="M2 12C9 21.5 31 21.5 38 12" fill="none" stroke="#070505" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </g>
      {/* lower lid line and the crease above */}
      <path d="M3 12.6C10 20.6 30 20.6 37 12.6" fill="none" stroke="#000" strokeOpacity="0.45" strokeWidth="0.8" />
      <path d={ALMOND} fill="none" stroke="#120d0b" strokeOpacity="0.7" strokeWidth="0.7" />
      <path d="M4.5 8.2C11 0.6 29 0.6 35.5 8.2" fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="0.7" />
    </svg>
  )
}
