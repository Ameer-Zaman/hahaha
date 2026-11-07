import { useState } from 'react'

import { useLiveAlerts } from './liveData'
import LiveItem from './LiveItem'
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
            <LiveItem alert={a} now={now} onClose={() => persist([...hidden, a.id])} />
          </li>
        ))}
      </ul>
    </aside>
  )
}
