import { useEffect, useRef } from 'react'

import Plate from '../../components/media/Plate'
import Arrow from '../../components/ui/Arrow'
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton'
import { usePublic } from '../../lib/publicData'
import { downloadCalendar, formatDay, formatTime, liveState, seedFor, timeRange, untilText } from './eventsModel'

/**
 * An event's details, in a pop-up over the events list (no page of its own). The address still
 * changes to /events/<event>, so a pop-up can be shared, and opening that link shows the list
 * with the pop-up open. Esc, the × or a click outside closes it.
 */
export default function EventDialog({ open, event, slug, now, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return undefined
    if (open && !dialog.open) {
      dialog.showModal()
      dialog.focus() // start on the pop-up itself, not with a focus ring on its × button
      const prev = document.documentElement.style.overflow
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.documentElement.style.overflow = prev
        if (dialog.open) dialog.close()
      }
    }
    if (!open && dialog.open) dialog.close()
    return undefined
  }, [open])

  return (
    <dialog
      ref={ref}
      className="evd"
      tabIndex={-1}
      aria-labelledby="evd-title"
      onCancel={(e) => {
        e.preventDefault() // Esc: close through the address, so Back works as expected
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // a click on the dimmed backdrop
      }}
    >
      {open &&
        (event ? (
          <Details event={{ ...event, state: liveState(event, now) }} now={now} onClose={onClose} />
        ) : (
          <Remote slug={slug} now={now} onClose={onClose} />
        ))}
    </dialog>
  )
}

/** An event that isn't in the list (an older one, say): fetched on its own. */
function Remote({ slug, now, onClose }) {
  const entry = usePublic(`/events/${encodeURIComponent(slug)}`)
  const event = entry.status === 'ok' ? entry.data?.event : null
  if (entry.status === 'loading') {
    return (
      <SkeletonGroup label="Loading the event" className="evd__panel">
        <Skeleton w="100%" h="14rem" radius={0} />
        <div className="evd__body">
          <Skeleton w="30%" h="0.9rem" />
          <Skeleton w="70%" h="2.4rem" />
          <Skeleton w="50%" h="1rem" />
        </div>
      </SkeletonGroup>
    )
  }
  if (!event) {
    const failed = entry.status !== 'missing'
    return (
      <div className="evd__panel evd__missing">
        <CloseButton onClose={onClose} />
        <p className="evd__meta">
          <span className="evd__cat">Events</span>
        </p>
        <h2 id="evd-title" className="evd__title">
          {failed ? 'This event can’t be loaded' : 'No event by that name'}
        </h2>
        <p className="evd__summary">{failed ? 'Try again in a moment.' : 'It may have been taken down, or the link is wrong.'}</p>
        <button type="button" className="evd__btn evd__btn--solid" onClick={onClose}>
          See all events <Arrow />
        </button>
      </div>
    )
  }
  return <Details event={{ ...event, state: liveState(event, now) }} now={now} onClose={onClose} />
}

function CloseButton({ onClose }) {
  return (
    <button type="button" className="evd__close" onClick={onClose} aria-label="Close">
      <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
        <path d="M3.5 3.5l9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
      </svg>
    </button>
  )
}

/** Where things stand, in a few plain words: "In 3 days", "On now", "Cancelled", "Finished". */
function stateText(e, now) {
  if (e.state === 'upcoming') return `In ${untilText(e.startsAt, now)}`
  if (e.state === 'live') return `On now — until about ${formatTime(e.endsBy)}`
  if (e.state === 'cancelled') return e.statusNote ? `Cancelled — ${e.statusNote}` : 'Cancelled'
  return 'Finished'
}

/**
 * The details, set plainly: a clean picture, then type and hairlines — the kind of event and
 * where it stands, the title, a short list of facts, and the sections the team filled in.
 * No boxes, pills or gradients; one accent colour.
 */
function Details({ event: e, now, onClose }) {
  const open = e.state === 'upcoming' || e.state === 'live'
  const paragraphs = e.description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const empty = paragraphs.length === 0 && e.schedule.length === 0 && e.requirements.length === 0 && e.prizes.length === 0

  return (
    <div className="evd__panel evd__panel--event">
      <CloseButton onClose={onClose} />
      <figure className="evd__media" aria-hidden="true">
        <Plate image={e.image} seed={seedFor(e.id)} horizon={0.7} />
      </figure>

      <div className="evd__scroll">
        <div className="evd__body">
          <header className="evd__head">
            <p className="evd__meta">
              <span className="evd__cat">{e.category}</span>
              <span className={`evd__state evd__state--${e.state}`}>{stateText(e, now)}</span>
            </p>
            <h2 id="evd-title" className={`evd__title ${e.state === 'cancelled' ? 'is-cancelled' : ''}`}>
              {e.title}
            </h2>
            {e.summary && <p className="evd__summary">{e.summary}</p>}
          </header>

          <dl className="evd__facts">
            <Fact label="Date">{formatDay(e.startsAt)}</Fact>
            <Fact label="Time">{timeRange(e)}</Fact>
            {e.location && <Fact label="Where">{e.location}</Fact>}
            {e.host && <Fact label="Host">{e.host}</Fact>}
            {e.capacity > 0 && <Fact label="Places">{e.capacity}</Fact>}
          </dl>

          {paragraphs.length > 0 && (
            <Section id="evd-about" title="About">
              {paragraphs.map((p, i) => (
                <p key={i} className="evd__text">
                  {p}
                </p>
              ))}
            </Section>
          )}

          {e.schedule.length > 0 && (
            <Section id="evd-programme" title="Programme">
              <ol className="evd__rows" role="list">
                {e.schedule.map((s, i) => (
                  <li key={i}>
                    <span className="evd__rows-key">{s.time || '—'}</span>
                    <span>{s.item}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {e.requirements.length > 0 && (
            <Section id="evd-need" title="What you need">
              <ul className="evd__list" role="list">
                {e.requirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </Section>
          )}

          {e.prizes.length > 0 && (
            <Section id="evd-prizes" title="Prizes">
              <ol className="evd__rows" role="list">
                {e.prizes.map((p, i) => (
                  <li key={i}>
                    <span className="evd__rows-key">{p.place || `${i + 1}.`}</span>
                    <span className={i === 0 ? 'evd__first' : undefined}>{p.prize}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {empty && <p className="evd__text evd__text--muted">More details will be posted here closer to the day.</p>}
        </div>
      </div>

      <footer className="evd__foot">
        {open ? (
          <>
            <p className="evd__foot-when">{e.signup ? (e.capacity > 0 ? `${e.capacity} places` : 'Sign-up open') : 'No sign-up needed'}</p>
            <div className="evd__foot-actions">
              <button type="button" className="evd__btn" onClick={() => downloadCalendar(e)}>
                Add to calendar
              </button>
              {e.signup && (
                <a className="evd__btn evd__btn--solid" href={e.signup.url} target="_blank" rel="noopener noreferrer">
                  {e.signup.label}
                </a>
              )}
            </div>
          </>
        ) : (
          <p className="evd__foot-when">{e.state === 'cancelled' ? 'This event is not going ahead.' : 'This event has finished.'}</p>
        )}
      </footer>
    </div>
  )
}

function Section({ id, title, children }) {
  return (
    <section className="evd__section" aria-labelledby={id}>
      <h3 id={id} className="evd__h">
        {title}
      </h3>
      <div className="evd__section-body">{children}</div>
    </section>
  )
}

function Fact({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
