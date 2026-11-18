import { formatCount, useCityStatus } from './cityStatus'
import './city-pulse.css'

/**
 * "How many players are in the city": a breathing green dot and the count.
 *   variant="header" — compact, for the top bar: 42 / 128
 *   variant="hero"   — a line with a fill bar under the home page's buttons
 * Renders nothing until there is a real reading, and nothing when no server is set. When the
 * count changes, the new number rolls in.
 */
export default function CityPulse({ variant = 'header', className = '' }) {
  const city = useCityStatus()
  if (!city) return null
  const on = city.state === 'online'
  const { players, max } = city
  const words = on
    ? `${formatCount(players)}${max ? ` of ${formatCount(max)}` : ''} ${players === 1 ? 'player' : 'players'} in the city right now`
    : 'The city server is offline right now'
  const fill = on && max ? Math.min(1, players / max) : 0

  if (variant === 'hero') {
    return (
      <p className={`city city--hero ${on ? 'is-on' : 'is-off'} ${className}`} style={{ '--fill': fill }}>
        <span className="city__dot" aria-hidden="true" />
        {on ? (
          <span className="city__text" aria-hidden="true">
            <span className="city__count">
              <span key={players} className="city__num">
                {formatCount(players)}
              </span>
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
      </p>
    )
  }

  return (
    <p className={`city city--header ${on ? 'is-on' : 'is-off'} ${className}`} title={words}>
      <span className="city__dot" aria-hidden="true" />
      <span aria-hidden="true" className="city__count">
        {on ? (
          <span key={players} className="city__num">
            {formatCount(players)}
          </span>
        ) : (
          'Offline'
        )}
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
