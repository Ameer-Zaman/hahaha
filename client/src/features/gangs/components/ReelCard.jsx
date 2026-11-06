import '@fontsource/big-shoulders-display/latin-900'

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import Plate from '../../../components/media/Plate'
import RollText from '../../../components/ui/RollText'
import CardVideo from './CardVideo'

/** Time left as "3d 04h 12m", "04h 12m 09s" or "12m 09s" — finer as the end gets closer. */
function formatLeft(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`
  if (h > 0) return `${pad(h)}h ${pad(m)}m ${pad(sec)}s`
  return `${pad(m)}m ${pad(sec)}s`
}

/**
 * Active, or Suspended with a live countdown to when the suspension ends. When the time runs
 * out it turns back to Active by itself.
 */
function GangStatus({ until }) {
  const end = until ? new Date(until).getTime() : 0
  const [now, setNow] = useState(() => Date.now())
  const suspended = end > now

  useEffect(() => {
    if (!end || end <= Date.now()) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [end])

  if (!suspended) {
    return (
      <p className="gang-status gang-status--active">
        <span className="gang-status__dot" aria-hidden="true" />
        Active
      </p>
    )
  }
  const endsAt = new Date(end).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <p className="gang-status gang-status--suspended" title={`Suspension ends ${endsAt}`}>
      <span className="gang-status__dot" aria-hidden="true" />
      Suspended
      <span className="gang-status__left">
        <span className="visually-hidden">, ends in </span>
        <time dateTime={new Date(end).toISOString()}>{formatLeft(end - now)}</time>
      </span>
    </p>
  )
}

/**
 * One gang, set like a film's poster card: backdrop, the gang's name bottom-left with its
 * status above, and Explore bottom-right.
 */
export default function ReelCard({ file, active }) {
  return (
    <article
      className={`reel-card reel-card--${file.scene.tint} ${active ? 'is-active' : ''} ${file.reserved ? 'is-reserved' : ''}`}
      aria-labelledby={`gang-${file.slug}-title`}
      style={file.color ? { '--gang': file.color } : undefined}
      data-reel-card
    >
      <div className="reel-card__frame">
        <div className="reel-card__media" aria-hidden="true">
          <Plate image={file.image} seed={file.scene.seed} horizon={file.scene.horizon}>
            {file.video && <CardVideo src={file.video} playing={active} />}
          </Plate>
        </div>
        <div className="reel-card__tint" aria-hidden="true" />
        <div className="reel-card__shade" aria-hidden="true" />
        {file.demo && <span className="demo-tag">Demo data</span>}

        <div className="reel-card__body">
          {/* top left: whether the gang is active or suspended (with the time left), and its emblem */}
          {!file.reserved && (
            <div className="reel-card__topline">
              <GangStatus until={file.suspendedUntil} />
              {file.emblem && <img className="reel-card__emblem" src={file.emblem} alt="" loading="lazy" />}
            </div>
          )}
          <div className="reel-card__left">
            <h2 id={`gang-${file.slug}-title`} className="reel-card__title gang-name">
              <RollText text={file.title} rolled={active} />
            </h2>
          </div>

          <div className="reel-card__right">
            {/* Explore: a glowing map marker, like the start of a mission */}
            <Link to={`/gangs/${file.slug}`} className="blip" aria-label={`Explore ${file.title}: war record and players`}>
              <span className="blip__marker" aria-hidden="true">
                <span className="blip__pulse" />
                <span className="blip__core">
                  <svg viewBox="0 0 16 16" width="16" height="16">
                    <path
                      d="M3.5 3.5 8 8l-4.5 4.5M8.5 3.5 13 8l-4.5 4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </span>
              <span className="blip__text" aria-hidden="true">
                <span className="blip__label">Explore gang</span>
                <span className="blip__sub">War record · Players</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
