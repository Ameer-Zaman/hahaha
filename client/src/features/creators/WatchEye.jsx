import { useEffect, useId, useRef } from 'react'

/**
 * A small eye for "people watching": the pupil glances around at random, settles for a moment,
 * and now and then the eye blinks — each eye on the page on its own timing, like a real one.
 * Still (looking straight ahead) for people who prefer less motion.
 */
export default function WatchEye({ className = '' }) {
  const look = useRef(null)
  const lid = useRef(null)
  const clip = useId().replace(/:/g, '')

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    let timer = 0
    let blinkTimer = 0
    const rand = (a, b) => a + Math.random() * (b - a)

    // glance: a quick dart to a new spot, then hold it (sometimes back to the middle)
    const glance = () => {
      const centre = Math.random() < 0.25
      const x = centre ? 0 : rand(-4.2, 4.2)
      const y = centre ? 0 : rand(-1.8, 1.8)
      if (look.current) {
        look.current.style.transitionDuration = `${rand(90, 180)}ms`
        look.current.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`
      }
      timer = window.setTimeout(glance, rand(500, 2600))
    }
    // blink every few seconds, sometimes twice in a row
    const blink = () => {
      const el = lid.current
      if (el) {
        el.classList.add('is-blink')
        window.setTimeout(() => el.classList.remove('is-blink'), 140)
        if (Math.random() < 0.2) {
          window.setTimeout(() => {
            el.classList.add('is-blink')
            window.setTimeout(() => el.classList.remove('is-blink'), 120)
          }, 260)
        }
      }
      blinkTimer = window.setTimeout(blink, rand(2400, 6500))
    }
    timer = window.setTimeout(glance, rand(200, 1200))
    blinkTimer = window.setTimeout(blink, rand(1500, 5000))
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(blinkTimer)
    }
  }, [])

  return (
    <svg className={`watch-eye ${className}`} viewBox="0 0 24 16" aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <path d="M1.5 8C5.5 1.8 18.5 1.8 22.5 8C18.5 14.2 5.5 14.2 1.5 8Z" />
        </clipPath>
      </defs>
      <g ref={lid} className="watch-eye__lid">
        <path className="watch-eye__white" d="M1.5 8C5.5 1.8 18.5 1.8 22.5 8C18.5 14.2 5.5 14.2 1.5 8Z" />
        <g clipPath={`url(#${clip})`}>
          <g ref={look} className="watch-eye__look">
            <circle className="watch-eye__iris" cx="12" cy="8" r="4" />
            <circle className="watch-eye__pupil" cx="12" cy="8" r="1.9" />
            <circle className="watch-eye__glint" cx="13.3" cy="6.6" r="0.75" />
          </g>
        </g>
        <path className="watch-eye__outline" d="M1.5 8C5.5 1.8 18.5 1.8 22.5 8C18.5 14.2 5.5 14.2 1.5 8Z" />
      </g>
    </svg>
  )
}
