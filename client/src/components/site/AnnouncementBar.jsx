import { useEffect, useRef, useState } from 'react'

import { usePublic } from '../../lib/publicData'
import './announcement-bar.css'

const SEEN_KEY = 'rameirah:announcement-seen'

/** Which pinned announcements this visitor has already closed. */
function readSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'))
  } catch {
    return new Set() // private mode, blocked storage: just show it
  }
}

const ICON = {
  warning: (
    <path d="M12 3 2 20h20L12 3Zm0 6v5m0 3v.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  good: <path d="m4 12 5 5L20 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  news: (
    <path
      d="M4 5h16v14H4zM7 9h10M7 13h10M7 17h6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
}

/**
 * The strip at the very top of every page, for anything the team has pinned. A visitor can
 * close it; it stays closed for that announcement only, so a new one is always seen.
 */
export default function AnnouncementBar() {
  const entry = usePublic('/announcements', { refreshMs: 5 * 60_000 })
  const [seen, setSeen] = useState(readSeen)

  const pinned = (entry.data?.announcements ?? []).filter((a) => a.pinned && !seen.has(a.id))
  const current = pinned[0] ?? null

  /**
   * The header is fixed to the top, so the strip has to tell the page how much room it
   * takes; everything below the chrome offsets by --top-chrome, which includes this.
   */
  const bar = useRef(null)
  useEffect(() => {
    const root = document.documentElement
    if (!current) {
      root.style.removeProperty('--abar-h')
      return undefined
    }
    const measure = () => root.style.setProperty('--abar-h', `${Math.round(bar.current?.offsetHeight ?? 0)}px`)
    measure()
    const observer = new ResizeObserver(measure)
    if (bar.current) observer.observe(bar.current)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--abar-h')
    }
  }, [current])

  if (!current) return null

  const close = () => {
    const next = new Set(seen).add(current.id)
    setSeen(next)
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...next]))
    } catch {
      /* nothing to remember it with: it will show again next time */
    }
  }

  return (
    <aside ref={bar} className={`abar abar--${current.tone}`} role="status" aria-label="Announcement">
      <div className="abar__inner">
        <svg className="abar__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          {ICON[current.tone] ?? ICON.news}
        </svg>
        <p className="abar__text">
          <strong>{current.title}</strong>
          {current.body && <span className="abar__body"> {current.body}</span>}
        </p>
        {current.link && (
          <a className="abar__link" href={current.link.url} target="_blank" rel="noopener noreferrer">
            {current.link.label}
          </a>
        )}
        <button type="button" className="abar__close" onClick={close} aria-label="Close this announcement">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="m3 3 10 10M13 3 3 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
