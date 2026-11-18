import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import ApplyLink from '../../components/ui/ApplyLink'
import ParallaxScope from '../../components/ui/ParallaxScope'
import ParallaxWord from '../../components/ui/ParallaxWord'
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton'
import usePageTitle from '../../hooks/usePageTitle'
import { usePublic } from '../../lib/publicData'
import './updates.css'

const KINDS = {
  new: 'New',
  changed: 'Changed',
  fixed: 'Fixed',
  removed: 'Removed',
}
const ORDER = ['new', 'changed', 'fixed', 'removed']
const FOLD = 8 // longer lists fold after this many lines

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDay = (iso) => (iso ? day.format(new Date(iso)) : '')

/** "6 new · 3 fixed" for an update's list of changes. */
function tally(changes) {
  const count = Object.fromEntries(ORDER.map((k) => [k, 0]))
  for (const c of changes) count[c.kind] = (count[c.kind] ?? 0) + 1
  return ORDER.filter((k) => count[k]).map((k) => `${count[k]} ${KINDS[k].toLowerCase()}`)
}

/**
 * City updates — the city's patch notes, newest first, down a thin gold timeline. Each update
 * has its day (and version), a title, a short summary, an optional picture, its changes tagged
 * New / Changed / Fixed / Removed, and an optional note from the team.
 *
 * Each update has its own address (/updates/<update>) to share; following one brings it into
 * view and marks it.
 */
export default function UpdatesPage() {
  const entry = usePublic('/updates')
  const list = useMemo(() => (entry.status === 'ok' ? (entry.data?.updates ?? []) : []), [entry])
  const { slug } = useParams()
  const navigate = useNavigate()
  const target = slug ? list.find((u) => u.id === slug) : null
  usePageTitle(target ? `${target.title} · City updates` : 'City updates')

  // a link to an update that isn't there (any more): just show them all
  useEffect(() => {
    if (slug && entry.status === 'ok' && !target) navigate('/updates', { replace: true })
  }, [slug, entry.status, target, navigate])

  return (
    <>
      <ParallaxScope as="section" className="page-head page-head--word theme-dark" aria-labelledby="updates-title">
        <ParallaxWord text="Updates" motion="x:6%:-10%" className="page-head__word" />
        <div className="container">
          <h1 id="updates-title" className="page-head__title">
            City updates
          </h1>
          <p className="lede">What’s new in the city and what changed — every update, newest first.</p>
        </div>
      </ParallaxScope>

      <section className="up theme-black section" aria-label="All updates">
        <div className="container">
          {entry.status === 'loading' && <ListSkeleton />}
          {(entry.status === 'error' || entry.status === 'off' || entry.status === 'missing') && (
            <p className="up-note" role="status">
              The updates can’t be loaded right now. Try again in a moment.
            </p>
          )}
          {entry.status === 'ok' &&
            (list.length === 0 ? (
              <div className="up-empty">
                <p className="up-empty__title">No updates posted yet</p>
                <p className="up-note">When the city changes, it will be written down here. Until then, news goes out on our Discord.</p>
                <ApplyLink className="btn btn--primary">Join the Discord</ApplyLink>
              </div>
            ) : (
              <ol className="up-list" role="list">
                {list.map((u, i) => (
                  <Update key={u.id} update={u} latest={i === 0} target={u.id === slug} />
                ))}
              </ol>
            ))}
        </div>
      </section>
    </>
  )
}

function Update({ update: u, latest, target }) {
  const ref = useRef(null)
  const [all, setAll] = useState(target)
  const folded = !all && u.changes.length > FOLD + 2
  const shown = folded ? u.changes.slice(0, FOLD) : u.changes
  const counts = tally(u.changes)
  const paragraphs = u.notes
    ? u.notes
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
    : []

  useEffect(() => {
    if (!target || !ref.current) return
    ref.current.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
    ref.current.focus({ preventScroll: true })
  }, [target])

  return (
    <li className={`up-item ${target ? 'is-target' : ''}`}>
      <article ref={ref} tabIndex={-1} aria-labelledby={`up-${u.id}`} className="up-card">
        <header className="up-meta">
          <span className="up-dot" aria-hidden="true" />
          <time dateTime={u.date} className="up-date">
            {formatDay(u.date)}
          </time>
          <span className="up-tags">
            {u.version && <span className="up-version">{u.version}</span>}
            {latest && <span className="up-latest">Latest</span>}
          </span>
        </header>

        <div className="up-body">
          <h2 id={`up-${u.id}`} className="up-title">
            <Link to={`/updates/${u.id}`} preventScrollReset>
              {u.title}
            </Link>
          </h2>
          {u.summary && <p className="up-summary">{u.summary}</p>}
          {counts.length > 0 && <p className="up-count">{counts.join(' · ')}</p>}

          {u.image && (
            <figure className="up-figure">
              <img src={u.image} alt="" loading="lazy" decoding="async" />
            </figure>
          )}

          {u.changes.length > 0 && (
            <ul className="up-changes" role="list">
              {shown.map((c, k) => (
                <li key={k} className="up-change">
                  <span className={`up-kind up-kind--${c.kind}`}>{KINDS[c.kind] ?? c.kind}</span>
                  <span className="up-change__text">{c.text}</span>
                </li>
              ))}
            </ul>
          )}
          {folded && (
            <button type="button" className="up-more" onClick={() => setAll(true)}>
              Show all {u.changes.length} changes
            </button>
          )}

          {paragraphs.length > 0 && (
            <div className="up-notes">
              {paragraphs.map((p, k) => (
                <p key={k}>{p}</p>
              ))}
            </div>
          )}
        </div>
      </article>
    </li>
  )
}

function ListSkeleton() {
  return (
    <SkeletonGroup label="Loading the updates" className="up-list">
      {[0, 1, 2].map((i) => (
        <div key={i} className="up-card up-card--ghost">
          <Skeleton w="7rem" h="0.9rem" />
          <div>
            <Skeleton w="60%" h="2rem" />
            <Skeleton w="85%" h="1rem" />
            <Skeleton w="70%" h="1rem" />
          </div>
        </div>
      ))}
    </SkeletonGroup>
  )
}
