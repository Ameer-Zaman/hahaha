import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ApplyLink from '../../components/ui/ApplyLink'
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
 * Dhadhas — every Dhadha in the city: a club of up to ten members, drawn as a family tree on
 * a dark board. Opening any face pops up the club: its total coins, record, previous fights
 * (every member's, newest first) and its members by rank.
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
      <section className="dk theme-black" aria-labelledby="dhadhas-title">
        <div className="dk-intro container">
          <h1 id="dhadhas-title" className="dk-title">
            Dhadhas
          </h1>
          <p className="dk-sub">
            Every club in the city and the ten who stand with it. Choose a face to see the club’s fights and total coins.
          </p>
        </div>

        {entry.status === 'loading' && <BoardSkeleton />}
        {(entry.status === 'error' || entry.status === 'off' || entry.status === 'missing') && (
          <p className="dk-note container" role="status">
            The Dhadhas can’t be loaded right now. Try again in a moment.
          </p>
        )}
        {entry.status === 'ok' &&
          (all.length === 0 ? (
            <div className="dk-empty container">
              <p className="dk-empty__title">The Dhadhas are on their way</p>
              <p className="dk-note">Who they are and who rides with them will be announced on our Discord.</p>
              <ApplyLink className="btn btn--primary">Get updates on Discord</ApplyLink>
            </div>
          ) : (
            <FamilyBoard all={all} onOpen={show} />
          ))}
      </section>

      <Popup dhadha={open} onClose={() => show(null)} />
    </>
  )
}

/* ------------------------------------------------------------------ the family board */

/**
 * The board: one family per Dhadha, side by side, and as many as there are — it pans sideways
 * (drag with the mouse, swipe, scroll sideways, or the arrows). Each family is the Dhadha at the
 * top with the club's numbers, and below him a spine with his members branching off it, best
 * ranked first; slots not filled yet stand as unknown faces. Pointing at a family lights it and
 * fades the others; pointing at a member lights their branch. Any face opens the club.
 */
function FamilyBoard({ all, onOpen }) {
  const [query, setQuery] = useState('')
  const boardRef = useRef(null)
  const drag = useRef(null)
  const dragged = useRef(false)
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? all.filter((d) => d.name.toLowerCase().includes(q) || d.members.some((m) => m.name.toLowerCase().includes(q))) : all
  }, [all, query])
  const members = all.reduce((n, d) => n + d.members.length, 0)

  const step = (dir) => {
    const board = boardRef.current
    const col = board?.querySelector('.dk-family')
    if (board && col) board.scrollBy({ left: dir * (col.offsetWidth + 1), behavior: 'smooth' })
  }

  // a mouse drags the board sideways; touch scrolls it natively
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    drag.current = { x: e.clientX, left: boardRef.current.scrollLeft, moved: false }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true
      boardRef.current.classList.add('is-dragging')
    }
    if (d.moved) boardRef.current.scrollLeft = d.left - dx
  }
  const endDrag = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    boardRef.current?.classList.remove('is-dragging')
    // the click that ends a drag shouldn't open anything
    if (d.moved) {
      dragged.current = true
      setTimeout(() => (dragged.current = false), 0)
    }
  }
  const open = (d) => {
    if (!dragged.current) onOpen(d)
  }

  return (
    <>
      <div className="dk-bar container">
        <p className="dk-count">
          {two(all.length)} {all.length === 1 ? 'family' : 'families'} · {members} {members === 1 ? 'member' : 'members'}
        </p>
        <div className="dk-tools">
          {all.length > 3 && (
            <label className="dk-search">
              <span className="visually-hidden">Find a Dhadha or a member</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a name" />
            </label>
          )}
          {list.length > 1 && (
            <span className="dk-arrows">
              <button type="button" onClick={() => step(-1)} aria-label="Previous families">
                ‹
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Next families">
                ›
              </button>
            </span>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="dk-note container" role="status">
          No Dhadha or member matches “{query}”.
        </p>
      ) : (
        <div
          ref={boardRef}
          className="dk-board"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          <ol className="dk-families" role="list">
            {list.map((d) => (
              <Family key={d.id} dhadha={d} onOpen={() => open(d)} />
            ))}
          </ol>
        </div>
      )}
    </>
  )
}

function Family({ dhadha: d, onOpen }) {
  const empty = Math.max(0, CREW_MAX - d.members.length)
  return (
    <li className="dk-family">
      <header className="dk-head">
        <span className="dk-no">{two(d.place + 1)}</span>
        <h2 className="dk-name">
          <button type="button" onClick={onOpen} aria-haspopup="dialog">
            {d.name}
          </button>
        </h2>
        <p className="dk-role">{d.title || 'Dhadha'}</p>
      </header>

      <button type="button" className="dk-leader" onClick={onOpen} aria-haspopup="dialog" aria-label={`Open ${d.name}`}>
        <span className="dk-face dk-face--leader" aria-hidden="true">
          {d.photo ? <img src={d.photo} alt="" loading="lazy" decoding="async" draggable="false" /> : <b>{initial(d.name)}</b>}
        </span>
        <span className="dk-totals">
          <span>
            <b>{number.format(d.coins)}</b> coins
          </span>
          <span>
            <b>
              {d.members.length}/{CREW_MAX}
            </b>{' '}
            members
          </span>
          <span>{d.fights.length ? recordText(d.record) : 'No fights yet'}</span>
        </span>
      </button>

      <ol className="dk-tree" role="list" aria-label={`${d.name}’s members`}>
        {d.members.map((m, i) => (
          <li key={`${m.name}-${i}`} className="dk-node">
            <button type="button" className="dk-person" onClick={onOpen} aria-haspopup="dialog">
              <span className="dk-face" aria-hidden="true">
                {m.photo ? <img src={m.photo} alt="" loading="lazy" decoding="async" draggable="false" /> : <b>{initial(m.name)}</b>}
              </span>
              <span className="dk-pname">{m.name}</span>
              <span className="dk-pmeta">
                {m.rank ? `No. ${two(m.rank)}` : 'Unranked'} · {number.format(m.coins || 0)}
                <span className="visually-hidden"> coins</span>
              </span>
            </button>
          </li>
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <li key={`empty-${i}`} className="dk-node dk-node--unknown" aria-hidden="true">
            <span className="dk-person">
              <span className="dk-face">?</span>
              <span className="dk-pname">Unknown</span>
            </span>
          </li>
        ))}
      </ol>
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
    <SkeletonGroup label="Loading the Dhadhas" className="dk-skel container">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} w="100%" h="34rem" radius={0} style={{ display: 'block' }} />
      ))}
    </SkeletonGroup>
  )
}
