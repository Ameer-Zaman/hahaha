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

const SORTS = [
  { id: 'coins', label: 'Most coins', by: (a, b) => b.coins - a.coins },
  { id: 'wins', label: 'Most wins', by: (a, b) => b.record.win - a.record.win || b.coins - a.coins },
  { id: 'name', label: 'A–Z', by: (a, b) => a.name.localeCompare(b.name) },
]

/**
 * Dhadhas — every Dhadha in the city: a club of up to ten members. One card each (photo,
 * total coins, members out of ten, record); opening a card pops up the club: its total coins,
 * record, previous fights (every member's, newest first) and its members by rank.
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

      <section className="dx theme-black section" aria-label="All Dhadhas">
        <div className="container">
          {entry.status === 'loading' && <GridSkeleton />}
          {(entry.status === 'error' || entry.status === 'off' || entry.status === 'missing') && (
            <p className="dx-note" role="status">
              The Dhadhas can’t be loaded right now. Try again in a moment.
            </p>
          )}
          {entry.status === 'ok' &&
            (all.length === 0 ? (
              <div className="dx-empty">
                <p className="dx-empty__title">The Dhadhas are on their way</p>
                <p className="dx-note">Who they are and who rides with them will be announced on our Discord.</p>
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

function Board({ all, onOpen }) {
  const [sort, setSort] = useState('coins')
  const [query, setQuery] = useState('')
  const richest = useMemo(() => all.reduce((top, d) => (d.coins > (top?.coins ?? 0) ? d : top), null), [all])
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const found = q ? all.filter((d) => d.name.toLowerCase().includes(q) || d.members.some((m) => m.name.toLowerCase().includes(q))) : all
    return [...found].sort(SORTS.find((s) => s.id === sort).by)
  }, [all, sort, query])
  const players = all.reduce((n, d) => n + d.members.length, 0)

  return (
    <>
      <div className="dx-bar">
        <p className="dx-count">
          {two(all.length)} {all.length === 1 ? 'Dhadha' : 'Dhadhas'} · {players} {players === 1 ? 'member' : 'members'}
        </p>
        <div className="dx-tools">
          {all.length > 3 && (
            <label className="dx-search">
              <span className="visually-hidden">Find a Dhadha or a member</span>
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a Dhadha or member" />
            </label>
          )}
          <div className="dx-sort" role="group" aria-label="Sort">
            {SORTS.map((s) => (
              <button key={s.id} type="button" aria-pressed={sort === s.id} onClick={() => setSort(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="dx-note" role="status">
          No Dhadha or member matches “{query}”.
        </p>
      ) : (
        // a new order or search starts the gallery from the first again
        <Gallery key={`${sort}|${query}`} list={list} richestId={all.length > 1 ? richest?.id : null} onOpen={onOpen} />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ the gallery */

const SNAP_MS = 140 // a pause in the wheel this long snaps to the nearest Dhadha

/**
 * The Dhadhas as a horizontal gallery on a gentle curve: the one in the middle faces you,
 * those either side turn away, shrink and dim. Scroll (wheel or trackpad), drag, the arrows
 * or the arrow keys move along it; it settles on the nearest Dhadha. Clicking the one in the
 * middle opens him; clicking another brings him to the middle. The bar below shows how far
 * along you are, and the caption names the one in the middle with his coins and members.
 *
 * The wheel only moves the gallery while there is somewhere to go in that direction, so the
 * page carries on scrolling at either end.
 */
function Gallery({ list, richestId, onOpen }) {
  const stageRef = useRef(null)
  const cardRefs = useRef([])
  const [active, setActive] = useState(0)
  const motion = useRef({ pos: 0, target: 0, raf: 0, still: false, drag: null, wheelTimer: 0, moved: false })
  const last = list.length - 1

  // place every card for the current position (no React render per frame)
  const paint = () => {
    const m = motion.current
    const stage = stageRef.current
    if (!stage) return
    const w = stage.clientWidth
    const narrow = w < 640
    const gap = narrow ? w * 0.62 : Math.min(360, w * 0.24)
    cardRefs.current.forEach((el, i) => {
      if (!el) return
      const off = i - m.pos
      const far = Math.abs(off)
      const x = off * gap
      const turn = Math.max(-55, Math.min(55, -off * 24))
      const z = -Math.min(far, 4) * 140
      const scale = 1 - Math.min(far, 3) * 0.06
      el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) rotateY(${turn.toFixed(2)}deg) scale(${scale.toFixed(3)})`
      el.style.opacity = far > 3.6 ? '0' : String(1 - Math.min(far, 3) * 0.22)
      el.style.zIndex = String(100 - Math.round(far * 10))
      el.style.setProperty('--dim', Math.min(far, 1.5).toFixed(3))
      el.style.visibility = far > 4 ? 'hidden' : 'visible'
    })
  }

  const run = () => {
    const m = motion.current
    if (m.raf) return
    const step = () => {
      const k = m.drag ? 0.5 : 0.12
      m.pos += (m.target - m.pos) * (m.still ? 1 : k)
      if (Math.abs(m.target - m.pos) < 0.001) m.pos = m.target
      paint()
      const near = Math.round(m.pos)
      setActive((a) => (a === near ? a : Math.max(0, Math.min(last, near))))
      m.raf = m.pos !== m.target || m.drag ? requestAnimationFrame(step) : 0
    }
    m.raf = requestAnimationFrame(step)
  }

  const go = (to) => {
    const m = motion.current
    m.target = Math.max(0, Math.min(last, to))
    run()
  }

  useEffect(() => {
    const m = motion.current
    m.still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    paint()
    const stage = stageRef.current
    const onResize = () => paint()
    window.addEventListener('resize', onResize)

    // the wheel moves the gallery while it can; at the ends the page scrolls on
    const onWheel = (e) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!delta) return
      const forward = delta > 0
      if ((forward && m.target >= last) || (!forward && m.target <= 0)) return
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 0.33 : 1 / 260
      m.target = Math.max(0, Math.min(last, m.target + delta * unit))
      run()
      clearTimeout(m.wheelTimer)
      m.wheelTimer = setTimeout(() => go(Math.round(m.target)), SNAP_MS)
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('resize', onResize)
      stage.removeEventListener('wheel', onWheel)
      cancelAnimationFrame(m.raf)
      clearTimeout(m.wheelTimer)
      m.raf = 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // dragging (mouse or touch); a drag that moved isn't a click
  const onPointerDown = (e) => {
    if (e.button !== 0) return
    const m = motion.current
    const gap =
      stageRef.current.clientWidth < 640 ? stageRef.current.clientWidth * 0.62 : Math.min(360, stageRef.current.clientWidth * 0.24)
    m.drag = { x: e.clientX, from: m.target, gap, id: e.pointerId, t: performance.now(), vx: 0, lastX: e.clientX }
    m.moved = false
  }
  const onPointerMove = (e) => {
    const m = motion.current
    const d = m.drag
    if (!d || e.pointerId !== d.id) return
    const dx = e.clientX - d.x
    if (!m.moved && Math.abs(dx) > 6) {
      m.moved = true
      stageRef.current.setPointerCapture?.(e.pointerId)
    }
    if (!m.moved) return
    const now = performance.now()
    d.vx = (e.clientX - d.lastX) / Math.max(1, now - d.t)
    d.lastX = e.clientX
    d.t = now
    m.target = Math.max(-0.35, Math.min(last + 0.35, d.from - dx / d.gap))
    run()
  }
  const onPointerUp = () => {
    const m = motion.current
    const d = m.drag
    if (!d) return
    m.drag = null
    // a flick carries on a little further
    go(Math.round(m.target - (d.vx * 180) / d.gap))
  }

  const onKey = (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    if (step) {
      e.preventDefault()
      go(Math.round(motion.current.target) + step)
    } else if (e.key === 'Home') {
      e.preventDefault()
      go(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      go(last)
    }
  }

  const d = list[active]
  const progress = list.length > 1 ? active / last : 1

  return (
    <div className="dxg">
      <div
        ref={stageRef}
        className="dxg__stage"
        role="region"
        aria-roledescription="gallery"
        aria-label="Dhadhas — scroll, drag or use the arrow keys"
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <ol className="dxg__track" role="list">
          {list.map((x, i) => (
            <li key={x.id} ref={(el) => (cardRefs.current[i] = el)} className={`dxg__item${i === active ? ' is-active' : ''}`}>
              <button
                type="button"
                className="dxg__card"
                tabIndex={i === active ? 0 : -1}
                aria-haspopup={i === active ? 'dialog' : undefined}
                aria-label={i === active ? `Open ${x.name}` : `Show ${x.name}`}
                onClick={() => {
                  if (motion.current.moved) return
                  if (i === active) onOpen(x)
                  else go(i)
                }}
              >
                <span className="dxg__media" aria-hidden="true">
                  {x.photo ? (
                    <img src={x.photo} alt="" loading={i < 4 ? 'eager' : 'lazy'} decoding="async" draggable="false" />
                  ) : (
                    <b>{initial(x.name)}</b>
                  )}
                </span>
                <span className="dxg__no" aria-hidden="true">
                  {two(x.place + 1)}
                </span>
                {richestId === x.id && <span className="dxg__badge">Richest club</span>}
                <span className="dxg__open" aria-hidden="true">
                  Open
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="dxg__caption" aria-live="polite">
        <p key={d.id} className="dxg__cap">
          <span className="dxg__title">{d.title || 'Dhadha'}</span>
          <span className="dxg__name">
            {d.name}
            <span className="visually-hidden">
              , {active + 1} of {list.length}
            </span>
          </span>
          <span className="dxg__facts">
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
        </p>
      </div>

      <div className="dxg__nav">
        <button type="button" className="dxg__arrow" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous Dhadha">
          ‹
        </button>
        <span className="dxg__hint" aria-hidden="true">
          Scroll to explore
        </span>
        <button type="button" className="dxg__arrow" onClick={() => go(active + 1)} disabled={active === last} aria-label="Next Dhadha">
          ›
        </button>
      </div>
      <div className="dxg__progress" aria-hidden="true">
        <span style={{ '--p': progress, '--w': 1 / list.length }} />
      </div>
    </div>
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

function GridSkeleton() {
  return (
    <SkeletonGroup label="Loading the Dhadhas" className="dx-grid">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} w="100%" h="26rem" radius={0} style={{ display: 'block' }} />
      ))}
    </SkeletonGroup>
  )
}
