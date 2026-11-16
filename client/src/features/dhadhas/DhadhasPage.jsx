import { useEffect, useMemo, useRef, useState } from 'react'
import '@fontsource/cinzel/latin-600.css'
import '@fontsource/cinzel/latin-800.css'
import '@fontsource/cormorant-garamond/latin-500-italic.css'

import ApplyLink from '../../components/ui/ApplyLink'
import usePageTitle from '../../hooks/usePageTitle'
import { gsap, MOTION_OK, useGSAP } from '../../lib/gsap'
import { usePublic } from '../../lib/publicData'
import Seal from './Seal'
import './dhadhas.css'

const NAME = 'DHADHAS'
const coins = new Intl.NumberFormat('en-IN')
const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDay = (iso) => (iso ? day.format(new Date(`${iso}T12:00:00`)) : '')

/** Wins, losses and draws in a list of fights. */
const record = (fights) => ({
  win: fights.filter((f) => f.result === 'win').length,
  loss: fights.filter((f) => f.result === 'loss').length,
  draw: fights.filter((f) => f.result === 'draw').length,
})
const recordText = (r) => `${r.win}W · ${r.loss}L${r.draw ? ` · ${r.draw}D` : ''}`

/**
 * Dhadhas — the Dhadha and his crew.
 *
 * The page is one card: the Dhadha, in a gold frame, with his crew's totals. Opening the card
 * shows the crew (up to 10 players) by rank position, each with their coins and record;
 * opening a player shows their fight history, newest first.
 *
 * Everything comes from Panel → Dhadhas. With nothing filled in the page is a "coming soon".
 */
export default function DhadhasPage() {
  usePageTitle('Dhadhas')
  const entry = usePublic('/dhadhas')
  const data = entry.status === 'ok' ? entry.data : null
  const leader = data?.leader ?? null
  const crew = useMemo(() => {
    const list = (data?.members ?? []).map((m, i) => ({ ...m, order: i }))
    // by rank position (1 first); players without one after, in the panel's order
    return list.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.order - b.order)
  }, [data])
  const filled = !!(leader?.name || crew.length)
  const [open, setOpen] = useState(false)

  const root = useRef(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from('.dh-hero__eyebrow', { y: 10, opacity: 0, duration: 0.6 }, 0.1)
          .from('.dh-hero__letter', { yPercent: 115, duration: 1, stagger: 0.06 }, 0.2)
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  return (
    <div ref={root} className="dh">
      <section className="dh-hero" aria-labelledby="dh-title">
        <div className="dh-hero__smoke" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <Embers />
        <div className="dh-hero__inner container">
          <p className="dh-hero__eyebrow">
            <span>Factions</span>
            <Diamond />
            <span>Dhadhas</span>
          </p>
          <h1 id="dh-title" className="dh-hero__name" aria-label="Dhadhas">
            {[...NAME].map((ch, i) => (
              <span key={i} className="dh-hero__mask" aria-hidden="true">
                <span className="dh-hero__letter">{ch}</span>
              </span>
            ))}
          </h1>

          {entry.status === 'loading' ? (
            <div className="dh-card dh-card--loading" aria-busy="true" aria-label="Loading" />
          ) : filled ? (
            <LeaderCard leader={leader} crew={crew} onOpen={() => setOpen(true)} />
          ) : (
            <div className="dh-soon">
              <Seal emblem={null} />
              <p className="dh-soon__text">
                The Dhadha and his crew are on their way to Rameirah Empire. Watch our Discord for the reveal.
              </p>
              <ApplyLink className="dh-btn">Get updates on Discord</ApplyLink>
            </div>
          )}
        </div>
      </section>

      {filled && <CrewDialog open={open} onClose={() => setOpen(false)} leader={leader} crew={crew} />}
    </div>
  )
}

/* ------------------------------------------------------------------ the Dhadha's card */

function LeaderCard({ leader, crew, onOpen }) {
  const ref = useTilt()
  const total = crew.reduce((sum, m) => sum + (m.coins || 0), 0)
  const r = record(crew.flatMap((m) => m.fights))
  const name = leader.name || 'The Dhadha'
  return (
    <div className="dh-card-wrap">
      <button type="button" ref={ref} className="dh-card" onClick={onOpen} aria-haspopup="dialog">
        <span className="dh-card__frame">
          <span className="dh-card__photo">
            {leader.photo ? (
              <img src={leader.photo} alt="" decoding="async" />
            ) : (
              <span className="dh-card__initial" aria-hidden="true">
                {[...name.trim()][0]?.toUpperCase()}
              </span>
            )}
          </span>
          <span className="dh-card__shade" aria-hidden="true" />
          <span className="dh-card__sheen" aria-hidden="true" />
          <span className="dh-card__corner dh-card__corner--tl" aria-hidden="true" />
          <span className="dh-card__corner dh-card__corner--tr" aria-hidden="true" />
          <span className="dh-card__corner dh-card__corner--bl" aria-hidden="true" />
          <span className="dh-card__corner dh-card__corner--br" aria-hidden="true" />
          <span className="dh-card__badge" aria-hidden="true">
            <Seal emblem={null} still />
          </span>

          <span className="dh-card__body">
            <span className="dh-card__title">{leader.title || 'The Dhadha'}</span>
            <span className="dh-card__name">{name}</span>
            {leader.line && <span className="dh-card__line">{leader.line}</span>}
            <span className="dh-card__stats">
              <span>
                <b>{crew.length}</b>
                <small>{crew.length === 1 ? 'Player' : 'Players'}</small>
              </span>
              <span>
                <b>{coins.format(total)}</b>
                <small>Coins</small>
              </span>
              <span>
                <b>
                  {r.win}–{r.loss}
                </b>
                <small>Record</small>
              </span>
            </span>
          </span>
        </span>
        <span className="visually-hidden">— open {name}’s crew</span>
      </button>
      <p className="dh-card-hint" aria-hidden="true">
        <span className="dh-card-hint__dot" />
        Tap the card to see his crew
      </p>
    </div>
  )
}

/** Tilt an element a little towards the pointer while it's over it (fine pointers, motion allowed). */
function useTilt() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return undefined
    let raf = 0
    const target = { x: 0, y: 0 }
    const now = { x: 0, y: 0 }
    const tick = () => {
      now.x += (target.x - now.x) * 0.12
      now.y += (target.y - now.y) * 0.12
      el.style.setProperty('--tx', now.x.toFixed(4))
      el.style.setProperty('--ty', now.y.toFixed(4))
      raf = Math.abs(target.x - now.x) + Math.abs(target.y - now.y) > 0.001 ? requestAnimationFrame(tick) : 0
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const move = (e) => {
      const r = el.getBoundingClientRect()
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1
      kick()
    }
    const leave = () => {
      target.x = 0
      target.y = 0
      kick()
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(raf)
    }
  }, [])
  return ref
}

/* ------------------------------------------------------------------ the crew */

function CrewDialog({ open, onClose, leader, crew }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(null) // the player whose fights are unfolded

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return undefined
    if (open && !dialog.open) {
      dialog.showModal()
      const html = document.documentElement
      const before = html.style.overflow
      html.style.overflow = 'hidden'
      return () => {
        html.style.overflow = before
      }
    }
    if (!open && dialog.open) dialog.close()
    return undefined
  }, [open])

  const name = leader.name || 'The Dhadha'
  return (
    <dialog
      ref={ref}
      className="dh-crew"
      aria-labelledby="dh-crew-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // a click on the dimmed backdrop
      }}
    >
      <div className="dh-crew__panel">
        <header className="dh-crew__head">
          <span className="dh-crew__avatar" aria-hidden="true">
            {leader.photo ? <img src={leader.photo} alt="" /> : [...name.trim()][0]?.toUpperCase()}
          </span>
          <div>
            <p className="dh-crew__kicker">{leader.title || 'The Dhadha'}</p>
            <h2 id="dh-crew-title" className="dh-crew__title">
              {name}’s crew
            </h2>
            <p className="dh-crew__sub">
              {crew.length} {crew.length === 1 ? 'player' : 'players'} · by rank position
            </p>
          </div>
          <button type="button" className="dh-crew__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {crew.length === 0 ? (
          <p className="dh-crew__empty">The crew hasn’t been announced yet.</p>
        ) : (
          <ol className="dh-crew__list" role="list">
            {crew.map((m, i) => (
              <Player
                key={m.name}
                member={m}
                place={i}
                open={shown === m.name}
                onToggle={() => setShown(shown === m.name ? null : m.name)}
              />
            ))}
          </ol>
        )}
      </div>
    </dialog>
  )
}

function Player({ member: m, place, open, onToggle }) {
  const r = record(m.fights)
  const fights = useMemo(() => [...m.fights].sort((a, b) => (b.date || '').localeCompare(a.date || '')), [m.fights])
  const id = `dh-fights-${place}`
  const top = m.rank && m.rank <= 3 ? ` dh-player--top${m.rank}` : ''
  return (
    <li className={`dh-player${top}${open ? ' is-open' : ''}`} style={{ '--i': place }}>
      <button type="button" className="dh-player__row" onClick={onToggle} aria-expanded={open} aria-controls={id}>
        <span className="dh-player__rank">
          {m.rank ? (
            <>
              <small>#</small>
              {m.rank}
            </>
          ) : (
            '—'
          )}
          <span className="visually-hidden">{m.rank ? ` rank ${m.rank}` : ' no rank yet'}</span>
        </span>
        <span className="dh-player__photo" aria-hidden="true">
          {m.photo ? <img src={m.photo} alt="" loading="lazy" decoding="async" /> : [...m.name.trim()][0]?.toUpperCase()}
        </span>
        <span className="dh-player__who">
          <span className="dh-player__name">{m.name}</span>
          <span className="dh-player__record">
            {m.fights.length ? (
              <>
                <span className="dh-w">{r.win}W</span> · <span className="dh-l">{r.loss}L</span>
                {r.draw > 0 && <> · {r.draw}D</>}
              </>
            ) : (
              'No fights yet'
            )}
          </span>
        </span>
        <span className="dh-player__coins">
          <Coin />
          <b>{coins.format(m.coins || 0)}</b>
          <span className="visually-hidden"> coins</span>
        </span>
        <span className="dh-player__chev" aria-hidden="true" />
      </button>

      <div id={id} className="dh-player__fights" hidden={!open}>
        {fights.length === 0 ? (
          <p className="dh-fights__empty">No fights recorded yet.</p>
        ) : (
          <>
            <p className="dh-fights__summary">
              Fight history · {recordText(r)}
              {r.win + r.loss > 0 && <> · {Math.round((r.win / (r.win + r.loss)) * 100)}% won</>}
            </p>
            <ul className="dh-fights" role="list">
              {fights.map((f, k) => (
                <li key={k} className={`dh-fight dh-fight--${f.result}`}>
                  <span className="dh-fight__result">{f.result === 'win' ? 'W' : f.result === 'loss' ? 'L' : 'D'}</span>
                  <span className="dh-fight__vs">
                    <span>
                      <span className="visually-hidden">{f.result === 'win' ? 'Won' : f.result === 'loss' ? 'Lost' : 'Drew'} </span>
                      vs <b>{f.opponent}</b>
                    </span>
                    {f.note && <span className="dh-fight__note">{f.note}</span>}
                  </span>
                  {f.date && <time dateTime={f.date}>{formatDay(f.date)}</time>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------ small pieces */

function Coin() {
  return (
    <svg className="dh-coin" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#d9ab55" />
      <circle cx="10" cy="10" r="6.6" fill="none" stroke="#7a531a" strokeWidth="1.2" />
      <path d="M8 6.5h2.4a3.5 3.5 0 0 1 0 7H8z" fill="none" stroke="#7a531a" strokeWidth="1.5" />
    </svg>
  )
}

function Diamond() {
  return (
    <svg className="dh-diamond" viewBox="0 0 10 10" width="8" height="8" aria-hidden="true">
      <path d="M5 0 10 5 5 10 0 5Z" fill="currentColor" />
    </svg>
  )
}

/** Where each spark starts, how big and how fast: fixed, so every visit looks the same. */
const SPARKS = (() => {
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  return Array.from({ length: 22 }, () => ({
    left: `${(rnd() * 100).toFixed(1)}%`,
    size: `${(2 + rnd() * 3).toFixed(1)}px`,
    delay: `${(-rnd() * 14).toFixed(1)}s`,
    dur: `${(9 + rnd() * 9).toFixed(1)}s`,
    drift: `${((rnd() - 0.5) * 120).toFixed(0)}px`,
  }))
})()

/** Sparks drifting up through the smoke. Decoration only; hidden with reduced motion. */
function Embers() {
  return (
    <div className="dh-embers" aria-hidden="true">
      {SPARKS.map((s, i) => (
        <span
          key={i}
          style={{ left: s.left, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.dur, '--drift': s.drift }}
        />
      ))}
    </div>
  )
}
