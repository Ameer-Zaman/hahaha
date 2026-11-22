import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

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

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDay = (iso) => {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime()) ? day.format(d) : ''
}

/** The changes sorted into their kinds, in a fixed order: [{ kind, items }]. */
function grouped(changes = []) {
  const by = new Map()
  for (const c of changes) {
    const kind = KINDS[c.kind] ? c.kind : 'changed'
    if (!by.has(kind)) by.set(kind, [])
    by.get(kind).push(c.text)
  }
  return ORDER.filter((k) => by.has(k)).map((kind) => ({ kind, items: by.get(kind) }))
}

const paragraphsOf = (notes) =>
  (notes ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

/**
 * City updates: the city's patch notes. The newest update is the featured one (its picture
 * across the top, its changes sorted into New / Changed / Fixed / Removed); earlier updates are
 * cards that open in place. Every update has its own address (/updates/<update>) to share:
 * following one opens it and brings it into view.
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

  const [latest, ...older] = list

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
          {entry.status === 'ok' && list.length === 0 && (
            <div className="up-empty">
              <p className="up-empty__title">No updates posted yet</p>
              <p className="up-note">When the city changes, it will be written down here. Until then, news goes out on our Discord.</p>
              <ApplyLink className="btn btn--primary">Join the Discord</ApplyLink>
            </div>
          )}
          {latest && <Featured update={latest} target={latest.id === slug} />}
          {older.length > 0 && (
            <div className="up-older">
              <h2 className="up-older__title">
                Earlier updates <span>{older.length}</span>
              </h2>
              <ol className="up-older__list" role="list">
                {older.map((u, i) => (
                  <Earlier key={u.id} update={u} target={u.id === slug} index={i} />
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

/** Brings an update into view when its link was followed. */
function useScrollTo(target) {
  const ref = useRef(null)
  useEffect(() => {
    if (!target || !ref.current) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => {
      ref.current?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' })
      ref.current?.focus({ preventScroll: true })
    }, 120)
    return () => clearTimeout(t)
  }, [target])
  return ref
}

/** "Copy link" for an update's own address. */
function CopyLink({ id }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return undefined
    const t = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <button
      type="button"
      className="up-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}/updates/${id}`)
          setCopied(true)
        } catch {
          /* clipboard blocked: nothing to do */
        }
      }}
    >
      <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
        <path
          d="M8.5 11.5a3 3 0 0 0 4.2 0l3-3a3 3 0 0 0-4.2-4.2l-1 1M11.5 8.5a3 3 0 0 0-4.2 0l-3 3a3 3 0 0 0 4.2 4.2l1-1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span aria-live="polite">{copied ? 'Link copied' : 'Copy link'}</span>
    </button>
  )
}

/** "3 new · 1 fixed" as small coloured chips. */
function Counts({ groups }) {
  if (groups.length === 0) return null
  return (
    <ul className="up-counts" role="list" aria-label="Changes in this update">
      {groups.map((g) => (
        <li key={g.kind} className={`up-chip up-chip--${g.kind}`}>
          <b>{g.items.length}</b> {KINDS[g.kind].toLowerCase()}
        </li>
      ))}
    </ul>
  )
}

/** The changes, in a column per kind. */
function Changes({ groups }) {
  if (groups.length === 0) return null
  return (
    <div className="up-groups">
      {groups.map((g) => (
        <section key={g.kind} className={`up-group up-group--${g.kind}`} aria-label={KINDS[g.kind]}>
          <h3 className="up-group__head">
            <span>{KINDS[g.kind]}</span>
            <b>{g.items.length}</b>
          </h3>
          <ul role="list">
            {g.items.map((text, k) => (
              <li key={k}>{text}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Notes({ notes }) {
  const paragraphs = paragraphsOf(notes)
  if (paragraphs.length === 0) return null
  return (
    <div className="up-notes">
      <p className="up-notes__label">From the team</p>
      {paragraphs.map((p, k) => (
        <p key={k}>{p}</p>
      ))}
    </div>
  )
}

/** The newest update, shown in full. */
function Featured({ update: u, target }) {
  const ref = useScrollTo(target)
  const groups = grouped(u.changes)
  return (
    <article ref={ref} tabIndex={-1} className={`up-hero ${u.image ? 'has-image' : ''}`} aria-labelledby={`up-${u.id}`}>
      <div className="up-hero__top">
        {u.image && (
          <div className="up-hero__media" aria-hidden="true">
            <img src={u.image} alt="" decoding="async" />
          </div>
        )}
        <header className="up-hero__head">
          <p className="up-meta">
            <span className="up-latest">Latest update</span>
            {u.version && <span className="up-version">{u.version}</span>}
            <time dateTime={u.date}>{formatDay(u.date)}</time>
          </p>
          <h2 id={`up-${u.id}`} className="up-hero__title">
            {u.title}
          </h2>
          {u.summary && <p className="up-hero__summary">{u.summary}</p>}
          <Counts groups={groups} />
        </header>
      </div>
      <div className="up-hero__body">
        <Changes groups={groups} />
        <Notes notes={u.notes} />
        <div className="up-foot">
          <CopyLink id={u.id} />
        </div>
      </div>
    </article>
  )
}

/** An earlier update: a card that opens in place to show everything. */
function Earlier({ update: u, target, index }) {
  const ref = useScrollTo(target)
  const [open, setOpen] = useState(target)
  const navigate = useNavigate()
  const groups = grouped(u.changes)
  const panel = `up-panel-${u.id}`

  // following a link to it opens it
  const [wasTarget, setWasTarget] = useState(target)
  if (target !== wasTarget) {
    setWasTarget(target)
    if (target) setOpen(true)
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    // the address follows, so an open update can be shared straight from the address bar
    navigate(next ? `/updates/${u.id}` : '/updates', { replace: true, preventScrollReset: true })
  }

  return (
    <li ref={ref} tabIndex={-1} className={`up-card ${open ? 'is-open' : ''}`} style={{ '--d': Math.min(index, 8) }}>
      <button type="button" className="up-card__head" aria-expanded={open} aria-controls={panel} onClick={toggle}>
        <span className={`up-card__thumb ${u.image ? '' : 'is-blank'}`} aria-hidden="true">
          {u.image ? <img src={u.image} alt="" loading="lazy" decoding="async" /> : <span>{u.version || 'Update'}</span>}
        </span>
        <span className="up-card__text">
          <span className="up-meta">
            <time dateTime={u.date}>{formatDay(u.date)}</time>
            {u.version && <span className="up-version">{u.version}</span>}
          </span>
          <span className="up-card__title" id={`up-${u.id}`}>
            {u.title}
          </span>
          {u.summary && <span className="up-card__summary">{u.summary}</span>}
          <Counts groups={groups} />
        </span>
        <span className="up-card__chev" aria-hidden="true">
          <svg viewBox="0 0 20 20" width="18" height="18">
            <path d="m5 8 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <div id={panel} className="up-card__panel" role="region" aria-labelledby={`up-${u.id}`} hidden={!open}>
        {u.image && (
          <figure className="up-card__figure">
            <img src={u.image} alt="" loading="lazy" decoding="async" />
          </figure>
        )}
        <Changes groups={groups} />
        <Notes notes={u.notes} />
        <div className="up-foot">
          <CopyLink id={u.id} />
        </div>
      </div>
    </li>
  )
}

function ListSkeleton() {
  return (
    <SkeletonGroup label="Loading the updates" className="up-skeleton">
      <div className="up-hero up-hero--ghost">
        <Skeleton w="100%" h="14rem" />
        <div className="up-hero__head">
          <Skeleton w="10rem" h="0.9rem" />
          <Skeleton w="60%" h="2.4rem" />
          <Skeleton w="80%" h="1rem" />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="up-card up-card--ghost">
          <Skeleton w="100%" h="4.5rem" />
        </div>
      ))}
    </SkeletonGroup>
  )
}
