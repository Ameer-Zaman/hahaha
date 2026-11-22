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
 * City updates: the city's patch notes, newest first, as a simple list of cards (date,
 * version, title, summary). Clicking one opens its details in a pop-up: the picture, the
 * changes under New / Changed / Fixed / Removed, and the team's note. The address follows the
 * pop-up (/updates/<update>), so an update can be shared and the browser's Back closes it.
 */
export default function UpdatesPage() {
  const entry = usePublic('/updates')
  const list = useMemo(() => (entry.status === 'ok' ? (entry.data?.updates ?? []) : []), [entry])
  const { slug } = useParams()
  const navigate = useNavigate()
  const open = slug ? list.find((u) => u.id === slug) : null
  usePageTitle(open ? `${open.title} · City updates` : 'City updates')
  const openedHere = useRef(false)

  // a link to an update that isn't there (any more): just show them all
  useEffect(() => {
    if (slug && entry.status === 'ok' && !open) navigate('/updates', { replace: true })
  }, [slug, entry.status, open, navigate])

  const show = (id) => {
    openedHere.current = true
    navigate(`/updates/${id}`, { preventScrollReset: true })
  }
  const close = () => {
    if (openedHere.current) navigate(-1)
    else navigate('/updates', { replace: true, preventScrollReset: true })
    openedHere.current = false
  }

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
          {list.length > 0 && (
            <ol className="up-list" role="list">
              {list.map((u, i) => (
                <li key={u.id} style={{ '--d': Math.min(i, 8) }}>
                  <button type="button" className="up-card" onClick={() => show(u.id)} aria-haspopup="dialog">
                    <span className="up-card__meta">
                      <time dateTime={u.date}>{formatDay(u.date)}</time>
                      {u.version && <span className="up-version">{u.version}</span>}
                      {i === 0 && <span className="up-latest">Latest</span>}
                    </span>
                    <span className="up-card__title">{u.title}</span>
                    {u.summary && <span className="up-card__summary">{u.summary}</span>}
                    <span className="up-card__more">
                      View details
                      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                        <path
                          d="M3 8h10m-4-4 4 4-4 4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <UpdateDialog update={open} onClose={close} />
    </>
  )
}

/** An update's details, in a pop-up over the list. Esc, the × or a click outside closes it. */
function UpdateDialog({ update, onClose }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(update) // kept while it closes
  if (update && update !== shown) setShown(update)
  const open = !!update

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return undefined
    if (open && !dialog.open) {
      dialog.showModal()
      dialog.focus()
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

  const u = shown
  const groups = u ? grouped(u.changes) : []
  const notes = u ? paragraphsOf(u.notes) : []

  return (
    <dialog
      ref={ref}
      className="upd"
      tabIndex={-1}
      aria-labelledby="upd-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {u && (
        <div className="upd__panel">
          <button type="button" className="upd__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
              <path d="M3.5 3.5l9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
            </svg>
          </button>
          {u.image && (
            <figure className="upd__media">
              <img src={u.image} alt="" decoding="async" />
            </figure>
          )}
          <div className="upd__body">
            <p className="up-card__meta">
              <time dateTime={u.date}>{formatDay(u.date)}</time>
              {u.version && <span className="up-version">{u.version}</span>}
            </p>
            <h2 id="upd-title" className="upd__title">
              {u.title}
            </h2>
            {u.summary && <p className="upd__summary">{u.summary}</p>}

            {groups.map((g) => (
              <section key={g.kind} className={`upd__group upd__group--${g.kind}`} aria-labelledby={`upd-${g.kind}`}>
                <h3 id={`upd-${g.kind}`} className="upd__h">
                  {KINDS[g.kind]} <span>{g.items.length}</span>
                </h3>
                <ul role="list">
                  {g.items.map((text, k) => (
                    <li key={k}>{text}</li>
                  ))}
                </ul>
              </section>
            ))}

            {notes.length > 0 && (
              <section className="upd__notes" aria-labelledby="upd-notes">
                <h3 id="upd-notes" className="upd__h">
                  From the team
                </h3>
                {notes.map((p, k) => (
                  <p key={k}>{p}</p>
                ))}
              </section>
            )}

            {groups.length === 0 && notes.length === 0 && <p className="up-note">No further details for this update.</p>}
          </div>
        </div>
      )}
    </dialog>
  )
}

function ListSkeleton() {
  return (
    <SkeletonGroup label="Loading the updates" className="up-list">
      {[0, 1, 2].map((i) => (
        <div key={i} className="up-card up-card--ghost">
          <Skeleton w="8rem" h="0.8rem" />
          <Skeleton w="50%" h="1.8rem" />
          <Skeleton w="75%" h="1rem" />
        </div>
      ))}
    </SkeletonGroup>
  )
}
