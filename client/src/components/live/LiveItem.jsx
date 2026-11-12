import { ago, liveFor, watchLabel } from './liveData'
import Side from './LiveSide'

/**
 * One live gang situation, the same in the corner card and the bell's list: a LIVE pill with
 * how long it's been on, the two gangs face to face, the title, and one Watch button.
 */
export default function LiveItem({ alert: a, now, onClose }) {
  return (
    <article className="live__item" aria-label={`Live: ${a.a.name} vs ${a.b.name}`}>
      <header className="live__meta">
        <span className="live__badge">
          <span className="live__dot" aria-hidden="true" />
          Live
        </span>
        <time className="live__when" dateTime={a.startedAt} title={ago(a.startedAt, now)}>
          {liveFor(a.startedAt, now)}
        </time>
        {onClose && (
          <button type="button" className="live__close" onClick={onClose} aria-label="Hide this live notification">
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path d="M3.5 3.5l9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </header>

      <div className="live__fixture">
        <Side side={a.a} />
        <span className="live__vs" aria-label="versus">
          vs
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
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M4.5 2.8v10.4L13 8z" fill="currentColor" />
        </svg>
        <span>{watchLabel(a.url)}</span>
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
    </article>
  )
}
