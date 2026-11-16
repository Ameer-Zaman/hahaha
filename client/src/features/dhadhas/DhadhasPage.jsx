import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ApplyLink from '../../components/ui/ApplyLink'
import ParallaxScope from '../../components/ui/ParallaxScope'
import ParallaxWord from '../../components/ui/ParallaxWord'
import { Skeleton, SkeletonGroup } from '../../components/ui/Skeleton'
import usePageTitle from '../../hooks/usePageTitle'
import { usePublic } from '../../lib/publicData'
import './dhadhas.css'

const number = new Intl.NumberFormat('en-IN')
const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDay = (iso) => (iso ? day.format(new Date(`${iso}T12:00:00`)) : '')
const initial = (name) => [...(name ?? '').trim()][0]?.toUpperCase() ?? ''
const two = (n) => String(n).padStart(2, '0')

/** Wins, losses and draws in a list of fights. */
const record = (fights) => ({
  win: fights.filter((f) => f.result === 'win').length,
  loss: fights.filter((f) => f.result === 'loss').length,
  draw: fights.filter((f) => f.result === 'draw').length,
})
const recordText = (r) => `${r.win}–${r.loss}${r.draw ? `–${r.draw}` : ''}`

/** The crew by rank position (1 first); players without one after, in the panel's order. */
const byRank = (members) =>
  members.map((m, i) => ({ ...m, order: i })).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.order - b.order)

/**
 * Dhadhas — an index, in the Swiss manner: one row per Dhadha, his name set large, his crew's
 * numbers beside it. Pointing at a row shows his portrait by the cursor; opening it unfolds his
 * crew right there (rank, record, coins), and a player unfolds their fights.
 *
 * An open Dhadha has his own address (/dhadhas/<dhadha>), so it can be shared; following such
 * a link opens his row and brings it into view.
 */
export default function DhadhasPage() {
  const entry = usePublic('/dhadhas')
  const list = useMemo(() => (entry.status === 'ok' ? (entry.data?.dhadhas ?? []) : []), [entry])
  const { slug } = useParams()
  const navigate = useNavigate()
  const open = slug ? list.find((d) => d.id === slug) : null
  usePageTitle(open ? `${open.name} · Dhadhas` : 'Dhadhas')

  // a link to a Dhadha who isn't there (any more): just show the index
  useEffect(() => {
    if (slug && entry.status === 'ok' && !open) navigate('/dhadhas', { replace: true })
  }, [slug, entry.status, open, navigate])

  const toggle = (d) => navigate(open?.id === d.id ? '/dhadhas' : `/dhadhas/${d.id}`, { replace: true, preventScrollReset: true })

  return (
    <>
      <ParallaxScope as="section" className="page-head page-head--word theme-dark" aria-labelledby="dhadhas-title">
        <ParallaxWord text="Dhadhas" motion="x:6%:-10%" className="page-head__word" />
        <div className="container">
          <h1 id="dhadhas-title" className="page-head__title">
            Dhadhas
          </h1>
          <p className="lede">Every Dhadha and his crew. Open a name to see each player’s rank, record and coins.</p>
        </div>
      </ParallaxScope>

      <section className="dx theme-black section" aria-label="All Dhadhas">
        <div className="container">
          {entry.status === 'loading' && <IndexSkeleton />}
          {(entry.status === 'error' || entry.status === 'off' || entry.status === 'missing') && (
            <p className="dx-note" role="status">
              The Dhadhas can’t be loaded right now. Try again in a moment.
            </p>
          )}
          {entry.status === 'ok' &&
            (list.length === 0 ? (
              <div className="dx-empty">
                <p className="dx-empty__title">The Dhadhas are on their way</p>
                <p className="dx-note">Who they are and who rides with them will be announced on our Discord.</p>
                <ApplyLink className="btn btn--primary">Get updates on Discord</ApplyLink>
              </div>
            ) : (
              <Index list={list} openId={open?.id ?? null} onToggle={toggle} scrollTo={slug} />
            ))}
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------------------ the index */

function Index({ list, openId, onToggle, scrollTo }) {
  const { ref: peekRef, show, move, hide } = usePeek()
  const scrolled = useRef(false)

  // arrived on a Dhadha's own address: bring his row into view, once
  useEffect(() => {
    if (!scrollTo || scrolled.current) return
    scrolled.current = true
    const row = document.getElementById(`dx-${scrollTo}`)
    if (row) requestAnimationFrame(() => row.scrollIntoView({ block: 'start', behavior: 'instant' }))
  }, [scrollTo])

  const totalPlayers = list.reduce((n, d) => n + d.members.length, 0)

  return (
    <div className="dx-index">
      <p className="dx-count">
        {two(list.length)} {list.length === 1 ? 'Dhadha' : 'Dhadhas'} · {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'}
      </p>
      <div className="dx-head" aria-hidden="true">
        <span>No.</span>
        <span>Dhadha</span>
        <span>Crew</span>
        <span>Coins</span>
        <span>Record</span>
        <span />
      </div>
      <ol className="dx-list" role="list" onPointerLeave={hide}>
        {list.map((d, i) => (
          <Row
            key={d.id}
            dhadha={d}
            place={i}
            open={openId === d.id}
            onToggle={() => onToggle(d)}
            onPeek={(e) => show(e, d.photo)}
            onMove={move}
          />
        ))}
      </ol>
      <span ref={peekRef} className="dx-peek" aria-hidden="true">
        <img alt="" />
      </span>
    </div>
  )
}

/**
 * The portrait that follows the cursor over the index (fine pointers only, motion allowed).
 * One image element, moved with transforms; it eases after the pointer instead of sticking to it.
 */
function usePeek() {
  const ref = useRef(null)
  const state = useRef({ x: 0, y: 0, tx: 0, ty: 0, raf: 0, on: false })
  const ok = useRef(false)
  useEffect(() => {
    ok.current = window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches
    const s = state.current
    return () => cancelAnimationFrame(s.raf)
  }, [])

  const tick = () => {
    const s = state.current
    const el = ref.current
    if (!el) return
    s.x += (s.tx - s.x) * 0.18
    s.y += (s.ty - s.y) * 0.18
    const tilt = Math.max(-6, Math.min(6, (s.tx - s.x) * 0.08))
    el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%) rotate(${tilt}deg)`
    s.raf = s.on || Math.abs(s.tx - s.x) > 0.5 ? requestAnimationFrame(tick) : 0
  }
  const move = (e) => {
    const s = state.current
    s.tx = e.clientX
    s.ty = e.clientY
    if (s.on && !s.raf) s.raf = requestAnimationFrame(tick)
  }
  const show = (e, photo) => {
    const el = ref.current
    if (!ok.current || !el) return
    const s = state.current
    if (!photo) return hide()
    const img = el.firstChild
    if (img.getAttribute('src') !== photo) img.setAttribute('src', photo)
    if (!s.on) {
      s.x = s.tx = e.clientX
      s.y = s.ty = e.clientY
    }
    s.on = true
    el.classList.add('is-on')
    if (!s.raf) s.raf = requestAnimationFrame(tick)
  }
  const hide = () => {
    state.current.on = false
    ref.current?.classList.remove('is-on')
  }
  return { ref, show, move, hide }
}

function Row({ dhadha: d, place, open, onToggle, onPeek, onMove }) {
  const crew = useMemo(() => byRank(d.members), [d.members])
  const coins = crew.reduce((sum, m) => sum + (m.coins || 0), 0)
  const r = record(crew.flatMap((m) => m.fights))
  const panel = `dx-crew-${d.id}`
  return (
    <li id={`dx-${d.id}`} className={`dx-row${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="dx-row__bar"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panel}
        onPointerEnter={onPeek}
        onPointerMove={onMove}
      >
        <span className="dx-row__no">{two(place + 1)}</span>
        <span className="dx-row__name">
          <span className="dx-row__thumb" aria-hidden="true">
            {d.photo ? <img src={d.photo} alt="" loading="lazy" decoding="async" /> : initial(d.name)}
          </span>
          <span className="dx-row__title">
            {d.name}
            {d.title && <small>{d.title}</small>}
          </span>
        </span>
        <span className="dx-row__stat" data-label="Crew">
          {crew.length}
          <small>/10</small>
        </span>
        <span className="dx-row__stat" data-label="Coins">
          {number.format(coins)}
        </span>
        <span className="dx-row__stat" data-label="Record">
          {r.win + r.loss + r.draw ? recordText(r) : '—'}
        </span>
        <span className="dx-row__plus" aria-hidden="true" />
      </button>

      <div id={panel} className="dx-row__panel" role="region" aria-label={`${d.name}’s crew`} inert={!open}>
        <div className="dx-row__inner">
          <Crew dhadha={d} crew={crew} />
        </div>
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------ his crew */

function Crew({ dhadha: d, crew }) {
  const [shown, setShown] = useState(null) // the player whose fights are open
  return (
    <div className="dx-crew">
      <div className="dx-crew__side">
        <span className="dx-crew__photo" aria-hidden="true">
          {d.photo ? <img src={d.photo} alt="" loading="lazy" decoding="async" /> : initial(d.name)}
        </span>
        <p className="dx-crew__cat">{d.title || 'Dhadha'}</p>
        {d.line && <p className="dx-crew__line">{d.line}</p>}
      </div>

      {crew.length === 0 ? (
        <p className="dx-note">His crew hasn’t been announced yet.</p>
      ) : (
        <ol className="dx-players" role="list">
          {crew.map((m) => (
            <Player key={m.name} member={m} open={shown === m.name} onToggle={() => setShown(shown === m.name ? null : m.name)} />
          ))}
        </ol>
      )}
    </div>
  )
}

function Player({ member: m, open, onToggle }) {
  const r = record(m.fights)
  const fights = useMemo(() => [...m.fights].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [m.fights])
  return (
    <li className={`dx-p${open ? ' is-open' : ''}`}>
      <button type="button" className="dx-p__bar" onClick={onToggle} aria-expanded={open}>
        <span className="dx-p__rank">
          {m.rank ? two(m.rank) : '—'}
          <span className="visually-hidden">{m.rank ? `, rank ${m.rank}` : ', not ranked yet'}</span>
        </span>
        <span className="dx-p__photo" aria-hidden="true">
          {m.photo ? <img src={m.photo} alt="" loading="lazy" decoding="async" /> : initial(m.name)}
        </span>
        <span className="dx-p__name">{m.name}</span>
        <span className="dx-p__record">
          {m.fights.length ? (
            <>
              <span className="dx-w">{r.win}W</span> <span className="dx-l">{r.loss}L</span>
              {r.draw ? ` ${r.draw}D` : ''}
            </>
          ) : (
            '—'
          )}
        </span>
        <span className="dx-p__coins">
          {number.format(m.coins || 0)}
          <span className="visually-hidden"> coins</span>
        </span>
      </button>
      {open && (
        <ul className="dx-fights" role="list">
          {fights.length === 0 && <li className="dx-fights__none">No fights recorded yet.</li>}
          {fights.map((f, k) => (
            <li key={k} className={`dx-fight dx-fight--${f.result}`}>
              <span className="dx-fight__result">{f.result === 'win' ? 'Won' : f.result === 'loss' ? 'Lost' : 'Draw'}</span>
              <span className="dx-fight__vs">
                vs {f.opponent}
                {f.note && <span className="dx-fight__note"> — {f.note}</span>}
              </span>
              {f.date && <time dateTime={f.date}>{formatDay(f.date)}</time>}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function IndexSkeleton() {
  return (
    <SkeletonGroup label="Loading the Dhadhas" className="dx-index">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} w="100%" h="5.5rem" radius={0} style={{ display: 'block', marginBottom: 1 }} />
      ))}
    </SkeletonGroup>
  )
}
