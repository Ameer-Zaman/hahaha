import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { ago, useLiveAlerts, watchLabel } from './liveData'
import Side from './LiveSide'
import './live-notice.css'
import './live-bell.css'

/**
 * The bell in the header: a red count when a gang situation is live, and a click opens the
 * list — Gang A vs Gang B, the title, when it started and the link to watch. Works the same
 * on phones. Closes on a click outside, Esc, or moving to another page.
 */
export default function LiveBell({ className = '' }) {
  const { alerts, now } = useLiveAlerts()
  const { pathname } = useLocation()
  const [openOn, setOpenOn] = useState(null)
  const open = openOn === pathname
  const root = useRef(null)
  const trigger = useRef(null)
  const panelId = useId()
  const count = alerts.length

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!root.current?.contains(e.target)) setOpenOn(null)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenOn(null)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={root} className={`bell ${open ? 'is-open' : ''} ${count ? 'has-live' : ''} ${className}`}>
      <button
        ref={trigger}
        type="button"
        className="bell__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={count ? `Notifications: ${count} live now` : 'Notifications'}
        onClick={() => setOpenOn((cur) => (cur === pathname ? null : pathname))}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            d="M6 9.5a6 6 0 0 1 12 0c0 4.6 1.6 6.4 2.4 7.1a.5.5 0 0 1-.3.9H3.9a.5.5 0 0 1-.3-.9C4.4 15.9 6 14.1 6 9.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M10 20.5a2.2 2.2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {count > 0 && (
          <span className="bell__badge" aria-hidden="true">
            {count}
          </span>
        )}
      </button>

      <div id={panelId} className="bell__panel" role="region" aria-label="Notifications" inert={!open}>
        <p className="bell__head">
          {count > 0 ? (
            <>
              <span className="live__dot" aria-hidden="true" /> Live now
            </>
          ) : (
            'Notifications'
          )}
        </p>
        {count === 0 ? (
          <p className="bell__empty">
            Nothing live right now. When a gang situation is being streamed, it shows up here with the link to watch.
          </p>
        ) : (
          <ul className="bell__list" role="list">
            {alerts.map((a) => (
              <li key={a.id} className="bell__item">
                <p className="live__match">
                  <Side side={a.a} />
                  <span className="live__vs">vs</span>
                  <Side side={a.b} />
                </p>
                {a.title && <p className="live__title">{a.title}</p>}
                {a.note && <p className="live__note">{a.note}</p>}
                <div className="live__foot">
                  <span className="live__when">{ago(a.startedAt, now)}</span>
                  <a className="live__watch" href={a.url} target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                      <path d="M4 2.8v10.4L13 8 4 2.8Z" fill="currentColor" />
                    </svg>
                    {watchLabel(a.url)}
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
