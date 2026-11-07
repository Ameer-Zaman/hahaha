import { ago, watchLabel } from './liveData'
import Side from './LiveSide'

/**
 * One live gang situation, set the same way in the corner card and the bell's list: a LIVE
 * line with how long it's been on, the two gangs stacked like a fixture, the title, and a
 * full-width "Watch on …" link along the bottom.
 */
export default function LiveItem({ alert: a, now, onClose }) {
  return (
    <article className="live__item" aria-label={`Live: ${a.a.name} vs ${a.b.name}`}>
      <header className="live__meta">
        <span className="live__badge">
          <span className="live__dot" aria-hidden="true" />
          Live
        </span>
        <span className="live__when">{ago(a.startedAt, now)}</span>
        {onClose && (
          <button type="button" className="live__close" onClick={onClose} aria-label="Hide this live notification">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M3.5 3.5l9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </button>
        )}
      </header>

      <div className="live__fixture">
        <Side side={a.a} />
        <span className="live__vs" aria-label="versus">
          VS
        </span>
        <Side side={a.b} />
      </div>

      {(a.title || a.note) && (
        <div className="live__text">
          {a.title && <p className="live__title">{a.title}</p>}
          {a.note && <p className="live__note">{a.note}</p>}
        </div>
      )}

      <a className="live__watch" href={a.url} target="_blank" rel="noopener noreferrer">
        <span>{watchLabel(a.url)}</span>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
        </svg>
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
    </article>
  )
}
