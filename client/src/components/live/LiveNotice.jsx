import { useState } from 'react'

import { ago, useLiveAlerts, watchLabel } from './liveData'
import Side from './LiveSide'
import './live-notice.css'

const SEEN_KEY = 'rameirah:live-hidden'
const readHidden = () => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')
  } catch {
    return []
  }
}

/**
 * The LIVE notification: when an admin sends a live gang situation from Panel → Live, every
 * visitor sees it in the corner of every page — Gang A vs Gang B and a button to watch the
 * stream. Closing it hides it (the bell in the header still lists it); it disappears by
 * itself when the admin ends it or its time runs out.
 */
export default function LiveNotice() {
  const { alerts, now } = useLiveAlerts()
  const [hidden, setHidden] = useState(readHidden)

  const shown = alerts.filter((a) => !hidden.includes(a.id))
  if (shown.length === 0) return null
  const persist = (ids) => {
    // only remember the ones still live, so the list doesn't grow forever
    const keep = ids.filter((id) => alerts.some((a) => a.id === id))
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(keep))
    } catch {
      /* private window: just for this visit */
    }
    setHidden(keep)
  }

  return (
    <aside className="live" aria-label="Live now">
      <ul className="live__list" role="list">
        {shown.slice(0, 3).map((a) => (
          <li key={a.id} className="live__card">
            <div className="live__top">
              <p className="live__badge">
                <span className="live__dot" aria-hidden="true" />
                Live now
              </p>
              <button
                type="button"
                className="live__close"
                onClick={() => persist([...hidden, a.id])}
                aria-label="Hide this live notification"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M3.5 3.5l9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
                </svg>
              </button>
            </div>

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
    </aside>
  )
}
