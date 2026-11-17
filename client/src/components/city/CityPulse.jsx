import { useEffect, useRef } from 'react'

import { formatCount, setHeroInView, useCityStatus, useHeroInView } from './cityStatus'
import './city-pulse.css'

/**
 * "How many players are in the city": a breathing green dot and the count.
 *   variant="header" — compact, for the top bar: 42 / 128
 *   variant="hero"   — a line with a fill bar under the home page's buttons
 *   variant="float"  — a badge in the bottom-left corner on wide screens, where the header has
 *                      no room; it steps aside while the home page's own line is on screen
 * Renders nothing until there is a real reading, and nothing when no server is set.
 */
export default function CityPulse({ variant = 'header', className = '' }) {
  const city = useCityStatus()
  const heroInView = useHeroInView()
  if (!city) return null
  if (variant === 'float' && heroInView) return null
  const on = city.state === 'online'
  const { players, max } = city
  const words = on
    ? `${formatCount(players)}${max ? ` of ${formatCount(max)}` : ''} ${players === 1 ? 'player' : 'players'} in the city right now`
    : 'The city server is offline right now'
  const fill = on && max ? Math.min(1, players / max) : 0

  if (variant === 'hero') {
    return (
      <HeroLine className={`city city--hero ${on ? 'is-on' : 'is-off'} ${className}`} fill={fill}>
        <span className="city__dot" aria-hidden="true" />
        {on ? (
          <span className="city__text" aria-hidden="true">
            <span className="city__count">
              {formatCount(players)}
              {max ? <span className="city__max"> / {formatCount(max)}</span> : null}
            </span>
            <span className="city__label">{players === 1 ? 'player' : 'players'} in the city</span>
          </span>
        ) : (
          <span className="city__label" aria-hidden="true">
            City offline
          </span>
        )}
        {on && max ? <span className="city__bar" aria-hidden="true" /> : null}
        <span className="visually-hidden">{words}</span>
      </HeroLine>
    )
  }

  return (
    <p className={`city city--${variant === 'float' ? 'float' : 'header'} ${on ? 'is-on' : 'is-off'} ${className}`} title={words}>
      <span className="city__dot" aria-hidden="true" />
      <span aria-hidden="true" className="city__count">
        {on ? formatCount(players) : 'Offline'}
        {on && max ? <span className="city__max">/{formatCount(max)}</span> : null}
      </span>
      {on && (
        <span aria-hidden="true" className="city__tag">
          in city
        </span>
      )}
      <span className="visually-hidden">{words}</span>
    </p>
  )
}

/** The home page's line, which tells the floating badge when it is on screen. */
function HeroLine({ className, fill, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([entry]) => setHeroInView(entry.isIntersecting))
    io.observe(el)
    return () => {
      io.disconnect()
      setHeroInView(false)
    }
  }, [])
  return (
    <p ref={ref} className={className} style={{ '--fill': fill }}>
      {children}
    </p>
  )
}
