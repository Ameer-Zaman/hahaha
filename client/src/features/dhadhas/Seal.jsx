import { useEffect, useId, useRef } from 'react'

const RING = 'THE DHADHAS · LOYALTY · HONOUR · FAMILY · '

/**
 * The Dhadhas seal: a milled gold rim, a ring of lettering that turns slowly, and in the middle
 * the clan's emblem (from Panel → Dhadhas) or, without one, the built-in mark — a carved "D"
 * on an eight-point star. It tilts a little towards the pointer and catches the light as it does
 * (`still`: a small badge that doesn't move).
 * Original artwork, drawn here in SVG.
 */
export default function Seal({ emblem, still = false }) {
  const id = useId().replace(/:/g, '')
  const ref = useRef(null)

  // tilt towards the pointer (fine pointers only, and not with reduced motion)
  useEffect(() => {
    const el = ref.current
    if (still || !el || !window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return undefined
    let raf = 0
    const target = { x: 0, y: 0 }
    const now = { x: 0, y: 0 }
    const tick = () => {
      now.x += (target.x - now.x) * 0.08
      now.y += (target.y - now.y) * 0.08
      el.style.setProperty('--tx', now.x.toFixed(4))
      el.style.setProperty('--ty', now.y.toFixed(4))
      raf = Math.abs(target.x - now.x) + Math.abs(target.y - now.y) > 0.001 ? requestAnimationFrame(tick) : 0
    }
    const move = (e) => {
      const r = el.getBoundingClientRect()
      target.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)))
      target.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)))
      if (!raf) raf = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      cancelAnimationFrame(raf)
    }
  }, [still])

  const teeth = Array.from({ length: 120 }, (_, i) => i * 3)
  const ticks = Array.from({ length: 48 }, (_, i) => i * 7.5)

  return (
    <div ref={ref} className={`dh-seal${still ? ' dh-seal--still' : ''}`} aria-hidden="true">
      <div className="dh-seal__body">
        <svg viewBox="0 0 400 400" className="dh-seal__svg">
          <defs>
            <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fbe7b0" />
              <stop offset="0.28" stopColor="#d9a94f" />
              <stop offset="0.55" stopColor="#8f6420" />
              <stop offset="0.78" stopColor="#e8c477" />
              <stop offset="1" stopColor="#7a531a" />
            </linearGradient>
            <radialGradient id={`${id}r`} cx="0.5" cy="0.42" r="0.62">
              <stop offset="0" stopColor="#6e141b" />
              <stop offset="0.55" stopColor="#3a0a0f" />
              <stop offset="1" stopColor="#150407" />
            </radialGradient>
            <radialGradient id={`${id}b`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0.8" stopColor="#0d0507" />
              <stop offset="1" stopColor="#1d0a0c" />
            </radialGradient>
            <path id={`${id}p`} d="M200 200m-163 0a163 163 0 1 1 326 0a163 163 0 1 1 -326 0" />
            <clipPath id={`${id}c`}>
              <circle cx="200" cy="200" r="118" />
            </clipPath>
          </defs>

          {/* the milled rim */}
          <g fill={`url(#${id}g)`}>
            {teeth.map((a) => (
              <rect key={a} x="198.2" y="2" width="3.6" height="14" rx="1" transform={`rotate(${a} 200 200)`} />
            ))}
          </g>
          <circle cx="200" cy="200" r="190" fill={`url(#${id}g)`} />
          <circle cx="200" cy="200" r="183" fill={`url(#${id}b)`} />
          <circle cx="200" cy="200" r="183" fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth="2" />

          {/* the turning ring of lettering */}
          <g className="dh-seal__ring">
            <text className="dh-seal__ringtext" fill={`url(#${id}g)`}>
              <textPath href={`#${id}p`} startOffset="0" textLength="1022" lengthAdjust="spacing">
                {RING + RING}
              </textPath>
            </text>
          </g>

          {/* the inner field */}
          <circle cx="200" cy="200" r="144" fill={`url(#${id}g)`} />
          <circle cx="200" cy="200" r="139" fill={`url(#${id}r)`} />
          <g stroke={`url(#${id}g)`} strokeWidth="1.4" strokeLinecap="round" opacity="0.75">
            {ticks.map((a) => (
              <line key={a} x1="200" y1="66" x2="200" y2={a % 45 === 0 ? 80 : 73} transform={`rotate(${a} 200 200)`} />
            ))}
          </g>

          {emblem ? (
            <g clipPath={`url(#${id}c)`}>
              <circle cx="200" cy="200" r="118" fill="#0c0405" />
              <image href={emblem} x="82" y="82" width="236" height="236" preserveAspectRatio="xMidYMid slice" />
            </g>
          ) : (
            <g>
              {/* an eight-point star, a carved D, a diamond above and below */}
              <g fill="none" stroke={`url(#${id}g)`} strokeWidth="2" opacity="0.9">
                <rect x="122" y="122" width="156" height="156" transform="rotate(45 200 200)" />
                <rect x="122" y="122" width="156" height="156" />
              </g>
              <circle cx="200" cy="200" r="86" fill="#1b0609" stroke={`url(#${id}g)`} strokeWidth="2.5" />
              <circle cx="200" cy="200" r="78" fill="none" stroke={`url(#${id}g)`} strokeWidth="0.8" opacity="0.6" />
              <text x="200" y="236" textAnchor="middle" className="dh-seal__mono" fill={`url(#${id}g)`}>
                D
              </text>
              <path d="M200 98l7 9-7 9-7-9z" fill={`url(#${id}g)`} />
              <path d="M200 284l7 9-7 9-7-9z" fill={`url(#${id}g)`} />
            </g>
          )}
          <circle cx="200" cy="200" r="118" fill="none" stroke={`url(#${id}g)`} strokeWidth={emblem ? 3 : 0} />
        </svg>
        <span className="dh-seal__sheen" />
      </div>
      <span className="dh-seal__glow" />
    </div>
  )
}
