import { useEffect, useRef } from 'react'

import Plate from '../../components/media/Plate'
import Arrow from '../../components/ui/Arrow'
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton'
import { usePublic } from '../../lib/publicData'
import { DateBadge, StateBadge } from './EventsPage'
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
        <p className="evd__kicker">Events</p>
        <h2 id="evd-title" className="evd__title">
          {failed ? 'This event can’t be loaded' : 'No event by that name'}
        </h2>
        <p className="evd__summary">{failed ? 'Try again in a moment.' : 'It may have been taken down, or the link is wrong.'}</p>
        <button type="button" className="btn btn--primary" onClick={onClose}>
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
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path d="M3.5 3.5l9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  )
}

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
      {/* the picture, with the date and where things stand laid over it */}
      <header className="evd__media">
        <Plate image={e.image} seed={seedFor(e.id)} horizon={0.7} />
        <span className="evd__shade" aria-hidden="true" />
        <div className="evd__tag">
          <DateBadge date={e.startsAt} className="ev-date--lg" />
          <p className="ev-meta">
            <span className="ev-meta__cat">{e.category}</span>
            <StateBadge event={e} now={now} />
          </p>
        </div>
      </header>

      <div className="evd__scroll">
        <div className="evd__body">
          <h2 id="evd-title" className={`evd__title ${e.state === 'cancelled' ? 'is-cancelled' : ''}`}>
            {e.title}
          </h2>
          {e.summary && <p className="evd__summary">{e.summary}</p>}

          <dl className="evd__facts">
            <Fact label="Date">{formatDay(e.startsAt)}</Fact>
            <Fact label="Time">{timeRange(e)}</Fact>
            {e.location && <Fact label="Where">{e.location}</Fact>}
            {e.host && <Fact label="Hosted by">{e.host}</Fact>}
            {e.capacity > 0 && <Fact label="Places">{e.capacity}</Fact>}
          </dl>

          <Status event={e} now={now} />

          {paragraphs.length > 0 && (
            <section className="evd__block" aria-labelledby="evd-about">
              <h3 id="evd-about" className="evp-block__title">
                About
              </h3>
              {paragraphs.map((p, i) => (
                <p key={i} className="evp-text">
                  {p}
                </p>
              ))}
            </section>
          )}

          {e.schedule.length > 0 && (
            <section className="evd__block" aria-labelledby="evd-programme">
              <h3 id="evd-programme" className="evp-block__title">
                Programme
              </h3>
              <ol className="evp-timeline" role="list">
                {e.schedule.map((s, i) => (
                  <li key={i} className="evp-timeline__item">
                    <span className="evp-timeline__time">{s.time || '—'}</span>
                    <span className="evp-timeline__what">{s.item}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {e.requirements.length > 0 && (
            <section className="evd__block" aria-labelledby="evd-need">
              <h3 id="evd-need" className="evp-block__title">
                What you need
              </h3>
              <ul className="evp-checks" role="list">
                {e.requirements.map((r, i) => (
                  <li key={i}>
                    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                      <path
                        d="m3.5 8.5 3 3 6-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {r}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {e.prizes.length > 0 && (
            <section className="evd__block" aria-labelledby="evd-prizes">
              <h3 id="evd-prizes" className="evp-block__title">
                Prizes
              </h3>
              <ol className="evp-prizes" role="list">
                {e.prizes.map((p, i) => (
                  <li key={i} className={`evp-prize ${i === 0 ? 'is-first' : ''}`}>
                    {p.place && <span className="evp-prize__place">{p.place}</span>}
                    <span className="evp-prize__what">{p.prize}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {empty && <p className="evp-text evp-text--muted">More details will be posted here closer to the day.</p>}
        </div>
      </div>

      {/* how to take part: always in reach at the foot of the pop-up */}
      <footer className="evd__foot">
        <p className="evd__foot-when">
          {open ? (
            <>
              <strong>
                {formatDay(e.startsAt)} · {formatTime(e.startsAt)}
              </strong>
              <span>
                {e.signup ? (e.capacity > 0 ? `${e.capacity} places` : 'Sign-up open') : 'No sign-up needed — just be there on time'}
              </span>
            </>
          ) : (
            <span>{e.state === 'cancelled' ? 'This event is not going ahead.' : 'This event has finished.'}</span>
          )}
        </p>
        {open && (
          <div className="evd__foot-actions">
            <button type="button" className="btn btn--ghost" onClick={() => downloadCalendar(e)}>
              Add to calendar
            </button>
            {e.signup && (
              <a className="btn btn--primary" href={e.signup.url} target="_blank" rel="noopener noreferrer">
                {e.signup.label} <Arrow />
              </a>
            )}
          </div>
        )}
      </footer>
    </div>
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

/** The one line that says where things stand right now. */
function Status({ event: e, now }) {
  let text
  if (e.state === 'cancelled') text = e.statusNote ? `Cancelled — ${e.statusNote}` : 'This event has been cancelled.'
  else if (e.state === 'live') text = `On now — started at ${formatTime(e.startsAt)}, runs until about ${formatTime(e.endsBy)}.`
  else if (e.state === 'upcoming') text = `Starts in ${untilText(e.startsAt, now)}.`
  else text = 'This event has finished.'
  return (
    <p className={`evd__status evd__status--${e.state}`} role="status">
      {text}
    </p>
  )
}
