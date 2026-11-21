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
 * Dhadhas — an investigation board. Every Dhadha in the city is a case: his photo pinned up,
 * a typed note with the club's numbers, his members' photos tied to him with gold thread.
 * Opening a case pops up his file: total coins, record, previous fights (every member's,
 * newest first) and his members by rank.
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
      <section className="db theme-black" aria-labelledby="dhadhas-title">
        <Flashlight />
        <header className="db-head container">
          <p className="db-head__kicker">
            <span>Case files</span>
            {entry.status === 'ok' && all.length > 0 && (
              <span>
                {two(all.length)} open {all.length === 1 ? 'case' : 'cases'}
              </span>
            )}
          </p>
          <h1 id="dhadhas-title" className="db-head__title">
            Dhadhas
          </h1>
          <p className="db-head__sub">
            Every club in the city, pinned to the board with the people who run with it. Open a file for its fights and total coins.
          </p>
        </header>

        <div className="container">
          {entry.status === 'loading' && <BoardSkeleton />}
          {(entry.status === 'error' || entry.status === 'off' || entry.status === 'missing') && (
            <p className="dx-note" role="status">
              The Dhadhas can’t be loaded right now. Try again in a moment.
            </p>
          )}
          {entry.status === 'ok' &&
            (all.length === 0 ? (
              <div className="db-empty">
                <p className="db-empty__title">The board is empty — for now</p>
                <p className="dx-note">Who the Dhadhas are and who rides with them will be announced on our Discord.</p>
                <ApplyLink className="btn btn--primary">Get updates on Discord</ApplyLink>
              </div>
            ) : (
              <Board all={all} onOpen={show} />
            ))}
        </div>
      </section>

      <Popup dhadha={open} onClose={() => show(null)} />
    </>
  )
}

/* ------------------------------------------------------------------ the board */

/** A small, steady number from a name, so each photo hangs at its own angle on every visit. */
function seed(text, salt = 0) {
  let h = 2166136261 ^ salt
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return ((h >>> 0) % 1000) / 1000
}
const tilt = (text, salt, max) => ((seed(text, salt) - 0.5) * 2 * max).toFixed(2)

/**
 * Where each member's photo is pinned (as % of the case): up to two rows of five, each row
 * centred under the Dhadha and a little off the line, the way photos end up on a real board.
 */
function slotsFor(count) {
  const out = []
  const rows = count > 5 ? [Math.ceil(count / 2), Math.floor(count / 2)] : [count]
  rows.forEach((k, row) => {
    for (let j = 0; j < k; j++) out.push({ x: 50 + (j - (k - 1) / 2) * 20 + (row ? 3 : -1), y: row ? 79 : 61 })
  })
  return out
}
const BOSS_PIN = { x: 30, y: 6 } // the pin at the top of the Dhadha's photo

const SORTS = [
  { id: 'coins', label: 'Most coins', by: (a, b) => b.coins - a.coins || a.place - b.place },
  { id: 'wins', label: 'Most wins', by: (a, b) => b.record.win - a.record.win || b.coins - a.coins },
  { id: 'name', label: 'A–Z', by: (a, b) => a.name.localeCompare(b.name) },
]

/** The board: one case per Dhadha. Search and sort once there are enough cases to need them. */
function Board({ all, onOpen }) {
  const [sort, setSort] = useState('coins')
  const [query, setQuery] = useState('')
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const found = q ? all.filter((d) => d.name.toLowerCase().includes(q) || d.members.some((m) => m.name.toLowerCase().includes(q))) : all
    return [...found].sort(SORTS.find((s) => s.id === sort).by)
  }, [all, sort, query])
  const top = useMemo(() => (all.length > 1 ? all.reduce((a, b) => (b.coins > a.coins ? b : a)) : null), [all])

  return (
    <>
      {all.length > 3 && (
        <div className="db-tools">
          <label className="db-search">
            <span className="visually-hidden">Find a Dhadha or a member</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the files…" />
          </label>
          <div className="db-sort" role="group" aria-label="Sort">
            {SORTS.map((s) => (
              <button key={s.id} type="button" aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {list.length === 0 ? (
        <p className="dx-note" role="status">
          No file matches “{query}”.
        </p>
      ) : (
        <ol className="db-cases" role="list">
          {list.map((d) => (
            <Case key={d.id} dhadha={d} topEarner={top?.id === d.id && top.coins > 0} onOpen={() => onOpen(d)} />
          ))}
        </ol>
      )}
    </>
  )
}

/**
 * One case on the board: the Dhadha's photo pinned at the top left, a typed note beside it
 * with the club's numbers and a stamp, and his members' photos pinned below, each tied to his
 * pin with a gold thread. Anything in the case opens his file.
 */
function Case({ dhadha: d, topEarner, onOpen }) {
  const shown = d.members.slice(0, CREW_MAX)
  const slots = slotsFor(shown.length)
  // the case is as tall as its rows of members need; positions are scaled to match
  const rows = shown.length > 5 ? 2 : shown.length ? 1 : 0
  const tall = [3.7, 4.85, 6][rows]
  const fy = (y) => (y * 6) / tall
  const stamp = topEarner
    ? 'Top earner'
    : d.members.length === 0
      ? 'No known members'
      : d.fights.length === 0
        ? 'No fights on record'
        : null
  return (
    <li className="db-case">
      <article className="db-case__inner" style={{ aspectRatio: `5 / ${tall}` }} aria-labelledby={`case-${d.id}`}>
        {/* the threads, from his pin to each member's */}
        <svg className="db-threads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {shown.map((m, i) => {
            const s = slots[i]
            const sag = 4 + seed(m.name, i) * 5
            const [bx, by, sx, sy] = [BOSS_PIN.x, fy(BOSS_PIN.y), s.x, fy(s.y)]
            const mx = (bx + sx) / 2
            const my = (by + sy) / 2 + sag
            return <path key={i} className={`db-thread db-thread--${i}`} d={`M${bx} ${by} Q${mx} ${my} ${sx} ${sy}`} />
          })}
        </svg>

        <button
          type="button"
          className="db-boss"
          style={{ '--tilt': `${tilt(d.name, 1, 3.5)}deg` }}
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-label={`Open the file on ${d.name}`}
        >
          <span className="db-pin" aria-hidden="true" />
          <span className="db-photo" aria-hidden="true">
            {d.photo ? <img src={d.photo} alt="" loading="lazy" decoding="async" /> : <b>{initial(d.name)}</b>}
          </span>
          <span className="db-caption" aria-hidden="true">
            {d.name}
          </span>
        </button>

        <div className="db-note" style={{ '--tilt': `${tilt(d.name, 2, 2.5)}deg` }}>
          <span className="db-tape" aria-hidden="true" />
          <p className="db-note__case">Case {two(d.place + 1)}</p>
          <h2 id={`case-${d.id}`} className="db-note__name">
            <button type="button" onClick={onOpen} aria-haspopup="dialog">
              {d.name}
            </button>
          </h2>
          <p className="db-note__role">{d.title || 'Dhadha'}</p>
          <dl className="db-note__facts">
            <div>
              <dt>Total coins</dt>
              <dd>{number.format(d.coins)}</dd>
            </div>
            <div>
              <dt>Members</dt>
              <dd>
                {d.members.length}/{CREW_MAX}
              </dd>
            </div>
            <div>
              <dt>Record</dt>
              <dd>{d.fights.length ? recordText(d.record) : '—'}</dd>
            </div>
          </dl>
          {stamp && (
            <p className="db-stamp" style={{ '--tilt': `${-8 + seed(d.name, 3) * 6}deg` }}>
              {stamp}
            </p>
          )}
        </div>

        {shown.length > 0 && (
          <ul className="db-crew" aria-label={`${d.name}’s members`}>
            {shown.map((m, i) => (
              <li
                key={`${m.name}-${i}`}
                className="db-mate"
                style={{ left: `${slots[i].x}%`, top: `${fy(slots[i].y)}%`, '--tilt': `${tilt(m.name, i + 4, 7)}deg`, '--i': i }}
              >
                <button type="button" onClick={onOpen} aria-haspopup="dialog" data-thread={i}>
                  <span className="db-pin db-pin--small" aria-hidden="true" />
                  <span className="db-photo" aria-hidden="true">
                    {m.photo ? <img src={m.photo} alt="" loading="lazy" decoding="async" /> : <b>{initial(m.name)}</b>}
                  </span>
                  <span className="db-caption">{m.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>
    </li>
  )
}

/**
 * The board is dark; a soft light follows the pointer, as if someone were going over it with
 * a torch. Only with a mouse and when motion is welcome; otherwise the board is evenly lit.
 */
function Flashlight() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    const board = el?.parentElement
    if (!el || !board) return undefined
    if (!window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return undefined
    let raf = 0
    const onMove = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = board.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - r.left}px`)
        el.style.setProperty('--my', `${e.clientY - r.top}px`)
        el.classList.add('is-on')
      })
    }
    const onLeave = () => el.classList.remove('is-on')
    board.addEventListener('pointermove', onMove)
    board.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      board.removeEventListener('pointermove', onMove)
      board.removeEventListener('pointerleave', onLeave)
    }
  }, [])
  return <div ref={ref} className="db-light" aria-hidden="true" />
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
    <SkeletonGroup label="Loading the Dhadhas" className="db-cases">
      {Array.from({ length: 2 }, (_, i) => (
        <Skeleton key={i} w="100%" h="34rem" radius={0} style={{ display: 'block' }} />
      ))}
    </SkeletonGroup>
  )
}
