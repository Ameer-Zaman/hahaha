import { useEffect, useState } from 'react'

import { usePublic } from '../../lib/publicData'
import './live-notice.css'

const SEEN_KEY = 'rameirah:live-hidden'
const HOSTS = [
  [/(^|\.)twitch\.tv$/i, 'Twitch'],
  [/(^|\.)(youtube\.com|youtu\.be)$/i, 'YouTube'],
  [/(^|\.)kick\.com$/i, 'Kick'],
  [/(^|\.)tiktok\.com$/i, 'TikTok'],
  [/(^|\.)(facebook\.com|fb\.gg)$/i, 'Facebook'],
]

/** "Watch on Twitch", or just "Watch live" for any other site. */
function watchLabel(url) {
  try {
    const host = new URL(url).hostname
    const hit = HOSTS.find(([re]) => re.test(host))
    return hit ? `Watch on ${hit[1]}` : 'Watch live'
  } catch {
    return 'Watch live'
  }
}

function ago(iso, now) {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (min < 1) return 'Just started'
  if (min < 60) return `Started ${min} min ago`
  const h = Math.floor(min / 60)
  return `Started ${h} h ${min % 60} min ago`
}

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
 * stream. Closing it shrinks it to a small LIVE tab (it can be opened again); it disappears
 * by itself when the admin ends it or its time runs out.
 */
export default function LiveNotice() {
  const entry = usePublic('/live', { refreshMs: 30_000 })
  const alerts = entry.status === 'ok' ? (entry.data?.alerts ?? []) : []
  const [hidden, setHidden] = useState(readHidden)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (alerts.length === 0) return undefined
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [alerts.length])

  if (alerts.length === 0) return null

  const shown = alerts.filter((a) => !hidden.includes(a.id))
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
      {shown.length === 0 ? (
        <button type="button" className="live__tab" onClick={() => persist([])} aria-label={`Show live notification (${alerts.length})`}>
          <span className="live__dot" aria-hidden="true" />
          Live
          {alerts.length > 1 && <span className="live__count">{alerts.length}</span>}
        </button>
      ) : (
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
      )}
    </aside>
  )
}

function Side({ side }) {
  return (
    <span className="live__side" style={side.color ? { '--side': side.color } : undefined}>
      {side.emblem ? (
        <img className="live__emblem" src={side.emblem} alt="" loading="lazy" />
      ) : (
        <span className="live__emblem live__emblem--initial" aria-hidden="true">
          {side.name.slice(0, 1)}
        </span>
      )}
      <span className="live__name">{side.name}</span>
    </span>
  )
}
