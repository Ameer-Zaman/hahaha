import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import Plate from '../../components/media/Plate'
import Arrow from '../../components/ui/Arrow'
import ParallaxScope from '../../components/ui/ParallaxScope'
import ParallaxWord from '../../components/ui/ParallaxWord'
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton'
import usePageTitle from '../../hooks/usePageTitle'
import { usePublic } from '../../lib/publicData'
import { useCommunityLinks } from '../../lib/siteSettings'
import EventDialog from './EventDialog'
import { dateTile, formatDay, groupEvents, seedFor, STATE_LABEL, timeRange, untilText, useNow } from './eventsModel'
import './events.css'

const WEEK = 7 * 86400_000
/** Links to an event open its pop-up over the list (see EventDialog). */
const OPEN = { fromList: true }

/**
 * Events — a feed of what the server is hosting. The featured (or next) event is the
 * spotlight; everything still to come is a grid of poster cards that can be filtered by when
 * and by kind; what has already happened sits at the end, smaller. Only published and
 * cancelled events ever reach the website.
 */
export default function EventsPage() {
  const DISCORD = useCommunityLinks().find((l) => l.id === 'discord')?.url
  const entry = usePublic('/events')
  const now = useNow()

  // /events/<event> opens that event's details in a pop-up over this list
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const listed = slug && entry.status === 'ok' ? (entry.data?.events ?? []).find((e) => e.id === slug) : null
  usePageTitle(slug ? (listed?.title ?? 'Event') : 'Events')
  // opened from the list: step back to it (so the browser's Back also closes it); a shared link: go to the list
  const close = () => (location.state?.fromList ? navigate(-1) : navigate('/events', { replace: true }))

  return (
    <>
      <ParallaxScope as="section" className="page-head page-head--word theme-dark" aria-labelledby="events-title">
        <ParallaxWord text="Events" motion="x:6%:-10%" className="page-head__word" />
        <div className="container">
          <h1 id="events-title" className="page-head__title">
            Events
          </h1>
          <p className="lede">Races, heists, tournaments and nights out — what the city is hosting, when, and how to take part.</p>
        </div>
      </ParallaxScope>

      <div className="ev theme-black">
        <div className="container">
          {entry.status === 'loading' && <FeedSkeleton />}
          {(entry.status === 'error' || entry.status === 'off' || entry.status === 'missing') && (
            <p className="ev-note" role="status">
              The events list can’t be loaded right now. Try again in a moment{DISCORD ? ', or check the Discord' : ''}.
            </p>
          )}
          {entry.status === 'ok' && <Feed events={entry.data?.events ?? []} now={now} />}
        </div>
      </div>

      <EventDialog open={Boolean(slug) && entry.status !== 'loading'} event={listed} slug={slug} now={now} onClose={close} />
    </>
  )
}

function Feed({ events, now }) {
  const DISCORD = useCommunityLinks().find((l) => l.id === 'discord')?.url
  const { lead, ahead, past } = groupEvents(events, now)
  const [filter, setFilter] = useState('all')

  if (!lead && ahead.length === 0 && past.length === 0) {
    return (
      <div className="ev-empty">
        <p className="ev-empty__title">No events announced yet</p>
        <p className="ev-empty__body">
          When the team schedules something — a race, a heist night, a tournament — it shows up here with the date, the details and how to
          join.
        </p>
        {DISCORD && (
          <a className="btn btn--ghost" href={DISCORD} target="_blank" rel="noopener noreferrer">
            Follow the Discord for news <Arrow />
          </a>
        )}
      </div>
    )
  }

  // filters only offered when they would show something
  const all = lead ? [lead, ...ahead] : ahead
  const soon = (e) => new Date(e.startsAt).getTime() - now < WEEK
  const categories = [...new Set(all.map((e) => e.category))].sort()
  const filters = [
    { id: 'all', label: 'All', test: () => true },
    { id: 'live', label: 'On now', test: (e) => e.state === 'live' },
    { id: 'week', label: 'This week', test: (e) => e.state !== 'live' && soon(e) },
    { id: 'later', label: 'Later', test: (e) => !soon(e) },
    ...(categories.length > 1 ? categories.map((c) => ({ id: `cat:${c}`, label: c, test: (e) => e.category === c })) : []),
  ].filter((f) => f.id === 'all' || all.some(f.test))
  const active = filters.find((f) => f.id === filter) ?? filters[0]
  const shown = active.id === 'all' ? ahead : all.filter(active.test)

  return (
    <>
      {lead && active.id === 'all' && <Spotlight event={lead} now={now} />}

      {all.length > 0 && (
        <section className="ev-section" aria-labelledby="ev-ahead">
          <div className="ev-section__head">
            <h2 id="ev-ahead" className="ev-section__title">
              {active.id === 'all' && lead ? 'Also coming up' : 'Coming up'}
            </h2>
            {filters.length > 2 && (
              <div className="ev-filters" role="group" aria-label="Show events">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`ev-filter ${f.id === active.id ? 'is-active' : ''}`}
                    aria-pressed={f.id === active.id}
                    onClick={() => setFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {shown.length > 0 ? (
            <ol className="ev-grid" role="list">
              {shown.map((e) => (
                <li key={e.id}>
                  <PosterCard event={e} now={now} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="ev-note">Nothing else on the calendar yet — the spotlight is the next one up.</p>
          )}
        </section>
      )}

      {all.length === 0 && (
        <p className="ev-note">Nothing on the calendar right now — the next event will show up here as soon as it is announced.</p>
      )}

      {past.length > 0 && (
        <section className="ev-section ev-section--past" aria-labelledby="ev-past">
          <div className="ev-section__head">
            <h2 id="ev-past" className="ev-section__title">
              Past events
            </h2>
          </div>
          <ol className="ev-grid ev-grid--past" role="list">
            {past.map((e) => (
              <li key={e.id}>
                <PosterCard event={e} now={now} small />
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  )
}

/** Where an event stands, as plain words: "In 2 days", "On now", "Cancelled", "Finished". */
export function StateBadge({ event, now, short = false }) {
  if (event.state === 'upcoming') {
    return (
      <span className="ev-state">
        {short ? 'In' : 'Starts in'} {untilText(event.startsAt, now)}
      </span>
    )
  }
  return (
    <span className={`ev-state ev-state--${event.state}`}>
      {event.state === 'live' && <span className="ev-state__dot" aria-hidden="true" />}
      {STATE_LABEL[event.state]}
    </span>
  )
}

/** The date set as type: a big day number, the month and weekday small beside it. */
export function DateBadge({ date, className = '' }) {
  const t = dateTile(date)
  return (
    <span className={`ev-date ${className}`} aria-hidden="true">
      <span className="ev-date__day">{String(t.day).padStart(2, '0')}</span>
      <span className="ev-date__side">
        <span>{t.month}</span>
        <span>{t.weekday}</span>
      </span>
    </span>
  )
}

/** The featured or next event: a wide picture, and beside it the date, title and actions. */
function Spotlight({ event: e, now }) {
  return (
    <article className="ev-spot" aria-labelledby={`spot-${e.id}`}>
      <Link to={`/events/${e.id}`} state={OPEN} className="ev-spot__media" tabIndex={-1} aria-hidden="true">
        <Plate image={e.image} seed={seedFor(e.id)} horizon={0.7} priority parallax />
      </Link>
      <div className="ev-spot__body">
        <p className="ev-spot__kicker">
          <span className="ev-spot__cat">{e.featured ? 'Featured' : 'Next up'}</span>
          <span>{e.category}</span>
          <StateBadge event={e} now={now} />
        </p>
        <h2 id={`spot-${e.id}`} className="ev-spot__title">
          <Link to={`/events/${e.id}`} state={OPEN}>
            {e.title}
          </Link>
        </h2>
        {e.summary && <p className="ev-spot__summary">{e.summary}</p>}
        <dl className="ev-spot__facts">
          <div>
            <dt>Date</dt>
            <dd>{formatDay(e.startsAt)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{timeRange(e)}</dd>
          </div>
          {e.location && (
            <div>
              <dt>Where</dt>
              <dd>{e.location}</dd>
            </div>
          )}
        </dl>
        <div className="ev-spot__actions">
          <Link to={`/events/${e.id}`} state={OPEN} className="evd__btn evd__btn--solid">
            Event details <Arrow />
          </Link>
          {e.signup && (
            <a className="evd__btn" href={e.signup.url} target="_blank" rel="noopener noreferrer">
              {e.signup.label}
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

/**
 * One event: a clean picture, then a row set like a timetable — the date in big numerals on
 * the left, and the kind, where it stands, the title and the time beside it. The whole card links.
 */
function PosterCard({ event: e, now, small = false }) {
  const where = [timeRange(e), !small && e.location].filter(Boolean).join(' · ')
  return (
    <Link
      to={`/events/${e.id}`}
      state={OPEN}
      className={`ev-card ${small ? 'ev-card--small' : ''} ${e.state === 'cancelled' ? 'is-cancelled' : ''} ${e.state === 'ended' ? 'is-ended' : ''}`}
    >
      <span className="ev-card__media" aria-hidden="true">
        <Plate image={e.image} seed={seedFor(e.id)} horizon={0.72} />
      </span>
      <span className="ev-card__body">
        <DateBadge date={e.startsAt} />
        <span className="ev-card__info">
          <span className="ev-card__top">
            <span className="ev-card__cat">{e.category}</span>
            <StateBadge event={e} now={now} short />
          </span>
          <span className="ev-card__title">{e.title}</span>
          <span className="ev-card__where">{where}</span>
          {!small && e.host && <span className="ev-card__host">Hosted by {e.host}</span>}
        </span>
        <span className="ev-card__go" aria-hidden="true">
          <Arrow />
        </span>
        <span className="visually-hidden">
          {formatDay(e.startsAt)}. {e.state === 'cancelled' ? 'Cancelled.' : ''}
        </span>
      </span>
    </Link>
  )
}

function FeedSkeleton() {
  return (
    <SkeletonGroup label="Loading events">
      <div className="ev-spot ev-spot--skeleton">
        <Skeleton w="100%" h="100%" radius={4} />
      </div>
      <div className="ev-grid">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="ev-skel-card">
            <Skeleton w="100%" h="12rem" radius={3} />
            <Skeleton w="40%" h="0.8rem" />
            <Skeleton w={`${70 - i * 10}%`} h="1.3rem" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  )
}
