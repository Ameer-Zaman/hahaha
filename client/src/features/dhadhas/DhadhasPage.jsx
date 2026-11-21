import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ApplyLink from '../../components/ui/ApplyLink'
import ParallaxScope from '../../components/ui/ParallaxScope'
import ParallaxWord from '../../components/ui/ParallaxWord'
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton'
import usePageTitle from '../../hooks/usePageTitle'
import { usePublic } from '../../lib/publicData'
import './dhadhas.css'

const CREW_MAX = 10
const FIGHTS_SHOWN = 8 // longer fight lists fold after this many
const number = new Intl.NumberFormat('en-IN')
const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDay = (iso) => (iso ? day.format(new Date(`${iso}T12:00:00`)) : '')
const initial = (name) => [...(name ?? '').trim()][0]?.toUpperCase() ?? ''
const two = (n) => String(n).padStart(2, '0')
const RESULT = { win: 'Won', loss: 'Lost', draw: 'Draw' }

/** Wins, losses and draws in a list of fights. */
const record = (fights) => ({
  win: fights.filter((f) => f.result === 'win').length,
  loss: fights.filter((f) => f.result === 'loss').length,
  draw: fights.filter((f) => f.result === 'draw').length,
})
const recordText = (r) => `${r.win}W ${r.loss}L${r.draw ? ` ${r.draw}D` : ''}`

/** The members by rank position (1 first); those without one after, in the panel's order. */
const byRank = (members) =>
  members.map((m, i) => ({ ...m, order: i })).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.order - b.order)

/** Everything a card and the pop-up show about one Dhadha, worked out once. */
function profile(d, place) {
  const members = byRank(d.members)
  // the club's fights: every member's, newest first, each with who fought it
  const fights = members
    .flatMap((m) => m.fights.map((f) => ({ ...f, member: m.name })))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const r = record(fights)
  return {
    ...d,
    place,
    members,
    fights,
    record: r,
    coins: members.reduce((sum, m) => sum + (m.coins || 0), 0),
    winRate: fights.length ? Math.round((r.win / fights.length) * 100) : null,
  }
}

/**
 * Dhadhas — every Dhadha in the city: a club of up to ten members, each as a film poster.
 * Opening a poster pops up the club: its total coins, record, previous fights (every
 * member's, newest first) and its members by rank.
 *
 * An open Dhadha has its own address (/dhadhas/<dhadha>), so it can be shared.
 */
export default function DhadhasPage() {
  const entry = usePublic('/dhadhas')
  const all = useMemo(() => (entry.status === 'ok' ? (entry.data?.dhadhas ?? []).map(profile) : []), [entry])
  const { slug } = useParams()
  const navigate = useNavigate()
  const open = slug ? (all.find((d) => d.id === slug) ?? null) : null
  usePageTitle(open ? `${open.name} · Dhadhas` : 'Dhadhas')

  // a link to a Dhadha who isn't there (any more): just show them all
  useEffect(() => {
    if (slug && entry.status === 'ok' && !open) navigate('/dhadhas', { replace: true })
  }, [slug, entry.status, open, navigate])

  const show = (d) => navigate(d ? `/dhadhas/${d.id}` : '/dhadhas', { preventScrollReset: true })

  return (
    <>
      <ParallaxScope as="section" className="page-head page-head--word theme-dark" aria-labelledby="dhadhas-title">
        <ParallaxWord text="Dhadhas" motion="x:6%:-10%" className="page-head__word" />
        <div className="container">
          <h1 id="dhadhas-title" className="page-head__title">
            Dhadhas
          </h1>
          <p className="lede">Every Dhadha in the city — a club of up to ten. Open one to see its fights, members and total coins.</p>
        </div>
      </ParallaxScope>

      <section className="dp theme-black section" aria-label="All Dhadhas">
        <div className="container">
          {entry.status === 'loading' && <BoardSkeleton />}
          {(entry.status === 'error' || entry.status === 'off' || entry.status === 'missing') && (
            <p className="dx-note" role="status">
              The Dhadhas can’t be loaded right now. Try again in a moment.
            </p>
          )}
          {entry.status === 'ok' &&
            (all.length === 0 ? (
              <div className="dp-empty">
                <p className="dp-empty__title">The Dhadhas are on their way</p>
                <p className="dx-note">Who they are and who rides with them will be announced on our Discord.</p>
                <ApplyLink className="btn btn--primary">Get updates on Discord</ApplyLink>
              </div>
            ) : (
              <Posters all={all} onOpen={show} />
            ))}
        </div>
      </section>

      <Popup dhadha={open} onClose={() => show(null)} />
    </>
  )
}

/* ------------------------------------------------------------------ the posters */

const SORTS = [
  { id: 'coins', label: 'Most coins', by: (a, b) => b.coins - a.coins || a.place - b.place },
  { id: 'wins', label: 'Most wins', by: (a, b) => b.record.win - a.record.win || b.coins - a.coins },
  { id: 'name', label: 'A–Z', by: (a, b) => a.name.localeCompare(b.name) },
]

/** Every Dhadha as a poster; search and sort once there are enough to need them. */
function Posters({ all, onOpen }) {
  const [sort, setSort] = useState('coins')
  const [query, setQuery] = useState('')
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const found = q ? all.filter((d) => d.name.toLowerCase().includes(q) || d.members.some((m) => m.name.toLowerCase().includes(q))) : all
    return [...found].sort(SORTS.find((s) => s.id === sort).by)
  }, [all, sort, query])
  const members = all.reduce((n, d) => n + d.members.length, 0)
  const many = all.length > 3

  return (
    <>
      <div className="dp-bar">
        <p className="dp-count">
          {two(all.length)} {all.length === 1 ? 'Dhadha' : 'Dhadhas'} · {members} {members === 1 ? 'member' : 'members'}
        </p>
        {many && (
          <div className="dp-tools">
            <label className="dp-search">
              <span className="visually-hidden">Find a Dhadha or a member</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a Dhadha or member" />
            </label>
            <div className="dp-sort" role="group" aria-label="Sort">
              {SORTS.map((s) => (
                <button key={s.id} type="button" aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <p className="dx-note" role="status">
          No Dhadha or member matches “{query}”.
        </p>
      ) : (
        <ol className="dp-grid" role="list">
          {list.map((d, i) => (
            <Poster key={d.id} dhadha={d} index={i} onOpen={() => onOpen(d)} />
          ))}
        </ol>
      )}
    </>
  )
}

/**
 * One Dhadha as a film poster: his picture full height, a dark fade, his name big at the
 * foot, then the club's numbers — total coins, members out of ten as dots, a row of his
 * members' faces, and the record. The whole poster opens the club.
 */
function Poster({ dhadha: d, index, onOpen }) {
  const faces = d.members.slice(0, 5)
  return (
    <li className="dp-cell" style={{ '--i': index }}>
      <button type="button" className="dp-poster" onClick={onOpen} aria-haspopup="dialog">
        <span className="dp-poster__art" aria-hidden="true">
          {d.photo ? (
            <img src={d.photo} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="dp-poster__mono">{initial(d.name)}</span>
          )}
        </span>
        <span className="dp-poster__shade" aria-hidden="true" />
        <span className="dp-poster__frame" aria-hidden="true" />
        <span className="dp-poster__no" aria-hidden="true">
          {two(d.place + 1)}
        </span>
        <span className="dp-poster__open" aria-hidden="true">
          View club
        </span>

        <span className="dp-poster__body">
          <span className="dp-poster__title">{d.title || 'Dhadha'}</span>
          <span className="dp-poster__name">{d.name}</span>
          <span className="dp-poster__rule" aria-hidden="true" />
          <span className="dp-poster__stats">
            <span className="dp-stat">
              <b>{number.format(d.coins)}</b>
              <small>Total coins</small>
            </span>
            <span className="dp-stat">
              <b>
                {d.members.length}
                <i>/{CREW_MAX}</i>
              </b>
              <small>Members</small>
            </span>
            <span className="dp-stat">
              <b>{d.fights.length ? `${d.record.win}–${d.record.loss}` : '—'}</b>
              <small>{d.fights.length ? 'Won–lost' : 'Fights'}</small>
            </span>
          </span>
          <span className="dp-poster__crew">
            <span className="dp-faces" aria-hidden="true">
              {faces.map((m, i) => (
                <span key={`${m.name}-${i}`} className="dp-face">
                  {m.photo ? <img src={m.photo} alt="" loading="lazy" decoding="async" /> : initial(m.name)}
                </span>
              ))}
              {d.members.length > faces.length && <span className="dp-face dp-face--more">+{d.members.length - faces.length}</span>}
            </span>
            <span className="dp-dots" aria-hidden="true">
              {Array.from({ length: CREW_MAX }, (_, i) => (
                <i key={i} className={i < d.members.length ? 'is-on' : ''} />
              ))}
            </span>
          </span>
        </span>
      </button>
    </li>
  )
}

/* ------------------------------------------------------------------ the pop-up */

/**
 * One Dhadha, popped up: the header (photo, name, title, line), the club's numbers (total
 * coins, members, record, win rate), its previous fights and its members by rank.
 * Esc, the × or a click outside closes it.
 */
function Popup({ dhadha: d, onClose }) {
  const ref = useRef(null)
  const [closing, setClosing] = useState(false)
  const [allFights, setAllFights] = useState(false)
  const [kept, setKept] = useState(d) // keeps the content while the close animation plays
  if (d && d !== kept) setKept(d)
  const shown = d ?? kept

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (d && !el.open) {
      setClosing(false)
      setAllFights(false)
      el.showModal()
      el.scrollTop = 0
      const prev = document.documentElement.style.overflow
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.documentElement.style.overflow = prev
      }
    }
    if (!d && el.open) el.close()
    return undefined
  }, [d])

  function close() {
    if (closing) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onClose()
    setClosing(true)
    window.setTimeout(onClose, 180) // let the close animation play
  }

  const fights = shown ? (allFights ? shown.fights : shown.fights.slice(0, FIGHTS_SHOWN)) : []

  return (
    <dialog
      ref={ref}
      className={`dxp ${closing ? 'is-closing' : ''}`}
      aria-labelledby="dxp-name"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === ref.current) close()
      }}
    >
      {shown && (
        <div className="dxp__panel">
          <button type="button" className="dxp__close" onClick={close} aria-label="Close">
            ×
          </button>

          <header className="dxp__head">
            <span className="dxp__photo" aria-hidden="true">
              {shown.photo ? <img src={shown.photo} alt="" decoding="async" /> : <b>{initial(shown.name)}</b>}
            </span>
            <div className="dxp__who">
              <p className="dxp__title">{shown.title || 'Dhadha'}</p>
              <h2 id="dxp-name" className="dxp__name">
                {shown.name}
              </h2>
              {shown.line && <p className="dxp__line">“{shown.line}”</p>}
            </div>
          </header>

          <dl className="dxp__stats">
            <div className="dxp__stat dxp__stat--coins">
              <dt>Total coins</dt>
              <dd>{number.format(shown.coins)}</dd>
            </div>
            <div className="dxp__stat">
              <dt>Members</dt>
              <dd>
                {shown.members.length}
                <small>/{CREW_MAX}</small>
              </dd>
            </div>
            <div className="dxp__stat">
              <dt>Record</dt>
              <dd>{shown.fights.length ? recordText(shown.record) : '—'}</dd>
            </div>
            <div className="dxp__stat">
              <dt>Win rate</dt>
              <dd>{shown.winRate === null ? '—' : `${shown.winRate}%`}</dd>
            </div>
          </dl>
          {shown.fights.length > 0 && (
            <span className="dx-split dxp__split" aria-hidden="true">
              <i className="dx-split__w" style={{ flexGrow: shown.record.win }} />
              <i className="dx-split__d" style={{ flexGrow: shown.record.draw }} />
              <i className="dx-split__l" style={{ flexGrow: shown.record.loss }} />
            </span>
          )}

          <div className="dxp__cols">
            <section className="dxp__block" aria-labelledby="dxp-fights">
              <h3 id="dxp-fights" className="dxp__h">
                Previous fights <span>{shown.fights.length}</span>
              </h3>
              {shown.fights.length === 0 ? (
                <p className="dx-note">No fights recorded yet.</p>
              ) : (
                <>
                  <ol className="dxp__fights" role="list">
                    {fights.map((f, k) => (
                      <li key={k} className={`dxp__fight dxp__fight--${f.result}`}>
                        <span className="dxp__res">{RESULT[f.result] ?? f.result}</span>
                        <span className="dxp__bout">
                          <strong>{f.member}</strong> vs {f.opponent}
                          {f.note && <span className="dxp__note">{f.note}</span>}
                        </span>
                        {f.date && (
                          <time className="dxp__date" dateTime={f.date}>
                            {formatDay(f.date)}
                          </time>
                        )}
                      </li>
                    ))}
                  </ol>
                  {!allFights && shown.fights.length > FIGHTS_SHOWN && (
                    <button type="button" className="dxp__more" onClick={() => setAllFights(true)}>
                      Show all {shown.fights.length} fights
                    </button>
                  )}
                </>
              )}
            </section>

            <section className="dxp__block" aria-labelledby="dxp-members">
              <h3 id="dxp-members" className="dxp__h">
                Members <span>{shown.members.length}</span>
              </h3>
              {shown.members.length === 0 ? (
                <p className="dx-note">The members haven’t been announced yet.</p>
              ) : (
                <ol className="dxp__members" role="list">
                  {shown.members.map((m, k) => {
                    const r = record(m.fights)
                    return (
                      <li key={`${m.name}-${k}`} className="dxp__member">
                        <span className="dxp__rank">
                          {m.rank ? two(m.rank) : '—'}
                          <span className="visually-hidden">{m.rank ? `, rank ${m.rank}` : ', not ranked yet'}</span>
                        </span>
                        <span className="dxp__mphoto" aria-hidden="true">
                          {m.photo ? <img src={m.photo} alt="" loading="lazy" decoding="async" /> : initial(m.name)}
                        </span>
                        <span className="dxp__mname">
                          {m.name}
                          <small>{m.fights.length ? recordText(r) : 'No fights yet'}</small>
                        </span>
                        <span className="dxp__mcoins">
                          {number.format(m.coins || 0)}
                          <span className="visually-hidden"> coins</span>
                        </span>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          </div>
        </div>
      )}
    </dialog>
  )
}

function BoardSkeleton() {
  return (
    <SkeletonGroup label="Loading the Dhadhas" className="dp-grid">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} w="100%" h="30rem" radius={0} style={{ display: 'block' }} />
      ))}
    </SkeletonGroup>
  )
}
